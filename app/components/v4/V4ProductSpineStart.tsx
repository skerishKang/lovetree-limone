"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import EmailAuthForm from "@/app/components/EmailAuthForm";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  type MemoryRecord,
  type TreeRecord,
  resolveMemoryThumbnail,
  youtubeId,
} from "@/lib/tree-types";

const LAST_TREE_KEY = "lovetree-v4-product-spine-last-tree-id";
const CLIENT_KEY = "lovetree-v4-product-spine-create-client-key";
const EMOTIONS = ["설렘", "웃음", "위로", "놀람", "존경", "애틋함"] as const;

interface FirstMomentResponse {
  tree: TreeRecord;
  memory: MemoryRecord;
}

function localDateValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function getInitialTreeName(): string {
  if (typeof window === "undefined") return "나의 첫 러브트리";
  const value = new URLSearchParams(window.location.search).get("name")?.trim();
  return value || "나의 첫 러브트리";
}

function getOrCreateClientKey(): string {
  const existing = localStorage.getItem(CLIENT_KEY);
  if (existing) return existing;
  const value = crypto.randomUUID();
  localStorage.setItem(CLIENT_KEY, value);
  return value;
}

function dateFromServer(value: string | Date | null | undefined): string {
  if (!value) return localDateValue();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return localDateValue();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function V4ProductSpineStart() {
  const {
    user,
    loading: authLoading,
    logout,
    authError,
    clearAuthError,
  } = useAuth();

  const [authOpen, setAuthOpen] = useState(false);
  const [treeName, setTreeName] = useState(getInitialTreeName);
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [title, setTitle] = useState("처음 마음이 멈춘 장면");
  const [discoveryNote, setDiscoveryNote] = useState("");
  const [emotion, setEmotion] = useState<(typeof EMOTIONS)[number]>("설렘");
  const [timestamp, setTimestamp] = useState("01:30");
  const [memo, setMemo] = useState("이 장면을 다시 보고 싶어서 첫 마음으로 남겼어요.");
  const [discoveryDate, setDiscoveryDate] = useState(localDateValue);
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [persistedTree, setPersistedTree] = useState<TreeRecord | null>(null);
  const [persistedMemory, setPersistedMemory] = useState<MemoryRecord | null>(null);

  const videoId = useMemo(() => youtubeId(url) || "", [url]);
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";

  const applyServerData = useCallback((tree: TreeRecord, memory: MemoryRecord | null) => {
    setPersistedTree(tree);
    setTreeName(tree.title || "나의 러브트리");
    setDiscoveryNote(tree.memo || "");

    if (memory) {
      setPersistedMemory(memory);
      setUrl(memory.sourceUrl || "");
      setTitle(memory.title || "처음 마음이 멈춘 장면");
      setEmotion((memory.emotionTags?.[0] as (typeof EMOTIONS)[number] | undefined) || "설렘");
      setTimestamp(memory.timestamp || "01:30");
      setMemo(memory.memo || "");
      setDiscoveryDate(dateFromServer(memory.createdAt));
    }
  }, []);

  const fetchTreeBundle = useCallback(async (treeId: string): Promise<boolean> => {
    const [treeResponse, memoriesResponse] = await Promise.all([
      apiFetch(`/api/trees/${encodeURIComponent(treeId)}`),
      apiFetch(`/api/trees/${encodeURIComponent(treeId)}/memories?limit=100`),
    ]);

    if (!treeResponse.ok) return false;
    const tree = (await treeResponse.json()) as TreeRecord;
    const memories = memoriesResponse.ok
      ? ((await memoriesResponse.json()) as MemoryRecord[])
      : [];
    const root = [...memories]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .find((memory) => !memory.parentId) ?? memories[0] ?? null;

    applyServerData(tree, root);
    localStorage.setItem(LAST_TREE_KEY, tree.id);
    return true;
  }, [applyServerData]);

  const hydrateFromServer = useCallback(async () => {
    if (!user) return;
    setHydrating(true);
    setError(null);
    try {
      const preferredTreeId = localStorage.getItem(LAST_TREE_KEY);
      if (preferredTreeId && await fetchTreeBundle(preferredTreeId)) return;
      if (preferredTreeId) localStorage.removeItem(LAST_TREE_KEY);

      const listResponse = await apiFetch("/api/trees?limit=100");
      if (!listResponse.ok) {
        throw new Error("내 러브트리 목록을 불러오지 못했어요.");
      }
      const trees = (await listResponse.json()) as TreeRecord[];
      if (trees.length > 0) {
        await fetchTreeBundle(trees[0].id);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "서버 데이터를 불러오지 못했어요.");
    } finally {
      setHydrating(false);
    }
  }, [fetchTreeBundle, user]);

  useEffect(() => {
    if (!authLoading && user) void hydrateFromServer();
  }, [authLoading, hydrateFromServer, user]);

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  async function saveFirstMoment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    clearAuthError();

    if (!user) {
      setAuthOpen(true);
      setError("첫 순간을 실제 LoveTree에 저장하려면 로그인해 주세요.");
      return;
    }
    if (!treeName.trim()) {
      setError("러브트리 이름을 적어 주세요.");
      return;
    }
    if (!videoId) {
      setError("YouTube 링크를 확인해 주세요.");
      return;
    }
    if (!/^\d{1,2}:[0-5]\d$/.test(timestamp.trim())) {
      setError("영상 시점은 01:30 같은 분:초 형식으로 적어 주세요.");
      return;
    }
    if (!title.trim() && !memo.trim()) {
      setError("순간 제목이나 마음 메모 중 하나는 적어 주세요.");
      return;
    }

    setSaving(true);
    try {
      const response = await apiFetch("/api/trees/with-first-memory", {
        method: "POST",
        body: JSON.stringify({
          clientKey: getOrCreateClientKey(),
          title: treeName.trim(),
          memo: discoveryNote.trim(),
          visibility: "public",
          memory: {
            title: title.trim(),
            memo: memo.trim(),
            source: "YouTube",
            sourceUrl: url.trim(),
            sourceType: "youtube",
            thumbnail,
            emotionTags: [emotion],
            timestamp: timestamp.trim(),
            visibility: "public",
          },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as FirstMomentResponse & { error?: string };
      if (!response.ok || !data.tree?.id || !data.memory?.id) {
        throw new Error(data.error || "첫 순간을 저장하지 못했어요.");
      }

      localStorage.setItem(LAST_TREE_KEY, data.tree.id);
      applyServerData(data.tree, data.memory);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "네트워크 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function signOutCurrentUser() {
    await logout();
    setPersistedTree(null);
    setPersistedMemory(null);
    setError(null);
  }

  const persisted = Boolean(persistedTree && persistedMemory);

  return (
    <main className="v4-page">
      <div className="v4-landing-shell">
        <nav className="v4-landing-nav" aria-label="V4 제품 저장 여정 메뉴">
          <Link className="v4-brand" href="/v4" aria-label="LoveTree 홈">
            <span className="v4-brand-mark" aria-hidden="true"><i /><b /></span>
            LoveTree
          </Link>
          <Link className="v4-nav-link" href="/v4/community">공개 트리</Link>
          <span className="v4-nav-link" aria-live="polite">
            {authLoading ? "인증 확인 중" : user ? (user.email || "로그인됨") : "비로그인"}
          </span>
          {user ? (
            <button className="v4-secondary" type="button" onClick={() => void signOutCurrentUser()}>로그아웃</button>
          ) : (
            <button className="v4-secondary" type="button" onClick={() => setAuthOpen(true)}>로그인 / 회원가입</button>
          )}
        </nav>

        <section className="v4-discovery" aria-labelledby="v4-product-spine-title">
          <div className="v4-copy">
            <p className="v4-eyebrow">P0 · REAL PRODUCT SPINE</p>
            <h1 id="v4-product-spine-title">
              <span>첫 순간을</span>
              <span className="v4-soft-line">실제 러브트리에</span>
              <span className="v4-rose-line">남겨볼까요?</span>
            </h1>
            <p>
              이 화면의 저장 버튼은 브라우저 임시 기록이 아니라 현재 LoveTree의 Firebase 인증과
              서버 API를 거쳐 실제 Tree와 첫 Memory를 만듭니다. 새로고침 후에도 서버에서 다시 불러옵니다.
            </p>

            <form className="v4-form-paper" onSubmit={saveFirstMoment}>
              <div className="v4-form-head">
                <div>
                  <h2>{persisted ? "서버에 저장된 첫 순간" : "첫 순간 만들기"}</h2>
                  <p>{persisted ? "같은 계정으로 다시 로그인해도 이 기록을 복원합니다." : "나무와 첫 마음 카드를 한 번에 저장합니다."}</p>
                </div>
                <span className="v4-form-icon" aria-hidden="true">✦</span>
              </div>

              <div className="v4-group">
                <label className="v4-label" htmlFor="v4-spine-tree-name">러브트리 이름 <small>public-first</small></label>
                <input id="v4-spine-tree-name" className="v4-input" maxLength={120} value={treeName} onChange={(event) => setTreeName(event.target.value)} />
              </div>

              <div className="v4-group">
                <label className="v4-label" htmlFor="v4-spine-url">YouTube URL <small>첫 뿌리</small></label>
                <input id="v4-spine-url" className="v4-input" value={url} onChange={(event) => setUrl(event.target.value)} />
                <p className="v4-field-status">{videoId ? "영상이 실제 Memory sourceUrl에 저장됩니다." : "올바른 YouTube 링크를 넣어 주세요."}</p>
              </div>

              <div className="v4-group">
                <label className="v4-label" htmlFor="v4-spine-title">순간 제목 <small>Memory title</small></label>
                <input id="v4-spine-title" className="v4-input" maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>

              <div className="v4-group">
                <label className="v4-label" htmlFor="v4-spine-discovery-note">처음 어떤 마음이 들었나요? <small>Tree context</small></label>
                <textarea id="v4-spine-discovery-note" className="v4-textarea" maxLength={2000} value={discoveryNote} onChange={(event) => setDiscoveryNote(event.target.value)} placeholder="예: 우연히 보게 됐는데 하루 종일 이 장면이 생각났어요." />
              </div>

              <div className="v4-group">
                <span className="v4-label">가장 가까운 감정 <small>emotionTags</small></span>
                <div className="v4-actions-row" role="radiogroup" aria-label="감정 선택">
                  {EMOTIONS.map((item) => (
                    <button key={item} className={emotion === item ? "v4-primary" : "v4-secondary"} type="button" role="radio" aria-checked={emotion === item} onClick={() => setEmotion(item)}>{item}</button>
                  ))}
                </div>
              </div>

              <div className="v4-group">
                <label className="v4-label" htmlFor="v4-spine-time">영상에서 기억할 시점 <small>MM:SS</small></label>
                <input id="v4-spine-time" className="v4-input" value={timestamp} onChange={(event) => setTimestamp(event.target.value)} placeholder="01:30" />
              </div>

              <div className="v4-group">
                <label className="v4-label" htmlFor="v4-spine-memo">이 장면이 특별했던 이유 <small>Memory memo</small></label>
                <textarea id="v4-spine-memo" className="v4-textarea" maxLength={2000} value={memo} onChange={(event) => setMemo(event.target.value)} />
              </div>

              <div className="v4-group">
                <label className="v4-label" htmlFor="v4-spine-date">발견한 날짜 <small>P1 persisted-date contract pending</small></label>
                <input id="v4-spine-date" className="v4-input" type="date" value={discoveryDate} onChange={(event) => setDiscoveryDate(event.target.value)} />
                <p className="v4-field-status">영상 시점과 발견 날짜를 같은 DB 필드에 섞지 않기 위해, 날짜는 이번 P0에서 서버 저장 필드로 가장하지 않습니다.</p>
              </div>

              {error ? <p className="v4-field-status" role="alert">{error}</p> : null}
              {persisted ? (
                <p className="v4-field-status" role="status">
                  서버 저장 완료 · Tree {persistedTree?.id} · Memory {persistedMemory?.id}
                </p>
              ) : null}

              <div className="v4-actions-row">
                <button className="v4-primary" type="submit" disabled={saving || hydrating || authLoading} aria-busy={saving || hydrating}>
                  {hydrating ? "서버에서 복원 중…" : saving ? "실제 LoveTree에 저장 중…" : persisted ? "같은 첫 순간 다시 확인 →" : "실제 LoveTree에 첫 순간 저장 →"}
                </button>
                <Link className="v4-secondary" href="/v4">V4 홈으로</Link>
              </div>
            </form>
          </div>

          <aside className="v4-preview-paper" aria-label="실제 첫 순간 미리보기">
            <article className="v4-seed-preview-card">
              <div className="v4-preview-image" style={thumbnail ? { backgroundImage: `linear-gradient(180deg,rgba(255,248,239,.04),rgba(62,41,42,.24)),url(${thumbnail})` } : undefined} />
              <div className="v4-preview-meta">
                <small>{persisted ? "PERSISTED ROOT" : "YOUR FIRST ROOT"} · {timestamp}</small>
                <strong>{treeName || "나의 첫 러브트리"}</strong>
                <p>{emotion} · {memo || discoveryNote || "그날의 마음을 남겨 주세요."}</p>
              </div>
            </article>
            <div className="v4-form-paper" style={{ marginTop: 18 }}>
              <p className="v4-eyebrow">SERVER SOURCE OF TRUTH</p>
              <p className="v4-field-status">
                {user
                  ? persisted
                    ? "현재 화면은 API에서 읽은 Tree/Memory로 다시 채워졌습니다. localStorage는 마지막 Tree 포인터와 idempotency key에만 사용합니다."
                    : "로그인 상태입니다. 저장하면 Neon-backed API의 Tree/Memory가 생성됩니다."
                  : "비로그인 상태입니다. 저장 시 기존 Firebase 로그인/회원가입 흐름을 사용합니다."}
              </p>
              {persistedMemory ? (
                <p className="v4-field-status">sourceUrl: {persistedMemory.sourceUrl}<br />timestamp: {persistedMemory.timestamp}<br />emotion: {persistedMemory.emotionTags?.join(", ") || "-"}</p>
              ) : null}
            </div>
          </aside>
        </section>
      </div>

      <EmailAuthForm open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
