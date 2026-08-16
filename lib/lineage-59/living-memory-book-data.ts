export interface MomentMedia {
  type: "photo" | "video" | "poster";
  src: string;
  alt: string;
  width: number;
  height: number;
  posterSrc?: string;
}

export interface MomentLink {
  url: string;
  title: string;
}

export interface Moment {
  id: string;
  capturedAt: string;
  provenance: string;
  title: string;
  body: string;
  primaryEmotion: string;
  keywords: readonly string[];
  media: MomentMedia | null;
  link: MomentLink | null;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  whyNext: string;
}

export interface BranchChoice {
  id: string;
  label: string;
  description: string;
  connectionId: string;
}

export interface Branch {
  id: string;
  fromMomentId: string;
  choices: readonly BranchChoice[];
}

export interface SelectedPath {
  momentIds: readonly string[];
  currentIndex: number;
}

export interface MomentEditData {
  title?: string;
  body?: string;
  primaryEmotion?: string;
  keywords?: readonly string[];
  linkUrl?: string;
  linkTitle?: string;
  whyNext?: string;
}

export const MOMENTS: readonly Moment[] = [
  {
    id: "m59-001",
    capturedAt: "2026-08-10T14:23:00Z",
    provenance: "original-capture",
    title: "처음 멈춰 본 장면",
    body: "무대 위에서 웃는 모습을 보고 생각없이 하트를 눌렀다. 그게 전부였다. 그런데 그날 밤, 자꾸 그 표정이 떠올랐다.",
    primaryEmotion: "궁금함",
    keywords: ["첫인상", "호기심", "무대"],
    media: {
      type: "photo",
      src: "/design-lab-assets/lineages/59/v5/media/placeholder-portrait.svg",
      alt: "첫 번째 순간의 사진",
      width: 480,
      height: 640,
    },
    link: null,
  },
  {
    id: "m59-002",
    capturedAt: "2026-08-10T18:45:00Z",
    provenance: "original-capture",
    title: "표정이 자꾸 생각나서",
    body: "검색창에 이름을 쳤다. 영상이 나왔다. 같은 사람이 맞는데, 무대 위랑은 또 다른 얼굴이었다.",
    primaryEmotion: "호기심",
    keywords: ["검색", "발견", "새로운 표정"],
    media: {
      type: "photo",
      src: "/design-lab-assets/lineages/59/v5/media/placeholder-landscape.svg",
      alt: "두 번째 순간의 사진",
      width: 640,
      height: 480,
    },
    link: {
      url: "https://example.com/moment-002",
      title: "추천 영상 보기",
    },
  },
  {
    id: "m59-003",
    capturedAt: "2026-08-11T09:12:00Z",
    provenance: "original-capture",
    title: "무대 밖 말투가 궁금해져",
    body: "인터뷰를 찾아봤다. 생각했던 것보다 조용했다. 무대 위의 에너지와 인터뷰에서의 차분함. 그 간격이 좋았다.",
    primaryEmotion: "매력",
    keywords: ["인터뷰", "무대 밖", "진짜 모습"],
    media: {
      type: "video",
      src: "/design-lab-assets/lineages/59/v5/media/placeholder-video.mp4",
      alt: "인터뷰 영상",
      width: 854,
      height: 480,
      posterSrc: "/design-lab-assets/lineages/59/v5/media/placeholder-landscape.svg",
    },
    link: null,
  },
  {
    id: "m59-004",
    capturedAt: "2026-08-11T22:30:00Z",
    provenance: "original-capture",
    title: "웃는 순간에서 마음이 움직여",
    body: "크게 웃는 짧은 컷을 봤다. 입꼬리가 올라가는 속도가 보통이 아니었다. 웃는 사람을 보니 나도 웃고 있었다.",
    primaryEmotion: "설렘",
    keywords: ["웃음", "순간", "전염"],
    media: {
      type: "photo",
      src: "/design-lab-assets/lineages/59/v5/media/placeholder-portrait.svg",
      alt: "웃는 순간",
      width: 480,
      height: 640,
    },
    link: null,
  },
  {
    id: "m59-005",
    capturedAt: "2026-08-12T15:00:00Z",
    provenance: "original-capture",
    title: "팬의 추천을 따라간 밤",
    body: "팬이 만든 영상을 따라가다 보니 어느새 세 시간이 지나 있었다. 이 사람에게는 무대 위 에너지와 일상의 조용함이 함께 있었다.",
    primaryEmotion: "놀람",
    keywords: ["추천", "밤샘", "탐색"],
    media: {
      type: "photo",
      src: "/design-lab-assets/lineages/59/v5/media/placeholder-landscape.svg",
      alt: "팬 추천 영상",
      width: 640,
      height: 480,
    },
    link: null,
  },
  {
    id: "m59-006",
    capturedAt: "2026-08-13T11:20:00Z",
    provenance: "original-capture",
    title: "이제 좋아한다고 인정해",
    body: "친구에게 말했다. '나 이 사람 좋아하는 것 같아.' 입 밖으로 내자 더 선명해졌다. 좋아한다는 감정이 내 것이 되었다.",
    primaryEmotion: "몰입",
    keywords: ["인정", "고백", "결정"],
    media: null,
    link: null,
  },
  {
    id: "m59-007",
    capturedAt: "2026-08-14T20:00:00Z",
    provenance: "original-capture",
    title: "완전히 빠진 순간",
    body: "더 찾을 것이 없을 때까지 봤다. 그리고 알았다. 이 감정은 일시적이 아니라 내 삶의 일부가 되고 있다는 것을.",
    primaryEmotion: "몰입",
    keywords: ["완전", "빠짐", "일부"],
    media: {
      type: "photo",
      src: "/design-lab-assets/lineages/59/v5/media/placeholder-portrait.svg",
      alt: "마지막 순간",
      width: 480,
      height: 640,
    },
    link: null,
  },
];

export const CONNECTIONS: readonly Connection[] = [
  { id: "c59-001", fromId: "m59-001", toId: "m59-002", whyNext: "그 표정이 자꾸 생각나서…" },
  { id: "c59-002", fromId: "m59-002", toId: "m59-003", whyNext: "무대 밖의 모습이 궁금해졌다." },
  { id: "c59-003", fromId: "m59-003", toId: "m59-004", whyNext: "작은 웃음이 마음을 움직였다." },
  { id: "c59-004", fromId: "m59-004", toId: "m59-005", whyNext: "팬이 말했다: 이거 봐." },
  { id: "c59-005", fromId: "m59-005", toId: "m59-006", whyNext: "스스로 찾아다녔다." },
  { id: "c59-006", fromId: "m59-006", toId: "m59-007", whyNext: "이 순간 인정했다." },
];

export const LONG_PATH_MOMENTS: readonly Moment[] = [
  ...MOMENTS.map((m) => ({
    ...m,
    id: `lp-${m.id}`,
    capturedAt: m.capturedAt,
    provenance: m.provenance,
  })),
  {
    id: "lp-m59-008",
    capturedAt: "2026-08-15T08:00:00Z",
    provenance: "original-capture",
    title: "다시 처음으로",
    body: "처음 그 장면으로 돌아가 봤다. 처음과 지금은 느낌이 완전히 달랐다. 같은 영상인데, 내 마음이 달라져 있었다.",
    primaryEmotion: "회상",
    keywords: ["처음", "돌아봄", "변화"],
    media: null,
    link: null,
  },
  {
    id: "lp-m59-009",
    capturedAt: "2026-08-15T21:00:00Z",
    provenance: "original-capture",
    title: "The expression stayed with me",
    body: "I kept coming back to that one moment. A single frame that held more than I could explain. It became a reference point for everything that followed.",
    primaryEmotion: "nostalgia",
    keywords: ["reference", "frame", "emotional anchor"],
    media: {
      type: "photo",
      src: "/design-lab-assets/lineages/59/v5/media/placeholder-landscape.svg",
      alt: "A moment that stayed",
      width: 640,
      height: 480,
    },
    link: null,
  },
  {
    id: "lp-m59-010",
    capturedAt: "2026-08-16T07:30:00Z",
    provenance: "original-capture",
    title: "This is what moved my heart",
    body: "A long English paragraph that describes the emotional journey in detail. Each step revealed something new about why certain moments resonate more than others. The path through these moments became a map of feeling.",
    primaryEmotion: "wonder",
    keywords: ["journey", "map", "feeling"],
    media: null,
    link: null,
  },
];

export const LONG_PATH_CONNECTIONS: readonly Connection[] = [
  { id: "lp-c59-001", fromId: "lp-m59-001", toId: "lp-m59-002", whyNext: "Because the expression stayed with me…" },
  { id: "lp-c59-002", fromId: "lp-m59-002", toId: "lp-m59-003", whyNext: "I wanted to see another side." },
  { id: "lp-c59-003", fromId: "lp-m59-003", toId: "lp-m59-004", whyNext: "That small laugh changed the feeling." },
  { id: "lp-c59-004", fromId: "lp-m59-004", toId: "lp-m59-005", whyNext: "A fan said: watch this next." },
  { id: "lp-c59-005", fromId: "lp-m59-005", toId: "lp-m59-006", whyNext: "I kept searching on my own." },
  { id: "lp-c59-006", fromId: "lp-m59-006", toId: "lp-m59-007", whyNext: "This was the moment I admitted it." },
  { id: "lp-c59-007", fromId: "lp-m59-007", toId: "lp-m59-008", whyNext: "I went back to the beginning." },
  { id: "lp-c59-008", fromId: "lp-m59-008", toId: "lp-m59-009", whyNext: "That one frame kept pulling me back." },
  { id: "lp-c59-009", fromId: "lp-m59-009", toId: "lp-m59-010", whyNext: "The path became clear." },
];

export const BRANCH_MOMENTS: readonly Moment[] = MOMENTS.slice(0, 6).map((m) => ({
  ...m,
  id: `br-${m.id}`,
  provenance: "original-capture",
}));

export const BRANCH_CONNECTIONS: readonly Connection[] = [
  { id: "br-c59-001", fromId: "br-m59-001", toId: "br-m59-002", whyNext: "그 표정이 자꾸 생각나서…" },
  { id: "br-c59-002", fromId: "br-m59-002", toId: "br-m59-003", whyNext: "무대 밖의 모습이 궁금해졌다." },
  { id: "br-c59-003", fromId: "br-m59-003", toId: "br-m59-004", whyNext: "작은 웃음이 마음을 움직였다." },
  { id: "br-c59-004", fromId: "br-m59-004", toId: "br-m59-005", whyNext: "팬이 말했다: 이거 봐." },
  { id: "br-c59-005", fromId: "br-m59-005", toId: "br-m59-006", whyNext: "스스로 찾아다녔다." },
];

export const BRANCHES: readonly Branch[] = [
  {
    id: "b59-001",
    fromMomentId: "br-m59-004",
    choices: [
      { id: "ch-br-a", label: "감정을 따라 더 깊이", description: "이 감정이 어디로 가는지 지켜본다", connectionId: "br-c59-004" },
      {
        id: "ch-br-b",
        label: "잠시 멈추고 돌아보기",
        description: "지금까지의 순간을 다시 음미한다",
        connectionId: "br-c59-005-alt",
      },
    ],
  },
];

export const BRANCH_ALTERNATE_CONNECTIONS: readonly Connection[] = [
  { id: "br-c59-005-alt", fromId: "br-m59-005", toId: "br-m59-006", whyNext: "이 길이 맞는지 확인하고 싶었다." },
];

export function getMomentById(id: string, moments?: readonly Moment[]): Moment | undefined {
  return (moments ?? MOMENTS).find((m) => m.id === id);
}

export function getConnectionByFromId(fromId: string, connections?: readonly Connection[]): Connection | undefined {
  return (connections ?? CONNECTIONS).find((c) => c.fromId === fromId);
}

export function getNextMomentId(currentId: string, connections?: readonly Connection[]): string | undefined {
  const conn = getConnectionByFromId(currentId, connections);
  return conn?.toId;
}

export function getBranchForMoment(momentId: string, branches?: readonly Branch[]): Branch | undefined {
  return (branches ?? BRANCHES).find((b) => b.fromMomentId === momentId);
}