import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const ROOT = process.cwd();
const sourcePath = `${ROOT}/public/design-lab-assets/source-tracks/18/v2/index.html`;
const source = readFileSync(sourcePath);
const html = source.toString("utf8");
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
const expectedAssets = [
  ["cyber-01.png", 1943324, "b0f7610585cef166c3fac9224838b5a5a6027795bfc299bc0c4d5563aac1b6b7"],
  ["cyber-02.png", 2138785, "62e998b74cba61a4580844c6f47bffa434b604fc9dba89bfaac14d09cb4f6168"],
  ["cyber-03.png", 2186946, "230b40e23a1238872f406480247e008ee190d13dbf41834d080ff89d3bc34619"],
  ["cyber-04.png", 2131432, "5eff795552a75ac4d09fb2688367c20a191f2d4dcae2ff1891e7634e1a26dcc5"],
  ["cyber-05.png", 1880735, "41971fef71e9851e8aa85929afa644554777558c5313464ba5f434f03e9cbfbc"],
  ["cyber-06.png", 1877218, "bf048941d597ec45e57f12ead8e48746d9c88a3add231fc472fed9c9709173e6"],
  ["cyber-07.png", 1888479, "43a6e22db9cfb104762dcd8ced6d621c1e83e54409c0179e80d2e076c1d0705a"],
  ["cyber-08.png", 1849552, "1b9861583a95c4f0e29f2a1f3ec9992394cb2236ed6979129bd53d55f7b1caf5"],
];

test("Track18 exact HTML fingerprint and source-local href stay pinned", () => {
  assert.equal(source.byteLength, 25427);
  assert.equal(sha(source), "680c6ddb8e6ee7c252182f84523d4a66971e96fd6c177b3e72d1e0487b5dabe0");
  assert.match(html, /for\(var i=0;i<20;i\+\+\)/);
  assert.match(html, /var fragmentAssets=\['cyber-01\.png','cyber-02\.png','cyber-03\.png','cyber-04\.png','cyber-05\.png','cyber-06\.png','cyber-07\.png','cyber-08\.png'\]/);
  assert.equal((html.match(/class="identity-cell"/g) || []).length, 4);
  assert.equal((html.match(/\.\.\/\.\.\/17_러브트리_글로벌셸_롤링메뉴_V1\/최종본\.html/g) || []).length, 2);
  assert.match(html, /duration=6800/);
});

test("Track18 exact runtime asset fingerprints are byte-exact and repo-transfer complete", () => {
  const provenance = readFileSync(`${ROOT}/lib/source-track-18/provenance.ts`, "utf8");
  const manifest = JSON.parse(readFileSync(`${ROOT}/design-intake/manifests/source-track-18-fragment-loader-v2.json`, "utf8"));
  assert.equal(manifest.exactAssetGate.fingerprintStatus, "FINGERPRINT_COMPLETE");
  assert.equal(manifest.exactAssetGate.binaryTransferStatus, "BINARY_TRANSFER_COMPLETE");
  assert.equal(manifest.exactAssetGate.exactGateStatus, "EXACT_GATE_PASS");
  assert.equal(manifest.exactAssets.length, 8);
  for (const [filename, bytes, expectedSha] of expectedAssets) {
    assert.match(provenance, new RegExp(filename.replace(".", "\\.")));
    assert.match(provenance, new RegExp(String(bytes).replace(/(\d)(?=(\d{3})+$)/g, "$1[_]?")));
    assert.match(provenance, new RegExp(expectedSha));
    const assetPath = `${ROOT}/public/design-lab-assets/source-tracks/18/v2/assets/${filename}`;
    assert.equal(
      existsSync(assetPath),
      true,
      `${filename} must be present after exact byte-safe transfer`,
    );
    const buf = readFileSync(assetPath);
    assert.equal(buf.byteLength, bytes, `${filename} byte length must be exact`);
    assert.equal(sha(buf), expectedSha, `${filename} SHA-256 must be exact`);
    const declared = manifest.exactAssets.find((a) => a.filename === filename);
    assert.ok(declared, `manifest must declare ${filename}`);
    assert.equal(declared.sha256, expectedSha, `manifest fingerprint must equal file fingerprint for ${filename}`);
    assert.equal(declared.bytes, bytes, `manifest byte length must equal file byte length for ${filename}`);
  }
});

test("Track18 host runner is fixed-source, fail-closed, and never translates Track17", () => {
  const runner = readFileSync(`${ROOT}/app/design-lab/source-tracks/18/v2/source/SourceTrack18Runner.tsx`, "utf8");
  assert.match(runner, /fetchAndVerify\(/);
  assert.match(runner, /for \(const asset of SOURCE_TRACK_18_ASSETS\)/);
  assert.match(runner, /data-asset-gate=\{`\$\{gate\.assetsVerified\}\/8`\}/);
  assert.match(runner, /event\.preventDefault\(\)/);
  assert.match(runner, /dismiss\("x"\)/);
  assert.match(runner, /dismiss\("escape"\)/);
  assert.match(runner, /triggerRef\.current\?\.focus\(\)/);
  assert.match(runner, /router\.push\(canonicalDestination\)/);
  assert.match(runner, /role", "progressbar"/);
  assert.match(runner, /queueMicrotask\(\(\) => about\.click\(\)\)/);
  assert.doesNotMatch(runner, /router\.back\(/);
});
