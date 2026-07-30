import { eq, desc } from "drizzle-orm";
import type { ApiContext } from "./handler";
import { json, errorResponse, matchRoute, parseBody } from "./handler";
import { trees, treeSocialCounts } from "../db/schema";
import { requireAuthUser } from "./auth";

export async function treesRouter(ctx: ApiContext): Promise<Response | null> {
  const { method, path } = ctx;

  if (path === "/api/trees") {
    if (method === "GET") return listTrees(ctx);
    if (method === "POST") return createTree(ctx);
    return errorResponse("Method not allowed", 405);
  }

  const detail = matchRoute(path, "/api/trees/:id");
  if (detail) {
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

  const body = (await parseBody(ctx.request)) as Record<string, unknown> | null;
  const now = new Date();
  const id = crypto.randomUUID();

  const tree = {
    id,
    ownerId: user.uid,
    title: String(body?.title || ""),
    memo: String(body?.memo || ""),
    artist: String(body?.artist || ""),
    visibility: String(body?.visibility || "public"),
    groupName: body?.groupName ? String(body.groupName) : null,
    keywords: body?.keywords ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await ctx.db.insert(trees).values(tree);
  await ctx.db.insert(treeSocialCounts).values({
    treeId: id,
    likeCount: 0,
    viewCount: 0,
    updatedAt: now,
  });

  return json(tree, 201);
}

async function getTree(ctx: ApiContext): Promise<Response> {
  const { id } = ctx.params;
  const user = await requireAuthUser(ctx);

  const rows = await ctx.db
    .select()
    .from(trees)
    .where(eq(trees.id, id));

  const row = rows[0];
  if (!row) return errorResponse("Tree not found", 404);

  if (row.visibility !== "public" && (!user || row.ownerId !== user.uid)) {
    return errorResponse("Not found", 404);
  }

  return json(row);
}

async function updateTree(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const existing = await ctx.db
    .select()
    .from(trees)
    .where(eq(trees.id, id));

  if (!existing[0]) return errorResponse("Tree not found", 404);
  if (existing[0].ownerId !== user.uid) return errorResponse("Forbidden", 403);

  const body = (await parseBody(ctx.request)) as Record<string, unknown> | null;
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body?.title !== undefined) updates.title = String(body.title);
  if (body?.memo !== undefined) updates.memo = String(body.memo);
  if (body?.artist !== undefined) updates.artist = String(body.artist);
  if (body?.visibility !== undefined) updates.visibility = String(body.visibility);
  if (body?.groupName !== undefined) updates.groupName = String(body.groupName);
  if (body?.keywords !== undefined) updates.keywords = body.keywords;

  await ctx.db.update(trees).set(updates).where(eq(trees.id, id));

  const updated = await ctx.db.select().from(trees).where(eq(trees.id, id));
  return json(updated[0]);
}

async function deleteTree(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const existing = await ctx.db
    .select()
    .from(trees)
    .where(eq(trees.id, id));

  if (!existing[0]) return errorResponse("Tree not found", 404);
  if (existing[0].ownerId !== user.uid) return errorResponse("Forbidden", 403);

  await ctx.db.delete(trees).where(eq(trees.id, id));
  return json({ success: true });
}

async function forkTree(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const { id } = ctx.params;
  const original = await ctx.db
    .select()
    .from(trees)
    .where(eq(trees.id, id));

  if (!original[0]) return errorResponse("Tree not found", 404);

  const now = new Date();
  const newId = crypto.randomUUID();
  const o = original[0];
  const forked = {
    id: newId,
    ownerId: user.uid,
    title: o.title ? `${o.title} (fork)` : "",
    memo: o.memo || "",
    artist: o.artist || "",
    visibility: "public",
    groupName: null,
    keywords: o.keywords ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await ctx.db.insert(trees).values(forked);
  await ctx.db.insert(treeSocialCounts).values({
    treeId: newId,
    likeCount: 0,
    viewCount: 0,
    updatedAt: now,
  });

  return json(forked, 201);
}

async function listCommunityTrees(ctx: ApiContext): Promise<Response> {
  const view = ctx.url.searchParams.get("view") || "summary";
  const sort = ctx.url.searchParams.get("sort") || "latest";
  const limit = Math.min(Math.max(Number(ctx.url.searchParams.get("limit") || 12), 1), 60);

  if (view === "summary") {
    const orderByCol = sort === "popular" ? treeSocialCounts.likeCount
      : sort === "likes" ? treeSocialCounts.likeCount
      : sort === "views" ? treeSocialCounts.viewCount
      : trees.createdAt;

    const rows = await ctx.db
      .select()
      .from(trees)
      .leftJoin(treeSocialCounts, eq(trees.id, treeSocialCounts.treeId))
      .where(eq(trees.visibility, "public"))
      .orderBy(desc(orderByCol))
      .limit(limit);

    return json(rows.map((r: Record<string, unknown>) => {
      const t = r.trees as Record<string, unknown>;
      const s = r.tree_social_counts as Record<string, unknown> | null;
      return {
        id: t.id,
        title: t.title,
        artist: t.artist,
        memo: t.memo,
        groupName: t.group_name,
        keywords: t.keywords,
        createdAt: t.created_at,
        likeCount: (s?.like_count as number) ?? 0,
        viewCount: (s?.view_count as number) ?? 0,
      };
    }));
  }

  return json([]);
}

async function listGrowingTrees(ctx: ApiContext): Promise<Response> {
  const limit = Math.min(Math.max(Number(ctx.url.searchParams.get("limit") || 6), 3), 12);

  const rows = await ctx.db
    .select()
    .from(trees)
    .leftJoin(treeSocialCounts, eq(trees.id, treeSocialCounts.treeId))
    .where(eq(trees.visibility, "public"))
    .orderBy(desc(treeSocialCounts.likeCount))
    .limit(limit);

  return json(rows.map((r: Record<string, unknown>) => {
    const t = r.trees as Record<string, unknown>;
    const s = r.tree_social_counts as Record<string, unknown> | null;
    return {
      id: t.id,
      title: t.title,
      artist: t.artist,
      likeCount: (s?.like_count as number) ?? 0,
    };
  }));
}
