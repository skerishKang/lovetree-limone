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
  createFlickTracker,
  trackFlick,
  flickDeltaX,
  curlProgressFromDelta,
  resolveDragCommit,
  resolvePointerCancel,
  isFlick,
  FLICK_VELOCITY_THRESHOLD,
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

test("page-physics flick tracker accumulates signed velocity", () => {
  let tracker = createFlickTracker(400, 0);
  tracker = trackFlick(tracker, 380, 10);   // -20px / 10ms = -2 px/ms
  tracker = trackFlick(tracker, 350, 20);   // -30px / 10ms = -3 px/ms
  assert.ok(tracker.velocity < -1.5, `expected strongly negative velocity, got ${tracker.velocity}`);
  assert.equal(flickDeltaX(tracker), -50);
  assert.ok(tracker.samples >= 2);
});

test("page-physics flick tracker keeps direction through smoothing", () => {
  let tracker = createFlickTracker(200, 0);
  tracker = trackFlick(tracker, 180, 5);
  tracker = trackFlick(tracker, 150, 12);
  tracker = trackFlick(tracker, 145, 15);
  assert.ok(tracker.velocity < 0, `velocity keeps the drag sign, got ${tracker.velocity}`);
});

test("page-physics isFlick honours the threshold", () => {
  assert.equal(isFlick(2, true), true);
  assert.equal(isFlick(0.5, true), false);
  assert.equal(isFlick(2, false), false);
  assert.equal(isFlick(FLICK_VELOCITY_THRESHOLD, true), false, "exactly at threshold is not a flick");
});

test("page-physics short fast flick commits below the progress threshold", () => {
  const velocity = -2.5;
  const deltaX = -40;
  const decision = resolveDragCommit({
    progress: 0.2,
    velocity,
    deltaX,
    commitThreshold: 0.4,
    flickEnabled: true,
  });
  assert.equal(decision.commit, true, "fast flick must commit");
  assert.equal(decision.reason, "flick");
  assert.equal(decision.direction, "forward");
});

test("page-physics slow drag over the same short distance cancels", () => {
  const velocity = -0.08;
  const deltaX = -40;
  const decision = resolveDragCommit({
    progress: 0.2,
    velocity,
    deltaX,
    commitThreshold: 0.4,
    flickEnabled: true,
  });
  assert.equal(decision.commit, false, "slow short drag must cancel");
  assert.equal(decision.reason, "cancel");
  assert.equal(decision.direction, null);
});

test("page-physics slow drag crossing the threshold commits by progress", () => {
  const decision = resolveDragCommit({
    progress: 0.6,
    velocity: 0.05,
    deltaX: -120,
    commitThreshold: 0.4,
    flickEnabled: true,
  });
  assert.equal(decision.commit, true);
  assert.equal(decision.reason, "threshold");
  assert.equal(decision.direction, "forward");
});

test("page-physics threshold commit is direction-aware", () => {
  const forward = resolveDragCommit({ progress: 0.6, velocity: 0.05, deltaX: -120, commitThreshold: 0.4, flickEnabled: true });
  assert.equal(forward.direction, "forward");
  const backward = resolveDragCommit({ progress: 0.6, velocity: 0.05, deltaX: 120, commitThreshold: 0.4, flickEnabled: true });
  assert.equal(backward.direction, "backward");
});

test("page-physics flick commit direction comes from velocity", () => {
  const forward = resolveDragCommit({ progress: 0.1, velocity: -2, deltaX: -20, commitThreshold: 0.4, flickEnabled: true });
  assert.equal(forward.commit, true);
  assert.equal(forward.direction, "forward");
  const backward = resolveDragCommit({ progress: 0.1, velocity: 2, deltaX: 20, commitThreshold: 0.4, flickEnabled: true });
  assert.equal(backward.commit, true);
  assert.equal(backward.direction, "backward");
});

test("page-physics pointer cancel never commits regardless of velocity", () => {
  const decision = resolvePointerCancel();
  assert.equal(decision.commit, false);
  assert.equal(decision.reason, "cancel");
  assert.equal(decision.direction, null);
});

test("page-physics curlProgressFromDelta maps signed travel", () => {
  assert.equal(curlProgressFromDelta(-500, 1000), 1);
  assert.equal(curlProgressFromDelta(-250, 1000), 0.5);
  assert.equal(curlProgressFromDelta(-100, 1000), 0.2);
  assert.equal(curlProgressFromDelta(0, 1000), 0);
  assert.equal(curlProgressFromDelta(-1000, 0), 0);
});