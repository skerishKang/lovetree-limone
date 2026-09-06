import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  DUPLICATE_VARIANT_OPEN_VALUE,
  DUPLICATE_VARIANT_VALUES,
  validateCodexDuplicateVariantGovernance,
  validateDuplicateVariantGovernance,
  validateSourceCapsules,
} from '../src/08_harness/source-capsule-validator.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BATCH_CAPSULES = [
  'SRC047',
  'SRC056',
  'SRC057',
  'SRC058',
  'SRC060',
  'SRC062',
  'SRC064',
  'SRC066',
  'SRC068',
  'SRC069',
  'SRC071',
  'CDX014',
];

function capsuleDir(capsuleId) {
  return capsuleId.startsWith('SRC') ? 'src/03_sources' : 'src/04_codex';
}

function readManifest(capsuleId) {
  return JSON.parse(
    fs.readFileSync(path.join(repoRoot, capsuleDir(capsuleId), capsuleId, 'manifest.json'), 'utf8'),
  );
}

function cloneSource(sourceId = 'SRC056', targetId = 'SRC999') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dup-var-gov-contract-'));
  fs.mkdirSync(path.join(root, 'src', '03_sources'), { recursive: true });
  fs.cpSync(
    path.join(repoRoot, 'src', '03_sources', sourceId),
    path.join(root, 'src', '03_sources', targetId),
    { recursive: true },
  );
  const base = path.join(root, 'src', '03_sources', targetId);
  for (const relative of [
    'manifest.json',
    'authority/authority.json',
    'baseline/accepted-baseline.json',
    'split/materialization.json',
    'evidence/source/drive-authority-readback.json',
    'evidence/parity/accepted-parity.json',
  ]) {
    const file = path.join(base, relative);
    if (!fs.existsSync(file)) continue;
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if ('source_id' in value) value.source_id = targetId;
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  }
  return root;
}

function mutateManifest(root, sourceId, mutate) {
  const manifestPath = path.join(root, 'src', '03_sources', sourceId, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  mutate(manifest);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

// A note that satisfies rule §7 check (b) through the readback reference form.
function compliantReadbackNote() {
  return {
    rule_ref: 'docs/design-intake/duplicate-variant-governance-rule-2026-09-06.md §4.2',
    adjudicated_at_utc: '2026-09-06T08:01:51Z',
    adjudicated_by: 'CENTRAL — #589 comment 5557899997',
    closing_step: 'step 2 — identical SHA',
    readback: {
      ref: 'evidence/source/drive-authority-readback.json',
      verified_at_utc: '2026-09-06T06:35:00Z',
      verified_by: 'kilo-agent / sensenova-6.8-flash-lite',
      verification_mode: 'CENTRAL_FRESH_DRIVE_READBACK',
    },
  };
}

// A note that satisfies rule §7 check (b) through the follow-up adjudication form
// (CDX014: authority-context.json is its authority record, not a Drive readback).
function followUpOnlyNote() {
  return {
    rule_ref: 'docs/design-intake/duplicate-variant-governance-rule-2026-09-06.md §4.2',
    adjudicated_at_utc: '2026-09-06T08:01:51Z',
    adjudicated_by: 'CENTRAL — #589 comment 5557899997',
    closing_step: 'step 1 — single candidate',
    follow_up_adjudication: {
      at_utc: '2026-09-06',
      by: 'CENTRAL — #589 comment 5557899997',
      basis: 'authority-context.json (S2 read-only mirror, sample-verified 6/6); no Drive readback artifact exists',
      finding: 'Closes at step 1 of §2.3 with PATH_CONTEXT_VARIANT_ONLY',
    },
  };
}

test('adopted vocabulary is exactly the five CENTRAL-adopted values', () => {
  assert.deepEqual([...DUPLICATE_VARIANT_VALUES], [
    'UNRESOLVED',
    'SINGLE_EXECUTABLE_NO_DUPLICATE',
    'DUPLICATE_COPY_SAME_SHA',
    'PATH_CONTEXT_VARIANT_ONLY',
    'DUAL_MEDIA_VARIANT',
  ]);
  assert.equal(DUPLICATE_VARIANT_OPEN_VALUE, 'UNRESOLVED');
  assert.equal(new Set(DUPLICATE_VARIANT_VALUES).size, DUPLICATE_VARIANT_VALUES.length, 'no duplicate values');
  assert.throws(() => DUPLICATE_VARIANT_VALUES.push('NOPE'), TypeError);
  assert.equal(DUPLICATE_VARIANT_VALUES[0], 'UNRESOLVED', 'frozen: the vocabulary cannot be widened at runtime');
});

test('all 12 batch-pass capsules validate clean (12/12)', () => {
  const perCapsule = BATCH_CAPSULES.map((id) => {
    const manifest = readManifest(id);
    assert.ok(DUPLICATE_VARIANT_VALUES.includes(manifest.duplicate_variant_status), `${id}: status in vocabulary`);
    assert.deepEqual(validateDuplicateVariantGovernance(manifest, id), [], `${id}: no governance failure`);
    return `${id}=${manifest.duplicate_variant_status}`;
  });
  assert.equal(perCapsule.length, 12);
});

test('every SRC and CDX manifest on the tree validates clean', () => {
  const failures = [];
  for (const [dir, pattern] of [['src/03_sources', /^SRC\d{3}$/], ['src/04_codex', /^CDX(?:\d{3}|\d{3}-\d+)$/]]) {
    const full = path.join(repoRoot, dir);
    const ids = fs.readdirSync(full).filter((name) => pattern.test(name));
    for (const id of ids) {
      failures.push(...validateDuplicateVariantGovernance(readManifest(id), id));
    }
  }
  assert.deepEqual(failures, []);
});

test('the SRC 108 harness gate passes with the §7 check wired in', () => {
  const result = spawnSync(process.execPath, ['src/08_harness/validate-layout.mjs'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, (result.stderr ?? '') + (result.stdout ?? ''));
  assert.match(result.stdout, /SRC_108_HARNESS_GATE=PASS/);
  assert.match(result.stdout, /ACTIVE_SOURCE_COUNT=11/);
  assert.match(result.stdout, /ACTIVE_CODEX_COUNT=1/);
});

test('the Codex governance gate passes on the real tree', () => {
  assert.deepEqual(validateCodexDuplicateVariantGovernance({ repoRoot, codexDirs: ['CDX014'] }), []);
});

test('both template defaults keep UNRESOLVED and still validate', () => {
  for (const template of [
    'src/03_sources/_template/manifest.example.json',
    'src/04_codex/_template/manifest.example.json',
  ]) {
    const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, template), 'utf8'));
    assert.equal(manifest.duplicate_variant_status, 'UNRESOLVED', template);
    assert.deepEqual(validateDuplicateVariantGovernance(manifest, template), []);
  }
});

test('misfire: a value outside the vocabulary fails closed', () => {
  const manifest = readManifest('SRC056');
  const failures = validateDuplicateVariantGovernance({ ...manifest, duplicate_variant_status: 'DUPLICATE_MEDIA_VARIANT' }, 'SRC056');
  assert.equal(failures.length, 1);
  assert.match(failures[0], /duplicate_variant_status "DUPLICATE_MEDIA_VARIANT" is outside the adopted vocabulary/);
  assert.match(failures[0], /SINGLE_EXECUTABLE_NO_DUPLICATE \| DUPLICATE_COPY_SAME_SHA \| PATH_CONTEXT_VARIANT_ONLY \| DUAL_MEDIA_VARIANT/);
});

test('misfire: a non-UNRESOLVED status with no note fails closed', () => {
  const manifest = readManifest('SRC056');
  const { duplicate_variant_note, ...rest } = manifest;
  const failures = validateDuplicateVariantGovernance(rest, 'SRC056');
  assert.deepEqual(failures, ['SRC056: duplicate_variant_status "SINGLE_EXECUTABLE_NO_DUPLICATE" requires duplicate_variant_note']);
});

test('misfire: a non-UNRESOLVED status whose note carries no readback reference fails closed', () => {
  const manifest = readManifest('SRC056');
  const note = compliantReadbackNote();
  for (const [field, replaced] of [
    ['ref', null],
    ['verified_at_utc', null],
    ['verified_by', null],
  ]) {
    note.readback[field] = replaced;
    const failures = validateDuplicateVariantGovernance({ ...manifest, duplicate_variant_note: note }, 'SRC056');
    assert.equal(failures.length, 1, `${field}`);
    assert.match(failures[0], new RegExp(`requires duplicate_variant_note citing a CENTRAL_FRESH_DRIVE_READBACK readback`));
  }
});

test('misfire: a readback in any other verification mode fails closed', () => {
  for (const mode of [undefined, 'LOCAL_RCLONE_READBACK', 'CENTRAL_STALE_READBACK']) {
    const note = compliantReadbackNote();
    delete note.readback.verification_mode;
    if (mode !== undefined) note.readback.verification_mode = mode;
    const failures = validateDuplicateVariantGovernance(
      { ...readManifest('SRC064'), duplicate_variant_note: note },
      'SRC064',
    );
    assert.equal(failures.length, 1, String(mode));
    assert.match(failures[0], /CENTRAL_FRESH_DRIVE_READBACK readback/);
  }
});

test('open state and absent field stay valid (template default, new capsule)', () => {
  assert.deepEqual(validateDuplicateVariantGovernance({ duplicate_variant_status: 'UNRESOLVED' }, 'SRC999'), []);
  assert.deepEqual(validateDuplicateVariantGovernance({}, 'SRC999'), []);
  assert.deepEqual(validateDuplicateVariantGovernance({ duplicate_variant_status: 'UNRESOLVED', duplicate_variant_note: undefined }, 'SRC999'), []);
});

test('follow_up_adjudication is accepted as the alternative evidence basis (CDX014 shape)', () => {
  const manifest = {
    source_id: 'CDX014',
    duplicate_variant_status: 'PATH_CONTEXT_VARIANT_ONLY',
    duplicate_variant_note: followUpOnlyNote(),
  };
  assert.deepEqual(validateDuplicateVariantGovernance(manifest, 'CDX014'), []);
  assert.deepEqual(validateDuplicateVariantGovernance(readManifest('CDX014'), 'CDX014'), [], 'real CDX014 manifest');
});

test('misfire: an incomplete follow_up_adjudication block fails closed', () => {
  for (const [field, replaced] of [['finding', null], ['by', ''], ['basis', '   '], ['at_utc', undefined]]) {
    const note = followUpOnlyNote();
    if (replaced === null) delete note.follow_up_adjudication[field];
    else note.follow_up_adjudication[field] = replaced;
    const failures = validateDuplicateVariantGovernance(
      { source_id: 'CDX014', duplicate_variant_status: 'PATH_CONTEXT_VARIANT_ONLY', duplicate_variant_note: note },
      'CDX014',
    );
    assert.equal(failures.length, 1, `${field}=${String(replaced)}`);
    assert.match(failures[0], /structurally valid follow_up_adjudication block/);
  }
});

test('gate integration: deleting the note on a cloned capsule is caught by validateSourceCapsules', () => {
  const root = cloneSource('SRC056', 'SRC999');
  try {
    const baseline = validateSourceCapsules({
      repoRoot: root,
      sourceDirs: ['SRC999'],
      phase: 'ROLLOUT',
      calibrationSet: new Set(['SRC064', 'SRC058', 'SRC057', 'SRC056', 'SRC060']),
    });
    assert.deepEqual(baseline, [], 'clone validates before mutation');

    mutateManifest(root, 'SRC999', (manifest) => {
      delete manifest.duplicate_variant_note;
    });
    const failures = validateSourceCapsules({
      repoRoot: root,
      sourceDirs: ['SRC999'],
      phase: 'ROLLOUT',
      calibrationSet: new Set(['SRC064', 'SRC058', 'SRC057', 'SRC056', 'SRC060']),
    });
    assert.deepEqual(failures, ['SRC999: duplicate_variant_status "SINGLE_EXECUTABLE_NO_DUPLICATE" requires duplicate_variant_note']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('gate integration: widening the value on a cloned capsule is caught by validateSourceCapsules', () => {
  const root = cloneSource('SRC064', 'SRC998');
  try {
    mutateManifest(root, 'SRC998', (manifest) => {
      manifest.duplicate_variant_status = 'DUAL_VARIANT';
    });
    const failures = validateSourceCapsules({
      repoRoot: root,
      sourceDirs: ['SRC998'],
      phase: 'ROLLOUT',
      calibrationSet: new Set(['SRC064', 'SRC058', 'SRC057', 'SRC056', 'SRC060']),
    });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /duplicate_variant_status "DUAL_VARIANT" is outside the adopted vocabulary/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('gate integration: the check does not fire for an UNRESOLVED capsule with no note', () => {
  const root = cloneSource('SRC056', 'SRC997');
  try {
    mutateManifest(root, 'SRC997', (manifest) => {
      delete manifest.duplicate_variant_note;
      manifest.duplicate_variant_status = 'UNRESOLVED';
    });
    const failures = validateSourceCapsules({
      repoRoot: root,
      sourceDirs: ['SRC997'],
      phase: 'ROLLOUT',
      calibrationSet: new Set(['SRC064', 'SRC058', 'SRC057', 'SRC056', 'SRC060']),
    }).filter((failure) => /duplicate_variant/.test(failure));
    assert.deepEqual(failures, [], 'UNRESOLVED without a note is the open state, not a failure');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
