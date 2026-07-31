import assert from "node:assert/strict";
import test from "node:test";
import {
  isTreeReadable,
  isTreeOwner,
  getReadableTree,
  getOwnedTree,
  getOwnedMemory,
} from "../server/api/access.ts";

function mockDb(rows) {
  return {
    select() {
      return {
        from() {
          return {
            where: async () => rows,
          };
        },
      };
    },
  };
}

function mockDbSequence(seq) {
  let i = 0;
  return {
    select() {
      return {
        from() {
          return {
            where: async () => {
              const row = seq[Math.min(i++, seq.length - 1)];
              return row ? [row] : [];
            },
          };
        },
      };
    },
  };
}

function makeCtx(db, projectId = "relovetree") {
  return {
    request: new Request("https://example.com/api/trees/x"),
    env: { DATABASE_URL: "postgres://test", FIREBASE_PROJECT_ID: projectId },
    db,
    url: new URL("https://example.com/api/trees/x"),
    method: "GET",
    path: "/api/trees/x",
    params: { id: "tree-1" },
  };
}

const OWNER = { uid: "owner-uid", email: "owner@example.com" };
const OTHER = { uid: "other-uid", email: "other@example.com" };

const PUBLIC_TREE = { id: "tree-1", ownerId: "owner-uid", visibility: "public", title: "t" };
const PRIVATE_TREE = { id: "tree-1", ownerId: "owner-uid", visibility: "private", title: "t" };
const UNLISTED_TREE = { id: "tree-1", ownerId: "owner-uid", visibility: "unlisted", title: "t" };

test("owner can read own private tree", () => {
  assert.equal(isTreeReadable(PRIVATE_TREE.visibility, PRIVATE_TREE.ownerId, OWNER), true);
});

test("non-owner private tree read denied", () => {
  assert.equal(isTreeReadable(PRIVATE_TREE.visibility, PRIVATE_TREE.ownerId, OTHER), false);
  assert.equal(isTreeReadable(PRIVATE_TREE.visibility, PRIVATE_TREE.ownerId, null), false);
});

test("public and unlisted trees readable by anyone", () => {
  assert.equal(isTreeReadable(PUBLIC_TREE.visibility, PUBLIC_TREE.ownerId, null), true);
  assert.equal(isTreeReadable(UNLISTED_TREE.visibility, UNLISTED_TREE.ownerId, null), true);
});

test("owner tree mutation allowed", () => {
  assert.equal(isTreeOwner(PRIVATE_TREE, OWNER), true);
});

test("non-owner tree mutation denied via getOwnedTree", async () => {
  const ctx = makeCtx(mockDb([PRIVATE_TREE]));
  const tree = await getOwnedTree(ctx, "tree-1", OTHER);
  assert.equal(tree, null);
});

test("owner getOwnedTree returns tree", async () => {
  const ctx = makeCtx(mockDb([PRIVATE_TREE]));
  const tree = await getOwnedTree(ctx, "tree-1", OWNER);
  assert.equal(tree?.id, "tree-1");
});

test("missing tree returns null (no existence leak)", async () => {
  const ctx = makeCtx(mockDb([]));
  const tree = await getOwnedTree(ctx, "ghost", OWNER);
  assert.equal(tree, null);
  const readable = await getReadableTree(ctx, "ghost", null);
  assert.equal(readable, null);
});

test("private tree read denied for non-owner via getReadableTree", async () => {
  const ctx = makeCtx(mockDb([PRIVATE_TREE]));
  const tree = await getReadableTree(ctx, "tree-1", OTHER);
  assert.equal(tree, null);
});

test("private tree fork denied", () => {
  assert.equal(isTreeReadable(PRIVATE_TREE.visibility, PRIVATE_TREE.ownerId, OTHER), false);
});

test("non-owner memory mutation denied via getOwnedMemory", async () => {
  const memory = { id: "mem-1", treeId: "tree-1" };
  const ctx = makeCtx(mockDbSequence([memory, PRIVATE_TREE]));
  const ownedMemory = await getOwnedMemory(ctx, "mem-1", OTHER);
  assert.equal(ownedMemory, null);
});

test("owner memory mutation allowed via getOwnedMemory", async () => {
  const memory = { id: "mem-1", treeId: "tree-1" };
  const ctx = makeCtx(mockDbSequence([memory, PRIVATE_TREE]));
  const ownedMemory = await getOwnedMemory(ctx, "mem-1", OWNER);
  assert.equal(ownedMemory?.id, "mem-1");
});
