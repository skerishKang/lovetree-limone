import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

import { analyzeAuthorityHtml } from './auto-analyzer/analyze-html.mjs';
import { captureApprovedStateRecipe } from './state-replay/capture-approved-state-recipe.mjs';
import { compareMatchedStateReplay } from './state-replay/compare-matched-state-replay.mjs';
import { expandRecipeMatrix } from './state-replay/expand-recipe-matrix.mjs';
import {
  canonical16PixelDigest,
  normalizeEvidenceForMatchedComparison,
} from './state-replay/matched-evidence-normalization.mjs';

const repoRoot = process.cwd();
const sourceId = 'SRC060';
const sourceRoot = path.join(repoRoot, 'src', '03_sources', sourceId);
const exactHead = process.env.SRC_EXACT_HEAD || null;
if (!exactHead || !/^[0-9a-f]{40}$/.test(exactHead)) throw new Error('SRC_EXACT_HEAD must be the exact 40-char PR head SHA');

const manifestPath = path.join(sourceRoot, 'manifest.json');
const originalPath = path.join(sourceRoot, 'original', 'original.html');
const splitIndexPath = path.join(sourceRoot, 'split', 'index.html');
const splitStylePath = path.join(sourceRoot, 'split', 'styles.css');
const splitScriptPath = path.join(sourceRoot, 'split', 'script.js');
const matrixPath = path.join(repoRoot, 'src', '08_harness', 'fixtures', 'state-recipes', sourceId, 'approved-complex-matrix.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.source_id !== sourceId) throw new Error(`SRC060_MANIFEST_ID_MISMATCH:${manifest.source_id ?? 'UNKNOWN'}`);
if (manifest.stages?.source_split_parity_pass !== true) throw new Error('SRC060_ACCEPTED_PARITY_REQUIRED');
const authorityBytes = fs.readFileSync(originalPath);
const authoritySha256 = crypto.createHash('sha256').update(authorityBytes).digest('hex');
if (authoritySha256 !== manifest.authority?.sha256) throw new Error('SRC060_AUTHORITY_SHA_MISMATCH');
if (authorityBytes.length !== manifest.authority?.bytes) throw new Error('SRC060_AUTHORITY_BYTES_MISMATCH');

const analysis = analyzeAuthorityHtml({
  html: authorityBytes.toString('utf8'),
  bytes: authorityBytes,
  sourceId,
  authorityPath: 'src/03_sources/SRC060/original/original.html',
  manifest,
});
const runtimeHookBinding = analysis.runtimeHookBinding;
if (runtimeHookBinding?.status !== 'BOUND' || runtimeHookBinding?.matched !== true) {
  throw new Error(`SRC060_RUNTIME_BINDING_NOT_BOUND:${runtimeHookBinding?.status ?? 'UNKNOWN'}`);
}
for (const hook of ['__LT60__', '__LT60_V12__']) {
  if (!runtimeHookBinding.expected.includes(hook) || !runtimeHookBinding.discovered.includes(hook)) {
    throw new Error(`SRC060_RUNTIME_HOOK_NOT_BOUND:${hook}`);
  }
}

const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const recipes = expandRecipeMatrix(matrix);
if (recipes.length !== 21) throw new Error(`SRC060_COMPLEX_MATRIX_EXPECTED_21:${recipes.length}`);

const routes = new Map([
  [`/${sourceId}/original.html`, [originalPath, 'text/html; charset=utf-8']],
  [`/${sourceId}/split/index.html`, [splitIndexPath, 'text/html; charset=utf-8']],
  [`/${sourceId}/split/styles.css`, [splitStylePath, 'text/css; charset=utf-8']],
  [`/${sourceId}/split/script.js`, [splitScriptPath, 'text/javascript; charset=utf-8']],
]);

function startServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') { res.statusCode = 204; res.end(); return; }
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const route = routes.get(pathname);
    if (!route) { res.statusCode = 404; res.end('not found'); return; }
    const [filePath, contentType] = route;
    res.statusCode = 200;
    res.setHeader('content-type', contentType);
    res.end(fs.readFileSync(filePath));
  });
  const safePorts = [8237, 8240, 8243, 8250, 8260, 8270, 8280, 8290];
  return new Promise((resolve, reject) => {
    let index = 0;
    const tryListen = () => {
      const port = index < safePorts.length ? safePorts[index++] : 0;
      const onError = (error) => {
        server.removeListener('error', onError);
        if (error.code === 'EADDRINUSE' && index <= safePorts.length) { tryListen(); return; }
        reject(error);
      };
      server.once('error', onError);
      server.listen(port, '127.0.0.1', () => { server.removeListener('error', onError); resolve(server); });
    };
    tryListen();
  });
}

function attachOuterHealth(page) {
  const errors = [];
  const handlers = {
    pageerror: (error) => errors.push(`pageerror:${error instanceof Error ? error.message : String(error)}`),
    console: (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); },
    requestfailed: (request) => errors.push(`requestfailed:${request.url()}:${request.failure()?.errorText ?? 'UNKNOWN'}`),
  };
  page.on('pageerror', handlers.pageerror);
  page.on('console', handlers.console);
  page.on('requestfailed', handlers.requestfailed);
  return { errors, detach: () => { page.off('pageerror', handlers.pageerror); page.off('console', handlers.console); page.off('requestfailed', handlers.requestfailed); } };
}

async function waitForSRC060Ready(page) {
  await page.waitForFunction(() => (
    window.__LT60__
    && window.__LT60_V12__
    && window.__LT60__.clusterProjection(0) != null
    && window.__LT60__.projection(0) != null
  ), null, { timeout: 15000 });
  const graph = await page.evaluate(() => ({
    nodes: window.__LT60__.nodes.length,
    clusters: window.__LT60__.clusters.length,
    bridges: window.__LT60__.bridgeRecords.length,
  }));
  if (graph.nodes !== 1000 || graph.clusters !== 9 || graph.bridges !== 24) {
    throw new Error(`SRC060_GRAPH_INVARIANT:${JSON.stringify(graph)}`);
  }
  await page.waitForTimeout(150);
  await page.evaluate(async () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function captureVariant({ browser, recipe, url, browserVersion }) {
  const context = await browser.newContext({
    viewport: { width: recipe.viewport.width, height: recipe.viewport.height },
    deviceScaleFactor: recipe.viewport.deviceScaleFactor ?? 1,
    reducedMotion: recipe.viewport.reducedMotion ?? 'reduce',
  });
  const page = await context.newPage();
  const outer = attachOuterHealth(page);
  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    if (!response?.ok()) throw new Error(`SRC060_REPLAY_HTTP_${response?.status() ?? 'ERROR'}:${url}`);
    await waitForSRC060Ready(page);
    if (outer.errors.length) throw new Error(`SRC060_STARTUP_BROWSER_ERRORS:${outer.errors.join(';')}`);

    const capture = await captureApprovedStateRecipe({
      page,
      recipe,
      runtimeHookBinding,
      baseUrl: url,
      provenance: { exactHead, authoritySha256, browserVersion },
      environment: {
        deviceScaleFactor: recipe.viewport.deviceScaleFactor ?? 1,
        reducedMotion: recipe.viewport.reducedMotion ?? 'reduce',
      },
    });

    await page.waitForTimeout(150);
    await page.evaluate(async () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (outer.errors.length) throw new Error(`SRC060_BROWSER_ERRORS:${outer.errors.join(';')}`);

    const contentElementCount = await page.evaluate(() => document.querySelectorAll('body *:not(script):not(link):not(style)').length);
    const screenshotDigests = new Map();
    for (const shot of capture.evidence.screenshots) {
      const buffer = capture.screenshotBuffers.get(shot.name);
      screenshotDigests.set(shot.name, await canonical16PixelDigest(page, buffer));
    }
    const normalizedEvidence = normalizeEvidenceForMatchedComparison({
      evidence: capture.evidence,
      screenshotDigests,
      contentElementCount,
    });
    return { capture, normalizedEvidence, screenshotDigests, contentElementCount };
  } finally {
    outer.detach();
    await context.close();
  }
}

const server = await startServer();
const { port } = server.address();
const browserChannel = process.env.SRC_BROWSER_CHANNEL || null;
const launchOptions = { headless: true };
if (browserChannel) launchOptions.channel = browserChannel;
const browser = await chromium.launch(launchOptions);

try {
  const browserVersion = browser.version();
  const originalUrl = `http://127.0.0.1:${port}/${sourceId}/original.html`;
  const splitUrl = `http://127.0.0.1:${port}/${sourceId}/split/index.html`;
  const states = [];

  for (const recipe of recipes) {
    const original = await captureVariant({ browser, recipe, url: originalUrl, browserVersion });
    const split = await captureVariant({ browser, recipe, url: splitUrl, browserVersion });
    const comparison = compareMatchedStateReplay({
      originalEvidence: original.normalizedEvidence,
      splitEvidence: split.normalizedEvidence,
    });
    if (!comparison.passed) throw new Error(`SRC060_COMPLEX_REPLAY_DRIFT:${recipe.viewport.width}x${recipe.viewport.height}:${recipe.stateId}:${comparison.differences.join(',')}`);
    states.push({
      viewport: `${recipe.viewport.width}x${recipe.viewport.height}`,
      stateId: recipe.stateId,
      comparison,
      screenshotDigests: Object.fromEntries(original.screenshotDigests),
      canonicalContentElementCount: original.contentElementCount,
    });
  }

  const summary = {
    schemaVersion: 'clean108-src060-complex-matched-replay-proof-v1',
    sourceId,
    exactHead,
    authoritySha256,
    browserChannel: browserChannel ?? 'chromium',
    browserVersion,
    runtimeHookBinding,
    viewportCount: matrix.viewports.length,
    stateFamilyCount: matrix.states.length,
    replayCount: states.length,
    screenshotPolicy: 'canonical16-mask-0xF0-exact',
    domPolicy: 'body-content-elements-excluding-mechanical-style-script-link-glue',
    states,
    passed: states.length === 21 && states.every((state) => state.comparison.passed),
    acceptedSourceEvidenceUnmodified: true,
    legacyParityReplacement: false,
    complexSourceReplayPass: true,
  };
  if (!summary.passed) throw new Error('SRC060_COMPLEX_MATCHED_REPLAY_PROOF_FAILED');
  console.log(`SRC060_APPROVED_RECIPE_COMPLEX_REPLAY_PASS=${exactHead}`);
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
