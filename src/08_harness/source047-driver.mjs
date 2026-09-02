import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function collectSRC47State() {
  const round = (v) => Math.round(v * 1000) / 1000;
  const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
  const stage = document.getElementById('stage');
  const video = document.getElementById('film');
  const scrim = document.getElementById('scrim');
  const modal = document.getElementById('modal');
  const stateChip = document.getElementById('stateChip');

  const metrics = Object.fromEntries([...document.querySelectorAll('[id]')].map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return [el.id, {
      tag: el.tagName,
      className: typeof el.className === 'string' ? el.className : '',
      rect: { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) },
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
    }];
  }));

  return {
    ids,
    elementCount: document.querySelectorAll('body *:not(script):not(link):not(style)').length,
    buttonIds: [...document.querySelectorAll('button')].map(el => el.id),
    metrics,
    runtime: {
      mode: stateChip?.textContent ?? null,
      act: stage?.dataset.act ? +stage.dataset.act : null,
      videoFailed: stage?.classList.contains('video-failed') ?? false,
      reducedMotion: stage?.classList.contains('reduced-motion') ?? false,
      ctaReady: stage?.classList.contains('cta-ready') ?? false,
      modalOpen: modal?.classList.contains('open') ?? false,
    },
    video: {
      paused: video?.paused ?? true,
      muted: video?.muted ?? true,
      currentTime: video?.currentTime ?? 0,
      duration: video?.duration ?? 0,
      readyState: video?.readyState ?? 0,
    },
  };
}

async function settleSRC47(page) {
  await page.evaluate(async () => {
    document.getElementById('toast')?.classList.remove('show');
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function assertSRC47Ready(page, sourceId) {
  await page.waitForFunction(() => {
    const stage = document.getElementById('stage');
    return stage && document.readyState === 'complete';
  }, null, { timeout: 15000 });
}

async function exerciseSRC47(page, sourceId, label) {
  const results = { controlSurface: 'CINEMATIC_FRONTDOOR' };

  const playPause = page.locator('#playPause');
  if (await playPause.count() > 0) {
    await playPause.click();
    await page.waitForTimeout(300);
    results.playPauseClicked = true;
  }

  const muteBtn = page.locator('#muteBtn');
  if (await muteBtn.count() > 0) {
    await muteBtn.click();
    await page.waitForTimeout(200);
    results.muteClicked = true;
  }

  const progressRail = page.locator('#progressRail');
  if (await progressRail.count() > 0) {
    await progressRail.click();
    await page.waitForTimeout(300);
    results.progressRailClicked = true;
  }

  return results;
}

async function captureSRC47State(page, sourceOut, variant, label, stateName) {
  const state = await page.evaluate(collectSRC47State);
  const png = await page.screenshot({
    path: path.join(sourceOut, `${label}-${variant}-${stateName}.png`),
    animations: 'disabled'
  });
  return { state, pngSha: sha256(png), stateName };
}

async function captureSRC47Page(page, sourceOut, variant, sourceId, label, errors = []) {
  await assertSRC47Ready(page, sourceId);
  await settleSRC47(page);
  if (errors.length) throw new Error(`${sourceId} ${variant}: browser errors before capture: ${errors.join('; ')}`);

  const initial = await captureSRC47State(page, sourceOut, variant, label, 'INITIAL');
  const interaction = await exerciseSRC47(page, sourceId, `${label} ${variant}`);

  if (errors.length) throw new Error(`${sourceId} ${label} ${variant}: browser errors: ${errors.join('; ')}`);

  return {
    states: { initial },
    interaction,
    errors,
    screenshots: { initial_sha256: initial.pngSha },
  };
}

export async function captureSRC47Baseline(page, sourceOut, label) {
  return captureSRC47Page(page, sourceOut, 'original', 'SRC047', label);
}

export async function captureSRC47Variant(browser, url, viewport, sourceOut, variant, sourceId) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}${error.stack ? ` @ ${error.stack.split('\n').slice(1, 3).join(' <- ').trim()}` : ''}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    if (!response?.ok()) throw new Error(`${sourceId} ${variant}: HTTP ${response?.status()}`);
    return await captureSRC47Page(page, sourceOut, variant, sourceId, `${viewport.width}x${viewport.height}`, errors);
  } finally {
    await context.close();
  }
}

export function src47SourceFiles(sourceDir, sourceId = 'SRC047') {
  const files = new Map([
    [`/${sourceId}/original.html`, [path.join(sourceDir, 'original', 'original.html'), 'text/html; charset=utf-8']],
  ]);

  const assetsDir = path.join(sourceDir, 'original', 'assets');
  if (fs.existsSync(assetsDir)) {
    const assetFiles = fs.readdirSync(assetsDir);
    for (const file of assetFiles) {
      const ext = path.extname(file).toLowerCase();
      let mimeType = 'application/octet-stream';
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      if (ext === '.mp4') mimeType = 'video/mp4';
      files.set(`/${sourceId}/assets/${file}`, [path.join(assetsDir, file), mimeType]);
    }
  }

  return files;
}

export { collectSRC47State };
