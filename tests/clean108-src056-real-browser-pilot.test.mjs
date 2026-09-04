/**
 * CLEAN-108 M1 Slice 4A/4B (#611): REAL-BROWSER matched replay pilot.
 *
 * Proves the merged automation stack can replay approved recipes against a
 * real browser on BOTH the locked ORIGINAL and the locked MECHANICAL SPLIT,
 * capture both through captureApprovedStateRecipe (#618), and emit a
 * candidate machine comparison record.
 *
 * Source matrix (this file intentionally keeps the historical SRC056 filename
 * so the A-track / Production inventory exclusions and the exact-head harness
 * gate remain untouched):
 *   SRC056 (Slice 4A): 2 states x 3 viewports = 6 pair replays
 *   SRC060 (Slice 4B): 7 states x 3 viewports = 21 pair replays
 *
 * This test makes NO acceptance claim. Screenshot equality is measured and
 * reported as-is (never hardcoded): SRC056 compares raw byte digests, SRC060
 * compares the accepted canonical16 pixel digest. Console/page/failed-request
 * counts are reported and asserted per the browser-error contract.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { chromium } from 'playwright';

import {
  replayApprovedStatePair,
  resolveExactHead,
  resolveReplayTarget,
  resolveRuntimeHookBinding,
  SUPPORTED_SOURCE_IDS,
} from '../src/08_harness/state-replay/replay-approved-state-pair.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(repoRoot, 'src', '03_sources');

// Exact-head provenance: in CI the evidence head MUST come from SRC_EXACT_HEAD
// — never from `git rev-parse HEAD`, which would silently resolve to a
// synthetic merge ref. resolveExactHead fails closed for that.
const headResolution = resolveExactHead({
  env: process.env,
  gitRevParse: () => execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }),
});
assert.equal(headResolution.ok, true, headResolution.error);
const exactHead = headResolution.exactHead;

function readSourceConfig(sourceId) {
  const fixtureFile = sourceId === 'SRC056'
    ? 'clean108-src056-replay-recipes.json'
    : 'clean108-src060-replay-recipes.json';
  const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', fixtureFile), 'utf8'));
  assert.equal(fixtures.sourceId, sourceId, `${sourceId}: fixture sourceId mismatch`);

  const lock = resolveReplayTarget({ sourceRoot, sourceId, side: 'original' });
  assert.equal(lock.ok, true, `${sourceId} original lock: ${lock.error ?? ''}`);
  const bindingResult = resolveRuntimeHookBinding({ sourceRoot, sourceId });
  assert.equal(bindingResult.ok, true, `${sourceId} binding resolution failed`);
  assert.equal(bindingResult.binding.status, 'BOUND', `${sourceId} authority must bind its expected runtime hooks`);
  assert.equal(bindingResult.binding.matched, true, `${sourceId} binding must be matched`);

  return {
    sourceId,
    authoritySha256: lock.target.authoritySha256,
    binding: bindingResult.binding,
    fixtures,
    viewports: sourceId === 'SRC056' ? ['1280x800', '390x844', '320x720'] : fixtures.acceptedViewports,
    states: sourceId === 'SRC056' ? ['OVERVIEW', 'ORIGIN_REVEAL'] : fixtures.acceptedStates,
  };
}

const SRC056 = readSourceConfig('SRC056');
const SRC060 = readSourceConfig('SRC060');

async function launchBrowser() {
  // CI (src-108-harness-gate.yml) pins SRC_BROWSER_CHANNEL=chrome; local
  // development falls back to the bundled Chromium, then to branded Chrome.
  const channel = process.env.SRC_BROWSER_CHANNEL;
  if (channel === 'chrome') {
    return chromium.launch({ headless: true, channel: 'chrome' });
  }
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
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

// Fixed module-owned copy of source060-driver.mjs's canonicalPixelDigest (the
// EXACT accepted SRC060 digest algorithm). Used only to prove that the capture
// adapter's canonical16Sha256 matches the legacy driver contract on real
// buffers. Recipe values are data only; this callback is fixed test code.
async function legacyCanonical16(page, pngBuffer) {
  const b64 = pngBuffer.toString('base64');
  return page.evaluate(async (src) => {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = `data:image/png;base64,${src}`; });
    const N = 16;
    const canvas = document.createElement('canvas');
    canvas.width = N;
    canvas.height = N;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, N, N);
    const px = ctx.getImageData(0, 0, N, N).data;
    return Array.from(px, (v, i) => (i % 4 === 3 ? v : v & 0xF0));
  }, b64).then((data) => crypto.createHash('sha256').update(Buffer.from(data)).digest('hex'));
}

async function runSourcePilot(source, browser, summaryLabel) {
  const { sourceId, authoritySha256, binding, fixtures, viewports, states } = source;
  const summary = {
    exactHead,
    exactHeadSource: headResolution.source,
    supportedSourceIds: SUPPORTED_SOURCE_IDS,
    authoritySha256,
    browserVersion: browser.version(),
    sourceId,
    viewports: [],
  };
  for (const viewportKey of viewports) {
    for (const stateId of states) {
      const fixture = fixtures.recipes.find((entry) => entry.viewportKey === viewportKey && entry.stateId === stateId);
      assert.ok(fixture, `${sourceId} fixture missing for ${viewportKey}/${stateId}`);

      const result = await replayApprovedStatePair({
        sourceRoot,
        sourceId,
        recipe: fixture.recipe,
        binding,
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
      assert.equal(comparison.sourceId, sourceId);
      assert.equal(comparison.stateId, stateId);
      assert.equal(comparison.viewport.equal, true, `${viewportKey}/${stateId}: viewport identity drift`);

      // deterministic data channels must match
      assert.equal(comparison.channels.assertions.result, 'EQUAL', `${viewportKey}/${stateId}: assertion comparison not EQUAL`);
      assert.equal(comparison.channels.runtimeSnapshot.result, 'EQUAL', `${viewportKey}/${stateId}: runtime snapshot comparison not EQUAL`);
      assert.equal(comparison.channels.dom.result, 'EQUAL', `${viewportKey}/${stateId}: DOM comparison not EQUAL`);
      assert.equal(comparison.channels.screenshots.result, 'EQUAL', `${viewportKey}/${stateId}: screenshot comparison not EQUAL`);

      // every assertion in the recipe actually passed on BOTH sides (these are
      // hard state-contract assertions: camera pins, graph invariants, modals)
      for (const side of ['original', 'split']) {
        const assertions = side === 'original'
          ? result.originalRecord.evidence.assertions
          : result.splitRecord.evidence.assertions;
        for (const assertion of assertions) {
          assert.equal(assertion.passed, true, `${viewportKey}/${stateId} ${side}: assertion[${assertion.index}] ${assertion.type} ${assertion.path ?? assertion.selector} did not pass`);
        }
      }

      // browser-error contract: 0 console errors / 0 page errors / 0 failed requests both sides
      assert.deepEqual(result.originalRecord.evidence.runtimeHealth.consoleErrors, [], `${viewportKey}/${stateId}: original console errors`);
      assert.deepEqual(result.splitRecord.evidence.runtimeHealth.consoleErrors, [], `${viewportKey}/${stateId}: split console errors`);
      assert.deepEqual(result.originalRecord.evidence.runtimeHealth.pageErrors, [], `${viewportKey}/${stateId}: original page errors`);
      assert.deepEqual(result.splitRecord.evidence.runtimeHealth.pageErrors, [], `${viewportKey}/${stateId}: split page errors`);
      assert.deepEqual(result.originalRecord.evidence.runtimeHealth.failedRequests, [], `${viewportKey}/${stateId}: original failed requests`);
      assert.deepEqual(result.splitRecord.evidence.runtimeHealth.failedRequests, [], `${viewportKey}/${stateId}: split failed requests`);

      // screenshots: same name set on both sides; equality measured by the
      // recipe-requested digest mode (raw for SRC056, canonical16 for SRC060)
      const originalShots = result.originalRecord.evidence.screenshots.map((shot) => shot.name).sort();
      const splitShots = result.splitRecord.evidence.screenshots.map((shot) => shot.name).sort();
      assert.deepEqual(originalShots, splitShots, `${viewportKey}/${stateId}: screenshot name sets differ`);

      const shotsDetail = comparison.channels.screenshots.shots;
      for (const shot of shotsDetail) {
        assert.equal(shot.equal, true, `${viewportKey}/${stateId}: screenshot '${shot.name}' digest mismatch`);
        if (sourceId === 'SRC060') {
          assert.equal(shot.digestModeRequested, 'canonical16', `${viewportKey}/${stateId}: SRC060 must compare canonical16`);
          assert.equal(
            shot.digestSha256Original,
            shot.digestSha256Split,
            `${viewportKey}/${stateId}: canonical16 digest inequality measured for '${shot.name}'`,
          );
        }
      }

      if (sourceId === 'SRC060') {
        // Prove capture's canonical16Sha256 matches the legacy source060-driver
        // digest contract on the real in-memory buffers (fixed code, data only).
        const checkContext = await browser.newContext();
        try {
          const checkPage = await checkContext.newPage();
          for (const shot of result.originalRecord.evidence.screenshots) {
            const buffer = result.originalRecord.screenshotBuffers.get(shot.name);
            assert.ok(buffer, `${viewportKey}/${stateId}: original buffer missing for '${shot.name}'`);
            const legacyDigest = await legacyCanonical16(checkPage, buffer);
            assert.equal(
              legacyDigest,
              shot.canonical16Sha256,
              `${viewportKey}/${stateId}: canonical16 '${shot.name}' differs from the legacy driver digest`,
            );
          }
        } finally {
          await checkContext.close();
        }
      }

      summary.viewports.push({
        viewport: viewportKey,
        state: stateId,
        overall: comparison.overall,
        assertionComparison: comparison.channels.assertions.result,
        domComparison: comparison.channels.dom.result,
        runtimeSnapshotComparison: comparison.channels.runtimeSnapshot.result,
        screenshotComparison: comparison.channels.screenshots.result,
        screenshotDigestMode: shotsDetail[0]?.digestModeRequested ?? 'raw',
        screenshotShots: shotsDetail,
        domCount: comparison.domCount,
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
  console.log(`${summaryLabel}=` + JSON.stringify(summary, null, 2));
}

test('SRC056 real-browser matched replay pilot (2 states x 3 viewports)', async () => {
  const browser = await launchBrowser();
  try {
    await runSourcePilot(SRC056, browser, 'CLEAN108_SRC056_REAL_BROWSER_PILOT_SUMMARY');
  } finally {
    await browser.close();
  }
});

test('SRC060 real-browser matched replay pilot (7 states x 3 viewports)', async () => {
  const browser = await launchBrowser();
  try {
    await runSourcePilot(SRC060, browser, 'CLEAN108_SRC060_REAL_BROWSER_PILOT_SUMMARY');
  } finally {
    await browser.close();
  }
});
