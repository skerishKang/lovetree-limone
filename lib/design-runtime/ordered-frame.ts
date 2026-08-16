/**
 * P2 — Ordered Frame: narrow pure-core extraction from #141 after two-consumer
 * proof (Crystal Memory Atelier V3 / VideoFigure Atelier V2 as audited per
 * #141 P2 extraction audit).
 *
 * Renderer-neutral, React-neutral, DOM-neutral and LoveTree-domain-neutral.
 * This core handles ordered frame selection (wrap-normalized index, direct
 * select, previous/next, direction from horizontal delta). It composes P4's
 * `normalizeSelectionIndex` and `stepSelectionIndex` internally — the public
 * API is ordered-frame semantic, not generic selection.
 *
 * Excluded from this core (belong to Crystal, VideoFigure, P1, P3, P7, P8):
 *   - angle/expression dual state and ping-pong (Crystal)
 *   - Look progression, archive/filter semantics (VideoFigure)
 *   - pointer capture / cancel / drag activation (P1)
 *   - autoplay timer / resume / visibility (P3)
 *   - keyboard / focus / reduced-motion DOM policy (P7)
 *   - asset bytes / hash / decode / preload (P8)
 *   - TAU, FRONT_ANGLE, rotation↔index, snap geometry (P4 orbit boundary)
 */
import { normalizeSelectionIndex, stepSelectionIndex } from "./selection";

/**
 * Normalize an ordered-frame index into the valid `[0, count)` range.
 * Deviations: negative, out-of-range and large indices wrap.
 * NaN / ±Infinity / non-integer throw.
 */
export function orderedFrameIndex(index: number, count: number): number {
  return normalizeSelectionIndex(index, count, "wrap");
}

/**
 * Move the current ordered-frame selection forward by one step (wrap).
 * Equivalent to `stepFrame(current, +1, count)`.
 */
export function nextFrame(current: number, count: number): number {
  return stepSelectionIndex(current, 1, count, "wrap");
}

/**
 * Move the current ordered-frame selection backward by one step (wrap).
 * Equivalent to `stepFrame(current, -1, count)`.
 */
export function previousFrame(current: number, count: number): number {
  return stepSelectionIndex(current, -1, count, "wrap");
}

/**
 * Step the current ordered-frame selection by an integer delta (wrap).
 * Large positive/negative deltas wrap deterministically.
 */
export function stepFrame(
  current: number,
  delta: number,
  count: number,
): number {
  return stepSelectionIndex(current, delta, count, "wrap");
}

/**
 * Derive an ordered-frame direction (-1 | 0 | 1) from a horizontal delta.
 *
 * The caller explicitly declares the sign convention via `positiveDeltaDirection`:
 * - `deltaX` in CSS pixels (clientX difference).
 * - `positiveDeltaDirection` is the direction value returned when deltaX > 0.
 *   Pass -1 when rightward movement must decrement the index (common convention
 *   in Crystal and VideoFigure: stepDelta < 0 ? 1 : -1 / deltaX > 0 ? -1 : 1).
 *   Pass +1 when rightward movement must increment the index.
 * - `threshold` is the minimum absolute delta that triggers a non-zero
 *   direction (default 0 — every non-zero delta yields a direction).
 * - Returns `positiveDeltaDirection` for rightward movement,
 *   `-positiveDeltaDirection` for leftward, 0 when the delta is below
 *   threshold or zero (no direction).
 *
 * Fails closed:
 *   - NaN / ±Infinity deltaX → RangeError.
 *   - NaN / ±Infinity / negative threshold → RangeError.
 *   - threshold === 0 is explicitly allowed (no threshold).
 */
export function directionFromDelta(
  deltaX: number,
  positiveDeltaDirection: 1 | -1,
  threshold = 0,
): -1 | 0 | 1 {
  if (!Number.isFinite(deltaX)) {
    throw new RangeError("directionFromDelta: deltaX must be a finite number");
  }
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new RangeError(
      "directionFromDelta: threshold must be a non-negative finite number",
    );
  }
  if (Math.abs(deltaX) < threshold) return 0;
  if (deltaX === 0) return 0;
  return deltaX > 0 ? positiveDeltaDirection : -positiveDeltaDirection as -1 | 0 | 1;
}

/**
 * Select the item at `index` from a read-only ordered frame collection.
 * Returns `undefined` for an empty collection (there is nothing to select).
 * The input collection is never mutated.
 */
export function selectedFrame<T>(
  frames: readonly T[],
  index: number,
): T | undefined {
  if (frames.length === 0) return undefined;
  return frames[orderedFrameIndex(index, frames.length)];
}