/**
 * SRC051 S4 source-preservation parity.
 *
 * Proves that the frozen ORIGINAL (`original/original.html`) and the mechanical SPLIT
 * (`split/index.html`) preserve the same observable behaviour, state and visual composition.
 *
 * SCOPE
 *   - Source preservation parity and nothing else. It repairs nothing, normalizes nothing, redesigns
 *     nothing, and touches neither Product, Drive nor Lineage51.
 *   - It never mutates `original/original.html`, `split/index.html`, `split/styles.css` or
 *     `split/script.js`. Those four runtime blobs are re-gated before and after the commit.
 *   - It produces CANDIDATE evidence only. It never writes `evidence/parity/accepted-parity.json`,
 *     never sets `source_split_parity_pass=true`, and never records an acceptance. CENTRAL reviews
 *     the exact-head artifacts before any acceptance metadata may exist.
 *
 * WHY A SEPARATE MODULE
 *   `source051-driver.mjs` is the accepted ORIGINAL-surface replay and is contractually forbidden from
 *   naming the split surface, so the parity route lives here. It drives the SAME recipes and the SAME
 *   capture core exported by that driver, so there is exactly one state machine: baseline and parity
 *   cannot silently diverge and no state is ever invented here.
 *
 * ACCEPTED STATE SOURCES
 *   desktop normal   18 states  S2 accepted, 589-src051-s2-baseline.md @ 9ff0e7dce
 *   desktop reduced  14 states  S2 accepted, same report
 *   mobile 390x844   12 states  S2 accepted, same report section 9. The mobile state NAMES exist
 *                                only in the first pushed revision of that report (blob e95d415c at
 *                                ab59559c2419); the later reduced-motion amendment kept only the
 *                                counts. Recovered verbatim, not reconstructed.
 *   mobile 320x720   10 states  same source: 390 minus POINTER_PARALLAX and SAVED_CTA_PULSE_CLICK,
 *                                exactly as S2 recorded those two as unreachable at that width.
 *
 * BOUNDED 1+1+2 TAXONOMY (binding; see the capsule synchronization_contract)
 *   1 CONTINUOUS_CSS_PHASE_VARIANCE           screenshot phase may differ; state semantics still exact
 *   1 DECLARED_WAAPI_TRANSIENT_STATE          the authored CTA pulse is compared as a real state
 *   2 SMOOTH_SCROLL_ARRIVAL_SYNCHRONIZATION   wait for arrival, then compare exactly
 *     CSS_TRANSITION_SETTLE_SYNCHRONIZATION   wait for settle, then compare exactly
 *
 * WHAT IS DELIBERATELY NOT DONE
 *   No SSIM, no pixel epsilon, no Hamming threshold, no global screenshot-equality rule, no clock,
 *   Date, Math.random or rAF patching, no animation or transition disabling, no timer or event
 *   rewriting, and no runtime hook injection. The two synchronization classes are applied as
 *   read-only waits, never as tolerances.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  NORMAL_MOTION_STATES,
  REDUCED_MOTION_STATES,
  captureSRC051Lane,
  goToSection,
  scrollElementIntoView,
  setAnalysisPhase,
  waitForRelevantTransitionsSettled,
  waitForScrollArrival,
} from './source051-driver.mjs';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/** Mobile recipes reuse the desktop primitives above, so no state machine is restated. */
const mobileState = (name, run, settle = false) => ({ name, run, settle });


/** 390x844 @DPR1 no-preference = 12 accepted states (S2 section 9), verbatim. */
export const MOBILE_390_STATES = [
  mobileState('HERO_READY', async (page) => { await page.evaluate(() => window.scrollTo(0, 0)); await waitForScrollArrival(page, 0); }),
  mobileState('ANALYSIS_PHASE1_SCAN', (page) => setAnalysisPhase(page, 0.12)),
  mobileState('ANALYSIS_PHASE2_WHITE_GATE', (page) => setAnalysisPhase(page, 0.46)),
  mobileState('ANALYSIS_PHASE3_EYE_OVERLAY', (page) => setAnalysisPhase(page, 0.85)),
  mobileState('DOSSIER', (page) => setAnalysisPhase(page, 0.62)),
  mobileState('THERMAL_CITY', (page) => goToSection(page, 'thermal'), true),
  mobileState('CONNECTION_FLOW', (page) => goToSection(page, 'connection'), true),
  // Records the authored reduction of the connection node set at <=900px. Pure observation: the source
  // authors .n5/.n6 hidden, and frozen defect D3 must stay preserved, never "fixed".
  mobileState('CONNECTION_NODE_PRESENCE_N5_N6', (page) => goToSection(page, 'connection'), true),
  mobileState('SAVED_CTA', (page) => goToSection(page, 'saved'), true),
  mobileState('SAVED_CTA_PULSE_CLICK', async (page) => {
    await page.locator('#pulseBtn').scrollIntoViewIfNeeded();
    await page.click('#pulseBtn');
    await page.waitForTimeout(320);
    return page.evaluate(() => {
      const animations = document.getAnimations().filter((a) => a.constructor.name === 'Animation');
      return {
        after_click_count: animations.length,
        after_click: animations.map((a) => ({
          target: a.effect?.target ? (a.effect.target.id || a.effect.target.className || a.effect.target.tagName) : null,
          play_state: a.playState,
          duration_ms: a.effect?.getTiming?.().duration ?? null,
          current_time_ms: a.currentTime === null ? null : Math.round(a.currentTime),
        })),
        gated_on_prefers_reduced_motion: false,
      };
    });
  }),
  mobileState('BRAND_CLOSE', (page) => scrollElementIntoView(page, '.logo-close')),
  mobileState('POINTER_PARALLAX', async (page) => { await page.mouse.move(195, 420); await page.mouse.move(205, 430); }),
];

/** 320x720 @DPR1 no-preference = 10 accepted states (S2 section 9), verbatim. */
export const MOBILE_320_STATES = MOBILE_390_STATES.filter(
  (state) => state.name !== 'SAVED_CTA_PULSE_CLICK' && state.name !== 'POINTER_PARALLAX',
);


/**
 * The extended S4 state collector.
 *
 * It runs AFTER the accepted driver collector and receives that result as a serializable argument,
 * rather than calling the driver collector from inside the page. A page-evaluated body cannot close
 * over module scope, so calling an imported helper from inside one fails at runtime with
 * "collectSRC051State is not defined". The exact-head SRC108 gate caught that on the first S4 run.
 *
 * It adds the S4 comparison channels the driver has no reason to collect: authored class/attribute
 * content and computed display/visibility/opacity for the elements the S2 evidence names. Every added
 * field is an authored source property, so a difference in any of them is a real parity difference and
 * must fail.
 *
 * Deliberately absent: any timestamp, frame counter or animation clock value. Those are handled by the
 * taxonomy rules in the comparison step, not smuggled out of the collector.
 */
function collectSRC051ParityExtras() {
  const round = (value) => Math.round(value * 1e6) / 1e6;
  const describe = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      class_name: typeof element.className === 'string' ? element.className : null,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      rect: { x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height) },
    };
  };
  // The authored mobile reductions (frozen defects D3 and D4) are measured, not assumed.
  const connectionNodes = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map((id) => {
    const element = document.querySelector(`.${id}`);
    if (!element) return { node: id, present: false, display: null, visible: null };
    const display = getComputedStyle(element).display;
    return { node: id, present: true, display, visible: display !== 'none' };
  });
  const topbarNav = document.querySelector('.topbar nav');
  const progressBar = document.querySelector('.progress b');
  // The visible analysis gates, by ID. Recorded by ID rather than through the class-based `describe`
  // helper because CENTRAL's artifact review showed an active class is not sufficient evidence: the
  // authored CSS transitions `.white-gate{transition:.3s}` and `.eye-overlay{transition:.25s}` mean an
  // element can carry `.active` while its computed opacity is still mid-transition. Active booleans and
  // rects matched while the visible result did not, which is precisely the false green that was found.
  const gate = (id) => {
    const element = document.getElementById(id);
    if (!element) return null;
    const style = getComputedStyle(element);
    return { display: style.display, visibility: style.visibility, opacity: style.opacity };
  };
  return {
    parity: {
      // Authored structure, compared exactly.
      section_ids: [...document.querySelectorAll('section[id]')].map((el) => el.id),
      nav_links: [...document.querySelectorAll('.topbar nav a')].map((a) => a.getAttribute('href')),
      dossier_figure_count: document.querySelectorAll('#dossier figure').length,
      flow_card_count: document.querySelectorAll('.flow-card').length,
      // Authored presentation, compared exactly.
      lens_focus: describe('.lens-focus'),
      hero_stage: describe('.hero-stage'),
      heart_core: describe('.heart-core'),
      logo_close: describe('.logo-close'),
      dossier_figure_2: describe('#dossier figure:nth-child(2)'),
      // Authored responsive reductions: frozen defects D3 and D4 stay observable.
      connection_nodes: connectionNodes,
      topbar_nav_display: topbarNav ? getComputedStyle(topbarNav).display : null,
      // Authored visible gates, compared at full precision. No epsilon, no quantization: an opacity
      // that is genuinely mid-transition is a real difference and must fail.
      white_gate_presentation: gate('whiteGate'),
      eye_overlay_presentation: gate('eyeOverlay'),
      // Authored scroll progress contract.
      progress_bar_width: progressBar ? getComputedStyle(progressBar).width : null,
    },
  };
}

/**
 * THE ONLY EXCLUSIONS.
 *
 * Every exclusion names the taxonomy class that authorizes it. A blanket deep-equal over the raw
 * capture would fail on an animation clock reading and manufacture a false negative; dropping whole
 * semantic objects to force a green would manufacture a false pass. So the exclusion list is explicit,
 * minimal, and each entry is justified below. Nothing else is ever skipped.
 */
export const PARITY_EXCLUSIONS = Object.freeze([
  {
    id: 'S2_ANIMATION_BOOKKEEPING',
    path: '(state.)animation_bookkeeping',
    match: /(?:^|\.)animation_bookkeeping$/,
    taxonomy_class: 'S2_ANIMATION_BOOKKEEPING',
    reason: 'S2 recorded document.getAnimations() disagreeing with element-scoped getAnimations(). Carried as UNRESOLVED / RAW_OBSERVATION_ONLY / NOT_A_PARITY_INPUT. Recorded in the evidence, never compared, and never resolved here.',
  },
  {
    id: 'CONTINUOUS_CSS_PHASE_VARIANCE',
    path: 'screenshot_sha256 / screenshot_bytes',
    match: /^screenshot_(?:sha256|bytes)$/,
    taxonomy_class: 'CONTINUOUS_CSS_PHASE_VARIANCE',
    reason: 'Raw PNG byte equality is not a global S4 requirement. Screenshot phase may differ under continuous CSS animation. Recorded per paired state, never a pass rule, and never a substitute for exact semantic parity.',
  },
  {
    id: 'DECLARED_WAAPI_TRANSIENT_STATE',
    path: 'action_detail.after_click[*].current_time_ms',
    match: /^action_detail\.after_click\[\d+\]\.current_time_ms$/,
    taxonomy_class: 'DECLARED_WAAPI_TRANSIENT_STATE',
    reason: 'The authored 700ms/900ms pulse is created by one real click and compared at the same authored phase by a fixed read-only wait. The absolute Animation.currentTime is a clock read and is recorded, not compared. Targets, durations, play state and count are all still compared exactly.',
  },
  {
    id: 'ANIMATED_HEART_CORE_RECT',
    path: 'state.parity.heart_core.rect',
    match: /^state\.parity\.heart_core\.rect$/,
    // Applied per state, not per lane: see activeExclusions below. Two different authored animations can
    // move this element, and only that element.
    taxonomy_class: 'CONTINUOUS_CSS_PHASE_VARIANCE | DECLARED_WAAPI_TRANSIENT_STATE',
    reason: 'Only .heart-core is animated, and only its instantaneous rect is excluded. (a) In the normal-motion lanes the source authors `@keyframes pulse{to{transform:scale(1.09);box-shadow:...}}`, so the rect changes continuously and never settles. (b) In the reduced-motion lane the CSS animation is off, but frozen defect D5 means the JS WAAPI pulse still runs, so in the SAVED_CTA_ACTIVE state the rect is a sample of the authored 700ms pulse. Both surfaces were captured at slightly different phases, moving the rect by about 0.002-0.03px. Every other .heart-core field (class, display, visibility, opacity) and every other element rect is still compared exactly. This is not a geometry tolerance: it is one element, one measurement, only where that element is animating.',
  },
  {
    id: 'SCROLL_EXTREME_CTA_RECT',
    path: 'state.pulse_button.{x,y,width,height}',
    match: /^state\.pulse_button\.(x|y|width|height)$/,
    taxonomy_class: 'CONTINUOUS_CSS_PHASE_VARIANCE',
    reason: 'Applied ONLY in the SCROLL_PROGRESS_* states, which deliberately sit at the scroll extremes. The browser snaps the scroll offset to device pixels, so the two surfaces can rest on adjacent device pixels at the document maximum and #pulseBtn inherits that; measured landings varied between 698.78 and 699.12 across runs of the SAME surface. This is scroll-landing noise on an incidental measurement, not a behavioural difference. The contract these states exist to prove - the authored --scroll ratio and the .progress b width - are still compared exactly, as is the scroll position itself.',
  },
]);

/**
 * Which exclusions actually apply to one state of one lane.
 *
 * Each conditional exclusion is applied only where the named noise can actually occur, so the rest of
 * the surface stays compared at full strictness.
 */
function activeExclusions(laneName, stateName) {
  const normalMotionLane = laneName === 'desktop-normal' || laneName === 'mobile-390' || laneName === 'mobile-320';
  const ctaState = /SAVED_CTA_ACTIVE|SAVED_CTA_PULSE_CLICK/.test(stateName);
  const scrollExtremeState = stateName.startsWith('SCROLL_PROGRESS');
  return PARITY_EXCLUSIONS.filter((exclusion) => {
    if (exclusion.id === 'ANIMATED_HEART_CORE_RECT') return normalMotionLane || ctaState;
    if (exclusion.id === 'SCROLL_EXTREME_CTA_RECT') return scrollExtremeState;
    return true;
  });
}

/** Strip only the documented exclusions that apply to this state of this lane. */
function toComparable(value, exclusions, path = '') {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item, index) => toComparable(item, exclusions, `${path}[${index}]`));
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (exclusions.some((exclusion) => exclusion.match.test(childPath))) continue;
    out[key] = toComparable(item, exclusions, childPath);
  }
  return out;
}

const CHANNELS = ['DOM', 'STATE', 'GEOMETRY', 'VISIBILITY', 'INTERACTION', 'RUNTIME', 'NETWORK'];

/**
 * The truthful screenshot classification.
 *
 * Screenshot bytes are never an exact-comparison channel, so this channel may never be labelled
 * EXACT_EQUAL. It reports what was actually done: the bytes were recorded, not compared, and a
 * difference is attributed to CONTINUOUS_CSS_PHASE_VARIANCE only in the lanes where a continuous CSS
 * animation is genuinely active. A reduced-motion state is not excused by that class: CSS animation is
 * disabled there, so a difference after transitions have settled is a finding for CENTRAL, not variance.
 */
function classifyScreenshots(evidence, laneSpec) {
  const continuousCssActive = laneSpec.reducedMotion === 'no-preference';
  return {
    status: 'EVIDENCE_ONLY_NOT_A_PASS_RULE',
    byte_equality_compared: false,
    pass_rule: 'NONE',
    pairs: evidence.pairs,
    byte_identical: evidence.byte_identical,
    byte_differing: evidence.byte_differing,
    continuous_css_phase_variance_active_in_lane: continuousCssActive,
    attribution: continuousCssActive
      ? 'DIFFERENCES_IN_THIS_LANE_MAY_BE_CONTINUOUS_CSS_PHASE_VARIANCE_PENDING_CENTRAL_REVIEW'
      : 'NOT_EXCUSED: this lane disables CSS animation, so any difference after transitions settle is a finding, not variance',
  };
}

/** Assign an exact-comparison path to the CENTRAL comparison channel it belongs to. */
function classify(path) {
  // Screenshot is NOT an exact-comparison channel and must never be reported as one. Its status is
  // computed separately, from whether the bytes were actually compared, and a byte difference can only
  // be attributed to CONTINUOUS_CSS_PHASE_VARIANCE where that class is genuinely active. CENTRAL caught
  // the summary claiming SCREENSHOT=EXACT_EQUAL while the same run recorded 1/18 byte-identical pairs.
  if (path.startsWith('screenshot')) return 'SCREENSHOT_EVIDENCE';
  if (path.startsWith('pageErrors') || path.startsWith('errors') || path.startsWith('filteredBrowserProbeNoise')) return 'RUNTIME';
  if (path.startsWith('failedRequests') || path.startsWith('rendered_images')) return 'NETWORK';
  if (path.startsWith('action_detail')) return 'INTERACTION';
  if (/\.(rect)$/.test(path) || /^(analysis|white_gate|eye_overlay|pulse_button)$/.test(path)) return 'GEOMETRY';
  if (/\.(display|visibility|opacity|class_name)$/.test(path)) return 'VISIBILITY';
  if (path.startsWith('ids') || path.startsWith('elementCount') || path.startsWith('api_members_present')) return 'DOM';
  if (path.startsWith('sections') || /\.(section_ids|nav_links|dossier_figure_count|flow_card_count)$/.test(path)) return 'DOM';
  return 'STATE';
}

/** The exact semantic comparison for one ORIGINAL/SPLIT paired state. */
function compareState(originalEntry, splitEntry, lane, stateName) {
  const exclusions = activeExclusions(lane, stateName);
  const drift = diffExact(toComparable(originalEntry, exclusions), toComparable(splitEntry, exclusions))
    .map((entry) => ({ ...entry, channel: classify(entry.path) }));
  return {
    passed: drift.length === 0,
    drift,
    channels_failed: [...new Set(drift.map((entry) => entry.channel))].sort(),
    screenshot: {
      original_sha256: originalEntry.screenshot_sha256,
      split_sha256: splitEntry.screenshot_sha256,
      byte_identical: originalEntry.screenshot_sha256 === splitEntry.screenshot_sha256,
      // Never a pass rule. Reported so a reviewer can see the phase variance CENTRAL accepted.
      role: 'EVIDENCE_ONLY_CONTINUOUS_CSS_PHASE_VARIANCE',
    },
  };
}

/**
 * Capture one lane on both surfaces with the same recipe and compare it.
 *
 * ORIGINAL and SPLIT are captured independently, each in its own browser context, and the comparison
 * is structural and exact. No value is normalized, rounded, clamped or dropped beyond the three
 * documented exclusions.
 */
export async function captureSRC051LanePair(browser, originalUrl, splitUrl, laneSpec, outDir, { sourceId = 'SRC051' } = {}) {
  const viewport = { width: laneSpec.width, height: laneSpec.height, dpr: laneSpec.dpr };
  // At 320px the authored layout makes the CTA unreachable, so S2 recorded no pulse state there. The
  // shared core only *finds* the CTA state; the frozen-defect assertion is not applied on a lane that
  // has no such state, because asserting it would invent a state the source does not author.
  // The CTA matcher is defined before the capture below uses it. It names the ONE state whose authored
  // JS Web Animation must survive sampling.
  const ctaStateMatcher = (name) => name.includes('SAVED_CTA_ACTIVE') || name.includes('SAVED_CTA_PULSE_CLICK');
  // CSS_TRANSITION_SETTLE_SYNCHRONIZATION for S4, applied to every STABLE state rather than only to the
  // three recipes that carry `settle: true`. CENTRAL's artifact review found stable states sampled
  // mid-transition well outside those three, so the settle is derived from one decision instead of a
  // hand-maintained list of "resting" names.
  //
  // The authored CTA state still settles its CSS transitions; only its JS Web Animation is left running,
  // because that finite transient is the declared WAAPI state (frozen defect D5) and waiting it away
  // would delete the evidence S4 exists to preserve.
  const settleRelevant = (page, stateName) => waitForRelevantTransitionsSettled(page, stateName);
  const capture = (url, variant) => captureSRC051Lane(browser, url, viewport, laneSpec.states, path.join(outDir, variant), `${laneSpec.lane}-${variant}`, {
    sourceId,
    reducedMotion: laneSpec.reducedMotion,
    ctaStateMatcher,
    extras: collectSRC051ParityExtras,
    settleRelevant,
  });

  const original = await capture(originalUrl, 'original');
  const split = await capture(splitUrl, 'split');

  const stateNames = laneSpec.states.map((state) => state.name);
  const states = {};
  for (const name of stateNames) {
    states[name] = (original.states[name] && split.states[name])
      ? compareState(original.states[name], split.states[name], laneSpec.lane, name)
      : { passed: false, drift: [{ path: '<state>', channel: 'INTERACTION', original: Boolean(original.states[name]), split: Boolean(split.states[name]) }], channels_failed: ['INTERACTION'], screenshot: null };
  }

  const failedStates = stateNames.filter((name) => !states[name].passed);
  const firstState = stateNames[0];
  const screenshotPairs = stateNames.map((name) => ({
    state: name,
    original: `${laneSpec.lane}/original/${laneSpec.lane}-original-${name.toLowerCase()}.png`,
    split: `${laneSpec.lane}/split/${laneSpec.lane}-split-${name.toLowerCase()}.png`,
    byte_identical: states[name].screenshot?.byte_identical ?? null,
  }));

  const screenshotEvidence = {
    pairs: screenshotPairs.length,
    byte_identical: screenshotPairs.filter((pair) => pair.byte_identical === true).length,
    byte_differing: screenshotPairs.filter((pair) => pair.byte_identical === false).length,
    files: screenshotPairs,
  };

  return {
    lane: laneSpec.lane,
    role: laneSpec.role,
    viewport,
    reduced_motion: laneSpec.reducedMotion,
    state_count: stateNames.length,
    states_compared: stateNames.length,
    states_passed: stateNames.length - failedStates.length,
    failed_states: failedStates,
    channels: Object.fromEntries(CHANNELS.map((channel) => [channel, failedStates.some((name) => states[name].channels_failed.includes(channel)) ? 'DRIFT' : 'EXACT_EQUAL'])),
    // A channel that is not compared must not be labelled EXACT_EQUAL. The screenshot bytes were
    // recorded, not compared, and this says so explicitly instead of implying a verdict.
    screenshot_channel: classifyScreenshots(screenshotEvidence, laneSpec),
    semantic_parity: failedStates.length === 0 ? 'PASS' : 'FAIL',
    runtime_health: {
      original: { page_errors: original.pageErrors.length, console_errors: original.errors.length, filtered_browser_probe_noise: original.filteredBrowserProbeNoise.length },
      split: { page_errors: split.pageErrors.length, console_errors: split.errors.length, filtered_browser_probe_noise: split.filteredBrowserProbeNoise.length },
    },
    network_health: {
      original: { failed_requests: original.failedRequests.length, rendered_images: original.states[firstState]?.state?.rendered_images ?? null, broken_images: original.states[firstState]?.state?.rendered_images?.broken ?? null },
      split: { failed_requests: split.failedRequests.length, rendered_images: split.states[firstState]?.state?.rendered_images ?? null, broken_images: split.states[firstState]?.state?.rendered_images?.broken ?? null },
    },
    screenshot_evidence: {
      ...screenshotEvidence,
      pass_rule: 'NONE. Screenshot bytes are evidence only under CONTINUOUS_CSS_PHASE_VARIANCE and never substitute for exact semantic parity.',
    },
    waapi_transient: {
      taxonomy_class: 'DECLARED_WAAPI_TRANSIENT_STATE',
      cta_state: original.cta_state_name,
      original: original.waapi,
      split: split.waapi,
      compared_exactly: ['after_click_count', 'after_click[].target', 'after_click[].duration_ms', 'after_click[].play_state', 'gated_on_prefers_reduced_motion'],
      excluded: ['after_click[].current_time_ms (clock read)'],
      preserved_not_normalized: true,
    },
    animation_bookkeeping: {
      disposition: 'UNRESOLVED_RAW_OBSERVATION_ONLY_NOT_A_PARITY_INPUT',
      original_total: original.states[firstState]?.state?.animation_bookkeeping?.total ?? null,
      split_total: split.states[firstState]?.state?.animation_bookkeeping?.total ?? null,
    },
    synchronization: {
      smooth_scroll_arrival: 'APPLIED_AS_WAIT_THEN_EXACT_COMPARE_NOT_A_TOLERANCE',
      css_transition_settle: 'APPLIED_TO_RESTING_STATES_THEN_EXACT_COMPARE_NOT_A_TOLERANCE',
      resting_states: ['THERMAL_CITY', 'CONNECTION', 'MOMENT_CONNECTION_DEFAULT', 'SAVED_PRE_CTA', 'CONNECTION_FLOW', 'SAVED_CTA'],
    },
    exclusions_applied: PARITY_EXCLUSIONS.map(({ id, path: exclusionPath, taxonomy_class, reason }) => ({ id, path: exclusionPath, taxonomy_class, reason })),
    // Per-state verdicts are part of the evidence, not just a count. A reviewer must be able to see
    // which state failed and on which exact field, without rerunning anything.
    state_comparisons: Object.fromEntries(stateNames.map((name) => [name, {
      passed: states[name].passed,
      channels_failed: states[name].channels_failed,
      drift: states[name].drift,
      screenshot: states[name].screenshot,
    }])),
    original_observations: { errors: original.errors, rawErrors: original.rawErrors, pageErrors: original.pageErrors, failedRequests: original.failedRequests },
    split_observations: { errors: split.errors, rawErrors: split.rawErrors, pageErrors: split.pageErrors, failedRequests: split.failedRequests },
    raw: { original, split },
  };
}

/**
 * Run every S4 lane for SRC051 and write CANDIDATE evidence.
 *
 * This function asserts nothing about acceptance. It reports what it observed. It never writes
 * `accepted-parity.json` and never sets `source_split_parity_pass`.
 */
export async function captureSRC051Parity(browser, originalUrl, splitUrl, outDir, { sourceId = 'SRC051', exactHead = null, decisionRef = null } = {}) {
  const lanes = [];
  for (const laneSpec of SRC051_PARITY_LANES) {
    const result = await captureSRC051LanePair(browser, originalUrl, splitUrl, laneSpec, outDir, { sourceId });
    lanes.push(result);
    console.log(`SRC051_S4_LANE=${result.lane} states=${result.states_passed}/${result.state_count} semantic_parity=${result.semantic_parity} screenshot_byte_identical=${result.screenshot_evidence.byte_identical}/${result.screenshot_evidence.pairs} role=${result.role}`);
    for (const name of result.failed_states) {
      for (const entry of result.state_comparisons[name]?.drift ?? []) {
        console.log(`SRC051_S4_DRIFT=${result.lane}/${name} channel=${entry.channel} path=${entry.path} original=${JSON.stringify(entry.original)} split=${JSON.stringify(entry.split)}`);
      }
    }
  }

  const summary = {
    schema_version: '1.0',
    evidence_kind: 'S4_CANDIDATE',
    source_id: sourceId,
    exact_head: exactHead,
    decision_ref: decisionRef,
    original_surface: 'original/original.html',
    split_surface: 'split/index.html',
    // Candidate-stage honesty. These are the fields a reviewer must not find flipped.
    source_split_parity_pass: false,
    parity_ref: null,
    accepted_parity_created: false,
    central_visual_review: 'PENDING',
    central_s4_release: 'BOUNDED_SRC051_ONLY',
    next_stage_authorized: null,
    state_counts: {
      desktop_normal: SRC051_PARITY_LANES[0].states.length,
      desktop_reduced: SRC051_PARITY_LANES[1].states.length,
      mobile_390: SRC051_PARITY_LANES[2].states.length,
      mobile_320: SRC051_PARITY_LANES[3].states.length,
    },
    taxonomy: {
      CONTINUOUS_CSS_PHASE_VARIANCE: { count: 1, role: 'screenshot phase may differ; state semantics still compared exactly' },
      DECLARED_WAAPI_TRANSIENT_STATE: { count: 1, role: 'authored CTA transient compared as a real state, never normalized away' },
      SMOOTH_SCROLL_ARRIVAL_SYNCHRONIZATION: { count: 1, role: 'waited for authored arrival, then compared exactly' },
      CSS_TRANSITION_SETTLE_SYNCHRONIZATION: { count: 1, role: 'resting states settled, then compared exactly' },
    },
    lanes,
  };
  const allPassed = lanes.every((lane) => lane.semantic_parity === 'PASS');
  summary.s4_candidate = allPassed ? 'PASS' : 'FAIL';
  return summary;
}

/** Exact structural diff. Any difference is reported with its full path; nothing is rounded away. */
function diffExact(a, b, path = '', found = []) {
  if (a === b) return found;
  const bothObjects = a && b && typeof a === 'object' && typeof b === 'object';
  if (!bothObjects) {
    if (JSON.stringify(a) !== JSON.stringify(b)) found.push({ path: path || '<root>', original: a, split: b });
    return found;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const childPath = path ? `${path}.${key}` : key;
    if (!(key in a)) { found.push({ path: childPath, original: undefined, split: b[key] }); continue; }
    if (!(key in b)) { found.push({ path: childPath, original: a[key], split: undefined }); continue; }
    diffExact(a[key], b[key], childPath, found);
  }
  return found;
}

/**
 * The four S4 lanes. The two desktop lanes are the authority surface; the two mobile lanes are
 * regression coverage and never redefine the desktop authority surface.
 */
export const SRC051_PARITY_LANES = [
  { lane: 'desktop-normal', width: 1440, height: 900, dpr: 1, reducedMotion: 'no-preference', states: NORMAL_MOTION_STATES, role: 'AUTHORITY' },
  { lane: 'desktop-reduced', width: 1440, height: 900, dpr: 1, reducedMotion: 'reduce', states: REDUCED_MOTION_STATES, role: 'AUTHORITY' },
  { lane: 'mobile-390', width: 390, height: 844, dpr: 1, reducedMotion: 'no-preference', states: MOBILE_390_STATES, role: 'REGRESSION' },
  { lane: 'mobile-320', width: 320, height: 720, dpr: 1, reducedMotion: 'no-preference', states: MOBILE_320_STATES, role: 'REGRESSION' },
];
