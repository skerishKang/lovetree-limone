const DEFAULT_BASE_PATH = '/api';
const MAX_LIST_LIMIT = 200;

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function invalidResponse(message) {
  const error = new Error(message);
  error.name = 'Mvp001ReadError';
  error.code = 'INVALID_RESPONSE';
  return error;
}

function httpError(status) {
  const error = new Error(`MVP001 read failed with HTTP ${status}`);
  error.name = 'Mvp001ReadError';
  error.code = 'HTTP';
  error.status = status;
  return error;
}

function networkError(cause) {
  const error = new Error('MVP001 read request failed');
  error.name = 'Mvp001ReadError';
  error.code = 'NETWORK';
  error.cause = cause;
  return error;
}

function normalizeBasePath(basePath) {
  const raw = basePath === undefined ? DEFAULT_BASE_PATH : basePath;
  if (typeof raw !== 'string') throw new TypeError('basePath must be a string');
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

function pathSegment(value, label) {
  if (!isNonEmptyString(value)) throw new TypeError(`${label} must be a non-empty string`);
  return encodeURIComponent(value);
}

function validateTree(value) {
  if (!isPlainObject(value) || !isNonEmptyString(value.id)) {
    throw invalidResponse('Tree response is missing a valid id');
  }
  if (value.title !== undefined && typeof value.title !== 'string') {
    throw invalidResponse('Tree title must be a string when present');
  }
  return value;
}

function validateMemory(value) {
  if (!isPlainObject(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.treeId)) {
    throw invalidResponse('Memory response is missing a valid id/treeId');
  }
  for (const field of ['title', 'sourceUrl', 'thumbnail', 'timestamp']) {
    if (value[field] !== undefined && typeof value[field] !== 'string') {
      throw invalidResponse(`Memory ${field} must be a string when present`);
    }
  }
  return value;
}

function validateMemoryList(value) {
  if (!Array.isArray(value)) throw invalidResponse('Tree memories response must be an array');
  return value.map(validateMemory);
}

export function createMvp001ReadClient({ fetchImpl, getAccessToken, basePath } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (getAccessToken !== undefined && typeof getAccessToken !== 'function') {
    throw new TypeError('getAccessToken must be a function when provided');
  }

  const apiBase = normalizeBasePath(basePath);

  async function readJson(path, { signal } = {}) {
    const headers = { Accept: 'application/json' };
    if (getAccessToken) {
      const token = await getAccessToken();
      if (typeof token === 'string' && token.length > 0) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    let response;
    try {
      response = await fetchImpl(`${apiBase}${path}`, {
        method: 'GET',
        headers,
        signal,
      });
    } catch (error) {
      if (error && error.name === 'AbortError') throw error;
      throw networkError(error);
    }

    if (!response || typeof response.ok !== 'boolean' || typeof response.status !== 'number') {
      throw invalidResponse('fetchImpl returned an invalid Response-like value');
    }
    if (!response.ok) throw httpError(response.status);

    try {
      return await response.json();
    } catch {
      throw invalidResponse('Response body is not valid JSON');
    }
  }

  return Object.freeze({
    async getTree(treeId, { signal } = {}) {
      const id = pathSegment(treeId, 'treeId');
      return validateTree(await readJson(`/trees/${id}`, { signal }));
    },

    async getTreeMemories(treeId, { limit, signal } = {}) {
      const id = pathSegment(treeId, 'treeId');
      let query = '';
      if (limit !== undefined) {
        if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) {
          throw new TypeError(`limit must be an integer between 1 and ${MAX_LIST_LIMIT}`);
        }
        query = `?limit=${limit}`;
      }
      return validateMemoryList(await readJson(`/trees/${id}/memories${query}`, { signal }));
    },

    async getMemory(memoryId, { signal } = {}) {
      const id = pathSegment(memoryId, 'memoryId');
      return validateMemory(await readJson(`/memories/${id}`, { signal }));
    },
  });
}
