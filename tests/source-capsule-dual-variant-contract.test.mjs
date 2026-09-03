import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateSourceCapsules } from '../src/08_harness/source-capsule-validator.mjs';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const ROOT = path.join(import.meta.dirname, '..');

function writeJson(root, relative, value) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

function variantEntry(overrides = {}) {
  return {
    drive_file_id: 'file-68',
    filename: 'original.html',
    bytes: 32,
    sha256: '0'.repeat(64),
    revision: 'V1',
    ...overrides,
  };
}

function makeDualFixture({ sourceId = 'SRC068', mutate } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lovetree-dual-'));
  const originalA = Buffer.from('<!doctype html><title>A</title>\n');
  const originalB = Buffer.from('<!doctype html><title>Bb</title>\n');
  const digestA = sha256(originalA);
  const digestB = sha256(originalB);
  const variants = {
    A: { drive_file_id: 'file-68a', filename: 'a.html', bytes: originalA.length, sha256: digestA, revision: 'VA' },
    B: { drive_file_id: 'file-68b', filename: 'b.html', bytes: originalB.length, sha256: digestB, revision: 'VB' },
  };
  const selector = { selector: 'mediaVariant', allowed_values: ['A', 'B'], default: null, fail_closed: true };
  const manifest = {
    schema_version: '1.1',
    source_id: sourceId,
    authority_mode: 'DUAL_VARIANT',
    authority: { drive_folder_id: 'folder-68', status: 'LOCKED', variants: JSON.parse(JSON.stringify(variants)) },
    variant_selector: JSON.parse(JSON.stringify(selector)),
    stages: { identity_verified: true, raw_authority_locked: true, baseline_captured: true, mechanical_split_complete: true, source_split_parity_pass: false },
    runtime_policy: 'HTML_CSS_JS_MECHANICAL_ONLY',
    tsx_allowed_during_split: false,
  };
  const authority = {
    schema_version: '1.0',
    source_id: sourceId,
    authority_mode: 'DUAL_VARIANT',
    authority_status: 'LOCKED',
    drive_folder_id: 'folder-68',
    variant_selector: JSON.parse(JSON.stringify(selector)),
    variants: JSON.parse(JSON.stringify(variants)),
  };
  const readback = {
    schema_version: '1.0',
    source_id: sourceId,
    verification_mode: 'CENTRAL_FRESH_DRIVE_READBACK',
    variants: {
      A: { folder_id: 'folder-68', file_id: 'file-68a', filename: 'a.html', bytes: originalA.length, sha256: digestA },
      B: { folder_id: 'folder-68', file_id: 'file-68b', filename: 'b.html', bytes: originalB.length, sha256: digestB },
    },
  };
  const capsule = { root, sourceId, manifest, authority, readback, originalA, originalB, digestA, digestB };
  if (typeof mutate === 'function') mutate(capsule);
  writeJson(root, `src/03_sources/${sourceId}/manifest.json`, capsule.manifest);
  writeJson(root, `src/03_sources/${sourceId}/authority/authority.json`, capsule.authority);
  const shaPath = path.join(root, `src/03_sources/${sourceId}/authority/sha256.txt`);
  fs.mkdirSync(path.dirname(shaPath), { recursive: true });
  fs.writeFileSync(shaPath, `${capsule.digestA}  original/A/original.html\n${capsule.digestB}  original/B/original.html\n`);
  for (const [key, buf] of [['A', capsule.originalA], ['B', capsule.originalB]]) {
    const target = path.join(root, `src/03_sources/${sourceId}/original/${key}/original.html`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buf);
  }
  writeJson(root, `src/03_sources/${sourceId}/evidence/source/drive-authority-readback.json`, capsule.readback);
  writeJson(root, `src/03_sources/${sourceId}/baseline/capture-plan.json`, { status: 'ACCEPTED' });
  writeJson(root, `src/03_sources/${sourceId}/baseline/accepted-baseline.json`, {
    status: 'ACCEPTED',
    source_id: sourceId,
    authority: { variants: { A: { bytes: capsule.originalA.length, sha256: capsule.digestA }, B: { bytes: capsule.originalB.length, sha256: capsule.digestB } } },
  });
  for (const name of ['split/index.html', 'split/styles.css', 'split/script.js']) {
    const target = path.join(root, `src/03_sources/${sourceId}/${name}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '<!-- split -->\n');
  }
  writeJson(root, `src/03_sources/${sourceId}/split/materialization.json`, {
    source_id: sourceId,
    authority_mode: 'DUAL_VARIANT',
    status: 'MATERIALIZED_PENDING_PARITY',
    authority: { variants: { A: { bytes: capsule.originalA.length, sha256: capsule.digestA }, B: { bytes: capsule.originalB.length, sha256: capsule.digestB } } },
    variant_selector: JSON.parse(JSON.stringify(selector)),
  });
  return capsule;
}

function check(root, sourceId) {
  return validateSourceCapsules({ repoRoot: root, sourceDirs: [sourceId], phase: 'ROLLOUT', calibrationSet: new Set() });
}

test('existing single-authority capsules on the current tree still validate unchanged', () => {
  const sourceRoot = path.join(ROOT, 'src', '03_sources');
  const singles = fs.readdirSync(sourceRoot).filter((id) => /^SRC\d{3}$/.test(id) && id !== 'SRC068').sort();
  assert.ok(singles.length > 0, 'expected single-authority capsules on the current tree');
  const failures = validateSourceCapsules({
    repoRoot: ROOT,
    sourceDirs: singles,
    phase: 'ROLLOUT',
    calibrationSet: new Set(['SRC064', 'SRC058', 'SRC057', 'SRC056', 'SRC060']),
  });
  assert.deepEqual(failures, []);
});

test('dual-variant positive fixture validates clean', () => {
  const { root, sourceId } = makeDualFixture();
  try {
    assert.deepEqual(check(root, sourceId), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects LOCAL rclone evidence as authority readback (CENTRAL fresh required)', () => {
  const { root, sourceId } = makeDualFixture({
    mutate: (capsule) => {
      capsule.readback.verification_mode = 'LOCAL_RCLONE_DRIVE_READBACK';
    },
  });
  try {
    const failures = check(root, sourceId);
    assert.ok(
      failures.some((message) => message.includes('CENTRAL_FRESH_DRIVE_READBACK')),
      'LOCAL-only readback must fail with a CENTRAL fresh Drive authority requirement',
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects unknown authority mode', () => {
  const { root, sourceId } = makeDualFixture({
    mutate: (capsule) => {
      capsule.manifest.authority_mode = 'TRIPLE';
      capsule.authority.authority_mode = 'TRIPLE';
    },
  });
  try {
    assert.ok(check(root, sourceId).some((message) => message.includes('unknown authority_mode')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects authority_mode disagreement between manifest and authority', () => {
  const { root, sourceId } = makeDualFixture({
    mutate: (capsule) => {
      capsule.authority.authority_mode = 'SINGLE';
    },
  });
  try {
    const failures = check(root, sourceId);
    assert.ok(failures.some((message) => message.includes('authority_mode disagreement')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects a manifest with only variant A', () => {
  const { root, sourceId } = makeDualFixture({
    mutate: (capsule) => {
      delete capsule.manifest.authority.variants.B;
      delete capsule.authority.variants.B;
    },
  });
  try {
    assert.ok(check(root, sourceId).some((message) => message.includes('exactly variants A and B')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects a third variant C', () => {
  const { root, sourceId } = makeDualFixture({
    mutate: (capsule) => {
      capsule.manifest.authority.variants.C = variantEntry();
      capsule.authority.variants.C = variantEntry();
    },
  });
  try {
    assert.ok(check(root, sourceId).some((message) => message.includes('exactly variants A and B')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects wrong A SHA', () => {
  const { root, sourceId } = makeDualFixture({
    mutate: (capsule) => {
      capsule.manifest.authority.variants.A.sha256 = '1'.repeat(64);
    },
  });
  try {
    const failures = check(root, sourceId);
    assert.ok(failures.some((message) => message.includes('variant A') && message.includes('SHA256')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects wrong B SHA', () => {
  const { root, sourceId } = makeDualFixture({
    mutate: (capsule) => {
      capsule.authority.variants.B.sha256 = '2'.repeat(64);
    },
  });
  try {
    const failures = check(root, sourceId);
    assert.ok(failures.some((message) => message.includes('variant B') && message.includes('SHA256')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects default variant A', () => {
  const { root, sourceId } = makeDualFixture({
    mutate: (capsule) => {
      capsule.manifest.variant_selector.default = 'A';
      capsule.authority.variant_selector.default = 'A';
    },
  });
  try {
    assert.ok(check(root, sourceId).some((message) => message.includes('default variant must be null')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects default variant B', () => {
  const { root, sourceId } = makeDualFixture({
    mutate: (capsule) => {
      capsule.manifest.variant_selector.default = 'B';
      capsule.authority.variant_selector.default = 'B';
    },
  });
  try {
    assert.ok(check(root, sourceId).some((message) => message.includes('default variant must be null')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects invalid selector values', () => {
  const { root, sourceId } = makeDualFixture({
    mutate: (capsule) => {
      capsule.manifest.variant_selector.allowed_values = ['A', 'C'];
      capsule.authority.variant_selector.allowed_values = ['A', 'C'];
    },
  });
  try {
    assert.ok(check(root, sourceId).some((message) => message.includes('allowed_values must be exactly')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects fail_closed other than true', () => {
  const { root, sourceId } = makeDualFixture({
    mutate: (capsule) => {
      capsule.manifest.variant_selector.fail_closed = false;
      capsule.authority.variant_selector.fail_closed = false;
    },
  });
  try {
    assert.ok(check(root, sourceId).some((message) => message.includes('fail_closed must be true')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects a derived SRC068-A source identity', () => {
  const { root, sourceId } = makeDualFixture({
    mutate: (capsule) => {
      capsule.manifest.legacy_note = 'migrated from SRC068-A';
    },
  });
  try {
    assert.ok(check(root, sourceId).some((message) => message.includes('derives a variant Source identity')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects sha256.txt missing the B hash', () => {
  const { root, sourceId } = makeDualFixture();
  try {
    const shaPath = path.join(root, `src/03_sources/${sourceId}/authority/sha256.txt`);
    const lines = fs.readFileSync(shaPath, 'utf8').split('\n').filter((line) => !line.includes('original/B/'));
    fs.writeFileSync(shaPath, `${lines.join('\n')}\n`);
    assert.ok(check(root, sourceId).some((message) => message.includes('sha256.txt missing variant B hash')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects missing original B', () => {
  const { root, sourceId } = makeDualFixture();
  try {
    fs.rmSync(path.join(root, `src/03_sources/${sourceId}/original/B`), { recursive: true, force: true });
    assert.ok(check(root, sourceId).some((message) => message.includes('original/B/original.html')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dual rejects missing original A', () => {
  const { root, sourceId } = makeDualFixture();
  try {
    fs.rmSync(path.join(root, `src/03_sources/${sourceId}/original/A`), { recursive: true, force: true });
    assert.ok(check(root, sourceId).some((message) => message.includes('original/A/original.html')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
