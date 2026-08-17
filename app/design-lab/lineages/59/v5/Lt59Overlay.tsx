"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import {
  FOCUSABLE_SELECTOR,
  FOCUS_ENTRY_ATTRIBUTE,
  nextFocusIndex,
  resolveFocusEntryIndex,
  resolveFocusRestoreTarget,
  shouldRecaptureFocus,
  shouldTrapTab,
} from "@/lib/lineage-59/focus-authority";

export interface Lt59OverlayProps {
  label: string;
  children: ReactNode;
  /** Escape / backdrop / close-button handler. Omit for a non-dismissible overlay. */
  onClose?: () => void;
  /** Element focus returns to when the overlay closes. Used when the overlay had no trigger. */
  restoreFocusFallbackRef?: React.RefObject<HTMLElement | null>;
  /** Rendered close affordance. Branch keeps it hidden because the choice is explicit. */
  showCloseButton?: boolean;
  className?: string;
  testId?: string;
}

function isFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute("disabled")) return false;
  if (element.getAttribute("aria-hidden") === "true") return false;
  const rects = element.getClientRects();
  return rects.length > 0;
}

/**
 * Modal overlay with a real focus lifecycle:
 * remember trigger → deterministic focus entry → Tab/Shift+Tab containment →
 * background focus-escape recapture → Escape close → trigger focus restore.
 * Closed overlays unmount, so they are neither interactive nor focusable.
 */
export default function Lt59Overlay({
  label,
  children,
  onClose,
  restoreFocusFallbackRef,
  showCloseButton = true,
  className,
  testId,
}: Lt59OverlayProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const restoredRef = useRef(false);

  const getFocusables = useCallback((): HTMLElement[] => {
    const panel = panelRef.current;
    if (!panel) return [];
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusable);
  }, []);

  // Remember the trigger, place deterministic focus entry, restore on unmount.
  useEffect(() => {
    const active = document.activeElement;
    triggerRef.current = active instanceof HTMLElement ? active : null;
    const fallback = restoreFocusFallbackRef?.current ?? null;

    const focusables = getFocusables();
    const entryIndex = resolveFocusEntryIndex(
      focusables.map((element) => ({
        isEntry: element.hasAttribute(FOCUS_ENTRY_ATTRIBUTE),
        focusable: true,
      })),
    );
    if (entryIndex >= 0) {
      focusables[entryIndex].focus();
    } else {
      panelRef.current?.focus();
    }

    return () => {
      if (restoredRef.current) return;
      restoredRef.current = true;
      const trigger = triggerRef.current;
      const target = resolveFocusRestoreTarget({
        hasTrigger: Boolean(trigger),
        triggerConnected: Boolean(trigger?.isConnected),
        triggerFocusable: trigger ? isFocusable(trigger) : false,
        hasFallback: Boolean(fallback),
      });
      if (target === "trigger") trigger?.focus();
      else if (target === "fallback") fallback?.focus();
    };
  }, [getFocusables, restoreFocusFallbackRef]);

  // Escape close + Tab containment, captured at document level so the handler
  // also works while focus sits on the panel itself.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!onClose) return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = getFocusables();
      if (focusables.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const active = document.activeElement;
      const current = active instanceof HTMLElement ? focusables.indexOf(active) : -1;
      if (!shouldTrapTab(current, focusables.length, event.shiftKey)) return;
      event.preventDefault();
      const next = nextFocusIndex(current, focusables.length, event.shiftKey);
      if (next >= 0) focusables[next].focus();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [getFocusables, onClose]);

  // Pull focus back if anything moves it outside the panel.
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = event.target;
      const inside = target instanceof Node && panel.contains(target);
      if (!shouldRecaptureFocus(inside, true)) return;
      const focusables = getFocusables();
      if (focusables.length > 0) focusables[0].focus();
      else panel.focus();
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [getFocusables]);

  return (
    <div
      className={`lt59-overlay${className ? ` ${className}` : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      data-testid={testId}
    >
      <div
        className="lt59-overlay__backdrop"
        onClick={onClose}
        data-lt59-backdrop="true"
        aria-hidden="true"
      />
      <div className="lt59-overlay__panel" ref={panelRef} tabIndex={-1}>
        {onClose && showCloseButton && (
          <button
            type="button"
            className="lt59-overlay__close"
            onClick={onClose}
            aria-label={`Close ${label}`}
          >
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
