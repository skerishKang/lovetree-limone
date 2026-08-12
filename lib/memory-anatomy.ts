export const MEMORY_ANATOMY_LAYER_IDS = [
  "source-video",
  "moment-cut",
  "person-lock",
  "outfit-map",
  "emotion",
  "my-note",
  "connection",
] as const;

export type MemoryAnatomyLayerId = (typeof MEMORY_ANATOMY_LAYER_IDS)[number];
export type MemoryAnatomyPlayback = "idle" | "playing" | "paused" | "complete";

export interface CanonicalMomentFixture {
  id: string;
  title: string;
  originalSource: { kind: "video" | "image" | "audio" | "text"; label: string; provenance: string };
  selectedInterval: { startSeconds: number; endSeconds: number; label: string };
  person: { id: string; label: string; role: string };
  appearance: { label: string; context: string };
  emotion: { label: string; note: string };
  personalNote: { text: string; visibility: "private" | "shared" };
  connection: { label: string; nextMomentId: string | null; relation: string };
}

export interface MemoryAnatomyLayer {
  id: MemoryAnatomyLayerId;
  index: number;
  title: string;
  subtitle: string;
  description: string;
  meta: readonly string[];
  chips: readonly string[];
  synthetic: true;
}

export interface MemoryAnatomyState {
  explosion: number;
  selectedLayerId: MemoryAnatomyLayerId;
  rotationX: number;
  rotationY: number;
  playback: MemoryAnatomyPlayback;
  playbackStep: number;
}

export type MemoryAnatomyAction =
  | { type: "select-layer"; id: MemoryAnatomyLayerId; manual?: boolean }
  | { type: "move-selection"; delta: -1 | 1 }
  | { type: "set-explosion"; value: number; manual?: boolean }
  | { type: "assemble" }
  | { type: "explode" }
  | { type: "rotate-by"; deltaX: number; deltaY: number; manual?: boolean }
  | { type: "play" }
  | { type: "pause" }
  | { type: "replay" }
  | { type: "playback-tick" };

export const SYNTHETIC_MEMORY_FIXTURE: CanonicalMomentFixture = {
  id: "demo-moment-001",
  title: "Final chorus glance",
  originalSource: {
    kind: "video",
    label: "Stage video · local synthetic fixture",
    provenance: "Design Lab only · no remote media",
  },
  selectedInterval: {
    startSeconds: 18.24,
    endSeconds: 20.64,
    label: "2.40 second selected interval",
  },
  person: {
    id: "demo-subject-a",
    label: "Demo subject A",
    role: "Moment subject",
  },
  appearance: {
    label: "Black crystal stage look",
    context: "Performance context",
  },
  emotion: {
    label: "Awe + tenderness",
    note: "User-authored emotional description",
  },
  personalNote: {
    text: "I wanted to remember the look just before the song ended.",
    visibility: "private",
  },
  connection: {
    label: "Backstage smile",
    nextMomentId: "demo-moment-002",
    relation: "Next remembered moment",
  },
};

export function projectMomentToMemoryAnatomy(moment: CanonicalMomentFixture): readonly MemoryAnatomyLayer[] {
  const duration = Math.max(0, moment.selectedInterval.endSeconds - moment.selectedInterval.startSeconds).toFixed(2);
  return [
    {
      id: "source-video",
      index: 0,
      title: "SOURCE VIDEO",
      subtitle: "ORIGINAL",
      description: "The original source remains distinct from every derived interpretation of the Moment.",
      meta: [moment.originalSource.label, moment.originalSource.provenance],
      chips: [moment.originalSource.kind.toUpperCase(), "ORIGIN", "SYNTHETIC"],
      synthetic: true,
    },
    {
      id: "moment-cut",
      index: 1,
      title: "MOMENT CUT",
      subtitle: "TIMECODE",
      description: "The exact interval the user chose from the source, represented without changing the original source record.",
      meta: [`${moment.selectedInterval.startSeconds.toFixed(2)}s → ${moment.selectedInterval.endSeconds.toFixed(2)}s`, `${duration}s duration · ${moment.selectedInterval.label}`],
      chips: ["INTERVAL", "SELECTED", "SYNTHETIC"],
      synthetic: true,
    },
    {
      id: "person-lock",
      index: 2,
      title: "PERSON LOCK",
      subtitle: "IDENTITY",
      description: "The subject identity associated with this Moment. This candidate does not claim an AI identity score.",
      meta: [`${moment.person.label} · ${moment.person.role}`, `Subject id · ${moment.person.id}`],
      chips: ["PERSON", "SUBJECT", "NO SCORE"],
      synthetic: true,
    },
    {
      id: "outfit-map",
      index: 3,
      title: "OUTFIT MAP",
      subtitle: "COSTUME",
      description: "Appearance and scene context are projected as their own semantic layer rather than folded into identity.",
      meta: [moment.appearance.label, moment.appearance.context],
      chips: ["APPEARANCE", "CONTEXT", "SYNTHETIC"],
      synthetic: true,
    },
    {
      id: "emotion",
      index: 4,
      title: "EMOTION",
      subtitle: "FEELING",
      description: "The feeling layer is user-readable meaning, not a hidden confidence score.",
      meta: [moment.emotion.label, moment.emotion.note],
      chips: ["FEELING", "USER MEANING", "NO SCORE"],
      synthetic: true,
    },
    {
      id: "my-note",
      index: 5,
      title: "MY NOTE",
      subtitle: "PERSONAL",
      description: "A personal note is preserved separately so the user's own words do not become generated metadata.",
      meta: [moment.personalNote.text, `Visibility · ${moment.personalNote.visibility}`],
      chips: ["NOTE", "USER AUTHORED", "SYNTHETIC"],
      synthetic: true,
    },
    {
      id: "connection",
      index: 6,
      title: "CONNECTION",
      subtitle: "NEXT PATH",
      description: "The next-path relationship is represented separately from emotion and source metadata.",
      meta: [moment.connection.label, `${moment.connection.relation} · ${moment.connection.nextMomentId ?? "no next Moment"}`],
      chips: ["CONNECTION", "NEXT PATH", "SYNTHETIC"],
      synthetic: true,
    },
  ] as const;
}

export function createMemoryAnatomyState(): MemoryAnatomyState {
  return {
    explosion: 0.55,
    selectedLayerId: MEMORY_ANATOMY_LAYER_IDS[0],
    rotationX: -12,
    rotationY: -22,
    playback: "idle",
    playbackStep: 0,
  };
}

export function clampExplosion(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function adjacentLayerId(current: MemoryAnatomyLayerId, delta: -1 | 1): MemoryAnatomyLayerId {
  const index = MEMORY_ANATOMY_LAYER_IDS.indexOf(current);
  const next = Math.min(MEMORY_ANATOMY_LAYER_IDS.length - 1, Math.max(0, index + delta));
  return MEMORY_ANATOMY_LAYER_IDS[next];
}

function manualTakeover(state: MemoryAnatomyState): MemoryAnatomyState {
  return state.playback === "playing" ? { ...state, playback: "paused" } : state;
}

export function memoryAnatomyReducer(state: MemoryAnatomyState, action: MemoryAnatomyAction): MemoryAnatomyState {
  switch (action.type) {
    case "select-layer": {
      const base = action.manual === false ? state : manualTakeover(state);
      return {
        ...base,
        selectedLayerId: action.id,
        playbackStep: MEMORY_ANATOMY_LAYER_IDS.indexOf(action.id),
      };
    }
    case "move-selection": {
      const base = manualTakeover(state);
      const id = adjacentLayerId(base.selectedLayerId, action.delta);
      return { ...base, selectedLayerId: id, playbackStep: MEMORY_ANATOMY_LAYER_IDS.indexOf(id) };
    }
    case "set-explosion": {
      const base = action.manual === false ? state : manualTakeover(state);
      return { ...base, explosion: clampExplosion(action.value) };
    }
    case "assemble":
      return { ...manualTakeover(state), explosion: 0 };
    case "explode":
      return { ...manualTakeover(state), explosion: 1 };
    case "rotate-by": {
      const base = action.manual === false ? state : manualTakeover(state);
      return {
        ...base,
        rotationX: Math.min(30, Math.max(-45, base.rotationX - action.deltaY * 0.14)),
        rotationY: base.rotationY + action.deltaX * 0.18,
      };
    }
    case "play":
      return {
        ...state,
        explosion: 0.88,
        playback: "playing",
        playbackStep: state.playback === "complete" ? 0 : state.playbackStep,
        selectedLayerId: state.playback === "complete" ? MEMORY_ANATOMY_LAYER_IDS[0] : state.selectedLayerId,
      };
    case "pause":
      return state.playback === "playing" ? { ...state, playback: "paused" } : state;
    case "replay":
      return {
        ...state,
        explosion: 0.88,
        playback: "playing",
        playbackStep: 0,
        selectedLayerId: MEMORY_ANATOMY_LAYER_IDS[0],
      };
    case "playback-tick": {
      if (state.playback !== "playing") return state;
      if (state.playbackStep >= MEMORY_ANATOMY_LAYER_IDS.length - 1) {
        return { ...state, explosion: 0, playback: "complete" };
      }
      const step = state.playbackStep + 1;
      return {
        ...state,
        playbackStep: step,
        selectedLayerId: MEMORY_ANATOMY_LAYER_IDS[step],
      };
    }
    default:
      return state;
  }
}

export function memoryLayerTransform(index: number, state: MemoryAnatomyState): string {
  const separation = state.explosion;
  return `translate3d(${(index * separation * 9).toFixed(2)}px, ${(index * separation * -9).toFixed(2)}px, ${((index - 3) * separation * 105).toFixed(2)}px)`;
}

export function selectedMemoryLayer(layers: readonly MemoryAnatomyLayer[], state: MemoryAnatomyState): MemoryAnatomyLayer {
  return layers.find((layer) => layer.id === state.selectedLayerId) ?? layers[0];
}
