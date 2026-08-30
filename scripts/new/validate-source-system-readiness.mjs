#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { assert, readJson } from './source-gate-lib.mjs';

export const FRESHNESS_REQUIRED_CHECK = 'Design Source Freshness';
export const REQUIRED_NEW_CHECKS = [
  'NEW Source Capsule Gate / exact-head-completeness',
  'NEW Source Promotion Gate / exact-head-completeness',
  'NEW Old Repair Promotion Guard / old-repair-promotion-guard',
  FRESHNESS_REQUIRED_CHECK
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

export function validateTrustedLiveAuthorityActivation(snapshot) {
  assert(snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot), 'trusted live authority snapshot must be an object');
  assert(snapshot.GOOGLE_WIF_PROVIDER_PROVISIONED === true, 'Google WIF provider is not provisioned');
  assert(snapshot.WIF_REPOSITORY_ID_PINNED === true, 'WIF trust is not pinned to immutable repository_id');
  assert(snapshot.WIF_TRUSTED_WORKFLOW_PINNED === true, 'WIF trust is not pinned to the trusted observer workflow identity');
  assert(snapshot.DRIVE_IDENTITY_READ_ONLY === true, 'Drive observer identity is not confirmed read-only');
  assert(snapshot.LIVE_OBSERVER_JOB_ENABLED === true, 'trusted live observer job is not enabled');
  assert(snapshot.LONG_LIVED_GOOGLE_CREDENTIALS_PRESENT === false, 'long-lived Google credentials are forbidden');
  return true;
}

export function validateFreshnessAggregatorActivation(snapshot) {
  assert(snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot), 'freshness aggregator snapshot must be an object');
  assert(snapshot.AGGREGATOR_DEPLOYED === true, 'source freshness aggregator is not deployed');
  assert(snapshot.CHECK_NAME === FRESHNESS_REQUIRED_CHECK, `freshness aggregator check name must be exactly ${FRESHNESS_REQUIRED_CHECK}`);
  assert(snapshot.NOT_APPLICABLE_PATH_PROVEN === true, 'freshness aggregator NOT_APPLICABLE path is not proven');
  assert(snapshot.APPLICABLE_PASS_FAIL_UNKNOWN_PROVEN === true, 'freshness aggregator PASS/FAIL/UNKNOWN paths are not proven');
  assert(snapshot.EXACT_HEAD_BINDING_PROVEN === true, 'freshness aggregator exact-head binding is not proven');
  return true;
}

export function validateSystemReadiness(snapshot) {
  assert(snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot), 'system readiness snapshot must be an object');
  validateRepositoryEnforcement(snapshot.REPOSITORY);
  validateRequiredCheckStates(snapshot.EXACT_HEAD_CHECKS);
  validateTrustedLiveAuthorityActivation(snapshot.TRUSTED_LIVE_AUTHORITY);
  validateFreshnessAggregatorActivation(snapshot.FRESHNESS_AGGREGATOR);
  assert(snapshot.NEGATIVE_FIXTURE_COUNT >= 16, 'negative fixture corpus is incomplete');
  assert(snapshot.NEGATIVE_FIXTURES_PASS === true, 'negative fixture corpus has not passed');
  assert(snapshot.RECOVERY_IMPORT_ENFORCED === true, 'OLD-to-NEW recovery import enforcement is not active');
  assert(Number.isInteger(snapshot.REAL_SOURCE_REPLAY_COUNT) && snapshot.REAL_SOURCE_REPLAY_COUNT >= 2, 'two materially different real Source replays are required');
  assert(snapshot.REAL_SOURCE_REPLAYS_PASS === true, 'real Source replay acceptance is incomplete');
  assert(snapshot.LUNA1_INDEPENDENT_VERIFICATION_PASS === true, 'Luna1 independent verification is incomplete');
  return true;
}

function selfTest() {
  const checks = Object.fromEntries(REQUIRED_NEW_CHECKS.map((name) => [name, 'success']));
  const good = {
    REPOSITORY: {
      MAIN_PROTECTED: true,
      ACTIVE_RULESETS: [],
      REQUIRED_CHECKS: [...REQUIRED_NEW_CHECKS],
      ADMIN_BYPASS_AUDITED: true
    },
    EXACT_HEAD_CHECKS: checks,
    TRUSTED_LIVE_AUTHORITY: {
      GOOGLE_WIF_PROVIDER_PROVISIONED: true,
      WIF_REPOSITORY_ID_PINNED: true,
      WIF_TRUSTED_WORKFLOW_PINNED: true,
      DRIVE_IDENTITY_READ_ONLY: true,
      LIVE_OBSERVER_JOB_ENABLED: true,
      LONG_LIVED_GOOGLE_CREDENTIALS_PRESENT: false
    },
    FRESHNESS_AGGREGATOR: {
      AGGREGATOR_DEPLOYED: true,
      CHECK_NAME: FRESHNESS_REQUIRED_CHECK,
      NOT_APPLICABLE_PATH_PROVEN: true,
      APPLICABLE_PASS_FAIL_UNKNOWN_PROVEN: true,
      EXACT_HEAD_BINDING_PROVEN: true
    },
    NEGATIVE_FIXTURE_COUNT: 16,
    NEGATIVE_FIXTURES_PASS: true,
    RECOVERY_IMPORT_ENFORCED: true,
    REAL_SOURCE_REPLAY_COUNT: 2,
    REAL_SOURCE_REPLAYS_PASS: true,
    LUNA1_INDEPENDENT_VERIFICATION_PASS: true
  };
  validateSystemReadiness(good);

  const missingWif = structuredClone(good);
  missingWif.TRUSTED_LIVE_AUTHORITY.GOOGLE_WIF_PROVIDER_PROVISIONED = false;
  let blocked = false;
  try { validateSystemReadiness(missingWif); } catch { blocked = true; }
  assert(blocked, 'self-test must fail closed when WIF is absent');

  const oneReplay = structuredClone(good);
  oneReplay.REAL_SOURCE_REPLAY_COUNT = 1;
  blocked = false;
  try { validateSystemReadiness(oneReplay); } catch { blocked = true; }
  assert(blocked, 'self-test must fail closed before two real-source replays');

  console.log('SOURCE_SYSTEM_READINESS_SELF_TEST=PASS');
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--self-test') {
    selfTest();
    return;
  }
  const [snapshotPath] = args;
  if (!snapshotPath) {
    console.error('usage: node scripts/new/validate-source-system-readiness.mjs <snapshot.json> | --self-test');
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
