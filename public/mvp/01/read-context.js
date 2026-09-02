function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function contextError(code, message) {
  const error = new Error(message);
  error.name = 'Mvp001ReadContextError';
  error.code = code;
  return error;
}

export async function loadMvp001ReadContext({ client, treeId, selectedMemoryId = null, signal } = {}) {
  if (!client || typeof client.getTree !== 'function' || typeof client.getTreeMemories !== 'function' || typeof client.getMemory !== 'function') {
    throw new TypeError('client must implement the MVP001 read-client contract');
  }
  if (!isNonEmptyString(treeId)) throw new TypeError('treeId must be a non-empty string');
  if (selectedMemoryId !== null && !isNonEmptyString(selectedMemoryId)) {
    throw new TypeError('selectedMemoryId must be null or a non-empty string');
  }

  const tree = await client.getTree(treeId, { signal });
  const memories = await client.getTreeMemories(treeId, { limit: 200, signal });

  let selectedMemory = null;
  if (selectedMemoryId !== null) {
    selectedMemory = await client.getMemory(selectedMemoryId, { signal });
    if (selectedMemory.treeId !== treeId) {
      throw contextError(
        'SELECTED_MEMORY_TREE_MISMATCH',
        'Selected memory does not belong to the requested tree',
      );
    }
  }

  return Object.freeze({ tree, memories, selectedMemory });
}
