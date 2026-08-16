import assert from "node:assert/strict";
import test from "node:test";

import {
  createCurlState,
  updateCurlProgress,
  shouldCommit,
  completePageTurn,
  cancelPageTurn,
  startFastFlip,
  stopFastFlip,
  computeCurlTransform,
} from "../lib/lineage-59/page-physics.ts";

test("page-physics creates at rest", () => {
  const c = createCurlState();
  assert.equal(c.curlProgress, 0);
  assert.equal(c.isFlipping, false);
});

test("page-physics updateCurlProgress clamps range", () => {
  const c = updateCurlProgress(createCurlState(), -0.5);
  assert.equal(c.curlProgress, 0);
  const d = updateCurlProgress(createCurlState(), 1.5);
  assert.equal(d.curlProgress, 1);
});

test("page-physics shouldCommit at threshold", () => {
  const below = updateCurlProgress(createCurlState(), 0.3);
  assert.equal(shouldCommit(below), false);
  const at = updateCurlProgress(createCurlState(), 0.4);
  assert.equal(shouldCommit(at), true);
  const above = updateCurlProgress(createCurlState(), 0.6);
  assert.equal(shouldCommit(above), true);
});

test("page-physics completePageTurn sets to 1", () => {
  const c = completePageTurn(createCurlState());
  assert.equal(c.curlProgress, 1);
  assert.equal(c.isFlipping, false);
});

test("page-physics cancelPageTurn resets to 0", () => {
  const c = updateCurlProgress(createCurlState(), 0.7);
  const cancelled = cancelPageTurn(c);
  assert.equal(cancelled.curlProgress, 0);
});

test("page-physics startFastFlip sets direction", () => {
  const f = startFastFlip(createCurlState(), "forward");
  assert.equal(f.fastFlipActive, true);
  assert.equal(f.fastFlipDirection, "forward");
});

test("page-physics stopFastFlip clears", () => {
  const f = startFastFlip(createCurlState(), "forward");
  const stopped = stopFastFlip(f);
  assert.equal(stopped.fastFlipActive, false);
});

test("page-physics computeCurlTransform at 0", () => {
  const t = computeCurlTransform(0);
  assert.equal(t.frontRotation, 0);
  assert.equal(t.backRotation, 0);
  assert.equal(t.shadowOpacity, 0);
  assert.equal(t.nextPageReveal, 0);
});

test("page-physics computeCurlTransform at 0.5", () => {
  const t = computeCurlTransform(0.5);
  assert.equal(t.frontRotation, 90);
  assert.equal(t.backRotation, 0);
  assert.ok(Math.abs(t.shadowOpacity - 0.3) < 0.1);
  assert.equal(t.nextPageReveal, 0);
});

test("page-physics computeCurlTransform at 1", () => {
  const t = computeCurlTransform(1);
  assert.equal(t.frontRotation, 90);
  assert.equal(t.backRotation, 90);
  assert.ok(Math.abs(t.shadowOpacity) < 0.1);
  assert.equal(t.nextPageReveal, 1);
});