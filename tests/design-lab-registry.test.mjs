import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";

import { V4_SOURCE_MANIFEST } from "../app/components/v4/v4-source-manifest.ts";
import {
  DESIGN_CANDIDATES,
  DESIGN_SCENARIOS,
  PRODUCT_FAMILIES,
  SIBLING_SOURCE_CANDIDATES,
  registerDesignCandidate,
  validateDesignCandidateRegistry,
} from "../lib/design-lab.ts";

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
  assert.equal(SIBLING_SOURCE_CANDIDATES.length, V4_SOURCE_MANIFEST.length);
  assert.ok(V4_SOURCE_MANIFEST.length >= 29, "the growing sibling source set must not regress below the current 29-source baseline");

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
