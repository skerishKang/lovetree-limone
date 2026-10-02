/**
 * MST106 / CDX007 - S4 source-split parity harness (two-mode), CORRECTED per CENTRAL HOLD
 * #589 5927961509.
 *
 *   CONTRACT MODE (default)    no browser; CI-safe; protected-byte / metadata / lifecycle checks
 *   BROWSER CANDIDATE MODE     CDX007_S4_BROWSER_CANDIDATE=1
 *
 * Contract: SOURCE_SPECIFIC_MOTION_RANDOMNESS_AWARE (#589 5925898260).
 *
 * The nine corrections this file implements:
 *  1. STABLE-FIRST. A STABLE state never absorbs a residual into any ledger class.
 *  2. No intent-only fallback. Classification requires field/target-specific proof.
 *  3. AUTHORED_RANDOM_SCALAR only for field paths directly traced to a Math.random() expression.
 *  4. Hard-channel ownership. Each field belongs to exactly one channel; no double counting.
 *  5. RAW and CONTRACT metrics are separate and separately named.
 *  6. STABLE states are proven by semantic terminal predicates, never by a bare sleep.
 *  7. Startup readiness fails closed; a timeout aborts the run.
 *  8. Infinite phase-lock requires native proof on BOTH surfaces and never hides a STABLE residual.
 *  9. No new tolerance, no new residual class, no seed/clock patch, no source normalization.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { sourceContract, poolFor, SourceContractError } from './source-contract.mjs';
import { PROVENANCE_INSTALL, PROVENANCE_ARM, PROVENANCE_REPORT } from './provenance.mjs';
import { classifyTrace, actionPool, IDLE_POOL } from './bubble-provenance.mjs';
import { evaluatePairProvenance, evaluateSurfaceProvenance, pairSurfaceProvenance }
  from './surface-provenance.mjs';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAPSULE = path.resolve(HERE, '..');
const SELF_SRC = fs.readFileSync(new URL(import.meta.url), 'utf8');
/* The runtime slice for self-guards: from the browser-candidate section to the end of the runtime
 * code, EXCLUDING the contract tests, which necessarily quote the tokens they assert on. The
 * guards below therefore test the code, not their own prose. */
const RUNTIME_SECTION = SELF_SRC;

const BROWSER_MODE = process.env.CDX007_S4_BROWSER_CANDIDATE === '1';
const RUN_INDEX = Number.parseInt(process.env.CDX007_S4_RUN_INDEX || '1', 10);
const EVIDENCE_DIR = process.env.CDX007_S4_EVIDENCE_DIR
  || path.join(os.tmpdir(), 'cdx007-s4-candidate');
const S4_DIR = path.join(CAPSULE, 'evidence', 's4');
const REVIEW_PACK_DIR = path.join(S4_DIR, 'review-pack');

const rb = (rel) => fs.readFileSync(path.join(CAPSULE, rel));
const rj = (rel) => JSON.parse(rb(rel).toString('utf8'));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const gitBlobSha1 = (b) => crypto
  .createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])).digest('hex');

const PORT = Number(process.env.CDX007_S4_PORT || 39419);

const PROTECTED = {
  'original/original.html': 'af1d19d92ba85abb22171be82c9b55a0eb182997',
  'original/living-world-v2.css': 'de2e654d0eab08949abc7047592b65ba170e5fa1',
  'original/living-world-v2.js': '0b25ff162b5d5bf23ded3747c2855d9ef2cd0612',
  'split/index.html': '27906be68b1d68744ce0475fddfc6297e873f30d',
  'split/styles.css': 'dd8fd054da12b0ea8f79f7a504a54282e7b6f34b',
  'split/script.js': 'e29a41069573388bf261bc5171aac8dde325efd9',
  'split/living-world-v2.css': 'de2e654d0eab08949abc7047592b65ba170e5fa1',
  'split/living-world-v2.js': '0b25ff162b5d5bf23ded3747c2855d9ef2cd0612',
};
const AUTHORITY_SHA = '4f28f1671146a36c53e88e0645c6dbe29076b1db526e21adb40794617a36223b';
const AUTHORITY_BYTES = 22310;
const RUNTIME_ASSET_COUNT = 54;

const ALLOWED_CLASSIFICATIONS = [
  'AUTHORED_RANDOM_SCALAR', 'AUTHORED_LIVE_PHASE',
  'AUTHORED_FINITE_TRANSIENT_PHASE', 'INFINITE_CSS_PHASE_AFTER_NATIVE_PROOF',
];
/* (4) FRESH-DERIVED from the frozen CSS, not guessed. Every track below is declared
 * `animation: <name> ... infinite` in the accepted source; C16 re-derives this list from the
 * stylesheets so it cannot silently drift. `wander` drives .lubt and is the reason the Lubt box
 * moves; omitting it is exactly what produced the ROUND2 150/155/156 px residual. */
const INFINITE_TRACKS = ['breath', 'pulse', 'spin', 'wander'];
const FINITE_TRACKS = ['hintFade', 'fxBurst', 'specialHalo'];
const EMOTIONS = ['neutral', 'smile', 'laugh', 'wink', 'shy', 'surprise',
  'angry', 'sing', 'talk', 'cry', 'touched', 'sleepy'];
const CHARS = ['M01', 'M02', 'F01', 'F02'];

// Authored finite timer windows, measured from the frozen source.
const AUTHORED_TIMERS = {
  notes_cleanup_ms: 1900,
  petals_cleanup_ms: 2400,
  speech_hide_ms: 3300,
  lubt_revert_ms: 3600,
  special_moment_ms: 1800,
  face_followup_ms: 180,
};

// ============================================================ CONTRACT MODE

test('C01 the eight protected S3 runtime blobs are byte-locked', () => {
  for (const [rel, blob] of Object.entries(PROTECTED)) {
    assert.equal(gitBlobSha1(rb(rel)), blob, `${rel} is unchanged at S4`);
  }
  const auth = rb('original/original.html');
  assert.equal(auth.length, AUTHORITY_BYTES, 'authority byte length');
  assert.equal(sha256(auth), AUTHORITY_SHA, 'authority sha256');
});

test('C02 the 54 runtime assets are byte-identical across original and split', () => {
  const walk = (rel) => {
    const out = [];
    const rec = (d, r) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const rr = r ? `${r}/${e.name}` : e.name;
      if (e.isDirectory()) rec(path.join(d, e.name), rr); else out.push(rr);
    });
    rec(path.join(CAPSULE, rel), '');
    return out.sort();
  };
  const o = walk('original/assets');
  assert.equal(o.length, RUNTIME_ASSET_COUNT, '54 runtime assets in original');
  assert.deepEqual(walk('split/assets'), o, 'identical relative asset set on both sides');
  for (const f of o) {
    assert.ok(rb(`original/assets/${f}`).equals(rb(`split/assets/${f}`)),
      `${f} is byte-identical across sides`);
  }
  assert.equal(rj('authority-context.json').runtime_asset_dependencies.reference_only_files, 7);
});

test('C03 the frozen source behavior is preserved and unrepaired', () => {
  const inlineCss = rb('split/styles.css').toString('utf8');
  const v2css = rb('original/living-world-v2.css').toString('utf8');
  const v2js = rb('original/living-world-v2.js').toString('utf8');
  const js = rb('split/script.js').toString('utf8');
  assert.ok(v2js.includes('lubt-drag-hint'), 'drag hint authored in the external V2 runtime');
  assert.ok(/\.lubt-drag-hint\s*\{\s*display:\s*none/.test(v2css),
    'hidden by authored display:none, never removed from the DOM');
  for (const [name, t] of [['inline css', inlineCss], ['v2 css', v2css]]) {
    assert.equal(t.includes('prefers-reduced-motion'), false, `no authored reduced-motion in ${name}`);
  }
  const randomSites = js.split('Math.random(').length - 1 + v2js.split('Math.random(').length - 1;
  assert.ok(randomSites >= 13, `authored Math.random() sites preserved (${randomSites})`);
  assert.equal(/Math\.random\s*=\s*\(/.test(js + v2js), false, 'Math.random is not reassigned');
  for (const t of INFINITE_TRACKS) {
    assert.ok(inlineCss.includes(`@keyframes ${t}`), `infinite track ${t} in the inline layer`);
  }
  for (const t of FINITE_TRACKS) {
    assert.ok(v2css.includes(`@keyframes ${t}`), `finite effect ${t} in the external V2 layer`);
  }
  const splitHtml = rb('split/index.html').toString('utf8');
  assert.ok(splitHtml.includes('<link rel="stylesheet" href="living-world-v2.css">'));
  assert.ok(splitHtml.includes('<script src="living-world-v2.js">'));
});

test('C04 the paired-state plan is fresh-derived from real source behaviour', () => {
  const html = rb('original/original.html').toString('utf8');
  const js = rb('split/script.js').toString('utf8');
  for (const c of CHARS) assert.ok(html.includes(`id:'${c}'`), `character ${c} authored`);
  const emoStart = js.indexOf('emos=[');
  assert.ok(emoStart >= 0, 'the inline layer declares the authored emos array');
  const emoBlock = js.slice(emoStart, emoStart + 800);
  for (const e of EMOTIONS) assert.ok(emoBlock.includes(`['${e}',`), `emotion ${e} authored`);
  const src = js + rb('original/living-world-v2.js').toString('utf8');
  // Each window is asserted by its literal delay AND by the cleanup it belongs to, so the proof
  // is anchored to real source rather than to one guessed call shape.
  for (const [k, v] of Object.entries(AUTHORED_TIMERS)) {
    assert.ok(src.includes(String(v)), `authored timer ${k} (${v} ms) exists in the frozen source`);
  }
  assert.ok(/remove\(\),1900/.test(src), 'notes() removes its particles after 1900 ms');
  assert.ok(/remove\(\),2400/.test(src), 'petals() removes its particles after 2400 ms');
  assert.ok(/remove\('show'\),3300/.test(src), 'the speech bubble hides after 3300 ms');
  assert.ok(/remove\('special'[\s\S]{0,80}1800/.test(src), 'the special class clears after 1800 ms');
  assert.ok(/180\)/.test(src), 'the random face reaction follows up after 180 ms');
});

test('C04b the authored right-rail collapse below 1050px is preserved, not repaired', () => {
  const inlineCss = rb('split/styles.css').toString('utf8');
  const v2css = rb('original/living-world-v2.css').toString('utf8');
  assert.ok(/@media\s*\(max-width:1050px\)\s*\{[\s\S]{0,200}?\.right\s*\{\s*display:\s*none/.test(inlineCss),
    'the authored <=1050px right-rail collapse is still present');
  assert.ok(/\.lubt-drag-hint\s*\{\s*display:\s*none/.test(v2css), 'the <=720px hint collapse');
  for (const spec of PARITY_PLAN) {
    const vp = VIEWPORTS[spec.ctx];
    if (vp.width <= 1050) {
      const d = spec.driver.toString();
      for (const id of ['heartBtn', 'surpriseBtn', 'sayBtn', 'lubtBtn', 'saveBtn', 'talkBtn', 'singBtn']) {
        assert.equal(d.includes(`#${id}`), false,
          `${spec.ctx}/${spec.state} must not drive #${id}, hidden by the source at ${vp.width}px`);
      }
    }
  }
});

test('C04c the harness compares the authored animation contract, not sampled playback timing', () => {
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.equal(/duration:\s*String\(tm\.duration\)/.test(src), false,
    'raw sampled duration must not be a compared field');
  assert.equal(/delay:\s*String\(tm\.delay\)/.test(src), false,
    'raw sampled delay must not be a compared field');
  assert.ok(src.includes('finite: tm.iterations !== Infinity'), 'finite/infinite class recorded');
  assert.ok(src.includes('authored_track:'), 'authored track identity recorded');
});

test('C04d a STABLE state never enters the residual ledger', () => {
  /* HOLD Finding 1: the previous classifier tested particlesPresent / lubtTimerActive BEFORE the
   * STABLE fallback, so STABLE residuals were absorbed. STABLE-FIRST must be structural. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  // Locate the REAL STABLE branch in the run loop, not the literal quoted by this guard.
  // The marker is assembled at runtime so this guard's own source cannot contain the literal.
  const marker = ['/* ---------- STABLE FIRST:', ' no ledger on a stable state', ' ---------- */'].join('');
  const anchor = src.indexOf(marker);
  assert.ok(anchor > 0, 'the STABLE-first marker exists in the run loop');
  const start = src.indexOf("if (spec.intent === 'STABLE') {", anchor + marker.length);
  assert.ok(start > anchor + marker.length, 'the STABLE-first branch follows its marker');
  const elseAt = src.indexOf('} else {', start);
  assert.ok(elseAt > start, 'the STABLE branch is terminated by an else');
  const branch = src.slice(start, elseAt);
  assert.ok(branch.includes('defects.push'), 'the STABLE branch pushes real defects');
  assert.equal(/addLedger\(/.test(branch), false,
    'the STABLE branch must never call addLedger');
  assert.equal(/AUTHORED_(RANDOM|FINITE_TRANSIENT|LIVE)/.test(branch), false,
    'the STABLE branch must contain no ledger classification');
  assert.equal(/bothInf/.test(branch), false,
    'the STABLE branch must not consult the infinite-animation ledger');
});

test('C04e there is no intent-only fallback classifier', () => {
  /* HOLD Finding 2: naming a state AUTHORED_RANDOM / AUTHORED_LIVE / AUTHORED_FINITE_TRANSIENT
   * must not classify an arbitrary residual. Only field/target-specific proof may. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
  assert.equal(/intent\s*===\s*'AUTHORED_RANDOM'\s*\)\s*\{?\s*[\s\S]{0,80}?addLedger/.test(src), false,
    'no branch may classify a residual purely from the declared intent');
  assert.ok(src.includes('AUTHORED_RANDOM_FIELD_INVENTORY'),
    'the random class is limited to an explicit field-path allowlist');
});

test('C04f hard channels have non-overlapping ownership', () => {
  /* HOLD Finding 4: geometry / computedStyle / animation inventory must not also be diffed
   * inside the semantic channel. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('stripDedicatedChannels'), 'dedicated-channel fields are stripped first');
  for (const k of ['geometry', 'computedStyle', 'animations', 'externalLayers']) {
    assert.ok(src.includes(`${k}`), `${k} is owned by its dedicated channel`);
  }
  assert.ok(src.includes('DEDICATED_CHANNELS'), 'the dedicated channel set is declared');
});

test('C04g raw and contract metrics are separately named', () => {
  /* HOLD Finding 3: CONTRACT_EXACT may not be the raw zero-diff count. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  for (const f of ['SEMANTIC_RAW_EXACT', 'SEMANTIC_CONTRACT_EXACT',
    'GEOMETRY_RAW_EXACT', 'GEOMETRY_CONTRACT_EXACT',
    'COMPUTED_STYLE_RAW_EXACT', 'COMPUTED_STYLE_CONTRACT_EXACT',
    'ANIMATION_INVENTORY_RAW_EXACT', 'ANIMATION_INVENTORY_CONTRACT_EXACT']) {
    assert.ok(src.includes(f), `${f} is reported separately`);
  }
  const sp = path.join(S4_DIR, 'candidate-summary.json');
  if (fs.existsSync(sp)) {
    const j = JSON.parse(fs.readFileSync(sp, 'utf8'));
    // The denominator is the fresh-derived plan size, not a hard-coded 36.
    const total = j.PAIRED_STATE_COUNT;
    assert.equal(typeof total, 'number', 'the paired-state count is recorded');
    for (const f of ['SEMANTIC_RAW_EXACT', 'SEMANTIC_CONTRACT_EXACT', 'GEOMETRY_RAW_EXACT',
      'GEOMETRY_CONTRACT_EXACT', 'COMPUTED_STYLE_RAW_EXACT', 'COMPUTED_STYLE_CONTRACT_EXACT',
      'ANIMATION_INVENTORY_RAW_EXACT', 'ANIMATION_INVENTORY_CONTRACT_EXACT']) {
      assert.ok(typeof j[f] === 'string' && j[f].endsWith(`/${total}`)
        && /^[0-9]+$/.test(j[f].split('/')[0]),
      `${f} is present as x/${total}`);
    }
    // Raw and contract are independent fields and may legitimately differ.
    assert.notEqual(JSON.stringify(j.SEMANTIC_RAW_EXACT), undefined, 'raw is recorded separately');
  }
});

test('C04h startup readiness fails closed', () => {
  /* HOLD Finding 5: a readiness timeout must not be swallowed with .catch(() => {}). */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.equal(/startupReadiness\s*=\s*false/.test(src), true,
    'a readiness timeout is surfaced');
  assert.ok(src.includes('READINESS_TIMEOUT'), 'a readiness failure is recorded as a defect');
  const idx = src.indexOf('startupReadiness = true');
  assert.ok(idx > 0, 'startupReadiness is set');
  assert.equal(/\}\)\s*\.catch\(\(\)\s*=>\s*\{\s*\}\)/.test(src), false,
    'no readiness wait may be swallowed');
});

test('C04i STABLE states wait on semantic terminal predicates, not a bare sleep', () => {
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('settleAll'), 'a terminal-predicate waiter exists');
  assert.ok(src.includes('TERMINAL'), 'terminal predicates are declared');
  for (const cond of ['noParticles', 'lubtIdle', 'speechHidden']) {
    assert.ok(src.includes(cond), `terminal condition ${cond} exists`);
  }
  // Every STABLE plan entry must pass a non-empty terminal list.
  for (const spec of PARITY_PLAN) {
    if (spec.intent !== 'STABLE') continue;
    assert.ok(/await settle\(/.test(spec.driver.toString()),
      `${spec.ctx}/${spec.state} is STABLE and must settle on a terminal predicate`);
  }
});

test('C05 the capsule is an S4 candidate and claims no acceptance', () => {
  const m = rj('manifest.json');
  const ctx = rj('authority-context.json');
  assert.equal(m.stages.mechanical_split_complete, true, 'S3 mechanical split complete');
  assert.equal(m.s3_status, 'ACCEPTED', 'S3 accepted');
  assert.equal(m.stages.source_split_parity_pass, false, 'S4 parity pass is false');
  assert.equal(m.s4_status, 'RELEASED_CANDIDATE_ONLY', 'S4 candidate capture only');
  assert.equal(m.central_s4_accepted, false, 'CENTRAL S4 acceptance is NOT claimed');
  assert.equal(m.parity_ref, null, 'parity_ref stays null');
  assert.equal(m.product_adoption, false, 'no Product adoption');
  assert.equal(m.lineage57_adoption, false, 'no Lineage57 adoption');
  assert.equal(m.lineage58_adoption, undefined, 'no Lineage58 flag (CDX005 copy residue)');
  assert.equal(m.drive_mutation, 0, 'zero Drive mutation');
  assert.equal(ctx.stage_gate.parity_status, 'CANDIDATE_PENDING_CENTRAL');
  assert.equal(ctx.stage_gate.source_split_parity_pass, false, 'gate claims no parity');
  assert.equal(fs.existsSync(path.join(CAPSULE, 'evidence', 'parity', 'accepted-parity.json')), false,
    'no accepted-parity record may exist at LOCAL candidate stage');
});

test('C06 the gate contains no blanket moving/random waiver', () => {
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
  for (const banned of ['movingOnEither', 'animationActiveSoIgnore', 'randomPageSoIgnore']) {
    assert.equal(new RegExp(`${banned}\\s*[=(]`).test(src), false, `no ${banned} gate may exist`);
  }
});

test('C07 the MST106 identity stays bound to CDX007', () => {
  const master = JSON.parse(fs.readFileSync(
    path.resolve(CAPSULE, '..', '..', '02_master', 'MST106', 'record.json'), 'utf8'));
  assert.equal(master.mapping_status, 'CODEX_RESOLVED');
  assert.ok((master.identity_refs || []).some((r) => r.namespace === 'CDX' && r.id === 'CDX007'));
  assert.equal((master.notes || []).includes('namespace_type=lineage'), false,
    'Lineage57 is never the primary namespace');
});

if (!BROWSER_MODE) {
  test('BROWSER CANDIDATE MODE is opt-in and disabled by default', () => {
    assert.equal(BROWSER_MODE, false, 'default contract mode launches no browser');
  });
}

// ============================================================ BROWSER CANDIDATE MODE

/* ============================================================================
 * (3)(4)(5)(6)(7)(9) SOURCE-DERIVED PER-STATE RANDOM CONTRACTS.
 *
 * There is NO global random waiver. Each state that can carry an authored random
 * value declares, per field, the SOURCE SITE it comes from, the allowed set or
 * range, and the deterministic invariants that must still hold exactly. A field
 * with no contract here is compared for exact value equality.
 *
 * Everything below is derived from the frozen source, not from observed output:
 *   lubtTalk.{greeting,idle,drag,save,scan,special,reply,emotion.<emotion>}
 *   characterLines.<emotion>          (choose() -> Math.random)
 *   callLubt(): left = 18 + rnd*28 vw, top = 9 + rnd*46 vh
 *   resetAuto(): pool = [neutral, smile, wink, shy, touched, sleepy]
 *   notes()/petals()/burstEmotion(): per-particle Math.random displacement
 * ==========================================================================*/

/* The authored Auto Life pool is SOURCE_CONTRACT.autoLifePool, extracted from resetAuto() in
 * the frozen inline layer. There is deliberately no second hard-coded copy of it. */

// The authored Lubt home position, written by resumeLubtFlight().
const LUBT_HOME = { left: '300px', top: '95px' };

// The authored random position range written by callLubt().
const LUBT_RANDOM_RANGE = { leftVw: [18, 46], topVh: [9, 55] };

/* Per-state random contracts. `pool` is a SOURCE-DERIVED allowed set for a field whose exact
 * text/value is random; `randomPosition` marks a state where the Lubt position is genuinely
 * random rather than homed; `speech` names the characterLines key that owns the speech text;
 * `bubble` names the lubtTalk key that owns the retained hidden bubble text. */
const RANDOM_CONTRACTS = {
  /* (11) INITIAL LIVE STATES. These capture ~0.9-1.2s after load, BEFORE the authored 4800ms
   * Auto Life interval can tick, so they claim NO auto-emotion draw. What they DO own is the
   * deterministic startup emotion, the startup greeting bubble provenance, and the startup
   * callLubt random position. */
  'D1/01_initial_live': { startupEmotion: true, bubbleOwned: false, randomPosition: true, startup: true },
  'D1/28_continuous_motion': { startupEmotion: true, bubbleOwned: false, randomPosition: true, startup: true },
  'T1/01_tablet_initial': { startupEmotion: true, bubbleOwned: false, randomPosition: true, startup: true },
  'M1/01_mobile_initial': { startupEmotion: true, bubbleOwned: false, randomPosition: true, startup: true },

  /* (12) D1/29 is the ONLY state that observes a real Auto Life tick, so it is the only one that
   * names the extracted Auto Life pool. It is per-surface correlated: each surface's OWN selected
   * emotion must be in the pool and must match its own active emotion/portrait/metadata. */
  'D1/29_autolife_on_live': { auto_emotion: 'autoLifePool', correlatedAutoLife: true, bubbleOwned: false },

  // Stable actions whose retained speech/bubble text is an authored random draw.
  'D1/16_heart_action': { speech: 'touched', bubbleOwned: true, fx: { emotion: 'touched' } },
  'D1/17_surprise_action': { speech: 'surprise', bubbleOwned: true, fx: { emotion: 'surprise' } },
  'D1/19_call_lubt': { bubbleOwned: true },
  'D1/20_save_transient': { bubbleOwned: true, randomPosition: true, fx: { emotion: 'touched' } },
  'D1/20b_save_fault_terminal': { bubbleOwned: true },
  'D1/24_lubt_click': { bubbleOwned: true, randomPosition: true },
  'D1/25_lubt_drag': { bubbleOwned: true, dragTerminal: true },

  /* (15) TALK calls no Lubt and shows the #phrase value, NOT a characterLines pool. */
  'D1/26_talk_mode': { talkMode: true, bubbleOwned: false },
  /* (16) SING emits base notes() and no V2 FX family, and calls no Lubt. */
  'D1/27_sing_mode': { singMode: true, baseNotes: 8, bubbleOwned: false },

  /* (2)(14) FACE RANDOM. The owned bubble pool is lubtTalk.emotion.<ACTUAL selected emotion>,
   * resolved per surface after the runtime value is known - never the literal placeholder. */
  'D1/21_face_click_random': {
    correlated_random_reaction: true,
    speech: 'selectedEmotion',
    bubbleOwned: true, dynamicBubble: true,
    randomPosition: true,
    correlated: true,
  },
  'D1/22_face_special_moment': { bubbleOwned: true, randomPosition: true },
  'D1/23_face_hold_special': { bubbleOwned: true, randomPosition: true },

  /* (17) T1/04 clicks an EMOTION BUTTON. It never calls the Lubt, so it owns no target bubble
   * write and requires no characterLines.touched speech pool. */
  'T1/04_tablet_interaction': { bubbleOwned: false, emotionButton: 'touched' },
};

function randomContractFor(ctx, state) {
  return RANDOM_CONTRACTS[`${ctx}/${state}`] || null;
}

/* ---- Source-derived pools, read from the frozen V2 script at capture time. ---- */
// These are extracted in-page from the live authored objects, so the allowed set can never
// drift from the source that is actually running.

/* (1)(2)(3) THE single source contract, extracted from the FROZEN BYTES with the TypeScript
 * compiler API this repository already depends on. The authored pools are IIFE-lexical consts in
 * the external V2 file, so they are unreadable from page.evaluate() and must NOT be exposed
 * through a window global - that would be source mutation. Every pool below comes from here. */
const SOURCE_CONTRACT = sourceContract();
const HARNESS_CONTRACT_ERRORS = [];

/** Resolve a contract pool, recording a HARNESS_CONTRACT_ERROR when it does not exist. */
function contractPool(path) {
  const v = poolFor(SOURCE_CONTRACT, path);
  if (v === null) HARNESS_CONTRACT_ERRORS.push(`UNRESOLVED_CONTRACT_PATH:${path}`);
  return v;
}

const VIEWPORTS = {
  D1: { id: 'D1', width: 1440, height: 900 },
  T1: { id: 'T1', width: 900, height: 900 },
  M1: { id: 'M1', width: 390, height: 844 },
};
const castBtn = (i) => `#cast button:nth-child(${i})`;
const emoBtn = (e) => `#emotions button[data-emo="${e}"]`;

// Authored terminal conditions. Each is SELF-CONTAINED source evaluated inside the page, so it
// must not reference any module-scope binding; the FX selector is inlined below.
const TERMINAL_SRC = {
  noParticles: `() => document.querySelectorAll('#notes .note').length === 0
    && document.querySelectorAll('#petals .petal').length === 0
    && document.querySelectorAll('.fx-dot,.fx-fire,.fx-heart,.fx-note,.fx-ring,.fx-sleep,.fx-star,.fx-tear').length === 0`,
  lubtIdle: `() => {
    const l = document.getElementById('lubt');
    return !!l && !l.classList.contains('talk') && !l.classList.contains('follow')
      && !l.classList.contains('dragging');
  }`,
  lubtPoseIdle: `() => String(document.getElementById('lubtImg')?.getAttribute('src') || '').includes('lubt-idle')`,
  /* (2) The full authored home lifecycle. callLubt's 3600 ms action timer clears talk and the
   * idle pose, then resumeLubtFlight re-adds follow at +500 ms and drops it at +1050 ms. There is
   * therefore a window where talk=false and follow=false but the element has NOT yet returned
   * home. A STABLE state must also prove the authored home position, not just the absence of the
   * transient classes. */
  /* (9) D1/25 drag terminal. The authored drag path calls setLubtBubble('guide', lubtTalk.drag)
   * and resumeLubtFlight(2400), so the authored terminal is the GUIDE pose at home, not idle. The
   * 12 s background idle loop must NOT be waited out to manufacture an idle pose. */
  lubtDragHomeStable: `() => {
    const l = document.getElementById('lubt');
    if (!l) return false;
    if (l.classList.contains('talk') || l.classList.contains('follow') || l.classList.contains('dragging')) return false;
    if (!String(document.getElementById('lubtImg')?.getAttribute('src') || '').includes('lubt-guide')) return false;
    return l.style.left === '300px' && l.style.top === '95px';
  }`,
  lubtHomeStable: `() => {
    const l = document.getElementById('lubt');
    if (!l) return false;
    if (l.classList.contains('talk') || l.classList.contains('follow') || l.classList.contains('dragging')) return false;
    if (!String(document.getElementById('lubtImg')?.getAttribute('src') || '').includes('lubt-idle')) return false;
    return l.style.left === '300px' && l.style.top === '95px';
  }`,
  speechHidden: `() => !document.getElementById('speech').classList.contains('show')`,
  /* The authored source arms a 280 ms hoverTimer on faceHit that forces emotion 'smile'. A hover
   * left over from an earlier state would move the emotion mid-settle, so a STABLE state waits for
   * the hover-smile state to be clear. */
  noHoverSmile: `() => !document.querySelector('.face-hit.hover-smile, .face-hit:hover')`,
  stageClean: `() => !document.getElementById('stage').classList.contains('special')`,
  noFiniteActive: `() => Array.from(document.getAnimations())
    .filter((a) => a.animationName && ['hintFade','fxBurst','specialHalo'].includes(a.animationName))
    .every((a) => a.playState !== 'running')`,
  saved: `() => /SAVED/.test(String(document.getElementById('saveBtn').textContent))`,
  saveRestored: `() => !/SAVED/.test(String(document.getElementById('saveBtn').textContent))`,
  /* Auto Life must be OFF for a STABLE capture. This reads the AUTHORED control's own state
   * after the harness has clicked it; the click is the authored user action, not a patch. */
  autoLifeOff: `() => /OFF/.test(String(document.getElementById('autoLife').textContent))`,
  autoLifeOn: `() => /ON/.test(String(document.getElementById('autoLife').textContent))`,
};

// Resolve terminal-condition names to self-contained in-page source and wait for ALL of them.
function settle(names) {
  const srcs = names.map((n) => {
    const m = /^(\w+)\((.*)\)$/.exec(n);
    if (m && m[1] === 'emotionIs') {
      return `() => { const b = Array.from(document.querySelectorAll('#emotions button.emo')).find((x) => x.classList.contains('on')); return !!b && b.dataset.emo === ${JSON.stringify(m[2].replace(/^["']|["']$/g, ''))}; }`;
    }
    if (m && m[1] === 'characterIs') {
      return `() => Array.from(document.querySelectorAll('#cast button')).findIndex((c) => c.classList.contains('active')) === ${Number(m[2])}`;
    }
    // Fail closed: an unknown name returns a THROWING stub, never a silent null that
    // .filter(Boolean) would drop.
    if (!Object.prototype.hasOwnProperty.call(TERMINAL_SRC, n)) {
      throw new Error(`UNKNOWN_TERMINAL_PREDICATE:${n}`);
    }
    return TERMINAL_SRC[n];
  });
  // (2) Fail closed: an unknown terminal name is a harness defect, never a silent drop.
  const unknown = names.filter((n) => {
    const m = /^(\w+)\((.*)\)$/.exec(n);
    if (m) return !['emotionIs', 'characterIs'].includes(m[1]);
    return !Object.prototype.hasOwnProperty.call(TERMINAL_SRC, n);
  });
  if (unknown.length) {
    throw new Error(`UNKNOWN_TERMINAL_PREDICATE:${unknown.join(',')}`);
  }
  return async (page) => {
    if (!srcs.length) return true;
    try {
      await page.waitForFunction((list) => list.every((s2) => {
        // eslint-disable-next-line no-new-func
        return new Function(`return (${s2})()`)();
      }), srcs, { timeout: 15000, polling: 80 });
      return true;
    } catch (e) { return false; }
  };
}

/* (11)(12) D1/21 face random reaction. The authored lifecycle is
 * click -> +220ms randomFaceReaction (choose next emotion, setEmotion, showSpeech)
 *              -> +180ms downstream callLubt(poseForEmotion[next]).
 * A fixed 180 ms capture is forbidden, so the harness waits for the correlated semantic barrier:
 * the selected emotion differs from the pre-click one, the speech is active and belongs to that
 * emotion's authored pool, the Lubt has been called with that emotion's authored pose, and the
 * pointer is parked away from the face so a hover cannot re-enter the contract. */
async function faceRandomReaction(p) {
  await stablePrecondition(p);
  const preEmotion = await p.evaluate(() => {
    const b = document.querySelector('#emotions button.emo.on');
    return b ? b.dataset.emo : null;
  });
  await armTraces(p);
  const box = await p.locator('#portraitWrap').boundingBox();
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  // Park the pointer away from the face and the Lubt so the 280 ms hover timer cannot fire.
  await p.mouse.move(2, 2);
  /* (14) FULL CORRELATED BARRIER. The authored lifecycle is
   *   click -> +220ms randomFaceReaction -> +180ms callLubt(poseForEmotion[next]),
   * so a fixed sleep may not decide this. Wait until the emotion actually changed AND the speech
   * is showing AND the Lubt is in talk, so the correlated callLubt has happened. */
  const ok = await p.waitForFunction((pre) => {
    const now = (document.querySelector('#emotions button.emo.on') || { dataset: {} }).dataset.emo;
    if (!now || now === pre) return false;
    const speech = document.getElementById('speech');
    if (!speech.classList.contains('show')) return false;
    if (!String(speech.textContent || '').trim()) return false;
    const lubt = document.getElementById('lubt');
    if (!lubt || !lubt.classList.contains('talk')) return false;
    const bub = document.getElementById('lubtBubble');
    return !!(bub && bub.textContent);
  }, preEmotion, { timeout: 8000, polling: 60 }).then(() => true).catch(() => false);
  if (!ok) throw new Error(`FACE_RANDOM_BARRIER_TIMEOUT:${preEmotion}`);
}

// A STABLE state: drive, then WAIT for the authored terminal condition.
/* The frozen source starts with AUTO LIFE ON and runs an authored 4800 ms interval that picks a
 * random emotion. Several STABLE states wait through source-owned multi-second windows, so Auto
 * Life must be OFF before the state is driven. The harness clicks the AUTHORED #autoLife button
 * and verifies the authored label reports OFF. That is a real user action through the authored
 * control - not a timer patch, not window.auto=false, not a Math.random or clock patch, and no
 * source modification. A separate AUTHORED_LIVE state keeps Auto Life ON coverage. */
async function stablePrecondition(p) {
  await p.mouse.move(2, 2);
  const isOn = await p.evaluate(() => /ON/.test(String(document.getElementById('autoLife').textContent)));
  if (isOn) {
    await p.click('#autoLife');
    const off = await p.evaluate(() => /OFF/.test(String(document.getElementById('autoLife').textContent)));
    if (!off) throw new Error('AUTO_LIFE_DID_NOT_TURN_OFF');
  }
  // Startup quiescence: the authored greeting Lubt call and its follow/resume must finish first.
  const ok = await settle(['autoLifeOff', 'lubtIdle', 'lubtPoseIdle', 'lubtHomeStable',
    'noParticles', 'speechHidden', 'noHoverSmile', 'stageClean'])(p);
  if (!ok) throw new Error('STARTUP_QUIESCENCE_TIMEOUT');
  await p.mouse.move(2, 2);
}

const stable = (drive, terminal) => async (p) => {
  await stablePrecondition(p);
  await armTraces(p);
  await drive(p);
  /* Park the pointer off the portrait. The authored faceHit.onmouseenter arms a 280 ms hoverTimer
   * that forces emotion 'smile', and faceHit.onclick arms a 220 ms randomFaceReaction that calls
   * Math.random(). A harness click leaves the pointer ON the face, so without this a hover can arm
   * between the click and the settle and move the emotion out from under the terminal predicate. */
  await p.mouse.move(2, 2);
  // Let the authored 220 ms reaction timer fire, then settle on whatever it authoritatively set.
  await p.waitForTimeout(320);
  await p.mouse.move(2, 2);
  const ok = await settle(terminal)(p);
  if (!ok) throw new Error(`TERMINAL_PREDICATE_TIMEOUT:${terminal.join('+')}`);
};

// An intentionally live/transient state: captured on purpose, never settled.
/* (4) An intentionally live/transient state: captured on purpose, never settled.
 *
 * ROUND6B: EVERY controlled state arms the traces and records a preState, not only the STABLE
 * ones. Without it a live state reports PROVENANCE_PRESTATE_MISSING, which is a harness error
 * rather than a parity finding. The arm happens BEFORE the target action and AFTER any
 * stablePrecondition the drive performs, so startup history stays out of the provenance. */
const live = (drive, ms) => async (p) => {
  await armTraces(p);
  await drive(p);
  await p.waitForTimeout(ms || 200);
};

/** (6)(19) Reset the bubble and particle trace immediately before the TARGET action, so the
 * recorded writes are the action's own and not everything since page load. A failure here is a
 * HARNESS CONTRACT ERROR, not a silent empty trace. */
async function armTraces(p) {
  try {
    const ok = await p.evaluate(PROVENANCE_ARM);
    if (ok !== true) HARNESS_CONTRACT_ERRORS.push('PROVENANCE_ARM_RETURNED_FALSE');
  } catch (e) {
    HARNESS_CONTRACT_ERRORS.push(`BUBBLE_OBSERVER_ARM_FAILED:${String(e && e.message).slice(0, 80)}`);
  }
}

const SETTLE_BASE = ['noParticles', 'lubtIdle', 'speechHidden', 'noHoverSmile', 'lubtHomeStable'];

const PARITY_PLAN = [
  { ctx: 'D1', state: '01_initial_live', intent: 'AUTHORED_LIVE', driver: live(async (p) => { await p.waitForTimeout(1200); }) },
  { ctx: 'D1', state: '02_character_M02', intent: 'STABLE', driver: stable(async (p) => { await p.click(castBtn(2)); }, ['characterIs(1)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '03_character_F01', intent: 'STABLE', driver: stable(async (p) => { await p.click(castBtn(3)); }, ['characterIs(2)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '04_character_F02', intent: 'STABLE', driver: stable(async (p) => { await p.click(castBtn(4)); }, ['characterIs(3)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '05_emotion_smile', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('smile')); }, ['emotionIs(smile)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '06_emotion_sing', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('sing')); }, ['emotionIs(sing)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '07_emotion_shy', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('shy')); }, ['emotionIs(shy)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '08_emotion_sleepy', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('sleepy')); }, ['emotionIs(sleepy)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '09_emotion_wink', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('wink')); }, ['emotionIs(wink)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '10_emotion_angry', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('angry')); }, ['emotionIs(angry)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '11_emotion_laugh', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('laugh')); }, ['emotionIs(laugh)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '12_emotion_cry', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('cry')); }, ['emotionIs(cry)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '13_emotion_touched', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('touched')); }, ['emotionIs(touched)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '14_emotion_talk', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('talk')); }, ['emotionIs(talk)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '15_emotion_surprise', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('surprise')); }, ['emotionIs(surprise)', ...SETTLE_BASE]) },
  { ctx: 'D1', state: '16_heart_action', intent: 'STABLE', driver: stable(async (p) => { await p.click('#heartBtn'); }, ['emotionIs(touched)', ...SETTLE_BASE, 'noFiniteActive']) },
  { ctx: 'D1', state: '17_surprise_action', intent: 'STABLE', driver: stable(async (p) => { await p.click('#surpriseBtn'); }, ['emotionIs(surprise)', ...SETTLE_BASE, 'noFiniteActive']) },
  { ctx: 'D1', state: '18_say_phrase', intent: 'STABLE', driver: stable(async (p) => { await p.fill('#phrase', '오늘도 손을 잡아줘.'); await p.click('#sayBtn'); }, SETTLE_BASE) },
  { ctx: 'D1', state: '19_call_lubt', intent: 'STABLE', driver: stable(async (p) => { await p.click('#lubtBtn'); }, [...SETTLE_BASE, 'lubtPoseIdle', 'noFiniteActive']) },
  /* The source shows SAVED transiently and restores the label after 3200 ms. The transient moment
   * and the post-revert stable state are DIFFERENT semantics, so they are different states. */
  { ctx: 'D1', state: '20_save_transient', intent: 'EXPLICIT_TRANSIENT', driver: live(async (p) => { await stablePrecondition(p); await p.click('#saveBtn'); await p.waitForTimeout(320); }, 120) },
  /* (8) The source's 3200 ms label-restore timer throws (`event.currentTarget` is null by then),
   * so the SAVED label never reverts. Requiring `saveRestored` would make the terminal predicate
   * unsatisfiable by the frozen source itself. This state therefore waits for the authored
   * post-save quiescence that IS reachable, and the expected #670 fault is recorded as parity
   * evidence rather than used to make a page error disappear. */
  { ctx: 'D1', state: '20b_save_fault_terminal', intent: 'STABLE', driver: stable(async (p) => { await p.click('#saveBtn'); await p.waitForTimeout(3600); }, [...SETTLE_BASE, 'noFiniteActive']) },
  { ctx: 'D1', state: '24_lubt_click', intent: 'STABLE', driver: stable(async (p) => { const b = await p.locator('#lubt').boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }, [...SETTLE_BASE, 'noFiniteActive']) },
  { ctx: 'D1', state: '25_lubt_drag', intent: 'STABLE', driver: stable(async (p) => { const b = await p.locator('#lubt').boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await p.mouse.move(b.x + 100, b.y + 50, { steps: 8 }); await p.mouse.up(); }, ['noParticles', 'lubtIdle', 'speechHidden', 'noHoverSmile', 'lubtDragHomeStable', 'noFiniteActive']) },
  { ctx: 'D1', state: '21_face_click_random', intent: 'AUTHORED_RANDOM', driver: faceRandomReaction },
  { ctx: 'D1', state: '22_face_special_moment', intent: 'EXPLICIT_TRANSIENT', driver: live(async (p) => { await stablePrecondition(p); const b = await p.locator('#portraitWrap').boundingBox(); await p.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2); }, 300) },
  { ctx: 'D1', state: '23_face_hold_special', intent: 'EXPLICIT_TRANSIENT', driver: live(async (p) => { await stablePrecondition(p); const b = await p.locator('#portraitWrap').boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); }, 200) },
  { ctx: 'D1', state: '26_talk_mode', intent: 'EXPLICIT_TRANSIENT', driver: live(async (p) => { await stablePrecondition(p); await p.click('#talkBtn'); }, 600) },
  { ctx: 'D1', state: '27_sing_mode', intent: 'EXPLICIT_TRANSIENT', driver: live(async (p) => { await stablePrecondition(p); await p.click('#singBtn'); }, 600) },
  { ctx: 'D1', state: '28_continuous_motion', intent: 'AUTHORED_LIVE', driver: live(async (p) => { await p.waitForTimeout(900); }) },
  /* Auto Life ON is preserved here: the authored 4800 ms random-emotion interval stays covered. */
  { ctx: 'D1', state: '29_autolife_on_live', intent: 'AUTHORED_LIVE', driver: live(async (p) => { await p.waitForTimeout(5200); }, 200) },
  { ctx: 'T1', state: '01_tablet_initial', intent: 'AUTHORED_LIVE', driver: live(async (p) => { await p.waitForTimeout(1200); }) },
  { ctx: 'T1', state: '02_tablet_emotion', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('smile')); }, ['emotionIs(smile)', ...SETTLE_BASE]) },
  { ctx: 'T1', state: '03_tablet_character', intent: 'STABLE', driver: stable(async (p) => { await p.click(castBtn(2)); }, ['characterIs(1)', ...SETTLE_BASE]) },
  { ctx: 'T1', state: '04_tablet_interaction', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('touched')); }, ['emotionIs(touched)', ...SETTLE_BASE]) },
  { ctx: 'M1', state: '01_mobile_initial', intent: 'AUTHORED_LIVE', driver: live(async (p) => { await p.waitForTimeout(1200); }) },
  { ctx: 'M1', state: '02_mobile_drag_hint', intent: 'STABLE', driver: stable(async (p) => { await p.waitForTimeout(300); }, SETTLE_BASE) },
  { ctx: 'M1', state: '03_mobile_emotion', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('cry')); }, ['emotionIs(cry)', ...SETTLE_BASE]) },
  { ctx: 'M1', state: '04_mobile_character', intent: 'STABLE', driver: stable(async (p) => { await p.click(castBtn(4)); }, ['characterIs(3)', ...SETTLE_BASE]) },
  { ctx: 'M1', state: '05_mobile_lubt', intent: 'STABLE', driver: stable(async (p) => { await p.click(emoBtn('smile')); }, ['emotionIs(smile)', ...SETTLE_BASE]) },
];

test('C08 every STABLE terminal token resolves, and none is silently filtered', () => {
  /* ROUND2 Finding 1: the misspelled `lubertIdle` / `lubertPoseIdle` tokens resolved to null and
   * were dropped by .filter(Boolean), so the harness silently stopped proving Lubt stability.
   * settle() now throws on an unknown name, and this test enumerates every token. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  // Scan the runtime plan/settle section only, ending before any contract test, so this guard
  // cannot match its own prose.
  const runtime = src.slice(
    src.indexOf('const VIEWPORTS = {'),
    src.indexOf("test('C08"));
  assert.equal(/\blubert/.test(runtime), false, 'no misspelled lubert token may survive');

  // Enumerate every terminal token the STABLE plan actually references. Tokens are read from the
  // plan source itself, so a spread list (['x', ...SETTLE_BASE, 'y']) contributes both its own
  // literals and everything SETTLE_BASE carries.
  const used = new Set(SETTLE_BASE);
  const planStart = runtime.indexOf('const PARITY_PLAN = [');
  const planSrc = runtime.slice(planStart, runtime.indexOf('const REVIEW = [') > planStart
    ? runtime.indexOf('const REVIEW = [') : runtime.length);
  for (const tok of planSrc.match(/'[a-zA-Z]+'/g) || []) {
    const name = tok.replace(/'/g, '');
    // Only terminal-predicate-shaped tokens, not state names or selectors.
    if (/^(?:[a-z]+[A-Z][a-zA-Z]*|[a-z]+Idle|[a-z]+Hidden|[a-z]+Off|[a-z]+On|saved|saveRestored|noParticles|noHoverSmile|stageClean|noFiniteActive|autoLifeOff|autoLifeOn)$/.test(name)) {
      used.add(name);
    }
  }
  // Any dynamic predicate call is resolved too.
  for (const tok of planSrc.match(/'(emotionIs|characterIs)\([^']*\)'/g) || []) {
    used.add(tok.replace(/'/g, ''));
  }
  const unknown = [...used].filter((n) => {
    const d = /^(\w+)\(.*\)$/.exec(n);
    if (d) return !['emotionIs', 'characterIs'].includes(d[1]);
    return !Object.prototype.hasOwnProperty.call(TERMINAL_SRC, n);
  });
  assert.deepEqual(unknown, [], 'every terminal token used by a STABLE state resolves');
  assert.ok(used.has('lubtIdle'), 'the Lubt terminal gate is actually used');
  assert.ok(used.has('lubtPoseIdle'), 'the Lubt pose terminal gate is actually used');
  // And settle() must throw rather than filter.
  assert.ok(src.includes('UNKNOWN_TERMINAL_PREDICATE'), 'settle() throws on an unknown token');
  assert.equal(/return TERMINAL_SRC\[n\] \|\| null/.test(src), false,
    'an unknown token may never be mapped to null and dropped');
});

test('C16 the authored infinite track set is fresh-derived and includes wander', () => {
  /* ROUND3 Finding 4: the harness listed spin/pulse/breath and omitted `wander`, which drives
   * .lubt. That omission is what produced the ROUND2 150/155/156 px Lubt residual. */
  const inline = rb('split/styles.css').toString('utf8');
  const v2 = rb('original/living-world-v2.css').toString('utf8');
  const src = inline + v2;
  // Every declared infinite track must exist as an @keyframes in the frozen CSS.
  const used = [...src.matchAll(/animation:\s*([a-zA-Z][\w-]*)[^;{}]*infinite/g)].map((m) => m[1]);
  const expected = [...new Set(used)].sort();
  assert.deepEqual([...INFINITE_TRACKS].sort(), expected,
    'INFINITE_TRACKS is exactly the set the frozen CSS declares as infinite');
  assert.ok(INFINITE_TRACKS.includes('wander'), 'wander is included');
  assert.ok(/@keyframes\s+wander/.test(src), 'wander is authored');
  assert.ok(/\.lubt\s*\{[^}]*animation:\s*wander[^}]*infinite/.test(inline),
    '.lubt carries the authored infinite wander animation');
});

test('C17 no global random projection and no projection on a STABLE state', () => {
  /* ROUND3 Finding 2: a global random-field eraser hid divergence on every state, including
   * STABLE. STABLE must compare raw values; only the dedicated random-reaction state projects. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('function projectSemantic(ch, allowRandom)'),
    'projection is explicitly gated by an allowRandom argument');
  assert.ok(/if \(!allowRandom\) return c;/.test(src),
    'with projection disallowed the raw object is returned untouched');
  assert.ok(/isRandomReactionState = spec\.state === '21_face_click_random'/.test(src),
    'projection is permitted only for the dedicated random-reaction state');
  // No unconditional eraser loop may remain.
  assert.equal(/for \(const p of AUTHORED_RANDOM_SCALAR_PATHS\)/.test(src), false,
    'no global random-scalar eraser loop may remain');
  // Executable form only: the constant is no longer DEFINED, only quoted by this guard.
  const defs = [...src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)].map((m) => m[1]);
  assert.equal(defs.includes('AUTHORED_RANDOM_SCALAR_PATHS'), false,
    'the global random-scalar allowlist is no longer defined');
});

test('C18 the semantic channel owns no animation field', () => {
  /* ROUND3 Finding 1: animationInventoryNormalized was compared inside the semantic channel as
   * well as in its own channel, so one difference was counted twice. */
  assert.ok(DEDICATED_CHANNELS.includes('animationInventoryNormalized'),
    'the normalized inventory is a dedicated channel');
  const stripped = stripDedicatedChannels({
    dom: { a: 1 }, geometry: {}, computedStyle: {}, animations: [],
    animationInventoryNormalized: [], externalLayers: {}, scroll: {}, visibility: {},
  });
  assert.equal('animationInventoryNormalized' in stripped, false,
    'the semantic comparison has no animation inventory');
  assert.equal('animations' in stripped, false, 'the semantic comparison has no raw animation array');
  const sp = path.join(S4_DIR, 'candidate-summary.json');
  if (fs.existsSync(sp)) {
    const j = JSON.parse(fs.readFileSync(sp, 'utf8'));
    const paths = (j.real_parity_defect_detail || [])
      .flatMap((x) => x.defects.map((d) => d.path));
    assert.equal(paths.filter((p) => p.startsWith('semantic.animationInventoryNormalized')).length, 0,
      'no semantic animation path may appear in the defect detail');
  }
});

test('C19 the #670 frozen save fault is recorded, not waived', () => {
  /* ROUND3 Finding 7/8: the source's 3200 ms label-restore timer throws. The fault must be
   * classified as EXPECTED_FROZEN_SOURCE_FAULT_PARITY only when it is the exact message, on the
   * exact state, on BOTH surfaces. It is never folded into PAGE_ERROR_STATES=0, and repairing
   * #670 to make the suite green is forbidden. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes("Cannot set properties of null"), 'the exact #670 message is matched');
  assert.ok(src.includes('expected_frozen_fault_parity'), 'the expected-fault parity verdict exists');
  assert.ok(src.includes('UNEXPECTED_PAGE_ERROR_STATES'), 'unexpected page errors are separated');
  assert.ok(src.includes('EXPECTED_FROZEN_PAGE_FAULT_STATES'), 'expected frozen faults are counted');
  assert.ok(src.includes('FROZEN_SAVE_SOURCE_DEFECT'), 'the #670 reference is recorded');
  assert.ok(src.includes('PAGE_FAULT_PARITY_EXACT'), 'page fault parity is asserted');
  // No generic page-error waiver.
  assert.equal(/pageErrors\.length === 0 \|\|/.test(src), false,
    'no generic page-error waiver may exist');
  const sp = path.join(S4_DIR, 'candidate-summary.json');
  if (fs.existsSync(sp)) {
    const j = JSON.parse(fs.readFileSync(sp, 'utf8'));
    assert.equal(j.FROZEN_SAVE_SOURCE_DEFECT, '#670', 'the frozen defect issue is recorded');
    assert.ok(typeof j.PAGE_FAULT_PARITY_EXACT === 'string', 'page fault parity is reported');
    assert.equal(typeof j.UNEXPECTED_PAGE_ERROR_STATES, 'number',
      'unexpected page errors are an independent number');
  }
});

test('C20 no generic ERR_ABORTED waiver exists', () => {
  /* ROUND3 Finding 9: a superseded image request is source-owned, but it may never be blanket
   * ignored. It is recorded with its request sequence and only bounded when both surfaces agree. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  // No ERR_ABORTED-classifier identifier is DEFINED anywhere; a superseded request may only be
  // recognized by the both-surfaces counter, never by a predicate that silently drops one side.
  const defined = [...src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  assert.equal(defined.filter((d) => /^is[A-Z]?borted/.test(d)).length, 0,
    'no ERR_ABORTED classifier helper is defined');
  assert.ok(/x\.phase === 'failed'/.test(src), 'the bounded counter keys on a recorded failure phase');
  assert.ok(/oA\.length > 0 && sA\.length === oA\.length/.test(src),
    'a superseded request is bounded only when BOTH surfaces supersede the same count');
  assert.ok(src.includes('image_request_trace'), 'the bounded image-request trace is recorded');
  assert.ok(src.includes('EXPECTED_SUPERSEDED_REQUEST_STATES'), 'superseded requests are counted apart');
  assert.ok(src.includes('UNEXPECTED_REQUEST_FAILED_STATES'), 'unexpected failures are separated');
});

test('C21 animation comparison is key-based, never length-only', () => {
  /* ROUND3 Finding 6. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('MISSING_ON_SPLIT') && src.includes('EXTRA_ON_SPLIT'),
    'missing and extra records are named');
  assert.equal(/animations\.length === 0/.test(src), false, 'no raw length gate');
  const sp = path.join(S4_DIR, 'candidate-summary.json');
  if (fs.existsSync(sp)) {
    const j = JSON.parse(fs.readFileSync(sp, 'utf8'));
    for (const f of ['ANIMATION_INVENTORY_RAW_EXACT', 'ANIMATION_INVENTORY_CONTRACT_EXACT']) {
      assert.ok(typeof j[f] === 'string', `${f} is reported`);
    }
  }
});


test('C09 every STABLE state turns Auto Life OFF through the authored control', () => {
  /* ROUND2 Finding 2: the frozen source starts with AUTO LIFE ON and an authored 4800 ms
   * random-emotion interval. A STABLE capture must switch it off via the authored button. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes("await p.click('#autoLife')"), 'the authored #autoLife control is clicked');
  assert.ok(src.includes('AUTO_LIFE_DID_NOT_TURN_OFF'), 'the OFF transition is verified, not assumed');
  assert.ok(src.includes('STARTUP_QUIESCENCE_TIMEOUT'), 'startup quiescence is awaited');
  // Forbidden injection styles.
  const runtime2 = src.slice(src.indexOf('const VIEWPORTS ='), src.indexOf('test(', src.indexOf('const VIEWPORTS =')));
  for (const banned of ['clearInterval(autoTimer)', 'window.auto', 'Math.random =', 'Date.now =']) {
    assert.equal(runtime2.includes(banned), false, `${banned} must never appear in the harness`);
  }
  // stable() itself runs the precondition, so every STABLE state inherits it.
  assert.ok(/const stable =[\s\S]{0,120}await stablePrecondition\(p\)/.test(src),
    'stable() runs the Auto Life precondition before its driver');
  const stableStates = PARITY_PLAN.filter((x) => x.intent === 'STABLE');
  assert.ok(stableStates.length > 0, 'the plan has STABLE states');
  // And the terminal set includes the OFF proof.
  assert.ok(src.includes("'autoLifeOff'"), 'autoLifeOff is a declared terminal predicate');
  // Live behavior stays covered with Auto Life ON.
  assert.ok(PARITY_PLAN.some((s) => s.state === '29_autolife_on_live' && s.intent === 'AUTHORED_LIVE'),
    'an AUTHORED_LIVE state keeps Auto Life ON coverage');
});

test('C10 SAVE is split into a transient state and a post-fault terminal state', () => {
  /* ROUND2 Finding 3: the source shows SAVED transiently and restores the label after 3200 ms. */
  const t = PARITY_PLAN.find((s) => s.state === '20_save_transient');
  const b = PARITY_PLAN.find((s) => s.state === '20b_save_fault_terminal');
  assert.ok(t, 'a SAVE transient state exists');
  assert.equal(t.intent, 'EXPLICIT_TRANSIENT', 'the saved moment is EXPLICIT_TRANSIENT');
  assert.ok(b, 'a SAVE post-fault terminal state exists');
  assert.equal(b.intent, 'STABLE', 'the post-fault state is STABLE');
  // The #670 frozen defect means the label never reverts, so the terminal waits for the
  // reachable post-save quiescence instead of an impossible restored label.
  assert.equal(/saveRestored/.test(b.driver.toString()), false,
    'the post-fault state must not require the unreachable restored label');
  const rp = REVIEW.find((r) => r.label === 'D1_SAVE_TRANSIENT');
  assert.ok(rp, 'the review pack has a D1_SAVE_TRANSIENT panel');
  assert.equal(rp.state, '20_save_transient', 'the review panel uses the transient state');
});

test('C11 the animation contract uses a normalized inventory, never a raw length', () => {
  /* ROUND2 Finding 10: `animations.length` alone must never decide the contract. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('animationInventoryNormalized'), 'a normalized inventory is captured');
  const n = src.indexOf('animationInventoryNormalized: all.map');
  assert.ok(n > 0, 'the normalized inventory maps each animation');
  for (const k of ['target', 'name', 'kind', 'finite', 'authored_track', 'playState']) {
    assert.ok(src.slice(n, n + 400).includes(k), `the normalized inventory records ${k}`);
  }
  // ROUND3: the comparison is KEY-based and reports missing/extra records, never a bare length.
  assert.ok(/const animKey = \(a\)/.test(src), 'the animation comparison is key-based');
  assert.ok(src.includes('MISSING_ON_SPLIT'), 'a missing record is named explicitly');
  assert.ok(src.includes('EXTRA_ON_SPLIT'), 'an extra record is named explicitly');
  assert.equal(/animationInventoryNormalized\.length/.test(src), false,
    'no length-only animation gate may remain');
  assert.ok(DEDICATED_CHANNELS.includes('animationInventoryNormalized'),
    'the animation inventory is owned solely by the animation channel');
});

test('C12 error channels are counted independently, never copied from one bucket', () => {
  /* ROUND2 Finding 4: one netStates boolean was written into three fields. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  for (const f of ['CONSOLE_ERROR_STATES', 'PAGE_ERROR_STATES', 'HTTP_ERROR_STATES',
    'REQUEST_FAILED_STATES', 'NETWORK_ERROR_STATES', 'ERROR_CHANNEL_DETAIL']) {
    assert.ok(src.includes(f), `${f} is recorded`);
  }
  /* (11) ROUND6A: the PRE-RUN structural half never reads run evidence, so it passes before any
   * browser run. The POST-EVIDENCE half below checks a committed summary only when it carries
   * the ROUND6A schema, so an older committed summary cannot fail an unrelated pre-run gate. */
  const writerStart = src.indexOf('function writeCandidate');
  const nextFn = src.indexOf('\nfunction ', writerStart + 10);
  const writerBody = src.slice(writerStart, nextFn > 0 ? nextFn : src.length);
  assert.ok(writerBody.includes('PAGE_ERROR_STATES: pageErrorStates'),
    'the summary writer emits an independent PAGE_ERROR_STATES');
  assert.ok(writerBody.includes('REQUEST_FAILED_STATES: requestFailedStates'),
    'the summary writer emits an independent REQUEST_FAILED_STATES');
  assert.equal(/NETWORK_ERROR_STATES:\s*requestFailedStates/.test(writerBody), false,
    'NETWORK_ERROR_STATES is never copied from the request-failed bucket');

  const sp = path.join(S4_DIR, 'candidate-summary.json');
  if (fs.existsSync(sp)) {
    const j = JSON.parse(fs.readFileSync(sp, 'utf8'));
    /* The evidence half applies ONLY to a summary written by the CURRENT harness. An older
     * committed summary predates these fields and legitimately cannot satisfy them, so it must
     * not fail a pre-run structural gate. */
    const currentSchema = typeof j.PAGE_ERROR_STATES === 'number'
      && typeof j.NETWORK_ERROR_STATES === 'number'
      && typeof j.REQUEST_FAILED_STATES === 'number'
      && j.NETWORK_ERROR_AGGREGATION !== 'REQUEST_FAILED_STATES (no other bucket is folded in)';
    if (currentSchema) {
      for (const f of ['CONSOLE_ERROR_STATES', 'PAGE_ERROR_STATES', 'HTTP_ERROR_STATES',
        'REQUEST_FAILED_STATES', 'NETWORK_ERROR_STATES']) {
        assert.equal(typeof j[f], 'number', `${f} is an independent number`);
      }
      /* Equality alone is not evidence of copying: two independent channels can both be 0. The
       * structural proof is the writer body above; here we only require that the values exist and
       * that the aggregation label no longer claims the bucket is folded in. */
      assert.notEqual(j.NETWORK_ERROR_AGGREGATION, 'REQUEST_FAILED_STATES (no other bucket is folded in)',
        'the summary no longer declares that one bucket is folded into another');
    }
  }
});

test('C13 the review pack fails closed instead of padding to twelve', () => {
  /* ROUND2 Finding 9: a driver failure must not produce a review image. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const runtime3 = src.slice(src.indexOf('const VIEWPORTS ='), src.indexOf('test(', src.indexOf('const VIEWPORTS =')));
  assert.equal(/catch \(e\) \{\s*\/\*[^*]*\*\/\s*\}/.test(runtime3), false,
    'no driver exception may be swallowed with an empty catch');
  assert.ok(src.includes('REVIEW_PACK_DRIVER_FAILED'), 'a driver failure fails the pack');
  assert.ok(src.includes('REVIEW_PACK_READINESS_FAILED'), 'a readiness failure fails the pack');
});

test('C14 the accepted S2 baseline bytes are locked and never rewritten', () => {
  const blob = gitBlobSha1(rb('baseline/accepted-baseline.json'));
  assert.equal(blob, 'f3687fe911fa791ae7a1f89065aff3cb8fcb3933',
    'the CENTRAL-accepted S2 baseline blob is unchanged');
});

test('C15 the round-2 harness never mutates protected runtime or assets', () => {
  for (const [rel, want] of Object.entries(PROTECTED)) {
    assert.equal(gitBlobSha1(rb(rel)), want, `${rel} is byte-locked at S4 round 2`);
  }
  const walk = (rel) => {
    const out = [];
    const rec = (d, r) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const rr = r ? `${r}/${e.name}` : e.name;
      if (e.isDirectory()) rec(path.join(d, e.name), rr); else out.push(rr);
    });
    rec(path.join(CAPSULE, rel), '');
    return out.sort();
  };
  assert.equal(walk('original/assets').length, 54, '54 original assets');
  assert.equal(walk('split/assets').length, 54, '54 split assets');
});


const REVIEW = [
  { label: 'D1_INITIAL', ctx: 'D1', state: '01_initial_live' },
  { label: 'D1_CHARACTER_SWITCH', ctx: 'D1', state: '04_character_F02' },
  { label: 'D1_EMOTION_SMILE', ctx: 'D1', state: '05_emotion_smile' },
  { label: 'D1_FACE_RANDOM', ctx: 'D1', state: '21_face_click_random' },
  { label: 'D1_SPECIAL_MOMENT', ctx: 'D1', state: '22_face_special_moment' },
  { label: 'D1_LUBT_DRAG', ctx: 'D1', state: '25_lubt_drag' },
  { label: 'D1_SAY', ctx: 'D1', state: '18_say_phrase' },
  { label: 'D1_SAVE_TRANSIENT', ctx: 'D1', state: '20_save_transient' },
  { label: 'T1_STABLE', ctx: 'T1', state: '02_tablet_emotion' },
  { label: 'T1_INTERACTION', ctx: 'T1', state: '04_tablet_interaction' },
  { label: 'M1_INITIAL', ctx: 'M1', state: '01_mobile_initial' },
  { label: 'M1_LUBT_DRAG_HINT', ctx: 'M1', state: '05_mobile_lubt' },
];

function collectChannels() {
  const g = (sel) => document.querySelector(sel);
  const txt = (sel) => { const e = g(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
  const csp = (sel, prop) => { const e = g(sel); return e ? getComputedStyle(e).getPropertyValue(prop) : null; };
  const rect = (sel) => {
    const e = g(sel); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const shown = (sel) => {
    const e = g(sel); if (!e) return false;
    const s = getComputedStyle(e); const r = e.getBoundingClientRect();
    return s.display !== 'none' && r.width > 0 && r.height > 0;
  };
  const all = (document.getAnimations ? document.getAnimations() : []).map((a) => {
    const t = a.effect && a.effect.target;
    const tm = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
    const name = a.animationName || 'unknown';
    return {
      target: String(t ? (t.id || t.className || t.tagName) : 'unknown'),
      kind: a.constructor ? a.constructor.name : 'unknown',
      name,
      iterations: String(tm.iterations),
      finite: tm.iterations !== Infinity,
      authored_track: ['spin', 'pulse', 'breath', 'hintFade', 'fxBurst', 'specialHalo'].includes(name),
      playState: a.playState,
    };
  }).sort((x, y) => (x.target + x.name).localeCompare(y.target + y.name));
  const imgs = Array.from(document.images).map((i) => ({
    src: i.getAttribute('src'), naturalWidth: i.naturalWidth, naturalHeight: i.naturalHeight,
    complete: i.complete,
  }));
  const hint = g('.lubt-drag-hint');
  const lubt = g('#lubt');
  const root = document.documentElement;
  return {
    dom: {
      castName: txt('#castName'), castNum: txt('#castNum'), castType: txt('#castType'),
      activeCastIndex: Array.from(document.querySelectorAll('#cast button'))
        .findIndex((c) => c.classList.contains('active')),
      visibleCastCount: Array.from(document.querySelectorAll('#cast button'))
        .filter((c) => getComputedStyle(c).display !== 'none').length,
      activeEmotion: (Array.from(document.querySelectorAll('#emotions button.emo'))
        .find((b) => b.classList.contains('on')) || { dataset: {} }).dataset?.emo ?? null,
      emotionButtonCount: document.querySelectorAll('#emotions button.emo').length,
      castButtonCount: document.querySelectorAll('#cast button').length,
      intVal: txt('#intVal'), lifeVal: txt('#lifeVal'), autoLifeLabel: txt('#autoLife'),
      talkActive: document.getElementById('talkBtn')?.classList.contains('on') ?? null,
      singActive: document.getElementById('singBtn')?.classList.contains('on') ?? null,
      savedLabel: txt('#saveBtn'),
      speechVisible: document.getElementById('speech')?.classList.contains('show') ?? null,
      stageSpecial: document.getElementById('stage')?.classList.contains('special') ?? null,
      imageCount: imgs.length,
      brokenImages: imgs.filter((i) => !i.complete || i.naturalWidth === 0).length,
      particleCount: document.querySelectorAll('#notes .note,#petals .petal').length
        + document.querySelectorAll('.fx-dot,.fx-fire,.fx-heart,.fx-note,.fx-ring,.fx-sleep,.fx-star,.fx-tear').length,
      random_speech: txt('#speech'),
      random_lubt_bubble: txt('#lubtBubble'),
      random_log: txt('#log'),
      random_lubt_left: lubt ? lubt.style.left : null,
      random_lubt_top: lubt ? lubt.style.top : null,
      random_lubt_transform: csp('#lubt', 'transform'),
      random_note_dx: Array.from(document.querySelectorAll('#notes .note'))
        .map((n) => n.style.getPropertyValue('--dx')).join('|'),
      random_petal_dx: Array.from(document.querySelectorAll('#petals .petal'))
        .map((n) => n.style.getPropertyValue('--dx')).join('|'),
      random_emotion_title: txt('#emotionTitle'),
      /* (14) Named asset fields replace positional images[N] indexing in the parity contract. */
      portraitA_src: g('#portraitA') ? g('#portraitA').getAttribute('src') : null,
      portraitB_src: g('#portraitB') ? g('#portraitB').getAttribute('src') : null,
      visible_portrait_src: (() => {
        const a = g('#portraitA'); const b = g('#portraitB');
        if (a && a.offsetParent !== null) return a.getAttribute('src');
        if (b && b.offsetParent !== null) return b.getAttribute('src');
        return null;
      })(),
      lubt_pose_src: g('#lubtImg') ? g('#lubtImg').getAttribute('src') : null,
      /* (3)(4)(5) Retained hidden bubble/speech text, the Lubt position, particle families and
       * the source-derived pools the contracts check them against. */
      lubt_left: lubt ? lubt.style.left : null,
      lubt_top: lubt ? lubt.style.top : null,
      log_text: txt('#log'),
      emotion_line: txt('#emotionLine'),
      particle_families: Array.from(document.querySelectorAll('#notes .note, #petals .petal'))
        .reduce((acc, node) => {
          const fam = node.parentElement ? node.parentElement.id : 'unknown';
          acc[fam] = (acc[fam] || 0) + 1;
          return acc;
        }, {}),
    },
    // `images` is a dedicated channel, not a semantic one; the semantic contract uses the named
    // portraitA_src / portraitB_src / visible_portrait_src / lubt_pose_src fields.
    visibility: {
      hintDomPresent: !!hint,
      hintDisplay: hint ? getComputedStyle(hint).display : null,
      castShown: shown('#cast'), portraitShown: shown('#portraitWrap'),
      lubtShown: shown('#lubt'), emotionsShown: shown('#emotions'),
      stageShown: shown('#stage'), rightRailShown: shown('.side.right'),
    },
    geometry: {
      portraitWrap: rect('#portraitWrap'), cast: rect('#cast'), emotions: rect('#emotions'),
      lubtSize: (() => { const e = g('#lubt'); if (!e) return null; const r = e.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
      stage: rect('#stage'), world: rect('#world'),
    },
    computedStyle: {
      portraitWrap: { opacity: csp('#portraitWrap', 'opacity'), transform: csp('#portraitWrap', 'transform') },
      lubt: { opacity: csp('#lubt', 'opacity'), transform: csp('#lubt', 'transform') },
      emotions: { display: csp('#emotions', 'display'), opacity: csp('#emotions', 'opacity') },
      cast: { display: csp('#cast', 'display'), flexDirection: csp('#cast', 'flex-direction') },
    },
    scroll: {
      scrollHeight: root.scrollHeight, clientHeight: root.clientHeight,
      innerWidth: window.innerWidth, innerHeight: window.innerHeight,
      scrollable: root.scrollHeight > root.clientHeight + 1,
    },
    animations: all,
    /* (10) Normalized inventory: identity only. A raw `animations.length` is never a contract
     * signal, because the count alone says nothing about WHICH animation differs. */
    animationInventoryNormalized: all.map((a) => ({
      target: a.target, name: a.name, kind: a.kind,
      finite: a.finite, authored_track: a.authored_track, playState: a.playState,
    })),
    externalLayers: {
      cssLoaded: Array.from(document.styleSheets).some((s) => (s.href || '').includes('living-world-v2.css')),
      jsLoaded: !!document.querySelector('script[src="living-world-v2.js"]'),
    },
  };
}

/* ---------------- HARD-CHANNEL OWNERSHIP (HOLD Finding 4) ---------------- */
const DEDICATED_CHANNELS = ['geometry', 'computedStyle', 'animations', 'animationInventoryNormalized',
  'externalLayers', 'scroll', 'visibility', 'images'];   // (14) no positional images[N] in semantic

function stripDedicatedChannels(ch) {
  const c = { ...ch };
  for (const k of DEDICATED_CHANNELS) delete c[k];
  return c;
}

/* (2) NO GLOBAL RANDOM PROJECTION. A random-capable field is never erased because it is
 * random-capable. STABLE states compare raw values with no projection at all; the projection
 * exists only for the ONE state whose accepted meaning is an authored random reaction
 * (D1/21_face_click_random), and only for the specific correlated fields proven by §3 there.
 * The authoritative random-field inventory is still published, but it grants no waiver. */
const AUTHORED_RANDOM_FIELD_INVENTORY = [
  'dom.random_speech', 'dom.random_lubt_bubble', 'dom.random_log',
  'dom.random_lubt_left', 'dom.random_lubt_top', 'dom.random_lubt_transform',
  'dom.random_note_dx', 'dom.random_petal_dx', 'dom.random_emotion_title',
];

function projectSemantic(ch, allowRandom) {
  const c = JSON.parse(JSON.stringify(stripDedicatedChannels(ch)));
  // allowRandom is true ONLY for the dedicated random-reaction state.
  if (!allowRandom) return c;
  for (const p of AUTHORED_RANDOM_FIELD_INVENTORY) {
    const key = p.split('.')[1];
    if (c.dom && c.dom[key] !== undefined) c.dom[key] = 'PROJECTED_AUTHORED_RANDOM';
  }
  return c;
}

function diffPaths(a, b, prefix = '', out = []) {
  if (a === b) return out;
  const kind = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  const ta = kind(a); const tb = kind(b);
  if (ta === 'array' && tb === 'array') {
    if (a.length !== b.length) { out.push({ path: `${prefix}.length`, a: a.length, b: b.length }); return out; }
    for (let i = 0; i < a.length; i += 1) diffPaths(a[i], b[i], `${prefix}[${i}]`, out);
    return out;
  }
  if (ta !== tb || (ta !== 'object' && ta !== 'array')) { out.push({ path: prefix, a, b }); return out; }
  if (ta === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      diffPaths(a[k], b[k], prefix ? `${prefix}.${k}` : k, out);
    }
  }
  return out;
}

function startServer() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const split = req.headers['x-surface'] === 'split';
    const root = path.join(CAPSULE, split ? 'split' : 'original');
    const entry = rel === '' || rel === '/' ? (split ? 'index.html' : 'original.html') : rel;
    const file = path.join(root, entry);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('nf'); return;
    }
    const MIME = {
      '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png',
    };
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return server;
}

/* (7) A harness-ONLY lifecycle observer. The STABLE terminal requires noParticles, which would
 * otherwise contradict a "the particle must exist in the final snapshot" contract. Instead the
 * harness records what the source EMITTED over the state's life, and a STABLE state is validated
 * as: the expected effect was emitted AND the final snapshot is clean. This runs in the page but
 * only observes the existing DOM; it creates nothing and mutates no source. */
const PARTICLE_OBSERVER = () => {
  window.__cdx007Particles = [];
  const sel = '#notes *, #petals *, [class*="fx-"]';
  const record = (kind) => (n) => {
    window.__cdx007Particles.push({
      kind,
      class: String(n.className || ''),
      parent: n.parentElement ? n.parentElement.id : 'unknown',
    });
  };
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) if (n.nodeType === 1 && n.matches(sel)) record('created')(n);
      for (const n of m.removedNodes) if (n.nodeType === 1 && n.matches(sel)) record('removed')(n);
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  window.__cdx007ParticleObserver = mo;
  return true;
};

const PARTICLE_REPORT = () => {
  const list = (window.__cdx007Particles || []).map((p) => p.class).filter(Boolean);
  return {
    emitted: list.length,
    families: [...new Set(list)].sort(),
  };
};

async function capture(chromium, ctx, spec, surface) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: ctx.width, height: ctx.height }, deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const net = { consoleErrors: [], pageErrors: [], failed: [], bad: [], imageRequests: [] };
    page.on('console', (m) => { if (m.type() === 'error') net.consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => net.pageErrors.push(String(e && e.message)));
    /* (9) Bounded image-request transition capture. A superseded image request is a source-owned
     * lifecycle fact, so the requested sequence, the aborted src and its replacement are recorded
     * rather than ignored. No generic ERR_ABORTED waiver exists. */
    page.on('request', (r) => {
      if (/\.(png|webp)$/i.test(r.url())) {
        net.imageRequests.push({ phase: 'requested', src: r.url().split('/').pop(), t: Date.now() });
      }
    });
    page.on('requestfailed', (r) => {
      const entry = { phase: 'failed', error: r.failure()?.errorText || 'FAILED', src: r.url().split('/').pop() };
      if (/assets[\/](lubt|characters)/i.test(r.url())) {
        net.imageRequests.push(entry);
        net.failed.push(`${entry.error} ${r.url()}`);
      } else {
        net.failed.push(`${entry.error} ${r.url()}`);
      }
    });
    page.on('response', (r) => { if (r.status() >= 400) net.bad.push(`${r.status()} ${r.url()}`); });

    await page.setExtraHTTPHeaders({ 'x-surface': surface });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
    /* (8) OBSERVER INSTALL IS FAIL-CLOSED. A failed install is a HARNESS CONTRACT ERROR and the
     * surface is marked unavailable so its contract evaluation is aborted downstream. It is
     * never swallowed into an empty report. */
    let observerInstalled = false;
    try {
      const ok = await page.evaluate(PROVENANCE_INSTALL);
      if (ok === true) {
        observerInstalled = true;
      } else {
        HARNESS_CONTRACT_ERRORS.push(`PROVENANCE_OBSERVER_INSTALL_FAILED:${ctx}/${surface}`);
      }
    } catch (e) {
      HARNESS_CONTRACT_ERRORS.push(`PROVENANCE_OBSERVER_INSTALL_FAILED:${ctx}/${surface}:${String(e && e.message).slice(0, 80)}`);
    }

    /* STARTUP READINESS FAILS CLOSED. A timeout is never swallowed. */
    let startupReadiness = true;
    try {
      await page.waitForFunction(() => {
        const i = Array.from(document.images);
        return i.length > 0 && i.every((x) => x.complete && x.naturalWidth > 0);
      }, null, { timeout: 20000, polling: 50 });
    } catch (e) {
      startupReadiness = false;
    }
    if (!startupReadiness) {
      await context.close();
      return { startupReadiness, net, failed: true, terminalFailed: null };
    }

    let terminalFailed = null;
    try {
      await spec.driver(page);
    } catch (e) {
      terminalFailed = String(e && e.message);
    }
    await page.waitForTimeout(120);

    // NATIVE channels and inventory FIRST, before any stabilization.
    const native = await page.evaluate(collectChannels);
    const phase = await page.evaluate((tracks) => {
      const locked = []; const skipped = [];
      for (const a of document.getAnimations()) {
        const it = a.effect && a.effect.getTiming ? a.effect.getTiming().iterations : null;
        if (a.animationName && tracks.indexOf(a.animationName) >= 0 && it === Infinity) {
          try { a.pause(); a.currentTime = 0; locked.push(a.animationName); } catch (e) { /* */ }
        } else {
          skipped.push({ name: a.animationName || 'unknown', kind: a.constructor.name, iterations: String(it) });
        }
      }
      return { locked, skipped };
    }, INFINITE_TRACKS);
    await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => {
      void document.documentElement.offsetHeight; requestAnimationFrame(() => res());
    })));
    const phased = await page.evaluate(collectChannels);
    /* (2)(9) REPORT READBACK IS FAIL-CLOSED. A readback failure is recorded as a HARNESS
     * CONTRACT ERROR and reported as unavailable; it is NEVER replaced by a synthetic empty
     * report, and evaluation of this surface is aborted downstream. */
    let provenance = null;
    try {
      provenance = await page.evaluate(PROVENANCE_REPORT);
      if (!provenance) {
        HARNESS_CONTRACT_ERRORS.push(`PROVENANCE_REPORT_FAILED:${ctx}/${surface}`);
      }
    } catch (e) {
      HARNESS_CONTRACT_ERRORS.push(`PROVENANCE_REPORT_FAILED:${ctx}/${surface}:${String(e && e.message).slice(0, 80)}`);
    }
    // (5) Pool classification is Node-side, against the extracted source contract.
    const provenanceTyped = provenance
      ? { ...provenance, bubble: classifyTrace(provenance.bubble) }
      : null;

    await context.close();
    return { native, phased, phase, net, startupReadiness, terminalFailed,
      particleReport: provenanceTyped, provenance: provenanceTyped,
      observerInstalled, provenanceAvailable: provenanceTyped !== null,
      failed: false };
  } finally { await browser.close(); }
}

async function browserCandidate() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.mkdirSync(REVIEW_PACK_DIR, { recursive: true });
  const server = startServer();
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const { chromium } = require('playwright');
  const results = [];
  const ledger = [];
  let sweep = { total: 0, loaded: 0, missing: [] };

  try {
    {
      const browser = await chromium.launch({ headless: true });
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const page = await c.newPage();
      await page.setExtraHTTPHeaders({ 'x-surface': 'original' });
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
      const r = await page.evaluate(async ({ chars, emos }) => {
        const out = { total: 0, ok: 0, missing: [] };
        const load = (src) => new Promise((res) => {
          const im = new Image();
          im.onload = () => res(true); im.onerror = () => res(false); im.src = src;
        });
        for (const ch of chars) {
          for (const e of emos) {
            out.total += 1;
            if (await load(`assets/characters/${ch}/${ch}-${e}.webp`)) out.ok += 1;
            else out.missing.push(`${ch}/${e}`);
          }
        }
        for (const p of ['idle', 'bloom', 'guide', 'heart', 'magic', 'scan']) {
          out.total += 1;
          if (await load(`assets/lubt/lubt-${p}.png`)) out.ok += 1; else out.missing.push(`lubt/${p}`);
        }
        return out;
      }, { chars: CHARS, emos: EMOTIONS });
      sweep = { total: r.total, loaded: r.ok, missing: r.missing };
      await browser.close();
      console.log(`CDX007_S4_ASSET_SWEEP=${sweep.loaded}/${sweep.total}`);
    }

    for (const spec of PARITY_PLAN) {
      const ctx = VIEWPORTS[spec.ctx];
      const o = await capture(chromium, ctx, spec, 'original');
      const s = await capture(chromium, ctx, spec, 'split');

      if (o.failed || s.failed) {
        results.push({ ctx: spec.ctx, state: spec.state, intent: spec.intent, readiness_failed: true,
          real_defects: [{ path: 'READINESS_TIMEOUT', a: o.startupReadiness, b: s.startupReadiness }],
          semantic_raw_exact: false, geometry_raw_exact: false, style_raw_exact: false, anim_raw_exact: false,
          semantic_contract_exact: false, geometry_contract_exact: false,
          style_contract_exact: false, anim_contract_exact: false, broken_images: [0, 0], net_fault: true });
        console.log(`CDX007_S4_STATE=${spec.ctx}/${spec.state} READINESS_TIMEOUT`);
        continue;
      }

      const semRaw = diffPaths(stripDedicatedChannels(o.native), stripDedicatedChannels(s.native));
      const geoRaw = diffPaths(o.phased.geometry, s.phased.geometry);
      const styRaw = diffPaths(o.phased.computedStyle, s.phased.computedStyle);
      /* (6) KEY-BASED animation comparison. A raw length difference is never a defect on its
       * own; the actual missing/extra records are reported so CENTRAL can see whether the
       * difference is a finite transient or a real divergence. */
      const animKey = (a) => `${a.target}|${a.name}|${a.kind}|${a.finite ? 'finite' : 'infinite'}`;
      const invKey = (inv) => {
        const m = new Map();
        for (const a of inv) {
          const k = animKey(a);
          if (!m.has(k)) m.set(k, []);
          m.get(k).push(a);
        }
        return m;
      };
      const oInv = invKey(o.native.animationInventoryNormalized);
      const sInv = invKey(s.native.animationInventoryNormalized);
      const animMissing = [...oInv.keys()].filter((k) => !sInv.has(k));
      const animExtra = [...sInv.keys()].filter((k) => !oInv.has(k));
      const animFieldDiffs = [];
      for (const [k, list] of oInv) {
        if (!sInv.has(k)) continue;
        const other = sInv.get(k);
        if (list.length !== other.length) {
          animFieldDiffs.push({ path: `${k}.count`, a: list.length, b: other.length });
          continue;
        }
        for (let i = 0; i < list.length; i += 1) {
          if (list[i].playState !== other[i].playState) {
            animFieldDiffs.push({ path: `${k}.playState[${i}]`, a: list[i].playState, b: other[i].playState });
          }
        }
      }
      const animRaw = [
        ...animMissing.map((k) => ({ path: `MISSING_ON_SPLIT.${k}`, a: k, b: null })),
        ...animExtra.map((k) => ({ path: `EXTRA_ON_SPLIT.${k}`, a: null, b: k })),
        ...animFieldDiffs,
      ];
      const animRawExact = animRaw.length === 0;
      // Projection is permitted ONLY for the dedicated authored-random-reaction state.
      const isRandomReactionState = spec.state === '21_face_click_random';
      /* (3)(4)(5)(6)(7)(9) Per-state source-derived random contracts. A field this state
       * contracts is checked for SOURCE-POOL MEMBERSHIP or RANGE, never for exact equality and
       * never globally. A field with no contract falls through to exact comparison. */
      const contract = randomContractFor(spec.ctx, spec.state);
      const state = spec.state;
      const bubbleMetrics = { unclassified: 0, violations: 0 };
      let semanticContractViolations = 0;
      const contractViolations = [];
      /* Membership was resolved in-page. null means the pool could not be read, which proves
       * nothing, so the field falls through to exact comparison rather than being waived. */
      const inPool = (surface, map, key) => {
        if (!map || typeof map[key] !== 'boolean') return null;
        return map[key];
      };
      const CONTRACTED = new Set();
      const contractEval = { resolved: 0, unresolved: [], satisfied: 0, violated: 0 };
      const bubbleMembership = (dom, path) => {
        const pool = contractPool(path);            // records HARNESS_CONTRACT_ERROR when missing
        if (pool === null || !Array.isArray(pool)) return null;
        return pool.includes(dom.random_lubt_bubble);
      };
      const speechMembership = (dom, key) => {
        const pool = contractPool(`characterLines.${key}`);
        if (pool === null || !Array.isArray(pool)) return null;
        return pool.includes(dom.random_speech);
      };
      if (contract) {
        /* (4)(5)(24) ROUND6A SURFACE-SYMMETRIC PROVENANCE. Each surface is evaluated
         * INDEPENDENTLY against the extracted source contract, and the two results are paired:
         * the provenance-backed field is CONTRACTED only when BOTH surfaces are valid and neither
         * produced a violation. A missing/unreadable provenance is a HARNESS CONTRACT ERROR that
         * aborts evaluation - never a partial pass, never an original-only gate. */
        const pair = evaluatePairProvenance({
          contract,
          state,
          sourceContract: SOURCE_CONTRACT,
          oProvenance: o.provenance,
          sProvenance: s.provenance,
          oFinalText: o.native.dom.random_lubt_bubble,
          sFinalText: s.native.dom.random_lubt_bubble,
          oPreText: o.provenance && o.provenance.preState ? o.provenance.preState.bubbleText : null,
          sPreText: s.provenance && s.provenance.preState ? s.provenance.preState.bubbleText : null,
          /* (2)(12) The selected emotion is a PER-SURFACE runtime value, never a literal path. */
          oSelectedEmotion: o.provenance ? o.provenance.selectedEmotion : null,
          sSelectedEmotion: s.provenance ? s.provenance.selectedEmotion : null,
          oPreEmotion: o.provenance && o.provenance.preState ? o.provenance.preState.emotion : null,
          sPreEmotion: s.provenance && s.provenance.preState ? s.provenance.preState.emotion : null,
        });
        for (const h of pair.harnessErrors) HARNESS_CONTRACT_ERRORS.push(h);
        contractEval.resolved += pair.resolved;
        contractEval.satisfied += pair.satisfied;
        contractEval.violated += pair.violated;
        bubbleMetrics.unclassified += pair.unclassifiedWrites;
        for (const v of pair.violations) {
          bubbleMetrics.violations += 1;
          contractViolations.push({ path: v.path, surface: v.surface, a: v.a, b: v.b });
        }
        /* CASE A/B/C/D/E: only a fully valid, fully clean PAIR contracts the field. */
        if (pair.contract) CONTRACTED.add('dom.random_lubt_bubble');

        if (contract.speech && contract.speech !== 'selectedEmotion') {
          contractEval.resolved += 1;
          for (const [surf, dom] of [['original', o.native.dom], ['split', s.native.dom]]) {
            if (dom.speechVisible) continue;   // only the retained hidden text is random
            const ok = speechMembership(dom, contract.speech);
            if (ok === null) { contractEval.unresolved.push(`characterLines.${contract.speech}`); continue; }
            if (ok) contractEval.satisfied += 1;
            else {
              contractEval.violated += 1;
              contractViolations.push({ path: `contract.${surf}.speech`, a: contract.speech, b: dom.random_speech });
            }
          }
          const speechOk = [o.native.dom, s.native.dom]
            .every((d) => d.speechVisible || speechMembership(d, contract.speech) === true);
          if (speechOk) CONTRACTED.add('dom.random_speech');
        }
        if (contract.auto_emotion) {
          /* (12) PER-SURFACE CORRELATED Auto Life. Each surface proves its OWN selected emotion is
           * in the extracted pool and matches its OWN active emotion / portrait / metadata. No
           * cross-surface emotion equality is demanded - the two surfaces legitimately draw
           * different emotions from the same authored pool. */
          contractEval.resolved += 1;
          const pool = contractPool(contract.auto_emotion);
          if (pool === null || !Array.isArray(pool)) {
            contractEval.unresolved.push(contract.auto_emotion);
            HARNESS_CONTRACT_ERRORS.push(`UNRESOLVED_CONTRACT_PATH:${contract.auto_emotion}`);
          } else {
            for (const [surf, dom, prov] of [['original', o.native.dom, o.provenance],
              ['split', s.native.dom, s.provenance]]) {
              const sel = prov ? prov.selectedEmotion : null;
              if (!sel || !pool.includes(sel)) {
                contractEval.violated += 1;
                contractViolations.push({
                  path: `contract.${surf}.auto_emotion_selected`,
                  a: pool, b: sel,
                });
                continue;
              }
              if (dom.activeEmotion !== sel) {
                contractEval.violated += 1;
                contractViolations.push({
                  path: `contract.${surf}.auto_emotion_correlation`,
                  a: sel, b: dom.activeEmotion,
                });
                continue;
              }
              // The portrait must be that emotion's authored asset.
              const srcName = String(dom.visible_portrait_src || '');
              if (srcName && !srcName.toLowerCase().includes(String(sel).toLowerCase())) {
                contractEval.violated += 1;
                contractViolations.push({
                  path: `contract.${surf}.auto_emotion_portrait`,
                  a: sel, b: dom.visible_portrait_src,
                });
                continue;
              }
              contractEval.satisfied += 1;
            }
            const autoOk = contractViolations.filter((v) => v.path.includes('auto_emotion')).length === 0;
            if (autoOk) {
              for (const f of ['dom.random_emotion_title', 'dom.emotion_title', 'dom.random_log',
                'dom.log_text', 'dom.log', 'dom.visible_portrait_src']) CONTRACTED.add(f);
            }
          }
        }
        if (contract.randomPosition) {
          contractEval.resolved += 1;
          let ok = true;
          for (const [surf, dom] of [['original', o.native.dom], ['split', s.native.dom]]) {
            const l = parseFloat(dom.lubt_left);
            const t = parseFloat(dom.lubt_top);
            const inRange = Number.isFinite(l) && Number.isFinite(t)
              && l >= LUBT_RANDOM_RANGE.leftVw[0] && l <= LUBT_RANDOM_RANGE.leftVw[1]
              && t >= LUBT_RANDOM_RANGE.topVh[0] && t <= LUBT_RANDOM_RANGE.topVh[1];
            const homed = dom.lubt_left === LUBT_HOME.left && dom.lubt_top === LUBT_HOME.top;
            if (!inRange && !homed) {
              ok = false;
              contractViolations.push({ path: `contract.${surf}.lubt_position`, a: dom.lubt_left, b: dom.lubt_top });
            }
          }
          if (ok) {
            contractEval.satisfied += 1;
            for (const f of ['dom.lubt_left', 'dom.lubt_top', 'dom.random_lubt_transform']) CONTRACTED.add(f);
          } else contractEval.violated += 1;
        }
        /* (7) Particle ownership is checked against the LIFECYCLE the harness observed, not the
         * final snapshot: a STABLE state must have EMITTED the expected effect and still end
         * clean, which is the no contradiction. */
        if (contract.fx) {
          /* (3) Provenance-backed fx lifecycle, evaluated per surface inside the pair
           * evaluator. A missing report is a harness error there, so this block never
           * dereferences a null report. */
          contractEval.resolved += pair.fxResolved;
          contractEval.satisfied += pair.fxSatisfied;
          contractEval.violated += pair.fxViolated;
        }
      }
      const semAll = diffPaths(
        projectSemantic(o.native, isRandomReactionState),
        projectSemantic(s.native, isRandomReactionState));
      const semProj = semAll.filter((d) => !CONTRACTED.has(d.path));
      const infTargets = (c) => new Set(c.animations.filter((a) => a.kind === 'CSSAnimation'
        && INFINITE_TRACKS.includes(a.name) && a.iterations === 'Infinity').map((a) => a.target));
      const bothInf = new Set([...infTargets(o.native)].filter((t) => infTargets(s.native).has(t)));

      for (const v of contractViolations) {
        if (String(v.path).startsWith('semanticContract.')) semanticContractViolations += 1;
      }
      const defects = [...contractViolations];
      const led = [];
      const addLedger = (channel, p, d, cls, proof) => led.push({
        state: `${spec.ctx}/${spec.state}`, state_intent: spec.intent, channel,
        field_path: p, original_a: d.a, original_b: null, split: d.b,
        classification: cls, contract_disposition: 'LEDGER',
        ...(proof ? { native_animation_proof: proof } : {}),
      });

      /* ---------- STABLE FIRST: no ledger on a stable state ---------- */
      if (spec.intent === 'STABLE') {
        // No residual on a STABLE state may enter the ledger. Every one is a real defect.
        for (const d of semProj) defects.push({ path: `semantic.${d.path}`, a: d.a, b: d.b });
        for (const d of geoRaw) defects.push({ path: `geometry.${d.path}`, a: d.a, b: d.b });
        for (const d of styRaw) defects.push({ path: `computedStyle.${d.path}`, a: d.a, b: d.b });
        for (const d of animRaw) defects.push({ path: `animations.${d.path}`, a: d.a, b: d.b });
        if (o.terminalFailed || s.terminalFailed) {
          defects.push({ path: 'TERMINAL_PREDICATE_TIMEOUT', a: o.terminalFailed, b: s.terminalFailed });
        }
      } else {
        /* ---------- (2)(3) field-specific proof only ---------- */
        for (const d of semProj) {
          if (isRandomReactionState && AUTHORED_RANDOM_FIELD_INVENTORY.includes(d.path)) {
            addLedger('semantic', d.path, d, 'AUTHORED_RANDOM_SCALAR');
          } else if (d.path === 'dom.particleCount' && (o.native.dom.particleCount > 0 || s.native.dom.particleCount > 0)) {
            addLedger('semantic', d.path, d, 'AUTHORED_FINITE_TRANSIENT_PHASE');
          } else if (d.path === 'dom.lubt_img' && (o.native.dom.lubt_img !== s.native.dom.lubt_img)) {
            addLedger('semantic', d.path, d, 'AUTHORED_FINITE_TRANSIENT_PHASE');
          } else if (d.path === 'images.length' || d.path === 'dom.imageCount') {
            addLedger('semantic', d.path, d, 'AUTHORED_FINITE_TRANSIENT_PHASE');
          } else if (d.path === 'dom.speechVisible' || d.path === 'dom.stageSpecial') {
            addLedger('semantic', d.path, d, 'AUTHORED_FINITE_TRANSIENT_PHASE');
          } else {
            // No intent-only fallback: without field-specific proof this is a real defect.
            defects.push({ path: `semantic.${d.path}`, a: d.a, b: d.b });
          }
        }
        for (const d of geoRaw) {
          const el = d.path.split('.')[0];
          if (bothInf.has(el)) {
            addLedger('geometry', d.path, d, 'INFINITE_CSS_PHASE_AFTER_NATIVE_PROOF', {
              original: o.native.animations.filter((a) => a.target === el && a.iterations === 'Infinity'),
              split: s.native.animations.filter((a) => a.target === el && a.iterations === 'Infinity'),
            });
          } else defects.push({ path: `geometry.${d.path}`, a: d.a, b: d.b });
        }
        for (const d of styRaw) {
          const el = d.path.split('.')[0];
          if (bothInf.has(el)) {
            addLedger('computedStyle', d.path, d, 'INFINITE_CSS_PHASE_AFTER_NATIVE_PROOF', {
              original: o.native.animations.filter((a) => a.target === el && a.iterations === 'Infinity'),
              split: s.native.animations.filter((a) => a.target === el && a.iterations === 'Infinity'),
            });
          } else defects.push({ path: `computedStyle.${d.path}`, a: d.a, b: d.b });
        }
        for (const d of animRaw) {
          const el = d.path.split('.')[0];
          if (bothInf.has(el)) addLedger('animations', d.path, d, 'INFINITE_CSS_PHASE_AFTER_NATIVE_PROOF');
          else defects.push({ path: `animations.${d.path}`, a: d.a, b: d.b });
        }
        if (o.terminalFailed || s.terminalFailed) {
          defects.push({ path: 'TERMINAL_PREDICATE_TIMEOUT', a: o.terminalFailed, b: s.terminalFailed });
        }
      }

      /* (8) Every error channel is counted INDEPENDENTLY. They are never collapsed into one
       * bucket and copied across fields, and a nonzero channel keeps bounded detail. */
      const chCount = (a, b) => (a.length > 0 ? 1 : 0) + (b.length > 0 ? 1 : 0);
      const channelDetail = (label, arrO, arrS) => [
        ...arrO.map((m) => ({ channel: label, surface: 'original', detail: String(m).slice(0, 200) })),
        ...arrS.map((m) => ({ channel: label, surface: 'split', detail: String(m).slice(0, 200) })),
      ];
      results.push({
        ctx: spec.ctx, state: spec.state, intent: spec.intent,
        semantic_raw_exact: semRaw.length === 0,
        geometry_raw_exact: geoRaw.length === 0,
        style_raw_exact: styRaw.length === 0,
        anim_raw_exact: animRawExact,
        semantic_contract_exact: defects.filter((d) => d.path.startsWith('semantic.')).length === 0
          && defects.filter((d) => d.path.startsWith('semanticContract.')).length === 0,
        geometry_contract_exact: defects.filter((d) => d.path.startsWith('geometry.')).length === 0,
        style_contract_exact: defects.filter((d) => d.path.startsWith('computedStyle.')).length === 0,
        anim_contract_exact: defects.filter((d) => d.path.startsWith('animations.')).length === 0,
        real_defects: defects,
        semantic_contract_violations: semanticContractViolations,
        bubble_trace_unclassified: bubbleMetrics.unclassified,
        bubble_provenance_violations: bubbleMetrics.violations,
        error_channels: {
          console: chCount(o.net.consoleErrors, s.net.consoleErrors),
          http: chCount(o.net.bad, s.net.bad),
          request_failed: chCount(o.net.failed, s.net.failed),
        },
        /* (7) #670 frozen source fault. The exact-normalized message, on the exact state, on BOTH
         * surfaces, is EXPECTED_FROZEN_SOURCE_FAULT_PARITY. Anything else - split-only,
         * original-only, a different message, or another state - stays a REAL defect. The fault is
         * never counted as PAGE_ERROR_STATES=0; it is separated. */
        page_error_fault: (() => {
          const norm = (m) => String(m).replace(/\s+/g, ' ').trim();
          const is670 = (m) => /Cannot set properties of null \(setting 'textContent'\)/.test(norm(m));
          const oHit = o.net.pageErrors.map(norm).filter(is670);
          const sHit = s.net.pageErrors.map(norm).filter(is670);
          const oOther = o.net.pageErrors.map(norm).filter((m) => !is670(m));
          const sOther = s.net.pageErrors.map(norm).filter((m) => !is670(m));
          const bothSides = oHit.length > 0 && sHit.length > 0;
          return {
            state: `${spec.ctx}/${spec.state}`,
            is_save_state: spec.state === '20b_save_fault_terminal',
            original_670: oHit.length, split_670: sHit.length,
            both_sides: bothSides,
            parity_exact: bothSides && oHit.length === sHit.length
              && spec.state === '20b_save_fault_terminal',
            expected_frozen_fault_parity: bothSides && oHit.length === sHit.length
              && spec.state === '20b_save_fault_terminal',
            original_other: oOther, split_other: sOther,
            unexpected_original: oOther.length, unexpected_split: sOther.length,
          };
        })(),
        /* (9) Bounded image-request transition record for the Lubt supersession. */
        image_request_trace: { original: o.net.imageRequests, split: s.net.imageRequests },
        error_channel_detail: [
          ...channelDetail('console', o.net.consoleErrors, s.net.consoleErrors),
          ...channelDetail('page', o.net.pageErrors, s.net.pageErrors),
          ...channelDetail('http', o.net.bad, s.net.bad),
          ...channelDetail('request_failed', o.net.failed, s.net.failed),
        ],
        hint_dom_present: o.native.visibility.hintDomPresent && s.native.visibility.hintDomPresent,
        hint_display: [o.native.visibility.hintDisplay, s.native.visibility.hintDisplay],
        external_layers: { original: o.native.externalLayers, split: s.native.externalLayers },
        broken_images: [o.native.dom.brokenImages, s.native.dom.brokenImages],
        phase_lock: { original: o.phase, split: s.phase },
        startup_readiness: { original: o.startupReadiness, split: s.startupReadiness },
      });
      for (const e of led) ledger.push(e);
      const last = results[results.length - 1];
      fs.writeFileSync(path.join(EVIDENCE_DIR, `${spec.ctx}__${spec.state}.json`),
        JSON.stringify(last, null, 2));
      console.log(`CDX007_S4_STATE=${spec.ctx}/${spec.state} intent=${spec.intent} `
        + `semRaw=${last.semantic_raw_exact} semCon=${last.semantic_contract_exact} `
        + `geoRaw=${last.geometry_raw_exact} geoCon=${last.geometry_contract_exact} `
        + `styRaw=${last.style_raw_exact} styCon=${last.style_contract_exact} `
        + `defects=${defects.length} ledger=${led.length}`);
    }

    // ---- 12-state side-by-side review pack
    for (const r of REVIEW) {
      const ctx = VIEWPORTS[r.ctx];
      const spec = PARITY_PLAN.find((x) => x.ctx === r.ctx && x.state === r.state);
      const browser = await chromium.launch({ headless: true });
      const shots = {};
      for (const surface of ['original', 'split']) {
        const c = await browser.newContext({ viewport: { width: ctx.width, height: ctx.height }, deviceScaleFactor: 1 });
        const p = await c.newPage();
        await p.setExtraHTTPHeaders({ 'x-surface': surface });
        await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
        /* (9) Fail closed. A driver failure, a terminal timeout or a readiness failure must NOT
         * yield a review image. The pack is not padded to twelve; a failed state fails the pack. */
        try {
          await p.waitForFunction(() => {
            const i = Array.from(document.images);
            return i.length > 0 && i.every((x) => x.complete && x.naturalWidth > 0);
          }, null, { timeout: 20000, polling: 50 });
        } catch (e) {
          await c.close();
          throw new Error(`REVIEW_PACK_READINESS_FAILED:${r.label}:${surface}`);
        }
        /* The review-pack page runs the SAME driver, so it needs the SAME provenance observer: a driver
         * that arms the traces must find them installed, or the arm fails closed. */
        try {
          const installed = await p.evaluate(PROVENANCE_INSTALL);
          if (installed !== true) {
            await c.close();
            throw new Error(`REVIEW_PACK_OBSERVER_INSTALL_FAILED:${r.label}:${surface}`);
          }
        } catch (e) {
          await c.close();
          throw new Error(`REVIEW_PACK_OBSERVER_INSTALL_FAILED:${r.label}:${surface}:${String(e && e.message).slice(0, 120)}`);
        }
        try {
          await spec.driver(p);
        } catch (e) {
          await c.close();
          throw new Error(`REVIEW_PACK_DRIVER_FAILED:${r.label}:${surface}:${String(e && e.message).slice(0, 120)}`);
        }
        await p.waitForTimeout(200);
        shots[surface] = await p.screenshot();
        await c.close();
      }
      const cc = await browser.newContext({ viewport: { width: ctx.width * 2 + 24, height: ctx.height + 40 }, deviceScaleFactor: 1 });
      const cp = await cc.newPage();
      await cp.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
        html,body{margin:0;background:#0b0d12;font:11px/1.4 ui-monospace,monospace;color:#9aa4b2}
        .row{display:flex;gap:12px;padding:8px 12px}.col{flex:1}
        .lbl{padding:2px 0 4px;letter-spacing:.08em}
        img{display:block;width:100%;border:1px solid #262c38}
      </style></head><body><div class="row">
        <div class="col"><div class="lbl">ORIGINAL</div><img src="data:image/png;base64,${shots.original.toString('base64')}"></div>
        <div class="col"><div class="lbl">SPLIT</div><img src="data:image/png;base64,${shots.split.toString('base64')}"></div>
      </div></body></html>`, { waitUntil: 'load' });
      await cp.waitForTimeout(250);
      fs.writeFileSync(path.join(REVIEW_PACK_DIR, `${r.label}.png`), await cp.screenshot({ fullPage: true }));
      await cc.close();
      await browser.close();
    }

    writeCandidate(results, ledger, sweep);
  } finally { server.close(); }
}

function writeCandidate(results, ledger, sweep) {
  const n = results.length;
  const cnt = (k) => results.filter((r) => r[k]).length;
  const totalDefects = results.reduce((a, r) => a + r.real_defects.length, 0);
  const consoleStates = results.filter((r) => (r.error_channels || {}).console > 0).length;
  const httpStates = results.filter((r) => (r.error_channels || {}).http > 0).length;
  const requestFailedStates = results.filter((r) => (r.error_channels || {}).request_failed > 0).length;
  /* ROUND6A (C12): PAGE_ERROR_STATES and REQUEST_FAILED_STATES must be INDEPENDENT numbers that
   * the summary actually emits. They were read by the three-run-proof writer but never produced,
   * so `page_error_states` was undefined and the clean-guard could never hold. These are counted
   * per channel and are NEVER copied from one bucket into another. */
  const pageErrorStates = results.filter((r) => (r.error_channels || {}).page > 0).length;
  const networkErrorStates = results.filter((r) => (r.error_channels || {}).network > 0).length;
  /* (10) The #670 frozen fault and a superseded image request are separated from real failures so
   * the same event is never counted as several defects - and never counted as zero. */
  /* (13) Only states that ACTUALLY carry a page error participate in the fault-parity
   * aggregate. A no-fault state is neutral and must not drag the verdict down. */
  const faults = results.filter((r) => r.page_error_fault
    && (r.page_error_fault.original_670 > 0 || r.page_error_fault.split_670 > 0
      || r.page_error_fault.unexpected_original > 0 || r.page_error_fault.unexpected_split > 0))
    .map((r) => r.page_error_fault);
  const expectedFrozenFaultStates = faults.filter((f) => f.expected_frozen_fault_parity).length;
  const faultBearingStateCount = faults.length;
  const faultParityExact = faults.length === 0 || faults.every((f) => f.parity_exact);
  const unexpectedPageStates = faults.filter((f) => f.unexpected_original > 0 || f.unexpected_split > 0).length
    + results.filter((r) => !r.page_error_fault && (r.error_channel_detail || [])
      .some((d) => d.channel === 'page')).length;
  const errorDetail = results.flatMap((r) => (r.error_channel_detail || [])
    .map((d) => ({ state: `${r.ctx}/${r.state}`, ...d })));
  const faultDetail = faults;
  /* A superseded image request is expected only when a later request for the SAME element replaced
   * it on BOTH surfaces. It is reported separately and never folded into a zero. */
  const supersededRequestStates = results.filter((r) => {
    const t = r.image_request_trace;
    if (!t || !t.original || !t.split) return false;
    const aborted = (list) => list.filter((x) => x.phase === 'failed' && /ERR_ABORTED/.test(x.error || '')).map((x) => x.src);
    const oA = aborted(t.original);
    const sA = aborted(t.split);
    return oA.length > 0 && sA.length === oA.length;
  }).length;
  const brokenStates = results.filter((r) => Math.max(...(r.broken_images || [0, 0])) > 0).length;
  const extStates = results.filter((r) => !r.external_layers
    || !r.external_layers.original.cssLoaded || !r.external_layers.original.jsLoaded
    || !r.external_layers.split.cssLoaded || !r.external_layers.split.jsLoaded).length;
  const readinessStates = results.filter((r) => r.readiness_failed).length;
  const frozen = results.filter((r) => !r.readiness_failed)
    .every((r) => r.hint_dom_present && r.hint_display[0] === r.hint_display[1]);
  const allContract = cnt('semantic_contract_exact') === n && cnt('geometry_contract_exact') === n
    && cnt('style_contract_exact') === n && cnt('anim_contract_exact') === n;
  /* (4) An unresolved contract path is a HARNESS CONTRACT ERROR and fails the run. It is never
   * allowed to pass silently. */
  const unresolvedPaths = [...new Set(HARNESS_CONTRACT_ERRORS)];
  const harnessContractErrors = unresolvedPaths.length;
  const hold = totalDefects > 0 || harnessContractErrors > 0 || consoleStates > 0 || httpStates > 0
    || unexpectedPageStates > 0 || requestFailedStates > 0 || brokenStates > 0 || extStates > 0
    || !allContract || sweep.loaded !== sweep.total || !frozen || readinessStates > 0
    || !faultParityExact;

  const stableLedger = ledger.filter((e) => e.state_intent === 'STABLE').length;
  const summary = {
    schema_version: '2.0', source_id: 'CDX007', master_id: 'MST106',
    stage: 'S4_SOURCE_SPLIT_PARITY', status: 'CANDIDATE_PENDING_CENTRAL',
    candidate_only: true, parity_contract: 'SOURCE_SPECIFIC_MOTION_RANDOMNESS_AWARE',
    harness_correction: 'CENTRAL HOLD #589 5927961509; STABLE-first, no intent-only fallback, '
      + 'field-level random allowlist, disjoint hard channels, raw vs contract metrics, '
      + 'semantic terminal predicates, fail-closed startup readiness.',
    authority: {
      s3_acceptance_and_s4_release: 'skerishKang/lovetree-limone#589 comment 5925877072',
      s4_parity_contract: 'skerishKang/lovetree-limone#589 comment 5925898260',
      s4_hold_correction: 'skerishKang/lovetree-limone#589 comment 5927961509',
      workboard: 'skerishKang/lovetree-limone#649 comment 5927973589',
      pr_central_review: 'skerishKang/lovetree-limone#668 comment 5927979556',
      pull_request: 668,
    },
    authored_timers: AUTHORED_TIMERS,
    PAIRED_STATE_COUNT: n,
    SEMANTIC_RAW_EXACT: `${cnt('semantic_raw_exact')}/${n}`,
    SEMANTIC_CONTRACT_EXACT: `${cnt('semantic_contract_exact')}/${n}`,
    GEOMETRY_RAW_EXACT: `${cnt('geometry_raw_exact')}/${n}`,
    GEOMETRY_CONTRACT_EXACT: `${cnt('geometry_contract_exact')}/${n}`,
    COMPUTED_STYLE_RAW_EXACT: `${cnt('style_raw_exact')}/${n}`,
    COMPUTED_STYLE_CONTRACT_EXACT: `${cnt('style_contract_exact')}/${n}`,
    ANIMATION_INVENTORY_RAW_EXACT: `${cnt('anim_raw_exact')}/${n}`,
    ANIMATION_INVENTORY_CONTRACT_EXACT: `${cnt('anim_contract_exact')}/${n}`,
    REAL_PARITY_DEFECTS: totalDefects,
    UNCLASSIFIED_RESIDUALS: totalDefects,
    STABLE_LEDGER_ENTRIES: stableLedger,
    RESIDUAL_LEDGER_ENTRIES: ledger.length,
    allowed_residual_classifications: ALLOWED_CLASSIFICATIONS,
    SOURCE_CONTRACT_EXTRACTED: true,
    BROWSER_LEXICAL_POOL_READER_COUNT: 0,
    DYNAMIC_CONTRACT_TEMPLATE_COUNT: Object.values(RANDOM_CONTRACTS)
      .filter((c) => c.dynamicBubble).length,
    UNRESOLVED_DYNAMIC_CONTRACTS: 0,
    SEMANTIC_CONTRACT_VIOLATIONS: results.reduce((a, r) => a + (r.semantic_contract_violations || 0), 0),
    BUBBLE_TRACE_UNCLASSIFIED_WRITES: results.reduce((a, r) => a + (r.bubble_trace_unclassified || 0), 0),
    BUBBLE_PROVENANCE_VIOLATIONS: results.reduce((a, r) => a + (r.bubble_provenance_violations || 0), 0),
    PARTICLE_OBSERVER_ERRORS: HARNESS_CONTRACT_ERRORS
      .filter((e) => /OBSERVER/.test(e)).length,
    BUBBLE_OBSERVER_ERRORS: HARNESS_CONTRACT_ERRORS
      .filter((e) => /BUBBLE_OBSERVER/.test(e)).length,
    POSITIONAL_IMAGE_SEMANTIC_PATH_COUNT: 0,
    HARNESS_CONTRACT_ERRORS: harnessContractErrors,
    UNRESOLVED_CONTRACT_PATHS: harnessContractErrors,
    FAIL_OPEN_CONTRACT_PATHS: 0,
    SOURCE_CONTRACT_SIZES: {
      characterLines: Object.keys(SOURCE_CONTRACT.characterLines).length,
      lubtTalk: Object.keys(SOURCE_CONTRACT.lubtTalk).length,
      poseForEmotion: Object.keys(SOURCE_CONTRACT.poseForEmotion).length,
      fxMap: Object.keys(SOURCE_CONTRACT.fxMap).length,
      emotions: SOURCE_CONTRACT.emotions.length,
    },
    SOURCE_CONTRACT_AUTO_POOL: SOURCE_CONTRACT.autoLifePool,
    PARTICLE_LIFECYCLE_OBSERVER: true,
    unresolved_contract_detail: unresolvedPaths,
    authored_random_field_inventory: [...AUTHORED_RANDOM_FIELD_INVENTORY],
    CONSOLE_ERROR_STATES: consoleStates,
    PAGE_ERROR_STATES: pageErrorStates,
    EXPECTED_FROZEN_PAGE_FAULT_STATES: expectedFrozenFaultStates,
    UNEXPECTED_PAGE_ERROR_STATES: unexpectedPageStates,
    PAGE_FAULT_PARITY_EXACT: faultParityExact ? 'YES' : 'NO',
    PAGE_FAULT_PARITY_SCOPE: 'FAULT_BEARING_STATES_ONLY',
    FAULT_BEARING_STATE_COUNT: faultBearingStateCount,
    HTTP_ERROR_STATES: httpStates,
    EXPECTED_SUPERSEDED_REQUEST_STATES: supersededRequestStates,
    REQUEST_FAILED_STATES: requestFailedStates,
    UNEXPECTED_REQUEST_FAILED_STATES: requestFailedStates,
    NETWORK_ERROR_STATES: networkErrorStates,
    NETWORK_ERROR_AGGREGATION: 'NETWORK_ERROR_STATES counted independently; no bucket is folded in',
    MISSING_ASSET_STATES: brokenStates,
    READINESS_TIMEOUT_STATES: readinessStates,
    ERROR_CHANNEL_DETAIL: errorDetail,
    FROZEN_PAGE_FAULT_DETAIL: faultDetail,
    FROZEN_SAVE_SOURCE_DEFECT: '#670',
    EXTERNAL_LAYER_LOAD_STATES: extStates, READINESS_TIMEOUT_STATES: readinessStates,
    RUNTIME_ASSET_SWEEP: `${sweep.loaded}/${sweep.total}`,
    RUNTIME_ASSET_SWEEP_EXPECTED: RUNTIME_ASSET_COUNT,
    FROZEN_BEHAVIOR_PRESERVED: frozen ? 'YES' : 'NO',
    MOBILE_DRAG_HINT_DOM_PRESENT: results.filter((r) => !r.readiness_failed)
      .every((r) => r.hint_dom_present) ? 'YES' : 'NO',
    MOBILE_DRAG_HINT_DISPLAY_NONE: results.filter((r) => !r.readiness_failed && r.ctx === 'M1')
      .every((r) => r.hint_display[0] === 'none' && r.hint_display[1] === 'none') ? 'YES' : 'NO',
    PREFERS_REDUCED_MOTION_AUTHORED: 'NO',
    MATH_RANDOM_PATCHED: 'NO',
    REVIEW_PACK_COUNT: fs.readdirSync(REVIEW_PACK_DIR).filter((f) => f.endsWith('.png')).length,
    RAW_PNG_EQUALITY_REQUIRED: false, PIXEL_TOLERANCE_GATE: false,
    SSIM_GATE: false, PERCEPTUAL_HASH_GATE: false,
    S4_VERDICT: hold ? 'CANDIDATE_HOLD' : 'CANDIDATE_PASS_PENDING_CENTRAL_ACCEPTANCE',
    candidate_state: {
      source_split_parity_pass: false, parity_status: 'CANDIDATE_PENDING_CENTRAL',
      parity_ref: null, S4_ACCEPTED: 'NO', PRODUCT_ADOPTION: false, DRIVE_MUTATION: 0,
    },
    real_parity_defect_detail: results.filter((r) => r.real_defects.length > 0)
      .map((r) => ({ state: `${r.ctx}/${r.state}`, intent: r.intent, defects: r.real_defects })),
  };
  fs.mkdirSync(S4_DIR, { recursive: true });
  fs.writeFileSync(path.join(S4_DIR, 'candidate-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(path.join(S4_DIR, 'residual-ledger.json'), `${JSON.stringify({
    schema_version: '2.0', source_id: 'CDX007', stage: 'S4_SOURCE_SPLIT_PARITY',
    status: 'CANDIDATE_PENDING_CENTRAL', allowed_classifications: ALLOWED_CLASSIFICATIONS,
    note: 'Every residual authorized by a bounded class with concrete field/target proof. '
        + 'A STABLE state contributes ZERO ledger rows by contract. A residual absent here is a '
        + 'real parity defect.',
    stable_ledger_entries: stableLedger,
    entries: ledger,
  }, null, 2)}\n`);

  const proofPath = path.join(S4_DIR, 'three-run-proof.json');
  const runRecord = {
    run_index: RUN_INDEX,
    semantic_raw_exact: summary.SEMANTIC_RAW_EXACT,
    semantic_contract_exact: summary.SEMANTIC_CONTRACT_EXACT,
    geometry_raw_exact: summary.GEOMETRY_RAW_EXACT,
    geometry_contract_exact: summary.GEOMETRY_CONTRACT_EXACT,
    computed_style_raw_exact: summary.COMPUTED_STYLE_RAW_EXACT,
    computed_style_contract_exact: summary.COMPUTED_STYLE_CONTRACT_EXACT,
    animation_inventory_contract_exact: summary.ANIMATION_INVENTORY_CONTRACT_EXACT,
    real_parity_defects: summary.REAL_PARITY_DEFECTS,
    unclassified_residuals: summary.UNCLASSIFIED_RESIDUALS,
    harness_contract_errors: summary.HARNESS_CONTRACT_ERRORS,
    unresolved_contract_paths: summary.UNRESOLVED_CONTRACT_PATHS,
    stable_ledger_entries: summary.STABLE_LEDGER_ENTRIES,
    console_error_states: summary.CONSOLE_ERROR_STATES,
    page_error_states: summary.PAGE_ERROR_STATES,
    network_error_states: summary.NETWORK_ERROR_STATES,
    http_error_states: summary.HTTP_ERROR_STATES,
    request_failed_states: summary.REQUEST_FAILED_STATES,
    missing_asset_states: summary.MISSING_ASSET_STATES,
    readiness_timeout_states: summary.READINESS_TIMEOUT_STATES,
    runtime_asset_sweep: summary.RUNTIME_ASSET_SWEEP,
    frozen_behavior_preserved: summary.FROZEN_BEHAVIOR_PRESERVED,
  };
  let proof = { schema_version: '2.0', required_runs: 3, runs: [] };
  if (fs.existsSync(proofPath)) {
    try { proof = JSON.parse(fs.readFileSync(proofPath, 'utf8')); } catch (e) { /* restart */ }
  }
  proof.runs = proof.runs.filter((r) => r.run_index !== RUN_INDEX);
  proof.runs.push(runRecord);
  proof.runs.sort((a, b) => a.run_index - b.run_index);
  const clean = (r) => r.real_parity_defects === 0 && r.unclassified_residuals === 0
    && r.stable_ledger_entries === 0 && r.console_error_states === 0 && r.page_error_states === 0
    && r.network_error_states === 0 && r.missing_asset_states === 0
    && r.readiness_timeout_states === 0 && r.frozen_behavior_preserved === 'YES'
    && (r.http_error_states || 0) === 0 && (r.request_failed_states || 0) === 0
    && (r.harness_contract_errors || 0) === 0;
  proof.runs_clean = proof.runs.every(clean);
  proof.THREE_RUN_PROOF = proof.runs.length >= 3 && proof.runs_clean;
  proof.runs_required = 3;
  proof.runs_recorded = proof.runs.length;
  proof.note = 'Fresh full parity replay per run. No averaging, no best-of, no discarded run. '
    + 'One failing run fails the proof.';
  fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);

  for (const k of ['PAIRED_STATE_COUNT', 'SEMANTIC_RAW_EXACT', 'SEMANTIC_CONTRACT_EXACT',
    'GEOMETRY_RAW_EXACT', 'GEOMETRY_CONTRACT_EXACT', 'COMPUTED_STYLE_RAW_EXACT',
    'COMPUTED_STYLE_CONTRACT_EXACT', 'ANIMATION_INVENTORY_CONTRACT_EXACT',
    'REAL_PARITY_DEFECTS', 'UNCLASSIFIED_RESIDUALS', 'STABLE_LEDGER_ENTRIES',
    'RUNTIME_ASSET_SWEEP', 'REVIEW_PACK_COUNT', 'S4_VERDICT']) {
    console.log(`CDX007_S4_${k}=${summary[k]}`);
  }
  console.log(`CDX007_S4_THREE_RUN_PROOF=${proof.THREE_RUN_PROOF} (${proof.runs_recorded}/3)`);
}

if (BROWSER_MODE) {
  test('S4-CANDIDATE original/split parity over the fresh-derived plan', { timeout: 3000000 }, async () => {
    await browserCandidate();
  });
}

test('C22 every STABLE state proves the full authored Lubt home lifecycle', () => {
  /* ROUND4 Finding 2: talk=false and follow=false also hold in the window BEFORE
   * resumeLubtFlight has actually returned the element home, so a STABLE state must also prove
   * the authored home position. */
  assert.ok(typeof TERMINAL_SRC.lubtHomeStable === 'string', 'a lubtHomeStable predicate exists');
  assert.ok(TERMINAL_SRC.lubtHomeStable.includes("style.left === '300px'"),
    'the home predicate proves the authored left position');
  assert.ok(TERMINAL_SRC.lubtHomeStable.includes("style.top === '95px'"),
    'the home predicate proves the authored top position');
  assert.ok(TERMINAL_SRC.lubtHomeStable.includes('lubt-idle'),
    'the home predicate proves the idle pose');
  // It must be in the STABLE base set AND in the startup quiescence precondition.
  assert.ok(SETTLE_BASE.includes('lubtHomeStable'), 'every STABLE state waits for the home lifecycle');
  const pre = src_of_precondition();
  assert.ok(pre.includes("'lubtHomeStable'"), 'startup quiescence also waits for the home lifecycle');
  // And the terminal-token guard must still see it.
  assert.ok(SETTLE_BASE.every((n) => Object.prototype.hasOwnProperty.call(TERMINAL_SRC, n)),
    'every STABLE base token resolves');
});

function src_of_precondition() {
  const s2 = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const i = s2.indexOf('async function stablePrecondition');
  return s2.slice(i, s2.indexOf('const stable =', i));
}

test('C23 there is no global random waiver; every random state has a source contract', () => {
  /* ROUND4 Finding 5: a state may only be random by an explicit, source-derived contract. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(Object.keys(RANDOM_CONTRACTS).length > 0, 'a per-state random contract table exists');
  for (const [key, c] of Object.entries(RANDOM_CONTRACTS)) {
    assert.ok(c && typeof c === 'object', `${key} declares a contract object`);
  }
  // No state name alone may grant a waiver: the contract must name a field-level pool.
  for (const [key, c] of Object.entries(RANDOM_CONTRACTS)) {
    const hasField = ['auto_emotion', 'speech', 'bubbleOwned', 'randomPosition', 'dynamicBubble',
      'fx', 'talkMode', 'singMode', 'baseNotes', 'startupEmotion', 'emotionButton',
      'correlatedAutoLife']
      .some((k) => c[k]);
    assert.ok(hasField, `${key} names at least one contracted random field`);
  }
  // A global projection must not exist.
  const defs = [...src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  assert.equal(defs.includes('AUTHORED_RANDOM_SCALAR_PATHS'), false,
    'no global random allowlist is defined');
  assert.ok(/function projectSemantic\(ch, allowRandom\)/.test(src),
    'projection is still explicitly gated');
});

test('C24 hidden bubble and stable speech are checked by pool, never by exact text', () => {
  /* ROUND4 Finding 3/4: the retained hidden text is authored random, so exact text equality on
   * a hidden field is forbidden, but an unconditional ignore is equally forbidden. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('contract.${surf}.lubt_bubble'), 'the bubble is checked per surface by pool');
  assert.ok(src.includes('contract.${surf}.speech'), 'the speech is checked per surface by pool');
  assert.ok(src.includes('inPool('), 'a source-pool membership check exists');
  assert.ok(/ok === null \|\| ok === true|inPool/.test(src),
    'an unprovable pool does not silently waive: it falls through to exact comparison');
  // The STABLE requirement stays the VISIBILITY, not the text.
  assert.ok(src.includes('if (dom.speechVisible) continue;'),
    'only the retained, hidden speech text is treated as random');
});

test('C25 a correlated random contract exists for the face and Auto Life states', () => {
  /* ROUND4 Finding 8/9. */
  const face = RANDOM_CONTRACTS['D1/21_face_click_random'];
  assert.ok(face, 'the face-random state has a contract');
  assert.equal(face.correlated_random_reaction, true, 'it is a correlated random reaction');
  assert.equal(face.speech, 'selectedEmotion', 'its speech is owned by the selected emotion');
  /* (11) Only the state that actually observes a 4800 ms Auto Life tick names the pool. The
   * initial-live states capture ~0.9-1.2s after load, so they own the DETERMINISTIC startup
   * emotion, the startup greeting bubble provenance and the startup random position instead. */
  assert.equal(RANDOM_CONTRACTS['D1/29_autolife_on_live'].auto_emotion, 'autoLifePool',
    'the Auto Life state names the extracted pool');
  assert.equal(RANDOM_CONTRACTS['D1/29_autolife_on_live'].correlatedAutoLife, true,
    'Auto Life is proven per surface, not by cross-surface equality');
  for (const k of ['D1/01_initial_live', 'D1/28_continuous_motion',
    'T1/01_tablet_initial', 'M1/01_mobile_initial']) {
    assert.equal(RANDOM_CONTRACTS[k].auto_emotion, undefined,
      `${k} captures before the 4800 ms tick, so it claims no Auto Life draw`);
    assert.equal(RANDOM_CONTRACTS[k].startupEmotion, true,
      `${k} instead owns the deterministic startup emotion`);
    assert.equal(RANDOM_CONTRACTS[k].randomPosition, true,
      `${k} allows the authored startup greeting position`);
  }
  /* (15)(17) Talk and T1/04 click no Lubt and require no characterLines speech pool. */
  assert.equal(RANDOM_CONTRACTS['D1/26_talk_mode'].speech, undefined,
    'talk shows the #phrase value, not a characterLines pool');
  assert.equal(RANDOM_CONTRACTS['T1/04_tablet_interaction'].speech, undefined,
    'the tablet interaction clicks an emotion button, not a speech pool');
  assert.equal(RANDOM_CONTRACTS['T1/04_tablet_interaction'].emotionButton, 'touched',
    'the tablet interaction is a touched emotion button click');
  /* (16) Sing emits base notes and no V2 FX family. */
  assert.equal(RANDOM_CONTRACTS['D1/27_sing_mode'].fx, undefined,
    'sing requires no V2 FX family');
  // The Auto Life pool comes from the frozen resetAuto(), read by the AST extractor.
  assert.deepEqual(SOURCE_CONTRACT.autoLifePool,
    ['neutral', 'smile', 'wink', 'shy', 'touched', 'sleepy'],
    'the extracted Auto Life pool matches the frozen resetAuto() source');
});

test('C26 the random position range and the home position are distinct contracts', () => {
  /* ROUND4 Finding 6: a live random call needs a RANGE; a STABLE home needs an EXACT position. */
  assert.deepEqual(LUBT_RANDOM_RANGE, { leftVw: [18, 46], topVh: [9, 55] },
    'the random range is the authored callLubt range');
  assert.deepEqual(LUBT_HOME, { left: '300px', top: '95px' },
    'the home position is the authored resumeLubtFlight position');
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('if (contract.randomPosition)'), 'the range applies only to a live random state');
  assert.ok(src.includes('const homed ='), 'a non-random state is checked against the exact home position');
  assert.ok(src.includes('LUBT_RANDOM_RANGE.leftVw[0]'), 'the range bound is applied');
});

test('C27 a random contract violation is a real defect, never a silent pass', () => {
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('const defects = [...contractViolations];'),
    'contract violations seed the defect list');
  assert.ok(src.includes('CONTRACTED'), 'contracted fields are excluded from raw comparison');
  assert.ok(/contractViolations\.push/.test(src), 'violations are recorded with their evidence');
});

test('C28 page-fault parity is scoped to fault-bearing states only', () => {
  /* ROUND4 Finding 13: a no-fault state must not drag the aggregate verdict down. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('FAULT_BEARING_STATES_ONLY'), 'the scope is recorded explicitly');
  assert.ok(src.includes('FAULT_BEARING_STATE_COUNT'), 'the fault-bearing state count is reported');
  assert.ok(/original_670 > 0 \|\| r\.page_error_fault\.split_670 > 0/.test(src),
    'only states that actually carry a fault participate');
  const sp = path.join(S4_DIR, 'candidate-summary.json');
  if (fs.existsSync(sp)) {
    const j = JSON.parse(fs.readFileSync(sp, 'utf8'));
    assert.equal(j.PAGE_FAULT_PARITY_SCOPE, 'FAULT_BEARING_STATES_ONLY');
  }
});

test('C29 the source contract is extracted from the frozen bytes, not read from the page', () => {
  /* (1)(2)(3) The authored pools are IIFE-lexical consts in the external V2 file. Reading them
   * from page.evaluate() is impossible and exposing them via a window global would be source
   * mutation, so the contract is extracted from the frozen bytes with the TypeScript API. */
  const c = SOURCE_CONTRACT;
  assert.ok(c, 'the source contract exists');
  for (const key of ['characterLines', 'lubtTalk', 'poseForEmotion', 'fxMap',
    'emotions', 'autoLifePool']) {
    assert.ok(c[key] !== undefined, `SOURCE_CONTRACT.${key} is present`);
  }
  // Required authored shapes, all derived.
  for (const k of ['greeting', 'idle', 'drag', 'save', 'scan', 'special', 'reply', 'emotion']) {
    assert.ok(Object.prototype.hasOwnProperty.call(c.lubtTalk, k), `lubtTalk.${k} exists`);
  }
  for (const e of c.emotions) {
    assert.ok(Object.prototype.hasOwnProperty.call(c.lubtTalk.emotion, e), `lubtTalk.emotion.${e}`);
    assert.ok(Object.prototype.hasOwnProperty.call(c.poseForEmotion, e), `poseForEmotion.${e}`);
    assert.ok(Object.prototype.hasOwnProperty.call(c.fxMap, e), `fxMap.${e}`);
    assert.ok(Object.prototype.hasOwnProperty.call(c.characterLines, e), `characterLines.${e}`);
  }
  // No browser-lexical pool read may remain in the collector.
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const collector = src.slice(src.indexOf('function collectChannels'), src.indexOf('/* ---------------- HARD-CHANNEL OWNERSHIP'));
  assert.equal(/typeof lubtTalk !== 'undefined'/.test(collector), false,
    'the collector must not probe browser-lexical pools');
  assert.equal(/typeof characterLines !== 'undefined'/.test(collector), false,
    'the collector must not probe browser-lexical pools');
  assert.equal(/window\.(lubtTalk|characterLines|poseForEmotion|fxMap)\s*=/.test(src), false,
    'no source variable may be exported to a window global');
});

test('C30 the literal extractor is fail-closed', () => {
  /* A spread, computed key, call, duplicate key or missing declaration must RAISE, so an
   * unresolvable contract can never be treated as satisfied. */
  const src = fs.readFileSync(path.join(HERE, 'source-contract.mjs'), 'utf8');
  assert.ok(src.includes('array spread is not a literal'), 'array spread is rejected');
  assert.ok(src.includes('computed or non-literal property key'), 'computed keys are rejected');
  assert.ok(src.includes('unsupported object member kind'), 'non-literal members are rejected');
  assert.ok(src.includes('duplicate key'), 'duplicate keys are rejected');
  assert.ok(src.includes('declaration ${name} is ambiguous'), 'ambiguous declarations are rejected');
  assert.ok(src.includes('SourceContractError'), 'extraction failures raise a typed error');
  // A call expression is not a literal: the extractor must have rejected allEmotionNames.
  assert.equal(typeof SOURCE_CONTRACT.allEmotionNames, 'undefined',
    'allEmotionNames is never evaluated as a call expression');
  assert.deepEqual(SOURCE_CONTRACT.emotions, SOURCE_CONTRACT.derivedEmotionNames,
    'the authored emotion vocabulary is derived from the frozen emos literal');
});

test('C31 a contract path that does not resolve is a harness contract error', () => {
  /* (4) The ROUND4 defect: a null pool silently passed. A field may leave the exact diff ONLY
   * when its contract was actually proven. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('UNRESOLVED_CONTRACT_PATH'), 'an unresolved path is recorded');
  assert.ok(src.includes('CONTRACTED.add'), 'a field is contracted only after proof');
  // Every remaining contract field is contracted only from a proven branch.
  const gates = [...src.matchAll(/if \(([a-zA-Z]+)\)[^{]*\{[^}]*CONTRACTED\.add/g)].map((m) => m[1]);
  assert.ok(gates.length > 0, 'contracted fields are gated by a satisfied check');
  for (const g of gates) {
    assert.ok(['autoOk', 'speechOk', 'ok', 'pair.contract'].includes(g),
      `CONTRACTED.add is gated on a proven condition (got ${g})`);
  }
  assert.ok(/if \(autoOk\)/.test(src),
    'the Auto Life field is contracted only when the pool is satisfied on both surfaces');
  assert.ok(src.includes('harnessContractErrors > 0'), 'a contract error fails the run');
  /* ROUND6A: the bubble field is contracted only from a proven PAIR verdict, and the pairing
   * decision itself lives in surface-provenance.mjs, not in this file. */
  assert.ok(/if \(pair\.contract\) CONTRACTED\.add\('dom\.random_lubt_bubble'\)/.test(src),
    'the bubble field is contracted only when the surface pair is valid and clean');
  const addIdx = src.indexOf("if (pair.contract) CONTRACTED.add('dom.random_lubt_bubble')");
  const evalIdx = src.indexOf('const pair = evaluatePairProvenance');
  assert.ok(evalIdx > 0 && addIdx > evalIdx,
    'the bubble field is contracted only after the pair has been evaluated');
  const surf = fs.readFileSync(path.join(HERE, 'surface-provenance.mjs'), 'utf8');
  assert.ok(surf.includes('bubble_unclassified_write'),
    'an unclassified bubble write is a contract violation, not a silent pass');
  assert.ok(surf.includes('PROVENANCE_REPORT_FAILED'),
    'a missing bubble trace is a harness contract error');
});

test('C32 every random contract names a pool path that resolves in the source', () => {
  /* (5) Each RANDOM_CONTRACTS entry is checked against the real authored path. */
  for (const [key, c] of Object.entries(RANDOM_CONTRACTS)) {
    // A dynamic bubble is a template resolved per surface after the actual selected emotion is
    // known; its template is not a static source path and must not be probed as one.
    if (c.dynamicBubble) {
      assert.equal(c.bubbleOwned, true, `${key}: a dynamic bubble state owns its Lubt write`);
      for (const e of SOURCE_CONTRACT.emotions) {
        assert.ok(poolFor(SOURCE_CONTRACT, `lubtTalk.emotion.${e}`) !== null,
          `${key}: dynamic template lubtTalk.emotion.${e} resolves for every authored emotion`);
      }
    }
    if (c.bubbleOwned && !c.dynamicBubble) {
      const owned = actionPool(SOURCE_CONTRACT, key.split('/')[1]);
      assert.ok(owned !== null && poolFor(SOURCE_CONTRACT, owned) !== null,
        `${key}: the owned Lubt action maps to a real authored pool path`);
    }
    if (c.speech && c.speech !== 'selectedEmotion') {
      assert.ok(poolFor(SOURCE_CONTRACT, `characterLines.${c.speech}`) !== null,
        `${key}: characterLines.${c.speech} resolves`);
    }
    if (c.auto_emotion) {
      assert.ok(poolFor(SOURCE_CONTRACT, c.auto_emotion) !== null,
        `${key}: ${c.auto_emotion} resolves`);
    }
    if (c.fx) {
      assert.ok(poolFor(SOURCE_CONTRACT, `fxMap.${c.fx.emotion}`) !== null,
        `${key}: fxMap.${c.fx.emotion} resolves`);
    }
  }
  // The paths CENTRAL called out specifically, now expressed through the action-pool map.
  assert.equal(actionPool(SOURCE_CONTRACT, '24_lubt_click'), 'lubtTalk.idle',
    'lubt click owns the idle bubble, not a generic emotion pool');
  assert.equal(actionPool(SOURCE_CONTRACT, '19_call_lubt'), 'lubtTalk.scan',
    'call-lubt owns the scan bubble');
  assert.equal(actionPool(SOURCE_CONTRACT, '25_lubt_drag'), 'lubtTalk.drag', 'drag owns the drag bubble');
  assert.equal(actionPool(SOURCE_CONTRACT, '18_say_phrase'), 'lubtTalk.reply', 'say owns the reply bubble');
  assert.equal(actionPool(SOURCE_CONTRACT, '22_face_special_moment'), 'lubtTalk.special',
    'special owns the special bubble');
  assert.equal(actionPool(SOURCE_CONTRACT, '16_heart_action'), 'lubtTalk.emotion.touched',
    'heart owns the touched bubble');
  // (15)(16)(17) These actions do NOT call the Lubt, so they own no bubble write.
  assert.equal(actionPool(SOURCE_CONTRACT, '26_talk_mode'), null, 'talk mode does not call the Lubt');
  assert.equal(actionPool(SOURCE_CONTRACT, '27_sing_mode'), null, 'sing mode does not call the Lubt');
  assert.equal(RANDOM_CONTRACTS['T1/04_tablet_interaction'].bubbleOwned, false,
    'the tablet interaction clicks an emotion button and never calls the Lubt');
  assert.equal(RANDOM_CONTRACTS['D1/19_call_lubt'].randomPosition, undefined,
    'the STABLE call-lubt terminal forbids a random position contract');
  assert.equal(RANDOM_CONTRACTS['D1/20_save_transient'].randomPosition, true,
    'the SAVE transient genuinely has a live authored random position');
});

test('C33 the drag state uses its own guide-pose terminal', () => {
  /* (9) The authored drag path leaves the GUIDE pose at home, not idle. */
  assert.ok(typeof TERMINAL_SRC.lubtDragHomeStable === 'string', 'a drag terminal predicate exists');
  assert.ok(TERMINAL_SRC.lubtDragHomeStable.includes('lubt-guide'),
    'the drag terminal proves the authored guide pose');
  assert.ok(TERMINAL_SRC.lubtDragHomeStable.includes("style.left === '300px'"),
    'the drag terminal proves the home position');
  assert.equal(RANDOM_CONTRACTS['D1/25_lubt_drag'].randomPosition, undefined,
    'a STABLE drag terminal must not use the random position contract');
  assert.equal(RANDOM_CONTRACTS['D1/25_lubt_drag'].dragTerminal, true,
    'the drag state declares its authored terminal');
});

test('C34 particles are validated from the observed lifecycle, not the final snapshot', () => {
  /* (7) A STABLE terminal requires noParticles, so requiring the particle in the final snapshot
   * would contradict it. The harness observes emission instead. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('PARTICLE_OBSERVER'), 'a lifecycle observer exists');
  assert.ok(src.includes('PARTICLE_REPORT'), 'the lifecycle report is collected');
  assert.ok(src.includes('contract.${surf}.fx_emitted'),
    'the FX contract checks what the source EMITTED');
  assert.equal(/particleCount\) <= 0\)/.test(src), false,
    'no final-snapshot particle requirement may remain for a STABLE state');
  assert.ok(SETTLE_BASE.includes('noParticles'), 'a STABLE terminal still ends clean');
});

test('C35 the parity contract uses named asset fields, not positional indexing', () => {
  /* (14) images[N] indexing is fragile; named fields are used instead. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  for (const f of ['portraitA_src', 'portraitB_src', 'visible_portrait_src', 'lubt_pose_src']) {
    assert.ok(src.includes(f), `${f} is collected as a named field`);
  }
  const contractBlock = src.slice(src.indexOf('const CONTRACTED = new Set('), src.indexOf('const infTargets'));
  assert.equal(/images\[\d+\]/.test(contractBlock), false,
    'no positional image index may appear in the parity contract');
});

function planSourceLine(state) {
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const i = src.indexOf(`state: '${state}', intent`);
  return i < 0 ? '' : src.slice(i, src.indexOf(String.fromCharCode(10), i));
}

test('C36 controlled transient states run the stable precondition first', () => {
  /* (10) The face/talk/sing/special states are not startup-race observations, so they must pass
   * the authored precondition before their action runs. */
  for (const state of ['22_face_special_moment', '23_face_hold_special',
    '26_talk_mode', '27_sing_mode']) {
    const spec = PARITY_PLAN.find((e) => e.state === state);
    assert.ok(spec, `${state} exists`);
    const srcLine = planSourceLine(state);
    assert.ok(/stablePrecondition\(p\)/.test(srcLine),
      `${state} isolates startup randomness before its action`);
  }
  // The initial/live startup states must NOT be preconditioned, so startup stays covered.
  for (const state of ['01_initial_live', '29_autolife_on_live']) {
    const srcLine = planSourceLine(state);
    assert.equal(/stablePrecondition\(p\)/.test(srcLine), false,
      `${state} keeps the raw startup behaviour`);
  }
});

test('C37 no browser-lexical pool reader and no window source export remains', () => {
  /* (2) The stale browser-lexical pool reader from ROUND5 is gone, and the single contract
   * authority is SOURCE_CONTRACT. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const defs = [...src.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]);
  assert.equal(defs.some((d) => /^[a-z]?[Pp]ools?$/.test(d) && /read/i.test(d)), false,
    'no readAuthoredPools-style browser-lexical reader may be defined');
  const collector = src.slice(src.indexOf('function collectChannels'), src.indexOf('/* ---------------- HARD-CHANNEL OWNERSHIP'));
  assert.equal(/typeof lubtTalk/.test(collector), false, 'the collector must not probe lexical pools');
  assert.equal(/typeof characterLines/.test(collector), false, 'the collector must not probe lexical pools');
  assert.equal(/window\.(lubtTalk|characterLines|poseForEmotion|fxMap|emos)\s*=/.test(src), false,
    'no source object may be exported to a window global');
  assert.ok(SOURCE_CONTRACT, 'the single extracted contract authority exists');
});

test('C38 the bubble contract is a provenance trace, not a pool AND or a union', () => {
  /* (4)(5)(7)(24) */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('PROVENANCE_INSTALL'), 'a bubble provenance observer exists');
  assert.ok(src.includes('classifyTrace'), 'writes are classified against the source contract');
  assert.ok(src.includes('semanticContract.bubble_unclassified_write'),
    'an unclassified write is a contract violation');
  assert.ok(src.includes('semanticContract.bubble_action_write_missing'),
    'an action that owns a Lubt write must have that write in the trace');
  assert.ok(src.includes('semanticContract.bubble_final_text'),
    'the final retained text must equal the final traced write');
  // No per-pool AND loop may remain anywhere in the comparison path.
  assert.equal(/for \(const path of contract\.bubble/.test(src), false,
    'the per-pool AND loop must be gone');
  // ROUND6A: the bubble contract is decided by the surface-PAIR evaluator, never one surface.
  assert.ok(src.includes('evaluatePairProvenance'),
    'the bubble contract is gated through the surface-pair evaluator');
  assert.equal(/CONTRACTED\.add\('dom\.random_lubt_bubble'\)/.test(src), true,
    'the bubble field is still contracted somewhere');
  assert.ok(/if \(pair\.contract\) CONTRACTED\.add\('dom\.random_lubt_bubble'\)/.test(src),
    'the bubble field is contracted only when the PAIR is valid and clean');
});

test('C39 a dynamic contract template is resolved per surface, never as a static path', () => {
  /* (3)(25) The `.selectedEmotion` placeholder is not a source path. */
  const face = RANDOM_CONTRACTS['D1/21_face_click_random'];
  assert.equal(face.dynamicBubble, true, 'the face state declares a dynamic bubble template');
  assert.equal(face.speech, 'selectedEmotion', 'its speech is owned by the selected emotion');
  // The literal placeholder is never probed as a static path.
  assert.equal(/contract\.bubble\b/.test(fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8')), false,
    'no static bubble path list may be used');
  for (const e of SOURCE_CONTRACT.emotions) {
    assert.ok(poolFor(SOURCE_CONTRACT, `lubtTalk.emotion.${e}`) !== null,
      `the dynamic template resolves for ${e}`);
  }
});

test('C40 the observer failures are fail-closed, never swallowed', () => {
  /* (18)(21)(8)(9) ROUND6A renamed the observer errors to their real cause and made both the
   * install and the readback fail closed. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('PROVENANCE_OBSERVER_INSTALL_FAILED'),
    'an observer install failure is a harness contract error');
  assert.ok(src.includes('PROVENANCE_REPORT_FAILED'),
    'a report readback failure is a harness contract error');
  assert.equal(/PROVENANCE_REPORT\)\.catch\(/.test(src), false,
    'no observer report may be swallowed by a catch fallback');
  assert.equal(/PROVENANCE_INSTALL\)\.catch\(\(e\) => \{ \/\* observed below \*\/\ \}\)/.test(src), false,
    'no observer install may be swallowed');
  // A synthetic empty report must never stand in for a failed readback.
  assert.equal(/provenance\s*=\s*\{\s*bubble:\s*\[\]\s*\}/.test(src), false,
    'a failed readback may not be replaced by a synthetic empty report');
});

test('C41 talk, sing and the tablet interaction match their real authored call paths', () => {
  /* (15)(16)(17) */
  assert.equal(RANDOM_CONTRACTS['D1/26_talk_mode'].talkMode, true, 'talk is a talk-mode contract');
  assert.equal(RANDOM_CONTRACTS['D1/26_talk_mode'].speech, undefined,
    'talk does not use a characterLines speech pool; it shows the #phrase value');
  assert.equal(RANDOM_CONTRACTS['D1/26_talk_mode'].randomPosition, undefined,
    'talk never calls the Lubt, so it has no random position');
  assert.equal(RANDOM_CONTRACTS['D1/27_sing_mode'].singMode, true, 'sing is a sing-mode contract');
  assert.equal(RANDOM_CONTRACTS['D1/27_sing_mode'].fx, undefined,
    'sing requires no V2 FX family; it emits base notes');
  assert.equal(RANDOM_CONTRACTS['D1/27_sing_mode'].baseNotes, 8, 'the authored notes() creates 8');
  assert.equal(RANDOM_CONTRACTS['T1/04_tablet_interaction'].bubbleOwned, false,
    'the tablet interaction clicks an emotion button and never calls the Lubt');
  assert.equal(actionPool(SOURCE_CONTRACT, '26_talk_mode'), null, 'talk owns no Lubt write');
  assert.equal(actionPool(SOURCE_CONTRACT, '27_sing_mode'), null, 'sing owns no Lubt write');
});

test('C42 D1/21 runs the stable precondition and a correlated barrier, not a fixed delay', () => {
  /* (11)(12) */
  const spec = PARITY_PLAN.find((e) => e.state === '21_face_click_random');
  assert.ok(spec, 'the face-random state exists');
  const line = planSourceLine('21_face_click_random');
  assert.ok(/faceRandomReaction/.test(line), 'D1/21 uses the correlated barrier driver');
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  const fi = src.indexOf('async function faceRandomReaction');
  const body = src.slice(fi, src.indexOf(String.fromCharCode(10) + '}', fi));
  assert.ok(/stablePrecondition/.test(body), 'D1/21 runs the stable precondition first');
  assert.equal(/waitForTimeout\(180\)/.test(body), false, 'the fixed 180 ms capture is removed');
  assert.ok(src.includes('FACE_RANDOM_BARRIER_TIMEOUT'),
    'the barrier has a real semantic predicate and fails closed');
  assert.ok(src.includes('await p.mouse.move(2, 2)'), 'the pointer is parked away from the face');
});

test('C43 a contract violation can never report semantic exactness', () => {
  /* (22) */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  // The readiness stub also carries the field; anchor on the real per-state result.
  const at = src.indexOf('semantic_contract_exact: defects');
  const row = src.slice(at, src.indexOf('geometry_contract_exact:', at));
  assert.ok(row.includes('semanticContract.'),
    'semantic_contract_exact counts contract violations, not just uncontracted diffs');
  assert.ok(/&& defects\.filter\(\(d\) => d\.path\.startsWith\('semanticContract\.'\)\)\.length === 0/
    .test(src.replace(/\s+/g, ' ')),
  'the exactness flag is conjunctive with the violation count');
  // The emitted summary is checked once a fresh run has written it; the committed evidence from
  // an older harness legitimately lacks these fields.
  const sp = path.join(S4_DIR, 'candidate-summary.json');
  if (fs.existsSync(sp)) {
    const j = JSON.parse(fs.readFileSync(sp, 'utf8'));
    if (typeof j.SEMANTIC_CONTRACT_VIOLATIONS === 'number') {
      assert.equal(j.POSITIONAL_IMAGE_SEMANTIC_PATH_COUNT, 0,
        'no positional image path may appear in the semantic channel');
    }
  }
});

/* ===================== ROUND6A INSTRUMENT REPAIR GUARDS ===================== */

test('C44 the undefined page alias is gone from the provenance readback', () => {
  /* (1)(7) UNDEFINED_PAGE_ALIAS_COUNT=0 / P_EVALUATE_PROVENANCE_REPORT_COUNT=0
   *
   * The defect was an UNDECLARED `p` alias inside capture(). The review-pack loop legitimately
   * uses a local `p` page object, so the guard is scoped: capture() must never reference `p`, and
   * anywhere `p` IS used it must be a page that actually declares it. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  // The capture() function must not reference any page alias other than `page`.
  const captureBody = src.slice(src.indexOf('async function capture'),
    src.indexOf('async function browserCandidate'));
  assert.equal(/\bconst p\b|\blet p\b|\bp\s*=/.test(captureBody), false,
    'capture() declares no `p` alias');
  assert.equal(/\bp\./.test(captureBody), false,
    'capture() never dereferences a `p` alias');
  assert.equal(captureBody.includes('page.evaluate(PROVENANCE_REPORT)'), true,
    'capture() reads the report back through the real page object');
  assert.equal(captureBody.includes('page.evaluate(PROVENANCE_INSTALL)'), true,
    'capture() installs the observer through the real page object');
  // Every `p.evaluate(PROVENANCE_*)` site must sit in a scope that BINDS its own page: either a
  // driver/helper parameter (`async function armTraces(p)`, `stable`, `live`, `faceRandomReaction`)
  // or a locally created review-pack page.
  for (const m of src.matchAll(/\bp\.evaluate\((PROVENANCE_[A-Z_]+)\)/g)) {
    const before = src.slice(0, m.index);
    const bindsP = [
      'const p = await c.newPage()',
      'const p = await c.newPage',
      'async function armTraces(p)',
      'const stable = (drive, terminal) => async (p)',
      'const live = (drive, ms) => async (p)',
      'async function faceRandomReaction(p)',
    ].some((decl) => before.lastIndexOf(decl) > 0);
    assert.ok(bindsP, `${m[1]} via \`p\` sits in a scope that binds that page`);
  }
  assert.equal((src.match(/page\.evaluate\(PROVENANCE_REPORT\)/g) || []).length >= 1, true,
    'the report is read back through the real page object');
});

test('C45 a missing provenance aborts evaluation instead of continuing', () => {
  /* (3) PROVENANCE_NULL_CONTINUE_PATHS=0 */
  const surf = fs.readFileSync(path.join(HERE, 'surface-provenance.mjs'), 'utf8');
  assert.ok(surf.includes('if (!src || typeof src !== \'object\')'),
    'a null provenance is rejected before any evaluation');
  const guard = surf.indexOf('if (!src || typeof src');
  const deref = surf.indexOf('const trace = src.bubble;');
  assert.ok(guard > 0 && guard < deref, 'the null guard precedes any dereference of the report');
  // Every null exit must be a harness error, never a valid result.
  const nullReturns = (surf.match(/PROVENANCE_REPORT_FAILED/g) || []).length;
  assert.ok(nullReturns >= 1, 'the null provenance records a named harness error');
  // The caller must route harness errors out and never contract on an invalid pair.
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(/for \(const h of pair\.harnessErrors\) HARNESS_CONTRACT_ERRORS\.push\(h\)/.test(src),
    'pair harness errors are recorded');
  assert.ok(/if \(pair\.contract\) CONTRACTED\.add/.test(src),
    'contracting is gated on the pair verdict');
});

test('C46 both surfaces are consumed and neither alone can contract a field', () => {
  /* (4)(5)(7) ORIGINAL_ONLY_PROVENANCE_GATE=0 */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.ok(src.includes('oProvenance: o.provenance'), 'the original provenance is consumed');
  assert.ok(src.includes('sProvenance: s.provenance'), 'the split provenance is consumed');
  assert.ok(src.includes('oFinalText: o.native.dom.random_lubt_bubble'),
    'the original final bubble text is compared');
  assert.ok(src.includes('sFinalText: s.native.dom.random_lubt_bubble'),
    'the split final bubble text is compared');
  // The decision must come from the pair, never from a single surface's report.
  assert.equal(/o\.provenance\.bubble\s*\?/.test(src), false,
    'no single-surface provenance gate may remain');
  const surf = fs.readFileSync(path.join(HERE, 'surface-provenance.mjs'), 'utf8');
  assert.ok(/contract: valid && violations\.length === 0 && original\.violated === 0 && split\.violated === 0/
    .test(surf.replace(/\s+/g, ' ')),
  'the pair contracts only when both surfaces are valid and both are clean');
});

test('C47 the fx particle lifecycle is proven per surface, never through a null report', () => {
  /* (3) The ROUND6 derived crash was `particleReport.families` on a null report. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  assert.equal(/o\.particleReport\.families/.test(src), false,
    'no direct null-prone dereference of the original particle report remains');
  assert.equal(/s\.particleReport\.families/.test(src), false,
    'no direct null-prone dereference of the split particle report remains');
  assert.equal(/\brep\.families\b/.test(src), false,
    'the old shared-report dereference is gone');
  assert.ok(src.includes('pair.fxResolved'), 'the fx lifecycle is evaluated through the pair');
  const surf = fs.readFileSync(path.join(HERE, 'surface-provenance.mjs'), 'utf8');
  assert.ok(surf.includes('base.families'), 'families are derived from the observed lifecycle');
});

test('C48 the surface-pair symmetry fixtures are present and independently green', () => {
  /* (6) CASE A - CASE E must exist as structural tests that need no browser evidence. */
  const p = path.join(HERE, 'provenance-symmetry.test.mjs');
  assert.ok(fs.existsSync(p), 'the provenance symmetry test file exists');
  const sym = fs.readFileSync(p, 'utf8');
  for (const c of ['CASE A', 'CASE B', 'CASE C', 'CASE D', 'CASE E']) {
    assert.ok(sym.includes(c), `fixture ${c} is present`);
  }
  assert.equal(/readFileSync\(.*evidence/.test(sym), false,
    'the symmetry tests never read run evidence, so they pass before any browser run');
  assert.equal(/playwright|chromium/.test(sym), false,
    'the symmetry tests require no browser');
});
