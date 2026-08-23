import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTHORITY_REQUIRED_DIMENSIONS,
  TEMPLATE_VARIANCE_DIMENSIONS,
  evaluateTemplatePromotionReadiness,
  validateTemplateApplicabilityPolicy,
} from "../lib/template-platform/promotion-readiness.ts";
import { validateVariant } from "../lib/template-platform/validate-variants.ts";

/**
 * Data-variance promotion readiness proving fixtures (Issue #142 §8/§9,
 * corrected per PR #435 CTO review: caller-weakenable applicability removed).
 *
 * DATA ONLY. No real template promotion: Track49/Track70/moment-orbit/
 * figure-memory identities are deliberately NOT used here. No product route,
 * no registry adoption, no user-facing UI, no DB/API/Auth, no runtime
 * activation, no hydration, no persistence, no public gallery.
 */
const ALL_DIMS = [...TEMPLATE_VARIANCE_DIMENSIONS];

function makeProvenEvidence(overrides = {}) {
  return {
    schemaVersion: 1,
    templateId: "synthetic-variance-fixture",
    templateVersion: "1.0.0",
    evidence: ALL_DIMS.map((dimension) => ({
      dimension,
      status: "PROVEN",
      evidenceRef: `qa/synthetic-${dimension}`,
    })),
    ...overrides,
  };
}

function makeFullPolicy(overrides = {}) {
  return {
    schemaVersion: 1,
    templateId: "synthetic-variance-fixture",
    templateVersion: "1.0.0",
    applicabilities: ALL_DIMS.map((dimension) => ({
      dimension,
      applicability: "APPLICABLE",
    })),
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/* Authority lock: dimensions mirror #142 §9 and default to REQUIRED   */
/* ------------------------------------------------------------------ */

test("variance dimension registry mirrors the #142 §9 list exactly", () => {
  assert.deepEqual([...TEMPLATE_VARIANCE_DIMENSIONS], [
    "korean-title-short",
    "korean-title-long",
    "english-title-short",
    "english-title-long",
    "single-moment",
    "multiple-moments-within-bound",
    "portrait-media",
    "landscape-media",
    "image-only-media",
    "mixed-media",
    "missing-optional-note",
    "long-person-subject-name",
    "mobile-narrow-viewport",
    "reduced-motion",
    "slow-media",
    "media-decode-load-failure",
  ]);
});

test("the authority gate requires the FULL registry — callers cannot shrink it", () => {
  assert.deepEqual([...AUTHORITY_REQUIRED_DIMENSIONS], [...TEMPLATE_VARIANCE_DIMENSIONS]);
  assert.equal(Object.isFrozen(AUTHORITY_REQUIRED_DIMENSIONS), true);
});

/* ------------------------------------------------------------------ */
/* Matrix 1 — full explicit PROVEN coverage → PASS                     */
/* ------------------------------------------------------------------ */

test("all sixteen dimensions explicitly PROVEN computes ready=true", () => {
  const result = evaluateTemplatePromotionReadiness(makeProvenEvidence());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.ready, true);
  assert.deepEqual(result.value.unprovenDimensions, []);
  assert.equal(result.value.policyBound, false);
});

/* ------------------------------------------------------------------ */
/* Matrix 2 — any unproven authority dimension blocks promotion        */
/* ------------------------------------------------------------------ */

test("one MISSING dimension blocks promotion under the fixed authority gate", () => {
  const input = makeProvenEvidence();
  input.evidence = input.evidence.filter(
    (entry) => entry.dimension !== "reduced-motion",
  );
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.ready, false);
  assert.deepEqual(result.value.unprovenDimensions, ["reduced-motion"]);
  assert.deepEqual(result.value.applicableUnprovenDimensions, ["reduced-motion"]);
});

test("explicitly MISSING evidence is honest but never promotable", () => {
  const input = makeProvenEvidence();
  input.evidence = input.evidence.map((entry) =>
    entry.dimension === "slow-media" ? { dimension: "slow-media", status: "MISSING" } : entry,
  );
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.ready, false);
  assert.deepEqual(result.value.applicableUnprovenDimensions, ["slow-media"]);
});

test("zero evidence entries block all sixteen dimensions", () => {
  const result = evaluateTemplatePromotionReadiness(makeProvenEvidence({ evidence: [] }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.ready, false);
  assert.equal(result.value.unprovenDimensions.length, 16);
});

/* ------------------------------------------------------------------ */
/* Matrix 3/4/5 — unknown status/dimension, duplicates → FAIL          */
/* ------------------------------------------------------------------ */

test("unknown evidence status is rejected fail-closed", () => {
  const input = makeProvenEvidence();
  input.evidence[0] = { ...input.evidence[0], status: "SEEMS_FINE_PROBABLY" };
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(
      result.errors.join("\n"),
      /evidence \(korean-title-short\) status is out of range/,
    );
  }
});

test("NOT_APPLICABLE is no longer an evidence status — exemptions are policy-only", () => {
  const input = makeProvenEvidence();
  input.evidence = input.evidence.map((entry) =>
    entry.dimension === "landscape-media"
      ? { dimension: "landscape-media", status: "NOT_APPLICABLE" }
      : entry,
  );
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(
      result.errors.join("\n"),
      /NOT_APPLICABLE is a policy decision, never an evidence status/,
    );
  }
});

test("unknown evidence dimension is rejected fail-closed", () => {
  const input = makeProvenEvidence();
  input.evidence = [
    ...input.evidence,
    { dimension: "quantum-media", status: "PROVEN" },
  ];
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(
      result.errors.join("\n"),
      /evidence \(quantum-media\) dimension is out of range/,
    );
  }
});

test("duplicate evidence dimensions are rejected", () => {
  const input = makeProvenEvidence();
  input.evidence = [
    ...input.evidence,
    { dimension: "reduced-motion", status: "PROVEN" },
  ];
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(
      result.errors.join("\n"),
      /duplicate evidence dimension: reduced-motion/,
    );
  }
});

/* ------------------------------------------------------------------ */
/* MANDATORY REGRESSION — weakly-optionalized inline coverage          */
/* ------------------------------------------------------------------ */

test("inline REQUIRED/OPTIONAL classification is structurally impossible", () => {
  // The exact weakening vector from the CTO review: one dimension declared
  // REQUIRED, the remaining fifteen downgraded to OPTIONAL, with only that
  // single dimension proven. The requirements channel no longer exists.
  const [requiredDim, ...optionalDims] = ALL_DIMS;
  const weaklyOptionalized = makeProvenEvidence({
    requirements: [
      { dimension: requiredDim, level: "REQUIRED" },
      ...optionalDims.map((dimension) => ({ dimension, level: "OPTIONAL" })),
    ],
    evidence: [
      { dimension: requiredDim, status: "PROVEN", evidenceRef: "qa/synthetic-single-run" },
    ],
  });
  const result = evaluateTemplatePromotionReadiness(weaklyOptionalized);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(
      result.errors.join("\n"),
      /promotion evidence has unknown key: requirements/,
    );
  }

  // Even a fully honest-looking complete REQUIRED declaration is rejected:
  // the caller classification channel itself was removed, not policed.
  const fullyDeclared = makeProvenEvidence({
    requirements: ALL_DIMS.map((dimension) => ({ dimension, level: "REQUIRED" })),
  });
  assert.equal(evaluateTemplatePromotionReadiness(fullyDeclared).ok, false);

  // And without the inline channel, one proven dimension can NEVER yield
  // ready=true against the sixteen-dimension authority gate.
  const singleProven = makeProvenEvidence({
    evidence: [
      { dimension: requiredDim, status: "PROVEN", evidenceRef: "qa/synthetic-single-run" },
    ],
  });
  const strict = evaluateTemplatePromotionReadiness(singleProven);
  assert.equal(strict.ok, true);
  if (strict.ok) {
    assert.equal(strict.value.ready, false);
    assert.equal(strict.value.unprovenDimensions.length, 15);
  }
});

/* ------------------------------------------------------------------ */
/* Applicability policy channel — validated, transparent, non-gating   */
/* ------------------------------------------------------------------ */

test("a valid full-registry policy classifies gaps but cannot flip ready", () => {
  const provenOnly = ALL_DIMS[0];
  const exemptingPolicy = makeFullPolicy({
    applicabilities: ALL_DIMS.map((dimension) =>
      dimension === provenOnly
        ? { dimension, applicability: "APPLICABLE" }
        : {
            dimension,
            applicability: "EXEMPT_NOT_APPLICABLE",
            authorityRef: "cto/synthetic-exemption-decision-001",
          },
    ),
  });
  const policyResult = validateTemplateApplicabilityPolicy(exemptingPolicy);
  assert.equal(policyResult.ok, true);

  const input = makeProvenEvidence({
    evidence: [{ dimension: provenOnly, status: "PROVEN", evidenceRef: "qa/synthetic-one-run" }],
  });
  const result = evaluateTemplatePromotionReadiness(input, exemptingPolicy);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  // Even a validated, justified, identity-bound exemption of fifteen
  // dimensions can NEVER produce ready=true — equivalent incomplete
  // coverage stays NOT PROMOTABLE; exemptions stay visible metadata.
  assert.equal(result.value.ready, false);
  assert.equal(result.value.policyBound, true);
  assert.deepEqual(result.value.provenDimensions, [provenOnly]);
  assert.equal(result.value.exemptedUnprovenDimensions.length, 15);
  assert.deepEqual(result.value.applicableUnprovenDimensions, []);
});

test("policies must cover the FULL registry — partial coverage is invalid", () => {
  const partial = makeFullPolicy({
    applicabilities: ALL_DIMS.slice(0, 15).map((dimension) => ({
      dimension,
      applicability: "APPLICABLE",
    })),
  });
  const result = validateTemplateApplicabilityPolicy(partial);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(
      result.errors.join("\n"),
      /applicability policy is missing coverage for dimension: media-decode-load-failure/,
    );
  }
});

test("duplicate, unknown-status, and unjustified exemption entries are rejected", () => {
  const duplicated = makeFullPolicy({
    applicabilities: [
      ...makeFullPolicy().applicabilities,
      { dimension: "reduced-motion", applicability: "APPLICABLE" },
    ],
  });
  const duplicateResult = validateTemplateApplicabilityPolicy(duplicated);
  assert.equal(duplicateResult.ok, false);
  if (!duplicateResult.ok) {
    assert.match(duplicateResult.errors.join("\n"), /duplicate applicability dimension: reduced-motion/);
  }

  const badStatus = makeFullPolicy();
  badStatus.applicabilities = badStatus.applicabilities.map((entry) =>
    entry.dimension === "slow-media"
      ? { dimension: "slow-media", applicability: "SORT_OF_APPLICABLE" }
      : entry,
  );
  const statusResult = validateTemplateApplicabilityPolicy(badStatus);
  assert.equal(statusResult.ok, false);
  if (!statusResult.ok) {
    assert.match(statusResult.errors.join("\n"), /applicability \(slow-media\) applicability is out of range/);
  }

  const unjustified = makeFullPolicy();
  unjustified.applicabilities = unjustified.applicabilities.map((entry) =>
    entry.dimension === "landscape-media"
      ? { dimension: "landscape-media", applicability: "EXEMPT_NOT_APPLICABLE" }
      : entry,
  );
  const justificationResult = validateTemplateApplicabilityPolicy(unjustified);
  assert.equal(justificationResult.ok, false);
  if (!justificationResult.ok) {
    assert.match(
      justificationResult.errors.join("\n"),
      /applicability \(landscape-media\) EXEMPT_NOT_APPLICABLE requires an authorityRef justification/,
    );
  }
});

test("malformed bounds on policy entries are rejected fail-closed", () => {
  const cases = [
    { min: 5, max: 2 },
    { min: -1 },
    { min: 1.5 },
    {},
    { weight: 3 },
  ];
  for (const bound of cases) {
    const input = makeFullPolicy();
    input.applicabilities = input.applicabilities.map((entry) =>
      entry.dimension === "multiple-moments-within-bound"
        ? { ...entry, bound }
        : entry,
    );
    const result = validateTemplateApplicabilityPolicy(input);
    assert.equal(result.ok, false, `bound ${JSON.stringify(bound)} must be rejected`);
  }

  const nonObject = makeFullPolicy();
  nonObject.applicabilities = nonObject.applicabilities.map((entry) =>
    entry.dimension === "multiple-moments-within-bound"
      ? { ...entry, bound: 12 }
      : entry,
  );
  assert.equal(validateTemplateApplicabilityPolicy(nonObject).ok, false);
});

test("bound policies must pin the identical template identity", () => {
  const foreignPolicy = makeFullPolicy({ templateVersion: "2.0.0" });
  const result = evaluateTemplatePromotionReadiness(makeProvenEvidence(), foreignPolicy);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(
      result.errors.join("\n"),
      /does not match the evaluated evidence/,
    );
  }
});

/* ------------------------------------------------------------------ */
/* Caller claims cannot override the computed result                   */
/* ------------------------------------------------------------------ */

test("caller-supplied ready/promoted claims are rejected, never honored", () => {
  const claimingReady = makeProvenEvidence();
  claimingReady.ready = true;
  const readyResult = evaluateTemplatePromotionReadiness(claimingReady);
  assert.equal(readyResult.ok, false);
  if (!readyResult.ok) {
    assert.match(readyResult.errors.join("\n"), /promotion evidence has unknown key: ready/);
  }

  const claimingPromoted = makeProvenEvidence({ evidence: [] });
  claimingPromoted.promoted = true;
  claimingPromoted.status = "PROMOTED";
  const promotedResult = evaluateTemplatePromotionReadiness(claimingPromoted);
  assert.equal(promotedResult.ok, false);

  const insufficientButClaiming = makeProvenEvidence({ evidence: [] });
  const result = evaluateTemplatePromotionReadiness(insufficientButClaiming);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.ready, false);
  }
});

/* ------------------------------------------------------------------ */
/* Executable content injection                                        */
/* ------------------------------------------------------------------ */

test("executable-style strings are rejected in evidence and policy channels", () => {
  const poisonedEvidence = makeProvenEvidence();
  poisonedEvidence.evidence = poisonedEvidence.evidence.map((entry) =>
    entry.dimension === "korean-title-short"
      ? { ...entry, evidenceRef: "<script>alert('pwned')</script>" }
      : entry,
  );
  const evidenceResult = evaluateTemplatePromotionReadiness(poisonedEvidence);
  assert.equal(evidenceResult.ok, false);
  if (!evidenceResult.ok) {
    assert.match(evidenceResult.errors.join("\n"), /evidenceRef contains executable content/);
  }

  const poisonedPolicy = makeFullPolicy();
  poisonedPolicy.applicabilities = poisonedPolicy.applicabilities.map((entry) =>
    entry.dimension === "landscape-media"
      ? {
          dimension: "landscape-media",
          applicability: "EXEMPT_NOT_APPLICABLE",
          authorityRef: "javascript:alert(1)",
        }
      : entry,
  );
  const policyResult = validateTemplateApplicabilityPolicy(poisonedPolicy);
  assert.equal(policyResult.ok, false);
  if (!policyResult.ok) {
    assert.match(policyResult.errors.join("\n"), /authorityRef contains executable content/);
  }
});

test("executable-shaped values (functions) are rejected by type checks", () => {
  const input = makeProvenEvidence();
  input.evidence = [
    ...input.evidence,
    { dimension: "slow-media", status: () => "PROVEN", evidenceRef: "qa/x" },
  ];
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.join("\n"), /evidence \(slow-media\) status is out of range/);
  }
});

/* ------------------------------------------------------------------ */
/* Input immutability                                                  */
/* ------------------------------------------------------------------ */

test("evaluation never mutates the caller's inputs and freezes outputs", () => {
  const evidenceInput = makeProvenEvidence({ evidence: makeProvenEvidence().evidence.slice(0, 8) });
  const policyInput = makeFullPolicy({
    applicabilities: makeFullPolicy().applicabilities.map((entry) =>
      entry.dimension === "reduced-motion"
        ? {
            dimension: "reduced-motion",
            applicability: "EXEMPT_NOT_APPLICABLE",
            authorityRef: "cto/synthetic-exemption-decision-002",
          }
        : entry,
    ),
  });
  const evidenceSnapshot = structuredClone(evidenceInput);
  const policySnapshot = structuredClone(policyInput);
  const result = evaluateTemplatePromotionReadiness(evidenceInput, policyInput);
  assert.equal(result.ok, true);
  assert.deepEqual(evidenceInput, evidenceSnapshot);
  assert.deepEqual(policyInput, policySnapshot);
  if (result.ok) {
    assert.equal(Object.isFrozen(result.value), true);
    assert.equal(Object.isFrozen(result.value.provenDimensions), true);
    assert.equal(Object.isFrozen(result.value.unprovenDimensions), true);
    assert.equal(Object.isFrozen(result.value.exemptedUnprovenDimensions), true);
  }
});

/* ------------------------------------------------------------------ */
/* Per-template independence — no canonical winner                     */
/* ------------------------------------------------------------------ */

test("two templates carry independent variance evidence without a winner", () => {
  const templateA = makeProvenEvidence();
  const templateB = makeProvenEvidence({
    templateId: "synthetic-variance-fixture-b",
    evidence: makeProvenEvidence().evidence.filter(
      (entry) => entry.dimension !== "media-decode-load-failure",
    ),
  });

  const resultA = evaluateTemplatePromotionReadiness(templateA);
  const resultB = evaluateTemplatePromotionReadiness(templateB);
  assert.equal(resultA.ok, true);
  assert.equal(resultB.ok, true);
  if (resultA.ok && resultB.ok) {
    assert.equal(resultA.value.ready, true);
    assert.equal(resultB.value.ready, false);
    assert.deepEqual(resultB.value.applicableUnprovenDimensions, [
      "media-decode-load-failure",
    ]);
    assert.notEqual(resultA.value.templateId, resultB.value.templateId);
  }

  const resultAAgain = evaluateTemplatePromotionReadiness(templateA);
  assert.equal(resultAAgain.ok, true);
  if (resultAAgain.ok) {
    assert.equal(resultAAgain.value.ready, true);
    assert.deepEqual(resultAAgain.value.unprovenDimensions, []);
  }
});

/* ------------------------------------------------------------------ */
/* USER_SELECTABLE ≠ production/reusable promotion (#398 boundary)     */
/* ------------------------------------------------------------------ */

test("a USER_SELECTABLE variant with insufficient variance evidence stays NOT promotable", () => {
  const userSelectableVariant = {
    schemaVersion: 1,
    variantId: "synthetic-a-daylight",
    familyId: "synthetic-variance-family",
    label: "Synthetic A — Daylight",
    baseTemplateId: "synthetic-variance-fixture",
    baseTemplateVersion: "1.0.0",
    sourceProvenanceRef: {
      manifestStableId: "synthetic-d8-fixture",
      revisionLabel: "A",
    },
    status: "USER_SELECTABLE",
    themeIdentity: "daylight",
    requiredCapabilities: [],
    requiredPrimitives: [],
  };
  const variantResult = validateVariant(userSelectableVariant);
  assert.equal(variantResult.ok, true);

  // Valid per the #398 multi-variant contract… yet its base template lacks
  // promotion evidence, so the #142 gate keeps it NOT PROMOTABLE.
  const insufficient = makeProvenEvidence({
    evidence: makeProvenEvidence().evidence.slice(0, 3),
  });
  const readiness = evaluateTemplatePromotionReadiness(insufficient);
  assert.equal(readiness.ok, true);
  if (readiness.ok) {
    assert.equal(readiness.value.ready, false);
    assert.equal(readiness.value.unprovenDimensions.length, 13);
  }
});

/* ------------------------------------------------------------------ */
/* Structural integrity                                                */
/* ------------------------------------------------------------------ */

test("identity and version fields follow the shared contract shape", () => {
  const badVersion = makeProvenEvidence({ templateVersion: "1.0" });
  assert.equal(evaluateTemplatePromotionReadiness(badVersion).ok, false);

  const badId = makeProvenEvidence({ templateId: "Synthetic Fixture" });
  assert.equal(evaluateTemplatePromotionReadiness(badId).ok, false);

  const badSchema = makeProvenEvidence({ schemaVersion: 2 });
  const schemaResult = evaluateTemplatePromotionReadiness(badSchema);
  assert.equal(schemaResult.ok, false);
  if (!schemaResult.ok) {
    assert.match(schemaResult.errors.join("\n"), /schemaVersion must be 1/);
  }
});
