import { eq, and, sql, isNull } from "drizzle-orm";
import type { ApiContext } from "./handler";
import { json, errorResponse, matchRoute, parseBody } from "./handler";
import {
  reactions,
  treeLikes,
  treeSocialCounts,
  treeViewDedupEvents,
} from "../db/schema";
import { requireAuthUser } from "./auth";

export async function socialRouter(ctx: ApiContext): Promise<Response | null> {
  const { method, path } = ctx;

  const memoryReactions = matchRoute(path, "/api/memories/:memoryId/reactions");
  if (memoryReactions) {
    ctx.params = memoryReactions;
    if (method === "GET") return listMemoryReactions(ctx);
    if (method === "POST") return toggleReaction(ctx);
    return errorResponse("Method not allowed", 405);
  }

  const treeLikesRoute = matchRoute(path, "/api/trees/:treeId/likes");
  if (treeLikesRoute) {
    ctx.params = treeLikesRoute;
    if (method === "GET") return listTreeLikes(ctx);
    if (method === "POST") return toggleTreeLike(ctx);
    return errorResponse("Method not allowed", 405);
  }

  const treeViews = matchRoute(path, "/api/trees/:treeId/views");
  if (treeViews) {
    ctx.params = treeViews;
    if (method === "POST") return recordTreeView(ctx);
    return errorResponse("Method not allowed", 405);
  }

  return null;
}

async function listMemoryReactions(ctx: ApiContext): Promise<Response> {
  const { memoryId } = ctx.params;
  const rows = await ctx.db
    .select()
    .from(reactions)
    .where(eq(reactions.memoryId, memoryId));

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.type] = (counts[row.type] || 0) + 1;
  }

  return json({ reactions: rows, counts });
}

async function toggleReaction(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { memoryId } = ctx.params;
  const body = (await parseBody(ctx.request)) as Record<string, unknown> | null;
  const type = String(body?.type || "like");

  const existing = await ctx.db
    .select()
    .from(reactions)
    .where(and(
      eq(reactions.memoryId, memoryId),
      eq(reactions.ownerId, user.uid),
      eq(reactions.type, type)
    ));

  if (existing[0]) {
    await ctx.db.delete(reactions).where(eq(reactions.id, existing[0].id));
    return json({ toggled: false, type });
  }

  const reaction = {
    id: crypto.randomUUID(),
    memoryId,
    ownerId: user.uid,
    type,
    createdAt: new Date(),
  };

  await ctx.db.insert(reactions).values(reaction);
  return json({ toggled: true, type }, 201);
}

async function listTreeLikes(ctx: ApiContext): Promise<Response> {
  const { treeId } = ctx.params;
  const user = await requireAuthUser(ctx);

  const rows = await ctx.db
    .select()
    .from(treeLikes)
    .where(and(
      eq(treeLikes.treeId, treeId),
      isNull(treeLikes.deletedAt)
    ));

  const count = rows.length;
  const userLiked = user ? rows.some((r: { ownerId: string }) => r.ownerId === user.uid) : false;

  return json({ count, liked: userLiked });
}

async function toggleTreeLike(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { treeId } = ctx.params;
  const existing = await ctx.db
    .select()
    .from(treeLikes)
    .where(and(
      eq(treeLikes.treeId, treeId),
      eq(treeLikes.ownerId, user.uid),
      isNull(treeLikes.deletedAt)
    ));

  const now = new Date();

  if (existing[0]) {
    await ctx.db.update(treeLikes)
      .set({ deletedAt: now })
      .where(eq(treeLikes.id, existing[0].id));

    await ctx.db.update(treeSocialCounts)
      .set({
        likeCount: sql`like_count - 1`,
        updatedAt: now,
      })
      .where(eq(treeSocialCounts.treeId, treeId));

    return json({ liked: false });
  }

  const like = {
    id: crypto.randomUUID(),
    treeId,
    ownerId: user.uid,
    createdAt: now,
    deletedAt: null,
  };

  await ctx.db.insert(treeLikes).values(like);

  const existingCount = await ctx.db
    .select()
    .from(treeSocialCounts)
    .where(eq(treeSocialCounts.treeId, treeId));

  if (existingCount[0]) {
    await ctx.db.update(treeSocialCounts)
      .set({
        likeCount: sql`like_count + 1`,
        updatedAt: now,
      })
      .where(eq(treeSocialCounts.treeId, treeId));
  } else {
    await ctx.db.insert(treeSocialCounts).values({
      treeId,
      likeCount: 1,
      viewCount: 0,
      updatedAt: now,
    });
  }

  return json({ liked: true }, 201);
}

async function recordTreeView(ctx: ApiContext): Promise<Response> {
  const { treeId } = ctx.params;
  const body = (await parseBody(ctx.request)) as Record<string, unknown> | null;
  const now = new Date();

  const view = {
    id: crypto.randomUUID(),
    treeId,
    actorKey: String(body?.actorKey || "anonymous"),
    actorKind: String(body?.actorKind || "anonymous"),
    countedWindowStart: now,
    source: String(body?.source || "public_tree_detail"),
    createdAt: now,
  };

  await ctx.db.insert(treeViewDedupEvents).values(view);

  const existingCount = await ctx.db
    .select()
    .from(treeSocialCounts)
    .where(eq(treeSocialCounts.treeId, treeId));

  if (existingCount[0]) {
    await ctx.db.update(treeSocialCounts)
      .set({
        viewCount: sql`view_count + 1`,
        updatedAt: now,
      })
      .where(eq(treeSocialCounts.treeId, treeId));
  } else {
    await ctx.db.insert(treeSocialCounts).values({
      treeId,
      likeCount: 0,
      viewCount: 1,
      updatedAt: now,
    });
  }

  return json({ recorded: true }, 201);
}
