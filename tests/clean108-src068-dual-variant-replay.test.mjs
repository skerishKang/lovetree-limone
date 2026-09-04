import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import {
  DUAL_VARIANT_PLUGIN_REGISTRY,
  DUAL_VARIANT_REPLAY_HOLD_CODES,
  preflightDualVariantReplay,
  replayApprovedDualVariantPair,
  resolveDualVariantPlugin,
} from '../src/08_harness/state-replay/replay-approved-dual-variant-pair.mjs';
import {
  MATCHED_PAIR_HOLD_CODES,
  resolveReplayTarget,
} from '../src/08_harness/state-replay/replay-approved-state-pair.mjs';

const ROOT = path.join(import.meta.dirname, '..');
const SOURCE_ROOT = path.join(ROOT, 'src', '03_sources');
const SOURCE_DIR = path.join(SOURCE_ROOT, 'SRC068');
const EXACT_HEAD = '0123456789abcdef0123456789abcdef01234567';
const SAFE_OUTPUT = path.join('/tmp', 'clean108-src068-dual-variant-contract-test');

test('SRC068 explicit plugin registry preserves one Source identity and A/B variants', () => {
  const resolved = resolveDualVariantPlugin('SRC068');
  assert.equal(resolved.ok, true);
  assert.equal(resolved.plugin.sourceId, 'SRC068');
  assert.equal(resolved.plugin.pluginId, 'src068-explicit-a-b-v1');
  assert.deepEqual([...resolved.plugin.variants], ['A', 'B']);
  assert.deepEqual([...resolved.plugin.states], ['INITIAL_HERO', 'ARCHIVE_GRID']);
  assert.deepEqual(
    resolved.plugin.viewports.map(({ width, height }) => ({ width, height })),
    [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
    ],
  );
  assert.ok(!JSON.stringify(DUAL_VARIANT_PLUGIN_REGISTRY).includes('SRC068-A'));
  assert.ok(!JSON.stringify(DUAL_VARIANT_PLUGIN_REGISTRY).includes('SRC068-B'));
});

test('unknown DUAL plugin source fails closed', () => {
  const resolved = resolveDualVariantPlugin('SRC999');
  assert.equal(resolved.ok, false);
  assert.equal(resolved.hold, DUAL_VARIANT_REPLAY_HOLD_CODES.PLUGIN_NOT_REGISTERED);
});

test('SRC068 preflight requires explicit A/B selection and never defaults', () => {
  const missing = preflightDualVariantReplay({
    sourceRoot: SOURCE_ROOT,
    sourceId: 'SRC068',
    variant: null,
    exactHead: EXACT_HEAD,
    outputRoot: SAFE_OUTPUT,
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.hold, DUAL_VARIANT_REPLAY_HOLD_CODES.VARIANT_REQUIRED);

  const invalid = preflightDualVariantReplay({
    sourceRoot: SOURCE_ROOT,
    sourceId: 'SRC068',
    variant: 'C',
    exactHead: EXACT_HEAD,
    outputRoot: SAFE_OUTPUT,
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.hold, DUAL_VARIANT_REPLAY_HOLD_CODES.VARIANT_INVALID);
});

test('SRC068 candidate output under Source authority capsule is rejected', () => {
  const result = preflightDualVariantReplay({
    sourceRoot: SOURCE_ROOT,
    sourceId: 'SRC068',
    variant: 'A',
    exactHead: EXACT_HEAD,
    outputRoot: path.join(SOURCE_DIR, 'candidate-output'),
  });
  assert.equal(result.ok, false);
  assert.equal(result.hold, DUAL_VARIANT_REPLAY_HOLD_CODES.OUTPUT_PATH_AUTHORITY);
});

test('SRC068 A/B preflight locks both frozen authorities and accepted common split', () => {
  for (const variant of ['A', 'B']) {
    const result = preflightDualVariantReplay({
      sourceRoot: SOURCE_ROOT,
      sourceId: 'SRC068',
      variant,
      exactHead: EXACT_HEAD,
      outputRoot: `${SAFE_OUTPUT}-${variant}`,
    });
    assert.equal(result.ok, true, result.error);
    assert.deepEqual(result.identity, { sourceId: 'SRC068', variant });
    assert.equal(result.manifest.variant_selector.default, null);
    assert.equal(result.manifest.variant_selector.fail_closed, true);
    assert.deepEqual(result.manifest.variant_selector.allowed_values, ['A', 'B']);

    assert.equal(
      result.locks.authority.A.sha256,
      '9daa5f7690c6a95d5c5e75fc16b5d950533921d9f41ec008053fa4c79d566c42',
    );
    assert.equal(result.locks.authority.A.bytes, 18565);
    assert.equal(
      result.locks.authority.B.sha256,
      'cb5553d399a728cd28422f8112f6cc59c185de68b522aa431e9d3bb1f4275004',
    );
    assert.equal(result.locks.authority.B.bytes, 18646);
    assert.equal(
      result.locks.split['split/index.html'].sha256,
      'b888e373d20f169b16863b863c51ef9a0f6e75221f7f99d6512f41e5858b45c5',
    );
    assert.equal(
      result.locks.split['split/styles.css'].sha256,
      '4d0b030d08aca71af79428bcbedff3b62f2a8e275e34c9b8d046dd7a6223970a',
    );
    assert.equal(
      result.locks.split['split/script.js'].sha256,
      '9a80353c592c3d82583438bf657386a20897e8ee59a4ff0a67c033c9352c85ee',
    );
  }
});

test('missing/invalid variant rejects before browserFactory invocation', async () => {
  for (const variant of [null, 'C']) {
    let browserFactoryCalls = 0;
    const result = await replayApprovedDualVariantPair({
      sourceRoot: SOURCE_ROOT,
      sourceId: 'SRC068',
      variant,
      viewport: { width: 1280, height: 800 },
      exactHead: EXACT_HEAD,
      browserVersion: 'contract-test-browser',
      outputRoot: SAFE_OUTPUT,
      browserFactory: async () => {
        browserFactoryCalls += 1;
        throw new Error('browserFactory must not be called');
      },
    });
    assert.equal(result.ok, false);
    assert.equal(browserFactoryCalls, 0);
    assert.ok([
      DUAL_VARIANT_REPLAY_HOLD_CODES.VARIANT_REQUIRED,
      DUAL_VARIANT_REPLAY_HOLD_CODES.VARIANT_INVALID,
    ].includes(result.hold));
  }
});

test('generic single-executable replay path remains fail-closed for SRC068', () => {
  const result = resolveReplayTarget({
    sourceRoot: SOURCE_ROOT,
    sourceId: 'SRC068',
    side: 'original',
  });
  assert.equal(result.ok, false);
  assert.equal(result.hold, MATCHED_PAIR_HOLD_CODES.SOURCE_NOT_SINGLE_EXECUTABLE);
});

test('candidate identity is a tuple and never a derived Source id', () => {
  for (const variant of ['A', 'B']) {
    const result = preflightDualVariantReplay({
      sourceRoot: SOURCE_ROOT,
      sourceId: 'SRC068',
      variant,
      exactHead: EXACT_HEAD,
      outputRoot: `${SAFE_OUTPUT}-identity-${variant}`,
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.identity, { sourceId: 'SRC068', variant });
    const serialized = JSON.stringify(result.identity);
    assert.equal(serialized.includes(`SRC068-${variant}`), false);
  }
});
