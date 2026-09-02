import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const ACTS = {
  ACT1_FIRST_FEELING: 0.900,
  ACT2_MOMENT: 4.100,
  ACT3_BLOOM: 7.500,
  ACT4_WHY_NEXT: 11.100,
  ACT5_LOVETREE: 13.200,
};

const MOBILE_WIDTH = 820;

function collectSRC47State() {
  const round = (v) => Math.round(v * 1000) / 1000;
  const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
  const stage = document.getElementById('stage');
  const video = document.getElementById('film');
  const modal = document.getElementById('modal');
  const navGroups = [...document.querySelectorAll('.nav-group')];
  const activeNavGroup = navGroups.find(g => g.classList.contains('is-open'));

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
      mode: document.getElementById('stateChip')?.textContent ?? null,
      act: stage?.dataset.act ? +stage.dataset.act : null,
      videoFailed: stage?.classList.contains('video-failed') ?? false,
      reducedMotion: stage?.classList.contains('reduced-motion') ?? false,
      ctaReady: stage?.classList.contains('cta-ready') ?? false,
      modalOpen: modal?.classList.contains('open') ?? false,
      navPopoverOpen: activeNavGroup ? activeNavGroup.querySelector('[data-nav-menu]')?.textContent ?? null : null,
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
  await waitForVideoReady(page, sourceId);
  await settleSRC47(page);
}

async function waitForVideoReady(page, sourceId, timeout = 30000) {
  // Give the page a moment to start fetching the MP4 after the load event;
  // headless Chromium sometimes does not begin the media request until the
  // first animation frame after navigation.
  await page.waitForTimeout(3000);
  await page.waitForFunction(() => {
    const video = document.getElementById('film');
    return video && video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0;
  }, null, { timeout });
}

async function unlockVideo(page) {
  // Headless Chromium blocks programmatic play/seek until a real user
  // gesture. A click on the play control is a genuine user gesture and also
  // starts the frozen script's own scrubLoop, which is what QA.seek relies on.
  const playPause = page.locator('#playPause');
  if (await playPause.count() === 0) {
    throw new Error('SRC047: #playPause control not found — cannot unlock video');
  }
  await playPause.click();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const video = document.getElementById('film');
    if (video) video.muted = true;
  });
}

async function seekACT(page, actKey) {
  const t = ACTS[actKey];
  // Headless Chromium refuses to seek the MP4 until a real user gesture
  // unlocks playback, and only honours currentTime while the element is
  // playing. The frozen script's own QA.seek(t) is the canonical path: it
  // pauses, sets scrubTime/targetTime, forces the scrubLoop to drive the
  // frame, and applies the ACT composition. Use it rather than assigning
  // currentTime directly.
  await page.evaluate((target) => {
    const video = document.getElementById('film');
    if (video) video.muted = true;
    window.__lovetreeQA.seek(target);
  }, t);
  await page.waitForFunction((target) => {
    const video = document.getElementById('film');
    return video && video.readyState >= 2 && Math.abs(video.currentTime - target) < 0.05;
  }, t, { timeout: 20000 });
  await page.waitForTimeout(500);
}

async function openModal(page, baseUrl) {
  // Real Source-native trigger: the frozen script routes the firstMoment
  // anchor through openComposer() only when ?demoComposer=1 is present.
  // No class is assigned directly; the composer opens via the script's own handler.
  const demoUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'demoComposer=1';
  const response = await page.goto(demoUrl, { waitUntil: 'load', timeout: 30000 });
  if (!response?.ok()) throw new Error(`SRC047 modal pre-navigation HTTP ${response?.status()}`);
  await waitForVideoReady(page, 'SRC047');
  await settleSRC47(page);

  const firstMoment = page.locator('[data-route="firstMoment"]').first();
  if (await firstMoment.count() === 0) {
    throw new Error('SRC047: firstMoment route anchor not found — cannot open modal natively');
  }
  await firstMoment.click();
  await page.waitForFunction(() => {
    const modal = document.getElementById('modal');
    return modal && modal.classList.contains('open');
  }, null, { timeout: 5000 });
  await page.waitForTimeout(300);
}

async function closeModal(page) {
  const closeBtn = page.locator('#closeModal');
  if (await closeBtn.count() > 0) {
    await closeBtn.click();
    await page.waitForFunction(() => {
      const modal = document.getElementById('modal');
      return modal && !modal.classList.contains('open');
    }, null, { timeout: 5000 });
  }
}

async function openNavPopover(page) {
  const modal = page.locator('#modal');
  if (await modal.count() > 0 && await modal.evaluate(el => el.classList.contains('open'))) {
    await closeModal(page);
    await page.waitForTimeout(200);
  }
  const navGroup = page.locator('.nav-group').first();
  const trigger = navGroup.locator('[data-nav-menu]');
  if (await trigger.count() === 0) {
    throw new Error('SRC047: nav-group trigger not found');
  }
  // Real Source-native trigger: clicking the pinned nav trigger runs the
  // script's own click handler, which toggles .is-open + aria-expanded.
  await trigger.click();
  await page.waitForFunction(() => {
    const group = document.querySelector('.nav-group.is-open');
    return !!group;
  }, null, { timeout: 5000 });
  await page.waitForTimeout(300);
}

async function captureState(page, sourceOut, label, stateName) {
  const state = await page.evaluate(collectSRC47State);
  const png = await page.screenshot({
    path: path.join(sourceOut, `${label}-original-${stateName}.png`),
    animations: 'disabled',
  });
  return { state, pngSha: sha256(png), stateName };
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

async function captureSRC47Page(page, baseUrl, sourceOut, variant, sourceId, label, errors = []) {
  await waitForVideoReady(page, sourceId);
  await settleSRC47(page);
  if (errors.length) throw new Error(`${sourceId} ${variant}: browser errors before capture: ${errors.join('; ')}`);

  const states = {};
  const screenshots = {};

  // INITIAL first (after a real unlock gesture), then ACT1-5 via QA.seek,
  // then MODAL, then NAV.
  await unlockVideo(page);
  states.INITIAL = await captureState(page, sourceOut, label, 'INITIAL');
  screenshots.initial_sha256 = states.INITIAL.pngSha;

  for (const [name] of Object.entries(ACTS)) {
    await seekACT(page, name);
    states[name] = await captureState(page, sourceOut, label, name);
    screenshots[`${name.toLowerCase()}_sha256`] = states[name].pngSha;
  }

  await openModal(page, baseUrl);
  states.MODAL_OPEN = await captureState(page, sourceOut, label, 'MODAL_OPEN');
  screenshots.modal_sha256 = states.MODAL_OPEN.pngSha;

  await closeModal(page);
  await page.waitForTimeout(200);

  const isMobile = page.viewportSize().width <= MOBILE_WIDTH;
  if (!isMobile) {
    await openNavPopover(page);
    states.NAV_POPOVER_OPEN = await captureState(page, sourceOut, label, 'NAV_POPOVER_OPEN');
    screenshots.nav_sha256 = states.NAV_POPOVER_OPEN.pngSha;
  } else {
    states.NAV_POPOVER_OPEN = {
      stateName: 'NOT_APPLICABLE_MOBILE',
      state: { note: 'nav groups hidden by frozen responsive contract' },
      pngSha: null,
    };
  }

  const interaction = await exerciseSRC47(page, sourceId, `${label} ${variant}`);

  if (errors.length) throw new Error(`${sourceId} ${label} ${variant}: browser errors: ${errors.join('; ')}`);

  return {
    states,
    interaction,
    errors,
    screenshots,
  };
}

export async function captureSRC47Baseline(page, baseUrl, sourceOut, label) {
  return captureSRC47Page(page, baseUrl, sourceOut, 'original', 'SRC047', label);
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
    return await captureSRC47Page(page, url, sourceOut, variant, sourceId, `${viewport.width}x${viewport.height}`, errors);
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