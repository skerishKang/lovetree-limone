import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { DESIGN_CANDIDATES } from "../lib/design-lab.ts";
import { DESIGN_LINEAGES } from "../lib/design-lineages.ts";
import { LINEAGE_57_ASSETS, LINEAGE_57_CHARACTER_ASSETS, LINEAGE_57_LUBT_ASSETS, LINEAGE_57_EXPECTED_ASSET_COUNT } from "../lib/lineage-57-assets.ts";
import { clampLubtPosition, primaryReaction, sayReaction, specialReaction } from "../lib/lineage-57-character-controller.ts";
import { LINEAGE_57, LINEAGE_57_CHARACTERS, LINEAGE_57_EXPRESSIONS, LINEAGE_57_SOURCES, LINEAGE_57_TIMING } from "../lib/lineage-57-living-character-source.ts";

const root = new URL("../", import.meta.url);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function restoreArchive(relativePath) {
  const encoded = (await readFile(new URL(relativePath, root), "utf8")).trim();
  const compressed = Buffer.from(encoded, "base64");
  const result = spawnSync("xz", ["-dc"], { input: compressed, maxBuffer: 2_000_000 });
  assert.equal(result.error, undefined, `${relativePath}: xz is available`);
  assert.equal(result.status, 0, `${relativePath}: xz restore succeeds: ${result.stderr?.toString()}`);
  return result.stdout;
}

test("Lineage 57 registers V1 baseline and V2 interaction Revision without a new product family", () => {
  const lineage = DESIGN_LINEAGES.find((item) => item.number === 57);
  assert.ok(lineage);
  assert.equal(lineage.id, "lt-57-living-character-world");
  assert.equal(lineage.revisions.find((item) => item.id === "57-v1-living-character-world")?.decision, "baseline");
  assert.equal(lineage.revisions.find((item) => item.id === "57-v2-reactive-character-lubt")?.decision, "candidate");
  assert.equal(lineage.revisions.find((item) => item.id === "57-v2-reactive-character-lubt")?.route, "/design-lab/lineages/57/v2");
  const candidate = DESIGN_CANDIDATES.find((item) => item.id === "lineage:57-v2-reactive-character-lubt");
  assert.ok(candidate);
  assert.equal(candidate.lineageId, lineage.id);
  assert.equal(candidate.revisionId, "57-v2-reactive-character-lubt");
});

test("exact archived source restores to pinned Drive bytes and V2 is V1 plus only CSS/JS overlay links", async () => {
  const v1 = await restoreArchive(LINEAGE_57_SOURCES.v1Index.gitArchivePath);
  const v2 = await restoreArchive(LINEAGE_57_SOURCES.v2Index.gitArchivePath);
  const js = await restoreArchive(LINEAGE_57_SOURCES.v2Js.gitArchivePath);
  const css = await restoreArchive(LINEAGE_57_SOURCES.v2Css.gitArchivePath);

  for (const [bytes, source] of [[v1, LINEAGE_57_SOURCES.v1Index], [v2, LINEAGE_57_SOURCES.v2Index], [js, LINEAGE_57_SOURCES.v2Js], [css, LINEAGE_57_SOURCES.v2Css]]) {
    assert.equal(bytes.length, source.bytes);
    assert.equal(sha256(bytes), source.sha256);
  }

  const stripped = v2.toString("utf8")
    .replace('<link rel="stylesheet" href="living-world-v2.css">', "")
    .replace('<script src="living-world-v2.js"></script>', "");
  assert.deepEqual(Buffer.from(stripped), v1, "V2 index is byte-identical to V1 after removing only the two overlay links");
});

test("54/54 source asset manifest is complete and unique", () => {
  assert.equal(LINEAGE_57_CHARACTER_ASSETS.length, 48);
  assert.equal(LINEAGE_57_LUBT_ASSETS.length, 6);
  assert.equal(LINEAGE_57_ASSETS.length, LINEAGE_57_EXPECTED_ASSET_COUNT);
  assert.equal(LINEAGE_57_CHARACTERS.length, 4);
  assert.equal(LINEAGE_57_EXPRESSIONS.length, 12);
  assert.equal(new Set(LINEAGE_57_ASSETS.map((asset) => asset.driveId)).size, 54);
  assert.equal(new Set(LINEAGE_57_ASSETS.map((asset) => asset.targetPath)).size, 54);
  for (const asset of LINEAGE_57_CHARACTER_ASSETS) {
    assert.equal(asset.width, 362); assert.equal(asset.height, 362); assert.equal(asset.mode, "RGB");
  }
  for (const asset of LINEAGE_57_LUBT_ASSETS) {
    assert.equal(asset.width, 512); assert.equal(asset.height, 512); assert.equal(asset.mode, "RGBA");
  }
  assert.equal(LINEAGE_57_LUBT_ASSETS.find((asset) => asset.filename === "lubt-bloom.png")?.driveId, "1GZfX-lwEqIFIFL7rug2hlYatuYyUFTSd");
  assert.equal(typeof LINEAGE_57.assetTransferComplete, "boolean", "exact binary transfer remains an explicit fail-closed gate");
  if (!LINEAGE_57.assetTransferComplete) assert.equal(LINEAGE_57.assetHold, "EXACT_CHARACTER_ASSET_TRANSFER_HOLD");
});

test("pure reaction controller preserves primary/special/SAY/Lubt contracts", () => {
  const primary = primaryReaction("neutral", () => 0);
  assert.notEqual(primary.expression, "neutral");
  assert.ok(primary.lubtMessage.length > 0);
  const special = specialReaction();
  assert.equal(special.expression, "touched");
  assert.equal(special.special, true);
  assert.equal(special.lubtPose, "bloom");
  const say = sayReaction("  기억해 줘  ");
  assert.equal(say.expression, "talk");
  assert.equal(say.speech, "기억해 줘");
  assert.equal(say.lubtPose, "guide");
  assert.deepEqual(clampLubtPosition(-100, 9999, 0, 0, 390, 844), { left: 0, top: 728 });
  assert.equal(LINEAGE_57_TIMING.hoverSmileMs, 280);
  assert.equal(LINEAGE_57_TIMING.longPressMs, 680);
  assert.equal(LINEAGE_57_TIMING.specialCleanupMs, 1800);
  assert.equal(LINEAGE_57_TIMING.sayGuideReplyMs, 850);
  assert.equal(LINEAGE_57_TIMING.lubtReturnMs, 2400);
});

test("native candidate hardens mobile, accessibility and reduced motion while keeping SAVE non-persistent", async () => {
  const component = await readFile(new URL("app/design-lab/lineages/57/v2/Lineage57LivingCharacterWorldV2.tsx", root), "utf8");
  const css = await readFile(new URL("app/styles/lineage-57-living-character-world.css", root), "utf8");
  const fixes = await readFile(new URL("app/styles/lineage-57-living-character-world-fixes.css", root), "utf8");
  const page = await readFile(new URL("app/design-lab/lineages/57/v2/page.tsx", root), "utf8");

  for (const token of ["onDoubleClick", "longPressMs", "holdTriggered", "setPointerCapture", "releasePointerCapture", "onPointerCancel={finishLubtDrag}", "SPECIAL INTERACTION", "aria-live=\"polite\"", "role=\"dialog\"", "SOURCE DEMO / NON-PERSISTENT"]) {
    assert.match(component, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(component, /e\.key === "Enter" \|\| e\.key === " "/);
  assert.match(component, /setAutoLife\(false\)/);
  assert.match(css + fixes, /prefers-reduced-motion:reduce/);
  assert.match(fixes, /lcwLubtWander/);
  assert.match(fixes, /\.lcw-lubt\.dragging\{animation-play-state:paused!important;scale:1.06\}/);
  assert.match(page, /assetTransferComplete/);
  assert.doesNotMatch(page, /node:fs|readFile|process\.cwd/);
  assert.doesNotMatch(component, /from ["']three["']|WebGLRenderingContext|<canvas/i);
  assert.doesNotMatch(component, /fetch\(|\/api\//i, "Design Lab SAVE must not persist through API/DB");
});
