import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
  COVERED: 74,
  PARTIAL: 32,
  MISSING: 2,
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
  'reconciliation_disposition',
  'family_anchor_master_id',
];

function byId(id) {
  return ledger.rows.find((row) => row.master_id === id);
}

test('master design ledger has exactly the 108 corpus rows', () => {
  assert.equal(ledger.schema_version, 2);
  assert.equal(ledger.rows.length, 108);

  const ids = ledger.rows.map((row) => row.master_id);
  assert.deepEqual(ids, Array.from({ length: 108 }, (_, index) => index + 1));
  assert.equal(new Set(ids).size, 108);
});

test('reconciliation authority metadata is explicit and versioned', () => {
  assert.equal(ledger.repository_baseline, '3158f42fc7f6b4571454fdfc1e8b5ae95c92ee6c');
  assert.equal(ledger.reconciliation_issue, 470);
  assert.equal(ledger.reconciliation_audit_issue, 468);
  assert.deepEqual(ledger.policy.reconciliation_vocabulary, [
    'PARTIAL_PROVENANCE',
    'ALIAS_FOUND',
    'DUPLICATE_FAMILY',
    'SUPERSEDED',
    'TRUE_MISSING',
  ]);
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

test('coverage counts reflect the #468 reconciliation: 74 covered / 32 partial / 2 missing', () => {
  const actual = { COVERED: 0, PARTIAL: 0, MISSING: 0 };
  for (const row of ledger.rows) {
    assert.ok(Object.hasOwn(actual, row.coverage_state), `unknown coverage state: ${row.coverage_state}`);
    actual[row.coverage_state] += 1;
  }
  assert.deepEqual(actual, expectedCoverageCounts);
  assert.equal(ledger.summary.covered, 74);
  assert.equal(ledger.summary.partial, 32);
  assert.equal(ledger.summary.missing, 2);
  assert.equal(ledger.summary.audited_missing_rows, 24);
  assert.equal(ledger.summary.audited_missing_normalized_unique_families, 20);
  assert.equal(ledger.summary.true_missing_unique_families, 1);
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


test('the #468 audited missing set is reconciled without conflating coverage and identity disposition', () => {
  const auditedIds = [1,2,3,10,13,14,30,32,33,34,35,47,48,49,50,51,52,53,68,69,70,81,82,107];
  const expectedDisposition = { PARTIAL_PROVENANCE: 18, ALIAS_FOUND: 1, DUPLICATE_FAMILY: 3, SUPERSEDED: 1, TRUE_MISSING: 1 };
  const actual = {};
  for (const id of auditedIds) {
    const value = byId(id).reconciliation_disposition;
    actual[value] = (actual[value] ?? 0) + 1;
  }
  assert.deepEqual(actual, expectedDisposition);
  assert.equal(byId(13).coverage_state, 'MISSING');
  assert.equal(byId(13).reconciliation_disposition, 'TRUE_MISSING');
  assert.equal(byId(14).coverage_state, 'MISSING');
  assert.equal(byId(14).reconciliation_disposition, 'DUPLICATE_FAMILY');
  assert.equal(byId(14).family_anchor_master_id, 13);
  assert.deepEqual(byId(13).github_issue, [471]);
  assert.deepEqual(byId(14).github_issue, [471]);
  assert.equal(byId(2).family_anchor_master_id, 1);
  assert.equal(byId(3).family_anchor_master_id, 1);
  assert.deepEqual(byId(52).superseded_by, [53]);
  assert.deepEqual(byId(53).supersedes, [52]);
});

test('snapshot-backed audited rows pin real repository provenance from #284/#287', () => {
  const partialSnapshotIds = [1,2,3,10,30,32,33,34,35,47,48,49,50,51,52,53,68,69,70,81,82];
  for (const id of partialSnapshotIds) {
    const row = byId(id);
    assert.ok(row.github_issue.includes(284), 'master_id=' + id + ' must reference #284');
    assert.ok(row.github_pr.includes(287), 'master_id=' + id + ' must reference PR #287');
    assert.match(row.reference_path, /^reference\/source-tracks-snapshot\//);
    assert.ok(existsSync(new URL('../' + row.reference_path, import.meta.url)), 'master_id=' + id + ' snapshot path must exist');
    assert.equal(row.current_main_present, true);
    assert.equal(row.coverage_state, 'PARTIAL');
  }
  assert.deepEqual(byId(107).github_issue, [30, 284]);
  assert.ok(byId(107).github_pr.includes(287));
  assert.equal(byId(107).coverage_state, 'COVERED');
  assert.equal(byId(107).reconciliation_disposition, 'ALIAS_FOUND');
  assert.equal(byId(107).manifest_path, 'app/components/v4/v4-source-manifest.ts');
  assert.ok(existsSync(new URL('../' + byId(107).reference_path, import.meta.url)), 'master_id=107 snapshot path must exist');
});

test('Track17 and Track18 Drive snapshot identities remain isolated from colliding GitHub namespaces', () => {
  assert.equal(byId(49).semantic_identity, 'Drive Track17 Living Memory Terrain');
  assert.equal(byId(49).namespace_type, 'drive-source-snapshot');
  assert.equal(byId(50).semantic_identity, 'Drive Track18 Memory Core Electric Aurora');
  assert.equal(byId(50).namespace_type, 'drive-source-snapshot');
  assert.notEqual(byId(50).semantic_identity, 'Source Track18 Fragment Loader');
  assert.ok(ledger.namespace_guards.includes('Drive Track17 Living Memory Terrain != historical GitHub Track17 Global Shell'));
  assert.ok(ledger.namespace_guards.includes('Drive Track18 Memory Core Electric Aurora != current Source Track18 Fragment Loader'));
});
