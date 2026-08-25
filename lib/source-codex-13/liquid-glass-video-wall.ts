import type { AlbumMomentView } from "../moment-model";

export const CODEX13_SOURCE_SHA256 = "91fb117b7e764fb42e4817d6fa60eb960dea8032977c804abdd9084e5a626fd7";
export const CODEX13_SOURCE_BYTES = 18053;
export const CODEX13_DESKTOP_CELL_COUNT = 35;
export const CODEX13_MOBILE_CELL_COUNT = 25;
export const CODEX13_DESKTOP_ACTIVE_VIDEO_LIMIT = 6;
export const CODEX13_MOBILE_ACTIVE_VIDEO_LIMIT = 2;

export type Codex13MediaKind = "youtube" | "direct-video" | "image" | "visual-link";

export interface Codex13WallCell {
  slot: number;
  moment: AlbumMomentView;
  row: number;
  column: number;
}

export interface Codex13PositionedCell extends Codex13WallCell {
  x: number;
  y: number;
  z: number;
  distance: number;
}

function normalizedHost(hostname: string) {
  return hostname.replace(/^www\./, "").toLowerCase();
}

export function codex13YoutubeVideoId(sourceUrl: string): string | null {
  if (!sourceUrl) return null;
  try {
    const url = new URL(sourceUrl);
    const hostname = normalizedHost(url.hostname);
    if (hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtube-nocookie.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0] ?? "")) return parts[1] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export function codex13YouTubeEmbedUrl(sourceUrl: string): string | null {
  const videoId = codex13YoutubeVideoId(sourceUrl);
  return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0` : null;
}

export function codex13IsDirectVideoUrl(sourceUrl: string): boolean {
  const value = sourceUrl.trim().toLowerCase();
  return /\.(mp4|webm|ogv|ogg|m4v)(\?|#|$)/.test(value);
}

export function codex13MediaKind(sourceType: string, sourceUrl: string, thumbnail: string): Codex13MediaKind {
  const type = sourceType.trim().toLowerCase();
  const url = sourceUrl.trim().toLowerCase();
  if (codex13YoutubeVideoId(sourceUrl) || type.includes("youtube")) return "youtube";
  if (codex13IsDirectVideoUrl(sourceUrl)) return "direct-video";
  if (type.includes("image") || type.includes("photo") || /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/.test(url)) return "image";
  if (type.includes("video") && thumbnail.trim()) return "visual-link";
  return thumbnail.trim() ? "image" : "visual-link";
}

export function codex13VisualMoments(moments: readonly AlbumMomentView[]): AlbumMomentView[] {
  return moments.filter((moment) => Boolean(moment.sourceUrl.trim() || moment.thumbnail.trim()));
}

export function codex13BuildWallCells(
  moments: readonly AlbumMomentView[],
  mobile: boolean,
): Codex13WallCell[] {
  const source = codex13VisualMoments(moments);
  if (source.length === 0) return [];
  const columns = mobile ? 5 : 7;
  const rows = 5;
  const count = mobile ? CODEX13_MOBILE_CELL_COUNT : CODEX13_DESKTOP_CELL_COUNT;
  return Array.from({ length: count }, (_, slot) => ({
    slot,
    moment: source[slot % source.length],
    row: Math.floor(slot / columns) % rows,
    column: slot % columns,
  }));
}

export function codex13Wrap(value: number, span: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(span) || span <= 0) return 0;
  return ((value + span / 2) % span + span) % span - span / 2;
}

export function codex13PositionCell(
  cell: Codex13WallCell,
  phaseX: number,
  phaseY: number,
  mobile: boolean,
): Codex13PositionedCell {
  const columns = mobile ? 5 : 7;
  const rows = 5;
  const spacingX = mobile ? 184 : 306;
  const spacingY = mobile ? 150 : 214;
  const spanX = columns * spacingX;
  const spanY = rows * spacingY;
  const baseX = (cell.column - (columns - 1) / 2) * spacingX;
  const baseY = (cell.row - (rows - 1) / 2) * spacingY;
  const x = codex13Wrap(baseX + phaseX, spanX);
  const y = codex13Wrap(baseY + phaseY, spanY);
  const distance = Math.hypot(x / (spacingX * 2.15), y / (spacingY * 1.9));
  const z = Math.max(-210, 128 - distance * 146);
  return { ...cell, x, y, z, distance };
}

export function codex13PositionCells(
  cells: readonly Codex13WallCell[],
  phaseX: number,
  phaseY: number,
  mobile: boolean,
): Codex13PositionedCell[] {
  return cells.map((cell) => codex13PositionCell(cell, phaseX, phaseY, mobile));
}

export function codex13ActiveDirectVideoSlots(
  positioned: readonly Codex13PositionedCell[],
  mobile: boolean,
  inspectorOpen: boolean,
): number[] {
  if (inspectorOpen) return [];
  const limit = mobile ? CODEX13_MOBILE_ACTIVE_VIDEO_LIMIT : CODEX13_DESKTOP_ACTIVE_VIDEO_LIMIT;
  return positioned
    .filter((cell) => codex13MediaKind(cell.moment.sourceType, cell.moment.sourceUrl, cell.moment.thumbnail) === "direct-video")
    .filter((cell) => cell.distance <= 1.2)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((cell) => cell.slot);
}

export function codex13NearestCell(positioned: readonly Codex13PositionedCell[]): Codex13PositionedCell | null {
  if (positioned.length === 0) return null;
  return positioned.reduce((nearest, current) => current.distance < nearest.distance ? current : nearest);
}
