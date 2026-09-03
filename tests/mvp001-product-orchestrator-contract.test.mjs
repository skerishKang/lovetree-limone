import test from 'node:test';
import assert from 'node:assert/strict';

import { ProductOrchestrator } from '../public/mvp/01/product-orchestrator.js';

function createMockFrame(sessionId, sourceId) {
  return {
    contentWindow: {
      postMessage: () => {},
    },
    dataset: { mvpSourceId: sourceId, mvpFrameSessionId: sessionId },
    src: '',
    remove: () => {},
  };
}

function createOrchestrator(initialSearch = '?step=entry') {
  const url = new URL(`http://localhost/mvp/01${initialSearch}`);
  const originalLocation = globalThis.window?.location;
  const originalHistory = globalThis.window?.history;

  globalThis.window = {
    location: {
      href: url.href,
      search: url.search,
      origin: url.origin,
    },
    history: {
      pushState: (state, title, href) => {
        globalThis.window.location.href = href;
        globalThis.window.location.search = new URL(href).search;
      },
    },
  };

  const orchestrator = new ProductOrchestrator({
    createFrame: (surfaceUrl, sessionId, sourceId) => createMockFrame(sessionId, sourceId),
    removeFrame: (frame) => {
      frame.src = 'about:blank';
      frame.remove();
    },
    updateUrl: (url) => {
      globalThis.window.history.pushState({}, '', url);
      globalThis.window.location.href = url;
      globalThis.window.location.search = new URL(url).search;
    },
  });

  orchestrator.init();

  return {
    orchestrator,
    restore() {
      if (originalLocation) globalThis.window.location = originalLocation;
      if (originalHistory) globalThis.window.history = originalHistory;
      else delete globalThis.window;
    },
  };
}

function bridgeMessage(overrides = {}) {
  return {
    protocol: 'lovetree.mvp.bridge',
    protocolVersion: 1,
    mvpId: 'MVP001',
    sourceId: 'SRC057',
    frameSessionId: 'frm-test-123',
    messageId: 'msg-' + Math.random().toString(36).slice(2),
    type: 'MEMORY_SELECTED',
    contextRevision: 1,
    payload: { memoryId: 'memory-1', selectionReason: 'user' },
    ...overrides,
  };
}

test('A. canonical URL parse on boot', () => {
  const { orchestrator, restore } = createOrchestrator('?step=memory&tree=tree-1&memory=mem-1');
  const ctx = orchestrator.getContext();
  assert.equal(ctx.currentStep, 'memory');
  assert.equal(ctx.treeId, 'tree-1');
  assert.equal(ctx.selectedMemoryId, 'mem-1');
  restore();
});

test('A. canonical URL parse fails safe on invalid step', () => {
  const { orchestrator, restore } = createOrchestrator('?step=unknown&tree=tree-1');
  const ctx = orchestrator.getContext();
  assert.equal(ctx.currentStep, 'entry');
  assert.equal(ctx.treeId, 'tree-1');
  assert.equal(ctx.selectedMemoryId, null);
  restore();
});

test('B. SOURCE_READY accepted for active frame', () => {
  const { orchestrator, restore } = createOrchestrator('?step=memory');
  orchestrator.mountFrame('memory', '/mvp/01/surfaces/src057/index.html');
  const sessionId = orchestrator.activeFrameSessionId;
  const event = {
    origin: globalThis.window.location.origin,
    source: orchestrator.activeFrame.contentWindow,
    data: bridgeMessage({ type: 'SOURCE_READY', frameSessionId: sessionId, sourceId: 'SRC057', payload: { capabilities: ['select-memory'], sourceRuntimeVersion: 'v1' } }),
  };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, true);
  assert.equal(orchestrator.isSourceReadyForSession(sessionId), true);
  restore();
});

test('C. SOURCE_READY wrong origin rejected', () => {
  const { orchestrator, restore } = createOrchestrator('?step=memory');
  orchestrator.mountFrame('memory', '/mvp/01/surfaces/src057/index.html');
  const event = {
    origin: 'https://evil.example',
    source: orchestrator.activeFrame.contentWindow,
    data: bridgeMessage({ type: 'SOURCE_READY', frameSessionId: orchestrator.activeFrameSessionId, sourceId: 'SRC057', payload: { capabilities: ['select-memory'], sourceRuntimeVersion: 'v1' } }),
  };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'ORIGIN');
  restore();
});

test('D. wrong sender window rejected', () => {
  const { orchestrator, restore } = createOrchestrator('?step=memory');
  orchestrator.mountFrame('memory', '/mvp/01/surfaces/src057/index.html');
  const event = {
    origin: globalThis.window.location.origin,
    source: {},
    data: bridgeMessage({ type: 'SOURCE_READY', frameSessionId: orchestrator.activeFrameSessionId, sourceId: 'SRC057', payload: { capabilities: ['select-memory'], sourceRuntimeVersion: 'v1' } }),
  };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'SENDER_WINDOW');
  restore();
});

test('E. stale frameSessionId rejected', () => {
  const { orchestrator, restore } = createOrchestrator('?step=memory');
  orchestrator.mountFrame('memory', '/mvp/01/surfaces/src057/index.html');
  const event = {
    origin: globalThis.window.location.origin,
    source: orchestrator.activeFrame.contentWindow,
    data: bridgeMessage({ type: 'SOURCE_READY', frameSessionId: 'stale-session', sourceId: 'SRC057', payload: { capabilities: ['select-memory'], sourceRuntimeVersion: 'v1' } }),
  };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'STALE_FRAME_SESSION');
  restore();
});

test('F. wrong sourceId rejected', () => {
  const { orchestrator, restore } = createOrchestrator('?step=memory');
  orchestrator.mountFrame('memory', '/mvp/01/surfaces/src057/index.html');
  const event = {
    origin: globalThis.window.location.origin,
    source: orchestrator.activeFrame.contentWindow,
    data: bridgeMessage({ type: 'SOURCE_READY', frameSessionId: orchestrator.activeFrameSessionId, sourceId: 'SRC999' }),
  };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'SOURCE_ID');
  restore();
});

test('G. secret/token-bearing payload rejected', () => {
  const { orchestrator, restore } = createOrchestrator('?step=memory');
  orchestrator.mountFrame('memory', '/mvp/01/surfaces/src057/index.html');
  const event = {
    origin: globalThis.window.location.origin,
    source: orchestrator.activeFrame.contentWindow,
    data: bridgeMessage({ type: 'ERROR', payload: { code: 'READ_FAILED', recoverable: true, operation: 'Bearer abc.def.ghi' } }),
  };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'SECRET_MATERIAL');
  restore();
});

test('H. valid TREE_SELECTED updates treeId and clears stale memory on tree switch', () => {
  const { orchestrator, restore } = createOrchestrator('?step=entry&tree=old-tree&memory=mem-1');
  orchestrator.mountFrame('entry', '/mvp/01/surfaces/src064/index.html');
  const event = {
    origin: globalThis.window.location.origin,
    source: orchestrator.activeFrame.contentWindow,
    data: bridgeMessage({ type: 'TREE_SELECTED', payload: { treeId: 'new-tree' }, frameSessionId: orchestrator.activeFrameSessionId, sourceId: 'SRC064' }),
  };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, true);
  assert.equal(orchestrator.getContext().treeId, 'new-tree');
  assert.equal(orchestrator.getContext().selectedMemoryId, null);
  assert.equal(orchestrator.contextRevision, 2);
  restore();
});

test('I. MEMORY_SELECTED without tree rejected', () => {
  const { orchestrator, restore } = createOrchestrator('?step=entry');
  orchestrator.mountFrame('entry', '/mvp/01/surfaces/src064/index.html');
  const event = {
    origin: globalThis.window.location.origin,
    source: orchestrator.activeFrame.contentWindow,
    data: bridgeMessage({ type: 'MEMORY_SELECTED', payload: { memoryId: 'mem-1', selectionReason: 'user' }, frameSessionId: orchestrator.activeFrameSessionId, sourceId: 'SRC064' }),
  };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'ORPHAN_MEMORY_SELECTION');
  restore();
});

test('J. valid MEMORY_SELECTED updates canonical memory', () => {
  const { orchestrator, restore } = createOrchestrator('?step=board&tree=tree-1');
  orchestrator.mountFrame('board', '/mvp/01/surfaces/src058/index.html');
  const event = {
    origin: globalThis.window.location.origin,
    source: orchestrator.activeFrame.contentWindow,
    data: bridgeMessage({ type: 'MEMORY_SELECTED', payload: { memoryId: 'mem-1', selectionReason: 'user' }, frameSessionId: orchestrator.activeFrameSessionId, sourceId: 'SRC058' }),
  };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, true);
  assert.equal(orchestrator.getContext().selectedMemoryId, 'mem-1');
  assert.equal(orchestrator.contextRevision, 2);
  restore();
});

test('K. NAVIGATE changes step/source exactly once', () => {
  const { orchestrator, restore } = createOrchestrator('?step=entry&tree=tree-1');
  orchestrator.mountFrame('entry', '/mvp/01/surfaces/src064/index.html');
  const event = {
    origin: globalThis.window.location.origin,
    source: orchestrator.activeFrame.contentWindow,
    data: bridgeMessage({ type: 'NAVIGATE', payload: { targetStep: 'board', memoryId: 'mem-1', origin: 'SRC064.navigate' }, frameSessionId: orchestrator.activeFrameSessionId, sourceId: 'SRC064' }),
  };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, true);
  assert.equal(result.stepIndex, 1);
  assert.equal(orchestrator.getContext().currentStep, 'board');
  assert.equal(orchestrator.getContext().selectedMemoryId, 'mem-1');
  restore();
});

test('L. RELATIONSHIP_SELECTED rejected by default', () => {
  const { orchestrator, restore } = createOrchestrator('?step=relationships&tree=tree-1');
  orchestrator.mountFrame('relationships', '/mvp/01/surfaces/src056/index.html');
  const event = {
    origin: globalThis.window.location.origin,
    source: orchestrator.activeFrame.contentWindow,
    data: bridgeMessage({ type: 'RELATIONSHIP_SELECTED', payload: { relationshipId: 'edge-1', fromMemoryId: 'mem-1', toMemoryId: 'mem-2' }, frameSessionId: orchestrator.activeFrameSessionId, sourceId: 'SRC056' }),
  };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'MESSAGE_TYPE');
  restore();
});

test('M. old iframe event after navigation cannot mutate context', () => {
  const { orchestrator, restore } = createOrchestrator('?step=entry&tree=tree-1');
  const firstFrame = orchestrator.mountFrame('entry', '/mvp/01/surfaces/src064/index.html');
  const firstSessionId = orchestrator.activeFrameSessionId;

  const navigateEvent = {
    origin: globalThis.window.location.origin,
    source: firstFrame.contentWindow,
    data: bridgeMessage({ type: 'NAVIGATE', payload: { targetStep: 'board', origin: 'SRC064.navigate' }, frameSessionId: firstSessionId, sourceId: 'SRC064' }),
  };
  orchestrator.handleBridgeMessage(navigateEvent);

  const oldFrameEvent = {
    origin: globalThis.window.location.origin,
    source: firstFrame.contentWindow,
    data: bridgeMessage({ type: 'TREE_SELECTED', payload: { treeId: 'hacked-tree' }, frameSessionId: firstSessionId, sourceId: 'SRC064' }),
  };
  const staleResult = orchestrator.handleBridgeMessage(oldFrameEvent);
  assert.equal(staleResult.accepted, false);
  assert.equal(staleResult.code, 'SENDER_WINDOW');
  restore();
});

test('N. popstate/deep link restores step/tree/memory', () => {
  const { orchestrator, restore } = createOrchestrator('?step=memory&tree=tree-1&memory=mem-1');
  orchestrator.mountFrame('memory', '/mvp/01/surfaces/src057/index.html');
  const restored = orchestrator.onPopState();
  assert.equal(restored.stepIndex, 3);
  assert.equal(restored.context.currentStep, 'memory');
  assert.equal(restored.context.treeId, 'tree-1');
  assert.equal(restored.context.selectedMemoryId, 'mem-1');
  restore();
});

test('O. SOURCE_INIT permissions are read-only', () => {
  const { orchestrator, restore } = createOrchestrator('?step=memory&tree=tree-1');
  orchestrator.mountFrame('memory', '/mvp/01/surfaces/src057/index.html');
  orchestrator.shell.getProjection = () => ({});
  let sentPayload = null;
  const originalPostMessage = orchestrator.activeFrame.contentWindow.postMessage;
  orchestrator.activeFrame.contentWindow.postMessage = (data, origin) => {
    if (data.type === 'SOURCE_INIT') {
      sentPayload = data.payload;
    }
    originalPostMessage(data, origin);
  };

  const readyEvent = {
    origin: globalThis.window.location.origin,
    source: orchestrator.activeFrame.contentWindow,
    data: bridgeMessage({ type: 'SOURCE_READY', frameSessionId: orchestrator.activeFrameSessionId, sourceId: 'SRC057', payload: { capabilities: ['select-memory'], sourceRuntimeVersion: 'v1' } }),
  };
  orchestrator.handleBridgeMessage(readyEvent);

  assert.ok(sentPayload, 'SOURCE_INIT should be sent');
  assert.equal(sentPayload.permissions.canRead, true);
  assert.equal(sentPayload.permissions.canCreate, false);
  assert.equal(sentPayload.permissions.canUpdate, false);
  assert.equal(sentPayload.permissions.canDelete, false);
  restore();
});

test('P. no Source authority files mutated', () => {
  const { orchestrator, restore } = createOrchestrator('?step=entry');
  orchestrator.mountFrame('entry', '/mvp/01/surfaces/src064/index.html');
  assert.ok(orchestrator.activeFrame.dataset.mvpSourceId === 'SRC064');
  assert.ok(orchestrator.activeFrame.dataset.mvpFrameSessionId);
  restore();
});
