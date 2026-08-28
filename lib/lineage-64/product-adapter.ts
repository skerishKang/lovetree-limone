import type { TreeMomentView } from "@/lib/moment-model";
import type {
  DepthTier,
  FitMode,
  MediaKind,
  MomentFitting,
  MomentRecord,
  OrbitalFamily,
} from "./types";

const FAMILIES: readonly OrbitalFamily[] = ["f1", "f2", "f3", "f4", "f5"];
const ACCENTS = ["#ff91b8", "#8fb6ff", "#9be7c4", "#ffd27d", "#c79bff"] as const;
const DEPTHS: readonly DepthTier[] = ["foreground", "mid", "far"];
const RADII: Record<DepthTier, number> = { foreground: 360, mid: 520, far: 700 };
const SCALES: Record<DepthTier, number> = { foreground: 1.14, mid: 0.92, far: 0.6 };

function mediaKind(moment: TreeMomentView): MediaKind {
  const sourceType = moment.sourceType.toLowerCase();
  if (sourceType === "link") return "link";
  if (sourceType === "video" || sourceType === "youtube") return "video";
  if (sourceType === "memo" || sourceType === "note" || !moment.thumbnail) return "memo";
  return "photo";
}

function fitting(kind: MediaKind, index: number): MomentFitting {
  const fitMode: FitMode = kind === "link" || (kind === "photo" && index % 3 === 0) ? "contain" : "cover";
  return {
    mediaType: kind,
    fitMode,
    objectPosition: index % 4 === 0 ? "50% 78%" : "50% 24%",
    focalPoint: index % 3 === 0 ? "full-body" : "face",
    viewerFitMode: kind === "link" ? "contain" : "cover",
    viewerObjectPosition: index % 2 === 0 ? "50% 20%" : "50% 52%",
  };
}

function displayDate(moment: TreeMomentView): string {
  return moment.discoveryDate || moment.timestamp || "날짜 미정";
}

/** Projects canonical Tree Moments into Source64's presentation contract. */
export function toLineage64Moments(treeMoments: readonly TreeMomentView[]): MomentRecord[] {
  return treeMoments.map((moment, index) => {
    const kind = mediaKind(moment);
    const depthTier = DEPTHS[index % DEPTHS.length];
    const family = FAMILIES[index % FAMILIES.length];
    const angle = (index / Math.max(treeMoments.length, 1)) * 360;

    return {
      id: moment.id,
      index,
      title: moment.title || "제목 없는 Moment",
      date: displayDate(moment),
      kind,
      family,
      depthTier,
      summary: moment.memo || moment.connectionReason || "이 순간에 남긴 마음",
      ...(moment.thumbnail ? { mediaUrl: moment.thumbnail } : {}),
      accent: ACCENTS[index % ACCENTS.length],
      fitting: fitting(kind, index),
      world: {
        angle,
        radius: RADII[depthTier],
        y: ((index % 7) - 3) * 70,
        scale: SCALES[depthTier],
      },
      demoRecent: false,
      demoImportant: false,
    };
  });
}
