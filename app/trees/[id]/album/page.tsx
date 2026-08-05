"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import EmailAuthForm from "../../../components/EmailAuthForm";
import "../../../styles/email-auth.css";
import {
  formatTreeDate,
  sourceTypeLabel,
  type MemoryRecord,
  type TreeRecord,
} from "@/lib/tree-types";
import {
  toCanonicalMoment,
  selectAlbumMoments,
  type AlbumMomentView,
} from "@/lib/moment-model";

export default function AlbumPage() {
  const params = useParams<{ id: string | string[] }>();
  const { user, loading: authLoading, login, loginPending } = useAuth();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const [tree, setTree] = useState<TreeRecord | null>(null);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const loadTree = useCallback(async () => {
    if (!treeId) return;
    setLoading(true);
    setError(null);
    try {
      const [treeResponse, memoryResponse] = await Promise.all([
        apiFetch(`/api/trees/${encodeURIComponent(treeId)}`),
        apiFetch(`/api/trees/${encodeURIComponent(treeId)}/memories`),
      ]);
      const treeData = (await treeResponse.json().catch(() => ({}))) as TreeRecord & { error?: string };
      const memoryData = (await memoryResponse.json().catch(() => [])) as MemoryRecord[] | { error?: string };
      if (!treeResponse.ok) {
        setError(treeResponse.status === 404 ? "이 러브트리를 찾을 수 없어요." : "러브트리를 불러오지 못했어요.");
        return;
      }
      if (!memoryResponse.ok) {
        setError("러브트리의 순간을 불러오지 못했어요. 다시 시도해 주세요.");
        return;
      }
      setTree(treeData);
      setMemories(Array.isArray(memoryData) ? memoryData : []);
    } catch {
      setError("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => void loadTree(), 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, loadTree]);

  const ownerId = tree?.ownerId ?? "";
  const albumMoments = useMemo<AlbumMomentView[]>(() => {
    const canonical = memories.map((m) => toCanonicalMoment(m, ownerId));
    return selectAlbumMoments(canonical);
  }, [memories, ownerId]);

  if (authLoading || loading) {
    return <AlbumShell><div className="tree-page-state" aria-busy="true">앨범을 불러오고 있어요…</div></AlbumShell>;
  }

  if (error || !tree) {
    return (
      <AlbumShell>
        <div className="tree-page-state">
          <span className="tree-page-symbol" aria-hidden="true">!</span>
          <h1>{error || "러브트리를 찾을 수 없어요."}</h1>
          <p>공개 상태가 바뀌었거나 주소를 확인해 주세요.</p>
          <div className="tree-page-actions">
            <button className="button button-quiet" type="button" onClick={() => void loadTree()}>다시 시도</button>
            {!user ? <button className="button button-primary" type="button" onClick={() => void login()} disabled={loginPending}>{loginPending ? "로그인 중…" : "로그인"}</button> : null}
            {!user ? <button className="button button-quiet" type="button" onClick={() => setIsAuthOpen(true)} aria-haspopup="dialog">이메일로 로그인</button> : null}
          </div>
          <EmailAuthForm open={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        </div>
      </AlbumShell>
    );
  }

  return (
    <AlbumShell userLabel={user?.displayName || user?.email || undefined}>
      <section className="album-content" aria-labelledby="album-title">
        <div className="album-heading">
          <div>
            <p className="eyebrow">album view</p>
            <h1 id="album-title">{tree.title}</h1>
            <p>{tree.memo || "마음이 멈춘 순간들이 이어지는 러브트리"}</p>
          </div>
          <div className="album-meta">
            <Link className="album-back-link" href={`/trees/${encodeURIComponent(treeId)}`}>← 트리로 돌아가기</Link>
            <Link className="album-view-link" href={`/trees/${encodeURIComponent(treeId)}/timeline`}>타임라인 보기 →</Link>
          </div>
        </div>

        {albumMoments.length === 0 ? (
          <div className="album-empty">
            <span aria-hidden="true">✦</span>
            <p>아직 기록된 순간이 없어요.</p>
          </div>
        ) : (
          <div className="album-grid">
            {albumMoments.map((moment, index) => (
              <article className="album-card" key={moment.id}>
                <div className={`album-card-media album-media-${index % 4}`}>
                  {moment.thumbnail ? (
                    <img src={moment.thumbnail} alt="" />
                  ) : (
                    <span aria-hidden="true">{moment.sourceType === "song" ? "♫" : moment.sourceType === "book" ? "▤" : "✦"}</span>
                  )}
                </div>
                <div className="album-card-body">
                  <div className="album-card-meta">
                    <span>{sourceTypeLabel(moment.sourceType)}</span>
                    <time>{formatTreeDate(moment.timestamp || moment.createdAt)}</time>
                  </div>
                  <h3>{moment.title || `순간 ${albumMoments.length - index}`}</h3>
                  <p>{moment.memo || "이 순간에 남긴 마음"}</p>
                  {moment.emotionTags && moment.emotionTags.length > 0 ? (
                    <div className="memory-tags">
                      {moment.emotionTags.map((tag) => <span key={tag}>#{tag}</span>)}
                    </div>
                  ) : null}
                  {moment.sourceUrl ? (
                    <a className="album-source" href={moment.sourceUrl} target="_blank" rel="noreferrer">출처 열기 ↗</a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AlbumShell>
  );
}

function AlbumShell({ children, userLabel }: { children: React.ReactNode; userLabel?: string }) {
  return (
    <main className="tree-page">
      <header className="tree-page-topbar">
        <Link className="tree-page-brand" href="/" aria-label="LoveTree 처음 화면으로">LoveTree</Link>
        <nav className="tree-page-nav" aria-label="러브트리 메뉴">
          <Link href="/my-trees">내 러브트리</Link>
          <Link href="/?view=browse">둘러보기</Link>
          {userLabel ? <span>{userLabel}</span> : null}
        </nav>
      </header>
      {children}
    </main>
  );
}
