"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  formatTreeDate,
  isSafeExternalUrl,
  resolveMemoryThumbnail,
  type MemoryRecord,
  type TreeRecord,
} from "@/lib/tree-types";
import { TreeViewShell } from "@/app/components/TreeViewShell";

function titleOf(memory: MemoryRecord, index: number) {
  return memory.title?.trim() || memory.memo?.trim() || `공개 순간 ${index + 1}`;
}

function dateOf(memory: MemoryRecord) {
  return memory.timestamp || memory.createdAt || null;
}

export default function V4PublicStorySticky({ treeId }: { treeId: string }) {
  const { user } = useAuth();
  const [tree, setTree] = useState<TreeRecord | null>(null);
  const [moments, setMoments] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapter, setChapter] = useState(0);
  const scrollSpace = useRef<HTMLDivElement>(null);
  const isOwner = Boolean(user && tree?.ownerId && tree.ownerId === user.uid);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [treeResponse, momentsResponse] = await Promise.all([
          apiFetch(`/api/trees/${encodeURIComponent(treeId)}`),
          apiFetch(`/api/community/memories?treeId=${encodeURIComponent(treeId)}&limit=200`),
        ]);
        const treeData = await treeResponse.json().catch(() => null) as TreeRecord | null;
        const momentData = await momentsResponse.json().catch(() => []) as MemoryRecord[];
        if (!treeResponse.ok || !treeData) throw new Error("공개 러브트리를 찾을 수 없어요.");
        if (treeData.visibility !== "public") throw new Error("공개 Tree만 Public Story로 재생할 수 있어요.");
        if (!momentsResponse.ok || !Array.isArray(momentData)) throw new Error("공개 순간을 불러오지 못했어요.");
        if (active) {
          setTree(treeData);
          setMoments(momentData);
          setError(null);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Public Story를 열 수 없어요.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [treeId]);

  const chapterCount = Math.max(1, moments.length);
  const scrollToChapter = useCallback((target: number) => {
    const root = scrollSpace.current;
    if (!root) return;
    const index = Math.max(0, Math.min(chapterCount - 1, target));
    const maxTravel = Math.max(0, root.offsetHeight - window.innerHeight);
    const top = root.offsetTop + (chapterCount === 1 ? 0 : (index / (chapterCount - 1)) * maxTravel);
    window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setChapter(index);
  }, [chapterCount]);

  useEffect(() => {
    if (!moments.length) return;
    const updateFromScroll = () => {
      const root = scrollSpace.current;
      if (!root) return;
      const travel = Math.max(1, root.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, (window.scrollY - root.offsetTop) / travel));
      const next = Math.min(moments.length - 1, Math.round(progress * (moments.length - 1)));
      setChapter((current) => current === next ? current : next);
    };
    updateFromScroll();
    window.addEventListener("scroll", updateFromScroll, { passive: true });
    window.addEventListener("resize", updateFromScroll);
    return () => {
      window.removeEventListener("scroll", updateFromScroll);
      window.removeEventListener("resize", updateFromScroll);
    };
  }, [moments.length]);

  useEffect(() => {
    if (!moments.length) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        scrollToChapter(chapter + 1);
      }
      if (event.key === "ArrowUp" || event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        scrollToChapter(chapter - 1);
      }
      if (event.key === "Home") {
        event.preventDefault();
        scrollToChapter(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        scrollToChapter(moments.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chapter, moments.length, scrollToChapter]);

  const active = moments[chapter] ?? null;
  const image = active ? resolveMemoryThumbnail(active) : undefined;
  const branchNodes = useMemo(() => moments.slice(0, 10), [moments]);

  if (loading) {
    return <TreeViewShell treeId={treeId} activeView="story"><div className="v4-final-state">공개 스토리를 준비하고 있어요…</div></TreeViewShell>;
  }
  if (error || !tree) {
    return <TreeViewShell treeId={treeId} activeView="story"><div className="v4-final-state" role="alert">{error || "Public Story를 열 수 없어요."}</div></TreeViewShell>;
  }
  if (!active) {
    return <TreeViewShell treeId={treeId} activeView="story" isOwner={isOwner}><div className="v4-final-state">공개된 순간이 아직 없어요.</div></TreeViewShell>;
  }

  return (
    <TreeViewShell treeId={treeId} activeView="story" userLabel={user?.displayName || user?.email || undefined} isOwner={isOwner}>
      <div
        ref={scrollSpace}
        className="v4-story-scroll-space"
        style={{ height: `${Math.max(4, moments.length + 1) * 100}vh` }}
        data-story-chapters={moments.length}
      >
        <section className="v4-story v4-story-sticky" aria-label="Public Story sticky scroll exhibition">
          <aside className="v4-story-rail">
            <small>PUBLIC STORY</small>
            {moments.map((memory, index) => (
              <button
                type="button"
                key={memory.id}
                className={chapter === index ? "is-active" : ""}
                aria-current={chapter === index ? "step" : undefined}
                onClick={() => scrollToChapter(index)}
              >
                <i />{String(index + 1).padStart(2, "0")}
              </button>
            ))}
          </aside>
          <div className="v4-story-stage">
            <div className="v4-story-heart" aria-hidden="true"><i /><i /><i /></div>
            <article className="v4-story-copy" key={active.id}>
              <small>CHAPTER {String(chapter + 1).padStart(2, "0")} · {formatTreeDate(dateOf(active))}</small>
              <h1>{chapter === 0 ? tree.title : titleOf(active, chapter)}</h1>
              <p>{active.memo || "한 순간이 다음 순간의 가지가 되었습니다."}</p>
              {active.parentId ? (
                <div className="v4-story-relation" data-why-next>
                  <span className="v4-story-relation-label">이전 순간에서 이어짐</span>
                  {active.connectionReason && active.connectionReason.trim() ? (
                    <p className="v4-story-relation-reason">{active.connectionReason}</p>
                  ) : (
                    <p className="v4-story-relation-reason v4-story-relation-generic">이전 순간과 이어지는 관계</p>
                  )}
                </div>
              ) : null}
              <div className="v4-story-tags">{(active.emotionTags || []).map((tag) => <span key={tag}>#{tag}</span>)}</div>
              <div className="v4-story-links">
                <Link href={`/trees/${encodeURIComponent(treeId)}?moment=${encodeURIComponent(active.id)}`}>Moment detail →</Link>
                {isSafeExternalUrl(active.sourceUrl) ? <a href={active.sourceUrl} target="_blank" rel="noreferrer noopener">Source ↗</a> : null}
              </div>
            </article>
            <div className="v4-story-media" key={`media-${active.id}`} style={image ? { backgroundImage: `linear-gradient(180deg,rgba(19,12,8,.05),rgba(19,12,8,.45)),url(${image})` } : undefined}>
              <span>{chapter + 1} / {moments.length}</span>
            </div>
            <svg className="v4-story-branch" viewBox="0 0 980 320" aria-hidden="true">
              <path d="M30 286 C170 270 230 203 342 191 C500 174 586 85 942 42" />
              {branchNodes.map((_, index) => {
                const progress = branchNodes.length <= 1 ? 0 : index / (branchNodes.length - 1);
                return <circle key={index} cx={80 + progress * 820} cy={260 - progress * 190} r={chapter === index ? 11 : index < chapter ? 7 : 4} />;
              })}
            </svg>
            <div className="v4-story-readout"><span>{String(chapter + 1).padStart(2, "0")}</span><i><b style={{ width: `${((chapter + 1) / moments.length) * 100}%` }} /></i><em>{String(moments.length).padStart(2, "0")}</em></div>
          </div>
        </section>
      </div>
    </TreeViewShell>
  );
}
