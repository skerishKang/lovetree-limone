import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  DESIGN_FIDELITY_TARGETS,
  EXPLICIT_MACHINE_CHECKED_EXCLUSIONS,
  FUTURE_MERGE_GUARDS,
  assertDedicatedWorkflowCoverage,
  getDesignFidelityTarget,
  planDesignFidelityInventory,
  validateDesignFidelityInventory,
} from "../scripts/design-fidelity-validation-inventory.mjs";

const validTarget = {
  id: "fixture-target",
  label: "Fixture",
  route: "/design-lab/fixtures/one",
  validationClass: "interaction-contract",
  impactPrefixes: ["app/design-lab/fixtures/one/"],
  assetGate: null,
  browserGates: ["tests/fixture-browser.test.mjs"],
  viewports: [{ width: 1280, height: 800 }, { width: 390, height: 844, mobile: true }],
  captureReducedMotion: true,
  extraEvidencePaths: [],
};

test("current reconciled targets are registered or explicit machine-checked exclusions", () => {
  for (const id of ["track-67-v2-4-2-native", "lineage-59-v5", "lineage-60-v1-2"]) {
    assert.ok(getDesignFidelityTarget(id), `${id} must be a registered target`);
  }
  for (const id of ["track-47-v4-2-5-hold", "living-media-sphere-v3-hold", "track-66-v1-2-dedicated-product-qa"]) {
    assert.ok(EXPLICIT_MACHINE_CHECKED_EXCLUSIONS.some((entry) => entry.id === id), `${id} must be explicit exclusion`);
  }
  assert.doesNotThrow(() => validateDesignFidelityInventory());
});

test("unknown newly materialized Design Lab target fails closed", () => {
  const unknown = "app/design-lab/lineages/999/v1/page.tsx";
  assert.throws(
    () => planDesignFidelityInventory([unknown], { addedPaths: [unknown], validateFilesystem: false }),
    /UNREGISTERED_FIDELITY_SURFACE/,
  );
});

test("registered target plans from owned impact prefix", () => {
  const plan = planDesignFidelityInventory(
    ["app/design-lab/lineages/59/v5/page.tsx"],
    { validateFilesystem: false },
  );
  assert.ok(plan.targets.some((target) => target.id === "lineage-59-v5"));
  assert.equal(plan.genuinelyNoImpact, false);
});

test("excluded target returns explicit reason instead of generic NO_IMPACT", () => {
  const plan = planDesignFidelityInventory(
    ["app/design-lab/source-tracks/47/v4-2-5/native/page.tsx"],
    { validateFilesystem: false },
  );
  assert.equal(plan.targets.length, 0);
  assert.equal(plan.genuinelyNoImpact, false);
  assert.equal(plan.exclusions[0]?.id, "track-47-v4-2-5-hold");
  assert.match(plan.exclusions[0]?.reason ?? "", /video|HOLD/i);
});

test("truthful HOLD target cannot be registered as executable fidelity PASS", () => {
  assert.throws(
    () => validateDesignFidelityInventory({
      registeredTargets: [{ ...validTarget, validationClass: "truthful-hold" }],
      exclusions: [],
      futureGuards: [],
    }),
    /invalid\/full-HOLD validation class/,
  );
});

test("asset-verifier-first and missing-browser-gate fail-closed runner contracts remain present", () => {
  const runner = readFileSync(new URL("../scripts/run-design-fidelity-target.mjs", import.meta.url), "utf8");
  const verifier = runner.indexOf("summary.assetGate = runAssetVerifier()");
  const capture = runner.indexOf("summary.screenshots = await captureBrowserEvidence(baseUrl)");
  const gates = runner.indexOf("for (const browserGate of target.browserGates)");
  assert.ok(verifier >= 0 && capture > verifier, "asset verifier must execute before browser capture");
  assert.ok(gates >= 0, "browser gates remain explicit");
  assert.match(runner, /requireConfiguredFile\(browserGate, "browser gate"\)/);
});

test("NO_IMPACT is returned only for a genuinely unrelated change", () => {
  const plan = planDesignFidelityInventory(["docs/unrelated-note.md"], { validateFilesystem: false });
  assert.equal(plan.targets.length, 0);
  assert.equal(plan.exclusions.length, 0);
  assert.equal(plan.genuinelyNoImpact, true);
});

test("duplicate IDs fail inventory validation", () => {
  assert.throws(
    () => validateDesignFidelityInventory({
      registeredTargets: [validTarget, { ...validTarget }],
      exclusions: [],
      futureGuards: [],
    }),
    /duplicate Design Fidelity inventory id/,
  );
});

test("invalid route and gate config fail inventory validation", () => {
  assert.throws(
    () => validateDesignFidelityInventory({
      registeredTargets: [{ ...validTarget, route: "design-lab/no-leading-slash" }],
      exclusions: [],
      futureGuards: [],
    }),
    /invalid route/,
  );
  assert.throws(
    () => validateDesignFidelityInventory({
      registeredTargets: [{ ...validTarget, browserGates: [] }],
      exclusions: [],
      futureGuards: [],
    }),
    /browserGates must be non-empty/,
  );
});

test("unknown dedicated Playwright workflow is machine-detected", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "df-inventory-"));
  try {
    await mkdir(path.join(cwd, ".github", "workflows"), { recursive: true });
    await writeFile(
      path.join(cwd, ".github", "workflows", "unknown-browser-qa.yml"),
      "steps:\n  - run: npx playwright install --with-deps chromium\n",
    );
    assert.throws(
      () => assertDedicatedWorkflowCoverage(cwd, { registeredTargets: [], exclusions: [], futureGuards: [] }),
      /UNREGISTERED_DEDICATED_BROWSER_WORKFLOW/,
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("Track62 remains a merge-blocking future guard; Track18 resolved as registered exact-gate target", () => {
  const track62 = FUTURE_MERGE_GUARDS.find((entry) => entry.id === "track-62-v1-1-future-merge");
  assert.ok(track62);
  assert.equal(FUTURE_MERGE_GUARDS.find((entry) => entry.id === "track-18-v2-future-merge"), undefined);
  assert.throws(
    () => planDesignFidelityInventory([track62.routeEntry], { addedPaths: [track62.routeEntry], validateFilesystem: false }),
    /FUTURE_MERGE_GUARD/,
  );
  const track18 = getDesignFidelityTarget("track-18-v2-source-runner");
  assert.ok(track18);
  assert.equal(track18.inventoryDisposition, "REGISTERED_TARGET");
  assert.equal(track18.validationClass, "interaction-contract");
  assert.equal(track18.assetGate?.verifier, "scripts/verify-source-track-18-assets.mjs");
  assert.match(track18.assetGate?.expectedMarker ?? "", /PASS/);
  const plan = planDesignFidelityInventory([track18.routeEntry], { addedPaths: [track18.routeEntry], validateFilesystem: false });
  assert.ok(plan.targets.some((target) => target.id === "track-18-v2-source-runner"));
  assert.equal(plan.futureGuards.length, 0);
});

test("combined target IDs remain unique", () => {
  assert.equal(new Set(DESIGN_FIDELITY_TARGETS.map((target) => target.id)).size, DESIGN_FIDELITY_TARGETS.length);
});
