/**
 * MVP001 — SRC060 Deep Exploration presentation adapter.
 *
 * Bridges Product read context {tree, memories, selectedMemory}
 * into an SRC060 exploration projection without turning SRC060 into
 * Product logic and without touching its 3D canvas geometry/CSS.
 *
 * Canonical relationship authority (first-beta contract, shared with SRC056):
 *   Memory.parentId + Memory.connectionReason
 * No new relationship table. No DB/schema/backend mutation.
 *
 * - Deterministic, read-only, framework-neutral pure functions
 * - No DOM, no fetch, no Firebase, no DB, no browser storage, no new-tab
 *   navigation targets, no write
 * - Canonical edge exists ONLY when child.parentId references another
 *   ordinary listed Memory in the same Tree (kind 'parent')
 * - NEVER infers edges from array order, title, memo, date, emotion,
 *   sourceType, media, artist/source/channel, keyword similarity, distance,
 *   proximity, fixture cluster, fixture bridge, or fixture path
 * - Frozen Source geometry (9 semantic clusters, 1000 fixture nodes,
 *   local/context/bridge topologies, historical track handoffs) is NEVER
 *   canonical truth; geometry slots below are neutral, positional, and
 *   flagged viewDerived: true
 * - Handles empty presentation fields, fails closed on malformed identity
 * - Selected unlisted/out-of-window Memory stays independent without
 *   leaking into the ordinary node list, search results, or unseen-data edges
 */

const RING_SIZE = 9;
const GOLDEN_ANGLE = 2.399963229728653;
const BASE_RADIUS = 120;
const RING_STEP = 46;

// Fixed neutral slot palette, indexed by layout slot k ONLY — never by
// Memory content. These are positional paint slots, not semantic meaning.
const SLOT_COLORS = Object.freeze([
  '#8a7f8c',
  '#7c8ba0',
  '#8a9a8b',
  '#a08b7c',
  '#93849a',
  '#7c9aa0',
  '#9a8b93',
  '#84947f',
  '#8f8577',
]);

// Media presentation mapping follows the accepted adapter precedent:
// Memory.sourceType is media-type authority (youtube -> youtube,
// video -> video). No URL inference.
const MEDIA_MAP = Object.freeze({
  youtube: 'youtube',
  video: 'video',
  image: 'photo',
  photo: 'photo',
  link: 'link',
  note: 'note',
  text: 'note',
  collage: 'collage',
});

function adapterError(code, message) {
  const e = new Error(message);
  e.name = 'Src060AdapterError';
  e.code = code;
  return e;
}

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
    throw adapterError('INVALID_IDENTITY', `${label} is missing a valid id`);
  }
  return v;
}

function mapMediaType(sourceType) {
  if (!sourceType) return 'photo';
  const k = String(sourceType).trim().toLowerCase();
  return MEDIA_MAP[k] || 'photo';
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

function normalizeParentId(memory) {
  const p = memory.parentId;
  if (p === undefined || p === null) return null;
  if (!isNonEmptyString(p)) {
    throw adapterError('INVALID_RESPONSE', 'Memory parentId must be a non-empty string when present');
  }
  return p;
}

function normalizeConnectionReason(memory) {
  const r = memory.connectionReason;
  if (r === undefined || r === null) return null;
  if (typeof r !== 'string') {
    throw adapterError('INVALID_RESPONSE', 'Memory connectionReason must be a string when present');
  }
  return r;
}

/**
 * Neutral deterministic geometry-slot assignment by list position ONLY.
 * Content-independent: the same index always yields the same slot, so slots
 * can never classify a Memory by title/memo/emotion/date/sourceType/content.
 * Nine slots per ring (ring layout only — NOT the nine Source clusters);
 * rings spiral outward with a golden-angle step, z bands by ring, fixed
 * neutral radius, fixed palette color by slot k. viewClusterIndex is a layout
 * slot index and MUST NOT be read as Source cluster identity.
 */
export function slotForIndex(index) {
  const ring = Math.floor(index / RING_SIZE);
  const k = index % RING_SIZE;
  const ang = k * ((2 * Math.PI) / RING_SIZE) + ring * GOLDEN_ANGLE;
  const rad = BASE_RADIUS + ring * RING_STEP;
  return {
    x: Math.round(Math.cos(ang) * rad),
    y: Math.round(Math.sin(ang) * rad * 0.8),
    z: (ring % 3 - 1) * 60,
    r: 5,
    color: SLOT_COLORS[k],
    slotIndex: index,
    viewClusterIndex: k,
  };
}

export function projectMemoryToSrc060Node(memory, index) {
  requireIdentity(memory, 'Memory');
  if (!isNonEmptyString(memory.treeId)) {
    throw adapterError('INVALID_IDENTITY', 'Memory.treeId is missing a valid id');
  }
  for (const f of ['title', 'memo', 'sourceUrl', 'thumbnail', 'timestamp', 'discoveryDate', 'artist', 'source', 'channelName']) {
    if (memory[f] !== undefined && typeof memory[f] !== 'string') {
      throw adapterError('INVALID_RESPONSE', `Memory ${f} must be a string when present`);
    }
  }
  const parentId = normalizeParentId(memory);
  const connectionReason = normalizeConnectionReason(memory);
  let emotionTags = [];
  if (memory.emotionTags !== undefined) {
    if (!Array.isArray(memory.emotionTags)) {
      throw adapterError('INVALID_RESPONSE', 'Memory emotionTags must be an array when present');
    }
    emotionTags = memory.emotionTags;
  }

  const slot = slotForIndex(index);

  return {
    id: memory.id,
    treeId: memory.treeId,
    title: memory.title ?? '',
    memo: memory.memo ?? '',
    media: mapMediaType(memory.sourceType),
    source: memory.artist || memory.channelName || memory.source || '',
    channelName: memory.channelName ?? '',
    sourceUrl: memory.sourceUrl || '',
    thumbnail: memory.thumbnail || '',
    date: mapDate(memory),
    emotionTags,
    privacy: mapPrivacy(memory.visibility),
    parentId,
    connectionReason,
    whyNext: connectionReason ?? '',
    isRoot: parentId === null,
    canonicalDepth: null,
    x: slot.x,
    y: slot.y,
    z: slot.z,
    r: slot.r,
    color: slot.color,
    slotIndex: slot.slotIndex,
    viewClusterIndex: slot.viewClusterIndex,
    // viewDerived flags the GEOMETRY-SLOT fields above (x/y/z/r/color/slotIndex/
    // viewClusterIndex) as presentation-only. Identity/content fields remain
    // canonical Product data. No clusterName/pathLabel/fixtureWhy is exported.
    viewDerived: true,
  };
}

function computeCanonicalDepths(nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const node of nodes) {
    let depth = 0;
    let current = node.parentId;
    const visited = new Set();
    while (current !== null && byId.has(current) && !visited.has(current)) {
      visited.add(current);
      depth++;
      current = byId.get(current).parentId;
    }
    node.canonicalDepth = depth;
  }
}

/**
 * Projects Product read context into the SRC060 exploration contract.
 *
 * nodes = projection of memories[] only (ordinary listed Memories).
 * edges = canonical parent edges only: one edge per child whose parentId
 *   references another ordinary listed Memory in the same Tree.
 * viewDerivedEdges = [] in this Slice: fixture local/context/bridge
 *   topologies are never Product truth.
 * selectedNode = independent projection of selectedMemory or null; an
 *   unlisted/out-of-window selected Memory stays out of nodes[] and gains
 *   no edges from unseen list data.
 *
 * @param {{ tree: object, memories: object[], selectedMemory: object | null }} context
 * @returns {{ nodes: object[], edges: object[], viewDerivedEdges: object[], selectedId: string | null, selectedNode: object | null }}
 */
export function projectMvp001ContextToSrc060(context) {
  if (!isPlainObject(context)) {
    throw adapterError('INVALID_CONTEXT', 'context must be a plain object');
  }
  const { tree, memories, selectedMemory } = context;
  requireIdentity(tree, 'Tree');
  if (!Array.isArray(memories)) {
    throw adapterError('INVALID_RESPONSE', 'memories must be an array');
  }
  for (const m of memories) {
    requireIdentity(m, 'Memory');
    if (!isNonEmptyString(m.treeId)) {
      throw adapterError('INVALID_IDENTITY', 'Memory.treeId is missing a valid id');
    }
    if (m.treeId !== tree.id) {
      throw adapterError('MEMORY_TREE_MISMATCH', 'Memory does not belong to the requested tree');
    }
  }
  const seen = new Set();
  for (const m of memories) {
    if (seen.has(m.id)) {
      throw adapterError('DUPLICATE_ID', 'memories contains a duplicate Memory id');
    }
    seen.add(m.id);
  }

  const nodes = memories.map((m, idx) => projectMemoryToSrc060Node(m, idx));
  computeCanonicalDepths(nodes);
  const ids = new Set(nodes.map((n) => n.id));

  const edges = [];
  for (const node of nodes) {
    const p = node.parentId;
    if (p === null) continue;
    if (p === node.id) continue; // self-parent: keep node, drop edge (safe closed state)
    if (!ids.has(p)) continue; // dangling parent: keep node, drop edge, never synthesize
    edges.push({
      id: `rel:${p}::${node.id}`,
      from: p,
      to: node.id,
      kind: 'parent',
      reason: node.connectionReason ?? '',
      canonical: true,
      viewDerived: false,
    });
  }

  // Fixture local/context/bridge topologies are source-presentation only, never Product truth.
  const viewDerivedEdges = [];

  let selectedId = null;
  let selectedNode = null;
  if (selectedMemory !== null && selectedMemory !== undefined) {
    requireIdentity(selectedMemory, 'SelectedMemory');
    if (selectedMemory.treeId !== tree.id) {
      throw adapterError('SELECTED_MEMORY_TREE_MISMATCH', 'selected memory does not belong to the requested tree');
    }
    selectedId = selectedMemory.id;
    const existing = nodes.find((n) => n.id === selectedMemory.id);
    if (existing) {
      selectedNode = existing;
    } else {
      const standalone = projectMemoryToSrc060Node(selectedMemory, nodes.length);
      standalone.canonicalDepth = null; // depth unknown without list context; never infer from unseen data
      selectedNode = standalone;
    }
  }

  return { nodes, edges, viewDerivedEdges, selectedId, selectedNode };
}

/**
 * Canonical-field search over projected nodes ONLY.
 * Matches a case-insensitive substring against title, memo, source display,
 * channelName, emotionTags, date, and media. Never touches fixture keyword/
 * person/cluster catalogs (those do not exist in projected nodes).
 * Returns canonical node ids in list order.
 */
export function searchSrc060Nodes(nodes, query) {
  if (!Array.isArray(nodes)) {
    throw adapterError('INVALID_RESPONSE', 'nodes must be an array');
  }
  if (!isNonEmptyString(query) || query.trim().length === 0) {
    throw adapterError('INVALID_QUERY', 'query must be a non-empty string');
  }
  const q = query.trim().toLowerCase();
  const hits = [];
  for (const n of nodes) {
    if (!isPlainObject(n) || !isNonEmptyString(n.id)) {
      throw adapterError('INVALID_RESPONSE', 'nodes must contain projected nodes with valid ids');
    }
    const hay = [
      n.title,
      n.memo,
      n.source,
      n.channelName,
      Array.isArray(n.emotionTags) ? n.emotionTags.join(' ') : '',
      n.date,
      n.media,
    ]
      .filter((v) => typeof v === 'string')
      .join(' ')
      .toLowerCase();
    if (hay.includes(q)) hits.push(n.id);
  }
  return hits;
}

export function createSrc060InjectionSeam() {
  return {
    describe: () => ({
      fixturePreserved: true,
      seam: 'projectMvp001ContextToSrc060 + optional DOM applier',
      note: '3D canvas geometry/CSS untouched; call adapter and feed result to SRC060 exploration path; fixture clusters/bridges/handoffs preserved as presentation only',
    }),
  };
}
