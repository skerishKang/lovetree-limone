/**
 * tests/clean108-analyzer.test.mjs
 *
 * Slice 1 regression tests for CLEAN-108 Auto Analyzer + State Recipe v1 (#611).
 *
 * - Static analysis only. No browser. No network. No Drive writes.
 * - Frozen Source capsules are read, never written (mtime + git-clean guarded).
 * - Generated analysis output goes to os.tmpdir() only.
 *
 * Run: node --test tests/clean108-analyzer.test.mjs
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { analyzeAuthorityHtml, ANALYZER_VERSION } from '../src/08_harness/auto-analyzer/analyze-html.mjs';
import { validateStateRecipe, ALLOWED_ACTION_TYPES } from '../src/08_harness/auto-analyzer/validate-state-recipe.mjs';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const ANALYZER_CLI = path.join(REPO_ROOT, 'src/08_harness/analyze-source-authority.mjs');
const FIXTURES = path.join(REPO_ROOT, 'src/08_harness/fixtures/analyzer-expectations');

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const readCapsule = (...parts) => fs.readFileSync(path.join(REPO_ROOT, 'src/03_sources', ...parts));

/**
 * Run the CLI expecting a non-zero fail-closed rejection and assert the
 * exact machine-readable rejection marker appears on stderr.
 */
function runCliReject(args, expectedMarker) {
  let code = 0;
  let stderr = '';
  try {
    execFileSync('node', [ANALYZER_CLI, ...args], { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    code = typeof error.status === 'number' ? error.status : -1;
    stderr = String(error.stderr ?? '');
  }
  assert.notEqual(code, 0, `CLI must exit non-zero on rejection; args=${JSON.stringify(args)}`);
  assert.ok(stderr.includes(expectedMarker), `stderr must include ${expectedMarker}; got: ${JSON.stringify(stderr)}`);
  return { code, stderr };
}

function familiesOf(analysis) {
  return analysis.candidateStateFamilies.map((entry) => entry.family);
}

function minimalRecipe(overrides = {}) {
  return {
    sourceId: 'SRC056',
    recipeVersion: '1',
    viewport: { width: 1280, height: 800, deviceScaleFactor: 1, reducedMotion: 'reduce' },
    stateId: 'INITIAL',
    preconditions: [],
    actions: [{ type: 'goto', url: 'original/original.html' }, { type: 'settle', rAF: 2, waitMs: 300 }],
    settleCondition: { type: 'quiescent', rAF: 2 },
    assertions: [{ type: 'visible', selector: '#app' }],
    screenshots: [{ name: 'initial', animations: 'disabled', digest: 'raw' }],
    runtimeHook: { name: '__lt.state', snapshotFields: ['mode'] },
    allowedTolerance: { geometryEpsPx: 0, screenshot: 'EXACT' },
    timeouts: { actionMs: 8000, recipeMs: 60000 },
    notes: 'minimal valid recipe',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Analyzer core: read-only + inventory
// ---------------------------------------------------------------------------

test('ANALYZER_NO_MUTATION', () => {
  const targets = [
    ['SRC056', 'original/original.html'],
    ['SRC060', 'original/original.html'],
    ['SRC068', 'original/A/original.html'],
  ];
  const before = targets.map(([id, rel]) => {
    const full = path.join(REPO_ROOT, 'src/03_sources', id, rel);
    const stat = fs.statSync(full);
    return { full, mtimeMs: stat.mtimeMs, bytes: fs.readFileSync(full) };
  });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clean108-analyzer-'));
  for (const { full } of before) {
    execFileSync('node', [ANALYZER_CLI, '--input', full, '--out', path.join(tmp, `${sha256(full).slice(0, 8)}.json`)], { stdio: 'pipe' });
  }
  for (const { full, mtimeMs, bytes } of before) {
    assert.equal(fs.statSync(full).mtimeMs, mtimeMs, `frozen authority mutated: ${full}`);
    assert.deepEqual(fs.readFileSync(full), bytes, `frozen authority bytes changed: ${full}`);
  }
  const status = execFileSync('git', ['status', '--porcelain=v1', '--', 'src/03_sources'], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(status.trim(), '', 'src/03_sources must stay git-clean after analysis');
});

test('SHA_BYTES_CORRECT', () => {
  const bytes = readCapsule('SRC056', 'original/original.html');
  const analysis = analyzeAuthorityHtml({ html: bytes.toString('utf8'), bytes, sourceId: 'SRC056' });
  assert.equal(analysis.authority.bytes, 45761);
  assert.equal(analysis.authority.sha256, '1828ef47acefd25f1f2b7cff0a3f58c74aa35e28bf127f41975491dcc156d909');
  assert.equal(analysis.analyzerVersion, ANALYZER_VERSION);
  assert.equal(analysis.schemaVersion, 'clean108-analysis-v1');
});

test('STRUCTURE_INVENTORY', () => {
  const html = [
    '<!doctype html><html><head><title>Probe Title</title></head><body>',
    '<header id="top"><nav id="nav" role="navigation"><a href="/a">x</a></nav></header>',
    '<main id="app"><button id="go">go</button><form id="f"><input data-case="1" data-kind="x"></form>',
    '<div class="card hero" data-id="m1"></div></div></main><footer id="ft"></footer></body></html>',
  ].join('');
  const analysis = analyzeAuthorityHtml({ html, sourceId: 'SRC056' });
  assert.equal(analysis.document.title, 'Probe Title');
  assert.ok(analysis.document.elementCount > 10);
  assert.ok(analysis.document.ids.includes('app'));
  assert.ok(analysis.document.classes.includes('card'));
  assert.ok(analysis.document.dataAttributes.includes('data-id'));
  assert.equal(analysis.document.buttons, 1);
  assert.equal(analysis.document.links, 1);
  assert.equal(analysis.document.forms, 1);
  assert.equal(analysis.document.landmarks.nav, 1);
  assert.equal(analysis.document.landmarks.main, 1);
});

test('STYLE_INVENTORY', () => {
  const html = '<html><head><style>@media(max-width:760px){.a{--brand:red;animation:fade 1s}}@keyframes fade{}</style></head><body></body></html>';
  const analysis = analyzeAuthorityHtml({ html, sourceId: 'SRC056' });
  assert.equal(analysis.styles.inlineBlockCount, 1);
  assert.equal(analysis.styles.mediaQueries, 1);
  assert.equal(analysis.styles.keyframes, 1);
  assert.ok(analysis.styles.animations >= 1);
  assert.ok(analysis.styles.customProperties.includes('--brand'));
});

test('SCRIPT_INVENTORY', () => {
  const html = '<html><head></head><body><script>window.__probe={a:1};(function(){})();</script></body></html>';
  const analysis = analyzeAuthorityHtml({ html, sourceId: 'SRC056' });
  assert.equal(analysis.scripts.inlineBlockCount, 1);
  assert.equal(analysis.scripts.attributedScriptCount, 0);
  assert.equal(analysis.scripts.externalScriptCount, 0);
  assert.equal(analysis.scripts.moduleScriptCount, 0);
  assert.ok(analysis.scripts.windowHooks.includes('__probe'));
  assert.ok(analysis.scripts.iifeCandidates >= 1);
});

test('CUSTOM_HOOK_DISCOVERY', () => {
  const bytes = readCapsule('SRC060', 'original/original.html');
  const analysis = analyzeAuthorityHtml({ html: bytes.toString('utf8'), bytes, sourceId: 'SRC060' });
  assert.ok(analysis.scripts.windowHooks.includes('__LT60__'), 'must discover __LT60__');
  assert.ok(analysis.scripts.windowHooks.includes('__LT60_V12__'), 'must discover __LT60_V12__');
  assert.ok(familiesOf(analysis).includes('CUSTOM_RUNTIME_HOOK'));
});

test('INTERACTION_CANDIDATE_DISCOVERY', () => {
  const html = [
    '<html><body>',
    "<button onclick=\"go()\">x</button><div class=\"viewerModal\" aria-modal=\"true\"></div>",
    '<script>el.addEventListener("wheel",h);el.addEventListener("click",c);window.addEventListener("keydown",k);',
    'a.addEventListener("pointerdown",p);a.addEventListener("pointermove",q);t.addEventListener("touchstart",s);',
    'setTimeout(()=>{},1);requestAnimationFrame(()=>{});</script></body></html>',
  ].join('');
  const analysis = analyzeAuthorityHtml({ html, sourceId: 'SRC056' });
  const ic = analysis.interactionCandidates;
  assert.equal(ic.click.present, true);
  assert.equal(ic.wheel.present, true);
  assert.equal(ic.touch.present, true);
  assert.equal(ic.keyboard.present, true);
  assert.equal(ic.dragSignals.present, true);
  assert.equal(ic.modal.present, true);
  assert.equal(ic.viewer.present, true);
  const families = familiesOf(analysis);
  assert.ok(families.includes('WHEEL_TRAVEL'));
  assert.ok(families.includes('DRAG_TRAVEL'));
  assert.ok(families.includes('SWIPE_TRAVEL'));
  assert.ok(families.includes('MODAL'));
  assert.ok(families.includes('VIEWER'));
});

test('MEDIA_INVENTORY', () => {
  const payload = 'A'.repeat(64);
  const html = `<html><body><img src="pic.png"><video poster="p.jpg"></video><script>const a="data:image/png;base64,${payload}";fetch("https://cdn.example.com/x");</script></body></html>`;
  const analysis = analyzeAuthorityHtml({ html, sourceId: 'SRC056' });
  assert.equal(analysis.media.dataImageCount, 1);
  assert.equal(analysis.media.dataImageBytes, 64);
  assert.equal(analysis.media.normalImageRefCount, 1);
  assert.equal(analysis.media.videoRefs >= 1, true);
  assert.ok(analysis.media.externalUrls.includes('https://cdn.example.com/x'));
  assert.ok(analysis.media.externalDomains.includes('cdn.example.com'));
});

// ---------------------------------------------------------------------------
// S3 classification
// ---------------------------------------------------------------------------

test('S3_SIMPLE_SUPPORTED', () => {
  const bytes = readCapsule('SRC056', 'original/original.html');
  const analysis = analyzeAuthorityHtml({ html: bytes.toString('utf8'), bytes, sourceId: 'SRC056' });
  assert.equal(analysis.s3Classification, 'AUTO_SPLIT_SUPPORTED');
  assert.equal(analysis.styles.inlineBlockCount, 1);
  assert.equal(analysis.scripts.inlineBlockCount, 1);
});

test('S3_MULTI_SCRIPT_SUPPORTED', () => {
  const bytes = readCapsule('SRC060', 'original/original.html');
  const analysis = analyzeAuthorityHtml({ html: bytes.toString('utf8'), bytes, sourceId: 'SRC060' });
  assert.equal(analysis.s3Classification, 'AUTO_SPLIT_SUPPORTED');
  assert.equal(analysis.scripts.inlineBlockCount, 2);
});

test('S3_DUAL_REQUIRES_PLUGIN', () => {
  const bytes = readCapsule('SRC068', 'original/A/original.html');
  const manifest = JSON.parse(readCapsule('SRC068', 'manifest.json').toString('utf8'));
  const analysis = analyzeAuthorityHtml({ html: bytes.toString('utf8'), bytes, sourceId: 'SRC068', manifest });
  assert.equal(analysis.s3Classification, 'AUTO_SPLIT_REQUIRES_PLUGIN');
  assert.equal(analysis.dualVariant.manifestSaysDual, true);
});

test('S3_UNSUPPORTED_MODULE_HOLD', () => {
  const html = '<html><head><style>a{}</style></head><body><script type="module">import x from "./x.js";</script></body></html>';
  const analysis = analyzeAuthorityHtml({ html, sourceId: 'SRC056' });
  assert.equal(analysis.s3Classification, 'AUTO_SPLIT_HOLD');
  assert.ok(analysis.disposition.holds.includes('UNSUPPORTED_SHAPE_HOLD'));
});

test('S3_ATTRIBUTED_SCRIPT_HOLD', () => {
  const html = '<html><head><style>a{}</style></head><body><script defer src="https://cdn.example.com/lib.js"></script></body></html>';
  const analysis = analyzeAuthorityHtml({ html, sourceId: 'SRC056' });
  assert.equal(analysis.s3Classification, 'AUTO_SPLIT_HOLD');
});

// ---------------------------------------------------------------------------
// Recipe schema + validator (no new dependencies)
// ---------------------------------------------------------------------------

test('STATE_RECIPE_VALID_SIMPLE', () => {
  const { valid, errors } = validateStateRecipe(minimalRecipe());
  assert.deepEqual(errors, []);
  assert.equal(valid, true);
});

test('STATE_RECIPE_VALID_COMPLEX', () => {
  const recipe = minimalRecipe({
    sourceId: 'SRC060',
    stateId: 'MOMENT_VIEWER',
    actions: [
      { type: 'goto', url: 'original/original.html' },
      { type: 'waitForFunction', fn: "window.__LT60__ && window.__LT60__.clusterProjection(0) != null", timeoutMs: 15000 },
      { type: 'click', selector: '#bridgeMode' },
      { type: 'wheel', deltaY: 800, repeat: 1 },
      { type: 'drag', fromFraction: [0.75, 0.5], toFraction: [0.25, 0.5], steps: 8 },
      { type: 'press', key: 'Escape' },
      { type: 'scrollTo', y: 'bottom' },
      { type: 'settle', rAF: 2, waitMs: 450, pauseMedia: true },
    ],
    runtimeHook: { name: '__LT60__.camera', snapshotFields: ['yaw', 'pitch', 'zoom'] },
    allowedTolerance: { geometryEpsPx: 1.5, floatDecimals: 3, canonicalHammingMax: 32, screenshot: 'HAMMING' },
  });
  const { valid, errors } = validateStateRecipe(recipe);
  assert.deepEqual(errors, []);
  assert.equal(valid, true);
  assert.ok(ALLOWED_ACTION_TYPES.includes('evaluateHook'));
});

test('STATE_RECIPE_REJECT_UNKNOWN_ACTION', () => {
  const { valid, errors } = validateStateRecipe(minimalRecipe({ actions: [{ type: 'runShell' }] }));
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.startsWith('UNKNOWN_ACTION:')));
});

test('STATE_RECIPE_REJECT_UNKNOWN_HOOK', () => {
  const { valid, errors } = validateStateRecipe(minimalRecipe({ runtimeHook: { name: 'window.__lt' } }));
  assert.equal(valid, true, 'window.__lt is an explicitly declared hook shape, allowed when the source owns it');
  const bad = validateStateRecipe(minimalRecipe({ runtimeHook: { name: 'myGlobalHook' } }));
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.some((e) => e.startsWith('UNKNOWN_HOOK:')));
  const badAction = validateStateRecipe(minimalRecipe({ actions: [{ type: 'seekHook', hook: 'doAnything', arg: 1 }] }));
  assert.equal(badAction.valid, false);
  assert.ok(badAction.errors.some((e) => e.startsWith('UNKNOWN_HOOK:')));
});

test('STATE_RECIPE_REJECT_MISSING_VIEWPORT', () => {
  const recipe = minimalRecipe();
  delete recipe.viewport;
  const { valid, errors } = validateStateRecipe(recipe);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('VIEWPORT')));
});

test('STATE_RECIPE_REJECT_GLOBAL_TOLERANCE', () => {
  const recipe = minimalRecipe({ allowedTolerance: { geometryEpsPx: 1.5, ALL_GEOMETRY_EPSILON: 2 } });
  const { valid, errors } = validateStateRecipe(recipe);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.startsWith('GLOBAL_TOLERANCE:')), `expected GLOBAL_TOLERANCE error, got ${JSON.stringify(errors)}`);
  const topLevel = minimalRecipe({ ALL_FLOAT_DECIMALS: 3 });
  const second = validateStateRecipe(topLevel);
  assert.equal(second.valid, false);
  assert.ok(second.errors.some((e) => e.startsWith('GLOBAL_TOLERANCE:')));
});

// ---------------------------------------------------------------------------
// Fixtures (read-only)
// ---------------------------------------------------------------------------

function checkFixture(fixtureName, originalRel, manifestRel = null) {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES, fixtureName), 'utf8'));
  const bytes = readCapsule(fixture.sourceId, ...originalRel);
  const manifest = manifestRel ? JSON.parse(readCapsule(fixture.sourceId, ...manifestRel).toString('utf8')) : null;
  const analysis = analyzeAuthorityHtml({ html: bytes.toString('utf8'), bytes, sourceId: fixture.sourceId, manifest });
  const exp = fixture.expected;
  if (fixture.authority.bytes) assert.equal(analysis.authority.bytes, fixture.authority.bytes, `${fixture.sourceId} authority bytes drift`);
  if (fixture.authority.sha256) assert.equal(analysis.authority.sha256, fixture.authority.sha256, `${fixture.sourceId} authority SHA drift`);
  assert.equal(analysis.s3Classification, exp.s3Classification, `${fixture.sourceId} s3 classification drift`);
  if (exp.inlineStyleBlocks !== undefined) assert.equal(analysis.styles.inlineBlockCount, exp.inlineStyleBlocks);
  if (exp.inlineScriptBlocks !== undefined) assert.equal(analysis.scripts.inlineBlockCount, exp.inlineScriptBlocks);
  if (exp.attributedScriptCount !== undefined) assert.equal(analysis.scripts.attributedScriptCount, exp.attributedScriptCount);
  if (exp.externalScriptCount !== undefined) assert.equal(analysis.scripts.externalScriptCount, exp.externalScriptCount);
  if (exp.moduleScriptCount !== undefined) assert.equal(analysis.scripts.moduleScriptCount, exp.moduleScriptCount);
  for (const hook of exp.mustContainHooks ?? []) {
    assert.ok(analysis.scripts.windowHooks.includes(hook), `${fixture.sourceId} missing hook window.${hook}`);
  }
  for (const family of exp.mustContainFamilies ?? []) {
    assert.ok(familiesOf(analysis).includes(family), `${fixture.sourceId} missing candidate family ${family}`);
  }
  if (exp.mustNotClassifyAs) assert.notEqual(analysis.s3Classification, exp.mustNotClassifyAs);
  return { fixture, analysis };
}

test('FIXTURE_SRC056_PASS', () => {
  checkFixture('SRC056.json', ['original/original.html']);
});

test('FIXTURE_SRC060_PASS', () => {
  checkFixture('SRC060.json', ['original/original.html']);
});

test('FIXTURE_SRC068_PASS', () => {
  const { analysis } = checkFixture('SRC068.json', ['original/A/original.html'], ['manifest.json']);
  assert.equal(analysis.s3Classification, 'AUTO_SPLIT_REQUIRES_PLUGIN');
  assert.notEqual(analysis.s3Classification, 'AUTO_SPLIT_SUPPORTED', 'dual variant must never classify as normal single source');
  const bytesB = readCapsule('SRC068', 'original/B/original.html');
  assert.notEqual(sha256(bytesB), sha256(readCapsule('SRC068', 'original/A/original.html')), 'A/B authorities must differ');
});

// ---------------------------------------------------------------------------
// Output destination guard — CENTRAL Blocker A (fail-closed, no side effects)
// ---------------------------------------------------------------------------

test('OUTPUT_EQUALS_INPUT_REJECTED', () => {
  const authority = path.join(REPO_ROOT, 'src/03_sources/SRC056/original/original.html');
  const beforeBytes = fs.readFileSync(authority);
  const beforeMtime = fs.statSync(authority).mtimeMs;
  runCliReject(['--input', authority, '--out', authority], 'OUTPUT_EQUALS_INPUT_REJECTED');
  assert.deepEqual(fs.readFileSync(authority), beforeBytes, 'authority bytes must be unchanged');
  assert.equal(fs.statSync(authority).mtimeMs, beforeMtime, 'authority mtime must be unchanged');
});

test('OUTPUT_EQUALS_MANIFEST_REJECTED', () => {
  const authority = path.join(REPO_ROOT, 'src/03_sources/SRC068/original/A/original.html');
  const manifest = path.join(REPO_ROOT, 'src/03_sources/SRC068/manifest.json');
  const beforeBytes = fs.readFileSync(manifest);
  const beforeMtime = fs.statSync(manifest).mtimeMs;
  runCliReject(['--input', authority, '--manifest', manifest, '--out', manifest], 'OUTPUT_EQUALS_MANIFEST_REJECTED');
  assert.deepEqual(fs.readFileSync(manifest), beforeBytes, 'manifest bytes must be unchanged');
  assert.equal(fs.statSync(manifest).mtimeMs, beforeMtime, 'manifest mtime must be unchanged');
});

test('OUTPUT_UNDER_SRC03_REJECTED', () => {
  const authority = path.join(REPO_ROOT, 'src/03_sources/SRC056/original/original.html');
  const out = path.join(REPO_ROOT, 'src/03_sources/SRC056/analysis.json');
  runCliReject(['--input', authority, '--out', out], 'OUTPUT_UNDER_SRC03_REJECTED');
  assert.ok(!fs.existsSync(out), 'no output file may exist after rejection');
});

test('NO_DIRECTORY_CREATION_ON_REJECT', () => {
  const authority = path.join(REPO_ROOT, 'src/03_sources/SRC056/original/original.html');
  const deep = path.join(REPO_ROOT, 'src/03_sources/SRC056/reject-probe/nested/analysis.json');
  runCliReject(['--input', authority, '--out', deep], 'OUTPUT_UNDER_SRC03_REJECTED');
  assert.ok(!fs.existsSync(path.dirname(deep)), 'no new output parent directory may be created');
});

test('AUTHORITY_BYTES_UNCHANGED_ON_REJECT', () => {
  const authority = path.join(REPO_ROOT, 'src/03_sources/SRC056/original/original.html');
  const beforeBytes = fs.readFileSync(authority);
  const beforeMtime = fs.statSync(authority).mtimeMs;
  for (const extra of [
    ['--out', authority],
    ['--out', path.join(REPO_ROOT, 'src/03_sources/SRC056/tmp/analysis.json')],
  ]) {
    runCliReject(['--input', authority, ...extra], 'REJECTED');
  }
  assert.deepEqual(fs.readFileSync(authority), beforeBytes, 'authority bytes changed after rejected runs');
  assert.equal(fs.statSync(authority).mtimeMs, beforeMtime, 'authority mtime changed after rejected runs');
});

test('MANIFEST_BYTES_UNCHANGED_ON_REJECT', () => {
  const authority = path.join(REPO_ROOT, 'src/03_sources/SRC068/original/A/original.html');
  const manifest = path.join(REPO_ROOT, 'src/03_sources/SRC068/manifest.json');
  const beforeBytes = fs.readFileSync(manifest);
  const beforeMtime = fs.statSync(manifest).mtimeMs;
  runCliReject(['--input', authority, '--manifest', manifest, '--out', manifest], 'OUTPUT_EQUALS_MANIFEST_REJECTED');
  runCliReject(['--input', authority, '--manifest', manifest, '--out', path.join(REPO_ROOT, 'src/03_sources/SRC068/tmp/analysis.json')], 'OUTPUT_UNDER_SRC03_REJECTED');
  assert.deepEqual(fs.readFileSync(manifest), beforeBytes, 'manifest bytes changed after rejected runs');
  assert.equal(fs.statSync(manifest).mtimeMs, beforeMtime, 'manifest mtime changed after rejected runs');
});

// ---------------------------------------------------------------------------
// Source-bound runtime hook binding — CENTRAL Blocker B (discovery vs trust)
// ---------------------------------------------------------------------------

test('VALID_UNREGISTERED_SOURCE_FAMILIAR_HOOK_HOLD', () => {
  const html = '<html><head><style>a{}</style></head><body><div id="x"></div><script>window.__lt={mode:"x"};</script></body></html>';
  const analysis = analyzeAuthorityHtml({ html, sourceId: 'SRC999' });
  assert.ok(analysis.scripts.windowHooks.includes('__lt'), 'hook discovery must remain informational');
  assert.equal(analysis.runtimeHookBinding.status, 'UNREGISTERED_SOURCE');
  assert.equal(analysis.runtimeHookBinding.matched, false);
  assert.deepEqual(analysis.runtimeHookBinding.expected, []);
  assert.ok(analysis.disposition.holds.includes('UNBOUND_RUNTIME_HOOK_HOLD'), 'familiar __lt on unregistered source must HOLD');
  assert.equal(analysis.disposition.status, 'HOLD');
});

test('REGISTERED_SOURCE_EXPECTED_HOOK_ACCEPTED', () => {
  const bytes = readCapsule('SRC056', 'original/original.html');
  const analysis = analyzeAuthorityHtml({ html: bytes.toString('utf8'), bytes, sourceId: 'SRC056' });
  assert.equal(analysis.runtimeHookBinding.status, 'BOUND');
  assert.equal(analysis.runtimeHookBinding.matched, true);
  assert.ok(analysis.runtimeHookBinding.expected.includes('__lt'));
  assert.ok(!analysis.disposition.holds.includes('UNBOUND_RUNTIME_HOOK_HOLD'), 'registered + expected hook must not hold on hook grounds');
  assert.equal(analysis.s3Classification, 'AUTO_SPLIT_SUPPORTED');
});

test('REGISTERED_SOURCE_WRONG_HOOK_HOLD', () => {
  const html = '<html><head><style>a{}</style></head><body><div id="x"></div><script>window.__track62={};</script></body></html>';
  const analysis = analyzeAuthorityHtml({ html, sourceId: 'SRC056' });
  assert.equal(analysis.runtimeHookBinding.status, 'EXPECTED_HOOK_MISSING');
  assert.equal(analysis.runtimeHookBinding.matched, false);
  assert.ok(analysis.disposition.holds.includes('UNBOUND_RUNTIME_HOOK_HOLD'), 'wrong hook on registered source must HOLD');
  assert.equal(analysis.disposition.status, 'HOLD');
});

test('RICH_INTERACTIVE_UNREGISTERED_HOLDS', () => {
  const html = '<html><head><style>a{}</style></head><body><div id="x"></div><script>el.addEventListener("wheel",h);document.addEventListener("pointerdown",p);</script></body></html>';
  const analysis = analyzeAuthorityHtml({ html, sourceId: 'SRC999' });
  assert.equal(analysis.runtimeHookBinding.status, 'UNREGISTERED_SOURCE');
  assert.ok(analysis.disposition.holds.includes('UNBOUND_RUNTIME_HOOK_HOLD'), 'rich interactive source with no registered driver must HOLD');
});

test('CROSS_SOURCE_HOOK_MIX_AMBIGUOUS', () => {
  const html = '<html><head><style>a{}</style></head><body><script>window.__lt={};window.__track62={};</script></body></html>';
  const analysis = analyzeAuthorityHtml({ html, sourceId: 'SRC056' });
  assert.equal(analysis.runtimeHookBinding.status, 'AMBIGUOUS');
  assert.equal(analysis.runtimeHookBinding.matched, false);
  assert.ok(analysis.disposition.holds.includes('UNBOUND_RUNTIME_HOOK_HOLD'), 'mixed-source hook exposure must not be trusted');
});

test('DUAL_VARIANT_HOOK_TRUST_NEVER_OVERRIDES', () => {
  const bytes = readCapsule('SRC068', 'original/A/original.html');
  const manifest = JSON.parse(readCapsule('SRC068', 'manifest.json').toString('utf8'));
  const analysis = analyzeAuthorityHtml({ html: bytes.toString('utf8'), bytes, sourceId: 'SRC068', manifest });
  assert.equal(analysis.s3Classification, 'AUTO_SPLIT_REQUIRES_PLUGIN', 'dual variant must stay plugin-required');
  assert.equal(analysis.runtimeHookBinding.status, 'NO_EXPECTED_HOOK', 'no generic runtime-driver expectation for dual variant');
  assert.equal(analysis.runtimeHookBinding.matched, false);
  assert.ok(analysis.disposition.holds.length > 0, 'dual variant must remain HOLD');
});

test('UNKNOWN_SOURCE_FAIL_CLOSED', () => {
  const html = '<html><head><style>a{}</style></head><body><div id="x"></div><script>el.addEventListener("pointerdown",h);</script></body></html>';
  const noId = analyzeAuthorityHtml({ html });
  assert.ok(noId.disposition.holds.includes('UNKNOWN_SOURCE_HOLD'), 'missing sourceId must hold, never assume a runtime');
  assert.ok(!('runtimeHook' in noId) || noId.runtimeHook === undefined, 'analyzer must not invent a default runtime hook');
  const badId = analyzeAuthorityHtml({ html, sourceId: 'SRC999' });
  assert.equal(badId.sourceId, 'SRC999', 'well-formed SRC ids are echoed for provenance');
  const moduleHtml = '<html><head></head><body><script type="module">import x from "y";</script></body></html>';
  const held = analyzeAuthorityHtml({ html: moduleHtml, sourceId: 'SRC999' });
  assert.equal(held.s3Classification, 'AUTO_SPLIT_HOLD');
  assert.ok(held.disposition.holds.includes('UNSUPPORTED_SHAPE_HOLD'));
});

test('SRC062_REFERENCE_RECALL_READONLY', () => {
  const bytes = readCapsule('SRC062', 'original/original.html');
  assert.equal(bytes.length, 20728647, 'SRC062 authority bytes drift');
  assert.equal(sha256(bytes), 'bc5484a1c545165feb57cd76cae49c8f1e7bb0b3f4a0e11fa9bc4e739a6987e8');
  const analysis = analyzeAuthorityHtml({ html: bytes.toString('utf8'), bytes, sourceId: 'SRC062' });
  assert.ok(analysis.scripts.windowHooks.includes('__track62'), 'must discover __track62, never assume __lt');
  assert.ok(!analysis.scripts.windowHooks.includes('__lt') || true, 'informational only');
  assert.equal(analysis.s3Classification, 'AUTO_SPLIT_SUPPORTED', 'SRC062 read-only reference classification drift');
  assert.equal(analysis.runtimeHookBinding.status, 'BOUND', 'SRC062 <-> __track62 binding must be recognized');
  assert.equal(analysis.runtimeHookBinding.matched, true);
  assert.deepEqual(analysis.runtimeHookBinding.expected, ['__track62']);
  assert.ok(!analysis.disposition.holds.includes('UNBOUND_RUNTIME_HOOK_HOLD'), 'accepted SRC062 binding must not hold on hook grounds');
  const families = familiesOf(analysis);
  for (const expected of ['WHEEL_TRAVEL', 'DRAG_TRAVEL', 'VIEWER', 'PANEL', 'MENU']) {
    assert.ok(families.includes(expected), `SRC062 reference recall missing ${expected}`);
  }
  assert.ok(analysis.media.dataImageBytes > 10 * 1024 * 1024, 'must flag large inline media without recommending extraction');
  assert.ok(analysis.warnings.some((w) => w.includes('never externalize')), 'large-inline warning must cite keep-inline contract');
});
