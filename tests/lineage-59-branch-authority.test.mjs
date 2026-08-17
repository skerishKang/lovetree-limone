import assert from "node:assert/strict";
import test from "node:test";

import {
  createBranchState,
  selectBranchChoice,
  getSelectedChoice,
  isBranchResolved,
  resolveBranchChoices,
  validateBranchTopology,
  canOfferBranch,
  getResolvedContinuationMomentId,
  consumeBranchState,
  isBranchBlocking,
  MIN_BRANCH_CHOICES,
} from "../lib/lineage-59/branch-authority.ts";

const CHOICES = [
  { id: "ch1", label: "Path A", description: "Go deep", continuationMomentId: "m5" },
  { id: "ch2", label: "Path B", description: "Pause", continuationMomentId: "m6" },
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

test("branch-authority selectBranchChoice ignores empty continuation", () => {
  const b = createBranchState("m4", [{ ...CHOICES[0], continuationMomentId: "" }]);
  const resolved = selectBranchChoice(b, "ch1");
  assert.equal(resolved.resolved, false);
  assert.equal(resolved.selectedChoiceId, null);
});

const DECLARATIONS = [
  { id: "c-a", fromId: "m4", toId: "m5", whyNext: "a" },
  { id: "c-b", fromId: "m4", toId: "m6", whyNext: "b" },
  { id: "c-wrong", fromId: "m5", toId: "m6", whyNext: "wrong origin" },
];
const BY_ID = new Map(DECLARATIONS.map((c) => [c.id, c]));

test("branch-authority resolveBranchChoices resolves through the Connection-id authority", () => {
  const branch = { id: "b1", fromMomentId: "m4", choices: [
    { id: "ch-a", label: "A", description: "d", connectionId: "c-a" },
    { id: "ch-b", label: "B", description: "d", connectionId: "c-b" },
  ] };
  const resolved = resolveBranchChoices(branch.choices, BY_ID, "m4");
  assert.equal(resolved.length, 2);
  assert.equal(resolved[0].continuationMomentId, "m5");
  assert.equal(resolved[1].continuationMomentId, "m6");
  assert.ok(resolved.every((choice) => choice.continuationMomentId.length > 0));
});

test("branch-authority drops choices whose connection does not originate at the branch Moment", () => {
  const branch = { id: "b1", fromMomentId: "m4", choices: [
    { id: "ch-a", label: "A", description: "d", connectionId: "c-a" },
    { id: "ch-b", label: "B", description: "d", connectionId: "c-wrong" },
  ] };
  const resolved = resolveBranchChoices(branch.choices, BY_ID, "m4");
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].id, "ch-a");
  assert.equal(resolved[0].continuationMomentId, "m5");
});

test("branch-authority never resolves a choice into an empty destination", () => {
  const broken = [
    { id: "ch-missing", label: "X", description: "d", connectionId: "does-not-exist" },
    { id: "ch-wrong-origin", label: "Y", description: "d", connectionId: "c-wrong" },
    { id: "ch-no-to", label: "Z", description: "d", connectionId: "c-null" },
  ];
  const conns = new Map(BY_ID);
  conns.set("c-null", { id: "c-null", fromId: "m4", toId: "" });
  const resolved = resolveBranchChoices(broken, conns, "m4");
  assert.equal(resolved.length, 0);
});

test("branch-authority validateBranchTopology accepts a truthful fork", () => {
  const branch = { id: "b1", fromMomentId: "m4", choices: [
    { id: "ch-a", label: "A", description: "d", connectionId: "c-a" },
    { id: "ch-b", label: "B", description: "d", connectionId: "c-b" },
  ] };
  const problems = validateBranchTopology(branch, DECLARATIONS, ["m1", "m2", "m3", "m4", "m5", "m6"]);
  assert.deepEqual(problems, []);
});

test("branch-authority validateBranchTopology rejects an alternate originating elsewhere", () => {
  const branch = { id: "b1", fromMomentId: "m4", choices: [
    { id: "ch-a", label: "A", description: "d", connectionId: "c-a" },
    { id: "ch-b", label: "B", description: "d", connectionId: "c-wrong" },
  ] };
  const problems = validateBranchTopology(branch, DECLARATIONS, ["m4", "m5", "m6"]);
  assert.ok(problems.some((p) => p.includes("c-wrong") && p.includes("m5")), problems.join(" | "));
});

test("branch-authority validateBranchTopology rejects duplicate destinations", () => {
  const branch = { id: "b1", fromMomentId: "m4", choices: [
    { id: "ch-a", label: "A", description: "d", connectionId: "c-a" },
    { id: "ch-b", label: "B", description: "d", connectionId: "c-a" },
  ] };
  const problems = validateBranchTopology(branch, DECLARATIONS, ["m4", "m5", "m6"]);
  assert.ok(problems.some((p) => p.includes("duplicates")), problems.join(" | "));
});

test("branch-authority validateBranchTopology rejects unknown connection and unknown moment", () => {
  const branch = { id: "b1", fromMomentId: "ghost", choices: [
    { id: "ch-a", label: "A", description: "d", connectionId: "nope" },
  ] };
  const problems = validateBranchTopology(branch, DECLARATIONS, ["m4", "m5"]);
  assert.ok(problems.some((p) => p.includes("unknown connectionId")), problems.join(" | "));
  assert.ok(problems.some((p) => p.includes("fromMomentId is not on the path")), problems.join(" | "));
  assert.ok(problems.some((p) => p.includes(`at least ${MIN_BRANCH_CHOICES}`)), problems.join(" | "));
});

test("branch-authority canOfferBranch requires truthful non-empty choices", () => {
  assert.equal(canOfferBranch(CHOICES), true);
  assert.equal(canOfferBranch([CHOICES[0]]), false);
  assert.equal(canOfferBranch([{ ...CHOICES[0], continuationMomentId: "" }, CHOICES[1]]), false);
});

test("branch-authority getResolvedContinuationMomentId is null until resolved", () => {
  const b = createBranchState("m4", CHOICES);
  assert.equal(getResolvedContinuationMomentId(b), null);
  const resolved = selectBranchChoice(b, "ch1");
  assert.equal(getResolvedContinuationMomentId(resolved), "m5");
});

test("branch-authority consumeBranchState clears a resolved branch", () => {
  const b = createBranchState("m4", CHOICES);
  assert.equal(consumeBranchState(b), b, "unresolved branch survives");
  const resolved = selectBranchChoice(b, "ch1");
  assert.equal(isBranchBlocking(resolved), false);
  assert.equal(consumeBranchState(resolved), null, "resolved branch is consumed so Story can resume");
  assert.equal(isBranchBlocking(consumeBranchState(resolved)), false);
});

test("branch-authority isBranchBlocking only while awaiting an explicit choice", () => {
  const b = createBranchState("m4", CHOICES);
  assert.equal(isBranchBlocking(b), true);
  assert.equal(isBranchBlocking(selectBranchChoice(b, "ch1")), false);
  assert.equal(isBranchBlocking(null), false);
});

test("branch-authority real Lineage 59 declaration is truthful and offerable", async () => {
  const {
    BRANCH_MOMENTS,
    BRANCH_CONNECTIONS,
    BRANCH_ALTERNATE_CONNECTIONS,
    BRANCHES,
  } = await import("../lib/lineage-59/living-memory-book-data.ts");

  const branch = BRANCHES[0];
  assert.equal(branch.fromMomentId, "br-m59-004");

  const connections = [...BRANCH_CONNECTIONS, ...BRANCH_ALTERNATE_CONNECTIONS];
  const problems = validateBranchTopology(
    branch,
    connections,
    BRANCH_MOMENTS.map((m) => m.id),
  );
  assert.deepEqual(problems, [], `Lineage 59 branch topology must be truthful: ${problems.join(" | ")}`);

  const byId = new Map(connections.map((c) => [c.id, c]));
  const resolved = resolveBranchChoices(branch.choices, byId, branch.fromMomentId);
  assert.equal(resolved.length, 2, "both declared choices remain truthful");
  assert.ok(canOfferBranch(resolved));

  const destinations = resolved.map((choice) => choice.continuationMomentId);
  assert.equal(destinations[0], "br-m59-005", "choice A continues the primary path");
  assert.equal(destinations[1], "br-m59-006", "choice B lands on the reflection Moment");
  assert.notEqual(destinations[0], destinations[1], "both choices land on distinct Moments");
  for (const destination of destinations) {
    assert.ok(
      BRANCH_MOMENTS.some((moment) => moment.id === destination),
      `destination ${destination} must exist on the branch path`,
    );
  }
});
