import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveOrderedFrameConfig,
  createInitialOrderedFrameState,
  reduceOrderedFrame,
} from "../lib/experience-runtime/ordered-frame-controller.ts";

/* ------------------------------------------------------------------ */
/* Independent oracle (does NOT reuse the production reducer)          */
/*                                                                     */
/* From-scratch re-implementation of the expected index arithmetic     */
/* using only primitive Math operations, including the autoplay /      */
/* manual-ownership gate and the drag-accumulator reset rule so the    */
/* model matches the production reducer exactly.                      */
/* ------------------------------------------------------------------ */

function oracleNorm(index, count, policy) {
  const rounded = Math.round(index);
  if (policy === "wrap") {
    return ((rounded % count) + count) % count;
  }
  return Math.min(Math.max(rounded, 0), count - 1);
}

function oracleRun(config, actions) {
  const count = config.frameIds.length;
  const policy = config.boundaryPolicy;
  const threshold = config.stepThreshold;
  const sign = config.positiveDeltaDirection;
  let index = oracleNorm(config.initialIndex, count, policy);
  let acc = 0;
  let autoplay = config.initialAutoplay;
  let manuallyOwned = config.initiallyManuallyOwned;
  for (const a of actions) {
    switch (a.type) {
      case "MANUAL_NEXT":
        index = oracleNorm(index + 1, count, policy);
        manuallyOwned = true;
        acc = 0;
        break;
      case "MANUAL_PREVIOUS":
        index = oracleNorm(index - 1, count, policy);
        manuallyOwned = true;
        acc = 0;
        break;
      case "DIRECT_SELECT":
        index = oracleNorm(a.index, count, policy);
        manuallyOwned = a.manual !== false;
        acc = 0;
        break;
      case "DIRECT_SELECT_BY_ID": {
        const i = config.frameIds.indexOf(a.frameId);
        if (i >= 0) index = i;
        manuallyOwned = a.manual !== false;
        acc = 0;
        break;
      }
      case "KEYBOARD":
        index = oracleNorm(index + (a.direction === "next" ? 1 : -1), count, policy);
        manuallyOwned = true;
        acc = 0;
        break;
      case "AUTOPLAY_TICK":
        // retains the drag accumulator (does NOT reset it)
        if (autoplay && !manuallyOwned) index = oracleNorm(index + 1, count, policy);
        break;
      case "MANUAL_DRAG": {
        acc += a.deltaX;
        const steps = Math.floor(Math.abs(acc) / threshold) * Math.sign(acc) * sign;
        index = oracleNorm(index + steps, count, policy);
        if (steps !== 0) manuallyOwned = true;
        acc -= steps * threshold;
        break;
      }
      case "DRAG_END":
        acc = 0;
        break;
      case "ANGLE_TO_FRAME":
        manuallyOwned = true;
        acc = 0;
        break;
      case "MANUAL_TAKEOVER":
        manuallyOwned = true;
        if (a.pausePlayback) autoplay = false;
        acc = 0;
        break;
      case "MANUAL_RELEASE":
        manuallyOwned = false;
        autoplay = config.resumePolicy === "stay-paused" ? false : autoplay;
        acc = 0;
        break;
      case "PAUSE":
        autoplay = false;
        acc = 0;
        break;
      case "RESUME":
        autoplay = true;
        manuallyOwned = false;
        acc = 0;
        break;
      case "RESET":
        index = oracleNorm(a.index ?? config.initialIndex, count, policy);
        autoplay = config.initialAutoplay;
        manuallyOwned = config.initiallyManuallyOwned;
        acc = 0;
        break;
      default:
        break;
    }
  }
  return index;
}

/* ------------------------------------------------------------------ */
/* Deterministic generator (seeded LCG — no Math.random in core)      */
/* ------------------------------------------------------------------ */

function makeLcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const ACTION_FACTORY = [
  () => ({ type: "MANUAL_NEXT" }),
  () => ({ type: "MANUAL_PREVIOUS" }),
  (r) => ({ type: "DIRECT_SELECT", index: Math.floor(r() * 8) - 2 }),
  (r) => ({ type: "KEYBOARD", direction: r() < 0.5 ? "next" : "previous" }),
  (r) => ({ type: "MANUAL_DRAG", deltaX: Math.floor(r() * 240) - 120 }),
  () => ({ type: "DRAG_END" }),
  () => ({ type: "AUTOPLAY_TICK" }),
  () => ({ type: "MANUAL_TAKEOVER" }),
  () => ({ type: "MANUAL_RELEASE" }),
  () => ({ type: "RESET" }),
];

function genSequence(rng, length) {
  const seq = [];
  for (let i = 0; i < length; i++) {
    const factory = ACTION_FACTORY[Math.floor(rng() * ACTION_FACTORY.length)];
    seq.push(factory(rng));
  }
  return seq;
}

/* ------------------------------------------------------------------ */
/* Property 1 — index always bounded                                  */
/* ------------------------------------------------------------------ */

test("property: index is always within [0, count) after any sequence", () => {
  const config = resolveOrderedFrameConfig({
    frameIds: ["a", "b", "c", "d", "e"],
    boundaryPolicy: "wrap",
    stepThreshold: 48,
    positiveDeltaDirection: 1,
  });
  const rng = makeLcg(0xc0ffee);
  for (let trial = 0; trial < 200; trial++) {
    const seq = genSequence(rng, 40);
    let state = createInitialOrderedFrameState(config);
    for (const action of seq) {
      state = reduceOrderedFrame(state, action, config);
      assert.ok(
        state.index >= 0 && state.index < config.count,
        `index ${state.index} out of bounds`,
      );
    }
  }
});

/* ------------------------------------------------------------------ */
/* Property 2 — clamp never escapes ends                              */
/* ------------------------------------------------------------------ */

test("property: clamp never escapes the ends", () => {
  const config = resolveOrderedFrameConfig({
    frameIds: ["a", "b", "c"],
    boundaryPolicy: "clamp",
    stepThreshold: 48,
    positiveDeltaDirection: 1,
  });
  const rng = makeLcg(0x1234);
  for (let trial = 0; trial < 200; trial++) {
    const seq = genSequence(rng, 40);
    let state = createInitialOrderedFrameState(config);
    for (const action of seq) {
      state = reduceOrderedFrame(state, action, config);
      assert.ok(state.index >= 0 && state.index <= 2, `clamp escaped: ${state.index}`);
    }
  }
});

/* ------------------------------------------------------------------ */
/* Property 3 — selected ID corresponds to index                      */
/* ------------------------------------------------------------------ */

test("property: selected frameId always corresponds to index", () => {
  const config = resolveOrderedFrameConfig({
    frameIds: ["a", "b", "c", "d"],
    boundaryPolicy: "wrap",
    stepThreshold: 48,
    positiveDeltaDirection: -1,
  });
  const rng = makeLcg(0xabcd);
  for (let trial = 0; trial < 200; trial++) {
    const seq = genSequence(rng, 30);
    let state = createInitialOrderedFrameState(config);
    for (const action of seq) {
      state = reduceOrderedFrame(state, action, config);
      assert.equal(state.frameId, config.frameIds[state.index]);
    }
  }
});

/* ------------------------------------------------------------------ */
/* Property 4 — independent oracle agreement (cumulative)             */
/* ------------------------------------------------------------------ */

test("property: production index matches independent oracle", () => {
  const config = resolveOrderedFrameConfig({
    frameIds: ["a", "b", "c", "d", "e", "f"],
    boundaryPolicy: "wrap",
    stepThreshold: 48,
    positiveDeltaDirection: 1,
    initialIndex: 2,
  });
  const rng = makeLcg(0xbeef);
  for (let trial = 0; trial < 300; trial++) {
    const seq = genSequence(rng, 50);
    let state = createInitialOrderedFrameState(config);
    for (const action of seq) {
      state = reduceOrderedFrame(state, action, config);
    }
    const expected = oracleRun(config, seq);
    assert.equal(state.index, expected, `trial ${trial}: index mismatch`);
  }
});

/* ------------------------------------------------------------------ */
/* Property 5 — deterministic replay (same seq => same final state)   */
/* ------------------------------------------------------------------ */

test("property: same initial state + same sequence => identical final state", () => {
  const config = resolveOrderedFrameConfig({
    frameIds: ["a", "b", "c", "d"],
    boundaryPolicy: "wrap",
    stepThreshold: 48,
    positiveDeltaDirection: -1,
    initialAutoplay: true,
    initiallyManuallyOwned: true,
  });
  const rng = makeLcg(0x5151);
  for (let trial = 0; trial < 100; trial++) {
    const seq = genSequence(rng, 60);
    const runOnce = () => {
      let s = createInitialOrderedFrameState(config);
      for (const a of seq) s = reduceOrderedFrame(s, a, config);
      return s;
    };
    const r1 = runOnce();
    const r2 = runOnce();
    const r3 = runOnce();
    assert.deepEqual(r1, r2, `trial ${trial}: replay mismatch r1 vs r2`);
    assert.deepEqual(r2, r3, `trial ${trial}: replay mismatch r2 vs r3`);
  }
});

/* ------------------------------------------------------------------ */
/* Property 6 — invalid input does not corrupt state                  */
/* ------------------------------------------------------------------ */

test("property: invalid action leaves prior state intact", () => {
  const config = resolveOrderedFrameConfig({
    frameIds: ["a", "b", "c", "d"],
    boundaryPolicy: "wrap",
    stepThreshold: 48,
    positiveDeltaDirection: 1,
  });
  const rng = makeLcg(0x9999);
  for (let trial = 0; trial < 100; trial++) {
    const seq = genSequence(rng, 20);
    let state = createInitialOrderedFrameState(config);
    for (const a of seq) state = reduceOrderedFrame(state, a, config);
    const before = JSON.parse(JSON.stringify(state));
    const badActions = [
      { type: "BOGUS" },
      { type: "DIRECT_SELECT", index: NaN },
      { type: "DIRECT_SELECT_BY_ID", frameId: "nope" },
      { type: "MANUAL_DRAG", deltaX: Infinity },
      null,
      { foo: 1 },
    ];
    for (const bad of badActions) {
      assert.throws(() => reduceOrderedFrame(state, bad, config));
      assert.deepEqual(state, before, "state corrupted by invalid action");
    }
  }
});

/* ------------------------------------------------------------------ */
/* Property 7 — purity: reducer never mutates the resolved config     */
/* ------------------------------------------------------------------ */

test("property: reducer never mutates the resolved config", () => {
  const config = resolveOrderedFrameConfig({
    frameIds: ["a", "b", "c", "d"],
    angles: [0, 90, 180, 270],
    boundaryPolicy: "wrap",
    stepThreshold: 48,
    positiveDeltaDirection: 1,
  });
  const configRef = config;
  const idToIndexBefore = JSON.stringify([...config.idToIndex.entries()]);
  const frameIdsBefore = JSON.stringify([...config.frameIds]);
  const anglesBefore = JSON.stringify([...config.angles]);
  const rng = makeLcg(0x7777);
  let state = createInitialOrderedFrameState(config);
  for (let i = 0; i < 100; i++) {
    const factory = ACTION_FACTORY[Math.floor(rng() * ACTION_FACTORY.length)];
    state = reduceOrderedFrame(state, factory(rng), config);
  }
  // Reference identity must be preserved (reducer must not replace config).
  assert.equal(config, configRef, "config reference was replaced");
  // Mutable-ish collections must be unchanged (config is frozen, but prove it).
  assert.equal(
    JSON.stringify([...config.idToIndex.entries()]),
    idToIndexBefore,
    "idToIndex mutated",
  );
  assert.equal(
    JSON.stringify([...config.frameIds]),
    frameIdsBefore,
    "frameIds mutated",
  );
  assert.equal(
    JSON.stringify([...config.angles]),
    anglesBefore,
    "angles mutated",
  );
});
