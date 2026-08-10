import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  LINEAGE_55_APPROVAL_BOUNDARY,
  LINEAGE_55_MOONLIT_BLOSSOM_SOURCE,
} from "../lib/lineage-55-moonlit-blossom-source.ts";

const root = new URL("../", import.meta.url);

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash("sha1").update(header).update(buffer).digest("hex");
}

test("Lineage 55 exact sibling HTML is preserved byte-for-byte in Git", async () => {
  const source = LINEAGE_55_MOONLIT_BLOSSOM_SOURCE.source;
  const bytes = await readFile(new URL(source.repositoryPath, root));

  assert.equal(bytes.byteLength, 22_260);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), source.sha256);
  assert.equal(gitBlobSha(bytes), source.gitBlobSha);
  assert.equal(source.driveId, "11VCsXcP2OlOH1pOAwFmhD4HwIU1blc6M");
});

test("Lineage 55 source identity and five authoritative assets stay pinned", () => {
  const source = LINEAGE_55_MOONLIT_BLOSSOM_SOURCE;
  assert.equal(source.lineageId, "lt-55-moonlit-blossom-hero");
  assert.equal(source.revisionId, "55-v1-moonlit-blossom-hero");
  assert.equal(source.issue, 134);
  assert.equal(source.driveFolder.id, "151yoYBj7rVaQbZuKvSbt8D5_LZC6vpqs");
  assert.equal(source.assets.length, 5);
  assert.deepEqual(source.assets.map((asset) => asset.file), [
    "lovetree-memory-blossom-hero-v1.png",
    "lovetree-memory-blossom-detail-v1.png",
    "memory-cast-a.png",
    "memory-cast-b.png",
    "memory-cast-c.png",
  ]);
  assert.equal(source.assetBasePath, "/reference/lineage-55-moonlit-blossom-v1/assets");
  assert.equal(source.disposition, "source-intake-complete-binary-assets-pending");
  assert.match(LINEAGE_55_APPROVAL_BOUNDARY, /exact binary assets and browser\/visual QA are required/);
});

test("Lineage 55 exact source keeps staged growth and product interaction contracts", async () => {
  const html = await readFile(
    new URL(LINEAGE_55_MOONLIT_BLOSSOM_SOURCE.source.repositoryPath, root),
    "utf8",
  );

  for (const label of [
    "01 · SEED",
    "02 · FEELING",
    "03 · MOMENTS",
    "04 · BLOOM",
    "PLAY THE BLOOM",
    "PAUSE BLOOM",
    "BLOSSOM",
    "MOMENTS",
    "INVITATION",
    "ENTER MY TREE",
    "127 / 150 MOMENTS",
    "85%",
  ]) {
    assert.match(html, new RegExp(label.replaceAll(" ", "\\s")));
  }

  assert.match(html, /setInterval\(nextState,2100\)/);
  assert.match(html, /now-lastWheel<700/);
  assert.match(html, /for\(let i=0;i<36;i\+\+\)/);
  assert.match(html, /e\.code==='Space'/);
  assert.match(html, /e\.code==='ArrowRight'/);
  assert.match(html, /e\.code==='ArrowLeft'/);
  assert.match(html, /window\.addEventListener\('wheel'/);
  assert.match(html, /onclick="nextState\(\)"/);
  assert.match(html, /onclick="jump\(1\)"/);
  assert.match(html, /onclick="jump\(2\)"/);
  assert.match(html, /onclick="jump\(3\)"/);
});

test("Lineage 55 source only references approved sibling flower and Memory Cast files", async () => {
  const html = await readFile(
    new URL(LINEAGE_55_MOONLIT_BLOSSOM_SOURCE.source.repositoryPath, root),
    "utf8",
  );

  assert.match(html, /lovetree-memory-blossom-hero-v1\.png/);
  for (const portrait of ["memory-cast-a.png", "memory-cast-b.png", "memory-cast-c.png"]) {
    assert.match(html, new RegExp(portrait.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(html, /https?:\/\//);
});

test("Lineage 55 post-transfer asset verifier is hard-fail and has no skip path", async () => {
  const verifier = await readFile(new URL("scripts/verify-lineage-55-assets.mjs", root), "utf8");
  assert.match(verifier, /LINEAGE_55_EXACT_ASSET_GATE_PASS/);
  assert.match(verifier, /gitBlobSha/);
  assert.match(verifier, /pngIdentity/);
  assert.match(verifier, /process\.exit\(1\)/);
  assert.doesNotMatch(verifier, /\.skip\(/);
  for (const asset of LINEAGE_55_MOONLIT_BLOSSOM_SOURCE.assets) {
    assert.match(verifier, new RegExp(asset.sha256));
    assert.match(verifier, new RegExp(asset.gitBlobSha));
  }
});
