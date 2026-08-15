import assert from "node:assert/strict";
import test from "node:test";
import { createSign, generateKeyPairSync, createPublicKey } from "node:crypto";
import { memoriesRouter } from "../server/api/memories.ts";
import { treesRouter, deterministicId } from "../server/api/trees.ts";
import { memories, trees, treeSocialCounts } from "../db/schema.ts";

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
    if (table === treeSocialCounts) return dbSocialCounts;
    return [];
  }

  // ── Atomic batch emulation ($client.transaction) ─────────────────────────
  //
  // The with-first-memory handler submits its writes as one atomic batch
  // through the underlying SQL client (drizzle's neon-http driver does not
  // implement db.transaction()). This emulator mirrors PostgreSQL semantics
  // for exactly the statement shapes that handler produces:
  //   - SELECTs read committed rows plus this transaction's own staged writes;
  //   - INSERTs are staged, conflict-checked (PK / unique / FK), and only
  //     committed together when every statement succeeds;
  //   - any statement failure discards the staging (all-or-nothing rollback);
  //   - a commit-time conflict re-check collapses concurrent same-key batches
  //     into one logical create, as Postgres does with ON CONFLICT DO NOTHING.
  const dbSocialCounts = [];
  const batchStaged = [];

  function committedRows(table) {
    if (table === trees) return dbTrees;
    if (table === memories) return dbMemories;
    if (table === treeSocialCounts) return dbSocialCounts;
    return [];
  }

  function fakeTableName(table) {
    if (table === trees) return "trees";
    if (table === memories) return "memories";
    if (table === treeSocialCounts) return "tree_social_counts";
    return "unknown";
  }

  // Builds the { sql, params } shape a real drizzle query builder returns
  // from toSQL(). The column names come from the value object keys, so the
  // batch emulator's column-name parsing maps them straight back to the same
  // camelCase keys the handler produced.
  function fakeInsertToSQL(table, value) {
    const columns = Object.keys(value);
    const params = columns.map((column) => value[column]);
    const sql =
      `insert into "${fakeTableName(table)}" ` +
      `(${columns.map((c) => `"${c}"`).join(", ")}) ` +
      `values (${columns.map((_, i) => `$${i + 1}`).join(", ")}) ` +
      `on conflict do nothing`;
    return { sql, params };
  }

  function columnsFromInsert(sqlText) {
    const match = /insert into "\w+" \(([^)]*)\) values/i.exec(sqlText);
    if (!match) return null;
    return match[1]
      .split(",")
      .map((part) => part.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
  }

  function valueFromParams(sqlText, params) {
    const columns = columnsFromInsert(sqlText);
    if (!columns) return null;
    const value = {};
    columns.forEach((column, index) => {
      value[column.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())] = params[index];
    });
    return value;
  }

  function committedConflict(table, value) {
    if (table === trees) {
      return (
        committedRows(trees).some((row) => row.id === value.id) ||
        (value.clientKey !== null &&
          committedRows(trees).some(
            (row) => row.ownerId === value.ownerId && row.clientKey === value.clientKey
          ))
      );
    }
    if (table === treeSocialCounts) {
      return committedRows(treeSocialCounts).some((row) => row.treeId === value.treeId);
    }
    if (table === memories) {
      return committedRows(memories).some((row) => row.id === value.id);
    }
    return false;
  }

  function stagedConflict(table, value) {
    return batchStaged.some((item) => {
      if (item.table !== table) return false;
      if (table === trees) {
        return (
          item.value.id === value.id ||
          (value.clientKey !== null &&
            item.value.ownerId === value.ownerId &&
            item.value.clientKey === value.clientKey)
        );
      }
      if (table === treeSocialCounts) return item.value.treeId === value.treeId;
      if (table === memories) return item.value.id === value.id;
      return false;
    });
  }

  function treeExistsInBatch(treeId) {
    return (
      committedRows(trees).some((row) => row.id === treeId) ||
      batchStaged.some((item) => item.table === trees && item.value.id === treeId)
    );
  }

  const $client = {
    async transaction(fn) {
      const tx = {
        query: (sqlText, params) => {
          const text = String(sqlText ?? "");
          const values = params ?? [];
          if (text.includes('insert into "trees"')) return emulateTreeInsert(text, values);
          if (text.includes('insert into "tree_social_counts"')) {
            return emulateSocialInsert(text, values);
          }
          if (text.includes('insert into "memories"')) return emulateMemoryInsert(text, values);
          if (text.includes('from "trees"')) return emulateTreeSelect(values);
          if (text.includes('from "memories"')) return emulateMemorySelect(values);
          return Promise.reject(
            new Error(`unrecognized atomic batch statement: ${text.slice(0, 120)}`)
          );
        },
      };

      function emulateTreeInsert(text, params) {
        const value = valueFromParams(text, params);
        if (!value) {
          return Promise.reject(new Error(`unparseable tree insert: ${text.slice(0, 120)}`));
        }
        if (committedConflict(trees, value) || stagedConflict(trees, value)) {
          return Promise.resolve([]); // ON CONFLICT DO NOTHING
        }
        batchStaged.push({ table: trees, value });
        return Promise.resolve([]);
      }

      function emulateSocialInsert(text, params) {
        const value = valueFromParams(text, params);
        if (!value) {
          return Promise.reject(new Error(`unparseable social insert: ${text.slice(0, 120)}`));
        }
        if (!treeExistsInBatch(value.treeId)) {
          return Promise.reject(
            new Error(
              'insert or update on table "tree_social_counts" violates foreign key constraint "tree_social_counts_tree_id_trees_id_fk"'
            )
          );
        }
        if (committedConflict(treeSocialCounts, value) || stagedConflict(treeSocialCounts, value)) {
          return Promise.resolve([]);
        }
        batchStaged.push({ table: treeSocialCounts, value });
        return Promise.resolve([]);
      }

      function emulateMemoryInsert(text, params) {
        if (insertFailCount > 0) {
          insertFailCount--;
          return Promise.reject(
            new Error(
              'duplicate key value violates unique constraint "memories_tree_sort_order_uniq_partial"'
            )
          );
        }
        const value = valueFromParams(text, params);
        if (!value) {
          return Promise.reject(new Error(`unparseable memory insert: ${text.slice(0, 120)}`));
        }
        if (!treeExistsInBatch(value.treeId)) {
          return Promise.reject(
            new Error(
              'insert or update on table "memories" violates foreign key constraint "memories_tree_id_trees_id_fk"'
            )
          );
        }
        if (committedConflict(memories, value) || stagedConflict(memories, value)) {
          return Promise.resolve([]);
        }
        batchStaged.push({ table: memories, value });
        return Promise.resolve([]);
      }

      function emulateTreeSelect(params) {
        const rows = [
          ...committedRows(trees),
          ...batchStaged.filter((item) => item.table === trees).map((item) => item.value),
        ];
        return Promise.resolve(rows.filter((row) => row.id === params[0]));
      }

      function emulateMemorySelect(params) {
        const rows = [
          ...committedRows(memories),
          ...batchStaged.filter((item) => item.table === memories).map((item) => item.value),
        ];
        return Promise.resolve(rows.filter((row) => row.id === params[0]));
      }

      function commitBatch() {
        for (const item of batchStaged) {
          if (committedConflict(item.table, item.value)) continue; // concurrent no-op
          committedRows(item.table).push(item.value);
          inserted.push({ table: item.table, value: item.value });
        }
        batchStaged.length = 0;
      }

      try {
        const results = await Promise.all(fn(tx));
        commitBatch();
        return results;
      } catch (error) {
        batchStaged.length = 0;
        throw error;
      }
    },
  };

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
      toSQL() {
        const conditions = this._where ? extractConditions(this._where) : [];
        const tableName = this._table === trees
          ? "trees"
          : this._table === memories
            ? "memories"
            : "unknown";
        let sql = `select * from "${tableName}"`;
        const params = conditions.map((c) => c.value);
        if (conditions.length > 0) {
          sql += " where " + conditions
            .map((c, i) => `"${tableName}"."${c.column}" = $${i + 1}`)
            .join(" and ");
        }
        return { sql, params };
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
    _dbSocialCounts: dbSocialCounts,
    $client,
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
      // Lazy query chain: nothing executes until the promise is awaited or
      // toSQL() is called (mirroring a real drizzle query builder). This
      // removed the previous eager double-insert when onConflictDoNothing()
      // was chained, which would otherwise corrupt the atomic-batch tests.
      return {
        values(value) {
          const chain = {
            onConflictDoNothing() {
              chain._onConflict = true;
              return chain;
            },
            toSQL() {
              return fakeInsertToSQL(table, value);
            },
            then(resolve, reject) {
              return doInsert(value, chain._onConflict === true).then(resolve, reject);
            },
          };
          return chain;
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

// ─── with-first-memory atomicity (issue #202 golden path) ───

function withFirstMemoryBody(overrides = {}) {
  return {
    clientKey: "wfm-" + Math.random().toString(36).slice(2, 10),
    title: "Atomic Tree",
    memory: { memo: "first moment" },
    ...overrides,
  };
}

test("with-first-memory ABSENT: one atomic batch writes tree + social + first memory exactly once", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb();
    const response = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: withFirstMemoryBody({ clientKey: "wfm-absent" }),
      db,
    }));
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.ok(body.tree.id, "canonical tree reread returned");
    assert.equal(body.tree.clientKey, "wfm-absent");
    assert.equal(body.memory.treeId, body.tree.id, "canonical memory reread references the tree");
    assert.equal(body.memory.sortOrder, 0);
    assert.equal(db._dbTrees.length, 1, "exactly one tree persisted");
    assert.equal(db._dbSocialCounts.length, 1, "exactly one social-count row persisted");
    assert.equal(db._dbMemories.length, 1, "exactly one first memory persisted");
  });
});

test("with-first-memory replay: original persisted canonical rows are returned, not the request payload", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb();
    const first = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: withFirstMemoryBody({
        clientKey: "wfm-replay",
        title: "Original Title",
        memory: { memo: "original memo" },
      }),
      db,
    }));
    assert.equal(first.status, 201);
    const firstBody = await first.json();

    const second = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: withFirstMemoryBody({
        clientKey: "wfm-replay",
        title: "Changed Title",
        memory: { memo: "changed memo" },
      }),
      db,
    }));
    assert.equal(second.status, 200, "complete replay returns 200");
    const secondBody = await second.json();

    assert.equal(secondBody.tree.id, firstBody.tree.id);
    assert.equal(
      secondBody.tree.title,
      "Original Title",
      "canonical persisted title, not the second request payload"
    );
    assert.equal(
      secondBody.memory.memo,
      "original memo",
      "canonical persisted memory, not the second request payload"
    );
    assert.equal(db._dbTrees.length, 1, "no duplicate tree");
    assert.equal(db._dbSocialCounts.length, 1, "no duplicate social row");
    assert.equal(db._dbMemories.length, 1, "no duplicate memory");
  });
});

test("with-first-memory legacy tree-only partial fails closed without auto-repair", async () => {
  await withFirebaseKeyFetch(async () => {
    const key = "wfm-legacy-partial";
    const treeId = await deterministicId(USER_ID, "tree", key);
    const db = makeStatefulDb({
      treeRows: [{
        id: treeId,
        ownerId: USER_ID,
        clientKey: key,
        title: "Legacy Tree",
        memo: "",
        artist: "",
        visibility: "public",
        groupName: null,
        keywords: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
    });

    const response = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: withFirstMemoryBody({
        clientKey: key,
        title: "Should Not Overwrite",
        memory: { memo: "should not repair" },
      }),
      db,
    }));
    assert.equal(response.status, 409, "legacy partial fails closed");
    assert.equal(db._dbTrees.length, 1, "tree untouched");
    assert.equal(db._dbMemories.length, 0, "first memory was NOT auto-repaired");
    assert.equal(db._dbSocialCounts.length, 0, "no social residue created");
    assert.equal(db.inserted.length, 0, "no writes executed");
  });
});

test("with-first-memory historical clientKey=NULL legacy partial fails closed without auto-repair", async () => {
  await withFirebaseKeyFetch(async () => {
    const key = "wfm-historical-null";
    const treeId = await deterministicId(USER_ID, "tree", key);
    // Pre-#202 crash residue: the endpoint did not persist clientKey, so the
    // historical row has clientKey = null while the id is still the
    // deterministic treeId and the first memory is absent.
    const db = makeStatefulDb({
      treeRows: [{
        id: treeId,
        ownerId: USER_ID,
        clientKey: null,
        title: "Historical Tree",
        memo: "",
        artist: "",
        visibility: "public",
        groupName: null,
        keywords: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
    });

    const response = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: withFirstMemoryBody({
        clientKey: key,
        title: "Should Not Repair",
        memory: { memo: "must not repair" },
      }),
      db,
    }));
    assert.equal(response.status, 409, "historical NULL-clientKey legacy partial fails closed");
    assert.equal(db._dbMemories.length, 0, "first memory was NOT auto-repaired");
    assert.equal(db._dbSocialCounts.length, 0, "no new social write");
    assert.equal(db.inserted.length, 0, "zero batch/transaction writes");
    assert.equal(db._dbTrees.length, 1, "existing tree untouched");
    assert.equal(db._dbTrees[0].clientKey, null, "historical row is not backfilled");
  });
});

test("with-first-memory historical clientKey=NULL row with memory replays persisted rows without backfill", async () => {
  await withFirebaseKeyFetch(async () => {
    const key = "wfm-historical-replay";
    const treeId = await deterministicId(USER_ID, "tree", key);
    const memoryId = await deterministicId(USER_ID, "tree", treeId, key);
    const db = makeStatefulDb({
      treeRows: [{
        id: treeId,
        ownerId: USER_ID,
        clientKey: null,
        title: "Historical Tree",
        memo: "",
        artist: "",
        visibility: "public",
        groupName: null,
        keywords: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      memoryRows: [{
        id: memoryId,
        treeId,
        clientKey: null,
        parentId: null,
        connectionReason: null,
        title: "",
        memo: "historical first moment",
        artist: "",
        source: "",
        sourceUrl: "",
        sourceType: "youtube",
        thumbnail: "",
        emotionTags: [],
        timestamp: "",
        discoveryDate: null,
        videoOffsetSeconds: null,
        sortOrder: 0,
        visibility: "public",
        channelId: null,
        channelName: null,
        channelUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
    });

    const response = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: withFirstMemoryBody({
        clientKey: key,
        title: "Should Not Rewrite",
        memory: { memo: "should not rewrite" },
      }),
      db,
    }));
    assert.equal(response.status, 200, "complete historical replay returns 200");
    const body = await response.json();
    assert.equal(body.tree.id, treeId);
    assert.equal(body.tree.clientKey, null, "historical row is not rewritten/backfilled");
    assert.equal(body.tree.title, "Historical Tree", "persisted canonical tree returned");
    assert.equal(body.memory.id, memoryId);
    assert.equal(body.memory.memo, "historical first moment", "persisted canonical memory returned");
    assert.equal(db._dbTrees.length, 1);
    assert.equal(db._dbMemories.length, 1);
    assert.equal(db._dbSocialCounts.length, 0, "no new social write on replay");
    assert.equal(db.inserted.length, 0, "zero writes on replay");
  });
});

test("with-first-memory tree with a different id under the same clientKey fails closed", async () => {
  await withFirebaseKeyFetch(async () => {
    const key = "wfm-legacy-diffid";
    const db = makeStatefulDb({
      treeRows: [{
        id: "some-other-random-id",
        ownerId: USER_ID,
        clientKey: key,
        title: "Tree-Only",
        memo: "",
        artist: "",
        visibility: "public",
        groupName: null,
        keywords: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
    });

    const response = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: withFirstMemoryBody({
        clientKey: key,
        memory: { memo: "must not attach" },
      }),
      db,
    }));
    assert.equal(response.status, 409, "conflicting clientKey fails closed");
    assert.equal(db._dbTrees.length, 1, "existing tree untouched");
    assert.equal(db._dbMemories.length, 0, "no memory attached under the conflicting key");
    assert.equal(db._dbSocialCounts.length, 0, "no social residue created");
  });
});

test("with-first-memory statement failure rolls the whole batch back to 0/0/0", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb();
    // Force the third statement (memory insert) to fail inside the batch:
    // the tree and social rows were already staged and must be discarded.
    db.setInsertShouldFail(1);

    await assert.rejects(
      treesRouter(makeContext({
        method: "POST",
        path: "/api/trees/with-first-memory",
        body: withFirstMemoryBody({ clientKey: "wfm-fail" }),
        db,
      })),
      /duplicate key value violates unique constraint/
    );
    assert.equal(db._dbTrees.length, 0, "tree rolled back");
    assert.equal(db._dbSocialCounts.length, 0, "social residue rolled back");
    assert.equal(db._dbMemories.length, 0, "memory rolled back");
  });
});

test("with-first-memory concurrent same-key requests produce exactly one logical create", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeStatefulDb();
    const body = withFirstMemoryBody({ clientKey: "wfm-concurrent" });

    const [r1, r2] = await Promise.all([
      treesRouter(makeContext({ method: "POST", path: "/api/trees/with-first-memory", body, db })),
      treesRouter(makeContext({ method: "POST", path: "/api/trees/with-first-memory", body, db })),
    ]);

    assert.ok(r1.status === 201 || r1.status === 200, `first status ${r1.status}`);
    assert.ok(r2.status === 201 || r2.status === 200, `second status ${r2.status}`);
    assert.equal(db._dbTrees.length, 1, "exactly one logical tree");
    assert.equal(db._dbSocialCounts.length, 1, "exactly one logical social row");
    assert.equal(db._dbMemories.length, 1, "exactly one logical first moment");

    const b1 = await r1.json();
    const b2 = await r2.json();
    assert.equal(b1.tree.id, b2.tree.id, "both responses reference the same canonical tree");
    assert.equal(b1.memory.id, b2.memory.id, "both responses reference the same canonical memory");
  });
});
