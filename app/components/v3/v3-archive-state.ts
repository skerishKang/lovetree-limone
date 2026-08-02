import type { V3PreviewMemory } from "./v3-types";

export const ARCHIVE_VIEWS = ["stage", "shelf", "folding"] as const;
export type ArchiveView = (typeof ARCHIVE_VIEWS)[number];

export const ARCHIVE_LAYOUTS = ["wave", "orbit", "free", "diagonal", "vinyl"] as const;
export type ArchiveLayout = (typeof ARCHIVE_LAYOUTS)[number];

export const DEFAULT_ARCHIVE_VIEW: ArchiveView = "stage";
export const DEFAULT_ARCHIVE_LAYOUT: ArchiveLayout = "wave";

export const ARCHIVE_VIEW_LABELS: Record<ArchiveView, string> = {
  stage: "순간 갤러리",
  shelf: "앨범 서가",
  folding: "펼쳐보는 앨범",
};

export const ARCHIVE_LAYOUT_LABELS: Record<ArchiveLayout, string> = {
  wave: "물결",
  orbit: "궤도",
  free: "자유 유영",
  diagonal: "대각선",
  vinyl: "비닐 케이스",
};

export interface ArchiveQueryState {
  view: ArchiveView;
  layout: ArchiveLayout;
  subjectId: string | null;
  momentId: string | null;
}

export function parseArchiveView(value: string | null | undefined): ArchiveView {
  if (value && (ARCHIVE_VIEWS as readonly string[]).includes(value)) {
    return value as ArchiveView;
  }
  return DEFAULT_ARCHIVE_VIEW;
}

export function parseArchiveLayout(value: string | null | undefined): ArchiveLayout {
  if (value === "cascade") {
    return "diagonal";
  }
  if (value && (ARCHIVE_LAYOUTS as readonly string[]).includes(value)) {
    return value as ArchiveLayout;
  }
  return DEFAULT_ARCHIVE_LAYOUT;
}

export function parseSubjectId(
  value: string | null | undefined,
  validIds: readonly string[],
): string | null {
  if (value && validIds.includes(value)) {
    return value;
  }
  return null;
}

export function parseMomentId(
  value: string | null | undefined,
  validIds: readonly string[],
): string | null {
  if (value && validIds.includes(value)) {
    return value;
  }
  return null;
}

export function normalizeArchiveQuery(
  params: URLSearchParams,
  validSubjects: readonly string[],
  validMoments: readonly string[],
): ArchiveQueryState {
  const view = parseArchiveView(params.get("view"));
  const layout = view === "stage" ? parseArchiveLayout(params.get("layout")) : DEFAULT_ARCHIVE_LAYOUT;
  return {
    view,
    layout,
    subjectId: parseSubjectId(params.get("subject"), validSubjects),
    momentId: parseMomentId(params.get("moment"), validMoments),
  };
}

export function serializeArchiveQuery(state: ArchiveQueryState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.view !== DEFAULT_ARCHIVE_VIEW) {
    params.set("view", state.view);
  }
  if (state.view === "stage" && state.layout !== DEFAULT_ARCHIVE_LAYOUT) {
    params.set("layout", state.layout);
  }
  if (state.subjectId) {
    params.set("subject", state.subjectId);
  }
  if (state.momentId) {
    params.set("moment", state.momentId);
  }
  return params;
}

export function archiveQueryFromSearch(
  search: string,
  validSubjects: readonly string[],
  validMoments: readonly string[],
): ArchiveQueryState {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return normalizeArchiveQuery(new URLSearchParams(raw), validSubjects, validMoments);
}

export function archiveHref(base: string, state: ArchiveQueryState): string {
  const params = serializeArchiveQuery(state);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function withArchiveState(
  state: ArchiveQueryState,
  patch: Partial<ArchiveQueryState>,
): ArchiveQueryState {
  const next: ArchiveQueryState = { ...state, ...patch };
  if (next.view !== "stage") {
    next.layout = DEFAULT_ARCHIVE_LAYOUT;
  }
  return next;
}

export function parseYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([\w-]{6,})/,
  );
  return match ? match[1] : null;
}

export interface YouTubeEmbedOptions {
  startSeconds?: number | null;
  endSeconds?: number | null;
}

function toValidSeconds(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.floor(value);
}

export function buildYouTubeEmbedUrl(
  videoId: string,
  options: YouTubeEmbedOptions = {},
): string {
  const params = new URLSearchParams();
  params.set("playsinline", "1");
  params.set("rel", "0");
  params.set("autoplay", "0");
  const start = toValidSeconds(options.startSeconds);
  if (start !== null) {
    params.set("start", String(start));
  }
  const end = toValidSeconds(options.endSeconds);
  if (end !== null && start !== null && end > start) {
    params.set("end", String(end));
  }
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

export function buildMemoryEmbedUrl(memory: V3PreviewMemory): string {
  const videoId = parseYouTubeId(memory.sourceUrl ?? "");
  if (!videoId) {
    return "";
  }
  return buildYouTubeEmbedUrl(videoId, {
    startSeconds: memory.startSeconds,
    endSeconds: memory.endSeconds,
  });
}

export function isEmbeddableVideo(memory: V3PreviewMemory): boolean {
  return parseYouTubeId(memory.sourceUrl ?? "") !== null;
}

export function formatSeconds(seconds?: number): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
