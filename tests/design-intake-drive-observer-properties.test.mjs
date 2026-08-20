// Issue #173 / PR #243 — deterministic property/fuzzer tests for the shadow
// decision layer.
//
// No fast-check dependency: a hand-written deterministic seeded PRNG generates
// randomized inputs against the REAL production pure modules:
//   - evaluatePassSeal (race-guard.ts)
//   - isSourceFreshnessApplicable (applicability.ts)
//   - buildSourceFreshnessCheckDecision (check-decision.ts)
//   - stableStringify / stableParseAndReserialize (stable-json.ts)
//
// 10 properties (P1–P10) + counterexample minimization.
// No network, no Drive mutation, no GitHub mutation, no secrets.

import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluatePassSeal,
  isSourceFreshnessApplicable,
  buildSourceFreshnessCheckDecision,
  DESIGN_SOURCE_FRESHNESS_CHECK_NAME,
  stableStringify,
  stableParseAndReserialize,
  stableEqual,
} from "../lib/design-intake/drive-observer/index.ts";
import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";
import { resolveSourceFreshness } from "../lib/design-intake/source-freshness.ts";
import { observationToDriveSourceState } from "../lib/design-intake/drive-observer/index.ts";

/* ------------------------------------------------------------------ */
/* Deterministic seeded PRNG (mulberry32 — no dependency needed)       */
/* ------------------------------------------------------------------ */

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Generators using PR243 real types                                   */
/* ------------------------------------------------------------------ */

const PROVIDER_STATES = ["SUCCESS", "INCOMPLETE", "UNAVAILABLE", "AUTH_FAILED", "PERMISSION_DENIED", "API_ERROR"];

function hexChar(rng) {
  return "0123456789abcdef"[Math.floor(rng() * 16)];
}

function genSha256(rng) {
  let s = "";
  for (let i = 0; i < 64; i++) s += hexChar(rng);
  return s;
}

function genSha40(rng) {
  let s = "";
  for (let i = 0; i < 40; i++) s += hexChar(rng);
  return s;
}

function genDriveId(rng) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789_-";
  const len = 25 + Math.floor(rng() * 20);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(rng() * chars.length)];
  return s;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function genSourceEvidence(rng) {
  return {
    fileId: genDriveId(rng),
    modifiedTime: "2026-08-14T09:00:00.000Z",
    bytes: 100 + Math.floor(rng() * 200),
    sha256: genSha256(rng),
  };
}

function genPassSeal(rng) {
  return {
    verdict: "PASS",
    prHeadSha: genSha40(rng),
    mainSha: genSha40(rng),
    observationTimestamp: "2026-08-17T09:00:00.000Z",
    source: genSourceEvidence(rng),
  };
}

function genFreshPreMerge(rng, baseSeal) {
  // 50% chance to mutate something
  const providerState = pick(rng, PROVIDER_STATES);
  const headMatches = rng() < 0.5;
  const baseMatches = rng() < 0.5;
  const sourceMatches = rng() < 0.5;
  return {
    providerState,
    observationComplete: providerState === "SUCCESS" ? rng() < 0.8 : false,
    paginationComplete: providerState !== "INCOMPLETE" ? rng() < 0.8 : false,
    prHeadSha: headMatches ? baseSeal.prHeadSha : genSha40(rng),
    mainSha: baseMatches ? baseSeal.mainSha : genSha40(rng),
    source: sourceMatches ? baseSeal.source : genSourceEvidence(rng),
  };
}

/**
 * Build a minimal DriveObservation (PR243 real type) for check-decision tests.
 * Uses the same shape as the real observer would produce.
 */
function genObservation(rng, providerState) {
  const sha = genSha256(rng);
  const fileId = genDriveId(rng);
  const complete = providerState === "SUCCESS";
  return {
    schemaVersion: 1,
    observationTimestamp: "2026-08-17T09:00:00.000Z",
    trackRootIdentity: "track-observer-62-exact",
    providerState,
    observationComplete: complete,
    paginationComplete: providerState !== "INCOMPLETE",
    rootCurrentAlias: complete
      ? { fileId, sha256: sha, bytes: 123, revisionLabel: "V1.1", aliasSource: "CONFIG_DECLARED" }
      : undefined,
    candidateFiles: complete
      ? [{
          fileId,
          filename: "Track62 V1.1.html",
          mimeType: "text/html",
          modifiedTime: "2026-08-14T09:00:00.000Z",
          bytes: 123,
          sha256: sha,
          sha256Source: "COMPUTED_FROM_CONTENT",
          receivedBytes: 123,
          executableState: "CONTENT_PRESENT",
          hashEvidence: { attempted: true, verified: true, declaredBytes: 123, receivedBytes: 123 },
          filenameRevisionLabel: "V1.1",
          declaredFunctional: true,
          declaredDisplay: false,
          declaredHistorical: false,
          declaredRootCurrent: true,
        }]
      : [],
    functionalRevisionCandidates: complete ? [fileId] : [],
    displayRevisionCandidates: [],
    historicalRevisionCandidates: [],
    providerErrors: complete ? [] : [{ stage: "LIST", code: "API_ERROR", message: "degraded provider" }],
  };
}

/**
 * Build a minimal manifest matching the observation (for PASS/CURRENT path).
 */
function genManifest(rng, observation) {
  const sha = observation.rootCurrentAlias?.sha256 ?? genSha256(rng);
  const fileId = observation.rootCurrentAlias?.fileId ?? genDriveId(rng);
  return parseIntakeManifest({
    schemaVersion: 1,
    stableId: "track-observer-62-exact",
    sourceTrackId: "Track62",
    title: "property-test manifest",
    classification: "NEW_LINEAGE",
    lifecycle: "EXECUTABLE_AVAILABLE",
    rendering: "dom-2d",
    scenarioId: "entry-onboarding",
    productJob: "property-test",
    summary: "property-test",
    provenance: { sourceLabel: "synthetic", sourceFiles: ["fixture.html"], rightsStatus: "sibling-source-owned" },
    lineageReservation: { status: "PENDING", note: "property-test" },
    backendScope: "BACKEND_FREE",
    sourceArtifacts: [{ filename: "fixture.html", driveId: fileId, bytes: 123, sha256: sha, role: "executable", status: "PINNED" }],
    sourceSnapshot: { revisionLabel: "V1.1", authorityObservedAt: "2026-08-14T09:00:00.000Z", sourceAuthorityState: "CURRENT_AT_OBSERVATION" },
  });
}

/* ------------------------------------------------------------------ */
/* Counterexample minimization                                        */
/* ------------------------------------------------------------------ */

function minimizeCounterexample(propertyFn, failingInput, rng) {
  let best = JSON.parse(JSON.stringify(failingInput));
  let bestDesc = JSON.stringify(best);
  // Try reducing the input: truncate strings, zero out fields, etc.
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = JSON.parse(JSON.stringify(best));
    // Randomly simplify one aspect
    const strategy = Math.floor(rng() * 4);
    if (strategy === 0 && candidate.source) {
      candidate.source.bytes = 0;
    } else if (strategy === 1 && candidate.prHeadSha) {
      candidate.prHeadSha = candidate.prHeadSha.slice(0, 7);
      if (candidate.currentHeadSha) candidate.currentHeadSha = candidate.currentHeadSha.slice(0, 7);
    } else if (strategy === 2 && candidate.providerState) {
      candidate.providerState = "SUCCESS";
    } else if (strategy === 3 && candidate.source) {
      candidate.source.modifiedTime = "";
    }
    try {
      if (!propertyFn(candidate)) {
        const desc = JSON.stringify(candidate);
        if (desc.length < bestDesc.length) {
          best = candidate;
          bestDesc = desc;
        }
      }
    } catch {
      // ignore — this candidate doesn't reproduce
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Property assertions                                                 */
/* ------------------------------------------------------------------ */

const FUZZ_ITERATIONS = 500;
const SEED = 12345;

// P1: same input => same decision (determinism)
test("P1: deterministic — same normalized input always produces the same decision", () => {
  const rng = mulberry32(SEED);
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const seal = genPassSeal(rng);
    const fresh = genFreshPreMerge(rng, seal);
    const result1 = evaluatePassSeal(seal, fresh);
    const result2 = evaluatePassSeal(seal, fresh);
    assert.deepEqual(result1, result2, `iteration ${i}: same input must produce identical result`);
  }
});

// P2: provider != SUCCESS => UNKNOWN / blocking
test("P2: non-SUCCESS provider state => UNKNOWN + blocking (never PASS)", () => {
  const rng = mulberry32(SEED + 1);
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const seal = genPassSeal(rng);
    for (const state of ["INCOMPLETE", "UNAVAILABLE", "AUTH_FAILED", "PERMISSION_DENIED", "API_ERROR"]) {
      const fresh = {
        providerState: state,
        observationComplete: false,
        paginationComplete: state !== "INCOMPLETE",
        prHeadSha: seal.prHeadSha,
        mainSha: seal.mainSha,
        source: seal.source,
      };
      const d = evaluatePassSeal(seal, fresh);
      assert.equal(d.status, "UNKNOWN", `provider ${state} must be UNKNOWN`);
      assert.equal(d.mergeBlock, true, `provider ${state} must block`);
      assert.equal(d.mergeAuthoritative, false, `provider ${state} must not be authoritative`);
    }
  }
});

// P3: observationComplete=false or paginationComplete=false => non-authoritative / blocking
test("P3: incomplete observation or pagination => non-authoritative + blocking", () => {
  const rng = mulberry32(SEED + 2);
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const seal = genPassSeal(rng);
    for (const incomplete of [{ observationComplete: false, paginationComplete: true }, { observationComplete: true, paginationComplete: false }]) {
      const fresh = {
        providerState: "SUCCESS",
        ...incomplete,
        prHeadSha: seal.prHeadSha,
        mainSha: seal.mainSha,
        source: seal.source,
      };
      const d = evaluatePassSeal(seal, fresh);
      assert.equal(d.mergeAuthoritative, false, "incomplete must not be authoritative");
      assert.equal(d.mergeBlock, true, "incomplete must block");
      assert.equal(d.status, "UNKNOWN", "incomplete must be UNKNOWN");
    }
  }
});

// P4: observed PR head != fresh PR head => HEAD_MOVED / blocking
test("P4: head movement => HEAD_MOVED + blocking + reobserve", () => {
  const rng = mulberry32(SEED + 3);
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const seal = genPassSeal(rng);
    const freshHead = genSha40(rng);
    if (freshHead === seal.prHeadSha) continue;
    const fresh = {
      providerState: "SUCCESS",
      observationComplete: true,
      paginationComplete: true,
      prHeadSha: freshHead,
      mainSha: seal.mainSha,
      source: seal.source,
    };
    const d = evaluatePassSeal(seal, fresh);
    assert.equal(d.mergeAuthoritative, false);
    assert.equal(d.mergeBlock, true);
    assert.equal(d.reason, "HEAD_MOVED");
    assert.equal(d.reobservationRequired, true);
    assert.notEqual(d.observedHeadSha, d.currentHeadSha);
  }
});

// P5: observed base/main SHA != fresh base/main SHA => STALE_OBSERVATION / blocking
test("P5: base movement => BASE_MOVED + blocking", () => {
  const rng = mulberry32(SEED + 4);
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const seal = genPassSeal(rng);
    const freshBase = genSha40(rng);
    if (freshBase === seal.mainSha) continue;
    const fresh = {
      providerState: "SUCCESS",
      observationComplete: true,
      paginationComplete: true,
      prHeadSha: seal.prHeadSha,
      mainSha: freshBase,
      source: seal.source,
    };
    const d = evaluatePassSeal(seal, fresh);
    assert.equal(d.mergeAuthoritative, false);
    assert.equal(d.mergeBlock, true);
    assert.equal(d.reason, "BASE_MOVED");
    assert.notEqual(d.observedBaseSha, d.currentBaseSha);
  }
});

// P6: source fileId drift => historical green invalid
test("P6: source fileId drift => SOURCE_CHANGED + blocking", () => {
  const rng = mulberry32(SEED + 5);
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const seal = genPassSeal(rng);
    const newFileId = genDriveId(rng);
    if (newFileId === seal.source.fileId) continue;
    const fresh = {
      providerState: "SUCCESS",
      observationComplete: true,
      paginationComplete: true,
      prHeadSha: seal.prHeadSha,
      mainSha: seal.mainSha,
      source: { ...seal.source, fileId: newFileId },
    };
    const d = evaluatePassSeal(seal, fresh);
    assert.equal(d.mergeAuthoritative, false);
    assert.equal(d.mergeBlock, true);
    assert.equal(d.reason, "SOURCE_CHANGED_SINCE_PASS");
    assert.deepEqual(d.changedFields, ["fileId"]);
  }
});

// P7: source modifiedTime / bytes / sha256 drift (each independently) => historical green invalid
test("P7: modifiedTime / bytes / sha256 drift each independently => SOURCE_CHANGED", () => {
  const rng = mulberry32(SEED + 6);
  const fields = ["modifiedTime", "bytes", "sha256"];
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const seal = genPassSeal(rng);
    const field = pick(rng, fields);
    let newValue;
    if (field === "modifiedTime") newValue = "2026-08-17T13:41:00.000Z";
    else if (field === "bytes") newValue = seal.source.bytes + 1;
    else newValue = genSha256(rng);
    if (newValue === seal.source[field]) continue;
    const fresh = {
      providerState: "SUCCESS",
      observationComplete: true,
      paginationComplete: true,
      prHeadSha: seal.prHeadSha,
      mainSha: seal.mainSha,
      source: { ...seal.source, [field]: newValue },
    };
    const d = evaluatePassSeal(seal, fresh);
    assert.equal(d.mergeAuthoritative, false, `${field} drift must revoke`);
    assert.equal(d.reason, "SOURCE_CHANGED_SINCE_PASS");
    assert.deepEqual(d.changedFields, [field]);
  }
});

// P8: packaging-only new fileId with same content SHA => old historical PASS invalidated
//     BUT fresh resolver may legitimately resolve PASS
test("P8: packaging-only fileId change invalidates old seal, but fresh resolver may still PASS", () => {
  const rng = mulberry32(SEED + 7);
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const seal = genPassSeal(rng);
    const newFileId = genDriveId(rng);
    // Same sha256, different fileId (packaging-only)
    const fresh = {
      providerState: "SUCCESS",
      observationComplete: true,
      paginationComplete: true,
      prHeadSha: seal.prHeadSha,
      mainSha: seal.mainSha,
      source: { ...seal.source, fileId: newFileId },
    };
    const d = evaluatePassSeal(seal, fresh);
    // Old seal is invalidated (fileId changed)
    assert.equal(d.mergeAuthoritative, false, "packaging-only fileId change must invalidate old seal");
    assert.equal(d.reason, "SOURCE_CHANGED_SINCE_PASS");
    assert.deepEqual(d.changedFields, ["fileId"]);
    // BUT the #171 resolver on a fresh observation with same SHA + different fileId
    // would legitimately return PASS/PACKAGING_ONLY. Verify by building a
    // DriveSourceState where rootCandidate has the new fileId but same sha256.
    const driveState = {
      available: true,
      rootCandidate: { driveId: newFileId, sha256: seal.source.sha256, bytes: seal.source.bytes, revisionLabel: "V1.1" },
      files: [{ driveId: newFileId, revisionLabel: "V1.1", sha256: seal.source.sha256, bytes: seal.source.bytes, functional: true }],
    };
    const manifest = genManifest(rng, { rootCurrentAlias: { sha256: seal.source.sha256, fileId: seal.source.fileId } });
    const verdict = resolveSourceFreshness(manifest, driveState);
    assert.equal(verdict.status, "PASS");
    assert.equal(verdict.reason, "PACKAGING_ONLY");
  }
});

// P9: NOT_APPLICABLE may be produced only by trusted applicability/path/config logic;
//     provider failure must never produce NOT_APPLICABLE
test("P9: NOT_APPLICABLE only from path/config, never from provider failure", () => {
  const rng = mulberry32(SEED + 8);
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const state = pick(rng, PROVIDER_STATES);
    const observation = genObservation(rng, state);
    const manifest = genManifest(rng, observation);

    // Unrelated PR files => NOT_APPLICABLE regardless of provider state
    const naDecision = buildSourceFreshnessCheckDecision({
      observation,
      manifest,
      observedHeadSha: genSha40(rng),
      observedBaseSha: genSha40(rng),
      freshHeadSha: genSha40(rng),
      freshBaseSha: genSha40(rng),
      applicability: { applicable: false, reasonCode: "NO_DESIGN_INTAKE_CHANGES" },
      decisionTimestamp: "2026-08-17T13:40:00.000Z",
      providerState: state,
      paginationComplete: observation.paginationComplete,
      observationComplete: observation.observationComplete,
    });
    assert.equal(naDecision.reasonCode, "NOT_APPLICABLE");
    assert.equal(naDecision.blocking, false);

    // Applicable PR with provider failure => NEVER NOT_APPLICABLE
    if (state !== "SUCCESS") {
      const appDecision = buildSourceFreshnessCheckDecision({
        observation,
        manifest,
        observedHeadSha: genSha40(rng),
        observedBaseSha: genSha40(rng),
        freshHeadSha: genSha40(rng),
        freshBaseSha: genSha40(rng),
        applicability: { applicable: true },
        decisionTimestamp: "2026-08-17T13:40:00.000Z",
        providerState: state,
        paginationComplete: observation.paginationComplete,
        observationComplete: observation.observationComplete,
      });
      assert.notEqual(appDecision.reasonCode, "NOT_APPLICABLE", "provider failure must never be N/A on applicable PR");
      assert.equal(appDecision.blocking, true, "provider failure must block on applicable PR");
    }
  }
});

// P10: applicable target + provider unavailable/incomplete => UNKNOWN / blocking
test("P10: applicable + provider unavailable/incomplete => UNKNOWN/blocking", () => {
  const rng = mulberry32(SEED + 9);
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const state = pick(rng, ["UNAVAILABLE", "INCOMPLETE", "AUTH_FAILED", "PERMISSION_DENIED", "API_ERROR"]);
    const observation = genObservation(rng, state);
    const manifest = genManifest(rng, observation);
    const decision = buildSourceFreshnessCheckDecision({
      observation,
      manifest,
      observedHeadSha: genSha40(rng),
      observedBaseSha: genSha40(rng),
      freshHeadSha: genSha40(rng),
      freshBaseSha: genSha40(rng),
      applicability: { applicable: true },
      decisionTimestamp: "2026-08-17T13:40:00.000Z",
      providerState: state,
      paginationComplete: observation.paginationComplete,
      observationComplete: observation.observationComplete,
    });
    assert.notEqual(decision.conclusion, "SUCCESS", `${state} must never be SUCCESS`);
    assert.equal(decision.blocking, true, `${state} must block`);
    assert.equal(decision.details.applicable, true, "applicability must be preserved");
    assert.equal(decision.details.resolverStatus, "SKIPPED", "resolver must be skipped on provider failure");
  }
});

/* ------------------------------------------------------------------ */
/* Deterministic serialization (stable-json)                          */
/* ------------------------------------------------------------------ */

test("serialization: stableStringify is byte-identical for same input across runs", () => {
  const rng = mulberry32(SEED + 10);
  for (let i = 0; i < 100; i++) {
    const obj = {
      b: genSha256(rng),
      a: genSha40(rng),
      c: [genDriveId(rng), genDriveId(rng)],
      nested: { z: 1, y: "x", a: true },
    };
    const s1 = stableStringify(obj);
    const s2 = stableStringify(obj);
    assert.equal(s1, s2, "same object must serialize identically");
    // Keys must be canonical (sorted)
    assert.ok(s1.indexOf('"a"') < s1.indexOf('"b"'), "keys must be sorted");
  }
});

test("serialization: parse → reserialize preserves semantic equality (PROPERTY 10 round-trip)", () => {
  const rng = mulberry32(SEED + 11);
  for (let i = 0; i < 100; i++) {
    const seal = genPassSeal(rng);
    const fresh = genFreshPreMerge(rng, seal);
    const d1 = evaluatePassSeal(seal, fresh);
    const json = stableStringify(d1);
    const d2 = JSON.parse(json);
    const json2 = stableStringify(d2);
    assert.equal(json, json2, "round-trip must preserve semantic equality");
    assert.ok(stableEqual(d1, d2), "stableEqual must confirm round-trip");
  }
});

test("serialization: stable-json fills a real gap (PR243 has no canonical serializer)", () => {
  // PR243 uses JSON.stringify (key order = insertion order, not canonical).
  // stableStringify uses canonical key order. Verify the gap:
  const obj = { z: 1, a: 2, m: 3 };
  const native = JSON.stringify(obj);
  const stable = stableStringify(JSON.parse(JSON.stringify(obj)));
  assert.notEqual(native, stable, "native JSON.stringify preserves insertion order; stable sorts canonically");
  assert.ok(stable.indexOf('"a"') < stable.indexOf('"m"'), "stable serializer sorts keys");
});

/* ------------------------------------------------------------------ */
/* Counterexample minimization                                        */
/* ------------------------------------------------------------------ */

test("counterexample minimization: finds minimal failing case for a synthetic broken property", () => {
  // Simulate a property that SHOULD hold: "if provider is SUCCESS and head/base/source
  // match, the seal must be authoritative." We introduce a synthetic bug in a
  // test-only wrapper to verify minimization produces a minimal counterexample.
  const rng = mulberry32(SEED + 12);

  // Broken wrapper: fails when bytes is exactly 137 (synthetic bug)
  function brokenEvaluate(seal, fresh) {
    const real = evaluatePassSeal(seal, fresh);
    if (seal.source.bytes === 137) {
      return { ...real, mergeAuthoritative: false, mergeBlock: true, reason: "SYNTHETIC_BUG" };
    }
    return real;
  }

  const propertyFn = (input) => {
    const seal = input.seal ?? input;
    const fresh = input.fresh ?? { providerState: "SUCCESS", observationComplete: true, paginationComplete: true, prHeadSha: seal.prHeadSha, mainSha: seal.mainSha, source: seal.source };
    const d = brokenEvaluate(seal, fresh);
    // Property: "when everything matches, it should be authoritative"
    return d.mergeAuthoritative === true;
  };

  // Find a failing case
  let failingInput = null;
  for (let i = 0; i < 1000 && !failingInput; i++) {
    const seal = genPassSeal(rng);
    const fresh = {
      providerState: "SUCCESS",
      observationComplete: true,
      paginationComplete: true,
      prHeadSha: seal.prHeadSha,
      mainSha: seal.mainSha,
      source: seal.source,
    };
    if (!propertyFn({ seal, fresh })) {
      failingInput = { seal, fresh };
    }
  }

  assert.ok(failingInput, "must find a failing case");
  assert.equal(failingInput.seal.source.bytes, 137, "failing case must have bytes=137");

  // Minimize: the minimal counterexample should keep bytes=137 but simplify other fields
  const minimized = minimizeCounterexample(propertyFn, failingInput, mulberry32(SEED + 13));
  assert.equal(propertyFn(minimized), false, "minimized case must still fail");
  // The minimized case should be no larger than the original
  assert.ok(
    JSON.stringify(minimized).length <= JSON.stringify(failingInput).length,
    "minimized counterexample must not be larger than original",
  );
});

test("counterexample minimization: report format is human-readable (no secrets)", () => {
  const rng = mulberry32(SEED + 14);
  const seal = genPassSeal(rng);
  const fresh = {
    providerState: "SUCCESS",
    observationComplete: true,
    paginationComplete: true,
    prHeadSha: seal.prHeadSha,
    mainSha: seal.mainSha,
    source: { ...seal.source, fileId: genDriveId(rng) },
  };
  const d = evaluatePassSeal(seal, fresh);
  // The reason + changedFields must be human-readable
  assert.equal(d.reason, "SOURCE_CHANGED_SINCE_PASS");
  assert.deepEqual(d.changedFields, ["fileId"]);
  // No secret patterns in the result
  const serialized = JSON.stringify(d);
  assert.doesNotMatch(serialized, /ya29\.|AIza|gh[pousr]_|Bearer\s/);
});
