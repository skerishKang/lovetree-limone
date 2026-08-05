import assert from "node:assert/strict";
import test from "node:test";
import { createSign, generateKeyPairSync, createPublicKey } from "node:crypto";
import { treesRouter } from "../server/api/trees.ts";
import { memoriesRouter } from "../server/api/memories.ts";
import { trees, memories } from "../db/schema.ts";
import {
  toCanonicalMoment,
  toTreeMoment,
  toTimelineMoment,
  toAlbumMoment,
  sortMoments,
  selectTreeMoments,
  selectTimelineMoments,
  selectAlbumMoments,
} from "../lib/moment-model.ts";

const PROJECT_ID = "relovetree";
const USER_ID = "moment-spine-user";
const OTHER_USER_ID = "other-user";
const AUTH_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicExponent: 0x10001,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const publicJwk = createPublicKey(publicKey).export({ format: "jwk" });
const KEY_ID = "moment-spine-test-key";

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

  function buildQuery(table) {
    const query = {
      table,
      from(t) { this.table = t; return this; },
      where(...conditions) {
        this._conditions = conditions;
        return this;
      },
      orderBy() { return this; },
      limit(n) {
        this._limit = n;
        return this._resolve();
      },
      _resolve() {
        if (this.table === trees) return Promise.resolve(treeResponses.shift() ?? []);
        if (this.table === memories) return Promise.resolve(memoryResponses.shift() ?? []);
        return Promise.resolve([]);
      },
    };
    query.then = (resolve, reject) => query._resolve().then(resolve, reject);
    return query;
  }

  return {
    inserted,
    updates,
    select() {
      return buildQuery(null);
    },
    insert(table) {
      return {
        values(value) {
          inserted.push({ table, value });
          return {
            onConflictDoNothing() {
              return Promise.resolve();
            },
          };
        },
        onConflictDoNothing() {
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
    delete(_table) {
      return {
        where() {
          return Promise.resolve();
        },
      };
    },
    batch(ops) {
      return Promise.all(ops.map((op) => (typeof op === "function" ? op() : op)));
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
  title: "Test Tree",
};

// ─── Canonical Moment Model Tests ───

test("canonical moment model preserves all core fields", () => {
  const memory = {
    id: "m1",
    treeId: "t1",
    parentId: null,
    title: "First moment",
    memo: "A memorable moment",
    artist: "",
    source: "",
    sourceUrl: "",
    sourceType: "youtube",
    thumbnail: "",
    emotionTags: ["설렘"],
    timestamp: "2026-01-15",
    sortOrder: 0,
    visibility: "public",
    channelId: null,
    channelName: null,
    channelUrl: null,
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
  };

  const canonical = toCanonicalMoment(memory, USER_ID);
  assert.equal(canonical.id, "m1");
  assert.equal(canonical.treeId, "t1");
  assert.equal(canonical.ownerId, USER_ID);
  assert.equal(canonical.parentId, null);
  assert.equal(canonical.title, "First moment");
  assert.equal(canonical.memo, "A memorable moment");
  assert.equal(canonical.sourceType, "youtube");
  assert.equal(canonical.sortOrder, 0);
  assert.equal(canonical.visibility, "public");
});

test("tree, timeline, and album selectors return the same moment ID", () => {
  const memory = {
    id: "m-shared",
    treeId: "t1",
    parentId: null,
    title: "Shared moment",
    memo: "Same data, different views",
    artist: "",
    source: "",
    sourceUrl: "https://example.com/video",
    sourceType: "youtube",
    thumbnail: "https://example.com/thumb.jpg",
    emotionTags: ["설렘", "여운"],
    timestamp: "2026-01-15",
    sortOrder: 0,
    visibility: "public",
    channelId: null,
    channelName: null,
    channelUrl: null,
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
  };

  const canonical = toCanonicalMoment(memory, USER_ID);
  const treeView = toTreeMoment(canonical, [canonical]);
  const timelineView = toTimelineMoment(canonical);
  const albumView = toAlbumMoment(canonical);

  assert.equal(treeView.id, "m-shared");
  assert.equal(timelineView.id, "m-shared");
  assert.equal(albumView.id, "m-shared");
});

test("sortMoments orders by sortOrder, then timestamp, then createdAt", () => {
  const moments = [
    { id: "m3", treeId: "t1", parentId: null, title: "", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "2026-03-01", sortOrder: 2, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: "2026-03-01T00:00:00Z", updatedAt: null },
    { id: "m1", treeId: "t1", parentId: null, title: "", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "2026-01-01", sortOrder: 0, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: "2026-01-01T00:00:00Z", updatedAt: null },
    { id: "m2", treeId: "t1", parentId: null, title: "", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "2026-02-01", sortOrder: 1, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: "2026-02-01T00:00:00Z", updatedAt: null },
  ].map((m) => toCanonicalMoment(m, USER_ID));

  const sorted = sortMoments(moments);
  assert.equal(sorted[0].id, "m1");
  assert.equal(sorted[1].id, "m2");
  assert.equal(sorted[2].id, "m3");
});

test("selectTreeMoments, selectTimelineMoments, selectAlbumMoments all return sorted views with same IDs", () => {
  const moments = [
    { id: "b", treeId: "t1", parentId: null, title: "B", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "2026-02-01", sortOrder: 1, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: "2026-02-01T00:00:00Z", updatedAt: null },
    { id: "a", treeId: "t1", parentId: null, title: "A", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "2026-01-01", sortOrder: 0, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: "2026-01-01T00:00:00Z", updatedAt: null },
  ].map((m) => toCanonicalMoment(m, USER_ID));

  const treeViews = selectTreeMoments(moments);
  const timelineViews = selectTimelineMoments(moments);
  const albumViews = selectAlbumMoments(moments);

  assert.equal(treeViews[0].id, "a");
  assert.equal(treeViews[1].id, "b");
  assert.equal(timelineViews[0].id, "a");
  assert.equal(timelineViews[1].id, "b");
  assert.equal(albumViews[0].id, "a");
  assert.equal(albumViews[1].id, "b");
});

test("tree view computes isRoot and depth correctly", () => {
  const moments = [
    { id: "root", treeId: "t1", parentId: null, title: "Root", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "", sortOrder: 0, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: null, updatedAt: null },
    { id: "child", treeId: "t1", parentId: "root", title: "Child", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "", sortOrder: 1, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: null, updatedAt: null },
  ].map((m) => toCanonicalMoment(m, USER_ID));

  const treeViews = selectTreeMoments(moments);
  assert.equal(treeViews[0].isRoot, true);
  assert.equal(treeViews[0].depth, 0);
  assert.equal(treeViews[1].isRoot, false);
  assert.equal(treeViews[1].depth, 1);
});

// ─── API Integration Tests ───

test("unauthenticated memory creation is rejected", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]] });
    const url = new URL("https://example.com/api/trees/tree-owner/memories");
    const request = new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ memo: "test" }),
    });
    const ctx = {
      request,
      env: { DATABASE_URL: "unused", FIREBASE_PROJECT_ID: PROJECT_ID, API_MUTATIONS_ENABLED: "true" },
      db,
      url,
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      params: {},
    };

    const response = await memoriesRouter(ctx);
    assert.equal(response.status, 401);
    assert.equal(db.inserted.length, 0);
  });
});

test("first tree + first moment creation via with-first-memory", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb();
    const response = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: {
        clientKey: "test-client-key-1",
        title: "My Love Tree",
        memory: {
          memo: "첫 순간",
          sourceType: "youtube",
          timestamp: "2026-01-15",
        },
      },
      db,
    }));

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.ok(body.tree.id);
    assert.ok(body.memory.id);
    assert.equal(body.tree.title, "My Love Tree");
    assert.equal(body.memory.memo, "첫 순간");
    assert.equal(body.memory.sortOrder, 0);
    assert.equal(body.memory.treeId, body.tree.id);
  });
});

test("existing tree memory creation via nested endpoint", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: {
        memo: "second moment",
        sourceType: "song",
        timestamp: "2026-02-01",
        clientKey: "mem-key-2",
      },
      db,
    }));

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.treeId, "tree-owner");
    assert.equal(body.memo, "second moment");
    assert.equal(body.sortOrder, 0);
    assert.equal(db.inserted.length, 1);
  });
});

test("created memory is retrievable via list endpoint", async () => {
  await withFirebaseKeyFetch(async () => {
    const createdMemory = {
      id: "mem-1",
      treeId: "tree-owner",
      parentId: null,
      title: "",
      memo: "first moment",
      artist: "",
      source: "",
      sourceUrl: "",
      sourceType: "youtube",
      thumbnail: "",
      emotionTags: [],
      timestamp: "2026-01-15",
      sortOrder: 0,
      visibility: "public",
      channelId: null,
      channelName: null,
      channelUrl: null,
      createdAt: "2026-01-15T00:00:00Z",
      updatedAt: "2026-01-15T00:00:00Z",
    };
    const db = makeDb({
      treeRows: [[OWNER_TREE]],
      memoryRows: [[createdMemory]],
    });

    const response = await memoriesRouter(makeContext({
      method: "GET",
      path: "/api/trees/tree-owner/memories",
      db,
    }));

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(Array.isArray(body));
    assert.equal(body[0].id, "mem-1");
    assert.equal(body[0].memo, "first moment");
    assert.equal(body[0].sortOrder, 0);
  });
});

test("re-fetching after refresh returns same data (idempotent read)", async () => {
  await withFirebaseKeyFetch(async () => {
    const memoryRow = {
      id: "mem-persist",
      treeId: "tree-owner",
      parentId: null,
      title: "persisted",
      memo: "survives refresh",
      artist: "",
      source: "",
      sourceUrl: "",
      sourceType: "youtube",
      thumbnail: "",
      emotionTags: ["여운"],
      timestamp: "2026-01-15",
      sortOrder: 0,
      visibility: "public",
      channelId: null,
      channelName: null,
      channelUrl: null,
      createdAt: "2026-01-15T00:00:00Z",
      updatedAt: "2026-01-15T00:00:00Z",
    };

    const db1 = makeDb({ treeRows: [[OWNER_TREE]], memoryRows: [[memoryRow]] });
    const db2 = makeDb({ treeRows: [[OWNER_TREE]], memoryRows: [[{ ...memoryRow }]] });

    const resp1 = await memoriesRouter(makeContext({
      method: "GET",
      path: "/api/trees/tree-owner/memories",
      db: db1,
    }));
    const resp2 = await memoriesRouter(makeContext({
      method: "GET",
      path: "/api/trees/tree-owner/memories",
      db: db2,
    }));

    const body1 = await resp1.json();
    const body2 = await resp2.json();
    assert.equal(body1[0].id, body2[0].id);
    assert.equal(body1[0].memo, body2[0].memo);
    assert.equal(body1[0].sortOrder, body2[0].sortOrder);
  });
});

test("foreign user cannot create memory on another user's tree", async () => {
  await withFirebaseKeyFetch(async () => {
    const foreignTree = { ...OWNER_TREE, ownerId: OTHER_USER_ID };
    const db = makeDb({ treeRows: [[foreignTree]] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "should fail" },
      db,
    }));

    assert.equal(response.status, 404);
    assert.equal(db.inserted.length, 0);
  });
});

test("empty memo and title are rejected by validation", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "", title: "" },
      db,
    }));

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.ok(body.error);
    assert.equal(db.inserted.length, 0);
  });
});

test("whitespace-only memo and title are rejected by validation", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "   ", title: "   " },
      db,
    }));

    assert.equal(response.status, 400);
    assert.equal(db.inserted.length, 0);
  });
});

test("invalid timestamp is rejected by validation", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "test", timestamp: "not-a-date" },
      db,
    }));

    assert.equal(response.status, 400);
    assert.equal(db.inserted.length, 0);
  });
});

test("non-existent date like 2026-02-31 is rejected by validation", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "test", timestamp: "2026-02-31" },
      db,
    }));

    assert.equal(response.status, 400);
    assert.equal(db.inserted.length, 0);
  });
});

test("negative client sortOrder on create is ignored; server assigns 0", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "test", sortOrder: -1 },
      db,
    }));

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.sortOrder, 0);
    assert.equal(db.inserted.length, 1);
    assert.equal(db.inserted[0].value.sortOrder, 0);
  });
});

test("decimal client sortOrder on create is ignored; server assigns 0", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "test", sortOrder: 1.5 },
      db,
    }));

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.sortOrder, 0);
    assert.equal(db.inserted.length, 1);
    assert.equal(db.inserted[0].value.sortOrder, 0);
  });
});

test("string client sortOrder on create is ignored; server assigns 0", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "test", sortOrder: "abc" },
      db,
    }));

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.sortOrder, 0);
    assert.equal(db.inserted.length, 1);
    assert.equal(db.inserted[0].value.sortOrder, 0);
  });
});

test("server assigns sortOrder on append, ignoring client value", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: {
        memo: "first moment",
        sortOrder: 999,
        timestamp: "2026-01-15",
      },
      db,
    }));

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.sortOrder, 0);
    assert.equal(db.inserted.length, 1);
    assert.equal(db.inserted[0].value.sortOrder, 0);
  });
});

test("server assigns incrementing sortOrder for consecutive appends", async () => {
  await withFirebaseKeyFetch(async () => {
    const existingMemories = [
      { id: "mem-1", treeId: "tree-owner", sortOrder: 1, timestamp: "2026-01-16", createdAt: "2026-01-16T00:00:00Z" },
      { id: "mem-0", treeId: "tree-owner", sortOrder: 0, timestamp: "2026-01-15", createdAt: "2026-01-15T00:00:00Z" },
    ];
    const db = makeDb({
      treeRows: [[OWNER_TREE]],
      memoryRows: [existingMemories],
    });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: { memo: "next moment", timestamp: "2026-01-17" },
      db,
    }));

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.sortOrder, 2);
    assert.equal(db.inserted.length, 1);
    assert.equal(db.inserted[0].value.sortOrder, 2);
  });
});

test("with-first-memory rejects empty memory title and memo", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb();
    const response = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: {
        clientKey: "test-key-empty",
        title: "My Tree",
        memory: {
          memo: "",
          title: "",
          sourceType: "youtube",
        },
      },
      db,
    }));

    assert.equal(response.status, 400);
    assert.equal(db.inserted.length, 0);
  });
});

test("with-first-memory rejects invalid memory timestamp", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb();
    const response = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: {
        clientKey: "test-key-bad-ts",
        title: "My Tree",
        memory: {
          memo: "first",
          timestamp: "bad-date",
          sourceType: "youtube",
        },
      },
      db,
    }));

    assert.equal(response.status, 400);
    assert.equal(db.inserted.length, 0);
  });
});

test("with-first-memory assigns sortOrder 0 for first moment", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb();
    const response = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: {
        clientKey: "test-key-first",
        title: "My Love Tree",
        memory: {
          memo: "첫 순간",
          sourceType: "youtube",
          timestamp: "2026-01-15",
        },
      },
      db,
    }));

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.memory.sortOrder, 0);
    assert.equal(body.memory.treeId, body.tree.id);
  });
});

test("sortMoments uses id as final tie-breaker for deterministic ordering", () => {
  const moments = [
    { id: "m-b", treeId: "t1", parentId: null, title: "", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "", sortOrder: 0, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: "2026-01-01T00:00:00Z", updatedAt: null },
    { id: "m-a", treeId: "t1", parentId: null, title: "", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "", sortOrder: 0, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: "2026-01-01T00:00:00Z", updatedAt: null },
  ].map((m) => toCanonicalMoment(m, USER_ID));

  const sorted = sortMoments(moments);
  assert.equal(sorted[0].id, "m-a");
  assert.equal(sorted[1].id, "m-b");
});

test("API and selector sorting produce identical results", () => {
  const memories = [
    { id: "m3", treeId: "t1", parentId: null, title: "", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "2026-03-01", sortOrder: 2, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: "2026-03-01T00:00:00Z", updatedAt: null },
    { id: "m1", treeId: "t1", parentId: null, title: "", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "2026-01-01", sortOrder: 0, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: "2026-01-01T00:00:00Z", updatedAt: null },
    { id: "m2", treeId: "t1", parentId: null, title: "", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "2026-02-01", sortOrder: 1, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: "2026-02-01T00:00:00Z", updatedAt: null },
  ];
  const moments = memories.map((m) => toCanonicalMoment(m, USER_ID));
  const sorted = sortMoments(moments);
  assert.equal(sorted[0].id, "m1");
  assert.equal(sorted[1].id, "m2");
  assert.equal(sorted[2].id, "m3");
});

test("duplicate submission with same clientKey returns existing memory", async () => {
  await withFirebaseKeyFetch(async () => {
    const existingMemory = {
      id: "mem-dup",
      treeId: "tree-owner",
      parentId: null,
      title: "",
      memo: "original",
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
      createdAt: "2026-01-15T00:00:00Z",
      updatedAt: "2026-01-15T00:00:00Z",
    };
    const db = makeDb({
      treeRows: [[OWNER_TREE]],
      memoryRows: [[existingMemory], [existingMemory]],
    });

    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: {
        memo: "duplicate attempt",
        clientKey: "same-key",
      },
      db,
    }));

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.id, "mem-dup");
    assert.equal(body.memo, "original");
    assert.equal(db.inserted.length, 0);
  });
});

test("with-first-memory is idempotent with same clientKey", async () => {
  await withFirebaseKeyFetch(async () => {
    const existingTree = {
      id: "existing-tree-id",
      ownerId: USER_ID,
      title: "My Love Tree",
      memo: "",
      artist: "",
      visibility: "public",
      groupName: null,
      keywords: [],
      createdAt: "2026-01-15T00:00:00Z",
      updatedAt: "2026-01-15T00:00:00Z",
    };
    const existingMemory = {
      id: "existing-mem-id",
      treeId: "existing-tree-id",
      parentId: null,
      title: "",
      memo: "첫 순간",
      artist: "",
      source: "",
      sourceUrl: "",
      sourceType: "youtube",
      thumbnail: "",
      emotionTags: [],
      timestamp: "2026-01-15",
      sortOrder: 0,
      visibility: "public",
      channelId: null,
      channelName: null,
      channelUrl: null,
      createdAt: "2026-01-15T00:00:00Z",
      updatedAt: "2026-01-15T00:00:00Z",
    };
    const db = makeDb({
      treeRows: [[existingTree]],
      memoryRows: [[existingMemory]],
    });

    const response = await treesRouter(makeContext({
      method: "POST",
      path: "/api/trees/with-first-memory",
      body: {
        clientKey: "same-client-key",
        title: "My Love Tree",
        memory: {
          memo: "첫 순간",
          sourceType: "youtube",
          timestamp: "2026-01-15",
        },
      },
      db,
    }));

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.ok(body.tree.id);
    assert.ok(body.memory.id);
    assert.equal(body.memory.memo, "첫 순간");
    assert.equal(body.memory.sortOrder, 0);
  });
});

test("sortOrder defaults to server-assigned next value when not provided", async () => {
  await withFirebaseKeyFetch(async () => {
    const db = makeDb({ treeRows: [[OWNER_TREE]] });
    const response = await memoriesRouter(makeContext({
      method: "POST",
      path: "/api/trees/tree-owner/memories",
      body: {
        memo: "default order",
        timestamp: "2026-01-15",
      },
      db,
    }));

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.sortOrder, 0);
  });
});
