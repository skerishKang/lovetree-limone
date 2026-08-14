import {
  TRACK63_MOMENTS,
  TRACK63_SEED_SETS,
} from "./data";
import type {
  SavedViewPreset,
  Track63StudioState,
  Track63ViewParameters,
} from "./types";
import {
  DEFAULT_VIEW_PARAMETERS,
  TRACK63_VIEW_DEFINITIONS,
} from "./view-definitions";

const SESSION_STORAGE_KEY = "lovetree:track63:views";

export function loadSavedPresets(): SavedViewPreset[] {
  const initialPresets: SavedViewPreset[] = [
    {
      id: "preset-demo-1",
      name: "3D 시네마틱 링 (Default Orbit)",
      viewDefinitionId: "orbit-ring-3d",
      createdAt: "2024-08-15T00:00:00.000Z",
      parameters: { ...DEFAULT_VIEW_PARAMETERS, spread: 280, orbitTilt: 20 },
    },
    {
      id: "preset-demo-2",
      name: "황금비 로맨틱 하트 (Heart Petal)",
      viewDefinitionId: "symbolic-heart",
      createdAt: "2024-08-15T00:01:00.000Z",
      parameters: { ...DEFAULT_VIEW_PARAMETERS, spread: 260, rotationX: 15 },
    },
    {
      id: "preset-demo-3",
      name: "깊이감 있는 모자이크 월 (Mosaic Wall)",
      viewDefinitionId: "wall-mosaic",
      createdAt: "2024-08-15T00:02:00.000Z",
      parameters: { ...DEFAULT_VIEW_PARAMETERS, spacingX: 140, spacingY: 140 },
    },
  ];

  if (typeof window === "undefined" || !window.sessionStorage) {
    return initialPresets;
  }
  try {
    const item = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!item) return initialPresets;
    const parsed = JSON.parse(item);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore parse error, fallback
  }
  return initialPresets;
}

export function savePresetsToSession(presets: readonly SavedViewPreset[]): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // ignore quota/privacy errors
  }
}

export function createInitialStudioState(): Track63StudioState {
  const initialView = TRACK63_VIEW_DEFINITIONS[0];
  const initialSeed = TRACK63_SEED_SETS[0];
  const mergedParams: Track63ViewParameters = {
    ...DEFAULT_VIEW_PARAMETERS,
    ...initialView.defaultParams,
  };

  return {
    selectedSeedId: initialSeed.id,
    selectedViewId: initialView.id,
    selectedMomentId: initialSeed.momentIds[0] ?? TRACK63_MOMENTS[0].id,
    playing: false,
    scrubPhase: 0,
    parameters: mergedParams,
    savedPresets: loadSavedPresets(),
    activeMediaPlayingId: null,
    inspectorTab: "layout",
    overlayModal: "none",
    historyPast: [],
    historyFuture: [],
  };
}

export type Track63StudioAction =
  | { type: "select-seed"; seedId: string }
  | { type: "select-view"; viewId: string }
  | { type: "select-moment"; momentId: string | null }
  | { type: "set-playing"; playing: boolean }
  | { type: "set-scrub-phase"; phase: number }
  | { type: "update-param"; key: keyof Track63ViewParameters; value: any }
  | { type: "set-params"; params: Partial<Track63ViewParameters> }
  | { type: "reset-params" }
  | { type: "save-preset"; name: string }
  | { type: "restore-preset"; presetId: string }
  | { type: "delete-preset"; presetId: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "set-active-media-playing"; momentId: string | null }
  | { type: "set-inspector-tab"; tab: "layout" | "style" | "motion" | "connections" }
  | { type: "set-overlay-modal"; modal: "none" | "save-preset" | "service-handoff" | "media-inspect" };

export function reduceStudioState(
  state: Track63StudioState,
  action: Track63StudioAction,
): Track63StudioState {
  switch (action.type) {
    case "select-seed": {
      const seed = TRACK63_SEED_SETS.find((s) => s.id === action.seedId);
      if (!seed) return state;
      // If current selected moment is not in the new seed set, select the first moment
      const newSelectedMomentId = seed.momentIds.includes(state.selectedMomentId ?? "")
        ? state.selectedMomentId
        : seed.momentIds[0] ?? null;
      return {
        ...state,
        selectedSeedId: action.seedId,
        selectedMomentId: newSelectedMomentId,
        parameters: { ...state.parameters, seedSet: action.seedId },
      };
    }

    case "select-view": {
      const view = TRACK63_VIEW_DEFINITIONS.find((v) => v.id === action.viewId);
      if (!view) return state;
      // Record undo state before view change
      const newPast = [...state.historyPast.slice(-19), state.parameters];
      const mergedParams: Track63ViewParameters = {
        ...state.parameters,
        ...view.defaultParams,
      };
      return {
        ...state,
        selectedViewId: action.viewId,
        parameters: mergedParams,
        historyPast: newPast,
        historyFuture: [],
      };
    }

    case "select-moment":
      return {
        ...state,
        selectedMomentId: action.momentId,
      };

    case "set-playing":
      return {
        ...state,
        playing: action.playing,
      };

    case "set-scrub-phase":
      return {
        ...state,
        scrubPhase: Math.max(0, Math.min(1, action.phase)),
      };

    case "update-param": {
      const newPast = [...state.historyPast.slice(-19), state.parameters];
      return {
        ...state,
        parameters: {
          ...state.parameters,
          [action.key]: action.value,
        },
        historyPast: newPast,
        historyFuture: [],
      };
    }

    case "set-params": {
      const newPast = [...state.historyPast.slice(-19), state.parameters];
      return {
        ...state,
        parameters: {
          ...state.parameters,
          ...action.params,
        },
        historyPast: newPast,
        historyFuture: [],
      };
    }

    case "reset-params": {
      const view = TRACK63_VIEW_DEFINITIONS.find((v) => v.id === state.selectedViewId);
      const defaults: Track63ViewParameters = {
        ...DEFAULT_VIEW_PARAMETERS,
        ...(view?.defaultParams ?? {}),
      };
      return {
        ...state,
        parameters: defaults,
        historyPast: [...state.historyPast.slice(-19), state.parameters],
        historyFuture: [],
      };
    }

    case "save-preset": {
      const newPreset: SavedViewPreset = {
        id: `preset-${Date.now()}`,
        name: action.name || `Custom View (${state.selectedViewId})`,
        viewDefinitionId: state.selectedViewId,
        createdAt: new Date().toISOString(),
        parameters: { ...state.parameters },
      };
      const updatedPresets = [...state.savedPresets, newPreset];
      savePresetsToSession(updatedPresets);
      return {
        ...state,
        savedPresets: updatedPresets,
        overlayModal: "none",
      };
    }

    case "restore-preset": {
      const preset = state.savedPresets.find((p) => p.id === action.presetId);
      if (!preset) return state;
      const newPast = [...state.historyPast.slice(-19), state.parameters];
      return {
        ...state,
        selectedViewId: preset.viewDefinitionId,
        parameters: { ...preset.parameters },
        historyPast: newPast,
        historyFuture: [],
      };
    }

    case "delete-preset": {
      const filtered = state.savedPresets.filter((p) => p.id !== action.presetId);
      savePresetsToSession(filtered);
      return {
        ...state,
        savedPresets: filtered,
      };
    }

    case "undo": {
      if (state.historyPast.length === 0) return state;
      const prevParams = state.historyPast[state.historyPast.length - 1];
      const newPast = state.historyPast.slice(0, -1);
      const newFuture = [state.parameters, ...state.historyFuture.slice(0, 19)];
      return {
        ...state,
        parameters: prevParams,
        historyPast: newPast,
        historyFuture: newFuture,
      };
    }

    case "redo": {
      if (state.historyFuture.length === 0) return state;
      const nextParams = state.historyFuture[0];
      const newFuture = state.historyFuture.slice(1);
      const newPast = [...state.historyPast.slice(-19), state.parameters];
      return {
        ...state,
        parameters: nextParams,
        historyPast: newPast,
        historyFuture: newFuture,
      };
    }

    case "set-active-media-playing": {
      // Enforces max 1 active playing video
      return {
        ...state,
        activeMediaPlayingId: action.momentId,
      };
    }

    case "set-inspector-tab":
      return {
        ...state,
        inspectorTab: action.tab,
      };

    case "set-overlay-modal":
      return {
        ...state,
        overlayModal: action.modal,
      };

    default:
      return state;
  }
}
