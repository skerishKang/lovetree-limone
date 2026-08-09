export type MomentMediaKind = "photo" | "video" | "audio" | "note" | "document";

export type InspectionControlId =
  | "zoom-out"
  | "zoom-in"
  | "fit"
  | "play-pause"
  | "rewind"
  | "forward"
  | "highlight"
  | "open-document"
  | "open-source";

export interface InspectionControl {
  id: InspectionControlId;
  label: string;
  ariaLabel: string;
}

export interface MomentInspectionAdapter {
  kind: MomentMediaKind;
  label: string;
  viewerLabel: string;
  controls: readonly InspectionControl[];
  preserves: readonly string[];
}

export interface PrototypeInspectionMoment {
  id: string;
  kind: MomentMediaKind;
  title: string;
  person: string;
  capturedAt: string;
  sourceLabel: string;
  note: string;
  preview: readonly string[];
}

export const COMMON_INSPECTION_METADATA = [
  "person",
  "capturedAt",
  "sourceLabel",
  "kind",
] as const;

export const MOMENT_INSPECTION_ADAPTERS: readonly MomentInspectionAdapter[] = [
  {
    kind: "photo",
    label: "사진",
    viewerLabel: "Photo viewer",
    controls: [
      { id: "zoom-out", label: "축소", ariaLabel: "사진 축소" },
      { id: "fit", label: "맞춤", ariaLabel: "사진을 화면에 맞춤" },
      { id: "zoom-in", label: "확대", ariaLabel: "사진 확대" },
    ],
    preserves: ["aspect ratio", "caption context", "source label"],
  },
  {
    kind: "video",
    label: "영상",
    viewerLabel: "Video viewer",
    controls: [
      { id: "rewind", label: "−10초", ariaLabel: "영상 10초 뒤로" },
      { id: "play-pause", label: "재생 / 일시정지", ariaLabel: "영상 재생 또는 일시정지" },
      { id: "forward", label: "+10초", ariaLabel: "영상 10초 앞으로" },
    ],
    preserves: ["playback position", "duration context", "source label"],
  },
  {
    kind: "audio",
    label: "오디오",
    viewerLabel: "Audio waveform viewer",
    controls: [
      { id: "rewind", label: "−10초", ariaLabel: "오디오 10초 뒤로" },
      { id: "play-pause", label: "재생 / 일시정지", ariaLabel: "오디오 재생 또는 일시정지" },
      { id: "forward", label: "+10초", ariaLabel: "오디오 10초 앞으로" },
    ],
    preserves: ["playback position", "waveform context", "transcript anchor"],
  },
  {
    kind: "note",
    label: "메모",
    viewerLabel: "Text note viewer",
    controls: [
      { id: "highlight", label: "핵심 문장", ariaLabel: "메모 핵심 문장 강조" },
    ],
    preserves: ["original text order", "author context", "capture date"],
  },
  {
    kind: "document",
    label: "문서 / 링크",
    viewerLabel: "Document preview",
    controls: [
      { id: "open-document", label: "미리보기", ariaLabel: "문서 미리보기 열기" },
      { id: "open-source", label: "원본 위치", ariaLabel: "문서 원본 위치 확인" },
    ],
    preserves: ["document title", "source location", "capture date"],
  },
] as const;

export const PROTOTYPE_INSPECTION_MOMENTS: readonly PrototypeInspectionMoment[] = [
  {
    id: "inspect-01",
    kind: "photo",
    title: "공연이 끝난 뒤의 표정",
    person: "민아",
    capturedAt: "2026-05-18 21:42",
    sourceLabel: "Camera roll · IMG_1842",
    note: "무대 직후 남겨둔 한 장면입니다.",
    preview: ["21:42", "after stage", "still frame"],
  },
  {
    id: "inspect-02",
    kind: "video",
    title: "앵콜 마지막 14초",
    person: "민아",
    capturedAt: "2026-05-18 22:03",
    sourceLabel: "Video · 00:14",
    note: "짧은 영상 Moment의 재생 위치와 출처를 같은 shell에서 확인합니다.",
    preview: ["00:04 / 00:14", "encore", "clip"],
  },
  {
    id: "inspect-03",
    kind: "audio",
    title: "공연 뒤 짧게 남긴 음성 메모",
    person: "나",
    capturedAt: "2026-05-18 22:17",
    sourceLabel: "Voice memo · 00:38",
    note: "당시 감정을 소리로 남긴 Moment입니다.",
    preview: ["00:12 / 00:38", "voice memo", "transcript anchor"],
  },
  {
    id: "inspect-04",
    kind: "note",
    title: "집에 돌아와 적은 세 문장",
    person: "나",
    capturedAt: "2026-05-19 00:21",
    sourceLabel: "LoveTree note",
    note: "오늘은 마지막 인사보다 웃기 직전 표정이 계속 생각났다.",
    preview: ["3 lines", "saved note", "text-only"],
  },
  {
    id: "inspect-05",
    kind: "document",
    title: "인터뷰 링크를 다시 저장한 순간",
    person: "민아",
    capturedAt: "2026-06-02 19:08",
    sourceLabel: "Saved link · interview",
    note: "외부 콘텐츠 자체가 아니라 내가 왜 다시 찾았는지 남긴 Moment입니다.",
    preview: ["saved link", "interview", "external source"],
  },
] as const;

export function adapterForKind(kind: MomentMediaKind): MomentInspectionAdapter {
  const adapter = MOMENT_INSPECTION_ADAPTERS.find((item) => item.kind === kind);
  if (!adapter) throw new Error(`missing Moment inspection adapter: ${kind}`);
  return adapter;
}

export function inspectionMomentById(id: string): PrototypeInspectionMoment {
  const moment = PROTOTYPE_INSPECTION_MOMENTS.find((item) => item.id === id);
  if (!moment) throw new Error(`unknown prototype inspection Moment: ${id}`);
  return moment;
}

export function adjacentInspectionMomentId(id: string, direction: -1 | 1): string {
  const index = PROTOTYPE_INSPECTION_MOMENTS.findIndex((item) => item.id === id);
  if (index < 0) return PROTOTYPE_INSPECTION_MOMENTS[0].id;
  const nextIndex = (index + direction + PROTOTYPE_INSPECTION_MOMENTS.length) % PROTOTYPE_INSPECTION_MOMENTS.length;
  return PROTOTYPE_INSPECTION_MOMENTS[nextIndex].id;
}
