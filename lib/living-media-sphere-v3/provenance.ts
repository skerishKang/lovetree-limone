/**
 * Living Media Sphere V3 — independent source family (Phase 1: Source Runner).
 *
 * Issue #242 resolved the repository numeric-identity collision:
 * this family has no numeric repository Source Track ID. Historical adopted-design
 * folder number 68 is provenance only. Repository Lineage 68 remains unallocated.
 * Canonical /v4 adoption is not authorized and Phase 2 native remains HOLD.
 */

export const LIVING_MEDIA_SPHERE_FAMILY_ID = "living-media-sphere" as const;
export const LIVING_MEDIA_SPHERE_REVISION = "V3" as const;
export const LIVING_MEDIA_SPHERE_TITLE =
  "LoveTree · Living Media Sphere V3 · Interactive Video Sphere Entry" as const;

export const LIVING_MEDIA_SPHERE_LIFECYCLE =
  "LIVING_MEDIA_SPHERE_V3_PHASE_1_SOURCE_RUNNER_NATIVE_HOLD" as const;

export const LIVING_MEDIA_SPHERE_PHASE = Object.freeze({
  sourceRunner: "AUTHORIZED_PHASE_1" as const,
  nativeCandidate: "HOLD_PHASE_2" as const,
  repositoryLineage: "NOT_ALLOCATED" as const,
  canonicalV4Adoption: "NOT_AUTHORIZED" as const,
});

export const LIVING_MEDIA_SPHERE_GOVERNANCE = Object.freeze({
  decisionIssue: 242,
  sourceFamilyId: LIVING_MEDIA_SPHERE_FAMILY_ID,
  repositoryNumericSourceTrackId: null,
  historicalDriveFolderNumber: 68,
  historicalAdoptedDesignPath:
    "03_디자인채택본/68_리빙미디어스피어_인터랙티브대문/현재후보.html",
  historicalNumberMeaning: "ADOPTED_DESIGN_FOLDER_PROVENANCE_ONLY" as const,
  repositoryLineage68: "NOT_ALLOCATED" as const,
  canonicalV4Adoption: "NO" as const,
});

export const LIVING_MEDIA_SPHERE_DRIVE = Object.freeze({
  rootFolderId: "14vX6gtGym5NZb0eDhlmH-azKMuwzNjS4",
  rootFolderLabel: "12_러브트리_리빙미디어스피어_인터랙티브대문_V1",
  videosFolderId: "1hP6kA-ezQsqCfwMEIBhS_p9Xt1oyd1kg",
  postersFolderId: "1k2FAbsLu3nh7Aes6bNwDEdaP41n_SMjK",
  developmentProcessFolderId: "11vmmXAMuauSXQd-IzpKsUjJ42ryPuEe2",
});

export const LIVING_MEDIA_SPHERE_DRIVE_FOLDER_ID =
  LIVING_MEDIA_SPHERE_DRIVE.rootFolderId as string;

export const LIVING_MEDIA_SPHERE_HTML = Object.freeze({
  bytes: 25_544,
  sha256: "2f269047827ad91b32841a2be6eb5022fbae7befcb2f8b59337b8cd1ee2e0232",
  variants: Object.freeze([
    Object.freeze({
      label: "버전3-84개.html",
      driveId: "1OvSy5DhPRGFLsNyjHwQZYJFrEmUoZLbx",
      note: "current executable authority (filename is stale naming; runtime count is 89)",
    }),
    Object.freeze({
      label: "1.개발과정/18_버전3_개발본.html",
      driveId: "1X47bumRM4nz0ljtnRIK1JcQWJUj-TZl6",
      note: "accessible dev-side copy — byte-identical (Web CTO fresh re-hash + intake re-verification)",
    }),
  ]),
  byteIdentical: true,
});

export const LIVING_MEDIA_SPHERE_START_ALIAS = Object.freeze({
  label: "START.html",
  driveId: "1A30t1gY088DWbdWU6lqqYWdUJJhAzqwI",
  classification: "TRASH/HISTORICAL_ALIAS" as const,
  status: "REFERENCE_ONLY" as const,
  currentAvailability: "DRIVE_API_404_FILE_NOT_FOUND" as const,
  localObservation: "DriveFS trash, 25,544 B (2026-08-17)",
  byteIdentityAtIntake: "verified byte-identical by Web CTO at intake time",
});

export const LIVING_MEDIA_SPHERE_POINTER_CONTRACT = Object.freeze({
  severity: "P0" as const,
  sourceDefect:
    "pointerup and pointercancel share the same committing endPointer() — a cancelled ≤5px gesture can still focusFilm()/openViewer()",
  pointerup: "may commit click/drag only after valid 5px click-vs-drag threshold semantics" as const,
  pointercancel: "cleanup only — never select, never focusFilm, never open viewer" as const,
  lostpointercapture: "cleanup only — never select, never focusFilm, never open viewer" as const,
});

export const LIVING_MEDIA_SPHERE_REVISION_HISTORY = Object.freeze({
  v1: Object.freeze({
    bytes: 32_808,
    sha256: "cdb88d1a7fc1c3778dd07dd2593ca1c9ac62e24f072dc6ffeb62a0e23d8e6b23",
    members: ["버전1.html", "v1/현재후보.html", "1.개발과정/16_버전1_원본.html", "1.개발과정/07_개발본.html"],
  }),
  v2Family: Object.freeze({
    bytes: 28_323,
    sha256: "4693dfaf80c702652292920abd917ce2e68a9ac5f9ff78f5cbad176f1204111c",
    members: ["버전2.html", "최종본.html", "1.개발과정/17_버전2_원본.html", "1.개발과정/15_V1.1_개발본.html"],
    aliasIdentity: "PACKAGING_ONLY_CONFIRMED",
  }),
});

export const LIVING_MEDIA_SPHERE_MEDIA = Object.freeze({
  videoCount: 89,
  posterCount: 89,
  mediaManifestRows: 178,
  videoTotalBytes: 1_946_025_764,
  posterTotalBytes: 1_619_015,
  videoBytesThreshold: 26_214_400,
  videosAtOrBelow25MiB: 64,
  videosAbove25MiB: 25,
  videoMinBytes: 342_637,
  videoMaxBytes: 94_733_644,
  transport: "LOCAL_EXACT_OUT_OF_GIT_ONLY" as const,
  assetState: "EXACT_MEDIA_HOLD_OUT_OF_GIT" as const,
  stagingPath: "public/design-lab-assets/source-families/living-media-sphere/v3/assets",
  historicalEvidenceSnapshot:
    "docs/design/source-families/living-media-sphere/history/pre-242-numeric-identity-manifest.json",
  localEvidence: Object.freeze({
    sha256Verified: "178/178 (COM3-GLM 2026-08-17 in-place DriveFS audit)",
    decodePass: "178/178 (ffprobe: container/duration/dimensions/video-stream)",
    provenancePass: "89/89 videos cross-checked against 19_영상_원본대응표.csv",
    browserQa: "dynamic browser QA — see tests/living-media-sphere-v3-browser-qa.mjs evidence",
  }),
});

export const LIVING_MEDIA_SPHERE_RENDERING = Object.freeze({
  primary: "css3d-dom" as const,
  projection: "SOFTWARE_SPHERICAL_PROJECTION" as const,
  forbidden: ["WebGL", "Three.js", "canvas renderer"] as const,
});

export const LIVING_MEDIA_SPHERE_SOURCE_RUNNER = Object.freeze({
  runnerRoute: "/design-lab/source-families/living-media-sphere/v3/source",
  sourceAssetPath: "/design-lab-assets/source-families/living-media-sphere/v3/index.html",
  label: "Living Media Sphere V3 exact pinned source",
});
