import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  projectMemoryToSrc056Node,
  projectMvp001ContextToSrc056,
  createSrc056InjectionSeam,
  slotForIndex,
  SRC056_WORLD,
} from '../public/mvp/01/src056-adapter.js';

const SURFACES_SCRIPT = join(import.meta.dirname, '../public/mvp/01/surfaces/src056/script.js');
const ADAPTER_PATH = join(import.meta.dirname, '../public/mvp/01/src056-adapter.js');

function readSourceScript() {
  return readFileSync(SURFACES_SCRIPT, 'utf8');
}

function readAdapterSource() {
  return readFileSync(ADAPTER_PATH, 'utf8');
}

function clustersBlock(script) {
  const start = script.indexOf('const CLUSTERS=[');
  assert.ok(start !== -1, 'frozen CLUSTERS must exist');
  const end = script.indexOf('];', start);
  assert.ok(end !== -1, 'CLUSTERS end must exist');
  return script.slice(start, end + 2);
}

const EXPECTED_COUNTS = [34, 48, 58, 46, 38, 64];
const EXPECTED_NAMES = [
  '처음 빠져든 순간',
  '무대와 퍼포먼스',
  '콘텐츠 탐색',
  '사람과 관계',
  '다시 찾은 기억',
  '다음 계절',
];
const EXPECTED_HUBS = [
  { x: 660, y: 610 },
  { x: 990, y: 1305 },
  { x: 705, y: 2060 },
  { x: 1010, y: 2800 },
  { x: 690, y: 3540 },
  { x: 950, y: 4290 },
];

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
    emotionTags: ['기쁨'],
    visibility: 'public',
    artist: 'Artist',
    parentId: null,
    connectionReason: null,
    ...overrides,
  };
}

function makeContext(memories, selectedMemory = null, tree = undefined) {
  return { tree: tree === undefined ? makeTree() : tree, memories, selectedMemory };
}

// ---- frozen Source facts (anchored to the immutable surface script) ----

test('S1. frozen Source WORLD is 1700x4800', () => {
  const script = readSourceScript();
  assert.ok(script.includes('const WORLD={w:1700,h:4800};'), 'WORLD must remain 1700x4800');
  assert.deepEqual(SRC056_WORLD, { w: 1700, h: 4800 });
});

test('S2. frozen Source has six clusters with counts 34/48/58/46/38/64 = 288', () => {
  const block = clustersBlock(readSourceScript());
  const counts = [...block.matchAll(/count:(\d+)/g)].map((m) => Number(m[1]));
  assert.deepEqual(counts, EXPECTED_COUNTS);
  assert.equal(counts.reduce((a, b) => a + b, 0), 288);
});

test('S3. frozen Source seed is 120811', () => {
  const script = readSourceScript();
  const m = script.match(/let seed=(\d+);/);
  assert.ok(m, 'seed must exist');
  assert.equal(m[1], '120811');
});

test('S4. frozen Source fixture edge kinds include primary/secondary/support/cross/bridge/bridgeSecondary/origin/anchor', () => {
  const script = readSourceScript();
  for (const k of ["kind:'primary'", "kind:'secondary'", "kind:'support'", "kind:'cross'", "'bridge'", "'bridgeSecondary'", "kind:'origin'", "kind:'anchor'"]) {
    assert.ok(script.includes(k), `fixture edge kind marker ${k} must exist in Source`);
  }
});

test('S5. frozen Source six semantic cluster labels anchored', () => {
  const block = clustersBlock(readSourceScript());
  const names = [...block.matchAll(/name:'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(names, EXPECTED_NAMES);
});

test('S6. adapter ring-0 geometry slots equal frozen hub coordinates', () => {
  for (let i = 0; i < 6; i++) {
    const slot = slotForIndex(i);
    assert.equal(slot.x, EXPECTED_HUBS[i].x, `slot ${i} x matches hub`);
    assert.equal(slot.y, EXPECTED_HUBS[i].y, `slot ${i} y matches hub`);
    assert.equal(slot.slotIndex, i);
    assert.equal(slot.viewClusterIndex, i);
  }
});

// ---- required contract tests ----

test('1. invalid context fails closed', () => {
  for (const bad of [null, undefined, 42, 'x', [], {}]) {
    assert.throws(() => projectMvp001ContextToSrc056(bad), /./);
  }
  assert.throws(() => projectMvp001ContextToSrc056({ tree: makeTree(), memories: 'nope', selectedMemory: null }), /memories must be an array/);
});

test('2. invalid Tree identity fails closed', () => {
  assert.throws(() => projectMvp001ContextToSrc056(makeContext([], null, { title: 'no id' })), /Tree is missing a valid id/);
  assert.throws(() => projectMvp001ContextToSrc056(makeContext([], null, null)), /Tree is missing a valid id/);
});

test('3. invalid Memory identity fails closed', () => {
  const bad = makeMemory({ id: '' });
  assert.throws(() => projectMvp001ContextToSrc056(makeContext([bad])), /Memory is missing a valid id/);
  const badTree = makeMemory({ treeId: '' });
  assert.throws(() => projectMvp001ContextToSrc056(makeContext([badTree])), /Memory.treeId/);
});

test('4. Memory from another tree fails closed', () => {
  const foreign = makeMemory({ treeId: 'tree-9' });
  assert.throws(
    () => projectMvp001ContextToSrc056(makeContext([foreign])),
    (e) => e && e.name === 'Src056AdapterError' && e.code === 'MEMORY_TREE_MISMATCH',
  );
});

test('5. zero memories yields empty nodes and edges', () => {
  const out = projectMvp001ContextToSrc056(makeContext([]));
  assert.deepEqual(out.nodes, []);
  assert.deepEqual(out.edges, []);
  assert.deepEqual(out.viewDerivedEdges, []);
  assert.equal(out.selectedId, null);
  assert.equal(out.selectedNode, null);
});

test('6. one root Memory yields one node and zero edges', () => {
  const out = projectMvp001ContextToSrc056(makeContext([makeMemory()]));
  assert.equal(out.nodes.length, 1);
  assert.equal(out.edges.length, 0);
  assert.equal(out.nodes[0].isRoot, true);
  assert.equal(out.nodes[0].depth, 0);
  assert.equal(out.nodes[0].parentId, null);
});

test('7. parent relation produces exactly one canonical edge', () => {
  const parent = makeMemory({ id: 'p1' });
  const child = makeMemory({ id: 'c1', parentId: 'p1' });
  const out = projectMvp001ContextToSrc056(makeContext([parent, child]));
  assert.equal(out.edges.length, 1);
  assert.deepEqual(out.edges[0], {
    id: 'rel:p1::c1',
    from: 'p1',
    to: 'c1',
    kind: 'parent',
    reason: '',
    canonical: true,
    viewDerived: false,
  });
});

test('8. connectionReason maps to edge reason', () => {
  const parent = makeMemory({ id: 'p1' });
  const child = makeMemory({ id: 'c1', parentId: 'p1', connectionReason: '같은 무대를 다시 보다' });
  const out = projectMvp001ContextToSrc056(makeContext([parent, child]));
  assert.equal(out.edges.length, 1);
  assert.equal(out.edges[0].reason, '같은 무대를 다시 보다');
  assert.equal(out.nodes.find((n) => n.id === 'c1').whyNext, '같은 무대를 다시 보다');
});

test('9. null parent gives no edge', () => {
  const a = makeMemory({ id: 'a' });
  const b = makeMemory({ id: 'b' });
  const out = projectMvp001ContextToSrc056(makeContext([a, b]));
  assert.equal(out.edges.length, 0);
});

test('10. dangling parent keeps node and drops edge', () => {
  const orphan = makeMemory({ id: 'orphan', parentId: 'ghost' });
  const out = projectMvp001ContextToSrc056(makeContext([orphan]));
  assert.equal(out.nodes.length, 1);
  assert.equal(out.nodes[0].id, 'orphan');
  assert.equal(out.edges.length, 0);
});

test('11. no array-order relationship inference', () => {
  const a = makeMemory({ id: 'a' });
  const b = makeMemory({ id: 'b' });
  const c = makeMemory({ id: 'c', parentId: 'a' });
  const fwd = projectMvp001ContextToSrc056(makeContext([a, b, c]));
  const rev = projectMvp001ContextToSrc056(makeContext([c, b, a]));
  const edgeIds = (o) => o.edges.map((e) => e.id).sort();
  assert.deepEqual(edgeIds(fwd), ['rel:a::c']);
  assert.deepEqual(edgeIds(rev), ['rel:a::c']);
});

test('12. no date relationship inference', () => {
  const a = makeMemory({ id: 'a', timestamp: '2026-01-01', discoveryDate: '2026-01-01' });
  const b = makeMemory({ id: 'b', timestamp: '2026-01-02', discoveryDate: '2026-01-02' });
  const out = projectMvp001ContextToSrc056(makeContext([a, b]));
  assert.equal(out.edges.length, 0);
});

test('13. no emotion relationship inference', () => {
  const a = makeMemory({ id: 'a', emotionTags: ['설렘'] });
  const b = makeMemory({ id: 'b', emotionTags: ['설렘'] });
  const out = projectMvp001ContextToSrc056(makeContext([a, b]));
  assert.equal(out.edges.length, 0);
});

test('14. no sourceType relationship inference', () => {
  const a = makeMemory({ id: 'a', sourceType: 'youtube' });
  const b = makeMemory({ id: 'b', sourceType: 'youtube' });
  const out = projectMvp001ContextToSrc056(makeContext([a, b]));
  assert.equal(out.edges.length, 0);
});

test('15. no proximity/geometry relationship inference', () => {
  // Adjacent slots (index 0 and 1) with no parent relation must not connect,
  // while a related pair keeps its edge regardless of slot distance.
  const a = makeMemory({ id: 'a' });
  const b = makeMemory({ id: 'b' });
  const c = makeMemory({ id: 'c', parentId: 'a' });
  const out = projectMvp001ContextToSrc056(makeContext([a, b, c]));
  assert.equal(out.edges.length, 1);
  assert.equal(out.edges[0].from, 'a');
  assert.equal(out.edges[0].to, 'c');
});

test('16. fixture edge kinds are not Product truth', () => {
  const parent = makeMemory({ id: 'p1' });
  const child = makeMemory({ id: 'c1', parentId: 'p1' });
  const out = projectMvp001ContextToSrc056(makeContext([parent, child]));
  const kinds = new Set(out.edges.map((e) => e.kind));
  for (const fk of ['primary', 'secondary', 'support', 'cross', 'bridge', 'bridgeSecondary', 'origin', 'anchor', 'moment', 'cluster']) {
    assert.ok(!kinds.has(fk), `fixture kind ${fk} must never appear as Product edge kind`);
  }
  assert.deepEqual(out.viewDerivedEdges, []);
  assert.deepEqual([...kinds], ['parent']);
});

test('17. selected ordinary Memory points at its node', () => {
  const a = makeMemory({ id: 'a' });
  const b = makeMemory({ id: 'b', parentId: 'a' });
  const out = projectMvp001ContextToSrc056(makeContext([a, b], b));
  assert.equal(out.selectedId, 'b');
  assert.equal(out.selectedNode.id, 'b');
  assert.equal(out.nodes.length, 2);
});

test('18. selected unlisted Memory projects standalone', () => {
  const a = makeMemory({ id: 'a' });
  const sel = makeMemory({ id: 'sel', visibility: 'unlisted' });
  const out = projectMvp001ContextToSrc056(makeContext([a], sel));
  assert.equal(out.selectedId, 'sel');
  assert.equal(out.selectedNode.id, 'sel');
  assert.equal(out.selectedNode.privacy, 'UNLISTED');
});

test('19. selected unlisted is not appended to nodes and gains no edges', () => {
  const a = makeMemory({ id: 'a' });
  const sel = makeMemory({ id: 'sel', visibility: 'unlisted', parentId: 'a' });
  const out = projectMvp001ContextToSrc056(makeContext([a], sel));
  assert.equal(out.nodes.length, 1);
  assert.ok(!out.nodes.some((n) => n.id === 'sel'), 'unlisted selected must not leak into nodes');
  assert.equal(out.edges.length, 0);
});

test('20. selected wrong-tree Memory fails closed', () => {
  const a = makeMemory({ id: 'a' });
  const foreign = makeMemory({ id: 'x', treeId: 'tree-9' });
  assert.throws(
    () => projectMvp001ContextToSrc056(makeContext([a], foreign)),
    (e) => e && e.name === 'Src056AdapterError' && e.code === 'SELECTED_MEMORY_TREE_MISMATCH',
  );
});

test('21. self-parent keeps node and drops edge', () => {
  const loop = makeMemory({ id: 'loop', parentId: 'loop' });
  const out = projectMvp001ContextToSrc056(makeContext([loop]));
  assert.equal(out.nodes.length, 1);
  assert.equal(out.edges.length, 0);
});

test('22. deterministic output', () => {
  const p = makeMemory({ id: 'p' });
  const c = makeMemory({ id: 'c', parentId: 'p', connectionReason: 'r' });
  const ctx = makeContext([p, c], c);
  const first = projectMvp001ContextToSrc056(ctx);
  const second = projectMvp001ContextToSrc056(makeContext(
    [{ ...p }, { ...c, emotionTags: [...c.emotionTags] }],
    { ...c },
  ));
  assert.deepEqual(second, first);
});

test('23. adapter performs no fetch/write/DOM/DB work', () => {
  const src = readAdapterSource();
  for (const marker of ['fetch(', 'XMLHttpRequest', 'document.', 'window.', 'localStorage', 'sessionStorage', 'firebase', 'neon', 'pgTable', 'drizzle', 'require(']) {
    assert.ok(!src.includes(marker), `adapter source must not contain ${marker}`);
  }
});

test('24. no React/TS/TSX/JSX/Next constructs introduced', () => {
  const src = readAdapterSource();
  for (const marker of ['React', 'useState', 'useEffect', 'createElement', '.tsx', '.jsx', 'next/']) {
    assert.ok(!src.includes(marker), `adapter source must not contain ${marker}`);
  }
  const entries = readdirSync(join(import.meta.dirname, '../public/mvp/01'));
  assert.ok(!entries.some((n) => /\.(tsx|jsx)$/.test(n)), 'no TSX/JSX files in public/mvp/01');
});

test('25. no DB/backend/schema mutation markers', () => {
  const src = readAdapterSource();
  for (const marker of ['INSERT ', 'UPDATE ', 'DELETE ', '/api/', 'process.env.DATABASE', 'migrate']) {
    assert.ok(!src.includes(marker), `adapter source must not contain ${marker}`);
  }
});

test('26. frozen Source geometry facts anchored in adapter behavior', () => {
  assert.deepEqual(SRC056_WORLD, { w: 1700, h: 4800 });
  const block = clustersBlock(readSourceScript());
  const counts = [...block.matchAll(/count:(\d+)/g)].map((m) => Number(m[1]));
  assert.equal(counts.reduce((a, b) => a + b, 0), 288);
  // ring-0 slots reuse hub coordinates; ring-1+ stays deterministic and bounded
  const s6 = slotForIndex(6);
  assert.equal(s6.slotIndex, 6);
  assert.equal(s6.viewClusterIndex, 0);
  assert.ok(Number.isFinite(s6.x) && Number.isFinite(s6.y));
});

test('27. semantic cluster labels never exported as Product meaning', () => {
  const a = makeMemory({ id: 'a', title: '무대 이야기', emotionTags: ['몰입'], sourceType: 'video' });
  const b = makeMemory({ id: 'b', title: '다른 이야기', emotionTags: ['설렘'], sourceType: 'note', parentId: 'a' });
  const out = projectMvp001ContextToSrc056(makeContext([a, b], b));
  const dumped = JSON.stringify(out);
  for (const name of EXPECTED_NAMES) {
    assert.ok(!dumped.includes(name), `cluster label "${name}" must not leak into output`);
  }
  for (const node of out.nodes) {
    assert.ok(!('clusterName' in node), 'no clusterName key');
    assert.ok(!('pathLabel' in node), 'no pathLabel key');
    assert.ok(!('fixtureWhy' in node), 'no fixtureWhy key');
    assert.ok(!('fixtureTitle' in node), 'no fixtureTitle key');
    assert.equal(node.viewDerived, true);
  }
  // slots follow list position, never content: swapping order swaps slots
  const swapped = projectMvp001ContextToSrc056(makeContext([b, a]));
  const nodeAFirst = out.nodes.find((n) => n.id === 'a');
  const nodeASecond = swapped.nodes.find((n) => n.id === 'a');
  assert.deepEqual({ x: nodeAFirst.x, y: nodeAFirst.y }, { x: 660, y: 610 });
  assert.deepEqual({ x: nodeASecond.x, y: nodeASecond.y }, { x: 990, y: 1305 });
});

// ---- focused extras ----

test('28. parent cycle yields exactly the real edges with finite depths', () => {
  const a = makeMemory({ id: 'a', parentId: 'b' });
  const b = makeMemory({ id: 'b', parentId: 'a' });
  const out = projectMvp001ContextToSrc056(makeContext([a, b]));
  assert.equal(out.nodes.length, 2);
  assert.equal(out.edges.length, 2);
  const ids = out.edges.map((e) => e.id).sort();
  assert.deepEqual(ids, ['rel:a::b', 'rel:b::a']);
  for (const n of out.nodes) assert.ok(Number.isFinite(n.depth), 'depth stays finite on cycles');
});

test('29. duplicate Memory id fails closed', () => {
  const a = makeMemory({ id: 'dup' });
  const b = makeMemory({ id: 'dup' });
  assert.throws(
    () => projectMvp001ContextToSrc056(makeContext([a, b])),
    (e) => e && e.name === 'Src056AdapterError' && e.code === 'DUPLICATE_ID',
  );
});

test('30. empty connectionReason still yields a real parent edge with reason ""', () => {
  const p = makeMemory({ id: 'p' });
  const c = makeMemory({ id: 'c', parentId: 'p', connectionReason: '' });
  const out = projectMvp001ContextToSrc056(makeContext([p, c]));
  assert.equal(out.edges.length, 1);
  assert.equal(out.edges[0].reason, '');
});

test('31. depth follows parent chains and roots stay zero', () => {
  const r = makeMemory({ id: 'r' });
  const m = makeMemory({ id: 'm', parentId: 'r' });
  const l = makeMemory({ id: 'l', parentId: 'm' });
  const out = projectMvp001ContextToSrc056(makeContext([l, m, r]));
  const byId = Object.fromEntries(out.nodes.map((n) => [n.id, n]));
  assert.equal(byId.r.depth, 0);
  assert.equal(byId.m.depth, 1);
  assert.equal(byId.l.depth, 2);
});

test('32. media mapping keeps sourceType authority without URL inference', () => {
  const yt = makeMemory({ id: 'yt', sourceType: 'youtube', sourceUrl: 'https://www.youtube.com/watch?v=x' });
  const vd = makeMemory({ id: 'vd', sourceType: 'video', sourceUrl: 'https://www.youtube.com/watch?v=x' });
  const n1 = projectMemoryToSrc056Node(yt, 0);
  const n2 = projectMemoryToSrc056Node(vd, 1);
  assert.equal(n1.media, 'youtube');
  assert.equal(n2.media, 'video');
  assert.equal(n1.sourceUrl, 'https://www.youtube.com/watch?v=x');
});

test('33. privacy presentation mapping with fail-closed default', () => {
  assert.equal(projectMemoryToSrc056Node(makeMemory({ visibility: 'public' }), 0).privacy, 'PUBLIC');
  assert.equal(projectMemoryToSrc056Node(makeMemory({ visibility: 'unlisted' }), 0).privacy, 'UNLISTED');
  assert.equal(projectMemoryToSrc056Node(makeMemory({ visibility: 'private' }), 0).privacy, 'PRIVATE');
  assert.equal(projectMemoryToSrc056Node(makeMemory({ visibility: 'weird' }), 0).privacy, 'PRIVATE');
});

test('34. injection seam describes a preserved fixture boundary', () => {
  const seam = createSrc056InjectionSeam();
  const desc = seam.describe();
  assert.equal(desc.fixturePreserved, true);
  assert.ok(desc.seam.includes('projectMvp001ContextToSrc056'));
});

test('35. canonical node identity and Product fields preserved', () => {
  const mem = makeMemory({
    id: 'keep', title: 'T', memo: 'M', sourceUrl: 'https://example.com/v',
    thumbnail: 'https://example.com/t.jpg', emotionTags: ['애정', '기대'],
  });
  const node = projectMemoryToSrc056Node(mem, 2);
  assert.equal(node.id, 'keep');
  assert.equal(node.treeId, 'tree-1');
  assert.equal(node.title, 'T');
  assert.equal(node.memo, 'M');
  assert.equal(node.sourceUrl, 'https://example.com/v');
  assert.equal(node.thumbnail, 'https://example.com/t.jpg');
  assert.deepEqual(node.emotionTags, ['애정', '기대']);
  assert.equal(node.slotIndex, 2);
});
