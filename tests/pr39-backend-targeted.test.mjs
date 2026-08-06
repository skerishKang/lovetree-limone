import assert from "node:assert/strict";
import test from "node:test";
import { createSign, generateKeyPairSync, createPublicKey } from "node:crypto";
import { memoriesRouter } from "../server/api/memories.ts";
import { treesRouter } from "../server/api/trees.ts";
import { memories, trees } from "../db/schema.ts";

const PROJECT_ID = "relovetree";
const USER_ID = "backend-target-user";
const FOREIGN_USER_ID = "backend-foreign-user";
const AUTH_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicExponent: 0x10001,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const publicJwk = createPublicKey(publicKey).export({ format: "jwk" });
const KEY_ID = "backend-target-key";

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function makeAuthToken(uid = USER_ID) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", kid: KEY_ID }));
  const payload = base64Url(JSON.stringify({
    aud: PROJECT_ID,
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    sub: uid,
    iat: now - 60,
    auth_time: now - 120,
    exp: now + 3600,
  }));
  const data = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(data).sign(privateKey);
  return `${data}.${base64Url(signature)}`;
}

/**
 * Extract column/value pairs from a drizzle SQL WHERE clause.
 * Walks queryChunks to find Column (has .name and .table) and Param (has .value and .brand) objects.
 */
function extractConditions(sql) {
  if (!sql || !Array.isArray(sql.queryChunks)) return [];
  const conditions = [];
  let lastColumn = null;
  for (const chunk of sql.queryChunks) {
    if (!chunk || typeof chunk !== "object") continue;
    if (chunk.name && chunk.table) {
      lastColumn = chunk.name;
    } else if (chunk.value !== undefined && !Array.isArray(chunk.value) && lastColumn) {
      conditions.push({ column: lastColumn, value: chunk.value });
      lastColumn = null;
    } else if (Array.isArray(chunk.queryChunks)) {
      conditions.push(...extractConditions(chunk));
    }
  }
  return conditions;
}

function extractOrderByColumns(sql) {
  if (!sql || !Array.isArray(sql.queryChunks)) return [];
  const cols = [];
  for (const chunk of sql.queryChunks) {
    if (!chunk || typeof chunk !== "object") continue;
    if (chunk.name && chunk.table) {
      cols.push(chunk.name);
    }
  }
  return cols;
}

function matchesRow(row, conditions) {
  for (const { column, value } of conditions) {
    if (value === undefined) continue;
    const camel = column.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const rowValue = row[column] !== undefined ? row[column] : row[camel];
    if (rowValue !== value) return false;
  }
  return true;
}

/**
 * Stateful fake DB that respects WHERE conditions on eq()/and() filters.
 * Tracks inserted rows and enforces unique constraints.
 */
function makeStatefulDb({ treeRows = [], memoryRows = [] } = {}) {
  const dbTrees = [...treeRows];
  const dbMemories = [...memoryRows];
  const inserted = [];
  const updated = [];
  const deleted = [];
  let insertFailCount = 0;
  let sortOrderBarrier = null;
  let uniqueCollisionCount = 0;

  function getTableData(table) {
    if (table === memories || table === dbMemories) return dbMemories;
    if (table === trees || table === dbTrees) return dbTrees;
    return [];
  }

  function makeSelectQuery() {
    const query = {
      _table: null,
      _where: null,
      _orderBy: [],
      _limit: null,
      _fieldAliases: null,
      select(...fields) {
        if (fields.length > 0 && typeof fields[0] === "object" && fields[0] !== null) {
          const obj = fields[0];
          this._fieldAliases = {};
          for (const [alias, col] of Object.entries(obj)) {
            this._fieldAliases[alias] = col?.name || alias;
          }
        }
        return this;
      },
      from(t) {
        this._table = t;
        return this;
      },
      where(fn) {
        this._where = fn;
        return this;
      },
      orderBy(...fns) {
        this._orderBy = fns;
        return this;
      },
      limit(n) {
        this._limit = n;
        return this;
      },
      then(resolve, reject) {
        const data = getTableData(this._table);
        const conditions = this._where ? extractConditions(this._where) : [];
        let result = data.filter(row => matchesRow(row, conditions));

        if (this._orderBy.length > 0) {
          const orderCols = extractOrderByColumns(this._orderBy[0]);
          result = [...result].sort((a, b) => {
            for (const col of orderCols) {
              const camel = col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
              const av = a[col] !== undefined ? a[col] : a[camel];
              const bv = b[col] !== undefined ? b[col] : b[camel];
              if (av === undefined && bv === undefined) continue;
              if (av < bv) return 1;
              if (av > bv) return -1;
            }
            return 0;
          });
        }

        if (this._limit !== null) result = result.slice(0, this._limit);

        if (this._fieldAliases) {
          result = result.map(row => {
            const projected = {};
            for (const [alias, colName] of Object.entries(this._fieldAliases)) {
              const camel = colName.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
              projected[alias] = row[colName] !== undefined ? row[colName] : row[camel];
            }
            return projected;
          });
        }

        // Concurrency test hook: when a sortOrder-computation SELECT is armed
        // with a barrier, wait until every expected request has read the same
        // MAX(sortOrder) before resolving. This forces two concurrent requests
        // to observe the same next sortOrder and then collide on the UNIQUE
        // (tree_id, sort_order) constraint, exercising the real retry path.
        if (sortOrderBarrier && this._fieldAliases && this._fieldAliases.sortOrder !== undefined) {
          sortOrderBarrier.arrivals++;
          if (sortOrderBarrier.arrivals >= sortOrderBarrier.expected) {
            sortOrderBarrier.release();
          }
          return sortOrderBarrier.promise.then(() => resolve(result));
        }

        Promise.resolve(result).then(resolve, reject);
      },
    };
    return query;
  }

  const db = {
    inserted,
    updated,
    deleted,
    _dbTrees: dbTrees,
    _dbMemories: dbMemories,
    setInsertShouldFail(times) { insertFailCount = times; },
    armSortOrderBarrier(expected) {
      let release;
      const promise = new Promise((resolve) => { release = resolve; });
      sortOrderBarrier = { expected, arrivals: 0, promise, release };
    },
    getUniqueCollisionCount() { return uniqueCollisionCount; },
    select(...fields) {
      const q = makeSelectQuery();
      if (fields.length > 0 && typeof fields[0] === "object" && fields[0] !== null) {
        const obj = fields[0];
        q._fieldAliases = {};
        for (const [alias, col] of Object.entries(obj)) {
          q._fieldAliases[alias] = col?.name || alias;
        }
      }
      return q;
    },
    insert(table) {
      const doInsert = (value, onConflict) => {
        if (insertFailCount > 0 && !onConflict) {
          insertFailCount--;
          const err = new Error('duplicate key value violates unique constraint "memories_tree_sort_order_uniq_partial"');
          return Promise.reject(err);
        }
        // Real UNIQUE (tree_id, sort_order) check so a concurrent request that
        // computed the same next sortOrder collides and must retry.
        if ((table === memories || table === dbMemories) && !onConflict) {
          const collision = dbMemories.find(
            (row) => row.treeId === value.treeId && row.sortOrder === value.sortOrder
          );
          if (collision) {
            uniqueCollisionCount++;
            const err = new Error('duplicate key value violates unique constraint "memories_tree_sort_order_uniq_partial"');
            return Promise.reject(err);
          }
        }
        inserted.push({ table, value });
        const data = getTableData(table);
        data.push(value);
        return Promise.resolve();
      };
      return {
        values(value) {
          const promise = doInsert(value, false);
          return {
            onConflictDoNothing() {
              return doInsert(value, true);
            },
            then(resolve, reject) {
              return promise.then(resolve, reject);
            },
          };
        },
      };
    },
    update(table) {
      return {
        set(value) {
          return {
            where(fn) {
              const conditions = extractConditions(fn);
              const data = getTableData(table);
              for (const row of data) {
                if (matchesRow(row, conditions)) {
                  Object.assign(row, value);
                  updated.push({ table, value, id: row.id });
                }
              }
              return Promise.resolve();
            },
          };
        },
      };
    },
    delete(table) {
      return {
        where(fn) {
          const conditions = extractConditions(fn);
          const data = getTableData(table);
          const toDelete = data.filter(row => matchesRow(row, conditions));
          for (const row of toDelete) {
            const idx = data.indexOf(row);
            if (idx >= 0) data.splice(idx, 1);
            deleted.push({ table, id: row.id });
          }
          return Promise.resolve();
        },
      };
    },
  };

  return db;
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
    env: { DATABASE_URL: "unused", FIREBASE_PROJECT_ID: PROJECT_ID },
    db,
    url,
    method,
    path,
    params: {},
  };
}

async function withFirebaseKeyFetch(run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input) === AUTH_URL) {
      return new Response(JSON.stringify({
        keys: [{
          kty: "RSA",
          kid: KEY_ID,
          use: "sig",
          alg: "RS256",
          n: publicJwk.n,
          e: publicJwk.e,
        }],
      }), {
        status: 200,
        headers: { "cache-control": "max-age=3600" },
      });
    }
    return originalFetch(input, init);
  };
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const OWNER_TREE = {
  id: "tree-owner",
  ownerId: USER_ID,
  clientKey: null,
  title: "Test Tree",
  memo: "",
  artist: "",
  visibility: "public",
  groupName: null,
  keywords: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const FOREIGN_TREE = {
  id: "tree-foreign",
  ownerId: FOREIGN_USER_ID,
  clientKey: null,
  title: "Foreign Tree",
  memo: "",
  artist: "",
  visibility: "public",
  groupName: null,
  keywords: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeMemoryRow(overrides = {}) {
  return {
    id: "m-" + Math.random().toString(36).slice(2),
    treeId: "tree-owner",
    clientKey: null,
    parentId: null,
    title: "",
    memo: "",
    artist: "",
    source: "",
    sourceUrl: "",
    sourceType: "youtube",
    thumbnail: "",
    emotionTags: [],
    timestamp: "",
    sortOrder: 0,
    visibility: "public",
    channelId: null,
    channelName: null,
    channelUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ───

test("empty moment (no title, no memo) returns 400", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({ treeRows: [OWNER_TREE] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { title: "   ", memo: "" },
      db,
    }));
    assert.equal(response.status, 400);
    assert.equal(db.inserted.length, 0);
  });
});

test("whitespace-only title and memo returns 400", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({ treeRows: [OWNER_TREE] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { title: "   ", memo: "  " },
      db,
    }));
    assert.equal(response.status, 400);
    assert.equal(db.inserted.length, 0);
  });
});

test("invalid date format returns 400", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({ treeRows: [OWNER_TREE] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "test", timestamp: "2026-13-45" },
      db,
    }));
    assert.equal(response.status, 400);
    assert.equal(db.inserted.length, 0);
  });
});

test("nonexistent date returns 400", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({ treeRows: [OWNER_TREE] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "test", timestamp: "2026-02-30" },
      db,
    }));
    assert.equal(response.status, 400);
    assert.equal(db.inserted.length, 0);
  });
});

test("first moment gets sortOrder 0", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({ treeRows: [OWNER_TREE] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "first moment" },
      db,
    }));
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.sortOrder, 0);
    assert.equal(db.inserted.length, 1);
  });
});

test("consecutive appends get sortOrder 0, 1, 2", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({
      treeRows: [OWNER_TREE],
      memoryRows: [makeMemoryRow({ id: "m0", sortOrder: 0, memo: "first" })],
    });

    const r1 = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "second" },
      db,
    }));
    assert.equal(r1.status, 201);
    assert.equal((await r1.json()).sortOrder, 1);

    const r2 = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "third" },
      db,
    }));
    assert.equal(r2.status, 201);
    assert.equal((await r2.json()).sortOrder, 2);
  });
});

test("client sortOrder is not trusted — server computes it", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({ treeRows: [OWNER_TREE] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "first", sortOrder: 999 },
      db,
    }));
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.sortOrder, 0, "server should assign 0, not client's 999");
  });
});

test("same clientKey twice returns same memory (idempotency)", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({ treeRows: [OWNER_TREE] });

    const r1 = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "idempotent", clientKey: "ck-001" },
      db,
    }));
    assert.equal(r1.status, 201);
    const body1 = await r1.json();

    const r2 = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "idempotent", clientKey: "ck-001" },
      db,
    }));
    assert.equal(r2.status, 200);
    const body2 = await r2.json();

    assert.equal(body1.id, body2.id, "same memory id returned");
    assert.equal(db.inserted.length, 1, "only one row inserted");
  });
});

test("unique conflict triggers retry and eventually succeeds", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({
      treeRows: [OWNER_TREE],
      memoryRows: [makeMemoryRow({ id: "m0", sortOrder: 0, memo: "first" })],
    });
    db.setInsertShouldFail(1);

    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "second", clientKey: "ck-retry" },
      db,
    }));
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.sortOrder, 1);
    assert.equal(db.inserted.length, 1, "only one row should be inserted");
  });
});

test("retry exhaustion returns 409", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({
      treeRows: [OWNER_TREE],
      memoryRows: [makeMemoryRow({ id: "m0", sortOrder: 0, memo: "first" })],
    });
    // Fail every insert attempt: retry budget is 16, so 20 forced failures
    // guarantee exhaustion and the 409 contract.
    db.setInsertShouldFail(20);

    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "second", clientKey: "ck-exhaust" },
      db,
    }));
    assert.equal(response.status, 409);
  });
});

test("foreign user cannot append to another user's tree", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({ treeRows: [FOREIGN_TREE] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-foreign/memories",
      body: { memo: "should be blocked" },
      db,
    }));
    assert.equal(response.status, 404);
    assert.equal(db.inserted.length, 0);
  });
});

test("foreign user cannot GET another user's private memory", async () => {
  await withFirebaseKeyFetch(async () => {
    const privateTree = { ...OWNER_TREE, visibility: "private" };
    const db = makeStatefulDb({
      treeRows: [privateTree],
      memoryRows: [makeMemoryRow({ id: "m-private", treeId: "tree-owner", sortOrder: 0, memo: "private", visibility: "private" })],
    });
    const response = await memoriesRouter(makeContext({
      method: "GET",
      path: "/api/memories/m-private",
      db,
      uid: FOREIGN_USER_ID,
    }));
    assert.equal(response.status, 404);
  });
});

test("foreign user cannot PUT another user's memory", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({
      treeRows: [OWNER_TREE],
      memoryRows: [makeMemoryRow({ id: "m-put", sortOrder: 0, memo: "original" })],
    });
    const response = await memoriesRouter(makeContext({
      method: "PUT",
      path: "/api/memories/m-put",
      body: { memo: "hacked" },
      db,
      uid: FOREIGN_USER_ID,
    }));
    assert.equal(response.status, 404);
    assert.equal(db.updated.length, 0);
  });
});

test("foreign user cannot DELETE another user's memory", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({
      treeRows: [OWNER_TREE],
      memoryRows: [makeMemoryRow({ id: "m-del", sortOrder: 0, memo: "original" })],
    });
    const response = await memoriesRouter(makeContext({
      method: "DELETE",
      path: "/api/memories/m-del",
      db,
      uid: FOREIGN_USER_ID,
    }));
    assert.equal(response.status, 404);
    assert.equal(db.deleted.length, 0);
  });
});

test("createTreeWithFirstMemory assigns sortOrder 0 to first memory", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb();
    const response = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: {
        clientKey: "tree-ck-001",
        title: "New Tree",
        memory: { memo: "first memory" },
      },
      db,
    }));
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.memory.sortOrder, 0);
    const memoryInserts = db.inserted.filter(i => i.value?.sortOrder !== undefined || i.value?.treeId);
    assert.ok(memoryInserts.length >= 1, "should insert memory with sortOrder");
  });
});

test("createTreeWithFirstMemory ignores client sortOrder", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb();
    const response = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: {
        clientKey: "tree-ck-002",
        title: "New Tree",
        memory: { memo: "first memory", sortOrder: 999 },
      },
      db,
    }));
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.memory.sortOrder, 0, "server should assign 0, not client's 999");
  });
});

test("top-level create also ignores client sortOrder", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({ treeRows: [OWNER_TREE] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/memories",
      body: { treeId: "tree-owner", memo: "first", sortOrder: 42 },
      db,
    }));
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.sortOrder, 0, "server should assign 0, not client's 42");
  });
});

test("update can set sortOrder with ownership check", async () => {
  await withFirebaseKeyFetch(async () => {
    const existing = makeMemoryRow({ id: "m-upd", sortOrder: 0, memo: "original" });
    const db = makeStatefulDb({
      treeRows: [OWNER_TREE],
      memoryRows: [existing],
    });
    const response = await memoriesRouter(makeContext({
      method: "PUT",
      path: "/api/memories/m-upd",
      body: { sortOrder: 5 },
      db,
    }));
    assert.equal(response.status, 200);
    assert.equal(db.updated.length, 1);
  });
});

test("migration 0002 adds nullable sort_order, partial unique index, and backfill", async () => {
  const fs = await import("node:fs/promises");
  const sql = await fs.readFile("./drizzle/0002_fixed_scarlet_spider.sql", "utf8");
  assert.ok(sql.includes("ADD COLUMN"), "adds sort_order column");
  assert.ok(!/DEFAULT\s+0\s+NOT\s+NULL/.test(sql), "does NOT apply DEFAULT 0 NOT NULL (Expand)");
  assert.ok(sql.includes("ROW_NUMBER"), "backfills with ROW_NUMBER");
  assert.ok(sql.includes("PARTITION BY tree_id"), "partitions by tree_id");
  assert.ok(sql.includes("ORDER BY created_at ASC, id ASC"), "orders by created_at ASC, id ASC");
  assert.ok(sql.includes("CREATE UNIQUE INDEX"), "creates UNIQUE index");
  assert.ok(
    sql.includes("memories_tree_sort_order_uniq_partial"),
    "index name matches schema (partial unique)"
  );
  assert.ok(
    sql.includes("WHERE"),
    "partial unique index has a WHERE predicate (sort_order IS NOT NULL)"
  );
});

test("0003_sort_order_backfill.sql does not exist", async () => {
  const fs = await import("node:fs/promises");
  await assert.rejects(
    fs.access("./drizzle/0003_sort_order_backfill.sql"),
    /ENOENT/,
    "0003 file should be removed"
  );
});

test("two different clientKeys created concurrently both succeed with distinct consecutive sortOrders", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb({ treeRows: [OWNER_TREE] });

    // Force both requests to read the same MAX(sortOrder) before either
    // inserts. Without this, the stateful fake's synchronous inserts would let
    // the second request already see the first row and never exercise the
    // UNIQUE-collision retry path.
    db.armSortOrderBarrier(2);

    const [r1, r2] = await Promise.all([
      memoriesRouter(makeContext({
        method: "POST",
        path: "/api/trees/tree-owner/memories",
        body: { memo: "concurrent A", clientKey: "ck-concurrent-a" },
        db,
      })),
      memoriesRouter(makeContext({
        method: "POST",
        path: "/api/trees/tree-owner/memories",
        body: { memo: "concurrent B", clientKey: "ck-concurrent-b" },
        db,
      })),
    ]);

    assert.equal(r1.status, 201, `request A status ${r1.status}`);
    assert.equal(r2.status, 201, `request B status ${r2.status}`);

    const b1 = await r1.json();
    const b2 = await r2.json();

    assert.notEqual(b1.id, b2.id, "moment IDs must differ");
    assert.notEqual(b1.sortOrder, b2.sortOrder, "sortOrders must differ");

    const finalOrders = [b1.sortOrder, b2.sortOrder].sort((a, b) => a - b);
    assert.deepEqual(
      finalOrders,
      [0, 1],
      `final sortOrders must be consecutive 0 and 1, got ${JSON.stringify(finalOrders)}`
    );

    // Exactly two rows persisted, one per clientKey, no duplicate sortOrder.
    assert.equal(db.inserted.length, 2, "two rows inserted");
    const rowsByOrder = [...db._dbMemories].sort((a, b) => a.sortOrder - b.sortOrder);
    assert.equal(rowsByOrder.length, 2, "two stored rows");
    assert.equal(rowsByOrder[0].sortOrder, 0);
    assert.equal(rowsByOrder[1].sortOrder, 1);
    const uniqueOrders = new Set(db._dbMemories.map((m) => m.sortOrder));
    assert.equal(uniqueOrders.size, 2, "no permanently duplicated sortOrder");

    const storedClientKeys = new Set(db._dbMemories.map((m) => m.clientKey));
    assert.ok(storedClientKeys.has("ck-concurrent-a"), "row A stored");
    assert.ok(storedClientKeys.has("ck-concurrent-b"), "row B stored");

    // The UNIQUE (tree_id, sort_order) collision retry path must actually have
    // been exercised — both requests read the same MAX, the second collided,
    // re-read the latest MAX, and persisted the next consecutive sortOrder.
    assert.ok(
      db.getUniqueCollisionCount() >= 1,
      `expected at least one UNIQUE collision retry, got ${db.getUniqueCollisionCount()}`
    );
  });
});
