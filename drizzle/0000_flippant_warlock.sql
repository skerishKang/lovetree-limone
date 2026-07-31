CREATE TYPE "public"."comment_status" AS ENUM('visible', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."reaction_type" AS ENUM('like', 'love', 'laugh', 'wow', 'sad', 'angry');--> statement-breakpoint
CREATE TYPE "public"."social_outcome" AS ENUM('ok', 'duplicate', 'not_found', 'forbidden', 'rate_limited', 'error');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('youtube', 'video', 'song', 'book', 'person', 'travel', 'other', 'link');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'unlisted', 'public');--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"memory_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"body" text NOT NULL,
	"status" "comment_status" DEFAULT 'visible' NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" text PRIMARY KEY NOT NULL,
	"tree_id" text NOT NULL,
	"parent_id" text,
	"title" text DEFAULT '' NOT NULL,
	"memo" text DEFAULT '' NOT NULL,
	"artist" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"source_type" "source_type" DEFAULT 'youtube' NOT NULL,
	"thumbnail" text DEFAULT '' NOT NULL,
	"emotion_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timestamp" text DEFAULT '' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"channel_id" text,
	"channel_name" text,
	"channel_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"memory_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"type" "reaction_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"memory_id" text NOT NULL,
	"action" text NOT NULL,
	"outcome_code" "social_outcome" NOT NULL,
	"request_key_hash" text,
	"target_kind" text,
	"target_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_idempotency" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"operation" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"target_memory_id" text NOT NULL,
	"target_kind" text,
	"target_id" text,
	"result_id" text,
	"result_state" text DEFAULT 'pending' NOT NULL,
	"result_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"actor_id" text NOT NULL,
	"memory_id" text,
	"window_start" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tree_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"tree_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"body" text NOT NULL,
	"target_kind" text DEFAULT 'tree' NOT NULL,
	"target_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tree_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"tree_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tree_social_counts" (
	"tree_id" text PRIMARY KEY NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tree_view_dedup_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tree_id" text NOT NULL,
	"actor_key" text NOT NULL,
	"actor_kind" text NOT NULL,
	"counted_window_start" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trees" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"memo" text DEFAULT '' NOT NULL,
	"artist" text DEFAULT '' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"group_name" text,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_parent_id_memories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."memories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_audit_log" ADD CONSTRAINT "social_audit_log_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_idempotency" ADD CONSTRAINT "social_idempotency_target_memory_id_memories_id_fk" FOREIGN KEY ("target_memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_rate_limits" ADD CONSTRAINT "social_rate_limits_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_comments" ADD CONSTRAINT "tree_comments_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_likes" ADD CONSTRAINT "tree_likes_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_social_counts" ADD CONSTRAINT "tree_social_counts_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_view_dedup_events" ADD CONSTRAINT "tree_view_dedup_events_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_memory_id_idx" ON "comments" USING btree ("memory_id");--> statement-breakpoint
CREATE INDEX "comments_owner_id_idx" ON "comments" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "memories_tree_id_idx" ON "memories" USING btree ("tree_id");--> statement-breakpoint
CREATE INDEX "memories_visibility_created_at_idx" ON "memories" USING btree ("visibility","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_memory_owner_type_uniq" ON "reactions" USING btree ("memory_id","owner_id","type");--> statement-breakpoint
CREATE INDEX "reactions_memory_id_idx" ON "reactions" USING btree ("memory_id");--> statement-breakpoint
CREATE INDEX "social_audit_log_memory_id_idx" ON "social_audit_log" USING btree ("memory_id");--> statement-breakpoint
CREATE INDEX "social_audit_log_actor_id_idx" ON "social_audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_idempotency_actor_op_key_uniq" ON "social_idempotency" USING btree ("actor_id","operation","idempotency_key");--> statement-breakpoint
CREATE INDEX "social_idempotency_target_memory_idx" ON "social_idempotency" USING btree ("target_memory_id");--> statement-breakpoint
CREATE INDEX "social_rate_limits_scope_actor_idx" ON "social_rate_limits" USING btree ("scope","actor_id");--> statement-breakpoint
CREATE INDEX "tree_comments_tree_id_idx" ON "tree_comments" USING btree ("tree_id");--> statement-breakpoint
CREATE INDEX "tree_comments_owner_id_idx" ON "tree_comments" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tree_likes_tree_owner_uniq" ON "tree_likes" USING btree ("tree_id","owner_id");--> statement-breakpoint
CREATE INDEX "tree_likes_tree_id_idx" ON "tree_likes" USING btree ("tree_id");--> statement-breakpoint
CREATE INDEX "tree_view_dedup_tree_actor_idx" ON "tree_view_dedup_events" USING btree ("tree_id","actor_kind","actor_key");--> statement-breakpoint
CREATE UNIQUE INDEX "tree_view_dedup_event_uniq" ON "tree_view_dedup_events" USING btree ("tree_id","actor_kind","actor_key","counted_window_start");--> statement-breakpoint
CREATE INDEX "trees_owner_id_idx" ON "trees" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "trees_visibility_created_at_idx" ON "trees" USING btree ("visibility","created_at");