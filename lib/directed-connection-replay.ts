export interface DirectedReplayMoment {
  id: string;
  title: string;
  meta?: string;
}

export interface DirectedReplayConnection {
  id: string;
  fromMomentId: string;
  toMomentId: string;
  label: string;
  order?: number;
}

export type DirectedReplayStep =
  | { key: string; kind: "moment"; momentId: string }
  | { key: string; kind: "connection"; connectionId: string; fromMomentId: string; toMomentId: string };

export type DirectedReplayTermination = "complete" | "invalid-start" | "broken-target" | "cycle";

export interface DirectedConnectionReplayPlan {
  startMomentId: string;
  steps: readonly DirectedReplayStep[];
  termination: DirectedReplayTermination;
  terminalMomentId?: string;
  problemConnectionId?: string;
}

export type DirectedReplayMode = "paused" | "playing" | "ended";

export interface DirectedConnectionReplayState {
  plan: DirectedConnectionReplayPlan;
  activeIndex: number;
  traversedStepKeys: readonly string[];
  mode: DirectedReplayMode;
}

export type DirectedConnectionReplayAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "restart" }
  | { type: "advance" }
  | { type: "load-plan"; plan: DirectedConnectionReplayPlan; autoplay?: boolean };

function outgoingConnections(
  connections: readonly DirectedReplayConnection[],
  momentId: string,
): readonly DirectedReplayConnection[] {
  return connections
    .filter((connection) => connection.fromMomentId === momentId)
    .sort((left, right) => {
      const orderDelta = (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER);
      return orderDelta || left.id.localeCompare(right.id);
    });
}

export function deriveDirectedConnectionReplayPlan(
  moments: readonly DirectedReplayMoment[],
  connections: readonly DirectedReplayConnection[],
  startMomentId: string,
): DirectedConnectionReplayPlan {
  const momentIds = new Set(moments.map((moment) => moment.id));
  if (!momentIds.has(startMomentId)) {
    return { startMomentId, steps: [], termination: "invalid-start" };
  }

  const steps: DirectedReplayStep[] = [
    { key: `moment:${startMomentId}`, kind: "moment", momentId: startMomentId },
  ];
  const visitedMoments = new Set([startMomentId]);
  const visitedConnections = new Set<string>();
  let currentMomentId = startMomentId;

  while (true) {
    const outgoing = outgoingConnections(connections, currentMomentId);
    const nextConnection = outgoing.find((connection) => !visitedConnections.has(connection.id));
    if (!nextConnection) {
      return {
        startMomentId,
        steps,
        termination: "complete",
        terminalMomentId: currentMomentId,
      };
    }

    visitedConnections.add(nextConnection.id);
    steps.push({
      key: `connection:${nextConnection.id}`,
      kind: "connection",
      connectionId: nextConnection.id,
      fromMomentId: nextConnection.fromMomentId,
      toMomentId: nextConnection.toMomentId,
    });

    if (!momentIds.has(nextConnection.toMomentId)) {
      return {
        startMomentId,
        steps,
        termination: "broken-target",
        terminalMomentId: currentMomentId,
        problemConnectionId: nextConnection.id,
      };
    }

    steps.push({
      key: `moment:${nextConnection.toMomentId}`,
      kind: "moment",
      momentId: nextConnection.toMomentId,
    });

    if (visitedMoments.has(nextConnection.toMomentId)) {
      return {
        startMomentId,
        steps,
        termination: "cycle",
        terminalMomentId: nextConnection.toMomentId,
        problemConnectionId: nextConnection.id,
      };
    }

    visitedMoments.add(nextConnection.toMomentId);
    currentMomentId = nextConnection.toMomentId;
  }
}

export function createDirectedConnectionReplayState(
  plan: DirectedConnectionReplayPlan,
): DirectedConnectionReplayState {
  return {
    plan,
    activeIndex: plan.steps.length > 0 ? 0 : -1,
    traversedStepKeys: [],
    mode: plan.steps.length > 0 ? "paused" : "ended",
  };
}

export function activeDirectedReplayStep(
  state: DirectedConnectionReplayState,
): DirectedReplayStep | null {
  return state.activeIndex >= 0 ? state.plan.steps[state.activeIndex] ?? null : null;
}

export function reduceDirectedConnectionReplay(
  state: DirectedConnectionReplayState,
  action: DirectedConnectionReplayAction,
): DirectedConnectionReplayState {
  switch (action.type) {
    case "load-plan": {
      const next = createDirectedConnectionReplayState(action.plan);
      return action.autoplay && next.activeIndex >= 0 ? { ...next, mode: "playing" } : next;
    }
    case "play":
      if (state.activeIndex < 0) return state;
      return { ...state, mode: "playing" };
    case "pause":
      if (state.mode === "ended") return state;
      return { ...state, mode: "paused" };
    case "restart": {
      const next = createDirectedConnectionReplayState(state.plan);
      return next.activeIndex >= 0 ? { ...next, mode: "playing" } : next;
    }
    case "advance": {
      if (state.mode !== "playing" || state.activeIndex < 0) return state;
      const current = state.plan.steps[state.activeIndex];
      const traversed = current && !state.traversedStepKeys.includes(current.key)
        ? [...state.traversedStepKeys, current.key]
        : state.traversedStepKeys;
      const nextIndex = state.activeIndex + 1;
      if (nextIndex >= state.plan.steps.length) {
        return {
          ...state,
          activeIndex: -1,
          traversedStepKeys: traversed,
          mode: "ended",
        };
      }
      return {
        ...state,
        activeIndex: nextIndex,
        traversedStepKeys: traversed,
        mode: "playing",
      };
    }
  }
}
