/**
 * CLEAN-108 M1 Slice 3 (#611): approved state recipe -> S2 capture adapter.
 *
 * This module is deliberately additive and filesystem-free. It layers capture
 * semantics on top of the merged declarative executor without changing the
 * legacy baseline/parity runners. Screenshot bytes are returned in-memory to
 * the caller; this module never writes Source capsules or evidence files.
 *
 * Slice 4B (SRC060) additive evidence fields:
 *   - dom.contentElementCount: rendered-content element count excluding
 *     mechanical-split glue tags (script/link/style in body), matching the
 *     accepted SRC060 parity contract. Raw elementCount is retained.
 *   - screenshots[].canonical16Sha256: recorded when the recipe requests
 *     digest = canonical16 — the exact canonical 16x16 pixel digest already
 *     defined in source060-driver.mjs (backdrop-filter blur is +/-1 channel
 *     nondeterministic, so raw PNG bytes are not the accepted comparison
 *     channel for SRC060). rawSha256 + bytes are always retained.
 */

import crypto from 'node:crypto';
import { executeStateRecipe } from './execute-state-recipe.mjs';
import {
  getExecutableHookRoot,
  validateExecutableStateRecipe,
} from './validate-executable-state-recipe.mjs';

export const S2_RECIPE_EVIDENCE_SCHEMA_VERSION = 'clean108-s2-recipe-evidence-v2';
export const S2_CAPTURE_HARNESS_VERSION = 'clean108-m1-slice3-v2';

const ALLOWED_ASSERTION_TYPES = new Set(['runtime', 'visible', 'hidden', 'text']);
const FORBIDDEN_RUNTIME_SEGMENTS = new Set(['constructor', 'prototype', '__proto__']);
const ACTION_TIMEOUT_TYPES = new Set([
  'goto',
  'click',
  'fill',
  'select',
  'waitForRuntime',
  'waitForSelectorState',
]);
const SAFE_SCREENSHOT_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const MAX_ASSERTIONS = 128;
const MAX_SCREENSHOTS = 32;
const MAX_ASSERTION_TEXT = 8192;
const MAX_RUNTIME_HEALTH_ENTRIES = 200;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertHex(value, length, code) {
  if (typeof value !== 'string' || !new RegExp(`^[0-9a-f]{${length}}$`).test(value)) {
    throw new Error(code);
  }
}

function validateProvenance(provenance) {
  if (!isPlainObject(provenance)) throw new Error('CAPTURE_PROVENANCE_REQUIRED');
  assertHex(provenance.exactHead, 40, 'CAPTURE_EXACT_HEAD_INVALID');
  assertHex(provenance.authoritySha256, 64, 'CAPTURE_AUTHORITY_SHA256_INVALID');
  if (typeof provenance.browserVersion !== 'string' || provenance.browserVersion.trim() === '') {
    throw new Error('CAPTURE_BROWSER_VERSION_REQUIRED');
  }
}

function validateEnvironment(recipe, environment) {
  const env = isPlainObject(environment) ? environment : {};
  const viewport = recipe.viewport;

  if (viewport.deviceScaleFactor !== undefined) {
    if (typeof env.deviceScaleFactor !== 'number') {
      throw new Error('CAPTURE_DEVICE_SCALE_FACTOR_REQUIRED');
    }
    if (!Object.is(env.deviceScaleFactor, viewport.deviceScaleFactor)) {
      throw new Error(`CAPTURE_DEVICE_SCALE_FACTOR_MISMATCH:${viewport.deviceScaleFactor}:${env.deviceScaleFactor}`);
    }
  }

  if (viewport.reducedMotion !== undefined) {
    if (typeof env.reducedMotion !== 'string') {
      throw new Error('CAPTURE_REDUCED_MOTION_REQUIRED');
    }
    if (env.reducedMotion !== viewport.reducedMotion) {
      throw new Error(`CAPTURE_REDUCED_MOTION_MISMATCH:${viewport.reducedMotion}:${env.reducedMotion}`);
    }
  }
}

function validatePreconditionsAndSettle(recipe) {
  if (recipe.preconditions.length > 0) {
    throw new Error('CAPTURE_PRECONDITIONS_UNSUPPORTED_V1');
  }
  if (Object.keys(recipe.settleCondition).length > 0) {
    throw new Error('CAPTURE_SETTLE_CONDITION_UNSUPPORTED_V1');
  }
}

function validateRuntimeField(field) {
  if (typeof field !== 'string' || field.length === 0 || field.length > 256) return false;
  const segments = field.split('.');
  if (segments.length > 16) return false;
  return segments.every(
    (segment) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment) && !FORBIDDEN_RUNTIME_SEGMENTS.has(segment),
  );
}

function executableRoots(runtimeHookBinding) {
  const expected = Array.isArray(runtimeHookBinding?.expected) ? runtimeHookBinding.expected : [];
  const discovered = Array.isArray(runtimeHookBinding?.discovered) ? runtimeHookBinding.discovered : [];
  return new Set(expected.filter((hook) => discovered.includes(hook)));
}

function validateAssertions(recipe, runtimeHookBinding) {
  if (recipe.assertions.length > MAX_ASSERTIONS) {
    throw new Error(`CAPTURE_ASSERTIONS_TOO_MANY:${recipe.assertions.length}`);
  }

  const roots = executableRoots(runtimeHookBinding);
  for (const [index, assertion] of recipe.assertions.entries()) {
    if (!isPlainObject(assertion)) {
      throw new Error(`CAPTURE_ASSERTION_INVALID:assertions[${index}]`);
    }
    if (!ALLOWED_ASSERTION_TYPES.has(assertion.type)) {
      throw new Error(`CAPTURE_ASSERTION_UNSUPPORTED:assertions[${index}]:${assertion.type ?? 'UNKNOWN'}`);
    }

    if (assertion.type === 'runtime') {
      if (typeof assertion.path !== 'string' || assertion.path.length === 0 || assertion.path.length > 256) {
        throw new Error(`CAPTURE_ASSERTION_RUNTIME_PATH_REQUIRED:assertions[${index}]`);
      }
      const root = getExecutableHookRoot(assertion.path);
      if (!root || !roots.has(root)) {
        throw new Error(`CAPTURE_ASSERTION_RUNTIME_NOT_BOUND:assertions[${index}]:${assertion.path}`);
      }
      if (!Object.prototype.hasOwnProperty.call(assertion, 'equals')) {
        throw new Error(`CAPTURE_ASSERTION_RUNTIME_EQUALS_REQUIRED:assertions[${index}]`);
      }
      if (assertion.equals !== null && (typeof assertion.equals === 'object' || typeof assertion.equals === 'function')) {
        throw new Error(`CAPTURE_ASSERTION_RUNTIME_EQUALS_UNSUPPORTED_V1:assertions[${index}]`);
      }
      continue;
    }

    if (typeof assertion.selector !== 'string' || assertion.selector.length === 0 || assertion.selector.length > 512) {
      throw new Error(`CAPTURE_ASSERTION_SELECTOR_REQUIRED:assertions[${index}]`);
    }
    if (assertion.type === 'text') {
      if (typeof assertion.equals !== 'string') {
        throw new Error(`CAPTURE_ASSERTION_TEXT_EQUALS_REQUIRED:assertions[${index}]`);
      }
      if (assertion.equals.length > MAX_ASSERTION_TEXT) {
        throw new Error(`CAPTURE_ASSERTION_TEXT_TOO_LONG:assertions[${index}]`);
      }
    }
  }
}

function validateSnapshotFields(recipe) {
  const fields = recipe.runtimeHook.snapshotFields ?? [];
  if (!Array.isArray(fields)) throw new Error('CAPTURE_RUNTIME_SNAPSHOT_FIELDS_INVALID');
  if (fields.length > 64) throw new Error('CAPTURE_RUNTIME_SNAPSHOT_FIELDS_TOO_MANY');
  for (const field of fields) {
    if (!validateRuntimeField(field)) {
      throw new Error(`CAPTURE_RUNTIME_SNAPSHOT_FIELD_FORBIDDEN:${String(field)}`);
    }
  }
}

function validateScreenshots(recipe) {
  if (recipe.screenshots.length > MAX_SCREENSHOTS) {
    throw new Error(`CAPTURE_SCREENSHOTS_TOO_MANY:${recipe.screenshots.length}`);
  }

  const seen = new Set();
  for (const [index, shot] of recipe.screenshots.entries()) {
    if (!isPlainObject(shot) || typeof shot.name !== 'string' || !SAFE_SCREENSHOT_NAME.test(shot.name)) {
      throw new Error(`CAPTURE_SCREENSHOT_NAME_UNSAFE:screenshots[${index}]`);
    }
    if (seen.has(shot.name)) throw new Error(`CAPTURE_SCREENSHOT_DUPLICATE_NAME:${shot.name}`);
    seen.add(shot.name);
  }
}

function withDefaultActionTimeout(recipe) {
  return {
    ...recipe,
    actions: recipe.actions.map((action) => (
      ACTION_TIMEOUT_TYPES.has(action.type) && action.timeoutMs === undefined
        ? { ...action, timeoutMs: recipe.timeouts.actionMs }
        : { ...action }
    )),
  };
}

function pushHealth(array, value) {
  if (array.length < MAX_RUNTIME_HEALTH_ENTRIES) array.push(value);
}

function attachRuntimeHealth(page) {
  const health = { consoleErrors: [], pageErrors: [], failedRequests: [], truncated: false };
  const handlers = {
    console: (message) => {
      if (typeof message?.type === 'function' && message.type() === 'error') {
        if (health.consoleErrors.length >= MAX_RUNTIME_HEALTH_ENTRIES) health.truncated = true;
        pushHealth(health.consoleErrors, typeof message.text === 'function' ? message.text() : String(message));
      }
    },
    pageerror: (error) => {
      if (health.pageErrors.length >= MAX_RUNTIME_HEALTH_ENTRIES) health.truncated = true;
      pushHealth(health.pageErrors, error instanceof Error ? error.message : String(error));
    },
    requestfailed: (request) => {
      if (health.failedRequests.length >= MAX_RUNTIME_HEALTH_ENTRIES) health.truncated = true;
      const url = typeof request?.url === 'function' ? request.url() : 'UNKNOWN';
      const failure = typeof request?.failure === 'function' ? request.failure() : null;
      pushHealth(health.failedRequests, { url, errorText: failure?.errorText ?? null });
    },
  };

  if (typeof page.on === 'function') {
    page.on('console', handlers.console);
    page.on('pageerror', handlers.pageerror);
    page.on('requestfailed', handlers.requestfailed);
  }

  return {
    health,
    detach() {
      if (typeof page.off === 'function') {
        page.off('console', handlers.console);
        page.off('pageerror', handlers.pageerror);
        page.off('requestfailed', handlers.requestfailed);
      }
    },
  };
}

async function collectDomEvidence(page) {
  return page.evaluate(({ captureKind }) => {
    if (captureKind !== 'clean108-dom-evidence-v1') throw new Error('unexpected capture marker');
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id).slice(0, 10000);
    const root = document.documentElement;
    return {
      url: location.href,
      title: document.title,
      ids,
      // Raw element count (every tag, including mechanical-split glue).
      elementCount: document.querySelectorAll('*').length,
      // Rendered-content count excluding mechanical glue tags exactly as the
      // accepted SRC060 parity contract defines it (original/split differ in
      // glue by design: inline style+2 inline scripts -> link+1 script src).
      contentElementCount: document.querySelectorAll('body *:not(script):not(link):not(style)').length,
      scrollWidth: root?.scrollWidth ?? null,
      scrollHeight: root?.scrollHeight ?? null,
    };
  }, { captureKind: 'clean108-dom-evidence-v1' });
}

async function readRuntimePath(page, path, captureKind) {
  const normalized = path.startsWith('window.') ? path.slice('window.'.length) : path;
  const segments = normalized.split('.');
  return page.evaluate(({ captureKind: marker, segments: names }) => {
    if (!marker.startsWith('clean108-runtime-')) throw new Error('unexpected runtime marker');
    let current = window;
    for (const name of names) {
      if (current == null || !Object.prototype.hasOwnProperty.call(Object(current), name)) {
        return { found: false, value: null };
      }
      current = current[name];
    }
    if (marker === 'clean108-runtime-snapshot-v1') {
      const seen = new WeakSet();
      const sanitize = (value, depth = 0) => {
        if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
        if (typeof value === 'undefined') return { $type: 'undefined' };
        if (typeof value === 'function') return { $type: 'function' };
        if (typeof value !== 'object') return { $type: typeof value };
        if (seen.has(value)) return { $type: 'circular' };
        if (depth >= 4) return { $type: 'depth-limit' };
        seen.add(value);
        if (Array.isArray(value)) return value.slice(0, 50).map((entry) => sanitize(entry, depth + 1));
        const out = {};
        for (const key of Object.keys(value).slice(0, 100)) out[key] = sanitize(value[key], depth + 1);
        return out;
      };
      return { found: true, value: sanitize(current) };
    }
    return { found: true, value: current };
  }, { captureKind, segments });
}

async function runAssertions(page, recipe) {
  const results = [];
  for (const [index, assertion] of recipe.assertions.entries()) {
    if (assertion.type === 'runtime') {
      const observed = await readRuntimePath(page, assertion.path, 'clean108-runtime-assertion-v1');
      const passed = observed.found && Object.is(observed.value, assertion.equals);
      results.push({ index, type: assertion.type, passed, path: assertion.path, observed: observed.value, expected: assertion.equals });
      if (!passed) throw new Error(`CAPTURE_ASSERTION_FAILED:assertions[${index}]:runtime:${assertion.path}`);
      continue;
    }

    const locator = page.locator(assertion.selector);
    if (assertion.type === 'visible' || assertion.type === 'hidden') {
      const visible = await locator.isVisible();
      const passed = assertion.type === 'visible' ? visible : !visible;
      results.push({ index, type: assertion.type, passed, selector: assertion.selector, observedVisible: visible });
      if (!passed) throw new Error(`CAPTURE_ASSERTION_FAILED:assertions[${index}]:${assertion.type}:${assertion.selector}`);
      continue;
    }

    const observed = (await locator.textContent()) ?? '';
    const passed = observed === assertion.equals;
    results.push({ index, type: assertion.type, passed, selector: assertion.selector, observed, expected: assertion.equals });
    if (!passed) throw new Error(`CAPTURE_ASSERTION_FAILED:assertions[${index}]:text:${assertion.selector}`);
  }
  return results;
}

async function captureRuntimeSnapshot(page, recipe) {
  const fields = recipe.runtimeHook.snapshotFields ?? [];
  if (fields.length === 0) return {};
  const root = recipe.runtimeHook.name.startsWith('window.')
    ? recipe.runtimeHook.name.slice('window.'.length)
    : recipe.runtimeHook.name;
  const snapshot = {};
  for (const field of fields) {
    const observed = await readRuntimePath(page, `${root}.${field}`, 'clean108-runtime-snapshot-v1');
    snapshot[field] = observed.found ? observed.value : null;
  }
  return snapshot;
}

// Fixed module-owned canonical pixel digest (data argument only). This is the
// EXACT algorithm of source060-driver.mjs's canonicalPixelDigest: render the
// PNG to a 16x16 canvas with high image smoothing, then SHA256 the RGBA byte
// array with RGB channels masked 0xF0 and alpha unchanged.
async function canonical16PixelDigest(page, pngBuffer) {
  const b64 = pngBuffer.toString('base64');
  const data = await page.evaluate(async ({ captureKind, src }) => {
    if (captureKind !== 'clean108-canonical16-v1') throw new Error('unexpected capture marker');
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
  }, { captureKind: 'clean108-canonical16-v1', src: b64 });
  return crypto.createHash('sha256').update(Buffer.from(data)).digest('hex');
}

async function captureScreenshots(page, recipe) {
  const metadata = [];
  const buffers = new Map();
  for (const shot of recipe.screenshots) {
    const buffer = await page.screenshot({ animations: shot.animations ?? 'disabled' });
    if (!Buffer.isBuffer(buffer)) throw new Error(`CAPTURE_SCREENSHOT_BUFFER_REQUIRED:${shot.name}`);
    buffers.set(shot.name, buffer);
    const digestMode = shot.digest ?? 'raw';
    const entry = {
      name: shot.name,
      digestModeRequested: digestMode,
      rawSha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      bytes: buffer.length,
    };
    if (digestMode === 'canonical16') {
      entry.canonical16Sha256 = await canonical16PixelDigest(page, buffer);
    }
    metadata.push(entry);
  }
  return { metadata, buffers };
}

/**
 * Capture one already-approved S2 state recipe against one page.
 *
 * No filesystem writes occur. The returned screenshotBuffers map is owned by
 * the caller and may later be persisted only by a separately reviewed output
 * layer. Screenshot names are storage-safe tokens so a future persistence
 * layer cannot reinterpret recipe names as paths.
 *
 * recipeMs is recorded as provenance but is not independently raced here:
 * Promise.race cannot cancel an in-flight browser mutation safely. The v1
 * adapter applies actionMs to executor operations that accept a timeout and
 * leaves total recipe cancellation for a separately reviewed cancellable
 * runner boundary.
 */
export async function captureApprovedStateRecipe({
  page,
  recipe,
  runtimeHookBinding,
  baseUrl,
  provenance,
  environment = {},
  now = () => new Date().toISOString(),
}) {
  if (!page || typeof page !== 'object') throw new Error('CAPTURE_PAGE_REQUIRED');
  validateProvenance(provenance);

  const executable = validateExecutableStateRecipe(recipe, { runtimeHookBinding, baseUrl });
  if (!executable.valid) {
    throw new Error(`CAPTURE_RECIPE_REJECTED:${executable.errors.join('|')}`);
  }
  validateEnvironment(recipe, environment);
  validatePreconditionsAndSettle(recipe);
  validateAssertions(recipe, runtimeHookBinding);
  validateSnapshotFields(recipe);
  validateScreenshots(recipe);

  const capturedAt = now();
  if (typeof capturedAt !== 'string' || Number.isNaN(Date.parse(capturedAt))) {
    throw new Error('CAPTURE_TIMESTAMP_INVALID');
  }

  const executionRecipe = withDefaultActionTimeout(recipe);
  const executionValidation = validateExecutableStateRecipe(executionRecipe, { runtimeHookBinding, baseUrl });
  if (!executionValidation.valid) {
    throw new Error(`CAPTURE_EXECUTION_RECIPE_REJECTED:${executionValidation.errors.join('|')}`);
  }

  if (typeof page.setViewportSize === 'function') {
    await page.setViewportSize({ width: recipe.viewport.width, height: recipe.viewport.height });
  }

  const healthCapture = attachRuntimeHealth(page);
  try {
    const execution = await executeStateRecipe({ page, recipe: executionRecipe, runtimeHookBinding, baseUrl });
    const assertions = await runAssertions(page, recipe);
    const dom = await collectDomEvidence(page);
    const runtimeSnapshot = await captureRuntimeSnapshot(page, recipe);
    const screenshots = await captureScreenshots(page, recipe);

    return {
      evidence: {
        schemaVersion: S2_RECIPE_EVIDENCE_SCHEMA_VERSION,
        harnessVersion: S2_CAPTURE_HARNESS_VERSION,
        sourceId: recipe.sourceId,
        recipeVersion: recipe.recipeVersion,
        stateId: recipe.stateId,
        exactHead: provenance.exactHead,
        authoritySha256: provenance.authoritySha256,
        browserVersion: provenance.browserVersion,
        viewport: { ...recipe.viewport },
        timeouts: {
          actionMs: recipe.timeouts.actionMs,
          recipeMs: recipe.timeouts.recipeMs,
          recipeMsEnforced: false,
        },
        capturedAt,
        execution,
        assertions,
        dom,
        runtimeSnapshot,
        runtimeHealth: healthCapture.health,
        screenshots: screenshots.metadata,
      },
      screenshotBuffers: screenshots.buffers,
    };
  } finally {
    healthCapture.detach();
  }
}
