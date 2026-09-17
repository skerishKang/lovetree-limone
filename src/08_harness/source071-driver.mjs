import crypto from 'node:crypto';
import path from 'node:path';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function collectSRC71State() {
  const api = window.__LOVE_TREE_V7_R24__;
  const paper = document.getElementById('paper');
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('scene');
  const paperRect = paper?.getBoundingClientRect();
  const round6 = (value) => Math.round(value * 1e6) / 1e6;
  return {
    ids: [...document.querySelectorAll('[id]')].map((el) => el.id),
    elementCount: document.querySelectorAll('*').length,
    theme: api?.theme ?? null,
    viewY: api ? round6(api.viewY) : null,
    reelVelocity: api ? round6(api.reelVelocity) : null,
    reelCycle: api?.reelCycle ?? null,
    selected: api?.selected ?? null,
    lensCount: api?.lensCount ?? null,
    copyDone: document.getElementById('typedCopy')?.classList.contains('done') === true,
    paper: paperRect ? {
      x: round6(paperRect.x),
      y: round6(paperRect.y),
      width: round6(paperRect.width),
      height: round6(paperRect.height),
      backgroundColor: getComputedStyle(paper).backgroundColor,
      color: getComputedStyle(paper).color,
    } : null,
    stageTransform: stage ? getComputedStyle(stage).transform : null,
    canvas: canvas ? {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
    } : null,
    lensState: api?.lensState?.map((lens) => ({
      label: lens.label,
      y: round6(lens.y),
      hover: lens.hover,
      face: round6(lens.face),
      scale: round6(lens.scale),
    })) ?? [],
    themePressed: {
      white: document.getElementById('themeWhite')?.getAttribute('aria-pressed') ?? null,
      black: document.getElementById('themeBlack')?.getAttribute('aria-pressed') ?? null,
    },
    scroll: [window.scrollX, window.scrollY],
  };
}

async function waitForSRC71(page) {
  await page.waitForFunction(() => !!window.__LOVE_TREE_V7_R24__, null, { timeout: 15000 });
  await page.waitForFunction(() => document.getElementById('typedCopy')?.classList.contains('done') === true, null, { timeout: 15000 });
  await page.waitForTimeout(700);
}

async function captureShot(page, sourceOut, label, stateName) {
  const state = await page.evaluate(collectSRC71State);
  const png = await page.screenshot({ path: path.join(sourceOut, `${label}-${stateName.toLowerCase()}.png`) });
  return { state, screenshot_sha256: sha256(png), screenshot_bytes: png.length };
}

export async function captureSRC71Baseline(browser, baseUrl, viewport, sourceOut, label, sourceId = 'SRC071') {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const errors = [];
  const failedRequests = [];
  const attachLogs = (page) => {
    page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
    page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`.trim()));
  };

  try {
    const page = await context.newPage();
    attachLogs(page);
    const response = await page.goto(`${baseUrl}?paused`, { waitUntil: 'load', timeout: 30000 });
    if (!response?.ok()) throw new Error(`${sourceId} ${label}: HTTP ${response?.status()}`);
    await waitForSRC71(page);

    const states = {};
    states.INITIAL = await captureShot(page, sourceOut, label, 'INITIAL');

    await page.evaluate(() => document.getElementById('themeBlack')?.click());
    await page.waitForTimeout(500);
    states.THEME_BLACK = await captureShot(page, sourceOut, label, 'THEME_BLACK');
    if (states.THEME_BLACK.state.theme !== 'black') throw new Error(`${sourceId} ${label}: theme black activation failed`);

    await page.evaluate(() => document.getElementById('themeWhite')?.click());
    await page.waitForTimeout(500);
    const themeRestore = await page.evaluate(() => window.__LOVE_TREE_V7_R24__?.theme ?? null);
    if (themeRestore !== 'white') throw new Error(`${sourceId} ${label}: theme restore failed`);

    await page.evaluate(() => window.__LOVE_TREE_V7_R24__.dragTo(470));
    await page.waitForTimeout(500);
    states.REEL_OFFSET_470 = await captureShot(page, sourceOut, label, 'REEL_OFFSET_470');
    if (Math.abs(states.REEL_OFFSET_470.state.viewY - 470) > 0.01) {
      throw new Error(`${sourceId} ${label}: deterministic reel offset failed (${states.REEL_OFFSET_470.state.viewY})`);
    }

    const interaction = {
      themeRestoreWhite: true,
      deterministicReelOffset: states.REEL_OFFSET_470.state.viewY,
      mobileClip: null,
      lensActivation: null,
    };

    if (viewport.width <= 430) {
      interaction.mobileClip = await page.evaluate(() => {
        const paper = document.getElementById('paper').getBoundingClientRect();
        const cta = document.getElementById('cta').getBoundingClientRect();
        const toggle = document.querySelector('.theme-toggle').getBoundingClientRect();
        return {
          paperRight: Math.round(paper.right),
          ctaInside: cta.left >= 0 && cta.right <= innerWidth,
          themeToggleInside: toggle.left < innerWidth && toggle.right > 0,
          viewportWidth: innerWidth,
          scroll: [scrollX, scrollY],
        };
      });
      if (interaction.mobileClip.scroll.some((value) => value !== 0)) throw new Error(`${sourceId} ${label}: unexpected mobile scroll drift`);
    }

    if (viewport.width === 1440 && viewport.height === 900) {
      const lensPage = await context.newPage();
      attachLogs(lensPage);
      const lensResponse = await lensPage.goto(`${baseUrl}?qa&paused`, { waitUntil: 'load', timeout: 30000 });
      if (!lensResponse?.ok()) throw new Error(`${sourceId} ${label}: lens HTTP ${lensResponse?.status()}`);
      await waitForSRC71(lensPage);
      await lensPage.evaluate(() => window.__LOVE_TREE_V7_R24__.activate(2));
      await lensPage.waitForFunction(() => document.getElementById('portalStatus')?.textContent?.startsWith('QA ROUTE'), null, { timeout: 5000 });
      await lensPage.waitForTimeout(2500);
      states.LENS_ACTIVATE_OPENING = await captureShot(lensPage, sourceOut, label, 'LENS_ACTIVATE_OPENING');
      interaction.lensActivation = await lensPage.evaluate(() => ({
        status: document.getElementById('portalStatus')?.textContent ?? null,
        shown: document.getElementById('portalStatus')?.classList.contains('show') === true,
        selected: window.__LOVE_TREE_V7_R24__.selected,
        pressedCount: [...document.querySelectorAll('.hit')].filter((el) => el.getAttribute('aria-pressed') === 'true').length,
      }));
      if (!interaction.lensActivation.status?.startsWith('QA ROUTE') || interaction.lensActivation.shown !== true) {
        throw new Error(`${sourceId} ${label}: QA lens activation failed`);
      }
      await lensPage.close();
    }

    if (errors.length) throw new Error(`${sourceId} ${label}: browser errors: ${errors.join('; ')}`);
    if (failedRequests.length) throw new Error(`${sourceId} ${label}: failed requests: ${failedRequests.join('; ')}`);

    return { states, interaction, errors, failedRequests };
  } finally {
    await context.close();
  }
}
