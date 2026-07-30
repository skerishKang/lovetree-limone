import { eq, desc, and } from "drizzle-orm";
import type { ApiContext } from "./handler";
import { json, errorResponse, matchRoute, parseBody } from "./handler";
import { memories } from "../db/schema";
import { requireAuthUser } from "./auth";

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
  if (treeMemories && method === "GET") {
    ctx.params = treeMemories;
    return listTreeMemories(ctx);
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
  const rows = await ctx.db
    .select()
    .from(memories)
    .orderBy(desc(memories.createdAt))
    .limit(limit);

  return json(rows);
}

async function createMemory(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const body = (await parseBody(ctx.request)) as Record<string, unknown> | null;
  if (!body) return errorResponse("Invalid request body", 400);

  const now = new Date();
  const id = crypto.randomUUID();

  const memory = {
    id,
    treeId: String(body.treeId || ""),
    parentId: body.parentId ? String(body.parentId) : null,
    title: String(body.title || ""),
    memo: String(body.memo || ""),
    artist: String(body.artist || ""),
    source: String(body.source || ""),
    sourceUrl: String(body.sourceUrl || ""),
    sourceType: String(body.sourceType || "youtube"),
    thumbnail: String(body.thumbnail || ""),
    emotionTags: body.emotionTags ?? [],
    timestamp: String(body.timestamp || ""),
    visibility: String(body.visibility || "public"),
    channelId: body.channelId ? String(body.channelId) : null,
    channelName: body.channelName ? String(body.channelName) : null,
    channelUrl: body.channelUrl ? String(body.channelUrl) : null,
    createdAt: now,
    updatedAt: now,
  };

  await ctx.db.insert(memories).values(memory);
  return json(memory, 201);
}

async function getMemory(ctx: ApiContext): Promise<Response> {
  const { id } = ctx.params;
  const rows = await ctx.db
    .select()
    .from(memories)
    .where(eq(memories.id, id));
  const row = rows[0];

  if (!row) return errorResponse("Memory not found", 404);
  return json(row);
}

async function updateMemory(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const rows = await ctx.db
    .select()
    .from(memories)
    .where(eq(memories.id, id));

  if (!rows[0]) return errorResponse("Memory not found", 404);

  const body = (await parseBody(ctx.request)) as Record<string, unknown> | null;
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body?.title !== undefined) updates.title = String(body.title);
  if (body?.memo !== undefined) updates.memo = String(body.memo);
  if (body?.artist !== undefined) updates.artist = String(body.artist);
  if (body?.source !== undefined) updates.source = String(body.source);
  if (body?.sourceUrl !== undefined) updates.sourceUrl = String(body.sourceUrl);
  if (body?.sourceType !== undefined) updates.sourceType = String(body.sourceType);
  if (body?.thumbnail !== undefined) updates.thumbnail = String(body.thumbnail);
  if (body?.emotionTags !== undefined) updates.emotionTags = body.emotionTags;
  if (body?.timestamp !== undefined) updates.timestamp = String(body.timestamp);
  if (body?.visibility !== undefined) updates.visibility = String(body.visibility);
  if (body?.channelId !== undefined) updates.channelId = String(body.channelId);
  if (body?.channelName !== undefined) updates.channelName = String(body.channelName);
  if (body?.channelUrl !== undefined) updates.channelUrl = String(body.channelUrl);
  if (body?.treeId !== undefined) updates.treeId = String(body.treeId);
  if (body?.parentId !== undefined) updates.parentId = body.parentId ? String(body.parentId) : null;

  await ctx.db.update(memories).set(updates).where(eq(memories.id, id));
  const updated = await ctx.db.select().from(memories).where(eq(memories.id, id));
  return json(updated[0]);
}

async function deleteMemory(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const rows = await ctx.db
    .select()
    .from(memories)
    .where(eq(memories.id, id));

  if (!rows[0]) return errorResponse("Memory not found", 404);
  await ctx.db.delete(memories).where(eq(memories.id, id));
  return json({ success: true });
}

async function listTreeMemories(ctx: ApiContext): Promise<Response> {
  const { treeId } = ctx.params;
  const limit = Math.min(Math.max(Number(ctx.url.searchParams.get("limit") || 100), 1), 200);

  const rows = await ctx.db
    .select()
    .from(memories)
    .where(eq(memories.treeId, treeId))
    .orderBy(desc(memories.createdAt))
    .limit(limit);

  return json(rows);
}

async function listCommunityMemories(ctx: ApiContext): Promise<Response> {
  const treeId = ctx.url.searchParams.get("treeId");
  const limit = Math.min(Math.max(Number(ctx.url.searchParams.get("limit") || 100), 1), 200);

  const conditions = [eq(memories.visibility, "public")];
  if (treeId) conditions.push(eq(memories.treeId, treeId));

  const rows = await ctx.db
    .select()
    .from(memories)
    .where(and(...conditions))
    .orderBy(desc(memories.createdAt))
    .limit(limit);

  return json(rows);
}
