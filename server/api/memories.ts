import { eq, desc, asc, and, inArray, isNotNull } from "drizzle-orm";
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
  validateTimestamp,
  type VisibilityValue,
  type SourceTypeValue,
} from "./validate";

const SORT_ORDER_MAX_RETRIES = 16;
const SORT_ORDER_RETRY_BASE_DELAY_MS = 10;
const SORT_ORDER_RETRY_MAX_DELAY_MS = 100;

function retryDelayMs(attempt: number): number {
  // Bounded exponential backoff with jitter. Capping keeps the worst-case
  // request latency small even when the retry budget is exhausted.
  const exponential = Math.min(
    SORT_ORDER_RETRY_MAX_DELAY_MS,
    SORT_ORDER_RETRY_BASE_DELAY_MS * 2 ** attempt
  );
  const jitter = Math.random() * SORT_ORDER_RETRY_BASE_DELAY_MS;
  return Math.min(SORT_ORDER_RETRY_MAX_DELAY_MS, exponential + jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  sortOrder: { kind: "integer", min: 0, max: 10_000_000 },
  treeId: { kind: "string", trim: true, minLength: 1, maxLength: 100 },
} as const;

function buildMemoryRow(
  now: Date,
  values: {
    id: string;
    treeId: string;
    body: Record<string, unknown>;
    sortOrder: number;
  }
): MemoryRow {
  const { id, treeId, body, sortOrder } = values;
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
    sortOrder,
    visibility: ((body.visibility as string | undefined) ?? "public") as VisibilityValue,
    channelId: (body.channelId as string | undefined) ?? null,
    channelName: (body.channelName as string | undefined) ?? null,
    channelUrl: (body.channelUrl as string | undefined) ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

function validateMemoryContent(body: Record<string, unknown>): string | null {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const memo = typeof body.memo === "string" ? body.memo.trim() : "";
  if (title.length === 0 && memo.length === 0) {
    return "title or memo is required";
  }

  const tsError = validateTimestamp(body.timestamp, "timestamp");
  if (tsError) return tsError;

  return null;
}

async function findExistingByClientKey(
  ctx: ApiContext,
  treeId: string,
  clientKey: string
): Promise<MemoryRow | null> {
  const existing = await ctx.db
    .select()
    .from(memories)
    .where(and(eq(memories.treeId, treeId), eq(memories.clientKey, clientKey)));
  return existing[0] ?? null;
}

async function computeNextSortOrder(ctx: ApiContext, treeId: string): Promise<number> {
  const rows = await ctx.db
    .select({ sortOrder: memories.sortOrder })
    .from(memories)
    .where(and(eq(memories.treeId, treeId), isNotNull(memories.sortOrder)))
    .orderBy(desc(memories.sortOrder))
    .limit(1);
  return (rows[0]?.sortOrder ?? -1) + 1;
}

const UNIQUE_VIOLATION_SQLSTATE = "23505";
const UNIQUE_MESSAGE_PATTERNS = [
  /duplicate key value violates unique constraint/i,
  /sqlstate\s*23505/i,
  /\b23505\b/,
];

export function isUniqueViolation(error: unknown): boolean {
  // Prefer the structured SQLSTATE on the error and its cause chain. An
  // explicit non-23505 code (e.g. 08006, 23503) always wins over the message.
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (
    let depth = 0;
    depth < 4 && current !== null && current !== undefined;
    depth += 1
  ) {
    if (seen.has(current)) break; // guard against circular cause chains
    seen.add(current);
    const candidate = current as { code?: unknown };
    if (
      candidate.code !== undefined &&
      candidate.code !== null &&
      String(candidate.code) === UNIQUE_VIOLATION_SQLSTATE
    ) {
      return true;
    }
    if (
      candidate.code !== undefined &&
      candidate.code !== null &&
      String(candidate.code).length > 0
    ) {
      return false;
    }
    current = (current as { cause?: unknown }).cause;
  }

  // Fall back to message matching only when no structured code was found.
  // Scan the message on the error and its cause chain (same depth, cycle-safe
  // because the walk above already bounded the chain length).
  const messages: string[] = [];
  let node: unknown = error;
  for (let depth = 0; depth < 4 && node !== null && node !== undefined; depth += 1) {
    messages.push(node instanceof Error ? node.message : String(node));
    node = (node as { cause?: unknown }).cause;
  }
  return messages.some((message) => UNIQUE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message)));
}

async function insertMemoryWithRetry(
  ctx: ApiContext,
  treeId: string,
  body: Record<string, unknown>,
  clientKey: string | undefined
): Promise<Response> {
  if (clientKey) {
    const existing = await findExistingByClientKey(ctx, treeId, clientKey);
    if (existing) return json(existing, 200);
  }

  for (let attempt = 0; attempt < SORT_ORDER_MAX_RETRIES; attempt++) {
    if (clientKey) {
      const existing = await findExistingByClientKey(ctx, treeId, clientKey);
      if (existing) return json(existing, 200);
    }

    const nextSortOrder = await computeNextSortOrder(ctx, treeId);
    const now = new Date();
    const memory = buildMemoryRow(now, {
      id: crypto.randomUUID(),
      treeId,
      body,
      sortOrder: nextSortOrder,
    });

    try {
      await ctx.db.insert(memories).values(memory);
      return json(memory, 201);
    } catch (error) {
      if (isUniqueViolation(error)) {
        // Back off between attempts so a burst of concurrent creates spreads
        // out instead of stampeding the same next sortOrder repeatedly.
        if (attempt < SORT_ORDER_MAX_RETRIES - 1) {
          await sleep(retryDelayMs(attempt));
        }
        continue;
      }
      throw error;
    }
  }

  return errorResponse("Sort order conflict — please retry", 409);
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
    .orderBy(asc(memories.sortOrder), asc(memories.timestamp), asc(memories.createdAt), asc(memories.id))
    .limit(limit);

  return json(rows);
}

async function createMemory(ctx: ApiContext): Promise<Response> {
  const user = await requireAuthUser(ctx);
  if (!user) return errorResponse("Authorization required", 401);

  const body = await parseBody(ctx.request);
  const parsed = validate<Record<string, unknown>>(body, MEMORY_CREATE_RULES);
  if (!parsed.ok) return validationError(parsed.error);

  const contentError = validateMemoryContent(parsed.value);
  if (contentError) return validationError(contentError);

  const treeId = parsed.value.treeId as string;
  const ownedTree = await getOwnedTree(ctx, treeId, user);
  if (!ownedTree) return errorResponse("Not found", 404);

  if (!(await isParentInSameTree(ctx, treeId, (parsed.value.parentId as string | null) ?? null))) {
    return validationError("parentId must reference a memory in the same tree");
  }

  const clientKey = parsed.value.clientKey as string | undefined;
  return insertMemoryWithRetry(ctx, treeId, parsed.value, clientKey);
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
    "sortOrder",
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
    .orderBy(asc(memories.sortOrder), asc(memories.timestamp), asc(memories.createdAt), asc(memories.id))
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

  const contentError = validateMemoryContent(parsed.value);
  if (contentError) return validationError(contentError);

  const parentId = (parsed.value.parentId as string | null) ?? null;
  if (!(await isParentInSameTree(ctx, treeId, parentId))) {
    return validationError("parentId must reference a memory in the same tree");
  }

  const clientKey = parsed.value.clientKey as string | undefined;
  return insertMemoryWithRetry(ctx, treeId, parsed.value, clientKey);
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
