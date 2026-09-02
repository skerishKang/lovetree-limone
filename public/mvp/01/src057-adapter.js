/**
 * MVP001 Slice D — SRC057 (Living Glass Moment Cards) presentation adapter.
 *
 * Bridges the Slice C real read context
 *   { tree, memories, selectedMemory }
 * into the SRC057 native moment projection without turning SRC057 into
 * Product/business logic and without touching its visual/CSS/geometry.
 *
 * - Deterministic
 * - Read-only (no network, no mutation, no datastore, no auth SDK)
 * - Framework-neutral pure function + optional DOM seam
 * - Preserves SRC057 geometry/behavior
 * - Handles empty presentation fields and fails closed on malformed identity
 */

const TONE_PALETTE = Object.freeze(['#8f6bff', '#e564a4', '#e39a47', '#4fb3ff', '#7ce3a8']);
const SOURCE_TYPE_TO_MEDIA_KIND = Object.freeze({
  youtube: 'youtube',
  video: 'video',
  image: 'image',
  link: 'link',
  text: 'text',
});
const VISIBILITY_TO_PRIVACY = Object.freeze({
  public: '전체 공개',
  unlisted: '링크 공개',
  private: '나만 보기',
});

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function requireIdentity(value, label) {
  if (!isPlainObject(value) || !isNonEmptyString(value.id)) {
    const err = new Error(`${label} is missing a valid id`);
    err.name = 'Src057AdapterError';
    err.code = 'INVALID_IDENTITY';
    throw err;
  }
  if (value.treeId !== undefined && !isNonEmptyString(value.treeId)) {
    const err = new Error(`${label}.treeId is missing a valid id`);
    err.name = 'Src057AdapterError';
    err.code = 'INVALID_IDENTITY';
    throw err;
  }
  return value;
}

function mapMediaKind(sourceType) {
  if (!sourceType) return 'link';
  const normalized = String(sourceType).trim().toLowerCase();
  return SOURCE_TYPE_TO_MEDIA_KIND[normalized] || 'link';
}

function mapPrivacy(visibility) {
  if (!visibility) return '링크 공개';
  const key = String(visibility).trim().toLowerCase();
  return VISIBILITY_TO_PRIVACY[key] || String(visibility);
}

function mapEmotion(emotionTags) {
  if (Array.isArray(emotionTags) && emotionTags.length > 0) {
    const first = emotionTags.find((v) => isNonEmptyString(v));
    if (first) return first;
  }
  return '기록';
}

function mapDate(memory) {
  const raw = memory.discoveryDate || memory.timestamp || '';
  return typeof raw === 'string' ? raw : String(raw ?? '');
}

function toneForIndex(index, id) {
  if (isNonEmptyString(id)) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return TONE_PALETTE[hash % TONE_PALETTE.length];
  }
  return TONE_PALETTE[index % TONE_PALETTE.length];
}

/**
 * Projects a single Product Memory into an SRC057 moment shape.
 * Consumed fields are a strict subset of the Product contract; empty
 * presentation strings remain valid.
 */
export function projectMemoryToSrc057Moment(memory, index, allMemories) {
  requireIdentity(memory, 'Memory');
  if (!isNonEmptyString(memory.treeId)) {
    const err = new Error('Memory.treeId is missing a valid id');
    err.name = 'Src057AdapterError';
    err.code = 'INVALID_IDENTITY';
    throw err;
  }
  // Minimal structural checks for presentation fields when present
  for (const field of ['title', 'sourceUrl', 'thumbnail', 'timestamp']) {
    if (memory[field] !== undefined && typeof memory[field] !== 'string') {
      const err = new Error(`Memory ${field} must be a string when present`);
      err.name = 'Src057AdapterError';
      err.code = 'INVALID_RESPONSE';
      throw err;
    }
  }

  const nextId = allMemories[index + 1]?.id ?? null;

  return {
    id: memory.id,
    label: `MOMENT ${String(index + 1).padStart(2, '0')}`,
    title: memory.title ?? '',
    date: mapDate(memory),
    emotion: mapEmotion(memory.emotionTags),
    tone: toneForIndex(index, memory.id),
    mediaKind: mapMediaKind(memory.sourceType),
    thumbnailUrl: memory.thumbnail ?? '',
    mediaUrl: memory.sourceUrl ?? '',
    sourceUrl: memory.sourceUrl ?? '',
    sourceLabel: memory.artist || memory.channelName || memory.source || mapMediaKind(memory.sourceType).toUpperCase(),
    startSeconds: typeof memory.videoOffsetSeconds === 'number' ? memory.videoOffsetSeconds : 0,
    note: memory.memo ?? '',
    privacy: mapPrivacy(memory.visibility),
    next: nextId,
    why: memory.connectionReason ?? '',
    posterProvenance: 'PRODUCT MEDIA',
  };
}

/**
 * Projects the full Product read context into SRC057's presentation contract.
 *
 * Moments are the projection of getTreeMemories() only.
 * selectedMoment is the independent projection of getMemory(selectedMemoryId),
 * or null. An unlisted selectedMemory remains absent from moments by design
 * (LIST visibility vs DIRECT SELECTED visibility are separate) while still
 * being representable as selectedMoment.
 *
 * @param {{ tree: object, memories: object[], selectedMemory: object | null }} context
 * @returns {{ moments: object[], selectedMoment: object | null, selectedMomentId: string | null }}
 */
export function projectMvp001ContextToSrc057(context) {
  if (!isPlainObject(context)) {
    const err = new Error('context must be a plain object');
    err.name = 'Src057AdapterError';
    err.code = 'INVALID_CONTEXT';
    throw err;
  }
  const { tree, memories, selectedMemory } = context;

  requireIdentity(tree, 'Tree');
  if (!Array.isArray(memories)) {
    const err = new Error('memories must be an array');
    err.name = 'Src057AdapterError';
    err.code = 'INVALID_RESPONSE';
    throw err;
  }

  const moments = memories.map((m, idx) => projectMemoryToSrc057Moment(m, idx, memories));

  let selectedMoment = null;
  let selectedMomentId = null;
  if (selectedMemory !== null && selectedMemory !== undefined) {
    requireIdentity(selectedMemory, 'SelectedMemory');
    if (selectedMemory.treeId !== tree.id) {
      const err = new Error('selected memory does not belong to the requested tree');
      err.name = 'Src057AdapterError';
      err.code = 'SELECTED_MEMORY_TREE_MISMATCH';
      throw err;
    }
    selectedMomentId = selectedMemory.id;
    // LIST visibility and DIRECT SELECTED visibility are separate.
    // Do NOT append an unlisted selectedMemory into moments.
    const existing = moments.find((m) => m.id === selectedMemory.id);
    if (existing) {
      selectedMoment = existing;
    } else {
      // Independent projection; not added to moments.
      selectedMoment = projectMemoryToSrc057Moment(selectedMemory, 0, [selectedMemory]);
    }
  }

  return { moments, selectedMoment, selectedMomentId };
}

/**
 * Bounded injection seam for the existing SRC057 runtime.
 *
 * The current SRC057 script exposes a hard-coded `moments` fixture and
 * `selectMoment` handler. This seam allows Product integration to supply real
 * data without rewriting the Source runtime. When no Product materialization
 * is supplied, the original fixture remains untouched.
 *
 * Future integration consumes { moments, selectedMoment, selectedMomentId }:
 * - moments for archive/grid/card set
 * - selectedMoment for direct detail/viewer rendering
 * - selectedMomentId for canonical Product selection state
 *
 * @param {{ moments: object[], selectedMoment: object | null, selectedMomentId: string | null }} projection
 * @returns {{ injected: boolean, reason?: string }}
 *
 * NOTE: This function is DOM-free. Actual DOM wiring is done by the caller.
 */
export function createSrc057InjectionSeam() {
  return {
    describe: () => ({
      fixturePreserved: true,
      seam: 'projectMvp001ContextToSrc057 + optional DOM applier',
      note: 'Source geometry/CSS untouched; call projectMvp001ContextToSrc057 and feed result to SRC057 render path',
    }),
  };
}
