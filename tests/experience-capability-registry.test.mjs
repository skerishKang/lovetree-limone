import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { DESIGN_SCENARIOS } from "../lib/design-lab.ts";
import {
  EXPERIENCE_CAPABILITIES,
  capabilitiesForScenario,
  validateExperienceCapabilities,
} from "../lib/experience-capabilities.ts";
import { AUDITED_EXPERIENCE_CAPABILITIES_BATCH1 } from "../lib/experience-capability-audit-batch1.ts";
import { AUDITED_EXPERIENCE_CAPABILITIES_BATCH2 } from "../lib/experience-capability-audit-batch2.ts";
import {
  EXPERIENCE_CAPABILITY_REGISTRY,
  registryCapabilitiesForScenario,
  validateExperienceCapabilityRegistry,
} from "../lib/experience-capability-registry.ts";

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

test("combined Design Lab capability registry preserves the original eight and adds audited batches", () => {
  assert.equal(EXPERIENCE_CAPABILITIES.length, 8, "base registry remains immutable in this audit stack");
  assert.equal(AUDITED_EXPERIENCE_CAPABILITIES_BATCH1.length, 3);
  assert.equal(AUDITED_EXPERIENCE_CAPABILITIES_BATCH2.length, 1);
  assert.equal(EXPERIENCE_CAPABILITY_REGISTRY.length, 12);
  assert.deepEqual(validateExperienceCapabilityRegistry(), []);

  const ids = EXPERIENCE_CAPABILITY_REGISTRY.map((capability) => capability.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const base of EXPERIENCE_CAPABILITIES) {
    assert.ok(ids.includes(base.id), `${base.id} must remain in the combined registry`);
  }
});

test("Drive audit batch one records CAP-09 CAP-10 and CAP-11 as prototyped", () => {
  const byId = new Map(AUDITED_EXPERIENCE_CAPABILITIES_BATCH1.map((capability) => [capability.id, capability]));

  assert.equal(byId.get("intent-to-path-navigation")?.status, "prototyped");
  assert.equal(byId.get("source-media-inspection-deck")?.status, "prototyped");
  assert.equal(byId.get("question-lens-recomposition")?.status, "prototyped");

  for (const capability of AUDITED_EXPERIENCE_CAPABILITIES_BATCH1) {
    assert.equal(capability.issue, 78);
    assert.ok(capability.evidence.length > 0);
    assert.ok(capability.evidence.every((evidence) => evidence.observed.length > 0));
  }
});

test("Drive audit batch two records CAP-12 as observed until prototype validation", () => {
  assert.equal(AUDITED_EXPERIENCE_CAPABILITIES_BATCH2.length, 1);
  const capability = AUDITED_EXPERIENCE_CAPABILITIES_BATCH2[0];

  assert.equal(capability.id, "narrative-to-structured-moment-assembly");
  assert.equal(capability.status, "observed");
  assert.equal(capability.issue, 107);
  assert.ok(capability.evidence.length > 0);
  assert.ok(capability.evidence.every((evidence) => evidence.observed.length > 0));
});

test("audited capability provenance pins the exact Drive artifacts without storing Drive URLs", () => {
  const audited = [
    ...AUDITED_EXPERIENCE_CAPABILITIES_BATCH1,
    ...AUDITED_EXPERIENCE_CAPABILITIES_BATCH2,
  ];
  const sourceText = audited
    .flatMap((capability) => capability.evidence.map((evidence) => `${evidence.project} ${evidence.artifact}`))
    .join("\n");

  assert.match(sourceText, /02_광주북구_AI내비게이터_시네마틱홈_v1\.html/);
  assert.match(sourceText, /1jqUERqZ8DIZku441gmMQcDAA-UTXh-IP/);
  assert.match(sourceText, /01_사실로_증거검사실_v1\.html/);
  assert.match(sourceText, /1bxgbIAlS4zyu1765ZsbyXZUukQNCqMkl/);
  assert.match(sourceText, /01_이어온_오늘의회사_v1_기능형\.html/);
  assert.match(sourceText, /1BBMWVJlZOSdNkb2ZHuQIigcAjCX7fnh8/);
  assert.match(sourceText, /10\.SASILRO_시민사건원장_CINEMATIC_PREMIUM_v1\.html/);
  assert.match(sourceText, /15cwP3_0T6inN0Z0vazaQyWL6_Kp6SrvE/);
  assert.match(sourceText, /e0c82fb5548ad5fa0f5bb8a5660086c3992c929d5e35d917bf3d9f76e03355e0/);

  for (const capability of audited) {
    for (const evidence of capability.evidence) {
      assert.doesNotMatch(evidence.artifact, /https?:\/\//);
    }
  }
});

test("audited capabilities map to the intended LoveTree scenarios", () => {
  const onboardingIds = registryCapabilitiesForScenario("entry-onboarding").map((capability) => capability.id);
  const workspaceIds = registryCapabilitiesForScenario("tree-workspace").map((capability) => capability.id);
  const retrospectiveIds = registryCapabilitiesForScenario("relationship-retrospective").map((capability) => capability.id);

  assert.ok(onboardingIds.includes("intent-to-path-navigation"));
  assert.ok(onboardingIds.includes("narrative-to-structured-moment-assembly"));
  assert.ok(workspaceIds.includes("source-media-inspection-deck"));
  assert.ok(workspaceIds.includes("question-lens-recomposition"));
  assert.ok(workspaceIds.includes("narrative-to-structured-moment-assembly"));
  assert.ok(retrospectiveIds.includes("intent-to-path-navigation"));
  assert.ok(retrospectiveIds.includes("source-media-inspection-deck"));
  assert.ok(retrospectiveIds.includes("question-lens-recomposition"));
});

test("Design Lab component consumes the combined capability registry", async () => {
  const component = await readFile(
    new URL("../app/components/product/ExperienceCapabilityLibrary.tsx", import.meta.url),
    "utf8",
  );

  assert.match(component, /EXPERIENCE_CAPABILITY_REGISTRY as EXPERIENCE_CAPABILITIES/);
  assert.match(component, /ExperienceCapabilityRegistrySourceProject/);
});
