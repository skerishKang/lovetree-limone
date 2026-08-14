/**
 * P3 — Guided Transport & Manual Takeover: narrow pure-core extraction from #141
 * after two-consumer proof (Lineage 58 VideoFigure Atelier V2 / Semantic
 * Memory Anatomy as audited in #141 P3 extraction audit).
 *
 * Renderer-neutral, React-neutral, DOM-neutral and LoveTree-domain-neutral.
 * This core manages transport authority and manual takeover state: whether
 * automated progression is authorized (`canAutoAdvance`), pausing, playing,
 * restarting, entering manual ownership, and releasing manual ownership under
 * an explicit resume policy ("resume-after-idle" vs "stay-paused").
 *
 * Excluded from this core (belong to consumers, adapters, P1, P2, P4, P7, P8):
 *   - sequence steps, chapters, angles, layer identities
 *   - tick progression, looping, or completion math
 *   - seek / timeline / progress calculations
 *   - VideoFigure Look/angle rollover or Memory Anatomy 7-layer completion
 *   - timers, setTimeout, requestAnimationFrame, performance.now
 *   - document visibility, IntersectionObserver
 *   - prefers-reduced-motion DOM/browser policy
 *   - React state, DOM elements, CSS, routes
 *   - DB / API / Auth / Firebase / Neon / Worker / Production
 */

export type TransportResumePolicy = "resume-after-idle" | "stay-paused";

export interface TransportAuthorityState {
  readonly playing: boolean;
  readonly manuallyOwned: boolean;
}

export interface TransportAuthorityOptions {
  readonly initialPlaying?: boolean;
  readonly initiallyManuallyOwned?: boolean;
}

export interface ManualTakeoverOptions {
  readonly pausePlayback?: boolean;
}

export type TransportAuthorityAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "restart" }
  | { type: "manual-start"; pausePlayback?: boolean }
  | { type: "manual-end"; resumePolicy: TransportResumePolicy };

/**
 * Fail-closed validation for transport resume policies.
 * Throws TypeError unless policy is "resume-after-idle" or "stay-paused".
 */
export function assertValidResumePolicy(
  policy: string,
): asserts policy is TransportResumePolicy {
  if (policy !== "resume-after-idle" && policy !== "stay-paused") {
    throw new TypeError(`invalid transport resume policy: ${String(policy)}`);
  }
}

/**
 * Fail-closed validation for transport authority state objects.
 * Throws TypeError if state is missing or fields are not booleans.
 */
export function assertValidTransportState(
  state: TransportAuthorityState,
): void {
  if (
    !state ||
    typeof state !== "object" ||
    typeof state.playing !== "boolean" ||
    typeof state.manuallyOwned !== "boolean"
  ) {
    throw new TypeError("invalid transport authority state");
  }
}

/**
 * Create a new TransportAuthorityState.
 * Defaults to playing=true, manuallyOwned=false unless overridden.
 */
export function createTransportAuthorityState(
  options: TransportAuthorityOptions = {},
): TransportAuthorityState {
  return {
    playing: options.initialPlaying ?? true,
    manuallyOwned: options.initiallyManuallyOwned ?? false,
  };
}

/**
 * Pure predicate: returns true if and only if automated advance is authorized
 * (transport is playing AND not under manual ownership).
 */
export function canAutoAdvance(state: TransportAuthorityState): boolean {
  assertValidTransportState(state);
  return state.playing && !state.manuallyOwned;
}

/**
 * Transition to playing authority. Clears any manual takeover flag.
 */
export function playTransport(
  state: TransportAuthorityState,
): TransportAuthorityState {
  assertValidTransportState(state);
  return {
    playing: true,
    manuallyOwned: false,
  };
}

/**
 * Transition to paused authority. Preserves manual ownership state.
 */
export function pauseTransport(
  state: TransportAuthorityState,
): TransportAuthorityState {
  assertValidTransportState(state);
  return {
    ...state,
    playing: false,
  };
}

/**
 * Reset and transition to playing authority. Clears manual takeover.
 */
export function restartTransport(
  state: TransportAuthorityState,
): TransportAuthorityState {
  assertValidTransportState(state);
  return {
    playing: true,
    manuallyOwned: false,
  };
}

/**
 * Take manual ownership of the transport.
 *
 * Prevents automated advancement (`canAutoAdvance` becomes false).
 * If `options.pausePlayback` is true (e.g. Memory Anatomy pattern), `playing`
 * is also explicitly set to false; otherwise (e.g. VideoFigure pattern),
 * `playing` flag is preserved while manual ownership inhibits auto-tick.
 */
export function startManualTakeover(
  state: TransportAuthorityState,
  options?: ManualTakeoverOptions,
): TransportAuthorityState {
  assertValidTransportState(state);
  return {
    ...state,
    manuallyOwned: true,
    playing: options?.pausePlayback ? false : state.playing,
  };
}

/**
 * Release manual ownership under an explicit resume policy.
 *
 * - "resume-after-idle": clears `manuallyOwned` and preserves the active
 *   `playing` authority (allowing auto-advance to resume if playing was true).
 * - "stay-paused": forces `playing` to false and clears `manuallyOwned`,
 *   guaranteeing that playback will not resume automatically without an
 *   explicit `play` action.
 */
export function releaseManualTakeover(
  state: TransportAuthorityState,
  policy: TransportResumePolicy,
): TransportAuthorityState {
  assertValidTransportState(state);
  assertValidResumePolicy(policy);
  if (policy === "stay-paused") {
    return {
      playing: false,
      manuallyOwned: false,
    };
  }
  return {
    ...state,
    manuallyOwned: false,
  };
}

/**
 * Pure reducer transition for transport authority actions.
 */
export function reduceTransportAuthority(
  state: TransportAuthorityState,
  action: TransportAuthorityAction,
): TransportAuthorityState {
  assertValidTransportState(state);
  if (!action || typeof action !== "object" || typeof action.type !== "string") {
    throw new TypeError("invalid transport authority action");
  }
  switch (action.type) {
    case "play":
      return playTransport(state);
    case "pause":
      return pauseTransport(state);
    case "restart":
      return restartTransport(state);
    case "manual-start":
      return startManualTakeover(state, { pausePlayback: action.pausePlayback });
    case "manual-end":
      return releaseManualTakeover(state, action.resumePolicy);
    default:
      throw new TypeError(
        `unsupported transport authority action type: ${(action as { type: string }).type}`,
      );
  }
}
