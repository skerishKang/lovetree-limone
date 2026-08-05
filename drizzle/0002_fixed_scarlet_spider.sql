ALTER TABLE "memories" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "memories_tree_sort_order_idx" ON "memories" USING btree ("tree_id","sort_order");