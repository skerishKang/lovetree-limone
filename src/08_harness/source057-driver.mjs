import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function collectTrack57State() {
  const roundValue = (value) => Math.round(value * 100) / 100;
  const transientClassPattern = /\s+(?:show|just-selected|arrival-bloom|is-departing)\b/g;
  const ids = [...document.querySelectorAll('[id]')];
  const styleFor = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      tag: el.tagName,
      className: typeof el.className === 'string' ? el.className.replace(transientClassPattern, '') : '',
      rect: {
        x: roundValue(rect.x),
        y: roundValue(rect.y),
        width: roundValue(rect.width),
        height: roundValue(rect.height),
      },
      display: style.display,
      position: style.position,
      visibility: style.visibility,
      opacity: style.opacity,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      zIndex: style.zIndex,
      transform: style.transform,
      color: style.color,
      backgroundColor: style.backgroundColor,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
    };
  };
  const cards = [...document.querySelectorAll('.card-wrap')];
  const detail = document.getElementById('detailPanel');
  const viewer = document.getElementById('viewerModal');
  const edit = document.getElementById('editModal');
  return {
    ids: ids.map((el) => el.id),
    elementCount: document.querySelectorAll('*').length,
    buttonIds: [...document.querySelectorAll('button')].map((el) => el.id),
    cards: cards.map((el) => ({
      id: el.dataset.id ?? null,
      className: el.className.replace(transientClassPattern, ''),
      selected: el.classList.contains('is-selected'),
    })),
    metrics: Object.fromEntries(ids.map((el) => [el.id, styleFor(el)])),
    runtime: {
      selectedId: window.__LT57__?.selectedId ?? null,
      viewerMomentId: window.__LT57__?.viewerMomentId ?? null,
      cardCount: window.__LT57__?.moments?.length ?? null,
      detailOpen: detail?.classList.contains('open') ?? false,
      viewerOpen: viewer?.classList.contains('open') ?? false,
      editOpen: edit?.classList.contains('open') ?? false,
    },
    content: {
      detailTitle: document.getElementById('detailTitle')?.textContent ?? '',
      detailDate: document.getElementById('detailDate')?.textContent ?? '',
      detailEmotion: document.getElementById('detailEmotion')?.textContent ?? '',
      detailWhy: document.getElementById('detailWhy')?.textContent ?? '',
      previewTitle: document.getElementById('editPreviewTitle')?.textContent ?? '',
      previewState: document.getElementById('editPreviewState')?.textContent ?? '',
      previewHasImage: document.getElementById('editLivePreview')?.classList.contains('has-image') ?? false,
      previewSrc: document.getElementById('editPreviewImage')?.getAttribute('src') ?? null,
    },
    overflow: {
      document: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      body: document.body.scrollWidth <= window.innerWidth + 1,
    },
  };
}

async function settleTrack57(page) {
  await page.waitForTimeout(120);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => {
    document.querySelectorAll('.card-wrap').forEach((el) => el.classList.remove('just-selected', 'arrival-bloom', 'is-departing'));
    document.getElementById('whyToast')?.classList.remove('show');
  });
}

async function assertReady(page, sourceId) {
  await page.waitForFunction(() => window.__LT57__?.moments && window.__LT57__?.selectMoment, null, { timeout: 15000 });
  const cardCount = await page.evaluate(() => window.__LT57__.moments.length);
  if (cardCount !== 3) throw new Error(`${sourceId}: expected 3 source cards, got ${cardCount}`);
}

async function exerciseTrack57(page, sourceId, label) {
  await page.evaluate(() => window.__LT57__.closeViewer());
  await page.click('#detailClose');
  await page.locator('#detailPanel.open').waitFor({ state: 'hidden', timeout: 5000 });
  await page.locator('[data-id="m2"]').click();
  await page.waitForFunction(() => window.__LT57__?.selectedId === 'm2', null, { timeout: 5000 });
  await page.locator('#detailPanel.open').waitFor({ timeout: 5000 });
  const selected = await page.evaluate(() => ({ selectedId: window.__LT57__.selectedId, detailOpen: document.getElementById('detailPanel').classList.contains('open') }));

  await page.click('#nextMoment');
  await page.waitForFunction(() => window.__LT57__?.selectedId === 'm3', null, { timeout: 5000 });
  await settleTrack57(page);
  const next = await page.evaluate(() => ({ selectedId: window.__LT57__.selectedId, whyToastVisible: document.getElementById('whyToast').classList.contains('show') === false }));

  await page.click('#editMedia');
  await page.locator('#editModal.open').waitFor({ timeout: 5000 });
  await page.selectOption('#mediaKindInput', 'youtube');
  await page.fill('#mediaUrlInput', 'https://www.youtube.com/watch?v=bcUfIpQ6aeA');
  await page.waitForFunction(() => document.getElementById('editLivePreview')?.classList.contains('has-image') === true, null, { timeout: 5000 });
  const editPreview = await page.evaluate(() => ({ editOpen: document.getElementById('editModal').classList.contains('open'), hasImage: document.getElementById('editLivePreview').classList.contains('has-image'), previewState: document.getElementById('editPreviewState').textContent }));
  await page.click('#editCancel');
  await page.locator('#editModal.open').waitFor({ state: 'hidden', timeout: 5000 });

  await page.click('#openMoment');
  await page.locator('#viewerModal.open').waitFor({ timeout: 5000 });
  const viewer = await page.evaluate(() => ({ viewerMomentId: window.__LT57__.viewerMomentId, viewerOpen: document.getElementById('viewerModal').classList.contains('open') }));
  await page.click('#viewerClose');
  await page.locator('#viewerModal.open').waitFor({ state: 'hidden', timeout: 5000 });
  const closed = await page.evaluate(() => ({ viewerMomentId: window.__LT57__.viewerMomentId, viewerOpen: document.getElementById('viewerModal').classList.contains('open') }));

  assert.deepEqual(selected, { selectedId: 'm2', detailOpen: true }, `${sourceId} ${label}: selection failed`);
  assert.deepEqual(next, { selectedId: 'm3', whyToastVisible: true }, `${sourceId} ${label}: next transition failed`);
  assert.equal(editPreview.hasImage, true, `${sourceId} ${label}: media preview failed`);
  assert.deepEqual(viewer, { viewerMomentId: 'm3', viewerOpen: true }, `${sourceId} ${label}: viewer failed`);
  assert.deepEqual(closed, { viewerMomentId: null, viewerOpen: false }, `${sourceId} ${label}: viewer close failed`);
  return { controlSurface: 'LIVING_GLASS_MOMENT_CARDS', selected, next, editPreview, viewer, closed };
}

async function preparePage(page, sourceId, variant, errors = []) {
  await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
  await assertReady(page, sourceId);
  await settleTrack57(page);
  if (errors.length) throw new Error(`${sourceId} ${variant}: browser errors: ${errors.join('; ')}`);
  return errors;
}

async function captureTrack57Page(page, sourceOut, variant, sourceId, label, errors = []) {
  const capturedErrors = await preparePage(page, sourceId, variant, errors);
  const initial = await page.evaluate(collectTrack57State);
  const initialPng = await page.screenshot({ path: path.join(sourceOut, `${label}-${variant}-initial.png`), animations: 'disabled' });
  await page.locator('[data-id="m2"]').click();
  await page.locator('#detailPanel.open').waitFor({ timeout: 5000 });
  await settleTrack57(page);
  const selected = await page.evaluate(collectTrack57State);
  await page.screenshot({ path: path.join(sourceOut, `${label}-${variant}-selected.png`), animations: 'disabled' });
  await page.click('#nextMoment');
  await page.waitForFunction(() => window.__LT57__?.selectedId === 'm3', null, { timeout: 5000 });
  await settleTrack57(page);
  const next = await page.evaluate(collectTrack57State);
  await page.click('#editMedia');
  await page.locator('#editModal.open').waitFor({ timeout: 5000 });
  await page.selectOption('#mediaKindInput', 'youtube');
  await page.fill('#mediaUrlInput', 'https://www.youtube.com/watch?v=bcUfIpQ6aeA');
  await page.waitForFunction(() => document.getElementById('editLivePreview')?.classList.contains('has-image') === true, null, { timeout: 5000 });
  const editPreview = await page.evaluate(collectTrack57State);
  await page.click('#editCancel');
  await page.locator('#editModal.open').waitFor({ state: 'hidden', timeout: 5000 });
  await page.click('#openMoment');
  await page.locator('#viewerModal.open').waitFor({ timeout: 5000 });
  await settleTrack57(page);
  const viewer = await page.evaluate(collectTrack57State);
  const viewerPng = await page.screenshot({ path: path.join(sourceOut, `${label}-${variant}-viewer.png`), animations: 'disabled' });
  const interaction = await exerciseTrack57(page, sourceId, `${label} ${variant}`);
  if (capturedErrors.length) throw new Error(`${sourceId} ${label} ${variant}: browser errors: ${capturedErrors.join('; ')}`);
  return {
    initial,
    selected,
    next,
    editPreview,
    viewer,
    interaction,
    errors: capturedErrors,    screenshots: { initial_sha256: sha256(initialPng), viewer_sha256: sha256(viewerPng) },
  };
}

export async function captureTrack57Baseline(page, sourceOut, label) {
  const evidence = await captureTrack57Page(page, sourceOut, 'original', 'SRC057', label);
  return evidence;
}

export async function captureTrack57Variant(browser, url, viewport, sourceOut, variant, sourceId) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    if (!response?.ok()) throw new Error(`${sourceId} ${variant}: HTTP ${response?.status()}`);
    return await captureTrack57Page(page, sourceOut, variant, sourceId, `${viewport.width}x${viewport.height}`, errors);
  } finally {
    await context.close();
  }
}

export function track57SourceFiles(sourceDir, sourceId = 'SRC057') {
  return new Map([
    [`/${sourceId}/original.html`, [path.join(sourceDir, 'original', 'original.html'), 'text/html; charset=utf-8']],
    [`/${sourceId}/split/index.html`, [path.join(sourceDir, 'split', 'index.html'), 'text/html; charset=utf-8']],
    [`/${sourceId}/split/styles.css`, [path.join(sourceDir, 'split', 'styles.css'), 'text/css; charset=utf-8']],
    [`/${sourceId}/split/script.js`, [path.join(sourceDir, 'split', 'script.js'), 'text/javascript; charset=utf-8']],
  ]);
}

export { collectTrack57State };
