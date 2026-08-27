import { auth } from "./firebase";
import {
  getAuthTokenProvider,
  getBoundAccessToken,
  type AuthTokenProvider,
} from "./auth-token-provider";

const FIVE_SOURCE_PREVIEW_HOST = "lovetree-limone-five-source-preview.charliekant.workers.dev";
const FIVE_SOURCE_PREVIEW_TREE_ID = "five-source-preview";
const FIVE_SOURCE_PREVIEW_PIXEL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='400'%3E%3Crect width='640' height='400' fill='%23d9cbd3'/%3E%3C/svg%3E";

const FIVE_SOURCE_PREVIEW_TREE = {
  id: FIVE_SOURCE_PREVIEW_TREE_ID,
  ownerId: "isolated-preview-owner",
  title: "LoveTree Five-View Preview",
  memo: "격리 Preview에서 다섯 개 제품 뷰를 확인하기 위한 읽기 전용 러브트리입니다.",
  visibility: "public",
  artist: "LoveTree Preview",
  createdAt: "2026-08-27T00:00:00.000Z",
  updatedAt: "2026-08-27T00:00:00.000Z",
};

const FIVE_SOURCE_PREVIEW_MOMENTS = [
  {
    id: "m-root",
    treeId: FIVE_SOURCE_PREVIEW_TREE_ID,
    parentId: null,
    connectionReason: null,
    title: "First light",
    memo: "첫 번째 기억에서 러브트리가 시작됩니다.",
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: FIVE_SOURCE_PREVIEW_PIXEL,
    discoveryDate: "2026-01-01",
    timestamp: "2026-01-01",
    createdAt: "2026-01-01T00:00:00.000Z",
    sortOrder: 1,
    emotionTags: ["warm"],
    visibility: "public",
  },
  {
    id: "m-child",
    treeId: FIVE_SOURCE_PREVIEW_TREE_ID,
    parentId: "m-root",
    connectionReason: "첫 빛이 다음 기억으로 이어졌다",
    title: "Second path",
    memo: "두 번째 기억은 첫 순간에서 이어집니다.",
    sourceType: "video",
    sourceUrl: "https://example.test/second.mp4",
    thumbnail: FIVE_SOURCE_PREVIEW_PIXEL,
    discoveryDate: "2026-01-02",
    timestamp: "2026-01-02",
    createdAt: "2026-01-02T00:00:00.000Z",
    sortOrder: 2,
    emotionTags: ["soft"],
    visibility: "public",
  },
  {
    id: "m-grandchild",
    treeId: FIVE_SOURCE_PREVIEW_TREE_ID,
    parentId: "m-child",
    connectionReason: "두 번째 길에서 다시 이어졌다",
    title: "Long echo",
    memo: "세 번째 기억은 이전 순간의 여운을 잇습니다.",
    sourceType: "song",
    sourceUrl: "https://example.test/song",
    thumbnail: FIVE_SOURCE_PREVIEW_PIXEL,
    discoveryDate: "2026-01-03",
    timestamp: "2026-01-03",
    createdAt: "2026-01-03T00:00:00.000Z",
    sortOrder: 3,
    emotionTags: ["echo"],
    visibility: "public",
  },
  {
    id: "m-branch",
    treeId: FIVE_SOURCE_PREVIEW_TREE_ID,
    parentId: "m-root",
    connectionReason: "같은 뿌리에서 다른 기억이 열렸다",
    title: "Branch memory",
    memo: "같은 뿌리에서 갈라진 또 하나의 기억입니다.",
    sourceType: "book",
    sourceUrl: "https://example.test/book",
    thumbnail: FIVE_SOURCE_PREVIEW_PIXEL,
    discoveryDate: "2026-01-04",
    timestamp: "2026-01-04",
    createdAt: "2026-01-04T00:00:00.000Z",
    sortOrder: 4,
    emotionTags: ["branch"],
    visibility: "public",
  },
];

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
