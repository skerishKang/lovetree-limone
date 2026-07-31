import { eq } from "drizzle-orm";
import { trees, memories } from "../../db/schema";
import type { AuthUser } from "./auth";
import type { ApiContext } from "./handler";

export type TreeRow = typeof trees.$inferSelect;
export type MemoryRow = typeof memories.$inferSelect;

export const VISIBILITY_PRIVATE = "private";
export const VISIBILITY_UNLISTED = "unlisted";
export const VISIBILITY_PUBLIC = "public";

/**
 * Read access policy:
 * - public: anyone
 * - unlisted: anyone with the direct link (never shown in community listings)
 * - private: only the owner
 */
export function isTreeReadable(
  visibility: string | null,
  ownerId: string | null,
  user: AuthUser | null
): boolean {
  if (visibility === VISIBILITY_PUBLIC || visibility === VISIBILITY_UNLISTED) return true;
  if (visibility === VISIBILITY_PRIVATE) {
    return user !== null && ownerId !== null && ownerId === user.uid;
  }
  return false;
}

export function isTreeOwner(tree: TreeRow | null | undefined, user: AuthUser | null): boolean {
  return tree !== null && tree !== undefined && user !== null && tree.ownerId === user.uid;
}

/**
 * Fetches a tree and returns it only when the current user may read it.
 * Returns null when the tree does not exist or the user has no read access,
 * so callers can respond with a uniform 404.
 */
export async function getReadableTree(
  ctx: ApiContext,
  treeId: string,
  user: AuthUser | null
): Promise<TreeRow | null> {
  if (!treeId) return null;
  const rows = await ctx.db.select().from(trees).where(eq(trees.id, treeId));
  const row = rows[0];
  if (!row) return null;
  if (!isTreeReadable(row.visibility, row.ownerId, user)) return null;
  return row;
}

/**
 * Fetches a tree and returns it only when the current user owns it.
 * Returns null when the tree does not exist or the user is not the owner.
 */
export async function getOwnedTree(
  ctx: ApiContext,
  treeId: string,
  user: AuthUser | null
): Promise<TreeRow | null> {
  if (!treeId) return null;
  const rows = await ctx.db.select().from(trees).where(eq(trees.id, treeId));
  const row = rows[0];
  if (!row) return null;
  if (!isTreeOwner(row, user)) return null;
  return row;
}

/**
 * Fetches a memory and returns it only when the current user owns the tree
 * the memory belongs to. Returns null when the memory or its tree does not
 * exist, or when the user is not the tree owner.
 */
export async function getOwnedMemory(
  ctx: ApiContext,
  memoryId: string,
  user: AuthUser | null
): Promise<MemoryRow | null> {
  if (!memoryId) return null;
  const rows = await ctx.db.select().from(memories).where(eq(memories.id, memoryId));
  const row = rows[0];
  if (!row) return null;
  const ownedTree = await getOwnedTree(ctx, row.treeId, user);
  if (!ownedTree) return null;
  return row;
}

/**
 * Fetches a memory and returns it only when the current user may read the
 * tree it belongs to. Returns null when the memory does not exist or the
 * tree is not readable.
 */
export async function getReadableMemory(
  ctx: ApiContext,
  memoryId: string,
  user: AuthUser | null
): Promise<MemoryRow | null> {
  if (!memoryId) return null;
  const rows = await ctx.db.select().from(memories).where(eq(memories.id, memoryId));
  const row = rows[0];
  if (!row) return null;
  const readableTree = await getReadableTree(ctx, row.treeId, user);
  if (!readableTree) return null;
  return row;
}

/**
 * Checks whether a memory may be reparented to another memory within the same
 * tree. The parent memory must exist and belong to the same tree.
 */
export async function isParentInSameTree(
  ctx: ApiContext,
  treeId: string,
  parentId: string | null
): Promise<boolean> {
  if (!parentId) return true;
  const rows = await ctx.db.select().from(memories).where(eq(memories.id, parentId));
  const parent = rows[0];
  return parent !== undefined && parent.treeId === treeId;
}
