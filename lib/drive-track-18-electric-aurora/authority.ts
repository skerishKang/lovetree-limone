import type { CanonicalMoment } from "@/lib/moment-model";

export const DRIVE_TRACK_18_ELECTRIC_AURORA_ID = "drive-track-18-electric-aurora" as const;

export type ElectricAuroraMoment = Pick<
  CanonicalMoment,
  | "id"
  | "treeId"
  | "parentId"
  | "title"
  | "memo"
  | "sourceType"
  | "thumbnail"
  | "timestamp"
  | "discoveryDate"
  | "sortOrder"
> & {
  index: number;
  isRoot: boolean;
  isSelected: boolean;
};

export interface ElectricAuroraFieldStatus {
  totalMoments: number;
  selectedMomentId: string | null;
  selectedOrdinal: number | null;
}

export function projectElectricAuroraMoments(
  moments: CanonicalMoment[],
  selectedMomentId: string | null,
): ElectricAuroraMoment[] {
  return [...moments]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map((moment, index) => ({
      id: moment.id,
      treeId: moment.treeId,
      parentId: moment.parentId,
      title: moment.title,
      memo: moment.memo,
      sourceType: moment.sourceType,
      thumbnail: moment.thumbnail,
      timestamp: moment.timestamp,
      discoveryDate: moment.discoveryDate,
      sortOrder: moment.sortOrder,
      index,
      isRoot: moment.parentId === null,
      isSelected: moment.id === selectedMomentId,
    }));
}

export function deriveElectricAuroraFieldStatus(
  moments: ElectricAuroraMoment[],
  selectedMomentId: string | null,
): ElectricAuroraFieldStatus {
  const selectedIndex = selectedMomentId
    ? moments.findIndex((moment) => moment.id === selectedMomentId)
    : -1;
  return {
    totalMoments: moments.length,
    selectedMomentId: selectedIndex >= 0 ? selectedMomentId : null,
    selectedOrdinal: selectedIndex >= 0 ? selectedIndex + 1 : null,
  };
}

/**
 * Source-only demo semantics that are deliberately excluded from canonical
 * Tree/Moment authority. They may inform visual choreography but never become
 * persisted or derived product fields in this donor proof.
 */
export const ELECTRIC_AURORA_SOURCE_ONLY_SEMANTICS = Object.freeze([
  "core-status",
  "energy",
  "importance",
  "return-distance",
  "season-count",
  "activity-score",
] as const);
