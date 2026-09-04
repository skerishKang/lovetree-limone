import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { chromium } from 'playwright';

import { captureSRC47Variant, src47SourceFiles } from '../source047-driver.mjs';
import { sendFileRange } from '../src-range.mjs';

export const SRC047_SOURCE_ID = 'SRC047';
export const SRC047_MOBILE_WIDTH = 820;
export const SRC047_GEOMETRY_EPSILON = 1.5;
export const SRC047_CANONICAL_MAX_HAMMING = 32;
export const SRC047_ACT_TARGETS = Object.freeze({
  ACT1_FIRST_FEELING: 0.9,
  ACT2_MOMENT: 4.1,
  ACT3_BLOOM: 7.5,
  ACT4_WHY_NEXT: 11.1,
  ACT5_LOVETREE: 13.2,
});
export const SRC047_STATES = Object.freeze([
  'INITIAL',
  'ACT1_FIRST_FEELING',
  'ACT2_MOMENT',
  'ACT3_BLOOM',
  'ACT4_WHY_NEXT',
  'ACT5_LOVETREE',
  'MODAL_OPEN',
  'NAV_POPOVER_OPEN',
]);

const SCREENSHOT_KEYS = Object.freeze({
  ACT1_FIRST_FEELING: 'act1_first_feeling',
  ACT2_MOMENT: 'act2_moment',
  ACT3_BLOOM: 'act3_bloom',
  ACT4_WHY_NEXT: 'act4_why_next',
  ACT5_LOVETREE: 'act5_lovetree',
  MODAL_OPEN: 'modal',
  NAV_POPOVER_OPEN: 'nav',
});

const CANONICAL_STATES = Object.freeze([
  'ACT1_FIRST_FEELING',
  'ACT2_MOMENT',
  'ACT3_BLOOM',
  'ACT4_WHY_NEXT',
  'ACT5_LOVETREE',
  'MODAL_OPEN',
]);

const EXPECTED_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 1280, height: 800 }),
  Object.freeze({ width: 390, height: 844 }),
  Object.freeze({ width: 320, height: 720 }),
]);

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function sameArray(left, right) {
  return Array.isArray(left) && Array.isArray(right) && isDeepStrictEqual(left, right);
}

function validHex(value) {
  return typeof value === 'string' && value.length > 0 && value.length % 2 === 0 && /^[0-9a-f]+$/i.test(value);
}

export function canonicalBufferDistance(leftHex, rightHex) {
  if (!validHex(leftHex) || !validHex(rightHex)) return Number.POSITIVE_INFINITY;
  const left = Buffer.from(leftHex, 'hex');
  const right = Buffer.from(rightHex, 'hex');
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) distance += 1;
  }
  return distance;
}

function metricsEqual(left, right, epsilon = SRC047_GEOMETRY_EPSILON) {
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!(key in right)) return false;
    const a = left[key];
    const b = right[key];
    if (!a?.rect || !b?.rect) return false;
    for (const field of ['x', 'y', 'width', 'height']) {
      if (!Number.isFinite(a.rect[field]) || !Number.isFinite(b.rect[field])) return false;
      if (Math.abs(a.rect[field] - b.rect[field]) > epsilon) return false;
    }
    for (const field of ['display', 'visibility', 'opacity']) {
      if (a[field] !== b[field]) return false;
    }
  }
  return true;
}

function viewportKey(viewport) {
  return `${viewport?.width ?? 'UNKNOWN'}x${viewport?.height ?? 'UNKNOWN'}`;
}

function normalizedAcceptedStates(viewportRecord) {
  return (viewportRecord?.states ?? []).map((state) => String(state).split('=')[0].split(':')[0]);
}

export function validateSRC047MediaViewerAuthority({
  manifest,
  acceptedBaseline,
  acceptedParity,
  authorityBytes,
}) {
  const errors = [];
  const authoritySha256 = Buffer.isBuffer(authorityBytes) ? sha256(authorityBytes) : null;

  if (manifest?.source_id !== SRC047_SOURCE_ID) errors.push('SRC047_MANIFEST_SOURCE_ID_REQUIRED');
  if (manifest?.stages?.baseline_captured !== true) errors.push('SRC047_ACCEPTED_BASELINE_STAGE_REQUIRED');
  if (manifest?.stages?.mechanical_split_complete !== true) errors.push('SRC047_MECHANICAL_SPLIT_STAGE_REQUIRED');
  if (manifest?.stages?.source_split_parity_pass !== true) errors.push('SRC047_ACCEPTED_PARITY_STAGE_REQUIRED');
  if (manifest?.authority?.status !== 'LOCKED') errors.push('SRC047_AUTHORITY_LOCK_REQUIRED');

  if (!Buffer.isBuffer(authorityBytes)) {
    errors.push('SRC047_AUTHORITY_BYTES_REQUIRED');
  } else {
    if (authorityBytes.length !== manifest?.authority?.bytes) errors.push('SRC047_AUTHORITY_BYTE_COUNT_MISMATCH');
    if (authoritySha256 !== manifest?.authority?.sha256) errors.push('SRC047_AUTHORITY_SHA_MISMATCH');
  }

  if (acceptedBaseline?.source_id !== SRC047_SOURCE_ID || acceptedBaseline?.status !== 'ACCEPTED') {
    errors.push('SRC047_ACCEPTED_BASELINE_REQUIRED');
  }
  if (acceptedParity?.source_id !== SRC047_SOURCE_ID || acceptedParity?.status !== 'ACCEPTED') {
    errors.push('SRC047_ACCEPTED_PARITY_REQUIRED');
  }
  if (acceptedBaseline?.authority?.bytes !== manifest?.authority?.bytes
      || acceptedBaseline?.authority?.sha256 !== manifest?.authority?.sha256) {
    errors.push('SRC047_BASELINE_AUTHORITY_BINDING_MISMATCH');
  }
  if (acceptedParity?.authority?.bytes !== manifest?.authority?.bytes
      || acceptedParity?.authority?.sha256 !== manifest?.authority?.sha256) {
    errors.push('SRC047_PARITY_AUTHORITY_BINDING_MISMATCH');
  }

  if (acceptedParity?.comparisons?.screenshots !== 'CANONICAL_PIXEL_HAMMING_WITHIN_THRESHOLD') {
    errors.push('SRC047_ACCEPTED_SCREENSHOT_POLICY_REQUIRED');
  }
  if (acceptedParity?.comparisons?.canonical_pixel_threshold !== SRC047_CANONICAL_MAX_HAMMING) {
    errors.push('SRC047_CANONICAL_THRESHOLD_DRIFT');
  }
  if (acceptedParity?.runtime?.video_failed !== false) errors.push('SRC047_ACCEPTED_VIDEO_RUNTIME_REQUIRED');
  if (!Number.isFinite(acceptedParity?.runtime?.duration_seconds) || acceptedParity.runtime.duration_seconds <= 0) {
    errors.push('SRC047_ACCEPTED_VIDEO_DURATION_REQUIRED');
  }

  const acceptedViewports = acceptedParity?.viewports ?? [];
  if (acceptedViewports.length !== EXPECTED_VIEWPORTS.length) {
    errors.push('SRC047_ACCEPTED_VIEWPORT_MATRIX_REQUIRED');
  } else {
    for (const expectedViewport of EXPECTED_VIEWPORTS) {
      const record = acceptedViewports.find((entry) => entry.width === expectedViewport.width && entry.height === expectedViewport.height);
      if (!record) {
        errors.push(`SRC047_ACCEPTED_VIEWPORT_MISSING:${viewportKey(expectedViewport)}`);
        continue;
      }
      const normalizedStates = normalizedAcceptedStates(record);
      if (!sameArray(normalizedStates, SRC047_STATES)) {
        errors.push(`SRC047_ACCEPTED_STATE_MATRIX_DRIFT:${viewportKey(expectedViewport)}`);
      }
      const navState = String(record.states?.[record.states.length - 1] ?? '');
      if (expectedViewport.width <= SRC047_MOBILE_WIDTH && !navState.includes('NOT_APPLICABLE_MOBILE')) {
        errors.push(`SRC047_ACCEPTED_MOBILE_NAV_DISPOSITION_REQUIRED:${viewportKey(expectedViewport)}`);
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    authoritySha256,
    viewports: EXPECTED_VIEWPORTS.map((viewport) => ({ ...viewport })),
  };
}

function addError(errors, condition, code) {
  if (!condition) errors.push(code);
}

export function compareSRC047MediaViewerPair({
  original,
  split,
  viewport,
  canonicalMaxHamming = SRC047_CANONICAL_MAX_HAMMING,
}) {
  const errors = [];
  const label = viewportKey(viewport);
  const isMobile = viewport?.width <= SRC047_MOBILE_WIDTH;
  const canonicalDistances = {};
  const stateResults = {};

  addError(errors, Array.isArray(original?.errors) && original.errors.length === 0, `SRC047_ORIGINAL_BROWSER_ERRORS:${label}`);
  addError(errors, Array.isArray(split?.errors) && split.errors.length === 0, `SRC047_SPLIT_BROWSER_ERRORS:${label}`);
  addError(errors, sameArray(Object.keys(original?.states ?? {}), SRC047_STATES), `SRC047_ORIGINAL_STATE_SET_DRIFT:${label}`);
  addError(errors, sameArray(Object.keys(split?.states ?? {}), SRC047_STATES), `SRC047_SPLIT_STATE_SET_DRIFT:${label}`);

  for (const state of SRC047_STATES) {
    const originalWrapper = original?.states?.[state];
    const splitWrapper = split?.states?.[state];
    if (!originalWrapper || !splitWrapper) {
      errors.push(`SRC047_STATE_MISSING:${label}:${state}`);
      stateResults[state] = false;
      continue;
    }

    if (state === 'NAV_POPOVER_OPEN' && isMobile) {
      const passed = originalWrapper.stateName === 'NOT_APPLICABLE_MOBILE'
        && splitWrapper.stateName === 'NOT_APPLICABLE_MOBILE';
      addError(errors, passed, `SRC047_MOBILE_NAV_DISPOSITION_DRIFT:${label}`);
      stateResults[state] = passed ? 'NOT_APPLICABLE_MOBILE' : false;
      continue;
    }

    const left = originalWrapper.state;
    const right = splitWrapper.state;
    let statePassed = true;
    const check = (condition, code) => {
      if (!condition) {
        errors.push(code);
        statePassed = false;
      }
    };

    if (state === 'NAV_POPOVER_OPEN') {
      check(Boolean(left?.runtime?.navPopoverOpen), `SRC047_ORIGINAL_NAV_NOT_OPEN:${label}`);
      check(Boolean(right?.runtime?.navPopoverOpen), `SRC047_SPLIT_NAV_NOT_OPEN:${label}`);
      check(left?.runtime?.navPopoverOpen === right?.runtime?.navPopoverOpen, `SRC047_NAV_LABEL_DRIFT:${label}`);
    }

    check(isDeepStrictEqual(left?.ids, right?.ids), `SRC047_IDS_DRIFT:${label}:${state}`);
    check(left?.elementCount === right?.elementCount, `SRC047_ELEMENT_COUNT_DRIFT:${label}:${state}`);
    check(isDeepStrictEqual(left?.buttonIds, right?.buttonIds), `SRC047_BUTTON_IDS_DRIFT:${label}:${state}`);
    check(metricsEqual(left?.metrics, right?.metrics), `SRC047_METRICS_DRIFT:${label}:${state}`);
    check(left?.runtime?.videoFailed === false, `SRC047_ORIGINAL_VIDEO_FAILED:${label}:${state}`);
    check(right?.runtime?.videoFailed === false, `SRC047_SPLIT_VIDEO_FAILED:${label}:${state}`);
    check(Number.isFinite(left?.video?.duration) && left.video.duration > 0, `SRC047_ORIGINAL_DURATION_INVALID:${label}:${state}`);
    check(Number.isFinite(right?.video?.duration) && right.video.duration > 0, `SRC047_SPLIT_DURATION_INVALID:${label}:${state}`);
    check(left?.video?.readyState >= 2, `SRC047_ORIGINAL_READY_STATE_LOW:${label}:${state}`);
    check(right?.video?.readyState >= 2, `SRC047_SPLIT_READY_STATE_LOW:${label}:${state}`);
    check(left?.runtime?.act === right?.runtime?.act, `SRC047_ACT_DRIFT:${label}:${state}`);
    check(left?.runtime?.modalOpen === right?.runtime?.modalOpen, `SRC047_MODAL_STATE_DRIFT:${label}:${state}`);

    if (state in SRC047_ACT_TARGETS) {
      const target = SRC047_ACT_TARGETS[state];
      check(Math.abs(left?.video?.currentTime - target) <= 0.05, `SRC047_ORIGINAL_ACT_TIME_DRIFT:${label}:${state}`);
      check(Math.abs(right?.video?.currentTime - target) <= 0.05, `SRC047_SPLIT_ACT_TIME_DRIFT:${label}:${state}`);
    }

    stateResults[state] = statePassed;
  }

  addError(errors, isDeepStrictEqual(original?.interaction, split?.interaction), `SRC047_INTERACTION_DRIFT:${label}`);

  const statesToCheck = isMobile
    ? [...CANONICAL_STATES]
    : [...CANONICAL_STATES, 'NAV_POPOVER_OPEN'];
  for (const state of statesToCheck) {
    const key = SCREENSHOT_KEYS[state];
    const rawKey = `${key}_canonical_raw_hex`;
    const shaKey = `${key}_canonical_sha256`;
    const leftRaw = original?.screenshots?.[rawKey];
    const rightRaw = split?.screenshots?.[rawKey];
    const distance = canonicalBufferDistance(leftRaw, rightRaw);
    canonicalDistances[`${key}_canonical_hamming`] = Number.isFinite(distance) ? distance : null;
    canonicalDistances[`${key}_canonical_sha_equal`] = original?.screenshots?.[shaKey] === split?.screenshots?.[shaKey];
    addError(
      errors,
      Number.isFinite(distance) && distance <= canonicalMaxHamming,
      `SRC047_CANONICAL_PIXEL_DRIFT:${label}:${state}:${Number.isFinite(distance) ? distance : 'INVALID'}`,
    );
  }

  const screenshotShaEquality = {
    initial: original?.screenshots?.initial_sha256 === split?.screenshots?.initial_sha256,
    act1: original?.screenshots?.act1_first_feeling_sha256 === split?.screenshots?.act1_first_feeling_sha256,
    act2: original?.screenshots?.act2_moment_sha256 === split?.screenshots?.act2_moment_sha256,
    act3: original?.screenshots?.act3_bloom_sha256 === split?.screenshots?.act3_bloom_sha256,
    act4: original?.screenshots?.act4_why_next_sha256 === split?.screenshots?.act4_why_next_sha256,
    act5: original?.screenshots?.act5_lovetree_sha256 === split?.screenshots?.act5_lovetree_sha256,
    modal: original?.screenshots?.modal_sha256 === split?.screenshots?.modal_sha256,
    nav: isMobile ? true : original?.screenshots?.nav_sha256 === split?.screenshots?.nav_sha256,
  };

  return {
    passed: errors.length === 0,
    errors,
    comparison: {
      viewport: { width: viewport.width, height: viewport.height },
      geometryEpsilon: SRC047_GEOMETRY_EPSILON,
      canonicalMaxHamming,
      states: stateResults,
      interactionEqual: isDeepStrictEqual(original?.interaction, split?.interaction),
      screenshotShaEquality,
      canonicalDistances,
    },
  };
}

function startServer(sourceDir) {
  const files = src47SourceFiles(sourceDir, SRC047_SOURCE_ID);
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
    if (contentType === 'video/mp4' || contentType === 'image/jpeg' || contentType === 'image/png') {
      sendFileRange(res, filePath, contentType);
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

export async function replayApprovedSRC047MediaViewerPair({
  repoRoot = process.cwd(),
  exactHead,
  browserChannel,
  outRoot = '/tmp/src047-media-viewer-replay',
}) {
  if (!exactHead || !/^[0-9a-f]{40}$/.test(exactHead)) {
    throw new Error('SRC_EXACT_HEAD must be the exact 40-char PR head SHA');
  }
  if (browserChannel !== 'chrome') {
    throw new Error('SRC047_BRANDED_CHROME_REQUIRED');
  }

  const sourceDir = path.join(repoRoot, 'src', '03_sources', SRC047_SOURCE_ID);
  const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
  const acceptedBaseline = JSON.parse(fs.readFileSync(path.join(sourceDir, 'baseline', 'accepted-baseline.json'), 'utf8'));
  const acceptedParity = JSON.parse(fs.readFileSync(path.join(sourceDir, 'evidence', 'parity', 'accepted-parity.json'), 'utf8'));
  const authorityBytes = fs.readFileSync(path.join(sourceDir, 'original', 'original.html'));

  const authorityCheck = validateSRC047MediaViewerAuthority({
    manifest,
    acceptedBaseline,
    acceptedParity,
    authorityBytes,
  });
  if (!authorityCheck.passed) {
    throw new Error(`SRC047_MEDIA_VIEWER_AUTHORITY_HOLD:${authorityCheck.errors.join(',')}`);
  }

  fs.mkdirSync(outRoot, { recursive: true });
  const server = await startServer(sourceDir);
  const browser = await chromium.launch({ headless: true, channel: browserChannel });
  const { port } = server.address();
  const viewports = [];

  try {
    const browserVersion = browser.version();
    for (const viewport of authorityCheck.viewports) {
      const originalUrl = `http://127.0.0.1:${port}/${SRC047_SOURCE_ID}/original.html`;
      const splitUrl = `http://127.0.0.1:${port}/${SRC047_SOURCE_ID}/split/index.html`;
      const original = await captureSRC47Variant(
        browser,
        originalUrl,
        viewport,
        outRoot,
        'original',
        SRC047_SOURCE_ID,
      );
      const split = await captureSRC47Variant(
        browser,
        splitUrl,
        viewport,
        outRoot,
        'split',
        SRC047_SOURCE_ID,
      );
      const result = compareSRC047MediaViewerPair({ original, split, viewport });
      if (!result.passed) {
        throw new Error(`SRC047_MEDIA_VIEWER_REPLAY_DRIFT:${viewportKey(viewport)}:${result.errors.join(',')}`);
      }
      fs.writeFileSync(
        path.join(outRoot, `${viewportKey(viewport)}-comparison.json`),
        JSON.stringify(result.comparison, null, 2),
      );
      viewports.push(result.comparison);
      console.log(`SRC047_VIEWPORT_REPLAY_PASS=${viewportKey(viewport)}`);
    }

    const matchedStateCount = viewports.reduce(
      (sum, record) => sum + Object.values(record.states).filter((value) => value === true).length,
      0,
    );
    const summary = {
      schemaVersion: 'clean108-src047-media-viewer-replay-proof-v1',
      sourceId: SRC047_SOURCE_ID,
      exactHead,
      authoritySha256: authorityCheck.authoritySha256,
      acceptedBaselineCapturedHead: acceptedBaseline.captured_head ?? null,
      acceptedParitySourceHead: acceptedParity.source_head ?? null,
      browserChannel,
      browserVersion,
      viewportCount: viewports.length,
      matchedStateCount,
      policy: {
        geometryEpsilon: SRC047_GEOMETRY_EPSILON,
        canonicalMaxHamming: SRC047_CANONICAL_MAX_HAMMING,
        initialScreenshotStrictEqualityRequired: false,
        mediaDecodeRequired: true,
        sourceNativeVideoSeekRequired: true,
      },
      viewports,
      candidateOnly: true,
      acceptanceClaimed: false,
      acceptedSourceEvidenceUnmodified: true,
      legacyParityReplacement: false,
      passed: viewports.length === EXPECTED_VIEWPORTS.length && matchedStateCount === 22,
    };
    if (!summary.passed) throw new Error('SRC047_MEDIA_VIEWER_REPLAY_SUMMARY_FAILED');
    fs.writeFileSync(path.join(outRoot, 'summary.json'), JSON.stringify(summary, null, 2));
    return summary;
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
