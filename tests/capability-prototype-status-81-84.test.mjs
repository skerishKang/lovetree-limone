import assert from "node:assert/strict";
import test from "node:test";

import { EXPERIENCE_CAPABILITIES } from "../lib/experience-capabilities.ts";

const EXPECTED_PROTOTYPED = [
  "spatial-orbit-3d",
  "cinematic-scene-transition",
  "memory-fragment-convergence",
  "relationship-spatial-map",
  "temporal-version-history",
  "physical-object-navigation",
  "spatial-document-exploration",
  "longform-milestone-navigation",
];

test("the original eight evidence-backed capabilities are prototyped after #81-84 validation", () => {
  assert.equal(EXPERIENCE_CAPABILITIES.length, EXPECTED_PROTOTYPED.length);
  const byId = new Map(EXPERIENCE_CAPABILITIES.map((capability) => [capability.id, capability]));

  for (const id of EXPECTED_PROTOTYPED) {
    const capability = byId.get(id);
    assert.ok(capability, `missing capability ${id}`);
    assert.equal(capability.status, "prototyped", `${id} must stay prototyped until a separate validation/adoption decision`);
    assert.ok(capability.issue, `${id} must retain its prototype issue provenance`);
  }
});
