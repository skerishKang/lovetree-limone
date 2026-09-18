export function expandRecipeMatrix(matrix) {
  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) {
    throw new Error('RECIPE_MATRIX_REQUIRED');
  }
  if (typeof matrix.sourceId !== 'string' || !/^SRC\d{3}$/.test(matrix.sourceId)) {
    throw new Error('RECIPE_MATRIX_SOURCE_ID_INVALID');
  }
  if (typeof matrix.recipeVersion !== 'string' || matrix.recipeVersion.length === 0) {
    throw new Error('RECIPE_MATRIX_VERSION_REQUIRED');
  }
  if (!Array.isArray(matrix.viewports) || matrix.viewports.length === 0) {
    throw new Error('RECIPE_MATRIX_VIEWPORTS_REQUIRED');
  }
  if (!Array.isArray(matrix.states) || matrix.states.length === 0) {
    throw new Error('RECIPE_MATRIX_STATES_REQUIRED');
  }

  const recipes = [];
  for (const viewport of matrix.viewports) {
    if (!viewport || !Number.isInteger(viewport.width) || !Number.isInteger(viewport.height)) {
      throw new Error('RECIPE_MATRIX_VIEWPORT_INVALID');
    }
    for (const state of matrix.states) {
      if (!state || typeof state.stateId !== 'string' || state.stateId.length === 0) {
        throw new Error('RECIPE_MATRIX_STATE_INVALID');
      }
      recipes.push({
        sourceId: matrix.sourceId,
        recipeVersion: matrix.recipeVersion,
        viewport: structuredClone(viewport),
        stateId: state.stateId,
        preconditions: [],
        actions: structuredClone(state.actions ?? []),
        settleCondition: {},
        assertions: structuredClone(state.assertions ?? []),
        screenshots: structuredClone(state.screenshots ?? []),
        runtimeHook: structuredClone(state.runtimeHook),
        allowedTolerance: structuredClone(matrix.allowedTolerance),
        timeouts: structuredClone(matrix.timeouts),
        notes: `${matrix.notes ?? ''} viewport=${viewport.width}x${viewport.height}; state=${state.stateId}`.trim(),
      });
    }
  }
  return recipes;
}
