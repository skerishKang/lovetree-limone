import assert from 'node:assert/strict';
import test from 'node:test';

import { validateStateRecipe } from '../src/08_harness/auto-analyzer/validate-state-recipe.mjs';
import { validateExecutableStateRecipe } from '../src/08_harness/state-replay/validate-executable-state-recipe.mjs';
import { executeStateRecipe } from '../src/08_harness/state-replay/execute-state-recipe.mjs';

function binding(overrides = {}) {
  return {
    sourceId: 'SRC056',
    discovered: ['__lt'],
    expected: ['__lt'],
    matched: true,
    status: 'BOUND',
    ...overrides,
  };
}

function recipe(overrides = {}) {
  return {
    sourceId: 'SRC056',
    recipeVersion: '1',
    viewport: { width: 1280, height: 800, deviceScaleFactor: 1, reducedMotion: 'reduce' },
    stateId: 'INITIAL',
    preconditions: [],
    actions: [
      { type: 'goto', url: '/SRC056/original.html' },
      { type: 'settle', waitMs: 10 },
    ],
    settleCondition: { type: 'quiescent' },
    assertions: [],
    screenshots: [{ name: 'initial', digest: 'raw' }],
    runtimeHook: { name: '__lt.state', snapshotFields: ['mode'] },
    allowedTolerance: { geometryEpsPx: 0, screenshot: 'EXACT' },
    timeouts: { actionMs: 8000, recipeMs: 60000 },
    ...overrides,
  };
}

const baseUrl = 'http://127.0.0.1:8137/SRC056/original.html';

test('EXECUTABLE_RECIPE_ACCEPTS_BOUND_DECLARATIVE_RECIPE', () => {
  const result = validateExecutableStateRecipe(recipe(), { runtimeHookBinding: binding(), baseUrl });
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(result.errors, []);
});

test('EXECUTABLE_RECIPE_REJECTS_FREEFORM_WAIT_FOR_FUNCTION', () => {
  const candidate = recipe({
    actions: [
      { type: 'waitForFunction', fn: 'window.__LT60__ && window.__LT60__.clusterProjection(0) != null', timeoutMs: 5000 },
    ],
  });
  const syntax = validateStateRecipe(candidate);
  assert.equal(syntax.valid, true, 'legacy syntax layer still accepts waitForFunction; executable layer must narrow it');

  const result = validateExecutableStateRecipe(candidate, { runtimeHookBinding: binding(), baseUrl });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith('EXEC_UNSAFE_FREEFORM_FUNCTION_REJECTED:')));
});

test('EXECUTABLE_RECIPE_REJECTS_SOURCE_BINDING_MISMATCH', () => {
  const result = validateExecutableStateRecipe(recipe(), {
    runtimeHookBinding: binding({ sourceId: 'SRC060', expected: ['__LT60__'], discovered: ['__LT60__'] }),
    baseUrl,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith('EXEC_SOURCE_BINDING_MISMATCH:')));
});

test('EXECUTABLE_RECIPE_REJECTS_UNBOUND_RUNTIME', () => {
  const result = validateExecutableStateRecipe(recipe(), {
    runtimeHookBinding: binding({ matched: false, status: 'EXPECTED_HOOK_MISSING' }),
    baseUrl,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('EXEC_RUNTIME_BINDING_NOT_BOUND:EXPECTED_HOOK_MISSING'));
});

test('EXECUTABLE_RECIPE_REJECTS_DUAL_VARIANT_GENERIC_EXECUTION', () => {
  const candidate = recipe({
    sourceId: 'SRC068',
    runtimeHook: { name: 'mediaVariant' },
  });
  const result = validateExecutableStateRecipe(candidate, {
    runtimeHookBinding: {
      sourceId: 'SRC068',
      discovered: [],
      expected: [],
      matched: false,
      status: 'NO_EXPECTED_HOOK',
    },
    baseUrl: 'http://127.0.0.1:8137/SRC068/original.html',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith('EXEC_RUNTIME_BINDING_NOT_BOUND:')));
});

test('EXECUTABLE_RECIPE_REJECTS_CROSS_SOURCE_ACTION_HOOK', () => {
  const candidate = recipe({
    actions: [{ type: 'seekHook', hook: '__track62.seek', arg: 2 }],
  });
  const result = validateExecutableStateRecipe(candidate, { runtimeHookBinding: binding(), baseUrl });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('EXEC_ACTION_HOOK_NOT_SOURCE_BOUND')));
});

test('EXECUTABLE_RECIPE_REJECTS_CROSS_ORIGIN_GOTO', () => {
  const candidate = recipe({ actions: [{ type: 'goto', url: 'https://example.com/escape' }] });
  const result = validateExecutableStateRecipe(candidate, { runtimeHookBinding: binding(), baseUrl });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith('EXEC_GOTO_CROSS_ORIGIN_REJECTED:')));
});

test('EXECUTABLE_RECIPE_REJECTS_INVALID_DRAG_FRACTIONS', () => {
  const candidate = recipe({
    actions: [{ type: 'drag', fromFraction: [-0.1, 0.5], toFraction: [1.1, 0.5], steps: 5 }],
  });
  const result = validateExecutableStateRecipe(candidate, { runtimeHookBinding: binding(), baseUrl });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith('EXEC_DRAG_FRACTION_INVALID:')));
});

function fakePage() {
  const calls = [];
  const locator = (selector) => ({
    async click(options) { calls.push(['click', selector, options]); },
    async fill(value, options) { calls.push(['fill', selector, value, options]); },
    async selectOption(value, options) { calls.push(['select', selector, value, options]); },
    async waitFor(options) { calls.push(['waitForSelector', selector, options]); },
    async evaluate(fn) {
      assert.equal(typeof fn, 'function');
      calls.push(['locatorEvaluate', selector]);
    },
  });
  return {
    calls,
    locator,
    keyboard: {
      async press(key) { calls.push(['press', key]); },
    },
    mouse: {
      async wheel(x, y) { calls.push(['wheel', x, y]); },
      async move(x, y, options) { calls.push(['move', x, y, options]); },
      async down() { calls.push(['down']); },
      async up() { calls.push(['up']); },
    },
    viewportSize() { return { width: 1000, height: 800 }; },
    async goto(url, options) {
      calls.push(['goto', url, options]);
      return { ok: () => true, status: () => 200 };
    },
    async waitForTimeout(ms) { calls.push(['waitForTimeout', ms]); },
    async waitForFunction(fn, arg, options) {
      assert.equal(typeof fn, 'function', 'executor must pass fixed code, never recipe string JavaScript');
      calls.push(['waitForFunction', arg, options]);
    },
    async evaluate(fn, arg) {
      assert.equal(typeof fn, 'function', 'executor must pass fixed code, never recipe string JavaScript');
      calls.push(['evaluate', arg]);
      return null;
    },
  };
}

test('EXECUTOR_DISPATCHES_FIXED_PRIMITIVES_WITHOUT_BROWSER_DEPENDENCY', async () => {
  const page = fakePage();
  const candidate = recipe({
    actions: [
      { type: 'goto', url: '/SRC056/original.html' },
      { type: 'click', selector: '#open' },
      { type: 'fill', selector: '#name', value: 'Ada' },
      { type: 'select', selector: '#kind', value: 'one' },
      { type: 'press', key: 'Escape' },
      { type: 'wheel', deltaY: 240, repeat: 2 },
      { type: 'drag', fromFraction: [0.75, 0.5], toFraction: [0.25, 0.5], steps: 4 },
      { type: 'waitForSelectorState', selector: '#viewer', state: 'visible', timeoutMs: 1000 },
      { type: 'settle', waitMs: 5 },
    ],
  });

  const result = await executeStateRecipe({ page, recipe: candidate, runtimeHookBinding: binding(), baseUrl });
  assert.equal(result.actionsExecuted, candidate.actions.length);
  assert.equal(result.sourceId, 'SRC056');
  assert.equal(result.stateId, 'INITIAL');
  assert.ok(page.calls.some((call) => call[0] === 'goto' && call[1] === 'http://127.0.0.1:8137/SRC056/original.html'));
  assert.equal(page.calls.filter((call) => call[0] === 'wheel').length, 2);
  assert.ok(page.calls.some((call) => call[0] === 'move' && call[1] === 750 && call[2] === 400));
  assert.ok(page.calls.some((call) => call[0] === 'move' && call[1] === 250 && call[2] === 400));
});

test('EXECUTOR_WAIT_FOR_RUNTIME_USES_FIXED_CALLBACK_AND_DATA_PATH', async () => {
  const page = fakePage();
  const candidate = recipe({
    actions: [{ type: 'waitForRuntime', path: '__lt.state.mode', equals: 'OVERVIEW', timeoutMs: 1234 }],
  });
  await executeStateRecipe({ page, recipe: candidate, runtimeHookBinding: binding(), baseUrl });
  const call = page.calls.find((entry) => entry[0] === 'waitForFunction');
  assert.ok(call);
  assert.deepEqual(call[1].segments, ['__lt', 'state', 'mode']);
  assert.equal(call[1].equals, 'OVERVIEW');
  assert.equal(call[2].timeout, 1234);
});

test('EXECUTOR_TRUSTED_HOOK_CALL_USES_FIXED_CALLBACK_AND_SEGMENTS', async () => {
  const page = fakePage();
  const candidate = recipe({ actions: [{ type: 'evaluateHook', hook: '__lt.overview', arg: false }] });
  await executeStateRecipe({ page, recipe: candidate, runtimeHookBinding: binding(), baseUrl });
  const call = page.calls.find((entry) => entry[0] === 'evaluate');
  assert.ok(call);
  assert.deepEqual(call[1].segments, ['__lt', 'overview']);
  assert.equal(call[1].arg, false);
});

test('EXECUTOR_REFUSES_REJECTED_RECIPE_BEFORE_PAGE_MUTATION', async () => {
  const page = fakePage();
  const candidate = recipe({
    actions: [{ type: 'waitForFunction', fn: 'window.__lt && alert(1)' }],
  });
  await assert.rejects(
    executeStateRecipe({ page, recipe: candidate, runtimeHookBinding: binding(), baseUrl }),
    /EXEC_UNSAFE_FREEFORM_FUNCTION_REJECTED/,
  );
  assert.deepEqual(page.calls, [], 'rejected recipe must not touch the page');
});
