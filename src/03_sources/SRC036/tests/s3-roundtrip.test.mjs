/**
 * SRC036 S3 Mechanical Split — Round-Trip Contract (local only).
 *
 * Single-executable CLEAN-108 flow. Every boundary is re-derived
 * independently from the frozen authority original with string search and
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
 *  - T10 CSS semantics preserved: rule/keyframe/property/media counts equal
 *  - T11 JS semantics preserved: script source text identical => identical behavior
 *  - T12 DOM order preserved: split index is a pure positional splice of authority
 *  - T13 no React/TS/TSX/JSX/Next/ESM in split runtime files
 *  - T14 no backend/DB/auth markers in split content
 *  - T15 no product/MVP/adapter wiring in split runtime files
 *  - T16 frozen source strings preserved byte-exactly across split outputs
 *    (D1/D2/D3/D4/D5/D6/D10 locks + timers 1600/3450/4800)
 *  - T16b frozen defect structure locks D11/D12/D13 (async timer race, Enter
 *    event ordering, entering-class persistence) remain exactly as authored
 *  - T17 materialization authority/output hashes match on-disk files + git blobs
 *  - T18 manifest stages: S3 complete, S4 parity NOT run; capture surface is
 *    CONTEXT_AWARE_ONLY with both shared harnesses SKIP
 *  - T19 materialization status is MATERIALIZED_PENDING_PARITY
 *  - T20 parity_status is PENDING_EXACT_HEAD_CAPTURE, parity_ref null
 *  - T21 MST001 issued to SRC036 with EXPLICIT_LEDGER_PROVENANCE
 *
 * Writes S3 run evidence to an OS temp directory only; the committed
 * evidence/s3/roundtrip.json record is never overwritten by a test run.
 * S4 is NOT executed here; S4 is NOT_RELEASED by CENTRAL (#589 comment
 * 5655967612) and requires the context-aware sibling surface.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";

const ROOT = path.join(import.meta.dirname, "..");
const REPO = path.join(ROOT, "..", "..", "..");
const ORIGINAL = path.join(ROOT, "original", "original.html");
const SPLIT = path.join(ROOT, "split");

const LOCK_SHA256 = "b8be6b49ba8a736c369050eb4f669a51e07b7b1e56f3d683b25504b9aa383927";
const LOCK_BYTES = 22561;
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
const readBin = (p) => fs.readFileSync(p);
const readTxt = (p) => fs.readFileSync(p, "utf8");
const count = (text, needle) => text.split(needle).length - 1;
const unique = (arr) => [...new Set(arr)];

console.log("\n=== SRC036 S3 Mechanical Split \u2014 Round-Trip Contract ===\n");

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
  "authority-context.json": fs.existsSync(path.join(ROOT, "authority-context.json")),
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
ok(count(orig, "<iframe") === 1, "T04d", "exactly one iframe element (the first-journey portal frame)");
ok(count(orig, "<img") === 0 && count(orig, "<video") === 0, "T04e", "no img/video elements; media is delegated to the sibling context");

const styleOpen = orig.indexOf("<style>");
const styleClose = orig.indexOf("</style>", styleOpen + STYLE_OPEN_LEN);
const scriptOpen = orig.indexOf("<script>");
const scriptClose = orig.lastIndexOf("</script>");
ok(styleOpen === 188 && styleClose === 16179, "T04f", `style span ${styleOpen}..${styleClose}`);
ok(scriptOpen === 18715 && scriptClose === 22101, "T04g", `script span ${scriptOpen}..${scriptClose}`);
ok(styleClose + STYLE_CLOSE_LEN < scriptOpen, "T04h", "style block precedes script block in document order");

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
ok(mat.source_id === "SRC036", "T08a", "materialization source_id = SRC036");
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
ok(JSON.stringify(cssFeature(cssAuth)) === JSON.stringify(cssFeature(css)), "T10", `rule/keyframe/property/z-index inventory unchanged (${JSON.stringify(cssFeature(css))})`);
ok(css === cssAuth, "T10b", "styles.css is a byte-exact copy of the authority style inner (rule order preserved)");

// ---- T11 JS semantics --------------------------------------------------------------
console.log("\nJS semantics:");
ok(js === jsAuth, "T11a", "script source text identical => identical event/timing/pointer behavior");
ok(!js.includes("</script>"), "T11b", "no inline script terminator inside script.js");
const jsFeature = (t) => ({
  addEventListener: count(t, "addEventListener"),
  setTimeout: count(t, "setTimeout"),
  clearTimeout: count(t, "clearTimeout"),
  requestAnimationFrame: count(t, "requestAnimationFrame"),
  classListAdd: count(t, "classList.add"),
  classListRemove: count(t, "classList.remove"),
  functions: count(t, "function"),
});
ok(JSON.stringify(jsFeature(js)) === JSON.stringify(jsFeature(jsAuth)), "T11c", `event/timer/DOM-call inventory unchanged (${JSON.stringify(jsFeature(js))})`);

// ---- T12 DOM order -----------------------------------------------------------------
console.log("\nDOM order preservation:");
const expectedShell = orig.slice(0, styleOpen) + LINK_LINE + orig.slice(styleClose + STYLE_CLOSE_LEN, scriptOpen) + SCRIPT_SRC_LINE + orig.slice(scriptClose + SCRIPT_CLOSE_LEN);
ok(shell === expectedShell, "T12", "split index is a pure positional splice of the authority (DOM order, ids, classes, attributes unchanged)");
const ids = unique(orig.match(/id="[0-9A-Za-z_.:-]+"/g) || []);
const idMiss = ids.filter((id) => !shell.includes(id));
ok(ids.length === 8 && idMiss.length === 0, "T12b", `${ids.length} unique authority element ids all present in split shell`);
const classes = unique(orig.match(/class="[^"]*"/g) || []);
const classMiss = classes.filter((c) => !shell.includes(c) && !js.includes(c));
ok(classes.length === 35 && classMiss.length === 0, "T12c", `${classes.length} unique authority class attributes all preserved`);

// ---- T13/T14/T15 policy ------------------------------------------------------------
console.log("\nPolicy checks:");
const runtimeFiles = {
  "split/index.html": shell,
  "split/styles.css": css,
  "split/script.js": js,
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
ok(!/\/mvp001|public\/mvp|adapter/i.test(shell), "T15", "no product/MVP/adapter wiring in split shell");
const splitListing = fs.readdirSync(SPLIT, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort();
ok(!splitListing.some((n) => /\.(tsx|jsx|ts)$/.test(n)), "T15b", `no TS/TSX/JSX files in split surface (${splitListing.join(", ")})`);
ok(JSON.stringify(splitListing) === JSON.stringify(["index.html", "materialization.json", "script.js", "styles.css"]), "T15c", "split surface contains exactly index.html, styles.css, script.js, materialization.json");

// ---- T16 frozen source strings -----------------------------------------------------
console.log("\nFrozen source strings (defect locks D1-D6, D10):");
ok(count(css, "min-width:980px") === 1 && count(orig, "min-width:980px") === 1, "T16a", "D1 min-width:980px preserved exactly once in styles.css");
ok(count(css, "min-height:650px") === 1 && count(orig, "min-height:650px") === 1, "T16b", "D2 min-height:650px preserved exactly once in styles.css");
ok(count(css, "overflow:hidden") === count(cssAuth, "overflow:hidden") && count(css, "overflow:hidden") === 5, "T16c", "D9 body overflow:hidden clipping shorthand preserved (5 occurrences, sub-980 tail unreachable)");
ok(js.includes("const encodedPath='04_%EB%94%94%EC%9E%90%EC%9D%B8-%EC%B1%84%ED%83%9D%EB%B3%B8/0.%EC%B2%AB%EC%97%AC%EC%A0%95%ED%86%B5%ED%95%A9-3%EA%B0%9Chtml%ED%95%A9%EB%B3%B8/lovetree-first-journey-unified-v1.html';"), "T16d", "D3 percent-encoded first-journey path literal preserved byte-exactly");
ok(js.includes("const fileTarget='file:///D:/LoveTree-work/'+encodedPath;"), "T16e", "D6 file:///D:/LoveTree-work/ hardcode preserved");
ok(js.includes("frame.src=location.protocol==='file:'?fileTarget:hostedTarget;"), "T16f", "D3 file/hosted branch preserved; no /v4 route introduced");
ok(js.includes("document.addEventListener('keydown',e=>{if(e.key==='Escape')"), "T16g", "D4 document-level keydown handler preserved");
ok(js.includes("window.addEventListener('pointermove',e=>{") && !js.includes("touchstart") && !js.includes("touchmove"), "T16h", "D5 pointermove-only parallax preserved; no touch contract added");
ok(js.includes("setTimeout(()=>page.classList.add('crossing'),1600)") && js.includes("},3450)") && js.includes("state.timer=setTimeout(()=>{if(!state.loaded)warning.classList.add('show')},4800)"), "T16i", "timers 1600/3450/4800 preserved verbatim");
ok(count(shell, 'href="#"') === 1, "T16j", "D10 brand dead link href=\"#\" preserved without substitution");
ok(js.includes("frame.addEventListener('load',markLoaded)"), "T16k", "D7 iframe load->markLoaded wiring preserved verbatim");
ok(css.includes("prefers-reduced-motion"), "T16l", "D8 reduced-motion CSS block preserved (JS timers intentionally ungated)");
ok(js.includes("i<88") && js.includes("137.5"), "T16m", "88-petal golden-angle (137.5) seeded field preserved; no Math.random/Date.now added: " + (!/Math\.random|Date\.now/.test(js)));
ok(!/Math\.random|Date\.now/.test(js), "T16n", "no nondeterminism introduced into split script.js");

console.log("\nFrozen defect structure locks (D11-D13, promoted S2 observations):");
ok(count(js, "setTimeout") === 3 && count(js, "state.timer=setTimeout") === 1 && count(js, "clearTimeout") === 1, "T16o", "D11 exactly 3 setTimeout calls, only the 4800ms warning timer tracked; enter() timers remain untracked and uncancellable");
ok(js.includes("document.getElementById('enterButton').addEventListener('click',enter);document.getElementById('returnButton').addEventListener('click',exit);"), "T16p", "D12 enter/return click bindings and document-keydown Enter ordering preserved exactly as authored");
ok(count(js, "page.classList.remove") === 1 && js.includes("page.classList.remove('inside','crossing','entering')") && count(js, "classList.add('entering')") === 1, "T16q", "D13 'entering' class removed only inside exit(); no cleanup introduced");

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

// ---- T18/T19/T20 stage flags (pending parity) ---------------------------------------
console.log("\nStage flags (S3 pending, S4 NOT_RELEASED):");
const manifest = JSON.parse(readTxt(path.join(ROOT, "manifest.json")));
ok(manifest.stages.identity_verified === true && manifest.stages.raw_authority_locked === true && manifest.stages.baseline_captured === true, "T18a", "S0/S1/S2 stages complete");
ok(manifest.stages.mechanical_split_complete === true, "T18b", "mechanical_split_complete=true");
ok(manifest.stages.source_split_parity_pass === false, "T18c", "source_split_parity_pass=false (S4 NOT_RELEASED)");
ok(manifest.mechanical_split_ref === "split/materialization.json", "T18d", 'mechanical_split_ref="split/materialization.json"');
ok(manifest.parity_ref === null, "T18e", "manifest parity_ref null");
ok(manifest.runtime_policy === "HTML_CSS_JS_MECHANICAL_ONLY" && manifest.tsx_allowed_during_split === false, "T18f", "runtime policy unchanged (TSX forbidden)");
ok(manifest.authority?.bytes === LOCK_BYTES && manifest.authority?.sha256 === LOCK_SHA256, "T18g", "manifest authority agrees with frozen original");
ok(manifest.duplicate_variant_status === "SINGLE_EXECUTABLE_NO_DUPLICATE", "T18h", "duplicate variant status SINGLE_EXECUTABLE_NO_DUPLICATE");
ok(manifest.capture_surface?.mode === "CONTEXT_AWARE_ONLY" && manifest.capture_surface?.reason === "EXACT_FIRST_JOURNEY_SIBLING_CONTEXT_REQUIRED", "T18i", "capture surface CONTEXT_AWARE_ONLY (exact first-journey sibling required)");
ok(
  manifest.capture_surface?.shared_harness_disposition?.["capture-source-baseline.mjs"] === "SKIP" &&
    manifest.capture_surface?.shared_harness_disposition?.["capture-source-parity.mjs"] === "SKIP" &&
    manifest.capture_surface?.shared_harness_disposition?.skip_reason === "CONTEXT_AWARE_SURFACE_ONLY",
  "T18j",
  "both shared harnesses SKIP with CONTEXT_AWARE_SURFACE_ONLY"
);
ok(manifest.capture_surface?.repository_original_surface_runtime_equivalent === false && manifest.capture_surface?.repository_split_surface_runtime_equivalent === false, "T18k", "repository surfaces declared runtime-equivalent=false");
ok(manifest.authority_context_required === true && manifest.authority_context_ref === "authority-context.json" && fs.existsSync(path.join(ROOT, "authority-context.json")), "T18l", "authority context required and present");
ok(!fs.existsSync(path.join(ROOT, "evidence", "parity")) && !fs.existsSync(path.join(ROOT, "parity")), "T18m", "no parity evidence directory created at S3");
const base = JSON.parse(readTxt(path.join(ROOT, "baseline", "accepted-baseline.json")));
ok(base.status === "ACCEPTED" && base.source_id === "SRC036" && base.authority?.sha256 === LOCK_SHA256 && base.authority?.bytes === LOCK_BYTES, "T18n", "accepted S2 baseline authority agrees with frozen original");
ok(base.next_stage_authorized === "MECHANICAL_SPLIT", "T18o", "S2 authorized exactly MECHANICAL_SPLIT");
ok(mat.status === "MATERIALIZED_PENDING_PARITY", "T19", "materialization status = MATERIALIZED_PENDING_PARITY");
ok(mat.parity_status === "PENDING_EXACT_HEAD_CAPTURE" && (mat.parity_ref === null || mat.parity_ref === undefined), "T20", "parity_status = PENDING_EXACT_HEAD_CAPTURE with null parity_ref");

// ---- T21 MST001 issuance -------------------------------------------------------------
console.log("\nMST001 issuance binding:");
const mst = JSON.parse(readTxt(path.join(REPO, "src", "02_master", "MST001", "record.json")));
ok(mst.master_key === "MST001" && mst.mapping_status === "RESOLVED", "T21a", "MST001 exists and is RESOLVED");
ok(JSON.stringify(mst.identity_refs?.map((r) => `${r.namespace}:${r.id}:${r.basis}`)) === JSON.stringify(["SRC:SRC036:EXPLICIT_LEDGER_PROVENANCE"]), "T21b", "MST001 resolves to SRC036 via EXPLICIT_LEDGER_PROVENANCE only");
ok(mst.explicit_ledger_provenance?.coverage_row === 1 && mst.explicit_ledger_provenance?.capsule_ref === "src/03_sources/SRC036", "T21c", "ledger provenance pins coverage row 1 to the SRC036 capsule");
ok(JSON.stringify(manifest.master_rows) === JSON.stringify(["MST001"]), "T21d", "SRC036 manifest master_rows = [MST001]");

// ---- evidence -----------------------------------------------------------------------
const report = {
  schema_version: "1.0",
  source_id: "SRC036",
  stage: "S3_MECHANICAL_SPLIT",
  run_at: new Date().toISOString(),
  authority: { bytes: LOCK_BYTES, sha256: LOCK_SHA256 },
  reconstructed: { bytes: reconstructed.length, sha256: sha256(reconstructed) },
  round_trip: reconstructed.compare(origBuf) === 0,
  boundaries: mat.boundaries,
  outputs: mat.outputs,
  s4_executed: false,
  s4_status: "NOT_RELEASED",
  s4_status_note: "This file does not execute S4. S4 is NOT_RELEASED by CENTRAL (#589 comment 5655967612); parity capture requires the context-aware isolated virtual root serving the exact first-journey sibling, so both shared harnesses are SKIP.",
  passed,
  failed,
  checks,
};
// Run evidence is written to a throwaway OS temp directory so that executing
// this test never dirties the work tree or overwrites the committed capsule
// record evidence/s3/roundtrip.json (same rule as the SRC062 post-#637 fix).
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "src036-s3-roundtrip-"));
fs.writeFileSync(path.join(tmpDir, "roundtrip.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`Run evidence (temp, not committed): ${path.join(tmpDir, "roundtrip.json")}`);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
