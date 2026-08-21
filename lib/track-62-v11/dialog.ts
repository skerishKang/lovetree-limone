/**
 * Track62 V1.1 — Continuous Exhibition Rail: dialog focus lifecycle.
 *
 * Closes the source DIALOG_ACCESSIBILITY HOLD (Issue #159): the V1.1 viewer
 * keeps `role=dialog`/`aria-modal` but never moves focus in, traps nothing,
 * and does not return focus to the trigger.
 *
 * Pure core (renderer-agnostic descriptor model, fully unit-testable) +
 * thin DOM glue. Applies to the Viewer AND to modal-style menu/panels.
 */

export interface FocusableDescriptor {
  readonly id: string;
  readonly tag: string;
  readonly disabled?: boolean;
  readonly tabIndex?: number;
  readonly autoFocus?: boolean;
  readonly hidden?: boolean;
}

export type FocusCycleDirection = 1 | -1;

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  "select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function isFocusableDescriptor(descriptor: FocusableDescriptor): boolean {
  if (!descriptor || typeof descriptor !== "object") return false;
  if (descriptor.disabled === true) return false;
  if (descriptor.hidden === true) return false;
  if (typeof descriptor.tabIndex === "number" && descriptor.tabIndex < 0) return false;
  const tag = descriptor.tag.toLowerCase();
  if (tag === "a" || tag === "button" || tag === "input" || tag === "select" || tag === "textarea") return true;
  return typeof descriptor.tabIndex === "number";
}

/** All focusable descriptors in source order. */
export function filterFocusable(
  descriptors: ReadonlyArray<FocusableDescriptor>,
): ReadonlyArray<FocusableDescriptor> {
  if (!Array.isArray(descriptors)) {
    throw new TypeError("descriptors must be an array");
  }
  return descriptors.filter(isFocusableDescriptor);
}

/**
 * Wrapped next index: Tab at the last moves to the first, Shift+Tab at the
 * first moves to the last. Throws when the list is empty (fail closed).
 */
export function wrapFocusIndex(
  count: number,
  currentIndex: number,
  direction: FocusCycleDirection,
): number {
  if (!Number.isInteger(count) || count < 1) {
    throw new TypeError("count must be a positive integer");
  }
  const from = currentIndex < 0 ? (direction === 1 ? count - 1 : 0) : currentIndex;
  return ((from + direction) % count + count) % count;
}

/**
 * Pick the deterministic focus entry: the element explicitly marked
 * autofocus if present, otherwise the first focusable element, otherwise
 * the dialog container itself (via its -1 tabIndex).
 */
export function pickInitialFocus(
  descriptors: ReadonlyArray<FocusableDescriptor>,
): { kind: "element"; id: string } | { kind: "container" } {
  const focusable = filterFocusable(descriptors);
  const auto = focusable.find((descriptor) => descriptor.autoFocus === true);
  if (auto) return { kind: "element", id: auto.id };
  const first = focusable[0];
  if (first) return { kind: "element", id: first.id };
  return { kind: "container" };
}

/**
 * Containment step. If the currently active descriptor is not in the list,
 * wrap from an edge instead of escaping the dialog.
 */
export function nextTrappedFocus(
  descriptors: ReadonlyArray<FocusableDescriptor>,
  activeId: string | null,
  direction: FocusCycleDirection,
): { kind: "element"; id: string } | { kind: "container" } {
  const focusable = filterFocusable(descriptors);
  if (focusable.length === 0) return { kind: "container" };
  const index = activeId === null ? -1 : focusable.findIndex((descriptor) => descriptor.id === activeId);
  if (index === -1) {
    const entry = pickInitialFocus(focusable);
    return entry;
  }
  const next = wrapFocusIndex(focusable.length, index, direction);
  return { kind: "element", id: focusable[next]!.id };
}

/**
 * Restore planning: after close, return focus to the original trigger.
 * Fail closed on reopen: if the restore target still belongs to the dialog
 * (the dialog is open again or the trigger vanished), fall back to a
 * declared safe element. This is what makes "restore does not re-open the
 * dialog" provable.
 */
export function planFocusRestore(options: {
  readonly triggerId: string | null;
  readonly dialogOpen: boolean;
  readonly fallbackId: string | null;
}): { kind: "trigger" } | { kind: "fallback" } | { kind: "none" } {
  if (options.dialogOpen) {
    return options.fallbackId ? { kind: "fallback" } : { kind: "none" };
  }
  if (options.triggerId) return { kind: "trigger" };
  if (options.fallbackId) return { kind: "fallback" };
  return { kind: "none" };
}

/* ------------------------------------------------------------------ */
/* DOM glue (thin; behavior proven in browser QA, pure logic above)    */
/* ------------------------------------------------------------------ */

export function describeElement(element: Element): FocusableDescriptor {
  const html = element as HTMLElement;
  const tabIndexRaw = html.getAttribute?.("tabindex");
  return {
    id: html.id || html.getAttribute?.("data-focus-id") || "",
    tag: element.tagName.toLowerCase(),
    disabled: (html as HTMLButtonElement).disabled === true || html.getAttribute?.("aria-disabled") === "true",
    tabIndex: tabIndexRaw === null ? undefined : Number.parseInt(tabIndexRaw, 10),
    autoFocus: html.hasAttribute?.("autofocus") === true || html.getAttribute?.("data-autofocus") === "true",
    hidden:
      html.hidden === true ||
      html.getAttribute?.("aria-hidden") === "true" ||
      (html.style?.visibility === "hidden") === true,
  };
}

export function focusableElements(root: Document | Element): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => isFocusableDescriptor(describeElement(element)),
  );
}

/** Move focus into the dialog; returns the focused element or the container. */
export function enterDialogFocus(dialog: HTMLElement): HTMLElement {
  const candidates = focusableElements(dialog);
  const auto = candidates.find((element) => describeElement(element).autoFocus);
  const target = auto ?? candidates[0] ?? dialog;
  if (target === dialog && !dialog.hasAttribute("tabindex")) {
    dialog.setAttribute("tabindex", "-1");
  }
  target.focus({ preventScroll: true });
  return target;
}

/** Restore focus, guarded against reopening the dialog. */
export function restoreDialogFocus(options: {
  readonly trigger: HTMLElement | null;
  readonly dialogOpen: boolean;
  readonly fallback: HTMLElement | null;
}): HTMLElement | null {
  const plan = planFocusRestore({
    triggerId: options.trigger ? "trigger" : null,
    dialogOpen: options.dialogOpen,
    fallbackId: options.fallback ? "fallback" : null,
  });
  if (plan.kind === "trigger" && options.trigger && options.trigger.isConnected) {
    options.trigger.focus({ preventScroll: true });
    return options.trigger;
  }
  if (plan.kind === "fallback" && options.fallback && options.fallback.isConnected) {
    options.fallback.focus({ preventScroll: true });
    return options.fallback;
  }
  return null;
}
