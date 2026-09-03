import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const baseUrl = process.env.ALPHA_QA_URL || 'http://127.0.0.1:3101';
const shotDir = process.argv[2] || process.env.ALPHA_SCREENSHOT_DIR || '/tmp/src057-update-evidence';

const TREE = { id: 'alpha-tree-1', title: 'Alpha Tree' };
const MEMORIES = [
  { id: 'alpha-m1', treeId: TREE.id, title: 'Alpha First Light', memo: 'first note', artist: 'a', source: '', channelName: '', sourceType: 'link', sourceUrl: 'https://example.com/alpha-1', thumbnail: 'https://example.com/alpha-1.jpg', timestamp: '2026-02-01', discoveryDate: '2026-02-01', emotionTags: ['calm'], visibility: 'private', parentId: null, connectionReason: null, videoOffsetSeconds: null, sortOrder: 1, createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' },
  { id: 'alpha-m2', treeId: TREE.id, title: 'Alpha Second Path', memo: 'second note', artist: 'a', source: '', channelName: '', sourceType: 'link', sourceUrl: 'https://example.com/alpha-2', thumbnail: 'https://example.com/alpha-2.jpg', timestamp: '2026-02-02', discoveryDate: '2026-02-02', emotionTags: ['bright'], visibility: 'private', parentId: null, connectionReason: null, videoOffsetSeconds: null, sortOrder: 2, createdAt: '2026-02-02T00:00:00.000Z', updatedAt: '2026-02-02T00:00:00.000Z' },
];

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

let passed = 0;
function check(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`ok - ${name}`);
}

async function frameFor(page, src) {
  const deadline = Date.now() + 15000;
  let frame = null;
  while (Date.now() < deadline) {
    frame = page.frames().find((f) => {
      try {
        const u = new URL(f.url());
        return u.pathname.startsWith('/mvp/01/surfaces/') && u.searchParams.get('mvpSource') === src;
      } catch { return false; }
    });
    if (frame) return frame;
    await page.waitForTimeout(250);
  }
  throw new Error(`frame not found: ${src}`);
}

async function main() {
  await mkdir(shotDir, { recursive: true });
  const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const browser = await chromium.launch();
  const state = { putCalls: [], getMemoriesCalls: 0, updated: null };

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => {
    window.__MVP01_GET_ACCESS_TOKEN__ = async () => 'test-bearer-token';
  });
  await page.route('https://example.com/alpha-*.jpg', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG_1PX }));
  await page.route('**/api/trees/*/memories*', async (route) => {
    state.getMemoriesCalls += 1;
    const list = MEMORIES.map((m) => (state.updated && state.updated.id === m.id ? { ...m, ...state.updated } : m));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(list) });
  });
  await page.route('**/api/memories/*', async (route) => {
    const req = route.request();
    if (req.method() === 'PUT') {
      const id = req.url().split('/').pop().split('?')[0];
      const auth = req.headers().authorization || req.headers().Authorization;
      state.putCalls.push({ url: req.url(), auth, body: JSON.parse(req.postData() || '{}') });
      if (auth !== 'Bearer test-bearer-token') {
        return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      }
      const body = JSON.parse(req.postData() || '{}');
      const keys = Object.keys(body);
      if (!keys.every((k) => k === 'title' || k === 'memo')) {
        return route.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"bad field"}' });
      }
      state.updated = { id, ...body, updatedAt: new Date().toISOString() };
      const base = MEMORIES.find((m) => m.id === id);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...base, ...state.updated }) });
    }
    const id = req.url().split('/').pop().split('?')[0];
    const found = MEMORIES.find((m) => m.id === id);
    if (!found) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.updated && state.updated.id === id ? { ...found, ...state.updated } : found) });
  });
  await page.route('**/api/trees/*', async (route) => {
    if (route.request().url().includes('/memories')) return route.fallback();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TREE) });
  });

  await page.goto(`${baseUrl}/mvp/01?step=memory&tree=${TREE.id}&memory=alpha-m1`, { waitUntil: 'domcontentloaded' });
  const frame = await frameFor(page, 'SRC057');
  await frame.waitForFunction(() => window.__LT57__ && window.__LT57__.moments && window.__LT57__.moments.length === 2, null, { timeout: 15000 });
  check('SRC057 hydrated with 2 canonical moments', true);

  const editVisible = await frame.evaluate(() => {
    const btn = document.getElementById('editMedia');
    if (!btn) return false;
    const style = window.getComputedStyle(btn);
    return style.display !== 'none';
  });
  check('Product edit entry visible (not hidden)', editVisible);

  await frame.locator('#editMedia').click();
  await frame.waitForFunction(() => {
    const modal = document.getElementById('editModal');
    return modal && modal.classList.contains('open');
  }, null, { timeout: 10000 });
  check('edit modal opens', true);

  const hasProductFields = await frame.evaluate(() => !!document.getElementById('mvpTitleInput') && !!document.getElementById('mvpMemoInput'));
  check('Product title/memo fields injected', hasProductFields);
  const mediaHidden = await frame.evaluate(() => {
    const a = document.getElementById('mediaKindInput');
    const b = document.getElementById('mediaUrlInput');
    const row = (el) => (el ? el.closest('.edit-row') || el.closest('.field') || el : null);
    const ra = a ? row(a) : null;
    const rb = b ? row(b) : null;
    const hidden = (el) => !el || window.getComputedStyle(el).display === 'none';
    return hidden(ra) && hidden(rb);
  });
  check('media-specific fields hidden in Product mode', mediaHidden);
  await page.screenshot({ path: `${shotDir}/desktop-src057-update-modal.png` });

  await frame.locator('#mvpTitleInput').fill('Alpha First Light Edited');
  await frame.locator('#mvpMemoInput').fill('edited memo body');
  await frame.locator('#mediaForm button.save, #mediaForm button[type="submit"]').first().click();
  await page.waitForFunction(() => window.__putDone === true || document.body.innerText.includes('Alpha First Light Edited'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);

  check('single PUT for single save', state.putCalls.length === 1);
  check('Bearer attached on PUT', state.putCalls[0] && state.putCalls[0].auth === 'Bearer test-bearer-token');
  check('PUT body title/memo only', JSON.stringify(Object.keys(state.putCalls[0].body).sort()) === JSON.stringify(['memo', 'title']));
  check('refetch after success (GET memories >1)', state.getMemoriesCalls > 1);
  const bodyText = await frame.evaluate(() => document.body.innerText);
  check('canonical re-render shows edited title', bodyText.includes('Alpha First Light Edited'));
  check('no fixture fallback text', !bodyText.includes('m1 titles') && !bodyText.includes('fixture'));
  await page.screenshot({ path: `${shotDir}/desktop-src057-update-saved.png` });

  const putsBefore = state.putCalls.length;
  await frame.locator('#editMedia').click().catch(() => {});
  await frame.waitForTimeout(500);
  await frame.evaluate(() => {
    const t = document.getElementById('mvpTitleInput');
    const m = document.getElementById('mvpMemoInput');
    if (t) t.value = 'Double Submit Title';
    if (m) m.value = 'double memo';
    const form = document.getElementById('mediaForm');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(2500);
  check('double submit single-flight (at most 1 new PUT)', state.putCalls.length - putsBefore <= 1);

  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await mobileCtx.newPage();
  await mobile.addInitScript(() => {
    window.__MVP01_GET_ACCESS_TOKEN__ = async () => 'test-bearer-token';
  });
  await mobile.route('https://example.com/alpha-*.jpg', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG_1PX }));
  await mobile.route('**/api/trees/*/memories*', async (route) => {
    const list = MEMORIES.map((m) => (state.updated && state.updated.id === m.id ? { ...m, ...state.updated } : m));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(list) });
  });
  await mobile.route('**/api/memories/*', async (route) => {
    const req = route.request();
    if (req.method() === 'PUT') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'alpha-m1', title: 'ok' }) });
    }
    const id = req.url().split('/').pop().split('?')[0];
    const found = MEMORIES.find((m) => m.id === id);
    if (!found) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.updated && state.updated.id === id ? { ...found, ...state.updated } : found) });
  });
  await mobile.route('**/api/trees/*', async (route) => {
    if (route.request().url().includes('/memories')) return route.fallback();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TREE) });
  });
  await mobile.goto(`${baseUrl}/mvp/01?step=memory&tree=${TREE.id}&memory=alpha-m1`, { waitUntil: 'domcontentloaded' });
  const mframe = await frameFor(mobile, 'SRC057');
  await mframe.waitForFunction(() => window.__LT57__ && window.__LT57__.moments && window.__LT57__.moments.length === 2, null, { timeout: 30000 });
  check('mobile SRC057 hydrated', true);
  await mframe.locator('#editMedia').click();
  await mframe.waitForFunction(() => {
    const modal = document.getElementById('editModal');
    return modal && modal.classList.contains('open');
  }, null, { timeout: 10000 });
  check('mobile edit modal opens with Product fields', !!(await mframe.evaluate(() => document.getElementById('mvpTitleInput'))));
  await mobile.screenshot({ path: `${shotDir}/mobile-src057-update-modal.png` });
  await mobile.close();

  await browser.close();
  await writeFile(`${shotDir}/manifest.json`, `${JSON.stringify({ headSha, passed, updated: state.updated }, null, 2)}\n`);
  console.log(`SRC057_UPDATE_VERIFY PASS=${passed}`);
}

main().catch((e) => {
  console.error('SRC057_UPDATE_VERIFY FAIL:', e);
  process.exit(1);
});
