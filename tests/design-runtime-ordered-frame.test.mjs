import assert from "node:assert/strict";
import test from "node:test";
import {
  orderedFrameIndex,
  nextFrame,
  previousFrame,
  stepFrame,
  directionFromDelta,
  selectedFrame,
} from "../lib/design-runtime/ordered-frame.ts";

/* ------------------------------------------------------------------ */
/*  orderedFrameIndex                                                  */
/* ------------------------------------------------------------------ */

test("orderedFrameIndex — zero index stays zero", () => {
  assert.equal(orderedFrameIndex(0, 4), 0);
});

test("orderedFrameIndex — in-range index passes through", () => {
  assert.equal(orderedFrameIndex(2, 4), 2);
  assert.equal(orderedFrameIndex(3, 4), 3);
});

test("orderedFrameIndex — negative index wraps", () => {
  assert.equal(orderedFrameIndex(-1, 4), 3);
  assert.equal(orderedFrameIndex(-4, 4), 0);
  assert.equal(orderedFrameIndex(-5, 4), 3);
});

test("orderedFrameIndex — out-of-range index wraps", () => {
  assert.equal(orderedFrameIndex(4, 4), 0);
  assert.equal(orderedFrameIndex(7, 4), 3);
  assert.equal(orderedFrameIndex(8, 4), 0);
});

test("orderedFrameIndex — large positive index wraps", () => {
  assert.equal(orderedFrameIndex(100, 4), 0);
  assert.equal(orderedFrameIndex(103, 4), 3);
});

test("orderedFrameIndex — fail closed on non-positive count", () => {
  assert.throws(() => orderedFrameIndex(0, 0), /positive integer/);
  assert.throws(() => orderedFrameIndex(0, -1), /positive integer/);
});

test("orderedFrameIndex — fail closed on non-finite index", () => {
  assert.throws(() => orderedFrameIndex(NaN, 4), /finite/);
  assert.throws(() => orderedFrameIndex(Infinity, 4), /finite/);
});

test("orderedFrameIndex — fractional index rounds to nearest integer", () => {
  assert.equal(orderedFrameIndex(0.4, 4), 0);
  assert.equal(orderedFrameIndex(0.6, 4), 1);
});

/* ------------------------------------------------------------------ */
/*  nextFrame / previousFrame                                          */
/* ------------------------------------------------------------------ */

test("nextFrame — advances by one, wraps at end", () => {
  assert.equal(nextFrame(0, 4), 1);
  assert.equal(nextFrame(3, 4), 0);
});

test("previousFrame — retreats by one, wraps at start", () => {
  assert.equal(previousFrame(0, 4), 3);
  assert.equal(previousFrame(1, 4), 0);
});

test("nextFrame / previousFrame — round-trip preserves identity", () => {
  for (let i = 0; i < 4; i++) {
    const next = nextFrame(i, 4);
    const back = previousFrame(next, 4);
    assert.equal(back, i);
  }
});

/* ------------------------------------------------------------------ */
/*  stepFrame                                                          */
/* ------------------------------------------------------------------ */

test("stepFrame — zero delta is identity", () => {
  assert.equal(stepFrame(2, 0, 4), 2);
});

test("stepFrame — positive delta advances", () => {
  assert.equal(stepFrame(0, 2, 4), 2);
  assert.equal(stepFrame(3, 2, 4), 1); // wrap: 5→1
});

test("stepFrame — negative delta retreats", () => {
  assert.equal(stepFrame(2, -2, 4), 0);
  assert.equal(stepFrame(0, -2, 4), 2); // wrap: -2→2
});

test("stepFrame — large delta wraps multiple times", () => {
  assert.equal(stepFrame(0, 13, 4), 1); // 13 % 4 = 1
  assert.equal(stepFrame(0, -13, 4), 3); // -13 % 4 wraps to 3
});

/* ------------------------------------------------------------------ */
/*  directionFromDelta                                                 */
/* ------------------------------------------------------------------ */

test("directionFromDelta — zero delta yields no direction", () => {
  assert.equal(directionFromDelta(0), 0);
});

test("directionFromDelta — positive deltaX yields -1 (rightward)", () => {
  assert.equal(directionFromDelta(10), -1);
  assert.equal(directionFromDelta(100), -1);
});

test("directionFromDelta — negative deltaX yields +1 (leftward)", () => {
  assert.equal(directionFromDelta(-10), 1);
  assert.equal(directionFromDelta(-100), 1);
});

test("directionFromDelta — threshold suppresses sub-threshold deltas", () => {
  assert.equal(directionFromDelta(9, 10), 0);
  assert.equal(directionFromDelta(-9, 10), 0);
});

test("directionFromDelta — threshold passes exact-boundary deltas", () => {
  assert.equal(directionFromDelta(10, 10), -1);
  assert.equal(directionFromDelta(-10, 10), 1);
});

test("directionFromDelta — non-finite delta yields no direction", () => {
  assert.equal(directionFromDelta(NaN), 0);
  assert.equal(directionFromDelta(Infinity), 0);
  assert.equal(directionFromDelta(-Infinity), 0);
});

/* ------------------------------------------------------------------ */
/*  selectedFrame                                                       */
/* ------------------------------------------------------------------ */

test("selectedFrame — picks item at wrapped index", () => {
  const frames = ["a", "b", "c", "d"];
  assert.equal(selectedFrame(frames, 0), "a");
  assert.equal(selectedFrame(frames, 3), "d");
  assert.equal(selectedFrame(frames, 4), "a"); // wrap
  assert.equal(selectedFrame(frames, -1), "d"); // wrap
});

test("selectedFrame — undefined for empty collection", () => {
  assert.equal(selectedFrame([], 0), undefined);
});

test("selectedFrame — never mutates input collection", () => {
  const frames = Object.freeze(["x", "y", "z"]);
  assert.equal(selectedFrame(frames, 1), "y");
});

/* ------------------------------------------------------------------ */
/*  Crystal- and VideoFigure-specific regression pins                  */
/* ------------------------------------------------------------------ */

test("Crystal compatible: 4-angle wrap + angleStepFromDelta equivalence", () => {
  // Crystal rotateAngle(direction: 1 | -1) with (index + direction + N) % N
  // is equivalent to nextFrame / previousFrame with count=4.
  for (let i = 0; i < 4; i++) {
    assert.equal(nextFrame(i, 4), (i + 1) % 4);
    assert.equal(previousFrame(i, 4), (i + 3) % 4);
  }
  // directionFromDelta with threshold 48 matches CRYSTAL_ANGLE_STEP_PX
  assert.equal(directionFromDelta(47, 48), 0);
  assert.equal(directionFromDelta(48, 48), -1);
  assert.equal(directionFromDelta(-48, 48), 1);
});

test("VideoFigure compatible: 8-angle wrap + stepDelta equivalence", () => {
  // VideoFigure step-angle with wrap(state.angleIndex + delta, 8)
  // is equivalent to stepFrame with count=8.
  assert.equal(stepFrame(0, 7, 8), 7);
  assert.equal(stepFrame(0, 8, 8), 0);
  assert.equal(stepFrame(3, -5, 8), 6); // (3-5) = -2 % 8 = 6

  // VideoFigure angleStepFromHorizontalDelta(deltaX, 24) is equivalent
  // to directionFromDelta(deltaX, 24) — exact same semantics.
  for (const d of [-50, -24, -10, 0, 10, 24, 50]) {
    const expected = d > 0 ? -1 : d < 0 ? 1 : 0;
    assert.equal(directionFromDelta(d, 0), expected);
  }
});