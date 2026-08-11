import assert from "node:assert/strict";
import test from "node:test";
import {
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
