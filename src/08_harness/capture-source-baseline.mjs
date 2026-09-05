import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { captureTrack64Baseline } from './source064-driver.mjs';
import { captureTrack57Baseline } from './source057-driver.mjs';
import { captureTrack60Baseline } from './source060-driver.mjs';
import { captureSRC58Baseline } from './source058-driver.mjs';
import { captureSRC62Baseline } from './source062-driver.mjs';
import { captureSRC71Baseline } from './source071-driver.mjs';
import { captureSRC47Baseline, src47SourceFiles } from './source047-driver.mjs';
import { sendFileRange } from './src-range.mjs';
import { getDualVariantBaselineDisposition, listDualVariantKeys } from './dual-variant-mechanical.mjs';
import { getCaptureSurfaceDisposition } from './capture-surface.mjs';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src', '03_sources');
const outRoot = process.env.SRC_BASELINE_EVIDENCE_DIR || '/tmp/src-baseline-evidence';
const exactHead = process.env.SRC_EXACT_HEAD || null;
const state = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src/01_registry/generation-state.json'), 'utf8'));

if (state.phase === 'SETUP') {
  console.log('SRC_BASELINE_CAPTURE=SKIPPED_SETUP');
  process.exit(0);
}
if (!['CALIBRATION', 'ROLLOUT'].includes(state.phase)) throw new Error(`Unsupported generation phase for baseline capture: ${state.phase}`);
if (!exactHead || !/^[0-9a-f]{40}$/.test(exactHead)) throw new Error('SRC_EXACT_HEAD must be the exact 40-char PR head SHA');

const sourceIds = fs.readdirSync(sourceRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^SRC\d{3}$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();
if (!sourceIds.length) throw new Error(`${state.phase} requires at least one active Source`);

const baselineCaptureTargets = sourceIds.filter((sourceId) => {
  const manifest = JSON.parse(fs.readFileSync(path.join(sourceRoot, sourceId, 'manifest.json'), 'utf8'));
  if (manifest.stages?.baseline_captured === true) return true;
  const capturePlanPath = path.join(sourceRoot, sourceId, 'baseline', 'capture-plan.json');
  if (fs.existsSync(capturePlanPath)) {
    const capturePlan = JSON.parse(fs.readFileSync(capturePlanPath, 'utf8'));
    if (capturePlan.status === 'PENDING_EXACT_HEAD_CI') return true;
  }
  return false;
});
if (!baselineCaptureTargets.length) {
  console.log('SRC_BASELINE_CAPTURE=SKIPPED_NO_TARGETS');
  process.exit(0);
}

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
  SRC062: [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 720 },
  ],
  SRC071: [
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
  const ids = elements.map((el) => el.id);
  const metrics = Object.fromEntries(elements.map((el) => {
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
  }));
  const canvas = document.getElementById('stage');
  return {
    ids,
    elementCount: document.querySelectorAll('*').length,
    buttonIds: [...document.querySelectorAll('button')].map((el) => el.id),
    metrics,
    canvas: canvas ? {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
    } : null,
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

async function startServer(sourceId, originalPath, sourceDir) {
  const isSRC047 = sourceId === 'SRC047';
  const assetFiles = isSRC047 ? src47SourceFiles(sourceDir, sourceId) : new Map();

// Large video assets must support HTTP Range requests: without them
  // Chromium refuses to seek the MP4 past the first buffered segment and the
  // cinematic baseline would silently fall back to the poster.
  //
  // IMPORTANT: fs.readFileSync does NOT support start/end as file offsets.
  // Passing { start, end } is silently ignored and returns the WHOLE file,
  // which made Content-Length report a partial length while the body was the
  // full file. Load once into memory (28 MB max) and slice the exact window.
  const sendFile = (res, filePath, mimeType) => sendFileRange(res, filePath, mimeType);

  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') { res.statusCode = 204; res.end(); return; }

    if (isSRC047 && assetFiles.has(req.url)) {
      const [filePath, mimeType] = assetFiles.get(req.url);
      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end('asset not found');
        return;
      }
      sendFile(res, filePath, mimeType);
      return;
    }

    if (req.url !== `/${sourceId}/original.html` && new URL(req.url, 'http://127.0.0.1').pathname !== `/${sourceId}/original.html`) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(fs.readFileSync(originalPath));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

async function exerciseDesktop(page, sourceId, label, originReveal) {
  await page.evaluate(() => window.__lt.overview(false));
  const scaleBefore = await page.evaluate(() => window.__lt.state.scale);
  await page.click('#zoomIn');
  const scaleAfter = await page.evaluate(() => window.__lt.state.scale);
  await page.click('#overviewBtn');
  const modeAfterOverview = await page.evaluate(() => window.__lt.state.mode);
  await page.click('#helpBtn');
  const helpToastVisible = await page.evaluate(() => document.getElementById('toast')?.classList.contains('show') === true);
  const interaction = {
    controlSurface: 'DESKTOP_CONTROLS',
    originRevealMode: originReveal.runtime.mode,
    zoomInIncreasedScale: scaleAfter > scaleBefore,
    scaleBefore: round(scaleBefore),
    scaleAfter: round(scaleAfter),
    overviewButtonMode: modeAfterOverview,
    helpToastVisible,
  };
  if (interaction.originRevealMode !== 'ORIGIN_REVEAL') throw new Error(`${sourceId} ${label}: origin reveal failed`);
  if (!interaction.zoomInIncreasedScale) throw new Error(`${sourceId} ${label}: zoom-in failed`);
  if (interaction.overviewButtonMode !== 'OVERVIEW') throw new Error(`${sourceId} ${label}: overview button failed`);
  if (!interaction.helpToastVisible) throw new Error(`${sourceId} ${label}: help toast failed`);
  return interaction;
}

async function exerciseMobile(page, sourceId, label, originReveal) {
  await page.evaluate(() => window.__lt.overview(false));
  const firstCluster = page.locator('#mobileRibbon button[data-i="0"]');
  await firstCluster.click();
  await page.waitForFunction(() => window.__lt?.state?.mode === 'CLUSTER_PATH_OVERVIEW', null, { timeout: 5000 });
  const clusterMode = await page.evaluate(() => window.__lt.state.mode);
  await page.click('#helpBtn');
  const helpToastVisible = await page.evaluate(() => document.getElementById('toast')?.classList.contains('show') === true);
  const interaction = {
    controlSurface: 'MOBILE_RIBBON',
    originRevealMode: originReveal.runtime.mode,
    clusterSelectionMode: clusterMode,
    helpToastVisible,
  };
  if (interaction.originRevealMode !== 'ORIGIN_REVEAL') throw new Error(`${sourceId} ${label}: mobile origin reveal failed`);
  if (interaction.clusterSelectionMode !== 'CLUSTER_PATH_OVERVIEW') throw new Error(`${sourceId} ${label}: mobile cluster selection failed`);
  if (!interaction.helpToastVisible) throw new Error(`${sourceId} ${label}: mobile help toast failed`);
  return interaction;
}

// Browser channel is configurable. SRC_BROWSER_CHANNEL=chrome forces the
// branded Google Chrome binary (Playwright channel: 'chrome'). When unset the
// bundled Playwright Chromium is used, preserving local/backward-compatible
// behavior. CI sets SRC_BROWSER_CHANNEL=chrome and fails closed if the channel
// binary is absent, so an S2 capture never silently falls back to Chromium.
const browserChannel = process.env.SRC_BROWSER_CHANNEL || null;
const launchOptions = { headless: true };
if (browserChannel) {
  // Fail closed: verify the channel binary is resolvable before launching.
  // Playwright throws on launch if the channel is missing, but an explicit
  // precheck produces a clear CI error instead of a launch-time crash.
  const { execFileSync } = await import('node:child_process');
  let chromeVersion = null;
  try {
    const candidates = process.platform === 'win32'
      ? [
          'chrome.exe',
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        ]
      : [
          'google-chrome',
          'google-chrome-stable',
          'chromium-browser',
          'chromium',
        ];
    for (const c of candidates) {
      try {
        chromeVersion = execFileSync(c, ['--version'], { stdio: 'pipe', encoding: 'utf8' }).trim();
        break;
      } catch { /* try next */ }
    }
  } catch { /* ignore */ }
  if (!chromeVersion) {
    throw new Error(`SRC_BROWSER_CHANNEL=${browserChannel} requested but no branded browser binary was found; refusing to fall back to bundled Chromium`);
  }
  console.log(`SRC_BROWSER_CHANNEL=${browserChannel} -> ${chromeVersion}`);
  launchOptions.channel = browserChannel;
}
const browser = await chromium.launch(launchOptions);
try {
  for (const sourceId of baselineCaptureTargets) {
    const sourceDir = path.join(sourceRoot, sourceId);
    const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
    // DUAL_VARIANT explicit recognition: the shared single-executable harness
    // assumes src/03_sources/SRCxxx/original/original.html, but a DUAL_VARIANT
    // source retains two authorities (original/A/original.html + original/B/original.html)
    // with no implicit canonical default. Verify both frozen originals, then SKIP
    // the single capture with an explicit disposition. SINGLE behavior below is unchanged.
    const dualBaselineDisposition = getDualVariantBaselineDisposition({ manifest });
    if (dualBaselineDisposition?.action === 'SKIP') {
      const variantKeys = listDualVariantKeys(manifest);
      if (!variantKeys) throw new Error(`${sourceId}: DUAL_VARIANT authority must define exactly variants A and B`);
      for (const key of variantKeys) {
        const variantPath = path.join(sourceDir, 'original', key, 'original.html');
        const variantBytes = fs.readFileSync(variantPath);
        const expected = manifest.authority?.variants?.[key];
        if (!expected) throw new Error(`${sourceId}: DUAL_VARIANT manifest missing variant ${key} authority`);
        if (variantBytes.length !== expected.bytes) throw new Error(`${sourceId} original variant ${key} byte count drift`);
        if (sha256(variantBytes) !== expected.sha256) throw new Error(`${sourceId} original variant ${key} SHA256 drift`);
      }
      console.log(`SRC_BASELINE_CAPTURE_SKIP=${sourceId} reason=${dualBaselineDisposition.reason} authority_mode=DUAL_VARIANT variants=${variantKeys.join(',')}`);
      continue;
    }
    // CONTEXT_AWARE_ONLY: the Source's own relative URLs only resolve from a
    // canonical external directory depth, so its repository path is not a valid
    // runtime surface. Fail closed instead of capturing a baseline the generic
    // single-executable harness cannot represent. SINGLE sources with no
    // capture_surface declaration are unaffected.
    const surfaceDisposition = getCaptureSurfaceDisposition({ manifest });
    if (surfaceDisposition) {
      console.log(`SRC_BASELINE_CAPTURE_SKIP=${sourceId} reason=${surfaceDisposition.reason} capture_surface=${surfaceDisposition.mode} required_serving=${surfaceDisposition.required_serving ?? 'UNKNOWN'}`);
      continue;
    }
    const originalPath = path.join(sourceDir, 'original', 'original.html');
    const bytes = fs.readFileSync(originalPath);
    if (bytes.length !== manifest.authority.bytes) throw new Error(`${sourceId} original byte count drift`);
    if (sha256(bytes) !== manifest.authority.sha256) throw new Error(`${sourceId} original SHA256 drift`);

    const sourceOut = path.join(outRoot, sourceId);
    fs.mkdirSync(sourceOut, { recursive: true });
    const server = await startServer(sourceId, originalPath, sourceDir);
    const { port } = server.address();
    try {
      const summary = {
        schema_version: '1.1',
        source_id: sourceId,
        exact_head: exactHead,
        authority_sha256: manifest.authority.sha256,
        authority_bytes: manifest.authority.bytes,
        viewports: [],
      };

      for (const viewport of viewportsFor(sourceId)) {
        const label = `${viewport.width}x${viewport.height}`;
        if (sourceId === 'SRC062') {
          // SRC062 owns a dedicated S2-proven driver (full desktop/mobile/
          // small-mobile interaction matrix via window.__track62). It manages
          // its own browser context. Route to it instead of the generic
          // window.__lt fallback, which SRC062 does not implement.
          const evidence = await captureSRC62Baseline(browser, `http://127.0.0.1:${port}/${sourceId}/original.html`, viewport, sourceOut, label, sourceId);
          if (evidence.errors.length) throw new Error(`${sourceId} ${label}: browser errors: ${evidence.errors.join('; ')}`);
          if (evidence.failedRequests.length) throw new Error(`${sourceId} ${label}: failed requests: ${evidence.failedRequests.join('; ')}`);
          fs.writeFileSync(path.join(sourceOut, `${label}.json`), JSON.stringify({ viewport, ...evidence }, null, 2));
          summary.viewports.push({ viewport, interaction: evidence.interaction, idCount: evidence.states.D01_INITIAL_SCENE01.ids.length, elementCount: evidence.states.D01_INITIAL_SCENE01.elementCount });
          continue;
        }
        if (sourceId === 'SRC071') {
          // SRC071 exposes window.__LOVE_TREE_V7_R24__, not the legacy
          // window.__lt/window.__lovetreeStats contract. Reuse its accepted
          // V7 R2.4 S2/S4 interaction semantics rather than forcing the
          // generic graph-source fallback.
          const evidence = await captureSRC71Baseline(browser, `http://127.0.0.1:${port}/${sourceId}/original.html`, viewport, sourceOut, label, sourceId);
          if (evidence.errors.length) throw new Error(`${sourceId} ${label}: browser errors: ${evidence.errors.join('; ')}`);
          if (evidence.failedRequests.length) throw new Error(`${sourceId} ${label}: failed requests: ${evidence.failedRequests.join('; ')}`);
          fs.writeFileSync(path.join(sourceOut, `${label}.json`), JSON.stringify({ viewport, ...evidence }, null, 2));
          summary.viewports.push({ viewport, interaction: evidence.interaction, idCount: evidence.states.INITIAL.state.ids.length, elementCount: evidence.states.INITIAL.state.elementCount });
          continue;
        }
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(`pageerror:${error.message}${error.stack ? ` @ ${error.stack.split('\n').slice(1, 3).join(' <- ').trim()}` : ''}`));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(`console:${message.text()}`);
        });
        const response = await page.goto(`http://127.0.0.1:${port}/${sourceId}/original.html`, {
          waitUntil: 'load',
          timeout: 30000,
        });
        if (!response?.ok()) throw new Error(`${sourceId} baseline HTTP ${response?.status()}`);
        if (sourceId === 'SRC064') {
          const evidence = await captureTrack64Baseline(page, sourceOut, label);
          if (errors.length) throw new Error(`${sourceId} ${label}: browser errors: ${errors.join('; ')}`);
          fs.writeFileSync(path.join(sourceOut, `${label}.json`), JSON.stringify({ viewport, ...evidence }, null, 2));
          summary.viewports.push({ viewport, interaction: evidence.interaction, idCount: evidence.welcome.ids.length, elementCount: evidence.welcome.elementCount });
          await page.close();
          await context.close();
          continue;
        }
        if (sourceId === 'SRC060') {
          const evidence = await captureTrack60Baseline(page, sourceOut, label);
          if (errors.length) throw new Error(`${sourceId} ${label}: browser errors: ${errors.join('; ')}`);
          fs.writeFileSync(path.join(sourceOut, `${label}.json`), JSON.stringify({ viewport, ...evidence }, null, 2));
          summary.viewports.push({ viewport, interaction: evidence.interaction, idCount: evidence.states.initial.state.ids.length, elementCount: evidence.states.initial.state.elementCount });
          await page.close();
          await context.close();
          continue;
        }
        if (sourceId === 'SRC058') {
          const evidence = await captureSRC58Baseline(page, sourceOut, label);
          if (errors.length) throw new Error(`${sourceId} ${label}: browser errors: ${errors.join('; ')}`);
          fs.writeFileSync(path.join(sourceOut, `${label}.json`), JSON.stringify({ viewport, ...evidence }, null, 2));
          summary.viewports.push({ viewport, interaction: evidence.interaction, idCount: evidence.states.initial.state.ids.length, elementCount: evidence.states.initial.state.elementCount });
          await page.close();
          await context.close();
          continue;
        }
        if (sourceId === 'SRC057') {
          const evidence = await captureTrack57Baseline(page, sourceOut, label);
          if (errors.length) throw new Error(`${sourceId} ${label}: browser errors: ${errors.join('; ')}`);
          fs.writeFileSync(path.join(sourceOut, `${label}.json`), JSON.stringify({ viewport, ...evidence }, null, 2));
          summary.viewports.push({ viewport, interaction: evidence.interaction, idCount: evidence.initial.ids.length, elementCount: evidence.initial.elementCount });
          await page.close();
          await context.close();
          continue;
        }
if (sourceId === 'SRC047') {
          const evidence = await captureSRC47Baseline(page, `http://127.0.0.1:${port}/${sourceId}/original.html`, sourceOut, label);
          if (errors.length) throw new Error(`${sourceId} ${label}: browser errors: ${errors.join('; ')}`);
          fs.writeFileSync(path.join(sourceOut, `${label}.json`), JSON.stringify({ viewport, ...evidence }, null, 2));
          summary.viewports.push({ viewport, interaction: evidence.interaction, idCount: evidence.states.INITIAL.state.ids.length, elementCount: evidence.states.INITIAL.state.elementCount });
          await page.close();
          await context.close();
          continue;
        }
        await page.waitForFunction(() => window.__lt && window.__lovetreeStats, null, { timeout: 15000 });
        await settle(page);

        const overview = await page.evaluate(collectPageState);
        await page.screenshot({ path: path.join(sourceOut, `${label}-overview.png`) });

        const mobile = viewport.width <= 640;
        if (mobile) await page.locator('#mobileRibbon button.origin').click();
        else await page.click('#focusFirst');
        await page.waitForFunction(() => window.__lt?.state?.mode === 'ORIGIN_REVEAL', null, { timeout: 5000 });
        await page.evaluate(() => document.getElementById('toast')?.classList.remove('show'));
        const originReveal = await page.evaluate(collectPageState);
        await page.screenshot({ path: path.join(sourceOut, `${label}-origin-reveal.png`) });

        const interaction = mobile
          ? await exerciseMobile(page, sourceId, label, originReveal)
          : await exerciseDesktop(page, sourceId, label, originReveal);
        if (errors.length) throw new Error(`${sourceId} ${label}: browser errors: ${errors.join('; ')}`);

        const viewportEvidence = { viewport, overview, originReveal, interaction, errors };
        fs.writeFileSync(path.join(sourceOut, `${label}.json`), JSON.stringify(viewportEvidence, null, 2));
        summary.viewports.push({ viewport, interaction, idCount: overview.ids.length, elementCount: overview.elementCount });
        await page.close();
        await context.close();
      }
      fs.writeFileSync(path.join(sourceOut, 'summary.json'), JSON.stringify(summary, null, 2));
      console.log(`SRC_BASELINE_CAPTURE_PASS=${sourceId}`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }
} finally {
  await browser.close();
}