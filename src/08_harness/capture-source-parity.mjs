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
import { captureSRC47Variant, src47SourceFiles } from './source047-driver.mjs';
import { sendFileRange } from './src-range.mjs';
import { getDualVariantParityDisposition, listDualVariantKeys } from './dual-variant-mechanical.mjs';

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

// SRC047 canonical cinematic ACT seek targets (seconds). These are the times the
// frozen script's QA.seek drives both original and split to; INITIAL is excluded
// from the currentTime assertion because autoplay timing may drift by a few ms.
const ACTS = {
  ACT1_FIRST_FEELING: 0.900,
  ACT2_MOMENT: 4.100,
  ACT3_BLOOM: 7.500,
  ACT4_WHY_NEXT: 11.100,
  ACT5_LOVETREE: 13.200,
};
const MOBILE_WIDTH = 820;

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
          : sourceId === 'SRC047'
            ? src47SourceFiles(sourceDir, sourceId)
            : new Map([
      [`/${sourceId}/original.html`, [path.join(sourceDir, 'original', 'original.html'), 'text/html; charset=utf-8']],
      [`/${sourceId}/split/index.html`, [path.join(sourceDir, 'split', 'index.html'), 'text/html; charset=utf-8']],
      [`/${sourceId}/split/styles.css`, [path.join(sourceDir, 'split', 'styles.css'), 'text/css; charset=utf-8']],
      [`/${sourceId}/split/script.js`, [path.join(sourceDir, 'split', 'script.js'), 'text/javascript; charset=utf-8']],
    ]);
  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') { res.statusCode = 204; res.end(); return; }
    // Look up by pathname only: the SRC047 driver opens the modal by navigating
    // to the same URL with ?demoComposer=1 appended, and the query string is not
    // part of the route map.
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const entry = files.get(pathname);
    if (!entry) { res.statusCode = 404; res.end('not found'); return; }
    const [file, type] = entry;
    if (!fs.existsSync(file)) { res.statusCode = 404; res.end('not found'); return; }
    // SRC047's 28 MB H.264/AAC MP4 is requested with Range by Chromium; serve the
    // exact byte window so seeking past the first buffered segment works. The
    // proven baseline Range contract is reused here rather than re-implemented.
    if (type === 'video/mp4' || type === 'image/jpeg' || type === 'image/png') {
      sendFileRange(res, file, type);
      return;
    }
    res.statusCode = 200;
    res.setHeader('content-type', type);
    res.end(fs.readFileSync(file));
  });
  // Chromium refuses to connect to a hardcoded set of "unsafe" ports (SIP 5060,
  // mdns 5353, etc.). On Windows the OS may hand `listen(0)` one of those, which
  // surfaces as net::ERR_UNSAFE_PORT at goto time. Pin to a safe candidate port
  // first, falling back through the list and finally to an ephemeral port.
  const SAFE_PORT_CANDIDATES = [8137, 8140, 8143, 8150, 8160, 8170, 8180, 8190];
  return new Promise((resolve, reject) => {
    let i = 0;
    const tryNext = () => {
      const port = i < SAFE_PORT_CANDIDATES.length ? SAFE_PORT_CANDIDATES[i++] : 0;
      const onError = (e) => {
        server.removeListener('error', onError);
        if (e.code === 'EADDRINUSE' && i <= SAFE_PORT_CANDIDATES.length) return tryNext();
        return reject(e);
      };
      server.once('error', onError);
      server.listen(port, '127.0.0.1', () => {
        server.removeListener('error', onError);
        resolve(server);
      });
    };
    tryNext();
  });
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

// Browser channel is configurable. SRC_BROWSER_CHANNEL=chrome forces the branded
// Google Chrome binary (Playwright channel: 'chrome'). SRC047's H.264/AAC MP4
// cannot be decoded by the bundled Playwright Chromium, so the generic capture
// path must not silently fall back to Chromium when CI requests chrome. When
// unset, the bundled Playwright Chromium is used for Sources that do not require
// Chrome. CI sets SRC_BROWSER_CHANNEL=chrome and the workflow verifies the branded
// binary is installed before this step runs.
const browserChannel = process.env.SRC_BROWSER_CHANNEL || null;
const launchOptions = { headless: true };
if (browserChannel) {
  launchOptions.channel = browserChannel;
  console.log(`SRC_BROWSER_CHANNEL=${browserChannel}`);
}
const browser = await chromium.launch(launchOptions);
try {
  let captured = 0;
  for (const sourceId of fs.readdirSync(sourceRoot).filter((id) => /^SRC\d{3}$/.test(id)).sort()) {
    const sourceDir = path.join(sourceRoot, sourceId);
    const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
    if (manifest.stages?.mechanical_split_complete !== true || manifest.stages?.source_split_parity_pass !== false) continue;
    // DUAL_VARIANT + S4 HOLD: never silently promote into S4 and never pick A/B
    // as an implicit canonical default. The generic single-executable parity
    // harness cannot represent two retained authorities. SKIP with an explicit
    // disposition using existing manifest/authority metadata. SINGLE behavior below
    // is unchanged.
    if (manifest?.authority_mode === 'DUAL_VARIANT') {
      const variantKeys = listDualVariantKeys(manifest);
      if (!variantKeys) throw new Error(`${sourceId}: DUAL_VARIANT authority must define exactly variants A and B`);
      let acceptedBaseline = null;
      const acceptedBaselinePath = path.join(sourceDir, 'baseline', 'accepted-baseline.json');
      if (fs.existsSync(acceptedBaselinePath)) {
        try {
          acceptedBaseline = JSON.parse(fs.readFileSync(acceptedBaselinePath, 'utf8'));
        } catch {
          acceptedBaseline = null;
        }
      }
      const disposition = getDualVariantParityDisposition({ manifest, acceptedBaseline });
      const reason = disposition?.reason ?? 'DUAL_VARIANT_S4_HOLD';
      console.log(`SRC_SPLIT_PARITY_CAPTURE_SKIP=${sourceId} reason=${reason} authority_mode=DUAL_VARIANT variants=${variantKeys.join(',')} s4_hold_respected=true`);
      continue;
    }
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
        if (sourceId === 'SRC047') {
          const original = await captureSRC47Variant(browser, `http://127.0.0.1:${port}/${sourceId}/original.html`, viewport, sourceOut, 'original', sourceId);
          const split = await captureSRC47Variant(browser, `http://127.0.0.1:${port}/${sourceId}/split/index.html`, viewport, sourceOut, 'split', sourceId);
          const states = ['INITIAL', 'ACT1_FIRST_FEELING', 'ACT2_MOMENT', 'ACT3_BLOOM', 'ACT4_WHY_NEXT', 'ACT5_LOVETREE', 'MODAL_OPEN', 'NAV_POPOVER_OPEN'];
          const eps = 1.5;
          const metricsEqual = (am, bm) => {
            const aKeys = Object.keys(am), bKeys = Object.keys(bm);
            if (aKeys.length !== bKeys.length) return false;
            for (const k of aKeys) {
              if (!(k in bm)) return false;
              const av = am[k], bv = bm[k];
              for (const f of ['x', 'y', 'width', 'height']) { if (Math.abs(av.rect[f] - bv.rect[f]) > eps) return false; }
              for (const f of ['display', 'visibility', 'opacity']) { if (av[f] !== bv[f]) return false; }
            }
            return true;
          };
          for (const state of states) {
            const ao = original.states[state].state, bo = split.states[state].state;
            if (state === 'NAV_POPOVER_OPEN') {
              // Mobile contract: nav groups are hidden by the frozen responsive
              // contract, so NAV_POPOVER_OPEN is NOT_APPLICABLE_MOBILE for both
              // variants on mobile viewports (MOBILE_WIDTH = 820). On desktop it
              // is a real opened popover state: runtime.navPopoverOpen is the
              // text content of the opened nav-group's data-nav-menu trigger.
              // stateName lives on the captureState wrapper, not on .state.
              const aoName = original.states[state].stateName, boName = split.states[state].stateName;
              if (viewport.width <= MOBILE_WIDTH) {
                assert.equal(boName, 'NOT_APPLICABLE_MOBILE', `${sourceId} ${viewport.width}x${viewport.height}: ${state} split mobile contract drift`);
                assert.equal(aoName, 'NOT_APPLICABLE_MOBILE', `${sourceId} ${viewport.width}x${viewport.height}: ${state} original mobile contract drift`);
                continue;
              }
              // Desktop NAV: assert popover label, then fall through to the
              // common state assertions (ids, elementCount, buttonIds, metrics,
              // video/runtime parity) below. Do NOT treat desktop NAV as
              // label-only parity.
              assert.ok(bo.runtime.navPopoverOpen, `${sourceId} ${viewport.width}x${viewport.height}: ${state} split popover not opened`);
              assert.ok(ao.runtime.navPopoverOpen, `${sourceId} ${viewport.width}x${viewport.height}: ${state} original popover not opened`);
              assert.equal(bo.runtime.navPopoverOpen, ao.runtime.navPopoverOpen, `${sourceId} ${viewport.width}x${viewport.height}: ${state} popover drift`);
            }
            assert.deepStrictEqual(bo.ids, ao.ids, `${sourceId} ${viewport.width}x${viewport.height}: ${state} ids drift`);
            assert.equal(bo.elementCount, ao.elementCount, `${sourceId} ${viewport.width}x${viewport.height}: ${state} elementCount drift`);
            assert.deepStrictEqual(bo.buttonIds, ao.buttonIds, `${sourceId} ${viewport.width}x${viewport.height}: ${state} buttonIds drift`);
            assert.ok(metricsEqual(ao.metrics, bo.metrics), `${sourceId} ${viewport.width}x${viewport.height}: ${state} metrics drift (rect epsilon ${eps})`);
            // Canonical ACT states must be deterministic: video must not have
            // failed, duration must be finite and positive, readyState must be
            // sufficient to have decoded the frame, and currentTime must sit on
            // the canonical seek target within tolerance. videoFailed lives on
            // runtime (stage.classList), not on the video sub-object.
            assert.equal(bo.runtime.videoFailed, false, `${sourceId} ${viewport.width}x${viewport.height}: ${state} split videoFailed`);
            assert.equal(ao.runtime.videoFailed, false, `${sourceId} ${viewport.width}x${viewport.height}: ${state} original videoFailed`);
            assert.ok(Number.isFinite(ao.video.duration) && ao.video.duration > 0, `${sourceId} ${viewport.width}x${viewport.height}: ${state} original duration`);
            assert.ok(Number.isFinite(bo.video.duration) && bo.video.duration > 0, `${sourceId} ${viewport.width}x${viewport.height}: ${state} split duration`);
            assert.ok(ao.video.readyState >= 2, `${sourceId} ${viewport.width}x${viewport.height}: ${state} original readyState`);
            assert.ok(bo.video.readyState >= 2, `${sourceId} ${viewport.width}x${viewport.height}: ${state} split readyState`);
            assert.equal(bo.runtime.act, ao.runtime.act, `${sourceId} ${viewport.width}x${viewport.height}: ${state} act drift`);
            assert.equal(bo.runtime.modalOpen, ao.runtime.modalOpen, `${sourceId} ${viewport.width}x${viewport.height}: ${state} modalOpen drift`);
            if (state !== 'INITIAL' && ACTS[state] !== undefined) {
              // INITIAL contains autoplay timing and may legitimately drift by a
              // few ms; canonical ACT1-5 seeks are deterministic. MODAL_OPEN and
              // NAV_POPOVER_OPEN are interaction states, not seek targets.
              assert.ok(Math.abs(ao.video.currentTime - ACTS[state]) <= 0.05, `${sourceId} ${viewport.width}x${viewport.height}: ${state} original currentTime ${ao.video.currentTime} not at canonical ${ACTS[state]}`);
              assert.ok(Math.abs(bo.video.currentTime - ACTS[state]) <= 0.05, `${sourceId} ${viewport.width}x${viewport.height}: ${state} split currentTime ${bo.video.currentTime} not at canonical ${ACTS[state]}`);
            }
          }
          assert.deepStrictEqual(split.interaction, original.interaction, `${sourceId} ${viewport.width}x${viewport.height}: interaction drift`);
          // Canonical pixel digest backstop: the Source uses backdrop-filter:blur()
          // on glass overlays whose GPU compositing is +/-1 channel jittery run-to-run
          // (same phenomenon SRC060 guards against). The 16x16 /16-floored canonical
          // pixel buffer is compared with a Hamming-distance threshold (32 bytes out
          // of 1024 = 3.1%) so real layout/color drift fails closed while
          // sub-2/255 blur jitter AND platform font-rendering differences (e.g.
          // Windows vs Linux Chrome at 390px width) do not. INITIAL is excluded
          // from the strict visual hash because autoplay frame timing can differ
          // between original and split load paths (its DOM/metrics are still
          // fully asserted above). Where raw PNG SHA is stable it is recorded too.
          //
          // The driver stores screenshots under a fixed set of keys (not derived
          // from state name) so MODAL_OPEN maps to modal_* and NAV_POPOVER_OPEN
          // maps to nav_*. Do NOT derive keys blindly from state.toLowerCase().
          const STATE_SCREENSHOT_KEY = Object.freeze({
            ACT1_FIRST_FEELING: 'act1_first_feeling',
            ACT2_MOMENT: 'act2_moment',
            ACT3_BLOOM: 'act3_bloom',
            ACT4_WHY_NEXT: 'act4_why_next',
            ACT5_LOVETREE: 'act5_lovetree',
            MODAL_OPEN: 'modal',
            NAV_POPOVER_OPEN: 'nav',
          });
          function canonicalBufferDistance(oHex, sHex) {
            const a = Buffer.from(oHex, 'hex');
            const b = Buffer.from(sHex, 'hex');
            if (a.length !== b.length) return a.length;
            let d = 0;
            for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) d++; }
            return d;
          }
          const CANONICAL_MAX_HAMMING = 32;
          const canonicalStates = ['ACT1_FIRST_FEELING', 'ACT2_MOMENT', 'ACT3_BLOOM', 'ACT4_WHY_NEXT', 'ACT5_LOVETREE', 'MODAL_OPEN'];
          const canonicalDistances = {};
          for (const state of canonicalStates) {
            const key = STATE_SCREENSHOT_KEY[state];
            const rawKey = `${key}_canonical_raw_hex`;
            const shaKey = `${key}_canonical_sha256`;
            const oRaw = original.screenshots[rawKey], sRaw = split.screenshots[rawKey];
            const oSha = original.screenshots[shaKey], sSha = split.screenshots[shaKey];
            canonicalDistances[`${key}_canonical_sha_equal`] = (oSha === sSha);
            if (oRaw && sRaw) {
              const dist = canonicalBufferDistance(oRaw, sRaw);
              canonicalDistances[`${key}_canonical_hamming`] = dist;
              assert.ok(dist <= CANONICAL_MAX_HAMMING, `${sourceId} ${viewport.width}x${viewport.height}: ${state} canonical pixel buffer Hamming distance ${dist} exceeds ${CANONICAL_MAX_HAMMING}`);
            } else {
              canonicalDistances[`${key}_canonical_hamming`] = null;
              assert.fail(`${sourceId} ${viewport.width}x${viewport.height}: ${state} missing canonical raw buffer (key=${rawKey})`);
            }
          }
          if (viewport.width > MOBILE_WIDTH) {
            const navKey = STATE_SCREENSHOT_KEY['NAV_POPOVER_OPEN'];
            const oNavRaw = original.screenshots[`${navKey}_canonical_raw_hex`], sNavRaw = split.screenshots[`${navKey}_canonical_raw_hex`];
            const dist = canonicalBufferDistance(oNavRaw, sNavRaw);
            canonicalDistances.nav_canonical_hamming = dist;
            assert.ok(dist <= CANONICAL_MAX_HAMMING, `${sourceId} ${viewport.width}x${viewport.height}: NAV canonical pixel buffer Hamming distance ${dist} exceeds ${CANONICAL_MAX_HAMMING}`);
            const oNavSha = original.screenshots[`${navKey}_canonical_sha256`], sNavSha = split.screenshots[`${navKey}_canonical_sha256`];
            canonicalDistances.nav_canonical_sha_equal = (oNavSha === sNavSha);
          }
          const comparison = {
            viewport,
            states: Object.fromEntries(states.map((state) => [`${state.toLowerCase()}_state_equal`, true])),
            interaction_equal: true,
            initial_screenshot_sha_equal: split.screenshots.initial_sha256 === original.screenshots.initial_sha256,
            act1_screenshot_sha_equal: split.screenshots.act1_first_feeling_sha256 === original.screenshots.act1_first_feeling_sha256,
            act2_screenshot_sha_equal: split.screenshots.act2_moment_sha256 === original.screenshots.act2_moment_sha256,
            act3_screenshot_sha_equal: split.screenshots.act3_bloom_sha256 === original.screenshots.act3_bloom_sha256,
            act4_screenshot_sha_equal: split.screenshots.act4_why_next_sha256 === original.screenshots.act4_why_next_sha256,
            act5_screenshot_sha_equal: split.screenshots.act5_lovetree_sha256 === original.screenshots.act5_lovetree_sha256,
            modal_screenshot_sha_equal: split.screenshots.modal_sha256 === original.screenshots.modal_sha256,
            nav_screenshot_sha_equal: viewport.width > MOBILE_WIDTH ? (split.screenshots.nav_sha256 === original.screenshots.nav_sha256) : true,
            ...canonicalDistances,
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
