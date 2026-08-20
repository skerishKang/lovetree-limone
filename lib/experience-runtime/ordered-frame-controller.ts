/**
 * P2 — Ordered Frame / Turntable Controller: stateful pure core extraction
 * from #141.
 *
 * This is the controller-tier twin of the narrower stateless primitives in
 * `lib/design-runtime/ordered-frame.ts`. The narrow module owns index/selection
 * math; this module owns the stateful reducer, drag accumulator, autoplay
 * authority, manual takeover, and angle quantization for a single ordered
 * frame set.
 *
 * Design constraints (parallel to `gesture-arbiter.ts`):
 *   - Pure deterministic reducer: reduceOrderedFrame(state, action, config)
 *     returns a new state. No mutation, no side effects.
 *   - No Date.now / performance.now / setTimeout / setInterval / setImmediate.
 *   - No DOM, React, browser globals, CSS, asset paths, or Lineage names.
 *   - No wall-clock time. Autoplay advancement is driven by an explicit
 *     `AUTOPLAY_TICK` action — the caller (not this core) owns the timer.
 *   - No internal randomness. Deterministic replay: replaying the same
 *     action sequence on the same initial state yields the same result
 *     at every step.
 *   - State shape is bounded and serializable. The drag accumulator is the
 *     only state that retains a floating-point remainder, and it is
 *     intentionally bounded to `(-threshold, +threshold]`.
 *
 * Composition:
 *   - Reuses the narrow P2 primitive `directionFromDelta` (in
 *     `design-runtime/ordered-frame.ts`) for horizontal-delta sign
 *     derivation. The narrow module's `nextFrame` / `previousFrame` /
 *     `stepFrame` are wrap-only, so this controller does NOT use them;
 *     it uses the P4 `stepSelectionIndex` and `normalizeSelectionIndex`
 *     from `design-runtime/selection.ts` instead, because the
 *     controller supports an explicit wrap/clamp boundary policy.
 *   - The autoplay and manual-takeover state is represented as two
 *     simple booleans (`autoplay`, `manuallyOwned`). The broader P3
 *     guided-transport engine in `design-runtime/transport.ts` is NOT
 *     composed here — P2 is intentionally simpler and owns only
 *     ordered-frame advancement semantics. Callers that need full
 *     P3 behavior (chapter completion, restart, look progression)
 *     should layer P3 on top of P2, not replace P2 with P3.
 *
 * Out of scope (handled by consumers or higher-level modules):
 *   - DOM, React, CSS, asset paths, font/image bytes, asset decoding.
 *   - Lineage / Crystal / Petal / VideoFigure-specific semantics.
 *   - Wall-clock timers and requestAnimationFrame loops.
 *   - Touch / pointer / wheel / drag-start capture (P1 gesture arbiter).
 *   - Reduced-motion / focus / keyboard DOM policy (P7).
 *   - Asset bytes / hash / decode / preload (P8).
 *   - Multi-frame-set composition (e.g. Crystal has TWO independent ordered
 *     sets — 4 angles and 4 expressions — and P2 must NOT fabricate
 *     combinatorial 4×4 = 16 states. Each ordered set is a separate
 *     controller instance; this core models ONE ordered set at a time).
 */

import {
  directionFromDelta as p2DirectionFromDelta,
} from "../design-runtime/ordered-frame";
import {
  normalizeSelectionIndex,
  stepSelectionIndex,
} from "../design-runtime/selection";

/* ------------------------------------------------------------------ */
/* Primitive Types                                                    */
/* ------------------------------------------------------------------ */

/**
 * Stable, ordered identity for a single frame in the controller's frame
 * set. Strings are used so callers can plug in any stable identity
 * scheme (URLs, slugs, asset filenames, "front"/"rear", "000"/"045", etc.).
 *
 * The controller does NOT parse, validate, or interpret the contents of
 * frame ids — it treats them as opaque stable labels.
 */
export type FrameId = string;

/**
 * Explicit boundary policy applied to manual step / direct-select
 * operations and to AUTOPLAY_TICK. The caller picks one; the controller
 * never guesses.
 *
 *   - "wrap":   out-of-range indices wrap modulo `count`.
 *   - "clamp":  out-of-range indices clamp to `[0, count - 1]`.
 */
export type BoundaryPolicy = "wrap" | "clamp";

/**
 * Caller-declared sign convention for horizontal drag deltas. This lets
 * a single controller serve both common conventions:
 *
 *   - +1: rightward drag (positive deltaX) increments the index.
 *   - -1: rightward drag decrements the index (Crystal / VideoFigure
 *         convention, where turning the model "clockwise" feels like
 *         dragging it to the right).
 */
export type SignConvention = 1 | -1;

/**
 * Manual-takeover resume policy. Matches the broader P3 transport
 * vocabulary so this controller can be composed with `transport.ts`
 * without translation.
 */
export type ResumePolicy = "resume-after-idle" | "stay-paused";

/**
 * Keyboard-normalized navigation direction. The controller never sees
 * raw key codes; the caller maps ArrowLeft / ArrowRight / PageUp /
 * PageDown / etc. into one of these two.
 */
export type NavigationDirection = "next" | "previous";

/**
 * A signed discrete step direction.
 */
export type StepDirection = -1 | 0 | 1;

/* ------------------------------------------------------------------ */
/* Configuration                                                      */
/* ------------------------------------------------------------------ */

/**
 * Caller-supplied configuration for an `OrderedFrameController`. Every
 * field is read-only; the controller is configured once at creation
 * time and does not mutate the config thereafter.
 */
export interface OrderedFrameConfig {
  /**
   * Canonical ordered frame identity list. The order of the array is
   * the controller's source of truth for "next" / "previous" / index
   * arithmetic. The list MUST be non-empty and MUST contain unique ids.
   * Empty or duplicate ids are fail-closed validation errors.
   */
  readonly frameIds: readonly FrameId[];

  /**
   * Optional parallel array of frame angles, in degrees, used by
   * `ANGLE_TO_FRAME` to quantize a continuous angle to the nearest
   * frame. When omitted, `ANGLE_TO_FRAME` fails closed. The length MUST
   * equal `frameIds.length` when provided.
   */
  readonly angles?: readonly number[];

  /**
   * Boundary policy for step / direct-select / autoplay operations.
   * Defaults to "wrap".
   */
  readonly boundaryPolicy?: BoundaryPolicy;

  /**
   * Drag step threshold: how many cumulative CSS pixels of horizontal
   * drag correspond to one frame step. MUST be a positive finite
   * number. Defaults to 48 (matches the Crystal `CRYSTAL_ANGLE_STEP_PX`
   * convention documented in `lineage-56-crystal-memory-source.ts`).
   */
  readonly stepThreshold?: number;

  /**
   * Sign convention for horizontal drag. See {@link SignConvention}.
   * Defaults to -1 (Crystal / VideoFigure convention).
   */
  readonly positiveDeltaDirection?: SignConvention;

  /**
   * Initial autoplay authority flag. When true, the controller starts
   * with `playing: true` and an `AUTOPLAY_TICK` action will advance
   * the frame (subject to manual ownership). Defaults to false.
   */
  readonly initialAutoplay?: boolean;

  /**
   * Initial manual-ownership flag. When true, the controller starts
   * with autoplay suppressed until a `MANUAL_RELEASE` action is
   * observed. Defaults to false.
   */
  readonly initiallyManuallyOwned?: boolean;

  /**
   * Resume policy applied when `MANUAL_RELEASE` is observed. Matches
   * the P3 transport vocabulary. Defaults to "resume-after-idle".
   */
  readonly resumePolicy?: ResumePolicy;

  /**
   * Initial selected index. Must be a finite number. Fractional
   * values are rounded deterministically to the nearest integer and
   * then normalized via the boundary policy. Defaults to 0.
   */
  readonly initialIndex?: number;
}

/**
 * Fully-resolved, fail-closed-validated configuration. Exposed for
 * advanced callers that want to pre-validate or to share a resolved
 * config across many controller instances.
 */
export interface ResolvedOrderedFrameConfig {
  readonly frameIds: readonly FrameId[];
  readonly count: number;
  readonly idToIndex: ReadonlyMap<FrameId, number>;
  readonly angles: readonly number[] | null;
  readonly boundaryPolicy: BoundaryPolicy;
  readonly stepThreshold: number;
  readonly positiveDeltaDirection: SignConvention;
  readonly resumePolicy: ResumePolicy;
  readonly initialIndex: number;
  readonly initialAutoplay: boolean;
  readonly initiallyManuallyOwned: boolean;
}

export const DEFAULT_ORDERED_FRAME_CONFIG = Object.freeze({
  boundaryPolicy: "wrap" as BoundaryPolicy,
  stepThreshold: 48,
  positiveDeltaDirection: -1 as SignConvention,
  resumePolicy: "resume-after-idle" as ResumePolicy,
  initialIndex: 0,
  initialAutoplay: false,
  initiallyManuallyOwned: false,
});

/**
 * Fail-closed validation for an `OrderedFrameConfig`. Throws
 * `TypeError` / `RangeError` for invalid shapes, empty frame sets,
 * duplicate ids, mis-aligned `angles` arrays, non-positive thresholds,
 * non-finite numeric values, invalid boundary policy, invalid sign
 * convention, or invalid resume policy.
 */
export function validateOrderedFrameConfig(
  config: unknown,
): asserts config is OrderedFrameConfig {
  if (typeof config !== "object" || config === null) {
    throw new TypeError("OrderedFrameConfig must be a non-null object");
  }
  const c = config as Record<string, unknown>;

  if (!Array.isArray(c.frameIds)) {
    throw new TypeError("frameIds must be an array of strings");
  }
  if (c.frameIds.length === 0) {
    throw new RangeError("frameIds must contain at least one frame");
  }
  for (let i = 0; i < c.frameIds.length; i++) {
    if (typeof c.frameIds[i] !== "string") {
      throw new TypeError(
        `frameIds[${i}] must be a string, received: ${typeof c.frameIds[i]}`,
      );
    }
  }
  const seen = new Set<string>();
  for (let i = 0; i < c.frameIds.length; i++) {
    if (seen.has(c.frameIds[i] as string)) {
      throw new RangeError(
        `frameIds[${i}] is a duplicate of an earlier frame id: ${c.frameIds[i]}`,
      );
    }
    seen.add(c.frameIds[i] as string);
  }

  if (c.angles !== undefined) {
    if (!Array.isArray(c.angles)) {
      throw new TypeError("angles must be an array of numbers when provided");
    }
    if (c.angles.length !== c.frameIds.length) {
      throw new RangeError(
        `angles.length (${c.angles.length}) must equal frameIds.length (${c.frameIds.length})`,
      );
    }
    for (let i = 0; i < c.angles.length; i++) {
      if (
        typeof c.angles[i] !== "number" ||
        !Number.isFinite(c.angles[i] as number)
      ) {
        throw new RangeError(
          `angles[${i}] must be a finite number, received: ${String(c.angles[i])}`,
        );
      }
    }
  }

  if (c.boundaryPolicy !== undefined) {
    if (c.boundaryPolicy !== "wrap" && c.boundaryPolicy !== "clamp") {
      throw new TypeError(
        `Invalid boundaryPolicy: ${String(c.boundaryPolicy)} (expected "wrap" or "clamp")`,
      );
    }
  }

  if (c.stepThreshold !== undefined) {
    if (
      typeof c.stepThreshold !== "number" ||
      !Number.isFinite(c.stepThreshold) ||
      c.stepThreshold <= 0
    ) {
      throw new RangeError(
        `stepThreshold must be a positive finite number, received: ${String(c.stepThreshold)}`,
      );
    }
  }

  if (c.positiveDeltaDirection !== undefined) {
    if (c.positiveDeltaDirection !== 1 && c.positiveDeltaDirection !== -1) {
      throw new TypeError(
        `Invalid positiveDeltaDirection: ${String(c.positiveDeltaDirection)} (expected 1 or -1)`,
      );
    }
  }

  if (c.resumePolicy !== undefined) {
    if (
      c.resumePolicy !== "resume-after-idle" &&
      c.resumePolicy !== "stay-paused"
    ) {
      throw new TypeError(
        `Invalid resumePolicy: ${String(c.resumePolicy)} (expected "resume-after-idle" or "stay-paused")`,
      );
    }
  }

  if (c.initialIndex !== undefined) {
    if (typeof c.initialIndex !== "number" || !Number.isFinite(c.initialIndex)) {
      throw new RangeError(
        `initialIndex must be a finite number, received: ${String(c.initialIndex)}`,
      );
    }
  }

  if (c.initialAutoplay !== undefined && typeof c.initialAutoplay !== "boolean") {
    throw new TypeError("initialAutoplay must be a boolean");
  }
  if (
    c.initiallyManuallyOwned !== undefined &&
    typeof c.initiallyManuallyOwned !== "boolean"
  ) {
    throw new TypeError("initiallyManuallyOwned must be a boolean");
  }
}

/**
 * Merge a caller-supplied config with defaults and freeze the result.
 * Performs fail-closed validation. Returns a `ResolvedOrderedFrameConfig`
 * that the reducer and helpers can consume without further checks.
 */
export function resolveOrderedFrameConfig(
  config: OrderedFrameConfig,
): ResolvedOrderedFrameConfig {
  validateOrderedFrameConfig(config);
  const idToIndex = new Map<string, number>();
  for (let i = 0; i < config.frameIds.length; i++) {
    idToIndex.set(config.frameIds[i] as string, i);
  }
  const boundaryPolicy: BoundaryPolicy =
    config.boundaryPolicy ?? DEFAULT_ORDERED_FRAME_CONFIG.boundaryPolicy;
  const stepThreshold =
    config.stepThreshold ?? DEFAULT_ORDERED_FRAME_CONFIG.stepThreshold;
  const positiveDeltaDirection: SignConvention =
    config.positiveDeltaDirection ??
    DEFAULT_ORDERED_FRAME_CONFIG.positiveDeltaDirection;
  const resumePolicy: ResumePolicy =
    config.resumePolicy ?? DEFAULT_ORDERED_FRAME_CONFIG.resumePolicy;
  const initialIndex = normalizeIndex(
    config.initialIndex ?? DEFAULT_ORDERED_FRAME_CONFIG.initialIndex,
    config.frameIds.length,
    boundaryPolicy,
  );
  return Object.freeze({
    frameIds: Object.freeze(config.frameIds.slice()) as readonly FrameId[],
    count: config.frameIds.length,
    idToIndex,
    angles: config.angles
      ? (Object.freeze(config.angles.slice()) as readonly number[])
      : null,
    boundaryPolicy,
    stepThreshold,
    positiveDeltaDirection,
    resumePolicy,
    initialIndex,
    initialAutoplay:
      config.initialAutoplay ?? DEFAULT_ORDERED_FRAME_CONFIG.initialAutoplay,
    initiallyManuallyOwned:
      config.initiallyManuallyOwned ??
      DEFAULT_ORDERED_FRAME_CONFIG.initiallyManuallyOwned,
  });
}

/* ------------------------------------------------------------------ */
/* State                                                              */
/* ------------------------------------------------------------------ */

/**
 * Stateful controller state. All fields are read-only; transitions are
 * produced exclusively by `reduceOrderedFrame`. The state is
 * JSON-serializable and deterministic — replaying the same action
 * sequence on the same initial state yields the same state at every
 * step.
 */
export interface OrderedFrameState {
  /**
   * Current selected index. Always in `[0, count)` (clamped) or the
   * mod-`count` residue (wrap), guaranteed by the reducer.
   */
  readonly index: number;

  /**
   * Current selected frame id. Equals `frameIds[index]`. Denormalized
   * for caller convenience.
   */
  readonly frameId: FrameId;

  /**
   * Retained partial drag delta, bounded to `(-stepThreshold,
   * +stepThreshold]`. The controller consumes whole-threshold units
   * and remembers the remainder for the next `MANUAL_DRAG` action.
   * After a `DRAG_END` action (or any non-drag transition), the
   * accumulator is reset to 0.
   */
  readonly dragAccumulator: number;

  /**
   * Last discrete drag direction (sign of the last consumed step). 0
   * if no drag step has been consumed since the last reset.
   */
  readonly lastDragDirection: StepDirection;

  /**
   * Whether autoplay authority is active (the "playing" flag, in P3
   * vocabulary). When false, `AUTOPLAY_TICK` is a no-op. When true,
   * `AUTOPLAY_TICK` advances the frame subject to manual ownership.
   */
  readonly autoplay: boolean;

  /**
   * Whether manual ownership is held. When true, `AUTOPLAY_TICK` is a
   * no-op until a `MANUAL_RELEASE` (or `PAUSE` then `RESUME` via the
   * P3 transport) action is observed.
   */
  readonly manuallyOwned: boolean;
}

/**
 * Create the initial state for a controller. The returned state has
 * `index === config.initialIndex` (after boundary-policy normalization),
 * `frameId === frameIds[initialIndex]`, a clean drag accumulator
 * (0, 0), and the resolved autoplay / manual flags.
 */
export function createInitialOrderedFrameState(
  config: ResolvedOrderedFrameConfig,
): OrderedFrameState {
  const frameId = config.frameIds[config.initialIndex] as FrameId;
  return {
    index: config.initialIndex,
    frameId,
    dragAccumulator: 0,
    lastDragDirection: 0,
    autoplay: config.initialAutoplay,
    manuallyOwned: config.initiallyManuallyOwned,
  };
}

/* ------------------------------------------------------------------ */
/* Actions                                                            */
/* ------------------------------------------------------------------ */

/**
 * Discrete actions that drive the controller. All actions are
 * serializable plain objects with a `type` discriminator. The
 * controller does not accept ad-hoc shapes.
 */
export type OrderedFrameAction =
  /**
   * Select a specific frame by index. The index is normalized via the
   * boundary policy. By default, manual ownership is acquired. Pass
   * `manual: false` for non-user-driven programmatic selects that
   * should NOT inhibit autoplay (e.g. a focus-on-mirror animation).
   */
  | { readonly type: "DIRECT_SELECT"; readonly index: number; readonly manual?: boolean }
  /**
   * Select a specific frame by its id. The id must be a member of the
   * configured frame set; unknown ids are a fail-closed validation
   * error.
   */
  | { readonly type: "DIRECT_SELECT_BY_ID"; readonly frameId: FrameId; readonly manual?: boolean }
  /**
   * Advance by one frame (or wrap to the first frame in wrap mode, or
   * hold at the last frame in clamp mode). Always sets manual
   * ownership.
   */
  | { readonly type: "MANUAL_NEXT" }
  /**
   * Retreat by one frame (or wrap to the last frame in wrap mode, or
   * hold at the first frame in clamp mode). Always sets manual
   * ownership.
   */
  | { readonly type: "MANUAL_PREVIOUS" }
  /**
   * Apply a horizontal drag delta. The reducer accumulates the delta
   * into the drag accumulator, consumes whole-threshold units to
   * produce signed steps, and remembers the remainder for the next
   * drag action. When one or more steps are consumed, manual
   * ownership is set.
   */
  | { readonly type: "MANUAL_DRAG"; readonly deltaX: number }
  /**
   * End the current drag gesture. Resets the drag accumulator and
   * last-drag-direction fields to 0 / 0. Manual ownership is
   * preserved — the caller is responsible for issuing a separate
   * `MANUAL_RELEASE` when the user is no longer driving the
   * controller.
   */
  | { readonly type: "DRAG_END" }
  /**
   * Select the frame whose configured angle is nearest to the input
   * angle (in degrees). Negative angles, angles ≥ 360, and exact
   * tie-breaking (lower index wins) are handled deterministically.
   * Fails closed when the controller has no `angles` configured.
   * Always sets manual ownership.
   */
  | { readonly type: "ANGLE_TO_FRAME"; readonly angle: number }
  /**
   * Apply a keyboard-normalized navigation intent. The controller
   * does not see raw key codes; the caller is responsible for
   * translating ArrowLeft / ArrowRight / PageUp / PageDown / etc.
   * into one of these two directions. Equivalent to MANUAL_NEXT or
   * MANUAL_PREVIOUS in effect.
   */
  | { readonly type: "KEYBOARD"; readonly direction: NavigationDirection }
  /**
   * Autoplay timer tick. The reducer is driven by an explicit action
   * (no internal timer). Advances the index by one (subject to the
   * boundary policy) if and only if `autoplay` is true and
   * `manuallyOwned` is false. A no-op otherwise.
   */
  | { readonly type: "AUTOPLAY_TICK" }
  /**
   * Explicit manual takeover without changing the index. Useful when
   * the user has started interacting (e.g. hover, focus) but has not
   * yet produced a discrete input event. The optional
   * `pausePlayback` flag, when true, also clears the autoplay flag
   * (matches the Memory Anatomy pattern in `transport.ts`).
   */
  | {
      readonly type: "MANUAL_TAKEOVER";
      readonly pausePlayback?: boolean;
    }
  /**
   * Release manual ownership under the configured `resumePolicy`. If
   * the resume policy is "stay-paused", autoplay is also cleared; if
   * "resume-after-idle", the previous autoplay flag is preserved.
   */
  | { readonly type: "MANUAL_RELEASE" }
  /**
   * Pause autoplay. Preserves manual ownership.
   */
  | { readonly type: "PAUSE" }
  /**
   * Resume autoplay. Clears manual ownership.
   */
  | { readonly type: "RESUME" }
  /**
   * Reset the controller to a known initial condition. The optional
   * `index` selects a new starting frame; otherwise the configured
   * `initialIndex` is used. Transport flags (`autoplay`,
   * `manuallyOwned`) are reset to their configured initial values.
   */
  | { readonly type: "RESET"; readonly index?: number };

/* ------------------------------------------------------------------ */
/* Reducer                                                            */
/* ------------------------------------------------------------------ */

function normalizeIndex(
  index: number,
  count: number,
  policy: BoundaryPolicy,
): number {
  return normalizeSelectionIndex(index, count, policy);
}

function stepIndex(
  current: number,
  delta: number,
  count: number,
  policy: BoundaryPolicy,
): number {
  return stepSelectionIndex(current, delta, count, policy);
}

function normalizeAngle(angle: number): number {
  if (!Number.isFinite(angle)) {
    throw new RangeError("angle must be a finite number");
  }
  // Normalize to [0, 360). Positive angles modulo 360. Negative angles
  // and angles > 360 wrap deterministically.
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  // Guard against the floating-point edge case where modulo yields
  // exactly 360 (e.g. 720 % 360 = 0, but 1e15 % 360 may not be exact).
  if (normalized >= 360) normalized = 0;
  if (normalized < 0) normalized = 0;
  return normalized;
}

function circularAngleDistance(a: number, b: number): number {
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
}

/**
 * Quantize a continuous angle (in degrees) to the nearest frame by
 * configured angle. Returns the resolved index and frame id. Returns
 * `null` when no `angles` are configured (the caller should treat
 * `null` as a fail-closed validation error and call
 * `validateOrderedFrameConfig` upstream to detect this earlier).
 *
 * Tie-breaking: when two frames are exactly equidistant from the
 * input angle, the lower index wins. This is deterministic and
 * independent of insertion order.
 */
export function nearestFrameForAngle(
  config: ResolvedOrderedFrameConfig,
  angle: number,
): { readonly index: number; readonly frameId: FrameId } | null {
  if (config.angles === null) {
    return null;
  }
  const target = normalizeAngle(angle);
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < config.angles.length; i++) {
    const frameAngle = normalizeAngle(config.angles[i] as number);
    const distance = circularAngleDistance(target, frameAngle);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
    // Strict less-than on the tie: a later equal-distance frame does
    // not replace the earlier one. This makes tie-breaking
    // deterministic ("lower index wins").
  }
  return {
    index: bestIndex,
    frameId: config.frameIds[bestIndex] as FrameId,
  };
}

/**
 * Sign-only drag direction from a horizontal delta. Re-exports the
 * P2 narrow primitive so callers can use one consistent API.
 */
export function directionFromDelta(
  deltaX: number,
  positiveDeltaDirection: SignConvention,
  threshold = 0,
): StepDirection {
  return p2DirectionFromDelta(deltaX, positiveDeltaDirection, threshold);
}

/**
 * Pure deterministic reducer. Given a state, an action, and a
 * resolved config, returns the next state. The input state is never
 * mutated; the returned state is a fresh plain object.
 *
 * The reducer is total: every action shape is handled, and every
 * invalid input fails closed with a `TypeError` or `RangeError`.
 */
export function reduceOrderedFrame(
  state: OrderedFrameState,
  action: OrderedFrameAction,
  config: ResolvedOrderedFrameConfig,
): OrderedFrameState {
  if (!state || typeof state !== "object") {
    throw new TypeError("reduceOrderedFrame: state must be an object");
  }
  if (!action || typeof action !== "object" || typeof action.type !== "string") {
    throw new TypeError("reduceOrderedFrame: action must be an object with a string type");
  }
  if (!config || typeof config !== "object") {
    throw new TypeError("reduceOrderedFrame: config must be a resolved OrderedFrameConfig");
  }

  switch (action.type) {
    case "DIRECT_SELECT": {
      if (!Number.isFinite(action.index)) {
        throw new RangeError(
          `DIRECT_SELECT index must be a finite number, received: ${String(action.index)}`,
        );
      }
      const newIndex = normalizeIndex(
        action.index,
        config.count,
        config.boundaryPolicy,
      );
      const manual = action.manual !== false;
      return {
        index: newIndex,
        frameId: config.frameIds[newIndex] as FrameId,
        dragAccumulator: 0,
        lastDragDirection: 0,
        autoplay: manual ? state.autoplay : state.autoplay,
        manuallyOwned: manual ? true : state.manuallyOwned,
      };
    }

    case "DIRECT_SELECT_BY_ID": {
      if (typeof action.frameId !== "string") {
        throw new TypeError("DIRECT_SELECT_BY_ID frameId must be a string");
      }
      const idx = config.idToIndex.get(action.frameId);
      if (idx === undefined) {
        throw new RangeError(
          `DIRECT_SELECT_BY_ID frameId is not in the configured frame set: ${action.frameId}`,
        );
      }
      const manual = action.manual !== false;
      return {
        index: idx,
        frameId: action.frameId,
        dragAccumulator: 0,
        lastDragDirection: 0,
        autoplay: state.autoplay,
        manuallyOwned: manual ? true : state.manuallyOwned,
      };
    }

    case "MANUAL_NEXT": {
      const newIndex = stepIndex(state.index, 1, config.count, config.boundaryPolicy);
      return {
        index: newIndex,
        frameId: config.frameIds[newIndex] as FrameId,
        dragAccumulator: 0,
        lastDragDirection: 0,
        autoplay: state.autoplay,
        manuallyOwned: true,
      };
    }

    case "MANUAL_PREVIOUS": {
      const newIndex = stepIndex(
        state.index,
        -1,
        config.count,
        config.boundaryPolicy,
      );
      return {
        index: newIndex,
        frameId: config.frameIds[newIndex] as FrameId,
        dragAccumulator: 0,
        lastDragDirection: 0,
        autoplay: state.autoplay,
        manuallyOwned: true,
      };
    }

    case "MANUAL_DRAG": {
      if (!Number.isFinite(action.deltaX)) {
        throw new RangeError(
          `MANUAL_DRAG deltaX must be a finite number, received: ${String(action.deltaX)}`,
        );
      }
      const newAccumulator = state.dragAccumulator + action.deltaX;
      if (newAccumulator === 0) {
        return {
          index: state.index,
          frameId: state.frameId,
          dragAccumulator: 0,
          lastDragDirection: 0,
          autoplay: state.autoplay,
          manuallyOwned: state.manuallyOwned,
        };
      }
      const direction = directionFromDelta(
        newAccumulator,
        config.positiveDeltaDirection,
        0,
      );
      const absAccumulator = Math.abs(newAccumulator);
      const absSteps = Math.floor(absAccumulator / config.stepThreshold);
      if (absSteps === 0) {
        // Below one full threshold: retain the accumulator but do not
        // advance the index or set manual ownership.
        return {
          index: state.index,
          frameId: state.frameId,
          dragAccumulator: newAccumulator,
          lastDragDirection: direction,
          autoplay: state.autoplay,
          manuallyOwned: state.manuallyOwned,
        };
      }
      const signedSteps = absSteps * direction;
      const newIndex = stepIndex(
        state.index,
        signedSteps,
        config.count,
        config.boundaryPolicy,
      );
      // Consume exactly the integer-threshold units; retain the
      // floating-point remainder for the next MANUAL_DRAG. The
      // remainder is bounded to (-threshold, +threshold] by
      // construction.
      const consumed = signedSteps * config.stepThreshold;
      const remainder = newAccumulator - consumed;
      return {
        index: newIndex,
        frameId: config.frameIds[newIndex] as FrameId,
        dragAccumulator: remainder,
        lastDragDirection: direction,
        autoplay: state.autoplay,
        manuallyOwned: true,
      };
    }

    case "DRAG_END": {
      return {
        index: state.index,
        frameId: state.frameId,
        dragAccumulator: 0,
        lastDragDirection: 0,
        autoplay: state.autoplay,
        manuallyOwned: state.manuallyOwned,
      };
    }

    case "ANGLE_TO_FRAME": {
      if (config.angles === null) {
        throw new RangeError(
          "ANGLE_TO_FRAME is not available: config.angles was not provided",
        );
      }
      const resolved = nearestFrameForAngle(config, action.angle);
      if (resolved === null) {
        // Unreachable when config.angles !== null, but kept for
        // type-safety.
        throw new RangeError("ANGLE_TO_FRAME: nearestFrameForAngle returned null");
      }
      return {
        index: resolved.index,
        frameId: resolved.frameId,
        dragAccumulator: 0,
        lastDragDirection: 0,
        autoplay: state.autoplay,
        manuallyOwned: true,
      };
    }

    case "KEYBOARD": {
      if (action.direction !== "next" && action.direction !== "previous") {
        throw new TypeError(
          `KEYBOARD direction must be "next" or "previous", received: ${String(action.direction)}`,
        );
      }
      const delta = action.direction === "next" ? 1 : -1;
      const newIndex = stepIndex(
        state.index,
        delta,
        config.count,
        config.boundaryPolicy,
      );
      return {
        index: newIndex,
        frameId: config.frameIds[newIndex] as FrameId,
        dragAccumulator: 0,
        lastDragDirection: 0,
        autoplay: state.autoplay,
        manuallyOwned: true,
      };
    }

    case "AUTOPLAY_TICK": {
      // The autoplay gate is the same as P3's canAutoAdvance:
      // autoplay is on AND manual ownership is not held. The
      // controller does not own the timer; the caller is responsible
      // for emitting this action on a tick schedule.
      if (!state.autoplay || state.manuallyOwned) {
        return state;
      }
      const newIndex = stepIndex(
        state.index,
        1,
        config.count,
        config.boundaryPolicy,
      );
      // For wrap boundary this naturally wraps; for clamp boundary
      // this holds at the last frame (matching the "clamp-hold"
      // autoplay semantics described in the task brief).
      return {
        index: newIndex,
        frameId: config.frameIds[newIndex] as FrameId,
        dragAccumulator: state.dragAccumulator,
        lastDragDirection: state.lastDragDirection,
        autoplay: state.autoplay,
        manuallyOwned: state.manuallyOwned,
      };
    }

    case "MANUAL_TAKEOVER": {
      if (
        action.pausePlayback !== undefined &&
        typeof action.pausePlayback !== "boolean"
      ) {
        throw new TypeError("MANUAL_TAKEOVER pausePlayback must be a boolean");
      }
      return {
        index: state.index,
        frameId: state.frameId,
        dragAccumulator: 0,
        lastDragDirection: 0,
        autoplay: action.pausePlayback ? false : state.autoplay,
        manuallyOwned: true,
      };
    }

    case "MANUAL_RELEASE": {
      const nextAutoplay =
        config.resumePolicy === "stay-paused" ? false : state.autoplay;
      return {
        index: state.index,
        frameId: state.frameId,
        dragAccumulator: 0,
        lastDragDirection: 0,
        autoplay: nextAutoplay,
        manuallyOwned: false,
      };
    }

    case "PAUSE": {
      return {
        index: state.index,
        frameId: state.frameId,
        dragAccumulator: 0,
        lastDragDirection: 0,
        autoplay: false,
        manuallyOwned: state.manuallyOwned,
      };
    }

    case "RESUME": {
      return {
        index: state.index,
        frameId: state.frameId,
        dragAccumulator: 0,
        lastDragDirection: 0,
        autoplay: true,
        manuallyOwned: false,
      };
    }

    case "RESET": {
      const targetIndex =
        action.index !== undefined
          ? normalizeIndex(action.index, config.count, config.boundaryPolicy)
          : config.initialIndex;
      return {
        index: targetIndex,
        frameId: config.frameIds[targetIndex] as FrameId,
        dragAccumulator: 0,
        lastDragDirection: 0,
        autoplay: config.initialAutoplay,
        manuallyOwned: config.initiallyManuallyOwned,
      };
    }

    default: {
      const exhaustive: never = action;
      throw new TypeError(
        `reduceOrderedFrame: unsupported action type: ${(exhaustive as { type: string }).type}`,
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Pure predicates (read-only views over the state)                   */
/* ------------------------------------------------------------------ */

/**
 * `true` when the controller is configured to autoplay AND manual
 * ownership is not held. Mirrors the P3 `canAutoAdvance` predicate
 * for the composed controller state.
 */
export function canAutoAdvance(state: OrderedFrameState): boolean {
  if (!state || typeof state !== "object") {
    throw new TypeError("canAutoAdvance: state must be an object");
  }
  return state.autoplay === true && state.manuallyOwned === false;
}

/**
 * Returns the currently-selected frame id. Equivalent to
 * `state.frameId`; provided as a named read-only view for symmetry
 * with `selectedFrameId` in the narrow P2 module.
 */
export function selectedFrameId(state: OrderedFrameState): FrameId {
  if (!state || typeof state !== "object") {
    throw new TypeError("selectedFrameId: state must be an object");
  }
  return state.frameId;
}

/**
 * Returns the currently-selected index. Equivalent to `state.index`;
 * provided as a named read-only view for symmetry.
 */
export function selectedIndex(state: OrderedFrameState): number {
  if (!state || typeof state !== "object") {
    throw new TypeError("selectedIndex: state must be an object");
  }
  return state.index;
}

/**
 * `true` when manual ownership is held.
 */
export function isManuallyOwned(state: OrderedFrameState): boolean {
  if (!state || typeof state !== "object") {
    throw new TypeError("isManuallyOwned: state must be an object");
  }
  return state.manuallyOwned === true;
}

/**
 * `true` when autoplay authority is active.
 */
export function isAutoplayActive(state: OrderedFrameState): boolean {
  if (!state || typeof state !== "object") {
    throw new TypeError("isAutoplayActive: state must be an object");
  }
  return state.autoplay === true;
}
