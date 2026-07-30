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
    .limit(limit)
    .all();

  return json(rows);
}

async function createMemory(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const body = (await parseBody(ctx.request)) as Record<string, unknown> | null;
  if (!body) return errorResponse("Invalid request body", 400);

  const now = new Date().toISOString();
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
    emotionTags: body.emotionTags ? JSON.stringify(body.emotionTags) : "[]",
    timestamp: String(body.timestamp || ""),
    visibility: String(body.visibility || "public"),
    channelId: body.channelId ? String(body.channelId) : null,
    channelName: body.channelName ? String(body.channelName) : null,
    channelUrl: body.channelUrl ? String(body.channelUrl) : null,
    createdAt: now,
    updatedAt: now,
  };

  await ctx.db.insert(memories).values(memory).run();
  return json(memory, 201);
}

async function getMemory(ctx: ApiContext): Promise<Response> {
  const { id } = ctx.params;
  const row = await ctx.db
    .select()
    .from(memories)
    .where(eq(memories.id, id))
    .get();

  if (!row) return errorResponse("Memory not found", 404);
  return json(row);
}

async function updateMemory(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const existing = await ctx.db
    .select()
    .from(memories)
    .where(eq(memories.id, id))
    .get();

  if (!existing) return errorResponse("Memory not found", 404);

  const body = (await parseBody(ctx.request)) as Record<string, unknown> | null;
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  const fields = [
    "treeId", "parentId", "title", "memo", "artist", "source",
    "sourceUrl", "sourceType", "thumbnail", "timestamp", "visibility",
    "channelId", "channelName", "channelUrl",
  ];

  for (const field of fields) {
    if (body?.[field] !== undefined) {
      updates[field] = field === "emotionTags"
        ? JSON.stringify(body[field])
        : String(body[field]);
    }
  }
  if (body?.emotionTags !== undefined) {
    updates.emotionTags = JSON.stringify(body.emotionTags);
  }

  await ctx.db.update(memories).set(updates).where(eq(memories.id, id)).run();
  const updated = await ctx.db.select().from(memories).where(eq(memories.id, id)).get();
  return json(updated);
}

async function deleteMemory(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const existing = await ctx.db
    .select()
    .from(memories)
    .where(eq(memories.id, id))
    .get();

  if (!existing) return errorResponse("Memory not found", 404);

  await ctx.db.delete(memories).where(eq(memories.id, id)).run();
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
    .limit(limit)
    .all();

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
    .limit(limit)
    .all();

  return json(rows);
}
