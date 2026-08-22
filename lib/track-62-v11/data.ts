/**
 * Track62 V1.1 — Continuous Exhibition Rail: synthetic Moment model.
 *
 * One selectedMoment authority. Every projection (rail node / sculpture /
 * viewer / journal / film / MY TREE summary) is DERIVED from the same
 * momentId through `exhibitionModel` — never duplicated into parallel
 * per-surface state.
 *
 * Media authority boundary (Issue #159):
 *   SOURCE_REFERENCE_ONLY — the six byte-unique RGBA human sculpture assets
 *   from the V1.1 source are owned by the sibling source; no repository
 *   transport authority. The native proof therefore renders NEUTRAL demo
 *   sculptures (generated, clearly marked) and never claims EXACT source
 *   media. Production media remains PRODUCTION_MEDIA_HOLD.
 */

export type MediaAuthorityState =
  | "DEMO_PREVIEW"
  | "MEDIA_REFERENCE_ONLY"
  | "PRODUCTION_MEDIA_HOLD";

export interface Track62Moment {
  readonly id: string;
  readonly railNumber: string;
  readonly title: string;
  readonly note: string;
  readonly whyNext: string;
  readonly mediaAuthority: MediaAuthorityState;
}

export interface Track62JournalEntry {
  readonly momentId: string;
  readonly sceneIndex: number;
}

export interface Track62ExhibitionModel {
  readonly scenes: number;
  readonly momentIds: ReadonlyArray<string>;
  readonly activeSceneIndex: number;
  readonly moment: Track62Moment | null;
  readonly journal: ReadonlyArray<Track62JournalEntry>;
  readonly myTreeHandoff: "HOLD_INTERNAL_SUMMARY";
}

export const TRACK62_V11_SOURCE = {
  trackId: "Track62 V1.1",
  sourceLabel: "버전1.1_조각상다양화·미디어뷰어·메뉴기능_후보 / 현재후보.html",
  driveFolderId: "1hluQIixvMgnABN-y322xRjSlCWv75KE_",
  bytes: 20728647,
  sha256: "bc5484a1c545165feb57cd76cae49c8f1e7bb0b3f4a0e11fa9bc4e739a6987e8",
  siblingQaSha256: "6462ef1f67016146e84942811b05a00b9e8f040030d4bc7acabc95d27f685d81",
  lineageReservation: "HOLD",
  canonicalAdoption: "NO",
  productionMedia: "PRODUCTION_MEDIA_HOLD" as MediaAuthorityState,
  sourceAssetsForProof: "SOURCE_REFERENCE_ONLY" as const,
  myTreeHandoff: "HOLD" as const,
} as const;

const BASE_MOMENTS: ReadonlyArray<Track62Moment> = [
  {
    id: "mom-01-first-glance",
    railNumber: "01",
    title: "첫인사",
    note: "어색하게 인사를 나누던 그 첫 순간",
    whyNext: "WHY NEXT — 이 인사가 없었다면, 다음 순간들도 없었다.",
    mediaAuthority: "DEMO_PREVIEW",
  },
  {
    id: "mom-02-rainy-walk",
    railNumber: "02",
    title: "비가 오는 날",
    note: "우산 하나를 같이 쓰고 걸었던 저녁",
    whyNext: "WHY NEXT — 같은 비를 함께 맞은 날, 마음의 거리도 가까워졌다.",
    mediaAuthority: "DEMO_PREVIEW",
  },
  {
    id: "mom-03-cafe-talk",
    railNumber: "03",
    title: "카페에서",
    note: "시간 가는 줄 모르고 이야기한 오후",
    whyNext: "WHY NEXT — 그날의 대화는 아직 끝나지 않은 이야기다.",
    mediaAuthority: "DEMO_PREVIEW",
  },
  {
    id: "mom-04-first-date",
    railNumber: "04",
    title: "첫 데이트",
    note: "손끝이 처음으로 닿았던 장면",
    whyNext: "WHY NEXT — 첫 데이트의 설렘은 계속 이어지고 싶다.",
    mediaAuthority: "DEMO_PREVIEW",
  },
  {
    id: "mom-05-sea-trip",
    railNumber: "05",
    title: "바다 여행",
    note: "함께 본 첫 바다, 처음 들은 파도 소리",
    whyNext: "WHY NEXT — 넓은 바다 앞에서 둘만의 약속을 했다.",
    mediaAuthority: "DEMO_PREVIEW",
  },
  {
    id: "mom-06-winter-night",
    railNumber: "06",
    title: "겨울밤 거리",
    note: "차갑지만 따뜻했던 겨울밤 산책",
    whyNext: "WHY NEXT — 추운 밤을 함께 걸으니 돌아온 길도 행복했다.",
    mediaAuthority: "DEMO_PREVIEW",
  },
  {
    id: "mom-07-lovetree",
    railNumber: "07",
    title: "러브트리",
    note: "모든 순간이 모여 자라난 우리의 나무",
    whyNext: "WHY NEXT — 이어진 순간들이 모여 하나의 러브트리가 되었다.",
    mediaAuthority: "DEMO_PREVIEW",
  },
];

/** UI proof uses the source V1.1 seven-scene contract. */
export const TRACK62_V11_SCENE_COUNT = 7;

/**
 * Synthetic fixture data for a given scene count. The continuous controller
 * itself is data-agnostic and exercised across 3 / 7 / 11 scenes in tests.
 */
export function syntheticTrack62Moments(count: number): ReadonlyArray<Track62Moment> {
  if (!Number.isInteger(count) || count < 2) {
    throw new TypeError(`scene count must be an integer >= 2, got ${String(count)}`);
  }
  if (count <= BASE_MOMENTS.length) {
    return BASE_MOMENTS.slice(0, count);
  }
  const extra: Track62Moment[] = [];
  for (let i = BASE_MOMENTS.length; i < count; i += 1) {
    extra.push({
      id: `mom-${String(i + 1).padStart(2, "0")}-extra`,
      railNumber: String(i + 1).padStart(2, "0"),
      title: `추억 ${i + 1}`,
      note: `${i + 1}번째로 이어진 순간`,
      whyNext: `WHY NEXT — ${i + 1}번째 순간은 아직 이어지고 있다.`,
      mediaAuthority: "DEMO_PREVIEW",
    });
  }
  return [...BASE_MOMENTS, ...extra];
}

export function momentById(
  moments: ReadonlyArray<Track62Moment>,
  momentId: string,
): Track62Moment | null {
  return moments.find((moment) => moment.id === momentId) ?? null;
}

/**
 * Single-authority model projection: active scene -> moment -> journal entry.
 * The same momentId feeds rail / sculpture / viewer / journal / MY TREE.
 */
export function exhibitionModel(
  moments: ReadonlyArray<Track62Moment>,
  momentId: string,
): Track62ExhibitionModel {
  const scenes = moments.length;
  const activeSceneIndex = Math.max(
    0,
    moments.findIndex((moment) => moment.id === momentId),
  );
  const moment = momentById(moments, momentId) ?? moments[0] ?? null;
  const journal: Track62JournalEntry[] = moments.slice(0, activeSceneIndex + 1).map(
    (entry, sceneIndex) => ({ momentId: entry.id, sceneIndex }),
  );
  return {
    scenes,
    momentIds: moments.map((entry) => entry.id),
    activeSceneIndex,
    moment,
    journal,
    myTreeHandoff: "HOLD_INTERNAL_SUMMARY",
  };
}

/**
 * Viewer tab state — tabs belong to the viewer overlay, not the rail. The
 * selected Moment inside the viewer is the same momentId everywhere.
 */
export type Track62ViewerTab = "VIEW" | "SCULPTURES" | "MEMORY FILMS" | "JOURNAL";

export const TRACK62_VIEWER_TABS: ReadonlyArray<{
  readonly id: Track62ViewerTab;
  readonly label: string;
}> = [
  { id: "VIEW", label: "VIEW" },
  { id: "SCULPTURES", label: "SCULPTURES" },
  { id: "MEMORY FILMS", label: "MEMORY FILMS" },
  { id: "JOURNAL", label: "JOURNAL" },
];

/** SAVE boundary: a real prototype state flag, never a fake product save. */
export interface Track62SaveState {
  readonly savedMomentIds: ReadonlyArray<string>;
  readonly lastSaveBoundary: "PROTOTYPE_STATE_ONLY";
}

export function saveMoment(
  state: Track62SaveState,
  momentId: string,
): Track62SaveState {
  if (state.savedMomentIds.includes(momentId)) return state;
  return {
    savedMomentIds: [...state.savedMomentIds, momentId],
    lastSaveBoundary: "PROTOTYPE_STATE_ONLY",
  };
}

export function createTrack62SaveState(): Track62SaveState {
  return { savedMomentIds: [], lastSaveBoundary: "PROTOTYPE_STATE_ONLY" };
}
