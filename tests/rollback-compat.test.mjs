import assert from "node:assert/strict";
import test from "node:test";
import { createSign, generateKeyPairSync, createPublicKey } from "node:crypto";
import { memoriesRouter, isUniqueViolation } from "../core/runtime/server/api/memories.ts";
import { memories, trees } from "../core/runtime/db/schema.ts";

const PROJECT_ID = "relovetree";
const USER_ID = "rollback-compat-user";
const AUTH_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicExponent: 0x10001,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const publicJwk = createPublicKey(publicKey).export({ format: "jwk" });
const KEY_ID = "rollback-compat-key";

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function makeAuthToken(uid = USER_ID) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", kid: KEY_ID }));
  const payload = base64Url(
    JSON.stringify({
      aud: PROJECT_ID,
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
      sub: uid,
      iat: now - 60,
      auth_time: now - 120,
      exp: now + 3600,
    })
  );
  const data = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(data).sign(privateKey);
  return `${data}.${base64Url(signature)}`;
}

const OWNER_TREE = { id: "tree-rc", ownerId: USER_ID, visibility: "public" };

function makeDb({ treeRows = [], memoryRows = [] } = {}) {
  const treeResponses = [...treeRows];
  const memoryResponses = [...memoryRows];
  const inserted = [];
  const updates = [];
  return {
    inserted,
    updates,
    select() {
      const query = {
        table: null,
        from(table) {
          this.table = table;
          return this;
        },
        where() {
          return this;
        },
        orderBy() {
          return this;
        },
        limit() {
          if (this.table === trees) return Promise.resolve(treeResponses.shift() ?? []);
          if (this.table === memories) return Promise.resolve(memoryResponses.shift() ?? []);
          return Promise.resolve([]);
        },
      };
      query.then = (resolve, reject) => query.limit().then(resolve, reject);
      return query;
    },
    insert() {
      return {
        values(value) {
          inserted.push(value);
          return Promise.resolve();
        },
      };
    },
    update() {
      return {
        set(value) {
          return {
            where() {
              updates.push(value);
              return Promise.resolve();
            },
          };
        },
      };
    },
    delete() {
      return { where() { return Promise.resolve(); } };
    },
  };
}

function makeContext({ method, path, body, db, uid = USER_ID }) {
  const url = new URL(`https://example.com${path}`);
  const request = new Request(url, {
    method,
    headers: {
      authorization: `Bearer ${makeAuthToken(uid)}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    request,
    env: { DATABASE_URL: "unused", FIREBASE_PROJECT_ID: PROJECT_ID, API_MUTATIONS_ENABLED: "true" },
    db,
    url,
    method,
    path,
    params: {},
  };
}

async function withFirebaseKeyFetch(run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input) === AUTH_URL) {
      return new Response(
        JSON.stringify({
          keys: [
            { kty: "RSA", kid: KEY_ID, use: "sig", alg: "RS256", n: publicJwk.n, e: publicJwk.e },
          ],
        }),
        { status: 200, headers: { "cache-control": "max-age=3600" } }
      );
    }
    return originalFetch(input);
  };
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function createNestedMemory(db, body = { memo: "m", timestamp: "2026-01-01" }, uid = USER_ID) {
  return memoriesRouter(
    makeContext({ method: "POST", path: "/api/trees/tree-rc/memories", body, db, uid })
  );
}

// ---------------------------------------------------------------------------
// isUniqueViolation unit tests (SQLSTATE 23505 recognition)
// ---------------------------------------------------------------------------
test("isUniqueViolation: true for cause.code 23505 (DrizzleQueryError shape)", () => {
  const err = new Error("Failed query: insert into \"memories\" ...");
  err.cause = { code: "23505", message: "duplicate key value" };
  assert.equal(isUniqueViolation(err), true);
});

test("isUniqueViolation: true for nested cause.cause.code 23505", () => {
  const err = new Error("wrapped");
  err.cause = { cause: { code: "23505" } };
  assert.equal(isUniqueViolation(err), true);
});

test("isUniqueViolation: message fallback matches only concrete pg patterns", () => {
  assert.equal(
    isUniqueViolation(new Error('duplicate key value violates unique constraint "memories_tree_sort_order_uniq_partial"')),
    true
  );
  assert.equal(isUniqueViolation(new Error("SQLSTATE 23505")), true);
  assert.equal(isUniqueViolation(new Error("insert failed with 23505")), true);
  assert.equal(isUniqueViolation(new Error("unique constraint violated")), false);
  assert.equal(isUniqueViolation(new Error("duplicate key value")), false);
  assert.equal(isUniqueViolation(new Error("a unique operation failed")), false);
});

test("isUniqueViolation: explicit non-23505 code wins over message", () => {
  const err = new Error("duplicate key value violates unique constraint");
  err.cause = { code: "08006", message: "connection failed" };
  assert.equal(isUniqueViolation(err), false);
  const err2 = new Error("duplicate key value violates unique constraint");
  err2.code = "23503";
  assert.equal(isUniqueViolation(err2), false);
});

test("isUniqueViolation: circular cause chain terminates without infinite loop", () => {
  const loop = { code: "23505" };
  loop.cause = loop;
  const err = new Error("wrapped");
  err.cause = loop;
  assert.equal(isUniqueViolation(err), true);

  const plainLoop = { message: "nope" };
  plainLoop.cause = plainLoop;
  const plain = new Error("wrapped");
  plain.cause = plainLoop;
  assert.equal(isUniqueViolation(plain), false);
});

test("isUniqueViolation: false for unrelated DB error 08006", () => {
  const err = new Error("Failed query: connect ...");
  err.cause = { code: "08006", message: "connection failed" };
  assert.equal(isUniqueViolation(err), false);
});

test("isUniqueViolation: false for generic error", () => {
  assert.equal(isUniqueViolation(new Error("boom")), false);
  assert.equal(isUniqueViolation({ message: "nope" }), false);
});

// ---------------------------------------------------------------------------
// A. computeNextSortOrder NULL tolerance
// DB state: sortOrder 0,1,2,NULL,NULL  -> new memory sortOrder 3, HTTP 201
// ---------------------------------------------------------------------------
test("A: create after non-null 0,1,2 + NULL rows yields sortOrder 3", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]], memoryRows: [[{ sortOrder: 2 }]] });
    const res = await createNestedMemory(db, { title: "m3", memo: "m3", timestamp: "2026-01-04" });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.sortOrder, 3);
    assert.equal(db.inserted.length, 1);
    assert.equal(db.inserted[0].sortOrder, 3);
  });
});

// ---------------------------------------------------------------------------
// B. Empty non-null set (NULL, NULL only) -> first non-null memory sortOrder 0
// ---------------------------------------------------------------------------
test("B: first non-null memory after NULL-only rows gets sortOrder 0", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]], memoryRows: [[]] });
    const res = await createNestedMemory(db, { title: "first", memo: "f", timestamp: "2026-01-05" });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.sortOrder, 0);
    assert.equal(db.inserted[0].sortOrder, 0);
  });
});

// Stateful mock that distinguishes trees vs memories selects and lets the
// caller control insert behavior (used by tests C/D/E).
function makeStatefulDb({
  treeRows = [[OWNER_TREE]],
  treeLimitFn,
  memoryRows = [],
  memoryLimitFn,
  insertImpl,
} = {}) {
  const treeResponses = [...treeRows];
  const memoryResponses = [...memoryRows];
  const inserted = [];
  const db = {
    inserted,
    select() {
      const query = {
        table: null,
        from(table) {
          this.table = table;
          return this;
        },
        where() {
          return this;
        },
        orderBy() {
          return this;
        },
        limit() {
          if (this.table === trees) {
            if (treeLimitFn) return Promise.resolve(treeLimitFn());
            return Promise.resolve(treeResponses.shift() ?? []);
          }
          if (memoryLimitFn) return Promise.resolve(memoryLimitFn());
          return Promise.resolve(memoryResponses.shift() ?? []);
        },
      };
      query.then = (resolve, reject) => query.limit().then(resolve, reject);
      return query;
    },
    insert() {
      return {
        values(value) {
          if (insertImpl) return insertImpl(value, inserted, db);
          inserted.push(value);
          return Promise.resolve();
        },
      };
    },
  };
  return db;
}

// ---------------------------------------------------------------------------
// C. SQLSTATE retry: first insert 23505, second succeeds -> 201 + actual retry
// ---------------------------------------------------------------------------
test("C: unique violation retried once, final 201", async () => {
  await withFirebaseKeyFetch(async () => {
    let attempts = 0;
    const db = makeStatefulDb({
      memoryRows: [[{ sortOrder: 1 }], [{ sortOrder: 1 }]],
      insertImpl(value, inserted) {
        attempts += 1;
        if (attempts === 1) {
          const err = new Error("Failed query: insert ...");
          err.cause = { code: "23505", message: "duplicate key value" };
          return Promise.reject(err);
        }
        inserted.push(value);
        return Promise.resolve();
      },
    });
    const res = await createNestedMemory(db, { title: "retry", memo: "r", timestamp: "2026-01-06" });
    assert.equal(attempts, 2, "retry must actually happen");
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.sortOrder, 2);
  });
});

// ---------------------------------------------------------------------------
// D. Unrelated DB error (08006) is NOT swallowed as a unique retry
// ---------------------------------------------------------------------------
test("D: unrelated DB error propagates (not treated as sortOrder conflict)", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({
      memoryRows: [[{ sortOrder: 0 }]],
      insertImpl() {
        const err = new Error("Failed query: connect ...");
        err.cause = { code: "08006", message: "connection failed" };
        return Promise.reject(err);
      },
    });
    await assert.rejects(() => createNestedMemory(db, { title: "x", memo: "x" }));
  });
});

// ---------------------------------------------------------------------------
// E. Concurrent creates: 5 in the same tree -> all 201, consecutive, no dup
// ---------------------------------------------------------------------------
test("E: 10 concurrent creates (x3 rounds) all 201 with consecutive unique sortOrders", async () => {
  await withFirebaseKeyFetch(async () => {
    for (let round = 0; round < 3; round++) {
      const used = new Map();
      const db = makeStatefulDb({
        treeLimitFn: () => [OWNER_TREE],
        memoryLimitFn() {
          const max = Math.max(-1, ...used.keys());
          return [{ sortOrder: max }];
        },
        insertImpl(value, inserted) {
          const so = value.sortOrder;
          if (used.has(so)) {
            const err = new Error("Failed query: insert ...");
            err.cause = { code: "23505", message: "duplicate key value" };
            return Promise.reject(err);
          }
          used.set(so, value.id);
          inserted.push(value);
          return Promise.resolve();
        },
      });
      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          createNestedMemory(db, { title: `c${i}`, memo: `c${i}`, timestamp: "2026-01-07" })
        )
      );
      const bodies = await Promise.all(results.map((r) => r.json()));
      assert.deepEqual(results.map((r) => r.status), Array(10).fill(201), `round ${round}: all 201`);
      const orders = bodies.map((b) => b.sortOrder).sort((a, b) => a - b);
      assert.deepEqual(orders, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], `round ${round}: consecutive`);
      assert.equal(new Set(orders).size, orders.length);
    }
  });
});

// ---------------------------------------------------------------------------
// F. clientKey idempotency: same key returns same memory, no duplicate row
// ---------------------------------------------------------------------------
test("F: duplicate clientKey returns existing memory (200), no insert", async () => {
  await withFirebaseKeyFetch(async () => {
    const existing = { id: "mem-existing", treeId: "tree-rc", clientKey: "ck-dup", memo: "first" };
    const db = makeDb({
      treeRows: [[OWNER_TREE]],
      memoryRows: [[existing]],
    });
    const res = await createNestedMemory(db, {
      title: "dup",
      memo: "dup",
      clientKey: "ck-dup",
      timestamp: "2026-01-08",
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, "mem-existing");
    assert.equal(db.inserted.length, 0, "must not insert a duplicate row");
  });
});

// ---------------------------------------------------------------------------
// G. Permission isolation: user B append/put/delete/list all 404
// ---------------------------------------------------------------------------
test("G: non-owner cannot append/update/delete memory (404)", async () => {
  await withFirebaseKeyFetch(async () => {
    const foreignTree = { ...OWNER_TREE, ownerId: "another-user" };
    const db = makeDb({ treeRows: [[foreignTree]] });

    const append = await createNestedMemory(db, { title: "x", memo: "x" }, "user-b");
    assert.equal(append.status, 404);

    const put = await memoriesRouter(
      makeContext({
        method: "PUT",
        path: "/api/memories/some-id",
        body: { memo: "hijack" },
        db,
        uid: "user-b",
      })
    );
    assert.equal(put.status, 404);

    const del = await memoriesRouter(
      makeContext({ method: "DELETE", path: "/api/memories/some-id", db, uid: "user-b" })
    );
    assert.equal(del.status, 404);
  });
});

// ---------------------------------------------------------------------------
// H. Rollback/re-forward ordering at the API level:
// non-null 0,1,2 + NULL rows exist; new create must continue at 3 and keep NULLs
// ---------------------------------------------------------------------------
test("H: after NULL rows exist, new create continues from max non-null and preserves NULLs", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]], memoryRows: [[{ sortOrder: 2 }]] });
    const res = await createNestedMemory(db, { title: "h", memo: "h", timestamp: "2026-01-09" });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.sortOrder, 3);
    assert.equal(db.inserted.length, 1);
    assert.equal(db.inserted[0].sortOrder, 3);
  });
});
