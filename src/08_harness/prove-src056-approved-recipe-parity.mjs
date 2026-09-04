import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

import { analyzeAuthorityHtml } from './auto-analyzer/analyze-html.mjs';
import { captureApprovedStateRecipe } from './state-replay/capture-approved-state-recipe.mjs';
import { compareMatchedStateReplay } from './state-replay/compare-matched-state-replay.mjs';

const repoRoot = process.cwd();
const sourceId = 'SRC056';
const sourceRoot = path.join(repoRoot, 'src', '03_sources', sourceId);
const exactHead = process.env.SRC_EXACT_HEAD || null;
if (!exactHead || !/^[0-9a-f]{40}$/.test(exactHead)) {
  throw new Error('SRC_EXACT_HEAD must be the exact 40-char PR head SHA');
}

const manifestPath = path.join(sourceRoot, 'manifest.json');
const originalPath = path.join(sourceRoot, 'original', 'original.html');
const splitIndexPath = path.join(sourceRoot, 'split', 'index.html');
const splitStylePath = path.join(sourceRoot, 'split', 'styles.css');
const splitScriptPath = path.join(sourceRoot, 'split', 'script.js');
const recipePaths = [
  path.join(repoRoot, 'src', '08_harness', 'fixtures', 'state-recipes', sourceId, 'overview.json'),
  path.join(repoRoot, 'src', '08_harness', 'fixtures', 'state-recipes', sourceId, 'origin-reveal.json'),
];

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.source_id !== sourceId) throw new Error(`SRC056_MANIFEST_ID_MISMATCH:${manifest.source_id ?? 'UNKNOWN'}`);
if (manifest.stages?.source_split_parity_pass !== true) throw new Error('SRC056_ACCEPTED_PARITY_REQUIRED');

const authorityBytes = fs.readFileSync(originalPath);
const authoritySha256 = crypto.createHash('sha256').update(authorityBytes).digest('hex');
if (authoritySha256 !== manifest.authority?.sha256) {
  throw new Error(`SRC056_AUTHORITY_SHA_MISMATCH:${authoritySha256}:${manifest.authority?.sha256 ?? 'UNKNOWN'}`);
}
if (authorityBytes.length !== manifest.authority?.bytes) {
  throw new Error(`SRC056_AUTHORITY_BYTES_MISMATCH:${authorityBytes.length}:${manifest.authority?.bytes ?? 'UNKNOWN'}`);
}

const analysis = analyzeAuthorityHtml({
  html: authorityBytes.toString('utf8'),
  bytes: authorityBytes,
  sourceId,
  authorityPath: 'src/03_sources/SRC056/original/original.html',
  manifest,
});
const runtimeHookBinding = analysis.runtimeHookBinding;
if (runtimeHookBinding?.status !== 'BOUND' || runtimeHookBinding?.matched !== true) {
  throw new Error(`SRC056_RUNTIME_BINDING_NOT_BOUND:${runtimeHookBinding?.status ?? 'UNKNOWN'}`);
}

const routes = new Map([
  [`/${sourceId}/original.html`, [originalPath, 'text/html; charset=utf-8']],
  [`/${sourceId}/split/index.html`, [splitIndexPath, 'text/html; charset=utf-8']],
  [`/${sourceId}/split/styles.css`, [splitStylePath, 'text/css; charset=utf-8']],
  [`/${sourceId}/split/script.js`, [splitScriptPath, 'text/javascript; charset=utf-8']],
]);

function startServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') {
      res.statusCode = 204;
      res.end();
      return;
    }
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const route = routes.get(pathname);
    if (!route) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    const [filePath, contentType] = route;
    res.statusCode = 200;
    res.setHeader('content-type', contentType);
    res.end(fs.readFileSync(filePath));
  });

  const safePorts = [8137, 8140, 8143, 8150, 8160, 8170, 8180, 8190];
  return new Promise((resolve, reject) => {
    let index = 0;
    const tryListen = () => {
      const port = index < safePorts.length ? safePorts[index++] : 0;
      const onError = (error) => {
        server.removeListener('error', onError);
        if (error.code === 'EADDRINUSE' && index <= safePorts.length) {
          tryListen();
          return;
        }
        reject(error);
      };
      server.once('error', onError);
      server.listen(port, '127.0.0.1', () => {
        server.removeListener('error', onError);
        resolve(server);
      });
    };
    tryListen();
  });
}

async function captureVariant({ browser, recipe, url, browserVersion }) {
  const context = await browser.newContext({
    viewport: { width: recipe.viewport.width, height: recipe.viewport.height },
    deviceScaleFactor: recipe.viewport.deviceScaleFactor ?? 1,
    reducedMotion: recipe.viewport.reducedMotion ?? 'reduce',
  });
  const page = await context.newPage();
  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    if (!response?.ok()) throw new Error(`SRC056_REPLAY_HTTP_${response?.status() ?? 'ERROR'}:${url}`);
    await page.waitForFunction(() => Boolean(window.__lt && window.__lovetreeStats), null, { timeout: 15000 });
    // Frozen SRC056 schedules a startup toast at 650 ms. Consume the same
    // source-owned timer before running either A or B recipe.
    await page.waitForTimeout(900);

    return await captureApprovedStateRecipe({
      page,
      recipe,
      runtimeHookBinding,
      baseUrl: url,
      provenance: {
        exactHead,
        authoritySha256,
        browserVersion,
      },
      environment: {
        deviceScaleFactor: recipe.viewport.deviceScaleFactor ?? 1,
        reducedMotion: recipe.viewport.reducedMotion ?? 'reduce',
      },
    });
  } finally {
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

  for (const recipePath of recipePaths) {
    const recipe = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
    if (recipe.sourceId !== sourceId) throw new Error(`SRC056_RECIPE_SOURCE_MISMATCH:${recipe.sourceId ?? 'UNKNOWN'}`);

    // The exact same parsed recipe object is passed to both captures. Variant
    // selection is an outer S4 environment concern, not a different journey.
    const original = await captureVariant({ browser, recipe, url: originalUrl, browserVersion });
    const split = await captureVariant({ browser, recipe, url: splitUrl, browserVersion });
    const comparison = compareMatchedStateReplay({
      originalEvidence: original.evidence,
      splitEvidence: split.evidence,
    });

    const screenshotNames = [...original.screenshotBuffers.keys()];
    const screenshotBuffersEqual = screenshotNames.length === split.screenshotBuffers.size
      && screenshotNames.every((name) => {
        const left = original.screenshotBuffers.get(name);
        const right = split.screenshotBuffers.get(name);
        return Buffer.isBuffer(left) && Buffer.isBuffer(right) && left.equals(right);
      });

    if (!comparison.passed || !screenshotBuffersEqual) {
      throw new Error(
        `SRC056_MATCHED_REPLAY_DRIFT:${recipe.stateId}:${[
          ...comparison.differences,
          ...(screenshotBuffersEqual ? [] : ['screenshot_buffer_bytes_equal']),
        ].join(',')}`,
      );
    }

    states.push({
      stateId: recipe.stateId,
      recipeFile: path.relative(repoRoot, recipePath).replaceAll(path.sep, '/'),
      comparison,
      screenshotBuffersEqual,
      screenshotSha256: original.evidence.screenshots.map((shot) => ({
        name: shot.name,
        sha256: shot.rawSha256,
        bytes: shot.bytes,
      })),
    });
  }

  const summary = {
    schemaVersion: 'clean108-src056-simple-matched-replay-proof-v1',
    sourceId,
    exactHead,
    authoritySha256,
    browserChannel: browserChannel ?? 'chromium',
    browserVersion,
    runtimeHookBinding,
    stateCount: states.length,
    states,
    passed: states.length === recipePaths.length && states.every((state) => state.comparison.passed && state.screenshotBuffersEqual),
    acceptedSourceEvidenceUnmodified: true,
    legacyParityReplacement: false,
  };

  if (!summary.passed) throw new Error('SRC056_MATCHED_REPLAY_PROOF_FAILED');
  console.log(`SRC056_APPROVED_RECIPE_MATCHED_REPLAY_PASS=${exactHead}`);
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
