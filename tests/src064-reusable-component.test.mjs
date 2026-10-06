import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import {
  projectSrc064Presentation,
  projectMemoryToSrc064Card as canonCard,
  getSrc064Slot as canonSlot,
} from '../src/06_components/SRC064/adapter.js';
import { SRC064_NATIVE_SLOTS as canonSlots } from '../src/06_components/SRC064/slots.js';
import { projectMvp001ContextToSrc064 } from '../public/mvp/01/src064-adapter.js';
import { SRC064_NATIVE_SLOTS as mvpSlots } from '../public/mvp/01/src064-slots.js';

// Bridge is a classic-script dual-export module: importing it installs
// LTV_SRC064_BRIDGE on the global object (window in the browser).
import '../src/06_components/SRC064/bridge.js';
const bridge = globalThis.LTV_SRC064_BRIDGE;

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)));
const CANON_FILES = ['slots.js', 'adapter.js', 'bridge.js'].map(
  (f) => join(ROOT, '..', 'src/06_components/SRC064', f),
);
const BASE_MAIN = '45d5ca3bec9fb9267afbd8579033c7071db12fba';
const PROTECTED_PATHS = ['src/03_sources', 'public/mvp/01', 'app/v4'];
const CONSUMER = 'CONSUMER-X';
const SESSION = 'sess-1';
const ORIGIN = 'http://trusted.example';

function makeTree(overrides = {}) {
  return { id: 'tree-1', title: 'Tree Title', visibility: 'public', ...overrides };
}

function makeMemory(overrides = {}) {
  return {
    id: 'mem-1',
    treeId: 'tree-1',
    title: 'Title',
    sourceUrl: 'https://example.com/page',
    thumbnail: 'https://example.com/thumb.jpg',
    timestamp: '2026-01-01T00:00:00Z',
    sourceType: 'image',
    ...overrides,
  };
}

function bothThrow(fn, code) {
  const results = [];
  for (const impl of [projectSrc064Presentation, projectMvp001ContextToSrc064]) {
    try {
      impl(fn);
      results.push({ thrown: false });
    } catch (e) {
      results.push({ thrown: true, name: e.name, code: e.code });
    }
  }
  assert.ok(results.every((r) => r.thrown), 'both adapters must fail closed');
  assert.equal(results[1].name, results[0].name);
  assert.equal(results[1].code, results[0].code);
  assert.equal(results[0].code, code);
}

// ---------------------------------------------------------------------------
// A. slots byte exact + table identity
// ---------------------------------------------------------------------------
test('A1. canonical slots.js bytes equal existing MVP001 slots bytes exactly', () => {
  const canon = readFileSync(join(ROOT, '..', 'src/06_components/SRC064/slots.js'));
  const mvp = readFileSync(join(ROOT, '..', 'public/mvp/01/src064-slots.js'));
  assert.equal(Buffer.compare(canon, mvp), 0, 'slot table must be a byte-exact REUSE_EXACT copy');
});

test('A2. canonical slot table is the frozen 40 native slots', () => {
  assert.equal(canonSlots.length, 40);
  assert.deepStrictEqual(canonSlots, mvpSlots);
  assert.deepStrictEqual(canonSlot(0), mvpSlots[0]);
  assert.equal(canonSlot(0).first, true);
});

// ---------------------------------------------------------------------------
// B. adapter equivalence: canonical output deep-equals existing MVP001 output
// ---------------------------------------------------------------------------
test('B1. empty context projects identically', () => {
  const fx = { tree: makeTree(), memories: [], selectedMemory: null };
  assert.deepStrictEqual(projectSrc064Presentation(fx), projectMvp001ContextToSrc064(fx));
});

test('B2. normal context projects identically', () => {
  const memories = [
    makeMemory({ id: 'mem-1', sourceType: 'youtube' }),
    makeMemory({ id: 'mem-2', sourceType: 'video', emotionTags: ['감사'] }),
    makeMemory({ id: 'mem-3', sourceType: 'memo', memo: 'handwritten note' }),
  ];
  const fx = { tree: makeTree(), memories, selectedMemory: null };
  assert.deepStrictEqual(projectSrc064Presentation(fx), projectMvp001ContextToSrc064(fx));
});

test('B3. capacity-40 context projects identically (41+ capped, no leak)', () => {
  const memories = Array.from({ length: 45 }, (_, i) => makeMemory({ id: `mem-${i + 1}`, treeId: 'tree-1' }));
  const fx = { tree: makeTree(), memories, selectedMemory: null };
  const out = projectSrc064Presentation(fx);
  assert.deepStrictEqual(out, projectMvp001ContextToSrc064(fx));
  assert.equal(out.cards.length, 40);
  assert.ok(!out.cards.some((c) => c.id === 'mem-45'), 'no leak past the 40-cap');
});

test('B4. invalid identity fails closed identically', () => {
  bothThrow({ tree: makeTree(), memories: [makeMemory({ id: '' })], selectedMemory: null }, 'INVALID_IDENTITY');
  bothThrow({ tree: { id: '', memories: [] }, memories: [], selectedMemory: null }, 'INVALID_IDENTITY');
  bothThrow({ tree: makeTree(), memories: [makeMemory({ id: 'mem-1', title: 42 })], selectedMemory: null }, 'INVALID_RESPONSE');
  bothThrow({ tree: makeTree(), memories: 'not-an-array', selectedMemory: null }, 'INVALID_RESPONSE');
});

test('B5. selected memory in list projects identically', () => {
  const memories = [makeMemory({ id: 'mem-1' }), makeMemory({ id: 'mem-2' })];
  const fx = { tree: makeTree(), memories, selectedMemory: memories[1] };
  const out = projectSrc064Presentation(fx);
  assert.deepStrictEqual(out, projectMvp001ContextToSrc064(fx));
  assert.equal(out.selectedCardId, 'mem-2');
  assert.equal(out.selectedCard, out.cards[1]);
});

test('B6. selected memory outside list projects identically (standalone, first=false)', () => {
  const memories = [makeMemory({ id: 'mem-1' })];
  const fx = { tree: makeTree(), memories, selectedMemory: makeMemory({ id: 'mem-99' }) };
  const out = projectSrc064Presentation(fx);
  assert.deepStrictEqual(out, projectMvp001ContextToSrc064(fx));
  assert.equal(out.selectedCardId, 'mem-99');
  assert.ok(!out.cards.some((c) => c.id === 'mem-99'), 'unlisted memory stays absent from cards');
  assert.equal(out.selectedCard.first, false, 'standalone selection must not become FIRST MOMENT');
});

test('B7. tree mismatch fails closed identically', () => {
  const fx = {
    tree: makeTree(),
    memories: [makeMemory({ id: 'mem-1' })],
    selectedMemory: makeMemory({ id: 'mem-9', treeId: 'tree-other' }),
  };
  bothThrow(fx, 'SELECTED_MEMORY_TREE_MISMATCH');
});

// ---------------------------------------------------------------------------
// C. bridge behavior
// ---------------------------------------------------------------------------
function makeEnv() {
  const posted = [];
  const parent = {
    postMessage(data, origin) {
      posted.push({ data, origin });
    },
  };
  const fixtureCards = [{ el: true, removed: false, remove() { this.removed = true; } }];
  const storyBook = { style: {} };
  const inertEls = [{ style: {} }, { style: {} }, { style: {} }];
  const doc = {
    getElementById(id) {
      if (id === 'world') {
        return {
          querySelectorAll(sel) {
            return sel === '.card' ? fixtureCards : [];
          },
        };
      }
      if (id === 'storyBook') return storyBook;
      return null;
    },
    querySelectorAll(sel) {
      return sel === '[data-menu="book"],[data-menu="tree"],[data-action="tree"]' ? inertEls : [];
    },
  };
  const track = {
    rebuildCalls: [],
    focusCalls: [],
    rebuild(list) {
      this.rebuildCalls.push(list);
    },
    focus(id) {
      this.focusCalls.push(id);
    },
    getCards() {
      return this.rebuildCalls.length ? this.rebuildCalls[this.rebuildCalls.length - 1].map((c) => ({ id: c.id })) : [];
    },
  };
  let listener = null;
  const window = {
    __TRACK64__: track,
    document: doc,   // host-window shape: real consumers resolve doc via win.document
    parent,         // host-window shape: real consumers resolve parent via win.parent
    addEventListener(type, fn) {
      if (type === 'message') listener = fn;
    },
    removeEventListener(type, fn) {
      if (type === 'message' && listener === fn) listener = null;
    },
  };
  const handle = {
    posted,
    fixtureCards,
    storyBook,
    inertEls,
    track,
    environment: { window, document: doc, parent },
    send(envelope, overrides = {}) {
      if (!listener) throw new Error('message listener not installed');
      listener({
        source: overrides.source ?? parent,
        origin: overrides.origin ?? ORIGIN,
        data: envelope(overrides),
      });
    },
    isListening() {
      return listener !== null;
    },
  };
  return handle;
}

function control(type, revision = 0, payload) {
  return (overrides = {}) => ({
    protocol: overrides.protocol ?? 'lovetree.mvp.bridge',
    protocolVersion: overrides.protocolVersion ?? 1,
    mvpId: overrides.consumer ?? CONSUMER,
    sourceId: overrides.sourceId ?? 'SRC064',
    frameSessionId: overrides.session ?? SESSION,
    messageId: 'm-1',
    type,
    contextRevision: revision,
    payload,
  });
}

function bootstrap(handle) {
  return bridge.bootstrap({
    consumerId: CONSUMER,
    sessionId: SESSION,
    allowedOrigin: ORIGIN,
    environment: handle.environment,
  });
}

function initPayload() {
  return {
    context: { treeId: 'tree-1', selectedMemoryId: 'mem-2' },
    projection: {
      cards: [
        { id: 'mem-1', type: 'photo', mediaType: 'photo', title: 'A', image: 'a.jpg' },
        { id: 'mem-2', type: 'video', mediaType: 'video', title: 'B', image: 'b.jpg' },
      ],
    },
    permissions: { canRead: true, canWrite: false },
  };
}

test('C1. bootstrap posts SOURCE_READY and fail-closes standalone', () => {
  const h = makeEnv();
  const api = bootstrap(h);
  assert.ok(api, 'valid config bootstraps');
  const ready = h.posted.find((p) => p.data.type === 'SOURCE_READY');
  assert.ok(ready, 'SOURCE_READY posted');
  assert.deepStrictEqual(ready.data.payload.capabilities, ['hydrate', 'select']);
  assert.equal(ready.data.mvpId, CONSUMER, 'consumerId maps to wire mvpId');
  assert.equal(ready.data.frameSessionId, SESSION, 'sessionId maps to wire frameSessionId');
  assert.equal(ready.data.protocol, 'lovetree.mvp.bridge');
  assert.equal(ready.data.protocolVersion, 1);
  assert.equal(ready.data.sourceId, 'SRC064');
  assert.equal(ready.origin, ORIGIN, 'messages target the exact allowed origin');
});

test('C2. valid INIT hydrates via track.rebuild and focuses the selected memory', () => {
  const h = makeEnv();
  const api = bootstrap(h);
  h.send(control('SOURCE_INIT', 3, initPayload()));
  assert.equal(h.track.rebuildCalls.length, 1, 'rebuild invoked once');
  const list = h.track.rebuildCalls[0];
  assert.deepEqual(list.map((c) => c.id), ['mem-1', 'mem-2']);
  assert.equal(list[0].title, 'A', 'card fields mapped from projection');
  assert.equal(list[1].type, 'video');
  assert.deepEqual(h.track.focusCalls, ['mem-2'], 'selected memory in list focused');
  assert.ok(h.fixtureCards.every((c) => c.removed), 'fixture cards neutralized pre-paint');
  assert.equal(h.storyBook.style.display, 'none', 'Story Book control hidden');
  assert.ok(h.inertEls.every((el) => el.style.display === 'none'), 'inert menu/action controls hidden');
  assert.equal(api.diagnostics.initCount, 1);
});

test('C3. selected memory outside the list does not focus', () => {
  const h = makeEnv();
  bootstrap(h);
  const payload = initPayload();
  payload.context.selectedMemoryId = 'mem-99';
  h.send(control('SOURCE_INIT', 1, payload));
  assert.equal(h.track.rebuildCalls.length, 1);
  assert.deepEqual(h.track.focusCalls, [], 'out-of-list selection is never focused');
});

test('C4. selection seam emits the neutral MEMORY_SELECTED envelope', () => {
  const h = makeEnv();
  bootstrap(h);
  const win = h.environment.window;
  win.__TRACK64_SELECT__('mem-2');
  const sel = h.posted.find((p) => p.data.type === 'MEMORY_SELECTED');
  assert.ok(sel, 'MEMORY_SELECTED posted through the seam');
  assert.equal(sel.data.mvpId, CONSUMER);
  assert.equal(sel.data.frameSessionId, SESSION);
  assert.equal(sel.data.sourceId, 'SRC064');
  assert.deepEqual(sel.data.payload, { memoryId: 'mem-2', selectionReason: 'user' });
  const before = h.posted.length;
  win.__TRACK64_SELECT__(null);
  assert.equal(h.posted.length, before, 'empty selection id emits nothing');
});

function expectRejected(h, overrides, revision = 0) {
  const rebuilds = h.track.rebuildCalls.length;
  h.send(control('SOURCE_INIT', revision, initPayload()), overrides);
  assert.equal(h.track.rebuildCalls.length, rebuilds, `rejected by ${JSON.stringify(overrides)}`);
}

test('C5. trust matrix: wrong parent/origin/consumer/session/source/protocol/version rejected', () => {
  const h = makeEnv();
  bootstrap(h);
  expectRejected(h, { source: {} }, 0);
  expectRejected(h, { origin: 'http://evil.example' }, 0);
  expectRejected(h, { consumer: 'OTHER-CONSUMER' }, 0);
  expectRejected(h, { session: 'other-session' }, 0);
  expectRejected(h, { sourceId: 'SRC058' }, 0);
  expectRejected(h, { protocol: 'lovetree.other.bridge' }, 0);
  expectRejected(h, { protocolVersion: 2 }, 0);
});

test('C6. stale context revision rejected; same-revision re-INIT allowed', () => {
  const h = makeEnv();
  bootstrap(h);
  h.send(control('SOURCE_INIT', 3, initPayload()));
  const after3 = h.track.rebuildCalls.length;
  h.send(control('SOURCE_INIT', 2, initPayload()));
  assert.equal(h.track.rebuildCalls.length, after3, 'older revision must not overwrite a newer one');
  h.send(control('SOURCE_INIT', 3, initPayload()));
  assert.equal(h.track.rebuildCalls.length, after3 + 1, 'same-revision re-INIT stays allowed');
});

test('C7. canRead !== true fails closed (counted, not hydrated)', () => {
  const h = makeEnv();
  const api = bootstrap(h);
  const payload = initPayload();
  payload.permissions = { canRead: false };
  h.send(control('SOURCE_INIT', 1, payload));
  assert.equal(h.track.rebuildCalls.length, 0, 'no hydration without canRead:true');
  assert.equal(api.diagnostics.initCount, 1, 'validated canRead:false INIT is counted');
  assert.equal(api.diagnostics.lastInitCanRead, false);
});

test('C8. trusted DISPOSE tears down; untrusted DISPOSE does not', () => {
  const h = makeEnv();
  const api = bootstrap(h);
  assert.ok(h.isListening());
  h.send(control('SOURCE_DISPOSE', 0));
  assert.ok(!h.isListening(), 'trusted DISPOSE removes the listener');

  const h2 = makeEnv();
  bootstrap(h2);
  h2.send(control('SOURCE_DISPOSE', 0), { source: {} });
  assert.ok(h2.isListening(), 'untrusted DISPOSE must not tear down');
  api.dispose();
  assert.ok(!h.isListening(), 'public dispose() removes the listener');
});

test('C9. no config / invalid config / missing hook fail closed with zero behavior mutation', () => {
  const h = makeEnv();
  assert.equal(bridge.bootstrap(null), null);
  assert.equal(bridge.bootstrap({}), null);
  assert.equal(bridge.bootstrap({ consumerId: CONSUMER }), null);
  assert.equal(bridge.bootstrap({ consumerId: '', sessionId: SESSION, allowedOrigin: ORIGIN }), null);
  assert.equal(h.posted.length, 0, 'no messages without a valid config');
  assert.ok(!h.isListening(), 'no listener installed without a valid config');
  assert.ok(h.fixtureCards.every((c) => !c.removed), 'fixture cards untouched without a valid config');
  assert.equal(h.environment.window.__TRACK64_SELECT__, undefined, 'seam not installed without a valid config');

  const noHook = makeEnv();
  delete noHook.environment.window.__TRACK64__;
  assert.equal(bridge.bootstrap({ consumerId: CONSUMER, sessionId: SESSION, allowedOrigin: ORIGIN, environment: noHook.environment }), null);
});

test('C10. bridge protocol constants are fixed, not caller-configurable', () => {
  assert.equal(bridge.PROTOCOL, 'lovetree.mvp.bridge');
  assert.equal(bridge.PROTOCOL_VERSION, 1);
  assert.equal(bridge.SOURCE_ID, 'SRC064');
});

test('C11. browser-default path: bootstrap works with NO environment argument against host globals', () => {
  const h = makeEnv();
  // Browser-like global: the host window/document/parent live on the global
  // object; no `environment` is injected (BLOCKER 2).
  globalThis.window = h.environment.window;
  try {
    const api = bridge.bootstrap({ consumerId: CONSUMER, sessionId: SESSION, allowedOrigin: ORIGIN });
    assert.ok(api, 'bootstrap must succeed with no environment argument in a browser-like global');
    const ready = h.posted.find((p) => p.data.type === 'SOURCE_READY');
    assert.ok(ready, 'SOURCE_READY posted via the browser default path');
    assert.equal(ready.origin, ORIGIN, 'postMessage targets the exact allowed origin');
    assert.ok(h.isListening(), 'message listener installed on the host window');
    h.send(control('SOURCE_INIT', 1, initPayload()));
    assert.equal(h.track.rebuildCalls.length, 1, 'track.rebuild hydrated via browser default path');
    assert.deepEqual(h.track.focusCalls, ['mem-2'], 'selected memory focused via browser default path');

    // Fail-closed still holds on the browser default path:
    assert.equal(bridge.bootstrap({ consumerId: CONSUMER }), null, 'invalid config rejected');
    assert.equal(bridge.bootstrap(null), null, 'no config rejected');
    const noHook = makeEnv();
    globalThis.window = noHook.environment.window;
    delete globalThis.window.__TRACK64__;
    assert.equal(
      bridge.bootstrap({ consumerId: CONSUMER, sessionId: SESSION, allowedOrigin: ORIGIN }),
      null,
      'missing runtime hook fails closed on the browser default path',
    );
    assert.equal(noHook.posted.length, 0, 'no messages without a runtime hook');
    assert.ok(!noHook.isListening(), 'no listener without a runtime hook');
  } finally {
    delete globalThis.window;
  }
});

test('C12. exact-origin contract: wildcard/path/javascript/invalid rejected; trailing slash normalized', () => {
  const rejected = [
    '*',
    '',
    'https://example.com/path',
    'https://example.com/path?x=1',
    'https://example.com/path#frag',
    'https://example.com/?x=1',
    'javascript:alert(1)',
    'not a url',
    'ftp://example.com',
    'http://user:pass@example.com',
    'https://example.com:443',
    42,
    null,
  ];
  for (const origin of rejected) {
    const h = makeEnv();
    const api = bridge.bootstrap({ consumerId: CONSUMER, sessionId: SESSION, allowedOrigin: origin, environment: h.environment });
    assert.equal(api, null, `allowedOrigin=${JSON.stringify(origin)} must fail closed`);
    assert.equal(h.posted.length, 0, `allowedOrigin=${JSON.stringify(origin)} must emit zero messages`);
    assert.ok(!h.isListening(), `allowedOrigin=${JSON.stringify(origin)} must not install a listener`);
  }

  // Bare trailing slash normalizes to the origin form and still exact-matches
  // event.origin (which never carries a slash).
  const h = makeEnv();
  const api = bridge.bootstrap({ consumerId: CONSUMER, sessionId: SESSION, allowedOrigin: `${ORIGIN}/`, environment: h.environment });
  assert.ok(api, 'bare trailing slash is normalized, not rejected');
  const ready = h.posted.find((p) => p.data.type === 'SOURCE_READY');
  assert.equal(ready.origin, ORIGIN, 'postMessage targetOrigin is the normalized origin');
  h.send(control('SOURCE_INIT', 1, initPayload()));
  assert.equal(h.track.rebuildCalls.length, 1, 'event.origin exact-match after normalization');
  h.send(control('SOURCE_INIT', 2, initPayload()), { origin: 'http://evil.example' });
  assert.equal(h.track.rebuildCalls.length, 1, 'a different origin is still rejected');
});

// ---------------------------------------------------------------------------
// D. negative capabilities: no fetch / write / auth / backend path
// ---------------------------------------------------------------------------
test('D1. canonical modules carry no network/write/auth/backend surface', () => {
  const sources = CANON_FILES.map((f) => readFileSync(f, 'utf8'));
  const banned = [/\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /localStorage/, /sessionStorage/, /document\.cookie/, /navigator\.]/, /Firebase/, /firebase/, /Supabase/];
  for (const src of sources) {
    for (const re of banned) {
      assert.ok(!re.test(src), `banned pattern ${re} found in canonical module`);
    }
  }
  // The bridge never reads URL query parameters.
  const bridgeSrc = readFileSync(join(ROOT, '..', 'src/06_components/SRC064/bridge.js'), 'utf8');
  assert.ok(!/URLSearchParams|location\.search/.test(bridgeSrc), 'bridge must not parse URL query params');
});

// ---------------------------------------------------------------------------
// E. consumer neutrality: zero MVP001 / mvpSession / mvpSource dependency
// ---------------------------------------------------------------------------
test('E1. canonical modules contain no consumer-specific hard dependency', () => {
  for (const f of CANON_FILES) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/MVP001/.test(src), `${f} must not hard-depend on MVP001`);
    assert.ok(!/mvpSession/.test(src), `${f} must not parse mvpSession`);
    assert.ok(!/mvpSource/.test(src), `${f} must not parse mvpSource`);
  }
});

// ---------------------------------------------------------------------------
// F. protected-byte invariant: BASE_MAIN vs candidate, protected paths unchanged
// ---------------------------------------------------------------------------
test('F1. protected paths are unchanged vs BASE_MAIN', () => {
  // Fail-closed: no skip path. If git/the BASE commit is unavailable the
  // invariant cannot be proven, so the test must FAIL (never silently pass).
  const out = execSync(`git diff --name-only ${BASE_MAIN} -- ${PROTECTED_PATHS.join(' ')}`, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(out.trim(), '', `protected paths must be byte-unchanged vs ${BASE_MAIN}`);
});

test('F2. component manifest declares the exact canonical file set with matching committed hashes', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, '..', 'src/06_components/SRC064/manifest.json'), 'utf8'));

  // Exact expected manifest file set (fail-closed: neither extra nor missing).
  const EXPECTED_FILES = ['slots.js', 'adapter.js', 'bridge.js'];
  const declared = Object.keys(manifest.files || {}).sort();
  assert.deepStrictEqual(declared, [...EXPECTED_FILES].sort(), 'manifest.files must declare exactly the canonical file set');

  // Every declared file must resolve from committed/indexed candidate bytes and
  // its SHA-256 must match. No skip, no continue, no `found || true`.
  for (const name of EXPECTED_FILES) {
    const meta = manifest.files[name];
    assert.ok(meta && typeof meta.sha256 === 'string' && /^[0-9a-f]{64}$/.test(meta.sha256), `${name}: manifest must declare a 64-hex sha256`);
    let blob = null;
    const attempts = [
      `git cat-file blob :src/06_components/SRC064/${name}`,
      `git cat-file blob HEAD:src/06_components/SRC064/${name}`,
    ];
    let lastErr = null;
    for (const cmd of attempts) {
      try {
        blob = execSync(cmd, { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 });
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    assert.ok(blob !== null, `${name}: committed/index blob could not be resolved (fail-closed) — ${lastErr && lastErr.message}`);
    const sha = createHash('sha256').update(blob).digest('hex');
    assert.equal(sha, meta.sha256, `${name} sha256 must match the manifest exactly`);
  }
  assert.equal(manifest.state, 'S5_ACCEPTED');
  assert.equal(manifest.central_s5_accepted, true);
  assert.equal(manifest.s5AcceptanceRef, 'PR #675 comment 6020686874');
  assert.equal(manifest.consumerOwnership, 'NONE');
  assert.deepEqual(manifest.consumerMembership, []);
});

// ---------------------------------------------------------------------------
// G. adoption record: fail-closed candidate state
// ---------------------------------------------------------------------------
test('G1. adoption record is a REUSABLE_ADAPTER_BOUND at the accepted S5 lifecycle with no consumer membership', () => {
  const rec = JSON.parse(readFileSync(join(ROOT, '..', 'src/01_registry/adoptions/SRC064.json'), 'utf8'));
  assert.equal(rec.identity, 'LOVETREE_ADOPTION_RECORD');
  assert.equal(rec.schema_version, 1);
  assert.equal(rec.source_or_codex_id, 'SRC064');
  assert.equal(rec.accepted_source_head, '8de2c3286184ca8fca81af6ec50f8fbd9bd26891');
  assert.equal(rec.adapter_id, 'ADAPTER_SRC064_PRESENTATION');
  assert.equal(rec.adapter_contract_version, 1);
  assert.equal(rec.adapter_path, 'src/06_components/SRC064');
  assert.equal(rec.companion_bridge_path, 'src/06_components/SRC064/bridge.js');
  assert.deepEqual(rec.consumers, []);
  assert.equal(rec.source_visual_mutation, false);
  assert.equal(rec.source_before_after_hash_invariant, true);
  assert.equal(rec.owner_authorized_product_delta_ref, '#673 comment 6014271766');
  assert.equal(rec.adoption_status, 'REUSABLE_ADAPTER_BOUND');
  assert.equal(rec.owner_release_ref, 'PR #675 comment 6020686874');
  assert.ok(
    !('product_parity_ref' in rec)
      && !('web_verification_ref' in rec)
      && !('independent_verification_ref' in rec)
      && !('promotion_ready_ref' in rec)
      && !('product_route_release_ref' in rec),
    'no S6 state fields may be recorded at the accepted S5 boundary',
  );
});
