/**
 * Reusable canonical first-create client seam (Issue #204 Slice A).
 *
 * Extracts the proven V4Landing first-create semantics so any surface (e.g. the
 * Track66 First Journey after its presentation merges) can persist a first Tree +
 * first Memory through the exact same contract:
 *
 * - a stable pending clientKey is created BEFORE the first attempt and reused on
 *   every retry (never a fresh random key per attempt),
 * - the only endpoint used is POST /api/trees/with-first-memory,
 * - success requires BOTH tree.id and memory.id in the canonical response
 *   (HTTP 2xx alone is never treated as success),
 * - the pending key is kept on any failure or partial response and cleared only
 *   after the dual-ID complete response is confirmed,
 * - the caller receives explicit canonical treeId/memoryId on success.
 */

export const FIRST_CREATE_ENDPOINT = "/api/trees/with-first-memory";

/** Canonical pending clientKey storage key (matches V4Landing's CLIENT_KEY). */
export const PENDING_CLIENT_KEY = "lovetree-v4-product-spine-create-client-key";

export interface FirstMomentResponse {
  tree?: { id?: string };
  memory?: { id?: string };
  error?: string;
}

export interface FirstCreateResult {
  treeId: string;
  memoryId: string;
}

export interface FirstCreateOptions {
  /** Canonical with-first-memory payload (title, visibility, memory, ...). clientKey is added by the seam. */
  payload: Record<string, unknown>;
  /** Storage used for the pending clientKey. Defaults to the browser localStorage. */
  storage?: Storage;
  /** Fetch implementation (pass the authenticated apiFetch for the real path). Defaults to global fetch. */
  fetchFn?: typeof fetch;
}

/** Returns the stable pending clientKey, creating and persisting one before the first attempt. */
export function getOrCreateClientKey(storage: Storage): string {
  const existing = storage.getItem(PENDING_CLIENT_KEY);
  if (existing) return existing;
  const value = crypto.randomUUID();
  storage.setItem(PENDING_CLIENT_KEY, value);
  return value;
}

/** Clears the pending clientKey — only after a dual-ID complete response is confirmed. */
export function clearPendingClientKey(storage: Storage): void {
  storage.removeItem(PENDING_CLIENT_KEY);
}

/**
 * Dual-ID success decision: success requires BOTH tree.id and memory.id.
 * Throws on a partial/empty canonical response so the caller never treats a
 * partial write as success (keeps the pending clientKey intact for retry).
 */
export function resolveFirstCreateIds(data: FirstMomentResponse): FirstCreateResult {
  const treeId = data.tree?.id;
  const memoryId = data.memory?.id;
  if (!treeId || !memoryId) {
    throw new Error("첫 순간을 저장하지 못했어요.");
  }
  return { treeId, memoryId };
}

/**
 * Full canonical first-create flow:
 * stable pending clientKey → POST /api/trees/with-first-memory → dual-ID success
 * decision → pending key cleared only on complete success.
 *
 * Throws on HTTP failure or partial response, keeping the pending clientKey for retry.
 */
export async function createFirstTree(options: FirstCreateOptions): Promise<FirstCreateResult> {
  const storage = options.storage ?? globalThis.localStorage;
  const fetchFn = options.fetchFn ?? fetch;

  const clientKey = getOrCreateClientKey(storage);
  const response = await fetchFn(FIRST_CREATE_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...options.payload, clientKey }),
  });
  const data = (await response.json().catch(() => ({}))) as FirstMomentResponse;
  if (!response.ok) {
    throw new Error(data.error || "첫 순간을 저장하지 못했어요.");
  }
  const result = resolveFirstCreateIds(data);
  clearPendingClientKey(storage);
  return result;
}
