import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const ROOT = path.join(import.meta.dirname, '..');
const SRC068 = path.join(ROOT, 'src', '03_sources', 'SRC068');
const S4 = path.join(SRC068, 'parity', 's4');

const EXPECTED_A = '9daa5f7690c6a95d5c5e75fc16b5d950533921d9f41ec008053fa4c79d566c42';
const EXPECTED_B = 'cb5553d399a728cd28422f8112f6cc59c185de68b522aa431e9d3bb1f4275004';
const EXPECTED_SPLIT = {
  'split/index.html': 'b888e373d20f169b16863b863c51ef9a0f6e75221f7f99d6512f41e5858b45c5',
  'split/styles.css': '4d0b030d08aca71af79428bcbedff3b62f2a8e275e34c9b8d046dd7a6223970a',
  'split/script.js': '9a80353c592c3d82583438bf657386a20897e8ee59a4ff0a67c033c9352c85ee',
};
const EXPECTED_IMAGES = {
  A: ['01.png', '02.png', '03.png', '04.png', '05.png', '06.png', '07.png', '08.png', '09.png'],
  B: [
    '동양인01.png',
    '동양인02.png',
    '동양인03.png',
    '동양인04.png',
    '동양인05.png',
    '동양인06.png',
    '동양인07.png',
    '동양인08.png',
    '동양인09.png',
  ],
};

test('SRC068 S4 source byte lock: no original/split mutation', () => {
  for (const [key, digest] of [['A', EXPECTED_A], ['B', EXPECTED_B]]) {
    const bytes = fs.readFileSync(path.join(SRC068, 'original', key, 'original.html'));
    assert.equal(sha256(bytes), digest, `original ${key} SHA256 drift`);
  }
  for (const [relative, digest] of Object.entries(EXPECTED_SPLIT)) {
    const bytes = fs.readFileSync(path.join(SRC068, relative));
    assert.equal(sha256(bytes), digest, `${relative} SHA256 drift`);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(SRC068, 'manifest.json'), 'utf8'));
  assert.equal(manifest.variant_selector.default, null, 'no default variant allowed');
  assert.equal(manifest.variant_selector.fail_closed, true);
  assert.equal(manifest.stages.source_split_parity_pass, false, 'S4 remains CENTRAL_PENDING (not self-promoted)');
});

test('SRC068 S4 variant image sets: 9 each, disjoint, zero cross-contamination', () => {
  assert.deepEqual(EXPECTED_IMAGES.A.length, 9);
  assert.deepEqual(EXPECTED_IMAGES.B.length, 9);
  const overlap = EXPECTED_IMAGES.A.filter((u) => EXPECTED_IMAGES.B.includes(u));
  assert.deepEqual(overlap, [], 'A/B cross contamination must be ZERO');
  const variantA = JSON.parse(fs.readFileSync(path.join(SRC068, 'split', 'assets', 'variant-A.json'), 'utf8'));
  const variantB = JSON.parse(fs.readFileSync(path.join(SRC068, 'split', 'assets', 'variant-B.json'), 'utf8'));
  assert.deepEqual(variantA.imageUrls.map((s) => s.split('/').pop()), EXPECTED_IMAGES.A);
  assert.deepEqual(variantB.imageUrls.map((s) => s.split('/').pop()), EXPECTED_IMAGES.B);
});

test('SRC068 S4 evidence complete: summary, manifest, paired PNGs and comparisons', () => {
  const summary = JSON.parse(fs.readFileSync(path.join(S4, 'summary.json'), 'utf8'));
  assert.equal(summary.source_id, 'SRC068');
  assert.equal(summary.status, 'LOCAL_PASS_CENTRAL_PENDING');
  assert.deepEqual(summary.variants, { A: { pass: true }, B: { pass: true } });
  assert.equal(summary.cross_contamination, 'ZERO');
  assert.deepEqual(summary.viewports, ['1280x800', '390x844']);
  assert.deepEqual(summary.states, ['INITIAL_HERO', 'ARCHIVE_GRID']);

  const evidenceManifest = JSON.parse(fs.readFileSync(path.join(S4, 'evidence-manifest.json'), 'utf8'));
  assert.equal(evidenceManifest.length, 16, 'expected 2 variants x 2 viewports x 2 states x 2 sides');
  for (const entry of evidenceManifest) {
    assert.ok(['A', 'B'].includes(entry.variant));
    assert.ok(fs.existsSync(path.join(S4, entry.filename)), `missing evidence file ${entry.filename}`);
    assert.deepEqual(entry.console_page_errors, [], `console/page errors in ${entry.filename}`);
    assert.deepEqual(
      (entry.failed_requests ?? []).filter((f) => f.includes('127.0.0.1')),
      [],
      `loopback failures in ${entry.filename}`,
    );
  }

  for (const variant of ['A', 'B']) {
    for (const viewport of ['1280x800', '390x844']) {
      const comparisonPath = path.join(S4, `${variant}-${viewport}.json`);
      assert.ok(fs.existsSync(comparisonPath), `missing comparison ${variant}-${viewport}.json`);
      const { original, split, comparison } = JSON.parse(fs.readFileSync(comparisonPath, 'utf8'));
      assert.equal(comparison.cross_contamination, 'ZERO');
      for (const state of ['INITIAL_HERO', 'ARCHIVE_GRID']) {
        assert.deepEqual(split.states[state].images, original.states[state].images);
        assert.deepEqual(split.states[state].imageBasenames, EXPECTED_IMAGES[variant]);
        assert.equal(split.states[state].cards, 9);
        assert.equal(original.states[state].cards, 9);
        assert.equal(
          split.screenshots[`${state}_sha256`],
          original.screenshots[`${state}_sha256`],
          `${variant} ${viewport} ${state} screenshot drift`,
        );
        assert.deepEqual(original.errors, []);
        assert.deepEqual(split.errors, []);
      }
      assert.deepEqual(split.interaction, original.interaction);
    }
  }
});
