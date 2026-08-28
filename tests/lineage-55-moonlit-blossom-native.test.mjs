import assert from "node:assert/strict";
import test from "node:test";

import {
  LINEAGE_55_STATES,
  LINEAGE_55_TIMELINE,
  LINEAGE_55_TIMING,
  LINEAGE_55_PANEL,
  LINEAGE_55_MEMORY_CARDS,
  LINEAGE_55_MEMORY_FLOATS,
  LINEAGE_55_ASSET_BASE,
} from "../lib/lineage-55-moonlit-blossom-data.ts";
import {
  advanceBlossomState,
  createInitialBlossomControllerState,
  jumpToBlossomState,
  planPetalBurst,
  rewindBlossomState,
  shouldBlossomWheelAdvance,
  toggleBlossomAuto,
} from "../lib/lineage-55-moonlit-blossom-controller.ts";

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

test("lineage 55 fixture contract pins staged states, copy, and timings", () => {
  assert.deepEqual(
    LINEAGE_55_STATES.map((entry) => entry.step),
    ["01 · SEED", "02 · FEELING", "03 · MOMENTS", "04 · BLOOM"],
  );
  assert.deepEqual(
    LINEAGE_55_STATES.map((entry) => entry.title),
    [
      "A feeling begins.",
      "It starts to grow.",
      "Memories gather.",
      "Love becomes visible.",
    ],
  );
  assert.deepEqual([...LINEAGE_55_TIMELINE], ["SEED", "FEELING", "MOMENTS", "BLOOM"]);
  assert.equal(LINEAGE_55_TIMING.autoIntervalMs, 2100);
  assert.equal(LINEAGE_55_TIMING.wheelThrottleMs, 700);
  assert.equal(LINEAGE_55_TIMING.bloomPetalCount, 36);
});

test("lineage 55 panel keeps displayed progress fixture values", () => {
  assert.equal(LINEAGE_55_PANEL.progressLabel, "127 / 150 MOMENTS");
  assert.equal(LINEAGE_55_PANEL.progressPercentLabel, "85%");
  assert.equal(LINEAGE_55_PANEL.progressPercentValue, 85);
});

test("lineage 55 memory cast jumps follow the source wiring", () => {
  assert.deepEqual(
    LINEAGE_55_MEMORY_CARDS.map((card) => card.jumpTo),
    [1, 2, 3],
  );
  assert.equal(LINEAGE_55_MEMORY_FLOATS.length, 3);
});

test("lineage 55 assets resolve under the canonical public base path", () => {
  assert.equal(LINEAGE_55_ASSET_BASE, "/old/reference/lineage-55-moonlit-blossom-v1/assets");
  for (const card of LINEAGE_55_MEMORY_CARDS) {
    assert.ok(card.image.startsWith(`${LINEAGE_55_ASSET_BASE}/portraits/`));
  }
});

test("lineage 55 asset requests activate only after verified materialization", async () => {
  const { LINEAGE_55_ASSETS_MATERIALIZED } = await import("../lib/lineage-55-moonlit-blossom-assets.ts");
  assert.equal(LINEAGE_55_ASSETS_MATERIALIZED, true);
});

test("blossom controller starts at SEED with auto off", () => {
  assert.deepEqual(createInitialBlossomControllerState(), { state: 0, auto: false });
});

test("blossom controller advances with wrap-around like the source modulo", () => {
  let state = createInitialBlossomControllerState();
  for (let i = 0; i < 4; i += 1) state = advanceBlossomState(state);
  assert.equal(state.state, 0);
  state = rewindBlossomState(state);
  assert.equal(state.state, 3);
});

test("blossom controller jump mirrors header pill and memory card targets", () => {
  const initial = createInitialBlossomControllerState();
  assert.equal(jumpToBlossomState(initial, 2).state, 2);
  assert.equal(jumpToBlossomState(initial, 3).state, 3);
  assert.equal(jumpToBlossomState(initial, 1).state, 1);
});

test("blossom controller toggles auto play without touching the stage index", () => {
  const initial = createInitialBlossomControllerState();
  const toggled = toggleBlossomAuto(initial);
  assert.equal(toggled.auto, true);
  assert.equal(toggled.state, initial.state);
  assert.equal(toggleBlossomAuto(toggled).auto, false);
});

test("blossom wheel throttle blocks rapid scrolls and releases after 700ms", () => {
  assert.equal(shouldBlossomWheelAdvance(null, 1000), true);
  assert.equal(shouldBlossomWheelAdvance(1000, 1200), false);
  assert.equal(shouldBlossomWheelAdvance(1000, 1700), true);
  assert.equal(shouldBlossomWheelAdvance(1000, 1000 + 699), false);
  assert.equal(shouldBlossomWheelAdvance(1000, 1000 + 700), true);
});

test("petal burst plans exactly 36 petals inside the source distance envelope", () => {
  const petals = planPetalBurst({ centerX: 400, centerY: 300, random: seededRandom(7) });
  assert.equal(petals.length, 36);
  for (const petal of petals) {
    assert.equal(petal.left, 400);
    assert.equal(petal.top, 300);
    const distance = Math.hypot(petal.dx, petal.dy);
    assert.ok(distance >= 90 && distance <= 380, `distance ${distance} out of range`);
    assert.ok(petal.delayMs >= 0 && petal.delayMs < 180);
  }
});

test("petal burst is deterministic under a seeded random source", () => {
  const a = planPetalBurst({ centerX: 10, centerY: 20, random: seededRandom(42) });
  const b = planPetalBurst({ centerX: 10, centerY: 20, random: seededRandom(42) });
  assert.deepEqual(a, b);
});
