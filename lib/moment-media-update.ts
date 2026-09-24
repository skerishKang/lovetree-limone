import { youtubeThumbnail, videoOffsetSecondsFromUrl } from "./tree-types";

export interface MomentMediaUpdateInput {
  sourceUrl?: string;
  thumbnail?: string;
  videoOffsetSeconds?: number | null;
}

/**
 * Applies the media portion of a Moment update without conflating omission
 * with an explicit clear. A source URL change invalidates metadata derived
 * from the previous URL unless the caller supplies a replacement value.
 */
export function applyMomentMediaUpdate(
  payload: Record<string, unknown>,
  input: MomentMediaUpdateInput
): Record<string, unknown> {
  if (input.sourceUrl === undefined) return payload;

  const sourceUrl = input.sourceUrl.trim();
  payload.sourceUrl = sourceUrl;

  if (sourceUrl.length === 0) {
    payload.thumbnail = "";
    payload.videoOffsetSeconds = null;
    return payload;
  }

  payload.thumbnail = input.thumbnail !== undefined
    ? input.thumbnail.trim()
    : (youtubeThumbnail(sourceUrl) ?? "");
  payload.videoOffsetSeconds = input.videoOffsetSeconds !== undefined
    ? input.videoOffsetSeconds
    : (videoOffsetSecondsFromUrl(sourceUrl) ?? null);

  return payload;
}
