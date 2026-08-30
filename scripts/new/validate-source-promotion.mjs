#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  PASS,
  assert,
  assertGitSha,
  assertString,
  gitChangedPathsSince,
  gitIsAncestor,
  readJson,
  sha256File,
  validateAuthorityRecord,
  verifyArtifactHash
} from './source-gate-lib.mjs';
import { validateCapsule } from './validate-source-capsule.mjs';

const repoRoot = process.cwd();

function pathsFor(capsuleRoot, capsuleId) {
  const evidence = path.join(capsuleRoot, `${capsuleId}-03-evidence`);
  return {
    authority: path.join(capsuleRoot, `${capsuleId}-00-authority.json`),
    evidenceManifest: path.join(evidence, `${capsuleId}-03-00-evidence-manifest.json`),
    sourcePortParity: path.join(evidence, `${capsuleId}-03-02-source-port-parity.json`),
    sourceProductParity: path.join(evidence, `${capsuleId}-03-03-source-product-parity.json`),
    web: path.join(evidence, `${capsuleId}-03-04-web-verification.json`),
    luna: path.join(evidence, `${capsuleId}-03-05-luna1-verification.json`),
    promotion: path.join(evidence, `${capsuleId}-03-06-promotion.json`)
  };
}

function validateEvidenceManifest(filePath, capsuleRoot, capsuleId, sourceSha, authorityHash, authorityRevision) {
  assert(fs.existsSync(filePath), `evidence manifest missing: ${filePath}`);
  const evidence = readJson(filePath);
  assert(evidence.SCHEMA_VERSION === '1.0', 'evidence manifest schema must be 1.0');
  assert(evidence.CAPSULE_ID === capsuleId, 'evidence manifest CAPSULE_ID mismatch');
  assert(evidence.SOURCE_SHA256 === sourceSha, 'evidence manifest SOURCE_SHA256 mismatch');
  assert(evidence.AUTHORITY_RECORD_SHA256 === authorityHash, 'evidence manifest authority hash stale');
  assert(evidence.AUTHORITY_RECORD_REVISION === authorityRevision, 'evidence manifest authority revision stale');
  assert(Array.isArray(evidence.ARTIFACTS) && evidence.ARTIFACTS.length > 0, 'evidence manifest requires artifacts');
  for (const [index, artifact] of evidence.ARTIFACTS.entries()) verifyArtifactHash(capsuleRoot, artifact, `evidence.ARTIFACTS[${index}]`);
  return { record: evidence, hash: sha256File(filePath) };
}

function validateExceptionLedger(items, kind) {
  assert(Array.isArray(items), `${kind}.EXCEPTION_LEDGER must be array`);
  for (const [index, item] of items.entries()) {
    assert(item && typeof item === 'object', `${kind}.EXCEPTION_LEDGER[${index}] must be object`);
    assertString(item.DELTA, `${kind}.EXCEPTION_LEDGER[${index}].DELTA`);
    assert(['OWNER', 'DELEGATED_OWNER'].includes(item.AUTHORIZED_BY), `${kind}.EXCEPTION_LEDGER[${index}].AUTHORIZED_BY invalid`);
    assertString(item.EVIDENCE_REF, `${kind}.EXCEPTION_LEDGER[${index}].EVIDENCE_REF`);
  }
}

function validateParity(filePath, kind, capsuleRoot, capsuleId, sourceSha, authorityHash, authorityRevision, evidenceHash) {
  assert(fs.existsSync(filePath), `${kind} parity record missing: ${filePath}`);
  const parity = readJson(filePath);
  assert(parity.SCHEMA_VERSION === '1.0', `${kind} parity schema must be 1.0`);
  assert(parity.CAPSULE_ID === capsuleId, `${kind} parity CAPSULE_ID mismatch`);
  assert(parity.PARITY_KIND === kind, `parity kind must be ${kind}`);
  assert(parity.SOURCE_SHA256 === sourceSha, `${kind} source hash mismatch`);
  assert(parity.AUTHORITY_RECORD_SHA256 === authorityHash, `${kind} authority hash stale`);
  assert(parity.AUTHORITY_RECORD_REVISION === authorityRevision, `${kind} authority revision stale`);
  assertGitSha(parity.EXACT_PORT_HEAD_SHA, `${kind}.EXACT_PORT_HEAD_SHA`);
  assert(gitIsAncestor(parity.EXACT_PORT_HEAD_SHA), `${kind} exact port head is not ancestor of HEAD`);
  if (kind === 'SOURCE_TO_PRODUCT') {
    assertGitSha(parity.EXACT_PRODUCT_HEAD_SHA, `${kind}.EXACT_PRODUCT_HEAD_SHA`);
    assert(gitIsAncestor(parity.EXACT_PRODUCT_HEAD_SHA), `${kind} exact product head is not ancestor of HEAD`);
  } else {
    assert(parity.EXACT_PRODUCT_HEAD_SHA === null, 'SOURCE_TO_PORT exact product head must be null');
  }
  assert(parity.EVIDENCE_MANIFEST_SHA256 === evidenceHash, `${kind} evidence manifest hash stale`);
  assert(Array.isArray(parity.ARTIFACTS) && parity.ARTIFACTS.length > 0, `${kind} parity requires artifacts`);
  const roles = new Set(parity.ARTIFACTS.map((artifact) => artifact.ROLE));
  assert(roles.has('SOURCE_A'), `${kind} requires SOURCE_A artifacts`);
  if (kind === 'SOURCE_TO_PORT') assert(roles.has('PORT_B'), 'SOURCE_TO_PORT requires independent PORT_B artifacts');
  if (kind === 'SOURCE_TO_PRODUCT') assert(roles.has('PRODUCT_C'), 'SOURCE_TO_PRODUCT requires independent PRODUCT_C artifacts');
  for (const [index, artifact] of parity.ARTIFACTS.entries()) verifyArtifactHash(capsuleRoot, artifact, `${kind}.ARTIFACTS[${index}]`);
  for (const key of ['GEOMETRY_STATUS', 'STYLE_STATUS', 'INTERACTION_STATUS', 'QUIRK_PRESERVATION_STATUS', 'REVIEW_STATUS']) assert(parity[key] === PASS, `${kind}.${key} must PASS`);
  validateExceptionLedger(parity.EXCEPTION_LEDGER, kind);
  return { record: parity, hash: sha256File(filePath) };
}

function assertIndependentBC(sourcePort, sourceProduct) {
  const bPaths = new Set(sourcePort.ARTIFACTS.filter((a) => a.ROLE === 'PORT_B').map((a) => a.PATH));
  const cPaths = new Set(sourceProduct.ARTIFACTS.filter((a) => a.ROLE === 'PRODUCT_C').map((a) => a.PATH));
  for (const filePath of cPaths) assert(!bPaths.has(filePath), `B_C_SCREENSHOT_ALIAS: PRODUCT_C reuses PORT_B artifact path ${filePath}`);

  const bKeys = new Set(sourcePort.ARTIFACTS.filter((a) => a.ROLE === 'PORT_B').map((a) => `${a.VIEWPORT}::${a.STATE}`));
  const cKeys = new Set(sourceProduct.ARTIFACTS.filter((a) => a.ROLE === 'PRODUCT_C').map((a) => `${a.VIEWPORT}::${a.STATE}`));
  for (const key of bKeys) assert(cKeys.has(key), `SOURCE_TO_PRODUCT missing PRODUCT_C capture for ${key}`);
  return true;
}

function validateVerification(filePath, expectedVerifier, capsuleId, sourceSha, authorityHash, authorityRevision, portHead, productHead, productParityHash, evidenceHash) {
  assert(fs.existsSync(filePath), `${expectedVerifier} verification record missing: ${filePath}`);
  const record = readJson(filePath);
  assert(record.SCHEMA_VERSION === '1.0', `${expectedVerifier} schema must be 1.0`);
  assert(record.CAPSULE_ID === capsuleId, `${expectedVerifier} CAPSULE_ID mismatch`);
  assert(record.VERIFIER === expectedVerifier, `${expectedVerifier} VERIFIER mismatch`);
  assert(record.SOURCE_SHA256 === sourceSha, `${expectedVerifier} source hash mismatch`);
  assert(record.AUTHORITY_RECORD_SHA256 === authorityHash, `${expectedVerifier} authority hash stale`);
  assert(record.AUTHORITY_RECORD_REVISION === authorityRevision, `${expectedVerifier} authority revision stale`);
  assert(record.EXACT_PORT_HEAD_SHA === portHead, `${expectedVerifier} exact port head mismatch`);
  assert(record.EXACT_PRODUCT_HEAD_SHA === productHead, `${expectedVerifier} exact product head mismatch`);
  assert(record.PARITY_RECORD_SHA256 === productParityHash, `${expectedVerifier} parity record hash stale`);
  assert(record.EVIDENCE_MANIFEST_SHA256 === evidenceHash, `${expectedVerifier} evidence manifest hash stale`);
  assert(record.STATUS === PASS, `${expectedVerifier} verification must PASS`);
  return { record, hash: sha256File(filePath) };
}

export function validatePromotion(capsuleRootInput) {
  const capsuleRoot = path.resolve(capsuleRootInput);
  const capsuleId = path.basename(capsuleRoot);
  const capsuleResult = validateCapsule(capsuleRoot);
  assert(capsuleResult.workflow.SOURCE_PORT_PARITY === PASS, 'promotion requires S4 SOURCE_PORT_PARITY=PASS');
  assert(['BOUND', 'PROMOTED'].includes(capsuleResult.workflow.PRODUCT_USAGE), 'promotion requires capsule PRODUCT_USAGE=BOUND|PROMOTED');

  const p = pathsFor(capsuleRoot, capsuleId);
  const authority = readJson(p.authority);
  validateAuthorityRecord(authority);
  const authorityHash = sha256File(p.authority);
  const sourceSha = authority.AUTHORITY.SHA256;
  const authorityRevision = authority.RECORD_REVISION;

  const evidence = validateEvidenceManifest(p.evidenceManifest, capsuleRoot, capsuleId, sourceSha, authorityHash, authorityRevision);
  const sourcePort = validateParity(p.sourcePortParity, 'SOURCE_TO_PORT', capsuleRoot, capsuleId, sourceSha, authorityHash, authorityRevision, evidence.hash);
  const sourceProduct = validateParity(p.sourceProductParity, 'SOURCE_TO_PRODUCT', capsuleRoot, capsuleId, sourceSha, authorityHash, authorityRevision, evidence.hash);
  assert(sourceProduct.record.EXACT_PORT_HEAD_SHA === sourcePort.record.EXACT_PORT_HEAD_SHA, 'product parity references different port head');
  assertIndependentBC(sourcePort.record, sourceProduct.record);

  assert(fs.existsSync(p.promotion), `promotion record missing: ${p.promotion}`);
  const promotion = readJson(p.promotion);
  assert(promotion.SCHEMA_VERSION === '1.0', 'promotion schema must be 1.0');
  assert(promotion.CAPSULE_ID === capsuleId, 'promotion CAPSULE_ID mismatch');
  assert(promotion.SOURCE_SHA256 === sourceSha, 'promotion source hash mismatch');
  assert(promotion.AUTHORITY_RECORD_SHA256 === authorityHash, 'promotion authority hash stale');
  assert(promotion.AUTHORITY_RECORD_REVISION === authorityRevision, 'promotion authority revision stale');
  assert(promotion.EXACT_PORT_HEAD_SHA === sourcePort.record.EXACT_PORT_HEAD_SHA, 'promotion exact port head mismatch');
  assert(promotion.EXACT_PRODUCT_HEAD_SHA === sourceProduct.record.EXACT_PRODUCT_HEAD_SHA, 'promotion exact product head mismatch');
  assertGitSha(promotion.EXACT_PORT_HEAD_SHA, 'promotion.EXACT_PORT_HEAD_SHA');
  assertGitSha(promotion.EXACT_PRODUCT_HEAD_SHA, 'promotion.EXACT_PRODUCT_HEAD_SHA');
  assert(gitIsAncestor(promotion.EXACT_PORT_HEAD_SHA), 'promotion exact port head is not ancestor of HEAD');
  assert(gitIsAncestor(promotion.EXACT_PRODUCT_HEAD_SHA), 'promotion exact product head is not ancestor of HEAD');

  assert(Array.isArray(promotion.PRODUCT_BOUND_PATHS) && promotion.PRODUCT_BOUND_PATHS.length > 0, 'promotion PRODUCT_BOUND_PATHS required');
  for (const [index, boundPath] of promotion.PRODUCT_BOUND_PATHS.entries()) {
    assertString(boundPath, `promotion.PRODUCT_BOUND_PATHS[${index}]`);
    assert(!path.isAbsolute(boundPath) && !boundPath.includes('..'), `unsafe PRODUCT_BOUND_PATHS entry: ${boundPath}`);
  }
  const productDrift = gitChangedPathsSince(promotion.EXACT_PRODUCT_HEAD_SHA, promotion.PRODUCT_BOUND_PATHS);
  assert(productDrift.length === 0, `VERIFICATION_STALE_AFTER_HEAD_CHANGE: product-bound files changed after EXACT_PRODUCT_HEAD_SHA: ${productDrift.join(', ')}`);

  const runtimeRelative = path.relative(repoRoot, path.join(capsuleRoot, `${capsuleId}-02-runtime`)).replaceAll('\\', '/');
  const portDrift = gitChangedPathsSince(promotion.EXACT_PORT_HEAD_SHA, [runtimeRelative]);
  assert(portDrift.length === 0, `VERIFICATION_STALE_AFTER_HEAD_CHANGE: source runtime changed after EXACT_PORT_HEAD_SHA: ${portDrift.join(', ')}`);

  assert(promotion.SOURCE_PORT_PARITY_RECORD_SHA256 === sourcePort.hash, 'promotion source-port parity hash stale');
  assert(promotion.SOURCE_PRODUCT_PARITY_RECORD_SHA256 === sourceProduct.hash, 'promotion source-product parity hash stale');
  assert(promotion.EVIDENCE_MANIFEST_SHA256 === evidence.hash, 'promotion evidence manifest hash stale');

  const web = validateVerification(p.web, 'WEB', capsuleId, sourceSha, authorityHash, authorityRevision, promotion.EXACT_PORT_HEAD_SHA, promotion.EXACT_PRODUCT_HEAD_SHA, sourceProduct.hash, evidence.hash);
  const luna = validateVerification(p.luna, 'LUNA1', capsuleId, sourceSha, authorityHash, authorityRevision, promotion.EXACT_PORT_HEAD_SHA, promotion.EXACT_PRODUCT_HEAD_SHA, sourceProduct.hash, evidence.hash);
  assert(promotion.WEB_VERIFICATION?.STATUS === PASS, 'promotion WEB_VERIFICATION.STATUS must PASS');
  assert(promotion.LUNA1_VERIFICATION?.STATUS === PASS, 'promotion LUNA1_VERIFICATION.STATUS must PASS');
  assert(promotion.WEB_VERIFICATION.RECORD_SHA256 === web.hash, 'promotion WEB verification hash stale');
  assert(promotion.LUNA1_VERIFICATION.RECORD_SHA256 === luna.hash, 'promotion LUNA1 verification hash stale');
  assert(promotion.WEB_VERIFICATION.VERIFIED_HEAD_SHA === promotion.EXACT_PRODUCT_HEAD_SHA, 'WEB verified head mismatch');
  assert(promotion.LUNA1_VERIFICATION.VERIFIED_HEAD_SHA === promotion.EXACT_PRODUCT_HEAD_SHA, 'Luna1 verified head mismatch');

  assert(promotion.STAGES && typeof promotion.STAGES === 'object', 'promotion STAGES required');
  for (let index = 0; index <= 10; index += 1) assert(promotion.STAGES[`S${index}`] === PASS, `promotion S${index} must PASS`);
  assert(promotion.PROMOTION_STATUS === 'READY', 'PROMOTION_STATUS must be READY');

  return { capsuleId, productHead: promotion.EXACT_PRODUCT_HEAD_SHA };
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('usage: node scripts/new/validate-source-promotion.mjs <new/sources/SRCxxx> [...]');
    process.exitCode = 2;
    return;
  }
  try {
    const results = args.map((item) => validatePromotion(item));
    for (const result of results) console.log(`SOURCE_PROMOTION_GATE=PASS CAPSULE=${result.capsuleId} PRODUCT_HEAD=${result.productHead}`);
  } catch (error) {
    console.error(`SOURCE_PROMOTION_GATE=FAIL ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
