#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assert, assertInteger, assertSha256, assertString, readJson, sha256File } from './source-gate-lib.mjs';

export const LIVE_AUTHORITY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function validateLiveAuthorityRecord(filePathInput, { capsuleId, authority, authorityHash, nowMs = Date.now() }) {
  const filePath = path.resolve(filePathInput);
  assert(fs.existsSync(filePath), `live authority record missing: ${filePath}`);
  const record = readJson(filePath);
  const allowed = ['SCHEMA_VERSION', 'CAPSULE_ID', 'AUTHORITY_RECORD_SHA256', 'AUTHORITY_RECORD_REVISION', 'OBSERVATION_MODE', 'DRIVE_FOLDER_ID', 'DRIVE_FILE_ID', 'OBSERVED_BYTES', 'OBSERVED_SHA256', 'OBSERVED_AT', 'VERIFIER', 'EVIDENCE_REF', 'STATUS'];
  const extras = Object.keys(record).filter((key) => !allowed.includes(key));
  assert(extras.length === 0, `live authority contains unsupported keys: ${extras.join(', ')}`);
  for (const key of allowed) assert(Object.hasOwn(record, key), `live authority.${key} is required`);
  assert(record.SCHEMA_VERSION === '1.0', 'live authority schema must be 1.0');
  assert(record.CAPSULE_ID === capsuleId, 'live authority CAPSULE_ID mismatch');
  assertSha256(record.AUTHORITY_RECORD_SHA256, 'live authority.AUTHORITY_RECORD_SHA256');
  assert(record.AUTHORITY_RECORD_SHA256 === authorityHash, 'live authority record is stale against authority record hash');
  assertInteger(record.AUTHORITY_RECORD_REVISION, 'live authority.AUTHORITY_RECORD_REVISION', 1);
  assert(record.AUTHORITY_RECORD_REVISION === authority.RECORD_REVISION, 'live authority record revision mismatch');
  assert(record.OBSERVATION_MODE === 'GOOGLE_DRIVE_LIVE_BOUNDED_READ', 'live authority observation mode must be GOOGLE_DRIVE_LIVE_BOUNDED_READ');
  assertString(record.DRIVE_FOLDER_ID, 'live authority.DRIVE_FOLDER_ID');
  assertString(record.DRIVE_FILE_ID, 'live authority.DRIVE_FILE_ID');
  assert(record.DRIVE_FOLDER_ID === authority.AUTHORITY.DRIVE_FOLDER_ID, 'live Drive folder tuple mismatch');
  assert(record.DRIVE_FILE_ID === authority.AUTHORITY.DRIVE_FILE_ID, 'live Drive file tuple mismatch');
  assertInteger(record.OBSERVED_BYTES, 'live authority.OBSERVED_BYTES');
  assert(record.OBSERVED_BYTES === authority.AUTHORITY.BYTES, 'live authority byte count mismatch');
  assertSha256(record.OBSERVED_SHA256, 'live authority.OBSERVED_SHA256');
  assert(record.OBSERVED_SHA256 === authority.AUTHORITY.SHA256, 'live authority SHA256 mismatch');
  assertString(record.OBSERVED_AT, 'live authority.OBSERVED_AT');
  const observedAt = Date.parse(record.OBSERVED_AT);
  assert(Number.isFinite(observedAt), 'live authority OBSERVED_AT must be date-time');
  assert(observedAt <= nowMs + 5 * 60 * 1000, 'live authority observation cannot be in the future');
  assert(nowMs - observedAt <= LIVE_AUTHORITY_MAX_AGE_MS, 'live authority observation is stale (>24h)');
  assert(['WEB', 'LUNA1', 'TRUSTED_DRIVE_OBSERVER'].includes(record.VERIFIER), 'live authority VERIFIER invalid');
  assertString(record.EVIDENCE_REF, 'live authority.EVIDENCE_REF');
  assert(record.STATUS === 'PASS', 'live authority STATUS must PASS');
  return { record, hash: sha256File(filePath) };
}

function runCli() {
  const [filePath, authorityPath] = process.argv.slice(2);
  if (!filePath || !authorityPath) {
    console.error('usage: node scripts/new/validate-source-live-authority.mjs <live.json> <authority.json>');
    process.exitCode = 2;
    return;
  }
  try {
    const authority = readJson(authorityPath);
    const result = validateLiveAuthorityRecord(filePath, {
      capsuleId: authority.CAPSULE_ID,
      authority,
      authorityHash: sha256File(authorityPath)
    });
    console.log(`LIVE_AUTHORITY_GATE=PASS CAPSULE=${result.record.CAPSULE_ID}`);
  } catch (error) {
    console.error(`LIVE_AUTHORITY_GATE=FAIL ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
