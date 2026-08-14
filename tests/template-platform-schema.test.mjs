import assert from "node:assert/strict";
import test from "node:test";

import {
  containsExecutableContent,
  validateDefinition,
  validateInstance,
} from "../lib/template-platform/validate.ts";

/**
 * Synthetic first proving fixture — Spatial / Media Browser (Issue #184).
 *
 * DATA ONLY. No product route, no adoption, no DB/API/persistence semantics.
 * Readiness declarations match current truth (as of #184):
 *   P4 = CONSUMER_PROVEN (pure core #179 + consumer wiring #182 merged)
 *   P2 = CORE_EXTRACTED (ordered-frame core #186 merged; wiring not proven)
 *   P3 = HOLD (consumer-local, #185 in progress)
 */
const spatialMediaBrowserDefinition = {
  schemaVersion: 1,
  templateId: "spatial-media-browser",
  templateVersion: "0.1.0",
  label: "Spatial / Media Browser",
  description: "Browse Moments and media on a spatial canvas around a canonical selected Moment.",
  scenarioId: "relationship-retrospective",
  rendering: "dom-2d",
  sourceProvenanceRef: {
    manifestStableId: "track-61-v1-9",
    revisionLabel: "V1.9",
  },
  requiredCapabilities: ["spatial-document-exploration"],
  requiredPrimitives: [
    { id: "P4", readiness: "CONSUMER_PROVEN" },
    { id: "P2", readiness: "CORE_EXTRACTED" },
    { id: "P3", readiness: "HOLD" },
  ],
  slots: [
    { id: "selected-moment", kind: "data", dataType: "moment", policy: "USER_BINDABLE", required: true },
    { id: "moments", kind: "data", dataType: "momentCollection", policy: "USER_BINDABLE", required: true, maxItems: 50 },
    { id: "hero-media", kind: "media", mediaType: "photo", policy: "USER_CONFIGURABLE" },
    { id: "gallery-frames", kind: "media", mediaType: "angleFrameSet", policy: "USER_CONFIGURABLE", maxItems: 8 },
    { id: "title", kind: "copy", copyType: "title", policy: "USER_BINDABLE", required: true, maxLength: 80 },
    { id: "user-note", kind: "copy", copyType: "userNote", policy: "USER_BINDABLE", maxLength: 500 },
    { id: "accent", kind: "visualToken", tokenType: "accent", policy: "USER_CONFIGURABLE", allowedValues: ["rose", "sky", "moss", "ember"] },
    { id: "density", kind: "visualToken", tokenType: "density", policy: "USER_CONFIGURABLE", allowedValues: ["cozy", "spacious"] },
    { id: "open-detail-on-select", kind: "option", policy: "USER_CONFIGURABLE", allowedValues: ["open", "focus"] },
    { id: "locked-brand-label", kind: "copy", copyType: "ctaLabel", policy: "TEMPLATE_LOCKED" },
  ],
  constraints: { orderingAllowed: true, minItems: 1, maxItems: 50 },
  compatibility: { minTemplateVersion: "0.1.0", maxTemplateVersion: "0.1.0" },
  status: "DRAFT",
};

const spatialMediaBrowserInstance = {
  templateId: "spatial-media-browser",
  templateVersion: "0.1.0",
  treeId: "tree_01HZEXAMPLETREE",
  bindings: [
    { slotId: "selected-moment", value: "moment_m1" },
    { slotId: "moments", value: ["moment_m1", "moment_m2", "moment_m3"] },
    { slotId: "gallery-frames", value: ["drive_aaa", "drive_bbb"] },
    { slotId: "title", value: "우리의 여름" },
    { slotId: "accent", value: "rose" },
    { slotId: "open-detail-on-select", value: "open" },
  ],
  ordering: ["moments", "gallery-frames"],
};

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

function deepFreeze(value) {
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}

/* ------------------------------------------------------------------ */
/* Fixture sanity                                                      */
/* ------------------------------------------------------------------ */

test("template platform: synthetic Spatial/Media Browser definition is valid", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  assert.equal(definition.templateId, "spatial-media-browser");
  assert.equal(definition.status, "DRAFT");
  assert.equal(definition.slots.length, 10);
});

test("template platform: synthetic fixture instance is valid against its definition", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  const instance = expectOk(validateInstance(spatialMediaBrowserInstance, definition));
  assert.equal(instance.bindings.length, 6);
  assert.deepEqual(instance.ordering, ["moments", "gallery-frames"]);
});

test("template platform: validation never mutates its input", () => {
  const frozenDefinition = deepFreeze(structuredClone(spatialMediaBrowserDefinition));
  const frozenInstance = deepFreeze(structuredClone(spatialMediaBrowserInstance));
  expectOk(validateDefinition(frozenDefinition));
  const definition = expectOk(validateDefinition(structuredClone(spatialMediaBrowserDefinition)));
  expectOk(validateInstance(frozenInstance, definition));
  assert.deepEqual(frozenDefinition, spatialMediaBrowserDefinition);
  assert.deepEqual(frozenInstance, spatialMediaBrowserInstance);
});

/* ------------------------------------------------------------------ */
/* Definition — fail-closed                                           */
/* ------------------------------------------------------------------ */

test("template platform: unknown definition keys are rejected", () => {
  expectFail(validateDefinition({ ...spatialMediaBrowserDefinition, frobnicate: true }), "unknown key: frobnicate");
});

test("template platform: wrong schemaVersion is rejected", () => {
  expectFail(validateDefinition({ ...spatialMediaBrowserDefinition, schemaVersion: 99 }), "schemaVersion must be 1");
});

test("template platform: non-semver templateVersion is rejected", () => {
  expectFail(
    validateDefinition({ ...spatialMediaBrowserDefinition, templateVersion: "latest" }),
    "semver",
  );
});

test("template platform: out-of-range rendering tier is rejected", () => {
  expectFail(validateDefinition({ ...spatialMediaBrowserDefinition, rendering: "hologram" }), "rendering is out of range");
});

test("template platform: out-of-range status is rejected", () => {
  expectFail(validateDefinition({ ...spatialMediaBrowserDefinition, status: "SHIPPED" }), "status is out of range");
});

test("template platform: missing policy classification on a slot is rejected", () => {
  const slots = spatialMediaBrowserDefinition.slots.map((slot) =>
    slot.id === "accent" ? { ...slot, policy: undefined } : slot,
  );
  expectFail(validateDefinition({ ...spatialMediaBrowserDefinition, slots }), "missing a valid policy classification");
});

test("template platform: duplicate slot ids are rejected", () => {
  const slots = [
    ...spatialMediaBrowserDefinition.slots,
    { id: "moments", kind: "data", dataType: "momentCollection", policy: "USER_BINDABLE" },
  ];
  expectFail(validateDefinition({ ...spatialMediaBrowserDefinition, slots }), "duplicate slot id: moments");
});

test("template platform: duplicate required primitive ids are rejected", () => {
  expectFail(
    validateDefinition({
      ...spatialMediaBrowserDefinition,
      requiredPrimitives: [
        { id: "P4", readiness: "CONSUMER_PROVEN" },
        { id: "P4", readiness: "HOLD" },
      ],
    }),
    "duplicate required primitive id: P4",
  );
});

test("template platform: unknown primitive id and readiness are rejected", () => {
  expectFail(
    validateDefinition({
      ...spatialMediaBrowserDefinition,
      requiredPrimitives: [{ id: "P99", readiness: "CONSUMER_PROVEN" }],
    }),
    "id is out of range: P99",
  );
  expectFail(
    validateDefinition({
      ...spatialMediaBrowserDefinition,
      requiredPrimitives: [{ id: "P4", readiness: "VALIDATED" }],
    }),
    "readiness is out of range: VALIDATED",
  );
});

test("template platform: required capability outside the canonical registry is rejected", () => {
  expectFail(
    validateDefinition({
      ...spatialMediaBrowserDefinition,
      requiredCapabilities: ["time-travel-mode"],
    }),
    "not in the canonical registry: time-travel-mode",
  );
});

test("template platform: duplicate required capabilities are rejected", () => {
  expectFail(
    validateDefinition({
      ...spatialMediaBrowserDefinition,
      requiredCapabilities: ["spatial-document-exploration", "spatial-document-exploration"],
    }),
    "duplicate required capability id",
  );
});

test("template platform: unknown slot kind is rejected", () => {
  const slots = spatialMediaBrowserDefinition.slots.map((slot) =>
    slot.id === "title" ? { ...slot, kind: "executable", copyType: "title" } : slot,
  );
  expectFail(validateDefinition({ ...spatialMediaBrowserDefinition, slots }), "kind is out of range");
});

test("template platform: out-of-range dataType/mediaType/copyType are rejected", () => {
  const slots = spatialMediaBrowserDefinition.slots.map((slot) =>
    slot.id === "moments" ? { ...slot, dataType: "note" } : slot,
  );
  expectFail(validateDefinition({ ...spatialMediaBrowserDefinition, slots }), "dataType is out of range: note");
});

test("template platform: visualToken/option must declare non-empty allowedValues", () => {
  const slots = spatialMediaBrowserDefinition.slots.map((slot) =>
    slot.id === "density" ? { ...slot, allowedValues: [] } : slot,
  );
  expectFail(validateDefinition({ ...spatialMediaBrowserDefinition, slots }), "allowedValues must be a non-empty array");
});

test("template platform: a required slot must be instance-bindable", () => {
  const slots = spatialMediaBrowserDefinition.slots.map((slot) =>
    slot.id === "title" ? { ...slot, policy: "TEMPLATE_LOCKED", required: true } : slot,
  );
  expectFail(
    validateDefinition({ ...spatialMediaBrowserDefinition, slots }),
    "does not permit instance bindings",
  );
});

test("template platform: constraints range must be coherent", () => {
  expectFail(
    validateDefinition({ ...spatialMediaBrowserDefinition, constraints: { orderingAllowed: true, minItems: 10, maxItems: 2 } }),
    "minItems must not exceed",
  );
  expectFail(
    validateDefinition({ ...spatialMediaBrowserDefinition, constraints: { orderingAllowed: true, minItems: 0 } }),
    "minItems must be a positive integer",
  );
});

test("template platform: compatibility range must be coherent", () => {
  expectFail(
    validateDefinition({
      ...spatialMediaBrowserDefinition,
      compatibility: { minTemplateVersion: "0.2.0", maxTemplateVersion: "0.1.0" },
    }),
    "minTemplateVersion must not exceed",
  );
});

test("template platform: VALIDATED status with a non-proven primitive is rejected (false readiness promotion)", () => {
  expectFail(
    validateDefinition({ ...spatialMediaBrowserDefinition, status: "VALIDATED" }),
    'required primitive to be CONSUMER_PROVEN; "P3" is declared HOLD',
  );
});

test("template platform: VALIDATED passes when every required primitive is CONSUMER_PROVEN", () => {
  expectOk(
    validateDefinition({
      ...spatialMediaBrowserDefinition,
      status: "VALIDATED",
      requiredPrimitives: [
        { id: "P4", readiness: "CONSUMER_PROVEN" },
        { id: "P2", readiness: "CONSUMER_PROVEN" },
        { id: "P3", readiness: "CONSUMER_PROVEN" },
      ],
    }),
  );
});

test("template platform: executable content is rejected in definition strings", () => {
  expectFail(
    validateDefinition({ ...spatialMediaBrowserDefinition, label: "<script>alert(1)</script>" }),
    "executable content",
  );
  expectFail(
    validateDefinition({
      ...spatialMediaBrowserDefinition,
      sourceProvenanceRef: { manifestStableId: "javascript:alert(1)", revisionLabel: "V1" },
    }),
    "executable content",
  );
});

/* ------------------------------------------------------------------ */
/* Instance — fail-closed                                             */
/* ------------------------------------------------------------------ */

test("template platform: unknown instance keys are rejected", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  expectFail(validateInstance({ ...spatialMediaBrowserInstance, mode: "turbo" }, definition), "unknown key: mode");
});

test("template platform: unknown templateId / templateVersion are rejected", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  expectFail(
    validateInstance({ ...spatialMediaBrowserInstance, templateId: "other-template" }, definition),
    'does not match definition "spatial-media-browser"',
  );
  expectFail(
    validateInstance({ ...spatialMediaBrowserInstance, templateVersion: "9.9.9" }, definition),
    "does not match definition",
  );
});

test("template platform: undeclared slot binding is rejected", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  expectFail(
    validateInstance(
      { ...spatialMediaBrowserInstance, bindings: [...spatialMediaBrowserInstance.bindings, { slotId: "ghostSlot", value: "x" }] },
      definition,
    ),
    "undeclared slot: ghostSlot",
  );
});

test("template platform: duplicate binding slot ids are rejected", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  expectFail(
    validateInstance(
      { ...spatialMediaBrowserInstance, bindings: [...spatialMediaBrowserInstance.bindings, { slotId: "title", value: "dup" }] },
      definition,
    ),
    "duplicate binding for slot: title",
  );
});

test("template platform: type mismatch on bindings is rejected", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  expectFail(
    validateInstance(
      { ...spatialMediaBrowserInstance, bindings: spatialMediaBrowserInstance.bindings.map((b) => (b.slotId === "title" ? { ...b, value: ["a", "b"] } : b)) },
      definition,
    ),
    "copy requires a single non-empty string",
  );
  expectFail(
    validateInstance(
      { ...spatialMediaBrowserInstance, bindings: spatialMediaBrowserInstance.bindings.map((b) => (b.slotId === "moments" ? { ...b, value: "moment_m1" } : b)) },
      definition,
    ),
    "requires a non-empty array of strings",
  );
});

test("template platform: out-of-range enum binding values are rejected", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  expectFail(
    validateInstance(
      { ...spatialMediaBrowserInstance, bindings: spatialMediaBrowserInstance.bindings.map((b) => (b.slotId === "accent" ? { ...b, value: "neon" } : b)) },
      definition,
    ),
    "out of the allowed enum range",
  );
});

test("template platform: binding on a non-bindable policy slot is rejected", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  expectFail(
    validateInstance(
      { ...spatialMediaBrowserInstance, bindings: [...spatialMediaBrowserInstance.bindings, { slotId: "locked-brand-label", value: "내 브랜드" }] },
      definition,
    ),
    "does not permit instance bindings",
  );
});

test("template platform: missing required binding is rejected", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  expectFail(
    validateInstance(
      { ...spatialMediaBrowserInstance, bindings: spatialMediaBrowserInstance.bindings.filter((b) => b.slotId !== "title") },
      definition,
    ),
    "missing required binding for slot: title",
  );
});

test("template platform: copy maxLength is enforced", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  expectFail(
    validateInstance(
      { ...spatialMediaBrowserInstance, bindings: spatialMediaBrowserInstance.bindings.map((b) => (b.slotId === "title" ? { ...b, value: "x".repeat(81) } : b)) },
      definition,
    ),
    "exceeds maxLength 80",
  );
});

test("template platform: collection maxItems and constraints bounds are enforced", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  expectFail(
    validateInstance(
      { ...spatialMediaBrowserInstance, bindings: spatialMediaBrowserInstance.bindings.map((b) => (b.slotId === "gallery-frames" ? { ...b, value: Array.from({ length: 9 }, (_, i) => `drive_${i}`) } : b)) },
      definition,
    ),
    "exceeds slot maxItems 8",
  );
  expectFail(
    validateInstance(
      { ...spatialMediaBrowserInstance, bindings: spatialMediaBrowserInstance.bindings.map((b) => (b.slotId === "gallery-frames" ? { ...b, value: ["drive_aaa"] } : b)).filter((b) => b.slotId !== "moments") },
      definition,
    ),
    "missing required binding for slot: moments",
  );
});

test("template platform: duplicate bound values are rejected", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  expectFail(
    validateInstance(
      { ...spatialMediaBrowserInstance, bindings: spatialMediaBrowserInstance.bindings.map((b) => (b.slotId === "moments" ? { ...b, value: ["moment_m1", "moment_m1"] } : b)) },
      definition,
    ),
    "duplicate bound value: moment_m1",
  );
});

test("template platform: unauthorized ordering is rejected", () => {
  const definition = expectOk(
    validateDefinition({ ...spatialMediaBrowserDefinition, constraints: { orderingAllowed: false } }),
  );
  expectFail(
    validateInstance(spatialMediaBrowserInstance, definition),
    "ordering is not allowed by template constraints",
  );
});

test("template platform: ordering entries must be declared collection slots", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  expectFail(
    validateInstance({ ...spatialMediaBrowserInstance, ordering: ["moments", "title"] }, definition),
    "ordering entry is not a declared collection slot: title",
  );
});

test("template platform: ordering must cover exactly the bound collection slots", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  expectFail(
    validateInstance({ ...spatialMediaBrowserInstance, ordering: ["moments"] }, definition),
    "bound collection slot is missing from ordering: gallery-frames",
  );
  expectFail(
    validateInstance({ ...spatialMediaBrowserInstance, ordering: ["moments", "gallery-frames", "moments"] }, definition),
    "duplicate ordering entry: moments",
  );
});

test("template platform: executable content is rejected in instance strings", () => {
  const definition = expectOk(validateDefinition(spatialMediaBrowserDefinition));
  const withBinding = (slotId, value) => ({
    ...spatialMediaBrowserInstance,
    bindings: [...spatialMediaBrowserInstance.bindings, { slotId, value }],
  });
  expectFail(
    validateInstance(withBinding("user-note", "<iframe src=\"x\"></iframe>"), definition),
    "executable content",
  );
  expectFail(
    validateInstance(withBinding("hero-media", "javascript:alert(1)"), definition),
    "executable content",
  );
  expectFail(
    validateInstance({ ...spatialMediaBrowserInstance, treeId: "tree_<script>" }, definition),
    "executable content",
  );
});

test("template platform: containsExecutableContent pins the boundary tokens", () => {
  for (const bad of [
    "<script>alert(1)</script>",
    "<iframe src=\"https://evil.example\"></iframe>",
    "<embed src=\"x.swf\">",
    "<object data=\"x\"></object>",
    "<style>body{display:none}</style>",
    "javascript:alert(1)",
    "vbscript:msgbox(1)",
    "data:text/html,<script>1</script>",
    "onerror=alert(1)",
  ]) {
    assert.equal(containsExecutableContent(bad), true, `must reject: ${bad}`);
  }
  for (const safe of [
    "우리의 여름",
    "a > b and c < d",
    "drive_aaa",
    "moment_m1",
    "relationship-retrospective",
  ]) {
    assert.equal(containsExecutableContent(safe), false, `must allow: ${safe}`);
  }
});
