// Lineage 60 (Track60) V1.2 — software-projected 3D projection + interaction authority.
//
// This module is the SINGLE SOURCE OF TRUTH for:
//   - Canvas-2D software-projected 3D projection (no WebGL, no THREE).
//   - Depth authority (dz convention): larger `depth` == farther from camera.
//   - Far->near render ordering (painter's algorithm).
//   - Frontmost (nearest) hit authority among overlapping 2D candidates.
//   - Click/tap vs rotate-drag vs pinch vs cancel authority.
//
// It is intentionally free of React / DOM so the authority rules can be
// exercised by pure node tests as well as the live component.

export type Vec3 = [number, number, number];

export interface Camera {
  yaw: number;
  pitch: number;
  distance: number;
  target: Vec3;
}

export interface Projected {
  /** device-pixel screen x (already multiplied by dpr) */
  sx: number;
  /** device-pixel screen y (already multiplied by dpr) */
  sy: number;
  /** perspective scale factor (focal / dz) */
  scale: number;
  /**
   * Camera-space depth along the view axis.
   * CONVENTION: larger `depth` == FARTHER from the camera, smaller == NEARER.
   * Far->near render order therefore sorts by `depth` DESCENDING.
   * Frontmost (occluding) item among overlapping candidates is the one with the
   * SMALLEST `depth`.
   */
  depth: number;
}

export interface Viewport {
  w: number;
  h: number;
  dpr: number;
}

/** Single source of truth for the click/tap movement threshold (CSS px). */
export const CLICK_THRESHOLD_PX = 6;

export type GestureKind = "none" | "click" | "rotate" | "pinch" | "cancel";

export interface GestureInput {
  /** total displacement (max) from the pointer-down origin, CSS px */
  maxMove: number;
  /** a multi-touch / pinch lifecycle happened during this gesture */
  pinch: boolean;
  /** a pointercancel / lost-pointer-capture happened during this gesture */
  cancelled: boolean;
  /** explicit click/tap threshold override (defaults to CLICK_THRESHOLD_PX) */
  clickThreshold?: number;
}

/**
 * Classify a completed pointer gesture.
 *
 * Authority rules (Web CTO confirmed blockers):
 *  - cancelled  -> cleanup only, NEVER select
 *  - pinch      -> cleanup only, NEVER select (pinch lifecycle must not mis-fire as click)
 *  - maxMove > threshold -> rotate-only, NEVER select
 *  - otherwise  -> explicit click/tap -> hitTest/select
 */
export function classifyGesture(input: GestureInput): GestureKind {
  if (input.cancelled) return "cancel";
  if (input.pinch) return "pinch";
  const threshold = input.clickThreshold ?? CLICK_THRESHOLD_PX;
  if (input.maxMove > threshold) return "rotate";
  return "click";
}

/**
 * Software-projected 3D -> 2D canvas projection.
 * World point p is expressed relative to the camera `target`, then rotated by
 * yaw (around Y) and pitch (around X), then perspective-divided by the
 * view-axis depth `dz = z2 + cam.distance`.
 *
 * Returns null when the point is behind / at the camera plane (dz <= 1).
 */
export function project(p: Vec3, cam: Camera, vp: Viewport): Projected | null {
  const { w, h, dpr } = vp;
  const cx = (w * dpr) / 2;
  const cy = (h * dpr) / 2;
  const focal = Math.min(w, h) * dpr * 1.15;

  const x = p[0] - cam.target[0];
  const y = p[1] - cam.target[1];
  const z = p[2] - cam.target[2];

  // yaw (around Y)
  const cyaw = Math.cos(cam.yaw);
  const syaw = Math.sin(cam.yaw);
  const x1 = x * cyaw + z * syaw;
  const z1 = -x * syaw + z * cyaw;
  const y1 = y;

  // pitch (around X)
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;
  const x2 = x1;

  const dz = z2 + cam.distance;
  if (dz <= 1) return null;

  return {
    sx: (x2 * focal) / dz + cx,
    sy: (-y2 * focal) / dz + cy,
    scale: focal / dz,
    depth: dz,
  };
}

/**
 * Sort render items FAR -> NEAR (painter's algorithm).
 * Items whose projection is missing (behind camera) are pushed to the end
 * (drawn last / effectively culled). Larger `depth` == farther == drawn first.
 */
export function sortFarToNear<T extends { proj: Projected | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const da = a.proj ? a.proj.depth : Number.POSITIVE_INFINITY;
    const db = b.proj ? b.proj.depth : Number.POSITIVE_INFINITY;
    return db - da; // far first
  });
}

export interface HitCandidate<T> {
  item: T;
  proj: Projected;
}

/**
 * Frontmost (nearest) hit authority.
 *
 * Among 2D candidates whose projected CSS position is within `hitRadius` of the
 * click point, returns the one with the SMALLEST `depth` (the true frontmost
 * item from the current camera), never just the nearest 2D distance.
 *
 * `px`/`py` are CSS pixels relative to the canvas (clientX/Y - rect.left/top).
 * `proj.sx`/`proj.sy` are device pixels, so they are divided by `vp.dpr`.
 */
export function frontmostHit<T>(
  candidates: HitCandidate<T>[],
  px: number,
  py: number,
  hitRadius: number,
  vp: Viewport,
): T | null {
  let best: { item: T; depth: number } | null = null;
  for (const c of candidates) {
    const sxCss = c.proj.sx / vp.dpr;
    const syCss = c.proj.sy / vp.dpr;
    const d = Math.hypot(sxCss - px, syCss - py);
    if (d > hitRadius) continue;
    if (!best || c.proj.depth < best.depth) {
      best = { item: c.item, depth: c.proj.depth };
    }
  }
  return best ? best.item : null;
}
