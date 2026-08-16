// Lineage 67 V2.3 Memory Tape Interactive Roll — repository-owned source identity.
//
// This module mirrors the proven Lineage 52 V3 source-runner metadata shape but
// explicitly records that the exact executable bytes + SHA256 are NOT yet pinned.
// The authoritative Drive identity is real; the exact fingerprint is fail-closed
// until the source HTML is obtained and fingerprinted (see #231).

export type Lineage67V23SourceStatus = "PINNED" | "BLOCKED_EXACT_BYTES_UNAVAILABLE";

export const LINEAGE_67_V23_SOURCE = {
  lineageId: "lt-67-memory-tape-interactive-roll",
  revisionId: "v2-3-interactive-inspection",
  candidateId: "lineage:67-v2-3-memory-tape-interactive-roll",
  runnerRoute: "/design-lab/lineages/67/v2-3",
  sourceFile: "track67_v2.3_interactive_inspection.html",
  sourceStorageFile: "track67_v2.3_interactive_inspection.txt",
  sourceAssetPath: "/design-lab-assets/lineages/67/v2-3/track67_v2.3_interactive_inspection.txt",
  driveExecutableId: "1tidkeFhwCNvqztysxEQgkKFDpWIag8gh",
  driveInstructionId: "1XNz0t9A2apMxH0pqw2Ef-xihc1PxfMr-",
  // Exact bytes/SHA256 are intentionally absent: the source executable could not
  // be retrieved from Drive in this environment. The runner fails closed.
  sourceStatus: "BLOCKED_EXACT_BYTES_UNAVAILABLE",
  sourcePinned: false,
  sourceBytes: null,
  sourceSha256: null,
  sourceAuthorityState: "CURRENT_AT_OBSERVATION",
  revisionLabel: "V2.3_INTERACTIVE_INSPECTION",
  expectedRuntimeApi: [] as string[],
} as const;

export const LINEAGE_67_V23_RUNNER_LABEL = "SOURCE RUNNER — NOT CANONICAL PRODUCT";
