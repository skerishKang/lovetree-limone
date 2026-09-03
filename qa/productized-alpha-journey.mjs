// Productized Alpha read-only journey verification (Playwright, deterministic).
//
// NOT part of the default `npm test` run and NOT in the A-track browser
// inventory (no workflow change in this slice). Run explicitly against a local
// production server:
//
//   npm run build && (npm start &)
//   ALPHA_QA_URL=http://127.0.0.1:3000 \
//   ALPHA_SCREENSHOT_DIR=/tmp/productized-alpha-evidence \
//   node qa/productized-alpha-journey.mjs
//
// Strategy: Playwright route interception fulfills /api/* with canonical
// fixtures (no accounts, no DB, no production data). The real shell +
// real surfaces + real companions run. Assertions prove: standalone fixture
// intact, Product mode fixture-free, canonical id roundtrip per Source,
// five-step continuity, negatives fail closed, desktop+mobile evidence.

import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.ALPHA_QA_URL ?? 'http://127.0.0.1:3000';
const shotDir = process.env.ALPHA_SCREENSHOT_DIR ?? '/tmp/productized-alpha-evidence';

const TREE = { id: 'alpha-tree-1', title: 'Alpha Canonical Tree', visibility: 'private' };
const M1 = {
  id: 'alpha-m1', treeId: TREE.id, title: 'Alpha First Light', memo: 'Canonical root note',
  artist: 'Alpha Artist', source: '', channelName: '', sourceType: 'link',
  sourceUrl: 'https://example.com/alpha-1', thumbnail: 'https://example.com/alpha-1.jpg',
  timestamp: '2026-02-01', discoveryDate: '2026-02-01', emotionTags: ['calm'],
  visibility: 'private', parentId: null, connectionReason: null, videoOffsetSeconds: null,
  sortOrder: 1, createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
};
const M2 = {
  ...M1, id: 'alpha-m2', title: 'Alpha Second Path', parentId: 'alpha-m1',
  connectionReason: '첫 빛이 다음 기억으로 이어졌다', sortOrder: 2,
};
const M3 = {
  ...M1, id: 'alpha-m3', title: 'Alpha Quiet Leaf', parentId: 'alpha-m1',
  connectionReason: '같은 밤의 감정이 닿았다', sortOrder: 3,
};
const MEMORIES = [M1, M2, M3];
const BY_ID = Object.fromEntries(MEMORIES.map((m) => [m.id, m]));

const FIXTURE_TOKENS = [
  'FIRST GLIMPSE', '첫 입덕의 밀도', '무대와 공연', '처음 눈에 들어온 무대',
  '처음 빠져든 순간', 'Track 59', 'Track59', '민준', 'First Moment',
];

const STEPS = [
  { id: 'entry', src: 'SRC064', surface: '/mvp/01/surfaces/src064/index.html' },
  { id: 'board', src: 'SRC058', surface: '/mvp/01/surfaces/src058/index.html' },
  { id: 'relationships', src: 'SRC056', surface: '/mvp/01/surfaces/src056/index.html' },
  { id: 'memory', src: 'SRC057', surface: '/mvp/01/surfaces/src057/index.html' },
  { id: 'explore', src: 'SRC060', surface: '/mvp/01/surfaces/src060/index.html' },
];

let passed = 0;
function check(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`ok - ${name}`);
}

async function expandShellNav(page) {
  await page.waitForFunction(() => !!document.getElementById('mvp-shell-nav'), null, { timeout: 10000 });
  const collapsed = await page.evaluate(() => document.getElementById('mvp-shell-nav').classList.contains('collapsed'));
  if (collapsed) {
    await page.locator('#toggle-nav-btn').click();
    await page.waitForFunction(
      () => !document.getElementById('mvp-shell-nav')?.classList.contains('collapsed'),
      null,
      { timeout: 5000 },
    );
  }
}

async function gotoShellStep(page, stepId) {
  const target = STEPS.findIndex((s) => s.id === stepId);
  if (target < 0) throw new Error(`unknown step ${stepId}`);
  const mobileNav = await page.evaluate(() => innerWidth <= 640);
  if (!mobileNav) {
    await expandShellNav(page);
    const chip = page.locator(`.step-chip[data-step-id="${stepId}"]`);
    await chip.waitFor({ state: 'visible', timeout: 5000 });
    await chip.click();
    return;
  }
  // Shell contract at <=640px: .mvp-nav-steps is display:none, so step chips
  // are NEVER visible even when expanded. Walk the real prev/next UI instead.
  for (let guard = 0; guard < STEPS.length; guard++) {
    const at = await page.evaluate(() => new URL(location.href).searchParams.get('step'));
    if (at === stepId) return;
    const current = STEPS.findIndex((s) => s.id === at);
    if (current < 0) throw new Error(`URL step unreadable on mobile: ${at}`);
    await expandShellNav(page);
    await page.locator(current < target ? '#next-btn' : '#prev-btn').click();
    await page.waitForFunction((prev) => new URL(location.href).searchParams.get('step') !== prev, at, { timeout: 10000 });
  }
  throw new Error(`mobile nav could not reach step ${stepId}`);
}

// Deterministic QA fixture media (QA_EVIDENCE_FIXTURE_DEFECT fix).
// Canonical Alpha thumbnails (https://example.com/alpha-*.jpg) are served as
// stable 1x1 PNG bytes. No external network, no production/Source mutation.
const DETERMINISTIC_ALPHA_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

async function installDeterministicMediaRoute(page) {
  await page.route('https://example.com/alpha-*.jpg', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: DETERMINISTIC_ALPHA_PNG }));
}

async function assertCanonicalMediaDecoded(frame, src) {
  await frame.waitForFunction(
    () => {
      try {
        const imgs = [...document.querySelectorAll('img')].filter((img) => {
          try {
            return String(img.src || '').includes('example.com/alpha-');
          } catch {
            return false;
          }
        });
        return imgs.length > 0 && imgs.every((img) => {
          try {
            return !!img.complete && (img.naturalWidth | 0) > 0 && (img.naturalHeight | 0) > 0;
          } catch {
            return false;
          }
        });
      } catch {
        return false;
      }
    },
    null,
    { timeout: 15000 },
  );
  const proof = await frame.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter((img) => {
      try {
        return String(img.src || '').includes('example.com/alpha-');
      } catch {
        return false;
      }
    });
    const details = imgs.map((img) => ({
      src: String(img.src || ''),
      complete: !!img.complete,
      naturalWidth: img.naturalWidth | 0,
      naturalHeight: img.naturalHeight | 0,
    }));
    const broken = details.filter((d) => !(d.complete && d.naturalWidth > 0 && d.naturalHeight > 0)).length;
    return { total: imgs.length, broken, details };
  });
  assert.ok(proof.total > 0, `${src} canonical media imgs present`);
  assert.equal(proof.broken, 0, `${src} BROKEN_IMAGE_COUNT=0 (total ${proof.total})`);
  passed += 2;
  console.log(`ok - ${src} canonical media decoded (total=${proof.total} broken=${proof.broken})`);
  return proof;
}

async function installApiRoutes(page, { tree = TREE, memories = MEMORIES, fail = null } = {}) {
  await installDeterministicMediaRoute(page);
  await page.route('**/api/trees/*/memories*', async (route) => {
    if (fail) return route.fulfill({ status: fail, contentType: 'application/json', body: '{}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(memories) });
  });
  await page.route('**/api/memories/*', async (route) => {
    if (fail) return route.fulfill({ status: fail, contentType: 'application/json', body: '{}' });
    const id = route.request().url().split('/').pop().split('?')[0];
    const found = BY_ID[id] ?? memories.find((m) => m.id === id);
    if (!found) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(found) });
  });
  await page.route('**/api/trees/*', async (route) => {
    if (route.request().url().includes('/memories')) return route.fallback();
    if (fail) return route.fulfill({ status: fail, contentType: 'application/json', body: '{}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tree) });
  });
}

async function frameFor(page, src) {
  await page.waitForFunction(
    (want) => window.frames.length > 0 && [...document.querySelectorAll('iframe.mvp-surface-frame')].some((el) => {
      try {
        return new URL(el.src).searchParams.get('mvpSource') === want;
      } catch {
        return false;
      }
    }),
    src,
    { timeout: 15000 },
  );
  const frame = page.frames().find((f) => {
    try {
      const u = new URL(f.url());
      return u.pathname.startsWith('/mvp/01/surfaces/') && u.searchParams.get('mvpSource') === src;
    } catch {
      return false;
    }
  });
  assert.ok(frame, `frame mounted for ${src}`);
  return frame;
}

async function waitHydrated(frame, src) {
  await frame.waitForFunction(
    (want) => {
      if (want === 'SRC064') return window.__TRACK64__ && window.__TRACK64__.getCards().length === 3;
      if (want === 'SRC058') return window.__LT58V12 && window.__LT58V12.state.moments === 3;
      if (want === 'SRC056') return window.__lt && window.__lt.nodes.length === 3;
      if (want === 'SRC057') return window.__LT57__ && window.__LT57__.moments.length === 3 && window.__LT57__.moments.some((m) => m && m.id === 'alpha-m1');
      if (want === 'SRC060') return window.__LT60__ && window.__LT60__.nodes.length === 3;
      return false;
    },
    src,
    { timeout: 15000 },
  );
}

async function main() {
  await mkdir(shotDir, { recursive: true });
  const browser = await chromium.launch();

  // ---- 1. standalone fidelity: fixture intact without session ----
  {
    const page = await browser.newPage();
    const r = await page.goto(`${baseUrl}/mvp/01/surfaces/src064/index.html`, { waitUntil: 'domcontentloaded' });
    assert.ok(r?.ok(), 'standalone src064 serves');
    await page.waitForFunction(() => window.__TRACK64__ && window.__TRACK64__.getCards().length === 40, null, { timeout: 15000 });
    const titles = await page.evaluate(() => window.__TRACK64__.getCards().map((c) => c.title).join('|'));
    check('standalone src064 keeps 40 fixture cards', titles.includes('FIRST GLIMPSE'));
    await page.close();
  }
  {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/mvp/01/surfaces/src060/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LT60__ && window.__LT60__.nodes.length === 1000, null, { timeout: 15000 });
    check('standalone src060 keeps 1000 fixture nodes', true);
    await page.close();
  }

  // ---- 2. desktop journey ----
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await installApiRoutes(desktop);
  await desktop.goto(`${baseUrl}/mvp/01?step=entry&tree=${TREE.id}`, { waitUntil: 'domcontentloaded' });

  // entry: SRC064 hydrated, fixture gone, canonical visible
  let frame = await frameFor(desktop, 'SRC064');
  await waitHydrated(frame, 'SRC064');
  let cards = await frame.evaluate(() => window.__TRACK64__.getCards().map((c) => c.id));
  check('SRC064 product cards are canonical ids', JSON.stringify(cards) === JSON.stringify(['alpha-m1', 'alpha-m2', 'alpha-m3']));
  let bodyText = await frame.evaluate(() => document.body.innerText);
  check('SRC064 no fixture titles', !FIXTURE_TOKENS.some((t) => bodyText.includes(t)));
  await desktop.screenshot({ path: `${shotDir}/desktop-entry-initial.png` });

  // roundtrip: freeze orbit, click first card -> shell memory param becomes alpha-m1
  await frame.evaluate(() => { window.__TRACK64__.setPhase(0); window.__TRACK64__.setVelocity(0); });
  await frame.locator('.card[data-id="alpha-m1"]').click({ force: true });
  await desktop.waitForFunction(() => new URL(location.href).searchParams.get('memory') === 'alpha-m1', null, { timeout: 10000 });
  check('SRC064 roundtrip alpha-m1', true);
  await assertCanonicalMediaDecoded(frame, 'SRC064');
  await desktop.screenshot({ path: `${shotDir}/desktop-entry-selected.png` });

  // board step via shell nav
  await gotoShellStep(desktop, 'board');
  frame = await frameFor(desktop, 'SRC058');
  await waitHydrated(frame, 'SRC058');
  bodyText = await frame.evaluate(() => document.body.innerText);
  check('SRC058 shows canonical titles', bodyText.includes('Alpha First Light') && bodyText.includes('Alpha Second Path'));
  check('SRC058 no fixture residue', !FIXTURE_TOKENS.some((t) => bodyText.includes(t)));
  const threads = await frame.evaluate(() => window.__LT58V12.state.connections);
  check('SRC058 zero canonical threads (adapter contract)', threads === 0);
  await desktop.screenshot({ path: `${shotDir}/desktop-board-initial.png` });
  await frame.locator('.card[data-id="alpha-m2"]').click();
  await desktop.waitForFunction(() => new URL(location.href).searchParams.get('memory') === 'alpha-m2', null, { timeout: 10000 });
  check('SRC058 roundtrip alpha-m2', true);
  await desktop.screenshot({ path: `${shotDir}/desktop-board-selected.png` });

  // relationships: canvas surface, hook-state + screenshot proof
  await gotoShellStep(desktop, 'relationships');
  frame = await frameFor(desktop, 'SRC056');
  await frame.waitForFunction(() => window.__lt && window.__lt.nodes.length === 3, null, { timeout: 15000 });
  const rel = await frame.evaluate(() => ({
    nodes: window.__lt.nodes.map((n) => n.id),
    edges: window.__lt.edges.map((e) => [e.a, e.b, e.kind]),
    clusters: window.__lt.CLUSTERS.map((c) => c.name),
  }));
  check('SRC056 canonical nodes', JSON.stringify(rel.nodes.sort()) === JSON.stringify(['alpha-m1', 'alpha-m2', 'alpha-m3']));
  check('SRC056 canonical parent edges only', rel.edges.length === 2 && rel.edges.every((e) => e[2] === 'primary'));
  check('SRC056 no fixture cluster names', rel.clusters.every((n) => n === ''));
  // Renderer-map binding proof: the bridge must have replaced the keys of the
  // source's own lexical byId map (exposed as __lt.byId), not a window.byId
  // shadow. Every canonical renderer edge must resolve through that map.
  const mapProof = await frame.evaluate(() => {
    const lt = window.__lt;
    return {
      keys: Object.keys(lt.byId).sort(),
      edgeResolvable: lt.edges.length > 0 && lt.edges.every((e) => !!lt.byId[e.a] && !!lt.byId[e.b]),
      windowShadow: window.byId !== undefined,
    };
  });
  check('SRC056 byId map holds exactly the canonical ids', JSON.stringify(mapProof.keys) === JSON.stringify(['alpha-m1', 'alpha-m2', 'alpha-m3']));
  check('SRC056 every renderer edge endpoint resolves through byId', mapProof.edgeResolvable);
  check('SRC056 bridge no longer assigns the dead window.byId shadow', !mapProof.windowShadow);
  await desktop.screenshot({ path: `${shotDir}/desktop-relationships-initial.png` });
  // roundtrip: click alpha-m3 node via canvas center-of-node projection is unstable;
  // use the authoritative selection path the companion uses (selectMoment by id),
  // then assert the shell observes the SAME canonical id from the event.
  await frame.evaluate(() => {
    const lt = window.__lt;
    const node = lt.nodes.find((n) => n.id === 'alpha-m3');
    lt.selectMoment(node, false);
  });
  await desktop.waitForFunction(() => new URL(location.href).searchParams.get('memory') === 'alpha-m3', null, { timeout: 10000 });
  check('SRC056 roundtrip alpha-m3', true);
  await desktop.screenshot({ path: `${shotDir}/desktop-relationships-selected.png` });

  // Path-playback regression (renderer byId binding): select alpha-m1 through
  // the real source selection path, let the shell's re-INIT settle (it
  // re-applies the canonical projection and re-selects the anchor), then start
  // playback through the real runtime hook. The first arrival must travel the
  // full playbackArrive -> __LT56_SELECT__ -> MEMORY_SELECTED -> shell URL
  // chain. With the stale lexical byId map the orb draw throws inside the rAF
  // loop and this URL never changes.
  await frame.evaluate(() => {
    const lt = window.__lt;
    lt.selectMoment(lt.nodes.find((n) => n.id === 'alpha-m1'), false);
    lt.__qaPrevSelected = lt.state.selected;
  });
  await desktop.waitForFunction(() => new URL(location.href).searchParams.get('memory') === 'alpha-m1', null, { timeout: 10000 });
  // The selection round-trip makes the shell re-INIT the frame, which
  // re-hydrates the projection and re-applies selectMoment on a NEW node
  // object. Wait for that re-application before starting playback, otherwise
  // the pending re-INIT cancels the just-started playback.
  await frame.waitForFunction(
    () => window.__lt.state.selected && window.__lt.state.selected !== window.__lt.__qaPrevSelected && window.__lt.state.selected.id === 'alpha-m1',
    null,
    { timeout: 10000 },
  );
  await frame.evaluate(() => window.__lt.startPlayback());
  await desktop.waitForFunction(() => new URL(location.href).searchParams.get('memory') === 'alpha-m2', null, { timeout: 20000 });
  check('SRC056 path playback arrives at canonical alpha-m2 through the shell', true);
  const playback = await frame.evaluate(() => ({
    selected: window.__lt.state.selected && window.__lt.state.selected.id,
    keys: Object.keys(window.__lt.byId).sort(),
  }));
  check('SRC056 playback selection is the canonical next node', playback.selected === 'alpha-m2');
  check('SRC056 byId map stays canonical after playback', JSON.stringify(playback.keys) === JSON.stringify(['alpha-m1', 'alpha-m2', 'alpha-m3']));
  await desktop.screenshot({ path: `${shotDir}/desktop-relationships-playback.png` });

  // memory detail
  await gotoShellStep(desktop, 'memory');
  frame = await frameFor(desktop, 'SRC057');
  await waitHydrated(frame, 'SRC057');
  bodyText = await frame.evaluate(() => document.body.innerText);
  check('SRC057 shows exact selected canonical memory', bodyText.includes('Alpha Quiet Leaf'));
  check('SRC057 no fixture m1 titles', !bodyText.includes('처음 눈에 들어온 무대'));
  await desktop.screenshot({ path: `${shotDir}/desktop-memory-initial.png` });
  await frame.locator('.card-wrap[data-id="alpha-m1"]').click();
  await desktop.waitForFunction(() => new URL(location.href).searchParams.get('memory') === 'alpha-m1', null, { timeout: 10000 });
  check('SRC057 roundtrip alpha-m1', true);
  await assertCanonicalMediaDecoded(frame, 'SRC057');
  await desktop.screenshot({ path: `${shotDir}/desktop-memory-selected.png` });

  // explore
  await gotoShellStep(desktop, 'explore');
  frame = await frameFor(desktop, 'SRC060');
  await waitHydrated(frame, 'SRC060');
  const exp = await frame.evaluate(() => ({
    titles: window.__LT60__.nodes.map((n) => n.title),
    count: window.__LT60__.nodes.length,
    clusters: window.__LT60__.clusters.map((c) => c.name),
  }));
  check('SRC060 three canonical nodes', exp.count === 3);
  check('SRC060 canonical titles rendered', exp.titles.includes('Alpha First Light'));
  check('SRC060 no fixture cluster names', exp.clusters.every((n) => n === ''));
  await desktop.screenshot({ path: `${shotDir}/desktop-explore-initial.png` });
  await frame.evaluate(() => window.__LT60__.selectNode(1, false));
  await desktop.waitForFunction(() => {
    const m = new URL(location.href).searchParams.get('memory');
    return m === 'alpha-m2' || m === 'alpha-m1' || m === 'alpha-m3';
  }, null, { timeout: 10000 });
  const finalMemory = await desktop.evaluate(() => new URL(location.href).searchParams.get('memory'));
  check(`SRC060 roundtrip canonical (${finalMemory})`, ['alpha-m1', 'alpha-m2', 'alpha-m3'].includes(finalMemory));
  await desktop.screenshot({ path: `${shotDir}/desktop-explore-selected.png` });

  // continuity + history. Canonical selections push memory params, so the
  // youngest history entries are selection-level (same step), then step-level.
  const finalUrl = new URL(desktop.url());
  check('treeId survives journey', finalUrl.searchParams.get('tree') === TREE.id);
  check('step is explore', finalUrl.searchParams.get('step') === 'explore');
  await desktop.goBack();
  await desktop.waitForFunction(() => new URL(location.href).searchParams.get('memory') === 'alpha-m1', null, { timeout: 10000 });
  check('back reverts selection to alpha-m1', true);
  await desktop.goForward();
  await desktop.waitForFunction((want) => new URL(location.href).searchParams.get('memory') === want, finalMemory, { timeout: 10000 });
  check('forward restores explore selection', true);
  await gotoShellStep(desktop, 'memory');
  await desktop.waitForFunction(() => new URL(location.href).searchParams.get('step') === 'memory', null, { timeout: 10000 });
  check('chip navigates to memory step', true);
  await desktop.goBack();
  await desktop.waitForFunction(() => new URL(location.href).searchParams.get('step') === 'explore', null, { timeout: 10000 });
  check('back restores explore step', true);
  await desktop.goForward();
  await desktop.waitForFunction(() => new URL(location.href).searchParams.get('step') === 'memory', null, { timeout: 10000 });
  check('forward restores memory step', true);
  await desktop.reload({ waitUntil: 'domcontentloaded' });
  await desktop.waitForFunction((wantTree) => {
    const u = new URL(location.href);
    return u.searchParams.get('step') === 'memory' && u.searchParams.get('tree') === wantTree && !!u.searchParams.get('memory');
  }, TREE.id, { timeout: 15000 });
  check('reload restores step+tree+memory', true);
  await desktop.close();

  // ---- 3. mobile journey (initial + selected evidence) ----
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await installApiRoutes(mobile);
  await mobile.goto(`${baseUrl}/mvp/01?step=board&tree=${TREE.id}&memory=alpha-m2`, { waitUntil: 'domcontentloaded' });
  frame = await frameFor(mobile, 'SRC058');
  await waitHydrated(frame, 'SRC058');
  await mobile.screenshot({ path: `${shotDir}/mobile-board-initial.png` });
  const selVisible = await frame.evaluate(() => !!document.querySelector('.card[data-id="alpha-m2"].selected, .card[data-id="alpha-m2"]'));
  check('mobile board shows selected canonical card', selVisible);
  await mobile.screenshot({ path: `${shotDir}/mobile-board-selected.png` });

  // mobile relationships: canonical hydration + selection + path playback
  await gotoShellStep(mobile, 'relationships');
  frame = await frameFor(mobile, 'SRC056');
  await frame.waitForFunction(() => window.__lt && window.__lt.nodes.length === 3, null, { timeout: 15000 });
  await mobile.screenshot({ path: `${shotDir}/mobile-relationships-initial.png` });
  await frame.evaluate(() => {
    const lt = window.__lt;
    lt.selectMoment(lt.nodes.find((n) => n.id === 'alpha-m3'), false);
  });
  await mobile.waitForFunction(() => new URL(location.href).searchParams.get('memory') === 'alpha-m3', null, { timeout: 10000 });
  check('mobile SRC056 roundtrip alpha-m3', true);
  await mobile.screenshot({ path: `${shotDir}/mobile-relationships-selected.png` });
  await frame.evaluate(() => {
    const lt = window.__lt;
    lt.selectMoment(lt.nodes.find((n) => n.id === 'alpha-m1'), false);
    lt.__qaPrevSelected = lt.state.selected;
  });
  await mobile.waitForFunction(() => new URL(location.href).searchParams.get('memory') === 'alpha-m1', null, { timeout: 10000 });
  await frame.waitForFunction(
    () => window.__lt.state.selected && window.__lt.state.selected !== window.__lt.__qaPrevSelected && window.__lt.state.selected.id === 'alpha-m1',
    null,
    { timeout: 10000 },
  );
  await frame.evaluate(() => window.__lt.startPlayback());
  await mobile.waitForFunction(() => new URL(location.href).searchParams.get('memory') === 'alpha-m2', null, { timeout: 20000 });
  check('mobile SRC056 path playback arrives at canonical alpha-m2', true);
  await mobile.screenshot({ path: `${shotDir}/mobile-relationships-playback.png` });
  await mobile.close();

  // ---- 4. negatives (fail closed, no fixture fallback) ----
  async function shellState(url, routes) {
    const page = await browser.newPage();
    await installApiRoutes(page, routes);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const text = await page.evaluate(() => document.getElementById('mvp-alpha-state')?.textContent ?? '');
    const hidden = await page.evaluate(() => document.getElementById('mvp-alpha-state')?.hidden ?? true);
    await page.close();
    return { text, hidden };
  }
  let st = await shellState(`${baseUrl}/mvp/01?step=board&tree=${TREE.id}`, { fail: 401 });
  check('401 unauthorized explicit', !st.hidden && st.text.includes('401'));
  st = await shellState(`${baseUrl}/mvp/01?step=board&tree=missing-tree`, { fail: 404 });
  check('404 not-found explicit', !st.hidden && st.text.includes('404'));
  st = await shellState(`${baseUrl}/mvp/01?step=board&tree=${TREE.id}&memory=nope`, {});
  check('invalid memory fails closed', !st.hidden);
  st = await shellState(`${baseUrl}/mvp/01?step=board&tree=${TREE.id}`, { memories: [] });
  check('empty tree explicit, no fixture', !st.hidden && st.text.includes('no Memories'));

  // real network failure (connection-level abort, NOT an HTTP error status):
  // the Product must land in the explicit network-error state with no fixture
  // fallback and no URL context mutation.
  {
    const page = await browser.newPage();
    await page.route('**/api/trees/*', (route) => route.abort('connectionfailed'));
    await page.route('**/api/trees/*/memories*', (route) => route.abort('connectionfailed'));
    await page.route('**/api/memories/*', (route) => route.abort('connectionfailed'));
    await page.goto(`${baseUrl}/mvp/01?step=board&tree=${TREE.id}&memory=alpha-m1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => {
        const el = document.getElementById('mvp-alpha-state');
        return !!el && !el.hidden && !!el.textContent && el.textContent.length > 0;
      },
      null,
      { timeout: 15000 },
    );
    const netState = await page.evaluate(() => ({
      text: document.getElementById('mvp-alpha-state').textContent,
      url: location.href,
    }));
    check('network failure explicit state (no fixture fallback)', !netState.text.toLowerCase().includes('fixture') && netState.text.length > 0);
    check('network failure keeps treeId/step/memory in URL', netState.url.includes(`tree=${TREE.id}`) && netState.url.includes('step=board') && netState.url.includes('memory=alpha-m1'));
    await page.close();
  }

  // wrong-tree selected memory: the selected id exists but belongs to another
  // tree -> SELECTED_MEMORY_TREE_MISMATCH -> explicit failure, no fixture.
  {
    const page = await browser.newPage();
    await installApiRoutes(page);
    await page.route('**/api/memories/alpha-m2', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...M2, treeId: 'another-tree-9' }),
      });
    });
    await page.goto(`${baseUrl}/mvp/01?step=board&tree=${TREE.id}&memory=alpha-m2`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => {
        const el = document.getElementById('mvp-alpha-state');
        return !!el && !el.hidden && !!el.textContent && el.textContent.length > 0;
      },
      null,
      { timeout: 15000 },
    );
    const mismatch = await page.evaluate(() => ({
      text: document.getElementById('mvp-alpha-state').textContent,
      memory: new URL(location.href).searchParams.get('memory'),
      tree: new URL(location.href).searchParams.get('tree'),
    }));
    check('wrong-tree memory explicit mismatch failure', !mismatch.text.includes('fixture'));
    check('wrong-tree memory keeps URL identity unchanged', mismatch.memory === 'alpha-m2' && mismatch.tree === TREE.id);
    await page.close();
  }

  // invalid (non-JSON) API response: read client must fail closed.
  {
    const page = await browser.newPage();
    await installApiRoutes(page);
    await page.route('**/api/trees/*', async (route) => {
      if (route.request().url().includes('/memories')) return route.fallback();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '<html>not json</html>' });
    });
    await page.goto(`${baseUrl}/mvp/01?step=board&tree=${TREE.id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => {
        const el = document.getElementById('mvp-alpha-state');
        return !!el && !el.hidden && !!el.textContent && el.textContent.length > 0;
      },
      null,
      { timeout: 15000 },
    );
    check('invalid JSON response explicit failure', true);
    await page.close();
  }

  // stale/wrong/malformed bridge envelopes rejected (synthetic events). Each
  // dimension is an independent case: correct sender + stale session, correct
  // sender + wrong sourceId, malformed type, right session + wrong origin,
  // right session + wrong sender window.
  {
    const page = await browser.newPage();
    await installApiRoutes(page);
    await page.goto(`${baseUrl}/mvp/01?step=board&tree=${TREE.id}&memory=alpha-m1`, { waitUntil: 'domcontentloaded' });
    const before = await page.evaluate(() => location.href);
    const verdicts = await page.evaluate(() => {
      const out = [];
      function send(data, sender, origin) {
        return new Promise((resolve) => {
          window.dispatchEvent(new MessageEvent('message', { data, origin, source: sender }));
          setTimeout(resolve, 50);
        });
      }
      return (async () => {
        const activeSession = () => {
          const el = document.querySelector('iframe.mvp-surface-frame');
          return el ? el.dataset.mvpFrameSessionId : null;
        };
        const base = { protocol: 'lovetree.mvp.bridge', protocolVersion: 1, mvpId: 'MVP001', sourceId: 'SRC058', frameSessionId: 'frm-stale', messageId: 'm1', type: 'MEMORY_SELECTED', contextRevision: 1, payload: { memoryId: 'alpha-m2', selectionReason: 'user' } };
        await send(base, window, location.origin);
        out.push(['stale-session-ignored', new URL(location.href).searchParams.get('memory')]);
        await send({ ...base, sourceId: 'SRC057' }, window, location.origin);
        out.push(['wrong-source-ignored', new URL(location.href).searchParams.get('memory')]);
        await send({ ...base, type: 'NOPE' }, window, location.origin);
        out.push(['malformed-ignored', new URL(location.href).searchParams.get('memory')]);
        await send({ ...base, frameSessionId: activeSession() }, window, 'http://evil.example');
        out.push(['wrong-origin-ignored', new URL(location.href).searchParams.get('memory')]);
        // wrong sender window (independent dimension: correct origin and
        // session, but the sender is a foreign Window proxy, not this window)
        const foreignWindow = document.createElement('iframe').contentWindow;
        await send({ ...base, frameSessionId: activeSession() }, foreignWindow, location.origin);
        out.push(['wrong-sender-ignored', new URL(location.href).searchParams.get('memory')]);
        return out;
      })();
    });
    for (const [name, mem] of verdicts) check(`${name} (memory still alpha-m1)`, mem === 'alpha-m1');
    check('no navigation on hostile envelopes', (await page.evaluate(() => location.href)) === before);
    await page.close();
  }

  // source-side bridge trust (frame-level): hostile same-origin NON-parent
  // windows (the frame itself) must not hydrate or dispose, while real
  // parent-sourced INITs apply. Observable through the SRC058 runtime store.
  {
    const page = await browser.newPage();
    await installApiRoutes(page);
    await page.goto(`${baseUrl}/mvp/01?step=board&tree=${TREE.id}&memory=alpha-m1`, { waitUntil: 'domcontentloaded' });
    frame = await frameFor(page, 'SRC058');
    await waitHydrated(frame, 'SRC058');
    const sessionId = await frame.evaluate(() => new URLSearchParams(location.search).get('mvpSession'));
    const canonicalBefore = await frame.evaluate(() => window.__LT58.moments.map((m) => m.id).join('|'));
    check('source pre-state is canonical', canonicalBefore === 'alpha-m1|alpha-m2|alpha-m3');

    // hostile self-sourced INIT (sender is the frame, NOT the parent), with a
    // newer-looking revision: must be rejected by sender trust alone.
    await frame.evaluate((sid) => {
      const hostileInit = {
        protocol: 'lovetree.mvp.bridge', protocolVersion: 1, mvpId: 'MVP001', sourceId: 'SRC058',
        frameSessionId: sid, messageId: 'm-evil-1', type: 'SOURCE_INIT', contextRevision: 99,
        payload: {
          context: { selectedMemoryId: 'hostile-m1' },
          projection: { moments: [{ id: 'hostile-m1' }], connections: [] },
          permissions: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
        },
      };
      window.dispatchEvent(new MessageEvent('message', { data: hostileInit, origin: location.origin, source: window }));
    }, sessionId);
    await page.waitForTimeout(150);
    const afterHostileInit = await frame.evaluate(() => window.__LT58.moments.map((m) => m.id).join('|'));
    check('source rejects sibling INIT (no hostile hydration)', afterHostileInit === canonicalBefore);

    // hostile self-sourced DISPOSE with the correct session id: must be
    // rejected (listener stays armed).
    await frame.evaluate((sid) => {
      const hostileDispose = {
        protocol: 'lovetree.mvp.bridge', protocolVersion: 1, mvpId: 'MVP001', sourceId: 'SRC058',
        frameSessionId: sid, messageId: 'm-evil-2', type: 'SOURCE_DISPOSE', contextRevision: 99, payload: {},
      };
      window.dispatchEvent(new MessageEvent('message', { data: hostileDispose, origin: location.origin, source: window }));
    }, sessionId);
    await page.waitForTimeout(150);

    // trusted parent-sourced same-revision re-INIT (sender IS window.parent):
    // must apply — proving the listener survived the hostile DISPOSE — with a
    // projection listing only alpha-m1 (count 3 -> 1 is the visible effect).
    await frame.evaluate((sid) => {
      const init = {
        protocol: 'lovetree.mvp.bridge', protocolVersion: 1, mvpId: 'MVP001', sourceId: 'SRC058',
        frameSessionId: sid, messageId: 'm-parent-1', type: 'SOURCE_INIT', contextRevision: 1,
        payload: {
          context: { selectedMemoryId: null },
          projection: { moments: [{ id: 'alpha-m1' }], connections: [] },
          permissions: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
        },
      };
      window.dispatchEvent(new MessageEvent('message', { data: init, origin: location.origin, source: window.parent }));
    }, sessionId);
    await page.waitForTimeout(250);
    const afterParentInit = await frame.evaluate(() => window.__LT58.moments.map((m) => m.id).join('|'));
    check('parent INIT applies (listener intact after hostile DISPOSE)', afterParentInit === 'alpha-m1');

    // trusted parent-sourced STALE-revision INIT (0 < applied 1) with the full
    // canonical projection: must be rejected by the monotonic guard (count
    // stays 1 instead of returning to 3).
    await frame.evaluate((sid) => {
      const staleInit = {
        protocol: 'lovetree.mvp.bridge', protocolVersion: 1, mvpId: 'MVP001', sourceId: 'SRC058',
        frameSessionId: sid, messageId: 'm-parent-2', type: 'SOURCE_INIT', contextRevision: 0,
        payload: {
          context: { selectedMemoryId: null },
          projection: { moments: [{ id: 'alpha-m1' }, { id: 'alpha-m2' }, { id: 'alpha-m3' }], connections: [] },
          permissions: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
        },
      };
      window.dispatchEvent(new MessageEvent('message', { data: staleInit, origin: location.origin, source: window.parent }));
    }, sessionId);
    await page.waitForTimeout(250);
    const afterStale = await frame.evaluate(() => window.__LT58.moments.map((m) => m.id).join('|'));
    check('parent STALE-revision INIT rejected (monotonic guard)', afterStale === 'alpha-m1');
    await page.close();
  }

  await browser.close();
  console.log(`\nPRODUCTIZED_ALPHA_JOURNEY PASS=${passed}`);
}

main().catch((e) => {
  console.error('PRODUCTIZED_ALPHA_JOURNEY FAIL:', e);
  process.exit(1);
});
