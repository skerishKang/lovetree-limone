import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MVP001_BRIDGE_PROTOCOL,
  MVP001_BRIDGE_PROTOCOL_VERSION,
  MVP001_ID,
  MVP001_READ_ONLY_BRIDGE_TYPES,
  MVP001_SOURCE_BY_STEP,
  MVP001_SOURCE_IDS,
  createMvp001Context,
  parseMvp001UrlState,
  serializeMvp001UrlState,
  validateMvp001BridgeEnvelope,
  validateMvp001Context,
} from '../public/mvp/01/productization-contract.js';

const ACTIVE_SOURCE = 'SRC057';
const FRAME_SESSION = 'frame-123';
const EXPECTED_ORIGIN = 'https://lovetree.example';
const activeWindow = {};

function envelope(overrides = {}) {
  return {
    protocol: MVP001_BRIDGE_PROTOCOL,
    protocolVersion: MVP001_BRIDGE_PROTOCOL_VERSION,
    mvpId: MVP001_ID,
    sourceId: ACTIVE_SOURCE,
    frameSessionId: FRAME_SESSION,
    messageId: 'message-123',
    type: 'MEMORY_SELECTED',
    contextRevision: 7,
    payload: {
      memoryId: 'memory-123',
      selectionReason: 'user',
    },
    ...overrides,
  };
}

function expectations(overrides = {}) {
  return {
    activeSourceId: ACTIVE_SOURCE,
    frameSessionId: FRAME_SESSION,
    expectedOrigin: EXPECTED_ORIGIN,
    senderOrigin: EXPECTED_ORIGIN,
    activeFrameWindow: activeWindow,
    senderWindow: activeWindow,
    ...overrides,
  };
}

test('Slice A locks the five canonical step-to-Source identities', () => {
  assert.deepEqual(MVP001_SOURCE_BY_STEP, {
    entry: 'SRC064',
    board: 'SRC058',
    relationships: 'SRC056',
    memory: 'SRC057',
    explore: 'SRC060',
  });
  assert.deepEqual([...MVP001_SOURCE_IDS].sort(), ['SRC056', 'SRC057', 'SRC058', 'SRC060', 'SRC064']);
});

test('default semantic context is valid and contains no durable selection', () => {
  const context = createMvp001Context();
  assert.equal(validateMvp001Context(context).ok, true);
  assert.equal(context.currentStep, 'entry');
  assert.equal(context.treeId, null);
  assert.equal(context.selectedMemoryId, null);
  assert.equal(context.selectedRelationshipId, null);
  assert.deepEqual(context.viewer, { state: 'unknown', uid: null });
});

test('semantic context fails closed on orphan Memory/Relationship selections', () => {
  const memory = createMvp001Context({ selectedMemoryId: 'memory-1' });
  const relationship = createMvp001Context({ selectedRelationshipId: 'relationship-1' });
  assert.deepEqual(validateMvp001Context(memory), { ok: false, code: 'CONTEXT_ORPHAN_SELECTION' });
  assert.deepEqual(validateMvp001Context(relationship), { ok: false, code: 'CONTEXT_ORPHAN_SELECTION' });
});

test('URL parser restores canonical step/tree/memory/relationship state', () => {
  const context = parseMvp001UrlState('?step=explore&tree=tree-1&memory=memory-2&relationship=edge-3');
  assert.equal(context.currentStep, 'explore');
  assert.equal(context.treeId, 'tree-1');
  assert.equal(context.selectedMemoryId, 'memory-2');
  assert.equal(context.selectedRelationshipId, 'edge-3');
  assert.equal(context.navigationOrigin, 'url');
  assert.equal(validateMvp001Context(context).ok, true);
});

test('URL parser fails safe to entry and discards orphan/invalid IDs', () => {
  const orphan = parseMvp001UrlState('?step=unknown&memory=memory-2&relationship=edge-3');
  assert.equal(orphan.currentStep, 'entry');
  assert.equal(orphan.treeId, null);
  assert.equal(orphan.selectedMemoryId, null);
  assert.equal(orphan.selectedRelationshipId, null);

  const invalid = parseMvp001UrlState('?step=board&tree=bad%20tree&memory=memory-2');
  assert.equal(invalid.currentStep, 'board');
  assert.equal(invalid.treeId, null);
  assert.equal(invalid.selectedMemoryId, null);
});

test('URL serialization is deterministic and round-trips semantic identity', () => {
  const context = createMvp001Context({
    currentStep: 'relationships',
    treeId: 'tree-77',
    selectedMemoryId: 'memory-88',
    selectedRelationshipId: 'relationship-99',
  });
  const url = serializeMvp001UrlState(context);
  assert.equal(url, '/mvp/01?step=relationships&tree=tree-77&memory=memory-88&relationship=relationship-99');
  const restored = parseMvp001UrlState(url);
  assert.equal(restored.currentStep, context.currentStep);
  assert.equal(restored.treeId, context.treeId);
  assert.equal(restored.selectedMemoryId, context.selectedMemoryId);
  assert.equal(restored.selectedRelationshipId, context.selectedRelationshipId);
});

test('URL serialization never emits Memory/Relationship IDs without a valid Tree', () => {
  const url = serializeMvp001UrlState({
    currentStep: 'memory',
    treeId: null,
    selectedMemoryId: 'memory-1',
    selectedRelationshipId: 'edge-1',
  });
  assert.equal(url, '/mvp/01?step=memory');
});

test('valid active-frame MEMORY_SELECTED envelope passes all fail-closed bindings', () => {
  const result = validateMvp001BridgeEnvelope(envelope(), expectations());
  assert.equal(result.ok, true);
});

test('protocol/version/MVP mismatches are rejected', () => {
  assert.equal(validateMvp001BridgeEnvelope(envelope({ protocol: 'other' }), expectations()).code, 'PROTOCOL');
  assert.equal(validateMvp001BridgeEnvelope(envelope({ protocolVersion: 2 }), expectations()).code, 'PROTOCOL_VERSION');
  assert.equal(validateMvp001BridgeEnvelope(envelope({ mvpId: 'MVP999' }), expectations()).code, 'MVP_ID');
});

test('unknown Source and Source/type capability mismatch are rejected', () => {
  assert.equal(validateMvp001BridgeEnvelope(envelope({ sourceId: 'SRC999' }), expectations()).code, 'SOURCE_ID');
  const treeSelectionFromMemorySource = envelope({
    type: 'TREE_SELECTED',
    payload: { treeId: 'tree-1' },
  });
  assert.equal(validateMvp001BridgeEnvelope(treeSelectionFromMemorySource, expectations()).code, 'SOURCE_MESSAGE_TYPE');
});

test('wrong active Source and stale frame session are rejected', () => {
  assert.equal(validateMvp001BridgeEnvelope(envelope(), expectations({ activeSourceId: 'SRC058' })).code, 'ACTIVE_SOURCE');
  assert.equal(validateMvp001BridgeEnvelope(envelope({ frameSessionId: 'old-frame' }), expectations()).code, 'STALE_FRAME_SESSION');
});

test('sender origin and sender window must match the active frame', () => {
  assert.equal(validateMvp001BridgeEnvelope(envelope(), expectations({ senderOrigin: 'https://evil.example' })).code, 'ORIGIN');
  assert.equal(validateMvp001BridgeEnvelope(envelope(), expectations({ senderWindow: {} })).code, 'SENDER_WINDOW');
});

test('unknown/read-write message types fail closed in the read-only Slice A contract', () => {
  assert.equal(validateMvp001BridgeEnvelope(envelope({ type: 'TOTALLY_UNKNOWN', payload: {} }), expectations()).code, 'MESSAGE_TYPE');
  assert.equal(validateMvp001BridgeEnvelope(envelope({ type: 'UPDATE_MEMORY_REQUEST', payload: {} }), expectations()).code, 'MESSAGE_TYPE');
});

test('payload validators reject invalid enums, missing fields, and extra fields', () => {
  const badReason = envelope({ payload: { memoryId: 'memory-1', selectionReason: 'magic' } });
  const missing = envelope({ payload: { memoryId: 'memory-1' } });
  const extra = envelope({ payload: { memoryId: 'memory-1', selectionReason: 'user', surprise: true } });
  assert.equal(validateMvp001BridgeEnvelope(badReason, expectations()).code, 'PAYLOAD');
  assert.equal(validateMvp001BridgeEnvelope(missing, expectations()).code, 'PAYLOAD');
  assert.equal(validateMvp001BridgeEnvelope(extra, expectations()).code, 'PAYLOAD');
});

test('NAVIGATE only accepts the five authorized MVP001 targets', () => {
  const good = envelope({
    type: 'NAVIGATE',
    payload: { targetStep: 'explore', memoryId: 'memory-1', origin: 'SRC057.openExplore' },
  });
  const bad = envelope({
    type: 'NAVIGATE',
    payload: { targetStep: 'old-track-route', origin: 'SRC057.oldRoute' },
  });
  assert.equal(validateMvp001BridgeEnvelope(good, expectations()).ok, true);
  assert.equal(validateMvp001BridgeEnvelope(bad, expectations()).code, 'PAYLOAD');
});

test('RELATIONSHIP_SELECTED is default-denied until a canonical relationship authority is explicitly enabled', () => {
  const relationship = envelope({
    sourceId: 'SRC056',
    type: 'RELATIONSHIP_SELECTED',
    payload: {
      relationshipId: 'edge-1',
      fromMemoryId: 'memory-1',
      toMemoryId: 'memory-2',
    },
  });
  assert.equal(
    validateMvp001BridgeEnvelope(relationship, expectations({ activeSourceId: 'SRC056' })).code,
    'MESSAGE_TYPE',
  );
  const explicitlyEnabled = validateMvp001BridgeEnvelope(
    relationship,
    expectations({
      activeSourceId: 'SRC056',
      allowedTypes: [...MVP001_READ_ONLY_BRIDGE_TYPES, 'RELATIONSHIP_SELECTED'],
    }),
  );
  assert.equal(explicitlyEnabled.ok, true);
});

test('SOURCE_INIT requires a valid canonical context and explicit read/write permissions', () => {
  const init = envelope({
    type: 'SOURCE_INIT',
    payload: {
      context: createMvp001Context({ treeId: 'tree-1', currentStep: 'memory' }),
      projection: { selectedMemory: { id: 'memory-1' } },
      permissions: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    },
  });
  assert.equal(validateMvp001BridgeEnvelope(init, expectations()).ok, true);

  const badPermissions = structuredClone(init);
  delete badPermissions.payload.permissions.canDelete;
  assert.equal(validateMvp001BridgeEnvelope(badPermissions, expectations()).code, 'PAYLOAD');
});

test('bridge payloads reject bearer/database secrets and secret-bearing keys', () => {
  const tokenKey = envelope({
    type: 'SOURCE_READY',
    payload: { capabilities: ['select-memory'], sourceRuntimeVersion: 'v1', auth_token: 'abc' },
  });
  assert.equal(validateMvp001BridgeEnvelope(tokenKey, expectations()).code, 'PAYLOAD');

  const bearer = envelope({
    type: 'ERROR',
    payload: { code: 'READ_FAILED', recoverable: true, operation: 'Bearer abc.def.ghi' },
  });
  assert.equal(validateMvp001BridgeEnvelope(bearer, expectations()).code, 'SECRET_MATERIAL');

  const databaseUrl = envelope({
    type: 'SOURCE_INIT',
    payload: {
      context: createMvp001Context({ treeId: 'tree-1' }),
      projection: { debug: 'postgresql://user:pass@example/db' },
      permissions: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    },
  });
  assert.equal(validateMvp001BridgeEnvelope(databaseUrl, expectations()).code, 'SECRET_MATERIAL');
});

test('envelope schema rejects unexpected top-level fields', () => {
  assert.equal(validateMvp001BridgeEnvelope(envelope({ rawToken: 'nope' }), expectations()).code, 'ENVELOPE_SHAPE');
});
