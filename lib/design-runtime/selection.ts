/**
 * P4 — Canonical Selection Synchronizer: narrow pure core.
 *
 * Issue #178 (Refs #141). Renderer-neutral, React-neutral, DOM-neutral and
 * LoveTree-domain-neutral. This is the first narrow runtime extraction from
 * #141: a single authoritative selected index, nothing else.
 *
 * Index-space only. This core never converts angles, rotations, drag deltas
 * or other spatial input into indices — that is a renderer/interaction
 * adapter concern and stays in the existing Orbit geometry code
 * (lib/v4-orbit-selection.ts). It holds no state: every function derives a
 * deterministic result from its inputs, so no surface can keep a second
 * parallel selected-state authority.
 *
 * Wrap and clamp are always explicit policies. The core never guesses which
 * policy a caller wants.
 */

export type SelectionPolicy = "wrap" | "clamp";

/**
 * Fail-closed guard for a selection collection size. Throws unless `count`
 * is a positive integer.
 */
export function assertPositiveSelectionCount(count: number): void {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError("selection count must be a positive integer");
  }
}

/**
 * Normalize an already-index-like value into a valid selection index.
 *
 * - `index` must be finite (NaN / ±Infinity throw).
 * - Fractional `index` values are rounded deterministically (Math.round) to
 *   the nearest integer index before the policy is applied.
 * - `policy === "wrap"`: negative and out-of-range indices wrap into
 *   `[0, count)`.
 * - `policy === "clamp"`: out-of-range indices clamp into `[0, count - 1]`.
 *
 * Wrap and clamp are mutually exclusive — the caller picks one.
 */
export function normalizeSelectionIndex(
  index: number,
  count: number,
  policy: SelectionPolicy,
): number {
  assertPositiveSelectionCount(count);
  if (!Number.isFinite(index)) {
    throw new RangeError("selection index must be a finite number");
  }
  const rounded = Math.round(index);
  if (policy === "wrap") {
    return ((rounded % count) + count) % count;
  }
  return Math.min(Math.max(rounded, 0), count - 1);
}

/**
 * Move the current selection by an integer `delta` and normalize the result
 * with the given explicit policy.
 *
 * - `delta` must be an integer (throws otherwise).
 * - `current` must be finite; it need not already be in range — the sum is
 *   normalized deterministically, so a stale/out-of-range current is brought
 *   back in range rather than corrupting the authority.
 * - Large positive/negative deltas are handled by the same explicit policy
 *   (wrap via modulo, clamp at the bounds).
 */
export function stepSelectionIndex(
  current: number,
  delta: number,
  count: number,
  policy: SelectionPolicy,
): number {
  assertPositiveSelectionCount(count);
  if (!Number.isInteger(delta)) {
    throw new RangeError("selection step delta must be an integer");
  }
  if (!Number.isFinite(current)) {
    throw new RangeError("selection index must be a finite number");
  }
  return normalizeSelectionIndex(current + delta, count, policy);
}

/**
 * Pure derivation of the selected item from a caller-supplied collection.
 * The collection is treated as read-only and is never mutated. An empty
 * collection deterministically yields `undefined` (there is nothing to
 * select). The count is derived from `items.length`, so the collection is
 * the single authority.
 */
export function selectedItem<T>(
  items: readonly T[],
  selectedIndex: number,
  policy: SelectionPolicy,
): T | undefined {
  if (items.length === 0) return undefined;
  return items[normalizeSelectionIndex(selectedIndex, items.length, policy)];
}

/**
 * Pure derivation of the selected item's id via `getId`. Deterministic for
 * identical inputs and collections. Empty collection yields `undefined`.
 */
export function selectedId<T>(
  items: readonly T[],
  selectedIndex: number,
  policy: SelectionPolicy,
  getId: (item: T) => string,
): string | undefined {
  const item = selectedItem(items, selectedIndex, policy);
  return item === undefined ? undefined : getId(item);
}
