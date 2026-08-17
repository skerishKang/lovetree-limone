export type StoryPhase =
  | "idle"
  | "holding"
  | "why-next"
  | "page-turn"
  | "landing"
  | "branch-pause"
  | "ended";

export type StorySpeed = 0.75 | 1 | 1.5 | 2;

export type StoryCommand = "play" | "pause" | "resume" | "stop" | "skip-next" | "skip-prev" | "goto-index";

export interface StoryState {
  phase: StoryPhase;
  speed: StorySpeed;
  playing: boolean;
  paused: boolean;
  currentHoldDuration: number;
  whyNextDuration: number;
  pageTurnDuration: number;
  landingDuration: number;
}

const HOLD_MS = 2500;
const WHY_NEXT_MS = 1200;
const PAGE_TURN_MS = 600;
const LANDING_MS = 400;

export function createStoryState(): StoryState {
  return {
    phase: "idle",
    speed: 1,
    playing: false,
    paused: false,
    currentHoldDuration: HOLD_MS,
    whyNextDuration: WHY_NEXT_MS,
    pageTurnDuration: PAGE_TURN_MS,
    landingDuration: LANDING_MS,
  };
}

export function startStory(state: StoryState): StoryState {
  return {
    ...state,
    phase: "holding",
    playing: true,
    paused: false,
  };
}

export function pauseStory(state: StoryState): StoryState {
  return { ...state, paused: true, playing: false };
}

export function resumeStory(state: StoryState): StoryState {
  if (state.phase === "ended") return state;
  return { ...state, paused: false, playing: true };
}

export function stopStory(state: StoryState): StoryState {
  return { ...state, phase: "idle", playing: false, paused: false };
}

export function setStorySpeed(state: StoryState, speed: StorySpeed): StoryState {
  return { ...state, speed };
}

export function advanceStoryPhase(state: StoryState, nextPhase: StoryPhase): StoryState {
  return { ...state, phase: nextPhase };
}

export function getEffectiveDuration(duration: number, speed: StorySpeed): number {
  return duration / speed;
}

export function getStoryPhaseDurations(state: StoryState) {
  return {
    hold: getEffectiveDuration(state.currentHoldDuration, state.speed),
    whyNext: getEffectiveDuration(state.whyNextDuration, state.speed),
    pageTurn: getEffectiveDuration(state.pageTurnDuration, state.speed),
    landing: getEffectiveDuration(state.landingDuration, state.speed),
  };
}

export const VALID_SPEEDS: readonly StorySpeed[] = [0.75, 1, 1.5, 2] as const;

export function cycleSpeed(speed: StorySpeed): StorySpeed {
  const index = VALID_SPEEDS.indexOf(speed);
  return VALID_SPEEDS[(index + 1) % VALID_SPEEDS.length];
}