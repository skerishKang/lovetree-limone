#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assert, assertSha256, assertString, readJson, sha256File } from './source-gate-lib.mjs';

const REUSABLE = new Set(['REUSE_EXACT', 'REUSE_AFTER_VERIFY', 'REGRESSION_CORPUS']);
const NON_RUNTIME = new Set(['REPORT_ONLY', 'DISCARD_FROM_NEW_RUNTIME']);

export function validateRecoveryImport(filePathInput, { capsuleId, sourceSha, repoRoot = process.cwd() }) {
  const filePath = path.resolve(filePathInput);
  assert(fs.existsSync(filePath), `recovery import record missing: ${filePath}`);
  const record = readJson(filePath);
  const allowed = ['SCHEMA_VERSION', 'CAPSULE_ID', 'SOURCE_SHA256', 'CREATED_AT', 'ITEMS', 'STATUS'];
  const extras = Object.keys(record).filter((key) => !allowed.includes(key));
  assert(extras.length === 0, `recovery import contains unsupported keys: ${extras.join(', ')}`);
  for (const key of allowed) assert(Object.hasOwn(record, key), `recovery import.${key} is required`);
  assert(record.SCHEMA_VERSION === '1.0', 'recovery import schema must be 1.0');
  assert(record.CAPSULE_ID === capsuleId, 'recovery import CAPSULE_ID mismatch');
  assertSha256(record.SOURCE_SHA256, 'recovery import.SOURCE_SHA256');
  assert(record.SOURCE_SHA256 === sourceSha, 'recovery import source hash mismatch');
  assertString(record.CREATED_AT, 'recovery import.CREATED_AT');
  assert(Number.isFinite(Date.parse(record.CREATED_AT)), 'recovery import CREATED_AT must be date-time');
  assert(Array.isArray(record.ITEMS) && record.ITEMS.length > 0, 'recovery import requires at least one item');

  for (const [index, item] of record.ITEMS.entries()) {
    const label = `recovery import.ITEMS[${index}]`;
    const itemAllowed = ['PATH', 'CLASSIFICATION', 'ORIGIN_REF', 'SOURCE_CONTRACT_IMPACT', 'SHA256'];
    const itemExtras = Object.keys(item).filter((key) => !itemAllowed.includes(key));
    assert(itemExtras.length === 0, `${label} unsupported keys: ${itemExtras.join(', ')}`);
    for (const key of itemAllowed) assert(Object.hasOwn(item, key), `${label}.${key} is required`);
    assertString(item.PATH, `${label}.PATH`);
    assert(['REUSE_EXACT', 'REUSE_AFTER_VERIFY', 'REGRESSION_CORPUS', 'REPORT_ONLY', 'DISCARD_FROM_NEW_RUNTIME'].includes(item.CLASSIFICATION), `${label}.CLASSIFICATION invalid`);
    assertString(item.ORIGIN_REF, `${label}.ORIGIN_REF`);
    assert(item.SOURCE_CONTRACT_IMPACT === 'NONE', `${label}.SOURCE_CONTRACT_IMPACT must be NONE`);
    const normalized = item.PATH.replaceAll('\\', '/');
    assert(!normalized.startsWith('/') && !normalized.includes('../'), `${label}.PATH must be repository-relative`);

    if (REUSABLE.has(item.CLASSIFICATION)) {
      assertSha256(item.SHA256, `${label}.SHA256`);
      const target = path.resolve(repoRoot, normalized);
      assert(target.startsWith(path.resolve(repoRoot) + path.sep), `${label}.PATH escapes repository root`);
      assert(fs.existsSync(target), `${label} reusable target missing: ${normalized}`);
      assert(sha256File(target) === item.SHA256, `${label} reusable target hash mismatch: ${normalized}`);
    }

    if (NON_RUNTIME.has(item.CLASSIFICATION)) {
      assert(item.SHA256 === null, `${label} ${item.CLASSIFICATION} must not claim imported bytes`);
      assert(!normalized.includes(`/new/sources/${capsuleId}/${capsuleId}-02-runtime/`) && !normalized.startsWith(`new/sources/${capsuleId}/${capsuleId}-02-runtime/`), `${label} ${item.CLASSIFICATION} cannot target NEW runtime`);
    }
  }

  assert(record.STATUS === 'PASS', 'recovery import STATUS must PASS');
  return record;
}

function runCli() {
  const [filePath, capsuleId, sourceSha] = process.argv.slice(2);
  if (!filePath || !capsuleId || !sourceSha) {
    console.error('usage: node scripts/new/validate-source-recovery-import.mjs <record.json> <SRCxxx> <source-sha256>');
    process.exitCode = 2;
    return;
  }
  try {
    validateRecoveryImport(filePath, { capsuleId, sourceSha });
    console.log(`RECOVERY_IMPORT_GATE=PASS CAPSULE=${capsuleId}`);
  } catch (error) {
    console.error(`RECOVERY_IMPORT_GATE=FAIL ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
