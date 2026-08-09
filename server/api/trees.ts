import { eq, desc, and, sql } from "drizzle-orm";
import type { ApiContext } from "./handler";
import { json, errorResponse, matchRoute, parseBody } from "./handler";
import { trees, treeSocialCounts, memories } from "../../db/schema";
import { requireAuthUser } from "./auth";
import {
  getOwnedTree,
  getReadableTree,
  isTreeOwner,
  resolveMemoryVisibility,
  VISIBILITY_PUBLIC,
} from "./access";
import {
  validate,
  validationError,
  VISIBILITY_VALUES,
  SOURCE_TYPE_VALUES,
  type VisibilityValue,
  type SourceTypeValue,
} from "./validate";
import {
  CONNECTION_REASON_MAX_LENGTH,
  VIDEO_OFFSET_SECONDS_MAX,
  normalizeMemoryCreateInput,
  serializeMemoryContract,
  validateMemoryDateCompatibility,
} from "./memory-contract";

const TREE_RULES = {
  clientKey: { kind: "string", trim: true, maxLength: 100 },
  title: { kind: "string", required: true, trim: true, minLength: 1, maxLength: 120 },
  memo: { kind: "string", trim: true, maxLength: 2000 },
  artist: { kind: "string", trim: true, maxLength: 120 },
  visibility: { kind: "string", trim: true, allowed: VISIBILITY_VALUES },
  groupName: { kind: "string", trim: true, maxLength: 120 },
  keywords: { kind: "stringArray", maxItems: 20, maxItemLength: 40 },
} as const;

const MEMORY_RULES = {
  title: { kind: "string", trim: true, maxLength: 120 },
  memo: { kind: "string", trim: true, maxLength: 2000 },
  artist: { kind: "string", trim: true, maxLength: 120 },
  source: { kind: "string", trim: true, maxLength: 200 },
  sourceUrl: { kind: "url", maxLength: 2048 },
  sourceType: { kind: "string", trim: true, allowed: SOURCE_TYPE_VALUES },
  thumbnail: { kind: "url", maxLength: 2048 },
  emotionTags: { kind: "stringArray", maxItems: 20, maxItemLength: 40 },
  timestamp: { kind: "string", trim: true, maxLength: 10 },
  discoveryDate: { kind: "string", trim: true, maxLength: 10 },
  videoOffsetSeconds: { kind: "integer", min: 0, max: VIDEO_OFFSET_SECONDS_MAX },
  connectionReason: { kind: "string", trim: true, maxLength: CONNECTION_REASON_MAX_LENGTH },
  visibility: { kind: "string", trim: true, allowed: VISIBILITY_VALUES },
  channelId: { kind: "string", trim: true, maxLength: 200 },
  channelName: { kind: "string", trim: true, maxLength: 200 },
  channelUrl: { kind: "url", maxLength: 2048 },
  parentId: { kind: "string", trim: true, maxLength: 100 },
} as const;

export const BROWSE_MIN_PUBLIC_MOMENTS = 3;

export function isBrowseEligible(
  treeVisibility: string | null,
  publicMomentCount: number
): boolean {
  return (
    treeVisibility === VISIBILITY_PUBLIC &&
    publicMomentCount >= BROWSE_MIN_PUBLIC_MOMENTS
  );
}

function browseEligibilityCondition() {
  return sql`(
    select count(*)
    from ${memories}
    where ${memories.treeId} = ${trees.id}
      and ${memories.visibility} = ${VISIBILITY_PUBLIC}
  ) >= ${BROWSE_MIN_PUBLIC_MOMENTS}`;
}

function sanitizeTree(row: Record<string, unknown>, isOwner: boolean): Record<string, unknown> {
  if (isOwner) return { ...row };
  const { ownerId: _ownerId, ...rest } = row;
  return rest;
}

async function ensureSocialCounts(ctx: ApiContext, treeId: string, now: Date): Promise<void> {
  await ctx.db.insert(treeSocialCounts).values({
    treeId,
    likeCount: 0,
    viewCount: 0,
    updatedAt: now,
  }).onConflictDoNothing();
}

export async function treesRouter(ctx: ApiContext): Promise<Response | null> {
  const { method, path } = ctx;

  if (path === "/api/trees") {
    if (method === "GET") return listTrees(ctx);
    if (method === "POST") return createTree(ctx);
    return errorResponse("Method not allowed", 405);
  }

  const withFirstMemory = matchRoute(path, "/api/trees/with-first-memory");
  if (withFirstMemory && method === "POST") {
    ctx.params = withFirstMemory;
    return createTreeWithFirstMemory(ctx);
  }

  const detail = matchRoute(path, "/api/trees/:id");
  if (detail && path !== "/api/trees/with-first-memory") {
    ctx.params = detail;
    if (method === "GET") return getTree(ctx);
    if (method === "PUT") return updateTree(ctx);
    if (method === "DELETE") return deleteTree(ctx);
    return errorResponse("Method not allowed", 405);
  }

  const fork = matchRoute(path, "/api/trees/:id/fork");
  if (fork && method === "POST") {
    ctx.params = fork;
    return forkTree(ctx);
  }

  const community = matchRoute(path, "/api/community/trees");
  if (community) {
    ctx.params = community;
    if (method === "GET") return listCommunityTrees(ctx);
    return errorResponse("Method not allowed", 405);
  }

  const growing = matchRoute(path, "/api/community/growing-trees");
  if (growing) {
    ctx.params = growing;
    if (method === "GET") return listGrowingTrees(ctx);
    return errorResponse("Method not allowed", 405);
  }

  return null;
}

async function listTrees(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const limit = Math.min(Math.max(Number(ctx.url.searchParams.get("limit") || 100), 1), 200);
  const rows = await ctx.db
    .select()
    .from(trees)
    .where(eq(trees.ownerId, user.uid))
    .orderBy(desc(trees.updatedAt))
    .limit(limit);

  return json(rows);
}

async function createTree(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const body = await parseBody(ctx.request);
  const parsed = validate<Record<string, unknown>>(body, TREE_RULES);
  if (!parsed.ok) return validationError(parsed.error);

  const now = new Date();
  const id = crypto.randomUUID();
  const visibility = (typeof parsed.value.visibility === "string"
    ? parsed.value.visibility
    : "public") as VisibilityValue;

  const clientKey = parsed.value.clientKey as string | undefined;
  if (clientKey) {
    const existing = await ctx.db
      .select()
      .from(trees)
      .where(and(
        eq(trees.ownerId, user.uid),
        eq(trees.clientKey, clientKey)
      ));
    if (existing[0]) return json(existing[0]);
  }

  const tree = {
    id,
    ownerId: user.uid,
    clientKey: clientKey ?? null,
    title: parsed.value.title as string,
    memo: (parsed.value.memo as string | undefined) ?? "",
    artist: (parsed.value.artist as string | undefined) ?? "",
    visibility,
    groupName: (parsed.value.groupName as string | undefined) ?? null,
    keywords: (parsed.value.keywords as string[] | undefined) ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await ctx.db.insert(trees).values(tree);
  await ensureSocialCounts(ctx, id, now);

  return json(tree, 201);
}

async function getTree(ctx: ApiContext): Promise<Response> {
  const { id } = ctx.params;
  const user = await requireAuthUser(ctx);

  const row = await getReadableTree(ctx, id, user);
  if (!row) return errorResponse("Not found", 404);

  return json(sanitizeTree(row as unknown as Record<string, unknown>, isTreeOwner(row, user)));
}

async function updateTree(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const existing = await getOwnedTree(ctx, id, user);
  if (!existing) return errorResponse("Not found", 404);

  const body = await parseBody(ctx.request);
  const parsed = validate<Record<string, unknown>>(body, TREE_RULES);
  if (!parsed.ok) return validationError(parsed.error);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["title", "memo", "artist", "visibility", "groupName", "keywords"] as const) {
    if (parsed.value[key] !== undefined) updates[key] = parsed.value[key];
  }

  await ctx.db.update(trees).set(updates).where(eq(trees.id, id));

  const updated = await ctx.db.select().from(trees).where(eq(trees.id, id));
  return json(sanitizeTree(updated[0] as unknown as Record<string, unknown>, true));
}

async function deleteTree(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const existing = await getOwnedTree(ctx, id, user);
  if (!existing) return errorResponse("Not found", 404);

  await ctx.db.delete(trees).where(eq(trees.id, id));
  return json({ success: true });
}

async function forkTree(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const original = await getReadableTree(ctx, id, user);
  if (!original) return errorResponse("Not found", 404);
  if (original.visibility === "private") return errorResponse("Not found", 404);

  const now = new Date();
  const newId = crypto.randomUUID();
  const forked = {
    id: newId,
    ownerId: user.uid,
    title: original.title ? `${original.title} (fork)` : "",
    memo: original.memo || "",
    artist: original.artist || "",
    visibility: "public" as const,
    groupName: null,
    keywords: original.keywords ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await ctx.db.insert(trees).values(forked);
  await ensureSocialCounts(ctx, newId, now);

  return json(forked, 201);
}

export function buildCommunityTreesQuery(
  db: ApiContext["db"],
  sort: string,
  limit: number,
) {
  const likeCount = sql<number>`coalesce(${treeSocialCounts.likeCount}, 0)`.mapWith(Number);
  const viewCount = sql<number>`coalesce(${treeSocialCounts.viewCount}, 0)`.mapWith(Number);
  const orderBy = sort === "popular" || sort === "likes"
    ? desc(likeCount)
    : sort === "views"
      ? desc(viewCount)
      : desc(trees.createdAt);
  const orderBys = sort === "latest"
    ? [orderBy]
    : [orderBy, desc(trees.createdAt)];

  return db
    .select({
      id: trees.id,
      title: trees.title,
      artist: trees.artist,
      memo: trees.memo,
      groupName: trees.groupName,
      keywords: trees.keywords,
      visibility: trees.visibility,
      createdAt: trees.createdAt,
      likeCount,
      viewCount,
    })
    .from(trees)
    .leftJoin(treeSocialCounts, eq(trees.id, treeSocialCounts.treeId))
    .where(and(
      eq(trees.visibility, VISIBILITY_PUBLIC),
      browseEligibilityCondition()
    ))
    .orderBy(...orderBys)
    .limit(limit);
}

export async function listCommunityTrees(ctx: ApiContext): Promise<Response> {
  const view = ctx.url.searchParams.get("view") || "summary";
  const sort = ctx.url.searchParams.get("sort") || "latest";
  const limit = Math.min(Math.max(Number(ctx.url.searchParams.get("limit") || 12), 1), 60);

  if (view === "summary") {
    const rows = await buildCommunityTreesQuery(ctx.db, sort, limit);
    return json(rows);
  }

  return errorResponse("Unsupported community view", 400);
}

export function buildGrowingTreesQuery(db: ApiContext["db"], limit: number) {
  const likeCount = sql<number>`coalesce(${treeSocialCounts.likeCount}, 0)`.mapWith(Number);

  return db
    .select({
      id: trees.id,
      title: trees.title,
      artist: trees.artist,
      likeCount,
    })
    .from(trees)
    .leftJoin(treeSocialCounts, eq(trees.id, treeSocialCounts.treeId))
    .where(and(
      eq(trees.visibility, VISIBILITY_PUBLIC),
      browseEligibilityCondition()
    ))
    .orderBy(desc(likeCount), desc(trees.createdAt))
    .limit(limit);
}

export async function listGrowingTrees(ctx: ApiContext): Promise<Response> {
  const limit = Math.min(Math.max(Number(ctx.url.searchParams.get("limit") || 6), 3), 12);

  return json(await buildGrowingTreesQuery(ctx.db, limit));
}

export async function deterministicId(...parts: string[]): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts.join("|")));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 32);
}

/**
 * Creates a tree and its first memory in one request.
 *
 * The tree id and first memory id are derived deterministically from the
 * authenticated uid and a client-generated key, and inserts use
 * ON CONFLICT DO NOTHING. A network retry with the same clientKey therefore
 * reuses the same tree/memory instead of creating duplicates. When the Neon
 * batch is supported the two inserts run in a single transactional batch.
 */
async function createTreeWithFirstMemory(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const body = await parseBody(ctx.request);
  const parsed = validate<{
    clientKey?: string;
    title?: string;
    memo?: string;
    artist?: string;
    visibility?: string;
    groupName?: string;
    keywords?: string[];
    memory?: Record<string, unknown>;
  }>(body, {
    ...TREE_RULES,
    clientKey: { kind: "string", required: true, trim: true, minLength: 1, maxLength: 100 },
    memory: { kind: "object", required: true, rules: MEMORY_RULES },
  });
  if (!parsed.ok) return validationError(parsed.error);

  const memory = parsed.value.memory as Record<string, unknown>;
  const memTitle = typeof memory.title === "string" ? memory.title.trim() : "";
  const memMemo = typeof memory.memo === "string" ? memory.memo.trim() : "";
  if (memTitle.length === 0 && memMemo.length === 0) {
    return validationError("memory.title or memory.memo is required");
  }

  const dateError = validateMemoryDateCompatibility(memory, "memory.");
  if (dateError) return validationError(dateError);
  const normalizedMemory = normalizeMemoryCreateInput(memory);

  const now = new Date();
  const treeId = await deterministicId(user.uid, "tree", parsed.value.clientKey as string);
  const memoryId = await deterministicId(user.uid, "tree", treeId, parsed.value.clientKey as string);

  const tree = {
    id: treeId,
    ownerId: user.uid,
    title: parsed.value.title as string,
    memo: (parsed.value.memo as string | undefined) ?? "",
    artist: (parsed.value.artist as string | undefined) ?? "",
    visibility: (typeof parsed.value.visibility === "string"
      ? parsed.value.visibility
      : "public") as VisibilityValue,
    groupName: (parsed.value.groupName as string | undefined) ?? null,
    keywords: (parsed.value.keywords as string[] | undefined) ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const memoryRow = {
    id: memoryId,
    treeId,
    parentId: (normalizedMemory.parentId as string | undefined) ?? null,
    connectionReason: (normalizedMemory.connectionReason as string | null | undefined) ?? null,
    title: memTitle,
    memo: memMemo,
    artist: (normalizedMemory.artist as string | undefined) ?? "",
    source: (normalizedMemory.source as string | undefined) ?? "",
    sourceUrl: (normalizedMemory.sourceUrl as string | undefined) ?? "",
    sourceType: ((normalizedMemory.sourceType as string | undefined) ?? "youtube") as SourceTypeValue,
    thumbnail: (normalizedMemory.thumbnail as string | undefined) ?? "",
    emotionTags: (normalizedMemory.emotionTags as string[] | undefined) ?? [],
    timestamp: (normalizedMemory.timestamp as string | undefined) ?? "",
    discoveryDate: (normalizedMemory.discoveryDate as string | null | undefined) ?? null,
    videoOffsetSeconds: (normalizedMemory.videoOffsetSeconds as number | null | undefined) ?? null,
    sortOrder: 0,
    visibility: resolveMemoryVisibility(
      normalizedMemory.visibility as string | undefined,
      tree.visibility
    ),
    channelId: (normalizedMemory.channelId as string | undefined) ?? null,
    channelName: (normalizedMemory.channelName as string | undefined) ?? null,
    channelUrl: (normalizedMemory.channelUrl as string | undefined) ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await ctx.db.insert(trees).values(tree).onConflictDoNothing();
  await ensureSocialCounts(ctx, treeId, now);
  await ctx.db.insert(memories).values(memoryRow).onConflictDoNothing();

  return json({ tree, memory: serializeMemoryContract(memoryRow) }, 201);
}

export { TREE_RULES, MEMORY_RULES };
