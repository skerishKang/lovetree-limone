import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialGestureArbiterState,
  reduceGesture,
  DEFAULT_GESTURE_CONFIG,
} from "../lib/experience-runtime/gesture-arbiter.ts";

/* ------------------------------------------------------------------ */
/*  Seeded Deterministic PRNG (Mulberry32)                            */
/* ------------------------------------------------------------------ */

function createPRNG(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomChoice(prng, list) {
  return list[Math.floor(prng() * list.length)];
}

function randomInt(prng, min, max) {
  return Math.floor(prng() * (max - min + 1)) + min;
}

function randomFloat(prng, min, max) {
  return min + prng() * (max - min);
}

/* ------------------------------------------------------------------ */
/*  Random Event Sequence Generator                                   */
/* ------------------------------------------------------------------ */

const EVENT_TYPES = [
  "POINTER_DOWN",
  "POINTER_MOVE",
  "POINTER_UP",
  "POINTER_CANCEL",
  "LOST_POINTER_CAPTURE",
  "TICK",
  "WHEEL",
  "KEY_INTENT",
  "RESET",
];

const POINTER_TYPES = ["mouse", "touch", "pen"];
const KEY_INTENTS = [
  "ACTIVATE",
  "CANCEL",
  "NAVIGATE_PREVIOUS",
  "NAVIGATE_NEXT",
  "NAVIGATE_UP",
  "NAVIGATE_DOWN",
];

function generateEventSequence(prng, count = 25) {
  const sequence = [];
  let currentTimestamp = 1000;
  let activeX = 100;
  let activeY = 100;

  for (let i = 0; i < count; i++) {
    currentTimestamp += randomInt(prng, 5, 200);
    const eventType = randomChoice(prng, EVENT_TYPES);
    const pointerId = randomChoice(prng, [1, 1, 1, 2, 3]); // primary id 1 weighted

    switch (eventType) {
      case "POINTER_DOWN": {
        activeX = randomFloat(prng, 50, 150);
        activeY = randomFloat(prng, 50, 150);
        sequence.push({
          type: "POINTER_DOWN",
          pointerId,
          pointerType: randomChoice(prng, POINTER_TYPES),
          button: randomChoice(prng, [0, 0, 0, 1, 2]),
          x: activeX,
          y: activeY,
          timestamp: currentTimestamp,
        });
        break;
      }
      case "POINTER_MOVE": {
        // Either micro-movement or macro-movement
        const dx = randomChoice(prng, [0, 1, -1, 3, -4, 15, -20, 50]);
        const dy = randomChoice(prng, [0, 2, -1, 4, -3, 12, -25, 40]);
        activeX += dx;
        activeY += dy;
        sequence.push({
          type: "POINTER_MOVE",
          pointerId,
          pointerType: randomChoice(prng, POINTER_TYPES),
          x: activeX,
          y: activeY,
          timestamp: currentTimestamp,
        });
        break;
      }
      case "POINTER_UP": {
        sequence.push({
          type: "POINTER_UP",
          pointerId,
          pointerType: randomChoice(prng, POINTER_TYPES),
          button: 0,
          x: activeX,
          y: activeY,
          timestamp: currentTimestamp,
        });
        break;
      }
      case "POINTER_CANCEL": {
        sequence.push({
          type: "POINTER_CANCEL",
          pointerId,
          timestamp: currentTimestamp,
        });
        break;
      }
      case "LOST_POINTER_CAPTURE": {
        sequence.push({
          type: "LOST_POINTER_CAPTURE",
          pointerId,
          timestamp: currentTimestamp,
        });
        break;
      }
      case "TICK": {
        sequence.push({
          type: "TICK",
          timestamp: currentTimestamp,
        });
        break;
      }
      case "WHEEL": {
        sequence.push({
          type: "WHEEL",
          deltaX: randomFloat(prng, -50, 50),
          deltaY: randomFloat(prng, -100, 100),
          deltaMode: 0,
          x: activeX,
          y: activeY,
          timestamp: currentTimestamp,
        });
        break;
      }
      case "KEY_INTENT": {
        sequence.push({
          type: "KEY_INTENT",
          intent: randomChoice(prng, KEY_INTENTS),
          timestamp: currentTimestamp,
          repeat: prng() > 0.8,
        });
        break;
      }
      case "RESET": {
        sequence.push({
          type: "RESET",
          timestamp: currentTimestamp,
        });
        break;
      }
    }
  }

  return sequence;
}

/* ------------------------------------------------------------------ */
/*  Invariant Evaluator                                               */
/* ------------------------------------------------------------------ */

function evaluateInvariants(sequence, config) {
  let state = createInitialGestureArbiterState();
  const allSteps = [];
  const intentLog = [];

  let currentPointerSession = null; // { pointerId, hasDragStart, hasClick, hasLongPress, cancelled }

  for (let i = 0; i < sequence.length; i++) {
    const event = sequence[i];
    const prevPhase = state.phase;
    const result = reduceGesture(state, event, config);
    state = result.state;

    allSteps.push({ event, result, prevPhase });

    // Track intents
    for (const intent of result.intents) {
      intentLog.push(intent);

      // Invariant checks on emitted intents:
      // 1. Numeric finite check
      if ("x" in intent) assert.ok(Number.isFinite(intent.x), "intent x must be finite");
      if ("y" in intent) assert.ok(Number.isFinite(intent.y), "intent y must be finite");
      if ("timestamp" in intent) assert.ok(Number.isFinite(intent.timestamp), "intent timestamp must be finite");
      if ("deltaX" in intent) assert.ok(Number.isFinite(intent.deltaX), "intent deltaX must be finite");
      if ("deltaY" in intent) assert.ok(Number.isFinite(intent.deltaY), "intent deltaY must be finite");

      // 2. Mutual exclusivity of CLICK and DRAG within one pointer interaction
      if (intent.type === "PRESS_START") {
        currentPointerSession = {
          pointerId: intent.pointerId,
          hasDragStart: false,
          hasClick: false,
          hasLongPress: false,
          cancelled: false,
        };
      }

      if (intent.type === "DRAG_START") {
        if (currentPointerSession && currentPointerSession.pointerId === intent.pointerId) {
          assert.equal(
            currentPointerSession.hasClick,
            false,
            "Invariant Violation: CLICK was emitted before DRAG_START for the same pointer session",
          );
          currentPointerSession.hasDragStart = true;
        }
      }

      if (intent.type === "CLICK") {
        if (currentPointerSession && currentPointerSession.pointerId === intent.pointerId) {
          assert.equal(
            currentPointerSession.hasDragStart,
            false,
            "Invariant Violation: DRAG_START was emitted before CLICK for the same pointer session",
          );
          assert.equal(
            currentPointerSession.hasLongPress,
            false,
            "Invariant Violation: LONG_PRESS was emitted before CLICK for the same pointer session",
          );
          assert.equal(
            currentPointerSession.cancelled,
            false,
            "Invariant Violation: CLICK emitted after pointer was cancelled",
          );
          currentPointerSession.hasClick = true;
        }
      }

      if (intent.type === "LONG_PRESS") {
        if (currentPointerSession && currentPointerSession.pointerId === intent.pointerId) {
          assert.equal(
            currentPointerSession.hasClick,
            false,
            "Invariant Violation: CLICK was emitted before LONG_PRESS",
          );
          assert.equal(
            currentPointerSession.hasDragStart,
            false,
            "Invariant Violation: DRAG_START was emitted before LONG_PRESS",
          );
          currentPointerSession.hasLongPress = true;
        }
      }

      if (intent.type === "CANCEL" || intent.type === "DRAG_CANCEL") {
        if (currentPointerSession) {
          currentPointerSession.cancelled = true;
        }
      }
    }

    // Check state invariants
    if (state.phase === "IDLE") {
      assert.equal(state.activePointer, null, "IDLE phase must have activePointer === null");
      assert.equal(state.pendingClick, null, "IDLE phase must have pendingClick === null");
    }

    if (state.phase === "DRAG_ACTIVE") {
      assert.notEqual(state.activePointer, null, "DRAG_ACTIVE phase must have an activePointer");
    }

    if (state.phase === "CLICK_PENDING_SECOND") {
      assert.notEqual(state.pendingClick, null, "CLICK_PENDING_SECOND must have pendingClick !== null");
    }

    // Effect checks:
    for (const effect of result.effects) {
      if (effect.type === "REQUEST_POINTER_CAPTURE" || effect.type === "RELEASE_POINTER_CAPTURE") {
        assert.ok(Number.isFinite(effect.pointerId), "capture effect pointerId must be finite");
      }
      if (effect.type === "SCHEDULE_DEADLINE") {
        assert.ok(Number.isFinite(effect.timestamp), "deadline timestamp must be finite");
        assert.ok(effect.durationMs > 0, "deadline durationMs must be > 0");
      }
    }
  }

  // Check replay determinism for the entire sequence
  let replayState = createInitialGestureArbiterState();
  for (let i = 0; i < sequence.length; i++) {
    const replayResult = reduceGesture(replayState, sequence[i], config);
    replayState = replayResult.state;
    assert.deepEqual(
      replayResult.intents,
      allSteps[i].result.intents,
      `Replay intent divergence at step ${i}`,
    );
    assert.deepEqual(
      replayResult.effects,
      allSteps[i].result.effects,
      `Replay effect divergence at step ${i}`,
    );
  }
  assert.deepEqual(replayState, state, "Replay final state divergence");

  return true;
}

/* ------------------------------------------------------------------ */
/*  Counterexample Minimizer (Shrinking)                              */
/* ------------------------------------------------------------------ */

function shrinkSequence(sequence, config, testFn) {
  let current = [...sequence];
  let minimized = current;

  // Try removing one event at a time
  for (let i = 0; i < current.length; i++) {
    const candidate = current.slice(0, i).concat(current.slice(i + 1));
    try {
      testFn(candidate, config);
    } catch {
      // Still fails! Update minimized
      minimized = candidate;
    }
  }
  return minimized;
}

/* ------------------------------------------------------------------ */
/*  Property-Based Test Suites                                        */
/* ------------------------------------------------------------------ */

test("property — 500 randomized sequences with default config satisfy all invariants", () => {
  const seed = 424242;
  const prng = createPRNG(seed);
  const totalSequences = 500;

  for (let i = 0; i < totalSequences; i++) {
    const seq = generateEventSequence(prng, randomInt(prng, 10, 40));
    try {
      evaluateInvariants(seq, DEFAULT_GESTURE_CONFIG);
    } catch (err) {
      const minimal = shrinkSequence(seq, DEFAULT_GESTURE_CONFIG, evaluateInvariants);
      console.error("FAILING SEED:", seed, "SEQUENCE INDEX:", i);
      console.error("MINIMAL FAILING SEQUENCE:", JSON.stringify(minimal, null, 2));
      throw err;
    }
  }
});

test("property — 500 randomized sequences with multiPointerPolicy 'cancel-active' satisfy invariants", () => {
  const seed = 987654;
  const prng = createPRNG(seed);
  const config = { multiPointerPolicy: "cancel-active", doubleClickWindowMs: 250, dragThresholdPx: 12 };

  for (let i = 0; i < 500; i++) {
    const seq = generateEventSequence(prng, randomInt(prng, 10, 40));
    try {
      evaluateInvariants(seq, config);
    } catch (err) {
      const minimal = shrinkSequence(seq, config, evaluateInvariants);
      console.error("FAILING SEED:", seed, "SEQUENCE INDEX:", i);
      console.error("MINIMAL FAILING SEQUENCE:", JSON.stringify(minimal, null, 2));
      throw err;
    }
  }
});

test("property — 500 randomized sequences with double-click disabled satisfy invariants", () => {
  const seed = 123456;
  const prng = createPRNG(seed);
  const config = { enableDoubleClick: false, enableLongPress: false, dragThresholdPx: 6 };

  for (let i = 0; i < 500; i++) {
    const seq = generateEventSequence(prng, randomInt(prng, 10, 35));
    try {
      evaluateInvariants(seq, config);
    } catch (err) {
      const minimal = shrinkSequence(seq, config, evaluateInvariants);
      console.error("FAILING SEED:", seed, "SEQUENCE INDEX:", i);
      console.error("MINIMAL FAILING SEQUENCE:", JSON.stringify(minimal, null, 2));
      throw err;
    }
  }
});

test("property — 500 randomized sequences with wheel handoff policy satisfy invariants", () => {
  const seed = 555555;
  const prng = createPRNG(seed);
  const config = { wheelPolicy: "handoff", longPressMs: 200, dragThresholdPx: 15 };

  for (let i = 0; i < 500; i++) {
    const seq = generateEventSequence(prng, randomInt(prng, 10, 35));
    try {
      evaluateInvariants(seq, config);
    } catch (err) {
      const minimal = shrinkSequence(seq, config, evaluateInvariants);
      console.error("FAILING SEED:", seed, "SEQUENCE INDEX:", i);
      console.error("MINIMAL FAILING SEQUENCE:", JSON.stringify(minimal, null, 2));
      throw err;
    }
  }
});

test("property — 500 randomized sequences with micro-thresholds (boundary stress) satisfy invariants", () => {
  const seed = 777777;
  const prng = createPRNG(seed);
  const config = { dragThresholdPx: 0.5, doubleClickWindowMs: 50, longPressMs: 50 };

  for (let i = 0; i < 500; i++) {
    const seq = generateEventSequence(prng, randomInt(prng, 15, 50));
    try {
      evaluateInvariants(seq, config);
    } catch (err) {
      const minimal = shrinkSequence(seq, config, evaluateInvariants);
      console.error("FAILING SEED:", seed, "SEQUENCE INDEX:", i);
      console.error("MINIMAL FAILING SEQUENCE:", JSON.stringify(minimal, null, 2));
      throw err;
    }
  }
});
