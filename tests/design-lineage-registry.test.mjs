import assert from "node:assert/strict";
import test from "node:test";

import { PRODUCT_FAMILIES } from "../lib/design-lab.ts";
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

test("active and incoming numbered design work is represented as lineages, not V5/V6 products", () => {
  assert.equal(lineageByNumber(49)?.status, "active");
  assert.equal(lineageByNumber(50)?.status, "active");
  assert.equal(lineageByNumber(51)?.status, "active");
  assert.equal(lineageByNumber(52)?.status, "incoming");
  assert.equal(PRODUCT_FAMILIES.length, 2);
});

test("each lineage has unique revision ids and at least one mapped LoveTree scenario", () => {
  for (const lineage of DESIGN_LINEAGES) {
    assert.ok(lineage.scenarios.length > 0, `${lineage.id} must map to at least one scenario`);
    const revisionIds = lineage.revisions.map((revision) => revision.id);
    assert.equal(new Set(revisionIds).size, revisionIds.length, `${lineage.id} revision ids must be unique`);
  }
});
