import { eq, desc, and, inArray } from "drizzle-orm";
import type { ApiContext } from "./handler";
import { json, errorResponse, matchRoute, parseBody } from "./handler";
import { memories, trees } from "../../db/schema";
import { requireAuthUser } from "./auth";
import {
  getOwnedTree,
  getReadableTree,
  getOwnedMemory,
  getReadableMemory,
  isParentInSameTree,
  VISIBILITY_PUBLIC,
  type MemoryRow,
} from "./access";
import {
  validate,
  validationError,
  VISIBILITY_VALUES,
  SOURCE_TYPE_VALUES,
  type VisibilityValue,
  type SourceTypeValue,
} from "./validate";

const MEMORY_CONTENT_RULES = {
  clientKey: { kind: "string", trim: true, maxLength: 100 },
  title: { kind: "string", trim: true, maxLength: 120 },
  memo: { kind: "string", trim: true, maxLength: 2000 },
  artist: { kind: "string", trim: true, maxLength: 120 },
  source: { kind: "string", trim: true, maxLength: 200 },
  sourceUrl: { kind: "url", maxLength: 2048 },
  sourceType: { kind: "string", trim: true, allowed: SOURCE_TYPE_VALUES },
  thumbnail: { kind: "url", maxLength: 2048 },
  emotionTags: { kind: "stringArray", maxItems: 20, maxItemLength: 40 },
  timestamp: { kind: "string", trim: true, maxLength: 100 },
  visibility: { kind: "string", trim: true, allowed: VISIBILITY_VALUES },
  channelId: { kind: "string", trim: true, maxLength: 200 },
  channelName: { kind: "string", trim: true, maxLength: 200 },
  channelUrl: { kind: "url", maxLength: 2048 },
  parentId: { kind: "string", trim: true, maxLength: 100 },
} as const;

const MEMORY_CREATE_RULES = {
  ...MEMORY_CONTENT_RULES,
  treeId: { kind: "string", required: true, trim: true, minLength: 1, maxLength: 100 },
} as const;

const MEMORY_NESTED_CREATE_RULES = {
  ...MEMORY_CONTENT_RULES,
} as const;

const MEMORY_UPDATE_RULES = {
  ...MEMORY_CONTENT_RULES,
  treeId: { kind: "string", trim: true, minLength: 1, maxLength: 100 },
} as const;

function buildMemoryRow(
  now: Date,
  values: {
    id: string;
    treeId: string;
    body: Record<string, unknown>;
  }
): MemoryRow {
  const { id, treeId, body } = values;
  return {
    id,
    treeId,
    clientKey: (body.clientKey as string | undefined) ?? null,
    parentId: (body.parentId as string | undefined) ?? null,
    title: (body.title as string | undefined) ?? "",
    memo: (body.memo as string | undefined) ?? "",
    artist: (body.artist as string | undefined) ?? "",
    source: (body.source as string | undefined) ?? "",
    sourceUrl: (body.sourceUrl as string | undefined) ?? "",
    sourceType: ((body.sourceType as string | undefined) ?? "youtube") as SourceTypeValue,
    thumbnail: (body.thumbnail as string | undefined) ?? "",
    emotionTags: (body.emotionTags as string[] | undefined) ?? [],
    timestamp: (body.timestamp as string | undefined) ?? "",
    visibility: ((body.visibility as string | undefined) ?? "public") as VisibilityValue,
    channelId: (body.channelId as string | undefined) ?? null,
    channelName: (body.channelName as string | undefined) ?? null,
    channelUrl: (body.channelUrl as string | undefined) ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function memoriesRouter(ctx: ApiContext): Promise<Response | null> {
  const { method, path } = ctx;

  if (path === "/api/memories") {
    if (method === "GET") return listMemories(ctx);
    if (method === "POST") return createMemory(ctx);
    return errorResponse("Method not allowed", 405);
  }

  const detail = matchRoute(path, "/api/memories/:id");
  if (detail) {
    ctx.params = detail;
    if (method === "GET") return getMemory(ctx);
    if (method === "PUT") return updateMemory(ctx);
    if (method === "DELETE") return deleteMemory(ctx);
    return errorResponse("Method not allowed", 405);
  }

  const treeMemories = matchRoute(path, "/api/trees/:treeId/memories");
  if (treeMemories) {
    ctx.params = treeMemories;
    if (method === "GET") return listTreeMemories(ctx);
    if (method === "POST") return createTreeMemory(ctx);
    return errorResponse("Method not allowed", 405);
  }

  const communityMemories = matchRoute(path, "/api/community/memories");
  if (communityMemories && method === "GET") {
    ctx.params = communityMemories;
    return listCommunityMemories(ctx);
  }

  return null;
}

async function listMemories(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const limit = Math.min(Math.max(Number(ctx.url.searchParams.get("limit") || 100), 1), 200);
  const myTreeIds = await ctx.db
    .select({ id: trees.id })
    .from(trees)
    .where(eq(trees.ownerId, user.uid));

  if (myTreeIds.length === 0) return json([]);

  const rows = await ctx.db
    .select()
    .from(memories)
    .where(inArray(memories.treeId, myTreeIds.map((t) => t.id)))
    .orderBy(desc(memories.createdAt))
    .limit(limit);

  return json(rows);
}

async function createMemory(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const body = await parseBody(ctx.request);
  const parsed = validate<Record<string, unknown>>(body, MEMORY_CREATE_RULES);
  if (!parsed.ok) return validationError(parsed.error);

  const treeId = parsed.value.treeId as string;
  const ownedTree = await getOwnedTree(ctx, treeId, user);
  if (!ownedTree) return errorResponse("Not found", 404);

  if (!(await isParentInSameTree(ctx, treeId, (parsed.value.parentId as string | null) ?? null))) {
    return validationError("parentId must reference a memory in the same tree");
  }

  const now = new Date();
  const memory = buildMemoryRow(now, {
    id: crypto.randomUUID(),
    treeId,
    body: parsed.value,
  });

  const clientKey = parsed.value.clientKey as string | undefined;
  if (clientKey) {
    const existing = await ctx.db
      .select()
      .from(memories)
      .where(and(
        eq(memories.treeId, treeId),
        eq(memories.clientKey, clientKey)
      ));
    if (existing[0]) return json(existing[0]);
  }

  await ctx.db.insert(memories).values(memory);
  return json(memory, 201);
}

async function getMemory(ctx: ApiContext): Promise<Response> {
  const { id } = ctx.params;
  const user = await requireAuthUser(ctx);

  const row = await getReadableMemory(ctx, id, user);
  if (!row) return errorResponse("Not found", 404);
  return json(row);
}

async function updateMemory(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const existing = await getOwnedMemory(ctx, id, user);
  if (!existing) return errorResponse("Not found", 404);

  const body = await parseBody(ctx.request);
  const parsed = validate<Record<string, unknown>>(body, MEMORY_UPDATE_RULES);
  if (!parsed.ok) return validationError(parsed.error);

  let targetTreeId = existing.treeId;
  if (parsed.value.treeId !== undefined) {
    const sourceOwned = await getOwnedTree(ctx, existing.treeId, user);
    const targetOwned = await getOwnedTree(ctx, parsed.value.treeId as string, user);
    if (!sourceOwned || !targetOwned) return errorResponse("Not found", 404);
    targetTreeId = parsed.value.treeId as string;
  }

  const parentId =
    parsed.value.parentId !== undefined
      ? (parsed.value.parentId as string | null)
      : existing.parentId;
  if (!(await isParentInSameTree(ctx, targetTreeId, parentId))) {
    return validationError("parentId must reference a memory in the same tree");
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of [
    "treeId",
    "parentId",
    "title",
    "memo",
    "artist",
    "source",
    "sourceUrl",
    "sourceType",
    "thumbnail",
    "emotionTags",
    "timestamp",
    "visibility",
    "channelId",
    "channelName",
    "channelUrl",
  ] as const) {
    if (parsed.value[key] !== undefined) updates[key] = parsed.value[key];
  }

  await ctx.db.update(memories).set(updates).where(eq(memories.id, id));
  const updated = await ctx.db.select().from(memories).where(eq(memories.id, id));
  return json(updated[0]);
}

async function deleteMemory(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const existing = await getOwnedMemory(ctx, id, user);
  if (!existing) return errorResponse("Not found", 404);

  await ctx.db.delete(memories).where(eq(memories.id, id));
  return json({ success: true });
}

async function listTreeMemories(ctx: ApiContext): Promise<Response> {
  const { treeId } = ctx.params;
  const user = await requireAuthUser(ctx);

  const tree = await getReadableTree(ctx, treeId, user);
  if (!tree) return errorResponse("Not found", 404);

  const limit = Math.min(Math.max(Number(ctx.url.searchParams.get("limit") || 100), 1), 200);
  const rows = await ctx.db
    .select()
    .from(memories)
    .where(eq(memories.treeId, treeId))
    .orderBy(desc(memories.createdAt))
    .limit(limit);

  return json(rows);
}

async function createTreeMemory(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { treeId } = ctx.params;
  const ownedTree = await getOwnedTree(ctx, treeId, user);
  if (!ownedTree) return errorResponse("Not found", 404);

  const body = await parseBody(ctx.request);
  const parsed = validate<Record<string, unknown>>(body, MEMORY_NESTED_CREATE_RULES);
  if (!parsed.ok) return validationError(parsed.error);

  const parentId = (parsed.value.parentId as string | null) ?? null;
  if (!(await isParentInSameTree(ctx, treeId, parentId))) {
    return validationError("parentId must reference a memory in the same tree");
  }

  const now = new Date();
  const memory = buildMemoryRow(now, {
    id: crypto.randomUUID(),
    treeId,
    body: parsed.value,
  });

  const clientKey = parsed.value.clientKey as string | undefined;
  if (clientKey) {
    const existing = await ctx.db
      .select()
      .from(memories)
      .where(and(
        eq(memories.treeId, treeId),
        eq(memories.clientKey, clientKey)
      ));
    if (existing[0]) return json(existing[0]);
  }

  await ctx.db.insert(memories).values(memory);
  return json(memory, 201);
}

async function listCommunityMemories(ctx: ApiContext): Promise<Response> {
  const treeId = ctx.url.searchParams.get("treeId");
  const limit = Math.min(Math.max(Number(ctx.url.searchParams.get("limit") || 100), 1), 200);

  const conditions = [eq(memories.visibility, VISIBILITY_PUBLIC)];
  if (treeId) conditions.push(eq(memories.treeId, treeId));

  const rows = await ctx.db
    .select()
    .from(memories)
    .where(and(...conditions))
    .orderBy(desc(memories.createdAt))
    .limit(limit);

  return json(rows);
}
