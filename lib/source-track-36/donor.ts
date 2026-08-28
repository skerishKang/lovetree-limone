export const SOURCE_TRACK_36_DISPOSITION = "USE_AS_DONOR_TO_EXISTING_NATIVE" as const;

export const SOURCE_TRACK_36_FAMILY = {
  masterAnchorId: 1,
  duplicateMasterIds: [2, 3] as const,
  sourceRevision: "V3",
  sourceFilename: "01_시네마틱메모리포털_밝은로컬진입_v3.html",
  snapshotPath:
    "old/reference/source-tracks-snapshot/36_시네마틱메모리포털_버전통합/01_시네마틱메모리포털_밝은로컬진입_v3.html",
  sourceBytes: 22561,
  sourceSha256: "b8be6b49ba8a736c369050eb4f669a51e07b7b1e56f3d683b25504b9aa383927",
  provenanceIssues: [284, 468, 470, 473] as const,
  provenancePullRequests: [287, 472] as const,
} as const;

export const SOURCE_TRACK_36_CANONICAL_TARGET = "/v4" as const;
export const SOURCE_TRACK_36_EXISTING_NATIVE_COMPARATOR =
  "/design-lab/source-tracks/74/v2/native" as const;

export const SOURCE_TRACK_36_DONOR_ELEMENTS = [
  "bright-local-entry palette",
  "layered depth rings / portal framing",
  "petal and paper-glass material language",
  "cinematic enter transition",
  "serif-led emotional typography",
  "quiet local-entry navigation treatment",
] as const;

export const SOURCE_TRACK_36_SOURCE_GAPS = [
  "source page hard-codes min-width:980px and min-height:650px",
  "source entry iframe resolves to a local/static first-journey HTML instead of canonical /v4 authority",
  "source keyboard handler treats Enter globally as an enter command rather than scoping activation to a focused control",
  "source reduced-motion CSS shortens animation durations but does not establish product routing or data authority",
] as const;
