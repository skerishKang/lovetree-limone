ALTER TABLE "memories" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
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
  AND m.sort_order IS DISTINCT FROM ranked.new_sort_order;--> statement-breakpoint
CREATE UNIQUE INDEX "memories_tree_sort_order_uniq" ON "memories" USING btree ("tree_id","sort_order");
