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

test('SRC060 complex matrix expands to the accepted 3 viewport x 7 state contract and every recipe is source-bound executable', () => {
  assert.equal(analysis.runtimeHookBinding.status, 'BOUND');
  assert.deepEqual(analysis.runtimeHookBinding.expected, ['__LT60__', '__LT60_V12__']);
  const recipes = expandRecipeMatrix(matrix);
  assert.equal(recipes.length, 21);
  assert.deepEqual([...new Set(recipes.map((recipe) => recipe.stateId))], [
    'UNIVERSE_IDLE',
    'CLUSTER_FOCUS',
    'NODE_SELECT',
    'MOMENT_VIEWER',
    'BOOK_HANDOFF',
    'CONNECTION_HANDOFF',
    'PATH_PREVIEW',
  ]);
  assert.deepEqual([...new Set(recipes.map((recipe) => `${recipe.viewport.width}x${recipe.viewport.height}`))], ['1440x900', '430x932', '390x844']);
  for (const recipe of recipes) {
    const result = validateExecutableStateRecipe(recipe, {
      runtimeHookBinding: analysis.runtimeHookBinding,
      baseUrl: 'http://127.0.0.1:8237/SRC060/original.html',
    });
    assert.equal(result.valid, true, `${recipe.viewport.width}x${recipe.viewport.height}/${recipe.stateId}: ${result.errors.join('|')}`);
    assert.equal(recipe.screenshots[0].digest, 'canonical16');
    assert.equal(recipe.allowedTolerance.screenshot, 'EXACT');
    assert.equal(recipe.viewport.reducedMotion, 'reduce');
  }
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
