/**
 * SRC069 S3 Mechanical Split — Round-Trip Contract (local only).
 *
 * Context-aware CLEAN-108 flow. Every boundary is re-derived independently
 * from the frozen authority original with byte search and this file's own
 * logic, then compared against the materialized split.
 *
 * SRC069 differs from single-executable peers in one material way: the
 * authority is a path-context-sensitive portal. Its own 11 `../../` portal
 * URLs only resolve from the canonical selected-D directory depth, so
 * neither original/original.html nor split/index.html is a valid runtime
 * surface at its repository path. That fact is recorded in the capsule
 * (capture_surface.mode = CONTEXT_AWARE_ONLY) and the shared single-
 * executable baseline/parity harnesses SKIP this capsule by explicit
 * disposition. S4 parity is therefore not started by this file.
 *
 * Proves:
 *  - T01/T02  frozen authority byte identity (SHA-256 + size, untouched)
 *  - T03/T03b frozen input layout + sha256.txt intact
 *  - T04      source block inventory: exactly 1 style + 1 script, 4 external
 *             <link> refs, 1 external <video> src, zero local-file refs
 *  - T05/T06  styles.css / script.js are the exact authority block inners
 *  - T07      split shell carries exactly the two mechanical glue refs and
 *             zero inline style / zero inline script body
 *  - T08      materialization boundary metadata matches independent re-derivation
 *  - T09      reconstructed HTML is byte-identical to the frozen authority
 *  - T10      CSS semantics preserved (byte-exact + feature inventory equal)
 *  - T11      JS semantics preserved (source text identical)
 *  - T12      DOM order preserved: shell is a pure positional splice
 *  - T13/T14/T15 no React/TS/TSX/JSX/Next/ESM, no backend/DB/auth markers,
 *             no product/MVP/adapter wiring
 *  - T16      external references preserved byte-identical, no local assets
 *  - T17      the 11 portal relative URLs survive unchanged, byte for byte,
 *             in the same order, and are NOT rebased/rewritten
 *  - T18      authority-context.json records all 11 target identities without
 *             vendoring a single target byte
 *  - T19      materialization output hashes match on-disk files + git blobs
 *  - T20/T21/T22 stage flags: S3 complete, S4 parity NOT accepted, no parity
 *             artifact, capture_surface CONTEXT_AWARE_ONLY, frozen defects
 *             preserved
 *
 * Writes evidence/s3/roundtrip.json as S3 run evidence.
 * S4 is NOT executed here; S4 remains HOLD.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.join(import.meta.dirname, "..");
const ORIGINAL = path.join(ROOT, "original", "original.html");
const SPLIT = path.join(ROOT, "split");

const LOCK_SHA256 = "64d5a545a45013b12463f53af7d7be12b7c1c7b0de6f56cb82761fd469791fb3";
const LOCK_BYTES = 27600;
const STYLE_OPEN_LEN = "<style>".length;
const STYLE_CLOSE_LEN = "</style>".length;
const SCRIPT_OPEN_LEN = "<script>".length;
const SCRIPT_CLOSE_LEN = "</script>".length;
const LINK_LINE = '<link rel="stylesheet" href="./styles.css"/>';
const SCRIPT_SRC_LINE = '<script src="./script.js"></script>';
const PORTAL_RX = /path:'(\.\.\/\.\.[^']*)'/g;
const PORTAL_COUNT = 11;

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
const HEX64 = /^[0-9a-f]{64}$/;

console.log("\n=== SRC069 S3 Mechanical Split - Round-Trip Contract ===\n");

// ---- T01/T02 frozen authority -----------------------------------------------------
console.log("Frozen authority inputs:");
const origBuf = readBin(ORIGINAL);
const orig = origBuf.toString("utf8");
ok(sha256(origBuf) === LOCK_SHA256, "T01", "authority SHA-256 locked");
ok(origBuf.length === LOCK_BYTES, "T02", `authority byte size stable (${origBuf.length})`);

// ---- T03/T03b frozen input layout --------------------------------------------------
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

// ---- T04 block inventory (independent re-derivation) -------------------------------
console.log("\nSource block inventory:");
const styleCount = count(orig, "<style>");
const styleCloseCount = count(orig, "</style>");
const scriptTagCount = count(orig, "<script");
const scriptOpenCount = count(orig, "<script>");
const scriptCloseCount = count(orig, "</script>");
ok(styleCount === 1 && styleCloseCount === 1, "T04a", `exactly one style block (${styleCount}/${styleCloseCount})`);
ok(scriptOpenCount === 1 && scriptTagCount === 1 && scriptCloseCount === 1, "T04b", "exactly one bare inline script, no attributed/external script tags");

const styleOpen = orig.indexOf("<style>");
const styleClose = orig.indexOf("</style>", styleOpen + STYLE_OPEN_LEN);
const scriptOpen = orig.indexOf("<script>");
const scriptClose = orig.lastIndexOf("</script>");
ok(styleOpen === 964 && styleClose === 12641, "T04c", `style span ${styleOpen}..${styleClose}`);
ok(scriptOpen === 19813 && scriptClose === 27074, "T04d", `script span ${scriptOpen}..${scriptClose}`);
ok(styleClose + STYLE_CLOSE_LEN < scriptOpen, "T04e", "style block precedes script block in document order");

// SRC069 is a portal: its external refs are part of the authority and must
// survive the split untouched. There are no local-file refs, so nothing is
// vendored.
const linkTags = unique(orig.match(/<link[^>]*\/?>/g) || []);
const videoTags = unique(orig.match(/<video[^>]*>/g) || []);
ok(linkTags.length === 4, "T04f", `four external stylesheet/font <link> refs (${linkTags.length})`);
ok(videoTags.length === 1 && videoTags[0].startsWith("<video class=\"bg-video\" src=\"https://"), "T04g", "one external CloudFront background video src");
const markupRegion = orig.slice(0, styleOpen) + orig.slice(styleClose + STYLE_CLOSE_LEN, scriptOpen) + orig.slice(scriptClose + SCRIPT_CLOSE_LEN);
const markupRefs = unique(markupRegion.match(/(?:src|href)="[^"]*"/g) || []);
const localMarkupRefs = markupRefs.filter((r) => !/^="?https?:\/\//.test(r) && !/="data:/.test(r) && !/^="?#/.test(r) && !/="\/\.\./.test(r) === false);
ok(count(orig, "<img") === 0, "T04h", "authority markup carries zero <img> elements");
ok(!/^(src|href)="(?!https?:|\/\/|#|\/\.\.\/)(\.\/|\.\/\.\/|\/|[A-Za-z]:|[^":]+\/)[^"]*"/.test(markupRegion), "T04i", "no local repository-relative file references in authority markup");

// ---- T05/T06 extracted parts --------------------------------------------------------
console.log("\nExtracted part fidelity:");
const css = readTxt(path.join(SPLIT, "styles.css"));
const js = readTxt(path.join(SPLIT, "script.js"));
const cssAuth = orig.slice(styleOpen + STYLE_OPEN_LEN, styleClose);
const jsAuth = orig.slice(scriptOpen + SCRIPT_OPEN_LEN, scriptClose);
ok(css.length === cssAuth.length, "T05a", `styles.css length matches authority style inner (${css.length})`);
ok(css === cssAuth, "T05b", "styles.css === authority style inner (exact slice, order preserved)");
ok(js.length === jsAuth.length, "T06a", `script.js length matches authority script inner (${js.length})`);
ok(js === jsAuth, "T06b", "script.js === authority script inner (exact slice, order preserved)");

// ---- T07 shell ----------------------------------------------------------------------
console.log("\nShell structure:");
const shell = readTxt(path.join(SPLIT, "index.html"));
ok(count(shell, LINK_LINE) === 1, "T07a", "exactly one stylesheet glue reference");
ok(count(shell, SCRIPT_SRC_LINE) === 1, "T07b", "exactly one external script glue reference");
ok(!shell.includes("<style>") && !shell.includes("</style>"), "T07c", "no inline style remains in split index");
ok(!/<script(?!\s+src=["']\.\/script\.js["'])/i.test(shell), "T07d", "no inline/alternate script remains in split index");
ok(count(shell, "<script>") === 0 && count(shell, "</script>") === 1, "T07e", "zero inline script bodies; single closing tag belongs to the external script src");

// ---- T08 materialization boundary agreement -----------------------------------------
console.log("\nMaterialization boundary agreement:");
const mat = JSON.parse(readTxt(path.join(SPLIT, "materialization.json")));
ok(mat.source_id === "SRC069", "T08a", "materialization source_id = SRC069");
ok(mat.boundaries.style_open === styleOpen && mat.boundaries.style_close === styleClose, "T08b", "style boundary matches independent derivation");
ok(mat.boundaries.script_open === scriptOpen && mat.boundaries.script_close === scriptClose, "T08c", "script boundary matches independent derivation");
ok(Array.isArray(mat.boundaries.script_blocks) && mat.boundaries.script_blocks.length === 1, "T08d", "single script block recorded");
const blk = mat.boundaries.script_blocks?.[0];
ok(blk && blk.open === scriptOpen && blk.close === scriptClose && blk.length === jsAuth.length, "T08e", `script block length ${blk?.length} matches extracted JS`);
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
  supports: count(t, "@supports"),
  customProps: count(t, "--"),
  zIndex: count(t, "z-index"),
  position: count(t, "position:"),
  transitions: count(t, "transition:"),
  animations: count(t, "animation"),
  selectors: count(t, "select(") + count(t, "querySelector(") + count(t, "querySelectorAll("),
});
const cssOrigFeat = cssFeature(cssAuth);
const cssSplitFeat = cssFeature(css);
ok(JSON.stringify(cssOrigFeat) === JSON.stringify(cssSplitFeat), "T10", `rule/keyframe/property/z-index inventory unchanged (${JSON.stringify(cssSplitFeat)})`);
ok(css === cssAuth, "T10b", "styles.css is a byte-exact copy of the authority style inner (rule order preserved)");

// ---- T11 JS semantics -----------------------------------------------------------------
console.log("\nJS semantics:");
ok(js === jsAuth, "T11a", "script source text identical => identical event/timing/pointer behavior");
ok(!js.includes("</script>"), "T11b", "no inline script terminator inside script.js");
const jsFeature = (t) => ({
  addEventListener: count(t, "addEventListener"),
  removeEventListener: count(t, "removeEventListener"),
  requestAnimationFrame: count(t, "requestAnimationFrame"),
  setTimeout: count(t, "setTimeout"),
  setInterval: count(t, "setInterval"),
  iife: (t.match(/\)\(\)/g) || []).length,
  functions: count(t, "function"),
  arrows: (t.match(/=>/g) || []).length,
  templateLiterals: (t.match(/`/g) || []).length,
});
ok(JSON.stringify(jsFeature(js)) === JSON.stringify(jsFeature(jsAuth)), "T11c", `event/animation/timer constant inventory unchanged (${JSON.stringify(jsFeature(js))})`);
ok(count(js, "window.lovetreePortal") >= 1, "T11d", "authority QA hook window.lovetreePortal preserved");

// ---- T12 DOM order ---------------------------------------------------------------------
console.log("\nDOM order preservation:");
const expectedShell = orig.slice(0, styleOpen) + LINK_LINE + orig.slice(styleClose + STYLE_CLOSE_LEN, scriptOpen) + SCRIPT_SRC_LINE + orig.slice(scriptClose + SCRIPT_CLOSE_LEN);
ok(shell === expectedShell, "T12", "split index is a pure positional splice of the authority (DOM order, ids, classes, data-* unchanged)");
const beforeStyle = orig.slice(0, styleOpen);
const gap = orig.slice(styleClose + STYLE_CLOSE_LEN, scriptOpen);
const afterScript = orig.slice(scriptClose + SCRIPT_CLOSE_LEN);
ok(shell.startsWith(beforeStyle) && shell.endsWith(afterScript) && shell.includes(gap), "T12b", "authority head, markup gap, and tail appear in original document order");
const ids = unique(orig.match(/id="[^"]*"/g) || []);
const idMiss = ids.filter((id) => !shell.includes(id));
ok(ids.length === 20 && idMiss.length === 0, "T12c", `${ids.length} unique authority element ids all present in split shell`);
const classes = unique(orig.match(/class="[^"]*"/g) || []);
const classMiss = classes.filter((c) => !shell.includes(c) && !js.includes(c));
ok(classes.length === 62 && classMiss.length === 0, "T12d", `${classes.length} unique authority class attributes all preserved`);
const dataAttrs = unique(orig.match(/data-[a-z-]+="[^"]*"/g) || []);
const dataMiss = dataAttrs.filter((d) => !shell.includes(d) && !js.includes(d));
ok(dataAttrs.length === 12 && dataMiss.length === 0, "T12e", `${dataAttrs.length} unique authority data-* attributes all preserved`);

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
  /next\.js|__next|_next\//i,
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

// ---- T16 external references --------------------------------------------------------------
console.log("\nExternal reference preservation:");
const markupHrefs = unique(markupRegion.match(/href="[^"]*"/g) || []).sort();
const markupSrcs = unique(markupRegion.match(/src="[^"]*"/g) || []).sort();
const shellHrefs = unique(shell.match(/href="[^"]*"/g) || []).sort();
const shellSrcs = unique(shell.match(/src="[^"]*"/g) || []).sort();
const preservedHrefs = markupHrefs.every((h) => shellHrefs.includes(h));
const preservedSrcs = markupSrcs.every((s) => shellSrcs.includes(s));
ok(preservedHrefs, "T16a", `${markupHrefs.length} authority href references preserved byte-identical in split shell`);
ok(preservedSrcs, "T16b", `${markupSrcs.length} authority src references preserved byte-identical in split shell`);
const addedHrefs = shellHrefs.filter((h) => !markupHrefs.includes(h));
const addedSrcs = shellSrcs.filter((s) => !markupSrcs.includes(s));
ok(JSON.stringify(addedHrefs) === JSON.stringify(['href="./styles.css"']), "T16c", "split shell adds exactly one deterministic stylesheet glue href");
ok(JSON.stringify(addedSrcs) === JSON.stringify(['src="./script.js"']), "T16d", "split shell adds exactly one deterministic script glue src");
ok(count(orig, "data:") === 0, "T16e", "authority embeds zero data: URIs, so no media payload can drift");
ok(videoTags.every((v) => shell.includes(v)), "T16f", "authority video element preserved verbatim in split shell");

// ---- T17 portal relative URL preservation -------------------------------------------------
console.log("\nPortal relative URL preservation (the SRC069-specific invariant):");
const origPortals = [...orig.matchAll(PORTAL_RX)].map((m) => m[1]);
const jsPortals = [...js.matchAll(PORTAL_RX)].map((m) => m[1]);
ok(origPortals.length === PORTAL_COUNT, "T17a", `${origPortals.length} portal paths declared in the authority templates table`);
ok(jsPortals.length === PORTAL_COUNT, "T17b", `${jsPortals.length} portal paths present in split/script.js`);
ok(JSON.stringify(origPortals) === JSON.stringify(jsPortals), "T17c", "exact ordered set of portal relative URLs is byte-identical between authority and split");
ok(JSON.stringify(unique(origPortals).sort()) === JSON.stringify(unique(jsPortals).sort()), "T17d", "portal URL set equality (order-independent)");
ok(count(orig, "../../") === PORTAL_COUNT && count(js, "../../") === PORTAL_COUNT, "T17e", `independent ../.. occurrence count preserved (${PORTAL_COUNT}/${PORTAL_COUNT})`);
ok(origPortals.every((p) => p.startsWith("../../")), "T17f", "every portal path still carries the exact ../../ prefix");
ok(origPortals.every((p) => p.endsWith(".html")), "T17g", "every portal path still targets a .html sibling file");
ok(origPortals.every((p) => !p.includes("://")), "T17h", "no portal path was rebased to an absolute or protocol URL");
ok(origPortals.every((p) => !p.startsWith("/")), "T17i", "no portal path was rebased to a root-relative repository URL");
ok(origPortals.every((p) => !/src\/03_sources|src\/04_codex|\/mvp|D:\\\\|gdrive/i.test(p)), "T17j", "no portal path was rewritten to a repo/Drive/MVP location");
const portalSetEqual = new Set(origPortals).size === PORTAL_COUNT;
ok(portalSetEqual, "T17k", "portal paths are distinct (no duplicate/collapsed mappings)");

// ---- T18 authority-context target identities ------------------------------------------------
console.log("\nAuthority-context target identity (metadata only, zero vendoring):");
const ctx = JSON.parse(readTxt(path.join(ROOT, "authority-context.json")));
ok(ctx.source_id === "SRC069" && ctx.runtime_context_required === true, "T18a", "authority-context declares runtime_context_required=true");
ok(ctx.root_copy_authority === false, "T18b", "root copy is explicitly not the authority");
ok(ctx.sibling_context_html_vendored === false, "T18c", "sibling portal context HTML is not vendored");
ok(Array.isArray(ctx.portal_targets) && ctx.portal_targets.length === PORTAL_COUNT, "T18d", `${ctx.portal_targets?.length} portal targets recorded`);
const ctxUrls = ctx.portal_targets.map((t) => t.relative_url).sort();
ok(JSON.stringify(ctxUrls) === JSON.stringify([...origPortals].sort()), "T18e", "authority-context relative_url set equals the authority's own portal set");
const targetOk = ctx.portal_targets.every((t) => typeof t.target.drive_file_id === "string" && t.target.drive_file_id.length > 0 && Number.isInteger(t.target.bytes) && t.target.bytes > 0 && HEX64.test(t.target.sha256) && typeof t.target.filename === "string" && t.target.filename.endsWith(".html"));
ok(targetOk, "T18f", "every portal target records Drive file id + filename + bytes + SHA-256");
const totalBytes = ctx.portal_targets.reduce((sum, t) => sum + t.target.bytes, 0);
ok(ctx.portal_target_summary.total_target_bytes === totalBytes, "T18g", `portal target byte total reconciles (${totalBytes.toLocaleString()} bytes recorded, none vendored)`);
ok(ctx.portal_target_summary.count === PORTAL_COUNT && ctx.portal_target_summary.all_prefixes_match === true && ctx.portal_target_summary.all_have_drive_identity === true, "T18h", "portal target summary consistent");
ok(ctx.vendoring_policy.vendored_into_repository === false, "T18i", "vendoring policy records zero repository vendoring");

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
    contracts.portal_relative_urls_rebased === false &&
    contracts.portal_targets_resolved_to_repository_paths === false &&
    contracts.sibling_context_html_vendored === false &&
    contracts.a11y_or_focus_behavior_modified === false,
  "T19c",
  "materialization contracts complete and all forbidden transformations unrecorded"
);
ok(mat.generation === "MECHANICAL_INLINE_EXTRACTION", "T19d", "generation = MECHANICAL_INLINE_EXTRACTION");
ok(mat.round_trip_evidence?.byte_identical === true && mat.round_trip_evidence?.reconstructed_sha256 === LOCK_SHA256 && mat.round_trip_evidence?.reconstructed_bytes === LOCK_BYTES, "T19e", "recorded round-trip evidence matches the independent reconstruction");

// ---- T20/T21/T22 stage flags and hold state ------------------------------------------------------
console.log("\nStage flags (S4 remains HOLD):");
const manifest = JSON.parse(readTxt(path.join(ROOT, "manifest.json")));
ok(manifest.stages.identity_verified === true && manifest.stages.raw_authority_locked === true && manifest.stages.baseline_captured === true, "T20a", "S0/S1/S2 stages complete");
ok(manifest.stages.mechanical_split_complete === true, "T20b", "mechanical_split_complete=true");
ok(manifest.stages.source_split_parity_pass === false, "T20c", "source_split_parity_pass=false (S4 parity NOT accepted)");
ok(manifest.mechanical_split_ref === "split/materialization.json", "T20d", 'mechanical_split_ref="split/materialization.json"');
ok(manifest.parity_ref === null, "T20e", "parity_ref=null at S3");
ok(manifest.runtime_policy === "HTML_CSS_JS_MECHANICAL_ONLY", "T20f", `runtime policy unchanged (${manifest.runtime_policy})`);
ok(manifest.tsx_allowed_during_split === false, "T20g", "TSX remains forbidden during split");
ok(!fs.existsSync(path.join(ROOT, "evidence", "parity", "accepted-parity.json")), "T20h", "no S4 parity acceptance evidence created at S3");
ok(!fs.existsSync(path.join(ROOT, "parity")), "T20i", "no parity/ capture directory created at S3");
ok(mat.status === "MATERIALIZED_PENDING_PARITY", "T21", "materialization status = MATERIALIZED_PENDING_PARITY");
ok(mat.parity_status === "PENDING_EXACT_HEAD_CAPTURE", "T21b", "parity_status = PENDING_EXACT_HEAD_CAPTURE");
ok(mat.next_stage === "S4_SOURCE_SPLIT_PARITY_HOLD", "T21c", "next_stage = S4_SOURCE_SPLIT_PARITY_HOLD");
ok(manifest.capture_surface?.mode === "CONTEXT_AWARE_ONLY", "T22a", "capture_surface.mode = CONTEXT_AWARE_ONLY");
ok(manifest.capture_surface?.repository_split_surface_runtime_equivalent === false && manifest.capture_surface?.repository_original_surface_runtime_equivalent === false, "T22b", "neither repository surface is claimed as a runtime-equivalent authority surface");
ok(manifest.capture_surface?.shared_harness_disposition?.["capture-source-baseline.mjs"] === "SKIP" && manifest.capture_surface?.shared_harness_disposition?.["capture-source-parity.mjs"] === "SKIP", "T22c", "shared single-executable harnesses SKIP this capsule by disposition");
ok(manifest.capture_surface?.shared_harness_disposition?.skip_reason === "CONTEXT_AWARE_SURFACE_ONLY", "T22d", "SKIP reason = CONTEXT_AWARE_SURFACE_ONLY");
const defects = mat.frozen_defects_preserved ?? {};
ok(defects.D1_FOCUS_FALLS_TO_BODY_ON_WORKS_ROW_VIEWER_CLOSE === "PRESERVED_NOT_FIXED" && defects.D2_MOBILE_MENU_FOCUS_TRAPPED_ON_HIDDEN_MENU_CLOSE === "PRESERVED_NOT_FIXED", "T22e", "frozen defects D1/D2 recorded as preserved, not fixed");
const base = JSON.parse(readTxt(path.join(ROOT, "baseline", "accepted-baseline.json")));
ok(base.status === "ACCEPTED" && base.source_id === "SRC069" && base.authority?.sha256 === LOCK_SHA256 && base.authority?.bytes === LOCK_BYTES, "T22f", "accepted S2 baseline authority agrees with frozen original");

// ---- evidence ----------------------------------------------------------------------------------
const report = {
  schema_version: "1.0",
  source_id: "SRC069",
  stage: "S3_MECHANICAL_SPLIT",
  run_at: new Date().toISOString(),
  authority: { bytes: LOCK_BYTES, sha256: LOCK_SHA256 },
  reconstructed: { bytes: reconstructed.length, sha256: sha256(reconstructed) },
  round_trip: reconstructed.compare(origBuf) === 0,
  boundaries: mat.boundaries,
  outputs: mat.outputs,
  portal_relative_url_preservation: {
    method: "regex extraction of path:'../../...' entries from the authority templates table and from split/script.js, then exact ordered + set comparison",
    authority_portal_count: origPortals.length,
    split_portal_count: jsPortals.length,
    ordered_set_identical: JSON.stringify(origPortals) === JSON.stringify(jsPortals),
    prefixes_rewritten: false,
    targets_resolved_to_repository_paths: false,
    sibling_context_html_vendored: false,
    target_bytes_vendored: 0,
    target_identity_recorded: ctx.portal_targets.length,
    authority_context_ref: "../authority-context.json",
    preservation_invariant: "The exact ordered set of portal relative URL strings in original/original.html equals the exact ordered set in split/script.js, byte for byte."
  },
  s4_executed: false,
  s4_status: "HOLD",
  capture_surface: {
    mode: manifest.capture_surface?.mode ?? null,
    reason: manifest.capture_surface?.reason ?? null,
    required_serving: manifest.capture_surface?.required_serving ?? null,
    shared_harness_disposition: manifest.capture_surface?.shared_harness_disposition ?? null
  },
  passed,
  failed,
  checks,
};
const outDir = path.join(ROOT, "evidence", "s3");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "roundtrip.json"), JSON.stringify(report, null, 2) + "\n");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
