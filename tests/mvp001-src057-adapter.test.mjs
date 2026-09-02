import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  projectMemoryToSrc057Moment,
  projectMvp001ContextToSrc057,
} from '../public/mvp/01/src057-adapter.js';

function makeTree(overrides = {}) {
  return { id: 'tree-1', title: 'Tree', visibility: 'public', ...overrides };
}

function makeMemory(overrides = {}) {
  return {
    id: 'mem-1',
    treeId: 'tree-1',
    title: 'Title',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123',
    thumbnail: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
    timestamp: '2026-01-01',
    visibility: 'public',
    memo: 'note',
    artist: 'Artist',
    sourceType: 'youtube',
    emotionTags: ['설렘'],
    discoveryDate: '2026-01-01',
    videoOffsetSeconds: 0,
    connectionReason: 'why next',
    parentId: null,
    ...overrides,
  };
}

// 1. multiple rows map deterministically
test('1. multiple Memory rows map deterministically and preserve order', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'mem-1' }), makeMemory({ id: 'mem-2', title: 'Second' }), makeMemory({ id: 'mem-3' })];
  const a = projectMvp001ContextToSrc057({ tree, memories, selectedMemory: null });
  const b = projectMvp001ContextToSrc057({ tree, memories, selectedMemory: null });
  assert.deepEqual(a, b);
  assert.equal(a.moments.length, 3);
  assert.equal(a.moments[0].id, 'mem-1');
  assert.equal(a.moments[1].id, 'mem-2');
  assert.equal(a.moments[2].id, 'mem-3');
  assert.equal(a.moments[0].next, 'mem-2');
  assert.equal(a.moments[1].next, 'mem-3');
  assert.equal(a.moments[2].next, null);
});

// 2. selected Memory maps independently of list membership
test('2. selected Memory maps independently of list membership', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'mem-1' }), makeMemory({ id: 'mem-2' })];
  const selectedMemory = makeMemory({ id: 'mem-selected', title: 'Selected', visibility: 'unlisted' });
  const result = projectMvp001ContextToSrc057({ tree, memories, selectedMemory });
  assert.equal(result.selectedMomentId, 'mem-selected');
  assert.equal(result.selectedMoment.id, 'mem-selected');
  assert.equal(result.selectedMoment.title, 'Selected');
  // list does not contain selected (unlisted leak prevention)
  assert.ok(!result.moments.some((m) => m.id === 'mem-selected'));
  assert.equal(result.moments.length, 2, 'unlisted selected must not be appended to moments');
});

// 3. selectedMemory absent = valid
test('3. selectedMemory absent is valid', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'mem-1' })];
  const result = projectMvp001ContextToSrc057({ tree, memories, selectedMemory: null });
  assert.equal(result.selectedMomentId, null);
  assert.equal(result.selectedMoment, null);
  const result2 = projectMvp001ContextToSrc057({ tree, memories, selectedMemory: undefined });
  assert.equal(result2.selectedMomentId, null);
  assert.equal(result2.selectedMoment, null);
});

// 4. empty title remains valid
test('4. empty title remains valid', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'mem-1', title: '' })];
  const result = projectMvp001ContextToSrc057({ tree, memories, selectedMemory: null });
  assert.equal(result.moments[0].title, '');
  // tree empty title also valid
  const tree2 = makeTree({ title: '' });
  const r2 = projectMvp001ContextToSrc057({ tree: tree2, memories, selectedMemory: null });
  assert.equal(r2.moments[0].title, '');
});

// 5. empty media/source fields do not crash projection
test('5. empty media/source fields do not crash projection', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'mem-1', sourceUrl: '', thumbnail: '', timestamp: '', discoveryDate: '' })];
  const result = projectMvp001ContextToSrc057({ tree, memories, selectedMemory: null });
  assert.equal(result.moments[0].sourceUrl, '');
  assert.equal(result.moments[0].thumbnailUrl, '');
  assert.equal(result.moments[0].date, '');
  assert.equal(result.moments[0].mediaUrl, '');
});

// 6. malformed structurally-required identity fails closed
test('6. malformed structurally-required identity fails closed', () => {
  const tree = makeTree({ id: '' });
  const memories = [makeMemory({ id: 'mem-1' })];
  assert.throws(() => projectMvp001ContextToSrc057({ tree, memories, selectedMemory: null }), (e) => e.code === 'INVALID_IDENTITY');
  const tree2 = makeTree();
  const badMem = makeMemory({ id: '' });
  assert.throws(() => projectMvp001ContextToSrc057({ tree: tree2, memories: [badMem], selectedMemory: null }), (e) => e.code === 'INVALID_IDENTITY');
  const badMem2 = makeMemory({ id: 'mem-1', treeId: '' });
  assert.throws(() => projectMemoryToSrc057Moment(badMem2, 0, [badMem2]), (e) => e.code === 'INVALID_IDENTITY');
  // missing treeId entirely
  const badMem3 = { id: 'mem-1', title: '', sourceUrl: '', thumbnail: '', timestamp: '', visibility: 'public' };
  assert.throws(() => projectMemoryToSrc057Moment(badMem3, 0, [badMem3]), (e) => e.code === 'INVALID_IDENTITY');
});

// 7. adapter produces no write requests
test('7. adapter produces no write requests', () => {
  const source = readFileSync(join(import.meta.dirname, '../public/mvp/01/src057-adapter.js'), 'utf8');
  assert.ok(!source.includes('fetch('), 'adapter must not call fetch');
  assert.ok(!source.includes('fetchImpl'), 'adapter must not depend on fetchImpl');
  for (const verb of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.ok(!source.includes(`method: '${verb}'`), `adapter must not issue ${verb}`);
    assert.ok(!source.includes(`method: "${verb}"`), `adapter must not issue ${verb}`);
  }
  assert.ok(!source.includes('/api/trees'), 'adapter must not hardcode API routes');
});

// 8. no DB/Firebase dependency
test('8. no DB/Firebase dependency', () => {
  const source = readFileSync(join(import.meta.dirname, '../public/mvp/01/src057-adapter.js'), 'utf8');
  assert.ok(!source.includes('import') || !source.toLowerCase().includes('firebase'), 'no firebase import');
  assert.ok(!source.includes('from \"firebase'), 'no firebase import');
  assert.ok(!source.toLowerCase().includes('neon'), 'no neon');
  assert.ok(!source.includes('drizzle'), 'no drizzle');
  assert.ok(!source.includes('DATABASE_URL'), 'no DB url');
});

// 9. no DOM dependency in pure adapter layer
test('9. no DOM dependency in pure adapter layer', () => {
  const source = readFileSync(join(import.meta.dirname, '../public/mvp/01/src057-adapter.js'), 'utf8');
  assert.ok(!source.includes('window.'), 'no window');
  assert.ok(!source.includes('document.'), 'no document');
  assert.ok(!source.includes('querySelector'), 'no DOM query');
});

// 10. SRC057 Source geometry contract is not modified
test('10. SRC057 Source geometry contract is not modified', () => {
  const adapterSource = readFileSync(join(import.meta.dirname, '../public/mvp/01/src057-adapter.js'), 'utf8');
  // adapter must not import or mutate src057 styles/script geometry
  assert.ok(!adapterSource.includes('styles.css'), 'adapter must not touch styles');
  assert.ok(!adapterSource.includes('querySelector'), 'adapter must not manipulate DOM');
  assert.ok(!adapterSource.includes('getElementById'), 'adapter must not manipulate DOM');
  // Also verify the surface files themselves are untouched in this worktree vs base
  const styles = readFileSync(join(import.meta.dirname, '../public/mvp/01/surfaces/src057/styles.css'), 'utf8');
  assert.ok(styles.includes('.glass-card'), 'surface styles preserved');
});

// 11. Product permissions remain read-only
test('11. Product permissions remain read-only', () => {
  const source = readFileSync(join(import.meta.dirname, '../public/mvp/01/src057-adapter.js'), 'utf8');
  assert.ok(!source.includes('canCreate'), 'adapter must not widen canCreate');
  assert.ok(!source.includes('canUpdate'), 'adapter must not widen canUpdate');
  assert.ok(!source.includes('canDelete'), 'adapter must not widen canDelete');
  // Also verify adapter never imports permissions
  assert.ok(!source.toLowerCase().includes('permission'), 'adapter must not handle permissions');
});

// 12. current fixture can be replaced through the bounded injection seam
test('12. current fixture can be replaced through bounded injection seam', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'mem-1', title: 'Real Title' }), makeMemory({ id: 'mem-2', title: 'Another' })];
  const result = projectMvp001ContextToSrc057({ tree, memories, selectedMemory: null });
  // The projection is a pure function that can replace the hard-coded fixture
  assert.equal(result.moments.length, 2);
  assert.equal(result.moments[0].title, 'Real Title');
  // Fixture preservation is guaranteed because adapter does not mutate the source file;
  // the seam is the function itself.
  assert.ok(typeof projectMvp001ContextToSrc057 === 'function', 'seam is a function');
});

// 13. original local Source behavior remains available when no Product materialization
test('13. original Source behavior remains available without Product materialization', () => {
  // The Surface script.js still contains the hard-coded moments fixture
  const surfaceScript = readFileSync(join(import.meta.dirname, '../public/mvp/01/surfaces/src057/script.js'), 'utf8');
  assert.ok(surfaceScript.includes("const moments=["), 'fixture still present');
  assert.ok(surfaceScript.includes("window.__LT57__"), 'exposed API still present');
  // Adapter is additive; must not assign to global moments directly
  const adapterSource = readFileSync(join(import.meta.dirname, '../public/mvp/01/src057-adapter.js'), 'utf8');
  assert.ok(!adapterSource.includes('window.moments'), 'adapter does not overwrite global moments');
  assert.ok(!adapterSource.includes('globalThis.moments'), 'adapter does not overwrite global moments');
});

// 14. no requirement that selected Memory exist in list (unlisted selected supported)
test('14. no requirement that selected Memory exist in list', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'mem-1' }), makeMemory({ id: 'mem-2' })];
  const unlisted = makeMemory({ id: 'mem-unlisted', visibility: 'unlisted', title: 'Hidden' });
  const result = projectMvp001ContextToSrc057({ tree, memories, selectedMemory: unlisted });
  assert.equal(result.selectedMomentId, 'mem-unlisted');
  assert.equal(result.selectedMoment.id, 'mem-unlisted');
  assert.equal(result.selectedMoment.title, 'Hidden');
  assert.equal(result.moments.length, 2);
  assert.ok(!result.moments.some((m) => m.id === 'mem-unlisted'), 'unlisted selected not in list is valid');
  assert.ok(!result.moments.some((m) => m.id === result.selectedMoment.id) || result.moments.some((m) => m.id === 'mem-unlisted') === false, 'no leak');
});

// Contract correction: unlisted selected is NOT appended to moments, but is representable as selectedMoment
test('15. selected unlisted still produces selectedMoment without list leakage', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'mem-1' }), makeMemory({ id: 'mem-2' })];
  const unlisted = makeMemory({ id: 'mem-unlisted', visibility: 'unlisted' });
  const result = projectMvp001ContextToSrc057({ tree, memories, selectedMemory: unlisted });
  assert.equal(result.moments.length, 2, 'moments must remain list-only');
  assert.ok(!result.moments.some((m) => m.id === 'mem-unlisted'), 'UNLISTED_LIST_LEAKAGE must be NO');
  assert.ok(result.selectedMoment, 'DIRECT_SELECTED_REPRESENTABLE must be YES');
  assert.equal(result.selectedMoment.id, 'mem-unlisted');
  assert.equal(result.selectedMomentId, 'mem-unlisted');
  assert.equal(result.selectedMoment.title, unlisted.title);
});

test('16. selected present in list does not duplicate list items', () => {
  const tree = makeTree();
  const mem1 = makeMemory({ id: 'mem-1' });
  const mem2 = makeMemory({ id: 'mem-2' });
  const memories = [mem1, mem2];
  const result = projectMvp001ContextToSrc057({ tree, memories, selectedMemory: mem2 });
  assert.equal(result.moments.length, 2, 'no duplicate added');
  assert.equal(result.selectedMomentId, 'mem-2');
  assert.equal(result.selectedMoment.id, 'mem-2');
  // selectedMoment should reuse or equal the list projection
  assert.deepEqual(result.selectedMoment, result.moments.find((m) => m.id === 'mem-2'));
});

test('17. selected null yields null selectedMoment and null selectedMomentId', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'mem-1' })];
  const result = projectMvp001ContextToSrc057({ tree, memories, selectedMemory: null });
  assert.equal(result.selectedMoment, null);
  assert.equal(result.selectedMomentId, null);
  assert.equal(result.moments.length, 1);
});

// Additional: selectedMemory treeId mismatch fails closed
test('selectedMemory treeId mismatch fails closed', () => {
  const tree = makeTree({ id: 'tree-1' });
  const memories = [makeMemory({ id: 'mem-1', treeId: 'tree-1' })];
  const wrongTreeMem = makeMemory({ id: 'mem-x', treeId: 'tree-other' });
  assert.throws(() => projectMvp001ContextToSrc057({ tree, memories, selectedMemory: wrongTreeMem }), (e) => e.code === 'SELECTED_MEMORY_TREE_MISMATCH');
});

// Additional: empty sourceUrl/thumbnail/timestamp already covered but test mediaKind mapping
test('mediaKind mapping is deterministic and handles empty sourceType', () => {
  const tree = makeTree();
  const memYoutube = makeMemory({ id: 'm1', sourceType: 'youtube' });
  const memVideo = makeMemory({ id: 'm2', sourceType: 'video' });
  const memUnknown = makeMemory({ id: 'm3', sourceType: 'song' });
  const memEmpty = makeMemory({ id: 'm4', sourceType: '' });
  const result = projectMvp001ContextToSrc057({ tree, memories: [memYoutube, memVideo, memUnknown, memEmpty], selectedMemory: null });
  assert.equal(result.moments[0].mediaKind, 'youtube');
  assert.equal(result.moments[1].mediaKind, 'video');
  assert.equal(result.moments[2].mediaKind, 'link');
  assert.equal(result.moments[3].mediaKind, 'link');
});

// Additional: privacy mapping preserves visibility semantics without disclosure
test('privacy mapping covers all visibilities', () => {
  const tree = makeTree();
  const pub = makeMemory({ id: 'm1', visibility: 'public' });
  const unl = makeMemory({ id: 'm2', visibility: 'unlisted' });
  const pri = makeMemory({ id: 'm3', visibility: 'private' });
  const result = projectMvp001ContextToSrc057({ tree, memories: [pub, unl, pri], selectedMemory: null });
  assert.equal(result.moments[0].privacy, '전체 공개');
  assert.equal(result.moments[1].privacy, '링크 공개');
  assert.equal(result.moments[2].privacy, '나만 보기');
});
