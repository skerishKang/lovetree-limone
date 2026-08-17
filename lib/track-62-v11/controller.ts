/**
 * Track62 V1.1 — Continuous Exhibition Rail: ContinuousPhaseController.
 *
 * Local, narrow pure-core for the capability proof at
 * `/design-lab/capabilities/continuous-exhibition-rail` (Issue #159).
 *
 * Contract (Issue #159 / Track62 V1.1 native capability proof):
 *   - ONE authoritative fractional phase state couples wheel, pointer drag,
 *     touch drag and direct node selection into the same transport.
 *   - wheel delta accumulates a fractional target;
 *   - pointer drag maps pixels to the same fractional phase;
 *   - reverse input takes effect immediately (no input lock);
 *   - inertia/damping after drag release;
 *   - idle detection followed by nearest-scene snap;
 *   - direct selection travels through this controller (travel, not teleport);
 *   - viewer/panel open-close never resets phase (phase preservation);
 *   - cancelled gestures never select, never open, never commit.
 *
 * Renderer-neutral, React-neutral, DOM-neutral and LoveTree-domain-neutral.
 * It intentionally stays local/narrow: no shared runtime extraction without a
 * second consumer (Issue #159 boundary).
 *
 * Projection contract for every consumer:
 *
 *   sceneX = (sceneIndex - phase) * spacing
 *
 * Scene positions, rail nodes and terrain/parallax are all derived from the
 * same continuous phase — never from a discrete selectedIndex++ model.
 *
 * Excluded on purpose (belong to consumers/adapters):
 *   - timers, setTimeout, requestAnimationFrame, performance.now
 *   - wheel/pointer event wiring, pointer capture, element focus
 *   - reduced-motion media queries (only the pure flag is honored here)
 *   - Moment/VIEWER/WHY NEXT domain data
 *   - React state, DOM, CSS, routes, DB/API/Auth/Firebase/Neon/Worker
 */

export type ContinuousPhaseMode = "free" | "settling" | "idle";
export type ContinuousPhaseGesture = "none" | "armed" | "dragging";
export type ContinuousPhaseInputChannel = "wheel" | "drag" | "touch" | "selection";

export interface ContinuousPhaseDragState {
  readonly pointerId: number;
  readonly startX: number;
  readonly x: number;
  readonly distance: number;
  readonly channel: ContinuousPhaseInputChannel;
}

export interface ContinuousPhaseState {
  readonly sceneCount: number;
  readonly phase: number;
  readonly target: number;
  readonly velocity: number;
  readonly mode: ContinuousPhaseMode;
  readonly gesture: ContinuousPhaseGesture;
  readonly drag: ContinuousPhaseDragState | null;
  readonly lastInputTime: number;
  readonly lastInputChannel: ContinuousPhaseInputChannel | null;
  readonly settling: boolean;
  readonly motionPolicy: "full" | "reduced";
}

export interface ContinuousPhaseConfig {
  readonly sceneCount: number;
  readonly initialPhase?: number;
  readonly motionPolicy?: "full" | "reduced";
  readonly gestureThresholdPx?: number;
  readonly snapTolerance?: number;
  readonly snapVelocityThreshold?: number;
  readonly idleAfterMs?: number;
  readonly settleRatePerSecond?: number;
  readonly reducedSettleRatePerSecond?: number;
  readonly wheelDeltaPhaseFactor?: number;
  readonly dragPixelsPerPhase?: number;
  readonly dragVelocityWindowMs?: number;
  readonly releaseVelocityScale?: number;
  readonly releaseVelocityCap?: number;
  readonly flingProjectionSeconds?: number;
  readonly flingMaxSceneJump?: number;
}

export interface ResolvedContinuousPhaseConfig {
  readonly sceneCount: number;
  readonly initialPhase: number;
  readonly motionPolicy: "full" | "reduced";
  readonly gestureThresholdPx: number;
  readonly snapTolerance: number;
  readonly snapVelocityThreshold: number;
  readonly idleAfterMs: number;
  readonly settleRatePerSecond: number;
  readonly reducedSettleRatePerSecond: number;
  readonly wheelDeltaPhaseFactor: number;
  readonly dragPixelsPerPhase: number;
  readonly dragVelocityWindowMs: number;
  readonly releaseVelocityScale: number;
  readonly releaseVelocityCap: number;
  readonly flingProjectionSeconds: number;
  readonly flingMaxSceneJump: number;
}

const DEFAULT_CONFIG = {
  gestureThresholdPx: 8,
  snapTolerance: 0.004,
  snapVelocityThreshold: 1.1,
  idleAfterMs: 240,
  settleRatePerSecond: 4.5,
  reducedSettleRatePerSecond: 40,
  wheelDeltaPhaseFactor: 0.0022,
  dragPixelsPerPhase: 380,
  dragVelocityWindowMs: 120,
  releaseVelocityScale: 3,
  releaseVelocityCap: 6,
  flingProjectionSeconds: 0.15,
  flingMaxSceneJump: 2,
} as const;

function assertFinite(value: unknown, name: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

function clampPhase(
  phase: number,
  config: Pick<ResolvedContinuousPhaseConfig, "sceneCount">,
): number {
  return Math.min(config.sceneCount - 1, Math.max(0, phase));
}

function clampIndex(index: number, sceneCount: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.min(sceneCount - 1, Math.max(0, Math.round(index)));
}

/**
 * Fail-closed config resolution. Throws TypeError unless every option is a
 * finite number, sceneCount >= 2 and motionPolicy is valid.
 */
export function resolveContinuousPhaseConfig(
  config: ContinuousPhaseConfig,
): ResolvedContinuousPhaseConfig {
  if (!config || typeof config !== "object") {
    throw new TypeError("continuous phase config must be an object");
  }
  const sceneCount = config.sceneCount;
  assertFinite(sceneCount, "config.sceneCount");
  if (!Number.isInteger(sceneCount) || sceneCount < 2) {
    throw new TypeError(`sceneCount must be an integer >= 2, got ${String(sceneCount)}`);
  }
  const motionPolicy = config.motionPolicy ?? "full";
  if (motionPolicy !== "full" && motionPolicy !== "reduced") {
    throw new TypeError(`invalid motionPolicy: ${String(motionPolicy)}`);
  }
  if (config.initialPhase !== undefined) assertFinite(config.initialPhase, "config.initialPhase");
  const initialPhase = clampPhase(config.initialPhase ?? 0, { sceneCount });

  const read = (candidate: number | undefined, fallback: number): number => {
    if (candidate === undefined) return fallback;
    assertFinite(candidate, "config option");
    return candidate;
  };

  return {
    sceneCount,
    initialPhase,
    motionPolicy,
    gestureThresholdPx: read(config.gestureThresholdPx, DEFAULT_CONFIG.gestureThresholdPx),
    snapTolerance: read(config.snapTolerance, DEFAULT_CONFIG.snapTolerance),
    snapVelocityThreshold: read(config.snapVelocityThreshold, DEFAULT_CONFIG.snapVelocityThreshold),
    idleAfterMs: read(config.idleAfterMs, DEFAULT_CONFIG.idleAfterMs),
    settleRatePerSecond: read(config.settleRatePerSecond, DEFAULT_CONFIG.settleRatePerSecond),
    reducedSettleRatePerSecond: read(config.reducedSettleRatePerSecond, DEFAULT_CONFIG.reducedSettleRatePerSecond),
    wheelDeltaPhaseFactor: read(config.wheelDeltaPhaseFactor, DEFAULT_CONFIG.wheelDeltaPhaseFactor),
    dragPixelsPerPhase: read(config.dragPixelsPerPhase, DEFAULT_CONFIG.dragPixelsPerPhase),
    dragVelocityWindowMs: read(config.dragVelocityWindowMs, DEFAULT_CONFIG.dragVelocityWindowMs),
    releaseVelocityScale: read(config.releaseVelocityScale, DEFAULT_CONFIG.releaseVelocityScale),
    releaseVelocityCap: read(config.releaseVelocityCap, DEFAULT_CONFIG.releaseVelocityCap),
    flingProjectionSeconds: read(config.flingProjectionSeconds, DEFAULT_CONFIG.flingProjectionSeconds),
    flingMaxSceneJump: read(config.flingMaxSceneJump, DEFAULT_CONFIG.flingMaxSceneJump),
  };
}

/**
 * Create the initial state. Scene 0 unless initialPhase says otherwise.
 * Phase is clamped into [0, sceneCount - 1].
 */
export function createContinuousPhaseState(
  config: ContinuousPhaseConfig,
): ContinuousPhaseState {
  const resolved = resolveContinuousPhaseConfig(config);
  return {
    sceneCount: resolved.sceneCount,
    phase: resolved.initialPhase,
    target: resolved.initialPhase,
    velocity: 0,
    mode: "idle",
    gesture: "none",
    drag: null,
    lastInputTime: 0,
    lastInputChannel: null,
    settling: false,
    motionPolicy: resolved.motionPolicy,
  };
}

function validateState(state: ContinuousPhaseState): void {
  if (!state || typeof state !== "object") {
    throw new TypeError("invalid continuous phase state");
  }
}

/** Nearest integer scene to a fractional phase, clamped to bounds. */
export function nearestScene(
  phase: number,
  sceneCount: number,
): number {
  assertFinite(phase, "phase");
  assertFinite(sceneCount, "sceneCount");
  if (sceneCount < 1) throw new TypeError("sceneCount must be >= 1");
  return clampIndex(Math.round(phase), sceneCount);
}

/** Active (displayed) scene: nearest integer scene to the current phase. */
export function deriveActiveScene(state: ContinuousPhaseState): number {
  validateState(state);
  return nearestScene(state.phase, state.sceneCount);
}

/**
 * Continuous projection contract:
 *   sceneX = (sceneIndex - phase) * spacing
 * The same formula derives every scene/rail/parallax offset from one phase.
 */
export function sceneProjectionOffset(
  state: ContinuousPhaseState,
  sceneIndex: number,
): number {
  validateState(state);
  assertFinite(sceneIndex, "sceneIndex");
  return sceneIndex - state.phase;
}

/** True when a fractional (non-integer) phase exists — the transport is analog. */
export function isFractionalPhase(state: ContinuousPhaseState): boolean {
  validateState(state);
  return Math.abs(state.phase - Math.round(state.phase)) > 1e-9;
}

function requireGesture(
  state: ContinuousPhaseState,
  pointerId: number,
): asserts state is ContinuousPhaseState & { drag: ContinuousPhaseDragState } {
  if (!state.drag) {
    throw new TypeError("no active gesture; call beginGesture first");
  }
  if (state.drag.pointerId !== pointerId) {
    throw new TypeError("pointer id does not own the active gesture");
  }
}

/**
 * pointerdown: claim ownership (armed). Below-threshold movement keeps the
 * gesture "armed" so a short tap can still be a click/selection. The
 * threshold-crossing is edge-determined by moveGesture.
 */
export function beginGesture(
  state: ContinuousPhaseState,
  config: ContinuousPhaseConfig,
  input: { pointerId: number; startX: number; nowMs: number; channel?: ContinuousPhaseInputChannel },
): ContinuousPhaseState {
  validateState(state);
  resolveContinuousPhaseConfig({ ...config, sceneCount: state.sceneCount });
  assertFinite(input.pointerId, "pointerId");
  assertFinite(input.startX, "startX");
  assertFinite(input.nowMs, "nowMs");
  if (state.gesture !== "none") {
    throw new TypeError("gesture already active; release it before claiming again");
  }
  const channel = input.channel ?? "drag";
  if (channel !== "drag" && channel !== "touch") {
    throw new TypeError(`gesture channel must be "drag" or "touch", got ${String(channel)}`);
  }
  return {
    ...state,
    gesture: "armed",
    drag: {
      pointerId: input.pointerId,
      startX: input.startX,
      x: input.startX,
      distance: 0,
      channel,
    },
    velocity: 0,
    lastInputTime: input.nowMs,
    lastInputChannel: channel,
  };
}

/** Accumulated horizontal drag distance for the armed gesture. */
export function gestureDistance(
  state: ContinuousPhaseState,
): number {
  validateState(state);
  if (!state.drag) {
    throw new TypeError("no active gesture; call beginGesture first");
  }
  return state.drag.distance;
}

export interface PointerGestureMoveInput {
  readonly pointerId: number;
  readonly x: number;
  readonly nowMs: number;
}

/**
 * Accumulate drag movement into the SAME fractional phase. Crossing the
 * threshold flips gesture "armed" -> "dragging" exactly once; movement
 * before the threshold never moves the scene (so a tap stays a tap).
 */
export function moveGesture(
  state: ContinuousPhaseState,
  config: ContinuousPhaseConfig,
  input: PointerGestureMoveInput,
): ContinuousPhaseState {
  validateState(state);
  const resolved = resolveContinuousPhaseConfig({ ...config, sceneCount: state.sceneCount });
  assertFinite(input.pointerId, "pointerId");
  assertFinite(input.x, "x");
  assertFinite(input.nowMs, "nowMs");
  requireGesture(state, input.pointerId);

  const drag = state.drag;
  const accumulated = Math.abs(input.x - drag.startX);
  if (state.gesture === "armed" && accumulated < resolved.gestureThresholdPx) {
    return {
      ...state,
      drag: { ...drag, x: input.x, distance: accumulated },
      lastInputTime: input.nowMs,
    };
  }

  const previousX = state.gesture === "dragging" ? drag.x : drag.startX;
  const deltaPx = previousX - input.x;
  const deltaPhase = deltaPx / resolved.dragPixelsPerPhase;
  const nextPhase = clampPhase(state.phase + deltaPhase, { sceneCount: state.sceneCount });

  // lastInputTime carries the previous move timestamp while dragging, which
  // gives a deterministic windowed velocity estimate.
  let nextVelocity = 0;
  if (state.gesture === "dragging") {
    const elapsed = state.lastInputTime > 0 ? input.nowMs - state.lastInputTime : 0;
    if (elapsed > 0 && elapsed <= resolved.dragVelocityWindowMs) {
      nextVelocity = (nextPhase - state.phase) / (elapsed / 1000);
    }
  }

  return {
    ...state,
    phase: nextPhase,
    target: nextPhase,
    velocity: Number.isFinite(nextVelocity) ? nextVelocity : 0,
    mode: "free",
    gesture: "dragging",
    drag: { ...drag, x: input.x, distance: accumulated },
    lastInputTime: input.nowMs,
    lastInputChannel: drag.channel,
  };
}

function flingTarget(
  state: ContinuousPhaseState,
  config: ResolvedContinuousPhaseConfig,
): number {
  const scaled = Math.max(
    -config.releaseVelocityCap,
    Math.min(config.releaseVelocityCap, state.velocity * config.releaseVelocityScale),
  );
  const projection = state.phase + scaled * config.flingProjectionSeconds;
  const clampedJump = Math.max(
    -config.flingMaxSceneJump,
    Math.min(config.flingMaxSceneJump, Math.round(projection) - Math.round(state.phase)),
  );
  return clampIndex(Math.round(state.phase) + clampedJump, state.sceneCount);
}

/**
 * pointerup: gesture release. If no threshold-crossing drag occurred this
 * stays a tap (the consumer decides selection). If a drag occurred,
 * damping/inertia settle is engaged toward the fling/nearest scene through
 * the same phase state.
 *
 *   - "tap": no drag; click/selection semantics allowed.
 *   - "fling": drag occurred; settle engaged; selection/open is FORBIDDEN.
 */
export function endGesture(
  state: ContinuousPhaseState,
  config: ContinuousPhaseConfig,
  input: { pointerId: number; nowMs: number },
): { state: ContinuousPhaseState; outcome: "tap" | "fling" } {
  validateState(state);
  const resolved = resolveContinuousPhaseConfig({ ...config, sceneCount: state.sceneCount });
  assertFinite(input.pointerId, "pointerId");
  assertFinite(input.nowMs, "nowMs");
  requireGesture(state, input.pointerId);

  if (state.gesture !== "dragging") {
    return {
      state: {
        ...state,
        gesture: "none",
        drag: null,
        velocity: 0,
        lastInputTime: input.nowMs,
      },
      outcome: "tap",
    };
  }

  const reduced = state.motionPolicy === "reduced";
  const target =
    reduced
      ? nearestScene(state.phase, state.sceneCount)
      : Math.abs(state.velocity) >= resolved.snapVelocityThreshold
        ? flingTarget(state, resolved)
        : nearestScene(state.phase, state.sceneCount);

  return {
    state: {
      ...state,
      target: clampIndex(target, state.sceneCount),
      velocity: reduced ? 0 : state.velocity,
      mode: "settling",
      gesture: "none",
      drag: null,
      settling: true,
      lastInputTime: input.nowMs,
    },
    outcome: "fling",
  };
}

/**
 * pointercancel / lostpointercapture: cleanup ONLY.
 * Never selects, never opens a viewer, never commits a phase target.
 */
export function cancelGesture(
  state: ContinuousPhaseState,
  input: { pointerId: number; nowMs: number },
): { state: ContinuousPhaseState; outcome: "cancelled" } {
  validateState(state);
  assertFinite(input.pointerId, "pointerId");
  assertFinite(input.nowMs, "nowMs");
  requireGesture(state, input.pointerId);

  const wasDragging = state.gesture === "dragging";
  return {
    state: {
      ...state,
      target: wasDragging ? clampPhase(state.phase, { sceneCount: state.sceneCount }) : state.target,
      velocity: 0,
      mode: wasDragging ? "settling" : state.mode,
      gesture: "none",
      drag: null,
      settling: wasDragging,
      lastInputTime: input.nowMs,
    },
    outcome: "cancelled",
  };
}

/**
 * Wheel delta -> fractional target accumulation (the same phase every other
 * input feeds). Reverse input takes effect immediately: this call mutates
 * the target directly and interrupts any settling.
 */
export function applyWheel(
  state: ContinuousPhaseState,
  config: ContinuousPhaseConfig,
  input: { delta: number; nowMs: number },
): ContinuousPhaseState {
  validateState(state);
  const resolved = resolveContinuousPhaseConfig({ ...config, sceneCount: state.sceneCount });
  assertFinite(input.delta, "delta");
  assertFinite(input.nowMs, "nowMs");
  const target = clampPhase(
    state.target + input.delta * resolved.wheelDeltaPhaseFactor,
    { sceneCount: state.sceneCount },
  );
  return {
    ...state,
    target,
    mode: "free",
    settling: false,
    lastInputTime: input.nowMs,
    lastInputChannel: "wheel",
  };
}

/**
 * Direct node selection through the SAME transport. This is travel, not
 * teleport: the scene is reached by animation through intermediate phases.
 * Reduced motion performs a fast settle but still through the settle path.
 */
export function selectScene(
  state: ContinuousPhaseState,
  config: ContinuousPhaseConfig,
  input: { scene: number; nowMs: number },
): ContinuousPhaseState {
  validateState(state);
  resolveContinuousPhaseConfig({ ...config, sceneCount: state.sceneCount });
  assertFinite(input.scene, "scene");
  assertFinite(input.nowMs, "nowMs");
  const scene = clampIndex(input.scene, state.sceneCount);
  return {
    ...state,
    target: scene,
    velocity: 0,
    mode: "settling",
    settling: true,
    lastInputTime: input.nowMs,
    lastInputChannel: "selection",
  };
}

/**
 * Overlay lifecycle helper: viewer/panel open-close is NOT rail input.
 * It must never move the phase (phase preservation contract).
 */
export function overlayOpened(
  state: ContinuousPhaseState,
): ContinuousPhaseState {
  validateState(state);
  return state;
}

/**
 * Simulation step with an explicit frame delta. Deterministic: the caller
 * drives frames with (nowMs, dtMs); no timers live inside this module.
 *
 * Behavior:
 *   - gesture owns the phase: while a drag is active nothing animates.
 *   - idle: nothing animates until input arrives.
 *   - settling: phase approaches target exponentially; snap and stop when
 *     |gap| <= snapTolerance.
 *   - free: phase follows target; once idleAfterMs passes with no input a
 *     fractional phase snaps to the nearest scene.
 */
export function stepContinuousPhase(
  state: ContinuousPhaseState,
  config: ContinuousPhaseConfig,
  nowMs: number,
  dtMs: number,
): ContinuousPhaseState {
  validateState(state);
  const resolved = resolveContinuousPhaseConfig({ ...config, sceneCount: state.sceneCount });
  assertFinite(nowMs, "nowMs");
  assertFinite(dtMs, "dtMs");
  if (dtMs < 0) throw new TypeError("dtMs must be >= 0");

  if (state.gesture !== "none") return state;
  if (state.mode === "idle") return state;

  const reduced = state.motionPolicy === "reduced";
  const rate = reduced
    ? resolved.reducedSettleRatePerSecond
    : resolved.settleRatePerSecond;
  const dt = Math.min(dtMs, 200) / 1000;
  const gap = state.target - state.phase;
  const idleNow = nowMs - state.lastInputTime >= resolved.idleAfterMs;

  if (state.settling || state.mode === "settling") {
    if (Math.abs(gap) <= resolved.snapTolerance) {
      return snapTo(state, resolved);
    }
    const converging = 1 - Math.exp(-rate * dt);
    const nextPhase = clampPhase(state.phase + gap * converging, { sceneCount: state.sceneCount });
    const newGap = state.target - nextPhase;
    if (Math.abs(newGap) <= resolved.snapTolerance) {
      return snapTo({ ...state, phase: clampIndex(state.target, state.sceneCount) }, resolved);
    }
    const velocity = dt > 0 ? (nextPhase - state.phase) / dt : 0;
    return {
      ...state,
      phase: nextPhase,
      velocity: Number.isFinite(velocity) ? velocity : 0,
      mode: "settling",
      settling: true,
    };
  }

  // Free tracking toward the wheel/accumulation target.
  if (Math.abs(gap) > resolved.snapTolerance) {
    const converging = 1 - Math.exp(-rate * dt);
    const nextPhase = clampPhase(state.phase + gap * converging, { sceneCount: state.sceneCount });
    const newGap = state.target - nextPhase;
    const arrival = Math.abs(newGap) <= resolved.snapTolerance;
    if (arrival && idleNow) {
      // Tracking complete with no recent input: begin nearest-scene snap
      // through the settle path (never an instant jump).
      const target = nearestScene(state.phase, state.sceneCount);
      return {
        ...state,
        phase: nextPhase,
        velocity: 0,
        target,
        mode: "settling",
        settling: true,
      };
    }
    const velocity = dt > 0 ? (nextPhase - state.phase) / dt : 0;
    return {
      ...state,
      phase: nextPhase,
      velocity: Number.isFinite(velocity) ? velocity : 0,
      mode: "free",
    };
  }

  // At the accumulation target. Hold the fractional phase against input;
  // once idle expires, route the nearest-scene snap through the settle path.
  if (idleNow && isFractionalPhase(state)) {
    const target = nearestScene(state.phase, state.sceneCount);
    return {
      ...state,
      target,
      velocity: 0,
      mode: "settling",
      settling: true,
    };
  }
  return { ...state, mode: "free" };
}

function snapTo(
  state: ContinuousPhaseState,
  resolved: ResolvedContinuousPhaseConfig,
): ContinuousPhaseState {
  const snapped = nearestScene(state.phase, state.sceneCount);
  return {
    ...state,
    phase: snapped,
    target: clampIndex(state.target, resolved.sceneCount) === snapped ? snapped : state.target,
    velocity: 0,
    mode: "idle",
    settling: false,
  };
}

/**
 * Reduced-motion policy switch: manual navigation and selection semantics
 * remain identical; only settle speed changes (fast settle instead of
 * prolonged inertia). Phase is preserved exactly.
 */
export function setMotionPolicy(
  state: ContinuousPhaseState,
  config: ContinuousPhaseConfig,
  motionPolicy: "full" | "reduced",
): { state: ContinuousPhaseState; config: ResolvedContinuousPhaseConfig } {
  validateState(state);
  if (motionPolicy !== "full" && motionPolicy !== "reduced") {
    throw new TypeError(`invalid motionPolicy: ${String(motionPolicy)}`);
  }
  const resolved = resolveContinuousPhaseConfig({ ...config, sceneCount: state.sceneCount });
  return {
    state: {
      ...state,
      motionPolicy,
      velocity: motionPolicy === "reduced" ? 0 : state.velocity,
    },
    config: { ...resolved, motionPolicy },
  };
}
