import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { assertExactHeadBinding } from '../scripts/new/validate-exact-head.mjs';
import { validateCapsule } from '../scripts/new/validate-source-capsule.mjs';
import { validateRuntimePolicy } from '../scripts/new/validate-source-runtime-policy.mjs';
import { validateRecoveryImport } from '../scripts/new/validate-source-recovery-import.mjs';
import {
  assertIndependentBC,
  assertVerificationBinding,
  validateParityStatuses
} from '../scripts/new/validate-source-promotion.mjs';
import {
  REQUIRED_NEW_CHECKS,
  validateOldRepairPromotion,
  validateRepositoryEnforcement,
  validateRequiredCheckStates
} from '../scripts/new/validate-source-system-readiness.mjs';
import { authoritySummary, stableJson } from '../scripts/new/source-gate-lib.mjs';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const liveEvidencePaths = new Map();

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function mutateFile(filePath, edit) {
  const value = readJson(filePath);
  edit(value);
  writeJson(filePath, value);
}

function makeCapsule({
  capsuleId = 'SRC056',
  family = 'Vertical Moment Relationship Network Overview',
  title = 'Vertical Moment Relationship Network Overview',
  adoptionStatus = 'ADOPTED',
  duplicateStatus = 'CLEAR',
  s0 = 'PASS',
  largeInline = false,
  largeInlineException = null,
  live = true,
  liveOverrides = {}
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lovetree-new-gate-'));
  const capsuleRoot = path.join(root, capsuleId);
  fs.mkdirSync(capsuleRoot, { recursive: true });
  const rawDir = path.join(capsuleRoot, `${capsuleId}-01-raw`);
  fs.mkdirSync(rawDir, { recursive: true });
  const rawBytes = Buffer.from('<!doctype html><style>body{margin:0}</style><script>window.x=1</script>');
  const rawPath = path.join(rawDir, `${capsuleId}-01-01-original.html`);
  fs.writeFileSync(rawPath, rawBytes);
  const rawHash = sha256(rawBytes);
  const baseNumber = Number(capsuleId.slice(3));

  const authority = {
    SCHEMA_VERSION: '1.0',
    RECORD_REVISION: 1,
    CAPSULE_ID: capsuleId,
    SOURCE_FAMILY: family,
    SOURCE_REVISION: 'V1.0',
    AUTHORITY: {
      MODE: 'EXACT_COPY',
      FOLDER_NAME: `${baseNumber}_fixture`,
      FILE_NAME: 'fixture.html',
      BYTES: rawBytes.length,
      SHA256: rawHash,
      CAPTURED_AT: new Date().toISOString(),
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

  const authorityPath = path.join(capsuleRoot, `${capsuleId}-00-authority.json`);
  writeJson(authorityPath, authority);
  fs.writeFileSync(path.join(capsuleRoot, `${capsuleId}-00-authority-summary.json`), stableJson(authoritySummary(authority)));
  const authorityHash = sha256(fs.readFileSync(authorityPath));

  if (live) {
    const liveRecord = {
      SCHEMA_VERSION: '1.0',
      CAPSULE_ID: capsuleId,
      AUTHORITY_RECORD_SHA256: authorityHash,
      AUTHORITY_RECORD_REVISION: 1,
      OBSERVATION_MODE: 'GOOGLE_DRIVE_LIVE_BOUNDED_READ',
      DRIVE_FOLDER_ID: 'fixture-folder-id',
      DRIVE_FILE_ID: 'fixture-file-id',
      OBSERVED_BYTES: rawBytes.length,
      OBSERVED_SHA256: rawHash,
      OBSERVED_AT: new Date().toISOString(),
      VERIFIER: 'WEB',
      EVIDENCE_REF: 'drive:test-live-read',
      STATUS: 'PASS',
      ...liveOverrides
    };
    const livePath = path.join(root, `${capsuleId}-live-authority.json`);
    writeJson(livePath, liveRecord);
    liveEvidencePaths.set(capsuleRoot, livePath);
  }

  const payloadBytes = largeInline ? 1_048_576 : 64;
  const manifest = {
    MANIFEST_SCHEMA_VERSION: '2.0',
    CAPSULE_ID: capsuleId,
    TYPE: 'SOURCE_CAPSULE',
    IDENTITY_TOKEN: String(baseNumber),
    BASE_NUMBER: baseNumber,
    VARIANT_TOKEN: null,
    TITLE: title,
    SOURCE_REVISION: 'V1.0',
    RAW_MODE: 'EXACT_COPY',
    AUTHORITY_RECORD: `${capsuleId}-00-authority.json`,
    LIVE_AUTHORITY_MODE: 'TRUSTED_CI_EPHEMERAL',
    RECOVERY_IMPORT_RECORD: null,
    RAW_FILES: [{
      PATH: `${capsuleId}-01-raw/${capsuleId}-01-01-original.html`,
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
  writeJson(path.join(capsuleRoot, `${capsuleId}-00-manifest.json`), manifest);
  return capsuleRoot;
}

function livePathFor(capsuleRoot) {
  return liveEvidencePaths.get(capsuleRoot) ?? null;
}

function validateFixture(capsuleRoot) {
  return validateCapsule(capsuleRoot, { liveAuthorityPath: livePathFor(capsuleRoot) });
}

function mutate(capsuleRoot, suffix, edit) {
  const capsuleId = path.basename(capsuleRoot);
  mutateFile(path.join(capsuleRoot, `${capsuleId}${suffix}`), edit);
}

function setWorkflow(capsuleRoot, patch) {
  mutate(capsuleRoot, '-00-manifest.json', (manifest) => Object.assign(manifest.WORKFLOW_STATUS, patch));
}

function makeRuntime(capsuleRoot, { react = false, tsx = false } = {}) {
  const capsuleId = path.basename(capsuleRoot);
  const runtime = path.join(capsuleRoot, `${capsuleId}-02-runtime`);
  fs.mkdirSync(runtime, { recursive: true });
  fs.writeFileSync(path.join(runtime, `${capsuleId}-02-01-index.html`), `<!doctype html><link rel="stylesheet" href="${capsuleId}-02-02-styles.css"><script src="${capsuleId}-02-03-app.js"></script>`);
  fs.writeFileSync(path.join(runtime, `${capsuleId}-02-02-styles.css`), 'body{margin:0}');
  fs.writeFileSync(path.join(runtime, `${capsuleId}-02-03-app.js`), react ? "import React from 'react';\nwindow.x=1;\n" : 'window.x=1;\n');
  if (tsx) fs.writeFileSync(path.join(runtime, 'ConvertedSurface.tsx'), 'export default function ConvertedSurface(){return <div/>}');
}

function passingParity(overrides = {}) {
  return {
    GEOMETRY_STATUS: 'PASS',
    STYLE_STATUS: 'PASS',
    INTERACTION_STATUS: 'PASS',
    QUIRK_PRESERVATION_STATUS: 'PASS',
    REVIEW_STATUS: 'PASS',
    ...overrides
  };
}

// #564 mandatory 16-case fail-closed regression corpus.
test('01 WRONG_FAMILY_IN_NAMESPACE', () => {
  const capsule = makeCapsule({ capsuleId: 'SRC057', family: 'Living Character World', title: 'Living Character World' });
  assert.throws(() => validateFixture(capsule), /WRONG_FAMILY_IN_NAMESPACE/);
});

test('UNREGISTERED_SOURCE_IDENTITY', () => {
  const capsule = makeCapsule({ capsuleId: 'SRC999', family: 'Synthetic Gate Fixture', title: 'Synthetic Gate Fixture' });
  assert.throws(() => validateFixture(capsule), /UNREGISTERED_SOURCE_IDENTITY/);
});

test('02 DUPLICATE_AUTHORITY_UNRESOLVED', () => {
  const capsule = makeCapsule({ duplicateStatus: 'OPEN' });
  assert.throws(() => validateFixture(capsule), /S0 PASS forbidden|ambiguous or stale authority/);
});

test('03 REVISION_ADOPTION_AMBIGUOUS', () => {
  const capsule = makeCapsule({ adoptionStatus: 'UNRESOLVED' });
  assert.throws(() => validateFixture(capsule), /S0 PASS forbidden|ambiguous or stale authority/);
});

test('04 PR_BODY_MANIFEST_HEAD_DRIFT', () => {
  const capsule = makeCapsule();
  mutate(capsule, '-00-authority-summary.json', (summary) => { summary.SOURCE_FAMILY = 'stale-summary'; });
  assert.throws(() => validateFixture(capsule), /PR_BODY_MANIFEST_HEAD_DRIFT/);
});

test('05 DRIVE_AUTHORITY_TUPLE_STALE_OR_WRONG', () => {
  const capsule = makeCapsule();
  mutateFile(livePathFor(capsule), (record) => { record.DRIVE_FILE_ID = 'wrong-file-id'; });
  assert.throws(() => validateFixture(capsule), /live Drive file tuple mismatch/);
});

test('06 MANIFEST_SCHEMA_SHAPE_DRIFT', () => {
  const capsule = makeCapsule();
  mutate(capsule, '-00-manifest.json', (manifest) => { manifest.INLINE_PAYLOAD = {}; });
  assert.throws(() => validateFixture(capsule), /unsupported keys/);
});

test('07 REQUIRED_CHECK_CANCELLED_OR_MISSING', () => {
  const states = Object.fromEntries(REQUIRED_NEW_CHECKS.map((name) => [name, 'success']));
  states[REQUIRED_NEW_CHECKS[1]] = 'cancelled';
  assert.throws(() => validateRequiredCheckStates(states), /not success/);
  delete states[REQUIRED_NEW_CHECKS[0]];
  assert.throws(() => validateRequiredCheckStates(states), /required check missing/);
});

test('EXACT_HEAD_BINDING_REJECTS_SYNTHETIC_MERGE_SHA', () => {
  assert.equal(assertExactHeadBinding(SHA_A, SHA_A), true);
  assert.throws(() => assertExactHeadBinding(SHA_B, SHA_A), /EXACT_HEAD_BINDING_FAIL/);
});

test('08 OLD_REPAIR_WHILE_NEW_HOLD_ACTIVE', () => {
  assert.throws(() => validateOldRepairPromotion({ prNumber: 563, holdActive: true }), /OLD_REPAIR_WHILE_NEW_HOLD_ACTIVE/);
});

test('09 CI_GREEN_VISUAL_MISMATCH', () => {
  assert.throws(() => validateParityStatuses(passingParity({ GEOMETRY_STATUS: 'FAIL' }), 'SOURCE_TO_PORT'), /GEOMETRY_STATUS must PASS/);
});

test('10 B_C_SCREENSHOT_ALIAS', () => {
  const port = { ARTIFACTS: [{ ROLE: 'PORT_B', PATH: 'same.png', VIEWPORT: '1280x800', STATE: 'initial' }] };
  const product = { ARTIFACTS: [{ ROLE: 'PRODUCT_C', PATH: 'same.png', VIEWPORT: '1280x800', STATE: 'initial' }] };
  assert.throws(() => assertIndependentBC(port, product), /B_C_SCREENSHOT_ALIAS/);
});

test('11 SOURCE_INTENTIONAL_QUIRK_SILENTLY_FIXED', () => {
  assert.throws(() => validateParityStatuses(passingParity({ QUIRK_PRESERVATION_STATUS: 'FAIL' }), 'SOURCE_TO_PORT'), /QUIRK_PRESERVATION_STATUS must PASS/);
});

test('12 ADAPTER_CONTENT_CAUSES_GEOMETRY_DRIFT', () => {
  assert.throws(() => validateParityStatuses(passingParity({ GEOMETRY_STATUS: 'FAIL' }), 'SOURCE_TO_PRODUCT'), /GEOMETRY_STATUS must PASS/);
});

test('13 PRODUCT_SHELL_CLIPS_SOURCE', () => {
  assert.throws(() => validateParityStatuses(passingParity({ STYLE_STATUS: 'FAIL' }), 'SOURCE_TO_PRODUCT'), /STYLE_STATUS must PASS/);
});

test('14 VERIFICATION_STALE_AFTER_HEAD_CHANGE', () => {
  const record = {
    VERIFIER: 'WEB',
    SOURCE_SHA256: HASH_A,
    AUTHORITY_RECORD_SHA256: HASH_B,
    AUTHORITY_RECORD_REVISION: 1,
    EXACT_PORT_HEAD_SHA: SHA_A,
    EXACT_PRODUCT_HEAD_SHA: SHA_B,
    PARITY_RECORD_SHA256: HASH_A,
    EVIDENCE_MANIFEST_SHA256: HASH_B,
    STATUS: 'PASS'
  };
  assert.throws(() => assertVerificationBinding(record, {
    verifier: 'WEB',
    sourceSha: HASH_A,
    authorityHash: HASH_B,
    authorityRevision: 1,
    portHead: SHA_A,
    productHead: SHA_A,
    productParityHash: HASH_A,
    evidenceHash: HASH_B
  }), /VERIFICATION_STALE_AFTER_HEAD_CHANGE/);
});

test('15 SELF_DECLARED_PASS_WITHOUT_DERIVED_EVIDENCE', () => {
  const capsule = makeCapsule();
  setWorkflow(capsule, { BASELINE_A_PRESENT: 'PASS' });
  assert.throws(() => validateFixture(capsule), /S2 PASS requires baseline record/);
});

test('16 UNPROTECTED_PROMOTION_PATH', () => {
  assert.throws(() => validateRepositoryEnforcement({
    MAIN_PROTECTED: false,
    ACTIVE_RULESETS: [],
    REQUIRED_CHECKS: [],
    ADMIN_BYPASS_AUDITED: false
  }), /UNPROTECTED_PROMOTION_PATH/);
});

// Additional executable blockers called out by Luna Replay #2.
test('LIVE_AUTHORITY_STALE_AFTER_24H', () => {
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const capsule = makeCapsule({ liveOverrides: { OBSERVED_AT: old } });
  assert.throws(() => validateFixture(capsule), /stale \(>24h\)/);
});

test('S0_PASS_REQUIRES_TRUSTED_EPHEMERAL_LIVE_EVIDENCE', () => {
  const capsule = makeCapsule({ live: false });
  assert.throws(() => validateCapsule(capsule), /S0 PASS forbidden|ambiguous or stale authority/);
});

test('COMMITTED_LIVE_AUTHORITY_INSIDE_CAPSULE_IS_REJECTED', () => {
  const capsule = makeCapsule();
  const capsuleId = path.basename(capsule);
  const committedPath = path.join(capsule, `${capsuleId}-00-live-authority.json`);
  fs.copyFileSync(livePathFor(capsule), committedPath);
  assert.throws(() => validateCapsule(capsule, { liveAuthorityPath: committedPath }), /CI-ephemeral and outside the capsule tree/);
});

test('OLD_TO_NEW_RECOVERY_IMPORT_REQUIRES_SOURCE_CONTRACT_IMPACT_NONE', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lovetree-recovery-'));
  const recordPath = path.join(root, 'recovery.json');
  writeJson(recordPath, {
    SCHEMA_VERSION: '1.0',
    CAPSULE_ID: 'SRC999',
    SOURCE_SHA256: HASH_A,
    CREATED_AT: new Date().toISOString(),
    ITEMS: [{
      PATH: 'docs/historical.md',
      CLASSIFICATION: 'REPORT_ONLY',
      ORIGIN_REF: 'PR:#563',
      SOURCE_CONTRACT_IMPACT: 'CHANGED',
      SHA256: null
    }],
    STATUS: 'PASS'
  });
  assert.throws(() => validateRecoveryImport(recordPath, { capsuleId: 'SRC999', sourceSha: HASH_A, repoRoot: root }), /SOURCE_CONTRACT_IMPACT must be NONE/);
});

test('S0_S1_POSITIVE_EXPLICIT_ADOPTION_EPHEMERAL_LIVE_TUPLE_AND_RAW_BINDING', () => {
  const capsule = makeCapsule();
  const result = validateFixture(capsule);
  assert.equal(result.workflow.IDENTITY_VERIFIED, 'PASS');
  assert.equal(result.workflow.RAW_AUTHORITY_LOCKED, 'PASS');
});

test('LARGE_INLINE_EXACT_COPY_REQUIRES_OWNER_EXCEPTION', () => {
  const capsule = makeCapsule({ largeInline: true });
  assert.throws(() => validateFixture(capsule), /owner-authorized exception/);
});

test('LARGE_INLINE_OWNER_EXCEPTION_IS_EXPLICIT_AND_DETERMINISTIC', () => {
  const capsule = makeCapsule({
    largeInline: true,
    largeInlineException: { AUTHORIZED_BY: 'OWNER', EVIDENCE_REF: 'issue:#test', REASON: 'explicit fixture exception' }
  });
  assert.equal(validateFixture(capsule).workflow.IDENTITY_VERIFIED, 'PASS');
});

test('RUNTIME_FILES_CANNOT_APPEAR_BEFORE_S2', () => {
  const capsule = makeCapsule();
  makeRuntime(capsule);
  assert.throws(() => validateRuntimePolicy(capsule), /S3 work cannot begin before S2 PASS/);
});

test('STRUCTURAL_RUNTIME_REJECTS_TSX_FRAMEWORK_CONVERSION', () => {
  const capsule = makeCapsule();
  setWorkflow(capsule, { BASELINE_A_PRESENT: 'PASS' });
  makeRuntime(capsule, { tsx: true });
  assert.throws(() => validateRuntimePolicy(capsule), /FRAMEWORK_CONVERSION_FORBIDDEN/);
});

test('STRUCTURAL_RUNTIME_REJECTS_REACT_IMPORT_IN_JS', () => {
  const capsule = makeCapsule();
  setWorkflow(capsule, { BASELINE_A_PRESENT: 'PASS' });
  makeRuntime(capsule, { react: true });
  assert.throws(() => validateRuntimePolicy(capsule), /REACT_NEXT_FORBIDDEN/);
});

test('PLAIN_HTML_CSS_JS_RUNTIME_PERMITTED_AFTER_S2', () => {
  const capsule = makeCapsule();
  setWorkflow(capsule, { BASELINE_A_PRESENT: 'PASS' });
  makeRuntime(capsule);
  assert.equal(validateRuntimePolicy(capsule).runtimeFiles, 3);
});
