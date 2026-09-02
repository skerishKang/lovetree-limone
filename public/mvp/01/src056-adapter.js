/**
 * MVP001 — SRC056 Relationship Graph presentation adapter.
 *
 * Bridges Product read context {tree, memories, selectedMemory}
 * into an SRC056 relationship/path projection without turning SRC056 into
 * Product logic and without touching its canvas geometry/CSS.
 *
 * Canonical relationship authority (first-beta contract):
 *   Memory.parentId + Memory.connectionReason
 * No new relationship table. No DB/schema/backend mutation.
 *
 * - Deterministic, read-only, framework-neutral pure functions
 * - No DOM, no fetch, no Firebase, no DB, no Product route ownership
 * - Canonical edge exists ONLY when child.parentId references another
 *   ordinary listed Memory in the same Tree (kind 'parent')
 * - NEVER infers edges from array order, date, emotion, title, sourceType,
 *   media type, geometry/proximity, or Source fixture topology
 * - Frozen Source geometry is reused ONLY as view-derived geometry slots
 *   (x/y/r/color/slotIndex/viewClusterIndex, flagged viewDerived: true);
 *   semantic cluster/path labels are NEVER exported as Product meaning
 * - Handles empty presentation fields, fails closed on malformed identity
 * - Selected unlisted/out-of-window Memory stays independent without
 *   leaking into the ordinary node list and without unseen-data edges
 */

const WORLD = Object.freeze({ w: 1700, h: 4800 });

// Frozen cluster-hub geometry slots — coordinates/colors ONLY, extracted from
// public/mvp/01/surfaces/src056/script.js CLUSTERS (x/y/color per hub).
// Hub names/subs/counts/branchAngles are fixture semantics and are NOT reused.
const CLUSTER_HUB_SLOTS = Object.freeze([
  Object.freeze({ x: 660, y: 610, color: '#e45d8d' }),
  Object.freeze({ x: 990, y: 1305, color: '#8b69e8' }),
  Object.freeze({ x: 705, y: 2060, color: '#2ca4c0' }),
  Object.freeze({ x: 1010, y: 2800, color: '#d49231' }),
  Object.freeze({ x: 690, y: 3540, color: '#3aa27c' }),
  Object.freeze({ x: 950, y: 4290, color: '#547cd0' }),
]);

const GOLDEN_ANGLE = 2.399963229728653;

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
});

function adapterError(code, message) {
  const e = new Error(message);
  e.name = 'Src056AdapterError';
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
 * Deterministic geometry-slot assignment by list position ONLY.
 * Content-independent: the same index always yields the same slot, so slots
 * can never classify a Memory by title/emotion/date/sourceType/content.
 * Ring 0 reuses the six frozen hub coordinates; further rings spiral outward
 * with a golden-angle step. r is a neutral marker radius (no level meaning).
 */
export function slotForIndex(index) {
  const hub = CLUSTER_HUB_SLOTS[index % CLUSTER_HUB_SLOTS.length];
  const ring = Math.floor(index / CLUSTER_HUB_SLOTS.length);
  if (ring === 0) {
    return {
      x: hub.x,
      y: hub.y,
      r: 6,
      color: hub.color,
      slotIndex: index,
      viewClusterIndex: index % CLUSTER_HUB_SLOTS.length,
    };
  }
  const ang = ring * GOLDEN_ANGLE;
  const rad = 26 + ring * 16;
  return {
    x: Math.round(hub.x + Math.cos(ang) * rad),
    y: Math.round(hub.y + Math.sin(ang) * rad * 0.8),
    r: 5,
    color: hub.color,
    slotIndex: index,
    viewClusterIndex: index % CLUSTER_HUB_SLOTS.length,
  };
}

export function projectMemoryToSrc056Node(memory, index) {
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
  const media = mapMediaType(memory.sourceType);

  return {
    id: memory.id,
    treeId: memory.treeId,
    title: memory.title ?? '',
    memo: memory.memo ?? '',
    media,
    source: memory.artist || memory.channelName || memory.source || '',
    sourceUrl: memory.sourceUrl || '',
    thumbnail: memory.thumbnail || '',
    date: mapDate(memory),
    emotionTags,
    privacy: mapPrivacy(memory.visibility),
    parentId,
    connectionReason,
    whyNext: connectionReason ?? '',
    isRoot: parentId === null,
    depth: null,
    x: slot.x,
    y: slot.y,
    r: slot.r,
    color: slot.color,
    slotIndex: slot.slotIndex,
    viewClusterIndex: slot.viewClusterIndex,
    // viewDerived flags the GEOMETRY-SLOT fields above (x/y/r/color/slotIndex/
    // viewClusterIndex) as presentation-only. Identity/content fields remain
    // canonical Product data. No clusterName/pathLabel/fixtureWhy is exported.
    viewDerived: true,
  };
}

function computeDepths(nodes) {
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
    node.depth = depth;
  }
}

/**
 * Projects Product read context into the SRC056 relationship contract.
 *
 * nodes = projection of memories[] only (ordinary listed Memories).
 * edges = canonical parent edges only: one edge per child whose parentId
 *   references another ordinary listed Memory in the same Tree.
 * viewDerivedEdges = [] in this Slice: fixture primary/secondary/support/
 *   cross/bridge/bridgeSecondary/origin topologies are never Product truth.
 * selectedNode = independent projection of selectedMemory or null; an
 *   unlisted/out-of-window selected Memory stays out of nodes[] and gains
 *   no edges from unseen list data.
 *
 * @param {{ tree: object, memories: object[], selectedMemory: object | null }} context
 * @returns {{ nodes: object[], edges: object[], viewDerivedEdges: object[], selectedId: string | null, selectedNode: object | null }}
 */
export function projectMvp001ContextToSrc056(context) {
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

  const nodes = memories.map((m, idx) => projectMemoryToSrc056Node(m, idx));
  computeDepths(nodes);
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

  // Fixture edge topologies are source-presentation only, never Product truth.
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
      const standalone = projectMemoryToSrc056Node(selectedMemory, nodes.length);
      standalone.depth = null; // depth unknown without list context; never infer from unseen data
      selectedNode = standalone;
    }
  }

  return { nodes, edges, viewDerivedEdges, selectedId, selectedNode };
}

export function createSrc056InjectionSeam() {
  return {
    describe: () => ({
      fixturePreserved: true,
      seam: 'projectMvp001ContextToSrc056 + optional DOM applier',
      note: 'Canvas geometry/CSS untouched; call adapter and feed result to SRC056 relationship path; fixture clusters/edges preserved as presentation only',
    }),
  };
}

export const SRC056_WORLD = WORLD;
