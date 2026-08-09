export type OrbitViewport = "desktop" | "mobile";

export interface OrbitCameraState {
  yaw: number;
  pitch: number;
  distance: number;
  reducedMotion: boolean;
}

export interface OrbitMomentNode {
  id: string;
  label: string;
  angle: number;
  latitude: number;
  mediaType: "photo" | "video" | "audio" | "note";
}

export interface OrbitConnection {
  id: string;
  from: string;
  to: string;
  intensity: number;
}

export const ORBIT_MOMENTS: readonly OrbitMomentNode[] = [
  { id: "orbit-01", label: "첫 여행", angle: -150, latitude: 24, mediaType: "photo" },
  { id: "orbit-02", label: "늦은 밤 통화", angle: -82, latitude: -8, mediaType: "audio" },
  { id: "orbit-03", label: "함께 만든 저녁", angle: -18, latitude: 18, mediaType: "video" },
  { id: "orbit-04", label: "비 오는 산책", angle: 48, latitude: -22, mediaType: "photo" },
  { id: "orbit-05", label: "다시 만난 날", angle: 112, latitude: 10, mediaType: "note" },
  { id: "orbit-06", label: "여름의 끝", angle: 166, latitude: 31, mediaType: "video" },
] as const;

export const ORBIT_CONNECTIONS: readonly OrbitConnection[] = [
  { id: "route-01", from: "orbit-01", to: "orbit-03", intensity: 0.7 },
  { id: "route-02", from: "orbit-02", to: "orbit-04", intensity: 0.45 },
  { id: "route-03", from: "orbit-03", to: "orbit-05", intensity: 0.9 },
  { id: "route-04", from: "orbit-04", to: "orbit-06", intensity: 0.6 },
  { id: "route-05", from: "orbit-01", to: "orbit-06", intensity: 0.35 },
] as const;

export const DEFAULT_ORBIT_CAMERA: OrbitCameraState = {
  yaw: 0,
  pitch: 0,
  distance: 1,
  reducedMotion: false,
};

export function updateOrbitCamera(
  state: OrbitCameraState,
  input: { deltaX?: number; deltaY?: number; wheel?: number },
): OrbitCameraState {
  const nextYaw = state.yaw + (input.deltaX ?? 0) * 0.22;
  const nextPitch = Math.max(-32, Math.min(32, state.pitch + (input.deltaY ?? 0) * 0.14));
  const nextDistance = Math.max(0.72, Math.min(1.45, state.distance + (input.wheel ?? 0) * 0.0012));
  return { ...state, yaw: nextYaw, pitch: nextPitch, distance: nextDistance };
}

export function projectOrbitNode(
  node: OrbitMomentNode,
  camera: OrbitCameraState,
  viewport: OrbitViewport,
) {
  const angle = ((node.angle + camera.yaw) * Math.PI) / 180;
  const pitchOffset = camera.pitch / 90;
  const radiusX = viewport === "mobile" ? 37 : 43;
  const radiusY = viewport === "mobile" ? 24 : 31;
  const depth = Math.cos(angle);
  return {
    x: 50 + Math.sin(angle) * radiusX * camera.distance,
    y: 50 - (node.latitude / 90) * radiusY + pitchOffset * 16,
    depth,
    scale: 0.7 + (depth + 1) * 0.22,
    opacity: 0.35 + (depth + 1) * 0.32,
  };
}

export type CinematicSceneId = "fragments" | "gather" | "axis" | "tree";

export interface CinematicSceneDefinition {
  id: CinematicSceneId;
  label: string;
  title: string;
  description: string;
}

export const CINEMATIC_SCENES: readonly CinematicSceneDefinition[] = [
  { id: "fragments", label: "01 · 흩어진 조각", title: "기억은 처음부터 정리되어 있지 않습니다.", description: "Moment 조각을 서로 다른 위치와 깊이에 둡니다." },
  { id: "gather", label: "02 · 모이기", title: "관련된 조각이 하나의 축으로 모입니다.", description: "사용자 동작이 fragment convergence를 시작합니다." },
  { id: "axis", label: "03 · 관계축", title: "시간과 사람의 관계가 읽히기 시작합니다.", description: "수렴한 조각을 canonical Moment 관계로 다시 읽습니다." },
  { id: "tree", label: "04 · LoveTree", title: "연출은 제품 화면으로 끝나야 합니다.", description: "장식에서 멈추지 않고 Tree/Timeline 같은 실제 제품 view로 연결합니다." },
] as const;

export interface MemoryFragment {
  id: string;
  title: string;
  person: string;
  year: number;
  start: { x: number; y: number; rotate: number };
  gathered: { x: number; y: number; rotate: number };
}

export const MEMORY_FRAGMENTS: readonly MemoryFragment[] = [
  { id: "fragment-01", title: "첫 벚꽃", person: "수진", year: 2018, start: { x: 12, y: 22, rotate: -9 }, gathered: { x: 19, y: 49, rotate: -2 } },
  { id: "fragment-02", title: "바다로 간 날", person: "수진", year: 2019, start: { x: 71, y: 17, rotate: 7 }, gathered: { x: 38, y: 49, rotate: 1 } },
  { id: "fragment-03", title: "새 집의 저녁", person: "민호", year: 2021, start: { x: 8, y: 68, rotate: 5 }, gathered: { x: 57, y: 49, rotate: -1 } },
  { id: "fragment-04", title: "비 오는 산책", person: "민호", year: 2023, start: { x: 76, y: 72, rotate: -6 }, gathered: { x: 76, y: 49, rotate: 2 } },
] as const;

export function fragmentLayout(scene: CinematicSceneId) {
  const converged = scene !== "fragments";
  return MEMORY_FRAGMENTS.map((fragment) => ({
    ...fragment,
    position: converged ? fragment.gathered : fragment.start,
  }));
}

export interface RelationshipMomentNode {
  id: string;
  label: string;
  kind: "moment" | "person" | "place";
  x: number;
  y: number;
}

export interface RelationshipEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface MomentHistoryEntry {
  id: string;
  momentId: string;
  version: number;
  recordedAt: string;
  kind: "original" | "annotation" | "reflection";
  text: string;
}

export const RELATIONSHIP_NODES: readonly RelationshipMomentNode[] = [
  { id: "person-sujin", label: "수진", kind: "person", x: 50, y: 14 },
  { id: "moment-first", label: "첫 벚꽃", kind: "moment", x: 20, y: 46 },
  { id: "place-sea", label: "광안리", kind: "place", x: 79, y: 48 },
  { id: "moment-walk", label: "비 오는 산책", kind: "moment", x: 37, y: 78 },
  { id: "moment-return", label: "다시 만난 날", kind: "moment", x: 70, y: 79 },
] as const;

export const RELATIONSHIP_EDGES: readonly RelationshipEdge[] = [
  { id: "edge-01", from: "person-sujin", to: "moment-first", label: "함께" },
  { id: "edge-02", from: "person-sujin", to: "place-sea", label: "여행" },
  { id: "edge-03", from: "moment-first", to: "moment-walk", label: "다음 계절" },
  { id: "edge-04", from: "place-sea", to: "moment-return", label: "다시 방문" },
  { id: "edge-05", from: "moment-walk", to: "moment-return", label: "관계 변화" },
] as const;

export const MOMENT_HISTORY: readonly MomentHistoryEntry[] = [
  { id: "history-01", momentId: "moment-return", version: 1, recordedAt: "2024-05-18", kind: "original", text: "역 앞에서 다시 만났다." },
  { id: "history-02", momentId: "moment-return", version: 2, recordedAt: "2024-06-02", kind: "annotation", text: "그날 사진 속 표정이 생각보다 편안했다는 메모를 덧붙였다." },
  { id: "history-03", momentId: "moment-return", version: 3, recordedAt: "2025-05-18", kind: "reflection", text: "1년 뒤 돌아보니 이 날이 관계의 전환점이었다고 느꼈다." },
] as const;

export function historyForMoment(momentId: string) {
  return MOMENT_HISTORY.filter((entry) => entry.momentId === momentId).sort((a, b) => a.version - b.version);
}

export type ArchivePhase = "shelf" | "focused" | "open" | "reading" | "returning";

export interface ArchiveItem {
  id: string;
  label: string;
  subtitle: string;
  momentCount: number;
  accent: string;
}

export interface ArchiveState {
  phase: ArchivePhase;
  selectedId: string;
  page: number;
}

export const ARCHIVE_ITEMS: readonly ArchiveItem[] = [
  { id: "archive-sujin", label: "수진과의 계절", subtitle: "2018 — 2025", momentCount: 42, accent: "#765769" },
  { id: "archive-family", label: "우리 가족", subtitle: "1998 — 2026", momentCount: 86, accent: "#6f6a52" },
  { id: "archive-travel", label: "여행의 조각", subtitle: "12 places", momentCount: 31, accent: "#486a6b" },
  { id: "archive-friends", label: "오래된 친구들", subtitle: "2007 — 2026", momentCount: 54, accent: "#586986" },
] as const;

export const DEFAULT_ARCHIVE_STATE: ArchiveState = {
  phase: "shelf",
  selectedId: ARCHIVE_ITEMS[0].id,
  page: 0,
};

export function transitionArchiveState(
  state: ArchiveState,
  event:
    | { type: "select"; id: string }
    | { type: "open" }
    | { type: "read" }
    | { type: "page"; delta: number }
    | { type: "return" }
    | { type: "finish-return" },
): ArchiveState {
  if (event.type === "select") {
    if (!ARCHIVE_ITEMS.some((item) => item.id === event.id)) return state;
    return { phase: "focused", selectedId: event.id, page: 0 };
  }
  if (event.type === "open" && (state.phase === "focused" || state.phase === "shelf")) {
    return { ...state, phase: "open", page: 0 };
  }
  if (event.type === "read" && state.phase === "open") return { ...state, phase: "reading" };
  if (event.type === "page" && state.phase === "reading") {
    return { ...state, page: Math.max(0, Math.min(4, state.page + event.delta)) };
  }
  if (event.type === "return" && ["open", "reading", "focused"].includes(state.phase)) {
    return { ...state, phase: "returning" };
  }
  if (event.type === "finish-return" && state.phase === "returning") {
    return { ...state, phase: "shelf", page: 0 };
  }
  return state;
}

export interface MilestoneUnit {
  id: string;
  index: number;
  label: string;
  period: string;
  status: "complete" | "current" | "pending";
  momentCount: number;
}

export const MILESTONE_UNITS: readonly MilestoneUnit[] = Array.from({ length: 12 }, (_, index) => {
  const number = index + 1;
  const status: MilestoneUnit["status"] = number <= 7 ? "complete" : number === 8 ? "current" : "pending";
  return {
    id: `season-${String(number).padStart(2, "0")}`,
    index: number,
    label: number === 8 ? "지금의 계절" : `${number}번째 계절`,
    period: `${2014 + number} — ${2015 + number}`,
    status,
    momentCount: status === "pending" ? 0 : 18 + number * 7,
  };
});

export function milestoneProgress(units: readonly MilestoneUnit[] = MILESTONE_UNITS) {
  const completed = units.filter((unit) => unit.status === "complete").length;
  const available = units.filter((unit) => unit.status !== "pending").length;
  return {
    completed,
    available,
    total: units.length,
    percent: Math.round((completed / units.length) * 100),
  };
}

export function parseMilestoneUnit(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const requested = params.get("unit");
  return MILESTONE_UNITS.find((unit) => unit.id === requested && unit.status !== "pending") ?? MILESTONE_UNITS.find((unit) => unit.status === "current")!;
}

export function serializeMilestoneUnit(unitId: string) {
  const unit = MILESTONE_UNITS.find((item) => item.id === unitId && item.status !== "pending") ?? MILESTONE_UNITS.find((item) => item.status === "current")!;
  return `unit=${encodeURIComponent(unit.id)}`;
}
