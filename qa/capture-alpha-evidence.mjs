// Visual evidence capture for MVP001 PR #607 (bridge trust final head).
//
// Produces per-Source initial+selected screenshots for ALL FIVE sources in
// desktop (1440x900) and mobile (390x844) viewports, plus a manifest recording
// HEAD SHA, viewport, source, state, canonical treeId and selectedMemoryId.
//
//   node qa/capture-alpha-evidence.mjs <shotDir>
//
// Uses the same fixture API interception as the journey harness; the shell +
// surfaces + bridges run for real against the current working tree.

import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const baseUrl = process.env.ALPHA_QA_URL ?? 'http://127.0.0.1:3001';
const shotDir = process.argv[2] ?? 'evidence/mvp001-pr607/bridge-trust/visual';

const TREE = { id: 'alpha-tree-1', title: 'Alpha Canonical Tree', visibility: 'private' };
const M1 = {
  id: 'alpha-m1', treeId: TREE.id, title: 'Alpha First Light', memo: 'Canonical root note',
  artist: 'Alpha Artist', source: '', channelName: '', sourceType: 'link',
  sourceUrl: 'https://example.com/alpha-1', thumbnail: 'https://example.com/alpha-1.jpg',
  timestamp: '2026-02-01', discoveryDate: '2026-02-01', emotionTags: ['calm'],
  visibility: 'private', parentId: null, connectionReason: null, videoOffsetSeconds: null,
  sortOrder: 1, createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
};
const M2 = { ...M1, id: 'alpha-m2', title: 'Alpha Second Path', parentId: 'alpha-m1', sortOrder: 2 };
const M3 = { ...M1, id: 'alpha-m3', title: 'Alpha Quiet Leaf', parentId: 'alpha-m1', sortOrder: 3 };
const MEMORIES = [M1, M2, M3];
const BY_ID = Object.fromEntries(MEMORIES.map((m) => [m.id, m]));

const STEPS = [
  { id: 'entry', src: 'SRC064', surface: 'src064' },
  { id: 'board', src: 'SRC058', surface: 'src058' },
  { id: 'relationships', src: 'SRC056', surface: 'src056' },
  { id: 'memory', src: 'SRC057', surface: 'src057' },
  { id: 'explore', src: 'SRC060', surface: 'src060' },
];

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'mobile-390x844', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'mobile-430x932', width: 430, height: 932, isMobile: true, hasTouch: true },
];

async function installApiRoutes(page) {
  await page.route('**/api/trees/*/memories*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MEMORIES) }));
  await page.route('**/api/memories/*', (route) => {
    const id = route.request().url().split('/').pop().split('?')[0];
    const found = BY_ID[id];
    if (!found) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(found) });
  });
  await page.route('**/api/trees/*', (route) => {
    if (route.request().url().includes('/memories')) return route.fallback();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TREE) });
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
      if (want === 'SRC057') return window.__LT57__ && window.__LT57__.moments.length === 3;
      if (want === 'SRC060') return window.__LT60__ && window.__LT60__.nodes.length === 3;
      return false;
    },
    src,
    { timeout: 15000 },
  );
}

async function selectCanonical(frame, src, page) {
  // Source-appropriate canonical selection through the authoritative path.
  if (src === 'SRC064') {
    await frame.evaluate(() => { window.__TRACK64__.setPhase(0); window.__TRACK64__.setVelocity(0); });
    await frame.locator('.card[data-id="alpha-m1"]').click({ force: true, timeout: 10000 }).catch(() => {});
  } else if (src === 'SRC058') {
    await frame.locator('.card[data-id="alpha-m2"]').click({ timeout: 10000 }).catch(() => {});
  } else if (src === 'SRC056') {
    await frame.evaluate(() => {
      const lt = window.__lt;
      const node = lt.nodes.find((n) => n.id === 'alpha-m3');
      lt.selectMoment(node, false);
    });
  } else if (src === 'SRC057') {
    await frame.locator('.card-wrap[data-id="alpha-m1"]').click({ timeout: 10000 }).catch(() => {});
  } else if (src === 'SRC060') {
    await frame.evaluate(() => window.__LT60__.selectNode(1, false));
  }
  await page.waitForFunction(
    () => ['alpha-m1', 'alpha-m2', 'alpha-m3'].includes(new URL(location.href).searchParams.get('memory')),
    null,
    { timeout: 10000 },
  );
  return page.evaluate(() => new URL(location.href).searchParams.get('memory'));
}

async function main() {
  await mkdir(shotDir, { recursive: true });
  const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const manifest = { headSha, baseUrl, treeId: TREE.id, generatedAt: new Date().toISOString(), shots: [] };
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage(
      vp.isMobile
        ? { viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true }
        : { viewport: { width: vp.width, height: vp.height } },
    );
    await installApiRoutes(page);

    for (const step of STEPS) {
      // initial: no selected memory
      await page.goto(`${baseUrl}/mvp/01?step=${step.id}&tree=${TREE.id}`, { waitUntil: 'domcontentloaded' });
      let frame = await frameFor(page, step.src);
      await waitHydrated(frame, step.src);
      await page.waitForTimeout(600);
      const initialFile = `${vp.name}-${step.src.toLowerCase()}-initial.png`;
      await page.screenshot({ path: `${shotDir}/${initialFile}` });
      manifest.shots.push({
        viewport: vp.name, source: step.src, state: 'initial', filename: initialFile,
        canonicalTreeId: TREE.id, canonicalSelectedMemoryId: null,
      });

      // selected: canonical selection through the authoritative path
      const selectedMemory = await selectCanonical(frame, step.src, page);
      await page.waitForTimeout(600);
      const selectedFile = `${vp.name}-${step.src.toLowerCase()}-selected.png`;
      await page.screenshot({ path: `${shotDir}/${selectedFile}` });
      manifest.shots.push({
        viewport: vp.name, source: step.src, state: 'selected', filename: selectedFile,
        canonicalTreeId: TREE.id, canonicalSelectedMemoryId: selectedMemory,
      });
    }
    await page.close();
  }

  await browser.close();
  const manifestFile = `${shotDir}/manifest.json`;
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`HEAD=${headSha}`);
  console.log(`SHOTS=${manifest.shots.length} -> ${shotDir}`);
  console.log(`MANIFEST=${manifestFile}`);
}

main().catch((e) => {
  console.error('CAPTURE_ALPHA_EVIDENCE FAIL:', e);
  process.exit(1);
});
