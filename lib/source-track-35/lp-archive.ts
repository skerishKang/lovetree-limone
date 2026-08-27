import type { AlbumMomentView } from "../moment-model";

export type Track35MediaKind = "video" | "audio" | "image" | "link";

export function track35ResolveIndex(moments: readonly AlbumMomentView[], selectedMomentId: string | null): number {
  if (moments.length === 0) return -1;
  if (!selectedMomentId) return 0;
  const index = moments.findIndex((moment) => moment.id === selectedMomentId);
  return index >= 0 ? index : 0;
}

export function track35AdjacentMomentId(
  moments: readonly AlbumMomentView[],
  selectedMomentId: string | null,
  direction: -1 | 1,
): string | null {
  if (moments.length === 0) return null;
  const current = track35ResolveIndex(moments, selectedMomentId);
  const next = (current + direction + moments.length) % moments.length;
  return moments[next]?.id ?? null;
}

export function track35IndexFromScrubValue(count: number, value: number): number {
  if (count <= 0) return -1;
  const finite = Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(count - 1, Math.round(finite)));
}

export function track35ProgressPercent(count: number, index: number): number {
  if (count <= 1 || index <= 0) return 0;
  return Math.min(100, (Math.min(index, count - 1) / (count - 1)) * 100);
}

export function track35YoutubeVideoId(sourceUrl: string): string | null {
  if (!sourceUrl) return null;
  try {
    const url = new URL(sourceUrl);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
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

export function track35YouTubeEmbedUrl(sourceUrl: string): string | null {
  const videoId = track35YoutubeVideoId(sourceUrl);
  return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0` : null;
}

export function track35MediaKind(sourceType: string, sourceUrl: string): Track35MediaKind {
  const type = sourceType.trim().toLowerCase();
  const url = sourceUrl.trim().toLowerCase();
  if (track35YoutubeVideoId(sourceUrl) || type.includes("video") || type.includes("youtube")) return "video";
  if (type.includes("audio") || type.includes("music") || type.includes("song") || /\.(mp3|m4a|wav|ogg)(\?|#|$)/.test(url)) return "audio";
  if (type.includes("image") || type.includes("photo") || /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/.test(url)) return "image";
  return "link";
}
