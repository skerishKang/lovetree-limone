import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalV4OrbitRotation,
  nearestEquivalentV4OrbitRotation,
  nearestV4OrbitIndex,
  snapV4OrbitRotation,
} from "../lib/v4-orbit-selection.ts";
import {
  isV4OrbitDragMovement,
  v4OrbitHeaderCount,
  v4OrbitMediaAuthority,
  v4OrbitRailItems,
  v4OrbitSelectedId,
  v4OrbitSelectedIndex,
} from "../lib/v4-orbit-product.ts";

const COUNT = 8;
const TAU = Math.PI * 2;

const MOMENTS = Array.from({ length: COUNT }, (_, index) => ({
  id: `a${index + 1}`,
  title: `Moment ${index + 1}`,
  videoId: ["dQw4w9WgXcQ", "ysz5S6PUM-U", "M7lc1UVf-VE", "aqz-KE-bpKQ", "ScMzIvxBSi4", "jNQXAC9IVRw", "aqz-KE-bpKQ", "dQw4w9WgXcQ"][index],
}));

test("V4 Orbit canonical selection is the single authority projected from rotation", () => {
  for (let index = 0; index < COUNT; index += 1) {
    const rotation = canonicalV4OrbitRotation(index, COUNT);
    assert.equal(v4OrbitSelectedIndex(rotation, COUNT), index);
    assert.equal(nearestV4OrbitIndex(rotation, COUNT), index);
  }
});

test("V4 Orbit rail marks exactly the canonical selected Moment and stays synced", () => {
  for (let selected = 0; selected < COUNT; selected += 1) {
    const items = v4OrbitRailItems(MOMENTS, selected);
    assert.equal(items.length, COUNT);
    const marked = items.filter((item) => item.selected);
    assert.equal(marked.length, 1, `exactly one rail item is selected for ${selected}`);
    assert.equal(marked[0].index, selected, `rail selection matches selected index ${selected}`);
    assert.equal(marked[0].id, v4OrbitSelectedId(MOMENTS, selected));
  }
});

test("V4 Orbit header count is 1-based and total reflects the moment count", () => {
  assert.deepEqual(v4OrbitHeaderCount(0, COUNT), { current: 1, total: COUNT });
  assert.deepEqual(v4OrbitHeaderCount(7, COUNT), { current: 8, total: COUNT });
  assert.deepEqual(v4OrbitHeaderCount(COUNT, COUNT), { current: 1, total: COUNT });
});

test("V4 Orbit discrete projections wrap negative, out-of-range, and fractional indices deterministically", () => {
  // Out-of-range positive wraps into [0, COUNT)
  assert.equal(v4OrbitSelectedId(MOMENTS, 17), "a2");
  assert.deepEqual(v4OrbitHeaderCount(17, COUNT), { current: 2, total: COUNT });
  const railPositive = v4OrbitRailItems(MOMENTS, 17);
  assert.equal(railPositive.filter((item) => item.selected).length, 1);
  assert.equal(railPositive.find((item) => item.selected)?.index, 1);

  // Negative index wraps into [0, COUNT)
  assert.equal(v4OrbitSelectedId(MOMENTS, -1), "a8");
  assert.deepEqual(v4OrbitHeaderCount(-1, COUNT), { current: 8, total: COUNT });
  const railNegative = v4OrbitRailItems(MOMENTS, -1);
  assert.equal(railNegative.filter((item) => item.selected).length, 1);
  assert.equal(railNegative.find((item) => item.selected)?.index, 7);

  // Multiple negative turns wrap deterministically
  assert.equal(v4OrbitSelectedId(MOMENTS, -9), "a8");
  assert.deepEqual(v4OrbitHeaderCount(-9, COUNT), { current: 8, total: COUNT });

  // Fractional adapter truncation semantics are preserved (Math.trunc before modulo wrap)
  assert.equal(v4OrbitSelectedId(MOMENTS, 2.9), "a3");
  assert.deepEqual(v4OrbitHeaderCount(2.9, COUNT), { current: 3, total: COUNT });
  assert.equal(v4OrbitSelectedId(MOMENTS, -0.9), "a1");
  assert.deepEqual(v4OrbitHeaderCount(-0.9, COUNT), { current: 1, total: COUNT });
  assert.equal(v4OrbitSelectedId(MOMENTS, -1.9), "a8");
  assert.deepEqual(v4OrbitHeaderCount(-1.9, COUNT), { current: 8, total: COUNT });
});

test("V4 Orbit selection projections fail closed for empty collections or invalid counts", () => {
  assert.throws(() => v4OrbitSelectedId([], 0), RangeError);
  assert.throws(() => v4OrbitRailItems([], 0), RangeError);
  assert.throws(() => v4OrbitHeaderCount(0, 0), RangeError);
  assert.throws(() => v4OrbitHeaderCount(0, -1), RangeError);
  assert.throws(() => v4OrbitHeaderCount(0, 3.5), RangeError);
  assert.throws(() => v4OrbitHeaderCount(Number.NaN, COUNT), RangeError);
  assert.throws(() => v4OrbitHeaderCount(Number.POSITIVE_INFINITY, COUNT), RangeError);
});

test("V4 Orbit media authority is fail-closed: selected-only and never carries audio", () => {
  const withVideo = v4OrbitMediaAuthority({ id: "a1", videoId: "dQw4w9WgXcQ" });
  assert.equal(withVideo.playable, true);
  assert.equal(withVideo.hasAudio, false, "no product moment type carries audio authority");

  const photo = v4OrbitMediaAuthority({ id: "p1" });
  assert.equal(photo.playable, false, "a future photo moment without a videoId is non-playable");
  assert.equal(photo.hasAudio, false);

  const empty = v4OrbitMediaAuthority({ id: "e1", videoId: "" });
  assert.equal(empty.playable, false);
});

test("V4 Orbit tap-vs-drag slop suppresses micro-movements as taps", () => {
  assert.equal(isV4OrbitDragMovement(0, 0), false);
  assert.equal(isV4OrbitDragMovement(5, 2), false);
  assert.equal(isV4OrbitDragMovement(9, 0), true);
  assert.equal(isV4OrbitDragMovement(0, 9), true);
});

test("V4 Orbit drag release snaps to the nearest canonical Moment", () => {
  const factor = 0.0045; // same as the component's ORBIT_DRAG_FACTOR
  const base = canonicalV4OrbitRotation(2, COUNT);
  const step = TAU / COUNT;

  const snapRight = snapV4OrbitRotation(base + step * 0.49, COUNT);
  assert.equal(snapRight.index, 2, "small right drag keeps index 2");
  const snapLeft = snapV4OrbitRotation(base - step * 0.51, COUNT);
  assert.equal(snapLeft.index, 3, "past-half left drag advances to index 3");

  // simulate a real drag of ~180px to the right (one card step) and release
  const dragged = base + 180 * factor;
  const released = snapV4OrbitRotation(dragged, COUNT);
  assert.ok(Math.abs(released.rotation - canonicalV4OrbitRotation(released.index, COUNT)) < 1e-9);
  assert.ok(released.index !== 2 || Math.abs(dragged - base) < step / 2);
});

test("V4 Orbit snap never jumps by a full revolution", () => {
  for (let index = 0; index < COUNT; index += 1) {
    const canonical = canonicalV4OrbitRotation(index, COUNT);
    const rotated = canonical + TAU * 3 + 0.2;
    const snapped = snapV4OrbitRotation(rotated, COUNT);
    assert.equal(snapped.index, index);
    assert.ok(Math.abs(snapped.rotation - rotated) < Math.PI, `index ${index} stays on the same turn`);
    assert.ok(Math.abs(snapped.rotation - nearestEquivalentV4OrbitRotation(rotated, index, COUNT)) < 1e-9);
  }
});

test("V4 Orbit selection-through-turns reconciles to the nearest equivalent rotation", () => {
  const from = canonicalV4OrbitRotation(0, COUNT) + TAU * 2;
  const reconciled = nearestEquivalentV4OrbitRotation(from, 4, COUNT);
  assert.equal(v4OrbitSelectedIndex(reconciled, COUNT), 4);
  assert.ok(Math.abs(reconciled - from) < Math.PI, "no full-turn jump when changing selection");
});
