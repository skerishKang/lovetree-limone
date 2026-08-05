import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const visibilityEnum = pgEnum("visibility", ["private", "unlisted", "public"]);
export const sourceTypeEnum = pgEnum("source_type", [
  "youtube",
  "video",
  "song",
  "book",
  "person",
  "travel",
  "other",
  "link",
]);
export const commentStatusEnum = pgEnum("comment_status", ["visible", "deleted"]);
export const reactionTypeEnum = pgEnum("reaction_type", [
  "like",
  "love",
  "laugh",
  "wow",
  "sad",
  "angry",
]);
export const socialOutcomeEnum = pgEnum("social_outcome", [
  "ok",
  "duplicate",
  "not_found",
  "forbidden",
  "rate_limited",
  "error",
]);

export const trees = pgTable(
  "trees",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    clientKey: text("client_key"),
    title: text("title").notNull(),
    memo: text("memo").notNull().default(""),
    artist: text("artist").notNull().default(""),
    visibility: visibilityEnum("visibility").notNull().default("public"),
    groupName: text("group_name"),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("trees_owner_id_idx").on(table.ownerId),
    index("trees_visibility_created_at_idx").on(table.visibility, table.createdAt),
    uniqueIndex("trees_owner_client_key_uniq").on(table.ownerId, table.clientKey),
  ]
);

export const memories = pgTable(
  "memories",
  {
    id: text("id").primaryKey(),
    treeId: text("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    clientKey: text("client_key"),
    parentId: text("parent_id").references((): AnyPgColumn => memories.id, { onDelete: "set null" }),
    title: text("title").notNull().default(""),
    memo: text("memo").notNull().default(""),
    artist: text("artist").notNull().default(""),
    source: text("source").notNull().default(""),
    sourceUrl: text("source_url").notNull().default(""),
    sourceType: sourceTypeEnum("source_type").notNull().default("youtube"),
    thumbnail: text("thumbnail").notNull().default(""),
    emotionTags: jsonb("emotion_tags").$type<string[]>().notNull().default([]),
    timestamp: text("timestamp").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    visibility: visibilityEnum("visibility").notNull().default("public"),
    channelId: text("channel_id"),
    channelName: text("channel_name"),
    channelUrl: text("channel_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("memories_tree_id_idx").on(table.treeId),
    index("memories_visibility_created_at_idx").on(table.visibility, table.createdAt),
    index("memories_tree_sort_order_idx").on(table.treeId, table.sortOrder),
    uniqueIndex("memories_tree_client_key_uniq").on(table.treeId, table.clientKey),
  ]
);

export const reactions = pgTable(
  "reactions",
  {
    id: text("id").primaryKey(),
    memoryId: text("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    type: reactionTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("reactions_memory_owner_type_uniq").on(
      table.memoryId,
      table.ownerId,
      table.type
    ),
    index("reactions_memory_id_idx").on(table.memoryId),
  ]
);

export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    memoryId: text("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    body: text("body").notNull(),
    status: commentStatusEnum("status").notNull().default("visible"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("comments_memory_id_idx").on(table.memoryId),
    index("comments_owner_id_idx").on(table.ownerId),
  ]
);

export const treeComments = pgTable(
  "tree_comments",
  {
    id: text("id").primaryKey(),
    treeId: text("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    body: text("body").notNull(),
    targetKind: text("target_kind").notNull().default("tree"),
    targetId: text("target_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tree_comments_tree_id_idx").on(table.treeId),
    index("tree_comments_owner_id_idx").on(table.ownerId),
  ]
);

export const treeLikes = pgTable(
  "tree_likes",
  {
    id: text("id").primaryKey(),
    treeId: text("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("tree_likes_tree_owner_uniq").on(table.treeId, table.ownerId),
    index("tree_likes_tree_id_idx").on(table.treeId),
  ]
);

export const treeSocialCounts = pgTable(
  "tree_social_counts",
  {
    treeId: text("tree_id")
      .primaryKey()
      .references(() => trees.id, { onDelete: "cascade" }),
    likeCount: integer("like_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

export const treeViewDedupEvents = pgTable(
  "tree_view_dedup_events",
  {
    id: text("id").primaryKey(),
    treeId: text("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    actorKey: text("actor_key").notNull(),
    actorKind: text("actor_kind").notNull(),
    countedWindowStart: timestamp("counted_window_start", { withTimezone: true }).notNull(),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tree_view_dedup_tree_actor_idx").on(table.treeId, table.actorKind, table.actorKey),
    uniqueIndex("tree_view_dedup_event_uniq").on(
      table.treeId,
      table.actorKind,
      table.actorKey,
      table.countedWindowStart
    ),
  ]
);

export const socialIdempotency = pgTable(
  "social_idempotency",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").notNull(),
    operation: text("operation").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    targetMemoryId: text("target_memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    targetKind: text("target_kind"),
    targetId: text("target_id"),
    resultId: text("result_id"),
    resultState: text("result_state").notNull().default("pending"),
    resultPayload: jsonb("result_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("social_idempotency_actor_op_key_uniq").on(
      table.actorId,
      table.operation,
      table.idempotencyKey
    ),
    index("social_idempotency_target_memory_idx").on(table.targetMemoryId),
  ]
);

export const socialRateLimits = pgTable(
  "social_rate_limits",
  {
    id: text("id").primaryKey(),
    scope: text("scope").notNull(),
    actorId: text("actor_id").notNull(),
    memoryId: text("memory_id").references(() => memories.id, { onDelete: "cascade" }),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    requestCount: integer("request_count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("social_rate_limits_scope_actor_idx").on(table.scope, table.actorId),
  ]
);

export const socialAuditLog = pgTable(
  "social_audit_log",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").notNull(),
    memoryId: text("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    outcomeCode: socialOutcomeEnum("outcome_code").notNull(),
    requestKeyHash: text("request_key_hash"),
    targetKind: text("target_kind"),
    targetId: text("target_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("social_audit_log_memory_id_idx").on(table.memoryId),
    index("social_audit_log_actor_id_idx").on(table.actorId),
  ]
);
