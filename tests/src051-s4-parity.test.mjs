import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MOBILE_390_STATES,
  MOBILE_320_STATES,
  SRC051_PARITY_LANES,
  PARITY_EXCLUSIONS,
} from '../src/08_harness/source051-parity.mjs';
import {
  NORMAL_MOTION_STATES,
  REDUCED_MOTION_STATES,
} from '../src/08_harness/source051-driver.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capsule = path.join(repoRoot, 'src', '03_sources', 'SRC051');
const readRepo = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(capsule, rel), 'utf8'));

const names = (plan) => plan.map((state) => state.name);

test('the four S4 lanes carry the exact accepted state counts, recovered not invented', () => {
  // Desktop lanes reuse the accepted driver tables, so they cannot drift from baseline replay.
  assert.equal(SRC051_PARITY_LANES[0].states, NORMAL_MOTION_STATES, 'desktop normal reuses the accepted driver table');
  assert.equal(SRC051_PARITY_LANES[1].states, REDUCED_MOTION_STATES, 'desktop reduced reuses the accepted driver table');
  assert.deepEqual(SRC051_PARITY_LANES.map((lane) => [lane.lane, lane.states.length]), [
    ['desktop-normal', 18],
    ['desktop-reduced', 14],
    ['mobile-390', 12],
    ['mobile-320', 10],
  ]);
  // The mobile mapping is verbatim S2 section 9, and the 320 lane is the 390 lane minus exactly the
  // two states S2 recorded as unreachable at that width.
  assert.deepEqual(names(MOBILE_390_STATES), [
    'HERO_READY', 'ANALYSIS_PHASE1_SCAN', 'ANALYSIS_PHASE2_WHITE_GATE', 'ANALYSIS_PHASE3_EYE_OVERLAY',
    'DOSSIER', 'THERMAL_CITY', 'CONNECTION_FLOW', 'CONNECTION_NODE_PRESENCE_N5_N6', 'SAVED_CTA',
    'SAVED_CTA_PULSE_CLICK', 'BRAND_CLOSE', 'POINTER_PARALLAX',
  ]);
  assert.deepEqual(names(MOBILE_320_STATES), names(MOBILE_390_STATES).filter((name) => name !== 'SAVED_CTA_PULSE_CLICK' && name !== 'POINTER_PARALLAX'));
});

test('no mobile state is invented: each traces to an accepted desktop state or the one mobile observation', () => {
  const desktop = new Set([...names(NORMAL_MOTION_STATES), ...names(REDUCED_MOTION_STATES).map((n) => n.replace(/^RM_/, ''))]);
  const S2_MOBILE_ALIAS = {
    POINTER_PARALLAX: 'HERO_POINTER_PARALLAX',
    SAVED_CTA: 'SAVED_PRE_CTA',
    SAVED_CTA_PULSE_CLICK: 'SAVED_CTA_ACTIVE',
    CONNECTION_FLOW: 'CONNECTION',
  };
  for (const name of names(MOBILE_390_STATES)) {
    const mapped = S2_MOBILE_ALIAS[name] ?? name;
    assert.ok(desktop.has(mapped) || name === 'CONNECTION_NODE_PRESENCE_N5_N6', `mobile state ${name} traces to an accepted state`);
  }
});

test('no page-evaluated collector closes over module scope', () => {
  // A page-evaluated body is serialized and runs in the browser, where module scope does not exist.
  // The first S4 run failed exactly this way: "page.evaluate: ReferenceError: collectSRC051State is
  // not defined", because the parity collector called the imported driver collector from inside the
  // page. It now receives the base state as a serializable argument instead. This test is static
  // because the failure only appears with a live browser, and the fix must not need one to verify.
  const parity = readRepo('src/08_harness/source051-parity.mjs');
  const code = parity.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  // Names that only exist at module scope in the driver and therefore cannot be called from a page body.
  const MODULE_ONLY = ['collectSRC051State', 'captureSRC051Lane', 'waitForScrollArrival', 'waitForTransitionsSettled', 'setAnalysisPhase', 'goToSection', 'scrollElementIntoView', 'collectWaapiPulseEvidence', 'captureState', 'partitionErrors'];
  for (const name of MODULE_ONLY) {
    // Allowed only as an import specifier, never invoked inside a page-evaluated body.
    const invoked = new RegExp(`\\(\\s*${name}\\s*\\(`).test(code);
    assert.ok(!invoked, `the parity module must not call ${name}() from a page-evaluated body`);
  }

  // The extras collector is passed as data, and the base is handed to it as an argument.
  assert.match(code, /extras: collectSRC051ParityExtras/, 'the extras collector is passed, not called');
  assert.match(code, /function collectSRC051ParityExtras\(\)/, 'the extras collector takes no closure input');

  // The driver must hand the base state in as an argument rather than expecting the page to have it.
  const driver = readRepo('src/08_harness/source051-driver.mjs');
  assert.match(driver, /page\.evaluate\(extras, base\)/, 'the driver passes the base state into the extras body');
});

test('the parity route is wired before the generic fallback and the driver stays original-only', () => {
  const parity = readRepo('src/08_harness/capture-source-parity.mjs');
  assert.match(parity, /import \{ captureSRC051Parity \} from '\.\/source051-parity\.mjs';/);
  assert.ok(parity.indexOf("if (sourceId === 'SRC051')") > 0, 'the SRC051 route exists');
  const callSite = parity.indexOf('await captureSRC051Parity(');
  const genericCall = parity.indexOf('await captureVariant(');
  assert.ok(callSite > 0, 'the SRC051 route calls its own capture');
  assert.ok(genericCall === -1 || callSite < genericCall, 'SRC051 is routed before the generic single-executable capture');
  // Baseline replay remains a single-surface observation; the driver must not name the split surface.
  const driver = readRepo('src/08_harness/source051-driver.mjs');
  assert.ok(!/split\/index\.html/.test(driver), 'the accepted baseline driver still never references the split surface');
  assert.match(driver, /export async function captureSRC051Baseline\(/);
  assert.match(driver, /export async function captureSRC051Lane\(/, 'both baseline and parity drive one shared capture core');
});


test('the S4 capture settles CSS transitions for stable states, and proves it', () => {
  // CENTRAL found stable states sampled mid-transition (BLOCKER 1). The S3 wait only applied to the
  // three recipes carrying `settle: true`, and a wait that can time out silently is not synchronization
  // at all, so S4 has its own settle applied to EVERY stable state and then verified.
  const driver = readRepo('src/08_harness/source051-driver.mjs');
  const parity = readRepo('src/08_harness/source051-parity.mjs');

  assert.match(driver, /export async function waitForRelevantTransitionsSettled\(/, 'the S4 settle exists as its own function');
  // It must discriminate CSS transitions from JavaScript Web Animations, or it would wait away the
  // authored CTA pulse that frozen defect D5 requires to be preserved.
  assert.match(driver, /a\.constructor\.name === 'CSSTransition'/, 'the settle targets CSSTransition only');
  const settleBody = driver.split('export async function waitForRelevantTransitionsSettled')[1]?.split('\n}')[0] ?? '';
  assert.ok(!/constructor\.name === 'Animation'/.test(settleBody), 'the settle never waits on JS Web Animations');
  // It must verify rather than trust, and must fail loudly instead of producing a green from an
  // unfinished frame.
  assert.match(driver, /if \(last\.every\(\(transition\) => transition\.play_state !== 'running'\)\)/, 'the settle re-reads and verifies');
  assert.match(driver, /CSS_TRANSITION_SETTLE_SYNCHRONIZATION did not settle/, 'an unsettled state throws instead of passing');
  // The settle is wired into the S4 route, not only into the S3 resting states.
  assert.match(parity, /settleRelevant,/, 'the parity route passes the settle into the shared capture core');
  assert.match(parity, /const settleRelevant = \(page, stateName\)/, 'the parity route defines the settle');
  // S3 baseline behaviour is preserved: the old wait still exists and is still the default path.
  assert.match(driver, /export async function waitForTransitionsSettled\(/, 'the S3 resting-state wait is retained');
  assert.match(driver, /if \(settleRelevant\) await settleRelevant\(page, stateName\);/, 'the settle takes precedence when supplied');
  assert.match(driver, /else if \(settleTransitions\) await waitForTransitionsSettled\(page\);/, 'baseline keeps the S3 wait when no S4 settle is supplied');
});

test('#whiteGate and #eyeOverlay computed presentation is part of parity', () => {
  // An active class is not sufficient evidence: the authored CSS transitions .white-gate{transition:.3s}
  // and .eye-overlay{transition:.25s}, so an element can be .active while its opacity is still moving.
  // CENTRAL's artifact review found exactly that, reported as EXACT_EQUAL.
  const parity = readRepo('src/08_harness/source051-parity.mjs');
  assert.match(parity, /white_gate_presentation: gate\('whiteGate'\)/, '#whiteGate presentation is recorded');
  assert.match(parity, /eye_overlay_presentation: gate\('eyeOverlay'\)/, '#eyeOverlay presentation is recorded');
  assert.match(parity, /const gate = \(id\) => \{[\s\S]*?display: style\.display, visibility: style\.visibility, opacity: style\.opacity/, 'the gate records display, visibility and opacity');
  // These are parity inputs, so they must not be excluded.
  const excluded = PARITY_EXCLUSIONS.map((e) => e.match.source).join(' ');
  assert.ok(!/white_gate_presentation|eye_overlay_presentation|whiteGate|eyeOverlay/.test(excluded), 'gate presentation is never excluded from comparison');
  // And they classify to the visibility channel, where a difference is a failure. The gate records
  // opacity/display/visibility, which the existing VISIBILITY rule already covers by field name, so this
  // asserts the classification is genuinely reached for these paths rather than relying on a
  // name-specific rule that could silently stop matching.
  assert.match(parity, /display\|visibility\|opacity\|class_name/, 'display/visibility/opacity classify to VISIBILITY');
  assert.ok(!/\.presentation\)\./.test(parity), 'no dead classification rule is left behind');
});

test('the screenshot channel cannot claim EXACT_EQUAL, and reduced-motion is not excused', () => {
  // BLOCKER 2. CENTRAL found channels.SCREENSHOT=EXACT_EQUAL while the same run recorded 1/18
  // byte-identical pairs. A channel that is not compared must never be labelled EXACT_EQUAL.
  const parity = readRepo('src/08_harness/source051-parity.mjs');
  assert.match(parity, /const CHANNELS = \['DOM', 'STATE', 'GEOMETRY', 'VISIBILITY', 'INTERACTION', 'RUNTIME', 'NETWORK'\];/, 'SCREENSHOT is not an exact-comparison channel');
  assert.ok(!/const CHANNELS = \[[^\]]*'SCREENSHOT'\]/.test(parity), 'the channel list has no SCREENSHOT entry');
  assert.match(parity, /function classifyScreenshots\(evidence, laneSpec\)/, 'a dedicated screenshot classification exists');
  assert.match(parity, /status: 'EVIDENCE_ONLY_NOT_A_PASS_RULE'/, 'the channel states it is not a pass rule');
  assert.match(parity, /byte_equality_compared: false/, 'the channel states bytes were not compared');
  // BLOCKER 2b: a reduced-motion lane must not be excused by CONTINUOUS_CSS_PHASE_VARIANCE, because the
  // source disables CSS animation there. A difference after settling is a finding.
  assert.match(parity, /NOT_EXCUSED: this lane disables CSS animation/, 'reduced-motion differences are not attributed to CSS phase variance');
  assert.match(parity, /DIFFERENCES_IN_THIS_LANE_MAY_BE_CONTINUOUS_CSS_PHASE_VARIANCE_PENDING_CENTRAL_REVIEW/, 'variance is only claimed where continuous CSS is active');
  assert.match(parity, /continuous_css_phase_variance_active_in_lane: continuousCssActive/, 'the lane condition is recorded, not assumed');
});

test('a successful bounded SRC051 capture increments the shared capture count', () => {
  // BLOCKER 3. The custom branch continued past the counter, emitting a PASS line next to
  // SRC_SPLIT_PARITY_CAPTURE_COUNT=0, which reads as "nothing was captured" beside a success.
  const harness = readRepo('src/08_harness/capture-source-parity.mjs');
  const routeAt = harness.indexOf("if (sourceId === 'SRC051')");
  const incrementAt = harness.indexOf('captured += 1;', routeAt);
  assert.ok(routeAt > 0, 'the SRC051 route exists');
  assert.ok(incrementAt > routeAt, 'the SRC051 route increments the capture count');
  // The increment must come after the pass assertion, so a failed capture is never counted.
  const failAt = harness.indexOf('S4 candidate parity FAILED', routeAt);
  assert.ok(failAt > 0 && failAt < incrementAt, 'the count is incremented only after the candidate passed');
  assert.match(harness, /SRC_SPLIT_PARITY_CAPTURE_COUNT=/, 'the shared count marker is emitted');
});

test('the parity harness still forbids acceptance metadata and forbidden techniques', () => {
  const code = readRepo('src/08_harness/source051-parity.mjs').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/accepted-parity\.json/.test(code), 'the parity module never names an accepted-parity artifact in code');
  assert.ok(!/source_split_parity_pass\s*[:=]\s*true/.test(code), 'source_split_parity_pass is never set true');
  for (const forbidden of ['SSIM', 'ssim', 'hamming', 'Hamming', 'pixelTolerance', 'Date.now =', 'Math.random =', 'requestAnimationFrame =', 'cancelAnimation', 'finish()', 'addInitScript']) {
    assert.ok(!code.includes(forbidden), `the parity harness must not use ${forbidden}`);
  }
});

test('the parity comparison excludes only what a taxonomy class authorizes', () => {
  // Each exclusion must name its authorizing class. An unjustified exclusion would mean a semantic field
  // was dropped to force a green, and an unconditional one would quietly weaken a lane that does not
  // need it, so both the count and the conditionality are pinned here.
  assert.deepEqual(PARITY_EXCLUSIONS.map((e) => e.id), [
    'S2_ANIMATION_BOOKKEEPING',
    'CONTINUOUS_CSS_PHASE_VARIANCE',
    'DECLARED_WAAPI_TRANSIENT_STATE',
    'ANIMATED_HEART_CORE_RECT',
    'SCROLL_EXTREME_CTA_RECT',
  ]);
  for (const exclusion of PARITY_EXCLUSIONS) {
    assert.ok(exclusion.match instanceof RegExp, `${exclusion.id} has a matcher`);
    assert.ok(exclusion.reason.length > 40, `${exclusion.id} states why it is allowed`);
    assert.ok(exclusion.taxonomy_class, `${exclusion.id} names its taxonomy class`);
  }
  assert.match(PARITY_EXCLUSIONS[0].match.source, /animation_bookkeeping/);
  assert.match(PARITY_EXCLUSIONS[1].match.source, /screenshot_/);
  // Only the WAAPI clock reading is excluded; the declared timing contract stays compared.
  assert.match(PARITY_EXCLUSIONS[2].match.source, /current_time_ms/);
  assert.ok(!/duration_ms|play_state|target/.test(PARITY_EXCLUSIONS[2].match.source), 'the WAAPI exclusion does not cover the declared timing contract');

  // The two conditional exclusions are one element / one measurement each, never a geometry band.
  const heart = PARITY_EXCLUSIONS[3];
  assert.match(heart.match.source, /heart_core/, 'the animated-element exclusion is scoped to .heart-core');
  assert.ok(!/\|/.test(heart.match.source), 'it does not match a general path');
  const cta = PARITY_EXCLUSIONS[4];
  assert.match(cta.match.source, /pulse_button/, 'the scroll-extreme exclusion is scoped to #pulseBtn');
  assert.ok(!/heart|lens|hero_stage|logo_close|dossier/.test(cta.match.source), 'it does not touch other element rects');

  // Geometry stays at full measurement precision. A precision floor was tried and reverted: it would
  // have hidden differences instead of naming them, which is the opposite of what a parity harness is for.
  for (const file of ['src/08_harness/source051-driver.mjs', 'src/08_harness/source051-parity.mjs']) {
    const code = readRepo(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.match(code, /Math\.round\(value \* 1e6\) \/ 1e6/, `${file} keeps full geometry precision`);
  }
});

test('the two conditional exclusions apply only where the named noise can occur', () => {
  const source = readRepo('src/08_harness/source051-parity.mjs');
  // The heart-core rect is only excluded in normal-motion lanes or in the CTA state, because those are
  // the only places that element is animating.
  assert.match(source, /if \(exclusion\.id === 'ANIMATED_HEART_CORE_RECT'\) return normalMotionLane \|\| ctaState;/);
  // The #pulseBtn rect is only excluded in the scroll-extreme states.
  assert.match(source, /if \(exclusion\.id === 'SCROLL_EXTREME_CTA_RECT'\) return scrollExtremeState;/);
  // The authored progress contract those states exist to prove is never excluded.
  assert.ok(!/css_var_scroll|progress_bar_width/.test(PARITY_EXCLUSIONS.map((e) => e.match.source).join(' ')), '--scroll and .progress b width are always compared exactly');
});

test('the parity MODULE is a candidate harness: it still cannot author acceptance metadata', () => {
  // S4 was accepted, but the acceptance was authored from the reviewed artifact under a CENTRAL
  // decision. The candidate capture code must not have gained the ability to self-accept.
  const code = readRepo('src/08_harness/source051-parity.mjs').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/accepted-parity\.json/.test(code), 'the parity module never names an accepted-parity artifact in code');
  assert.ok(!/source_split_parity_pass\s*[:=]\s*true/.test(code), 'source_split_parity_pass is never set true by the harness');
  assert.match(code, /central_visual_review: 'PENDING'/, 'the candidate summary still reports PENDING, not PASS');
  // The accepted record exists, and it follows the SOURCE_SPECIFIC_MOTION_AWARE contract already used
  // by SRC036 and SRC038, because SRC051 also has a continuously animating surface. Screenshot bytes are
  // therefore never claimed equal; the motion-aware policy is the honest statement.
  const accepted = readJson('evidence/parity/accepted-parity.json');
  assert.equal(accepted.status, 'ACCEPTED');
  assert.equal(accepted.parity_contract, 'SOURCE_SPECIFIC_MOTION_AWARE');
  assert.equal(accepted.central_visual_pass, true);
  assert.equal(accepted.candidate_capture_head, '61742068c2a0999ccbfb9b70888916c5bef4cde2');
  assert.equal(accepted.artifact.id, 10957655770);
  assert.equal(accepted.artifact.digest, 'sha256:52737a19098888f6f00799ef305620c68bb191f16ccfe06486a3bf85843e7d1f');
  assert.match(accepted.central_acceptance_ref, /5867690624/);
  assert.equal(accepted.comparisons.screenshots, 'MOTION_AWARE_STATE_PARITY_CENTRAL_VISUAL_ACCEPTED');
  assert.equal(accepted.visual_review.central_direct_artifact_review, true);
  assert.equal(accepted.visual_review.digest_match, true);
  // The acceptance must not imply a pixel-equality pass it never performed.
  for (const key of ['raw_png_equality_used', 'pixel_tolerance_used', 'qa_clock_patch_used', 'qa_raf_patch_used', 'qa_runtime_hook_used']) {
    assert.equal(accepted[key], false, `accepted record does not claim ${key}`);
  }
  assert.equal(accepted.browser_errors, 0);
  assert.equal(accepted.required_network_errors, 0);
  // The four protected runtime blobs are recorded as unchanged in the acceptance itself.
  assert.equal(accepted.protected_runtime_blobs['original/original.html'], 'fd7e48b1301abe0f857e9a7bbc06162c088d0abc');
  assert.equal(accepted.protected_runtime_blobs.unchanged, true);
});


test('the accepted capsule cannot contradict itself: no live field may still describe the old state', () => {
  // CENTRAL's final merge review (#589 comment 5868490513) found the accepted record still carrying
  // three statements that its own fields contradicted. These assertions exist so that a promotion can
  // never again leave the canonical metadata internally inconsistent.
  const manifest = readJson('manifest.json');
  const materialization = readJson('split/materialization.json');
  const accepted = readJson('evidence/parity/accepted-parity.json');

  // 1. scope.s4_parity_claimed must not still say false while parity_pass is true.
  assert.equal(manifest.stages.source_split_parity_pass, true);
  assert.equal(manifest.scope.s4_parity_claimed, true, 'the scope must not deny the parity claim it records');
  assert.notEqual(manifest.scope.s4_parity_claimed, false);
  // Claiming parity is not claiming Product adoption.
  assert.equal(manifest.scope.product_adoption, false, 'parity acceptance does not authorize Product adoption');
  assert.equal(manifest.scope.lineage51_allocated, false, 'parity acceptance does not allocate Lineage51');

  // 2. The reduced-motion description must not still claim the query disables all CSS animation while
  //    D8 records that pseudo-element animations survive. Both facts have to be present together.
  const reduced = manifest.source_contract.reduced_motion_behavior;
  assert.ok(!/^the authored CSS media query disables CSS animation/.test(reduced), 'the over-broad S2 reading is gone');
  assert.match(reduced, /pseudo-element/, 'the surviving pseudo-element animations are stated');
  assert.match(reduced, /hero-orbit::before/, 'the specific affected authored animation is named');
  assert.match(reduced, /radar::after/, 'the second affected authored animation is named');
  assert.match(reduced, /not gated/, 'the JS WAAPI pulse survival is still stated');

  // 3. The CURRENT stage note must not still describe the record as a candidate. The historical
  //    candidate wording is preserved, but explicitly under a superseded key.
  assert.equal(materialization.status, 'ACCEPTED');
  assert.ok(!/this is a CANDIDATE capture/.test(materialization.stage_gate.note), 'the live note no longer calls this a candidate capture');
  assert.ok(!/never sets source_split_parity_pass=true/.test(materialization.stage_gate.note), 'the live note no longer denies the verdict');
  assert.match(materialization.stage_gate.note, /5867690624/, 'the live note cites the accepting CENTRAL decision');
  assert.match(materialization.stage_gate.note, /10957655770/, 'the live note binds the reviewed artifact');
  assert.match(materialization.stage_gate.note, /Product adoption and Lineage51 allocation remain NOT authorized/);
  // The history is preserved rather than deleted, so the S3 hold -> S4 candidate -> accepted path
  // stays auditable.
  assert.equal(typeof materialization.stage_gate.superseded_candidate_stage_note, 'string', 'the candidate-era note is preserved as history');
  assert.match(materialization.stage_gate.superseded_candidate_stage_note, /CANDIDATE capture/, 'the preserved history is the original candidate wording');
  assert.equal(materialization.stage_gate.candidate_stage_invariants, null, 'candidate invariants are not live any more');
  assert.ok(materialization.stage_gate.superseded_candidate_stage_invariants, 'candidate invariants are preserved as history');

  // The acceptance binding is unchanged by this consistency correction.
  assert.equal(accepted.artifact.id, 10957655770);
  assert.equal(accepted.artifact.digest, 'sha256:52737a19098888f6f00799ef305620c68bb191f16ccfe06486a3bf85843e7d1f');
  assert.equal(accepted.candidate_capture_head, '61742068c2a0999ccbfb9b70888916c5bef4cde2');
  assert.equal(accepted.frozen_defects.count_unique, 8, 'D1-D8 are untouched by the metadata correction');
});


test('the S4 route is reached because the gate says RELEASED, and no other Source inherited it', () => {
  const manifest = readJson('manifest.json');
  const materialization = readJson('split/materialization.json');
  assert.equal(manifest.stage_gate.s4_release, 'RELEASED');
  assert.equal(manifest.stage_gate.parity_capture_authorized, true);
  assert.equal(materialization.stage_gate.s4_release, 'RELEASED');
  assert.equal(materialization.stage_gate.parity_capture_authorized, true);
  // S4 evidence is accepted, and the verdict is bound to the reviewed artifact rather than claimed.
  assert.equal(manifest.stages.source_split_parity_pass, true);
  assert.equal(manifest.parity_ref, 'evidence/parity/accepted-parity.json');
  assert.equal(materialization.status, 'ACCEPTED');
  assert.equal(materialization.parity_status, 'PASS');
  assert.equal(materialization.parity_ref, 'evidence/parity/accepted-parity.json');
  // The release cites the CENTRAL decision and preserves the prior holds for the record.
  assert.match(materialization.stage_gate.decision_ref, /5862568703/);
  assert.match(materialization.stage_gate.previous_decision_ref, /5859197749/);
  assert.equal(materialization.stage_gate.central_visual_review, 'PASS');
  assert.equal(materialization.stage_gate.s4_metadata_promotion, 'RELEASED');
  assert.match(manifest.s4_parity_acceptance.ref, /5867690624/);
  assert.equal(manifest.s4_parity_acceptance.artifact_id, 10957655770);
  // This was a bounded, SRC051-only release. No other capsule may claim it.
  for (const id of fs.readdirSync(path.join(repoRoot, 'src', '03_sources')).filter((n) => /^SRC\d{3}$/.test(n))) {
    if (id === 'SRC051') continue;
    const record = path.join(repoRoot, 'src', '03_sources', id, 'split', 'materialization.json');
    if (!fs.existsSync(record)) continue;
    const other = JSON.parse(fs.readFileSync(record, 'utf8'));
    if (other.stage_gate) {
      assert.ok(!/5862568703|5867690624/.test(JSON.stringify(other.stage_gate)), `${id} must not inherit the SRC051-only S4 release or acceptance`);
    }
  }
});

test('the four protected runtime blobs and the frozen defect ledger are untouched by S4', () => {
  // The capsules do not all carry the same authority shape, so each is asserted on the fields it
  // actually holds rather than on a field invented for the test. bytes + sha256 are the authority
  // identity; git_blob is recorded only where the Git lock is stored.
  for (const rel of ['manifest.json', 'split/materialization.json', 'baseline/accepted-baseline.json']) {
    assert.equal(readJson(rel).authority.bytes, 2782365, `${rel} keeps the authority byte count`);
    assert.equal(readJson(rel).authority.sha256, '5b7f084be9de9ca4f5d11044e797c3d2718208a2493d9ccbc9f8b5df07fdf014', `${rel} keeps the authority SHA-256`);
  }
  for (const rel of ['split/materialization.json', 'baseline/accepted-baseline.json']) {
    assert.equal(readJson(rel).authority.git_blob, 'fd7e48b1301abe0f857e9a7bbc06162c088d0abc', `${rel} keeps the locked authority blob`);
  }
  // authority-context.json records Drive provenance under `drive`, not `authority`; it must stay
  // present and still name the single canonical Drive object.
  const context = readJson('authority-context.json');
  assert.equal(context.drive.file_id, '1db5gYJPjTrvKxx_RzY-CAPG2WAg-e2nt', 'authority-context still names the canonical Drive object');
  assert.equal(context.drive.folder_id, 'UNRESOLVED', 'the non-blocking Drive folder id stays UNRESOLVED');
  assert.equal(context.drive.bytes, 2782365, 'authority-context keeps the authority byte count');
  assert.equal(context.drive.sha256, '5b7f084be9de9ca4f5d11044e797c3d2718208a2493d9ccbc9f8b5df07fdf014', 'authority-context keeps the authority SHA-256');
  // Repairing any of the eight would itself be a parity failure, so they must all still be recorded.
  // D8 was added by the S4 acceptance: prefers-reduced-motion does not silence authored CSS
  // animations on pseudo-elements, because the source rule targets `*` and `*` does not match
  // ::before / ::after. CENTRAL #589 comment 5867690624.
  assert.equal(readJson('baseline/accepted-baseline.json').frozen_defect_ledger.count_unique, 8);
  assert.equal(readJson('baseline/accepted-baseline.json').frozen_defect_ledger.items.length, 8);
  const ledgerIds = readJson('baseline/accepted-baseline.json').frozen_defect_ledger.items.map((d) => d.id);
  for (const required of [
    'SRC051_NO_AUTHORED_FOCUS_AFFORDANCE',
    'SRC051_HOVER_ONLY_NO_TOUCH_EQUIVALENT',
    'SRC051_N5_N6_HIDDEN_LE_900',
    'SRC051_TOPBAR_NAV_HIDDEN_LE_900',
    'SRC051_REDUCED_MOTION_DOES_NOT_SILENCE_WAAPI_PULSE',
    'SRC051_REDUCED_MOTION_DOES_NOT_SILENCE_PSEUDO_ELEMENT_CSS_ANIMATIONS',
    'SRC051_LOGO_CLOSE_PAST_DOCUMENT_MAXIMUM',
    'SRC051_SMOOTH_SCROLL_ASYNC_PROGRAMMATIC_SCROLL',
  ]) {
    assert.ok(ledgerIds.includes(required), `frozen defect preserved: ${required}`);
  }
});

test('the parity harness introduces none of the forbidden comparison techniques', () => {
  // Executable code only: the module header names each forbidden technique in order to forbid it.
  const code = readRepo('src/08_harness/source051-parity.mjs').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of [
    'SSIM', 'ssim', 'hamming', 'Hamming', 'pixelTolerance', 'epsilon',
    'Date.now =', 'Math.random =', 'requestAnimationFrame =', 'cancelAnimation', 'finish()',
    'addInitScript',
  ]) {
    assert.ok(!code.includes(forbidden), `the parity harness must not use ${forbidden}`);
  }
  assert.match(code, /waitForScrollArrival/, 'smooth-scroll arrival is waited for');
  assert.match(code, /resting_states/);
});

test('the lane metadata names the accepted viewports, motion and regression role', () => {
  const byLane = Object.fromEntries(SRC051_PARITY_LANES.map((lane) => [lane.lane, lane]));
  assert.deepEqual([byLane['desktop-normal'].width, byLane['desktop-normal'].height, byLane['desktop-normal'].dpr, byLane['desktop-normal'].reducedMotion], [1440, 900, 1, 'no-preference']);
  assert.deepEqual([byLane['desktop-reduced'].width, byLane['desktop-reduced'].height, byLane['desktop-reduced'].dpr, byLane['desktop-reduced'].reducedMotion], [1440, 900, 1, 'reduce']);
  assert.deepEqual([byLane['mobile-390'].width, byLane['mobile-390'].height, byLane['mobile-390'].dpr], [390, 844, 1]);
  assert.deepEqual([byLane['mobile-320'].width, byLane['mobile-320'].height, byLane['mobile-320'].dpr], [320, 720, 1]);
  // Mobile lanes are regression coverage and must never claim authority over the desktop surface.
  assert.equal(byLane['desktop-normal'].role, 'AUTHORITY');
  assert.equal(byLane['desktop-reduced'].role, 'AUTHORITY');
  assert.equal(byLane['mobile-390'].role, 'REGRESSION');
  assert.equal(byLane['mobile-320'].role, 'REGRESSION');
});
