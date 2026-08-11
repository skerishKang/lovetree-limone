export const VIDEOFIGURE_ANGLES = ["000", "045", "090", "135", "180", "225", "270", "315"] as const;

export type VideoFigureAngle = (typeof VIDEOFIGURE_ANGLES)[number];
export type VideoFigureResumePolicy = "resume-after-idle" | "stay-paused";

export interface VideoFigureTurntableState {
  lookIndex: number;
  angleIndex: number;
  playing: boolean;
  manuallyOwned: boolean;
}

export interface VideoFigureTurntableConfig {
  lookCount: number;
  resumePolicy: VideoFigureResumePolicy;
}

export type VideoFigureTurntableAction =
  | { type: "select-look"; index: number }
  | { type: "step-angle"; delta: -1 | 1; manual?: boolean }
  | { type: "auto-tick" }
  | { type: "manual-start" }
  | { type: "manual-end" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "restart" };

const wrap = (value: number, count: number) => ((value % count) + count) % count;

export function createVideoFigureTurntableState(
  config: VideoFigureTurntableConfig,
  lookIndex = 0,
): VideoFigureTurntableState {
  if (config.lookCount < 1) throw new Error("VideoFigure requires at least one Look/Figure set");
  return { lookIndex: wrap(lookIndex, config.lookCount), angleIndex: 0, playing: true, manuallyOwned: false };
}

export function reduceVideoFigureTurntable(
  state: VideoFigureTurntableState,
  action: VideoFigureTurntableAction,
  config: VideoFigureTurntableConfig,
): VideoFigureTurntableState {
  if (config.lookCount < 1) throw new Error("VideoFigure requires at least one Look/Figure set");

  switch (action.type) {
    case "select-look":
      return {
        ...state,
        lookIndex: wrap(action.index, config.lookCount),
        angleIndex: 0,
        manuallyOwned: true,
      };
    case "step-angle":
      return {
        ...state,
        angleIndex: wrap(state.angleIndex + action.delta, VIDEOFIGURE_ANGLES.length),
        manuallyOwned: action.manual ? true : state.manuallyOwned,
      };
    case "auto-tick": {
      if (!state.playing || state.manuallyOwned) return state;
      const nextAngle = state.angleIndex + 1;
      if (nextAngle < VIDEOFIGURE_ANGLES.length) return { ...state, angleIndex: nextAngle };
      return {
        ...state,
        lookIndex: wrap(state.lookIndex + 1, config.lookCount),
        angleIndex: 0,
      };
    }
    case "manual-start":
      return { ...state, manuallyOwned: true };
    case "manual-end":
      return {
        ...state,
        manuallyOwned: config.resumePolicy === "stay-paused",
        playing: config.resumePolicy === "stay-paused" ? false : state.playing,
      };
    case "play":
      return { ...state, playing: true, manuallyOwned: false };
    case "pause":
      return { ...state, playing: false };
    case "restart":
      return { ...state, angleIndex: 0, playing: true, manuallyOwned: false };
  }
}

export function angleStepFromHorizontalDelta(deltaX: number, threshold = 24): -1 | 0 | 1 {
  if (Math.abs(deltaX) < threshold) return 0;
  return deltaX > 0 ? -1 : 1;
}

export function videoFigureAngleForState(state: VideoFigureTurntableState): VideoFigureAngle {
  return VIDEOFIGURE_ANGLES[state.angleIndex];
}
