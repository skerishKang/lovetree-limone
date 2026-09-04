import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';

import { src68ExpectedImages } from './source068-driver.mjs';
import {
  DUAL_VARIANT_PLUGIN_REGISTRY,
  replayApprovedDualVariantPair,
} from './state-replay/replay-approved-dual-variant-pair.mjs';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src', '03_sources');
const sourceId = 'SRC068';
const outputRoot = process.env.SRC068_DUAL_REPLAY_EVIDENCE_DIR || '/tmp/src068-dual-variant-plugin-replay';
const browserChannel = process.env.SRC_BROWSER_CHANNEL || 'chrome';

function resolveExactHead() {
  const fromEnv = process.env.SRC_EXACT_HEAD;
  if (typeof fromEnv === 'string' && /^[0-9a-f]{40}$/.test(fromEnv)) return fromEnv;
  if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
    throw new Error('SRC068 DUAL_VARIANT replay requires SRC_EXACT_HEAD in CI');
  }
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (!/^[0-9a-f]{40}$/.test(head)) throw new Error(`invalid git HEAD: ${head}`);
  return head;
}

const exactHead = resolveExactHead();
const plugin = DUAL_VARIANT_PLUGIN_REGISTRY[sourceId];
assert.ok(plugin, 'SRC068 explicit replay plugin must be registered');
assert.deepEqual([...plugin.variants], ['A', 'B']);
assert.deepEqual([...plugin.states], ['INITIAL_HERO', 'ARCHIVE_GRID']);

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });

const browser = await chromium.launch({ headless: true, channel: browserChannel });
const browserVersion = await browser.version();
const results = [];

try {
  for (const variant of plugin.variants) {
    for (const viewport of plugin.viewports) {
      const pairOutput = path.join(outputRoot, `${variant}-${viewport.width}x${viewport.height}`);
      const result = await replayApprovedDualVariantPair({
        sourceRoot,
        sourceId,
        variant,
        viewport,
        exactHead,
        browserVersion,
        outputRoot: pairOutput,
        browserFactory: async () => browser,
        closeBrowser: false,
      });
      assert.equal(result.ok, true, `${variant} ${viewport.label} replay failed: ${result.error ?? result.hold}`);
      assert.deepEqual(result.identity, { sourceId, variant });
      assert.equal(result.comparisonRecord.identity.sourceId, sourceId);
      assert.equal(result.comparisonRecord.identity.variant, variant);
      assert.equal(result.comparisonRecord.result, 'EQUAL');
      assert.equal(result.comparisonRecord.comparison.equal, true);
      assert.deepEqual(result.comparisonRecord.comparison.differences, []);
      assert.equal(result.comparisonRecord.acceptanceClaimed, false);
      assert.equal(result.comparisonRecord.exactHead, exactHead);

      for (const stateId of plugin.states) {
        assert.equal(result.comparisonRecord.comparison.states[stateId].equal, true);
        assert.equal(result.comparisonRecord.comparison.screenshots[stateId].equal, true);
        assert.deepEqual(
          result.originalRecord.states[stateId].imageBasenames,
          src68ExpectedImages(variant),
          `${variant} ${viewport.label} ${stateId}: original image set drift`,
        );
        assert.deepEqual(
          result.splitRecord.states[stateId].imageBasenames,
          src68ExpectedImages(variant),
          `${variant} ${viewport.label} ${stateId}: split image set drift`,
        );
        assert.equal(result.originalRecord.states[stateId].mediaVariant, null);
        assert.equal(result.splitRecord.states[stateId].mediaVariant, variant);
      }
      assert.deepEqual(result.originalRecord.errors, []);
      assert.deepEqual(result.splitRecord.errors, []);
      assert.deepEqual(result.comparisonRecord.comparison.loopbackFailures, []);
      results.push(result.comparisonRecord);
      console.log(`SRC068_DUAL_VARIANT_PAIR_PASS=${variant} ${viewport.label} ${viewport.width}x${viewport.height}`);
    }
  }

  const overlap = src68ExpectedImages('A').filter((image) => src68ExpectedImages('B').includes(image));
  assert.deepEqual(overlap, [], 'SRC068 A/B image sets must remain disjoint');
  assert.equal(results.length, 4);
  assert.equal(results.filter((record) => record.variant === 'A').length, 2);
  assert.equal(results.filter((record) => record.variant === 'B').length, 2);
  assert.ok(results.every((record) => record.result === 'EQUAL'));
  assert.ok(results.every((record) => record.acceptanceClaimed === false));
  assert.ok(results.every((record) => !/SRC068-[AB]/.test(JSON.stringify(record.identity))));

  const summary = {
    schemaVersion: 'clean108-src068-dual-variant-proof-v1',
    sourceId,
    exactHead,
    browserVersion,
    pluginId: plugin.pluginId,
    variants: [...plugin.variants],
    viewports: plugin.viewports.map(({ width, height, label }) => ({ width, height, label })),
    states: [...plugin.states],
    pairCount: results.length,
    statePairCount: results.length * plugin.states.length,
    result: 'PASS',
    crossContamination: 'ZERO',
    acceptanceClaimed: false,
    records: results,
  };
  fs.writeFileSync(path.join(outputRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(`DUAL_VARIANT_PLUGIN_BOUNDARY=PASS`);
  console.log(`DUAL_VARIANT_EXPLICIT_SELECTION=PASS`);
  console.log(`SRC068_A_REPLAY=PASS`);
  console.log(`SRC068_B_REPLAY=PASS`);
  console.log(`SRC068_DESKTOP_MOBILE=PASS`);
  console.log(`A_B_CROSS_CONTAMINATION=ZERO`);
  console.log(`SRC068_DUAL_VARIANT_PLUGIN_REPLAY_PASS=${exactHead}`);
} finally {
  await browser.close();
}
