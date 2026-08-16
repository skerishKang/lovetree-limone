import assert from "node:assert/strict";
import test from "node:test";

import { createBranchState, selectBranchChoice, getSelectedChoice, isBranchResolved } from "../lib/lineage-59/branch-authority.ts";

const CHOICES = [
  { id: "ch1", label: "Path A", description: "Go deep", continuationMomentId: "m5" },
  { id: "ch2", label: "Path B", description: "Pause", continuationMomentId: "m5-alt" },
];

test("branch-authority creates active branch", () => {
  const b = createBranchState("m4", CHOICES);
  assert.equal(b.active, true);
  assert.equal(b.resolved, false);
  assert.equal(b.choices.length, 2);
});

test("branch-authority selectBranchChoice resolves", () => {
  const b = createBranchState("m4", CHOICES);
  const resolved = selectBranchChoice(b, "ch1");
  assert.equal(resolved.resolved, true);
  assert.equal(resolved.active, false);
  assert.equal(resolved.selectedChoiceId, "ch1");
});

test("branch-authority getSelectedChoice returns the right choice", () => {
  const b = createBranchState("m4", CHOICES);
  const resolved = selectBranchChoice(b, "ch2");
  const choice = getSelectedChoice(resolved);
  assert.equal(choice?.label, "Path B");
});

test("branch-authority getSelectedChoice returns undefined before selection", () => {
  const b = createBranchState("m4", CHOICES);
  assert.equal(getSelectedChoice(b), undefined);
});

test("branch-authority isBranchResolved", () => {
  assert.equal(isBranchResolved(createBranchState("m4", CHOICES)), false);
  assert.equal(isBranchResolved(selectBranchChoice(createBranchState("m4", CHOICES), "ch1")), true);
});

test("branch-authority ignores unknown choice id", () => {
  const b = createBranchState("m4", CHOICES);
  const resolved = selectBranchChoice(b, "unknown");
  assert.equal(resolved.resolved, false);
});