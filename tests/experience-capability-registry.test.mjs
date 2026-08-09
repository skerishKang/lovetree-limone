import assert from "node:assert/strict";
import test from "node:test";

import { DESIGN_SCENARIOS } from "../lib/design-lab.ts";
import {
  EXPERIENCE_CAPABILITIES,
  capabilitiesForScenario,
  validateExperienceCapabilities,
} from "../lib/experience-capabilities.ts";

test("experience capability registry starts from the eight evidence-backed cross-project patterns", () => {
  assert.equal(EXPERIENCE_CAPABILITIES.length, 8);
  assert.deepEqual(validateExperienceCapabilities(), []);
  assert.equal(new Set(EXPERIENCE_CAPABILITIES.map((capability) => capability.id)).size, EXPERIENCE_CAPABILITIES.length);
});

test("every capability points only to known Design Lab scenarios", () => {
  const known = new Set(DESIGN_SCENARIOS.map((scenario) => scenario.id));
  for (const capability of EXPERIENCE_CAPABILITIES) {
    for (const scenario of capability.applicableScenarios) {
      assert.ok(known.has(scenario), `${capability.id} references unknown scenario ${scenario}`);
    }
  }
});

test("cross-project evidence spans LoveTree and external sibling R&D without Drive URLs", () => {
  const projects = new Set(
    EXPERIENCE_CAPABILITIES.flatMap((capability) => capability.evidence.map((evidence) => evidence.project)),
  );

  for (const expected of ["LoveTree", "이어온", "사실로", "또다른우주", "아스테리브", "Guided Reader"]) {
    assert.ok(projects.has(expected), `missing source project ${expected}`);
  }

  for (const capability of EXPERIENCE_CAPABILITIES) {
    for (const evidence of capability.evidence) {
      assert.doesNotMatch(evidence.artifact, /https?:\/\//, "registry stores provenance labels, not personal Drive URLs");
    }
  }
});

test("capability lookup supports reuse across multiple scenario variants", () => {
  const retrospective = capabilitiesForScenario("relationship-retrospective");
  const milestone = capabilitiesForScenario("growth-milestones");

  assert.ok(retrospective.some((capability) => capability.id === "spatial-orbit-3d"));
  assert.ok(retrospective.some((capability) => capability.id === "relationship-spatial-map"));
  assert.ok(milestone.some((capability) => capability.id === "physical-object-navigation"));
  assert.ok(milestone.some((capability) => capability.id === "longform-milestone-navigation"));
});

test("capability governance keeps backend rewrites out of visual adoption by default", () => {
  const history = EXPERIENCE_CAPABILITIES.find((capability) => capability.id === "temporal-version-history");
  assert.ok(history);
  assert.match(history.integrationRule, /backend|read-model|annotation/i);
  assert.match(history.integrationRule, /판단|검증/);
});
