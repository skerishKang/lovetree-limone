import { isDeepStrictEqual } from 'node:util';

export const MATCHED_REPLAY_COMPARISON_SCHEMA_VERSION = 'clean108-matched-replay-comparison-v1';

function requireEvidence(label, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`MATCHED_REPLAY_${label}_EVIDENCE_REQUIRED`);
  }
}

function canonicalDom(dom) {
  if (!dom || typeof dom !== 'object' || Array.isArray(dom)) return dom;
  const { url: _variantUrl, ...rest } = dom;
  return rest;
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
    timeout_policy_equal: channel(originalEvidence.timeoutPolicy, splitEvidence.timeoutPolicy),
    execution_equal: channel(originalEvidence.execution, splitEvidence.execution),
    assertions_equal: channel(originalEvidence.assertions, splitEvidence.assertions),
    dom_equal_excluding_variant_url: channel(canonicalDom(originalEvidence.dom), canonicalDom(splitEvidence.dom)),
    runtime_snapshot_equal: channel(originalEvidence.runtimeSnapshot, splitEvidence.runtimeSnapshot),
    runtime_health_equal: channel(originalEvidence.runtimeHealth, splitEvidence.runtimeHealth),
    original_runtime_health_clean: cleanHealth(originalEvidence.runtimeHealth),
    split_runtime_health_clean: cleanHealth(splitEvidence.runtimeHealth),
    screenshots_equal: channel(originalEvidence.screenshots, splitEvidence.screenshots),
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
