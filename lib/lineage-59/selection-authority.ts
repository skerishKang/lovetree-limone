export interface SelectionState {
  currentMomentId: string;
  pathMomentIds: readonly string[];
  pathIndex: number;
}

export function createSelection(momentId: string, pathMomentIds: readonly string[]): SelectionState {
  const index = pathMomentIds.indexOf(momentId);
  return {
    currentMomentId: momentId,
    pathMomentIds,
    pathIndex: index >= 0 ? index : 0,
  };
}

export function selectNext(state: SelectionState): SelectionState {
  const nextIndex = state.pathIndex + 1;
  if (nextIndex >= state.pathMomentIds.length) return state;
  return {
    ...state,
    currentMomentId: state.pathMomentIds[nextIndex],
    pathIndex: nextIndex,
  };
}

export function selectPrevious(state: SelectionState): SelectionState {
  const prevIndex = state.pathIndex - 1;
  if (prevIndex < 0) return state;
  return {
    ...state,
    currentMomentId: state.pathMomentIds[prevIndex],
    pathIndex: prevIndex,
  };
}

export function selectByIndex(state: SelectionState, index: number): SelectionState {
  if (index < 0 || index >= state.pathMomentIds.length) return state;
  return {
    ...state,
    currentMomentId: state.pathMomentIds[index],
    pathIndex: index,
  };
}

export function hasNext(state: SelectionState): boolean {
  return state.pathIndex < state.pathMomentIds.length - 1;
}

export function hasPrevious(state: SelectionState): boolean {
  return state.pathIndex > 0;
}

export function isAtEnd(state: SelectionState): boolean {
  return state.pathIndex >= state.pathMomentIds.length - 1;
}