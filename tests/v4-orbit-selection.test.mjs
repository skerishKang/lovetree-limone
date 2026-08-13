import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalV4OrbitRotation,
  nearestEquivalentV4OrbitRotation,
  nearestV4OrbitIndex,
  snapV4OrbitRotation,
  wrapV4OrbitIndex,
} from "../lib/v4-orbit-selection.ts";

const TAU = Math.PI * 2;

test("V4 Orbit canonical selection wraps indexes safely", () => {
  assert.equal(wrapV4OrbitIndex(0, 8), 0);
  assert.equal(wrapV4OrbitIndex(8, 8), 0);
  assert.equal(wrapV4OrbitIndex(-1, 8), 7);
  assert.equal(wrapV4OrbitIndex(17, 8), 1);
});

test("V4 Orbit canonical rotation puts the selected card on the front center", () => {
  for (let index = 0; index < 8; index += 1) {
    const rotation = canonicalV4OrbitRotation(index, 8);
    const cardAngle = (index / 8) * TAU + rotation;
    assert.ok(Math.abs(Math.cos(cardAngle)) < 1e-10, `index ${index} is horizontally centered`);
    assert.ok(Math.sin(cardAngle) > 0.999999999, `index ${index} remains on the front half`);
    assert.equal(nearestV4OrbitIndex(rotation, 8), index);
  }
});

test("V4 Orbit drag release snaps to the nearest canonical Moment", () => {
  const base = canonicalV4OrbitRotation(2, 8);
  const oneStep = TAU / 8;

  assert.equal(snapV4OrbitRotation(base + oneStep * 0.49, 8).index, 2);
  assert.equal(snapV4OrbitRotation(base + oneStep * 0.51, 8).index, 1);
  assert.equal(snapV4OrbitRotation(base - oneStep * 0.51, 8).index, 3);
});

test("V4 Orbit snapping keeps the nearest equivalent turn instead of jumping by a full revolution", () => {
  const canonical = canonicalV4OrbitRotation(3, 8);
  const current = canonical + TAU * 4 + 0.1;
  const equivalent = nearestEquivalentV4OrbitRotation(current, 3, 8);

  assert.ok(Math.abs(equivalent - (canonical + TAU * 4)) < 1e-10);
  assert.ok(Math.abs(equivalent - current) < Math.PI);
});

test("V4 Orbit selection math fails closed for invalid count or rotation", () => {
  assert.throws(() => wrapV4OrbitIndex(0, 0), /positive integer/);
  assert.throws(() => canonicalV4OrbitRotation(0, -1), /positive integer/);
  assert.throws(() => nearestV4OrbitIndex(Number.NaN, 8), /finite/);
  assert.throws(() => nearestEquivalentV4OrbitRotation(Number.POSITIVE_INFINITY, 0, 8), /finite/);
});
