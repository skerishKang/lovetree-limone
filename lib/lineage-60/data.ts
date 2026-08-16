// Lineage 60 (Track60) — 3D Moment Cluster Deep Explorer V1.2
// Source-fidelity candidate data + VIEW_DERIVED cluster/bridge derivation.
//
// Canonical data boundary (intake manifest track-60-3d-moment-cluster):
//   Moment            = synthetic Moment projection
//   Connection        = synthetic WHY NEXT relation
//   Cluster           = VIEW_DERIVED (never a persistent entity)
//   Bridge Moment     = a real Moment carrying a VIEW_DERIVED property
// No Cluster / BridgeMoment DB entity, no cluster API, no backend schema.

export type ThemeKey = "first" | "trip" | "comfort" | "growth";

export interface Track60Moment {
  id: string;
  title: string;
  memo: string;
  sourceType: "song" | "book" | "video" | "link" | "photo" | "memo";
  sourceUrl?: string;
  discoveryDate: string;
  emotionTags: string[];
  parentId: string | null;
  // Canonical WHY NEXT relation text (persisted-equivalent in this synthetic fixture).
  connectionReason: string;
  // VIEW_DERIVED cluster grouping key. Not a persistent entity.
  theme: ThemeKey;
  thumbnail?: string;
}

export interface ClusterView {
  key: ThemeKey;
  label: string;
  color: string;
  memberIds: string[];
  center: [number, number, number];
}

export interface BridgeView {
  momentId: string;
  previousCluster: ThemeKey;
  nextCluster: ThemeKey;
  incomingParentId: string;
  outgoingChildIds: string[];
}

export interface Track60SourceMeta {
  driveId: string;
  executableBytes: number;
  executableSha256: string;
  renderingTier: string;
  sourceStatus: "PINNED" | "DRIVE_UNAVAILABLE" | "CTO_VERIFIED";
  localDriveFetch: "AVAILABLE" | "UNAVAILABLE";
  revisionLabel: string;
  note: string;
}

export const LINEAGE_60_SOURCE: Track60SourceMeta = {
  driveId: "1Pu6hSbIfW9X70jJCtRTs0WQyWaZvy_3M",
  executableBytes: 55260,
  executableSha256: "c35b66fb46b57958f7f52c7506ce20e467302f4bcf43b55001428d5d525a7fdf",
  renderingTier: "software-projected canvas 3D (canvas-2d context)",
  sourceStatus: "CTO_VERIFIED",
  localDriveFetch: "UNAVAILABLE",
  revisionLabel: "V1.2",
  note: "Web CTO independently verified SOURCE_FINGERPRINT=PASS for ★_현재후보_Track60_V1.2_REAL_NAVIGATION.html (SHA-256 c35b66fb46b57958f7f52c7506ce20e467302f4bcf43b55001428d5d525a7fdf, exact bytes 55,260). Local Drive fetch is unavailable in this environment, so the fingerprint authority is CTO_VERIFIED — not locally recomputed and not DRIVE_UNAVAILABLE. Rendering confirmed Canvas-2D software-projected 3D; WEBGL=NO, THREE_JS=NO.",
};

interface ThemeSpec {
  key: ThemeKey;
  label: string;
  color: string;
  center: [number, number, number];
  nodes: number;
}

const THEMES: ThemeSpec[] = [
  { key: "first", label: "첫 만남", color: "#ff9bb3", center: [-200, -50, -130], nodes: 16 },
  { key: "trip", label: "함께한 여행", color: "#7ec8ff", center: [210, 40, -70], nodes: 14 },
  { key: "comfort", label: "일상의 위로", color: "#ffd27e", center: [-120, 130, 150], nodes: 14 },
  { key: "growth", label: "성장의 계절", color: "#a6f0c6", center: [170, -130, 130], nodes: 12 },
];

const TITLE_POOL: Record<ThemeKey, string[]> = {
  first: [
    "처음 본 그 사람의 뒷모습",
    "우산을 나눠 썼던 비 오는 오후",
    "첫 메시지가 도착한 새벽",
    "함께 고른 첫 선물",
    "처음 손이 스쳤던 정류장",
    "첫 데이트의 떨림",
    "서로의 이름을 부르던 밤",
    "첫 사진, 눈이 마주친 순간",
  ],
  trip: [
    "바다가 보이는 방의 창가",
    "잊지 못할 해변의 노을",
    "낯선 골목을 걷던 오후",
    "기차 창밖으로 지나가는 들판",
    "함께 찍은 여권 사진",
    "호텔 발코니의 아침",
    "현지 카페에서 나눈 대화",
    "귀국 비행기 안의 잠",
  ],
  comfort: [
    "힘든 날 건넨 따뜻한 밥",
    "전화로 듣던 익숙한 목소리",
    "우울을 달래준 작은 선물",
    "같이 본 오래된 영화",
    "어깨를 기댔던 저녁",
    "무언가를 나누며 웃던 밤",
    "위로가 되었던 짧은 문장",
    "함께 한 캔디의 맛",
  ],
  growth: [
    "서로의 꿈을 나눈 봄",
    "함께 이사한 새로운 방",
    "서툰 요리에 웃던 저녁",
    "각자의 자리에서 보낸 응원",
    "기념일에 건넨 편지",
    "함께 세운 다음 해의 계획",
    "조금씩 달라진 우리의 일상",
    "성장한 마음을 돌아본 밤",
  ],
};

const ENGLISH_TITLE_POOL: Record<ThemeKey, string[]> = {
  first: [
    "The first time our eyes met across the room",
    "A quiet message that arrived before sunrise",
    "Sharing an umbrella on a rainy afternoon in the city",
  ],
  trip: [
    "The sunset we could not stop watching on the beach",
    "Fields passing by the train window on the way north",
    "A long walk through an unfamiliar narrow street abroad",
  ],
  comfort: [
    "A warm meal handed over on the hardest day of the week",
    "The familiar voice on the phone that always calmed me down",
    "An old film we watched together for the third time",
  ],
  growth: [
    "Sharing our dreams again when spring finally returned",
    "Moving into the new small room we chose together",
    "The letter I wrote on our anniversary about who we became",
  ],
};

const LONG_KOREAN =
  "그날의 마음을 다시 꺼내 보니 여전히 그때의 온기가 남아 있어서, 시간이 흘러도 이 순간이 우리에게 어떤 의미였는지 천천히 되짚어 보게 되었습니다.";

const LONG_ENGLISH =
  "Looking back at this moment now, the same quiet warmth is still there, and I find myself slowly tracing why this small memory came to mean so much to the two of us over time.";

const CONNECTION_REASONS: Record<ThemeKey, string[]> = {
  first: [
    "이 순간이 그때의 설렘을 가장 먼저 일깨워 줘서",
    "첫 마음이 선명하게 느껴졌던 순간이라",
    "서로를 알아가기 시작한 지점이라",
  ],
  trip: [
    "여행의 설렘이 앞선 순간에서 자연스레 이어져서",
    "함께 낯선 곳을 걷던 기억이 닿아서",
    "바다를 본 직후의 여운이 이어지도록",
  ],
  comfort: [
    "지친 날을 이전 순간의 위로가 이어받아서",
    "익숙한 목소리가 앞선 기억을 부르며",
    "우리가 나눈 작은 위로가 계속 이어져서",
  ],
  growth: [
    "우리가 달라진 모습이 앞선 계절에서 이어져서",
    "함께 세운 계획이 이전 다짐과 이어지도록",
    "성장한 마음이 처음의 마음을 이어받아서",
  ],
};

interface BuildOptions {
  count?: number;
  longCopy?: boolean;
}

export function buildTrack60Moments(opts: BuildOptions = {}): Track60Moment[] {
  const longCopy = opts.longCopy ?? false;
  const scale = opts.count
    ? opts.count / THEMES.reduce((a, t) => a + t.nodes, 0)
    : 1;

  const moments: Track60Moment[] = [];
  const lastOfTheme: Record<string, string | null> = {};

  THEMES.forEach((theme, ti) => {
    const n = Math.max(3, theme.nodes * scale);
    const titles = [...TITLE_POOL[theme.key], ...ENGLISH_TITLE_POOL[theme.key]];
    for (let i = 0; i < n; i++) {
      const id = `m-${theme.key}-${i}`;
      const isLong = longCopy && i % 5 === 0;
      const baseTitle = titles[(i + ti) % titles.length];
      const title = isLong
        ? `${baseTitle} — ${LONG_KOREAN}`
        : baseTitle;
      const memo = isLong
        ? LONG_ENGLISH
        : `${theme.label}과(와) 관련된 마음. ${CONNECTION_REASONS[theme.key][i % CONNECTION_REASONS[theme.key].length]}`;
      const parentId = i === 0 ? null : `m-${theme.key}-${i - 1}`;
      moments.push({
        id,
        title,
        memo,
        sourceType: (["song", "book", "video", "link", "photo", "memo"] as const)[i % 6],
        sourceUrl:
          i % 4 === 0 ? "https://example.com/lovetree-source" : undefined,
        discoveryDate: `2025-${String(((ti * 2 + i) % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
        emotionTags: pickEmotions(theme.key, i),
        parentId,
        connectionReason: CONNECTION_REASONS[theme.key][i % CONNECTION_REASONS[theme.key].length],
        theme: theme.key,
      });
      lastOfTheme[theme.key] = id;
    }
  });

  // Bridge Moments: a real moment whose parent lives in a different cluster.
  // This is the VIEW_DERIVED property that connects two memory masses.
  const bridges: Array<{ childTheme: ThemeKey; parentTheme: ThemeKey; childIndex: number }> = [
    { childTheme: "trip", parentTheme: "first", childIndex: 0 },
    { childTheme: "comfort", parentTheme: "trip", childIndex: 0 },
    { childTheme: "growth", parentTheme: "comfort", childIndex: 0 },
  ];
  for (const b of bridges) {
    const childId = `m-${b.childTheme}-${b.childIndex}`;
    const parentId = lastOfTheme[b.parentTheme];
    const child = moments.find((m) => m.id === childId);
    if (child && parentId) {
      child.parentId = parentId;
      child.connectionReason = `${THEMES.find((t) => t.key === b.parentTheme)!.label}의 기억이 닿아 ${THEMES.find((t) => t.key === b.childTheme)!.label}으로 이어진 순간`;
    }
  }

  return moments;
}

function pickEmotions(theme: ThemeKey, i: number): string[] {
  const pool: Record<ThemeKey, string[]> = {
    first: ["설렘", "두근거림", "기대"],
    trip: ["설렘", "자유로움", "여유"],
    comfort: ["위로", "안정", "따뜻함"],
    growth: ["자신감", "감사", "성장"],
  };
  const p = pool[theme];
  return [p[i % p.length], p[(i + 1) % p.length]];
}

export const TRACK60_MOMENTS: Track60Moment[] = buildTrack60Moments();

export const TRACK60_CLUSTER_SPECS: ClusterView[] = THEMES.map((t) => ({
  key: t.key,
  label: t.label,
  color: t.color,
  center: t.center,
  memberIds: TRACK60_MOMENTS.filter((m) => m.theme === t.key).map((m) => m.id),
}));

export function getClusterOf(momentId: string, moments: Track60Moment[]): ThemeKey | null {
  const m = moments.find((x) => x.id === momentId);
  return m ? m.theme : null;
}

export function deriveBridges(moments: Track60Moment[]): BridgeView[] {
  const byId = new Map(moments.map((m) => [m.id, m]));
  const bridges: BridgeView[] = [];
  for (const m of moments) {
    if (!m.parentId) continue;
    const parent = byId.get(m.parentId);
    if (!parent) continue;
    if (parent.theme !== m.theme) {
      const outgoingChildIds = moments
        .filter((c) => c.parentId === m.id)
        .map((c) => c.id);
      bridges.push({
        momentId: m.id,
        previousCluster: parent.theme,
        nextCluster: m.theme,
        incomingParentId: m.parentId,
        outgoingChildIds,
      });
    }
  }
  return bridges;
}

export function bridgeOf(momentId: string, bridges: BridgeView[]): BridgeView | null {
  return bridges.find((b) => b.momentId === momentId) ?? null;
}
