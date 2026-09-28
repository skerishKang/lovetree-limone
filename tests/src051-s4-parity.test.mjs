import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MOBILE_390_STATES,
  MOBILE_320_STATES,
  SRC051_PARITY_LANES,
  PARITY_EXCLUSIONS,
} from '../src/08_harness/source051-parity.mjs';
import {
  NORMAL_MOTION_STATES,
  REDUCED_MOTION_STATES,
} from '../src/08_harness/source051-driver.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capsule = path.join(repoRoot, 'src', '03_sources', 'SRC051');
const readRepo = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(capsule, rel), 'utf8'));

const names = (plan) => plan.map((state) => state.name);

test('the four S4 lanes carry the exact accepted state counts, recovered not invented', () => {
  // Desktop lanes reuse the accepted driver tables, so they cannot drift from baseline replay.
  assert.equal(SRC051_PARITY_LANES[0].states, NORMAL_MOTION_STATES, 'desktop normal reuses the accepted driver table');
  assert.equal(SRC051_PARITY_LANES[1].states, REDUCED_MOTION_STATES, 'desktop reduced reuses the accepted driver table');
  assert.deepEqual(SRC051_PARITY_LANES.map((lane) => [lane.lane, lane.states.length]), [
    ['desktop-normal', 18],
    ['desktop-reduced', 14],
    ['mobile-390', 12],
    ['mobile-320', 10],
  ]);
  // The mobile mapping is verbatim S2 section 9, and the 320 lane is the 390 lane minus exactly the
  // two states S2 recorded as unreachable at that width.
  assert.deepEqual(names(MOBILE_390_STATES), [
    'HERO_READY', 'ANALYSIS_PHASE1_SCAN', 'ANALYSIS_PHASE2_WHITE_GATE', 'ANALYSIS_PHASE3_EYE_OVERLAY',
    'DOSSIER', 'THERMAL_CITY', 'CONNECTION_FLOW', 'CONNECTION_NODE_PRESENCE_N5_N6', 'SAVED_CTA',
    'SAVED_CTA_PULSE_CLICK', 'BRAND_CLOSE', 'POINTER_PARALLAX',
  ]);
  assert.deepEqual(names(MOBILE_320_STATES), names(MOBILE_390_STATES).filter((name) => name !== 'SAVED_CTA_PULSE_CLICK' && name !== 'POINTER_PARALLAX'));
});

test('no mobile state is invented: each traces to an accepted desktop state or the one mobile observation', () => {
  const desktop = new Set([...names(NORMAL_MOTION_STATES), ...names(REDUCED_MOTION_STATES).map((n) => n.replace(/^RM_/, ''))]);
  const S2_MOBILE_ALIAS = {
    POINTER_PARALLAX: 'HERO_POINTER_PARALLAX',
    SAVED_CTA: 'SAVED_PRE_CTA',
    SAVED_CTA_PULSE_CLICK: 'SAVED_CTA_ACTIVE',
    CONNECTION_FLOW: 'CONNECTION',
  };
  for (const name of names(MOBILE_390_STATES)) {
    const mapped = S2_MOBILE_ALIAS[name] ?? name;
    assert.ok(desktop.has(mapped) || name === 'CONNECTION_NODE_PRESENCE_N5_N6', `mobile state ${name} traces to an accepted state`);
  }
});

test('the parity route is wired before the generic fallback and the driver stays original-only', () => {
  const parity = readRepo('src/08_harness/capture-source-parity.mjs');
  assert.match(parity, /import \{ captureSRC051Parity \} from '\.\/source051-parity\.mjs';/);
  assert.ok(parity.indexOf("if (sourceId === 'SRC051')") > 0, 'the SRC051 route exists');
  const callSite = parity.indexOf('await captureSRC051Parity(');
  const genericCall = parity.indexOf('await captureVariant(');
  assert.ok(callSite > 0, 'the SRC051 route calls its own capture');
  assert.ok(genericCall === -1 || callSite < genericCall, 'SRC051 is routed before the generic single-executable capture');
  // Baseline replay remains a single-surface observation; the driver must not name the split surface.
  const driver = readRepo('src/08_harness/source051-driver.mjs');
  assert.ok(!/split\/index\.html/.test(driver), 'the accepted baseline driver still never references the split surface');
  assert.match(driver, /export async function captureSRC051Baseline\(/);
  assert.match(driver, /export async function captureSRC051Lane\(/, 'both baseline and parity drive one shared capture core');
});

test('the parity comparison excludes only what a taxonomy class authorizes', () => {
  // Each exclusion must name its authorizing class. A fourth, unjustified exclusion would mean a
  // semantic field was dropped to force a green.
  assert.deepEqual(PARITY_EXCLUSIONS.map((e) => e.id), ['S2_ANIMATION_BOOKKEEPING', 'CONTINUOUS_CSS_PHASE_VARIANCE', 'DECLARED_WAAPI_TRANSIENT_STATE']);
  for (const exclusion of PARITY_EXCLUSIONS) {
    assert.ok(exclusion.match instanceof RegExp, `${exclusion.id} has a matcher`);
    assert.ok(exclusion.reason.length > 40, `${exclusion.id} states why it is allowed`);
    assert.ok(exclusion.taxonomy_class, `${exclusion.id} names its taxonomy class`);
  }
  assert.match(PARITY_EXCLUSIONS[0].match.source, /animation_bookkeeping/);
  assert.match(PARITY_EXCLUSIONS[1].match.source, /screenshot_/);
  // Only the WAAPI clock reading is excluded; the declared timing contract stays compared.
  assert.match(PARITY_EXCLUSIONS[2].match.source, /current_time_ms/);
  assert.ok(!/duration_ms|play_state|target/.test(PARITY_EXCLUSIONS[2].match.source), 'the WAAPI exclusion does not cover the declared timing contract');
});

test('the parity harness claims no acceptance and writes no accepted-parity artifact', () => {
  // Comments legitimately name the forbidden artifacts in order to forbid them, so the check is made
  // against executable code only. A comment cannot write a file or set a verdict.
  const code = readRepo('src/08_harness/source051-parity.mjs').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // A candidate harness that could author acceptance metadata would be able to self-accept S4.
  assert.ok(!/accepted-parity\.json/.test(code), 'the parity module never names an accepted-parity artifact in code');
  assert.ok(!/source_split_parity_pass\s*[:=]\s*true/.test(code), 'source_split_parity_pass is never set true by the harness');
  assert.match(code, /source_split_parity_pass: false/, 'the candidate summary records the verdict as false');
  assert.match(code, /accepted_parity_created: false/);
  assert.match(code, /central_visual_review: 'PENDING'/);
  assert.match(code, /next_stage_authorized: null/);
  assert.equal(readJson('manifest.json').stages.source_split_parity_pass, false);
  assert.equal(fs.existsSync(path.join(capsule, 'evidence', 'parity', 'accepted-parity.json')), false);
});


test('the S4 route is reached only because the gate says RELEASED, and no other Source inherited it', () => {
  const manifest = readJson('manifest.json');
  const materialization = readJson('split/materialization.json');
  assert.equal(manifest.stage_gate.s4_release, 'RELEASED');
  assert.equal(manifest.stage_gate.parity_capture_authorized, true);
  assert.equal(materialization.stage_gate.s4_release, 'RELEASED');
  assert.equal(materialization.stage_gate.parity_capture_authorized, true);
  assert.equal(materialization.status, 'MATERIALIZED_PENDING_PARITY');
  assert.equal(materialization.parity_status, 'PENDING_EXACT_HEAD_CAPTURE');
  // The release cites the CENTRAL decision and preserves the prior holds for the record.
  assert.match(materialization.stage_gate.decision_ref, /5862568703/);
  assert.match(materialization.stage_gate.previous_decision_ref, /5859197749/);
  // This was a bounded, SRC051-only release. No other capsule may claim it.
  for (const id of fs.readdirSync(path.join(repoRoot, 'src', '03_sources')).filter((n) => /^SRC\d{3}$/.test(n))) {
    if (id === 'SRC051') continue;
    const record = path.join(repoRoot, 'src', '03_sources', id, 'split', 'materialization.json');
    if (!fs.existsSync(record)) continue;
    const other = JSON.parse(fs.readFileSync(record, 'utf8'));
    if (other.stage_gate) {
      assert.ok(!/5862568703/.test(JSON.stringify(other.stage_gate)), `${id} must not inherit the SRC051-only S4 release`);
    }
  }
});

test('the four protected runtime blobs and the frozen defect ledger are untouched by S4', () => {
  // The capsules do not all carry the same authority shape, so each is asserted on the fields it
  // actually holds rather than on a field invented for the test. bytes + sha256 are the authority
  // identity; git_blob is recorded only where the Git lock is stored.
  for (const rel of ['manifest.json', 'split/materialization.json', 'baseline/accepted-baseline.json']) {
    assert.equal(readJson(rel).authority.bytes, 2782365, `${rel} keeps the authority byte count`);
    assert.equal(readJson(rel).authority.sha256, '5b7f084be9de9ca4f5d11044e797c3d2718208a2493d9ccbc9f8b5df07fdf014', `${rel} keeps the authority SHA-256`);
  }
  for (const rel of ['split/materialization.json', 'baseline/accepted-baseline.json']) {
    assert.equal(readJson(rel).authority.git_blob, 'fd7e48b1301abe0f857e9a7bbc06162c088d0abc', `${rel} keeps the locked authority blob`);
  }
  // authority-context.json records Drive provenance under `drive`, not `authority`; it must stay
  // present and still name the single canonical Drive object.
  const context = readJson('authority-context.json');
  assert.equal(context.drive.file_id, '1db5gYJPjTrvKxx_RzY-CAPG2WAg-e2nt', 'authority-context still names the canonical Drive object');
  assert.equal(context.drive.folder_id, 'UNRESOLVED', 'the non-blocking Drive folder id stays UNRESOLVED');
  assert.equal(context.drive.bytes, 2782365, 'authority-context keeps the authority byte count');
  assert.equal(context.drive.sha256, '5b7f084be9de9ca4f5d11044e797c3d2718208a2493d9ccbc9f8b5df07fdf014', 'authority-context keeps the authority SHA-256');
  // Repairing any of the seven would itself be a parity failure, so they must all still be recorded.
  assert.equal(readJson('baseline/accepted-baseline.json').frozen_defect_ledger.count_unique, 7);
  assert.equal(readJson('baseline/accepted-baseline.json').frozen_defect_ledger.items.length, 7);
});

test('the parity harness introduces none of the forbidden comparison techniques', () => {
  // Executable code only: the module header names each forbidden technique in order to forbid it.
  const code = readRepo('src/08_harness/source051-parity.mjs').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of [
    'SSIM', 'ssim', 'hamming', 'Hamming', 'pixelTolerance', 'epsilon',
    'Date.now =', 'Math.random =', 'requestAnimationFrame =', 'cancelAnimation', 'finish()',
    'addInitScript',
  ]) {
    assert.ok(!code.includes(forbidden), `the parity harness must not use ${forbidden}`);
  }
  assert.match(code, /waitForScrollArrival/, 'smooth-scroll arrival is waited for');
  assert.match(code, /resting_states/);
});

test('the lane metadata names the accepted viewports, motion and regression role', () => {
  const byLane = Object.fromEntries(SRC051_PARITY_LANES.map((lane) => [lane.lane, lane]));
  assert.deepEqual([byLane['desktop-normal'].width, byLane['desktop-normal'].height, byLane['desktop-normal'].dpr, byLane['desktop-normal'].reducedMotion], [1440, 900, 1, 'no-preference']);
  assert.deepEqual([byLane['desktop-reduced'].width, byLane['desktop-reduced'].height, byLane['desktop-reduced'].dpr, byLane['desktop-reduced'].reducedMotion], [1440, 900, 1, 'reduce']);
  assert.deepEqual([byLane['mobile-390'].width, byLane['mobile-390'].height, byLane['mobile-390'].dpr], [390, 844, 1]);
  assert.deepEqual([byLane['mobile-320'].width, byLane['mobile-320'].height, byLane['mobile-320'].dpr], [320, 720, 1]);
  // Mobile lanes are regression coverage and must never claim authority over the desktop surface.
  assert.equal(byLane['desktop-normal'].role, 'AUTHORITY');
  assert.equal(byLane['desktop-reduced'].role, 'AUTHORITY');
  assert.equal(byLane['mobile-390'].role, 'REGRESSION');
  assert.equal(byLane['mobile-320'].role, 'REGRESSION');
});
