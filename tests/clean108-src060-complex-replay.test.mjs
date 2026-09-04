import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { analyzeAuthorityHtml } from '../src/08_harness/auto-analyzer/analyze-html.mjs';
import { compareMatchedStateReplay } from '../src/08_harness/state-replay/compare-matched-state-replay.mjs';
import { expandRecipeMatrix } from '../src/08_harness/state-replay/expand-recipe-matrix.mjs';
import { normalizeEvidenceForMatchedComparison } from '../src/08_harness/state-replay/matched-evidence-normalization.mjs';
import { validateExecutableStateRecipe } from '../src/08_harness/state-replay/validate-executable-state-recipe.mjs';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src', '03_sources', 'SRC060');
const manifest = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'manifest.json'), 'utf8'));
const authorityBytes = fs.readFileSync(path.join(sourceRoot, 'original', 'original.html'));
const matrix = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src', '08_harness', 'fixtures', 'state-recipes', 'SRC060', 'approved-complex-matrix.json'), 'utf8'));
const analysis = analyzeAuthorityHtml({
  html: authorityBytes.toString('utf8'),
  bytes: authorityBytes,
  sourceId: 'SRC060',
  authorityPath: 'src/03_sources/SRC060/original/original.html',
  manifest,
});
const baseUrl = 'http://127.0.0.1:8237/SRC060/original.html';

function evidence() {
  return {
    schemaVersion: 'clean108-s2-recipe-evidence-v1',
    harnessVersion: 'clean108-m1-slice3-v1',
    sourceId: 'SRC060',
    recipeVersion: 'clean108-state-recipe-v1',
    stateId: 'MOMENT_VIEWER',
    exactHead: 'a'.repeat(40),
    authoritySha256: 'b'.repeat(64),
    browserVersion: 'Chrome/1',
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1, reducedMotion: 'reduce' },
    capturedAt: '2026-09-05T00:00:00.000Z',
    timeouts: { actionMs: 5000, recipeMs: 30000, recipeMsEnforced: false },
    execution: { sourceId: 'SRC060', stateId: 'MOMENT_VIEWER', actionsExecuted: 1, trace: [{ type: 'settle' }] },
    assertions: [{ index: 0, type: 'visible', passed: true, selector: '#momentViewer', observedVisible: true }],
    dom: { url: 'http://127.0.0.1/SRC060/original.html', title: 'Track60', ids: ['stage'], elementCount: 100, scrollWidth: 1440, scrollHeight: 900 },
    runtimeSnapshot: { selected: 0, selectedCluster: 0, semantic: 2 },
    runtimeHealth: { consoleErrors: [], pageErrors: [], failedRequests: [], truncated: false },
    screenshots: [{ name: 'moment-viewer', digestModeRequested: 'canonical16', rawSha256: 'c'.repeat(64), bytes: 1234 }],
  };
}

function validate(recipe) {
  return validateExecutableStateRecipe(recipe, {
    runtimeHookBinding: analysis.runtimeHookBinding,
    baseUrl,
  });
}

test('SRC060 complex matrix expands to the accepted 3 viewport x 7 state contract and every recipe is source-bound executable', () => {
  assert.equal(analysis.runtimeHookBinding.status, 'BOUND');
  assert.deepEqual(analysis.runtimeHookBinding.expected, ['__LT60__', '__LT60_V12__']);
  const recipes = expandRecipeMatrix(matrix);
  assert.equal(recipes.length, 21);
  assert.deepEqual([...new Set(recipes.map((recipe) => recipe.stateId))], [
    'INITIAL',
    'CLUSTER_FOCUS',
    'NODE_SELECT',
    'MOMENT_VIEWER',
    'BOOK_HANDOFF',
    'CONNECTION_HANDOFF',
    'PATH_PREVIEW',
  ]);
  assert.deepEqual([...new Set(recipes.map((recipe) => `${recipe.viewport.width}x${recipe.viewport.height}`))], ['1440x900', '430x932', '390x844']);
  for (const recipe of recipes) {
    const result = validate(recipe);
    assert.equal(result.valid, true, `${recipe.viewport.width}x${recipe.viewport.height}/${recipe.stateId}: ${result.errors.join('|')}`);
    assert.equal(recipe.screenshots[0].digest, 'canonical16');
    assert.equal(recipe.allowedTolerance.screenshot, 'EXACT');
    assert.equal(recipe.viewport.reducedMotion, 'reduce');
  }
});

test('SRC060 camera-pinned recipes use only bounded primitive setRuntime assignments', () => {
  const recipes = expandRecipeMatrix(matrix);
  const cluster = recipes.find((recipe) => recipe.viewport.width === 1440 && recipe.stateId === 'CLUSTER_FOCUS');
  const node = recipes.find((recipe) => recipe.viewport.width === 1440 && recipe.stateId === 'NODE_SELECT');
  assert.ok(cluster);
  assert.ok(node);

  const clusterAssignments = cluster.actions.filter((action) => action.type === 'setRuntime');
  const nodeAssignments = node.actions.filter((action) => action.type === 'setRuntime');
  assert.equal(clusterAssignments.length, 6);
  assert.equal(nodeAssignments.length, 6);
  assert.deepEqual(clusterAssignments.map((action) => action.path), [
    '__LT60__.camera.yaw',
    '__LT60__.camera.pitch',
    '__LT60__.camera.zoom',
    '__LT60__.camera.tx',
    '__LT60__.camera.ty',
    '__LT60__.camera.tz',
  ]);
  assert.deepEqual(nodeAssignments.slice(3).map((action) => action.fromPath), [
    '__LT60__.nodes.0.x',
    '__LT60__.nodes.0.y',
    '__LT60__.nodes.0.z',
  ]);
  assert.equal(validate(cluster).valid, true);
  assert.equal(validate(node).valid, true);
});

test('setRuntime remains fail-closed for prototype paths, foreign roots, objects, and ambiguous value sources', () => {
  const recipe = expandRecipeMatrix(matrix).find((candidate) => candidate.stateId === 'CLUSTER_FOCUS');
  assert.ok(recipe);

  const forbiddenPrototype = structuredClone(recipe);
  forbiddenPrototype.actions = [{ type: 'setRuntime', path: '__LT60__.camera.zoom', fromPath: '__LT60__.nodes.0.__proto__.x' }];
  const prototypeResult = validate(forbiddenPrototype);
  assert.equal(prototypeResult.valid, false);
  assert.ok(prototypeResult.errors.some((error) => error.startsWith('EXEC_ACTION_RUNTIME_PATH_FORBIDDEN:')));

  const foreignRoot = structuredClone(recipe);
  foreignRoot.actions = [{ type: 'setRuntime', path: '__LT60__.camera.zoom', fromPath: '__OTHER__.value' }];
  const foreignResult = validate(foreignRoot);
  assert.equal(foreignResult.valid, false);
  assert.ok(foreignResult.errors.some((error) => error.startsWith('EXEC_ACTION_HOOK_NOT_SOURCE_BOUND:')));

  const objectLiteral = structuredClone(recipe);
  objectLiteral.actions = [{ type: 'setRuntime', path: '__LT60__.camera.zoom', value: { unsafe: true } }];
  const objectResult = validate(objectLiteral);
  assert.equal(objectResult.valid, false);
  assert.ok(objectResult.errors.includes('EXEC_SET_RUNTIME_LITERAL_NOT_PRIMITIVE:actions[0]'));

  const ambiguous = structuredClone(recipe);
  ambiguous.actions = [{ type: 'setRuntime', path: '__LT60__.camera.zoom', value: 1, fromPath: '__LT60__.camera.zoom' }];
  const ambiguousResult = validate(ambiguous);
  assert.equal(ambiguousResult.valid, false);
  assert.ok(ambiguousResult.errors.includes('EXEC_SET_RUNTIME_EXACTLY_ONE_SOURCE_REQUIRED:actions[0]'));
});

test('canonical normalization ignores raw PNG jitter but keeps canonical digest and content DOM parity fail-closed', () => {
  const original = evidence();
  const split = structuredClone(original);
  split.dom.url = 'http://127.0.0.1/SRC060/split/index.html';
  split.dom.elementCount = 99;
  split.screenshots[0].rawSha256 = 'd'.repeat(64);
  split.screenshots[0].bytes = 1241;

  const digest = 'e'.repeat(64);
  const left = normalizeEvidenceForMatchedComparison({ evidence: original, screenshotDigests: { 'moment-viewer': digest }, contentElementCount: 98 });
  const right = normalizeEvidenceForMatchedComparison({ evidence: split, screenshotDigests: { 'moment-viewer': digest }, contentElementCount: 98 });
  const result = compareMatchedStateReplay({ originalEvidence: left, splitEvidence: right });
  assert.equal(result.passed, true);

  const drifted = normalizeEvidenceForMatchedComparison({ evidence: split, screenshotDigests: { 'moment-viewer': 'f'.repeat(64) }, contentElementCount: 98 });
  const drift = compareMatchedStateReplay({ originalEvidence: left, splitEvidence: drifted });
  assert.equal(drift.passed, false);
  assert.ok(drift.differences.includes('screenshots_equal'));
});

test('SRC060 accepted Source capsule remains locked and COMPLEX-classified', () => {
  assert.equal(manifest.stages.identity_verified, true);
  assert.equal(manifest.stages.raw_authority_locked, true);
  assert.equal(manifest.stages.baseline_captured, true);
  assert.equal(manifest.stages.mechanical_split_complete, true);
  assert.equal(manifest.stages.source_split_parity_pass, true);
  assert.equal(manifest.authority.sha256, 'c35b66fb46b57958f7f52c7506ce20e467302f4bcf43b55001428d5d525a7fdf');
  assert.equal(authorityBytes.length, 55260);
});
