import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";

import { V4_SOURCE_MANIFEST } from "../app/components/v4/v4-source-manifest.ts";
import {
  DESIGN_CANDIDATES,
  DESIGN_SCENARIOS,
  LINEAGE_INTAKE_CANDIDATES,
  PRODUCT_FAMILIES,
  SIBLING_SOURCE_CANDIDATES,
  registerDesignCandidate,
  validateDesignCandidateRegistry,
} from "../lib/design-lab.ts";
import { EXPERIENCE_CAPABILITIES } from "../lib/experience-capabilities.ts";

const root = new URL("../", import.meta.url);

async function exists(path) {
  try {
    await stat(new URL(path, root));
    return true;
  } catch {
    return false;
  }
}

function pagePathForRoute(route) {
  return route === "/" ? "app/page.tsx" : `app${route}/page.tsx`;
}

test("product architecture exposes exactly Legacy and Next families", () => {
  assert.deepEqual(PRODUCT_FAMILIES.map((family) => family.id), ["legacy", "next"]);
  assert.equal(PRODUCT_FAMILIES[0].route, "/legacy");
  assert.equal(PRODUCT_FAMILIES[1].route, "/v4");
});

test("Design Lab automatically covers every sibling V4 source manifest entry", () => {
  assert.ok(V4_SOURCE_MANIFEST.length > 0, "V4 source manifest must contain at least one sibling source");
  assert.equal(SIBLING_SOURCE_CANDIDATES.length, V4_SOURCE_MANIFEST.length);

  const sourceIds = new Set(SIBLING_SOURCE_CANDIDATES.map((candidate) => candidate.id));
  for (const source of V4_SOURCE_MANIFEST) {
    assert.ok(sourceIds.has(`source:${source.id}`), `${source.id} must be automatically represented in Design Lab`);
  }
});

test("Design Lab registry invariants are clean and scenarios are unique", () => {
  assert.deepEqual(validateDesignCandidateRegistry(), []);
  const scenarioIds = DESIGN_SCENARIOS.map((scenario) => scenario.id);
  assert.equal(new Set(scenarioIds).size, scenarioIds.length);
  const candidateIds = DESIGN_CANDIDATES.map((candidate) => candidate.id);
  assert.equal(new Set(candidateIds).size, candidateIds.length);
});

test("lineage intake includes the locked 48 V1 baseline and current 52 V3 candidate", () => {
  const byId = new Map(LINEAGE_INTAKE_CANDIDATES.map((candidate) => [candidate.id, candidate]));

  const neonBaseline = byId.get("lineage:48-01-v1-cinematic-baseline");
  assert.ok(neonBaseline, "48 V1 baseline must be represented as a lineage-linked Design Lab variant");
  assert.equal(neonBaseline.lineageId, "lt-48-neon-pilot");
  assert.equal(neonBaseline.revisionId, "48-01");
  assert.equal(neonBaseline.status, "mapped");
  assert.equal(neonBaseline.route, undefined);
  assert.equal(neonBaseline.sourceFile, "01_V1_최초시네마틱_원형_바로보기.html");

  const earthOrbit = byId.get("lineage:52-v3-reference-earth-orbit");
  assert.ok(earthOrbit, "52 V3 must remain represented as a lineage-linked Design Lab variant");
  assert.equal(earthOrbit.lineageId, "lt-52-global-moment-orbit");
  assert.equal(earthOrbit.revisionId, "52-v3-reference-earth-orbit");
  assert.equal(earthOrbit.route, "/design-lab/lineages/52/v3");
  assert.equal(earthOrbit.status, "mapped");
});

test("future sibling designs can be registered as variants without a new product version", () => {
  const next = registerDesignCandidate({
    id: "source:future-sibling-example",
    label: "Future sibling example",
    scenarioId: "entry-onboarding",
    route: "/v4/future-example",
    status: "received",
    origin: "sibling-html",
    kind: "screen",
    sourceFile: "future-sibling-example.html",
  });
  assert.equal(next.length, DESIGN_CANDIDATES.length + 1);
  assert.throws(
    () => registerDesignCandidate(DESIGN_CANDIDATES[0]),
    /duplicate candidate id/,
  );
});

test("cross-project interaction research is modeled as capabilities, not extra product families", () => {
  assert.ok(EXPERIENCE_CAPABILITIES.length >= 8);
  assert.equal(PRODUCT_FAMILIES.length, 2);
  assert.ok(EXPERIENCE_CAPABILITIES.some((capability) => capability.id === "spatial-orbit-3d"));
  assert.ok(EXPERIENCE_CAPABILITIES.some((capability) => capability.id === "memory-fragment-convergence"));
  assert.ok(EXPERIENCE_CAPABILITIES.some((capability) => capability.id === "physical-object-navigation"));
});

test("every currently implemented Design Lab route resolves to an app page", async () => {
  for (const candidate of DESIGN_CANDIDATES.filter((item) => item.status === "implemented")) {
    assert.ok(
      await exists(pagePathForRoute(candidate.route)),
      `${candidate.id} route ${candidate.route} must resolve to ${pagePathForRoute(candidate.route)}`,
    );
  }
});

test("Gateway, Legacy and Design Lab entry routes exist", async () => {
  for (const path of [
    "app/page.tsx",
    "app/gateway/page.tsx",
    "app/legacy/page.tsx",
    "app/design-lab/page.tsx",
  ]) {
    assert.ok(await exists(path), `${path} must exist`);
  }
});
