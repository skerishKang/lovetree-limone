import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  projectMemoryToSrc058Moment,
  projectMvp001ContextToSrc058,
} from '../public/mvp/01/src058-adapter.js';

function makeTree(overrides = {}) {
  return { id: 'tree-1', title: 'Tree', visibility: 'public', ...overrides };
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

// Helper to extract source moments directly from frozen script
function extractSourceMoments() {
  const script = readFileSync(join(import.meta.dirname, '../public/mvp/01/surfaces/src058/script.js'), 'utf8');
  const start = script.indexOf('let moments=[');
  assert.ok(start !== -1, 'frozen moments must exist');
  let end = -1;
  let depth = 0, inStr = false, esc = false, q = '';
  for (let i = start; i < script.length; i++) {
    const ch = script[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === q) inStr = false;
      continue;
    } else {
      if (ch === "'" || ch === '"') { inStr = true; q = ch; continue; }
      if (ch === '[') depth++;
      else if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
  }
  assert.ok(end !== -1, 'moments end must be found');
  let s = script.slice(start, end + 1);
  // Replace data URLs for parsing
  s = s.replace(/asset:ASSET\.\w+/g, "asset:null");
  s = s.replace(/video:ASSET\.\w+/g, "video:null");
  // Extract count via id
  const count = (s.match(/id:/g) || []).length;
  return { script, count, start, end };
}

test('1. frozen Source initial Moment fixture extracted directly', () => {
  const { count } = extractSourceMoments();
  assert.equal(count, 7, 'INITIAL_SOURCE_FIXTURE_COUNT must be 7');
});

test('2. initial fixture count = 7', () => {
  const tree = makeTree();
  const { count } = extractSourceMoments();
  assert.equal(count, 7);
  // Adapter with 7 memories should produce 7 moments
  const memories = Array.from({ length: 7 }, (_, i) => makeMemory({ id: `m${i + 1}` }));
  const r = projectMvp001ContextToSrc058({ tree, memories, selectedMemory: null });
  assert.equal(r.moments.length, 7);
});

test('3. Source x/y/rot/color parity = 7/7', () => {
  const expected = [
    { x: 210, y: 255, rot: -4, color: 'rose' },
    { x: 535, y: 175, rot: 3, color: 'violet' },
    { x: 900, y: 245, rot: -2, color: 'cyan' },
    { x: 1175, y: 400, rot: 4, color: 'rose' },
    { x: 820, y: 595, rot: 2, color: 'violet' },
    { x: 390, y: 610, rot: -3, color: 'cyan' },
    { x: 1120, y: 690, rot: -2, color: 'amber' },
  ];
  const tree = makeTree();
  const memories = expected.map((_, i) => makeMemory({ id: `m${i + 1}` }));
  const r = projectMvp001ContextToSrc058({ tree, memories, selectedMemory: null });
  for (let i = 0; i < 7; i++) {
    assert.equal(r.moments[i].x, expected[i].x, `index ${i} x`);
    assert.equal(r.moments[i].y, expected[i].y, `index ${i} y`);
    assert.equal(r.moments[i].rot, expected[i].rot, `index ${i} rot`);
    assert.equal(r.moments[i].color, expected[i].color, `index ${i} color`);
  }
});

test('4. native-add x/y/rot/color formula anchored to Source', () => {
  const tree = makeTree();
  // Create 13 memories to test indices 7..12 (0-based, so 7 is 8th)
  const memories = Array.from({ length: 13 }, (_, i) => makeMemory({ id: `m${i + 1}` }));
  const r = projectMvp001ContextToSrc058({ tree, memories, selectedMemory: null });
  // Expected for index 7: x=620+(7%3)*120=740, y=360+(7%2)*100=460, rot=[-4,3,-2,4,2][7%5]=3? Wait 7%5=2 => -2, color 7%4=3 => amber
  const expected = [
    { index: 7, x: 740, y: 460, rot: -2, color: 'amber' },
    { index: 8, x: 860, y: 360, rot: 4, color: 'rose' },
    { index: 9, x: 620, y: 460, rot: 2, color: 'violet' },
    { index: 10, x: 740, y: 360, rot: -4, color: 'cyan' },
    { index: 11, x: 860, y: 460, rot: 3, color: 'amber' },
    { index: 12, x: 620, y: 360, rot: -2, color: 'rose' },
  ];
  for (const e of expected) {
    const card = r.moments[e.index];
    assert.equal(card.x, e.x, `index ${e.index} x`);
    assert.equal(card.y, e.y, `index ${e.index} y`);
    assert.equal(card.rot, e.rot, `index ${e.index} rot`);
    assert.equal(card.color, e.color, `index ${e.index} color`);
  }
});

test('5. keywords not fabricated', () => {
  const tree = makeTree();
  const r = projectMvp001ContextToSrc058({ tree, memories: [makeMemory({ id: 'm01' })], selectedMemory: null });
  assert.deepEqual(r.moments[0].keywords, [], 'keywords must be [] not fabricated');
  const src = readFileSync(join(import.meta.dirname, '../public/mvp/01/src058-adapter.js'), 'utf8');
  assert.ok(!src.includes('첫만남') && !src.includes('무대'), 'no fabricated keywords');
});

test('6. pinStyle uses Source presentation cycle', () => {
  const tree = makeTree();
  const memories = Array.from({ length: 8 }, (_, i) => makeMemory({ id: `m${i + 1}` }));
  const r = projectMvp001ContextToSrc058({ tree, memories, selectedMemory: null });
  const expected = ['pearl', 'crystal', 'flower', 'heart', 'star', 'magnet', 'disc', 'pearl'];
  for (let i = 0; i < 8; i++) {
    assert.equal(r.moments[i].pinStyle, expected[i], `pinStyle index ${i}`);
  }
});

test('7. cardStyle uses Source presentation cycle', () => {
  const tree = makeTree();
  const memories = Array.from({ length: 7 }, (_, i) => makeMemory({ id: `m${i + 1}` }));
  const r = projectMvp001ContextToSrc058({ tree, memories, selectedMemory: null });
  const expected = ['photo', 'postit', 'memo', 'rounded', 'film', 'ticket', 'photo'];
  for (let i = 0; i < 7; i++) {
    assert.equal(r.moments[i].cardStyle, expected[i], `cardStyle index ${i}`);
  }
});

test('8. createdOrder is view-derived index+1', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'm01' }), makeMemory({ id: 'm02' }), makeMemory({ id: 'm03' })];
  const r = projectMvp001ContextToSrc058({ tree, memories, selectedMemory: null });
  assert.equal(r.moments[0].createdOrder, 1);
  assert.equal(r.moments[1].createdOrder, 2);
  assert.equal(r.moments[2].createdOrder, 3);
});

test('9. public privacy presentation = PUBLIC', () => {
  const tree = makeTree();
  const r = projectMvp001ContextToSrc058({ tree, memories: [makeMemory({ id: 'm01', visibility: 'public' })], selectedMemory: null });
  assert.equal(r.moments[0].privacy, 'PUBLIC');
});

test('10. unlisted privacy presentation = UNLISTED', () => {
  const tree = makeTree();
  const r = projectMvp001ContextToSrc058({ tree, memories: [makeMemory({ id: 'm01', visibility: 'unlisted' })], selectedMemory: null });
  assert.equal(r.moments[0].privacy, 'UNLISTED');
});

test('11. private privacy presentation = PRIVATE', () => {
  const tree = makeTree();
  const r = projectMvp001ContextToSrc058({ tree, memories: [makeMemory({ id: 'm01', visibility: 'private' })], selectedMemory: null });
  assert.equal(r.moments[0].privacy, 'PRIVATE');
});

test('12. privacy does not perform authorization', () => {
  const tree = makeTree();
  const pub = makeMemory({ id: 'm01', visibility: 'public' });
  const pri = makeMemory({ id: 'm02', visibility: 'private' });
  const r = projectMvp001ContextToSrc058({ tree, memories: [pub, pri], selectedMemory: null });
  // Both are present in moments regardless of visibility; authorization is not performed here
  assert.equal(r.moments.length, 2);
  assert.equal(r.moments[0].privacy, 'PUBLIC');
  assert.equal(r.moments[1].privacy, 'PRIVATE');
});

test('13. YouTube sourceType remains native youtube', () => {
  const tree = makeTree();
  const yt = makeMemory({ id: 'm01', sourceType: 'youtube', sourceUrl: 'https://www.youtube.com/watch?v=abc123' });
  const r = projectMvp001ContextToSrc058({ tree, memories: [yt], selectedMemory: null });
  assert.equal(r.moments[0].type, 'youtube');
});

test('14. ordinary video remains video', () => {
  const tree = makeTree();
  const vid = makeMemory({ id: 'm01', sourceType: 'video', sourceUrl: 'https://example.com/video.mp4' });
  const r = projectMvp001ContextToSrc058({ tree, memories: [vid], selectedMemory: null });
  assert.equal(r.moments[0].type, 'video');
});

test('15. canonical sourceUrl preserved', () => {
  const tree = makeTree();
  const url = 'https://example.com/page?x=1';
  const m = makeMemory({ id: 'm01', sourceUrl: url });
  const r = projectMvp001ContextToSrc058({ tree, memories: [m], selectedMemory: null });
  assert.equal(r.moments[0].sourceUrl, url);
  assert.equal(r.moments[0].url, url);
});

test('16. no fabricated videoId/media source', () => {
  const tree = makeTree();
  const r = projectMvp001ContextToSrc058({ tree, memories: [makeMemory({ id: 'm01', sourceType: 'youtube', sourceUrl: 'https://www.youtube.com/watch?v=abc123' })], selectedMemory: null });
  assert.equal(r.moments[0].videoId, null);
  assert.equal(r.moments[0].videoSource, 'youtube');
  // For non-youtube, videoSource null
  const r2 = projectMvp001ContextToSrc058({ tree, memories: [makeMemory({ id: 'm02', sourceType: 'video' })], selectedMemory: null });
  assert.equal(r2.moments[0].videoSource, null);
});

test('17. Product connections = []', () => {
  const tree = makeTree();
  const r = projectMvp001ContextToSrc058({ tree, memories: [makeMemory({ id: 'm01' }), makeMemory({ id: 'm02' })], selectedMemory: null });
  assert.deepEqual(r.connections, [], 'product connections must be empty');
});

test('18. fixture connections not leaked', () => {
  const tree = makeTree();
  const r = projectMvp001ContextToSrc058({ tree, memories: [makeMemory({ id: 'm01' })], selectedMemory: null });
  // Fixture has c1..c6 with a/b, but product projection must not leak them
  assert.equal(r.connections.length, 0);
  const src = readFileSync(join(import.meta.dirname, '../public/mvp/01/src058-adapter.js'), 'utf8');
  assert.ok(!src.includes('c1') || src.includes('connections = []'), 'no fixture leakage');
});

test('19. no replayPath authority fabricated', () => {
  const tree = makeTree();
  const r = projectMvp001ContextToSrc058({ tree, memories: [makeMemory({ id: 'm01' }), makeMemory({ id: 'm02' })], selectedMemory: null });
  assert.ok(!('replayPath' in r), 'no replayPath in product projection');
  const src = readFileSync(join(import.meta.dirname, '../public/mvp/01/src058-adapter.js'), 'utf8');
  assert.ok(!src.includes('replayPath'), 'no replayPath fabrication');
});

test('20. no list-order next relationship', () => {
  const tree = makeTree();
  const r = projectMvp001ContextToSrc058({ tree, memories: [makeMemory({ id: 'm01' }), makeMemory({ id: 'm02' })], selectedMemory: null });
  assert.ok(!('next' in r.moments[0]) || r.moments[0].next === undefined || r.moments[0].next === null, 'no next relationship from list order');
  // Our moments have no next field (we removed it)
  assert.equal(r.moments[0].next, undefined);
});

test('21. selected independent of list', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'm01' }), makeMemory({ id: 'm02' })];
  const selected = makeMemory({ id: 'm99', visibility: 'unlisted' });
  const r = projectMvp001ContextToSrc058({ tree, memories, selectedMemory: selected });
  assert.equal(r.selectedId, 'm99');
  assert.equal(r.selectedMoment.id, 'm99');
  assert.ok(!r.moments.some((m) => m.id === 'm99'));
});

test('22. unlisted selected independent', () => {
  const tree = makeTree();
  const r = projectMvp001ContextToSrc058({ tree, memories: [makeMemory({ id: 'm01' })], selectedMemory: makeMemory({ id: 'm-unlisted', visibility: 'unlisted' }) });
  assert.equal(r.selectedMoment.id, 'm-unlisted');
  assert.ok(!r.moments.some((m) => m.id === 'm-unlisted'));
});

test('23. selected outside list not appended', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'm01' })];
  const selected = makeMemory({ id: 'm99' });
  const r = projectMvp001ContextToSrc058({ tree, memories, selectedMemory: selected });
  assert.equal(r.moments.length, 1);
  assert.ok(!r.moments.some((m) => m.id === 'm99'));
});

test('24. standalone selected first=false', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'm01' }), makeMemory({ id: 'm02' })];
  const unlisted = makeMemory({ id: 'm-unlisted' });
  const r = projectMvp001ContextToSrc058({ tree, memories, selectedMemory: unlisted });
  assert.equal(r.selectedMoment.first, false, 'standalone must not be FIRST');
});

test('25. ordinary first item first=true', () => {
  const tree = makeTree();
  const memories = [makeMemory({ id: 'm01' }), makeMemory({ id: 'm02' })];
  const r = projectMvp001ContextToSrc058({ tree, memories, selectedMemory: null });
  assert.equal(r.moments[0].first, true);
  assert.equal(r.moments[1].first, false);
});

test('26. videoOffsetSeconds not duration', () => {
  const tree = makeTree();
  const mem = makeMemory({ id: 'm01', videoOffsetSeconds: 120, sourceType: 'video' });
  const r = projectMvp001ContextToSrc058({ tree, memories: [mem], selectedMemory: null });
  assert.equal(r.moments[0].duration, '');
  assert.notEqual(String(r.moments[0].duration), String(mem.videoOffsetSeconds));
});

test('27. no fetch/write', () => {
  const src = readFileSync(join(import.meta.dirname, '../public/mvp/01/src058-adapter.js'), 'utf8');
  assert.ok(!src.includes('fetch('), 'no fetch');
  for (const verb of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.ok(!src.includes(`method: '${verb}'`));
  }
});

test('28. no DB/Firebase', () => {
  const src = readFileSync(join(import.meta.dirname, '../public/mvp/01/src058-adapter.js'), 'utf8');
  assert.ok(!src.toLowerCase().includes('neon'), 'no neon');
  assert.ok(!src.includes('DATABASE_URL'), 'no DB');
});

test('29. no DOM dependency in pure layer', () => {
  const src = readFileSync(join(import.meta.dirname, '../public/mvp/01/src058-adapter.js'), 'utf8');
  assert.ok(!src.includes('window.'), 'no window');
  assert.ok(!src.includes('document.'), 'no document');
});

test('30. Source runtime untouched', () => {
  const script = readFileSync(join(import.meta.dirname, '../public/mvp/01/surfaces/src058/script.js'), 'utf8');
  assert.ok(script.includes('let moments=['), 'fixture preserved');
  assert.ok(script.includes("id:'m1'"), 'first preserved');
  assert.ok(script.includes('let connections=['), 'connections preserved');
});

test('31. CSS/thread/RAF/cinema untouched', () => {
  const styles = readFileSync(join(import.meta.dirname, '../public/mvp/01/surfaces/src058/styles.css'), 'utf8');
  assert.ok(styles.includes('.boardWorld') || styles.includes('.threads'), 'styles preserved');
  const script = readFileSync(join(import.meta.dirname, '../public/mvp/01/surfaces/src058/script.js'), 'utf8');
  assert.ok(script.includes('threadLayer') && script.includes('cinema'), 'thread/cinema preserved');
});
