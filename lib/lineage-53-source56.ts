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

const FAMILY_SUBTITLES = [
  "ORIGIN · 설렘",
  "PATH · 몰입",
  "DISCOVERY · 호기심",
  "PEOPLE · 애정",
  "REVISIT · 그리움",
  "SEASON · 기대",
] as const;

const FAMILY_COLORS = ["#e45d8d", "#8b69e8", "#2ca4c0", "#d49231", "#3aa27c", "#547cd0"] as const;

/** Source56 V1.2 visual hierarchy: number of independent primary routes in each family. */
export const SOURCE56_PRIMARY_PATH_COUNTS = [3, 4, 4, 3, 3, 4] as const;

const EMOTIONS = ["설렘", "몰입", "호기심", "애정", "그리움", "기대"] as const;
const SOURCE_TYPES: readonly Source56Moment["sourceType"][] = ["video", "photo", "link", "memo"];
const FAMILY_SEEDS = [
  "처음 눈에 들어온 장면",
  "무대의 움직임을 따라간 순간",
  "콘텐츠를 더 찾아보기 시작한 순간",
  "사람과 관계 속 모습을 보기 시작한 순간",
  "예전 기억을 다시 연 순간",
  "다음 계절을 기다리기 시작한 순간",
] as const;
const PRIMARY_WORDS = ["표정", "움직임", "목소리", "장면"] as const;
const SECONDARY_WORDS = ["다른 시점", "짧은 기록", "연결된 단서", "다시 본 기억"] as const;
const WHY = [
  "표정이 계속 생각나서 같은 흐름의 다음 Moment를 열었다.",
  "퍼포먼스의 작은 디테일을 더 확인하고 싶어 다음 장면으로 이어졌다.",
  "짧은 단서의 맥락을 알고 싶어 관련 콘텐츠를 계속 따라갔다.",
  "사람을 대하는 모습이 궁금해 관계 속 다른 Moment를 찾았다.",
  "예전과 지금의 감정 차이를 확인하려 오래된 저장을 다시 열었다.",
  "새로운 활동의 단서가 앞으로의 Moment를 기다리게 했다.",
] as const;

const firstMoment: Source56Moment = {
  id: "m-first",
  title: "First Moment · 처음 마음이 움직인 순간",
  date: "2026.05.12",
  emotion: "설렘",
  note: "여기서 여러 주요 감정 경로가 시작되었다.",
  sourceType: "video",
  first: true,
};

function familyPrefix(familyIndex: number) {
  return `m${String(familyIndex + 1).padStart(2, "0")}`;
}

function makeMoment(
  id: string,
  title: string,
  familyIndex: number,
  ordinal: number,
): Source56Moment {
  const month = 5 + Math.floor(familyIndex / 2);
  const day = 3 + ((familyIndex * 7 + ordinal * 3) % 24);
  return {
    id,
    title,
    date: `2026.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`,
    emotion: EMOTIONS[familyIndex],
    note: `${FAMILY_LABELS[familyIndex]} 안에서 ${PRIMARY_WORDS[ordinal % PRIMARY_WORDS.length]}의 맥락이 다음 기억으로 이어졌다.`,
    sourceType: SOURCE_TYPES[ordinal % SOURCE_TYPES.length],
  };
}

/**
 * Design-Lab fixture authority remains Moment + Connection only. The denser
 * fixture mirrors Source56's visual/path topology without persisting PathFamily,
 * Hub, Cluster, or path records.
 */
const moments: Source56Moment[] = [firstMoment];
const connections: Source56Connection[] = [];

for (let familyIndex = 0; familyIndex < SOURCE56_PRIMARY_PATH_COUNTS.length; familyIndex += 1) {
  const prefix = familyPrefix(familyIndex);
  const entryId = `${prefix}-entry`;
  moments.push(makeMoment(entryId, FAMILY_SEEDS[familyIndex], familyIndex, 0));
  connections.push({
    id: `c-first-${familyIndex + 1}`,
    fromMomentId: firstMoment.id,
    toMomentId: entryId,
    whyNext: WHY[familyIndex],
  });

  const primaryCount = SOURCE56_PRIMARY_PATH_COUNTS[familyIndex];
  for (let pathIndex = 0; pathIndex < primaryCount; pathIndex += 1) {
    const letter = String.fromCharCode(65 + pathIndex);
    const primaryIds: string[] = [];
    for (let step = 0; step < 4; step += 1) {
      const id = `${prefix}-p${pathIndex + 1}-${step + 1}`;
      primaryIds.push(id);
      const title = step === 0
        ? `${FAMILY_LABELS[familyIndex].slice(3)} · 주경로 ${letter}`
        : `${PRIMARY_WORDS[(pathIndex + step) % PRIMARY_WORDS.length]}에서 이어진 ${step + 1}번째 Moment`;
      moments.push(makeMoment(id, title, familyIndex, pathIndex * 8 + step + 1));
    }

    connections.push({
      id: `c-${familyIndex + 1}-p${pathIndex + 1}-entry`,
      fromMomentId: entryId,
      toMomentId: primaryIds[0],
      whyNext: `${FAMILY_LABELS[familyIndex]}의 주경로 ${letter}가 여기서 시작된다.`,
    });
    for (let step = 0; step < primaryIds.length - 1; step += 1) {
      connections.push({
        id: `c-${familyIndex + 1}-p${pathIndex + 1}-${step + 1}`,
        fromMomentId: primaryIds[step],
        toMomentId: primaryIds[step + 1],
        whyNext: WHY[familyIndex],
      });
    }

    const branchParent = primaryIds[1];
    const secondaryIds = [1, 2].map((step) => `${prefix}-p${pathIndex + 1}-s${step}`);
    secondaryIds.forEach((id, step) => {
      moments.push(makeMoment(
        id,
        `${SECONDARY_WORDS[(familyIndex + pathIndex + step) % SECONDARY_WORDS.length]} · 보조 경로 ${letter}${step + 1}`,
        familyIndex,
        pathIndex * 8 + 5 + step,
      ));
    });
    connections.push({
      id: `c-${familyIndex + 1}-p${pathIndex + 1}-branch`,
      fromMomentId: branchParent,
      toMomentId: secondaryIds[0],
      whyNext: `주경로 ${letter}에서 갈라진 보조 Connection · ${WHY[familyIndex]}`,
    });
    connections.push({
      id: `c-${familyIndex + 1}-p${pathIndex + 1}-secondary`,
      fromMomentId: secondaryIds[0],
      toMomentId: secondaryIds[1],
      whyNext: `보조 경로에서 발견한 단서를 한 번 더 따라갔다.`,
    });
  }
}

export const SOURCE56_MOMENTS: readonly Source56Moment[] = moments;
export const SOURCE56_CONNECTIONS: readonly Source56Connection[] = connections;

export type Source56SecondaryPath = {
  readonly id: string;
  readonly label: string;
  readonly parentMomentId: string;
  readonly momentIds: readonly string[];
};

export type Source56PrimaryPath = {
  readonly id: string;
  readonly label: string;
  readonly momentIds: readonly string[];
  readonly secondaryBranches: readonly Source56SecondaryPath[];
};

export type Source56PathFamily = {
  readonly id: string;
  readonly label: string;
  readonly subtitle: string;
  readonly color: string;
  readonly seedMomentId: string;
  readonly momentIds: readonly string[];
  readonly primaryMomentIds: readonly string[];
  readonly secondaryMomentIds: readonly string[];
  readonly primaryPaths: readonly Source56PrimaryPath[];
};

function buildOutgoing(
  momentsInput: readonly Source56Moment[],
  edges: readonly Source56Connection[],
) {
  const validIds = new Set(momentsInput.map((moment) => moment.id));
  const outgoing = new Map<string, Source56Connection[]>();
  for (const edge of edges) {
    if (!validIds.has(edge.fromMomentId) || !validIds.has(edge.toMomentId)) continue;
    const current = outgoing.get(edge.fromMomentId) ?? [];
    current.push(edge);
    outgoing.set(edge.fromMomentId, current);
  }
  return outgoing;
}

function followSingleBranch(
  seedId: string,
  outgoing: Map<string, Source56Connection[]>,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  let cursor = seedId;
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    ids.push(cursor);
    cursor = outgoing.get(cursor)?.[0]?.toMomentId ?? "";
  }
  return ids;
}

/**
 * VIEW_DERIVED projection only. Family/primary/secondary hierarchy is inferred
 * from Moment + Connection topology and never written to storage or an API.
 */
export function deriveSource56PathFamilies(
  momentsInput: readonly Source56Moment[] = SOURCE56_MOMENTS,
  edges: readonly Source56Connection[] = SOURCE56_CONNECTIONS,
): readonly Source56PathFamily[] {
  const first = momentsInput.find((moment) => moment.first);
  if (!first) return [];
  const outgoing = buildOutgoing(momentsInput, edges);
  const familySeeds = (outgoing.get(first.id) ?? []).slice(0, FAMILY_LABELS.length);

  return familySeeds.map((familySeed, familyIndex) => {
    const entryId = familySeed.toMomentId;
    const roots = outgoing.get(entryId) ?? [];
    const primaryPaths = roots.map((root, pathIndex): Source56PrimaryPath => {
      const primaryIds: string[] = [];
      const secondaryBranches: Source56SecondaryPath[] = [];
      const seen = new Set<string>();
      let cursor = root.toMomentId;
      while (cursor && !seen.has(cursor)) {
        seen.add(cursor);
        primaryIds.push(cursor);
        const next = outgoing.get(cursor) ?? [];
        next.slice(1).forEach((branch, branchIndex) => {
          secondaryBranches.push({
            id: `family-${familyIndex + 1}-primary-${pathIndex + 1}-secondary-${branchIndex + 1}`,
            label: `${String(familyIndex + 1).padStart(2, "0")} · 주경로 ${String.fromCharCode(65 + pathIndex)} · 분기 ${branchIndex + 1}`,
            parentMomentId: cursor,
            momentIds: followSingleBranch(branch.toMomentId, outgoing),
          });
        });
        cursor = next[0]?.toMomentId ?? "";
      }
      return {
        id: `family-${familyIndex + 1}-primary-${pathIndex + 1}`,
        label: `${String(familyIndex + 1).padStart(2, "0")} · 주경로 ${String.fromCharCode(65 + pathIndex)}`,
        momentIds: primaryIds,
        secondaryBranches,
      };
    });

    const primaryMomentIds = primaryPaths.flatMap((path) => path.momentIds);
    const secondaryMomentIds = primaryPaths.flatMap((path) => path.secondaryBranches.flatMap((branch) => branch.momentIds));
    return {
      id: `family-${familyIndex + 1}`,
      label: FAMILY_LABELS[familyIndex],
      subtitle: FAMILY_SUBTITLES[familyIndex],
      color: FAMILY_COLORS[familyIndex],
      seedMomentId: entryId,
      momentIds: [entryId, ...primaryMomentIds, ...secondaryMomentIds],
      primaryMomentIds,
      secondaryMomentIds,
      primaryPaths,
    };
  });
}

export function incomingSource56Connection(momentId: string): Source56Connection | undefined {
  return SOURCE56_CONNECTIONS.find((connection) => connection.toMomentId === momentId);
}
