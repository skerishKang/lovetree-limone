import crypto from 'node:crypto';
import path from 'node:path';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function collectPageState() {
  const elements = [...document.querySelectorAll('[id]')];
  const styleFor = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      tag: el.tagName,
      className: typeof el.className === 'string' ? el.className : '',
      rect: {
        x: Math.round(rect.x * 100) / 100,
        y: Math.round(rect.y * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
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
  const track = window.__TRACK64__;
  const trackState = track?.getState?.() ?? null;
  const stableMetricIds = new Set([
    'app', 'menuBtn', 'center', 'focusLayer', 'mediaViewer', 'mediaVisual',
    'mediaClose', 'mediaTypeBadge', 'mediaMemo', 'mediaKicker', 'mediaTitle',
    'mediaMeta', 'mediaWhy', 'mediaPlayAction', 'status', 'focusKicker',
    'focusTitle', 'focusMeta', 'focusWhy', 'openMoment', 'continuePath',
    'prevMoment', 'nextMoment', 'storyBook', 'closeFocus'
  ]);
  const metrics = Object.fromEntries(elements
    .filter((el) => stableMetricIds.has(el.id))
    .map((el) => [el.id, styleFor(el)]));
  return {
    ids: elements.map((el) => el.id),
    elementCount: document.querySelectorAll('*').length,
    buttonIds: [...document.querySelectorAll('button')].map((el) => el.id),
    cards: [...document.querySelectorAll('.card')].map((el) => ({
      id: el.dataset.id ?? null,
      className: el.className,
    })),
    metrics,
    runtime: {
      mode: trackState?.mode ?? null,
      focusId: trackState?.focusId ?? null,
      mediaViewerOpen: trackState?.mediaViewerOpen ?? null,
      viewerMomentId: trackState?.viewerMomentId ?? null,
      cardCount: track?.getCards?.().length ?? null,
    },
  };
}

async function settle(page) {
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    window.__TRACK64__.setPhase(0);
    window.__TRACK64__.setVelocity(0);
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(120);
}

async function captureState(page) {
  return page.evaluate(collectPageState);
}

function screenshotDigest(buffer) {
  let offset = 8;
  const critical = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const chunk = buffer.subarray(offset, offset + 12 + length);
    if (type === 'IHDR' || type === 'IDAT' || type === 'IEND') critical.push(chunk);
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  return sha256(Buffer.concat(critical));
}

async function settleViewer(page) {
  await page.waitForFunction(() => {
    const image = document.getElementById('mediaImage');
    return !image || image.hidden || image.complete;
  }, null, { timeout: 5000 });
  await page.waitForTimeout(300);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function assertTrack64Ready(page, sourceId) {
  await page.waitForFunction(() => window.__TRACK64__ && window.__TRACK64__.getState && window.__TRACK64__.getCards, null, { timeout: 15000 });
  const cardCount = await page.evaluate(() => window.__TRACK64__.getCards().length);
  if (cardCount !== 40) throw new Error(`${sourceId}: expected 40 source cards, got ${cardCount}`);
}

async function exerciseTrack64(page, sourceId, label) {
  await page.evaluate(() => {
    window.__TRACK64__.closeViewer();
    window.__TRACK64__.close();
  });
  await page.waitForFunction(() => window.__TRACK64__.getState().focusId === null, null, { timeout: 5000 });
  await page.click('#menuBtn');
  const menuOpen = await page.evaluate(() => document.getElementById('menuPanel')?.classList.contains('open') === true);
  await page.click('[data-close="menu"]');
  const menuClosed = await page.evaluate(() => document.getElementById('menuPanel')?.classList.contains('open') !== true);
  if (!menuOpen || !menuClosed) throw new Error(`${sourceId} ${label}: menu interaction failed`);
  return {
    controlSurface: 'MEMORY_ORBIT',
    focusMode: 'MOMENT_FOCUS',
    viewerMode: 'MOMENT_MEDIA_VIEWER',
    menuOpen,
    menuClosed,
    cardCount: await page.evaluate(() => window.__TRACK64__.getCards().length),
  };
}

export async function captureTrack64Baseline(page, sourceOut, label) {
  await assertTrack64Ready(page, 'SRC064');
  await settle(page);
  const welcome = await captureState(page);
  await page.screenshot({ path: path.join(sourceOut, `${label}-welcome.png`) });

  await page.evaluate(() => window.__TRACK64__.focus('m01'));
  await page.waitForFunction(() => {
    const state = window.__TRACK64__.getState();
    return state.mode === 'MOMENT_FOCUS' && state.focusProgress === 1;
  }, null, { timeout: 5000 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const focus = await captureState(page);
  await page.screenshot({ path: path.join(sourceOut, `${label}-focus.png`) });

  await page.click('#openMoment');
  await page.waitForFunction(() => window.__TRACK64__.getViewer().open === true, null, { timeout: 5000 });
  await settleViewer(page);
  const viewer = await captureState(page);
  await page.screenshot({ path: path.join(sourceOut, `${label}-viewer.png`) });
  const interaction = await exerciseTrack64(page, 'SRC064', label);
  return { welcome, focus, viewer, interaction, errors: [] };
}

async function captureTrack64PageVariant(page, sourceOut, variant, sourceId, label) {
  await assertTrack64Ready(page, sourceId);
  await settle(page);
  const welcome = await captureState(page);
  const welcomePng = screenshotDigest(await page.screenshot({ path: path.join(sourceOut, `${label}-${variant}-welcome.png`), animations: 'disabled' }));

  await page.evaluate(() => window.__TRACK64__.focus('m01'));
  await page.waitForFunction(() => {
    const state = window.__TRACK64__.getState();
    return state.mode === 'MOMENT_FOCUS' && state.focusProgress === 1;
  }, null, { timeout: 5000 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const focus = await captureState(page);
  const focusPng = screenshotDigest(await page.screenshot({ path: path.join(sourceOut, `${label}-${variant}-focus.png`), animations: 'disabled' }));

  await page.click('#openMoment');
  await page.waitForFunction(() => window.__TRACK64__.getViewer().open === true, null, { timeout: 5000 });
  await settleViewer(page);
  const viewer = await captureState(page);
  const viewerPng = screenshotDigest(await page.screenshot({ path: path.join(sourceOut, `${label}-${variant}-viewer.png`), animations: 'disabled' }));
  const interaction = await exerciseTrack64(page, sourceId, `${label} ${variant}`);
  return {
    welcome,
    focus,
    viewer,
    interaction,
    errors: [],
    screenshots: {
      welcome_sha256: welcomePng,
      focus_sha256: focusPng,
      viewer_sha256: viewerPng,
    },
  };
}

export async function captureTrack64Variant(browser, url, viewport, sourceOut, variant, sourceId) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console:${message.text()}`);
  });
  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    if (!response?.ok()) throw new Error(`${sourceId} ${variant}: HTTP ${response?.status()}`);
    const evidence = await captureTrack64PageVariant(page, sourceOut, variant, sourceId, `${viewport.width}x${viewport.height}`);
    if (errors.length) throw new Error(`${sourceId} ${viewport.width}x${viewport.height} ${variant}: browser errors: ${errors.join('; ')}`);
    return { ...evidence, errors };
  } finally {
    await context.close();
  }
}

export function track64SourceFiles(sourceDir, sourceId = 'SRC064') {
  return new Map([
    [`/${sourceId}/original.html`, [path.join(sourceDir, 'original', 'original.html'), 'text/html; charset=utf-8']],
    [`/${sourceId}/split/index.html`, [path.join(sourceDir, 'split', 'index.html'), 'text/html; charset=utf-8']],
    [`/${sourceId}/split/styles.css`, [path.join(sourceDir, 'split', 'styles.css'), 'text/css; charset=utf-8']],
    [`/${sourceId}/split/script.js`, [path.join(sourceDir, 'split', 'script.js'), 'text/javascript; charset=utf-8']],
  ]);
}

export { collectPageState as collectTrack64PageState };
