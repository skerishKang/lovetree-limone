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

// Visual-fidelity fixture only. Six root branches exercise Source56's full vertical
// network grammar while the media mix is intentionally balanced across Source60's
// four view-derived clusters. Nothing here is persisted or treated as product truth.
const PREVIEW_MOMENT_SPECS = [
  ["m-root", null, "First light", "첫 번째 기억에서 러브트리가 시작됩니다.", "youtube", "warm", null],

  ["m-f1", "m-root", "Rain window", "비 오는 날의 창가에서 시작된 첫 번째 길입니다.", "video", "soft", "첫 빛에서 움직이는 장면으로 이어졌다"],
  ["m-f1-a", "m-f1", "Quiet frame", "잠시 멈춘 표정과 빛을 오래 기억합니다.", "image", "light", "움직임 속에서 한 장면이 남았다"],
  ["m-f1-b", "m-f1-a", "Side street", "낯선 골목을 걷던 기억이 다음 장면을 열었습니다.", "travel", "wander", "한 장면에서 새로운 장소로 이어졌다"],

  ["m-f2", "m-root", "First refrain", "처음 함께 들었던 노래가 두 번째 길을 만들었습니다.", "song", "echo", "첫 마음이 음악으로 이어졌다"],
  ["m-f2-a", "m-f2", "Dog-eared page", "접힌 책장의 문장이 오래 남았습니다.", "book", "tender", "노래의 여운이 문장으로 이어졌다"],
  ["m-f2-b", "m-f2-a", "Encore", "다시 들은 노래가 이전 장면을 다른 색으로 보여줍니다.", "song", "reprise", "문장이 다시 음악을 불러냈다"],

  ["m-f3", "m-root", "Margin note", "짧은 메모가 세 번째 기억의 길을 열었습니다.", "memo", "note", "첫 기억에서 작은 기록이 갈라져 나왔다"],
  ["m-f3-a", "m-f3", "Saved link", "다시 보고 싶어 남겨 둔 링크입니다.", "link", "curious", "메모에서 바깥의 단서로 이어졌다"],
  ["m-f3-b", "m-f3-a", "Late memo", "하루 끝에 적은 짧은 문장이 남았습니다.", "memo", "calm", "단서를 따라 다시 내 기록으로 돌아왔다"],

  ["m-f4", "m-root", "Blue hour", "해가 진 뒤에도 남아 있던 푸른 시간입니다.", "image", "blue", "첫 기억의 빛이 다른 색의 장면으로 이어졌다"],
  ["m-f4-a", "m-f4", "Night train", "움직이는 창밖 풍경이 새로운 길을 열었습니다.", "video", "motion", "푸른 시간이 이동의 기억으로 이어졌다"],
  ["m-f4-b", "m-f4-a", "Arrival light", "도착한 곳에서 익숙한 감정을 다시 만났습니다.", "image", "arrival", "이동 끝에서 다시 빛을 발견했다"],

  ["m-f5", "m-root", "Small letter", "짧은 편지가 다섯 번째 길을 만들었습니다.", "book", "letter", "첫 마음이 글로 이어졌다"],
  ["m-f5-a", "m-f5", "Old song", "한 소절이 오래전 장면을 다시 불러냈습니다.", "song", "nostalgia", "문장의 감정이 음악으로 이어졌다"],
  ["m-f5-b", "m-f5-a", "Second chapter", "다시 펼친 책에서 다른 의미를 발견했습니다.", "book", "growth", "노래의 여운이 다음 문장으로 이어졌다"],

  ["m-f6", "m-root", "Shared place", "함께 저장한 장소가 마지막 길을 열었습니다.", "link", "place", "첫 기억에서 다시 찾아갈 장소로 이어졌다"],
  ["m-f6-a", "m-f6", "Morning note", "다음 날 아침 적어 둔 작은 기록입니다.", "memo", "morning", "장소의 기억이 짧은 메모로 남았다"],
  ["m-f6-b", "m-f6-a", "Return link", "언젠가 다시 열어 볼 단서를 남겼습니다.", "link", "return", "메모가 다시 바깥의 기억으로 이어졌다"],
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
