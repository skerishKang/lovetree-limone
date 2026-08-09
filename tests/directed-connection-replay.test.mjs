import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  activeDirectedReplayStep,
  createDirectedConnectionReplayState,
  deriveDirectedConnectionReplayPlan,
  reduceDirectedConnectionReplay,
} from "../lib/directed-connection-replay.ts";

const moments = [
  { id: "m1", title: "One" },
  { id: "m2", title: "Two" },
  { id: "m3", title: "Three" },
  { id: "m4", title: "Four" },
];

const connections = [
  { id: "c1", fromMomentId: "m1", toMomentId: "m2", label: "one to two", order: 1 },
  { id: "c2", fromMomentId: "m2", toMomentId: "m3", label: "two to three", order: 2 },
  { id: "c3", fromMomentId: "m3", toMomentId: "m4", label: "three to four", order: 3 },
];

const reduce = (state, action) => reduceDirectedConnectionReplay(state, action);

test("CAP-14 derives an alternating Moment/Connection path from any valid starting Moment", () => {
  const fromRoot = deriveDirectedConnectionReplayPlan(moments, connections, "m1");
  assert.equal(fromRoot.termination, "complete");
  assert.deepEqual(fromRoot.steps.map((step) => step.key), [
    "moment:m1",
    "connection:c1",
    "moment:m2",
    "connection:c2",
    "moment:m3",
    "connection:c3",
    "moment:m4",
  ]);

  const fromMiddle = deriveDirectedConnectionReplayPlan(moments, connections, "m3");
  assert.deepEqual(fromMiddle.steps.map((step) => step.key), [
    "moment:m3",
    "connection:c3",
    "moment:m4",
  ]);
  assert.equal(fromMiddle.terminalMomentId, "m4");
});

test("deterministic outgoing order chooses the smallest explicit order and then id", () => {
  const branched = [
    ...connections,
    { id: "c0-later", fromMomentId: "m1", toMomentId: "m4", label: "later", order: 8 },
    { id: "c0-first", fromMomentId: "m1", toMomentId: "m3", label: "first", order: 0 },
  ];
  const plan = deriveDirectedConnectionReplayPlan(moments, branched, "m1");
  assert.equal(plan.steps[1]?.kind, "connection");
  assert.equal(plan.steps[1]?.connectionId, "c0-first");
});

test("broken targets terminate visibly after the real Connection and never invent a Moment", () => {
  const plan = deriveDirectedConnectionReplayPlan(
    moments,
    [{ id: "broken", fromMomentId: "m1", toMomentId: "missing", label: "broken", order: 0 }],
    "m1",
  );

  assert.equal(plan.termination, "broken-target");
  assert.equal(plan.problemConnectionId, "broken");
  assert.deepEqual(plan.steps.map((step) => step.key), ["moment:m1", "connection:broken"]);
});

test("cycle detection terminates after exposing the cyclic edge and repeated Moment once", () => {
  const cyclic = [
    { id: "a", fromMomentId: "m1", toMomentId: "m2", label: "a", order: 0 },
    { id: "b", fromMomentId: "m2", toMomentId: "m1", label: "b", order: 1 },
  ];
  const plan = deriveDirectedConnectionReplayPlan(moments, cyclic, "m1");

  assert.equal(plan.termination, "cycle");
  assert.equal(plan.problemConnectionId, "b");
  assert.deepEqual(plan.steps.map((step) => step.key), [
    "moment:m1",
    "connection:a",
    "moment:m2",
    "connection:b",
    "moment:m1",
  ]);
});

test("invalid start fails closed with no replay steps", () => {
  const plan = deriveDirectedConnectionReplayPlan(moments, connections, "missing");
  assert.equal(plan.termination, "invalid-start");
  assert.deepEqual(plan.steps, []);
  assert.equal(createDirectedConnectionReplayState(plan).mode, "ended");
});

test("transport keeps traversed memory separate from the active replay step", () => {
  const plan = deriveDirectedConnectionReplayPlan(moments, connections, "m2");
  let state = createDirectedConnectionReplayState(plan);
  assert.equal(activeDirectedReplayStep(state)?.key, "moment:m2");
  assert.deepEqual(state.traversedStepKeys, []);

  state = reduce(state, { type: "play" });
  state = reduce(state, { type: "advance" });
  assert.deepEqual(state.traversedStepKeys, ["moment:m2"]);
  assert.equal(activeDirectedReplayStep(state)?.key, "connection:c2");

  state = reduce(state, { type: "pause" });
  const paused = state;
  assert.deepEqual(reduce(state, { type: "advance" }), paused, "paused replay must not advance");

  state = reduce(state, { type: "play" });
  while (state.mode === "playing") state = reduce(state, { type: "advance" });
  assert.equal(state.mode, "ended");
  assert.equal(state.activeIndex, -1);
  assert.deepEqual(state.traversedStepKeys, plan.steps.map((step) => step.key));

  state = reduce(state, { type: "restart" });
  assert.equal(state.mode, "playing");
  assert.deepEqual(state.traversedStepKeys, []);
  assert.equal(activeDirectedReplayStep(state)?.key, "moment:m2");
});

test("CAP-14 route is synthetic, reducer-driven and exposes no backend mutation", async () => {
  const page = await readFile(
    new URL("../app/design-lab/capabilities/connection-replay/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /deriveDirectedConnectionReplayPlan/);
  assert.match(page, /reduceDirectedConnectionReplay/);
  assert.match(page, /TRAVERSED MEMORY/);
  assert.match(page, /CAP-14 · INTERNAL MECHANIC PROTOTYPE · ISSUE #120/);
  assert.match(page, /31,131 bytes/);
  assert.match(page, /ed3701b3…a8021519/);
  assert.doesNotMatch(page, /fetch\(|\/api\/|firebase|signedUrl/i);
});

test("CAP-14 mobile and reduced-motion contracts are explicit", async () => {
  const css = await readFile(
    new URL("../app/styles/directed-connection-replay.css", import.meta.url),
    "utf8",
  );

  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 860px\)/);
  assert.match(css, /@media \(max-width: 460px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation-duration:\s*\.001ms/);
  assert.match(css, /transition-duration:\s*\.001ms/);
});
