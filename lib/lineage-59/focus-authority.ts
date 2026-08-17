/**
 * Dialog focus lifecycle authority for the Lineage 59 V5 modal overlays
 * (Index / Edit / Detail / Magnifier / Branch).
 *
 * The DOM-touching parts live in the overlay component; everything that can be
 * decided from a list of focusable candidates lives here so it is unit-testable
 * without a browser.
 */

/** Selector for elements that can hold focus inside an overlay panel. */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "video[controls]",
  "audio[controls]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Marks the element that should receive focus when an overlay opens. */
export const FOCUS_ENTRY_ATTRIBUTE = "data-lt59-focus-entry";

export interface FocusCandidate {
  /** Whether this element is marked as the deterministic entry target. */
  isEntry?: boolean;
  /** Whether this element can currently be focused (visible + enabled). */
  focusable?: boolean;
}

/**
 * Index of the element that must receive focus when the overlay opens.
 *
 * Focus entry is deterministic: the element explicitly marked as the entry
 * target wins, otherwise the first focusable element. Returns -1 when the panel
 * has nothing focusable, in which case the caller focuses the panel itself.
 */
export function resolveFocusEntryIndex(candidates: readonly FocusCandidate[]): number {
  const usable = (c: FocusCandidate) => c.focusable !== false;
  const entry = candidates.findIndex((c) => c.isEntry === true && usable(c));
  if (entry >= 0) return entry;
  return candidates.findIndex(usable);
}

/**
 * Next focus index for a Tab / Shift+Tab press, wrapping inside the overlay.
 * Wrapping is what keeps background content unreachable by keyboard.
 */
export function nextFocusIndex(current: number, count: number, backwards: boolean): number {
  if (count <= 0) return -1;
  if (current < 0) return backwards ? count - 1 : 0;
  const step = backwards ? -1 : 1;
  return (current + step + count) % count;
}

/**
 * True when a Tab press must be intercepted to keep focus inside the overlay.
 * Forward Tab from the last element and backward Tab from the first element
 * would otherwise escape into the background.
 */
export function shouldTrapTab(current: number, count: number, backwards: boolean): boolean {
  if (count <= 0) return true;
  if (current < 0) return true;
  return backwards ? current === 0 : current === count - 1;
}

/**
 * True when focus landed outside the overlay and must be pulled back in.
 * Guards against programmatic focus and pointer focus on background content.
 */
export function shouldRecaptureFocus(insidePanel: boolean, overlayOpen: boolean): boolean {
  return overlayOpen && !insidePanel;
}

export type FocusRestoreTarget = "trigger" | "fallback" | "none";

/**
 * Where focus goes after an overlay closes.
 *
 * The remembered trigger wins when it is still connected and focusable;
 * otherwise a deterministic fallback (the book surface) is used so focus is
 * never dropped to `document.body`. Overlays opened without a trigger — the
 * Branch auto-pause — restore to the fallback.
 */
export function resolveFocusRestoreTarget(input: {
  hasTrigger: boolean;
  triggerConnected: boolean;
  triggerFocusable?: boolean;
  hasFallback: boolean;
}): FocusRestoreTarget {
  const triggerUsable =
    input.hasTrigger && input.triggerConnected && input.triggerFocusable !== false;
  if (triggerUsable) return "trigger";
  if (input.hasFallback) return "fallback";
  return "none";
}
