import assert from "node:assert/strict";
import test from "node:test";

import { DESIGN_LINEAGES, validateDesignLineages } from "../lib/design-lineages.ts";

test("Lineage registry includes 53 as a separate Emotional Path Replay lineage", () => {
  assert.deepEqual(validateDesignLineages(), []);

  const lineage52 = DESIGN_LINEAGES.find((lineage) => lineage.number === 52);
  const lineage53 = DESIGN_LINEAGES.find((lineage) => lineage.number === 53);

  assert.ok(lineage52);
  assert.ok(lineage53);
  assert.notEqual(lineage52.id, lineage53.id);
  assert.equal(lineage53.id, "lt-53-emotional-path-replay");
  assert.equal(lineage53.status, "active");
  assert.deepEqual(lineage53.scenarios, ["relationship-retrospective", "tree-workspace"]);
  assert.match(lineage53.currentDecision, /Lineage 52.*합치지 않고 별도 계보/);
  assert.match(lineage53.currentDecision, /CAP-14/);
});

test("Lineage 53 V1 provenance and review boundary remain explicit", () => {
  const lineage53 = DESIGN_LINEAGES.find((lineage) => lineage.number === 53);
  assert.ok(lineage53);
  assert.equal(lineage53.revisions.length, 1);

  const revision = lineage53.revisions[0];
  assert.equal(revision.id, "53-v1-node-light-flow");
  assert.equal(revision.decision, "candidate");
  assert.equal(revision.executable, true);
  assert.match(revision.notes ?? "", /31,131 B/);
  assert.match(revision.notes ?? "", /ed3701b33e5a3afc96c9210162f664bbc32d0d800907bf7f8f702cc6a8021519/);
  assert.match(lineage53.sourceLabel, /Issue #119 source review/);
});

test("Lineage 49 and 50 HOLD/locked decisions are not relaxed by Lineage 53 intake", () => {
  const lineage49 = DESIGN_LINEAGES.find((lineage) => lineage.number === 49);
  const lineage50 = DESIGN_LINEAGES.find((lineage) => lineage.number === 50);

  assert.ok(lineage49);
  assert.ok(lineage50);
  assert.match(lineage49.currentDecision, /Full HTML.*HOLD/i);
  assert.match(lineage50.currentDecision, /Full HTML.*HOLD/i);
});
