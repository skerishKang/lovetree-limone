-- Backfill sort_order for existing memories so that every Tree has a
-- deterministic, gap-free ordering. Existing rows are numbered starting at 0
-- in the order they were created, using created_at as the primary tie-breaker
-- and id as the final tie-breaker.
--
-- This migration is idempotent: if sort_order has already been populated for
-- all rows in a Tree, the UPDATE is a no-op for that Tree.
--
-- WARNING: This migration must only be run on an isolated Preview database.
-- It must NOT be run on Production.

WITH ranked AS (
  SELECT
    id,
    tree_id,
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
  AND (m.sort_order IS DISTINCT FROM ranked.new_sort_order OR m.sort_order = 0);
