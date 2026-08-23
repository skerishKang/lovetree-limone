/**
 * P1 — Interaction Authority / Gesture Arbiter: narrow pure-core extraction
 * from #141 after a two-consumer audit of current main:
 *
 *   Consumer 1 — Crystal Memory Atelier V3 (Lineage 56):
 *     app/design-lab/lineages/56/v3/CrystalMemoryAtelierV3.tsx
 *     press record {id,startX,lastStepX,dragged} keyed by pointerId,
 *     drag latches at CRYSTAL_DRAG_START_PX and never returns to tap,
 *     stale events are dropped by pointerId match, terminal handlers clear
 *     the press record first, and only `!cancelled && !wasDrag` counts as tap.
 *
 *   Consumer 2 — Moment Cluster Explorer V1.2 (Track 60):
 *     app/design-lab/lineages/60/v1-2/Lineage60ClusterExplorer.tsx +
 *     lib/lineage-60/projection.ts classifyGesture()
 *     ("Web CTO confirmed blockers"): maxMove from the down origin compared
 *     against CLICK_THRESHOLD_PX, pointercancel / lostpointercapture are
 *     cleanup-only and must never select — not even via a trailing pointerup
 *     until a fresh pointerdown.
 *
 * This core resolves ONLY the shared semantic intersection observed in both
 * consumers: press origin tracking, movement-distance vs threshold
 * classification with drag latching, deterministic pointerup completion,
 * pointercancel / lostpointercapture cleanup-only semantics, stale/repeated
 * terminal suppression, and fresh-gesture isolation.
 *
 * Renderer-neutral, React-neutral, DOM-neutral and LoveTree-domain-neutral.
 * Excluded from this core (belong to consumers, adapters, P2–P9):
 *   - hit-testing, selection, rotation, page turns, any domain reaction
 *   - multi-pointer / pinch ownership (single-consumer evidence: Track 60)
 *   - long-press, double-click/tap, wheel, keyboard, touch-scroll priority
 *     (no two-consumer common evidence on current main — #141 FOLLOW-UP)
 *   - velocity/flick measurement (LivingMemoryBook V5 measures px/ms, a
 *     different input contract than the distance thresholds audited here)
 *   - timers, rAF, performance.now, DOM elements, CSS, routes
 *   - DB / API / Auth / Firebase / Neon / Worker / Production
 */

/** Current-main evidence default: lib/lineage-60/projection.ts CLICK_THRESHOLD_PX. */
export const TAP_THRESHOLD_PX_DEFAULT = 6;

export type InteractionGesturePhase = "idle" | "pending" | "drag";

/**
 * Authority state for one pointer gesture lifecycle.
 * `tapThresholdPx` is carried in the state so reducers stay self-contained.
 */
export interface InteractionAuthorityState {
  /** movement threshold in CSS px: distance > threshold classifies as drag */
  readonly tapThresholdPx: number;
  readonly phase: InteractionGesturePhase;
  readonly pointerId: number | null;
  readonly originX: number | null;
  readonly originY: number | null;
}

export interface InteractionAuthorityOptions {
  /** explicit click/tap threshold override in CSS px (must be finite > 0) */
  readonly tapThresholdPx?: number;
}

/**
 * The resolved intent for one consumed pointer event.
 * - "tap": completed below threshold without cancellation
 * - "drag": gesture had latched into drag before completion
 * - "cancelled": cleanup-only terminal (pointercancel / lostpointercapture);
 *   callers must never select/react semantically to this outcome
 * - "none": no completed intent from this event — lifecycle transitions
 *   (accepted pointerdown, drag-latching pointermove) and stale/repeated/
 *   mismatched/inapplicable drops are all "none"; distinguish them via the
 *   returned state. Vocabulary mirrors Track 60's confirmed GestureKind.
 */
export type PointerIntentOutcome = "tap" | "drag" | "cancelled" | "none";

export interface InteractionAuthorityResult {
  readonly outcome: PointerIntentOutcome;
  readonly state: InteractionAuthorityState;
}

export type InteractionPointerEvent =
  | { readonly type: "pointerdown"; readonly pointerId: number; readonly x: number; readonly y: number }
  | { readonly type: "pointermove"; readonly pointerId: number; readonly x: number; readonly y: number }
  | { readonly type: "pointerup"; readonly pointerId: number }
  | { readonly type: "pointercancel"; readonly pointerId: number }
  | { readonly type: "lostpointercapture"; readonly pointerId: number };

const PHASES: readonly InteractionGesturePhase[] = ["idle", "pending", "drag"];

/**
 * Fail-closed validation for interaction authority states.
 * Throws TypeError unless the state is well-formed and internally consistent
 * (idle implies no pointer identity/origin; active phases imply both).
 */
export function assertValidInteractionState(
  state: InteractionAuthorityState,
): void {
  if (
    !state ||
    typeof state !== "object" ||
    !PHASES.includes(state.phase) ||
    typeof state.tapThresholdPx !== "number" ||
    !Number.isFinite(state.tapThresholdPx) ||
    state.tapThresholdPx <= 0
  ) {
    throw new TypeError("invalid interaction authority state");
  }
  const active = state.phase !== "idle";
  const hasPointer =
    typeof state.pointerId === "number" && Number.isInteger(state.pointerId);
  const hasOrigin =
    typeof state.originX === "number" &&
    Number.isFinite(state.originX) &&
    typeof state.originY === "number" &&
    Number.isFinite(state.originY);
  if (active && !(hasPointer && hasOrigin)) {
    throw new TypeError("invalid interaction authority state");
  }
  if (
    !active &&
    (state.pointerId !== null || state.originX !== null || state.originY !== null)
  ) {
    throw new TypeError("invalid interaction authority state");
  }
}

/**
 * Create a fresh idle authority state.
 * Throws TypeError when tapThresholdPx is present but not a finite number > 0
 * (invalid threshold is a caller programming error, fail-closed).
 */
export function createInteractionAuthorityState(
  options: InteractionAuthorityOptions = {},
): InteractionAuthorityState {
  if (options !== undefined && options !== null && typeof options !== "object") {
    throw new TypeError("invalid interaction authority options");
  }
  const provided = options?.tapThresholdPx;
  const threshold = provided === undefined ? TAP_THRESHOLD_PX_DEFAULT : provided;
  if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold <= 0) {
    throw new TypeError(
      `invalid tapThresholdPx: ${String(options?.tapThresholdPx)}`,
    );
  }
  return {
    tapThresholdPx: threshold,
    phase: "idle",
    pointerId: null,
    originX: null,
    originY: null,
  };
}

/** True while a pointer gesture owns the authority (pending tap or latched drag). */
export function hasActivePointerGesture(state: InteractionAuthorityState): boolean {
  assertValidInteractionState(state);
  return state.phase !== "idle";
}

interface PointerEventShape {
  type?: unknown;
  pointerId?: unknown;
  x?: unknown;
  y?: unknown;
}

function requireEventShape(event: PointerEventShape): void {
  if (!event || typeof event !== "object") {
    throw new TypeError("invalid interaction pointer event");
  }
  switch (event.type) {
    case "pointerdown":
    case "pointermove":
    case "pointerup":
    case "pointercancel":
    case "lostpointercapture":
      break;
    default:
      throw new TypeError(`unsupported interaction pointer event type: ${String(event.type)}`);
  }
  if (
    typeof event.pointerId !== "number" ||
    !Number.isInteger(event.pointerId)
  ) {
    throw new TypeError(`invalid pointerId: ${String(event.pointerId)}`);
  }
}

function requireFiniteXY(event: PointerEventShape): boolean {
  return (
    typeof event.x === "number" &&
    Number.isFinite(event.x) &&
    typeof event.y === "number" &&
    Number.isFinite(event.y)
  );
}

function idleState(threshold: number): InteractionAuthorityState {
  return {
    tapThresholdPx: threshold,
    phase: "idle",
    pointerId: null,
    originX: null,
    originY: null,
  };
}

/**
 * Pure reducer consuming exactly one pointer lifecycle event.
 *
 * Authority rules (two-consumer intersection, Track 60 blockers CTO-confirmed):
 *  - distance is measured from the pointerdown origin (2D Euclidean, matching
 *    Track 60's hypot maxMove; Crystal's axis-only motion yields identical
 *    results because its gestures move on x alone)
 *  - classification boundary follows Track 60's confirmed rule: strictly
 *    greater-than threshold classifies drag, equal-or-below remains tap
 *  - once latched into drag, the gesture never reverts to tap, even if the
 *    pointer reverses back toward (or past) its origin
 *  - pointerup completes deterministically: pending -> "tap", drag -> "drag"
 *  - pointercancel / lostpointercapture resolve cleanup-only ("cancelled")
 *    and can never produce a tap afterwards: the trailing pointerup arrives
 *    at an idle state and is ignored until the next fresh pointerdown
 *  - stale, repeated or mismatched-pointer terminals are ignored, mirroring
 *    Crystal's pointerId guard
 *  - events carrying non-finite coordinates are ignored without corrupting
 *    gesture state (fail-closed against NaN/Infinity origin poisoning)
 *  - caller inputs are never mutated; every result state is a fresh object
 */
export function reduceInteractionAuthority(
  state: InteractionAuthorityState,
  event: InteractionPointerEvent,
): InteractionAuthorityResult {
  assertValidInteractionState(state);
  requireEventShape(event as PointerEventShape);
  const pointerId = (event as PointerEventShape).pointerId as number;

  switch (event.type) {
    case "pointerdown": {
      // Multi-pointer ownership (pinch) is out of scope for this slice: while
      // a gesture is active, competing pointers cannot steal or reset it.
      if (state.phase !== "idle") {
        return { outcome: "none", state };
      }
      const shape = event as PointerEventShape;
      if (!requireFiniteXY(shape)) {
        return { outcome: "none", state };
      }
      return {
        outcome: "none",
        state: {
          tapThresholdPx: state.tapThresholdPx,
          phase: "pending",
          pointerId,
          originX: shape.x as number,
          originY: shape.y as number,
        },
      };
    }
    case "pointermove": {
      if (state.phase === "idle" || state.pointerId !== pointerId) {
        return { outcome: "none", state };
      }
      const shape = event as PointerEventShape;
      if (!requireFiniteXY(shape)) {
        return { outcome: "none", state };
      }
      if (state.phase === "drag") {
        return { outcome: "none", state };
      }
      const dx = (shape.x as number) - (state.originX as number);
      const dy = (shape.y as number) - (state.originY as number);
      const distance = Math.hypot(dx, dy);
      if (distance > state.tapThresholdPx) {
        return {
          outcome: "none",
          state: { ...state, phase: "drag" },
        };
      }
      return { outcome: "none", state };
    }
    case "pointerup": {
      if (state.phase === "idle" || state.pointerId !== pointerId) {
        return { outcome: "none", state };
      }
      const outcome: PointerIntentOutcome =
        state.phase === "drag" ? "drag" : "tap";
      return { outcome, state: idleState(state.tapThresholdPx) };
    }
    case "pointercancel":
    case "lostpointercapture": {
      if (state.phase === "idle" || state.pointerId !== pointerId) {
        return { outcome: "none", state };
      }
      return { outcome: "cancelled", state: idleState(state.tapThresholdPx) };
    }
    default: {
      throw new TypeError("unsupported interaction pointer event");
    }
  }
}
