import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanupExactRuntimeE2EResources,
  normalizeRuntimeE2EBaseUrl,
  verifyRuntimeE2EHealth,
} from "../scripts/lib/v4-runtime-e2e-operator.mjs";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const FIREBASE_PROJECT = "lovetree-runtime-e2e";

test("runtime E2E base URL normalization accepts only http(s)", () => {
  assert.equal(
    normalizeRuntimeE2EBaseUrl("https://lovetree-runtime-e2e-preview.example.test/"),
    "https://lovetree-runtime-e2e-preview.example.test"
  );
  assert.equal(
    normalizeRuntimeE2EBaseUrl("http://127.0.0.1:3000/e2e/"),
    "http://127.0.0.1:3000/e2e"
  );
  assert.throws(
    () => normalizeRuntimeE2EBaseUrl("file:///tmp/e2e"),
    /must use http or https/
  );
});

test("post-deploy Runtime E2E health passes only exact mutable isolated identity", async () => {
  const result = await verifyRuntimeE2EHealth({
    baseUrl: "https://lovetree-runtime-e2e-preview.example.test",
    expectedFirebaseProjectId: FIREBASE_PROJECT,
    fetchImpl: async (url, options) => {
      assert.equal(
        url,
        "https://lovetree-runtime-e2e-preview.example.test/api/health"
      );
      assert.equal(options.method, "GET");
      return jsonResponse({
        status: "ok",
        env: "e2e",
        e2e: {
          firebaseProjectId: FIREBASE_PROJECT,
          mutationsEnabled: true,
          databaseBinding: "approved",
        },
      });
    },
  });
  assert.deepEqual(result, {
    ok: true,
    baseUrl: "https://lovetree-runtime-e2e-preview.example.test",
    firebaseProjectId: FIREBASE_PROJECT,
    appEnv: "e2e",
    mutationsEnabled: true,
    databaseBinding: "approved",
  });
});

test("post-deploy Runtime E2E health fails closed on any identity mismatch", async () => {
  for (const body of [
    { status: "ok", env: "staging" },
    {
      status: "ok",
      env: "e2e",
      e2e: {
        firebaseProjectId: "relovetree",
        mutationsEnabled: true,
        databaseBinding: "approved",
      },
    },
    {
      status: "ok",
      env: "e2e",
      e2e: {
        firebaseProjectId: FIREBASE_PROJECT,
        mutationsEnabled: false,
        databaseBinding: "approved",
      },
    },
    {
      status: "ok",
      env: "e2e",
      e2e: {
        firebaseProjectId: FIREBASE_PROJECT,
        mutationsEnabled: true,
        databaseBinding: "unapproved",
      },
    },
  ]) {
    await assert.rejects(
      () =>
        verifyRuntimeE2EHealth({
          baseUrl: "https://lovetree-runtime-e2e-preview.example.test",
          expectedFirebaseProjectId: FIREBASE_PROJECT,
          fetchImpl: async () => jsonResponse(body),
        }),
      (error) => error?.code === "V4_RUNTIME_E2E_HEALTH_IDENTITY_FAILED"
    );
  }
});

test("exact Runtime E2E cleanup deletes Memory then Tree and verifies both IDs gone", async () => {
  const requests = [];
  const responses = [
    jsonResponse({ success: true }),
    jsonResponse({ success: true }),
    jsonResponse({ error: "Not found" }, 404),
    jsonResponse({ error: "Not found" }, 404),
  ];
  const result = await cleanupExactRuntimeE2EResources({
    baseUrl: "https://lovetree-runtime-e2e-preview.example.test",
    memoryId: "memory-exact-id",
    treeId: "tree-exact-id",
    idToken: "fixture-id-token",
    fetchImpl: async (url, options) => {
      requests.push({ url, method: options.method, authorization: options.headers.Authorization });
      return responses.shift();
    },
  });

  assert.deepEqual(
    requests.map(({ url, method }) => [method, url]),
    [
      ["DELETE", "https://lovetree-runtime-e2e-preview.example.test/api/memories/memory-exact-id"],
      ["DELETE", "https://lovetree-runtime-e2e-preview.example.test/api/trees/tree-exact-id"],
      ["GET", "https://lovetree-runtime-e2e-preview.example.test/api/memories/memory-exact-id"],
      ["GET", "https://lovetree-runtime-e2e-preview.example.test/api/trees/tree-exact-id"],
    ]
  );
  assert.equal(
    requests.every((entry) => entry.authorization === "Bearer fixture-id-token"),
    true
  );
  assert.deepEqual(result, {
    ok: true,
    memoryId: "memory-exact-id",
    treeId: "tree-exact-id",
    memoryDeleted: true,
    treeDeleted: true,
    memoryDeleteDisposition: "deleted",
    treeDeleteDisposition: "deleted",
    verifiedGone: true,
  });
});

test("exact Runtime E2E cleanup is idempotent when a previous attempt already deleted IDs", async () => {
  const responses = [
    jsonResponse({ error: "Not found" }, 404),
    jsonResponse({ error: "Not found" }, 404),
    jsonResponse({ error: "Not found" }, 404),
    jsonResponse({ error: "Not found" }, 404),
  ];
  const result = await cleanupExactRuntimeE2EResources({
    baseUrl: "https://lovetree-runtime-e2e-preview.example.test",
    memoryId: "memory-exact-id",
    treeId: "tree-exact-id",
    idToken: "fixture-id-token",
    fetchImpl: async () => responses.shift(),
  });
  assert.equal(result.memoryDeleteDisposition, "already-gone");
  assert.equal(result.treeDeleteDisposition, "already-gone");
  assert.equal(result.verifiedGone, true);
});

test("exact Runtime E2E cleanup fails closed before Tree deletion when Memory deletion fails", async () => {
  const requests = [];
  await assert.rejects(
    () =>
      cleanupExactRuntimeE2EResources({
        baseUrl: "https://lovetree-runtime-e2e-preview.example.test",
        memoryId: "memory-exact-id",
        treeId: "tree-exact-id",
        idToken: "fixture-id-token",
        fetchImpl: async (url, options) => {
          requests.push({ url, method: options.method });
          return jsonResponse({ error: "failure" }, 500);
        },
      }),
    (error) => error?.code === "V4_RUNTIME_E2E_EXACT_CLEANUP_FAILED"
  );
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "DELETE");
  assert.match(requests[0].url, /\/api\/memories\/memory-exact-id$/);
});

test("exact Runtime E2E cleanup fails closed when deletion cannot be verified", async () => {
  const responses = [
    jsonResponse({ success: true }),
    jsonResponse({ success: true }),
    jsonResponse({ id: "memory-exact-id" }, 200),
  ];
  await assert.rejects(
    () =>
      cleanupExactRuntimeE2EResources({
        baseUrl: "https://lovetree-runtime-e2e-preview.example.test",
        memoryId: "memory-exact-id",
        treeId: "tree-exact-id",
        idToken: "fixture-id-token",
        fetchImpl: async () => responses.shift(),
      }),
    (error) => error?.code === "V4_RUNTIME_E2E_EXACT_CLEANUP_UNVERIFIED"
  );
});
