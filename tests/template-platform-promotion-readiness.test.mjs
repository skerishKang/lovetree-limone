import assert from "node:assert/strict";
import test from "node:test";

import {
  TEMPLATE_VARIANCE_DIMENSIONS,
  evaluateTemplatePromotionReadiness,
} from "../lib/template-platform/promotion-readiness.ts";
import { validateVariant } from "../lib/template-platform/validate-variants.ts";

/**
 * Data-variance promotion readiness proving fixtures (Issue #142 §8/§9).
 *
 * DATA ONLY. No real template promotion: Track49/Track70/moment-orbit/
 * figure-memory identities are deliberately NOT used here. No product route,
 * no registry adoption, no user-facing UI, no DB/API/Auth.
 */
function makeEvidence(overrides = {}) {
  return {
    schemaVersion: 1,
    templateId: "synthetic-variance-fixture",
    templateVersion: "1.0.0",
    requirements: [
      { dimension: "korean-title-short", level: "REQUIRED" },
      { dimension: "korean-title-long", level: "REQUIRED" },
      {
        dimension: "multiple-moments-within-bound",
        level: "REQUIRED",
        bound: { min: 2, max: 12 },
      },
      { dimension: "reduced-motion", level: "REQUIRED" },
      { dimension: "missing-optional-note", level: "OPTIONAL" },
    ],
    evidence: [
      {
        dimension: "korean-title-short",
        status: "PROVEN",
        evidenceRef: "qa/synthetic-short-title-run",
      },
      {
        dimension: "korean-title-long",
        status: "PROVEN",
        evidenceRef: "qa/synthetic-long-title-run",
      },
      {
        dimension: "multiple-moments-within-bound",
        status: "PROVEN",
        evidenceRef: "qa/synthetic-moments-min-max-run",
      },
      {
        dimension: "reduced-motion",
        status: "PROVEN",
        evidenceRef: "qa/synthetic-reduced-motion-run",
      },
    ],
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/* Authority lock: dimensions mirror #142 §9 exactly                   */
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

/* ------------------------------------------------------------------ */
/* Matrix 1 — all required evidence explicitly proven → PASS           */
/* ------------------------------------------------------------------ */

test("all REQUIRED dimensions explicitly PROVEN computes ready=true", () => {
  const result = evaluateTemplatePromotionReadiness(makeEvidence());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.ready, true);
  assert.deepEqual(result.value.missingRequiredDimensions, []);
  assert.deepEqual(result.value.provenDimensions, [
    "korean-title-long",
    "korean-title-short",
    "multiple-moments-within-bound",
    "reduced-motion",
  ]);
});

/* ------------------------------------------------------------------ */
/* Matrix 2 — one required dimension missing → FAIL                    */
/* ------------------------------------------------------------------ */

test("one REQUIRED dimension without PROVEN evidence blocks promotion", () => {
  const input = makeEvidence();
  input.evidence = input.evidence.filter(
    (entry) => entry.dimension !== "reduced-motion",
  );
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.ready, false);
  assert.deepEqual(result.value.missingRequiredDimensions, ["reduced-motion"]);
});

test("explicitly MISSING evidence on a REQUIRED dimension blocks promotion", () => {
  const input = makeEvidence();
  input.evidence = input.evidence.map((entry) =>
    entry.dimension === "reduced-motion"
      ? { ...entry, status: "MISSING", evidenceRef: undefined }
      : entry,
  );
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.ready, false);
  assert.deepEqual(result.value.missingRequiredDimensions, ["reduced-motion"]);
});

test("zero evidence entries block every REQUIRED dimension", () => {
  const result = evaluateTemplatePromotionReadiness(makeEvidence({ evidence: [] }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.ready, false);
  assert.deepEqual(result.value.missingRequiredDimensions, [
    "korean-title-long",
    "korean-title-short",
    "multiple-moments-within-bound",
    "reduced-motion",
  ]);
});

/* ------------------------------------------------------------------ */
/* Matrix 3 — unknown evidence status → FAIL                           */
/* ------------------------------------------------------------------ */

test("unknown evidence status is rejected fail-closed", () => {
  const input = makeEvidence();
  input.evidence[0] = { ...input.evidence[0], status: "SEEMS_FINE_PROBABLY" };
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(
    result.errors.join("\n"),
    /evidence \(korean-title-short\) status is out of range/,
  );
});

/* ------------------------------------------------------------------ */
/* Matrix 4 — unknown dimension → FAIL                                 */
/* ------------------------------------------------------------------ */

test("unknown requirement dimension is rejected fail-closed", () => {
  const input = makeEvidence();
  input.requirements = [
    ...input.requirements,
    { dimension: "telepathic-title", level: "OPTIONAL" },
  ];
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(
    result.errors.join("\n"),
    /requirement \(telepathic-title\) dimension is out of range/,
  );
});

test("unknown evidence dimension is rejected fail-closed", () => {
  const input = makeEvidence();
  input.evidence = [
    ...input.evidence,
    { dimension: "quantum-media", status: "PROVEN" },
  ];
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(
    result.errors.join("\n"),
    /evidence \(quantum-media\) dimension is out of range/,
  );
});

/* ------------------------------------------------------------------ */
/* Matrix 5 — duplicate dimension → FAIL                               */
/* ------------------------------------------------------------------ */

test("duplicate requirement and evidence dimensions are rejected", () => {
  const duplicatedRequirement = makeEvidence({
    requirements: [
      { dimension: "reduced-motion", level: "REQUIRED" },
      { dimension: "reduced-motion", level: "OPTIONAL" },
    ],
  });
  const requirementResult = evaluateTemplatePromotionReadiness(duplicatedRequirement);
  assert.equal(requirementResult.ok, false);
  if (!requirementResult.ok) {
    assert.match(
      requirementResult.errors.join("\n"),
      /duplicate requirement dimension: reduced-motion/,
    );
  }

  const duplicatedEvidence = makeEvidence({
    evidence: [
      { dimension: "reduced-motion", status: "PROVEN" },
      { dimension: "reduced-motion", status: "PROVEN" },
    ],
  });
  const evidenceResult = evaluateTemplatePromotionReadiness(duplicatedEvidence);
  assert.equal(evidenceResult.ok, false);
  if (!evidenceResult.ok) {
    assert.match(
      evidenceResult.errors.join("\n"),
      /duplicate evidence dimension: reduced-motion/,
    );
  }
});

/* ------------------------------------------------------------------ */
/* Matrix 6 — NOT_APPLICABLE where REQUIRED → FAIL                     */
/* ------------------------------------------------------------------ */

test("NOT_APPLICABLE under a REQUIRED dimension is never promotable", () => {
  const input = makeEvidence();
  input.evidence = input.evidence.map((entry) =>
    entry.dimension === "reduced-motion"
      ? { ...entry, status: "NOT_APPLICABLE" }
      : entry,
  );
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.ready, false);
  assert.deepEqual(result.value.missingRequiredDimensions, ["reduced-motion"]);
});

/* ------------------------------------------------------------------ */
/* Matrix 7 — OPTIONAL omission rules                                  */
/* ------------------------------------------------------------------ */

test("OPTIONAL dimension may be omitted, MISSING, or NOT_APPLICABLE", () => {
  const omitted = makeEvidence({
    evidence: makeEvidence().evidence.filter(
      (entry) => entry.dimension !== "missing-optional-note",
    ),
  });
  const omittedResult = evaluateTemplatePromotionReadiness(omitted);
  assert.equal(omittedResult.ok, true);
  if (omittedResult.ok) {
    assert.equal(omittedResult.value.ready, true);
    assert.deepEqual(omittedResult.value.unaddressedOptionalDimensions, [
      "missing-optional-note",
    ]);
  }

  const explicitMissing = makeEvidence();
  explicitMissing.evidence = explicitMissing.evidence.map((entry) =>
    entry.dimension === "missing-optional-note"
      ? { dimension: "missing-optional-note", status: "MISSING" }
      : entry,
  );
  const missingResult = evaluateTemplatePromotionReadiness(explicitMissing);
  assert.equal(missingResult.ok, true);
  if (missingResult.ok) {
    assert.equal(missingResult.value.ready, true);
  }

  const undeclared = makeEvidence({
    requirements: makeEvidence().requirements.filter(
      (requirement) => requirement.dimension !== "missing-optional-note",
    ),
    evidence: makeEvidence().evidence.filter(
      (entry) => entry.dimension !== "missing-optional-note",
    ),
  });
  const undeclaredResult = evaluateTemplatePromotionReadiness(undeclared);
  assert.equal(undeclaredResult.ok, true);
  if (undeclaredResult.ok) {
    assert.equal(undeclaredResult.value.ready, true);
  }
});

test("an all-OPTIONAL contract is invalid — it cannot prove reusability", () => {
  const input = makeEvidence({
    requirements: [{ dimension: "mobile-narrow-viewport", level: "OPTIONAL" }],
    evidence: [],
  });
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(
    result.errors.join("\n"),
    /at least one variance dimension must be declared REQUIRED/,
  );
});

test("empty requirements are invalid", () => {
  const result = evaluateTemplatePromotionReadiness(makeEvidence({ requirements: [] }));
  assert.equal(result.ok, false);
});

/* ------------------------------------------------------------------ */
/* Matrix 8 — caller claims cannot override the computed result        */
/* ------------------------------------------------------------------ */

test("a caller-supplied ready/promoted claim is rejected, never honored", () => {
  const claimingReady = makeEvidence();
  claimingReady.ready = true;
  const readyResult = evaluateTemplatePromotionReadiness(claimingReady);
  assert.equal(readyResult.ok, false);
  if (!readyResult.ok) {
    assert.match(
      readyResult.errors.join("\n"),
      /promotion evidence has unknown key: ready/,
    );
  }

  const claimingPromoted = makeEvidence();
  claimingPromoted.promoted = true;
  claimingPromoted.status = "PROMOTED";
  const promotedResult = evaluateTemplatePromotionReadiness(claimingPromoted);
  assert.equal(promotedResult.ok, false);

  const insufficientButClaiming = makeEvidence();
  insufficientButClaiming.evidence = [];
  const result = evaluateTemplatePromotionReadiness(insufficientButClaiming);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.ready, false);
  }
});

/* ------------------------------------------------------------------ */
/* Matrix 9 — executable content injection                             */
/* ------------------------------------------------------------------ */

test("executable-style evidenceRef content is rejected fail-closed", () => {
  const input = makeEvidence();
  input.evidence = input.evidence.map((entry) =>
    entry.dimension === "korean-title-short"
      ? {
          ...entry,
          evidenceRef: "<script>alert('pwned')</script>",
        }
      : entry,
  );
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(
    result.errors.join("\n"),
    /evidenceRef contains executable content/,
  );
});

test("executable-shaped values (functions) are rejected by type checks", () => {
  const input = makeEvidence();
  input.evidence = [
    ...input.evidence,
    { dimension: "slow-media", status: () => "PROVEN", evidenceRef: "qa/x" },
  ];
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(
    result.errors.join("\n"),
    /evidence \(slow-media\) status is out of range/,
  );
});

/* ------------------------------------------------------------------ */
/* Matrix 10 — input immutable                                         */
/* ------------------------------------------------------------------ */

test("evaluation never mutates the caller's input", () => {
  const input = makeEvidence();
  const snapshot = structuredClone(input);
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, true);
  assert.deepEqual(input, snapshot);
  if (result.ok) {
    assert.equal(Object.isFrozen(result.value), true);
    assert.equal(Object.isFrozen(result.value.provenDimensions), true);
    assert.equal(Object.isFrozen(result.value.missingRequiredDimensions), true);
  }
});

/* ------------------------------------------------------------------ */
/* Matrix 11 — per-template evaluation, no canonical winner            */
/* ------------------------------------------------------------------ */

test("two templates carry independent variance evidence without a winner", () => {
  const templateA = makeEvidence();
  const templateB = makeEvidence({
    templateId: "synthetic-variance-fixture-b",
    evidence: makeEvidence().evidence.filter(
      (entry) => entry.dimension !== "reduced-motion",
    ),
  });

  const resultA = evaluateTemplatePromotionReadiness(templateA);
  const resultB = evaluateTemplatePromotionReadiness(templateB);
  assert.equal(resultA.ok, true);
  assert.equal(resultB.ok, true);
  if (resultA.ok && resultB.ok) {
    assert.equal(resultA.value.ready, true);
    assert.equal(resultB.value.ready, false);
    assert.deepEqual(resultB.value.missingRequiredDimensions, ["reduced-motion"]);
    assert.notEqual(resultA.value.templateId, resultB.value.templateId);
  }

  // Re-evaluating A after B must not leak B's blockers.
  const resultAAgain = evaluateTemplatePromotionReadiness(templateA);
  assert.equal(resultAAgain.ok, true);
  if (resultAAgain.ok) {
    assert.equal(resultAAgain.value.ready, true);
    assert.deepEqual(resultAAgain.value.missingRequiredDimensions, []);
  }
});

/* ------------------------------------------------------------------ */
/* Matrix 12 — USER_SELECTABLE ≠ production/reusable promotion         */
/* ------------------------------------------------------------------ */

test("a USER_SELECTABLE variant with insufficient variance evidence stays NOT promotable", () => {
  // Valid per the #398 multi-variant contract…
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

  // …yet its base template lacks promotion evidence, so the #142 gate keeps
  // it NOT PROMOTABLE. Selection eligibility is a different authority.
  const insufficient = makeEvidence({
    evidence: makeEvidence().evidence.slice(0, 1),
  });
  const readiness = evaluateTemplatePromotionReadiness(insufficient);
  assert.equal(readiness.ok, true);
  if (readiness.ok) {
    assert.equal(readiness.value.ready, false);
    assert.deepEqual(readiness.value.missingRequiredDimensions, [
      "korean-title-long",
      "multiple-moments-within-bound",
      "reduced-motion",
    ]);
  }
});

/* ------------------------------------------------------------------ */
/* Structural integrity                                                */
/* ------------------------------------------------------------------ */

test("identity and version fields follow the shared contract shape", () => {
  const badVersion = makeEvidence({ templateVersion: "1.0" });
  assert.equal(evaluateTemplatePromotionReadiness(badVersion).ok, false);

  const badId = makeEvidence({ templateId: "Synthetic Fixture" });
  assert.equal(evaluateTemplatePromotionReadiness(badId).ok, false);

  const badSchema = makeEvidence({ schemaVersion: 2 });
  const schemaResult = evaluateTemplatePromotionReadiness(badSchema);
  assert.equal(schemaResult.ok, false);
  if (!schemaResult.ok) {
    assert.match(schemaResult.errors.join("\n"), /schemaVersion must be 1/);
  }
});

test("malformed bounds are rejected fail-closed", () => {
  const cases = [
    { min: 5, max: 2 },
    { min: -1 },
    { min: 1.5 },
    {},
    { weight: 3 },
  ];
  for (const bound of cases) {
    const input = makeEvidence();
    input.requirements = input.requirements.map((requirement) =>
      requirement.dimension === "multiple-moments-within-bound"
        ? { ...requirement, bound }
        : requirement,
    );
    const result = evaluateTemplatePromotionReadiness(input);
    assert.equal(result.ok, false, `bound ${JSON.stringify(bound)} must be rejected`);
  }

  const nonObjectBound = makeEvidence();
  nonObjectBound.requirements = nonObjectBound.requirements.map((requirement) =>
    requirement.dimension === "multiple-moments-within-bound"
      ? { ...requirement, bound: 12 }
      : requirement,
  );
  assert.equal(evaluateTemplatePromotionReadiness(nonObjectBound).ok, false);
});

test("evidence without a matching declared requirement is rejected", () => {
  const input = makeEvidence({
    requirements: [
      { dimension: "korean-title-short", level: "REQUIRED" },
      { dimension: "reduced-motion", level: "REQUIRED" },
    ],
  });
  const result = evaluateTemplatePromotionReadiness(input);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(
      result.errors.join("\n"),
      /evidence claims an undeclared requirement dimension/,
    );
  }
});
