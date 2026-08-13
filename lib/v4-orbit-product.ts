import {
  canonicalV4OrbitRotation,
  nearestEquivalentV4OrbitRotation,
  nearestV4OrbitIndex,
  snapV4OrbitRotation,
} from "./v4-orbit-selection";

export interface V4OrbitMomentLike {
  id: string;
  videoId?: string;
}

function wrapIndex(index: number, count: number) {
  return ((Math.trunc(index) % count) + count) % count;
}

/**
 * The single canonical selection authority projected from a continuous orbit
 * rotation. Every surface (orbit card, rail, header, detail, wheel, arrows,
 * card selection, drag-release snap) reads from the same `selected` index, so
 * there is never a parallel selection state.
 */
export function v4OrbitSelectedIndex(rotation: number, count: number) {
  return nearestV4OrbitIndex(rotation, count);
}

export function v4OrbitSelectedId<T extends V4OrbitMomentLike>(moments: T[], selected: number) {
  return moments[wrapIndex(selected, moments.length)].id;
}

export function v4OrbitHeaderCount(selected: number, count: number) {
  return { current: wrapIndex(selected, count) + 1, total: count };
}

export function v4OrbitRailItems<T extends V4OrbitMomentLike>(moments: T[], selected: number) {
  const sel = wrapIndex(selected, moments.length);
  return moments.map((moment, index) => ({
    index,
    id: moment.id,
    selected: index === sel,
  }));
}

/**
 * Fail-closed media authority. A background orbit card never carries playable
 * media. Only the selected / open detail may reveal a playable element, and no
 * product moment type carries audio authority — a future photo moment without a
 * `videoId` is correctly treated as non-playable and silent.
 */
export function v4OrbitMediaAuthority(moment: V4OrbitMomentLike) {
  const playable = Boolean(moment.videoId) && moment.videoId!.length > 0;
  return { playable, hasAudio: false };
}

/** Tap vs drag slop. A gesture under the slop is a tap, not a drag. */
export function isV4OrbitDragMovement(dx: number, dy: number, slop = 6) {
  return Math.hypot(dx, dy) > slop;
}

export {
  canonicalV4OrbitRotation,
  nearestEquivalentV4OrbitRotation,
  nearestV4OrbitIndex,
  snapV4OrbitRotation,
};
