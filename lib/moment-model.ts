import type { MemoryRecord } from "./tree-types";

export interface CanonicalMoment {
  id: string;
  treeId: string;
  ownerId: string;
  parentId: string | null;
  title: string;
  memo: string;
  artist: string;
  source: string;
  sourceUrl: string;
  sourceType: string;
  thumbnail: string;
  emotionTags: string[];
  timestamp: string;
  sortOrder: number;
  visibility: string;
  channelId: string | null;
  channelName: string | null;
  channelUrl: string | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface TreeMomentView {
  id: string;
  treeId: string;
  parentId: string | null;
  title: string;
  memo: string;
  sourceType: string;
  thumbnail: string;
  emotionTags: string[];
  timestamp: string;
  sortOrder: number;
  isRoot: boolean;
  depth: number;
  createdAt: string | Date | null;
}

export interface TimelineMomentView {
  id: string;
  treeId: string;
  title: string;
  memo: string;
  timestamp: string;
  sortOrder: number;
  sourceType: string;
  thumbnail: string;
  emotionTags: string[];
  createdAt: string | Date | null;
}

export interface AlbumMomentView {
  id: string;
  treeId: string;
  title: string;
  memo: string;
  thumbnail: string;
  sourceType: string;
  sourceUrl: string;
  emotionTags: string[];
  timestamp: string;
  sortOrder: number;
  createdAt: string | Date | null;
}

export function toCanonicalMoment(
  memory: MemoryRecord & { ownerId?: string; sortOrder?: number },
  treeOwnerId: string
): CanonicalMoment {
  return {
    id: memory.id,
    treeId: memory.treeId,
    ownerId: treeOwnerId,
    parentId: memory.parentId ?? null,
    title: memory.title ?? "",
    memo: memory.memo ?? "",
    artist: memory.artist ?? "",
    source: memory.source ?? "",
    sourceUrl: memory.sourceUrl ?? "",
    sourceType: memory.sourceType ?? "youtube",
    thumbnail: memory.thumbnail ?? "",
    emotionTags: memory.emotionTags ?? [],
    timestamp: memory.timestamp ?? "",
    sortOrder: memory.sortOrder ?? 0,
    visibility: memory.visibility ?? "public",
    channelId: memory.channelId ?? null,
    channelName: memory.channelName ?? null,
    channelUrl: memory.channelUrl ?? null,
    createdAt: memory.createdAt ?? null,
    updatedAt: memory.updatedAt ?? null,
  };
}

function computeDepth(moments: Map<string, CanonicalMoment>, moment: CanonicalMoment): number {
  let depth = 0;
  let current = moment.parentId;
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    visited.add(current);
    depth++;
    const parent = moments.get(current);
    if (!parent) break;
    current = parent.parentId;
  }
  return depth;
}

export function toTreeMoment(
  moment: CanonicalMoment,
  allMoments: CanonicalMoment[]
): TreeMomentView {
  const map = new Map(allMoments.map((m) => [m.id, m]));
  const depth = computeDepth(map, moment);
  return {
    id: moment.id,
    treeId: moment.treeId,
    parentId: moment.parentId,
    title: moment.title,
    memo: moment.memo,
    sourceType: moment.sourceType,
    thumbnail: moment.thumbnail,
    emotionTags: moment.emotionTags,
    timestamp: moment.timestamp,
    sortOrder: moment.sortOrder,
    isRoot: moment.parentId === null,
    depth,
    createdAt: moment.createdAt,
  };
}

export function toTimelineMoment(moment: CanonicalMoment): TimelineMomentView {
  return {
    id: moment.id,
    treeId: moment.treeId,
    title: moment.title,
    memo: moment.memo,
    timestamp: moment.timestamp,
    sortOrder: moment.sortOrder,
    sourceType: moment.sourceType,
    thumbnail: moment.thumbnail,
    emotionTags: moment.emotionTags,
    createdAt: moment.createdAt,
  };
}

export function toAlbumMoment(moment: CanonicalMoment): AlbumMomentView {
  return {
    id: moment.id,
    treeId: moment.treeId,
    title: moment.title,
    memo: moment.memo,
    thumbnail: moment.thumbnail,
    sourceType: moment.sourceType,
    sourceUrl: moment.sourceUrl,
    emotionTags: moment.emotionTags,
    timestamp: moment.timestamp,
    sortOrder: moment.sortOrder,
    createdAt: moment.createdAt,
  };
}

export function sortMoments(moments: CanonicalMoment[]): CanonicalMoment[] {
  return [...moments].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    const ta = a.timestamp || "";
    const tb = b.timestamp || "";
    if (ta !== tb) return ta < tb ? -1 : 1;
    const ca = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt ?? 0).getTime();
    const cb = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt ?? 0).getTime();
    if (ca !== cb) return ca - cb;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}

export function selectTreeMoments(moments: CanonicalMoment[]): TreeMomentView[] {
  return sortMoments(moments).map((m) => toTreeMoment(m, moments));
}

export function selectTimelineMoments(moments: CanonicalMoment[]): TimelineMomentView[] {
  return sortMoments(moments).map(toTimelineMoment);
}

export function selectAlbumMoments(moments: CanonicalMoment[]): AlbumMomentView[] {
  return sortMoments(moments).map(toAlbumMoment);
}
