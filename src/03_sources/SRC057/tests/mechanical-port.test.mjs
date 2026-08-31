import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const AUTHORITY_BYTES = 676320;
const AUTHORITY_SHA256 = 'ca30cdb430067a0649c9f3ee61c148f0b6e606220a9c05ba806ae0afffa66ace';

 test('SRC057 preserves the locked authority and accepted stage records', () => {
  const original = read('original/original.html');
  const manifest = JSON.parse(read('manifest.json'));
  const materialization = JSON.parse(read('split/materialization.json'));
  const parity = JSON.parse(read('evidence/parity/accepted-parity.json'));
  assert.equal(original.byteLength, AUTHORITY_BYTES);
  assert.equal(sha256(original), AUTHORITY_SHA256);
  assert.deepEqual(manifest.stages, {
    identity_verified: true,
    raw_authority_locked: true,
    baseline_captured: true,
    mechanical_split_complete: true,
    source_split_parity_pass: true,
  });
  assert.equal(materialization.status, 'ACCEPTED');
  assert.equal(parity.status, 'ACCEPTED');

  const collision = manifest.identity_collision_boundary;
  assert.equal(collision.current_generation_namespace, 'src');
  assert.equal(collision.current_authority.path, 'src/03_sources/SRC057/**');
  assert.equal(collision.current_authority.bytes, AUTHORITY_BYTES);
  assert.equal(collision.current_authority.sha256, AUTHORITY_SHA256);
  assert.equal(collision.historical_distinct_claim.path, 'new/sources/SRC057/**');
  assert.equal(collision.historical_distinct_claim.status, 'DEPRECATED_SUPERSEDED_GENERATION_CLAIM');
  assert.equal(collision.historical_distinct_claim.bytes, 22310);
  assert.equal(collision.historical_distinct_claim.sha256, '4f28f1671146a36c53e88e0645c6dbe29076b1db526e21adb40794617a36223b');
  assert.equal(collision.numeric_id_equality_is_not_identity_evidence, true);
  assert.equal(collision.lineage_equivalence_inferred, false);
  assert.equal(collision.historical_pr_550_imported, false);
  assert.equal(collision.new_namespace_modified, false);
});

test('SRC057 split round-trips byte-identically to the frozen original', () => {
  const index = read('split/index.html').toString('utf8');
  const css = read('split/styles.css').toString('utf8');
  const js = read('split/script.js').toString('utf8');
  const reconstructed = index
    .replace('<link rel="stylesheet" href="./styles.css"/>', `<style>${css}</style>`)
    .replace('<script src="./script.js"></script>', `<script>${js}</script>`);
  assert.deepEqual(Buffer.from(reconstructed), read('original/original.html'));
});

test('SRC057 accepted parity records the required standard matrix', () => {
  const parity = JSON.parse(read('evidence/parity/accepted-parity.json'));
  assert.deepEqual(parity.viewports, [
    { width: 1280, height: 800, states: ['INITIAL', 'SELECTED', 'NEXT', 'EDIT_PREVIEW', 'VIEWER'] },
    { width: 390, height: 844, states: ['INITIAL', 'SELECTED', 'NEXT', 'EDIT_PREVIEW', 'VIEWER'] },
    { width: 320, height: 720, states: ['INITIAL', 'SELECTED', 'NEXT', 'EDIT_PREVIEW', 'VIEWER'] },
  ]);
  assert.equal(parity.browser_errors, 0);
  assert.equal(parity.comparisons.dom, 'EQUAL');
  assert.equal(parity.comparisons.runtime_state, 'EQUAL');
  assert.equal(parity.comparisons.interactions, 'EQUAL');
  assert.equal(parity.comparisons.screenshots, 'BYTE_IDENTICAL_CANONICAL_PIXEL_DIGEST');
  assert.ok(parity.viewport_results.every((result) => Object.values(result).every((value) => value === true || typeof value === 'object')));
});
