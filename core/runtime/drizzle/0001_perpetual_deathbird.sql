ALTER TABLE "memories" ADD COLUMN "client_key" text;--> statement-breakpoint
ALTER TABLE "trees" ADD COLUMN "client_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "memories_tree_client_key_uniq" ON "memories" USING btree ("tree_id","client_key");--> statement-breakpoint
CREATE UNIQUE INDEX "trees_owner_client_key_uniq" ON "trees" USING btree ("owner_id","client_key");