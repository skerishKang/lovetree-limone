import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MVP001_SRC057_UPDATE_FIELDS,
  MVP001_EVENT_TYPES_BY_SOURCE,
  validateMvp001BridgeEnvelope,
} from '../public/mvp/01/productization-contract.js';

function envelope(overrides = {}) {
  return {
    protocol: 'lovetree.mvp.bridge',
    protocolVersion: 1,
    mvpId: 'MVP001',
    sourceId: 'SRC057',
    frameSessionId: 'frm-test-session-01',
    messageId: 'msg-01',
    type: 'UPDATE_MEMORY_REQUEST',
    contextRevision: 3,
    payload: {
      memoryId: 'alpha-m1',
      fields: { title: 'New Title' },
      writeOperationId: 'wop-01',
    },
    ...overrides,
  };
}

function expectations(overrides = {}) {
  return {
    activeSourceId: 'SRC057',
    frameSessionId: 'frm-test-session-01',
    expectedOrigin: 'https://example.com',
    senderOrigin: 'https://example.com',
    senderWindow: {},
    activeFrameWindow: {},
    allowedTypes: ['UPDATE_MEMORY_REQUEST'],
    ...overrides,
  };
}

function withSenderWindow() {
  const win = {};
  return expectations({ senderWindow: win, activeFrameWindow: win });
}

test('Slice J writable fields are exactly title,memo', () => {
  assert.deepEqual([...MVP001_SRC057_UPDATE_FIELDS].sort(), ['memo', 'title']);
});

test('SRC057 per-source allowlist includes UPDATE_MEMORY_REQUEST', () => {
  assert.ok(MVP001_EVENT_TYPES_BY_SOURCE.SRC057.includes('UPDATE_MEMORY_REQUEST'));
  for (const src of ['SRC064', 'SRC058', 'SRC056', 'SRC060']) {
    assert.ok(!MVP001_EVENT_TYPES_BY_SOURCE[src].includes('UPDATE_MEMORY_REQUEST'));
  }
});

test('happy UPDATE_MEMORY_REQUEST with title only passes', () => {
  const result = validateMvp001BridgeEnvelope(envelope(), withSenderWindow());
  assert.equal(result.ok, true);
});

test('happy UPDATE_MEMORY_REQUEST with memo only passes', () => {
  const msg = envelope({ payload: { memoryId: 'alpha-m1', fields: { memo: 'note' }, writeOperationId: 'wop-02' } });
  assert.equal(validateMvp001BridgeEnvelope(msg, withSenderWindow()).ok, true);
});

test('happy UPDATE_MEMORY_REQUEST with title+memo passes', () => {
  const msg = envelope({ payload: { memoryId: 'alpha-m1', fields: { title: 'T', memo: 'M' }, writeOperationId: 'wop-03' } });
  assert.equal(validateMvp001BridgeEnvelope(msg, withSenderWindow()).ok, true);
});

test('visibility field rejected (HOLD)', () => {
  const msg = envelope({ payload: { memoryId: 'alpha-m1', fields: { visibility: 'public' }, writeOperationId: 'wop-04' } });
  assert.equal(validateMvp001BridgeEnvelope(msg, withSenderWindow()).code, 'PAYLOAD');
});

test('parentId field rejected (relationship HOLD)', () => {
  const msg = envelope({ payload: { memoryId: 'alpha-m1', fields: { parentId: 'alpha-m2' }, writeOperationId: 'wop-05' } });
  assert.equal(validateMvp001BridgeEnvelope(msg, withSenderWindow()).code, 'PAYLOAD');
});

test('connectionReason rejected (relationship HOLD)', () => {
  const msg = envelope({ payload: { memoryId: 'alpha-m1', fields: { connectionReason: 'x' }, writeOperationId: 'wop-06' } });
  assert.equal(validateMvp001BridgeEnvelope(msg, withSenderWindow()).code, 'PAYLOAD');
});

test('media fields rejected (media HOLD)', () => {
  for (const field of ['sourceUrl', 'thumbnail', 'sourceType', 'videoOffsetSeconds', 'channelName']) {
    const msg = envelope({ payload: { memoryId: 'alpha-m1', fields: { [field]: 'x' }, writeOperationId: `wop-${field}` } });
    assert.equal(validateMvp001BridgeEnvelope(msg, withSenderWindow()).code, 'PAYLOAD');
  }
});

test('emotionTags rejected (HOLD)', () => {
  const msg = envelope({ payload: { memoryId: 'alpha-m1', fields: { emotionTags: ['calm'] }, writeOperationId: 'wop-07' } });
  assert.equal(validateMvp001BridgeEnvelope(msg, withSenderWindow()).code, 'PAYLOAD');
});

test('empty fields rejected', () => {
  const msg = envelope({ payload: { memoryId: 'alpha-m1', fields: {}, writeOperationId: 'wop-08' } });
  assert.equal(validateMvp001BridgeEnvelope(msg, withSenderWindow()).code, 'PAYLOAD');
});

test('empty title rejected', () => {
  const msg = envelope({ payload: { memoryId: 'alpha-m1', fields: { title: '   ' }, writeOperationId: 'wop-09' } });
  assert.equal(validateMvp001BridgeEnvelope(msg, withSenderWindow()).code, 'PAYLOAD');
});

test('overlong title rejected', () => {
  const msg = envelope({ payload: { memoryId: 'alpha-m1', fields: { title: 'x'.repeat(121) }, writeOperationId: 'wop-10' } });
  assert.equal(validateMvp001BridgeEnvelope(msg, withSenderWindow()).code, 'PAYLOAD');
});

test('missing writeOperationId rejected', () => {
  const msg = envelope({ payload: { memoryId: 'alpha-m1', fields: { title: 'T' } } });
  assert.equal(validateMvp001BridgeEnvelope(msg, withSenderWindow()).code, 'PAYLOAD');
});

test('secret material in payload rejected', () => {
  const msg = envelope({ payload: { memoryId: 'alpha-m1', fields: { title: 'Bearer abc' }, writeOperationId: 'wop-11', token: 'x' } });
  assert.equal(validateMvp001BridgeEnvelope(msg, withSenderWindow()).code, 'PAYLOAD');
});

test('default read-only expectations still reject UPDATE (MESSAGE_TYPE)', () => {
  const msg = envelope();
  const exp = {
    activeSourceId: 'SRC057',
    frameSessionId: 'frm-test-session-01',
    expectedOrigin: 'https://example.com',
    senderOrigin: 'https://example.com',
    senderWindow: {},
    activeFrameWindow: {},
  };
  exp.senderWindow = exp.activeFrameWindow = {};
  const win = {};
  exp.senderWindow = win;
  exp.activeFrameWindow = win;
  assert.equal(validateMvp001BridgeEnvelope(msg, exp).code, 'MESSAGE_TYPE');
});
