/**
 * CLEAN-108 M1 Slice 4A (#611): thin real-browser matched-pair replay layer.
 *
 * Reuses the merged building blocks verbatim:
 *   validateExecutableStateRecipe(...)   (#617)
 *   executeStateRecipe(...)              (#617, invoked inside capture)
 *   captureApprovedStateRecipe(...)      (#618)
 *   compareMatchedStateReplay(...)       (#619, evidence channel equality)
 *
 * This module adds the MISSING matched-pair orchestration:
 *   1. fail-closed target identity locks (authority / mechanical split)
 *   2. source-bound runtime hook binding derived from the locked authority
 *   3. loopback-only static serving of ORIGINAL + SPLIT at their real
 *      relative paths (no rewriting, no injection, no repair)
 *   4. EXACT SAME recipe replay on both sides through captureApprovedStateRecipe
 *   5. candidate comparison record envelope mapped from the merged comparator
 *      (EQUAL / DIFF / HOLD / ERROR / NOT_APPLICABLE; no acceptance claim)
 *
 * Security / fidelity invariants:
 *   - every fail-closed gate runs BEFORE a browser context is created
 *   - recipe values are DATA only; every page callback below is fixed
 *     code owned by this module (no eval / new Function / free-form strings)
 *   - no filesystem writes: screenshot buffers stay in memory
 *   - the module never claims CENTRAL_VISUAL_PASS / PRODUCT_FIDELITY_PASS;
 *     it emits a candidate comparison record for CENTRAL review
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { analyzeAuthorityHtml, SOURCE_HOOK_REGISTRY } from '../auto-analyzer/analyze-html.mjs';
import {
  validateExecutableStateRecipe,
  getExecutableHookRoot,
} from './validate-executable-state-recipe.mjs';
import { captureApprovedStateRecipe } from './capture-approved-state-recipe.mjs';
import { compareMatchedStateReplay } from './compare-matched-state-replay.mjs';

export const MATCHED_PAIR_HARNESS_VERSION = 'clean108-m1-slice4a-v1';
export const MATCHED_PAIR_COMPARISON_SCHEMA_VERSION = 'clean108-matched-pair-comparison-v1';

export const MATCHED_PAIR_RESULTS = Object.freeze({
  EQUAL: 'EQUAL',
  DIFF: 'DIFF',
  HOLD: 'HOLD',
  ERROR: 'ERROR',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
});

export const MATCHED_PAIR_HOLD_CODES = Object.freeze({
  UNKNOWN_SOURCE: 'HOLD_UNKNOWN_SOURCE',
  UNBOUND_RUNTIME_HOOK: 'HOLD_UNBOUND_RUNTIME_HOOK',
  RUNTIME_DRIFT: 'HOLD_RUNTIME_DRIFT',
  MATERIALIZATION_NOT_ACCEPTED: 'HOLD_MATERIALIZATION_NOT_ACCEPTED',
  SOURCE_NOT_SINGLE_EXECUTABLE: 'HOLD_SOURCE_NOT_SINGLE_EXECUTABLE',
  RECIPE_SOURCE_MISMATCH: 'HOLD_RECIPE_SOURCE_MISMATCH',
  RECIPE_MISMATCH: 'HOLD_RECIPE_MISMATCH',
  RECIPE_MUTATED_DURING_RUN: 'HOLD_RECIPE_MUTATED_DURING_RUN',
  INVALID_PROVENANCE: 'HOLD_INVALID_PROVENANCE',
  UNSUPPORTED_ACTION: 'HOLD_UNSUPPORTED_ACTION',
  UNSUPPORTED_ASSERTION: 'HOLD_UNSUPPORTED_ASSERTION',
  UNSAFE_RUNTIME_PATH: 'HOLD_UNSAFE_RUNTIME_PATH',
  PROTOTYPE_CHAIN_PATH: 'HOLD_PROTOTYPE_CHAIN_PATH',
  FREE_FORM_JS: 'HOLD_FREE_FORM_JS',
  WRONG_ORIGIN_BASE_URL: 'HOLD_WRONG_ORIGIN_BASE_URL',
  UNSAFE_SCREENSHOT_NAME: 'HOLD_UNSAFE_SCREENSHOT_NAME',
  DUPLICATE_SCREENSHOT_NAME: 'HOLD_DUPLICATE_SCREENSHOT_NAME',
  MISSING_REQUIRED_ENVIRONMENT: 'HOLD_MISSING_REQUIRED_ENVIRONMENT',
  PAIR_REPLAY_ERROR: 'HOLD_PAIR_REPLAY_ERROR',
  INVALID_RECIPE: 'HOLD_INVALID_RECIPE',
});

const ALLOWED_ASSERTION_TYPES = new Set(['runtime', 'visible', 'hidden', 'text']);
const SAFE_SCREENSHOT_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// fail-closed target identity locks
// ---------------------------------------------------------------------------

function hexOf(value, length) {
  return typeof value === 'string' && new RegExp(`^[0-9a-f]{${length}}$`).test(value) ? value : null;
}

/**
 * Lock one replay side (original / split) against the accepted capsule
 * identity. Reads are read-only. Any drift is a fail-closed HOLD.
 *
 * @param {{sourceRoot: string, sourceId: string, side: 'original'|'split'}} args
 */
export function resolveReplayTarget({ sourceRoot, sourceId, side }) {
  if (typeof sourceId !== 'string' || !/^SRC\d{3}$/.test(sourceId)) {
    return { ok: false, hold: MATCHED_PAIR_HOLD_CODES.UNKNOWN_SOURCE, error: `unknown source id: ${sourceId}` };
  }
  if (side !== 'original' && side !== 'split') {
    return { ok: false, hold: MATCHED_PAIR_HOLD_CODES.UNKNOWN_SOURCE, error: `unknown side: ${side}` };
  }

  const sourceDir = path.join(sourceRoot, sourceId);
  const manifestPath = path.join(sourceDir, 'manifest.json');
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return { ok: false, hold: MATCHED_PAIR_HOLD_CODES.UNKNOWN_SOURCE, error: `manifest unreadable: ${manifestPath}` };
  }
  if (manifest.source_id !== sourceId) {
    return { ok: false, hold: MATCHED_PAIR_HOLD_CODES.RUNTIME_DRIFT, error: 'manifest source_id mismatch' };
  }

  const registryEntry = SOURCE_HOOK_REGISTRY[sourceId];
  if (!registryEntry || registryEntry.variant === 'DUAL_VARIANT' || registryEntry.expectedHooks.length === 0) {
    return {
      ok: false,
      hold: MATCHED_PAIR_HOLD_CODES.SOURCE_NOT_SINGLE_EXECUTABLE,
      error: `${sourceId} is not a single-executable generic-replay authority (registry variant/expected absence)`,
    };
  }

  const authoritySha256 = hexOf(manifest.authority?.sha256, 64);
  if (!authoritySha256) {
    return { ok: false, hold: MATCHED_PAIR_HOLD_CODES.RUNTIME_DRIFT, error: 'manifest authority sha256 missing/invalid' };
  }

  const verifyBytes = (file, expectedSha, label) => {
    const fullPath = path.join(sourceDir, file);
    let bytes = null;
    try {
      bytes = fs.readFileSync(fullPath);
    } catch {
      return { ok: false, hold: MATCHED_PAIR_HOLD_CODES.RUNTIME_DRIFT, error: `locked file missing: ${file}` };
    }
    const actual = sha256Hex(bytes);
    if (actual !== expectedSha) {
      return {
        ok: false,
        hold: MATCHED_PAIR_HOLD_CODES.RUNTIME_DRIFT,
        error: `${label} sha256 drift for ${file}: expected ${expectedSha} got ${actual}`,
      };
    }
    return { ok: true, bytes, sha256: actual };
  };

  if (side === 'original') {
    const verified = verifyBytes('original/original.html', authoritySha256, 'ORIGINAL');
    if (!verified.ok) return verified;
    return {
      ok: true,
      target: {
        sourceId,
        side,
        entry: `${sourceId}/original.html`,
        entryFile: 'original/original.html',
        authoritySha256,
        relativeRef: 'original.html',
        lock: [{ file: 'original/original.html', bytes: verified.bytes.length, sha256: verified.sha256 }],
      },
    };
  }

  // split
  const materializationPath = path.join(sourceDir, 'split', 'materialization.json');
  let materialization = null;
  try {
    materialization = JSON.parse(fs.readFileSync(materializationPath, 'utf8'));
  } catch {
    return { ok: false, hold: MATCHED_PAIR_HOLD_CODES.RUNTIME_DRIFT, error: `materialization unreadable: ${materializationPath}` };
  }
  if (materialization.status !== 'ACCEPTED') {
    return {
      ok: false,
      hold: MATCHED_PAIR_HOLD_CODES.MATERIALIZATION_NOT_ACCEPTED,
      error: `split materialization.status=${materialization.status ?? 'UNKNOWN'}`,
    };
  }
  const splitAuthority = hexOf(materialization.authority?.sha256, 64);
  if (!splitAuthority || splitAuthority !== authoritySha256) {
    return {
      ok: false,
      hold: MATCHED_PAIR_HOLD_CODES.RUNTIME_DRIFT,
      error: 'materialization authority sha256 does not match manifest authority',
    };
  }

  const outputs = isRecord(materialization.outputs) ? materialization.outputs : {};
  const required = [
    { file: 'split/index.html', key: 'split/index.html' },
    { file: 'split/styles.css', key: 'split/styles.css' },
    { file: 'split/script.js', key: 'split/script.js' },
  ];
  const lock = [];
  for (const { file, key } of required) {
    const expected = hexOf(outputs[key]?.sha256, 64);
    if (!expected) {
      return { ok: false, hold: MATCHED_PAIR_HOLD_CODES.RUNTIME_DRIFT, error: `materialization missing sha256 for ${key}` };
    }
    const verified = verifyBytes(file, expected, 'SPLIT');
    if (!verified.ok) return verified;
    lock.push({ file, bytes: verified.bytes.length, sha256: verified.sha256 });
  }

  return {
    ok: true,
    target: {
      sourceId,
      side,
      entry: `${sourceId}/split/index.html`,
      entryFile: 'split/index.html',
      assetFiles: [
        { file: 'split/styles.css', entry: `${sourceId}/split/styles.css`, mime: 'text/css; charset=utf-8' },
        { file: 'split/script.js', entry: `${sourceId}/split/script.js`, mime: 'text/javascript; charset=utf-8' },
      ],
      authoritySha256,
      relativeRef: 'index.html',
      lock,
    },
  };
}

/**
 * Derive the source-bound runtime hook binding from the locked ORIGINAL
 * authority, exactly as the merged analyzer computes it. Feed the result to
 * replayApprovedStatePair; the caller must verify status === 'BOUND'.
 */
export function resolveRuntimeHookBinding({ sourceRoot, sourceId }) {
  const htmlPath = path.join(sourceRoot, sourceId, 'original', 'original.html');
  let html = null;
  try {
    html = fs.readFileSync(htmlPath, 'utf8');
  } catch {
    return { ok: false, hold: MATCHED_PAIR_HOLD_CODES.RUNTIME_DRIFT, error: `authority unreadable: ${htmlPath}` };
  }
  const analysis = analyzeAuthorityHtml({ html, sourceId });
  return { ok: true, binding: analysis.runtimeHookBinding, analysis };
}

// ---------------------------------------------------------------------------
// recipe identity
// ---------------------------------------------------------------------------

export function canonicalRecipeDigest(recipe) {
  return sha256Hex(Buffer.from(JSON.stringify(recipe ?? {}), 'utf8'));
}

/**
 * The ORIGINAL and SPLIT recipes must be semantically identical. This thin
 * boundary guard treats any byte-level divergence as fail-closed.
 */
export function assertRecipesIdentical(originalRecipe, splitRecipe) {
  if (canonicalRecipeDigest(originalRecipe) !== canonicalRecipeDigest(splitRecipe)) {
    return {
      ok: false,
      hold: MATCHED_PAIR_HOLD_CODES.RECIPE_MISMATCH,
      error: 'original and split recipes differ; SAME_RECIPE_BOTH_SIDES violated',
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// fail-closed pre-browser gates
// ---------------------------------------------------------------------------

export function assertLoopbackBaseUrl(baseUrl) {
  let parsed = null;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { ok: false, hold: MATCHED_PAIR_HOLD_CODES.WRONG_ORIGIN_BASE_URL, error: `invalid base URL: ${baseUrl}` };
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !LOOPBACK_HOSTS.has(parsed.hostname)) {
    return {
      ok: false,
      hold: MATCHED_PAIR_HOLD_CODES.WRONG_ORIGIN_BASE_URL,
      error: `base URL must be loopback http(s), got protocol=${parsed.protocol} host=${parsed.hostname}`,
    };
  }
  return { ok: true };
}

function expectedRoots(binding) {
  const expected = Array.isArray(binding?.expected) ? binding.expected : [];
  const discovered = Array.isArray(binding?.discovered) ? binding.discovered : [];
  return new Set(expected.filter((hook) => discovered.includes(hook)));
}

function mapExecutableError(message) {
  if (/constructor|prototype|__proto__/i.test(message) || /EXEC_(?:ACTION_)?RUNTIME_PATH_FORBIDDEN/.test(message)) {
    return MATCHED_PAIR_HOLD_CODES.PROTOTYPE_CHAIN_PATH;
  }
  if (/EXEC_UNSAFE_FREEFORM_FUNCTION_REJECTED/.test(message)) {
    return MATCHED_PAIR_HOLD_CODES.FREE_FORM_JS;
  }
  if (/EXEC_ACTION_NOT_SUPPORTED|EXEC_GOTO_|EXEC_BASE_URL_|EXEC_DRAG_|EXEC_SCROLL_|EXEC_SELECTOR_STATE_/.test(message)) {
    return MATCHED_PAIR_HOLD_CODES.UNSUPPORTED_ACTION;
  }
  if (/EXEC_(?:ACTION_)?HOOK_NOT_(?:SOURCE_BOUND|DISCOVERED)|EXEC_RUNTIME_HOOK_NOT_SOURCE_BOUND|EXEC_RUNTIME_HOOK_NOT_DISCOVERED/.test(message)) {
    return MATCHED_PAIR_HOLD_CODES.UNSAFE_RUNTIME_PATH;
  }
  return MATCHED_PAIR_HOLD_CODES.INVALID_RECIPE;
}

/**
 * Every check here runs before a browser context exists (browserFactory is
 * never invoked when this returns ok:false). The merged capture adapter
 * remains the authoritative deep validator inside the page call.
 */
export function preflightPairInputs({ recipe, binding, baseUrl, provenance, environment = {} }) {
  const failures = [];

  // binding must already be source-bound BOUND
  if (!isRecord(binding) || binding.status !== 'BOUND' || binding.matched !== true) {
    failures.push({ hold: MATCHED_PAIR_HOLD_CODES.UNBOUND_RUNTIME_HOOK, code: `binding.status=${binding?.status ?? 'UNKNOWN'}` });
  }
  if (isRecord(recipe) && isRecord(binding) && binding.sourceId && recipe.sourceId !== binding.sourceId) {
    failures.push({ hold: MATCHED_PAIR_HOLD_CODES.UNBOUND_RUNTIME_HOOK, code: 'binding source mismatch' });
  }

  // provenance shape
  const p = isRecord(provenance) ? provenance : {};
  if (typeof p.exactHead !== 'string' || !/^[0-9a-f]{40}$/.test(p.exactHead)) {
    failures.push({ hold: MATCHED_PAIR_HOLD_CODES.INVALID_PROVENANCE, code: 'exactHead must be 40-char hex' });
  }
  if (typeof p.authoritySha256 !== 'string' || !/^[0-9a-f]{64}$/.test(p.authoritySha256)) {
    failures.push({ hold: MATCHED_PAIR_HOLD_CODES.INVALID_PROVENANCE, code: 'authoritySha256 must be 64-char hex' });
  }
  if (typeof p.browserVersion !== 'string' || p.browserVersion.trim() === '') {
    failures.push({ hold: MATCHED_PAIR_HOLD_CODES.INVALID_PROVENANCE, code: 'browserVersion required' });
  }

  // executable validation (merged #617), mapping errors to pair holds
  if (isRecord(recipe)) {
    const executable = validateExecutableStateRecipe(recipe, { runtimeHookBinding: binding ?? null, baseUrl });
    if (!executable.valid) {
      for (const message of executable.errors.slice(0, 16)) {
        failures.push({ hold: mapExecutableError(message), code: message });
      }
    }

    // assertion surface guard (thin; capture re-validates authoritatively)
    const roots = expectedRoots(binding);
    for (const [index, assertion] of (Array.isArray(recipe.assertions) ? recipe.assertions : []).entries()) {
      if (!isRecord(assertion) || !ALLOWED_ASSERTION_TYPES.has(assertion.type)) {
        failures.push({ hold: MATCHED_PAIR_HOLD_CODES.UNSUPPORTED_ASSERTION, code: `assertions[${index}] type=${assertion?.type ?? 'UNKNOWN'}` });
        continue;
      }
      if (assertion.type === 'runtime') {
        const root = getExecutableHookRoot(assertion.path);
        if (!root || !roots.has(root)) {
          failures.push({ hold: MATCHED_PAIR_HOLD_CODES.UNSAFE_RUNTIME_PATH, code: `assertions[${index}] path=${assertion.path}` });
        }
      }
    }

    // screenshot name guard (thin; capture re-validates authoritatively)
    const seen = new Set();
    for (const [index, shot] of (Array.isArray(recipe.screenshots) ? recipe.screenshots : []).entries()) {
      if (!isRecord(shot) || typeof shot.name !== 'string' || !SAFE_SCREENSHOT_NAME.test(shot.name)) {
        failures.push({ hold: MATCHED_PAIR_HOLD_CODES.UNSAFE_SCREENSHOT_NAME, code: `screenshots[${index}] name=${shot?.name ?? 'UNKNOWN'}` });
      } else if (seen.has(shot.name)) {
        failures.push({ hold: MATCHED_PAIR_HOLD_CODES.DUPLICATE_SCREENSHOT_NAME, code: shot.name });
      }
      if (isRecord(shot) && typeof shot.name === 'string') seen.add(shot.name);
    }

    // required environment completeness
    if (recipe.viewport?.deviceScaleFactor !== undefined && typeof environment.deviceScaleFactor !== 'number') {
      failures.push({ hold: MATCHED_PAIR_HOLD_CODES.MISSING_REQUIRED_ENVIRONMENT, code: 'deviceScaleFactor' });
    }
    if (recipe.viewport?.reducedMotion !== undefined && typeof environment.reducedMotion !== 'string') {
      failures.push({ hold: MATCHED_PAIR_HOLD_CODES.MISSING_REQUIRED_ENVIRONMENT, code: 'reducedMotion' });
    }
  }

  if (failures.length > 0) {
    return {
      ok: false,
      hold: failures[0].hold,
      errors: failures.map((failure) => failure.code),
    };
  }
  return { ok: true, errors: [] };
}

// ---------------------------------------------------------------------------
// loopback-only static serving (real relative-path semantics, no rewriting)
// ---------------------------------------------------------------------------

async function serveLockedPair({ sourceDir, original, split }) {
  const files = new Map([
    [`/${original.entry}`, { file: path.join(sourceDir, original.entryFile), mime: 'text/html; charset=utf-8' }],
    [`/${split.entry}`, { file: path.join(sourceDir, split.entryFile), mime: 'text/html; charset=utf-8' }],
  ]);
  for (const asset of split.assetFiles) {
    files.set(`/${asset.entry}`, { file: path.join(sourceDir, asset.file), mime: asset.mime });
  }

  const server = http.createServer((req, res) => {
    let urlPath = '/';
    try {
      urlPath = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    } catch {
      res.statusCode = 400;
      res.end('bad request');
      return;
    }
    if (urlPath === '/favicon.ico') {
      res.statusCode = 204;
      res.end();
      return;
    }
    const spec = files.get(urlPath);
    if (!spec) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('content-type', spec.mime);
    res.setHeader('cache-control', 'no-store');
    res.end(fs.readFileSync(spec.file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

// ---------------------------------------------------------------------------
// comparison record (candidate only — never an acceptance claim)
// ---------------------------------------------------------------------------
//
// The evidence-level channel equality is delegated to the merged comparator
// (#619, compareMatchedStateReplay.mjs). This module only maps its named
// boolean channels into the candidate high-level result envelope the pilot
// reports (§15): EQUAL / DIFF / HOLD / ERROR / NOT_APPLICABLE. Screenshot
// per-shot SHA/bytes detail is pure data assembly from the captured metadata.

function pairResult(equal) {
  return equal ? MATCHED_PAIR_RESULTS.EQUAL : MATCHED_PAIR_RESULTS.DIFF;
}

function screenshotShotDetail(original, split) {
  const left = Array.isArray(original) ? original : [];
  const right = Array.isArray(split) ? split : [];
  const byName = new Map(right.map((shot) => [shot.name, shot]));
  const shots = [];
  for (const shot of left) {
    const other = byName.get(shot.name);
    if (!other) {
      shots.push({
        name: shot.name,
        missingOn: 'split',
        rawSha256Original: shot.rawSha256,
        rawSha256Split: null,
        bytesOriginal: shot.bytes,
        bytesSplit: null,
        equal: false,
      });
      continue;
    }
    shots.push({
      name: shot.name,
      rawSha256Original: shot.rawSha256,
      rawSha256Split: other.rawSha256,
      bytesOriginal: shot.bytes,
      bytesSplit: other.bytes,
      equal: shot.rawSha256 === other.rawSha256 && shot.bytes === other.bytes,
    });
  }
  for (const shot of right) {
    if (!left.some((entry) => entry.name === shot.name)) {
      shots.push({
        name: shot.name,
        missingOn: 'original',
        rawSha256Original: null,
        rawSha256Split: shot.rawSha256,
        bytesOriginal: null,
        bytesSplit: shot.bytes,
        equal: false,
      });
    }
  }
  return shots;
}

function runtimeHealthDetail(original, split) {
  const channels = ['consoleErrors', 'pageErrors', 'failedRequests'];
  const compared = {};
  for (const channel of channels) {
    const originalValue = original?.[channel] ?? [];
    const splitValue = split?.[channel] ?? [];
    compared[channel] = {
      original: originalValue,
      split: splitValue,
      countOriginal: originalValue.length,
      countSplit: splitValue.length,
    };
  }
  return compared;
}

function overallResult(channels) {
  const values = Object.values(channels).map((channel) => channel.result);
  if (values.some((value) => value === MATCHED_PAIR_RESULTS.ERROR)) return MATCHED_PAIR_RESULTS.ERROR;
  if (values.some((value) => value === MATCHED_PAIR_RESULTS.HOLD)) return MATCHED_PAIR_RESULTS.HOLD;
  if (values.some((value) => value === MATCHED_PAIR_RESULTS.DIFF)) return MATCHED_PAIR_RESULTS.DIFF;
  if (values.length > 0 && values.every((value) => value === MATCHED_PAIR_RESULTS.EQUAL)) return MATCHED_PAIR_RESULTS.EQUAL;
  return MATCHED_PAIR_RESULTS.NOT_APPLICABLE;
}

function buildComparisonRecord({ original, split, recipe, provenance }) {
  const compare = compareMatchedStateReplay({
    originalEvidence: original.evidence,
    splitEvidence: split.evidence,
  });
  const c = compare.comparisons;
  const result = (name) => pairResult(c[name] === true);

  const healthClean = c.original_runtime_health_clean === true && c.split_runtime_health_clean === true;
  const channels = {
    assertions: { result: result('assertions_equal') },
    dom: { result: result('dom_equal_excluding_variant_url'), excluded: ['url'] },
    runtimeSnapshot: { result: result('runtime_snapshot_equal') },
    runtimeHealth: {
      result: c.runtime_health_equal === true && healthClean ? MATCHED_PAIR_RESULTS.EQUAL : MATCHED_PAIR_RESULTS.DIFF,
      compared: runtimeHealthDetail(original.evidence.runtimeHealth, split.evidence.runtimeHealth),
      truncatedOriginal: Boolean(original.evidence.runtimeHealth?.truncated),
      truncatedSplit: Boolean(split.evidence.runtimeHealth?.truncated),
    },
    screenshots: {
      result: result('screenshots_equal'),
      shots: screenshotShotDetail(original.evidence.screenshots, split.evidence.screenshots),
    },
    viewport: {
      result: result('viewport_equal'),
      declared: recipe.viewport,
      original: original.evidence.viewport,
      split: split.evidence.viewport,
    },
    execution: { result: result('execution_equal') },
  };
  return {
    schemaVersion: MATCHED_PAIR_COMPARISON_SCHEMA_VERSION,
    harnessVersion: MATCHED_PAIR_HARNESS_VERSION,
    sourceId: recipe.sourceId,
    recipeVersion: recipe.recipeVersion,
    stateId: recipe.stateId,
    viewport: {
      declared: recipe.viewport,
      original: original.evidence.viewport,
      split: split.evidence.viewport,
      equal: channels.viewport.result === MATCHED_PAIR_RESULTS.EQUAL,
    },
    provenance: {
      exactHead: provenance.exactHead,
      authoritySha256: provenance.authoritySha256,
      browserVersion: provenance.browserVersion,
      originalCapturedAt: original.evidence.capturedAt,
      splitCapturedAt: split.evidence.capturedAt,
    },
    channels,
    differences: compare.differences,
    comparatorSchemaVersion: compare.schemaVersion,
    overall: overallResult(channels),
    acceptanceClaimed: false,
  };
}

// ---------------------------------------------------------------------------
// one side: navigate to the locked entry, replay the SAME recipe, capture
// ---------------------------------------------------------------------------

async function replaySide({ side, browser, binding, recipe, baseUrl, environment, provenance, now, target }) {
  const context = await browser.newContext({
    viewport: { width: recipe.viewport.width, height: recipe.viewport.height },
    deviceScaleFactor: recipe.viewport.deviceScaleFactor ?? 1,
    reducedMotion: recipe.viewport.reducedMotion ?? 'no-preference',
  });
  const page = await context.newPage();
  try {
    const response = await page.goto(baseUrl, { waitUntil: 'load', timeout: recipe.timeouts.actionMs });
    if (!response || typeof response.ok !== 'function' || !response.ok()) {
      return { side, captured: false, error: `HTTP ${typeof response?.status === 'function' ? response.status() : 'ERROR'} ${baseUrl}` };
    }
    // Fixed module-owned runtime readiness gate (recipe values are data only).
    await page.waitForFunction(() => Boolean(window.__lt && window.__lovetreeStats), null, { timeout: 15000 });
    const captured = await captureApprovedStateRecipe({
      page,
      recipe,
      runtimeHookBinding: binding,
      baseUrl,
      provenance,
      environment,
      now,
    });
    return {
      side,
      captured: true,
      record: { target, baseUrl, evidence: captured.evidence, screenshotBuffers: captured.screenshotBuffers },
    };
  } catch (error) {
    return { side, captured: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    try {
      await page.close();
    } catch { /* ignore */ }
    try {
      await context.close();
    } catch { /* ignore */ }
  }
}

/**
 * Replay ONE approved recipe against locked ORIGINAL and SPLIT targets in a
 * real browser and emit a candidate comparison record.
 *
 * The browser itself is supplied by the caller (`browserFactory`); the caller
 * owns its lifecycle. `closeBrowser` opts the runner into closing it.
 *
 * @returns {{ok: true, originalRecord, splitRecord, comparisonRecord} |
 *           {ok: false, stage: string, hold: string, error: string, side?: string}}
 */
export async function replayApprovedStatePair({
  sourceRoot,
  sourceId,
  recipe,
  binding,
  provenance,
  environment = {},
  baseOrigin = null,
  browserFactory,
  closeBrowser = false,
  now = () => new Date().toISOString(),
}) {
  // ---- fail-closed gates (no browser context is created past this point) --
  const originalLock = resolveReplayTarget({ sourceRoot, sourceId, side: 'original' });
  if (!originalLock.ok) return { ok: false, stage: 'target-lock:original', hold: originalLock.hold, error: originalLock.error };
  const splitLock = resolveReplayTarget({ sourceRoot, sourceId, side: 'split' });
  if (!splitLock.ok) return { ok: false, stage: 'target-lock:split', hold: splitLock.hold, error: splitLock.error };
  const original = originalLock.target;
  const split = splitLock.target;

  if (!isRecord(recipe) || recipe.sourceId !== sourceId) {
    return { ok: false, stage: 'recipe', hold: MATCHED_PAIR_HOLD_CODES.RECIPE_SOURCE_MISMATCH, error: 'recipe.sourceId does not match sourceId' };
  }
  if (typeof browserFactory !== 'function') {
    return { ok: false, stage: 'browser', hold: MATCHED_PAIR_HOLD_CODES.INVALID_RECIPE, error: 'browserFactory is required' };
  }

  const validationBase = baseOrigin ?? 'http://127.0.0.1';
  const preflight = preflightPairInputs({ recipe, binding, baseUrl: validationBase, provenance, environment });
  if (!preflight.ok) {
    return { ok: false, stage: `preflight:${preflight.hold}`, hold: preflight.hold, error: preflight.errors.join(' | ') };
  }

  const digestBefore = canonicalRecipeDigest(recipe);
  const sourceDir = path.join(sourceRoot, sourceId);

  let server = null;
  let browser = null;
  try {
    server = await serveLockedPair({ sourceDir, original, split });
    const origin = baseOrigin ?? `http://127.0.0.1:${server.address().port}`;
    const originCheck = assertLoopbackBaseUrl(origin);
    if (!originCheck.ok) {
      return { ok: false, stage: 'base-origin', hold: originCheck.hold, error: originCheck.error };
    }

    browser = await browserFactory();
    const originalBaseUrl = `${origin}/${original.entry}`;
    const splitBaseUrl = `${origin}/${split.entry}`;

    const originalResult = await replaySide({
      side: 'original',
      browser,
      binding,
      recipe,
      baseUrl: originalBaseUrl,
      environment,
      provenance,
      now,
      target: original,
    });
    const splitResult = await replaySide({
      side: 'split',
      browser,
      binding,
      recipe,
      baseUrl: splitBaseUrl,
      environment,
      provenance,
      now,
      target: split,
    });

    if (!originalResult.captured || !splitResult.captured) {
      const failed = originalResult.captured ? splitResult : originalResult;
      return { ok: false, stage: `replay:${failed.side}`, hold: MATCHED_PAIR_HOLD_CODES.PAIR_REPLAY_ERROR, error: failed.error, side: failed.side };
    }

    const digestAfter = canonicalRecipeDigest(recipe);
    if (digestAfter !== digestBefore) {
      return {
        ok: false,
        stage: 'recipe-integrity',
        hold: MATCHED_PAIR_HOLD_CODES.RECIPE_MUTATED_DURING_RUN,
        error: 'recipe object mutated during the paired run; SAME_RECIPE_BOTH_SIDES violated',
      };
    }

    const comparisonRecord = buildComparisonRecord({
      original: originalResult.record,
      split: splitResult.record,
      recipe,
      provenance,
    });

    return {
      ok: true,
      originalRecord: originalResult.record,
      splitRecord: splitResult.record,
      comparisonRecord,
    };
  } catch (error) {
    return {
      ok: false,
      stage: 'run',
      hold: MATCHED_PAIR_HOLD_CODES.PAIR_REPLAY_ERROR,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (closeBrowser && browser && typeof browser.close === 'function') {
      try {
        await browser.close();
      } catch { /* ignore */ }
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}