export interface TreeRecord {
  id: string;
  ownerId?: string;
  clientKey?: string | null;
  title: string;
  memo?: string;
  artist?: string;
  visibility?: "private" | "unlisted" | "public" | string;
  groupName?: string | null;
  keywords?: string[];
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  likeCount?: number;
  viewCount?: number;
}

export interface MemoryRecord {
  id: string;
  treeId: string;
  clientKey?: string | null;
  parentId?: string | null;
  connectionReason?: string | null;
  title?: string;
  memo?: string;
  artist?: string;
  source?: string;
  sourceUrl?: string;
  sourceType?: string;
  thumbnail?: string;
  emotionTags?: string[];
  timestamp?: string;
  discoveryDate?: string | null;
  videoOffsetSeconds?: number | null;
  sortOrder?: number;
  visibility?: "private" | "unlisted" | "public" | string;
  channelId?: string | null;
  channelName?: string | null;
  channelUrl?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export const SOURCE_TYPES = [
  ["youtube", "영상"],
  ["video", "비디오"],
  ["song", "노래"],
  ["book", "책"],
  ["person", "사람"],
  ["travel", "여행"],
  ["other", "기타"],
  ["link", "링크"],
] as const;

export function formatTreeDate(value: string | Date | null | undefined): string {
  if (!value) return "날짜 미정";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace(/-/g, ". ");
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function memoryDiscoveryDate(memory: MemoryRecord): string | Date | null | undefined {
  return memory.discoveryDate || memory.timestamp || memory.createdAt;
}

export function localDateValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function youtubeId(value: string): string | null {
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{6,})/);
  return match?.[1] ?? null;
}

export function youtubeThumbnail(value: string): string | undefined {
  const id = youtubeId(value);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined;
}

export function videoOffsetSecondsFromUrl(value: string): number | undefined {
  try {
    const url = new URL(value);
    const raw = url.searchParams.get("t") || url.searchParams.get("start");
    if (!raw) return undefined;
    if (/^\d+$/.test(raw)) return Number(raw);
    const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(raw.trim());
    if (!match) return undefined;
    return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
  } catch {
    return undefined;
  }
}

export function sourceTypeLabel(sourceType: string | undefined): string {
  return SOURCE_TYPES.find(([value]) => value === sourceType)?.[1] ?? "기록";
}

export function isSafeExternalUrl(value: string | undefined | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveMemoryThumbnail(memory: MemoryRecord): string | undefined {
  if (memory.thumbnail) return memory.thumbnail;
  return youtubeThumbnail(memory.sourceUrl ?? "");
}
