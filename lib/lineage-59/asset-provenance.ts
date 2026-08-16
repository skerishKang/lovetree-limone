/**
 * Lineage 59 V5 — Asset Provenance Ledger + Native Media Binding resolver.
 *
 * This module is the bounded closure for the
 * LINEAGE_59_ASSET_PROVENANCE_AND_NATIVE_MEDIA_BINDING_HOLD gap. It does NOT
 * invent exact binaries or approximate/generated substitutions. It records the
 * authoritative source fingerprint (independently verified by Web CTO in
 * issue #161) and makes the native runner's media-binding status truthful so a
 * DEMO_FIXTURE placeholder can never masquerade as an EXACT_ASSET_PINNED
 * source asset.
 *
 * Source freshness: the worker's Drive remote (padiemipu:) is a different
 * account and cannot list the source owner's Drive folder. The standalone
 * executable and embedded assets were therefore NOT re-downloaded from Drive in
 * this environment. Fingerprint authority is cited from issue #161 (Web CTO
 * independent verification), not from a fresh worker-side hash.
 */

export const DRIVE_FETCH_STATUS = "LOCAL_DRIVE_FETCH_UNAVAILABLE" as const;

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
 * Exact-source asset ledger. Every entry is SOURCE_REFERENCE_ONLY or
 * DEMO_FIXTURE — none are EXACT_ASSET_PINNED, because the worker could not
 * re-fetch Drive and the character/JPEG embedded assets have no published
 * SHA-256 in issue #161, so they cannot be checksum-pinned truthfully.
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
    assetId: "src-character-asset-set",
    role: "character",
    sourceIdentity: "362×362 RGB WebP character asset ×3 (embedded in standalone)",
    mediaType: "image/webp",
    nativeBindingTarget: "Moment character/portrait media (currently rendered via DEMO_FIXTURE)",
    repoTransportPolicy: "REPO_TRANSPORT_HOLD",
    provenanceStatus: "SOURCE_REFERENCE_ONLY",
    notes: "Small, but no published SHA-256 in issue #161 — cannot checksum-pin truthfully; transport HOLD",
  },
  {
    assetId: "src-inline-media-asset",
    role: "inline-media",
    sourceIdentity: "235×145 RGB JPEG inline media asset (embedded in standalone)",
    mediaType: "image/jpeg",
    nativeBindingTarget: "Moment inline media (currently rendered via DEMO_FIXTURE)",
    repoTransportPolicy: "REPO_TRANSPORT_HOLD",
    provenanceStatus: "SOURCE_REFERENCE_ONLY",
    notes: "Small, but no published SHA-256 in issue #161 — cannot checksum-pin truthfully; transport HOLD",
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
 * placeholder src is reported as DEMO_FIXTURE; any non-placeholder src that is
 * not checksum-pinned is SOURCE_REFERENCE_ONLY. This resolver NEVER returns
 * EXACT_ASSET_PINNED, so the native runtime cannot fabricate an exact-media
 * PASS.
 */
export function resolveMomentMediaBinding(
  media: { src: string; type: string } | null,
): MediaBindingStatus | null {
  if (!media) return null;
  if (media.src.includes("placeholder")) return "DEMO_FIXTURE";
  return "SOURCE_REFERENCE_ONLY";
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
