import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  FIRST_CREATE_ENDPOINT,
  PENDING_CLIENT_KEY,
  createFirstTree,
  resolveFirstCreateIds,
} from "../lib/first-tree-create-client.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const DUAL_ID_BODY = { tree: { id: "tree-1" }, memory: { id: "memory-1" } };

function mockStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    dump: () => Object.fromEntries(map),
  };
}

function mockFetch({ status = 200, body = {} } = {}) {
  const calls = [];
  const fn = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
  fn.calls = calls;
  return fn;
}

const basePayload = {
  title: "주연에게 마음이 멈춘 순간들",
  visibility: "public",
  memory: { title: "처음 마음이 멈춘 장면", memo: "첫 순간", source: "YouTube", sourceUrl: "https://youtu.be/dQw4w9WgXcQ" },
};

test("no existing key creates a stable clientKey before the first POST and persists it", async () => {
  const storage = mockStorage();
  const inner = mockFetch({ body: DUAL_ID_BODY });
  let keyAtPostTime = null;
  const fetchFn = async (url, options) => {
    keyAtPostTime = storage.getItem(PENDING_CLIENT_KEY);
    return inner(url, options);
  };

  const result = await createFirstTree({ payload: basePayload, storage, fetchFn });

  assert.equal(inner.calls.length, 1);
  assert.equal(inner.calls[0].url, FIRST_CREATE_ENDPOINT);
  const sent = JSON.parse(inner.calls[0].options.body);
  assert.equal(typeof sent.clientKey, "string");
  assert.ok(sent.clientKey.length > 0, "clientKey must be a non-empty stable value");
  assert.equal(sent.title, basePayload.title);
  assert.equal(sent.memory.title, basePayload.memory.title);
  assert.ok(keyAtPostTime !== null, "pending key must exist before the first POST attempt");
  assert.equal(keyAtPostTime, sent.clientKey, "persisted pending key must be the key sent on the POST");
  assert.equal(storage.getItem(PENDING_CLIENT_KEY), null, "pending key cleared after dual-ID success");
  assert.deepEqual(result, { treeId: "tree-1", memoryId: "memory-1" });
});

test("retry reuses the same pending clientKey — never a fresh random key per attempt", async () => {
  const storage = mockStorage({ [PENDING_CLIENT_KEY]: "pending-key-retry" });
  const fetchFn = mockFetch({ body: DUAL_ID_BODY });

  const result = await createFirstTree({ payload: basePayload, storage, fetchFn });

  const sent = JSON.parse(fetchFn.calls[0].options.body);
  assert.equal(sent.clientKey, "pending-key-retry");
  assert.deepEqual(result, { treeId: "tree-1", memoryId: "memory-1" });
});

test("HTTP failure keeps the pending clientKey for retry", async () => {
  const storage = mockStorage({ [PENDING_CLIENT_KEY]: "pending-key-http-500" });
  const fetchFn = mockFetch({ status: 500, body: { error: "server exploded" } });

  await assert.rejects(createFirstTree({ payload: basePayload, storage, fetchFn }), /server exploded/);
  assert.equal(storage.getItem(PENDING_CLIENT_KEY), "pending-key-http-500", "pending key must survive HTTP failure");
});

test("response missing tree.id is not success and keeps the pending key", async () => {
  const storage = mockStorage({ [PENDING_CLIENT_KEY]: "pending-key-no-tree" });
  const fetchFn = mockFetch({ body: { memory: { id: "memory-1" } } });

  await assert.rejects(createFirstTree({ payload: basePayload, storage, fetchFn }), /저장하지 못했어요/);
  assert.equal(storage.getItem(PENDING_CLIENT_KEY), "pending-key-no-tree", "partial response must keep the pending key");
});

test("response missing memory.id is not success and keeps the pending key", async () => {
  const storage = mockStorage({ [PENDING_CLIENT_KEY]: "pending-key-no-memory" });
  const fetchFn = mockFetch({ body: { tree: { id: "tree-1" } } });

  await assert.rejects(createFirstTree({ payload: basePayload, storage, fetchFn }), /저장하지 못했어요/);
  assert.equal(storage.getItem(PENDING_CLIENT_KEY), "pending-key-no-memory", "partial response must keep the pending key");
});

test("HTTP 2xx alone is never success — empty body is not success and keeps the key", async () => {
  const storage = mockStorage({ [PENDING_CLIENT_KEY]: "pending-key-empty" });
  const fetchFn = mockFetch({ body: {} });

  await assert.rejects(createFirstTree({ payload: basePayload, storage, fetchFn }), /저장하지 못했어요/);
  assert.equal(storage.getItem(PENDING_CLIENT_KEY), "pending-key-empty");
});

test("dual IDs present is the only success and clears the pending key", async () => {
  const storage = mockStorage({ [PENDING_CLIENT_KEY]: "pending-key-dual" });
  const fetchFn = mockFetch({ body: DUAL_ID_BODY });

  const result = await createFirstTree({ payload: basePayload, storage, fetchFn });

  assert.deepEqual(result, { treeId: "tree-1", memoryId: "memory-1" });
  assert.equal(storage.getItem(PENDING_CLIENT_KEY), null, "pending key must be cleared only after dual-ID success");
});

test("resolveFirstCreateIds enforces the dual-ID decision directly", () => {
  assert.deepEqual(resolveFirstCreateIds({ tree: { id: "t" }, memory: { id: "m" } }), { treeId: "t", memoryId: "m" });
  assert.throws(() => resolveFirstCreateIds({ tree: { id: "t" } }), /저장하지 못했어요/);
  assert.throws(() => resolveFirstCreateIds({ memory: { id: "m" } }), /저장하지 못했어요/);
  assert.throws(() => resolveFirstCreateIds({}), /저장하지 못했어요/);
});

test("the helper targets exactly POST /api/trees/with-first-memory", async () => {
  assert.equal(FIRST_CREATE_ENDPOINT, "/api/trees/with-first-memory");
  const source = await read("lib/first-tree-create-client.ts");
  assert.match(source, /FIRST_CREATE_ENDPOINT = "\/api\/trees\/with-first-memory"/);
  const storage = mockStorage();
  const fetchFn = mockFetch({ body: DUAL_ID_BODY });
  await createFirstTree({ payload: basePayload, storage, fetchFn });
  assert.equal(fetchFn.calls.length, 1);
  assert.equal(fetchFn.calls[0].url, "/api/trees/with-first-memory");
  assert.equal(fetchFn.calls[0].options.method, "POST");
});

test("V4Landing consumes the full seam with explicit authenticated transport", async () => {
  const landing = await read("app/components/v4/V4Landing.tsx");
  assert.match(landing, /createFirstTree\(/);
  assert.match(landing, /fetchFn:\s*apiFetch/);
  assert.match(landing, /lovetree-v4-product-spine-last-tree-id/);
  assert.match(landing, /localStorage\.setItem\(LAST_TREE_KEY, treeId\)/);
  assert.match(landing, /router\.push\(`\/trees\/\$\{encodeURIComponent\(treeId\)\}\?highlight=\$\{encodeURIComponent\(memoryId\)\}`\)/);
  assert.doesNotMatch(landing, /lovetree-v4-product-spine-create-client-key/, "pending-key literal must live only in the seam");
  assert.doesNotMatch(landing, /localStorage\.removeItem\(CLIENT_KEY\)/, "key-clear lifecycle must live only in the seam");
  assert.doesNotMatch(landing, /getOrCreateClientKey\(/, "no duplicated inline key creator in V4Landing");
  assert.doesNotMatch(landing, /apiFetch\("\/api\/trees\/with-first-memory"/, "no direct canonical POST in V4Landing");
  assert.doesNotMatch(landing, /localStorage\.setItem\([^,]+,\s*JSON\.stringify/);
});

test("the seam defaults to authenticated transport, never unauthenticated global fetch", async () => {
  const source = await read("lib/first-tree-create-client.ts");
  assert.match(source, /import \{ apiFetch \} from "\.\/api"/);
  assert.match(source, /fetchFn = options\.fetchFn \?\? apiFetch/);
  assert.doesNotMatch(source, /\?\? fetch\)/, "real product path must not silently default to unauthenticated fetch");
  assert.doesNotMatch(source, /fetchFn = options\.fetchFn \?\? fetch/);
});

test("the seam owns the pending clientKey lifecycle", async () => {
  const seam = await read("lib/first-tree-create-client.ts");
  assert.match(seam, /PENDING_CLIENT_KEY = "lovetree-v4-product-spine-create-client-key"/);
  assert.match(seam, /function getOrCreateClientKey\(storage: Storage\)/);
  assert.match(seam, /removeItem\(PENDING_CLIENT_KEY\)/);
  assert.match(seam, /getOrCreateClientKey\(storage\)/);
});
