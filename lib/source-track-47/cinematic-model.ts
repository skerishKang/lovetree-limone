/**
 * Source Track 47 V4.2.5 — explicit UI state model.
 *
 * The source HTML drives everything from imperative DOM flags. This module
 * is the single framework-free authority for that state so the React native
 * candidate and the node tests share one model:
 *
 * - PlaybackState  — who owns the film timeline (auto / user / paused / …)
 * - CinematicState — act, progress, CTA readiness derived from time
 * - NavMenuState   — ONE canonical open-menu authority (no per-flag booleans)
 * - MotionPreference / still mode — reduced-motion 5-keyframe behavior
 *
 * Timing constants are exact-source values (script block of the pinned HTML).
 */

/* ------------------------------------------------------------------ */
/* Playback — the film timeline authority                               */
/* ------------------------------------------------------------------ */

export const PLAYBACK_MODES = Object.freeze({
  AUTO: "AUTO_CINEMATIC",
  USER: "USER_CONTROLLED",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  REPLAY: "REPLAY",
} as const);
export type PlaybackMode = (typeof PLAYBACK_MODES)[keyof typeof PLAYBACK_MODES];

export interface PlaybackState {
  mode: PlaybackMode;
  priorMode: PlaybackMode;
  /** User took the scroll/wheel/keyboard/rail authority away from autoplay. */
  userAuthority: boolean;
  /** Video failed to load → poster fallback (source `.video-failed`). */
  failure: boolean;
}

export const INITIAL_PLAYBACK: PlaybackState = Object.freeze({
  mode: PLAYBACK_MODES.AUTO,
  priorMode: PLAYBACK_MODES.AUTO,
  userAuthority: false,
  failure: false,
});

/* ------------------------------------------------------------------ */
/* ACT timeline — exact source boundaries (seconds)                     */
/* ------------------------------------------------------------------ */

export interface ActDefinition {
  id: 1 | 2 | 3 | 4 | 5;
  start: number;
  end: number;
  /** Still keyframe used by reduced-motion 5-keyframe mode. */
  key: number;
  label: string;
}

export const ACTS: readonly ActDefinition[] = Object.freeze([
  { id: 1, start: 0, end: 2.45, key: 0.9, label: "FIRST FEELING" },
  { id: 2, start: 2.45, end: 6.1, key: 4.1, label: "MOMENT" },
  { id: 3, start: 6.1, end: 10.65, key: 7.5, label: "BLOOM" },
  { id: 4, start: 10.65, end: 12.25, key: 11.1, label: "WHY NEXT" },
  { id: 5, start: 12.25, end: 14.187007, key: 13.2, label: "LOVETREE" },
]);

/** Source default duration = ACTS[4].end until loadedmetadata replaces it. */
export const DEFAULT_DURATION = ACTS[4].end;

/** CTA row may appear only from this time (source `applyAct`). */
export const CTA_READY_TIME = 12.9;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function actForTime(time: number): ActDefinition {
  const act = ACTS.find((a) => time < a.end);
  return act ?? ACTS[ACTS.length - 1];
}

export function progressForTime(time: number, duration: number = DEFAULT_DURATION): number {
  return clamp(time / duration, 0, 1);
}

export function isCtaReady(time: number, mode: PlaybackMode): boolean {
  return time >= CTA_READY_TIME || mode === PLAYBACK_MODES.COMPLETED;
}

/** Reduced-motion still mode: scroll ratio → act keyframe (source `onScroll`). */
export function actForScrollRatio(ratio: number): ActDefinition {
  const idx = Math.min(4, Math.floor(clamp(ratio, 0, 1) * 5));
  return ACTS[idx];
}

/** Scrub easing step (source `scrubLoop`, factor 0.16, snap threshold 0.006). */
export function scrubStep(
  scrubTime: number,
  targetTime: number,
): { scrubTime: number; settled: boolean } {
  const delta = targetTime - scrubTime;
  const next = scrubTime + delta * 0.16;
  if (Math.abs(delta) < 0.006) return { scrubTime: targetTime, settled: true };
  return { scrubTime: next, settled: false };
}

/** Scroll position ⇄ film time (source maps 0..maxScroll onto 0..duration). */
export function timeForScroll(scrollY: number, maxScroll: number): number {
  if (maxScroll <= 0) return 0;
  return clamp((scrollY / maxScroll) * DEFAULT_DURATION, 0, DEFAULT_DURATION - 0.001);
}

export function scrollForTime(time: number, maxScroll: number): number {
  return clamp((time / DEFAULT_DURATION) * maxScroll, 0, maxScroll);
}

/* ------------------------------------------------------------------ */
/* Cinematic projection — what the stage renders                        */
/* ------------------------------------------------------------------ */

export interface CinematicState {
  actId: ActDefinition["id"];
  actLabel: string;
  progress: number;
  ctaReady: boolean;
}

export function cinematicForTime(
  time: number,
  mode: PlaybackMode,
  duration: number = DEFAULT_DURATION,
): CinematicState {
  const act = actForTime(time);
  return {
    actId: act.id,
    actLabel: act.label,
    progress: progressForTime(time, duration),
    ctaReady: isCtaReady(time, mode),
  };
}

/* ------------------------------------------------------------------ */
/* Nav menus — ONE canonical open-menu authority                        */
/* ------------------------------------------------------------------ */

export const NAV_MENU_IDS = Object.freeze(["moments", "connections", "mytree"] as const);
export type NavMenuId = (typeof NAV_MENU_IDS)[number];

export type NavFocusTarget =
  | { kind: "none" }
  | { kind: "first-option"; menu: NavMenuId }
  | { kind: "trigger"; menu: NavMenuId };

export interface NavMenuState {
  /** null = all closed. Never two menus at once (source `closeAll`). */
  openMenu: NavMenuId | null;
}

export const INITIAL_NAV_MENU: NavMenuState = Object.freeze({ openMenu: null });

/**
 * Trigger click pins the popover (`.is-open`): opening one closes the others,
 * clicking the open trigger closes it. Returns where keyboard focus must go
 * when the menu opens (first option) — source V4.2.5 contract.
 */
export function navTriggerPressed(
  state: NavMenuState,
  menu: NavMenuId,
): { state: NavMenuState; focus: NavFocusTarget; expanded: boolean } {
  if (state.openMenu === menu) {
    return { state: { openMenu: null }, focus: { kind: "none" }, expanded: false };
  }
  return {
    state: { openMenu: menu },
    focus: { kind: "first-option", menu },
    expanded: true,
  };
}

/** Submenu item selection closes every menu; focus follows natural anchor order. */
export function navOptionActivated(state: NavMenuState): NavMenuState {
  return { openMenu: null };
}

/** Outside pointerdown closes every menu without moving focus. */
export function navOutsidePointer(state: NavMenuState): NavMenuState {
  return { openMenu: null };
}

/**
 * Escape closes the open menu and restores focus to its trigger. Focus return
 * must NOT re-open the menu — this model has no hover/focus auto-open path,
 * which is exactly the V4.2.5 fix (the `:focus-within` auto-open was removed).
 */
export function navEscape(
  state: NavMenuState,
  focusMenu?: NavMenuId | null,
): { state: NavMenuState; focus: NavFocusTarget } {
  const menu = focusMenu ?? state.openMenu;
  if (menu) return { state: { openMenu: null }, focus: { kind: "trigger", menu } };
  return { state, focus: { kind: "none" } };
}

export function isMenuExpanded(state: NavMenuState, menu: NavMenuId): boolean {
  return state.openMenu === menu;
}

/* ------------------------------------------------------------------ */
/* Motion preference                                                    */
/* ------------------------------------------------------------------ */

export interface MotionPreference {
  reduced: boolean;
  /** Source `stillMode` starts true only under prefers-reduced-motion. */
  stillMode: boolean;
}

export function initialMotionPreference(reduced: boolean): MotionPreference {
  return { reduced, stillMode: reduced };
}
