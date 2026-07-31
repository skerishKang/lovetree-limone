import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const repairSql = await readFile(
  new URL("../drizzle/0002_neon_dev_schema_reconciliation.sql", import.meta.url),
  "utf8",
);

test("Neon reconciliation is additive and guarded", () => {
  assert.doesNotMatch(repairSql, /\bDROP\s+(TABLE|DATABASE)|\bTRUNCATE\b/i);
  assert.doesNotMatch(repairSql, /INSERT\s+INTO\s+.*__drizzle_migrations/i);
  assert.match(repairSql, /RAISE EXCEPTION/);
  assert.match(repairSql, /ADD COLUMN client_key text/);
  assert.match(repairSql, /CREATE TYPE public\.visibility/);
  assert.match(repairSql, /FOREIGN KEY \(tree_id\)/);
  assert.match(repairSql, /CREATE UNIQUE INDEX IF NOT EXISTS trees_owner_client_key_uniq/);
});

test("Neon reconciliation does not alter the canonical migration files", async () => {
  const first = await readFile(new URL("../drizzle/0000_flippant_warlock.sql", import.meta.url), "utf8");
  const second = await readFile(new URL("../drizzle/0001_perpetual_deathbird.sql", import.meta.url), "utf8");
  assert.match(first, /CREATE TABLE "trees"/);
  assert.match(second, /ALTER TABLE "trees" ADD COLUMN "client_key"/);
});
