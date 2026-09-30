/**
 * Top-level CI wrapper for the MST105 / CDX005 S4 source-split parity lane.
 *
 * Why this file exists
 * --------------------
 * The S4 harness lives inside the capsule at src/04_codex/CDX005/tests/s4-parity.test.mjs,
 * but the A-track P0 workflow discovers only tests/*.test.mjs at the repository root. Without
 * this wrapper the S4 contract would never run in CI.
 *
 * What it does
 * ------------
 * It re-checks the S4 contract in CONTRACT MODE ONLY: no browser, no loopback server, no
 * screenshot. The real 36-state browser candidate run is a local, separately authorized step
 * that writes candidate evidence for CENTRAL's direct review.
 *
 * What it must not do
 * -------------------
 * It must not import Playwright and must not shell out. A-track classifies every
 * tests/*.test.mjs by grepping for Playwright usage, so this file must stay free of it or the
 * lane would be pulled into the browser bucket and would try to launch a browser in CI. The
 * self-guard at the end of this file enforces exactly that.
 *
 * Authority: skerishKang/lovetree-limone#589 comment 5889378824 (S3 accepted, S4 released).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAPSULE = path.join(ROOT, 'src', '04_codex', 'CDX005');
const S4_TEST = path.join(CAPSULE, 'tests', 's4-parity.test.mjs');
const S4_DIR = path.join(CAPSULE, 'evidence', 's4');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(CAPSULE, rel), 'utf8'));
const exists = (p) => fs.existsSync(p);
const gitBlobSha1 = (b) => crypto.createHash('sha1')
  .update(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])).digest('hex');

test('the CDX005 S4 harness exists and is registered for CI', () => {
  assert.ok(exists(S4_TEST), 'the capsule S4 harness is present');
  assert.ok(exists(S4_DIR), 'the S4 evidence directory is present');
});

test('the S4 contract records the motion-aware parity rules CENTRAL bound', () => {
  const contract = readJson(path.join('evidence', 's4', 'contract.json'));
  assert.equal(contract.parity_contract, 'SOURCE_SPECIFIC_MOTION_AWARE');
  const f = contract.parity_contract_fields;
  // The four forbidden numeric comparison techniques.
  assert.equal(f.RAW_PNG_BYTE_EQUALITY_REQUIRED, false);
  assert.equal(f.PIXEL_TOLERANCE, false);
  assert.equal(f.SSIM, false);
  assert.equal(f.PERCEPTUAL_HAMMING_THRESHOLD, false);
  // The three forbidden source-stabilization techniques.
  assert.equal(f.SOURCE_RANDOM_SEEDING, false);
  assert.equal(f.SOURCE_CLOCK_PATCH, false);
  assert.equal(f.SOURCE_BYTES_PATCH, false);
  // Acceptance is a human visual review, never an automated threshold.
  assert.equal(f.DIRECT_CENTRAL_VISUAL_REVIEW_REQUIRED, true);
  assert.equal(contract.state_plan.total, 36);
  assert.equal(contract.d2_d3_projection.policy, 'FIELD_LEVEL_ONLY_RANDOM_SCALARS');
  assert.equal(contract.animation_inventory_gate.authored_tracks.length, 4);
});

test('the S4 lane is candidate-only: nothing is promoted before CENTRAL accepts', () => {
  const manifest = readJson('manifest.json');
  const mat = readJson('split/materialization.json');
  assert.equal(manifest.stages.source_split_parity_pass, false, 'source_split_parity_pass stays false');
  assert.equal(manifest.parity_ref ?? null, null, 'the manifest carries no parity ref');
  assert.equal(mat.parity_ref ?? null, null, 'the materialization carries no parity ref');
  assert.notEqual(String(mat.status).toUpperCase(), 'ACCEPTED', 'the materialization is not ACCEPTED');
  assert.equal(
    exists(path.join(CAPSULE, 'evidence', 'parity', 'accepted-parity.json')), false,
    'no accepted-parity.json may exist before CENTRAL acceptance',
  );
  assert.equal(
    exists(path.join(CAPSULE, 'evidence', 'parity')), false,
    'no promoted parity directory may exist before CENTRAL acceptance',
  );
});

test('the four protected runtime files are byte-locked to the accepted S3 blobs', () => {
  const contract = readJson(path.join('evidence', 's4', 'contract.json'));
  for (const [rel, blob] of Object.entries(contract.protected_blobs)) {
    const bytes = fs.readFileSync(path.join(CAPSULE, rel));
    assert.equal(gitBlobSha1(bytes), blob, `${rel} is unchanged at the S4 stage`);
  }
});

test('both asset trees still carry the same 80 byte-identical vendored PNGs', () => {
  const dir = (which) => path.join(CAPSULE, which, 'assets', 'turnarounds', 'transparent');
  const list = fs.readdirSync(dir('original')).filter((n) => n.endsWith('.png')).sort();
  const splitList = fs.readdirSync(dir('split')).filter((n) => n.endsWith('.png')).sort();
  assert.equal(list.length, 80, 'the original tree carries 80 PNGs');
  assert.deepEqual(splitList, list, 'both trees carry the same 80 names');
  for (const n of list) {
    const a = fs.readFileSync(path.join(dir('original'), n));
    const b = fs.readFileSync(path.join(dir('split'), n));
    assert.ok(a.equals(b), `${n} is byte-identical on both sides`);
  }
});

test('the D1-D5 frozen source defects are still recorded as preserved and unrepaired', () => {
  const ctx = readJson('authority-context.json');
  assert.deepEqual(ctx.frozen_source_defects, ['D1', 'D2', 'D3', 'D4', 'D5']);
  for (const d of ctx.frozen_source_defects_detail) {
    assert.equal(d.preserved, true, `${d.id} is preserved`);
    assert.equal(d.repaired, false, `${d.id} claims no repair`);
  }
  const css = fs.readFileSync(path.join(CAPSULE, 'split', 'styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(CAPSULE, 'split', 'script.js'), 'utf8');
  // D1: still no authored reduced-motion rule.
  assert.equal((css.match(/prefers-reduced-motion/g) || []).length, 0);
  // D2 and D3: all three authored random sites are present and unseeded.
  assert.equal((js.match(/Math\.random\(\)/g) || []).length, 3);
  // D4: the rule that hides the authored stop control is preserved.
  assert.ok(css.includes('.top-actions .pill{display:none}'));
  // D5: the authored mobile scroll rule is preserved.
  assert.ok(css.includes('html,body{overflow:auto}'));
});

test('the S4 candidate summary, when present, is candidate-only and complete', () => {
  const summaryPath = path.join(S4_DIR, 'candidate-summary.json');
  if (!exists(summaryPath)) return; // the browser candidate has not been run yet
  const s = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  assert.equal(s.candidate_only, true);
  assert.equal(s.PAIRED_STATE_COUNT, 36);
  assert.equal(s.REVIEW_PACK_COUNT, 12);
  assert.equal(s.candidate_state.source_split_parity_pass, false);
  assert.equal(s.candidate_state.parity_ref, null);
  assert.equal(s.candidate_state.S4_ACCEPTED, 'NO');
  assert.equal(s.candidate_state.READY, 'NO');
  assert.equal(s.candidate_state.MERGE, 'NO');
  assert.equal(s.candidate_state.parity_status, 'CANDIDATE_PENDING_CENTRAL');
  assert.ok(
    ['CANDIDATE_PASS_PENDING_CENTRAL_ACCEPTANCE', 'CANDIDATE_HOLD'].includes(s.S4_VERDICT),
    'the verdict is one of the two permitted candidate verdicts',
  );
  // A non-zero real-defect count must never be reported as a pass.
  if (s.REAL_PARITY_DEFECTS > 0) {
    assert.equal(s.S4_VERDICT, 'CANDIDATE_HOLD', 'any real parity defect forces CANDIDATE_HOLD');
  }
  if (s.D1_D5_PRESERVED !== 'YES') {
    assert.equal(s.S4_VERDICT, 'CANDIDATE_HOLD', 'a D1-D5 regression forces CANDIDATE_HOLD');
  }
});

test('the S4 lifecycle metadata is current, consistent and never promoted', () => {
  const ctx = readJson('authority-context.json');
  const mat = readJson(path.join('split', 'materialization.json'));
  const s4Exists = exists(path.join(CAPSULE, 'evidence', 's4'));
  // HOLD-2: an existing S4 candidate directory must not coexist with a stale S3-era gate.
  if (s4Exists) {
    assert.equal(ctx.stage_gate.s4_release, 'RELEASED_CANDIDATE_ONLY',
      'an S4 candidate exists, so the release gate is RELEASED_CANDIDATE_ONLY');
    assert.equal(ctx.stage_gate.parity_capture_authorized, true,
      'an S4 candidate exists, so parity capture is authorized');
    assert.equal(ctx.stage_gate.parity_status, 'CANDIDATE_PENDING_CENTRAL');
    assert.equal(mat.parity_status, 'CANDIDATE_PENDING_CENTRAL');
  }
  // The two canonical files must agree with each other, whichever branch we are in.
  assert.equal(ctx.stage_gate.s4_release, mat.stage_gate.s4_release,
    'authority-context and materialization agree on s4_release');
  assert.equal(ctx.stage_gate.parity_capture_authorized, mat.stage_gate.parity_capture_authorized,
    'authority-context and materialization agree on parity_capture_authorized');
  assert.equal(mat.stage_gate.parity_status, mat.parity_status,
    'materialization stage_gate.parity_status matches materialization.parity_status');
  // Parity is never claimed at candidate stage, in either branch.
  assert.equal(ctx.stage_gate.source_split_parity_pass, false, 'source_split_parity_pass stays false');
  assert.equal(mat.stage_gate.source_split_parity_pass, false, 'source_split_parity_pass stays false');
  assert.equal(ctx.stage_gate.parity_ref, null, 'parity_ref stays null');
  assert.equal(mat.parity_ref, null, 'parity_ref stays null');
  assert.equal(exists(path.join(CAPSULE, 'evidence', 'parity', 'accepted-parity.json')), false,
    'no accepted-parity.json may exist before CENTRAL acceptance');
});

test('the three-run proof, when present, records three clean fresh full runs', () => {
  const proofPath = path.join(S4_DIR, 'three-run-proof.json');
  if (!exists(proofPath)) return; // the browser candidate has not been run yet
  const p = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
  assert.equal(p.required_runs, 3, 'the proof requires three runs');
  for (const r of p.runs) {
    assert.equal(r.paired_state_count, 36, `run ${r.run_index} is a full 36-state replay`);
    // Per-run acceptance requirements from the ruling. A run that fails any of these is not
    // clean, and the proof then fails: there is no averaging and no best-of.
    assert.equal(r.semantic_contract_exact, '36/36',
      `run ${r.run_index} contract-exactness is 36/36`);
    assert.equal(r.real_parity_defects, 0, `run ${r.run_index} has no real parity defect`);
    assert.equal(r.unclassified_residuals, 0, `run ${r.run_index} has no unclassified residual`);
    assert.equal(r.d1_d5_preserved, 'YES', `run ${r.run_index} preserves D1-D5`);
    assert.equal(r.network_error_states, 0, `run ${r.run_index} has no network error state`);
    assert.equal(r.missing_asset_states, 0, `run ${r.run_index} has no missing asset state`);
    assert.equal(r.stable_states_exact, r.stable_states,
      `run ${r.run_index} is exact on every STABLE state`);
    assert.deepEqual(r.stable_state_defects, [], `run ${r.run_index} records no stable defect`);
  }
  assert.equal(p.runs_clean, true, 'every recorded run is clean');
  assert.equal(p.THREE_RUN_PROOF, true, 'the three-run proof is satisfied');
});

test('the committed review pack holds exactly the 12 bounded CENTRAL review states', () => {
  const pack = path.join(S4_DIR, 'review-pack');
  if (!exists(pack)) return;
  const files = fs.readdirSync(pack).filter((n) => n.endsWith('.png')).sort();
  assert.equal(files.length, 12, 'exactly 12 review images are committed');
  const expected = [
    'D1__AUTO_PAUSED_A_000.png',
    'D1__MANUAL_ROTATE_A_045.png',
    'D1__NEXT_LOOK_B_000_SETTLED.png',
    'D1__SAVE_LOOK_F_STEADY.png',
    'D1__UPLOAD_MODAL_OPEN.png',
    'D1__CARD_HOVER.png',
    'D1__LOOK_SWITCH_TRANSIENT_OUT.png',
    'D1__SAVE_BURST_TRANSIENT.png',
    'T1__NEXT_LOOK_B_000_SETTLED.png',
    'M1__AUTO_PAUSED_A_000.png',
    'M1__MOBILE_PANEL_AND_GRID_FLOW.png',
    'R1__INITIAL_SOURCE_BEHAVIOR.png',
  ];
  // Sorted for comparison, because readdir order is filesystem-dependent. The set must match the
  // 12 states CENTRAL named; the order CENTRAL listed them in is only the source of this list.
  assert.deepEqual(files, [...expected].sort(), 'the review pack matches the 12 states CENTRAL named');
});

test('this wrapper stays out of the browser bucket and never shells out', () => {
  const self = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const code = self.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  /* The marker lists are assembled from fragments and comments are stripped above, so this
   * guard cannot match its own token list. A real usage is still detected. */
  const pw = ['from ' + "'playwright'", 'from ' + '"playwright"', '@play' + 'wright/test',
    'chromium' + '.launch', 'firefox' + '.launch', 'webkit' + '.launch'];
  for (const marker of pw) {
    assert.equal(code.includes(marker), false, `the wrapper must not use ${marker}`);
  }
  const sh = ['spawn' + 'Sync', 'exec' + 'FileSync', 'child_' + 'process'];
  for (const marker of sh) {
    assert.equal(code.includes(marker), false, `the wrapper must not use ${marker}`);
  }
});
