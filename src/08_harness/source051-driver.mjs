/**
 * SRC051 baseline replay driver ??ORIGINAL SURFACE ONLY.
 *
 * SRC051 exposes `window.__LT_PROMO`, not the legacy `window.__lt` / `window.__lovetreeStats`
 * contract, so the generic baseline harness times out waiting for a hook this Source does not
 * implement. This driver replays the S2-ACCEPTED authority states instead of inventing new ones.
 *
 * SCOPE ??this is original baseline replay and nothing else:
 *   - captures `original/original.html` only, never `split/`;
 *   - performs NO original-vs-split comparison and produces no parity verdict;
 *   - creates no evidence/parity artifact and no accepted parity metadata.
 *   S4 is held by CENTRAL for SRC051 (#589 comment 5859197749, 5860509930).
 *
 * ACCEPTED CONTRACT SOURCE
 *   S2 report: skerishKang/workdiary @ 9ff0e7dcedce8582023e88def4ded76d31d5d16d
 *              lovetree-reports/2026-09-27/LOCAL1/589-src051-s2-baseline.md
 *   1440x900 @ DPR1, no-preference  -> 18 accepted states
 *   1440x900 @ DPR1, reduce         -> 14 accepted states
 *
 * SYNCHRONIZATION (read from the accepted S2 taxonomy, applied as harness waiting only)
 *   - The source authors `scroll-behavior:smooth`, so `window.scrollTo` returns before the
 *     viewport arrives. SMOOTH_SCROLL_ARRIVAL_SYNCHRONIZATION: wait for arrival, then read.
 *     Geometry is never sampled mid-flight.
 *   - THERMAL_CITY, CONNECTION and SAVED_PRE_CTA are resting states.
 *     CSS_TRANSITION_SETTLE_SYNCHRONIZATION: wait for the relevant CSSTransition objects to finish
 *     before recording, so a mid-flight transition is never captured as the resting state.
 *
 * WHAT IS DELIBERATELY NOT DONE
 *   - The click-created Web Animations pulse (.heart-core 700 ms, .logo-close 900 ms) is preserved
 *     and measured, never disabled, normalized or fast-forwarded. It is created by one real
 *     #pulseBtn click.
 *   - The S2 animation-bookkeeping anomaly (document.getAnimations() vs element.getAnimations())
 *     is carried as UNRESOLVED. This driver records the raw observation and derives no conclusion
 *     from it, and never uses it as a parity input.
 *   - No clock, Date, random or rAF patching. No animation or transition disabling.
 */

import crypto from 'node:crypto';
import path from 'node:path';

const SHA256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const SMOOTH_SCROLL_SETTLE_TIMEOUT_MS = 15000;
const CSS_TRANSITION_SETTLE_TIMEOUT_MS = 15000;

export function collectSRC051State() {
  // page.evaluate bodies run in the browser and cannot close over module-scope helpers. The first
  // draft called a module-level round6() and a module-level collectAnimationBookkeeping(); both
  // failed at runtime with "is not defined" inside the page. Everything the page needs is
  // therefore defined inside this one serialized function.
  //
  // Full precision is kept deliberately. Two sources of sub-pixel movement were identified and are
  // handled where they belong, by a named exclusion in the parity comparison, not by quietly
  // quantising the measurement here: an element under a continuous animation, and rects derived from a
  // scroll offset the browser snaps to device pixels. Loosening this rounding would have hidden real
  // differences instead of naming them.
  const round = (value) => Math.round(value * 1e6) / 1e6;
  const WAAPI_CLASS = 'Animation';
  // Raw observation only. CSSAnimation / CSSTransition / JS Web Animations are three distinct
  // classes and are reported separately; a CSS transition is not a JS Web Animation.
  const collectAnimationBookkeeping = () => {
    const all = document.getAnimations();
    const describe = (list) => list.map((animation) => ({
      target: animation.effect?.target
        ? (animation.effect.target.id || (typeof animation.effect.target.className === 'string' ? animation.effect.target.className : '') || animation.effect.target.tagName)
        : null,
      play_state: animation.playState,
      current_time_ms: animation.currentTime === null ? null : Math.round(animation.currentTime),
    }));
    return {
      UNRESOLVED: true,
      disposition: 'RAW_OBSERVATION_ONLY',
      note: 'S2 recorded an internal inconsistency here: document.getAnimations() reported CSSAnimation objects against .hero-orbit/.radar whose currentTime advanced, while getComputedStyle(...).animationName was "none" and element-scoped getAnimations() returned []. This driver records the raw numbers and asserts no conclusion, and never uses them as a parity input. Do not resolve this without a separate CENTRAL proof.',
      total: all.length,
      css_keyframe_animations: describe(all.filter((a) => a.constructor.name === 'CSSAnimation')),
      css_transitions: describe(all.filter((a) => a.constructor.name === 'CSSTransition')),
      js_web_animations: describe(all.filter((a) => a.constructor.name === WAAPI_CLASS)),
    };
  };
  const api = window.__LT_PROMO;
  const root = document.documentElement;
  const rect = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height) };
  };
  return {
    ids: [...document.querySelectorAll('[id]')].map((el) => el.id),
    elementCount: document.querySelectorAll('*').length,
    api_members_present: {
      sections: Array.isArray(api?.sections),
      scrollToSection: typeof api?.scrollToSection === 'function',
      setProgress: typeof api?.setProgress === 'function',
      update: typeof api?.update === 'function',
    },
    sections: api?.sections ?? null,
    scroll: { x: Math.round(window.scrollX), y: Math.round(window.scrollY) },
    scroll_max: document.documentElement.scrollHeight - window.innerHeight,
    horizontal_overflow_px: root.scrollWidth - root.clientWidth,
    css_var_scroll: root.style.getPropertyValue('--scroll'),
    gates: {
      white_gate_active: document.getElementById('whiteGate')?.classList.contains('active') === true,
      eye_overlay_active: document.getElementById('eyeOverlay')?.classList.contains('active') === true,
      active_network_node: (document.querySelector('.node.active') || {}).className || null,
    },
    analysis: rect('#analysis'),
    white_gate: rect('#whiteGate'),
    eye_overlay: rect('#eyeOverlay'),
    pulse_button: rect('#pulseBtn'),
    rendered_images: {
      element_count: document.images.length,
      broken: Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0).length,
    },
    animation_bookkeeping: collectAnimationBookkeeping(),
  };
}


/**
 * SMOOTH_SCROLL_ARRIVAL_SYNCHRONIZATION.
 * The source authors scroll-behavior:smooth, so scrollTo returns immediately and geometry read
 * right after a call is stale. Wait until the viewport has actually stopped moving before any
 * geometry is sampled. This is synchronization, not a tolerance, and not a source change.
 */
export async function waitForScrollArrival(page, targetY) {
  // SMOOTH_SCROLL_ARRIVAL_SYNCHRONIZATION, and this is the part that matters.
  //
  // The previous form accepted "two consecutive equal samples" as arrival. A smooth scroll has not
  // necessarily STARTED when the first two samples are taken, so that test could return while scrollY
  // was still at its old value and the scroll had not begun; the parity run then read stale geometry on
  // one surface and not the other. Two equal samples is simply too weak an arrival signal.
  //
  // Arrival is therefore the target being met, with a stability fallback that requires the value to hold
  // for several consecutive polls. The fallback must stay reachable even when the page never moves at
  // all: frozen defect D6 means .logo-close lies past the document scroll maximum, so its target can
  // never be reached and the scroll clamps immediately. Requiring observed motion before the fallback
  // would have deadlocked exactly there.
  const STABLE_SAMPLES_REQUIRED = 6;
  // Arrival is judged on the FRACTIONAL scroll position, not Math.round(window.scrollY). Rounding hid
  // sub-pixel differences: both surfaces could report the same integer scrollY while actually resting
  // up to half a pixel apart, and every fractional rect then differed. The captured state rounds
  // scroll.y for readability, so the synchronization has to be the stricter of the two.
  const ARRIVAL_EPSILON_PX = 0.01;
  await page.waitForFunction((args) => {
    const y = window.scrollY;
    if (Math.abs(y - args.target) <= args.epsilon) return true;
    const previous = window.__SRC051_SCROLL_SAMPLE__;
    window.__SRC051_SCROLL_SAMPLE__ = y;
    if (previous === undefined) {
      window.__SRC051_SCROLL_STEADY__ = 0;
      return false;
    }
    if (Math.abs(previous - y) < 0.01) {
      window.__SRC051_SCROLL_STEADY__ = (window.__SRC051_SCROLL_STEADY__ ?? 0) + 1;
      return window.__SRC051_SCROLL_STEADY__ >= args.stableRequired;
    }
    // Genuine movement resets the counter: a scroll still in flight is not a settled viewport.
    window.__SRC051_SCROLL_STEADY__ = 0;
    return false;
  }, { target: targetY, stableRequired: STABLE_SAMPLES_REQUIRED, epsilon: ARRIVAL_EPSILON_PX }, { timeout: SMOOTH_SCROLL_SETTLE_TIMEOUT_MS, polling: 50 });
  await page.evaluate(() => {
    delete window.__SRC051_SCROLL_SAMPLE__;
    delete window.__SRC051_SCROLL_STEADY__;
  });
  // The source writes --scroll from a rAF-throttled scroll handler, so a settled viewport can still
  // carry a stale authored progress value for a frame or two. Under reduced motion the source's own
  // query forces scroll-behavior:auto, so the position is already final while --scroll is not. CENTRAL
  // requires the source-authored progress state "after synchronization", so wait for it to hold steady
  // before anything samples it. Read-only: the source is never patched and the wait is not a tolerance.
  await page.waitForFunction(() => {
    const current = document.documentElement.style.getPropertyValue('--scroll');
    const previous = window.__SRC051_PROGRESS_SAMPLE__;
    window.__SRC051_PROGRESS_SAMPLE__ = current;
    if (previous === undefined) return false;
    return previous === current;
  }, null, { timeout: 5000, polling: 50 });
  await page.evaluate(() => { delete window.__SRC051_PROGRESS_SAMPLE__; });
}

/**
 * CSS_TRANSITION_SETTLE_SYNCHRONIZATION.
 * For states intended to be resting, wait until no CSSTransition is still running, then record.
 * Added by CENTRAL (#589 comment 5859197749) after S2 observed 11/14 repeat-state identity:
 * THERMAL_CITY, CONNECTION and SAVED_PRE_CTA had a transition mid-flight in one run and settled
 * in the other. Synchronization only ??the source's transitions are never disabled.
 */
export async function waitForTransitionsSettled(page) {
  await page.waitForFunction(() => document.getAnimations()
    .filter((a) => a.constructor.name === 'CSSTransition')
    .every((a) => a.playState !== 'running'), null, { timeout: CSS_TRANSITION_SETTLE_TIMEOUT_MS, polling: 50 });
}

/**
 * The S4 form of CSS_TRANSITION_SETTLE_SYNCHRONIZATION, and the one that matters for parity.
 *
 * A wait that can silently time out is not synchronization. CENTRAL reviewed the exact-head artifact
 * and found stable states sampled mid-transition: at RM_ANALYSIS_PHASE3_EYE_OVERLAY the ORIGINAL sat
 * at 33ms of an authored `.white-gate{transition:.3s}` and the SPLIT at a different point, with
 * computed #whiteGate opacity 0.112756 on one side and 0 on the other - a real visible difference that
 * the old collector never recorded and the old wait never guaranteed.
 *
 * So: wait for every CSSTransition to finish, then PROVE it by re-reading, and throw if anything is
 * still running. A state that cannot prove its transitions settled fails loudly instead of producing a
 * green result from an unfinished frame.
 *
 * JavaScript Web Animations are deliberately NOT waited on. The authored CTA pulse is a finite transient
 * that must be observed as a real state (frozen defect D5), and waiting it away would delete the very
 * evidence S4 has to preserve.
 */
export async function waitForRelevantTransitionsSettled(page, stateName) {
  const readTransitions = () => page.evaluate(() => document.getAnimations()
    .filter((a) => a.constructor.name === 'CSSTransition')
    .map((a) => ({
      target: a.effect?.target ? (a.effect.target.id || a.effect.target.className || a.effect.target.tagName) : null,
      play_state: a.playState,
      current_time_ms: a.currentTime === null ? null : Math.round(a.currentTime),
    })));
  let last = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // Swallow the wait's own timeout, then verify independently. Trusting the wait is what produced the
    // false green; re-reading is what makes this a synchronization rather than a hope.
    await page.waitForFunction(() => document.getAnimations()
      .filter((a) => a.constructor.name === 'CSSTransition')
      .every((a) => a.playState !== 'running'), null, { timeout: CSS_TRANSITION_SETTLE_TIMEOUT_MS, polling: 50 })
      .catch(() => {});
    last = await readTransitions();
    if (last.every((transition) => transition.play_state !== 'running')) {
      return { settled: true, attempts: attempt + 1, css_transitions_at_capture: last };
    }
  }
  throw new Error(`SRC051 ${stateName}: CSS_TRANSITION_SETTLE_SYNCHRONIZATION did not settle - ${JSON.stringify(last)}`);
}

/** Drive the source's own section-local phase formula; never a document-scroll shortcut. */
export async function setAnalysisPhase(page, targetP) {
  const targetY = await page.evaluate((p) => {
    const analysis = document.getElementById('analysis');
    const top = analysis.getBoundingClientRect().top + window.scrollY;
    return Math.round(top + p * Math.max(1, analysis.getBoundingClientRect().height - window.innerHeight));
  }, targetP);
  await page.evaluate((y) => window.scrollTo(0, y), targetY);
  await waitForScrollArrival(page, targetY);
  return page.evaluate(() => {
    window.__LT_PROMO.update();
    const analysis = document.getElementById('analysis');
    const box = analysis.getBoundingClientRect();
    const span = Math.max(1, box.height - window.innerHeight);
    return {
      p: Math.round(Math.max(0, Math.min(1, -box.top / span)) * 1e6) / 1e6,
      scroll_y: Math.round(window.scrollY),
      scan_y: document.getElementById('scanFrame')?.style.getPropertyValue('--scanY') ?? null,
      white_gate_active: document.getElementById('whiteGate')?.classList.contains('active') === true,
      eye_overlay_active: document.getElementById('eyeOverlay')?.classList.contains('active') === true,
    };
  });
}

export async function goToSection(page, id) {
  const targetY = await page.evaluate((sectionId) => Math.round(
    document.getElementById(sectionId).getBoundingClientRect().top + window.scrollY,
  ), id);
  await page.evaluate((sectionId) => window.__LT_PROMO.scrollToSection(sectionId), id);
  await waitForScrollArrival(page, targetY);
  return Math.round(await page.evaluate(() => window.scrollY));
}

export async function captureState(page, sourceOut, label, stateName, { settleTransitions = false, collect = collectSRC051State, extras = null, settleRelevant = null } = {}) {
  if (settleRelevant) await settleRelevant(page, stateName);
  else if (settleTransitions) await waitForTransitionsSettled(page);
  const base = await page.evaluate(collect);
  // A page-evaluated body cannot close over module scope, so an extras collector receives the base
  // state as a serializable argument instead of calling the base collector itself. Doing the latter
  // fails at runtime with "collectSRC051State is not defined" inside the browser.
  const state = extras ? { ...base, ...(await page.evaluate(extras, base)) } : base;
  const png = await page.screenshot({ path: path.join(sourceOut, `${label}-${stateName.toLowerCase()}.png`) });
  return {
    state,
    screenshot_sha256: SHA256(png),
    screenshot_bytes: png.length,
    css_transition_settle_applied: settleTransitions,
  };
}

/**
 * The 18 S2-accepted normal-motion authority states, in replay order.
 *
 * S2 ACCEPTED SET IS CANONICAL (skerishKang/workdiary 589-src051-s2-baseline.md, state table 1..18,
 * at 9ff0e7dcedce8582023e88def4ded76d31d5d16d, accepted at #589 comment 5859197749). This table is
 * corrected to that set; CENTRAL required the correspondence to be explicit rather than a second
 * hand-maintained recipe. Three corrections were needed, all recorded in the S4 report:
 *
 *   1. HERO_FACE_LENS_ORBIT_HOVER was MISSING here and is now replayed as the S2 state 3 recipe: a real
 *      CSS :hover on `#hero .hero-stage`, which is the source's own
 *      `.hero-stage:hover .lens-focus` rule (opacity 1, matrix(1.08,...)).
 *   2. SCROLL_PROGRESS_SETPROGRESS_API is NOT an S2 accepted state and was removed. The three accepted
 *      SCROLL_PROGRESS_* states already drive the source's own setProgress(0 / 0.5 / 1), so the
 *      setProgress API stays covered without inventing a 19th state.
 *   3. DOSSIER_HOVER targeted `#dossier figure` first(), but S2 state 8 is `:hover` on
 *      `#dossier figure:nth-child(2)`. CONNECTION_NODE_HOVER targeted `.node` first(), but S2 state 11
 *      is a real hover on `.n5`, the source's own mouseenter promotion. Both now use the S2 selector.
 *
 * No state is invented: the count stays exactly the accepted 18.
 */
export const NORMAL_MOTION_STATES = [
  { name: 'HERO_INITIAL', run: async (page) => { await page.evaluate(() => window.scrollTo(0, 0)); await waitForScrollArrival(page, 0); } },
  { name: 'HERO_POINTER_PARALLAX', run: async (page) => { await page.mouse.move(430, 330); await page.mouse.move(455, 355); } },
  { name: 'HERO_FACE_LENS_ORBIT_HOVER', run: async (page) => { await page.locator('#hero .hero-stage').hover(); } },
  { name: 'ANALYSIS_BIOMETRIC_RADAR', run: (page) => setAnalysisPhase(page, 0.12) },
  { name: 'ANALYSIS_WHITE_EXHIBITION', run: (page) => setAnalysisPhase(page, 0.46) },
  { name: 'ANALYSIS_FACE_EYE', run: (page) => setAnalysisPhase(page, 0.85) },
  { name: 'DOSSIER_DEFAULT', run: (page) => setAnalysisPhase(page, 0.62) },
  { name: 'DOSSIER_HOVER', run: async (page) => { await page.locator('#dossier figure:nth-child(2)').hover(); } },
  { name: 'THERMAL_CITY', run: (page) => goToSection(page, 'thermal'), settle: true },
  { name: 'MOMENT_CONNECTION_DEFAULT', run: (page) => goToSection(page, 'connection'), settle: true },
  { name: 'CONNECTION_NODE_HOVER', run: async (page) => { await goToSection(page, 'connection'); await page.locator('.n5').hover(); }, settle: true },
  { name: 'MOMENT_FLOW', run: (page) => scrollElementIntoView(page, '.flow-strip') },
  { name: 'MOMENT_SAVED_PRE_CTA', run: (page) => goToSection(page, 'saved'), settle: true },
  { name: 'MOMENT_SAVED_CTA_ACTIVE', run: async (page) => { await page.locator('#pulseBtn').scrollIntoViewIfNeeded(); await page.click('#pulseBtn'); await page.waitForTimeout(320); return collectWaapiPulseEvidence(page); } },
  { name: 'LOVETREE_BRAND_CLOSE', run: (page) => scrollElementIntoView(page, '.logo-close') },
  { name: 'SCROLL_PROGRESS_TOP', run: async (page) => { await page.evaluate(() => window.__LT_PROMO.setProgress(0)); await waitForScrollArrival(page, 0); } },
  { name: 'SCROLL_PROGRESS_MID', run: async (page) => { const y = await page.evaluate(() => Math.round((document.documentElement.scrollHeight - window.innerHeight) * 0.5)); await page.evaluate(() => window.__LT_PROMO.setProgress(0.5)); await waitForScrollArrival(page, y); } },
  { name: 'SCROLL_PROGRESS_BOTTOM', run: async (page) => { const y = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight); await page.evaluate(() => window.__LT_PROMO.setProgress(1)); await waitForScrollArrival(page, y); } },
];

/**
 * The 14 S2-accepted reduced-motion authority states, in replay order.
 *
 * The RM_ prefix is a harness-side namespace only: each RM_* name is the S2 accepted state of the
 * same name without the prefix, 1:1 and in the same order.
 *
 *   RM_HERO_READY               -> HERO_READY
 *   RM_HERO_POINTER_PARALLAX    -> HERO_POINTER_PARALLAX
 *   RM_ANALYSIS_PHASE1_SCAN     -> ANALYSIS_PHASE1_SCAN
 *   RM_ANALYSIS_PHASE2_WHITE_GATE -> ANALYSIS_PHASE2_WHITE_GATE
 *   RM_ANALYSIS_PHASE3_EYE_OVERLAY -> ANALYSIS_PHASE3_EYE_OVERLAY
 *   RM_DOSSIER                  -> DOSSIER
 *   RM_DOSSIER_HOVER            -> DOSSIER_HOVER
 *   RM_THERMAL_CITY             -> THERMAL_CITY
 *   RM_CONNECTION               -> CONNECTION
 *   RM_MOMENT_FLOW              -> MOMENT_FLOW
 *   RM_SAVED_PRE_CTA            -> SAVED_PRE_CTA
 *   RM_SAVED_CTA_ACTIVE         -> SAVED_CTA_ACTIVE
 *   RM_BRAND_CLOSE              -> BRAND_CLOSE
 *   RM_SCROLL_PROGRESS          -> SCROLL_PROGRESS
 *
 * The mobile regression lanes reuse these recipes, so the mapping is exported rather than restated.
 */
export const REDUCED_MOTION_STATES = [
  { name: 'RM_HERO_READY', run: async (page) => { await page.evaluate(() => window.scrollTo(0, 0)); await waitForScrollArrival(page, 0); } },
  { name: 'RM_HERO_POINTER_PARALLAX', run: async (page) => { await page.mouse.move(430, 330); await page.mouse.move(455, 355); } },
  { name: 'RM_ANALYSIS_PHASE1_SCAN', run: (page) => setAnalysisPhase(page, 0.12) },
  { name: 'RM_ANALYSIS_PHASE2_WHITE_GATE', run: (page) => setAnalysisPhase(page, 0.46) },
  { name: 'RM_ANALYSIS_PHASE3_EYE_OVERLAY', run: (page) => setAnalysisPhase(page, 0.85) },
  { name: 'RM_DOSSIER', run: (page) => setAnalysisPhase(page, 0.62) },
  { name: 'RM_DOSSIER_HOVER', run: async (page) => { await page.locator('#dossier figure').first().hover(); } },
  { name: 'RM_THERMAL_CITY', run: (page) => goToSection(page, 'thermal'), settle: true },
  { name: 'RM_CONNECTION', run: (page) => goToSection(page, 'connection'), settle: true },
  { name: 'RM_MOMENT_FLOW', run: (page) => scrollElementIntoView(page, '.flow-strip') },
  { name: 'RM_SAVED_PRE_CTA', run: (page) => goToSection(page, 'saved'), settle: true },
  { name: 'RM_SAVED_CTA_ACTIVE', run: async (page) => { await page.locator('#pulseBtn').scrollIntoViewIfNeeded(); await page.click('#pulseBtn'); await page.waitForTimeout(320); return collectWaapiPulseEvidence(page); } },
  { name: 'RM_BRAND_CLOSE', run: (page) => scrollElementIntoView(page, '.logo-close') },
  { name: 'RM_SCROLL_PROGRESS', run: async (page) => { const y = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight); await page.evaluate(() => window.__LT_PROMO.setProgress(1)); await waitForScrollArrival(page, y); } },
];

/**
 * Chrome requests /favicon.ico on its own and logs a generic
 * "Failed to load resource: ... 404 (Not Found)" console error when the server has none. S2 recorded
 * this and CENTRAL accepted it explicitly as browser probe noise, not a source dependency
 * (#589 comment 5860509930).
 *
 * The console TEXT carries no URL, and Playwright does not surface the favicon fetch through either
 * the page `request` or `response` event (measured: the server receives the 404, yet the page
 * response ledger stays empty). The console message's own `location().url` does carry it, so that is
 * the signal used here: an error is treated as probe noise only when its own reported URL is a
 * favicon. An error with no URL, or with any other URL, is always kept.
 *
 * Nothing is dropped silently: the untouched list is returned as `rawErrors`.
 */
export function partitionErrors(entries) {
  const errors = [];
  const filtered = [];
  for (const entry of entries) {
    if (entry.url && entry.url.includes('favicon.ico')) filtered.push(entry.text);
    else errors.push(entry.text);
  }
  return { errors, filtered };
}

/** Centre an element and wait for the authored smooth scroll to land there. */
export async function scrollElementIntoView(page, selector) {
  const targetY = await page.evaluate((s) => {
    const box = document.querySelector(s).getBoundingClientRect();
    return Math.round(box.top + window.scrollY + box.height / 2 - window.innerHeight / 2);
  }, selector);
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center', behavior: 'auto' }), selector);
  await waitForScrollArrival(page, targetY);
  return targetY;
}

/**
 * THE SHARED SRC051 CAPTURE CORE.
 *
 * One recipe, one capture path, two callers. Baseline replay and S4 parity both drive this function,
 * so the accepted state recipes cannot silently diverge between them: CENTRAL required the parity
 * route to reuse the already accepted driver rather than keep a second hand-maintained state machine.
 *
 * The function is deliberately surface-agnostic. It receives a URL and a plan, captures the states,
 * and returns the raw observations. It builds NO parity verdict, writes no accepted-parity metadata,
 * and hard-codes no original-vs-split claim; that judgement belongs to the caller.
 *
 * `pages` is how the two surfaces are kept in lockstep. A single-surface baseline pass passes one page
 * and runs the whole plan in order. The parity pass passes BOTH pages and the plan is advanced one
 * state at a time across them, so the two surfaces stay adjacent in time while evolving through the
 * same sequence. Running the whole original plan and then the whole split plan, minutes apart, let a
 * scroll that had not yet begun on one surface resolve differently from the other and turned into
 * large false state drift.
 */
export async function captureSRC051Lane(browser, url, viewport, plan, sourceOut, label, { sourceId = 'SRC051', reducedMotion = 'no-preference', ctaStateMatcher = (name) => name.includes('SAVED_CTA_ACTIVE'), collect = collectSRC051State, extras = null, settleRelevant = null } = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.dpr ?? 1,
    reducedMotion,
  });
  const failedRequests = [];
  try {
    const page = await context.newPage();
    const consoleEntries = [];
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(`pageerror:${error.message}`));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      let entryUrl = null;
      try { entryUrl = message.location()?.url ?? null; } catch { entryUrl = null; }
      consoleEntries.push({ text: `console:${message.text()}`, url: entryUrl });
    });
    page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`.trim()));
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    if (!response?.ok()) throw new Error(`${sourceId} ${label}: HTTP ${response?.status()}`);
    // SRC051's accepted runtime hook. The generic harness waits for window.__lt / window.__lovetreeStats,
    // which this Source does not implement, so it must never be routed there.
    await page.waitForFunction(() => !!window.__LT_PROMO, null, { timeout: 15000 });
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, { timeout: 30000 });

    const states = {};
    for (const state of plan) {
      const detail = await state.run(page);
      states[state.name] = { ...(await captureState(page, sourceOut, label, state.name, { settleTransitions: state.settle === true, collect, extras, settleRelevant })), action_detail: detail ?? null };
    }

    // FROZEN DEFECT D5 must remain observable on every surface: the click-created Web Animations pulse
    // is NOT gated on prefers-reduced-motion. The evidence is read from the CTA state itself, 320ms
    // after the real click; querying it again at the end of the run would find nothing, because the
    // authored 700ms/900ms animations have already finished.
    const ctaStateName = plan.find((s) => ctaStateMatcher(s.name))?.name;
    const waapi = (ctaStateName ? states[ctaStateName]?.action_detail : null) ?? { after_click_count: 0, after_click: [] };
    return {
      states,
      waapi,
      state_count: plan.length,
      cta_state_name: ctaStateName ?? null,
      errors: partitionErrors([...consoleEntries, ...pageErrors.map((text) => ({ text, url: null }))]).errors,
      rawErrors: consoleEntries.map((e) => e.text),
      pageErrors,
      filteredBrowserProbeNoise: partitionErrors([...consoleEntries, ...pageErrors.map((text) => ({ text, url: null }))]).filtered,
      failedRequests,
      reducedMotion,
    };
  } finally {
    await context.close();
  }
}

/**
 * ORIGINAL BASELINE REPLAY ONLY.
 *
 * Captures `original/original.html` at the two S2-accepted authority surfaces. This function
 * deliberately performs no original-vs-split comparison and produces no parity verdict: baseline
 * replay is independent of S4 and stays a single-surface observation.
 */
export async function captureSRC051Baseline(browser, baseUrl, viewport, sourceOut, label, sourceId = 'SRC051') {
  const reducedMotion = viewport.reducedMotion === 'reduce' ? 'reduce' : 'no-preference';
  const plan = reducedMotion === 'reduce' ? REDUCED_MOTION_STATES : NORMAL_MOTION_STATES;
  const lane = await captureSRC051Lane(browser, baseUrl, viewport, plan, sourceOut, label, { sourceId, reducedMotion });
  if (lane.waapi.after_click_count <= 0) {
    throw new Error(`${sourceId} ${label}: FROZEN DEFECT D5 not observable - the authored WAAPI CTA pulse did not run (${reducedMotion})`);
  }
  const interaction = {
    reduced_motion: reducedMotion,
    state_count: plan.length,
    accepted_state_source: 'S2 accepted report 9ff0e7dcedce8582023e88def4ded76d31d5d16d',
    smooth_scroll_arrival_synchronization: 'APPLIED',
    css_transition_settle_synchronization: 'APPLIED_TO_RESTING_STATES',
    resting_states: ['THERMAL_CITY', 'CONNECTION', 'MOMENT_SAVED_PRE_CTA'],
    waapi_pulse_preserved_not_disabled: true,
    waapi_pulse: lane.waapi,
    animation_bookkeeping: 'UNRESOLVED_RAW_OBSERVATION_ONLY',
    original_surface_only: true,
    original_vs_split_comparison: 'NOT_PERFORMED',
    parity_capture_authorized: false,
    central_s4_release: 'HOLD_CENTRAL',
  };
  return {
    states: lane.states,
    interaction,
    errors: lane.errors,
    rawErrors: lane.rawErrors,
    pageErrors: lane.pageErrors,
    filteredBrowserProbeNoise: lane.filteredBrowserProbeNoise,
    failedRequests: lane.failedRequests,
    reducedMotion,
  };
}

export function collectWaapiPulseEvidence(page) {
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
      css_animation_name_heart_core: getComputedStyle(document.querySelector('.heart-core')).animationName,
      gated_on_prefers_reduced_motion: false,
      note: 'FROZEN DEFECT D5, preserved verbatim: the authored reduced-motion media query disables CSS animation, but this pulse is created from JS and is not gated. Recorded, never disabled or normalized.',
    };
  });
}


