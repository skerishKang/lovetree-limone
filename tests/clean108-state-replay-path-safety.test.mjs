import assert from 'node:assert/strict';
import test from 'node:test';

import { validateExecutableStateRecipe } from '../src/08_harness/state-replay/validate-executable-state-recipe.mjs';

const baseUrl = 'http://127.0.0.1:8137/SRC056/original.html';

function binding() {
  return {
    sourceId: 'SRC056',
    discovered: ['__lt'],
    expected: ['__lt'],
    matched: true,
    status: 'BOUND',
  };
}

function recipe(overrides = {}) {
  return {
    sourceId: 'SRC056',
    recipeVersion: '1',
    viewport: { width: 1280, height: 800, deviceScaleFactor: 1, reducedMotion: 'reduce' },
    stateId: 'INITIAL',
    preconditions: [],
    actions: [{ type: 'goto', url: '/SRC056/original.html' }],
    settleCondition: { type: 'quiescent' },
    assertions: [],
    screenshots: [{ name: 'initial', digest: 'raw' }],
    runtimeHook: { name: '__lt.state', snapshotFields: ['mode'] },
    allowedTolerance: { geometryEpsPx: 0, screenshot: 'EXACT' },
    timeouts: { actionMs: 8000, recipeMs: 60000 },
    ...overrides,
  };
}

test('EXEC_RUNTIME_PATH_REJECTS_CONSTRUCTOR_CHAIN', () => {
  const result = validateExecutableStateRecipe(
    recipe({ runtimeHook: { name: '__lt.constructor.constructor' } }),
    { runtimeHookBinding: binding(), baseUrl },
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('EXEC_RUNTIME_PATH_FORBIDDEN:__lt.constructor.constructor'));
});

test('EXEC_ACTION_PATH_REJECTS_PROTO_CHAIN', () => {
  const result = validateExecutableStateRecipe(
    recipe({ actions: [{ type: 'evaluateHook', hook: '__lt.__proto__.constructor', arg: 'return 1' }] }),
    { runtimeHookBinding: binding(), baseUrl },
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('EXEC_ACTION_RUNTIME_PATH_FORBIDDEN:actions[0]:__lt.__proto__.constructor'));
});

test('EXEC_WAIT_RUNTIME_REJECTS_PROTOTYPE_SEGMENT', () => {
  const result = validateExecutableStateRecipe(
    recipe({ actions: [{ type: 'waitForRuntime', path: '__lt.prototype.mode', equals: 'OVERVIEW' }] }),
    { runtimeHookBinding: binding(), baseUrl },
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('EXEC_ACTION_RUNTIME_PATH_FORBIDDEN:actions[0]:__lt.prototype.mode'));
});

test('EXEC_NORMAL_OWN_RUNTIME_PATH_REMAINS_ALLOWED', () => {
  const result = validateExecutableStateRecipe(
    recipe({ actions: [{ type: 'waitForRuntime', path: '__lt.state.mode', equals: 'OVERVIEW' }] }),
    { runtimeHookBinding: binding(), baseUrl },
  );
  assert.equal(result.valid, true, JSON.stringify(result.errors));
});
