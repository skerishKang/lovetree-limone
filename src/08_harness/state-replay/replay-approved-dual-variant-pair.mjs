import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import {
  captureSRC68Variant,
  src68ExpectedImages,
  src68IsLoopbackImage,
  src68SourceFiles,
} from '../source068-driver.mjs';

export const DUAL_VARIANT_REPLAY_HARNESS_VERSION = 'clean108-m1-slice6-dual-plugin-v1';
export const DUAL_VARIANT_REPLAY_SCHEMA_VERSION = 'clean108-dual-variant-replay-v1';

export const DUAL_VARIANT_REPLAY_HOLD_CODES = Object.freeze({
  UNKNOWN_SOURCE: 'HOLD_DUAL_UNKNOWN_SOURCE',
  PLUGIN_NOT_REGISTERED: 'HOLD_DUAL_PLUGIN_NOT_REGISTERED',
  VARIANT_REQUIRED: 'HOLD_DUAL_VARIANT_REQUIRED',
  VARIANT_INVALID: 'HOLD_DUAL_VARIANT_INVALID',
  VARIANT_CONTRACT_DRIFT: 'HOLD_DUAL_VARIANT_CONTRACT_DRIFT',
  AUTHORITY_DRIFT: 'HOLD_DUAL_AUTHORITY_DRIFT',
  SPLIT_DRIFT: 'HOLD_DUAL_SPLIT_DRIFT',
  ACCEPTED_PARITY_MISSING: 'HOLD_DUAL_ACCEPTED_PARITY_MISSING',
  INVALID_PROVENANCE: 'HOLD_DUAL_INVALID_PROVENANCE',
  OUTPUT_PATH_AUTHORITY: 'HOLD_DUAL_OUTPUT_PATH_AUTHORITY',
  BROWSER_FACTORY_REQUIRED: 'HOLD_DUAL_BROWSER_FACTORY_REQUIRED',
  PAIR_REPLAY_ERROR: 'HOLD_DUAL_PAIR_REPLAY_ERROR',
});

const SRC068_PLUGIN = Object.freeze({
  sourceId: 'SRC068',
  pluginId: 'src068-explicit-a-b-v1',
  variants: Object.freeze(['A', 'B']),
  states: Object.freeze(['INITIAL_HERO', 'ARCHIVE_GRID']),
  viewports: Object.freeze([
    Object.freeze({ width: 1280, height: 800, label: 'DESKTOP' }),
    Object.freeze({ width: 390, height: 844, label: 'MOBILE' }),
  ]),
});

export const DUAL_VARIANT_PLUGIN_REGISTRY = Object.freeze({
  SRC068: SRC068_PLUGIN,
});

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPathWithin(parent, child) {
  const parentPath = path.resolve(parent);
  const childPath = path.resolve(child);
  const relative = path.relative(parentPath, childPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function resolveDualVariantPlugin(sourceId) {
  if (typeof sourceId !== 'string' || !/^SRC\d{3}$/.test(sourceId)) {
    return {
      ok: false,
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.UNKNOWN_SOURCE,
      error: `invalid sourceId: ${String(sourceId)}`,
    };
  }
  const plugin = DUAL_VARIANT_PLUGIN_REGISTRY[sourceId];
  if (!plugin) {
    return {
      ok: false,
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.PLUGIN_NOT_REGISTERED,
      error: `${sourceId} has no explicit DUAL_VARIANT replay plugin`,
    };
  }
  return { ok: true, plugin };
}

function verifyLockedFile(file, expectedBytes, expectedSha256, hold, label) {
  if (!fs.existsSync(file)) {
    return { ok: false, hold, error: `${label} missing: ${file}` };
  }
  const bytes = fs.readFileSync(file);
  if (Number.isInteger(expectedBytes) && bytes.length !== expectedBytes) {
    return {
      ok: false,
      hold,
      error: `${label} byte drift: expected=${expectedBytes} actual=${bytes.length}`,
    };
  }
  const actualSha = sha256(bytes);
  if (actualSha !== expectedSha256) {
    return {
      ok: false,
      hold,
      error: `${label} sha256 drift: expected=${expectedSha256} actual=${actualSha}`,
    };
  }
  return { ok: true, bytes: bytes.length, sha256: actualSha };
}

export function preflightDualVariantReplay({
  sourceRoot,
  sourceId,
  variant,
  exactHead,
  outputRoot,
}) {
  const pluginResult = resolveDualVariantPlugin(sourceId);
  if (!pluginResult.ok) return pluginResult;
  const plugin = pluginResult.plugin;

  if (variant === null || variant === undefined || variant === '') {
    return {
      ok: false,
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.VARIANT_REQUIRED,
      error: `${sourceId} requires an explicit variant; no default is permitted`,
    };
  }
  if (!plugin.variants.includes(variant)) {
    return {
      ok: false,
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.VARIANT_INVALID,
      error: `${sourceId} variant must be one of ${plugin.variants.join(',')}; got ${String(variant)}`,
    };
  }
  if (typeof exactHead !== 'string' || !/^[0-9a-f]{40}$/.test(exactHead)) {
    return {
      ok: false,
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.INVALID_PROVENANCE,
      error: 'exactHead must be a 40-character lowercase hex commit SHA',
    };
  }
  if (typeof sourceRoot !== 'string' || sourceRoot.trim() === '') {
    return {
      ok: false,
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.UNKNOWN_SOURCE,
      error: 'sourceRoot is required',
    };
  }
  if (typeof outputRoot !== 'string' || outputRoot.trim() === '') {
    return {
      ok: false,
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.OUTPUT_PATH_AUTHORITY,
      error: 'outputRoot is required and must be a non-authority temp path',
    };
  }

  const sourceDir = path.join(sourceRoot, sourceId);
  if (isPathWithin(sourceDir, outputRoot)) {
    return {
      ok: false,
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.OUTPUT_PATH_AUTHORITY,
      error: 'candidate output must not be written under the Source authority capsule',
    };
  }

  let manifest;
  let materialization;
  let acceptedParity;
  try {
    manifest = readJson(path.join(sourceDir, 'manifest.json'));
    materialization = readJson(path.join(sourceDir, 'split', 'materialization.json'));
    acceptedParity = readJson(path.join(sourceDir, 'evidence', 'parity', 'accepted-parity.json'));
  } catch (error) {
    return {
      ok: false,
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.ACCEPTED_PARITY_MISSING,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (manifest.source_id !== sourceId || manifest.authority_mode !== 'DUAL_VARIANT') {
    return {
      ok: false,
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.VARIANT_CONTRACT_DRIFT,
      error: `${sourceId} manifest no longer declares the expected DUAL_VARIANT identity`,
    };
  }
  const selector = manifest.variant_selector;
  if (
    selector?.selector !== 'mediaVariant' ||
    JSON.stringify(selector?.allowed_values) !== JSON.stringify(plugin.variants) ||
    selector?.default !== null ||
    selector?.fail_closed !== true
  ) {
    return {
      ok: false,
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.VARIANT_CONTRACT_DRIFT,
      error: `${sourceId} explicit variant selector contract drift`,
    };
  }
  if (
    materialization.source_id !== sourceId ||
    materialization.authority_mode !== 'DUAL_VARIANT' ||
    materialization.status !== 'ACCEPTED' ||
    JSON.stringify(materialization.variant_selector) !== JSON.stringify(selector)
  ) {
    return {
      ok: false,
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.SPLIT_DRIFT,
      error: `${sourceId} accepted split/variant selector contract drift`,
    };
  }
  if (
    acceptedParity.source_id !== sourceId ||
    acceptedParity.authority_mode !== 'DUAL_VARIANT' ||
    acceptedParity.status !== 'ACCEPTED' ||
    acceptedParity.visual_review?.central_direct_review !== true ||
    acceptedParity.dual_variant_results?.A_original_split !== 'PASS' ||
    acceptedParity.dual_variant_results?.B_original_split !== 'PASS' ||
    acceptedParity.dual_variant_results?.a_b_cross_contamination !== 'ZERO'
  ) {
    return {
      ok: false,
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.ACCEPTED_PARITY_MISSING,
      error: `${sourceId} accepted DUAL_VARIANT parity authority is missing or incomplete`,
    };
  }

  const authorityLocks = {};
  for (const key of plugin.variants) {
    const expected = manifest.authority?.variants?.[key];
    if (!isRecord(expected) || typeof expected.sha256 !== 'string') {
      return {
        ok: false,
        hold: DUAL_VARIANT_REPLAY_HOLD_CODES.AUTHORITY_DRIFT,
        error: `${sourceId} authority variant ${key} metadata missing`,
      };
    }
    const verified = verifyLockedFile(
      path.join(sourceDir, 'original', key, 'original.html'),
      expected.bytes,
      expected.sha256,
      DUAL_VARIANT_REPLAY_HOLD_CODES.AUTHORITY_DRIFT,
      `${sourceId} original ${key}`,
    );
    if (!verified.ok) return verified;
    if (
      acceptedParity.authority?.variants?.[key]?.sha256 !== expected.sha256 ||
      materialization.authority?.variants?.[key]?.sha256 !== expected.sha256
    ) {
      return {
        ok: false,
        hold: DUAL_VARIANT_REPLAY_HOLD_CODES.AUTHORITY_DRIFT,
        error: `${sourceId} authority variant ${key} metadata disagrees across accepted records`,
      };
    }
    authorityLocks[key] = verified;
  }

  const splitLocks = {};
  for (const relative of [
    'split/index.html',
    'split/styles.css',
    'split/script.js',
    'split/assets/variant-A.json',
    'split/assets/variant-B.json',
  ]) {
    const expected = materialization.outputs?.[relative];
    if (!isRecord(expected) || typeof expected.sha256 !== 'string') {
      return {
        ok: false,
        hold: DUAL_VARIANT_REPLAY_HOLD_CODES.SPLIT_DRIFT,
        error: `${sourceId} materialization lock missing for ${relative}`,
      };
    }
    const verified = verifyLockedFile(
      path.join(sourceDir, relative),
      expected.bytes,
      expected.sha256,
      DUAL_VARIANT_REPLAY_HOLD_CODES.SPLIT_DRIFT,
      `${sourceId} ${relative}`,
    );
    if (!verified.ok) return verified;
    splitLocks[relative] = verified;
  }

  return {
    ok: true,
    plugin,
    sourceDir,
    manifest,
    materialization,
    acceptedParity,
    identity: Object.freeze({ sourceId, variant }),
    locks: { authority: authorityLocks, split: splitLocks },
  };
}

function metricDifferences(originalMetrics, splitMetrics, epsilon = 1.5) {
  const differences = [];
  const originalKeys = Object.keys(originalMetrics ?? {}).sort();
  const splitKeys = Object.keys(splitMetrics ?? {}).sort();
  if (JSON.stringify(originalKeys) !== JSON.stringify(splitKeys)) {
    differences.push('metrics:id-set');
    return differences;
  }
  for (const key of originalKeys) {
    const left = originalMetrics[key];
    const right = splitMetrics[key];
    for (const field of ['x', 'y', 'width', 'height']) {
      if (Math.abs((left?.rect?.[field] ?? 0) - (right?.rect?.[field] ?? 0)) > epsilon) {
        differences.push(`metrics:${key}.rect.${field}`);
      }
    }
    for (const field of ['display', 'position', 'visibility', 'opacity']) {
      if (left?.[field] !== right?.[field]) differences.push(`metrics:${key}.${field}`);
    }
  }
  return differences;
}

function compareState({ original, split, expectedImages, stateId }) {
  const differences = [];
  const compareJson = (name, left, right) => {
    if (JSON.stringify(left) !== JSON.stringify(right)) differences.push(name);
  };
  compareJson('ids', original.ids, split.ids);
  if (original.elementCount !== split.elementCount) differences.push('elementCount');
  compareJson('buttonIds', original.buttonIds, split.buttonIds);
  if (original.title !== split.title) differences.push('title');
  compareJson('images', original.images, split.images);
  compareJson('imageBasenames', original.imageBasenames, split.imageBasenames);
  compareJson('expectedVariantImages:original', original.imageBasenames, expectedImages);
  compareJson('expectedVariantImages:split', split.imageBasenames, expectedImages);
  compareJson('tags', original.tags, split.tags);
  if (original.cards !== 9 || split.cards !== 9) differences.push('cards');
  if (original.worksRows !== split.worksRows) differences.push('worksRows');
  compareJson(
    'videoSrcs',
    original.videos.map((video) => video.src),
    split.videos.map((video) => video.src),
  );
  differences.push(...metricDifferences(original.metrics, split.metrics));
  return {
    stateId,
    equal: differences.length === 0,
    differences,
  };
}

function successfulImageBasenames(capture) {
  return capture.imageRequests
    .filter((request) => request.status === 200)
    .map((request) => {
      try {
        return decodeURIComponent(request.url.split('/').pop().split('?')[0]);
      } catch {
        return request.url;
      }
    });
}

function compareCapturePair({ variant, viewport, original, split, plugin }) {
  const expectedImages = src68ExpectedImages(variant);
  const states = {};
  const differences = [];
  for (const stateId of plugin.states) {
    const stateComparison = compareState({
      original: original.states[stateId],
      split: split.states[stateId],
      expectedImages,
      stateId,
    });
    states[stateId] = stateComparison;
    for (const diff of stateComparison.differences) differences.push(`${stateId}:${diff}`);

    const originalSha = original.screenshots[`${stateId}_sha256`];
    const splitSha = split.screenshots[`${stateId}_sha256`];
    if (originalSha !== splitSha) differences.push(`${stateId}:screenshot-sha256`);
  }

  if (original.mediaVariant !== undefined) differences.push('capture-shape:original-mediaVariant');
  for (const stateId of plugin.states) {
    if (original.states[stateId].mediaVariant !== null) differences.push(`${stateId}:original-mediaVariant-not-null`);
    if (split.states[stateId].mediaVariant !== variant) differences.push(`${stateId}:split-mediaVariant`);
  }
  if (JSON.stringify(original.interaction) !== JSON.stringify(split.interaction)) differences.push('interaction');
  if (original.interaction?.worksOpen !== true || original.interaction?.worksClosed !== true) differences.push('interaction:original');
  if (split.interaction?.worksOpen !== true || split.interaction?.worksClosed !== true) differences.push('interaction:split');
  if (original.errors.length !== 0) differences.push(`browserErrors:original:${original.errors.length}`);
  if (split.errors.length !== 0) differences.push(`browserErrors:split:${split.errors.length}`);

  const loopbackFailures = [...original.failedRequests, ...split.failedRequests].filter((failure) => failure.includes('127.0.0.1'));
  if (loopbackFailures.length !== 0) differences.push(`loopbackFailures:${loopbackFailures.length}`);

  for (const [side, capture] of [['original', original], ['split', split]]) {
    const successful = successfulImageBasenames(capture);
    for (const expected of expectedImages) {
      if (!successful.includes(expected)) differences.push(`imageRequest:${side}:${expected}`);
    }
  }

  return {
    variant,
    viewport,
    states,
    screenshots: Object.fromEntries(
      plugin.states.map((stateId) => [stateId, {
        originalSha256: original.screenshots[`${stateId}_sha256`],
        splitSha256: split.screenshots[`${stateId}_sha256`],
        equal: original.screenshots[`${stateId}_sha256`] === split.screenshots[`${stateId}_sha256`],
      }]),
    ),
    interactionEqual: JSON.stringify(original.interaction) === JSON.stringify(split.interaction),
    browserErrors: { original: original.errors, split: split.errors },
    loopbackFailures,
    equal: differences.length === 0,
    differences,
  };
}

async function startSrc068Loopback(sourceDir, sourceId) {
  const { files, placeholder } = src68SourceFiles(sourceDir, sourceId);
  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') {
      res.statusCode = 204;
      res.end();
      return;
    }
    let pathname = '/';
    try {
      pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    } catch {
      res.statusCode = 400;
      res.end('bad request');
      return;
    }
    if (src68IsLoopbackImage(pathname)) {
      res.statusCode = 200;
      res.setHeader('content-type', 'image/png');
      res.setHeader('cache-control', 'no-store');
      res.end(placeholder);
      return;
    }
    const entry = files.get(pathname);
    if (!entry) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    const [file, type] = entry;
    if (!fs.existsSync(file)) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('content-type', type);
    res.setHeader('cache-control', 'no-store');
    res.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

export async function replayApprovedDualVariantPair({
  sourceRoot,
  sourceId,
  variant,
  viewport,
  exactHead,
  browserVersion,
  outputRoot,
  browserFactory,
  closeBrowser = false,
}) {
  const preflight = preflightDualVariantReplay({ sourceRoot, sourceId, variant, exactHead, outputRoot });
  if (!preflight.ok) {
    return { ok: false, stage: 'preflight', hold: preflight.hold, error: preflight.error };
  }
  if (typeof browserVersion !== 'string' || browserVersion.trim() === '') {
    return {
      ok: false,
      stage: 'preflight',
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.INVALID_PROVENANCE,
      error: 'browserVersion is required',
    };
  }
  if (typeof browserFactory !== 'function') {
    return {
      ok: false,
      stage: 'preflight',
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.BROWSER_FACTORY_REQUIRED,
      error: 'browserFactory is required',
    };
  }
  const allowedViewport = preflight.plugin.viewports.find(
    (candidate) => candidate.width === viewport?.width && candidate.height === viewport?.height,
  );
  if (!allowedViewport) {
    return {
      ok: false,
      stage: 'preflight',
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.VARIANT_CONTRACT_DRIFT,
      error: `${sourceId} viewport must match an accepted SRC068 replay viewport`,
    };
  }

  fs.mkdirSync(outputRoot, { recursive: true });
  let server = null;
  let browser = null;
  try {
    const loopback = await startSrc068Loopback(preflight.sourceDir, sourceId);
    server = loopback.server;
    browser = await browserFactory();

    const prefix = `${sourceId}-${variant}-${allowedViewport.width}x${allowedViewport.height}`;
    const original = await captureSRC68Variant(
      browser,
      `${loopback.origin}/${sourceId}/original/${variant}/original.html`,
      { width: allowedViewport.width, height: allowedViewport.height },
      outputRoot,
      `${prefix}-original`,
      sourceId,
      { mediaVariant: null },
    );
    const split = await captureSRC68Variant(
      browser,
      `${loopback.origin}/${sourceId}/split/index.html`,
      { width: allowedViewport.width, height: allowedViewport.height },
      outputRoot,
      `${prefix}-split`,
      sourceId,
      { mediaVariant: variant },
    );

    const comparison = compareCapturePair({
      variant,
      viewport: allowedViewport,
      original,
      split,
      plugin: preflight.plugin,
    });

    const candidateRecord = {
      schemaVersion: DUAL_VARIANT_REPLAY_SCHEMA_VERSION,
      harnessVersion: DUAL_VARIANT_REPLAY_HARNESS_VERSION,
      pluginId: preflight.plugin.pluginId,
      identity: { sourceId, variant },
      sourceId,
      variant,
      exactHead,
      browserVersion,
      viewport: allowedViewport,
      states: [...preflight.plugin.states],
      authoritySha256: preflight.manifest.authority.variants[variant].sha256,
      acceptedParityRef: 'evidence/parity/accepted-parity.json',
      comparison,
      result: comparison.equal ? 'EQUAL' : 'DIFF',
      acceptanceClaimed: false,
    };

    return {
      ok: true,
      identity: { sourceId, variant },
      originalRecord: original,
      splitRecord: split,
      comparisonRecord: candidateRecord,
    };
  } catch (error) {
    return {
      ok: false,
      stage: 'replay',
      hold: DUAL_VARIANT_REPLAY_HOLD_CODES.PAIR_REPLAY_ERROR,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (closeBrowser && browser && typeof browser.close === 'function') {
      try {
        await browser.close();
      } catch {
        // best-effort cleanup only
      }
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}
