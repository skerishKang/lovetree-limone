import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CODEX15_MEMORY_BIOSPHERE_AUTHORITY as authority } from "../lib/source-codex-15/memory-biosphere.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const componentPath = join(root, "app/components/v4/Codex15MemoryBiosphereHomeDonor.tsx");
const stylePath = join(root, "app/styles/v4/codex15-memory-biosphere-home-donor.css");
const routePath = join(root, "app/v4/memory-biosphere/page.tsx");
const component = readFileSync(componentPath, "utf8");
const styles = readFileSync(stylePath, "utf8");
const route = readFileSync(routePath, "utf8");

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("Issue #493 pins the fresh Drive V2 executable and all four source assets", () => {
  assert.equal(authority.issue, 493);
  assert.equal(authority.disposition, "USE_AS_HIGH_VISUAL_HOME_DONOR");
  assert.equal(authority.drive.executableName, "최종본.html");
  assert.equal(authority.drive.executableId, "173b3LiSAIGx358fiMiCJFSXvYxCBMz7_");
  assert.equal(authority.drive.executableBytes, 26655);
  assert.equal(authority.drive.executableSha256, "20cc07af219ff1dcea5caa214f21c5eb3037d4ab8aa4545dd415c71b66103748");
  assert.deepEqual(authority.sourceAssets.map((asset) => asset.name), [
    "human-final.webp",
    "trace-final.webp",
    "bloom-final.webp",
    "sphere-final-v2.png",
  ]);
  assert.deepEqual(authority.sourceAssets.map((asset) => asset.sha256), [
    "29a570c405e630eab0a07d97d6643bff1eed7f4034d96ffad3aeb52341d326c2",
    "e994dee09cfefe4bad2e8c9fd7bd07566211725acdc526c581d8ed347f53466b",
    "50c4d48bb381c616b361e6b78785932063ffd7bd415d6765867f7bb5d6b9b4f8",
    "656773fbde73dcc318dbaf903e0708d62747038a6834f3b688f15ddfe5afa785",
  ]);
});

test("runtime media are explicit optimized derivatives, not substituted source fingerprints", () => {
  for (const asset of authority.runtimeDerivatives) {
    const diskPath = join(root, "public", asset.path.replace(/^\//, ""));
    const bytes = readFileSync(diskPath);
    assert.equal(bytes.byteLength, asset.bytes, asset.path);
    assert.equal(sha256(diskPath), asset.sha256, asset.path);
  }
  assert.equal(authority.runtimeDerivatives[3].sourceName, "sphere-final-v2.png");
  assert.equal(authority.sourceAssets[3].sha256, "656773fbde73dcc318dbaf903e0708d62747038a6834f3b688f15ddfe5afa785");
  assert.notEqual(authority.runtimeDerivatives[3].sha256, authority.sourceAssets[3].sha256);
});

test("Memory Biosphere stays a HOME visual donor and hands product truth back to canonical /v4", () => {
  assert.equal(authority.canonicalHome, "/v4");
  assert.equal(authority.canonicalFirstMomentEntry, "/v4?start=1");
  assert.equal(authority.canonicalBoundary.donorAddsBackend, false);
  assert.equal(authority.canonicalBoundary.donorAddsPersistence, false);
  assert.equal(authority.canonicalBoundary.sourcePortalNavigationPromoted, false);
  assert.match(component, /href="\/v4\?start=1"/);
  assert.match(component, /href="\/v4"/);
  assert.doesNotMatch(component, /apiFetch\s*\(/);
  assert.doesNotMatch(component, /createFirstTree\s*\(/);
  assert.doesNotMatch(component, /localStorage\s*\./);
  assert.doesNotMatch(component, /sessionStorage\s*\./);
  assert.doesNotMatch(component, /indexedDB\s*\./);
  assert.doesNotMatch(component, /\.html(?:["'?#])/);
  assert.match(route, /Codex15MemoryBiosphereHomeDonor/);
});

test("V2 head-centered reveal grammar and touch/keyboard parity are explicit", () => {
  assert.equal(authority.sourceInteraction.proximityModel, "head-centered-elliptical-distance");
  assert.equal(authority.sourceInteraction.autoCycle, false);
  assert.deepEqual(authority.sourceInteraction.stateOrder, ["human", "trace", "bloom", "sphere"]);
  assert.match(component, /centerX = rect\.width \* 0\.625/);
  assert.match(component, /centerY = rect\.height \* 0\.39/);
  assert.match(component, /onPointerDown=\{onPointerDown\}/);
  assert.match(component, /setPointerCapture/);
  assert.match(component, /pointerType === "touch"/);
  assert.match(component, /ArrowLeft/);
  assert.match(component, /ArrowRight/);
  assert.match(component, /ArrowUp/);
  assert.match(component, /ArrowDown/);
  assert.match(component, /Home/);
  assert.match(component, /End/);
  assert.match(component, /stateButtonsRef\.current\[safeIndex\]\?\.focus/);
});

test("responsive, focus and reduced-motion contracts cover 1280/390/320 presentation", () => {
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /@media \(max-width: 420px\)/);
  assert.match(styles, /overflow-x: hidden/);
  assert.match(styles, /focus-visible/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /animation-duration: \.001ms !important/);
  assert.match(styles, /transition-duration: \.001ms !important/);
});

test("Track74 and Track36 stay comparators instead of replacing canonical HOME", () => {
  assert.equal(authority.comparators.track74, "/design-lab/source-tracks/74/v2/native");
  assert.equal(authority.comparators.track36, "/design-lab/source-tracks/36/v3/donor");
  assert.match(component, /Track74 native/);
  assert.match(component, /Track36 donor/);
});
