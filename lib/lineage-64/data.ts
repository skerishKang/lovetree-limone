import type {
  Lineage64Source,
  MediaKind,
  MomentRecord,
  OrbitalFamily,
  ProductPolicyBoundary,
  Track59Handoff,
} from "./types";
import { SOURCE64_SOURCE_SLOTS } from "./source-slots";

export const LINEAGE_64_SOURCE: Lineage64Source = {
  lineageId: "lt-64-floating-moment-entry-portal",
  revisionId: "64-v1-2-1",
  baselineRevisionId: "64-v1",
  scenarioId: "entry-onboarding",
  route: "/design-lab/lineages/64/v1-2-1",
  folderId: "1clob29lQZuKdaWF3KFGiPblKNsmqZ7k6",
  executableDriveId: "1UX9OdJrl2HLBIssRzx7cooCBMebe9j2g",
  executableFile: "현재후보.html",
  executableBytes: 1_565_313,
  executableSha256: "80886540bb8e3148a7336bf9999298897ac0ab921797a6534c89ea0029c6de5d",
  renderingTier: "css3d-dom",
  implementationMode: "design-lab-native-react-source-fidelity-candidate",
};

export const LINEAGE_64_RENDERING = "css3d-dom" as const;

export const TRACK64_V1_2_1_HANDOFF: Track59Handoff = {
  sourceTrackId: "Track59",
  resolvedProductTargetId: "lt-59-living-memory-book",
  targetMapping: true,
  urlResolution: true,
  openCall: true,
  actualTargetOpen: false,
  receiverConsume: false,
  sameMomentFocus: false,
  note: "Track59 cross-track local navigation path correction (V1.2 → V1.2.1 delta). Mapping/URL-resolution/open-call proven; actual repository route open and receiver consume remain UNPROVEN — OPTIONAL dependency, does not block Track64 core.",
};

export const LINEAGE_64_PRODUCT_POLICY: ProductPolicyBoundary = {
  fields: ["recent", "important", "resume", "lastViewed", "signedInReturn", "myTreeRoute"],
  canonical: false,
  note: "recent / important / resume / lastViewed / signed-in return / MY TREE are PRODUCT_POLICY or derived-demo authority, never canonical product truth. See Issue #165.",
};

export const TRACK64_GESTURE = {
  desktopTapThreshold: 10,
  mobileTapThreshold: 14,
} as const;

const FAMILY_ACCENTS: Record<OrbitalFamily, string> = {
  f1: "#ff91b8",
  f2: "#8fb6ff",
  f3: "#9be7c4",
  f4: "#ffd27d",
  f5: "#c79bff",
};

const KIND_LABEL: Record<MediaKind, string> = {
  photo: "PHOTO",
  video: "VIDEO",
  memo: "MEMO",
  link: "LINK",
};

function buildMoments(): readonly MomentRecord[] {
  return SOURCE64_SOURCE_SLOTS.map((slot, index) => ({
    id: `moment-${String(index + 1).padStart(2, "0")}`,
    index,
    title: slot.title,
    date: slot.date,
    kind: slot.kind,
    family: slot.family,
    depthTier: slot.depthTier,
    summary: slot.memo || slot.whyNext || `${KIND_LABEL[slot.kind]} source surface`,
    ...(slot.mediaUrl ? { mediaUrl: slot.mediaUrl } : {}),
    ...(slot.externalUrl ? { externalUrl: slot.externalUrl } : {}),
    accent: FAMILY_ACCENTS[slot.family],
    fitting: slot.fitting,
    world: slot.world,
    demoRecent: index >= 28,
    demoImportant: index % 5 === 0,
  }));
}

export const TRACK64_MOMENTS: readonly MomentRecord[] = buildMoments();

export function track64MediaMix(): { photo: number; video: number; memo: number; link: number } {
  const mix = { photo: 0, video: 0, memo: 0, link: 0 };
  for (const m of TRACK64_MOMENTS) mix[m.kind] += 1;
  return mix;
}

export function track64DepthSplit(): { foreground: number; mid: number; far: number } {
  const split = { foreground: 0, mid: 0, far: 0 };
  for (const m of TRACK64_MOMENTS) split[m.depthTier] += 1;
  return split;
}

export function track64FamilySplit(): Record<OrbitalFamily, number> {
  const split: Record<OrbitalFamily, number> = { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0 };
  for (const m of TRACK64_MOMENTS) split[m.family] += 1;
  return split;
}
