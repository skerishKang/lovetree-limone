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

test('S4 candidate proof is exactly three clean fresh full runs of the RECUT2 series', () => {
  const proof = json('evidence/s4/candidate-proof.json');
  assert.equal(proof.status, 'CANDIDATE_PENDING_CENTRAL');
  assert.equal(proof.parity_contract, 'SUITE_SPECIFIC_MOTION_RANDOMNESS_AWARE');
  assert.equal(proof.series, 'LOCAL_K_LIPVOICE_RECUT_2');
  assert.equal(proof.measurement.fresh_full_runs_required, 3);
  assert.equal(proof.measurement.fresh_full_runs_completed, 3);
  assert.equal(proof.measurement.paired_actions_per_run, 64);
  assert.equal(proof.measurement.total_paired_actions, 192);
  assert.equal(proof.measurement.screenshots_total, 384);
  assert.equal(proof.measurement.suite_edges, 8);
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
  assert.equal(proof.aggregate.finite_transition_structural_mismatches, 0);
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
    /* Fail-closed comparator invariants: an unequal CSSTransition STRUCTURE can never be
     * absorbed into AUTHORED_FINITE_TRANSIENT_PHASE again, and keeper element state is measured
     * rather than inferred from the transition list. */
    assert.equal(s.unclassified_residuals, 0, `run${run} unclassified residuals`);
    assert.equal(s.transition_structure_fail_closed, true, `run${run}`);
    assert.equal(s.keeper_state_compared, true, `run${run}`);
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

test('no pair carries an unclassified finite-transition structural residual', () => {
  /* This is the exact condition that let Pair 15 pass before: an empty ORIGINAL transition
   * target set against a populated SPLIT one was recorded as an allowance and scored 0. Any
   * residual here means the comparator re-became permissive. */
  for (const run of [1, 2, 3]) {
    const evidence = json(`evidence/s4/run${run}-comparison.json`);
    for (const p of evidence.pairs) {
      assert.equal(p.unclassified_transition_residuals.length, 0,
        `run${run} ${p.key} has an unclassified transition structural residual`);
      const allowance = (evidence.allowed || []).find(
        (a) => a.key === p.key && a.classification === 'UNCLASSIFIED_FINITE_TRANSITION_STRUCTURE');
      assert.equal(allowance, undefined, `run${run} ${p.key} must not carry a structural allowance`);
    }
    const anyUnclassified = (evidence.allowed || []).filter(
      (a) => a.classification === 'UNCLASSIFIED_FINITE_TRANSITION_STRUCTURE');
    assert.equal(anyUnclassified.length, 0, `run${run} structural mismatches must be zero`);
  }
});

test('P03 keeper state is measured and agrees across both sides in every P03 pair', () => {
  /* The keeper snapshot is the regression lock for Pair 15. It must be PRESENT (proving the
   * selector works), it must record the settled state, and ORIGINAL/SPLIT must agree exactly -
   * same src, same natural dimensions, same opacity, same rect, same viewport intersection. */
  for (const run of [1, 2, 3]) {
    const o = json(`evidence/s4/run${run}-original-baseline.json`);
    const s = json(`evidence/s4/run${run}-split-baseline.json`);
    const p03o = o.actions.filter((a) => a.surface === 'P03');
    const p03s = s.actions.filter((a) => a.surface === 'P03');
    assert.ok(p03o.length > 0 && p03s.length > 0, `run${run} must capture P03`);
    for (let i = 0; i < p03o.length; i += 1) {
      const a = p03o[i], b = p03s[i];
      assert.equal(`${a.ctx}/${a.state}`, `${b.ctx}/${b.state}`, `run${run} pair order`);
      /* P03 states that end on another surface (the return_hub edge navigates to HUB) carry no
       * keeper. Agreement there is that BOTH sides report the same absence - which is itself a
       * meaningful parity assertion, so it is compared rather than skipped. */
      const ka = a.snapshot.keeper, kb = b.snapshot.keeper;
      assert.equal(ka.exists, kb.exists, `run${run} ${a.ctx}/${a.state} keeper existence must agree`);
      if (!ka.exists) continue;
      assert.equal(a.settleMode, 'KEEPER_AWARE', `run${run} ${a.ctx}/${a.state} must use the keeper-aware wait`);
      assert.equal(b.settleMode, 'KEEPER_AWARE', `run${run} ${a.ctx}/${a.state} split must use the keeper-aware wait`);
      assert.notEqual(ka, undefined, `run${run} ${a.ctx}/${a.state} keeper snapshot missing`);
      assert.notEqual(kb, undefined, `run${run} ${b.ctx}/${b.state} keeper snapshot missing`);
      assert.equal(ka.exists, true, `run${run} ${a.ctx}/${a.state} keeper must exist`);
      assert.equal(kb.exists, true, `run${run} ${b.ctx}/${b.state} keeper must exist`);
      /* Settled: decoded, displayed, visible, fully opaque, off the authored `out` state. */
      assert.equal(ka.complete, true, `run${run} ${a.ctx}/${a.state} keeper.complete`);
      assert.ok(ka.naturalWidth > 0, `run${run} ${a.ctx}/${a.state} keeper naturalWidth`);
      assert.notEqual(ka.display, 'none', `run${run} ${a.ctx}/${a.state} keeper.display`);
      assert.notEqual(ka.visibility, 'hidden', `run${run} ${a.ctx}/${a.state} keeper.visibility`);
      assert.equal(Number(ka.opacity), 1, `run${run} ${a.ctx}/${a.state} keeper settled opacity`);
      assert.equal(kb.complete, true);
      assert.ok(kb.naturalWidth > 0);
      assert.notEqual(kb.display, 'none');
      assert.notEqual(kb.visibility, 'hidden');
      assert.equal(Number(kb.opacity), 1);
      /* The pair-15 signature: the keeper figure is present and settled on BOTH sides.
       * currentSrc is compared as its resolved PATH, because it is an absolute URL embedding the
       * loopback serving port and the two sides are deliberately served on different ports. */
      assert.deepEqual(ka.src, kb.src, `run${run} ${a.ctx}/${a.state} keeper.src`);
      assert.deepEqual(ka.currentSrcPath, kb.currentSrcPath, `run${run} ${a.ctx}/${a.state} keeper.currentSrcPath`);
      assert.deepEqual(ka.naturalWidth, kb.naturalWidth, `run${run} ${a.ctx}/${a.state} keeper.naturalWidth`);
      assert.deepEqual(ka.naturalHeight, kb.naturalHeight, `run${run} ${a.ctx}/${a.state} keeper.naturalHeight`);
      assert.deepEqual(ka.rect, kb.rect, `run${run} ${a.ctx}/${a.state} keeper.rect`);
      assert.deepEqual(ka.viewportIntersection, kb.viewportIntersection, `run${run} ${a.ctx}/${a.state} keeper viewport`);
      assert.deepEqual(ka.transform, kb.transform, `run${run} ${a.ctx}/${a.state} keeper.transform`);
      assert.deepEqual(ka.parent.rect, kb.parent.rect, `run${run} ${a.ctx}/${a.state} keeper.parent rect`);
      assert.deepEqual(ka.runningTransitions, kb.runningTransitions, `run${run} ${a.ctx}/${a.state} keeper running transitions`);
    }
  }
});

test('P03 initial capture is keeper-stabilized rather than sampled inside the authored transient', () => {
  /* P03's authored scene logic adds `out` and clears it after 180ms behind a .55s transition.
   * A fixed settle lands inside that window, so the initial states must be captured with the
   * source-aware bounded wait instead - proven by the recorded settle mode. */
  for (const run of [1, 2, 3]) {
    for (const [side, file] of [['original', `evidence/s4/run${run}-original-baseline.json`],
      ['split', `evidence/s4/run${run}-split-baseline.json`]]) {
      const ev = json(file);
      for (const key of ['D1/P03/scene_01', 'M1/P03/initial', 'R1/P03/initial', 'T1/P03/initial']) {
        const a = ev.actions.find((x) => `${x.ctx}/${x.surface}/${x.state}` === key);
        assert.ok(a, `run${run} ${side} must contain ${key}`);
        assert.equal(a.settleMode, 'KEEPER_AWARE', `run${run} ${side} ${key} must use the keeper-aware wait`);
        assert.equal(a.snapshot.keeper.runningTransitions, 0,
          `run${run} ${side} ${key} captured with a keeper transition still running`);
        assert.equal(a.snapshot.keeper.className.includes('out'), false,
          `run${run} ${side} ${key} captured while the authored \`out\` class was still applied`);
      }
    }
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
  assert.equal(vr.pair_count, 18);
  assert.equal(vr.sheet_count, 4);

  const manifest = json('evidence/s4/review-pack/review-manifest.json');
  assert.equal(manifest.series, 'LOCAL_K_LIPVOICE_RECUT_2');
  assert.equal(manifest.pair_count, 18);
  assert.equal(manifest.sheet_count, 4);
  assert.equal(manifest.raw_png_equality_used, false, 'the pack is not a pixel gate');
  for (const name of Object.keys(manifest.review_files)) {
    const b = read(`evidence/s4/review-pack/${name}`);
    assert.ok(b.length > 0, name);
    assert.equal(sha(b), vr.review_files[name].sha256, `${name} matches the recorded fingerprint`);
    assert.equal(sha(b), manifest.review_files[name].sha256, `${name} matches the pack manifest`);
    assert.equal(b.length, manifest.review_files[name].bytes, `${name} byte count`);
  }
  assert.equal(Object.keys(manifest.review_files).length, manifest.sheet_count);
});

test('review pack carries the two RECUT2 pairs that matter and maps all six frozen defects', () => {
  const manifest = json('evidence/s4/review-pack/review-manifest.json');
  const keys = manifest.pairs.map((p) => p.key);
  /* M1/P03 initial: the pair-15 subject, now captured with the keeper settled.
   * T1/P03 initial: the visual surface for BD-06. */
  assert.ok(keys.includes('M1/P03/initial'), 'review pack must contain M1/P03/initial');
  assert.ok(keys.includes('T1/P03/initial'), 'review pack must contain T1/P03/initial');
  for (const p of manifest.pairs) {
    assert.ok(p.key && p.original && p.split, `${p.file} must reference both sides`);
  }
  /* Every frozen defect must be visible in at least one ORIGINAL/SPLIT pair. */
  const cov = manifest.frozen_defect_coverage;
  assert.deepEqual(Object.keys(cov).sort(), ['BD-01','BD-02','BD-03','BD-04','BD-05','BD-06']);
  for (const [bd, pairs] of Object.entries(cov)) {
    assert.ok(Array.isArray(pairs) && pairs.length >= 1, `${bd} must map to >=1 pair`);
    for (const k of pairs) assert.ok(keys.includes(k), `${bd} maps to unknown pair ${k}`);
  }
  /* BD-06 is the frozen P03 T1 layout collision; it must be carried by the T1/P03 pair. */
  assert.ok(cov['BD-06'].includes('T1/P03/initial'), 'BD-06 must be covered by T1/P03/initial');
  /* BD-05 is the P03 M1 control loss; it must be carried by the M1/P03 pair. */
  assert.ok(cov['BD-05'].includes('M1/P03/initial'), 'BD-05 must be covered by M1/P03/initial');
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
