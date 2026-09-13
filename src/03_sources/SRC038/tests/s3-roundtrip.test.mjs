/**
 * SRC038 S3 Mechanical Split — Round-Trip + Frozen-Behavior Validation (local only).
 *
 * Independently re-derives every boundary from the frozen authority original
 * (byte search, own logic) and proves:
 *  - T01 authority SHA-256/byte lock holds on original/original.html
 *  - T01b exactly one style block and one plain script block
 *  - T02 styles.css === authority <style> inner bytes
 *  - T03 script.js === authority <script> inner bytes
 *  - T04 reconstruction is byte-identical to the frozen original (35935 / 9d5b4b36...)
 *  - T05 split index reconnects via link + script src glue only (exactly one each, no inline style/script)
 *  - T06 no local runtime assets: split/ holds exactly index.html + styles.css + script.js + materialization.json
 *  - T07 all 18 YouTube video ids survive verbatim in split/script.js
 *  - T08 external hosts preserved verbatim (i.ytimg.com thumbnail + youtube.com/embed autoplay=1&rel=0), no proxy/localize
 *  - T09 D8 stale static stats literal (454 notes, 551 links) survives byte-exactly in split index
 *  - T10 D10 invalid video id O3ptaX7-G8w preserved verbatim (no substitution)
 *  - T11 D7 touch-action:none + wheel preventDefault survive in split CSS/JS
 *  - T12 D6 Escape-only keydown survives; D4 continuous rAF survives; no prefers-reduced-motion or onerror handler added
 *  - T13 no React/TS/TSX/JSX/Next/ESM import in split runtime files
 *  - T14 no backend/DB/auth markers and no product/MVP adapter wiring in split
 *  - T15 manifest truth: S3 split complete, S4 parity NOT claimed (stages false, parity_ref null)
 *  - T16 materialization record matches files on disk (bytes + sha256 + git_blob_sha1), status MATERIALIZED_PENDING_PARITY
 *  - T17 capture surface is SINGLE_EXECUTABLE: shared-harness disposition is null (no SKIP)
 *
 * Writes evidence/split/s3-roundtrip.json as run evidence. No commits. No pushes.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getCaptureSurfaceDisposition } from "../../../08_harness/capture-surface.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const gitBlobSha1 = (b) => crypto.createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])).digest("hex");

const LOCK_BYTES = 35935;
const LOCK_SHA = "9d5b4b3682d2bba0118a4a7a6e9a37098442c4be4180f74009e4580c36130526";
const LINK = '<link rel="stylesheet" href="./styles.css"/>';
const SRC = '<script src="./script.js"></script>';

const VIDEO_IDS = [
  "nOrDWTMSR0w", "ts_xlXdsl4M", "IaWoxBn4kDo", "sFPKeBPdFZ8", "88gQkK_p_t0", "d2X4dhqub9M",
  "qKkJ6YHLhak", "ePAi-0qKEio", "93jg1vU4R5I", "9I7Au-q7eH8", "3HPze4eDQTs", "CuGtbPTwrIc",
  "a1gsq3jC0Tg", "17UP5Pfmduo", "2SDl278ezBQ", "-uYx6joIm0g", "O3ptaX7-G8w", "kUobSk5oe_U",
];

let passed = 0;
let failed = 0;
const checks = [];
function ok(cond, id, detail) {
  checks.push({ id, pass: !!cond, detail: detail || "" });
  if (cond) { passed++; console.log(`  \u2713 ${id}${detail ? " — " + detail : ""}`); }
  else { failed++; console.log(`  \u2717 FAIL: ${id}${detail ? " — " + detail : ""}`); }
}

console.log("\n=== SRC038 S3 Mechanical Split — Round-Trip Validation ===\n");

const originalBytes = fs.readFileSync(path.join(ROOT, "original/original.html"));
const original = originalBytes.toString("utf8");
console.log("Frozen authority input:");
ok(originalBytes.length === LOCK_BYTES && sha256(originalBytes) === LOCK_SHA, "T01", `original locked at ${originalBytes.length} bytes`);

const so = original.indexOf("<style>");
const sc = original.indexOf("</style>");
const jo = original.indexOf("<script>");
const jc = original.indexOf("</script>");
ok(original.split("<style>").length - 1 === 1 && original.split("</style>").length - 1 === 1 && original.split("<script>").length - 1 === 1 && original.split("</script>").length - 1 === 1 && original.split("<script").length - 1 === 1, "T01b", "exactly one style block and one plain script block, no attributed/external scripts");

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

console.log("\nNo local runtime assets:");
const splitDir = path.join(ROOT, "split");
const splitFiles = fs.readdirSync(splitDir).sort();
ok(JSON.stringify(splitFiles) === JSON.stringify(["index.html", "materialization.json", "script.js", "styles.css"]) && !fs.existsSync(path.join(splitDir, "assets")), "T06", "split/ holds exactly index.html + styles.css + script.js + materialization.json, no assets dir");

console.log("\nVideo roster fidelity (18 ids verbatim):");
const idsOk = VIDEO_IDS.every((id) => js.includes(`'${id}'`)) && (js.match(/\['[A-Za-z0-9_-]{11}','/g) || []).length === 18;
ok(idsOk, "T07", "all 18 YouTube video ids survive verbatim in split/script.js");

console.log("\nExternal host fidelity:");
const hostsOk = js.includes("https://i.ytimg.com/vi/${id}/hqdefault.jpg") && js.includes("https://www.youtube.com/embed/${n.videoId}?autoplay=1&rel=0") && !/proxy|\/api\/|r.jina|invidious/i.test(js);
ok(hostsOk, "T08", "i.ytimg.com thumbnail + youtube.com/embed autoplay=1&rel=0 URLs preserved verbatim, no proxy/localize");

console.log("\nFrozen behavior:");
ok(shell.includes("454 notes, 551 links") && !shell.includes("543 links"), "T09", "D8 stale static stats literal (551) survives byte-exactly in split index");
ok(js.includes("'O3ptaX7-G8w'") && js.includes("O3ptaX7-G8w"), "T10", "D10 invalid video id O3ptaX7-G8w preserved verbatim (no substitution)");
ok(css.includes("touch-action:none") && js.includes("preventDefault") && js.includes("passive:false"), "T11", "D7 touch-action:none + wheel preventDefault(passive:false) survive in split CSS/JS");
ok(js.includes("Escape"), "T12a", "D6 Escape-only keydown handler survives in split/script.js");
ok((js.match(/requestAnimationFrame/g) || []).length === 2 && !css.includes("prefers-reduced-motion") && !js.includes("prefers-reduced-motion") && !js.includes("onerror"), "T12b", "D4 continuous rAF loop survives; no prefers-reduced-motion or onerror handler added (D6/D11 untouched)");

console.log("\nPolicy checks:");
const runtimeFiles = { "split/index.html": shell, "split/styles.css": css, "split/script.js": js };
const FORBIDDEN = [/from\s+['"]react['"]/i, /React\.(createElement|Component|use)/, /\.tsx?\b/, /\bjsx\b/i, /next\/|__next|from\s+['"]next['"]/i, /import\s+[\s\S]*?\sfrom\s+['"]/];
let forbHit = null;
for (const [f, content] of Object.entries(runtimeFiles)) {
  for (const re of FORBIDDEN) if (re.test(content)) { forbHit = `${f} matches ${re}`; break; }
  if (forbHit) break;
}
ok(!forbHit, "T13", forbHit || "no React/TS/TSX/JSX/Next/ESM in split runtime files");
const BACKEND = [/mongodb|postgres|mysql|firebase|supabase|drizzle/i, /fetch\(\s*['"]\/api/i, /AUTH_TOKEN|SECRET|API_KEY/i];
let backHit = null;
for (const [f, content] of Object.entries(runtimeFiles)) {
  for (const re of BACKEND) if (re.test(content)) { backHit = `${f} matches ${re}`; break; }
  if (backHit) break;
}
ok(!backHit, "T14a", backHit || "no backend/DB/auth markers in split");
ok(!/mvp|product-derivation|adapter/i.test(shell + js), "T14b", "no product/MVP adapter in split");

console.log("\nManifest / materialization truth:");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
ok(
  manifest.stages.mechanical_split_complete === true &&
    manifest.stages.source_split_parity_pass === false &&
    manifest.parity_ref === null &&
    manifest.duplicate_variant_status === "DUPLICATE_COPY_SAME_SHA" &&
    manifest.runtime_policy === "HTML_CSS_JS_MECHANICAL_ONLY" &&
    manifest.tsx_allowed_during_split === false,
  "T15",
  "S3 split complete; S4 parity NOT claimed (stage false, parity_ref null); DUPLICATE_COPY_SAME_SHA recorded; mechanical-only policy"
);
const mat = JSON.parse(fs.readFileSync(path.join(ROOT, "split/materialization.json"), "utf8"));
let matOk =
  mat.status === "MATERIALIZED_PENDING_PARITY" &&
  mat.parity_status === "PENDING_EXACT_HEAD_CAPTURE" &&
  mat.parity_ref === null &&
  mat.authority.bytes === LOCK_BYTES &&
  mat.authority.sha256 === LOCK_SHA &&
  mat.contracts.exact_single_style_extraction === true &&
  mat.contracts.exact_single_script_extraction === true &&
  mat.contracts.round_trip_byte_identity === true &&
  mat.contracts.redesign_or_refactor === false &&
  mat.contracts.framework_conversion === false &&
  mat.contracts.product_data_injection === false;
for (const [rel, meta] of Object.entries(mat.outputs)) {
  const b = fs.readFileSync(path.join(ROOT, rel));
  if (b.length !== meta.bytes || sha256(b) !== meta.sha256 || gitBlobSha1(b) !== meta.git_blob_sha1) matOk = false;
}
ok(matOk, "T16", "materialization MATERIALIZED_PENDING_PARITY + PENDING_EXACT_HEAD_CAPTURE matches files on disk (bytes + sha256 + git_blob_sha1)");

console.log("\nCapture-surface contract:");
const cs = manifest.capture_surface;
ok(cs?.mode === "SINGLE_EXECUTABLE" && cs?.reason === "STANDALONE_SINGLE_FILE_WITH_EXTERNAL_YOUTUBE_HOSTS", "T17a", "manifest declares SINGLE_EXECUTABLE capture surface");
const disposition = getCaptureSurfaceDisposition({ manifest });
ok(disposition === null || disposition === undefined, "T17b", `shared capture-harness disposition is ${disposition === null || disposition === undefined ? "null (generic harness applies)" : JSON.stringify(disposition)}`);

const report = {
  schema_version: "1.0",
  source_id: "SRC038",
  stage: "S3_MECHANICAL_SPLIT",
  run_at: new Date().toISOString(),
  authority: { bytes: LOCK_BYTES, sha256: LOCK_SHA },
  reconstructed: { bytes: recBytes.length, sha256: sha256(recBytes) },
  roundtrip: recBytes.compare(originalBytes) === 0,
  video_ids: { count: 18, verbatim: idsOk },
  external_hosts: { i_ytimg: js.includes("i.ytimg.com"), youtube_embed: js.includes("youtube.com/embed"), verbatim: hostsOk },
  frozen_defects_preserved: {
    D8_stale_literal_551: shell.includes("454 notes, 551 links"),
    D10_invalid_video_id: js.includes("O3ptaX7-G8w"),
    D7_touch_action: css.includes("touch-action:none"),
    D7_wheel_preventDefault: js.includes("preventDefault"),
    D6_escape_only: js.includes("Escape"),
    D4_continuous_raf: (js.match(/requestAnimationFrame/g) || []).length === 2,
    no_reduced_motion_added: !css.includes("prefers-reduced-motion") && !js.includes("prefers-reduced-motion"),
    no_onerror_added: !js.includes("onerror"),
  },
  split_files: splitFiles,
  capture_surface: { mode: cs?.mode ?? null, reason: cs?.reason ?? null, disposition: disposition ?? null },
  passed,
  failed,
  checks,
};
fs.mkdirSync(path.join(ROOT, "evidence/split"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "evidence/split/s3-roundtrip.json"), JSON.stringify(report, null, 2) + "\n");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
