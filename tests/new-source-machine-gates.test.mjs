import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateCapsule } from '../scripts/new/validate-source-capsule.mjs';
import { validateRuntimePolicy } from '../scripts/new/validate-source-runtime-policy.mjs';
import { authoritySummary, stableJson } from '../scripts/new/source-gate-lib.mjs';

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function makeCapsule({ adoptionStatus = 'ADOPTED', duplicateStatus = 'CLEAR', s0 = 'PASS', largeInline = false, largeInlineException = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lovetree-new-gate-'));
  const capsuleRoot = path.join(root, 'SRC999');
  fs.mkdirSync(capsuleRoot, { recursive: true });
  const rawDir = path.join(capsuleRoot, 'SRC999-01-raw');
  fs.mkdirSync(rawDir, { recursive: true });
  const rawBytes = Buffer.from('<!doctype html><style>body{margin:0}</style><script>window.x=1</script>');
  const rawPath = path.join(rawDir, 'SRC999-01-01-original.html');
  fs.writeFileSync(rawPath, rawBytes);
  const rawHash = sha256(rawBytes);

  const authority = {
    SCHEMA_VERSION: '1.0',
    RECORD_REVISION: 1,
    CAPSULE_ID: 'SRC999',
    SOURCE_FAMILY: 'Synthetic Gate Fixture',
    SOURCE_REVISION: 'V1.0',
    AUTHORITY: {
      MODE: 'EXACT_COPY',
      FOLDER_NAME: '999_fixture',
      FILE_NAME: 'fixture.html',
      BYTES: rawBytes.length,
      SHA256: rawHash,
      CAPTURED_AT: '2026-08-30T00:00:00Z',
      MIME_TYPE: 'text/html',
      DRIVE_FOLDER_ID: 'fixture-folder-id',
      DRIVE_FILE_ID: 'fixture-file-id',
      ORIGINAL_LOCATION: null
    },
    ADOPTION: {
      STATUS: adoptionStatus,
      DECISION_SOURCE: adoptionStatus === 'ADOPTED' ? 'OWNER' : 'UNRESOLVED',
      ADOPTED_REVISION: adoptionStatus === 'ADOPTED' ? 'V1.0' : null,
      EVIDENCE_REF: adoptionStatus === 'ADOPTED' ? 'issue:#test' : null
    },
    DUPLICATES: { STATUS: duplicateStatus, ALTERNATIVES: [] }
  };

  fs.writeFileSync(path.join(capsuleRoot, 'SRC999-00-authority.json'), `${JSON.stringify(authority, null, 2)}\n`);
  fs.writeFileSync(path.join(capsuleRoot, 'SRC999-00-authority-summary.json'), stableJson(authoritySummary(authority)));

  const payloadBytes = largeInline ? 1_048_576 : 64;
  const manifest = {
    MANIFEST_SCHEMA_VERSION: '2.0',
    CAPSULE_ID: 'SRC999',
    TYPE: 'SOURCE_CAPSULE',
    IDENTITY_TOKEN: '999',
    BASE_NUMBER: 999,
    VARIANT_TOKEN: null,
    TITLE: 'Synthetic Gate Fixture',
    SOURCE_REVISION: 'V1.0',
    RAW_MODE: 'EXACT_COPY',
    AUTHORITY_RECORD: 'SRC999-00-authority.json',
    RAW_FILES: [{
      PATH: 'SRC999-01-raw/SRC999-01-01-original.html',
      ROLE: 'authority-original',
      MIME_TYPE: 'text/html',
      BYTES: rawBytes.length,
      SHA256: rawHash,
      DRIVE_FILE_ID: 'fixture-file-id',
      INTAKE_MODE: 'EXACT_COPY'
    }],
    ASSETS: [],
    EXTERNAL_DEPENDENCIES: [],
    INLINE_PAYLOADS: {
      INLINE_CSS: { present: true, count: 1, encoded_bytes: 0, decoded_bytes: payloadBytes },
      INLINE_JS: { present: true, count: 1, encoded_bytes: 0, decoded_bytes: 32 },
      INLINE_MEDIA: { present: false, count: 0, encoded_bytes: 0, decoded_bytes: 0 },
      LARGE_INLINE_THRESHOLD_BYTES: 1_048_576,
      LARGE_INLINE_EXCEPTION: largeInlineException
    },
    RELATIONS: [],
    WORKFLOW_STATUS: {
      IDENTITY_VERIFIED: s0,
      RAW_AUTHORITY_LOCKED: s0 === 'PASS' ? 'PASS' : 'NOT_STARTED',
      BASELINE_A_PRESENT: 'NOT_STARTED',
      MECHANICAL_PORT_COMPLETE: 'NOT_STARTED',
      SOURCE_PORT_PARITY: 'NOT_STARTED',
      PRODUCT_USAGE: 'NONE'
    }
  };
  fs.writeFileSync(path.join(capsuleRoot, 'SRC999-00-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return capsuleRoot;
}

function setBaselineStatus(capsuleRoot, value) {
  const manifestPath = path.join(capsuleRoot, 'SRC999-00-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.WORKFLOW_STATUS.BASELINE_A_PRESENT = value;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function makeRuntime(capsuleRoot, { react = false, tsx = false } = {}) {
  const runtime = path.join(capsuleRoot, 'SRC999-02-runtime');
  fs.mkdirSync(runtime, { recursive: true });
  fs.writeFileSync(path.join(runtime, 'SRC999-02-01-index.html'), '<!doctype html><link rel="stylesheet" href="SRC999-02-02-styles.css"><script src="SRC999-02-03-app.js"></script>');
  fs.writeFileSync(path.join(runtime, 'SRC999-02-02-styles.css'), 'body{margin:0}');
  fs.writeFileSync(path.join(runtime, 'SRC999-02-03-app.js'), react ? "import React from 'react';\nwindow.x=1;\n" : 'window.x=1;\n');
  if (tsx) fs.writeFileSync(path.join(runtime, 'ConvertedSurface.tsx'), 'export default function ConvertedSurface(){return <div/>}');
}

test('S0/S1 passes only with explicit adopted authority and exact raw binding', () => {
  const capsule = makeCapsule();
  const result = validateCapsule(capsule);
  assert.equal(result.capsuleId, 'SRC999');
  assert.equal(result.workflow.IDENTITY_VERIFIED, 'PASS');
  assert.equal(result.workflow.RAW_AUTHORITY_LOCKED, 'PASS');
});

test('unresolved adoption cannot claim S0 PASS', () => {
  const capsule = makeCapsule({ adoptionStatus: 'UNRESOLVED', s0: 'PASS' });
  assert.throws(() => validateCapsule(capsule), /S0 PASS forbidden|ambiguous authority/);
});

test('open duplicate authority cannot claim S0 PASS', () => {
  const capsule = makeCapsule({ duplicateStatus: 'OPEN', s0: 'PASS' });
  assert.throws(() => validateCapsule(capsule), /S0 PASS forbidden|ambiguous authority/);
});

test('large inline EXACT_COPY requires explicit owner exception', () => {
  const capsule = makeCapsule({ largeInline: true });
  assert.throws(() => validateCapsule(capsule), /owner-authorized exception/);
});

test('large inline owner exception permits deterministic EXACT_COPY policy', () => {
  const capsule = makeCapsule({
    largeInline: true,
    largeInlineException: { AUTHORIZED_BY: 'OWNER', EVIDENCE_REF: 'issue:#test', REASON: 'fixture proves explicit exception path' }
  });
  assert.equal(validateCapsule(capsule).workflow.IDENTITY_VERIFIED, 'PASS');
});

test('runtime files cannot appear before baseline S2 PASS', () => {
  const capsule = makeCapsule();
  makeRuntime(capsule);
  assert.throws(() => validateRuntimePolicy(capsule), /S3 work cannot begin before S2 PASS/);
});

test('structural runtime rejects TSX framework conversion even after S2', () => {
  const capsule = makeCapsule();
  setBaselineStatus(capsule, 'PASS');
  makeRuntime(capsule, { tsx: true });
  assert.throws(() => validateRuntimePolicy(capsule), /FRAMEWORK_CONVERSION_FORBIDDEN/);
});

test('structural runtime rejects React imports even in .js files', () => {
  const capsule = makeCapsule();
  setBaselineStatus(capsule, 'PASS');
  makeRuntime(capsule, { react: true });
  assert.throws(() => validateRuntimePolicy(capsule), /REACT_NEXT_FORBIDDEN/);
});

test('plain HTML CSS JS runtime is permitted after S2', () => {
  const capsule = makeCapsule();
  setBaselineStatus(capsule, 'PASS');
  makeRuntime(capsule);
  assert.equal(validateRuntimePolicy(capsule).runtimeFiles, 3);
});
