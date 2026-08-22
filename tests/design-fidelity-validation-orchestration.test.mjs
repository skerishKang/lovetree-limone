import assert from "node:assert/strict";
import test from "node:test";
import {
  DEPENDENCY_EDGES,
  DESIGN_FIDELITY_TARGETS,
  getDesignFidelityTarget,
  selectImpactedTargets,
} from "../scripts/design-fidelity-validation-registry.mjs";

const REQUIRED_TARGETS = [
  "lineage-52-v3",
  "lineage-53-v2",
  "lineage-54-v4",
  "lineage-56-v3",
  "lineage-57-v2",
  "lineage-58-v2",
  "lineage-61-61-v1-9",
  "lineage-64-v1-2-1",
  "lineage-63",
  "memory-anatomy",
  "moment-orbit-carousel",
];

test("design fidelity registry has stable unique target and route identities", () => {
  assert.deepEqual(
    DESIGN_FIDELITY_TARGETS.map((target) => target.id).sort(),
    [...REQUIRED_TARGETS].sort(),
  );

  const ids = DESIGN_FIDELITY_TARGETS.map((target) => target.id);
  const routes = DESIGN_FIDELITY_TARGETS.map((target) => target.route);
  assert.equal(new Set(ids).size, ids.length, "target ids are unique");
  assert.equal(new Set(routes).size, routes.length, "actual routes are unique");

  for (const target of DESIGN_FIDELITY_TARGETS) {
    assert.ok(target.route.startsWith("/design-lab/"), `${target.id}: Design Lab route only`);
    assert.ok(target.impactPrefixes.length > 0, `${target.id}: impact mapping is explicit`);
    assert.ok(target.browserGates.length > 0, `${target.id}: actual-route browser gate is required`);
    assert.ok(target.viewports.some(({ width, height }) => width === 1280 && height === 800), `${target.id}: desktop evidence`);
    assert.ok(target.viewports.some(({ width, height }) => width === 390 && height === 844), `${target.id}: mobile evidence`);
    if (target.assetGate) {
      assert.ok(target.assetGate.verifier.endsWith(".mjs"), `${target.id}: verifier is executable`);
      assert.match(target.assetGate.expectedMarker, /PASS/, `${target.id}: verifier marker is fail-closed PASS evidence`);
    }
  }
});

test("direct candidate changes select only their matching fidelity target", () => {
  assert.deepEqual(
    selectImpactedTargets(["app/design-lab/lineages/56/v3/page.tsx"]).map((target) => target.id),
    ["lineage-56-v3"],
  );
  assert.deepEqual(
    selectImpactedTargets(["public/design-lab/lineages/58/videofigure/frames/A_000.png"]).map((target) => target.id),
    ["lineage-58-v2"],
  );
  assert.deepEqual(
    selectImpactedTargets(["app/design-lab/lineages/61/61-v1-9/page.tsx"]).map((target) => target.id),
    ["lineage-61-61-v1-9"],
  );
  assert.deepEqual(
    selectImpactedTargets(["app/design-lab/lineages/63/page.tsx"]).map((target) => target.id),
    ["lineage-63"],
  );
});

test("Lineage61 V1.7 is interaction-contract only while P8/source fidelity remains HOLD", () => {
  const target = getDesignFidelityTarget("lineage-61-61-v1-9");
  assert.ok(target, "Lineage61 target is registered");
  assert.equal(target.route, "/design-lab/lineages/61/61-v1-9");
  assert.equal(target.validationClass, "interaction-contract");
  assert.equal(target.assetGate, null, "P8 source-fidelity is not false-greened");
  assert.deepEqual(target.browserGates, ["tests/track-61-guided-next-moment-builder-route-browser-qa.mjs"]);
  for (const [width, height] of [[1280, 800], [390, 844], [320, 720]]) {
    assert.ok(target.viewports.some((viewport) => viewport.width === width && viewport.height === height), `${width}x${height} evidence`);
  }
  assert.equal(target.captureReducedMotion, true);
});

test("source-only authoritative asset changes select the exact fidelity target", () => {
  assert.deepEqual(
    selectImpactedTargets([
      "public/design-lab-assets/lineages/52/v3/lovetree-52-v3-reference-earth-orbit.html",
    ]).map((target) => target.id),
    ["lineage-52-v3"],
  );
  assert.deepEqual(
    selectImpactedTargets([
      "reference/design-lab/capabilities/memory-anatomy/02-memory-stack.html",
    ]).map((target) => target.id),
    ["memory-anatomy"],
  );
});

test("orchestration changes self-validate against materialized browser targets", () => {
  const selected = selectImpactedTargets([".github/workflows/design-fidelity-validation.yml"])
    .map((target) => target.id);
  assert.ok(selected.includes("lineage-53-v2"), "current-main Lineage 53 browser gate exercises orchestration changes");
  assert.ok(selected.includes("lineage-61-61-v1-9"), "Lineage61 proving target exercises orchestration changes");
});

test("asset-backed lineages are verifier-gated before browser certification", () => {
  for (const id of ["lineage-54-v4", "lineage-56-v3", "lineage-57-v2", "lineage-58-v2"]) {
    const target = getDesignFidelityTarget(id);
    assert.ok(target?.assetGate, `${id}: exact asset verifier is configured`);
  }
});

test("Lineage 55 provenance intake is intentionally outside actual-route fidelity registry", () => {
  assert.equal(getDesignFidelityTarget("lineage-55"), null);
  assert.equal(
    DESIGN_FIDELITY_TARGETS.some((target) => target.route.includes("/55/")),
    false,
    "unresolved historical provenance is not flattened into an actual-route PASS contract",
  );
});

test("P8 dependency edge maps only the proven exact-asset core to lineage-58-v2", () => {
  assert.deepEqual(
    DEPENDENCY_EDGES,
    [
      {
        sourcePrefix: "lib/design-runtime/exact-asset.ts",
        targetIds: ["lineage-58-v2"],
      },
    ],
    "edge registry is narrow and evidence-backed; no inferred consumers",
  );
  for (const edge of DEPENDENCY_EDGES) {
    assert.ok(edge.sourcePrefix.startsWith("lib/design-runtime/"), `${edge.sourcePrefix}: shared runtime primitive`);
    for (const targetId of edge.targetIds) {
      assert.ok(getDesignFidelityTarget(targetId), `${targetId}: edge consumer is a registered target`);
    }
  }
});

test("shared P8 exact-asset core change selects the proven lineage-58-v2 consumer", () => {
  assert.deepEqual(
    selectImpactedTargets(["lib/design-runtime/exact-asset.ts"]).map((target) => target.id),
    ["lineage-58-v2"],
    "only the proven P8 consumer is selected",
  );
  assert.deepEqual(
    selectImpactedTargets(["lib/design-runtime/exact-asset.ts", "app/design-lab/lineages/56/v3/page.tsx"]).map((target) => target.id),
    ["lineage-56-v3", "lineage-58-v2"],
    "edge and existing direct impactPrefixes coexist",
  );
});

test("unrelated shared runtime paths do not auto-select all Design Fidelity targets", () => {
  assert.deepEqual(
    selectImpactedTargets(["lib/design-runtime/selection.ts"]),
    [],
    "sibling shared core without a proven consumer selects nothing",
  );
  assert.deepEqual(
    selectImpactedTargets(["lib/design-runtime/transport.ts"]),
    [],
    "no global lib/design-runtime/** to all-targets trigger",
  );
  assert.deepEqual(
    selectImpactedTargets(["lib/design-runtime/ordered-frame.ts"]),
    [],
    "sibling shared core without a proven consumer selects nothing",
  );
});
