import test from 'node:test';
import assert from 'node:assert/strict';

import { createMvp001ReadClient } from '../public/mvp/01/read-client.js';
import { loadMvp001ReadContext } from '../public/mvp/01/read-context.js';

function response(body, { status = 200, jsonError = null } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      if (jsonError) throw jsonError;
      return body;
    },
  };
}

function tree(overrides = {}) {
  return { id: 'tree-1', title: '', visibility: 'public', ...overrides };
}

function memory(overrides = {}) {
  return {
    id: 'mem-1',
    treeId: 'tree-1',
    title: '',
    sourceUrl: '',
    thumbnail: '',
    timestamp: '',
    visibility: 'public',
    ...overrides,
  };
}

test('anonymous public Tree read uses canonical GET route without Authorization', async () => {
  let observed;
  const client = createMvp001ReadClient({ fetchImpl: async (url, init) => {
    observed = { url, init };
    return response(tree());
  }});
  const value = await client.getTree('tree-1');
  assert.equal(value.id, 'tree-1');
  assert.equal(observed.url, '/api/trees/tree-1');
  assert.equal(observed.init.method, 'GET');
  assert.equal('Authorization' in observed.init.headers, false);
});

test('token-bearing Tree read uses Bearer authorization convention', async () => {
  let observed;
  const client = createMvp001ReadClient({
    getAccessToken: async () => 'token-123',
    fetchImpl: async (url, init) => {
      observed = { url, init };
      return response(tree());
    },
  });
  await client.getTree('tree-1');
  assert.equal(observed.init.headers.Authorization, 'Bearer token-123');
});

test('null token is omitted', async () => {
  let headers;
  const client = createMvp001ReadClient({
    getAccessToken: async () => null,
    fetchImpl: async (url, init) => {
      headers = init.headers;
      return response(tree());
    },
  });
  await client.getTree('tree-1');
  assert.equal('Authorization' in headers, false);
});

test('custom basePath is respected without duplicating /api', async () => {
  let url;
  const client = createMvp001ReadClient({ basePath: 'https://example.test/api/', fetchImpl: async (value) => {
    url = value;
    return response(tree());
  }});
  await client.getTree('tree-1');
  assert.equal(url, 'https://example.test/api/trees/tree-1');
});

test('getTreeMemories uses canonical route and limit', async () => {
  let url;
  const client = createMvp001ReadClient({ fetchImpl: async (value) => {
    url = value;
    return response([memory()]);
  }});
  const values = await client.getTreeMemories('tree-1', { limit: 200 });
  assert.equal(url, '/api/trees/tree-1/memories?limit=200');
  assert.equal(values.length, 1);
});

test('getMemory uses canonical route', async () => {
  let url;
  const client = createMvp001ReadClient({ fetchImpl: async (value) => {
    url = value;
    return response(memory());
  }});
  await client.getMemory('mem-1');
  assert.equal(url, '/api/memories/mem-1');
});

test('opaque path IDs are safely encoded', async () => {
  let url;
  const client = createMvp001ReadClient({ fetchImpl: async (value) => {
    url = value;
    return response(tree({ id: 'tree/one' }));
  }});
  await client.getTree('tree/one');
  assert.equal(url, '/api/trees/tree%2Fone');
});

test('AbortSignal is forwarded', async () => {
  const controller = new AbortController();
  let seenSignal;
  const client = createMvp001ReadClient({ fetchImpl: async (url, init) => {
    seenSignal = init.signal;
    return response(tree());
  }});
  await client.getTree('tree-1', { signal: controller.signal });
  assert.equal(seenSignal, controller.signal);
});

test('native AbortError is preserved by identity', async () => {
  const abort = new DOMException('aborted', 'AbortError');
  const client = createMvp001ReadClient({ fetchImpl: async () => { throw abort; } });
  await assert.rejects(client.getTree('tree-1'), (error) => error === abort && error.name === 'AbortError');
});

test('network failures are distinct from abort', async () => {
  const client = createMvp001ReadClient({ fetchImpl: async () => { throw new Error('offline'); } });
  await assert.rejects(client.getTree('tree-1'), (error) => error.code === 'NETWORK');
});

test('404 is deterministic HTTP error with status and no existence detail', async () => {
  const client = createMvp001ReadClient({ fetchImpl: async () => response({ error: 'Not found' }, { status: 404 }) });
  await assert.rejects(client.getTree('tree-1'), (error) => error.code === 'HTTP' && error.status === 404);
});

test('malformed JSON fails closed', async () => {
  const client = createMvp001ReadClient({ fetchImpl: async () => response(null, { jsonError: new SyntaxError('bad json') }) });
  await assert.rejects(client.getTree('tree-1'), (error) => error.code === 'INVALID_RESPONSE');
});

test('invalid Response-like object fails closed', async () => {
  const client = createMvp001ReadClient({ fetchImpl: async () => ({}) });
  await assert.rejects(client.getTree('tree-1'), (error) => error.code === 'INVALID_RESPONSE');
});

test('structurally malformed Tree fails closed', async () => {
  const client = createMvp001ReadClient({ fetchImpl: async () => response({ title: 'missing id' }) });
  await assert.rejects(client.getTree('tree-1'), (error) => error.code === 'INVALID_RESPONSE');
});

test('structurally malformed Memory fails closed', async () => {
  const client = createMvp001ReadClient({ fetchImpl: async () => response({ id: 'mem-1' }) });
  await assert.rejects(client.getMemory('mem-1'), (error) => error.code === 'INVALID_RESPONSE');
});

test('malformed memory list fails closed', async () => {
  const client = createMvp001ReadClient({ fetchImpl: async () => response({ memories: [] }) });
  await assert.rejects(client.getTreeMemories('tree-1'), (error) => error.code === 'INVALID_RESPONSE');
});

test('empty presentation strings are accepted', async () => {
  const client = createMvp001ReadClient({ fetchImpl: async () => response(memory()) });
  const value = await client.getMemory('mem-1');
  assert.equal(value.title, '');
  assert.equal(value.sourceUrl, '');
  assert.equal(value.thumbnail, '');
  assert.equal(value.timestamp, '');
});

test('non-string presentation field fails closed when present', async () => {
  const client = createMvp001ReadClient({ fetchImpl: async () => response(memory({ sourceUrl: 42 })) });
  await assert.rejects(client.getMemory('mem-1'), (error) => error.code === 'INVALID_RESPONSE');
});

test('limit is bounded to backend authority', async () => {
  const client = createMvp001ReadClient({ fetchImpl: async () => response([]) });
  await assert.rejects(client.getTreeMemories('tree-1', { limit: 201 }), TypeError);
  await assert.rejects(client.getTreeMemories('tree-1', { limit: 0 }), TypeError);
});

test('selected unlisted Memory is fetched independently and need not appear in list', async () => {
  const calls = [];
  const selected = memory({ id: 'hidden-1', visibility: 'unlisted' });
  const client = {
    async getTree(id) { calls.push(['tree', id]); return tree(); },
    async getTreeMemories(id, options) { calls.push(['list', id, options.limit]); return [memory({ id: 'public-1' })]; },
    async getMemory(id) { calls.push(['memory', id]); return selected; },
  };
  const loaded = await loadMvp001ReadContext({ client, treeId: 'tree-1', selectedMemoryId: 'hidden-1' });
  assert.equal(loaded.selectedMemory, selected);
  assert.deepEqual(calls.map((call) => call.slice(0, 3)), [
    ['tree', 'tree-1'],
    ['list', 'tree-1', 200],
    ['memory', 'hidden-1'],
  ]);
  assert.equal(loaded.memories.some((item) => item.id === 'hidden-1'), false);
});

test('selected memory tree mismatch fails closed', async () => {
  const client = {
    async getTree() { return tree(); },
    async getTreeMemories() { return []; },
    async getMemory() { return memory({ treeId: 'tree-2' }); },
  };
  await assert.rejects(
    loadMvp001ReadContext({ client, treeId: 'tree-1', selectedMemoryId: 'mem-1' }),
    (error) => error.code === 'SELECTED_MEMORY_TREE_MISMATCH',
  );
});

test('no selected memory skips independent getMemory call', async () => {
  let getMemoryCalled = false;
  const client = {
    async getTree() { return tree(); },
    async getTreeMemories(id, options) { assert.equal(options.limit, 200); return []; },
    async getMemory() { getMemoryCalled = true; return memory(); },
  };
  const loaded = await loadMvp001ReadContext({ client, treeId: 'tree-1' });
  assert.equal(loaded.selectedMemory, null);
  assert.equal(getMemoryCalled, false);
});

test('read context forwards one AbortSignal through all reads', async () => {
  const signal = new AbortController().signal;
  const seen = [];
  const client = {
    async getTree(id, options) { seen.push(options.signal); return tree(); },
    async getTreeMemories(id, options) { seen.push(options.signal); return []; },
    async getMemory(id, options) { seen.push(options.signal); return memory(); },
  };
  await loadMvp001ReadContext({ client, treeId: 'tree-1', selectedMemoryId: 'mem-1', signal });
  assert.deepEqual(seen, [signal, signal, signal]);
});

test('module has no DOM/browser global dependency', async () => {
  const before = globalThis.window;
  try {
    delete globalThis.window;
    const client = createMvp001ReadClient({ fetchImpl: async () => response(tree()) });
    assert.equal((await client.getTree('tree-1')).id, 'tree-1');
  } finally {
    if (before !== undefined) globalThis.window = before;
  }
});

test('client exposes only the three read methods', () => {
  const client = createMvp001ReadClient({ fetchImpl: async () => response(tree()) });
  assert.deepEqual(Object.keys(client).sort(), ['getMemory', 'getTree', 'getTreeMemories']);
  assert.equal(Object.isFrozen(client), true);
});

test('all requests remain GET-only and no mutation path is introduced', async () => {
  const calls = [];
  const client = createMvp001ReadClient({ fetchImpl: async (url, init) => {
    calls.push([url, init.method]);
    if (url.includes('/memories/') && !url.includes('/trees/')) return response(memory());
    if (url.includes('/memories')) return response([memory()]);
    return response(tree());
  }});
  await client.getTree('tree-1');
  await client.getTreeMemories('tree-1');
  await client.getMemory('mem-1');
  assert.ok(calls.every(([url, method]) => method === 'GET' && !/create|update|delete|fork/i.test(url)));
});

test('source has no Firebase SDK import or runtime dependency', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../public/mvp/01/read-client.js', import.meta.url), 'utf8');
  assert.equal(/firebase|react|next\/|document\.|window\./i.test(source), false);
});
