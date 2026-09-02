/**
 * MVP001 — SRC058 Living Memory Pinboard presentation adapter.
 *
 * Bridges Product read context {tree, memories, selectedMemory}
 * into SRC058 native pinboard projection without turning SRC058 into
 * Product logic and without touching its board geometry/CSS.
 *
 * - Deterministic, read-only, framework-neutral pure functions
 * - No DOM, no fetch, no Firebase, no DB, no Product route ownership
 * - Preserves board pan/zoom/cinema/thread SVG and welcome/private copy
 * - Handles empty presentation fields, fails closed on malformed identity
 * - Source-anchored layout: initial 7 frozen + native addition formula for >=7
 */

const TYPE_MAP = Object.freeze({
  youtube: 'youtube',
  video: 'video',
  image: 'photo',
  photo: 'photo',
  link: 'link',
  note: 'note',
  text: 'note',
});

const LT_PIN_STYLES = Object.freeze(['pearl', 'crystal', 'flower', 'heart', 'star', 'magnet', 'disc']);
const LT_CARD_STYLES = Object.freeze(['photo', 'postit', 'memo', 'rounded', 'film', 'ticket']);

// Frozen initial 7 native positions — extracted from public/mvp/01/surfaces/src058/script.js let moments=[
const INITIAL_POSITIONS = Object.freeze([
  Object.freeze({ x: 210, y: 255, rot: -4, color: 'rose' }),
  Object.freeze({ x: 535, y: 175, rot: 3, color: 'violet' }),
  Object.freeze({ x: 900, y: 245, rot: -2, color: 'cyan' }),
  Object.freeze({ x: 1175, y: 400, rot: 4, color: 'rose' }),
  Object.freeze({ x: 820, y: 595, rot: 2, color: 'violet' }),
  Object.freeze({ x: 390, y: 610, rot: -3, color: 'cyan' }),
  Object.freeze({ x: 1120, y: 690, rot: -2, color: 'amber' }),
]);

function isPlainObject(v) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.length > 0;
}

function requireIdentity(v, label) {
  if (!isPlainObject(v) || !isNonEmptyString(v.id)) {
    const e = new Error(`${label} is missing a valid id`);
    e.name = 'Src058AdapterError';
    e.code = 'INVALID_IDENTITY';
    throw e;
  }
  if (v.treeId !== undefined && !isNonEmptyString(v.treeId)) {
    const e = new Error(`${label}.treeId is missing a valid id`);
    e.name = 'Src058AdapterError';
    e.code = 'INVALID_IDENTITY';
    throw e;
  }
  return v;
}

function mapMediaType(sourceType) {
  if (!sourceType) return 'photo';
  const k = String(sourceType).trim().toLowerCase();
  return TYPE_MAP[k] || 'photo';
}

function mapEmotion(tags) {
  if (Array.isArray(tags) && tags.length > 0) {
    const first = tags.find((v) => isNonEmptyString(v));
    if (first) return first;
  }
  return '기록';
}

function mapDate(m) {
  const raw = m.discoveryDate || m.timestamp || '';
  return typeof raw === 'string' ? raw : String(raw ?? '');
}

function mapPrivacy(visibility) {
  const v = String(visibility || '').trim().toLowerCase();
  if (v === 'public') return 'PUBLIC';
  if (v === 'unlisted') return 'UNLISTED';
  if (v === 'private') return 'PRIVATE';
  return 'PRIVATE';
}

function positionForIndex(index) {
  if (index < INITIAL_POSITIONS.length) {
    return INITIAL_POSITIONS[index];
  }
  // Native addition algorithm from script.js confirmAdd(): x=620+(moments.length%3)*120, y=360+(moments.length%2)*100, rot=[-4,3,-2,4,2][...%5], color=['rose','violet','cyan','amber'][...%4]
  const x = 620 + (index % 3) * 120;
  const y = 360 + (index % 2) * 100;
  const rot = [-4, 3, -2, 4, 2][index % 5];
  const color = ['rose', 'violet', 'cyan', 'amber'][index % 4];
  return { x, y, rot, color };
}

function isYtMoment(type, sourceUrl) {
  if (String(type).toLowerCase() === 'youtube') return true;
  const url = String(sourceUrl || '');
  return url.includes('youtube.com') || url.includes('youtu.be');
}

export function projectMemoryToSrc058Moment(memory, index, allMemories) {
  requireIdentity(memory, 'Memory');
  if (!isNonEmptyString(memory.treeId)) {
    const e = new Error('Memory.treeId is missing a valid id');
    e.name = 'Src058AdapterError';
    e.code = 'INVALID_IDENTITY';
    throw e;
  }
  for (const f of ['title', 'sourceUrl', 'thumbnail', 'timestamp']) {
    if (memory[f] !== undefined && typeof memory[f] !== 'string') {
      const e = new Error(`Memory ${f} must be a string when present`);
      e.name = 'Src058AdapterError';
      e.code = 'INVALID_RESPONSE';
      throw e;
    }
  }

  const pos = positionForIndex(index);
  const mediaType = mapMediaType(memory.sourceType);
  // Preserve native type for YouTube (isYtMoment)
  const type = mediaType === 'video' && isYtMoment(memory.sourceType, memory.sourceUrl) ? 'youtube' : mediaType;

  return {
    id: memory.id,
    type,
    title: memory.title ?? '',
    emotion: mapEmotion(memory.emotionTags),
    date: mapDate(memory),
    source: memory.artist || memory.channelName || memory.source || '',
    memo: memory.memo ?? '',
    x: pos.x,
    y: pos.y,
    rot: pos.rot,
    color: pos.color,
    asset: null,
    first: index === 0,
    // Media presentation: keep Source-native URL contract via originalUrl = sourceUrl || url
    url: memory.sourceUrl || '',
    sourceUrl: memory.sourceUrl || '',
    video: type === 'video' ? memory.sourceUrl || null : null,
    videoSource: type === 'youtube' ? 'youtube' : null,
    videoId: null,
    duration: '',
    thumbnailUrl: memory.thumbnail || '',
    keywords: [],
    pinStyle: LT_PIN_STYLES[index % LT_PIN_STYLES.length],
    cardStyle: LT_CARD_STYLES[index % LT_CARD_STYLES.length],
    privacy: mapPrivacy(memory.visibility),
    createdOrder: index + 1,
  };
}

/**
 * Projects Product read context into SRC058 native pinboard contract.
 *
 * moments = projection of getTreeMemories() list (dynamic board, no fixed cap)
 * selectedMoment = independent projection of selectedMemory or null
 *
 * Unlisted/out-of-window selected remains absent from moments by design.
 *
 * @param {{ tree: object, memories: object[], selectedMemory: object | null }} context
 * @returns {{ moments: object[], connections: object[], selectedId: string | null, selectedMoment: object | null }}
 */
export function projectMvp001ContextToSrc058(context) {
  if (!isPlainObject(context)) {
    const e = new Error('context must be a plain object');
    e.name = 'Src058AdapterError';
    e.code = 'INVALID_CONTEXT';
    throw e;
  }
  const { tree, memories, selectedMemory } = context;
  requireIdentity(tree, 'Tree');
  if (!Array.isArray(memories)) {
    const e = new Error('memories must be an array');
    e.name = 'Src058AdapterError';
    e.code = 'INVALID_RESPONSE';
    throw e;
  }

  const moments = memories.map((m, idx) => projectMemoryToSrc058Moment(m, idx, memories));

  // Product connections remain empty for read-only MVP; fixture connections are source-presentation only
  const connections = [];

  let selectedId = null;
  let selectedMoment = null;
  if (selectedMemory !== null && selectedMemory !== undefined) {
    requireIdentity(selectedMemory, 'SelectedMemory');
    if (selectedMemory.treeId !== tree.id) {
      const e = new Error('selected memory does not belong to the requested tree');
      e.name = 'Src058AdapterError';
      e.code = 'SELECTED_MEMORY_TREE_MISMATCH';
      throw e;
    }
    selectedId = selectedMemory.id;
    const existing = moments.find((c) => c.id === selectedMemory.id);
    if (existing) {
      selectedMoment = existing;
    } else {
      const standalone = projectMemoryToSrc058Moment(selectedMemory, moments.length, [...memories, selectedMemory]);
      standalone.first = false;
      selectedMoment = standalone;
    }
  }

  return { moments, connections, selectedId, selectedMoment };
}

export function createSrc058InjectionSeam() {
  return {
    describe: () => ({
      fixturePreserved: true,
      seam: 'projectMvp001ContextToSrc058 + optional DOM applier',
      note: 'Board geometry/CSS/RAF untouched; call adapter and feed result to SRC058 pinboard path; welcome/private copy preserved',
    }),
  };
}
