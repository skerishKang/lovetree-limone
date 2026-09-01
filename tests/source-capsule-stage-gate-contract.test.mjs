import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateSourceCapsules } from '../src/08_harness/source-capsule-validator.mjs';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function writeJson(root, relative, value) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

function makeS1Fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lovetree-s1-'));
  const sourceId = 'SRC047';
  const original = Buffer.from('<!doctype html><title>S1</title>\n');
  const digest = sha256(original);
  const authority = {
    drive_folder_id: 'folder-47',
    drive_file_id: 'file-47',
    filename: 'original.html',
    bytes: original.length,
    sha256: digest,
    revision: 'V4.2.5',
    status: 'LOCKED',
  };
  writeJson(root, `src/03_sources/${sourceId}/manifest.json`, {
    schema_version: '1.0',
    source_id: sourceId,
    source_folder_name: 'fixture',
    source_path: 'fixture/original.html',
    authority,
    master_rows: ['MST098'],
    family_ref: null,
    duplicate_variant_status: 'UNRESOLVED',
    stages: {
      identity_verified: true,
      raw_authority_locked: true,
      baseline_captured: false,
      mechanical_split_complete: false,
      source_split_parity_pass: false,
    },
    runtime_policy: 'HTML_CSS_JS_MECHANICAL_ONLY',
    tsx_allowed_during_split: false,
  });
  writeJson(root, `src/03_sources/${sourceId}/authority/authority.json`, {
    schema_version: '1.0',
    source_id: sourceId,
    authority_system: 'Google Drive',
    authority_status: 'LOCKED',
    drive_folder_id: authority.drive_folder_id,
    drive_file_id: authority.drive_file_id,
    filename: authority.filename,
    revision: authority.revision,
    mime_type: 'text/html',
    bytes: authority.bytes,
    sha256: digest,
  });
  const originalPath = path.join(root, `src/03_sources/${sourceId}/original/original.html`);
  fs.mkdirSync(path.dirname(originalPath), { recursive: true });
  fs.writeFileSync(originalPath, original);
  const shaPath = path.join(root, `src/03_sources/${sourceId}/authority/sha256.txt`);
  fs.mkdirSync(path.dirname(shaPath), { recursive: true });
  fs.writeFileSync(shaPath, `${digest}  original/original.html\n`);
  writeJson(root, `src/03_sources/${sourceId}/evidence/source/drive-authority-readback.json`, {
    schema_version: '1.0',
    source_id: sourceId,
    verification_mode: 'CENTRAL_FRESH_DRIVE_READBACK',
    fresh_drive: {
      folder_id: authority.drive_folder_id,
      file_id: authority.drive_file_id,
      filename: authority.filename,
      mime_type: 'text/html',
      bytes: authority.bytes,
      sha256: digest,
    },
  });
  return { root, sourceId };
}

test('ROLLOUT accepts a truthful S1-only source capsule without S2/S3/S4 files', () => {
  const { root, sourceId } = makeS1Fixture();
  try {
    assert.deepEqual(validateSourceCapsules({ repoRoot: root, sourceDirs: [sourceId], phase: 'ROLLOUT', calibrationSet: new Set() }), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('stage ordering remains fail-closed when S3 is asserted before S2', () => {
  const { root, sourceId } = makeS1Fixture();
  try {
    const manifestPath = path.join(root, `src/03_sources/${sourceId}/manifest.json`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.stages.mechanical_split_complete = true;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const failures = validateSourceCapsules({ repoRoot: root, sourceDirs: [sourceId], phase: 'ROLLOUT', calibrationSet: new Set() });
    assert.ok(failures.some((message) => message.includes('stage ordering violated at mechanical_split_complete')));
    assert.ok(failures.some((message) => message.includes('mechanical split cannot precede accepted baseline')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
