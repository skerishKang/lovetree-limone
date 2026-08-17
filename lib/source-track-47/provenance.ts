/**
 * Source Track 47 — Cinematic Front Door V4.2.5 (PINNED NAV MENU FIX)
 * Pinned source identity. Every constant here is exact-source evidence from
 * Issue #234 (Web CTO implementation release comment 5306350808) and the
 * independently re-verified local Drive mirror; nothing may drift without a
 * new explicit owner decision.
 *
 * SOURCE TRACK 47 is NOT repository Design Lineage 47. No lineage number is
 * reserved by this track (classification: REFERENCE_CAPABILITY_ONLY).
 */

export const SOURCE_TRACK_47_ID = "Track47" as const;
export const SOURCE_TRACK_47_REVISION = "V4.2.5" as const;
export const SOURCE_TRACK_47_TITLE =
  "LoveTree · Cinematic Front Door V4.2.5 · Pinned Navigation Menu Fix" as const;

/** Design-lead lifecycle recorded in V4.2.4→V4.2.5_변경설명.md / 검증결과.json. */
export const SOURCE_TRACK_47_LIFECYCLE =
  "TRACK_47_V4.2.5_PINNED_NAV_MENU_FIX_CANDIDATE_FOR_OWNER_REVIEW" as const;

/** Drive folder 12_V4.2.5_CINEMATIC_FRONTDOOR·PINNED_NAV_MENU_FIX_후보 */
export const SOURCE_TRACK_47_DRIVE_FOLDER_ID =
  "1cQLZEA2auL2qaab9rP-0TjhcrFXC1m5m" as const;

/**
 * The two observed V4.2.5 HTML objects are byte-identical (Web CTO binary
 * comparison, re-verified at intake). They are ONE revision — never treat
 * them as two.
 */
export const SOURCE_TRACK_47_HTML = Object.freeze({
  bytes: 40_890,
  sha256: "676f5220ec4e4c8c1b15c36eaeb6a2ee4320ecceb7e413b15eee585e8ed9a596",
  variants: Object.freeze([
    Object.freeze({
      label: "현재후보.html",
      driveId: "1aONTs8UGsz0Kzs3rpwhAhEPFyu1vo1Z7",
    }),
    Object.freeze({
      label: "최종선택-12_V4.2.5_CINEMATIC_FRONTDOOR·PINNED_NAV_MENU_FIX_후보.html",
      driveId: "18tZB-eTCz6aeceNlbhXN3iEnfD1N442X",
    }),
  ]),
  byteIdentical: true,
});

/** Poster exact asset — transported into the repository (PINNED). */
export const SOURCE_TRACK_47_POSTER = Object.freeze({
  filename: "poster-act01.jpg",
  driveId: "1jQ6A4RX933xPik9HKZmoyU55d969Xwg0",
  bytes: 187_679,
  sha256: "1056d9b89d49818dc43593c35b33648423d10aa340d3a69412bb88b71dcd8fdd",
  assetPath: "/design-lab-assets/source-tracks/47/v4-2-5/assets/poster-act01.jpg",
  transport: "REPO_PIN_ALLOWED" as const,
  assetState: "PINNED_EXACT" as const,
});

/**
 * Video exact asset — NOT transported into the repository (truthful HOLD).
 *
 * REPO_PIN_NOT_APPROPRIATE evidence:
 * - 28,650,099 bytes exceeds the Cloudflare Workers static-asset per-file
 *   limit (25 MiB) for `dist/client`, so a commit would fail the guarded
 *   `main → Production` auto-deploy gate fail-closed.
 * - Repository precedent: the Track62 V1.1 22,264,995-byte reference video
 *   is recorded as manifest REFERENCE_ONLY, never committed (largest blob in
 *   git history is 2,703,222 bytes).
 * - No substitute video may be used; video-fidelity PASS is not claimable
 *   from structure/poster alone.
 */
export const SOURCE_TRACK_47_VIDEO = Object.freeze({
  filename: "Track47_V4.2_Cinematic_DirectorCut_v2.1_CLEAN_1920x1080.mp4",
  driveId: "1dRmVkiHrV-dGJ4XNA4mp9ftKP5ozqRGT",
  bytes: 28_650_099,
  sha256: "28951ccb76923e0dfbbb60e7757ab2f6fa379e405731a386fa03b05a32a227ce",
  transport: "REPO_PIN_NOT_APPROPRIATE" as const,
  assetState: "VIDEO_EXACT_ASSET_HOLD" as const,
  /**
   * Declared target path — intentionally NOT transported. The native candidate
   * points <video> here so the element's own error → poster-fallback path is
   * the source-faithful missing-asset behavior; serving anything else at this
   * path (e.g. a substitute video) is forbidden.
   */
  videoAssetPath:
    "/design-lab-assets/source-tracks/47/v4-2-5/assets/Track47_V4.2_Cinematic_DirectorCut_v2.1_CLEAN_1920x1080.mp4",
  holdReason:
    "28,650,099 bytes exceeds the Cloudflare Workers 25 MiB static-asset per-file limit and repository binary precedent (Track62 reference video stays REFERENCE_ONLY); the exact video is never substituted",
});

/** Served exact source HTML (byte-identical to both Drive objects). */
export const SOURCE_TRACK_47_SOURCE_RUNNER = Object.freeze({
  runnerRoute: "/design-lab/source-tracks/47/v4-2-5/source",
  nativeRoute: "/design-lab/source-tracks/47/v4-2-5/native",
  sourceAssetPath: "/design-lab-assets/source-tracks/47/v4-2-5/index.html",
  label: "SOURCE TRACK 47 · V4.2.5 · SOURCE RUNNER — NOT CANONICAL PRODUCT",
});

/** Owner route-map supporting file (Drive 1Occ4lE04Zp6iqEUwU-RL_ItE1kXE2D5h). */
export const SOURCE_TRACK_47_ROUTE_MAP_AUTHORITY =
  "PRODUCT_OWNER_LATEST_EXPLICIT_SELECTION_2026-08-15" as const;
