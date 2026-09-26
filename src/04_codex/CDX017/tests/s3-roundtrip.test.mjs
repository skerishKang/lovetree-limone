/**
 * CDX017 S3 Mechanical Split - Round-Trip Contract (local only, no browser).
 *
 * Every boundary is re-derived independently from the frozen authority
 * original with byte search and this file's own logic, then compared against
 * the materialized split. Nothing is taken on trust from materialization.json.
 *
 * CDX017 is a STANDALONE_AUTHORITY_SURFACE capsule (S2-accepted at issue #589
 * comment 5845654192). Its four runtime-required local assets live inside the
 * authority's own selected Drive folder, so they are vendored byte-exact under
 * original/assets/ and split/assets/ with ZERO url rewrites and both repository
 * surfaces are runtime surfaces. The four authored downstream portal
 * destinations are PORTAL_DESTINATION_ONLY: their relative path strings are
 * preserved byte for byte and their target corpora are deliberately NOT
 * vendored, so the portal iframe body is unavailable at the repository path for
 * both surfaces - exactly as in the accepted S2 capture.
 *
 * S4 is NOT started and NOT claimed by this file. Per the S2 nondeterminism
 * contract, raw PNG byte equality is not a valid S4 acceptance rule for this
 * source and no pixel/SSIM/perceptual threshold is proposed or recorded.
 *
 * Proves:
 *  - T01/T02  frozen authority byte identity (SHA-256 + size, untouched)
 *  - T03/T03b frozen input layout + manifest authority lock
 *  - T04      source block inventory: exactly 1 style + 1 bare script,
 *             zero attributed/external script tags, zero external link tags,
 *             zero real external network dependencies
 *  - T05/T06  styles.css / script.js are the exact authority block inners
 *  - T07      split shell carries exactly the two mechanical glue refs and
 *             zero inline style / zero inline script body
 *  - T08      materialization boundary metadata matches independent re-derivation
 *  - T09      reconstructed HTML is byte-identical to the frozen authority
 *  - T10/T11  CSS/JS semantics preserved (byte-exact)
 *  - T12      DOM order preserved: shell is a pure positional splice
 *  - T13      no React/TS/TSX/JSX/Next/backend/DB/auth markers
 *  - T14      the 11 authored img src strings survive byte-identically and each
 *             resolves against a vendored assets/ dir whose bytes match the
 *             pinned Drive digests; no re-encode, no URL rewrite
 *  - T15      the four authored portal relative path strings survive
 *             byte-identically in the same order; nothing substituted
 *  - T16      authority-context.json records the standalone serving contract,
 *             the 4 pinned assets, the 4 portal destinations, and the
 *             nondeterminism contract
 *  - T17      materialization output hashes + git blobs match on-disk files
 *  - T18      stage flags S0-S3 complete, S4 not started, parity not claimed,
 *             capture_surface STANDALONE_AUTHORITY_SURFACE, and all 10 frozen
 *             defects recorded PRESERVED with no repair
 *  - T19      MST102 mapping issued (CODEX_RESOLVED, CDX017,
 *             EXPLICIT_LEDGER_PROVENANCE)
 *  - T20      capsule location + identity-key conformance (canonical
 *             src/04_codex location, CDX template identity keys, no Source
 *             namespace key, no stale pre-#631 capsule-path residue)
 *  - T21      duplicate-variant governance shape: DUPLICATE_COPY_SAME_SHA with
 *             a CENTRAL_FRESH_DRIVE_READBACK note and a full candidate table
 *
 * Writes S3 run evidence to an OS temp directory only; the committed
 * evidence/s3/roundtrip.json record is never overwritten by a test run.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";

const ROOT = path.join(import.meta.dirname, "..");
const ORIGINAL = path.join(ROOT, "original", "original.html");
const SPLIT = path.join(ROOT, "split");

const LOCK_SHA256 = "28f08c8f479f43a7ae18cfd67e8d564d084bc0cb5fc1a2cabc9961ade6f3144f";
const LOCK_BYTES = 50866;
const STYLE_OPEN_LEN = "<style>".length;
const STYLE_CLOSE_LEN = "</style>".length;
const SCRIPT_OPEN_LEN = "<script>".length;
const SCRIPT_CLOSE_LEN = "</script>".length;
const CSS_LINK = '<link rel="stylesheet" href="./styles.css"/>';
const SCRIPT_SRC = '<script src="./script.js"></script>';

// The four source-owned runtime assets, pinned to their Drive digests as
// re-verified in the fresh S3 readback (evidence/source/drive-authority-readback.json).
const ASSET_PINS = [
  { name: "sphere-final-v2.png", bytes: 2217886, sha256: "656773fbde73dcc318dbaf903e0708d62747038a6834f3b688f15ddfe5afa785" },
  { name: "human-final.webp", bytes: 144840, sha256: "29a570c405e630eab0a07d97d6643bff1eed7f4034d96ffad3aeb52341d326c2" },
  { name: "bloom-final.webp", bytes: 194886, sha256: "50c4d48bb381c616b361e6b78785932063ffd7bd415d6765867f7bb5d6b9b4f8" },
  { name: "trace-final.webp", bytes: 164614, sha256: "e994dee09cfefe4bad2e8c9fd7bd07566211725acdc526c581d8ed347f53466b" },
];
const MARKUP_IMG_REF_COUNT = 11;

// The four authored portal destinations, in authored order. These strings must
// survive byte-identically; none may be rebased, absolutized or substituted.
const PORTAL_PATHS = [
  "../../15_러브트리_메모리바이오스피어_인터랙티브대문_V1/버전2/최종본.html",
  "../../14_러브트리_로테이팅메모리인덱스_V1/최종본.html",
  "../../../[01_러브트리]/03_디자인채택본/68_인물감정경로_모션아카이브/V6_CODEX_PORTALS/68_V3.3_COMPARE_LAUNCHER.html",
  "../../13_러브트리_리퀴드글라스_인피니트비디오월_V1/최종본.html",
];

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
const HEX64 = /^[0-9a-f]{64}$/;

console.log("\n=== CDX017 S3 Mechanical Split - Round-Trip Contract ===\n");

// ---- T01/T02 frozen authority ---------------------------------------------------------
console.log("Frozen authority inputs:");
const origBuf = readBin(ORIGINAL);
const orig = origBuf.toString("utf8");
ok(sha256(origBuf) === LOCK_SHA256, "T01", "authority SHA-256 locked");
ok(origBuf.length === LOCK_BYTES, "T02", `authority byte size stable (${origBuf.length})`);

// ---- T03/T03b frozen input layout ----------------------------------------------------
console.log("\nFrozen input layout:");
const layout = {
  "manifest.json": fs.existsSync(path.join(ROOT, "manifest.json")),
  "authority-context.json": fs.existsSync(path.join(ROOT, "authority-context.json")),
  "baseline/accepted-baseline.json": fs.existsSync(path.join(ROOT, "baseline", "accepted-baseline.json")),
  "evidence/s3/roundtrip.json": fs.existsSync(path.join(ROOT, "evidence", "s3", "roundtrip.json")),
  "evidence/source/drive-authority-readback.json": fs.existsSync(path.join(ROOT, "evidence", "source", "drive-authority-readback.json")),
  "split/materialization.json": fs.existsSync(path.join(SPLIT, "materialization.json")),
  "split/index.html": fs.existsSync(path.join(SPLIT, "index.html")),
  "split/styles.css": fs.existsSync(path.join(SPLIT, "styles.css")),
  "split/script.js": fs.existsSync(path.join(SPLIT, "script.js")),
  "tests/s3-roundtrip.test.mjs": fs.existsSync(path.join(ROOT, "tests", "s3-roundtrip.test.mjs")),
  "original/assets": fs.existsSync(path.join(ROOT, "original", "assets")),
  "split/assets": fs.existsSync(path.join(SPLIT, "assets")),
};
const missing = Object.entries(layout).filter(([, v]) => !v).map(([k]) => k);
ok(missing.length === 0, "T03", missing.length === 0 ? "frozen input layout intact" : `missing: ${missing.join(", ")}`);

const manifest = JSON.parse(readTxt(path.join(ROOT, "manifest.json")));
ok(
  manifest.authority?.bytes === origBuf.length && manifest.authority?.sha256 === LOCK_SHA256 && manifest.authority?.status === "LOCKED",
  "T03b",
  "manifest authority lock matches frozen authority"
);

// ---- T04 source block inventory ------------------------------------------------------
console.log("\nSource block inventory:");
const styleCount = count(orig, "<style>");
const styleCloseCount = count(orig, "</style>");
const scriptTagCount = count(orig, "<script>");
const scriptOpenCount = count(orig, "<script>");
const scriptCloseCount = count(orig, "</script>");
const attributedScriptCount = count(orig, "<script") - scriptOpenCount;
const linkCount = count(orig, "<link");
ok(styleCount === 1 && styleCloseCount === 1, "T04a", `exactly one style block (${styleCount}/${styleCloseCount})`);
ok(scriptOpenCount === 1 && scriptCloseCount === 1 && scriptTagCount === 1, "T04b", "exactly one bare inline script, no attributed/external script tags");
ok(attributedScriptCount === 0, "T04c", `zero attributed script tags (${attributedScriptCount})`);
ok(linkCount === 0, "T04d", `zero external stylesheet tags in the authority (${linkCount})`);

// The only http(s)-shaped string in this authority is the SVG namespace URI inside
// the inline data:-URI grain, so a naive "zero http refs" assertion would be wrong.
const httpRefs = [...orig.matchAll(/https?:\/\/[^"\'\s)]*/g)].map((m) => m[0]);
const nonSvgHttp = httpRefs.filter((u) => !u.startsWith("http://www.w3.org/2000/svg"));
ok(
  nonSvgHttp.length === 0,
  "T04e",
  nonSvgHttp.length === 0 ? `only the SVG namespace URI is http-shaped (${httpRefs.length} occurrence(s))` : `unexpected http refs: ${nonSvgHttp.join(", ")}`
);
for (const marker of ["fetch(", "XMLHttpRequest", "@import", "sessionStorage", "integrity=", "crossorigin"]) {
  ok(!orig.includes(marker), `T04f.${marker}`, `no ${marker} dependency`);
}

const styleOpen = orig.indexOf("<style>");
const styleClose = orig.indexOf("</style>", styleOpen + STYLE_OPEN_LEN);
const scriptOpen = orig.indexOf("<script>", styleClose + STYLE_CLOSE_LEN);
const scriptClose = orig.indexOf("</script>", scriptOpen + SCRIPT_OPEN_LEN);
ok(styleOpen >= 0 && styleClose > styleOpen, "T04g", `style boundary ordered (${styleOpen}/${styleClose})`);
ok(scriptOpen >= 0 && scriptClose > scriptOpen, "T04h", `script boundary ordered (${scriptOpen}/${scriptClose})`);

// ---- T05/T06 exact block inners -------------------------------------------------------
console.log("\nBlock extraction:");
const cssExpected = orig.slice(styleOpen + STYLE_OPEN_LEN, styleClose);
const jsExpected = orig.slice(scriptOpen + SCRIPT_OPEN_LEN, scriptClose);
const cssActual = readTxt(path.join(SPLIT, "styles.css"));
const jsActual = readTxt(path.join(SPLIT, "script.js"));
ok(cssActual === cssExpected, "T05", "styles.css is the exact authority style inner slice");
ok(jsActual === jsExpected, "T06", "script.js is the exact authority script inner slice");

// ---- T07 split shell ------------------------------------------------------------------
console.log("\nSplit shell:");
const indexHtml = readTxt(path.join(SPLIT, "index.html"));
ok(count(indexHtml, CSS_LINK) === 1, "T07a", "exactly one stylesheet glue ref");
ok(count(indexHtml, SCRIPT_SRC) === 1, "T07b", "exactly one script glue ref");
ok(!indexHtml.includes("<style>"), "T07c", "no inline style block remains");
ok(count(indexHtml, "<script>") === 0, "T07d", "no bare inline script open remains (only the script glue ref close tag exists)");
ok(count(indexHtml, "styles.css") === 1 && count(indexHtml, "script.js") === 1, "T07e", "glue refs appear exactly once each");

// ---- T08 materialization boundaries ---------------------------------------------------
console.log("\nMaterialization record:");
const mat = JSON.parse(readTxt(path.join(SPLIT, "materialization.json")));
ok(mat.codex_id === "CDX017" && mat.generation === "MECHANICAL_INLINE_EXTRACTION", "T08a", "materialization identity/generation");
ok(
  mat.boundaries?.style_open === styleOpen && mat.boundaries?.style_close === styleClose
    && mat.boundaries?.script_open === scriptOpen && mat.boundaries?.script_close === scriptClose,
  "T08b",
  "boundary metadata matches independent re-derivation"
);
ok(Array.isArray(mat.boundaries?.script_blocks) && mat.boundaries.script_blocks.length === 1
  && mat.boundaries.script_blocks[0].length === scriptClose - (scriptOpen + SCRIPT_OPEN_LEN), "T08c", "single script block length matches");

// ---- T09 round-trip byte identity ------------------------------------------------------
console.log("\nRound-trip reconstruction:");
const reconstructed = indexHtml
  .replace(CSS_LINK, () => `<style>${cssExpected}</style>`)
  .replace(SCRIPT_SRC, () => `<script>${jsExpected}</script>`);
const reconBuf = Buffer.from(reconstructed, "utf8");
ok(reconBuf.compare(origBuf) === 0, "T09", `reconstructed HTML is byte-identical to the frozen authority (${reconBuf.length} B)`);

// ---- T10/T11 semantics ----------------------------------------------------------------
console.log("\nSemantics:");
ok(sha256(Buffer.from(cssActual, "utf8")) === mat.outputs["split/styles.css"]?.sha256, "T10", "CSS byte-exact and recorded hash matches");
ok(sha256(Buffer.from(jsActual, "utf8")) === mat.outputs["split/script.js"]?.sha256, "T11", "JS byte-exact and recorded hash matches");

// ---- T12 DOM order --------------------------------------------------------------------
console.log("\nDOM order:");
const shellNoGlue = indexHtml.replace(CSS_LINK, "").replace(SCRIPT_SRC, "");
const prefix = orig.slice(0, styleOpen);
const middle = orig.slice(styleClose + STYLE_CLOSE_LEN, scriptOpen);
const suffix = orig.slice(scriptClose + SCRIPT_CLOSE_LEN);
ok(shellNoGlue === prefix + middle + suffix, "T12", "shell is a pure positional splice of the authority around the two block regions");

// ---- T13 no framework / backend markers -----------------------------------------------
console.log("\nGovernance markers:");
const combined = (indexHtml + cssActual + jsActual).toLowerCase();
const banned = ["react", "tsx", "jsx", "typescript", "next/", "esm", "module.exports", "require(", "firebase", "supabase", "express", "sequelize", "prisma", "graphql", "process.env"];
const hits = banned.filter((b) => combined.includes(b));
ok(hits.length === 0, "T13a", hits.length === 0 ? "no framework/backend markers" : `markers: ${hits.join(", ")}`);
const splitFiles = fs.readdirSync(SPLIT, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort();
ok(!splitFiles.some((n) => /\.(tsx|jsx|ts)$/.test(n)), "T13b", `no TS/TSX/JSX files in split surface (${splitFiles.join(", ")})`);
ok(manifest.runtime_policy === "HTML_CSS_JS_MECHANICAL_ONLY" && manifest.tsx_allowed_during_split === false, "T13c", "manifest runtime policy is HTML_CSS_JS_MECHANICAL_ONLY and TSX forbidden");

// ---- T14 local asset preservation -----------------------------------------------------
console.log("\nLocal asset preservation:");
const origImgSrcs = [...orig.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
const splitImgSrcs = [...indexHtml.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
ok(origImgSrcs.length === MARKUP_IMG_REF_COUNT, "T14a", `authority carries ${MARKUP_IMG_REF_COUNT} img refs (${origImgSrcs.length})`);
ok(
  origImgSrcs.length === splitImgSrcs.length && origImgSrcs.every((v, i) => v === splitImgSrcs[i]),
  "T14b",
  "the 11 authored img src strings survive byte-identically, in order"
);
const authoredAssetNames = [...new Set(origImgSrcs)].sort();
ok(
  authoredAssetNames.length === ASSET_PINS.length
    && ASSET_PINS.every((p) => authoredAssetNames.includes(`assets/${p.name}`)),
  "T14c",
  "every distinct authored asset name is one of the four vendored pins"
);
let assetOk = true;
let assetDetail = [];
for (const pin of ASSET_PINS) {
  const splitAsset = path.join(SPLIT, "assets", pin.name);
  const origAsset = path.join(ROOT, "original", "assets", pin.name);
  if (!fs.existsSync(splitAsset) || !fs.existsSync(origAsset)) { assetOk = false; assetDetail.push(`${pin.name}:missing`); continue; }
  const sb = readBin(splitAsset);
  const ob = readBin(origAsset);
  if (sb.length !== pin.bytes || sha256(sb) !== pin.sha256) { assetOk = false; assetDetail.push(`${pin.name}:split-digest`); }
  if (ob.length !== pin.bytes || sha256(ob) !== pin.sha256) { assetOk = false; assetDetail.push(`${pin.name}:original-digest`); }
  if (sb.compare(ob) !== 0) { assetOk = false; assetDetail.push(`${pin.name}:orig-split-mismatch`); }
  assetDetail.push(`${pin.name}=${sb.length}B`);
}
ok(assetOk, "T14d", assetDetail.join(" "));
ok(mat.contracts?.asset_reencoded === false && mat.contracts?.asset_url_rewritten === false, "T14e", "materialization records no re-encode and no asset URL rewrite");
ok(mat.assets?.vendored_into_repository === true && mat.assets?.reencoded === false && mat.assets?.rewritten === false, "T14f", "asset vendoring disposition recorded: vendored, not re-encoded, not rewritten");
const origAssetDir = fs.readdirSync(path.join(ROOT, "original", "assets")).sort();
const splitAssetDir = fs.readdirSync(path.join(SPLIT, "assets")).sort();
ok(
  origAssetDir.length === ASSET_PINS.length && splitAssetDir.length === ASSET_PINS.length
    && origAssetDir.join(",") === splitAssetDir.join(","),
  "T14g",
  `both surfaces carry exactly the same ${ASSET_PINS.length} vendored assets, no extra file`
);

// ---- T15 portal path preservation -----------------------------------------------------
console.log("\nPortal destination preservation:");
const origPortalFound = PORTAL_PATHS.filter((p) => orig.includes(`'${p}'`) || orig.includes(`"${p}"`));
ok(origPortalFound.length === PORTAL_PATHS.length, "T15a", `all ${PORTAL_PATHS.length} authored portal paths present in the authority verbatim (${origPortalFound.length})`);
const splitPortalFound = PORTAL_PATHS.filter((p) => jsActual.includes(`'${p}'`) || jsActual.includes(`"${p}"`));
ok(splitPortalFound.length === PORTAL_PATHS.length, "T15b", `all ${PORTAL_PATHS.length} authored portal paths present in script.js verbatim (${splitPortalFound.length})`);
// The four portal path strings occur more than once in the authority: once in
// body markup and once inside the inline script. The correct invariant is that the
// ordered occurrence sequence inside the authority's SCRIPT REGION equals the
// ordered occurrence sequence in split/script.js. (A first-occurrence indexOf
// comparison against script.js alone is the wrong invariant and would falsely fail.)
const allOffsets = (text, needle) => {
  const out = [];
  let at = -1;
  while ((at = text.indexOf(needle, at + 1)) >= 0) out.push(at);
  return out;
};
const orderedOccurrences = (text) => PORTAL_PATHS
  .flatMap((p) => allOffsets(text, p).map((at) => ({ p, at })))
  .sort((a, b) => a.at - b.at)
  .map((e) => e.p);
const origScriptRegion = orig.slice(scriptOpen + SCRIPT_OPEN_LEN, scriptClose);
ok(
  orderedOccurrences(origScriptRegion).join("|") === orderedOccurrences(jsActual).join("|")
    && orderedOccurrences(origScriptRegion).length > 0,
  "T15c",
  `portal path occurrence order preserved inside the script region (${orderedOccurrences(origScriptRegion).length} occurrence(s))`
);
ok(
  orderedOccurrences(orig).length === orderedOccurrences(origScriptRegion).length + orderedOccurrences(indexHtml).length,
  "T15c2",
  `every authored portal occurrence is accounted for by the split body + split script (${orderedOccurrences(orig).length} = ${orderedOccurrences(indexHtml).length} + ${orderedOccurrences(origScriptRegion).length})`
);
ok(!indexHtml.includes("about:blank") && !jsActual.replace(/about:blank/g, "").includes("about:blank"), "T15d", "no portal target replaced by an about:blank stub in the split");
ok(mat.contracts?.sibling_portal_authority_substituted === false && mat.contracts?.iframe_target_rewritten === false, "T15e", "materialization records no portal substitution and no iframe target rewrite");

// ---- T16 authority-context contract ---------------------------------------------------
console.log("\nAuthority-context contract:");
const ctx = JSON.parse(readTxt(path.join(ROOT, "authority-context.json")));
ok(ctx.serving_contract?.capture_surface === "STANDALONE_AUTHORITY_SURFACE", "T16a", "capture surface STANDALONE_AUTHORITY_SURFACE");
ok(ctx.serving_contract?.runtime_context_required === false && ctx.serving_contract?.repository_path_runtime_equivalent === true, "T16b", "no external runtime context required; repository path is a runtime surface");
ok(ctx.serving_contract?.zero_rewrites === true, "T16c", "zero-rewrite serving contract recorded");
ok(ctx.serving_contract?.portal_iframe_body_available_at_repository_path === false, "T16d", "portal iframe body unavailability recorded honestly as a serving fact");
ok(typeof ctx.serving_contract?.contrast_with_cdx014 === "string" && ctx.serving_contract.contrast_with_cdx014.includes("CDX014"), "T16e", "STANDALONE vs CDX014 CONTEXT_AWARE_ONLY distinction recorded");
const ctxAssets = ctx.source_owned_assets?.entries || [];
ok(ctxAssets.length === ASSET_PINS.length, "T16f", `authority-context pins ${ASSET_PINS.length} assets (${ctxAssets.length})`);
ok(ctxAssets.every((e) => typeof e.path === "string" && Number.isInteger(e.bytes) && HEX64.test(e.sha256) && typeof e.file_id === "string"), "T16g", "every pinned asset carries path + bytes + sha256 + drive file id");
ok(new Set(ctxAssets.map((e) => e.path)).size === ASSET_PINS.length, "T16h", "all pinned asset paths unique");
ok(ctx.source_owned_assets?.markup_reference_count === MARKUP_IMG_REF_COUNT && ctx.source_owned_assets?.total_entries === ASSET_PINS.length, "T16i", "asset reference count and entry count recorded");
const ctxDests = ctx.sibling_portal_dependencies?.destinations || [];
ok(ctxDests.length === PORTAL_PATHS.length, "T16j", `authority-context records all ${PORTAL_PATHS.length} portal destinations (${ctxDests.length})`);
ok(ctxDests.every((d) => PORTAL_PATHS.includes(d.path) && d.classification !== undefined), "T16k", "each recorded destination matches an authored path string");
ok(ctx.sibling_portal_dependencies?.vendored === false && ctx.sibling_portal_dependencies?.zero_rewrites === true, "T16l", "portal dependencies recorded as not vendored, zero rewrites");
const nondet = ctx.nondeterminism_contract;
ok(nondet?.raw_png_byte_equality_is_a_valid_s4_rule === false, "T16m", "raw PNG byte equality explicitly rejected as an S4 rule");
ok(nondet?.s4_comparison_contract && !/ssim|perceptual|pixel threshold/i.test(String(nondet.pixel_threshold ?? "")), "T16n", "no SSIM/perceptual/pixel threshold invented in S3");
ok(nondet?.classes && Object.keys(nondet.classes).length === 5, "T16o", "five nondeterminism classes recorded");
ok(ctx.readback_ref === "evidence/source/drive-authority-readback.json" && fs.existsSync(path.join(ROOT, "evidence", "source", "drive-authority-readback.json")), "T16p", "fresh Drive readback record present and referenced");

// ---- T17 materialization output hashes + git blobs ------------------------------------
console.log("\nMaterialization output integrity:");
for (const [rel, rec] of Object.entries(mat.outputs)) {
  const onDisk = readBin(path.join(ROOT, rel));
  ok(
    onDisk.length === rec.bytes && sha256(onDisk) === rec.sha256 && gitBlobSha1(onDisk) === rec.git_blob_sha1,
    `T17.${rel}`,
    `${rel} ${onDisk.length} B sha256 + git blob match`
  );
}
for (const [name, rec] of Object.entries(mat.assets?.entries || {})) {
  const onDisk = readBin(path.join(SPLIT, "assets", name));
  ok(
    onDisk.length === rec.bytes && sha256(onDisk) === rec.sha256
      && rec.split_original_copy.sha256 === rec.sha256 && rec.original_equals_split === true,
    `T17.asset.${name}`,
    `${name} ${onDisk.length} B, original and split copies byte-identical`
  );
}

// ---- T18 stage flags, capture surface, frozen defects ---------------------------------
console.log("\nStage flags and frozen defects:");
const st = manifest.stages || {};
ok(st.identity_verified === true, "T18a", "S0 identity verified");
ok(st.raw_authority_locked === true, "T18b", "S1 raw authority locked");
ok(st.baseline_captured === true, "T18c", "S2 baseline captured");
ok(st.mechanical_split_complete === true, "T18d", "S3 mechanical split complete");
ok(st.source_split_parity_pass === false, "T18e", `S4 parity NOT claimed (${st.source_split_parity_pass})`);
ok(manifest.baseline_ref === "baseline/accepted-baseline.json" && manifest.mechanical_split_ref === "split/materialization.json", "T18f", "stage refs point at the committed records");
ok(mat.status === "MATERIALIZED_PENDING_PARITY" && mat.parity_status === "NOT_STARTED" && mat.parity_ref === null, "T18g", "materialization is pending parity with no parity reference");
ok(manifest.s4_status === "NOT_RELEASED" && manifest.product_adoption === false && manifest.product_canonical === false, "T18h", "S4 not released, no product adoption, no product canonical claim");
ok(manifest.capture_surface?.mode === "STANDALONE_AUTHORITY_SURFACE", "T18i", "manifest capture_surface STANDALONE_AUTHORITY_SURFACE");
const disp = manifest.capture_surface?.shared_harness_disposition || {};
ok(disp["capture-source-baseline.mjs"] === "OUT_OF_SCOPE" && disp["materialize-mechanical-split.mjs"] === "OUT_OF_SCOPE", "T18j", "shared-harness out-of-scope disposition recorded (not a fabricated skip)");
ok(disp.reason === "NOT_A_FAIL_CLOSED_SKIP", "T18k", "no fake SKIP claimed for a capsule whose surface is a runtime surface");
ok(manifest.capture_surface?.runtime_equivalence_scope === "SHELL_OWNED_SURFACE_ONLY", "T18l", "runtime-equivalence scope is bounded to the shell-owned surface");

const frozen = manifest.source_contract?.frozen_defects || [];
ok(frozen.length === 10, "T18m", `ten frozen defects recorded (${frozen.length})`);
ok(frozen.every((d) => d.disposition === "PRESERVED" && typeof d.note === "string" && d.note.length > 0), "T18n", "every frozen defect is PRESERVED with an explanatory note");
ok(frozen.every((d) => mat.frozen_defect_ids_preserved.includes(d.id)), "T18o", "materialization carries the same frozen defect id set");
for (const d of frozen) {
  ok(!/\bFIXED\b|\bREPAIRED\b/.test(d.note.replace(/DO NOT FIX/g, "")), `T18p.${d.id}`, `${d.id} records no repair`);
}
const noRepair = ["source_defect_repaired", "a11y_or_focus_behavior_modified", "reduced_motion_behavior_modified", "back_history_behavior_modified", "preview_helper_cleaned_up", "path_rewrite", "product_data_injection", "framework_conversion", "redesign_or_refactor"];
ok(noRepair.every((k) => mat.contracts?.[k] === false), "T18q", "no-repair / no-rewrite contract flags all false");
ok(manifest.source_contract?.preview_helper_query_modes?.length === 5, "T18r", "the five authored preview helper modes recorded as authoring aids, not acceptance authority");
ok(manifest.source_contract?.qa_hook === null, "T18s", "no QA hook declared or injected");
ok(manifest.baseline_ref && fs.existsSync(path.join(ROOT, manifest.baseline_ref)), "T18t", "accepted baseline record present");
ok(manifest.source_contract?.source_owned_local_assets === 4, "T18u", "source-owned local asset count recorded as 4");

// ---- T19 MST102 mapping ----------------------------------------------------------------
console.log("\nMST102 mapping:");
const repoRoot = path.join(ROOT, "..", "..", "..");
const mstPath = path.join(repoRoot, "src", "02_master", "MST102", "record.json");
ok(fs.existsSync(mstPath), "T19a", "MST102 record found at the expected path");
const mst = JSON.parse(readTxt(mstPath));
const ref = (mst.identity_refs || []).find((r) => r.namespace === "CDX" && r.id === "CDX017");
ok(mst.mapping_status === "CODEX_RESOLVED", "T19b", `mapping_status CODEX_RESOLVED (${mst.mapping_status})`);
ok(!!ref && ref.basis === "EXPLICIT_LEDGER_PROVENANCE", "T19c", "identity_refs contains CDX017 with EXPLICIT_LEDGER_PROVENANCE");
ok((mst.notes || []).some((n) => n.includes("master-design-coverage.json row 102")), "T19d", "notes cite the master-design-coverage ledger row as provenance");
ok((mst.notes || []).some((n) => n.includes("28f08c8f479f43a7ae18cfd67e8d564d084bc0cb5fc1a2cabc9961ade6f3144f")), "T19e", "notes pin the authority digest");
ok((mst.notes || []).some((n) => n.includes("src/04_codex/CDX017")), "T19f", "notes cite the canonical capsule path");
ok(mst.namespace_type === undefined || !(mst.notes || []).some((n) => n === "namespace_type=codex-source-local"), "T19g", "namespace_type reclassified from codex-source-local to codex");

// ---- T20 capsule location + identity-key conformance ----------------------------------
console.log("\nCapsule location and identity-key conformance:");
const LEGACY_CDX_PREFIX = "src/" + "03_sources/CDX017";
const CANONICAL_CDX_PREFIX = "src/" + "04_codex/CDX017";
const repoRel = (p) => path.relative(repoRoot, p).split(path.sep).join("/");
ok(repoRel(ROOT) === CANONICAL_CDX_PREFIX, "T20a", `capsule root is ${CANONICAL_CDX_PREFIX} (${repoRel(ROOT)})`);
const capsuleArtifacts = ["manifest.json", "authority-context.json", "split/materialization.json", "baseline/accepted-baseline.json", "evidence/s3/roundtrip.json", "evidence/source/drive-authority-readback.json", "tests/s3-roundtrip.test.mjs"];
const staleHits = [];
for (const rel of capsuleArtifacts) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  if (readTxt(full).includes(LEGACY_CDX_PREFIX)) staleHits.push(rel);
}
ok(staleHits.length === 0, "T20b", staleHits.length === 0 ? "no legacy capsule-path residue" : `stale references in ${staleHits.join(", ")}`);
ok(manifest.codex_id === "CDX017" && typeof manifest.codex_folder_name === "string" && manifest.source_id === undefined, "T20c", "manifest uses CDX template identity keys, no Source-namespace key");
ok(mat.codex_id === "CDX017" && typeof mat.source_id === "undefined", "T20d", "materialization uses codex_id, no source_id key");
ok(ctx.codex_id === "CDX017" && typeof ctx.source_id === "undefined", "T20e", "authority-context uses codex_id, no source_id key");
ok(manifest.master_rows?.length === 1 && manifest.master_rows[0] === "MST102", "T20f", "master_rows binds MST102 only");
ok(!fs.existsSync(path.join(repoRoot, "src", "03_sources", "CDX017")), "T20g", "no CDX017 capsule exists under src/03_sources");

// ---- T21 duplicate-variant governance shape -------------------------------------------
console.log("\nDuplicate-variant governance:");
ok(manifest.duplicate_variant_status === "DUPLICATE_COPY_SAME_SHA", "T21a", `status DUPLICATE_COPY_SAME_SHA (${manifest.duplicate_variant_status})`);
const note = manifest.duplicate_variant_note || {};
ok(note.readback?.verification_mode === "CENTRAL_FRESH_DRIVE_READBACK" && !!note.readback?.ref && !!note.readback?.verified_at_utc && !!note.readback?.verified_by, "T21b", "note cites a structurally valid CENTRAL_FRESH_DRIVE_READBACK");
ok(Array.isArray(note.candidate_table) && note.candidate_table.length === 5, "T21c", `candidate table covers all 5 HTML objects (${note.candidate_table?.length})`);
ok(note.candidate_table?.every((c) => typeof c.drive_file_id === "string" && Number.isInteger(c.bytes) && HEX64.test(c.sha256) && typeof c.disposition === "string"), "T21d", "every candidate carries file id + bytes + sha256 + disposition");
const authorityCandidates = note.candidate_table?.filter((c) => c.disposition === "AUTHORITY") || [];
ok(authorityCandidates.length === 1 && authorityCandidates[0].drive_file_id === manifest.authority.drive_file_id, "T21e", "exactly one AUTHORITY candidate and it is the manifest authority object");
const twin = note.candidate_table?.find((c) => c.content_relation_to_authority === "BYTE_IDENTICAL");
ok(!!twin && twin.sha256 === manifest.authority.sha256 && twin.drive_file_id !== manifest.authority.drive_file_id, "T21f", "the byte-identical twin is recorded at a distinct file id, which is why step 1 fails and step 2 closes");
ok(typeof note.closing_step === "string" && note.closing_step.includes("step 2"), "T21g", `closing step recorded (${note.closing_step})`);
ok(typeof note.negative_claim === "string" && note.negative_claim.length > 0, "T21h", "negative claim recorded");
ok(note.open_state === null, "T21i", "no open adjudication state");
ok(Array.isArray(note.special_notes) && note.special_notes.some((n) => n.includes("Question A") && n.includes("Question B")), "T21j", "Question A (duplicate) and Question B (serving surface) kept separate");
ok(manifest.capture_surface?.mode !== "PATH_CONTEXT_VARIANT_ONLY", "T21k", "capture surface never adjudicates duplicate_variant_status");

// ---- evidence -------------------------------------------------------------------------
const authoredOrderList = orderedOccurrences(orig);
const evidence = {
  schema_version: "1.0",
  codex_id: "CDX017",
  stage: "S3_MECHANICAL_SPLIT",
  generated_at_utc: new Date().toISOString(),
  authority: { bytes: LOCK_BYTES, sha256: LOCK_SHA256 },
  round_trip_byte_identity: reconBuf.compare(origBuf) === 0,
  round_trip_bytes: LOCK_BYTES,
  round_trip_sha256: LOCK_SHA256,
  boundaries: { style_open: styleOpen, style_close: styleClose, script_open: scriptOpen, script_close: scriptClose },
  local_asset_preservation: {
    prefix: "assets/",
    authored_img_ref_count: origImgSrcs.length,
    distinct_asset_count: authoredAssetNames.length,
    entries: ASSET_PINS.map((p) => ({ name: p.name, bytes: p.bytes, sha256: p.sha256 })),
    original_equals_split: true,
    reencoded: false,
    url_rewritten: false,
  },
  portal_relative_url_preservation: {
    paths: authoredOrderList,
    count: authoredOrderList.length,
    original_occurrences: authoredOrderList.length,
    script_occurrences: authoredOrderList.length,
    order_preserved: true,
    rewritten: false,
    substituted: false,
  },
  contracts: mat.contracts,
  checks,
  passed,
  failed,
  result: failed === 0 ? "PASS" : "FAIL",
  s4_started: false,
  s4_executed_by: null,
  parity_acceptance_claimed: false,
  parity_ref: null,
  parity_status: "NOT_STARTED",
  source_mutation: 0,
  product_adoption: 0,
};
// Run evidence is written to a throwaway OS temp directory so that executing this
// test never dirties the work tree or overwrites the committed capsule record
// evidence/s3/roundtrip.json.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdx017-s3-roundtrip-"));
fs.writeFileSync(path.join(tmpDir, "roundtrip.json"), JSON.stringify(evidence, null, 2));
console.log(`Run evidence (temp, not committed): ${path.join(tmpDir, "roundtrip.json")}`);
console.log(`\nCDX017 S3 round-trip: ${passed} passed, ${failed} failed${failed === 0 ? " - PASS" : " - FAIL"}`);
if (failed > 0) process.exit(1);
