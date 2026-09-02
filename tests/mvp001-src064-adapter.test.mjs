import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  projectMemoryToSrc064Card,
  projectMvp001ContextToSrc064,
} from '../public/mvp/01/src064-adapter.js';

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
    timestamp: '2026-01-01',
    visibility: 'public',
    memo: 'note',
    artist: 'Artist',
    sourceType: 'link',
    emotionTags: ['기쁨'],
    discoveryDate: '2026-01-01',
    videoOffsetSeconds: 0,
    connectionReason: 'why next',
    parentId: null,
    ...overrides,
  };
}

test('1. deterministic projection preserves order and family ring', () => {
  const tree = makeTree();
  const memories = [
    makeMemory({ id: 'm01' }),
    makeMemory({ id: 'm02' }),
    makeMemory({ id: 'm03' }),
    makeMemory({ id: 'm04' }),
    makeMemory({ id: 'm05' }),
    makeMemory({ id: 'm06' }),
  ];
  const a = projectMvp001ContextToSrc064({ tree, memories, selectedMemory: null });
  const b = projectMvp001ContextToSrc064({ tree, memories, selectedMemory: null });
  assert.deepEqual(a, b);
  assert.equal(a.cards.length, 6);
  assert.deepEqual(a.cards.map((c) => c.ring), ['main', 'inner', 'outer', 'upper', 'lower', 'main']);
  assert.equal(a.cards[0].next, 'm02');
  assert.equal(a.cards[5].next, null);
  assert.equal(a.cards[0].id, 'm01');
});

test('2. selected independent of list membership', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'm01' }), makeMemory({ id: 'm02' })];
  const selected = makeMemory({ id: 'm99', visibility: 'unlisted', title: 'Hidden' });
  const r = projectMvp001ContextToSrc064({ tree, memories, selectedMemory: selected });
  assert.equal(r.selectedCardId, 'm99');
  assert.equal(r.selectedCard.id, 'm99');
  assert.equal(r.focusedId, 'm99');
  assert.ok(!r.cards.some((c) => c.id === 'm99'), 'selected must not leak into cards');
  assert.equal(r.cards.length, 2);
});

test('3. no unlisted list leakage', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'm01' })];
  const unlisted = makeMemory({ id: 'm-unlisted', visibility: 'unlisted' });
  const r = projectMvp001ContextToSrc064({ tree, memories, selectedMemory: unlisted });
  assert.equal(r.cards.length, 1);
  assert.ok(!r.cards.some((c) => c.id === 'm-unlisted'));
  assert.equal(r.selectedCard.id, 'm-unlisted');
});

test('4. selected present in list does not duplicate', () => {
  const tree = makeTree();
  const m1 = makeMemory({ id: 'm01' });
  const m2 = makeMemory({ id: 'm02' });
  const r = projectMvp001ContextToSrc064({ tree, memories: [m1, m2], selectedMemory: m2 });
  assert.equal(r.cards.length, 2);
  assert.equal(r.selectedCard.id, 'm02');
  assert.deepEqual(r.selectedCard, r.cards.find((c) => c.id === 'm02'));
  assert.equal(r.focusedCard.id, 'm02');
});

test('5. selected null yields null fields', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'm01' })];
  const r = projectMvp001ContextToSrc064({ tree, memories, selectedMemory: null });
  assert.equal(r.selectedCard, null);
  assert.equal(r.selectedCardId, null);
  assert.equal(r.focusedCard, null);
  assert.equal(r.focusedId, null);
});

test('6. empty presentation fields do not crash', () => {
  const tree = makeTree();
  const mem = makeMemory({ id: 'm01', title: '', sourceUrl: '', thumbnail: '', timestamp: '', discoveryDate: '' });
  const r = projectMvp001ContextToSrc064({ tree, memories: [mem], selectedMemory: null });
  assert.equal(r.cards[0].title, '');
  assert.equal(r.cards[0].image, '');
  assert.equal(r.cards[0].date, '');
  // empty tree title also valid (structural only id required)
  const tree2 = makeTree({ title: '' });
  const r2 = projectMvp001ContextToSrc064({ tree: tree2, memories: [mem], selectedMemory: null });
  assert.equal(r2.cards[0].title, '');
});

test('7. malformed identity fails closed', () => {
  const tree = makeTree({ id: '' });
  const mem = makeMemory({ id: 'm01' });
  assert.throws(() => projectMvp001ContextToSrc064({ tree, memories: [mem], selectedMemory: null }), (e) => e.code === 'INVALID_IDENTITY');
  const bad = makeMemory({ id: '' });
  assert.throws(() => projectMvp001ContextToSrc064({ tree: makeTree(), memories: [bad], selectedMemory: null }), (e) => e.code === 'INVALID_IDENTITY');
  const bad2 = makeMemory({ id: 'm01', treeId: '' });
  assert.throws(() => projectMemoryToSrc064Card(bad2, 0, [bad2]), (e) => e.code === 'INVALID_IDENTITY');
  const bad3 = { id: 'm01', title: '', sourceUrl: '', thumbnail: '', timestamp: '', visibility: 'public' };
  assert.throws(() => projectMemoryToSrc064Card(bad3, 0, [bad3]), (e) => e.code === 'INVALID_IDENTITY');
});

test('8. treeId mismatch fails closed', () => {
  const tree = makeTree({ id: 'tree-1' });
  const mem = makeMemory({ id: 'm01', treeId: 'tree-1' });
  const wrong = makeMemory({ id: 'm99', treeId: 'tree-other' });
  assert.throws(() => projectMvp001ContextToSrc064({ tree, memories: [mem], selectedMemory: wrong }), (e) => e.code === 'SELECTED_MEMORY_TREE_MISMATCH');
});

test('9. no fetch/write dependency', () => {
  const src = readFileSync(join(import.meta.dirname, '../public/mvp/01/src064-adapter.js'), 'utf8');
  assert.ok(!src.includes('fetch('), 'no fetch');
  assert.ok(!src.includes('fetchImpl'), 'no fetchImpl');
  for (const verb of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.ok(!src.includes(`method: '${verb}'`), `no ${verb}`);
    assert.ok(!src.includes(`method: "${verb}"`), `no ${verb}`);
  }
  assert.ok(!src.includes('/api/trees'), 'no API route');
});

test('10. no DB/Firebase dependency', () => {
  const src = readFileSync(join(import.meta.dirname, '../public/mvp/01/src064-adapter.js'), 'utf8');
  assert.ok(!src.toLowerCase().includes('neon'), 'no neon');
  assert.ok(!src.includes('drizzle'), 'no drizzle');
  assert.ok(!src.includes('DATABASE_URL'), 'no DB url');
  assert.ok(!src.includes('from \"firebase') && !src.includes("from 'firebase"), 'no firebase import');
});

test('11. no DOM dependency in pure layer', () => {
  const src = readFileSync(join(import.meta.dirname, '../public/mvp/01/src064-adapter.js'), 'utf8');
  assert.ok(!src.includes('window.'), 'no window');
  assert.ok(!src.includes('document.'), 'no document');
  assert.ok(!src.includes('querySelector'), 'no DOM');
  assert.ok(!src.includes('getElementById'), 'no DOM');
});

test('12. static welcome copy untouched', () => {
  const html = readFileSync(join(import.meta.dirname, '../public/mvp/01/surfaces/src064/index.html'), 'utf8');
  assert.ok(html.includes('WELCOME BACK'), 'welcome copy preserved');
  assert.ok(html.includes('다시, 그 순간으로.'), 'welcome copy preserved');
  assert.ok(html.includes('기억은 아직 여기에서 이어지고 있어요.'), 'welcome copy preserved');
  const adapter = readFileSync(join(import.meta.dirname, '../public/mvp/01/src064-adapter.js'), 'utf8');
  assert.ok(!adapter.includes('WELCOME BACK'), 'adapter must not hardcode welcome copy');
  assert.ok(!adapter.includes('Tree.title'), 'adapter must not replace hero with tree title');
});

test('13. original 40-moment fixture preserved', () => {
  const script = readFileSync(join(import.meta.dirname, '../public/mvp/01/surfaces/src064/script.js'), 'utf8');
  assert.ok(script.includes('const CARDS=['), 'fixture preserved');
  assert.ok(script.includes('"id":"m01"'), 'first card preserved');
  assert.ok(script.includes('"id":"m40"'), 'last card preserved');
  assert.ok(script.includes('window.__TRACK64__'), 'global exposure preserved');
  const adapter = readFileSync(join(import.meta.dirname, '../public/mvp/01/src064-adapter.js'), 'utf8');
  assert.ok(!adapter.includes('window.__TRACK64__'), 'adapter does not mutate global');
  assert.ok(!adapter.includes('CARDS ='), 'adapter does not overwrite CARDS');
});

test('14. Source geometry/CSS/animation untouched', () => {
  const adapter = readFileSync(join(import.meta.dirname, '../public/mvp/01/src064-adapter.js'), 'utf8');
  assert.ok(!adapter.includes('styles.css'), 'no CSS touch');
  assert.ok(!adapter.includes('requestAnimationFrame') || adapter.includes('geometry') === false, 'no RAF hijack');
  const styles = readFileSync(join(import.meta.dirname, '../public/mvp/01/surfaces/src064/styles.css'), 'utf8');
  assert.ok(styles.includes('.world') || styles.includes('.app'), 'styles preserved');
  const script = readFileSync(join(import.meta.dirname, '../public/mvp/01/surfaces/src064/script.js'), 'utf8');
  assert.ok(script.includes('orbit') || script.includes('CARDS'), 'orbit preserved');
});

test('15. read-only permissions not widened', () => {
  const src = readFileSync(join(import.meta.dirname, '../public/mvp/01/src064-adapter.js'), 'utf8');
  assert.ok(!src.includes('canCreate'), 'no canCreate');
  assert.ok(!src.includes('canUpdate'), 'no canUpdate');
  assert.ok(!src.includes('canDelete'), 'no canDelete');
});

test('16. control classification deterministic', () => {
  // This test documents the classification; adapter itself does not wire controls,
  // but we assert the surface controls exist and adapter does not wire them.
  const html = readFileSync(join(import.meta.dirname, '../public/mvp/01/surfaces/src064/index.html'), 'utf8');
  assert.ok(html.includes('data-action="continue"'), 'continue control exists');
  assert.ok(html.includes('data-action="first"'), 'first control exists');
  assert.ok(html.includes('data-action="tree"'), 'tree control exists');
  assert.ok(html.includes('id="prevMoment"'), 'prev control exists');
  assert.ok(html.includes('id="nextMoment"'), 'next control exists');
  assert.ok(html.includes('id="branchChoice"'), 'branch choice exists');
  // Adapter must not handle navigation directly
  const adapter = readFileSync(join(import.meta.dirname, '../public/mvp/01/src064-adapter.js'), 'utf8');
  assert.ok(!adapter.includes('prevMoment'), 'adapter does not wire prev');
  assert.ok(!adapter.includes('nextMoment'), 'adapter does not wire next');
});

test('17. mediaType mapping and privacy mapping', () => {
  const tree = makeTree();
  const youtube = makeMemory({ id: 'm1', sourceType: 'youtube' });
  const video = makeMemory({ id: 'm2', sourceType: 'video' });
  const image = makeMemory({ id: 'm3', sourceType: 'image' });
  const text = makeMemory({ id: 'm4', sourceType: 'text' });
  const unknown = makeMemory({ id: 'm5', sourceType: 'song' });
  const r = projectMvp001ContextToSrc064({ tree, memories: [youtube, video, image, text, unknown], selectedMemory: null });
  assert.equal(r.cards[0].mediaType, 'video');
  assert.equal(r.cards[1].mediaType, 'video');
  assert.equal(r.cards[2].mediaType, 'photo');
  assert.equal(r.cards[3].mediaType, 'memo');
  assert.equal(r.cards[4].mediaType, 'photo');
  const pub = makeMemory({ id: 'm1', visibility: 'public' });
  const unl = makeMemory({ id: 'm2', visibility: 'unlisted' });
  const pri = makeMemory({ id: 'm3', visibility: 'private' });
  const r2 = projectMvp001ContextToSrc064({ tree, memories: [pub, unl, pri], selectedMemory: null });
  assert.equal(r2.cards.length, 3);
});

test('18. videoOffsetSeconds is NOT treated as media duration', () => {
  const tree = makeTree();
  const mem = makeMemory({ id: 'm01', videoOffsetSeconds: 120, sourceType: 'video' });
  const r = projectMvp001ContextToSrc064({ tree, memories: [mem], selectedMemory: null });
  assert.equal(r.cards[0].duration, '', 'duration must remain safe default, not videoOffsetSeconds');
  assert.notEqual(String(r.cards[0].duration), String(mem.videoOffsetSeconds), 'no silent mapping');
  // Also test with different offset
  const mem2 = makeMemory({ id: 'm02', videoOffsetSeconds: 999 });
  const r2 = projectMvp001ContextToSrc064({ tree, memories: [mem2], selectedMemory: null });
  assert.equal(r2.cards[0].duration, '');
});

test('19. actual duration projection is empty safe default without fake synthesis', () => {
  const tree = makeTree();
  const mem = makeMemory({ id: 'm01' });
  // Memory has no canonical duration field; adapter must not invent one
  delete mem.duration;
  const r = projectMvp001ContextToSrc064({ tree, memories: [mem], selectedMemory: null });
  assert.equal(r.cards[0].duration, '', 'duration must be empty string when no canonical field');
  assert.equal(typeof r.cards[0].duration, 'string', 'duration must be string');
  // Verify source does not synthesize fake duration like "0:00" or numeric
  const src = readFileSync(join(import.meta.dirname, '../public/mvp/01/src064-adapter.js'), 'utf8');
  assert.ok(!src.includes('videoOffsetSeconds'), 'adapter must not reference videoOffsetSeconds for duration');
});

test('20. empty/missing duration does not crash adapter or runtime contract', () => {
  const tree = makeTree();
  const mem = makeMemory({ id: 'm01', videoOffsetSeconds: 0 });
  const r = projectMvp001ContextToSrc064({ tree, memories: [mem], selectedMemory: null });
  // Simulate SRC064 surface rendering: `<div class="duration">${c.duration}</div>` must not throw when duration is ''
  const rendered = `<div class="duration">${r.cards[0].duration}</div>`;
  assert.equal(rendered, '<div class="duration"></div>', 'empty duration must render safely');
  assert.doesNotThrow(() => projectMvp001ContextToSrc064({ tree, memories: [makeMemory({ id: 'm01', videoOffsetSeconds: null })], selectedMemory: null }));
});
