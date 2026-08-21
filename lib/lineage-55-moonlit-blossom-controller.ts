import {
  LINEAGE_55_STATES,
  LINEAGE_55_TIMING,
} from "./lineage-55-moonlit-blossom-data";

export type BlossomStateId = 0 | 1 | 2 | 3;

export interface BlossomControllerState {
  state: BlossomStateId;
  auto: boolean;
}

export const LINEAGE_55_STATE_COUNT = LINEAGE_55_STATES.length;

export function createInitialBlossomControllerState(): BlossomControllerState {
  return { state: 0, auto: false };
}

function wrap(value: number, count: number): BlossomStateId {
  return ((value % count) + count) % count as BlossomStateId;
}

export function advanceBlossomState(
  current: BlossomControllerState,
  stateCount: number = LINEAGE_55_STATE_COUNT,
): BlossomControllerState {
  return { ...current, state: wrap(current.state + 1, stateCount) };
}

export function rewindBlossomState(
  current: BlossomControllerState,
  stateCount: number = LINEAGE_55_STATE_COUNT,
): BlossomControllerState {
  return { ...current, state: wrap(current.state - 1, stateCount) };
}

export function jumpToBlossomState(
  current: BlossomControllerState,
  target: number,
  stateCount: number = LINEAGE_55_STATE_COUNT,
): BlossomControllerState {
  return { ...current, state: wrap(target, stateCount) };
}

export function toggleBlossomAuto(
  current: BlossomControllerState,
): BlossomControllerState {
  return { ...current, auto: !current.auto };
}

export function shouldBlossomWheelAdvance(
  lastWheelAt: number | null,
  now: number,
  throttleMs: number = LINEAGE_55_TIMING.wheelThrottleMs,
): boolean {
  if (lastWheelAt === null) return true;
  return now - lastWheelAt >= throttleMs;
}

export interface PlannedPetal {
  left: number;
  top: number;
  dx: number;
  dy: number;
  delayMs: number;
}

export interface PetalBurstPlanOptions {
  count?: number;
  centerX: number;
  centerY: number;
  minDistancePx?: number;
  maxDistancePx?: number;
  maxDelayMs?: number;
  random?: () => number;
}

export function planPetalBurst({
  count = LINEAGE_55_TIMING.bloomPetalCount,
  centerX,
  centerY,
  minDistancePx = LINEAGE_55_TIMING.petalMinDistancePx,
  maxDistancePx = LINEAGE_55_TIMING.petalMaxDistancePx,
  maxDelayMs = LINEAGE_55_TIMING.petalMaxDelayMs,
  random = Math.random,
}: PetalBurstPlanOptions): PlannedPetal[] {
  const petals: PlannedPetal[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = minDistancePx + random() * (maxDistancePx - minDistancePx);
    petals.push({
      left: centerX,
      top: centerY,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      delayMs: random() * maxDelayMs,
    });
  }
  return petals;
}
