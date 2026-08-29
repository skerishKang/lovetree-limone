import type { TreeMomentView } from "@/lib/moment-model";
import type { MediaKind, MomentRecord } from "./types";
import { source64SlotForIndex } from "./source-slots";
import { getYouTubeMediaInfo } from "./youtube";

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

    // Resolve thumbnail/mediaUrl from canonical thumbnail or deterministic YouTube info
    let mediaUrl = moment.thumbnail || undefined;
    let externalUrl: string | undefined = undefined;

    if (kind === "video" || moment.sourceType.toLowerCase() === "youtube") {
      const ytInfo = getYouTubeMediaInfo(moment.thumbnail);
      if (ytInfo) {
        if (!mediaUrl) mediaUrl = ytInfo.thumbnailUrl;
        externalUrl = ytInfo.watchUrl;
      }
    }

    return {
      id: moment.id,
      index,
      title: moment.title || "제목 없는 Moment",
      date: displayDate(moment),
      kind,
      family: slot.family,
      depthTier: slot.depthTier,
      summary: moment.memo || moment.connectionReason || "이 순간에 남긴 마음",
      ...(mediaUrl ? { mediaUrl } : {}),
      ...(externalUrl ? { externalUrl } : {}),
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
