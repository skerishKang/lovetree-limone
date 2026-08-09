import { eq } from "drizzle-orm";
import { trees, memories } from "../../db/schema";
import type { AuthUser } from "./auth";
import type { ApiContext } from "./handler";

export type TreeRow = typeof trees.$inferSelect;
export type MemoryRow = typeof memories.$inferSelect;

export const VISIBILITY_PRIVATE = "private";
export const VISIBILITY_UNLISTED = "unlisted";
export const VISIBILITY_PUBLIC = "public";

export type VisibilityValue =
  | typeof VISIBILITY_PRIVATE
  | typeof VISIBILITY_UNLISTED
  | typeof VISIBILITY_PUBLIC;

/**
 * A newly-created memory inherits its parent tree visibility when the client
 * does not provide an explicit value. Explicit child visibility remains a
 * stored state; public/community exposure is decided separately.
 */
export function resolveMemoryVisibility(
  requestedVisibility: string | null | undefined,
  parentTreeVisibility: string | null | undefined
): VisibilityValue {
  if (
    requestedVisibility === VISIBILITY_PRIVATE ||
    requestedVisibility === VISIBILITY_UNLISTED ||
    requestedVisibility === VISIBILITY_PUBLIC
  ) {
    return requestedVisibility;
  }
  if (
    parentTreeVisibility === VISIBILITY_PRIVATE ||
    parentTreeVisibility === VISIBILITY_UNLISTED ||
    parentTreeVisibility === VISIBILITY_PUBLIC
  ) {
    return parentTreeVisibility;
  }
  return VISIBILITY_PUBLIC;
}

/**
 * Community/anonymous exposure is stricter than stored visibility: both the
 * child memory and its parent tree must be explicitly public.
 */
export function isCommunityMemoryReadable(
  memoryVisibility: string | null,
  parentTreeVisibility: string | null
): boolean {
  return (
    memoryVisibility === VISIBILITY_PUBLIC &&
    parentTreeVisibility === VISIBILITY_PUBLIC
  );
}

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
 * Memory read policy is evaluated against both the child and its parent.
 * Owners retain access to every child in their own tree. Non-owners can read
 * only public/unlisted children of a tree that is itself readable. Collection
 * and community routes apply stricter enumeration/exposure rules separately.
 */
export function isMemoryReadable(
  memory: MemoryRow,
  parentTree: TreeRow,
  user: AuthUser | null
): boolean {
  if (isTreeOwner(parentTree, user)) return true;
  if (!isTreeReadable(parentTree.visibility, parentTree.ownerId, user)) return false;
  return (
    memory.visibility === VISIBILITY_PUBLIC ||
    memory.visibility === VISIBILITY_UNLISTED
  );
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
 * Fetches a memory and returns it only when both the child visibility and its
 * parent tree access policy allow the current reader. Owners can always read
 * memories in their own tree, including private children.
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
  if (!isMemoryReadable(row, readableTree, user)) return null;
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
