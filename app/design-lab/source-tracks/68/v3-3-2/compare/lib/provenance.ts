/**
 * Source Track 68 — Human Emotional Path Motion Archive V3.3.2
 * Pinned source identity. Every constant here is exact-source evidence from
 * Issue #244 (WEB-4 final source-authority closure comment 5320576836,
 * 2026-08-17T21:40:14Z) and the independently re-verified local Drive mirror.
 * Nothing may drift without a new explicit owner decision.
 *
 * SOURCE TRACK 68 is NOT repository Design Lineage 68. No lineage number is
 * reserved by this track.  REPOSITORY_LINEAGE_68 = NOT_ALLOCATED.
 * CANONICAL_ADOPTION = NO.
 */

export const SOURCE_TRACK_68_ID = "Track68" as const;
export const SOURCE_TRACK_68_REVISION = "V3.3.2" as const;
export const SOURCE_TRACK_68_TITLE =
  "LoveTree · Human Emotional Path Motion Archive" as const;

/** Design-lead lifecycle. */
export const SOURCE_TRACK_68_LIFECYCLE =
  "TRACK_68_V3.3.2_COMPARE_LAUNCHER_A_B_DUAL_VARIANT" as const;

/** Drive root folder 68_인물감정경로_모션아카이브 */
export const SOURCE_TRACK_68_DRIVE_FOLDER_ID =
  "1fv1AjuxstlAzeT3TABVNDmnFRFjvGJSh" as const;

/** V8_LAUNCHER_ENGLISH packaging folder */
export const SOURCE_TRACK_68_V8_DRIVE_FOLDER_ID =
  "1--wlBwQf5OPYkMq1m531I0vLvf03Mj5L" as const;

/** images folder */
export const SOURCE_TRACK_68_IMAGES_DRIVE_FOLDER_ID =
  "1SImONyiSMzFvAoG0BGOeaV5_hRct-7ho" as const;

/** video folder */
export const SOURCE_TRACK_68_VIDEO_DRIVE_FOLDER_ID =
  "1aSbWqBt5IIYm5xrHe16B0NMWMqW-Kp-B" as const;

// ─────────────────────────────────────────────────────────────────────────
//  AUTHORITATIVE EXECUTABLE — V3.3.2 COMPARE LAUNCHER
// ─────────────────────────────────────────────────────────────────────────

export const SOURCE_TRACK_68_LAUNCHER = Object.freeze({
  filename: "68_V3.3.2_COMPARE_LAUNCHER_ENGLISH.html",
  driveId: "1J7VtN8ixGYO3Ddd33oVxoFBPuFNZ8ymf",
  bytes: 2_670,
  sha256:
    "31637f6ffd49a280cded499e6c1a65fda79f0647561bdfd83d4696332129d8c8",
  role: "compare-launcher-display-packaging" as const,
  assetPath:
    "/design-lab-assets/source-tracks/68/v3-3-2/compare/html/68_V3.3.2_COMPARE_LAUNCHER_ENGLISH.html",
});

// ─────────────────────────────────────────────────────────────────────────
//  FUNCTIONAL CANDIDATE A — V3.3.1A 신비혼혈형 (MYSTIC / MIXED)
// ─────────────────────────────────────────────────────────────────────────

export const SOURCE_TRACK_68_VARIANT_A = Object.freeze({
  label: "A" as const,
  variantName: "MYSTIC / MIXED" as const,
  filename: "68_V3.3.1A_신비혼혈형_CODEX_PORTALS_C14FIX.html",
  driveId: "1zfYWmgV5xdmP6Gjo1rMOdYv9PJG316ph",
  bytes: 18_565,
  sha256:
    "9daa5f7690c6a95d5c5e75fc16b5d950533921d9f41ec008053fa4c79d566c42",
  role: "functional-candidate-variant" as const,
  assetPath:
    "/design-lab-assets/source-tracks/68/v3-3-2/compare/html/68_V3.3.1A_신비혼혈형_CODEX_PORTALS_C14FIX.html",
});

// ─────────────────────────────────────────────────────────────────────────
//  FUNCTIONAL CANDIDATE B — V3.3.1B 동양인형 (EAST ASIAN)
// ─────────────────────────────────────────────────────────────────────────

export const SOURCE_TRACK_68_VARIANT_B = Object.freeze({
  label: "B" as const,
  variantName: "EAST ASIAN" as const,
  filename: "68_V3.3.1B_동양인형_CODEX_PORTALS_C14FIX.html",
  driveId: "1_xOVvvz1DdV0MFCkfQwqsJZUrkFTUrjb",
  bytes: 18_646,
  sha256:
    "cb5553d399a728cd28422f8112f6cc59c185de68b522aa431e9d3bb1f4275004",
  role: "functional-candidate-variant" as const,
  assetPath:
    "/design-lab-assets/source-tracks/68/v3-3-2/compare/html/68_V3.3.1B_동양인형_CODEX_PORTALS_C14FIX.html",
});

// ─────────────────────────────────────────────────────────────────────────
//  A/B SEMANTIC IDENTITY
// ─────────────────────────────────────────────────────────────────────────

/**
 * Direct A↔B byte diff proves only two difference classes:
 *  1. document <title> marker V3.3A vs V3.3B
 *  2. the 9 archive image references (01.png..09.png vs 동양인01.png..동양인09.png)
 * Everything else is byte-identical: product flow, portal mapping, hero URLs,
 * CSS, animation, keyboard behavior, copy.
 *
 * A_B_PRODUCT_SEMANTICS = IDENTICAL.
 * SELECTED_VARIANT = UNRESOLVED — both must remain available.
 */
export const SOURCE_TRACK_68_A_B_SEMANTICS = Object.freeze({
  semantics: "IDENTICAL" as const,
  diffClasses: Object.freeze([
    "document title A/B marker",
    "9 archive image paths (01.png..09.png vs 동양인01.png..동양인09.png)",
  ]),
  selectedVariant: "UNRESOLVED" as const,
});

// ─────────────────────────────────────────────────────────────────────────
//  RUNTIME ARCHIVE IMAGES — A (01.png … 09.png)
// ─────────────────────────────────────────────────────────────────────────

export const SOURCE_TRACK_68_IMAGES_A = Object.freeze([
  Object.freeze({ filename: "01.png", driveId: "1MdOA-xwTffQOqayNacMBqGsyQSXEp2x8", bytes: 1_864_548, sha256: "9471f5dee67354e48d8495ab4572b6aca693d896de64567b7c9530b3d33907fc" }),
  Object.freeze({ filename: "02.png", driveId: "1ao_jcS4Z5AWtmp12gAmmj0FdP0Da8vqZ", bytes: 2_031_825, sha256: "5e35a017293e98d9f5bff4fefa8733ac4af8b555408274540a15375084f27c81" }),
  Object.freeze({ filename: "03.png", driveId: "15bUEnmZflpro3WdpdyEb0Dh4uzM99za3", bytes: 1_860_675, sha256: "9d52f8f58110274143dcb1e9b0726a2b74677fb00bbbcb9f714cf02a19be4936" }),
  Object.freeze({ filename: "04.png", driveId: "1IziJSecq5xHGWvcrHRY7tyobtWjWtH-3", bytes: 1_842_341, sha256: "816df9ea5689ccbe1126d1ae08379710280ba7a4f4c977be8e6929f6d1071221" }),
  Object.freeze({ filename: "05.png", driveId: "1uPz1PUXhSeOHDUx7LWHEf82yBW9IkZfT", bytes: 1_459_649, sha256: "78493b5fa6caa5697d489048133330d01b4ad748c2af751751581b5cbab2cc5e" }),
  Object.freeze({ filename: "06.png", driveId: "1zTYABeNj-N-HgNws2s6nyQVx0IQz1nc-", bytes: 1_734_205, sha256: "fb46e4bf7b155648b26b1e898949c6d60e9957b9724a8c7f93372188ac02e699" }),
  Object.freeze({ filename: "07.png", driveId: "1D6ifA3iW7TN3BZH5MM9EV4QqYh4UWLXv", bytes: 1_773_216, sha256: "90778997f43589132ade524d9a2965314330989d9e88e8d5e8a73f7d7f2faefa" }),
  Object.freeze({ filename: "08.png", driveId: "1xblKgU7TmK16Qvhg2SBZkbRguGuueteN", bytes: 1_908_180, sha256: "0626c2b6ea5240cc022a3769a14c3dd632334c1ccd5f0b622dd8b8298cce43d6" }),
  Object.freeze({ filename: "09.png", driveId: "1Y5DDy1cXSdm14gaXBkrxIIptZGDxrClT", bytes: 1_715_727, sha256: "49696b6485e17eb08e07c3c5fda10ae3e7014940b8c2baf66ed58b3ae093c0e9" }),
]);

// ─────────────────────────────────────────────────────────────────────────
//  RUNTIME ARCHIVE IMAGES — B (동양인01.png … 동양인09.png)
// ─────────────────────────────────────────────────────────────────────────

export const SOURCE_TRACK_68_IMAGES_B = Object.freeze([
  Object.freeze({ filename: "동양인01.png", driveId: "1T5YXnVMMqLOsxFdUHT-UH-7OcW4XcDj0", bytes: 1_813_828, sha256: "5bc21565a6367be631e25012e54c71de74cf459c0495a4f6f397a18a1c8fc715" }),
  Object.freeze({ filename: "동양인02.png", driveId: "17Psq1S3N-mqx2tw8fe_c3wnLAqK0zGLK", bytes: 1_871_481, sha256: "eabfa7d9e4d0fe6ce7f7caeab6fa23ef8a8b83c511f960e2ca23baa699a38d94" }),
  Object.freeze({ filename: "동양인03.png", driveId: "1NqWyiEbuvMTR-4anAtzDDwXQ-AqAQRyw", bytes: 2_035_128, sha256: "b65cbcc1b1b15d1993bd8b87ed482dd6590e9cd84816e5cee146784435b85e6b" }),
  Object.freeze({ filename: "동양인04.png", driveId: "1qNKw3uI0ne0qaJOZ0gmVS6BR7SRM6fgj", bytes: 1_478_799, sha256: "0e92bf16b68660ac93fdebf455bd01e1281c3e01f713be018dd84c78b70a57a6" }),
  Object.freeze({ filename: "동양인05.png", driveId: "1aThpTbhjbtZRksx0xIamuBlvBeMVQDgJ_", bytes: 1_715_876, sha256: "6925327b7fa8722dc79c8b831ad566fb9299deb36c285450e029b94962d65e44" }),
  Object.freeze({ filename: "동양인06.png", driveId: "1hb8p2NUk17G1XGrJm_3VE9bcGyuQF6Bx", bytes: 2_074_268, sha256: "cae1b06cde3c94a5ae778a718dabc169a51d2deac3c5e1cef56d30f34a7adf87" }),
  Object.freeze({ filename: "동양인07.png", driveId: "1QyqE4_Y03NEhDhCt-e2dzqHirQpObEPy", bytes: 1_843_218, sha256: "843b7417df49ee6c5b7ecb49ab54aec9038563740f3602a1d48fa19ec8221fd3" }),
  Object.freeze({ filename: "동양인08.png", driveId: "1rzbjwupfee6JkJp5NDSEbK0arJVcSWNR", bytes: 1_777_216, sha256: "2d2f7151e4ebf6154b2f543a73537c95693735d90daf60062e67162548c95024" }),
  Object.freeze({ filename: "동양인09.png", driveId: "1BhbSzxlclleMmZnw2tPsKHxnyhGIfuVS", bytes: 1_792_944, sha256: "4529a55ec3996856afb71f91f630de7590763578bf342d2cbee5ba9f07a3b7df" }),
]);

// ─────────────────────────────────────────────────────────────────────────
//  LOCAL HERO COMPANION VIDEOS (authoritative local bytes, NOT CloudFront)
// ─────────────────────────────────────────────────────────────────────────

/**
 * The frozen source HTML references two CloudFront MP4 URLs. Per
 * IMPLEMENTATION_MEDIA_POLICY:
 *   - DIRECT_CLOUDFRONT_HOTLINK = NOT AUTHORIZED
 *   - Runtime must use local companion assets
 *
 * These local MP4s are derived from the Drive hero_left/right companions.
 * CLOUDFRONT_BYTE_EQUIVALENCE = HOLD (we do not claim local == remote bytes).
 *
 * The host bridge replaces the source-embedded CloudFront URLs with these
 * local paths at runtime WITHOUT modifying the frozen source HTML bytes.
 */
export const SOURCE_TRACK_68_HERO_LEFT = Object.freeze({
  filename: "hero_left.mp4",
  driveId: "1rX1jnSKISOlPzLND5Ve63l910S9IX_w-",
  bytes: 2_485_522,
  sha256: "2b898552691e6562c255ed18fd318979134eec4c7005647336e3390187a1cb59",
  mediaFacts: "H264, 1920×1080, 25fps, 4.4s" as const,
  assetPath: "/design-lab-assets/source-tracks/68/v3-3-2/compare/video/hero_left.mp4",
  transport: "REPO_LOCAL_COMPANION" as const,
  cloudfrontUrl:
    "https://d8j0ntlcm91z4.cloudfront.net/user_39ca84eAE1ODL9hbR5VhoEj8tBf/hf_20260625_154433_532a85d3-dabf-4265-b8bd-19ac6af31842.mp4",
  cloudfrontByteEquivalence: "HOLD" as const,
});

export const SOURCE_TRACK_68_HERO_RIGHT = Object.freeze({
  filename: "hero_right.mp4",
  driveId: "112B5IvUs_6zaquqgLohuH0yfs1RvIDRD",
  bytes: 2_265_192,
  sha256: "e70bbeea35a13c55f92942f1dbd8d2fcc097921b33def0bec3fafa2eedb65500",
  mediaFacts: "H264, 1920×1080, 25fps, 4.4s" as const,
  assetPath: "/design-lab-assets/source-tracks/68/v3-3-2/compare/video/hero_right.mp4",
  transport: "REPO_LOCAL_COMPANION" as const,
  cloudfrontUrl:
    "https://d8j0ntlcm91z4.cloudfront.net/user_39ca84eAE1ODL9hbR5VhoEj8tBf/hf_20260625_154401_a664f076-b971-4557-8728-40ef9ea4c49b.mp4",
  cloudfrontByteEquivalence: "HOLD" as const,
});

// ─────────────────────────────────────────────────────────────────────────
//  FAIL-CLOSED PORTAL ROUTE LEDGER
// ─────────────────────────────────────────────────────────────────────────

export type PortalRouteStatus =
  | "DESIGN_LAB_TARGET"
  | "STABLE_REPO_TARGET"
  | "HOLD_UNRESOLVED";

export interface PortalEntry {
  readonly sourceTargetId: string;
  readonly sourceLabel: string;
  readonly sourceMeaning: string;
  readonly sourceLocalPath: string;
  readonly resolvedRepositoryTargetId: string | null;
  readonly resolvedRepositoryRoute: string | null;
  readonly routeStatus: PortalRouteStatus;
  readonly handoffContext: string;
}

/**
 * Fresh current-main portal ledger for Track68 V3.3.2.
 *
 * Rule: source-local filesystem paths are NEVER copied as repository hrefs.
 * Numeric source Track IDs are NEVER converted to Repository Lineage IDs.
 * A current Design Lab route is accepted only where the corresponding page
 * exists on current main. Open/unmerged PR routes are NOT treated as
 * current-main targets.
 *
 * Fresh verification (2026-08-19) against current main 038e58f:
 *   67  → /design-lab/lineages/67/v2-4/source  ✓ EXISTS
 *   C12 → /design-lab/source-families/living-media-sphere/v3/source  ✓ EXISTS
 *   C09 → /design-lab/lineages/54/v4  ✓ EXISTS
 *   C08 → /design-lab/lineages/56/v3  ✓ EXISTS
 *   65, C14, C13, C11, C10 → HOLD_UNRESOLVED (no current-main target)
 *
 * C12 was previously HOLD in interim #244 ledger; fresh current-main check
 * found the Living Media Sphere source-family route exists on main. Per #242,
 * Living Media Sphere is an independent family — this is a DESIGN_LAB_TARGET,
 * not canonical adoption.
 */
export const SOURCE_TRACK_68_PORTAL_LEDGER: readonly PortalEntry[] = Object.freeze([
  Object.freeze({
    sourceTargetId: "67",
    sourceLabel: "MEMORY TAPE",
    sourceMeaning: "Persistent Ribbon World",
    sourceLocalPath: "../../67_메모리테이프_인터랙티브롤/track67_v2.4.2_works_compare_menu.html",
    resolvedRepositoryTargetId: "Track67 V2.4.2 source",
    resolvedRepositoryRoute: "/design-lab/lineages/67/v2-4/source",
    routeStatus: "DESIGN_LAB_TARGET",
    handoffContext: "Current main contains Track67 V2.4.2 exact-source route. Source-to-source portal handoff; not native by inference.",
  }),
  Object.freeze({
    sourceTargetId: "65",
    sourceLabel: "FIRST CLUE · V18",
    sourceMeaning: "H3 Extended Motion Editing",
    sourceLocalPath: "../../65_입덕단서_시네마틱에디토리얼/V18_디자인팀장15기_H3_EXTENDED_MOTION_EDITING_후보_선택/★_현재후보_65_V2.2.5_H3_EXTENDED_MOTION_EDITING_CINEMATIC.html",
    resolvedRepositoryTargetId: null,
    resolvedRepositoryRoute: null,
    routeStatus: "HOLD_UNRESOLVED",
    handoffContext: "No current-main Lineage65 or source-track route. #236 remains a source/design gate.",
  }),
  Object.freeze({
    sourceTargetId: "C14",
    sourceLabel: "ROTATING MEMORY INDEX",
    sourceMeaning: "Codex 14 · Rotating Memory Index",
    sourceLocalPath: "../../../../코덱스/14_러브트리_로테이팅메모리인덱스_V1/v2/개발본.html",
    resolvedRepositoryTargetId: null,
    resolvedRepositoryRoute: null,
    routeStatus: "HOLD_UNRESOLVED",
    handoffContext: "V7 corrected the source-local path to v2/개발본.html (where adjacent assets/ live). No current-main repo target.",
  }),
  Object.freeze({
    sourceTargetId: "C13",
    sourceLabel: "LIQUID GLASS VIDEO WALL",
    sourceMeaning: "Codex 13 · Infinite Video Wall",
    sourceLocalPath: "../../../../코덱스/13_러브트리_리퀴드글라스_인피니트비디오월_V1/최종본.html",
    resolvedRepositoryTargetId: null,
    resolvedRepositoryRoute: null,
    routeStatus: "HOLD_UNRESOLVED",
    handoffContext: "No current-main repo target/route authority found.",
  }),
  Object.freeze({
    sourceTargetId: "C12",
    sourceLabel: "LIVING MEDIA SPHERE",
    sourceMeaning: "Codex 12 · Interactive Front Door",
    sourceLocalPath: "../../../../코덱스/12_러브트리_리빙미디어스피어_인터랙티브대문_V1/최종본.html",
    resolvedRepositoryTargetId: "Living Media Sphere V3 source family",
    resolvedRepositoryRoute: "/design-lab/source-families/living-media-sphere/v3/source",
    routeStatus: "DESIGN_LAB_TARGET",
    handoffContext: "Fresh current-main check (2026-08-19) found the LMS source-family route exists. Per #242, LMS is an independent family — DESIGN_LAB_TARGET only, not canonical adoption.",
  }),
  Object.freeze({
    sourceTargetId: "C11",
    sourceLabel: "MOONLIGHT FLOWER JOURNEY",
    sourceMeaning: "Codex 11 · Living Flower Video Moment",
    sourceLocalPath: "../../../../코덱스/11_러브트리_달빛꽃_감정여정_V2/V10_생명꽃_영상모먼트_러브트리대문/최종본_V10_생명꽃_영상모먼트_러브트리대문.html",
    resolvedRepositoryTargetId: null,
    resolvedRepositoryRoute: null,
    routeStatus: "HOLD_UNRESOLVED",
    handoffContext: "No exact current-main target proven. Moonlit/flower family evidence exists in #134 but no merged route.",
  }),
  Object.freeze({
    sourceTargetId: "C10",
    sourceLabel: "IDOL VIDEO ORBIT",
    sourceMeaning: "Codex 10 · Video Orbit Carousel",
    sourceLocalPath: "../../../../코덱스/10_러브트리_최애아이돌_영상오빗캐러셀_V1/최종본.html",
    resolvedRepositoryTargetId: null,
    resolvedRepositoryRoute: null,
    routeStatus: "HOLD_UNRESOLVED",
    handoffContext: "PR #139 was a Design Lab capability candidate, closed unmerged. Current main has no matching route.",
  }),
  Object.freeze({
    sourceTargetId: "C09",
    sourceLabel: "PETAL CAR JOURNEY",
    sourceMeaning: "Codex 09 · Retro Future Emotion Journey",
    sourceLocalPath: "../../../../코덱스/09_러브트리_꽃잎자동차_감정여정_V4/최종본.html",
    resolvedRepositoryTargetId: "Lineage54 Petal Runner Love Journey V4",
    resolvedRepositoryRoute: "/design-lab/lineages/54/v4",
    routeStatus: "DESIGN_LAB_TARGET",
    handoffContext: "#129 establishes Petal Runner Love Journey V4. Current main contains app/design-lab/lineages/54/v4/page.tsx.",
  }),
  Object.freeze({
    sourceTargetId: "C08",
    sourceLabel: "CRYSTAL MEMORY ATELIER",
    sourceMeaning: "Codex 08 · Crystal Memory Atelier V3",
    sourceLocalPath: "../../../../코덱스/08_러브트리_크리스털기억_아틀리에_V3/최종본.html",
    resolvedRepositoryTargetId: "Lineage56 Crystal Memory Atelier V3",
    resolvedRepositoryRoute: "/design-lab/lineages/56/v3",
    routeStatus: "DESIGN_LAB_TARGET",
    handoffContext: "#137 identifies this candidate. Current main contains app/design-lab/lineages/56/v3/page.tsx.",
  }),
] as const);

export const SOURCE_TRACK_68_PORTAL_COUNTS = Object.freeze({
  total: 9,
  designLabTarget: 4,
  stableRepoTarget: 0,
  holdUnresolved: 5,
} as const);

// ─────────────────────────────────────────────────────────────────────────
//  RUNNER ROUTE CONFIG
// ─────────────────────────────────────────────────────────────────────────

export const SOURCE_TRACK_68_COMPARE_RUNNER = Object.freeze({
  compareRoute: "/design-lab/source-tracks/68/v3-3-2/compare",
  sourceAssetBase: "/design-lab-assets/source-tracks/68/v3-3-2/compare",
  launcherAssetPath: SOURCE_TRACK_68_LAUNCHER.assetPath,
  variantAAssetPath: SOURCE_TRACK_68_VARIANT_A.assetPath,
  variantBAssetPath: SOURCE_TRACK_68_VARIANT_B.assetPath,
});

// ─────────────────────────────────────────────────────────────────────────
//  SOURCE DEFECTS (recorded, not reproduced as PASS)
// ─────────────────────────────────────────────────────────────────────────

export const SOURCE_TRACK_68_SOURCE_DEFECTS = Object.freeze([
  "External transport fragility: frozen HTML hotlinks two CloudFront MP4s despite local Track68 hero companions being present. Host bridge replaces these with local companions.",
  "Reduced-motion incompleteness: CSS forces cards visible / removes panel transition / hides cursor, but JS continuous requestAnimationFrame loops remain active and coarse-pointer mode still auto-plays alternating videos. Host bridge pauses RAF when prefers-reduced-motion is active.",
  "Works overlay dialog semantics incomplete: source lacks role=dialog, aria-modal, focus containment/background inert. Host bridge adds these.",
  "Works rows lack interactive semantics: non-current rows are focusable divs with keyboard activation but no button/link role. Host bridge adds role=button.",
  "Filesystem navigation is non-portable: window.open(new URL(relativePath, location.href)) resolves source-local paths. Host bridge intercepts window.open and routes through the fail-closed repository portal ledger.",
  "Document language metadata mismatch: A/B declare <html lang=\"ko\"> while the primary interface/body copy is substantially English.",
  "Reduced-motion desktop cursor visibility: base .scroll-spacer uses cursor:none; the reduced-motion media query hides the custom .cursor. At a desktop/fine-pointer reduced-motion viewport this can leave no visible pointer cursor.",
] as const);

// ─────────────────────────────────────────────────────────────────────────
//  EXTERNAL MEDIA LEDGER
// ─────────────────────────────────────────────────────────────────────────

export const SOURCE_TRACK_68_EXTERNAL_MEDIA = Object.freeze({
  cloudfrontLeft: SOURCE_TRACK_68_HERO_LEFT.cloudfrontUrl,
  cloudfrontRight: SOURCE_TRACK_68_HERO_RIGHT.cloudfrontUrl,
  googleFontStylesheet: "fonts.googleapis.com / Inter Tight 500,600",
  googleFontOrigin: "fonts.gstatic.com",
  youtube: "NONE" as const,
  iframe: "NONE" as const,
  externalJs: "NONE" as const,
  fetchXhr: "NONE" as const,
  audioElement: "NONE" as const,
  heroVideoAudio: "MUTED" as const,
  cloudfrontByteEquivalence: "HOLD" as const,
  directCloudfrontHotlink: "NOT_AUTHORIZED" as const,
} as const);
