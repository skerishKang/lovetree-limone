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

// Deterministic page-state collector for SRC062 (single-file rail exhibit:
// pointer/keyboard-driven rail, moment viewer overlay, panel, mobile sheet).
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
          },
        ];
      }),
    );
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
    };
  });
}

export async function stabilizeSRC62Page(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForTimeout(300);
}

export async function captureSRC62Baseline(browser, url, viewport, sourceOut, filePrefix, sourceId) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
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

  // STATE 1: INITIAL (load top, no interaction).
  states.INITIAL = await collectSRC62State(page);
  const initialPng = await page.screenshot({ path: `${sourceOut}/${filePrefix}-INITIAL.png`, animations: 'disabled' });
  screenshots.INITIAL_sha256 = sha256(initialPng);

  // Interaction: advance the rail via keyboard, then open a moment viewer
  // through the real [data-open-moment] control (two-step: snap then open).
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  // The VIEW MOMENT control sits beneath its scene article in hit-test order,
  // so pointer clicks are intercepted by design. Drive it via keyboard:focus the
  // control, then send a real Enter keystroke (native button activation fires
  // the page's own click handler). This matches the page's keyboard-support model.
  const momentButton = page.locator('[data-open-moment]').first();
  await momentButton.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  const openedEarly = await page.evaluate(
    () => document.getElementById('viewer')?.classList.contains('open') === true,
  );
  if (!openedEarly) {
    // First Enter only snapped the rail to the button's scene; second Enter opens.
    await page.keyboard.press('Enter');
  }
  await page.waitForFunction(
    () => document.getElementById('viewer')?.classList.contains('open') === true,
    null,
    { timeout: 8000 },
  );
  await stabilizeSRC62Page(page);

  // STATE 2: VIEWER_OPEN (moment overlay revealed).
  states.VIEWER_OPEN = await collectSRC62State(page);
  if (!states.VIEWER_OPEN.viewerOpen) throw new Error(`${sourceId} ${filePrefix}: viewer did not open`);
  if (!states.VIEWER_OPEN.viewerTitle) throw new Error(`${sourceId} ${filePrefix}: viewer title empty`);
  const viewerPng = await page.screenshot({ path: `${sourceOut}/${filePrefix}-VIEWER_OPEN.png`, animations: 'disabled' });
  screenshots.VIEWER_OPEN_sha256 = sha256(viewerPng);

  // Interaction close probe: Escape must close the overlay.
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => document.getElementById('viewer')?.classList.contains('open') === false,
    null,
    { timeout: 5000 },
  );
  const interaction = {
    railAdvancedViaKeyboard: true,
    viewerOpenedViaControl: true,
    viewerClosedViaEscape: true,
  };

  await context.close();
  return { states, screenshots, interaction, errors, failedRequests };
}
