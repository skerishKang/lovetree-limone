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

/** Declared choice shape as authored in the data layer. */
export interface BranchChoiceDeclaration {
  id: string;
  label: string;
  description: string;
  connectionId: string;
}

export interface BranchDeclaration {
  id: string;
  fromMomentId: string;
  choices: readonly BranchChoiceDeclaration[];
}

/** Minimal Connection shape needed to resolve a Branch continuation. */
export interface BranchConnection {
  id: string;
  fromId: string;
  toId: string;
}

/**
 * A Branch requires at least this many truthful choices before the Story is
 * allowed to hand control to the reader. The V5 source contract declares
 * exactly two explicit choices and never auto-selects.
 */
export const MIN_BRANCH_CHOICES = 2;

/**
 * Resolve declared Branch choices into destination-bearing choices.
 *
 * `BranchChoice.connectionId` lives in the Connection-id key domain, so it must
 * be resolved through a Connection-id map — never through the `fromId`-keyed
 * WHY NEXT map. A choice is only truthful when:
 *
 *  1. its `connectionId` resolves to a real Connection,
 *  2. that Connection originates at the Moment where the Branch is declared
 *     (`fromId === branchMomentId`), i.e. it is a real outgoing continuation, and
 *  3. that Connection has a non-empty destination Moment.
 *
 * Choices failing any of these are dropped rather than emitted with an empty
 * `continuationMomentId`, so no code path can navigate to "".
 */
export function resolveBranchChoices(
  choices: readonly BranchChoiceDeclaration[],
  connectionById: ReadonlyMap<string, BranchConnection>,
  branchMomentId: string,
): readonly BranchChoice[] {
  const resolved: BranchChoice[] = [];
  for (const choice of choices) {
    const connection = connectionById.get(choice.connectionId);
    if (!connection) continue;
    if (connection.fromId !== branchMomentId) continue;
    if (!connection.toId) continue;
    resolved.push({
      id: choice.id,
      label: choice.label,
      description: choice.description,
      continuationMomentId: connection.toId,
    });
  }
  return resolved;
}

/**
 * Report every way a declared Branch violates the topology contract.
 * Returns an empty array when the Branch is truthful.
 */
export function validateBranchTopology(
  branch: BranchDeclaration,
  connections: readonly BranchConnection[],
  momentIds?: readonly string[],
): readonly string[] {
  const problems: string[] = [];
  const byId = new Map(connections.map((c) => [c.id, c]));
  const knownMoments = momentIds ? new Set(momentIds) : null;

  if (knownMoments && !knownMoments.has(branch.fromMomentId)) {
    problems.push(`branch ${branch.id}: declared fromMomentId is not on the path: ${branch.fromMomentId}`);
  }
  if (branch.choices.length < MIN_BRANCH_CHOICES) {
    problems.push(`branch ${branch.id}: needs at least ${MIN_BRANCH_CHOICES} choices, has ${branch.choices.length}`);
  }

  const seenChoiceIds = new Set<string>();
  const seenDestinations = new Set<string>();
  for (const choice of branch.choices) {
    if (seenChoiceIds.has(choice.id)) {
      problems.push(`branch ${branch.id}: duplicate choice id ${choice.id}`);
    }
    seenChoiceIds.add(choice.id);

    const connection = byId.get(choice.connectionId);
    if (!connection) {
      problems.push(`branch ${branch.id} choice ${choice.id}: unknown connectionId ${choice.connectionId}`);
      continue;
    }
    if (connection.fromId !== branch.fromMomentId) {
      problems.push(
        `branch ${branch.id} choice ${choice.id}: connection ${connection.id} originates at ${connection.fromId}, not at the declared branch Moment ${branch.fromMomentId}`,
      );
    }
    if (!connection.toId) {
      problems.push(`branch ${branch.id} choice ${choice.id}: connection ${connection.id} has no destination`);
      continue;
    }
    if (knownMoments && !knownMoments.has(connection.toId)) {
      problems.push(
        `branch ${branch.id} choice ${choice.id}: destination ${connection.toId} is not on the path`,
      );
    }
    if (seenDestinations.has(connection.toId)) {
      problems.push(`branch ${branch.id} choice ${choice.id}: destination ${connection.toId} duplicates another choice`);
    }
    seenDestinations.add(connection.toId);
  }

  return problems;
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

/** True when the resolved choices are enough to hand an explicit decision to the reader. */
export function canOfferBranch(choices: readonly BranchChoice[]): boolean {
  if (choices.length < MIN_BRANCH_CHOICES) return false;
  return choices.every((choice) => choice.continuationMomentId.length > 0);
}

export function getChoiceById(state: BranchState, choiceId: string): BranchChoice | undefined {
  return state.choices.find((c) => c.id === choiceId);
}

export function selectBranchChoice(state: BranchState, choiceId: string): BranchState {
  const choice = state.choices.find((c) => c.id === choiceId);
  if (!choice) return state;
  if (!choice.continuationMomentId) return state;
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

/**
 * Destination the Story must land on after an explicit choice.
 * Returns null while the Branch is unresolved, so no caller can infer a
 * destination from an unmade decision.
 */
export function getResolvedContinuationMomentId(state: BranchState): string | null {
  const choice = getSelectedChoice(state);
  if (!choice) return null;
  return choice.continuationMomentId || null;
}

/**
 * Consume a resolved Branch. Once the landing is committed the Branch must stop
 * blocking the Story, otherwise `resolved` keeps the transport parked forever.
 */
export function consumeBranchState(state: BranchState | null): BranchState | null {
  if (!state) return null;
  if (!state.resolved) return state;
  return null;
}

/** True while the Branch must block Story scheduling (awaiting an explicit choice). */
export function isBranchBlocking(state: BranchState | null): boolean {
  if (!state) return false;
  return state.active && !state.resolved;
}
