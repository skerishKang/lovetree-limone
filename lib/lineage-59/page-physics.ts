export interface CurlState {
  curlProgress: number;
  isFlipping: boolean;
  commitThreshold: number;
  flickEnabled: boolean;
  fastFlipActive: boolean;
  fastFlipDirection: "forward" | "backward" | null;
}

export function createCurlState(): CurlState {
  return {
    curlProgress: 0,
    isFlipping: false,
    commitThreshold: 0.4,
    flickEnabled: true,
    fastFlipActive: false,
    fastFlipDirection: null,
  };
}

export function updateCurlProgress(state: CurlState, progress: number): CurlState {
  return {
    ...state,
    curlProgress: Math.max(0, Math.min(1, progress)),
    isFlipping: progress > 0,
  };
}

export function shouldCommit(state: CurlState): boolean {
  return state.curlProgress >= state.commitThreshold;
}

export function isFlick(velocity: number, flickEnabled: boolean): boolean {
  return flickEnabled && Math.abs(velocity) > 0.8;
}

export function completePageTurn(state: CurlState): CurlState {
  return {
    ...state,
    curlProgress: 1,
    isFlipping: false,
    fastFlipActive: false,
  };
}

export function cancelPageTurn(state: CurlState): CurlState {
  return {
    ...state,
    curlProgress: 0,
    isFlipping: false,
    fastFlipActive: false,
    fastFlipDirection: null,
  };
}

export function startFastFlip(state: CurlState, direction: "forward" | "backward"): CurlState {
  return {
    ...state,
    fastFlipActive: true,
    fastFlipDirection: direction,
    curlProgress: direction === "forward" ? 1 : 0,
  };
}

export function stopFastFlip(state: CurlState): CurlState {
  return {
    ...state,
    fastFlipActive: false,
    fastFlipDirection: null,
    curlProgress: 0,
  };
}

export interface CurlTransform {
  frontRotation: number;
  backRotation: number;
  shadowOpacity: number;
  nextPageReveal: number;
}

export function computeCurlTransform(progress: number): CurlTransform {
  const angle = progress * 180;
  const frontRotation = Math.min(angle, 90);
  const backRotation = Math.max(0, angle - 90);
  const shadowOpacity = 0.3 * Math.sin(progress * Math.PI);
  const nextPageReveal = Math.max(0, progress - 0.5) * 2;
  return { frontRotation, backRotation, shadowOpacity, nextPageReveal };
}