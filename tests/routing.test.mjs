import assert from "node:assert/strict";
import test from "node:test";
import { readFile, stat } from "node:fs/promises";
import { matchRoute } from "../core/runtime/server/api/http.ts";
import { deterministicId } from "../core/runtime/server/api/trees.ts";

test("matchRoute extracts params", () => {
  const params = matchRoute("/api/trees/abc/memories", "/api/trees/:treeId/memories");
  assert.deepEqual(params, { treeId: "abc" });
});

test("matchRoute returns null for mismatched path", () => {
  assert.equal(matchRoute("/api/trees", "/api/trees/:id"), null);
  assert.equal(matchRoute("/api/trees/a/b", "/api/trees/:id"), null);
  assert.equal(matchRoute("/api/memories/1", "/api/trees/:id"), null);
});

test("matchRoute decodes URL params", () => {
  const params = matchRoute("/api/trees/hello%20world", "/api/trees/:id");
  assert.deepEqual(params, { id: "hello world" });
});

test("dev server route conflict resolved: api/trees.ts no longer at root", async () => {
  await assert.rejects(stat(new URL("../api/trees.ts", import.meta.url)));
  await stat(new URL("../core/runtime/server/api/trees.ts", import.meta.url));
});

test("worker references server api handler", async () => {
  const worker = await readFile(new URL("../core/runtime/worker/index.ts", import.meta.url), "utf8");
  assert.match(worker, /..\/server\/api/);
  assert.match(worker, /handleApiRequest/);
});

test("deterministicId is stable for same inputs", async () => {
  const a = await deterministicId("uid-1", "tree", "client-key");
  const b = await deterministicId("uid-1", "tree", "client-key");
  assert.equal(a, b);
});

test("deterministicId differs across users or keys", async () => {
  const userA = await deterministicId("uid-1", "tree", "client-key");
  const userB = await deterministicId("uid-2", "tree", "client-key");
  const keyB = await deterministicId("uid-1", "tree", "client-key-2");
  assert.notEqual(userA, userB);
  assert.notEqual(userA, keyB);
});

test("deterministicId is 32 hex chars", async () => {
  const id = await deterministicId("uid-1", "tree", "client-key");
  assert.match(id, /^[0-9a-f]{32}$/);
});
