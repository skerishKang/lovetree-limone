export type QuestionLensId = "first" | "recent" | "connections" | "revisit";
export type QuestionLensProjection = "earliest" | "recently-added" | "connected" | "least-recently-viewed";
export type QuestionLensMediaType = "photo" | "video" | "audio" | "note";

export interface QuestionLensMoment {
  id: string;
  title: string;
  person: string;
  mediaType: QuestionLensMediaType;
  capturedAt: string;
  createdOrder: number;
  lastViewedAt: string;
  saved: boolean;
  connectionIds: readonly string[];
}

export interface QuestionLensDefinition {
  id: QuestionLensId;
  label: string;
  question: string;
  interpretation: string;
  resultLabel: string;
  projection: QuestionLensProjection;
}

export interface QuestionLensState {
  lens: QuestionLensId;
  selectedMomentId?: string;
}

export interface QuestionLensView {
  lens: QuestionLensDefinition;
  moments: readonly QuestionLensMoment[];
  summary: string;
  primaryMetric: string;
  timelineMomentIds: readonly string[];
  selectedMomentId: string;
}

export const DEFAULT_QUESTION_LENS: QuestionLensId = "first";

export const QUESTION_LENSES: readonly QuestionLensDefinition[] = [
  {
    id: "first",
    label: "처음",
    question: "처음 좋아하게 된 순간부터 보여줘",
    interpretation: "관계의 시작점과 가장 이른 기록을 중심으로 같은 Moment 공간을 다시 읽습니다.",
    resultLabel: "관계의 시작점",
    projection: "earliest",
  },
  {
    id: "recent",
    label: "최근",
    question: "최근에 추가하거나 발견한 순간을 보여줘",
    interpretation: "같은 Moment 공간을 최근 추가 순서로 재정렬해 지금의 관심을 먼저 보여줍니다.",
    resultLabel: "최근 추가 Moment",
    projection: "recently-added",
  },
  {
    id: "connections",
    label: "연결",
    question: "다른 순간으로 이어진 연결을 보여줘",
    interpretation: "연결된 Moment 수와 관계를 기준으로 다음 기억으로 이어지는 지점을 먼저 보여줍니다.",
    resultLabel: "연결이 강한 Moment",
    projection: "connected",
  },
  {
    id: "revisit",
    label: "다시보기",
    question: "오래 다시 보지 않은 저장 순간을 보여줘",
    interpretation: "저장했지만 오래 열지 않은 Moment를 찾아 같은 기록 공간의 다른 시간축을 드러냅니다.",
    resultLabel: "다시 볼 Moment",
    projection: "least-recently-viewed",
  },
] as const;

export const QUESTION_LENS_MOMENTS: readonly QuestionLensMoment[] = [
  {
    id: "lens-01",
    title: "처음 무대를 본 12초",
    person: "민아",
    mediaType: "video",
    capturedAt: "2025-02-14T20:11:00+09:00",
    createdOrder: 1,
    lastViewedAt: "2026-08-06T22:12:00+09:00",
    saved: true,
    connectionIds: ["lens-02", "lens-04"],
  },
  {
    id: "lens-02",
    title: "처음 찾아본 인터뷰",
    person: "민아",
    mediaType: "video",
    capturedAt: "2025-02-16T18:40:00+09:00",
    createdOrder: 2,
    lastViewedAt: "2026-05-03T09:31:00+09:00",
    saved: true,
    connectionIds: ["lens-01", "lens-03", "lens-05"],
  },
  {
    id: "lens-03",
    title: "웃기 직전 표정 메모",
    person: "민아",
    mediaType: "note",
    capturedAt: "2025-03-08T23:02:00+09:00",
    createdOrder: 3,
    lastViewedAt: "2025-11-12T07:55:00+09:00",
    saved: true,
    connectionIds: ["lens-02"],
  },
  {
    id: "lens-04",
    title: "봄 콘서트 사진",
    person: "민아",
    mediaType: "photo",
    capturedAt: "2026-04-09T21:06:00+09:00",
    createdOrder: 4,
    lastViewedAt: "2026-08-07T20:10:00+09:00",
    saved: true,
    connectionIds: ["lens-01", "lens-05"],
  },
  {
    id: "lens-05",
    title: "최근 발견한 라이브 클립",
    person: "지수",
    mediaType: "video",
    capturedAt: "2026-07-31T19:44:00+09:00",
    createdOrder: 6,
    lastViewedAt: "2026-08-09T17:20:00+09:00",
    saved: false,
    connectionIds: ["lens-02", "lens-04", "lens-06"],
  },
  {
    id: "lens-06",
    title: "공연 뒤 남긴 음성 메모",
    person: "지수",
    mediaType: "audio",
    capturedAt: "2026-08-02T22:15:00+09:00",
    createdOrder: 5,
    lastViewedAt: "2026-08-02T22:20:00+09:00",
    saved: true,
    connectionIds: ["lens-05"],
  },
] as const;

export function questionLensById(id: QuestionLensId): QuestionLensDefinition {
  const lens = QUESTION_LENSES.find((item) => item.id === id);
  if (!lens) throw new Error(`unknown question lens: ${id}`);
  return lens;
}

export function projectMomentsForLens(
  lensId: QuestionLensId,
  moments: readonly QuestionLensMoment[] = QUESTION_LENS_MOMENTS,
): readonly QuestionLensMoment[] {
  const copy = [...moments];
  switch (lensId) {
    case "first":
      return copy.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)).slice(0, 3);
    case "recent":
      return copy.sort((a, b) => b.createdOrder - a.createdOrder).slice(0, 3);
    case "connections":
      return copy
        .filter((moment) => moment.connectionIds.length > 0)
        .sort((a, b) => b.connectionIds.length - a.connectionIds.length || b.createdOrder - a.createdOrder)
        .slice(0, 3);
    case "revisit":
      return copy
        .filter((moment) => moment.saved)
        .sort((a, b) => a.lastViewedAt.localeCompare(b.lastViewedAt))
        .slice(0, 3);
  }
}

export function deriveQuestionLensView(
  state: QuestionLensState,
  moments: readonly QuestionLensMoment[] = QUESTION_LENS_MOMENTS,
): QuestionLensView {
  const lens = questionLensById(state.lens);
  const projected = projectMomentsForLens(state.lens, moments);
  const selectedMomentId = projected.some((moment) => moment.id === state.selectedMomentId)
    ? state.selectedMomentId!
    : projected[0]?.id ?? moments[0]?.id ?? "";

  const primaryMetric = state.lens === "connections"
    ? `${projected.reduce((sum, moment) => sum + moment.connectionIds.length, 0)} links`
    : state.lens === "revisit"
      ? `${projected.length} saved`
      : `${projected.length} Moments`;

  const summary = `${lens.interpretation} 현재 ${projected.length}개의 synthetic Moment를 이 렌즈의 우선순위로 투영합니다.`;
  const timelineMomentIds = [...moments]
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
    .map((moment) => moment.id);

  return {
    lens,
    moments: projected,
    summary,
    primaryMetric,
    timelineMomentIds,
    selectedMomentId,
  };
}

export function serializeQuestionLensState(state: QuestionLensState): string {
  const params = new URLSearchParams();
  params.set("lens", state.lens);
  if (state.selectedMomentId) params.set("moment", state.selectedMomentId);
  return params.toString();
}

export function parseQuestionLensState(
  query: string,
  moments: readonly QuestionLensMoment[] = QUESTION_LENS_MOMENTS,
): QuestionLensState {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  const lensValue = params.get("lens");
  const lens = QUESTION_LENSES.some((item) => item.id === lensValue)
    ? lensValue as QuestionLensId
    : DEFAULT_QUESTION_LENS;
  const requestedMomentId = params.get("moment") ?? undefined;
  const selectedMomentId = requestedMomentId && moments.some((moment) => moment.id === requestedMomentId)
    ? requestedMomentId
    : undefined;

  return { lens, selectedMomentId };
}
