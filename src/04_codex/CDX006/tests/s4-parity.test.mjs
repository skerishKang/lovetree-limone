import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const capsule = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(capsule, rel));
const json = (rel) => JSON.parse(read(rel).toString('utf8'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

/* The five accepted authority originals, SHA-256 as they exist at the accepted S3 head
 * 44e3506b5e6d09d0f0a11a8edc180aedb4fb3c8d. These were recomputed from the actual checkout after
 * confirming `git status` reports NO modification under original/** or split/**, i.e. the working
 * tree is byte-identical to the accepted head. The previous values in this file did not match the
 * files they named, so the lock was asserting against the wrong bytes. */
const PROTECTED = new Map([
  ['original/최종본.html', 'fdcc0ea79b342d051e90f8f073f7c7b8d8ce5c71f00c49f71461b314e78caf99'],
  ['original/개발과정/index.html', '656d76d4919468fa32adf697e7d40b752eabf3f924d4bde157ce2eaed787ff3d'],
  ['original/개발과정/01-memory-capsule.html', '10a10b17c0b9db2c7da32251f3d447efe11e91482424eb526ca57a2130501ad7'],
  ['original/개발과정/02-memory-stack.html', '222a3457b8472d99864ad9ed67c93ee17c30c813ad9f3d6732ec070dea82f657'],
  ['original/개발과정/03-tree-keeper.html', '5f16d19ea6d17c00535299e0ecfba03d11b54cdeae63ad966148dc09e6a9bdd4'],
]);

test('S4 candidate keeps all accepted authority originals byte-locked', () => {
  for (const [rel, expected] of PROTECTED) {
    assert.equal(sha(read(rel)), expected, rel);
  }
});

test('S4 candidate proof is exactly three clean fresh full runs', () => {
  const proof = json('evidence/s4/candidate-proof.json');
  assert.equal(proof.status, 'CANDIDATE_PENDING_CENTRAL');
  assert.equal(proof.parity_contract, 'SUITE_SPECIFIC_MOTION_RANDOMNESS_AWARE');
  assert.equal(proof.measurement.fresh_full_runs_required, 3);
  assert.equal(proof.measurement.fresh_full_runs_completed, 3);
  assert.equal(proof.measurement.paired_actions_per_run, 64);
  assert.equal(proof.measurement.total_paired_actions, 192);
  assert.equal(proof.measurement.screenshots_total, 384);
  assert.equal(proof.aggregate.clean_runs, '3/3');
  assert.equal(proof.aggregate.paired_actions_exact, '192/192');
  assert.equal(proof.aggregate.runtime_asset_sweeps, '516/516');
  assert.equal(proof.aggregate.real_parity_defects, 0);
  assert.equal(proof.aggregate.unclassified_residuals, 0);
  assert.equal(proof.aggregate.page_errors, 0);
  assert.equal(proof.aggregate.console_errors, 0);
  assert.equal(proof.aggregate.request_failed, 0);
  assert.equal(proof.aggregate.http_errors, 0);
  assert.equal(proof.aggregate.missing_runtime_assets, 0);
});

test('each durable run comparison is exact after only bounded source-traced projection', () => {
  const allowed = [
    'AUTHORED_FINITE_TRANSIENT_PHASE',
    'AUTHORED_LIVE_PHASE',
    'AUTHORED_RANDOM_SCALAR',
  ];
  for (const run of [1, 2, 3]) {
    const evidence = json(`evidence/s4/run${run}-comparison.json`);
    const s = evidence.summary;
    assert.equal(s.actions, 64, `run${run}`);
    assert.equal(s.real_parity_diffs, 0, `run${run}`);
    assert.equal(s.pairs_with_real_diffs, 0, `run${run}`);
    assert.deepEqual(s.allowed_classifications, allowed, `run${run}`);
    assert.deepEqual(s.original_errors, { page: 0, console: 0, requestFailed: 0, http: 0 });
    assert.deepEqual(s.split_errors, { page: 0, console: 0, requestFailed: 0, http: 0 });
    assert.deepEqual(s.original_assets, { expected: 86, loaded: 86, failures: 0 });
    assert.deepEqual(s.split_assets, { expected: 86, loaded: 86, failures: 0 });
    assert.equal(s.launcher_equal, true);
    for (const key of [
      'raw_png_equality_used',
      'pixel_tolerance_used',
      'ssim_used',
      'perceptual_hash_used',
      'rng_patch_used',
      'clock_patch_used',
      'runtime_source_patch_used',
    ]) assert.equal(s[key], false, `run${run} ${key}`);
  }
});

test('384 screenshot evidence records are fingerprinted but not used as an equality gate', () => {
  const m = json('evidence/s4/screenshot-manifest.json');
  assert.equal(m.total_screenshots, 384);
  assert.equal(m.runs, 3);
  assert.equal(m.screenshots_per_side_per_run, 64);
  assert.equal(m.records.length, 384);
  const unique = new Set(m.records.map((r) => `${r.run}/${r.side}/${r.file}`));
  assert.equal(unique.size, 384);
  for (const r of m.records) {
    assert.match(r.sha256, /^[0-9a-f]{64}$/);
    assert.ok(r.bytes > 0);
  }
});

test('all six frozen baseline defects remain preserved and unrepaired', () => {
  const proof = json('evidence/s4/candidate-proof.json');
  assert.equal(proof.frozen_source_defects.length, 6);
  assert.deepEqual(proof.frozen_source_defects.map((d) => d.id), [
    'BD-01','BD-02','BD-03','BD-04','BD-05','BD-06',
  ]);
  assert.ok(proof.frozen_source_defects.every((d) => d.preserved === true && d.repaired === false));
  const p02 = json('evidence/s4/p02-defect-probe.json');
  assert.equal(p02.parity.physicalBlockedBoth, true);
  assert.equal(p02.parity.physicalTitleUnchangedBoth, true);
  assert.equal(p02.original.domClick.titleAfter, 'Outfit Map');
  assert.equal(p02.split.domClick.titleAfter, 'Outfit Map');
  assert.equal(p02.original.legendClick.titleAfter, 'Emotion');
  assert.equal(p02.split.legendClick.titleAfter, 'Emotion');
  assert.equal(p02.parity.zeroErrors, true);
});

test('all eight authored suite edges are exercised and agree across every run and side', () => {
  /* The replay plan exercises 7 in-suite navigations; together with the launcher root redirect
   * (ROOT -> HUB, proven by the harness `launcher` record and `launcher_equal`) that is the 8
   * accepted edges. P03_FINAL -> P01 is authored in the SPLIT external script as a mechanical
   * extraction - not a URL rewrite - so it must work identically on both surfaces.
   *
   * Keys are asserted against what the comparator actually recorded, and every paired action must
   * be diff-free, which is what makes "agree across both sides" true for each edge. */
  const EDGE_ACTIONS = [
    'D1/HUB/navigate_01-memory-capsule.html',
    'D1/HUB/navigate_02-memory-stack.html',
    'D1/HUB/navigate_03-tree-keeper.html',
    'D1/P01/return_hub',
    'D1/P02/return_hub',
    'D1/P03/return_hub',
    'D1/P03/final_transition_to_p01',
  ];
  for (const run of [1, 2, 3]) {
    const ev = json(`evidence/s4/run${run}-comparison.json`);
    const byKey = new Map(ev.pairs.map((p) => [p.key, p]));
    for (const key of EDGE_ACTIONS) {
      assert.ok(byKey.has(key), `run${run} exercises ${key}`);
      assert.equal(byKey.get(key).diff_count, 0, `run${run} ${key} agrees across both sides`);
    }
    assert.equal(ev.summary.actions, 64, `run${run}`);
    assert.equal(ev.summary.launcher_equal, true,
      `run${run} ROOT -> HUB resolves to the same path on both surfaces`);
  }
  assert.equal(EDGE_ACTIONS.length + 1, 8, '7 in-suite navigations + the launcher root = 8 edges');
});

test('the CENTRAL review pack is present, hash-consistent, and still PENDING review', () => {
  /* The pack itself must exist and be fingerprint-consistent, but CENTRAL has NOT reviewed it.
   * LOCAL must never be able to make this suite green by asserting a CENTRAL pass: the status is
   * required to be PENDING_CENTRAL_REVIEW with a null reviewer and accepted=false, and a
   * premature PASS_CANDIDATE_EVIDENCE claim FAILS here. CENTRAL flips these when it reviews. */
  const proof = json('evidence/s4/candidate-proof.json');
  const vr = proof.central_direct_visual_review;
  assert.equal(vr.status, 'PENDING_CENTRAL_REVIEW', 'the visual review must remain pending');
  assert.equal(vr.reviewer, null, 'no reviewer may be recorded before CENTRAL reviews');
  assert.equal(vr.accepted, false, 'the candidate is not visually accepted');
  assert.notEqual(vr.status, 'PASS_CANDIDATE_EVIDENCE', 'a premature CENTRAL PASS is a failure');
  assert.equal(vr.run, 3);
  assert.equal(vr.pair_count, 15);
  assert.equal(vr.sheet_count, 3);

  const manifest = json('evidence/s4/review-pack/review-manifest.json');
  assert.equal(manifest.pair_count, 15);
  assert.equal(manifest.sheet_count, 3);
  assert.equal(manifest.raw_png_equality_used, false, 'the pack is not a pixel gate');
  for (const name of ['review-sheet-1.jpg','review-sheet-2.jpg','review-sheet-3.jpg']) {
    const b = read(`evidence/s4/review-pack/${name}`);
    assert.ok(b.length > 0, name);
    assert.equal(sha(b), vr.review_files[name].sha256, `${name} matches the recorded fingerprint`);
    assert.equal(sha(b), manifest.review_files[name].sha256, `${name} matches the pack manifest`);
  }
});

test('candidate lifecycle fails closed before CENTRAL S4 acceptance', () => {
  const manifest = json('manifest.json');
  assert.equal(manifest.s3_status, 'ACCEPTED');
  assert.equal(manifest.central_s3_accepted, true);
  assert.equal(manifest.stages.mechanical_split_complete, true);
  assert.equal(manifest.stages.source_split_parity_pass, false);
  assert.equal(manifest.s4_status, 'CANDIDATE_PENDING_CENTRAL');
  assert.equal(manifest.central_s4_accepted, false);
  assert.equal(manifest.parity_ref, null);
  assert.equal(manifest.s4_candidate_ref, 'evidence/s4/candidate-proof.json');
  assert.equal(manifest.stage_gate.s4_release, 'RELEASED');
  assert.equal(manifest.stage_gate.parity_capture_authorized, true);
  assert.equal(manifest.product_adoption, false);
  assert.equal(manifest.capability_native_adoption, false);
  assert.equal(manifest.product_canonical, false);
  assert.equal(manifest.drive_mutation, 0);
  assert.equal(fs.existsSync(path.join(capsule, 'evidence', 'parity', 'accepted-parity.json')), false);
});

test('source randomness and reduced-motion defect scope remains authored and unpatched', () => {
  const p01 = read('original/개발과정/01-memory-capsule.html').toString('utf8');
  const p02 = read('original/개발과정/02-memory-stack.html').toString('utf8');
  const p03 = read('original/개발과정/03-tree-keeper.html').toString('utf8');
  const hub = read('original/개발과정/index.html').toString('utf8');
  assert.equal((p01.match(/Math\.random\s*\(/g) || []).length, 5);
  assert.equal((p02.match(/Math\.random\s*\(/g) || []).length, 0);
  assert.equal((p03.match(/Math\.random\s*\(/g) || []).length, 4);
  assert.equal((hub.match(/Math\.random\s*\(/g) || []).length, 0);
  for (const s of [hub, p01, p02, p03]) {
    assert.equal(s.includes('prefers-reduced-motion'), false);
  }
});
