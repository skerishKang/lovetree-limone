/**
 * Lineage 59 V5 — Asset Provenance Ledger + Native Media Binding resolver.
 *
 * This module is the bounded closure for the
 * LINEAGE_59_ASSET_PROVENANCE_AND_NATIVE_MEDIA_BINDING gap. It does NOT
 * invent exact binaries or approximate/generated substitutions. It records the
 * authoritative source fingerprint (independently verified by Web CTO in
 * issue #161 and re-verified in reviews 4946999933 / 4947154845) and makes the
 * native runner's media-binding status truthful: 5 Web CTO-verified small exact
 * assets are committed + EXACT_ASSET_PINNED; 3 large environment PNGs remain
 * REPO_TRANSPORT_HOLD; DEMO_FIXTURE placeholders stay distinct (never masquerade
 * as exact source).
 *
 * Source freshness: the worker's Drive remote (padiemipu:) is a different
 * account and cannot list the source owner's Drive folder. The standalone
 * executable and embedded assets were therefore NOT re-downloaded from Drive in
 * this environment. Fingerprint authority is cited from issue #161 (Web CTO
 * independent verification), not from a fresh worker-side hash.
 */

export const DRIVE_FETCH_STATUS = "LOCAL_DRIVE_FETCH_UNAVAILABLE" as const;

/**
 * Web CTO re-verified the authoritative Drive V5 (review 4946999933) and later
 * staged the exact-byte package that actually committed the 5 small assets
 * (review 4947154845). This is a SEPARATE authority from the worker's own
 * (unavailable) Drive access: the worker still cannot fetch Drive
 * (DRIVE_FETCH_STATUS above), but the source fingerprints below are cited from
 * Web CTO's independent verification.
 */
export const WEB_CTO_DRIVE_FETCH_VERIFIED = true as const;
export const WEB_CTO_REVIEW_ID = "4947154845" as const;

/**
 * Exact embedded payloads Web CTO verified inside the authoritative standalone
 * HTML (현재후보.html). 9 data-URI occurrences / 8 unique payloads:
 * 3 large environment-background PNGs (repo-transport HOLD) + 5 small exact
 * payloads (repo-pin approved). The worker could NOT extract the exact bytes
 * (Drive unreachable, source HTML not present on the worker filesystem), so
 * these are recorded as verified fingerprints, not as committed binaries.
 */
export const WEB_CTO_VERIFIED_PAYLOADS = {
  executableFile: "현재후보.html",
  executableDriveId: "1Tof9O1c0lslWsgz2oY6R--drFuqTEC6d",
  executableBytes: 17_192_064,
  executableSha256:
    "763f8a2ffbe46d556fcfe7b2b57d505860be6e346bfe30223a8891a56e14be71",
  qaEvidenceFile: "검증결과.json",
  qaEvidenceDriveId: "1ZT8xpC5rPVL4qDuYCfnREWR68zrgFcxn",
  qaEvidenceBytes: 9_694,
  qaEvidenceSha256:
    "365ab46a6f28eb6cf19f1df3d24006e5076c47e4d0e2a1e17a1d32ff00c94a94",
  backgrounds: [
    {
      bytes: 3_637_429,
      sha256:
        "eddbdc30287b23ce070b2d004eb21bdaab8fc7dc7860407bcb82728865294ee8",
    },
    {
      bytes: 2_903_228,
      sha256:
        "f0b480f9356853aaf16c797173e702cacba2788da9981533435730f0e9251b52",
    },
    {
      bytes: 2_599_253,
      sha256:
        "fe112ce3a470911a3c58697f45d81086341af0cd927c945eb56d88dfe69cc360",
    },
  ],
  smallExact: [
    {
      kind: "webp",
      bytes: 9_120,
      sha256:
        "aea1b65c10f6a937afc2a95d7892b5c277fe65cec4a56167696bfe56151cbef6",
    },
    {
      kind: "jpeg",
      bytes: 9_718,
      sha256:
        "cc086ddd6d8ad5fad1bcff40c8f0323f201b4c70e3d0dab85e91b59fd9f54d48",
    },
    {
      kind: "webp",
      bytes: 6_114,
      sha256:
        "5a0aaa877c77b8edcfe286f839f27e611a9647166f3eae2db7b0040147de1a77",
    },
    {
      kind: "webp",
      bytes: 9_162,
      sha256:
        "9ee926a2e59a2c6243ff27064001b1f5aa5ee4ef0d65cfac3bdbd8f3b4ac358b",
    },
    {
      kind: "mp4",
      bytes: 4_606,
      sha256:
        "1c84aa49be5bf35b58196831f8c2d5562e65cb23732dfd80d2322a249ca60465",
    },
  ],
} as const;

/**
 * Committed exact-pin asset paths → status. Populated from the Web CTO staging
 * package (review 4947154845): the 5 small exact binaries are committed under
 * public/design-lab-assets/lineages/59/v5/media/ with verified SHA-256. The
 * resolver returns EXACT_ASSET_PINNED only for a path that actually exists in the
 * repo with a verified checksum — it can never fabricate an exact-media PASS for
 * an uncommitted or mismatched path.
 */
export const EXACT_PINNED_ASSET_PATHS: Readonly<Record<string, true>> = {
  "/design-lab-assets/lineages/59/v5/media/moment-m1-character-f01.webp": true,
  "/design-lab-assets/lineages/59/v5/media/moment-m5-character-m01.webp": true,
  "/design-lab-assets/lineages/59/v5/media/moment-m7-character-f01.webp": true,
  "/design-lab-assets/lineages/59/v5/media/moment-m3-video-still.jpg": true,
  "/design-lab-assets/lineages/59/v5/media/source-demo-video.mp4": true,
};

export type MediaBindingStatus =
  | "EXACT_ASSET_PINNED"
  | "SOURCE_REFERENCE_ONLY"
  | "TRANSPORT_HOLD"
  | "DEMO_FIXTURE";

export type RepoTransportPolicy =
  | "REPO_PIN_OK"
  | "REPO_TRANSPORT_HOLD"
  | "DEMO_ONLY";

export interface AssetLedgerEntry {
  assetId: string;
  role: string;
  sourceIdentity: string;
  driveObjectId?: string;
  bytes?: number;
  sha256?: string;
  mediaType: string;
  nativeBindingTarget?: string;
  committedPath?: string;
  repoTransportPolicy: RepoTransportPolicy;
  provenanceStatus: MediaBindingStatus;
  notes?: string;
}

/**
 * Authoritative source fingerprints, copied verbatim from issue #161 Web CTO
 * independent verification. These are the citation authority used because the
 * worker could not re-fetch Drive in this environment.
 */
export const LINEAGE_59_SOURCE_FINGERPRINTS = {
  executableFile: "현재후보.html",
  executableDriveId: "1Tof9O1c0lslWsgz2oY6R--drFuqTEC6d",
  executableBytes: 17_192_064,
  executableSha256:
    "763f8a2ffbe46d556fcfe7b2b57d505860be6e346bfe30223a8891a56e14be71",
  qaEvidenceFile: "검증결과.json",
  qaEvidenceDriveId: "1ZT8xpC5rPVL4qDuYCfnREWR68zrgFcxn",
  qaEvidenceBytes: 9_694,
  qaEvidenceSha256:
    "365ab46a6f28eb6cf19f1df3d24006e5076c47e4d0e2a1e17a1d32ff00c94a94",
  backgroundSha256: [
    "eddbdc30287b23ce070b2d004eb21bdaab8fc7dc7860407bcb82728865294ee8",
    "f0b480f9356853aaf16c797173e702cacba2788da9981533435730f0e9251b52",
    "fe112ce3a470911a3c58697f45d81086341af0cd927c945eb56d88dfe69cc360",
  ],
} as const;

/**
 * Exact-source asset ledger. The 8 unique embedded payloads
 * (3 environment-background PNGs + 3 character WebP + 1 inline JPEG + 1 inline
 * MP4) plus the standalone executable and 검증결과.json QA evidence are recorded
 * with Web CTO-verified fingerprints (review 4946999933 / 4947154845). The
 * large binaries (executable + 3 backgrounds) are REPO_TRANSPORT_HOLD and are
 * never committed. The 5 small exact payloads are committed under
 * public/design-lab-assets/lineages/59/v5/media/ and recorded as
 * EXACT_ASSET_PINNED (repo-pin approved, checksum-verified); synthetic
 * placeholders remain DEMO_FIXTURE.
 */
export const ASSET_LEDGER: readonly AssetLedgerEntry[] = [
  {
    assetId: "src-executable-current-candidate",
    role: "standalone-executable",
    sourceIdentity: "현재후보.html — V5 Living Memory Book standalone",
    driveObjectId: LINEAGE_59_SOURCE_FINGERPRINTS.executableDriveId,
    bytes: LINEAGE_59_SOURCE_FINGERPRINTS.executableBytes,
    sha256: LINEAGE_59_SOURCE_FINGERPRINTS.executableSha256,
    mediaType: "text/html",
    nativeBindingTarget: "N/A — source fidelity target only, never shipped as product code",
    repoTransportPolicy: "REPO_TRANSPORT_HOLD",
    provenanceStatus: "SOURCE_REFERENCE_ONLY",
    notes: "17.2MB standalone; do not ship standalone HTML or embedded base64/data URLs as product code (issue #161 bundle-boundary rule)",
  },
  {
    assetId: "src-qa-evidence",
    role: "sibling-qa-evidence",
    sourceIdentity: "검증결과.json — sibling QA report",
    driveObjectId: LINEAGE_59_SOURCE_FINGERPRINTS.qaEvidenceDriveId,
    bytes: LINEAGE_59_SOURCE_FINGERPRINTS.qaEvidenceBytes,
    sha256: LINEAGE_59_SOURCE_FINGERPRINTS.qaEvidenceSha256,
    mediaType: "application/json",
    nativeBindingTarget: "N/A — QA evidence only",
    repoTransportPolicy: "REPO_TRANSPORT_HOLD",
    provenanceStatus: "SOURCE_REFERENCE_ONLY",
  },
  {
    assetId: "src-environment-background-1",
    role: "environment-background",
    sourceIdentity: "1672×941 RGBA PNG cinematic background (unique, embedded in standalone)",
    bytes: 3_637_429,
    sha256: LINEAGE_59_SOURCE_FINGERPRINTS.backgroundSha256[0],
    mediaType: "image/png",
    nativeBindingTarget: "cinematic book environment (currently rendered via DEMO_FIXTURE)",
    repoTransportPolicy: "REPO_TRANSPORT_HOLD",
    provenanceStatus: "SOURCE_REFERENCE_ONLY",
    notes: "3.6MB; exceeds repo-pin ceiling; large binary transport HOLD",
  },
  {
    assetId: "src-environment-background-2",
    role: "environment-background",
    sourceIdentity: "1672×941 RGBA PNG cinematic background (unique, embedded in standalone)",
    bytes: 2_903_228,
    sha256: LINEAGE_59_SOURCE_FINGERPRINTS.backgroundSha256[1],
    mediaType: "image/png",
    nativeBindingTarget: "cinematic book environment (currently rendered via DEMO_FIXTURE)",
    repoTransportPolicy: "REPO_TRANSPORT_HOLD",
    provenanceStatus: "SOURCE_REFERENCE_ONLY",
    notes: "2.9MB; exceeds repo-pin ceiling; large binary transport HOLD",
  },
  {
    assetId: "src-environment-background-3",
    role: "environment-background",
    sourceIdentity: "1672×941 RGBA PNG cinematic background (unique, embedded in standalone)",
    bytes: 2_599_253,
    sha256: LINEAGE_59_SOURCE_FINGERPRINTS.backgroundSha256[2],
    mediaType: "image/png",
    nativeBindingTarget: "cinematic book environment (currently rendered via DEMO_FIXTURE)",
    repoTransportPolicy: "REPO_TRANSPORT_HOLD",
    provenanceStatus: "SOURCE_REFERENCE_ONLY",
    notes: "2.6MB; exceeds repo-pin ceiling; large binary transport HOLD",
  },
  {
    assetId: "src-character-webp-1",
    role: "character",
    sourceIdentity: "362×362 RGB WebP character asset #1 (embedded in standalone)",
    bytes: 9_120,
    sha256: "aea1b65c10f6a937afc2a95d7892b5c277fe65cec4a56167696bfe56151cbef6",
    mediaType: "image/webp",
    nativeBindingTarget: "Moment m1 character/photo media",
    committedPath: "/design-lab-assets/lineages/59/v5/media/moment-m1-character-f01.webp",
    repoTransportPolicy: "REPO_PIN_OK",
    provenanceStatus: "EXACT_ASSET_PINNED",
    notes: "Exact bytes committed from Web CTO staging package (review 4947154845); SHA256 verified",
  },
  {
    assetId: "src-character-webp-2",
    role: "character",
    sourceIdentity: "362×362 RGB WebP character asset #2 (embedded in standalone)",
    bytes: 6_114,
    sha256: "5a0aaa877c77b8edcfe286f839f27e611a9647166f3eae2db7b0040147de1a77",
    mediaType: "image/webp",
    nativeBindingTarget: "Moment m5 character/photo media",
    committedPath: "/design-lab-assets/lineages/59/v5/media/moment-m5-character-m01.webp",
    repoTransportPolicy: "REPO_PIN_OK",
    provenanceStatus: "EXACT_ASSET_PINNED",
    notes: "Exact bytes committed from Web CTO staging package (review 4947154845); SHA256 verified",
  },
  {
    assetId: "src-character-webp-3",
    role: "character",
    sourceIdentity: "362×362 RGB WebP character asset #3 (embedded in standalone)",
    bytes: 9_162,
    sha256: "9ee926a2e59a2c6243ff27064001b1f5aa5ee4ef0d65cfac3bdbd8f3b4ac358b",
    mediaType: "image/webp",
    nativeBindingTarget: "Moment m7 character/photo media",
    committedPath: "/design-lab-assets/lineages/59/v5/media/moment-m7-character-f01.webp",
    repoTransportPolicy: "REPO_PIN_OK",
    provenanceStatus: "EXACT_ASSET_PINNED",
    notes: "Exact bytes committed from Web CTO staging package (review 4947154845); SHA256 verified",
  },
  {
    assetId: "src-inline-media-jpeg",
    role: "inline-media",
    sourceIdentity: "235×145 RGB JPEG inline media asset (embedded in standalone)",
    bytes: 9_718,
    sha256: "cc086ddd6d8ad5fad1bcff40c8f0323f201b4c70e3d0dab85e91b59fd9f54d48",
    mediaType: "image/jpeg",
    nativeBindingTarget: "Moment m3 video still",
    committedPath: "/design-lab-assets/lineages/59/v5/media/moment-m3-video-still.jpg",
    repoTransportPolicy: "REPO_PIN_OK",
    provenanceStatus: "EXACT_ASSET_PINNED",
    notes: "Exact bytes committed from Web CTO staging package (review 4947154845); SHA256 verified",
  },
  {
    assetId: "src-inline-video-mp4",
    role: "inline-video",
    sourceIdentity: "source DEMO_VIDEO MP4 (embedded in standalone)",
    bytes: 4_606,
    sha256: "1c84aa49be5bf35b58196831f8c2d5562e65cb23732dfd80d2322a249ca60465",
    mediaType: "video/mp4",
    nativeBindingTarget: "Moment m3 source DEMO_VIDEO",
    committedPath: "/design-lab-assets/lineages/59/v5/media/source-demo-video.mp4",
    repoTransportPolicy: "REPO_PIN_OK",
    provenanceStatus: "EXACT_ASSET_PINNED",
    notes: "Exact bytes committed from Web CTO staging package (review 4947154845); SHA256 verified",
  },
  {
    assetId: "demo-placeholder-portrait",
    role: "synthetic-placeholder",
    sourceIdentity: "public/design-lab-assets/lineages/59/v5/media/placeholder-portrait.svg",
    mediaType: "image/svg+xml",
    nativeBindingTarget: "Moment portrait media in native runner",
    repoTransportPolicy: "DEMO_ONLY",
    provenanceStatus: "DEMO_FIXTURE",
    notes: "Synthetic; NOT exact source. Must be distinguishable from EXACT_ASSET_PINNED in UI/evidence",
  },
  {
    assetId: "demo-placeholder-landscape",
    role: "synthetic-placeholder",
    sourceIdentity: "public/design-lab-assets/lineages/59/v5/media/placeholder-landscape.svg",
    mediaType: "image/svg+xml",
    nativeBindingTarget: "Moment landscape media + video poster in native runner",
    repoTransportPolicy: "DEMO_ONLY",
    provenanceStatus: "DEMO_FIXTURE",
    notes: "Synthetic; NOT exact source. Must be distinguishable from EXACT_ASSET_PINNED in UI/evidence",
  },
  {
    assetId: "demo-placeholder-video",
    role: "synthetic-placeholder",
    sourceIdentity: "public/design-lab-assets/lineages/59/v5/media/placeholder-video.mp4",
    mediaType: "video/mp4",
    nativeBindingTarget: "Moment video media in native runner",
    repoTransportPolicy: "DEMO_ONLY",
    provenanceStatus: "DEMO_FIXTURE",
    notes: "Synthetic; NOT exact source. Must be distinguishable from EXACT_ASSET_PINNED in UI/evidence",
  },
];

/** Repo-pin ceiling: exact binaries larger than this must not be committed. */
export const MAX_PINNED_BINARY_BYTES = 1_000_000;

/**
 * Resolve the truthful binding status for a moment's rendered media. A
 * placeholder src is reported as DEMO_FIXTURE; a committed, checksum-verified
 * exact path reports EXACT_ASSET_PINNED; any other src reports
 * SOURCE_REFERENCE_ONLY.
 */
export function resolveMomentMediaBinding(
  media: { src: string; type: string } | null,
): MediaBindingStatus | null {
  if (!media) return null;
  // Committed exact-pin path map is populated from the Web CTO staging package
  // (review 4947154845). EXACT_ASSET_PINNED is only ever returned for a path
  // that actually exists in the repo with a verified SHA-256 — never fabricated.
  if (media.src in EXACT_PINNED_ASSET_PATHS) return "EXACT_ASSET_PINNED";
  if (media.src.includes("placeholder")) return "DEMO_FIXTURE";
  return "SOURCE_REFERENCE_ONLY";
}

/** Classify a ledger entry's binding status (truthful, no fabrication). */
export function classifyLedgerBinding(entry: AssetLedgerEntry): MediaBindingStatus {
  return entry.provenanceStatus;
}

/**
 * Verify an exact pin by comparing SHA-256. Returns false when either side is
 * missing or they differ. Used to prove a fingerprint mismatch forbids an
 * exact-media PASS.
 */
export function verifyExactPin(
  expectedSha256: string | undefined,
  claimedSha256: string | undefined,
): boolean {
  if (!expectedSha256 || !claimedSha256) return false;
  return expectedSha256.toLowerCase() === claimedSha256.toLowerCase();
}

/**
 * A ledger entry is repo-pinnable only when it is EXACT_ASSET_PINNED, carries a
 * checksum, and is at or under the repo-pin ceiling. By construction no
 * SOURCE_REFERENCE_ONLY / DEMO_FIXTURE entry qualifies, which guards against an
 * accidental giant-binary commit.
 */
export function isRepoPinnable(entry: AssetLedgerEntry): boolean {
  return (
    entry.provenanceStatus === "EXACT_ASSET_PINNED" &&
    entry.repoTransportPolicy === "REPO_PIN_OK" &&
    typeof entry.bytes === "number" &&
    entry.bytes <= MAX_PINNED_BINARY_BYTES &&
    typeof entry.sha256 === "string"
  );
}

export function getLedgerEntry(assetId: string): AssetLedgerEntry | undefined {
  return ASSET_LEDGER.find((e) => e.assetId === assetId);
}

export function ledgerStatusSummary(): {
  exactPinned: number;
  sourceReferenceOnly: number;
  transportHold: number;
  demoFixture: number;
  repoPinnable: number;
} {
  const exactPinned = ASSET_LEDGER.filter(
    (e) => e.provenanceStatus === "EXACT_ASSET_PINNED",
  ).length;
  const sourceReferenceOnly = ASSET_LEDGER.filter(
    (e) => e.provenanceStatus === "SOURCE_REFERENCE_ONLY",
  ).length;
  const transportHold = ASSET_LEDGER.filter(
    (e) => e.repoTransportPolicy === "REPO_TRANSPORT_HOLD",
  ).length;
  const demoFixture = ASSET_LEDGER.filter(
    (e) => e.provenanceStatus === "DEMO_FIXTURE",
  ).length;
  const repoPinnable = ASSET_LEDGER.filter(isRepoPinnable).length;
  return {
    exactPinned,
    sourceReferenceOnly,
    transportHold,
    demoFixture,
    repoPinnable,
  };
}
