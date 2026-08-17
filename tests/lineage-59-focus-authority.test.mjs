import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveFocusEntryIndex,
  nextFocusIndex,
  shouldTrapTab,
  shouldRecaptureFocus,
  resolveFocusRestoreTarget,
} from "../lib/lineage-59/focus-authority.ts";

test("focus-authority entry is the explicit entry target when present", () => {
  const candidates = [
    { focusable: true },
    { isEntry: true, focusable: true },
    { focusable: true },
  ];
  assert.equal(resolveFocusEntryIndex(candidates), 1);
});

test("focus-authority entry falls back to the first focusable element", () => {
  assert.equal(resolveFocusEntryIndex([{ focusable: true }, { focusable: true }]), 0);
});

test("focus-authority entry skips non-focusable candidates", () => {
  const candidates = [{ isEntry: true, focusable: false }, { focusable: true }];
  assert.equal(resolveFocusEntryIndex(candidates), 1);
});

test("focus-authority entry returns -1 when nothing is focusable", () => {
  assert.equal(resolveFocusEntryIndex([{ focusable: false }]), -1);
  assert.equal(resolveFocusEntryIndex([]), -1);
});

test("focus-authority tab wrapping stays inside the overlay", () => {
  assert.equal(nextFocusIndex(2, 3, false), 0, "forward Tab from last wraps to first");
  assert.equal(nextFocusIndex(0, 3, true), 2, "backward Tab from first wraps to last");
  assert.equal(nextFocusIndex(1, 3, false), 2);
  assert.equal(nextFocusIndex(1, 3, true), 0);
});

test("focus-authority shouldTrapTab only at the containment edges", () => {
  assert.equal(shouldTrapTab(0, 3, true), true, "Shift+Tab at first element must be trapped");
  assert.equal(shouldTrapTab(2, 3, false), true, "Tab at last element must be trapped");
  assert.equal(shouldTrapTab(1, 3, false), false);
  assert.equal(shouldTrapTab(1, 3, true), false);
  assert.equal(shouldTrapTab(-1, 3, false), true);
});

test("focus-authority recaptures focus that escapes an open overlay", () => {
  assert.equal(shouldRecaptureFocus(false, true), true);
  assert.equal(shouldRecaptureFocus(true, true), false);
  assert.equal(shouldRecaptureFocus(false, false), false);
});

test("focus-authority restore prefers the remembered trigger", () => {
  assert.equal(resolveFocusRestoreTarget({ hasTrigger: true, triggerConnected: true, triggerFocusable: true, hasFallback: true }), "trigger");
  assert.equal(resolveFocusRestoreTarget({ hasTrigger: true, triggerConnected: false, triggerFocusable: true, hasFallback: true }), "fallback");
  assert.equal(resolveFocusRestoreTarget({ hasTrigger: true, triggerConnected: true, triggerFocusable: false, hasFallback: true }), "fallback");
  assert.equal(resolveFocusRestoreTarget({ hasTrigger: false, triggerConnected: true, triggerFocusable: true, hasFallback: true }), "fallback");
  assert.equal(resolveFocusRestoreTarget({ hasTrigger: false, triggerConnected: false, triggerFocusable: false, hasFallback: false }), "none");
});
