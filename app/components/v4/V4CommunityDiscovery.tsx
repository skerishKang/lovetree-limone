"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface CommunityTreeApi {
  id: string;
  title?: string | null;
  artist?: string | null;
  memo?: string | null;
  groupName?: string | null;
  keywords?: string[] | null;
  createdAt?: string | Date | null;
  likeCount?: number | null;
  viewCount?: number | null;
}

interface CommunityMemoryApi {
  id: string;
  treeId: string;
  parentId?: string | null;
  title?: string | null;
  memo?: string | null;
  thumbnail?: string | null;
  sourceUrl?: string | null;
  sourceType?: string | null;
  emotionTags?: string[] | null;
  timestamp?: string | null;
  createdAt?: string | Date | null;
  sortOrder?: number | null;
}

interface CommunityTree {
  id: string;
  title: string;
  owner: string;
  emotion: string;
  summary: string;
  moments: number;
  branches: number;
  likes: number;
  date: string;
  mediaUrl: string;
  memories: CommunityMemoryApi[];
}

const EMOTIONS = ["전체", "설렘", "그리움", "위로", "따뜻함", "벅참", "평온"];

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10).replaceAll("-", ".");
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .format(date)
    .replace(/\.\s?/g, ".")
    .replace(/\.$/, "");
}

function memoryLabel(memory: CommunityMemoryApi): string {
  return memory.title?.trim() || memory.memo?.trim() || "공개 순간";
}

function visibleBranchCount(memories: CommunityMemoryApi[]): number {
  const visibleIds = new Set(memories.map((memory) => memory.id));
  return memories.filter((memory) => memory.parentId && visibleIds.has(memory.parentId)).length;
}

function toCommunityTree(tree: CommunityTreeApi, memories: CommunityMemoryApi[]): CommunityTree {
  const firstMedia = memories.find((memory) => memory.thumbnail)?.thumbnail || "";
  const firstEmotion = memories.flatMap((memory) => memory.emotionTags || []).find(Boolean) || "기록";
  return {
    id: tree.id,
    title: tree.title?.trim() || "이름 없는 러브트리",
    owner: tree.artist?.trim() || tree.groupName?.trim() || "LoveTree",
    emotion: firstEmotion,
    summary: tree.memo?.trim() || "공개된 순간들이 이어지는 러브트리입니다.",
    moments: memories.length,
    branches: visibleBranchCount(memories),
    likes: Number(tree.likeCount || 0),
    date: formatDate(tree.createdAt),
    mediaUrl: firstMedia,
    memories,
  };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Community API request failed (${response.status})`);
  return response.json() as Promise<T>;
}

function TreeSketch({ tree, large = false }: { tree: CommunityTree; large?: boolean }) {
  const labels = tree.memories.length ? tree.memories.map(memoryLabel) : [tree.title];
  const nodes = Array.from({ length: Math.min(large ? 11 : 7, Math.max(1, labels.length)) }, (_, index) => ({
    x: 17 + (index % 4) * 22 + (index % 2) * 4,
    y: 16 + Math.floor(index / 4) * 29 + (index % 3) * 4,
    label: index === 0 ? tree.title : labels[index % labels.length],
  }));
  return (
    <>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path className="v4-preview-branch" d="M8 87 C25 74 31 56 42 44 C58 26 73 24 92 10" />
        <path className="v4-preview-branch" d="M35 54 C28 42 19 34 11 29" style={{ strokeWidth: 3 }} />
        <path className="v4-preview-branch" d="M54 31 C65 45 77 56 91 62" style={{ strokeWidth: 3 }} />
      </svg>
      {nodes.map((node, index) => <span className="v4-preview-node" key={`${tree.id}-${index}`} style={{ left: `${node.x}%`, top: `${node.y}%`, width: large ? 106 : 78, transform: `rotate(${index % 2 ? 2 : -2}deg)` }}>{node.label}</span>)}
    </>
  );
}

export default function V4CommunityDiscovery() {
  const router = useRouter();
  const [trees, setTrees] = useState<CommunityTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [emotion, setEmotion] = useState("전체");
  const [sort, setSort] = useState<"latest" | "popular" | "moments">("latest");
  const [compare, setCompare] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadDiscovery() {
      setLoading(true);
      setError(null);
      try {
        const treeRows = await readJson<CommunityTreeApi[]>(await apiFetch("/api/community/trees?view=summary&sort=latest&limit=24"));
        const hydrated = await Promise.all(treeRows.map(async (tree) => {
          const memories = await readJson<CommunityMemoryApi[]>(await apiFetch(`/api/community/memories?treeId=${encodeURIComponent(tree.id)}&limit=200`));
          return toCommunityTree(tree, memories);
        }));
        if (active) setTrees(hydrated);
      } catch (loadError) {
        if (active) {
          setTrees([]);
          setError(loadError instanceof Error ? loadError.message : "공개 러브트리를 불러오지 못했습니다.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDiscovery();
    return () => { active = false; };
  }, []);

  const availableEmotions = useMemo(() => {
    const live = Array.from(new Set(trees.map((tree) => tree.emotion).filter((item) => item && item !== "기록")));
    return ["전체", ...EMOTIONS.slice(1).filter((item) => live.includes(item)), ...live.filter((item) => !EMOTIONS.includes(item))];
  }, [trees]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    const result = trees.filter((tree) =>
      (emotion === "전체" || tree.emotion === emotion) &&
      (!normalizedQuery || `${tree.title} ${tree.owner} ${tree.summary}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery)),
    );
    return [...result].sort((a, b) => sort === "popular" ? b.likes - a.likes : sort === "moments" ? b.moments - a.moments : b.date.localeCompare(a.date));
  }, [emotion, query, sort, trees]);

  const preview = trees.find((tree) => tree.id === previewId) ?? null;
  const compared = compare.map((id) => trees.find((tree) => tree.id === id)).filter(Boolean) as CommunityTree[];

  useEffect(() => {
    setCompare((current) => current.filter((id) => trees.some((tree) => tree.id === id)));
    if (previewId && !trees.some((tree) => tree.id === previewId)) setPreviewId(null);
  }, [previewId, trees]);

  const previewRef = useRef<HTMLElement>(null);
  const compareRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const dialogOpen = preview !== null || compareOpen;

  const closeDialogs = () => {
    setPreviewId(null);
    setCompareOpen(false);
    restoreFocusRef.current?.focus();
  };

  useEffect(() => {
    if (!dialogOpen) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = compareOpen ? compareRef.current : previewRef.current;
    if (dialog) dialog.querySelector<HTMLElement>("button, a[href]")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialogs();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [compareOpen, dialogOpen]);

  function toggleCompare(id: string) {
    setCompare((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 3 ? [...current.slice(1), id] : [...current, id]);
  }

  return (
    <main className="v4-community-page">
      <div className="v4-community-app">
        <header className="v4-community-top">
          <Link href="/v4">← LoveTree</Link>
          <Link className="v4-community-brand" href="/v4">LoveTree</Link>
          <div className="v4-community-top-copy"><strong>함께 자라는 정원</strong><small>SEARCH · FILTER · QUICK COMPARE · LARGE PREVIEW · FULL TREE</small></div>
          <span className="v4-community-count">{loading ? "…" : trees.length} public trees</span>
        </header>

        <section className="v4-community-hero">
          <div><p>COMMUNITY DISCOVERY</p><h1>누군가의 첫 순간이<br /><em>나의 다음 가지가</em> 될지도 몰라요.</h1></div>
          <span>공개된 러브트리를 빠르게 비교하고, 큰 미리보기에서 흐름을 읽은 뒤, 읽기 전용 전체 트리로 들어갑니다. 개인 메모와 편집 도구는 공개 화면에 나타나지 않습니다.</span>
        </section>

        <div className="v4-community-toolbar">
          <input className="v4-community-search" type="search" placeholder="트리, 사람, 문장 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="v4-community-filters">{availableEmotions.map((item) => <button className={`v4-community-chip${emotion === item ? " is-selected" : ""}`} type="button" key={item} onClick={() => setEmotion(item)}>{item}</button>)}</div>
          <select className="v4-community-sort" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="latest">최신순</option><option value="popular">인기순</option><option value="moments">순간 많은 순</option></select>
        </div>

        {error ? <div className="v4-compare-empty" role="alert">공개 러브트리를 불러오지 못했습니다.<br /><small>{error}</small></div> : null}
        {!error && loading ? <div className="v4-compare-empty" aria-live="polite">공개 러브트리를 불러오는 중입니다.</div> : null}

        {!error && !loading ? <div className="v4-community-layout">
          <section className="v4-community-grid" aria-label="공개 러브트리 목록">
            {filtered.length ? filtered.map((tree) => {
              const selected = compare.includes(tree.id);
              return <article className={`v4-community-card${selected ? " is-selected" : ""}`} key={tree.id}>
                <div className="v4-community-media" style={tree.mediaUrl ? { backgroundImage: `url(${tree.mediaUrl})` } : undefined}><span className="v4-community-emotion">{tree.emotion}</span><span className="v4-community-stats">♥ {tree.likes} · {tree.moments} moments</span></div>
                <div className="v4-community-copy"><small>{tree.owner} · {tree.date}</small><h2>{tree.title}</h2><p>{tree.summary}</p><div className="v4-community-card-actions"><button className="v4-community-action" type="button" onClick={() => toggleCompare(tree.id)}>{selected ? "비교에서 빼기" : "빠른 비교"}</button><button className="v4-community-action is-primary" type="button" onClick={() => setPreviewId(tree.id)}>큰 미리보기</button></div></div>
              </article>;
            }) : <div className="v4-compare-empty">조건에 맞는 공개 러브트리가 없습니다.</div>}
          </section>

          <aside className="v4-compare-panel">
            <h2>빠른 비교</h2><p>최대 세 개의 트리를 나란히 보고 감정, 순간 수와 성장 밀도를 비교합니다.</p>
            {compared.length ? <div className="v4-compare-list">{compared.map((tree) => <div className="v4-compare-item" key={tree.id}><span className="v4-compare-thumb" style={tree.mediaUrl ? { backgroundImage: `url(${tree.mediaUrl})` } : undefined} /><span><strong>{tree.title}</strong><small>{tree.emotion} · {tree.moments} 순간 · ♥ {tree.likes}</small></span><button className="v4-compare-remove" type="button" aria-label={`${tree.title} 비교 제외`} onClick={() => toggleCompare(tree.id)}>×</button></div>)}</div> : <div className="v4-compare-empty">카드에서 ‘빠른 비교’를 눌러<br />관심 있는 트리를 담아 보세요.</div>}
            <button className="v4-compare-button" type="button" disabled={compared.length < 2} onClick={() => setCompareOpen(true)}>선택한 트리 비교하기</button>
          </aside>
        </div> : null}
      </div>

      {preview ? <div className="v4-community-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeDialogs(); }}><section className="v4-community-preview" role="dialog" aria-modal="true" aria-label="공개 트리 큰 미리보기" ref={previewRef}><div className="v4-preview-grid"><div className="v4-preview-tree"><TreeSketch tree={preview} large /></div><aside className="v4-preview-detail"><small>{preview.owner.toUpperCase()} · {preview.emotion.toUpperCase()}</small><h2>{preview.title}</h2><p>{preview.summary}</p><div className="v4-preview-meta"><div><b>{preview.moments}</b><span>순간</span></div><div><b>{preview.branches}</b><span>공개 가지</span></div><div><b>{preview.likes}</b><span>좋아요</span></div></div><p>큰 미리보기에서는 공개된 대표 가지와 흐름만 보여 줍니다. 전체 트리에서도 공개 순간만 팬·줌으로 둘러볼 수 있습니다.</p><div className="v4-preview-actions"><button className="v4-community-action" type="button" onClick={closeDialogs}>닫기</button><button className="v4-community-action is-primary" type="button" onClick={() => router.push(`/v4/community/trees/${encodeURIComponent(preview.id)}`)}>전체 트리 열기 →</button></div></aside></div></section></div> : null}

      {compareOpen ? <div className="v4-community-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeDialogs(); }}><section className="v4-community-preview" role="dialog" aria-modal="true" aria-label="트리 비교" ref={compareRef}><div style={{ padding: 28 }}><p style={{ color: "var(--c-rose2)", fontSize: ".48rem", fontWeight: 700, letterSpacing: ".1em" }}>QUICK COMPARE</p><h2 style={{ margin: "7px 0 18px", font: "400 2rem 'Gowun Batang',serif" }}>선택한 러브트리 비교</h2><div style={{ display: "grid", gridTemplateColumns: `repeat(${compared.length},minmax(0,1fr))`, gap: 12 }}>{compared.map((tree) => <article key={tree.id} style={{ padding: 17, border: "1px solid var(--c-line)", borderRadius: 18, background: "#fffdf9" }}><div style={tree.mediaUrl ? { height: 150, borderRadius: 12, background: `url(${tree.mediaUrl}) center/cover` } : { height: 150, borderRadius: 12 }} /><h3 style={{ font: "400 1rem 'Gowun Batang',serif" }}>{tree.title}</h3><p style={{ color: "var(--c-muted)", fontSize: ".55rem", lineHeight: 1.6 }}>{tree.summary}</p><strong style={{ color: "var(--c-rose2)", fontSize: ".58rem" }}>{tree.emotion} · {tree.moments} 순간 · {tree.branches} 공개 가지</strong></article>)}</div><button className="v4-community-action is-primary" style={{ marginTop: 18 }} type="button" onClick={closeDialogs}>비교 닫기</button></div></section></div> : null}
    </main>
  );
}

interface PublicNode {
  id: string;
  parentId: string | null;
  x: number;
  y: number;
  title: string;
  mediaUrl: string;
}

function buildPublicNodes(memories: CommunityMemoryApi[]): PublicNode[] {
  const visibleIds = new Set(memories.map((memory) => memory.id));
  return memories.map((memory, index) => ({
    id: memory.id,
    parentId: memory.parentId && visibleIds.has(memory.parentId) ? memory.parentId : null,
    x: 110 + (index % 6) * 205 + (index % 2) * 25,
    y: 90 + Math.floor(index / 6) * 260 + (index % 3) * 22,
    title: memoryLabel(memory),
    mediaUrl: memory.thumbnail || "",
  }));
}

export function V4PublicTree({ treeId }: { treeId: string }) {
  const [tree, setTree] = useState<CommunityTreeApi | null>(null);
  const [memories, setMemories] = useState<CommunityMemoryApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(.82);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    let active = true;
    async function loadPublicTree() {
      setLoading(true);
      setError(null);
      try {
        const [treeRow, memoryRows] = await Promise.all([
          readJson<CommunityTreeApi>(await apiFetch(`/api/trees/${encodeURIComponent(treeId)}`)),
          readJson<CommunityMemoryApi[]>(await apiFetch(`/api/community/memories?treeId=${encodeURIComponent(treeId)}&limit=200`)),
        ]);
        if (active) {
          setTree(treeRow);
          setMemories(memoryRows);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "공개 트리를 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadPublicTree();
    return () => { active = false; };
  }, [treeId]);

  function down(event: ReactPointerEvent<HTMLDivElement>) { event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }; }
  function move(event: ReactPointerEvent<HTMLDivElement>) { if (!drag.current || drag.current.id !== event.pointerId) return; setOffset({ x: drag.current.ox + event.clientX - drag.current.x, y: drag.current.oy + event.clientY - drag.current.y }); }
  function up(event: ReactPointerEvent<HTMLDivElement>) { if (drag.current?.id === event.pointerId) drag.current = null; }

  const nodes = useMemo(() => buildPublicNodes(memories), [memories]);
  const positions = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const branchPaths = nodes.flatMap((node) => {
    if (!node.parentId) return [];
    const parent = positions.get(node.parentId);
    if (!parent) return [];
    return [`M ${parent.x + 176} ${parent.y + 75} C ${parent.x + 240} ${parent.y + 75}, ${node.x - 60} ${node.y + 75}, ${node.x} ${node.y + 75}`];
  });

  if (loading) return <main className="v4-community-page v4-public-page"><header className="v4-public-toolbar"><Link href="/v4/community">← 커뮤니티</Link><strong>공개 트리 불러오는 중</strong><span className="v4-readonly-badge">읽기 전용</span></header></main>;
  if (error || !tree) return <main className="v4-community-page v4-public-page"><header className="v4-public-toolbar"><Link href="/v4/community">← 커뮤니티</Link><strong>공개 트리를 열 수 없습니다</strong><span className="v4-readonly-badge">{error || "Not found"}</span></header></main>;

  return <main className="v4-community-page v4-public-page"><header className="v4-public-toolbar"><Link href="/v4/community">← 커뮤니티</Link><strong>{tree.title || "이름 없는 러브트리"}</strong><span className="v4-readonly-badge">읽기 전용 공개 트리 · {nodes.length} moments</span><button className="v4-public-control" type="button" onClick={() => setZoom((value) => Math.max(.5, value - .1))}>−</button><span style={{ minWidth: 38, textAlign: "center", color: "var(--c-rose2)", fontSize: ".52rem" }}>{Math.round(zoom * 100)}%</span><button className="v4-public-control" type="button" onClick={() => setZoom((value) => Math.min(1.3, value + .1))}>＋</button><button className="v4-public-control" type="button" onClick={() => { setZoom(.82); setOffset({ x: 0, y: 0 }); }}>맞춤</button></header><section className="v4-public-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><div className="v4-public-canvas" style={{ transform: `translate(${offset.x}px,${offset.y}px) scale(${zoom})` }}><svg viewBox="0 0 1400 850" aria-hidden="true">{branchPaths.map((path,index)=><path className="v4-preview-branch" key={`${path}-${index}`} d={path}/>)}</svg>{nodes.map((node,index)=><article className="v4-public-node" key={node.id} style={{left:node.x,top:node.y,transform:`rotate(${index%2?1.2:-1.1}deg)`}}>{node.mediaUrl ? <img src={node.mediaUrl} alt="" /> : <div aria-hidden="true" style={{ height: 88 }} />}<small>PUBLIC MOMENT · {String(index+1).padStart(2,"0")}</small><strong>{node.title}</strong></article>)}</div></section></main>;
}
