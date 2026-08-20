import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  EXPLICIT_MACHINE_CHECKED_EXCLUSIONS,
  planDesignFidelityInventory,
} from "../scripts/design-fidelity-validation-inventory.mjs";

test("Track68 remains an explicit truthful-HOLD exclusion after #262", () => {
  const entry = EXPLICIT_MACHINE_CHECKED_EXCLUSIONS.find(
    (candidate) => candidate.id === "source-track-68-v3-3-2-compare-hold",
  );

  assert.ok(entry, "Track68 must be represented in the central inventory");
  assert.equal(entry.disposition, "EXPLICIT_MACHINE_CHECKED_EXCLUSION");
  assert.equal(entry.validationClass, "truthful-hold");
  assert.equal(entry.route, "/design-lab/source-tracks/68/v3-3-2/compare");
  assert.equal(entry.dedicatedWorkflow, ".github/workflows/source-track68-v332-browser-qa.yml");
  assert.match(entry.exactAssetStatus, /LOCAL_EXACT_PACKAGE_23_23_PINNED/);
  assert.match(entry.exactAssetStatus, /CLOUDFRONT_BYTE_EQUIVALENCE_HOLD/);
  assert.match(entry.holdSemantics, /never be reported as FULL source-fidelity/i);
});

test("a non-ASCII Track68 asset-only change cannot fall through to NO_IMPACT", () => {
  const path = "public/design-lab-assets/source-tracks/68/v3-3-2/compare/images/동양인01.png";
  const plan = planDesignFidelityInventory([path], { validateFilesystem: false });

  assert.equal(plan.genuinelyNoImpact, false);
  assert.ok(
    plan.exclusions.some((entry) => entry.id === "source-track-68-v3-3-2-compare-hold"),
    "Track68 Korean asset path must select the explicit exclusion",
  );
});

test("planner disables Git quotePath so UTF-8 paths reach inventory matching unchanged", () => {
  const planner = readFileSync(
    new URL("../scripts/plan-design-fidelity-validation.mjs", import.meta.url),
    "utf8",
  );

  assert.match(planner, /core\.quotePath=false/);
});
