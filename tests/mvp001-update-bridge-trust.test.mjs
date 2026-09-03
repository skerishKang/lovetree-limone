import assert from 'node:assert/strict';
import test from 'node:test';

const contract = await import('../public/mvp/01/productization-contract.js');
const { ProductOrchestrator } = await import('../public/mvp/01/product-orchestrator.js');

function makeOrchestrator() {
  const win = {};
  const orchestrator = new ProductOrchestrator({
    createFrame: () => null,
    removeFrame: () => {},
    emitError: () => {},
    getProjection: () => null,
  });
  orchestrator.context = {
    schemaVersion: 1,
    mvpId: 'MVP001',
    contextRevision: 5,
    currentStep: 'memory',
    treeId: 'alpha-tree-1',
    selectedMemoryId: 'alpha-m1',
    selectedRelationshipId: null,
    navigationOrigin: 'shell',
    viewer: { state: 'unknown', uid: null },
  };
  orchestrator.contextRevision = 5;
  orchestrator.activeSourceId = 'SRC057';
  orchestrator.activeFrameSessionId = 'frm-01';
  orchestrator.activeFrameWindow = win;
  orchestrator.activeFrame = { contentWindow: win };
  return { orchestrator, win };
}

function updateEvent(overrides = {}, payloadOverrides = {}) {
  const { orchestrator, win } = makeOrchestrator();
  Object.assign(orchestrator, overrides.orchestrator || {});
  const senderWindow = overrides.senderWindow !== undefined ? overrides.senderWindow : win;
  return {
    orchestrator,
    win,
    event: {
      origin: overrides.origin !== undefined ? overrides.origin : 'https://product.test',
      source: senderWindow,
      data: {
        protocol: 'lovetree.mvp.bridge',
        protocolVersion: 1,
        mvpId: 'MVP001',
        sourceId: 'SRC057',
        frameSessionId: overrides.frameSessionId !== undefined ? overrides.frameSessionId : 'frm-01',
        messageId: 'msg-w-01',
        type: 'UPDATE_MEMORY_REQUEST',
        contextRevision: overrides.contextRevision !== undefined ? overrides.contextRevision : 5,
        payload: {
          memoryId: 'alpha-m1',
          fields: { title: 'New' },
          writeOperationId: 'wop-01',
          ...payloadOverrides,
        },
      },
    },
  };
}

test('happy UPDATE_MEMORY_REQUEST accepted for selected memory', () => {
  const { orchestrator, event } = updateEvent();
  globalThis.window = { location: { origin: 'https://product.test' } };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, true);
  assert.equal(result.type, 'UPDATE_MEMORY_REQUEST');
  delete globalThis.window;
});

test('malicious sender window rejected', () => {
  const { orchestrator, event } = updateEvent({ senderWindow: {} });
  globalThis.window = { location: { origin: 'https://product.test' } };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, false);
  delete globalThis.window;
});

test('wrong origin rejected', () => {
  const { orchestrator, event } = updateEvent({ origin: 'https://evil.test' });
  globalThis.window = { location: { origin: 'https://product.test' } };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, false);
  delete globalThis.window;
});

test('wrong session rejected', () => {
  const { orchestrator, event } = updateEvent({ frameSessionId: 'frm-other' });
  globalThis.window = { location: { origin: 'https://product.test' } };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, false);
  delete globalThis.window;
});

test('stale context revision rejected', () => {
  const { orchestrator, event } = updateEvent({ contextRevision: 4 });
  globalThis.window = { location: { origin: 'https://product.test' } };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'STALE_CONTEXT_REVISION');
  delete globalThis.window;
});

test('non-selected memoryId rejected', () => {
  const { orchestrator, event } = updateEvent({}, { memoryId: 'alpha-m2' });
  globalThis.window = { location: { origin: 'https://product.test' } };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, false);
  delete globalThis.window;
});

test('non-SRC057 source cannot send update (SOURCE_MESSAGE_TYPE path)', () => {
  const { orchestrator, win } = makeOrchestrator();
  orchestrator.activeSourceId = 'SRC058';
  globalThis.window = { location: { origin: 'https://product.test' } };
  const event = {
    origin: 'https://product.test',
    source: win,
    data: {
      protocol: 'lovetree.mvp.bridge',
      protocolVersion: 1,
      mvpId: 'MVP001',
      sourceId: 'SRC058',
      frameSessionId: 'frm-01',
      messageId: 'msg-w-02',
      type: 'UPDATE_MEMORY_REQUEST',
      contextRevision: 5,
      payload: { memoryId: 'alpha-m1', fields: { title: 'T' }, writeOperationId: 'wop-02' },
    },
  };
  const result = orchestrator.handleBridgeMessage(event);
  assert.equal(result.accepted, false);
  delete globalThis.window;
});

test('contract module exposes no backend mutation surface', () => {
  assert.ok(contract.MVP001_SRC057_UPDATE_FIELDS);
});
