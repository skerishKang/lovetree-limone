const DEFAULT_BASE_PATH = '/api';

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function writeError(code, message, extra = {}) {
  const error = new Error(message);
  error.name = 'Mvp001WriteError';
  error.code = code;
  Object.assign(error, extra);
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
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} must be a non-empty string`);
  return encodeURIComponent(value);
}

function validateWriteFields(fields) {
  if (!isPlainObject(fields)) throw new TypeError('fields must be a plain object');
  const keys = Object.keys(fields);
  if (keys.length < 1 || keys.length > 2) throw new TypeError('fields must contain title and/or memo only');
  for (const key of keys) {
    if (key !== 'title' && key !== 'memo') throw new TypeError(`field not writable in Slice J: ${key}`);
  }
  const out = {};
  if ('title' in fields) {
    const v = fields.title;
    if (typeof v !== 'string' || v.trim().length < 1 || v.trim().length > 120) {
      throw new TypeError('title must be a non-empty string of 1..120 chars');
    }
    out.title = v.trim();
  }
  if ('memo' in fields) {
    const v = fields.memo;
    if (typeof v !== 'string' || v.trim().length < 1 || v.trim().length > 2000) {
      throw new TypeError('memo must be a non-empty string of 1..2000 chars');
    }
    out.memo = v.trim();
  }
  return out;
}

export function createMvp001UpdateClient({ fetchImpl, getAccessToken, basePath } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (getAccessToken !== undefined && typeof getAccessToken !== 'function') {
    throw new TypeError('getAccessToken must be a function when provided');
  }

  const apiBase = normalizeBasePath(basePath);

  async function bearerHeaders(extra = {}, refreshed = false) {
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json', ...extra };
    if (getAccessToken) {
      const token = refreshed && typeof getAccessToken.refresh === 'function'
        ? await getAccessToken.refresh()
        : await getAccessToken();
      const raw = typeof token === 'object' && token !== null && typeof token.token === 'string'
        ? token.token
        : token;
      if (typeof raw === 'string' && raw.length > 0) {
        headers.Authorization = `Bearer ${raw}`;
      }
    }
    return headers;
  }

  async function putOnce(memoryId, body, { headers, signal } = {}) {
    let response;
    try {
      response = await fetchImpl(`${apiBase}/memories/${pathSegment(memoryId, 'memoryId')}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (error && error.name === 'AbortError') throw error;
      throw writeError('NETWORK', 'MVP001 update request failed', { cause: error });
    }
    if (!response || typeof response.ok !== 'boolean' || typeof response.status !== 'number') {
      throw writeError('INVALID_RESPONSE', 'fetchImpl returned an invalid Response-like value');
    }
    return response;
  }

  return Object.freeze({
    async updateMemory(memoryId, fields, { signal } = {}) {
      const id = pathSegment(memoryId, 'memoryId');
      void id;
      const body = validateWriteFields(fields);
      const headers = await bearerHeaders();
      let response = await putOnce(memoryId, body, { headers, signal });
      if (response.status === 401 && getAccessToken) {
        const retryHeaders = await bearerHeaders({}, true);
        response = await putOnce(memoryId, body, { headers: retryHeaders, signal });
      }
      if (!response.ok) {
        const status = response.status;
        if (status === 400) throw writeError('VALIDATION', 'MVP001 update rejected (400)', { status });
        if (status === 401) throw writeError('UNAUTHORIZED', 'Sign-in required (401)', { status });
        if (status === 404) throw writeError('NOT_FOUND', 'Memory not found or not owned (404)', { status });
        if (status === 503) throw writeError('DISABLED', 'Mutations disabled (503)', { status });
        if (status >= 500) throw writeError('SERVER', `MVP001 update failed (HTTP ${status})`, { status });
        throw writeError('HTTP', `MVP001 update failed (HTTP ${status})`, { status });
      }
      try {
        const data = await response.json();
        if (!isPlainObject(data) || typeof data.id !== 'string') {
          throw writeError('INVALID_RESPONSE', 'Update response is missing a valid id');
        }
        return data;
      } catch (error) {
        if (error && error.code) throw error;
        throw writeError('INVALID_RESPONSE', 'Update response body is not valid JSON');
      }
    },
  });
}
