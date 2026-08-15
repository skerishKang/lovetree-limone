import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  TREES_CARDINALITY_PATH,
  classifyTreesResponse,
  resolveEntryRoute,
  resolveEntryStage,
} from "../lib/entry-resolver.ts";

test("?start=1 preserves landing and never resolves cardinality (pure)", () => {
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
  assert.deepEqual(
    resolveEntryRoute({ authLoading: true, authed: true, trees: [{ id: "t-1" }], fetchOk: true }),
    { kind: "landing" }
  );
});

test("anonymous stays on public landing", () => {
  assert.deepEqual(
    resolveEntryRoute({ authLoading: false, authed: false, trees: [], fetchOk: false }),
    { kind: "landing" }
  );
});

test("authenticated with zero trees routes to journey", () => {
  assert.deepEqual(
    resolveEntryRoute({ authLoading: false, authed: true, trees: [], fetchOk: true }),
    { kind: "redirect", path: "/v4/journey" }
  );
});

test("authenticated with exactly one tree routes to that tree", () => {
  assert.deepEqual(
    resolveEntryRoute({ authLoading: false, authed: true, trees: [{ id: "abc-123" }], fetchOk: true }),
    { kind: "redirect", path: "/trees/abc-123" }
  );
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
  assert.deepEqual(
    resolveEntryRoute({
      authLoading: false,
      authed: true,
      trees: [{ id: "t-1" }, { id: "t-2" }],
      fetchOk: true,
    }),
    { kind: "redirect", path: "/my-trees" }
  );
});

test("authenticated with more than two trees routes to my-trees", () => {
  assert.deepEqual(
    resolveEntryRoute({
      authLoading: false,
      authed: true,
      trees: [{ id: "t-1" }, { id: "t-2" }, { id: "t-3" }],
      fetchOk: true,
    }),
    { kind: "redirect", path: "/my-trees" }
  );
});

test("fetch/auth failure fails safe and never guesses a tree", () => {
  assert.deepEqual(
    resolveEntryRoute({ authLoading: false, authed: true, trees: [{ id: "t-1" }], fetchOk: false }),
    { kind: "landing" }
  );
});

test("single malformed tree row fails safe instead of guessing", () => {
  assert.deepEqual(
    resolveEntryRoute({ authLoading: false, authed: true, trees: [{}], fetchOk: true }),
    { kind: "landing" }
  );
});

test("shared cardinality path is the existing authenticated GET", () => {
  assert.equal(TREES_CARDINALITY_PATH, "/api/trees?limit=2");
});

test("resolveEntryStage: loading defers", () => {
  assert.equal(
    resolveEntryStage({ authLoading: true, uid: "A", resolvedUid: null, inflightUid: null }),
    "loading"
  );
});

test("resolveEntryStage: anonymous (no uid) does not run", () => {
  assert.equal(
    resolveEntryStage({ authLoading: false, uid: null, resolvedUid: null, inflightUid: null }),
    "anonymous"
  );
});

test("resolveEntryStage: already resolved for this principal does not re-run", () => {
  assert.equal(
    resolveEntryStage({ authLoading: false, uid: "A", resolvedUid: "A", inflightUid: null }),
    "resolved"
  );
});

test("resolveEntryStage: in-flight for this principal does not double-run", () => {
  assert.equal(
    resolveEntryStage({ authLoading: false, uid: "A", resolvedUid: null, inflightUid: "A" }),
    "inflight"
  );
});

test("resolveEntryStage: cancelled user A -> user B gets a fresh run", () => {
  const stage = resolveEntryStage({
    authLoading: false,
    uid: "B",
    resolvedUid: null,
    inflightUid: "A",
  });
  assert.equal(stage, "run");
});

test("resolveEntryStage: sign-out then sign-in resets principal scope", () => {
  assert.equal(
    resolveEntryStage({ authLoading: false, uid: null, resolvedUid: "A", inflightUid: "A" }),
    "anonymous"
  );
  assert.equal(
    resolveEntryStage({ authLoading: false, uid: "C", resolvedUid: null, inflightUid: null }),
    "run"
  );
});

test("resolveEntryStage: different resolved principal still runs for new principal", () => {
  assert.equal(
    resolveEntryStage({ authLoading: false, uid: "B", resolvedUid: "A", inflightUid: null }),
    "run"
  );
});

test("classifyTreesResponse: ok array payload is valid", () => {
  const result = classifyTreesResponse({
    responseOk: true,
    data: [{ id: "t-1" }],
    networkError: false,
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.trees, [{ id: "t-1" }]);
});

test("classifyTreesResponse: malformed 2xx (object) is recoverable failure, not zero trees", () => {
  const result = classifyTreesResponse({
    responseOk: true,
    data: { not: "an array" },
    networkError: false,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "malformed");
});

test("classifyTreesResponse: malformed 2xx (null/parse failure) is recoverable failure", () => {
  const result = classifyTreesResponse({ responseOk: true, data: null, networkError: false });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "malformed");
});

test("classifyTreesResponse: non-2xx http error is recoverable failure", () => {
  const result = classifyTreesResponse({ responseOk: false, data: [], networkError: false });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "http-error");
});

test("classifyTreesResponse: network error is recoverable failure", () => {
  const result = classifyTreesResponse({ responseOk: false, data: null, networkError: true });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "network");
});

test("malformed 2xx never reaches the zero-tree redirect path", () => {
  const result = classifyTreesResponse({ responseOk: true, data: { foo: "bar" }, networkError: false });
  assert.equal(result.ok, false);
  const resolution = resolveEntryRoute({
    authLoading: false,
    authed: true,
    trees: [],
    fetchOk: result.ok,
  });
  assert.deepEqual(resolution, { kind: "landing" });
});

test("?start=1 short-circuits before V4EntryResolver/cardinality is mounted", async () => {
  const page = await readFile(new URL("../app/v4/page.tsx", import.meta.url), "utf8");
  const startBranch = page.indexOf('if (start === "1")');
  const resolverUsage = page.indexOf("V4EntryResolver");
  assert.ok(startBranch !== -1, "page has a ?start=1 equality branch");
  assert.ok(resolverUsage !== -1, "page references V4EntryResolver");
  assert.ok(startBranch < resolverUsage, "?start=1 branch precedes resolver usage (API bypass)");
  assert.ok(
    /if \(start === "1"\)\s*\{\s*return <V4Landing \/>;/.test(page),
    "?start=1 returns Landing directly without the resolver"
  );
});
