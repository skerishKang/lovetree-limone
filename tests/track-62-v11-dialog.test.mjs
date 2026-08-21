import assert from "node:assert/strict";
import test from "node:test";

import {
  filterFocusable,
  isFocusableDescriptor,
  nextTrappedFocus,
  pickInitialFocus,
  planFocusRestore,
  wrapFocusIndex,
} from "../lib/track-62-v11/dialog.ts";

function descriptor(id, overrides = {}) {
  return { id, tag: "button", ...overrides };
}

test("isFocusableDescriptor: disabled/hidden/negative-tabindex are excluded", () => {
  assert.equal(isFocusableDescriptor(descriptor("a")), true);
  assert.equal(isFocusableDescriptor(descriptor("b", { disabled: true })), false);
  assert.equal(isFocusableDescriptor(descriptor("c", { hidden: true })), false);
  assert.equal(isFocusableDescriptor(descriptor("d", { tabIndex: -1 })), false);
  assert.equal(isFocusableDescriptor(descriptor("e", { tag: "span" })), false);
  assert.equal(isFocusableDescriptor(descriptor("f", { tag: "span", tabIndex: 0 })), true);
});

test("filterFocusable keeps source order and rejects non-arrays", () => {
  const list = [descriptor("a"), descriptor("b", { disabled: true }), descriptor("c")];
  assert.deepEqual(filterFocusable(list).map((item) => item.id), ["a", "c"]);
  assert.throws(() => filterFocusable("not-an-array"), TypeError);
});

test("wrapFocusIndex: Tab wraps last->first, Shift+Tab wraps first->last", () => {
  assert.equal(wrapFocusIndex(3, 2, 1), 0);
  assert.equal(wrapFocusIndex(3, 0, -1), 2);
  assert.equal(wrapFocusIndex(3, 1, 1), 2);
  assert.equal(wrapFocusIndex(1, 0, 1), 0);
  assert.equal(wrapFocusIndex(4, -1, 1), 0, "no active element: Tab enters the front");
  assert.equal(wrapFocusIndex(4, -1, -1), 3, "no active element: Shift+Tab enters the back");
  assert.throws(() => wrapFocusIndex(0, 0, 1), TypeError, "empty list fails closed");
});

test("pickInitialFocus: explicit autofocus wins, then first focusable, then container", () => {
  const first = descriptor("open-button");
  const auto = descriptor("close-button", { autoFocus: true });
  assert.deepEqual(pickInitialFocus([first, auto]), { kind: "element", id: "close-button" });
  assert.deepEqual(pickInitialFocus([descriptor("only")]), { kind: "element", id: "only" });
  assert.deepEqual(pickInitialFocus([]), { kind: "container" });
});

test("nextTrappedFocus keeps Tab and Shift+Tab inside the dialog", () => {
  const list = [descriptor("a"), descriptor("b"), descriptor("c")];
  assert.deepEqual(nextTrappedFocus(list, "c", 1), { kind: "element", id: "a" });
  assert.deepEqual(nextTrappedFocus(list, "a", -1), { kind: "element", id: "c" });
  assert.deepEqual(nextTrappedFocus(list, "b", 1), { kind: "element", id: "c" });
  // Active element lost (outside the list): re-enter deterministically.
  assert.deepEqual(nextTrappedFocus(list, "body", 1).id, "a");
  assert.deepEqual(nextTrappedFocus([], "a", 1), { kind: "container" });
});

test("planFocusRestore: trigger return, re-open guard, fallback", () => {
  // Normal close: trigger returns.
  assert.deepEqual(
    planFocusRestore({ triggerId: "t", dialogOpen: false, fallbackId: "f" }),
    { kind: "trigger" },
  );
  // Close landed on an already-reopened dialog: fall back instead of looping.
  assert.deepEqual(
    planFocusRestore({ triggerId: "t", dialogOpen: true, fallbackId: "f" }),
    { kind: "fallback" },
  );
  assert.deepEqual(
    planFocusRestore({ triggerId: null, dialogOpen: true, fallbackId: null }),
    { kind: "none" },
  );
  assert.deepEqual(
    planFocusRestore({ triggerId: null, dialogOpen: false, fallbackId: "f" }),
    { kind: "fallback" },
  );
  assert.deepEqual(
    planFocusRestore({ triggerId: null, dialogOpen: false, fallbackId: null }),
    { kind: "none" },
  );
});
