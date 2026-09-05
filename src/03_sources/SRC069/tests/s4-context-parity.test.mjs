/**
 * SRC069 S4 Context-aware Parity — disposition contract + real-browser parity.
 *
 * Two modes, one file:
 *
 *   Contract mode (default, no browser):
 *     node src/03_sources/SRC069/tests/s4-context-parity.test.mjs
 *
 *   Real-browser parity mode:
 *     SRC069_S4_BROWSER=1 \
 *     SRC_EXACT_HEAD=<40-hex PR head> \
 *     SRC069_S4_TARGET_LOCK=<path to hydration target-lock.json> \
 *     SRC069_S4_OUT=<evidence dir outside Git> \
 *     node src/03_sources/SRC069/tests/s4-context-parity.test.mjs
 *
 * Contract mode closes the one honest S3 non-result: the global baseline runner
 * aborts at SRC047 and never reaches SRC069, so the fail-closed disposition of
 * this capsule was never demonstrated end to end. It is proven here directly,
 * without a browser and without depending on SRC047.
 *
 * Contract checks:
 *  - C01  the real SRC069 manifest yields SKIP / CONTEXT_AWARE_SURFACE_ONLY
 *  - C02  SRC069 is not DUAL_VARIANT, so the helper is genuinely consulted
 *  - C03  capture-source-baseline.mjs fails closed BEFORE it serves a surface
 *  - C04  capture-source-parity.mjs fails closed BEFORE it serves a surface
 *  - C05  SRC056 keeps the generic path (disposition null)
 *  - C06  SRC060 keeps the generic path (disposition null)
 *  - C07  SRC068 keeps the DUAL_VARIANT path (helper returns null)
 *  - C08  undeclared / non-context-aware manifests are unaffected
 *  - C09  SRC069 has not claimed S4 acceptance
 *  - C10  the materialization provenance head is truthfully reframed
 *  - C11  the ~35.7 MB sibling context is still not vendored into the capsule
 *
 * Real-browser mode runs the 15 matched states of the accepted S2 matrix on two
 * isolated virtual roots at the canonical selected-D depth and requires every
 * channel to be EQUAL. It never sets source_split_parity_pass: the verdict is
 * READY_FOR_CENTRAL_S4_VISUAL_REVIEW at best.
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { getCaptureSurfaceDisposition } from "../../../08_harness/capture-surface.mjs";

const SRC_ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const HARNESS_DIR = path.join(REPO_ROOT, "src", "08_harness");

const AUTHORITY_SHA256 = "64d5a545a45013b12463f53af7d7be12b7c1c7b0de6f56cb82761fd469791fb3";
const AUTHORITY_BYTES = 27600;
const GENERATION_INPUT_HEAD = "06e21763454da479e8bb949fadd8500427b776b8";
const CONTEXT_AWARE_ONLY = "CONTEXT_AWARE_ONLY";
const SKIP_REASON = "CONTEXT_AWARE_SURFACE_ONLY";
const REQUIRED_SERVING = "CANONICAL_SELECTED_D_VIRTUAL_DEPTH";

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const readText = (filePath) => fs.readFileSync(filePath, "utf8");
const manifestFor = (sourceId) => readJson(path.join(REPO_ROOT, "src", "03_sources", sourceId, "manifest.json"));

const results = [];
function check(name, actual, expected) {
  assert.deepStrictEqual(actual, expected, name);
  results.push(name);
}
function checkTrue(name, actual, message) {
  assert.ok(actual, message ?? name);
  results.push(name);
}

/**
 * Checks that a generic harness fails closed before it serves a runtime surface.
 *
 * The relevant ordering is inside the per-Source loop: helper functions such as
 * startServer() and captureVariant() are declared earlier in the file, so a
 * whole-file index comparison would be meaningless. The window therefore starts
 * at the per-Source loop header and only the awaited startServer() call — the
 * thing that actually opens a port and serves the repository path — is used as
 * the runtime-serving marker.
 */
function failClosedBeforeRuntimeServing(harnessFile) {
  const text = readText(path.join(HARNESS_DIR, harnessFile));
  const loopMatch = /for \(const sourceId of [\s\S]*?\)\s*\{/.exec(text);
  if (!loopMatch) {
    return {
      order: { loop_found: false, imports_helper: false, calls_helper: false, skip_continue: false, disposition_before_serving: false },
      callIndex: -1,
      servingIndex: -1,
    };
  }
  const windowStart = loopMatch.index;
  const order = {
    loop_found: true,
    imports_helper: text.includes("getCaptureSurfaceDisposition"),
    calls_helper: /getCaptureSurfaceDisposition\(\{\s*manifest\s*\}\)/.test(text),
    skip_continue: /surfaceDisposition[\s\S]{0,400}?continue;/.test(text),
  };
  const callIndex = text.indexOf("getCaptureSurfaceDisposition({ manifest })", windowStart);
  const servingIndex = text.indexOf("await startServer(", windowStart);
  order.disposition_before_serving = callIndex >= 0 && servingIndex >= 0 && callIndex < servingIndex;
  return { order, callIndex, servingIndex, loopStart: windowStart };
}

// ---------------------------------------------------------------------------
// Contract mode
// ---------------------------------------------------------------------------

const src069Manifest = manifestFor("SRC069");
const disposition = getCaptureSurfaceDisposition({ manifest: src069Manifest });
check(
  "C01 SRC069 capture disposition is SKIP / CONTEXT_AWARE_SURFACE_ONLY",
  disposition,
  {
    action: "SKIP",
    reason: SKIP_REASON,
    mode: CONTEXT_AWARE_ONLY,
    required_serving: REQUIRED_SERVING,
  },
);
checkTrue("C02 SRC069 is not DUAL_VARIANT", src069Manifest.authority_mode !== "DUAL_VARIANT");

for (const harnessFile of ["capture-source-baseline.mjs", "capture-source-parity.mjs"]) {
  const label = harnessFile === "capture-source-baseline.mjs" ? "C03" : "C04";
  const { order } = failClosedBeforeRuntimeServing(harnessFile);
  check(`${label} ${harnessFile} fails closed before runtime serving`, order, {
    loop_found: true,
    imports_helper: true,
    calls_helper: true,
    skip_continue: true,
    disposition_before_serving: true,
  });
}

check("C05 SRC056 generic path unaffected", getCaptureSurfaceDisposition({ manifest: manifestFor("SRC056") }), null);
check("C06 SRC060 generic path unaffected", getCaptureSurfaceDisposition({ manifest: manifestFor("SRC060") }), null);
check("C07 SRC068 DUAL_VARIANT path unaffected", getCaptureSurfaceDisposition({ manifest: manifestFor("SRC068") }), null);
checkTrue("C07b SRC068 is declared DUAL_VARIANT", manifestFor("SRC068").authority_mode === "DUAL_VARIANT");

check("C08a empty manifest unaffected", getCaptureSurfaceDisposition({ manifest: {} }), null);
check("C08b SINGLE_EXECUTABLE mode unaffected", getCaptureSurfaceDisposition({ manifest: { capture_surface: { mode: "SINGLE_EXECUTABLE" } } }), null);
check("C08c DUAL_VARIANT manifest short-circuits to null", getCaptureSurfaceDisposition({ manifest: { authority_mode: "DUAL_VARIANT", capture_surface: { mode: CONTEXT_AWARE_ONLY } } }), null);

checkTrue("C09a SRC069 has not claimed S4 parity", src069Manifest.stages.source_split_parity_pass === false);
check("C09b SRC069 parity_ref is still null", src069Manifest.parity_ref, null);
checkTrue(
  "C09c no accepted parity artifact exists in the capsule",
  !fs.existsSync(path.join(SRC_ROOT, "evidence", "parity", "accepted-parity.json")),
);

const materialization = readJson(path.join(SRC_ROOT, "split", "materialization.json"));
check("C10a materialization retains the historical generation head", materialization.source_candidate.generation_input_head, GENERATION_INPUT_HEAD);
check("C10b materialization no longer claims a self-referential exact_head", "exact_head" in materialization.source_candidate, false);
checkTrue(
  "C10c provenance reframing is documented in the materialization record",
  typeof materialization.source_candidate.provenance_field_note === "string" && materialization.source_candidate.provenance_field_note.length > 40,
);

const authorityContext = readJson(path.join(SRC_ROOT, "authority-context.json"));
check("C11a capsule declares zero vendored context html", authorityContext.sibling_context_html_vendored, false);
check("C11b capsule records all 11 portal targets", authorityContext.portal_targets.length, 11);
let capsuleBytes = 0;
const capsulePaths = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      capsuleBytes += fs.statSync(full).size;
      capsulePaths.push(full);
    }
  }
})(SRC_ROOT);
checkTrue(
  "C11c capsule stays far below the 35.7 MB context corpus",
  capsuleBytes < 500_000,
  `capsule bytes=${capsuleBytes}`,
);
checkTrue(
  "C11d no context/mirror directory inside the capsule",
  capsulePaths.every((filePath) => !/(^|\/)(context|mirror|mirrors)(\/|$)/i.test(filePath)),
);

console.log(`SRC069_S4_CONTRACT_CHECKS=${results.length}`);
console.log("BROWSER_LAUNCHED=false");
if (process.env.SRC069_S4_WRITE_CONTRACT_EVIDENCE) {
  fs.mkdirSync(path.join(process.env.SRC069_S4_WRITE_CONTRACT_EVIDENCE), { recursive: true });
  fs.writeFileSync(
    path.join(process.env.SRC069_S4_WRITE_CONTRACT_EVIDENCE, "capture-disposition-contract.json"),
    JSON.stringify({ schema_version: "1.0", source_id: "SRC069", stage: "S4_CONTRACT_PROOF", browser_launched: false, checks: results, generated_at: new Date().toISOString() }, null, 2),
  );
}

// ---------------------------------------------------------------------------
// Real-browser parity mode
// ---------------------------------------------------------------------------

if (process.env.SRC069_S4_BROWSER !== "1") {
  console.log("SRC069_S4_MODE=CONTRACT_ONLY");
  process.exit(0);
}

const targetLockPath = process.env.SRC069_S4_TARGET_LOCK;
const outDir = process.env.SRC069_S4_OUT;
const exactHead = process.env.SRC_EXACT_HEAD;
if (!targetLockPath || !outDir || !exactHead || !/^[0-9a-f]{40}$/.test(exactHead)) {
  console.error("SRC069_S4_BROWSER=1 requires SRC069_S4_TARGET_LOCK, SRC069_S4_OUT and a 40-hex SRC_EXACT_HEAD");
  process.exit(2);
}

const targetLock = readJson(targetLockPath);
check("B01 hydration reported no target drift", targetLock.drift_hold, false);
check("B02 all 11 targets hash-verified against the ledger", targetLock.hash_verified, "11/11");
check("B03 all 11 targets byte-verified against the ledger", targetLock.bytes_verified, "11/11");
check("B04 target count is 11", targetLock.target_count, 11);
check("B05 zero context bytes vendored", targetLock.context_bytes_vendored, 0);
check("B06 both virtual roots share one canonical depth", targetLock.same_canonical_depth, true);
check("B07 served original bytes match the authority", targetLock.served_authority_original.matches_authority, true);
check("B08 served split bytes match split/index.html", targetLock.served_split.matches_split_index_html, true);
check("B09 served authority SHA matches the locked authority", targetLock.authority.observed_sha256, AUTHORITY_SHA256);
check("B10 served authority bytes match the locked authority", targetLock.authority.observed_bytes, AUTHORITY_BYTES);

const ledgerTargets = {
  virtual_document_path: targetLock.virtual_document_path,
  targets: targetLock.targets
    .filter((entry) => entry.kind === "portal_target")
    .map((entry) => ({ key: entry.key, track: entry.track, path: entry.authority_relative_url, ledger_bytes: entry.ledger_bytes })),
};
check("B11 the ledger exposes 11 source-native portal paths", ledgerTargets.targets.length, 11);
checkTrue(
  "B12 every portal path is still the source-native ../../ form",
  ledgerTargets.targets.every((target) => target.path.startsWith("../../")),
);

const { runContextParity, VIDEO_CANONICAL16_STATES, CANONICAL16_SPEC, GLOBAL_VISUAL_TOLERANCE, isVideoCanonical16State } = await import("./lib/context-parity-runner.mjs");
const comparison = await runContextParity({
  repoRoot: REPO_ROOT,
  originalRoot: targetLock.original_root,
  splitRoot: targetLock.split_root,
  outDir,
  head: exactHead,
  manifest: src069Manifest,
  ledgerTargets,
  splitFingerprints: {
    "split/index.html": materialization.outputs["split/index.html"].sha256,
    "split/styles.css": materialization.outputs["split/styles.css"].sha256,
    "split/script.js": materialization.outputs["split/script.js"].sha256,
  },
});

check("B13 state count matches the accepted S2 matrix", comparison.channels.state_count, 15);
check("B14 same canonical virtual depth on both surfaces", comparison.channels.same_canonical_depth, true);
check("B15 identity/provenance channel equal", comparison.channels.identity_provenance_equal, true);
check("B16 body DOM channel equal", comparison.channels.body_dom_equal, true);
check("B17 runtime state channel equal", comparison.channels.runtime_state_equal, true);
check("B18 geometry channel equal", comparison.channels.geometry_equal, true);
check("B19 text channel equal", comparison.channels.text_equal, true);
check("B20 screenshot channel equal (raw SHA for non-video, exact canonical16 digest for the 3 video states)", comparison.channels.screenshot_equal, true);
check(
  "B20b the canonical16 scope is exactly the 3 enumerated video viewer states",
  comparison.channels.canonical16_video_states_total,
  VIDEO_CANONICAL16_STATES.length,
);
check(
  "B20c all 12 non-video states keep RAW PNG byte identity with no relaxation",
  [comparison.channels.non_video_states_total, comparison.channels.non_video_states_raw_sha_equal],
  [12, 12],
);
check(
  "B20d all 3 video states are canonical16 digest equal",
  comparison.channels.canonical16_video_states_digest_equal,
  3,
);
checkTrue(
  "B20e every video-state canonical16 digest pair is present and equal",
  comparison.states
    .filter((s) => isVideoCanonical16State(s.viewport, s.state))
    .every((s) => s.canonical16_digest?.original && s.canonical16_digest.original === s.canonical16_digest.split && s.canonical16_digest.equal === true),
  JSON.stringify(comparison.states.filter((s) => s.video_canonical16_state).map((s) => ({ viewport: s.viewport, state: s.state, digest: s.canonical16_digest }))),
);
checkTrue(
  "B20f pixel measurement is recorded only for video states whose raw bytes differ, and never decides equality",
  comparison.channels.screenshot_pixel_measured.every((entry) => isVideoCanonical16State(entry.viewport, entry.state)) &&
    comparison.states.every((s) => (s.screenshot_pixel_diff === null) === (s.video_canonical16_state !== true || s.screenshot_sha_equal === true)),
  JSON.stringify(comparison.channels.screenshot_pixel_measured),
);
checkTrue(
  "B20g the runner exports the canonical16 spec and keeps the global visual tolerance disabled",
  comparison.channels.canonical16_spec.technique === CANONICAL16_SPEC.technique &&
    comparison.channels.canonical16_spec.downsample === "16x16" &&
    comparison.channels.canonical16_spec.rgb_channel_mask === "0xF0" &&
    GLOBAL_VISUAL_TOLERANCE === false &&
    comparison.channels.screenshot_pixel_tolerance === undefined,
);
check("B21 deterministic freeze applied identically", comparison.channels.video_freeze_equal, true);
check("B22 interactions channel equal", comparison.channels.interactions_equal, true);
check("B23 D1 focus defect preserved identically", comparison.channels.d1_equal, true);
check("B24 D2 focus defect preserved identically", comparison.channels.d2_equal, true);
check("B25 zero console errors on both surfaces", [comparison.channels.console_errors_original, comparison.channels.console_errors_split], [0, 0]);
check("B26 zero page errors on both surfaces", [comparison.channels.page_errors_original, comparison.channels.page_errors_split], [0, 0]);
check(
  "B27 zero unexpected failed requests on both surfaces",
  [comparison.channels.unexpected_failed_requests_original, comparison.channels.unexpected_failed_requests_split],
  [0, 0],
);
check("B28 no failed responses on either surface", [comparison.channels.failed_responses_original, comparison.channels.failed_responses_split], [0, 0]);
check("B29 all 11 portal targets resolve on the original surface", comparison.channels.portal_resolution_original, 11);
check("B30 all 11 portal targets resolve on the split surface", comparison.channels.portal_resolution_split, 11);
check("B31 portal source-native paths identical on both surfaces", comparison.channels.portal_paths_equal, true);
check("B32 remote font health identical on both surfaces", comparison.channels.remote_fonts_equal, true);
check("B33 verdict is the S4 review handoff, not an acceptance claim", comparison.verdict, "READY_FOR_CENTRAL_S4_VISUAL_REVIEW");

fs.writeFileSync(
  path.join(outDir, "SRC069_S4_CONTEXT_PARITY_REPORT.md"),
  [
    "# SRC069 S4 Context-Aware Original/Split Parity — Candidate",
    "",
    `generated_at: ${new Date().toISOString()}`,
    `exact_head: ${exactHead}`,
    `authority_sha256: ${AUTHORITY_SHA256}`,
    `verdict: ${comparison.verdict}`,
    `blockers: ${comparison.blockers.length === 0 ? "NONE" : comparison.blockers.join(", ")}`,
    "",
    "## Canonical virtual depth",
    "",
    `virtual_document_path: ${comparison.channels && ledgerTargets.virtual_document_path}`,
    `original_url: ${comparison.original_url}`,
    `split_url: ${comparison.split_url}`,
    "",
    "## Channels",
    "",
    ...Object.entries(comparison.channels).map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`),
    "",
    "## States",
    "",
    "| viewport | state | body_dom | runtime | geometry | text | screenshot | sha_equal | canonical16 | freeze |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...comparison.states.map(
      (state) => `| ${state.viewport} | ${state.state} | ${state.body_dom_equal} | ${state.runtime_state_equal} | ${state.geometry_equal} | ${state.text_equal} | ${state.screenshot_equal} | ${state.screenshot_sha_equal} | ${state.video_canonical16_state ? (state.canonical16_digest?.equal ? `digest-equal ${state.canonical16_digest.original.slice(0, 12)}` : `DIGEST-DIFF o=${state.canonical16_digest?.original ?? "?"} s=${state.canonical16_digest?.split ?? "?"}`) : "n/a (raw)"} | ${state.video_freeze_equal} |`,
    ),
    "",
    "S4 is NOT accepted by this run. `source_split_parity_pass` remains false and `parity_ref` remains null until CENTRAL reviews the screenshots.",
    "",
  ].join("\n"),
);

console.log(`SRC069_S4_PARITY_CHECKS=${results.length}`);
console.log(`SRC069_S4_VERDICT=${comparison.verdict}`);
console.log(`SRC069_S4_BLOCKERS=${comparison.blockers.length === 0 ? "NONE" : comparison.blockers.join("+")}`);
console.log("BROWSER_LAUNCHED=true");
