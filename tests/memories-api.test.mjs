import assert from "node:assert/strict";
import test from "node:test";
import { createSign, generateKeyPairSync, createPublicKey } from "node:crypto";
import { memoriesRouter } from "../core/runtime/server/api/memories.ts";
import { memories, trees } from "../core/runtime/db/schema.ts";

const PROJECT_ID = "relovetree";
const USER_ID = "memory-test-user";
const AUTH_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicExponent: 0x10001,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const publicJwk = createPublicKey(publicKey).export({ format: "jwk" });
const KEY_ID = "memory-route-test-key";

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
    insert(table) {
      return {
        values(value) {
          inserted.push({ table, value });
          return Promise.resolve();
        },
      };
    },
    update(table) {
      return {
        set(value) {
          return {
            where() {
              updates.push({ table, value });
              return Promise.resolve();
            },
          };
        },
      };
    },
  };
}

function makeContext({ method, path, body, db }) {
  const url = new URL(`https://example.com${path}`);
  const request = new Request(url, {
    method,
    headers: {
      authorization: `Bearer ${makeAuthToken()}`,
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
  visibility: "public",
};

test("nested memory create uses URL treeId without requiring body treeId", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "first moment" },
      db,
    }));

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.treeId, "tree-owner");
    assert.equal(body.memo, "first moment");
    assert.equal(db.inserted.length, 1);
  });
});

test("top-level memory create still requires body treeId", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb();
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/memories",
      body: { memo: "first moment" },
      db,
    }));

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "treeId is required" });
    assert.equal(db.inserted.length, 0);
  });
});

test("memory partial update does not require treeId", async () => {
  await withFirebaseKeyFetch(async () => {
    const existing = { id: "memory-1", treeId: "tree-owner", parentId: null, memo: "before" };
    const updated = { ...existing, memo: "updated" };
    const db = makeDb({
      memoryRows: [[existing], [updated]],
      treeRows: [[OWNER_TREE]],
    });
    const response = await memoriesRouter(makeContext({
      method: "PUT",
      path: "/api/memories/memory-1",
      body: { memo: "updated" },
      db,
    }));

    assert.equal(response.status, 200);
    assert.equal((await response.json()).memo, "updated");
    assert.equal(db.updates.length, 1);
    assert.deepEqual(db.updates[0].value.memo, "updated");
  });
});

test("nested memory create rejects a foreign-owned tree", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[{ ...OWNER_TREE, ownerId: "another-user" }]] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "must be rejected" },
      db,
    }));

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Not found" });
    assert.equal(db.inserted.length, 0);
  });
});

test("nested memory parentId must reference the same tree", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({
      treeRows: [[OWNER_TREE]],
      memoryRows: [[{ id: "foreign-parent", treeId: "another-tree" }]],
    });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { parentId: "foreign-parent", memo: "must be rejected" },
      db,
    }));

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "parentId must reference a memory in the same tree",
    });
    assert.equal(db.inserted.length, 0);
  });
});
