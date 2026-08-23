import assert from "node:assert/strict";
import test from "node:test";

import { validateDefinition } from "../lib/template-platform/validate.ts";
import {
  validateVariant,
  validateVariantBoundInstance,
  validateVariantFamily,
  validateVariantSelection,
} from "../lib/template-platform/validate-variants.ts";

/**
 * Synthetic D8 Phase 1 proving fixtures (Issue #142 D8, Refs #344).
 *
 * DATA ONLY. No real template promotion: Track49/Track70/moment-orbit/
 * figure-memory identities are deliberately NOT used here. No product route,
 * no registry adoption, no user-facing UI.
 */
const orbitGalleryDefinition = {
  schemaVersion: 1,
  templateId: "orbit-gallery",
  templateVersion: "1.0.0",
  label: "Orbit Gallery",
  description: "Synthetic multi-variant proving fixture for the D8 contract slice.",
  scenarioId: "relationship-retrospective",
  rendering: "sprite-2.5d",
  sourceProvenanceRef: {
    manifestStableId: "synthetic-d8-fixture",
    revisionLabel: "V0",
  },
  requiredCapabilities: ["spatial-orbit-3d"],
  requiredPrimitives: [{ id: "P4", readiness: "CONSUMER_PROVEN" }],
  slots: [
    { id: "selected-moment", kind: "data", dataType: "moment", policy: "USER_BINDABLE", required: true },
    { id: "accent", kind: "visualToken", tokenType: "accent", policy: "USER_CONFIGURABLE", allowedValues: ["rose", "sky"] },
    { id: "motion-style", kind: "option", policy: "USER_CONFIGURABLE", allowedValues: ["calm", "dynamic"] },
    { id: "locked-brand-label", kind: "copy", copyType: "ctaLabel", policy: "TEMPLATE_LOCKED" },
    { id: "source-manifest-ref", kind: "data", dataType: "treeSummary", policy: "SOURCE_REFERENCE_ONLY" },
    { id: "policy-note", kind: "copy", copyType: "userNote", policy: "PRODUCT_POLICY" },
  ],
  constraints: { orderingAllowed: false },
  compatibility: {},
  status: "DRAFT",
};

function makeVariant(overrides) {
  return {
    schemaVersion: 1,
    variantId: "orbit-a-daylight",
    familyId: "orbit-gallery",
    label: "Orbit A — Daylight",
    baseTemplateId: "orbit-gallery",
    baseTemplateVersion: "1.0.0",
    sourceProvenanceRef: {
      manifestStableId: "synthetic-d8-fixture",
      revisionLabel: "A",
    },
    status: "USER_SELECTABLE",
    themeIdentity: "daylight",
    requiredCapabilities: [],
    requiredPrimitives: [{ id: "P4", readiness: "CONSUMER_PROVEN" }],
    compatibility: { minBaseTemplateVersion: "1.0.0", maxBaseTemplateVersion: "1.0.0" },
    ...overrides,
  };
}

/** Scenario 12 base: TWO approved selectable variants coexist — no canonical pick. */
const orbitGalleryFamilyTwoVariants = {
  schemaVersion: 1,
  familyId: "orbit-gallery",
  label: "Orbit Gallery Family",
  variants: [
    makeVariant({}),
    makeVariant({
      variantId: "orbit-b-midnight",
      label: "Orbit B — Midnight",
      themeIdentity: "midnight",
      sourceProvenanceRef: {
        manifestStableId: "synthetic-d8-fixture",
        revisionLabel: "B",
      },
    }),
  ],
};

/** Adds an EVIDENCE_ONLY third alternative alongside the two selectable ones. */
const orbitGalleryFamilyWithEvidence = {
  ...orbitGalleryFamilyTwoVariants,
  variants: [
    ...orbitGalleryFamilyTwoVariants.variants,
    makeVariant({
      variantId: "orbit-c-evidence",
      label: "Orbit C — Evidence Only",
      themeIdentity: undefined,
      status: "EVIDENCE_ONLY",
      sourceProvenanceRef: {
        manifestStableId: "synthetic-d8-fixture",
        revisionLabel: "C",
      },
    }),
  ],
};

function makeBoundInstance(overrides) {
  return {
    templateId: "orbit-gallery",
    templateVersion: "1.0.0",
    treeId: "tree_01HZEXAMPLETREE",
    bindings: [
      { slotId: "selected-moment", value: "moment_m1" },
      { slotId: "accent", value: "rose" },
    ],
    familyId: "orbit-gallery",
    selectedVariantId: "orbit-a-daylight",
    ...overrides,
  };
}

function expectOk(result) {
  assert.equal(result.ok, true, `expected ok, got: ${JSON.stringify(result)}`);
  return result.value;
}

function expectFail(result, fragment) {
  assert.equal(result.ok, false, `expected failure, got ok: ${JSON.stringify(result)}`);
  assert.ok(
    result.errors.some((e) => e.includes(fragment)),
    `expected an error containing "${fragment}", got: ${JSON.stringify(result.errors)}`,
  );
}

/* ------------------------------------------------------------------ */
/* Fixture sanity                                                      */
/* ------------------------------------------------------------------ */

test("fixture guard: base definition satisfies the #184 contract", () => {
  expectOk(validateDefinition(orbitGalleryDefinition));
});

/* ------------------------------------------------------------------ */
/* Required proof 1 + 12 — multi-variant family, no canonical pick     */
/* ------------------------------------------------------------------ */

test("one family registers variants A + B together", () => {
  const family = expectOk(validateVariantFamily(orbitGalleryFamilyTwoVariants));
  assert.deepEqual(
    family.variants.map((v) => v.variantId),
    ["orbit-a-daylight", "orbit-b-midnight"],
  );
});

test("a two-variant family validates without any single canonical selection", () => {
  expectOk(validateVariantFamily(orbitGalleryFamilyTwoVariants));
  // BOTH variants are individually legal selections at the same time.
  expectOk(
    validateVariantSelection(
      { familyId: "orbit-gallery", selectedVariantId: "orbit-a-daylight" },
      orbitGalleryFamilyTwoVariants,
    ),
  );
  expectOk(
    validateVariantSelection(
      { familyId: "orbit-gallery", selectedVariantId: "orbit-b-midnight" },
      orbitGalleryFamilyTwoVariants,
    ),
  );
});

/* ------------------------------------------------------------------ */
/* Required proof 2 + 5 — explicit selection passes                    */
/* ------------------------------------------------------------------ */

test("valid selectedVariantId passes", () => {
  const selection = expectOk(
    validateVariantSelection(
      { familyId: "orbit-gallery", selectedVariantId: "orbit-a-daylight" },
      orbitGalleryFamilyWithEvidence,
    ),
  );
  assert.equal(selection.selectedVariantId, "orbit-a-daylight");
});

test("each explicitly promoted USER_SELECTABLE variant is selectable", () => {
  expectOk(
    validateVariantSelection(
      { familyId: "orbit-gallery", selectedVariantId: "orbit-b-midnight" },
      orbitGalleryFamilyWithEvidence,
    ),
  );
});

/* ------------------------------------------------------------------ */
/* Required proof 3 — unknown variant                                  */
/* ------------------------------------------------------------------ */

test("nonexistent selectedVariantId fails closed", () => {
  expectFail(
    validateVariantSelection(
      { familyId: "orbit-gallery", selectedVariantId: "orbit-x-ghost" },
      orbitGalleryFamilyWithEvidence,
    ),
    "does not exist in family",
  );
});

/* ------------------------------------------------------------------ */
/* Required proof 4 — non-selectable status                            */
/* ------------------------------------------------------------------ */

test("selecting an EVIDENCE_ONLY variant fails closed", () => {
  expectFail(
    validateVariantSelection(
      { familyId: "orbit-gallery", selectedVariantId: "orbit-c-evidence" },
      orbitGalleryFamilyWithEvidence,
    ),
    "not user-selectable",
  );
});

test("missing/unknown variant status is never treated as selectable", () => {
  const noStatus = makeVariant({});
  delete noStatus.status;
  expectFail(validateVariant(noStatus), "never selectable");
  expectFail(
    validateVariant(makeVariant({ status: "MAYBE_SELECTABLE" })),
    "never selectable",
  );
});

/* ------------------------------------------------------------------ */
/* Required proof 6 — duplicate variantId                              */
/* ------------------------------------------------------------------ */

test("duplicate variantId fails family validation", () => {
  expectFail(
    validateVariantFamily({
      ...orbitGalleryFamilyTwoVariants,
      variants: [makeVariant({}), makeVariant({})],
    }),
    "duplicate variantId",
  );
});

/* ------------------------------------------------------------------ */
/* Required proof 7 — identity mismatch between instance and variant   */
/* ------------------------------------------------------------------ */

test("instance referencing another template/version variant fails", () => {
  const futureFamily = {
    ...orbitGalleryFamilyTwoVariants,
    variants: [
      makeVariant({
        variantId: "orbit-b-midnight",
        label: "Orbit B — Midnight",
        themeIdentity: "midnight",
        baseTemplateVersion: "2.0.0",
        compatibility: undefined,
      }),
    ],
  };
  expectFail(
    validateVariantBoundInstance(
      makeBoundInstance({ selectedVariantId: "orbit-b-midnight" }),
      futureFamily,
      orbitGalleryDefinition,
    ),
    "does not match variant baseTemplateVersion",
  );
});

/* ------------------------------------------------------------------ */
/* Required proof 8–11 — authority classes stay enforced through the   */
/* variant-bound path (delegated to the #184 validator)                */
/* ------------------------------------------------------------------ */

test("USER_CONFIGURABLE value outside the allowed range fails", () => {
  expectFail(
    validateVariantBoundInstance(
      makeBoundInstance({
        bindings: [
          { slotId: "selected-moment", value: "moment_m1" },
          { slotId: "accent", value: "neon" },
        ],
      }),
      orbitGalleryFamilyWithEvidence,
      orbitGalleryDefinition,
    ),
    "out of the allowed enum range",
  );
});

test("overwriting a TEMPLATE_LOCKED value fails", () => {
  expectFail(
    validateVariantBoundInstance(
      makeBoundInstance({
        bindings: [
          { slotId: "selected-moment", value: "moment_m1" },
          { slotId: "locked-brand-label", value: "my own brand" },
        ],
      }),
      orbitGalleryFamilyWithEvidence,
      orbitGalleryDefinition,
    ),
    "TEMPLATE_LOCKED does not permit instance bindings",
  );
});

test("injecting SOURCE_REFERENCE_ONLY data as runtime user config fails", () => {
  expectFail(
    validateVariantBoundInstance(
      makeBoundInstance({
        bindings: [
          { slotId: "selected-moment", value: "moment_m1" },
          { slotId: "source-manifest-ref", value: "synthetic-d8-fixture" },
        ],
      }),
      orbitGalleryFamilyWithEvidence,
      orbitGalleryDefinition,
    ),
    "SOURCE_REFERENCE_ONLY does not permit instance bindings",
  );
});

test("unknown executable-style configuration fails closed", () => {
  expectFail(
    validateVariantBoundInstance(
      makeBoundInstance({
        customTransform: "<script>alert(1)</script>",
      }),
      orbitGalleryFamilyWithEvidence,
      orbitGalleryDefinition,
    ),
    "unknown key: customTransform",
  );
  expectFail(
    validateVariantBoundInstance(
      makeBoundInstance({
        bindings: [
          { slotId: "selected-moment", value: "moment_m1" },
          {
            slotId: "locked-brand-label",
            value: "<img src=x onerror=alert(1)>",
          },
        ],
      }),
      orbitGalleryFamilyWithEvidence,
      orbitGalleryDefinition,
    ),
    "contains executable content",
  );
});

/* ------------------------------------------------------------------ */
/* Extra — false promotion gate                                        */
/* ------------------------------------------------------------------ */

test("USER_SELECTABLE cannot be backed by unproven primitives", () => {
  expectFail(
    validateVariant(
      makeVariant({
        requiredPrimitives: [{ id: "P2", readiness: "CORE_EXTRACTED" }],
      }),
    ),
    "CONSUMER_PROVEN",
  );
});
