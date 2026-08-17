import assert from "node:assert/strict";
import test from "node:test";
import {
  CLICK_THRESHOLD_PX,
  classifyGesture,
  frontmostHit,
  project,
  sortFarToNear,
} from "../lib/lineage-60/projection.ts";

const VP = { w: 800, h: 520, dpr: 2 };
const baseCam = { yaw: 0, pitch: 0, distance: 300, target: [0, 0, 0] };

test("project returns a positive depth and null behind the camera plane", () => {
  const front = project([0, 0, -40], baseCam, VP);
  assert.ok(front, "point in front of camera projects");
  assert.ok(front.depth > 1, "depth is positive");

  // push the point so far behind the camera that dz collapses
  const behind = project([0, 0, -5000], { ...baseCam, distance: 1 }, VP);
  assert.equal(behind, null, "point behind camera plane is culled");
});

test("depth convention: larger depth == farther from camera", () => {
  const near = project([0, 0, -40], baseCam, VP);
  const far = project([0, 0, 40], baseCam, VP);
  assert.ok(near && far);
  assert.ok(near.depth < far.depth, "nearer point has smaller depth");
});

test("sortFarToNear draws far (large depth) first", () => {
  const items = [
    { id: "near", proj: { sx: 0, sy: 0, scale: 1, depth: 100 } },
    { id: "far", proj: { sx: 0, sy: 0, scale: 1, depth: 900 } },
    { id: "mid", proj: { sx: 0, sy: 0, scale: 1, depth: 400 } },
  ];
  const sorted = sortFarToNear(items).map((it) => it.id);
  assert.deepEqual(sorted, ["far", "mid", "near"]);
});

test("controlled overlap: two on-axis points overlap on screen but differ in depth", () => {
  const A = [0, 0, 40]; // farther
  const B = [0, 0, -40]; // nearer
  const pA = project(A, baseCam, VP);
  const pB = project(B, baseCam, VP);
  assert.ok(pA && pB);
  assert.ok(Math.abs(pA.sx - pB.sx) < 1e-6, "identical screen x");
  assert.ok(Math.abs(pA.sy - pB.sy) < 1e-6, "identical screen y");
  assert.ok(pB.depth < pA.depth, "at yaw 0, B (smaller depth) is frontmost");

  // rotate 180° about Y: the frontmost item must swap
  const yawCam = { ...baseCam, yaw: Math.PI };
  const pA2 = project(A, yawCam, VP);
  const pB2 = project(B, yawCam, VP);
  assert.ok(pA2 && pB2);
  assert.ok(Math.abs(pA2.sx - pB2.sx) < 1e-6, "still overlapping after yaw");
  assert.ok(pA2.depth < pB2.depth, "after yaw π, A becomes frontmost");
});

test("frontmostHit chooses the NEAREST depth among overlapping 2D candidates (not nearest 2D)", () => {
  const near = { sx: 100, sy: 100, scale: 1, depth: 100 };
  const far = { sx: 102, sy: 100, scale: 1, depth: 500 };
  const hit = frontmostHit(
    [
      { item: "near", proj: near },
      { item: "far", proj: far },
    ],
    100,
    100,
    14,
    { w: 800, h: 600, dpr: 1 },
  );
  assert.equal(hit, "near", "depth authority wins over 2D proximity");
});

test("frontmostHit respects the hit radius and returns null outside it", () => {
  const only = { sx: 500, sy: 500, scale: 1, depth: 200 };
  const inside = frontmostHit([{ item: "x", proj: only }], 500, 500, 14, { w: 800, h: 600, dpr: 1 });
  assert.equal(inside, "x");
  const outside = frontmostHit([{ item: "x", proj: only }], 100, 100, 14, { w: 800, h: 600, dpr: 1 });
  assert.equal(outside, null);
});

test("classifyGesture authority: click vs rotate vs pinch vs cancel", () => {
  assert.equal(classifyGesture({ maxMove: 0, pinch: false, cancelled: false }), "click");
  assert.equal(classifyGesture({ maxMove: CLICK_THRESHOLD_PX + 1, pinch: false, cancelled: false }), "rotate");
  assert.equal(classifyGesture({ maxMove: 0, pinch: true, cancelled: false }), "pinch");
  assert.equal(classifyGesture({ maxMove: 0, pinch: false, cancelled: true }), "cancel");
  // cancel always wins, even if a pinch happened
  assert.equal(classifyGesture({ maxMove: 0, pinch: true, cancelled: true }), "cancel");
  // a large drag that also touched pinch still must NOT be a click
  assert.equal(classifyGesture({ maxMove: 0, pinch: true, cancelled: false }), "pinch");
});
