import type { TreeMomentView } from "@/lib/moment-model";
import type { MediaKind, MomentRecord } from "./types";
import { source64SlotForIndex } from "./source-slots";

const ACCENTS = ["#ff91b8", "#8fb6ff", "#9be7c4", "#ffd27d", "#c79bff"] as const;

function mediaKind(moment: TreeMomentView): MediaKind {
  const sourceType = moment.sourceType.toLowerCase();
  if (sourceType === "link") return "link";
  if (sourceType === "video" || sourceType === "youtube") return "video";
  if (sourceType === "memo" || sourceType === "note" || !moment.thumbnail) return "memo";
  return "photo";
}

function displayDate(moment: TreeMomentView): string {
  return moment.discoveryDate || moment.timestamp || "날짜 미정";
}

/** Projects canonical Tree Moments into Source64's presentation contract. */
export function toLineage64Moments(treeMoments: readonly TreeMomentView[]): MomentRecord[] {
  return treeMoments.map((moment, index) => {
    const slot = source64SlotForIndex(index);
    const kind = mediaKind(moment);

    return {
      id: moment.id,
      index,
      title: moment.title || "제목 없는 Moment",
      date: displayDate(moment),
      kind,
      family: slot.family,
      depthTier: slot.depthTier,
      summary: moment.memo || moment.connectionReason || "이 순간에 남긴 마음",
      ...(moment.thumbnail ? { mediaUrl: moment.thumbnail } : {}),
      accent: ACCENTS[slot.index % ACCENTS.length],
      fitting: { ...slot.fitting, mediaType: kind },
      // Source64 slot topology is view-derived and stays fixed; canonical row
      // content changes only the ID/copy/media payload projected into it.
      world: slot.world,
      demoRecent: false,
      demoImportant: false,
    };
  });
}
