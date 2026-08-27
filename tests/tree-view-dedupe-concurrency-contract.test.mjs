import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getTreeViewWindowStart } from "../server/api/social.ts";

const source = await readFile(new URL("../server/api/social.ts", import.meta.url), "utf8");
const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");

test("tree view window identity is deterministic inside a 24h UTC bucket", () => {
  const early = getTreeViewWindowStart(new Date("2026-08-25T00:00:00.001Z"));
  const late = getTreeViewWindowStart(new Date("2026-08-25T23:59:59.999Z"));
  assert.equal(early.toISOString(), "2026-08-25T00:00:00.000Z");
  assert.equal(late.toISOString(), early.toISOString());
});

test("next 24h bucket has a distinct canonical identity", () => {
  const current = getTreeViewWindowStart(new Date("2026-08-25T23:59:59.999Z"));
  const next = getTreeViewWindowStart(new Date("2026-08-26T00:00:00.000Z"));
  assert.equal(next.getTime() - current.getTime(), 24 * 60 * 60 * 1000);
});

test("recordTreeView uses an atomic DB claim instead of read-before-write", () => {
  const recordTreeView = source.slice(source.indexOf("async function recordTreeView"));
  assert.doesNotMatch(recordTreeView, /\.select\s*\(/);
  assert.match(
    recordTreeView,
    /on conflict \(tree_id, actor_kind, actor_key, counted_window_start\) do nothing/i
  );
  assert.match(recordTreeView, /from claimed/i);
  assert.match(recordTreeView, /view_count = tree_social_counts\.view_count \+ 1/i);
});

test("existing DB unique key remains the final dedupe authority", () => {
  assert.match(
    schema,
    /uniqueIndex\("tree_view_dedup_event_uniq"\)[\s\S]*table\.treeId[\s\S]*table\.actorKind[\s\S]*table\.actorKey[\s\S]*table\.countedWindowStart/
  );
});
