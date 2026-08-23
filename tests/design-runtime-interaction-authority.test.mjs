import assert from "node:assert/strict";
import test from "node:test";

import {
  TAP_THRESHOLD_PX_DEFAULT,
  assertValidInteractionState,
  createInteractionAuthorityState,
  hasActivePointerGesture,
  reduceInteractionAuthority,
} from "../lib/design-runtime/interaction-authority.ts";

function begin(state, pointerId = 1, x = 0, y = 0) {
  return reduceInteractionAuthority(state, { type: "pointerdown", pointerId, x, y });
}

test("interaction authority: default state is idle with Track 60 evidence threshold", () => {
  const state = createInteractionAuthorityState();
  assert.equal(state.tapThresholdPx, TAP_THRESHOLD_PX_DEFAULT);
  assert.equal(TAP_THRESHOLD_PX_DEFAULT, 6);
  assert.equal(state.phase, "idle");
  assert.equal(state.pointerId, null);
  assert.equal(hasActivePointerGesture(state), false);
});

test("interaction authority: invalid thresholds are rejected fail-closed", () => {
  for (const bad of [0, -1, -0.001, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "6", null]) {
    assert.throws(
      () => createInteractionAuthorityState({ tapThresholdPx: bad }),
      TypeError,
      `threshold ${String(bad)} must be rejected`,
    );
  }
  const custom = createInteractionAuthorityState({ tapThresholdPx: 10 });
  assert.equal(custom.tapThresholdPx, 10, "Crystal evidence threshold (CRYSTAL_DRAG_START_PX=10) must be expressible");
});

test("interaction authority: below-threshold movement completes as tap on pointerup", () => {
  let state = createInteractionAuthorityState();
  ({ state } = begin(state));
  assert.equal(state.phase, "pending");
  ({ state } = reduceInteractionAuthority(state, { type: "pointermove", pointerId: 1, x: 3, y: 2 }));
  assert.equal(state.phase, "pending");
  const result = reduceInteractionAuthority(state, { type: "pointerup", pointerId: 1 });
  assert.equal(result.outcome, "tap");
  assert.equal(result.state.phase, "idle");
});

test("interaction authority: exact threshold boundary classifies as tap, not drag", () => {
  // Track 60 confirmed rule: strictly greater than threshold -> drag.
  let state = createInteractionAuthorityState({ tapThresholdPx: 6 });
  ({ state } = begin(state, 1, 100, 100));
  ({ state } = reduceInteractionAuthority(state, { type: "pointermove", pointerId: 1, x: 106, y: 100 }));
  assert.equal(state.phase, "pending", "distance exactly equal to threshold must not latch drag");
  const result = reduceInteractionAuthority(state, { type: "pointerup", pointerId: 1 });
  assert.equal(result.outcome, "tap");
});

test("interaction authority: above-threshold movement latches drag and completes as drag", () => {
  let state = createInteractionAuthorityState({ tapThresholdPx: 6 });
  ({ state } = begin(state, 1, 100, 100));
  ({ state } = reduceInteractionAuthority(state, { type: "pointermove", pointerId: 1, x: 107, y: 100 }));
  assert.equal(state.phase, "drag");
  const result = reduceInteractionAuthority(state, { type: "pointerup", pointerId: 1 });
  assert.equal(result.outcome, "drag");
  assert.equal(result.state.phase, "idle");
});

test("interaction authority: drag never reverts to tap on direction reversal", () => {
  let state = createInteractionAuthorityState({ tapThresholdPx: 6 });
  ({ state } = begin(state, 1, 0, 0));
  ({ state } = reduceInteractionAuthority(state, { type: "pointermove", pointerId: 1, x: 40, y: 0 }));
  assert.equal(state.phase, "drag");
  ({ state } = reduceInteractionAuthority(state, { type: "pointermove", pointerId: 1, x: 0, y: 0 }));
  ({ state } = reduceInteractionAuthority(state, { type: "pointermove", pointerId: 1, x: -50, y: 0 }));
  assert.equal(state.phase, "drag", "reversal toward or past origin must keep drag authority");
  const result = reduceInteractionAuthority(state, { type: "pointerup", pointerId: 1 });
  assert.equal(result.outcome, "drag");
});

test("interaction authority: pointercancel resolves cleanup-only and trailing pointerup cannot tap", () => {
  let state = createInteractionAuthorityState();
  ({ state } = begin(state));
  ({ state } = reduceInteractionAuthority(state, { type: "pointermove", pointerId: 1, x: 20, y: 0 }));
  const cancelled = reduceInteractionAuthority(state, { type: "pointercancel", pointerId: 1 });
  assert.equal(cancelled.outcome, "cancelled");
  assert.equal(cancelled.state.phase, "idle");

  const trailingUp = reduceInteractionAuthority(cancelled.state, { type: "pointerup", pointerId: 1 });
  assert.equal(trailingUp.outcome, "none", "trailing pointerup after cancel must never select");
  const reCancel = reduceInteractionAuthority(cancelled.state, { type: "pointercancel", pointerId: 1 });
  assert.equal(reCancel.outcome, "none", "repeated terminal after cleanup must be a no-op");
});

test("interaction authority: lostpointercapture is cleanup-only with identical semantics", () => {
  let state = createInteractionAuthorityState();
  ({ state } = begin(state));
  const lost = reduceInteractionAuthority(state, { type: "lostpointercapture", pointerId: 1 });
  assert.equal(lost.outcome, "cancelled");
  assert.equal(lost.state.phase, "idle");
  const after = reduceInteractionAuthority(lost.state, { type: "pointerup", pointerId: 1 });
  assert.equal(after.outcome, "none");
});

test("interaction authority: stale pointer identity is dropped like Crystal's pointerId guard", () => {
  let state = createInteractionAuthorityState();
  ({ state } = begin(state, 1, 0, 0));
  const moved = reduceInteractionAuthority(state, { type: "pointermove", pointerId: 2, x: 99, y: 99 });
  assert.equal(moved.outcome, "none");
  assert.equal(moved.state.phase, "pending", "foreign-pointer move must not mutate the active gesture");
  const foreignUp = reduceInteractionAuthority(moved.state, { type: "pointerup", pointerId: 2 });
  assert.equal(foreignUp.outcome, "none", "foreign-pointer terminal must not complete the gesture");
  const ownerUp = reduceInteractionAuthority(foreignUp.state, { type: "pointerup", pointerId: 1 });
  assert.equal(ownerUp.outcome, "tap", "owner terminal still completes deterministically");
});

test("interaction authority: stale state never leaks into the next fresh gesture", () => {
  let state = createInteractionAuthorityState({ tapThresholdPx: 6 });
  ({ state } = begin(state, 1, 0, 0));
  ({ state } = reduceInteractionAuthority(state, { type: "pointercancel", pointerId: 1 }));
  assert.equal(hasActivePointerGesture(state), false);

  ({ state } = begin(state, 7, 500, 500));
  assert.deepEqual(
    { phase: state.phase, pointerId: state.pointerId, originX: state.originX, originY: state.originY },
    { phase: "pending", pointerId: 7, originX: 500, originY: 500 },
    "fresh pointerdown must fully re-initialize gesture identity",
  );
  ({ state } = reduceInteractionAuthority(state, { type: "pointermove", pointerId: 7, x: 502, y: 502 }));
  const result = reduceInteractionAuthority(state, { type: "pointerup", pointerId: 7 });
  assert.equal(result.outcome, "tap");
});

test("interaction authority: competing pointer cannot steal or reset an active gesture", () => {
  let state = createInteractionAuthorityState();
  ({ state } = begin(state, 1, 0, 0));
  ({ state } = reduceInteractionAuthority(state, { type: "pointermove", pointerId: 1, x: 30, y: 0 }));
  const stolenDown = begin(state, 2, 999, 999);
  assert.equal(stolenDown.outcome, "none");
  assert.equal(stolenDown.state.phase, "drag", "second pointerdown must not reset the active gesture");
  const result = reduceInteractionAuthority(stolenDown.state, { type: "pointerup", pointerId: 1 });
  assert.equal(result.outcome, "drag");
});

test("interaction authority: non-finite coordinates are dropped without corrupting state", () => {
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const idle = createInteractionAuthorityState();
    const began = reduceInteractionAuthority(idle, { type: "pointerdown", pointerId: 1, x: bad, y: 0 });
    assert.equal(began.outcome, "none", `origin x=${String(bad)} must not start a gesture`);
    assert.equal(began.state.phase, "idle", "NaN/Infinity origin poisoning must be blocked");

    let state = createInteractionAuthorityState({ tapThresholdPx: 6 });
    ({ state } = begin(state));
    const moved = reduceInteractionAuthority(state, { type: "pointermove", pointerId: 1, x: 0, y: bad });
    assert.equal(moved.state.phase, "pending", "non-finite move must be ignored, not latch or crash");
    const completed = reduceInteractionAuthority(moved.state, { type: "pointerup", pointerId: 1 });
    assert.equal(completed.outcome, "tap");
  }
});

test("interaction authority: malformed event shapes are rejected, inapplicable ones are no-ops", () => {
  const state = createInteractionAuthorityState();
  assert.throws(() => reduceInteractionAuthority(state, { type: "scroll" }), TypeError);
  assert.throws(() => reduceInteractionAuthority(state, { type: "pointerup" }), TypeError, "missing pointerId");
  assert.throws(() => reduceInteractionAuthority(state, null), TypeError);

  const movedIdle = reduceInteractionAuthority(state, { type: "pointermove", pointerId: 1, x: 5, y: 5 });
  assert.equal(movedIdle.outcome, "none", "moves without an active gesture are no-ops");
  const cancelledIdle = reduceInteractionAuthority(state, { type: "pointercancel", pointerId: 1 });
  assert.equal(cancelledIdle.outcome === "cancelled", false, "cancel without an active gesture must not report cancellation");
});

test("interaction authority: caller inputs are never mutated", () => {
  const frozenInitial = Object.freeze(createInteractionAuthorityState({ tapThresholdPx: 6 }));
  const frozenEvent = Object.freeze({ type: "pointerdown", pointerId: 1, x: 0, y: 0 });

  const pressed = reduceInteractionAuthority(frozenInitial, frozenEvent);
  assert.equal(pressed.state.phase, "pending");
  assert.notEqual(pressed.state, frozenInitial, "result must be a fresh state object");
  assert.deepEqual(frozenInitial, createInteractionAuthorityState({ tapThresholdPx: 6 }));
  assert.deepEqual(frozenEvent, { type: "pointerdown", pointerId: 1, x: 0, y: 0 });

  const frozenDragged = Object.freeze(pressed.state);
  const latched = reduceInteractionAuthority(frozenDragged, Object.freeze({ type: "pointermove", pointerId: 1, x: 25, y: 0 }));
  assert.equal(latched.state.phase, "drag");
  assert.equal(latched.state.originX, 0);
  assert.deepEqual(frozenDragged, pressed.state, "frozen source state must be untouched by drag latching");
});

test("interaction authority: state validator is fail-closed against inconsistent states", () => {
  assert.doesNotThrow(() => assertValidInteractionState(createInteractionAuthorityState()));
  assert.throws(() => assertValidInteractionState(null), TypeError);
  assert.throws(
    () => assertValidInteractionState({ ...createInteractionAuthorityState(), phase: "floating" }),
    TypeError,
  );
  assert.throws(
    () => assertValidInteractionState({ ...createInteractionAuthorityState(), phase: "pending", pointerId: 1 }),
    TypeError,
    "active phase without finite origin must be rejected",
  );
  assert.throws(
    () =>
      assertValidInteractionState({
        ...createInteractionAuthorityState(),
        tapThresholdPx: Number.NaN,
      }),
    TypeError,
  );
});
