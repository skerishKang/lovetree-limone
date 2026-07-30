import { eq, desc, and } from "drizzle-orm";
import type { ApiContext } from "./handler";
import { json, errorResponse, matchRoute, parseBody } from "./handler";
import { comments, treeComments } from "../db/schema";
import { requireAuthUser } from "./auth";

export async function commentsRouter(ctx: ApiContext): Promise<Response | null> {
  const { method, path } = ctx;

  const memoryComments = matchRoute(path, "/api/memories/:memoryId/comments");
  if (memoryComments) {
    ctx.params = memoryComments;
    if (method === "GET") return listMemoryComments(ctx);
    if (method === "POST") return createMemoryComment(ctx);
    return errorResponse("Method not allowed", 405);
  }

  const memoryCommentsDetail = matchRoute(path, "/api/memories/:memoryId/comments/:id");
  if (memoryCommentsDetail) {
    ctx.params = memoryCommentsDetail;
    if (method === "DELETE") return deleteMemoryComment(ctx);
    return errorResponse("Method not allowed", 405);
  }

  const treeCommentsList = matchRoute(path, "/api/trees/:treeId/comments");
  if (treeCommentsList) {
    ctx.params = treeCommentsList;
    if (method === "GET") return listTreeComments(ctx);
    if (method === "POST") return createTreeComment(ctx);
    return errorResponse("Method not allowed", 405);
  }

  const treeCommentsDetail = matchRoute(path, "/api/trees/:treeId/comments/:id");
  if (treeCommentsDetail) {
    ctx.params = treeCommentsDetail;
    if (method === "DELETE") return deleteTreeComment(ctx);
    return errorResponse("Method not allowed", 405);
  }

  return null;
}

async function listMemoryComments(ctx: ApiContext): Promise<Response> {
  const { memoryId } = ctx.params;
  const rows = await ctx.db
    .select()
    .from(comments)
    .where(and(
      eq(comments.memoryId, memoryId),
      eq(comments.status, "visible")
    ))
    .orderBy(desc(comments.createdAt));

  return json(rows);
}

async function createMemoryComment(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { memoryId } = ctx.params;
  const body = (await parseBody(ctx.request)) as Record<string, unknown> | null;
  if (!body?.body) return errorResponse("Comment body is required", 400);

  const now = new Date();
  const comment = {
    id: crypto.randomUUID(),
    memoryId,
    ownerId: user.uid,
    body: String(body.body),
    status: "visible",
    deletedAt: null,
    deletedBy: null,
    createdAt: now,
    updatedAt: now,
  };

  await ctx.db.insert(comments).values(comment);
  return json(comment, 201);
}

async function deleteMemoryComment(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const rows = await ctx.db.select().from(comments).where(eq(comments.id, id));
  if (!rows[0]) return errorResponse("Comment not found", 404);
  if (rows[0].ownerId !== user.uid) return errorResponse("Forbidden", 403);

  const now = new Date();
  await ctx.db.update(comments)
    .set({ status: "deleted", deletedAt: now, deletedBy: user.uid, updatedAt: now })
    .where(eq(comments.id, id));

  return json({ success: true });
}

async function listTreeComments(ctx: ApiContext): Promise<Response> {
  const { treeId } = ctx.params;
  const rows = await ctx.db
    .select()
    .from(treeComments)
    .where(eq(treeComments.treeId, treeId))
    .orderBy(desc(treeComments.createdAt));

  return json(rows);
}

async function createTreeComment(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { treeId } = ctx.params;
  const body = (await parseBody(ctx.request)) as Record<string, unknown> | null;
  if (!body?.body) return errorResponse("Comment body is required", 400);

  const now = new Date();
  const comment = {
    id: crypto.randomUUID(),
    treeId,
    ownerId: user.uid,
    body: String(body.body),
    targetKind: "tree",
    targetId: treeId,
    createdAt: now,
    updatedAt: now,
  };

  await ctx.db.insert(treeComments).values(comment);
  return json(comment, 201);
}

async function deleteTreeComment(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const rows = await ctx.db.select().from(treeComments).where(eq(treeComments.id, id));
  if (!rows[0]) return errorResponse("Comment not found", 404);
  if (rows[0].ownerId !== user.uid) return errorResponse("Forbidden", 403);

  await ctx.db.delete(treeComments).where(eq(treeComments.id, id));
  return json({ success: true });
}
