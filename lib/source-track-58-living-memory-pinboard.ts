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

export type Source58BoardTheme = "pearl" | "gold" | "black" | "plum" | "tint" | "wood";

export const SOURCE_58_BOARD_THEMES: readonly { id: Source58BoardTheme; label: string }[] = [
  { id: "pearl", label: "Pearl" },
  { id: "gold", label: "Gold" },
  { id: "black", label: "Black" },
  { id: "plum", label: "Deep Plum" },
  { id: "tint", label: "Tint" },
  { id: "wood", label: "Wood" },
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

export function source58BoardSlot(index: number) {
  const slot = SOURCE_58_BOARD_SLOTS[index % SOURCE_58_BOARD_SLOTS.length];
  const lap = Math.floor(index / SOURCE_58_BOARD_SLOTS.length);
  if (lap === 0) return slot;
  const drift = (lap % 3) * 2;
  return {
    ...slot,
    x: Math.min(82, Math.max(7, slot.x + (lap % 2 === 0 ? drift : -drift))),
    y: Math.min(78, Math.max(7, slot.y + drift)),
    rotate: slot.rotate + (lap % 2 === 0 ? 1 : -1),
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
