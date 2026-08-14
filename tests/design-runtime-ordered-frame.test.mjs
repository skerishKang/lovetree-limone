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
/*  directionFromDelta — caller-declared sign convention                */
/* ------------------------------------------------------------------ */

const NEG = -1; // positiveDeltaDirection = -1 (Crystal / VideoFigure convention)
const POS = 1;  // positiveDeltaDirection = +1 (inverted convention)

test("directionFromDelta — zero delta yields no direction", () => {
  assert.equal(directionFromDelta(0, NEG), 0);
  assert.equal(directionFromDelta(0, POS), 0);
});

test("directionFromDelta — positive deltaX with NEG yields -1", () => {
  assert.equal(directionFromDelta(10, NEG), -1);
  assert.equal(directionFromDelta(100, NEG), -1);
});

test("directionFromDelta — positive deltaX with POS yields +1", () => {
  assert.equal(directionFromDelta(10, POS), 1);
  assert.equal(directionFromDelta(100, POS), 1);
});

test("directionFromDelta — negative deltaX with NEG yields +1", () => {
  assert.equal(directionFromDelta(-10, NEG), 1);
  assert.equal(directionFromDelta(-100, NEG), 1);
});

test("directionFromDelta — negative deltaX with POS yields -1", () => {
  assert.equal(directionFromDelta(-10, POS), -1);
  assert.equal(directionFromDelta(-100, POS), -1);
});

test("directionFromDelta — threshold suppresses sub-threshold deltas", () => {
  assert.equal(directionFromDelta(9, NEG, 10), 0);
  assert.equal(directionFromDelta(-9, NEG, 10), 0);
});

test("directionFromDelta — threshold passes exact-boundary deltas", () => {
  assert.equal(directionFromDelta(10, NEG, 10), -1);
  assert.equal(directionFromDelta(-10, NEG, 10), 1);
});

test("directionFromDelta — threshold = 0 is explicitly allowed", () => {
  assert.equal(directionFromDelta(5, NEG, 0), -1);
  assert.equal(directionFromDelta(-5, NEG, 0), 1);
});

test("directionFromDelta — fail closed on NaN deltaX", () => {
  assert.throws(() => directionFromDelta(NaN, NEG), /must be a finite/);
});

test("directionFromDelta — fail closed on Infinity deltaX", () => {
  assert.throws(() => directionFromDelta(Infinity, NEG), /must be a finite/);
  assert.throws(() => directionFromDelta(-Infinity, NEG), /must be a finite/);
});

test("directionFromDelta — fail closed on non-finite threshold", () => {
  assert.throws(() => directionFromDelta(10, NEG, NaN), /threshold must be/);
  assert.throws(() => directionFromDelta(10, NEG, Infinity), /threshold must be/);
});

test("directionFromDelta — fail closed on negative threshold", () => {
  assert.throws(() => directionFromDelta(10, NEG, -1), /threshold must be/);
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
/*  Crystal- and VideoFigure-specific compatibility pins                */
/* ------------------------------------------------------------------ */

test("Crystal compatible: 4-angle wrap with caller-defined direction", () => {
  // Crystal rotateAngle(direction: 1 | -1) with (index + direction + N) % N
  // is equivalent to nextFrame / previousFrame with count=4.
  for (let i = 0; i < 4; i++) {
    assert.equal(nextFrame(i, 4), (i + 1) % 4);
    assert.equal(previousFrame(i, 4), (i + 3) % 4);
  }
  // Crystal: stepDelta < 0 ? 1 : -1 → positiveDeltaDirection = -1
  // with CRYSTAL_ANGLE_STEP_PX = 48 threshold
  assert.equal(directionFromDelta(47, -1, 48), 0);
  assert.equal(directionFromDelta(48, -1, 48), -1);
  assert.equal(directionFromDelta(-47, -1, 48), 0);
  assert.equal(directionFromDelta(-48, -1, 48), 1);
});

test("VideoFigure compatible: 8-angle wrap with caller-defined direction", () => {
  // VideoFigure step-angle with wrap(state.angleIndex + delta, 8)
  // is equivalent to stepFrame with count=8.
  assert.equal(stepFrame(0, 7, 8), 7);
  assert.equal(stepFrame(0, 8, 8), 0);
  assert.equal(stepFrame(3, -5, 8), 6); // (3-5) = -2 % 8 = 6

  // VideoFigure: deltaX > 0 ? -1 : 1 → positiveDeltaDirection = -1
  // with threshold = 24
  assert.equal(directionFromDelta(23, -1, 24), 0);
  assert.equal(directionFromDelta(24, -1, 24), -1);
  assert.equal(directionFromDelta(-23, -1, 24), 0);
  assert.equal(directionFromDelta(-24, -1, 24), 1);
});