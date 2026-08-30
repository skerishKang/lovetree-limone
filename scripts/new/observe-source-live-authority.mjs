#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  assert,
  readJson,
  sha256File,
  stableJson,
  validateAuthorityRecord
} from './source-gate-lib.mjs';

export const DEFAULT_MAX_BYTES = 256 * 1024 * 1024;
export const FORBIDDEN_LONG_LIVED_CREDENTIALS = [
  'GOOGLE_APPLICATION_CREDENTIALS',
  'SERVICE_ACCOUNT_KEY',
  'GOOGLE_SERVICE_ACCOUNT_KEY',
  'OAUTH_REFRESH_TOKEN',
  'DRIVE_OAUTH_REFRESH_TOKEN'
];

function liveDisabled(message) {
  const error = new Error(message);
  error.code = 'LIVE_DISABLED';
  return error;
}

export function assertCredentialContract(env = process.env) {
  for (const key of FORBIDDEN_LONG_LIVED_CREDENTIALS) {
    assert(!env[key], `LONG_LIVED_CREDENTIAL_FORBIDDEN: ${key}`);
  }
  const token = env.DESIGN_INTAKE_DRIVE_ACCESS_TOKEN;
  if (!token) throw liveDisabled('LIVE_DISABLED: DESIGN_INTAKE_DRIVE_ACCESS_TOKEN is required');
  assert(typeof token === 'string' && token.length >= 16, 'short-lived Drive access token has invalid shape');
  return token;
}

async function driveFetch(fetchImpl, url, accessToken) {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  assert(response && typeof response.ok === 'boolean', 'Drive transport returned invalid response');
  assert(response.ok, `Drive API request failed: HTTP ${response.status}`);
  return response;
}

async function readMetadata(fetchImpl, fileId, accessToken) {
  const fields = encodeURIComponent('id,name,mimeType,size,modifiedTime,parents');
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=true`;
  const response = await driveFetch(fetchImpl, url, accessToken);
  return response.json();
}

async function hashDriveContent(fetchImpl, fileId, accessToken, maxBytes) {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
  const response = await driveFetch(fetchImpl, url, accessToken);
  const digest = createHash('sha256');
  let bytes = 0;

  if (response.body?.getReader) {
    const reader = response.body.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      bytes += chunk.length;
      assert(bytes <= maxBytes, `HASH_TRUNCATED: source exceeds bounded hash limit ${maxBytes}`);
      digest.update(chunk);
    }
  } else {
    const body = Buffer.from(await response.arrayBuffer());
    bytes = body.length;
    assert(bytes <= maxBytes, `HASH_TRUNCATED: source exceeds bounded hash limit ${maxBytes}`);
    digest.update(body);
  }

  return { bytes, sha256: digest.digest('hex') };
}

export async function observeSourceAuthority({
  capsuleRoot: capsuleRootInput,
  accessToken,
  fetchImpl = globalThis.fetch,
  now = new Date(),
  maxBytes = DEFAULT_MAX_BYTES
}) {
  assert(typeof fetchImpl === 'function', 'fetch implementation is required');
  assert(typeof accessToken === 'string' && accessToken.length >= 16, 'short-lived Drive access token is required');
  const capsuleRoot = path.resolve(capsuleRootInput);
  const capsuleId = path.basename(capsuleRoot);
  assert(/^SRC[0-9]{3}$/.test(capsuleId), `invalid capsule directory: ${capsuleId}`);
  const authorityPath = path.join(capsuleRoot, `${capsuleId}-00-authority.json`);
  assert(fs.existsSync(authorityPath), `authority record missing: ${authorityPath}`);
  const authority = readJson(authorityPath);
  validateAuthorityRecord(authority);
  assert(authority.CAPSULE_ID === capsuleId, 'authority CAPSULE_ID mismatch');

  const fileId = authority.AUTHORITY.DRIVE_FILE_ID;
  const folderId = authority.AUTHORITY.DRIVE_FOLDER_ID;
  const metadata = await readMetadata(fetchImpl, fileId, accessToken);
  assert(metadata.id === fileId, 'DRIVE_AUTHORITY_TUPLE_STALE_OR_WRONG: file id mismatch');
  assert(Array.isArray(metadata.parents) && metadata.parents.includes(folderId), 'DRIVE_AUTHORITY_TUPLE_STALE_OR_WRONG: expected folder is not a parent of authority file');
  assert(metadata.size !== undefined, 'Drive metadata size is required for exact source authority');
  const declaredBytes = Number(metadata.size);
  assert(Number.isSafeInteger(declaredBytes) && declaredBytes >= 0, 'Drive metadata size is invalid');
  assert(declaredBytes === authority.AUTHORITY.BYTES, 'DRIVE_AUTHORITY_TUPLE_STALE_OR_WRONG: metadata byte count mismatch');

  const content = await hashDriveContent(fetchImpl, fileId, accessToken, maxBytes);
  assert(content.bytes === declaredBytes, 'HASH_SIZE_MISMATCH: received bytes differ from Drive metadata');
  assert(content.bytes === authority.AUTHORITY.BYTES, 'DRIVE_AUTHORITY_TUPLE_STALE_OR_WRONG: observed byte count mismatch');
  assert(content.sha256 === authority.AUTHORITY.SHA256, 'DRIVE_AUTHORITY_TUPLE_STALE_OR_WRONG: observed SHA256 mismatch');

  const observedAt = now instanceof Date ? now : new Date(now);
  assert(Number.isFinite(observedAt.getTime()), 'observer now must be a valid date');
  return {
    SCHEMA_VERSION: '1.0',
    CAPSULE_ID: capsuleId,
    AUTHORITY_RECORD_SHA256: sha256File(authorityPath),
    AUTHORITY_RECORD_REVISION: authority.RECORD_REVISION,
    OBSERVATION_MODE: 'GOOGLE_DRIVE_LIVE_BOUNDED_READ',
    DRIVE_FOLDER_ID: folderId,
    DRIVE_FILE_ID: fileId,
    OBSERVED_BYTES: content.bytes,
    OBSERVED_SHA256: content.sha256,
    OBSERVED_AT: observedAt.toISOString(),
    VERIFIER: 'TRUSTED_DRIVE_OBSERVER',
    EVIDENCE_REF: `drive:${fileId}@${metadata.modifiedTime ?? 'unknown'}`,
    STATUS: 'PASS'
  };
}

function parseArgs(argv) {
  const result = { capsules: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`missing value for ${arg}`);
      return argv[index];
    };
    if (arg === '--capsule') result.capsules.push(next());
    else if (arg === '--out-dir') result.outDir = next();
    else if (arg === '--max-bytes') result.maxBytes = Number(next());
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (result.capsules.length === 0) throw new Error('at least one --capsule is required');
  if (!result.outDir) throw new Error('--out-dir is required');
  if (result.maxBytes !== undefined && (!Number.isSafeInteger(result.maxBytes) || result.maxBytes <= 0)) throw new Error('--max-bytes must be a positive integer');
  return result;
}

async function runCli() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`SOURCE_LIVE_AUTHORITY_OBSERVER=FAIL usage: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  let accessToken;
  try {
    accessToken = assertCredentialContract(process.env);
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.code === 'LIVE_DISABLED' ? 3 : 1;
    return;
  }

  try {
    const outDir = path.resolve(options.outDir);
    await mkdir(outDir, { recursive: true });
    for (const capsule of options.capsules) {
      const record = await observeSourceAuthority({
        capsuleRoot: capsule,
        accessToken,
        maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES
      });
      const outPath = path.join(outDir, `${record.CAPSULE_ID}-live-authority.json`);
      await writeFile(outPath, stableJson(record), 'utf8');
      console.log(`SOURCE_LIVE_AUTHORITY_OBSERVER=PASS CAPSULE=${record.CAPSULE_ID} OUTPUT=${outPath}`);
    }
  } catch (error) {
    console.error(`SOURCE_LIVE_AUTHORITY_OBSERVER=FAIL ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
