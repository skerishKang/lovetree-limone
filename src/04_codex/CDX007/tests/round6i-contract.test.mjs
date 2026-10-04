/**
 * MST106 / CDX007 - S4 ROUND6I contract-insertion ordering + lubt-bubble quiescence.
 *
 * FIX A - `dom.random_note_dx` / `dom.random_petal_dx` had NO owner.
 *   They were contracted only by the FIX E block, which runs for a state carrying a fixed
 *   `contract.particles` family list. ROUND6G correctly removed that list from the random-emotion
 *   states (one fixed family is wrong when the drawn emotion decides the family), which left the
 *   dx fields unowned while both surfaces still proved the relation.
 *
 *   Required order: source relation proof -> exact ownership insertion -> semantic diff filtering.
 *   Forbidden: a post-filter `CONTRACTED.add()` that retroactively erases an existing defect.
 *
 * FIX B - `lubtBubble|unknown|CSSTransition|finite` is a capture-phase artifact of the authored
 *   `.lubt-bubble { transition: .25s }` that `callLubt()`'s `.talk` legitimately starts. The
 *   transition is neither waived nor filtered; the capture barrier waits for it, then RE-VALIDATES
 *   the correlated relations so a closed semantic window cannot be laundered by the wait.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { sourceContract } from './source-contract.mjs';
import { evaluateBaseParticleRelation } from './correlated-reaction.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = sourceContract();
const SELF = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');

const DX_PATHS = (() => {
  const m = /const BASE_PARTICLE_DX_PATHS = \[([\s\S]*?)\];/.exec(SELF);
  assert.ok(m, 'the runtime declares BASE_PARTICLE_DX_PATHS');
  return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
})();

/* ------------------------------------------------------------------ FIX A */

function surface(emotion, { petal, note, petalDx, noteDx, animations = null } = {}) {
  const authored = SRC.baseParticleTriggers[emotion];
  const aPetals = authored === 'petals' ? SRC.particleCounts.petals : 0;
  const aNotes = authored === 'notes' ? SRC.particleCounts.notes : 0;
  const nP = petal === undefined ? aPetals : petal;
  const nN = note === undefined ? aNotes : note;
  const byClass = {};
  if (nP > 0) byClass.petal = nP;
  if (nN > 0) byClass.note = nN;
  const dx = (n) => Array.from({ length: n }, () => '0px').join('|');
  return {
    selectedEmotion: emotion,
    provenance: {
      bubble: [], preState: { bubbleText: 'PRE', emotion: 'neutral' },
      particle: {
        created_count: nN + nP, created_count_by_class: byClass,
        created_by_class: Object.keys(byClass), still_present_classes: [],
      },
    },
    petalDx: petalDx === undefined ? dx(nP) : petalDx,
    noteDx: noteDx === undefined ? dx(nN) : noteDx,
    animations: animations === null
      ? [
        ...(nN > 0 ? ['note|note|CSSAnimation|finite'] : []),
        ...(nP > 0 ? ['petal|petal|CSSAnimation|finite'] : []),
      ] : animations,
  };
}

function evaluate(side, rec) {
  return evaluateBaseParticleRelation({
    surface: side, selectedEmotion: rec.selectedEmotion, provenance: rec.provenance,
    noteDx: rec.noteDx, petalDx: rec.petalDx,
    observedAnimations: rec.animations, sourceContract: SRC,
  });
}

function ownedAfterPair(recA, recB) {
  const a = evaluate('original', recA);
  const b = evaluate('split', recB);
  if (!(a.valid && a.violated === 0 && b.valid && b.violated === 0)) return new Set();
  return new Set(DX_PATHS);
}

test('ROUND6I 1 D1/29 touched + 20 petals valid => base particle pair PASS', () => {
  const a = evaluate('split', surface('touched'));
  const b = evaluate('original', surface('wink'));
  assert.equal(a.violated, 0, `${JSON.stringify(a.violations)}`);
  assert.equal(b.violated, 0, `${JSON.stringify(b.violations)}`);
});

test('ROUND6I 2 a passing pair inserts BOTH dx paths, before any filtering', () => {
  const owned = ownedAfterPair(surface('touched'), surface('wink'));
  assert.equal(owned.has('dom.random_petal_dx'), true,
    'the split surface drew touched, so the petal dx is owned');
  assert.equal(owned.has('dom.random_note_dx'), true,
    'the same relation owns the note dx path');
  /* And the insertion is inside the proven branch, strictly before the diff is built. */
  const gateAt = SELF.indexOf('if (basePair.contract)');
  const insertAt = SELF.indexOf('for (const f of BASE_PARTICLE_DX_PATHS) CONTRACTED.add(f);');
  const diffAt = SELF.indexOf('const semAll = diffPaths(');
  assert.ok(gateAt > 0, 'the proven branch exists');
  assert.ok(insertAt > gateAt, 'insertion is inside the proven branch');
  assert.ok(diffAt > insertAt, 'insertion strictly PRECEDES the semantic diff build');
});

test('ROUND6I 3 a wrong petal count FAILS before ownership', () => {
  assert.equal(ownedAfterPair(surface('touched', { petal: 19 }), surface('wink')).size, 0);
  assert.equal(ownedAfterPair(surface('touched', { petal: 21 }), surface('wink')).size, 0);
});

test('ROUND6I 4 an out-of-range petal dx FAILS before ownership', () => {
  const dx = ['251', ...Array.from({ length: 19 }, () => '0px')].join('|');
  assert.equal(ownedAfterPair(surface('touched', { petalDx: dx }), surface('wink')).size, 0,
    'an out-of-range dx must block ownership');
});

test('ROUND6I 5 a late-ownership fixture FAILS', () => {
  /* Ownership must not be reachable after the diff. The only CONTRACTED.add for these fields is
   * inside the proven branch, and nothing after `diffPaths` re-inserts them. */
  const diffAt = SELF.indexOf('const semAll = diffPaths(');
  const after = SELF.slice(diffAt);
  assert.equal(after.includes("CONTRACTED.add('dom.random_petal_dx')"), false,
    'no post-diff insertion of the petal dx path');
  assert.equal(after.includes('BASE_PARTICLE_DX_PATHS'), false,
    'no post-diff insertion of the dx list');
});

test('ROUND6I 6 a post-filter CONTRACTED.add cannot silently erase an existing defect', () => {
  /* The defect list is built from the raw diff and filtered against CONTRACTED; a later insertion
   * cannot reach it. The filter is the ONLY place CONTRACTED is consulted. */
  const filterAt = SELF.indexOf('const semProj = semAll.filter((d) => !CONTRACTED.has(d.path));');
  assert.ok(filterAt > 0, 'the semantic filter consults CONTRACTED once');
  assert.ok(SELF.includes('defects.push({ path: `semantic.${d.path}`'),
    'an unfiltered diff becomes a defect');
  assert.ok(SELF.includes('for (const d of semProj) defects.push'),
    'only the FILTERED set becomes semantic defects');
  /* And the defect list is never mutated by a later CONTRACTED.add. */
  assert.equal(/defects\s*=\s*defects\.filter/.test(SELF), false,
    'defects are not re-filtered after the fact');
});

test('ROUND6I the random-emotion states carry no fixed particle family list', () => {
  /* The FIX E block owns the dx fields only for a state with `contract.particles`. If either
   * random-emotion state regained a fixed list, the two ownership routes would double up. */
  assert.equal(/'D1\/29_autolife_on_live'[\s\S]{0,900}?particles: \[/.test(SELF), false);
  assert.equal(/'D1\/21_face_click_random'[\s\S]{0,900}?particles: \[/.test(SELF), false);
});

/* ------------------------------------------------------------------ FIX B */

/** Mirror of the driver's in-page bubble-quiescence predicate. */
function bubbleQuiescent(entries) {
  const pending = entries.filter((a) => {
    const isBubble = a.target === 'lubtBubble'
      || (typeof a.cls === 'string' && a.cls.indexOf('lubt-bubble') >= 0);
    if (!isBubble) return false;
    if (a.kind !== 'CSSTransition') return false;
    return a.playState === 'running' || a.playState === 'pending';
  });
  return pending.length === 0;
}

test('ROUND6I B1 a running lubtBubble CSSTransition is NOT quiescent', () => {
  assert.equal(bubbleQuiescent([{ target: 'lubtBubble', kind: 'CSSTransition', playState: 'running' }]), false);
});

test('ROUND6I B2 a pending lubtBubble CSSTransition is NOT quiescent', () => {
  assert.equal(bubbleQuiescent([{ target: 'lubtBubble', kind: 'CSSTransition', playState: 'pending' }]), false);
});

test('ROUND6I B3 a quiescent bubble with a valid relation PASSes', () => {
  assert.equal(bubbleQuiescent([{ target: 'lubtBubble', kind: 'CSSTransition', playState: 'finished' }]), true);
  assert.ok(SELF.includes('LUBT_BUBBLE_TRANSITION_QUIESCENCE_TIMEOUT'),
    'the driver fails closed rather than capturing mid-transition');
});

test('ROUND6I B4 a broken relation after quiescence FAILS (the wait cannot launder it)', () => {
  /* Revalidation must re-read the correlated relations and reject a closed semantic window. */
  assert.ok(SELF.includes('FACE_RANDOM_POST_QUIESCENCE_INVALID'),
    'a closed semantic window fails closed');
  /* Slice from the function declaration to the NEXT top-level declaration, so the whole driver
   * body is examined rather than stopping at its first closing brace. */
  const driverStart = SELF.indexOf('async function faceRandomReaction');
  const driverEnd = SELF.indexOf('\nconst ', driverStart);
  const driver = SELF.slice(driverStart, driverEnd > 0 ? driverEnd : undefined);
  const bubbleAt = driver.indexOf('LUBT_BUBBLE_TRANSITION_QUIESCENCE_TIMEOUT');
  const revalAt = driver.indexOf('FACE_RANDOM_POST_QUIESCENCE_INVALID');
  assert.ok(bubbleAt > 0 && revalAt > bubbleAt,
    'revalidation happens AFTER the quiescence wait, not instead of it');
  /* And it re-checks the specific relations the instruction names. */
  const reval = driver.slice(revalAt);
  for (const probe of ["classList.contains('show')", "classList.contains('talk')",
    'lubtBubble', 'lubtImg']) {
    assert.ok(reval.includes(probe), `revalidation re-checks ${probe}`);
  }
});

test('ROUND6I B5 an unrelated element transition does not affect the bubble barrier', () => {
  assert.equal(bubbleQuiescent([{ target: 'lubt', kind: 'CSSTransition', playState: 'running' }]), true);
  assert.equal(bubbleQuiescent([{ target: 'portraitA', kind: 'CSSTransition', playState: 'running' }]), true);
});

test('ROUND6I B6 only a finite CSSTransition is a quiescence target', () => {
  assert.equal(bubbleQuiescent([{ target: 'lubtBubble', kind: 'CSSAnimation', playState: 'running' }]), true,
    'a CSSAnimation on the bubble is not a transition');
});

test('ROUND6I B7 the transition inventory is never filtered or contracted', () => {
  /* The fix is a capture barrier, not an inventory filter: no predicate may claim a
   * lubtBubble CSSTransition, and no CONTRACTED.add may name it. */
  /* Collect the literal regex source of each `const isX = (k) => /…/` declaration. The source is
   matched up to `.test` so the multi-line isBaseParticleAnim form is captured exactly. */
  const predicates = [...SELF.matchAll(/const is\w+\s*=\s*\(k\)\s*=>\s*(\/.*?\/)\s*\.test/gs)]
    .map((m) => m[1]);
  assert.ok(predicates.length >= 2, `the runtime declares its animation predicates (got ${predicates.length})`);
  for (const srcRe of predicates) {
    assert.equal(/lubtBubble|unknown|CSSTransition/.test(srcRe), false,
      `no predicate matches a lubtBubble CSSTransition: ${srcRe}`);
  }
  /* And the only animation categories any predicate may name. */
  const named = predicates.join(' ');
  assert.equal(/fxBurst/.test(named), true, 'the correlated FX predicate is present');
  assert.equal(/note\|petal/.test(named), true, 'the base-particle predicate is present');
  assert.equal(SELF.includes("CONTRACTED.add('animations.MISSING_ON_SPLIT"), false);
  assert.equal(/animations\.[A-Z_]+\s*\)?\s*=>\s*false/.test(SELF), false,
    'no animation channel is wholesale suppressed');
});