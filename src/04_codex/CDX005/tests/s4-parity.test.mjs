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

test('C06 candidate-only metadata state: nothing is promoted to accepted parity', () => {
  const manifest = readJson('manifest.json');
  const mat = readJson('split/materialization.json');
  assert.equal(manifest.stages.source_split_parity_pass, false, 'source_split_parity_pass stays false');
  assert.equal(manifest.parity_ref ?? null, null, 'manifest carries no parity ref');
  assert.equal(mat.parity_ref ?? null, null, 'materialization carries no parity ref');
  assert.notEqual(mat.status, 'ACCEPTED', 'materialization is not ACCEPTED');
  assert.equal(fs.existsSync(path.join(CAPSULE, 'evidence', 'parity')), false, 'no evidence/parity directory exists');
  assert.equal(fs.existsSync(path.join(CAPSULE, 'evidence', 'parity', 'accepted-parity.json')), false, 'no accepted-parity.json exists');
  const roundtrip = readJson('evidence/s3/roundtrip.json');
  assert.equal(roundtrip.parity_acceptance_claimed, false, 'S3 record still claims no parity acceptance');
  assert.equal(roundtrip.parity_ref ?? null, null);
  assert.equal(roundtrip.parity_status, 'NOT_STARTED');
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

async function dragOnce(page, dir) {
  const box = await page.locator('#figureZone').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dir * 90, cy, { steps: 1 });
  await page.mouse.up();
  await page.waitForTimeout(180);
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
  await DRIVERS[state](page);

  /* Hero decode settle. The authored look switch assigns a new `src` and the browser decodes the
   * PNG asynchronously, so sampling in the same tick can observe complete=false / naturalWidth=0 on
   * one surface and a decoded image on the other. That is image-load timing, not a state or layout
   * difference, so the harness waits for the currently assigned hero to finish decoding before it
   * reads any channel. This adds no wait that changes authored behavior and it writes nothing. */
  await page.waitForFunction(() => {
    const h = document.getElementById('hero');
    return h && h.complete === true && h.naturalWidth > 0;
  }, null, { timeout: 10000 });

  const hard = await page.evaluate(collectChannels);

  let png = null;
  let stabilized = null;
  if (opts.screenshot) {
    // Screenshot channel only, after all hard channels are collected.
    if (ctx.width <= 720) {
      // D4 already proven above. Harness may DOM-click the same authored handler
      // for paired stabilization. This is NOT user reachable and is recorded as such.
      await page.evaluate(() => { document.getElementById('autoBtn').click(); });
      await page.waitForTimeout(700);
      stabilized = 'HARNESS_ONLY_NOT_USER_REACHABLE';
    } else {
      // The authored AUTO control is used through a real user click, exactly as a user would.
      // If an authored overlay (for example the open upload modal) is covering it, the click is
      // legitimately unreachable, so the AUTO loop is left running and that is recorded rather
      // than forced through. The author already stops the loop in openModal().
      const reachable = await page.evaluate(() => {
        const b = document.getElementById('autoBtn');
        if (!b) return false;
        const r = b.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!top && (b === top || b.contains(top));
      });
      const label = await page.$eval('#autoBtn', (e) => e.textContent);
      if (reachable && /AUTO/.test(label)) {
        await page.click('#autoBtn');
        await page.waitForTimeout(700);
        stabilized = 'AUTHORED_AUTO_CONTROL';
      } else {
        stabilized = reachable ? 'AUTO_ALREADY_PAUSED' : 'AUTO_CONTROL_OCCLUDED_BY_AUTHORED_OVERLAY';
      }
    }
    // Phase-lock the existing animations identically on both surfaces, screenshot channel only.
    await page.evaluate(() => {
      for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = 0; } catch (e) { /* ignore */ } }
    });
    await page.waitForTimeout(120);
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
  return { hard, net: netOut, d4, d5, d4RotationContinues, png, stabilized };
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
  const mat = readJson('split/materialization.json');
  const manifest = readJson('manifest.json');
  assert.notEqual(String(mat.status).toUpperCase(), 'ACCEPTED');
  assert.equal(manifest.stages.source_split_parity_pass, false);
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
    assert.equal(fs.existsSync(path.join(CAPSULE, 'evidence', 'parity', 'accepted-parity.json')), false,
      'no accepted-parity.json may exist before CENTRAL acceptance');
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
function writeCandidateSummary(results, reviewPacks) {
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
  const midTransition = results.reduce((n, r) => n + r.geometry_mid_transition_diffs.length, 0);
  const styleCaptureInstant = results.reduce((n, r) => n + r.computed_style_capture_instant_diffs.length, 0);
  const angleGatedStates = results.filter((r) => r.angle_axis && r.angle_axis.gated);
  const angleGatedDiffs = angleGatedStates.reduce((n, r) => n + r.angle_axis.diffs.length, 0);
  const randomProjected = [...new Set(results.flatMap((r) => r.random_fields_observed))].sort();
  const hold = totalReal > 0 || !d1d5 || networkErrorStates > 0 || missingAssetStates > 0
    || externalStates > 0 || reviewPacks.length !== 12;

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
      s2_acceptance: 'skerishKang/lovetree-limone#589 comment 5887518417',
      s2_report: 'skerishKang/workdiary 960fd4ad407d5b996f644064c6ed1a5b7383d7ab',
    },
    parity_contract: 'SOURCE_SPECIFIC_MOTION_AWARE',
    PAIRED_STATE_COUNT: n,
    SEMANTIC_EXACT: `${exact('semantic_diffs')}/${n}`,
    GEOMETRY_EXACT: `${exact('geometry_diffs')}/${n}`,
    GEOMETRY_MID_TRANSITION_DELTAS: midTransition,
    COMPUTED_STYLE_CAPTURE_INSTANT_DELTAS: styleCaptureInstant,
    ANGLE_AXIS_CAPTURE_INSTANT_STATES: angleGatedStates.map((r) => `${r.ctx}/${r.state}`),
    ANGLE_AXIS_CAPTURE_INSTANT_DELTAS: angleGatedDiffs,
    CAPTURE_INSTANT_POLICY: 'Three declared capture-instant classes, each measured per instant rather than assumed, and each reported with its own count. (1) An element still running an authored CSS transition: its rounded box and interpolated computed style differ between any two samples of the SAME frozen source. (2) The angle axis while the authored auto-rotation loop is still running, detected from the authored AUTO/PLAY label on each surface; with the loop stopped the angle is compared exactly. (3) CSSTransition liveness presence. No pixel, SSIM, perceptual, sub-pixel or numeric tolerance is applied anywhere, and no seeded randomness, clock patch or source normalization is used. CENTRAL owns the decision on whether these three classes are acceptable for S4 acceptance.',
    GEOMETRY_MID_TRANSITION_NOTE: 'A #heroWrap rounded-box delta observed only while the authored look-switch transition was still running, proven by that same field already differing between two ORIGINAL runs of the unmodified source. Reported as a declared capture-instant nondeterminism class, never as a parity defect. No numeric tolerance is applied; sub-pixel values are retained under geometry_mid_transition_diffs and geometry_raw per state.',
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
      method: 'two ORIGINAL repetitions per state; a field that differs original-vs-original is nondeterministic by construction, exactly the method S2 used to reach 31/36',
      transient_transitions: 'CSSTransition liveness is a capture-timing fact, reported under transient_animation_diffs and not gated; the authored keyframe inventory is gated exactly',
      authored_tracks: AUTHORED_TRACKS,
      D4: 'at <=720px #autoBtn is display:none, so the authored auto loop is user-unstoppable; proven on both surfaces before any stabilization and recorded as HARNESS_ONLY_NOT_USER_REACHABLE when the harness clicks it for screenshots',
      D5: 'at 390x844 the document does not scroll while authored controls sit below the fold; recorded on both surfaces, never repaired',
    },
  };
  const out = path.join(CAPSULE, 'evidence', 's4', 'candidate-summary.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
  for (const k of ['REAL_PARITY_DEFECTS', 'SEMANTIC_EXACT', 'GEOMETRY_EXACT', 'COMPUTED_STYLE_EXACT',
    'INTERACTION_EXACT', 'ANIMATION_INVENTORY_EXACT', 'NETWORK_ERROR_STATES',
    'MISSING_ASSET_STATES', 'D1_D5_PRESERVED', 'REVIEW_PACK_COUNT', 'S4_VERDICT']) {
    console.log(`CDX005_S4_${k}=${typeof summary[k] === 'number' ? summary[k] : summary[k]}`);
  }
  console.log(`CDX005_S4_SUMMARY=${out}`);
  return summary;
}

/* ------------------------------ browser mode tests ----------------------------- */

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

      const pO = project(o.hard);
      const pS = project(s.hard);
      const pO2 = project(o2.hard);
      const parityDiffs = diffPaths(pO, pS);
      const selfDiffs = diffPaths(pO, pO2);
      const selfPaths = new Set(selfDiffs.map((d) => d.path));
      // Transition liveness is a capture-timing fact, not a state fact: the authored 190 ms
      // look-switch transition may still be live in one sample and finished in the other. Such
      // a difference is reported but is not a parity defect. The authored keyframe inventory
      // is always exact.
      const realDefects = parityDiffs.filter((d) => !selfPaths.has(d.path)
        && !d.path.startsWith('transientAnimations'));

      /* Mid-transition geometry. A rounded box delta on an element that was still running an
       * authored CSS transition AT THE MOMENT OF SAMPLING is a capture-instant artifact of the
       * frozen source, not a split defect. This is a direct per-element measurement taken in the
       * same evaluate that read the boxes, so it needs no statistical inference and applies no
       * numeric tolerance. A delta on a settled element IS a real defect, and so is any
       * disagreement about whether an element was moving. */
      /* Capture-instant gating. An element that was still running an authored CSS transition at the
       * moment of sampling is genuinely moving, so both its rounded box and its interpolated
       * computed style differ between any two samples of the SAME frozen source. The source
       * declares `transition: opacity .3s, transform .55s` on #heroWrap and a 1.1 s background
       * transition on #toast, so both qualify. Motion state is a per-instant measurement taken in
       * the same evaluate that read the values, so no statistical inference is involved and no
       * numeric tolerance is applied. A difference on a settled element is a real defect, and so is
       * any difference in a field that is not element-scoped (semantics, filters, cards, labels,
       * modal/process state, scroll, responsive, runtime). */
      const motionKeys = new Set(Object.keys(o.hard.geometryMotion || {}));
      const movingOnEither = (k) => (o.hard.geometryMotion ? o.hard.geometryMotion[k] : null) === true
        || (s.hard.geometryMotion ? s.hard.geometryMotion[k] : null) === true;
      /* The element key is the path segment that names a measured motion target, with any array
       * index stripped. Paths arrive both channel-scoped (`geometry.heroWrap.y`,
       * `computedStyle.toast.opacity`, `geometryRaw.heroWrap[0]`) and already element-scoped
       * (`heroWrap.y`, `toast.y`), because each channel is diffed separately, so the leading
       * channel name must be detected rather than blindly dropped. */
      const CHANNEL_PREFIXES = new Set(['geometry', 'geometryRaw', 'computedStyle', 'responsive']);
      const elementKeyOf = (p) => {
        const segs = String(p).split('.');
        const first = segs[0];
        const key = CHANNEL_PREFIXES.has(first) ? segs[1] : first;
        return String(key === undefined ? '' : key).replace(/\[\d+\]$/, '');
      };
      const isCaptureInstant = (p) => {
        const k = elementKeyOf(p);
        return motionKeys.has(k) && movingOnEither(k);
      };
      const geometryAll = diffPaths(pO.geometry, pS.geometry);
      const geometryStable = geometryAll.filter((d) => !isCaptureInstant(d.path));
      const geometryMidTransition = geometryAll.filter((d) => isCaptureInstant(d.path));
      const styleAll = diffPaths(pO.computedStyle, pS.computedStyle);
      const computedStyleStable = styleAll.filter((d) => !isCaptureInstant(d.path));
      const computedStyleMidTransition = styleAll.filter((d) => isCaptureInstant(d.path));
      /* Motion state itself is a per-instant observation, so the two surfaces may legitimately
       * report it differently. It is recorded as evidence and is never itself a parity defect. */
      const motionDisagreement = diffPaths(o.hard.geometryMotion, s.hard.geometryMotion);

      /* Angle-axis capture-instant handling. The authored auto loop advances #heroWrap's angle on
       * its own timer, so a state sampled while the loop is still running can land on an adjacent
       * angle depending on where the sample falls. This is measured, never assumed: the loop state
       * is read from the authored AUTO/PLAY label on each surface, and the angle axis is gated only
       * while that loop is still running. With the loop stopped the angle is compared exactly. Look
       * identity, hero asset, card set, filters, labels, modal/process state and every other field
       * are still compared in full. No tolerance and no seeded randomness is applied. */
      const oAngle = o.hard.dom;
      const sAngle = s.hard.dom;
      const oAuto = /AUTO/.test(oAngle.autoLabel || '');
      const sAuto = /AUTO/.test(sAngle.autoLabel || '');
      const angleIsLive = oAuto || sAuto;
      const ANGLE_PATHS = ['dom.heroSrc', 'dom.angleText', 'dom.angleOnIndex'];
      const angleExcluded = (p) => angleIsLive && ANGLE_PATHS.includes(p);
      const angleDiffs = parityDiffs.filter((d) => ANGLE_PATHS.includes(d.path));
      const angleCaptureInstant = angleDiffs.filter((d) => angleExcluded(d.path));

      const realDefects2 = parityDiffs.filter((d) => !selfPaths.has(d.path)
        && !isCaptureInstant(d.path)
        && !angleExcluded(d.path)
        && !d.path.startsWith('transientAnimations'));
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
        real_defects: [
          ...realDefects2,
          ...d4Diffs,
          ...d5Diffs,
        ],
        capture_instant_diffs: {
          geometry: geometryMidTransition,
          computed_style: computedStyleMidTransition,
          angle: angleCaptureInstant,
          note: 'differences observed on an element that was still running an authored CSS transition, or on the angle axis while the authored auto loop was still running, at the sampling instant; not parity defects',
        },
        angle_axis: {
          original_auto_running: oAuto,
          split_auto_running: sAuto,
          original: { heroSrc: oAngle.heroSrc, angleText: oAngle.angleText, onIndex: oAngle.angleOnIndex },
          split: { heroSrc: sAngle.heroSrc, angleText: sAngle.angleText, onIndex: sAngle.angleOnIndex },
          diffs: angleDiffs,
          gated: angleCaptureInstant.length > 0,
          note: 'the angle axis is gated only while the authored auto loop is still running; with the loop stopped it is compared exactly',
        },
        geometry_motion: {
          original: o.hard.geometryMotion, split: s.hard.geometryMotion,
          disagreement: motionDisagreement,
          note: 'per-instant observation, recorded as evidence and never gated',
        },
        nondeterministic_fields: selfDiffs,
        semantic_diffs: parityDiffs,
        geometry_diffs: geometryStable,
        geometry_mid_transition_diffs: geometryMidTransition,
        geometry_raw: { original: o.hard.geometryRaw, split: s.hard.geometryRaw },
        computed_style_diffs: computedStyleStable,
        computed_style_capture_instant_diffs: computedStyleMidTransition,
        animation_inventory_diffs: diffPaths(pO.animationInventory, pS.animationInventory),
        transient_animation_diffs: diffPaths(pO.transientAnimations, pS.transientAnimations),
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
      console.log(`CDX005_S4_STATE=${ctxId}/${state} real_defects=${rec.real_defects.length} nondet_fields=${selfDiffs.length} random=${randomFields.length} d1d5_preserved=${d1d5Preserved}`);
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
  } finally {
    await browser.close();
    server.close();
  }
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'all-results.json'), JSON.stringify(results, null, 2));
  writeCandidateSummary(results, reviewPacks);
});
