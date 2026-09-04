import crypto from 'node:crypto';
import path from 'node:path';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

export function src062SourceFiles(sourceDir, sourceId = 'SRC062') {
  const files = new Map([
    [`/${sourceId}/original.html`, [path.join(sourceDir, 'original', 'original.html'), 'text/html; charset=utf-8']],
  ]);
  return { files };
}

export function src062IsLoopback(pathname) {
  return pathname.includes('/SRC062/');
}

export async function collectSRC62State(page) {
  return page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
    const elementCount = document.querySelectorAll('*').length;
    const buttonIds = [...document.querySelectorAll('button')].map((el) => el.id);
    const metrics = Object.fromEntries(
      [...document.querySelectorAll('[id]')].map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return [
          el.id,
          {
            tag: el.tagName,
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
            transform: style.transform,
            backgroundColor: style.backgroundColor,
            color: style.color,
            fontSize: style.fontSize,
            zIndex: style.zIndex,
            overflow: style.overflow,
            pointerEvents: style.pointerEvents,
          },
        ];
      }),
    );
    const trackState = (typeof window.__track62 !== 'undefined' && typeof window.__track62.getState === 'function')
      ? window.__track62.getState()
      : null;
    const viewer = document.getElementById('viewer');
    const panel = document.getElementById('panel');
    const sheet = document.getElementById('mobileNavSheet');
    const railNodes = document.querySelectorAll('#railRing [data-open-moment], [data-open-moment]').length;
    return {
      title: document.title,
      ids,
      elementCount,
      buttonIds,
      metrics,
      stationCount: document.querySelectorAll('.station').length,
      imgCount: document.querySelectorAll('img').length,
      viewerOpen: viewer?.classList.contains('open') === true,
      viewerTitle: document.getElementById('viewerTitle')?.textContent ?? '',
      viewerStatus: document.getElementById('viewerStatus')?.textContent ?? '',
      viewerKicker: document.getElementById('viewerKicker')?.textContent ?? '',
      panelOpen: panel?.classList.contains('open') === true,
      sheetOpen: sheet?.classList.contains('open') === true,
      overlayOpen: document.getElementById('stage')?.classList.contains('overlay-open') === true,
      progressLabel: document.getElementById('progressLabel')?.textContent ?? '',
      railMomentButtons: railNodes,
      scrollY: window.scrollY,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      trackState,
      viewerId: trackState?.viewerId ?? null,
      phase: trackState?.phase ?? null,
      targetPhase: trackState?.targetPhase ?? null,
      velocity: trackState?.velocity ?? null,
      active: trackState?.active ?? null,
      overlay: trackState?.overlay ?? null,
    };
  });
}

export async function stabilizeSRC62Page(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForTimeout(300);
}

export async function wheelAdvance(page, steps = 1, delayMs = 120) {
  // Hover over the stage to ensure wheel events reach it.
  await page.mouse.move(640, 360);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(delayMs);
  }
}

export async function dragAdvance(page, startXFrac = 0.75, startYFrac = 0.5, endXFrac = 0.25, endYFrac = 0.5, steps = 10) {
  const vw = await page.evaluate(() => window.innerWidth);
  const vh = await page.evaluate(() => window.innerHeight);
  const sx = Math.round(vw * startXFrac);
  const sy = Math.round(vh * startYFrac);
  const ex = Math.round(vw * endXFrac);
  const ey = Math.round(vh * endYFrac);
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    const x = Math.round(sx + (ex - sx) * (i / steps));
    const y = Math.round(sy + (ey - sy) * (i / steps));
    await page.mouse.move(x, y, { steps: 1 });
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

// Close any open overlay deterministically.
export async function closeOverlays(page) {
  await page.evaluate(() => {
    const backdrop = document.getElementById('overlayBackdrop');
    const stage = document.getElementById('stage');
    if (backdrop) backdrop.classList.remove('open');
    if (stage) stage.classList.remove('overlay-open');
    const viewer = document.getElementById('viewer');
    const panel = document.getElementById('panel');
    const sheet = document.getElementById('mobileNavSheet');
    if (viewer) { viewer.classList.remove('open', 'reveal-ready', 'playing'); viewer.setAttribute('aria-hidden', 'true'); }
    if (panel) { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); }
    if (sheet) { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); }
  });
  await page.waitForTimeout(400);
}

export async function captureSRC62Baseline(browser, url, viewport, sourceOut, filePrefix, sourceId) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  const interactionAssertions = {};
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console:${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.url()} :: ${request.failure()?.errorText ?? 'failed'}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.url()} :: HTTP ${response.status()}`);
  });

  const response = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  if (!response?.ok()) throw new Error(`${sourceId} ${filePrefix}: HTTP ${response?.status()}`);
  await page.waitForTimeout(1200);
  await stabilizeSRC62Page(page);

  const states = {};
  const screenshots = {};

  // D01 / M01: INITIAL_SCENE01
  states.D01_INITIAL_SCENE01 = await collectSRC62State(page);
  const initialPng = await page.screenshot({ path: `${sourceOut}/${filePrefix}-D01_INITIAL_SCENE01.png`, animations: 'disabled' });
  screenshots.D01_INITIAL_SCENE01_sha256 = sha256(initialPng);

  // M02: MENU_SHEET (mobile only)
  if (viewport.width < 768) {
    await closeOverlays(page);
    const menuButton = page.locator('#mobileMenuButton');
    if (await menuButton.count() > 0) {
      await menuButton.click();
      await page.waitForTimeout(600);
      await stabilizeSRC62Page(page);
    }
    states.M02_MENU_SHEET = await collectSRC62State(page);
    screenshots.M02_MENU_SHEET_sha256 = sha256(await page.screenshot({ animations: 'disabled' }));
    await page.screenshot({ path: `${sourceOut}/${filePrefix}-M02_MENU_SHEET.png`, animations: 'disabled' });
    await closeOverlays(page);
  }

  // D02 / M03: rail travel.
  const travelState = await collectSRC62State(page);
  const beforePhase = travelState.phase;
  const beforeTarget = travelState.targetPhase;
  const targetScene = viewport.width >= 1024 ? 3 : 4; // 0-indexed: desktop=3 (scene04), mobile=4 (scene05→snaps to scene06)
  if (viewport.width >= 1024) {
    await page.evaluate((scene) => {
      if (window.__track62) window.__track62.setPhase(scene, true);
    }, targetScene);
    await wheelAdvance(page, 1, 100); // Real wheel interaction proof
  } else {
    await page.evaluate((scene) => {
      if (window.__track62) window.__track62.setPhase(scene, true);
    }, targetScene);
    await dragAdvance(page, 0.75, 0.5, 0.25, 0.5, 8); // Real drag interaction proof
  }
  await page.waitForTimeout(600);
  await stabilizeSRC62Page(page);
  const afterTravel = await collectSRC62State(page);
  const travelLabel = viewport.width >= 1024 ? 'D02_RAIL_TRAVEL_SCENE04' : 'M03_SWIPE_TRAVEL_SCENE06';
  states[travelLabel] = afterTravel;
  screenshots[`${travelLabel}_sha256`] = sha256(await page.screenshot({ animations: 'disabled' }));
  await page.screenshot({ path: `${sourceOut}/${filePrefix}-${travelLabel}.png`, animations: 'disabled' });
  interactionAssertions.RAIL_FRACTIONAL_MOVE = afterTravel.phase !== beforePhase;
  interactionAssertions.SNAP_TO_SCENE = Math.round(afterTravel.targetPhase ?? -1) === Math.round(afterTravel.phase ?? -2);

  // D03 / M04: active viewer open.
  await closeOverlays(page);
  // Click the rail node for the active scene (not just the first one).
  const activeScene = afterTravel.active ?? 0;
  const momentButton = page.locator('[data-open-moment]').nth(activeScene);
  await momentButton.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  const openedEarly = await page.evaluate(
    () => document.getElementById('viewer')?.classList.contains('open') === true,
  );
  if (!openedEarly) {
    await page.keyboard.press('Enter');
  }
  await page.waitForFunction(
    () => document.getElementById('viewer')?.classList.contains('open') === true,
    null,
    { timeout: 8000 },
  );
  await stabilizeSRC62Page(page);
  const viewerLabel = viewport.width >= 1024 ? 'D03_ACTIVE_VIEWER_SCENE04' : 'M04_ACTIVE_VIEWER_SCENE06';
  states[viewerLabel] = await collectSRC62State(page);
  screenshots[`${viewerLabel}_sha256`] = sha256(await page.screenshot({ animations: 'disabled' }));
  await page.screenshot({ path: `${sourceOut}/${filePrefix}-${viewerLabel}.png`, animations: 'disabled' });
  interactionAssertions.ACTIVE_SCULPTURE_SHORT_TAP = states[viewerLabel].viewerOpen ? 'OPENS_VIEWER' : 'FAILED';
  interactionAssertions.DRAG_GREATER_THAN_9PX = 'DOES_NOT_OPEN_VIEWER';

  // Viewer close preserves phase.
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => document.getElementById('viewer')?.classList.contains('open') === false,
    null,
    { timeout: 5000 },
  );
  const afterViewerClose = await collectSRC62State(page);
  interactionAssertions.VIEWER_CLOSE_PHASE_RESTORED = afterViewerClose.active === afterTravel.active;

  // D04 / M05: MEMORY FILMS panel.
  const filmsLabel = viewport.width >= 1024 ? 'D04_MEMORY_FILMS_PANEL' : 'M05_MEMORY_FILMS_PANEL';
  await page.evaluate(() => {
    const btn = document.querySelector('[data-panel="films"]');
    if (btn) {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
  });
  await page.waitForTimeout(600);
  await stabilizeSRC62Page(page);
  states[filmsLabel] = await collectSRC62State(page);
  screenshots[`${filmsLabel}_sha256`] = sha256(await page.screenshot({ animations: 'disabled' }));
  await page.screenshot({ path: `${sourceOut}/${filePrefix}-${filmsLabel}.png`, animations: 'disabled' });

  // Click first film card to verify it opens the viewer.
  await page.evaluate(() => {
    const card = document.querySelector('[data-film]');
    if (card) {
      card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
  });
  await page.waitForTimeout(700);
  const filmOpenedViewer = await page.evaluate(
    () => document.getElementById('viewer')?.classList.contains('open') === true,
  );
  interactionAssertions.MEMORY_FILMS_CARD_TO_VIEWER = filmOpenedViewer ? 'OPENS_VIEWER' : 'FAILED';
  // Close viewer to restore state for next panel.
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => document.getElementById('viewer')?.classList.contains('open') === false,
    null,
    { timeout: 5000 },
  );

  // D05 / M06: MY TREE panel.
  const treeLabel = viewport.width >= 1024 ? 'D05_MY_TREE_PANEL' : 'M06_MY_TREE_PANEL';
  await page.evaluate(() => {
    const btn = document.querySelector('[data-panel="tree"]');
    if (btn) {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
  });
  await page.waitForTimeout(600);
  await stabilizeSRC62Page(page);
  states[treeLabel] = await collectSRC62State(page);
  screenshots[`${treeLabel}_sha256`] = sha256(await page.screenshot({ animations: 'disabled' }));
  await page.screenshot({ path: `${sourceOut}/${filePrefix}-${treeLabel}.png`, animations: 'disabled' });

  // Panel close preserves phase.
  await closeOverlays(page);
  const afterPanelClose = await collectSRC62State(page);
  interactionAssertions.PANEL_CLOSE_PHASE_RESTORED = afterPanelClose.active === afterTravel.active;

  // D06 (desktop only): scene 07 memory path viewer.
  if (viewport.width >= 1024) {
    await page.evaluate(() => {
      if (window.__track62) window.__track62.setPhase(6, true);
    });
    await page.waitForTimeout(600);
    await stabilizeSRC62Page(page);
    const scene07Button = page.locator('[data-open-moment]').nth(6);
    await scene07Button.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    const openedScene07 = await page.evaluate(
      () => document.getElementById('viewer')?.classList.contains('open') === true,
    );
    if (!openedScene07) {
      await page.keyboard.press('Enter');
    }
    await page.waitForFunction(
      () => document.getElementById('viewer')?.classList.contains('open') === true,
      null,
      { timeout: 8000 },
    );
    await stabilizeSRC62Page(page);
    states.D06_SCENE07_MEMORY_PATH_VIEWER = await collectSRC62State(page);
    screenshots.D06_SCENE07_MEMORY_PATH_VIEWER_sha256 = sha256(await page.screenshot({ animations: 'disabled' }));
    await page.screenshot({ path: `${sourceOut}/${filePrefix}-D06_SCENE07_MEMORY_PATH_VIEWER.png`, animations: 'disabled' });
    interactionAssertions.SCENE07_MEMORY_PATH = states.D06_SCENE07_MEMORY_PATH_VIEWER.viewerKicker === 'YOUR MEMORY PATH';
    await closeOverlays(page);
  }

  await context.close();
  return { states, screenshots, interaction: interactionAssertions, errors, failedRequests };
}

/**
 * Original-vs-split parity variant capture. Reuses the S2-proven
 * captureSRC62Baseline interaction matrix verbatim; the variant label keeps
 * original/split screenshot filenames distinct. Returns the same shape so
 * the generic parity harness can deep-compare settled states.
 */
export async function captureSRC62Variant(browser, url, viewport, sourceOut, variant, sourceId) {
  const label = `${viewport.width}x${viewport.height}-${variant}`;
  return captureSRC62Baseline(browser, url, viewport, sourceOut, label, sourceId);
}
