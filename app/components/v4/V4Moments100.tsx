"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../styles/v4/moments-100.css";

const WORLD_W = 2400;
const WORLD_H = 1500;
const tags = ["섹시", "큐트", "청순", "설렘", "위로", "울림"];
const palette = {
  root: "#cf7886",
  scene: "#d7ad64",
  emotion: "#a184bf",
  comfort: "#839777",
  blue: "#7895aa",
  end: "#bd5d72",
};
const icons: Record<string, string> = {
  root: "✿",
  photo: "▧",
  note: "✎",
  quote: "“",
  turning: "♡",
  end: "❀",
  video: "▶",
  post: "▤",
};
const kindLabels: Record<string, string> = {
  root: "ROOT",
  video: "VIDEO MOMENT",
  photo: "PHOTO",
  note: "MEMO",
  quote: "INTERVIEW LINE",
  turning: "TURNING POINT",
  end: "SEASON COMPLETE",
  post: "POST",
};
const representativeMoments = [
  {
    id: "moment-1",
    number: 1,
    kind: "video",
    title: "처음 발견한 순간",
    memo: "이상하게 계속 생각나서 이름을 찾아보기 시작했어요.",
    emotion: "호기심",
    tags: ["설렘"],
    platform: "YouTube",
    url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    startTime: "00:42",
    endTime: "01:08",
    thumbnail: "https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg",
    date: "2026.04.20",
    x: 420,
    y: 480,
    color: palette.root,
    relation: "계속 생각나서",
    likes: 318,
  },
  {
    id: "moment-24",
    number: 24,
    kind: "video",
    title: "계속 찾아보게 된 무대",
    memo: "표정 하나가 궁금해서 다른 직캠과 무대를 계속 열어봤어요.",
    emotion: "설렘",
    tags: ["섹시", "설렘"],
    platform: "YouTube",
    url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    startTime: "01:14",
    endTime: "01:52",
    thumbnail: "https://img.youtube.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
    date: "2026.04.21",
    x: 930,
    y: 300,
    color: palette.scene,
    relation: "다른 모습이 보고 싶어서",
    likes: 518,
  },
  {
    id: "moment-50",
    number: 50,
    kind: "turning",
    title: "좋아하는 이유가 선명해진 순간",
    memo: "호기심이 좋아하는 마음으로 바뀌었다는 걸 처음 인정했어요.",
    emotion: "몰입",
    tags: ["울림", "설렘"],
    platform: "LoveTree",
    url: "",
    startTime: "",
    endTime: "",
    thumbnail: "",
    date: "2026.04.22",
    x: 1380,
    y: 620,
    color: palette.emotion,
    relation: "마음이 깊어져서",
    likes: 401,
  },
  {
    id: "moment-78",
    number: 78,
    kind: "video",
    title: "오늘도 위로가 된 장면",
    memo: "좋아하는 마음이 힘든 하루를 버티게 해 준 순간이에요.",
    emotion: "위로",
    tags: ["위로"],
    platform: "YouTube",
    url: "https://www.youtube.com/watch?v=9bZkp7q19f0",
    startTime: "02:10",
    endTime: "03:04",
    thumbnail: "https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg",
    date: "2026.06.18",
    x: 800,
    y: 1080,
    color: palette.comfort,
    relation: "힘든 날 다시 찾아서",
    likes: 92,
  },
  {
    id: "moment-100",
    number: 100,
    kind: "end",
    title: "100번째 마음이 피어난 날",
    memo: "처음부터 지금까지의 흐름이 하나의 완성본이 되었어요.",
    emotion: "완성",
    tags: ["설렘", "울림"],
    platform: "LoveTree",
    url: "",
    startTime: "",
    endTime: "",
    thumbnail: "",
    date: "2026.08.02",
    x: 1580,
    y: 1080,
    color: palette.end,
    relation: "100번째 완성",
    likes: 600,
  },
];

interface MomentNode {
  id: string;
  number: number;
  kind: string;
  title: string;
  memo: string;
  emotion: string;
  tags: string[];
  platform: string;
  url: string;
  startTime: string;
  endTime: string;
  thumbnail: string;
  date: string;
  x: number;
  y: number;
  color: string;
  relation: string;
  likes: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  label: string;
  color: string;
  recent?: boolean;
  generic?: boolean;
}

const rootNode: MomentNode = {
  id: "root",
  number: 0,
  kind: "root",
  title: "주연이의 LoveTree",
  memo: "한 인물을 좋아하게 된 모든 순간이 한 나무에서 이어집니다.",
  emotion: "시작",
  tags: ["설렘"],
  platform: "LoveTree",
  url: "",
  startTime: "",
  endTime: "",
  thumbnail: "",
  date: "2026.04.20",
  x: 1160,
  y: 760,
  color: palette.root,
  relation: "첫 발견",
  likes: 0,
};

function buildBaseNodes(): MomentNode[] {
  const genericKinds = ["video", "photo", "note", "quote", "post"];
  const genericTitles = [
    "다시 보고 싶던 표정",
    "팬이 추천한 장면",
    "마음에 남은 인터뷰",
    "조용히 웃던 순간",
    "무대 뒤 작은 장면",
    "처음 알게 된 문장",
    "새벽에 다시 찾은 영상",
    "같이 웃게 된 사진",
    "오래 남은 한마디",
    "또 보고 싶은 무대",
  ];
  const genericRelations = [
    "표정이 궁금해서",
    "팬 추천을 보고",
    "다른 모습이 보고 싶어서",
    "실력이 더 궁금해서",
    "힘든 날 다시 찾아서",
    "관계가 궁금해서",
  ];
  const generic: MomentNode[] = [];
  for (let n = 1; n <= 100; n++) {
    if ([1, 24, 50, 78, 100].includes(n)) continue;
    const angle = (n / 95) * Math.PI * 2 - Math.PI / 2;
    const ring = 310 + (n % 5) * 54;
    const emotion = tags[n % tags.length];
    const kind = genericKinds[n % genericKinds.length];
    generic.push({
      id: `moment-${n}`,
      number: n,
      kind,
      title: `${n}번째 · ${genericTitles[n % genericTitles.length]}`,
      memo: "이 순간에 남긴 짧은 마음과 다음으로 이어진 이유가 있어요.",
      emotion,
      tags: [emotion],
      platform: kind === "video" ? "YouTube" : "LoveTree",
      url: kind === "video" ? "https://www.youtube.com/watch?v=ScMzIvxBSi4" : "",
      startTime:
        kind === "video"
          ? `0${n % 5}:${String((n * 7) % 60).padStart(2, "0")}`
          : "",
      endTime: "",
      thumbnail:
        kind === "video"
          ? "https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg"
          : "",
      date: `2026.${String(4 + Math.floor(n / 25)).padStart(2, "0")}.${String(1 + (n % 27)).padStart(2, "0")}`,
      x: 1160 + Math.cos(angle) * ring,
      y: 760 + Math.sin(angle) * ring * 0.72,
      color: [palette.root, palette.scene, palette.emotion, palette.comfort, palette.blue][n % 5],
      relation: genericRelations[n % genericRelations.length],
      likes: 20 + ((n * 13) % 280),
    });
  }
  return [rootNode, ...representativeMoments, ...generic];
}

const BASE_NODES = buildBaseNodes();
const BASE_EDGES: Edge[] = [
  { id: "edge-1", source: "root", target: "moment-1", label: "첫 발견", color: palette.root },
  { id: "edge-2", source: "moment-1", target: "moment-24", label: "계속 찾아봄", color: palette.scene },
  { id: "edge-3", source: "moment-24", target: "moment-50", label: "마음이 깊어짐", color: palette.emotion },
  { id: "edge-4", source: "moment-50", target: "moment-78", label: "위로가 됨", color: palette.comfort },
  { id: "edge-5", source: "moment-78", target: "moment-100", label: "100번째 완성", color: palette.end, recent: true },
];

const creatorTagScopeData: Record<string, { label: string; scores: Record<string, number> }> = {
  all: { label: "전체 · 100개의 순간", scores: { 섹시: 34, 큐트: 18, 청순: 12, 설렘: 22, 위로: 9, 울림: 5 } },
  season1: { label: "시즌 1 · 1~100번째", scores: { 섹시: 34, 큐트: 18, 청순: 12, 설렘: 22, 위로: 9, 울림: 5 } },
  season2: { label: "시즌 2 · 아직 심은 순간 없음", scores: { 섹시: 0, 큐트: 0, 청순: 0, 설렘: 0, 위로: 0, 울림: 0 } },
  branch: { label: "현재 가지 · 24→50→78→100", scores: { 섹시: 25, 큐트: 8, 청순: 11, 설렘: 27, 위로: 18, 울림: 11 } },
  theme: { label: "섹시한 주연 가지 · 16개의 순간", scores: { 섹시: 72, 큐트: 5, 청순: 4, 설렘: 13, 위로: 2, 울림: 4 } },
};

const subjectFanAggregate: Record<
  string,
  Record<string, { moments: number; participants: number; scores: Record<string, number> }>
> = {
  all: {
    year: { moments: 8421, participants: 21406, scores: { 섹시: 78, 큐트: 54, 청순: 43, 설렘: 71, 위로: 38, 울림: 65 } },
    month: { moments: 1284, participants: 4920, scores: { 섹시: 80, 큐트: 57, 청순: 40, 설렘: 75, 위로: 35, 울림: 62 } },
    week: { moments: 318, participants: 1146, scores: { 섹시: 81, 큐트: 59, 청순: 38, 설렘: 77, 위로: 34, 울림: 64 } },
    all: { moments: 19231, participants: 38772, scores: { 섹시: 76, 큐트: 55, 청순: 45, 설렘: 70, 위로: 41, 울림: 63 } },
  },
  official: {
    year: { moments: 1310, participants: 12410, scores: { 섹시: 74, 큐트: 58, 청순: 49, 설렘: 73, 위로: 43, 울림: 68 } },
    month: { moments: 221, participants: 3010, scores: { 섹시: 76, 큐트: 61, 청순: 46, 설렘: 75, 위로: 40, 울림: 69 } },
    week: { moments: 61, participants: 862, scores: { 섹시: 77, 큐트: 63, 청순: 44, 설렘: 78, 위로: 39, 울림: 70 } },
    all: { moments: 3240, participants: 18544, scores: { 섹시: 73, 큐트: 59, 청순: 50, 설렘: 72, 위로: 45, 울림: 67 } },
  },
  fan: {
    year: { moments: 7111, participants: 17880, scores: { 섹시: 80, 큐트: 52, 청순: 40, 설렘: 70, 위로: 36, 울림: 64 } },
    month: { moments: 1063, participants: 4108, scores: { 섹시: 82, 큐트: 55, 청순: 37, 설렘: 74, 위로: 33, 울림: 60 } },
    week: { moments: 257, participants: 972, scores: { 섹시: 83, 큐트: 57, 청순: 35, 설렘: 76, 위로: 32, 울림: 62 } },
    all: { moments: 15991, participants: 31520, scores: { 섹시: 78, 큐트: 53, 청순: 42, 설렘: 69, 위로: 39, 울림: 62 } },
  },
};

const viewerMomentReactions: Record<string, { scores: Record<string, number>; participants: number; my: string[] }> = {
  "moment-1": { scores: { 섹시: 36, 큐트: 48, 청순: 42, 설렘: 78, 위로: 12, 울림: 31 }, participants: 164, my: [] },
  "moment-24": { scores: { 섹시: 82, 큐트: 46, 청순: 41, 설렘: 76, 위로: 18, 울림: 55 }, participants: 342, my: [] },
  "moment-50": { scores: { 섹시: 32, 큐트: 39, 청순: 47, 설렘: 72, 위로: 54, 울림: 84 }, participants: 251, my: [] },
  "moment-78": { scores: { 섹시: 12, 큐트: 27, 청순: 50, 설렘: 58, 위로: 88, 울림: 72 }, participants: 96, my: [] },
  "moment-100": { scores: { 섹시: 0, 큐트: 0, 청순: 0, 설렘: 0, 위로: 0, 울림: 0 }, participants: 0, my: [] },
};

const RELATIONS = [
  "표정이 궁금해서",
  "다른 모습이 보고 싶어서",
  "팬 추천을 보고",
  "힘든 날 다시 찾아서",
  "실력이 더 궁금해서",
  "관계가 궁금해서",
  "직접 입력",
];

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>'"]/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[ch] as string,
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function timeToSeconds(value: string): number | null {
  if (!value) return null;
  const parts = String(value).trim().split(":");
  if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    if (Number.isFinite(m) && Number.isFinite(s)) return m * 60 + s;
    return null;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    if (Number.isFinite(h) && Number.isFinite(m) && Number.isFinite(s)) return h * 3600 + m * 60 + s;
    return null;
  }
  return null;
}

function secondsToTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function normalizeTime(value: string): string | null {
  const seconds = timeToSeconds(value);
  return seconds === null ? null : secondsToTime(seconds);
}

function youtubeIdFromUrl(value: string): string | null {
  const m = String(value || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{6,})/);
  return m?.[1] || null;
}

function timeFromUrl(value: string): string {
  try {
    const u = new URL(value);
    const t = u.searchParams.get("t") || u.searchParams.get("start");
    return t ? secondsToTime(timeToSeconds(t) || Number(t)) : "";
  } catch {
    return "";
  }
}

function rangeLabel(node: MomentNode): string {
  if (!node.startTime) return "";
  return node.endTime ? `${node.startTime}–${node.endTime}` : node.startTime;
}

function isRepresentative(node: MomentNode): boolean {
  return node.id === "root" || [1, 24, 50, 78, 100].includes(node.number);
}

function tempColor(tag: string): string {
  if (tag === "섹시") return palette.root;
  if (tag === "큐트") return palette.scene;
  if (tag === "청순") return palette.blue;
  if (tag === "설렘") return palette.emotion;
  if (tag === "위로") return palette.comfort;
  return palette.end;
}

const REVIEW_POSITIONS = [
  [12, 78],
  [31, 35],
  [51, 58],
  [70, 72],
  [89, 19],
];

export default function V4Moments100() {
  const [nodes, setNodes] = useState<MomentNode[]>(() => BASE_NODES.map((n) => ({ ...n })));
  const [edges, setEdges] = useState<Edge[]>(() => BASE_EDGES.map((e) => ({ ...e })));
  const [selectedId, setSelectedId] = useState("moment-100");
  const [anchorId, setAnchorId] = useState("moment-100");
  const [density, setDensity] = useState<"representative" | "all">("representative");
  const [layout, setLayout] = useState("radial");
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const [inspectorTab, setInspectorTabState] = useState<"plant" | "selected" | "temperature">("plant");
  const [temperatureView, setTemperatureView] = useState("creator");
  const [creatorScope, setCreatorScope] = useState("all");
  const [subjectSource, setSubjectSource] = useState("all");
  const [subjectPeriod, setSubjectPeriod] = useState("year");
  const [seasonMode, setSeasonMode] = useState<"undecided" | "season2" | "continuous">("undecided");
  const [seasonDirection, setSeasonDirection] = useState("");
  const [nextNumber, setNextNumber] = useState(101);
  const [totalMomentCount, setTotalMomentCount] = useState(100);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewPlaying, setReviewPlaying] = useState(false);
  const [reviewMode, setReviewMode] = useState("play");
  const [courseSelection, setCourseSelection] = useState<string[]>(["moment-1", "moment-24", "moment-50"]);
  const [courseView, setCourseView] = useState<"builder" | "result">("builder");
  const [courseName, setCourseName] = useState("주연이를 처음 보는 친구를 위한 15분 코스");
  const [courseError, setCourseError] = useState("");
  const [toast, setToast] = useState("");
  const [overlay, setOverlay] = useState<"completion" | "review" | "none">("completion");
  const [openDialog, setOpenDialog] = useState<
    "none" | "decision" | "seasonDirection" | "course" | "video" | "anchor"
  >("none");
  const [dragging, setDragging] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const [likes, setLikes] = useState<Record<string, { count: number; likedByMe: boolean }>>(() =>
    Object.fromEntries(nodes.map((n) => [n.id, { count: n.likes || 0, likedByMe: false }])),
  );
  const [plantForm, setPlantForm] = useState({
    sourceType: "video",
    nodeUrl: "",
    nodeTitle: "",
    nodeStart: "",
    nodeEnd: "",
    nodeMemo: "",
    selectedCreatorTags: ["섹시", "설렘"] as string[],
    selectedRelation: "표정이 궁금해서",
    customRelation: "",
    formError: "",
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const connectRef = useRef<{ sourceId: string; pointer: { x: number; y: number } } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const getNode = useCallback((id: string) => nodes.find((n) => n.id === id), [nodes]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  const visibleNodes = useMemo(() => {
    if (density === "all") return nodes;
    return nodes.filter(isRepresentative);
  }, [density, nodes]);

  const visibleEdges = useMemo(() => {
    if (density === "representative") return edges;
    const all = [...edges];
    for (let n = 2; n <= 100; n++) {
      if ([24, 50, 78, 100].includes(n)) continue;
      const prev = n === 2 ? "moment-1" : `moment-${n - 1}`;
      if (getNode(prev) && getNode(`moment-${n}`)) {
        all.push({
          id: `generic-edge-${n}`,
          source: prev,
          target: `moment-${n}`,
          label: "",
          color: "rgba(141,121,113,.24)",
          generic: true,
        });
      }
    }
    return all;
  }, [density, edges, getNode]);

  const worldPoint = useCallback(
    (clientX: number, clientY: number) => {
      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0 };
      return { x: (clientX - r.left - pan.x) / zoom, y: (clientY - r.top - pan.y) / zoom };
    },
    [pan, zoom],
  );

  const zoomAround = useCallback(
    (next: number) => {
      setZoom(clamp(next, 0.26, 1.35));
    },
    [],
  );

  const fitView = useCallback(() => {
    const vis = visibleNodes;
    if (!vis.length) return;
    const xs = vis.map((n) => n.x);
    const ys = vis.map((n) => n.y);
    const minX = Math.min(...xs) - 180;
    const maxX = Math.max(...xs) + 180;
    const minY = Math.min(...ys) - 180;
    const maxY = Math.max(...ys) + 180;
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    const z = clamp(Math.min(r.width / (maxX - minX), r.height / (maxY - minY)), 0.28, 1.05);
    setZoom(z);
    setPan({
      x: (r.width - (maxX - minX) * z) / 2 - minX * z,
      y: (r.height - (maxY - minY) * z) / 2 - minY * z,
    });
  }, [visibleNodes]);

  const applyLayout = useCallback(
    (name: string) => {
      setLayout(name);
      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n }));
        const genIndex = (n: MomentNode) =>
          next.filter((m) => m.id !== "root" && ![1, 24, 50, 78, 100].includes(m.number)).findIndex((m) => m.id === n.id);
        if (name === "radial") {
          const pos: Record<string, [number, number]> = {
            root: [1160, 760],
            "moment-1": [420, 480],
            "moment-24": [930, 300],
            "moment-50": [1380, 620],
            "moment-78": [800, 1080],
            "moment-100": [1580, 1080],
          };
          next.forEach((n) => {
            if (pos[n.id]) {
              [n.x, n.y] = pos[n.id];
            } else {
              const i = genIndex(n);
              if (i < 0) return;
              const a = (i / 95) * Math.PI * 2 - Math.PI / 2;
              const ring = 335 + (i % 5) * 55;
              n.x = 1160 + Math.cos(a) * ring;
              n.y = 760 + Math.sin(a) * ring * 0.72;
            }
          });
        } else if (name === "tree") {
          next.forEach((n) => {
            if (n.id === "root") {
              n.x = 250;
              n.y = 750;
            } else if ([1, 24, 50, 78, 100].includes(n.number)) {
              const i = [1, 24, 50, 78, 100].indexOf(n.number);
              n.x = 570 + i * 355;
              n.y = 750 + [-250, -90, 120, -160, 100][i];
            } else {
              const col = Math.floor((n.number - 1) / 20);
              const row = (n.number - 1) % 20;
              n.x = 520 + col * 370 + (row % 2) * 90;
              n.y = 90 + row * 66;
            }
          });
        } else if (name === "circle") {
          next.forEach((n) => {
            if (n.id === "root") {
              n.x = 1160;
              n.y = 750;
            } else if ([1, 24, 50, 78, 100].includes(n.number)) {
              const i = [1, 24, 50, 78, 100].indexOf(n.number);
              const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
              n.x = 1160 + Math.cos(a) * 470;
              n.y = 750 + Math.sin(a) * 380;
            } else {
              const i = genIndex(n);
              if (i < 0) return;
              const a = (i / 95) * Math.PI * 2 - Math.PI / 2;
              n.x = 1160 + Math.cos(a) * 610;
              n.y = 750 + Math.sin(a) * 500;
            }
          });
        } else if (name === "grid") {
          next.forEach((n) => {
            if (n.id === "root") {
              n.x = 160;
              n.y = 120;
            } else {
              const i = next
                .filter((m) => m.id !== "root")
                .sort((a, b) => a.number - b.number)
                .findIndex((m) => m.id === n.id);
              n.x = 230 + (i % 10) * 215;
              n.y = 180 + Math.floor(i / 10) * 125;
            }
          });
        } else if (name === "timeline") {
          next.forEach((n) => {
            if (n.id === "root") {
              n.x = 140;
              n.y = 750;
            } else {
              const i = next
                .filter((m) => m.id !== "root")
                .sort((a, b) => a.number - b.number)
                .findIndex((m) => m.id === n.id);
              n.x = 220 + i * 21.2;
              n.y = 750 + Math.sin(i * 0.42) * 190;
            }
          });
        }
        return next;
      });
      setTimeout(() => fitView(), 40);
    },
    [fitView],
  );

  /* ── pointer interactions ─────────────────────────────── */
  const [connecting, setConnecting] = useState<{ x: number; y: number; sourceId: string } | null>(null);

  const addEdge = useCallback(
    (source: string, target: string) => {
      setEdges((prev) => {
        if (prev.some((e) => e.source === source && e.target === target)) {
          showToast("이미 이어진 가지예요.");
          return prev;
        }
        const recent = prev.map((e) => ({ ...e, recent: false }));
        recent.push({
          id: `edge-${Date.now()}`,
          source,
          target,
          label: "새롭게 이어짐",
          color: palette.root,
          recent: true,
        });
        showToast("두 순간 사이에 새 가지가 이어졌어요.");
        return recent;
      });
    },
    [showToast],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragRef.current) {
        const node = nodes.find((n) => n.id === dragRef.current!.id);
        const p = worldPoint(e.clientX, e.clientY);
        if (node) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    x: clamp(p.x + dragRef.current!.dx, 80, WORLD_W - 80),
                    y: clamp(p.y + dragRef.current!.dy, 80, WORLD_H - 80),
                  }
                : n,
            ),
          );
        }
        return;
      }
      if (panRef.current) {
        setPan({
          x: panRef.current.panX + e.clientX - panRef.current.x,
          y: panRef.current.panY + e.clientY - panRef.current.y,
        });
        return;
      }
      if (connectRef.current) {
        connectRef.current.pointer = worldPoint(e.clientX, e.clientY);
        setConnecting({ ...connectRef.current.pointer, sourceId: connectRef.current.sourceId });
      }
    };
    const onUp = (e: PointerEvent) => {
      if (dragRef.current) {
        dragRef.current = null;
        setDragging(false);
        setDraggingId(null);
      }
      if (panRef.current) {
        panRef.current = null;
        setPanning(false);
      }
      if (connectRef.current) {
        const sourceId = connectRef.current.sourceId;
        const target = document
          .elementsFromPoint(e.clientX, e.clientY)
          .map((el) => (el as HTMLElement).closest?.("[data-moment-id]"))
          .find(Boolean) as HTMLElement | undefined;
        const targetId = target?.dataset?.momentId;
        if (targetId && targetId !== sourceId) {
          addEdge(sourceId, targetId);
        }
        connectRef.current = null;
        setConnecting(null);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  });

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("[data-moment-id]")) return;
    panRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    setPanning(true);
    e.preventDefault();
  };

  const onNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    const node = getNode(nodeId);
    if (!node) return;
    const p = worldPoint(e.clientX, e.clientY);
    setSelectedId(nodeId);
    dragRef.current = { id: nodeId, dx: node.x - p.x, dy: node.y - p.y };
    setDragging(true);
    setDraggingId(nodeId);
    e.preventDefault();
  };

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clamp(z + (e.deltaY < 0 ? 0.06 : -0.06), 0.26, 1.35));
    };
    const wrap = canvasRef.current;
    wrap?.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap?.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const measure = () => {
      const r = canvasRef.current?.getBoundingClientRect();
      if (r) setCanvasSize({ width: r.width, height: r.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (canvasRef.current) observer.observe(canvasRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  /* ── keyboard: ESC + focus trap ────────────────────────── */
  const closeDialog = useCallback(() => {
    setOpenDialog("none");
    lastFocusedRef.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openDialog === "video") {
          closeDialog();
        } else if (openDialog !== "none") {
          closeDialog();
        }
      }
      if (e.key !== "Tab") return;
      const root = document.querySelector<HTMLElement>(
        '[data-moments-dialog="open"]',
      );
      if (!root) return;
      const items = Array.from(
        root.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled)",
        ),
      ).filter((el) => !el.hidden && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openDialog, closeDialog]);

  /* ── dialogs / overlays ────────────────────────────────── */
  const showDialog = useCallback(
    (name: "decision" | "seasonDirection" | "course" | "video" | "anchor") => {
      lastFocusedRef.current = document.activeElement as HTMLElement;
      setOpenDialog(name);
      requestAnimationFrame(() => {
        const root = document.querySelector('[data-moments-dialog="open"]');
        const focusable = root?.querySelector<HTMLElement>(
          "button:not(:disabled),a[href],input:not(:disabled)",
        );
        focusable?.focus();
      });
    },
    [],
  );

  const showCompletion = useCallback(() => {
    if (reviewTimer.current) clearInterval(reviewTimer.current);
    setReviewPlaying(false);
    setOverlay("completion");
    requestAnimationFrame(() => (document.querySelector("#startReview") as HTMLElement | null)?.focus());
  }, []);

  const openWorkspace = useCallback((tab: "plant" | "selected") => {
    setOverlay("none");
    setInspectorTabState(tab);
    setTimeout(() => {
      fitView();
      if (tab === "plant") (document.querySelector("#nodeUrl") as HTMLElement | null)?.focus();
    }, 50);
  }, [fitView]);

  const startReview = useCallback(() => {
    setOverlay("review");
    setReviewIndex(0);
    requestAnimationFrame(() => (document.querySelector("#reviewPlay") as HTMLElement | null)?.focus());
  }, []);

  const openDecision = useCallback(() => {
    if (reviewTimer.current) clearInterval(reviewTimer.current);
    setReviewPlaying(false);
    setOverlay("none");
    showDialog("decision");
  }, [showDialog]);

  const playReview = useCallback(() => {
    setReviewPlaying((playing) => {
      if (playing) {
        if (reviewTimer.current) clearInterval(reviewTimer.current);
        return false;
      }
      reviewTimer.current = setInterval(() => {
        setReviewIndex((i) => {
          if (i >= 4) {
            if (reviewTimer.current) clearInterval(reviewTimer.current);
            setReviewPlaying(false);
            openDecision();
            return i;
          }
          return i + 1;
        });
      }, 1800);
      return true;
    });
  }, [openDecision]);

  const removeNode = useCallback(
    (id: string) => {
      const node = getNode(id);
      if (!node) return;
      if (id === "root" || node.kind === "end") {
        showToast("뿌리와 시스템 완성 순간은 삭제할 수 없어요.");
        return;
      }
      if (!window.confirm(`${node.number}번째 순간을 삭제할까요?`)) return;
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
      setSelectedId("moment-100");
      if (anchorId === id) setAnchorId("moment-100");
      showToast("순간을 트리에서 삭제했어요.");
    },
    [anchorId, getNode, showToast],
  );

  const toggleLike = useCallback(
    (id: string) => {
      setLikes((prev) => {
        const state = prev[id] || { count: 0, likedByMe: false };
        const likedByMe = !state.likedByMe;
        const next = {
          ...state,
          likedByMe,
          count: Math.max(0, state.count + (likedByMe ? 1 : -1)),
        };
        showToast(
          likedByMe
            ? "좋아요를 남겼어요. 팬 온도는 변하지 않습니다."
            : "좋아요를 취소했어요. 팬 온도는 변하지 않습니다.",
        );
        return { ...prev, [id]: next };
      });
    },
    [showToast],
  );

  const [, setTempTick] = useState(0);

  const toggleReaction = useCallback(
    (id: string, tag: string) => {
      const data = viewerMomentReactions[id] || {
        scores: Object.fromEntries(tags.map((t) => [t, 0])) as Record<string, number>,
        participants: 0,
        my: [] as string[],
      };
      const index = data.my.indexOf(tag);
      if (index >= 0) {
        data.my.splice(index, 1);
        data.scores[tag] = Math.max(0, data.scores[tag] - 1);
        if (data.my.length === 0 && data.participants === 1) data.participants = 0;
        showToast(`${tag} 반응을 취소했어요.`);
      } else {
        if (data.my.length >= 2) {
          showToast("팬 느낌은 최대 2개까지 선택할 수 있어요.");
          return;
        }
        data.my.push(tag);
        data.scores[tag] = Math.min(100, (data.scores[tag] || 0) + 1);
        if (data.participants === 0) data.participants = 1;
        showToast(`${tag} 느낌을 남겼어요. 좋아요 수는 변하지 않습니다.`);
      }
      setTempTick((t) => t + 1);
    },
    [showToast],
  );

  const selectNode = useCallback(
    (id: string, tab?: "plant" | "selected" | "temperature") => {
      setSelectedId(id);
      if (tab) setInspectorTabState(tab);
    },
    [],
  );

  const setInspectorTab = useCallback((name: "plant" | "selected" | "temperature") => {
    setInspectorTabState(name);
    if (name === "temperature" && temperatureView === "moment") setTempTick((t) => t + 1);
  }, [temperatureView]);

  /* ── plant form submit ─────────────────────────────────── */
  const submitMoment = (e: React.FormEvent) => {
    e.preventDefault();
    const url = plantForm.nodeUrl.trim();
    if (plantForm.sourceType !== "note" && !url) {
      setPlantForm((f) => ({
        ...f,
        formError: "영상·사진·게시물 링크를 입력하거나 직접 기록을 선택해 주세요.",
      }));
      return;
    }
    const rawStart = plantForm.nodeStart.trim() || timeFromUrl(url);
    const rawEnd = plantForm.nodeEnd.trim();
    const start = rawStart ? normalizeTime(rawStart) : "";
    const end = rawEnd ? normalizeTime(rawEnd) : "";
    if (rawStart && !start) {
      setPlantForm((f) => ({ ...f, formError: "시작 시간은 01:30 또는 01:02:30 형식으로 적어주세요." }));
      return;
    }
    if (rawEnd && !end) {
      setPlantForm((f) => ({ ...f, formError: "끝 시간은 01:30 또는 01:02:30 형식으로 적어주세요." }));
      return;
    }
    if (start && end && timeToSeconds(end)! < timeToSeconds(start)!) {
      setPlantForm((f) => ({ ...f, formError: "끝 시간은 시작 시간보다 뒤에 있어야 해요." }));
      return;
    }
    if (!plantForm.selectedCreatorTags.length) {
      setPlantForm((f) => ({ ...f, formError: "이 순간의 느낌을 최소 1개 선택해 주세요." }));
      return;
    }
    const anchor = getNode(anchorId) || getNode("moment-100");
    if (!anchor) return;
    const id = `moment-${Date.now()}`;
    const yt = youtubeIdFromUrl(url);
    const kind =
      plantForm.sourceType === "video"
        ? "video"
        : plantForm.sourceType === "photo"
          ? "photo"
          : plantForm.sourceType === "post"
            ? "post"
            : "note";
    const title =
      plantForm.nodeTitle.trim() || (yt ? "다시 보고 싶었던 영상 속 순간" : `${nextNumber}번째 이어진 순간`);
    const relation =
      plantForm.selectedRelation === "직접 입력"
        ? plantForm.customRelation.trim() || "직접 이어진 이유"
        : plantForm.selectedRelation;
    const firstTag = plantForm.selectedCreatorTags[0];
    const color =
      firstTag === "섹시"
        ? palette.root
        : firstTag === "큐트"
          ? palette.scene
          : firstTag === "청순"
            ? palette.blue
            : firstTag === "설렘"
              ? palette.emotion
              : firstTag === "위로"
                ? palette.comfort
                : palette.end;
    const angle = -0.8 + (nextNumber % 5) * 0.38;
    const node: MomentNode = {
      id,
      number: nextNumber,
      kind,
      title,
      memo: plantForm.nodeMemo.trim() || "왜 마음이 움직였는지 남긴 한 줄",
      emotion: firstTag,
      tags: [...plantForm.selectedCreatorTags],
      platform: kind === "video" ? "YouTube" : "LoveTree",
      url,
      startTime: start || "",
      endTime: end || "",
      thumbnail: yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : "",
      date: new Date().toISOString().slice(0, 10),
      x: clamp(anchor.x + Math.cos(angle) * 370, 140, WORLD_W - 140),
      y: clamp(anchor.y + Math.sin(angle) * 310, 120, WORLD_H - 120),
      color,
      relation,
      likes: 0,
    };
    setNodes((prev) => [...prev, node]);
    setLikes((prev) => ({ ...prev, [id]: { count: 0, likedByMe: false } }));
    viewerMomentReactions[id] = {
      scores: Object.fromEntries(tags.map((t) => [t, 0])) as Record<string, number>,
      participants: 0,
      my: [],
    };
    setEdges((prev) => {
      const recent = prev.map((e) => ({ ...e, recent: false }));
      recent.push({ id: `edge-${Date.now()}`, source: anchor.id, target: id, label: relation, color, recent: true });
      return recent;
    });
    setTotalMomentCount((c) => c + 1);
    setNextNumber((n) => n + 1);
    setSelectedId(id);
    setAnchorId(id);
    if (seasonMode === "season2") {
      creatorTagScopeData.season2.label = `시즌 2 · ${totalMomentCount + 1 - 100}개의 순간`;
      plantForm.selectedCreatorTags.forEach((t) => {
        creatorTagScopeData.season2.scores[t] = Math.min(100, (creatorTagScopeData.season2.scores[t] || 0) + 1);
      });
      setTempTick((t) => t + 1);
    }
    setPlantForm((f) => ({
      ...f,
      nodeUrl: "",
      nodeTitle: "",
      nodeStart: "",
      nodeEnd: "",
      nodeMemo: "",
      formError: "",
    }));
    setDensity("representative");
    setInspectorTabState("selected");
    showToast(`${node.number}번째 순간이 같은 LoveTree에 이어졌어요 ✿`);
    setTimeout(() => fitView(), 50);
  };

  const beginSeason2 = useCallback(
    (direction: string) => {
      setSeasonMode("season2");
      setSeasonDirection(direction);
      setCreatorScope("season2");
      setAnchorId("moment-100");
      setInspectorTabState("plant");
      setOverlay("none");
      setOpenDialog("none");
      showToast(
        direction
          ? `시즌 2를 ‘${direction}’ 방향으로 시작했어요.`
          : "시즌 2를 방향 없이 시작했어요. 나중에 방향을 정할 수 있습니다.",
      );
    },
    [showToast],
  );

  const chooseDecision = useCallback(
    (decision: string) => {
      setOpenDialog("none");
      if (decision === "season2") {
        setOpenDialog("seasonDirection");
      } else if (decision === "continuous") {
        setSeasonMode("continuous");
        setAnchorId("moment-100");
        setInspectorTabState("plant");
        setOverlay("none");
        showToast("시즌 구분 없이 101번째 순간부터 계속 이어갑니다.");
      } else if (decision === "course") {
        setCourseSelection(["moment-1", "moment-24", "moment-50"]);
        setCourseView("builder");
        setCourseError("");
        setOpenDialog("course");
      }
    },
    [showToast],
  );

  /* ── derived render data ───────────────────────────────── */
  const selectedNode = getNode(selectedId);
  const anchorNode = getNode(anchorId) || getNode("moment-100");
  const reviewMoments = representativeMoments;
  const reviewNode = reviewMoments[reviewIndex];
  const submitLabel =
    seasonMode === "season2" ? "시즌 2의 첫 순간 심기" : `${nextNumber}번째 순간 심기`;

  const updateAnchorCard = (n: MomentNode | undefined) => ({
    number: n?.id === "root" ? "R" : n?.number ?? 100,
    title: n?.title ?? "100번째 마음이 피어난 날",
    subtitle: `${n?.number ?? 100}번째 순간에서 다음 마음을 이어갑니다.`,
  });
  const anchorCard = updateAnchorCard(anchorNode);

  const creatorNote = `대표 느낌 · ${plantForm.selectedCreatorTags[0] || "선택 필요"}${plantForm.selectedCreatorTags[1] ? ` / 보조 느낌 · ${plantForm.selectedCreatorTags[1]}` : ""}`;

  const scopeData = creatorTagScopeData[creatorScope];
  const subjectData = subjectFanAggregate[subjectSource][subjectPeriod];
  const periodLabel = { week: "최근 7일", month: "최근 30일", year: "최근 1년", all: "전체 기간" }[subjectPeriod];
  const selectedReactions = viewerMomentReactions[selectedId];

  const videoModalNode = openDialog === "video" ? getNode(selectedId) : null;

  const courseResult = useMemo(() => {
    if (courseView !== "result") return null;
    const selected = courseSelection.map((id) => getNode(id)).filter(Boolean) as MomentNode[];
    const name = courseName.trim() || "주연이 입덕 코스";
    const duration = selected.reduce((sum, n) => {
      const start = timeToSeconds(n.startTime);
      const end = timeToSeconds(n.endTime);
      return sum + (end !== null ? Math.max(20, end - (start || 0)) : 75);
    }, 0);
    return { selected, name, duration };
  }, [courseView, courseSelection, courseName, getNode]);

  const moveCourse = (id: string, delta: number) => {
    setCourseSelection((prev) => {
      const i = prev.indexOf(id);
      const next = clamp(i + delta, 0, prev.length - 1);
      if (i === next || i < 0) return prev;
      const copy = [...prev];
      copy.splice(i, 1);
      copy.splice(next, 0, id);
      return copy;
    });
  };

  const createCourse = () => {
    if (courseSelection.length < 2) {
      setCourseError("입덕 코스에는 최소 2개 이상의 순간이 필요합니다.");
      return;
    }
    setCourseError("");
    setCourseView("result");
  };

  const copyCourseLink = async () => {
    const value = "https://lovetree.demo/course/juyoun-season-1";
    try {
      await navigator.clipboard.writeText(value);
      showToast("데모 링크를 클립보드에 복사했어요.");
    } catch {
      showToast(`데모 링크: ${value}`);
    }
  };

  const openVideo = (id: string) => {
    const node = getNode(id);
    if (!node || node.kind !== "video") {
      showToast("이 순간은 영상이 아니라 카드 원문으로 감상합니다.");
      return;
    }
    setSelectedId(id);
    showDialog("video");
  };

  const layoutHelp =
    {
      radial: "감정적 인과관계를 중심으로 자유롭게 펼쳐 봅니다.",
      tree: "뿌리에서 가지가 자라듯 계층형 구조로 봅니다.",
      circle: "중심 주위에 모든 순간을 모아 전체 결을 조망합니다.",
      grid: "순간 카드를 번호 순서로 비교하기 쉽게 정렬합니다.",
      timeline: "기록 순서와 날짜 흐름을 따라 이동합니다.",
    }[layout] || "";

  /* ══ render ═════════════════════════════════════════════ */
  return (
    <div
      className="v4-moments-page"
      data-season={seasonMode}
      style={{ height: "100vh", minHeight: 0 }}
    >
      <div className="v4-moments-app">
        <header className="v4-moments-topbar">
          <button
            className="v4-moments-brand"
            type="button"
            onClick={showCompletion}
            aria-label="LoveTree 시즌 완성 화면으로 돌아가기"
          >
            <span className="v4-moments-brand-mark" aria-hidden="true">
              <i />
              <b />
              <em />
            </span>
            <span>
              <strong>러브트리</strong>
              <small>LoveTree · Juyoun</small>
            </span>
          </button>

          <div className="v4-moments-toolbar" aria-label="트리 보기 도구">
            <div className="v4-moments-tool-group" role="group" aria-label="트리 보기">
              {[
                ["radial", "마음 연결"],
                ["tree", "성장 트리"],
                ["circle", "원형 보기"],
                ["grid", "격자 보기"],
                ["timeline", "시간 흐름"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={`v4-moments-view-btn${layout === key ? " active" : ""}`}
                  type="button"
                  data-layout={key}
                  onClick={() => applyLayout(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="v4-moments-tool-group" role="group" aria-label="확대 축소">
              <button className="v4-moments-tool-btn" id="zoomOut" type="button" aria-label="축소" onClick={() => zoomAround(zoom - 0.1)}>
                −
              </button>
              <span className="v4-moments-zoom-label" id="zoomLabel" data-testid="zoom-label">
                {Math.round(zoom * 100)}%
              </span>
              <button className="v4-moments-tool-btn" id="zoomIn" type="button" aria-label="확대" onClick={() => zoomAround(zoom + 0.1)}>
                ＋
              </button>
              <button className="v4-moments-tool-btn" id="fitView" type="button" onClick={fitView}>
                한눈에
              </button>
            </div>
          </div>

          <div className="v4-moments-top-status">
            <span className="v4-moments-season-live" id="seasonLive">
              {seasonMode === "season2" ? "시즌 2 · 성장 중" : "시즌 구분 없이 성장 중"}
            </span>
            <button className="v4-moments-season-return" id="seasonReturn" type="button" onClick={showCompletion}>
              <i aria-hidden="true">✿</i>
              <span>
                <strong id="seasonReturnTitle">{seasonMode === "season2" ? "시즌 1 완성본" : "시즌 1 완성 ✓"}</strong>
                <small>다시 돌아보기</small>
              </span>
            </button>
          </div>
        </header>

        <main className="v4-moments-workspace" id="workspace">
          <section className="v4-moments-graph-panel v4-moments-panel" aria-labelledby="graphTitle">
            <header className="v4-moments-graph-head">
              <div className="v4-moments-graph-title">
                <p className="v4-moments-eyebrow">ONE PERSON · ONE LOVETREE</p>
                <h1 id="graphTitle">주연이의 러브트리</h1>
                <p id="layoutHelp">{layoutHelp}</p>
              </div>
              <div className="v4-moments-graph-meta">
                <div className="v4-moments-path-switch" role="group" aria-label="표시 범위">
                  <button
                    className={density === "representative" ? "active" : ""}
                    type="button"
                    data-density="representative"
                    onClick={() => {
                      setDensity("representative");
                      setTimeout(() => fitView(), 30);
                    }}
                  >
                    대표 경로
                  </button>
                  <button
                    className={density === "all" ? "active" : ""}
                    type="button"
                    data-density="all"
                    onClick={() => {
                      setDensity("all");
                      setTimeout(() => fitView(), 30);
                    }}
                  >
                    전체 100개
                  </button>
                </div>
                <span className="v4-moments-view-state" id="viewState">
                  {density === "all" ? `전체 ${totalMomentCount}개의 순간을 보는 중` : "대표 순간 5개를 보는 중"}
                </span>
                <span className="v4-moments-moment-count" id="momentCount" data-testid="moment-count">
                  {totalMomentCount} moments
                </span>
              </div>
            </header>
            <div
              className={`v4-moments-canvas-wrap${panning || dragging ? " dragging" : ""}`}
              id="canvasWrap"
              ref={canvasRef}
              tabIndex={0}
              aria-label="러브트리 그래프. 드래그하여 이동하고 휠 또는 버튼으로 확대 축소할 수 있습니다."
              onPointerDown={onCanvasPointerDown}
            >
              <div
                className="v4-moments-canvas-space"
                style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})` }}
              >
                <svg className="v4-moments-edges-svg" viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} aria-hidden="true">
                  <defs>
                    <marker id="v4mArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L0,6 L8,3 z" fill="#b78e8d" />
                    </marker>
                  </defs>
                  {visibleEdges.map((edge) => {
                    const s = getNode(edge.source);
                    const t = getNode(edge.target);
                    if (!s || !t) return null;
                    const dx = t.x - s.x;
                    const c1x = s.x + dx * 0.42;
                    const c2x = t.x - dx * 0.42;
                    const d = `M ${s.x} ${s.y} C ${c1x} ${s.y}, ${c2x} ${t.y}, ${t.x} ${t.y}`;
                    return (
                      <g key={edge.id}>
                        {!edge.generic && (
                          <path className="v4-moments-edge-back" d={d} />
                        )}
                        <path
                          className={`v4-moments-edge-path${edge.recent ? " recent" : ""}`}
                          d={d}
                          style={{ "--edge": edge.generic ? "rgba(143,122,114,.25)" : edge.color } as React.CSSProperties}
                          markerEnd={edge.generic ? undefined : "url(#v4mArrow)"}
                        />
                        {!edge.generic && (
                          <>
                            <path className="v4-moments-edge-shine" d={d} />
                            {edge.label && (
                              <g
                                className="v4-moments-edge-label"
                                transform={`translate(${(s.x + t.x) / 2 - Math.max(64, edge.label.length * 13 + 26) / 2} ${(s.y + t.y) / 2 - 12 - 15})`}
                              >
                                <rect width={Math.max(64, edge.label.length * 13 + 26)} height={29} rx={14.5} />
                                <text x={Math.max(64, edge.label.length * 13 + 26) / 2} y={19} textAnchor="middle">
                                  {edge.label}
                                </text>
                              </g>
                            )}
                          </>
                        )}
                      </g>
                    );
                  })}
                  {connecting && (() => {
                    const s = getNode(connecting.sourceId);
                    if (!s) return null;
                    return (
                      <path
                        className="v4-moments-temp-path"
                        d={`M ${s.x} ${s.y} C ${s.x + 90} ${s.y}, ${connecting.x - 90} ${connecting.y}, ${connecting.x} ${connecting.y}`}
                      />
                    );
                  })()}
                </svg>
                <div className="v4-moments-nodes-layer" id="nodesLayer">
                  {visibleNodes.map((node) => {
                    if (density === "all" && !isRepresentative(node)) {
                      return (
                        <button
                          key={node.id}
                          className={`v4-moments-mini-node${selectedId === node.id ? " selected" : ""}`}
                          type="button"
                          data-moment-id={node.id}
                          data-testid={`mini-node-${node.id}`}
                          style={{
                            left: node.x,
                            top: node.y,
                            ["--node-color" as string]: node.color,
                          }}
                          aria-label={`${node.number}번째 순간 · ${node.title}`}
                          onClick={() => selectNode(node.id, "selected")}
                          onPointerDown={(e) => onNodePointerDown(e, node.id)}
                        >
                          <span>{node.number}</span>
                        </button>
                      );
                    }
                    const isVideo = node.kind === "video";
                    const thumb = isVideo ? (
                      <div className="v4-moments-node-thumb">
                        {node.thumbnail && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={node.thumbnail} alt={`${node.title} 썸네일`} loading="lazy" />
                        )}
                        <button
                          className="v4-moments-node-play"
                          type="button"
                          data-open-video
                          aria-label={`${node.title} 구간 재생`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openVideo(node.id);
                          }}
                        >
                          ▶
                        </button>
                      </div>
                    ) : null;
                    const symbol = isVideo ? null : (
                      <div className="v4-moments-node-symbol">{icons[node.kind] || "✦"}</div>
                    );
                    const kindClass = [
                      "v4-moments-node",
                      node.kind === "root" ? "root" : "",
                      isVideo ? "video" : "",
                      node.kind === "end" || node.kind === "turning" ? "milestone" : "",
                      selectedId === node.id ? "selected" : "",
                      dragging && draggingId === node.id ? "dragging" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <article
                        key={node.id}
                        className={kindClass}
                        data-moment-id={node.id}
                        data-testid={`node-${node.id}`}
                        style={{
                          left: node.x,
                          top: node.y,
                          ["--node-color" as string]: node.color,
                        }}
                        aria-label={node.title}
                        onPointerDown={(e) => onNodePointerDown(e, node.id)}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("button")) return;
                          selectNode(node.id, "selected");
                        }}
                      >
                        {thumb}
                        <div className="v4-moments-node-head">
                          <span className="v4-moments-node-kind">{kindLabels[node.kind] || "MOMENT"}</span>
                          <div className="v4-moments-node-actions">
                            <span className="v4-moments-node-index">
                              {node.id === "root" ? "ROOT" : String(node.number).padStart(2, "0")}
                            </span>
                            <button
                              className="v4-moments-node-icon-btn"
                              type="button"
                              aria-label="이 순간에서 다음 순간 추가"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAnchorId(node.id);
                                setSelectedId(node.id);
                                setInspectorTabState("plant");
                                showToast("이 순간에서 다음 마음을 이어갈 준비가 되었어요.");
                              }}
                            >
                              ＋
                            </button>
                          </div>
                        </div>
                        {symbol}
                        <div className="v4-moments-node-copy">
                          <h3>{node.title}</h3>
                          <p>{node.memo}</p>
                          <div className="v4-moments-node-meta">
                            <span className="v4-moments-emotion-chip">{node.emotion}</span>
                            <span>{node.date || "날짜 미정"}</span>
                          </div>
                          {rangeLabel(node) && (
                            <div className="v4-moments-node-time">
                              <span>기억할 구간</span>
                              <strong>{rangeLabel(node)}</strong>
                            </div>
                          )}
                        </div>
                        <span className="v4-moments-handle in" aria-hidden="true" />
                        <button
                          className="v4-moments-handle out"
                          type="button"
                          aria-label="연결선 시작"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const card = (e.target as HTMLElement).closest("[data-moment-id]");
                            if (card) {
                              connectRef.current = {
                                sourceId: card.getAttribute("data-moment-id")!,
                                pointer: worldPoint(e.clientX, e.clientY),
                              };
                              setConnecting({ ...connectRef.current.pointer, sourceId: connectRef.current.sourceId });
                            }
                            e.preventDefault();
                          }}
                        />
                      </article>
                    );
                  })}
                </div>
              </div>
              <div className="v4-moments-minimap" id="miniMap" aria-hidden="true">
                {visibleNodes.map((node) => (
                  <span
                    key={node.id}
                    className="v4-moments-mini-dot"
                    style={{
                      left: `${(node.x / WORLD_W) * 100}%`,
                      top: `${(node.y / WORLD_H) * 100}%`,
                      ["--dot" as string]: node.color,
                    }}
                  />
                ))}
                <span
                  className="v4-moments-mini-viewport"
                  style={{
                    left: `${clamp((-pan.x / zoom / WORLD_W) * 100, 0, 95)}%`,
                    top: `${clamp((-pan.y / zoom / WORLD_H) * 100, 0, 95)}%`,
                    width: `${clamp((canvasSize.width || 600) / zoom / WORLD_W * 100, 5, 100)}%`,
                    height: `${clamp((canvasSize.height || 400) / zoom / WORLD_H * 100, 5, 100)}%`,
                  }}
                />
              </div>
              <div className="v4-moments-canvas-hint" id="canvasHint">
                {density === "all"
                  ? "작은 노드도 선택·포커스할 수 있으며 대표 순간은 꽃과 큰 테두리로 구분됩니다."
                  : "큰 카드와 관계 이유를 따라 시즌 1의 대표 경로를 감상할 수 있습니다."}
              </div>
            </div>
          </section>

          <aside className="v4-moments-inspector v4-moments-panel" id="inspector" aria-labelledby="inspectorTitle">
            <header className="v4-moments-inspector-head">
              <h2 id="inspectorTitle">다음 마음 이어가기</h2>
              <p>입력·선택 정보·온도를 탭으로 나누어 필요한 일만 빠르게 처리합니다.</p>
              <div className="v4-moments-inspector-tabs" role="tablist" aria-label="오른쪽 작업 패널">
                {(
                  [
                    ["plant", "순간 심기"],
                    ["selected", "선택한 순간"],
                    ["temperature", "온도"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    className={inspectorTab === key ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={inspectorTab === key}
                    aria-controls={`panel-${key}`}
                    onClick={() => setInspectorTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </header>

            <div className="v4-moments-tab-panels">
              <section
                className="v4-moments-tab-panel"
                id="panel-plant"
                role="tabpanel"
                hidden={inspectorTab !== "plant"}
              >
                <form id="addForm" onSubmit={submitMoment} noValidate>
                  <div className="v4-moments-section-card">
                    <div className="v4-moments-section-title">
                      <strong>1 · 이어질 출발점</strong>
                      <small>가지의 시작</small>
                    </div>
                    <div className="v4-moments-anchor-card">
                      <i id="anchorNumber" data-testid="anchor-number">{anchorCard.number}</i>
                      <span>
                        <strong id="anchorTitle">{anchorCard.title}</strong>
                        <small id="anchorSubtitle">이 순간에서 다음 마음을 이어갑니다.</small>
                      </span>
                      <button
                        id="changeAnchor"
                        type="button"
                        onClick={() => {
                          setOpenDialog("anchor");
                        }}
                      >
                        다른 순간 선택
                      </button>
                    </div>
                  </div>

                  <div className="v4-moments-section-card">
                    <div className="v4-moments-section-title">
                      <strong>2 · 영상 또는 콘텐츠 링크</strong>
                      <small>데모 자동 채움</small>
                    </div>
                    <div className="v4-moments-source-types" role="group" aria-label="콘텐츠 종류">
                      {[
                        ["video", "YouTube"],
                        ["photo", "사진 링크"],
                        ["post", "게시물 링크"],
                        ["note", "직접 기록"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={plantForm.sourceType === key ? "active" : ""}
                          onClick={() =>
                            setPlantForm((f) => ({ ...f, sourceType: key as string }))
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {plantForm.sourceType !== "note" && (
                      <div className="v4-moments-field">
                        <label htmlFor="nodeUrl">
                          링크 <span>붙여 넣으면 제목과 썸네일을 데모로 채워요</span>
                        </label>
                        <input
                          className="v4-moments-input"
                          id="nodeUrl"
                          type="url"
                          placeholder="https://youtube.com/watch?v=...&t=1m30s"
                          value={plantForm.nodeUrl}
                          onChange={(e) => setPlantForm((f) => ({ ...f, nodeUrl: e.target.value }))}
                        />
                        {(plantForm.nodeUrl || (youtubeIdFromUrl(plantForm.nodeUrl) && plantForm.sourceType === "video")) && (
                          <div className="v4-moments-metadata-preview" data-testid="metadata-preview">
                            {youtubeIdFromUrl(plantForm.nodeUrl) && plantForm.sourceType === "video" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`https://img.youtube.com/vi/${youtubeIdFromUrl(plantForm.nodeUrl)}/hqdefault.jpg`}
                                alt=""
                              />
                            ) : (
                              <span className="v4-moments-metadata-fallback" />
                            )}
                            <span>
                              <strong id="metadataTitle">
                                {plantForm.sourceType === "video" && youtubeIdFromUrl(plantForm.nodeUrl)
                                  ? "다시 보고 싶었던 영상 속 순간"
                                  : plantForm.sourceType === "photo"
                                    ? "사진에서 발견한 마음"
                                    : "게시물에서 발견한 한 장면"}
                              </strong>
                              <small>HTML 데모 자동 채움 · 실제 메타데이터 연결은 제품 구현 단계에서 처리합니다.</small>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="v4-moments-field">
                      <label htmlFor="nodeTitle">
                        3 · 순간 이름 <span>자동 제목을 수정할 수 있어요</span>
                      </label>
                      <input
                        className="v4-moments-input"
                        id="nodeTitle"
                        placeholder="비워두면 자동 제목을 사용해요"
                        value={plantForm.nodeTitle}
                        onChange={(e) => setPlantForm((f) => ({ ...f, nodeTitle: e.target.value }))}
                      />
                    </div>
                    <div className="v4-moments-time-grid">
                      <div className="v4-moments-field">
                        <label htmlFor="nodeStart">4 · 시작 시간</label>
                        <input
                          className="v4-moments-input"
                          id="nodeStart"
                          inputMode="numeric"
                          placeholder="01:30"
                          value={plantForm.nodeStart}
                          onChange={(e) => setPlantForm((f) => ({ ...f, nodeStart: e.target.value }))}
                        />
                      </div>
                      <div className="v4-moments-field">
                        <label htmlFor="nodeEnd">
                          끝 시간 <span>선택</span>
                        </label>
                        <input
                          className="v4-moments-input"
                          id="nodeEnd"
                          inputMode="numeric"
                          placeholder="02:05"
                          value={plantForm.nodeEnd}
                          onChange={(e) => setPlantForm((f) => ({ ...f, nodeEnd: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="v4-moments-section-card">
                    <div className="v4-moments-section-title">
                      <strong>5 · 이 순간의 느낌</strong>
                      <small>최소 1개 · 최대 2개</small>
                    </div>
                    <div className="v4-moments-keyword-grid" id="creatorKeywords">
                      {tags.map((tag) => {
                        const i = plantForm.selectedCreatorTags.indexOf(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            className={`v4-moments-keyword-btn${i >= 0 ? " active" : ""}`}
                            data-creator-tag={tag}
                            onClick={() => {
                              setPlantForm((f) => {
                                const idx = f.selectedCreatorTags.indexOf(tag);
                                if (idx >= 0) {
                                  if (f.selectedCreatorTags.length === 1) {
                                    showToast("이 순간의 느낌은 최소 1개를 남겨주세요.");
                                    return f;
                                  }
                                  const next = [...f.selectedCreatorTags];
                                  next.splice(idx, 1);
                                  return { ...f, selectedCreatorTags: next };
                                }
                                if (f.selectedCreatorTags.length >= 2) {
                                  showToast("이 순간의 느낌은 최대 2개까지 선택할 수 있어요.");
                                  return f;
                                }
                                return { ...f, selectedCreatorTags: [...f.selectedCreatorTags, tag] };
                              });
                            }}
                          >
                            {tag}
                            <span className="order">{i >= 0 ? i + 1 : ""}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="v4-moments-keyword-note" id="creatorKeywordNote">
                      {creatorNote}
                    </p>
                    <div className="v4-moments-field">
                      <label htmlFor="nodeMemo">6 · 이 순간에 남길 한 줄</label>
                      <textarea
                        id="nodeMemo"
                        placeholder="왜 마음이 움직였는지 짧게 남겨주세요."
                        value={plantForm.nodeMemo}
                        onChange={(e) => setPlantForm((f) => ({ ...f, nodeMemo: e.target.value }))}
                      />
                    </div>
                    <div className="v4-moments-field">
                      <label>7 · 왜 이 순간으로 이어졌나요?</label>
                      <div className="v4-moments-choice-row" id="relationChoices">
                        {RELATIONS.map((rel) => (
                          <button
                            key={rel}
                            type="button"
                            className={`v4-moments-choice-btn${plantForm.selectedRelation === rel ? " active" : ""}`}
                            onClick={() =>
                              setPlantForm((f) => ({
                                ...f,
                                selectedRelation: rel,
                                customRelation: rel === "직접 입력" ? f.customRelation : f.customRelation,
                              }))
                            }
                          >
                            {rel}
                          </button>
                        ))}
                      </div>
                      {plantForm.selectedRelation === "직접 입력" && (
                        <input
                          className="v4-moments-input"
                          id="customRelation"
                          placeholder="연결 이유를 직접 적어주세요"
                          value={plantForm.customRelation}
                          onChange={(e) => setPlantForm((f) => ({ ...f, customRelation: e.target.value }))}
                        />
                      )}
                    </div>
                    <p className={`v4-moments-form-error${plantForm.formError ? " show" : ""}`} role="alert">
                      {plantForm.formError}
                    </p>
                    <button className="v4-moments-primary-btn" id="submitMoment" type="submit" style={{ marginTop: 10 }}>
                      {submitLabel}
                    </button>
                  </div>
                </form>
              </section>

              <section
                className="v4-moments-tab-panel"
                id="panel-selected"
                role="tabpanel"
                hidden={inspectorTab !== "selected"}
              >
                {!selectedNode ? (
                  <div className="v4-moments-empty-temp">
                    <i>✿</i>순간 카드를 하나 선택해 주세요.
                  </div>
                ) : (
                  (() => {
                    const node = selectedNode;
                    const typeMap: Record<string, string> = {
                      video: "영상",
                      photo: "사진",
                      note: "메모",
                      quote: "인터뷰 문장",
                      turning: "감정 전환점",
                      end: "완성 순간",
                      root: "러브트리 뿌리",
                      post: "게시물",
                    };
                    const type = typeMap[node.kind] || "게시물";
                    const incoming = edges.find((e) => e.target === node.id);
                    const outgoing = edges.filter((e) => e.source === node.id);
                    const like = likes[node.id] || { count: 0, likedByMe: false };
                    return (
                      <div className="v4-moments-selected-hero" data-testid="selected-panel">
                        <div className="v4-moments-selected-media">
                          {node.kind === "video" && node.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={node.thumbnail} alt={`${node.title} 썸네일`} loading="lazy" />
                          ) : (
                            <span className="symbol">{icons[node.kind] || "✦"}</span>
                          )}
                        </div>
                        <div className="v4-moments-selected-body">
                          <div className="v4-moments-selected-kicker">
                            <span>
                              {type} · {node.id === "root" ? "ROOT" : `${node.number}번째`}
                            </span>
                            <span>{node.date || "날짜 미정"}</span>
                          </div>
                          <h3>{node.title}</h3>
                          <p>{node.memo}</p>
                          <div className="v4-moments-detail-list">
                            <div className="v4-moments-detail-row">
                              <span>기억할 시간</span>
                              <strong>{rangeLabel(node) || "해당 없음"}</strong>
                            </div>
                            <div className="v4-moments-detail-row">
                              <span>작성자가 붙인 느낌</span>
                              <div className="v4-moments-tag-list">
                                {node.tags.map((t) => (
                                  <span key={t} className="v4-moments-tag">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="v4-moments-detail-row">
                              <span>이전 순간</span>
                              <strong>{incoming ? getNode(incoming.source)?.title || "없음" : "없음"}</strong>
                            </div>
                            <div className="v4-moments-detail-row">
                              <span>다음 순간</span>
                              <strong>
                                {outgoing.length
                                  ? outgoing.map((e) => getNode(e.target)?.title || "").join(", ")
                                  : "아직 없음"}
                              </strong>
                            </div>
                            <div className="v4-moments-detail-row">
                              <span>연결 이유</span>
                              <strong>{incoming?.label || node.relation || "첫 시작"}</strong>
                            </div>
                          </div>
                          <button
                            className={`v4-moments-like-button${like.likedByMe ? " active" : ""}`}
                            id="selectedLike"
                            type="button"
                            onClick={() => toggleLike(node.id)}
                          >
                            {like.likedByMe ? "♥ 좋아요 취소" : "♡ 좋아요"} <span>{like.count}</span>
                          </button>
                          <div className="v4-moments-selected-actions">
                            {node.kind === "video" && (
                              <button type="button" id="selectedPlay" onClick={() => openVideo(node.id)}>
                                지정 구간 재생
                              </button>
                            )}
                            <button
                              type="button"
                              id="showFanReaction"
                              onClick={() => {
                                setTemperatureView("moment");
                                setInspectorTabState("temperature");
                              }}
                            >
                              팬 반응 보기
                            </button>
                            <button
                              className="wide"
                              type="button"
                              id="selectedAdd"
                              onClick={() => {
                                setAnchorId(node.id);
                                setInspectorTabState("plant");
                              }}
                            >
                              다음 순간 이어 붙이기
                            </button>
                            <button
                              type="button"
                              id="selectedEdit"
                              onClick={() => {
                                setAnchorId(node.id);
                                setInspectorTabState("plant");
                                setPlantForm((f) => ({
                                  ...f,
                                  nodeTitle: node.title,
                                  nodeMemo: node.memo,
                                }));
                                showToast("데모 폼에 선택한 순간의 내용을 불러왔어요.");
                              }}
                            >
                              수정
                            </button>
                            <button
                              className="danger"
                              type="button"
                              id="selectedDelete"
                              disabled={node.id === "root" || node.kind === "end"}
                              onClick={() => removeNode(node.id)}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </section>

              <section
                className="v4-moments-tab-panel"
                id="panel-temperature"
                role="tabpanel"
                hidden={inspectorTab !== "temperature"}
              >
                <div className="v4-moments-temperature-tabs" role="tablist" aria-label="온도 데이터 범위">
                  {(
                    [
                      ["creator", "나의 트리 결"],
                      ["moment", "이 순간의 팬 반응"],
                      ["subject", "주연 전체 팬 온도"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      className={temperatureView === key ? "active" : ""}
                      type="button"
                      onClick={() => {
                        setTemperatureView(key);
                        if (key === "moment") setTempTick((t) => t + 1);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {temperatureView === "creator" && (
                  <div data-testid="temp-creator">
                    <p className="v4-moments-temp-description">
                      내가 이 러브트리에 심은 순간과 키워드가 어떤 분위기로 쌓였는지 보여줘요. 해당 인물의 객관적 평가가 아닙니다.
                    </p>
                    <div className="v4-moments-filter-row">
                      {[
                        ["all", "전체"],
                        ["season1", "시즌 1"],
                        ["season2", "시즌 2"],
                        ["branch", "현재 가지"],
                        ["theme", "테마 가지"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={creatorScope === key ? "active" : ""}
                          onClick={() => setCreatorScope(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="v4-moments-section-card">
                      <div className="v4-moments-section-title">
                        <strong>나의 트리 결</strong>
                        <small>{creatorTagScopeData[creatorScope].label}</small>
                      </div>
                      <div className="v4-moments-temperature-list">
                        {tags.map((tag) => (
                          <div key={tag} className="v4-moments-temp-item" data-testid="temp-bar-creator">
                            <span>{tag}</span>
                            <div className="v4-moments-temp-bar">
                              <i style={{ "--value": `${scopeData.scores[tag] || 0}%`, "--bar": tempColor(tag) } as React.CSSProperties} />
                            </div>
                            <strong>{scopeData.scores[tag] || 0}%</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {temperatureView === "moment" && selectedNode && (
                  <div data-testid="temp-moment">
                    <p className="v4-moments-temp-description">
                      이 순간에 팬들이 남긴 반응이에요. 나도 이 순간의 느낌을 최대 2개까지 남길 수 있어요.
                    </p>
                    <div className="v4-moments-section-card">
                      <div className="v4-moments-section-title">
                        <strong>{selectedNode.title}</strong>
                        <small>팬 반응</small>
                      </div>
                      <div className="v4-moments-temperature-list">
                        {tags.map((tag) => {
                          const scores = selectedReactions?.scores || {};
                          return (
                            <div key={tag} className="v4-moments-temp-item">
                              <span>{tag}</span>
                              <div className="v4-moments-temp-bar">
                                <i style={{ "--value": `${scores[tag] || 0}%`, "--bar": tempColor(tag) } as React.CSSProperties} />
                              </div>
                              <strong>{scores[tag] || 0}°</strong>
                            </div>
                          );
                        })}
                      </div>
                      <div className="v4-moments-reaction-choices">
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className={selectedReactions?.my.includes(tag) ? "active" : ""}
                            onClick={() => toggleReaction(selectedNode.id, tag)}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {temperatureView === "subject" && (
                  <div data-testid="temp-subject">
                    <p className="v4-moments-temp-description">
                      공개된 모든 주연이 Moment에서 팬이 선택한 반응을 종합한 데모 데이터입니다.
                    </p>
                    <div className="v4-moments-filter-row">
                      {[
                        ["all", "전체"],
                        ["official", "공식 트리"],
                        ["fan", "팬 트리"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={subjectSource === key ? "active" : ""}
                          onClick={() => setSubjectSource(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="v4-moments-filter-row">
                      {[
                        ["week", "7일"],
                        ["month", "30일"],
                        ["year", "1년"],
                        ["all", "전체 기간"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={subjectPeriod === key ? "active" : ""}
                          onClick={() => setSubjectPeriod(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="v4-moments-section-card">
                      <div className="v4-moments-section-title">
                        <strong>주연 전체 팬 온도</strong>
                        <small>데모 데이터 · {periodLabel}</small>
                      </div>
                      <div className="v4-moments-temperature-meta">
                        <div>
                          <strong>{subjectData.moments.toLocaleString()}</strong>
                          <span>공개 순간 수</span>
                        </div>
                        <div>
                          <strong>{subjectData.participants.toLocaleString()}</strong>
                          <span>고유 참여자 수</span>
                        </div>
                      </div>
                      <div className="v4-moments-temperature-list">
                        {tags.map((tag) => (
                          <div key={tag} className="v4-moments-temp-item" data-testid="temp-bar-subject">
                            <span>{tag}</span>
                            <div className="v4-moments-temp-bar">
                              <i style={{ "--value": `${subjectData.scores[tag] || 0}%`, "--bar": tempColor(tag) } as React.CSSProperties} />
                            </div>
                            <strong>{subjectData.scores[tag] || 0}°</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </aside>
        </main>

        {/* ── completion overlay ─────────────────────────────── */}
        <section
          className="v4-moments-overlay"
          id="completionOverlay"
          data-hidden={overlay !== "completion" ? "true" : "false"}
          aria-labelledby="completionTitle"
        >
          <div className="v4-moments-completion-card">
            <div className="v4-moments-completion-copy">
              <p className="v4-moments-eyebrow">SEASON 01 · 100 MOMENTS COMPLETE</p>
              <h1 id="completionTitle">
                100개의 순간이
                <br />
                <span>첫 번째 계절이 되었어요</span>
              </h1>
              <p>
                처음 마음이 멈춘 장면부터 위로가 된 순간까지, 주연이를 좋아하게 된 마음의 흐름이 한 계절로 완성되었습니다.
              </p>
              <div className="v4-moments-completion-actions">
                <button className="primary" id="startReview" type="button" onClick={startReview}>
                  시즌 1 돌아보기 ✿
                </button>
                <button
                  className="secondary"
                  id="plant101Now"
                  type="button"
                  onClick={() => {
                    setAnchorId("moment-100");
                    setInspectorTabState("plant");
                    setOverlay("none");
                    setTimeout(() => fitView(), 40);
                  }}
                >
                  바로 101번째 순간 심기
                </button>
              </div>
              <button
                className="v4-moments-completion-link"
                id="openTreeOnly"
                type="button"
                onClick={() => {
                  setSelectedId("moment-100");
                  setInspectorTabState("selected");
                  setOverlay("none");
                  setTimeout(() => fitView(), 40);
                }}
              >
                트리만 먼저 보기 →
              </button>
              <div className="v4-moments-stat-strip" aria-label="시즌 1 완성 통계">
                <div className="v4-moments-stat-pill">
                  <span>대표 감정</span>
                  <strong>설렘</strong>
                </div>
                <div className="v4-moments-stat-pill">
                  <span>가장 많이 자란 결</span>
                  <strong>섹시 · 34%</strong>
                </div>
                <div className="v4-moments-stat-pill">
                  <span>마음의 전환점</span>
                  <strong>50번째 순간</strong>
                </div>
                <div className="v4-moments-stat-pill">
                  <span>가장 사랑받은 순간</span>
                  <strong>24번째 무대</strong>
                </div>
                <div className="v4-moments-stat-pill">
                  <span>나와 팬의 반응 차이</span>
                  <strong>78번째 위로</strong>
                </div>
              </div>
            </div>
            <div className="v4-moments-completion-art" aria-hidden="true">
              <svg className="v4-moments-completion-branch" viewBox="0 0 650 560">
                <path d="M310 540 C320 410 290 350 330 250 C370 160 450 120 540 60" />
                <path className="twig" d="M330 300 C250 250 180 235 100 185" />
                <path className="twig" d="M345 260 C430 250 500 265 605 220" />
                <path className="twig" d="M305 390 C220 370 150 390 70 355" />
                <path className="twig" d="M370 215 C350 150 320 110 280 65" />
              </svg>
              <div className="v4-moments-paper-note main-note">
                오늘의 한 줄 ♡
                <br />
                <br />
                처음의 낯선 설렘이
                <br />
                지금의 나를 따뜻하게
                <br />
                만들어줘서 고마워.
              </div>
              <div className="v4-moments-paper-note small-note">
                기억
                <br />
                <br />
                네가 웃던 장면이
                <br />
                내 하루의 위로가 되었어.
              </div>
              <div className="v4-moments-polaroid one">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg" alt="" />
                <strong>처음 발견한 순간</strong>
                <small>2026.04.20 · 01</small>
              </div>
              <div className="v4-moments-polaroid two">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://img.youtube.com/vi/aqz-KE-bpKQ/hqdefault.jpg" alt="" />
                <strong>100번째 마음이 핀 날</strong>
                <small>2026.08.02 · 100</small>
              </div>
              <div className="v4-moments-polaroid three">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg" alt="" />
                <strong>위로가 된 순간</strong>
                <small>02:10–03:04</small>
              </div>
              <span className="v4-moments-pressed-flower v4-moments-flower-a">❀</span>
              <span className="v4-moments-pressed-flower v4-moments-flower-b">❁</span>
              <span className="v4-moments-pressed-flower v4-moments-flower-c">✿</span>
            </div>
          </div>
        </section>

        {/* ── review overlay ─────────────────────────────────── */}
        <section
          className="v4-moments-overlay"
          id="reviewOverlay"
          data-hidden={overlay !== "review" ? "true" : "false"}
          aria-labelledby="reviewTitle"
        >
          <div className="v4-moments-review-shell">
            <section className="v4-moments-review-stage">
              <header className="v4-moments-review-stage-head">
                <div>
                  <p className="v4-moments-eyebrow">SEASON 01 REPLAY</p>
                  <h2 id="reviewTitle">처음부터 다시 걷는 마음</h2>
                </div>
                <div className="v4-moments-review-modes" role="group" aria-label="회고 보기">
                  {(
                    [
                      ["play", "처음부터 재생"],
                      ["timeline", "시간 흐름으로 보기"],
                      ["connection", "마음 연결로 보기"],
                      ["representative", "대표 순간만 보기"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={reviewMode === key ? "active" : ""}
                      onClick={() => {
                        setReviewMode(key);
                        showToast(
                          key === "timeline"
                            ? "기록 순서 1→24→50→78→100으로 시간 흐름을 따라봅니다."
                            : key === "connection"
                              ? "왜 다음 순간으로 이동했는지 관계 이유를 중심으로 봅니다."
                              : "시즌 1의 대표 순간 5개만 집중해서 봅니다.",
                        );
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </header>
              <div className="v4-moments-review-canvas" id="reviewCanvas">
                <svg className="v4-moments-review-path" viewBox="0 0 900 520" preserveAspectRatio="none">
                  <path d="M110 410 C220 300 245 180 360 215 C470 250 520 410 620 335 C720 260 710 120 820 95" />
                </svg>
                <div id="reviewCards">
                  {reviewMoments.map((n, i) => (
                    <button
                      key={n.id}
                      className={`v4-moments-review-card${i === reviewIndex ? " active" : ""}`}
                      type="button"
                      data-review-index={i}
                      style={{
                        left: `${REVIEW_POSITIONS[i][0]}%`,
                        top: `${REVIEW_POSITIONS[i][1]}%`,
                        ["--node-color" as string]: n.color,
                      }}
                      onClick={() => setReviewIndex(i)}
                    >
                      {n.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={n.thumbnail} alt="" />
                      ) : (
                        <div
                          style={{
                            height: 86,
                            display: "grid",
                            placeItems: "center",
                            color: n.color,
                            fontSize: "2rem",
                          }}
                        >
                          {icons[n.kind]}
                        </div>
                      )}
                      <strong>{n.title}</strong>
                      <span>
                        {n.number}번째 · {n.emotion}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
            <aside className="v4-moments-review-side">
              <span className="v4-moments-review-index" id="reviewIndex" data-testid="review-index">
                {String(reviewIndex + 1).padStart(2, "0")} / 05
              </span>
              <h3 id="reviewMomentTitle">{reviewNode?.title}</h3>
              <p id="reviewMomentMemo">{reviewNode?.memo}</p>
              <div className="v4-moments-review-detail">
                <div>
                  <span>순간 번호</span>
                  <strong>{reviewNode?.number}번째</strong>
                </div>
                <div>
                  <span>감정</span>
                  <strong>{reviewNode?.emotion}</strong>
                </div>
                <div>
                  <span>영상 구간</span>
                  <strong>{rangeLabel(reviewNode) || "카드 기록"}</strong>
                </div>
                <div>
                  <span>다음으로 이어진 이유</span>
                  <strong>{reviewNode?.relation}</strong>
                </div>
              </div>
              <div className="v4-moments-review-controls">
                <div className="v4-moments-progress-track">
                  <i
                    style={{ ["--progress" as string]: `${((reviewIndex + 1) / reviewMoments.length) * 100}%` }}
                  />
                </div>
                <div className="v4-moments-review-buttons">
                  <button
                    id="reviewPrev"
                    type="button"
                    aria-label="이전 순간"
                    disabled={reviewIndex === 0}
                    onClick={() => {
                      if (reviewTimer.current) clearInterval(reviewTimer.current);
                      setReviewPlaying(false);
                      setReviewIndex((i) => Math.max(0, i - 1));
                    }}
                  >
                    ←
                  </button>
                  <button
                    className="play"
                    id="reviewPlay"
                    type="button"
                    onClick={playReview}
                    data-testid="review-play"
                  >
                    {reviewPlaying ? "일시 정지" : "재생"}
                  </button>
                  <button
                    id="reviewNext"
                    type="button"
                    aria-label="다음 순간"
                    disabled={reviewIndex >= reviewMoments.length - 1}
                    onClick={() => {
                      if (reviewTimer.current) clearInterval(reviewTimer.current);
                      setReviewPlaying(false);
                      setReviewIndex((i) => Math.min(reviewMoments.length - 1, i + 1));
                    }}
                  >
                    →
                  </button>
                </div>
                <div className="v4-moments-review-exit">
                  <button id="reviewFinish" type="button" onClick={openDecision}>
                    회고 종료
                  </button>
                  <button id="reviewDecision" type="button" onClick={openDecision}>
                    다음 결정으로 이동
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>

      {/* ── decision dialog ──────────────────────────────────── */}
      <div
        className="v4-moments-dialog-backdrop"
        id="decisionDialog"
        data-hidden={openDialog !== "decision" ? "true" : "false"}
        data-moments-dialog={openDialog === "decision" ? "open" : ""}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeDialog();
        }}
      >
        <section className="v4-moments-dialog" role="dialog" aria-modal="true" aria-labelledby="decisionTitle">
          <button className="v4-moments-dialog-close" type="button" aria-label="닫기" onClick={() => closeDialog()}>
            ×
          </button>
          <p className="v4-moments-eyebrow">AFTER SEASON 01</p>
          <h2 id="decisionTitle">다음 마음은 어떻게 이어갈까요?</h2>
          <p>기존 러브트리는 그대로 유지됩니다. 지금 필요한 기록 방식만 선택해 주세요.</p>
          <div className="v4-moments-decision-grid">
            <button
              className="v4-moments-decision-card"
              type="button"
              style={{ "--choice": "var(--m-rose)" } as React.CSSProperties}
              onClick={() => chooseDecision("season2")}
            >
              <i>❀</i>
              <strong>시즌 2로 이어가기</strong>
              <span>
                101번째부터 새로운 회고 구간으로 묶어요.
                <br />
                러브트리와 전체 시간 흐름은 그대로 이어집니다.
              </span>
            </button>
            <button
              className="v4-moments-decision-card"
              type="button"
              style={{ "--choice": "var(--m-sage)" } as React.CSSProperties}
              onClick={() => chooseDecision("continuous")}
            >
              <i>↝</i>
              <strong>시즌 구분 없이 계속 기록</strong>
              <span>
                구간을 나누지 않고 1번째부터 계속 이어 기록해요.
                <br />
                나중에 시즌으로 나눌 수도 있어요.
              </span>
            </button>
            <button
              className="v4-moments-decision-card"
              type="button"
              style={{ "--choice": "var(--m-violet)" } as React.CSSProperties}
              onClick={() => chooseDecision("course")}
            >
              <i>✦</i>
              <strong>입덕 코스 만들기</strong>
              <span>
                대표 순간을 골라 다른 사람이 따라볼 수 있는
                <br />
                짧은 감상 경로를 만들어요.
              </span>
            </button>
          </div>
          <div className="v4-moments-decision-common">
            세 선택 모두 새 LoveTree를 만들지 않습니다. 한 인물의 LoveTree는 하나이며, 시즌은 같은 나무 안의 회고 구간이고 입덕 코스는 기존 순간을 골라 만든 공유용 경로입니다.
          </div>
          <div className="v4-moments-dialog-actions">
            <button
              id="decideLater"
              type="button"
              onClick={() => {
                closeDialog();
                openWorkspace("selected");
              }}
            >
              나중에 정하기 · 트리 보기
            </button>
          </div>
        </section>
      </div>

      {/* ── season direction dialog ──────────────────────────── */}
      <div
        className="v4-moments-dialog-backdrop"
        id="seasonDirectionDialog"
        data-hidden={openDialog !== "seasonDirection" ? "true" : "false"}
        data-moments-dialog={openDialog === "seasonDirection" ? "open" : ""}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeDialog();
        }}
      >
        <section className="v4-moments-dialog wide" role="dialog" aria-modal="true" aria-labelledby="seasonDirectionTitle">
          <button
            className="v4-moments-dialog-close"
            type="button"
            aria-label="닫기"
            onClick={() => closeDialog()}
          >
            ×
          </button>
          <p className="v4-moments-eyebrow">SEASON 02 · SAME LOVETREE</p>
          <h2 id="seasonDirectionTitle">다음 계절은 어떤 방향으로 자랄까요?</h2>
          <p>추천과 실제 선택은 다릅니다. 아무 방향도 고르지 않고 시작한 뒤 나중에 바꿀 수도 있습니다.</p>
          <div className="v4-moments-season-options" id="seasonOptions">
            {(
              [
                "더 섹시한 무대",
                "큐트한 일상",
                "위로가 된 인터뷰",
                "아직 보지 못한 새로운 모습",
                "방향 없이 자유롭게 계속",
              ] as const
            ).map((option, i) => (
              <button
                key={option}
                type="button"
                className={`v4-moments-season-option${seasonDirection === option ? " selected" : ""}`}
                onClick={() => setSeasonDirection(option)}
              >
                {i === 0 && <em>추천</em>}
                <strong>{option}</strong>
                {i === 0 && "시즌 1에서 가장 많이 자란 결을 바탕으로 추천했어요."}
                {i === 1 && "무대 밖 표정과 편안한 하루를 더 모아요."}
                {i === 2 && "마음을 다독인 말과 장면을 이어갑니다."}
                {i === 3 && "아직 보지 못한 결을 탐색해요."}
                {i === 4 && "미리 정하지 않고 마음이 가는 대로 심어요."}
              </button>
            ))}
          </div>
          <div className="v4-moments-season-hint" id="seasonDirectionHint">
            {seasonDirection
              ? `선택한 방향 · ${seasonDirection}. 시즌 2를 시작한 뒤에도 방향을 바꿀 수 있습니다.`
              : "아직 방향을 선택하지 않았어요. ‘나중에 정하기’를 눌러도 시즌 2는 시작되며 방향은 언제든 바꿀 수 있습니다."}
          </div>
          <div className="v4-moments-dialog-actions">
            <button id="seasonLater" type="button" onClick={() => beginSeason2("")}>
              나중에 정하기
            </button>
            <button
              className="primary"
              id="startSeason2"
              type="button"
              disabled={!seasonDirection}
              onClick={() => beginSeason2(seasonDirection)}
            >
              선택한 방향으로 시즌 2 시작
            </button>
          </div>
        </section>
      </div>

      {/* ── course dialog ────────────────────────────────────── */}
      <div
        className="v4-moments-dialog-backdrop"
        id="courseDialog"
        data-hidden={openDialog !== "course" ? "true" : "false"}
        data-moments-dialog={openDialog === "course" ? "open" : ""}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeDialog();
        }}
      >
        <section className="v4-moments-dialog wide" role="dialog" aria-modal="true" aria-labelledby="courseTitle">
          <button className="v4-moments-dialog-close" type="button" aria-label="닫기" onClick={() => closeDialog()}>
            ×
          </button>
          {courseView === "builder" ? (
            <div id="courseBuilderView">
              <p className="v4-moments-eyebrow">MAKE AN IPDEOK COURSE</p>
              <h2 id="courseTitle">친구에게 보여줄 입덕 코스</h2>
              <p>대표 순간 중 최소 2개를 고르고, 따라볼 순서를 정해 짧은 감상 경로를 만듭니다.</p>
              <div className="v4-moments-field" style={{ marginTop: 15 }}>
                <label htmlFor="courseName">코스 이름</label>
                <input
                  className="v4-moments-input"
                  id="courseName"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                />
              </div>
              <div className="v4-moments-course-builder">
                <section className="v4-moments-course-pool">
                  <h3>대표 순간 고르기</h3>
                  <div id="coursePool">
                    {reviewMoments.map((n) => (
                      <label key={n.id} className="v4-moments-course-check">
                        <input
                          type="checkbox"
                          checked={courseSelection.includes(n.id)}
                          onChange={(e) => {
                            setCourseSelection((prev) => {
                              if (e.target.checked) {
                                return prev.includes(n.id) ? prev : [...prev, n.id];
                              }
                              return prev.filter((id) => id !== n.id);
                            });
                          }}
                        />
                        {n.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={n.thumbnail} alt="" />
                        ) : (
                          <span className="v4-moments-metadata-fallback" />
                        )}
                        <span>
                          <strong>
                            {n.number} · {n.title}
                          </strong>
                          <small>{n.memo}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
                <section className="v4-moments-course-order">
                  <h3>감상 순서</h3>
                  <div className="v4-moments-course-list" id="courseOrder">
                    {courseSelection.length === 0 && (
                      <div className="v4-moments-empty-temp">대표 순간을 선택해 주세요.</div>
                    )}
                    {courseSelection.map((id, i) => {
                      const n = getNode(id);
                      if (!n) return null;
                      return (
                        <div key={id} className="v4-moments-course-item">
                          <b>{i + 1}</b>
                          <strong>{n.title}</strong>
                          <span>
                            <button type="button" aria-label="위로" onClick={() => moveCourse(id, -1)}>
                              ↑
                            </button>
                            <button type="button" aria-label="아래로" onClick={() => moveCourse(id, 1)}>
                              ↓
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="v4-moments-course-error" id="courseError">
                    {courseError}
                  </p>
                </section>
              </div>
              <div className="v4-moments-dialog-actions">
                <button className="primary" id="createCourse" type="button" onClick={createCourse}>
                  입덕 코스 결과 보기
                </button>
              </div>
            </div>
          ) : (
            <div id="courseResultView" data-testid="course-result">
              <p className="v4-moments-eyebrow">COURSE PREVIEW · HTML DEMO</p>
              <h2>입덕 코스가 준비되었어요</h2>
              <div className="v4-moments-course-result">
                {courseResult && (
                  <>
                    <div className="v4-moments-course-cover">
                      <div
                        className="v4-moments-course-cover-art"
                        style={{
                          backgroundImage: `url('${escapeHtml(courseResult.selected.find((n) => n.thumbnail)?.thumbnail || "")}')`,
                        }}
                      />
                      <div>
                        <h3>{courseResult.name}</h3>
                        <p>
                          처음 발견한 마음부터 좋아하는 이유가 선명해진 순간까지 따라가는 공유용 감상 경로입니다.
                        </p>
                        <div className="v4-moments-course-meta">
                          <span>{courseResult.selected.length}개의 순간</span>
                          <span>예상 {Math.max(1, Math.round(courseResult.duration / 60))}분</span>
                          <span>대표 썸네일 1장</span>
                        </div>
                      </div>
                    </div>
                    <div className="v4-moments-course-preview-list">
                      {courseResult.selected.map((n, i) => (
                        <div key={n.id} className="v4-moments-course-preview-card">
                          {n.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={n.thumbnail} alt="" />
                          ) : (
                            <span className="v4-moments-metadata-fallback" />
                          )}
                          <strong>
                            {i + 1}. {n.title}
                          </strong>
                          <p>{n.memo}</p>
                        </div>
                      ))}
                    </div>
                    <div className="v4-moments-demo-note">
                      HTML 데모 · 실제 공유 링크는 제품 구현 단계에서 연결
                    </div>
                  </>
                )}
              </div>
              <div className="v4-moments-dialog-actions">
                <button id="editCourse" type="button" onClick={() => setCourseView("builder")}>
                  다시 편집
                </button>
                <button
                  id="courseInTree"
                  type="button"
                  onClick={() => {
                    closeDialog();
                    setDensity("representative");
                    openWorkspace("selected");
                  }}
                >
                  내 트리에서 보기
                </button>
                <button className="primary" id="copyCourseLink" type="button" onClick={copyCourseLink}>
                  링크 복사 데모
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── video modal ──────────────────────────────────────── */}
      <div
        className="v4-moments-dialog-backdrop"
        id="videoModal"
        data-hidden={openDialog !== "video" ? "true" : "false"}
        data-moments-dialog={openDialog === "video" ? "open" : ""}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeDialog();
        }}
      >
        <section className="v4-moments-dialog v4-moments-video-dialog" role="dialog" aria-modal="true" aria-labelledby="videoTitle">
          <header className="v4-moments-video-head">
            <h2 id="videoTitle">영상 순간</h2>
            <button className="v4-moments-dialog-close" id="videoClose" type="button" aria-label="닫기" onClick={() => closeDialog()}>
              ×
            </button>
          </header>
          <div className="v4-moments-video-grid">
            <div className="v4-moments-video-player">
              <div
                className="v4-moments-video-poster"
                data-testid="video-poster"
                style={
                  videoModalNode?.thumbnail
                    ? { backgroundImage: `url(${videoModalNode.thumbnail})` }
                    : undefined
                }
              >
                <a
                  className="v4-moments-video-open"
                  href={videoModalNode?.url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ▶ YouTube에서 열기
                </a>
              </div>
            </div>
            <aside className="v4-moments-video-detail" id="videoDetail">
              <p className="v4-moments-eyebrow">
                {videoModalNode?.number}번째 순간 · {videoModalNode?.platform}
              </p>
              <h3>{videoModalNode?.title}</h3>
              <p>{videoModalNode?.memo}</p>
              <div className="v4-moments-detail-list">
                <div className="v4-moments-detail-row">
                  <span>기억할 구간</span>
                  <strong>{videoModalNode ? rangeLabel(videoModalNode) || "전체" : ""}</strong>
                </div>
                <div className="v4-moments-detail-row">
                  <span>작성자 느낌</span>
                  <strong>{videoModalNode?.tags.join(" · ")}</strong>
                </div>
                <div className="v4-moments-detail-row">
                  <span>연결 이유</span>
                  <strong>{videoModalNode?.relation || "이어짐"}</strong>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>

      {/* ── anchor dialog ────────────────────────────────────── */}
      <div
        className="v4-moments-dialog-backdrop"
        id="anchorDialog"
        data-hidden={openDialog !== "anchor" ? "true" : "false"}
        data-moments-dialog={openDialog === "anchor" ? "open" : ""}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeDialog();
        }}
      >
        <section className="v4-moments-dialog small" role="dialog" aria-modal="true" aria-labelledby="anchorDialogTitle">
          <button className="v4-moments-dialog-close" type="button" aria-label="닫기" onClick={() => closeDialog()}>
            ×
          </button>
          <p className="v4-moments-eyebrow">CHOOSE A STARTING MOMENT</p>
          <h2 id="anchorDialogTitle">어느 순간에서 이어갈까요?</h2>
          <p>선택한 카드가 새 순간의 이전 순간이 됩니다.</p>
          <div className="v4-moments-anchor-list" id="anchorList">
            {representativeMoments.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`v4-moments-anchor-choice${anchorId === n.id ? " selected" : ""}`}
                onClick={() => {
                  setAnchorId(n.id);
                  setSelectedId(n.id);
                  closeDialog();
                  showToast("이어질 출발점을 바꿨어요.");
                }}
              >
                <strong>
                  {n.number} · {n.title}
                </strong>
                {n.relation}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className={`v4-moments-toast${toast ? " show" : ""}`} id="toast" role="status" aria-live="polite" data-testid="toast">
        {toast}
      </div>
    </div>
  );
}
