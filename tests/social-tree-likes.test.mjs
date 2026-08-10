import assert from "node:assert/strict";
import test from "node:test";
import { createSign, generateKeyPairSync, createPublicKey } from "node:crypto";
import { socialRouter } from "../server/api/social.ts";
import { trees, treeLikes, treeSocialCounts } from "../db/schema.ts";

const PROJECT_ID = "relovetree";
const USER_ID = "social-like-user";
const AUTH_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicExponent: 0x10001,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const publicJwk = createPublicKey(publicKey).export({ format: "jwk" });
const KEY_ID = "social-like-test-key";

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

function sqlText(value) {
  if (value && typeof value === "object" && value.config && typeof value.config.sql === "string") {
    return value.config.sql;
  }
  if (value && typeof value === "object" && value.queryChunks) {
    return value.queryChunks
      .map((chunk) => (chunk && typeof chunk === "object" && "value" in chunk && "encoder" in chunk ? chunk.value : chunk?.value ?? ""))
      .join(" ")
      .trim();
  }
  return "";
}

function collectConditions(condition, out = []) {
  if (!condition || typeof condition !== "object") return out;
  for (const chunks of [condition.queryChunks].filter(Boolean)) {
    for (const chunk of chunks) {
      if (chunk && typeof chunk === "object" && chunk.constructor && chunk.constructor.name === "SQL") {
        collectConditions(chunk, out);
        continue;
      }
      if (chunk && typeof chunk === "object" && chunk.constructor && chunk.constructor.name.startsWith("Pg")) {
        if (chunk.config?.name) out.push({ col: chunk.config.name });
        continue;
      }
      if (chunk && typeof chunk === "object" && chunk.constructor?.name === "StringChunk") {
        const trimmed = String(chunk.value ?? "").trim();
        if (/^=\s*$/.test(trimmed)) {
          const last = out[out.length - 1];
          if (last) last.op = "eq";
        } else if (/is null/i.test(trimmed)) {
          const last = out[out.length - 1];
          if (last) last.op = "isNull";
        }
        continue;
      }
      if (chunk && typeof chunk === "object" && "value" in chunk && "encoder" in chunk) {
        const last = out[out.length - 1];
        if (last && !last.hasVal) {
          last.val = chunk.value;
          last.hasVal = true;
        }
      }
    }
  }
  return out;
}

// Faithful in-memory model of the real store:
// - tree_likes has a unique index on (treeId, ownerId); an "unlike" is a soft
//   delete (deletedAt set) that still occupies the unique key.
// - tree_social_counts. likeCount/viewCount are updated with SQL expressions.
function makeDb() {
  const state = {
    trees: [],
    likes: [],
    counts: [],
  };

  function matchLike(row, conditions) {
    const treeC = conditions.find((c) => c.col === "tree_id");
    const ownerC = conditions.find((c) => c.col === "owner_id");
    const idC = conditions.find((c) => c.col === "id");
    const delC = conditions.find((c) => c.col === "deleted_at");
    if (treeC && row.treeId !== treeC.val) return false;
    if (ownerC && row.ownerId !== ownerC.val) return false;
    if (idC && row.id !== idC.val) return false;
    if (delC && delC.op === "isNull" && row.deletedAt != null) return false;
    return true;
  }

  function applyArithmetic(row, key, text) {
    if (/greatest\(like_count - 1, 0\)/.test(text)) row.likeCount = Math.max(0, row.likeCount - 1);
    else if (/like_count \+ 1/.test(text)) row.likeCount += 1;
    else if (/greatest\(view_count - 1, 0\)/.test(text)) row.viewCount = Math.max(0, row.viewCount - 1);
    else if (/view_count \+ 1/.test(text)) row.viewCount += 1;
  }

  return {
    state,
    select() {
      const query = {
        table: null,
        conditions: [],
        from(table) {
          this.table = table;
          return this;
        },
        where(...conds) {
          this.conditions = collectConditions(conds[0] ?? conds);
          return this;
        },
        orderBy() {
          return this;
        },
        then(resolve, reject) {
          return Promise.resolve(this._resolveRows()).then(resolve, reject);
        },
        async _resolve() {
          return this._resolveRows();
        },
        _resolveRows() {
          if (this.table === trees) return state.trees;
          if (this.table === treeLikes) {
            return state.likes.filter((row) => this.conditions.length === 0 || matchLike(row, this.conditions));
          }
          if (this.table === treeSocialCounts) return state.counts;
          return [];
        },
      };
      return query;
    },
    insert(table) {
      return {
        values(value) {
          return {
            onConflictDoNothing() {
              if (table === treeLikes) {
                if (state.likes.some((row) => row.treeId === value.treeId && row.ownerId === value.ownerId)) {
                  return Promise.resolve({ rowCount: 0 });
                }
                state.likes.push({ ...value });
                return Promise.resolve({ rowCount: 1 });
              }
              if (table === treeSocialCounts) {
                if (state.counts.some((row) => row.treeId === value.treeId)) {
                  return Promise.resolve({ rowCount: 0 });
                }
                state.counts.push({ ...value });
                return Promise.resolve({ rowCount: 1 });
              }
              return Promise.resolve({ rowCount: 1 });
            },
          };
        },
      };
    },
    update(table) {
      return {
        set(value) {
          return {
            where(condition) {
              const conditions = collectConditions(condition);
              const idC = conditions.find((c) => c.col === "id");
              const treeC = conditions.find((c) => c.col === "tree_id");
              if (table === treeLikes) {
                const row = state.likes.find((like) => !idC || like.id === idC.val);
                if (row) Object.assign(row, value);
              } else if (table === treeSocialCounts) {
                const row = state.counts.find((count) => !treeC || count.treeId === treeC.val);
                if (row) {
                  for (const [key, next] of Object.entries(value)) {
                    const text = sqlText(next);
                    if (key === "likeCount" && (text.includes("like_count") || text.includes("likeCount"))) {
                      applyArithmetic(row, "likeCount", text);
                    } else if (key === "viewCount" && (text.includes("view_count") || text.includes("viewCount"))) {
                      applyArithmetic(row, "viewCount", text);
                    } else {
                      row[key] = next;
                    }
                  }
                }
              }
              return Promise.resolve();
            },
          };
        },
      };
    },
    batch(operations) {
      return Promise.all(operations.map((operation) => (typeof operation === "function" ? operation() : operation)));
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
  globalThis.fetch = async (input, init) => {
    if (String(input) === AUTH_URL) {
      return new Response(JSON.stringify({
        keys: [{ kty: "RSA", kid: KEY_ID, use: "sig", alg: "RS256", n: publicJwk.n, e: publicJwk.e }],
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

function setupTree() {
  const db = makeDb();
  db.state.trees.push({
    id: "tree-1",
    ownerId: "public-owner",
    visibility: "public",
    title: "Public Tree",
  });
  db.state.counts.push({
    treeId: "tree-1",
    likeCount: 0,
    viewCount: 0,
    updatedAt: new Date(),
  });
  return db;
}

function activeLikes(db) {
  return db.state.likes.filter((row) => row.deletedAt === null);
}

test("POST then GET reports a consistent liked state and count", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = setupTree();
    const post = await socialRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-1/likes",
      db,
    }));
    assert.equal(post.status, 201);
    assert.deepEqual(await post.json(), { liked: true });

    const count = db.state.counts.find((row) => row.treeId === "tree-1");
    assert.equal(count.likeCount, 1);
    assert.equal(activeLikes(db).length, 1);

    const get = await socialRouter(makeContext({
      method: "GET",
      path: "/api/trees/tree-1/likes",
      db,
    }));
    assert.deepEqual(await get.json(), { count: 1, liked: true });
  });
});

test("like, unlike, re-like keeps the persisted like active and count recovered", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = setupTree();

    const like = await socialRouter(makeContext({ method: "POST", path: "/api/trees/tree-1/likes", db }));
    assert.deepEqual(await like.json(), { liked: true });

    const unlike = await socialRouter(makeContext({ method: "POST", path: "/api/trees/tree-1/likes", db }));
    assert.deepEqual(await unlike.json(), { liked: false });
    assert.equal(activeLikes(db).length, 0, "unlike soft-deletes the like row");

    const reLike = await socialRouter(makeContext({ method: "POST", path: "/api/trees/tree-1/likes", db }));
    assert.deepEqual(await reLike.json(), { liked: true });
    assert.equal(activeLikes(db).length, 1, "re-like restores the soft-deleted row");

    const count = db.state.counts.find((row) => row.treeId === "tree-1");
    assert.equal(count.likeCount, 1, "like count is recovered after re-like");

    const get = await socialRouter(makeContext({ method: "GET", path: "/api/trees/tree-1/likes", db }));
    assert.deepEqual(await get.json(), { count: 1, liked: true });
  });
});

test("re-like after unlike is not stuck: a following unlike still toggles off", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = setupTree();

    await socialRouter(makeContext({ method: "POST", path: "/api/trees/tree-1/likes", db }));
    const unlike = await socialRouter(makeContext({ method: "POST", path: "/api/trees/tree-1/likes", db }));
    assert.deepEqual(await unlike.json(), { liked: false });

    await socialRouter(makeContext({ method: "POST", path: "/api/trees/tree-1/likes", db }));
    const finalUnlike = await socialRouter(makeContext({ method: "POST", path: "/api/trees/tree-1/likes", db }));
    assert.deepEqual(await finalUnlike.json(), { liked: false }, "toggle remains reversible after re-like");
    assert.equal(activeLikes(db).length, 0);
    assert.equal(db.state.counts.find((row) => row.treeId === "tree-1").likeCount, 0);
  });
});