import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  DUAL_VARIANT_KEYS,
  getDualVariantBaselineDisposition,
  getDualVariantParityDisposition,
  isDualVariantS4Hold,
  listDualVariantKeys,
} from '../src/08_harness/dual-variant-mechanical.mjs';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const ROOT = path.join(import.meta.dirname, '..');
const SRC068_DIR = path.join(ROOT, 'src', '03_sources', 'SRC068');

const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));

test('SINGLE baseline behavior preserved: helpers return null for SINGLE sources', () => {
  const single = readJson('src/03_sources/SRC056/manifest.json');
  assert.equal(single.authority_mode, undefined);
  assert.equal(listDualVariantKeys(single), null);
  assert.equal(isDualVariantS4Hold({ manifest: single, acceptedBaseline: null }), false);
  assert.equal(getDualVariantParityDisposition({ manifest: single, acceptedBaseline: null }), null);
  assert.equal(getDualVariantBaselineDisposition({ manifest: single }), null);
});

test('DUAL variant recognized explicitly with deterministic A/B enumeration and no default', () => {
  const manifest = readJson('src/03_sources/SRC068/manifest.json');
  assert.equal(manifest.authority_mode, 'DUAL_VARIANT');
  assert.deepEqual(DUAL_VARIANT_KEYS, ['A', 'B']);
  assert.deepEqual(listDualVariantKeys(manifest), ['A', 'B']);
  // No implicit canonical default anywhere in the selector contract.
  assert.equal(manifest.variant_selector.default, null);
  assert.equal(manifest.variant_selector.fail_closed, true);
  assert.deepEqual(manifest.variant_selector.allowed_values, ['A', 'B']);
  // Enumeration must never collapse to a single canonical variant.
  const keys = listDualVariantKeys(manifest);
  assert.ok(Array.isArray(keys) && keys.length === 2 && keys.includes('A') && keys.includes('B'));
});

test('SRC068 authority hashes unchanged and both frozen originals match (no source mutation)', () => {
  const manifest = readJson('src/03_sources/SRC068/manifest.json');
  assert.equal(
    manifest.authority.variants.A.sha256,
    '9daa5f7690c6a95d5c5e75fc16b5d950533921d9f41ec008053fa4c79d566c42',
  );
  assert.equal(
    manifest.authority.variants.B.sha256,
    'cb5553d399a728cd28422f8112f6cc59c185de68b522aa431e9d3bb1f4275004',
  );
  assert.equal(manifest.authority.variants.A.bytes, 18565);
  assert.equal(manifest.authority.variants.B.bytes, 18646);
  for (const key of ['A', 'B']) {
    const file = path.join(SRC068_DIR, 'original', key, 'original.html');
    assert.ok(fs.existsSync(file), `missing original/${key}/original.html`);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.length, manifest.authority.variants[key].bytes);
    assert.equal(sha256(bytes), manifest.authority.variants[key].sha256);
  }
  // No derived SRC068-A / SRC068-B identities may exist.
  const manifestText = JSON.stringify(manifest);
  assert.ok(!/SRC068-[AB]/.test(manifestText));
});

test('S4 HOLD is honored for SRC068 (negative: DUAL + no release => parity NOT run)', () => {
  const manifest = readJson('src/03_sources/SRC068/manifest.json');
  const acceptedBaseline = readJson('src/03_sources/SRC068/baseline/accepted-baseline.json');
  assert.equal(acceptedBaseline.next_stage_authorized, 'SPLIT_PARITY_S4_HOLD');
  assert.equal(manifest.stages.mechanical_split_complete, true);
  assert.equal(manifest.stages.source_split_parity_pass, false);
  assert.equal(isDualVariantS4Hold({ manifest, acceptedBaseline }), true);
  const disposition = getDualVariantParityDisposition({ manifest, acceptedBaseline });
  assert.deepEqual(disposition, { action: 'SKIP', reason: 'DUAL_VARIANT_S4_HOLD' });
  // Baseline single capture must also SKIP (no single executable).
  const baselineDisposition = getDualVariantBaselineDisposition({ manifest });
  assert.deepEqual(baselineDisposition, { action: 'SKIP', reason: 'DUAL_VARIANT_NO_SINGLE_EXECUTABLE' });
});

test('missing accepted-baseline fails closed as HOLD for DUAL_VARIANT', () => {
  const manifest = readJson('src/03_sources/SRC068/manifest.json');
  assert.equal(isDualVariantS4Hold({ manifest, acceptedBaseline: null }), true);
  assert.deepEqual(getDualVariantParityDisposition({ manifest, acceptedBaseline: null }), {
    action: 'SKIP',
    reason: 'DUAL_VARIANT_S4_HOLD',
  });
});

test('positive future-release: dual metadata enumerates A/B deterministically without a canonical default', () => {
  const manifest = readJson('src/03_sources/SRC068/manifest.json');
  const releasedBaseline = { next_stage_authorized: 'SPLIT_PARITY_RELEASED' };
  assert.equal(isDualVariantS4Hold({ manifest, acceptedBaseline: releasedBaseline }), false);
  // Even when released, the generic single harness must NOT run single parity;
  // it SKIPs with NO_DEDICATED_DRIVER rather than picking A or B by default.
  const disposition = getDualVariantParityDisposition({ manifest, acceptedBaseline: releasedBaseline });
  assert.deepEqual(disposition, { action: 'SKIP', reason: 'DUAL_VARIANT_NO_DEDICATED_DRIVER' });
  assert.deepEqual(listDualVariantKeys(manifest), ['A', 'B']);
  assert.equal(manifest.variant_selector.default, null);
});

test('shared harness wires DUAL SKIP explicitly (no silent single-path fallback)', () => {
  const baselineSrc = fs.readFileSync(
    path.join(ROOT, 'src', '08_harness', 'capture-source-baseline.mjs'),
    'utf8',
  );
  const paritySrc = fs.readFileSync(
    path.join(ROOT, 'src', '08_harness', 'capture-source-parity.mjs'),
    'utf8',
  );
  const materializeSrc = fs.readFileSync(
    path.join(ROOT, 'src', '08_harness', 'materialize-mechanical-split.mjs'),
    'utf8',
  );
  for (const [label, src] of [
    ['baseline', baselineSrc],
    ['parity', paritySrc],
    ['materialize', materializeSrc],
  ]) {
    assert.ok(
      src.includes('DUAL_VARIANT'),
      `${label} harness must explicitly recognize DUAL_VARIANT`,
    );
    assert.ok(src.includes('SKIP'), `${label} harness must SKIP dual with an explicit disposition`);
  }
  assert.ok(baselineSrc.includes('SRC_BASELINE_CAPTURE_SKIP='));
  assert.ok(paritySrc.includes('SRC_SPLIT_PARITY_CAPTURE_SKIP='));
  assert.ok(paritySrc.includes('s4_hold_respected=true'));
  // Parity must never construct a single original.html default for a DUAL source.
  assert.ok(!/DUAL_VARIANT.*original\/original\.html/.test(paritySrc));
});
