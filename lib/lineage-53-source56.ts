export const SOURCE56_AUTHORITY = {
  sourceId: "Source 56",
  sourceFolder: "56_세로형_모먼트관계망_전체조망",
  revision: "V1.2",
  executable: "후보_버전1.2_세로형_모먼트관계망_전체조망.html",
  bytes: 45_761,
  sha256: "1828ef47acefd25f1f2b7cff0a3f58c74aa35e28bf127f41975491dcc156d909",
  repositoryFamily: "lt-53-emotional-path-replay",
  targetRoute: "/design-lab/lineages/53/53-v3-vertical-network-overview",
  implementationMode: "lineage-53-bounded-native-extension",
} as const;

export type Source56Moment = {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly emotion: string;
  readonly note: string;
  readonly sourceType: "photo" | "video" | "memo" | "link";
  readonly first?: boolean;
};

export type Source56Connection = {
  readonly id: string;
  readonly fromMomentId: string;
  readonly toMomentId: string;
  readonly whyNext: string;
};

const FAMILY_LABELS = [
  "01 처음 빠져든 순간",
  "02 무대와 퍼포먼스",
  "03 콘텐츠 탐색",
  "04 사람과 관계",
  "05 다시 찾은 기억",
  "06 다음 계절",
] as const;

const FAMILY_COLORS = ["#e45d8d", "#8b69e8", "#2ca4c0", "#d49231", "#3aa27c", "#547cd0"] as const;

const TITLES = [
  ["처음 눈에 들어온 무대", "밤새 다시 본 직캠", "처음 저장한 인터뷰", "표정이 남은 엔딩", "친구에게 보낸 첫 링크"],
  ["무대와 퍼포먼스", "연습실 짧은 영상", "라이브에서 발견한 습관", "콘서트 전날 메모", "의상 디테일 기록"],
  ["콘텐츠 탐색의 시작", "팬이 올린 짧은 클립", "댓글에서 찾은 정보", "오래 남은 한 문장", "예전 라디오 다시 듣기"],
  ["사람과 관계를 보기 시작", "다른 멤버와의 장면", "팬과 나눈 짧은 대화", "함께 웃던 순간", "관계 메모"],
  ["다시 찾은 첫 영상", "예전 저장을 다시 열다", "그날의 감정 메모", "다시 이어진 플레이리스트", "친구와 다시 본 장면"],
  ["다음 계절의 첫 저장", "다음 컴백 티저", "새로운 무대 예고", "다음에 보고 싶은 것", "새 계절 메모"],
] as const;

const NOTES = [
  "처음의 감정이 다음 장면을 찾게 만들었다.",
  "완성된 무대 이전의 과정과 움직임이 궁금해졌다.",
  "한 링크가 다른 콘텐츠와 맥락으로 탐색을 넓혔다.",
  "혼자 있는 모습에서 관계 속 모습으로 관심이 확장됐다.",
  "시간이 지난 뒤 같은 기억을 다시 보며 감정의 변화를 느꼈다.",
  "기억의 끝이 아니라 다음 계절을 기다리는 시작으로 남았다.",
] as const;

const WHY = [
  "표정이 계속 생각나서 같은 흐름의 다음 Moment를 열었다.",
  "퍼포먼스의 작은 디테일을 더 확인하고 싶어 다음 장면으로 이어졌다.",
  "짧은 단서의 맥락을 알고 싶어 관련 콘텐츠를 계속 따라갔다.",
  "사람을 대하는 모습이 궁금해 관계 속 다른 Moment를 찾았다.",
  "예전과 지금의 감정 차이를 확인하려 오래된 저장을 다시 열었다.",
  "새로운 활동의 단서가 앞으로의 Moment를 기다리게 했다.",
] as const;

const SOURCE_TYPES: readonly Source56Moment["sourceType"][] = ["video", "photo", "link", "memo", "video"];
const EMOTIONS = ["설렘", "몰입", "호기심", "애정", "그리움", "기대"] as const;

const firstMoment: Source56Moment = {
  id: "m-first",
  title: "First Moment · 처음 마음이 움직인 순간",
  date: "2026.05.12",
  emotion: "설렘",
  note: "여기서 여러 주요 감정 경로가 시작되었다.",
  sourceType: "video",
  first: true,
};

const familyMoments: Source56Moment[] = TITLES.flatMap((titles, familyIndex) =>
  titles.map((title, itemIndex) => ({
    id: `m${String(familyIndex + 1).padStart(2, "0")}-${itemIndex + 1}`,
    title,
    date: `2026.${String(5 + Math.floor(familyIndex / 2)).padStart(2, "0")}.${String(12 + familyIndex * 3 + itemIndex).padStart(2, "0")}`,
    emotion: EMOTIONS[familyIndex],
    note: NOTES[familyIndex],
    sourceType: SOURCE_TYPES[itemIndex],
  })),
);

/** Canonical fixture authority for this Design Lab proof: Moment only. */
export const SOURCE56_MOMENTS: readonly Source56Moment[] = [firstMoment, ...familyMoments];

const connections: Source56Connection[] = [];
for (let familyIndex = 0; familyIndex < TITLES.length; familyIndex += 1) {
  const prefix = `m${String(familyIndex + 1).padStart(2, "0")}`;
  connections.push({
    id: `c-first-${familyIndex + 1}`,
    fromMomentId: firstMoment.id,
    toMomentId: `${prefix}-1`,
    whyNext: WHY[familyIndex],
  });
  connections.push({ id: `c-${familyIndex + 1}-1`, fromMomentId: `${prefix}-1`, toMomentId: `${prefix}-2`, whyNext: WHY[familyIndex] });
  connections.push({ id: `c-${familyIndex + 1}-2`, fromMomentId: `${prefix}-2`, toMomentId: `${prefix}-3`, whyNext: WHY[familyIndex] });
  connections.push({ id: `c-${familyIndex + 1}-3`, fromMomentId: `${prefix}-3`, toMomentId: `${prefix}-4`, whyNext: WHY[familyIndex] });
  connections.push({ id: `c-${familyIndex + 1}-s`, fromMomentId: `${prefix}-2`, toMomentId: `${prefix}-5`, whyNext: `주경로에서 갈라진 보조 Connection · ${WHY[familyIndex]}` });
}

/** Canonical fixture authority for this Design Lab proof: Connection only. */
export const SOURCE56_CONNECTIONS: readonly Source56Connection[] = connections;

export type Source56PathFamily = {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly seedMomentId: string;
  readonly momentIds: readonly string[];
  readonly primaryMomentIds: readonly string[];
  readonly secondaryMomentIds: readonly string[];
};

/**
 * PathFamily / Hub / Cluster are presentation-only projections. They are derived
 * from Moment + Connection topology and are never persisted or sent to an API.
 */
export function deriveSource56PathFamilies(
  moments: readonly Source56Moment[] = SOURCE56_MOMENTS,
  edges: readonly Source56Connection[] = SOURCE56_CONNECTIONS,
): readonly Source56PathFamily[] {
  const first = moments.find((moment) => moment.first);
  if (!first) return [];
  const validIds = new Set(moments.map((moment) => moment.id));
  const outgoing = new Map<string, Source56Connection[]>();
  for (const edge of edges) {
    if (!validIds.has(edge.fromMomentId) || !validIds.has(edge.toMomentId)) continue;
    const current = outgoing.get(edge.fromMomentId) ?? [];
    current.push(edge);
    outgoing.set(edge.fromMomentId, current);
  }
  const seeds = (outgoing.get(first.id) ?? []).slice(0, FAMILY_LABELS.length);
  return seeds.map((seed, familyIndex) => {
    const visited = new Set<string>();
    const primary: string[] = [];
    const secondary: string[] = [];
    let cursor = seed.toMomentId;
    while (cursor && !visited.has(cursor)) {
      visited.add(cursor);
      primary.push(cursor);
      const next = outgoing.get(cursor) ?? [];
      for (const branch of next.slice(1)) {
        if (!visited.has(branch.toMomentId)) secondary.push(branch.toMomentId);
      }
      cursor = next[0]?.toMomentId ?? "";
    }
    return {
      id: `family-${familyIndex + 1}`,
      label: FAMILY_LABELS[familyIndex],
      color: FAMILY_COLORS[familyIndex],
      seedMomentId: seed.toMomentId,
      momentIds: [...primary, ...secondary],
      primaryMomentIds: primary,
      secondaryMomentIds: secondary,
    };
  });
}

export function incomingSource56Connection(momentId: string): Source56Connection | undefined {
  return SOURCE56_CONNECTIONS.find((connection) => connection.toMomentId === momentId);
}
