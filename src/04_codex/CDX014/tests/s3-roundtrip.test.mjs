/**
 * CDX014 S3 Mechanical Split — Round-Trip Contract (local only, no browser).
 *
 * Context-aware CLEAN-108 flow. Every boundary is re-derived independently
 * from the frozen authority original with byte search and this file's own
 * logic, then compared against the materialized split.
 *
 * CDX014 is a path-context-sensitive Source (SRC069-class, Drive-rename
 * variant). Its runtime media prefix ../12_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/
 * refers to the AUTHORING-TIME sibling name; the live Drive sibling was
 * renamed to 12-1_… on 2026-08-17. Neither original/original.html nor
 * split/index.html is a valid runtime surface at its repository path. That
 * fact is recorded in the capsule (capture_surface.mode = CONTEXT_AWARE_ONLY)
 * and the shared single-executable baseline/parity harnesses SKIP this
 * capsule by explicit disposition. S4 parity was executed by the standalone
 * context-aware harness (s4-context-parity.test.mjs) and accepted by CENTRAL
 * at issue #589 comment 5557368158 under tier
 * STRUCTURAL_PARITY_DETERMINISM_ENVELOPE; the shared-harness SKIP itself is
 * unchanged and still valid.
 *
 * Proves:
 *  - T01/T02  frozen authority byte identity (SHA-256 + size, untouched)
 *  - T03/T03b frozen input layout + manifest authority lock
 *  - T04      source block inventory: exactly 1 style + 1 bare script,
 *             zero attributed/external script tags, zero http(s) refs
 *  - T05/T06  styles.css / script.js are the exact authority block inners
 *  - T07      split shell carries exactly the two mechanical glue refs and
 *             zero inline style / zero inline script body
 *  - T08      materialization boundary metadata matches independent re-derivation
 *  - T09      reconstructed HTML is byte-identical to the frozen authority
 *  - T10/T11  CSS/JS semantics preserved (byte-exact)
 *  - T12      DOM order preserved: shell is a pure positional splice
 *  - T13      no React/TS/TSX/JSX/Next/ESM, no backend/DB/auth markers,
 *             no product/MVP/adapter wiring
 *  - T14      the media prefix survives unchanged, byte for byte, and is
 *             NOT rebased/rewritten; no split/assets directory exists
 *  - T15      authority-context.json records all 178 media entries pinned
 *             (path/bytes/SHA256), no media byte vendored; the 6 S2
 *             mirror-fidelity sample pins are present exactly
 *  - T16      materialization output hashes match on-disk files + git blobs
  *  - T17      stage flags: S0-S4 complete, parity_ref set to the accepted
  *             artifact, capture_surface CONTEXT_AWARE_ONLY, shared-harness
  *             SKIP disposition present, frozen defect D1 preserved
 *  - T18      MST080 mapping issued (CODEX_RESOLVED, CDX014,
 *             EXPLICIT_LEDGER_PROVENANCE)
 *  - T19      capsule location + identity-key conformance: canonical
 *             src/04_codex location (PR #631 CODEX phase governance,
 *             namespaces.json codex_rule), CDX template identity keys
 *             (codex_id / codex_folder_name, no Source-namespace key), and
 *             zero residue of the pre-#631 src/03_sources capsule prefix
 *
 * Writes evidence/s3/roundtrip.json as S3 run evidence.
 * S4 is not executed by this file; it is executed by s4-context-parity.test.mjs.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.join(import.meta.dirname, "..");
const ORIGINAL = path.join(ROOT, "original", "original.html");
const SPLIT = path.join(ROOT, "split");

const LOCK_SHA256 = "0cef6497103d05a853c4849d58967bed66e3af85db5e345a69724b2d26719361";
const LOCK_BYTES = 19631;
const STYLE_OPEN_LEN = "<style>".length;
const STYLE_CLOSE_LEN = "</style>".length;
const SCRIPT_OPEN_LEN = "<script>".length;
const SCRIPT_CLOSE_LEN = "</script>".length;
const CSS_LINK = '<link rel="stylesheet" href="./styles.css"/>';
const SCRIPT_SRC = '<script src="./script.js"></script>';
const MEDIA_PREFIX = "../12_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/";
const MEDIA_ENTRY_COUNT = 178;

// Six sample pins from the accepted S2 mirror-fidelity record (Drive-stream
// SHA256 == mirror SHA256 verified during S2). Used as the spot-recompute
// proof against the pinned authority-context entries.
const S2_SAMPLE_PINS = [
  { path: "12-1_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/videos-v3/v3-053.mp4", bytes: 80084036, sha256: "010e2b7fe532897d003fbe69b52ed30d49f4448ebca1a3c677d736c8f1fceb1b" },
  { path: "12-1_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/videos-v3/v3-015.mp4", bytes: 17179964, sha256: "22a37f31195005bb36548eb886ca79ddd1306a737edaa9b526b6edd1e91e7e69" },
  { path: "12-1_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/videos-v3/v3-052.mp4", bytes: 50353976, sha256: "6b1c0951059330a50a53f266c7dc8e591daef2127ffc9d91d05b38829cdc3275" },
  { path: "12-1_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/posters-v3/poster-059.jpg", bytes: 23647, sha256: "f028f12107a842a7a964f5088b3e6a3c509e66a60e07cf8454aa344fc5b1f3e5" },
  { path: "12-1_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/posters-v3/poster-003.jpg", bytes: 15088, sha256: "f0a68af9f00de5cb803a379207fc175ec3b18d3730bcad1005c782a2ed22e1a3" },
  { path: "12-1_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/posters-v3/poster-035.jpg", bytes: 22712, sha256: "4c3b02e12c229698a354d9a877a67a82607a78bbbb0925c7a12de85da3d37313" },
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
const unique = (arr) => [...new Set(arr)];
const HEX64 = /^[0-9a-f]{64}$/;

console.log("\n=== CDX014 S3 Mechanical Split - Round-Trip Contract ===\n");

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
  "authority-context.json": fs.existsSync(path.join(ROOT, "authority-context.json")),
  "baseline/accepted-baseline.json": fs.existsSync(path.join(ROOT, "baseline", "accepted-baseline.json")),
  "original/original.html": fs.existsSync(ORIGINAL),
  "split/index.html": fs.existsSync(path.join(SPLIT, "index.html")),
  "split/styles.css": fs.existsSync(path.join(SPLIT, "styles.css")),
  "split/script.js": fs.existsSync(path.join(SPLIT, "script.js")),
  "split/materialization.json": fs.existsSync(path.join(SPLIT, "materialization.json")),
  "tests/s3-roundtrip.test.mjs": fs.existsSync(path.join(ROOT, "tests", "s3-roundtrip.test.mjs")),
};
const missing = Object.entries(layout).filter(([, v]) => !v).map(([k]) => k);
ok(missing.length === 0, "T03", missing.length === 0 ? "frozen input layout intact" : `missing: ${missing.join(", ")}`);
const manifest = JSON.parse(readTxt(path.join(ROOT, "manifest.json")));
ok(
  manifest.authority?.bytes === LOCK_BYTES && manifest.authority?.sha256 === LOCK_SHA256 && manifest.authority?.status === "LOCKED",
  "T03b",
  "manifest authority lock matches frozen authority"
);

// ---- T04 block inventory (independent re-derivation) -------------------------------
console.log("\nSource block inventory:");
const styleCount = count(orig, "<style>");
const styleCloseCount = count(orig, "</style>");
const scriptTagCount = count(orig, "<script");
const scriptOpenCount = count(orig, "<script>");
const scriptCloseCount = count(orig, "</script>");
ok(styleCount === 1 && styleCloseCount === 1, "T04a", `exactly one style block (${styleCount}/${styleCloseCount})`);
ok(scriptOpenCount === 1 && scriptTagCount === 1 && scriptCloseCount === 1, "T04b", "exactly one bare inline script, no attributed/external script tags");
const httpRefs = (orig.match(/https?:\/\//g) || []).length;
ok(httpRefs === 0, "T04c", `zero http(s) references (${httpRefs})`);

const styleOpen = orig.indexOf("<style>");
const styleClose = orig.indexOf("</style>", styleOpen + STYLE_OPEN_LEN);
const scriptOpen = orig.indexOf("<script>", styleClose + STYLE_CLOSE_LEN);
const scriptClose = orig.indexOf("</script>", scriptOpen + SCRIPT_OPEN_LEN);
ok(styleOpen >= 0 && styleClose > styleOpen, "T04d", "style boundary ordered");
ok(scriptOpen >= 0 && scriptClose > scriptOpen, "T04e", "script boundary ordered");

// ---- T05/T06 exact block inners -----------------------------------------------------
console.log("\nBlock extraction:");
const cssExpected = orig.slice(styleOpen + STYLE_OPEN_LEN, styleClose);
const jsExpected = orig.slice(scriptOpen + SCRIPT_OPEN_LEN, scriptClose);
const cssActual = readTxt(path.join(SPLIT, "styles.css"));
const jsActual = readTxt(path.join(SPLIT, "script.js"));
ok(cssActual === cssExpected, "T05", "styles.css is the exact authority style inner slice");
ok(jsActual === jsExpected, "T06", "script.js is the exact authority script inner slice");

// ---- T07 split shell ----------------------------------------------------------------
console.log("\nSplit shell:");
const indexHtml = readTxt(path.join(SPLIT, "index.html"));
ok(count(indexHtml, CSS_LINK) === 1, "T07a", "exactly one stylesheet glue ref");
ok(count(indexHtml, SCRIPT_SRC) === 1, "T07b", "exactly one script glue ref");
ok(!indexHtml.includes("<style>"), "T07c", "no inline style block remains");
ok(count(indexHtml, "<script>") === 0, "T07d", "no bare inline script open remains (only the script glue ref close tag exists)");
ok(count(indexHtml, "styles.css") === 1 && count(indexHtml, "script.js") === 1, "T07e", "glue refs appear exactly once each");

// ---- T08 materialization boundaries -------------------------------------------------
console.log("\nMaterialization record:");
const mat = JSON.parse(readTxt(path.join(SPLIT, "materialization.json")));
ok(mat.codex_id === "CDX014" && mat.generation === "MECHANICAL_INLINE_EXTRACTION", "T08a", "materialization identity/generation");
ok(
  mat.boundaries?.style_open === styleOpen && mat.boundaries?.style_close === styleClose
    && mat.boundaries?.script_open === scriptOpen && mat.boundaries?.script_close === scriptClose,
  "T08b",
  "boundary metadata matches independent re-derivation"
);

// ---- T09 round-trip byte identity ---------------------------------------------------
console.log("\nRound-trip reconstruction:");
const reconstructed = indexHtml
  .replace(CSS_LINK, () => `<style>${cssExpected}</style>`)
  .replace(SCRIPT_SRC, () => `<script>${jsExpected}</script>`);
const reconBuf = Buffer.from(reconstructed, "utf8");
ok(reconBuf.compare(origBuf) === 0, "T09", "reconstructed HTML is byte-identical to the frozen authority");

// ---- T10/T11 semantics --------------------------------------------------------------
console.log("\nSemantics:");
ok(sha256(Buffer.from(cssActual, "utf8")) === mat.outputs["split/styles.css"]?.sha256, "T10", "CSS byte-exact and recorded hash matches");
ok(sha256(Buffer.from(jsActual, "utf8")) === mat.outputs["split/script.js"]?.sha256, "T11", "JS byte-exact and recorded hash matches");

// ---- T12 DOM order ------------------------------------------------------------------
console.log("\nDOM order:");
const shellNoGlue = indexHtml.replace(CSS_LINK, "").replace(SCRIPT_SRC, "");
const prefix = orig.slice(0, styleOpen);
const middle = orig.slice(styleClose + STYLE_CLOSE_LEN, scriptOpen);
const suffix = orig.slice(scriptClose + SCRIPT_CLOSE_LEN);
ok(shellNoGlue === prefix + middle + suffix, "T12", "shell is a pure positional splice of the authority around the two block regions");

// ---- T13 no framework/backend markers ----------------------------------------------
console.log("\nGovernance markers:");
const combined = indexHtml + cssActual + jsActual;
const banned = ["react", "tsx", "jsx", "typescript", "next/", "esm", "module.exports", "require(", "firebase", "supabase", "express", "sequelize", "prisma", "graphql"];
const hits = banned.filter((b) => combined.toLowerCase().includes(b));
ok(hits.length === 0, "T13", hits.length === 0 ? "no framework/backend markers" : `markers: ${hits.join(", ")}`);

// ---- T14 media prefix preservation --------------------------------------------------
console.log("\nMedia context:");
const origPrefixCount = count(orig, MEDIA_PREFIX);
const jsPrefixCount = count(jsActual, MEDIA_PREFIX);
ok(origPrefixCount >= 1 && origPrefixCount === jsPrefixCount, "T14a", `media prefix preserved byte-identical original->script (${origPrefixCount}/${jsPrefixCount})`);
ok(!indexHtml.includes(MEDIA_PREFIX) && !cssActual.includes(MEDIA_PREFIX), "T14b", "media prefix lives only in script.js");
const splitAssetsExists = fs.existsSync(path.join(SPLIT, "assets"));
ok(!splitAssetsExists, "T14c", "no split/assets directory (media not vendored)");
ok(mat.contracts?.media_prefix_rebased === false && mat.contracts?.sibling_media_vendored === false, "T14d", "materialization records no rebase / no vendoring");

// ---- T15 authority-context media pins ----------------------------------------------
console.log("\nAuthority-context media inventory:");
const ctx = JSON.parse(readTxt(path.join(ROOT, "authority-context.json")));
const entries = ctx.media_inventory?.entries;
ok(Array.isArray(entries) && entries.length === MEDIA_ENTRY_COUNT, "T15a", `178 media entries pinned (${entries?.length})`);
ok(entries.every((e) => typeof e.path === "string" && Number.isInteger(e.bytes) && HEX64.test(e.sha256)), "T15b", "every entry carries path + bytes + sha256");
ok(unique(entries.map((e) => e.path)).length === MEDIA_ENTRY_COUNT, "T15c", "all 178 paths unique");
const videoCount = entries.filter((e) => e.path.includes("videos-v3")).length;
const posterCount = entries.filter((e) => e.path.includes("posters-v3")).length;
ok(videoCount === 89 && posterCount === 89, "T15d", `89 mp4 + 89 jpg (${videoCount}/${posterCount})`);
const sampleHits = S2_SAMPLE_PINS.map((s) => entries.some((e) => e.path === s.path && e.bytes === s.bytes && e.sha256 === s.sha256));
ok(sampleHits.every(Boolean), "T15e", `6/6 S2 mirror-fidelity sample pins present exactly (${sampleHits.filter(Boolean).length}/6)`);
ok(ctx.media_inventory?.pin_method === "S2_MIRROR_BYTE_EXACT", "T15f", "pin method recorded as S2 mirror byte-exact");
ok(ctx.sibling_rename_recorded?.renamed === true, "T15g", "sibling rename fact recorded");
ok(ctx.runtime_context_required === true && ctx.serving_contract?.repository_path_runtime_equivalent === false, "T15h", "runtime context required, repository path not runtime-equivalent");
ok(ctx.serving_contract?.capture_surface === "CONTEXT_AWARE_ONLY", "T15i", "capture surface CONTEXT_AWARE_ONLY");
const pv = ctx.media_inventory?.pin_verification;
ok(
  pv
  && pv.mirror_present + pv.mirror_absent === MEDIA_ENTRY_COUNT
  && pv.mirror_present === pv.mirror_matched
  && pv.mirror_mismatched === 0
  && pv.live_drive_verified === pv.mirror_absent
  && pv.byte_sum_consistent === true
  && pv.pinned_byte_sum === pv.declared_total_bytes,
  "T15j",
  `pin verification internally consistent (mirror ${pv?.mirror_matched}/${pv?.mirror_present} + live ${pv?.live_drive_verified} = ${pv?.total_verified}, 0 mismatches, byte sum consistent)`
);

// ---- T16 output hashes --------------------------------------------------------------
console.log("\nOutput hashes:");
const onDisk = {
  "split/index.html": readBin(path.join(SPLIT, "index.html")),
  "split/styles.css": readBin(path.join(SPLIT, "styles.css")),
  "split/script.js": readBin(path.join(SPLIT, "script.js")),
};
ok(Object.entries(onDisk).every(([k, buf]) => sha256(buf) === mat.outputs[k]?.sha256), "T16a", "on-disk sha256 matches materialization record");
ok(Object.entries(onDisk).every(([k, buf]) => gitBlobSha1(buf) === mat.outputs[k]?.git_blob_sha1), "T16b", "git blob sha1 matches materialization record");

// ---- T17 stage flags -----------------------------------------------------------------
console.log("\nStage flags:");
ok(manifest.stages?.mechanical_split_complete === true, "T17a", "S3 mechanical split complete");
ok(manifest.stages?.source_split_parity_pass === true, "T17b", "S4 parity claimed (accepted)");
ok(manifest.parity_ref === "evidence/parity/accepted-parity.json", "T17c", "parity_ref points at the validator's literal accepted-parity path");
const parityDir = path.join(ROOT, "evidence", "parity");
const parityPath = path.join(parityDir, "accepted-parity.json");
let parityOk = false;
let parity;
if (fs.existsSync(parityPath)) {
  parity = JSON.parse(readTxt(parityPath));
  parityOk = parity.status === "ACCEPTED"
    && parity.codex_id === "CDX014"
    && parity.authority?.bytes === LOCK_BYTES
    && parity.authority?.sha256 === LOCK_SHA256
    && parity.browser_errors === 0
    && parity.required_network_errors === 0
    && parity.comparisons?.dom === "EQUAL"
    && parity.comparisons?.geometry === "EQUAL"
    && parity.comparisons?.computed_style === "EQUAL"
    && parity.comparisons?.runtime_state === "EQUAL"
    && parity.comparisons?.interactions === "EQUAL"
    && parity.comparisons?.screenshots === "CANONICAL_PIXEL_HAMMING_WITHIN_THRESHOLD"
    && Number.isInteger(parity.comparisons?.canonical_pixel_hamming_max)
    && parity.comparisons.canonical_pixel_hamming_max >= 0
    && Number.isInteger(parity.comparisons?.canonical_pixel_threshold)
    && parity.comparisons.canonical_pixel_threshold >= 1
    && parity.comparisons.canonical_pixel_threshold <= 32
    && parity.comparisons.canonical_pixel_hamming_max <= parity.comparisons.canonical_pixel_threshold
    && parity.visual_review?.central_direct_artifact_review === true;
}
ok(parityOk, "T17d", "accepted-parity artifact present, ACCEPTED, authority-pinned and validator-coherent");
ok(fs.existsSync(path.join(ROOT, "evidence", "parity", "s4-candidate-parity.json")), "T17d2", "the pre-acceptance candidate record is retained beside the accepted record");
ok(manifest.capture_surface?.mode === "CONTEXT_AWARE_ONLY", "T17e", "capture_surface CONTEXT_AWARE_ONLY");
ok(manifest.capture_surface?.shared_harness_disposition?.["capture-source-baseline.mjs"] === "SKIP"
  && manifest.capture_surface?.shared_harness_disposition?.["capture-source-parity.mjs"] === "SKIP", "T17f", "shared harness SKIP disposition present");
const d1 = (manifest.source_contract?.frozen_defects || []).find((d) => d.id === "D1");
ok(d1 && d1.disposition === "PRESERVED", "T17g", "frozen defect D1 recorded PRESERVED");

// ---- T18 MST080 mapping --------------------------------------------------------------
console.log("\nMST080 mapping:");
const repoRoot = path.join(ROOT, "..", "..", "..");
const mstPath = path.join(repoRoot, "src", "02_master", "MST080", "record.json");
if (fs.existsSync(mstPath)) {
  const mst = JSON.parse(readTxt(mstPath));
  const ref = (mst.identity_refs || []).find((r) => r.namespace === "CDX" && r.id === "CDX014");
  ok(mst.mapping_status === "CODEX_RESOLVED", "T18a", `mapping_status CODEX_RESOLVED (${mst.mapping_status})`);
  ok(!!ref && ref.basis === "EXPLICIT_LEDGER_PROVENANCE", "T18b", "identity_refs contains CDX014 with EXPLICIT_LEDGER_PROVENANCE");
  ok((mst.notes || []).some((n) => n.includes("Codex-14 Rotating Memory Index") || n.includes("master-design-coverage")), "T18c", "notes cite ledger provenance");
} else {
  ok(false, "T18", "MST080 record not found at expected path");
}

// ---- T19 capsule location + identity-key conformance ---------------------------------
console.log("\nCapsule location and identity-key conformance:");
// PR #631 CODEX phase governance: src/04_codex/ is the canonical CDX capsule
// location and namespaces.json codex_rule forbids CDX capsules under
// src/03_sources. The string is assembled to avoid a self-match in this file.
const LEGACY_CDX_PREFIX = "src/" + "03_sources/CDX014";
const CANONICAL_CDX_PREFIX = "src/" + "04_codex/CDX014";
const repoRel = (p) => path.relative(repoRoot, p).split(path.sep).join("/");
ok(repoRel(ROOT) === CANONICAL_CDX_PREFIX, "T19a", `capsule root is ${CANONICAL_CDX_PREFIX} (${repoRel(ROOT)})`);
const capsuleArtifacts = ["manifest.json", "authority-context.json", "split/materialization.json", "baseline/accepted-baseline.json", "evidence/s3/roundtrip.json", "tests/s3-roundtrip.test.mjs"];
const stalePrefixHits = [];
for (const rel of capsuleArtifacts) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, "utf8");
  if (text.includes(LEGACY_CDX_PREFIX)) stalePrefixHits.push(rel);
}
ok(stalePrefixHits.length === 0, "T19b", stalePrefixHits.length === 0 ? "no pre-#631 legacy capsule-path residue" : `stale references in ${stalePrefixHits.join(", ")}`);
ok(manifest.codex_id === "CDX014" && typeof manifest.codex_folder_name === "string" && manifest.source_id === undefined, "T19c", "manifest uses CDX template identity keys (codex_id/codex_folder_name), no Source-namespace key");
ok(mat.codex_id === "CDX014" && typeof mat.source_id === "undefined", "T19d", "materialization uses codex_id, no source_id key");
const mstNotes = (mstPath && fs.existsSync(mstPath)) ? JSON.parse(readTxt(mstPath)).notes || [] : [];
ok(mstNotes.some((n) => n.includes(CANONICAL_CDX_PREFIX)) && mstNotes.every((n) => !n.includes(LEGACY_CDX_PREFIX)), "T19e", "MST080 notes cite the canonical capsule path only");

// ---- evidence ------------------------------------------------------------------------
const evidence = {
  schema_version: "1.0",
  codex_id: "CDX014",
  stage: "S3_MECHANICAL_SPLIT",
  generated_at_utc: new Date().toISOString(),
  authority: { bytes: LOCK_BYTES, sha256: LOCK_SHA256 },
  round_trip_byte_identity: reconBuf.compare(origBuf) === 0,
  round_trip_bytes: LOCK_BYTES,
  round_trip_sha256: LOCK_SHA256,
  boundaries: { style_open: styleOpen, style_close: styleClose, script_open: scriptOpen, script_close: scriptClose },
  media_prefix_preservation: { prefix: MEDIA_PREFIX, original_occurrences: origPrefixCount, script_occurrences: jsPrefixCount, preserved: origPrefixCount === jsPrefixCount && origPrefixCount >= 1 },
  media_entries_pinned: entries.length,
  media_pin_method: "S2_MIRROR_BYTE_EXACT",
  media_sample_pins_verified: S2_SAMPLE_PINS.length,
  contracts: mat.contracts,
  checks,
  passed,
  failed,
  result: failed === 0 ? "PASS" : "FAIL",
  s4_started: true,
  s4_executed_by: "src/04_codex/CDX014/tests/s4-context-parity.test.mjs (standalone context-aware harness; the shared harness SKIP disposition CONTEXT_AWARE_SURFACE_ONLY is unchanged)",
  parity_acceptance_claimed: true,
  parity_ref: "evidence/parity/accepted-parity.json",
  parity_tier: parity ? parity.tier : null,
  parity_capture_head: parity ? parity.capture_head : null,
};
const evDir = path.join(ROOT, "evidence", "s3");
fs.mkdirSync(evDir, { recursive: true });
fs.writeFileSync(path.join(evDir, "roundtrip.json"), JSON.stringify(evidence, null, 2));
console.log(`\nCDX014 S3 round-trip: ${passed} passed, ${failed} failed${failed === 0 ? " — PASS" : " — FAIL"}`);
if (failed > 0) process.exit(1);