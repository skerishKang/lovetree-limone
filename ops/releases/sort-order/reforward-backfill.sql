-- ============================================================================
-- LoveTree sort_order — Re-forward backfill (manual operational step)
--
-- Run after a Worker-only rollback to the old (pre-sortOrder) code created
-- rows with sort_order = NULL. Assigns deterministic, non-colliding values to
-- every NULL row, continuing from the current max non-NULL sort_order per tree.
--
-- Idempotent: only touches rows where sort_order IS NULL.
--
-- This is NOT part of the automatic migration chain and is NOT applied by this
-- release. It is executed manually only when a re-forward is required.
-- ============================================================================

BEGIN;

WITH ranked AS (
  SELECT
    m.id,
    COALESCE(base.max_so, -1) + ROW_NUMBER() OVER (
      PARTITION BY m.tree_id
      ORDER BY m.created_at ASC, m.id ASC
    ) AS new_sort_order
  FROM memories m
  JOIN LATERAL (
    SELECT MAX(m2.sort_order) AS max_so
    FROM memories m2
    WHERE m2.tree_id = m.tree_id AND m2.sort_order IS NOT NULL
  ) base ON TRUE
  WHERE m.sort_order IS NULL
)
UPDATE memories m
SET sort_order = ranked.new_sort_order
FROM ranked
WHERE m.id = ranked.id;

COMMIT;
