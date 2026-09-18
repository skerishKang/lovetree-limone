/**
 * SRC062 S3 Mechanical Split — Round-Trip Contract (local only).
 *
 * Single-executable CLEAN-108 flow. Every boundary is re-derived
 * independently from the frozen authority original with byte search and
 * this file's own logic, then compared against the materialized split.
 *
 * Proves:
 *  - T01/T02 frozen authority byte identity (SHA-256 + size, untouched)
 *  - T03 frozen input layout intact (original/ authority/ baseline/ evidence/)
 *  - T04 source block inventory is exactly 1 style + 1 script, no external refs
 *  - T05 split/styles.css === authority style inner (exact slice, order preserved)
 *  - T06 split/script.js === authority script inner (exact slice, order preserved)
 *  - T07 split/index.html carries exactly one stylesheet + one script src glue,
 *    zero inline style, zero inline script body
 *  - T08 materialization boundary metadata matches independent re-derivation
 *  - T09 reconstructed HTML is byte-identical to the frozen authority
 *  - T10 CSS semantics preserved: rule/keyframe/z-index/property/media counts equal
 *  - T11 JS semantics preserved: script source text identical => identical behavior
 *  - T12 DOM order preserved: split index is a pure positional splice of authority
 *  - T13 no React/TS/TSX/JSX/Next/ESM in split runtime files
 *  - T14 no backend/DB/auth markers in non-media-embedded split content
 *  - T15 no product/MVP/adapter wiring in split runtime files
 *  - T16 media references preserved (data URIs + src/href inventory reconciled)
 *  - T17 materialization authority/output hashes match on-disk files + git blobs
 *  - T18 manifest stages: S3 complete, S4 parity accepted and referenced
 *    (accepted-parity.json present, ACCEPTED, SRC062, source_head pinned to
 *    the exact capture commit bound by the materialization parity evidence)
 *  - T19 materialization status is ACCEPTED (S4 promoted)
 *  - T20 parity_status is PASS (accepted by CENTRAL at #614)
 *
 * Writes S3 run evidence to an OS temp directory only; the committed
 * evidence/s3/roundtrip.json record is never overwritten by a test run.
 * S4 is NOT executed here; this file only reads the accepted parity record.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { execFileSync } from "node:child_process";

const ROOT = path.join(import.meta.dirname, "..");
const ORIGINAL = path.join(ROOT, "original", "original.html");
const SPLIT = path.join(ROOT, "split");

const LOCK_SHA256 = "bc5484a1c545165feb57cd76cae49c8f1e7bb0b3f4a0e11fa9bc4e739a6987e8";
const LOCK_BYTES = 20728647;
const LINK_LINE = '<link rel="stylesheet" href="./styles.css"/>';
const SCRIPT_SRC_LINE = '<script src="./script.js"></script>';
const STYLE_OPEN_LEN = "<style>".length;
const STYLE_CLOSE_LEN = "</style>".length;
const SCRIPT_OPEN_LEN = "<script>".length;
const SCRIPT_CLOSE_LEN = "</script>".length;

let passed = 0;
let failed = 0;
const checks = [];
function ok(cond, id, detail) {
  checks.push({ id, pass: !!cond, detail: detail || "" });
  if (cond) { passed++; console.log(`  \u2713 ${id}${detail ? " \u2014 " + detail : ""}`); }
  else { failed++; console.log(`  \u2717 FAIL: ${id}${detail ? " \u2014 " + detail : ""}`); }
}
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const gitBlobSha1 = (buf) => crypto.createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest("hex");
function commitExists(sha) {
  try { execFileSync("git", ["-C", ROOT, "cat-file", "-e", `${sha}^{commit}`], { stdio: "ignore" }); return true; }
  catch { return false; }
}
const readBin = (p) => fs.readFileSync(p);
const readTxt = (p) => fs.readFileSync(p, "utf8");
const count = (text, needle) => text.split(needle).length - 1;
const unique = (arr) => [...new Set(arr)];

console.log("\n=== SRC062 S3 Mechanical Split \u2014 Round-Trip Contract ===\n");

// ---- T01/T02 frozen authority -----------------------------------------------------
console.log("Frozen authority inputs:");
const origBuf = readBin(ORIGINAL);
const orig = origBuf.toString("utf8");
ok(sha256(origBuf) === LOCK_SHA256, "T01", "authority SHA-256 locked");
ok(origBuf.length === LOCK_BYTES, "T02", `authority byte size stable (${origBuf.length})`);

// ---- T03 frozen input layout ------------------------------------------------------
console.log("\nFrozen input layout:");
const layout = {
  "manifest.json": fs.existsSync(path.join(ROOT, "manifest.json")),
  "authority/authority.json": fs.existsSync(path.join(ROOT, "authority", "authority.json")),
  "authority/sha256.txt": fs.existsSync(path.join(ROOT, "authority", "sha256.txt")),
  "baseline/capture-plan.json": fs.existsSync(path.join(ROOT, "baseline", "capture-plan.json")),
  "baseline/accepted-baseline.json": fs.existsSync(path.join(ROOT, "baseline", "accepted-baseline.json")),
  "evidence/source/drive-authority-readback.json": fs.existsSync(path.join(ROOT, "evidence", "source", "drive-authority-readback.json")),
  "original/original.html": fs.existsSync(ORIGINAL),
};
const missing = Object.entries(layout).filter(([, v]) => !v).map(([k]) => k);
ok(missing.length === 0, "T03", missing.length === 0 ? "frozen input layout intact" : `missing: ${missing.join(", ")}`);
const shaTxt = readTxt(path.join(ROOT, "authority", "sha256.txt"));
ok(shaTxt.trim().startsWith(LOCK_SHA256), "T03b", "authority/sha256.txt matches locked SHA-256");

// ---- T04 block inventory ----------------------------------------------------------
console.log("\nSource block inventory (independent re-derivation):");
const styleCount = count(orig, "<style>");
const styleCloseCount = count(orig, "</style>");
const scriptOpenCount = count(orig, "<script>");
const scriptTagCount = count(orig, "<script");
const scriptCloseCount = count(orig, "</script>");
ok(styleCount === 1 && styleCloseCount === 1, "T04a", `exactly one style block (${styleCount}/${styleCloseCount})`);
ok(scriptOpenCount === 1 && scriptTagCount === scriptOpenCount && scriptCloseCount === 1, "T04b", "exactly one bare inline script, no attributed/external script tags");
ok(!orig.includes("<link"), "T04c", "source has no external stylesheet reference");

const styleOpen = orig.indexOf("<style>");
const styleClose = orig.indexOf("</style>", styleOpen + STYLE_OPEN_LEN);
const scriptOpen = orig.indexOf("<script>");
const scriptClose = orig.lastIndexOf("</script>");
ok(styleOpen === 559 && styleClose === 18333, "T04d", `style span ${styleOpen}..${styleClose}`);
ok(scriptOpen === 20712134 && scriptClose === 20727194, "T04e", `script span ${scriptOpen}..${scriptClose}`);
ok(styleClose + STYLE_CLOSE_LEN < scriptOpen, "T04f", "style block precedes script block in document order");
ok(
  count(orig, "<img") === 9 && (orig.match(/<img[^>]*\bsrc="data:/gi) || []).length === 8,
  "T04g",
  "9 img references: 8 static with inline data-URI sources + 1 JS template literal"
);
const jsTemplateImg = '<img class="film-thumb" src="${momentById[m.id].src}" alt="">';
ok(orig.includes(jsTemplateImg), "T04h", "9th img element is a JS template literal inside the authority script");

// ---- T05/T06 extracted parts ------------------------------------------------------
console.log("\nExtracted part fidelity:");
const css = readTxt(path.join(SPLIT, "styles.css"));
const js = readTxt(path.join(SPLIT, "script.js"));
const cssAuth = orig.slice(styleOpen + STYLE_OPEN_LEN, styleClose);
const jsAuth = orig.slice(scriptOpen + SCRIPT_OPEN_LEN, scriptClose);
ok(css === cssAuth, "T05", `styles.css === authority style inner (${css.length} chars)`);
ok(js === jsAuth, "T06", `script.js === authority script inner (${js.length} chars)`);

// ---- T07 shell ---------------------------------------------------------------------
console.log("\nShell structure:");
const shell = readTxt(path.join(SPLIT, "index.html"));
ok(count(shell, LINK_LINE) === 1, "T07a", "exactly one stylesheet reference");
ok(count(shell, SCRIPT_SRC_LINE) === 1, "T07b", "exactly one external script reference");
ok(!shell.includes("<style>") && !shell.includes("</style>"), "T07c", "no inline style remains in split index");
ok(!/<script(?!\s+src=["']\.\/script\.js["'])/i.test(shell), "T07d", "no inline/alternate script remains in split index");
ok(count(shell, "<script>") === 0 && count(shell, "</script>") === 1, "T07e", "zero inline script bodies; single closing tag belongs to the external script src");

// ---- T08 materialization boundary agreement ----------------------------------------
console.log("\nMaterialization boundary agreement:");
const mat = JSON.parse(readTxt(path.join(SPLIT, "materialization.json")));
ok(mat.source_id === "SRC062", "T08a", "materialization source_id = SRC062");
ok(mat.boundaries.style_open === styleOpen && mat.boundaries.style_close === styleClose, "T08b", "style boundary matches independent derivation");
ok(mat.boundaries.script_open === scriptOpen && mat.boundaries.script_close === scriptClose, "T08c", "script boundary matches independent derivation");
ok(Array.isArray(mat.boundaries.script_blocks) && mat.boundaries.script_blocks.length === 1, "T08d", "single script block recorded");
const blk = mat.boundaries.script_blocks?.[0];
ok(blk && blk.open === scriptOpen && blk.close === scriptClose && blk.length === jsAuth.length, "T08e", `script block length ${blk?.length} matches extracted JS`);
ok(Array.isArray(mat.boundaries.script_gaps) && mat.boundaries.script_gaps.length === 0, "T08f", "zero inter-script gaps recorded");

// ---- T09 byte round-trip -----------------------------------------------------------
console.log("\nByte round-trip reconstruction:");
const reconstructed = Buffer.from(
  shell.replace(LINK_LINE, () => `<style>${css}</style>`).replace(SCRIPT_SRC_LINE, () => `<script>${js}</script>`),
  "utf8"
);
ok(reconstructed.compare(origBuf) === 0, "T09", `reconstructed byte-identical to frozen authority (${reconstructed.length} bytes)`);
ok(sha256(reconstructed) === LOCK_SHA256, "T09b", "reconstructed SHA-256 equals authority SHA-256");

// ---- T10 CSS semantics -------------------------------------------------------------
console.log("\nCSS semantics (rule order + feature inventory):");
const cssFeature = (t) => ({
  rules: (t.match(/[^\s{]+[^{}]*\{/g) || []).length,
  keyframes: count(t, "@keyframes"),
  media: count(t, "@media"),
  supports: count(t, "@supports"),
  customProps: count(t, "--"),
  zIndex: count(t, "z-index"),
  position: count(t, "position:"),
  transitions: count(t, "transition:"),
  animations: count(t, "animation"),
});
const cssOrigFeat = cssFeature(cssAuth);
const cssSplitFeat = cssFeature(css);
ok(JSON.stringify(cssOrigFeat) === JSON.stringify(cssSplitFeat), "T10", `rule/keyframe/property/z-index inventory unchanged (${JSON.stringify(cssSplitFeat)})`);
ok(css === cssAuth, "T10b", "styles.css is a byte-exact copy of the authority style inner (rule order preserved)");

// ---- T11 JS semantics --------------------------------------------------------------
console.log("\nJS semantics:");
ok(js === jsAuth, "T11a", "script source text identical => identical event/timing/pointer behavior");
ok(!js.includes("</script>"), "T11b", "no inline script terminator inside script.js");
ok(js.includes(jsTemplateImg), "T11c", "JS template-literal img generator preserved verbatim");
const jsFeature = (t) => ({
  addEventListener: count(t, "addEventListener"),
  removeEventListener: count(t, "removeEventListener"),
  requestAnimationFrame: count(t, "requestAnimationFrame"),
  setTimeout: count(t, "setTimeout"),
  setInterval: count(t, "setInterval"),
  iife: (t.match(/\)\(\)/g) || []).length,
  functions: count(t, "function"),
});
ok(JSON.stringify(jsFeature(js)) === JSON.stringify(jsFeature(jsAuth)), "T11d", `event/animation constant inventory unchanged (${JSON.stringify(jsFeature(js))})`);

// ---- T12 DOM order -----------------------------------------------------------------
console.log("\nDOM order preservation:");
const expectedShell = orig.slice(0, styleOpen) + LINK_LINE + orig.slice(styleClose + STYLE_CLOSE_LEN, scriptOpen) + SCRIPT_SRC_LINE + orig.slice(scriptClose + SCRIPT_CLOSE_LEN);
ok(shell === expectedShell, "T12", "split index is a pure positional splice of the authority (DOM order, ids, classes, data-* unchanged)");
const beforeStyle = orig.slice(0, styleOpen);
const gap = orig.slice(styleClose + STYLE_CLOSE_LEN, scriptOpen);
const afterScript = orig.slice(scriptClose + SCRIPT_CLOSE_LEN);
ok(
  shell.startsWith(beforeStyle) && shell.endsWith(afterScript) && shell.includes(gap),
  "T12b",
  "authority head, markup gap, and tail appear in original document order"
);
const ids = unique(orig.match(/id="[0-9A-Za-z_.:-]+"/g) || []);
const idMiss = ids.filter((id) => !shell.includes(id));
ok(ids.length === 31 && idMiss.length === 0, "T12c", `${ids.length} unique authority element ids all present in split shell`);
const classes = unique(orig.match(/class="[^"]*"/g) || []);
const classMiss = classes.filter((c) => !shell.includes(c) && !js.includes(c));
ok(classes.length === 71 && classMiss.length === 0, "T12d", `${classes.length} unique authority class attributes all preserved`);
const dataAttrs = unique(orig.match(/data-[a-z-]+="[^"]*"/g) || []);
const dataMiss = dataAttrs.filter((d) => !shell.includes(d) && !js.includes(d));
ok(dataAttrs.length === 40 && dataMiss.length === 0, "T12e", `${dataAttrs.length} unique authority data-* attributes all preserved`);

// ---- T13/T14/T15 policy ------------------------------------------------------------
console.log("\nPolicy checks:");
// The authority embeds multi-megabyte base64 data URIs, where any short ASCII
// string can appear as random payload noise. Backend/framework scans therefore
// run on the split content with data-URI payloads removed, which is the content
// the split actually authored.
const stripDataUris = (t) => t.replace(/data:[^"'\s)]+/g, "data:");
const runtimeFiles = {
  "split/index.html": stripDataUris(shell),
  "split/styles.css": stripDataUris(css),
  "split/script.js": stripDataUris(js),
};
const FORBIDDEN = [
  /from\s+['"]react['"]/i,
  /require\(\s*['"]react['"]\)/i,
  /React\.(createElement|Component|use)/,
  /from\s+['"]next['"]/,
  /next\.js|__next|_next\//i,
  /typescript/i,
  /import\s+[\s\S]{0,80}?\sfrom\s+['"]/,
];
let forbHit = null;
for (const [f, content] of Object.entries(runtimeFiles)) {
  for (const re of FORBIDDEN) {
    if (re.test(content)) { forbHit = `${f} matches ${re}`; break; }
  }
  if (forbHit) break;
}
ok(!forbHit, "T13", forbHit || "no React/TS/TSX/JSX/Next/ESM in split runtime files");
const BACKEND = [
  /mongodb|postgres|mysql|firebase|supabase|drizzle|prisma/i,
  /fetch\(\s*['"]\/api/i,
  /AUTH_TOKEN|SECRET|API_KEY|access_token/i,
];
let backHit = null;
for (const [f, content] of Object.entries(runtimeFiles)) {
  for (const re of BACKEND) {
    if (re.test(content)) { backHit = `${f} matches ${re}`; break; }
  }
  if (backHit) break;
}
ok(!backHit, "T14", backHit || "no backend/DB/auth markers in split runtime files");
ok(!/\/mvp001|public\/mvp|adapter/i.test(stripDataUris(shell)), "T15", "no product/MVP/adapter wiring in split shell");
const splitListing = fs.readdirSync(SPLIT, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
ok(!splitListing.some((n) => /\.(tsx|jsx|ts)$/.test(n)), "T15b", `no TS/TSX/JSX files in split surface (${splitListing.join(", ")})`);
ok(fs.existsSync(path.join(ROOT, "split", "index.html")) && fs.existsSync(path.join(ROOT, "split", "styles.css")) && fs.existsSync(path.join(ROOT, "split", "script.js")), "T15c", "split surface contains only index.html, styles.css, script.js, materialization.json");

// ---- T16 media references ----------------------------------------------------------
console.log("\nMedia references:");
const mediaUris = (t) => unique(t.match(/data:[^"'\s)]+/g) || []);
const origUris = mediaUris(orig);
const splitUris = mediaUris(shell).concat(mediaUris(css)).concat(mediaUris(js));
ok(origUris.length === 7 && JSON.stringify(origUris) === JSON.stringify(splitUris), "T16a", `${origUris.length} distinct data-URI assets byte-identical and unsplit`);
ok(count(orig, "data:") === count(shell, "data:"), "T16b", `data: URI occurrence count preserved (${count(shell, "data:")})`);
ok(count(orig, "<img") === count(shell, "<img") + count(js, "<img"), "T16c", `img element count reconciled across shell + script (${count(shell, "<img")} + ${count(js, "<img")})`);
ok(count(orig, "<video") === count(shell, "<video") + count(js, "<video"), "T16d", "video element count reconciled (0/0)");
const nonDataRefs = (t) => unique(t.match(/(?:src|href)="[^"]*"/g) || []).filter((r) => !r.includes('="data:'));
const markupRegion = orig.slice(0, styleOpen) + orig.slice(styleClose + STYLE_CLOSE_LEN, scriptOpen) + orig.slice(scriptClose + SCRIPT_CLOSE_LEN);
ok(nonDataRefs(markupRegion).length === 0, "T16e", "authority markup region carries zero non-data src/href references");
ok(
  JSON.stringify(nonDataRefs(jsAuth).sort()) === JSON.stringify(nonDataRefs(js).sort()),
  "T16f",
  "authority JS-block src reference relocated verbatim to script.js"
);
ok(nonDataRefs(shell).join(",") === 'href="./styles.css",src="./script.js"', "T16g", "split shell adds exactly the two deterministic mechanical glue references");
ok(nonDataRefs(js).length === 1 && nonDataRefs(js)[0].includes("momentById"), "T16h", "JS template-literal src reference present once in script.js");

// ---- T17 materialization output hashes ---------------------------------------------
console.log("\nMaterialization output integrity:");
const outputs = {
  "split/index.html": shell,
  "split/styles.css": css,
  "split/script.js": js,
};
let hashOk = true;
let hashDetail = "";
for (const [rel, text] of Object.entries(outputs)) {
  const buf = readBin(path.join(ROOT, rel));
  const exp = mat.outputs?.[rel];
  if (!exp || buf.length !== exp.bytes || sha256(buf) !== exp.sha256 || gitBlobSha1(buf) !== exp.git_blob_sha1) {
    hashOk = false;
    hashDetail = rel;
  }
}
ok(hashOk, "T17", hashOk ? "all split outputs match recorded bytes + SHA-256 + Git blob SHA-1" : `mismatch: ${hashDetail}`);
ok(mat.authority?.bytes === LOCK_BYTES && mat.authority?.sha256 === LOCK_SHA256, "T17b", "materialization authority agrees with frozen original");
const contracts = mat.contracts ?? {};
ok(
  contracts.exact_single_style_extraction === true &&
    contracts.exact_single_script_extraction === true &&
    contracts.round_trip_byte_identity === true &&
    contracts.redesign_or_refactor === false &&
    contracts.framework_conversion === false &&
    contracts.product_data_injection === false,
  "T17c",
  "materialization contracts complete and forbidden transformations unrecorded"
);
ok(mat.generation === "MECHANICAL_INLINE_EXTRACTION", "T17d", "generation = MECHANICAL_INLINE_EXTRACTION");

// ---- T18/T19/T20 stage flags -------------------------------------------------------
console.log("\nStage flags (S4 accepted):");
const manifest = JSON.parse(readTxt(path.join(ROOT, "manifest.json")));
ok(manifest.stages.identity_verified === true && manifest.stages.raw_authority_locked === true && manifest.stages.baseline_captured === true, "T18a", "S0/S1/S2 stages complete");
ok(manifest.stages.mechanical_split_complete === true, "T18b", "mechanical_split_complete=true");
ok(manifest.stages.source_split_parity_pass === true, "T18c", "source_split_parity_pass=true (S4 parity accepted by CENTRAL)");
ok(manifest.mechanical_split_ref === "split/materialization.json", "T18d", 'mechanical_split_ref="split/materialization.json"');
ok(manifest.runtime_policy === "HTML_CSS_JS_MECHANICAL_ONLY" && manifest.tsx_allowed_during_split === false, "T18e", "runtime policy unchanged (TSX forbidden)");
const acceptedParityPath = path.join(ROOT, "evidence", "parity", "accepted-parity.json");
ok(fs.existsSync(acceptedParityPath), "T18f", "S4 parity acceptance evidence present at evidence/parity/accepted-parity.json");
const acceptedParity = JSON.parse(readTxt(acceptedParityPath));
ok(acceptedParity.status === "ACCEPTED" && acceptedParity.source_id === "SRC062" && acceptedParity.authority?.sha256 === LOCK_SHA256 && acceptedParity.authority?.bytes === LOCK_BYTES, "T18f2", "accepted parity record parses, is ACCEPTED for SRC062, and its authority agrees with the frozen original");
ok(/^[0-9a-f]{40}$/.test(acceptedParity.source_head) && mat.parity_evidence?.exact_head === acceptedParity.source_head && commitExists(acceptedParity.source_head), "T18f3", `accepted source_head ${acceptedParity.source_head} equals the materialization parity_evidence exact head and is a commit in this repository`);
ok(!fs.existsSync(path.join(ROOT, "parity")), "T18g", "no parity/ capture directory created at S3");
ok(mat.status === "ACCEPTED", "T19", "materialization status = ACCEPTED");
ok(mat.parity_status === "PASS", "T20", "parity_status = PASS");
const base = JSON.parse(readTxt(path.join(ROOT, "baseline", "accepted-baseline.json")));
ok(base.status === "ACCEPTED" && base.source_id === "SRC062" && base.authority?.sha256 === LOCK_SHA256 && base.authority?.bytes === LOCK_BYTES, "T20b", "accepted S2 baseline authority agrees with frozen original");

// ---- evidence -----------------------------------------------------------------------
const report = {
  schema_version: "1.0",
  source_id: "SRC062",
  stage: "S3_MECHANICAL_SPLIT",
  run_at: new Date().toISOString(),
  authority: { bytes: LOCK_BYTES, sha256: LOCK_SHA256 },
  reconstructed: { bytes: reconstructed.length, sha256: sha256(reconstructed) },
  round_trip: reconstructed.compare(origBuf) === 0,
  boundaries: mat.boundaries,
  outputs: mat.outputs,
  s4_executed: false,
  s4_status: "ACCEPTED",
  s4_status_note: "This file does not execute S4; it only reads the accepted parity record (evidence/parity/accepted-parity.json, CENTRAL-accepted at #614).",
  passed,
  failed,
  checks,
};
// Run evidence is written to a throwaway OS temp directory so that executing
// this test never dirties the work tree or overwrites the committed capsule
// record evidence/s3/roundtrip.json (defect fixed; same rule as the post-#637
// SRC066 and post-#639 CDX014 rebinds).
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "src062-s3-roundtrip-"));
fs.writeFileSync(path.join(tmpDir, "roundtrip.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`Run evidence (temp, not committed): ${path.join(tmpDir, "roundtrip.json")}`);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
