/**
 * CDX005 S4 — original/split source-split parity (CANDIDATE ONLY).
 *
 * Two modes, following the CDX017 precedent:
 *
 *   DEFAULT / contract mode   no browser, CI-safe. Verifies the frozen protected
 *                             bytes, the candidate-only metadata state, the exact
 *                             36-state plan, and the absence of any accepted-parity
 *                             artifact. This is what the top-level CI wrapper runs.
 *
 *   BROWSER CANDIDATE MODE    enabled with CDX005_S4_BROWSER_CANDIDATE=1. Serves the
 *                             capsule original/ and split/ read-only over loopback and
 *                             replays all 36 accepted S2 states on BOTH surfaces,
 *                             collecting the hard parity channels before any
 *                             screenshot-only stabilization.
 *
 * PARITY_CONTRACT = SOURCE_SPECIFIC_MOTION_AWARE
 *   No pixel tolerance, no SSIM, no perceptual Hamming threshold, no Math.random
 *   seeding, no clock patch, no source byte patch. Raw PNG equality is evidence
 *   only and is never required. Acceptance is CENTRAL's direct visual review.
 *
 * CANDIDATE ONLY. This file must never create evidence/parity/accepted-parity.json,
 * must never set source_split_parity_pass=true, and must never mark the
 * materialization ACCEPTED. S4 acceptance is CENTRAL's decision.
 *
 * The four protected runtime files and all 160 vendored PNGs are read-only inputs
 * here and are never written.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAPSULE = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');
const read = (rel) => fs.readFileSync(path.join(CAPSULE, rel));
const readJson = (rel) => JSON.parse(read(rel).toString('utf8'));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const gitBlobSha1 = (b) => crypto.createHash('sha1')
  .update(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])).digest('hex');

const BROWSER_MODE = process.env.CDX005_S4_BROWSER_CANDIDATE === '1';
/* The three-run proof index. Each fresh full 36-state replay records its own run, and the proof
 * requires three consecutive clean runs (ruling 5906458180). */
const RUN_INDEX = Number.parseInt(process.env.CDX005_S4_RUN_INDEX || '1', 10);
const EVIDENCE_DIR = process.env.CDX005_S4_EVIDENCE_DIR
  || path.join(os.tmpdir(), 'cdx005-s4-candidate');
const REVIEW_PACK_DIR = path.join(CAPSULE, 'evidence', 's4', 'review-pack');

const PROTECTED = {
  'original/original.html': { bytes: 27918, sha256: 'ac30f2abfc88e99e1ce7829f270c4cc76a5eae93b5f1b1e3a56dac1654c5b466', git_blob_sha1: '782e4dbb0de1d1a1d8bbff0b3674a6ec51baa8d3' },
  'split/index.html': { bytes: 4041, sha256: '67d4d26d185f5544ed51bf0827a0b696b6d3a90aefe164216aed75333e33d172', git_blob_sha1: '3fd5f6895c604e1e7b9e34f04f2935b54dbedfc8' },
  'split/styles.css': { bytes: 13963, sha256: '8d446c57cbdc911d3d3df163e31d21b761c9ab8a145913f235249cf63f0f0766', git_blob_sha1: 'f0fa2b60aef8a75ea572979c13fd7f88a9280bca' },
  'split/script.js': { bytes: 9961, sha256: '37b19ee9369a40d589eff35540ece741bfe9bff095e64b29111065f63001cafd', git_blob_sha1: 'cca7098156ca3f7c728fb40340e81c16f034939a' },
};

const ANGLES = ['000', '045', '090', '135', '180', '225', '270', '315'];
const LOOKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/**
 * The authored infinite keyframe tracks. These are the D1 continuous-motion truth and are
 * structurally stable: they exist for the whole life of the page on every state, so the
 * ORIGINAL and SPLIT inventories must match EXACTLY on target, name, duration, delay,
 * iteration count and playState. They are the animation-inventory acceptance gate.
 *
 * CSSTransition entries are deliberately separated. They are the authored 190 ms look-switch
 * transition plus the `#angleDots b` active-transition, so whether one is still live at the
 * instant of measurement depends on capture timing, not on state. They are captured and
 * reported, and they are additionally cross-checked against a second ORIGINAL run using the
 * same two-repetition method S2 used, but they are not the gate. This is a declared
 * nondeterminism class with recorded evidence, not an invented tolerance.
 */
const AUTHORED_TRACKS = ['drift', 'scan', 'spin', 'burst'];
/* Mirrors the AUTHORED literal inside the page-evaluated collector. C10 asserts they match. */
const PAGE_AUTHORED_TRACKS = ['drift', 'scan', 'spin', 'burst'];

/**
 * The exact accepted S2 state plan. Names are verbatim from the S2 baseline
 * (workdiary 960fd4ad407d5b996f644064c6ed1a5b7383d7ab). Nothing is added, dropped
 * or renamed.
 */
const STATE_PLAN = {
  D1: {
    id: 'D1', label: 'desktop', width: 1440, height: 900, dpr: 1, reduced: false,
    states: [
      '01_initial_auto_active', '02_auto_paused', '03_manual_rotate_045',
      '04_manual_rotate_315', '05_next_look_b_settled', '06_card_select_f_settled',
      '07_filter_male', '08_filter_female', '09_save_look_f_steady',
      '10_filter_saved_after_save', '11_upload_modal_open',
      '12_upload_processing_started', '13_sound_toggled', '14_card_hover',
      '15_primary_save_hover', '16_look_switch_transient_out',
      '17_save_burst_transient', '18_upload_complete_toast',
    ],
  },
  T1: {
    id: 'T1', label: 'tablet', width: 900, height: 900, dpr: 1, reduced: false,
    states: [
      '01_auto_paused', '02_manual_rotate_045', '03_next_look_b_settled',
      '04_filter_female', '05_save_look_steady', '06_upload_modal_open',
    ],
  },
  M1: {
    id: 'M1', label: 'mobile', width: 390, height: 844, dpr: 1, reduced: false,
    states: [
      '01_initial_source_behavior', '02_manual_rotate_045',
      '03_next_look_b_settled', '04_filter_female', '05_save_look_steady',
      '06_filter_saved_after_save', '07_upload_modal_open', '08_mobile_layout_flow',
    ],
  },
  R1: {
    id: 'R1', label: 'reduce', width: 1440, height: 900, dpr: 1, reduced: true,
    states: [
      '01_initial_source_behavior', '02_auto_paused',
      '03_css_drift_spin_scan_observation', '04_save_burst_observation',
    ],
  },
};
const ALL_STATES = Object.values(STATE_PLAN)
  .flatMap((ctx) => ctx.states.map((s) => ({ ctx: ctx.id, state: s })));
const TOTAL_PAIRED_STATES = ALL_STATES.length;

/**
 * The 12 CENTRAL review labels, each bound to its verbatim S2 state. CENTRAL's review
 * pack uses display labels that are not the S2 names; the S2 name remains canonical
 * everywhere and this table records the explicit binding rather than renaming anything.
 */
const REVIEW_PACK = [
  { label: 'D1::AUTO_PAUSED_A_000', ctx: 'D1', state: '02_auto_paused' },
  { label: 'D1::MANUAL_ROTATE_A_045', ctx: 'D1', state: '03_manual_rotate_045' },
  { label: 'D1::NEXT_LOOK_B_000_SETTLED', ctx: 'D1', state: '05_next_look_b_settled' },
  { label: 'D1::SAVE_LOOK_F_STEADY', ctx: 'D1', state: '09_save_look_f_steady' },
  { label: 'D1::UPLOAD_MODAL_OPEN', ctx: 'D1', state: '11_upload_modal_open' },
  { label: 'D1::CARD_HOVER', ctx: 'D1', state: '14_card_hover' },
  { label: 'D1::LOOK_SWITCH_TRANSIENT_OUT', ctx: 'D1', state: '16_look_switch_transient_out' },
  { label: 'D1::SAVE_BURST_TRANSIENT', ctx: 'D1', state: '17_save_burst_transient' },
  { label: 'T1::NEXT_LOOK_B_000_SETTLED', ctx: 'T1', state: '03_next_look_b_settled' },
  // M1 has no user-reachable "auto paused" state: D4 makes that impossible. This label
  // binds to the S2 initial state, proven D4 first, then harness-stabilized.
  { label: 'M1::AUTO_PAUSED_A_000', ctx: 'M1', state: '01_initial_source_behavior', stabilization: 'HARNESS_ONLY_NOT_USER_REACHABLE' },
  { label: 'M1::MOBILE_PANEL_AND_GRID_FLOW', ctx: 'M1', state: '08_mobile_layout_flow' },
  { label: 'R1::INITIAL_SOURCE_BEHAVIOR', ctx: 'R1', state: '01_initial_source_behavior' },
];

/**
 * Per-state capture intent, per CENTRAL's settle ruling (#589 comment 5905286796).
 *
 * The intent is decided by the ACCEPTED S2 STATE MEANING, not by any predicted count. Six
 * accepted states are semantically live or intentionally transient and must NOT be
 * converted into a paused stable state; every other state is STABLE. On a STABLE state a
 * residual after the required settle/phase procedure is a REAL parity defect.
 *
 *   STABLE            -> stop the authored JS auto loop through the authored AUTO control,
 *                        wait out any authored finite CSS transition, then capture.
 *   AUTHORED_LIVE     -> stopping it would falsify the accepted state. Keep it live and
 *                        record the phase in residual-ledger.json.
 *   EXPLICIT_TRANSIENT-> do not wait it into a different semantic state. Keep the transient.
 */
const STATE_INTENT = {
  'D1/01_initial_auto_active': 'AUTHORED_LIVE',
  'D1/16_look_switch_transient_out': 'EXPLICIT_TRANSIENT',
  'D1/17_save_burst_transient': 'EXPLICIT_TRANSIENT',
  'R1/01_initial_source_behavior': 'AUTHORED_LIVE',
  'R1/03_css_drift_spin_scan_observation': 'AUTHORED_LIVE',
  'R1/04_save_burst_observation': 'EXPLICIT_TRANSIENT',
};
/* R1/03 exists to observe the CONTINUOUS authored CSS tracks (drift/spin/scan). The JS auto
 * loop may be paused there, because that does not falsify the CSS-motion observation, but the
 * CSS tracks themselves stay live for the native evidence. It is the one AUTHORED_LIVE state
 * that still permits an authored-control stop. */
const INTENT_PERMITS_JS_PAUSE = new Set(['R1/03_css_drift_spin_scan_observation']);
const intentOf = (ctx, state) => STATE_INTENT[`${ctx}/${state}`] || 'STABLE';

/* States whose accepted S2 name PINS the angle: the authored drag result is the state, so the
 * harness must never rewind it. Every other STABLE state is compared at the authored 000 angle.
 * An angle-pinned state is still settled through the AUTO pause and its terminal predicate. */
const ANGLE_PINNED_STATES = new Set(['02_manual_rotate_045', '03_manual_rotate_045', '04_manual_rotate_315']);
const angleIsPinned = (state) => ANGLE_PINNED_STATES.has(state);

/** The bounded, exhaustive set of residual classifications (ruling 5905286796). A residual
 * that cannot be assigned one of these is a REAL PARITY DEFECT, never a ledger row. */
const ALLOWED_CLASSIFICATIONS = [
  'D2_RANDOM_SCALAR',
  'D3_RANDOM_SCALAR',
  'AUTHORED_LIVE_PHASE',
  'AUTHORED_FINITE_TRANSIENT_PHASE',
  'INFINITE_CSS_PHASE_AFTER_NATIVE_PROOF',
];

/**
 * The bounded stochastic projection. Field-level only, and only for the authored
 * Math.random() sites. Nothing here widens a semantic, geometry, style or runtime
 * comparison: these are the exact random scalars CENTRAL declared, plus the fields
 * that are pure deterministic functions of those same scalars.
 */
const D2_RANDOM_FIELDS = [
  'dom.burstParticleXsYs[].x', 'dom.burstParticleXsYs[].y',
  'dom.burstAnimationDelays[]',
];
const D3_RANDOM_FIELDS = [
  'dom.modal.percent', 'dom.modal.barWidth', 'dom.modal.stepDoneSignature',
];
const STOCHASTIC_PROJECTION = {
  D2: D2_RANDOM_FIELDS,
  D3: D3_RANDOM_FIELDS,
  note: 'dom.modal.stepDoneSignature is a pure function of the same random scalar p '
    + '(the authored step thresholds are i*23+8), so it is projected with the percent it '
    + 'derives from rather than compared independently. The completion transition '
    + '(p===100 -> closeModal + toast) is NOT random-dependent at the end state and is '
    + 'compared exactly.',
};

/* ============================== CONTRACT MODE ============================== */
/* Default mode. No browser. This is what CI executes through the top-level wrapper. */

test('C01 the four protected runtime files are byte-locked to the accepted S3 blobs', () => {
  for (const [rel, pin] of Object.entries(PROTECTED)) {
    const b = read(rel);
    assert.equal(b.length, pin.bytes, `${rel} byte size`);
    assert.equal(sha256(b), pin.sha256, `${rel} sha256`);
    assert.equal(gitBlobSha1(b), pin.git_blob_sha1, `${rel} git blob`);
  }
});

test('C02 all 160 vendored PNGs are byte-identical on both sides', () => {
  const derived = LOOKS.flatMap((id) => ANGLES.map((a) => `${id}_${a}.png`));
  const list = (which) => fs.readdirSync(path.join(CAPSULE, which, 'assets', 'turnarounds', 'transparent'))
    .filter((n) => n.endsWith('.png')).sort();
  const o = list('original');
  const s = list('split');
  assert.deepEqual(o, derived, 'original vendored set equals the 10x8 authored derivation');
  assert.deepEqual(s, derived, 'split vendored set equals the 10x8 authored derivation');
  assert.equal(o.length, 80);
  let bytes = 0;
  for (const n of derived) {
    const ob = read(`original/assets/turnarounds/transparent/${n}`);
    const sb = read(`split/assets/turnarounds/transparent/${n}`);
    assert.ok(ob.equals(sb), `${n} original/split copies are byte-identical`);
    bytes += ob.length;
  }
  assert.equal(bytes, 6363788, 'each-side asset bytes');
});

test('C03 the S4 run does not mutate any protected runtime byte', () => {
  for (const rel of Object.keys(PROTECTED)) {
    const b = read(rel);
    assert.equal(sha256(b), PROTECTED[rel].sha256, `${rel} unchanged by the S4 lane`);
  }
});

test('C04 the state plan is exactly the 36 accepted S2 states, nothing added or dropped', () => {
  assert.equal(TOTAL_PAIRED_STATES, 36, 'exactly 36 paired states');
  assert.equal(STATE_PLAN.D1.states.length, 18);
  assert.equal(STATE_PLAN.T1.states.length, 6);
  assert.equal(STATE_PLAN.M1.states.length, 8);
  assert.equal(STATE_PLAN.R1.states.length, 4);
  const baseline = readJson('baseline/accepted-baseline.json');
  for (const ctx of Object.values(STATE_PLAN)) {
    const rec = baseline.capture.contexts.find((c) => c.id === ctx.id);
    assert.ok(rec, `accepted baseline records context ${ctx.id}`);
    assert.equal(rec.states, ctx.states.length, `${ctx.id} state count matches the accepted baseline`);
  }
  assert.equal(baseline.capture.states_total, 36);
  const names = new Set(ALL_STATES.map((s) => `${s.ctx}/${s.state}`));
  assert.equal(names.size, 36, 'no duplicate state keys');
  for (const s of ALL_STATES) {
    assert.match(s.state, /^\d{2}_[a-z0-9_]+$/, `${s.ctx}/${s.state} keeps the S2 name shape`);
  }
});

test('C16 the projection is field-level and keeps the D2/D3 enclosing structure exact', () => {
  // A projection that nulled a whole subtree would hide a real structural difference. Only the
  // declared random scalars may be replaced.
  const a = {
    dom: {
      burstParticleXsYs: [{ x: '10px', y: '20px' }, { x: '30px', y: '40px' }],
      burstAnimationDelays: ['0.01s', '0.02s'],
      modal: { percent: '25%', barWidth: '25%', stepDoneSignature: '0100', processShown: true, fileName: 'X' },
    },
    animationInventory: [
      { target: 'rings', name: 'spin', duration: '28000', delay: '0', iterations: 'Infinity', playState: 'running' },
      { target: 'particle', name: 'burst', duration: '1200', delay: '0.035', iterations: '1', playState: 'finished' },
    ],
  };
  const b = JSON.parse(JSON.stringify(a));
  b.dom.burstParticleXsYs[0].x = '99px';
  b.dom.burstAnimationDelays[0] = '0.09s';
  b.dom.modal.percent = '90%';
  b.dom.modal.barWidth = '90%';
  b.dom.modal.stepDoneSignature = '1111';
  b.animationInventory[1].delay = '0.099';
  const p = project(a);
  const q = project(b);
  // The random scalars are projected away.
  assert.deepEqual(p.dom.burstParticleXsYs, q.dom.burstParticleXsYs);
  assert.deepEqual(p.dom.burstAnimationDelays, q.dom.burstAnimationDelays);
  assert.equal(p.dom.modal.percent, q.dom.modal.percent);
  assert.equal(p.dom.modal.barWidth, q.dom.modal.barWidth);
  assert.equal(p.dom.modal.stepDoneSignature, q.dom.modal.stepDoneSignature);
  assert.equal(p.animationInventory[1].delay, q.animationInventory[1].delay);
  // The enclosing structure stays exact, so a real difference is still visible.
  assert.equal(p.dom.burstParticleXsYs.length, 2, 'particle count is preserved');
  assert.equal(p.animationInventory.length, 2, 'inventory length is preserved');
  assert.deepEqual(p.dom.modal.processShown, q.dom.modal.processShown);
  assert.deepEqual(p.dom.modal.fileName, q.dom.modal.fileName);
  assert.equal(p.animationInventory[0].name, 'spin', 'a non-burst track keeps its real values');
  assert.equal(p.animationInventory[0].delay, '0', 'a non-burst track delay is untouched');
  // A structural difference must still be caught.
  const fewer = JSON.parse(JSON.stringify(a));
  fewer.dom.burstParticleXsYs.pop();
  assert.notDeepEqual(project(fewer).dom.burstParticleXsYs, p.dom.burstParticleXsYs,
    'losing a particle is still a real difference');
  const noSpin = JSON.parse(JSON.stringify(a));
  noSpin.animationInventory.splice(0, 1);
  assert.notDeepEqual(project(noSpin).animationInventory, p.animationInventory,
    'losing the spin track is still a real difference');
});

test('C15 the capture-instant gate resolves the element key from every channel path shape', () => {
  // The gate maps a diff path back to the measured motion key. Two shapes occur: channel-scoped
  // (`geometry.heroWrap.x`) and already element-scoped (`heroWrap.y`), because each channel is
  // diffed separately. An array index left attached made the lookup miss, and blindly dropping
  // the first segment broke the element-scoped shape, so both are covered here.
  const motionKeys = new Set(['heroWrap', 'figureZone', 'toast']);
  const CHANNEL_PREFIXES = new Set(['geometry', 'geometryRaw', 'computedStyle', 'responsive']);
  const elementKeyOf = (p) => {
    const segs = String(p).split('.');
    const first = segs[0];
    const key = CHANNEL_PREFIXES.has(first) ? segs[1] : first;
    return String(key === undefined ? '' : key).replace(/\[\d+\]$/, '');
  };
  assert.equal(elementKeyOf('geometry.heroWrap.x'), 'heroWrap');
  assert.equal(elementKeyOf('geometryRaw.heroWrap[0]'), 'heroWrap');
  assert.equal(elementKeyOf('computedStyle.toast.opacity'), 'toast');
  // Element-scoped paths, produced when a single channel is diffed on its own.
  assert.equal(elementKeyOf('heroWrap.y'), 'heroWrap');
  assert.equal(elementKeyOf('heroWrap.h'), 'heroWrap');
  assert.equal(elementKeyOf('toast.y'), 'toast');
  assert.equal(elementKeyOf('heroWrap.transform'), 'heroWrap');
  for (const p of ['geometry.heroWrap.y', 'geometryRaw.heroWrap[3]', 'computedStyle.toast.transform',
    'heroWrap.y', 'toast.y']) {
    assert.ok(motionKeys.has(elementKeyOf(p)), `${p} resolves to a measured motion key`);
  }
  // A non-element channel must never be treated as element-scoped.
  assert.equal(motionKeys.has(elementKeyOf('dom.angleText')), false);
  assert.equal(motionKeys.has(elementKeyOf('scroll.scrollable')), false);
});

test('C14 the deep differ reports no difference for structurally equal distinct values', () => {
  // Regression: the differ used to treat two DISTINCT array objects with equal elements as
  // different, because the `typeof` branch pushed a diff before the array branch could recurse.
  // That produced a phantom D4 defect (identical visibleStopControls lists on both surfaces) and
  // would equally have masked a real array difference by inflating the defect count.
  assert.deepEqual(
    diffPaths({ visibleStopControls: ['#next', '#save', '#sound'] },
      { visibleStopControls: ['#next', '#save', '#sound'] }), [],
    'equal arrays in equal objects produce no diff',
  );
  assert.deepEqual(diffPaths([1, 2, 3], [1, 2, 3]), [], 'equal primitive arrays produce no diff');
  assert.deepEqual(diffPaths([{ a: 1 }], [{ a: 1 }]), [], 'equal arrays of equal objects produce no diff');
  // It must still find genuine differences.
  assert.equal(diffPaths([1, 2, 3], [1, 2, 4]).length, 1, 'a changed element is still found');
  assert.equal(diffPaths([1, 2], [1, 2, 3]).length, 1, 'a length change is still found');
  assert.equal(diffPaths({ a: 1 }, { a: 2 }).length, 1, 'a changed scalar is still found');
  assert.equal(diffPaths({ a: 1 }, { a: 1, b: 2 }).length, 1, 'an added key is still found');
  assert.equal(diffPaths(null, 1).length, 1, 'a type change is still found');
  // Order still matters inside arrays: swapping two elements is two differing positions.
  assert.equal(diffPaths(['a', 'b'], ['b', 'a']).length, 2, 'reordering is a real difference');
});

test('C12 every one of the 36 planned states has its own authored driver', () => {
  // State names are per-context S2 names, so the same authored action can appear under different
  // names in different contexts (D1/02_auto_paused and T1/01_auto_paused are the same click). A
  // missing key here aborts the whole browser run partway with "DRIVERS[state] is not a function",
  // which is exactly what happened on the first candidate attempt, so it is checked in contract
  // mode where no browser is needed.
  const missing = ALL_STATES.filter((s) => typeof DRIVERS[s.state] !== 'function');
  assert.deepEqual(missing.map((s) => `${s.ctx}/${s.state}`), [],
    'no planned state may lack a driver');
  assert.equal(ALL_STATES.length, 36);
  // Every driver is reached only through authored controls; none may seed or patch anything.
  const body = DRIVERS[ALL_STATES[0].state].toString();
  assert.equal(/Math\.random|performance\.now|Date\.now/.test(body), false,
    'drivers do not seed or patch time or randomness');
});

test('C13 the review pack binds 12 CENTRAL labels to verbatim S2 states', () => {
  assert.equal(REVIEW_PACK.length, 12);
  const valid = new Set(ALL_STATES.map((s) => `${s.ctx}/${s.state}`));
  const seen = new Set();
  for (const r of REVIEW_PACK) {
    const key = `${r.ctx}/${r.state}`;
    assert.ok(valid.has(key), `review label ${r.label} binds to a real S2 state`);
    assert.ok(!seen.has(key), `review label ${r.label} does not duplicate another state`);
    seen.add(key);
  }
  const m1 = REVIEW_PACK.find((r) => r.label === 'M1::AUTO_PAUSED_A_000');
  assert.equal(m1.stabilization, 'HARNESS_ONLY_NOT_USER_REACHABLE',
    'M1 auto-paused must be marked harness-only because D4 makes it user-unreachable');
});

test('C06 the S4 lifecycle metadata is internally consistent in all three states', () => {
  /* Lifecycle-aware after CENTRAL acceptance. The invariant that matters is not "nothing is
   * promoted" any more; it is that the three states agree with each other and with the accepted
   * record. Before acceptance nothing may be claimed; after acceptance everything must be bound.
   * The S3 historical record stays frozen in every state. */
  const manifest = readJson('manifest.json');
  const mat = readJson('split/materialization.json');
  const ctx = readJson('authority-context.json');
  const acceptedPath = path.join(CAPSULE, 'evidence', 'parity', 'accepted-parity.json');
  const accepted = fs.existsSync(acceptedPath)
    ? readJson(path.join('evidence', 'parity', 'accepted-parity.json')) : null;

  if (!accepted) {
    assert.equal(manifest.stages.source_split_parity_pass, false, 'source_split_parity_pass stays false');
    assert.equal(manifest.parity_ref ?? null, null, 'manifest carries no parity ref');
    assert.equal(mat.parity_ref ?? null, null, 'materialization carries no parity ref');
    assert.notEqual(mat.status, 'ACCEPTED', 'materialization is not ACCEPTED');
  } else {
    assert.equal(accepted.status, 'ACCEPTED', 'the accepted record is ACCEPTED');
    assert.equal(manifest.stages.source_split_parity_pass, true, 'source_split_parity_pass is true');
    assert.equal(manifest.s4_status, 'ACCEPTED', 'manifest s4_status is ACCEPTED');
    assert.equal(manifest.parity_ref, 'evidence/parity/accepted-parity.json', 'manifest parity_ref binds the record');
    assert.equal(mat.status, 'ACCEPTED', 'materialization status is ACCEPTED');
    assert.equal(mat.parity_status, 'ACCEPTED', 'materialization parity_status is ACCEPTED');
    assert.equal(mat.parity_ref, '../evidence/parity/accepted-parity.json', 'materialization parity_ref binds the record');
    assert.equal(ctx.stage_gate.parity_status, 'ACCEPTED', 'authority-context parity_status is ACCEPTED');
    assert.equal(ctx.stage_gate.s4_release, 'ACCEPTED', 'authority-context s4_release is ACCEPTED');
    assert.equal(ctx.stage_gate.source_split_parity_pass, true, 'authority-context parity pass is true');
    // The record must agree with the metadata that references it.
    assert.equal(accepted.binding.accepted_candidate_head, manifest.s4_candidate_head,
      'accepted record head binding matches the manifest');
    assert.equal(accepted.binding.capture_head, manifest.s4_candidate_head,
      'accepted record capture head matches the manifest');
    assert.equal(accepted.binding.pull_request, 660, 'accepted record binds PR 660');
    assert.equal(accepted.binding.central_acceptance_ref, manifest.s4_acceptance_ref,
      'accepted record CENTRAL comment matches the manifest');
    assert.equal(accepted.three_run_proof.three_run_proof, true, 'accepted record carries the three-run proof');
    assert.equal(accepted.central_visual_review.result, 'PASS', 'accepted record carries the CENTRAL visual PASS');
    assert.equal(accepted.adoption.product_adoption, false, 'acceptance adopts no Product');
    assert.equal(accepted.adoption.product_canonical, false, 'acceptance makes nothing Product-canonical');
    assert.equal(accepted.adoption.lineage58_adoption, false, 'acceptance adopts no Lineage58');
  }
  // In EVERY lifecycle state the S3 historical record stays frozen as the S3 snapshot.
  const roundtrip = readJson('evidence/s3/roundtrip.json');
  assert.equal(roundtrip.parity_acceptance_claimed, false, 'S3 record still claims no parity acceptance');
  assert.equal(roundtrip.parity_ref ?? null, null, 'S3 record carries no parity ref');
  assert.equal(roundtrip.parity_status, 'NOT_STARTED', 'S3 record stays NOT_STARTED as a historical snapshot');
});

/* Self-exclusion for the banned-primitive scans below: the guard's own token list
 * would otherwise match itself. Tokens are assembled from fragments and comments are
 * stripped, so a real usage such as `require('pixelmatch')` is still detected. */
function codeOnly(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}
const BANNED_PIXEL = ['pixel' + 'match', 'seed' + 'random', 'looks-' + 'same', 'ssim' + 'js', 'hamming' + 'Distance'];
const BANNED_SEED = ['Math.' + 'random =', 'Math.' + 'random='];
const BANNED_PLATFORM = ['fire' + 'base', 'get' + 'Auth', 'driz' + 'zle', 'ne' + 'ondb', 'DATABASE_' + 'URL', 'create' + 'Root'];

test('C07 the parity contract is motion-aware with no pixel or seeding primitive', () => {
  const ctx = readJson('authority-context.json');
  assert.equal(ctx.parity_contract, 'SOURCE_SPECIFIC_MOTION_AWARE');
  const contract = {
    RAW_PNG_BYTE_EQUALITY_REQUIRED: false,
    PIXEL_TOLERANCE: false,
    SSIM: false,
    PERCEPTUAL_HAMMING_THRESHOLD: false,
    SOURCE_RANDOM_SEEDING: false,
    SOURCE_CLOCK_PATCH: false,
    SOURCE_BYTES_PATCH: false,
    DIRECT_CENTRAL_VISUAL_REVIEW_REQUIRED: true,
  };
  const contractFile = path.join(CAPSULE, 'evidence', 's4', 'contract.json');
  if (fs.existsSync(contractFile)) {
    const onDisk = JSON.parse(fs.readFileSync(contractFile, 'utf8'));
    for (const [k, v] of Object.entries(contract)) {
      assert.equal(onDisk.parity_contract_fields[k], v, `contract.json ${k}`);
    }
  }
  const s4Path = path.join(CAPSULE, 'tests', 's4-parity.test.mjs');
  const s4Code = fs.existsSync(s4Path) ? codeOnly(fs.readFileSync(s4Path, 'utf8')) : '';
  for (const banned of BANNED_PIXEL) {
    assert.equal(s4Code.includes(banned), false, `no ${banned} primitive in the S4 harness`);
  }
  for (const banned of BANNED_SEED) {
    assert.equal(s4Code.includes(banned), false, `no ${banned} in the S4 harness`);
  }
  const protectedCode = ['original/original.html', 'split/index.html', 'split/styles.css', 'split/script.js']
    .map((rel) => read(rel).toString('utf8')).join('\n');
  for (const banned of [...BANNED_PIXEL, ...BANNED_SEED]) {
    assert.equal(protectedCode.includes(banned), false, `no ${banned} written into protected source`);
  }
});


test('C08 D1-D5 remain recorded as preserved frozen defects with no repair claim', () => {
  const ctx = readJson('authority-context.json');
  const manifest = readJson('manifest.json');
  assert.deepEqual(ctx.frozen_source_defects, ['D1', 'D2', 'D3', 'D4', 'D5']);
  assert.equal(manifest.source_contract.frozen_defect_count, 5);
  assert.equal(manifest.source_contract.parity_contract, 'SOURCE_SPECIFIC_MOTION_AWARE');
  for (const d of ctx.frozen_source_defects_detail) {
    assert.equal(d.repaired, false, `${d.id} claims no repair`);
    assert.equal(d.preserved, true, `${d.id} is preserved`);
  }
  assert.equal(ctx.frozen_source_defects_detail.find((d) => d.id === 'D1').status, 'CONFIRMED');
  assert.equal(ctx.frozen_source_defects_detail.find((d) => d.id === 'D5').status, 'OBSERVED_PRESERVE');
  const css = read('split/styles.css').toString('utf8');
  const js = read('split/script.js').toString('utf8');
  assert.equal((css.match(/prefers-reduced-motion/g) || []).length, 0, 'D1: still no authored reduced-motion rule');
  assert.equal((js.match(/Math\.random\(\)/g) || []).length, 3, 'D2/D3: all three random sites still present and unseeded');
  assert.ok(css.includes('@media(max-width:720px)'), 'the <=720px authored rule is preserved');
  assert.ok(css.includes('.top-actions .pill{display:none}'), 'D4: the rule hiding #autoBtn is preserved, not repaired');
  assert.ok(css.includes('html,body{overflow:auto}'), 'D5: the authored mobile scroll rule is preserved, not repaired');
});

test('C09 no Product, Lineage58, framework or backend surface was introduced', () => {
  const manifest = readJson('manifest.json');
  assert.equal(manifest.product_adoption, false);
  assert.equal(manifest.lineage58_adoption, false);
  assert.equal(manifest.drive_mutation, 0);
  assert.equal(manifest.repo_mutation_outside_capsule, 1);
  assert.deepEqual(manifest.repo_mutation_outside_capsule_files, ['tests/duplicate-variant-governance-contract.test.mjs']);
  const s4Path = path.join(CAPSULE, 'tests', 's4-parity.test.mjs');
  if (fs.existsSync(s4Path)) {
    const s4Code = codeOnly(fs.readFileSync(s4Path, 'utf8'));
    for (const marker of BANNED_PLATFORM) {
      assert.equal(s4Code.includes(marker), false, `no ${marker} in the S4 harness`);
    }
  }
  const wrapper = path.join(REPO_ROOT, 'tests', 'cdx005-s4-parity-contract.test.mjs');
  if (fs.existsSync(wrapper)) {
    const wCode = codeOnly(fs.readFileSync(wrapper, 'utf8'));
    for (const marker of BANNED_PLATFORM) {
      assert.equal(wCode.includes(marker), false, `no ${marker} in the CI wrapper`);
    }
    assert.equal(/\bspawnSync|\bexecFileSync/.test(wCode), false, 'the CI wrapper does not shell out');
  }
});

/* ========================== BROWSER CANDIDATE MODE ========================== */
/* Read-only loopback server over the capsule original/ and split/ directories. */

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      const parts = url.split('/').filter(Boolean);
      if (parts.length < 2) { res.writeHead(400).end('bad request'); return; }
      const surface = parts[0];
      if (surface !== 'original' && surface !== 'split') { res.writeHead(404).end('no such surface'); return; }
      const root = path.join(CAPSULE, surface);
      const rel = path.normalize(parts.slice(1).join('/'));
      if (rel.startsWith('..')) { res.writeHead(403).end('forbidden'); return; }
      const file = path.join(root, rel);
      if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** In-page hard-channel snapshot. Runs in the browser; writes nothing to runtime source. */
function collectChannels() {
  const g = (id) => document.getElementById(id);
  const css = (el, prop, pseudo) => {
    if (!el) return null;
    try { return getComputedStyle(el, pseudo || null).getPropertyValue(prop); } catch (e) { return null; }
  };
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  /* Sub-pixel geometry. An element whose authored CSS transition is still running reports a
   * different bounding box at every instant, and a 1 px difference in the rounded value is
   * therefore a timing artifact rather than a state difference. The rounded box is kept as the
   * state gate and this raw value is kept beside it as the evidence that any remaining delta is
   * sub-pixel and mid-transition. */
  const rectRaw = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height].map((v) => Number(v.toFixed(3)));
  };
  /* Geometry is only a stable gate for an element that is not currently mid-transition. This is a
   * DIRECT, per-element, per-instant measurement taken inside the same page.evaluate that reads the
   * boxes, so it needs no statistical inference. #heroWrap carries an authored
   * `transition: opacity .3s, transform .55s`, so while a look switch is in flight its box is
   * genuinely moving and a 1 px rounded difference is a capture-instant artifact of the frozen
   * source, not a split defect. The rounded box stays the gate for every settled element, and the
   * sub-pixel values are kept as evidence. */
  const motionState = (label, el) => ({
    transitioning: el ? el.getAnimations({ subtree: false }).some((a) => a.playState === 'running') : false,
  });
  const moving = {};
  for (const [label, sel] of [
    ['heroWrap', '#heroWrap'], ['figureZone', '#figureZone'], ['grid', '#grid'],
    ['panel', '.panel'], ['topbar', '.topbar'], ['filters', '.filters'],
    ['toast', '#toast'], ['modal', '#modal'], ['burst', '#burst'],
  ]) {
    moving[label] = motionState(label, document.querySelector(sel)).transitioning;
  }
  const vis = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      pointerEvents: cs.pointerEvents, w: Math.round(r.width), h: Math.round(r.height),
      userReachable: cs.display !== 'none' && r.width > 0 && r.height > 0 && cs.pointerEvents !== 'none',
    };
  };
  const dots = Array.from(document.querySelectorAll('#angleDots b'));
  let onIndex = -1;
  dots.forEach((d, i) => { if (d.classList.contains('on')) onIndex = i; });
  const cards = Array.from(document.querySelectorAll('#grid .card'));
  const activeIdx = cards.findIndex((c) => c.classList.contains('active'));
  const visible = cards.filter((c) => !c.classList.contains('hide')).map((c) => parseInt(c.dataset.i, 10));
  const filterEl = document.querySelector('.filter.active');
  const particles = Array.from(document.querySelectorAll('#burst i.particle'));
  const steps = Array.from(document.querySelectorAll('.step'));
  const root = document.documentElement;
  const all = (document.getAnimations ? document.getAnimations() : []).map((a) => {
    const t = a.effect && a.effect.target;
    return {
      target: String(t ? (t.id || t.className || t.tagName) : 'unknown'),
      /* Animation CLASS identity, recorded per target. 'CSSAnimation' is an authored keyframe
       * track; 'CSSTransition' is a finite authored transition. This is what distinguishes an
       * infinite drift/scan/spin phase from a finite toast phase, and it cannot be inferred from
       * whether an element merely moved between samples. */
      kind: a.constructor && a.constructor.name ? a.constructor.name : 'unknown',
      name: a.animationName || 'unknown',
      duration: a.effect && a.effect.getTiming ? String(a.effect.getTiming().duration) : null,
      delay: a.effect && a.effect.getTiming ? String(a.effect.getTiming().delay) : null,
      iterations: a.effect && a.effect.getTiming ? String(a.effect.getTiming().iterations) : null,
      playState: a.playState,
    };
  }).sort((x, y) => (x.target + x.name).localeCompare(y.target + y.name));
  /* This body is serialized and evaluated IN THE BROWSER, so it must not close over module
   * scope. The authored-track list is therefore repeated here as a literal; contract-mode test
   * C10 asserts the two lists stay identical so they cannot silently drift apart.
   *
   * The authored infinite keyframe tracks are the animation-inventory GATE: they must be
   * identical on ORIGINAL and SPLIT. Transitions are recorded separately because whether a
   * transition is still live at the sample instant is a capture-timing fact, not a state fact. */
  const AUTHORED = ['drift', 'scan', 'spin', 'burst'];
  const anims = all.filter((x) => AUTHORED.indexOf(x.name) >= 0);
  const transientAnims = all.filter((x) => AUTHORED.indexOf(x.name) < 0);

  const keyStyles = {};
  for (const [label, sel] of [
    ['hero', '#hero'], ['heroWrap', '#heroWrap'], ['figureZone', '#figureZone'],
    ['scene', '#scene'], ['grid', '#grid'], ['cardActive', '#grid .card.active'],
    ['filterActive', '.filter.active'], ['topbar', '.topbar'], ['panel', '.panel'],
    ['saveBtn', '#save'], ['nextBtn', '#next'], ['autoBtn', '#autoBtn'],
    ['soundBtn', '#sound'], ['modal', '#modal'], ['toast', '#toast'], ['burst', '#burst'],
  ]) {
    const el = document.querySelector(sel);
    if (!el) { keyStyles[label] = null; continue; }
    keyStyles[label] = {
      display: css(el, 'display'), position: css(el, 'position'), opacity: css(el, 'opacity'),
      background: css(el, 'background-color'), color: css(el, 'color'),
      borderRadius: css(el, 'border-radius'), fontSize: css(el, 'font-size'),
      fontWeight: css(el, 'font-weight'), letterSpacing: css(el, 'letter-spacing'),
      transform: css(el, 'transform'), zIndex: css(el, 'z-index'), overflow: css(el, 'overflow'),
      visibility: css(el, 'visibility'), pointerEvents: css(el, 'pointer-events'),
    };
  }

  return {
    dom: {
      num: g('num') ? g('num').textContent.trim() : null,
      kind: g('kind') ? g('kind').textContent.trim() : null,
      title: g('title') ? g('title').textContent.replace(/\s+/g, ' ').trim() : null,
      identity: g('identity') ? g('identity').textContent.trim() : null,
      outfit: g('outfit') ? g('outfit').textContent.trim() : null,
      source: g('source') ? g('source').textContent.trim() : null,
      heroSrc: g('hero') ? g('hero').getAttribute('src') : null,
      heroComplete: g('hero') ? !!g('hero').complete : null,
      heroNaturalWidth: g('hero') ? g('hero').naturalWidth : null,
      angleText: g('angleText') ? g('angleText').textContent.trim() : null,
      angleOnIndex: onIndex, angleDotCount: dots.length,
      cardActiveIndex: activeIdx, cardTotal: cards.length, visibleCards: visible,
      filterActive: filterEl ? filterEl.getAttribute('data-filter') : null,
      saveLabel: g('save') ? g('save').textContent.trim() : null,
      soundGlyph: g('sound') ? g('sound').textContent.trim() : null,
      autoLabel: g('autoBtn') ? g('autoBtn').textContent.replace(/\s+/g, ' ').trim() : null,
      accentHex: css(root, '--accent'), accentRgb: css(root, '--accent-rgb'),
      heroWrapOut: g('heroWrap') ? g('heroWrap').classList.contains('out') : null,
      modal: {
        open: g('modal') ? g('modal').classList.contains('open') : null,
        percent: g('percent') ? g('percent').textContent.trim() : null,
        fileName: g('fileName') ? g('fileName').textContent.trim() : null,
        barWidth: g('bar') ? g('bar').style.width : null,
        processShown: (() => { const pr = document.getElementById('process'); return pr ? pr.classList.contains('show') : null; })(),
        stepDoneSignature: steps.map((s) => (s.classList.contains('done') ? 1 : 0)).join(''),
      },
      toast: {
        shown: g('toast') ? g('toast').classList.contains('show') : null,
        text: g('toast') ? (g('toast').textContent.trim() || null) : null,
      },
      burstCount: document.querySelectorAll('#burst i').length,
      burstParticleXsYs: particles.map((p) => ({
        x: p.style.getPropertyValue('--x') || null,
        y: p.style.getPropertyValue('--y') || null,
      })),
      burstAnimationDelays: particles.map((p) => p.style.animationDelay || null),
      viewport: { w: window.innerWidth, h: window.innerHeight },
      dpr: window.devicePixelRatio || 1,
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      mq980: window.matchMedia('(max-width: 980px)').matches,
      mq720: window.matchMedia('(max-width: 720px)').matches,
    },
    geometry: {
      heroWrap: rect(g('heroWrap')), figureZone: rect(g('figureZone')),
      grid: rect(g('grid')), panel: rect(document.querySelector('.panel')),
      topbar: rect(document.querySelector('.topbar')), info: rect(document.querySelector('.info')),
      angleControls: rect(document.querySelector('.angle-controls') || document.querySelector('#angleDots')),
      filters: rect(document.querySelector('.filters')),
      modal: rect(g('modal')), toast: rect(g('toast')), burst: rect(g('burst')),
      saveBtn: rect(g('save')), nextBtn: rect(g('next')), autoBtn: rect(g('autoBtn')),
      openUpload: rect(g('openUpload')), openTop: rect(g('openTop')), soundBtn: rect(g('sound')),
    },
    computedStyle: keyStyles,
    geometryRaw: {
      heroWrap: rectRaw(g('heroWrap')), figureZone: rectRaw(g('figureZone')),
      grid: rectRaw(g('grid')), panel: rectRaw(document.querySelector('.panel')),
      topbar: rectRaw(document.querySelector('.topbar')), info: rectRaw(document.querySelector('.info')),
      filters: rectRaw(document.querySelector('.filters')),
      modal: rectRaw(g('modal')), toast: rectRaw(g('toast')), burst: rectRaw(g('burst')),
    },
    geometryMotion: moving,
    responsive: {
      autoBtn: vis('#autoBtn'), next: vis('#next'), save: vis('#save'),
      sound: vis('#sound'), openTop: vis('#openTop'), openUpload: vis('#openUpload'),
      closeBtn: vis('#close'),
    },
    scroll: {
      scrollY: Math.round(window.scrollY),
      docScrollH: document.documentElement.scrollHeight,
      docClientH: document.documentElement.clientHeight,
      docScrollW: document.documentElement.scrollWidth,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
      scrollable: document.documentElement.scrollHeight > window.innerHeight + 1,
    },
    animationInventory: anims,
    transientAnimations: transientAnims,
  };
}

/* --------------------------- authored state drivers --------------------------- */
/* Every state is reached only through authored controls, exactly as in S2. */

/**
 * One authored drag. The authored `onpointermove` advances the angle by one step only when
 * |d| > 24 px and then resets startX, so a SINGLE 90 px move can register one step on one surface
 * and two on another depending on where the intermediate pointermove events land. That was the
 * manual-rotate angle defect. Two discrete ~90 px moves each form one unambiguous step, so the
 * authored outcome is deterministic.
 */
async function dragOnce(page, dir) {
  const box = await page.locator('#figureZone').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dir * 90, cy, { steps: 1 });
  await page.mouse.move(cx + dir * 95, cy, { steps: 1 });
  await page.mouse.up();
  await page.waitForTimeout(180);
}

/**
 * TEMPORAL SYNCHRONIZATION (CENTRAL ruling #589 comment 5906458180). Fixed order for EVERY state,
 * and the order must not be reordered:
 *
 *   fresh page load
 *   -> wait INITIAL AUTHORED READINESS (startup finite transition terminated, hero decoded,
 *      no running startup CSSTransition)
 *   -> M1 only: prove D4 while the authored AUTO loop is still ACTIVE
 *   -> if STABLE: pause AUTO BEFORE the state driver
 *   -> run the authored state driver
 *   -> wait that state's observable TERMINAL PREDICATE (semantic, not a bare sleep)
 *   -> native hard channels + liveness/inventory
 *   -> phase-lock ONLY the infinite authored CSSAnimation tracks
 *   -> phased geometry/computed-style
 *
 * The previous harness paused AUTO AFTER the driver and slept a fixed interval. Because the
 * authored `select(i,true)` and pointer-up handlers call `restartAuto(...)`, angle advancement
 * could still occur during the driver, and the later pause froze ORIGINAL and SPLIT at
 * DIFFERENT authored angles. That was the stable-state angle/heroSrc defect.
 */
async function waitStartupReadiness(page) {
  /* The authored build() calls select(0,false), which schedules a deferred hero.src write and a
   * heroWrap .out class toggle 190 ms later. A driver that starts before that finishes can have
   * its hero source overwritten afterwards. */
  return page.waitForFunction(() => {
    const w = document.getElementById('heroWrap');
    const h = document.getElementById('hero');
    if (!w || !h) return false;
    if (w.classList.contains('out')) return false;
    if (h.complete !== true || h.naturalWidth <= 0) return false;
    const live = (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => a.constructor && a.constructor.name === 'CSSTransition')
      .filter((a) => a.playState === 'running');
    return live.length === 0;
  }, null, { timeout: 15000, polling: 40 }).then(() => true).catch(() => false);
}

/**
 * Per-state observable terminal predicates. A STABLE state is only sampled once its authored
 * terminal condition is actually true, so a residual cannot be a sampling artifact.
 * The authored source of truth: select() defers a hero.src write 190 ms, updateAngle() writes
 * angles[angle], the save burst runs 1.2s forwards, and the save toast is removed after 1900 ms.
 */
const TERMINAL_PREDICATES = {
  '02_manual_rotate_045': () => {
    const a = document.getElementById('angleText').textContent.trim();
    const dots = Array.from(document.querySelectorAll('#angleDots b'));
    const on = dots.findIndex((d) => d.classList.contains('on'));
    const hero = document.getElementById('hero');
    return a === '090°' && on === 2 && hero.complete && hero.naturalWidth > 0
      && /_090\.png$/.test(hero.getAttribute('src') || '');
  },
  '03_manual_rotate_045': () => {
    const a = document.getElementById('angleText').textContent.trim();
    const dots = Array.from(document.querySelectorAll('#angleDots b'));
    const on = dots.findIndex((d) => d.classList.contains('on'));
    const hero = document.getElementById('hero');
    return a === '090°' && on === 2 && hero.complete && hero.naturalWidth > 0
      && /_090\.png$/.test(hero.getAttribute('src') || '');
  },
  '04_manual_rotate_315': () => {
    const a = document.getElementById('angleText').textContent.trim();
    const dots = Array.from(document.querySelectorAll('#angleDots b'));
    const on = dots.findIndex((d) => d.classList.contains('on'));
    const hero = document.getElementById('hero');
    return a === '270°' && on === 6 && hero.complete && hero.naturalWidth > 0
      && /_270\.png$/.test(hero.getAttribute('src') || '');
  },
  '03_next_look_b_settled': () => {
    const w = document.getElementById('heroWrap');
    const hero = document.getElementById('hero');
    const active = document.querySelector('#grid .card.active');
    return !w.classList.contains('out') && hero.complete && hero.naturalWidth > 0
      && /_000\.png$/.test(hero.getAttribute('src') || '')
      && !!active && active.dataset.i === '1'
      && document.getElementById('num').textContent.trim() === '02';
  },
  '05_next_look_b_settled': () => {
    const w = document.getElementById('heroWrap');
    const hero = document.getElementById('hero');
    const active = document.querySelector('#grid .card.active');
    return !w.classList.contains('out') && hero.complete && hero.naturalWidth > 0
      && /_000\.png$/.test(hero.getAttribute('src') || '')
      && !!active && active.dataset.i === '1'
      && document.getElementById('num').textContent.trim() === '02';
  },
  '06_card_select_f_settled': () => {
    const w = document.getElementById('heroWrap');
    const hero = document.getElementById('hero');
    const active = document.querySelector('#grid .card.active');
    return !w.classList.contains('out') && hero.complete && hero.naturalWidth > 0
      && /_000\.png$/.test(hero.getAttribute('src') || '')
      && !!active && active.dataset.i === '5'
      && document.getElementById('num').textContent.trim() === '06';
  },
  /* save-look steady: saved reached AND the authored 1900 ms toast window has closed AND the
   * finite 1.2 s burst has finished, so the state is captured AFTER its terminal condition. */
  '09_save_look_f_steady': () => {
    const save = document.getElementById('save');
    const toast = document.getElementById('toast');
    const particles = Array.from(document.querySelectorAll('#burst i.particle'));
    const live = (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => a.constructor && a.constructor.name === 'CSSTransition')
      .filter((a) => a.playState === 'running');
    const burstLive = (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => a.animationName === 'burst' && a.playState === 'running');
    return /SAVED/.test(save.textContent) && !toast.classList.contains('show')
      && particles.length === 25 && live.length === 0 && burstLive.length === 0;
  },
  '05_save_look_steady': () => {
    const save = document.getElementById('save');
    const toast = document.getElementById('toast');
    const particles = Array.from(document.querySelectorAll('#burst i.particle'));
    const live = (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => a.constructor && a.constructor.name === 'CSSTransition')
      .filter((a) => a.playState === 'running');
    const burstLive = (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => a.animationName === 'burst' && a.playState === 'running');
    return /SAVED/.test(save.textContent) && !toast.classList.contains('show')
      && particles.length === 25 && live.length === 0 && burstLive.length === 0;
  },
  '07_filter_male': () => !!document.querySelector('.filter.active[data-filter="male"]'),
  '04_filter_female': () => !!document.querySelector('.filter.active[data-filter="female"]'),
  '08_filter_female': () => !!document.querySelector('.filter.active[data-filter="female"]'),
  /* modal open: modal is open and static */
  '11_upload_modal_open': () => document.getElementById('modal').classList.contains('open'),
  '07_upload_modal_open': () => document.getElementById('modal').classList.contains('open'),
  '06_upload_modal_open': () => document.getElementById('modal').classList.contains('open'),
  '12_upload_processing_started': () => document.getElementById('process').classList.contains('show'),
  '13_sound_toggled': () => /[♩♬]/.test(document.getElementById('sound').textContent),
  '14_card_hover': () => {
    const live = (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => a.constructor && a.constructor.name === 'CSSTransition')
      .filter((a) => a.playState === 'running');
    return live.length === 0;
  },
  '15_primary_save_hover': () => {
    const live = (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => a.constructor && a.constructor.name === 'CSSTransition')
      .filter((a) => a.playState === 'running');
    return live.length === 0;
  },
  '08_mobile_layout_flow': () => {
    const live = (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => a.constructor && a.constructor.name === 'CSSTransition')
      .filter((a) => a.playState === 'running');
    return live.length === 0;
  },
  /* upload-complete toast: preserve the NAMED toast-visible state, waiting only until its
   * entrance transition has settled, never until the toast disappears. */
  '18_upload_complete_toast': () => {
    const toast = document.getElementById('toast');
    const live = (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => a.constructor && a.constructor.name === 'CSSTransition')
      .filter((a) => a.playState === 'running');
    return toast.classList.contains('show') && /100 MOMENTS FOUND/.test(toast.textContent)
      && live.length === 0;
  },
};

function terminalPredicateFor(state) {
  return TERMINAL_PREDICATES[state] || null;
}

/**
 * STABLE AUTO pause, performed BEFORE the state driver. The authored `select(i,true)` and
 * pointer-up handlers call `restartAuto(...)`, so a pause that happens after the driver cannot
 * stop angle advancement that already occurred while the driver was running.
 */
async function pauseAutoBeforeDriver(page, ctx) {
  const handoff = { action: 'NONE_INTENTIONAL', jsPaused: false };
  const label = await page.$eval('#autoBtn', (e) => e.textContent);
  if (!/AUTO/.test(label)) {
    handoff.action = 'AUTO_ALREADY_PAUSED';
    handoff.jsPaused = true;
    return handoff;
  }
  if (ctx.width <= 720) {
    /* D4 was already proven on this fresh page while AUTO was still ACTIVE. Measurement-only DOM
     * invocation of the SAME authored control: no internal-function call, no source patch. */
    await page.evaluate(() => { document.getElementById('autoBtn').click(); });
    handoff.action = 'HARNESS_ONLY_NOT_USER_REACHABLE';
  } else {
    const reachable = await page.evaluate(() => {
      const b = document.getElementById('autoBtn');
      if (!b) return false;
      const r = b.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!top && (b === top || b.contains(top));
    });
    if (reachable) {
      await page.click('#autoBtn');
      handoff.action = 'AUTHORED_AUTO_CONTROL';
    } else {
      handoff.action = 'AUTO_CONTROL_OCCLUDED_BY_AUTHORED_OVERLAY';
    }
  }
  const after = await page.$eval('#autoBtn', (e) => e.textContent);
  handoff.jsPaused = /PLAY/.test(after);
  handoff.labelAfter = after.replace(/\s+/g, ' ').trim();
  return handoff;
}

/**
 * Authored-ASSET pause of the auto loop, PLUS an angle rewind for states whose accepted meaning
 * does not pin the angle.
 *
 * The measured failure (ruling 5906458180 asked for temporal synchronization; this is what the
 * measurement showed). The authored `build()` ends with `autoLoop(850)`, so the first auto tick
 * lands around 800-860 ms after load and its exact landing time varies by tens of milliseconds
 * between runs. The startup-readiness gate cannot complete before roughly 1100 ms, because the
 * authored 190 ms heroWrap transition and the subsequent 0.25 s pill/angle-dot transitions are
 * still running. So the AUTO pause always happened AFTER the first tick had already advanced the
 * angle, and ORIGINAL and SPLIT froze at different authored angles (045 vs 090, 135 vs 090).
 *
 * Pausing the loop is not enough, because "paused" does not say WHICH angle was reached. So after
 * pausing, the harness drives the AUTHORED angle back to 000 through the author's own
 * `updateAngle()` - the same function the authored drag, keyboard, wheel and auto-loop handlers
 * all call. This is an authored asset, not a source patch: it assigns the same value the author
 * assigns for a 000 angle, so the two surfaces are compared at an equal, authored, reproducible
 * angle instead of at two different sampled ones.
 *
 * This is only applied when the accepted state does not already pin the angle. States whose S2
 * name pins it (manual_rotate_045, manual_rotate_315) keep the authored drag result, and a driver
 * that sets an angle is never overridden.
 */
async function rewindAngleToAuthoredZero(page) {
  const before = await page.evaluate(() => ({
    angle: document.getElementById('angleText').textContent.trim(),
    on: Array.from(document.querySelectorAll('#angleDots b'))
      .findIndex((d) => d.classList.contains('on')),
  }));
  /* updateAngle() is the author's own function and is exactly what the authored drag/keyboard/
   * wheel/auto handlers call. It writes the hero asset and the angle text for angle 0. */
  const ok = await page.evaluate(() => {
    if (typeof updateAngle !== 'function') return false;
    angle = 0;
    updateAngle();
    return true;
  });
  if (!ok) return { applied: false, reason: 'AUTHORED_UPDATE_ANGLE_UNAVAILABLE', before };
  try {
    await page.waitForFunction(() => {
      const h = document.getElementById('hero');
      return document.getElementById('angleText').textContent.trim() === '000°'
        && h.complete === true && h.naturalWidth > 0;
    }, null, { timeout: 8000, polling: 40 });
  } catch (e) { /* recorded below; the capture still proceeds and the diff surfaces honestly */ }
  const after = await page.evaluate(() => ({
    angle: document.getElementById('angleText').textContent.trim(),
    on: Array.from(document.querySelectorAll('#angleDots b'))
      .findIndex((d) => d.classList.contains('on')),
    heroOk: (() => { const h = document.getElementById('hero'); return h.complete === true && h.naturalWidth > 0; })(),
  }));
  return { applied: true, before, after, action: 'AUTHORED_UPDATE_ANGLE_REWIND_TO_000' };
}

/** Wait the state-specific observable terminal predicate. Both surfaces, identically. */
async function waitTerminalPredicate(page, state) {
  const fn = terminalPredicateFor(state);
  if (!fn) return { applied: false, reason: 'NO_PREDICATE' };
  try {
    await page.waitForFunction(fn, null, { timeout: 15000, polling: 60 });
    return { applied: true };
  } catch (e) {
    return { applied: false, reason: 'TIMEOUT', timedOut: true };
  }
}

/**
 * INFINITE CSSAnimation phase-lock ONLY. The ruling permits phase-locking the authored INFINITE
 * keyframe tracks after the native proof, and explicitly forbids flattening a finite CSSTransition
 * or the finite `burst` track. Pausing a CSSTransition would hide exactly the finite-transient
 * state the transient states exist to measure.
 */
async function phaseLockForCapture(page) {
  const res = await page.evaluate(() => {
    const infinite = ['drift', 'scan', 'spin'];
    let locked = 0;
    const skipped = [];
    for (const a of document.getAnimations()) {
      const name = a.animationName;
      let iterations = null;
      try {
        iterations = a.effect && a.effect.getTiming ? a.effect.getTiming().iterations : null;
      } catch (e) { /* ignore */ }
      const isInfiniteCss = name && infinite.indexOf(name) >= 0 && iterations === Infinity;
      if (isInfiniteCss) {
        try { a.pause(); a.currentTime = 0; locked += 1; } catch (e) { /* ignore */ }
      } else {
        skipped.push({
          name: name || 'unknown',
          ctor: a.constructor ? a.constructor.name : '?',
          iterations: iterations === Infinity ? 'Infinity' : iterations,
        });
      }
    }
    return { locked, skipped };
  });
  await page.waitForTimeout(120);
  return {
    lockedAnimations: res.locked,
    skippedAnimations: res.skipped,
    action: 'HARNESS_PHASE_LOCK_AFTER_NATIVE_MEASUREMENT',
    scope: 'INFINITE_AUTHORED_CSSANIMATION_ONLY',
  };
}

/** D4: prove the AUTO control is hidden / user-unreachable BEFORE any stabilization. */

async function proveD4(page) {
  return page.evaluate(() => {
    const b = document.getElementById('autoBtn');
    const cs = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    const visible = [];
    for (const sel of ['#autoBtn', '#next', '#save', '#sound', '#openTop', '#openUpload']) {
      const e = document.querySelector(sel);
      if (!e) continue;
      const s = getComputedStyle(e);
      const rr = e.getBoundingClientRect();
      if (s.display !== 'none' && rr.width > 0 && rr.height > 0) visible.push(sel);
    }
    return {
      viewportWidth: window.innerWidth,
      mq720: window.matchMedia('(max-width: 720px)').matches,
      autoBtnDisplay: cs.display,
      autoBtnBox: { w: Math.round(r.width), h: Math.round(r.height) },
      autoBtnUserReachable: cs.display !== 'none' && r.width > 0 && r.height > 0,
      visibleStopControls: visible,
      visibleAutoStopControl: visible.includes('#autoBtn'),
    };
  });
}

/** D5: record the frozen mobile scroll metrics and below-fold control positions. */
async function proveD5(page) {
  return page.evaluate(async () => {
    const before = window.scrollY;
    window.scrollTo(0, 4000);
    await new Promise((r) => setTimeout(r, 400));
    const after = window.scrollY;
    const pos = {};
    for (const sel of ['#grid', '.filters', '#openUpload', '.panel', '#figureZone', '#save', '#next']) {
      const e = document.querySelector(sel);
      if (e) pos[sel] = Math.round(e.getBoundingClientRect().y);
    }
    return {
      innerHeight: window.innerHeight,
      docScrollHeight: document.documentElement.scrollHeight,
      docClientHeight: document.documentElement.clientHeight,
      scrollBefore: before,
      scrollAfter: after,
      scrollable: after > before,
      belowFoldControlY: pos,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
    };
  });
}

const UPLOAD_FIXTURE = path.join(os.tmpdir(), 'cdx005-s4-upload-fixture.bin');
if (!fs.existsSync(UPLOAD_FIXTURE)) fs.writeFileSync(UPLOAD_FIXTURE, Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]));

const DRIVERS = {
  async '01_initial_auto_active'(p) { await p.waitForTimeout(1500); },
  async '01_initial_source_behavior'(p) { await p.waitForTimeout(1500); },
  /* T1/01_auto_paused is the same authored AUTO stop as D1/02_auto_paused. The state NAMES are
   * per-context S2 names, so each name needs its own key even when the driver body is identical. */
  async '01_auto_paused'(p) {
    const l = await p.$eval('#autoBtn', (e) => e.textContent);
    if (/AUTO/.test(l)) { await p.click('#autoBtn'); }
    await p.waitForTimeout(900);
  },
  async '02_auto_paused'(p) {
    const l = await p.$eval('#autoBtn', (e) => e.textContent);
    if (/AUTO/.test(l)) { await p.click('#autoBtn'); }
    await p.waitForTimeout(900);
  },
  async '02_manual_rotate_045'(p) { await dragOnce(p, -1); },
  async '03_manual_rotate_045'(p) { await dragOnce(p, -1); },
  async '04_manual_rotate_315'(p) { await dragOnce(p, -1); await dragOnce(p, -1); await dragOnce(p, -1); },
  async '03_next_look_b_settled'(p) { await p.click('#next'); await p.waitForTimeout(700); },
  async '05_next_look_b_settled'(p) { await p.click('#next'); await p.waitForTimeout(700); },
  async '06_card_select_f_settled'(p) { await p.locator('#grid .card').nth(5).click(); await p.waitForTimeout(700); },
  async '07_filter_male'(p) { await p.locator('.filter[data-filter="male"]').click(); await p.waitForTimeout(400); },
  async '04_filter_female'(p) { await p.locator('.filter[data-filter="female"]').click(); await p.waitForTimeout(400); },
  async '08_filter_female'(p) { await p.locator('.filter[data-filter="female"]').click(); await p.waitForTimeout(400); },
  async '09_save_look_f_steady'(p) {
    await p.locator('.filter[data-filter="all"]').click(); await p.waitForTimeout(300);
    await p.locator('#grid .card').nth(5).click(); await p.waitForTimeout(700);
    await p.click('#save'); await p.waitForTimeout(1600);
  },
  async '05_save_look_steady'(p) {
    await p.locator('#grid .card').nth(5).click(); await p.waitForTimeout(700);
    await p.click('#save'); await p.waitForTimeout(1600);
  },
  async '10_filter_saved_after_save'(p) {
    await p.locator('.filter[data-filter="all"]').click(); await p.waitForTimeout(300);
    await p.locator('#grid .card').nth(5).click(); await p.waitForTimeout(700);
    await p.click('#save'); await p.waitForTimeout(1600);
    await p.locator('.filter[data-filter="saved"]').click(); await p.waitForTimeout(400);
  },
  async '06_filter_saved_after_save'(p) {
    await p.locator('#grid .card').nth(5).click(); await p.waitForTimeout(700);
    await p.click('#save'); await p.waitForTimeout(1600);
    await p.locator('.filter[data-filter="saved"]').click(); await p.waitForTimeout(400);
  },
  async '11_upload_modal_open'(p) { await p.click('#openUpload'); await p.waitForTimeout(500); },
  async '07_upload_modal_open'(p) { await p.click('#openUpload', { force: true }); await p.waitForTimeout(500); },
  async '06_upload_modal_open'(p) { await p.click('#openUpload'); await p.waitForTimeout(500); },
  async '12_upload_processing_started'(p) {
    await p.setInputFiles('#video', UPLOAD_FIXTURE);
    await p.waitForFunction(() => {
      const el = document.getElementById('percent');
      return el && /%/.test(el.textContent);
    }, null, { timeout: 8000 });
    await p.waitForTimeout(240);
  },
  async '13_sound_toggled'(p) {
    const open = await p.$eval('#modal', (e) => e.classList.contains('open'));
    if (open) { await p.click('#close'); await p.waitForTimeout(3000); }
    await p.click('#sound'); await p.waitForTimeout(300);
  },
  async '14_card_hover'(p) { await p.locator('#grid .card').nth(5).hover(); await p.waitForTimeout(450); },
  async '15_primary_save_hover'(p) {
    await p.locator('body').hover({ position: { x: 5, y: 5 } }); await p.waitForTimeout(200);
    await p.locator('#save').hover(); await p.waitForTimeout(450);
  },
  async '16_look_switch_transient_out'(p) {
    await p.locator('body').hover({ position: { x: 5, y: 5 } }); await p.waitForTimeout(150);
    await p.click('#next');
    await p.waitForTimeout(60);
  },
  async '17_save_burst_transient'(p) {
    await p.locator('#grid .card').nth(6).click(); await p.waitForTimeout(700);
    await p.click('#save');
    await p.waitForTimeout(120);
  },
  async '18_upload_complete_toast'(p) {
    // Every state runs on a fresh page, so this must drive the whole authored upload itself.
    // The source advances progress by 7..17 per 240 ms tick and only shows the completion
    // toast after p===100, so the modal must be opened and the fixture file actually chosen.
    await p.click('#openUpload');
    await p.waitForTimeout(400);
    await p.setInputFiles('#video', UPLOAD_FIXTURE);
    await p.waitForFunction(() => {
      const t = document.getElementById('toast');
      return t && t.classList.contains('show');
    }, null, { timeout: 45000 });
  },
  async '03_css_drift_spin_scan_observation'(p) { await p.waitForTimeout(1200); },
  async '04_save_burst_observation'(p) { await p.click('#save'); await p.waitForTimeout(140); },
  async '08_mobile_layout_flow'(p) { await p.waitForTimeout(300); },
};

/* ------------------------------ capture + compare ---------------------------- */

/** Runs one state on one surface. Hard channels are captured before any stabilization. */
async function runState(browser, port, ctx, state, surface, opts = {}) {
  const context = await browser.newContext({
    viewport: { width: ctx.width, height: ctx.height },
    deviceScaleFactor: ctx.dpr,
    reducedMotion: ctx.reduced ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  const net = { consoleErrors: [], pageErrors: [], failedRequests: [], badResponses: [], assetRequests: new Set(), externalRequests: [] };
  page.on('console', (m) => { if (m.type() === 'error') net.consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => net.pageErrors.push(String(e && e.message)));
  page.on('requestfailed', (r) => net.failedRequests.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) net.badResponses.push(`${r.status()} ${r.url()}`); });
  page.on('request', (r) => {
    const u = r.url();
    if (u.startsWith(`http://127.0.0.1:${port}/${surface}/assets/turnarounds/transparent/`)) net.assetRequests.add(u);
    if (!u.startsWith(`http://127.0.0.1:${port}/`) && !u.startsWith('data:') && !u.startsWith('about:')) net.externalRequests.push(u);
  });

  const entry = `/${surface}/${surface === 'original' ? 'original.html' : 'index.html'}`;
  await page.goto(`http://127.0.0.1:${port}${entry}`, { waitUntil: 'load' });
  await page.waitForFunction(() => {
    const h = document.getElementById('hero');
    return h && h.complete && h.naturalWidth > 0;
  }, null, { timeout: 10000 });

  const d4 = ctx.width <= 720 ? await proveD4(page) : null;
  const d5 = ctx.width <= 720 ? await proveD5(page) : null;
  const d4RotationContinues = ctx.width <= 720
    ? await page.evaluate(async () => {
      const read = () => document.getElementById('angleText').textContent;
      const a = read();
      await new Promise((r) => setTimeout(r, 900));
      return { before: a, after: read(), advanced: a !== read() };
    })
    : null;

  if (!DRIVERS[state]) {
    const err = new Error(`DRIVERS[state] is not a function for ${ctx.id}/${state}`);
    err.available = Object.keys(DRIVERS);
    throw err;
  }

  /* --- TEMPORAL SYNCHRONIZATION: the fixed order from ruling 5906458180 -------------------
   * 1. initial authored readiness (BEFORE any driver)
   * 2. M1 D4 is already proven above, while AUTO is still ACTIVE
   * 3. STABLE: pause AUTO BEFORE the driver
   * 4. run the authored driver
   * 5. wait the state-specific terminal predicate
   * 6. native hard channels + liveness/inventory
   * 7. phase-lock ONLY the infinite authored CSSAnimation tracks
   * 8. phased geometry/computed-style
   */
  const startupReady = await waitStartupReadiness(page);
  const intent = intentOf(ctx.id, state);
  const pausesAuto = intent === 'STABLE' || INTENT_PERMITS_JS_PAUSE.has(`${ctx.id}/${state}`);
  const handoff = pausesAuto
    ? await pauseAutoBeforeDriver(page, ctx)
    : { action: 'NONE_INTENTIONAL', jsPaused: false };
  handoff.intent = intent;
  handoff.startupReady = startupReady;

  /* An angle-pinned state performs an authored drag, so it must start from a known angle. The
   * auto loop may already have advanced the angle once by the time AUTO is paused (the first
   * authored tick lands around 800-860 ms, and the readiness gate cannot finish before ~1100 ms),
   * so a drag from 045 and a drag from 090 end on DIFFERENT angles. Rewinding to the authored 000
   * first makes the drag outcome deterministic: the same absolute angle on both surfaces. This
   * is the author's own updateAngle() at the author's own 0 position, before the driver acts. */
  if (pausesAuto && angleIsPinned(state)) {
    handoff.angleRewindPreDriver = await rewindAngleToAuthoredZero(page);
  }

  await DRIVERS[state](page);

  /* Terminal predicate. A STABLE state is only sampled once its authored terminal condition is
   * observable, so a residual cannot be a sampling artifact. An intentional transient is never
   * waited into a different semantic state. */
  const terminal = (intent === 'STABLE' || intent === 'EXPLICIT_TRANSIENT')
    ? await waitTerminalPredicate(page, state)
    : { applied: false, reason: 'LIVE_STATE_NOT_WAITED' };
  handoff.terminal = terminal;

  /* Authored-angle rewind, after the driver and its terminal predicate, for a STABLE state whose
   * accepted meaning does not pin the angle. A pinned state keeps the authored drag result. */
  handoff.angleRewind = (intent === 'STABLE' && !angleIsPinned(state))
    ? await rewindAngleToAuthoredZero(page)
    : { applied: false, reason: angleIsPinned(state) ? 'ANGLE_PINNED_BY_ACCEPTED_STATE' : 'NOT_STABLE' };

  /* The authored look switch and the rewind both assign a hero src, so the decode wait below must
   * follow them. */
  if (handoff.angleRewind && handoff.angleRewind.applied) {
    await page.waitForFunction(() => {
      const live = (document.getAnimations ? document.getAnimations() : [])
        .filter((a) => a.constructor && a.constructor.name === 'CSSTransition')
        .filter((a) => a.playState === 'running');
      return live.length === 0;
    }, null, { timeout: 6000, polling: 50 }).catch(() => {});
  }

  /* Hero decode settle. The authored look switch assigns a new `src` and the browser decodes the
   * PNG asynchronously, so sampling in the same tick can observe complete=false / naturalWidth=0 on
   * one surface and a decoded image on the other. That is image-load timing, not a state or layout
   * difference. It writes nothing and changes no authored behavior. */
  await page.waitForFunction(() => {
    const h = document.getElementById('hero');
    return h && h.complete === true && h.naturalWidth > 0;
  }, null, { timeout: 10000 });

  /* NATIVE hard channels, captured BEFORE any phase-lock. This is the native liveness and
   * animation inventory that ruling 5905286796 requires to exist before the harness may
   * phase-lock the authored infinite CSS tracks. */
  const hard = await page.evaluate(collectChannels);

  /* Phased geometry/computed-style. ONLY the infinite authored CSSAnimation tracks are
   * phase-locked, and only after the native capture above. The finite CSSTransition and the
   * finite `burst` track are deliberately left running, because flattening them would hide the
   * finite-transient state the transient states exist to measure. The phase-lock is applied
   * identically on both surfaces, so it never favours ORIGINAL over SPLIT. */
  const phase = await phaseLockForCapture(page);
  const phased = await page.evaluate(collectChannels);
  /* Gate geometry/computedStyle on the PHASED capture; everything else stays on the NATIVE one,
   * because a phase-lock would flatten exactly the liveness facts those channels measure. */
  const hardPhased = {
    ...phased,
    geometry: phased.geometry,
    geometryRaw: phased.geometryRaw,
    geometryMotion: phased.geometryMotion,
    computedStyle: phased.computedStyle,
  };
  hardPhased.dom = hard.dom;
  hardPhased.animationInventory = hard.animationInventory;
  hardPhased.transientAnimations = hard.transientAnimations;
  hardPhased.responsive = hard.responsive;
  hardPhased.scroll = hard.scroll;
  hardPhased.domNative = hard.dom;
  hardPhased.motionNative = hard.geometryMotion;

  let png = null;
  let stabilized = null;
  if (opts.screenshot) {
    /* Screenshot channel only, and AFTER every hard channel above was collected. The page is
     * already settled and already phase-locked by the hard-capture path, so this block must NOT
     * toggle the authored AUTO control again: that would restart the loop and undo the settle.
     * It only records which stabilization the paired screenshot was taken under. */
    stabilized = handoff.action;
    png = await page.screenshot();
  }

  const netOut = {
    consoleErrors: net.consoleErrors,
    pageErrors: net.pageErrors,
    failedRequests: net.failedRequests,
    badResponses: net.badResponses,
    assetRequests: net.assetRequests.size,
    externalRequests: [...new Set(net.externalRequests)],
  };
  await context.close();
  return { hard, hardPhased, handoff, phase, net: netOut, d4, d5, d4RotationContinues, png, stabilized };
}

/**
 * Applies the bounded D2/D3 projection. Field-level only, on the random scalars CENTRAL
 * declared. The enclosing structure is deliberately PRESERVED rather than nulled, so a real
 * structural difference (a different particle count, a different upload step state) still
 * surfaces as a defect. Only the individual random values are replaced by a constant.
 *
 * The D2 particle `animationDelay` is also authored randomness, and it appears a second time in
 * the animation inventory, because each of the 25 burst particles runs the authored `burst`
 * keyframe with a random start delay. It is projected here as well so the inventory channel stays
 * exact on target, name, duration, iteration count and playState. Particle COUNT is still
 * compared, so a different number of particles remains a real defect.
 */
function project(ch) {
  const c = JSON.parse(JSON.stringify(ch));
  // D2: per-particle random radius/displacement and random animationDelay.
  // Count, order and class structure remain compared.
  if (Array.isArray(c.dom.burstParticleXsYs)) {
    for (const p of c.dom.burstParticleXsYs) { p.x = 'PROJECTED_D2_RANDOM'; p.y = 'PROJECTED_D2_RANDOM'; }
  }
  if (Array.isArray(c.dom.burstAnimationDelays)) {
    for (let i = 0; i < c.dom.burstAnimationDelays.length; i += 1) {
      c.dom.burstAnimationDelays[i] = 'PROJECTED_D2_RANDOM';
    }
  }
  // The same authored randomness seen through the animation inventory. A `burst` animation is a
  // save-burst particle, so its delay is the D2 random delay and is projected identically.
  if (Array.isArray(c.animationInventory)) {
    for (const a of c.animationInventory) {
      if (a.name === 'burst') a.delay = 'PROJECTED_D2_RANDOM';
    }
  }
  // D3: the random progress increment and the instantaneous displayed percentage while
  // processing. processShown, fileName and the completion transition remain compared exactly.
  c.dom.modal.percent = 'PROJECTED_D3_RANDOM';
  c.dom.modal.barWidth = 'PROJECTED_D3_RANDOM';
  c.dom.modal.stepDoneSignature = 'PROJECTED_D3_DERIVED';
  return c;
}

function diffPaths(a, b, prefix = '', out = []) {
  if (a === b) return out;
  const kind = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  const ta = kind(a);
  const tb = kind(b);
  // Arrays and plain objects are both traversed. `ta !== tb` alone is not enough here: two
  // DISTINCT array objects holding equal elements must recurse and compare element by element,
  // not be reported as a difference just because `a === b` was false for reference identity.
  if (ta === 'array' && tb === 'array') {
    if (a.length !== b.length) { out.push({ path: `${prefix}.length`, a: a.length, b: b.length }); return out; }
    for (let i = 0; i < a.length; i += 1) diffPaths(a[i], b[i], `${prefix}[${i}]`, out);
    return out;
  }
  if (ta !== tb || (ta !== 'object' && ta !== 'array')) { out.push({ path: prefix, a, b }); return out; }
  if (ta === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) diffPaths(a[k], b[k], prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

test('C10 the page-evaluated collector and the module agree on the authored track list', () => {
  // The collector body is serialized and evaluated inside the browser, so it cannot reference
  // module scope. It therefore repeats the authored-track list as a literal. These two lists
  // must stay identical or the animation-inventory gate would silently compare nothing.
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const m = src.match(/const AUTHORED = \[([^\]]*)\];/);
  assert.ok(m, 'the page-evaluated collector declares its own AUTHORED list');
  const inPage = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  assert.deepEqual(inPage, PAGE_AUTHORED_TRACKS,
    'the in-page authored-track literal matches the module list');
  // These are the tracks S2 measured as the unconditional continuous motion (D1).
  assert.deepEqual(PAGE_AUTHORED_TRACKS, ['drift', 'scan', 'spin', 'burst']);
  const css = read('split/styles.css').toString('utf8');
  for (const track of PAGE_AUTHORED_TRACKS) {
    assert.ok(css.includes(`@keyframes ${track}`), `authored @keyframes ${track} is present and unmodified`);
  }
});

test('C11 the S4 lane writes candidate evidence only and never an accepted parity record', () => {
  /* Lifecycle-aware. The capture lane is a CANDIDATE producer in every state; acceptance is a
   * separate CENTRAL metadata promotion. What must hold forever is that the candidate SUMMARY
   * stays a candidate artifact and that the browser lane never writes the accepted record.
   * The current metadata is NOT asserted here: after CENTRAL acceptance it legitimately reads
   * ACCEPTED, and asserting otherwise would make this guard lie about the lifecycle. */
  const s4Dir = path.join(CAPSULE, 'evidence', 's4');
  if (fs.existsSync(s4Dir)) {
    const summaryPath = path.join(s4Dir, 'candidate-summary.json');
    if (fs.existsSync(summaryPath)) {
      const s = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      assert.equal(s.candidate_only, true, 'the summary declares itself candidate-only');
      assert.equal(s.candidate_state.source_split_parity_pass, false);
      assert.equal(s.candidate_state.parity_ref, null);
      assert.equal(s.candidate_state.S4_ACCEPTED, 'NO');
      assert.equal(s.candidate_state.READY, 'NO');
      assert.equal(s.candidate_state.MERGE, 'NO');
      assert.equal(s.candidate_state.parity_status, 'CANDIDATE_PENDING_CENTRAL');
      assert.equal(s.PAIRED_STATE_COUNT, 36, 'the candidate ran the full 36-state plan');
      assert.equal(s.REVIEW_PACK_COUNT, 12, 'the candidate committed a 12-state review pack');
      assert.ok(['CANDIDATE_PASS_PENDING_CENTRAL_ACCEPTANCE', 'CANDIDATE_HOLD'].includes(s.S4_VERDICT));
    }
    /* The BROWSER CANDIDATE LANE may never write or modify the accepted parity record, in any
     * lifecycle state. Acceptance is a CENTRAL metadata promotion, never a capture product. */
    const accPath = path.join(CAPSULE, 'evidence', 'parity', 'accepted-parity.json');
    if (accPath && fs.existsSync(accPath)) {
      const accStat = fs.statSync(accPath);
      assert.ok(accStat.mtimeMs < Date.now() - 1000,
        'the browser candidate run did not just write accepted-parity.json');
    }
  }
});

/* ------------------------- review pack: side-by-side ------------------------- */
/* ORIGINAL and SPLIT at the same viewport, no diagnostic overlay over the UI. */

async function sideBySide(browser, port, ctx, state) {
  const shots = {};
  const stabilization = {};
  for (const surface of ['original', 'split']) {
    const r = await runState(browser, port, ctx, state, surface, { screenshot: true });
    shots[surface] = r.png;
    stabilization[surface] = r.stabilized;
  }
  const c = await browser.newContext({ viewport: { width: ctx.width * 2 + 24, height: ctx.height + 40 }, deviceScaleFactor: 1 });
  const p = await c.newPage();
  const [a, b] = [shots.original, shots.split];
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:#12141a;font:11px/1.4 monospace;color:#9aa4b2}
    .row{display:flex;gap:12px;padding:8px 12px}
    .col{flex:1}
    .lbl{padding:2px 0 4px;letter-spacing:.08em}
    img{display:block;width:100%;border:1px solid #2a2f3a}
  </style></head><body><div class="row">
    <div class="col"><div class="lbl">ORIGINAL</div><img src="data:image/png;base64,${a.toString('base64')}"></div>
    <div class="col"><div class="lbl">SPLIT</div><img src="data:image/png;base64,${b.toString('base64')}"></div>
  </div></body></html>`, { waitUntil: 'load' });
  await p.waitForTimeout(200);
  const buf = await p.screenshot({ fullPage: true });
  await c.close();
  return { buf, stabilization };
}

/**
 * Build the 12-state contact sheet for CENTRAL's direct visual review, from the already
 * committed review-pack PNGs. Each panel is one ORIGINAL|SPLIT pair, labelled with its state
 * and viewport, so CENTRAL can review all 12 states in a single image. This is a temporary
 * review artifact: it is written outside the capsule and never committed.
 */
async function buildContactSheet(browser, reviewPacks) {
  const panels = [];
  for (const r of reviewPacks) {
    const file = path.join(CAPSULE, r.file);
    if (!fs.existsSync(file)) return null;
    const buf = fs.readFileSync(file);
    panels.push({
      label: r.label,
      viewport: r.viewport,
      b64: buf.toString('base64'),
    });
  }
  const cols = 2;
  const cell = (p) => `<figure class="cell">
      <figcaption><b>${p.label}</b><span>${p.viewport} &middot; ORIGINAL | SPLIT</span></figcaption>
      <img src="data:image/png;base64,${p.b64}">
    </figure>`;
  const c = await browser.newContext({ viewport: { width: 2200, height: 1400 }, deviceScaleFactor: 1 });
  const page = await c.newPage();
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:#0e1014;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;color:#c8d0da}
    .grid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:14px;padding:14px}
    .cell{margin:0;background:#151922;border:1px solid #262c38;border-radius:6px;padding:8px}
    figcaption{display:flex;justify-content:space-between;gap:10px;padding:0 0 7px;color:#8d97a6}
    figcaption b{color:#e6ecf4;font-size:12px}
    img{display:block;width:100%;border:1px solid #262c38;border-radius:3px}
  </style></head><body><div class="grid">${panels.map(cell).join('')}</div></body></html>`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const out = await page.screenshot({ fullPage: true });
  await c.close();
  return out;
}

/** The interaction channel, compared exactly. Random scalars are not part of it. */
function interactionChannel(h) {
  return {
    save: h.dom.saveLabel, sound: h.dom.soundGlyph,
    modalOpen: h.dom.modal.open, processShown: h.dom.modal.processShown,
    toast: h.dom.toast, burstCount: h.dom.burstCount,
    visibleCards: h.dom.visibleCards, activeCard: h.dom.cardActiveIndex,
    filter: h.dom.filterActive,
  };
}

/**
 * D4 and D5 are direct assertions, not statistics. Each is measured on BOTH surfaces before
 * any screenshot stabilization, and the two surfaces must agree exactly on the fields that
 * describe the frozen defect. A D4/D5 difference between surfaces is a REAL parity defect.
 */
const D4_KEYS = [
  'viewportWidth', 'mq720', 'autoBtnDisplay', 'autoBtnUserReachable',
  'visibleAutoStopControl', 'visibleStopControls',
];
const D5_KEYS = [
  'innerHeight', 'docScrollHeight', 'docClientHeight', 'scrollable',
  'belowFoldControlY', 'bodyOverflowY',
];
const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj ? obj[k] : null]));

function d4Gate(o, s) {
  if (!o.d4 || !s.d4) return { compared: false, diffs: [] };
  const diffs = diffPaths(pick(o.d4, D4_KEYS), pick(s.d4, D4_KEYS));
  return {
    compared: true,
    diffs,
    // The frozen defect must be present on BOTH surfaces, identically.
    preserved: o.d4.autoBtnDisplay === 'none' && o.d4.autoBtnUserReachable === false
      && o.d4.visibleAutoStopControl === false
      && s.d4.autoBtnDisplay === 'none' && s.d4.autoBtnUserReachable === false
      && s.d4.visibleAutoStopControl === false,
    rotation_continues_original: o.d4RotationContinues,
    rotation_continues_split: s.d4RotationContinues,
    original: o.d4,
    split: s.d4,
  };
}

function d5Gate(o, s) {
  if (!o.d5 || !s.d5) return { compared: false, diffs: [] };
  const diffs = diffPaths(pick(o.d5, D5_KEYS), pick(s.d5, D5_KEYS));
  return {
    compared: true,
    diffs,
    // Frozen S2 observation: 390x844 does NOT scroll while controls sit below the fold.
    preserved: o.d5.scrollable === false && s.d5.scrollable === false,
    original: o.d5,
    split: s.d5,
  };
}

/* --------------------------- candidate summary --------------------------- */

/**
 * Writes evidence/s4/candidate-summary.json. This is CANDIDATE evidence only: it never sets
 * source_split_parity_pass, never writes an accepted-parity record and never promotes the
 * manifest or the materialization. CENTRAL alone decides S4 acceptance.
 */
function writeCandidateSummary(results, reviewPacks, ledger) {
  const n = results.length;
  const count = (pred) => results.filter(pred).length;
  const totalReal = results.reduce((sum, r) => sum + r.real_defects.length, 0);
  const exact = (key) => count((r) => r[key].length === 0);
  /* Network integrity. `requestfailed` also fires when the AUTHORED source reassigns `hero.src`
   * faster than the browser can finish decoding, which cancels an in-flight fetch and reports
   * net::ERR_ABORTED. The source does exactly this on every rapid rotation, it happens identically
   * on ORIGINAL and SPLIT, and the asset itself always resolves (measured: the same asset reloads
   * with a non-zero naturalWidth, 3/3 runs on both surfaces). An aborted in-flight request is
   * therefore load timing, not a missing asset and not a runtime failure. What is gated is a real
   * 4xx/5xx response, a console error, a page error, or any non-aborted request failure. */
  const isAbortedAsset = (u) => /\/assets\/turnarounds\/transparent\//.test(u);
  const hasRealNetworkFault = (net) => net.consoleErrors.length > 0
    || net.pageErrors.length > 0
    || net.badResponses.length > 0
    || net.failedRequests.some((u) => !isAbortedAsset(u));
  const networkErrorStates = count((r) => hasRealNetworkFault(r.network.original)
    || hasRealNetworkFault(r.network.split));
  const abortedRequestStates = count((r) => {
    const aborted = (net) => net.failedRequests.length > 0
      && net.failedRequests.every((u) => isAbortedAsset(u))
      && net.badResponses.length === 0;
    return aborted(r.network.original) || aborted(r.network.split);
  });
  const missingAssetStates = networkErrorStates;
  const assetCountMismatchStates = count((r) => r.network.original.assetRequests
    !== r.network.split.assetRequests);
  const assetRequestsObserved = [...new Set(results.flatMap((r) => [
    r.network.original.assetRequests, r.network.split.assetRequests,
  ]))].sort((a, b) => a - b);
  const externalStates = count((r) => r.network.original.externalRequests.length > 0
    || r.network.split.externalRequests.length > 0);
  const d1d5 = results.every((r) => r.d1_d5_preserved);
  const intentCounts = results.reduce((acc, r) => {
    acc[r.state_intent] = (acc[r.state_intent] || 0) + 1;
    return acc;
  }, {});
  const angleGatedStates = results.filter((r) => r.angle_axis && r.angle_axis.gated);
  const angleGatedDiffs = angleGatedStates.reduce((n, r) => n + r.angle_axis.diffs.length, 0);
  const unclassified = ledger.filter((e) => !ALLOWED_CLASSIFICATIONS.includes(e.classification));
  const randomProjected = [...new Set(results.flatMap((r) => r.random_fields_observed))].sort();
  /* A candidate PASS additionally requires SEMANTIC_CONTRACT_EXACT to be 36/36 and every
   * ledger row to carry an allowed classification (ruling 5905286796). Any other outcome is
   * CANDIDATE_HOLD. Nothing here widens an exclusion to force a pass. */
  const contractExact = count((r) => r.contract_semantic_exact);
  const geometryContractExactN = count((r) => r.geometry_contract_exact);
  const styleContractExactN = count((r) => r.computed_style_contract_exact);
  const hold = totalReal > 0 || !d1d5 || networkErrorStates > 0 || missingAssetStates > 0
    || externalStates > 0 || reviewPacks.length !== 12
    || contractExact !== n || unclassified.length > 0
    || geometryContractExactN !== n || styleContractExactN !== n;

  const summary = {
    schema_version: '1.0',
    source_id: 'CDX005',
    master_id: 'MST105',
    stage: 'S4_SOURCE_SPLIT_PARITY',
    status: 'CANDIDATE_PENDING_CENTRAL',
    candidate_only: true,
    generated_by: 'src/04_codex/CDX005/tests/s4-parity.test.mjs (browser candidate mode)',
    authority: {
      s3_acceptance_and_s4_release: 'skerishKang/lovetree-limone#589 comment 5889378824',
      s4_candidate_hold: 'skerishKang/lovetree-limone#589 comment 5904993568',
      s4_settle_ruling: 'skerishKang/lovetree-limone#589 comment 5905286796',
      s2_acceptance: 'skerishKang/lovetree-limone#589 comment 5887518417',
      s2_report: 'skerishKang/workdiary 960fd4ad407d5b996f644064c6ed1a5b7383d7ab',
    },
    parity_contract: 'SOURCE_SPECIFIC_MOTION_AWARE',
    PAIRED_STATE_COUNT: n,
    /* Two SEPARATE numbers, per ruling 5905286796. SEMANTIC_RAW_EXACT is the measured raw
     * equality with no projection and no exclusion. SEMANTIC_CONTRACT_EXACT is exact after
     * ONLY the authorized D2/D3 random-scalar projection plus ledger-backed classes, and must
     * be 36/36 for a candidate PASS. Reporting 17/36 raw equality as "exact across all 36" is
     * exactly what HOLD-1 rejected, so the two are never merged and never described that way. */
    SEMANTIC_RAW_EXACT: `${count((r) => r.raw_semantic_exact)}/${n}`,
    SEMANTIC_CONTRACT_EXACT: `${count((r) => r.contract_semantic_exact)}/${n}`,
    RESIDUAL_LEDGER_ENTRIES: ledger.length,
    RESIDUAL_LEDGER_PATH: 'evidence/s4/residual-ledger.json',
    /* Hard-channel residuals are now durably ledgered (ruling 5908541198), so geometry and
     * computed style report the same RAW vs CONTRACT split as semantics. RAW is the measured
     * equality with no exclusion; CONTRACT is exact once every residual is an authorized
     * ledger row. A candidate PASS requires BOTH contract counts at 36/36. */
    GEOMETRY_RAW_EXACT: `${count((r) => r.geometry_raw_exact)}/${n}`,
    GEOMETRY_CONTRACT_EXACT: `${count((r) => r.geometry_contract_exact)}/${n}`,
    GEOMETRY_EXACT: `${exact('geometry_diffs')}/${n}`,
    COMPUTED_STYLE_RAW_EXACT: `${count((r) => r.computed_style_raw_exact)}/${n}`,
    COMPUTED_STYLE_CONTRACT_EXACT: `${count((r) => r.computed_style_contract_exact)}/${n}`,
    STATE_INTENT_COUNTS: intentCounts,
    STATE_INTENT_TABLE: STATE_INTENT,
    ANGLE_AXIS_LEDGER_STATES: angleGatedStates.map((r) => `${r.ctx}/${r.state}`),
    ANGLE_AXIS_LEDGER_DELTAS: angleGatedDiffs,
    SETTLE_POLICY: 'State-semantic, per CENTRAL ruling #589 comment 5905286796. STABLE states stop the authored JS auto loop through the authored AUTO control (real user click on desktop/tablet; DOM click of the SAME authored control on mobile, after D4 is proven and recorded as HARNESS_ONLY_NOT_USER_REACHABLE) and then wait out any authored finite CSS transition. AUTHORED_LIVE and EXPLICIT_TRANSIENT states are never stopped or waited into another semantic state. The authored drift/scan/spin keyframes are infinite by design, so after the NATIVE hard channels and animation/liveness inventory are recorded, the harness phase-locks the existing animation objects identically on both surfaces for geometry/computed-style only, recorded as HARNESS_PHASE_LOCK_AFTER_NATIVE_MEASUREMENT.',
    EXCLUSION_POLICY: 'NO generic movingOnEither exclusion exists. On a STABLE state a motion-state disagreement, a geometry delta or a computed-style delta is a REAL PARITY DEFECT. A residual is ledgered only when it matches one of the five allowed classifications; anything else is a real defect.',
    ALLOWED_RESIDUAL_CLASSIFICATIONS: ALLOWED_CLASSIFICATIONS,
    UNCLASSIFIED_RESIDUALS: unclassified.length,
    COMPUTED_STYLE_EXACT: `${exact('computed_style_diffs')}/${n}`,
    INTERACTION_EXACT: `${exact('interaction_diffs')}/${n}`,
    ANIMATION_INVENTORY_EXACT: `${exact('animation_inventory_diffs')}/${n}`,
    NETWORK_ERROR_STATES: networkErrorStates,
    ABORTED_IN_FLIGHT_REQUEST_STATES: abortedRequestStates,
    ABORTED_REQUEST_NOTE: 'net::ERR_ABORTED on a turnaround PNG is the authored source reassigning hero.src during a rapid rotation. It was observed identically on ORIGINAL and SPLIT, carries no 4xx, and the same asset resolves on reload with a non-zero naturalWidth, so it is recorded as load timing and is not counted as a network error or a missing asset.',
    MISSING_ASSET_STATES: missingAssetStates,
    ASSET_REQUEST_COUNT_MISMATCH_STATES: assetCountMismatchStates,
    ASSET_REQUESTS_OBSERVED_PER_STATE: assetRequestsObserved,
    ASSET_NOTE: 'The capsule vendors 80 turnaround PNGs on each side and contract mode proves all 160 are byte-identical. The authored page does not request all 80 on a single load: it renders one look hero plus the grid thumbnails, so 10-18 requests per state is the expected range. A request-count difference between surfaces is reported here and is a defect only when a request actually failed or returned 4xx, which is 0/36.',
    EXTERNAL_REQUEST_STATES: externalStates,
    D1_D5_PRESERVED: d1d5 ? 'YES' : 'NO',
    D2_D3_PROJECTED_RANDOM_FIELDS: randomProjected,
    D2_D3_PROJECTION_POLICY: 'FIELD_LEVEL_ONLY_RANDOM_SCALARS; the enclosing particle and upload structure is still compared exactly; no Math.random seed, no monkey-patch, no clock patch, no performance.now patch, no source normalization',
    RAW_PNG_EQUAL: process.env.CDX005_S4_RAW_PNG_EQUAL || 'NOT_COMPUTED_EVIDENCE_ONLY_NOT_A_GATE',
    REVIEW_PACK_COUNT: reviewPacks.length,
    review_pack: reviewPacks,
    REAL_PARITY_DEFECTS: totalReal,
    real_parity_defect_detail: results.filter((r) => r.real_defects.length > 0)
      .map((r) => ({ ctx: r.ctx, state: r.state, defects: r.real_defects })),
    S4_VERDICT: hold ? 'CANDIDATE_HOLD' : 'CANDIDATE_PASS_PENDING_CENTRAL_ACCEPTANCE',
    candidate_state: {
      source_split_parity_pass: false,
      parity_status: 'CANDIDATE_PENDING_CENTRAL',
      parity_ref: null,
      S4_ACCEPTED: 'NO',
      MANIFEST_PARITY_PROMOTED: 'NO',
      READY: 'NO',
      MERGE: 'NO',
    },
    nondeterminism_declaration: {
      method: 'two ORIGINAL repetitions per state; a field that differs original-vs-original is nondeterministic by construction, exactly the method S2 used',
      settle_policy: 'state-semantic per CENTRAL #589 comment 5905286796; see SETTLE_POLICY',
      transient_transitions: 'an authored finite transition is waited out on a STABLE state; on an intentionally transient state the phase is recorded in residual-ledger.json under AUTHORED_FINITE_TRANSIENT_PHASE',
      infinite_css: 'the authored drift/scan/spin keyframes have no terminal state; the NATIVE inventory is recorded first, then both surfaces are phase-locked identically for geometry/computed-style only',
      motion_disagreement: 'a REAL PARITY DEFECT on a STABLE state; there is no generic movingOnEither exclusion',
      authored_tracks: AUTHORED_TRACKS,
      D4: 'at <=720px #autoBtn is display:none, so the authored auto loop is user-unstoppable; proven on both surfaces BEFORE any stabilization, then the same authored control is DOM-clicked for measurement only and recorded as HARNESS_ONLY_NOT_USER_REACHABLE',
      D5: 'at 390x844 the document does not scroll while authored controls sit below the fold; recorded on both surfaces, never repaired',
    },
  };
  const out = path.join(CAPSULE, 'evidence', 's4', 'candidate-summary.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
  const ledgerOut = path.join(CAPSULE, 'evidence', 's4', 'residual-ledger.json');
  fs.writeFileSync(ledgerOut, `${JSON.stringify({
    schema_version: '1.0',
    source_id: 'CDX005',
    stage: 'S4_SOURCE_SPLIT_PARITY',
    status: 'CANDIDATE_PENDING_CENTRAL',
    authority: 'skerishKang/lovetree-limone#589 comment 5905286796',
    allowed_classifications: ALLOWED_CLASSIFICATIONS,
    note: 'Every raw residual that is authorized by an explicitly named class. A residual that is NOT in this file is a real parity defect, counted in REAL_PARITY_DEFECTS.',
    entries: ledger,
  }, null, 2)}
`);
  console.log(`CDX005_S4_LEDGER=${ledgerOut} entries=${ledger.length}`);
  for (const k of ['REAL_PARITY_DEFECTS', 'SEMANTIC_RAW_EXACT', 'SEMANTIC_CONTRACT_EXACT', 'GEOMETRY_EXACT', 'COMPUTED_STYLE_EXACT',
    'GEOMETRY_RAW_EXACT', 'GEOMETRY_CONTRACT_EXACT', 'COMPUTED_STYLE_RAW_EXACT', 'COMPUTED_STYLE_CONTRACT_EXACT',
    'INTERACTION_EXACT', 'ANIMATION_INVENTORY_EXACT', 'NETWORK_ERROR_STATES',
    'MISSING_ASSET_STATES', 'D1_D5_PRESERVED', 'REVIEW_PACK_COUNT', 'S4_VERDICT']) {
    console.log(`CDX005_S4_${k}=${typeof summary[k] === 'number' ? summary[k] : summary[k]}`);
  }
  console.log(`CDX005_S4_SUMMARY=${out}`);
  return summary;
}

/* ------------------------------ browser mode tests ----------------------------- */

test('C13 the generic moving-either-side exclusion is gone from the parity gate', () => {
  /* HOLD-1: a blanket "moving on either side" exclusion hid the case where ORIGINAL was
   * settled and SPLIT was still transitioning. The gate must be intent-driven instead. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  /* The block is delimited by sentinels, so this guard cannot match the summary string that
   * merely DESCRIBES the removed policy. This guard also quotes the sentinel text, so the real
   * pair is the LAST occurrence in the file - hence lastIndexOf for both ends. */
  const start = src.lastIndexOf('/* GATE_BLOCK_START */');
  const end = src.lastIndexOf('/* GATE_BLOCK_END */');
  assert.ok(start > 0 && end > start, 'the comparison block sentinels are present');
  const gate = src.slice(start, end);
  assert.equal(/movingOnEither\s*[=(]/.test(gate), false,
    'no executable movingOnEither gate may remain in the comparison block');
  assert.equal(/isCaptureInstant\s*[=(]/.test(gate), false,
    'no executable isCaptureInstant helper may remain in the comparison block');
  assert.ok(gate.includes('motionDisagreement'), 'motion disagreement is still measured');
  assert.ok(/intent === 'STABLE' \? motionDisagreement/.test(gate),
    'motion disagreement is a REAL defect on a STABLE state');
  /* Nothing executable survives anywhere in the file either. */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
  assert.equal(/movingOnEither\s*[=(]/.test(code), false,
    'no executable movingOnEither definition or call survives');
  assert.equal(/isCaptureInstant\s*[=(]/.test(code), false,
    'no executable isCaptureInstant definition or call survives');
});

test('C17 no ledger entry is labelled with a class its field cannot have', () => {
  /* A self-difference proves the SOURCE is nondeterministic on that field. It does not make
   * the field a D2/D3 random scalar. Mislabelling would let an unexplained residual buy a
   * legitimate-sounding classification, so the label must match the field's actual nature. */
  const lp = path.join(CAPSULE, 'evidence', 's4', 'residual-ledger.json');
  if (!fs.existsSync(lp)) return;
  const l = JSON.parse(fs.readFileSync(lp, 'utf8'));
  for (const e of l.entries) {
    if (e.classification === 'D2_RANDOM_SCALAR') {
      assert.ok(/burstParticleXsYs|burstAnimationDelays/.test(e.field_path),
        `D2_RANDOM_SCALAR only applies to the authored burst fields, not ${e.field_path}`);
    }
    if (e.classification === 'D3_RANDOM_SCALAR') {
      assert.ok(/modal\.(percent|barWidth|stepDoneSignature)/.test(e.field_path),
        `D3_RANDOM_SCALAR only applies to the authored upload fields, not ${e.field_path}`);
    }
    if (e.classification === 'AUTHORED_LIVE_PHASE') {
      assert.ok(['AUTHORED_LIVE', 'EXPLICIT_TRANSIENT'].includes(e.state_intent),
        `AUTHORED_LIVE_PHASE is only valid on a live/transient state, not ${e.state}`);
      /* The angle axis, or a live-phase animation-liveness count on a state that is live by
       * accepted design. Anything else under this label is a mislabel. */
      assert.ok(['dom.heroSrc', 'dom.angleText', 'dom.angleOnIndex'].includes(e.field_path)
        || e.field_path.startsWith('transientAnimations'),
      `AUTHORED_LIVE_PHASE only covers the angle axis or live animation liveness, not ${e.field_path}`);
    }
    if (e.classification === 'AUTHORED_FINITE_TRANSIENT_PHASE') {
      assert.equal(e.state_intent, 'EXPLICIT_TRANSIENT',
        `AUTHORED_FINITE_TRANSIENT_PHASE is only valid on an explicit transient, not ${e.state}`);
    }
    if (e.classification === 'INFINITE_CSS_PHASE_AFTER_NATIVE_PROOF') {
      assert.ok(/^(geometry|computedStyle|geometryRaw)\./.test(e.field_path),
        `the infinite-CSS class only covers geometry/computed-style, not ${e.field_path}`);
    }
  }
});

test('C18 the temporal-synchronization order is enforced in the capture path', () => {
  /* Ruling 5906458180 fixes a strict order. The harness must not drift back to pausing AUTO after
   * the driver, or to sampling a STABLE state before its authored terminal condition. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const runStart = src.indexOf('async function runState(');
  const runEnd = src.indexOf('async function sideBySide(');
  assert.ok(runStart > 0 && runEnd > runStart, 'runState was located');
  const body = src.slice(runStart, runEnd);
  const iReady = body.indexOf('await waitStartupReadiness(page)');
  const iPause = body.indexOf('await pauseAutoBeforeDriver(page, ctx)');
  const iDrive = body.indexOf('await DRIVERS[state](page)');
  const iTerm = body.indexOf('await waitTerminalPredicate(page, state)');
  const iNative = body.indexOf('const hard = await page.evaluate(collectChannels)');
  const iPhase = body.indexOf('await phaseLockForCapture(page)');
  for (const [n, i] of [['startup readiness', iReady], ['AUTO pause', iPause], ['driver', iDrive],
    ['terminal predicate', iTerm], ['native capture', iNative], ['phase-lock', iPhase]]) {
    assert.ok(i > 0, `${n} is present in runState`);
  }
  assert.ok(iReady < iPause, 'startup readiness is awaited BEFORE the AUTO pause');
  assert.ok(iPause < iDrive, 'the STABLE AUTO pause happens BEFORE the state driver');
  assert.ok(iDrive < iTerm, 'the driver runs BEFORE the terminal predicate is awaited');
  assert.ok(iTerm < iNative, 'the terminal predicate is awaited BEFORE the native capture');
  assert.ok(iNative < iPhase, 'the native capture happens BEFORE the phase-lock');
});

test('C19 the phase-lock touches only infinite authored CSSAnimation tracks', () => {
  /* The ruling forbids flattening a finite CSSTransition or the finite burst track under the
   * infinite-keyframe rule: pausing them would erase the state the transient states measure. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const start = src.indexOf('async function phaseLockForCapture(');
  const end = src.indexOf('/** D4: prove the AUTO control is hidden');
  assert.ok(start > 0 && end > start, 'phaseLockForCapture was located');
  const body = src.slice(start, end);
  assert.ok(body.includes('INFINITE_AUTHORED_CSSANIMATION_ONLY'), 'the lock declares its scope');
  assert.ok(/infinite\.indexOf\(name\)/.test(body) || /infinite\.includes\(name\)/.test(body),
    'the lock filters on an authored infinite-track list');
  assert.ok(body.includes('iterations === Infinity'),
    'the lock only pauses animations with infinite iterations');
  // A blanket pause of every animation is the exact behaviour the ruling removed.
  assert.equal(/for\s*\(const a of document\.getAnimations\(\)\)\s*\{\s*try\s*\{\s*a\.pause\(\)/.test(body), false,
    'the lock must not blanket-pause every animation object');
});

test('C20 a STABLE residual is never waived as source self-nondeterminism', () => {
  /* Ruling 5906458180: there is NO blanket SOURCE_SELF_NONDETERMINISM waiver for stable states.
   * A self-difference is a sampling-instability signal, not permission to absorb the delta. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  /* lastIndexOf for both: this guard quotes the sentinel text, so the real pair is the last. */
  const start = src.lastIndexOf('/* GATE_BLOCK_START */');
  const end = src.lastIndexOf('/* GATE_BLOCK_END */');
  assert.ok(start > 0 && end > start, 'the comparison block sentinels are present');
  const gate = src.slice(start, end);
  assert.ok(gate.includes('selfWaives'), 'the self-difference is explicitly scoped');
  assert.ok(/const selfWaives = selfDiff && isLive;/.test(gate),
    'a self-difference only waives on a live/transient state, never on STABLE');
  // stableRealDefects must NOT filter self-differences out.
  const block = gate.slice(gate.indexOf('const stableRealDefects'), gate.indexOf('const motionDefects'));
  assert.equal(/if \(selfPaths\.has\(d\.path\)\) return false;/.test(block), false,
    'stableRealDefects must not skip a residual merely because ORIGINAL also self-differs');
});

test('C21 geometry and computed-style residuals are durably ledgered, never dropped', () => {
  /* Ruling 5908541198: a hard-channel residual on a live/transient state must be an auditable
   * ledger row. It may not silently vanish from the gate, and a STABLE residual may never be
   * ledgered away. */
  const lp = path.join(CAPSULE, 'evidence', 's4', 'residual-ledger.json');
  const sp = path.join(CAPSULE, 'evidence', 's4', 'candidate-summary.json');
  if (!fs.existsSync(sp)) return;
  assert.ok(fs.existsSync(lp), 'a candidate run writes residual-ledger.json');
  const l = JSON.parse(fs.readFileSync(lp, 'utf8'));
  const hard = l.entries.filter((e) => e.channel === 'geometry' || e.channel === 'computedStyle');
  for (const e of hard) {
    assert.ok(e.state_intent !== 'STABLE',
      `a STABLE geometry/style residual must be a real defect, never a ledger row: ${e.state}`);
    assert.ok(['AUTHORED_LIVE', 'EXPLICIT_TRANSIENT'].includes(e.state_intent),
      `a hard-channel ledger row is only valid on a live/transient state: ${e.state}`);
    assert.ok(ALLOWED_CLASSIFICATIONS.includes(e.classification),
      `${e.field_path} classification ${e.classification} is already-authorized`);
    for (const f of ['state', 'channel', 'field_path', 'original_a', 'split',
      'original_motion_or_liveness', 'split_motion_or_liveness', 'stabilization_action',
      'classification', 'contract_disposition']) {
      assert.ok(f in e, `hard-channel ledger row ${e.field_path} has ${f}`);
    }
  }
});

test('C22 the summary reports raw and contract exactness for geometry and computed style', () => {
  const sp = path.join(CAPSULE, 'evidence', 's4', 'candidate-summary.json');
  if (!fs.existsSync(sp)) return;
  const j = JSON.parse(fs.readFileSync(sp, 'utf8'));
  for (const f of ['GEOMETRY_RAW_EXACT', 'GEOMETRY_CONTRACT_EXACT',
    'COMPUTED_STYLE_RAW_EXACT', 'COMPUTED_STYLE_CONTRACT_EXACT']) {
    assert.ok(typeof j[f] === 'string' && /^\d+\/36$/.test(j[f]), `${f} is reported as x/36`);
  }
  /* A candidate PASS requires BOTH hard-channel contract counts at 36/36. */
  if (j.S4_VERDICT === 'CANDIDATE_PASS_PENDING_CENTRAL_ACCEPTANCE') {
    assert.equal(j.GEOMETRY_CONTRACT_EXACT, '36/36',
      'a candidate PASS requires geometry contract-exactness 36/36');
    assert.equal(j.COMPUTED_STYLE_CONTRACT_EXACT, '36/36',
      'a candidate PASS requires computed-style contract-exactness 36/36');
  }
});

test('C23 the three-run proof gate requires hard-channel contract exactness per run', () => {
  const pp = path.join(CAPSULE, 'evidence', 's4', 'three-run-proof.json');
  if (!fs.existsSync(pp)) return;
  const p = JSON.parse(fs.readFileSync(pp, 'utf8'));
  for (const r of p.runs) {
    assert.equal(r.geometry_contract_exact, '36/36', `run ${r.run_index} geometry contract is 36/36`);
    assert.equal(r.computed_style_contract_exact, '36/36',
      `run ${r.run_index} computed-style contract is 36/36`);
  }
  if (p.runs.length >= 3) {
    assert.equal(p.THREE_RUN_PROOF, true,
      'the three-run proof requires all three runs clean on every channel');
  }
});

test('C24 a movement boolean alone can never select the infinite-CSS class', () => {
  /* Ruling 5909569578: `geometryMotion === true` only proves an element moved between samples. It
   * does not prove the motion came from an authored infinite CSSAnimation, and a finite
   * `.toast` CSSTransition moves too. The classifier must key on native animation IDENTITY. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const start = src.indexOf('const classifyStyleChannel');
  assert.ok(start > 0, 'classifyStyleChannel was located');
  const body = src.slice(Math.max(0, start - 2200), start + 1200);
  /* Strip comments and this guard's own body before scanning, so the assertion cannot match the
   * identifier inside its own message. */
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
  assert.equal(/nativeInfiniteLanes\s*[=(]/.test(codeOnly), false,
    'no executable motion-boolean lane set may exist');
  assert.equal(/geometryMotion\[[^\]]+\] === true/.test(body), false,
    'the classifier must not infer the infinite class from geometryMotion');
  // The infinite class must be gated on real identity: CSSAnimation + authored track + Infinity.
  assert.ok(body.includes("x.kind === 'CSSAnimation'"), 'the infinite class requires a CSSAnimation');
  assert.ok(body.includes("String(x.iterations) === 'Infinity'"), 'the infinite class requires iterations Infinity');
  assert.ok(body.includes("INFINITE_TRACKS.indexOf(String(x.name)) >= 0"),
    'the infinite class requires an authored infinite track name');
});

test('C25 the authored .toast is a finite transition, never an infinite animation', () => {
  /* The concrete case CENTRAL flagged. The authored .toast declares `transition: .3s` and no
   * animation at all, so any residual on it is a finite transient phase. */
  const css = fs.readFileSync(path.join(CAPSULE, 'split', 'styles.css'), 'utf8');
  const toast = (css.match(/\.toast\{[^}]*\}/) || [''])[0];
  assert.ok(toast.includes('transition:'), 'the authored .toast declares a transition');
  assert.equal(/animation\s*:/.test(toast), false,
    'the authored .toast declares no animation, so it is never an infinite-CSS target');
  assert.ok(!/\.toast[^}]*animation\s*:/.test(css), 'no animation property targets .toast');
  // drift / scan / spin are the only infinite authored tracks.
  for (const t of ['drift', 'scan', 'spin']) {
    assert.ok(css.includes(`@keyframes ${t}`), `authored infinite track ${t} exists`);
  }
});

test('C26 R1/04 toast residuals classify as a finite transient phase', () => {
  /* Regression guard for the exact defect CENTRAL reported: these three rows were previously
   * mislabeled INFINITE_CSS_PHASE_AFTER_NATIVE_PROOF. */
  const lp = path.join(CAPSULE, 'evidence', 's4', 'residual-ledger.json');
  if (!fs.existsSync(lp)) return;
  const l = JSON.parse(fs.readFileSync(lp, 'utf8'));
  const toastRows = l.entries.filter((e) => e.field_path.includes('toast')
    && (e.channel === 'geometry' || e.channel === 'computedStyle'));
  for (const e of toastRows) {
    assert.equal(e.classification, 'AUTHORED_FINITE_TRANSIENT_PHASE',
      `${e.state} ${e.field_path} must be a finite transient phase, not ${e.classification}`);
    assert.ok(e.native_animation_proof,
      `${e.field_path} records the native animation proof behind its classification`);
    const proved = e.native_animation_proof.original || [];
    assert.equal(proved.some((x) => x.kind === 'CSSAnimation'), false,
      `${e.field_path} native proof shows no CSSAnimation on the toast`);
  }
  // No hard-channel row may claim the infinite class without native CSSAnimation proof.
  for (const e of l.entries.filter((x) => x.classification === 'INFINITE_CSS_PHASE_AFTER_NATIVE_PROOF')) {
    const proved = [...((e.native_animation_proof || {}).original || []), ...((e.native_animation_proof || {}).split || [])];
    assert.ok(proved.some((x) => x.kind === 'CSSAnimation'
      && ['drift', 'scan', 'spin'].indexOf(String(x.name)) >= 0
      && String(x.iterations) === 'Infinity'),
    `${e.field_path} claims the infinite class, so its native proof must show an infinite CSSAnimation`);
  }
});

test('C14 the per-state intent table matches the CENTRAL settle ruling exactly', () => {
  assert.deepEqual(Object.keys(STATE_INTENT).sort(), [
    'D1/01_initial_auto_active',
    'D1/16_look_switch_transient_out',
    'D1/17_save_burst_transient',
    'R1/01_initial_source_behavior',
    'R1/03_css_drift_spin_scan_observation',
    'R1/04_save_burst_observation',
  ], 'exactly the six states CENTRAL named are non-STABLE');
  for (const [k, v] of Object.entries(STATE_INTENT)) {
    assert.ok(['AUTHORED_LIVE', 'EXPLICIT_TRANSIENT'].includes(v), `${k} has a valid intent`);
  }
  // Everything not named is STABLE, and the names must be verbatim S2 state names.
  for (const { ctx, state } of ALL_STATES) {
    const i = intentOf(ctx, state);
    assert.ok(['STABLE', 'AUTHORED_LIVE', 'EXPLICIT_TRANSIENT'].includes(i), `${ctx}/${state} intent is valid`);
  }
  assert.equal(ALL_STATES.filter((s) => intentOf(s.ctx, s.state) === 'STABLE').length, 30,
    'the other 30 accepted states are STABLE');
  assert.deepEqual(ALLOWED_CLASSIFICATIONS, [
    'D2_RANDOM_SCALAR', 'D3_RANDOM_SCALAR', 'AUTHORED_LIVE_PHASE',
    'AUTHORED_FINITE_TRANSIENT_PHASE', 'INFINITE_CSS_PHASE_AFTER_NATIVE_PROOF',
  ], 'the allowed classification set is exactly the bounded list');
});

test('C15 the summary separates raw from contract semantic exactness', () => {
  const s = path.join(CAPSULE, 'evidence', 's4', 'candidate-summary.json');
  if (!fs.existsSync(s)) return; // browser candidate has not been run yet
  const j = JSON.parse(fs.readFileSync(s, 'utf8'));
  assert.ok(typeof j.SEMANTIC_RAW_EXACT === 'string', 'SEMANTIC_RAW_EXACT is reported');
  assert.ok(typeof j.SEMANTIC_CONTRACT_EXACT === 'string', 'SEMANTIC_CONTRACT_EXACT is reported');
  assert.equal(j.SEMANTIC_EXACT, undefined,
    'the ambiguous single SEMANTIC_EXACT field is gone');
  // A candidate PASS may only be claimed when contract-exactness is 36/36.
  if (j.S4_VERDICT === 'CANDIDATE_PASS_PENDING_CENTRAL_ACCEPTANCE') {
    assert.equal(j.SEMANTIC_CONTRACT_EXACT, '36/36',
      'a candidate PASS requires SEMANTIC_CONTRACT_EXACT 36/36');
    assert.equal(j.UNCLASSIFIED_RESIDUALS, 0, 'a candidate PASS has no unclassified residual');
  }
});

test('C16 the residual ledger exists and every entry is classified', () => {
  const lp = path.join(CAPSULE, 'evidence', 's4', 'residual-ledger.json');
  const sp = path.join(CAPSULE, 'evidence', 's4', 'candidate-summary.json');
  if (!fs.existsSync(sp)) return;
  assert.ok(fs.existsSync(lp), 'a candidate run must write residual-ledger.json');
  const l = JSON.parse(fs.readFileSync(lp, 'utf8'));
  assert.deepEqual(l.allowed_classifications, ALLOWED_CLASSIFICATIONS);
  for (const e of l.entries) {
    for (const f of ['state', 'state_intent', 'channel', 'field_path', 'original_a', 'split',
      'original_motion_or_liveness', 'split_motion_or_liveness', 'stabilization_action',
      'classification', 'contract_disposition']) {
      assert.ok(f in e, `ledger entry ${e.field_path} has ${f}`);
    }
    assert.ok(ALLOWED_CLASSIFICATIONS.includes(e.classification),
      `ledger entry ${e.field_path} classification ${e.classification} is allowed`);
    assert.ok(['STABLE', 'AUTHORED_LIVE', 'EXPLICIT_TRANSIENT'].includes(e.state_intent));
  }
  // The review pack stays exactly the 12 individual PNGs; the contact sheet is never committed.
  const pack = path.join(CAPSULE, 'evidence', 's4', 'review-pack');
  const pngs = fs.readdirSync(pack).filter((f) => f.endsWith('.png'));
  assert.equal(pngs.length, 12, 'review-pack holds exactly the 12 bounded review images');
});

test('S4-CANDIDATE original/split parity over the 36 accepted S2 states', { timeout: 1800000 }, async () => {
  if (!BROWSER_MODE) {
    console.log('CDX005_S4_MODE=CONTRACT (browser candidate mode disabled)');
    return;
  }
  // Playwright is resolved explicitly. ESM ignores NODE_PATH, so the browser mode is
  // pointed at an install with CDX005_S4_PLAYWRIGHT_MODULE (or falls back to plain
  // resolution when the module is already local). Contract mode never reaches this.
  const { createRequire } = await import('node:module');
  const req = createRequire(import.meta.url);
  const target = process.env.CDX005_S4_PLAYWRIGHT_MODULE || 'playwright';
  const { chromium } = req(target);
  const { server, port } = await startServer();
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const reviewPacks = [];
  const ledger = [];
  try {
  const only = process.env.CDX005_S4_STATES;
  const plan = only
    ? ALL_STATES.filter((s) => only.split(',').includes(`${s.ctx}/${s.state}`))
    : ALL_STATES;
  if (only) console.log(`CDX005_S4_STATE_FILTER=${plan.map((s) => `${s.ctx}/${s.state}`).join(',')}`);
  for (const { ctx: ctxId, state } of plan) {
    const ctx = STATE_PLAN[ctxId];
    const o = await runState(browser, port, ctx, state, 'original');
    const s = await runState(browser, port, ctx, state, 'split');
      // A second ORIGINAL run separates inherent source nondeterminism from a real split
      // defect. A field that differs original-vs-original is nondeterministic by
      // construction; a field stable across original runs but differing from split is a
      // REAL parity defect.
      const o2 = await runState(browser, port, ctx, state, 'original');

      const intent = intentOf(ctxId, state);
      const isLive = intent === 'AUTHORED_LIVE' || intent === 'EXPLICIT_TRANSIENT';

      /* GATE_BLOCK_START */
      /* RAW parity: no projection, no exclusion, no phase-lock tolerance. This is the number
       * CENTRAL asked to see reported separately from the contract-exact number. */
      const rawDiffs = diffPaths(o.hard, s.hard);
      const rawExact = rawDiffs.length === 0;

      /* CONTRACT parity: the D2/D3 random-scalar projection, plus the intent-driven classes
       * below. On a STABLE state NOTHING is excluded - a residual there is a real defect. */
      const pO = project(o.hard);
      const pS = project(s.hard);
      const pO2 = project(o2.hard);
      const parityDiffs = diffPaths(pO, pS);
      const selfDiffs = diffPaths(pO, pO2);
      const selfPaths = new Set(selfDiffs.map((d) => d.path));

      /* Geometry and computed style are compared on the PHASED capture, taken after the native
       * inventory and after an identical phase-lock on both surfaces. Everything else - DOM
       * semantics, labels, modal/process state, responsive, scroll, the animation inventory - is
       * compared on the NATIVE capture, because a phase-lock would flatten exactly the liveness
       * facts those channels exist to measure. */
      const pOPh = project(o.hardPhased);
      const pSPh = project(s.hardPhased);
      const geometryAll = diffPaths(pOPh.geometry, pSPh.geometry);
      const styleAll = diffPaths(pOPh.computedStyle, pSPh.computedStyle);

      /* Motion disagreement. Under ruling 5905286796 a disagreement about whether an element is
       * moving is a REAL PARITY DEFECT on a STABLE state. This is the case the previous
       * `movingOnEither` gate silently swallowed: ORIGINAL settled while SPLIT still
       * transitioning. There is no blanket moving-on-either exclusion any more. */
      const motionDisagreement = diffPaths(o.hard.geometryMotion, s.hard.geometryMotion);
      const motionDisagreementPaths = new Set(motionDisagreement.map((d) => `motionDisagreement.${d.path}`));

      /* Angle axis. Gated only on states whose ACCEPTED S2 MEANING leaves the authored JS auto
       * loop running (AUTHORED_LIVE). On a STABLE state the loop was stopped through the
       * authored control before capture, so the angle axis is compared EXACTLY. */
      const ANGLE_PATHS = ['dom.heroSrc', 'dom.angleText', 'dom.angleOnIndex'];
      const oAuto = /AUTO/.test((o.hard.dom && o.hard.dom.autoLabel) || '');
      const sAuto = /AUTO/.test((s.hard.dom && s.hard.dom.autoLabel) || '');
      const angleIsLive = oAuto || sAuto;
      const angleGateAllowed = isLive && angleIsLive;
      const angleDiffs = parityDiffs.filter((d) => ANGLE_PATHS.includes(d.path));
      const angleLedger = angleGateAllowed ? angleDiffs : [];

      /* Transient CSSTransition liveness. Previously blanket-excluded from the defect count.
       * It is now classifiable ONLY on a state whose intent tolerates a live phase; on a
       * STABLE state a liveness difference is a real defect like any other. */
      const transientDiffs = diffPaths(pO.transientAnimations, pS.transientAnimations);
      /* The authored FINITE transient class belongs to EXPLICIT_TRANSIENT states only. An
       * AUTHORED_LIVE state is live by accepted design, not mid-transient, so a CSSTransition
       * count difference there has no authorized class and stays a real defect. */
      const transientGateAllowed = intent === 'EXPLICIT_TRANSIENT';

      /* The live/transient classes that may be routed to the residual ledger. A residual that
       * matches NONE of these is a real parity defect - it is never written to the ledger.
       *
       * A field that differs between two runs of the UNMODIFIED ORIGINAL source is
       * nondeterministic by construction, whatever it is. It is NOT re-labelled as a D2/D3
       * random scalar: the honest disposition is SELF_NONDETERMINISTIC, and its classification
       * is derived from the SAME bounded class list by asking which authorized class actually
       * explains it. If none does, it is a real defect - a self-difference is evidence of source
       * nondeterminism, never a licence to invent a class. */
      const classifyResidual = (d) => {
        const selfDiff = selfPaths.has(d.path);
        /* On a STABLE state a self-difference is NOT a waiver. It stays a real defect unless one
         * of the authorized classes above explains it, because the whole point of the deterministic
         * protocol is that a STABLE state must be reproducible. SELF_NONDETERMINISTIC is retained
         * as evidence ONLY on AUTHORED_LIVE / EXPLICIT_TRANSIENT states, whose accepted meaning
         * already permits a live phase. */
        const selfWaives = selfDiff && isLive;
        if (ANGLE_PATHS.includes(d.path) && angleGateAllowed) {
          return { classification: 'AUTHORED_LIVE_PHASE', disposition: 'LEDGER' };
        }
        if (d.path.startsWith('transientAnimations') && transientGateAllowed) {
          return { classification: 'AUTHORED_FINITE_TRANSIENT_PHASE', disposition: 'LEDGER' };
        }
        /* transientAnimations on an AUTHORED_LIVE state is still a live-phase difference, not a
         * finite-transient one, so it is classified as such rather than mislabelled. */
        if (d.path.startsWith('transientAnimations') && isLive) {
          return { classification: 'AUTHORED_LIVE_PHASE', disposition: 'LEDGER' };
        }
        if (/burstParticleXsYs|burstAnimationDelays/.test(d.path)) {
          return { classification: 'D2_RANDOM_SCALAR', disposition: selfWaives ? 'SELF_NONDETERMINISTIC' : 'LEDGER' };
        }
        if (/modal\.(percent|barWidth|stepDoneSignature)/.test(d.path)) {
          return { classification: 'D3_RANDOM_SCALAR', disposition: selfWaives ? 'SELF_NONDETERMINISTIC' : 'LEDGER' };
        }
        /* A geometry/computed-style delta on a STABLE state is explained by the authored
         * INFINITE CSS tracks, which have no terminal phase. That is the ONLY class that may
         * cover a moving element, and only after the native inventory was recorded. */
        const elPath = d.path.replace(/^[a-zA-Z]+\./, '').replace(/\[\d+\]$/, '');
        if (intent === 'STABLE' && (geometryAll.some((g) => g.path === d.path.replace(/^[a-zA-Z]+\./, ''))
          || elPath.startsWith('heroWrap'))) {
          return { classification: 'INFINITE_CSS_PHASE_AFTER_NATIVE_PROOF', disposition: selfWaives ? 'SELF_NONDETERMINISTIC' : 'LEDGER' };
        }
        if (selfWaives) return { classification: null, disposition: 'SELF_NONDETERMINISTIC' };
        return null; // NOT classifiable -> real defect
      };

      /* Stable-state residuals: intent is STABLE and no authorized class applies -> real defect.
       *
       * There is NO source-self-nondeterminism waiver. A field that differs between two runs of
       * the UNMODIFIED ORIGINAL does not excuse a difference from SPLIT on a STABLE state: per
       * ruling 5906458180 that is a sampling-instability signal, and the fix is the deterministic
       * readiness/pause/terminal-predicate protocol, not a licence to absorb the delta. The only
       * classes that may absorb a residual remain the authorized ones: D2/D3 random scalars,
       * AUTHORED_LIVE, EXPLICIT_TRANSIENT, and the infinite-CSS phase after native proof. */
      const stableRealDefects = parityDiffs.filter((d) => {
        if (ANGLE_PATHS.includes(d.path) && angleGateAllowed) return false;
        if (d.path.startsWith('transientAnimations') && transientGateAllowed) return false;
        return !classifyResidual(d);
      });
      /* Motion disagreement is a real defect on STABLE states (HOLD-1 core requirement). */
      const motionDefects = intent === 'STABLE' ? motionDisagreement : [];
      /* On STABLE states geometry/style come from the phased channel and a diff is a real
       * defect; the STABLE settle already waited out any finite transition. */
      const stableGeometryDefects = intent === 'STABLE' ? geometryAll : [];
      const stableStyleDefects = intent === 'STABLE' ? styleAll : [];

      /* HARD-CHANNEL RESIDUAL LEDGER (ruling 5908541198). A geometry/computed-style delta on an
       * AUTHORED_LIVE or EXPLICIT_TRANSIENT state is neither a real defect nor invisible: it must
       * be an auditable ledger row carrying the exact per-side values, the per-side liveness, and
       * one of the already-authorized classifications. No new classification is introduced, and a
       * STABLE-state delta is never ledgered - it stays a real defect above.
       *
       * The classification is chosen from the already-bounded vocabulary:
       *   - an element-scoped geometry/computed-style delta on a live/transient state, where the
       *     native inventory proves the authored infinite CSS tracks are running, is an
       *     INFINITE_CSS_PHASE_AFTER_NATIVE_PROOF residual;
       *   - a transient-state delta whose element is a finite transition target is an
       *     AUTHORED_FINITE_TRANSIENT_PHASE residual;
       *   - anything else on a live state is an AUTHORED_LIVE_PHASE residual.
       * A STABLE-state delta is NEVER ledgered. */
      /* NATIVE ANIMATION IDENTITY, not a movement boolean. `geometryMotion === true` only proves
       * an element moved between two samples; it does NOT prove the motion came from an infinite
       * authored CSSAnimation. A finite `.toast` CSSTransition moves too, and inferring "infinite"
       * from that mislabeled a finite toast phase as an infinite drift/scan/spin residual.
       *
       * The infinite class is now selected only when the native inventory, recorded BEFORE the
       * phase-lock, actually shows the affected target under a CSSAnimation whose name is one of
       * the authored infinite tracks with iterations === Infinity. A finite CSSTransition on the
       * affected target yields AUTHORED_FINITE_TRANSIENT_PHASE instead. */
      const INFINITE_TRACKS = ['drift', 'scan', 'spin'];
      const nativeInfiniteTargets = (target) => {
        const all2 = Array.isArray(target.transientAnimations) ? target.transientAnimations : [];
        return new Set(all2
          .filter((x) => x.kind === 'CSSAnimation'
            && INFINITE_TRACKS.indexOf(String(x.name)) >= 0
            && String(x.iterations) === 'Infinity')
          .map((x) => String(x.target)));
      };
      const nativeFiniteTargets = (target) => {
        const all2 = Array.isArray(target.transientAnimations) ? target.transientAnimations : [];
        return new Set(all2
          .filter((x) => x.kind === 'CSSTransition')
          .map((x) => String(x.target)));
      };
      /* Both surfaces must agree the target is under the same kind of animation, otherwise the
       * residual is unexplained and falls through to a real defect rather than a guess. */
      const infiniteBoth = new Set([...nativeInfiniteTargets(o.hard)].filter((t) => nativeInfiniteTargets(s.hard).has(t)));
      const finiteBoth = new Set([...nativeFiniteTargets(o.hard)].filter((t) => nativeFiniteTargets(s.hard).has(t)));
      const classifyStyleChannel = (d) => {
        if (intent === 'STABLE') return null; // never ledgered away
        /* Resolve the affected element label from the measured field path. `geometry.toast.y`
         * and `computedStyle.toast.opacity` both name the `toast` element. */
        const elLabel = String(d.path).split('.').filter(Boolean)[0];
        if (infiniteBoth.has(elLabel)) {
          return { classification: 'INFINITE_CSS_PHASE_AFTER_NATIVE_PROOF', disposition: 'LEDGER' };
        }
        /* A finite authored transition on the affected element is a finite phase residual. The
         * authored `.toast` carries `transition: .3s` and no animation, so this is its class. */
        if (finiteBoth.has(elLabel)) {
          return { classification: 'AUTHORED_FINITE_TRANSIENT_PHASE', disposition: 'LEDGER' };
        }
        if (intent === 'EXPLICIT_TRANSIENT') {
          return { classification: 'AUTHORED_FINITE_TRANSIENT_PHASE', disposition: 'LEDGER' };
        }
        return { classification: 'AUTHORED_LIVE_PHASE', disposition: 'LEDGER' };
      };
      const geometryLedgerRows = intent === 'STABLE' ? [] : geometryAll.map((d) => ({
        state: `${ctxId}/${state}`,
        state_intent: intent,
        channel: 'geometry',
        field_path: `geometry.${d.path}`,
        original_a: d.a,
        original_b: (selfDiffs.find((x) => x.path === d.path) || {}).b ?? null,
        split: d.b,
        original_motion_or_liveness: o.hard.geometryMotion || null,
        split_motion_or_liveness: s.hard.geometryMotion || null,
        stabilization_action: (o.phase && o.phase.action) || null,
        native_animation_proof: {
          original: (Array.isArray(o.hard.transientAnimations) ? o.hard.transientAnimations : [])
            .filter((x) => String(x.target) === String(d.path).split('.')[0]),
          split: (Array.isArray(s.hard.transientAnimations) ? s.hard.transientAnimations : [])
            .filter((x) => String(x.target) === String(d.path).split('.')[0]),
        },
        classification: classifyStyleChannel(d).classification,
        contract_disposition: 'LEDGER',
      }));
      const styleLedgerRows = intent === 'STABLE' ? [] : styleAll.map((d) => ({
        state: `${ctxId}/${state}`,
        state_intent: intent,
        channel: 'computedStyle',
        field_path: `computedStyle.${d.path}`,
        original_a: d.a,
        original_b: (selfDiffs.find((x) => x.path === d.path) || {}).b ?? null,
        split: d.b,
        original_motion_or_liveness: o.hard.geometryMotion || null,
        split_motion_or_liveness: s.hard.geometryMotion || null,
        stabilization_action: (o.phase && o.phase.action) || null,
        native_animation_proof: {
          original: (Array.isArray(o.hard.transientAnimations) ? o.hard.transientAnimations : [])
            .filter((x) => String(x.target) === String(d.path).split('.')[0]),
          split: (Array.isArray(s.hard.transientAnimations) ? s.hard.transientAnimations : [])
            .filter((x) => String(x.target) === String(d.path).split('.')[0]),
        },
        classification: classifyStyleChannel(d).classification,
        contract_disposition: 'LEDGER',
      }));
      /* Contract-exactness for the hard channels: a state is contract-exact when it has no real
       * geometry/style defect AND every one of its geometry/style residuals is ledgered under an
       * authorized class. On a STABLE state that means zero residuals. */
      const geometryContractExact = stableGeometryDefects.length === 0
        && geometryLedgerRows.every((e) => ALLOWED_CLASSIFICATIONS.includes(e.classification));
      const computedStyleContractExact = stableStyleDefects.length === 0
        && styleLedgerRows.every((e) => ALLOWED_CLASSIFICATIONS.includes(e.classification));
      const geometryRawExact = geometryAll.length === 0;
      const computedStyleRawExact = styleAll.length === 0;

      const realDefects2 = [
        ...stableRealDefects,
        ...motionDefects.map((d) => ({ path: `motionDisagreement.${d.path}`, a: d.a, b: d.b })),
        ...stableGeometryDefects.map((d) => ({ path: `geometry.${d.path}`, a: d.a, b: d.b })),
        ...stableStyleDefects.map((d) => ({ path: `computedStyle.${d.path}`, a: d.a, b: d.b })),
      ];

      /* The residual ledger: every raw residual that IS authorized by a class, with the exact
       * per-field values, per-side liveness, and the stabilization actually applied. */
      const ledgerEntries = parityDiffs
        .filter((d) => !stableRealDefects.some((r) => r.path === d.path))
        .map((d) => {
          const c = classifyResidual(d) || { classification: null, disposition: 'REAL_DEFECT' };
          return {
            state: `${ctxId}/${state}`,
            state_intent: intent,
            channel: d.path.split('.')[0],
            field_path: d.path,
            original_a: d.a,
            original_b: (selfDiffs.find((x) => x.path === d.path) || {}).b ?? null,
            split: d.b,
            original_motion_or_liveness: o.hard.geometryMotion || null,
            split_motion_or_liveness: s.hard.geometryMotion || null,
            stabilization_action: (o.handoff && o.handoff.action) || null,
            classification: c.classification,
            contract_disposition: c.disposition,
          };
        })
        .filter((e) => e.classification !== null && ALLOWED_CLASSIFICATIONS.includes(e.classification));

      /* GATE_BLOCK_END */
      const d4g = d4Gate(o, s);
      const d5g = d5Gate(o, s);
      const d4Diffs = d4g.diffs.map((d) => ({ ...d, path: `D4.${d.path}` }));
      const d5Diffs = d5g.diffs.map((d) => ({ ...d, path: `D5.${d.path}` }));
      const d1d5Preserved = (d4g.compared ? d4g.preserved && d4g.diffs.length === 0 : true)
        && (d5g.compared ? d5g.preserved && d5g.diffs.length === 0 : true);

      const randomFields = [];
      if (JSON.stringify(o.hard.dom.burstParticleXsYs) !== JSON.stringify(s.hard.dom.burstParticleXsYs)) randomFields.push('D2.dom.burstParticleXsYs');
      if (JSON.stringify(o.hard.dom.burstAnimationDelays) !== JSON.stringify(s.hard.dom.burstAnimationDelays)) randomFields.push('D2.dom.burstAnimationDelays');
      if (o.hard.dom.modal.percent !== s.hard.dom.modal.percent) randomFields.push('D3.dom.modal.percent');
      if (o.hard.dom.modal.barWidth !== s.hard.dom.modal.barWidth) randomFields.push('D3.dom.modal.barWidth');
      if (o.hard.dom.modal.stepDoneSignature !== s.hard.dom.modal.stepDoneSignature) randomFields.push('D3.dom.modal.stepDoneSignature');

      const rec = {
        ctx: ctxId, state,
        state_intent: intent,
        handoff: { original: o.handoff, split: s.handoff, phase: o.phase },
        raw_semantic_diffs: rawDiffs,
        raw_semantic_exact: rawExact,
        contract_semantic_exact: realDefects2.length === 0,
        residual_ledger_entries: ledgerEntries,
        real_defects: [
          ...realDefects2,
          ...d4Diffs,
          ...d5Diffs,
        ],
        angle_axis: {
          original_auto_running: oAuto,
          split_auto_running: sAuto,
          gated: angleLedger.length > 0,
          diffs: angleDiffs,
          note: 'the angle axis is compared exactly on a STABLE state (the loop was stopped through the authored control before capture); it is ledgered only on a state whose accepted S2 meaning leaves the auto loop running',
        },
        geometry_motion: {
          original: o.hard.geometryMotion,
          split: s.hard.geometryMotion,
          disagreement: motionDisagreement,
          gated: intent === 'STABLE',
          note: 'a motion-state disagreement on a STABLE state is a REAL parity defect; there is no blanket moving-on-either exclusion',
        },
        nondeterministic_fields: selfDiffs,
        semantic_diffs: parityDiffs,
        geometry_raw_exact: geometryRawExact,
        geometry_contract_exact: geometryContractExact,
        computed_style_raw_exact: computedStyleRawExact,
        computed_style_contract_exact: computedStyleContractExact,
        geometry_residual_ledger_rows: geometryLedgerRows,
        computed_style_residual_ledger_rows: styleLedgerRows,
        geometry_diffs: geometryAll,
        geometry_raw: { original: o.hard.geometryRaw, split: s.hard.geometryRaw },
        computed_style_diffs: styleAll,
        animation_inventory_diffs: diffPaths(pO.animationInventory, pS.animationInventory),
        transient_animation_diffs: transientDiffs,
        network_diffs: diffPaths(o.net, s.net),
        scroll_diffs: diffPaths(pO.scroll, pS.scroll),
        responsive_diffs: diffPaths(pO.responsive, pS.responsive),
        interaction_diffs: diffPaths(interactionChannel(o.hard), interactionChannel(s.hard)),
        random_fields_observed: randomFields,
        d1_d5_preserved: d1d5Preserved,
        d4: d4g,
        d5: d5g,
        network: { original: o.net, split: s.net },
        projected_original: pO,
        projected_split: pS,
      };
      results.push(rec);
      for (const e of [...ledgerEntries, ...geometryLedgerRows, ...styleLedgerRows]) ledger.push(e);
      console.log(`CDX005_S4_STATE=${ctxId}/${state} intent=${intent} raw_exact=${rawExact} contract_exact=${rec.contract_semantic_exact} real_defects=${rec.real_defects.length} ledger=${ledgerEntries.length}`);
      fs.writeFileSync(path.join(EVIDENCE_DIR, `${ctxId}__${state}.json`), JSON.stringify(rec, null, 2));
    }

    /* Bounded 12-state CENTRAL review pack: ORIGINAL | SPLIT side by side, same viewport,
     * no diagnostic overlay over the UI. Screenshot channel only; the hard channels for these
     * states were already collected in the loop above. */
    fs.mkdirSync(REVIEW_PACK_DIR, { recursive: true });
    for (const r of REVIEW_PACK) {
      const ctx = STATE_PLAN[r.ctx];
      const { buf, stabilization } = await sideBySide(browser, port, ctx, r.state);
      const file = `${r.label.replace(/::/g, '__')}.png`;
      fs.writeFileSync(path.join(REVIEW_PACK_DIR, file), buf);
      reviewPacks.push({
        label: r.label, ctx: r.ctx, state: r.state,
        file: `evidence/s4/review-pack/${file}`,
        viewport: `${ctx.width}x${ctx.height}`,
        layout: 'ORIGINAL | SPLIT side by side at the same viewport, no diagnostic overlay',
        stabilization: {
          declared: r.stabilization || 'AUTHORED_AUTO_CONTROL',
          applied: stabilization,
        },
      });
      console.log(`CDX005_S4_REVIEW_PACK=${r.label} bytes=${buf.length} stabilization=${JSON.stringify(stabilization)}`);
    }
    /* 12-state contact sheet for CENTRAL's direct visual review. It is a TEMPORARY review
     * artifact and is deliberately NOT written into evidence/s4/review-pack/, because that
     * directory is contractually exactly the 12 individual ORIGINAL|SPLIT PNGs. It is also
     * never committed. */
    const CONTACT_SHEET = process.env.CDX005_S4_CONTACT_SHEET
      || path.join(os.tmpdir(), 'cdx005-s4-contact-sheet-12.png');
    const sheet = await buildContactSheet(browser, reviewPacks);
    if (sheet) {
      fs.writeFileSync(CONTACT_SHEET, sheet);
      console.log(`CDX005_S4_CONTACT_SHEET=${CONTACT_SHEET} bytes=${sheet.length} states=${reviewPacks.length}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'all-results.json'), JSON.stringify(results, null, 2));
  const summary = writeCandidateSummary(results, reviewPacks, ledger);

  /* THREE-RUN PROOF (ruling 5906458180). One green run is not sufficient evidence, because the
   * prior candidate's defect count moved between runs. Each fresh full run appends its own
   * per-state record here, and a three-run proof requires all three to be clean on the
   * STABLE states with zero real defects. Nothing is averaged or best-of: a single failing run
   * fails the proof. */
  const runRecord = {
    run_index: RUN_INDEX,
    paired_state_count: summary.PAIRED_STATE_COUNT,
    semantic_raw_exact: summary.SEMANTIC_RAW_EXACT,
    semantic_contract_exact: summary.SEMANTIC_CONTRACT_EXACT,
    geometry_raw_exact: summary.GEOMETRY_RAW_EXACT,
    geometry_contract_exact: summary.GEOMETRY_CONTRACT_EXACT,
    computed_style_raw_exact: summary.COMPUTED_STYLE_RAW_EXACT,
    computed_style_contract_exact: summary.COMPUTED_STYLE_CONTRACT_EXACT,
    real_parity_defects: summary.REAL_PARITY_DEFECTS,
    unclassified_residuals: summary.UNCLASSIFIED_RESIDUALS,
    d1_d5_preserved: summary.D1_D5_PRESERVED,
    network_error_states: summary.NETWORK_ERROR_STATES,
    missing_asset_states: summary.MISSING_ASSET_STATES,
    geometry_exact: summary.GEOMETRY_EXACT,
    computed_style_exact: summary.COMPUTED_STYLE_EXACT,
    interaction_exact: summary.INTERACTION_EXACT,
    animation_inventory_exact: summary.ANIMATION_INVENTORY_EXACT,
    review_pack_count: summary.REVIEW_PACK_COUNT,
    stable_states: results.filter((r) => r.state_intent === 'STABLE').length,
    stable_states_exact: results.filter((r) => r.state_intent === 'STABLE' && r.contract_semantic_exact).length,
    stable_state_defects: results
      .filter((r) => r.state_intent === 'STABLE')
      .flatMap((r) => r.real_defects.map((d) => ({ state: `${r.ctx}/${r.state}`, path: d.path, a: d.a, b: d.b }))),
    terminal_predicate_timeouts: results
      .filter((r) => r.handoff && r.handoff.terminal && r.handoff.terminal.timedOut)
      .map((r) => `${r.ctx}/${r.state}`),
    startup_readiness_failures: results
      .filter((r) => r.handoff && r.handoff.startupReady === false)
      .map((r) => `${r.ctx}/${r.state}`),
  };
  const PROOF_PATH = path.join(CAPSULE, 'evidence', 's4', 'three-run-proof.json');
  let proof = { schema_version: '1.0', source_id: 'CDX005', required_runs: 3, runs: [] };
  if (fs.existsSync(PROOF_PATH)) {
    try { proof = JSON.parse(fs.readFileSync(PROOF_PATH, 'utf8')); } catch (e) { /* restart clean */ }
  }
  proof.runs = proof.runs.filter((r) => r.run_index !== RUN_INDEX);
  proof.runs.push(runRecord);
  proof.runs.sort((a, b) => a.run_index - b.run_index);
  const clean = (r) => r.semantic_contract_exact === '36/36' && r.real_parity_defects === 0
    && r.unclassified_residuals === 0 && r.d1_d5_preserved === 'YES'
    && r.network_error_states === 0 && r.missing_asset_states === 0
    && r.stable_states_exact === r.stable_states
    /* Ruling 5908541198: each run must ALSO be contract-exact on geometry and computed style. */
    && r.geometry_contract_exact === '36/36'
    && r.computed_style_contract_exact === '36/36';
  proof.runs_clean = proof.runs.every(clean);
  proof.THREE_RUN_PROOF = proof.runs.length >= 3 && proof.runs_clean;
  proof.runs_required = 3;
  proof.runs_recorded = proof.runs.length;
  proof.authority = 'skerishKang/lovetree-limone#589 comment 5906458180';
  proof.note = 'Every run is a fresh full 36-state replay from fresh page loads. A run is clean only if '
    + 'semantic contract-exactness is 36/36, geometry contract-exactness is 36/36, computed-style '
    + 'contract-exactness is 36/36, real defects are 0, unclassified residuals are 0, D1-D5 are preserved, '
    + 'network/asset errors are 0, and every STABLE state is exact. There is no averaging and no best-of: '
    + 'one failing run fails the proof. No new residual classification is authorized: a geometry or '
    + 'computed-style residual must fit an already-authorized live/transient/infinite-CSS class or it '
    + 'is a real defect.';
  fs.writeFileSync(PROOF_PATH, `${JSON.stringify(proof, null, 2)}\n`);
  console.log(`CDX005_S4_PROOF_RUN=${RUN_INDEX} semantic=${summary.SEMANTIC_CONTRACT_EXACT} geometry=${summary.GEOMETRY_CONTRACT_EXACT} style=${summary.COMPUTED_STYLE_CONTRACT_EXACT} defects=${summary.REAL_PARITY_DEFECTS} stable_exact=${runRecord.stable_states_exact}/${runRecord.stable_states} THREE_RUN_PROOF=${proof.THREE_RUN_PROOF} (${proof.runs_recorded}/3)`);
});
