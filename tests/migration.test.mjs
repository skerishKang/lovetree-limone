import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";

async function migrationSql() {
  const dir = new URL("../drizzle/", import.meta.url);
  const files = (await readdir(dir))
    .filter((f) => /^\d{4}_\w+\.sql$/.test(f))
    .sort();
  const chunks = [];
  for (const file of files) {
    chunks.push(await readFile(new URL(file, dir), "utf8"));
  }
  return chunks.join("\n");
}

test("migration creates all 11 tables", async () => {
  const sql = await migrationSql();
  const tables = [...sql.matchAll(/CREATE TABLE "public"\."(\w+)"/g)].map((m) => m[1]);
  const expected = [
    "trees",
    "memories",
    "reactions",
    "comments",
    "tree_comments",
    "tree_likes",
    "tree_social_counts",
    "tree_view_dedup_events",
    "social_idempotency",
    "social_rate_limits",
    "social_audit_log",
  ];
  for (const name of expected) {
    assert.ok(tables.includes(name), `missing table ${name}`);
  }
  assert.equal(tables.length, 11);
});

test("migration defines PostgreSQL enums", async () => {
  const sql = await migrationSql();
  for (const en of ["visibility", "source_type", "comment_status", "reaction_type", "social_outcome"]) {
    assert.ok(sql.includes(`CREATE TYPE "public"."${en}"`), `missing enum ${en}`);
  }
});

test("migration enforces uniqueness for reactions, likes, views, idempotency, client keys", async () => {
  const sql = await migrationSql();
  for (const idx of [
    "reactions_memory_owner_type_uniq",
    "tree_likes_tree_owner_uniq",
    "tree_view_dedup_event_uniq",
    "social_idempotency_actor_op_key_uniq",
    "trees_owner_client_key_uniq",
    "memories_tree_client_key_uniq",
  ]) {
    assert.ok(sql.includes(`CREATE UNIQUE INDEX "${idx}"`), `missing unique index ${idx}`);
  }
});

test("migration uses cascade for child FKs and set null for memory parent", async () => {
  const sql = await migrationSql();
  const cascadeFks = [
    "comments_memory_id_memories_id_fk",
    "memories_tree_id_trees_id_fk",
    "reactions_memory_id_memories_id_fk",
    "tree_comments_tree_id_trees_id_fk",
    "tree_likes_tree_id_trees_id_fk",
    "tree_social_counts_tree_id_trees_id_fk",
    "tree_view_dedup_events_tree_id_trees_id_fk",
  ];
  for (const fk of cascadeFks) {
    assert.ok(
      sql.includes(`CONSTRAINT "${fk}" FOREIGN KEY`) && sql.includes("ON DELETE cascade"),
      `FK ${fk} must cascade`
    );
  }
  assert.ok(
    sql.includes('CONSTRAINT "memories_parent_id_memories_id_fk" FOREIGN KEY') &&
      sql.includes("ON DELETE set null")
  );
});

test("migration applies notNull and default now for timestamps", async () => {
  const sql = await migrationSql();
  assert.match(sql, /"created_at" timestamp with time zone DEFAULT now\(\) NOT NULL/);
  assert.match(sql, /"updated_at" timestamp with time zone DEFAULT now\(\) NOT NULL/);
  assert.match(sql, /"owner_id" text NOT NULL/);
  assert.match(sql, /"title" text NOT NULL/);
});

test("migration defines query indexes", async () => {
  const sql = await migrationSql();
  for (const idx of [
    "trees_owner_id_idx",
    "memories_tree_id_idx",
    "comments_memory_id_idx",
    "tree_likes_tree_id_idx",
    "tree_view_dedup_tree_actor_idx",
  ]) {
    assert.ok(sql.includes(`CREATE INDEX "${idx}"`), `missing index ${idx}`);
  }
});
