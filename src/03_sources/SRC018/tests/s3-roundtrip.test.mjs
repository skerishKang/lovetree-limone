/**
 * SRC018 S3 Mechanical Split — Round-Trip + Frozen-Behavior Validation (local only).
 *
 * Independently re-derives every boundary from the frozen authority original
 * (byte search, own logic) and proves:
 *  - T01 authority SHA-256/byte lock holds on original/original.html
 *  - T01b exactly one style block and one plain script block
 *  - T02 styles.css === authority <style> inner bytes
 *  - T03 script.js === authority <script> inner bytes
 *  - T04 reconstruction is byte-identical to the frozen original (25427 / 680c6ddb...)
 *  - T05 split index reconnects via link + script src glue only (exactly one each, no inline style/script)
 *  - T06 all eight cyber-0N runtime assets referenced (bare names in JS, assets/ in CSS)
 *  - T07 split/assets holds exactly the eight cyber PNGs, byte-locked to authority
 *  - T08 no legacy memory-* reference-only media copied into split/assets
 *  - T09 source-local Track17 href survives byte-exactly (provenance only, not rewritten)
 *  - T10 fixed 6800ms JS progression untouched (frozen defect)
 *  - T11 no React/TS/TSX/JSX/Next/ESM import in split runtime files
 *  - T12 no backend/DB/auth markers in split
 *  - T13 no product/MVP adapter wiring in split
 *  - T14 manifest truth: S3 asserted, parity PENDING, parity_ref null
 *  - T15 materialization record matches files on disk (bytes + sha256 + git_blob_sha1)
 *
 * Writes evidence/split/s3-roundtrip.json as run evidence. No commits. No pushes.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.join(import.meta.dirname, "..");
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const gitBlobSha1 = (b) => crypto.createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])).digest("hex");

const LOCK_BYTES = 25427;
const LOCK_SHA = "680c6ddb8e6ee7c252182f84523d4a66971e96fd6c177b3e72d1e0487b5dabe0";
const LINK = '<link rel="stylesheet" href="./styles.css"/>';
const SRC = '<script src="./script.js"></script>';
const TRACK17_HREF = "../../17_러브트리_글로벌셸_롤링메뉴_V1/최종본.html";

const ASSETS = {
  "cyber-01.png": [1943324, "b0f7610585cef166c3fac9224838b5a5a6027795bfc299bc0c4d5563aac1b6b7"],
  "cyber-02.png": [2138785, "62e998b74cba61a4580844c6f47bffa434b604fc9dba89bfaac14d09cb4f6168"],
  "cyber-03.png": [2186946, "230b40e23a1238872f406480247e008ee190d13dbf41834d080ff89d3bc34619"],
  "cyber-04.png": [2131432, "5eff795552a75ac4d09fb2688367c20a191f2d4dcae2ff1891e7634e1a26dcc5"],
  "cyber-05.png": [1880735, "41971fef71e9851e8aa85929afa644554777558c5313464ba5f434f03e9cbfbc"],
  "cyber-06.png": [1877218, "bf048941d597ec45e57f12ead8e48746d9c88a3add231fc472fed9c9709173e6"],
  "cyber-07.png": [1888479, "43a6e22db9cfb104762dcd8ced6d621c1e83e54409c0179e80d2e076c1d0705a"],
  "cyber-08.png": [1849552, "1b9861583a95c4f0e29f2a1f3ec9992394cb2236ed6979129bd53d55f7b1caf5"],
};
const MEMORY = ["memory-sphere.png", "memory-bloom.webp", "memory-trace.webp", "memory-human.webp"];

let passed = 0;
let failed = 0;
const checks = [];
function ok(cond, id, detail) {
  checks.push({ id, pass: !!cond, detail: detail || "" });
  if (cond) { passed++; console.log(`  \u2713 ${id}${detail ? " — " + detail : ""}`); }
  else { failed++; console.log(`  \u2717 FAIL: ${id}${detail ? " — " + detail : ""}`); }
}

console.log("\n=== SRC018 S3 Mechanical Split — Round-Trip Validation ===\n");

const originalBytes = fs.readFileSync(path.join(ROOT, "original/original.html"));
const original = originalBytes.toString("utf8");
console.log("Frozen authority input:");
ok(originalBytes.length === LOCK_BYTES && sha256(originalBytes) === LOCK_SHA, "T01", `original locked at ${originalBytes.length} bytes`);

const so = original.indexOf("<style>");
const sc = original.indexOf("</style>");
const jo = original.indexOf("<script>");
const jc = original.indexOf("</script>");
ok(original.split("<style>").length - 1 === 1 && original.split("</style>").length - 1 === 1 && original.split("<script>").length - 1 === 1 && original.split("</script>").length - 1 === 1, "T01b", "exactly one style block and one script block");

const cssExpect = original.slice(so + 7, sc);
const jsExpect = original.slice(jo + 8, jc);
const shell = fs.readFileSync(path.join(ROOT, "split/index.html"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "split/styles.css"), "utf8");
const js = fs.readFileSync(path.join(ROOT, "split/script.js"), "utf8");

console.log("\nSplit part fidelity:");
ok(css === cssExpect, "T02", `styles.css === authority style inner (${css.length} chars)`);
ok(js === jsExpect, "T03", `script.js === authority script inner (${js.length} chars)`);

console.log("\nByte round-trip:");
const rec = shell.replace(LINK, () => `<style>${css}</style>`).replace(SRC, () => `<script>${js}</script>`);
const recBytes = Buffer.from(rec, "utf8");
ok(recBytes.compare(originalBytes) === 0 && recBytes.length === LOCK_BYTES && sha256(recBytes) === LOCK_SHA, "T04", "reconstruction byte-identical to frozen authority");

console.log("\nShell glue:");
ok(shell.split(LINK).length - 1 === 1 && shell.split(SRC).length - 1 === 1 && !shell.includes("<style>") && !shell.includes("<script>"), "T05", "link + script src glue only");

console.log("\nRuntime asset references:");
const refOk = Object.keys(ASSETS).every((n) => js.includes(`'${n}'`) || js.includes(`"${n}"`) || css.includes(n));
ok(refOk, "T06", "all eight cyber-0N assets referenced in split CSS/JS");

console.log("\nSplit asset byte-lock (byte-exact, no re-encode):");
const assetDir = path.join(ROOT, "split/assets");
const present = fs.existsSync(assetDir) ? fs.readdirSync(assetDir).sort() : [];
const expectedFiles = Object.keys(ASSETS).sort();
let assetLockOk = JSON.stringify(present) === JSON.stringify(expectedFiles);
for (const [name, [bytes, sha]] of Object.entries(ASSETS)) {
  const f = path.join(assetDir, name);
  if (!fs.existsSync(f) || fs.readFileSync(f).length !== bytes || sha256(fs.readFileSync(f)) !== sha) assetLockOk = false;
}
ok(assetLockOk, "T07", `split/assets holds exactly the eight byte-locked cyber PNGs (${present.length})`);
const noMemory = !MEMORY.some((m) => present.includes(m)) && !fs.existsSync(path.join(assetDir, "memory-sphere.png"));
ok(noMemory, "T08", "no legacy memory-* reference-only media copied into split/assets");

console.log("\nFrozen behavior:");
ok(shell.includes(TRACK17_HREF), "T09", "source-local Track17 href survives byte-exactly in split index (provenance only)");
ok(/6800/.test(js), "T10", "fixed 6800ms JS progression untouched");

console.log("\nPolicy checks:");
const runtimeFiles = { "split/index.html": shell, "split/styles.css": css, "split/script.js": js };
const FORBIDDEN = [/from\s+['"]react['"]/i, /React\.(createElement|Component|use)/, /\.tsx?\b/, /\bjsx\b/i, /next\/|__next|from\s+['"]next['"]/i, /import\s+[\s\S]*?\sfrom\s+['"]/];
let forbHit = null;
for (const [f, content] of Object.entries(runtimeFiles)) {
  for (const re of FORBIDDEN) if (re.test(content)) { forbHit = `${f} matches ${re}`; break; }
  if (forbHit) break;
}
ok(!forbHit, "T11", forbHit || "no React/TS/TSX/JSX/Next/ESM in split runtime files");
const BACKEND = [/mongodb|postgres|mysql|firebase|supabase|drizzle/i, /fetch\(\s*['"]\/api/i, /AUTH_TOKEN|SECRET|API_KEY/i];
let backHit = null;
for (const [f, content] of Object.entries(runtimeFiles)) {
  for (const re of BACKEND) if (re.test(content)) { backHit = `${f} matches ${re}`; break; }
  if (backHit) break;
}
ok(!backHit, "T12", backHit || "no backend/DB/auth markers in split");
ok(!/mvp|product-derivation|adapter/i.test(shell + js), "T13", "no product/MVP adapter in split");

console.log("\nManifest / materialization truth:");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
ok(manifest.stages.mechanical_split_complete === true && manifest.stages.source_split_parity_pass === false && manifest.parity_ref === null, "T14", "S3 asserted, parity pending, parity_ref null");
const mat = JSON.parse(fs.readFileSync(path.join(ROOT, "split/materialization.json"), "utf8"));
let matOk = mat.status === "MATERIALIZED_PENDING_PARITY" && mat.parity_status === "PENDING_EXACT_HEAD_CAPTURE" && mat.authority.bytes === LOCK_BYTES && mat.authority.sha256 === LOCK_SHA;
for (const [rel, meta] of Object.entries(mat.outputs)) {
  const b = fs.readFileSync(path.join(ROOT, rel));
  if (b.length !== meta.bytes || sha256(b) !== meta.sha256 || gitBlobSha1(b) !== meta.git_blob_sha1) matOk = false;
}
ok(matOk, "T15", "materialization record matches files on disk (bytes + sha256 + git_blob_sha1)");

const report = {
  schema_version: "1.0",
  source_id: "SRC018",
  stage: "S3_MECHANICAL_SPLIT",
  run_at: new Date().toISOString(),
  authority: { bytes: LOCK_BYTES, sha256: LOCK_SHA },
  reconstructed: { bytes: recBytes.length, sha256: sha256(recBytes) },
  roundtrip: recBytes.compare(originalBytes) === 0,
  assets: { referenced: refOk, byte_locked: assetLockOk, count: present.length, reference_only_excluded: noMemory },
  track17_provenance_preserved: shell.includes(TRACK17_HREF),
  passed,
  failed,
  checks,
};
fs.mkdirSync(path.join(ROOT, "evidence/split"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "evidence/split/s3-roundtrip.json"), JSON.stringify(report, null, 2) + "\n");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
