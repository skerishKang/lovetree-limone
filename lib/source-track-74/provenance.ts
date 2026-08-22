/**
 * Source Track 74 — 오빗모프_러브트리_템플릿포털_V1 (Orbit Morph Template Portal)
 * Pinned source identity. Every constant here comes from the gate registration
 * (Issue #314, PR #342 merged commit 0596e40c) and its preserved tree:
 *   reference/source-track-74-orbitmorph-portal/
 * Nothing may drift without a new explicit owner decision.
 *
 * SOURCE TRACK 74 is NOT a repository Design Lineage. No lineage number is
 * reserved by this track (classification: REFERENCE_CAPABILITY_ONLY).
 * Implementation release authority: Issue #344 owner decision 1 (Option A).
 */

export const SOURCE_TRACK_74_ID = "Track74" as const;
export const SOURCE_TRACK_74_REVISION = "V2" as const;
export const SOURCE_TRACK_74_REVISION_LABEL =
  "V2_70경로_고딕타이포_열매트리로고" as const;
export const SOURCE_TRACK_74_TITLE =
  "LoveTree · Orbit Morph Template Portal · Track 74 V2" as const;

export const SOURCE_TRACK_74_DRIVE_FOLDER_ID =
  "1TTr4NWYWzoZ3JP0Owc5K4zo0dVuu5wbr" as const;

/** Preserved read-only tree at reference/source-track-74-orbitmorph-portal/. */
export const SOURCE_TRACK_74_PRESERVED_ROOT =
  "reference/source-track-74-orbitmorph-portal" as const;

/** Both revision executables are committed and pinned by #314. */
export const SOURCE_TRACK_74_EXECUTABLES = Object.freeze([
  Object.freeze({
    revision: "V1",
    file: "V1/index.html",
    bytes: 25_536,
    sha256: "5e4e99b8b50ec7c7f3d363ca8a79d088ae0632385a15f842aa79f4bef1b046fe",
    driveId: "12CNeF8WfzzfF8Qr4KHTwWFUcRDCIp-aN",
  }),
  Object.freeze({
    revision: "V2",
    file: "V2_70경로_고딕타이포_열매트리로고/index.html",
    bytes: 27_012,
    sha256: "fcc7cad6bf0277c0dd304aa8bb2bc5a2f1ae6a9a021fff43c6ad6374b66a0b09",
    driveId: "1yjnAVu8Fuu7MpC1M1SVgf2e-89DPcM9r",
  }),
]);

/** Oversize reference recording — fingerprint-only per the #287 commit cap. */
export const SOURCE_TRACK_74_OVERSIZE_REFERENCE = Object.freeze({
  filename: "74_오빗모프_러브트리_템플릿포털_V1.mp4",
  driveId: "16-FaLOH4_0jAxZuHsG_kNLCQfG_kBE9_",
  bytes: 22_201_260,
  sha256: "dc9e01bfddbb7f1efc58fcb893604dac8d4b566470f671b94ec8912055154bff",
});

/**
 * The two Higgsfield subject images (exact source URLs, preservation item).
 * front = pixel-art pink/violet lily base layer; top = morph-trail reveal layer.
 */
export const SOURCE_TRACK_74_SUBJECT_IMAGES = Object.freeze({
  front:
    "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260808_192942_e1086505-d7da-433b-a59b-8220f4e6c808.png&w=1280&q=85",
  top: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260808_151324_bf318a5f-5525-4fc7-aab5-e9a341018828.png&w=1280&q=85",
});

/** Exact source morph-trail constants (QA contract of 03_V2_QA.md). */
export const SOURCE_TRACK_74_TRAIL_CONSTANTS = Object.freeze({
  TRAIL_MAX_POINTS: 60,
  TRAIL_HEAD_R: 140,
  TRAIL_NOISE_AMP: 44,
  TRAIL_BLOB_PTS: 24,
  TRAIL_FADE_SPEED: 0.92,
  TRAIL_SAMPLE_DIST: 8,
});

/**
 * Logo status: the fruit-tree SVG is an explicit CANDIDATE until the product
 * owner approves a final LoveTree logo (#314 open gate).
 */
export const SOURCE_TRACK_74_LOGO_STATUS =
  "candidate-fruit-tree-v2" as const;

export const SOURCE_TRACK_74_SUPPORT_COPY = Object.freeze({
  left: Object.freeze(["마음이 움직인 순간을,", "놓치지 않고 심습니다."]),
  right: Object.freeze([
    "다음 순간으로 이어진 이유를,",
    "나만의 경로로 남깁니다.",
  ]),
});
