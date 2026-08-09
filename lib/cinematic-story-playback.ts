export type CinematicPlaybackMode = "paused" | "playing" | "ended";
export type CinematicPlaybackTakeover = "none" | "manual";

export interface CinematicStoryChapter {
  id: string;
  title: string;
  momentLabel: string;
  startProgress: number;
}

export interface CinematicStoryPlaybackState {
  durationSeconds: number;
  elapsedSeconds: number;
  progress: number;
  activeChapterId: string;
  mode: CinematicPlaybackMode;
  takeover: CinematicPlaybackTakeover;
}

export type CinematicStoryPlaybackAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "restart" }
  | { type: "advance"; deltaSeconds: number }
  | { type: "seek-progress"; progress: number }
  | { type: "manual-takeover"; progress?: number };

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export function normalizeCinematicStoryChapters(
  chapters: readonly CinematicStoryChapter[],
): readonly CinematicStoryChapter[] {
  if (chapters.length === 0) return [];

  return [...chapters]
    .map((chapter) => ({
      ...chapter,
      startProgress: clamp(Number.isFinite(chapter.startProgress) ? chapter.startProgress : 0, 0, 1),
    }))
    .sort((left, right) => left.startProgress - right.startProgress);
}

export function chapterForCinematicProgress(
  chapters: readonly CinematicStoryChapter[],
  progress: number,
): CinematicStoryChapter | null {
  const normalized = normalizeCinematicStoryChapters(chapters);
  if (normalized.length === 0) return null;

  const safeProgress = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  let active = normalized[0];
  for (const chapter of normalized) {
    if (chapter.startProgress <= safeProgress) active = chapter;
    else break;
  }
  return active;
}

export function cinematicProgressFromElapsed(elapsedSeconds: number, durationSeconds: number): number {
  const safeDuration = Math.max(0.001, Number.isFinite(durationSeconds) ? durationSeconds : 0.001);
  return clamp((Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0) / safeDuration, 0, 1);
}

export function cinematicElapsedFromProgress(progress: number, durationSeconds: number): number {
  const safeDuration = Math.max(0.001, Number.isFinite(durationSeconds) ? durationSeconds : 0.001);
  return clamp(Number.isFinite(progress) ? progress : 0, 0, 1) * safeDuration;
}

export function createCinematicStoryPlaybackState(
  chapters: readonly CinematicStoryChapter[],
  durationSeconds = 80,
): CinematicStoryPlaybackState {
  const safeDuration = Math.max(1, Number.isFinite(durationSeconds) ? durationSeconds : 80);
  const first = chapterForCinematicProgress(chapters, 0);

  return {
    durationSeconds: safeDuration,
    elapsedSeconds: 0,
    progress: 0,
    activeChapterId: first?.id ?? "",
    mode: "paused",
    takeover: "none",
  };
}

function stateAtProgress(
  state: CinematicStoryPlaybackState,
  chapters: readonly CinematicStoryChapter[],
  progress: number,
  patch: Partial<CinematicStoryPlaybackState> = {},
): CinematicStoryPlaybackState {
  const safeProgress = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  const active = chapterForCinematicProgress(chapters, safeProgress);
  return {
    ...state,
    progress: safeProgress,
    elapsedSeconds: cinematicElapsedFromProgress(safeProgress, state.durationSeconds),
    activeChapterId: active?.id ?? "",
    ...patch,
  };
}

export function reduceCinematicStoryPlayback(
  state: CinematicStoryPlaybackState,
  action: CinematicStoryPlaybackAction,
  chapters: readonly CinematicStoryChapter[],
): CinematicStoryPlaybackState {
  switch (action.type) {
    case "play": {
      const restarted = state.progress >= 1 ? stateAtProgress(state, chapters, 0) : state;
      return { ...restarted, mode: "playing", takeover: "none" };
    }
    case "pause":
      return { ...state, mode: state.progress >= 1 ? "ended" : "paused" };
    case "restart":
      return { ...stateAtProgress(state, chapters, 0), mode: "playing", takeover: "none" };
    case "seek-progress":
      return stateAtProgress(state, chapters, action.progress, {
        mode: action.progress >= 1 ? "ended" : state.mode === "ended" ? "paused" : state.mode,
      });
    case "manual-takeover":
      return stateAtProgress(state, chapters, action.progress ?? state.progress, {
        mode: "paused",
        takeover: "manual",
      });
    case "advance": {
      if (state.mode !== "playing") return state;
      const delta = Math.max(0, Number.isFinite(action.deltaSeconds) ? action.deltaSeconds : 0);
      const elapsed = Math.min(state.durationSeconds, state.elapsedSeconds + delta);
      const progress = cinematicProgressFromElapsed(elapsed, state.durationSeconds);
      return stateAtProgress(state, chapters, progress, {
        mode: progress >= 1 ? "ended" : "playing",
        takeover: "none",
      });
    }
  }
}
