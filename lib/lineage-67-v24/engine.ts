/**
 * Track 67 V2.4.2 — Persistent World engine core (pure, renderer-neutral).
 *
 * Extracted from the verified exact source:
 *   public/design-lab-assets/lineages/67/v2-4/track67_v2.4_persistent_world_works_navigation.txt
 *   SHA256 85210be6a3368edd8e5e2d55c94721d91cd031c2cabca1c6698ffabf1e65ae6f
 *
 * The exact source is RAW_WEBGL2 / CUSTOM_WEBGL (getContext('webgl2', …), Three.js = 0).
 * This module reproduces only the bounded mechanics that the source proves are safe:
 *   - grid-cell chunk promotion with a hard static cap (CHUNK_RAW)
 *   - a bounded memory-tail queue (active ribbon) behind the camera
 *   - q/travel print continuity (q === travel + 0.58, bounded)
 *   - rewind over a bounded sample history
 *   - frontmost (camera-nearest) hit selection
 *
 * It deliberately contains NO WebGL, NO DOM, NO network. The native React renderer
 * (v2-4/native) imports these pure functions and owns all canvas/DOM behavior.
 */

export const V24_CHUNK_RAW = 112;
export const V24_CHUNK_TRIGGER = 120;
export const V24_GRID_CELL = 6;
export const V24_TAIL_MAX = 220;
export const V24_TAIL_SAMPLE_EVERY = 4;
export const V24_Q_OFFSET = 0.58;
export const V24_TRAVEL_MAX = 7200;

export interface V24Chunk {
  readonly id: number;
  readonly gx: number;
  readonly gz: number;
  readonly x: number;
  readonly z: number;
  readonly born: number;
}

export interface V24Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

function gridKey(gx: number, gz: number): string {
  return `${gx}|${gz}`;
}

export function chunkCenter(gx: number, gz: number): V24Vec3 {
  return {
    x: gx * V24_GRID_CELL,
    y: 0,
    z: gz * V24_GRID_CELL,
  };
}

/**
 * Promote a camera position into a static memory chunk when its grid cell is
 * beyond V24_CHUNK_TRIGGER from the origin AND not already occupied.
 * Returns the next chunk list (capped at V24_CHUNK_RAW) and the next id seed.
 *
 * Boundedness: the returned list length is never greater than V24_CHUNK_RAW.
 */
export function promoteChunk(
  chunks: readonly V24Chunk[],
  nextId: number,
  cameraX: number,
  cameraZ: number,
): { chunks: readonly V24Chunk[]; nextId: number; promoted: V24Chunk | null } {
  const gx = Math.round(cameraX / V24_GRID_CELL);
  const gz = Math.round(cameraZ / V24_GRID_CELL);
  const dist = Math.hypot(gx, gz);
  if (dist < V24_CHUNK_TRIGGER) {
    return { chunks, nextId, promoted: null };
  }

  const occupied = new Set(chunks.map((c) => gridKey(c.gx, c.gz)));
  if (occupied.has(gridKey(gx, gz))) {
    return { chunks, nextId, promoted: null };
  }

  const center = chunkCenter(gx, gz);
  const promoted: V24Chunk = { id: nextId, gx, gz, x: center.x, z: center.z, born: chunks.length };
  const next = chunks.length >= V24_CHUNK_RAW ? chunks.slice(1) : chunks.slice();
  return { chunks: [...next, promoted], nextId: nextId + 1, promoted };
}

/**
 * Append a tail sample, keeping the queue bounded at V24_TAIL_MAX and sampling
 * only every V24_TAIL_SAMPLE_EVERY-th call.
 *
 * Boundedness: returned length is never greater than V24_TAIL_MAX.
 * Continuity: the sample cadence is deterministic from the call count.
 */
export function pushTail(
  tail: readonly V24Vec3[],
  point: V24Vec3,
  callIndex: number,
): readonly V24Vec3[] {
  if (callIndex % V24_TAIL_SAMPLE_EVERY !== 0) {
    return tail;
  }
  const next = tail.length >= V24_TAIL_MAX ? tail.slice(1) : tail.slice();
  return [...next, point];
}

export function tailLength(tail: readonly V24Vec3[]): number {
  return tail.length;
}

export function tailIsBounded(tail: readonly V24Vec3[]): boolean {
  return tail.length <= V24_TAIL_MAX;
}

/** q/travel print continuity used by the source HUD. */
export function computeQ(travel: number): number {
  return travel + V24_Q_OFFSET;
}

export function qMatchesTravel(q: number, travel: number): boolean {
  return Math.abs(q - (travel + V24_Q_OFFSET)) < 1e-9;
}

export function clampTravel(travel: number): number {
  if (!Number.isFinite(travel)) return 0;
  return Math.max(0, Math.min(V24_TRAVEL_MAX, travel));
}

/**
 * Rewind one step backwards through a bounded sample history.
 * Returns the previous travel value, or 0 when already at the start.
 * `history` must be ascending samples of travel; the function does not mutate it.
 */
export function rewindStep(
  history: readonly number[],
  currentIndex: number,
): { travel: number; index: number } {
  const idx = Math.max(0, Math.min(history.length - 1, currentIndex));
  if (idx <= 0) {
    return { travel: 0, index: 0 };
  }
  return { travel: history[idx - 1], index: idx - 1 };
}

/**
 * Frontmost hit: among candidate chunks, the one nearest the camera in the XZ
 * plane. Mirrors the source `ribbonHitTest` frontmost-selection intent without
 * requiring GPU ray projection. Returns null when empty.
 */
export function frontmostHit(
  chunks: readonly V24Chunk[],
  cameraX: number,
  cameraZ: number,
): V24Chunk | null {
  let best: V24Chunk | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const chunk of chunks) {
    const d = Math.hypot(chunk.x - cameraX, chunk.z - cameraZ);
    if (d < bestDist) {
      bestDist = d;
      best = chunk;
    }
  }
  return best;
}

export interface V24Snapshot {
  readonly pos: readonly [number, number, number];
  readonly travel: number;
  readonly rawActive: number;
  readonly staticChunks: number;
  readonly totalSamples: number;
  readonly q: number;
}

export function v24StateSnapshot(input: {
  pos: readonly [number, number, number];
  travel: number;
  raw: number;
  chunks: number;
  totalSamples: number;
}): V24Snapshot {
  return {
    pos: [input.pos[0], input.pos[1], input.pos[2]],
    travel: clampTravel(input.travel),
    rawActive: input.raw,
    staticChunks: input.chunks,
    totalSamples: input.totalSamples,
    q: computeQ(clampTravel(input.travel)),
  };
}
