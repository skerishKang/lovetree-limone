export type MediaKind = "photo" | "video" | "memo" | "link";

export type DepthTier = "foreground" | "mid" | "far";

export type OrbitalFamily = "f1" | "f2" | "f3" | "f4" | "f5";

export type FitMode = "cover" | "contain" | "matte";

export interface MomentFitting {
  mediaType: MediaKind;
  fitMode: FitMode;
  objectPosition: string;
  focalPoint: string | { x: number; y: number };
  viewerFitMode: FitMode;
  viewerObjectPosition: string;
}

export interface MomentWorldCoord {
  angle: number;
  radius: number;
  y: number;
  scale: number;
  phaseOffset?: number;
  zOffset?: number;
}

export interface MomentRecord {
  id: string;
  index: number;
  title: string;
  date: string;
  kind: MediaKind;
  family: OrbitalFamily;
  depthTier: DepthTier;
  summary: string;
  externalUrl?: string;
  mediaUrl?: string;
  accent: string;
  fitting: MomentFitting;
  world: MomentWorldCoord;
  demoRecent: boolean;
  demoImportant: boolean;
}

export interface Lineage64Source {
  lineageId: string;
  revisionId: string;
  baselineRevisionId: string;
  scenarioId: string;
  route: string;
  folderId: string;
  executableDriveId: string;
  executableFile: string;
  executableBytes: number;
  executableSha256: string;
  renderingTier: string;
  implementationMode: string;
}

export interface Track59Handoff {
  sourceTrackId: string;
  resolvedProductTargetId: string;
  targetMapping: boolean;
  urlResolution: boolean;
  openCall: boolean;
  actualTargetOpen: boolean;
  receiverConsume: boolean;
  sameMomentFocus: boolean;
  note: string;
}

export interface ProductPolicyBoundary {
  fields: readonly string[];
  canonical: false;
  note: string;
}
