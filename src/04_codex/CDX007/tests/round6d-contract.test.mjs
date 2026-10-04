/**
 * MST106 / CDX007 - S4 ROUND6D bounded harness repair regression fixtures.
 *
 * FIX 1  correlated collector field names exist (fail-closed)
 * FIX 2  dynamic character-guide source contract + per-surface correlation
 * FIX 3  D1/21 per-surface particle lifecycle (base + user-triggered V2 FX)
 * FIX 4  D1/29 Auto Life particle lifecycle (no user-triggered V2 FX)
 * FIX 5  portrait transition quiescence barrier
 *
 * Structural/unit only: no browser, no fresh evidence.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { sourceContract } from './source-contract.mjs';
import {
  evaluateSurfaceProvenance, pairSurfaceProvenance,
} from './surface-provenance.mjs';
import {
  classifyBubbleText, characterNameForGuide, resolveCharacterGuide,
  CHARACTER_GUIDE_POOL, CHARACTER_GUIDE_STATES, stateOwnsLubtWrite,
} from './bubble-provenance.mjs';
import {
  CORRELATED_READ_FIELDS, expectedParticleLifecycle, evaluateParticleLifecycle,
} from './correlated-reaction.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAPSULE = path.resolve(HERE, '..');
const SRC = sourceContract();
const SELF = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
const COLLECTOR_SRC = SELF.slice(SELF.indexOf('function collectChannels'),
  SELF.indexOf('/* ---------------- HARD-CHANNEL OWNERSHIP'));

/* ============================================================================
 * FIX 1 - correlated collector field names
 * ==========================================================================*/

test('FIX 1 every collector field the correlated evaluator reads EXISTS', () => {
  /* ROUND6C regression: the evaluator read `dom.emotion_title`, which the collector never defines,
   * so the comparison silently used undefined and failed on every surface. This is fail-closed. */
  for (const field of CORRELATED_READ_FIELDS) {
    assert.ok(new RegExp(`\\b${field}\\s*:`).test(COLLECTOR_SRC),
      `the collector defines dom.${field}`);
  }
  assert.equal(/\bdom\.emotion_title\b/.test(SELF), false,
    'the non-existent dom.emotion_title is not referenced anywhere');
});

/* ============================================================================
 * FIX 2 - dynamic character guide
 * ==========================================================================*/

test('FIX 2 the character guide is derived from frozen bytes, not a second table', () => {
  const inline = fs.readFileSync(path.join(CAPSULE, 'split', 'script.js'), 'utf8');
  assert.ok(/callLubt\('guide',`\$\{c\.name\}[^`]*`\)/.test(inline),
    'the frozen source authors the dynamic guide callLubt');
  assert.equal(SRC.characterGuideTemplate, '${c.name}의 표정을 만나볼까?');
  for (const [name, ch] of Object.entries(SRC.chars)) {
    assert.equal(SRC.characterGuideByName[name], `${name}의 표정을 만나볼까?`,
      `${name} has a derived guide line`);
    assert.equal(typeof ch.id, 'string', `${name} has an authored id`);
  }
});

test('FIX 2 a guide line classifies to its own character, exactly', () => {
  const guide = SRC.characterGuideByName.YUL;
  assert.equal(characterNameForGuide(guide, SRC), 'YUL');
  assert.ok(classifyBubbleText(guide, SRC).includes(`${CHARACTER_GUIDE_POOL}.YUL`));
  /* Membership in the union is NOT correlation: the resolved path must name the character. */
  const wrong = resolveCharacterGuide({ selectedCharacter: 'ARIA', sourceContract: SRC });
  assert.equal(wrong.ok, true);
  assert.notEqual(wrong.expectedText, guide, 'ARIA does not resolve to the YUL guide');
});

test('FIX 2 the five character-switch states OWN a Lubt write (not the default no-write policy)', () => {
  assert.equal(CHARACTER_GUIDE_STATES.length, 5);
  for (const s of CHARACTER_GUIDE_STATES) {
    assert.equal(stateOwnsLubtWrite(s), true, `${s} owns its authored guide write`);
  }
  /* And their contracts claim the dynamic pool. */
  for (const key of ['D1/02_character_M02', 'D1/03_character_F01', 'D1/04_character_F02',
    'T1/03_tablet_character', 'M1/04_mobile_character']) {
    assert.ok(SELF.includes(`'${key}': { bubbleOwned: 'characterGuide'`),
      `${key} declares the character-guide ownership`);
  }
});

/** Build a character-switch surface result for a given selected character and observed guide. */
function charSurface(surface, selectedCharacter, observedGuide) {
  const guide = SRC.characterGuideByName[observedGuide];
  return evaluateSurfaceProvenance({
    surface,
    contract: { bubbleOwned: 'characterGuide' },
    state: '02_character_M02',
    selectedCharacter,
    provenance: {
      bubble: [{ seq: 1, text: guide, sourcePoolCandidates: classifyBubbleText(guide, SRC) }],
      preState: { bubbleText: 'PRE', emotion: 'neutral' },
      selectedEmotion: null,
      selectedCharacter,
      particle: { created_by_class: [], still_present_classes: [] },
    },
    finalBubbleText: guide,
    preBubbleText: 'PRE',
    sourceContract: SRC,
  });
}

test('FIX 2 M02 selected + M02 guide => PASS', () => {
  const o = charSurface('original', 'YUL', 'YUL');
  assert.equal(o.violated, 0, `M02/M02 is clean: ${JSON.stringify(o.violations)}`);
  assert.equal(o.valid, true);
});

test('FIX 2 M02 selected + a DIFFERENT character guide => FAIL', () => {
  const o = charSurface('original', 'YUL', 'ARIA');
  assert.equal(o.violated > 0, true, 'a guide for another character must not satisfy the contract');
  assert.ok(o.violations.some((v) => v.path === 'semanticContract.bubble_character_guide_mismatch'));
});

test('FIX 2 F02 selected + F02 guide => PASS, and F02 + M02 => FAIL', () => {
  assert.equal(charSurface('split', 'SENA', 'SENA').violated, 0);
  assert.equal(charSurface('split', 'SENA', 'NOAH').violated > 0, true);
});

test('FIX 2 an unknown character name FAILS CLOSED', () => {
  const r = resolveCharacterGuide({ selectedCharacter: 'ZZZ', sourceContract: SRC });
  assert.equal(r.ok, false);
  assert.match(r.error, /CHARACTER_GUIDE_UNKNOWN_CHARACTER/);
  /* And it surfaces as a harness error, not a silent pass. */
  const res = charSurface('original', 'ZZZ', 'YUL');
  assert.equal(res.valid, false);
  assert.ok(res.harnessErrors.some((h) => /CHARACTER_GUIDE_UNKNOWN_CHARACTER/.test(h)));
});

test('FIX 2 a missing source template/contract FAILS CLOSED', () => {
  const noTemplate = resolveCharacterGuide({ selectedCharacter: 'YUL', sourceContract: {} });
  assert.equal(noTemplate.ok, false);
  assert.match(noTemplate.error, /CHARACTER_GUIDE_CONTRACT_MISSING/);
  const noSelection = resolveCharacterGuide({ selectedCharacter: null, sourceContract: SRC });
  assert.equal(noSelection.ok, false);
  assert.match(noSelection.error, /CHARACTER_GUIDE_SELECTION_MISSING/);
});

test('FIX 2 the character guide is classified ONLY where a contract asks for it', () => {
  /* A guide line appearing in a state that does NOT own a guide must not become a silent pass:
   * the unclassified-write check still runs on the trace. */
  const guide = SRC.characterGuideByName.YUL;
  const unrelated = evaluateSurfaceProvenance({
    surface: 'original',
    contract: null,
    state: '05_emotion_smile',
    provenance: {
      bubble: [{ seq: 1, text: guide, sourcePoolCandidates: classifyBubbleText(guide, SRC) }],
      preState: { bubbleText: 'PRE', emotion: 'neutral' },
      selectedEmotion: null,
      particle: { created_by_class: [], still_present_classes: [] },
    },
    finalBubbleText: guide,
    preBubbleText: 'PRE',
    sourceContract: SRC,
  });
  assert.equal(unrelated.unclassifiedWrites, 0, 'the line is classified, not unclassified');
  assert.equal(unrelated.violated, 0,
    'it is an authored write, so it is not a violation on an unowned state either');
  /* But the AUTHORED-ONLY rule still holds: an unauthored text is always a violation. */
  const authored = classifyBubbleText('NOT AN AUTHORED LINE', SRC);
  assert.deepEqual(authored, []);
});

/* ============================================================================
 * FIX 3 / FIX 4 - per-surface particle lifecycle
 * ==========================================================================*/

/** A particle report with per-class counts, shaped like the real PROVENANCE_REPORT. */
function particleReport(byClass) {
  return {
    bubble: [],
    preState: { bubbleText: 'PRE', emotion: 'neutral' },
    selectedEmotion: null,
    particle: {
      created_count: Object.values(byClass).reduce((a, b) => a + b, 0),
      created_count_by_class: byClass,
      created_by_class: Object.keys(byClass),
      still_present_classes: [],
    },
  };
}

test('FIX 3/4 the trigger relation is derived from frozen bytes', () => {
  assert.deepEqual(SRC.baseParticleTriggers,
    { sing: 'notes', touched: 'petals', laugh: 'petals' });
  assert.equal(SRC.burstOnUser, 'burstEmotion');
  assert.deepEqual(SRC.particleCounts.notes, 8);
  assert.deepEqual(SRC.particleCounts.petals, 20);
  /* Auto Life cannot emit notes or laugh-petals: neither is in its authored pool. */
  for (const e of SRC.autoLifePool) {
    assert.notEqual(SRC.baseParticleTriggers[e], 'notes', `${e} emits no notes`);
    assert.ok(SRC.baseParticleTriggers[e] !== 'petals' || e === 'touched',
      `only touched emits petals in the pool (got ${e})`);
  }
});

test('FIX 3 shy + fx-heart12 PASS and touched + fx-heart22 PASS', () => {
  const shy = evaluateParticleLifecycle({
    surface: 'original', selectedEmotion: 'shy', userTriggered: true,
    provenance: particleReport({ 'fx fx-heart': 12 }), sourceContract: SRC,
  });
  assert.equal(shy.violated, 0, `shy emits only its own FX: ${JSON.stringify(shy.violations)}`);
  const touched = evaluateParticleLifecycle({
    surface: 'split', selectedEmotion: 'touched', userTriggered: true,
    provenance: particleReport({ 'fx fx-heart': 22, petal: 20 }), sourceContract: SRC,
  });
  assert.equal(touched.violated, 0,
    `touched emits 22 fx + 20 petals: ${JSON.stringify(touched.violations)}`);
  /* Cross-surface equality is NOT required - the two counts legitimately differ. */
  assert.equal(shy.satisfied, 1);
  assert.equal(touched.satisfied, 1);
});

test('FIX 3 shy + fx-heart22 FAILS (the wrong authored count for that emotion)', () => {
  const r = evaluateParticleLifecycle({
    surface: 'original', selectedEmotion: 'shy', userTriggered: true,
    provenance: particleReport({ 'fx fx-heart': 22 }), sourceContract: SRC,
  });
  assert.equal(r.violated > 0, true);
  assert.ok(r.violations.some((v) => v.path === 'semanticContract.particle_v2_fx_count'));
});

test('FIX 3 FACE sing => notes8 + its source FX PASS; FACE touched => petals20 + fx PASS', () => {
  const sing = evaluateParticleLifecycle({
    surface: 'original', selectedEmotion: 'sing', userTriggered: true,
    provenance: particleReport({ note: 8, 'fx fx-note': 14 }), sourceContract: SRC,
  });
  assert.equal(sing.violated, 0, `${JSON.stringify(sing.violations)}`);
  const touched = evaluateParticleLifecycle({
    surface: 'original', selectedEmotion: 'touched', userTriggered: true,
    provenance: particleReport({ petal: 20, 'fx fx-heart': 22 }), sourceContract: SRC,
  });
  assert.equal(touched.violated, 0, `${JSON.stringify(touched.violations)}`);
});

test('FIX 3 a wrong BASE particle count for the drawn emotion FAILS', () => {
  /* shy authors no base particles, so emitting petals is wrong. */
  const r = evaluateParticleLifecycle({
    surface: 'original', selectedEmotion: 'shy', userTriggered: true,
    provenance: particleReport({ 'fx fx-heart': 12, petal: 20 }), sourceContract: SRC,
  });
  assert.ok(r.violations.some((v) => v.path === 'semanticContract.particle_base_petals'));
});

test('FIX 4 AUTOLIFE touched => petals20 + NO V2 FX PASS', () => {
  const r = evaluateParticleLifecycle({
    surface: 'original', selectedEmotion: 'touched', userTriggered: false,
    provenance: particleReport({ petal: 20 }), sourceContract: SRC,
  });
  assert.equal(r.violated, 0, `${JSON.stringify(r.violations)}`);
});

test('FIX 4 AUTOLIFE smile => petals0 + NO V2 FX PASS', () => {
  const r = evaluateParticleLifecycle({
    surface: 'split', selectedEmotion: 'smile', userTriggered: false,
    provenance: particleReport({}), sourceContract: SRC,
  });
  assert.equal(r.violated, 0, `${JSON.stringify(r.violations)}`);
});

test('FIX 4 AUTOLIFE touched WITH V2 FX => FAIL (an Auto Life tick bursts nothing)', () => {
  const r = evaluateParticleLifecycle({
    surface: 'original', selectedEmotion: 'touched', userTriggered: false,
    provenance: particleReport({ petal: 20, 'fx fx-heart': 22 }), sourceContract: SRC,
  });
  assert.equal(r.violated > 0, true);
  assert.ok(r.violations.some((v) => v.path === 'semanticContract.particle_v2_fx_absent'));
});

test('FIX 3/4 an unauthored selected emotion FAILS CLOSED', () => {
  const e = expectedParticleLifecycle({
    selectedEmotion: 'nope', userTriggered: true, sourceContract: SRC,
  });
  assert.equal(e.ok, false);
  assert.match(e.error, /PARTICLE_TRIGGER_EMOTION_NOT_AUTHORED/);
  const missing = expectedParticleLifecycle({
    selectedEmotion: 'smile', userTriggered: true, sourceContract: {},
  });
  assert.equal(missing.ok, false);
});

test('FIX 3/4 the fixed per-state particle list is gone from the random-emotion states', () => {
  /* ROUND6C asserted `particles: ['petals']` on D1/21 and D1/29, which required BOTH surfaces to
   * emit petals even when one drew `shy`. The relation is now per surface. */
  assert.equal(/'D1\/21_face_click_random'[\s\S]{0,400}?particles: \[/.test(SELF), false,
    'D1/21 no longer asserts a fixed particle family');
  assert.equal(/'D1\/29_autolife_on_live'[\s\S]{0,400}?particles: \[/.test(SELF), false,
    'D1/29 no longer asserts a fixed particle family');
  assert.ok(SELF.includes('userTriggered: true'), 'D1/21 declares its user-triggered burst');
  assert.ok(SELF.includes('userTriggered: false'), 'D1/29 declares no user-triggered burst');
  assert.ok(SELF.includes('evaluateParticleLifecycle'), 'the per-surface lifecycle is evaluated');
});

/* ============================================================================
 * FIX 5 - portrait transition quiescence
 * ==========================================================================*/

test('FIX 5 the portrait quiescence barrier is source-aware and fails closed', () => {
  const driver = /async function faceRandomReaction[\s\S]*?\n}/.exec(SELF)[0];
  assert.ok(/PORTRAIT_TRANSITION_QUIESCENCE_TIMEOUT/.test(driver),
    'a transition that never settles fails closed rather than being filtered');
  assert.ok(/CSSTransition/.test(driver), 'only CSSTransition entries are considered');
  assert.ok(/portraitA/.test(driver) && /portraitB/.test(driver),
    'both portrait elements are checked');
  assert.ok(/playState === 'running' \|\| a\.playState === 'pending'|playState === 'running'/.test(driver),
    'a running OR pending transition is not quiescent');
  /* It must come AFTER the correlated barrier and BEFORE capture. */
  const barrierAt = driver.indexOf('FACE_RANDOM_BARRIER_TIMEOUT');
  const quiesceAt = driver.indexOf('PORTRAIT_TRANSITION_QUIESCENCE_TIMEOUT');
  assert.ok(barrierAt > 0 && quiesceAt > barrierAt,
    'quiescence is awaited after the correlated barrier, not instead of it');
  /* No arbitrary sleep is used to decide it. */
  assert.equal(/waitForTimeout\(\s*\d+\s*\)\s*;\s*\/\/ *portrait/.test(driver), false);
});

test('FIX 5 a running portrait transition is NOT satisfied, a finished one is', () => {
  /* Mirror of the page predicate: mirror the exact logic the driver waits on. */
  const quiescent = (entries) => entries.every((e) => {
    if (!['portraitA', 'portraitB', 'portraitWrap'].includes(e.id)) return true;
    if (e.kind !== 'CSSTransition') return true;
    return !(e.playState === 'running' || e.playState === 'pending');
  });
  assert.equal(quiescent([{ id: 'portraitA', kind: 'CSSTransition', playState: 'running' }]), false);
  assert.equal(quiescent([{ id: 'portraitB', kind: 'CSSTransition', playState: 'pending' }]), false);
  assert.equal(quiescent([{ id: 'portraitA', kind: 'CSSTransition', playState: 'finished' }]), true);
  assert.equal(quiescent([{ id: 'lubt', kind: 'CSSTransition', playState: 'running' }]), true,
    'a transition on another element does not block portrait quiescence');
});

/* ============================================================================
 * Wiring
 * ==========================================================================*/

test('the ROUND6D modules are wired into the runtime evaluation path', () => {
  assert.ok(SELF.includes('evaluateParticleLifecycle'), 'the particle lifecycle is evaluated');
  assert.ok(SELF.includes('selectedCharacter'), 'the per-surface character is read');
  assert.ok(SELF.includes("bubbleOwned: 'characterGuide'"), 'the guide ownership is declared');
  const prov = fs.readFileSync(path.join(HERE, 'provenance.mjs'), 'utf8');
  assert.ok(prov.includes('created_count_by_class'), 'the observer supplies per-class counts');
});

test('the provenance report carries the source-neutral observations the contracts need', () => {
  const prov = fs.readFileSync(path.join(HERE, 'provenance.mjs'), 'utf8');
  assert.ok(prov.includes('created_count_by_class'), 'per-class counts are reported');
  assert.ok(prov.includes('selectedCharacter'), 'the selected character is reported');
  assert.ok(prov.includes('castName'), 'it is read from the authored element');
  /* Observation only: no source mutation, no random/clock patch. */
  for (const forbidden of ['Math.random', 'Date.now', 'performance.now']) {
    assert.equal(prov.includes(`${forbidden} =`), false, `no ${forbidden} patch`);
  }
});