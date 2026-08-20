/**
 * P1 — Interaction Authority / Gesture Arbiter: pure runtime extraction from #141.
 *
 * Renderer-neutral, React-neutral, DOM-neutral, and LoveTree-domain-neutral.
 * Provides deterministic, property-tested gesture arbitration across competing intents:
 *   - tap / click vs drag threshold (monotonic lock)
 *   - single click vs double click / double tap window
 *   - press vs long press duration
 *   - pointer capture lifecycle requests (DOM-agnostic effects)
 *   - pointercancel and lostpointercapture fail-safe recovery
 *   - multi-pointer arbitration policy
 *   - wheel surface ownership & handoff
 *   - normalized semantic keyboard equivalents
 *
 * Design constraints:
 *   - Deterministic reducer: reduceGesture(state, event, config) => { state, intents, effects }
 *   - Pure: No Date.now(), performance.now(), setTimeout/setInterval.
 *   - DOM-free: No DOM Event, Node, or Element references. All events are serializable normalized records.
 *   - O(1) bounded state size and computation per event.
 */

/* ------------------------------------------------------------------ */
/* Primitive Types & Enums                                            */
/* ------------------------------------------------------------------ */

export type PointerType = "mouse" | "touch" | "pen";

export type MultiPointerPolicy = "ignore-secondary" | "cancel-active";

export type WheelPolicy = "own" | "handoff" | "block-on-drag" | "ignore";

export type KeyIntentType =
  | "ACTIVATE"
  | "CANCEL"
  | "NAVIGATE_PREVIOUS"
  | "NAVIGATE_NEXT"
  | "NAVIGATE_UP"
  | "NAVIGATE_DOWN";

export type GesturePhase =
  | "IDLE"
  | "PRESS_PENDING"
  | "DRAG_ACTIVE"
  | "LONG_PRESS_COMMITTED"
  | "CLICK_PENDING_SECOND";

export type CancellationReason =
  | "pointer_cancel"
  | "lost_capture"
  | "multi_pointer"
  | "key_cancel"
  | "reset";

export interface GestureModifiers {
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
}

/* ------------------------------------------------------------------ */
/* Configuration Contract                                             */
/* ------------------------------------------------------------------ */

export interface GestureArbiterConfig {
  readonly dragThresholdPx?: number;
  readonly longPressMs?: number;
  readonly doubleClickWindowMs?: number;
  readonly doubleClickDistancePx?: number;
  readonly primaryButton?: number;
  readonly multiPointerPolicy?: MultiPointerPolicy;
  readonly wheelPolicy?: WheelPolicy;
  readonly enableLongPress?: boolean;
  readonly enableDoubleClick?: boolean;
  readonly requestCaptureOnDrag?: boolean;
  readonly requestCaptureOnPress?: boolean;
}

export interface ResolvedGestureArbiterConfig {
  readonly dragThresholdPx: number;
  readonly longPressMs: number;
  readonly doubleClickWindowMs: number;
  readonly doubleClickDistancePx: number;
  readonly primaryButton: number;
  readonly multiPointerPolicy: MultiPointerPolicy;
  readonly wheelPolicy: WheelPolicy;
  readonly enableLongPress: boolean;
  readonly enableDoubleClick: boolean;
  readonly requestCaptureOnDrag: boolean;
  readonly requestCaptureOnPress: boolean;
}

export const DEFAULT_GESTURE_CONFIG: ResolvedGestureArbiterConfig = Object.freeze({
  dragThresholdPx: 8,
  longPressMs: 500,
  doubleClickWindowMs: 300,
  doubleClickDistancePx: 24,
  primaryButton: 0,
  multiPointerPolicy: "ignore-secondary",
  wheelPolicy: "own",
  enableLongPress: true,
  enableDoubleClick: true,
  requestCaptureOnDrag: true,
  requestCaptureOnPress: false,
});

/**
 * Validates gesture arbiter config. Fails fast on negative, non-finite, or invalid policy values.
 */
export function validateGestureArbiterConfig(config: unknown): asserts config is GestureArbiterConfig {
  if (typeof config !== "object" || config === null) {
    throw new TypeError("GestureArbiterConfig must be a non-null object");
  }
  const c = config as Record<string, unknown>;

  const assertNonNegativeFinite = (prop: string, val: unknown) => {
    if (val !== undefined) {
      if (typeof val !== "number" || !Number.isFinite(val) || val < 0) {
        throw new RangeError(`${prop} must be a non-negative finite number, received: ${String(val)}`);
      }
    }
  };

  assertNonNegativeFinite("dragThresholdPx", c.dragThresholdPx);
  assertNonNegativeFinite("longPressMs", c.longPressMs);
  assertNonNegativeFinite("doubleClickWindowMs", c.doubleClickWindowMs);
  assertNonNegativeFinite("doubleClickDistancePx", c.doubleClickDistancePx);

  if (c.primaryButton !== undefined) {
    if (typeof c.primaryButton !== "number" || !Number.isInteger(c.primaryButton) || c.primaryButton < 0) {
      throw new RangeError(`primaryButton must be a non-negative integer, received: ${String(c.primaryButton)}`);
    }
  }

  if (c.multiPointerPolicy !== undefined) {
    if (c.multiPointerPolicy !== "ignore-secondary" && c.multiPointerPolicy !== "cancel-active") {
      throw new TypeError(`Invalid multiPointerPolicy: ${String(c.multiPointerPolicy)}`);
    }
  }

  if (c.wheelPolicy !== undefined) {
    if (
      c.wheelPolicy !== "own" &&
      c.wheelPolicy !== "handoff" &&
      c.wheelPolicy !== "block-on-drag" &&
      c.wheelPolicy !== "ignore"
    ) {
      throw new TypeError(`Invalid wheelPolicy: ${String(c.wheelPolicy)}`);
    }
  }
}

/**
 * Merges partial user config with defaults after fail-fast validation.
 */
export function resolveGestureArbiterConfig(userConfig?: GestureArbiterConfig): ResolvedGestureArbiterConfig {
  if (!userConfig) return DEFAULT_GESTURE_CONFIG;
  validateGestureArbiterConfig(userConfig);
  return Object.freeze({
    dragThresholdPx: userConfig.dragThresholdPx ?? DEFAULT_GESTURE_CONFIG.dragThresholdPx,
    longPressMs: userConfig.longPressMs ?? DEFAULT_GESTURE_CONFIG.longPressMs,
    doubleClickWindowMs: userConfig.doubleClickWindowMs ?? DEFAULT_GESTURE_CONFIG.doubleClickWindowMs,
    doubleClickDistancePx: userConfig.doubleClickDistancePx ?? DEFAULT_GESTURE_CONFIG.doubleClickDistancePx,
    primaryButton: userConfig.primaryButton ?? DEFAULT_GESTURE_CONFIG.primaryButton,
    multiPointerPolicy: userConfig.multiPointerPolicy ?? DEFAULT_GESTURE_CONFIG.multiPointerPolicy,
    wheelPolicy: userConfig.wheelPolicy ?? DEFAULT_GESTURE_CONFIG.wheelPolicy,
    enableLongPress: userConfig.enableLongPress ?? DEFAULT_GESTURE_CONFIG.enableLongPress,
    enableDoubleClick: userConfig.enableDoubleClick ?? DEFAULT_GESTURE_CONFIG.enableDoubleClick,
    requestCaptureOnDrag: userConfig.requestCaptureOnDrag ?? DEFAULT_GESTURE_CONFIG.requestCaptureOnDrag,
    requestCaptureOnPress: userConfig.requestCaptureOnPress ?? DEFAULT_GESTURE_CONFIG.requestCaptureOnPress,
  });
}

/* ------------------------------------------------------------------ */
/* Events (Normalized Inputs)                                         */
/* ------------------------------------------------------------------ */

export type GestureEvent =
  | {
      readonly type: "POINTER_DOWN";
      readonly timestamp: number;
      readonly pointerId: number;
      readonly pointerType?: PointerType;
      readonly x: number;
      readonly y: number;
      readonly button?: number;
      readonly buttons?: number;
      readonly modifiers?: GestureModifiers;
    }
  | {
      readonly type: "POINTER_MOVE";
      readonly timestamp: number;
      readonly pointerId: number;
      readonly pointerType?: PointerType;
      readonly x: number;
      readonly y: number;
      readonly button?: number;
      readonly buttons?: number;
      readonly modifiers?: GestureModifiers;
    }
  | {
      readonly type: "POINTER_UP";
      readonly timestamp: number;
      readonly pointerId: number;
      readonly pointerType?: PointerType;
      readonly x: number;
      readonly y: number;
      readonly button?: number;
      readonly buttons?: number;
      readonly modifiers?: GestureModifiers;
    }
  | {
      readonly type: "POINTER_CANCEL";
      readonly timestamp: number;
      readonly pointerId: number;
      readonly pointerType?: PointerType;
      readonly x?: number;
      readonly y?: number;
    }
  | {
      readonly type: "LOST_POINTER_CAPTURE";
      readonly timestamp: number;
      readonly pointerId: number;
    }
  | {
      readonly type: "TICK";
      readonly timestamp: number;
      readonly deadlineType?: "LONG_PRESS" | "DOUBLE_CLICK_WINDOW";
    }
  | {
      readonly type: "WHEEL";
      readonly timestamp: number;
      readonly deltaX: number;
      readonly deltaY: number;
      readonly deltaMode?: number;
      readonly x: number;
      readonly y: number;
      readonly modifiers?: GestureModifiers;
    }
  | {
      readonly type: "KEY_INTENT";
      readonly timestamp: number;
      readonly intent: KeyIntentType;
      readonly repeat?: boolean;
    }
  | {
      readonly type: "RESET";
      readonly timestamp?: number;
    };

/* ------------------------------------------------------------------ */
/* Intents (Semantic Outputs)                                         */
/* ------------------------------------------------------------------ */

export type GestureIntent =
  | {
      readonly type: "PRESS_START";
      readonly pointerId: number;
      readonly pointerType: PointerType;
      readonly x: number;
      readonly y: number;
      readonly button: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "CLICK";
      readonly pointerId: number;
      readonly pointerType: PointerType;
      readonly x: number;
      readonly y: number;
      readonly button: number;
      readonly timestamp: number;
      readonly count: 1;
    }
  | {
      readonly type: "DOUBLE_CLICK";
      readonly pointerId: number;
      readonly pointerType: PointerType;
      readonly x: number;
      readonly y: number;
      readonly button: number;
      readonly timestamp: number;
      readonly count: 2;
    }
  | {
      readonly type: "LONG_PRESS";
      readonly pointerId: number;
      readonly pointerType: PointerType;
      readonly x: number;
      readonly y: number;
      readonly button: number;
      readonly timestamp: number;
      readonly durationMs: number;
    }
  | {
      readonly type: "DRAG_START";
      readonly pointerId: number;
      readonly pointerType: PointerType;
      readonly startX: number;
      readonly startY: number;
      readonly currentX: number;
      readonly currentY: number;
      readonly deltaX: number;
      readonly deltaY: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "DRAG_MOVE";
      readonly pointerId: number;
      readonly pointerType: PointerType;
      readonly startX: number;
      readonly startY: number;
      readonly currentX: number;
      readonly currentY: number;
      readonly deltaX: number;
      readonly deltaY: number;
      readonly totalDeltaX: number;
      readonly totalDeltaY: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "DRAG_END";
      readonly pointerId: number;
      readonly pointerType: PointerType;
      readonly startX: number;
      readonly startY: number;
      readonly currentX: number;
      readonly currentY: number;
      readonly totalDeltaX: number;
      readonly totalDeltaY: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "DRAG_CANCEL";
      readonly pointerId: number;
      readonly pointerType: PointerType;
      readonly startX: number;
      readonly startY: number;
      readonly currentX: number;
      readonly currentY: number;
      readonly timestamp: number;
      readonly reason: CancellationReason;
    }
  | {
      readonly type: "CANCEL";
      readonly pointerId?: number;
      readonly timestamp: number;
      readonly reason: CancellationReason;
    }
  | {
      readonly type: "WHEEL_OWNED";
      readonly deltaX: number;
      readonly deltaY: number;
      readonly deltaMode: number;
      readonly x: number;
      readonly y: number;
      readonly timestamp: number;
      readonly modifiers?: GestureModifiers;
    }
  | {
      readonly type: "WHEEL_HANDOFF";
      readonly deltaX: number;
      readonly deltaY: number;
      readonly deltaMode: number;
      readonly x: number;
      readonly y: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "KEY_ACTIVATE";
      readonly timestamp: number;
      readonly repeat?: boolean;
    }
  | {
      readonly type: "KEY_CANCEL";
      readonly timestamp: number;
    }
  | {
      readonly type: "KEY_NAVIGATE";
      readonly direction: "PREVIOUS" | "NEXT" | "UP" | "DOWN";
      readonly timestamp: number;
      readonly repeat?: boolean;
    };

/* ------------------------------------------------------------------ */
/* Effects (DOM-agnostic Action Requests)                             */
/* ------------------------------------------------------------------ */

export type GestureEffect =
  | {
      readonly type: "REQUEST_POINTER_CAPTURE";
      readonly pointerId: number;
    }
  | {
      readonly type: "RELEASE_POINTER_CAPTURE";
      readonly pointerId: number;
    }
  | {
      readonly type: "SCHEDULE_DEADLINE";
      readonly deadlineType: "LONG_PRESS" | "DOUBLE_CLICK_WINDOW";
      readonly timestamp: number;
      readonly durationMs: number;
    }
  | {
      readonly type: "CANCEL_DEADLINE";
      readonly deadlineType: "LONG_PRESS" | "DOUBLE_CLICK_WINDOW" | "ALL";
    };

/* ------------------------------------------------------------------ */
/* State Model                                                        */
/* ------------------------------------------------------------------ */

export interface ActivePointerState {
  readonly pointerId: number;
  readonly pointerType: PointerType;
  readonly button: number;
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
  readonly lastX: number;
  readonly lastY: number;
  readonly startTimestamp: number;
  readonly lastTimestamp: number;
  readonly captured: boolean;
  readonly isSecondPressOfPotentialDouble?: boolean;
}

export interface PendingClickState {
  readonly pointerId: number;
  readonly pointerType: PointerType;
  readonly button: number;
  readonly x: number;
  readonly y: number;
  readonly timestamp: number;
  readonly deadline: number;
}

export interface GestureArbiterState {
  readonly phase: GesturePhase;
  readonly activePointer: ActivePointerState | null;
  readonly pendingClick: PendingClickState | null;
  readonly lastTimestamp: number;
}

export interface GestureArbiterResult {
  readonly state: GestureArbiterState;
  readonly intents: readonly GestureIntent[];
  readonly effects: readonly GestureEffect[];
}

export function createInitialGestureArbiterState(): GestureArbiterState {
  return Object.freeze({
    phase: "IDLE",
    activePointer: null,
    pendingClick: null,
    lastTimestamp: 0,
  });
}

/* ------------------------------------------------------------------ */
/* Internal Pure Helpers                                              */
/* ------------------------------------------------------------------ */

function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function assertFiniteNumber(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number, received: ${String(value)}`);
  }
}

/* ------------------------------------------------------------------ */
/* Pure Reducer                                                       */
/* ------------------------------------------------------------------ */

/**
 * Pure state machine reducer for gesture arbitration.
 *
 * Deterministic: For identical (state, event, config), returns identical (state, intents, effects).
 * Contains no external timers, Date calls, or DOM dependencies.
 */
export function reduceGesture(
  state: GestureArbiterState,
  event: GestureEvent,
  userConfig?: GestureArbiterConfig,
): GestureArbiterResult {
  const config = resolveGestureArbiterConfig(userConfig);
  const intents: GestureIntent[] = [];
  const effects: GestureEffect[] = [];

  const timestamp = event.timestamp ?? state.lastTimestamp;
  assertFiniteNumber(timestamp, "event.timestamp");

  switch (event.type) {
    /* ============================================================== */
    /* RESET                                                          */
    /* ============================================================== */
    case "RESET": {
      if (state.activePointer?.captured) {
        effects.push({
          type: "RELEASE_POINTER_CAPTURE",
          pointerId: state.activePointer.pointerId,
        });
      }

      if (state.phase === "DRAG_ACTIVE" && state.activePointer) {
        intents.push({
          type: "DRAG_CANCEL",
          pointerId: state.activePointer.pointerId,
          pointerType: state.activePointer.pointerType,
          startX: state.activePointer.startX,
          startY: state.activePointer.startY,
          currentX: state.activePointer.currentX,
          currentY: state.activePointer.currentY,
          timestamp,
          reason: "reset",
        });
      } else if (
        (state.phase === "PRESS_PENDING" || state.phase === "LONG_PRESS_COMMITTED") &&
        state.activePointer
      ) {
        intents.push({
          type: "CANCEL",
          pointerId: state.activePointer.pointerId,
          timestamp,
          reason: "reset",
        });
      }

      effects.push({ type: "CANCEL_DEADLINE", deadlineType: "ALL" });

      return {
        state: createInitialGestureArbiterState(),
        intents: Object.freeze(intents),
        effects: Object.freeze(effects),
      };
    }

    /* ============================================================== */
    /* POINTER_DOWN                                                   */
    /* ============================================================== */
    case "POINTER_DOWN": {
      assertFiniteNumber(event.x, "event.x");
      assertFiniteNumber(event.y, "event.y");
      assertFiniteNumber(event.pointerId, "event.pointerId");

      const pointerType: PointerType = event.pointerType ?? "mouse";
      const button = event.button ?? config.primaryButton;

      // Button filtering: if button is explicitly non-primary, do not initiate primary gesture
      if (button !== config.primaryButton) {
        return { state, intents: Object.freeze([]), effects: Object.freeze([]) };
      }

      // Handle multi-pointer collision if a pointer is already active
      if (state.activePointer !== null) {
        if (event.pointerId === state.activePointer.pointerId) {
          // Redundant down for same pointer, ignore
          return { state, intents: Object.freeze([]), effects: Object.freeze([]) };
        }

        if (config.multiPointerPolicy === "ignore-secondary") {
          // Primary pointer keeps full authority; secondary pointer is ignored
          return { state, intents: Object.freeze([]), effects: Object.freeze([]) };
        } else {
          // "cancel-active": secondary pointer cancels active interaction
          if (state.activePointer.captured) {
            effects.push({
              type: "RELEASE_POINTER_CAPTURE",
              pointerId: state.activePointer.pointerId,
            });
          }

          if (state.phase === "DRAG_ACTIVE") {
            intents.push({
              type: "DRAG_CANCEL",
              pointerId: state.activePointer.pointerId,
              pointerType: state.activePointer.pointerType,
              startX: state.activePointer.startX,
              startY: state.activePointer.startY,
              currentX: state.activePointer.currentX,
              currentY: state.activePointer.currentY,
              timestamp,
              reason: "multi_pointer",
            });
          } else {
            intents.push({
              type: "CANCEL",
              pointerId: state.activePointer.pointerId,
              timestamp,
              reason: "multi_pointer",
            });
          }

          effects.push({ type: "CANCEL_DEADLINE", deadlineType: "ALL" });

          return {
            state: createInitialGestureArbiterState(),
            intents: Object.freeze(intents),
            effects: Object.freeze(effects),
          };
        }
      }

      // Check if we are in CLICK_PENDING_SECOND window
      if (state.phase === "CLICK_PENDING_SECOND" && state.pendingClick !== null) {
        const dist = calculateDistance(
          state.pendingClick.x,
          state.pendingClick.y,
          event.x,
          event.y,
        );

        const isCompatible =
          timestamp <= state.pendingClick.deadline &&
          dist <= config.doubleClickDistancePx &&
          pointerType === state.pendingClick.pointerType &&
          button === state.pendingClick.button;

        if (isCompatible) {
          // Compatible second down for potential double-click
          effects.push({ type: "CANCEL_DEADLINE", deadlineType: "DOUBLE_CLICK_WINDOW" });

          const captured = config.requestCaptureOnPress;
          if (captured) {
            effects.push({ type: "REQUEST_POINTER_CAPTURE", pointerId: event.pointerId });
          }

          if (config.enableLongPress && config.longPressMs > 0) {
            effects.push({
              type: "SCHEDULE_DEADLINE",
              deadlineType: "LONG_PRESS",
              timestamp: timestamp + config.longPressMs,
              durationMs: config.longPressMs,
            });
          }

          intents.push({
            type: "PRESS_START",
            pointerId: event.pointerId,
            pointerType,
            x: event.x,
            y: event.y,
            button,
            timestamp,
          });

          const nextActive: ActivePointerState = Object.freeze({
            pointerId: event.pointerId,
            pointerType,
            button,
            startX: event.x,
            startY: event.y,
            currentX: event.x,
            currentY: event.y,
            lastX: event.x,
            lastY: event.y,
            startTimestamp: timestamp,
            lastTimestamp: timestamp,
            captured,
            isSecondPressOfPotentialDouble: true,
          });

          return {
            state: Object.freeze({
              phase: "PRESS_PENDING",
              activePointer: nextActive,
              pendingClick: state.pendingClick,
              lastTimestamp: timestamp,
            }),
            intents: Object.freeze(intents),
            effects: Object.freeze(effects),
          };
        } else {
          // Incompatible second press: commit first click as single click, start fresh press
          intents.push({
            type: "CLICK",
            pointerId: state.pendingClick.pointerId,
            pointerType: state.pendingClick.pointerType,
            x: state.pendingClick.x,
            y: state.pendingClick.y,
            button: state.pendingClick.button,
            timestamp: state.pendingClick.timestamp,
            count: 1,
          });

          effects.push({ type: "CANCEL_DEADLINE", deadlineType: "DOUBLE_CLICK_WINDOW" });
        }
      }

      // Standard fresh press start from IDLE
      const captured = config.requestCaptureOnPress;
      if (captured) {
        effects.push({ type: "REQUEST_POINTER_CAPTURE", pointerId: event.pointerId });
      }

      if (config.enableLongPress && config.longPressMs > 0) {
        effects.push({
          type: "SCHEDULE_DEADLINE",
          deadlineType: "LONG_PRESS",
          timestamp: timestamp + config.longPressMs,
          durationMs: config.longPressMs,
        });
      }

      intents.push({
        type: "PRESS_START",
        pointerId: event.pointerId,
        pointerType,
        x: event.x,
        y: event.y,
        button,
        timestamp,
      });

      const nextActive: ActivePointerState = Object.freeze({
        pointerId: event.pointerId,
        pointerType,
        button,
        startX: event.x,
        startY: event.y,
        currentX: event.x,
        currentY: event.y,
        lastX: event.x,
        lastY: event.y,
        startTimestamp: timestamp,
        lastTimestamp: timestamp,
        captured,
        isSecondPressOfPotentialDouble: false,
      });

      return {
        state: Object.freeze({
          phase: "PRESS_PENDING",
          activePointer: nextActive,
          pendingClick: null,
          lastTimestamp: timestamp,
        }),
        intents: Object.freeze(intents),
        effects: Object.freeze(effects),
      };
    }

    /* ============================================================== */
    /* POINTER_MOVE                                                   */
    /* ============================================================== */
    case "POINTER_MOVE": {
      assertFiniteNumber(event.x, "event.x");
      assertFiniteNumber(event.y, "event.y");
      assertFiniteNumber(event.pointerId, "event.pointerId");

      if (state.activePointer === null) {
        return {
          state: Object.freeze({ ...state, lastTimestamp: timestamp }),
          intents: Object.freeze([]),
          effects: Object.freeze([]),
        };
      }

      // Multi-pointer isolation
      if (event.pointerId !== state.activePointer.pointerId) {
        return {
          state: Object.freeze({ ...state, lastTimestamp: timestamp }),
          intents: Object.freeze([]),
          effects: Object.freeze([]),
        };
      }

      const active = state.activePointer;
      const totalDist = calculateDistance(active.startX, active.startY, event.x, event.y);

      switch (state.phase) {
        case "PRESS_PENDING": {
          // Check long-press duration satisfy via move timestamp
          if (
            config.enableLongPress &&
            config.longPressMs > 0 &&
            timestamp - active.startTimestamp >= config.longPressMs &&
            totalDist < config.dragThresholdPx
          ) {
            effects.push({ type: "CANCEL_DEADLINE", deadlineType: "LONG_PRESS" });

            intents.push({
              type: "LONG_PRESS",
              pointerId: active.pointerId,
              pointerType: active.pointerType,
              x: event.x,
              y: event.y,
              button: active.button,
              timestamp,
              durationMs: timestamp - active.startTimestamp,
            });

            const nextActive: ActivePointerState = Object.freeze({
              ...active,
              currentX: event.x,
              currentY: event.y,
              lastX: event.x,
              lastY: event.y,
              lastTimestamp: timestamp,
            });

            return {
              state: Object.freeze({
                phase: "LONG_PRESS_COMMITTED",
                activePointer: nextActive,
                pendingClick: null,
                lastTimestamp: timestamp,
              }),
              intents: Object.freeze(intents),
              effects: Object.freeze(effects),
            };
          }

          // Check drag threshold crossing
          if (totalDist >= config.dragThresholdPx) {
            // If this was the second tap of potential double-click, the drag breaks the double-click.
            // Commit the first tap as a single click now.
            if (active.isSecondPressOfPotentialDouble && state.pendingClick) {
              intents.push({
                type: "CLICK",
                pointerId: state.pendingClick.pointerId,
                pointerType: state.pendingClick.pointerType,
                x: state.pendingClick.x,
                y: state.pendingClick.y,
                button: state.pendingClick.button,
                timestamp: state.pendingClick.timestamp,
                count: 1,
              });
            }

            effects.push({ type: "CANCEL_DEADLINE", deadlineType: "LONG_PRESS" });

            let captured = active.captured;
            if (config.requestCaptureOnDrag && !captured) {
              captured = true;
              effects.push({
                type: "REQUEST_POINTER_CAPTURE",
                pointerId: active.pointerId,
              });
            }

            intents.push({
              type: "DRAG_START",
              pointerId: active.pointerId,
              pointerType: active.pointerType,
              startX: active.startX,
              startY: active.startY,
              currentX: event.x,
              currentY: event.y,
              deltaX: event.x - active.startX,
              deltaY: event.y - active.startY,
              timestamp,
            });

            const nextActive: ActivePointerState = Object.freeze({
              ...active,
              currentX: event.x,
              currentY: event.y,
              lastX: event.x,
              lastY: event.y,
              lastTimestamp: timestamp,
              captured,
              isSecondPressOfPotentialDouble: false,
            });

            return {
              state: Object.freeze({
                phase: "DRAG_ACTIVE",
                activePointer: nextActive,
                pendingClick: null,
                lastTimestamp: timestamp,
              }),
              intents: Object.freeze(intents),
              effects: Object.freeze(effects),
            };
          }

          // Sub-threshold movement: remain in PRESS_PENDING
          const nextActive: ActivePointerState = Object.freeze({
            ...active,
            currentX: event.x,
            currentY: event.y,
            lastX: event.x,
            lastY: event.y,
            lastTimestamp: timestamp,
          });

          return {
            state: Object.freeze({
              ...state,
              activePointer: nextActive,
              lastTimestamp: timestamp,
            }),
            intents: Object.freeze([]),
            effects: Object.freeze([]),
          };
        }

        case "DRAG_ACTIVE": {
          const deltaX = event.x - active.lastX;
          const deltaY = event.y - active.lastY;
          const totalDeltaX = event.x - active.startX;
          const totalDeltaY = event.y - active.startY;

          intents.push({
            type: "DRAG_MOVE",
            pointerId: active.pointerId,
            pointerType: active.pointerType,
            startX: active.startX,
            startY: active.startY,
            currentX: event.x,
            currentY: event.y,
            deltaX,
            deltaY,
            totalDeltaX,
            totalDeltaY,
            timestamp,
          });

          const nextActive: ActivePointerState = Object.freeze({
            ...active,
            currentX: event.x,
            currentY: event.y,
            lastX: event.x,
            lastY: event.y,
            lastTimestamp: timestamp,
          });

          return {
            state: Object.freeze({
              ...state,
              activePointer: nextActive,
              lastTimestamp: timestamp,
            }),
            intents: Object.freeze(intents),
            effects: Object.freeze([]),
          };
        }

        case "LONG_PRESS_COMMITTED": {
          // Long press was committed; tracking coordinates without drag or click emission
          const nextActive: ActivePointerState = Object.freeze({
            ...active,
            currentX: event.x,
            currentY: event.y,
            lastX: event.x,
            lastY: event.y,
            lastTimestamp: timestamp,
          });

          return {
            state: Object.freeze({
              ...state,
              activePointer: nextActive,
              lastTimestamp: timestamp,
            }),
            intents: Object.freeze([]),
            effects: Object.freeze([]),
          };
        }

        default:
          return {
            state: Object.freeze({ ...state, lastTimestamp: timestamp }),
            intents: Object.freeze([]),
            effects: Object.freeze([]),
          };
      }
    }

    /* ============================================================== */
    /* POINTER_UP                                                     */
    /* ============================================================== */
    case "POINTER_UP": {
      assertFiniteNumber(event.x, "event.x");
      assertFiniteNumber(event.y, "event.y");
      assertFiniteNumber(event.pointerId, "event.pointerId");

      if (state.activePointer === null) {
        return {
          state: Object.freeze({ ...state, lastTimestamp: timestamp }),
          intents: Object.freeze([]),
          effects: Object.freeze([]),
        };
      }

      if (event.pointerId !== state.activePointer.pointerId) {
        // Mismatched pointer up under PRIMARY_POINTER_AUTHORITY
        return {
          state: Object.freeze({ ...state, lastTimestamp: timestamp }),
          intents: Object.freeze([]),
          effects: Object.freeze([]),
        };
      }

      const active = state.activePointer;

      if (active.captured) {
        effects.push({
          type: "RELEASE_POINTER_CAPTURE",
          pointerId: active.pointerId,
        });
      }

      switch (state.phase) {
        case "DRAG_ACTIVE": {
          effects.push({ type: "CANCEL_DEADLINE", deadlineType: "ALL" });

          intents.push({
            type: "DRAG_END",
            pointerId: active.pointerId,
            pointerType: active.pointerType,
            startX: active.startX,
            startY: active.startY,
            currentX: event.x,
            currentY: event.y,
            totalDeltaX: event.x - active.startX,
            totalDeltaY: event.y - active.startY,
            timestamp,
          });

          return {
            state: Object.freeze({
              phase: "IDLE",
              activePointer: null,
              pendingClick: null,
              lastTimestamp: timestamp,
            }),
            intents: Object.freeze(intents),
            effects: Object.freeze(effects),
          };
        }

        case "LONG_PRESS_COMMITTED": {
          // Long press was committed earlier; release pointer without click
          effects.push({ type: "CANCEL_DEADLINE", deadlineType: "ALL" });

          return {
            state: Object.freeze({
              phase: "IDLE",
              activePointer: null,
              pendingClick: null,
              lastTimestamp: timestamp,
            }),
            intents: Object.freeze([]),
            effects: Object.freeze(effects),
          };
        }

        case "PRESS_PENDING": {
          effects.push({ type: "CANCEL_DEADLINE", deadlineType: "LONG_PRESS" });

          // Case A: This was the second tap of a double click
          if (active.isSecondPressOfPotentialDouble && state.pendingClick !== null) {
            intents.push({
              type: "DOUBLE_CLICK",
              pointerId: active.pointerId,
              pointerType: active.pointerType,
              x: event.x,
              y: event.y,
              button: active.button,
              timestamp,
              count: 2,
            });

            return {
              state: Object.freeze({
                phase: "IDLE",
                activePointer: null,
                pendingClick: null,
                lastTimestamp: timestamp,
              }),
              intents: Object.freeze(intents),
              effects: Object.freeze(effects),
            };
          }

          // Case B: First tap completed. Check double-click window policy.
          if (config.enableDoubleClick && config.doubleClickWindowMs > 0) {
            const deadline = timestamp + config.doubleClickWindowMs;
            effects.push({
              type: "SCHEDULE_DEADLINE",
              deadlineType: "DOUBLE_CLICK_WINDOW",
              timestamp: deadline,
              durationMs: config.doubleClickWindowMs,
            });

            const pendingClick: PendingClickState = Object.freeze({
              pointerId: active.pointerId,
              pointerType: active.pointerType,
              button: active.button,
              x: event.x,
              y: event.y,
              timestamp,
              deadline,
            });

            return {
              state: Object.freeze({
                phase: "CLICK_PENDING_SECOND",
                activePointer: null,
                pendingClick,
                lastTimestamp: timestamp,
              }),
              intents: Object.freeze(intents),
              effects: Object.freeze(effects),
            };
          }

          // Case C: Double click disabled or window is 0 -> commit CLICK immediately
          intents.push({
            type: "CLICK",
            pointerId: active.pointerId,
            pointerType: active.pointerType,
            x: event.x,
            y: event.y,
            button: active.button,
            timestamp,
            count: 1,
          });

          return {
            state: Object.freeze({
              phase: "IDLE",
              activePointer: null,
              pendingClick: null,
              lastTimestamp: timestamp,
            }),
            intents: Object.freeze(intents),
            effects: Object.freeze(effects),
          };
        }

        default:
          return {
            state: Object.freeze({
              phase: "IDLE",
              activePointer: null,
              pendingClick: null,
              lastTimestamp: timestamp,
            }),
            intents: Object.freeze([]),
            effects: Object.freeze(effects),
          };
      }
    }

    /* ============================================================== */
    /* POINTER_CANCEL                                                 */
    /* ============================================================== */
    case "POINTER_CANCEL": {
      assertFiniteNumber(event.pointerId, "event.pointerId");

      if (state.activePointer === null) {
        if (state.phase === "CLICK_PENDING_SECOND") {
          effects.push({ type: "CANCEL_DEADLINE", deadlineType: "ALL" });
          intents.push({
            type: "CANCEL",
            timestamp,
            reason: "pointer_cancel",
          });
          return {
            state: createInitialGestureArbiterState(),
            intents: Object.freeze(intents),
            effects: Object.freeze(effects),
          };
        }
        return {
          state: Object.freeze({ ...state, lastTimestamp: timestamp }),
          intents: Object.freeze([]),
          effects: Object.freeze([]),
        };
      }

      if (event.pointerId !== state.activePointer.pointerId) {
        return {
          state: Object.freeze({ ...state, lastTimestamp: timestamp }),
          intents: Object.freeze([]),
          effects: Object.freeze([]),
        };
      }

      const active = state.activePointer;

      if (active.captured) {
        effects.push({
          type: "RELEASE_POINTER_CAPTURE",
          pointerId: active.pointerId,
        });
      }

      effects.push({ type: "CANCEL_DEADLINE", deadlineType: "ALL" });

      if (state.phase === "DRAG_ACTIVE") {
        intents.push({
          type: "DRAG_CANCEL",
          pointerId: active.pointerId,
          pointerType: active.pointerType,
          startX: active.startX,
          startY: active.startY,
          currentX: active.currentX,
          currentY: active.currentY,
          timestamp,
          reason: "pointer_cancel",
        });
      } else {
        intents.push({
          type: "CANCEL",
          pointerId: active.pointerId,
          timestamp,
          reason: "pointer_cancel",
        });
      }

      return {
        state: createInitialGestureArbiterState(),
        intents: Object.freeze(intents),
        effects: Object.freeze(effects),
      };
    }

    /* ============================================================== */
    /* LOST_POINTER_CAPTURE                                           */
    /* ============================================================== */
    case "LOST_POINTER_CAPTURE": {
      assertFiniteNumber(event.pointerId, "event.pointerId");

      if (state.activePointer === null || event.pointerId !== state.activePointer.pointerId) {
        return {
          state: Object.freeze({ ...state, lastTimestamp: timestamp }),
          intents: Object.freeze([]),
          effects: Object.freeze([]),
        };
      }

      const active = state.activePointer;
      effects.push({ type: "CANCEL_DEADLINE", deadlineType: "ALL" });

      if (state.phase === "DRAG_ACTIVE") {
        intents.push({
          type: "DRAG_CANCEL",
          pointerId: active.pointerId,
          pointerType: active.pointerType,
          startX: active.startX,
          startY: active.startY,
          currentX: active.currentX,
          currentY: active.currentY,
          timestamp,
          reason: "lost_capture",
        });
      } else {
        intents.push({
          type: "CANCEL",
          pointerId: active.pointerId,
          timestamp,
          reason: "lost_capture",
        });
      }

      return {
        state: createInitialGestureArbiterState(),
        intents: Object.freeze(intents),
        effects: Object.freeze(effects),
      };
    }

    /* ============================================================== */
    /* TICK                                                           */
    /* ============================================================== */
    case "TICK": {
      if (state.phase === "PRESS_PENDING" && state.activePointer !== null) {
        const active = state.activePointer;
        if (
          config.enableLongPress &&
          config.longPressMs > 0 &&
          timestamp >= active.startTimestamp + config.longPressMs
        ) {
          effects.push({ type: "CANCEL_DEADLINE", deadlineType: "LONG_PRESS" });

          intents.push({
            type: "LONG_PRESS",
            pointerId: active.pointerId,
            pointerType: active.pointerType,
            x: active.currentX,
            y: active.currentY,
            button: active.button,
            timestamp,
            durationMs: timestamp - active.startTimestamp,
          });

          return {
            state: Object.freeze({
              phase: "LONG_PRESS_COMMITTED",
              activePointer: active,
              pendingClick: null,
              lastTimestamp: timestamp,
            }),
            intents: Object.freeze(intents),
            effects: Object.freeze(effects),
          };
        }
      }

      if (state.phase === "CLICK_PENDING_SECOND" && state.pendingClick !== null) {
        if (timestamp >= state.pendingClick.deadline) {
          effects.push({ type: "CANCEL_DEADLINE", deadlineType: "DOUBLE_CLICK_WINDOW" });

          intents.push({
            type: "CLICK",
            pointerId: state.pendingClick.pointerId,
            pointerType: state.pendingClick.pointerType,
            x: state.pendingClick.x,
            y: state.pendingClick.y,
            button: state.pendingClick.button,
            timestamp: state.pendingClick.timestamp,
            count: 1,
          });

          return {
            state: Object.freeze({
              phase: "IDLE",
              activePointer: null,
              pendingClick: null,
              lastTimestamp: timestamp,
            }),
            intents: Object.freeze(intents),
            effects: Object.freeze(effects),
          };
        }
      }

      return {
        state: Object.freeze({ ...state, lastTimestamp: timestamp }),
        intents: Object.freeze([]),
        effects: Object.freeze([]),
      };
    }

    /* ============================================================== */
    /* WHEEL                                                          */
    /* ============================================================== */
    case "WHEEL": {
      assertFiniteNumber(event.deltaX, "event.deltaX");
      assertFiniteNumber(event.deltaY, "event.deltaY");
      assertFiniteNumber(event.x, "event.x");
      assertFiniteNumber(event.y, "event.y");

      if (config.wheelPolicy === "ignore") {
        return {
          state: Object.freeze({ ...state, lastTimestamp: timestamp }),
          intents: Object.freeze([]),
          effects: Object.freeze([]),
        };
      }

      if (config.wheelPolicy === "handoff") {
        intents.push({
          type: "WHEEL_HANDOFF",
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          deltaMode: event.deltaMode ?? 0,
          x: event.x,
          y: event.y,
          timestamp,
        });
      } else {
        // "own" or "block-on-drag"
        intents.push({
          type: "WHEEL_OWNED",
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          deltaMode: event.deltaMode ?? 0,
          x: event.x,
          y: event.y,
          timestamp,
          modifiers: event.modifiers,
        });
      }

      return {
        state: Object.freeze({ ...state, lastTimestamp: timestamp }),
        intents: Object.freeze(intents),
        effects: Object.freeze([]),
      };
    }

    /* ============================================================== */
    /* KEY_INTENT                                                     */
    /* ============================================================== */
    case "KEY_INTENT": {
      switch (event.intent) {
        case "ACTIVATE": {
          if (state.phase === "CLICK_PENDING_SECOND" && state.pendingClick !== null) {
            intents.push({
              type: "CLICK",
              pointerId: state.pendingClick.pointerId,
              pointerType: state.pendingClick.pointerType,
              x: state.pendingClick.x,
              y: state.pendingClick.y,
              button: state.pendingClick.button,
              timestamp: state.pendingClick.timestamp,
              count: 1,
            });
            effects.push({ type: "CANCEL_DEADLINE", deadlineType: "DOUBLE_CLICK_WINDOW" });
          }

          intents.push({
            type: "KEY_ACTIVATE",
            timestamp,
            repeat: event.repeat,
          });

          return {
            state: Object.freeze({
              phase: "IDLE",
              activePointer: null,
              pendingClick: null,
              lastTimestamp: timestamp,
            }),
            intents: Object.freeze(intents),
            effects: Object.freeze(effects),
          };
        }

        case "CANCEL": {
          if (state.activePointer?.captured) {
            effects.push({
              type: "RELEASE_POINTER_CAPTURE",
              pointerId: state.activePointer.pointerId,
            });
          }

          effects.push({ type: "CANCEL_DEADLINE", deadlineType: "ALL" });

          if (state.phase === "DRAG_ACTIVE" && state.activePointer) {
            intents.push({
              type: "DRAG_CANCEL",
              pointerId: state.activePointer.pointerId,
              pointerType: state.activePointer.pointerType,
              startX: state.activePointer.startX,
              startY: state.activePointer.startY,
              currentX: state.activePointer.currentX,
              currentY: state.activePointer.currentY,
              timestamp,
              reason: "key_cancel",
            });
          }

          intents.push({
            type: "KEY_CANCEL",
            timestamp,
          });

          return {
            state: createInitialGestureArbiterState(),
            intents: Object.freeze(intents),
            effects: Object.freeze(effects),
          };
        }

        case "NAVIGATE_PREVIOUS":
        case "NAVIGATE_NEXT":
        case "NAVIGATE_UP":
        case "NAVIGATE_DOWN": {
          if (state.phase === "CLICK_PENDING_SECOND" && state.pendingClick !== null) {
            intents.push({
              type: "CLICK",
              pointerId: state.pendingClick.pointerId,
              pointerType: state.pendingClick.pointerType,
              x: state.pendingClick.x,
              y: state.pendingClick.y,
              button: state.pendingClick.button,
              timestamp: state.pendingClick.timestamp,
              count: 1,
            });
            effects.push({ type: "CANCEL_DEADLINE", deadlineType: "DOUBLE_CLICK_WINDOW" });
          }

          const dirMap: Record<string, "PREVIOUS" | "NEXT" | "UP" | "DOWN"> = {
            NAVIGATE_PREVIOUS: "PREVIOUS",
            NAVIGATE_NEXT: "NEXT",
            NAVIGATE_UP: "UP",
            NAVIGATE_DOWN: "DOWN",
          };

          intents.push({
            type: "KEY_NAVIGATE",
            direction: dirMap[event.intent]!,
            timestamp,
            repeat: event.repeat,
          });

          return {
            state: Object.freeze({
              phase: "IDLE",
              activePointer: null,
              pendingClick: null,
              lastTimestamp: timestamp,
            }),
            intents: Object.freeze(intents),
            effects: Object.freeze(effects),
          };
        }

        default:
          return {
            state: Object.freeze({ ...state, lastTimestamp: timestamp }),
            intents: Object.freeze([]),
            effects: Object.freeze([]),
          };
      }
    }

    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}
