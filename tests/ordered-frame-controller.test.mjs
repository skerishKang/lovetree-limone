import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveOrderedFrameConfig,
  createInitialOrderedFrameState,
  reduceOrderedFrame,
  nearestFrameForAngle,
  canAutoAdvance,
  selectedFrameId,
  selectedIndex,
  isManuallyOwned,
  isAutoplayActive,
} from "../lib/experience-runtime/ordered-frame-controller.ts";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeConfig(overrides = {}) {
  return resolveOrderedFrameConfig({
    frameIds: ["a", "b", "c", "d"],
    ...overrides,
  });
}

function init(overrides = {}) {
  const config = makeConfig(overrides);
  return { config, state: createInitialOrderedFrameState(config) };
}

/* ------------------------------------------------------------------ */
/* Initial state                                                      */
/* ------------------------------------------------------------------ */

test("initial state — defaults", () => {
  const { state } = init();
  assert.equal(state.index, 0);
  assert.equal(state.frameId, "a");
  assert.equal(state.dragAccumulator, 0);
  assert.equal(state.lastDragDirection, 0);
  assert.equal(state.autoplay, false);
  assert.equal(state.manuallyOwned, false);
});

test("initial state — custom index + autoplay + manual", () => {
  const { state } = init({
    initialIndex: 2,
    initialAutoplay: true,
    initiallyManuallyOwned: true,
  });
  assert.equal(state.index, 2);
  assert.equal(state.frameId, "c");
  assert.equal(state.autoplay, true);
  assert.equal(state.manuallyOwned, true);
});

/* ------------------------------------------------------------------ */
/* next / previous                                                    */
/* ------------------------------------------------------------------ */

test("MANUAL_NEXT advances by one", () => {
  const { config, state } = init();
  const s = reduceOrderedFrame(state, { type: "MANUAL_NEXT" }, config);
  assert.equal(s.index, 1);
  assert.equal(s.frameId, "b");
  assert.equal(s.manuallyOwned, true);
});

test("MANUAL_PREVIOUS retreats by one", () => {
  const { config, state } = init();
  const s = reduceOrderedFrame(state, { type: "MANUAL_PREVIOUS" }, config);
  assert.equal(s.index, 3);
  assert.equal(s.frameId, "d");
  assert.equal(s.manuallyOwned, true);
});

/* ------------------------------------------------------------------ */
/* wrap mode                                                          */
/* ------------------------------------------------------------------ */

test("wrap — MANUAL_NEXT at last wraps to first", () => {
  const { config, state } = init({ initialIndex: 3, boundaryPolicy: "wrap" });
  const s = reduceOrderedFrame(state, { type: "MANUAL_NEXT" }, config);
  assert.equal(s.index, 0);
  assert.equal(s.frameId, "a");
});

test("wrap — MANUAL_PREVIOUS at first wraps to last", () => {
  const { config, state } = init({ initialIndex: 0, boundaryPolicy: "wrap" });
  const s = reduceOrderedFrame(state, { type: "MANUAL_PREVIOUS" }, config);
  assert.equal(s.index, 3);
});

/* ------------------------------------------------------------------ */
/* clamp mode                                                         */
/* ------------------------------------------------------------------ */

test("clamp — MANUAL_NEXT at last holds at last", () => {
  const { config, state } = init({ initialIndex: 3, boundaryPolicy: "clamp" });
  const s = reduceOrderedFrame(state, { type: "MANUAL_NEXT" }, config);
  assert.equal(s.index, 3);
  assert.equal(s.frameId, "d");
});

test("clamp — MANUAL_PREVIOUS at first holds at first", () => {
  const { config, state } = init({ initialIndex: 0, boundaryPolicy: "clamp" });
  const s = reduceOrderedFrame(state, { type: "MANUAL_PREVIOUS" }, config);
  assert.equal(s.index, 0);
});

/* ------------------------------------------------------------------ */
/* direct select                                                      */
/* ------------------------------------------------------------------ */

test("DIRECT_SELECT by index", () => {
  const { config, state } = init();
  const s = reduceOrderedFrame(state, { type: "DIRECT_SELECT", index: 2 }, config);
  assert.equal(s.index, 2);
  assert.equal(s.frameId, "c");
  assert.equal(s.manuallyOwned, true);
});

test("DIRECT_SELECT out-of-range wraps", () => {
  const { config, state } = init({ boundaryPolicy: "wrap" });
  const s = reduceOrderedFrame(state, { type: "DIRECT_SELECT", index: 5 }, config);
  assert.equal(s.index, 1);
});

test("DIRECT_SELECT out-of-range clamps", () => {
  const { config, state } = init({ boundaryPolicy: "clamp" });
  const s = reduceOrderedFrame(state, { type: "DIRECT_SELECT", index: 9 }, config);
  assert.equal(s.index, 3);
});

test("DIRECT_SELECT_BY_ID selects correct frame", () => {
  const { config, state } = init();
  const s = reduceOrderedFrame(
    state,
    { type: "DIRECT_SELECT_BY_ID", frameId: "c" },
    config,
  );
  assert.equal(s.index, 2);
  assert.equal(s.frameId, "c");
});

test("DIRECT_SELECT_BY_ID unknown id fails closed", () => {
  const { config, state } = init();
  assert.throws(
    () =>
      reduceOrderedFrame(
        state,
        { type: "DIRECT_SELECT_BY_ID", frameId: "zzz" },
        config,
      ),
    /not in the configured frame set/,
  );
});

test("DIRECT_SELECT invalid index (NaN) fails closed", () => {
  const { config, state } = init();
  assert.throws(
    () => reduceOrderedFrame(state, { type: "DIRECT_SELECT", index: NaN }, config),
    /finite number/,
  );
});

test("DIRECT_SELECT invalid index (Infinity) fails closed", () => {
  const { config, state } = init();
  assert.throws(
    () =>
      reduceOrderedFrame(state, { type: "DIRECT_SELECT", index: Infinity }, config),
    /finite number/,
  );
});

test("DIRECT_SELECT manual:false does not take manual ownership", () => {
  const { config, state } = init();
  const s = reduceOrderedFrame(
    state,
    { type: "DIRECT_SELECT", index: 2, manual: false },
    config,
  );
  assert.equal(s.index, 2);
  assert.equal(s.manuallyOwned, false);
});

/* ------------------------------------------------------------------ */
/* drag — threshold, direction, multi-step                            */
/* ------------------------------------------------------------------ */

test("MANUAL_DRAG below threshold retains accumulator, no step", () => {
  const { config, state } = init({ stepThreshold: 48, positiveDeltaDirection: 1 });
  const s = reduceOrderedFrame(state, { type: "MANUAL_DRAG", deltaX: 30 }, config);
  assert.equal(s.index, 0);
  assert.equal(s.dragAccumulator, 30);
  assert.equal(s.manuallyOwned, false);
});

test("MANUAL_DRAG exact threshold steps exactly one", () => {
  const { config, state } = init({ stepThreshold: 48, positiveDeltaDirection: 1 });
  const s = reduceOrderedFrame(state, { type: "MANUAL_DRAG", deltaX: 48 }, config);
  assert.equal(s.index, 1);
  assert.equal(s.dragAccumulator, 0);
  assert.equal(s.manuallyOwned, true);
});

test("MANUAL_DRAG positive delta with +1 convention increments", () => {
  const { config, state } = init({ stepThreshold: 48, positiveDeltaDirection: 1 });
  const s = reduceOrderedFrame(state, { type: "MANUAL_DRAG", deltaX: 60 }, config);
  assert.equal(s.index, 1);
  assert.equal(s.dragAccumulator, 12);
});

test("MANUAL_DRAG negative delta with +1 convention decrements", () => {
  const { config, state } = init({
    initialIndex: 2,
    stepThreshold: 48,
    positiveDeltaDirection: 1,
  });
  const s = reduceOrderedFrame(state, { type: "MANUAL_DRAG", deltaX: -60 }, config);
  assert.equal(s.index, 1);
  assert.equal(s.dragAccumulator, -12);
});

test("MANUAL_DRAG with -1 convention (Crystal/VideoFigure) flips sign", () => {
  const { config, state } = init({ stepThreshold: 48, positiveDeltaDirection: -1 });
  // positive deltaX with -1 convention => decrement
  const s = reduceOrderedFrame(state, { type: "MANUAL_DRAG", deltaX: 48 }, config);
  assert.equal(s.index, 3);
});

test("MANUAL_DRAG multi-step consumes whole thresholds, keeps remainder", () => {
  const { config, state } = init({ stepThreshold: 48, positiveDeltaDirection: 1 });
  const s = reduceOrderedFrame(state, { type: "MANUAL_DRAG", deltaX: 100 }, config);
  assert.equal(s.index, 2);
  assert.equal(s.dragAccumulator, 4);
});

test("MANUAL_DRAG large delta wraps deterministically", () => {
  const { config, state } = init({ stepThreshold: 48, positiveDeltaDirection: 1 });
  const s = reduceOrderedFrame(state, { type: "MANUAL_DRAG", deltaX: 500 }, config);
  // floor(500/48) = 10 steps; 10 % 4 = 2 => index 2; remainder 500 - 480 = 20
  assert.equal(s.index, 2);
  assert.equal(s.dragAccumulator, 20);
});

test("MANUAL_DRAG accumulates remainder across gestures", () => {
  const { config, state } = init({ stepThreshold: 48, positiveDeltaDirection: 1 });
  const s1 = reduceOrderedFrame(state, { type: "MANUAL_DRAG", deltaX: 30 }, config);
  assert.equal(s1.dragAccumulator, 30);
  const s2 = reduceOrderedFrame(s1, { type: "MANUAL_DRAG", deltaX: 30 }, config);
  // 30 + 30 = 60 => 1 step, remainder 12
  assert.equal(s2.index, 1);
  assert.equal(s2.dragAccumulator, 12);
});

test("MANUAL_DRAG invalid deltaX (NaN) fails closed", () => {
  const { config, state } = init({ stepThreshold: 48 });
  assert.throws(
    () => reduceOrderedFrame(state, { type: "MANUAL_DRAG", deltaX: NaN }, config),
    /finite number/,
  );
});

test("DRAG_END resets accumulator without changing index", () => {
  const { config, state } = init({ stepThreshold: 48, positiveDeltaDirection: 1 });
  const dragged = reduceOrderedFrame(
    state,
    { type: "MANUAL_DRAG", deltaX: 30 },
    config,
  );
  const ended = reduceOrderedFrame(dragged, { type: "DRAG_END" }, config);
  assert.equal(ended.index, 0);
  assert.equal(ended.dragAccumulator, 0);
  assert.equal(ended.lastDragDirection, 0);
});

/* ------------------------------------------------------------------ */
/* angle quantization                                                 */
/* ------------------------------------------------------------------ */

test("ANGLE_TO_FRAME normalizes >360 and picks nearest", () => {
  const { config, state } = init({ angles: [0, 90, 180, 270] });
  const s = reduceOrderedFrame(state, { type: "ANGLE_TO_FRAME", angle: 370 }, config);
  // 370 => 10 => nearest 0
  assert.equal(s.index, 0);
});

test("ANGLE_TO_FRAME normalizes negative angle", () => {
  const { config, state } = init({ angles: [0, 90, 180, 270] });
  const s = reduceOrderedFrame(state, { type: "ANGLE_TO_FRAME", angle: -10 }, config);
  // -10 => 350 => nearest 0 (dist 10) over 270 (dist 80)
  assert.equal(s.index, 0);
});

test("ANGLE_TO_FRAME picks nearest frame", () => {
  const { config, state } = init({ angles: [0, 90, 180, 270] });
  const s = reduceOrderedFrame(state, { type: "ANGLE_TO_FRAME", angle: 100 }, config);
  // nearest 90 => index 1
  assert.equal(s.index, 1);
});

test("ANGLE_TO_FRAME tie breaks to lower index", () => {
  const { config, state } = init({ angles: [0, 90, 180, 270] });
  const s = reduceOrderedFrame(state, { type: "ANGLE_TO_FRAME", angle: 45 }, config);
  // 45 equidistant to 0 and 90 => lower index (0) wins
  assert.equal(s.index, 0);
});

test("nearestFrameForAngle returns null when no angles configured", () => {
  const config = makeConfig();
  assert.equal(nearestFrameForAngle(config, 0), null);
});

test("ANGLE_TO_FRAME fails closed when no angles configured", () => {
  const { config, state } = init();
  assert.throws(
    () => reduceOrderedFrame(state, { type: "ANGLE_TO_FRAME", angle: 0 }, config),
    /not available/,
  );
});

test("ANGLE_TO_FRAME invalid angle (NaN) fails closed", () => {
  const { config, state } = init({ angles: [0, 90, 180, 270] });
  assert.throws(
    () => reduceOrderedFrame(state, { type: "ANGLE_TO_FRAME", angle: NaN }, config),
    /finite number/,
  );
});

/* ------------------------------------------------------------------ */
/* keyboard intents                                                  */
/* ------------------------------------------------------------------ */

test("KEYBOARD next", () => {
  const { config, state } = init();
  const s = reduceOrderedFrame(
    state,
    { type: "KEYBOARD", direction: "next" },
    config,
  );
  assert.equal(s.index, 1);
  assert.equal(s.manuallyOwned, true);
});

test("KEYBOARD previous", () => {
  const { config, state } = init();
  const s = reduceOrderedFrame(
    state,
    { type: "KEYBOARD", direction: "previous" },
    config,
  );
  assert.equal(s.index, 3);
});

test("KEYBOARD invalid direction fails closed", () => {
  const { config, state } = init();
  assert.throws(
    () =>
      reduceOrderedFrame(state, { type: "KEYBOARD", direction: "up" }, config),
    /must be "next" or "previous"/,
  );
});

/* ------------------------------------------------------------------ */
/* autoplay state (no internal timer)                                 */
/* ------------------------------------------------------------------ */

test("AUTOPLAY_TICK advances when autoplay and not manually owned", () => {
  const { config, state } = init({ initialAutoplay: true });
  const s = reduceOrderedFrame(state, { type: "AUTOPLAY_TICK" }, config);
  assert.equal(s.index, 1);
});

test("AUTOPLAY_TICK is a no-op when manually owned", () => {
  const { config, state } = init({ initialAutoplay: true });
  const owned = reduceOrderedFrame(state, { type: "MANUAL_TAKEOVER" }, config);
  const s = reduceOrderedFrame(owned, { type: "AUTOPLAY_TICK" }, config);
  assert.equal(s.index, 0);
  assert.equal(s.manuallyOwned, true);
});

test("AUTOPLAY_TICK is a no-op when autoplay off", () => {
  const { config, state } = init({ initialAutoplay: false });
  const s = reduceOrderedFrame(state, { type: "AUTOPLAY_TICK" }, config);
  assert.equal(s.index, 0);
});

test("PAUSE clears autoplay, preserves manual ownership", () => {
  const { config, state } = init({
    initialAutoplay: true,
    initiallyManuallyOwned: true,
  });
  const s = reduceOrderedFrame(state, { type: "PAUSE" }, config);
  assert.equal(s.autoplay, false);
  assert.equal(s.manuallyOwned, true);
});

test("RESUME sets autoplay, clears manual ownership", () => {
  const { config, state } = init({
    initialAutoplay: false,
    initiallyManuallyOwned: true,
  });
  const s = reduceOrderedFrame(state, { type: "RESUME" }, config);
  assert.equal(s.autoplay, true);
  assert.equal(s.manuallyOwned, false);
});

/* ------------------------------------------------------------------ */
/* manual takeover                                                    */
/* ------------------------------------------------------------------ */

test("MANUAL_TAKEOVER sets manual ownership", () => {
  const { config, state } = init();
  const s = reduceOrderedFrame(state, { type: "MANUAL_TAKEOVER" }, config);
  assert.equal(s.manuallyOwned, true);
  assert.equal(s.autoplay, false);
});

test("MANUAL_TAKEOVER with pausePlayback clears autoplay", () => {
  const { config, state } = init({ initialAutoplay: true });
  const s = reduceOrderedFrame(
    state,
    { type: "MANUAL_TAKEOVER", pausePlayback: true },
    config,
  );
  assert.equal(s.manuallyOwned, true);
  assert.equal(s.autoplay, false);
});

test("MANUAL_RELEASE clears manual ownership (resume-after-idle)", () => {
  const { config, state } = init({
    initialAutoplay: true,
    initiallyManuallyOwned: true,
    resumePolicy: "resume-after-idle",
  });
  const s = reduceOrderedFrame(state, { type: "MANUAL_RELEASE" }, config);
  assert.equal(s.manuallyOwned, false);
  assert.equal(s.autoplay, true);
});

test("MANUAL_RELEASE clears manual ownership and autoplay (stay-paused)", () => {
  const { config, state } = init({
    initialAutoplay: true,
    initiallyManuallyOwned: true,
    resumePolicy: "stay-paused",
  });
  const s = reduceOrderedFrame(state, { type: "MANUAL_RELEASE" }, config);
  assert.equal(s.manuallyOwned, false);
  assert.equal(s.autoplay, false);
});

test("RESET returns to initial index and transport flags", () => {
  const { config, state } = init({
    initialIndex: 1,
    initialAutoplay: true,
    initiallyManuallyOwned: true,
  });
  const moved = reduceOrderedFrame(state, { type: "MANUAL_NEXT" }, config);
  const s = reduceOrderedFrame(moved, { type: "RESET" }, config);
  assert.equal(s.index, 1);
  assert.equal(s.autoplay, true);
  assert.equal(s.manuallyOwned, true);
});

/* ------------------------------------------------------------------ */
/* fail-closed config validation                                      */
/* ------------------------------------------------------------------ */

test("empty frame list fails closed", () => {
  assert.throws(
    () => resolveOrderedFrameConfig({ frameIds: [] }),
    /at least one frame/,
  );
});

test("duplicate ids fail closed", () => {
  assert.throws(
    () => resolveOrderedFrameConfig({ frameIds: ["a", "a"] }),
    /duplicate/,
  );
});

test("NaN threshold fails closed", () => {
  assert.throws(
    () => resolveOrderedFrameConfig({ frameIds: ["a"], stepThreshold: NaN }),
    /positive finite/,
  );
});

test("Infinity threshold fails closed", () => {
  assert.throws(
    () => resolveOrderedFrameConfig({ frameIds: ["a"], stepThreshold: Infinity }),
    /positive finite/,
  );
});

test("negative threshold fails closed", () => {
  assert.throws(
    () => resolveOrderedFrameConfig({ frameIds: ["a"], stepThreshold: -1 }),
    /positive finite/,
  );
});

test("zero threshold fails closed", () => {
  assert.throws(
    () => resolveOrderedFrameConfig({ frameIds: ["a"], stepThreshold: 0 }),
    /positive finite/,
  );
});

test("invalid boundaryPolicy fails closed", () => {
  assert.throws(
    () =>
      resolveOrderedFrameConfig({ frameIds: ["a"], boundaryPolicy: "bounce" }),
    /wrap" or "clamp/,
  );
});

test("invalid positiveDeltaDirection fails closed", () => {
  assert.throws(
    () => resolveOrderedFrameConfig({ frameIds: ["a"], positiveDeltaDirection: 2 }),
    /1 or -1/,
  );
});

test("invalid resumePolicy fails closed", () => {
  assert.throws(
    () => resolveOrderedFrameConfig({ frameIds: ["a"], resumePolicy: "foo" }),
    /resume-after-idle" or "stay-paused/,
  );
});

test("mis-aligned angles array fails closed", () => {
  assert.throws(
    () => resolveOrderedFrameConfig({ frameIds: ["a", "b"], angles: [0] }),
    /must equal frameIds.length/,
  );
});

test("non-finite angle in angles array fails closed", () => {
  assert.throws(
    () =>
      resolveOrderedFrameConfig({ frameIds: ["a", "b"], angles: [0, NaN] }),
    /finite number/,
  );
});

/* ------------------------------------------------------------------ */
/* malformed events                                                   */
/* ------------------------------------------------------------------ */

test("reducer rejects null action", () => {
  const { config, state } = init();
  assert.throws(
    () => reduceOrderedFrame(state, null, config),
    /action must be an object/,
  );
});

test("reducer rejects action without string type", () => {
  const { config, state } = init();
  assert.throws(
    () => reduceOrderedFrame(state, { foo: 1 }, config),
    /string type/,
  );
});

test("reducer rejects unknown action type", () => {
  const { config, state } = init();
  assert.throws(
    () => reduceOrderedFrame(state, { type: "BOGUS" }, config),
    /unsupported action type/,
  );
});

test("reducer rejects null state", () => {
  const { config } = init();
  assert.throws(
    () => reduceOrderedFrame(null, { type: "MANUAL_NEXT" }, config),
    /state must be an object/,
  );
});

/* ------------------------------------------------------------------ */
/* pure predicates                                                    */
/* ------------------------------------------------------------------ */

test("predicates reflect state", () => {
  const { config, state } = init({ initialAutoplay: true });
  assert.equal(selectedIndex(state), 0);
  assert.equal(selectedFrameId(state), "a");
  assert.equal(isAutoplayActive(state), true);
  assert.equal(isManuallyOwned(state), false);
  assert.equal(canAutoAdvance(state), true);

  const owned = reduceOrderedFrame(state, { type: "MANUAL_TAKEOVER" }, config);
  assert.equal(canAutoAdvance(owned), false);
  assert.equal(isManuallyOwned(owned), true);
});

/* ------------------------------------------------------------------ */
/* purity — input state is never mutated                              */
/* ------------------------------------------------------------------ */

test("reducer does not mutate input state", () => {
  const { config, state } = init();
  const snapshot = JSON.parse(JSON.stringify(state));
  reduceOrderedFrame(state, { type: "MANUAL_NEXT" }, config);
  reduceOrderedFrame(state, { type: "MANUAL_DRAG", deltaX: 100 }, config);
  assert.deepEqual(state, snapshot);
});
