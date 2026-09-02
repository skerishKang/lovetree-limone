/**
 * MVP001 Slice — SRC064 (Welcome / Memory Orbit) presentation adapter.
 *
 * Bridges Product read context {tree, memories, selectedMemory}
 * into SRC064 native CARD projection without turning SRC064 into Product logic
 * and without touching its visual/CSS/geometry/RAF.
 *
 * - Deterministic
 * - Read-only (no network, no mutation, no datastore, no auth SDK)
 * - Framework-neutral pure functions
 * - Preserves welcome copy and orbit geometry
 * - Handles empty presentation fields, fails closed on malformed identity
 */

const RING_ORDER = Object.freeze(['main', 'inner', 'outer', 'upper', 'lower']);
const TYPE_MAP = Object.freeze({
  youtube: 'video',
  video: 'video',
  image: 'photo',
  photo: 'photo',
  link: 'link',
  text: 'memo',
  memo: 'memo',
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
    err.name = 'Src064AdapterError';
    err.code = 'INVALID_IDENTITY';
    throw err;
  }
  if (value.treeId !== undefined && !isNonEmptyString(value.treeId)) {
    const err = new Error(`${label}.treeId is missing a valid id`);
    err.name = 'Src064AdapterError';
    err.code = 'INVALID_IDENTITY';
    throw err;
  }
  return value;
}

function mapMediaType(sourceType) {
  if (!sourceType) return 'photo';
  const k = String(sourceType).trim().toLowerCase();
  return TYPE_MAP[k] || 'photo';
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

function ringForIndex(index) {
  return RING_ORDER[index % RING_ORDER.length];
}

function cardBaseFromIndex(index) {
  // Deterministic geometry defaults; preserves orbit distribution without hard-coding original values
  const ring = ringForIndex(index);
  const baseAngle = (index * 0.7853981633974483) % (Math.PI * 2); // 45deg steps
  const phaseOffset = (index * 0.13) % 1;
  const zOffset = ((index % 5) - 2) * 28;
  const tiltX = ((index % 3) - 1) * 6.4;
  const tiltY = ((index % 5) - 2) * 4.2;
  const tiltZ = ((index % 7) - 3) * 1.8;
  return { ring, baseAngle, phaseOffset, zOffset, tiltX, tiltY, tiltZ };
}

export function projectMemoryToSrc064Card(memory, index, allMemories) {
  requireIdentity(memory, 'Memory');
  if (!isNonEmptyString(memory.treeId)) {
    const err = new Error('Memory.treeId is missing a valid id');
    err.name = 'Src064AdapterError';
    err.code = 'INVALID_IDENTITY';
    throw err;
  }
  for (const field of ['title', 'sourceUrl', 'thumbnail', 'timestamp']) {
    if (memory[field] !== undefined && typeof memory[field] !== 'string') {
      const err = new Error(`Memory ${field} must be a string when present`);
      err.name = 'Src064AdapterError';
      err.code = 'INVALID_RESPONSE';
      throw err;
    }
  }

  const nextId = allMemories[index + 1]?.id ?? null;
  const geo = cardBaseFromIndex(index);
  const mediaType = mapMediaType(memory.sourceType);

  return {
    id: memory.id,
    type: mediaType,
    mediaType,
    title: memory.title ?? '',
    image: memory.thumbnail ?? '',
    ring: geo.ring,
    baseAngle: geo.baseAngle,
    phaseOffset: geo.phaseOffset,
    zOffset: geo.zOffset,
    tiltX: geo.tiltX,
    tiltY: geo.tiltY,
    tiltZ: geo.tiltZ,
    sizeClass: 'sm',
    date: mapDate(memory),
    emotion: mapEmotion(memory.emotionTags),
    whyNext: memory.connectionReason ?? '',
    first: index === 0,
    important: false,
    source: memory.source ?? '',
    duration: '',
    memo: memory.memo ?? '',
    next: nextId,
    branch: null,
    fitMode: 'cover',
    objectPosition: '50% 50%',
    focalPoint: '50% 48%',
    externalUrl: memory.sourceUrl ?? null,
    viewerFitMode: 'contain',
    viewerObjectPosition: '50% 50%',
    curated: false,
    curationClass: 'portrait',
    gender: 'female',
    assetSource: 'PRODUCT MEDIA',
  };
}

/**
 * Projects Product read context into SRC064 native contract.
 *
 * cards = projection of getTreeMemories() only (40 max, here up to 200)
 * selectedCard = independent projection of selectedMemory, or null
 * selectedCardId = selectedCard?.id ?? null
 *
 * Unlisted selectedMemory remains absent from cards by design.
 *
 * @param {{ tree: object, memories: object[], selectedMemory: object | null }} context
 * @returns {{ cards: object[], selectedCard: object | null, selectedCardId: string | null, focusedCard: object | null, focusedId: string | null }}
 */
export function projectMvp001ContextToSrc064(context) {
  if (!isPlainObject(context)) {
    const err = new Error('context must be a plain object');
    err.name = 'Src064AdapterError';
    err.code = 'INVALID_CONTEXT';
    throw err;
  }
  const { tree, memories, selectedMemory } = context;
  requireIdentity(tree, 'Tree');
  if (!Array.isArray(memories)) {
    const err = new Error('memories must be an array');
    err.name = 'Src064AdapterError';
    err.code = 'INVALID_RESPONSE';
    throw err;
  }

  const cards = memories.map((m, idx) => projectMemoryToSrc064Card(m, idx, memories));

  let selectedCard = null;
  let selectedCardId = null;
  let focusedCard = null;
  let focusedId = null;

  if (selectedMemory !== null && selectedMemory !== undefined) {
    requireIdentity(selectedMemory, 'SelectedMemory');
    if (selectedMemory.treeId !== tree.id) {
      const err = new Error('selected memory does not belong to the requested tree');
      err.name = 'Src064AdapterError';
      err.code = 'SELECTED_MEMORY_TREE_MISMATCH';
      throw err;
    }
    selectedCardId = selectedMemory.id;
    focusedId = selectedMemory.id;
    const existing = cards.find((c) => c.id === selectedMemory.id);
    if (existing) {
      selectedCard = existing;
      focusedCard = existing;
    } else {
      selectedCard = projectMemoryToSrc064Card(selectedMemory, 0, [selectedMemory]);
      focusedCard = selectedCard;
    }
  }

  return { cards, selectedCard, selectedCardId, focusedCard, focusedId };
}

export function createSrc064InjectionSeam() {
  return {
    describe: () => ({
      fixturePreserved: true,
      seam: 'projectMvp001ContextToSrc064 + optional DOM applier',
      note: 'Source geometry/CSS/RAF untouched; call adapter and feed result to SRC064 orbit path; welcome copy preserved',
    }),
  };
}
