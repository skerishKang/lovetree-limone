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

const PREVIEW_MOMENT_SPECS = [
  ["m-root", null, "First light", "첫 번째 기억에서 러브트리가 시작됩니다.", "youtube", "warm", null],
  ["m-child", "m-root", "Second path", "두 번째 기억은 첫 순간에서 이어집니다.", "video", "soft", "첫 빛이 다음 기억으로 이어졌다"],
  ["m-grandchild", "m-child", "Long echo", "이전 순간의 여운이 오래 남았습니다.", "song", "echo", "두 번째 길에서 다시 이어졌다"],
  ["m-branch", "m-root", "Branch memory", "같은 뿌리에서 갈라진 또 하나의 기억입니다.", "book", "branch", "같은 뿌리에서 다른 기억이 열렸다"],
  ["m-05", "m-child", "Quiet afternoon", "작은 장면이 다음 기억의 방향을 만들었습니다.", "image", "calm", "낮은 온도의 기억이 이어졌다"],
  ["m-06", "m-05", "Window light", "창가의 빛과 오래 남은 표정을 기억합니다.", "image", "light", "같은 빛의 결을 따라 이어졌다"],
  ["m-07", "m-branch", "Side street", "다른 길에서 발견한 새로운 장면입니다.", "travel", "wander", "갈라진 길에서 새로운 기억을 만났다"],
  ["m-08", "m-07", "Blue hour", "해가 진 뒤에도 남아 있던 푸른 시간입니다.", "video", "blue", "여행의 끝에서 같은 감정을 발견했다"],
  ["m-09", "m-grandchild", "Old song", "한 소절이 오래전 장면을 다시 불러냈습니다.", "song", "nostalgia", "여운이 음악으로 이어졌다"],
  ["m-10", "m-grandchild", "Small letter", "짧은 문장이 기억의 방향을 바꾸었습니다.", "book", "tender", "같은 마음을 다른 문장으로 발견했다"],
  ["m-11", "m-06", "Morning table", "평범한 아침이 오래 남는 순간이 되었습니다.", "image", "home", "빛이 일상의 기억으로 내려앉았다"],
  ["m-12", "m-11", "Warm cup", "따뜻한 온기와 대화가 다음 장면을 만들었습니다.", "image", "warmth", "아침의 온기가 대화로 이어졌다"],
  ["m-13", "m-08", "Night train", "움직이는 창밖 풍경이 새로운 길을 열었습니다.", "video", "motion", "푸른 시간이 이동의 기억으로 이어졌다"],
  ["m-14", "m-13", "Arrival", "도착한 곳에서 익숙한 감정을 다시 만났습니다.", "travel", "arrival", "이동 끝에서 다시 같은 마음을 찾았다"],
  ["m-15", "m-10", "Margin note", "책 가장자리의 짧은 메모가 오래 남았습니다.", "book", "note", "문장에서 작은 기록으로 이어졌다"],
  ["m-16", "m-09", "Encore", "다시 들은 노래가 첫 장면을 다른 색으로 보여줍니다.", "song", "reprise", "오래된 노래가 새로운 장면을 열었다"],
  ["m-17", "m-12", "Garden air", "바깥 공기와 작은 움직임이 기억을 넓혔습니다.", "image", "green", "일상의 온기가 바깥 풍경으로 이어졌다"],
  ["m-18", "m-14", "Last glow", "하루 끝의 빛이 여러 갈래 기억을 다시 묶어 줍니다.", "image", "glow", "도착 이후의 감정이 마지막 빛으로 모였다"],
] as const;

const FIVE_SOURCE_PREVIEW_MOMENTS = PREVIEW_MOMENT_SPECS.map((spec, index) => {
  const [id, parentId, title, memo, sourceType, emotion, connectionReason] = spec;
  const day = String(index + 1).padStart(2, "0");
  const sourceUrl = sourceType === "youtube"
    ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    : `https://example.test/preview/${id}`;
  return {
    id,
    treeId: FIVE_SOURCE_PREVIEW_TREE_ID,
    parentId,
    connectionReason,
    title,
    memo,
    sourceType,
    sourceUrl,
    thumbnail: previewThumbnail(index),
    discoveryDate: `2026-01-${day}`,
    timestamp: `2026-01-${day}`,
    createdAt: `2026-01-${day}T00:00:00.000Z`,
    sortOrder: index + 1,
    emotionTags: [emotion],
    visibility: "public",
  };
});

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
