// Source Track 18 V2 — exact asset gate verifier.
//
// Fails closed unless every pinned runtime PNG in
// design-intake/manifests/source-track-18-fragment-loader-v2.json
// exists on disk with the exact byte length and SHA-256 recorded by
// the manifest (Issues #245 #252 / PR #255 byte-safe transfer).
//
// Run:
//   node scripts/verify-source-track-18-assets.mjs
//
// Exit 0 + marker TRACK18_V2_EXACT_ASSET_GATE_PASS = 8/8 exact.
// Exit 1 = any missing/mismatched asset (fail-closed).

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const MANIFEST_PATH = "design-intake/manifests/source-track-18-fragment-loader-v2.json";
const EXPECTED_ASSET_COUNT = 8;
const PASS_MARKER = "TRACK18_V2_EXACT_ASSET_GATE_PASS";

function fail(message) {
  console.error(`TRACK18_V2_EXACT_ASSET_GATE_FAIL: ${message}`);
  process.exit(1);
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));

if (!Array.isArray(manifest.exactAssets)) {
  fail(`manifest ${MANIFEST_PATH} has no exactAssets array`);
}
if (manifest.exactAssets.length !== EXPECTED_ASSET_COUNT) {
  fail(`expected ${EXPECTED_ASSET_COUNT} pinned assets, manifest declares ${manifest.exactAssets.length}`);
}
if (manifest.exactAssetGate?.exactGateStatus !== "EXACT_GATE_PASS") {
  fail(`manifest exactGateStatus is ${JSON.stringify(manifest.exactAssetGate?.exactGateStatus)}, expected EXACT_GATE_PASS`);
}

for (const asset of manifest.exactAssets) {
  const { filename, targetPath, bytes, sha256 } = asset;
  if (!targetPath || typeof bytes !== "number" || !/^[0-9a-f]{64}$/.test(sha256 ?? "")) {
    fail(`asset ${filename}: incomplete pin (targetPath/bytes/sha256 required)`);
  }
  let actualBytes;
  try {
    actualBytes = (await stat(targetPath)).size;
  } catch {
    fail(`asset ${filename}: missing at ${targetPath}`);
  }
  if (actualBytes !== bytes) {
    fail(`asset ${filename}: byte length ${actualBytes} != pinned ${bytes} at ${targetPath}`);
  }
  const digest = createHash("sha256").update(await readFile(targetPath)).digest("hex");
  if (digest !== sha256) {
    fail(`asset ${filename}: sha256 ${digest} != pinned ${sha256} at ${targetPath}`);
  }
  console.log(`ok ${filename} bytes=${bytes} sha256=${sha256}`);
}

console.log(`${PASS_MARKER} (${EXPECTED_ASSET_COUNT}/${EXPECTED_ASSET_COUNT} exact)`);
