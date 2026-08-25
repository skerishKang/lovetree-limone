import type { TreeMomentView } from "@/lib/moment-model";

export const SOURCE57_AUTHORITY = {
  sourceId: 57,
  stableId: "source-track-57-living-glass",
  folderName: "57_리빙글라스_모먼트카드",
  revision: "V1.3",
  route: "/design-lab/source-tracks/57/v1-3-native",
  executable: "후보_버전1.3_리빙글라스_모먼트카드_모바일반응형수정.html",
  driveId: "1J4_JbDs256rYXMayx-6EOA95au5hYmRg",
  bytes: 676_320,
  sha256: "ca30cdb430067a0649c9f3ee61c148f0b6e606220a9c05ba806ae0afffa66ace",
  repositorySource:
    "reference/source-track-57-living-glass/04_버전1.3_모바일반응형수정_자료/후보_버전1.3_리빙글라스_모먼트카드_모바일반응형수정.html",
} as const;

export type LivingGlassPresentation = {
  tone: string;
  aura: string;
  mediaLabel: string;
  whyNext: string;
  connectionLabel: string;
};

/**
 * Source57-only presentation metadata. These values are visual copy/material controls,
 * never persisted Moment fields and never a new Moment schema.
 */
export const SOURCE57_PRESENTATION_BY_ID: Record<string, LivingGlassPresentation> = {
  "source57-moment-1": {
    tone: "#8f70d6",
    aura: "rgba(143,112,214,.52)",
    mediaLabel: "IMAGE MOMENT",
    whyNext: "이 장면 뒤에 이어진 감정의 결을 한 번 더 따라가 보세요.",
    connectionLabel: "첫 기억에서 이어지는 장면",
  },
  "source57-moment-2": {
    tone: "#d77ca7",
    aura: "rgba(215,124,167,.48)",
    mediaLabel: "VIDEO MOMENT",
    whyNext: "표정과 움직임이 남긴 온도가 다음 순간을 고르는 단서가 됩니다.",
    connectionLabel: "비슷한 감정으로 연결됨",
  },
  "source57-moment-3": {
    tone: "#d79a69",
    aura: "rgba(215,154,105,.46)",
    mediaLabel: "IMAGE MOMENT",
    whyNext: "시간이 지난 뒤에도 남아 있는 이유를 다음 Moment와 나란히 보세요.",
    connectionLabel: "시간의 흐름으로 연결됨",
  },
};

/**
 * Read-only staging projection shaped exactly as the existing TreeMomentView contract.
 * It exists only to prove Source57 presentation fidelity in Design Lab; no fixture is saved.
 */
export const SOURCE57_NATIVE_MOMENTS: TreeMomentView[] = [
  {
    id: "source57-moment-1",
    treeId: "source57-staging-tree",
    parentId: null,
    connectionReason: null,
    title: "처음 마음이 머문 장면",
    memo: "빛과 표정이 함께 남아서 다시 열어 보고 싶은 순간.",
    sourceType: "image",
    thumbnail: "/reference/source-track-57-living-glass/moment-1.jpg",
    emotionTags: ["설렘"],
    timestamp: "2026-05-18T12:10:00.000Z",
    discoveryDate: "2026-05-18T12:10:00.000Z",
    sortOrder: 0,
    isRoot: true,
    depth: 0,
    createdAt: "2026-05-18T12:10:00.000Z",
  },
  {
    id: "source57-moment-2",
    treeId: "source57-staging-tree",
    parentId: "source57-moment-1",
    connectionReason: "비슷한 감정으로 연결됨",
    title: "움직임 속에 남은 온도",
    memo: "짧게 지나갔지만 표정과 목소리의 분위기가 오래 남은 기억.",
    sourceType: "video",
    thumbnail: "/reference/source-track-57-living-glass/moment-2.jpg",
    emotionTags: ["몰입"],
    timestamp: "2026-06-02T18:40:00.000Z",
    discoveryDate: "2026-06-02T18:40:00.000Z",
    sortOrder: 1,
    isRoot: false,
    depth: 1,
    createdAt: "2026-06-02T18:40:00.000Z",
  },
  {
    id: "source57-moment-3",
    treeId: "source57-staging-tree",
    parentId: "source57-moment-2",
    connectionReason: "시간의 흐름으로 연결됨",
    title: "오래 지나도 선명한 기억",
    memo: "시간이 지난 뒤에도 첫 느낌과 다음 이야기를 함께 떠올리게 하는 Moment.",
    sourceType: "image",
    thumbnail: "/reference/source-track-57-living-glass/moment-3.jpg",
    emotionTags: ["따뜻함"],
    timestamp: "2026-07-11T09:25:00.000Z",
    discoveryDate: "2026-07-11T09:25:00.000Z",
    sortOrder: 2,
    isRoot: false,
    depth: 2,
    createdAt: "2026-07-11T09:25:00.000Z",
  },
];

export function source57MomentDate(moment: TreeMomentView): string {
  const raw = moment.discoveryDate || moment.timestamp;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
