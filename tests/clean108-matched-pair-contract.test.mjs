/**
 * CLEAN-108 M1 Slice 4A (#611): matched-pair boundary contract tests.
 *
 * NO BROWSER IS LAUNCHED in this suite. Every fail-closed case proves the
 * runner rejects BEFORE browserFactory is ever invoked, and the happy path
 * runs against a fake page to prove the paired replay + candidate machine
 * comparison shape without browser-test inventory.
 *
 * The merged lower layers (#617 / #618) are NOT duplicated here; they stay
 * authoritative inside the page call.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { validateExecutableStateRecipe } from '../src/08_harness/state-replay/validate-executable-state-recipe.mjs';
import {
  MATCHED_PAIR_HOLD_CODES,
  SUPPORTED_SOURCE_IDS,
  assertRecipesIdentical,
  canonicalRecipeDigest,
  isSourceReleasedForPilot,
  preflightPairInputs,
  replayApprovedStatePair,
  resolveExactHead,
  resolveReplayTarget,
  resolveRuntimeHookBinding,
} from '../src/08_harness/state-replay/replay-approved-state-pair.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(repoRoot, 'src', '03_sources');
const fixturesPath = path.join(__dirname, 'fixtures', 'clean108-src056-replay-recipes.json');

const BINDING = Object.freeze({
  sourceId: 'SRC056',
  discovered: ['__lt'],
  expected: ['__lt'],
  matched: true,
  status: 'BOUND',
});

function validProvenance(overrides = {}) {
  return {
    exactHead: 'c119b6728fa2ab51113a5d010dddb6a76214977c',
    authoritySha256: '1828ef47acefd25f1f2b7cff0a3f58c74aa35e28bf127f41975491dcc156d909',
    browserVersion: 'FakeChrome/1.0',
    ...overrides,
  };
}

function baseRecipe(overrides = {}) {
  return {
    sourceId: 'SRC056',
    recipeVersion: 'clean108-state-recipe-v1',
    viewport: { width: 1280, height: 800, deviceScaleFactor: 1, reducedMotion: 'reduce' },
    stateId: 'OVERVIEW',
    preconditions: [],
    actions: [
      { type: 'evaluateHook', hook: '__lt.overview', arg: false },
      { type: 'settle', clearToast: '#toast', waitMs: 50, rAF: 2 },
      { type: 'waitForRuntime', path: '__lt.state.mode', equals: 'OVERVIEW', timeoutMs: 8000 },
    ],
    settleCondition: {},
    assertions: [
      { type: 'runtime', path: '__lt.state.mode', equals: 'OVERVIEW' },
      { type: 'visible', selector: '#modePill' },
    ],
    screenshots: [{ name: 'overview', animations: 'disabled', digest: 'raw' }],
    runtimeHook: { name: '__lt', snapshotFields: ['state.mode', 'state.scale', 'state.tx', 'state.ty'] },
    allowedTolerance: { geometryEpsPx: 0, floatDecimals: 3, screenshot: 'EXACT' },
    timeouts: { actionMs: 5000, recipeMs: 30000 },
    ...overrides,
  };
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ---------------------------------------------------------------------------
// fixture capsule builders (self-consistent, byte-pinned, read-mostly)
// ---------------------------------------------------------------------------

function buildCapsule(root, { withHook = true } = {}) {
  const capsuleDir = path.join(root, 'SRC056');
  fs.mkdirSync(path.join(capsuleDir, 'original'), { recursive: true });
  fs.mkdirSync(path.join(capsuleDir, 'split'), { recursive: true });

  const originalBytes = Buffer.from([
    '<!doctype html><html><head><meta charset="utf-8"/></head><body>',
    '<canvas id="stage"></canvas>',
    '<span class="mode-pill" id="modePill">OVERVIEW</span>',
    '<button id="focusFirst"></button><div id="mobileRibbon"></div><div id="toast"></div>',
    '<script>',
    withHook
      ? 'window.__lt = { state: { mode: "OVERVIEW", scale: 1, tx: 0, ty: 0 }, overview: function () {} }; window.__lovetreeStats = {};'
      : 'window.__lovetreeStats = {};',
    '</script>',
    '</body></html>',
  ].join('\n'), 'utf8');

  const authoritySha = sha256(originalBytes);
  fs.writeFileSync(path.join(capsuleDir, 'original', 'original.html'), originalBytes);

  const indexBytes = Buffer.from('<!doctype html><html><head><meta charset="utf-8"/><link rel="stylesheet" href="./styles.css"/></head><body><canvas id="stage"></canvas><script src="./script.js"></script></body></html>', 'utf8');
  const stylesBytes = Buffer.from('body { background: #fff; }', 'utf8');
  const scriptBytes = Buffer.from('var x = 1;', 'utf8');

  fs.writeFileSync(path.join(capsuleDir, 'split', 'index.html'), indexBytes);
  fs.writeFileSync(path.join(capsuleDir, 'split', 'styles.css'), stylesBytes);
  fs.writeFileSync(path.join(capsuleDir, 'split', 'script.js'), scriptBytes);

  fs.writeFileSync(path.join(capsuleDir, 'manifest.json'), JSON.stringify({
    schema_version: '1.1',
    source_id: 'SRC056',
    authority: { bytes: originalBytes.length, sha256: authoritySha },
    baseline_ref: 'baseline/accepted-baseline.json',
    mechanical_split_ref: 'split/materialization.json',
    parity_ref: 'evidence/parity/accepted-parity.json',
    stages: { identity_verified: true, raw_authority_locked: true, baseline_captured: true, mechanical_split_complete: true, source_split_parity_pass: true },
  }, null, 2));

  fs.writeFileSync(path.join(capsuleDir, 'split', 'materialization.json'), JSON.stringify({
    schema_version: '1.0',
    source_id: 'SRC056',
    status: 'ACCEPTED',
    generation: 'MECHANICAL_INLINE_EXTRACTION',
    authority: { bytes: originalBytes.length, sha256: authoritySha },
    outputs: {
      'split/index.html': { bytes: indexBytes.length, sha256: sha256(indexBytes) },
      'split/styles.css': { bytes: stylesBytes.length, sha256: sha256(stylesBytes) },
      'split/script.js': { bytes: scriptBytes.length, sha256: sha256(scriptBytes) },
    },
    contracts: { exact_single_style_extraction: true, exact_single_script_extraction: true, round_trip_byte_identity: true },
    parity_status: 'PASS',
  }, null, 2));

  return { capsuleDir, authoritySha };
}

function withTmpCapsule(run, options) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clean108-pair-contract-'));
  try {
    return run(buildCapsule(tmp, options));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// fake page (drive-through of the paired run without a browser)
// ---------------------------------------------------------------------------

class FakeLocator {
  constructor(page, selector) {
    this.page = page;
    this.selector = selector;
  }

  async click() { this.page.calls.push(['click', this.selector]); }
  async fill() { this.page.calls.push(['fill', this.selector]); }
  async selectOption() { this.page.calls.push(['select', this.selector]); }
  async waitFor() { this.page.calls.push(['waitForSelector', this.selector]); }
  async isVisible() {
    this.page.calls.push(['isVisible', this.selector]);
    return this.page.visibleSelectors.has(this.selector);
  }
  async textContent() {
    this.page.calls.push(['textContent', this.selector]);
    return this.page.textBySelector.get(this.selector) ?? '';
  }
  async evaluate() { this.page.calls.push(['locatorEvaluate', this.selector]); }
}

class FakePage {
  constructor(recipe) {
    this.calls = [];
    this.handlers = new Map();
    this.visibleSelectors = new Set(['#modePill']);
    this.textBySelector = new Map();
    this.runtimeValues = new Map([
      ['__lt.state.mode', 'OVERVIEW'],
      ['__lt.state.scale', 1],
      ['__lt.state.tx', 0],
      ['__lt.state.ty', 0],
    ]);
    this.viewport = { width: recipe.viewport.width, height: recipe.viewport.height };
    this.keyboard = { press: async () => this.calls.push(['press']) };
    this.mouse = {
      wheel: async () => this.calls.push(['wheel']),
      move: async () => this.calls.push(['move']),
      down: async () => this.calls.push(['down']),
      up: async () => this.calls.push(['up']),
    };
  }

  on(event, handler) {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler);
    this.handlers.set(event, set);
  }

  off(event, handler) {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event, payload) {
    for (const handler of this.handlers.get(event) ?? []) handler(payload);
  }

  locator(selector) { return new FakeLocator(this, selector); }

  viewportSize() { return { ...this.viewport }; }

  async setViewportSize(viewport) {
    this.viewport = { ...viewport };
    this.calls.push(['setViewportSize', viewport]);
  }

  async goto(url, options) {
    this.calls.push(['goto', url, options]);
    return { ok: () => true, status: () => 200 };
  }

  async waitForTimeout(ms) { this.calls.push(['waitForTimeout', ms]); }

  async waitForFunction(_fn, arg, options) {
    this.calls.push(['waitForFunction', arg, options]);
  }

  async evaluate(fn, arg) {
    assert.equal(typeof fn, 'function', 'only fixed module-owned callbacks may run');
    if (arg && typeof arg === 'object') {
      if (arg.captureKind === 'clean108-dom-evidence-v1') {
        this.calls.push(['domEvidence']);
        return {
          url: 'http://127.0.0.1:1/SRC056/ORIGINAL_OR_SPLIT',
          title: 'Capsule',
          ids: ['stage', 'modePill', 'focusFirst', 'mobileRibbon', 'toast'],
          elementCount: 9,
          scrollWidth: 1280,
          scrollHeight: 800,
        };
      }
      if (typeof arg.captureKind === 'string' && arg.captureKind.startsWith('clean108-runtime-')) {
        const runtimePath = arg.segments.join('.');
        this.calls.push(['runtimeRead', arg.captureKind, runtimePath]);
        return this.runtimeValues.has(runtimePath)
          ? { found: true, value: this.runtimeValues.get(runtimePath) }
          : { found: false, value: null };
      }
      if (Array.isArray(arg.segments)) {
        this.calls.push(['hookCall', arg.segments.join('.')]);
        return true;
      }
      this.calls.push(['evaluate', arg]);
      return undefined;
    }
    this.calls.push(['evaluate', arg]);
    return undefined;
  }

  async screenshot(options) {
    this.calls.push(['screenshot', options]);
    return Buffer.from('clean108-matched-pair-fake-shot');
  }
}

function fakeBrowser() {
  const contexts = [];
  return {
    contexts,
    async newContext(options) {
      const context = { options, pages: [], async newPage() {
        const page = new FakePage({ viewport: options.viewport });
        this.pages.push(page);
        return page;
      }, async close() {} };
      contexts.push(context);
      return context;
    },
    async close() {},
  };
}

// ---------------------------------------------------------------------------
// target identity locks
// ---------------------------------------------------------------------------

test('resolveReplayTarget rejects unknown source', () => {
  const result = resolveReplayTarget({ sourceRoot, sourceId: 'SRC999', side: 'original' });
  assert.equal(result.ok, false);
  assert.equal(result.hold, MATCHED_PAIR_HOLD_CODES.UNKNOWN_SOURCE);
});

test('resolveReplayTarget rejects SRC068 dual variant as not single-executable', () => {
  const result = resolveReplayTarget({ sourceRoot, sourceId: 'SRC068', side: 'original' });
  assert.equal(result.ok, false);
  assert.equal(result.hold, MATCHED_PAIR_HOLD_CODES.SOURCE_NOT_SINGLE_EXECUTABLE);
});

test('ORIGINAL runtime drift fails closed (tampered authority)', () => {
  withTmpCapsule(({ capsuleDir }) => {
    fs.writeFileSync(path.join(capsuleDir, 'original', 'original.html'), Buffer.from('TAMPERED BYTES', 'utf8'));
    const result = resolveReplayTarget({ sourceRoot: path.dirname(capsuleDir), sourceId: 'SRC056', side: 'original' });
    assert.equal(result.ok, false);
    assert.equal(result.hold, MATCHED_PAIR_HOLD_CODES.RUNTIME_DRIFT);
  });
});

test('SPLIT runtime drift fails closed (tampered split script)', () => {
  withTmpCapsule(({ capsuleDir }) => {
    fs.writeFileSync(path.join(capsuleDir, 'split', 'script.js'), Buffer.from('TAMPERED', 'utf8'));
    const result = resolveReplayTarget({ sourceRoot: path.dirname(capsuleDir), sourceId: 'SRC056', side: 'split' });
    assert.equal(result.ok, false);
    assert.equal(result.hold, MATCHED_PAIR_HOLD_CODES.RUNTIME_DRIFT);
  });
});

test('split materialization not accepted fails closed', () => {
  withTmpCapsule(({ capsuleDir }) => {
    const materialization = JSON.parse(fs.readFileSync(path.join(capsuleDir, 'split', 'materialization.json'), 'utf8'));
    materialization.status = 'PENDING_EXACT_HEAD_CI';
    fs.writeFileSync(path.join(capsuleDir, 'split', 'materialization.json'), JSON.stringify(materialization));
    const result = resolveReplayTarget({ sourceRoot: path.dirname(capsuleDir), sourceId: 'SRC056', side: 'split' });
    assert.equal(result.ok, false);
    assert.equal(result.hold, MATCHED_PAIR_HOLD_CODES.MATERIALIZATION_NOT_ACCEPTED);
  });
});

test('accepted SRC056 capsule locks cleanly against repository evidence', () => {
  const original = resolveReplayTarget({ sourceRoot, sourceId: 'SRC056', side: 'original' });
  assert.equal(original.ok, true, JSON.stringify(original));
  assert.equal(original.target.lock.length, 1);
  assert.equal(original.target.lock[0].file, 'original/original.html');
  assert.equal(original.target.authoritySha256, '1828ef47acefd25f1f2b7cff0a3f58c74aa35e28bf127f41975491dcc156d909');

  const split = resolveReplayTarget({ sourceRoot, sourceId: 'SRC056', side: 'split' });
  assert.equal(split.ok, true, JSON.stringify(split));
  assert.equal(split.target.lock.length, 3);
  assert.deepEqual(split.target.lock.map((entry) => entry.file).sort(), ['split/index.html', 'split/script.js', 'split/styles.css']);

  const binding = resolveRuntimeHookBinding({ sourceRoot, sourceId: 'SRC056' });
  assert.equal(binding.ok, true);
  assert.equal(binding.binding.status, 'BOUND');
});

// ---------------------------------------------------------------------------
// same-recipe invariant
// ---------------------------------------------------------------------------

test('assertRecipesIdentical accepts identical and rejects divergent recipes', () => {
  const recipe = baseRecipe();
  assert.equal(assertRecipesIdentical(recipe, structuredClone(recipe)).ok, true);

  const other = baseRecipe({ actions: [{ type: 'click', selector: '#focusFirst' }] });
  const rejected = assertRecipesIdentical(recipe, other);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.hold, MATCHED_PAIR_HOLD_CODES.RECIPE_MISMATCH);
});

test('canonicalRecipeDigest is stable for the fixture set', () => {
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
  for (const { recipe } of fixtures.recipes) {
    const first = canonicalRecipeDigest(recipe);
    const second = canonicalRecipeDigest(JSON.parse(JSON.stringify(recipe)));
    assert.equal(first, second);
  }
});

// ---------------------------------------------------------------------------
// fail-closed BEFORE browserFactory is invoked
// ---------------------------------------------------------------------------

function browserSpy() {
  let invocations = 0;
  const factory = async () => {
    invocations += 1;
    throw new Error('browserFactory must never be invoked for rejected input');
  };
  return { factory, get invocations() { return invocations; } };
}

async function expectRejectedBeforeBrowser(overrides, expectedHold) {
  const spy = browserSpy();
  const capsule = buildCapsule(fs.mkdtempSync(path.join(os.tmpdir(), 'clean108-pair-reject-')));
  try {
    const result = await replayApprovedStatePair({
      sourceRoot: path.dirname(capsule.capsuleDir),
      sourceId: 'SRC056',
      recipe: baseRecipe(),
      binding: BINDING,
      provenance: validProvenance(),
      environment: { deviceScaleFactor: 1, reducedMotion: 'reduce' },
      browserFactory: spy.factory,
      ...overrides,
    });
    assert.equal(result.ok, false);
    assert.equal(result.hold, expectedHold, `expected ${expectedHold} got ${result.hold} (${result.error})`);
    assert.equal(spy.invocations, 0, `${expectedHold} must be decided before any browser context exists`);
  } finally {
    fs.rmSync(path.dirname(capsule.capsuleDir), { recursive: true, force: true });
  }
}

test('unknown source -> HOLD_UNKNOWN_SOURCE before browser', async () => {
  await expectRejectedBeforeBrowser({ sourceId: 'SRC999' }, MATCHED_PAIR_HOLD_CODES.UNKNOWN_SOURCE);
});

test('SRC068 dual variant -> HOLD_SOURCE_NOT_SINGLE_EXECUTABLE before browser', async () => {
  const spy = browserSpy();
  const result = await replayApprovedStatePair({
    sourceRoot,
    sourceId: 'SRC068',
    recipe: baseRecipe({ sourceId: 'SRC068', runtimeHook: { name: 'mediaVariant' } }),
    binding: { sourceId: 'SRC068', discovered: [], expected: [], matched: false, status: 'NO_EXPECTED_HOOK' },
    provenance: validProvenance(),
    browserFactory: spy.factory,
  });
  assert.equal(result.ok, false);
  assert.equal(result.hold, MATCHED_PAIR_HOLD_CODES.SOURCE_NOT_SINGLE_EXECUTABLE);
  assert.equal(spy.invocations, 0);
});

test('registered but unreleased SRC060 -> HOLD_SOURCE_NOT_RELEASED before browser', async () => {
  // SRC060 is a real registered single-executable Source (accepted capsule,
  // BOUND runtime hook) that is NOT released for the v1 pilot. It must hold
  // with HOLD_SOURCE_NOT_RELEASED before server start / browserFactory /
  // context / page mutation — even though its target locks cleanly.
  const spy = browserSpy();
  const result = await replayApprovedStatePair({
    sourceRoot,
    sourceId: 'SRC060',
    recipe: baseRecipe({ sourceId: 'SRC060' }),
    binding: {
      sourceId: 'SRC060',
      discovered: ['__LT60__', '__LT60_V12__'],
      expected: ['__LT60__', '__LT60_V12__'],
      matched: true,
      status: 'BOUND',
    },
    provenance: validProvenance(),
    browserFactory: spy.factory,
  });
  assert.equal(result.ok, false);
  assert.equal(result.hold, MATCHED_PAIR_HOLD_CODES.SOURCE_NOT_RELEASED);
  assert.equal(result.stage, 'pilot-support-gate');
  assert.equal(spy.invocations, 0);
  assert.deepEqual(SUPPORTED_SOURCE_IDS, ['SRC056']);
  assert.equal(isSourceReleasedForPilot('SRC056'), true);
  assert.equal(isSourceReleasedForPilot('SRC060'), false);
  assert.equal(isSourceReleasedForPilot('SRC068'), false);
});

test('recipe/source mismatch -> HOLD_RECIPE_SOURCE_MISMATCH before browser', async () => {
  await expectRejectedBeforeBrowser(
    { recipe: baseRecipe({ sourceId: 'SRC060' }) },
    MATCHED_PAIR_HOLD_CODES.RECIPE_SOURCE_MISMATCH,
  );
});

test('unbound runtime hook -> HOLD_UNBOUND_RUNTIME_HOOK before browser', async () => {
  await expectRejectedBeforeBrowser(
    { binding: { sourceId: 'SRC056', discovered: [], expected: ['__lt'], matched: false, status: 'EXPECTED_HOOK_MISSING' } },
    MATCHED_PAIR_HOLD_CODES.UNBOUND_RUNTIME_HOOK,
  );
});

test('invalid provenance -> HOLD_INVALID_PROVENANCE before browser', async () => {
  await expectRejectedBeforeBrowser(
    { provenance: validProvenance({ exactHead: 'not-a-sha' }) },
    MATCHED_PAIR_HOLD_CODES.INVALID_PROVENANCE,
  );
});

test('unsupported assertion -> HOLD_UNSUPPORTED_ASSERTION before browser', async () => {
  await expectRejectedBeforeBrowser(
    { recipe: baseRecipe({ assertions: [{ type: 'javascript', fn: 'return true' }] }) },
    MATCHED_PAIR_HOLD_CODES.UNSUPPORTED_ASSERTION,
  );
});

test('foreign runtime assertion path -> HOLD_UNSAFE_RUNTIME_PATH before browser', async () => {
  await expectRejectedBeforeBrowser(
    { recipe: baseRecipe({ assertions: [{ type: 'runtime', path: '__track62.state.mode', equals: 'READY' }] }) },
    MATCHED_PAIR_HOLD_CODES.UNSAFE_RUNTIME_PATH,
  );
});

test('prototype-chain action path -> HOLD_PROTOTYPE_CHAIN_PATH before browser', async () => {
  await expectRejectedBeforeBrowser(
    { recipe: baseRecipe({ actions: [{ type: 'evaluateHook', hook: '__lt.constructor.constructor', arg: 1 }] }) },
    MATCHED_PAIR_HOLD_CODES.PROTOTYPE_CHAIN_PATH,
  );
});

test('free-form waitForFunction -> HOLD_FREE_FORM_JS before browser', async () => {
  await expectRejectedBeforeBrowser(
    { recipe: baseRecipe({ actions: [{ type: 'waitForFunction', fn: 'window.__lt && alert(1)' }] }) },
    MATCHED_PAIR_HOLD_CODES.FREE_FORM_JS,
  );
});

test('wrong origin base URL -> HOLD_WRONG_ORIGIN_BASE_URL before browser', async () => {
  await expectRejectedBeforeBrowser(
    { baseOrigin: 'https://evil.example.com' },
    MATCHED_PAIR_HOLD_CODES.WRONG_ORIGIN_BASE_URL,
  );
});

test('unsafe screenshot name -> HOLD_UNSAFE_SCREENSHOT_NAME before browser', async () => {
  await expectRejectedBeforeBrowser(
    { recipe: baseRecipe({ screenshots: [{ name: '../escape', animations: 'disabled', digest: 'raw' }] }) },
    MATCHED_PAIR_HOLD_CODES.UNSAFE_SCREENSHOT_NAME,
  );
});

test('duplicate screenshot name -> HOLD_DUPLICATE_SCREENSHOT_NAME before browser', async () => {
  await expectRejectedBeforeBrowser(
    {
      recipe: baseRecipe({
        screenshots: [
          { name: 'same', animations: 'disabled', digest: 'raw' },
          { name: 'same', animations: 'disabled', digest: 'raw' },
        ],
      }),
    },
    MATCHED_PAIR_HOLD_CODES.DUPLICATE_SCREENSHOT_NAME,
  );
});

test('missing required environment -> HOLD_MISSING_REQUIRED_ENVIRONMENT before browser', async () => {
  await expectRejectedBeforeBrowser(
    {
      recipe: baseRecipe(),
      environment: { reducedMotion: 'reduce' }, // deviceScaleFactor declared in viewport, omitted here
    },
    MATCHED_PAIR_HOLD_CODES.MISSING_REQUIRED_ENVIRONMENT,
  );
});

// ---------------------------------------------------------------------------
// exact-head provenance rules (CI fail-closed, local git fallback)
// ---------------------------------------------------------------------------

test('resolveExactHead: CI without SRC_EXACT_HEAD fails closed', () => {
  const result = resolveExactHead({ env: { CI: 'true' }, gitRevParse: () => 'c119b6728fa2ab51113a5d010dddb6a76214977c' });
  assert.equal(result.ok, false);
  assert.equal(result.hold, MATCHED_PAIR_HOLD_CODES.INVALID_PROVENANCE);
  assert.match(result.error, /SRC_EXACT_HEAD/);
});

test('resolveExactHead: GITHUB_ACTIONS without SRC_EXACT_HEAD fails closed', () => {
  const result = resolveExactHead({ env: { GITHUB_ACTIONS: 'true' } });
  assert.equal(result.ok, false);
  assert.equal(result.hold, MATCHED_PAIR_HOLD_CODES.INVALID_PROVENANCE);
});

test('resolveExactHead: CI with SRC_EXACT_HEAD uses the env head (never the merge sha)', () => {
  const result = resolveExactHead({
    env: { CI: 'true', SRC_EXACT_HEAD: '6ea0e3577a30c44fefec3ae0bd2788cd8cf1bcec' },
    gitRevParse: () => '0000000000000000000000000000000000000000',
  });
  assert.equal(result.ok, true);
  assert.equal(result.exactHead, '6ea0e3577a30c44fefec3ae0bd2788cd8cf1bcec');
  assert.equal(result.source, 'env');
  assert.equal(result.ci, true);
});

test('resolveExactHead: CI with malformed SRC_EXACT_HEAD fails closed', () => {
  const result = resolveExactHead({ env: { CI: 'true', SRC_EXACT_HEAD: 'short' } });
  assert.equal(result.ok, false);
  assert.equal(result.hold, MATCHED_PAIR_HOLD_CODES.INVALID_PROVENANCE);
});

test('resolveExactHead: local dev keeps the git fallback', () => {
  const result = resolveExactHead({
    env: {},
    gitRevParse: () => 'c119b6728fa2ab51113a5d010dddb6a76214977c',
  });
  assert.equal(result.ok, true);
  assert.equal(result.exactHead, 'c119b6728fa2ab51113a5d010dddb6a76214977c');
  assert.equal(result.source, 'git');
  assert.equal(result.ci, false);
});

test('resolveExactHead: local env head wins over git fallback', () => {
  const result = resolveExactHead({
    env: { SRC_EXACT_HEAD: '6ea0e3577a30c44fefec3ae0bd2788cd8cf1bcec' },
    gitRevParse: () => 'c119b6728fa2ab51113a5d010dddb6a76214977c',
  });
  assert.equal(result.ok, true);
  assert.equal(result.exactHead, '6ea0e3577a30c44fefec3ae0bd2788cd8cf1bcec');
  assert.equal(result.source, 'env');
});

test('resolveExactHead: no env and broken git fallback fails closed', () => {
  const result = resolveExactHead({ env: {}, gitRevParse: () => { throw new Error('not a repo'); } });
  assert.equal(result.ok, false);
  assert.equal(result.hold, MATCHED_PAIR_HOLD_CODES.INVALID_PROVENANCE);
});

// ---------------------------------------------------------------------------
// happy path: same recipe both sides, fake pages, EQUAL machine comparison
// ---------------------------------------------------------------------------

test('matched pair replays the SAME recipe on original and split and emits an EQUAL candidate comparison', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clean108-pair-happy-'));
  try {
    const { capsuleDir } = buildCapsule(tmp);
    const recipe = baseRecipe();
    const digestBefore = canonicalRecipeDigest(recipe);
    const browser = fakeBrowser();

    const result = await replayApprovedStatePair({
      sourceRoot: tmp,
      sourceId: 'SRC056',
      recipe,
      binding: BINDING,
      provenance: validProvenance(),
      environment: { deviceScaleFactor: 1, reducedMotion: 'reduce' },
      browserFactory: async () => browser,
    });

    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.originalRecord.evidence.stateId, 'OVERVIEW');
    assert.equal(result.splitRecord.evidence.stateId, 'OVERVIEW');
    assert.equal(result.originalRecord.evidence.sourceId, 'SRC056');
    assert.equal(result.splitRecord.evidence.sourceId, 'SRC056');
    assert.equal(result.originalRecord.evidence.exactHead, 'c119b6728fa2ab51113a5d010dddb6a76214977c');
    assert.equal(result.splitRecord.evidence.exactHead, 'c119b6728fa2ab51113a5d010dddb6a76214977c');
    assert.ok(result.originalRecord.screenshotBuffers instanceof Map);
    assert.ok(result.splitRecord.screenshotBuffers instanceof Map);
    assert.equal(result.originalRecord.screenshotBuffers.get('overview').toString('utf8'), 'clean108-matched-pair-fake-shot');

    // same-recipe invariant: the object was not mutated by either side
    assert.equal(canonicalRecipeDigest(recipe), digestBefore);

    // candidate comparison record
    const comparison = result.comparisonRecord;
    assert.equal(comparison.acceptanceClaimed, false);
    assert.equal(comparison.sourceId, 'SRC056');
    assert.equal(comparison.stateId, 'OVERVIEW');
    assert.equal(comparison.viewport.equal, true);
    assert.equal(comparison.channels.assertions.result, 'EQUAL');
    assert.equal(comparison.channels.dom.result, 'EQUAL');
    assert.equal(comparison.channels.runtimeSnapshot.result, 'EQUAL');
    assert.equal(comparison.channels.runtimeHealth.result, 'EQUAL');
    assert.equal(comparison.channels.screenshots.result, 'EQUAL');
    assert.equal(comparison.overall, 'EQUAL');
    assert.equal(comparison.channels.screenshots.shots[0].equal, true);

    // browser was created once per side (two fresh contexts), nothing leaked open
    assert.equal(browser.contexts.length, 2);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('fixture recipes are all executable v1 and pass pair preflight', () => {
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
  assert.ok(fixtures.recipes.length >= 6);
  for (const { viewportKey, stateId, recipe } of fixtures.recipes) {
    const executable = validateExecutableStateRecipe(recipe, { runtimeHookBinding: BINDING, baseUrl: 'http://127.0.0.1' });
    assert.equal(executable.valid, true, `${viewportKey}/${stateId}: ${executable.errors.join('|')}`);

    const preflight = preflightPairInputs({
      recipe,
      binding: BINDING,
      baseUrl: 'http://127.0.0.1',
      provenance: validProvenance(),
      environment: { deviceScaleFactor: 1, reducedMotion: 'reduce' },
    });
    assert.equal(preflight.ok, true, `${viewportKey}/${stateId}: ${preflight.errors.join('|')}`);
  }
});

test('new matched-pair module never uses eval or new Function', () => {
  const modulePath = path.join(repoRoot, 'src', '08_harness', 'state-replay', 'replay-approved-state-pair.mjs');
  const source = fs.readFileSync(modulePath, 'utf8');
  assert.ok(!/\beval\s*\(/.test(source), 'must not call eval(');
  assert.ok(!/\bnew\s+Function\s*\(/.test(source), 'must not call new Function(');
});