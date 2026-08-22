/**
 * Lineage 63 — Moment Field 3D View Studio V1 Types & Contracts.
 *
 * Product Job:
 * One canonical Tree / Moment + Connection dataset
 * → choose among multiple spatial presentation lenses (44 View Presets)
 * → inspect the same mixed-media Moments under that lens
 * → adjust bounded View geometry/motion parameters live (48 Inspector controls)
 * → scrub/play the current presentation
 * → save/restore reusable View presets.
 */

export type MediaType = "photo" | "video" | "memo" | "link";

export interface Track63Moment {
  readonly id: string;
  readonly title: string;
  readonly mediaType: MediaType;
  readonly subject: string;
  readonly theme: string;
  readonly date: string;
  readonly caption: string;
  readonly aspectRatio: "16:9" | "4:3" | "1:1" | "9:16" | "3:4";
  readonly accentColor: string;
  readonly videoSrc?: string;
  readonly memoText?: string;
  readonly linkUrl?: string;
  readonly linkDomain?: string;
  readonly imageUrl?: string;
  readonly isMainPath?: boolean;
}

export interface Track63Connection {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly relation: string;
  readonly whyNext: string;
  readonly strength: number; // 0..1
}

export interface Track63SeedSet {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly momentIds: readonly string[];
}

export type ViewFamily =
  | "orbit"
  | "wall"
  | "stack"
  | "cascade"
  | "flow"
  | "symbolic"
  | "timeline"
  | "cluster";

export type SortOrder =
  | "chronological"
  | "theme"
  | "media-type"
  | "connection-count";

export type CardAspectRatio = "source" | "square" | "portrait" | "cinema";

export type ThemePalette =
  | "midnight-violet"
  | "aurora-cyan"
  | "rose-velvet"
  | "deep-space";

export type ConnectionStyle =
  | "curved-arc"
  | "straight-laser"
  | "pulse-beam"
  | "subtle-thread";

export type ProjectionMode =
  | "perspective-3d"
  | "orthographic-isometric"
  | "spherical-dome";

export type LoopPolicy = "continuous-loop" | "ping-pong" | "single-pass";

export type LayoutAlignment =
  | "center-anchored"
  | "ground-plane"
  | "skyline-top";

export type FocusLevel = "standard-focus" | "selective-halo" | "deep-dof";

export type RenderQuality =
  | "ultra-fidelity"
  | "balanced"
  | "performance-lite";

/**
 * 48 Bound Inspector Parameters:
 * - 24 Range parameters
 * - 12 Toggle parameters
 * - 4 Select parameters
 * - 8 Segmented parameters
 */
export interface Track63ViewParameters {
  // 24 Range Controls
  cameraDistance: number; // 500..3000
  fov: number; // 30..120
  spread: number; // 50..500
  rotationX: number; // -90..90
  rotationY: number; // -180..180
  rotationZ: number; // -180..180
  cardScale: number; // 0.4..2.0
  cardDepth: number; // 0..300
  itemTilt: number; // -45..45
  elevation: number; // -300..300
  curvature: number; // 0..100
  connectionOpacity: number; // 0..100
  spacingX: number; // 20..300
  spacingY: number; // 20..300
  spacingZ: number; // 0..400
  glowIntensity: number; // 0..100
  blurFalloff: number; // 0..100
  speed: number; // 0.1..3.0
  waveAmplitude: number; // 0..200
  waveFrequency: number; // 0.1..5.0
  verticalOffset: number; // -200..200
  orbitTilt: number; // -60..60
  cardGap: number; // 4..64
  arcAngle: number; // 30..360

  // 12 Toggle Controls
  showConnections: boolean;
  showLabels: boolean;
  autoRotate: boolean;
  depthCue: boolean;
  darkBackdrop: boolean;
  cardShadow: boolean;
  showBadges: boolean;
  cardReflection: boolean;
  highlightMainPath: boolean;
  wireframeGuides: boolean;
  soundIndicators: boolean;
  compactCards: boolean;

  // 4 Select Controls
  sortOrder: SortOrder;
  cardAspectRatio: CardAspectRatio;
  themePalette: ThemePalette;
  connectionStyle: ConnectionStyle;

  // 8 Segmented Controls
  mediaFilter: "all" | "photo" | "video" | "memo" | "link";
  seedSet: string;
  viewFamily: "all" | ViewFamily;
  projectionMode: ProjectionMode;
  loopPolicy: LoopPolicy;
  layoutAlignment: LayoutAlignment;
  focusLevel: FocusLevel;
  renderQuality: RenderQuality;
}

export interface CardTransform3D {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
  opacity: number;
}

export interface Track63ViewDefinition {
  readonly id: string;
  readonly label: string;
  readonly family: ViewFamily;
  readonly description: string;
  readonly defaultParams: Partial<Track63ViewParameters>;
  readonly project: (
    moments: readonly Track63Moment[],
    params: Track63ViewParameters,
    index: number,
    total: number,
    phase: number,
  ) => CardTransform3D;
}

export interface SavedViewPreset {
  readonly id: string;
  readonly name: string;
  readonly viewDefinitionId: string;
  readonly createdAt: string;
  readonly parameters: Track63ViewParameters;
}

export interface Track63StudioState {
  readonly selectedSeedId: string;
  readonly selectedViewId: string;
  readonly selectedMomentId: string | null;
  readonly playing: boolean;
  readonly scrubPhase: number; // 0..1
  readonly parameters: Track63ViewParameters;
  readonly savedPresets: readonly SavedViewPreset[];
  readonly activeMediaPlayingId: string | null; // Max 1 active playing video
  readonly inspectorTab: "layout" | "style" | "motion" | "connections";
  readonly overlayModal: "none" | "save-preset" | "service-handoff" | "media-inspect";
  readonly historyPast: readonly Track63ViewParameters[];
  readonly historyFuture: readonly Track63ViewParameters[];
}
