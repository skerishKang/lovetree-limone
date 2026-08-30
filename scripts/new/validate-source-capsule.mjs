#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  LARGE_INLINE_THRESHOLD_BYTES,
  PASS,
  assert,
  assertExactKeys,
  assertInteger,
  assertRequiredKeys,
  assertSha256,
  assertStage,
  assertString,
  authoritySummary,
  readJson,
  sha256File,
  sha256Json,
  stableJson,
  validateAuthorityRecord,
  verifyArtifactHash
} from './source-gate-lib.mjs';

const args = process.argv.slice(2);
const repoRoot = process.cwd();

function validateInlinePayload(payload, label) {
  assertExactKeys(payload, ['present', 'count', 'encoded_bytes', 'decoded_bytes'], label);
  assertRequiredKeys(payload, ['present', 'count', 'encoded_bytes', 'decoded_bytes'], label);
  assert(typeof payload.present === 'boolean', `${label}.present must be boolean`);
  assertInteger(payload.count, `${label}.count`);
  assertInteger(payload.encoded_bytes, `${label}.encoded_bytes`);
  assertInteger(payload.decoded_bytes, `${label}.decoded_bytes`);
  if (!payload.present) assert(payload.count === 0, `${label}.count must be 0 when present=false`);
  if (payload.present) assert(payload.count > 0, `${label}.count must be >0 when present=true`);
}

function validateFileRecord(record, label) {
  assertExactKeys(record, ['PATH', 'ROLE', 'MIME_TYPE', 'BYTES', 'SHA256', 'DRIVE_FILE_ID', 'INTAKE_MODE'], label);
  assertRequiredKeys(record, ['PATH', 'ROLE', 'MIME_TYPE', 'BYTES', 'SHA256', 'INTAKE_MODE'], label);
  assertString(record.PATH, `${label}.PATH`);
  assertString(record.ROLE, `${label}.ROLE`);
  assertString(record.MIME_TYPE, `${label}.MIME_TYPE`);
  assertInteger(record.BYTES, `${label}.BYTES`);
  assertSha256(record.SHA256, `${label}.SHA256`);
  assert(['EXACT_COPY', 'AUTHORITY_POINTER'].includes(record.INTAKE_MODE), `${label}.INTAKE_MODE invalid`);
}

function findManifest(capsuleRoot) {
  const capsuleId = path.basename(capsuleRoot);
  const candidate = path.join(capsuleRoot, `${capsuleId}-00-manifest.json`);
  assert(fs.existsSync(candidate), `manifest missing: ${candidate}`);
  return candidate;
}

function conventionalPaths(capsuleRoot, capsuleId) {
  return {
    authority: path.join(capsuleRoot, `${capsuleId}-00-authority.json`),
    summary: path.join(capsuleRoot, `${capsuleId}-00-authority-summary.json`),
    baseline: path.join(capsuleRoot, `${capsuleId}-03-evidence`, `${capsuleId}-03-01-baseline-a.json`),
    parity: path.join(capsuleRoot, `${capsuleId}-03-evidence`, `${capsuleId}-03-02-source-port-parity.json`),
    runtime: path.join(capsuleRoot, `${capsuleId}-02-runtime`)
  };
}

function validateBaseline(filePath, manifest, authorityHash) {
  const baseline = readJson(filePath);
  assert(baseline.SCHEMA_VERSION === '1.0', 'baseline.SCHEMA_VERSION must be 1.0');
  assert(baseline.CAPSULE_ID === manifest.CAPSULE_ID, 'baseline CAPSULE_ID mismatch');
  assert(baseline.SOURCE_SHA256 === readJson(path.resolve(path.dirname(manifest.__path), manifest.AUTHORITY_RECORD)).AUTHORITY.SHA256, 'baseline SOURCE_SHA256 mismatch');
  assert(baseline.AUTHORITY_RECORD_SHA256 === authorityHash, 'baseline authority hash stale');
  assertInteger(baseline.AUTHORITY_RECORD_REVISION, 'baseline.AUTHORITY_RECORD_REVISION', 1);
  assert(Array.isArray(baseline.VIEWPORTS) && baseline.VIEWPORTS.length >= 3, 'baseline requires >=3 viewports');
  const viewportSet = new Set(baseline.VIEWPORTS.map((v) => `${v.WIDTH}x${v.HEIGHT}`));
  for (const required of ['1280x800', '390x844', '320x720']) assert(viewportSet.has(required), `baseline missing required viewport ${required}`);
  assert(Array.isArray(baseline.STATES) && baseline.STATES.length > 0, 'baseline requires states');
  assert(Array.isArray(baseline.ARTIFACTS) && baseline.ARTIFACTS.length > 0, 'baseline requires artifacts');
  for (const [index, artifact] of baseline.ARTIFACTS.entries()) verifyArtifactHash(path.dirname(manifest.__path), artifact, `baseline.ARTIFACTS[${index}]`);
  assert(baseline.STATUS === PASS, 'baseline STATUS must PASS when BASELINE_A_PRESENT=PASS');
  return baseline;
}

function validateParity(filePath, manifest, authorityHash) {
  const parity = readJson(filePath);
  assert(parity.SCHEMA_VERSION === '1.0', 'parity.SCHEMA_VERSION must be 1.0');
  assert(parity.CAPSULE_ID === manifest.CAPSULE_ID, 'parity CAPSULE_ID mismatch');
  assert(parity.PARITY_KIND === 'SOURCE_TO_PORT', 'S4 parity record must be SOURCE_TO_PORT');
  const authority = readJson(path.resolve(path.dirname(manifest.__path), manifest.AUTHORITY_RECORD));
  assert(parity.SOURCE_SHA256 === authority.AUTHORITY.SHA256, 'parity SOURCE_SHA256 mismatch');
  assert(parity.AUTHORITY_RECORD_SHA256 === authorityHash, 'parity authority hash stale');
  assert(parity.AUTHORITY_RECORD_REVISION === authority.RECORD_REVISION, 'parity authority revision stale');
  assertString(parity.EXACT_PORT_HEAD_SHA, 'parity.EXACT_PORT_HEAD_SHA', { pattern: /^[a-f0-9]{40}$/ });
  if (process.env.GITHUB_SHA) assert(parity.EXACT_PORT_HEAD_SHA === process.env.GITHUB_SHA, 'parity exact port head is stale for current GitHub head');
  assert(parity.EXACT_PRODUCT_HEAD_SHA === null, 'SOURCE_TO_PORT parity must not claim product head');
  assertSha256(parity.EVIDENCE_MANIFEST_SHA256, 'parity.EVIDENCE_MANIFEST_SHA256');
  assert(Array.isArray(parity.VIEWPORT_STATES) && parity.VIEWPORT_STATES.length > 0, 'parity requires viewport/state matrix');
  assert(Array.isArray(parity.ARTIFACTS) && parity.ARTIFACTS.length > 0, 'parity requires artifacts');
  for (const [index, artifact] of parity.ARTIFACTS.entries()) verifyArtifactHash(path.dirname(manifest.__path), artifact, `parity.ARTIFACTS[${index}]`);
  for (const key of ['GEOMETRY_STATUS', 'STYLE_STATUS', 'INTERACTION_STATUS', 'REVIEW_STATUS']) assert(parity[key] === PASS, `parity ${key} must PASS`);
  assert(Array.isArray(parity.EXCEPTION_LEDGER), 'parity EXCEPTION_LEDGER must be array');
  return parity;
}

export function validateCapsule(capsuleRootInput) {
  const capsuleRoot = path.resolve(capsuleRootInput);
  const manifestPath = findManifest(capsuleRoot);
  const manifest = readJson(manifestPath);
  Object.defineProperty(manifest, '__path', { value: manifestPath, enumerable: false });
  const capsuleId = path.basename(capsuleRoot);

  assertExactKeys(manifest, ['MANIFEST_SCHEMA_VERSION', 'CAPSULE_ID', 'TYPE', 'IDENTITY_TOKEN', 'BASE_NUMBER', 'VARIANT_TOKEN', 'TITLE', 'SOURCE_REVISION', 'RAW_MODE', 'AUTHORITY_RECORD', 'RAW_FILES', 'ASSETS', 'EXTERNAL_DEPENDENCIES', 'INLINE_PAYLOADS', 'RELATIONS', 'WORKFLOW_STATUS'], 'manifest');
  assertRequiredKeys(manifest, ['MANIFEST_SCHEMA_VERSION', 'CAPSULE_ID', 'TYPE', 'IDENTITY_TOKEN', 'BASE_NUMBER', 'VARIANT_TOKEN', 'TITLE', 'SOURCE_REVISION', 'RAW_MODE', 'AUTHORITY_RECORD', 'RAW_FILES', 'ASSETS', 'EXTERNAL_DEPENDENCIES', 'INLINE_PAYLOADS', 'RELATIONS', 'WORKFLOW_STATUS'], 'manifest');
  assert(manifest.MANIFEST_SCHEMA_VERSION === '2.0', 'MANIFEST_SCHEMA_VERSION must be 2.0');
  assert(manifest.CAPSULE_ID === capsuleId, `CAPSULE_ID ${manifest.CAPSULE_ID} does not match directory ${capsuleId}`);
  assertString(manifest.CAPSULE_ID, 'CAPSULE_ID', { pattern: /^SRC[0-9]{3}$/ });
  assert(manifest.TYPE === 'SOURCE_CAPSULE', 'TYPE must be SOURCE_CAPSULE');
  assertString(manifest.IDENTITY_TOKEN, 'IDENTITY_TOKEN', { pattern: /^[0-9]{1,3}$/ });
  assertInteger(manifest.BASE_NUMBER, 'BASE_NUMBER');
  assert(Number(manifest.IDENTITY_TOKEN) === manifest.BASE_NUMBER, 'IDENTITY_TOKEN and BASE_NUMBER disagree');
  assert(manifest.CAPSULE_ID === `SRC${String(manifest.BASE_NUMBER).padStart(3, '0')}`, 'CAPSULE_ID and BASE_NUMBER disagree');
  assert(manifest.VARIANT_TOKEN === null || typeof manifest.VARIANT_TOKEN === 'string', 'VARIANT_TOKEN must be string|null');
  assertString(manifest.TITLE, 'TITLE');
  assertString(manifest.SOURCE_REVISION, 'SOURCE_REVISION');
  assert(['EXACT_COPY', 'AUTHORITY_POINTER'].includes(manifest.RAW_MODE), 'RAW_MODE invalid');
  assertString(manifest.AUTHORITY_RECORD, 'AUTHORITY_RECORD');

  assert(Array.isArray(manifest.RAW_FILES) && manifest.RAW_FILES.length > 0, 'RAW_FILES requires >=1 record');
  manifest.RAW_FILES.forEach((record, index) => validateFileRecord(record, `RAW_FILES[${index}]`));
  assert(Array.isArray(manifest.ASSETS), 'ASSETS must be array');
  manifest.ASSETS.forEach((record, index) => validateFileRecord(record, `ASSETS[${index}]`));
  assert(Array.isArray(manifest.EXTERNAL_DEPENDENCIES), 'EXTERNAL_DEPENDENCIES must be array');
  assert(Array.isArray(manifest.RELATIONS), 'RELATIONS must be array');

  const inline = manifest.INLINE_PAYLOADS;
  assertExactKeys(inline, ['INLINE_CSS', 'INLINE_JS', 'INLINE_MEDIA', 'LARGE_INLINE_THRESHOLD_BYTES', 'LARGE_INLINE_EXCEPTION'], 'INLINE_PAYLOADS');
  validateInlinePayload(inline.INLINE_CSS, 'INLINE_PAYLOADS.INLINE_CSS');
  validateInlinePayload(inline.INLINE_JS, 'INLINE_PAYLOADS.INLINE_JS');
  validateInlinePayload(inline.INLINE_MEDIA, 'INLINE_PAYLOADS.INLINE_MEDIA');
  assert(inline.LARGE_INLINE_THRESHOLD_BYTES === LARGE_INLINE_THRESHOLD_BYTES, `large inline threshold must be ${LARGE_INLINE_THRESHOLD_BYTES}`);
  const largestInline = Math.max(inline.INLINE_CSS.decoded_bytes, inline.INLINE_JS.decoded_bytes, inline.INLINE_MEDIA.decoded_bytes, inline.INLINE_MEDIA.encoded_bytes);
  if (manifest.RAW_MODE === 'EXACT_COPY' && largestInline >= LARGE_INLINE_THRESHOLD_BYTES) {
    const exception = inline.LARGE_INLINE_EXCEPTION;
    assert(exception && ['OWNER', 'DELEGATED_OWNER'].includes(exception.AUTHORIZED_BY), 'large inline EXACT_COPY requires owner-authorized exception');
    assertString(exception.EVIDENCE_REF, 'LARGE_INLINE_EXCEPTION.EVIDENCE_REF');
    assertString(exception.REASON, 'LARGE_INLINE_EXCEPTION.REASON');
  }

  const workflow = manifest.WORKFLOW_STATUS;
  assertExactKeys(workflow, ['IDENTITY_VERIFIED', 'RAW_AUTHORITY_LOCKED', 'BASELINE_A_PRESENT', 'MECHANICAL_PORT_COMPLETE', 'SOURCE_PORT_PARITY', 'PRODUCT_USAGE'], 'WORKFLOW_STATUS');
  for (const key of ['IDENTITY_VERIFIED', 'RAW_AUTHORITY_LOCKED', 'BASELINE_A_PRESENT', 'MECHANICAL_PORT_COMPLETE', 'SOURCE_PORT_PARITY']) assertStage(workflow[key], `WORKFLOW_STATUS.${key}`);
  assert(['NONE', 'ELIGIBLE', 'BOUND', 'PROMOTED'].includes(workflow.PRODUCT_USAGE), 'WORKFLOW_STATUS.PRODUCT_USAGE invalid');

  const paths = conventionalPaths(capsuleRoot, capsuleId);
  const authorityPath = path.resolve(capsuleRoot, manifest.AUTHORITY_RECORD);
  assert(authorityPath === paths.authority, `AUTHORITY_RECORD must be ${path.basename(paths.authority)}`);
  assert(fs.existsSync(authorityPath), `authority record missing: ${authorityPath}`);
  const authority = readJson(authorityPath);
  validateAuthorityRecord(authority);
  assert(authority.CAPSULE_ID === manifest.CAPSULE_ID, 'authority CAPSULE_ID mismatch');
  assert(authority.SOURCE_REVISION === manifest.SOURCE_REVISION, 'authority SOURCE_REVISION mismatch');
  assert(authority.AUTHORITY.MODE === manifest.RAW_MODE, 'authority MODE != manifest RAW_MODE');
  const authorityHash = sha256Json(authority);

  assert(fs.existsSync(paths.summary), `generated authority summary missing: ${paths.summary}`);
  const actualSummary = readJson(paths.summary);
  const expectedSummary = authoritySummary(authority);
  assert(stableJson(actualSummary) === stableJson(expectedSummary), 'authority summary is stale or hand-edited');

  const rawMatch = manifest.RAW_FILES.some((raw) => raw.BYTES === authority.AUTHORITY.BYTES && raw.SHA256 === authority.AUTHORITY.SHA256 && raw.INTAKE_MODE === manifest.RAW_MODE);
  assert(rawMatch, 'RAW_FILES does not bind exact authority bytes/hash/mode');

  if (manifest.RAW_MODE === 'EXACT_COPY') {
    const exactRaw = manifest.RAW_FILES.find((raw) => raw.SHA256 === authority.AUTHORITY.SHA256);
    assert(exactRaw, 'EXACT_COPY raw record missing');
    const rawPath = path.resolve(capsuleRoot, exactRaw.PATH);
    assert(rawPath.startsWith(capsuleRoot + path.sep), 'raw path escapes capsule root');
    assert(fs.existsSync(rawPath), `EXACT_COPY file missing: ${exactRaw.PATH}`);
    assert(fs.statSync(rawPath).size === exactRaw.BYTES, 'EXACT_COPY byte count mismatch');
    assert(sha256File(rawPath) === exactRaw.SHA256, 'EXACT_COPY SHA256 mismatch');
  }

  const identityCanPass = authority.ADOPTION.STATUS === 'ADOPTED' && authority.ADOPTION.ADOPTED_REVISION === manifest.SOURCE_REVISION && authority.DUPLICATES.STATUS === 'CLEAR';
  if (workflow.IDENTITY_VERIFIED === PASS) assert(identityCanPass, 'S0 PASS forbidden: adoption/duplicate authority unresolved');
  if (!identityCanPass) assert(workflow.IDENTITY_VERIFIED !== PASS, 'ambiguous authority must fail closed at S0');

  if (workflow.RAW_AUTHORITY_LOCKED === PASS) assert(workflow.IDENTITY_VERIFIED === PASS, 'S1 PASS requires S0 PASS');

  if (workflow.BASELINE_A_PRESENT === PASS) {
    assert(workflow.RAW_AUTHORITY_LOCKED === PASS, 'S2 PASS requires S1 PASS');
    assert(fs.existsSync(paths.baseline), `S2 PASS requires baseline record: ${paths.baseline}`);
    const baseline = validateBaseline(paths.baseline, manifest, authorityHash);
    assert(baseline.AUTHORITY_RECORD_REVISION === authority.RECORD_REVISION, 'baseline authority record revision stale');
  }

  if (workflow.MECHANICAL_PORT_COMPLETE === PASS) {
    assert(workflow.BASELINE_A_PRESENT === PASS, 'S3 PASS requires S2 PASS');
    assert(fs.existsSync(paths.runtime), `S3 PASS requires runtime directory: ${paths.runtime}`);
    assert(fs.existsSync(path.join(paths.runtime, `${capsuleId}-02-01-index.html`)), 'S3 PASS requires structural runtime index.html');
    if (inline.INLINE_CSS.present) assert(fs.existsSync(path.join(paths.runtime, `${capsuleId}-02-02-styles.css`)), 'S3 PASS requires extracted styles.css when inline CSS exists');
    if (inline.INLINE_JS.present) assert(fs.existsSync(path.join(paths.runtime, `${capsuleId}-02-03-app.js`)), 'S3 PASS requires extracted app.js when inline JS exists');
  }

  if (workflow.SOURCE_PORT_PARITY === PASS) {
    assert(workflow.MECHANICAL_PORT_COMPLETE === PASS, 'S4 PASS requires S3 PASS');
    assert(fs.existsSync(paths.parity), `S4 PASS requires parity record: ${paths.parity}`);
    validateParity(paths.parity, manifest, authorityHash);
  }

  if (workflow.PRODUCT_USAGE !== 'NONE') assert(workflow.SOURCE_PORT_PARITY === PASS, 'product composition/use requires S4 PASS');

  return { capsuleId, authorityHash, workflow };
}

function selfTest() {
  const schemaFiles = [
    'new/standards/source-capsule.schema.json',
    'new/standards/source-authority-record.schema.json',
    'new/standards/source-baseline.schema.json',
    'new/standards/source-parity-result.schema.json',
    'new/standards/source-promotion-record.schema.json'
  ];
  for (const relative of schemaFiles) {
    const schema = readJson(path.join(repoRoot, relative));
    assert(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', `${relative} must declare draft 2020-12`);
    assertString(schema.$id, `${relative}.$id`);
  }
  console.log('NEW_SOURCE_CAPSULE_SCHEMA_SELF_TEST=PASS');
}

if (args.includes('--self-test')) {
  selfTest();
  process.exit(0);
}

if (args.length === 0) {
  console.error('usage: node scripts/new/validate-source-capsule.mjs <new/sources/SRCxxx> [...] | --self-test');
  process.exit(2);
}

try {
  const results = args.map((item) => validateCapsule(item));
  for (const result of results) console.log(`SOURCE_CAPSULE_GATE=PASS CAPSULE=${result.capsuleId}`);
} catch (error) {
  console.error(`SOURCE_CAPSULE_GATE=FAIL ${error.message}`);
  process.exit(1);
}
