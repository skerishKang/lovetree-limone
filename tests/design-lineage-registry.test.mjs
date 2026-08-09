import assert from "node:assert/strict";
import test from "node:test";

import { DESIGN_CANDIDATES, PRODUCT_FAMILIES } from "../lib/design-lab.ts";
import { DESIGN_LINEAGES, validateDesignLineages } from "../lib/design-lineages.ts";

const lineageByNumber = (number) => DESIGN_LINEAGES.find((lineage) => lineage.number === number);

test("design lineages do not create extra product families", () => {
  assert.deepEqual(PRODUCT_FAMILIES.map((family) => family.id), ["legacy", "next"]);
  assert.ok(DESIGN_LINEAGES.length >= 5);
  assert.deepEqual(validateDesignLineages(), []);
});

test("LoveTree 48 revisions remain inside one closed lineage", () => {
  const lineage = lineageByNumber(48);
  assert.ok(lineage);
  assert.equal(lineage.status, "closed");
  assert.equal(lineage.revisions.length, 10);
  assert.equal(lineage.revisions.filter((revision) => revision.decision === "baseline").length, 1);
  assert.equal(lineage.revisions.find((revision) => revision.id === "48-01")?.decision, "baseline");
  assert.equal(lineage.revisions.find((revision) => revision.id === "48-10")?.decision, "rejected");
});

test("numbered design work remains lineages, not V5/V6 products", () => {
  for (const number of [49, 50, 52]) {
    assert.equal(lineageByNumber(number)?.status, "active", `lineage ${number} should be active in the latest Drive snapshot`);
  }
  assert.equal(lineageByNumber(51)?.status, "hold", "lineage 51 is preserved but held while its intake folder has no executable assets");
  assert.equal(PRODUCT_FAMILIES.length, 2);
});

test("latest Drive decisions are represented without overwriting prior revisions", () => {
  const lineage49 = lineageByNumber(49);
  const lineage50 = lineageByNumber(50);
  const lineage51 = lineageByNumber(51);
  const lineage52 = lineageByNumber(52);

  assert.equal(lineage49?.revisions.find((revision) => revision.id === "49-v2-locked-storyboard")?.decision, "approved-plan");
  assert.equal(lineage50?.revisions.find((revision) => revision.id === "50-existing-supernova-storyboard")?.decision, "approved-plan");
  assert.equal(lineage51?.revisions.length, 0);
  assert.equal(lineage52?.revisions.find((revision) => revision.id === "52-v2-cosmic-core")?.decision, "superseded");
  assert.equal(lineage52?.revisions.find((revision) => revision.id === "52-v3-reference-earth-orbit")?.decision, "candidate");
});

test("each lineage has unique revision ids and at least one mapped LoveTree scenario", () => {
  for (const lineage of DESIGN_LINEAGES) {
    assert.ok(lineage.scenarios.length > 0, `${lineage.id} must map to at least one scenario`);
    const revisionIds = lineage.revisions.map((revision) => revision.id);
    assert.equal(new Set(revisionIds).size, revisionIds.length, `${lineage.id} revision ids must be unique`);
  }
});

test("every lineage-linked Scenario Variant points to an existing Lineage revision", () => {
  const linked = DESIGN_CANDIDATES.filter((candidate) => candidate.lineageId || candidate.revisionId);
  assert.ok(linked.length > 0, "at least one live intake candidate should exercise Lineage/Revision linkage");

  for (const candidate of linked) {
    assert.ok(candidate.lineageId && candidate.revisionId, `${candidate.id} must provide lineageId and revisionId together`);
    const lineage = DESIGN_LINEAGES.find((item) => item.id === candidate.lineageId);
    assert.ok(lineage, `${candidate.id} references missing lineage ${candidate.lineageId}`);
    assert.ok(
      lineage.revisions.some((revision) => revision.id === candidate.revisionId),
      `${candidate.id} references missing revision ${candidate.revisionId}`,
    );
  }
});

test("LoveTree 52 V3 is visible for review before its React route exists", () => {
  const candidate = DESIGN_CANDIDATES.find((item) => item.id === "lineage:52-v3-reference-earth-orbit");
  assert.ok(candidate);
  assert.equal(candidate.status, "mapped");
  assert.equal(candidate.route, undefined);
  assert.equal(candidate.lineageId, "lt-52-global-moment-orbit");
  assert.equal(candidate.revisionId, "52-v3-reference-earth-orbit");
});
