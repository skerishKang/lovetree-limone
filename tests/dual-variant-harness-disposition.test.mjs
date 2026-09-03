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

test('historical S4 HOLD stays immutable after dedicated CENTRAL acceptance; generic harness still skips', () => {
  const manifest = readJson('src/03_sources/SRC068/manifest.json');
  const acceptedBaseline = readJson('src/03_sources/SRC068/baseline/accepted-baseline.json');
  const acceptedParity = readJson('src/03_sources/SRC068/evidence/parity/accepted-parity.json');

  // S2/S3 baseline history remains immutable: it records the pre-S4 HOLD that
  // prevented the generic single-executable harness from choosing A or B.
  assert.equal(acceptedBaseline.next_stage_authorized, 'SPLIT_PARITY_S4_HOLD');
  assert.equal(isDualVariantS4Hold({ manifest, acceptedBaseline }), true);
  assert.deepEqual(getDualVariantParityDisposition({ manifest, acceptedBaseline }), {
    action: 'SKIP',
    reason: 'DUAL_VARIANT_S4_HOLD',
  });

  // Dedicated S4 evidence was later reviewed and accepted by CENTRAL. Completion
  // is recorded in current manifest/parity metadata without rewriting history or
  // enabling the generic single parity path.
  assert.equal(manifest.stages.mechanical_split_complete, true);
  assert.equal(manifest.stages.source_split_parity_pass, true);
  assert.equal(manifest.parity_ref, 'evidence/parity/accepted-parity.json');
  assert.equal(acceptedParity.status, 'ACCEPTED');
  assert.equal(acceptedParity.authority_mode, 'DUAL_VARIANT');
  assert.equal(acceptedParity.visual_review.central_direct_review, true);
  assert.equal(acceptedParity.browser_errors, 0);

  // Baseline single capture must also continue to SKIP (no single executable).
  assert.deepEqual(getDualVariantBaselineDisposition({ manifest }), {
    action: 'SKIP',
    reason: 'DUAL_VARIANT_NO_SINGLE_EXECUTABLE',
  });
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
