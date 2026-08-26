import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPLICIT_MACHINE_CHECKED_EXCLUSIONS,
  planDesignFidelityInventory,
} from "../scripts/design-fidelity-validation-inventory.mjs";

const expected = [
  {
    id: "source-56-lineage53-vertical-network-dedicated-source-qa",
    routeEntry: "app/design-lab/lineages/53/53-v3-vertical-network-overview/page.tsx",
    workflow: ".github/workflows/lineage53-source56-browser-qa.yml",
  },
  {
    id: "source-57-living-glass-dedicated-source-qa",
    routeEntry: "app/design-lab/source-tracks/57/v1-3-native/page.tsx",
    workflow: ".github/workflows/source-track57-living-glass-native-qa.yml",
  },
  {
    id: "source-58-living-memory-pinboard-dedicated-fixture-qa",
    routeEntry: "app/design-lab/source-tracks/58/v1-2-native/page.tsx",
    workflow: ".github/workflows/source-track-58-living-memory-pinboard-browser-qa.yml",
  },
];

test("Batch1 Source56/57/58 dedicated gates are explicit preregistered exclusions", () => {
  for (const item of expected) {
    const entry = EXPLICIT_MACHINE_CHECKED_EXCLUSIONS.find((candidate) => candidate.id === item.id);
    assert.ok(entry, `${item.id} must be explicit`);
    assert.equal(entry.preregistered, true, `${item.id} must be preregistered before materialization`);
    assert.equal(entry.routeEntry, item.routeEntry);
    assert.equal(entry.dedicatedWorkflow, item.workflow);
    assert.match(entry.reason, /dedicated/i);
  }
});

test("Batch1 preregistered route/workflow additions plan as exclusions instead of unknown surfaces", () => {
  for (const item of expected) {
    const changed = [item.routeEntry, item.workflow];
    const plan = planDesignFidelityInventory(changed, {
      addedPaths: changed,
      validateFilesystem: false,
    });
    assert.ok(plan.exclusions.some((entry) => entry.id === item.id), `${item.id} must be classified as an exclusion`);
    assert.equal(plan.genuinelyNoImpact, false);
    assert.equal(plan.futureGuards.length, 0);
  }
});

test("preregistration remains narrow and does not cover an unrelated new browser workflow", () => {
  const unknown = ".github/workflows/source-track-999-browser-qa.yml";
  assert.throws(
    () => planDesignFidelityInventory([unknown], { addedPaths: [unknown], validateFilesystem: false }),
    /UNREGISTERED_FIDELITY_SURFACE/,
  );
});
