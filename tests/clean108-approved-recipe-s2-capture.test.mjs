import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  S2_CAPTURE_HARNESS_VERSION,
  S2_RECIPE_EVIDENCE_SCHEMA_VERSION,
  captureApprovedStateRecipe,
} from '../src/08_harness/state-replay/capture-approved-state-recipe.mjs';

const BINDING = Object.freeze({
  sourceId: 'SRC056',
  discovered: ['__lt'],
  expected: ['__lt'],
  matched: true,
  status: 'BOUND',
});

const PROVENANCE = Object.freeze({
  exactHead: 'a'.repeat(40),
  authoritySha256: 'b'.repeat(64),
  browserVersion: 'FakeChrome/1.0',
});

function baseRecipe() {
  return {
    sourceId: 'SRC056',
    recipeVersion: 'clean108-state-recipe-v1',
    viewport: { width: 1280, height: 800 },
    stateId: 'READY',
    preconditions: [],
    actions: [
      { type: 'goto', url: '/SRC056/original.html' },
      { type: 'click', selector: '#open' },
      { type: 'waitForSelectorState', selector: '#panel', state: 'visible' },
    ],
    settleCondition: {},
    assertions: [
      { type: 'visible', selector: '#panel' },
      { type: 'text', selector: '#status', equals: 'Ready' },
      { type: 'runtime', path: '__lt.state.mode', equals: 'READY' },
    ],
    screenshots: [{ name: 'ready', animations: 'disabled', digest: 'raw' }],
    runtimeHook: { name: '__lt', snapshotFields: ['state.mode'] },
    allowedTolerance: { geometryEpsPx: 0, floatDecimals: 3, screenshot: 'EXACT' },
    timeouts: { actionMs: 2000, recipeMs: 10000 },
  };
}

class FakeLocator {
  constructor(page, selector) {
    this.page = page;
    this.selector = selector;
  }

  async click(options) {
    this.page.calls.push(['click', this.selector, options]);
  }

  async fill(value, options) {
    this.page.calls.push(['fill', this.selector, value, options]);
  }

  async selectOption(value, options) {
    this.page.calls.push(['select', this.selector, value, options]);
  }

  async waitFor(options) {
    this.page.calls.push(['waitFor', this.selector, options]);
  }

  async isVisible() {
    this.page.calls.push(['isVisible', this.selector]);
    return this.page.visibleSelectors.has(this.selector);
  }

  async textContent() {
    this.page.calls.push(['textContent', this.selector]);
    return this.page.textBySelector.get(this.selector) ?? '';
  }

  async evaluate() {
    this.page.calls.push(['locatorEvaluate', this.selector]);
  }
}

class FakePage {
  constructor() {
    this.calls = [];
    this.handlers = new Map();
    this.visibleSelectors = new Set(['#panel']);
    this.textBySelector = new Map([['#status', 'Ready']]);
    this.runtimeValues = new Map([
      ['__lt.state.mode', 'READY'],
    ]);
    this.keyboard = {
      press: async (key) => this.calls.push(['press', key]),
    };
    this.mouse = {
      wheel: async (x, y) => this.calls.push(['wheel', x, y]),
      move: async (...args) => this.calls.push(['move', ...args]),
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

  async setViewportSize(viewport) {
    this.calls.push(['setViewportSize', viewport]);
  }

  viewportSize() {
    return { width: 1280, height: 800 };
  }

  async goto(url, options) {
    this.calls.push(['goto', url, options]);
    return {
      ok: () => true,
      status: () => 200,
    };
  }

  locator(selector) {
    return new FakeLocator(this, selector);
  }

  async waitForTimeout(ms) {
    this.calls.push(['waitForTimeout', ms]);
  }

  async waitForFunction(_fn, arg, options) {
    this.calls.push(['waitForFunction', arg, options]);
  }

  async evaluate(_fn, arg) {
    if (arg?.captureKind === 'clean108-dom-evidence-v1') {
      this.calls.push(['domEvidence']);
      return {
        url: 'http://127.0.0.1:8137/SRC056/original.html',
        title: 'Fixture',
        ids: ['open', 'panel', 'status'],
        elementCount: 12,
        scrollWidth: 1280,
        scrollHeight: 800,
      };
    }
    if (arg?.captureKind?.startsWith('clean108-runtime-')) {
      const path = arg.segments.join('.');
      this.calls.push(['runtimeRead', arg.captureKind, path]);
      return this.runtimeValues.has(path)
        ? { found: true, value: this.runtimeValues.get(path) }
        : { found: false, value: null };
    }
    throw new Error(`unexpected fake evaluate payload: ${JSON.stringify(arg)}`);
  }

  async screenshot(options) {
    this.calls.push(['screenshot', options]);
    return Buffer.from('clean108-fixture-shot');
  }
}

function capture(page, recipe = baseRecipe(), overrides = {}) {
  return captureApprovedStateRecipe({
    page,
    recipe,
    runtimeHookBinding: BINDING,
    baseUrl: 'http://127.0.0.1:8137/SRC056/original.html',
    provenance: PROVENANCE,
    now: () => '2026-09-04T13:55:00.000Z',
    ...overrides,
  });
}

test('captures one approved recipe into versioned in-memory S2 evidence', async () => {
  const page = new FakePage();
  const result = await capture(page);

  assert.equal(result.evidence.schemaVersion, S2_RECIPE_EVIDENCE_SCHEMA_VERSION);
  assert.equal(result.evidence.harnessVersion, S2_CAPTURE_HARNESS_VERSION);
  assert.equal(result.evidence.sourceId, 'SRC056');
  assert.equal(result.evidence.stateId, 'READY');
  assert.equal(result.evidence.execution.actionsExecuted, 3);
  assert.equal(result.evidence.assertions.length, 3);
  assert.equal(result.evidence.assertions.every((entry) => entry.passed), true);
  assert.deepEqual(result.evidence.runtimeSnapshot, { 'state.mode': 'READY' });
  assert.equal(result.evidence.runtimeHealth.consoleErrors.length, 0);
  assert.equal(result.evidence.runtimeHealth.truncated, false);
  assert.deepEqual(result.evidence.timeouts, {
    actionMs: 2000,
    recipeMs: 10000,
    recipeMsEnforced: false,
  });
  assert.equal(result.evidence.screenshots.length, 1);
  assert.equal(result.evidence.screenshots[0].bytes, Buffer.byteLength('clean108-fixture-shot'));
  assert.equal(
    result.evidence.screenshots[0].rawSha256,
    crypto.createHash('sha256').update(Buffer.from('clean108-fixture-shot')).digest('hex'),
  );
  assert.equal(result.screenshotBuffers.get('ready').toString('utf8'), 'clean108-fixture-shot');
  assert.deepEqual(page.calls[0], ['setViewportSize', { width: 1280, height: 800 }]);

  const gotoCall = page.calls.find((entry) => entry[0] === 'goto');
  const clickCall = page.calls.find((entry) => entry[0] === 'click');
  const waitCall = page.calls.find((entry) => entry[0] === 'waitFor');
  assert.equal(gotoCall[2].timeout, 2000);
  assert.equal(clickCall[2].timeout, 2000);
  assert.equal(waitCall[2].timeout, 2000);
});

test('explicit per-action timeout overrides recipe actionMs', async () => {
  const page = new FakePage();
  const recipe = baseRecipe();
  recipe.actions[1].timeoutMs = 777;
  await capture(page, recipe);
  const clickCall = page.calls.find((entry) => entry[0] === 'click');
  assert.equal(clickCall[2].timeout, 777);
});

test('captures runtime health without converting it into silent acceptance', async () => {
  const page = new FakePage();
  const originalClick = FakeLocator.prototype.click;
  FakeLocator.prototype.click = async function clickWithError(options) {
    await originalClick.call(this, options);
    this.page.emit('console', { type: () => 'error', text: () => 'fixture console error' });
  };
  try {
    const result = await capture(page);
    assert.deepEqual(result.evidence.runtimeHealth.consoleErrors, ['fixture console error']);
  } finally {
    FakeLocator.prototype.click = originalClick;
  }
});

test('rejects unsupported assertion before viewport or action mutation', async () => {
  const page = new FakePage();
  const recipe = baseRecipe();
  recipe.assertions = [{ type: 'javascript', fn: 'return true' }];

  await assert.rejects(capture(page, recipe), /CAPTURE_ASSERTION_UNSUPPORTED/);
  assert.deepEqual(page.calls, []);
});

test('rejects unsupported preconditions and settle conditions before mutation', async () => {
  for (const mutate of [
    (recipe) => { recipe.preconditions = [{ storage: 'clean' }]; },
    (recipe) => { recipe.settleCondition = { rAF: 2 }; },
  ]) {
    const page = new FakePage();
    const recipe = baseRecipe();
    mutate(recipe);
    await assert.rejects(capture(page, recipe), /CAPTURE_(PRECONDITIONS|SETTLE_CONDITION)_UNSUPPORTED_V1/);
    assert.deepEqual(page.calls, []);
  }
});

test('rejects foreign and prototype-chain runtime assertions before mutation', async () => {
  for (const path of ['__track62.state.mode', '__lt.constructor.constructor']) {
    const page = new FakePage();
    const recipe = baseRecipe();
    recipe.assertions = [{ type: 'runtime', path, equals: 'READY' }];
    await assert.rejects(capture(page, recipe), /CAPTURE_ASSERTION_RUNTIME_NOT_BOUND/);
    assert.deepEqual(page.calls, []);
  }
});

test('rejects object-valued runtime equality before mutation', async () => {
  const page = new FakePage();
  const recipe = baseRecipe();
  recipe.assertions = [{ type: 'runtime', path: '__lt.state.mode', equals: { mode: 'READY' } }];
  await assert.rejects(capture(page, recipe), /CAPTURE_ASSERTION_RUNTIME_EQUALS_UNSUPPORTED_V1/);
  assert.deepEqual(page.calls, []);
});

test('requires declared device scale and reduced-motion environment to match', async () => {
  const page = new FakePage();
  const recipe = baseRecipe();
  recipe.viewport.deviceScaleFactor = 2;
  recipe.viewport.reducedMotion = 'reduce';

  await assert.rejects(
    capture(page, recipe, { environment: { deviceScaleFactor: 1, reducedMotion: 'reduce' } }),
    /CAPTURE_DEVICE_SCALE_FACTOR_MISMATCH/,
  );
  assert.deepEqual(page.calls, []);
});

test('rejects unsafe and duplicate screenshot names before mutation', async () => {
  for (const name of ['../escape', '.', '..', 'a/b', 'a\\b']) {
    const page = new FakePage();
    const recipe = baseRecipe();
    recipe.screenshots = [{ name, digest: 'raw' }];
    await assert.rejects(capture(page, recipe), /CAPTURE_SCREENSHOT_NAME_UNSAFE/);
    assert.deepEqual(page.calls, []);
  }

  const page = new FakePage();
  const recipe = baseRecipe();
  recipe.screenshots = [
    { name: 'same', digest: 'raw' },
    { name: 'same', digest: 'raw' },
  ];
  await assert.rejects(capture(page, recipe), /CAPTURE_SCREENSHOT_DUPLICATE_NAME:same/);
  assert.deepEqual(page.calls, []);
});

test('rejects excessive assertion and screenshot counts before mutation', async () => {
  {
    const page = new FakePage();
    const recipe = baseRecipe();
    recipe.assertions = Array.from({ length: 129 }, () => ({ type: 'visible', selector: '#panel' }));
    await assert.rejects(capture(page, recipe), /CAPTURE_ASSERTIONS_TOO_MANY:129/);
    assert.deepEqual(page.calls, []);
  }

  {
    const page = new FakePage();
    const recipe = baseRecipe();
    recipe.screenshots = Array.from({ length: 33 }, (_, index) => ({ name: `shot-${index}`, digest: 'raw' }));
    await assert.rejects(capture(page, recipe), /CAPTURE_SCREENSHOTS_TOO_MANY:33/);
    assert.deepEqual(page.calls, []);
  }
});

test('fails closed when an approved assertion is not reached', async () => {
  const page = new FakePage();
  page.visibleSelectors.delete('#panel');

  await assert.rejects(capture(page), /CAPTURE_ASSERTION_FAILED:assertions\[0\]:visible:#panel/);
  assert.equal(page.calls.some((entry) => entry[0] === 'screenshot'), false);
});
