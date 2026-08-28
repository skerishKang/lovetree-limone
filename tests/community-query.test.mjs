import assert from "node:assert/strict";
import test from "node:test";
import { getDb } from "../core/runtime/db/index.ts";
import {
  buildCommunityTreesQuery,
  buildGrowingTreesQuery,
  listCommunityTrees,
} from "../core/runtime/server/api/trees.ts";

const db = getDb("postgresql://user@example.com/database");

test("community summary query uses an explicit public projection", () => {
  const query = buildCommunityTreesQuery(db, "latest", 12).toSQL();

  assert.match(query.sql, /select "trees"\."id"/);
  assert.match(query.sql, /"trees"\."group_name"/);
  assert.match(query.sql, /"trees"\."created_at"/);
  assert.match(query.sql, /coalesce\("tree_social_counts"\."like_count", 0\)/);
  assert.match(query.sql, /coalesce\("tree_social_counts"\."view_count", 0\)/);
  assert.doesNotMatch(query.sql, /"trees"\."owner_id"/);
  assert.doesNotMatch(query.sql, /"trees"\."client_key"/);
  assert.doesNotMatch(query.sql, /"trees"\."updated_at"/);
});

test("community sort expressions coalesce missing social rows", () => {
  const sorts = [
    ["latest", /order by "trees"\."created_at" desc/],
    ["popular", /order by coalesce\("tree_social_counts"\."like_count", 0\) desc/],
    ["likes", /order by coalesce\("tree_social_counts"\."like_count", 0\) desc/],
    ["views", /order by coalesce\("tree_social_counts"\."view_count", 0\) desc/],
  ];

  for (const [sort, orderPattern] of sorts) {
    const query = buildCommunityTreesQuery(db, sort, 12).toSQL();
    assert.match(query.sql, orderPattern);
    assert.deepEqual(query.params, ["public", "public", 3, 12]);
  }
});

test("growing trees uses a minimal explicit projection and zero-safe likes", () => {
  const query = buildGrowingTreesQuery(db, 6).toSQL();

  assert.match(query.sql, /select "trees"\."id", "trees"\."title", "trees"\."artist"/);
  assert.match(query.sql, /coalesce\("tree_social_counts"\."like_count", 0\)/);
  assert.doesNotMatch(query.sql, /"trees"\."owner_id"|"trees"\."client_key"|"trees"\."memo"/);
});

test("community response preserves camelCase public shape and omits ownerId", async () => {
  const calls = {};
  const rows = [{
    id: "tree-1",
    title: "A tree",
    artist: "An artist",
    memo: "A memo",
    groupName: null,
    keywords: [],
    visibility: "public",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    likeCount: 0,
    viewCount: 0,
  }];
  const chain = {
    from() { return this; },
    leftJoin() { return this; },
    where() { return this; },
    orderBy() { return this; },
    limit(value) { calls.limit = value; return Promise.resolve(rows); },
  };
  const fakeDb = {
    select(selection) {
      calls.selection = Object.keys(selection);
      return chain;
    },
  };

  const response = await listCommunityTrees({
    request: new Request("https://example.com/api/community/trees"),
    env: { APP_ENV: "test", DATABASE_URL: "unused" },
    db: fakeDb,
    url: new URL("https://example.com/api/community/trees?sort=popular"),
    method: "GET",
    path: "/api/community/trees",
    params: {},
  });

  assert.equal(response.status, 200);
  assert.equal(calls.limit, 12);
  assert.deepEqual(calls.selection, [
    "id", "title", "artist", "memo", "groupName", "keywords",
    "visibility", "createdAt", "likeCount", "viewCount",
  ]);
  const body = await response.json();
  assert.deepEqual(Object.keys(body[0]).sort(), [
    "artist", "createdAt", "groupName", "id", "keywords", "likeCount",
    "memo", "title", "viewCount", "visibility",
  ]);
  assert.equal(body[0].likeCount, 0);
  assert.equal(body[0].viewCount, 0);
  assert.equal("ownerId" in body[0], false);
});