/**
 * Source Track 68 — Living Media Sphere V3 (Phase 1: Source Runner)
 * Pinned source identity. Every constant here is exact-source evidence from
 * Issue #235 (Web CTO Phase 1 release) and the COM3-GLM 2026-08-17 local
 * Drive-mount audit (read-only DriveFS access, hash-verified in place);
 * nothing may drift without a new explicit owner decision.
 *
 * SOURCE TRACK 68 is NOT a repository Design Lineage: no lineage number is
 * reserved (REPOSITORY_LINEAGE_68 = NOT ALLOCATED). Canonical /v4 adoption is
 * NOT authorized. Phase 2 native candidate is HOLD.
 */

export const SOURCE_TRACK_68_ID = "Track68" as const;
export const SOURCE_TRACK_68_REVISION = "V3" as const;
export const SOURCE_TRACK_68_TITLE =
  "LoveTree · Living Media Sphere V3 · Interactive Video Sphere Entry" as const;

/** Web CTO Phase 1 release state (Issue #235 re-audit gate). */
export const SOURCE_TRACK_68_LIFECYCLE =
  "TRACK_68_V3_PHASE_1_SOURCE_RUNNER_NATIVE_HOLD" as const;

export const SOURCE_TRACK_68_PHASE = Object.freeze({
  sourceRunner: "AUTHORIZED_PHASE_1" as const,
  nativeCandidate: "HOLD_PHASE_2" as const,
  repositoryLineage: "NOT_ALLOCATED" as const,
  canonicalV4Adoption: "NOT_AUTHORIZED" as const,
});

/**
 * Google Drive folders (owner account padiemipu@gmail.com).
 * The adopted/current root IS the codex dev folder (verified by the DriveFS
 * metadata index — same Drive object, not two folders).
 */
export const SOURCE_TRACK_68_DRIVE = Object.freeze({
  rootFolderId: "14vX6gtGym5NZb0eDhlmH-azKMuwzNjS4",
  rootFolderLabel: "12_러브트리_리빙미디어스피어_인터랙티브대문_V1",
  videosFolderId: "1hP6kA-ezQsqCfwMEIBhS_p9Xt1oyd1kg",
  postersFolderId: "1k2FAbsLu3nh7Aes6bNwDEdaP41n_SMjK",
  developmentProcessFolderId: "11vmmXAMuauSXQd-IzpKsUjJ42ryPuEe2",
});

export const SOURCE_TRACK_68_DRIVE_FOLDER_ID = SOURCE_TRACK_68_DRIVE.rootFolderId as string;

/**
 * The V3 executable. The filename `버전3-84개.html` is STALE NAMING ONLY —
 * the runtime authority is 89 videos + 89 posters, never 84.
 * START.html (distribution alias) is byte-identical per Web CTO binary
 * comparison; the local DriveFS index observed it in the Drive trash on
 * 2026-08-17 (25,544 B — matches the executable size). The dev-side copy
 * `18_버전3_개발본.html` is byte-identical (re-verified at intake).
 */
export const SOURCE_TRACK_68_HTML = Object.freeze({
  bytes: 25_544,
  sha256: "2f269047827ad91b32841a2be6eb5022fbae7befcb2f8b59337b8cd1ee2e0232",
  variants: Object.freeze([
    Object.freeze({
      label: "버전3-84개.html",
      driveId: "1OvSy5DhPRGFLsNyjHwQZYJFrEmUoZLbx",
      note: "executable authority (filename is stale naming; runtime count is 89)",
    }),
    Object.freeze({
      label: "START.html",
      driveId: "1A30t1gY088DWbdWU6lqqYWdUJJhAzqwI",
      note: "distribution alias — byte-identical (Web CTO verified); observed in Drive trash 2026-08-17",
    }),
    Object.freeze({
      label: "1.개발과정/18_버전3_개발본.html",
      driveId: "1X47bumRM4nz0ljtnRIK1JcQWJUj-TZl6",
      note: "dev-side copy — byte-identical (sha256 re-verified at intake)",
    }),
  ]),
  byteIdentical: true,
});

/**
 * Historical revision authority (all hashes locally re-verified at intake).
 * V2 alias identity is PACKAGING ONLY — no V1.1 implementation may be created.
 */
export const SOURCE_TRACK_68_REVISION_HISTORY = Object.freeze({
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

/**
 * Exact media transport truth — LOCAL_EXACT_OUT_OF_GIT_ONLY.
 *
 * All 178 runtime assets stay OUT of Git. Full per-file evidence (driveFileId,
 * bytes, SHA-256, provenance) lives in the intake manifest:
 * design-intake/manifests/track-68-living-media-sphere-v3.json
 *
 * REPO_TRANSPORT_NOT_APPROPRIATE evidence:
 * - 25 of 89 videos exceed the Cloudflare Workers static-asset per-file limit
 *   (25 MiB) so a full-set commit would break the guarded Production deploy.
 * - Web CTO gate: TRANSPORT = LOCAL_EXACT_OUT_OF_GIT_ONLY,
 *   REMOTE_CI_EXACT_VIDEO_TRANSPORT = NOT_PROVISIONED,
 *   EXTERNAL_VIDEO_ORIGIN = NOT_AUTHORIZED.
 * - Local staging (gitignored): public/design-lab-assets/source-tracks/68/v3/assets/
 */
export const SOURCE_TRACK_68_MEDIA = Object.freeze({
  videoCount: 89,
  posterCount: 89,
  videoTotalBytes: 1_946_025_764,
  posterTotalBytes: 1_619_015,
  videoBytesThreshold: 26_214_400, // 25 * 1024 * 1024
  videosAtOrBelow25MiB: 64,
  videosAbove25MiB: 25,
  videoMinBytes: 342_637, // v3-024.mp4
  videoMaxBytes: 94_733_644, // v3-072.mp4
  transport: "LOCAL_EXACT_OUT_OF_GIT_ONLY" as const,
  assetState: "EXACT_MEDIA_HOLD_OUT_OF_GIT" as const,
  stagingPath: "public/design-lab-assets/source-tracks/68/v3/assets",
  driveSourcePath:
    "F:/내 드라이브/[26]/[[지피티 작업]]/코덱스/12_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets",
  localEvidence: Object.freeze({
    sha256Verified: "178/178 (COM3-GLM 2026-08-17 in-place DriveFS audit)",
    decodePass: "178/178 (ffprobe: container/duration/dimensions/video-stream)",
    provenancePass: "89/89 videos cross-checked against 19_영상_원본대응표.csv",
    browserQa: "PASS_WITH_NOTED_PARTIALS (1280x800 / 390x844 / 320x720)",
  }),
});

/**
 * Rendering authority (static forensics, full-file read):
 * DOM/CSS3D software spherical projection — no WebGL, no Three.js, no canvas
 * renderer. Preserve this in any Phase 2 candidate.
 */
export const SOURCE_TRACK_68_RENDERING = Object.freeze({
  primary: "css3d-dom" as const,
  projection: "SOFTWARE_SPHERICAL_PROJECTION" as const,
  forbidden: ["WebGL", "Three.js", "canvas renderer"] as const,
});

/** Source runner route contract (Phase 1). No native route exists yet. */
export const SOURCE_TRACK_68_SOURCE_RUNNER = Object.freeze({
  runnerRoute: "/design-lab/source-tracks/68/v3/source",
  sourceAssetPath: "/design-lab-assets/source-tracks/68/v3/index.html",
  label: "Track 68 V3 exact pinned source",
});
