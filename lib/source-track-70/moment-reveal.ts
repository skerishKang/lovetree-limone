import type { AlbumMomentView } from "../moment-model";

export const TRACK70_MOMENT_REVEAL_AUTHORITY = {
  issue: 496,
  sourceGateIssue: 291,
  ownerDecisionIssue: 344,
  productJob: "MOMENT",
  productDisposition: "USE_AS_HIGH_VISUAL_MOMENT_DONOR",
  sourceSelection: "A+B_COMPOSITE_OWNER_QUEUED",
  candidateA: {
    filename: "선택1-70_V2.1_LOVETREE_PORTAL_NAV_RETURN_FIX.html",
    driveId: "1M5ab-nid8efR1jY6kcID4LmRkXLoC1JC",
    bytes: 31_282,
    sha256: "bbee4b839c73b9da95ea0b0f92e7ddb77447b669cdfa42d25678f374efe3b1c0",
  },
  candidateB: {
    filename: "선택2-70_V11_INSTANT_CANVAS_TRAIL_REVEAL_디자인팀장19기.html",
    embeddedExecutableVersion: "V20",
    driveId: "1qXH-hzYJqSYbMBwHWaTP7kBRckfVC6gC",
    bytes: 24_536_470,
    sha256: "4234b3104841ec5f63223d073e04ee39916fc4fc9993d0d9743ac9a21e7cc7a7",
  },
  productMediaAuthority: "CANONICAL_MOMENT_MEDIA_ONLY",
  sourcePairAssets: "REFERENCE_ONLY_NOT_PRODUCT_MEDIA",
} as const;

export const TRACK70_TRAIL_LIMIT = 8;
export const TRACK70_LINGER_MS = 920;

export type Track70RevealMoment = Pick<
  AlbumMomentView,
  | "id"
  | "treeId"
  | "title"
  | "memo"
  | "thumbnail"
  | "sourceType"
  | "sourceUrl"
  | "emotionTags"
  | "timestamp"
  | "discoveryDate"
  | "sortOrder"
>;

export function track70CanonicalMedia(moment: Track70RevealMoment | null | undefined): string {
  return moment?.thumbnail?.trim() ?? "";
}

export function track70AdjacentIndex(current: number, delta: number, count: number): number {
  if (!Number.isInteger(count) || count <= 0) return 0;
  const normalized = ((current + delta) % count + count) % count;
  return normalized;
}

export function track70MomentDate(moment: Track70RevealMoment): string {
  return moment.discoveryDate || moment.timestamp || "";
}
