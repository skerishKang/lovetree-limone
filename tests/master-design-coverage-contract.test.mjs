import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ledgerPath = new URL('../design-intake/master-design-coverage.json', import.meta.url);
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));

const expectedJobCounts = {
  HOME: 7,
  DISCOVER: 5,
  SUBJECT: 15,
  PATH: 13,
  MOMENT: 4,
  CAPTURE: 2,
  MYTREE: 12,
  ARCHIVE: 22,
  TOOLS: 8,
  MILESTONE: 13,
  SHELL: 2,
  CAMPAIGN: 3,
  LAB: 2,
};

const expectedCoverageCounts = {
  COVERED: 73,
  PARTIAL: 11,
  MISSING: 24,
};

const requiredRowKeys = [
  'master_id',
  'master_filename',
  'product_job',
  'semantic_identity',
  'github_issue',
  'github_pr',
  'reference_path',
  'manifest_path',
  'source_runner_route',
  'native_route',
  'canonical_route',
  'namespace_type',
  'source_authority_version',
  'current_main_present',
  'coverage_state',
  'mvp_review_state',
  'supersedes',
  'superseded_by',
  'source_freshness',
];

function byId(id) {
  return ledger.rows.find((row) => row.master_id === id);
}

test('master design ledger has exactly the 108 corpus rows', () => {
  assert.equal(ledger.schema_version, 1);
  assert.equal(ledger.rows.length, 108);

  const ids = ledger.rows.map((row) => row.master_id);
  assert.deepEqual(ids, Array.from({ length: 108 }, (_, index) => index + 1));
  assert.equal(new Set(ids).size, 108);
});

test('master design ledger preserves the exact Product Job inventory', () => {
  const actual = Object.fromEntries(Object.keys(expectedJobCounts).map((job) => [job, 0]));
  for (const row of ledger.rows) {
    assert.ok(Object.hasOwn(expectedJobCounts, row.product_job), `unknown product job: ${row.product_job}`);
    actual[row.product_job] += 1;
  }
  assert.deepEqual(actual, expectedJobCounts);
  assert.deepEqual(ledger.product_job_counts, expectedJobCounts);
});

test('coverage counts remain 73 covered / 11 partial / 24 missing', () => {
  const actual = { COVERED: 0, PARTIAL: 0, MISSING: 0 };
  for (const row of ledger.rows) {
    assert.ok(Object.hasOwn(actual, row.coverage_state), `unknown coverage state: ${row.coverage_state}`);
    actual[row.coverage_state] += 1;
  }
  assert.deepEqual(actual, expectedCoverageCounts);
  assert.equal(ledger.summary.covered, 73);
  assert.equal(ledger.summary.partial, 11);
  assert.equal(ledger.summary.missing, 24);
});

test('every row exposes the provenance and MVP review contract', () => {
  for (const row of ledger.rows) {
    for (const key of requiredRowKeys) {
      assert.ok(Object.hasOwn(row, key), `master_id=${row.master_id} missing key ${key}`);
    }
    assert.equal(typeof row.master_filename, 'string');
    assert.ok(row.master_filename.length > 0);
    assert.equal(typeof row.semantic_identity, 'string');
    assert.ok(Array.isArray(row.supersedes));
    assert.ok(Array.isArray(row.superseded_by));
  }
});

test('numeric namespace collisions stay explicitly separated', () => {
  assert.equal(byId(39).semantic_identity, 'Lineage54 Petal Runner V4');
  assert.equal(byId(86).semantic_identity, 'Source Track54 Operations Studio');
  assert.notEqual(byId(39).semantic_identity, byId(86).semantic_identity);

  assert.equal(byId(87).semantic_identity, 'Source Track55 Free Connection / Path Edit');
  assert.match(byId(99).semantic_identity, /Lineage55/);
  assert.notEqual(byId(87).semantic_identity, byId(99).semantic_identity);

  assert.equal(byId(37).semantic_identity, 'Source Track56 Vertical Moment Network');
  assert.equal(byId(77).semantic_identity, 'Lineage56 Crystal Atelier');
  assert.notEqual(byId(37).semantic_identity, byId(77).semantic_identity);

  assert.equal(byId(42).semantic_identity, 'Source Track57 Living Glass Moment Card');
  assert.equal(byId(106).semantic_identity, 'Lineage57 Living Character V2');
  assert.notEqual(byId(42).semantic_identity, byId(106).semantic_identity);

  assert.equal(byId(73).semantic_identity, 'Source Track58 Living Memory Pinboard');
  assert.equal(byId(105).semantic_identity, 'Lineage58 VideoFigure V2');
  assert.notEqual(byId(73).semantic_identity, byId(105).semantic_identity);

  assert.equal(byId(21).semantic_identity, 'Source Track68 Human Emotional Path');
  assert.equal(byId(56).semantic_identity, 'Living Media Sphere source family');
  assert.notEqual(byId(21).semantic_identity, byId(56).semantic_identity);
});

test('high-risk source-freshness rows remain fail-closed', () => {
  const highRiskIds = [20, 21, 22, 54, 86];
  for (const id of highRiskIds) {
    assert.equal(byId(id).source_freshness, 'high', `master_id=${id} must stay high-risk until reconciled`);
    assert.notEqual(byId(id).mvp_review_state, 'production_approved');
  }
});

test('product selection remains independent from repository maturity', () => {
  assert.equal(byId(7).mvp_review_state, 'primary_hold_gate');
  assert.equal(byId(7).coverage_state, 'COVERED');

  assert.equal(byId(26).mvp_review_state, 'primary');
  assert.equal(byId(26).coverage_state, 'PARTIAL');

  assert.equal(byId(80).mvp_review_state, 'primary');
  assert.equal(byId(80).coverage_state, 'PARTIAL');
});
