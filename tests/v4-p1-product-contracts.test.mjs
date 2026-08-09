import assert from "node:assert/strict";
import test from "node:test";
import { getDb } from "../db/index.ts";
import { memories, trees } from "../db/schema.ts";
import {
  getReadableMemory,
  isCommunityMemoryReadable,
  isMemoryReadable,
  resolveMemoryVisibility,
} from "../server/api/access.ts";
import {
  buildCommunityTreesQuery,
  buildGrowingTreesQuery,
  BROWSE_MIN_PUBLIC_MOMENTS,
  isBrowseEligible,
} from "../server/api/trees.ts";
import {
  buildCommunityMemoriesQuery,
  memoriesRouter,
} from "../server/api/memories.ts";

const OWNER_ID = "p1-owner";
const OTHER_ID = "p1-other";
const NOW = new Date("2026-08-08T00:00:00.000Z");

function makeTree(overrides = {}) {
  return {
    id: "tree-public",
    ownerId: OWNER_ID,
    clientKey: null,
    title: "P1 Tree",
    memo: "",
    artist: "",
    visibility: "public",
    groupName: null,
    keywords: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeMemory(overrides = {}) {
  return {
    id: "memory-public",
    treeId: "tree-public",
    clientKey: null,
    parentId: null,
    title: "Moment",
    memo: "remembered",
    artist: "",
    source: "",
    sourceUrl: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    sourceType: "youtube",
    thumbnail: "",
    emotionTags: [],
    timestamp: "2026-08-08",
    sortOrder: 0,
    visibility: "public",
    channelId: null,
    channelName: null,
    channelUrl: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function publicMomentCount(visibilities) {
  return visibilities.filter((visibility) => visibility === "public").length;
}

function extractConditions(expression) {
  if (!expression || !Array.isArray(expression.queryChunks)) return [];
  const conditions = [];
  let lastColumn = null;
  for (const chunk of expression.queryChunks) {
    if (!chunk || typeof chunk !== "object") continue;
    if (chunk.name && chunk.table) {
      lastColumn = chunk.name;
      continue;
    }
    if (chunk.value !== undefined && !Array.isArray(chunk.value) && lastColumn) {
      conditions.push({ column: lastColumn, value: chunk.value });
      lastColumn = null;
      continue;
    }
    if (Array.isArray(chunk.queryChunks)) {
      conditions.push(...extractConditions(chunk));
    }
  }
  return conditions;
}

function rowMatches(row, conditions) {
  return conditions.every(({ column, value }) => {
    const camel = column.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const actual = row[column] !== undefined ? row[column] : row[camel];
    return actual === value;
  });
}

function makeReadDb({ treeRows = [], memoryRows = [] } = {}) {
  function tableRows(table) {
    if (table === trees) return treeRows;
    if (table === memories) return memoryRows;
    return [];
  }

  return {
    select() {
      const query = {
        table: null,
        whereExpression: null,
        limitValue: null,
        from(table) {
          this.table = table;
          return this;
        },
        where(expression) {
          this.whereExpression = expression;
          return this;
        },
        orderBy() {
          return this;
        },
        limit(value) {
          this.limitValue = value;
          return this;
        },
        then(resolve, reject) {
          try {
            const conditions = extractConditions(this.whereExpression);
            let rows = tableRows(this.table).filter((row) => rowMatches(row, conditions));
            if (this.limitValue !== null) rows = rows.slice(0, this.limitValue);
            Promise.resolve(rows).then(resolve, reject);
          } catch (error) {
            reject(error);
          }
        },
      };
      return query;
    },
  };
}

function makeAnonymousContext({ method = "GET", path, db }) {
  const url = new URL(`https://example.test${path}`);
  return {
    request: new Request(url, { method }),
    env: { DATABASE_URL: "unused", FIREBASE_PROJECT_ID: "relovetree" },
    db,
    url,
    method,
    path: url.pathname,
    params: {},
  };
}

async function responseJson(response) {
  return JSON.parse(await response.text());
}

test("P1 visibility — omitted memory visibility inherits parent tree", () => {
  assert.equal(resolveMemoryVisibility(undefined, "public"), "public");
  assert.equal(resolveMemoryVisibility(undefined, "private"), "private");
  assert.equal(resolveMemoryVisibility(undefined, "unlisted"), "unlisted");
  assert.equal(resolveMemoryVisibility("private", "public"), "private");
  assert.equal(resolveMemoryVisibility("public", "private"), "public");
});

test("P1 visibility — public tree + public memory is publicly readable", () => {
  const tree = makeTree({ visibility: "public" });
  const memory = makeMemory({ visibility: "public" });
  assert.equal(isMemoryReadable(memory, tree, null), true);
  assert.equal(isCommunityMemoryReadable(memory.visibility, tree.visibility), true);
});

test("P1 visibility — public tree + private memory is not public", () => {
  const tree = makeTree({ visibility: "public" });
  const memory = makeMemory({ visibility: "private" });
  assert.equal(isMemoryReadable(memory, tree, null), false);
  assert.equal(isCommunityMemoryReadable(memory.visibility, tree.visibility), false);
});

test("P1 visibility — private tree blocks public-like child from anonymous exposure", () => {
  const tree = makeTree({ id: "tree-private", visibility: "private" });
  const memory = makeMemory({ treeId: tree.id, visibility: "public" });
  assert.equal(isMemoryReadable(memory, tree, null), false);
  assert.equal(isCommunityMemoryReadable(memory.visibility, tree.visibility), false);
});

test("P1 visibility — owner retains access to own private memory", () => {
  const tree = makeTree({ id: "tree-private", visibility: "private" });
  const memory = makeMemory({ treeId: tree.id, visibility: "private" });
  assert.equal(isMemoryReadable(memory, tree, { uid: OWNER_ID }), true);
});

test("P1 visibility — unauthorized user cannot read private memory", () => {
  const tree = makeTree({ id: "tree-private", visibility: "private" });
  const memory = makeMemory({ treeId: tree.id, visibility: "private" });
  assert.equal(isMemoryReadable(memory, tree, { uid: OTHER_ID }), false);
});

test("P1 browse — publicMomentCount threshold is 3 and ignores private moments", () => {
  assert.equal(BROWSE_MIN_PUBLIC_MOMENTS, 3);

  for (const count of [0, 1, 2]) {
    assert.equal(
      isBrowseEligible("public", count),
      false,
      `publicMomentCount=${count} must be excluded`,
    );
  }
  assert.equal(isBrowseEligible("public", 3), true, "3 public moments must be eligible");
  assert.equal(isBrowseEligible("public", 4), true, ">3 public moments must be eligible");

  assert.equal(
    isBrowseEligible("public", publicMomentCount(["public", "public", "private", "private"])),
    false,
    "private moments must not count toward Browse eligibility",
  );
  assert.equal(
    isBrowseEligible("public", publicMomentCount(["public", "public", "public", "private"])),
    true,
    "three public moments qualify even when additional private moments exist",
  );
  assert.equal(isBrowseEligible("private", 99), false, "private tree is never Browse eligible");
});

test("P1 browse SQL — community summaries require public tree and >=3 public memories", () => {
  const db = getDb("postgresql://user:pass@localhost:5432/lovetree_test");
  const query = buildCommunityTreesQuery(db, "latest", 12).toSQL();
  const normalized = query.sql.replace(/\s+/g, " ").toLowerCase();

  assert.match(normalized, /from "trees"/);
  assert.match(normalized, /select count\(\*\)/);
  assert.match(normalized, /from "memories"/);
  assert.match(normalized, /"memories"\."tree_id" = "trees"\."id"/);
  assert.ok(query.params.filter((value) => value === "public").length >= 2);
  assert.ok(query.params.includes(3), "community query must bind the 3-public-moment threshold");
});

test("P1 browse SQL — growing-tree community feed uses the same eligibility guard", () => {
  const db = getDb("postgresql://user:pass@localhost:5432/lovetree_test");
  const query = buildGrowingTreesQuery(db, 6).toSQL();
  const normalized = query.sql.replace(/\s+/g, " ").toLowerCase();

  assert.match(normalized, /select count\(\*\)/);
  assert.match(normalized, /from "memories"/);
  assert.ok(query.params.filter((value) => value === "public").length >= 2);
  assert.ok(query.params.includes(3));
});

test("P1 leakage SQL — community memory list requires public child and public parent", () => {
  const db = getDb("postgresql://user:pass@localhost:5432/lovetree_test");
  const query = buildCommunityMemoriesQuery(db, "tree-public", 100).toSQL();
  const normalized = query.sql.replace(/\s+/g, " ").toLowerCase();

  assert.match(normalized, /exists \( select 1 from "trees"/);
  assert.match(normalized, /"trees"\."id" = "memories"\."tree_id"/);
  assert.ok(query.params.filter((value) => value === "public").length >= 2);
  assert.ok(query.params.includes("tree-public"));
});

test("P1 leakage — direct memory API denies a private child of a public tree", async () => {
  const tree = makeTree({ id: "tree-public", visibility: "public" });
  const privateMemory = makeMemory({
    id: "memory-private",
    treeId: tree.id,
    visibility: "private",
  });
  const db = makeReadDb({ treeRows: [tree], memoryRows: [privateMemory] });

  const response = await memoriesRouter(makeAnonymousContext({
    path: "/api/memories/memory-private",
    db,
  }));

  assert.equal(response.status, 404);
});

test("P1 leakage — direct memory API allows public child of a public tree", async () => {
  const tree = makeTree({ id: "tree-public", visibility: "public" });
  const publicMemory = makeMemory({
    id: "memory-public",
    treeId: tree.id,
    visibility: "public",
  });
  const db = makeReadDb({ treeRows: [tree], memoryRows: [publicMemory] });

  const response = await memoriesRouter(makeAnonymousContext({
    path: "/api/memories/memory-public",
    db,
  }));

  assert.equal(response.status, 200);
  assert.equal((await responseJson(response)).id, "memory-public");
});

test("P1 leakage — private parent blocks public-like child by direct API", async () => {
  const tree = makeTree({ id: "tree-private", visibility: "private" });
  const child = makeMemory({
    id: "memory-public-like",
    treeId: tree.id,
    visibility: "public",
  });
  const db = makeReadDb({ treeRows: [tree], memoryRows: [child] });

  const response = await memoriesRouter(makeAnonymousContext({
    path: "/api/memories/memory-public-like",
    db,
  }));

  assert.equal(response.status, 404);
});

test("P1 leakage — public tree memory collection filters private children", async () => {
  const tree = makeTree({ id: "tree-public", visibility: "public" });
  const publicMemory = makeMemory({
    id: "memory-public",
    treeId: tree.id,
    visibility: "public",
    sortOrder: 0,
  });
  const privateMemory = makeMemory({
    id: "memory-private",
    treeId: tree.id,
    visibility: "private",
    sortOrder: 1,
  });
  const db = makeReadDb({ treeRows: [tree], memoryRows: [publicMemory, privateMemory] });

  const response = await memoriesRouter(makeAnonymousContext({
    path: "/api/trees/tree-public/memories",
    db,
  }));
  const body = await responseJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body.map((row) => row.id), ["memory-public"]);
});

test("P1 access helper — database-backed readable memory applies child and parent guards", async () => {
  const publicTree = makeTree({ id: "tree-public", visibility: "public" });
  const privateChild = makeMemory({
    id: "memory-private",
    treeId: publicTree.id,
    visibility: "private",
  });
  const db = makeReadDb({ treeRows: [publicTree], memoryRows: [privateChild] });
  const ctx = makeAnonymousContext({ path: "/api/memories/memory-private", db });

  assert.equal(await getReadableMemory(ctx, privateChild.id, null), null);
});
