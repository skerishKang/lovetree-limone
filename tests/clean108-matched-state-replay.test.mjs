import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { analyzeAuthorityHtml } from '../src/08_harness/auto-analyzer/analyze-html.mjs';
import { compareMatchedStateReplay } from '../src/08_harness/state-replay/compare-matched-state-replay.mjs';
import { validateExecutableStateRecipe } from '../src/08_harness/state-replay/validate-executable-state-recipe.mjs';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src', '03_sources', 'SRC056');
const manifest = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'manifest.json'), 'utf8'));
const originalBytes = fs.readFileSync(path.join(sourceRoot, 'original', 'original.html'));
const analysis = analyzeAuthorityHtml({
  html: originalBytes.toString('utf8'),
  bytes: originalBytes,
  sourceId: 'SRC056',
  authorityPath: 'src/03_sources/SRC056/original/original.html',
  manifest,
});

const recipePaths = [
  'src/08_harness/fixtures/state-recipes/SRC056/overview.json',
  'src/08_harness/fixtures/state-recipes/SRC056/origin-reveal.json',
];

test('SRC056 committed SIMPLE proof recipes are source-bound executable recipes', () => {
  assert.equal(analysis.runtimeHookBinding.status, 'BOUND');
  assert.equal(analysis.runtimeHookBinding.matched, true);

  for (const recipePath of recipePaths) {
    const recipe = JSON.parse(fs.readFileSync(path.join(repoRoot, recipePath), 'utf8'));
    const result = validateExecutableStateRecipe(recipe, {
      runtimeHookBinding: analysis.runtimeHookBinding,
      baseUrl: 'http://127.0.0.1:8137/SRC056/original.html',
    });
    assert.equal(result.valid, true, `${recipePath}: ${result.errors.join('|')}`);
    assert.equal(recipe.sourceId, 'SRC056');
    assert.equal(recipe.viewport.width, 1280);
    assert.equal(recipe.viewport.height, 800);
    assert.equal(recipe.viewport.reducedMotion, 'reduce');
  }
});

function evidence() {
  return {
    schemaVersion: 'clean108-s2-recipe-evidence-v1',
    harnessVersion: 'clean108-m1-slice3-v1',
    sourceId: 'SRC056',
    recipeVersion: 'clean108-state-recipe-v1',
    stateId: 'OVERVIEW',
    exactHead: 'a'.repeat(40),
    authoritySha256: 'b'.repeat(64),
    browserVersion: 'Chrome/1',
    viewport: { width: 1280, height: 800, deviceScaleFactor: 1, reducedMotion: 'reduce' },
    capturedAt: '2026-09-04T00:00:00.000Z',
    timeouts: { actionMs: 5000, recipeMs: 15000, recipeMsEnforced: false },
    execution: {
      sourceId: 'SRC056',
      stateId: 'OVERVIEW',
      actionsExecuted: 3,
      trace: [
        { type: 'evaluateHook', hook: '__lt.overview' },
        { type: 'waitForRuntime', path: '__lt.state.mode' },
        { type: 'settle' },
      ],
    },
    assertions: [
      { index: 0, type: 'runtime', passed: true, path: '__lt.state.mode', observed: 'OVERVIEW', expected: 'OVERVIEW' },
    ],
    dom: {
      url: 'http://127.0.0.1:8137/SRC056/original.html',
      title: 'Fixture',
      ids: ['stage', 'modePill'],
      elementCount: 10,
      scrollWidth: 1280,
      scrollHeight: 800,
    },
    runtimeSnapshot: { 'state.mode': 'OVERVIEW', 'state.scale': 0.39 },
    runtimeHealth: { consoleErrors: [], pageErrors: [], failedRequests: [] },
    screenshots: [{ name: 'overview', digestModeRequested: 'raw', rawSha256: 'c'.repeat(64), bytes: 100 }],
  };
}

test('matched replay ignores only variant URL/capture timestamp and requires every evidence channel to match', () => {
  const original = evidence();
  const split = structuredClone(original);
  split.dom.url = 'http://127.0.0.1:8137/SRC056/split/index.html';
  split.capturedAt = '2026-09-04T00:00:01.000Z';

  const result = compareMatchedStateReplay({ originalEvidence: original, splitEvidence: split });
  assert.equal(result.passed, true);
  assert.deepEqual(result.differences, []);
});

test('matched replay fails closed on runtime, screenshot, or timeout drift', () => {
  for (const mutate of [
    (split) => { split.runtimeSnapshot['state.scale'] = 0.4; },
    (split) => { split.screenshots[0].rawSha256 = 'd'.repeat(64); },
    (split) => { split.timeouts.actionMs = 6000; },
  ]) {
    const original = evidence();
    const split = structuredClone(original);
    split.dom.url = 'http://127.0.0.1:8137/SRC056/split/index.html';
    mutate(split);
    const result = compareMatchedStateReplay({ originalEvidence: original, splitEvidence: split });
    assert.equal(result.passed, false);
    assert.ok(result.differences.length >= 1);
  }
});

test('matched replay requires explicit timeout provenance on both variants', () => {
  const original = evidence();
  const split = structuredClone(original);
  delete split.timeouts;
  const result = compareMatchedStateReplay({ originalEvidence: original, splitEvidence: split });
  assert.equal(result.passed, false);
  assert.ok(result.differences.includes('split_timeouts_present'));
  assert.ok(result.differences.includes('timeouts_equal'));
});

test('matched replay requires clean runtime health on both variants', () => {
  const original = evidence();
  const split = structuredClone(original);
  split.dom.url = 'http://127.0.0.1:8137/SRC056/split/index.html';
  split.runtimeHealth.consoleErrors.push('fixture error');

  const result = compareMatchedStateReplay({ originalEvidence: original, splitEvidence: split });
  assert.equal(result.passed, false);
  assert.ok(result.differences.includes('runtime_health_equal'));
  assert.ok(result.differences.includes('split_runtime_health_clean'));
});
