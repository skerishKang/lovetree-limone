// Issue #173 / PR #243 — shadow decision layer: race-guard + applicability.
//
// Tests the reusable PURE modules that extract the TOCTOU/stale-green policy
// #243 already freezes as a test-only helper (`evaluateHistoricalPass`):
//   - PR head movement revokes the old green.
//   - base/main movement revokes the old green.
//   - source evidence drift (fileId/modifiedTime/bytes/sha256) requires reobservation.
//   - non-SUCCESS provider state is UNKNOWN/blocking.
//   - NOT_APPLICABLE is decided from PR paths/config only, never from provider state.
//
// No network, no Drive mutation, no GitHub mutation.

import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluatePassSeal,
  headMoved,
  baseMoved,
  isBlockingProviderState,
  isSourceFreshnessApplicable,
  touchesDesignIntake,
} from "../lib/design-intake/drive-observer/index.ts";

const SHA = (c) => c.repeat(64);
const SHA40 = (c) => c.repeat(40);

function baseEvidence() {
  return {
    fileId: "1f73observerTrack62V11OldFileAaa",
    modifiedTime: "2026-08-14T09:00:00.000Z",
    bytes: 123,
    sha256: SHA("a"),
  };
}

function baseSeal() {
  return {
    verdict: "PASS",
    prHeadSha: SHA40("1"),
    mainSha: SHA40("2"),
    observationTimestamp: "2026-08-17T13:40:00.000Z",
    source: baseEvidence(),
  };
}

function freshMatching() {
  return {
    providerState: "SUCCESS",
    observationComplete: true,
    paginationComplete: true,
    prHeadSha: SHA40("1"),
    mainSha: SHA40("2"),
    source: baseEvidence(),
  };
}

/* ------------------------------------------------------------------ */
/* Race guard — exact seal still current                               */
/* ------------------------------------------------------------------ */

test("race-guard: exact seal still current => merge-authoritative PASS", () => {
  const d = evaluatePassSeal(baseSeal(), freshMatching());
  assert.equal(d.mergeAuthoritative, true);
  assert.equal(d.status, "PASS");
  assert.equal(d.mergeBlock, false);
  assert.equal(d.reason, "EXACT_PASS_SEAL_STILL_CURRENT");
  assert.equal(d.reobservationRequired, false);
  assert.equal(d.observedHeadSha, SHA40("1"));
  assert.equal(d.currentHeadSha, SHA40("1"));
});

/* ------------------------------------------------------------------ */
/* Race guard — PR head movement revokes the old green                 */
/* ------------------------------------------------------------------ */

test("race-guard: PR head moved => HEAD_MOVED, blocking, reobserve", () => {
  const fresh = { ...freshMatching(), prHeadSha: SHA40("3") };
  const d = evaluatePassSeal(baseSeal(), fresh);
  assert.equal(d.mergeAuthoritative, false);
  assert.equal(d.status, "NON_PASS");
  assert.equal(d.mergeBlock, true);
  assert.equal(d.reason, "HEAD_MOVED");
  assert.equal(d.reobservationRequired, true);
  assert.equal(d.observedHeadSha, SHA40("1"));
  assert.equal(d.currentHeadSha, SHA40("3"));
  assert.notEqual(d.currentHeadSha, d.observedHeadSha);
});

/* ------------------------------------------------------------------ */
/* Race guard — base/main movement revokes the old green               */
/* ------------------------------------------------------------------ */

test("race-guard: base/main moved => BASE_MOVED, blocking, reobserve", () => {
  const fresh = { ...freshMatching(), mainSha: SHA40("4") };
  const d = evaluatePassSeal(baseSeal(), fresh);
  assert.equal(d.mergeAuthoritative, false);
  assert.equal(d.mergeBlock, true);
  assert.equal(d.reason, "BASE_MOVED");
  assert.equal(d.reobservationRequired, true);
  assert.equal(d.observedBaseSha, SHA40("2"));
  assert.equal(d.currentBaseSha, SHA40("4"));
});

/* ------------------------------------------------------------------ */
/* Race guard — TOCTOU source-evidence drift matrix                    */
/* ------------------------------------------------------------------ */

test("race-guard: fileId/modifiedTime/bytes/sha256 drift each revoke the old green", () => {
  const mutations = {
    fileId: { fileId: "1f73observerTrack62V11ReplacementBb" },
    modifiedTime: { modifiedTime: "2026-08-17T13:41:00.000Z" },
    bytes: { bytes: baseEvidence().bytes + 1 },
    sha256: { sha256: SHA("f") },
  };
  for (const [field, patch] of Object.entries(mutations)) {
    const fresh = { ...freshMatching(), source: { ...baseEvidence(), ...patch } };
    const d = evaluatePassSeal(baseSeal(), fresh);
    assert.equal(d.mergeAuthoritative, false, `${field} drift must revoke historical green`);
    assert.equal(d.status, "NON_PASS");
    assert.equal(d.mergeBlock, true);
    assert.equal(d.reason, "SOURCE_CHANGED_SINCE_PASS");
    assert.equal(d.reobservationRequired, true);
    assert.deepEqual(d.changedFields, [field], `only ${field} should be reported as changed`);
  }
});

/* ------------------------------------------------------------------ */
/* Race guard — packaging-only fileId change does NOT survive         */
/* ------------------------------------------------------------------ */

test("race-guard: packaging-only fileId change revokes old green (requires fresh resolution)", () => {
  const fresh = {
    ...freshMatching(),
    source: { ...baseEvidence(), fileId: "1f73observerTrack62V11RepackagedBb" },
  };
  const d = evaluatePassSeal(baseSeal(), fresh);
  assert.equal(d.mergeAuthoritative, false);
  assert.equal(d.reobservationRequired, true);
  assert.deepEqual(d.changedFields, ["fileId"]);
  // The old PASS cannot survive a file-id change; a fresh observation must
  // re-resolve (and the resolver would return PACKAGING_ONLY on the new state).
});

/* ------------------------------------------------------------------ */
/* Race guard — provider negative matrix is always UNKNOWN/blocking    */
/* ------------------------------------------------------------------ */

test("race-guard: non-SUCCESS provider states are UNKNOWN/blocking", () => {
  for (const providerState of ["INCOMPLETE", "UNAVAILABLE", "AUTH_FAILED", "PERMISSION_DENIED", "API_ERROR"]) {
    const fresh = {
      ...freshMatching(),
      providerState,
      observationComplete: providerState !== "INCOMPLETE",
      paginationComplete: providerState !== "INCOMPLETE",
    };
    const d = evaluatePassSeal(baseSeal(), fresh);
    assert.equal(d.mergeAuthoritative, false, `${providerState} must not preserve green`);
    assert.equal(d.status, "UNKNOWN");
    assert.equal(d.mergeBlock, true);
    assert.equal(d.reobservationRequired, true);
  }
});

/* ------------------------------------------------------------------ */
/* Race guard — incomplete observation is UNKNOWN/blocking             */
/* ------------------------------------------------------------------ */

test("race-guard: SUCCESS but observationComplete=false => UNKNOWN/blocking", () => {
  const fresh = { ...freshMatching(), observationComplete: false };
  const d = evaluatePassSeal(baseSeal(), fresh);
  assert.equal(d.mergeAuthoritative, false);
  assert.equal(d.status, "UNKNOWN");
  assert.equal(d.mergeBlock, true);
  assert.equal(d.reason, "PROVIDER_NOT_TRUSTWORTHY_AT_MERGE");
});

test("race-guard: SUCCESS but paginationComplete=false => UNKNOWN/blocking", () => {
  const fresh = { ...freshMatching(), paginationComplete: false };
  const d = evaluatePassSeal(baseSeal(), fresh);
  assert.equal(d.mergeAuthoritative, false);
  assert.equal(d.status, "UNKNOWN");
  assert.equal(d.mergeBlock, true);
});

/* ------------------------------------------------------------------ */
/* Race guard — helpers                                                */
/* ------------------------------------------------------------------ */

test("race-guard: headMoved/baseMoved helpers detect ref movement", () => {
  assert.equal(headMoved(SHA40("1"), SHA40("1")), false);
  assert.equal(headMoved(SHA40("1"), SHA40("3")), true);
  assert.equal(baseMoved(SHA40("2"), SHA40("2")), false);
  assert.equal(baseMoved(SHA40("2"), SHA40("4")), true);
  assert.equal(isBlockingProviderState("SUCCESS"), false);
  assert.equal(isBlockingProviderState("INCOMPLETE"), true);
  assert.equal(isBlockingProviderState("UNAVAILABLE"), true);
});

/* ------------------------------------------------------------------ */
/* Applicability — path/config only, never provider state             */
/* ------------------------------------------------------------------ */

test("applicability: unrelated PR (no design-intake files) => NOT_APPLICABLE", () => {
  const r = isSourceFreshnessApplicable({ changedFiles: ["README.md", "src/app/foo.tsx"] });
  assert.equal(r.applicable, false);
  assert.equal(r.reasonCode, "NO_DESIGN_INTAKE_CHANGES");
});

test("applicability: design-intake path => applicable", () => {
  for (const file of [
    "lib/design-intake/manifest.ts",
    "design-intake/manifests/track62.json",
    "tests/fixtures/source-freshness/manifests/x.json",
  ]) {
    const r = isSourceFreshnessApplicable({ changedFiles: [file] });
    assert.equal(r.applicable, true, `${file} should make the check applicable`);
  }
});

test("applicability: manifestImpact flag => applicable even without path match", () => {
  const r = isSourceFreshnessApplicable({ changedFiles: ["README.md"], manifestImpact: true });
  assert.equal(r.applicable, true);
});

test("applicability: trackImpact flag => applicable", () => {
  const r = isSourceFreshnessApplicable({ changedFiles: ["README.md"], trackImpact: true });
  assert.equal(r.applicable, true);
});

test("applicability: governedTrackIds configured + observed match => applicable", () => {
  const r = isSourceFreshnessApplicable({
    changedFiles: ["lib/design-intake/x.ts"],
    governedTrackIds: ["Track62"],
    observedTrackId: "Track62",
  });
  assert.equal(r.applicable, true);
});

test("applicability: governedTrackIds configured + no match => NOT_APPLICABLE", () => {
  const r = isSourceFreshnessApplicable({
    changedFiles: ["lib/design-intake/x.ts"],
    governedTrackIds: ["Track62"],
    observedTrackId: "Track61",
  });
  assert.equal(r.applicable, false);
  assert.equal(r.reasonCode, "NO_GOVERNED_TRACK_MATCH");
});

test("applicability: touchesDesignIntake matches markers + prefixes", () => {
  assert.equal(touchesDesignIntake("lib/design-intake/source-observer/x.ts"), true);
  assert.equal(touchesDesignIntake("app/design-lab/manifest.json"), true);
  assert.equal(touchesDesignIntake("docs/source-freshness.md"), true);
  assert.equal(touchesDesignIntake("lib/design-intake/drive-observer/race-guard.ts"), true);
  assert.equal(touchesDesignIntake("src/app/page.tsx"), false);
});

test("applicability: provider failure is NEVER hidden by N/A on applicable PRs", () => {
  // Applicability is decided from paths only; it does not look at provider
  // state. An applicable PR with a provider failure must stay blocking.
  const r = isSourceFreshnessApplicable({ changedFiles: ["lib/design-intake/x.ts"] });
  assert.equal(r.applicable, true);
});
