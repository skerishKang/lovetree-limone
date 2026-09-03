import crypto from 'node:crypto';
import path from 'node:path';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

// 1x1 transparent PNG placeholder for archive image requests. The SRC068
// authority is HTML-only; archive ../images/*.png files are corroborating
// media, not frozen bytes. Serving a deterministic placeholder over loopback
// lets both original and split resolve all 9 variant image requests with 200
// so parity can assert variant-correct sets and ZERO cross-contamination
// without altering the Source.
const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PLACEHOLDER_PNG = Buffer.from(PLACEHOLDER_PNG_BASE64, 'base64');

export function src68PlaceholderPng() {
  return PLACEHOLDER_PNG;
}

export function src68ExpectedImages(variant) {
  if (variant === 'A') {
    return [
      '01.png',
      '02.png',
      '03.png',
      '04.png',
      '05.png',
      '06.png',
      '07.png',
      '08.png',
      '09.png',
    ];
  }
  if (variant === 'B') {
    return [
      '동양인01.png',
      '동양인02.png',
      '동양인03.png',
      '동양인04.png',
      '동양인05.png',
      '동양인06.png',
      '동양인07.png',
      '동양인08.png',
      '동양인09.png',
    ];
  }
  throw new Error(`SRC068 unknown variant: ${String(variant)}`);
}

// Route map for the loopback parity server. Originals keep their frozen
// variant-hardcoded imageUrls; split resolves via window.mediaVariant.
// Any loopback *.png request (both /SRC068/original/... and /SRC068/...)
// receives the deterministic placeholder so all 9 requests succeed.
export function src68SourceFiles(sourceDir, sourceId = 'SRC068') {
  const files = new Map([
    [`/${sourceId}/original/A/original.html`, [path.join(sourceDir, 'original', 'A', 'original.html'), 'text/html; charset=utf-8']],
    [`/${sourceId}/original/B/original.html`, [path.join(sourceDir, 'original', 'B', 'original.html'), 'text/html; charset=utf-8']],
    [`/${sourceId}/split/index.html`, [path.join(sourceDir, 'split', 'index.html'), 'text/html; charset=utf-8']],
    [`/${sourceId}/split/styles.css`, [path.join(sourceDir, 'split', 'styles.css'), 'text/css; charset=utf-8']],
    [`/${sourceId}/split/script.js`, [path.join(sourceDir, 'split', 'script.js'), 'text/javascript; charset=utf-8']],
    [`/${sourceId}/split/assets/variant-A.json`, [path.join(sourceDir, 'split', 'assets', 'variant-A.json'), 'application/json; charset=utf-8']],
    [`/${sourceId}/split/assets/variant-B.json`, [path.join(sourceDir, 'split', 'assets', 'variant-B.json'), 'application/json; charset=utf-8']],
  ]);
  return { files, placeholder: PLACEHOLDER_PNG };
}

export function src68IsLoopbackImage(pathname) {
  return pathname.endsWith('.png') && pathname.includes('/SRC068/');
}

// Deterministic page-state collector for SRC068. No window.__lt dependency:
// the Source runtime is video-scrub + scroll-panel + card grid + works overlay.
export async function collectSRC68State(page) {
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
    const images = [...document.querySelectorAll('#grid img')].map((img) => img.getAttribute('src'));
    const tags = [...document.querySelectorAll('#grid .tag')].map((el) => el.textContent);
    const cards = document.querySelectorAll('#grid .card').length;
    const worksRows = document.querySelectorAll('#worksList .work-row').length;
    const videos = [...document.querySelectorAll('video')].map((v) => ({
      id: v.id,
      src: v.getAttribute('src'),
      readyState: v.readyState,
      paused: v.paused,
    }));
    return {
      title: document.title,
      ids,
      elementCount,
      buttonIds,
      metrics,
      images,
      imageBasenames: images.map((s) => {
        try {
          return decodeURIComponent(String(s).split('/').pop().split('?')[0]);
        } catch {
          return String(s);
        }
      }),
      tags,
      cards,
      worksRows,
      videos,
      scrollY: window.scrollY,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      mediaVariant: window.mediaVariant ?? null,
      worksOpen: document.getElementById('worksOverlay')?.classList.contains('open') === true,
      panelTransform: document.getElementById('panel')?.style.transform ?? '',
      whiteOpacity: document.getElementById('white')?.style.opacity ?? '',
    };
  });
}

// Stabilize dynamic hero content before screenshots so original/split
// comparisons are deterministic: pause videos, settle scroll-driven rAF,
// wait for fonts, consume startup timers.
export async function stabilizeSRC68Page(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('video').forEach((v) => {
      try {
        v.pause();
      } catch {
        // ignore
      }
    });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  try {
    await page.evaluate(async () => {
      if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]);
    });
  } catch {
    // fonts are external; instability is recorded separately, never fatal here
  }
  await page.waitForTimeout(250);
}

export async function captureSRC68Variant(browser, url, viewport, sourceOut, filePrefix, sourceId, { mediaVariant = null } = {}) {
  const contextOptions = { viewport, reducedMotion: 'reduce' };
  const context = await browser.newContext(contextOptions);
  // Explicit runtime selector only. No default: split requires mediaVariant
  // A|B via init script; original pages must NOT receive one.
  if (mediaVariant !== null) {
    if (mediaVariant !== 'A' && mediaVariant !== 'B') throw new Error(`${sourceId}: invalid mediaVariant ${String(mediaVariant)}`);
    await context.addInitScript((variant) => {
      window.mediaVariant = variant;
    }, mediaVariant);
  }
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  const imageRequests = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console:${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.url()} :: ${request.failure()?.errorText ?? 'failed'}`);
  });
  page.on('response', (response) => {
    const reqUrl = response.url();
    if (reqUrl.endsWith('.png') && reqUrl.includes('/SRC068/')) {
      imageRequests.push({ url: reqUrl, status: response.status() });
    }
    if (response.status() >= 400 && reqUrl.includes('127.0.0.1')) {
      failedRequests.push(`${reqUrl} :: HTTP ${response.status()}`);
    }
  });

  const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  if (!response?.ok()) throw new Error(`${sourceId} ${filePrefix}: HTTP ${response?.status()}`);

  // Wait for the 9-card archive grid to build (identical JS for original/split).
  await page.waitForFunction(() => document.querySelectorAll('#grid .card').length === 9, null, { timeout: 15000 });
  await page.waitForTimeout(900);
  await stabilizeSRC68Page(page);

  const states = {};
  const screenshots = {};

  // STATE 1: INITIAL_HERO (scroll top).
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await stabilizeSRC68Page(page);
  states.INITIAL_HERO = await collectSRC68State(page);
  const heroPng = await page.screenshot({ path: `${sourceOut}/${filePrefix}-INITIAL_HERO.png`, animations: 'disabled' });
  screenshots.INITIAL_HERO_sha256 = sha256(heroPng);

  // STATE 2: ARCHIVE_GRID (scrolled to archive).
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await stabilizeSRC68Page(page);
  states.ARCHIVE_GRID = await collectSRC68State(page);
  const archivePng = await page.screenshot({ path: `${sourceOut}/${filePrefix}-ARCHIVE_GRID.png`, animations: 'disabled' });
  screenshots.ARCHIVE_GRID_sha256 = sha256(archivePng);

  // Interaction probe (identical sequence): the works CTA (#view) is only
  // visible once scrolled past the archive (frame() scales it in). Scroll to
  // the bottom where it is pointer-active, then open/close the overlay.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  await stabilizeSRC68Page(page);
  await page.click('#view');
  await page.waitForFunction(() => document.getElementById('worksOverlay')?.classList.contains('open') === true, null, { timeout: 5000 });
  const worksOpen = await page.evaluate(() => document.getElementById('worksOverlay')?.classList.contains('open') === true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('worksOverlay')?.classList.contains('open') === false, null, { timeout: 5000 });
  const worksClosed = await page.evaluate(() => document.getElementById('worksOverlay')?.classList.contains('open') === false);
  const interaction = { worksOpen, worksClosed, controlSurface: 'WORKS_OVERLAY_VIA_VIEW_BUTTON' };
  if (!worksOpen || !worksClosed) throw new Error(`${sourceId} ${filePrefix}: works overlay interaction failed`);

  await context.close();
  return { states, screenshots, interaction, errors, failedRequests, imageRequests };
}
