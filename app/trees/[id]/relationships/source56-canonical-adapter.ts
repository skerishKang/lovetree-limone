import type { TreeMomentView } from "@/lib/moment-model";
import type { Source56Connection, Source56Moment, Source56PresentationData } from "@/lib/lineage-53-source56";

const SOURCE_TYPE_MAP: Record<string, Source56Moment["sourceType"]> = {
  youtube: "video",
  video: "video",
  song: "link",
  book: "memo",
  person: "photo",
  travel: "photo",
  link: "link",
  other: "memo",
};

function presentationSourceType(value: string): Source56Moment["sourceType"] {
  return SOURCE_TYPE_MAP[value.toLowerCase()] ?? "memo";
}

/**
 * Projects canonical Tree/Moment records into the Source56 visual contract.
 * Path families and branch hierarchy remain in-memory VIEW_DERIVED state;
 * this adapter never creates or persists a second relation model.
 */
export function adaptCanonicalMomentsToSource56(
  treeMoments: readonly TreeMomentView[],
): Source56PresentationData {
  const ordered = [...treeMoments];
  const firstId = ordered.find((moment) => moment.isRoot)?.id ?? ordered[0]?.id;
  const moments: Source56Moment[] = ordered.map((moment) => ({
    id: moment.id,
    title: moment.title || "제목 없는 Moment",
    date: moment.discoveryDate || moment.timestamp || "날짜 미정",
    emotion: moment.emotionTags[0] ?? "기억",
    note: moment.memo || "메모가 없습니다.",
    sourceType: presentationSourceType(moment.sourceType),
    ...(moment.id === firstId ? { first: true } : {}),
  }));
  const validIds = new Set(moments.map((moment) => moment.id));
  const connections: Source56Connection[] = ordered.flatMap((moment) => {
    if (!moment.parentId || !validIds.has(moment.parentId)) return [];
    return [{
      id: `${moment.parentId}->${moment.id}`,
      fromMomentId: moment.parentId,
      toMomentId: moment.id,
      whyNext: moment.connectionReason?.trim() || "이전 Moment에서 이어진 관계",
    }];
  });
  return { moments, connections };
}
