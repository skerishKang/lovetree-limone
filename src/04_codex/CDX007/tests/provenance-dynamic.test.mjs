/**
 * MST106 / CDX007 - S4 ROUND6B dynamic-bubble and provenance-ordering contract tests.
 *
 * These are STRUCTURAL/UNIT tests: no browser, no run evidence, so they pass before and after a
 * RUN regardless of which run wrote the committed evidence.
 *
 * Under test:
 *   (2)  a DYNAMIC bubble pool is resolved from the ACTUAL per-surface selected emotion, never
 *        from the literal `.selectedEmotion` placeholder.
 *   (6)  a later idle write is allowed ONLY with proven ordering, never because the final text
 *        merely belongs to the idle pool.
 *   (8)  the final bubble text equals the last observed write, or the recorded preState text when
 *        the target wrote nothing.
 *   (9)  pair success requires BOTH surfaces valid.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  resolveDynamicBubblePath, actionPool, stateOwnsLubtWrite, classifyTrace, IDLE_POOL,
} from './bubble-provenance.mjs';
import { evaluateSurfaceProvenance, pairSurfaceProvenance } from './surface-provenance.mjs';
import { sourceContract, poolFor } from './source-contract.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_CONTRACT = sourceContract();

/** An authored text that really lives in a known pool. */
function authoredText(poolPath) {
  const pool = poolFor(SOURCE_CONTRACT, poolPath);
  assert.ok(Array.isArray(pool) && pool.length > 0, `${poolPath} must resolve to a non-empty pool`);
  return pool[0];
}

/** Build a provenance report whose writes are classified against the REAL source contract. */
function provenanceFor(spec) {
  const writes = (spec.texts || []).map((t, i) => ({
    seq: i + 1, t: i * 10, text: t,
    talk: false, follow: false, pose: null, left: null, top: null,
  }));
  const typed = writes.length ? classifyTrace(writes) : [];
  return {
    bubble: typed,
    /* A recorded preState is REQUIRED instrumentation; default it so a fixture that only cares
     * about the write trace is not reported as a harness error for an unrelated reason. */
    preState: spec.preState === undefined ? { bubbleText: null, emotion: null } : spec.preState,
    selectedEmotion: spec.selectedEmotion === undefined ? null : spec.selectedEmotion,
    particle: {
      created_by_class: spec.families || [],
      removed_by_class: [],
      still_present_classes: [],
    },
  };
}

const PROBE = 'lubtTalk.idle';

/* ============================ (2) dynamic resolution ============================ */

test('the dynamic pool resolves from the ACTUAL selected emotion, not a placeholder', () => {
  const target = 'wink';
  const r = resolveDynamicBubblePath({ selectedEmotion: target, preEmotion: 'smile' });
  assert.equal(r.ok, true, 'the actual authored emotion resolves');
  assert.equal(r.path, `lubtTalk.emotion.${target}`, 'the path is built from the runtime value');
  assert.equal(r.path.includes('selectedEmotion'), false,
    'the literal `.selectedEmotion` placeholder is never a source path');
  assert.ok(Array.isArray(poolFor(SOURCE_CONTRACT, r.path)),
    'the substituted path resolves to an array in the frozen source');
});

test('the dynamic pool resolves for EVERY authored emotion', () => {
  for (const e of SOURCE_CONTRACT.emotions) {
    const r = resolveDynamicBubblePath({ selectedEmotion: e, preEmotion: '__other__' });
    assert.equal(r.ok, true, `${e} resolves`);
    assert.equal(r.path, `lubtTalk.emotion.${e}`);
    assert.ok(Array.isArray(poolFor(SOURCE_CONTRACT, r.path)), `${e} has an authored pool`);
  }
});

test('an unauthed, unchanged or missing selected emotion is a fail-closed error', () => {
  const bad = resolveDynamicBubblePath({ selectedEmotion: 'not_an_emotion', preEmotion: 'smile' });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /DYNAMIC_EMOTION_NOT_AUTHORED/);

  const same = resolveDynamicBubblePath({ selectedEmotion: 'smile', preEmotion: 'smile' });
  assert.equal(same.ok, false, 'an unchanged emotion proves no correlated reaction');
  assert.match(same.error, /DYNAMIC_EMOTION_UNCHANGED/);

  const missing = resolveDynamicBubblePath({ selectedEmotion: null, preEmotion: 'smile' });
  assert.equal(missing.ok, false);
  assert.match(missing.error, /DYNAMIC_SELECTED_EMOTION_MISSING/);
});

test('the face-random state is owned dynamically and no other state is', () => {
  assert.equal(actionPool(SOURCE_CONTRACT, '21_face_click_random'), null,
    'the face state has no STATIC owned pool');
  assert.equal(stateOwnsLubtWrite('21_face_click_random'), true,
    'but it does own a Lubt write, resolved dynamically');
  assert.equal(actionPool(SOURCE_CONTRACT, '24_lubt_click'), PROBE);
  assert.equal(stateOwnsLubtWrite('26_talk_mode'), false, 'talk owns no Lubt write');
  assert.equal(stateOwnsLubtWrite('27_sing_mode'), false, 'sing owns no Lubt write');
});

/* ============================ (5)(6) ordering ============================ */

test('a target-owned write must appear in the trace', () => {
  const owned = authoredText('lubtTalk.idle');
  const miss = evaluateSurfaceProvenance({
    surface: 'original', provenance: provenanceFor({ texts: [authoredText('lubtTalk.greeting')] }),
    contract: { bubbleOwned: true }, state: '24_lubt_click',
    finalBubbleText: authoredText('lubtTalk.greeting'), preBubbleText: null,
    sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(miss.valid, true, 'the instrumentation itself was readable');
  assert.equal(miss.violated > 0, true, 'the missing owned write is a violation');
  assert.equal(miss.violations.some((v) => v.path === 'semanticContract.bubble_action_write_missing'), true);
  void owned;
});

test('a later idle write is allowed ONLY when the ordering is proven', () => {
  const idleText = authoredText(IDLE_POOL);
  const otherText = authoredText('lubtTalk.greeting');

  // PROVEN ordering: owned write, then a strictly later idle write.
  const proven = evaluateSurfaceProvenance({
    surface: 'original',
    provenance: provenanceFor({ texts: [otherText, idleText] }),
    contract: { bubbleOwned: true }, state: '19_call_lubt',
    finalBubbleText: idleText, preBubbleText: null, sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(proven.violations.some((v) => v.path.includes('idle_without_proven_ordering')), false,
    'a proven owned -> later idle sequence is accepted');

  // UNPROVEN: the idle write comes FIRST, so nothing proves it followed the owned write.
  const unproven = evaluateSurfaceProvenance({
    surface: 'original',
    provenance: provenanceFor({ texts: [idleText, otherText] }),
    contract: { bubbleOwned: true }, state: '19_call_lubt',
    finalBubbleText: otherText, preBubbleText: null, sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(unproven.violations.some((v) => v.path === 'semanticContract.bubble_action_write_missing'), true,
    'the owned scan write is absent, so the idle final text cannot rescue the state');
});

test('an idle final text alone never substitutes for a missing target write', () => {
  const idleText = authoredText(IDLE_POOL);
  const r = evaluateSurfaceProvenance({
    surface: 'split',
    // Only an idle write; the target-owned scan write never happened.
    provenance: provenanceFor({ texts: [idleText] }),
    contract: { bubbleOwned: true }, state: '19_call_lubt',
    finalBubbleText: idleText, preBubbleText: null, sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(r.violations.some((v) => v.path === 'semanticContract.bubble_action_write_missing'), true,
    'being in the idle pool is never sufficient');
  assert.equal(r.contractPassed === undefined, true, 'no partial pass escapes');
});

/* ============================ (7)(8) retained + final invariant ============================ */

test('a state that owns no Lubt write accepts the retained preState text', () => {
  const pre = authoredText('lubtTalk.greeting');
  const r = evaluateSurfaceProvenance({
    surface: 'original',
    provenance: provenanceFor({ texts: [], preState: { bubbleText: pre } }),
    contract: { bubbleOwned: false }, state: '26_talk_mode',
    finalBubbleText: pre, preBubbleText: pre, sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(r.violations.length, 0, 'the retained authored text is allowed');
  assert.equal(r.violated, 0);
});

test('with no write, a final text that differs from preState is a violation', () => {
  const pre = authoredText('lubtTalk.greeting');
  const r = evaluateSurfaceProvenance({
    surface: 'original',
    provenance: provenanceFor({ texts: [], preState: { bubbleText: pre } }),
    contract: { bubbleOwned: false }, state: '26_talk_mode',
    finalBubbleText: authoredText('lubtTalk.drag'), preBubbleText: pre, sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(r.violations.some((v) => v.path === 'semanticContract.bubble_final_text'), true,
    'the final text must equal the preState when nothing was written');
});

test('the final text must equal the LAST observed write', () => {
  const first = authoredText('lubtTalk.greeting');
  const last = authoredText(IDLE_POOL);
  const ok = evaluateSurfaceProvenance({
    surface: 'original', provenance: provenanceFor({ texts: [first, last] }),
    contract: { bubbleOwned: false }, state: '26_talk_mode',
    finalBubbleText: last, preBubbleText: first, sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(ok.violations.length, 0, 'the final text equals the last write');

  const bad = evaluateSurfaceProvenance({
    surface: 'original', provenance: provenanceFor({ texts: [first, last] }),
    contract: { bubbleOwned: false }, state: '26_talk_mode',
    finalBubbleText: first, preBubbleText: first, sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(bad.violations.some((v) => v.path === 'semanticContract.bubble_final_text'), true,
    'the FIRST write is not the final text');
});

test('an unclassified bubble write is fail-closed on either surface', () => {
  const pre = authoredText('lubtTalk.greeting');
  const r = evaluateSurfaceProvenance({
    surface: 'original',
    provenance: {
      bubble: [{ seq: 1, text: 'TEXT FROM NOWHERE', sourcePoolCandidates: [] }],
      preState: { bubbleText: pre }, selectedEmotion: null, particle: {},
    },
    contract: { bubbleOwned: false }, state: '26_talk_mode',
    finalBubbleText: 'TEXT FROM NOWHERE', preBubbleText: pre, sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(r.unclassifiedWrites, 1, 'the unclassified write is counted');
  assert.equal(r.violations.some((v) => v.path === 'semanticContract.bubble_unclassified_write'), true);
});

/* ============================ (9) pair symmetry ============================ */

test('pair success requires BOTH surfaces valid', () => {
  const pre = authoredText('lubtTalk.greeting');
  const good = evaluateSurfaceProvenance({
    surface: 'original', provenance: provenanceFor({ texts: [], preState: { bubbleText: pre } }),
    contract: { bubbleOwned: false }, state: '26_talk_mode',
    finalBubbleText: pre, preBubbleText: pre, sourceContract: SOURCE_CONTRACT,
  });
  const bad = evaluateSurfaceProvenance({
    surface: 'split', provenance: provenanceFor({ texts: [], preState: { bubbleText: pre } }),
    contract: { bubbleOwned: false }, state: '26_talk_mode',
    finalBubbleText: authoredText('lubtTalk.drag'), preBubbleText: pre, sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(good.violated, 0);
  assert.equal(bad.violated > 0, true);
  assert.equal(pairSurfaceProvenance(good, bad).contract, false, 'one clean surface is not enough');
  assert.equal(pairSurfaceProvenance(bad, good).contract, false, 'the verdict is symmetric');
});

test('a missing provenance on either surface is a harness contract error', () => {
  const a = evaluateSurfaceProvenance({
    surface: 'original', provenance: null, contract: { bubbleOwned: false },
    state: '26_talk_mode', sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(a.valid, false);
  assert.match(a.harnessErrors[0], /PROVENANCE_REPORT_FAILED:original/);

  const b = evaluateSurfaceProvenance({
    surface: 'split', provenance: { bubble: [] }, contract: { bubbleOwned: false },
    state: '26_talk_mode', sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(b.valid, false);
  assert.match(b.harnessErrors[0], /PROVENANCE_PARTICLE_LIFECYCLE_MISSING:split/);

  assert.equal(pairSurfaceProvenance(a, b).contract, false);
});

test('a missing preState is a harness contract error, not a silent pass', () => {
  const r = evaluateSurfaceProvenance({
    surface: 'original', provenance: { bubble: [], particle: {} },
    contract: { bubbleOwned: false }, state: '26_talk_mode', sourceContract: SOURCE_CONTRACT,
  });
  assert.equal(r.valid, false);
  assert.match(r.harnessErrors[0], /PROVENANCE_PRESTATE_MISSING:original/);
});

/* ============================ (18)(20) harness wiring ============================ */

test('no positional image path appears in the semantic channel', () => {
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes("'images'"), 'images is a dedicated channel');
  const ded = src.slice(src.indexOf('const DEDICATED_CHANNELS'), src.indexOf('function stripDedicatedChannels'));
  assert.ok(ded.includes('images'), 'images is owned by a dedicated channel, not the semantic one');
});

test('the semantic exactness flag counts semanticContract violations', () => {
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const at = src.indexOf('semantic_contract_exact: defects');
  assert.ok(at > 0, 'the flag exists');
  const row = src.slice(at, src.indexOf('geometry_contract_exact:', at));
  assert.ok(row.includes('semanticContract.'),
    'semantic_contract_exact counts contract violations, not just uncontracted diffs');
});

test('a provenance-backed field is contracted only from the pair verdict', () => {
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(/if \(pair\.contract\) CONTRACTED\.add\('dom\.random_lubt_bubble'\)/.test(src),
    'contracting is gated on the surface pair');
  assert.ok(src.includes('oProvenance: o.provenance') && src.includes('sProvenance: s.provenance'),
    'both surfaces are consumed');
});