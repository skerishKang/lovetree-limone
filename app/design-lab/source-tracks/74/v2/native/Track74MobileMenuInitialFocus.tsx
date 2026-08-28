"use client";

import { useEffect } from "react";

const NAV_LABEL = "LoveTree template menu";
const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Track74 route-local focus authority repair.
 *
 * The source-faithful portal toggles the mobile sheet's `inert` and
 * `aria-hidden` state in a React effect. Its original opener scheduled focus
 * in requestAnimationFrame, which can run before the sheet leaves the inert
 * subtree. Observe the authoritative `aria-hidden=false` transition instead
 * and move focus only after the sheet is interactable.
 */
export default function Track74MobileMenuInitialFocus() {
  useEffect(() => {
    const sheet = document.querySelector<HTMLElement>(
      `aside[aria-label="${NAV_LABEL}"]`,
    );
    if (!sheet) return;

    const focusFirstLiveLink = () => {
      if (sheet.inert || sheet.getAttribute("aria-hidden") !== "false") return;
      if (document.activeElement instanceof Element && sheet.contains(document.activeElement)) {
        return;
      }
      sheet.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
    };

    const observer = new MutationObserver(focusFirstLiveLink);
    observer.observe(sheet, {
      attributes: true,
      attributeFilter: ["aria-hidden"],
    });
    focusFirstLiveLink();

    return () => observer.disconnect();
  }, []);

  return null;
}
