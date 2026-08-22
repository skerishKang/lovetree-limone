/**
 * Source Track 47 V4.2.5 — route normalization.
 *
 * The source HTML navigates to Drive-local sibling HTML (`../../57_...html`,
 * resolvable only under `file://`). Those paths are NOT product route
 * authority. Every source route is re-audited here against the repository at
 * main 21a3992 (fresh-fetched at implementation) and classified exactly:
 *
 * - STABLE_REPO_TARGET  — canonical product route that exists on main
 * - DESIGN_LAB_TARGET   — design-lab candidate route that exists on main
 * - HOLD_UNRESOLVED     — no repo route (or implementation is itself on
 *                         HOLD, e.g. PR #191) → UI must present it as
 *                         disabled / review-pending; NEVER a fabricated href
 *
 * Repo Lineage numbers are NOT Drive folder track numbers: repository
 * Lineage 57 is lt-57-living-character-world (not Living Glass Cards) and
 * Lineage 58 is lt-58-videofigure-atelier (not the Living Memory Pinboard),
 * so moment57/moment58 stay HOLD despite lineage routes 57/58 existing.
 */

export const ROUTE_CLASSIFICATIONS = Object.freeze([
  "STABLE_REPO_TARGET",
  "DESIGN_LAB_TARGET",
  "HOLD_UNRESOLVED",
] as const);
export type RouteClassification = (typeof ROUTE_CLASSIFICATIONS)[number];

export type RouteGroupId = "moments" | "connections" | "mytree" | "firstMoment";

export interface NormalizedRoute {
  key: string;
  group: RouteGroupId;
  /** Source submenu display text (exact). */
  label: string;
  /** Source submenu small caption (exact). */
  small: string;
  /** Source-local relative path — evidence only, never a product href. */
  sourceLocalPath: string;
  classification: RouteClassification;
  /** Live repo href; present only for STABLE_REPO_TARGET / DESIGN_LAB_TARGET. */
  repoRoute?: string;
  /** Why the classification holds (auditable evidence). */
  note: string;
}

export const SOURCE_TRACK_47_ROUTES: readonly NormalizedRoute[] = Object.freeze([
  {
    key: "moment57",
    group: "moments",
    label: "Living Glass Cards",
    small: "57 · MOMENT",
    sourceLocalPath: "../../57_리빙글라스_모먼트카드/★_최종_버전1.2_리빙글라스_모먼트카드.html",
    classification: "HOLD_UNRESOLVED",
    note: "Repository Lineage 57 is lt-57-living-character-world — a different product; no Living Glass Cards route exists on main",
  },
  {
    key: "moment58",
    group: "moments",
    label: "Living Memory Pinboard",
    small: "58 · PINBOARD",
    sourceLocalPath: "../../58_리빙메모리_핀보드_시네마틱/★_최종_58_리빙메모리_핀보드.html",
    classification: "HOLD_UNRESOLVED",
    note: "Repository Lineage 58 is lt-58-videofigure-atelier — a different product; no pinboard route exists on main",
  },
  {
    key: "moment62",
    group: "moments",
    label: "Memory Sculpture Rail",
    small: "62 · SCULPTURE",
    sourceLocalPath: "../../62_기억조각상_원형레일전시/현재후보.html",
    classification: "HOLD_UNRESOLVED",
    note: "Lineage 62 stays reservation HOLD (track-62-v1-1-reservation-hold); no executable repo route",
  },
  {
    key: "moment63",
    group: "moments",
    label: "3D Moment Field Studio",
    small: "63 · 3D FIELD",
    sourceLocalPath:
      "../../63_모먼트필드_3D뷰스튜디오/버전1.2_프리셋시인성·자동맞춤·실제동작보정_후보/현재후보.html",
    classification: "HOLD_UNRESOLVED",
    note: "Only existing implementation lives in PR #191 (SOURCE HOLD — do not touch/promote); no route on main",
  },
  {
    key: "moment64",
    group: "moments",
    label: "Floating Moment Orbit",
    small: "64 · ORBIT",
    sourceLocalPath: "../../64_부유모먼트_웰컴오빗_입장포털/현재후보.html",
    classification: "DESIGN_LAB_TARGET",
    repoRoute: "/design-lab/lineages/64/v1-2-1",
    note: "Identity verified: lt-64-floating-moment-entry-portal manifest + route exist on main",
  },
  {
    key: "connection11",
    group: "connections",
    label: "Memory Graph Observatory",
    small: "11 · GRAPH",
    sourceLocalPath: "../../11_메모리그래프_관측소/01_메모리그래프_관측소_용광로코어.html",
    classification: "HOLD_UNRESOLVED",
    note: "V4 classification maps observatory behavior to /v4/trees/demo/graph as P2 MERGE_BEHAVIOR_INTO_EXISTING_V4 — merge not proven complete; related surface exists but identity is unresolved",
  },
  {
    key: "connection16",
    group: "connections",
    label: "Memory Topology Lab",
    small: "16 · TOPOLOGY",
    sourceLocalPath: "../../16_메모리토폴로지_관계망분석실/01_메모리토폴로지_현재채택_관계망분석실_v1.html",
    classification: "HOLD_UNRESOLVED",
    note: "V4 classification records ADOPT_NEW_V4_SCREEN as P2 pending; no topology route exists on main",
  },
  {
    key: "tree46",
    group: "mytree",
    label: "Popup Season Memory Book",
    small: "46 · MEMORY BOOK",
    sourceLocalPath: "../../46_팝업시즌_기억책/01_팝업시즌_기억책.html",
    classification: "HOLD_UNRESOLVED",
    note: "No repo route (Lineage 59 living-memory-book is a different track)",
  },
  {
    key: "tree35",
    group: "mytree",
    label: "LP Memory Player",
    small: "35 · PLAYER",
    sourceLocalPath: "../../35_LP플레이어/01_LP플레이어_영상기억.html",
    classification: "HOLD_UNRESOLVED",
    note: "No repo route (Telegram vinyl player source remains P2 classified, unimplemented)",
  },
  {
    key: "tree39",
    group: "mytree",
    label: "LP Coverflow Gallery",
    small: "39 · GALLERY",
    sourceLocalPath: "../../39_LP커버플로우_미디어갤러리/01_LP커버플로우_영상갤러리.html",
    classification: "HOLD_UNRESOLVED",
    note: "No repo route (Telegram vinyl coverflow source remains P2 classified, unimplemented)",
  },
  {
    key: "firstMoment",
    group: "firstMoment",
    label: "첫 순간 심기",
    small: "FIRST JOURNEY",
    sourceLocalPath: "../../02_첫여정통합-3개html합본/02_러브트리_첫여정통합_v1.html",
    classification: "STABLE_REPO_TARGET",
    repoRoute: "/v4",
    note: "Canonical V4 Entry (auth-aware entry resolver + 첫 순간 심기) owns first-moment semantics; the Track47 candidate proves the mapping only — it must not replace /v4 entry/auth/cardinality logic",
  },
]);

export function routeByKey(key: string): NormalizedRoute | undefined {
  return SOURCE_TRACK_47_ROUTES.find((route) => route.key === key);
}

export function routesByGroup(group: RouteGroupId): readonly NormalizedRoute[] {
  return SOURCE_TRACK_47_ROUTES.filter((route) => route.group === group);
}

/** Only STABLE_REPO_TARGET / DESIGN_LAB_TARGET may ever produce a live href. */
export function resolvableHref(route: NormalizedRoute): string | null {
  if (route.classification === "HOLD_UNRESOLVED") return null;
  return route.repoRoute ?? null;
}

export interface NavMenuGroupModel {
  id: Exclude<RouteGroupId, "firstMoment">;
  triggerLabel: string;
  menuAriaLabel: string;
  options: readonly NormalizedRoute[];
}

export const NAV_MENU_GROUPS: readonly NavMenuGroupModel[] = Object.freeze([
  {
    id: "moments",
    triggerLabel: "Moments",
    menuAriaLabel: "Moment views",
    options: routesByGroup("moments"),
  },
  {
    id: "connections",
    triggerLabel: "Connections",
    menuAriaLabel: "Connection views",
    options: routesByGroup("connections"),
  },
  {
    id: "mytree",
    triggerLabel: "My Tree",
    menuAriaLabel: "My Tree views",
    options: routesByGroup("mytree"),
  },
]);

/**
 * Guard for the exact source scene copy — the native candidate must not
 * paraphrase act copy (visual/copy fidelity is the track's core authority).
 */
export const SCENE_COPY = Object.freeze([
  {
    actId: 1,
    eyebrow: "LOVETREE · FIRST FEELING",
    heading: "마음이 움직인 순간은\n그냥 지나가지 않습니다.",
    sub: "한 장면이 오래 남았다면, 그게 첫 Moment입니다.",
  },
  {
    actId: 2,
    eyebrow: "LOVETREE · MOMENT",
    heading: "그 순간을 남기고.",
    sub: "정확한 장면 · 그때의 마음 · 나만의 한 줄",
  },
  {
    actId: 3,
    eyebrow: "LOVETREE · BLOOM",
    heading: "하나의 순간이\n다음 마음을 피워냅니다.",
    sub: "흩어진 기억이 아니라, 이어져 온 하나의 감정 흐름.",
  },
  {
    actId: 4,
    eyebrow: "LOVETREE · WHY NEXT",
    heading: "왜 다음 장면을\n찾아갔을까요?",
    sub: null,
    reasons: ["표정이 계속 생각나서.", "목소리가 궁금해서.", "조금 더 알고 싶어서."],
    tiny: "CONNECTION · THE REASON YOU MOVED NEXT",
  },
  {
    actId: 5,
    eyebrow: "LOVETREE · MY LOVETREE",
    heading: "그 마음이 자라온 길.\nMy LoveTree.",
    sub: "처음의 순간부터 지금까지, 나만의 감정 경로로 남깁니다.",
  },
] as const);
