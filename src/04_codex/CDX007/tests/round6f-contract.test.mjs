/**
 * MST106 / CDX007 - S4 ROUND6F base-particle correlated scope completion.
 *
 * ROUND6E left `semantic.dom.particle_families.notes` and the `note|note|CSSAnimation|finite`
 * inventory entry as raw defects: the contraction scope covered only petals. These fixtures pin
 * the source-derived base-particle relation for BOTH authored families and prove, by negative
 * fixture, that the animation relation is never a blanket target filter.
 *
 *   selected == sing            => notes,  count 8,  dx [-70,70],   note CSS animation present
 *   selected in {touched,laugh} => petals, count 20, dx [-250,250], petal CSS animation present
 *   otherwise                   => neither, count 0,  no dx, no base animation
 *
 * Counts and ranges are read from SOURCE_CONTRACT (derived from the frozen bytes), never restated.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { sourceContract } from './source-contract.mjs';
import {
  evaluateBaseParticleRelation, expectedBaseParticleRelation, parseBaseDx,
} from './correlated-reaction.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = sourceContract();
const SELF = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');

const NOTE_ANIM = 'note|note|CSSAnimation|finite';
const PETAL_ANIM = 'petal|petal|CSSAnimation|finite';

/** Build a surface with a given selected emotion and an explicit observed base lifecycle.
 *
 *  A family count left `undefined` is filled from the AUTHORED relation, so a "valid" fixture is
 *  genuinely valid; passing an explicit number (including 0) forces that observed value, which is
 *  how the negative cases are expressed. `authored` forces the authored values and ignores the
 *  per-family overrides entirely, for the clean pass fixtures. */
function surface(surfaceName, emotion, { note, petal, noteDx, petalDx,
  animations = null, authored = false } = {}) {
  const rel = expectedBaseParticleRelation({ selectedEmotion: emotion, sourceContract: SRC });
  const authoredNote = rel.family === 'note' ? rel.count : 0;
  const authoredPetal = rel.family === 'petal' ? rel.count : 0;
  const nNotes = authored ? authoredNote : (note === undefined ? authoredNote : note);
  const nPetals = authored ? authoredPetal : (petal === undefined ? authoredPetal : petal);
  const byClass = {};
  if (nNotes > 0) byClass.note = nNotes;
  if (nPetals > 0) byClass.petal = nPetals;
  const dxFor = (n) => Array.from({ length: n }, () => '0px').join('|');
  const anims = animations === null
    ? [
      ...(nNotes > 0 ? [NOTE_ANIM] : []),
      ...(nPetals > 0 ? [PETAL_ANIM] : []),
    ]
    : animations;
  return {
    selectedEmotion: emotion,
    provenance: {
      bubble: [], preState: { bubbleText: 'PRE', emotion: 'neutral' },
      particle: {
        created_count: Object.values(byClass).reduce((a, b) => a + b, 0),
        created_count_by_class: byClass,
        created_by_class: Object.keys(byClass),
        still_present_classes: [],
      },
    },
    noteDx: noteDx === undefined ? dxFor(nNotes) : noteDx,
    petalDx: petalDx === undefined ? dxFor(nPetals) : petalDx,
    animations: anims,
  };
}

function evaluate(side, rec) {
  return evaluateBaseParticleRelation({
    surface: side,
    selectedEmotion: rec.selectedEmotion,
    provenance: rec.provenance,
    noteDx: rec.noteDx,
    petalDx: rec.petalDx,
    observedAnimations: rec.animations,
    sourceContract: SRC,
  });
}

/** The REQUIRED pair composition: both per-surface base relations, nothing else. */
function pair(sideA, recA, sideB, recB) {
  const a = evaluate(sideA, recA);
  const b = evaluate(sideB, recB);
  return {
    a, b,
    contract: a.valid && a.violated === 0 && b.valid && b.violated === 0,
  };
}

/* ---------------------------------------------------------------- the relation */

test('ROUND6F the base-particle relation is derived from the frozen bytes', () => {
  assert.equal(SRC.particleCounts.notes, 8);
  assert.equal(SRC.particleCounts.petals, 20);
  assert.deepEqual(SRC.particleCounts.noteDxRange, { min: -70, max: 70 });
  assert.deepEqual(SRC.particleCounts.petalDxRange, { min: -250, max: 250 });
  assert.equal(SRC.baseParticleTriggers.sing, 'notes');
  assert.equal(SRC.baseParticleTriggers.touched, 'petals');
  assert.equal(SRC.baseParticleTriggers.laugh, 'petals');
  /* The Auto Life pool authors notes/laugh-petals for no member. */
  for (const e of SRC.autoLifePool) {
    const r = expectedBaseParticleRelation({ selectedEmotion: e, sourceContract: SRC });
    assert.ok(r.family !== 'notes', `${e} authors no notes`);
    assert.ok(r.family !== 'petals' || e === 'touched', `${e} authors petals only if touched`);
  }
});

test('ROUND6F the relation maps each family to its authored count, range and animation', () => {
  const sing = expectedBaseParticleRelation({ selectedEmotion: 'sing', sourceContract: SRC });
  assert.equal(sing.family, 'note');
  assert.equal(sing.count, 8);
  assert.deepEqual(sing.dxRange, { min: -70, max: 70 });
  assert.equal(sing.animationKey, NOTE_ANIM);

  const touched = expectedBaseParticleRelation({ selectedEmotion: 'touched', sourceContract: SRC });
  assert.equal(touched.family, 'petal');
  assert.equal(touched.count, 20);
  assert.deepEqual(touched.dxRange, { min: -250, max: 250 });
  assert.equal(touched.animationKey, PETAL_ANIM);

  const smile = expectedBaseParticleRelation({ selectedEmotion: 'smile', sourceContract: SRC });
  assert.equal(smile.family, null);
  assert.equal(smile.count, 0);
  assert.equal(smile.animationKey, null);
});

/* ---------------------------------------------------------------- pair pass cases */

test('ROUND6F 1 original=smile notes0 / split=sing notes8 => PAIR PASS', () => {
  const r = pair('original', surface('original', 'smile'), 'split', surface('split', 'sing'));
  assert.equal(r.a.violated, 0, `original: ${JSON.stringify(r.a.violations)}`);
  assert.equal(r.b.violated, 0, `split: ${JSON.stringify(r.b.violations)}`);
  assert.equal(r.contract, true);
});

test('ROUND6F 2 original=sing notes8 / split=sleepy notes0 => PAIR PASS', () => {
  const r = pair('original', surface('original', 'sing'), 'split', surface('split', 'sleepy'));
  assert.equal(r.contract, true);
});

test('ROUND6F 3 cross-surface selected-emotion equality is NOT required', () => {
  const a = surface('original', 'sing');
  const b = surface('split', 'sleepy');
  assert.notEqual(a.selectedEmotion, b.selectedEmotion);
  assert.equal(pair('original', a, 'split', b).contract, true);
});

test('ROUND6F 7 the note animation present only on the sing surface is a PASS', () => {
  /* Exactly the ROUND6E measurement: original=smile (absent), split=sing (present). */
  const a = surface('original', 'smile', { animations: [] });
  const b = surface('split', 'sing');
  assert.deepEqual(a.animations, [], 'original has no base animation');
  assert.ok(b.animations.includes(NOTE_ANIM), 'split has the authored note animation');
  const r = pair('original', a, 'split', b);
  assert.equal(r.contract, true, 'this is authored behaviour, not a defect');
});

test('ROUND6F 10 the petal relation regression still passes', () => {
  const r = pair('original', surface('original', 'smile'), 'split', surface('split', 'touched'));
  assert.equal(r.contract, true, 'touched still emits 20 petals + its animation');
});

/* ---------------------------------------------------------------- negative cases */

test('ROUND6F 4 sing + notes count 7 or 9 => FAIL', () => {
  for (const n of [7, 9]) {
    const r = evaluate('original', surface('original', 'sing', { note: n }));
    assert.equal(r.violated > 0, true, `notes=${n} must fail`);
  }
});

test('ROUND6F 5 sing + out-of-range note dx => FAIL (range never widened)', () => {
  for (const bad of ['-71', '71']) {
    const dx = [bad, ...Array.from({ length: 7 }, () => '0px')].join('|');
    const r = evaluate('original', surface('original', 'sing', { noteDx: dx }));
    assert.equal(r.violated > 0, true, `note dx ${bad} must fail`);
  }
});

test('ROUND6F 6 non-sing + a note emission => FAIL', () => {
  const r = evaluate('original', surface('original', 'smile', { note: 8, animations: [NOTE_ANIM] }));
  assert.equal(r.violated > 0, true, 'smile authors no notes');
});

test('ROUND6F touched + petals != 20 => FAIL', () => {
  for (const n of [19, 21, 0]) {
    const r = evaluate('original', surface('original', 'touched', { petal: n }));
    assert.equal(r.violated > 0, true, `petals=${n} must fail`);
  }
});

test('ROUND6F touched + petal dx outside [-250,250] => FAIL', () => {
  for (const bad of ['-251', '251']) {
    const dx = [bad, ...Array.from({ length: 19 }, () => '0px')].join('|');
    const r = evaluate('original', surface('original', 'touched', { petalDx: dx }));
    assert.equal(r.violated > 0, true, `petal dx ${bad} must fail`);
  }
});

test('ROUND6F non touched/laugh + petals > 0 => FAIL', () => {
  const r = evaluate('original', surface('original', 'shy', { petal: 20, animations: [PETAL_ANIM] }));
  assert.equal(r.violated > 0, true, 'shy authors no petals');
});

test('ROUND6F 8 note animation MISSING on the sing surface => FAIL', () => {
  const rec = surface('original', 'sing', { animations: [] });
  const r = evaluate('original', rec);
  assert.equal(r.violated > 0, true);
  assert.ok(r.violations.some((v) => v.path === 'semanticContract.base_note_animation'));
});

test('ROUND6F 9 note animation PRESENT on a non-sing surface => FAIL', () => {
  const rec = surface('original', 'smile', { animations: [NOTE_ANIM] });
  const r = evaluate('original', rec);
  assert.equal(r.violated > 0, true);
});

/* ---------------------------------------------------------------- no blanket waiver */

test('ROUND6F 11 an unrelated animation family is NOT contracted', () => {
  /* The runtime projection must recognise ONLY the two authored base families plus the V2 FX
   * family. A `lubtBubble` CSSTransition, a `breath` infinity track and a `petal` entry with a
   * different shape must all survive the filter. Evaluate the REAL predicates from the runtime. */
  const fxDecl = /^\s*const isCorrelatedFx\s*=\s*\(k\)\s*=>\s*(\/.*?\/)\.test/m.exec(SELF);
  const baseDecl = /const isBaseParticleAnim\s*=\s*\(k\)\s*=>\s*(\/.*?\/)\s*\n?\s*\.test/s.exec(SELF);
  assert.ok(fxDecl, 'the correlated-FX predicate exists');
  assert.ok(baseDecl, 'the base-particle predicate exists');
  const fx = new RegExp(fxDecl[1].slice(1, -1));
  const base = new RegExp(baseDecl[1].slice(1, -1));

  /* The base predicate matches the two authored families and nothing else. */
  assert.equal(base.test(NOTE_ANIM), true);
  assert.equal(base.test(PETAL_ANIM), true);
  assert.equal(base.test('note|note|CSSAnimation|infinite'), false);
  assert.equal(base.test('lubtBubble|unknown|CSSTransition|finite'), false);
  assert.equal(base.test('fx fx-heart|fxBurst|CSSAnimation|finite'), false,
    'the V2 FX family is NOT a base particle family');
  assert.equal(base.test('portraitWrap|breath|CSSAnimation|infinite'), false);
  assert.equal(fx.test('lubtBubble|unknown|CSSTransition|finite'), false);
  assert.equal(fx.test('portraitWrap|breath|CSSAnimation|infinite'), false);
});

test('ROUND6F the animation projection is gated on the per-surface proof, not on the target', () => {
  /* The forbidden shape is a filter that ignores any note/petal animation outright. The projection
   * must instead consult `baseParticleProven`, which is only set when BOTH surfaces proved their
   * own source-derived relation. */
  assert.ok(SELF.includes('if (baseParticleProven && isBaseParticleAnim(k)) return false;'),
    'the base projection is gated on baseParticleProven');
  assert.ok(SELF.includes('let baseParticleProven = false;'),
    'baseParticleProven starts false');
  const setAt = SELF.indexOf('baseParticleProven = true;');
  const gateAt = SELF.indexOf('if (basePair.contract)');
  assert.ok(setAt > gateAt && gateAt > 0,
    'baseParticleProven is set only from a passing basePair.contract');
});

test('ROUND6F the contracted scope is exactly the source-proven base families', () => {
  /* ROUND6H: the particle-family entries are now owned as EXPLICIT LEAF paths, because the
   * collector field is an object and the diff is reported per leaf. The dx fields are unchanged. */
  assert.ok(SELF.includes('for (const f of BASE_PARTICLE_LEAF_PATHS) CONTRACTED.add(f);'),
    'only the source-proven base leaf paths are contracted');
  assert.ok(SELF.includes("'dom.random_note_dx'") && SELF.includes("'dom.random_petal_dx'"),
    'the authored dx fields remain in the declared scope');
  assert.equal(/CONTRACTED\.add\('dom\.random_note_dx'\)/.test(SELF), false,
    'note dx is not contracted unconditionally');
  assert.equal(/CONTRACTED\.add\('dom\.particle_families'\)/.test(SELF), false,
    'the bare parent is not contracted - ROUND6H owns the leaves');
});

test('ROUND6F an unauthored selected emotion fails closed', () => {
  const r = expectedBaseParticleRelation({ selectedEmotion: 'nope', sourceContract: SRC });
  assert.equal(r.ok, false);
  const res = evaluateBaseParticleRelation({
    surface: 'original', selectedEmotion: 'nope', provenance: { particle: {} },
    noteDx: '', petalDx: '', observedAnimations: [], sourceContract: SRC,
  });
  assert.equal(res.valid, false);
  assert.ok(res.harnessErrors.some((h) => /BASE_PARTICLE_EMOTION_NOT_AUTHORED/.test(h)));
});

test('ROUND6F an unparseable dx value fails closed', () => {
  assert.equal(parseBaseDx('abc').ok, false);
  assert.equal(parseBaseDx('').ok, true);
  assert.deepEqual(parseBaseDx('-70px|70px').values, [-70, 70]);
});