import test from 'node:test';
import assert from 'node:assert/strict';

import { ProductOrchestrator } from '../public/mvp/01/product-orchestrator.js';

function installWindow(search = '?step=entry') {
  const url = new URL(`http://localhost/mvp/01${search}`);
  const previousWindow = globalThis.window;

  globalThis.window = {
    location: {
      href: url.href,
      search: url.search,
      origin: url.origin,
    },
    history: {
      pushState: (_state, _title, href) => {
        const next = new URL(href, globalThis.window.location.origin);
        globalThis.window.location.href = next.href;
        globalThis.window.location.search = next.search;
      },
    },
  };

  return () => {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  };
}

function createFrame() {
  const sent = [];
  return {
    sent,
    contentWindow: {
      postMessage: (message, origin) => sent.push({ message, origin }),
    },
    removed: false,
    remove() {
      this.removed = true;
    },
  };
}

function createOrchestrator(search = '?step=entry') {
  const restoreWindow = installWindow(search);
  const frames = [];
  const orchestrator = new ProductOrchestrator({
    createFrame: () => {
      const frame = createFrame();
      frames.push(frame);
      return frame;
    },
    removeFrame: (frame) => {
      frame.remove();
    },
  });
  orchestrator.init();

  return {
    orchestrator,
    frames,
    restore: restoreWindow,
  };
}

function message(orchestrator, overrides = {}) {
  return {
    protocol: 'lovetree.mvp.bridge',
    protocolVersion: 1,
    mvpId: 'MVP001',
    sourceId: orchestrator.activeSourceId,
    frameSessionId: orchestrator.activeFrameSessionId,
    messageId: `msg-${Math.random().toString(36).slice(2)}`,
    type: 'MEMORY_SELECTED',
    contextRevision: orchestrator.contextRevision,
    payload: { memoryId: 'memory-1', selectionReason: 'user' },
    ...overrides,
  };
}

function eventFor(orchestrator, data, source = orchestrator.activeFrameWindow) {
  return {
    origin: globalThis.window.location.origin,
    source,
    data,
  };
}

test('shell navigation updates canonical step, revision, and URL before remount', () => {
  const { orchestrator, restore } = createOrchestrator('?step=entry&tree=tree-1');
  const before = orchestrator.contextRevision;

  const result = orchestrator.navigateFromShell('board');

  assert.equal(result.accepted, true);
  assert.equal(result.changed, true);
  assert.equal(orchestrator.getContext().currentStep, 'board');
  assert.equal(orchestrator.contextRevision, before + 1);
  assert.equal(new URL(globalThis.window.location.href).searchParams.get('step'), 'board');
  restore();
});

test('mutating message with stale contextRevision is rejected fail-closed', () => {
  const { orchestrator, restore } = createOrchestrator('?step=board&tree=tree-1');
  orchestrator.mountFrame('board', '/mvp/01/surfaces/src058/index.html');

  const accepted = orchestrator.handleBridgeMessage(eventFor(
    orchestrator,
    message(orchestrator, {
      sourceId: 'SRC058',
      payload: { memoryId: 'memory-1', selectionReason: 'user' },
    }),
  ));
  assert.equal(accepted.accepted, true);
  assert.equal(orchestrator.contextRevision, 2);

  const stale = orchestrator.handleBridgeMessage(eventFor(
    orchestrator,
    message(orchestrator, {
      sourceId: 'SRC058',
      contextRevision: 1,
      payload: { memoryId: 'memory-2', selectionReason: 'user' },
    }),
  ));

  assert.equal(stale.accepted, false);
  assert.equal(stale.code, 'STALE_CONTEXT_REVISION');
  assert.equal(orchestrator.getContext().selectedMemoryId, 'memory-1');
  restore();
});

test('popstate restoration keeps contextRevision monotonic', () => {
  const { orchestrator, restore } = createOrchestrator('?step=entry&tree=tree-1');
  orchestrator.navigateFromShell('board');
  assert.equal(orchestrator.contextRevision, 2);

  const backUrl = new URL('http://localhost/mvp/01?step=entry&tree=tree-1');
  globalThis.window.location.href = backUrl.href;
  globalThis.window.location.search = backUrl.search;

  const restored = orchestrator.onPopState();

  assert.equal(restored.context.currentStep, 'entry');
  assert.equal(orchestrator.contextRevision, 3);
  assert.equal(restored.context.contextRevision, 3);
  assert.equal(restored.context.navigationOrigin, 'popstate');
  restore();
});

test('old iframe cannot mutate context after an actual remount', () => {
  const { orchestrator, restore } = createOrchestrator('?step=entry');
  const firstMount = orchestrator.mountFrame('entry', '/mvp/01/surfaces/src064/index.html');
  const firstFrame = firstMount.frame;
  const firstSession = firstMount.sessionId;

  orchestrator.navigateFromShell('board');
  orchestrator.unmountFrame();
  orchestrator.mountFrame('board', '/mvp/01/surfaces/src058/index.html');

  const staleEvent = {
    origin: globalThis.window.location.origin,
    source: firstFrame.contentWindow,
    data: {
      protocol: 'lovetree.mvp.bridge',
      protocolVersion: 1,
      mvpId: 'MVP001',
      sourceId: 'SRC064',
      frameSessionId: firstSession,
      messageId: 'msg-old-frame',
      type: 'TREE_SELECTED',
      contextRevision: 1,
      payload: { treeId: 'hacked-tree' },
    },
  };

  const result = orchestrator.handleBridgeMessage(staleEvent);
  assert.equal(result.accepted, false);
  assert.equal(orchestrator.getContext().treeId, null);
  restore();
});

test('relationship query is ignored while relationship selection is default-deny', () => {
  const { orchestrator, restore } = createOrchestrator(
    '?step=relationships&tree=tree-1&relationship=edge-1',
  );

  assert.equal(orchestrator.getContext().treeId, 'tree-1');
  assert.equal(orchestrator.getContext().selectedRelationshipId, null);
  restore();
});

test('unmount removes the frame and only disposes a bridge-ready session', () => {
  const { orchestrator, restore } = createOrchestrator('?step=memory&tree=tree-1');
  const mount = orchestrator.mountFrame('memory', '/mvp/01/surfaces/src057/index.html');

  orchestrator.unmountFrame();
  assert.equal(mount.frame.removed, true);
  assert.equal(mount.frame.sent.length, 0);

  const second = orchestrator.mountFrame('memory', '/mvp/01/surfaces/src057/index.html');
  const ready = {
    protocol: 'lovetree.mvp.bridge',
    protocolVersion: 1,
    mvpId: 'MVP001',
    sourceId: 'SRC057',
    frameSessionId: second.sessionId,
    messageId: 'msg-ready',
    type: 'SOURCE_READY',
    contextRevision: orchestrator.contextRevision,
    payload: { capabilities: ['select-memory'], sourceRuntimeVersion: 'v1' },
  };
  orchestrator.handleBridgeMessage(eventFor(orchestrator, ready));
  const sentBeforeUnmount = second.frame.sent.length;
  orchestrator.unmountFrame();

  assert.ok(sentBeforeUnmount >= 1, 'SOURCE_INIT should be sent after SOURCE_READY');
  assert.ok(
    second.frame.sent.some(({ message: sent }) => sent.type === 'SOURCE_DISPOSE'),
    'bridge-ready frame should receive SOURCE_DISPOSE',
  );
  assert.equal(second.frame.removed, true);
  restore();
});

test('same-step popstate can reinitialize an already-ready active frame', () => {
  const { orchestrator, restore } = createOrchestrator('?step=memory&tree=tree-1&memory=memory-1');
  const mount = orchestrator.mountFrame('memory', '/mvp/01/surfaces/src057/index.html');

  const ready = {
    protocol: 'lovetree.mvp.bridge',
    protocolVersion: 1,
    mvpId: 'MVP001',
    sourceId: 'SRC057',
    frameSessionId: mount.sessionId,
    messageId: 'msg-ready',
    type: 'SOURCE_READY',
    contextRevision: orchestrator.contextRevision,
    payload: { capabilities: ['select-memory'], sourceRuntimeVersion: 'v1' },
  };
  orchestrator.handleBridgeMessage(eventFor(orchestrator, ready));
  const before = mount.frame.sent.filter(({ message: sent }) => sent.type === 'SOURCE_INIT').length;

  const nextUrl = new URL('http://localhost/mvp/01?step=memory&tree=tree-1&memory=memory-2');
  globalThis.window.location.href = nextUrl.href;
  globalThis.window.location.search = nextUrl.search;
  orchestrator.onPopState();

  assert.equal(orchestrator.reinitActiveFrame(), true);
  const after = mount.frame.sent.filter(({ message: sent }) => sent.type === 'SOURCE_INIT').length;
  assert.equal(after, before + 1);
  assert.equal(orchestrator.getContext().selectedMemoryId, 'memory-2');
  restore();
});
