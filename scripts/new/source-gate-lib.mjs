import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const PASS = 'PASS';
export const STAGE_VALUES = new Set(['PASS', 'FAIL', 'BLOCKED', 'UNKNOWN', 'NOT_STARTED']);
export const LARGE_INLINE_THRESHOLD_BYTES = 1_048_576;

export function fail(message) {
  const error = new Error(message);
  error.name = 'SourceGateError';
  throw error;
}

export function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`cannot read valid JSON: ${filePath}: ${error.message}`);
  }
}

export function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function stableJson(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

export function sha256Json(value) {
  return sha256Buffer(Buffer.from(stableJson(value)));
}

export function assert(condition, message) {
  if (!condition) fail(message);
}

export function assertString(value, label, { pattern, nullable = false } = {}) {
  if (nullable && value === null) return;
  assert(typeof value === 'string' && value.length > 0, `${label} must be a non-empty string`);
  if (pattern) assert(pattern.test(value), `${label} has invalid format`);
}

export function assertInteger(value, label, minimum = 0) {
  assert(Number.isInteger(value) && value >= minimum, `${label} must be an integer >= ${minimum}`);
}

export function assertExactKeys(object, allowed, label) {
  assert(object && typeof object === 'object' && !Array.isArray(object), `${label} must be an object`);
  const extras = Object.keys(object).filter((key) => !allowed.includes(key));
  assert(extras.length === 0, `${label} contains unsupported keys: ${extras.join(', ')}`);
}

export function assertRequiredKeys(object, required, label) {
  for (const key of required) assert(Object.hasOwn(object, key), `${label}.${key} is required`);
}

export function assertSha256(value, label) {
  assertString(value, label, { pattern: /^[a-f0-9]{64}$/ });
}

export function assertGitSha(value, label, { nullable = false } = {}) {
  assertString(value, label, { pattern: /^[a-f0-9]{40}$/, nullable });
}

export function assertStage(value, label) {
  assert(STAGE_VALUES.has(value), `${label} has invalid stage value: ${value}`);
}

export function gitIsAncestor(ancestor, descendant = 'HEAD') {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function gitChangedPathsSince(baseSha, scopedPaths) {
  assertGitSha(baseSha, 'baseSha');
  assert(Array.isArray(scopedPaths) && scopedPaths.length > 0, 'scopedPaths must be a non-empty array');
  const output = execFileSync('git', ['diff', '--name-only', `${baseSha}..HEAD`, '--', ...scopedPaths], { encoding: 'utf8' }).trim();
  return output ? output.split('\n').filter(Boolean) : [];
}

export function validateAuthorityRecord(record) {
  assertExactKeys(record, ['SCHEMA_VERSION', 'RECORD_REVISION', 'CAPSULE_ID', 'SOURCE_FAMILY', 'SOURCE_REVISION', 'AUTHORITY', 'ADOPTION', 'DUPLICATES'], 'authority');
  assertRequiredKeys(record, ['SCHEMA_VERSION', 'RECORD_REVISION', 'CAPSULE_ID', 'SOURCE_FAMILY', 'SOURCE_REVISION', 'AUTHORITY', 'ADOPTION', 'DUPLICATES'], 'authority');
  assert(record.SCHEMA_VERSION === '1.0', 'authority.SCHEMA_VERSION must be 1.0');
  assertInteger(record.RECORD_REVISION, 'authority.RECORD_REVISION', 1);
  assertString(record.CAPSULE_ID, 'authority.CAPSULE_ID', { pattern: /^SRC[0-9]{3}$/ });
  assertString(record.SOURCE_FAMILY, 'authority.SOURCE_FAMILY');
  assertString(record.SOURCE_REVISION, 'authority.SOURCE_REVISION');

  const a = record.AUTHORITY;
  assertExactKeys(a, ['MODE', 'FOLDER_NAME', 'FILE_NAME', 'BYTES', 'SHA256', 'CAPTURED_AT', 'MIME_TYPE', 'DRIVE_FOLDER_ID', 'DRIVE_FILE_ID', 'ORIGINAL_LOCATION'], 'authority.AUTHORITY');
  assertRequiredKeys(a, ['MODE', 'FOLDER_NAME', 'FILE_NAME', 'BYTES', 'SHA256', 'CAPTURED_AT', 'MIME_TYPE', 'DRIVE_FOLDER_ID', 'DRIVE_FILE_ID'], 'authority.AUTHORITY');
  assert(['EXACT_COPY', 'AUTHORITY_POINTER'].includes(a.MODE), 'authority.AUTHORITY.MODE invalid');
  assertString(a.FOLDER_NAME, 'authority.AUTHORITY.FOLDER_NAME');
  assertString(a.FILE_NAME, 'authority.AUTHORITY.FILE_NAME');
  assertInteger(a.BYTES, 'authority.AUTHORITY.BYTES');
  assertSha256(a.SHA256, 'authority.AUTHORITY.SHA256');
  assertString(a.CAPTURED_AT, 'authority.AUTHORITY.CAPTURED_AT');
  assert(!Number.isNaN(Date.parse(a.CAPTURED_AT)), 'authority.AUTHORITY.CAPTURED_AT must be date-time');
  assertString(a.MIME_TYPE, 'authority.AUTHORITY.MIME_TYPE');
  assertString(a.DRIVE_FOLDER_ID, 'authority.AUTHORITY.DRIVE_FOLDER_ID');
  assertString(a.DRIVE_FILE_ID, 'authority.AUTHORITY.DRIVE_FILE_ID');

  const adoption = record.ADOPTION;
  assertExactKeys(adoption, ['STATUS', 'DECISION_SOURCE', 'ADOPTED_REVISION', 'EVIDENCE_REF'], 'authority.ADOPTION');
  assertRequiredKeys(adoption, ['STATUS', 'DECISION_SOURCE', 'ADOPTED_REVISION', 'EVIDENCE_REF'], 'authority.ADOPTION');
  assert(['ADOPTED', 'UNRESOLVED', 'REJECTED'].includes(adoption.STATUS), 'authority.ADOPTION.STATUS invalid');
  assert(['OWNER', 'DELEGATED_OWNER', 'GOVERNED_RECORD', 'UNRESOLVED'].includes(adoption.DECISION_SOURCE), 'authority.ADOPTION.DECISION_SOURCE invalid');
  if (adoption.STATUS === 'ADOPTED') {
    assertString(adoption.ADOPTED_REVISION, 'authority.ADOPTION.ADOPTED_REVISION');
    assertString(adoption.EVIDENCE_REF, 'authority.ADOPTION.EVIDENCE_REF');
    assert(adoption.DECISION_SOURCE !== 'UNRESOLVED', 'adopted authority cannot have UNRESOLVED decision source');
  } else {
    assert(adoption.ADOPTED_REVISION === null, 'non-adopted authority must not claim ADOPTED_REVISION');
  }

  const duplicates = record.DUPLICATES;
  assertExactKeys(duplicates, ['STATUS', 'ALTERNATIVES'], 'authority.DUPLICATES');
  assertRequiredKeys(duplicates, ['STATUS', 'ALTERNATIVES'], 'authority.DUPLICATES');
  assert(['CLEAR', 'OPEN'].includes(duplicates.STATUS), 'authority.DUPLICATES.STATUS invalid');
  assert(Array.isArray(duplicates.ALTERNATIVES), 'authority.DUPLICATES.ALTERNATIVES must be array');
  return true;
}

export function authoritySummary(record) {
  return {
    SCHEMA_VERSION: '1.0',
    RECORD_REVISION: record.RECORD_REVISION,
    CAPSULE_ID: record.CAPSULE_ID,
    SOURCE_FAMILY: record.SOURCE_FAMILY,
    SOURCE_REVISION: record.SOURCE_REVISION,
    AUTHORITY: {
      MODE: record.AUTHORITY.MODE,
      FOLDER_NAME: record.AUTHORITY.FOLDER_NAME,
      FILE_NAME: record.AUTHORITY.FILE_NAME,
      BYTES: record.AUTHORITY.BYTES,
      SHA256: record.AUTHORITY.SHA256,
      CAPTURED_AT: record.AUTHORITY.CAPTURED_AT,
      DRIVE_FOLDER_ID: record.AUTHORITY.DRIVE_FOLDER_ID,
      DRIVE_FILE_ID: record.AUTHORITY.DRIVE_FILE_ID
    },
    ADOPTION: record.ADOPTION,
    DUPLICATE_STATUS: record.DUPLICATES.STATUS
  };
}

export function verifyArtifactHash(root, artifact, label) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(root, artifact.PATH);
  assert(target === resolvedRoot || target.startsWith(resolvedRoot + path.sep), `${label} path escapes capsule root`);
  assert(fs.existsSync(target), `${label} missing artifact: ${artifact.PATH}`);
  assertSha256(artifact.SHA256, `${label}.SHA256`);
  assert(sha256File(target) === artifact.SHA256, `${label} artifact hash mismatch: ${artifact.PATH}`);
}
