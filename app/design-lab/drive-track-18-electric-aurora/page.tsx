import type { CanonicalMoment } from "@/lib/moment-model";
import DriveTrack18ElectricAurora from "./DriveTrack18ElectricAurora";

const fixtureMoments: CanonicalMoment[] = [
  ["aurora-m1", null, "첫 순간", "처음 마음이 멈춘 장면", "photo"],
  ["aurora-m2", "aurora-m1", "여름의 무대", "다음으로 이어진 공연 기억", "youtube"],
  ["aurora-m3", "aurora-m2", "돌아오는 길", "짧게 남겨 둔 메모", "memo"],
  ["aurora-m4", "aurora-m2", "함께 본 밤", "같은 Tree 안의 다른 연결", "photo"],
  ["aurora-m5", "aurora-m4", "다시 들은 노래", "기억을 다시 열어 본 순간", "song"],
  ["aurora-m6", "aurora-m5", "오늘의 기록", "현재 Tree에 이어 붙인 Moment", "link"],
].map(([id, parentId, title, memo, sourceType], index) => ({
  id: id as string,
  treeId: "design-lab-electric-aurora",
  ownerId: "design-lab",
  parentId: parentId as string | null,
  connectionReason: parentId ? "canonical WHY NEXT example" : null,
  title: title as string,
  memo: memo as string,
  artist: "",
  source: "",
  sourceUrl: "",
  sourceType: sourceType as string,
  thumbnail: "",
  emotionTags: [],
  timestamp: `2026-08-${String(index + 1).padStart(2, "0")}`,
  discoveryDate: `2026-08-${String(index + 1).padStart(2, "0")}`,
  videoOffsetSeconds: null,
  sortOrder: index,
  visibility: "private",
  channelId: null,
  channelName: null,
  channelUrl: null,
  createdAt: `2026-08-${String(index + 1).padStart(2, "0")}T09:00:00Z`,
  updatedAt: null,
}));

export default function DriveTrack18ElectricAuroraPage() {
  return <DriveTrack18ElectricAurora moments={fixtureMoments} />;
}
