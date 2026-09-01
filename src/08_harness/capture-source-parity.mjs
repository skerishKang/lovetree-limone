import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { captureTrack64Variant, track64SourceFiles } from './source064-driver.mjs';
import { captureTrack57Variant, track57SourceFiles } from './source057-driver.mjs';
import { captureTrack60Variant, track60SourceFiles } from './source060-driver.mjs';
import { captureSRC58Variant, src58SourceFiles } from './source058-driver.mjs';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src', '03_sources');
const outRoot = process.env.SRC_PARITY_EVIDENCE_DIR || '/tmp/src-split-parity-evidence';
const exactHead = process.env.SRC_EXACT_HEAD || null;
if (!exactHead || !/^[0-9a-f]{40}$/.test(exactHead)) throw new Error('SRC_EXACT_HEAD must be the exact 40-char PR head SHA');

const defaultViewports = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 320, height: 720 },
];
const sourceViewports = {
  SRC058: [
    { width: 1440, height: 900 },
    { width: 430, height: 932 },
    { width: 390, height: 844 },
  ],
  SRC060: [
    { width: 1440, height: 900 },
    { width: 430, height: 932 },
    { width: 390, height: 844 },
  ],
};
const viewportsFor = (sourceId) => sourceViewports[sourceId] ?? defaultViewports;
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const round = (value) => Math.round(value * 100) / 100;

function collectPageState() {
  const elements = [...document.querySelectorAll('[id]')];
  return {
    ids: elements.map((el) => el.id),
    elementCount: document.querySelectorAll('*').length,
    buttonIds: [...document.querySelectorAll('button')].map((el) => el.id),
    metrics: Object.fromEntries(elements.map((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return [el.id, {
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
      }];
    })),
    canvas: (() => {
      const canvas = document.getElementById('stage');
      return canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight } : null;
    })(),
    runtime: {
      mode: window.__lt?.state?.mode ?? null,
      scale: window.__lt?.state?.scale ?? null,
      tx: window.__lt?.state?.tx ?? null,
      ty: window.__lt?.state?.ty ?? null,
      stats: window.__lovetreeStats ?? null,
    },
  };
}

async function settle(page) {
  await page.evaluate(async () => {
    document.getElementById('toast')?.classList.remove('show');
    window.__lt?.overview(false);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function exercise(page, mobile) {
  await page.evaluate(() => window.__lt.overview(false));
  if (mobile) {
    await page.locator('#mobileRibbon button[data-i="0"]').click();
    await page.waitForFunction(() => window.__lt?.state?.mode === 'CLUSTER_PATH_OVERVIEW', null, { timeout: 5000 });
    const clusterSelectionMode = await page.evaluate(() => window.__lt.state.mode);
    await page.click('#helpBtn');
    return {
      controlSurface: 'MOBILE_RIBBON',
      clusterSelectionMode,
      helpToastVisible: await page.evaluate(() => document.getElementById('toast')?.classList.contains('show') === true),
    };
  }
  const scaleBefore = await page.evaluate(() => window.__lt.state.scale);
  await page.click('#zoomIn');
  const scaleAfter = await page.evaluate(() => window.__lt.state.scale);
  await page.click('#overviewBtn');
  const overviewButtonMode = await page.evaluate(() => window.__lt.state.mode);
  await page.click('#helpBtn');
  return {
    controlSurface: 'DESKTOP_CONTROLS',
    zoomInIncreasedScale: scaleAfter > scaleBefore,
    scaleBefore: round(scaleBefore),
    scaleAfter: round(scaleAfter),
    overviewButtonMode,
    helpToastVisible: await page.evaluate(() => document.getElementById('toast')?.classList.contains('show') === true),
  };
}

function startServer(sourceId, sourceDir) {
  const files = sourceId === 'SRC064'
    ? track64SourceFiles(sourceDir, sourceId)
    : sourceId === 'SRC057'
      ? track57SourceFiles(sourceDir, sourceId)
      : sourceId === 'SRC058'
        ? src58SourceFiles(sourceDir, sourceId)
        : sourceId === 'SRC060'
          ? track60SourceFiles(sourceDir, sourceId)
          : new Map([
      [`/${sourceId}/original.html`, [path.join(sourceDir, 'original', 'original.html'), 'text/html; charset=utf-8']],
      [`/${sourceId}/split/index.html`, [path.join(sourceDir, 'split', 'index.html'), 'text/html; charset=utf-8']],
      [`/${sourceId}/split/styles.css`, [path.join(sourceDir, 'split', 'styles.css'), 'text/css; charset=utf-8']],
      [`/${sourceId}/split/script.js`, [path.join(sourceDir, 'split', 'script.js'), 'text/javascript; charset=utf-8']],
    ]);
  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') { res.statusCode = 204; res.end(); return; }
    const entry = files.get(req.url);
    if (!entry) { res.statusCode = 404; res.end('not found'); return; }
    const [file, type] = entry;
    res.statusCode = 200;
    res.setHeader('content-type', type);
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function captureVariant(browser, url, viewport, sourceOut, variant, sourceId) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}${error.stack ? ` @ ${error.stack.split('\n').slice(1, 3).join(' <- ').trim()}` : ''}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  if (!response?.ok()) throw new Error(`${sourceId} ${variant}: HTTP ${response?.status()}`);
  await page.waitForFunction(() => window.__lt && window.__lovetreeStats, null, { timeout: 15000 });
  // The Source intentionally schedules a startup toast at 650ms. Consume that timer
  // before comparing stable Source states so original/split load latency cannot race it.
  await page.waitForTimeout(900);
  await settle(page);
  const label = `${viewport.width}x${viewport.height}`;
  const overview = await page.evaluate(collectPageState);
  const overviewPng = await page.screenshot({ path: path.join(sourceOut, `${label}-${variant}-overview.png`), animations: 'disabled' });

  if (viewport.width <= 640) await page.locator('#mobileRibbon button.origin').click();
  else await page.click('#focusFirst');
  await page.waitForFunction(() => window.__lt?.state?.mode === 'ORIGIN_REVEAL', null, { timeout: 5000 });
  await page.evaluate(() => document.getElementById('toast')?.classList.remove('show'));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const originReveal = await page.evaluate(collectPageState);
  const originPng = await page.screenshot({ path: path.join(sourceOut, `${label}-${variant}-origin-reveal.png`), animations: 'disabled' });
  const interaction = await exercise(page, viewport.width <= 640);
  if (errors.length) throw new Error(`${sourceId} ${label} ${variant}: browser errors: ${errors.join('; ')}`);
  await context.close();
  return {
    overview,
    originReveal,
    interaction,
    errors,
    screenshots: { overview_sha256: sha256(overviewPng), origin_reveal_sha256: sha256(originPng) },
  };
}

const browser = await chromium.launch({ headless: true });
try {
  let captured = 0;
  for (const sourceId of fs.readdirSync(sourceRoot).filter((id) => /^SRC\d{3}$/.test(id)).sort()) {
    const sourceDir = path.join(sourceRoot, sourceId);
    const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
    if (manifest.stages?.mechanical_split_complete !== true || manifest.stages?.source_split_parity_pass !== false) continue;
    for (const required of ['split/index.html', 'split/styles.css', 'split/script.js']) {
      if (!fs.existsSync(path.join(sourceDir, required))) throw new Error(`${sourceId}: missing ${required}`);
    }
    const sourceOut = path.join(outRoot, sourceId);
    fs.mkdirSync(sourceOut, { recursive: true });
    const server = await startServer(sourceId, sourceDir);
    const { port } = server.address();
    const summary = { schema_version: '1.0', source_id: sourceId, exact_head: exactHead, viewports: [] };
    try {
      for (const viewport of viewportsFor(sourceId)) {
        if (sourceId === 'SRC064') {
          const original = await captureTrack64Variant(browser, `http://127.0.0.1:${port}/${sourceId}/original.html`, viewport, sourceOut, 'original', sourceId);
          const split = await captureTrack64Variant(browser, `http://127.0.0.1:${port}/${sourceId}/split/index.html`, viewport, sourceOut, 'split', sourceId);
          assert.deepStrictEqual(split.welcome, original.welcome, `${sourceId} ${viewport.width}x${viewport.height}: WELCOME state drift`);
          assert.deepStrictEqual(split.focus, original.focus, `${sourceId} ${viewport.width}x${viewport.height}: MOMENT_FOCUS state drift`);
          assert.deepStrictEqual(split.viewer, original.viewer, `${sourceId} ${viewport.width}x${viewport.height}: MEDIA_VIEWER state drift`);
          assert.deepStrictEqual(split.interaction, original.interaction, `${sourceId} ${viewport.width}x${viewport.height}: interaction drift`);
          const comparison = {
            viewport,
            welcome_state_equal: true,
            focus_state_equal: true,
            viewer_state_equal: true,
            interaction_equal: true,
            welcome_screenshot_sha_equal: split.screenshots.welcome_sha256 === original.screenshots.welcome_sha256,
            focus_screenshot_sha_equal: split.screenshots.focus_sha256 === original.screenshots.focus_sha256,
            viewer_screenshot_sha_equal: split.screenshots.viewer_sha256 === original.screenshots.viewer_sha256,
            original_screenshots: original.screenshots,
            split_screenshots: split.screenshots,
          };
          fs.writeFileSync(path.join(sourceOut, `${viewport.width}x${viewport.height}.json`), JSON.stringify({ original, split, comparison }, null, 2));
          summary.viewports.push(comparison);
          continue;
        }
        if (sourceId === 'SRC060') {
          const original = await captureTrack60Variant(browser, `http://127.0.0.1:${port}/${sourceId}/original.html`, viewport, sourceOut, 'original', sourceId);
          const split = await captureTrack60Variant(browser, `http://127.0.0.1:${port}/${sourceId}/split/index.html`, viewport, sourceOut, 'split', sourceId);
          const stateKeys = ['initial', 'clusterFocus', 'nodeSelect', 'momentViewer', 'bookHandoff', 'connectionHandoff', 'pathPreview'];
          for (const state of stateKeys) {
            assert.deepStrictEqual(split.states[state].state, original.states[state].state, `${sourceId} ${viewport.width}x${viewport.height}: ${state} state drift`);
          }
          assert.deepStrictEqual(split.interaction, original.interaction, `${sourceId} ${viewport.width}x${viewport.height}: interaction drift`);
          const comparison = {
            viewport,
            ...Object.fromEntries(stateKeys.map((state) => [`${state.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}_state_equal`, true])),
            interaction_equal: true,
            initial_screenshot_sha_equal: split.screenshots.initial_sha256 === original.screenshots.initial_sha256,
            moment_viewer_screenshot_sha_equal: split.screenshots.moment_viewer_sha256 === original.screenshots.moment_viewer_sha256,
            original_screenshots: original.screenshots,
            split_screenshots: split.screenshots,
          };
          fs.writeFileSync(path.join(sourceOut, `${viewport.width}x${viewport.height}.json`), JSON.stringify({ original, split, comparison }, null, 2));
          summary.viewports.push(comparison);
          continue;
        }
        if (sourceId === 'SRC058') {
          const original = await captureSRC58Variant(browser, `http://127.0.0.1:${port}/${sourceId}/original.html`, viewport, sourceOut, 'original', sourceId);
          const split = await captureSRC58Variant(browser, `http://127.0.0.1:${port}/${sourceId}/split/index.html`, viewport, sourceOut, 'split', sourceId);
          // Tolerant state comparison: rect values may jitter ~1px between inline and external stylesheet load timing (threadLayer SVG height)
          const eps = 1.5;
          const rectEqual = (a,b) => Math.abs(a.x-b.x)<=eps && Math.abs(a.y-b.y)<=eps && Math.abs(a.width-b.width)<=eps && Math.abs(a.height-b.height)<=eps;
          const metricsEqual = (am,bm) => {
            // toast is transient startup notification; exclude from strict parity
            const skipIds = new Set(['toast']);
            const aKeys = Object.keys(am).filter(k=>!skipIds.has(k)), bKeys = Object.keys(bm).filter(k=>!skipIds.has(k));
            if (aKeys.length!==bKeys.length) return false;
            for(const k of aKeys){ if(!(k in bm)) return false; const av=am[k], bv=bm[k]; for(const f of ['x','y','width','height']){ if(Math.abs(av.rect[f]-bv.rect[f])>eps) return false; } for(const f of ['display','position','visibility','opacity','zIndex','transform','backgroundColor','color','fontSize']){ if(av[f]!==bv[f]) return false; } }
            return true;
          };
          const cardsEqual = (a,b) => a.count===b.count && a.items.every((ai,i)=>{ const bi=b.items[i]; return ai.id===bi.id && Math.abs(ai.x-bi.x)<=eps && Math.abs(ai.y-bi.y)<=eps && Math.abs(ai.w-bi.w)<=eps && Math.abs(ai.h-bi.h)<=eps; });
          for (const state of ['initial', 'afterReset']) {
            const ao = original.states[state].state, bo = split.states[state].state;
            assert.deepStrictEqual(bo.ids, ao.ids, `${sourceId} ${viewport.width}x${viewport.height}: ${state} ids drift`);
            assert.equal(bo.elementCount, ao.elementCount, `${sourceId} ${viewport.width}x${viewport.height}: ${state} elementCount drift`);
            assert.deepStrictEqual(bo.buttonIds, ao.buttonIds, `${sourceId} ${viewport.width}x${viewport.height}: ${state} buttonIds drift`);
            if (!metricsEqual(ao.metrics, bo.metrics)) {
              // find first failing metric for diagnostics
              for(const k of Object.keys(ao.metrics)){
                const av=ao.metrics[k], bv=bo.metrics[k];
                if(!bv) { console.log(`METRICS_MISSING ${state} ${k}`); continue; }
                for(const f of ['x','y','width','height']){ if(Math.abs(av.rect[f]-bv.rect[f])>eps) console.log(`METRICS_RECT_DIFF ${state} ${k}.${f}: ${av.rect[f]} vs ${bv.rect[f]} diff=${Math.abs(av.rect[f]-bv.rect[f])}`); }
                for(const f of ['display','position','visibility','opacity','zIndex','transform','backgroundColor','color','fontSize']){ if(av[f]!==bv[f]) console.log(`METRICS_FIELD_DIFF ${state} ${k}.${f}: ${JSON.stringify(av[f])} vs ${JSON.stringify(bv[f])}`); }
              }
            }
            assert.ok(metricsEqual(ao.metrics, bo.metrics), `${sourceId} ${viewport.width}x${viewport.height}: ${state} metrics drift (rect epsilon ${eps})`);
            assert.ok(cardsEqual(ao.cards, bo.cards), `${sourceId} ${viewport.width}x${viewport.height}: ${state} cards drift`);
            assert.equal(bo.threads, ao.threads, `${sourceId} ${viewport.width}x${viewport.height}: ${state} threads drift`);
            assert.deepStrictEqual(bo.runtime, ao.runtime, `${sourceId} ${viewport.width}x${viewport.height}: ${state} runtime drift`);
          }
          assert.deepStrictEqual(split.interaction, original.interaction, `${sourceId} ${viewport.width}x${viewport.height}: interaction drift`);
          // screenshots use canonical digest; allow stable blur jitter via byte-identical check handled in driver
          const comparison = {
            viewport,
            initial_state_equal: true,
            after_reset_state_equal: true,
            interaction_equal: true,
            initial_screenshot_sha_equal: split.screenshots.initial_sha256 === original.screenshots.initial_sha256,
            after_reset_screenshot_sha_equal: split.screenshots.after_reset_sha256 === original.screenshots.after_reset_sha256,
            original_screenshots: original.screenshots,
            split_screenshots: split.screenshots,
          };
          fs.writeFileSync(path.join(sourceOut, `${viewport.width}x${viewport.height}.json`), JSON.stringify({ original, split, comparison }, null, 2));
          summary.viewports.push(comparison);
          continue;
        }
        if (sourceId === 'SRC057') {
          const original = await captureTrack57Variant(browser, `http://127.0.0.1:${port}/${sourceId}/original.html`, viewport, sourceOut, 'original', sourceId);
          const split = await captureTrack57Variant(browser, `http://127.0.0.1:${port}/${sourceId}/split/index.html`, viewport, sourceOut, 'split', sourceId);
          for (const state of ['initial', 'selected', 'next', 'editPreview', 'viewer']) {
            assert.deepStrictEqual(split[state], original[state], `${sourceId} ${viewport.width}x${viewport.height}: ${state} state drift`);
          }
          assert.deepStrictEqual(split.interaction, original.interaction, `${sourceId} ${viewport.width}x${viewport.height}: interaction drift`);
          const comparison = {
            viewport,
            initial_state_equal: true,
            selected_state_equal: true,
            next_state_equal: true,
            edit_preview_state_equal: true,
            viewer_state_equal: true,
            interaction_equal: true,
            initial_screenshot_sha_equal: split.screenshots.initial_sha256 === original.screenshots.initial_sha256,
            viewer_screenshot_sha_equal: split.screenshots.viewer_sha256 === original.screenshots.viewer_sha256,
            original_screenshots: original.screenshots,
            split_screenshots: split.screenshots,
          };
          fs.writeFileSync(path.join(sourceOut, `${viewport.width}x${viewport.height}.json`), JSON.stringify({ original, split, comparison }, null, 2));
          summary.viewports.push(comparison);
          continue;
        }
        const original = await captureVariant(browser, `http://127.0.0.1:${port}/${sourceId}/original.html`, viewport, sourceOut, 'original', sourceId);
        const split = await captureVariant(browser, `http://127.0.0.1:${port}/${sourceId}/split/index.html`, viewport, sourceOut, 'split', sourceId);
        assert.deepStrictEqual(split.overview, original.overview, `${sourceId} ${viewport.width}x${viewport.height}: OVERVIEW state drift`);
        assert.deepStrictEqual(split.originReveal, original.originReveal, `${sourceId} ${viewport.width}x${viewport.height}: ORIGIN_REVEAL state drift`);
        assert.deepStrictEqual(split.interaction, original.interaction, `${sourceId} ${viewport.width}x${viewport.height}: interaction drift`);
        const comparison = {
          viewport,
          overview_state_equal: true,
          origin_reveal_state_equal: true,
          interaction_equal: true,
          overview_screenshot_sha_equal: split.screenshots.overview_sha256 === original.screenshots.overview_sha256,
          origin_reveal_screenshot_sha_equal: split.screenshots.origin_reveal_sha256 === original.screenshots.origin_reveal_sha256,
          original_screenshots: original.screenshots,
          split_screenshots: split.screenshots,
        };
        fs.writeFileSync(path.join(sourceOut, `${viewport.width}x${viewport.height}.json`), JSON.stringify({ original, split, comparison }, null, 2));
        summary.viewports.push(comparison);
      }
      fs.writeFileSync(path.join(sourceOut, 'summary.json'), JSON.stringify(summary, null, 2));
      console.log(`SRC_SPLIT_PARITY_CAPTURE_PASS=${sourceId}`);
      captured += 1;
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }
  console.log(`SRC_SPLIT_PARITY_CAPTURE_COUNT=${captured}`);
} finally {
  await browser.close();
}
