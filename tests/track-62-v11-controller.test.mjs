import assert from "node:assert/strict";
import test from "node:test";

import {
  applyWheel,
  beginGesture,
  cancelGesture,
  createContinuousPhaseState,
  deriveActiveScene,
  endGesture,
  gestureDistance,
  isFractionalPhase,
  moveGesture,
  nearestScene,
  overlayOpened,
  sceneProjectionOffset,
  selectScene,
  setMotionPolicy,
  stepContinuousPhase,
} from "../lib/track-62-v11/controller.ts";

/** Drive a state to its next stable point via explicit frames. */
function settle(state, config, startMs, { maxFrames = 4000, dt = 16.667 } = {}) {
  let current = state;
  let now = startMs;
  for (let frame = 0; frame < maxFrames; frame += 1) {
    now += dt;
    current = stepContinuousPhase(current, config, now, dt);
    if (current.mode === "idle" && !current.settling) break;
  }
  return current;
}

for (const sceneCount of [3, 7, 11]) {
  const config = { sceneCount };

  test(`controller(${sceneCount} scenes): create + clamp of initialPhase`, () => {
    const state = createContinuousPhaseState(config);
    assert.equal(state.sceneCount, sceneCount);
    assert.equal(state.phase, 0);
    assert.equal(state.target, 0);
    assert.equal(deriveActiveScene(state), 0);

    const clamped = createContinuousPhaseState({ sceneCount, initialPhase: 99 });
    assert.equal(clamped.phase, sceneCount - 1);
    const negative = createContinuousPhaseState({ sceneCount, initialPhase: -4 });
    assert.equal(negative.phase, 0);
  });

  test(`controller(${sceneCount} scenes): wheel accumulates FRACTIONAL target on the same phase`, () => {
    let state = createContinuousPhaseState(config);
    state = applyWheel(state, config, { delta: 250, nowMs: 1000 });
    assert.ok(state.target > 0, "forward wheel must move target forward");
    assert.ok(state.target < sceneCount, "target stays bounded before any step");
    assert.equal(state.mode, "free");

    let stepped = stepContinuousPhase(state, config, 1016, 16.667);
    assert.ok(stepped.phase > 0, "phase must become fractional after stepping");
    assert.ok(isFractionalPhase(stepped), "fractional state must actually exist");
    // The fractional phase exists BEFORE any nearest snap (contract item E).
    if (Math.abs(stepped.target - 0) >= 0.5) {
      assert.notEqual(stepped.phase % 1, 0);
    }
  });

  test(`controller(${sceneCount} scenes): immediate reverse while moving`, () => {
    let state = createContinuousPhaseState(config);
    state = applyWheel(state, config, { delta: 600, nowMs: 1000 });
    for (let frame = 1; frame <= 20; frame += 1) {
      state = stepContinuousPhase(state, config, 1000 + frame * 16.667, 16.667);
    }
    assert.ok(state.phase > 0, "must be mid-travel when reversed");

    const before = state.phase;
    state = applyWheel(state, config, { delta: -600, nowMs: 1334 });
    assert.ok(state.target < before || state.target < state.phase + 0.001, "target reverses immediately");
    assert.equal(state.settling, false, "reverse input clears any settle lock");

    const reversed = settle(state, config, 1334);
    assert.ok(reversed.phase < before, "phase returns backward after reverse");
  });

  test(`controller(${sceneCount} scenes): idle detection then nearest-scene snap`, () => {
    let state = createContinuousPhaseState(config);
    state = applyWheel(state, config, { delta: 175, nowMs: 1000 });
    state = settle(state, config, 1000, { maxFrames: 8000 });
    assert.equal(state.mode, "idle");
    assert.equal(state.phase, nearestScene(state.phase, sceneCount));
    assert.ok(!isFractionalPhase(state), "idle state snaps to an integer scene");
    assert.ok(state.phase >= 0 && state.phase <= sceneCount - 1);
  });

  test(`controller(${sceneCount} scenes): drag crosses threshold once, then moves the SAME fractional phase`, () => {
    let state = createContinuousPhaseState(config);
    state = beginGesture(state, config, { pointerId: 1, startX: 300, nowMs: 2000 });
    // Below threshold: no scene movement — a short tap stays a tap.
    state = moveGesture(state, config, { pointerId: 1, x: 303, nowMs: 2010 });
    assert.equal(state.phase, 0);
    assert.equal(state.gesture, "armed");
    assert.ok(gestureDistance(state) < 8);

    state = moveGesture(state, config, { pointerId: 1, x: 200, nowMs: 2020 });
    assert.equal(state.gesture, "dragging", "threshold crossing flips the gesture exactly once");
    assert.ok(state.phase > 0, "dragging left accumulates forward phase");

    state = moveGesture(state, config, { pointerId: 1, x: 120, nowMs: 2030 });
    assert.ok(state.phase > 0);

    const { state: released, outcome } = endGesture(state, config, { pointerId: 1, nowMs: 2040 });
    assert.equal(outcome, "fling");
    assert.equal(released.settling, true);
    const settled = settle(released, config, 2040, { maxFrames: 8000 });
    assert.ok(!isFractionalPhase(settled));
    assert.ok(settled.phase >= 0 && settled.phase <= sceneCount - 1);
  });

  test(`controller(${sceneCount} scenes): below-threshold release is a tap — no phase commit`, () => {
    let state = createContinuousPhaseState(config);
    const before = state.phase;
    state = beginGesture(state, config, { pointerId: 2, startX: 200, nowMs: 3000, channel: "touch" });
    state = moveGesture(state, config, { pointerId: 2, x: 202, nowMs: 3010 });
    const { state: released, outcome } = endGesture(state, config, { pointerId: 2, nowMs: 3020 });
    assert.equal(outcome, "tap");
    assert.equal(released.phase, before, "tap must never move the phase");
    assert.equal(released.settling, false);
  });

  test(`controller(${sceneCount} scenes): pointercancel never selects, never commits, never opens`, () => {
    let state = createContinuousPhaseState(config);
    state = beginGesture(state, config, { pointerId: 3, startX: 400, nowMs: 4000 });
    state = moveGesture(state, config, { pointerId: 3, x: 220, nowMs: 4010 });
    const draggingPhase = state.phase;
    const { state: cancelled, outcome } = cancelGesture(state, { pointerId: 3, nowMs: 4020 });
    assert.equal(outcome, "cancelled");
    assert.equal(cancelled.velocity, 0);
    assert.equal(cancelled.drag, null);
    assert.ok(
      Math.abs(cancelled.target - draggingPhase) <= 0.0001,
      "cancel must not jump the target away from the interrupted drag",
    );
    const settled = settle(cancelled, config, 4020, { maxFrames: 8000 });
    assert.ok(Math.abs(settled.phase - nearestScene(draggingPhase, sceneCount)) < 0.51);
  });

  test(`controller(${sceneCount} scenes): direct selection travels through the SAME controller (travel, not teleport)`, () => {
    let state = createContinuousPhaseState(config);
    const destination = Math.min(2, sceneCount - 1);
    state = selectScene(state, config, { scene: destination, nowMs: 5000 });
    assert.equal(state.target, destination);
    assert.equal(state.mode, "settling");
    let now = 5000;
    let sawIntermediate = false;
    for (let frame = 0; frame < 6000; frame += 1) {
      now += 16.667;
      state = stepContinuousPhase(state, config, now, 16.667);
      if (state.phase > 0.03 && state.phase < destination - 0.03) sawIntermediate = true;
      if (state.mode === "idle") break;
    }
    assert.equal(state.phase, destination, "selection must LAND exactly on the scene");
    if (destination >= 1) {
      assert.equal(sawIntermediate, true, "selection must produce real intermediate fractional states");
    }
  });

  test(`controller(${sceneCount} scenes): boundary clamps hold`, () => {
    let state = createContinuousPhaseState(config);
    state = applyWheel(state, config, { delta: -800, nowMs: 6000 });
    assert.equal(state.target, 0, "backward wheel at the start clamps at scene 0");
    state = settle(state, config, 6000);
    assert.equal(state.phase, 0);

    let last = createContinuousPhaseState({ sceneCount, initialPhase: sceneCount - 1 });
    last = applyWheel(last, config, { delta: 800, nowMs: 6000 });
    assert.equal(last.target, sceneCount - 1, "forward wheel clamps at the final scene");
    last = settle(last, config, 6000);
    assert.equal(last.phase, sceneCount - 1);
  });

  test(`controller(${sceneCount} scenes): projection contract sceneX=(index-phase)*spacing`, () => {
    let state = createContinuousPhaseState(config);
    state = selectScene(state, config, { scene: 2 > sceneCount - 1 ? sceneCount - 1 : 2, nowMs: 7000 });
    state = settle(state, config, 7000, { maxFrames: 8000 });
    for (let index = 0; index < sceneCount; index += 1) {
      const offset = sceneProjectionOffset(state, index);
      assert.equal(offset, index - state.phase);
    }
  });

  test(`controller(${sceneCount} scenes): overlay open/close NEVER resets phase (phase preservation)`, () => {
    let state = createContinuousPhaseState(config);
    state = applyWheel(state, config, { delta: 600, nowMs: 8000 });
    for (let frame = 1; frame <= 30; frame += 1) {
      state = stepContinuousPhase(state, config, 8000 + frame * 16.667, 16.667);
    }
    const midPhase = state.phase;

    const opened = overlayOpened(state);
    assert.equal(opened.phase, midPhase, "opening a viewer must not move the phase");
    assert.equal(opened.target, state.target);
    const closed = overlayOpened(opened);
    assert.equal(closed.phase, midPhase, "closing a viewer must not move the phase");
    assert.equal(closed.mode, state.mode);
  });

  test(`controller(${sceneCount} scenes): reduced-motion keeps semantics, only set speed changes`, () => {
    let state = createContinuousPhaseState(config);
    const switched = setMotionPolicy(state, config, "reduced");
    assert.equal(switched.state.motionPolicy, "reduced");
    assert.equal(switched.config.motionPolicy, "reduced");
    assert.equal(switched.state.phase, state.phase, "policy switch preserves phase exactly");

    state = applyWheel(switched.state, switched.config, { delta: 400, nowMs: 9000 });
    assert.ok(isFractionalPhase(stepContinuousPhase(state, switched.config, 9017, 16.667)) || state.target > 0);
    assert.ok(state.target > 0, "wheel still accumulates under reduced motion");

    const destination = Math.min(1, sceneCount - 1);
    let reducedSelect = selectScene(state, switched.config, { scene: destination, nowMs: 9100 });
    let now = 9100;
    for (let frame = 0; frame < 400; frame += 1) {
      now += 16.667;
      reducedSelect = stepContinuousPhase(reducedSelect, switched.config, now, 16.667);
      if (reducedSelect.mode === "idle") break;
    }
    assert.equal(reducedSelect.phase, destination, "reduced motion still reaches the selected scene");
    assert.ok((now - 9100) < 1500, "reduced motion settles fast (no long inertia)");
  });

  test(`controller(${sceneCount} scenes): gesture ownership pins the phase during drag`, () => {
    let state = createContinuousPhaseState(config);
    state = applyWheel(state, config, { delta: 300, nowMs: 10000 });
    state = beginGesture(state, config, { pointerId: 7, startX: 100, nowMs: 10010 });
    const frozen = stepContinuousPhase(state, config, 10026, 16.667);
    assert.equal(frozen.phase, state.phase, "active pointer owns the phase; step must not animate against it");
    const { state: cancelled } = cancelGesture(frozen, { pointerId: 7, nowMs: 10030 });
    assert.equal(cancelled.drag, null);
  });

  test(`controller(${sceneCount} scenes): pointer identity is enforced`, () => {
    let state = createContinuousPhaseState(config);
    state = beginGesture(state, config, { pointerId: 5, startX: 100, nowMs: 11000 });
    assert.throws(
      () => moveGesture(state, config, { pointerId: 6, x: 150, nowMs: 11010 }),
      TypeError,
    );
    assert.throws(() => endGesture(state, config, { pointerId: 9, nowMs: 11020 }), TypeError);
    assert.throws(() => beginGesture(state, config, { pointerId: 5, startX: 0, nowMs: 11030 }), TypeError);
  });
}

test("controller: fail-closed config validation", () => {
  assert.throws(() => createContinuousPhaseState({ sceneCount: 1 }), TypeError);
  assert.throws(() => createContinuousPhaseState({ sceneCount: Number.NaN }), TypeError);
  assert.throws(() => createContinuousPhaseState({ sceneCount: 4, motionPolicy: "warp" }), TypeError);
  assert.throws(() => createContinuousPhaseState({ sceneCount: 4, settleRatePerSecond: Number.POSITIVE_INFINITY }), TypeError);
});

test("controller: nearestScene clamps and rounds", () => {
  assert.equal(nearestScene(0.49, 7), 0);
  assert.equal(nearestScene(0.51, 7), 1);
  assert.equal(nearestScene(6.9, 7), 6);
  assert.equal(nearestScene(-1.2, 7), 0);
  assert.equal(nearestScene(9.7, 7), 6);
});
