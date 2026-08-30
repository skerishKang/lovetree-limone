import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src', '03_sources');
const outRoot = process.env.SRC_BASELINE_EVIDENCE_DIR || '/tmp/src-baseline-evidence';
const state = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src/01_registry/generation-state.json'), 'utf8'));

if (state.phase === 'SETUP') {
  console.log('SRC_BASELINE_CAPTURE=SKIPPED_SETUP');
  process.exit(0);
}
if (state.phase !== 'CALIBRATION') throw new Error(`Unsupported generation phase for baseline capture: ${state.phase}`);

const sourceIds = fs.readdirSync(sourceRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^SRC\d{3}$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();
if (!sourceIds.length) throw new Error('CALIBRATION requires at least one active Source');

const viewports = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 320, height: 720 },
];

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

async function startServer(sourceId, originalPath) {
  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') { res.statusCode = 204; res.end(); return; }
    if (req.url !== `/${sourceId}/original.html`) {
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

const browser = await chromium.launch({ headless: true });
try {
  for (const sourceId of sourceIds) {
    const sourceDir = path.join(sourceRoot, sourceId);
    const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
    const originalPath = path.join(sourceDir, 'original', 'original.html');
    const bytes = fs.readFileSync(originalPath);
    if (bytes.length !== manifest.authority.bytes) throw new Error(`${sourceId} original byte count drift`);
    if (sha256(bytes) !== manifest.authority.sha256) throw new Error(`${sourceId} original SHA256 drift`);

    const sourceOut = path.join(outRoot, sourceId);
    fs.mkdirSync(sourceOut, { recursive: true });
    const server = await startServer(sourceId, originalPath);
    const { port } = server.address();
    try {
      const summary = {
        schema_version: '1.0',
        source_id: sourceId,
        exact_head: process.env.GITHUB_SHA || null,
        authority_sha256: manifest.authority.sha256,
        authority_bytes: manifest.authority.bytes,
        viewports: [],
      };

      for (const viewport of viewports) {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(`console:${message.text()}`);
        });
        const response = await page.goto(`http://127.0.0.1:${port}/${sourceId}/original.html`, {
          waitUntil: 'load',
          timeout: 30000,
        });
        if (!response?.ok()) throw new Error(`${sourceId} baseline HTTP ${response?.status()}`);
        await page.waitForFunction(() => window.__lt && window.__lovetreeStats, null, { timeout: 15000 });
        await settle(page);

        const overview = await page.evaluate(collectPageState);
        const label = `${viewport.width}x${viewport.height}`;
        await page.screenshot({ path: path.join(sourceOut, `${label}-overview.png`) });

        await page.click('#focusFirst');
        await page.waitForFunction(() => window.__lt?.state?.mode === 'ORIGIN_REVEAL', null, { timeout: 5000 });
        await page.evaluate(() => document.getElementById('toast')?.classList.remove('show'));
        const originReveal = await page.evaluate(collectPageState);
        await page.screenshot({ path: path.join(sourceOut, `${label}-origin-reveal.png`) });

        await page.evaluate(() => window.__lt.overview(false));
        const scaleBefore = await page.evaluate(() => window.__lt.state.scale);
        await page.click('#zoomIn');
        const scaleAfter = await page.evaluate(() => window.__lt.state.scale);
        await page.click('#overviewBtn');
        const modeAfterOverview = await page.evaluate(() => window.__lt.state.mode);
        await page.click('#helpBtn');
        const helpToastVisible = await page.evaluate(() => document.getElementById('toast')?.classList.contains('show') === true);

        const interaction = {
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
        if (errors.length) throw new Error(`${sourceId} ${label}: browser errors: ${errors.join('; ')}`);

        const viewportEvidence = { viewport, overview, originReveal, interaction, errors };
        fs.writeFileSync(path.join(sourceOut, `${label}.json`), JSON.stringify(viewportEvidence, null, 2));
        summary.viewports.push({ viewport, interaction, idCount: overview.ids.length, elementCount: overview.elementCount });
        await page.close();
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
