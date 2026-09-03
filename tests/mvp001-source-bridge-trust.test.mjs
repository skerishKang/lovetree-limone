import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Bridge trust harness (MVP001 PR #607 Blocker A evidence).
//
// Each Source companion bridge runs in a node:vm sandbox with fake
// window/parent/location/document globals. The harness dispatches synthetic
// MessageEvents with controlled sender windows, origins and envelopes, then
// observes hydration through per-Source runtime spies and dispose through
// listener removal.
//
// Required invariants (all five bridges, identical shape):
//   - INIT applies ONLY when event.source === parent AND the full envelope
//     matches (origin/protocol/protocolVersion/mvpId/sourceId/frameSessionId/
//     type) AND contextRevision is a non-negative integer.
//   - DISPOSE applies ONLY under the same trusted-parent envelope; no
//     same-origin sibling window may hydrate or dispose the frame.
//   - contextRevision is monotonic: an older INIT never overwrites a newer
//     applied projection; same-revision re-INIT stays allowed (the
//     orchestrator re-sends the current revision on refresh deterministically).

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SURFACES = path.join(HERE, '..', 'public', 'mvp', '01', 'surfaces');
const ORIGIN = 'http://alpha.local';
const WRONG_ORIGIN = 'http://evil.example';
const SESSION = 'frm-trust-1';
const SOURCE_IDS = ['SRC064', 'SRC058', 'SRC056', 'SRC057', 'SRC060'];

function docStub() {
  return {
    getElementById: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, appendChild() {} }),
  };
}

function buildWindow(sourceId, state) {
  if (sourceId === 'SRC064') {
    return {
      __TRACK64__: {
        rebuild(list) { state.rebuilt = list; },
        getCards: () => state.rebuilt ?? [],
        focus() { state.focused = (state.focused ?? 0) + 1; },
      },
    };
  }
  if (sourceId === 'SRC058') {
    return {
      __LT58: { moments: [], connections: [] },
      __LT58V12: {
        render() {}, cards() { state.cardsCalled = true; }, threads() {}, filter() {},
      },
    };
  }
  if (sourceId === 'SRC056') {
    return {
      __lt: {
        state: {}, nodes: [], edges: [], paths: [], CLUSTERS: [], pathById: {}, anchors: [],
        selectMoment() { state.selected = true; }, overview() {},
      },
    };
  }
  if (sourceId === 'SRC057') {
    return {
      __LT57__: {
        moments: [],
        setProductMoments(list) { state.applied = list; },
        selectMoment() {},
      },
    };
  }
  if (sourceId === 'SRC060') {
    return {
      __LT60__: {
        nodes: [], edges: [], clusters: [], bridgeRecords: [],
        selectNode() { state.selected = true; },
        // The renderer stores per-node titles (T-<marker>), not canonical
        // ids, so the probe reads titles as the applied-projection trace.
      },
    };
  }
  throw new Error(`unknown source ${sourceId}`);
}

function projectionFor(sourceId, marker) {
  switch (sourceId) {
    case 'SRC064': return { cards: [{ id: marker, type: 'note', first: true }] };
    case 'SRC058': return { moments: [{ id: marker }], connections: [] };
    case 'SRC056': return { nodes: [{ id: marker, x: 1, y: 1 }], edges: [] };
    case 'SRC057': return { moments: [{ id: marker, title: `T-${marker}` }], selectedMoment: null };
    case 'SRC060': return { nodes: [{ id: marker, title: `T-${marker}`, x: 0, y: 0, z: 0 }], edges: [] };
    default: throw new Error(`no projection for ${sourceId}`);
  }
}

// Hydration probe: canonical content visible in the Source runtime. SRC060
// maps canonical ids to renderer indices, so the probe observes the applied
// projection through the rebuild spy instead of the index-keyed nodes.
function probeFor(sourceId, win, state) {
  switch (sourceId) {
    case 'SRC064': return (state.rebuilt ?? []).map((c) => String(c.id));
    case 'SRC058': return win.__LT58.moments.map((m) => String(m.id));
    case 'SRC056': return win.__lt.nodes.map((n) => String(n.id));
    case 'SRC057': return (state.applied ?? []).map((m) => String(m.id));
    // SRC060 renderer stores per-node titles (T-<marker>), not canonical ids:
    // the probe strips the marker prefix so assertions compare markers.
    case 'SRC060': return win.__LT60__.nodes.map((n) => String(n.title).replace(/^T-/, ''));
    default: throw new Error(`no probe for ${sourceId}`);
  }
}

function createContext(overrides = {}) {
  return {
    schemaVersion: 1,
    mvpId: 'MVP001',
    contextRevision: 1,
    currentStep: 'entry',
    treeId: 'alpha-tree-1',
    selectedMemoryId: null,
    selectedRelationshipId: null,
    navigationOrigin: 'shell',
    viewer: { state: 'signed-out', uid: null },
    ...overrides,
  };
}

function initEnvelope(sourceId, marker, revision, overrides = {}) {
  return {
    protocol: 'lovetree.mvp.bridge',
    protocolVersion: 1,
    mvpId: 'MVP001',
    sourceId,
    frameSessionId: SESSION,
    messageId: `msg-init-${revision}`,
    type: 'SOURCE_INIT',
    contextRevision: revision,
    payload: {
      context: createContext({ selectedMemoryId: marker }),
      projection: projectionFor(sourceId, marker),
      permissions: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    },
    ...overrides,
  };
}

function disposeEnvelope(sourceId, overrides = {}) {
  return {
    protocol: 'lovetree.mvp.bridge',
    protocolVersion: 1,
    mvpId: 'MVP001',
    sourceId,
    frameSessionId: SESSION,
    messageId: 'msg-dispose-1',
    type: 'SOURCE_DISPOSE',
    contextRevision: 1,
    payload: {},
    ...overrides,
  };
}

function loadBridge(sourceId) {
  const file = path.join(SURFACES, sourceId.toLowerCase(), `${sourceId.toLowerCase()}-product-bridge.js`);
  const code = readFileSync(file, 'utf8');
  const listeners = new Set();
  const posted = [];
  const parent = { tag: 'PARENT', postMessage(msg, targetOrigin) { posted.push({ msg, targetOrigin }); } };
  const sibling = { tag: 'SIBLING', postMessage() {} };
  const state = {};
  const win = buildWindow(sourceId, state);
  win.location = { origin: ORIGIN, search: `?mvpSession=${SESSION}&mvpSource=${sourceId}` };
  win.addEventListener = (type, fn) => { if (type === 'message') listeners.add(fn); };
  win.removeEventListener = (type, fn) => { if (type === 'message') listeners.delete(fn); };
  Object.defineProperty(win, 'parent', { value: parent, configurable: true });
  const sandbox = vm.createContext({
    window: win,
    document: docStub(),
    location: win.location,
    parent,
    URLSearchParams,
  });
  vm.runInContext(code, sandbox, { filename: file });
  assert.equal(listeners.size, 1, `${sourceId} registers exactly one message listener`);
  const ready = posted.find((p) => p.msg.type === 'SOURCE_READY');
  assert.ok(ready, `${sourceId} posts SOURCE_READY to the parent`);
  assert.equal(ready.targetOrigin, ORIGIN, `${sourceId} READY targets the frame origin only`);
  return {
    parent,
    sibling,
    listeners,
    send(data, sender = parent, origin = ORIGIN) {
      for (const fn of [...listeners]) fn({ data, origin, source: sender });
    },
    probe: () => probeFor(sourceId, win, state),
  };
}

for (const sourceId of SOURCE_IDS) {
  test(`${sourceId}: trusted-parent INIT hydrates; hostile senders/origins/envelopes do not`, () => {
    const b = loadBridge(sourceId);
    assert.deepEqual(b.probe(), [], `${sourceId} starts neutral`);

    // WRONG SENDER: same-origin sibling window, perfect envelope otherwise.
    b.send(initEnvelope(sourceId, 'mem-a', 1), b.sibling);
    assert.deepEqual(b.probe(), [], `${sourceId}: sibling INIT rejected`);

    // WRONG ORIGIN from the real parent.
    b.send(initEnvelope(sourceId, 'mem-a', 1), b.parent, WRONG_ORIGIN);
    assert.deepEqual(b.probe(), [], `${sourceId}: wrong-origin INIT rejected`);

    // null sender (worker-style synthetic event).
    b.send(initEnvelope(sourceId, 'mem-a', 1), null);
    assert.deepEqual(b.probe(), [], `${sourceId}: null-sender INIT rejected`);

    // Envelope dimension negatives from the real parent.
    b.send(initEnvelope(sourceId, 'mem-a', 1, { sourceId: 'SRC999' }));
    assert.deepEqual(b.probe(), [], `${sourceId}: wrong sourceId rejected`);
    b.send(initEnvelope(sourceId, 'mem-a', 1, { frameSessionId: 'frm-other' }));
    assert.deepEqual(b.probe(), [], `${sourceId}: wrong session rejected`);
    b.send(initEnvelope(sourceId, 'mem-a', 1, { mvpId: 'MVP002' }));
    assert.deepEqual(b.probe(), [], `${sourceId}: wrong mvpId rejected`);
    b.send(initEnvelope(sourceId, 'mem-a', 1, { protocolVersion: 2 }));
    assert.deepEqual(b.probe(), [], `${sourceId}: wrong protocolVersion rejected`);
    b.send(initEnvelope(sourceId, 'mem-a', 1, { protocol: 'other.protocol' }));
    assert.deepEqual(b.probe(), [], `${sourceId}: wrong protocol rejected`);
    b.send(initEnvelope(sourceId, 'mem-a', 1, { type: 'SOURCE_READY' }));
    assert.deepEqual(b.probe(), [], `${sourceId}: wrong type rejected`);
    b.send(initEnvelope(sourceId, 'mem-a', 1, { contextRevision: -1 }));
    assert.deepEqual(b.probe(), [], `${sourceId}: negative revision rejected`);
    b.send(initEnvelope(sourceId, 'mem-a', 1, { contextRevision: 1.5 }));
    assert.deepEqual(b.probe(), [], `${sourceId}: non-integer revision rejected`);
    b.send(initEnvelope(sourceId, 'mem-a', 1, { payload: null }));
    assert.deepEqual(b.probe(), [], `${sourceId}: null payload rejected`);
    b.send(initEnvelope(sourceId, 'mem-a', 1, { payload: { context: {}, projection: {}, permissions: { canRead: false } } }));
    assert.deepEqual(b.probe(), [], `${sourceId}: canRead:false payload rejected`);
    b.send('not-an-envelope');
    assert.deepEqual(b.probe(), [], `${sourceId}: non-object data rejected`);

    // VALID trusted-parent INIT applies the canonical projection.
    b.send(initEnvelope(sourceId, 'mem-a', 1));
    assert.deepEqual(b.probe(), ['mem-a'], `${sourceId}: trusted INIT hydrates`);
  });

  test(`${sourceId}: contextRevision is monotonic; same-revision re-INIT applies`, () => {
    const b = loadBridge(sourceId);
    b.send(initEnvelope(sourceId, 'mem-new', 5));
    assert.deepEqual(b.probe(), ['mem-new'], `${sourceId}: rev5 applied`);
    b.send(initEnvelope(sourceId, 'mem-new2', 5));
    assert.deepEqual(b.probe(), ['mem-new2'], `${sourceId}: same-revision re-INIT applies (deterministic refresh)`);
    b.send(initEnvelope(sourceId, 'mem-stale', 3));
    assert.deepEqual(b.probe(), ['mem-new2'], `${sourceId}: stale rev3 does not overwrite rev5`);
    b.send(initEnvelope(sourceId, 'mem-newer', 6));
    assert.deepEqual(b.probe(), ['mem-newer'], `${sourceId}: newer rev6 applies`);
    // Stale sender cannot even reach the revision guard: sibling + stale combo.
    b.send(initEnvelope(sourceId, 'mem-hostile', 2), b.sibling);
    assert.deepEqual(b.probe(), ['mem-newer'], `${sourceId}: sibling stale INIT rejected`);
  });

  test(`${sourceId}: DISPOSE honored only from the trusted parent`, () => {
    const b = loadBridge(sourceId);

    // Hostile DISPOSE attempts must not disarm the listener.
    b.send(disposeEnvelope(sourceId), b.sibling);
    b.send(disposeEnvelope(sourceId), b.parent, WRONG_ORIGIN);
    b.send(disposeEnvelope(sourceId, { frameSessionId: 'frm-other' }));
    b.send(disposeEnvelope(sourceId, { sourceId: 'SRC999' }));
    b.send(disposeEnvelope(sourceId, { protocolVersion: 2 }));
    assert.equal(b.listeners.size, 1, `${sourceId}: hostile DISPOSE ignored`);
    b.send(initEnvelope(sourceId, 'mem-a', 1));
    assert.deepEqual(b.probe(), ['mem-a'], `${sourceId}: still hydrating after hostile DISPOSE`);

    // VALID trusted-parent DISPOSE removes the listener...
    b.send(disposeEnvelope(sourceId));
    assert.equal(b.listeners.size, 0, `${sourceId}: trusted DISPOSE removes the listener`);

    // ...and later INITs (even valid trusted ones) no longer apply.
    b.send(initEnvelope(sourceId, 'mem-after', 2));
    assert.deepEqual(b.probe(), ['mem-a'], `${sourceId}: no hydration after trusted DISPOSE`);
    b.send(disposeEnvelope(sourceId), b.sibling);
    assert.equal(b.listeners.size, 0, `${sourceId}: listener stays removed`);
  });
}
