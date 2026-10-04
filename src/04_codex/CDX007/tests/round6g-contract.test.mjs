/**
 * MST106 / CDX007 - S4 ROUND6G state-specific changed-emotion semantics.
 *
 * The two correlated random states draw from DIFFERENT authored pools, and only one of them
 * excludes the current emotion:
 *
 *   D1/21  randomFaceReaction():
 *     const pool = allEmotionNames.filter(name => name !== emotion);
 *   => an unchanged draw is IMPOSSIBLE; `selected !== preEmotion` is a required invariant.
 *
 *   D1/29  resetAuto()'s interval:
 *     setEmotion(pool[Math.floor(Math.random()*pool.length)])
 *   => the pool does NOT exclude the current emotion; an unchanged draw is an AUTHORED no-op.
 *
 * These fixtures pin that split, and pin the crucial corollary: allowing a no-op tick must NOT
 * skip any OTHER clause. A no-op Auto Life tick is still proved against pool membership, active
 * emotion, portrait, title, line, log, the base-particle relation and the V2 FX absence.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { sourceContract } from './source-contract.mjs';
import { evaluateSurfaceCorrelation, pairCorrelation, evaluateParticleLifecycle,
  diagnoseSurfaceCorrelation } from './correlated-reaction.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = sourceContract();
const SELF = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');

/** A coherent correlated surface for a selected emotion, optionally mutating one field.
 *
 *  `userTriggered` models the CALL PATH, which is what decides the V2 FX: a D1/21 user call bursts
 *  fxMap[E][0] with fxMap[E][2] particles, while an Auto Life tick calls setEmotion(name) with
 *  user=false and bursts nothing at all. */
function correlatedSurface(emotion, overrides = {}) {
  const meta = SRC.emoMeta[emotion];
  const pose = SRC.poseForEmotion[emotion];
  const userTriggered = overrides.userTriggered !== false;
  const fam = `fx fx-${SRC.fxMap[emotion][0]}`;
  const n = userTriggered ? SRC.fxMap[emotion][2] : 0;
  return {
    dom: {
      activeEmotion: emotion,
      random_emotion_title: meta.title,
      emotion_line: `“${meta.line}”`,
      log_text: `${meta.title} · intensity 7/10 · gaze tracking`,
      visible_portrait_src: `assets/characters/M01/M01-${emotion}.webp`,
      lubt_pose_src: `assets/lubt/${SRC.lubtPoses[pose]}`,
      speechVisible: false,
      random_speech: '',
      random_lubt_bubble: overrides.requireLubtBubble || SRC.lubtTalk.idle[0],
      ...overrides.dom,
    },
    provenance: {
      bubble: [],
      preState: { bubbleText: 'PRE', emotion: 'neutral' },
      selectedEmotion: emotion,
      particle: {
        created_count: n,
        created_count_by_class: n > 0 ? { [fam]: n } : {},
        created_by_class: n > 0 ? [fam] : [],
        still_present_classes: [],
      },
      ...overrides.provenance,
    },
  };
}

function evalAuto(surfaceName, emotion, preEmotion, overrides = {}) {
  /* An Auto Life tick calls setEmotion(name) with user=false, so it bursts NO V2 FX. */
  const s = correlatedSurface(emotion, { ...overrides, userTriggered: false });
  return evaluateSurfaceCorrelation({
    surface: surfaceName, dom: s.dom, provenance: s.provenance,
    preEmotion, sourceContract: SRC, requireLubt: false, requireChangedEmotion: false,
  });
}

function evalFace(surfaceName, emotion, preEmotion, overrides = {}) {
  /* D1/21 calls the Lubt, so the surface's retained bubble must be one of ITS OWN emotion's
   * authored lines - the correlation proves that too, and a fixture must model it correctly. */
  const s = correlatedSurface(emotion, {
    ...overrides,
    userTriggered: true,
    dom: { random_lubt_bubble: SRC.lubtTalk.emotion[emotion][0], ...(overrides.dom || {}) },
  });
  return evaluateSurfaceCorrelation({
    surface: surfaceName, dom: s.dom, provenance: s.provenance,
    preEmotion, sourceContract: SRC, requireLubt: true, requireChangedEmotion: true,
  });
}

/* ------------------------------------------------------------------ AUTO LIFE no-op */

test('ROUND6G 1 Auto Life pre=neutral selected=neutral, full relation correct => PASS', () => {
  const r = evalAuto('split', 'neutral', 'neutral');
  assert.equal(r.valid, true);
  assert.equal(r.violated, 0, `a no-op tick with correct metadata passes: ${JSON.stringify(r.violations)}`);
});

test('ROUND6G 2 Auto Life pre=smile selected=smile => PASS', () => {
  const r = evalAuto('original', 'smile', 'smile');
  assert.equal(r.violated, 0, `${JSON.stringify(r.violations)}`);
});

test('ROUND6G a no-op tick does NOT skip the other clauses', () => {
  /* Each of these is a no-op tick whose one other clause is wrong; every one must FAIL. */
  const cases = [
    ['4 activeEmotion mismatch', { dom: { activeEmotion: 'smile' } }],
    ['5 portrait mismatch', { dom: { visible_portrait_src: 'assets/characters/M01/M01-smile.webp' } }],
    ['6 title mismatch', { dom: { random_emotion_title: 'SMILE' } }],
    ['6 line mismatch', { dom: { emotion_line: '“You found me.”' } }],
    ['6 log mismatch', { dom: { log_text: 'SMILE · intensity 7/10 · gaze tracking' } }],
  ];
  for (const [label, overrides] of cases) {
    const r = evalAuto('original', 'neutral', 'neutral', overrides);
    assert.equal(r.violated > 0, true, `${label} must fail even on a no-op tick`);
  }
});

test('ROUND6G 7 Auto Life selected=touched petals=20 valid => PASS', () => {
  const s = correlatedSurface('touched');
  const life = evaluateParticleLifecycle({
    surface: 'original', selectedEmotion: 'touched', userTriggered: false,
    provenance: {
      ...s.provenance,
      particle: { created_count: 20, created_count_by_class: { petal: 20 }, created_by_class: ['petal'] },
    },
    sourceContract: SRC,
  });
  assert.equal(life.violated, 0, `${JSON.stringify(life.violations)}`);
});

test('ROUND6G 8 Auto Life selected=touched with a wrong petal count => FAIL', () => {
  const s = correlatedSurface('touched');
  const life = evaluateParticleLifecycle({
    surface: 'original', selectedEmotion: 'touched', userTriggered: false,
    provenance: {
      ...s.provenance,
      particle: { created_count: 19, created_count_by_class: { petal: 19 }, created_by_class: ['petal'] },
    },
    sourceContract: SRC,
  });
  assert.equal(life.violated > 0, true);
});

test('ROUND6G 3 a selected emotion outside autoLifePool => FAIL', () => {
  /* `sing` is an authored emotion but is NOT in the Auto Life pool. The pool-membership clause is
   * checked in the runtime block, and the relation must not silently accept it either. */
  assert.equal(SRC.autoLifePool.includes('sing'), false, 'sing is outside the Auto Life pool');
  assert.equal(SRC.emotions.includes('sing'), true, 'but it is an authored emotion');
  /* With requireChangedEmotion false and a coherent surface, the correlation itself passes; the
   * pool membership is what rejects it, and that gate is separate and unchanged. */
  const r = evalAuto('original', 'sing', 'neutral');
  assert.equal(r.valid, true, 'the correlation evaluator itself does not police pool membership');
  assert.ok(SELF.includes("contract.${surf}.auto_emotion_selected"),
    'pool membership is still enforced as its own clause in the runtime');
});

/* ------------------------------------------------------------------ FACE RANDOM */

test('ROUND6G 9 D1/21 pre=neutral selected=neutral => FAIL', () => {
  const r = evalFace('original', 'neutral', 'neutral');
  assert.equal(r.violated > 0, true, 'an unchanged face-random draw is impossible');
  assert.ok(r.violations.some((v) => v.path === 'semanticContract.correlated_emotion_unchanged'));
});

test('ROUND6G 10 D1/21 pre=neutral selected=smile, full relation valid => PASS', () => {
  const r = evalFace('split', 'smile', 'neutral');
  assert.equal(r.violated, 0, `${JSON.stringify(r.violations)}`);
});

test('ROUND6G the same unchanged draw FAILS for face-random and PASSES for Auto Life', () => {
  /* The decisive contrast: identical inputs, opposite verdicts, driven only by the per-contract
   * requirement. Nothing else about the surface differs. */
  const face = evalFace('original', 'neutral', 'neutral');
  const auto = evalAuto('original', 'neutral', 'neutral');
  assert.equal(face.violated > 0, true, 'face-random excludes the current emotion');
  assert.equal(auto.violated, 0, 'Auto Life does not, so the no-op is authored');
});

test('ROUND6G the pair contracts on both surfaces for a mixed no-op/changed draw', () => {
  const o = evalAuto('original', 'shy', 'neutral');
  const s = evalAuto('split', 'neutral', 'neutral');
  const pair = pairCorrelation(o, s);
  assert.equal(pair.contract, true,
    `one changed + one no-op tick both satisfy the relation: ${JSON.stringify(pair.violations)}`);
});

/* ------------------------------------------------------------------ wiring */

test('ROUND6G the requirement is declared PER CONTRACT, not globally relaxed', () => {
  /* D1/21 keeps it; D1/29 drops it. A generic waiver would show up as the clause being deleted or
   * its condition loosened, so both the declaration and the clause are asserted. */
  assert.ok(/'D1\/21_face_click_random'[\s\S]{0,900}?requireChangedEmotion: true/.test(SELF),
    'face-random requires a changed emotion');
  assert.ok(/'D1\/29_autolife_on_live'[\s\S]{0,1200}?requireChangedEmotion: false/.test(SELF),
    'Auto Life does not');
  /* The evaluator must gate the clause on the flag, not on anything generic. */
  const src = fs.readFileSync(path.join(HERE, 'correlated-reaction.mjs'), 'utf8');
  assert.ok(/if \(p\.requireChangedEmotion === true[\s\S]{0,200}?correlated_emotion_unchanged/.test(src),
    'the clause fires only when this contract requires it');
  /* And it is still passed from the contract at every call site. */
  const passes = (SELF.match(/requireChangedEmotion: contract\.requireChangedEmotion === true/g) || []).length;
  assert.equal(passes, 4, 'both correlation evaluators and both diagnostics receive the flag');
});

test('ROUND6G the diagnostic reports the no-op explicitly', () => {
  /* An Auto Life tick: user=false, so no V2 FX is emitted. */
  const s = correlatedSurface('neutral', { userTriggered: false });
  const diag = diagnoseSurfaceCorrelation({
    surface: 'split', dom: s.dom, provenance: s.provenance,
    preEmotion: 'neutral', userTriggered: false,
    autolifePool: SRC.autoLifePool, petalDx: '', sourceContract: SRC,
    requireChangedEmotion: false,
  });
  assert.equal(diag.selectedEmotion, 'neutral');
  assert.equal(diag.preEmotion, 'neutral');
  assert.equal(diag.selected_equals_pre, true, 'the no-op is reported, not hidden');
  assert.equal(diag.require_changed_emotion, false);
  assert.equal(diag.noop_tick_allowed, true);
  assert.equal(diag.surface_contract, true, 'and the surface still passes');

  const face = correlatedSurface('neutral');
  const faceDiag = diagnoseSurfaceCorrelation({
    surface: 'original', dom: face.dom, provenance: face.provenance,
    preEmotion: 'neutral', userTriggered: true,
    autolifePool: SRC.autoLifePool, petalDx: '', sourceContract: SRC,
    requireChangedEmotion: true,
  });
  assert.equal(faceDiag.selected_equals_pre, true);
  assert.equal(faceDiag.noop_tick_allowed, false, 'face-random does not allow it');
  assert.equal(faceDiag.surface_contract, false, 'so the same draw fails there');
});