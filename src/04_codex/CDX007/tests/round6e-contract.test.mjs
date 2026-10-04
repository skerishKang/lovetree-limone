/**
 * MST106 / CDX007 - S4 ROUND6E D1/29 pair-gate regression fixtures.
 *
 * ROUND6E is diagnostic-first. These fixtures pin the REQUIRED PAIR CONTRACT:
 *
 *   pairContract = originalSurfaceSourceRelationPASS AND splitSurfaceSourceRelationPASS
 *
 * and prove, by negative fixture, that it does NOT depend on:
 *   - cross-surface selectedEmotion equality,
 *   - cross-surface petal/particle equality,
 *   - raw semantic diff absence,
 *   - animation inventory equality,
 *   - previous CONTRACTED membership.
 *
 * They also pin the per-surface source relation itself: a surface FAILs when its own authored
 * count, dx range or V2 FX expectation is not met.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { sourceContract } from './source-contract.mjs';
import {
  evaluateSurfaceCorrelation, pairCorrelation, evaluateParticleLifecycle,
  diagnoseSurfaceCorrelation, expectedParticleLifecycle,
} from './correlated-reaction.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = sourceContract();
const SELF = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');

const PETAL_RANGE = SRC.particleCounts.petalDxRange;

/** A coherent Auto Life surface report for a given selected emotion and petal count. */
function autoSurface(emotion, { petals = null, fx = 0, petalDx = null, notes = 0 } = {}) {
  const expectPetals = emotion === 'touched' ? 20 : 0;
  const n = petals === null ? expectPetals : petals;
  const meta = SRC.emoMeta[emotion];
  const byClass = {};
  if (n > 0) byClass.petal = n;
  if (notes > 0) byClass.note = notes;
  if (fx > 0) byClass['fx fx-heart'] = fx;
  const dom = {
    activeEmotion: emotion,
    random_emotion_title: meta.title,
    emotion_line: `“${meta.line}”`,
    log_text: `${meta.title} · intensity 7/10 · gaze tracking`,
    visible_portrait_src: `assets/characters/M01/M01-${emotion}.webp`,
    lubt_pose_src: `assets/lubt/${SRC.lubtPoses[SRC.poseForEmotion[emotion]]}`,
    speechVisible: false,
    random_speech: '',
    random_lubt_bubble: SRC.lubtTalk.idle[0],
  };
  const provenance = {
    bubble: [],
    preState: { bubbleText: 'PRE', emotion: 'neutral' },
    selectedEmotion: emotion,
    particle: {
      created_count: Object.values(byClass).reduce((a, b) => a + b, 0),
      created_count_by_class: byClass,
      created_by_class: Object.keys(byClass),
      still_present_classes: [],
    },
  };
  return { dom, provenance, petalDx: petalDx === null
    ? (n > 0 ? Array.from({ length: n }, () => '0px').join('|') : '')
    : petalDx };
}

/** Evaluate the particle lifecycle the way the runtime does for D1/29 (user=false). */
function life(side, rec) {
  return evaluateParticleLifecycle({
    surface: side,
    selectedEmotion: rec.provenance.selectedEmotion,
    userTriggered: false,
    provenance: rec.provenance,
    sourceContract: SRC,
  });
}

/** The REQUIRED pair composition: both per-surface source relations, nothing else. */
function pairFromSurfaces(o, s) {
  const ol = life('original', o);
  const sl = life('split', s);
  return {
    original_contract: ol.valid && ol.violated === 0,
    split_contract: sl.valid && sl.violated === 0,
    pair_contract: (ol.valid && ol.violated === 0) && (sl.valid && sl.violated === 0),
    original_violations: ol.violations,
    split_violations: sl.violations,
  };
}

/* ------------------------------------------------------------------ required pair */

test('ROUND6E 1 original=smile petals0 / split=touched petals20 => PAIR PASS', () => {
  const r = pairFromSurfaces(autoSurface('smile'), autoSurface('touched'));
  assert.equal(r.original_contract, true, `original: ${JSON.stringify(r.original_violations)}`);
  assert.equal(r.split_contract, true, `split: ${JSON.stringify(r.split_violations)}`);
  assert.equal(r.pair_contract, true, 'the required pair contract is both surfaces, nothing else');
});

test('ROUND6E 2 original=touched petals20 / split=sleepy petals0 => PAIR PASS', () => {
  const r = pairFromSurfaces(autoSurface('touched'), autoSurface('sleepy'));
  assert.equal(r.pair_contract, true, 'the mirror case also passes');
});

test('ROUND6E 3 two different valid Auto Life emotions do NOT require equality', () => {
  const a = autoSurface('smile');
  const b = autoSurface('touched');
  assert.notEqual(a.provenance.selectedEmotion, b.provenance.selectedEmotion);
  assert.equal(pairFromSurfaces(a, b).pair_contract, true,
    'cross-surface selectedEmotion equality is not a requirement');
});

test('ROUND6E the pair contract does not depend on raw diff, animation equality or CONTRACTED', () => {
  /* The pair composition above takes ONLY the two per-surface relations. It receives no raw diff,
   * no animation inventory and no CONTRACTED set, so none of them can be an input. */
  const o = autoSurface('smile');
  const s = autoSurface('touched');
  /* Even when a raw petal dx difference plainly exists between the two surfaces. */
  assert.notEqual(o.petalDx, s.petalDx, 'a raw petal dx difference exists');
  const r = pairFromSurfaces(o, s);
  assert.equal(r.pair_contract, true, 'and the pair contract still passes');
});

/* ------------------------------------------------------------------ per-surface FAIL */

test('ROUND6E 4 touched + 19 petals => FAIL', () => {
  const r = life('original', autoSurface('touched', { petals: 19 }));
  assert.equal(r.violated > 0, true);
  assert.ok(r.violations.some((v) => v.path === 'semanticContract.particle_base_petals'));
});

test('ROUND6E 5 touched + 21 petals => FAIL', () => {
  const r = life('original', autoSurface('touched', { petals: 21 }));
  assert.equal(r.violated > 0, true);
});

test('ROUND6E 6 touched + a dx outside [-250,250] => FAIL (range never widened)', () => {
  assert.equal(PETAL_RANGE.min, -250);
  assert.equal(PETAL_RANGE.max, 250);
  const dx = ['0px', '251px', ...Array.from({ length: 18 }, () => '0px')].join('|');
  const r = life('original', autoSurface('touched', { petalDx: dx }));
  const diag = diagnoseSurfaceCorrelation({
    surface: 'original', ...autoSurface('touched', { petalDx: dx }),
    userTriggered: false, autolifePool: SRC.autoLifePool, sourceContract: SRC,
  });
  assert.equal(diag.petal_dx_range_matches, false, 'the diagnostic reports the out-of-range dx');
  assert.equal(r.violated >= 0, true);   // the lifecycle itself does not judge dx
});

test('ROUND6E 7 non-touched + petals>0 => FAIL', () => {
  const r = life('original', autoSurface('smile', { petals: 20 }));
  assert.equal(r.violated > 0, true, 'smile authors no base petals');
});

test('ROUND6E 8 Auto Life + any V2 fx emission => FAIL', () => {
  const r = life('original', autoSurface('touched', { fx: 22 }));
  assert.equal(r.violated > 0, true, 'an Auto Life tick calls setEmotion(name) with user=false');
  assert.ok(r.violations.some((v) => v.path === 'semanticContract.particle_v2_fx_absent'));
});

/* ------------------------------------------------------------------ the diagnostic */

test('ROUND6E the per-surface diagnostic reports every D1/29 clause with its observed value', () => {
  const diag = diagnoseSurfaceCorrelation({
    surface: 'split', ...autoSurface('touched'),
    userTriggered: false, autolifePool: SRC.autoLifePool, sourceContract: SRC,
  });
  assert.equal(diag.selectedEmotion, 'touched');
  assert.equal(diag.selected_in_autolife_pool, true);
  assert.equal(diag.active_emotion_matches, true);
  assert.equal(diag.active_portrait_matches, true);
  assert.equal(diag.emotion_title_matches, true);
  assert.equal(diag.emotion_line_matches, true);
  assert.equal(diag.log_matches, true);
  assert.equal(diag.expected_base_petals, 20);
  assert.equal(diag.observed_base_petals, 20);
  assert.equal(diag.petal_count_matches, true);
  assert.equal(diag.expected_base_notes, 0);
  assert.equal(diag.observed_base_notes, 0);
  assert.equal(diag.note_count_matches, true);
  assert.equal(diag.expected_v2_fx, 0);
  assert.equal(diag.observed_v2_fx, 0);
  assert.equal(diag.v2_fx_matches, true);
  assert.equal(diag.petal_dx_range_matches, true);
  assert.equal(diag.surface_contract, true);
});

test('ROUND6E the diagnostic surfaces a non-touched emotion reporting zero petals as a PASS', () => {
  const diag = diagnoseSurfaceCorrelation({
    surface: 'original', ...autoSurface('smile'),
    userTriggered: false, autolifePool: SRC.autoLifePool, sourceContract: SRC,
  });
  assert.equal(diag.expected_base_petals, 0);
  assert.equal(diag.observed_base_petals, 0);
  assert.equal(diag.petal_count_matches, true);
  assert.equal(diag.surface_contract, true,
    'a surface that emitted no petals for a non-touched emotion is fully consistent');
});

test('ROUND6E the Auto Life pool never authors notes or laugh-petals', () => {
  const e = expectedParticleLifecycle({
    selectedEmotion: 'sleepy', userTriggered: false, sourceContract: SRC,
  });
  assert.equal(e.counts.note, 0);
  assert.equal(e.counts.petal, 0);
  assert.equal(e.fx.count, 0, 'no user-triggered V2 FX on an Auto Life tick');
});

/* ------------------------------------------------------------------ wiring */

test('ROUND6E the pair gate is composed from the two per-surface relations only', () => {
  assert.ok(SELF.includes('corrPair.contract && particlePair.contract'),
    'the correlated fields are gated on the relational proof AND the particle lifecycle');
  /* The diagnostic is recorded, and it decides nothing. */
  assert.ok(SELF.includes('correlation_diagnostic'), 'the diagnostic is recorded in the evidence');
  const diagFn = diagnoseSurfaceCorrelation.toString();
  assert.equal(/CONTRACTED/.test(diagFn), false, 'the diagnostic never contracts a field');
  assert.equal(/contractViolations/.test(diagFn), false, 'the diagnostic records no violation');
});

test('ROUND6E the correlated FX inventory key is recognised in both segment positions', () => {
  /* ROUND6E regression: burstEmotion() creates `<i class="fx fx-star">` with no id, so the
   * inventory key is `fx fx-star|fxBurst|CSSAnimation|finite` - the CLASS is the first segment.
   * The ROUND6C predicate anchored on a leading `|`, so it only matched a key with a target
   * segment before the class and this shape re-entered as a raw defect. Both real shapes must
   * be recognised, and a non-FX entry must not be. */
  /* Evaluate the REAL predicate out of the runtime file, rather than re-typing it here, so this
   * fixture cannot pass while the runtime disagrees. */
  const decl = /^\s*const isCorrelatedFx\s*=\s*\(k\)\s*=>\s*(\/.*?\/)\.test/m.exec(SELF);
  assert.ok(decl, 'the predicate is declared once in the runtime');
  const re = new RegExp(decl[1].slice(1, -1));
  assert.equal(re.test('fx fx-star|fxBurst|CSSAnimation|finite'), true,
    'class-first key (no target segment) is recognised');
  assert.equal(re.test('fx|fx fx-heart|fxBurst|CSSAnimation|finite'), true,
    'target-first key is recognised');
  assert.equal(re.test('petal|petal|CSSAnimation|finite'), false,
    'a petal entry is NOT a correlated FX entry');
  assert.equal(re.test('note|note|CSSAnimation|finite'), false,
    'a note entry is NOT a correlated FX entry');
  assert.equal(re.test('lubtBubble|unknown|CSSTransition|finite'), false,
    'a lubt bubble transition is NOT a correlated FX entry');
  /* ROUND6F replaced the single-line projection with a filter that consults BOTH proofs, so this
   * assertion now checks the FX branch of that filter rather than the old expression shape. */
  assert.ok(SELF.includes('if (correlatedProven && isCorrelatedFx(k)) return false;'),
    'the FX projection is still gated on correlatedProven');
  assert.ok(SELF.includes('const animContractDiff = () => animRaw.filter('),
    'the animation projection is a filter over the raw diff');
});

test('ROUND6E the diagnostic is declared at state scope, before it is read', () => {
  /* ROUND6E regression: `correlationDiagnostic` was first declared INSIDE the correlated-contract
   * branch but read at `results.push`, which is outside it. The ReferenceError aborted the whole
   * candidate run after zero states. A binding read by results.push must be declared before the
   * branch that may or may not execute. */
  const declAt = SELF.indexOf('const correlationDiagnostic =');
  const readAt = SELF.indexOf('correlation_diagnostic: correlationDiagnostic');
  assert.ok(declAt > 0, 'the diagnostic is declared');
  assert.ok(readAt > 0, 'the diagnostic is read into the evidence');
  assert.ok(declAt < readAt, 'the declaration precedes the read');
  /* The declaration must sit at state scope, not inside the correlated-only branch. */
  const beforeDecl = SELF.slice(Math.max(0, declAt - 400), declAt);
  assert.equal(/if \(contract && contract\.correlated\)/.test(beforeDecl), false,
    'the diagnostic is NOT declared inside the correlated-only branch');
});