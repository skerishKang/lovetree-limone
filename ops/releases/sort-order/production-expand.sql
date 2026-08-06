-- ============================================================================
-- LoveTree sort_order — Production Expand migration (release-time SQL)
--
-- Applies ONLY to the Production database, which at this release has:
--   - NO sort_order column on memories
--   - NO sort_order unique index
--   - client_key unique index present
--   - no drizzle migration journal
--
-- Target (Expand) state:
--   - sort_order integer, NULL allowed, no DEFAULT
--   - existing rows deterministically backfilled per tree (0..N by created_at, id)
--   - partial unique index: UNIQUE(tree_id, sort_order) WHERE sort_order IS NOT NULL
--   - client_key uniqueness preserved
--   - id / client_key / parent_id / created_at / updated_at unchanged
--
-- Explicitly NOT applied here:
--   - DEFAULT 0
--   - NOT NULL
--   - full unique index (that is the future Contract step)
--
-- This mirrors drizzle/0002_fixed_scarlet_spider.sql and must be kept in sync.
--
-- Execution:
--   psql -v ON_ERROR_STOP=1 -f ops/releases/sort-order/production-expand.sql
--
-- The whole migration is wrapped in an explicit transaction. On any failure
-- the transaction rolls back completely: no column, no backfill, no index.
-- Do NOT run the statements individually under autocommit.
-- ============================================================================

BEGIN;

ALTER TABLE "memories" ADD COLUMN "sort_order" integer;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY tree_id
      ORDER BY created_at ASC, id ASC
    ) - 1 AS new_sort_order
  FROM memories
)
UPDATE memories m
SET sort_order = ranked.new_sort_order
FROM ranked
WHERE m.id = ranked.id
  AND m.sort_order IS DISTINCT FROM ranked.new_sort_order;

CREATE UNIQUE INDEX "memories_tree_sort_order_uniq_partial"
  ON "memories" USING btree ("tree_id","sort_order")
  WHERE "sort_order" IS NOT NULL;

COMMIT;
