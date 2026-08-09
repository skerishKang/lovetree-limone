export type NarrativeMomentMediaHint = "photo" | "video" | "audio" | "note";

export interface NarrativeMomentFields {
  capturedAtHint: string;
  placeHint: string;
  peopleHints: readonly string[];
  summary: string;
  mediaHints: readonly NarrativeMomentMediaHint[];
}

export interface NarrativeMomentAssembly {
  originalNarrative: string;
  fields: NarrativeMomentFields;
  confirmed: boolean;
  revision: number;
}

const MEDIA_HINTS: readonly [NarrativeMomentMediaHint, RegExp][] = [
  ["photo", /사진|포토/],
  ["video", /영상|동영상|클립/],
  ["audio", /녹음|음성|오디오/],
  ["note", /메모|글|일기/],
];

function normalizedNarrative(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractCapturedAtHint(value: string): string {
  return value.match(/\d{4}년\s*\d{1,2}월\s*\d{1,2}일|\d{1,2}월\s*\d{1,2}일|\d{4}-\d{1,2}-\d{1,2}/)?.[0] ?? "";
}

function extractPlaceHint(value: string): string {
  const match = value.match(/(?:^|[,.!?]\s*|\s)([가-힣A-Za-z0-9·]{2,24}(?:공원|공연장|카페|학교|집|역|거리|광장|식당|회사|바다|산|공항))(?:에서|앞에서|근처에서)/);
  return match?.[1] ?? "";
}

function extractPeopleHints(value: string): readonly string[] {
  const names = [...value.matchAll(/([가-힣]{2,4})(?:와|과|랑|이랑)(?=\s|,|$)/g)].map((match) => match[1]);
  return [...new Set(names)];
}

function extractMediaHints(value: string): readonly NarrativeMomentMediaHint[] {
  return MEDIA_HINTS.filter(([, pattern]) => pattern.test(value)).map(([id]) => id);
}

function summaryFromNarrative(value: string): string {
  const normalized = normalizedNarrative(value);
  if (!normalized) return "";
  const first = normalized.split(/[.!?。]/)[0]?.trim() ?? normalized;
  return first.length > 84 ? `${first.slice(0, 84)}…` : first;
}

export function deriveNarrativeMomentAssembly(originalNarrative: string): NarrativeMomentAssembly {
  const normalized = normalizedNarrative(originalNarrative);
  return {
    originalNarrative,
    fields: {
      capturedAtHint: extractCapturedAtHint(normalized),
      placeHint: extractPlaceHint(normalized),
      peopleHints: extractPeopleHints(normalized),
      summary: summaryFromNarrative(normalized),
      mediaHints: extractMediaHints(normalized),
    },
    confirmed: false,
    revision: 1,
  };
}

export function editNarrativeMomentAssembly(
  assembly: NarrativeMomentAssembly,
  patch: Partial<NarrativeMomentFields>,
): NarrativeMomentAssembly {
  return {
    ...assembly,
    fields: {
      ...assembly.fields,
      ...patch,
    },
    confirmed: false,
    revision: assembly.revision + 1,
  };
}

export function setNarrativeMomentConfirmation(
  assembly: NarrativeMomentAssembly,
  confirmed: boolean,
): NarrativeMomentAssembly {
  return {
    ...assembly,
    confirmed,
    revision: assembly.revision + 1,
  };
}
