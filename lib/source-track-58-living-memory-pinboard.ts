import { isSafeExternalUrl, youtubeId } from "./tree-types";

export const SOURCE_TRACK_58_STAGING = {
  stableId: "source-track-58-living-memory-pinboard",
  sourceAuthority: "58_리빙메모리_핀보드_시네마틱",
  revision: "V1.2_YOUTUBE_REAL_MEDIA_MOBILE_HARDGATE",
  executable: "★_최종_58_리빙메모리_핀보드.html",
  driveFolderId: "1SHLE4D4QpAo39eWBke12lYYUX9ilCz1F",
  bytes: 532697,
  sha256: "9fd5b6e7b69bc14347cf3eb1905e7a118ad9bd7b62faa9d81f47b4389a7d3cb5",
  route: "/design-lab/source-tracks/58/v1-2-native",
} as const;

export type Source58BoardTheme = "pearl" | "cork" | "letter" | "blossom" | "night" | "mint";

export const SOURCE_58_BOARD_THEMES: readonly { id: Source58BoardTheme; label: string }[] = [
  { id: "pearl", label: "Pearl" },
  { id: "cork", label: "Warm Cork" },
  { id: "letter", label: "Letter" },
  { id: "blossom", label: "Blossom" },
  { id: "night", label: "Night" },
  { id: "mint", label: "Mint" },
];

const SOURCE_58_BOARD_SLOTS = [
  { x: 11, y: 14, rotate: -3, style: "polaroid" },
  { x: 39, y: 9, rotate: 2, style: "ticket" },
  { x: 67, y: 16, rotate: -2, style: "photo" },
  { x: 17, y: 44, rotate: 3, style: "note" },
  { x: 48, y: 39, rotate: -1, style: "msg" },
  { x: 73, y: 47, rotate: 2, style: "polaroid" },
  { x: 29, y: 70, rotate: -2, style: "mini" },
  { x: 58, y: 68, rotate: 2, style: "photo" },
  { x: 79, y: 72, rotate: -3, style: "note" },
] as const;

// Source58's native proof originally reused the nine slots above with a tiny lap drift,
// which caused deterministic near-overlap from Moment 10 onward. Keep the accepted
// first-nine composition, then move larger Trees onto a deterministic extended field.
// This is presentation-only VIEW_DERIVED geometry; no Path/board position persistence.
const SOURCE_58_EXTENDED_SLOTS = [
  [5, 90], [45, 90], [85, 30], [88, 5], [5, 60], [30, 25], [40, 55], [85, 5],
  [5, 30], [5, 75], [25, 85], [65, 85], [50, 25], [85, 60], [65, 35], [60, 5],
  [60, 55], [20, 55], [45, 75], [20, 5], [35, 45], [25, 35], [85, 15], [85, 40],
  [5, 50], [5, 5], [50, 15], [25, 15], [70, 25], [45, 65], [5, 40],
] as const;

const EXTENDED_STYLES = ["compact", "photo", "ticket", "compact", "note", "msg"] as const;

export function source58BoardSlot(index: number) {
  if (index < SOURCE_58_BOARD_SLOTS.length) return SOURCE_58_BOARD_SLOTS[index];

  const extendedIndex = index - SOURCE_58_BOARD_SLOTS.length;
  const base = SOURCE_58_EXTENDED_SLOTS[extendedIndex % SOURCE_58_EXTENDED_SLOTS.length];
  const cycle = Math.floor(extendedIndex / SOURCE_58_EXTENDED_SLOTS.length);
  const phase = cycle % 4;
  const xDrift = phase === 0 ? 0 : phase === 1 ? -2 : phase === 2 ? 2 : -1;
  const yDrift = phase === 0 ? 0 : phase === 1 ? 2 : phase === 2 ? -2 : 1;
  const style = EXTENDED_STYLES[extendedIndex % EXTENDED_STYLES.length];
  // Extended slots use card top-left percentages. Reserve enough right/bottom
  // margin for the actual card body and small source rotations so FIT ALL does
  // not hide material outside the 1600x1000 Source58 world.
  const maxX = style === "compact" ? 86 : 78;
  const maxY = style === "compact" ? 82 : 68;
  return {
    x: Math.min(maxX, Math.max(14, base[0] + xDrift)),
    y: Math.min(maxY, Math.max(8, base[1] + yDrift)),
    rotate: ((index * 5) % 9) - 4,
    style,
  };
}

export function source58YouTubeEmbedUrl(sourceUrl: string, startSeconds = 0): string | null {
  if (!isSafeExternalUrl(sourceUrl)) return null;
  const id = youtubeId(sourceUrl);
  if (!id) return null;
  const start = Math.max(0, Math.floor(startSeconds));
  const params = new URLSearchParams({ rel: "0", playsinline: "1" });
  if (start > 0) params.set("start", String(start));
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function source58SafeExternalUrl(sourceUrl: string): string | null {
  return isSafeExternalUrl(sourceUrl) ? sourceUrl : null;
}
