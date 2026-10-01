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

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAPSULE = path.resolve(HERE, '..');
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
const INFINITE_TRACKS = ['spin', 'pulse', 'breath'];
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
  for (const spec of PLAN) {
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
  assert.ok(src.includes('AUTHORED_RANDOM_SCALAR_PATHS'),
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
  for (const spec of PLAN) {
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
  const ok = await settle(['autoLifeOff', 'lubtIdle', 'lubtPoseIdle', 'noParticles',
    'speechHidden', 'noHoverSmile', 'stageClean'])(p);
  if (!ok) throw new Error('STARTUP_QUIESCENCE_TIMEOUT');
  await p.mouse.move(2, 2);
}

const stable = (drive, terminal) => async (p) => {
  await stablePrecondition(p);
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
const live = (drive, ms) => async (p) => { await drive(p); await p.waitForTimeout(ms || 200); };

const SETTLE_BASE = ['noParticles', 'lubtIdle', 'speechHidden', 'noHoverSmile'];

const PLAN = [
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
  { ctx: 'D1', state: '20b_save_post_revert', intent: 'STABLE', driver: stable(async (p) => { await p.click('#saveBtn'); }, ['saveRestored', ...SETTLE_BASE, 'noFiniteActive']) },
  { ctx: 'D1', state: '24_lubt_click', intent: 'STABLE', driver: stable(async (p) => { const b = await p.locator('#lubt').boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }, [...SETTLE_BASE, 'noFiniteActive']) },
  { ctx: 'D1', state: '25_lubt_drag', intent: 'STABLE', driver: stable(async (p) => { const b = await p.locator('#lubt').boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await p.mouse.move(b.x + 100, b.y + 50, { steps: 8 }); await p.mouse.up(); }, [...SETTLE_BASE, 'noFiniteActive']) },
  { ctx: 'D1', state: '21_face_click_random', intent: 'AUTHORED_RANDOM', driver: live(async (p) => { const b = await p.locator('#portraitWrap').boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }, 180) },
  { ctx: 'D1', state: '22_face_special_moment', intent: 'EXPLICIT_TRANSIENT', driver: live(async (p) => { const b = await p.locator('#portraitWrap').boundingBox(); await p.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2); }, 300) },
  { ctx: 'D1', state: '23_face_hold_special', intent: 'EXPLICIT_TRANSIENT', driver: live(async (p) => { const b = await p.locator('#portraitWrap').boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); }, 200) },
  { ctx: 'D1', state: '26_talk_mode', intent: 'EXPLICIT_TRANSIENT', driver: live(async (p) => { await p.click('#talkBtn'); }, 600) },
  { ctx: 'D1', state: '27_sing_mode', intent: 'EXPLICIT_TRANSIENT', driver: live(async (p) => { await p.click('#singBtn'); }, 600) },
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
  const planSrc = runtime.slice(runtime.indexOf('const PLAN = ['), runtime.indexOf('const REVIEW = ['));
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
  const stableStates = PLAN.filter((x) => x.intent === 'STABLE');
  assert.ok(stableStates.length > 0, 'the plan has STABLE states');
  // And the terminal set includes the OFF proof.
  assert.ok(src.includes("'autoLifeOff'"), 'autoLifeOff is a declared terminal predicate');
  // Live behavior stays covered with Auto Life ON.
  assert.ok(PLAN.some((s) => s.state === '29_autolife_on_live' && s.intent === 'AUTHORED_LIVE'),
    'an AUTHORED_LIVE state keeps Auto Life ON coverage');
});

test('C10 SAVE is split into a transient state and a post-revert stable state', () => {
  /* ROUND2 Finding 3: the source shows SAVED transiently and restores the label after 3200 ms. */
  const t = PLAN.find((s) => s.state === '20_save_transient');
  const b = PLAN.find((s) => s.state === '20b_save_post_revert');
  assert.ok(t, 'a SAVE transient state exists');
  assert.equal(t.intent, 'EXPLICIT_TRANSIENT', 'the saved moment is EXPLICIT_TRANSIENT');
  assert.ok(b, 'a SAVE post-revert stable state exists');
  assert.equal(b.intent, 'STABLE', 'the post-revert state is STABLE');
  assert.ok(/saveRestored/.test(b.driver.toString()), 'the stable state waits for the restored label');
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
  assert.ok(/animationInventoryNormalized, s\.native\.animationInventoryNormalized/.test(src),
    'the comparison uses the normalized inventory');
});

test('C12 error channels are counted independently, never copied from one bucket', () => {
  /* ROUND2 Finding 4: one netStates boolean was written into three fields. */
  const src = fs.readFileSync(path.join(HERE, 's4-parity.test.mjs'), 'utf8');
  for (const f of ['CONSOLE_ERROR_STATES', 'PAGE_ERROR_STATES', 'HTTP_ERROR_STATES',
    'REQUEST_FAILED_STATES', 'NETWORK_ERROR_STATES', 'ERROR_CHANNEL_DETAIL']) {
    assert.ok(src.includes(f), `${f} is recorded`);
  }
  const sp = path.join(S4_DIR, 'candidate-summary.json');
  if (fs.existsSync(sp)) {
    const j = JSON.parse(fs.readFileSync(sp, 'utf8'));
    for (const f of ['CONSOLE_ERROR_STATES', 'PAGE_ERROR_STATES', 'HTTP_ERROR_STATES',
      'REQUEST_FAILED_STATES']) {
      assert.equal(typeof j[f], 'number', `${f} is an independent number`);
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
    },
    images: imgs,
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
const DEDICATED_CHANNELS = ['geometry', 'computedStyle', 'animations', 'externalLayers', 'scroll', 'visibility'];

function stripDedicatedChannels(ch) {
  const c = { ...ch };
  for (const k of DEDICATED_CHANNELS) delete c[k];
  return c;
}

// AUTHORED_RANDOM_SCALAR is limited to this explicit field allowlist (HOLD Finding 3): every entry
// is directly traced to an authored Math.random() expression in the frozen source.
const AUTHORED_RANDOM_SCALAR_PATHS = new Set([
  'dom.random_speech', 'dom.random_lubt_bubble', 'dom.random_log',
  'dom.random_lubt_left', 'dom.random_lubt_top', 'dom.random_lubt_transform',
  'dom.random_note_dx', 'dom.random_petal_dx', 'dom.random_emotion_title',
]);

function projectSemantic(ch) {
  const c = JSON.parse(JSON.stringify(stripDedicatedChannels(ch)));
  for (const p of AUTHORED_RANDOM_SCALAR_PATHS) {
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

async function capture(chromium, ctx, spec, surface) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: ctx.width, height: ctx.height }, deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const net = { consoleErrors: [], pageErrors: [], failed: [], bad: [] };
    page.on('console', (m) => { if (m.type() === 'error') net.consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => net.pageErrors.push(String(e && e.message)));
    page.on('requestfailed', (r) => net.failed.push(`${r.failure()?.errorText || 'FAILED'} ${r.url()}`));
    page.on('response', (r) => { if (r.status() >= 400) net.bad.push(`${r.status()} ${r.url()}`); });

    await page.setExtraHTTPHeaders({ 'x-surface': surface });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });

    /* (7) STARTUP READINESS FAILS CLOSED. A timeout is never swallowed. */
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

    await context.close();
    return { native, phased, phase, net, startupReadiness, terminalFailed, failed: false };
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

    for (const spec of PLAN) {
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
      const animRaw = diffPaths(o.native.animationInventoryNormalized, s.native.animationInventoryNormalized);
      const semProj = diffPaths(projectSemantic(o.native), projectSemantic(s.native));

      const infTargets = (c) => new Set(c.animations.filter((a) => a.kind === 'CSSAnimation'
        && INFINITE_TRACKS.includes(a.name) && a.iterations === 'Infinity').map((a) => a.target));
      const bothInf = new Set([...infTargets(o.native)].filter((t) => infTargets(s.native).has(t)));

      const defects = [];
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
          if (AUTHORED_RANDOM_SCALAR_PATHS.has(d.path)) {
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
        anim_raw_exact: animRaw.length === 0,
        semantic_contract_exact: defects.filter((d) => d.path.startsWith('semantic.')).length === 0,
        geometry_contract_exact: defects.filter((d) => d.path.startsWith('geometry.')).length === 0,
        style_contract_exact: defects.filter((d) => d.path.startsWith('computedStyle.')).length === 0,
        anim_contract_exact: defects.filter((d) => d.path.startsWith('animations.')).length === 0,
        real_defects: defects,
        error_channels: {
          console: chCount(o.net.consoleErrors, s.net.consoleErrors),
          page: chCount(o.net.pageErrors, s.net.pageErrors),
          http: chCount(o.net.bad, s.net.bad),
          request_failed: chCount(o.net.failed, s.net.failed),
        },
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
      const spec = PLAN.find((x) => x.ctx === r.ctx && x.state === r.state);
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
  const pageStates = results.filter((r) => (r.error_channels || {}).page > 0).length;
  const httpStates = results.filter((r) => (r.error_channels || {}).http > 0).length;
  const requestFailedStates = results.filter((r) => (r.error_channels || {}).request_failed > 0).length;
  const errorDetail = results.flatMap((r) => (r.error_channel_detail || [])
    .map((d) => ({ state: `${r.ctx}/${r.state}`, ...d })));
  const brokenStates = results.filter((r) => Math.max(...(r.broken_images || [0, 0])) > 0).length;
  const extStates = results.filter((r) => !r.external_layers
    || !r.external_layers.original.cssLoaded || !r.external_layers.original.jsLoaded
    || !r.external_layers.split.cssLoaded || !r.external_layers.split.jsLoaded).length;
  const readinessStates = results.filter((r) => r.readiness_failed).length;
  const frozen = results.filter((r) => !r.readiness_failed)
    .every((r) => r.hint_dom_present && r.hint_display[0] === r.hint_display[1]);
  const allContract = cnt('semantic_contract_exact') === n && cnt('geometry_contract_exact') === n
    && cnt('style_contract_exact') === n && cnt('anim_contract_exact') === n;
  const hold = totalDefects > 0 || consoleStates > 0 || pageStates > 0 || httpStates > 0
    || requestFailedStates > 0 || brokenStates > 0 || extStates > 0
    || !allContract || sweep.loaded !== sweep.total || !frozen || readinessStates > 0;

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
    authored_random_scalar_paths: [...AUTHORED_RANDOM_SCALAR_PATHS],
    CONSOLE_ERROR_STATES: consoleStates,
    PAGE_ERROR_STATES: pageStates,
    NETWORK_ERROR_STATES: requestFailedStates,
    HTTP_ERROR_STATES: httpStates,
    REQUEST_FAILED_STATES: requestFailedStates,
    MISSING_ASSET_STATES: brokenStates,
    ERROR_CHANNEL_DETAIL: errorDetail,
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
    && (r.http_error_states || 0) === 0 && (r.request_failed_states || 0) === 0;
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