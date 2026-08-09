export type IntentPathId = "first" | "recent" | "people" | "media";
export type PrototypeMediaType = "photo" | "video" | "text";

export interface PrototypeMoment {
  id: string;
  title: string;
  person: string;
  mediaType: PrototypeMediaType;
  capturedAt: string;
  createdOrder: number;
}

export interface IntentPathDefinition {
  id: IntentPathId;
  label: string;
  suggestion: string;
  matchTerms: readonly string[];
  interpretation: string;
  focus: string;
  resultLabel: string;
  nextAction: string;
}

export interface ResolvedIntentPath {
  path: IntentPathDefinition;
  normalizedQuery: string;
  matchedTerms: readonly string[];
  score: number;
  usedFallback: boolean;
}

export const INTENT_PATHS: readonly IntentPathDefinition[] = [
  {
    id: "first",
    label: "처음",
    suggestion: "처음 좋아하게 된 순간 보여줘",
    matchTerms: ["처음", "첫", "시작", "좋아하게"],
    interpretation: "관계의 시작점과 가장 이른 Moment를 찾습니다.",
    focus: "capturedAt 오름차순으로 시작 지점을 좁힙니다.",
    resultLabel: "가장 이른 Moment",
    nextAction: "첫 순간에서 이어진 기억 보기",
  },
  {
    id: "recent",
    label: "최근",
    suggestion: "최근에 추가한 순간 보여줘",
    matchTerms: ["최근", "새로", "추가", "요즘", "마지막"],
    interpretation: "최근에 기록하거나 추가한 Moment를 찾습니다.",
    focus: "createdOrder 내림차순으로 최근 기록을 우선합니다.",
    resultLabel: "최근 추가 Moment",
    nextAction: "최근 기록 계속 이어보기",
  },
  {
    id: "people",
    label: "사람",
    suggestion: "사람별로 이어진 순간 보여줘",
    matchTerms: ["사람", "인물", "누구", "함께", "별로"],
    interpretation: "Moment를 사람 축으로 묶어 관계의 연결을 찾습니다.",
    focus: "person 값을 기준으로 같은 사람의 Moment를 함께 보여줍니다.",
    resultLabel: "사람별 연결 Moment",
    nextAction: "선택한 사람의 전체 기억 보기",
  },
  {
    id: "media",
    label: "미디어",
    suggestion: "사진이나 영상으로 남긴 순간 보여줘",
    matchTerms: ["사진", "영상", "미디어", "이미지", "비디오"],
    interpretation: "시각 미디어가 있는 Moment만 골라냅니다.",
    focus: "photo/video 타입을 유지하고 text-only 기록은 제외합니다.",
    resultLabel: "사진·영상 Moment",
    nextAction: "미디어 원본 상세 보기",
  },
] as const;

export const PROTOTYPE_MOMENTS: readonly PrototypeMoment[] = [
  { id: "m-01", title: "처음 무대를 본 날", person: "민아", mediaType: "photo", capturedAt: "2025-02-14", createdOrder: 1 },
  { id: "m-02", title: "첫 라이브 클립", person: "민아", mediaType: "video", capturedAt: "2025-03-02", createdOrder: 2 },
  { id: "m-03", title: "친구가 보내준 한마디", person: "지수", mediaType: "text", capturedAt: "2025-04-18", createdOrder: 3 },
  { id: "m-04", title: "봄 콘서트 사진", person: "민아", mediaType: "photo", capturedAt: "2026-04-09", createdOrder: 4 },
  { id: "m-05", title: "최근 발견한 인터뷰", person: "지수", mediaType: "video", capturedAt: "2026-07-31", createdOrder: 6 },
  { id: "m-06", title: "다시 적은 짧은 메모", person: "서윤", mediaType: "text", capturedAt: "2026-08-02", createdOrder: 5 },
] as const;

function normalizeQuery(query: string) {
  return query.trim().toLocaleLowerCase("ko-KR").replace(/\s+/g, " ");
}

export function resolveIntentPath(query: string): ResolvedIntentPath {
  const normalizedQuery = normalizeQuery(query);
  let best = INTENT_PATHS[1];
  let bestTerms: readonly string[] = [];
  let bestScore = 0;

  for (const path of INTENT_PATHS) {
    const matchedTerms = path.matchTerms.filter((term) => normalizedQuery.includes(term));
    const score = matchedTerms.length;
    if (score > bestScore) {
      best = path;
      bestTerms = matchedTerms;
      bestScore = score;
    }
  }

  return {
    path: best,
    normalizedQuery,
    matchedTerms: bestTerms,
    score: bestScore,
    usedFallback: bestScore === 0,
  };
}

export function momentsForIntent(
  intentId: IntentPathId,
  moments: readonly PrototypeMoment[] = PROTOTYPE_MOMENTS,
): readonly PrototypeMoment[] {
  const copy = [...moments];
  switch (intentId) {
    case "first":
      return copy.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)).slice(0, 3);
    case "recent":
      return copy.sort((a, b) => b.createdOrder - a.createdOrder).slice(0, 3);
    case "people": {
      const countByPerson = new Map<string, number>();
      for (const moment of copy) countByPerson.set(moment.person, (countByPerson.get(moment.person) ?? 0) + 1);
      return copy
        .filter((moment) => (countByPerson.get(moment.person) ?? 0) > 1)
        .sort((a, b) => a.person.localeCompare(b.person, "ko-KR") || a.capturedAt.localeCompare(b.capturedAt));
    }
    case "media":
      return copy.filter((moment) => moment.mediaType === "photo" || moment.mediaType === "video");
  }
}
