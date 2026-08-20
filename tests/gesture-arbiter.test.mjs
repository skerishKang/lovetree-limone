import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialGestureArbiterState,
  reduceGesture,
  resolveGestureArbiterConfig,
  validateGestureArbiterConfig,
  DEFAULT_GESTURE_CONFIG,
} from "../lib/experience-runtime/gesture-arbiter.ts";

/* ------------------------------------------------------------------ */
/*  Config Validation                                                 */
/* ------------------------------------------------------------------ */

test("config — default config is valid and frozen", () => {
  assert.equal(DEFAULT_GESTURE_CONFIG.dragThresholdPx, 8);
  assert.equal(DEFAULT_GESTURE_CONFIG.longPressMs, 500);
  assert.equal(DEFAULT_GESTURE_CONFIG.doubleClickWindowMs, 300);
  assert.equal(DEFAULT_GESTURE_CONFIG.doubleClickDistancePx, 24);
  assert.equal(DEFAULT_GESTURE_CONFIG.primaryButton, 0);
  assert.equal(DEFAULT_GESTURE_CONFIG.multiPointerPolicy, "ignore-secondary");
  assert.equal(DEFAULT_GESTURE_CONFIG.wheelPolicy, "own");
  assert.equal(DEFAULT_GESTURE_CONFIG.enableLongPress, true);
  assert.equal(DEFAULT_GESTURE_CONFIG.enableDoubleClick, true);
  assert.equal(DEFAULT_GESTURE_CONFIG.requestCaptureOnDrag, true);
});

test("config — resolveGestureArbiterConfig merges custom options", () => {
  const resolved = resolveGestureArbiterConfig({
    dragThresholdPx: 16,
    longPressMs: 750,
    multiPointerPolicy: "cancel-active",
  });
  assert.equal(resolved.dragThresholdPx, 16);
  assert.equal(resolved.longPressMs, 750);
  assert.equal(resolved.multiPointerPolicy, "cancel-active");
  assert.equal(resolved.doubleClickWindowMs, 300); // defaulted
});

test("config — fail fast on negative or invalid numbers", () => {
  assert.throws(() => validateGestureArbiterConfig({ dragThresholdPx: -1 }), RangeError);
  assert.throws(() => validateGestureArbiterConfig({ longPressMs: -100 }), RangeError);
  assert.throws(() => validateGestureArbiterConfig({ doubleClickWindowMs: NaN }), RangeError);
  assert.throws(() => validateGestureArbiterConfig({ doubleClickDistancePx: Infinity }), RangeError);
  assert.throws(() => validateGestureArbiterConfig({ primaryButton: -1 }), RangeError);
  assert.throws(() => validateGestureArbiterConfig({ primaryButton: 1.5 }), RangeError);
  assert.throws(() => validateGestureArbiterConfig({ multiPointerPolicy: "unknown" }), TypeError);
  assert.throws(() => validateGestureArbiterConfig({ wheelPolicy: "invalid" }), TypeError);
  assert.throws(() => validateGestureArbiterConfig(null), TypeError);
});

/* ------------------------------------------------------------------ */
/*  Initial State & Reset Invariant                                   */
/* ------------------------------------------------------------------ */

test("state — initial state is clean IDLE", () => {
  const state = createInitialGestureArbiterState();
  assert.equal(state.phase, "IDLE");
  assert.equal(state.activePointer, null);
  assert.equal(state.pendingClick, null);
  assert.equal(state.lastTimestamp, 0);
});

test("state — RESET from IDLE returns clean state with no lingering side-effects", () => {
  const state = createInitialGestureArbiterState();
  const res = reduceGesture(state, { type: "RESET", timestamp: 100 });
  assert.deepEqual(res.state, createInitialGestureArbiterState());
  assert.deepEqual(res.intents, []);
  assert.deepEqual(res.effects, [{ type: "CANCEL_DEADLINE", deadlineType: "ALL" }]);
});

test("state — RESET from DRAG_ACTIVE emits DRAG_CANCEL, releases capture, and cleans state", () => {
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 10,
    y: 10,
    timestamp: 100,
  });
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 30,
    y: 10,
    timestamp: 150,
  });
  assert.equal(res.state.phase, "DRAG_ACTIVE");

  const resetRes = reduceGesture(res.state, { type: "RESET", timestamp: 200 });
  assert.deepEqual(resetRes.state, createInitialGestureArbiterState());
  assert.equal(resetRes.intents.length, 1);
  assert.equal(resetRes.intents[0].type, "DRAG_CANCEL");
  assert.equal(resetRes.intents[0].reason, "reset");
  assert.ok(resetRes.effects.some((e) => e.type === "RELEASE_POINTER_CAPTURE" && e.pointerId === 1));
});

/* ------------------------------------------------------------------ */
/*  Click vs Drag Arbitration & Monotonicity                          */
/* ------------------------------------------------------------------ */

test("click vs drag — tap within threshold commits CLICK when double-click disabled", () => {
  const config = { enableDoubleClick: false, dragThresholdPx: 8 };
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    x: 50,
    y: 50,
    timestamp: 100,
  }, config);

  assert.equal(res.state.phase, "PRESS_PENDING");
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "PRESS_START");

  // Minor sub-threshold movement
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 53,
    y: 54, // distance = 5px < 8px
    timestamp: 120,
  }, config);
  assert.equal(res.state.phase, "PRESS_PENDING");
  assert.equal(res.intents.length, 0);

  // Pointer up
  res = reduceGesture(res.state, {
    type: "POINTER_UP",
    pointerId: 1,
    x: 53,
    y: 54,
    timestamp: 150,
  }, config);

  assert.equal(res.state.phase, "IDLE");
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "CLICK");
  assert.equal(res.intents[0].pointerId, 1);
  assert.equal(res.intents[0].count, 1);
});

test("click vs drag — exact threshold crossing transitions to DRAG_ACTIVE monotonically", () => {
  const config = { dragThresholdPx: 10, enableDoubleClick: false };
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 0,
    y: 0,
    timestamp: 100,
  }, config);

  // Sub-threshold boundary: 9.999px
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 9.999,
    y: 0,
    timestamp: 110,
  }, config);
  assert.equal(res.state.phase, "PRESS_PENDING");
  assert.equal(res.intents.length, 0);

  // Exact threshold boundary: 10.0px -> DRAG_START
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 10,
    y: 0,
    timestamp: 120,
  }, config);
  assert.equal(res.state.phase, "DRAG_ACTIVE");
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "DRAG_START");
  assert.equal(res.intents[0].deltaX, 10);
  assert.ok(res.effects.some((e) => e.type === "REQUEST_POINTER_CAPTURE" && e.pointerId === 1));

  // DRAG_MOVE
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 35,
    y: 0,
    timestamp: 130,
  }, config);
  assert.equal(res.state.phase, "DRAG_ACTIVE");
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "DRAG_MOVE");
  assert.equal(res.intents[0].deltaX, 25);
  assert.equal(res.intents[0].totalDeltaX, 35);

  // Monotonicity test: pointer moves back to start (0, 0). DRAG must NOT revert to click!
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 0,
    y: 0,
    timestamp: 140,
  }, config);
  assert.equal(res.state.phase, "DRAG_ACTIVE");
  assert.equal(res.intents[0].type, "DRAG_MOVE");
  assert.equal(res.intents[0].totalDeltaX, 0);

  // Pointer up -> DRAG_END (never CLICK)
  res = reduceGesture(res.state, {
    type: "POINTER_UP",
    pointerId: 1,
    x: 0,
    y: 0,
    timestamp: 150,
  }, config);
  assert.equal(res.state.phase, "IDLE");
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "DRAG_END");
  assert.equal(res.intents.some((i) => i.type === "CLICK"), false);
  assert.ok(res.effects.some((e) => e.type === "RELEASE_POINTER_CAPTURE" && e.pointerId === 1));
});

test("click vs drag — 2D Euclidean distance properly calculates diagonal drag", () => {
  const config = { dragThresholdPx: 10 };
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 0,
    y: 0,
    timestamp: 100,
  }, config);

  // Diagonal movement (6, 7): dist = sqrt(36 + 49) = sqrt(85) ≈ 9.22 < 10 -> PRESS_PENDING
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 6,
    y: 7,
    timestamp: 110,
  }, config);
  assert.equal(res.state.phase, "PRESS_PENDING");

  // Diagonal movement (6, 8): dist = sqrt(36 + 64) = 10 -> DRAG_ACTIVE
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 6,
    y: 8,
    timestamp: 120,
  }, config);
  assert.equal(res.state.phase, "DRAG_ACTIVE");
  assert.equal(res.intents[0].type, "DRAG_START");
});

/* ------------------------------------------------------------------ */
/*  Long Press Arbitration                                            */
/* ------------------------------------------------------------------ */

test("long press — holding stationary until duration satisfies commits LONG_PRESS", () => {
  const config = { longPressMs: 500, dragThresholdPx: 10 };
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 20,
    y: 20,
    timestamp: 1000,
  }, config);

  assert.equal(res.state.phase, "PRESS_PENDING");
  assert.ok(res.effects.some((e) => e.type === "SCHEDULE_DEADLINE" && e.deadlineType === "LONG_PRESS"));

  // TICK at 1499 (duration - 1) -> not satisfied
  res = reduceGesture(res.state, { type: "TICK", timestamp: 1499 }, config);
  assert.equal(res.state.phase, "PRESS_PENDING");
  assert.equal(res.intents.length, 0);

  // TICK at 1500 (duration exact) -> LONG_PRESS committed
  res = reduceGesture(res.state, { type: "TICK", timestamp: 1500 }, config);
  assert.equal(res.state.phase, "LONG_PRESS_COMMITTED");
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "LONG_PRESS");
  assert.equal(res.intents[0].durationMs, 500);
  assert.ok(res.effects.some((e) => e.type === "CANCEL_DEADLINE" && e.deadlineType === "LONG_PRESS"));

  // Subsequent pointer up emits no click
  res = reduceGesture(res.state, {
    type: "POINTER_UP",
    pointerId: 1,
    x: 20,
    y: 20,
    timestamp: 1600,
  }, config);
  assert.equal(res.state.phase, "IDLE");
  assert.equal(res.intents.length, 0); // No CLICK, no DOUBLE_CLICK
});

test("long press — drag before duration cancels long press deadline", () => {
  const config = { longPressMs: 500, dragThresholdPx: 10 };
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 0,
    y: 0,
    timestamp: 1000,
  }, config);

  // Drag threshold crossed at T=1200 (< 1500)
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 15,
    y: 0,
    timestamp: 1200,
  }, config);
  assert.equal(res.state.phase, "DRAG_ACTIVE");
  assert.ok(res.effects.some((e) => e.type === "CANCEL_DEADLINE" && e.deadlineType === "LONG_PRESS"));

  // Later TICK at T=1500 produces no long press
  res = reduceGesture(res.state, { type: "TICK", timestamp: 1500 }, config);
  assert.equal(res.state.phase, "DRAG_ACTIVE");
  assert.equal(res.intents.length, 0);
});

/* ------------------------------------------------------------------ */
/*  Double Click / Double Tap Arbitration                             */
/* ------------------------------------------------------------------ */

test("double click — two compatible taps within window commit DOUBLE_CLICK and consume single click", () => {
  const config = { doubleClickWindowMs: 300, doubleClickDistancePx: 20 };

  // First tap
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 100,
    y: 100,
    timestamp: 1000,
  }, config);
  res = reduceGesture(res.state, {
    type: "POINTER_UP",
    pointerId: 1,
    x: 100,
    y: 100,
    timestamp: 1050,
  }, config);

  assert.equal(res.state.phase, "CLICK_PENDING_SECOND");
  assert.equal(res.intents.length, 0); // No click emitted yet
  assert.ok(res.effects.some((e) => e.type === "SCHEDULE_DEADLINE" && e.deadlineType === "DOUBLE_CLICK_WINDOW"));

  // Second tap within window (at T=1200, deadline is 1350) and within distance (5px)
  res = reduceGesture(res.state, {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 103,
    y: 104,
    timestamp: 1200,
  }, config);
  assert.equal(res.state.phase, "PRESS_PENDING");
  assert.equal(res.state.activePointer?.isSecondPressOfPotentialDouble, true);
  assert.ok(res.effects.some((e) => e.type === "CANCEL_DEADLINE" && e.deadlineType === "DOUBLE_CLICK_WINDOW"));

  // Second pointer up -> DOUBLE_CLICK committed
  res = reduceGesture(res.state, {
    type: "POINTER_UP",
    pointerId: 1,
    x: 103,
    y: 104,
    timestamp: 1240,
  }, config);

  assert.equal(res.state.phase, "IDLE");
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "DOUBLE_CLICK");
  assert.equal(res.intents[0].count, 2);
  assert.equal(res.intents[0].x, 103);
});

test("double click — window expiration via TICK commits single CLICK", () => {
  const config = { doubleClickWindowMs: 300 };

  // First tap
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 50,
    y: 50,
    timestamp: 1000,
  }, config);
  res = reduceGesture(res.state, {
    type: "POINTER_UP",
    pointerId: 1,
    x: 50,
    y: 50,
    timestamp: 1050,
  }, config);

  assert.equal(res.state.phase, "CLICK_PENDING_SECOND");

  // TICK before expiration (T=1349, deadline is 1350)
  res = reduceGesture(res.state, { type: "TICK", timestamp: 1349 }, config);
  assert.equal(res.state.phase, "CLICK_PENDING_SECOND");
  assert.equal(res.intents.length, 0);

  // TICK at expiration (T=1350) -> commits single CLICK
  res = reduceGesture(res.state, { type: "TICK", timestamp: 1350 }, config);
  assert.equal(res.state.phase, "IDLE");
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "CLICK");
  assert.equal(res.intents[0].count, 1);
  assert.equal(res.intents[0].timestamp, 1050);
});

test("double click — distant second tap commits first click and starts fresh press", () => {
  const config = { doubleClickWindowMs: 300, doubleClickDistancePx: 20 };

  // First tap at (10, 10)
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 10,
    y: 10,
    timestamp: 1000,
  }, config);
  res = reduceGesture(res.state, {
    type: "POINTER_UP",
    pointerId: 1,
    x: 10,
    y: 10,
    timestamp: 1050,
  }, config);

  // Second press at (100, 100) (distance 127px > 20px)
  res = reduceGesture(res.state, {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 100,
    y: 100,
    timestamp: 1100,
  }, config);

  assert.equal(res.state.phase, "PRESS_PENDING");
  assert.equal(res.state.activePointer?.isSecondPressOfPotentialDouble, false);
  // Committed first click + started second press
  assert.ok(res.intents.some((i) => i.type === "CLICK" && i.x === 10));
  assert.ok(res.intents.some((i) => i.type === "PRESS_START" && i.x === 100));
});

test("double click — second press dragging commits first click and starts DRAG_START", () => {
  const config = { doubleClickWindowMs: 300, doubleClickDistancePx: 20, dragThresholdPx: 8 };

  // First tap
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 10,
    y: 10,
    timestamp: 1000,
  }, config);
  res = reduceGesture(res.state, {
    type: "POINTER_UP",
    pointerId: 1,
    x: 10,
    y: 10,
    timestamp: 1050,
  }, config);

  // Second press down at (12, 12)
  res = reduceGesture(res.state, {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 12,
    y: 12,
    timestamp: 1100,
  }, config);

  // Drag movement on second press
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 35,
    y: 12, // moved 23px > 8px
    timestamp: 1150,
  }, config);

  assert.equal(res.state.phase, "DRAG_ACTIVE");
  assert.ok(res.intents.some((i) => i.type === "CLICK" && i.x === 10));
  assert.ok(res.intents.some((i) => i.type === "DRAG_START" && i.startX === 12));
});

/* ------------------------------------------------------------------ */
/*  Pointer Cancel & Lost Pointer Capture                             */
/* ------------------------------------------------------------------ */

test("cancel — pointercancel in PRESS_PENDING emits CANCEL and returns to IDLE without click", () => {
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 20,
    y: 20,
    timestamp: 100,
  });
  assert.equal(res.state.phase, "PRESS_PENDING");

  res = reduceGesture(res.state, {
    type: "POINTER_CANCEL",
    pointerId: 1,
    timestamp: 150,
  });

  assert.equal(res.state.phase, "IDLE");
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "CANCEL");
  assert.equal(res.intents[0].reason, "pointer_cancel");
  assert.ok(res.effects.some((e) => e.type === "CANCEL_DEADLINE" && e.deadlineType === "ALL"));
});

test("cancel — pointercancel in DRAG_ACTIVE emits DRAG_CANCEL and releases capture", () => {
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 10,
    y: 10,
    timestamp: 100,
  });
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 50,
    y: 10,
    timestamp: 150,
  });
  assert.equal(res.state.phase, "DRAG_ACTIVE");

  res = reduceGesture(res.state, {
    type: "POINTER_CANCEL",
    pointerId: 1,
    timestamp: 200,
  });

  assert.equal(res.state.phase, "IDLE");
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "DRAG_CANCEL");
  assert.equal(res.intents[0].reason, "pointer_cancel");
  assert.ok(res.effects.some((e) => e.type === "RELEASE_POINTER_CAPTURE" && e.pointerId === 1));
});

test("cancel — lostpointercapture during DRAG_ACTIVE fails safe with DRAG_CANCEL", () => {
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 10,
    y: 10,
    timestamp: 100,
  });
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 40,
    y: 10,
    timestamp: 150,
  });
  assert.equal(res.state.phase, "DRAG_ACTIVE");

  res = reduceGesture(res.state, {
    type: "LOST_POINTER_CAPTURE",
    pointerId: 1,
    timestamp: 180,
  });

  assert.equal(res.state.phase, "IDLE");
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "DRAG_CANCEL");
  assert.equal(res.intents[0].reason, "lost_capture");
});

/* ------------------------------------------------------------------ */
/*  Multi-Pointer Arbitration Policy                                  */
/* ------------------------------------------------------------------ */

test("multi-pointer — ignore-secondary policy ignores second finger", () => {
  const config = { multiPointerPolicy: "ignore-secondary", enableDoubleClick: false };
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 10,
    y: 10,
    timestamp: 100,
  }, config);

  // Second pointer arrives
  res = reduceGesture(res.state, {
    type: "POINTER_DOWN",
    pointerId: 2,
    x: 50,
    y: 50,
    timestamp: 110,
  }, config);
  assert.equal(res.state.phase, "PRESS_PENDING");
  assert.equal(res.state.activePointer?.pointerId, 1);
  assert.equal(res.intents.length, 0);

  // Second pointer moves
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 2,
    x: 100,
    y: 100,
    timestamp: 120,
  }, config);
  assert.equal(res.state.phase, "PRESS_PENDING");
  assert.equal(res.state.activePointer?.pointerId, 1);

  // Primary pointer moves and crosses drag threshold
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 30,
    y: 10,
    timestamp: 130,
  }, config);
  assert.equal(res.state.phase, "DRAG_ACTIVE");
  assert.equal(res.intents[0].type, "DRAG_START");

  // Second pointer up (must not terminate primary drag)
  res = reduceGesture(res.state, {
    type: "POINTER_UP",
    pointerId: 2,
    x: 100,
    y: 100,
    timestamp: 140,
  }, config);
  assert.equal(res.state.phase, "DRAG_ACTIVE");

  // Primary pointer up terminates drag
  res = reduceGesture(res.state, {
    type: "POINTER_UP",
    pointerId: 1,
    x: 30,
    y: 10,
    timestamp: 150,
  }, config);
  assert.equal(res.state.phase, "IDLE");
  assert.equal(res.intents[0].type, "DRAG_END");
});

test("multi-pointer — cancel-active policy cancels active gesture on second pointer down", () => {
  const config = { multiPointerPolicy: "cancel-active" };
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 10,
    y: 10,
    timestamp: 100,
  }, config);

  res = reduceGesture(res.state, {
    type: "POINTER_DOWN",
    pointerId: 2,
    x: 50,
    y: 50,
    timestamp: 120,
  }, config);

  assert.equal(res.state.phase, "IDLE");
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "CANCEL");
  assert.equal(res.intents[0].reason, "multi_pointer");
});

/* ------------------------------------------------------------------ */
/*  Wheel Ownership & Handoff                                         */
/* ------------------------------------------------------------------ */

test("wheel — wheel policy own emits WHEEL_OWNED", () => {
  const state = createInitialGestureArbiterState();
  const res = reduceGesture(state, {
    type: "WHEEL",
    deltaX: 10,
    deltaY: -20,
    deltaMode: 0,
    x: 100,
    y: 100,
    timestamp: 500,
  }, { wheelPolicy: "own" });

  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "WHEEL_OWNED");
  assert.equal(res.intents[0].deltaX, 10);
  assert.equal(res.intents[0].deltaY, -20);
});

test("wheel — wheel policy handoff emits WHEEL_HANDOFF", () => {
  const state = createInitialGestureArbiterState();
  const res = reduceGesture(state, {
    type: "WHEEL",
    deltaX: 0,
    deltaY: 50,
    deltaMode: 0,
    x: 100,
    y: 100,
    timestamp: 500,
  }, { wheelPolicy: "handoff" });

  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "WHEEL_HANDOFF");
});

/* ------------------------------------------------------------------ */
/*  Keyboard Semantic Equivalents                                     */
/* ------------------------------------------------------------------ */

test("keyboard — ACTIVATE in IDLE emits KEY_ACTIVATE", () => {
  const state = createInitialGestureArbiterState();
  const res = reduceGesture(state, {
    type: "KEY_INTENT",
    intent: "ACTIVATE",
    timestamp: 200,
  });
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "KEY_ACTIVATE");
});

test("keyboard — CANCEL in DRAG_ACTIVE cancels drag and emits KEY_CANCEL", () => {
  let res = reduceGesture(createInitialGestureArbiterState(), {
    type: "POINTER_DOWN",
    pointerId: 1,
    x: 0,
    y: 0,
    timestamp: 100,
  });
  res = reduceGesture(res.state, {
    type: "POINTER_MOVE",
    pointerId: 1,
    x: 20,
    y: 0,
    timestamp: 120,
  });
  assert.equal(res.state.phase, "DRAG_ACTIVE");

  res = reduceGesture(res.state, {
    type: "KEY_INTENT",
    intent: "CANCEL",
    timestamp: 150,
  });

  assert.equal(res.state.phase, "IDLE");
  assert.ok(res.intents.some((i) => i.type === "DRAG_CANCEL" && i.reason === "key_cancel"));
  assert.ok(res.intents.some((i) => i.type === "KEY_CANCEL"));
  assert.ok(res.effects.some((e) => e.type === "RELEASE_POINTER_CAPTURE" && e.pointerId === 1));
});

test("keyboard — NAVIGATE_NEXT emits KEY_NAVIGATE with direction NEXT", () => {
  const state = createInitialGestureArbiterState();
  const res = reduceGesture(state, {
    type: "KEY_INTENT",
    intent: "NAVIGATE_NEXT",
    timestamp: 200,
  });
  assert.equal(res.intents.length, 1);
  assert.equal(res.intents[0].type, "KEY_NAVIGATE");
  assert.equal(res.intents[0].direction, "NEXT");
});

/* ------------------------------------------------------------------ */
/*  Deterministic Replay Contract                                     */
/* ------------------------------------------------------------------ */

test("replay — complex multi-event sequence reproduces bit-for-bit identical results", () => {
  const sequence = [
    { type: "POINTER_DOWN", pointerId: 1, x: 10, y: 10, timestamp: 100 },
    { type: "POINTER_MOVE", pointerId: 1, x: 15, y: 12, timestamp: 120 },
    { type: "POINTER_MOVE", pointerId: 1, x: 30, y: 12, timestamp: 140 },
    { type: "WHEEL", deltaX: 5, deltaY: 0, x: 30, y: 12, timestamp: 150 },
    { type: "POINTER_MOVE", pointerId: 1, x: 40, y: 20, timestamp: 160 },
    { type: "POINTER_UP", pointerId: 1, x: 40, y: 20, timestamp: 180 },
    { type: "POINTER_DOWN", pointerId: 1, x: 40, y: 20, timestamp: 200 },
    { type: "POINTER_UP", pointerId: 1, x: 40, y: 20, timestamp: 220 },
    { type: "TICK", timestamp: 550 },
  ];

  function runScript() {
    let current = createInitialGestureArbiterState();
    const allIntents = [];
    const allEffects = [];

    for (const evt of sequence) {
      const step = reduceGesture(current, evt);
      current = step.state;
      allIntents.push(...step.intents);
      allEffects.push(...step.effects);
    }
    return { finalState: current, allIntents, allEffects };
  }

  const run1 = runScript();
  const run2 = runScript();

  assert.deepEqual(run1, run2);
});
