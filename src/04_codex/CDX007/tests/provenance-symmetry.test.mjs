/**
 * MST106 / CDX007 - S4 ROUND6A provenance symmetry contract tests (CASE A - CASE E).
 *
 * These are STRUCTURAL/UNIT tests: they exercise the surface-pairing decision directly with
 * synthetic fixtures and require NO browser and NO fresh evidence, so they pass before and after
 * a RUN independently of which run wrote the committed evidence.
 *
 * The governing rule under test:
 *   a provenance-backed field may be CONTRACTED only when BOTH surfaces are valid and neither
 *   produced a violation; a missing/unreadable provenance is a HARNESS CONTRACT ERROR that
 *   aborts evaluation rather than a partial pass.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  evaluateSurfaceProvenance, pairSurfaceProvenance, evaluatePairProvenance,
} from './surface-provenance.mjs';
import { sourceContract } from './source-contract.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_CONTRACT = sourceContract();

/** A minimal authored-shaped contract with a bubble-owned action. */
const CONTRACT = { bubbleOwned: true };

/* We do not rely on which authored pool the fixture text belongs to: the trace is handed an
 * explicit candidate list and the test asserts the pairing DECISION, which is what is under
 * test. */
const PROBE_POOL = 'lubtTalk.idle';

/** Evaluate one surface with a trace that claims PROBE_POOL membership. */
function evalSurface(surface, prov, opts = {}) {
  const text = opts.text || 'T';
  const fixture = prov === null ? null : {
    bubble: [{ seq: 1, text, sourcePoolCandidates: opts.candidates || [PROBE_POOL] }],
    /* ROUND6B: preState is REQUIRED instrumentation; default it so a symmetry fixture is not
     * reported as a harness error for an unrelated reason. */
    preState: { bubbleText: opts.preText === undefined ? text : opts.preText, emotion: null },
    selectedEmotion: null,
    particle: {
      created_by_class: opts.families || [],
      removed_by_class: [],
      still_present_classes: [],
    },
  };
  return evaluateSurfaceProvenance({
    surface,
    provenance: fixture,
    contract: opts.contract === undefined ? CONTRACT : opts.contract,
    state: opts.state || '24_lubt_click',
    finalBubbleText: text,
    preBubbleText: opts.preText === undefined ? text : opts.preText,
    sourceContract: SOURCE_CONTRACT,
  });
}

/* ------------------------------------------------------------------ CASE A */
test('CASE A original passes and split fails -> the pair does NOT contract', () => {
  const originalResult = evalSurface('original', {}, { candidates: [PROBE_POOL] });
  const splitResult = evalSurface('split', {}, { candidates: ['lubtTalk.greeting'] }); // wrong pool
  const pair = pairSurfaceProvenance(originalResult, splitResult);
  assert.equal(originalResult.valid, true, 'the original surface itself is valid');
  assert.equal(splitResult.violated > 0, true, 'the split surface records a violation');
  assert.equal(pair.contract, false, 'ONE surface passing must never contract the field');
  assert.equal(pair.valid, true, 'both surfaces were readable, so the pair is instrumentation-valid');
  assert.equal(pair.violated > 0, true, 'the pair counts the split violation');
});

/* ------------------------------------------------------------------ CASE B */
test('CASE B original fails and split passes -> the pair does NOT contract', () => {
  const originalResult = evalSurface('original', {}, { candidates: ['lubtTalk.greeting'] }); // wrong pool
  const splitResult = evalSurface('split', {}, { candidates: [PROBE_POOL] });
  const pair = pairSurfaceProvenance(originalResult, splitResult);
  assert.equal(splitResult.valid, true, 'the split surface itself is valid');
  assert.equal(originalResult.violated > 0, true, 'the original surface records a violation');
  assert.equal(pair.contract, false, 'ONE surface passing must never contract the field');
  assert.equal(pair.valid, true, 'both surfaces were readable, so the pair is instrumentation-valid');
  assert.equal(pair.violated > 0, true, 'the pair counts the original violation');
});

/* ------------------------------------------------------------------ CASE C */
test('CASE C both surfaces pass -> the pair contracts', () => {
  const originalResult = evalSurface('original', {}, { candidates: [PROBE_POOL] });
  const splitResult = evalSurface('split', {}, { candidates: [PROBE_POOL] });
  const pair = pairSurfaceProvenance(originalResult, splitResult);
  assert.equal(originalResult.valid, true);
  assert.equal(splitResult.valid, true);
  assert.equal(pair.contract, true, 'only when BOTH surfaces are valid and clean is the field contracted');
  assert.equal(pair.violated, 0);
});

/* ------------------------------------------------------------------ CASE D */
test('CASE D original provenance is null -> HARNESS CONTRACT ERROR, not a pass', () => {
  const originalResult = evalSurface('original', null);
  const splitResult = evalSurface('split', {}, { candidates: [PROBE_POOL] });
  const pair = pairSurfaceProvenance(originalResult, splitResult);
  assert.equal(originalResult.valid, false, 'a missing original provenance is never valid');
  assert.equal(originalResult.harnessErrors.length, 1, 'it records a harness error');
  assert.match(originalResult.harnessErrors[0], /PROVENANCE_REPORT_FAILED:original/);
  assert.equal(pair.contract, false, 'missing instrumentation never contracts the field');
  assert.equal(pair.valid, false, 'the pair is invalid instrumentation');
});

/* ------------------------------------------------------------------ CASE E */
test('CASE E split provenance is null -> HARNESS CONTRACT ERROR, not a pass', () => {
  const originalResult = evalSurface('original', {}, { candidates: [PROBE_POOL] });
  const splitResult = evalSurface('split', null);
  const pair = pairSurfaceProvenance(originalResult, splitResult);
  assert.equal(splitResult.valid, false, 'a missing split provenance is never valid');
  assert.equal(splitResult.harnessErrors.length, 1, 'it records a harness error');
  assert.match(splitResult.harnessErrors[0], /PROVENANCE_REPORT_FAILED:split/);
  assert.equal(pair.contract, false, 'missing instrumentation never contracts the field');
  assert.equal(pair.valid, false, 'the pair is invalid instrumentation');
});

/* ------------------------------------------------------------------ additional */
test('a missing bubble trace or particle lifecycle on a surface is a harness error', () => {
  const noBubble = evaluateSurfaceProvenance({
    surface: 'original', provenance: { bubble: null, particle: {} },
    contract: CONTRACT, state: '24_lubt_click', finalBubbleText: 'T', sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(noBubble.valid, false);
  assert.match(noBubble.harnessErrors[0], /PROVENANCE_BUBBLE_TRACE_MISSING/);

  const noParticle = evaluateSurfaceProvenance({
    surface: 'split', provenance: { bubble: [] }, contract: CONTRACT, state: '24_lubt_click',
    finalBubbleText: null, sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(noParticle.valid, false);
  assert.match(noParticle.harnessErrors[0], /PROVENANCE_PARTICLE_LIFECYCLE_MISSING/);
});

test('an unclassified write on either surface is a violation, never a silent pass', () => {
  const originalResult = evalSurface('original', {}, { candidates: [] });
  assert.equal(originalResult.unclassifiedWrites > 0, true, 'an unclassified write is counted');
  assert.equal(originalResult.violations.some((v) => v.path === 'semanticContract.bubble_unclassified_write'), true);
  assert.equal(pairSurfaceProvenance(originalResult, evalSurface('split', {}, { candidates: [PROBE_POOL] })).contract,
    false, 'an unclassified write on one surface blocks the pair');
});

test('the pair decision is symmetric: swapping the surfaces cannot change the verdict', () => {
  const good = evalSurface('original', {}, { candidates: [PROBE_POOL] });
  const bad = evalSurface('split', {}, { candidates: ['lubtTalk.greeting'] });
  assert.equal(pairSurfaceProvenance(good, bad).contract, pairSurfaceProvenance(bad, good).contract,
    'swapping which surface fails does not change the pair verdict');
  assert.equal(pairSurfaceProvenance(good, bad).contract, false);
});

test('evaluatePairProvenance routes both surfaces and refuses to contract on a null', () => {
  const ok = evaluatePairProvenance({
    contract: CONTRACT, state: '24_lubt_click', sourceContract: SOURCE_CONTRACT,
    oProvenance: { bubble: [{ text: 'T', sourcePoolCandidates: [PROBE_POOL] }], particle: {}, preState: { bubbleText: 'T' } },
    sProvenance: { bubble: [{ text: 'T', sourcePoolCandidates: [PROBE_POOL] }], particle: {}, preState: { bubbleText: 'T' } },
    oFinalText: 'T', sFinalText: 'T',
  });
  assert.equal(ok.contract, true, 'both readable and clean -> contracted');

  const oneNull = evaluatePairProvenance({
    contract: CONTRACT, state: '24_lubt_click', sourceContract: SOURCE_CONTRACT,
    oProvenance: null,
    sProvenance: { bubble: [], particle: {}, preState: { bubbleText: 'T' } },
    oFinalText: 'T', sFinalText: 'T',
  });
  assert.equal(oneNull.contract, false, 'a null original provenance blocks the pair');
  assert.equal(oneNull.harnessErrors.length > 0, true);
});

test('the ROUND6 undefined page alias is gone and the split surface is consumed', () => {
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.equal(/\bp\.evaluate\(PROVENANCE_REPORT\)/.test(src), false,
    'the undefined `p` alias may not evaluate the provenance report');
  assert.ok(src.includes('page.evaluate(PROVENANCE_REPORT)'),
    'the report is read back through the real page object');
  assert.ok(src.includes('sProvenance: s.provenance'),
    'the split surface provenance is consumed, not only the original');
  assert.ok(src.includes('oProvenance: o.provenance'),
    'the original surface provenance is consumed');
  // The pair gate must require BOTH surfaces.
  assert.ok(src.includes('evaluatePairProvenance'),
    'the bubble contract is gated through the surface-pair evaluator');
});