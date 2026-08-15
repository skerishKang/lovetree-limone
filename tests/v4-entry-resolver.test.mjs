import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  TREES_CARDINALITY_PATH,
  classifyTreesResponse,
  isCurrentResolverRequest,
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

  const importLine = page.indexOf("import V4EntryResolver");
  assert.ok(importLine !== -1, "page imports V4EntryResolver");

  // Target the ACTUAL JSX mount, not the import statement (which is captured
  // first by a naive indexOf("V4EntryResolver")).
  const resolverMount = page.indexOf("<V4EntryResolver");
  assert.ok(resolverMount !== -1, "page mounts V4EntryResolver as JSX");
  assert.ok(resolverMount > importLine, "JSX mount is distinct from the import");

  const startReturn = page.search(
    /if\s*\(start === "1"\)\s*\{[\s\S]*?return\s*<V4Landing\s*\/>;/
  );
  assert.ok(startReturn !== -1, "?start=1 immediately returns Landing");

  // Contract: in the ?start=1 path the resolver/cardinality caller must never
  // mount. The early return for ?start=1 precedes the resolver JSX mount, so the
  // cardinality API is bypassed for that path.
  assert.ok(
    startReturn < resolverMount,
    "?start=1 return precedes V4EntryResolver JSX mount (resolver never mounts for ?start=1)"
  );
});

test("stale principal race: old A response is rejected after principal becomes B", () => {
  const authority = { mounted: true, currentPrincipal: "A", requestSeq: 0 };
  const aSeq = (authority.requestSeq += 1); // A begins a request
  // Principal flips to B and B begins a fresh request.
  authority.currentPrincipal = "B";
  authority.requestSeq += 1; // B begins a request
  const bSeq = authority.requestSeq;

  // Stale A response resolving after the principal changed must not be
  // authoritative (no redirect, no state update).
  assert.equal(
    isCurrentResolverRequest({ authority, forUid: "A", capturedSeq: aSeq }),
    false,
    "stale A response must be rejected after principal became B"
  );
  // B's own response remains authoritative.
  assert.equal(
    isCurrentResolverRequest({ authority, forUid: "B", capturedSeq: bSeq }),
    true,
    "current principal B response is authoritative"
  );
});

test("unmount cancels any in-flight request (no redirect/state authority)", () => {
  const authority = { mounted: true, currentPrincipal: "A", requestSeq: 1 };
  const aSeq = 1;
  authority.mounted = false; // resolver unmounted before the response settles

  assert.equal(
    isCurrentResolverRequest({ authority, forUid: "A", capturedSeq: aSeq }),
    false,
    "unmounted resolver must not grant redirect/state authority to a stale response"
  );
});
