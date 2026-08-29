import type { OrbitalFamily } from "./types";

export interface Source64Ring {
  radiusX: number;
  radiusY: number;
  zAmplitude: number;
  zBase: number;
  band: number;
  phaseOffset: number;
  speed: number;
}

/** Ported from the pinned executable's RINGS table with 5 independent families. */
export const SOURCE64_RINGS: Readonly<Record<OrbitalFamily, Source64Ring>> = Object.freeze({
  f1: { radiusX: 700, radiusY: 330, zAmplitude: 420, zBase: 0, band: 0, phaseOffset: 0, speed: 1 },
  f2: { radiusX: 520, radiusY: 260, zAmplitude: 330, zBase: -80, band: 0, phaseOffset: 0.31, speed: 1.18 },
  f3: { radiusX: 900, radiusY: 430, zAmplitude: 520, zBase: -40, band: 0, phaseOffset: 0.62, speed: 0.82 },
  f4: { radiusX: 760, radiusY: 260, zAmplitude: 460, zBase: -120, band: -250, phaseOffset: 0.93, speed: 0.92 },
  f5: { radiusX: 780, radiusY: 250, zAmplitude: 470, zBase: -100, band: 250, phaseOffset: 1.24, speed: 1.06 },
});

/** Source A's independent temporal rate for each orbital family. */
export const SOURCE64_RING_SPEEDS: Readonly<Record<OrbitalFamily, number>> = Object.freeze({
  f1: 1,
  f2: 1.18,
  f3: 0.82,
  f4: 0.92,
  f5: 1.06,
});

/** Returns the source-faithful phase contribution for one family/card. */
export function source64OrbitalPhase(
  phase: number,
  family: OrbitalFamily,
  phaseOffset = 0,
): number {
  return phase * SOURCE64_RING_SPEEDS[family] + phaseOffset;
}

/** Computes the projected (x, y, z) 3D coordinate for a Moment record. */
export function source64CardPosition(
  moment: { family: OrbitalFamily; world: { angle: number; phaseOffset?: number; zOffset?: number } },
  orbitalPhase = 0,
  compact = false,
): { x: number; y: number; z: number; theta: number } {
  const ring = SOURCE64_RINGS[moment.family];
  const theta = (moment.world.angle * Math.PI) / 180 + source64OrbitalPhase(orbitalPhase, moment.family, moment.world.phaseOffset ?? 0);
  let x = Math.cos(theta) * ring.radiusX;
  let y =
    Math.sin(theta) * ring.radiusY +
    ring.band +
    Math.sin(theta * 1.7 + ring.phaseOffset * 3) * 45;
  let z =
    Math.sin(theta + 1.1 + ring.phaseOffset * 4) * ring.zAmplitude +
    ring.zBase +
    (moment.world.zOffset ?? 0);

  const projectionScale = compact ? 0.72 : 1.0;
  x *= projectionScale;
  y *= projectionScale;
  z *= projectionScale;

  const voidLimitX = compact ? 290 : 500;
  const voidLimitY = compact ? 210 : 280;
  const dist = Math.sqrt((x / voidLimitX) ** 2 + (y / voidLimitY) ** 2);
  if (dist < 1.0) {
    const push = (1.0 - dist);
    x += (x >= 0 ? 1 : -1) * (push * voidLimitX * 0.9 + 50);
    y += (y >= 0 ? 1 : -1) * (push * voidLimitY * 0.75 + 30);
  }

  return { x, y, z, theta };
}
