/**
 * MVP001 Slice C — framework-neutral read-only API client.
 *
 * Replaces fixture-only data assumptions with a real, READ-ONLY client for the
 * existing Product /api Tree and Memory read endpoints.
 *
 * Boundary:
 * - No DOM, React, Next.js or Firebase SDK dependency.
 * - Node-testable with an injected fetch implementation.
 * - Auth is optional and injected as a plain async token getter.
 * - Fail-closed on structurally invalid responses.
 * - Preserves the server's uniform 404 semantics (no client-side existence
 *   disclosure) and passes AbortSignal through to fetch.
 */

const DEFAULT_LIMIT = 200;

export class Mvp001ReadClientError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'Mvp001ReadClientError';
    this.code = code;
    this.status = options.status ?? 0;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeBasePath(basePath) {
  return (typeof basePath === 'string' ? basePath : '').replace(/\/+$/, '');
}

function requireOpaqueId(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Mvp001ReadClientError('INVALID_ID', `${label} must be a non-empty string`);
  }
  return encodeURIComponent(value);
}

/**
 * Minimum structural tree validation. Presentation fields may legitimately be
 * empty strings; only structural identity/access fields are required.
 */
function validateTree(tree) {
  if (!isPlainObject(tree)) return 'tree response must be a plain object';
  if (typeof tree.id !== 'string' || tree.id.length === 0) {
    return 'tree response id must be a non-empty string';
  }
  if (typeof tree.title !== 'string') return 'tree response title must be a string';
  if (typeof tree.visibility !== 'string' || tree.visibility.length === 0) {
    return 'tree response visibility must be a non-empty string';
  }
  return null;
}

/**
 * Minimum structural memory validation. title/sourceUrl/thumbnail/timestamp
 * may legitimately be empty strings and must not be rejected for that reason.
 */
function validateMemory(memory) {
  if (!isPlainObject(memory)) return 'memory response must be a plain object';
  if (typeof memory.id !== 'string' || memory.id.length === 0) {
    return 'memory response id must be a non-empty string';
  }
  if (typeof memory.treeId !== 'string' || memory.treeId.length === 0) {
    return 'memory response treeId must be a non-empty string';
  }
  if (typeof memory.title !== 'string') return 'memory response title must be a string';
  if (typeof memory.sourceUrl !== 'string') return 'memory response sourceUrl must be a string';
  if (typeof memory.thumbnail !== 'string') return 'memory response thumbnail must be a string';
  if (typeof memory.timestamp !== 'string') return 'memory response timestamp must be a string';
  if (typeof memory.visibility !== 'string' || memory.visibility.length === 0) {
    return 'memory response visibility must be a non-empty string';
  }
  return null;
}

/**
 * Creates the read-only MVP001 client.
 *
 * @param {object} options
 * @param {typeof fetch} [options.fetchImpl] Injected fetch; defaults to globalThis.fetch.
 * @param {() => Promise<string | null | undefined>} [options.getAccessToken] Optional async token getter.
 * @param {string} [options.basePath] Optional prefix for same-origin API paths.
 * @returns {{ getTree: Function, getTreeMemories: Function, getMemory: Function }}
 */
export function createMvp001ReadClient({ fetchImpl, getAccessToken, basePath = '' } = {}) {
  const doFetch = typeof fetchImpl === 'function'
    ? fetchImpl
    : (input, init) => globalThis.fetch(input, init);
  const base = normalizeBasePath(basePath);

  async function resolveHeaders() {
    if (typeof getAccessToken !== 'function') return undefined;
    let token;
    try {
      token = await getAccessToken();
    } catch (error) {
      throw new Mvp001ReadClientError('NETWORK', 'Failed to resolve access token', { cause: error });
    }
    if (token) return { authorization: `Bearer ${token}` };
    return undefined;
  }

  async function request(path, { signal } = {}) {
    const headers = await resolveHeaders();

    let response;
    try {
      response = await doFetch(`${base}${path}`, { method: 'GET', headers, signal });
    } catch (error) {
      // Native AbortError must remain native AbortError; never collapse into NETWORK.
      if (error !== null && typeof error === 'object' && error.name === 'AbortError') throw error;
      throw new Mvp001ReadClientError('NETWORK', 'Network request failed', { cause: error });
    }

    if (!response.ok) {
      throw new Mvp001ReadClientError(
        'HTTP_ERROR',
        `Request failed with status ${response.status}`,
        { status: response.status }
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Mvp001ReadClientError(
        'INVALID_RESPONSE',
        'Response body is not valid JSON',
        { cause: error, status: response.status }
      );
    }
    return data;
  }

  return {
    async getTree(treeId, { signal } = {}) {
      const id = requireOpaqueId(treeId, 'treeId');
      const data = await request(`/api/trees/${id}`, { signal });
      const problem = validateTree(data);
      if (problem) throw new Mvp001ReadClientError('INVALID_RESPONSE', problem);
      return data;
    },

    async getTreeMemories(treeId, { limit, signal } = {}) {
      const id = requireOpaqueId(treeId, 'treeId');
      const params = new URLSearchParams();
      if (limit !== undefined) params.set('limit', String(limit));
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await request(`/api/trees/${id}/memories${query}`, { signal });
      if (!Array.isArray(data)) {
        throw new Mvp001ReadClientError('INVALID_RESPONSE', 'memory list response must be an array');
      }
      for (const row of data) {
        const problem = validateMemory(row);
        if (problem) throw new Mvp001ReadClientError('INVALID_RESPONSE', problem);
      }
      return data;
    },

    async getMemory(memoryId, { signal } = {}) {
      const id = requireOpaqueId(memoryId, 'memoryId');
      const data = await request(`/api/memories/${id}`, { signal });
      const problem = validateMemory(data);
      if (problem) throw new Mvp001ReadClientError('INVALID_RESPONSE', problem);
      return data;
    },
  };
}

/**
 * Bounded integration helper for the MVP semantic context (treeId +
 * selectedMemoryId). Performs the required read order and fails closed when the
 * selected memory does not belong to the requested tree. The selected memory is
 * fetched independently and is NOT required to appear in the memory list
 * (a selected UNLISTED memory may legitimately be absent from list results).
 *
 * @param {ReturnType<typeof createMvp001ReadClient>} client
 * @param {{ treeId: string, selectedMemoryId?: string | null, signal?: AbortSignal }} options
 * @returns {Promise<{ tree: object, memories: object[], selectedMemory: object | null }>}
 */
export async function loadTreeWithSelection(client, { treeId, selectedMemoryId, signal } = {}) {
  const tree = await client.getTree(treeId, { signal });
  const memories = await client.getTreeMemories(treeId, { limit: DEFAULT_LIMIT, signal });

  let selectedMemory = null;
  if (selectedMemoryId) {
    selectedMemory = await client.getMemory(selectedMemoryId, { signal });
    if (selectedMemory.treeId !== treeId) {
      throw new Mvp001ReadClientError(
        'INVALID_RESPONSE',
        'selected memory does not belong to the requested tree'
      );
    }
  }

  return { tree, memories, selectedMemory };
}
