import assert from 'node:assert/strict';
import test from 'node:test';

import { validateExecutableStateRecipe } from '../src/08_harness/state-replay/validate-executable-state-recipe.mjs';

const baseUrl = 'http://127.0.0.1:8137/SRC056/original.html';

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

test('EXEC_BINDING_REJECTS_FORGED_EXPECTED_HOOK_SET', () => {
  const candidate = recipe({ runtimeHook: { name: '__evil.state' } });
  const result = validateExecutableStateRecipe(candidate, {
    baseUrl,
    runtimeHookBinding: {
      sourceId: 'SRC056',
      discovered: ['__evil'],
      expected: ['__evil'],
      matched: true,
      status: 'BOUND',
    },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('EXEC_RUNTIME_BINDING_REGISTRY_MISMATCH:SRC056'));
});

test('EXEC_BINDING_REJECTS_REGISTERED_BUT_UNDISCOVERED_HOOK', () => {
  const candidate = recipe({
    sourceId: 'SRC060',
    runtimeHook: { name: '__LT60_V12__.camera' },
    actions: [{ type: 'goto', url: '/SRC060/original.html' }],
  });
  const result = validateExecutableStateRecipe(candidate, {
    baseUrl: 'http://127.0.0.1:8137/SRC060/original.html',
    runtimeHookBinding: {
      sourceId: 'SRC060',
      discovered: ['__LT60__'],
      expected: ['__LT60__', '__LT60_V12__'],
      matched: true,
      status: 'BOUND',
    },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('EXEC_RUNTIME_HOOK_NOT_DISCOVERED:__LT60_V12__.camera'));
});

test('EXEC_BINDING_REQUIRES_DISCOVERY_EVIDENCE', () => {
  const result = validateExecutableStateRecipe(recipe(), {
    baseUrl,
    runtimeHookBinding: {
      sourceId: 'SRC056',
      expected: ['__lt'],
      matched: true,
      status: 'BOUND',
    },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('EXEC_RUNTIME_DISCOVERY_REQUIRED'));
});
