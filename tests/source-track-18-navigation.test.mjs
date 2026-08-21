import assert from "node:assert/strict";
import test from "node:test";
import { buildTrack18CanonicalDestination, normalizeTrack18Authority } from "../lib/source-track-18/navigation.ts";

test("Track18 Enter fails closed unless both canonical IDs exist", () => {
  assert.equal(normalizeTrack18Authority({}), null);
  assert.equal(normalizeTrack18Authority({ treeId: "tree-1" }), null);
  assert.equal(normalizeTrack18Authority({ persistedMemoryId: "memory-1" }), null);
  assert.equal(normalizeTrack18Authority({ treeId: "   ", persistedMemoryId: "memory-1" }), null);
});

test("Track18 canonical destination is exact and encoded", () => {
  const authority = normalizeTrack18Authority({ treeId: "tree / α", persistedMemoryId: "memory?42" });
  assert.ok(authority);
  assert.equal(buildTrack18CanonicalDestination(authority), "/trees/tree%20%2F%20%CE%B1?highlight=memory%3F42");
});
