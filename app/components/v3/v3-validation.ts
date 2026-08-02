export interface TimeParts {
  minutes: number;
  seconds: number;
}

export function parseTime(value: string): TimeParts | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (seconds > 59) return null;
  return { minutes, seconds };
}

export function timeToSeconds(time: TimeParts): number {
  return time.minutes * 60 + time.seconds;
}

export interface SourceIntervalResult {
  valid: boolean;
  error: string | null;
}

export function validateSourceInterval(start: string, end: string): SourceIntervalResult {
  if (start.trim()) {
    const startTime = parseTime(start.trim());
    if (!startTime) {
      return {
        valid: false,
        error: "시작 시점은 mm:ss 형식이어야 해요. (초는 00~59)",
      };
    }
    if (end.trim()) {
      const endTime = parseTime(end.trim());
      if (!endTime) {
        return {
          valid: false,
          error: "종료 시점은 mm:ss 형식이어야 해요. (초는 00~59)",
        };
      }
      if (timeToSeconds(endTime) < timeToSeconds(startTime)) {
        return { valid: false, error: "종료 시점이 시작 시점보다 빠를 수 없어요." };
      }
    }
  } else if (end.trim()) {
    return { valid: false, error: "시작 시점을 먼저 입력해 주세요." };
  }
  return { valid: true, error: null };
}

export const CUSTOM_RELATION_PRESET_LABEL = "직접 입력";
export const CUSTOM_RELATION_PLACEHOLDER_TEXT = "이어진 이유를 직접 적어 보세요";

export function isCustomRelationLabelBlank(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed === CUSTOM_RELATION_PRESET_LABEL) return true;
  if (trimmed === CUSTOM_RELATION_PLACEHOLDER_TEXT) return true;
  return false;
}

export interface ConnectDraftInput {
  nextUrl: string;
  nextTitle: string;
  relationType: string;
  relationLabel: string;
}

export interface ConnectValidationResult {
  valid: boolean;
  error: string | null;
}

export function validateConnectDraft(input: ConnectDraftInput): ConnectValidationResult {
  if (!input.nextUrl.trim() || !input.nextTitle.trim()) {
    return {
      valid: false,
      error: "연결할 다음 순간의 URL과 제목을 입력해 주세요. (건너뛰려면 아래 링크를 사용해요)",
    };
  }
  if (input.relationType === "custom" && isCustomRelationLabelBlank(input.relationLabel)) {
    return { valid: false, error: "연결 이유를 직접 입력해 주세요." };
  }
  return { valid: true, error: null };
}
