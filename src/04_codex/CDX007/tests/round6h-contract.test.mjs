/**
 * MST106 / CDX007 - S4 ROUND6H leaf-path ownership correction.
 *
 * `dom.particle_families` is an OBJECT keyed by the authored parent element id, so diffPaths()
 * reports the difference at the LEAF (`dom.particle_families.notes`), never at the bare parent.
 * ROUND6F contracted the parent, which does not cover its leaves, so a source-proven note emission
 * re-entered as a raw leaf defect on D1/21.
 *
 * These fixtures pin EXACT leaf ownership:
 *   - the two authored leaves are owned,
 *   - an unrelated child (`dom.particle_families.unknown`) is NOT owned and stays raw,
 *   - parent-only ownership does NOT satisfy the leaf case,
 *   - and ownership still requires the per-surface source relation to have passed.
 *
 * No prefix/wildcard ownership, no generic particle waiver.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { sourceContract } from './source-contract.mjs';
import {
  evaluateBaseParticleRelation, expectedBaseParticleRelation,
} from './correlated-reaction.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = sourceContract();
const SELF = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');

/* Pull the REAL leaf-path list out of the runtime so this file cannot drift from it. */
const listDecl = /const BASE_PARTICLE_LEAF_PATHS = \[([\s\S]*?)\];/.exec(SELF);
assert.ok(listDecl, 'the runtime declares BASE_PARTICLE_LEAF_PATHS');
const LEAF_PATHS = listDecl[1].split(',')
  .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
  .filter(Boolean);

/** Mirror of the runtime's diffPaths leaf naming for a `particle_families` object. */
function leafPath(key) { return `dom.particle_families.${key}`; }

/** A surface with a given selected emotion and explicit observed base lifecycle. */
function surface(emotion, { note, petal, noteDx, petalDx, animations = null } = {}) {
  const rel = expectedBaseParticleRelation({ selectedEmotion: emotion, sourceContract: SRC });
  const aNote = rel.family === 'note' ? rel.count : 0;
  const aPetal = rel.family === 'petal' ? rel.count : 0;
  const nNotes = note === undefined ? aNote : note;
  const nPetals = petal === undefined ? aPetal : petal;
  const byClass = {};
  if (nNotes > 0) byClass.note = nNotes;
  if (nPetals > 0) byClass.petal = nPetals;
  const dx = (n) => Array.from({ length: n }, () => '0px').join('|');
  return {
    selectedEmotion: emotion,
    provenance: {
      bubble: [], preState: { bubbleText: 'PRE', emotion: 'neutral' },
      particle: {
        created_count: Object.values(byClass).reduce((x, y) => x + y, 0),
        created_count_by_class: byClass,
        created_by_class: Object.keys(byClass),
        still_present_classes: [],
      },
    },
    noteDx: noteDx === undefined ? dx(nNotes) : noteDx,
    petalDx: petalDx === undefined ? dx(nPetals) : petalDx,
    animations: animations === null
      ? [
        ...(nNotes > 0 ? ['note|note|CSSAnimation|finite'] : []),
        ...(nPetals > 0 ? ['petal|petal|CSSAnimation|finite'] : []),
      ]
      : animations,
  };
}

function evaluate(side, rec) {
  return evaluateBaseParticleRelation({
    surface: side, selectedEmotion: rec.selectedEmotion, provenance: rec.provenance,
    noteDx: rec.noteDx, petalDx: rec.petalDx,
    observedAnimations: rec.animations, sourceContract: SRC,
  });
}

/** What the runtime would insert into CONTRACTED for this pair, mirroring the real branch. */
function contractedPaths(recA, recB) {
  const a = evaluate('original', recA);
  const b = evaluate('split', recB);
  if (!(a.valid && a.violated === 0 && b.valid && b.violated === 0)) return new Set();
  return new Set(LEAF_PATHS);
}

/* ---------------------------------------------------------------- the two leaves */

test('ROUND6H the runtime declares exactly the two authored leaf paths', () => {
  assert.deepEqual(LEAF_PATHS.sort(),
    ['dom.particle_families.notes', 'dom.particle_families.petals']);
});

test('ROUND6H 1 sing + notes8 valid => dom.particle_families.notes CONTRACTED', () => {
  const owned = contractedPaths(surface('sing'), surface('smile'));
  assert.equal(owned.has('dom.particle_families.notes'), true);
  assert.equal(owned.has('dom.particle_families.petals'), true,
    'both leaves are owned once the relation passes on both surfaces');
});

test('ROUND6H 3 touched + petals20 valid => dom.particle_families.petals CONTRACTED', () => {
  const owned = contractedPaths(surface('smile'), surface('touched'));
  assert.equal(owned.has('dom.particle_families.petals'), true);
});

test('ROUND6H 4 laugh + petals20 valid => PASS', () => {
  const rec = surface('laugh');
  assert.equal(rec.provenance.particle.created_count_by_class.petal, 20, 'laugh authors 20 petals');
  const r = evaluate('split', rec);
  assert.equal(r.violated, 0, `${JSON.stringify(r.violations)}`);
});

test('ROUND6H 2 non-sing + notes absent => PASS', () => {
  const r = evaluate('split', surface('wink'));
  assert.equal(r.violated, 0, `${JSON.stringify(r.violations)}`);
  assert.equal(r.provenance, undefined);
});

/* ---------------------------------------------------------------- negative counts */

test('ROUND6H 5/6 sing + notes7 or notes9 => FAIL (no leaf contracted)', () => {
  for (const n of [7, 9]) {
    const owned = contractedPaths(surface('sing', { note: n }), surface('smile'));
    assert.equal(owned.size, 0, `notes=${n} must contract nothing`);
  }
});

test('ROUND6H 7 non-sing + notes>0 => FAIL', () => {
  const r = evaluate('original', surface('wink', {
    note: 8, animations: ['note|note|CSSAnimation|finite'],
  }));
  assert.equal(r.violated > 0, true);
  assert.equal(contractedPaths(surface('wink', { note: 8 }), surface('smile')).size, 0);
});

test('ROUND6H 8 touched + petals19 or petals21 => FAIL', () => {
  for (const n of [19, 21]) {
    assert.equal(evaluate('original', surface('touched', { petal: n })).violated > 0, true);
    assert.equal(contractedPaths(surface('touched', { petal: n }), surface('smile')).size, 0);
  }
});

test('ROUND6H 9 another emotion + petals>0 => FAIL', () => {
  const r = evaluate('original', surface('shy', {
    petal: 20, animations: ['petal|petal|CSSAnimation|finite'],
  }));
  assert.equal(r.violated > 0, true);
});

/* ---------------------------------------------- parent-only must not satisfy a leaf */

test('ROUND6H 10 parent-only ownership does NOT satisfy the leaf case', () => {
  /* The ROUND6F shape: contracting the bare parent. It must not appear in the owned set, and the
   * leaf diff path must still be unowned under it. */
  assert.equal(LEAF_PATHS.includes('dom.particle_families'), false,
    'the bare parent is not an owned path');
  const owned = contractedPaths(surface('sing'), surface('smile'));
  assert.equal(owned.has('dom.particle_families'), false,
    'parent-only ownership is rejected');
  /* And a leaf diff is matched by EXACT equality, never by a parent/prefix rule. */
  const parentOwned = new Set(['dom.particle_families']);
  for (const leaf of LEAF_PATHS) {
    assert.equal(parentOwned.has(leaf), false,
      `${leaf} is not covered by parent-only ownership`);
  }
});

test('ROUND6H the runtime matches the leaf by EXACT equality, never a prefix', () => {
  /* The forbidden shape is `path.startsWith('dom.particle_families') => ignore`. Ownership is a
   * Set membership test, so a leaf is owned only when its exact string was inserted. */
  assert.ok(SELF.includes('for (const f of BASE_PARTICLE_LEAF_PATHS) CONTRACTED.add(f);'),
    'the runtime inserts the explicit leaf list');
  assert.equal(/startsWith\(['"]dom\.particle_families/.test(SELF), false,
    'no prefix ownership of dom.particle_families');
  assert.equal(/CONTRACTED\.add\('dom\.particle_families'\)/.test(SELF), false,
    'the bare parent is not contracted');
});

/* --------------------------------------------------- unknown child stays raw */

test('ROUND6H 11 an unrelated child dom.particle_families.unknown remains raw', () => {
  assert.equal(LEAF_PATHS.includes('dom.particle_families.unknown'), false,
    'an unauthored child is not owned');
  const owned = contractedPaths(surface('sing'), surface('touched'));
  assert.equal(owned.has('dom.particle_families.unknown'), false,
    'it stays uncontracted even on a fully passing pair');
  /* Every possible child key is checked: only the two authored ones may ever be owned. */
  for (const key of ['notes', 'petals', 'unknown', 'fx', 'sparkle', '']) {
    const p = key ? leafPath(key) : 'dom.particle_families';
    const expectedOwned = key === 'notes' || key === 'petals';
    assert.equal(LEAF_PATHS.includes(p), expectedOwned,
      `${p || 'parent'} ownership = ${expectedOwned}`);
  }
});

/* ---------------------------------------------------------------- ownership gate */

test('ROUND6H leaf ownership requires the per-surface relation to have passed', () => {
  /* A passing surface plus a failing surface must contract NOTHING. */
  const good = surface('sing');
  const bad = surface('sing', { note: 7 });
  assert.equal(contractedPaths(good, bad).size, 0,
    'one passing surface is never enough');
  /* And the leaf set is only inserted inside the proven branch. */
  const setAt = SELF.indexOf('baseParticleProven = true;');
  const gateAt = SELF.indexOf('if (basePair.contract)');
  assert.ok(gateAt > 0 && setAt > gateAt,
    'leaves are contracted only from a proven basePair.contract');
});