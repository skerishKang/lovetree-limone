-- ============================================================================
-- LoveTree sort_order — Contract migration (manual, FUTURE step)
--
-- Tightens the Expand schema back to the original contract AFTER the rollback
-- window has ended and the re-forward backfill has guaranteed:
--   - 0 rows with sort_order IS NULL
--   - 0 duplicate (tree_id, sort_order) pairs
--
-- Safety gates refuse to proceed otherwise.
--
-- This is a SEPARATE future release. It is NOT applied by this PR's merge and
-- NOT applied by the initial Production Expand deployment.
-- ============================================================================

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM memories WHERE sort_order IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'refused: % memories still have NULL sort_order; run reforward-backfill.sql first', n;
  END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM (
    SELECT tree_id, sort_order FROM memories GROUP BY tree_id, sort_order HAVING count(*) > 1
  ) d;
  IF n > 0 THEN
    RAISE EXCEPTION 'refused: % duplicate (tree_id, sort_order) pairs remain', n;
  END IF;
END $$;

DROP INDEX IF EXISTS memories_tree_sort_order_uniq_partial;
CREATE UNIQUE INDEX IF NOT EXISTS memories_tree_sort_order_uniq
  ON memories (tree_id, sort_order);

ALTER TABLE memories ALTER COLUMN sort_order SET DEFAULT 0;
ALTER TABLE memories ALTER COLUMN sort_order SET NOT NULL;

COMMIT;
