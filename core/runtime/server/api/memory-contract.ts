import type { MemoryRow } from "./access";
import { validateTimestamp } from "./validate";

export const CONNECTION_REASON_MAX_LENGTH = 500;
export const VIDEO_OFFSET_SECONDS_MAX = 2_147_483_647;

type MemoryContractRow = Omit<MemoryRow, "clientKey"> & {
  clientKey?: string | null;
};

export function parseVideoOffsetSeconds(sourceUrl: unknown): number | null {
  if (typeof sourceUrl !== "string" || sourceUrl.trim() === "") return null;
  try {
    const url = new URL(sourceUrl.trim());
    const raw = url.searchParams.get("t") || url.searchParams.get("start");
    if (!raw) return null;
    if (/^\d+$/.test(raw)) return Math.min(Number(raw), VIDEO_OFFSET_SECONDS_MAX);
    const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(raw.trim());
    if (!match) return null;
    const seconds = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
    return Number.isSafeInteger(seconds) && seconds >= 0
      ? Math.min(seconds, VIDEO_OFFSET_SECONDS_MAX)
      : null;
  } catch {
    return null;
  }
}

export function validateMemoryDateCompatibility(
  body: Record<string, unknown>,
  prefix = ""
): string | null {
  const timestampField = `${prefix}timestamp`;
  const discoveryField = `${prefix}discoveryDate`;
  const timestampError = validateTimestamp(body.timestamp, timestampField);
  if (timestampError) return timestampError;
  const discoveryError = validateTimestamp(body.discoveryDate, discoveryField);
  if (discoveryError) return discoveryError;

  const timestamp = typeof body.timestamp === "string" ? body.timestamp.trim() : "";
  const discoveryDate = typeof body.discoveryDate === "string" ? body.discoveryDate.trim() : "";
  if (timestamp && discoveryDate && timestamp !== discoveryDate) {
    return `${discoveryField} must match ${timestampField} during the compatibility transition`;
  }
  return null;
}

export function normalizeMemoryCreateInput(body: Record<string, unknown>): Record<string, unknown> {
  const next = { ...body };
  const timestamp = typeof body.timestamp === "string" ? body.timestamp.trim() : "";
  const discoveryDate = typeof body.discoveryDate === "string" ? body.discoveryDate.trim() : "";
  const canonicalDate = discoveryDate || timestamp;
  next.timestamp = canonicalDate;
  next.discoveryDate = canonicalDate || null;

  const connectionReason = typeof body.connectionReason === "string" ? body.connectionReason.trim() : "";
  next.connectionReason = connectionReason || null;

  if (body.videoOffsetSeconds === undefined || body.videoOffsetSeconds === null) {
    next.videoOffsetSeconds = parseVideoOffsetSeconds(body.sourceUrl);
  }
  return next;
}

export function normalizeMemoryUpdateInput(body: Record<string, unknown>): Record<string, unknown> {
  const next = { ...body };
  if (body.timestamp !== undefined || body.discoveryDate !== undefined) {
    const timestamp = typeof body.timestamp === "string" ? body.timestamp.trim() : "";
    const discoveryDate = typeof body.discoveryDate === "string" ? body.discoveryDate.trim() : "";
    const canonicalDate = discoveryDate || timestamp;
    next.timestamp = canonicalDate;
    next.discoveryDate = canonicalDate || null;
  }
  if (body.connectionReason !== undefined) {
    const connectionReason = typeof body.connectionReason === "string" ? body.connectionReason.trim() : "";
    next.connectionReason = connectionReason || null;
  }
  if (body.sourceUrl !== undefined && body.videoOffsetSeconds === undefined) {
    next.videoOffsetSeconds = parseVideoOffsetSeconds(body.sourceUrl);
  }
  return next;
}

export function serializeMemoryContract(row: MemoryContractRow): Record<string, unknown> {
  return {
    ...row,
    clientKey: row.clientKey ?? null,
    discoveryDate: row.discoveryDate || row.timestamp || null,
    videoOffsetSeconds: row.videoOffsetSeconds ?? parseVideoOffsetSeconds(row.sourceUrl),
  };
}
