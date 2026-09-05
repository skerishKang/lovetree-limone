import crypto from 'node:crypto';
import path from 'node:path';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const round3 = (value) => Math.round(value * 1000) / 1000;

// SRC066 is a hook-less Source (frozen S1 defect D9: zero QA hooks —
// 0 window.__*, 0 console.*, 0 data-testid). This observer reads DOM,
// geometry, scroll and sessionStorage ONLY. It never mutates the page,
// never injects a hook, and ships no test-only code with the Source.
// NOTE: this function is serialized into the page by page.evaluate, so it
// must be fully self-contained (no module-scope references).
function collectSRC66State() {
  const round3 = (value) => Math.round(value * 1000) / 1000;
  const de = document.documentElement;
  const rectOf = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      x: round3(r.x), y: round3(r.y), w: round3(r.width), h: round3(r.height),
      opacity: +cs.opacity,
    };
  };
  const proc = document.getElementById('process');
  const pr = proc.getBoundingClientRect();
  const max = proc.offsetHeight - window.innerHeight;
  const p = Math.max(0, Math.min(1, -pr.top / max));
  const steps = [...document.querySelectorAll('.step')];
  const ss = {};
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    ss[k] = sessionStorage.getItem(k);
  }
  const footer = document.querySelector('footer');
  const fr = footer ? footer.getBoundingClientRect() : null;
  const imgs = [...document.images];
  return {
    ids: [...document.querySelectorAll('[id]')].map((el) => el.id),
    elementCount: document.querySelectorAll('*').length,
    scroll: [Math.round(window.scrollX), Math.round(window.scrollY)],
    scrollHeight: de.scrollHeight,
    horizontalOverflow: de.scrollWidth - de.clientWidth,
    progress: +p.toFixed(6),
    activeStep: steps.findIndex((el) => el.classList.contains('active')),
    copy: document.getElementById('processCopy')?.textContent.trim() ?? null,
    treeLabel: document.getElementById('treeLabel')?.textContent.trim() ?? null,
    header: rectOf('header'),
    heroCopy: rectOf('.hero-copy'),
    h1FontSize: getComputedStyle(document.querySelector('h1')).fontSize,
    world: rectOf('#worldStage'),
    faqOpen: document.querySelectorAll('.faq-item.open').length,
    footerInView: fr ? (fr.top < window.innerHeight && fr.bottom > 0) : false,
    footerBg: footer ? getComputedStyle(footer).backgroundColor : null,
    sessionStorage: ss,
    imgCount: imgs.length,
    brokenImgCount: imgs.filter((img) => img.complete && img.naturalWidth === 0).length,
  };
}

async function settleScroll(page) {
  await page.evaluate(async () => {
    let last = -1;
    let stable = 0;
    for (let i = 0; i < 100; i++) {
      const y = Math.round(window.scrollY);
      if (y === last) {
        stable += 1;
        if (stable >= 5) break;
      } else {
        stable = 0;
        last = y;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function captureShot(page, sourceOut, label, stateName) {
  const state = await page.evaluate(collectSRC66State);
  const png = await page.screenshot({ path: path.join(sourceOut, `${label}-${stateName.toLowerCase().replace(/_/g, '-')}.png`) });
  return { state, screenshot_sha256: sha256(png), screenshot_bytes: png.length };
}

function assertCleanFrame(state, sourceId, label, stateName) {
  if (state.horizontalOverflow !== 0) throw new Error(`${sourceId} ${label} ${stateName}: horizontal overflow ${state.horizontalOverflow}`);
  if (state.brokenImgCount !== 0) throw new Error(`${sourceId} ${label} ${stateName}: ${state.brokenImgCount} broken images`);
}

export async function captureSRC66Baseline(browser, baseUrl, viewport, sourceOut, label, sourceId = 'SRC066') {
  const desktop = viewport.width > 900;
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
    const response = await page.goto(baseUrl, { waitUntil: 'load', timeout: 30000 });
    if (!response?.ok()) throw new Error(`${sourceId} ${label}: HTTP ${response?.status()}`);
    await page.waitForTimeout(500);
    await settleScroll(page);

    const states = {};
    const clickPath = [];
    states.INITIAL = await captureShot(page, sourceOut, label, 'INITIAL');
    assertCleanFrame(states.INITIAL.state, sourceId, label, 'INITIAL');
    if (states.INITIAL.state.activeStep !== 0) throw new Error(`${sourceId} ${label} INITIAL: expected step 0 active`);
    if (states.INITIAL.state.progress !== 0) throw new Error(`${sourceId} ${label} INITIAL: expected progress 0`);

    const clickStep = async (index, name, expectedP) => {
      await page.locator('.step').nth(index).click();
      await settleScroll(page);
      states[name] = await captureShot(page, sourceOut, label, name);
      assertCleanFrame(states[name].state, sourceId, label, name);
      if (states[name].state.activeStep !== index) throw new Error(`${sourceId} ${label} ${name}: expected step ${index} active`);
      if (Math.abs(states[name].state.progress - expectedP) > 0.005) {
        throw new Error(`${sourceId} ${label} ${name}: expected progress ~${expectedP}, got ${states[name].state.progress}`);
      }
      clickPath.push({ step: index, progress: states[name].state.progress });
    };

    let midMorphP = null;
    let reverseRestored = null;
    if (desktop) {
      await clickStep(1, 'STEP1', 1 / 3);
      await clickStep(2, 'STEP2', 2 / 3);
      await clickStep(3, 'STEP3', 1);
      await page.evaluate(() => {
        const proc = document.getElementById('process');
        const max = proc.offsetHeight - window.innerHeight;
        window.scrollTo({ top: proc.offsetTop + max * 0.5, behavior: 'instant' });
      });
      await settleScroll(page);
      states.MID_MORPH = await captureShot(page, sourceOut, label, 'MID_MORPH');
      assertCleanFrame(states.MID_MORPH.state, sourceId, label, 'MID_MORPH');
      midMorphP = states.MID_MORPH.state.progress;
      if (Math.abs(midMorphP - 0.5) > 0.01) throw new Error(`${sourceId} ${label} MID_MORPH: expected progress ~0.5, got ${midMorphP}`);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await settleScroll(page);
      states.REVERSE_RETURN = await captureShot(page, sourceOut, label, 'REVERSE_RETURN');
      assertCleanFrame(states.REVERSE_RETURN.state, sourceId, label, 'REVERSE_RETURN');
      reverseRestored = states.REVERSE_RETURN.state.scroll[1] === 0 && states.REVERSE_RETURN.state.activeStep === 0;
      if (!reverseRestored) throw new Error(`${sourceId} ${label} REVERSE_RETURN: did not restore INITIAL scroll/step`);
    } else {
      await clickStep(0, 'STEP_FIRST', 0);
      await clickStep(3, 'STEP_LAST', 1);
    }

    await page.evaluate(() => {
      const btn = document.querySelector('.faq-item button, .faq-q');
      btn.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await settleScroll(page);
    await page.locator('.faq-item button, .faq-q').first().click();
    await page.waitForTimeout(400);
    states.FAQ_OPEN = await captureShot(page, sourceOut, label, 'FAQ_OPEN');
    assertCleanFrame(states.FAQ_OPEN.state, sourceId, label, 'FAQ_OPEN');
    const faqOpened = states.FAQ_OPEN.state.faqOpen >= 1;
    if (!faqOpened) throw new Error(`${sourceId} ${label} FAQ_OPEN: no .faq-item.open after click`);

    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await settleScroll(page);
    states.FOOTER_REACHED = await captureShot(page, sourceOut, label, 'FOOTER_REACHED');
    assertCleanFrame(states.FOOTER_REACHED.state, sourceId, label, 'FOOTER_REACHED');
    const footerReached = states.FOOTER_REACHED.state.footerInView === true;
    if (!footerReached) throw new Error(`${sourceId} ${label} FOOTER_REACHED: footer not in view`);

    const interaction = {
      desktop,
      clickPath,
      midMorphP,
      reverseRestored,
      faqOpened,
      footerReached,
      storageKeysObserved: Object.keys(states.FOOTER_REACHED.state.sessionStorage),
    };

    if (errors.length) throw new Error(`${sourceId} ${label}: browser errors: ${errors.join('; ')}`);
    if (failedRequests.length) throw new Error(`${sourceId} ${label}: failed requests: ${failedRequests.join('; ')}`);

    return { states, interaction, errors, failedRequests };
  } finally {
    await context.close();
  }
}
