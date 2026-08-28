import type { OrbitalFamily } from "./types";

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
