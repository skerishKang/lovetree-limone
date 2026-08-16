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

/**
 * Select an explicit Moment id. Used by the Branch landing, where the
 * destination is decided by the chosen Connection rather than by path order.
 * Unknown ids leave the selection untouched, so a broken continuation can never
 * move the reader to a Moment that is not on the path.
 */
export function selectById(state: SelectionState, momentId: string): SelectionState {
  if (!momentId) return state;
  const index = state.pathMomentIds.indexOf(momentId);
  if (index < 0) return state;
  return {
    ...state,
    currentMomentId: momentId,
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