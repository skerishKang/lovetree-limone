/**
 * Source Track 74 V2 — route normalization.
 *
 * The source HTML story menu navigates to Drive-local sibling HTML files,
 * resolvable only under `file://`. Those paths are NOT product route
 * authority. Every source menu target is re-audited against the repository
 * at main 0f4b53a (fresh-fetched at implementation) and classified exactly:
 *
 * - STABLE_REPO_TARGET  — canonical product route that exists on main
 * - DESIGN_LAB_TARGET   — design-lab candidate/capability route on main
 * - HOLD_UNRESOLVED     — no repo route (or the owning implementation is
 *                         itself queued/HOLD) → UI presents it as
 *                         disabled / review-pending; NEVER a fabricated href
 *
 * Repo Lineage numbers are NOT Drive folder track numbers (precedent:
 * lib/source-track-47/route-map.ts). Per #344 owner decision, Track 70
 * (repository Lineage 49, lt-49-moment-reveal-portal) is implementation-queued
 * but NOT implemented, so it stays HOLD.
 */

export const ROUTE_CLASSIFICATIONS = Object.freeze([
  "STABLE_REPO_TARGET",
  "DESIGN_LAB_TARGET",
  "HOLD_UNRESOLVED",
] as const);
export type RouteClassification = (typeof ROUTE_CLASSIFICATIONS)[number];

export type RouteGroupId = "browse" | "mytree" | "story" | "guide";

export interface NormalizedRoute {
  key: string;
  group: RouteGroupId;
  /** Source menu display text (exact). */
  label: string;
  /** Source-local relative path — evidence only, never a product href. */
  sourceLocalPath: string;
  classification: RouteClassification;
  /** Live repo href; present only for DESIGN_LAB_TARGET / STABLE_REPO_TARGET. */
  repoRoute?: string;
  /** Why the classification holds (auditable evidence). */
  note: string;
}

export const SOURCE_TRACK_74_ROUTE_GROUPS: readonly {
  id: RouteGroupId;
  label: string;
}[] = Object.freeze([
  { id: "browse", label: "둘러보기" },
  { id: "mytree", label: "내 러브트리" },
  { id: "story", label: "이야기" },
  { id: "guide", label: "가이드" },
]);

export const SOURCE_TRACK_74_ROUTES: readonly NormalizedRoute[] = Object.freeze([
  {
    key: "t62-circular-exhibition-rail",
    group: "browse",
    label: "62 · 기억조각상 원형 레일",
    sourceLocalPath:
      "../../62_기억조각상_원형레일전시/62_기억조각상_원형레일전시.html",
    classification: "DESIGN_LAB_TARGET",
    repoRoute: "/design-lab/capabilities/continuous-exhibition-rail",
    note: "Track 62 V1.1 Continuous Exhibition Rail capability proof on main; exact 62 source page not in repo.",
  },
  {
    key: "t12-1-living-media-sphere",
    group: "browse",
    label: "12-1 · 리빙 미디어 스피어 I",
    sourceLocalPath:
      "../../../../코덱스/12-1_러브트리_리빙미디어스피어_인터랙티브대문_V1/최종본.html",
    classification: "DESIGN_LAB_TARGET",
    repoRoute: "/design-lab/source-families/living-media-sphere/v3/source",
    note: "Living Media Sphere family on main holds the V3 Phase-1 source runner (#242); 12-1 V1 exact page not in repo.",
  },
  {
    key: "t35-lp-moment-player",
    group: "mytree",
    label: "35 · LP 모먼트 플레이어",
    sourceLocalPath: "../../35_LP플레이어/01_LP플레이어_영상기억.html",
    classification: "HOLD_UNRESOLVED",
    note: "No repository route for the Track 35 LP moment player at main 0f4b53a.",
  },
  {
    key: "t39-lp-coverflow-gallery",
    group: "mytree",
    label: "39 · LP 커버플로우 갤러리",
    sourceLocalPath:
      "../../39_LP커버플로우_미디어갤러리/01_LP커버플로우_영상갤러리.html",
    classification: "HOLD_UNRESOLVED",
    note: "No repository route for the Track 39 LP coverflow gallery at main 0f4b53a.",
  },
  {
    key: "t58-living-memory-pinboard",
    group: "mytree",
    label: "58 · 리빙 메모리 핀보드",
    sourceLocalPath:
      "../../58_리빙메모리_핀보드_시네마틱/★_최종_58_리빙메모리_핀보드.html",
    classification: "HOLD_UNRESOLVED",
    note: "Repository Lineage 58 is lt-58-videofigure-atelier, not the Living Memory Pinboard (Track 47 route-map precedent); pinboard has no repo route.",
  },
  {
    key: "t14-rotating-memory-index",
    group: "mytree",
    label: "14 · 로테이팅 메모리 인덱스",
    sourceLocalPath:
      "../../../../코덱스/14_러브트리_로테이팅메모리인덱스_V1/v2/개발본.html",
    classification: "HOLD_UNRESOLVED",
    note: "No repository route for the Track 14 rotating memory index at main 0f4b53a.",
  },
  {
    key: "t43-memory-scene-recipe",
    group: "story",
    label: "43 · 기억 장면 레시피",
    sourceLocalPath:
      "../../43_기억장면_레시피도구/01_기억장면_레시피도구.html",
    classification: "HOLD_UNRESOLVED",
    note: "No repository route for the Track 43 memory scene recipe tool at main 0f4b53a.",
  },
  {
    key: "t70-moment-reveal-editorial",
    group: "story",
    label: "70 · 모먼트 리빌 에디토리얼",
    sourceLocalPath:
      "../../70_모먼트리빌_퓨처에디토리얼/선택1-70_V2.1_LOVETREE_PORTAL_NAV_RETURN_FIX.html",
    classification: "HOLD_UNRESOLVED",
    note: "Repository Lineage 49 (lt-49-moment-reveal-portal) is approved-plan only; #344 decision 6 queues implementation but it is not implemented at main 0f4b53a.",
  },
  {
    key: "t15-memory-biosphere",
    group: "guide",
    label: "15 · 메모리 바이오스피어",
    sourceLocalPath:
      "../../../../코덱스/15_러브트리_메모리바이오스피어_인터랙티브대문_V1/버전2/최종본.html",
    classification: "HOLD_UNRESOLVED",
    note: "No repository route for the Track 15 memory biosphere at main 0f4b53a.",
  },
  {
    key: "t64-first-moment-planting",
    group: "guide",
    label: "64 · 첫 순간 심기",
    sourceLocalPath:
      "../../64_부유모먼트_웰컴오빗_입장포털O/현재후보.html",
    classification: "DESIGN_LAB_TARGET",
    repoRoute: "/design-lab/lineages/64/v1-2-1",
    note: "Repository Lineage 64 (lt-64-floating-moment-entry-portal) V1.2.1 candidate route on main; canonical /v4 adoption HOLD.",
  },
]);

/** The secure pill and the guide menu item share the Track 64 target. */
export const SOURCE_TRACK_74_PILL_ROUTE = SOURCE_TRACK_74_ROUTES.find(
  (route) => route.key === "t64-first-moment-planting",
) as NormalizedRoute;

export function routesForGroup(group: RouteGroupId): readonly NormalizedRoute[] {
  return SOURCE_TRACK_74_ROUTES.filter((route) => route.group === group);
}
