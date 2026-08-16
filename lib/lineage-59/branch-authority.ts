export interface BranchChoice {
  id: string;
  label: string;
  description: string;
  continuationMomentId: string;
}

export interface BranchState {
  active: boolean;
  momentId: string;
  choices: readonly BranchChoice[];
  selectedChoiceId: string | null;
  resolved: boolean;
}

export function createBranchState(
  momentId: string,
  choices: readonly BranchChoice[]
): BranchState {
  return {
    active: true,
    momentId,
    choices,
    selectedChoiceId: null,
    resolved: false,
  };
}

export function selectBranchChoice(state: BranchState, choiceId: string): BranchState {
  const choice = state.choices.find((c) => c.id === choiceId);
  if (!choice) return state;
  return {
    ...state,
    selectedChoiceId: choiceId,
    resolved: true,
    active: false,
  };
}

export function getSelectedChoice(state: BranchState): BranchChoice | undefined {
  if (!state.selectedChoiceId) return undefined;
  return state.choices.find((c) => c.id === state.selectedChoiceId);
}

export function isBranchResolved(state: BranchState): boolean {
  return state.resolved;
}