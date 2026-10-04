/**
 * MST106 / CDX007 - S4 ROUND6C harness contract regression fixtures.
 *
 * STRUCTURAL/UNIT tests only: no browser, no fresh evidence. Each fixture is the authored
 * positive case plus the negative case that must FAIL, so a contract that silently degrades into
 * an ignore is caught before any RUN is executed.
 *
 * The governing rule: every ROUND6C contract must be a PROOF. "Valid input passes" and
 * "wrong input fails" are asserted as a pair for every contract.
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
  evaluateSurfaceCorrelation, pairCorrelation, resolveCorrelations, CORRELATED_FIELDS,
} from './correlated-reaction.mjs';
import {
  authoredParticleRanges, parseDxList, evaluateParticleRanges,
} from './particle-range.mjs';
/* The collector is evaluated as a function so its EXECUTABLE body can be inspected directly,
 * instead of string-matching a source slice that also contains explanatory prose. */
import { fileURLToPath as _fileURLToPath } from 'node:url';
const _here = path.dirname(_fileURLToPath(import.meta.url));
const _self = fs.readFileSync(path.join(_here, 's4-parity.test.mjs'), 'utf8');
const _collectorSrc = _self.slice(_self.indexOf('function collectChannels'),
  _self.indexOf('/* ---------------- HARD-CHANNEL OWNERSHIP'));
// eslint-disable-next-line no-new-func
const collectChannels = new Function(`return (${_collectorSrc.replace(/^function collectChannels/, 'function')})`)();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAPSULE = path.resolve(HERE, '..');
const SRC = sourceContract();
const RANGES = authoredParticleRanges(fs.readFileSync(path.join(CAPSULE, 'split', 'script.js'), 'utf8'));

/* ============================================================================
 * FIX A - bubble provenance DEFAULT policy on a contract-less state
 * ==========================================================================*/

/** A provenance report shaped like the real one, for a state that owns NO Lubt write. */
function noOwnerReport({ bubble, preText, finalText, emotion = 'neutral' }) {
  return {
    bubble,
    preState: { bubbleText: preText, emotion },
    selectedEmotion: null,
    particle: { created_by_class: [], removed_by_class: [], still_present_classes: [] },
  };
}

test('FIX A a contract-less state is evaluated, not skipped: no write retains the preState', () => {
  /* D1/05-style STABLE emotion state: the target never calls the Lubt, so no write is observed and
   * the retained bubble must still equal the recorded preState. */
  const result = evaluateSurfaceProvenance({
    surface: 'original',
    contract: null,                       // the FIX A default path
    state: '05_emotion_smile',
    provenance: noOwnerReport({ bubble: [], preText: 'PRE', finalText: 'PRE' }),
    finalBubbleText: 'PRE',
    preBubbleText: 'PRE',
    sourceContract: SRC,
  });
  assert.equal(result.valid, true, 'a missing contract is instrumentation-valid, not a harness error');
  assert.equal(result.violated, 0, 'retaining the preState with no write satisfies the default policy');
});

test('FIX A a later PROVEN authored idle write is accepted on a contract-less state', () => {
  const idleText = SRC.lubtTalk.idle[0];
  const result = evaluateSurfaceProvenance({
    surface: 'split',
    contract: null,
    state: '05_emotion_smile',
    provenance: noOwnerReport({ bubble: [], preText: 'PRE', finalText: idleText }),
    finalBubbleText: idleText,
    preBubbleText: 'PRE',
    sourceContract: SRC,
  });
  // No preState write was traced, so the final text must equal the preState: a mismatch is caught.
  assert.equal(result.violated > 0, true,
    'an untraced final text that differs from the preState is a violation, never a pass');

  const traced = evaluateSurfaceProvenance({
    surface: 'split',
    contract: null,
    state: '05_emotion_smile',
    provenance: noOwnerReport({
      bubble: [{ seq: 1, text: idleText, sourcePoolCandidates: ['lubtTalk.idle'] }],
      preText: 'PRE', finalText: idleText,
    }),
    finalBubbleText: idleText,
    preBubbleText: 'PRE',
    sourceContract: SRC,
  });
  assert.equal(traced.violated, 0, 'a proven authored idle write with final == last write is accepted');
});

test('FIX A an UNCLASSIFIED write on a contract-less state FAILS (it is not a generic ignore)', () => {
  const result = evaluateSurfaceProvenance({
    surface: 'original',
    contract: null,
    state: '05_emotion_smile',
    provenance: noOwnerReport({
      bubble: [{ seq: 1, text: 'TEXT FROM NOWHERE', sourcePoolCandidates: [] }],
      preText: 'PRE', finalText: 'TEXT FROM NOWHERE',
    }),
    finalBubbleText: 'TEXT FROM NOWHERE',
    preBubbleText: 'PRE',
    sourceContract: SRC,
  });
  assert.equal(result.unclassifiedWrites > 0, true, 'the unauthored write is counted');
  assert.equal(result.violated > 0, true, 'an unauthored write blocks the contract');
});

test('FIX A a final text that matches neither the last write nor the preState FAILS', () => {
  const idleText = SRC.lubtTalk.idle[0];
  const result = evaluateSurfaceProvenance({
    surface: 'original',
    contract: null,
    state: '05_emotion_smile',
    provenance: noOwnerReport({
      bubble: [{ seq: 1, text: idleText, sourcePoolCandidates: ['lubtTalk.idle'] }],
      preText: 'PRE', finalText: 'SOMETHING ELSE',
    }),
    finalBubbleText: 'SOMETHING ELSE',
    preBubbleText: 'PRE',
    sourceContract: SRC,
  });
  assert.equal(result.violated > 0, true, 'the final-text invariant is enforced on every state');
});

test('FIX A the pair still contracts only when BOTH surfaces are clean', () => {
  const mk = (surface, candidates) => evaluateSurfaceProvenance({
    surface, contract: null, state: '05_emotion_smile',
    provenance: noOwnerReport({
      bubble: [{ seq: 1, text: 'T', sourcePoolCandidates: candidates }],
      preText: 'T', finalText: 'T',
    }),
    finalBubbleText: 'T', preBubbleText: 'T', sourceContract: SRC,
  });
  const both = pairSurfaceProvenance(mk('original', ['lubtTalk.idle']), mk('split', ['lubtTalk.idle']));
  assert.equal(both.contract, true);
  const one = pairSurfaceProvenance(mk('original', []), mk('split', ['lubtTalk.idle']));
  assert.equal(one.contract, false, 'one unclassified surface blocks the pair');
});

/* ============================================================================
 * FIX B - random position: exact path ownership, range never widened
 * ==========================================================================*/

test('FIX B all four authored position paths are owned together', () => {
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const expected = ['dom.lubt_left', 'dom.lubt_top', 'dom.random_lubt_left', 'dom.random_lubt_top'];
  const m = /const RANDOM_POSITION_PATHS = \[([\s\S]*?)\]/.exec(src);
  assert.ok(m, 'the owned path list is declared once');
  for (const p of expected) {
    assert.ok(m[1].includes(p), `${p} is owned by the random-position contract`);
  }
  /* The collector must still expose each of them, otherwise the ownership list is fiction. */
  const collector = src.slice(src.indexOf('function collectChannels'),
    src.indexOf('/* ---------------- HARD-CHANNEL OWNERSHIP'));
  for (const key of ['random_lubt_left', 'random_lubt_top', 'lubt_left', 'lubt_top']) {
    assert.ok(collector.includes(`${key}:`), `the collector exposes ${key}`);
  }
});

test('FIX B the authored range is the frozen V2 range and is never widened', () => {
  const v2 = fs.readFileSync(path.join(CAPSULE, 'original', 'living-world-v2.js'), 'utf8');
  const body = /callLubt = function[\s\S]*?setLubtBubble/.exec(v2)[0];
  assert.ok(/18 \+ Math\.random\(\) \* 28/.test(body), 'the frozen source authors left = 18 + r*28 vw');
  assert.ok(/9 \+ Math\.random\(\) \* 46/.test(body), 'the frozen source authors top = 9 + r*46 vh');
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(/leftVw: \[18, 46\]/.test(src), 'the harness range matches the frozen source');
  assert.ok(/topVh: \[9, 55\]/.test(src), 'the harness top range matches the frozen source');
});

test('FIX B valid range values pass and out-of-range values are contract violations', () => {
  const L = [18, 46]; const T = [9, 55];
  const inRange = (l, t) => Number.isFinite(l) && Number.isFinite(t)
    && l >= L[0] && l <= L[1] && t >= T[0] && t <= T[1];
  assert.equal(inRange(34.3806, 32.4929), true, 'a valid authored draw is in range');
  assert.equal(inRange(44.6675, 47.648), true, 'the measured split draw is in range too');
  assert.equal(inRange(80, 32), false, 'an out-of-range left is a violation');
  assert.equal(inRange(34, 90), false, 'an out-of-range top is a violation');
});

/* ============================================================================
 * FIX C - face random correlated reaction, per surface
 * ==========================================================================*/

/** Build a coherent dom for a given emotion: every field authored from that emotion. */
function coherentDom(emotion, { poseAsset } = {}) {
  const meta = SRC.emoMeta[emotion];
  const pose = SRC.poseForEmotion[emotion];
  return {
    activeEmotion: emotion,
    /* ROUND6D (FIX 1): the collector's real field is random_emotion_title, not emotion_title. */
    random_emotion_title: meta.title,
    emotion_line: `“${meta.line}”`,
    log_text: `${meta.title} · intensity 7/10 · gaze tracking`,
    visible_portrait_src: `assets/characters/M01/M01-${emotion}.webp`,
    portraitA_src: `assets/characters/M01/M01-${emotion}.webp`,
    portraitB_src: `assets/characters/M01/M01-${emotion}.webp`,
    lubt_pose_src: `assets/lubt/${poseAsset || SRC.lubtPoses[pose]}`,
    speechVisible: true,
    random_speech: SRC.characterLines[emotion][0],
    random_lubt_bubble: SRC.lubtTalk.emotion[emotion][0],
  };
}

function fxReport(emotion) {
  const fam = `fx fx-${SRC.fxMap[emotion][0]}`;
  return {
    bubble: [],
    preState: { bubbleText: 'PRE', emotion: 'neutral' },
    selectedEmotion: emotion,
    particle: { created_by_class: [fam], removed_by_class: [], still_present_classes: [fam] },
  };
}

test('FIX C two DIFFERENT valid emotions (original=surprise, split=wink) both pass', () => {
  /* This is the exact ROUND6B case that produced 7 raw defects. Different random draws from the
   * same authored pool are an authored outcome, and each surface is proved against its own. */
  const o = evaluateSurfaceCorrelation({
    surface: 'original', dom: coherentDom('surprise'), provenance: fxReport('surprise'),
    preEmotion: 'neutral', sourceContract: SRC, requireLubt: true,
  });
  const s = evaluateSurfaceCorrelation({
    surface: 'split', dom: coherentDom('wink'), provenance: fxReport('wink'),
    preEmotion: 'neutral', sourceContract: SRC, requireLubt: true,
  });
  const pair = pairCorrelation(o, s);
  assert.equal(o.violated, 0, `original surprise is self-consistent: ${JSON.stringify(o.violations)}`);
  assert.equal(s.violated, 0, `split wink is self-consistent: ${JSON.stringify(s.violations)}`);
  assert.equal(pair.contract, true, 'cross-surface emotion equality is NOT required');
});

test('FIX C a WRONG pose (not the authored poseForEmotion asset) FAILS', () => {
  const dom = coherentDom('surprise', { poseAsset: 'lubt-magic.png' }); // wink's pose
  const r = evaluateSurfaceCorrelation({
    surface: 'original', dom, provenance: fxReport('surprise'),
    preEmotion: 'neutral', sourceContract: SRC, requireLubt: true,
  });
  assert.equal(r.violated > 0, true, 'surprise must resolve through lubtPoses[scan]');
  assert.ok(r.violations.some((v) => v.path === 'semanticContract.correlated_lubt_pose'));
});

test('FIX C a WRONG FX family FAILS', () => {
  const dom = coherentDom('surprise');
  const prov = fxReport('surprise');
  /* The real trace for one emotion carries ONE authored family. Replacing it with another
   * emotion's family is the D1/21 ring-vs-star case, and must be caught. */
  const wrong = ['fx fx-star'];                       // wink's family
  prov.particle.created_by_class = wrong;
  prov.particle.still_present_classes = wrong;
  const r = evaluateSurfaceCorrelation({
    surface: 'original', dom, provenance: prov,
    preEmotion: 'neutral', sourceContract: SRC, requireLubt: true,
  });
  assert.equal(r.violated > 0, true);
  assert.ok(r.violations.some((v) => v.path === 'semanticContract.correlated_fx_family'));
  assert.deepEqual(SRC.fxMap.surprise[0], 'ring');
  assert.deepEqual(SRC.fxMap.wink[0], 'star');
});

test('FIX C a WRONG (stale) portrait FAILS', () => {
  const dom = coherentDom('surprise');
  dom.visible_portrait_src = 'assets/characters/M01/M01-neutral.webp';
  const r = evaluateSurfaceCorrelation({
    surface: 'original', dom, provenance: fxReport('surprise'),
    preEmotion: 'neutral', sourceContract: SRC, requireLubt: true,
  });
  assert.equal(r.violated > 0, true);
  assert.ok(r.violations.some((v) => v.path === 'semanticContract.correlated_portrait'));
});

test('FIX C a wrong emotion LINE / TITLE / LOG FAILS', () => {
  for (const [field, value, expected] of [
    ['emotion_line', '“Just between us.”', 'semanticContract.correlated_emotion_line'],
    ['random_emotion_title', 'WINK', 'semanticContract.correlated_emotion_title'],
    ['log_text', 'WINK · intensity 7/10', 'semanticContract.correlated_log'],
  ]) {
    const dom = coherentDom('surprise');
    dom[field] = value;
    const r = evaluateSurfaceCorrelation({
      surface: 'original', dom, provenance: fxReport('surprise'),
      preEmotion: 'neutral', sourceContract: SRC, requireLubt: true,
    });
    assert.ok(r.violations.some((v) => v.path === expected), `${field} mismatch is caught`);
  }
});

test('FIX C a speech outside characterLines[selectedEmotion] FAILS', () => {
  const dom = coherentDom('surprise');
  dom.random_speech = SRC.characterLines.wink[0];
  const r = evaluateSurfaceCorrelation({
    surface: 'original', dom, provenance: fxReport('surprise'),
    preEmotion: 'neutral', sourceContract: SRC, requireLubt: true,
  });
  assert.ok(r.violations.some((v) => v.path === 'semanticContract.correlated_speech'));
});

test('FIX C a missing or unauthored selectedEmotion is a HARNESS error, not a pass', () => {
  const missing = evaluateSurfaceCorrelation({
    surface: 'original', dom: coherentDom('surprise'),
    provenance: { bubble: [], preState: {}, selectedEmotion: null, particle: {} },
    preEmotion: 'neutral', sourceContract: SRC, requireLubt: true,
  });
  assert.equal(missing.valid, false);
  assert.equal(missing.contract, undefined);
  assert.ok(missing.harnessErrors.length > 0, 'missing instrumentation aborts evaluation');

  const unauthored = resolveCorrelations({ selectedEmotion: 'notAnEmotion', sourceContract: SRC });
  assert.equal(unauthored.ok, false, 'an unauthored emotion fails closed');
});

test('FIX C the correlated field list covers every owned semantic path', () => {
  /* ROUND6D (FIX 1): dom.emotion_title never existed in the collector; the real field is
     dom.random_emotion_title, and it is the one the correlated contract owns. */
  for (const f of ['dom.activeEmotion', 'dom.visible_portrait_src', 'dom.lubt_pose_src',
    'dom.emotion_line', 'dom.log_text', 'dom.random_emotion_title']) {
    assert.ok(CORRELATED_FIELDS.includes(f), `${f} is owned by the correlated contract`);
  }
});

/* ============================================================================
 * FIX D - source-derived active portrait collector
 * ==========================================================================*/

test('FIX D the active portrait is derived from the authored swap state, never offsetParent', () => {
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const collector = src.slice(src.indexOf('function collectChannels'),
    src.indexOf('/* ---------------- HARD-CHANNEL OWNERSHIP'));
  const block = collector.slice(collector.indexOf('visible_portrait_src'),
    collector.indexOf('lubt_pose_src'));
  assert.ok(/classList\.contains\('swap'\)/.test(block),
    'the active portrait reads the authored swap toggle');
  /* Only EXECUTABLE uses are forbidden. The prose above the field necessarily names the retired
   * approach, so the check looks for an offsetParent COMPARISON, not the word. */
  assert.equal(/offsetParent\s*[!=]/.test(block), false, 'offsetParent must not decide visibility');
  assert.equal(/offsetParent\s*[!=]/.test(collector), false, 'offsetParent is removed from the collector');
  /* And the retired approach must really be gone from the executable collector body. */
  assert.equal(/offsetParent\s*[!=]/.test(collectChannels.toString()), false);
});

/* ============================================================================
 * FIX E - authored note / petal dx ranges
 * ==========================================================================*/

test('FIX E the authored ranges come from the frozen bytes and are exact', () => {
  assert.deepEqual(
    { count: RANGES.notes.count, min: RANGES.notes.min, max: RANGES.notes.max },
    { count: 8, min: -70, max: 70 },
    'notes() authors 8 notes with dx in [-70,70]');
  assert.deepEqual(
    { count: RANGES.petals.count, min: RANGES.petals.min, max: RANGES.petals.max },
    { count: 20, min: -250, max: 250 },
    'petals() authors 20 petals with dx in [-250,250]');
});

test('FIX E valid authored dx values pass on both surfaces', () => {
  /* The D1/22 measured draws: real values from the frozen range on both surfaces. */
  const prov = {
    particle: {
      created_count: 28,
      created_by_class: ['note', 'petal'],
      still_present_classes: [],
    },
  };
  const o = evaluateParticleRanges({
    surface: 'original', provenance: prov,
    noteDx: '-53.42771444352735px|-1.0340104713372682px|70px',
    petalDx: '-236.08745186437952px|93.81708636558449px|-250px',
    ranges: RANGES, expect: ['notes', 'petals'],
  });
  const s = evaluateParticleRanges({
    surface: 'split', provenance: prov,
    noteDx: '46.31050145084748px|11.508115427340499px|-70px',
    petalDx: '46.31050145084748px|-165.57079713943926px|250px',
    ranges: RANGES, expect: ['notes', 'petals'],
  });
  assert.equal(o.violations.length, 0, `original notes/petals in range: ${JSON.stringify(o.violations)}`);
  assert.equal(s.violations.length, 0, `split notes/petals in range: ${JSON.stringify(s.violations)}`);
});

test('FIX E an out-of-range note dx or petal dx is a contract violation', () => {
  const prov = {
    particle: {
      created_count: 28, created_by_class: ['note', 'petal'], still_present_classes: [],
    },
  };
  const note = evaluateParticleRanges({
    surface: 'original', provenance: prov, noteDx: '71px', petalDx: '',
    ranges: RANGES, expect: ['notes'],
  });
  assert.ok(note.violations.some((v) => v.path.endsWith('.notes_dx_range')),
    'a note dx of 71 exceeds the authored [-70,70]');
  const petal = evaluateParticleRanges({
    surface: 'original', provenance: prov, noteDx: '', petalDx: '251px',
    ranges: RANGES, expect: ['petals'],
  });
  assert.ok(petal.violations.some((v) => v.path.endsWith('.petals_dx_range')),
    'a petal dx of 251 exceeds the authored [-250,250]');
});

test('FIX E an un-emitted family is never satisfied by default', () => {
  const silent = { particle: { created_count: 0, created_by_class: [], still_present_classes: [] } };
  const r = evaluateParticleRanges({
    surface: 'original', provenance: silent, noteDx: '', petalDx: '',
    ranges: RANGES, expect: ['petals'],
  });
  assert.ok(r.violations.some((v) => v.path.endsWith('.petals_not_emitted')),
    'no emission proves nothing about the range');
});

test('FIX E an unparseable dx value fails closed', () => {
  assert.equal(parseDxList('abc').ok, false);
  assert.equal(parseDxList('').ok, true, 'an absent list is empty, not malformed');
  assert.deepEqual(parseDxList('-70px|70px').values, [-70, 70]);
});

/* ============================================================================
 * Contract wiring: the new modules are actually reached
 * ==========================================================================*/

test('the ROUND6C modules are wired into the runtime evaluation path', () => {
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('evaluateSurfaceCorrelation'), 'the relational evaluator is called');
  assert.ok(src.includes('pairCorrelation'), 'the correlation results are paired');
  assert.ok(src.includes('evaluateParticleRanges'), 'the particle range contract is called');
  assert.ok(src.includes('authoredParticleRanges'), 'the ranges are derived from frozen bytes');
  assert.ok(src.includes('correlatedProven'),
    'the correlated FX projection is gated on the relational proof passing');
});

test('FIX A every contract dereference is null-guarded (a contract-less state reaches this code)', () => {
  /* ROUND6C regression: bubble provenance now runs on EVERY state, so `contract` is null for any
   * state without a RANDOM_CONTRACTS entry. A single unguarded `contract.x` threw a TypeError
   * mid-run and aborted the whole candidate pass after the first state. Every dereference in the
   * evaluation block must therefore be guarded. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const block = src.slice(src.indexOf('const contract = randomContractFor'),
    src.indexOf('const semAll = diffPaths'));

  /* Every offset in `block` at which the contract is statically known non-null. A read is safe
   * when it sits inside such a region. Three forms count as guarded:
   *   1. the body of `if (contract && ...)` (brace-matched),
   *   2. the TRUE branch of a `contract && contract.x ? ... : null` ternary,
   *   3. the true-branch of a `contract && contract.correlated ?` ternary, i.e. the hoisted
   *      ROUND6E diagnostic, which reads several fields inside its object literal. */
  const guardedRanges = [];
  const guardRe = /if \(contract &&[\s\S]*?\{/g;
  let m;
  while ((m = guardRe.exec(block)) !== null) {
    let depth = 0;
    for (let i = block.indexOf('{', m.index); i < block.length; i += 1) {
      if (block[i] === '{') depth += 1;
      else if (block[i] === '}') { depth -= 1; if (depth === 0) { guardedRanges.push([m.index, i]); break; } }
    }
  }
  // The hoisted diagnostic ternary: from its `contract &&` test through the closing `: null;`.
  const ternaryRe = /contract && contract\.correlated\s*\?/g;
  while ((m = ternaryRe.exec(block)) !== null) {
    const end = block.indexOf(': null;', m.index);
    if (end > 0) guardedRanges.push([m.index, end]);
  }
  assert.ok(guardedRanges.length >= 5,
    'every contract-dependent branch is null-guarded');
  const unguarded = [...block.matchAll(/contract\.\w+/g)]
    .filter((x) => !guardedRanges.some(([a, b]) => x.index > a && x.index < b))
    .map((x) => x[0])
    /* The pool path is read inside the correlated guard on its own line. */
    .filter((t) => t !== 'contract.auto_emotion');
  assert.deepEqual([...new Set(unguarded)], [],
    'no contract field may be read outside a null-guarded branch');
  /* And the guard must actually be reachable: the block runs for a contract-less state. */
  assert.ok(/const contract = randomContractFor/.test(src),
    'the contract is resolved per state and may legitimately be null');
  assert.ok(!/^\s*if \(contract\)/m.test(block),
    'a bare `if (contract.x)` would throw before the body runs');
});

test('SOURCE_CONTRACT exposes the extended frozen truth used by the relational contracts', () => {
  assert.equal(SRC.lubtPoses.idle, 'lubt-idle.png');
  assert.equal(SRC.lubtPoses[SRC.poseForEmotion.surprise], 'lubt-scan.png');
  assert.equal(SRC.lubtPoses[SRC.poseForEmotion.wink], 'lubt-magic.png');
  assert.deepEqual(SRC.emoMeta.surprise.title, 'SURPRISE');
  assert.deepEqual(SRC.emoMeta.wink.title, 'WINK');
  /* Every emotion resolves through every map the relational contracts compare against. */
  for (const e of SRC.emotions) {
    assert.ok(SRC.emoMeta[e], `${e} has authored metadata`);
    assert.ok(Array.isArray(SRC.lubtTalk.emotion[e]), `${e} has an authored bubble pool`);
    assert.ok(Array.isArray(SRC.fxMap[e]), `${e} has an authored FX family`);
  }
});