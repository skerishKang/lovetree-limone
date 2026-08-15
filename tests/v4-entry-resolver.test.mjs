import assert from "node:assert/strict";
import test from "node:test";
import { resolveEntryRoute } from "../lib/entry-resolver.ts";

test("?start=1 preserves landing and never resolves cardinality", () => {
  const resolution = resolveEntryRoute({
    start: "1",
    authLoading: false,
    authed: true,
    trees: [{ id: "t-1" }],
    fetchOk: true,
  });
  assert.deepEqual(resolution, { kind: "landing" });
});

test("auth loading defers any routing decision", () => {
  const resolution = resolveEntryRoute({
    authLoading: true,
    authed: true,
    trees: [{ id: "t-1" }],
    fetchOk: true,
  });
  assert.deepEqual(resolution, { kind: "landing" });
});

test("anonymous stays on public landing", () => {
  const resolution = resolveEntryRoute({
    authLoading: false,
    authed: false,
    trees: [],
    fetchOk: false,
  });
  assert.deepEqual(resolution, { kind: "landing" });
});

test("authenticated with zero trees routes to journey", () => {
  const resolution = resolveEntryRoute({
    authLoading: false,
    authed: true,
    trees: [],
    fetchOk: true,
  });
  assert.deepEqual(resolution, { kind: "redirect", path: "/v4/journey" });
});

test("authenticated with exactly one tree routes to that tree", () => {
  const resolution = resolveEntryRoute({
    authLoading: false,
    authed: true,
    trees: [{ id: "abc-123" }],
    fetchOk: true,
  });
  assert.deepEqual(resolution, { kind: "redirect", path: "/trees/abc-123" });
});

test("tree id is url-encoded in redirect", () => {
  const resolution = resolveEntryRoute({
    authLoading: false,
    authed: true,
    trees: [{ id: "a b/c" }],
    fetchOk: true,
  });
  assert.equal(resolution.kind, "redirect");
  if (resolution.kind === "redirect") {
    assert.equal(resolution.path, "/trees/" + encodeURIComponent("a b/c"));
  }
});

test("authenticated with two trees routes to my-trees", () => {
  const resolution = resolveEntryRoute({
    authLoading: false,
    authed: true,
    trees: [{ id: "t-1" }, { id: "t-2" }],
    fetchOk: true,
  });
  assert.deepEqual(resolution, { kind: "redirect", path: "/my-trees" });
});

test("authenticated with more than two trees routes to my-trees", () => {
  const resolution = resolveEntryRoute({
    authLoading: false,
    authed: true,
    trees: [{ id: "t-1" }, { id: "t-2" }, { id: "t-3" }],
    fetchOk: true,
  });
  assert.deepEqual(resolution, { kind: "redirect", path: "/my-trees" });
});

test("fetch/auth failure fails safe and never guesses a tree", () => {
  const resolution = resolveEntryRoute({
    authLoading: false,
    authed: true,
    trees: [{ id: "t-1" }],
    fetchOk: false,
  });
  assert.deepEqual(resolution, { kind: "landing" });
});

test("single malformed tree row fails safe instead of guessing", () => {
  const resolution = resolveEntryRoute({
    authLoading: false,
    authed: true,
    trees: [{}],
    fetchOk: true,
  });
  assert.deepEqual(resolution, { kind: "landing" });
});
