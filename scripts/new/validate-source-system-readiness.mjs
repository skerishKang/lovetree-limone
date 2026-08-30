#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { assert, readJson } from './source-gate-lib.mjs';

export const REQUIRED_NEW_CHECKS = [
  'NEW Source Capsule Gate / exact-head-completeness',
  'NEW Source Promotion Gate / exact-head-completeness',
  'NEW Old Repair Promotion Guard / old-repair-promotion-guard'
];
export const OLD_REPAIR_PRS = new Set([559, 560, 561, 562, 563]);

export function validateRequiredCheckStates(states, required = REQUIRED_NEW_CHECKS) {
  assert(states && typeof states === 'object' && !Array.isArray(states), 'required check states must be an object');
  for (const name of required) {
    assert(Object.hasOwn(states, name), `required check missing: ${name}`);
    assert(states[name] === 'success', `required check is not success: ${name}=${states[name]}`);
  }
  return true;
}

export function validateOldRepairPromotion({ prNumber, holdActive, exceptionAuthorized = false }) {
  if (holdActive && OLD_REPAIR_PRS.has(Number(prNumber))) {
    assert(exceptionAuthorized === true, `OLD_REPAIR_WHILE_NEW_HOLD_ACTIVE: PR #${prNumber} is evidence/reference only under #564`);
  }
  return true;
}

export function validateRepositoryEnforcement(snapshot) {
  assert(snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot), 'repository enforcement snapshot must be an object');
  const protectedBranch = snapshot.MAIN_PROTECTED === true;
  const activeRuleset = Array.isArray(snapshot.ACTIVE_RULESETS) && snapshot.ACTIVE_RULESETS.length > 0;
  assert(protectedBranch || activeRuleset, 'UNPROTECTED_PROMOTION_PATH: main is not protected and no active ruleset is present');
  assert(Array.isArray(snapshot.REQUIRED_CHECKS), 'repository REQUIRED_CHECKS must be an array');
  for (const name of REQUIRED_NEW_CHECKS) assert(snapshot.REQUIRED_CHECKS.includes(name), `repository policy does not require stable NEW check: ${name}`);
  assert(snapshot.ADMIN_BYPASS_AUDITED === true, 'repository policy must declare administrator/emergency bypass auditing');
  return true;
}

export function validateSystemReadiness(snapshot) {
  validateRepositoryEnforcement(snapshot.REPOSITORY);
  validateRequiredCheckStates(snapshot.EXACT_HEAD_CHECKS);
  assert(snapshot.LIVE_AUTHORITY_PATH_READY === true, 'live authority observation path is not ready');
  assert(snapshot.NEGATIVE_FIXTURE_COUNT >= 16, 'negative fixture corpus is incomplete');
  assert(snapshot.NEGATIVE_FIXTURES_PASS === true, 'negative fixture corpus has not passed');
  assert(snapshot.RECOVERY_IMPORT_ENFORCED === true, 'OLD-to-NEW recovery import enforcement is not active');
  return true;
}

function runCli() {
  const [snapshotPath] = process.argv.slice(2);
  if (!snapshotPath) {
    console.error('usage: node scripts/new/validate-source-system-readiness.mjs <snapshot.json>');
    process.exitCode = 2;
    return;
  }
  try {
    const snapshot = readJson(snapshotPath);
    validateSystemReadiness(snapshot);
    console.log('SOURCE_SYSTEM_READINESS=PASS');
  } catch (error) {
    console.error(`SOURCE_SYSTEM_READINESS=FAIL ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
