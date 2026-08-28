import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPLICIT_MACHINE_CHECKED_EXCLUSIONS,
  SUPPLEMENTAL_DESIGN_FIDELITY_TARGETS,
  planDesignFidelityInventory,
} from "../scripts/design-fidelity-validation-inventory.mjs";

const registered = [
  {
    id: "source-56-lineage53-vertical-network",
    routeEntry: "app/design-lab/lineages/53/53-v3-vertical-network-overview/page.tsx",
    workflow: ".github/workflows/lineage53-source56-browser-qa.yml",
  },
  {
    id: "source-57-living-glass-v1-3-native",
    routeEntry: "app/design-lab/source-tracks/57/v1-3-native/page.tsx",
    workflow: ".github/workflows/source-track57-living-glass-native-qa.yml",
  },
];

const fixtureBacked = {
  id: "source-58-living-memory-pinboard-dedicated-fixture-qa",
  routeEntry: "app/design-lab/source-tracks/58/v1-2-native/page.tsx",
  workflow: ".github/workflows/source-track-58-living-memory-pinboard-browser-qa.yml",
};

test("Source56/57 are preregistered interaction-contract targets", () => {
  for (const item of registered) {
    const entry = SUPPLEMENTAL_DESIGN_FIDELITY_TARGETS.find((candidate) => candidate.id === item.id);
    assert.ok(entry, `${item.id} must be registered`);
    assert.equal(entry.inventoryDisposition, "REGISTERED_TARGET");
    assert.equal(entry.validationClass, "interaction-contract");
    assert.equal(entry.preregistered, true);
    assert.equal(entry.routeEntry, item.routeEntry);
    assert.equal(entry.dedicatedWorkflow, item.workflow);
    assert.ok(entry.browserGates.includes(entry.actualRouteBrowserGate));
  }
});

test("Source56/57 route and workflow additions plan as executable targets", () => {
  for (const item of registered) {
    const changed = [item.routeEntry, item.workflow];
    const plan = planDesignFidelityInventory(changed, {
      addedPaths: changed,
      validateFilesystem: false,
    });
    assert.ok(plan.targets.some((entry) => entry.id === item.id), `${item.id} must be selected as a target`);
    assert.ok(!plan.exclusions.some((entry) => entry.id === item.id), `${item.id} must not be an exclusion`);
    assert.equal(plan.genuinelyNoImpact, false);
    assert.equal(plan.futureGuards.length, 0);
  }
});

test("Source58 remains a preregistered dedicated-fixture exclusion", () => {
  const entry = EXPLICIT_MACHINE_CHECKED_EXCLUSIONS.find((candidate) => candidate.id === fixtureBacked.id);
  assert.ok(entry, `${fixtureBacked.id} must be explicit`);
  assert.equal(entry.validationClass, "dedicated-fixture-browser-qa");
  assert.equal(entry.preregistered, true);
  assert.equal(entry.routeEntry, fixtureBacked.routeEntry);
  assert.equal(entry.dedicatedWorkflow, fixtureBacked.workflow);
  assert.match(entry.reason, /treeId|fixture/i);

  const changed = [fixtureBacked.routeEntry, fixtureBacked.workflow];
  const plan = planDesignFidelityInventory(changed, {
    addedPaths: changed,
    validateFilesystem: false,
  });
  assert.ok(plan.exclusions.some((candidate) => candidate.id === fixtureBacked.id));
  assert.ok(!plan.targets.some((candidate) => candidate.id === fixtureBacked.id));
  assert.equal(plan.genuinelyNoImpact, false);
});

test("preregistration remains narrow and does not cover an unrelated new browser workflow", () => {
  const unknown = ".github/workflows/source-track-999-browser-qa.yml";
  assert.throws(
    () => planDesignFidelityInventory([unknown], { addedPaths: [unknown], validateFilesystem: false }),
    /UNREGISTERED_FIDELITY_SURFACE/,
  );
});
