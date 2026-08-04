"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  videoId: string;
}

const TREES: CommunityTree[] = [
  { id: "c1", title: "주연에게 마음이 멈춘 순간들", owner: "윤하", emotion: "설렘", summary: "처음 본 한 장면부터 라이브와 인터뷰까지 이어진 입덕의 첫 계절", moments: 84, branches: 79, likes: 128, date: "2026.06.21", videoId: "dQw4w9WgXcQ" },
  { id: "c2", title: "여름 바다로 이어진 노래", owner: "하린", emotion: "그리움", summary: "한 곡에서 시작해 바다와 기차 여행으로 이어진 여름의 러브트리", moments: 42, branches: 38, likes: 91, date: "2026.07.02", videoId: "ysz5S6PUM-U" },
  { id: "c3", title: "오래 남은 영화의 문장", owner: "서우", emotion: "위로", summary: "영화 한 장면과 책 속 문장이 서로를 설명하기 시작한 기록", moments: 61, branches: 57, likes: 176, date: "2026.07.11", videoId: "M7lc1UVf-VE" },
  { id: "c4", title: "가족의 오래된 캠코더", owner: "민지", emotion: "따뜻함", summary: "어린 시절 영상과 지금의 목소리를 같은 나무에 연결한 가족 기록", moments: 116, branches: 108, likes: 224, date: "2026.07.16", videoId: "aqz-KE-bpKQ" },
  { id: "c5", title: "다시 걷고 싶은 골목", owner: "도현", emotion: "그리움", summary: "여행지의 짧은 영상과 지도보다 먼저 떠오르는 장면들", moments: 37, branches: 33, likes: 69, date: "2026.07.23", videoId: "ScMzIvxBSi4" },
  { id: "c6", title: "친구들과 보낸 긴 밤", owner: "가은", emotion: "벅참", summary: "웃음과 노래, 새벽 문장이 느슨한 가지로 이어진 공동의 기억", moments: 53, branches: 49, likes: 147, date: "2026.07.27", videoId: "jNQXAC9IVRw" },
  { id: "c7", title: "비 오는 날 다시 찾은 재즈", owner: "선우", emotion: "평온", summary: "한 플레이리스트에서 시작해 계절마다 돌아온 음악의 흐름", moments: 75, branches: 69, likes: 132, date: "2026.07.30", videoId: "aqz-KE-bpKQ" },
  { id: "c8", title: "엄마와 나눈 작은 여행", owner: "유리", emotion: "따뜻함", summary: "사진과 음성, 식당 영수증까지 한 나무에 남긴 모녀의 여행", moments: 48, branches: 44, likes: 198, date: "2026.08.01", videoId: "dQw4w9WgXcQ" },
  { id: "c9", title: "처음 좋아한 야구의 계절", owner: "정민", emotion: "벅참", summary: "첫 직관에서 응원가와 선수 인터뷰로 이어진 한 시즌의 기록", moments: 92, branches: 86, likes: 163, date: "2026.08.02", videoId: "ysz5S6PUM-U" },
];

const EMOTIONS = ["전체", "설렘", "그리움", "위로", "따뜻함", "벅참", "평온"];

function TreeSketch({ tree, large = false }: { tree: CommunityTree; large?: boolean }) {
  const nodes = Array.from({ length: large ? 11 : 7 }, (_, index) => ({
    x: 17 + (index % 4) * 22 + (index % 2) * 4,
    y: 16 + Math.floor(index / 4) * 29 + (index % 3) * 4,
  }));
  return (
    <>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path className="v4-preview-branch" d="M8 87 C25 74 31 56 42 44 C58 26 73 24 92 10" />
        <path className="v4-preview-branch" d="M35 54 C28 42 19 34 11 29" style={{ strokeWidth: 3 }} />
        <path className="v4-preview-branch" d="M54 31 C65 45 77 56 91 62" style={{ strokeWidth: 3 }} />
      </svg>
      {nodes.map((node, index) => <span className="v4-preview-node" key={index} style={{ left: `${node.x}%`, top: `${node.y}%`, width: large ? 106 : 78, transform: `rotate(${index % 2 ? 2 : -2}deg)` }}>{index === 0 ? tree.title : ["첫 장면", "다음 영상", "오래 남은 말", "다시 찾은 노래"][index % 4]}</span>)}
    </>
  );
}

export default function V4CommunityDiscovery() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [emotion, setEmotion] = useState("전체");
  const [sort, setSort] = useState<"latest" | "popular" | "moments">("latest");
  const [compare, setCompare] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const filtered = useMemo(() => {
    const result = TREES.filter((tree) =>
      (emotion === "전체" || tree.emotion === emotion) &&
      (!query.trim() || `${tree.title} ${tree.owner} ${tree.summary}`.includes(query.trim())),
    );
    return [...result].sort((a, b) => sort === "popular" ? b.likes - a.likes : sort === "moments" ? b.moments - a.moments : b.date.localeCompare(a.date));
  }, [emotion, query, sort]);

  const preview = TREES.find((tree) => tree.id === previewId) ?? null;
  const compared = compare.map((id) => TREES.find((tree) => tree.id === id)).filter(Boolean) as CommunityTree[];

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
    if (dialog) {
      const focusable = dialog.querySelector<HTMLElement>("button, a[href]");
      focusable?.focus();
    }
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
          <span className="v4-community-count">{TREES.length} public trees</span>
        </header>

        <section className="v4-community-hero">
          <div><p>COMMUNITY DISCOVERY</p><h1>누군가의 첫 순간이<br /><em>나의 다음 가지가</em> 될지도 몰라요.</h1></div>
          <span>공개된 러브트리를 빠르게 비교하고, 큰 미리보기에서 흐름을 읽은 뒤, 읽기 전용 전체 트리로 들어갑니다. 개인 메모와 편집 도구는 공개 화면에 나타나지 않습니다.</span>
        </section>

        <div className="v4-community-toolbar">
          <input className="v4-community-search" type="search" placeholder="트리, 사람, 문장 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="v4-community-filters">{EMOTIONS.map((item) => <button className={`v4-community-chip${emotion === item ? " is-selected" : ""}`} type="button" key={item} onClick={() => setEmotion(item)}>{item}</button>)}</div>
          <select className="v4-community-sort" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="latest">최신순</option><option value="popular">인기순</option><option value="moments">순간 많은 순</option></select>
        </div>

        <div className="v4-community-layout">
          <section className="v4-community-grid" aria-label="공개 러브트리 목록">
            {filtered.map((tree) => {
              const selected = compare.includes(tree.id);
              return <article className={`v4-community-card${selected ? " is-selected" : ""}`} key={tree.id}>
                <div className="v4-community-media" style={{ backgroundImage: `url(https://img.youtube.com/vi/${tree.videoId}/hqdefault.jpg)` }}><span className="v4-community-emotion">{tree.emotion}</span><span className="v4-community-stats">♥ {tree.likes} · {tree.moments} moments</span></div>
                <div className="v4-community-copy"><small>{tree.owner} · {tree.date}</small><h2>{tree.title}</h2><p>{tree.summary}</p><div className="v4-community-card-actions"><button className="v4-community-action" type="button" onClick={() => toggleCompare(tree.id)}>{selected ? "비교에서 빼기" : "빠른 비교"}</button><button className="v4-community-action is-primary" type="button" onClick={() => setPreviewId(tree.id)}>큰 미리보기</button></div></div>
              </article>;
            })}
          </section>

          <aside className="v4-compare-panel">
            <h2>빠른 비교</h2><p>최대 세 개의 트리를 나란히 보고 감정, 순간 수와 성장 밀도를 비교합니다.</p>
            {compared.length ? <div className="v4-compare-list">{compared.map((tree) => <div className="v4-compare-item" key={tree.id}><span className="v4-compare-thumb" style={{ backgroundImage: `url(https://img.youtube.com/vi/${tree.videoId}/hqdefault.jpg)` }} /><span><strong>{tree.title}</strong><small>{tree.emotion} · {tree.moments} 순간 · ♥ {tree.likes}</small></span><button className="v4-compare-remove" type="button" aria-label={`${tree.title} 비교 제외`} onClick={() => toggleCompare(tree.id)}>×</button></div>)}</div> : <div className="v4-compare-empty">카드에서 ‘빠른 비교’를 눌러<br />관심 있는 트리를 담아 보세요.</div>}
            <button className="v4-compare-button" type="button" disabled={compared.length < 2} onClick={() => setCompareOpen(true)}>선택한 트리 비교하기</button>
          </aside>
        </div>
      </div>

      {preview ? <div className="v4-community-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeDialogs(); }}><section className="v4-community-preview" role="dialog" aria-modal="true" aria-label="공개 트리 큰 미리보기" ref={previewRef}><div className="v4-preview-grid"><div className="v4-preview-tree"><TreeSketch tree={preview} large /></div><aside className="v4-preview-detail"><small>{preview.owner.toUpperCase()} · {preview.emotion.toUpperCase()}</small><h2>{preview.title}</h2><p>{preview.summary}</p><div className="v4-preview-meta"><div><b>{preview.moments}</b><span>순간</span></div><div><b>{preview.branches}</b><span>가지</span></div><div><b>{preview.likes}</b><span>좋아요</span></div></div><p>큰 미리보기에서는 대표 가지와 흐름만 보여 줍니다. 전체 트리에서는 모든 공개 순간을 팬·줌으로 둘러볼 수 있습니다.</p><div className="v4-preview-actions"><button className="v4-community-action" type="button" onClick={closeDialogs}>닫기</button><button className="v4-community-action is-primary" type="button" onClick={() => router.push("/v4/community/trees/demo")}>전체 트리 열기 →</button></div></aside></div></section></div> : null}

      {compareOpen ? <div className="v4-community-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeDialogs(); }}><section className="v4-community-preview" role="dialog" aria-modal="true" aria-label="트리 비교" ref={compareRef}><div style={{ padding: 28 }}><p style={{ color: "var(--c-rose2)", fontSize: ".48rem", fontWeight: 700, letterSpacing: ".1em" }}>QUICK COMPARE</p><h2 style={{ margin: "7px 0 18px", font: "400 2rem 'Gowun Batang',serif" }}>선택한 러브트리 비교</h2><div style={{ display: "grid", gridTemplateColumns: `repeat(${compared.length},minmax(0,1fr))`, gap: 12 }}>{compared.map((tree) => <article key={tree.id} style={{ padding: 17, border: "1px solid var(--c-line)", borderRadius: 18, background: "#fffdf9" }}><div style={{ height: 150, borderRadius: 12, background: `url(https://img.youtube.com/vi/${tree.videoId}/hqdefault.jpg) center/cover` }} /><h3 style={{ font: "400 1rem 'Gowun Batang',serif" }}>{tree.title}</h3><p style={{ color: "var(--c-muted)", fontSize: ".55rem", lineHeight: 1.6 }}>{tree.summary}</p><strong style={{ color: "var(--c-rose2)", fontSize: ".58rem" }}>{tree.emotion} · {tree.moments} 순간 · {tree.branches} 가지</strong></article>)}</div><button className="v4-community-action is-primary" style={{ marginTop: 18 }} type="button" onClick={closeDialogs}>비교 닫기</button></div></section></div> : null}
    </main>
  );
}

const PUBLIC_NODES = Array.from({ length: 18 }, (_, index) => ({
  id: `p${index}`,
  x: 110 + (index % 6) * 205 + (index % 2) * 25,
  y: 90 + Math.floor(index / 6) * 260 + (index % 3) * 22,
  title: ["처음 마음이 멈춘 장면", "다시 찾아본 무대", "오래 남은 인터뷰", "추천받은 노래", "문득 다시 생각난 밤", "함께 본 라이브"][index % 6],
  videoId: TREES[index % TREES.length].videoId,
}));

export function V4PublicTree() {
  const [zoom, setZoom] = useState(.82);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);
  function down(event: ReactPointerEvent<HTMLDivElement>) { event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }; }
  function move(event: ReactPointerEvent<HTMLDivElement>) { if (!drag.current || drag.current.id !== event.pointerId) return; setOffset({ x: drag.current.ox + event.clientX - drag.current.x, y: drag.current.oy + event.clientY - drag.current.y }); }
  function up(event: ReactPointerEvent<HTMLDivElement>) { if (drag.current?.id === event.pointerId) drag.current = null; }
  const branchPaths = PUBLIC_NODES.slice(1).map((node, index) => { const parent = PUBLIC_NODES[Math.max(0, Math.floor(index / 2))]; return `M ${parent.x + 176} ${parent.y + 75} C ${parent.x + 240} ${parent.y + 75}, ${node.x - 60} ${node.y + 75}, ${node.x} ${node.y + 75}`; });
  return <main className="v4-community-page v4-public-page"><header className="v4-public-toolbar"><Link href="/v4/community">← 커뮤니티</Link><strong>주연에게 마음이 멈춘 순간들</strong><span className="v4-readonly-badge">읽기 전용 공개 트리</span><button className="v4-public-control" type="button" onClick={() => setZoom((value) => Math.max(.5, value - .1))}>−</button><span style={{ minWidth: 38, textAlign: "center", color: "var(--c-rose2)", fontSize: ".52rem" }}>{Math.round(zoom * 100)}%</span><button className="v4-public-control" type="button" onClick={() => setZoom((value) => Math.min(1.3, value + .1))}>＋</button><button className="v4-public-control" type="button" onClick={() => { setZoom(.82); setOffset({ x: 0, y: 0 }); }}>맞춤</button></header><section className="v4-public-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><div className="v4-public-canvas" style={{ transform: `translate(${offset.x}px,${offset.y}px) scale(${zoom})` }}><svg viewBox="0 0 1400 850" aria-hidden="true">{branchPaths.map((path,index)=><path className="v4-preview-branch" key={index} d={path}/>)}</svg>{PUBLIC_NODES.map((node,index)=><article className="v4-public-node" key={node.id} style={{left:node.x,top:node.y,transform:`rotate(${index%2?1.2:-1.1}deg)`}}><img src={`https://img.youtube.com/vi/${node.videoId}/hqdefault.jpg`} alt=""/><small>PUBLIC MOMENT · {String(index+1).padStart(2,"0")}</small><strong>{node.title}</strong></article>)}</div></section></main>;
}
