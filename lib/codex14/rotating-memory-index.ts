import type { AlbumMomentView } from "@/lib/moment-model";

export const CODEX14_ROTATING_INDEX_SOURCE = Object.freeze({
  driveFileId: "1YKq2WiINn5MWhll8sSBq1azHMwaocIIP",
  fileName: "최종본.html",
  bytes: 19631,
  sha256: "0cef6497103d05a853c4849d58967bed66e3af85db5e345a69724b2d26719361",
  developmentTwinDriveFileId: "1M9tSt0TZdBdFbmdiOTnbh03g4H6xsost",
  sourceFilmCount: 89,
  videoFolderDriveId: "1hP6kA-ezQsqCfwMEIBhS_p9Xt1oyd1kg",
  posterFolderDriveId: "1k2FAbsLu3nh7Aes6bNwDEdaP41n_SMjK",
});

export type Codex14MediaKind = "video" | "audio" | "image" | "link" | "text";

export function codex14WrapIndex(length: number, index: number): number {
  if (length <= 0) return -1;
  return ((Math.trunc(index) % length) + length) % length;
}

export function codex14ResolveIndex(
  moments: readonly Pick<AlbumMomentView, "id">[],
  selectedMomentId: string | null,
): number {
  if (moments.length === 0) return -1;
  if (!selectedMomentId) return 0;
  const index = moments.findIndex((moment) => moment.id === selectedMomentId);
  return index >= 0 ? index : 0;
}

export function codex14AdjacentMomentId(
  moments: readonly Pick<AlbumMomentView, "id">[],
  selectedMomentId: string | null,
  direction: -1 | 1,
): string | null {
  if (moments.length === 0) return null;
  const current = codex14ResolveIndex(moments, selectedMomentId);
  return moments[codex14WrapIndex(moments.length, current + direction)]?.id ?? null;
}

export interface Codex14DeckSlot {
  momentIndex: number;
  offset: number;
}

export function codex14DeckSlots(
  length: number,
  selectedIndex: number,
  slotCount = 7,
): Codex14DeckSlot[] {
  if (length <= 0 || selectedIndex < 0) return [];
  const safeSlots = Math.max(1, Math.min(Math.trunc(slotCount), length));
  const left = Math.floor(safeSlots / 2);
  return Array.from({ length: safeSlots }, (_, slot) => {
    const offset = slot - left;
    return {
      momentIndex: codex14WrapIndex(length, selectedIndex + offset),
      offset,
    };
  });
}

export function codex14MediaKind(sourceType: string, sourceUrl: string): Codex14MediaKind {
  const type = sourceType.trim().toLowerCase();
  const url = sourceUrl.trim().toLowerCase();
  if (type.includes("youtube") || type.includes("video") || /\.(mp4|webm|mov)(\?|#|$)/.test(url)) return "video";
  if (type.includes("audio") || type.includes("music") || /\.(mp3|wav|ogg|m4a)(\?|#|$)/.test(url)) return "audio";
  if (type.includes("image") || type.includes("photo") || /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/.test(url)) return "image";
  if (sourceUrl.trim()) return "link";
  return "text";
}

export function codex14YouTubeVideoId(url: string): string | null {
  const value = url.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (parsed.hostname.endsWith("youtube.com")) {
      const direct = parsed.searchParams.get("v") ?? "";
      if (/^[A-Za-z0-9_-]{11}$/.test(direct)) return direct;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0] ?? "")) {
        const id = parts[1] ?? "";
        return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function codex14YouTubeEmbedUrl(url: string): string | null {
  const id = codex14YouTubeVideoId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}

export function codex14DateLabel(moment: Pick<AlbumMomentView, "discoveryDate" | "timestamp">): string {
  const value = moment.discoveryDate || moment.timestamp;
  if (!value) return "날짜 없는 기억";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed);
}
