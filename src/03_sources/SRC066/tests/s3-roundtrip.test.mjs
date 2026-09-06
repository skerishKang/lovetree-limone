/**
 * SRC066 S3 Mechanical Split — Round-Trip Contract (local only).
 *
 * SINGLE-executable CLEAN-108 flow. Every boundary is re-derived independently
 * from the frozen authority original with byte search and this file's own
 * logic, then compared against the materialized split.
 *
 * SRC066 is a fully self-contained single file: 12 data: <img> URIs plus 5
 * #anchor hrefs in markup, 1 data: fallback URI inside the single inline
 * script, zero external URLs and zero local file references. Nothing is
 * vendored and nothing is rebased.
 *
 * The authority exposes zero QA hooks (0 window.__*, 0 console.*,
 * 0 data-testid), so this file observes only: byte slices, string
 * inventories, DOM-order splices and recorded geometry pins. No hook,
 * probe or adapter is added to any split output.
 *
 * Proves:
 *  - T01/T02  frozen authority byte identity (SHA-256 + size, untouched)
 *  - T03      frozen capsule layout (CENTRAL S3 file list)
 *  - T04      source block inventory: exactly 1 bare style + 1 bare script,
 *             style precedes script, boundaries match materialization
 *  - T05/T06  styles.css / script.js are the exact authority block inners
 *  - T07      split shell carries exactly the two mechanical glue refs and
 *             zero inline style / zero inline script body
 *  - T08      materialization boundary metadata matches independent re-derivation
 *  - T09      reconstructed HTML is byte-identical to the frozen authority
 *             (166996 B exactly)
 *  - T10      CSS semantics preserved (byte-exact + feature inventory equal)
 *  - T11      JS semantics preserved (source text identical; storage + D6/D9
 *             frozen facts asserted, never repaired)
 *  - T12      DOM order preserved: shell is a pure positional splice
 *             (46 ids, 94 classes, 16 data-* all preserved)
 *  - T13/T14/T15 no React/TS/TSX/JSX/Next/ESM, no backend/DB/auth markers,
 *             no product/MVP/adapter wiring, split surface exactly 4 files
 *  - T16      references preserved: 12 data: imgs + 5 #anchors + 1 script
 *             data: URI; zero external, zero local-file refs; exactly the two
 *             glue refs added
 *  - T17      storage contract: 4 lt66:* sessionStorage keys in script.js,
 *             localStorage 0 (D3-correct metadata, source facts frozen)
 *  - T18      rendering contract: 0 perspective/preserve-3d, 2D transforms
 *             present, exactly 1 inline <svg> (D4-correct metadata)
 *  - T19      materialization output hashes match on-disk files + git blobs
  *  - T20      stage flags: S3 complete, S4 parity accepted and referenced
 *  - T21      capsule manifest metadata correctness (D1-D4 NOT reproduced)
 *  - T22      accepted S2 baseline agrees with the frozen original
 *  - T23      frozen defects D1-D12 preserved, D6 demo URL intact
 *
 * Writes evidence/s3/roundtrip.json as S3 run evidence.
 * S4 is NOT executed here; S4 remains HOLD (forbidden in this lane).
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.join(import.meta.dirname, "..");
const ORIGINAL = path.join(ROOT, "original", "original.html");
const SPLIT = path.join(ROOT, "split");

const LOCK_SHA256 = "b50e16984774f3284be38b2b8609fd0a6d7ca9f3d51e3ce5bcd910995911ffc6";
const LOCK_BYTES = 166996;
const STYLE_OPEN_LEN = "<style>".length;
const STYLE_CLOSE_LEN = "</style>".length;
const SCRIPT_OPEN_LEN = "<script>".length;
const SCRIPT_CLOSE_LEN = "</script>".length;
const LINK_LINE = '<link rel="stylesheet" href="./styles.css"/>';
const SCRIPT_SRC_LINE = '<script src="./script.js"></script>';
const SS_KEYS = ["lt66:first", "lt66:candidate", "lt66:why", "lt66:route"];
const DEMO_URL = "https://youtube.com/watch?v=demo";

let passed = 0;
let failed = 0;
const checks = [];
function ok(cond, id, detail) {
  checks.push({ id, pass: !!cond, detail: detail || "" });
  if (cond) passed++;
  else failed++;
  console.log(`  ${cond ? "OK  " : "FAIL"} ${id}${detail ? " - " + detail : ""}`);
}
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const gitBlobSha1 = (buf) => crypto.createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest("hex");
const readBin = (p) => fs.readFileSync(p);
const readTxt = (p) => fs.readFileSync(p, "utf8");
const count = (text, needle) => text.split(needle).length - 1;
const unique = (arr) => [...new Set(arr)];

console.log("\n=== SRC066 S3 Mechanical Split - Round-Trip Contract ===\n");

// ---- T01/T02 frozen authority -----------------------------------------------------
console.log("Frozen authority inputs:");
const origBuf = readBin(ORIGINAL);
const orig = origBuf.toString("utf8");
ok(Buffer.from(orig, "utf8").compare(origBuf) === 0, "T01a", "authority is lossless UTF-8 (no lone surrogates)");
ok(sha256(origBuf) === LOCK_SHA256, "T01", "authority SHA-256 locked");
ok(origBuf.length === LOCK_BYTES, "T02", `authority byte size stable (${origBuf.length})`);

// ---- T03 frozen capsule layout ----------------------------------------------------
console.log("\nFrozen capsule layout (CENTRAL S3 file list):");
const layout = {
  "manifest.json": fs.existsSync(path.join(ROOT, "manifest.json")),
  "authority/authority.json": fs.existsSync(path.join(ROOT, "authority", "authority.json")),
  "authority/sha256.txt": fs.existsSync(path.join(ROOT, "authority", "sha256.txt")),
  "evidence/source/drive-authority-readback.json": fs.existsSync(path.join(ROOT, "evidence", "source", "drive-authority-readback.json")),
  "original/original.html": fs.existsSync(ORIGINAL),
  "baseline/capture-plan.json": fs.existsSync(path.join(ROOT, "baseline", "capture-plan.json")),
  "baseline/accepted-baseline.json": fs.existsSync(path.join(ROOT, "baseline", "accepted-baseline.json")),
  "split/index.html": fs.existsSync(path.join(SPLIT, "index.html")),
  "split/styles.css": fs.existsSync(path.join(SPLIT, "styles.css")),
  "split/script.js": fs.existsSync(path.join(SPLIT, "script.js")),
  "split/materialization.json": fs.existsSync(path.join(SPLIT, "materialization.json")),
  "tests/s3-roundtrip.test.mjs": fs.existsSync(path.join(ROOT, "tests", "s3-roundtrip.test.mjs")),
};
const missing = Object.entries(layout).filter(([, v]) => !v).map(([k]) => k);
ok(missing.length === 0, "T03", missing.length === 0 ? "capsule layout intact (CENTRAL S3 list + harness-gate authority/baseline files)" : `missing: ${missing.join(", ")}`);
const authJson = JSON.parse(readTxt(path.join(ROOT, "authority", "authority.json")));
ok(authJson.source_id === "SRC066" && authJson.authority_status === "LOCKED", "T03b", "authority.json identity LOCKED");
ok(authJson.drive_folder_id === "1cC8htsACOK3AQeE8mjIsuKwCqM42nlqs" && authJson.drive_file_id === "1IV94ub-t9qFs37FfwamViNUYtq5UkvaZ" && authJson.bytes === LOCK_BYTES && authJson.sha256 === LOCK_SHA256, "T03c", "authority.json pins agree with frozen original");
const shaTxt = readTxt(path.join(ROOT, "authority", "sha256.txt"));
ok(shaTxt.trim().startsWith(LOCK_SHA256), "T03d", "authority/sha256.txt matches locked SHA-256");
const readback = JSON.parse(readTxt(path.join(ROOT, "evidence", "source", "drive-authority-readback.json")));
ok(readback.source_id === "SRC066" && readback.verification_mode === "CENTRAL_FRESH_DRIVE_READBACK", "T03e", "drive readback mode = CENTRAL_FRESH_DRIVE_READBACK");
ok(readback.fresh_drive?.folder_id === "1cC8htsACOK3AQeE8mjIsuKwCqM42nlqs" && readback.fresh_drive?.file_id === "1IV94ub-t9qFs37FfwamViNUYtq5UkvaZ" && readback.fresh_drive?.bytes === LOCK_BYTES && readback.fresh_drive?.sha256 === LOCK_SHA256, "T03f", "drive readback pins agree with frozen original");

// ---- T04 block inventory (independent re-derivation) -------------------------------
console.log("\nSource block inventory:");
const styleCount = count(orig, "<style>");
const styleCloseCount = count(orig, "</style>");
const scriptTagCount = count(orig, "<script");
const scriptOpenCount = count(orig, "<script>");
const scriptCloseCount = count(orig, "</script>");
ok(styleCount === 1 && styleCloseCount === 1, "T04a", `exactly one bare style block (${styleCount}/${styleCloseCount})`);
ok(scriptOpenCount === 1 && scriptTagCount === 1 && scriptCloseCount === 1, "T04b", "exactly one bare inline script, no attributed/external script tags");

const styleOpen = orig.indexOf("<style>");
const styleClose = orig.indexOf("</style>", styleOpen + STYLE_OPEN_LEN);
const scriptOpen = orig.indexOf("<script>");
const scriptClose = orig.lastIndexOf("</script>");
ok(styleOpen === 219 && styleClose === 19071, "T04c", `style span ${styleOpen}..${styleClose}`);
ok(scriptOpen === 148523 && scriptClose === 166931, "T04d", `script span ${scriptOpen}..${scriptClose}`);
ok(styleClose + STYLE_CLOSE_LEN < scriptOpen, "T04e", "style block precedes script block in document order");

// ---- T05/T06 extracted parts --------------------------------------------------------
console.log("\nExtracted part fidelity:");
const css = readTxt(path.join(SPLIT, "styles.css"));
const js = readTxt(path.join(SPLIT, "script.js"));
const cssAuth = orig.slice(styleOpen + STYLE_OPEN_LEN, styleClose);
const jsAuth = orig.slice(scriptOpen + SCRIPT_OPEN_LEN, scriptClose);
ok(css.length === cssAuth.length, "T05a", `styles.css length matches authority style inner (${css.length})`);
ok(css === cssAuth, "T05b", "styles.css === authority style inner (exact slice, order preserved)");
ok(js.length === jsAuth.length, "T06a", `script.js chars match authority script inner (${js.length})`);
ok(js === jsAuth, "T06b", "script.js === authority script inner (exact slice, order preserved)");

// ---- T07 shell ----------------------------------------------------------------------
console.log("\nShell structure:");
const shell = readTxt(path.join(SPLIT, "index.html"));
ok(count(shell, LINK_LINE) === 1, "T07a", "exactly one stylesheet glue reference");
ok(count(shell, SCRIPT_SRC_LINE) === 1, "T07b", "exactly one external script glue reference");
ok(!shell.includes("<style>") && !shell.includes("</style>"), "T07c", "no inline style remains in split index");
ok(count(shell, "<script>") === 0 && count(shell, "</script>") === 1, "T07d", "zero inline script bodies; single closing tag belongs to the external script src");

// ---- T08 materialization boundary agreement -----------------------------------------
console.log("\nMaterialization boundary agreement:");
const mat = JSON.parse(readTxt(path.join(SPLIT, "materialization.json")));
ok(mat.source_id === "SRC066", "T08a", "materialization source_id = SRC066");
ok(mat.boundaries.style_open === styleOpen && mat.boundaries.style_close === styleClose, "T08b", "style boundary matches independent derivation");
ok(mat.boundaries.script_open === scriptOpen && mat.boundaries.script_close === scriptClose, "T08c", "script boundary matches independent derivation");
ok(Array.isArray(mat.boundaries.script_blocks) && mat.boundaries.script_blocks.length === 1, "T08d", "single script block recorded");
const blk = mat.boundaries.script_blocks?.[0];
ok(blk && blk.open === scriptOpen && blk.close === scriptClose && blk.length === jsAuth.length, "T08e", `script block length ${blk?.length} matches extracted JS chars`);
ok(Array.isArray(mat.boundaries.script_gaps) && mat.boundaries.script_gaps.length === 0, "T08f", "zero inter-script gaps recorded");

// ---- T09 byte round-trip -------------------------------------------------------------
console.log("\nByte round-trip reconstruction:");
const reconstructed = Buffer.from(
  shell.replace(LINK_LINE, () => `<style>${css}</style>`).replace(SCRIPT_SRC_LINE, () => `<script>${js}</script>`),
  "utf8"
);
ok(reconstructed.compare(origBuf) === 0, "T09", `reconstructed byte-identical to frozen authority (${reconstructed.length} bytes)`);
ok(sha256(reconstructed) === LOCK_SHA256, "T09b", "reconstructed SHA-256 equals authority SHA-256");
ok(reconstructed.length === LOCK_BYTES, "T09c", `reconstructed byte size equals authority (${LOCK_BYTES})`);

// ---- T10 CSS semantics ---------------------------------------------------------------
console.log("\nCSS semantics (rule order + feature inventory):");
const cssFeature = (t) => ({
  rules: (t.match(/[^\s{]+[^{}]*\{/g) || []).length,
  keyframes: count(t, "@keyframes"),
  media: count(t, "@media"),
  customProps: count(t, "--"),
  transforms: count(t, "transform"),
});
const cssOrigFeat = cssFeature(cssAuth);
const cssSplitFeat = cssFeature(css);
ok(JSON.stringify(cssOrigFeat) === JSON.stringify(cssSplitFeat), "T10", `rule/keyframe/property inventory unchanged (${JSON.stringify(cssSplitFeat)})`);
ok(css === cssAuth, "T10b", "styles.css is a byte-exact copy of the authority style inner (rule order preserved)");

// ---- T11 JS semantics -----------------------------------------------------------------
console.log("\nJS semantics (frozen facts asserted, never repaired):");
ok(js === jsAuth, "T11a", "script source text identical => identical event/timing/scroll behavior");
ok(!js.includes("</script>"), "T11b", "no inline script terminator inside script.js");
ok(count(js, "sessionStorage") === 2, "T11c", "sessionStorage get+set pair intact (storeGet/storeSet)");
ok(count(orig, "localStorage") === 0 && count(js, "localStorage") === 0, "T11d", "localStorage count is 0 (D3 source fact frozen)");
ok(js.includes(DEMO_URL) === false && orig.includes(DEMO_URL) && shell.includes(DEMO_URL), "T11e", "D6 demo momentUrl default lives in markup (input value), preserved verbatim in shell (frozen, no fix)");
ok(count(orig, "window.__") === 0 && count(js, "window.__") === 0, "T11f", "zero QA hooks window.__* (D9 source fact frozen)");
ok(count(orig, "console.") === 0, "T11g", "zero console.* in authority");
ok(count(orig, "data-testid") === 0, "T11h", "zero data-testid in authority");

// ---- T12 DOM order ---------------------------------------------------------------------
console.log("\nDOM order preservation:");
const expectedShell = orig.slice(0, styleOpen) + LINK_LINE + orig.slice(styleClose + STYLE_CLOSE_LEN, scriptOpen) + SCRIPT_SRC_LINE + orig.slice(scriptClose + SCRIPT_CLOSE_LEN);
ok(shell === expectedShell, "T12", "split index is a pure positional splice of the authority (DOM order, ids, classes, data-* unchanged)");
const ids = unique(orig.match(/id="[^"]*"/g) || []);
const idMiss = ids.filter((id) => !shell.includes(id));
ok(ids.length === 46 && idMiss.length === 0, "T12c", `${ids.length} unique authority element ids all present in split shell`);
const classes = unique(orig.match(/class="[^"]*"/g) || []);
const classMiss = classes.filter((c) => !shell.includes(c) && !js.includes(c));
ok(classes.length === 94 && classMiss.length === 0, "T12d", `${classes.length} unique authority class attributes all preserved`);
const dataAttrs = unique(orig.match(/data-[a-z-]+="[^"]*"/g) || []);
const dataMiss = dataAttrs.filter((d) => !shell.includes(d) && !js.includes(d));
ok(dataAttrs.length === 16 && dataMiss.length === 0, "T12e", `${dataAttrs.length} unique authority data-* attributes all preserved`);

// ---- T13/T14/T15 policy -----------------------------------------------------------------
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
  /__next|_next\//i,
  /typescript/i,
  /import\s+[\s\S]{0,80}?\sfrom\s+['"]/,
  /export\s+default/,
];
let forbHit = null;
for (const [f, content] of Object.entries(runtimeFiles)) {
  for (const re of FORBIDDEN) {
    if (re.test(content)) forbHit = `${f} matches ${re}`;
  }
  if (forbHit) break;
}
ok(!forbHit, "T13", forbHit || "no React/TS/TSX/JSX/Next/ESM in split runtime files");
const BACKEND = [
  /mongodb|postgres|mysql|firebase|supabase|drizzle|prisma|cloudflare\s+workers?/i,
  /fetch\(\s*['"]\/api/i,
  /AUTH_TOKEN|SECRET|API_KEY|access_token/i,
];
let backHit = null;
for (const [f, content] of Object.entries(runtimeFiles)) {
  for (const re of BACKEND) {
    if (re.test(content)) backHit = `${f} matches ${re}`;
  }
  if (backHit) break;
}
ok(!backHit, "T14", backHit || "no backend/DB/auth/provider markers in split runtime files");
ok(!/\/mvp001|public\/mvp|adapter|src\/03_sources|src\/04_codex/i.test(shell), "T15", "no product/MVP/adapter or repository wiring in split shell");
const splitListing = fs.readdirSync(SPLIT, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort();
ok(!splitListing.some((n) => /\.(tsx|jsx|ts)$/.test(n)), "T15b", `no TS/TSX/JSX files in split surface (${splitListing.join(", ")})`);
ok(JSON.stringify(splitListing) === JSON.stringify(["index.html", "materialization.json", "script.js", "styles.css"]), "T15c", `split surface contains exactly the four expected files (${splitListing.join(", ")})`);
ok(!fs.existsSync(path.join(ROOT, "split", "assets")), "T15d", "no split/assets/** directory created (no local file assets referenced by the authority)");

// ---- T16 reference preservation ----------------------------------------------------------
console.log("\nReference preservation (self-contained single file):");
const imgSrcs = unique(orig.match(/<img[^>]*src="[^"]*"/g) || []);
ok(imgSrcs.length === 12 && imgSrcs.every((t) => t.includes('src="data:image/')), "T16a", "12 markup <img> elements, every src a data: URI");
const anchorHrefs = unique(orig.match(/href="#[a-z]+"/g) || []);
ok(anchorHrefs.length === 5, "T16b", `5 #anchor hrefs preserved (${anchorHrefs.join(", ")})`);
ok(anchorHrefs.every((h) => shell.includes(h)), "T16c", "every #anchor href present verbatim in split shell");
const markupDataCount = count(orig.slice(0, styleOpen) + orig.slice(styleClose + STYLE_CLOSE_LEN, scriptOpen) + orig.slice(scriptClose + SCRIPT_CLOSE_LEN), "data:");
ok(markupDataCount === 12, "T16d", "12 data: URIs in markup regions (all move with the shell)");
ok(count(js, "data:") === 1, "T16e", "1 data: fallback URI inside script.js (moves verbatim with the script)");
ok(!/src="https?:|href="https?:|src="\//.test(orig), "T16f", "zero external and zero root-relative src/href in authority");
ok(!/(?:src|href)="(?!data:|#)[^"]*"/.test(orig.slice(0, styleOpen) + orig.slice(styleClose + STYLE_CLOSE_LEN, scriptOpen)), "T16g", "no local-file src/href in markup regions (nothing to vendor or rebase)");
const shellHrefs = unique(shell.match(/href="[^"]*"/g) || []).sort();
const shellSrcs = unique(shell.match(/src="[^"]*"/g) || []).sort();
ok(shellHrefs.filter((h) => h !== 'href="./styles.css"').every((h) => orig.includes(h)), "T16h", "shell hrefs are authority hrefs plus exactly the stylesheet glue");
ok(shellSrcs.filter((s) => s !== 'src="./script.js"').every((s) => orig.includes(s)), "T16i", "shell srcs are authority srcs plus exactly the script glue");

// ---- T17 storage contract -----------------------------------------------------------------
console.log("\nStorage contract (D3-correct metadata, source facts frozen):");
ok(SS_KEYS.every((k) => js.includes(`'${k}'`)), "T17a", `all 4 lt66:* sessionStorage keys present in script.js (${SS_KEYS.join(", ")})`);
ok(count(js, "sessionStorage.setItem") === 1 && count(js, "sessionStorage.getItem") === 1, "T17b", "single storeSet/storeGet pair (writes are on-demand only, load writes nothing)");
ok(count(orig, "localStorage") === 0, "T17c", "localStorage 0 in authority");

// ---- T18 rendering contract ----------------------------------------------------------------
console.log("\nRendering contract (D4-correct metadata):");
ok(count(orig, "preserve-3d") === 0 && count(orig, "perspective") === 0, "T18a", "0 preserve-3d / 0 perspective (no css3d-dom)");
ok(count(css, "transform") > 0, "T18b", `2D CSS transforms present (${count(css, "transform")} occurrences)`);
ok(count(orig, "<svg") === 1, "T18c", "exactly 1 inline <svg> illustration");

// ---- T19 materialization output hashes --------------------------------------------------------
console.log("\nMaterialization output integrity:");
const outputs = {
  "split/index.html": shell,
  "split/styles.css": css,
  "split/script.js": js,
};
let hashOk = true;
let hashDetail = "";
for (const [rel] of Object.entries(outputs)) {
  const buf = readBin(path.join(ROOT, rel));
  const exp = mat.outputs?.[rel];
  if (!exp || buf.length !== exp.bytes || sha256(buf) !== exp.sha256 || gitBlobSha1(buf) !== exp.git_blob_sha1) {
    hashOk = false;
    hashDetail = rel;
  }
}
ok(hashOk, "T19", hashOk ? "all split outputs match recorded bytes + SHA-256 + Git blob SHA-1" : `mismatch: ${hashDetail}`);
ok(mat.authority?.bytes === LOCK_BYTES && mat.authority?.sha256 === LOCK_SHA256, "T19b", "materialization authority agrees with frozen original");
const contracts = mat.contracts ?? {};
ok(
  contracts.exact_single_style_extraction === true &&
    contracts.exact_single_script_extraction === true &&
    contracts.round_trip_byte_identity === true &&
    contracts.redesign_or_refactor === false &&
    contracts.framework_conversion === false &&
    contracts.product_data_injection === false &&
    contracts.path_rewrite === false &&
    contracts.qa_hooks_added === false &&
    contracts.a11y_or_focus_behavior_modified === false,
  "T19c",
  "materialization contracts complete and all forbidden transformations unrecorded"
);
ok(mat.generation === "MECHANICAL_INLINE_EXTRACTION", "T19d", "generation = MECHANICAL_INLINE_EXTRACTION");
ok(mat.round_trip_evidence?.byte_identical === true && mat.round_trip_evidence?.reconstructed_sha256 === LOCK_SHA256 && mat.round_trip_evidence?.reconstructed_bytes === LOCK_BYTES, "T19e", "recorded round-trip evidence matches the independent reconstruction");

// ---- T20 stage flags (S3 complete, S4 parity accepted) ----------------------------------------------
console.log("\nStage flags (S3 complete, S4 parity accepted):");
const manifest = JSON.parse(readTxt(path.join(ROOT, "manifest.json")));
ok(manifest.stages.identity_verified === true && manifest.stages.raw_authority_locked === true && manifest.stages.baseline_captured === true, "T20a", "S0/S1/S2 stages complete");
ok(manifest.stages.mechanical_split_complete === true, "T20b", "mechanical_split_complete=true");
ok(manifest.stages.source_split_parity_pass === true, "T20c", "source_split_parity_pass=true (S4 parity accepted by CENTRAL)");
ok(manifest.mechanical_split_ref === "split/materialization.json", "T20d", 'mechanical_split_ref="split/materialization.json"');
ok(manifest.runtime_policy === "HTML_CSS_JS_MECHANICAL_ONLY", "T20e", `runtime policy unchanged (${manifest.runtime_policy})`);
ok(manifest.tsx_allowed_during_split === false, "T20f", "TSX remains forbidden during split");
ok(manifest.parity_ref === "evidence/parity/accepted-parity.json", "T20g", 'parity_ref="evidence/parity/accepted-parity.json"');
const acceptedParity = JSON.parse(readTxt(path.join(ROOT, "evidence", "parity", "accepted-parity.json")));
ok(acceptedParity.source_id === "SRC066" && acceptedParity.status === "ACCEPTED" && acceptedParity.authority?.sha256 === LOCK_SHA256 && acceptedParity.authority?.bytes === LOCK_BYTES, "T20h", "accepted parity record exists and its authority agrees with the frozen original");
ok(mat.status === "ACCEPTED", "T20i", "materialization status = ACCEPTED");
ok(mat.parity_status === "PASS" && mat.next_stage === "ACCEPTED", "T20j", "parity_status = PASS, next_stage = ACCEPTED");
ok(mat.parity_evidence?.exact_head === acceptedParity.source_head && /^[0-9a-f]{40}$/.test(acceptedParity.source_head), "T20k", "parity evidence head is an exact SHA equal to the accepted parity source head");
const base = JSON.parse(readTxt(path.join(ROOT, "baseline", "accepted-baseline.json")));
ok(base.status === "ACCEPTED" && base.source_id === "SRC066" && base.authority?.sha256 === LOCK_SHA256 && base.authority?.bytes === LOCK_BYTES, "T20l", "accepted S2 baseline authority agrees with frozen original");

// ---- T21 manifest metadata correctness (D1-D4 NOT reproduced) --------------------------------------
console.log("\nCapsule manifest metadata correctness:");
ok(manifest.authority?.drive_folder_id === "1cC8htsACOK3AQeE8mjIsuKwCqM42nlqs", "T21a", "driveFolderId = live root (D1 not reproduced)");
ok(manifest.source_folder_name === "66_첫트리만들기_인터랙티브스크롤가이드", "T21b", "source folder label exact (D2 not reproduced)");
ok(manifest.source_contract?.storage?.backend === "sessionStorage" && manifest.source_contract?.storage?.localStorage_uses === 0, "T21c", "storage = sessionStorage, localStorage 0 (D3 not reproduced)");
ok(/2D CSS transforms \+ inline SVG/.test(manifest.source_contract?.rendering ?? ""), "T21d", "rendering = 2D CSS transforms + inline SVG (D4 not reproduced)");
ok(Array.isArray(manifest.master_rows) && manifest.master_rows.includes("MST046"), "T21e", "master_rows back-references MST046 (SRC047->MST098 precedent)");

// ---- T22 accepted baseline refs ----------------------------------------------------------------------
console.log("\nAccepted S2 baseline references:");
ok(base.accepted_s2_evidence?.bundle_id === "CLEAN108-SRC066-S2-Candidate-260905", "T22a", "S2 bundle id referenced");
ok(base.accepted_s2_evidence?.bundle_manifest_sha256 === "f2aa5e3fa2ec918136cb4da7f97e0e702dc1b36ea13033b539ca0791b0e2aabc", "T22b", "S2 bundle MANIFEST sha referenced");
ok(Array.isArray(base.frozen_defects) && base.frozen_defects.length === 12, "T22c", "frozen D1-D12 listed in baseline");
ok(base.parity_status === "HOLD" && base.next_stage_authorized === "MECHANICAL_SPLIT", "T22d", "baseline parity HOLD, S3 authorized");

// ---- T23 frozen defects preserved -------------------------------------------------------------------------
console.log("\nFrozen defects preserved (D1-D12, never repaired):");
const defects = mat.frozen_defects_preserved ?? {};
const DEFECT_KEYS = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12"];
const defectOk = DEFECT_KEYS.every((d) => Object.keys(defects).some((k) => k.startsWith(d + "_") && defects[k] === "PRESERVED_NOT_FIXED"));
ok(defectOk, "T23", "all D1-D12 recorded as PRESERVED_NOT_FIXED");
ok(shell.includes(DEMO_URL), "T23b", "D6 demo URL survives verbatim in split/index.html input default (frozen)");

// ---- evidence ----------------------------------------------------------------------------------
const report = {
  schema_version: "1.0",
  source_id: "SRC066",
  stage: "S3_MECHANICAL_SPLIT",
  run_at: new Date().toISOString(),
  authority: { bytes: LOCK_BYTES, sha256: LOCK_SHA256 },
  reconstructed: { bytes: reconstructed.length, sha256: sha256(reconstructed) },
  round_trip: reconstructed.compare(origBuf) === 0,
  boundaries: mat.boundaries,
  outputs: mat.outputs,
  self_containment: {
    markup_img_data_uris: 12,
    script_data_uris: 1,
    external_references: 0,
    local_file_references: 0,
    assets_vendored: 0,
    paths_rebased: false,
  },
  storage_observation: {
    backend: "sessionStorage",
    keys: SS_KEYS,
    localStorage_uses: 0,
    method: "out-of-band source-text observation; no QA hooks added",
  },
  s4_executed: false,
  s4_status: "ACCEPTED",
  s4_status_note: "This file does not execute S4; it only reads the accepted parity record. S4 parity was captured at evidence/s4/ and accepted by CENTRAL direct Drive visual review (skerishKang/lovetree-limone#589 comment 5556645775); the accepted record is evidence/parity/accepted-parity.json and is validated by validate-mechanical-split.mjs.",
  passed,
  failed,
  checks,
};
const outDir = path.join(ROOT, "evidence", "s3");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "roundtrip.json"), JSON.stringify(report, null, 2) + "\n");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
