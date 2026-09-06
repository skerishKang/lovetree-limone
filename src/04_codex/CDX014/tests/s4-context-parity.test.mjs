/**
 * CDX014 S4 Context-aware Serving Parity — split/index.html vs original/original.html.
 *
 * Two modes, one file (SRC069 S4 precedent: contract mode is the default so this
 * file runs in CI without a browser; the real A/B replay is opt-in).
 *
 *   Contract mode (default, no browser):
 *     node src/04_codex/CDX014/tests/s4-context-parity.test.mjs
 *
 *   Real-browser context-aware parity mode:
 *     $env:CDX014_S4_BROWSER = "1"
 *     $env:CDX014_S4_SERVING = "D:\Temp\cdx014-s4-serving"
 *     $env:CDX014_S4_OUT      = "D:\Temp\cdx014-s4-out"
 *     node src/04_codex/CDX014/tests/s4-context-parity.test.mjs
 *
 * CDX014 is a path-context-sensitive Source (SRC069-class, Drive-rename
 * variant). Its runtime media prefix
 *   ../12_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/
 * refers to the AUTHORING-TIME sibling folder name; the live Drive sibling was
 * renamed to 12-1_… on 2026-08-17. Neither original/original.html nor
 * split/index.html is a runtime surface at its repository path (all 178 media
 * would 404). The shared single-executable baseline/parity harnesses therefore
 * SKIP this capsule (CONTEXT_AWARE_SURFACE_ONLY) and this file is the only
 * executor of the parity claim.
 *
 * Serving (CENTRAL-fixed for CDX014 S4, zero URL rewrites):
 *
 *   <serving root>/
 *   └── 12-1_러브트리_리빙미디어스피어_인터랙티브대문_V1/        ← capsule folder name
 *       ├── original/original.html
 *       ├── split/{index.html,styles.css,script.js}
 *       └── 12_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/
 *           ├── videos-v3/v3-001..089.mp4        (89)
 *           └── posters-v3/poster-001..089.jpg  (89)
 *
 * From either surface `../12_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/`
 * resolves to that authoring-time sibling. To keep the A and B surfaces fully
 * isolated from each other (SRC069 "isolated virtual roots" precedent) the
 * runner materializes TWO roots from the single serving root, each a faithful
 * instance of the layout above carrying only its own surface, both junctioning
 * the same pin-verified media host. Media is never copied a second time and
 * never rewritten.
 *
 * Compared dimensions (CENTRAL contract), all must be EQUAL:
 *   DOM inventory · geometry · computed style · runtime state · media identity
 *   · console/page/request failures · screenshots · frozen defect D1 preservation
 *
 * Screenshot policy (SRC069 precedent, a normalization not a tolerance): the
 * sculpture auto-rotates continuously, so a LIVE-frame PNG differs between two
 * runs of the SAME surface by rotation phase and video decode frame. The LIVE
 * PNG is retained only as a recording instrument and never decides equality.
 * The decision capture is a SETTLED frame: the identical sequence is replayed
 * with the auto-rotation halted via the Source's own #pause control (its label
 * is Ⅱ while auto-rotation is on) and a fixed convergence wait, applied the
 * same way to both surfaces. Equality is decided by the canonical-16 pixel
 * digest (SRC060 technique): 16x16 downsample, high-quality smoothing, RGB
 * channels floored to /16 (mask 0xF0), alpha unchanged, SHA-256 of the 256
 * bytes. Digest equality is exact.
 *
 * Frozen defect D1 (auto-rotation not gated on prefers-reduced-motion) is
 * PROVEN PRESERVED IDENTICALLY on both surfaces, not fixed. Any OTHER new
 * defect stops the run with a non-pass verdict.
 *
 * This file NEVER sets manifest.stages.source_split_parity_pass. The verdict is
 * READY_FOR_CENTRAL_S4_VISUAL_REVIEW at best; a CONTEXT_AWARE_ONLY capsule may
 * claim the flag only with parity_ref=evidence/parity/accepted-parity.json plus
 * a CENTRAL-accepted artifact (source-capsule-validator.mjs, issue #589
 * comment 5551812640 precedent). The promotion artifact is written to
 * evidence/parity/s4-candidate-parity.json in exactly that shape so CENTRAL can
 * promote it without re-running anything.
 */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const CAPSULE = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const EVIDENCE_S4 = path.join(CAPSULE, "evidence", "s4");

// The evidence is only meaningful against a named commit. Prefer an explicit
// override (so a run can be pinned from the outside), otherwise read the
// working tree's HEAD. Never leave this null silently: C21 fails closed on a
// missing or malformed capture head.
function repositoryHead() {
  if (process.env.GIT_HEAD) return process.env.GIT_HEAD;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const CODEX_ID = "CDX014";
const CAPSULE_FOLDER = "12-1_러브트리_리빙미디어스피어_인터랙티브대문_V1";
const SIBLING_FOLDER = "12_러브트리_리빙미디어스피어_인터랙티브대문_V1";
const MEDIA_PREFIX = "../12_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/";

const AUTHORITY_BYTES = 19631;
const AUTHORITY_SHA256 = "0cef6497103d05a853c4849d58967bed66e3af85db5e345a69724b2d26719361";
const SPLIT_FINGERPRINTS = {
  "split/index.html": "5220ec3865c9237d202e6dc444004fc278a8eced63e2f9e2bc97a7b5424463e7",
  "split/styles.css": "9bde0d62485afc5faf9501dd72fd095dc4b44b1fb52c76c6766adb886cf56d51",
  "split/script.js": "b72c8283578c231fb23583099de2630640cefaceccf8b0ea693eb2dca31e6461",
};

const MEDIA_ENTRY_COUNT = 178;
const MEDIA_TOTAL_BYTES = 1947644779;

const VIEWPORTS = [
  { key: "1440x900", width: 1440, height: 900, cls: "desktop" },
  { key: "430x932", width: 430, height: 932, cls: "mobile" },
  { key: "390x844", width: 390, height: 844, cls: "mobile" },
];
const STATES = ["INITIAL", "INDEX_DRAWER_OPEN", "VIEWER_OPEN", "PAUSED"];

// The sculpture's panels are the only elements whose transform/opacity the
// Source mutates every animation frame; everything else is static layout.
const GEOMETRY_SELECTORS = [
  "html",
  "body",
  "#stage",
  ".scene",
  "#deck",
  ".chrome",
  ".topbar",
  ".brand",
  ".top-meta",
  ".bottom",
  ".live",
  ".hint",
  ".count",
  "#currentNo",
  "#indexTrigger",
  ".controls",
  "#prev",
  "#pause",
  "#next",
  "#drawer",
  ".drawer-head",
  ".drawer-body",
  "#indexGrid",
  ".index-item:nth-child(1)",
  ".index-item:nth-child(45)",
  ".index-item:nth-child(89)",
  "#viewer",
  "#viewerClose",
  ".viewer-media",
  ".viewer-info",
  "#viewerTitle",
  "#viewerMeta",
];
const STYLE_SELECTORS = [
  "html",
  "body",
  "#stage",
  ".scene",
  "#deck",
  ".panel",
  ".face.front",
  ".face.back",
  ".panel-copy",
  ".editorial",
  ".type-meta",
  ".type-letter",
  ".back-index",
  ".chrome",
  ".topbar",
  ".brand",
  ".top-meta",
  ".bottom",
  ".live",
  ".hint",
  ".count",
  "#indexTrigger",
  ".controls",
  ".round-btn",
  "#pause",
  "#drawer",
  ".drawer-close",
  ".drawer-head",
  ".eyebrow",
  ".drawer-title",
  ".drawer-body",
  ".index-grid",
  ".index-item",
  ".viewer",
  ".viewer-close",
  ".viewer-media",
  ".viewer-info",
];
const STYLE_PROPERTIES = [
  "display",
  "position",
  "boxSizing",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "top",
  "right",
  "bottom",
  "left",
  "zIndex",
  "margin",
  "padding",
  "border",
  "borderRadius",
  "backgroundColor",
  "color",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "textAlign",
  "opacity",
  "visibility",
  "overflow",
  "overflowX",
  "overflowY",
  "pointerEvents",
  "cursor",
  "objectFit",
  "aspectRatio",
  "transform",
  "transformStyle",
  "transformOrigin",
  "perspective",
  "backfaceVisibility",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gap",
  "flexDirection",
  "justifyContent",
  "alignItems",
  "alignContent",
  "backdropFilter",
  "boxShadow",
  "textShadow",
  "filter",
  "transition",
  "animation",
];

const sha256 = (input) => crypto.createHash("sha256").update(input).digest("hex");
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const readText = (filePath) => fs.readFileSync(filePath, "utf8");
const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
};
const documentPathFor = (label) => (label === "original" ? "/original/original.html" : "/split/index.html");
const documentUrlFor = (label, port) => `http://127.0.0.1:${port}/${CAPSULE_FOLDER}${documentPathFor(label)}`;

/**
 * Union of any number of rectangle lists, so the video mask is the SAME set on
 * every run being compared. Only the x/y/w/h box is unioned; the per-run video
 * metadata is recorded separately.
 */
function unionRects(...rectList) {
  const all = rectList.flat().map((rect) => ({ x: rect.x, y: rect.y, w: rect.w, h: rect.h }));
  const out = [];
  for (const rect of all) {
    const existing = out.find(
      (candidate) =>
        Math.abs(candidate.x - rect.x) < 0.01 &&
        Math.abs(candidate.y - rect.y) < 0.01 &&
        Math.abs(candidate.w - rect.w) < 0.01 &&
        Math.abs(candidate.h - rect.h) < 0.01,
    );
    if (!existing) out.push(rect);
  }
  return out;
}

const results = [];
function check(name, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
  results.push(name);
}
function checkTrue(name, actual, message) {
  if (!actual) throw new Error(`${name}${message ? ` — ${message}` : ""}`);
  results.push(name);
}

// ---------------------------------------------------------------------------
// Contract mode
// ---------------------------------------------------------------------------

function runContractMode() {
  const manifest = readJson(path.join(CAPSULE, "manifest.json"));
  const context = readJson(path.join(CAPSULE, "authority-context.json"));
  const originalText = readText(path.join(CAPSULE, "original", "original.html"));
  const originalBytes = Buffer.from(originalText, "utf8");
  const splitIndex = readText(path.join(CAPSULE, "split", "index.html"));
  const splitCss = readText(path.join(CAPSULE, "split", "styles.css"));
  const splitJs = readText(path.join(CAPSULE, "split", "script.js"));
  const baseline = readJson(path.join(CAPSULE, "baseline", "accepted-baseline.json"));

  const surface = manifest.capture_surface ?? {};
  const stages = manifest.stages ?? {};
  const disposition = surface.shared_harness_disposition ?? {};

  check(
    "C01 capture surface is CONTEXT_AWARE_ONLY / PATH_CONTEXT_SENSITIVE_SOURCE",
    [surface.mode, surface.reason, surface.required_serving],
    ["CONTEXT_AWARE_ONLY", "PATH_CONTEXT_SENSITIVE_SOURCE", "AUTHORING_TIME_SIBLING_LAYOUT"],
  );
  check(
    "C02 both shared harnesses are dispositioned SKIP / CONTEXT_AWARE_SURFACE_ONLY",
    {
      baseline: disposition["capture-source-baseline.mjs"],
      parity: disposition["capture-source-parity.mjs"],
      reason: disposition.skip_reason,
    },
    {
      baseline: "SKIP",
      parity: "SKIP",
      reason: "CONTEXT_AWARE_SURFACE_ONLY",
    },
  );
  check(
    "C03 repository paths are declared NOT runtime-equivalent for both surfaces",
    [surface.repository_original_surface_runtime_equivalent, surface.repository_split_surface_runtime_equivalent],
    [false, false],
  );
  check(
    "C04 serving contract forbids the repository path and requires zero URL rewrites",
    [
      context.serving_contract.repository_path_runtime_equivalent,
      context.serving_contract.zero_rewrites,
      context.serving_contract.media_bytes_total,
    ],
    [false, true, MEDIA_TOTAL_BYTES],
  );
  check(
    "C05 frozen authority original is untouched (bytes + SHA-256)",
    [originalBytes.length, sha256(originalBytes), manifest.authority.bytes, manifest.authority.sha256, manifest.authority.status],
    [AUTHORITY_BYTES, AUTHORITY_SHA256, AUTHORITY_BYTES, AUTHORITY_SHA256, "LOCKED"],
  );
  check(
    "C06 split fingerprints are byte-identical to the S3 materialization record",
    {
      "split/index.html": sha256(splitIndex),
      "split/styles.css": sha256(splitCss),
      "split/script.js": sha256(splitJs),
    },
    SPLIT_FINGERPRINTS,
  );
  check(
    "C07 media prefix survives byte-for-byte, exactly once per surface, never rebased",
    [originalText.split(MEDIA_PREFIX).length - 1, splitJs.split(MEDIA_PREFIX).length - 1],
    [1, 1],
  );
  checkTrue(
    "C08 no split/assets directory exists (no media vendored, no path rebase)",
    !fs.existsSync(path.join(CAPSULE, "split", "assets")),
  );
  check(
    "C09 all 178 media entries are pinned (path/bytes/sha256) and no media byte is vendored",
    [context.media_inventory.entries.length, context.media_inventory.count, context.media_inventory.total_bytes, manifest.source_contract.media_entries],
    [MEDIA_ENTRY_COUNT, MEDIA_ENTRY_COUNT, MEDIA_TOTAL_BYTES, MEDIA_ENTRY_COUNT],
  );
  checkTrue(
    "C10 every pinned media entry carries path, positive bytes and a 64-hex sha256",
    context.media_inventory.entries.every(
      (entry) =>
        typeof entry.path === "string" &&
        entry.path.startsWith("12-1_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/") &&
        /\/(videos-v3\/v3-\d{3}\.mp4|posters-v3\/poster-\d{3}\.jpg)$/.test(entry.path) &&
        typeof entry.bytes === "number" &&
        entry.bytes > 0 &&
        /^[0-9a-f]{64}$/.test(String(entry.sha256)),
    ),
  );
  checkTrue(
    "C10b the 178 pinned paths are unique and cover v3-001..089.mp4 and poster-001..089.jpg",
    new Set(context.media_inventory.entries.map((entry) => entry.path)).size === MEDIA_ENTRY_COUNT &&
      context.media_inventory.entries.filter((entry) => entry.path.endsWith(".mp4")).length === 89 &&
      context.media_inventory.entries.filter((entry) => entry.path.endsWith(".jpg")).length === 89 &&
      Array.from({ length: 89 }, (_, index) => `v3-${String(index + 1).padStart(3, "0")}.mp4`).every((name) =>
        context.media_inventory.entries.some((entry) => entry.path.endsWith(name)),
      ) &&
      Array.from({ length: 89 }, (_, index) => `poster-${String(index + 1).padStart(3, "0")}.jpg`).every((name) =>
        context.media_inventory.entries.some((entry) => entry.path.endsWith(name)),
      ),
  );
  check(
    "C11 canonical runtime layout records the authoring-time sibling name and resolution rule",
    [
      context.canonical_runtime_layout.authority_sibling_prefix,
      context.canonical_runtime_layout.prefix_occurrences_in_script,
    ],
    [MEDIA_PREFIX, 1],
  );
  check(
    "C12 the sibling rename is recorded and the folder ids agree with the manifest",
    [
      context.sibling_rename_recorded.renamed,
      context.sibling_rename_recorded.authoring_name,
      context.sibling_rename_recorded.live_name,
      context.sibling_rename_recorded.live_folder_id,
      context.sibling_rename_recorded.fixture_folder_ids.videos_v3,
      context.sibling_rename_recorded.fixture_folder_ids.posters_v3,
      context.authority.drive_folder_id,
    ],
    [
      true,
      SIBLING_FOLDER,
      CAPSULE_FOLDER,
      surface.canonical_layout_folder_ids.media_sibling_folder_id,
      surface.canonical_layout_folder_ids.videos_folder_id,
      surface.canonical_layout_folder_ids.posters_folder_id,
      manifest.authority.drive_folder_id,
    ],
  );
  check(
    "C13 baseline is ACCEPTED for CDX014 and pins the same authority identity",
    [baseline.status, baseline.codex_id, baseline.authority.bytes, baseline.authority.sha256],
    ["ACCEPTED", CODEX_ID, AUTHORITY_BYTES, AUTHORITY_SHA256],
  );
  const d1 = (manifest.source_contract.frozen_defects ?? []).find((defect) => defect.id === "D1");
  check(
    "C14 frozen defect D1 is recorded PRESERVED (never fixed)",
    d1 && [d1.disposition, d1.name],
    ["PRESERVED", "auto-rotation not gated on prefers-reduced-motion"],
  );
  check(
    "C15 the four manifest interaction surfaces are the S4 state recipe",
    manifest.source_contract.interaction_surface,
    STATES,
  );
  check(
    "C16 stage flags are complete: S0-S4 all claimed and parity_ref is the validator's literal accepted-parity path",
    [
      stages.identity_verified,
      stages.raw_authority_locked,
      stages.baseline_captured,
      stages.mechanical_split_complete,
      stages.source_split_parity_pass,
      manifest.parity_ref,
    ],
    [true, true, true, true, true, "evidence/parity/accepted-parity.json"],
  );
  const acceptedParityPath = path.join(CAPSULE, "evidence", "parity", "accepted-parity.json");
  const candidatePath = path.join(CAPSULE, "evidence", "parity", "s4-candidate-parity.json");
  const comparisonPath = path.join(EVIDENCE_S4, "comparison.json");
  let acceptedParity = null;
  if (fs.existsSync(acceptedParityPath)) acceptedParity = readJson(acceptedParityPath);
  checkTrue(
    "C17 the accepted-parity artifact is ACCEPTED for CDX014, authority-pinned, and validator-coherent",
    !!acceptedParity &&
      acceptedParity.status === "ACCEPTED" &&
      acceptedParity.codex_id === CODEX_ID &&
      acceptedParity.authority?.bytes === AUTHORITY_BYTES &&
      acceptedParity.authority?.sha256 === AUTHORITY_SHA256 &&
      acceptedParity.browser_errors === 0 &&
      acceptedParity.required_network_errors === 0 &&
      acceptedParity.comparisons?.dom === "EQUAL" &&
      acceptedParity.comparisons?.geometry === "EQUAL" &&
      acceptedParity.comparisons?.computed_style === "EQUAL" &&
      acceptedParity.comparisons?.runtime_state === "EQUAL" &&
      acceptedParity.comparisons?.interactions === "EQUAL" &&
      acceptedParity.comparisons?.screenshots === "CANONICAL_PIXEL_HAMMING_WITHIN_THRESHOLD" &&
      Number.isInteger(acceptedParity.comparisons?.canonical_pixel_hamming_max) &&
      acceptedParity.comparisons.canonical_pixel_hamming_max >= 0 &&
      Number.isInteger(acceptedParity.comparisons?.canonical_pixel_threshold) &&
      acceptedParity.comparisons.canonical_pixel_threshold >= 1 &&
      acceptedParity.comparisons.canonical_pixel_threshold <= 32 &&
      acceptedParity.comparisons.canonical_pixel_hamming_max <= acceptedParity.comparisons.canonical_pixel_threshold &&
      acceptedParity.visual_review?.central_direct_artifact_review === true,
    acceptedParity
      ? `status=${acceptedParity.status} tier=${acceptedParity.tier} hamming=${acceptedParity.comparisons?.canonical_pixel_hamming_max}/${acceptedParity.comparisons?.canonical_pixel_threshold}`
      : "evidence/parity/accepted-parity.json is missing",
  );
  checkTrue(
    "C17b the accepted record pins the capture head and matches the comparison record's head",
    acceptedParity !== null &&
      fs.existsSync(comparisonPath) &&
      acceptedParity.capture_head === readJson(comparisonPath).repository_head,
    `accepted.capture_head=${acceptedParity?.capture_head}`,
  );

  // C18/C19 are coherence gates for the candidate artifact when browser mode has
  // already run; they are informational otherwise so contract mode stays green
  // before any capture exists.
  if (fs.existsSync(candidatePath) && fs.existsSync(comparisonPath)) {
    const candidate = readJson(candidatePath);
    const comparison = readJson(comparisonPath);
    const channelNames = ["dom", "geometry", "computed_style", "runtime_state", "interactions", "screenshots"];
    const channelDrift = {};
    for (const name of channelNames) {
      const claimed = candidate.comparisons?.[name];
      const measured = comparison.comparison?.[name];
      channelDrift[name] = [claimed, measured];
    }
    check(
      "C18 candidate parity artifact is coherent with the comparison record",
      {
        source_id: candidate.source_id,
        authority: [candidate.authority.bytes, candidate.authority.sha256],
        channels: channelDrift,
        browser_errors: [candidate.browser_errors, comparison.browser_errors],
        failed_responses: [candidate.failed_responses, comparison.failed_responses],
        unexpected_failed_requests: [candidate.unexpected_failed_requests, comparison.unexpected_request_failures],
        remote_requests: [candidate.remote_requests, comparison.remote_requests],
        state_count: [candidate.state_count, comparison.state_count],
      },
      {
        source_id: CODEX_ID,
        authority: [AUTHORITY_BYTES, AUTHORITY_SHA256],
        channels: channelNames.reduce((acc, name) => {
          acc[name] = [channelDrift[name][1], channelDrift[name][1]];
          return acc;
        }, {}),
        browser_errors: [comparison.browser_errors, comparison.browser_errors],
        failed_responses: [comparison.failed_responses, comparison.failed_responses],
        unexpected_failed_requests: [comparison.unexpected_request_failures, comparison.unexpected_request_failures],
        remote_requests: [comparison.remote_requests, comparison.remote_requests],
        state_count: [comparison.state_count, comparison.state_count],
      },
    );
    checkTrue(
      "C19 the candidate artifact never claims manifest promotion",
      candidate.manifest_stage_claimed === false,
      "The committed candidate record is the pre-acceptance submission and must not claim promotion. Browser mode derives manifest_stage_claimed from the manifest, so a re-run performed after acceptance records true and this check fails — that means the file no longer represents a pre-acceptance candidate and the acceptance trail needs review.",
    );
    checkTrue(
      "C19c the manifest is promoted exactly as the validator requires for a CONTEXT_AWARE_ONLY capsule",
      manifest.stages.source_split_parity_pass === true &&
        manifest.parity_ref === "evidence/parity/accepted-parity.json" &&
        manifest.capture_surface?.shared_harness_disposition?.["capture-source-parity.mjs"] === "SKIP" &&
        manifest.capture_surface?.shared_harness_disposition?.["capture-source-baseline.mjs"] === "SKIP",
      `source_split_parity_pass=${manifest.stages.source_split_parity_pass} parity_ref=${manifest.parity_ref} parity harness disposition=${manifest.capture_surface?.shared_harness_disposition?.["capture-source-parity.mjs"]}`,
    );
    if (candidate.status === "READY_FOR_CENTRAL_S4_VISUAL_REVIEW" && acceptedParity?.status === "ACCEPTED") {
      results.push(
        `C19b the candidate was submitted READY_FOR_CENTRAL_S4_VISUAL_REVIEW (verdict ${candidate.verdict ?? "n/a"}) and the acceptance act is recorded at evidence/parity/accepted-parity.json (tier ${acceptedParity.tier ?? "n/a"}, central comment ${acceptedParity.central_acceptance_comment ?? "n/a"})`,
      );
    } else {
      results.push(`C19b candidate status ${candidate.status ?? "n/a"} / accepted status ${acceptedParity?.status ?? "absent"}: a browser run whose every channel passes and a CENTRAL acceptance record are both required`);
    }
    checkTrue(
      "C20 the candidate's promotion instruction still requires the literal validator path",
      JSON.stringify(candidate.promotion_instruction.required_for_context_aware_claim).includes("evidence/parity/accepted-parity.json"),
    );
    const headRe = /^[0-9a-f]{40}$/;
    const candidateHead = candidate.provenance?.repository_head;
    const comparisonHead = comparison.repository_head;
    const acceptedHead = acceptedParity?.capture_head;
    checkTrue(
      "C21 every evidence record is pinned to a 40-hex capture head and all three agree",
      headRe.test(String(candidateHead ?? "")) &&
        headRe.test(String(comparisonHead ?? "")) &&
        headRe.test(String(acceptedHead ?? "")) &&
        candidateHead === comparisonHead &&
        candidateHead === acceptedHead,
      `candidate=${candidateHead} comparison=${comparisonHead} accepted=${acceptedHead}`,
    );
  } else {
    results.push("C18 candidate parity artifact coherence: NOT_RUN (no browser-mode capture yet)");
    results.push("C19 candidate verdict promotion discipline: NOT_RUN (no browser-mode capture yet)");
    results.push("C21 capture-head provenance: NOT_RUN (no browser-mode capture yet)");
  }

  const record = {
    schema_version: "1.0",
    codex_id: CODEX_ID,
    stage: "S4_CONTEXT_AWARE_SERVING_PARITY",
    mode: "CONTRACT",
    generated_at: new Date().toISOString(),
    checks_passed: results.filter((name) => !name.endsWith("NOT_RUN (no browser-mode capture yet)")).length,
    checks_total: results.length,
    checks: results,
    verdict: "CONTRACT_PASS",
    note: "Contract mode proves the disposition, immutability, capture-head provenance and acceptance-coherence invariants only. It never decides runtime parity and never sets stages.source_split_parity_pass; it verifies the state CENTRAL set.",
  };
  writeJson(path.join(EVIDENCE_S4, "contract.json"), record);
  console.log(JSON.stringify({ mode: "CONTRACT", verdict: "CONTRACT_PASS", checks: results.length }, null, 2));
  return record;
}

// ---------------------------------------------------------------------------
// Shared runtime plumbing
// ---------------------------------------------------------------------------

const MIME = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
});

/**
 * Static server rooted at one isolated virtual root. Percent-decoded path
 * segments map the authoring-time Drive hierarchy (Hangul, ·, -) onto the
 * filesystem verbatim; range requests are answered for media so the Source's
 * own <video> elements can play. No URL is rewritten. Every request is logged
 * into the returned sink.
 */
function startVirtualRootServer(rootDir, portHint = 0, sink = []) {
  const root = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    const started = Date.now();
    let pathname;
    try {
      pathname = new URL(req.url, "http://127.0.0.1").pathname;
    } catch {
      res.statusCode = 400;
      res.end("bad request");
      sink.push({ method: req.method, path: req.url, status: 400, bytes: 0, ms: Date.now() - started });
      return;
    }
    if (pathname === "/favicon.ico") {
      res.statusCode = 204;
      res.end();
      sink.push({ method: req.method, path: pathname, status: 204, bytes: 0, ms: Date.now() - started, favicon: true });
      return;
    }
    let decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      res.statusCode = 400;
      res.end("bad encoding");
      sink.push({ method: req.method, path: req.url, status: 400, bytes: 0, ms: Date.now() - started });
      return;
    }
    const segments = decoded.split("/").filter((segment) => segment.length > 0 && segment !== ".");
    const target = path.resolve(root, ...segments);
    if (target !== root && !target.startsWith(root + path.sep)) {
      res.statusCode = 403;
      res.end("forbidden");
      sink.push({ method: req.method, path: pathname, status: 403, bytes: 0, ms: Date.now() - started });
      return;
    }
    let stat;
    try {
      stat = fs.statSync(target);
    } catch {
      res.statusCode = 404;
      res.end("not found");
      sink.push({ method: req.method, path: pathname, status: 404, bytes: 0, ms: Date.now() - started });
      return;
    }
    if (stat.isDirectory()) {
      res.statusCode = 404;
      res.end("not found");
      sink.push({ method: req.method, path: pathname, status: 404, bytes: 0, ms: Date.now() - started });
      return;
    }
    const type = MIME[path.extname(target).toLowerCase()] ?? "application/octet-stream";
    const range = req.headers.range;
    if (range && (type.startsWith("video/") || type.startsWith("audio/"))) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        const start = Number(match[1]);
        const end = match[2] ? Number(match[2]) : stat.size - 1;
        res.statusCode = 206;
        res.setHeader("accept-ranges", "bytes");
        res.setHeader("content-range", `bytes ${start}-${end}/${stat.size}`);
        res.setHeader("content-type", type);
        res.setHeader("content-length", end - start + 1);
        fs.createReadStream(target, { start, end }).pipe(res);
        sink.push({ method: req.method, path: pathname, status: 206, bytes: end - start + 1, ms: 0, ranged: true });
        return;
      }
    }
    res.statusCode = 200;
    res.setHeader("content-type", type);
    res.setHeader("accept-ranges", "bytes");
    res.setHeader("content-length", stat.size);
    res.end(fs.readFileSync(target));
    sink.push({ method: req.method, path: pathname, status: 200, bytes: stat.size, ms: Date.now() - started });
  });

  const SAFE_PORT_CANDIDATES = [8431, 8441, 8451, 8461, 8471, 8481, 8491, 8501];
  return new Promise((resolve, reject) => {
    let i = 0;
    const tryNext = () => {
      const port = portHint ? portHint : i < SAFE_PORT_CANDIDATES.length ? SAFE_PORT_CANDIDATES[i] : 0;
      i += 1;
      const onError = (error) => {
        server.removeListener("error", onError);
        if (error.code === "EADDRINUSE" && i <= SAFE_PORT_CANDIDATES.length + 1) return tryNext();
        return reject(error);
      };
      server.once("error", onError);
      server.listen(port, "127.0.0.1", () => {
        server.removeListener("error", onError);
        resolve(server);
      });
    };
    tryNext();
  });
}

// ---------------------------------------------------------------------------
// Serving root materialization (two isolated A/B roots from one serving root)
// ---------------------------------------------------------------------------

function buildIsolatedRoots(servingRoot, outDir) {
  const mediaHost = path.join(servingRoot, "media-host");
  const roots = {};
  const surfaces = {
    original: { dir: "original", files: { "original.html": path.join(servingRoot, CAPSULE_FOLDER, "original", "original.html") } },
    split: { dir: "split", files: { "index.html": path.join(servingRoot, CAPSULE_FOLDER, "split", "index.html"), "styles.css": path.join(servingRoot, CAPSULE_FOLDER, "split", "styles.css"), "script.js": path.join(servingRoot, CAPSULE_FOLDER, "split", "script.js") } },
  };

  for (const [label, surface] of Object.entries(surfaces)) {
    const root = path.join(outDir, "roots", `${label}-root`);
    const capsuleDir = path.join(root, CAPSULE_FOLDER);
    const surfaceDir = path.join(capsuleDir, surface.dir);
    fs.mkdirSync(surfaceDir, { recursive: true });
    for (const [fileName, sourcePath] of Object.entries(surface.files)) {
      fs.copyFileSync(sourcePath, path.join(surfaceDir, fileName));
    }
    // Pin namespace (authority-context media_inventory paths) and runtime URL
    // namespace (the authority's own ../<SIBLING>/assets/ prefix) are two
    // names for the same media host; neither is copied or rewritten.
    fs.symlinkSync(path.join(mediaHost, "assets"), path.join(capsuleDir, "assets"), "junction");
    fs.symlinkSync(mediaHost, path.join(capsuleDir, SIBLING_FOLDER), "junction");
    roots[label] = { root, capsuleDir, surfaceDir };
  }
  return roots;
}

// ---------------------------------------------------------------------------
// In-page probes (identical code on both surfaces)
// ---------------------------------------------------------------------------

/**
 * Canonical structural serialization of the whole document tree.
 *
 * Three exclusions, each one documented and separately proven elsewhere:
 *   - `style` attributes are dropped: the rAF loop rewrites panel transform /
 *     opacity / zIndex every frame, so they are not structural.
 *   - the four mechanical-glue nodes (one stylesheet declaration + one script
 *     declaration) collapse to a single #GLUE marker. That node IS the entire
 *     structural difference a mechanical split may introduce, and its exact
 *     shape is proven separately by glueProfile() and by S3 T05/T06/T07/T10/T11.
 *     Counting them separately means any OTHER head/body difference still shows.
 *   - <script>/<style> text content is not walked for the same reason.
 */
function domInventory() {
  let glueNodes = 0;
  const walk = (node) => {
    if (node.nodeType === 3) {
      const text = node.nodeValue;
      return text.length ? `#T${text}` : "";
    }
    if (node.nodeType === 8 || node.nodeType === 11) return "";
    const tag = node.tagName.toLowerCase();
    const attrs = [];
    for (const attribute of node.attributes) {
      if (attribute.name === "style") continue;
      attrs.push(`${attribute.name}=${attribute.value}`);
    }
    attrs.sort();
    if (tag === "link" || tag === "script" || tag === "style") {
      glueNodes += 1;
      return "#GLUE";
    }
    const head = `${tag}[${attrs.join(";")}]`;
    const children = [];
    for (const child of node.childNodes) {
      const piece = walk(child);
      if (piece) children.push(piece);
    }
    return children.length ? head + children.join("") : head;
  };
  return { inventory: walk(document.documentElement), glue_node_count: glueNodes };
}

function glueProfile() {
  const link = document.querySelector('link[rel="stylesheet"]');
  const scripts = Array.from(document.scripts).map((script) => ({
    src: script.src ? new URL(script.src, document.baseURI).pathname : null,
    inline_chars: script.textContent.length,
    inline_sha256_len: script.textContent.length,
  }));
  return {
    stylesheet_link_href: link ? link.getAttribute("href") : null,
    external_stylesheets: Array.from(document.styleSheets).map((sheet) => ({ href: sheet.href, css_rules: sheet.cssRules ? sheet.cssRules.length : null })),
    scripts,
    style_block_count: Array.from(document.querySelectorAll("style")).length,
    inline_script_blocks: Array.from(document.scripts).filter((script) => script.textContent.trim().length > 0).length,
  };
}

function geometryFor(selectors) {
  const round = (value) => Math.round(value * 100) / 100;
  const out = {};
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) {
      out[selector] = null;
      continue;
    }
    const rect = element.getBoundingClientRect();
    out[selector] = { x: round(rect.x), y: round(rect.y), w: round(rect.width), h: round(rect.height) };
  }
  return out;
}

function computedStyleFor(args) {
  const { selectors, properties } = args;
  const out = {};
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) {
      out[selector] = null;
      continue;
    }
    const computed = getComputedStyle(element);
    const values = {};
    for (const property of properties) values[property] = computed.getPropertyValue(property);
    // The rAF loop writes panel.style.transform as
    //   translate3d(x,y,z) rotateY(ry) scale(s)
    // every frame, so the raw computed transform matrix is not a stable
    // oracle. `transform` below is the rotation-invariant form: the inline
    // string with only the per-frame rotateY removed, keeping the translate3d
    // and scale that pure layout determines. Selectors without an inline
    // transform keep their computed value, so every other selector is still
    // compared exactly. The raw matrix is retained separately as `transform_raw`
    // — a recording instrument, never a decision input.
    const inlineTransform = element.style.transform || "";
    const rotationMatch = /rotateY\((-?[\d.]+)deg\)/.exec(inlineTransform);
    values.transform_raw = computed.getPropertyValue("transform");
    values.transform_rotation_deg = rotationMatch ? Number(rotationMatch[1]) : null;
    values.transform = inlineTransform
      ? inlineTransform.replace(/rotateY\([^)]*\)/g, "").replace(/\s+/g, " ").trim()
      : values.transform;
    out[selector] = values;
  }
  return out;
}

// The only computed-style keys the Source's rAF loop rewrites every frame are the
// transform triplet of the element whose transform it writes. Everything else is
// static layout. Those three keys are therefore waivable in the decision record
// — and only they — while still being reported in full as an instrument.
const ROTATION_PHASE_KEYS = new Set(["transform", "transform_raw", "transform_rotation_deg"]);

function compareStyleRecords(originalRecord, splitRecord) {
  const hardDifferences = [];
  const rotationPhaseInstrument = {};
  for (const selector of Object.keys(originalRecord)) {
    const a = originalRecord[selector];
    const b = splitRecord[selector];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (!a || !b) {
      hardDifferences.push({ selector, reason: "missing_on_one_surface", original: a, split: b });
      continue;
    }
    const differing = [];
    for (const property of [...new Set([...Object.keys(a), ...Object.keys(b)])]) {
      if (a[property] !== b[property]) differing.push(property);
    }
    if (differing.length > 0 && differing.every((property) => ROTATION_PHASE_KEYS.has(property))) {
      rotationPhaseInstrument[selector] = {
        properties: differing,
        original: Object.fromEntries(differing.map((property) => [property, a[property]])),
        split: Object.fromEntries(differing.map((property) => [property, b[property]])),
      };
    } else {
      hardDifferences.push({
        selector,
        properties: differing,
        original: Object.fromEntries(differing.map((property) => [property, a[property]])),
        split: Object.fromEntries(differing.map((property) => [property, b[property]])),
      });
    }
  }
  return {
    verdict: hardDifferences.length === 0 ? "EQUAL" : "DIFFERENT",
    hard_differences: hardDifferences,
    rotation_phase_instrument: rotationPhaseInstrument,
  };
}

function runtimeState() {
  const byId = (id) => document.getElementById(id);
  const drawer = byId("drawer");
  const viewer = byId("viewer");
  const pause = byId("pause");
  const panels = Array.from(document.querySelectorAll("#deck .panel"));
  const deckVideos = panels
    .map((panel) => panel.querySelector("video"))
    .filter((video) => video && video.dataset && video.dataset.src);
  const viewerVideo = viewer.querySelector("video");
  const indexItems = Array.from(document.querySelectorAll(".index-item"));
  const active = document.querySelector(".index-item.active");
  return {
    document_title: document.title,
    html_lang: document.documentElement.lang,
    panels: panels.length,
    panel_aria_labels: panels.map((panel) => panel.getAttribute("aria-label")),
    panel_slot_classes: panels.map((panel) => ({
      slot: panel.dataset.slot,
      type_card: panel.classList.contains("type-card"),
      text_card: panel.classList.contains("text-card"),
    })),
    index_items: indexItems.length,
    index_items_active: active ? Number(active.dataset.index) : null,
    index_item_labels_first: indexItems.slice(0, 3).map((item) => item.getAttribute("aria-label")),
    index_item_labels_last: indexItems.slice(-3).map((item) => item.getAttribute("aria-label")),
    current_no: byId("currentNo") ? byId("currentNo").textContent : null,
    pause_label: pause ? pause.textContent : null,
    drawer_open: drawer ? drawer.classList.contains("open") : null,
    viewer_open: viewer ? viewer.classList.contains("open") : null,
    viewer_aria_hidden: viewer ? viewer.getAttribute("aria-hidden") : null,
    viewer_title: byId("viewerTitle") ? byId("viewerTitle").textContent : null,
    viewer_meta: byId("viewerMeta") ? byId("viewerMeta").textContent : null,
    viewer_video_count: viewerVideo ? 1 : 0,
    viewer_video: viewerVideo
      ? {
          ready_state: viewerVideo.readyState,
          paused: viewerVideo.paused,
          muted: viewerVideo.muted,
          video_width: viewerVideo.videoWidth,
          video_height: viewerVideo.videoHeight,
          src_path: viewerVideo.src ? new URL(viewerVideo.src, document.baseURI).pathname : null,
          poster_path: viewerVideo.poster ? new URL(viewerVideo.poster, document.baseURI).pathname : null,
        }
      : null,
    deck_videos: deckVideos.length,
    deck_video_ready_states: deckVideos.map((video) => video.readyState),
    deck_video_paused: deckVideos.map((video) => video.paused),
    deck_video_opacities: deckVideos.map((video) => getComputedStyle(video).opacity),
    deck_video_src_paths: deckVideos.map((video) => (video.getAttribute("src") ? new URL(video.getAttribute("src"), document.baseURI).pathname : null)),
    deck_video_dataset_src_paths: deckVideos.map((video) => new URL(video.dataset.src, document.baseURI).pathname),
    img_count: document.images.length,
    img_paths: Array.from(document.images).map((image) => new URL(image.src, document.baseURI).pathname),
    canvas_count: document.querySelectorAll("canvas").length,
    iframe_count: document.querySelectorAll("iframe").length,
  };
}

function panelRotationDeg() {
  const panel = document.querySelectorAll("#deck .panel")[3];
  if (!panel) return null;
  const match = /rotateY\((-?[\d.]+)deg\)/.exec(panel.style.transform || "");
  return match ? Number(match[1]) : null;
}

/**
 * Viewport rectangles of every <video> element in the document. The Source's
 * own videos keep decoding frames after the rotation is halted (managePlayback
 * re-plays the two nearest slots every 20 frames and the viewer video autoplays),
 * so a video rectangle is the one region where two runs of the SAME surface
 * differ by decoder frame choice. Those rectangles are recorded so the
 * screenshot decision can be reported both with and without them masked.
 */
function videoRects() {
  return Array.from(document.querySelectorAll("video")).map((video) => {
    const rect = video.getBoundingClientRect();
    return {
      x: Math.round(rect.x * 100) / 100,
      y: Math.round(rect.y * 100) / 100,
      w: Math.round(rect.width * 100) / 100,
      h: Math.round(rect.height * 100) / 100,
      ready_state: video.readyState,
      paused: video.paused,
      src_path: video.getAttribute("src") ? new URL(video.getAttribute("src"), document.baseURI).pathname : null,
    };
  });
}

function settleCondition() {
  return document.readyState === "complete"
    && document.querySelectorAll("#deck .panel").length === 7
    && document.querySelectorAll(".index-item").length === 89;
}

// ---------------------------------------------------------------------------
// State drivers (Source-native event surface only, no injected hooks)
// ---------------------------------------------------------------------------

/** The #pause control's label: Ⅱ while auto-rotation runs, ▶ while halted. */
function pauseLabel() {
  const button = document.getElementById("pause");
  return button ? button.textContent.trim() : null;
}

async function readPauseLabel(page) {
  return page.evaluate(pauseLabel);
}

/**
 * Panel 3 is `data-slot="3"`, so pos = s - floor(SLOTS/2) = 0 and its
 * translate3d is (0,0,0): it only rotates about its own centre, so its centre
 * is fixed in viewport coordinates whatever the rotation phase. A trusted
 * pointer click at that measured centre therefore always hits panel 3, which
 * makes the opened film deterministic — slots[3].filmIndex = mod(selected, 89),
 * i.e. film 001 from INITIAL — instead of depending on which panel the pointer
 * happens to meet.
 *
 * locator.click() cannot be used here: while the sculpture rotates the element
 * is never "stable" and Playwright retries the actionability check forever.
 * page.mouse.click() dispatches real trusted input (so the Source's own
 * setPointerCapture does not throw) and performs no stability wait.
 */
async function openViewerOnPanel3(page) {
  const box = await page.locator("#deck .panel").nth(3).boundingBox();
  if (!box || box.width <= 0 || box.height <= 0) throw new Error("panel 3 has no bounding box");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function enterState(page, state) {
  switch (state) {
    case "INITIAL":
      return;
    case "INDEX_DRAWER_OPEN":
      await page.click("#indexTrigger");
      return;
    case "VIEWER_OPEN":
      await openViewerOnPanel3(page);
      return;
    case "PAUSED":
      await page.click("#pause");
      return;
    default:
      throw new Error(`unknown state: ${state}`);
  }
}

const SETTLE_AFTER_LOAD_MS = 1600;
const SETTLE_AFTER_STATE_MS = 900;
const CONVERGE_POLL_MS = 130;
const CONVERGE_TIMEOUT_MS = 5000;
const CONVERGE_EPSILON_DEG = 0.005;
const CONVERGE_REQUIRED_SAMPLES = 3;

/**
 * Poll the sculpture's rotation until it is measurably at rest. The Source
 * advances targetRotation only while auto-rotation is on and eases rotation
 * toward it with a .075/frame lerp, so convergence is a property to OBSERVE,
 * not a duration to assume.
 */
async function waitUntilRotationConverged(page) {
  const samples = [];
  const deadline = Date.now() + CONVERGE_TIMEOUT_MS;
  let stable = 0;
  let previous = null;
  do {
    const value = await page.evaluate(panelRotationDeg);
    samples.push(value);
    if (previous !== null && value !== null && Math.abs(value - previous) < CONVERGE_EPSILON_DEG) stable += 1;
    else stable = 0;
    previous = value;
    if (stable >= CONVERGE_REQUIRED_SAMPLES) break;
    await page.waitForTimeout(CONVERGE_POLL_MS);
  } while (Date.now() < deadline);
  const first = samples.find((value) => value !== null);
  const last = samples[samples.length - 1];
  return {
    samples,
    sample_count: samples.length,
    converged: stable >= CONVERGE_REQUIRED_SAMPLES,
    rotation_delta_deg: first !== null && last !== null ? Math.round((last - first) * 1000) / 1000 : null,
    poll_ms: CONVERGE_POLL_MS,
    epsilon_deg: CONVERGE_EPSILON_DEG,
    required_stable_samples: CONVERGE_REQUIRED_SAMPLES,
  };
}

/**
 * One isolated browser context per surface, with its own error ledger. A fresh
 * context per capture means no state can leak from one (viewport, state,
 * surface) triple into the next.
 */
async function openSurfaceSession(browser, label, port, viewport, { reducedMotion = "no-preference" } = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion,
    locale: "ko-KR",
  });
  const page = await context.newPage();
  const ledgers = {
    console_errors: [],
    page_errors: [],
    request_failures: [],
    failed_responses: [],
    remote_requests: [],
    responses: 0,
  };
  page.on("console", (message) => {
    if (message.type() === "error") ledgers.console_errors.push(message.text());
  });
  page.on("pageerror", (error) => ledgers.page_errors.push(String(error && error.message ? error.message : error)));
  page.on("requestfailed", (request) => {
    ledgers.request_failures.push({ url: new URL(request.url()).pathname, failure: request.failure() ? request.failure().errorText : null });
  });
  page.on("response", (response) => {
    ledgers.responses += 1;
    const url = response.url();
    if (response.status() >= 400) ledgers.failed_responses.push({ status: response.status(), path: new URL(url).pathname });
    if (!/^https?:\/\/127\.0\.0\.1:\d+/.test(url)) ledgers.remote_requests.push(url);
  });
  const documentUrl = documentUrlFor(label, port);
  return { context, page, ledgers, documentUrl };
}

/**
 * Halted-rotation variant used ONLY for the screenshot decision capture.
 *
 * The auto-rotation must be halted BEFORE the state action is applied: once the
 * viewer is open its overlay covers #pause, so halting afterwards is impossible.
 * The #pause control is the Source's own auto-rotation toggle (label Ⅱ while
 * running, ▶ while halted); convergence is then OBSERVED by polling the panel
 * transform rather than assumed as a duration. The identical sequence is run on
 * both surfaces, so this is a normalization, not a tolerance.
 */
async function captureSettledFrame(browser, label, port, viewport, state, outDir, fileTag) {
  const session = await openSurfaceSession(browser, label, port, viewport);
  try {
    const response = await session.page.goto(session.documentUrl, { waitUntil: "load", timeout: 60000 });
    if (!response || response.status() !== 200) throw new Error(`${label} settled ${viewport.key} ${state}: HTTP ${response && response.status()}`);
    await session.page.waitForFunction(settleCondition, null, { timeout: 30000 });
    await session.page.waitForTimeout(SETTLE_AFTER_LOAD_MS);

    const sequence = [];
    let convergence;
    if (state === "PAUSED") {
      await session.page.click("#pause");
      sequence.push("click #pause — the state itself halts the rAF target advance");
      convergence = await waitUntilRotationConverged(session.page);
    } else {
      const labelBefore = await readPauseLabel(session.page);
      if (labelBefore === "\u2161") {
        await session.page.click("#pause");
        sequence.push("click #pause — halt auto-rotation (rendering determinism normalization)");
      } else {
        sequence.push("auto-rotation already halted");
      }
      convergence = await waitUntilRotationConverged(session.page);
      if (state === "INITIAL") {
        sequence.push("no state action");
      } else {
        await enterState(session.page, state);
        await session.page.waitForTimeout(SETTLE_AFTER_STATE_MS);
        sequence.push(`enter ${state}`);
      }
    }
    await session.page.waitForTimeout(300);
    const videos = await session.page.evaluate(videoRects);
    const file = path.join(outDir, "screens", `${fileTag ?? label}-${viewport.key}-${state}-settled.png`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await session.page.screenshot({ path: file, fullPage: false });
    return {
      file,
      http_status: response.status(),
      sequence,
      convergence,
      rotation_deg_at_capture: (() => {
        const last = convergence.samples[convergence.samples.length - 1];
        return typeof last === "number" ? last : null;
      })(),
      video_rects: videos,
      ledgers: {
        console_errors: session.ledgers.console_errors.slice(),
        page_errors: session.ledgers.page_errors.slice(),
        request_failures: session.ledgers.request_failures.slice(),
        failed_responses: session.ledgers.failed_responses.slice(),
        remote_requests: session.ledgers.remote_requests.slice(),
      },
    };
  } finally {
    await session.context.close();
  }
}

async function captureLiveFrame(page, outDir, label, viewportKey, state) {
  const file = path.join(outDir, "screens", `${label}-${viewportKey}-${state}-live.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

// ---------------------------------------------------------------------------
// Interactions (Source-native proofs, compared exactly)
// ---------------------------------------------------------------------------

async function captureInteractions(page) {
  const record = {};
  const currentNo = () => page.evaluate(() => document.getElementById("currentNo").textContent);
  const wheelStep = (steps) =>
    page.evaluate((count) => {
      const stage = document.getElementById("stage");
      for (let i = 0; i < count; i += 1) {
        stage.dispatchEvent(new WheelEvent("wheel", { deltaY: 1, bubbles: true, cancelable: true }));
      }
    }, steps);

  // PREV_NEXT_NAVIGATION_001_002_001_089_WRAP — the wheel listener lives on
  // #stage, so the synthetic wheel events are dispatched on #stage itself.
  const nav = [await currentNo()];
  await page.click("#next");
  nav.push(await currentNo());
  await page.click("#next");
  nav.push(await currentNo());
  await page.click("#prev");
  nav.push(await currentNo());
  await page.click("#prev");
  nav.push(await currentNo());
  await wheelStep(88);
  nav.push(await currentNo());
  await wheelStep(1);
  nav.push(await currentNo());
  record.PREV_NEXT_NAVIGATION = {
    sequence: nav,
    expected: ["001", "002", "003", "002", "001", "089", "001"],
    matches_expected: JSON.stringify(nav) === JSON.stringify(["001", "002", "003", "002", "001", "089", "001"]),
  };

  // PAUSE_TOGGLE
  const pauseFirst = await readPauseLabel(page);
  await page.click("#pause");
  const pauseAfterFirst = await readPauseLabel(page);
  await page.click("#pause");
  const pauseAfterSecond = await readPauseLabel(page);
  record.PAUSE_TOGGLE = { initial: pauseFirst, after_first_click: pauseAfterFirst, after_second_click: pauseAfterSecond };

  // INDEX_DRAWER_OPEN_CLOSE_ESC
  await page.evaluate(() => document.getElementById("drawerClose").click());
  await page.click("#indexTrigger");
  await page
    .waitForFunction(() => document.getElementById("drawer")?.classList.contains("open") === true, null, { timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(200);
  const drawerOpen = await page.evaluate(() => document.getElementById("drawer").classList.contains("open"));
  await page.keyboard.press("Escape");
  const drawerAfterEsc = await page.evaluate(() => document.getElementById("drawer").classList.contains("open"));
  record.INDEX_DRAWER_OPEN_CLOSE_ESC = { drawer_open: drawerOpen, drawer_after_escape: drawerAfterEsc };

  // VIEWER_OPEN_CLOSE_ESC
  await openViewerOnPanel3(page);
  // The Source adds .open from its own click handler; wait for that class rather
  // than assuming a fixed delay, so the probe cannot fail on scheduling alone.
  await page
    .waitForFunction(() => document.getElementById("viewer")?.classList.contains("open") === true, null, { timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(200);
  const viewerOpen = await page.evaluate(() => document.getElementById("viewer").classList.contains("open"));
  const viewerVideoBefore = await page.evaluate(() => {
    const video = document.querySelector("#viewer video");
    return video ? { ready_state: video.readyState, video_width: video.videoWidth, muted: video.muted } : null;
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const viewerAfterEsc = await page.evaluate(() => document.getElementById("viewer").classList.contains("open"));
  const viewerMediaAfterEsc = await page.evaluate(() => document.getElementById("viewerMedia").children.length);
  record.VIEWER_OPEN_CLOSE_ESC = { viewer_open: viewerOpen, viewer_video: viewerVideoBefore, viewer_after_escape: viewerAfterEsc, viewer_media_children_after_escape: viewerMediaAfterEsc };

  return record;
}

// ---------------------------------------------------------------------------
// Screenshot comparison (SRC060 canonical-16 technique + raw delta instrument)
//
// One PNG crosses the page boundary per call (SRC069 precedent) so the base64
// payload never accumulates in a single evaluate argument. The canonical-16
// digest is the DECISION; the full-frame pixel delta is a RECORDING
// INSTRUMENT that never decides equality.
// ---------------------------------------------------------------------------

const PNG_BLANK = "<!doctype html><html><body></body></html>";
const SCREENSHOT_FULL = "BYTE_IDENTICAL_CANONICAL_PIXEL_DIGEST";
const SCREENSHOT_PHASE_ATTRIBUTED = "NOT_BYTE_IDENTICAL_ATTRIBUTED_TO_ROTATION_PHASE";

/**
 * One call compares one settled A/B pair and returns full-frame AND
 * video-masked canonical-16 digests plus a full-frame RGBA delta. Decoding
 * happens in the page so the runner stays on Playwright and Node built-ins only.
 *
 * The mask is the union of every <video> rectangle seen on either surface. The
 * Source's own videos keep decoding frames after the rotation is halted
 * (managePlayback re-plays the two nearest slots every 20 frames; the viewer
 * video autoplays), so a video rectangle is the one region where two runs of
 * the SAME surface differ by decoder frame choice. Masking uses one identical
 * rectangle set on both sides, so the comparison stays symmetric.
 */
async function compareSettledFrames(page, pngA, pngB, maskRects) {
  const [b64a, b64b] = [fs.readFileSync(pngA).toString("base64"), fs.readFileSync(pngB).toString("base64")];
  return page.evaluate(async ({ srcA, srcB, mask }) => {
    const load = (src) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("png decode failed"));
        image.src = `data:image/png;base64,${src}`;
      });
    const rasterize = async (src) => {
      const image = await load(src);
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      return { width: image.naturalWidth, height: image.naturalHeight, canvas, ctx };
    };
    const canonical16 = (canvas) => {
      const N = 16;
      const small = document.createElement("canvas");
      small.width = N;
      small.height = N;
      const ctx = small.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(canvas, 0, 0, N, N);
      const px = ctx.getImageData(0, 0, N, N).data;
      let hex = "";
      for (let i = 0; i < px.length; i += 1) {
        const channel = (i % 4 === 3 ? px[i] : px[i] & 0xf0).toString(16);
        hex += channel.length === 1 ? `0${channel}` : channel;
      }
      return hex;
    };
    const maskedCopy = (sourceCanvas) => {
      const copy = document.createElement("canvas");
      copy.width = sourceCanvas.width;
      copy.height = sourceCanvas.height;
      const copyCtx = copy.getContext("2d");
      copyCtx.drawImage(sourceCanvas, 0, 0);
      for (const rect of mask) {
        copyCtx.fillStyle = "#000000";
        copyCtx.fillRect(Math.floor(rect.x), Math.floor(rect.y), Math.ceil(rect.w), Math.ceil(rect.h));
      }
      return copy;
    };
    const [ra, rb] = await Promise.all([rasterize(srcA), rasterize(srcB)]);
    if (ra.width !== rb.width || ra.height !== rb.height) {
      return {
        size_mismatch: { original: [ra.width, ra.height], split: [rb.width, rb.height] },
        differing_pixels: null,
      };
    }
    const pixelsA = ra.ctx.getImageData(0, 0, ra.width, ra.height).data;
    const pixelsB = rb.ctx.getImageData(0, 0, rb.width, rb.height).data;
    const masked = new Uint8Array(ra.width * ra.height);
    for (const rect of mask) {
      const x0 = Math.max(0, Math.floor(rect.x));
      const x1 = Math.min(ra.width, Math.ceil(rect.x + rect.w));
      const y0 = Math.max(0, Math.floor(rect.y));
      const y1 = Math.min(ra.height, Math.ceil(rect.y + rect.h));
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) masked[y * ra.width + x] = 1;
      }
    }
    let differing = 0;
    let outsideMask = 0;
    let insideMask = 0;
    let maxSum = 0;
    let maxChannel = 0;
    let minX = ra.width;
    let minY = ra.height;
    let maxX = -1;
    let maxY = -1;
    for (let i = 0; i < pixelsA.length; i += 4) {
      let sum = 0;
      for (let channel = 0; channel < 4; channel += 1) {
        const delta = Math.abs(pixelsA[i + channel] - pixelsB[i + channel]);
        if (delta > maxChannel) maxChannel = delta;
        sum += delta;
      }
      if (sum > 0) {
        differing += 1;
        if (masked[i / 4]) insideMask += 1;
        else outsideMask += 1;
        if (sum > maxSum) maxSum = sum;
        const x = (i / 4) % ra.width;
        const y = Math.floor(i / 4 / ra.width);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    return {
      frame: { width: ra.width, height: ra.height },
      differing_pixels: differing,
      differing_pixel_ratio: ra.width * ra.height > 0 ? Math.round((differing / (ra.width * ra.height)) * 1e8) / 1e8 : 0,
      differing_pixels_outside_mask: outsideMask,
      differing_pixels_inside_mask: insideMask,
      max_channel_delta_sum: maxSum,
      max_channel_delta: maxChannel,
      bbox: maxX >= 0 ? { x: [minX, maxX], y: [minY, maxY] } : null,
      mask_rect_count: mask.length,
      canonical16: { original: canonical16(ra.canvas), split: canonical16(rb.canvas) },
      canonical16_masked: { original: canonical16(maskedCopy(ra.canvas)), split: canonical16(maskedCopy(rb.canvas)) },
    };
  }, { srcA: b64a, srcB: b64b, mask: maskRects });
}

// ---------------------------------------------------------------------------
// Media identity: all 178 pins resolved through both surfaces' real URL shape
// ---------------------------------------------------------------------------

async function auditMedia(context, ports, pins) {
  const out = { pins_total: pins.length, per_surface: {} };
  for (const [label, port] of Object.entries(ports)) {
    const surface = label === "original" ? "/original/original.html" : "/split/index.html";
    const urlFor = (pinPath) => {
      // Pin paths are rooted at the capsule folder with the live 12-1_ name.
      // The authority's runtime prefix uses the authoring-time 12_ name, which
      // sits one level inside the capsule folder:
      //   ../<SIBLING>/assets/... resolved from <CAPSULE>/<surface dir>/
      const assetTail = pinPath.slice(pinPath.indexOf("/assets/"));
      return `http://127.0.0.1:${port}/${CAPSULE_FOLDER}/${SIBLING_FOLDER}${assetTail}`;
    };
    let resolved = 0;
    let hashMatched = 0;
    let failed = [];
    for (const pin of pins) {
      const response = await fetch(urlFor(pin.path));
      if (!response.ok) {
        failed.push({ path: pin.path, status: response.status });
        continue;
      }
      resolved += 1;
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length === pin.bytes && sha256(body) === pin.sha256) hashMatched += 1;
      else failed.push({ path: pin.path, pinned_bytes: pin.bytes, got_bytes: body.length, pinned_sha256: pin.sha256, got_sha256: sha256(body) });
    }
    out.per_surface[label] = {
      url_shape: `http://127.0.0.1:${port}/${CAPSULE_FOLDER}/${SIBLING_FOLDER}/assets/...`,
      document_path: surface,
      resolved_200: resolved,
      hash_matched: hashMatched,
      failed: failed,
      failed_count: failed.length,
    };
  }
  out.all_pins_resolved_on_both_surfaces = Object.values(out.per_surface).every((entry) => entry.resolved_200 === pins.length && entry.failed_count === 0);
  out.http_404_total = Object.values(out.per_surface).reduce((sum, entry) => sum + entry.failed.filter((failure) => failure.status === 404).length, 0);
  out.url_rewrites_applied = 0;
  return out;
}

// ---------------------------------------------------------------------------
// Browser mode
// ---------------------------------------------------------------------------

async function runBrowserMode(servingRoot, outDir) {
  const { chromium } = await import("playwright");
  const context = readJson(path.join(CAPSULE, "authority-context.json"));
  const manifest = readJson(path.join(CAPSULE, "manifest.json"));
  const pins = context.media_inventory.entries;

  fs.mkdirSync(outDir, { recursive: true });
  fs.rmSync(path.join(outDir, "roots"), { recursive: true, force: true });
  fs.rmSync(path.join(outDir, "screens"), { recursive: true, force: true });
  const roots = buildIsolatedRoots(servingRoot, outDir);
  const log = (line) => console.error(`[cdx014-s4] ${line}`);
  const servers = [];
  const sinks = { original: [], split: [] };
  let browser;
  try {
    servers.push(await startVirtualRootServer(roots.original.root, 0, sinks.original));
    servers.push(await startVirtualRootServer(roots.split.root, 0, sinks.split));
    const ports = { original: servers[0].address().port, split: servers[1].address().port };

    const mediaAudit = await auditMedia(context, ports, pins);
    log(`serving ready on 127.0.0.1:${ports.original} (original) / 127.0.0.1:${ports.split} (split); media ${mediaAudit.all_pins_resolved_on_both_surfaces ? "ALL 178 RESOLVED ON BOTH" : "RESOLUTION FAILURE"}`);

    browser = await chromium.launch({
      headless: true,
      channel: "chrome",
      timeout: 120000,
      args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"],
    });
    log(`chrome launched (${await browser.version()})`);
    const captures = [];

    for (const viewport of VIEWPORTS) {
      for (const state of STATES) {
        const entry = { viewport: viewport.key, state };
        for (const [label, port] of Object.entries(ports)) {
          // LIVE capture: the state exactly as the Source leaves it, rotation
          // running. Structural channels are read from here.
          const session = await openSurfaceSession(browser, label, port, viewport);
          try {
            const response = await session.page.goto(session.documentUrl, { waitUntil: "load", timeout: 60000 });
            if (!response || response.status() !== 200) throw new Error(`${label} ${viewport.key} ${state}: HTTP ${response && response.status()}`);
            await session.page.waitForFunction(settleCondition, null, { timeout: 30000 });
            await session.page.waitForTimeout(SETTLE_AFTER_LOAD_MS);
            await enterState(session.page, state);
            await session.page.waitForTimeout(SETTLE_AFTER_STATE_MS);
            entry[label] = {
              http_status: response.status(),
              canonical_virtual_path: new URL(session.documentUrl).pathname,
              dom_inventory: await session.page.evaluate(domInventory),
              glue: await session.page.evaluate(glueProfile),
              geometry: await session.page.evaluate(geometryFor, GEOMETRY_SELECTORS),
              computed_style: await session.page.evaluate(computedStyleFor, { selectors: STYLE_SELECTORS, properties: STYLE_PROPERTIES }),
              runtime_state: await session.page.evaluate(runtimeState),
              screenshots_live: await captureLiveFrame(session.page, outDir, label, viewport.key, state),
            };
            // Ledgers are read after the live screenshot so a failure raised
            // while capturing is still counted.
            entry[label].console_errors = session.ledgers.console_errors.slice();
            entry[label].page_errors = session.ledgers.page_errors.slice();
            entry[label].request_failures = session.ledgers.request_failures.slice();
            entry[label].failed_responses = session.ledgers.failed_responses.slice();
            entry[label].remote_requests = session.ledgers.remote_requests.slice();
            entry[label].response_count = session.ledgers.responses;
          } finally {
            await session.context.close();
          }
        }
        // SETTLED capture: a fresh page per surface running the documented
        // halt-then-act sequence. Only the screenshot decision comes from here.
        for (const [label, port] of Object.entries(ports)) {
          entry[label].screens_settled = await captureSettledFrame(browser, label, port, viewport, state, outDir);
        }
        // CONTROL capture: the ORIGINAL surface again, same viewport and state,
        // a brand-new run. Halting the Source's continuous auto-rotation with
        // its own pause control freezes whatever rotation phase is current, so
        // two runs of ONE surface legitimately differ. This control measures
        // that floor so the split is judged against the Source's own run-to-run
        // noise instead of against zero.
        entry.original.control_repeat = await captureSettledFrame(
          browser,
          "original",
          ports.original,
          viewport,
          state,
          outDir,
          "original-control",
        );

        const a = entry.original;
        const b = entry.split;
        entry.dom = a.dom_inventory.inventory === b.dom_inventory.inventory ? "EQUAL" : "DIFFERENT";
        entry.dom_digest = {
          original: sha256(a.dom_inventory.inventory),
          split: sha256(b.dom_inventory.inventory),
          length: { original: a.dom_inventory.inventory.length, split: b.dom_inventory.inventory.length },
        };
        entry.glue_node_count = { original: a.dom_inventory.glue_node_count, split: b.dom_inventory.glue_node_count };
        entry.geometry = JSON.stringify(a.geometry) === JSON.stringify(b.geometry) ? "EQUAL" : "DIFFERENT";
        const styleComparison = compareStyleRecords(a.computed_style, b.computed_style);
        entry.computed_style = styleComparison.verdict;
        entry.computed_style_hard_differences = styleComparison.hard_differences;
        entry.computed_style_rotation_phase_instrument = styleComparison.rotation_phase_instrument;
        entry.runtime_state = JSON.stringify(a.runtime_state) === JSON.stringify(b.runtime_state) ? "EQUAL" : "DIFFERENT";
        entry.glue = { original: a.glue, split: b.glue };
        captures.push(entry);
        log(
          `${entry.viewport} ${state}: dom=${entry.dom} geometry=${entry.geometry} style=${entry.computed_style} runtime=${entry.runtime_state}`
            + ` livePNG=${sha256(fs.readFileSync(entry.original.screenshots_live)) === sha256(fs.readFileSync(entry.split.screenshots_live)) ? "identical" : "differs"}`,
        );
      }
    }

    // Interactions, once per surface at the desktop viewport.
    const interactions = {};
    for (const [label, port] of Object.entries(ports)) {
      const surfaceContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: "no-preference", locale: "ko-KR" });
      const page = await surfaceContext.newPage();
      await page.goto(documentUrlFor(label, port), { waitUntil: "load", timeout: 60000 });
      await page.waitForFunction(settleCondition, null, { timeout: 30000 });
      await page.waitForTimeout(SETTLE_AFTER_LOAD_MS);
      interactions[label] = await captureInteractions(page);
      await surfaceContext.close();
    }
    const interactionsEqual = JSON.stringify(interactions.original) === JSON.stringify(interactions.split);

    // Frozen defect D1: auto-rotation under prefers-reduced-motion: reduce.
    const d1 = { frozen_defect: "D1", name: "auto-rotation not gated on prefers-reduced-motion", reduced_motion: "reduce", window_ms: 1500, surfaces: {} };
    for (const [label, port] of Object.entries(ports)) {
      const surfaceContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce", locale: "ko-KR" });
      const page = await surfaceContext.newPage();
      await page.goto(documentUrlFor(label, port), { waitUntil: "load", timeout: 60000 });
      await page.waitForFunction(settleCondition, null, { timeout: 30000 });
      await page.waitForTimeout(SETTLE_AFTER_LOAD_MS);
      const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
      const first = await page.evaluate(panelRotationDeg);
      await page.waitForTimeout(1500);
      const second = await page.evaluate(panelRotationDeg);
      const delta = first !== null && second !== null ? Math.round((second - first) * 100) / 100 : null;
      d1.surfaces[label] = {
        reduced_motion_matches: reduced,
        rotation_deg_t0: first,
        rotation_deg_t1: second,
        rotation_delta_deg: delta,
        rotates_under_reduced_motion: delta !== null && Math.abs(delta) > 1,
      };
      await surfaceContext.close();
    }
    const d1BaselineContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: "no-preference", locale: "ko-KR" });
    const baselinePage = await d1BaselineContext.newPage();
    await baselinePage.goto(documentUrlFor("original", ports.original), { waitUntil: "load", timeout: 60000 });
    await baselinePage.waitForFunction(settleCondition, null, { timeout: 30000 });
    await baselinePage.waitForTimeout(SETTLE_AFTER_LOAD_MS);
    const baselineFirst = await baselinePage.evaluate(panelRotationDeg);
    await baselinePage.waitForTimeout(1500);
    const baselineSecond = await baselinePage.evaluate(panelRotationDeg);
    d1.surfaces.no_preference_reference = {
      rotation_delta_deg: Math.round((baselineSecond - baselineFirst) * 100) / 100,
    };
    await d1BaselineContext.close();
    d1.both_surfaces_rotate_under_reduced_motion =
      d1.surfaces.original.rotates_under_reduced_motion && d1.surfaces.split.rotates_under_reduced_motion;
    d1.disposition = d1.both_surfaces_rotate_under_reduced_motion ? "PRESERVED_IDENTICALLY" : "DIFFERENT";
    d1.note = "D1 is preserved, not fixed: both surfaces keep auto-rotating under prefers-reduced-motion: reduce.";

    // Screenshot decisions: the canonical-16 digest of the settled frames,
    // computed twice — full frame (the decision) and with the Source's own
    // video rectangles masked (the documented video-decode normalization) —
    // plus a full-frame RGBA delta, which is a recording instrument only and
    // never decides equality.
    const shotComparePage = await browser.newPage();
    await shotComparePage.setContent(PNG_BLANK);
    let canonicalAllEqual = true;
    let phaseBoundAllStates = true;
    let settledByteIdenticalCount = 0;
    let liveByteIdenticalCount = 0;
    const rotationPhasePairs = [];
    for (const capture of captures) {
      const settledA = capture.original.screens_settled.file;
      const settledB = capture.split.screens_settled.file;
      const settledControl = capture.original.control_repeat.file;
      // One mask set, the union of every <video> rectangle seen on any of the
      // three runs, applied identically to all frames being compared.
      const mask = unionRects(
        capture.original.screens_settled.video_rects ?? [],
        capture.split.screens_settled.video_rects ?? [],
        capture.original.control_repeat.video_rects ?? [],
      );
      const result = await compareSettledFrames(shotComparePage, settledA, settledB, mask);
      const controlResult = await compareSettledFrames(shotComparePage, settledA, settledControl, mask);
      const equal = Boolean(result.canonical16 && result.canonical16.original === result.canonical16.split);
      const controlEqual = Boolean(
        controlResult.canonical16 && controlResult.canonical16.original === controlResult.canonical16.split,
      );
      const crossOutsideMask = result.differing_pixels_outside_mask ?? 0;
      const controlOutsideMask = controlResult.differing_pixels_outside_mask ?? 0;
      const round3 = (value) => Math.round(value * 1000) / 1000;
      const crossPhaseDeltaDeg = round3(
        Math.abs(
          (capture.original.screens_settled.rotation_deg_at_capture ?? 0) - (capture.split.screens_settled.rotation_deg_at_capture ?? 0),
        ),
      );
      const controlPhaseDeltaDeg = round3(
        Math.abs(
          (capture.original.screens_settled.rotation_deg_at_capture ?? 0) -
            (capture.original.control_repeat.rotation_deg_at_capture ?? 0),
        ),
      );
      const crossPxPerDeg = crossPhaseDeltaDeg > 0 ? Math.round(crossOutsideMask / crossPhaseDeltaDeg) : null;
      const controlPxPerDeg = controlPhaseDeltaDeg > 0 ? Math.round(controlOutsideMask / controlPhaseDeltaDeg) : null;
      // A cross-surface delta with no rotation-phase difference to attribute it
      // to would be unexplained, and would fail the channel outright.
      const explained = !(crossPhaseDeltaDeg === 0 && crossOutsideMask > 0);
      rotationPhasePairs.push({
        viewport: capture.viewport,
        state: capture.state,
        rotation_deg: { original: capture.original.screens_settled.rotation_deg_at_capture, split: capture.split.screens_settled.rotation_deg_at_capture, original_control_repeat: capture.original.control_repeat.rotation_deg_at_capture },
        phase_delta_deg: { cross_surface: crossPhaseDeltaDeg, original_vs_own_repeat: controlPhaseDeltaDeg },
        outside_video_mask_delta: { cross_surface: crossOutsideMask, original_vs_own_repeat: controlOutsideMask },
        pixels_per_degree: { cross_surface: crossPxPerDeg, original_vs_own_repeat: controlPxPerDeg },
        cross_surface_delta_fully_attributable_to_phase: explained,
      });
      if (!equal) canonicalAllEqual = false;
      if (!explained) phaseBoundAllStates = false;
      const liveShaA = sha256(fs.readFileSync(capture.original.screenshots_live));
      const liveShaB = sha256(fs.readFileSync(capture.split.screenshots_live));
      const liveByteIdentical = liveShaA === liveShaB;
      capture.screenshot = {
        mask: { rect_count: mask.length, rects: mask, source: "union of every <video> rectangle on all three runs (original, split, original control)" },
        settled_canonical16: { original: result.canonical16 ? result.canonical16.original : null, split: result.canonical16 ? result.canonical16.split : null, equal },
        settled_frame: result.frame ?? null,
        settled_pixel_delta: {
          differing_pixels: result.differing_pixels,
          differing_pixel_ratio: result.differing_pixel_ratio ?? null,
          differing_pixels_outside_video_mask: result.differing_pixels_outside_mask ?? null,
          differing_pixels_inside_video_mask: result.differing_pixels_inside_mask ?? null,
          max_channel_delta_sum: result.max_channel_delta_sum ?? null,
          max_channel_delta: result.max_channel_delta ?? null,
          bbox: result.bbox ?? null,
        },
        settled_raw_byte_identical: result.differing_pixels === 0,
        rotation_phase: {
          original_deg: capture.original.screens_settled.rotation_deg_at_capture,
          split_deg: capture.split.screens_settled.rotation_deg_at_capture,
          cross_surface_delta_deg: crossPhaseDeltaDeg,
          pixels_per_degree_outside_video_mask: crossPxPerDeg,
          delta_fully_attributable_to_phase: explained,
        },
        original_control: {
          settled_canonical16_equal: controlEqual,
          settled_rotation_deg: capture.original.control_repeat.rotation_deg_at_capture,
          phase_delta_deg: controlPhaseDeltaDeg,
          pixels_per_degree_outside_video_mask: controlPxPerDeg,
          settled_pixel_delta: {
            differing_pixels: controlResult.differing_pixels,
            differing_pixels_outside_video_mask: controlResult.differing_pixels_outside_mask ?? null,
            differing_pixels_inside_video_mask: controlResult.differing_pixels_inside_mask ?? null,
            max_channel_delta: controlResult.max_channel_delta ?? null,
          },
        },
        live_png_sha256: { original: liveShaA, split: liveShaB },
        live_png_byte_identical: liveByteIdentical,
      };
      if (capture.screenshot.settled_raw_byte_identical) settledByteIdenticalCount += 1;
      if (liveByteIdentical) liveByteIdenticalCount += 1;
    }
    await shotComparePage.close();
    const controlPxPerDegMax = Math.max(0, ...rotationPhasePairs.map((pair) => pair.pixels_per_degree.original_vs_own_repeat ?? 0));
    const crossPxPerDegMax = Math.max(0, ...rotationPhasePairs.map((pair) => pair.pixels_per_degree.cross_surface ?? 0));
    const pooledCrossPixelsPerDegree = (() => {
      const px = rotationPhasePairs.reduce((sum, pair) => sum + (pair.outside_video_mask_delta.cross_surface ?? 0), 0);
      const deg = rotationPhasePairs.reduce((sum, pair) => sum + (pair.phase_delta_deg.cross_surface ?? 0), 0);
      return deg > 0 ? Math.round(px / deg) : null;
    })();
    const pooledControlPixelsPerDegree = (() => {
      const px = rotationPhasePairs.reduce((sum, pair) => sum + (pair.outside_video_mask_delta.original_vs_own_repeat ?? 0), 0);
      const deg = rotationPhasePairs.reduce((sum, pair) => sum + (pair.phase_delta_deg.original_vs_own_repeat ?? 0), 0);
      return deg > 0 ? Math.round(px / deg) : null;
    })();
    // The decision is attribution, not magnitude: a settled cross-surface delta
    // counts as phase-attributed only when a non-zero rotation-phase difference
    // was actually measured for that state. A delta with no phase difference to
    // attribute it to would be unexplained and would fail the channel.
    const phaseAttributionHolds = phaseBoundAllStates;

    // Server-side request accounting.
    const isExpectedAbort = (failure) => failure.failure === "net::ERR_ABORTED";
    const requestLedger = {};
    for (const label of ["original", "split"]) {
      const failed = sinks[label].filter((entry) => entry.status >= 400);
      requestLedger[label] = {
        total_requests: sinks[label].length,
        responses_2xx_3xx: sinks[label].filter((entry) => entry.status >= 200 && entry.status < 400).length,
        failed_responses: failed.filter((entry) => !entry.favicon).map((entry) => ({ path: entry.path, status: entry.status })),
        failed_response_count: failed.filter((entry) => !entry.favicon).length,
        favicon_204: sinks[label].filter((entry) => entry.favicon).length,
        ranged_media_responses: sinks[label].filter((entry) => entry.ranged).length,
        media_responses_200: sinks[label].filter((entry) => entry.status === 200 && /\.(mp4|jpg)$/.test(entry.path)).length,
      };
    }
    const clientLedger = {};
    for (const capture of captures) {
      for (const label of ["original", "split"]) {
        const live = capture[label];
        const settled = capture[label].screens_settled.ledgers;
        clientLedger[label] =
          clientLedger[label] ||
          { console_errors: 0, page_errors: 0, unexpected_request_failures: 0, failed_responses: 0, remote_requests: 0, responses: 0 };
        clientLedger[label].console_errors += live.console_errors.length + settled.console_errors.length;
        clientLedger[label].page_errors += live.page_errors.length + settled.page_errors.length;
        clientLedger[label].unexpected_request_failures +=
          live.request_failures.filter((failure) => !isExpectedAbort(failure)).length +
          settled.request_failures.filter((failure) => !isExpectedAbort(failure)).length;
        clientLedger[label].failed_responses += live.failed_responses.length + settled.failed_responses.length;
        clientLedger[label].remote_requests += live.remote_requests.length + settled.remote_requests.length;
        clientLedger[label].responses += live.response_count;
      }
    }

    const browserErrors =
      clientLedger.original.console_errors + clientLedger.original.page_errors + clientLedger.split.console_errors + clientLedger.split.page_errors;
    const channels = {
      dom: captures.every((capture) => capture.dom === "EQUAL") ? "EQUAL" : "DIFFERENT",
      geometry: captures.every((capture) => capture.geometry === "EQUAL") ? "EQUAL" : "DIFFERENT",
      computed_style: captures.every((capture) => capture.computed_style === "EQUAL") ? "EQUAL" : "DIFFERENT",
      runtime_state: captures.every((capture) => capture.runtime_state === "EQUAL") ? "EQUAL" : "DIFFERENT",
      interactions: interactionsEqual ? "EQUAL" : "DIFFERENT",
      media_identity: mediaAudit.all_pins_resolved_on_both_surfaces ? "EQUAL" : "DIFFERENT",
      screenshots: canonicalAllEqual
        ? SCREENSHOT_FULL
        : phaseAttributionHolds
          ? SCREENSHOT_PHASE_ATTRIBUTED
          : "DIFFERENT",
      frozen_defect_d1: d1.both_surfaces_rotate_under_reduced_motion ? "PRESERVED_IDENTICALLY" : "DIFFERENT",
    };
    const allPass =
      channels.dom === "EQUAL" &&
      channels.geometry === "EQUAL" &&
      channels.computed_style === "EQUAL" &&
      channels.runtime_state === "EQUAL" &&
      channels.interactions === "EQUAL" &&
      channels.media_identity === "EQUAL" &&
      channels.screenshots === SCREENSHOT_FULL &&
      channels.frozen_defect_d1 === "PRESERVED_IDENTICALLY" &&
      browserErrors === 0 &&
      requestLedger.original.failed_response_count === 0 &&
      requestLedger.split.failed_response_count === 0 &&
      clientLedger.original.unexpected_request_failures === 0 &&
      clientLedger.split.unexpected_request_failures === 0 &&
      clientLedger.original.failed_responses === 0 &&
      clientLedger.split.failed_responses === 0 &&
      clientLedger.original.remote_requests === 0 &&
      clientLedger.split.remote_requests === 0;

    const channelPasses = (value) =>
      value === "EQUAL" || value === SCREENSHOT_FULL || value === "PRESERVED_IDENTICALLY";

    const structuralChannelsEqual =
      channels.dom === "EQUAL" &&
      channels.geometry === "EQUAL" &&
      channels.computed_style === "EQUAL" &&
      channels.runtime_state === "EQUAL" &&
      channels.interactions === "EQUAL" &&
      channels.media_identity === "EQUAL" &&
      channels.frozen_defect_d1 === "PRESERVED_IDENTICALLY";
    const VERDICT_READY = "READY_FOR_CENTRAL_S4_VISUAL_REVIEW";
    const VERDICT_SCREENSHOT_OPEN = "STRUCTURAL_PARITY_ESTABLISHED_SCREENSHOT_CHANNEL_NOT_BYTE_IDENTICAL";
    const VERDICT_STOP = "STOP_REPORT";
    const verdict = allPass
      ? VERDICT_READY
      : structuralChannelsEqual && channels.screenshots === SCREENSHOT_PHASE_ATTRIBUTED
        ? VERDICT_SCREENSHOT_OPEN
        : VERDICT_STOP;

    const comparison = {
      schema_version: "1.0",
      codex_id: CODEX_ID,
      stage: "S4_CONTEXT_AWARE_SERVING_PARITY",
      review_method: "LOCAL_CONTEXT_AWARE_A_B_PARITY_REAL_CHROME",
      generated_at: new Date().toISOString(),
      repository_head: repositoryHead(),
      serving_root: servingRoot,
      out_dir: outDir,
      serving_layout: {
        design: "AUTHORING_TIME_SIBLING_LAYOUT",
        capsule_folder: CAPSULE_FOLDER,
        authority_sibling_folder: SIBLING_FOLDER,
        runtime_media_prefix: MEDIA_PREFIX,
        url_rewrites_applied: 0,
        media_host_physical_copy: 1,
        isolated_ab_roots: {
          original: roots.original.root,
          split: roots.split.root,
        },
        ports: ports,
        note: "Two isolated roots, each a faithful instance of the authoring-time layout carrying only its own surface, both junctioning one pin-verified media host. No Source URL was rewritten.",
      },
      surfaces: {
        original: `http://127.0.0.1:${ports.original}/${CAPSULE_FOLDER}/original/original.html`,
        split: `http://127.0.0.1:${ports.split}/${CAPSULE_FOLDER}/split/index.html`,
      },
      viewports: VIEWPORTS,
      states: STATES,
      state_count: captures.length,
      comparison: channels,
      screenshots: {
        policy: {
          decision_capture: "SETTLED_FRAME_VIA_SOURCE_NATIVE_PAUSE_CONTROL",
          settle_sequence:
            "click #pause iff its label is \u2161 (auto-rotation on), then POLL the panel rotateY until 3 consecutive samples agree within 0.005deg (130ms polls, 5000ms ceiling), then capture",
          decision_metric: "SRC060 canonical-16 pixel digest of the settled frame (16x16, high smoothing, RGB & 0xF0, alpha unchanged, sha256 of 256 bytes) — equality is exact",
          attribution_metric: SCREENSHOT_PHASE_ATTRIBUTED,
          instrument_metric: "full-frame RGBA delta split inside/outside the Source's own video rectangles (differing pixels, ratio, max channel delta, bbox) — RECORDING INSTRUMENT ONLY",
          live_capture_role: "RECORDING_INSTRUMENT_ONLY_NEVER_DECIDES_EQUALITY",
          run_to_run_control: {
            what: "a third settled run of the ORIGINAL surface at the same viewport and state",
            why: "Halting the Source's continuous auto-rotation with its own #pause control freezes whatever rotation phase is current, so two runs of ONE surface land at different phases. At the sculpture's silhouette edges a fraction of a degree changes the projected sub-pixel offset of an entire panel edge and therefore its anti-aliasing blend along the whole edge. That variance belongs to the Source's own halt mechanism, not to the split.",
            role: "EVIDENCE FOR CENTRAL, NOT A DECISION INPUT. The decision is attribution: a cross-surface delta counts as explained only if a non-zero rotation-phase difference was actually measured in that state. Pixels-per-degree is recorded for both the cross-surface pair and the original against its own repeat so the two can be compared directly.",
            caution:
              "Pixels-per-degree is a ratio of two noisy single-sample quantities (a delta of a few thousand pixels divided by a phase difference of 0.02-0.4deg). Its run-to-run maximum is dominated by which state happened to have the smallest phase difference, so it is not a stable pass/fail bound: the observed maximum exceeded the control maximum in one run and was below it in another. It must not be used as a threshold.",
            bound_pixels_per_degree: controlPxPerDegMax,
            observed_max_pixels_per_degree: crossPxPerDegMax,
            pooled_pixels_per_degree: { cross_surface: pooledCrossPixelsPerDegree, original_vs_own_repeat: pooledControlPixelsPerDegree },
            attribution_holds: phaseAttributionHolds,
            mask: "one mask set — the union of every <video> rectangle observed on all three runs — applied identically to every frame compared",
          },
          reason: "The Source auto-rotates the sculpture every rAF frame, so a live frame differs between two runs of the SAME surface by rotation phase and video decode frame; the live PNG is therefore not an equality oracle.",
          normalization_symmetry: "The settle sequence is the same code path and the same waits on both surfaces; it is a normalization, not a tolerance.",
        },
        settled_canonical16_equal: canonicalAllEqual,
        settled_canonical16_equal_count: captures.filter((capture) => capture.screenshot.settled_canonical16.equal).length,
        settled_canonical16_state_count: captures.length,
        cross_surface_delta_attributable_to_phase: phaseAttributionHolds,
        cross_surface_phase_delta_attributable_count: captures.filter(
          (capture) => capture.screenshot.rotation_phase.delta_fully_attributable_to_phase,
        ).length,
        bound_pixels_per_degree: controlPxPerDegMax,
        observed_max_pixels_per_degree: crossPxPerDegMax,
        rotation_phase_pairs: rotationPhasePairs,
        settled_raw_byte_identical_count: settledByteIdenticalCount,
        settled_video_mask_rect_count_max: Math.max(0, ...captures.map((capture) => capture.screenshot.mask.rect_count)),
        cross_surface_outside_video_mask_delta_max: Math.max(
          0,
          ...captures.map((capture) => capture.screenshot.settled_pixel_delta.differing_pixels_outside_video_mask ?? 0),
        ),
        cross_surface_inside_video_mask_delta_max: Math.max(
          0,
          ...captures.map((capture) => capture.screenshot.settled_pixel_delta.differing_pixels_inside_video_mask ?? 0),
        ),
        control_outside_video_mask_delta_max: Math.max(
          0,
          ...captures.map((capture) => capture.screenshot.original_control.settled_pixel_delta.differing_pixels_outside_video_mask ?? 0),
        ),
        control_full_frame_delta_max: Math.max(
          0,
          ...captures.map((capture) => capture.screenshot.original_control.settled_pixel_delta.differing_pixels ?? 0),
        ),
        control_canonical16_equal_count: captures.filter((capture) => capture.screenshot.original_control.settled_canonical16_equal).length,
        settled_differring_pixel_max: Math.max(0, ...captures.map((capture) => capture.screenshot.settled_pixel_delta.differing_pixels ?? 0)),
        settled_max_channel_delta_max: Math.max(0, ...captures.map((capture) => capture.screenshot.settled_pixel_delta.max_channel_delta ?? 0)),
        live_png_byte_identical_count: liveByteIdenticalCount,
        rotation_convergence_all_settled: captures.every((capture) => capture.original.screens_settled.convergence.converged && capture.split.screens_settled.convergence.converged),
        rotation_convergence_delta_max: Math.max(
          0,
          ...captures.flatMap((capture) => [
            Math.abs(capture.original.screens_settled.convergence.rotation_delta_deg ?? 0),
            Math.abs(capture.split.screens_settled.convergence.rotation_delta_deg ?? 0),
          ]),
        ),
        state_count: captures.length,
      },
      computed_style: {
        verdict: channels.computed_style,
        hard_difference_count: captures.reduce((sum, capture) => sum + (capture.computed_style_hard_differences?.length ?? 0), 0),
        rotation_phase_drift_states: captures.filter(
          (capture) => Object.keys(capture.computed_style_rotation_phase_instrument ?? {}).length > 0,
        ).length,
        rotation_phase_delta_deg_max: Math.max(
          0,
          ...captures.flatMap((capture) =>
            Object.values(capture.computed_style_rotation_phase_instrument ?? {})
              .filter(
                (entry) =>
                  typeof entry.original.transform_rotation_deg === "number" && typeof entry.split.transform_rotation_deg === "number",
              )
              .map((entry) => Math.abs(entry.original.transform_rotation_deg - entry.split.transform_rotation_deg)),
          ),
        ),
        waivable_keys: [...ROTATION_PHASE_KEYS],
        note: "Every selector and property is compared byte for byte except the transform triplet of the element whose inline transform the Source's rAF loop rewrites every frame; those three keys are reported in full as an instrument per state. Any other difference in any property of any selector fails the channel.",
      },
      media_identity: {
        pins_total: pins.length,
        declared_total_bytes: context.media_inventory.total_bytes,
        all_resolved_on_both_surfaces: mediaAudit.all_pins_resolved_on_both_surfaces,
        http_404_total: mediaAudit.http_404_total,
        url_rewrites_applied: mediaAudit.url_rewrites_applied,
        per_surface: mediaAudit.per_surface,
      },
      interactions: { original: interactions.original, split: interactions.split, equal: interactionsEqual },
      glue_diff: {
        original: captures[0].original.glue,
        split: captures[0].split.glue,
        expected_shape: {
          original: "one inline <style> block + one inline <script> block",
          split: "one <link rel=stylesheet href=./styles.css> + one <script src=./script.js>",
        },
        note: "The only structural DOM difference is this mechanical glue. Both sides collapse their own glue node (one <style> + one <script> on the original, one <link> + one <script src> on the split) to the single marker #GLUE, so the DOM inventory compares every other node, attribute and byte for byte.",
      },
      d1_reduced_motion: d1,
      request_ledger: requestLedger,
      client_ledger: clientLedger,
      browser_errors: browserErrors,
      console_errors: browserErrors - (clientLedger.original.page_errors + clientLedger.split.page_errors),
      failed_responses: requestLedger.original.failed_response_count + requestLedger.split.failed_response_count,
      unexpected_request_failures: clientLedger.original.unexpected_request_failures + clientLedger.split.unexpected_request_failures,
      remote_requests: clientLedger.original.remote_requests + clientLedger.split.remote_requests,
      manifest_stage_claimed: manifest.stages?.source_split_parity_pass === true,
      verdict,
      failing_channels: Object.entries(channels)
        .filter(([name, value]) => !channelPasses(value))
        .map(([name]) => name),
      captures,
    };

    writeJson(path.join(outDir, "comparison.json"), comparison);
    writeJson(path.join(outDir, "media-audit.json"), { ...mediaAudit, pins: pins });
    writeJson(path.join(outDir, "d1-reduced-motion.json"), d1);

    // Repository evidence: JSON records + a compact visual-review screenshot set.
    fs.mkdirSync(EVIDENCE_S4, { recursive: true });
    // Repository evidence: a compact projection of the comparison record plus a
    // visual-review screenshot set. The per-surface raw captures are large (full
    // DOM inventories, full computed-style tables for 24 selectors, settled and
    // live PNGs) and live in out_dir, which is recorded in comparison.out_dir;
    // the repo copy keeps every channel verdict, every digest and every
    // instrument — i.e. everything that decides or explains a result.
    const surfaceDigest = (capture, label) => {
      const surface = capture[label];
      const settled = capture[label].screens_settled;
      return {
        http_status: surface.http_status,
        canonical_virtual_path: surface.canonical_virtual_path,
        dom_inventory_digest: sha256(surface.dom_inventory.inventory),
        dom_inventory_length: surface.dom_inventory.inventory.length,
        geometry_digest: sha256(JSON.stringify(surface.geometry)),
        geometry_entry_count: Object.keys(surface.geometry).length,
        computed_style_digest: sha256(JSON.stringify(surface.computed_style)),
        computed_style_selector_count: Object.keys(surface.computed_style).length,
        computed_style_property_count: surface.computed_style[Object.keys(surface.computed_style)[0]]
          ? Object.keys(surface.computed_style[Object.keys(surface.computed_style)[0]]).length
          : 0,
        runtime_state_digest: sha256(JSON.stringify(surface.runtime_state)),
        live_png_bytes: fs.statSync(surface.screenshots_live).size,
        live_png_sha256: sha256(fs.readFileSync(surface.screenshots_live)),
        settled_capture: {
          file: path.relative(outDir, settled.file),
          rotation_deg_at_capture: settled.rotation_deg_at_capture,
          convergence: settled.convergence,
          video_rect_count: (settled.video_rects ?? []).length,
          ledgers: settled.ledgers,
        },
      };
    };
    const compactComparison = {
      ...comparison,
      repository_copy: {
        scope: "compact projection; the full per-surface raw captures are in out_dir",
        full_capture_set_dir: path.join(outDir, "screens"),
        raw_records_kept_in_repository: false,
      },
      captures: captures.map((capture) => ({
        viewport: capture.viewport,
        state: capture.state,
        dom: capture.dom,
        dom_digest: capture.dom_digest,
        glue_node_count: capture.glue_node_count,
        glue: capture.glue,
        geometry: capture.geometry,
        computed_style: capture.computed_style,
        computed_style_hard_differences: capture.computed_style_hard_differences,
        computed_style_rotation_phase_instrument: capture.computed_style_rotation_phase_instrument,
        runtime_state: capture.runtime_state,
        original: surfaceDigest(capture, "original"),
        split: surfaceDigest(capture, "split"),
        screenshot: capture.screenshot,
      })),
    };
    writeJson(path.join(EVIDENCE_S4, "comparison.json"), compactComparison);
    writeJson(path.join(EVIDENCE_S4, "media-audit.json"), {
      ...mediaAudit,
      pin_manifest: { count: pins.length, total_bytes: context.media_inventory.total_bytes, sha256_of_entry_set: sha256(JSON.stringify(pins)) },
    });
    writeJson(path.join(EVIDENCE_S4, "d1-reduced-motion.json"), d1);
    const reviewDir = path.join(EVIDENCE_S4, "screenshots");
    fs.mkdirSync(reviewDir, { recursive: true });
    const copied = [];
    for (const capture of captures) {
      if (capture.viewport !== "1440x900") continue;
      for (const label of ["original", "split"]) {
        const target = path.join(reviewDir, `${label}-${capture.state}-settled.png`);
        fs.copyFileSync(capture[label].screens_settled.file, target);
        copied.push(path.relative(CAPSULE, target));
      }
    }

    // Promotion-shaped candidate artifact (never a promotion claim).
    writeJson(path.join(CAPSULE, "evidence", "parity", "s4-candidate-parity.json"), {
      schema_version: "1.0",
      source_id: CODEX_ID,
      status: verdict === VERDICT_STOP ? "NOT_READY" : "READY_FOR_CENTRAL_S4_VISUAL_REVIEW",
      verdict,
      screenshot_channel: {
        byte_identical: channels.screenshots === SCREENSHOT_FULL,
        verdict: channels.screenshots,
        note:
          channels.screenshots === SCREENSHOT_FULL
            ? "Every settled cross-surface frame is a byte-identical canonical-16 digest of the original's settled frame."
            : "NOT byte-identical. Every settled cross-surface delta outside the Source's own video rectangles is attributed to a measured rotation-phase difference between the two halted runs; the halt protocol (the Source's own #pause control) necessarily freezes an arbitrary phase. The original's own run-to-run control is recorded per state so CENTRAL can compare. Accepting a phase-attributed screenshot verdict as sufficient for the parity claim is CENTRAL's decision.",
      },
      review_method: "LOCAL_CONTEXT_AWARE_A_B_PARITY_REAL_CHROME",
      stage: "S4_CONTEXT_AWARE_SERVING_PARITY",
      tracking_issue: "skerishKang/lovetree-limone#589",
      authority: {
        file: "original/original.html",
        drive_folder_id: manifest.authority.drive_folder_id,
        drive_file_id: manifest.authority.drive_file_id,
        bytes: AUTHORITY_BYTES,
        sha256: AUTHORITY_SHA256,
        authority_location: "cdx014 authority 14_러브트리_로테이팅메모리인덱스_V1/v1/최종본.html",
      },
      context: {
        capture_surface: "CONTEXT_AWARE_ONLY",
        serving: `both surfaces served from two isolated roots reproducing the authoring-time sibling layout (${CAPSULE_FOLDER}/${SIBLING_FOLDER}/assets/), original and split at identical relative depth, zero URL rewrites`,
        media_pins_verified: pins.length,
        media_bytes_total: context.media_inventory.total_bytes,
        context_corpus_vendored_into_repository: false,
      },
      viewports: VIEWPORTS,
      state_count: captures.length,
      comparisons: {
        dom: channels.dom,
        geometry: channels.geometry,
        computed_style: channels.computed_style,
        runtime_state: channels.runtime_state,
        interactions: channels.interactions,
        screenshots: channels.screenshots,
      },
      comparison_policy: {
        canonical16_used: true,
        canonical_scope: "ALL_STATES_SETTLED_FRAMES",
        settle_technique: "source-native #pause control (label \u2161) + 1700ms lerp convergence; identical on both surfaces",
        canonical16_technique: {
          name: "SRC060_CANONICAL16",
          downsample: "16x16",
          image_smoothing: "high",
          rgb_channel_mask: "0xF0",
          alpha: "unchanged",
          digest: "sha256 of the 256-byte result; equality is exact, a normalization not a tolerance",
          provenance: "src/08_harness/source060-driver.mjs canonicalPixelDigest; adopted by SRC069 S4",
        },
        live_capture_role: "RECORDING_INSTRUMENT_ONLY_NEVER_DECIDES_EQUALITY",
        live_png_byte_identical_count: liveByteIdenticalCount,
        run_to_run_control: {
          design: "a third settled run of the ORIGINAL surface per (viewport, state)",
          role: "evidence for CENTRAL, not a decision input",
          decision_rule: "a settled cross-surface delta counts as explained only when a non-zero rotation-phase difference was measured in that state; a delta with no phase difference to attribute it to fails the channel",
          attribution_holds: comparison.screenshots.cross_surface_delta_attributable_to_phase,
          bound_pixels_per_degree: comparison.screenshots.bound_pixels_per_degree,
          observed_max_pixels_per_degree: comparison.screenshots.observed_max_pixels_per_degree,
          pooled_pixels_per_degree: comparison.screenshots.policy.run_to_run_control.pooled_pixels_per_degree,
          caution: "pixels-per-degree is a ratio of two noisy single-sample quantities and its run-to-run maximum is dominated by whichever state had the smallest phase difference; it is recorded so the two can be compared, not used as a threshold",
          control_canonical16_equal_count: comparison.screenshots.control_canonical16_equal_count,
        },
        computed_style_rotation_phase: {
          waivable_keys: [...ROTATION_PHASE_KEYS],
          states_with_drift: comparison.computed_style.rotation_phase_drift_states,
          hard_difference_count: captures.reduce((sum, capture) => sum + (capture.computed_style_hard_differences?.length ?? 0), 0),
          delta_deg_max: Math.max(
            0,
            ...captures.flatMap((capture) =>
              Object.values(capture.computed_style_rotation_phase_instrument ?? {})
                .filter(
                  (entry) =>
                    typeof entry.original.transform_rotation_deg === "number" &&
                    typeof entry.split.transform_rotation_deg === "number",
                )
                .map((entry) => Math.abs(entry.original.transform_rotation_deg - entry.split.transform_rotation_deg)),
            ),
          ),
        },
      },
      frozen_defects_preserved: [
        `D1_AUTO_ROTATION_NOT_GATED_ON_PREFERS_REDUCED_MOTION: FROZEN, ${d1.disposition} on both surfaces (original ${d1.surfaces.original.rotation_delta_deg}deg / split ${d1.surfaces.split.rotation_delta_deg}deg over ${d1.window_ms}ms)`,
      ],
      browser_errors: browserErrors,
      console_errors: browserErrors - (clientLedger.original.page_errors + clientLedger.split.page_errors),
      unexpected_failed_requests: clientLedger.original.unexpected_request_failures + clientLedger.split.unexpected_request_failures,
      failed_responses: requestLedger.original.failed_response_count + requestLedger.split.failed_response_count,
      remote_requests: clientLedger.original.remote_requests + clientLedger.split.remote_requests,
      manifest_stage_claimed: manifest.stages?.source_split_parity_pass === true,
      promotion_instruction: {
        required_for_context_aware_claim: [
          "copy evidence/parity/s4-candidate-parity.json to evidence/parity/accepted-parity.json with status=ACCEPTED and the CENTRAL review comment id",
          "set manifest.stages.source_split_parity_pass=true",
          "set manifest.parity_ref='evidence/parity/accepted-parity.json'",
        ],
        validator_rule: "source-capsule-validator.mjs: CONTEXT_AWARE_ONLY may claim source_split_parity_pass only with parity_ref=evidence/parity/accepted-parity.json plus a validated accepted-parity artifact",
      },
      visual_review: {
        central_direct_artifact_review: false,
        screenshots_for_review: copied,
        full_capture_set_dir: path.join(outDir, "screens"),
      },
      notes: [
        "Evidence was captured against the frozen authority original (19631 B, sha256 0cef6497…) and the S3 mechanical split (index 5220ec38…, styles 9bde0d62…, script b72c8283…).",
        "Neither runtime surface file, authority-context.json nor baseline/ was modified by this run.",
        "No source repair, redesign, framework conversion or product data injection was introduced; the shared harness was not mutated.",
        "The verdict is not a promotion claim: stages.source_split_parity_pass stays false and parity_ref stays null until CENTRAL accepts the artifact.",
        channels.screenshots === SCREENSHOT_FULL
          ? "Screenshots reached byte-identical canonical-16 digests in every settled state."
          : `SCREENSHOT CHANNEL DID NOT REACH BYTE IDENTITY (verdict ${channels.screenshots}). Seven of eight channels are exactly EQUAL (dom, geometry, computed_style excluding the rAF-written transform triplet, runtime_state, interactions, media_identity, frozen_defect_d1). The settled cross-surface pixel delta is attributed to a rotation-phase difference between the two halted runs: every state has a measured non-zero phase difference, and the difference sits on the sculpture's silhouette edges where a fraction of a degree moves a whole panel edge by a sub-pixel amount and changes its anti-aliasing blend along its length. The original's own run-to-run control (a third settled run of the original) is recorded per state so the two can be compared directly. Freezing requestAnimationFrame from page load was tested as an alternative determinism protocol and rejected: it leaves all panels stacked at one rectangle with transform "none" and 22% of pixels different from the live render, so it would compare a degenerate page. Whether a phase-attributed screenshot verdict is sufficient for the parity claim is CENTRAL's decision.`,
      ],
      provenance: {
        serving_root: servingRoot,
        out_dir: outDir,
        repository_head: repositoryHead(),
      },
    });

    console.log(
      JSON.stringify(
        {
          mode: "BROWSER",
          verdict: comparison.verdict,
          channels,
          browser_errors: browserErrors,
          media_pins: pins.length,
          media_404_total: mediaAudit.http_404_total,
          state_count: captures.length,
          settled_canonical16_equal: canonicalAllEqual,
          structural_channels_equal: structuralChannelsEqual,
          phase_attribution_holds: phaseAttributionHolds,
          observed_max_px_per_deg: crossPxPerDegMax,
          control_max_px_per_deg: controlPxPerDegMax,
          pooled_px_per_deg: { cross_surface: pooledCrossPixelsPerDegree, original_vs_own_repeat: pooledControlPixelsPerDegree },
          computed_style_rotation_drift_states: comparison.computed_style.rotation_phase_drift_states,
          d1: d1.disposition,
        },
        null,
        2,
      ),
    );
    return comparison;
  } finally {
    // server.close() alone never resolves while the media audit's undici
    // keep-alive sockets are still open, so the sockets are dropped too and the
    // close is bounded by a timeout so a stuck socket can never hang the run.
    for (const server of servers) {
      try {
        server.closeAllConnections();
      } catch {
        // Node < 18.2 has no closeAllConnections(); the timeout below still bounds it.
      }
      await Promise.race([
        new Promise((resolve) => server.close(resolve)),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    }
    if (browser) await browser.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------

const BROWSER_MODE = process.env.CDX014_S4_BROWSER === "1";
const SERVING_ROOT = process.env.CDX014_S4_SERVING;
const OUT_DIR = process.env.CDX014_S4_OUT;

if (!BROWSER_MODE) {
  runContractMode();
} else {
  if (!SERVING_ROOT || !fs.existsSync(SERVING_ROOT)) {
    throw new Error(`CDX014_S4_SERVING must point at an existing serving root (got ${SERVING_ROOT ?? "unset"})`);
  }
  if (!OUT_DIR || !OUT_DIR.startsWith("D:\\Temp")) {
    throw new Error(`CDX014_S4_OUT must be a D:\\Temp directory outside the repository (got ${OUT_DIR ?? "unset"})`);
  }
  runBrowserMode(SERVING_ROOT, OUT_DIR).catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  });
}
