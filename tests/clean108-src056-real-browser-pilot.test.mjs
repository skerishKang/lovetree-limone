/**
 * CLEAN-108 M1 Slice 4A (#611): SRC056 REAL-BROWSER matched replay pilot.
 *
 * Proves the merged automation stack can replay ONE approved SRC056 recipe
 * against a real browser on BOTH the locked ORIGINAL and the locked
 * MECHANICAL SPLIT, capture both through captureApprovedStateRecipe (#618),
 * and emit a candidate machine comparison record.
 *
 * This test makes NO acceptance claim. Screenshot equality is measured and
 * reported as-is (never hardcoded). Console/page/failed-request counts are
 * reported and asserted per the browser-error contract.
 *
 * Runs all accepted SRC056 viewports (1280x800, 390x844, 320x720) for the two
 * accepted states (OVERVIEW, ORIGIN_REVEAL) from accepted-baseline.json.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { chromium } from 'playwright';

import {
  replayApprovedStatePair,
  resolveReplayTarget,
  resolveRuntimeHookBinding,
} from '../src/08_harness/state-replay/replay-approved-state-pair.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(repoRoot, 'src', '03_sources');
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'clean108-src056-replay-recipes.json'), 'utf8'));

const exactHead = process.env.SRC_EXACT_HEAD
  ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/.test(exactHead)) {
  throw new Error(`SRC_EXACT_HEAD must resolve to a 40-char SHA, got: ${exactHead}`);
}

const originalLock = resolveReplayTarget({ sourceRoot, sourceId: 'SRC056', side: 'original' });
assert.equal(originalLock.ok, true, `SRC056 original lock: ${originalLock.error ?? ''}`);
const authoritySha256 = originalLock.target.authoritySha256;

const bindingResult = resolveRuntimeHookBinding({ sourceRoot, sourceId: 'SRC056' });
assert.equal(bindingResult.ok, true);
assert.equal(bindingResult.binding.status, 'BOUND', 'SRC056 authority must bind its expected runtime hook');
const BINDING = bindingResult.binding;

const ACCEPTED_VIEWPORTS = ['1280x800', '390x844', '320x720'];
const ACCEPTED_STATES = ['OVERVIEW', 'ORIGIN_REVEAL'];

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    // Local machines without the bundled Playwright browser fall back to the
    // installed branded Chrome channel, mirroring SRC_BROWSER_CHANNEL=chrome.
    if (/executable doesn't exist/i.test(error?.message ?? '')) {
      return chromium.launch({ headless: true, channel: 'chrome' });
    }
    throw error;
  }
}

function environment(recipe) {
  const env = {};
  if (recipe.viewport.deviceScaleFactor !== undefined) env.deviceScaleFactor = recipe.viewport.deviceScaleFactor;
  if (recipe.viewport.reducedMotion !== undefined) env.reducedMotion = recipe.viewport.reducedMotion;
  return env;
}

test('SRC056 real-browser matched replay pilot (all accepted viewports + states)', async () => {
  const browser = await launchBrowser();
  const summary = {
    exactHead,
    authoritySha256,
    browserVersion: null,
    sourceId: 'SRC056',
    viewports: [],
  };
  try {
    summary.browserVersion = browser.version();
    for (const viewportKey of ACCEPTED_VIEWPORTS) {
      for (const stateId of ACCEPTED_STATES) {
        const fixture = fixtures.recipes.find((entry) => entry.viewportKey === viewportKey && entry.stateId === stateId);
        assert.ok(fixture, `fixture missing for ${viewportKey}/${stateId}`);

        const result = await replayApprovedStatePair({
          sourceRoot,
          sourceId: 'SRC056',
          recipe: fixture.recipe,
          binding: BINDING,
          provenance: {
            exactHead,
            authoritySha256,
            browserVersion: browser.version(),
          },
          environment: environment(fixture.recipe),
          browserFactory: async () => browser,
          now: () => new Date().toISOString(),
        });

        assert.equal(result.ok, true, `${viewportKey}/${stateId}: pair HOLD ${result.stage}:${result.hold}:${result.error}`);

        // both sides captured through the approved adapter
        assert.ok(result.originalRecord.evidence, `${viewportKey}/${stateId}: original capture missing`);
        assert.ok(result.splitRecord.evidence, `${viewportKey}/${stateId}: split capture missing`);

        const comparison = result.comparisonRecord;
        assert.equal(comparison.acceptanceClaimed, false, 'the pilot never claims acceptance');
        assert.equal(comparison.sourceId, 'SRC056');
        assert.equal(comparison.stateId, stateId);
        assert.equal(comparison.viewport.equal, true, `${viewportKey}/${stateId}: viewport identity drift`);

        // deterministic data channels must match
        assert.equal(comparison.channels.assertions.result, 'EQUAL', `${viewportKey}/${stateId}: assertion comparison not EQUAL`);
        assert.equal(comparison.channels.runtimeSnapshot.result, 'EQUAL', `${viewportKey}/${stateId}: runtime snapshot comparison not EQUAL`);
        assert.equal(comparison.channels.dom.result, 'EQUAL', `${viewportKey}/${stateId}: DOM comparison not EQUAL`);

        // browser-error contract: 0 console errors / 0 page errors / 0 failed requests both sides
        assert.deepEqual(result.originalRecord.evidence.runtimeHealth.consoleErrors, [], `${viewportKey}/${stateId}: original console errors`);
        assert.deepEqual(result.splitRecord.evidence.runtimeHealth.consoleErrors, [], `${viewportKey}/${stateId}: split console errors`);
        assert.deepEqual(result.originalRecord.evidence.runtimeHealth.pageErrors, [], `${viewportKey}/${stateId}: original page errors`);
        assert.deepEqual(result.splitRecord.evidence.runtimeHealth.pageErrors, [], `${viewportKey}/${stateId}: split page errors`);
        assert.deepEqual(result.originalRecord.evidence.runtimeHealth.failedRequests, [], `${viewportKey}/${stateId}: original failed requests`);
        assert.deepEqual(result.splitRecord.evidence.runtimeHealth.failedRequests, [], `${viewportKey}/${stateId}: split failed requests`);

        // screenshots: same name set on both sides; equality measured, not assumed
        const originalShots = result.originalRecord.evidence.screenshots.map((shot) => shot.name).sort();
        const splitShots = result.splitRecord.evidence.screenshots.map((shot) => shot.name).sort();
        assert.deepEqual(originalShots, splitShots, `${viewportKey}/${stateId}: screenshot name sets differ`);

        summary.viewports.push({
          viewport: viewportKey,
          state: stateId,
          overall: comparison.overall,
          assertionComparison: comparison.channels.assertions.result,
          domComparison: comparison.channels.dom.result,
          runtimeSnapshotComparison: comparison.channels.runtimeSnapshot.result,
          screenshotComparison: comparison.channels.screenshots.result,
          screenshotShots: comparison.channels.screenshots.shots,
          consoleErrorsOriginal: result.originalRecord.evidence.runtimeHealth.consoleErrors.length,
          consoleErrorsSplit: result.splitRecord.evidence.runtimeHealth.consoleErrors.length,
          pageErrorsOriginal: result.originalRecord.evidence.runtimeHealth.pageErrors.length,
          pageErrorsSplit: result.splitRecord.evidence.runtimeHealth.pageErrors.length,
          failedRequestsOriginal: result.originalRecord.evidence.runtimeHealth.failedRequests.length,
          failedRequestsSplit: result.splitRecord.evidence.runtimeHealth.failedRequests.length,
          originalBrowserVersion: result.originalRecord.evidence.browserVersion,
        });
      }
    }
    console.log('CLEAN108_SRC056_REAL_BROWSER_PILOT_SUMMARY=' + JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
});