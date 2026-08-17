export interface CurlState {
  curlProgress: number;
  isFlipping: boolean;
  commitThreshold: number;
  flickEnabled: boolean;
  fastFlipActive: boolean;
  fastFlipDirection: "forward" | "backward" | null;
}

export function createCurlState(): CurlState {
  return {
    curlProgress: 0,
    isFlipping: false,
    commitThreshold: 0.4,
    flickEnabled: true,
    fastFlipActive: false,
    fastFlipDirection: null,
  };
}

export function updateCurlProgress(state: CurlState, progress: number): CurlState {
  return {
    ...state,
    curlProgress: Math.max(0, Math.min(1, progress)),
    isFlipping: progress > 0,
  };
}

export function shouldCommit(state: CurlState): boolean {
  return state.curlProgress >= state.commitThreshold;
}

/**
 * Flick velocity threshold in CSS px per millisecond (0.8 px/ms = 800 px/s).
 * A drag faster than this commits the page turn even when the drag distance
 * never reaches `commitThreshold`.
 */
export const FLICK_VELOCITY_THRESHOLD = 0.8;

export function isFlick(
  velocity: number,
  flickEnabled: boolean,
  threshold: number = FLICK_VELOCITY_THRESHOLD,
): boolean {
  return flickEnabled && Math.abs(velocity) > threshold;
}

export type TurnDirection = "forward" | "backward";

/**
 * Signed pointer velocity tracker.
 *
 * `velocity` is smoothed with an exponential moving average so a single jittery
 * sample cannot fake a flick, and keeps its sign so the commit is
 * direction-aware: dragging left (negative) turns the page forward, dragging
 * right (positive) turns it backward.
 */
export interface FlickTracker {
  startX: number;
  startTime: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  samples: number;
}

/** Weight given to the newest sample by `trackFlick`. */
export const FLICK_SMOOTHING = 0.6;

export function createFlickTracker(x: number, time: number): FlickTracker {
  return {
    startX: x,
    startTime: time,
    lastX: x,
    lastTime: time,
    velocity: 0,
    samples: 0,
  };
}

export function trackFlick(
  tracker: FlickTracker,
  x: number,
  time: number,
  smoothing: number = FLICK_SMOOTHING,
): FlickTracker {
  const dt = time - tracker.lastTime;
  if (dt <= 0) {
    return { ...tracker, lastX: x };
  }
  const instant = (x - tracker.lastX) / dt;
  const velocity = tracker.samples === 0 ? instant : tracker.velocity * (1 - smoothing) + instant * smoothing;
  return {
    ...tracker,
    lastX: x,
    lastTime: time,
    velocity,
    samples: tracker.samples + 1,
  };
}

/** Total signed horizontal travel of the drag so far. */
export function flickDeltaX(tracker: FlickTracker): number {
  return tracker.lastX - tracker.startX;
}

/** Direction implied by a signed velocity; null when the velocity is flat. */
export function flickDirection(velocity: number): TurnDirection | null {
  if (velocity < 0) return "forward";
  if (velocity > 0) return "backward";
  return null;
}

/**
 * Map a signed drag delta to curl progress.
 * A leftward drag of `travelRatio` of the page width is a full turn.
 */
export function curlProgressFromDelta(deltaX: number, width: number, travelRatio = 0.5): number {
  if (width <= 0) return 0;
  const span = width * travelRatio;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, Math.abs(deltaX) / span));
}

export type CommitReason = "threshold" | "flick" | "cancel";

export interface DragCommitDecision {
  commit: boolean;
  direction: TurnDirection | null;
  reason: CommitReason;
}

/**
 * Decide whether a released drag commits a page turn.
 *
 * A turn commits when the drag progress crossed `commitThreshold` OR when the
 * smoothed release velocity is a flick — so a short, fast flick commits while a
 * slow drag over the same short distance cancels.
 */
export function resolveDragCommit(input: {
  progress: number;
  velocity: number;
  deltaX: number;
  commitThreshold: number;
  flickEnabled: boolean;
  flickThreshold?: number;
}): DragCommitDecision {
  const { progress, velocity, deltaX, commitThreshold, flickEnabled } = input;
  const flickThreshold = input.flickThreshold ?? FLICK_VELOCITY_THRESHOLD;

  if (isFlick(velocity, flickEnabled, flickThreshold)) {
    const direction = flickDirection(velocity);
    if (direction) return { commit: true, direction, reason: "flick" };
  }

  if (progress >= commitThreshold && deltaX !== 0) {
    return {
      commit: true,
      direction: deltaX < 0 ? "forward" : "backward",
      reason: "threshold",
    };
  }

  return { commit: false, direction: null, reason: "cancel" };
}

/**
 * A cancelled pointer (pointercancel / touchcancel / lost capture) must never
 * commit and never change the selection, regardless of progress or velocity.
 */
export function resolvePointerCancel(): DragCommitDecision {
  return { commit: false, direction: null, reason: "cancel" };
}

export function completePageTurn(state: CurlState): CurlState {
  return {
    ...state,
    curlProgress: 1,
    isFlipping: false,
    fastFlipActive: false,
  };
}

export function cancelPageTurn(state: CurlState): CurlState {
  return {
    ...state,
    curlProgress: 0,
    isFlipping: false,
    fastFlipActive: false,
    fastFlipDirection: null,
  };
}

export function startFastFlip(state: CurlState, direction: "forward" | "backward"): CurlState {
  return {
    ...state,
    fastFlipActive: true,
    fastFlipDirection: direction,
    curlProgress: direction === "forward" ? 1 : 0,
  };
}

export function stopFastFlip(state: CurlState): CurlState {
  return {
    ...state,
    fastFlipActive: false,
    fastFlipDirection: null,
    curlProgress: 0,
  };
}

export interface CurlTransform {
  frontRotation: number;
  backRotation: number;
  shadowOpacity: number;
  nextPageReveal: number;
}

export function computeCurlTransform(progress: number): CurlTransform {
  const angle = progress * 180;
  const frontRotation = Math.min(angle, 90);
  const backRotation = Math.max(0, angle - 90);
  const shadowOpacity = 0.3 * Math.sin(progress * Math.PI);
  const nextPageReveal = Math.max(0, progress - 0.5) * 2;
  return { frontRotation, backRotation, shadowOpacity, nextPageReveal };
}