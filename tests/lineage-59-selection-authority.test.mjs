import assert from "node:assert/strict";
import test from "node:test";

import {
  createSelection,
  selectNext,
  selectPrevious,
  selectByIndex,
  hasNext,
  hasPrevious,
  isAtEnd,
} from "../lib/lineage-59/selection-authority.ts";

const MOMENTS = ["m1", "m2", "m3", "m4", "m5", "m6", "m7"];

test("selection-authority creates at index 0", () => {
  const s = createSelection("m1", MOMENTS);
  assert.equal(s.currentMomentId, "m1");
  assert.equal(s.pathIndex, 0);
});

test("selection-authority creates at non-zero index", () => {
  const s = createSelection("m4", MOMENTS);
  assert.equal(s.pathIndex, 3);
});

test("selection-authority handles unknown moment", () => {
  const s = createSelection("unknown", MOMENTS);
  assert.equal(s.pathIndex, 0);
});

test("selection-authority selectNext advances", () => {
  const s = createSelection("m1", MOMENTS);
  const next = selectNext(s);
  assert.equal(next.currentMomentId, "m2");
  assert.equal(next.pathIndex, 1);
});

test("selection-authority selectNext stops at end", () => {
  const s = createSelection("m7", MOMENTS);
  const next = selectNext(s);
  assert.equal(next.currentMomentId, "m7");
  assert.equal(next.pathIndex, 6);
});

test("selection-authority selectPrevious goes back", () => {
  const s = createSelection("m4", MOMENTS);
  const prev = selectPrevious(s);
  assert.equal(prev.currentMomentId, "m3");
  assert.equal(prev.pathIndex, 2);
});

test("selection-authority selectPrevious stops at beginning", () => {
  const s = createSelection("m1", MOMENTS);
  const prev = selectPrevious(s);
  assert.equal(prev.currentMomentId, "m1");
});

test("selection-authority selectByIndex", () => {
  const s = createSelection("m1", MOMENTS);
  const jumped = selectByIndex(s, 5);
  assert.equal(jumped.currentMomentId, "m6");
  assert.equal(jumped.pathIndex, 5);
});

test("selection-authority selectByIndex rejects out of bounds", () => {
  const s = createSelection("m1", MOMENTS);
  assert.equal(selectByIndex(s, -1).pathIndex, 0);
  assert.equal(selectByIndex(s, 99).pathIndex, 0);
});

test("selection-authority hasNext", () => {
  assert.equal(hasNext(createSelection("m1", MOMENTS)), true);
  assert.equal(hasNext(createSelection("m7", MOMENTS)), false);
});

test("selection-authority hasPrevious", () => {
  assert.equal(hasPrevious(createSelection("m1", MOMENTS)), false);
  assert.equal(hasPrevious(createSelection("m2", MOMENTS)), true);
});

test("selection-authority isAtEnd", () => {
  assert.equal(isAtEnd(createSelection("m1", MOMENTS)), false);
  assert.equal(isAtEnd(createSelection("m7", MOMENTS)), true);
});