export interface V3PreviewTree {
  id: string;
  title: string;
  memo?: string;
  visibility: "private" | "unlisted" | "public";
  status: "draft" | "active" | "archived";
  subjectType?: "person" | "work" | "travel" | "study" | "relationship" | "other";
  subjectName?: string;
  cover?: string;
  accent?: string;
  groupName?: string;
  momentCount?: number;
  likeCount?: number;
  viewCount?: number;
  savedCount?: number;
  updatedAt?: string;
  createdAt?: string;
}

export interface V3PreviewMemory {
  id: string;
  treeId: string;
  parentId?: string;
  sourceType: string;
  sourceUrl?: string;
  sourceName?: string;
  sourceTitle?: string;
  thumbnailUrl?: string;
  recordDate: string;
  startSeconds?: number;
  endSeconds?: number;
  title: string;
  memo?: string;
  primaryEmotion?: string;
  emotionTags: string[];
  memoVisibility: "private" | "tree" | "public";
  relationType?: string;
  relationLabel?: string;
}

export interface V3SubjectAlbum {
  id: string;
  name: string;
  groupName?: string;
  kind: "person" | "work" | "travel" | "study" | "relationship" | "other";
  accent?: string;
  cover?: string;
  treeIds: string[];
  mood?: string;
}

export interface V3EmotionPreset {
  id: string;
  label: string;
  color: string;
}

export interface V3RelationPreset {
  id: string;
  label: string;
}

export type V3ViewMode =
  | "growth"
  | "timeline"
  | "diary"
  | "story"
  | "album"
  | "map"
  | "nebula";
