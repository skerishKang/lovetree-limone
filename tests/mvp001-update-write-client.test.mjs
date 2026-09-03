import assert from 'node:assert/strict';
import test from 'node:test';
import { createMvp001UpdateClient } from '../public/mvp/01/write-client.js';

function jsonResponse(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

test('Bearer attached via exact auth seam value', async () => {
  let seenAuth = null;
  const fetchImpl = async (url, init) => {
    seenAuth = init.headers.Authorization;
    assert.equal(url, '/api/memories/alpha-m1');
    assert.equal(init.method, 'PUT');
    assert.deepEqual(JSON.parse(init.body), { title: 'T' });
    return jsonResponse({ id: 'alpha-m1', title: 'T' });
  };
  const client = createMvp001UpdateClient({ fetchImpl, getAccessToken: async () => 'tok-123' });
  const out = await client.updateMemory('alpha-m1', { title: 'T' });
  assert.equal(out.id, 'alpha-m1');
  assert.equal(seenAuth, 'Bearer tok-123');
});

test('field whitelist rejects visibility/media/relationship', async () => {
  const client = createMvp001UpdateClient({ fetchImpl: async () => jsonResponse({}) });
  for (const fields of [
    { visibility: 'public' },
    { parentId: 'x' },
    { connectionReason: 'x' },
    { sourceUrl: 'https://example.com' },
    { thumbnail: 'https://example.com/a.jpg' },
    { emotionTags: ['calm'] },
    {},
  ]) {
    await assert.rejects(() => client.updateMemory('alpha-m1', fields), TypeError);
  }
});

test('401 refresh-once then success performs exactly 2 PUTs', async () => {
  let calls = 0;
  const tokens = [];
  const fetchImpl = async (url, init) => {
    calls += 1;
    tokens.push(init.headers.Authorization);
    if (calls === 1) return jsonResponse({ error: 'x' }, 401);
    return jsonResponse({ id: 'alpha-m1', title: 'T2' });
  };
  let tokenCalls = 0;
  const getAccessToken = async () => {
    tokenCalls += 1;
    return tokenCalls === 1 ? 'old' : 'fresh';
  };
  const client = createMvp001UpdateClient({ fetchImpl, getAccessToken });
  const out = await client.updateMemory('alpha-m1', { title: 'T2' });
  assert.equal(out.title, 'T2');
  assert.equal(calls, 2);
  assert.deepEqual(tokens, ['Bearer old', 'Bearer fresh']);
});

test('401 twice maps to UNAUTHORIZED with exactly 2 PUTs (no blind loop)', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return jsonResponse({ error: 'x' }, 401);
  };
  const client = createMvp001UpdateClient({ fetchImpl, getAccessToken: async () => 't' });
  const err = await client.updateMemory('alpha-m1', { title: 'T' }).then(() => null, (e) => e);
  assert.equal(err.code, 'UNAUTHORIZED');
  assert.equal(calls, 2);
});

test('400/404/503/5xx/network map without retry', async () => {
  const cases = [
    [400, 'VALIDATION'],
    [404, 'NOT_FOUND'],
    [503, 'DISABLED'],
    [500, 'SERVER'],
  ];
  for (const [status, code] of cases) {
    let calls = 0;
    const client = createMvp001UpdateClient({
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse({ error: 'x' }, status);
      },
    });
    const err = await client.updateMemory('alpha-m1', { memo: 'm' }).then(() => null, (e) => e);
    assert.equal(err.code, code);
    assert.equal(calls, 1);
  }
  let netCalls = 0;
  const netClient = createMvp001UpdateClient({
    fetchImpl: async () => {
      netCalls += 1;
      throw new TypeError('down');
    },
  });
  const netErr = await netClient.updateMemory('alpha-m1', { memo: 'm' }).then(() => null, (e) => e);
  assert.equal(netErr.code, 'NETWORK');
  assert.equal(netCalls, 1);
});
