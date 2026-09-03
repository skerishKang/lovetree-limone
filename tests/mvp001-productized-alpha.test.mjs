import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALPHA_SUPPORTED_SOURCES,
  buildSurfaceUrl,
  parseAlphaBootstrap,
  projectAlphaContext,
  loadAlphaProjection,
  mapAlphaReadError,
} from '../public/mvp/01/productized-alpha.js';
import { ProductOrchestrator } from '../public/mvp/01/product-orchestrator.js';

function makeTree(overrides = {}) {
  return { id: 'tree-1', title: 'Tree', visibility: 'public', ...overrides };
}

let memSeq = 0;
function makeMemory(overrides = {}) {
  memSeq += 1;
  return {
    id: `mem-${memSeq}`,
    treeId: 'tree-1',
    title: 'Title',
    memo: 'note',
    sourceType: 'link',
    sourceUrl: 'https://example.com/page',
    thumbnail: 'https://example.com/thumb.jpg',
    timestamp: '2026-01-01',
    discoveryDate: '2026-01-01',
    emotionTags: ['joy'],
    visibility: 'public',
    artist: 'Artist',
    parentId: null,
    connectionReason: null,
    ...overrides,
  };
}

function makeContext(memories, selectedMemory = null) {
  return { tree: makeTree(), memories, selectedMemory };
}

function codeOfSync(fn) {
  try {
    fn();
  } catch (e) {
    return e && e.code;
  }
  return null;
}

async function codeOfAsync(fn) {
  try {
    await fn();
  } catch (e) {
    return e && e.code;
  }
  return null;
}

function stubClient({ tree = null, memories = [], selected = null, fail = null } = {}) {
  return {
    async getTree() {
      if (fail) throw fail;
      return tree ?? makeTree();
    },
    async getTreeMemories() {
      if (fail) throw fail;
      return memories;
    },
    async getMemory() {
      if (fail) throw fail;
      if (!selected) {
        const e = new Error('not found');
        e.name = 'Mvp001ReadError';
        e.code = 'HTTP';
        e.status = 404;
        throw e;
      }
      return selected;
    },
  };
}

// ---- bootstrap URL ----

test('alpha dispatch supports exactly the five Sources', () => {
  assert.deepEqual([...ALPHA_SUPPORTED_SOURCES], ['SRC064', 'SRC058', 'SRC056', 'SRC057', 'SRC060']);
});

test('buildSurfaceUrl carries only session and source params', () => {
  const url = buildSurfaceUrl('/mvp/01/surfaces/src058/index.html', 'frm-abc-123', 'SRC058');
  assert.ok(url.startsWith('/mvp/01/surfaces/src058/index.html?'));
  assert.ok(url.includes('mvpSession=frm-abc-123'));
  assert.ok(url.includes('mvpSource=SRC058'));
  assert.ok(!url.includes('token') && !url.includes('tree') && !url.includes('memory'));
  assert.equal(codeOfSync(() => buildSurfaceUrl('/x', 'frm-1', 'SRC999')), 'UNKNOWN_SOURCE');
  assert.throws(() => buildSurfaceUrl('', 'frm-1', 'SRC058'), /surfaceUrl/);
  assert.throws(() => buildSurfaceUrl('/x', '', 'SRC058'), /sessionId/);
});

test('parseAlphaBootstrap round-trips valid sessions only', () => {
  assert.deepEqual(
    parseAlphaBootstrap('?mvpSession=frm-1&mvpSource=SRC060'),
    { sessionId: 'frm-1', sourceId: 'SRC060' },
  );
  assert.equal(parseAlphaBootstrap('?step=board'), null);
  assert.equal(parseAlphaBootstrap('?mvpSession=frm-1&mvpSource=SRC999'), null);
  assert.equal(parseAlphaBootstrap('?mvpSource=SRC060'), null);
  assert.equal(parseAlphaBootstrap(''), null);
});

// ---- dispatch ----

test('projectAlphaContext dispatches all five adapters without mutating them', () => {
  const parent = makeMemory({ id: 'p1' });
  const child = makeMemory({ id: 'c1', parentId: 'p1', connectionReason: 'why' });
  const ctx = makeContext([parent, child], child);
  const bySource = {};
  for (const src of ALPHA_SUPPORTED_SOURCES) {
    const out = projectAlphaContext(src, ctx);
    assert.equal(out.sourceId, src);
    assert.ok(out.projection && typeof out.projection === 'object');
    bySource[src] = out.projection;
  }
  assert.ok(Array.isArray(bySource.SRC064.cards));
  assert.ok(Array.isArray(bySource.SRC058.moments));
  assert.ok(Array.isArray(bySource.SRC056.nodes) && bySource.SRC056.edges.length === 1);
  assert.ok(Array.isArray(bySource.SRC057.moments));
  assert.ok(Array.isArray(bySource.SRC060.nodes));
  assert.equal(bySource.SRC056.edges[0].from, 'p1');
});

test('projectAlphaContext fails closed on unknown source and bad context', async () => {
  const ctx = makeContext([]);
  assert.equal(codeOfSync(() => projectAlphaContext('SRC999', ctx)), 'UNKNOWN_SOURCE');
  assert.equal(codeOfSync(() => projectAlphaContext('SRC058', null)), 'INVALID_CONTEXT');
  assert.equal(await codeOfAsync(() => loadAlphaProjection({ client: stubClient(), treeId: 'tree-1', sourceId: 'SRC999' })), 'UNKNOWN_SOURCE');
});

test('loadAlphaProjection carries canonical identity end to end', async () => {
  const parent = makeMemory({ id: 'p1' });
  const child = makeMemory({ id: 'c1', parentId: 'p1' });
  const out = await loadAlphaProjection({
    client: stubClient({ memories: [parent, child], selected: child }),
    treeId: 'tree-1',
    selectedMemoryId: 'c1',
    sourceId: 'SRC056',
  });
  assert.equal(out.sourceId, 'SRC056');
  assert.equal(out.projection.selectedId, 'c1');
  assert.ok(out.projection.nodes.some((n) => n.id === 'p1'));
});

test('loadAlphaProjection passes read errors through unchanged', async () => {
  const fail = Object.assign(new Error('nope'), { name: 'Mvp001ReadError', code: 'HTTP', status: 404 });
  await assert.rejects(
    loadAlphaProjection({ client: stubClient({ fail }), treeId: 'tree-1', sourceId: 'SRC058' }),
    /nope/,
  );
  assert.equal(await codeOfAsync(() => loadAlphaProjection({
      client: stubClient({ memories: [makeMemory()], selected: makeMemory({ id: 'x', treeId: 'tree-9' }) }),
      treeId: 'tree-1',
      selectedMemoryId: 'x',
      sourceId: 'SRC058',
    })), 'SELECTED_MEMORY_TREE_MISMATCH');
});

// ---- error mapping ----

test('mapAlphaReadError names every Product state without fixture fallback', () => {
  const http = (status) => mapAlphaReadError(Object.assign(new Error('x'), { name: 'Mvp001ReadError', code: 'HTTP', status }));
  assert.equal(http(401).status, 'unauthorized');
  assert.equal(http(404).status, 'not-found');
  assert.equal(http(500).status, 'error');
  assert.equal(mapAlphaReadError(Object.assign(new Error('x'), { name: 'Mvp001ReadError', code: 'NETWORK' })).status, 'network-error');
  assert.equal(mapAlphaReadError(Object.assign(new Error('x'), { code: 'SELECTED_MEMORY_TREE_MISMATCH' })).status, 'not-found');
  assert.equal(mapAlphaReadError(null).status, 'error');
  assert.equal(mapAlphaReadError({}).status, 'error');
  for (const mapped of [http(401), http(404), mapAlphaReadError(null)]) {
    assert.ok(mapped.text.length > 0);
  }
});

// ---- orchestrator SOURCE_INIT projection ----

function mockWindow() {
  const url = new URL('http://localhost/mvp/01?step=board&tree=tree-1');
  globalThis.window = {
    location: { href: url.href, search: url.search, origin: url.origin },
    history: {
      pushState: (state, title, href) => {
        globalThis.window.location.href = href;
        globalThis.window.location.search = new URL(href).search;
      },
    },
  };
}

function mockFrame(captured, sessionId = 'frm-test-1', sourceId = 'SRC058') {
  return {
    contentWindow: { postMessage: (msg) => captured.push(msg) },
    dataset: { mvpSourceId: sourceId, mvpFrameSessionId: sessionId },
    src: '',
    remove: () => {},
  };
}

test('SOURCE_INIT embeds the dispatched adapter projection with read-only permissions', () => {
  mockWindow();
  try {
    const captured = [];
    const frame = mockFrame(captured);
    const projection = { moments: [{ id: 'm1' }], connections: [] };
    const orchestrator = new ProductOrchestrator({
      createFrame: () => frame,
      removeFrame: () => {},
      getProjection: (sourceId) => (sourceId === 'SRC058' ? projection : null),
    });
    orchestrator.init();
    orchestrator.sendSourceInit(frame, 'frm-test-1', 'SRC058');
    assert.equal(captured.length, 1);
    const msg = captured[0];
    assert.equal(msg.type, 'SOURCE_INIT');
    assert.deepEqual(msg.payload.projection, projection);
    assert.deepEqual(msg.payload.permissions, { canRead: true, canCreate: false, canUpdate: false, canDelete: false });
    assert.equal(msg.frameSessionId, 'frm-test-1');
    assert.equal(msg.sourceId, 'SRC058');
  } finally {
    delete globalThis.window;
  }
});

test('SOURCE_INIT fails closed to context-only canRead:false without projection', () => {
  mockWindow();
  try {
    const captured = [];
    const frame = mockFrame(captured);
    const orchestrator = new ProductOrchestrator({
      createFrame: () => frame,
      removeFrame: () => {},
      getProjection: () => { throw new Error('loader down'); },
    });
    orchestrator.init();
    orchestrator.sendSourceInit(frame, 'frm-test-1', 'SRC058');
    assert.equal(captured.length, 1);
    assert.deepEqual(captured[0].payload.projection, { sourceId: 'SRC058' });
    assert.equal(captured[0].payload.permissions.canRead, false);
  } finally {
    delete globalThis.window;
  }
});

test('SOURCE_READY handshake triggers INIT carrying the projection', () => {
  mockWindow();
  try {
    const captured = [];
    const frame = mockFrame(captured, 'frm-live-1', 'SRC056');
    const projection = { nodes: [{ id: 'm1' }], edges: [] };
    const orchestrator = new ProductOrchestrator({
      createFrame: () => frame,
      removeFrame: () => {},
      getProjection: (sourceId) => (sourceId === 'SRC056' ? projection : null),
    });
    orchestrator.init();
    const mounted = orchestrator.mountFrame('relationships', '/mvp/01/surfaces/src056/index.html');
    assert.ok(mounted);
    const liveFrame = orchestrator.activeFrame;
    const liveSession = orchestrator.activeFrameSessionId;
    const result = orchestrator.handleBridgeMessage({
      origin: 'http://localhost',
      source: liveFrame.contentWindow,
      data: {
        protocol: 'lovetree.mvp.bridge',
        protocolVersion: 1,
        mvpId: 'MVP001',
        sourceId: 'SRC056',
        frameSessionId: liveSession,
        messageId: 'msg-ready-1',
        type: 'SOURCE_READY',
        contextRevision: 1,
        payload: { capabilities: ['hydrate'], sourceRuntimeVersion: 't/1' },
      },
    });
    assert.equal(result.accepted, true);
    const init = captured.find((m) => m.type === 'SOURCE_INIT');
    assert.ok(init, 'INIT must follow READY');
    assert.deepEqual(init.payload.projection, projection);
  } finally {
    delete globalThis.window;
  }
});
