// Source Track 47 V4.2.5 — pure state model tests.
// Layer 2 of 3: the explicit UI state authorities shared by the native
// candidate and the browser QA. Every value here mirrors the pinned source
// script (676f5220…) — no tolerance, no skips.

import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTS,
  CTA_READY_TIME,
  DEFAULT_DURATION,
  INITIAL_NAV_MENU,
  INITIAL_PLAYBACK,
  PLAYBACK_MODES,
  actForScrollRatio,
  actForTime,
  cinematicForTime,
  isCtaReady,
  navEscape,
  navOutsidePointer,
  navOptionActivated,
  navTriggerPressed,
  progressForTime,
  scrubStep,
  timeForScroll,
} from "../lib/source-track-47/cinematic-model.ts";

test("ACT timeline matches the pinned source boundaries", () => {
  assert.equal(ACTS.length, 5);
  assert.deepEqual(
    ACTS.map((act) => act.id),
    [1, 2, 3, 4, 5],
  );
  assert.deepEqual(
    ACTS.map((act) => act.end),
    [2.45, 6.1, 10.65, 12.25, 14.187007],
  );
  assert.deepEqual(
    ACTS.map((act) => act.key),
    [0.9, 4.1, 7.5, 11.1, 13.2],
  );
  assert.deepEqual(
    ACTS.map((act) => act.label),
    ["FIRST FEELING", "MOMENT", "BLOOM", "WHY NEXT", "LOVETREE"],
  );
  assert.equal(DEFAULT_DURATION, 14.187007);
  assert.equal(CTA_READY_TIME, 12.9);
});

test("time → act mapping follows the source timeToAct semantics", () => {
  assert.equal(actForTime(0).id, 1);
  assert.equal(actForTime(2.449).id, 1);
  assert.equal(actForTime(2.45).id, 2);
  assert.equal(actForTime(6.09).id, 2);
  assert.equal(actForTime(6.1).id, 3);
  assert.equal(actForTime(10.64).id, 3);
  assert.equal(actForTime(10.65).id, 4);
  assert.equal(actForTime(12.24).id, 4);
  assert.equal(actForTime(12.25).id, 5);
  assert.equal(actForTime(14.187007).id, 5);
  assert.equal(actForTime(999).id, 5, "beyond duration clamps to the final act");
});

test("progress and CTA readiness projections", () => {
  assert.equal(progressForTime(0), 0);
  assert.equal(progressForTime(DEFAULT_DURATION), 1);
  assert.ok(Math.abs(progressForTime(DEFAULT_DURATION / 2) - 0.5) < 1e-12);
  assert.equal(progressForTime(999), 1, "progress clamps to 1");

  assert.equal(isCtaReady(12.899, PLAYBACK_MODES.AUTO), false);
  assert.equal(isCtaReady(12.9, PLAYBACK_MODES.AUTO), true);
  assert.equal(isCtaReady(0, PLAYBACK_MODES.COMPLETED), true, "COMPLETED shows CTA");

  const cinematic = cinematicForTime(12.9, PLAYBACK_MODES.AUTO);
  assert.equal(cinematic.actId, 5);
  assert.equal(cinematic.ctaReady, true);
  assert.equal(cinematicForTime(0, PLAYBACK_MODES.AUTO).ctaReady, false);
});

test("scroll ratio → reduced-motion keyframe mapping (source floor(p*5))", () => {
  assert.equal(actForScrollRatio(0).id, 1);
  assert.equal(actForScrollRatio(0.19).id, 1);
  assert.equal(actForScrollRatio(0.2).id, 2);
  assert.equal(actForScrollRatio(0.4).id, 3);
  assert.equal(actForScrollRatio(0.6).id, 4);
  assert.equal(actForScrollRatio(0.8).id, 5);
  assert.equal(actForScrollRatio(1).id, 5);
  assert.equal(actForScrollRatio(0.99).key, 13.2);
});

test("scroll ⇄ time mapping covers the full timeline", () => {
  const maxScroll = 4000;
  assert.equal(timeForScroll(0, maxScroll), 0);
  assert.ok(Math.abs(timeForScroll(maxScroll / 2, maxScroll) - DEFAULT_DURATION / 2) < 1e-9);
  // Top-of-page never lands on the final act; source caps at duration-.001.
  assert.equal(timeForScroll(maxScroll, maxScroll), DEFAULT_DURATION - 0.001);
  assert.equal(timeForScroll(99999, maxScroll), DEFAULT_DURATION - 0.001);
});

test("scrub easing matches the source scrubLoop (factor 0.16, snap 0.006)", () => {
  let step = scrubStep(0, 0);
  assert.equal(step.scrubTime, 0);
  assert.equal(step.settled, true);

  step = scrubStep(10, 10.005);
  assert.equal(step.scrubTime, 10.005);
  assert.equal(step.settled, true, "deltas under 6ms snap to target");

  step = scrubStep(0, 1);
  assert.ok(Math.abs(step.scrubTime - 0.16) < 1e-12);
  assert.equal(step.settled, false);

  // Convergence: repeated easing approaches the target monotonically.
  let time = 0;
  for (let i = 0; i < 500; i += 1) {
    const step = scrubStep(time, 5);
    time = step.scrubTime;
    if (step.settled) break;
  }
  assert.equal(time, 5);
});

test("pinned nav menu: trigger press pins one open menu and focuses the first option", () => {
  assert.equal(INITIAL_NAV_MENU.openMenu, null);

  const opened = navTriggerPressed(INITIAL_NAV_MENU, "moments");
  assert.equal(opened.state.openMenu, "moments");
  assert.equal(opened.expanded, true);
  assert.deepEqual(opened.focus, { kind: "first-option", menu: "moments" });

  // Opening another menu closes the first (single authority).
  const switched = navTriggerPressed(opened.state, "connections");
  assert.equal(switched.state.openMenu, "connections");
  assert.equal(switched.focus.kind, "first-option");

  // Clicking the open trigger closes it (toggle), focus stays put.
  const closed = navTriggerPressed(switched.state, "connections");
  assert.equal(closed.state.openMenu, null);
  assert.equal(closed.expanded, false);
  assert.equal(closed.focus.kind, "none");
});

test("pinned nav menu: option selection and outside pointer close all menus", () => {
  const open = navTriggerPressed(INITIAL_NAV_MENU, "mytree").state;
  assert.equal(navOptionActivated(open).openMenu, null);
  assert.equal(navOutsidePointer(open).openMenu, null);
  assert.equal(navOutsidePointer(INITIAL_NAV_MENU).openMenu, null);
});

test("pinned nav menu: Escape closes and restores trigger focus without re-open", () => {
  const open = navTriggerPressed(INITIAL_NAV_MENU, "moments").state;
  const escaped = navEscape(open);
  assert.equal(escaped.state.openMenu, null);
  assert.deepEqual(escaped.focus, { kind: "trigger", menu: "moments" });

  // Focus restore must not reopen: pressing the trigger focus path again
  // produces no state change by itself (open only via explicit press).
  assert.equal(navEscape(INITIAL_NAV_MENU).focus.kind, "none");
  assert.equal(navEscape(INITIAL_NAV_MENU, "connections").focus.kind, "trigger");

  // The model has NO hover/focus-driven open path — only navTriggerPressed
  // can set openMenu (V4.2.5 removed :focus-within auto-open).
  const reentry = navEscape(escaped.state, "moments");
  assert.equal(reentry.state.openMenu, null);
});

test("initial playback state is source AUTO_CINEMATIC with no user authority", () => {
  assert.equal(INITIAL_PLAYBACK.mode, PLAYBACK_MODES.AUTO);
  assert.equal(INITIAL_PLAYBACK.priorMode, PLAYBACK_MODES.AUTO);
  assert.equal(INITIAL_PLAYBACK.userAuthority, false);
  assert.equal(INITIAL_PLAYBACK.failure, false);
  assert.deepEqual(Object.values(PLAYBACK_MODES), [
    "AUTO_CINEMATIC",
    "USER_CONTROLLED",
    "PAUSED",
    "COMPLETED",
    "REPLAY",
  ]);
});
