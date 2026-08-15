import type {
  DepthTier,
  FitMode,
  Lineage64Source,
  MediaKind,
  MomentFitting,
  MomentRecord,
  OrbitalFamily,
  ProductPolicyBoundary,
  Track59Handoff,
} from "./types";

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

const FAMILIES: readonly OrbitalFamily[] = ["f1", "f2", "f3", "f4", "f5"];
const FAMILY_ACCENTS: Record<OrbitalFamily, string> = {
  f1: "#ff91b8",
  f2: "#8fb6ff",
  f3: "#9be7c4",
  f4: "#ffd27d",
  f5: "#c79bff",
};

const TIER_RADIUS: Record<DepthTier, number> = { foreground: 360, mid: 520, far: 700 };
const TIER_SCALE: Record<DepthTier, number> = { foreground: 1.14, mid: 0.92, far: 0.6 };

function buildTierOrder(): readonly DepthTier[] {
  const order: DepthTier[] = [];
  for (let i = 0; i < 9; i += 1) order.push("foreground");
  for (let i = 0; i < 13; i += 1) order.push("mid");
  for (let i = 0; i < 18; i += 1) order.push("far");
  return order;
}

function buildKindOrder(): readonly MediaKind[] {
  const order: MediaKind[] = [];
  for (let i = 0; i < 18; i += 1) order.push("photo");
  for (let i = 0; i < 10; i += 1) order.push("video");
  for (let i = 0; i < 7; i += 1) order.push("memo");
  for (let i = 0; i < 5; i += 1) order.push("link");
  return order;
}

function permute<T>(values: readonly T[], step: number): T[] {
  const out: T[] = new Array(values.length);
  for (let k = 0; k < values.length; k += 1) out[k] = values[(k * step) % values.length];
  return out;
}

const TIER_ORDER = permute(buildTierOrder(), 13);
const KIND_ORDER = permute(buildKindOrder(), 17);

const KIND_LABEL: Record<MediaKind, string> = {
  photo: "PHOTO",
  video: "VIDEO",
  memo: "MEMO",
  link: "LINK",
};

function buildFitting(kind: MediaKind, index: number): MomentFitting {
  const fitMode: FitMode = kind === "link" ? "contain" : kind === "photo" && index % 3 === 0 ? "contain" : "cover";
  const objectPosition = kind === "photo" && index % 4 === 0 ? "50% 78%" : "50% 24%";
  const viewerFitMode: FitMode = kind === "link" ? "contain" : "cover";
  const viewerObjectPosition = index % 2 === 0 ? "50% 20%" : "50% 52%";
  return {
    mediaType: kind,
    fitMode,
    objectPosition,
    focalPoint: index % 3 === 0 ? "full-body" : "face",
    viewerFitMode,
    viewerObjectPosition,
  };
}

function buildMoments(): readonly MomentRecord[] {
  const moments: MomentRecord[] = [];
  for (let k = 0; k < 40; k += 1) {
    const family = FAMILIES[Math.floor(k / 8)];
    const memberIndex = k % 8;
    const kind = KIND_ORDER[k];
    const depthTier = TIER_ORDER[k];
    const angle = Math.floor(k / 8) * 72 + (memberIndex - 3.5) * 10;
    const world = {
      angle,
      radius: TIER_RADIUS[depthTier],
      y: (memberIndex - 3.5) * 70,
      scale: TIER_SCALE[depthTier],
    };
    const month = String(((k % 12) + 1)).padStart(2, "0");
    const day = String(((k * 7) % 28) + 1).padStart(2, "0");
    moments.push({
      id: `moment-${String(k + 1).padStart(2, "0")}`,
      index: k,
      title: `Moment ${String(k + 1).padStart(2, "0")} · ${KIND_LABEL[kind]}`,
      date: `2026-${month}-${day}`,
      kind,
      family,
      depthTier,
      summary:
        kind === "memo"
          ? `기억은 조용히 쌓인다. 이 순간은 ${FAMILY_ACCENTS[family]} 빛으로 남겨둔 작은 기록이다.`
          : kind === "link"
            ? "연결된 외부 기록 없이 표시되는 데모 링크 카드입니다."
            : `${KIND_LABEL[kind]} 표면은 원본 비율과 초점을 per-Moment fitting 으로 보존한다.`,
      accent: FAMILY_ACCENTS[family],
      fitting: buildFitting(kind, k),
      world,
      demoRecent: k >= 28,
      demoImportant: k % 5 === 0,
    });
  }
  return moments;
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
