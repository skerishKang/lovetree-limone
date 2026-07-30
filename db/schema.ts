import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const trees = pgTable("trees", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id"),
  title: text("title"),
  memo: text("memo").default(""),
  artist: text("artist").default(""),
  visibility: text("visibility").default("public"),
  groupName: text("group_name"),
  keywords: jsonb("keywords").default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const memories = pgTable("memories", {
  id: text("id").primaryKey(),
  treeId: text("tree_id").notNull(),
  parentId: text("parent_id"),
  title: text("title").notNull().default(""),
  memo: text("memo").notNull().default(""),
  artist: text("artist").notNull().default(""),
  source: text("source").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  sourceType: text("source_type").notNull().default("youtube"),
  thumbnail: text("thumbnail").notNull().default(""),
  emotionTags: jsonb("emotion_tags").notNull().default("[]"),
  timestamp: text("timestamp").notNull().default(""),
  visibility: text("visibility").notNull().default("public"),
  channelId: text("channel_id"),
  channelName: text("channel_name"),
  channelUrl: text("channel_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const reactions = pgTable("reactions", {
  id: text("id").primaryKey(),
  memoryId: text("memory_id").notNull(),
  ownerId: text("owner_id").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  memoryId: text("memory_id").notNull(),
  ownerId: text("owner_id").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("visible"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: text("deleted_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const treeComments = pgTable("tree_comments", {
  id: text("id").primaryKey(),
  treeId: text("tree_id").notNull(),
  ownerId: text("owner_id").notNull(),
  body: text("body").notNull(),
  targetKind: text("target_kind").notNull().default("tree"),
  targetId: text("target_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const treeLikes = pgTable("tree_likes", {
  id: text("id").primaryKey(),
  treeId: text("tree_id").notNull(),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const treeSocialCounts = pgTable("tree_social_counts", {
  treeId: text("tree_id").primaryKey(),
  likeCount: integer("like_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const treeViewDedupEvents = pgTable("tree_view_dedup_events", {
  id: text("id").primaryKey(),
  treeId: text("tree_id").notNull(),
  actorKey: text("actor_key").notNull(),
  actorKind: text("actor_kind").notNull(),
  countedWindowStart: timestamp("counted_window_start", { withTimezone: true }).notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const socialIdempotency = pgTable("social_idempotency", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  operation: text("operation").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestFingerprint: text("request_fingerprint").notNull(),
  targetMemoryId: text("target_memory_id").notNull(),
  targetKind: text("target_kind"),
  targetId: text("target_id"),
  resultId: text("result_id"),
  resultState: text("result_state").notNull().default("pending"),
  resultPayload: jsonb("result_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const socialRateLimits = pgTable("social_rate_limits", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull(),
  actorId: text("actor_id").notNull(),
  memoryId: text("memory_id"),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  requestCount: integer("request_count").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const socialAuditLog = pgTable("social_audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  memoryId: text("memory_id").notNull(),
  action: text("action").notNull(),
  outcomeCode: text("outcome_code").notNull(),
  requestKeyHash: text("request_key_hash"),
  targetKind: text("target_kind"),
  targetId: text("target_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
