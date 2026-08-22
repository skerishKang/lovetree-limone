import type { MomentRecord } from "./types";
import { TRACK64_MOMENTS } from "./data";

const MOMENT_COUNT = TRACK64_MOMENTS.length;

export interface FloatingMomentState {
  selectedMomentId: string | null;
  viewerOpen: boolean;
  focusedIndex: number;
}

export type FloatingMomentAction =
  | { type: "select"; momentId: string }
  | { type: "open-viewer"; momentId: string }
  | { type: "close-viewer" }
  | { type: "focus-index"; index: number }
  | { type: "step"; delta: number };

export function createFloatingMomentState(config?: { initialIndex?: number }): FloatingMomentState {
  return {
    selectedMomentId: null,
    viewerOpen: false,
    focusedIndex: config?.initialIndex ?? 0,
  };
}

export function reduceFloatingMoment(
  state: FloatingMomentState,
  action: FloatingMomentAction,
): FloatingMomentState {
  switch (action.type) {
    case "select":
      return { ...state, selectedMomentId: action.momentId };
    case "open-viewer":
      // Single selectedMomentId authority shared by card / focus / viewer / WHY NEXT / Path / Branch / semantic list.
      return { ...state, selectedMomentId: action.momentId, viewerOpen: true };
    case "close-viewer":
      // Keep selectedMomentId so the focused Moment stays the visual authority while the world recedes;
      // only the modal closes. Spatial snapshot (camera/velocity/focus) is restored by the caller.
      return { ...state, viewerOpen: false };
    case "focus-index":
      return { ...state, focusedIndex: ((action.index % MOMENT_COUNT) + MOMENT_COUNT) % MOMENT_COUNT };
    case "step":
      return {
        ...state,
        focusedIndex: ((state.focusedIndex + action.delta) % MOMENT_COUNT + MOMENT_COUNT) % MOMENT_COUNT,
      };
    default:
      return state;
  }
}

export interface PendingGesture {
  pointerId: number | null;
  downCardId: string | null;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  movement: number;
  dragActive: boolean;
}

export function createPendingGesture(): PendingGesture {
  return {
    pointerId: null,
    downCardId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    movement: 0,
    dragActive: false,
  };
}

export function beginGesture(
  pending: PendingGesture,
  pointerId: number,
  cardId: string,
  x: number,
  y: number,
): PendingGesture {
  return {
    pointerId,
    downCardId: cardId,
    startX: x,
    startY: y,
    lastX: x,
    lastY: y,
    movement: 0,
    dragActive: false,
  };
}

export function moveGesture(
  pending: PendingGesture,
  x: number,
  y: number,
  threshold: number,
): PendingGesture {
  if (pending.pointerId === null) return pending;
  const movement = Math.hypot(x - pending.startX, y - pending.startY);
  return { ...pending, lastX: x, lastY: y, movement, dragActive: movement > threshold };
}

export interface OpenCheck {
  movement: number;
  threshold: number;
  downCardId: string | null;
  viewerOpen: boolean;
}

export function shouldOpenViewerOnPointerUp(check: OpenCheck): boolean {
  return check.movement <= check.threshold && check.downCardId !== null && !check.viewerOpen;
}

export function endGesture(
  pending: PendingGesture,
  threshold: number,
  viewerOpen: boolean,
): { open: boolean; next: PendingGesture } {
  const open = shouldOpenViewerOnPointerUp({
    movement: pending.movement,
    threshold,
    downCardId: pending.downCardId,
    viewerOpen,
  });
  return { open, next: createPendingGesture() };
}

export function cancelGesture(_pending: PendingGesture): PendingGesture {
  return createPendingGesture();
}

export function recoverLostPointerCapture(_pending: PendingGesture): PendingGesture {
  return createPendingGesture();
}

export function selectedMoment(
  moments: readonly MomentRecord[],
  state: FloatingMomentState,
): MomentRecord | null {
  if (!state.selectedMomentId) return null;
  return moments.find((m) => m.id === state.selectedMomentId) ?? null;
}
