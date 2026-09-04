import { isDeepStrictEqual } from 'node:util';

export const MATCHED_REPLAY_COMPARISON_SCHEMA_VERSION = 'clean108-matched-replay-comparison-v2';

function requireEvidence(label, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`MATCHED_REPLAY_${label}_EVIDENCE_REQUIRED`);
  }
}

// v2 (Slice 4B / SRC060): the DOM equality channel compares the glue-excluded
// rendered-content count (contentElementCount) WHEN PRESENT, falling back to
// the raw elementCount only for pre-v2 evidence. SRC060's mechanical split
// differs in glue tags by design (inline style + 2 inline scripts -> link + 1
// script src); the accepted parity contract counts body *:not(script):not
// (link):not(style). Raw elementCount stays in the evidence (and in the
// comparison record's domCount) as informational context but is NOT a parity
// channel when contentElementCount exists.
function canonicalDom(dom) {
  if (!dom || typeof dom !== 'object' || Array.isArray(dom)) return dom;
  const { url: _variantUrl, ...rest } = dom;
  const count = rest.contentElementCount !== undefined
    ? { contentElementCount: rest.contentElementCount }
    : { elementCount: rest.elementCount };
  return {
    title: rest.title,
    ids: rest.ids,
    count,
    scrollWidth: rest.scrollWidth,
    scrollHeight: rest.scrollHeight,
  };
}

// v2: screenshots compare the digest the recipe actually requested — rawSha256
// for digest=raw (SRC056 semantics unchanged) or canonical16Sha256 for
// digest=canonical16 (SRC060 accepted parity: byte-identical canonical pixel
// digest). Raw bytes are not the comparison channel for canonical16 evidence.
function canonicalScreenshots(screenshots) {
  if (!Array.isArray(screenshots)) return screenshots;
  return screenshots.map((shot) => ({
    name: shot?.name,
    digestModeRequested: shot?.digestModeRequested ?? 'raw',
    digestSha256: shot?.digestModeRequested === 'canonical16'
      ? shot?.canonical16Sha256 ?? null
      : shot?.rawSha256 ?? null,
    bytes: shot?.bytes ?? null,
  }));
}

function channel(left, right) {
  return isDeepStrictEqual(left, right);
}

function cleanHealth(health) {
  return Boolean(
    health
    && Array.isArray(health.consoleErrors)
    && Array.isArray(health.pageErrors)
    && Array.isArray(health.failedRequests)
    && health.consoleErrors.length === 0
    && health.pageErrors.length === 0
    && health.failedRequests.length === 0
  );
}

function hasTimeoutEvidence(evidence) {
  return Boolean(
    evidence.timeouts
    && Number.isInteger(evidence.timeouts.actionMs)
    && Number.isInteger(evidence.timeouts.recipeMs)
    && evidence.timeouts.recipeMsEnforced === false
  );
}

/**
 * Compare two Slice-3 capture outputs produced from the SAME approved recipe.
 * Variant navigation URL and capture timestamp are intentionally not parity
 * channels. All source/runtime/DOM/screenshot/provenance semantics are.
 */
export function compareMatchedStateReplay({ originalEvidence, splitEvidence }) {
  requireEvidence('ORIGINAL', originalEvidence);
  requireEvidence('SPLIT', splitEvidence);

  const comparisons = {
    source_id_equal: channel(originalEvidence.sourceId, splitEvidence.sourceId),
    recipe_version_equal: channel(originalEvidence.recipeVersion, splitEvidence.recipeVersion),
    state_id_equal: channel(originalEvidence.stateId, splitEvidence.stateId),
    evidence_schema_equal: channel(originalEvidence.schemaVersion, splitEvidence.schemaVersion),
    harness_version_equal: channel(originalEvidence.harnessVersion, splitEvidence.harnessVersion),
    exact_head_equal: channel(originalEvidence.exactHead, splitEvidence.exactHead),
    authority_sha256_equal: channel(originalEvidence.authoritySha256, splitEvidence.authoritySha256),
    browser_version_equal: channel(originalEvidence.browserVersion, splitEvidence.browserVersion),
    viewport_equal: channel(originalEvidence.viewport, splitEvidence.viewport),
    original_timeouts_present: hasTimeoutEvidence(originalEvidence),
    split_timeouts_present: hasTimeoutEvidence(splitEvidence),
    timeouts_equal: channel(originalEvidence.timeouts, splitEvidence.timeouts),
    execution_equal: channel(originalEvidence.execution, splitEvidence.execution),
    assertions_equal: channel(originalEvidence.assertions, splitEvidence.assertions),
    dom_equal_excluding_variant_url: channel(canonicalDom(originalEvidence.dom), canonicalDom(splitEvidence.dom)),
    runtime_snapshot_equal: channel(originalEvidence.runtimeSnapshot, splitEvidence.runtimeSnapshot),
    runtime_health_equal: channel(originalEvidence.runtimeHealth, splitEvidence.runtimeHealth),
    original_runtime_health_clean: cleanHealth(originalEvidence.runtimeHealth),
    split_runtime_health_clean: cleanHealth(splitEvidence.runtimeHealth),
    screenshots_equal: channel(
      canonicalScreenshots(originalEvidence.screenshots),
      canonicalScreenshots(splitEvidence.screenshots),
    ),
  };

  const differences = Object.entries(comparisons)
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name);

  return {
    schemaVersion: MATCHED_REPLAY_COMPARISON_SCHEMA_VERSION,
    sourceId: originalEvidence.sourceId ?? null,
    stateId: originalEvidence.stateId ?? null,
    passed: differences.length === 0,
    comparisons,
    differences,
  };
}
