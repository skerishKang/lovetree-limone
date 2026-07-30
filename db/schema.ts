import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const trees = sqliteTable("trees", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id"),
  title: text("title"),
  memo: text("memo").default(""),
  artist: text("artist").default(""),
  visibility: text("visibility").default("public"),
  groupName: text("group_name"),
  keywords: text("keywords").default("[]"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const memories = sqliteTable("memories", {
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
  emotionTags: text("emotion_tags").notNull().default("[]"),
  timestamp: text("timestamp").notNull().default(""),
  visibility: text("visibility").notNull().default("public"),
  channelId: text("channel_id"),
  channelName: text("channel_name"),
  channelUrl: text("channel_url"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const reactions = sqliteTable("reactions", {
  id: text("id").primaryKey(),
  memoryId: text("memory_id").notNull(),
  ownerId: text("owner_id").notNull(),
  type: text("type").notNull(),
  createdAt: text("created_at").notNull(),
});

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  memoryId: text("memory_id").notNull(),
  ownerId: text("owner_id").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("visible"),
  deletedAt: text("deleted_at"),
  deletedBy: text("deleted_by"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const treeComments = sqliteTable("tree_comments", {
  id: text("id").primaryKey(),
  treeId: text("tree_id").notNull(),
  ownerId: text("owner_id").notNull(),
  body: text("body").notNull(),
  targetKind: text("target_kind").notNull().default("tree"),
  targetId: text("target_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const treeLikes = sqliteTable("tree_likes", {
  id: text("id").primaryKey(),
  treeId: text("tree_id").notNull(),
  ownerId: text("owner_id").notNull(),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const treeSocialCounts = sqliteTable("tree_social_counts", {
  treeId: text("tree_id").primaryKey(),
  likeCount: integer("like_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});

export const treeViewDedupEvents = sqliteTable("tree_view_dedup_events", {
  id: text("id").primaryKey(),
  treeId: text("tree_id").notNull(),
  actorKey: text("actor_key").notNull(),
  actorKind: text("actor_kind").notNull(),
  countedWindowStart: text("counted_window_start").notNull(),
  source: text("source").notNull(),
  createdAt: text("created_at").notNull(),
});

export const socialIdempotency = sqliteTable("social_idempotency", {
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
  resultPayload: text("result_payload"),
  createdAt: text("created_at").notNull(),
});

export const socialRateLimits = sqliteTable("social_rate_limits", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull(),
  actorId: text("actor_id").notNull(),
  memoryId: text("memory_id"),
  windowStart: text("window_start").notNull(),
  requestCount: integer("request_count").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export const socialAuditLog = sqliteTable("social_audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  memoryId: text("memory_id").notNull(),
  action: text("action").notNull(),
  outcomeCode: text("outcome_code").notNull(),
  requestKeyHash: text("request_key_hash"),
  targetKind: text("target_kind"),
  targetId: text("target_id"),
  createdAt: text("created_at").notNull(),
});
