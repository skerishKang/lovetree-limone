import { auth } from "./firebase";
import {
  getAuthTokenProvider,
  getBoundAccessToken,
  type AuthTokenProvider,
} from "./auth-token-provider";

const FIVE_SOURCE_PREVIEW_HOST = "lovetree-limone-five-source-preview.charliekant.workers.dev";
const FIVE_SOURCE_PREVIEW_TREE_ID = "five-source-preview";

function previewThumbnail(index: number) {
  const palettes = [
    ["201b2d", "735a8f", "d5adc8"],
    ["241b25", "94576f", "d5a3b6"],
    ["282118", "8a6a42", "d4b287"],
    ["17222c", "496c91", "9fbad0"],
    ["17251f", "4f7864", "a6c3b2"],
    ["231d29", "755f86", "c6aecf"],
  ];
  const [a, b, c] = palettes[index % palettes.length];
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='400' viewBox='0 0 640 400'%3E%3Cdefs%3E%3CradialGradient id='g' cx='45%25' cy='42%25' r='72%25'%3E%3Cstop offset='0' stop-color='%23${c}' stop-opacity='.74'/%3E%3Cstop offset='.45' stop-color='%23${b}' stop-opacity='.82'/%3E%3Cstop offset='1' stop-color='%23${a}'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='640' height='400' fill='url(%23g)'/%3E%3Ccircle cx='${160 + (index % 5) * 72}' cy='${120 + (index % 3) * 50}' r='44' fill='white' fill-opacity='.08'/%3E%3Cpath d='M80 330 Q 220 ${220 + (index % 4) * 18} 560 315' fill='none' stroke='white' stroke-opacity='.12' stroke-width='2'/%3E%3C/svg%3E`;
}

const FIVE_SOURCE_PREVIEW_TREE = {
  id: FIVE_SOURCE_PREVIEW_TREE_ID,
  ownerId: "isolated-preview-owner",
  title: "LoveTree Five-View Preview",
  memo: "격리 Preview에서 다섯 개 제품 뷰의 시각 충실도를 확인하기 위한 읽기 전용 러브트리입니다.",
  visibility: "public",
  artist: "LoveTree Preview",
  createdAt: "2026-08-27T00:00:00.000Z",
  updatedAt: "2026-08-27T00:00:00.000Z",
};

type PreviewFamily = {
  key: string;
  title: string;
  sourceTypes: readonly string[];
  emotions: readonly string[];
};

const PREVIEW_FAMILIES: readonly PreviewFamily[] = [
  { key: "f1", title: "처음 빠져든 순간", sourceTypes: ["video", "image", "travel"], emotions: ["설렘", "빛", "몰입"] },
  { key: "f2", title: "무대와 퍼포먼스", sourceTypes: ["song", "book", "song"], emotions: ["울림", "여운", "환호"] },
  { key: "f3", title: "콘텐츠 탐색", sourceTypes: ["memo", "link", "memo"], emotions: ["단서", "호기심", "기록"] },
  { key: "f4", title: "사람과 관계", sourceTypes: ["image", "video", "image"], emotions: ["온기", "움직임", "친밀"] },
  { key: "f5", title: "다시 찾은 기억", sourceTypes: ["book", "song", "book"], emotions: ["문장", "그리움", "성장"] },
  { key: "f6", title: "다음 계절", sourceTypes: ["link", "memo", "link"], emotions: ["장소", "아침", "귀환"] },
];

function isoDay(index: number) {
  return new Date(Date.UTC(2026, 0, index + 1)).toISOString();
}

function buildPreviewMoments() {
  const moments: Array<Record<string, unknown>> = [];
  const rootDate = isoDay(0);
  moments.push({
    id: "m-root",
    treeId: FIVE_SOURCE_PREVIEW_TREE_ID,
    parentId: null,
    connectionReason: null,
    title: "First light",
    memo: "첫 번째 기억에서 러브트리가 시작됩니다.",
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: previewThumbnail(0),
    discoveryDate: rootDate,
    timestamp: rootDate,
    createdAt: rootDate,
    sortOrder: 1,
    emotionTags: ["warm"],
    visibility: "public",
  });

  let index = 1;
  PREVIEW_FAMILIES.forEach((family, familyIndex) => {
    const entryId = `m-${family.key}`;
    for (let memberIndex = 0; memberIndex < 9; memberIndex += 1) {
      const id = memberIndex === 0 ? entryId : `${entryId}-${memberIndex}`;
      const primaryParent = memberIndex === 0
        ? "m-root"
        : memberIndex <= 4
          ? entryId
          : `${entryId}-${memberIndex - 4}`;
      const sourceType = family.sourceTypes[memberIndex % family.sourceTypes.length];
      const date = isoDay(index);
      const title = memberIndex === 0
        ? family.title
        : `${family.title} · ${String(memberIndex + 1).padStart(2, "0")}`;
      const connectionReason = memberIndex === 0
        ? `First Moment에서 ${family.title}의 주요 경로가 시작되었습니다.`
        : memberIndex <= 4
          ? `${family.title}의 주경로에서 이어진 기억입니다.`
          : `${family.title}의 보조 경로로 갈라진 기억입니다.`;
      moments.push({
        id,
        treeId: FIVE_SOURCE_PREVIEW_TREE_ID,
        parentId: primaryParent,
        connectionReason,
        title,
        memo: `${family.title} 안에서 발견한 ${memberIndex === 0 ? "첫" : "다음"} 순간입니다. 원본 공간 밀도를 검증하기 위한 읽기 전용 Preview 기억입니다.`,
        sourceType,
        sourceUrl: `https://example.test/preview/${id}`,
        thumbnail: previewThumbnail(index + familyIndex),
        discoveryDate: date,
        timestamp: date,
        createdAt: date,
        sortOrder: index + 1,
        emotionTags: [family.emotions[memberIndex % family.emotions.length]],
        visibility: "public",
      });
      index += 1;
    }
  });

  return moments;
}

// Visual-fidelity fixture only: 1 root + 6 families × 9 Moment = 55 Moment.
// This approximates the authoritative Source56/60/64 source density so screenshot
// comparison measures implementation fidelity rather than an artificially sparse demo.
// It exists only on the isolated Preview host and is never persisted as product truth.
const FIVE_SOURCE_PREVIEW_MOMENTS = buildPreviewMoments();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isolatedPreviewFixture(path: string, options: RequestInit): Response | null {
  if (typeof window === "undefined" || window.location.hostname !== FIVE_SOURCE_PREVIEW_HOST) return null;
  const url = new URL(path, window.location.origin);
  const treePath = `/api/trees/${encodeURIComponent(FIVE_SOURCE_PREVIEW_TREE_ID)}`;
  const memoriesPath = `${treePath}/memories`;
  if (url.pathname !== treePath && url.pathname !== memoriesPath) return null;

  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET") {
    return jsonResponse({ error: "The isolated preview fixture is read-only." }, 405);
  }
  return url.pathname === treePath
    ? jsonResponse(FIVE_SOURCE_PREVIEW_TREE)
    : jsonResponse(FIVE_SOURCE_PREVIEW_MOMENTS);
}

const firebaseAuthTokenProvider: AuthTokenProvider = {
  getCurrentPrincipal() {
    const user = auth?.currentUser;
    if (!user?.uid) return null;
    return { id: user.uid, provider: "firebase" };
  },
  async getAccessToken() {
    const user = auth?.currentUser;
    if (!user?.uid) return null;
    const token = await user.getIdToken();
    if (!token) return null;
    return { token, principalId: user.uid };
  },
};

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const previewFixture = isolatedPreviewFixture(path, options);
  if (previewFixture) return previewFixture;

  const token = await getBoundAccessToken(getAuthTokenProvider(firebaseAuthTokenProvider));
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(path, { ...options, headers });
}
