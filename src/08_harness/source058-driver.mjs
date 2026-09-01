import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

async function canonicalPixelDigest(page, pngBuffer) {
  const b64 = pngBuffer.toString('base64');
  const data = await page.evaluate(async (src) => {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = `data:image/png;base64,${src}`; });
    const N = 16;
    const canvas = document.createElement('canvas');
    canvas.width = N;
    canvas.height = N;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, N, N);
    const px = ctx.getImageData(0, 0, N, N).data;
    return Array.from(px, (v, i) => (i % 4 === 3 ? v : v & 0xF0));
  }, b64);
  return sha256(Buffer.from(data));
}

function collectSRC58State() {
  const round = (v) => Math.round(v * 1000) / 1000;
  const ids = [...document.querySelectorAll('[id]')].map(el=>el.id);
  const $ = (s) => document.querySelector(s);
  const lt = window.__LT58;
  const metrics = Object.fromEntries([...document.querySelectorAll('[id]')].map(el=>{
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return [el.id, {
      tag: el.tagName,
      className: typeof el.className === 'string' ? el.className : '',
      rect: { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) },
      display: cs.display,
      position: cs.position,
      visibility: cs.visibility,
      opacity: cs.opacity,
      zIndex: cs.zIndex,
      transform: cs.transform,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      fontSize: cs.fontSize,
    }];
  }));
  const cards = [...document.querySelectorAll('#cardLayer [data-id]')].map(el=>{
    const r = el.getBoundingClientRect();
    return { id: el.dataset.id, x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height), rot: el.style.getPropertyValue('--rot') };
  });
  const threads = document.querySelectorAll('#threadLayer .threadGroup').length;
  return {
    ids,
    elementCount: document.querySelectorAll('body *:not(script):not(link):not(style)').length,
    buttonIds: [...document.querySelectorAll('button')].map(el=>el.id),
    metrics,
    cards: { count: cards.length, items: cards.slice(0,5) },
    threads,
    runtime: lt ? {
      moments: lt.state.moments,
      connections: lt.state.connections,
      view: lt.state.view,
      selected: lt.state.selected,
      theme: document.body.dataset.theme || null,
      zoomLabel: $('#zoomLabel')?.textContent ?? null,
    } : null,
  };
}

async function settleSRC58(page) {
  await page.waitForTimeout(450);
  await page.evaluate(async () => {
    const t = document.getElementById('toast');
    if (t) { t.classList.remove('show'); t.classList.remove('open'); }
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  });
}

async function assertSRC58Ready(page, sourceId) {
  await page.waitForFunction(()=> window.__LT58 && document.querySelectorAll('#cardLayer [data-id]').length >= 5, null, {timeout:15000});
  const info = await page.evaluate(()=>({ moments: window.__LT58.state.moments, cards: document.querySelectorAll('#cardLayer [data-id]').length }));
  assert.ok(info.moments >= 5, `${sourceId}: expected >=5 moments, got ${info.moments}`);
  assert.ok(info.cards >= 5, `${sourceId}: expected >=5 cards, got ${info.cards}`);
}

async function exerciseSRC58(page, sourceId, label) {
  // exercise theme switch and basic controls, similar to SRC060 but for SRC058 surface
  await page.evaluate(()=> window.__LT58 && window.__LT58.selectMoment && window.__LT58.state && document.body.dataset.theme);
  // theme switch
  const themes = ['pearl','cork','letter','blossom','night','mint'];
  let themeOk = true;
  for (const th of ['cork','night']) {
    const btn = page.locator(`#themeGrid [data-theme="${th}"]`);
    if (await btn.count() > 0) {
      await btn.click();
      await page.waitForTimeout(150);
      const cur = await page.evaluate(()=>document.body.dataset.theme);
      if (cur !== th) themeOk = false;
    }
  }
  // reset to pearl
  const pearlBtn = page.locator('#themeGrid [data-theme="pearl"]');
  if (await pearlBtn.count()>0) { await pearlBtn.click(); await page.waitForTimeout(150); }

  // zoom / fit
  const zoomBefore = await page.evaluate(()=> document.getElementById('zoomLabel')?.textContent);
  const plusBtn = page.locator('#plusBtn');
  if (await plusBtn.count()>0) { await plusBtn.click(); await page.waitForTimeout(200); }
  const zoomAfter = await page.evaluate(()=> document.getElementById('zoomLabel')?.textContent);
  const fitBtn = page.locator('#fitBtn');
  if (await fitBtn.count()>0) { await fitBtn.click(); await page.waitForTimeout(200); }

  // select a card
  const firstCard = page.locator('#cardLayer [data-id]').first();
  await firstCard.click();
  await page.waitForTimeout(250);
  const selected = await page.evaluate(()=> window.__LT58.state.selected);

  return { controlSurface: 'BOARD_SPATIAL', themeOk, zoomBefore, zoomAfter, selected };
}

async function captureSRC58State(page, sourceOut, variant, label, stateName, pngName) {
  const state = await page.evaluate(collectSRC58State);
  const png = await page.screenshot({ path: path.join(sourceOut, `${label}-${variant}-${pngName}.png`), animations: 'disabled' });
  return { state, pngSha: await canonicalPixelDigest(page, png), stateName };
}

async function captureSRC58Page(page, sourceOut, variant, sourceId, label, errors=[]) {
  await assertSRC58Ready(page, sourceId);
  await settleSRC58(page);
  if (errors.length) throw new Error(`${sourceId} ${variant}: browser errors before capture: ${errors.join('; ')}`);

  const initial = await captureSRC58State(page, sourceOut, variant, label, 'INITIAL', 'initial');
  const interaction = await exerciseSRC58(page, sourceId, `${label} ${variant}`);

  // reset view after interaction
  await page.evaluate(()=> { const b=document.getElementById('fitBtn'); if(b) b.click(); });
  await settleSRC58(page);
  const afterReset = await captureSRC58State(page, sourceOut, variant, label, 'AFTER_RESET', 'after-reset');

  // open cinema if available
  try {
    const cinBtn = page.locator('#cinemaBtn');
    if (await cinBtn.count()>0) {
      await cinBtn.click();
      await settleSRC58(page);
      const cinema = await captureSRC58State(page, sourceOut, variant, label, 'CINEMA', 'cinema');
      await page.evaluate(()=>{ const o=document.getElementById('cinemaOverlay'); if(o) o.click(); });
      // close via exit button
      const exit = page.locator('#cinExit');
      if (await exit.count()>0) await exit.click();
      await settleSRC58(page);
      if (errors.length) throw new Error(`${sourceId} ${label} ${variant}: browser errors: ${errors.join('; ')}`);
      return { states: { initial, afterReset, cinema }, interaction, errors, screenshots: { initial_sha256: initial.pngSha, after_reset_sha256: afterReset.pngSha, cinema_sha256: cinema.pngSha } };
    }
  } catch(e) { /* cinema optional */ }

  if (errors.length) throw new Error(`${sourceId} ${label} ${variant}: browser errors: ${errors.join('; ')}`);
  return { states: { initial, afterReset }, interaction, errors, screenshots: { initial_sha256: initial.pngSha, after_reset_sha256: afterReset.pngSha } };
}

export async function captureSRC58Baseline(page, sourceOut, label) {
  return captureSRC58Page(page, sourceOut, 'original', 'SRC058', label);
}

export async function captureSRC58Variant(browser, url, viewport, sourceOut, variant, sourceId) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}${error.stack ? ` @ ${error.stack.split('\n').slice(1,3).join(' <- ').trim()}` : ''}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    if (!response?.ok()) throw new Error(`${sourceId} ${variant}: HTTP ${response?.status()}`);
    return await captureSRC58Page(page, sourceOut, variant, sourceId, `${viewport.width}x${viewport.height}`, errors);
  } finally {
    await context.close();
  }
}

export function src58SourceFiles(sourceDir, sourceId='SRC058') {
  return new Map([
    [`/${sourceId}/original.html`, [path.join(sourceDir,'original','original.html'),'text/html; charset=utf-8']],
    [`/${sourceId}/split/index.html`, [path.join(sourceDir,'split','index.html'),'text/html; charset=utf-8']],
    [`/${sourceId}/split/styles.css`, [path.join(sourceDir,'split','styles.css'),'text/css; charset=utf-8']],
    [`/${sourceId}/split/script.js`, [path.join(sourceDir,'split','script.js'),'text/javascript; charset=utf-8']],
  ]);
}

export { collectSRC58State };
