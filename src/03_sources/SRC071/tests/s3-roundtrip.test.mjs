/**
 * SRC071 S3 Mechanical Split — Round-Trip + Frozen-Defect Validation (local only).
 *
 * Independently re-derives every boundary from the frozen authority original
 * (byte search, own logic) and proves:
 *  - T01 authority SHA-256/byte lock holds on original/original.html
 *  - T02 styles.css === authority <style> inner bytes
 *  - T03 script.js === authority <script> inner bytes
 *  - T04 reconstruction is byte-identical to the frozen original (24039 / 2a646b96...)
 *  - T05 split index reconnects via link + script src glue only (exactly one each, no inline style/script)
 *  - T06 portal route preservation: exactly 6 relative .html route strings survive
 *  - T07 route set equality (exact strings)
 *  - T08 route order equality (exact order)
 *  - T09 route labels survive in order (FIRST/MOMENTS/CONNECTION/REPLAY/MY TREE/RETURN)
 *  - T10 mobile stage clip defect preserved verbatim (fitStage w/1050 branch, x=-(236*scale-12))
 *  - T11 desktop fit branch untouched (Math.min(w/1920,h/1080))
 *  - T12 REEL_CYCLE=940 endless-reel constant untouched
 *  - T13 QA hooks preserved (?paused, ?qa, window.__LOVE_TREE_V7_R24__)
 *  - T14 canvas runtime is 2D (getContext('2d'), never webgl)
 *  - T15 no React/TS/TSX/JSX/Next/ESM import in split runtime files
 *  - T16 no backend/DB/auth markers in split
 *  - T17 no product/MVP adapter wiring in split
 *  - T18 no assets/ directory (source is self-contained data URIs)
 *  - T19 manifest truth: S3 asserted, parity false, parity_ref null
 *  - T20 materialization record matches files on disk
 *
 * Writes evidence/split/s3-roundtrip.json as run evidence. No commits. No pushes.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.join(import.meta.dirname, "..");
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

const LOCK_BYTES = 24039;
const LOCK_SHA = "2a646b96e032f21ebc394dfa06ef4679cfdaee2c0ff7b0181f37d5143397452a";
const LINK = '<link rel="stylesheet" href="./styles.css"/>';
const SRC = '<script src="./script.js"></script>';

const EXPECTED_ROUTES = [
  "../../65_입덕단서_시네마틱에디토리얼/V18_디자인팀장15기_H3_EXTENDED_MOTION_EDITING_후보_선택/★_현재후보_65_V2.2.5_H3_EXTENDED_MOTION_EDITING_CINEMATIC.html",
  "../../67_메모리테이프_인터랙티브롤/07_V2.4.2_WORKS_COMPARE_MENU/track67_v2.4.2_works_compare_menu.html",
  "../../68_인물감정경로_모션아카이브/V7_C14_ASSET_PATH_FIX/68_V3.3.1_COMPARE_LAUNCHER.html",
  "../../../../코덱스/14_러브트리_로테이팅메모리인덱스_V1/v2/개발본.html",
  "../../../../코덱스/15_러브트리_메모리바이오스피어_인터랙티브대문_V1/버전2/최종본.html",
  "../../70_모먼트리빌_퓨처에디토리얼/선택1-70_V2.1_LOVETREE_PORTAL_NAV_RETURN_FIX.html",
];
const EXPECTED_LABELS = [
  "FIRST · FIRST CLUE",
  "MOMENTS · MEMORY TAPE",
  "CONNECTION · MOTION ARCHIVE",
  "REPLAY · MEMORY ORBIT",
  "MY TREE · BIOSPHERE",
  "RETURN · TEMPLATE PORTAL",
];

let passed = 0;
let failed = 0;
const checks = [];
function ok(cond, id, detail) {
  checks.push({ id, pass: !!cond, detail: detail || "" });
  if (cond) { passed++; console.log(`  \u2713 ${id}${detail ? " — " + detail : ""}`); }
  else { failed++; console.log(`  \u2717 FAIL: ${id}${detail ? " — " + detail : ""}`); }
}

console.log("\n=== SRC071 S3 Mechanical Split — Round-Trip Validation ===\n");

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

console.log("\nPortal route preservation (SRC071_PORTAL_MAPPING_HOLD):");
const routes = [...js.matchAll(/["']([^"'\r\n]*?\.html)["']/g)].map((m) => m[1]);
ok(routes.length === 6, "T06", `exactly 6 relative .html route strings in split script (${routes.length})`);
const setEqual = JSON.stringify([...routes].sort()) === JSON.stringify([...EXPECTED_ROUTES].sort());
const orderEqual = JSON.stringify(routes) === JSON.stringify(EXPECTED_ROUTES);
ok(setEqual, "T07", "route set equality (exact strings)");
ok(orderEqual, "T08", "route order equality");
const labelPos = EXPECTED_LABELS.map((l) => js.indexOf(l));
ok(labelPos.every((p) => p >= 0) && labelPos.every((p, i) => i === 0 || p > labelPos[i - 1]), "T09", "route labels survive in order");
for (const r of EXPECTED_ROUTES) if (!js.includes(r)) { ok(false, "T06b", `missing route verbatim: ${r}`); break; }

console.log("\nFrozen mobile clip (SRC071_MOBILE_STAGE_CLIP):");
ok(js.includes("scale=w/1050") && js.includes("x=-(236*scale-12)"), "T10", "fitStage mobile branch untouched");
ok(js.includes("Math.min(w/1920,h/1080)"), "T11", "desktop fit branch untouched");

console.log("\nRuntime semantics:");
ok(js.includes("REEL_CYCLE=940"), "T12", "endless reel constant untouched");
ok(js.includes("has('paused')") && js.includes("has('qa')") && js.includes("__LOVE_TREE_V7_R24__"), "T13", "?paused / ?qa / global API preserved");
ok(js.includes("getContext('2d')") && !/webgl/i.test(js), "T14", "canvas runtime is 2D, never WebGL");

console.log("\nPolicy checks:");
const FORBIDDEN = [/from\s+['"]react['"]/i, /React\.(createElement|Component|use)/, /\.tsx?\b/, /\bjsx\b/i, /next\/|__next|from\s+['"]next['"]/i, /import\s+[\s\S]*?\sfrom\s+['"]/];
const runtimeFiles = { "split/index.html": shell, "split/styles.css": css, "split/script.js": js };
let forbHit = null;
for (const [f, content] of Object.entries(runtimeFiles)) {
  for (const re of FORBIDDEN) if (re.test(content)) { forbHit = `${f} matches ${re}`; break; }
  if (forbHit) break;
}
ok(!forbHit, "T15", forbHit || "no React/TS/TSX/JSX/Next/ESM in split runtime files");
const BACKEND = [/mongodb|postgres|mysql|firebase|supabase|drizzle/i, /fetch\(\s*['"]\/api/i, /AUTH_TOKEN|SECRET|API_KEY/i];
let backHit = null;
for (const [f, content] of Object.entries(runtimeFiles)) {
  for (const re of BACKEND) if (re.test(content)) { backHit = `${f} matches ${re}`; break; }
  if (backHit) break;
}
ok(!backHit, "T16", backHit || "no backend/DB/auth markers in split");
ok(!/mvp|product-derivation|adapter/i.test(shell + js), "T17", "no product/MVP adapter in split");
ok(!fs.existsSync(path.join(ROOT, "split/assets")), "T18", "no assets/ directory (self-contained data URIs)");

console.log("\nManifest / materialization truth:");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
ok(manifest.stages.mechanical_split_complete === true && manifest.stages.source_split_parity_pass === false && manifest.parity_ref === null, "T19", "S3 asserted, parity pending, no parity_ref");
const mat = JSON.parse(fs.readFileSync(path.join(ROOT, "split/materialization.json"), "utf8"));
let matOk = mat.status === "MATERIALIZED_PENDING_PARITY" && mat.parity_status === "PENDING_EXACT_HEAD_CAPTURE" && mat.authority.bytes === LOCK_BYTES && mat.authority.sha256 === LOCK_SHA;
for (const [rel, meta] of Object.entries(mat.outputs)) {
  const b = fs.readFileSync(path.join(ROOT, rel));
  if (b.length !== meta.bytes || sha256(b) !== meta.sha256) matOk = false;
}
ok(matOk, "T20", "materialization record matches files on disk");

const report = {
  schema_version: "1.0",
  source_id: "SRC071",
  stage: "S3_MECHANICAL_SPLIT",
  run_at: new Date().toISOString(),
  authority: { bytes: LOCK_BYTES, sha256: LOCK_SHA },
  reconstructed: { bytes: recBytes.length, sha256: sha256(recBytes) },
  roundtrip: recBytes.compare(originalBytes) === 0,
  routes: { count: routes.length, set_equal: setEqual, order_equal: orderEqual },
  passed,
  failed,
  checks,
};
fs.mkdirSync(path.join(ROOT, "evidence/split"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "evidence/split/s3-roundtrip.json"), JSON.stringify(report, null, 2) + "\n");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
