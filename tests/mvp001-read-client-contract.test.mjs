import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createMvp001ReadClient,
  Mvp001ReadClientError,
  loadTreeWithSelection,
} from '../public/mvp/01/mvp001-read-client.js';

// ── Fixtures ────────────────────────────────────────────────────────────────

const TREE_OWNER_READABLE = {
  id: 'tree-owner-readable',
  ownerId: 'user-owner',
  clientKey: null,
  title: 'Owner Tree',
  memo: 'A tree the owner can read',
  artist: '',
  visibility: 'public',
  groupName: null,
  keywords: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  likeCount: 0,
  viewCount: 0,
};

const TREE_NONOWNER_PUBLIC = {
  id: 'tree-nonowner-public',
  ownerId: 'user-other',
  clientKey: null,
  title: 'Public Tree',
  memo: '',
  artist: '',
  visibility: 'public',
  groupName: null,
  keywords: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  likeCount: 0,
  viewCount: 0,
};

const TREE_EMPTY_TITLE = {
  id: 'tree-empty-title',
  title: '',
  visibility: 'public',
};

const MEMORY_ROOT = {
  id: 'mem-root',
  treeId: 'tree-owner-readable',
  clientKey: null,
  parentId: null,
  connectionReason: null,
  title: 'Root Memory',
  memo: '',
  artist: '',
  source: '',
  sourceUrl: 'https://www.youtube.com/watch?v=root123',
  sourceType: 'youtube',
  thumbnail: 'https://i.ytimg.com/vi/root123/hqdefault.jpg',
  emotionTags: [],
  timestamp: '2026-01-01',
  discoveryDate: '2026-01-01',
  videoOffsetSeconds: 0,
  sortOrder: 0,
  visibility: 'public',
  channelId: null,
  channelName: null,
  channelUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const MEMORY_CHILD = {
  id: 'mem-child',
  treeId: 'tree-owner-readable',
  clientKey: null,
  parentId: 'mem-root',
  connectionReason: 'next',
  title: 'Child Memory',
  memo: '',
  artist: '',
  source: '',
  sourceUrl: 'https://www.youtube.com/watch?v=child456',
  sourceType: 'youtube',
  thumbnail: 'https://i.ytimg.com/vi/child456/hqdefault.jpg',
  emotionTags: [],
  timestamp: '2026-01-02',
  discoveryDate: '2026-01-02',
  videoOffsetSeconds: 30,
  sortOrder: 1,
  visibility: 'public',
  channelId: null,
  channelName: null,
  channelUrl: null,
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const MEMORY_EMPTY_PRESENTATION = {
  id: 'mem-empty-fields',
  treeId: 'tree-owner-readable',
  title: '',
  sourceUrl: '',
  thumbnail: '',
  timestamp: '',
  visibility: 'public',
};

const MEMORY_SELECTED = {
  id: 'mem-selected',
  treeId: 'tree-owner-readable',
  clientKey: null,
  parentId: null,
  connectionReason: null,
  title: 'Selected Memory',
  memo: '',
  artist: '',
  source: '',
  sourceUrl: 'https://www.youtube.com/watch?v=selected000',
  sourceType: 'youtube',
  thumbnail: 'https://i.ytimg.com/vi/selected000/hqdefault.jpg',
  emotionTags: [],
  timestamp: '2026-01-04',
  discoveryDate: '2026-01-04',
  videoOffsetSeconds: null,
  sortOrder: 3,
  visibility: 'unlisted',
  channelId: null,
  channelName: null,
  channelUrl: null,
  createdAt: '2026-01-04T00:00:00.000Z',
  updatedAt: '2026-01-04T00:00:00.000Z',
};

const MEMORY_WRONG_TREE = {
  id: 'mem-wrong-tree',
  treeId: 'tree-other',
  title: 'Wrong Tree',
  sourceUrl: 'https://www.youtube.com/watch?v=wrong111',
  thumbnail: 'https://i.ytimg.com/vi/wrong111/hqdefault.jpg',
  timestamp: '2026-01-05',
  visibility: 'public',
};

// ── Mock helpers ────────────────────────────────────────────────────────────

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function recordFetch(responses) {
  const calls = [];
  let callIndex = 0;
  const fetchImpl = async (url, init) => {
    const entry = { url, init, headers: init?.headers, signal: init?.signal };
    calls.push(entry);
    const response = responses[callIndex] || jsonResponse({ error: 'unexpected call' }, 500);
    callIndex += 1;
    // Pass signal to the response if the signal is already aborted
    if (init?.signal?.aborted) {
      throw new DOMException('The operation was aborted', 'AbortError');
    }
    return typeof response === 'function' ? response(url, init) : response;
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

function treeResponse(tree) {
  return jsonResponse(tree);
}

function memoryListResponse(memories) {
  return jsonResponse(memories);
}

function memoryResponse(memory) {
  return jsonResponse(memory);
}

function errorResponse(status, message = 'Error') {
  return jsonResponse({ error: message }, status);
}

// ── Transport tests ────────────────────────────────────────────────────────

test('T1: getTree URL correctness', async () => {
  const fetchImpl = recordFetch([treeResponse(TREE_OWNER_READABLE)]);
  const client = createMvp001ReadClient({ fetchImpl });
  await client.getTree('tree-owner-readable');
  assert.equal(fetchImpl.calls.length, 1);
  assert.equal(fetchImpl.calls[0].url, '/api/trees/tree-owner-readable');
  assert.equal(fetchImpl.calls[0].init?.method, 'GET');
});

test('T2: getTreeMemories URL correctness', async () => {
  const fetchImpl = recordFetch([memoryListResponse([MEMORY_ROOT])]);
  const client = createMvp001ReadClient({ fetchImpl });
  await client.getTreeMemories('tree-owner-readable');
  assert.equal(fetchImpl.calls.length, 1);
  assert.equal(fetchImpl.calls[0].url, '/api/trees/tree-owner-readable/memories');
});

test('T3: getMemory URL correctness', async () => {
  const fetchImpl = recordFetch([memoryResponse(MEMORY_ROOT)]);
  const client = createMvp001ReadClient({ fetchImpl });
  await client.getMemory('mem-root');
  assert.equal(fetchImpl.calls.length, 1);
  assert.equal(fetchImpl.calls[0].url, '/api/memories/mem-root');
});

test('T4: getTreeMemories passes limit as query param', async () => {
  const fetchImpl = recordFetch([memoryListResponse([MEMORY_ROOT])]);
  const client = createMvp001ReadClient({ fetchImpl });
  await client.getTreeMemories('tree-owner-readable', { limit: 200 });
  assert.ok(fetchImpl.calls[0].url.includes('limit=200'), 'limit param must be in URL');
});

test('T5: token attached when getAccessToken returns a string', async () => {
  const fetchImpl = recordFetch([treeResponse(TREE_OWNER_READABLE)]);
  const client = createMvp001ReadClient({
    fetchImpl,
    getAccessToken: async () => 'test-token',
  });
  await client.getTree('tree-owner-readable');
  const headers = fetchImpl.calls[0].headers;
  assert.equal(headers?.authorization, 'Bearer test-token');
});

test('T6: token omitted when getAccessToken returns null', async () => {
  const fetchImpl = recordFetch([treeResponse(TREE_OWNER_READABLE)]);
  const client = createMvp001ReadClient({
    fetchImpl,
    getAccessToken: async () => null,
  });
  await client.getTree('tree-owner-readable');
  const headers = fetchImpl.calls[0].headers;
  assert.equal(headers, undefined);
});

test('T7: token omitted when getAccessToken is not provided', async () => {
  const fetchImpl = recordFetch([treeResponse(TREE_OWNER_READABLE)]);
  const client = createMvp001ReadClient({ fetchImpl });
  await client.getTree('tree-owner-readable');
  const headers = fetchImpl.calls[0].headers;
  assert.equal(headers, undefined);
});

test('T8: AbortSignal forwarded to fetchImpl', async () => {
  const fetchImpl = recordFetch([treeResponse(TREE_OWNER_READABLE)]);
  const client = createMvp001ReadClient({ fetchImpl });
  const controller = new AbortController();
  await client.getTree('tree-owner-readable', { signal: controller.signal });
  assert.ok(fetchImpl.calls[0].signal === controller.signal);
});

test('T9: AbortError preserved (not collapsed into NETWORK)', async () => {
  const controller = new AbortController();
  controller.abort();
  const client = createMvp001ReadClient({
    fetchImpl: async (_url, init) => {
      if (init?.signal?.aborted) {
        throw new DOMException('The operation was aborted', 'AbortError');
      }
      return jsonResponse(TREE_OWNER_READABLE);
    },
  });
  try {
    await client.getTree('tree-owner-readable', { signal: controller.signal });
    assert.fail('should have thrown');
  } catch (error) {
    assert.ok(error instanceof DOMException || error.name === 'AbortError',
      `expected AbortError, got ${error?.constructor?.name}: ${error?.message}`);
    assert.equal(error.name, 'AbortError');
  }
});

test('T10: IDs encoded via encodeURIComponent', async () => {
  const fetchImpl = recordFetch([treeResponse(TREE_OWNER_READABLE)]);
  const client = createMvp001ReadClient({ fetchImpl });
  await client.getTree('tree:special');
  assert.ok(fetchImpl.calls[0].url.includes('tree%3Aspecial'), 'special chars must be encoded');
});

test('T11: basePath prepended when provided', async () => {
  const fetchImpl = recordFetch([treeResponse(TREE_OWNER_READABLE)]);
  const client = createMvp001ReadClient({ fetchImpl, basePath: '/mvp/01' });
  await client.getTree('tree-owner-readable');
  assert.equal(fetchImpl.calls[0].url, '/mvp/01/api/trees/tree-owner-readable');
});

// ── Success tests ──────────────────────────────────────────────────────────

test('S1: anonymous public Tree read', async () => {
  const fetchImpl = recordFetch([treeResponse(TREE_OWNER_READABLE)]);
  const client = createMvp001ReadClient({ fetchImpl });
  const tree = await client.getTree('tree-owner-readable');
  assert.equal(tree.id, 'tree-owner-readable');
  assert.equal(tree.title, 'Owner Tree');
  assert.equal(tree.visibility, 'public');
});

test('S2: token-bearing Tree read', async () => {
  const fetchImpl = recordFetch([treeResponse(TREE_OWNER_READABLE)]);
  const client = createMvp001ReadClient({
    fetchImpl,
    getAccessToken: async () => 'valid-token',
  });
  const tree = await client.getTree('tree-owner-readable');
  assert.equal(tree.id, 'tree-owner-readable');
  assert.equal(fetchImpl.calls[0].headers.authorization, 'Bearer valid-token');
});

test('S3: getTreeMemories returns array', async () => {
  const fetchImpl = recordFetch([memoryListResponse([MEMORY_ROOT, MEMORY_CHILD])]);
  const client = createMvp001ReadClient({ fetchImpl });
  const memories = await client.getTreeMemories('tree-owner-readable');
  assert.equal(Array.isArray(memories), true);
  assert.equal(memories.length, 2);
  assert.equal(memories[0].id, 'mem-root');
  assert.equal(memories[1].id, 'mem-child');
});

test('S4: getMemory returns single memory', async () => {
  const fetchImpl = recordFetch([memoryResponse(MEMORY_ROOT)]);
  const client = createMvp001ReadClient({ fetchImpl });
  const memory = await client.getMemory('mem-root');
  assert.equal(memory.id, 'mem-root');
  assert.equal(memory.treeId, 'tree-owner-readable');
});

// ── Fail-closed tests ──────────────────────────────────────────────────────

test('F1: 404 handled deterministically (HTTP_ERROR with status 404)', async () => {
  const fetchImpl = recordFetch([errorResponse(404, 'Not found')]);
  const client = createMvp001ReadClient({ fetchImpl });
  try {
    await client.getTree('nonexistent');
    assert.fail('should have thrown');
  } catch (error) {
    assert.ok(error instanceof Mvp001ReadClientError);
    assert.equal(error.code, 'HTTP_ERROR');
    assert.equal(error.status, 404);
  }
});

test('F2: 401 handled deterministically', async () => {
  const fetchImpl = recordFetch([errorResponse(401, 'Authorization required')]);
  const client = createMvp001ReadClient({ fetchImpl });
  try {
    await client.getTree('private-tree');
    assert.fail('should have thrown');
  } catch (error) {
    assert.equal(error.code, 'HTTP_ERROR');
    assert.equal(error.status, 401);
  }
});

test('F3: 500 handled deterministically', async () => {
  const fetchImpl = recordFetch([errorResponse(500, 'Internal server error')]);
  const client = createMvp001ReadClient({ fetchImpl });
  try {
    await client.getTree('tree-id');
    assert.fail('should have thrown');
  } catch (error) {
    assert.equal(error.code, 'HTTP_ERROR');
    assert.equal(error.status, 500);
  }
});

test('F4: network failure throws NETWORK', async () => {
  const client = createMvp001ReadClient({
    fetchImpl: async () => { throw new Error('ECONNREFUSED'); },
  });
  try {
    await client.getTree('tree-id');
    assert.fail('should have thrown');
  } catch (error) {
    assert.ok(error instanceof Mvp001ReadClientError);
    assert.equal(error.code, 'NETWORK');
    assert.ok(error.cause, 'cause must be set');
  }
});

test('F5: malformed JSON response fails closed', async () => {
  const client = createMvp001ReadClient({
    fetchImpl: async () => new Response('not json', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });
  try {
    await client.getTree('tree-id');
    assert.fail('should have thrown');
  } catch (error) {
    assert.equal(error.code, 'INVALID_RESPONSE');
  }
});

test('F6: structurally malformed Tree fails closed', async () => {
  const fetchImpl = recordFetch([jsonResponse({ id: '', title: 'No ID', visibility: 'public' })]);
  const client = createMvp001ReadClient({ fetchImpl });
  try {
    await client.getTree('tree-id');
    assert.fail('should have thrown');
  } catch (error) {
    assert.equal(error.code, 'INVALID_RESPONSE');
  }
});

test('F7: structurally malformed Memory fails closed', async () => {
  const fetchImpl = recordFetch([memoryResponse({ id: '', treeId: '', title: 42 })]);
  const client = createMvp001ReadClient({ fetchImpl });
  try {
    await client.getMemory('mem-id');
    assert.fail('should have thrown');
  } catch (error) {
    assert.equal(error.code, 'INVALID_RESPONSE');
  }
});

test('F8: memory list with malformed row fails closed', async () => {
  const fetchImpl = recordFetch([memoryListResponse([MEMORY_ROOT, { id: '', treeId: '' }])]);
  const client = createMvp001ReadClient({ fetchImpl });
  try {
    await client.getTreeMemories('tree-owner-readable');
    assert.fail('should have thrown');
  } catch (error) {
    assert.equal(error.code, 'INVALID_RESPONSE');
  }
});

// ── Empty presentation fields ──────────────────────────────────────────────

test('E1: empty title accepted', async () => {
  const fetchImpl = recordFetch([treeResponse(TREE_EMPTY_TITLE)]);
  const client = createMvp001ReadClient({ fetchImpl });
  const tree = await client.getTree('tree-empty-title');
  assert.equal(tree.title, '');
});

test('E2: empty sourceUrl accepted', async () => {
  const fetchImpl = recordFetch([memoryResponse(MEMORY_EMPTY_PRESENTATION)]);
  const client = createMvp001ReadClient({ fetchImpl });
  const memory = await client.getMemory('mem-empty-fields');
  assert.equal(memory.sourceUrl, '');
});

test('E3: empty thumbnail accepted', async () => {
  const fetchImpl = recordFetch([memoryResponse(MEMORY_EMPTY_PRESENTATION)]);
  const client = createMvp001ReadClient({ fetchImpl });
  const memory = await client.getMemory('mem-empty-fields');
  assert.equal(memory.thumbnail, '');
});

test('E4: empty timestamp accepted', async () => {
  const fetchImpl = recordFetch([memoryResponse(MEMORY_EMPTY_PRESENTATION)]);
  const client = createMvp001ReadClient({ fetchImpl });
  const memory = await client.getMemory('mem-empty-fields');
  assert.equal(memory.timestamp, '');
});

// ── Selected memory semantics ──────────────────────────────────────────────

test('M1: selected Memory fetched independently (not from list)', async () => {
  const fetchImpl = recordFetch([
    treeResponse(TREE_OWNER_READABLE),
    memoryListResponse([MEMORY_ROOT, MEMORY_CHILD]),
    memoryResponse(MEMORY_SELECTED),
  ]);
  const client = createMvp001ReadClient({ fetchImpl });
  const result = await loadTreeWithSelection(client, {
    treeId: 'tree-owner-readable',
    selectedMemoryId: 'mem-selected',
  });
  assert.equal(result.tree.id, 'tree-owner-readable');
  assert.equal(result.memories.length, 2);
  assert.equal(result.selectedMemory.id, 'mem-selected');
  assert.equal(result.selectedMemory.visibility, 'unlisted');
  // 3 calls: getTree, getTreeMemories, getMemory
  assert.equal(fetchImpl.calls.length, 3);
});

test('M2: selectedMemory.treeId mismatch fails closed', async () => {
  const fetchImpl = recordFetch([
    treeResponse(TREE_OWNER_READABLE),
    memoryListResponse([MEMORY_ROOT]),
    memoryResponse(MEMORY_WRONG_TREE),
  ]);
  const client = createMvp001ReadClient({ fetchImpl });
  try {
    await loadTreeWithSelection(client, {
      treeId: 'tree-owner-readable',
      selectedMemoryId: 'mem-wrong-tree',
    });
    assert.fail('should have thrown');
  } catch (error) {
    assert.equal(error.code, 'INVALID_RESPONSE');
    assert.ok(error.message.includes('does not belong'));
  }
});

test('M3: selected unlisted Memory may be absent from list (no requirement to appear)', async () => {
  // The list returns only [MEMORY_ROOT]; MEMORY_SELECTED is unlisted and not in the list.
  // This must NOT cause a failure — the selected memory is fetched independently.
  const fetchImpl = recordFetch([
    treeResponse(TREE_OWNER_READABLE),
    memoryListResponse([MEMORY_ROOT]),
    memoryResponse(MEMORY_SELECTED),
  ]);
  const client = createMvp001ReadClient({ fetchImpl });
  const result = await loadTreeWithSelection(client, {
    treeId: 'tree-owner-readable',
    selectedMemoryId: 'mem-selected',
  });
  assert.equal(result.memories.length, 1);
  assert.equal(result.memories[0].id, 'mem-root');
  assert.equal(result.selectedMemory.id, 'mem-selected');
  // The selected memory is unlisted and not in the list — that's fine
});

test('M4: loadTreeWithSelection with no selectedMemoryId returns null selectedMemory', async () => {
  const fetchImpl = recordFetch([
    treeResponse(TREE_OWNER_READABLE),
    memoryListResponse([MEMORY_ROOT]),
  ]);
  const client = createMvp001ReadClient({ fetchImpl });
  const result = await loadTreeWithSelection(client, {
    treeId: 'tree-owner-readable',
  });
  assert.equal(result.selectedMemory, null);
  // Only 2 calls: getTree, getTreeMemories
  assert.equal(fetchImpl.calls.length, 2);
});

// ── Architecture / boundary tests ──────────────────────────────────────────

test('A1: no React import in source', () => {
  const source = readFileSync(
    join(import.meta.dirname, '..', 'public/mvp/01/mvp001-read-client.js'),
    'utf8'
  );
  assert.ok(!source.includes('react'), 'source must not reference react');
});

test('A2: no Next import in source', () => {
  const source = readFileSync(
    join(import.meta.dirname, '..', 'public/mvp/01/mvp001-read-client.js'),
    'utf8'
  );
  assert.ok(!source.includes('next'), 'source must not reference next');
});

test('A3: no Firebase import in source', () => {
  const source = readFileSync(
    join(import.meta.dirname, '..', 'public/mvp/01/mvp001-read-client.js'),
    'utf8'
  );
  assert.ok(!source.includes('firebase'), 'source must not reference firebase');
});

test('A4: no DOM dependency in source', () => {
  const source = readFileSync(
    join(import.meta.dirname, '..', 'public/mvp/01/mvp001-read-client.js'),
    'utf8'
  );
  assert.ok(!source.includes('window'), 'source must not reference window');
  assert.ok(!source.includes('document'), 'source must not reference document');
});

test('A5: no write/mutation request paths introduced', () => {
  const source = readFileSync(
    join(import.meta.dirname, '..', 'public/mvp/01/mvp001-read-client.js'),
    'utf8'
  );
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  for (const method of writeMethods) {
    assert.ok(!source.includes(`method: '${method}'`), `source must not issue ${method} requests`);
  }
});

test('A6: createMvp001ReadClient returns only read methods', () => {
  const client = createMvp001ReadClient({ fetchImpl: async () => new Response() });
  const keys = Object.keys(client).sort();
  assert.deepEqual(keys, ['getMemory', 'getTree', 'getTreeMemories']);
});

// ── Node compatibility ─────────────────────────────────────────────────────

test('N1: runs in Node test environment with injected fetch mock', async () => {
  // This test itself proves Node compatibility — it runs under node:test.
  const fetchImpl = recordFetch([treeResponse(TREE_OWNER_READABLE)]);
  const client = createMvp001ReadClient({ fetchImpl });
  const tree = await client.getTree('tree-owner-readable');
  assert.equal(tree.id, 'tree-owner-readable');
});