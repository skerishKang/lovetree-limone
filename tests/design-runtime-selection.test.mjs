import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPositiveSelectionCount,
  normalizeSelectionIndex,
  selectedId,
  selectedItem,
  stepSelectionIndex,
} from "../lib/design-runtime/selection.ts";

test("selection core: invalid counts fail closed", () => {
  for (const bad of [0, -1, -100, 2.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(() => assertPositiveSelectionCount(bad), RangeError, `count ${bad} must throw`);
    assert.throws(() => normalizeSelectionIndex(0, bad, "wrap"), RangeError);
    assert.throws(() => stepSelectionIndex(0, 0, bad, "clamp"), RangeError);
  }
  assert.doesNotThrow(() => assertPositiveSelectionCount(1));
  assert.doesNotThrow(() => assertPositiveSelectionCount(3));
});

test("selection core: non-finite index input is rejected explicitly", () => {
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(() => normalizeSelectionIndex(bad, 5, "wrap"), RangeError, `index ${bad} must throw`);
    assert.throws(() => normalizeSelectionIndex(bad, 5, "clamp"), RangeError);
    assert.throws(() => stepSelectionIndex(bad, 1, 5, "wrap"), RangeError);
  }
});

test("selection core: wrap policy normalizes negative and out-of-range indices", () => {
  assert.equal(normalizeSelectionIndex(0, 5, "wrap"), 0);
  assert.equal(normalizeSelectionIndex(4, 5, "wrap"), 4);
  assert.equal(normalizeSelectionIndex(-1, 5, "wrap"), 4);
  assert.equal(normalizeSelectionIndex(5, 5, "wrap"), 0);
  assert.equal(normalizeSelectionIndex(7, 5, "wrap"), 2);
  assert.equal(normalizeSelectionIndex(-7, 5, "wrap"), 3);
});

test("selection core: clamp policy clamps at both bounds", () => {
  assert.equal(normalizeSelectionIndex(0, 5, "clamp"), 0);
  assert.equal(normalizeSelectionIndex(4, 5, "clamp"), 4);
  assert.equal(normalizeSelectionIndex(-1, 5, "clamp"), 0);
  assert.equal(normalizeSelectionIndex(-7, 5, "clamp"), 0);
  assert.equal(normalizeSelectionIndex(7, 5, "clamp"), 4);
  assert.equal(normalizeSelectionIndex(100, 5, "clamp"), 4);
});

test("selection core: fractional index input normalizes deterministically", () => {
  assert.equal(normalizeSelectionIndex(2.4, 5, "wrap"), 2);
  assert.equal(normalizeSelectionIndex(2.6, 5, "wrap"), 3);
  assert.equal(normalizeSelectionIndex(-0.5, 5, "wrap"), 0);
  assert.equal(normalizeSelectionIndex(2.4, 5, "clamp"), 2);
  assert.equal(normalizeSelectionIndex(2.6, 5, "clamp"), 3);
});

test("selection core: wrap and clamp are explicit and never mixed implicitly", () => {
  // Same out-of-range input, different explicit policies → different results.
  assert.equal(normalizeSelectionIndex(-1, 5, "wrap"), 4);
  assert.equal(normalizeSelectionIndex(-1, 5, "clamp"), 0);
  assert.equal(normalizeSelectionIndex(7, 5, "wrap"), 2);
  assert.equal(normalizeSelectionIndex(7, 5, "clamp"), 4);
  assert.equal(normalizeSelectionIndex(100, 5, "wrap"), 0);
  assert.equal(normalizeSelectionIndex(100, 5, "clamp"), 4);
});

test("selection core: step moves by integer delta", () => {
  assert.equal(stepSelectionIndex(2, 1, 5, "wrap"), 3);
  assert.equal(stepSelectionIndex(2, -1, 5, "wrap"), 1);
  assert.equal(stepSelectionIndex(0, -1, 5, "wrap"), 4);
  assert.equal(stepSelectionIndex(4, 1, 5, "wrap"), 0);
  assert.equal(stepSelectionIndex(2, 1, 5, "clamp"), 3);
  assert.equal(stepSelectionIndex(0, -1, 5, "clamp"), 0);
  assert.equal(stepSelectionIndex(4, 1, 5, "clamp"), 4);
});

test("selection core: step handles large positive and negative deltas", () => {
  assert.equal(stepSelectionIndex(2, 100, 5, "wrap"), 2);
  assert.equal(stepSelectionIndex(2, -103, 5, "wrap"), 4);
  assert.equal(stepSelectionIndex(2, 1000003, 5, "wrap"), 0);
  assert.equal(stepSelectionIndex(4, 50, 5, "clamp"), 4);
  assert.equal(stepSelectionIndex(0, -50, 5, "clamp"), 0);
});

test("selection core: step requires an integer delta", () => {
  for (const badDelta of [1.5, -0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => stepSelectionIndex(2, badDelta, 5, "wrap"), RangeError, `delta ${badDelta} must throw`);
  }
});

test("selection core: selectedItem derives deterministically without mutation", () => {
  const items = Object.freeze(["alpha", "beta", "gamma"]);
  assert.equal(selectedItem(items, 0, "wrap"), "alpha");
  assert.equal(selectedItem(items, 2, "wrap"), "gamma");
  assert.equal(selectedItem(items, 4, "wrap"), "beta");
  assert.equal(selectedItem(items, -1, "wrap"), "gamma");
  assert.equal(selectedItem(items, 5, "clamp"), "gamma");
  assert.equal(selectedItem(items, -1, "clamp"), "alpha");
  // Repeated derivation is deterministic and the frozen collection is untouched.
  assert.equal(selectedItem(items, 4, "wrap"), "beta");
  assert.deepEqual(items, ["alpha", "beta", "gamma"]);
});

test("selection core: empty collection yields undefined under any policy", () => {
  const empty = Object.freeze([]);
  assert.equal(selectedItem(empty, 0, "wrap"), undefined);
  assert.equal(selectedItem(empty, -1, "clamp"), undefined);
  assert.equal(selectedId(empty, 0, "wrap", (item) => item.id), undefined);
});

test("selection core: selectedId derives the selected item's id deterministically", () => {
  const items = Object.freeze([
    { id: "m1", label: "first" },
    { id: "m2", label: "second" },
    { id: "m3", label: "third" },
  ]);
  assert.equal(selectedId(items, 0, "wrap", (item) => item.id), "m1");
  assert.equal(selectedId(items, 5, "wrap", (item) => item.id), "m3");
  assert.equal(selectedId(items, -1, "wrap", (item) => item.id), "m3");
  assert.equal(selectedId(items, 5, "clamp", (item) => item.id), "m3");
  assert.equal(selectedId(items, -1, "clamp", (item) => item.id), "m1");
  // Deterministic: identical inputs produce identical ids.
  assert.equal(selectedId(items, 5, "wrap", (item) => item.id), "m3");
  assert.deepEqual(items, [
    { id: "m1", label: "first" },
    { id: "m2", label: "second" },
    { id: "m3", label: "third" },
  ]);
});
