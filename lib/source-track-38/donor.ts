export const SOURCE_TRACK_38_DISPOSITION = "USE_AS_VISUAL_FUNCTION_DONOR" as const;

export const SOURCE_TRACK_38_FAMILY = {
  sourceTrackId: "Track38",
  stableId: "source-track-38-voyager-space-memory-map-v1",
  sourceRevision: "V1",
  sourcePath: "reference/source-tracks-snapshot/38_보이저_우주기억지도/01_보이저_우주영상기억지도.html",
  sourceBytes: 35935,
  sourceSha256: "9d5b4b3682d2bba0118a4a7a6e9a37098442c4be4180f74009e4580c36130526",
  sourceGitBlob: "0e393316c8682215634546724950aba91ab7ba7e",
} as const;

export const SOURCE_TRACK_38_CANONICAL_DISCOVER = "/v4/community" as const;
export const SOURCE_TRACK_38_CANONICAL_PUBLIC_TREE_PREFIX = "/v4/community/trees/" as const;
export const SOURCE_TRACK_38_EXISTING_MAP_COMPARATOR = "/v4/trees/demo/map" as const;

export const SOURCE_TRACK_38_BASE_IMPLEMENTATION = [
  "app/components/v4/V4CommunityDiscovery.tsx#V4CommunityDiscovery",
  "app/components/v4/V4CommunityDiscovery.tsx#V4PublicTree",
] as const;

export const SOURCE_TRACK_38_DONOR_ELEMENTS = [
  "dark cosmic spatial field",
  "public-memory node constellation",
  "parent-child connection lines",
  "selected-memory inspector",
  "search and emotion filtering",
  "constellation/radial/timeline layout lenses",
  "zoom/pan/reset map controls",
] as const;

export const SOURCE_TRACK_38_SOURCE_GAPS = [
  "source uses synthetic celebrity/video fixtures rather than canonical public Tree/Memory data",
  "source opens YouTube thumbnail/embed runtime directly from fixture video ids",
  "source continuously animates requestAnimationFrame/auto-orbit without a prefers-reduced-motion contract",
  "source canvas nodes are not keyboard-focusable and keyboard handling is limited to Escape",
  "source canvas interaction owns touch-action:none and wheel zoom, which is too aggressive for a canonical mobile discover surface",
] as const;
