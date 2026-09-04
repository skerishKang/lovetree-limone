import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { chromium } from 'playwright';

import { captureSRC62Variant } from '../source062-driver.mjs';

export const SRC062_SOURCE_ID = 'SRC062';
export const SRC062_NORMALIZATION_DECIMALS = 3;
export const SRC062_PIXEL_MISMATCH_THRESHOLD = 32;
export const SRC062_MAX_CHANNEL_DELTA = 1;

export const SRC062_VIEWPORTS = Object.freeze([
  Object.freeze({
    width: 1440,
    height: 900,
    states: Object.freeze([
      'D01_INITIAL_SCENE01',
      'D02_RAIL_TRAVEL_SCENE04',
      'D03_ACTIVE_VIEWER_SCENE04',
      'D04_MEMORY_FILMS_PANEL',
      'D05_MY_TREE_PANEL',
      'D06_SCENE07_MEMORY_PATH_VIEWER',
    ]),
  }),
  Object.freeze({
    width: 390,
    height: 844,
    states: Object.freeze([
      'D01_INITIAL_SCENE01',
      'M02_MENU_SHEET',
      'M03_SWIPE_TRAVEL_SCENE06',
      'M04_ACTIVE_VIEWER_SCENE06',
      'M05_MEMORY_FILMS_PANEL',
      'M06_MY_TREE_PANEL',
    ]),
  }),
  Object.freeze({
    width: 320,
    height: 720,
    states: Object.freeze([
      'D01_INITIAL_SCENE01',
      'M02_MENU_SHEET',
      'M03_SWIPE_TRAVEL_SCENE06',
      'M04_ACTIVE_VIEWER_SCENE06',
      'M05_MEMORY_FILMS_PANEL',
      'M06_MY_TREE_PANEL',
    ]),
  }),
  Object.freeze({
    width: 1280,
    height: 800,
    states: Object.freeze([
      'D01_INITIAL_SCENE01',
      'D02_RAIL_TRAVEL_SCENE04',
      'D03_ACTIVE_VIEWER_SCENE04',
      'D04_MEMORY_FILMS_PANEL',
      'D05_MY_TREE_PANEL',
      'D06_SCENE07_MEMORY_PATH_VIEWER',
    ]),
  }),
]);

const COMMON_INTERACTIONS = Object.freeze({
  RAIL_FRACTIONAL_MOVE: true,
  SNAP_TO_SCENE: true,
  ACTIVE_SCULPTURE_SHORT_TAP: 'OPENS_VIEWER',
  DRAG_GREATER_THAN_9PX: 'DOES_NOT_OPEN_VIEWER',
  VIEWER_CLOSE_PHASE_RESTORED: true,
  MEMORY_FILMS_CARD_TO_VIEWER: 'OPENS_VIEWER',
  PANEL_CLOSE_PHASE_RESTORED: true,
});

const DESKTOP_INTERACTIONS = Object.freeze({
  ...COMMON_INTERACTIONS,
  SCENE07_MEMORY_PATH: true,
});

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function viewportKey(viewport) {
  return `${viewport?.width ?? 'UNKNOWN'}x${viewport?.height ?? 'UNKNOWN'}`;
}

function sameArray(left, right) {
  return Array.isArray(left) && Array.isArray(right) && isDeepStrictEqual(left, right);
}

function expectedViewport(viewport) {
  return SRC062_VIEWPORTS.find((entry) => entry.width === viewport?.width && entry.height === viewport?.height) ?? null;
}

export function normalizeSRC062ReplayValue(value) {
  if (typeof value === 'number') {
    const scale = 10 ** SRC062_NORMALIZATION_DECIMALS;
    return Math.round(value * scale) / scale;
  }
  if (Array.isArray(value)) return value.map(normalizeSRC062ReplayValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, normalizeSRC062ReplayValue(child)]),
    );
  }
  return value;
}

function addError(errors, condition, code) {
  if (!condition) errors.push(code);
}

export function validateSRC062LargeInlineAuthority({
  manifest,
  acceptedBaseline,
  acceptedParity,
  authorityBytes,
  splitIndexBytes,
  splitStylesBytes,
  splitScriptBytes,
}) {
  const errors = [];
  const authoritySha256 = Buffer.isBuffer(authorityBytes) ? sha256(authorityBytes) : null;
  const splitHashes = {
    index_sha256: Buffer.isBuffer(splitIndexBytes) ? sha256(splitIndexBytes) : null,
    styles_sha256: Buffer.isBuffer(splitStylesBytes) ? sha256(splitStylesBytes) : null,
    script_sha256: Buffer.isBuffer(splitScriptBytes) ? sha256(splitScriptBytes) : null,
  };

  addError(errors, manifest?.source_id === SRC062_SOURCE_ID, 'SRC062_MANIFEST_SOURCE_ID_REQUIRED');
  addError(errors, manifest?.authority?.status === 'LOCKED', 'SRC062_AUTHORITY_LOCK_REQUIRED');
  addError(errors, manifest?.stages?.baseline_captured === true, 'SRC062_ACCEPTED_BASELINE_STAGE_REQUIRED');
  addError(errors, manifest?.stages?.mechanical_split_complete === true, 'SRC062_MECHANICAL_SPLIT_STAGE_REQUIRED');
  addError(errors, manifest?.stages?.source_split_parity_pass === true, 'SRC062_ACCEPTED_PARITY_STAGE_REQUIRED');
  addError(errors, manifest?.source_contract?.qa_hook === 'window.__track62', 'SRC062_TRACK62_HOOK_REQUIRED');

  if (!Buffer.isBuffer(authorityBytes)) {
    errors.push('SRC062_AUTHORITY_BYTES_REQUIRED');
  } else {
    addError(errors, authorityBytes.length === manifest?.authority?.bytes, 'SRC062_AUTHORITY_BYTE_COUNT_MISMATCH');
    addError(errors, authoritySha256 === manifest?.authority?.sha256, 'SRC062_AUTHORITY_SHA_MISMATCH');
  }

  addError(
    errors,
    acceptedBaseline?.source_id === SRC062_SOURCE_ID && acceptedBaseline?.status === 'ACCEPTED',
    'SRC062_ACCEPTED_BASELINE_REQUIRED',
  );
  addError(
    errors,
    acceptedParity?.source_id === SRC062_SOURCE_ID && acceptedParity?.status === 'ACCEPTED',
    'SRC062_ACCEPTED_PARITY_REQUIRED',
  );
  addError(
    errors,
    acceptedBaseline?.authority?.bytes === manifest?.authority?.bytes
      && acceptedBaseline?.authority?.sha256 === manifest?.authority?.sha256,
    'SRC062_BASELINE_AUTHORITY_BINDING_MISMATCH',
  );
  addError(
    errors,
    acceptedParity?.authority?.bytes === manifest?.authority?.bytes
      && acceptedParity?.authority?.sha256 === manifest?.authority?.sha256,
    'SRC062_PARITY_AUTHORITY_BINDING_MISMATCH',
  );

  for (const [key, hash] of Object.entries(splitHashes)) {
    addError(errors, Boolean(hash), `SRC062_SPLIT_BYTES_REQUIRED:${key}`);
    addError(errors, hash === acceptedParity?.split?.[key], `SRC062_SPLIT_HASH_MISMATCH:${key}`);
  }

  for (const field of ['dom', 'geometry', 'computed_style', 'runtime_state', 'interactions']) {
    addError(errors, acceptedParity?.comparisons?.[field] === 'EQUAL', `SRC062_ACCEPTED_${field.toUpperCase()}_POLICY_REQUIRED`);
  }
  addError(
    errors,
    acceptedParity?.comparisons?.screenshots === 'CANONICAL_PIXEL_HAMMING_WITHIN_THRESHOLD',
    'SRC062_ACCEPTED_SCREENSHOT_POLICY_REQUIRED',
  );
  addError(
    errors,
    acceptedParity?.comparisons?.canonical_pixel_threshold === SRC062_PIXEL_MISMATCH_THRESHOLD,
    'SRC062_PIXEL_THRESHOLD_DRIFT',
  );
  addError(
    errors,
    acceptedParity?.screenshot_review?.max_channel_delta_0_255 === SRC062_MAX_CHANNEL_DELTA,
    'SRC062_CHANNEL_DELTA_POLICY_DRIFT',
  );
  addError(errors, acceptedParity?.screenshot_review?.pair_count === 24, 'SRC062_ACCEPTED_PAIR_COUNT_REQUIRED');
  addError(
    errors,
    acceptedParity?.screenshot_review?.central_assessment === 'ANTIALIASING_NOISE_ONLY',
    'SRC062_ACCEPTED_VISUAL_DISPOSITION_REQUIRED',
  );
  addError(errors, acceptedParity?.browser?.console_errors === 0, 'SRC062_ACCEPTED_CONSOLE_ERRORS_MUST_BE_ZERO');
  addError(errors, acceptedParity?.browser?.page_errors === 0, 'SRC062_ACCEPTED_PAGE_ERRORS_MUST_BE_ZERO');
  addError(errors, acceptedParity?.browser?.failed_requests === 0, 'SRC062_ACCEPTED_FAILED_REQUESTS_MUST_BE_ZERO');

  const acceptedViewports = acceptedParity?.viewports ?? [];
  addError(errors, acceptedViewports.length === SRC062_VIEWPORTS.length, 'SRC062_ACCEPTED_VIEWPORT_MATRIX_REQUIRED');
  for (const expected of SRC062_VIEWPORTS) {
    const record = acceptedViewports.find((entry) => entry.width === expected.width && entry.height === expected.height);
    if (!record) {
      errors.push(`SRC062_ACCEPTED_VIEWPORT_MISSING:${viewportKey(expected)}`);
      continue;
    }
    addError(
      errors,
      sameArray(record.states, expected.states),
      `SRC062_ACCEPTED_STATE_MATRIX_DRIFT:${viewportKey(expected)}`,
    );
  }

  return {
    passed: errors.length === 0,
    errors,
    authoritySha256,
    splitHashes,
    viewports: SRC062_VIEWPORTS.map(({ width, height, states }) => ({ width, height, states: [...states] })),
  };
}

export function compareSRC062LargeInlinePair({ original, split, viewport }) {
  const errors = [];
  const expected = expectedViewport(viewport);
  const label = viewportKey(viewport);
  const stateResults = {};

  if (!expected) {
    return { passed: false, errors: [`SRC062_UNAPPROVED_VIEWPORT:${label}`], comparison: null };
  }

  addError(errors, Array.isArray(original?.errors) && original.errors.length === 0, `SRC062_ORIGINAL_BROWSER_ERRORS:${label}`);
  addError(errors, Array.isArray(split?.errors) && split.errors.length === 0, `SRC062_SPLIT_BROWSER_ERRORS:${label}`);
  addError(errors, Array.isArray(original?.failedRequests) && original.failedRequests.length === 0, `SRC062_ORIGINAL_FAILED_REQUESTS:${label}`);
  addError(errors, Array.isArray(split?.failedRequests) && split.failedRequests.length === 0, `SRC062_SPLIT_FAILED_REQUESTS:${label}`);
  addError(errors, sameArray(Object.keys(original?.states ?? {}), expected.states), `SRC062_ORIGINAL_STATE_SET_DRIFT:${label}`);
  addError(errors, sameArray(Object.keys(split?.states ?? {}), expected.states), `SRC062_SPLIT_STATE_SET_DRIFT:${label}`);

  for (const state of expected.states) {
    const left = original?.states?.[state];
    const right = split?.states?.[state];
    const passed = left != null
      && right != null
      && isDeepStrictEqual(normalizeSRC062ReplayValue(left), normalizeSRC062ReplayValue(right));
    addError(errors, passed, `SRC062_STATE_DRIFT:${label}:${state}`);
    stateResults[state] = passed;
  }

  const expectedInteractions = viewport.width >= 1024 ? DESKTOP_INTERACTIONS : COMMON_INTERACTIONS;
  addError(errors, isDeepStrictEqual(original?.interaction, split?.interaction), `SRC062_INTERACTION_DRIFT:${label}`);
  for (const [name, value] of Object.entries(expectedInteractions)) {
    addError(errors, original?.interaction?.[name] === value, `SRC062_ORIGINAL_INTERACTION_FAILED:${label}:${name}`);
    addError(errors, split?.interaction?.[name] === value, `SRC062_SPLIT_INTERACTION_FAILED:${label}:${name}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    comparison: {
      viewport: { width: viewport.width, height: viewport.height },
      states: stateResults,
      interactionEqual: isDeepStrictEqual(original?.interaction, split?.interaction),
      interaction: split?.interaction ?? null,
      normalizationDecimals: SRC062_NORMALIZATION_DECIMALS,
    },
  };
}

export function validateSRC062PixelDiff({
  differingPixels,
  maxChannelDelta,
  width,
  height,
  mismatchThreshold = SRC062_PIXEL_MISMATCH_THRESHOLD,
  channelDeltaThreshold = SRC062_MAX_CHANNEL_DELTA,
}) {
  const errors = [];
  addError(errors, Number.isInteger(width) && width > 0, 'SRC062_PIXEL_WIDTH_INVALID');
  addError(errors, Number.isInteger(height) && height > 0, 'SRC062_PIXEL_HEIGHT_INVALID');
  addError(errors, Number.isInteger(differingPixels) && differingPixels >= 0, 'SRC062_PIXEL_DIFF_COUNT_INVALID');
  addError(errors, Number.isInteger(maxChannelDelta) && maxChannelDelta >= 0, 'SRC062_PIXEL_CHANNEL_DELTA_INVALID');
  addError(errors, differingPixels <= mismatchThreshold, `SRC062_PIXEL_MISMATCH_EXCEEDS_THRESHOLD:${differingPixels}`);
  addError(errors, maxChannelDelta <= channelDeltaThreshold, `SRC062_PIXEL_CHANNEL_DELTA_EXCEEDS_THRESHOLD:${maxChannelDelta}`);
  return { passed: errors.length === 0, errors };
}

async function comparePngPair(pixelPage, originalPath, splitPath) {
  const originalBase64 = fs.readFileSync(originalPath).toString('base64');
  const splitBase64 = fs.readFileSync(splitPath).toString('base64');
  return pixelPage.evaluate(async ({ originalBase64: leftBase64, splitBase64: rightBase64 }) => {
    const load = async (base64) => {
      const response = await fetch(`data:image/png;base64,${base64}`);
      const blob = await response.blob();
      return createImageBitmap(blob);
    };
    const left = await load(leftBase64);
    const right = await load(rightBase64);
    try {
      if (left.width !== right.width || left.height !== right.height) {
        return {
          width: left.width,
          height: left.height,
          splitWidth: right.width,
          splitHeight: right.height,
          differingPixels: Number.MAX_SAFE_INTEGER,
          maxChannelDelta: 255,
        };
      }
      const canvas = document.createElement('canvas');
      canvas.width = left.width;
      canvas.height = left.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(left, 0, 0);
      const leftData = context.getImageData(0, 0, left.width, left.height).data;
      context.clearRect(0, 0, left.width, left.height);
      context.drawImage(right, 0, 0);
      const rightData = context.getImageData(0, 0, right.width, right.height).data;
      let differingPixels = 0;
      let maxChannelDelta = 0;
      for (let offset = 0; offset < leftData.length; offset += 4) {
        let pixelDiffers = false;
        for (let channel = 0; channel < 4; channel += 1) {
          const delta = Math.abs(leftData[offset + channel] - rightData[offset + channel]);
          if (delta !== 0) pixelDiffers = true;
          if (delta > maxChannelDelta) maxChannelDelta = delta;
        }
        if (pixelDiffers) differingPixels += 1;
      }
      return { width: left.width, height: left.height, differingPixels, maxChannelDelta };
    } finally {
      left.close();
      right.close();
    }
  }, { originalBase64, splitBase64 });
}

function startServer(sourceDir) {
  const files = new Map([
    [`/${SRC062_SOURCE_ID}/original.html`, [path.join(sourceDir, 'original', 'original.html'), 'text/html; charset=utf-8']],
    [`/${SRC062_SOURCE_ID}/split/index.html`, [path.join(sourceDir, 'split', 'index.html'), 'text/html; charset=utf-8']],
    [`/${SRC062_SOURCE_ID}/split/styles.css`, [path.join(sourceDir, 'split', 'styles.css'), 'text/css; charset=utf-8']],
    [`/${SRC062_SOURCE_ID}/split/script.js`, [path.join(sourceDir, 'split', 'script.js'), 'text/javascript; charset=utf-8']],
  ]);
  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') {
      res.statusCode = 204;
      res.end();
      return;
    }
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const entry = files.get(pathname);
    if (!entry) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    const [filePath, contentType] = entry;
    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('content-type', contentType);
    res.end(fs.readFileSync(filePath));
  });

  const safePorts = [8137, 8140, 8143, 8150, 8160, 8170, 8180, 8190];
  return new Promise((resolve, reject) => {
    let index = 0;
    const listen = () => {
      const port = index < safePorts.length ? safePorts[index++] : 0;
      const onError = (error) => {
        server.removeListener('error', onError);
        if (error.code === 'EADDRINUSE' && index <= safePorts.length) {
          listen();
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
    listen();
  });
}

function screenshotPath(outRoot, viewport, variant, state) {
  return path.join(outRoot, `${viewport.width}x${viewport.height}-${variant}-${state}.png`);
}

export async function replayApprovedSRC062LargeInlinePair({
  repoRoot = process.cwd(),
  exactHead,
  browserChannel = null,
  outRoot = '/tmp/src062-large-inline-replay',
}) {
  if (!exactHead || !/^[0-9a-f]{40}$/.test(exactHead)) {
    throw new Error('SRC_EXACT_HEAD must be the exact 40-char PR head SHA');
  }

  const sourceDir = path.join(repoRoot, 'src', '03_sources', SRC062_SOURCE_ID);
  const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
  const acceptedBaseline = JSON.parse(fs.readFileSync(path.join(sourceDir, 'baseline', 'accepted-baseline.json'), 'utf8'));
  const acceptedParity = JSON.parse(fs.readFileSync(path.join(sourceDir, 'evidence', 'parity', 'accepted-parity.json'), 'utf8'));
  const authorityBytes = fs.readFileSync(path.join(sourceDir, 'original', 'original.html'));
  const splitIndexBytes = fs.readFileSync(path.join(sourceDir, 'split', 'index.html'));
  const splitStylesBytes = fs.readFileSync(path.join(sourceDir, 'split', 'styles.css'));
  const splitScriptBytes = fs.readFileSync(path.join(sourceDir, 'split', 'script.js'));

  const authorityCheck = validateSRC062LargeInlineAuthority({
    manifest,
    acceptedBaseline,
    acceptedParity,
    authorityBytes,
    splitIndexBytes,
    splitStylesBytes,
    splitScriptBytes,
  });
  if (!authorityCheck.passed) {
    throw new Error(`SRC062_LARGE_INLINE_AUTHORITY_HOLD:${authorityCheck.errors.join(',')}`);
  }

  fs.mkdirSync(outRoot, { recursive: true });
  const server = await startServer(sourceDir);
  const launchOptions = { headless: true };
  if (browserChannel) launchOptions.channel = browserChannel;
  const browser = await chromium.launch(launchOptions);
  const pixelContext = await browser.newContext();
  const pixelPage = await pixelContext.newPage();
  const { port } = server.address();
  const viewports = [];
  let matchedStateCount = 0;
  let pixelPairCount = 0;
  let maxDifferingPixels = 0;
  let maxChannelDelta = 0;

  try {
    for (const viewport of authorityCheck.viewports) {
      const originalUrl = `http://127.0.0.1:${port}/${SRC062_SOURCE_ID}/original.html`;
      const splitUrl = `http://127.0.0.1:${port}/${SRC062_SOURCE_ID}/split/index.html`;
      const original = await captureSRC62Variant(browser, originalUrl, viewport, outRoot, 'original', SRC062_SOURCE_ID);
      const split = await captureSRC62Variant(browser, splitUrl, viewport, outRoot, 'split', SRC062_SOURCE_ID);
      const stateResult = compareSRC062LargeInlinePair({ original, split, viewport });
      if (!stateResult.passed) {
        throw new Error(`SRC062_LARGE_INLINE_STATE_DRIFT:${viewportKey(viewport)}:${stateResult.errors.join(',')}`);
      }

      const pixelResults = {};
      for (const state of viewport.states) {
        const raw = await comparePngPair(
          pixelPage,
          screenshotPath(outRoot, viewport, 'original', state),
          screenshotPath(outRoot, viewport, 'split', state),
        );
        const policy = validateSRC062PixelDiff(raw);
        if (!policy.passed) {
          throw new Error(`SRC062_LARGE_INLINE_PIXEL_DRIFT:${viewportKey(viewport)}:${state}:${policy.errors.join(',')}`);
        }
        pixelResults[state] = raw;
        pixelPairCount += 1;
        maxDifferingPixels = Math.max(maxDifferingPixels, raw.differingPixels);
        maxChannelDelta = Math.max(maxChannelDelta, raw.maxChannelDelta);
      }

      matchedStateCount += viewport.states.length;
      const comparison = {
        ...stateResult.comparison,
        pixelResults,
      };
      fs.writeFileSync(
        path.join(outRoot, `${viewportKey(viewport)}-comparison.json`),
        JSON.stringify(comparison, null, 2),
      );
      viewports.push(comparison);
      console.log(`SRC062_VIEWPORT_REPLAY_PASS=${viewportKey(viewport)}`);
    }

    const summary = {
      schemaVersion: 'clean108-src062-large-inline-replay-proof-v1',
      sourceId: SRC062_SOURCE_ID,
      exactHead,
      browserChannel: browserChannel ?? 'chromium',
      browserVersion: browser.version(),
      authoritySha256: authorityCheck.authoritySha256,
      splitHashes: authorityCheck.splitHashes,
      viewportCount: viewports.length,
      matchedStateCount,
      pixelPairCount,
      maxDifferingPixels,
      maxChannelDelta,
      policy: {
        normalizationDecimals: SRC062_NORMALIZATION_DECIMALS,
        pixelMismatchThreshold: SRC062_PIXEL_MISMATCH_THRESHOLD,
        maxChannelDelta: SRC062_MAX_CHANNEL_DELTA,
        acceptedStateMatrixReused: true,
        acceptedInteractionMatrixReused: true,
      },
      candidateOnly: true,
      acceptanceClaimed: false,
      acceptedSourceEvidenceUnmodified: true,
      legacyDriverReused: true,
      viewports,
      passed: viewports.length === SRC062_VIEWPORTS.length
        && matchedStateCount === 24
        && pixelPairCount === 24
        && maxDifferingPixels <= SRC062_PIXEL_MISMATCH_THRESHOLD
        && maxChannelDelta <= SRC062_MAX_CHANNEL_DELTA,
    };
    if (!summary.passed) throw new Error('SRC062_LARGE_INLINE_REPLAY_SUMMARY_FAILED');
    fs.writeFileSync(path.join(outRoot, 'summary.json'), JSON.stringify(summary, null, 2));
    return summary;
  } finally {
    await pixelContext.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
