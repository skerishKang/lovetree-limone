import { eq, and, sql, isNull, isNotNull, gt } from "drizzle-orm";
import type { ApiContext } from "./handler";
import { json, errorResponse, matchRoute, parseBody } from "./handler";
import {
  reactions,
  treeLikes,
  treeSocialCounts,
  treeViewDedupEvents,
} from "../../db/schema";
import { requireAuthUser } from "./auth";
import { getReadableTree, getReadableMemory } from "./access";
import { validate, validationError, REACTION_TYPE_VALUES, type ReactionTypeValue } from "./validate";

const VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

const REACTION_RULES = {
  type: { kind: "string", required: true, trim: true, allowed: REACTION_TYPE_VALUES },
} as const;

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
  const user = await requireAuthUser(ctx);

  const memory = await getReadableMemory(ctx, memoryId, user);
  if (!memory) return errorResponse("Not found", 404);

  const rows = await ctx.db
    .select()
    .from(reactions)
    .where(eq(reactions.memoryId, memoryId));

  const counts: Record<string, number> = {};
  const mine: Record<string, boolean> = {};
  for (const row of rows) {
    counts[row.type] = (counts[row.type] || 0) + 1;
    if (user && row.ownerId === user.uid) mine[row.type] = true;
  }

  return json({ counts, mine });
}

async function toggleReaction(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { memoryId } = ctx.params;
  const memory = await getReadableMemory(ctx, memoryId, user);
  if (!memory) return errorResponse("Not found", 404);

  const body = await parseBody(ctx.request);
  const parsed = validate<{ type?: string }>(body, REACTION_RULES);
  if (!parsed.ok) return validationError(parsed.error);
  const type = parsed.value.type as ReactionTypeValue;

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

  await ctx.db.insert(reactions).values(reaction).onConflictDoNothing();
  return json({ toggled: true, type }, 201);
}

async function listTreeLikes(ctx: ApiContext): Promise<Response> {
  const { treeId } = ctx.params;
  const user = await requireAuthUser(ctx);

  const tree = await getReadableTree(ctx, treeId, user);
  if (!tree) return errorResponse("Not found", 404);

  const rows = await ctx.db
    .select()
    .from(treeLikes)
    .where(and(
      eq(treeLikes.treeId, treeId),
      isNull(treeLikes.deletedAt)
    ));

  const count = rows.length;
  const liked = user ? rows.some((r: { ownerId: string }) => r.ownerId === user.uid) : false;

  return json({ count, liked });
}

async function toggleTreeLike(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { treeId } = ctx.params;
  const tree = await getReadableTree(ctx, treeId, user);
  if (!tree) return errorResponse("Not found", 404);

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
    await ctx.db.batch([
      ctx.db.update(treeLikes)
        .set({ deletedAt: now })
        .where(eq(treeLikes.id, existing[0].id)),
      ctx.db.update(treeSocialCounts)
        .set({
          likeCount: sql`greatest(like_count - 1, 0)`,
          updatedAt: now,
        })
        .where(eq(treeSocialCounts.treeId, treeId)),
    ]);
    return json({ liked: false });
  }

  const like = {
    id: crypto.randomUUID(),
    treeId,
    ownerId: user.uid,
    createdAt: now,
    deletedAt: null,
  };

  const inserted = await ctx.db.insert(treeLikes).values(like).onConflictDoNothing();
  if ((inserted as unknown as { rowCount?: number }).rowCount === 0) {
    // A conflicting unique (treeId, ownerId) row may be a prior soft-deleted
    // like or an already-active concurrent like. Claim restoration atomically
    // so only the request that actually changes deletedAt may increment count.
    const restored = await ctx.db
      .update(treeLikes)
      .set({ deletedAt: null })
      .where(and(
        eq(treeLikes.treeId, treeId),
        eq(treeLikes.ownerId, user.uid),
        isNotNull(treeLikes.deletedAt)
      ))
      .returning({ id: treeLikes.id });

    if (restored[0]) {
      await ctx.db.batch([
        ctx.db.insert(treeSocialCounts).values({
          treeId,
          likeCount: 1,
          viewCount: 0,
          updatedAt: now,
        }).onConflictDoNothing(),
        ctx.db.update(treeSocialCounts)
          .set({
            likeCount: sql`like_count + 1`,
            updatedAt: now,
          })
          .where(eq(treeSocialCounts.treeId, treeId)),
      ]);
    }

    return json({ liked: true });
  }

  await ctx.db.batch([
    ctx.db.insert(treeSocialCounts).values({
      treeId,
      likeCount: 1,
      viewCount: 0,
      updatedAt: now,
    }).onConflictDoNothing(),
    ctx.db.update(treeSocialCounts)
      .set({
        likeCount: sql`like_count + 1`,
        updatedAt: now,
      })
      .where(eq(treeSocialCounts.treeId, treeId)),
  ]);

  return json({ liked: true }, 201);
}

/**
 * Records a tree view.
 *
 * Anonymous view mutation is intentionally disabled (501) because a
 * client-supplied anonymous actor key cannot be trusted. For authenticated
 * users the dedup window is computed server-side from the authenticated uid,
 * so retries within the window are counted once.
 */
async function recordTreeView(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("View recording requires an authenticated user", 501);

  const { treeId } = ctx.params;
  const tree = await getReadableTree(ctx, treeId, user);
  if (!tree) return errorResponse("Not found", 404);

  const now = new Date();
  const windowStart = new Date(now.getTime() - VIEW_WINDOW_MS);

  const recent = await ctx.db
    .select({ id: treeViewDedupEvents.id })
    .from(treeViewDedupEvents)
    .where(and(
      eq(treeViewDedupEvents.treeId, treeId),
      eq(treeViewDedupEvents.actorKind, "user"),
      eq(treeViewDedupEvents.actorKey, user.uid),
      gt(treeViewDedupEvents.createdAt, windowStart)
    ));

  if (recent[0]) {
    return json({ recorded: false, deduped: true });
  }

  await ctx.db.batch([
    ctx.db.insert(treeViewDedupEvents).values({
      id: crypto.randomUUID(),
      treeId,
      actorKey: user.uid,
      actorKind: "user",
      countedWindowStart: windowStart,
      source: "authenticated_tree_view",
      createdAt: now,
    }),
    ctx.db.insert(treeSocialCounts).values({
      treeId,
      likeCount: 0,
      viewCount: 1,
      updatedAt: now,
    }).onConflictDoNothing(),
    ctx.db.update(treeSocialCounts)
      .set({
        viewCount: sql`view_count + 1`,
        updatedAt: now,
      })
      .where(eq(treeSocialCounts.treeId, treeId)),
  ]);

  return json({ recorded: true }, 201);
}
