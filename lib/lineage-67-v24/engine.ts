/**
 * Track 67 V2.4.2 — Persistent World engine core (pure, renderer-neutral).
 *
 * Extracted from the verified exact source:
 *   public/design-lab-assets/lineages/67/v2-4/track67_v2.4_persistent_world_works_navigation.txt
 *   SHA256 85210be6a3368edd8e5e2d55c94721d91cd031c2cabca1c6698ffabf1e65ae6f
 *
 * Source persistence architecture: STATIC CHUNKS + ACTIVE TAIL.
 *   - V24_CHUNK_TRIGGER = 120 : when the active raw tail reaches 120 samples, bake.
 *   - V24_CHUNK_RAW     = 112 : raw samples CONSUMED per bake (raw.splice(0, 112)).
 *                               This is SAMPLES-PER-BAKE, NOT a chunk-count cap.
 *   - bake input        = 113 : raw.slice(0, V24_CHUNK_RAW + 1) — the chunk keeps ONE
 *                               seam sample (cut + 1) for ribbon continuity.
 *   - residual active tail    = 8 : 120 - 112, naturally bounded by the bake cycle,
 *                               NOT by an arbitrary queue cap (no TAIL_MAX=220).
 *   - static chunks accumulate WITHOUT a count cap and WITHOUT oldest-chunk eviction
 *     (runtime reports pathEviction = false). Old ribbon never disappears.
 *
 * History is full-state and persistent (no truncation / no shift). Space rewind
 * restores pos / spin / dir / travel / contact and rebuilds visible static chunks
 * plus the live active tail according to the rewind travel, all the way to origin.
 *
 * Hit-test: screen pointer -> camera ray -> chunk AABB candidate filtering ->
 * ribbon triangle intersection -> nearest positive t -> corresponding q/order.
 * Empty space / AABB miss => null. Cross-chunk => frontmost actual surface.
 *
 * Contains NO WebGL, NO DOM, NO network.
 */

export const V24_CHUNK_RAW = 112;
export const V24_CHUNK_TRIGGER = 120;
export const V24_Q_OFFSET = 0.58;
export const V24_TRAVEL_MAX = 7200;
/** Vertical extent of the rendered + hit-tested ribbon wall (pure geometry, not gameplay). */
export const V24_RIBBON_HEIGHT = 10;
/** Sentinel id for the live active-tail ribbon surface in hit results. */
export const V24_ACTIVE_TAIL_SURFACE_ID = -1;

export type Vec3 = readonly [number, number, number];

export interface V24Sample {
  readonly order: number;
  readonly travel: number;
  readonly q: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly spin: number;
  readonly dirX: number;
  readonly dirZ: number;
  readonly contact: boolean;
}

export interface V24Chunk {
  readonly id: number;
  readonly order: number;
  readonly committed: number;
  readonly samples: readonly V24Sample[];
  readonly q0: number;
  readonly q1: number;
  readonly travel0: number;
  readonly travel1: number;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface V24HistoryRecord {
  readonly travel: number;
  readonly pos: Vec3;
  readonly spin: number;
  readonly dir: Vec3;
  readonly q: number;
  readonly contact: boolean;
  readonly visibleChunkCount: number;
  readonly raw: readonly V24Sample[];
}

export interface V24SimState {
  raw: V24Sample[];
  chunks: V24Chunk[];
  nextChunkId: number;
  nextOrder: number;
  committedSamples: number;
  totalSamples: number;
  history: V24HistoryRecord[];
  pos: Vec3;
  spin: number;
  dir: Vec3;
  travel: number;
  contact: boolean;
}

export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface V24Ray {
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
}

export interface V24HitCandidate {
  kind: "chunk" | "tail";
  id: number;
  /** Positive ray parameter of this surface intersection. */
  t: number;
}

export interface V24Hit {
  /** chunk id, or V24_ACTIVE_TAIL_SURFACE_ID (-1) when the hit is on the live active tail. */
  chunkId: number;
  kind: "chunk" | "tail";
  q: number;
  t: number;
  /**
   * Read-only observability: every positive surface intersection along the ray
   * (ascending t). candidates[0] is always the selected (nearest) hit. Purely
   * additive — the selection logic below is unchanged (best = min positive t).
   */
  candidates?: readonly V24HitCandidate[];
}

// ---------------------------------------------------------------------------
// q / travel continuity
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sample / chunk construction (STATIC CHUNKS + ACTIVE TAIL)
// ---------------------------------------------------------------------------

function copySample(s: V24Sample): V24Sample {
  return { ...s };
}

export function v24MakeSample(input: {
  order: number;
  travel: number;
  x: number;
  y: number;
  z: number;
  spin: number;
  dir: Vec3;
  contact?: boolean;
}): V24Sample {
  return {
    order: input.order,
    travel: clampTravel(input.travel),
    q: computeQ(clampTravel(input.travel)),
    x: input.x,
    y: input.y,
    z: input.z,
    spin: input.spin,
    dirX: input.dir[0],
    dirZ: input.dir[2],
    contact: input.contact ?? false,
  };
}

function makeChunk(samples: readonly V24Sample[], id: number, order: number): V24Chunk {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const s of samples) {
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.z < minZ) minZ = s.z;
    if (s.z > maxZ) maxZ = s.z;
  }
  const pad = 1.5;
  return {
    id,
    order,
    committed: V24_CHUNK_RAW,
    samples,
    q0: samples[0].q,
    q1: samples[samples.length - 1].q,
    travel0: samples[0].travel,
    travel1: samples[samples.length - 1].travel,
    minX: minX - pad,
    maxX: maxX + pad,
    minZ: minZ - pad,
    maxZ: maxZ + pad,
  };
}

/**
 * Bake the raw tail once it has reached the trigger.
 * Authoritative V2.4.2 semantics (source-faithful):
 *   - bake input = raw.slice(0, V24_CHUNK_RAW + 1) -> 113 samples; the chunk keeps
 *                 ONE seam sample (cut + 1) for ribbon continuity.
 *   - consume    = raw.slice(V24_CHUNK_RAW)        -> 112 samples removed, so
 *                 8 raw samples remain as the ACTIVE TAIL when raw == trigger.
 * There is NO chunk-count cap, NO invented overlap contract, and NO oldest-chunk
 * eviction. The residual active tail is naturally bounded by the bake cycle.
 */
export function v24BakeChunk(
  raw: readonly V24Sample[],
  chunkId: number,
  chunkOrder: number,
): { chunk: V24Chunk; residual: V24Sample[] } {
  const cut = V24_CHUNK_RAW; // 112
  const baked = raw.slice(0, cut + 1); // 113 samples (incl. 1 seam continuity sample)
  const residual = raw.slice(cut); // 112 consumed; 8 remain at trigger 120
  return { chunk: makeChunk(baked, chunkId, chunkOrder), residual: residual.map(copySample) };
}

export function v24InitState(): V24SimState {
  const origin: V24HistoryRecord = {
    travel: 0,
    pos: [0, 1.5, 0],
    spin: 0,
    dir: [0, 0, -1],
    q: computeQ(0),
    contact: false,
    visibleChunkCount: 0,
    raw: [],
  };
  return {
    raw: [],
    chunks: [],
    nextChunkId: 1,
    nextOrder: 1,
    committedSamples: 0,
    totalSamples: 0,
    history: [origin],
    pos: [0, 1.5, 0],
    spin: 0,
    dir: [0, 0, -1],
    travel: 0,
    contact: false,
  };
}

/**
 * Append one ribbon sample to the active tail and bake a static chunk when the
 * raw tail reaches V24_CHUNK_TRIGGER. Returns the next immutable state.
 */
export function v24AppendSample(s: V24SimState, sample: V24Sample): V24SimState {
  let raw = [...s.raw, sample];
  let chunks = s.chunks;
  let nextChunkId = s.nextChunkId;
  let committedSamples = s.committedSamples;
  if (raw.length >= V24_CHUNK_TRIGGER) {
    const { chunk, residual } = v24BakeChunk(raw, nextChunkId, chunks.length + 1);
    chunks = [...chunks, chunk];
    nextChunkId += 1;
    committedSamples += chunk.committed;
    raw = residual;
  }
  return {
    ...s,
    raw,
    chunks,
    nextChunkId,
    committedSamples,
    nextOrder: s.nextOrder + 1,
    totalSamples: s.totalSamples + 1,
    pos: [sample.x, sample.y, sample.z],
    spin: sample.spin,
    dir: [sample.dirX, 0, sample.dirZ],
    travel: sample.travel,
    contact: sample.contact,
  };
}

/** Snapshot of the current full state into the persistent history (no cap). */
export function v24RecordHistory(s: V24SimState): V24SimState {
  const record: V24HistoryRecord = {
    travel: s.travel,
    pos: [s.pos[0], s.pos[1], s.pos[2]],
    spin: s.spin,
    dir: [s.dir[0], s.dir[1], s.dir[2]],
    q: computeQ(s.travel),
    contact: s.contact,
    visibleChunkCount: s.chunks.length,
    raw: s.raw.map(copySample),
  };
  return { ...s, history: [...s.history, record] };
}

// ---------------------------------------------------------------------------
// Full-state rewind to origin
// ---------------------------------------------------------------------------

function findRecordAt(s: V24SimState, targetTravel: number): V24HistoryRecord {
  let rec = s.history[0];
  for (const r of s.history) {
    if (r.travel <= targetTravel) rec = r;
    else break;
  }
  return rec;
}

/**
 * Rebuild the world at the largest recorded travel <= targetTravel. Restores
 * pos / spin / dir / travel / contact, hides chunks baked after this travel, and
 * rebuilds the live active tail. Returns origin when targetTravel <= 0.
 */
export function v24RewindTo(s: V24SimState, targetTravel: number): V24SimState {
  const rec = findRecordAt(s, targetTravel);
  const visibleChunks = s.chunks.slice(0, rec.visibleChunkCount);
  return {
    ...s,
    travel: rec.travel,
    pos: [rec.pos[0], rec.pos[1], rec.pos[2]],
    spin: rec.spin,
    dir: [rec.dir[0], rec.dir[1], rec.dir[2]],
    contact: rec.contact,
    chunks: visibleChunks,
    raw: rec.raw.map(copySample),
  };
}

/** Step one record backward through persistent history (Space rewind). */
export function v24RewindStep(s: V24SimState): V24SimState {
  let idx = 0;
  for (let i = 0; i < s.history.length; i += 1) {
    if (s.history[i].travel <= s.travel) idx = i;
    else break;
  }
  const target = idx > 0 ? s.history[idx - 1].travel : 0;
  return v24RewindTo(s, target);
}

// ---------------------------------------------------------------------------
// Pointer ray / surface hit (AABB -> ribbon triangle -> nearest t)
// ---------------------------------------------------------------------------

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * Build a camera ray from a pointer in normalized device coordinates.
 * `eye` is the camera position, `forward` the camera direction (matches the
 * renderer's view basis), `fovY` the vertical field of view, `aspect` w/h.
 */
export function v24RayFromPointer(
  ndcX: number,
  ndcY: number,
  eye: Vec3,
  forward: Vec3,
  fovY: number,
  aspect: number,
): V24Ray {
  const f = Math.tan(fovY / 2);
  const fwd = normalize(forward);
  const worldUp: Vec3 = [0, 1, 0];
  const right = normalize(cross(fwd, worldUp));
  const up = normalize(cross(right, fwd));
  const dir = normalize([
    fwd[0] + ndcX * f * aspect * right[0] + ndcY * f * up[0],
    fwd[1] + ndcX * f * aspect * right[1] + ndcY * f * up[1],
    fwd[2] + ndcX * f * aspect * right[2] + ndcY * f * up[2],
  ]);
  return { ox: eye[0], oy: eye[1], oz: eye[2], dx: dir[0], dy: dir[1], dz: dir[2] };
}

function rayAABB(ray: V24Ray, box: AABB): boolean {
  let tmin = -Infinity;
  let tmax = Infinity;
  const o = [ray.ox, ray.oy, ray.oz];
  const d = [ray.dx, ray.dy, ray.dz];
  const mn = [box.minX, box.minY, box.minZ];
  const mx = [box.maxX, box.maxY, box.maxZ];
  for (let i = 0; i < 3; i += 1) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < mn[i] || o[i] > mx[i]) return false;
    } else {
      let t1 = (mn[i] - o[i]) / d[i];
      let t2 = (mx[i] - o[i]) / d[i];
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return false;
    }
  }
  return tmax >= 0;
}

/** Möller–Trumbore ray/triangle intersection; returns t (>0) or null. */
function rayTriangle(
  ray: V24Ray,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number | null {
  const e1x = bx - ax;
  const e1y = by - ay;
  const e1z = bz - az;
  const e2_x = cx - ax;
  const e2_y = cy - ay;
  const e2_z = cz - az;
  const px = ray.dy * e2_z - ray.dz * e2_y;
  const py = ray.dz * e2_x - ray.dx * e2_z;
  const pz = ray.dx * e2_y - ray.dy * e2_x;
  const det = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  const tx = ray.ox - ax;
  const ty = ray.oy - ay;
  const tz = ray.oz - az;
  const u = (tx * px + ty * py + tz * pz) * inv;
  if (u < 0 || u > 1) return null;
  const qx = ty * e1z - tz * e1y;
  const qy = tz * e1x - tx * e1z;
  const qz = tx * e1y - ty * e1x;
  const v = (ray.dx * qx + ray.dy * qy + ray.dz * qz) * inv;
  if (v < 0 || u + v > 1) return null;
  const t = (e2_x * qx + e2_y * qy + e2_z * qz) * inv;
  if (t <= 1e-6) return null;
  return t;
}

function rayRibbonSegment(ray: V24Ray, a: V24Sample, b: V24Sample, height: number): number | null {
  const ax = a.x;
  const az = a.z;
  const bx = b.x;
  const bz = b.z;
  const y0 = 0;
  const y1 = height;
  let best: number | null = null;
  const consider = (t: number | null) => {
    if (t !== null && (best === null || t < best)) best = t;
  };
  // Triangle 1: (a,0) (b,0) (b,1)
  consider(rayTriangle(ray, ax, y0, az, bx, y0, bz, bx, y1, bz));
  // Triangle 2: (a,0) (b,1) (a,1)
  consider(rayTriangle(ray, ax, y0, az, bx, y1, bz, ax, y1, az));
  return best;
}

/** Build an AABB around a ribbon polyline (matches the rendered wall pad). */
function aabbFromSamples(samples: readonly V24Sample[], height: number): AABB {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const s of samples) {
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.z < minZ) minZ = s.z;
    if (s.z > maxZ) maxZ = s.z;
  }
  const pad = 1.5;
  return { minX: minX - pad, maxX: maxX + pad, minY: 0, maxY: height, minZ: minZ - pad, maxZ: maxZ + pad };
}

/**
 * Source-faithful hit pipeline. Intersects the SAME ribbon wall geometry that is
 * actually rendered: for every visible static chunk AND the live active raw tail,
 * build the AABB, intersect the ribbon triangles, and return the frontmost
 * (nearest positive t) surface with its q. Empty space / AABB miss => null.
 *
 * The active tail is a first-class hit candidate (V24_ACTIVE_TAIL_SURFACE_ID),
 * NOT a separate invisible wall.
 */
export function v24RibbonHitTest(
  ray: V24Ray,
  chunks: readonly V24Chunk[],
  height: number = V24_RIBBON_HEIGHT,
  tails?: readonly (readonly V24Sample[])[],
): V24Hit | null {
  let best: V24Hit | null = null;
  const candidates: V24HitCandidate[] = [];
  const considerSurface = (
    samples: readonly V24Sample[],
    kind: "chunk" | "tail",
    id: number,
  ) => {
    if (samples.length < 2) return;
    if (!rayAABB(ray, aabbFromSamples(samples, height))) return;
    for (let i = 0; i < samples.length - 1; i += 1) {
      const a = samples[i];
      const b = samples[i + 1];
      const t = rayRibbonSegment(ray, a, b, height);
      if (t !== null) {
        candidates.push({ kind, id, t });
        if (best === null || t < best.t) {
          best = { chunkId: id, kind, q: a.q, t };
        }
      }
    }
  };
  for (const chunk of chunks) considerSurface(chunk.samples, "chunk", chunk.id);
  if (tails) for (const tail of tails) considerSurface(tail, "tail", V24_ACTIVE_TAIL_SURFACE_ID);
  const selected: V24Hit | null = best;
  if (selected !== null) {
    candidates.sort((a, b) => a.t - b.t);
    selected.candidates = candidates;
  }
  return selected;
}
