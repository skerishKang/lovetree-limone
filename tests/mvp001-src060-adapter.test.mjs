import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  projectMemoryToSrc060Node,
  projectMvp001ContextToSrc060,
  createSrc060InjectionSeam,
  searchSrc060Nodes,
  slotForIndex,
} from '../public/mvp/01/src060-adapter.js';

const SURFACES_SCRIPT = join(import.meta.dirname, '../public/mvp/01/surfaces/src060/script.js');
const ADAPTER_PATH = join(import.meta.dirname, '../public/mvp/01/src060-adapter.js');

function readSourceScript() {
  return readFileSync(SURFACES_SCRIPT, 'utf8');
}

function readAdapterSource() {
  return readFileSync(ADAPTER_PATH, 'utf8');
}

function clusterDefsBlock(script) {
  const start = script.indexOf('const clusterDefs=[');
  assert.ok(start !== -1, 'frozen clusterDefs must exist');
  const end = script.indexOf('];', start);
  assert.ok(end !== -1, 'clusterDefs end must exist');
  return script.slice(start, end + 2);
}

const EXPECTED_COUNTS = [310, 145, 125, 115, 95, 70, 60, 45, 35];
const EXPECTED_NAMES = [
  '첫 입덕의 밀도',
  '무대와 공연',
  '인터뷰와 말',
  '멤버 개인 콘텐츠',
  '라이브의 밤',
  '사진으로 남은 날',
  '팬캠의 순간',
  '편지와 기록',
  '다시 돌아온 계절',
];
const FIXTURE_PERSONS = ['민준', '하린', '서윤', '지우', '태오', '유나'];
const FIXTURE_KEYWORDS = ['무대', '표정', '노래', '인터뷰', '팬캠', '라이브', '사진', '편지'];

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
    artist: 'Artist',
    source: 'src',
    channelName: '',
    sourceType: 'link',
    sourceUrl: 'https://example.com/page',
    thumbnail: 'https://example.com/thumb.jpg',
    timestamp: '2026-01-01',
    discoveryDate: '2026-01-01',
    emotionTags: ['기쁨'],
    visibility: 'public',
    parentId: null,
    connectionReason: null,
    ...overrides,
  };
}

function makeContext(memories, selectedMemory = null, tree = undefined) {
  return { tree: tree === undefined ? makeTree() : tree, memories, selectedMemory };
}

function codeOf(fn) {
  try {
    fn();
  } catch (e) {
    return e && e.code;
  }
  return null;
}

// ---- frozen Source facts (anchored to the immutable surface script) ----

test('S1. frozen Source seed is 60260811', () => {
  const m = readSourceScript().match(/let seed=(\d+);/);
  assert.ok(m, 'seed must exist');
  assert.equal(m[1], '60260811');
});

test('S2. frozen Source has 9 clusters with counts summing to 1000', () => {
  const block = clusterDefsBlock(readSourceScript());
  const counts = [...block.matchAll(/n:(\d+)/g)].map((m) => Number(m[1]));
  assert.deepEqual(counts, EXPECTED_COUNTS);
  assert.equal(counts.reduce((a, b) => a + b, 0), 1000);
});

test('S3. frozen Source nine semantic cluster names anchored', () => {
  const block = clusterDefsBlock(readSourceScript());
  const names = [...block.matchAll(/name:'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(names, EXPECTED_NAMES);
});

test('S4. frozen Source local/context/bridge generation exists', () => {
  const script = readSourceScript();
  assert.ok(script.includes("type:'local'"), 'local edge generation must exist');
  assert.ok(script.includes("type:'context'"), 'context edge generation must exist');
  assert.ok(script.includes("type:'bridge'"), 'bridge edge generation must exist');
  assert.ok(script.includes('bridgePairs'), 'bridgePairs must exist');
  assert.ok(script.includes('bridgeRecords'), 'bridgeRecords must exist');
});

test('S5. frozen Source NAV_TARGETS 59/55/56 handoffs exist as fixture', () => {
  const script = readSourceScript();
  assert.ok(script.includes('NAV_TARGETS'), 'NAV_TARGETS must exist in Source');
  assert.ok(script.includes('window.open'), 'window.open handoff must exist in Source');
  assert.ok(script.includes('sessionStorage'), 'sessionStorage handoff must exist in Source');
  assert.ok(script.includes('localStorage'), 'localStorage handoff must exist in Source');
});

test('S6. neutral slot zero is origin-centered, not cluster-centered', () => {
  assert.deepEqual(slotForIndex(0), {
    x: 120, y: 0, z: -60, r: 5, color: '#8a7f8c', slotIndex: 0, viewClusterIndex: 0,
  });
});

// ---- required test matrix ----

test('1. invalid context fails closed', () => {
  for (const bad of [null, undefined, 42, 'x', [], {}]) {
    assert.throws(() => projectMvp001ContextToSrc060(bad), /./);
  }
  assert.throws(() => projectMvp001ContextToSrc060({ tree: makeTree(), memories: 'nope', selectedMemory: null }), /memories must be an array/);
});

test('2. invalid Tree id fails closed', () => {
  assert.throws(() => projectMvp001ContextToSrc060(makeContext([], null, { title: 'no id' })), /Tree is missing a valid id/);
  assert.throws(() => projectMvp001ContextToSrc060(makeContext([], null, null)), /Tree is missing a valid id/);
});

test('3. invalid Memory id fails closed', () => {
  assert.throws(() => projectMvp001ContextToSrc060(makeContext([makeMemory({ id: '' })])), /Memory is missing a valid id/);
  assert.throws(() => projectMvp001ContextToSrc060(makeContext([makeMemory({ treeId: '' })])), /Memory.treeId/);
});

test('4. wrong-tree Memory fails closed', () => {
  assert.equal(codeOf(() => projectMvp001ContextToSrc060(makeContext([makeMemory({ treeId: 'tree-9' })]))), 'MEMORY_TREE_MISMATCH');
});

test('5. duplicate Memory id fails closed', () => {
  assert.equal(codeOf(() => projectMvp001ContextToSrc060(makeContext([makeMemory({ id: 'dup' }), makeMemory({ id: 'dup' })]))), 'DUPLICATE_ID');
});

test('6. empty Tree yields empty nodes and edges', () => {
  const out = projectMvp001ContextToSrc060(makeContext([]));
  assert.deepEqual(out.nodes, []);
  assert.deepEqual(out.edges, []);
  assert.deepEqual(out.viewDerivedEdges, []);
  assert.equal(out.selectedId, null);
  assert.equal(out.selectedNode, null);
});

test('7. one root yields one node and zero edges', () => {
  const out = projectMvp001ContextToSrc060(makeContext([makeMemory()]));
  assert.equal(out.nodes.length, 1);
  assert.equal(out.edges.length, 0);
  assert.equal(out.nodes[0].isRoot, true);
  assert.equal(out.nodes[0].canonicalDepth, 0);
});

test('8. multiple independent roots yield no fake bridge', () => {
  const out = projectMvp001ContextToSrc060(makeContext([makeMemory({ id: 'r1' }), makeMemory({ id: 'r2' }), makeMemory({ id: 'r3' })]));
  assert.equal(out.nodes.length, 3);
  assert.equal(out.edges.length, 0);
});

test('9. real parent edge has canonical shape', () => {
  const out = projectMvp001ContextToSrc060(makeContext([makeMemory({ id: 'p1' }), makeMemory({ id: 'c1', parentId: 'p1' })]));
  assert.equal(out.edges.length, 1);
  assert.deepEqual(out.edges[0], {
    id: 'rel:p1::c1', from: 'p1', to: 'c1', kind: 'parent', reason: '', canonical: true, viewDerived: false,
  });
});

test('10. connectionReason maps to edge reason', () => {
  const out = projectMvp001ContextToSrc060(makeContext([
    makeMemory({ id: 'p1' }),
    makeMemory({ id: 'c1', parentId: 'p1', connectionReason: '같은 밤의 감정' }),
  ]));
  assert.equal(out.edges[0].reason, '같은 밤의 감정');
  assert.equal(out.nodes.find((n) => n.id === 'c1').whyNext, '같은 밤의 감정');
});

test('11. null parent yields no edge', () => {
  const out = projectMvp001ContextToSrc060(makeContext([makeMemory({ id: 'a' }), makeMemory({ id: 'b' })]));
  assert.equal(out.edges.length, 0);
});

test('12. dangling parent keeps node and drops edge', () => {
  const out = projectMvp001ContextToSrc060(makeContext([makeMemory({ id: 'orphan', parentId: 'ghost' })]));
  assert.equal(out.nodes.length, 1);
  assert.equal(out.edges.length, 0);
});

test('13. self-parent keeps node and drops edge', () => {
  const out = projectMvp001ContextToSrc060(makeContext([makeMemory({ id: 'loop', parentId: 'loop' })]));
  assert.equal(out.nodes.length, 1);
  assert.equal(out.edges.length, 0);
});

test('14. cycle stays safe with exactly the real edges', () => {
  const out = projectMvp001ContextToSrc060(makeContext([
    makeMemory({ id: 'a', parentId: 'b' }),
    makeMemory({ id: 'b', parentId: 'a' }),
  ]));
  assert.equal(out.edges.length, 2);
  assert.deepEqual(out.edges.map((e) => e.id).sort(), ['rel:a::b', 'rel:b::a']);
  for (const n of out.nodes) assert.ok(Number.isFinite(n.canonicalDepth));
});

test('15. long parent chain yields graded canonical depths', () => {
  const out = projectMvp001ContextToSrc060(makeContext([
    makeMemory({ id: 'l', parentId: 'm' }),
    makeMemory({ id: 'm', parentId: 'r' }),
    makeMemory({ id: 'r' }),
  ]));
  const byId = Object.fromEntries(out.nodes.map((n) => [n.id, n]));
  assert.equal(byId.r.canonicalDepth, 0);
  assert.equal(byId.m.canonicalDepth, 1);
  assert.equal(byId.l.canonicalDepth, 2);
  assert.equal(out.edges.length, 2);
});

test('16. no array-order inference', () => {
  const mk = () => [makeMemory({ id: 'a' }), makeMemory({ id: 'b' }), makeMemory({ id: 'c', parentId: 'a' })];
  const fwd = projectMvp001ContextToSrc060(makeContext(mk()));
  const rev = projectMvp001ContextToSrc060(makeContext(mk().reverse()));
  assert.deepEqual(fwd.edges.map((e) => e.id).sort(), ['rel:a::c']);
  assert.deepEqual(rev.edges.map((e) => e.id).sort(), ['rel:a::c']);
});

test('17. no title inference', () => {
  const out = projectMvp001ContextToSrc060(makeContext([
    makeMemory({ id: 'a', title: '같은 무대 이야기' }),
    makeMemory({ id: 'b', title: '같은 무대 이야기' }),
  ]));
  assert.equal(out.edges.length, 0);
});

test('18. no memo/content inference', () => {
  const out = projectMvp001ContextToSrc060(makeContext([
    makeMemory({ id: 'a', memo: '동일한 기록 내용' }),
    makeMemory({ id: 'b', memo: '동일한 기록 내용' }),
  ]));
  assert.equal(out.edges.length, 0);
});

test('19. no date inference', () => {
  const out = projectMvp001ContextToSrc060(makeContext([
    makeMemory({ id: 'a', timestamp: '2026-05-01', discoveryDate: '2026-05-01' }),
    makeMemory({ id: 'b', timestamp: '2026-05-02', discoveryDate: '2026-05-02' }),
  ]));
  assert.equal(out.edges.length, 0);
});

test('20. no emotion inference', () => {
  const out = projectMvp001ContextToSrc060(makeContext([
    makeMemory({ id: 'a', emotionTags: ['설렘'] }),
    makeMemory({ id: 'b', emotionTags: ['설렘'] }),
  ]));
  assert.equal(out.edges.length, 0);
});

test('21. no sourceType inference', () => {
  const out = projectMvp001ContextToSrc060(makeContext([
    makeMemory({ id: 'a', sourceType: 'video' }),
    makeMemory({ id: 'b', sourceType: 'video' }),
  ]));
  assert.equal(out.edges.length, 0);
});

test('22. no artist/source inference', () => {
  const out = projectMvp001ContextToSrc060(makeContext([
    makeMemory({ id: 'a', artist: '같은 아티스트', channelName: '같은 채널' }),
    makeMemory({ id: 'b', artist: '같은 아티스트', channelName: '같은 채널' }),
  ]));
  assert.equal(out.edges.length, 0);
});

test('23. no proximity inference', () => {
  const out = projectMvp001ContextToSrc060(makeContext([
    makeMemory({ id: 'a' }),
    makeMemory({ id: 'b' }),
    makeMemory({ id: 'c', parentId: 'a' }),
  ]));
  assert.equal(out.edges.length, 1);
  assert.equal(out.edges[0].to, 'c');
});

test('24. fixture local edges are not canonical', () => {
  const out = projectMvp001ContextToSrc060(makeContext([makeMemory({ id: 'a' }), makeMemory({ id: 'b' })]));
  assert.ok(!out.edges.some((e) => e.kind === 'local'));
  assert.deepEqual(out.viewDerivedEdges, []);
});

test('25. fixture context edges are not canonical', () => {
  const out = projectMvp001ContextToSrc060(makeContext([makeMemory({ id: 'a' }), makeMemory({ id: 'b' })]));
  assert.ok(!out.edges.some((e) => e.kind === 'context'));
});

test('26. fixture bridges are not canonical', () => {
  const out = projectMvp001ContextToSrc060(makeContext([makeMemory({ id: 'a' }), makeMemory({ id: 'b', parentId: 'a' })]));
  const kinds = new Set(out.edges.map((e) => e.kind));
  for (const fk of ['bridge', 'local', 'context', 'support', 'cross', 'primary', 'secondary', 'origin']) {
    assert.ok(!kinds.has(fk), `fixture kind ${fk} must never be canonical`);
  }
  assert.deepEqual([...kinds], ['parent']);
});

test('27. nine cluster semantics never leak into Product output', () => {
  const out = projectMvp001ContextToSrc060(makeContext([
    makeMemory({ id: 'a', title: '탐색 이야기', sourceType: 'video' }),
    makeMemory({ id: 'b', title: '또 다른 이야기', parentId: 'a' }),
  ]));
  const dumped = JSON.stringify(out);
  for (const name of EXPECTED_NAMES) {
    assert.ok(!dumped.includes(name), `cluster name "${name}" must not leak`);
  }
  for (const node of out.nodes) {
    for (const key of ['clusterName', 'clusterLabel', 'clusterMeaning', 'clusterEmotion', 'fixtureClusterId', 'pathLabel', 'fixtureWhy']) {
      assert.ok(!(key in node), `no ${key} key`);
    }
    assert.equal(node.viewDerived, true);
  }
});

test('28. selected ordinary Memory references its node', () => {
  const a = makeMemory({ id: 'a' });
  const b = makeMemory({ id: 'b', parentId: 'a' });
  const out = projectMvp001ContextToSrc060(makeContext([a, b], b));
  assert.equal(out.selectedId, 'b');
  assert.equal(out.selectedNode.id, 'b');
  assert.equal(out.nodes.length, 2);
});

test('29. selected unlisted Memory projects standalone', () => {
  const out = projectMvp001ContextToSrc060(makeContext(
    [makeMemory({ id: 'a' })],
    makeMemory({ id: 'sel', visibility: 'unlisted' }),
  ));
  assert.equal(out.selectedId, 'sel');
  assert.equal(out.selectedNode.id, 'sel');
  assert.equal(out.selectedNode.privacy, 'UNLISTED');
});

test('30. selected unlisted stays absent from nodes', () => {
  const out = projectMvp001ContextToSrc060(makeContext(
    [makeMemory({ id: 'a' })],
    makeMemory({ id: 'sel', visibility: 'unlisted' }),
  ));
  assert.equal(out.nodes.length, 1);
  assert.ok(!out.nodes.some((n) => n.id === 'sel'));
});

test('31. selected unlisted gains no unseen edge', () => {
  const out = projectMvp001ContextToSrc060(makeContext(
    [makeMemory({ id: 'a' })],
    makeMemory({ id: 'sel', visibility: 'unlisted', parentId: 'a' }),
  ));
  assert.equal(out.edges.length, 0);
  assert.equal(out.selectedNode.canonicalDepth, null);
});

test('32. selected wrong-tree Memory fails closed', () => {
  assert.equal(codeOf(() => projectMvp001ContextToSrc060(makeContext(
    [makeMemory({ id: 'a' })],
    makeMemory({ id: 'x', treeId: 'tree-9' }),
  ))), 'SELECTED_MEMORY_TREE_MISMATCH');
});

test('33. privacy mapping with fail-closed default', () => {
  assert.equal(projectMemoryToSrc060Node(makeMemory({ visibility: 'public' }), 0).privacy, 'PUBLIC');
  assert.equal(projectMemoryToSrc060Node(makeMemory({ visibility: 'unlisted' }), 0).privacy, 'UNLISTED');
  assert.equal(projectMemoryToSrc060Node(makeMemory({ visibility: 'private' }), 0).privacy, 'PRIVATE');
  assert.equal(projectMemoryToSrc060Node(makeMemory({ visibility: 'weird' }), 0).privacy, 'PRIVATE');
});

test('34. canonical media mapping without URL heuristic', () => {
  const url = 'https://www.youtube.com/watch?v=x';
  assert.equal(projectMemoryToSrc060Node(makeMemory({ sourceType: 'youtube', sourceUrl: url }), 0).media, 'youtube');
  assert.equal(projectMemoryToSrc060Node(makeMemory({ sourceType: 'video', sourceUrl: url }), 1).media, 'video');
  assert.equal(projectMemoryToSrc060Node(makeMemory({ sourceType: 'video', sourceUrl: url }), 1).sourceUrl, url);
});

test('35. deterministic output', () => {
  const p = makeMemory({ id: 'p' });
  const c = makeMemory({ id: 'c', parentId: 'p', connectionReason: 'r' });
  const first = projectMvp001ContextToSrc060(makeContext([p, c], c));
  const second = projectMvp001ContextToSrc060(makeContext([{ ...p }, { ...c, emotionTags: [...c.emotionTags] }], { ...c }));
  assert.deepEqual(second, first);
  assert.deepEqual(slotForIndex(17), slotForIndex(17));
});

test('36. geometry is content-independent', () => {
  const x = makeMemory({ id: 'x', title: 'AAA', emotionTags: ['기쁨'], sourceType: 'video' });
  const y = makeMemory({ id: 'y', title: 'BBB', emotionTags: ['그리움'], sourceType: 'note' });
  const fwd = projectMvp001ContextToSrc060(makeContext([x, y]));
  const rev = projectMvp001ContextToSrc060(makeContext([{ ...y, id: 'y' }, { ...x, id: 'x' }]));
  const slotOf = (o, id) => {
    const n = o.nodes.find((n) => n.id === id);
    return { x: n.x, y: n.y, z: n.z, color: n.color, viewClusterIndex: n.viewClusterIndex };
  };
  assert.deepEqual(slotOf(fwd, 'x'), slotOf(rev, 'y'));
  assert.deepEqual(slotOf(fwd, 'y'), slotOf(rev, 'x'));
});

test('37. viewClusterIndex is positional only', () => {
  const out = projectMvp001ContextToSrc060(makeContext([makeMemory({ id: 'a' }), makeMemory({ id: 'b' })]));
  assert.equal(out.nodes[0].viewClusterIndex, 0);
  assert.equal(out.nodes[1].viewClusterIndex, 1);
  assert.equal(out.nodes[0].slotIndex, 0);
  const ring = projectMvp001ContextToSrc060(makeContext(Array.from({ length: 10 }, (_, i) => makeMemory({ id: `n${i}` }))));
  assert.equal(ring.nodes[9].slotIndex, 9);
  assert.equal(ring.nodes[9].viewClusterIndex, 0);
  assert.ok(ring.nodes[9].x !== ring.nodes[0].x || ring.nodes[9].y !== ring.nodes[0].y, 'ring 1 separates from ring 0');
});

test('38. search operates only on canonical fields', () => {
  const out = projectMvp001ContextToSrc060(makeContext([
    makeMemory({ id: 'a', title: '바닷가 산책 메모', memo: '파도 소리' }),
    makeMemory({ id: 'b', title: '다른 기록', emotionTags: ['설렘'] }),
  ]));
  assert.deepEqual(searchSrc060Nodes(out.nodes, '바닷가'), ['a']);
  assert.deepEqual(searchSrc060Nodes(out.nodes, '파도'), ['a']);
  assert.deepEqual(searchSrc060Nodes(out.nodes, '설렘'), ['b']);
  assert.deepEqual(searchSrc060Nodes(out.nodes, 'link'), ['a', 'b']);
  assert.equal(codeOf(() => searchSrc060Nodes(out.nodes, '   ')), 'INVALID_QUERY');
});

test('39. fixture persons and keywords are not exported', () => {
  const out = projectMvp001ContextToSrc060(makeContext([makeMemory({ id: 'a' }), makeMemory({ id: 'b' })]));
  const dumped = JSON.stringify(out);
  for (const p of [...FIXTURE_PERSONS, ...FIXTURE_KEYWORDS, 'First Moment']) {
    assert.ok(!dumped.includes(p), `fixture token "${p}" must not leak`);
  }
  // '무대' etc. may appear only if a canonical Memory field contains them
  assert.deepEqual(searchSrc060Nodes(out.nodes, '민준'), []);
});

test('40. NAV_TARGETS are not Product authority', () => {
  const out = projectMvp001ContextToSrc060(makeContext([makeMemory({ id: 'a' })]));
  const dumped = JSON.stringify(out);
  // NOTE: 'example.com' is canonical Memory fixture data in this test file, not a handoff marker.
  for (const marker of ['track59', 'track55', 'track56', 'NAV_TARGETS', 'handoff']) {
    assert.ok(!dumped.includes(marker), `handoff marker ${marker} must not leak`);
  }
  const src = readAdapterSource();
  for (const marker of ['NAV_TARGETS', 'window.open', 'sessionStorage', 'localStorage', '../../']) {
    assert.ok(!src.includes(marker), `adapter source must not contain ${marker}`);
  }
});

test('41. no storage/window.open/fetch/DOM in adapter', () => {
  const src = readAdapterSource();
  for (const marker of ['fetch(', 'XMLHttpRequest', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase', 'neon', 'pgTable', 'drizzle', 'require(', 'location.href', 'postMessage', 'dispatchEvent', 'CustomEvent']) {
    assert.ok(!src.includes(marker), `adapter source must not contain ${marker}`);
  }
});

test('42. no React/TS/TSX/JSX/Next constructs', () => {
  const src = readAdapterSource();
  for (const marker of ['React', 'useState', 'useEffect', 'createElement', '.tsx', '.jsx', 'next/']) {
    assert.ok(!src.includes(marker), `adapter source must not contain ${marker}`);
  }
});

test('43. Source surface files carry no adapter markers', () => {
  const script = readSourceScript();
  for (const marker of ['Src060AdapterError', 'projectMvp001ContextToSrc060', 'viewDerivedEdges', 'canonicalDepth']) {
    assert.ok(!script.includes(marker), `Source script must not contain ${marker}`);
  }
});

test('44. adapter introduces no backend/DB/schema markers', () => {
  const src = readAdapterSource();
  for (const marker of ['INSERT ', 'UPDATE ', 'DELETE ', '/api/', 'process.env.DATABASE', 'migrate']) {
    assert.ok(!src.includes(marker), `adapter source must not contain ${marker}`);
  }
});

test('45. frozen 9-cluster/1000-node facts anchored, adapter stays neutral at 200 scale', () => {
  const block = clusterDefsBlock(readSourceScript());
  const counts = [...block.matchAll(/n:(\d+)/g)].map((m) => Number(m[1]));
  assert.equal(counts.length, 9);
  assert.equal(counts.reduce((a, b) => a + b, 0), 1000);
  const many = Array.from({ length: 200 }, (_, i) => makeMemory({ id: `w${i}` }));
  const out = projectMvp001ContextToSrc060(makeContext(many));
  assert.equal(out.nodes.length, 200);
  assert.equal(out.edges.length, 0);
  const slots = new Set(out.nodes.map((n) => `${n.x},${n.y},${n.z}`));
  assert.ok(slots.size > 150, 'slots spread across rings without collapsing');
});

test('46. injection seam describes a preserved fixture boundary', () => {
  const desc = createSrc060InjectionSeam().describe();
  assert.equal(desc.fixturePreserved, true);
  assert.ok(desc.seam.includes('projectMvp001ContextToSrc060'));
});

test('47. canonical node identity and Product fields preserved', () => {
  const node = projectMemoryToSrc060Node(makeMemory({
    id: 'keep', title: 'T', memo: 'M', sourceUrl: 'https://example.com/v',
    thumbnail: 'https://example.com/t.jpg', emotionTags: ['애정'], channelName: 'CH',
  }), 3);
  assert.equal(node.id, 'keep');
  assert.equal(node.treeId, 'tree-1');
  assert.equal(node.title, 'T');
  assert.equal(node.channelName, 'CH');
  assert.equal(node.source, 'Artist');
  assert.deepEqual(node.emotionTags, ['애정']);
  assert.equal(node.slotIndex, 3);
  assert.equal(node.viewClusterIndex, 3);
});
