"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { resolveMemoryThumbnail, type MemoryRecord, type TreeRecord } from "@/lib/tree-types";

interface DiscoveryTree extends TreeRecord {
  likeCount?: number;
  viewCount?: number;
  publicMoments: MemoryRecord[];
  cover: string;
  emotions: string[];
}

const FEELING_COPY: Record<string, string> = {
  전체: "어떤 마음에서 시작했든, 세 개 이상의 공개 순간이 이어진 러브트리만 이 정원에 나타납니다.",
  설렘: "처음 알게 된 장면과 다시 찾아본 순간이 빠르게 가지를 만드는 마음.",
  그리움: "시간이 지난 뒤에도 다시 열어 보게 되는 장면과 문장.",
  위로: "힘든 날에 돌아와 머물렀던 영상, 노래, 책과 사람의 기록.",
  따뜻함: "가족과 친구, 여행처럼 오래 곁에 두고 싶은 기억의 결.",
  벅참: "무대와 경기, 여행의 절정처럼 다시 꺼내도 크게 움직이는 순간.",
  평온: "조용히 반복해서 찾게 되는 음악과 장소, 사소한 일상의 기록.",
};

const PRINCIPLES = [
  ["01", "Begin with one real moment", "설명보다 먼저 마음이 멈춘 실제 장면 하나를 심습니다."],
  ["02", "Let the next moment connect", "다시 찾아본 영상과 문장, 장소가 이유를 가진 가지로 이어집니다."],
  ["03", "Keep the private parts private", "공개한 Tree라도 비공개 Moment는 커뮤니티와 Public Story에 노출되지 않습니다."],
] as const;

function treeLabel(tree: DiscoveryTree) {
  return tree.artist?.trim() || tree.groupName?.trim() || "LoveTree member";
}

function firstEmotion(tree: DiscoveryTree) {
  return tree.emotions[0] || "기록";
}

function DiscoveryCard({ tree, onOpen }: { tree: DiscoveryTree; onOpen: () => void }) {
  return (
    <article className="v4-global-tree-card">
      <button type="button" className="v4-global-tree-media" onClick={onOpen} style={tree.cover ? { backgroundImage: `linear-gradient(180deg,transparent 35%,rgba(3,32,24,.58)),url(${tree.cover})` } : undefined} aria-label={`${tree.title} 열기`}>
        <span>{firstEmotion(tree)}</span><small>{tree.publicMoments.length} PUBLIC MOMENTS</small>
      </button>
      <div><small>{treeLabel(tree)}</small><h3>{tree.title}</h3><p>{tree.memo || "공개된 순간들이 하나의 흐름으로 이어진 러브트리"}</p><div><span>♥ {Number(tree.likeCount || 0)}</span><button type="button" onClick={onOpen}>Explore →</button></div></div>
    </article>
  );
}

export default function V4GlobalDiscoveryHome() {
  const router = useRouter();
  const [trees, setTrees] = useState<DiscoveryTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeling, setFeeling] = useState("전체");
  const [sort, setSort] = useState<"popular" | "latest">("popular");
  const [paused, setPaused] = useState(false);
  const revealRoot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const response = await apiFetch(`/api/community/trees?view=summary&sort=${sort}&limit=24`);
        const rows = await response.json().catch(() => []);
        if (!response.ok || !Array.isArray(rows)) throw new Error("공개 러브트리를 불러오지 못했습니다.");
        const hydrated = await Promise.all(rows.map(async (row: TreeRecord & { likeCount?: number; viewCount?: number }) => {
          const momentsResponse = await apiFetch(`/api/community/memories?treeId=${encodeURIComponent(row.id)}&limit=200`);
          const momentRows = await momentsResponse.json().catch(() => []);
          const publicMoments = momentsResponse.ok && Array.isArray(momentRows) ? momentRows as MemoryRecord[] : [];
          const cover = publicMoments.map(resolveMemoryThumbnail).find(Boolean) || "";
          const emotions = [...new Set(publicMoments.flatMap((moment) => moment.emotionTags || []))];
          return { ...row, publicMoments, cover, emotions } as DiscoveryTree;
        }));
        if (active) { setTrees(hydrated); setError(null); }
      } catch (cause) {
        if (active) { setTrees([]); setError(cause instanceof Error ? cause.message : "공개 러브트리를 불러오지 못했습니다."); }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [sort]);

  useEffect(() => {
    const root = revealRoot.current;
    if (!root) return;
    const items = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { items.forEach((item) => item.classList.add("is-visible")); return; }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add("is-visible"); }), { threshold: .13 });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [trees.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "r") window.scrollTo({ top: 0, behavior: "smooth" });
      if (event.code === "Space" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLButtonElement)) { event.preventDefault(); setPaused((value) => !value); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const feelings = useMemo(() => ["전체", ...new Set(trees.flatMap((tree) => tree.emotions))].slice(0, 8), [trees]);
  const visible = useMemo(() => feeling === "전체" ? trees : trees.filter((tree) => tree.emotions.includes(feeling)), [feeling, trees]);
  const feature = visible[0] || trees[0] || null;
  const openTree = (tree: DiscoveryTree) => router.push(`/trees/${encodeURIComponent(tree.id)}`);
  const start = () => router.push("/v4?start=1");

  return (
    <main className={`v4-global-discovery${paused ? " is-paused" : ""}`} ref={revealRoot}>
      <header className="v4-global-nav"><Link href="/v4" className="v4-global-brand"><span aria-hidden="true">✦</span>LoveTree</Link><nav><a href="#discover">Discover</a><a href="#trees">LoveTrees</a><a href="#how">How it grows</a><a href="#feelings">Feelings</a></nav><div><Link href="/my-trees">My Trees</Link><button type="button" onClick={start}>Plant a moment</button></div></header>

      <section className="v4-global-hero" data-reveal>
        <div className="v4-global-hero-copy"><small>LOVETREE · BEGIN WITH A MOMENT</small><h1>Every lasting obsession<br />begins with <em>one moment.</em></h1><p>좋아하게 된 시작을 한 장면으로 심고, 다시 찾은 순간들을 연결하세요. 시간이 쌓이면 영상과 문장, 사람과 장소가 하나의 살아 있는 러브트리가 됩니다.</p><div><button type="button" onClick={start}>Plant your first moment</button><a href="#trees">Explore LoveTrees</a></div></div>
        <div className="v4-global-hero-art" aria-hidden="true"><div className="v4-global-sun" /><svg viewBox="0 0 680 620"><path d="M58 580 C175 488 201 371 293 302 C389 230 450 147 615 52"/><path d="M235 350 C178 303 142 239 88 213"/><path d="M338 260 C417 291 485 350 567 388"/></svg>{trees.slice(0, 3).map((tree, index) => <span key={tree.id} className={`v4-global-seed seed-${index + 1}`} style={tree.cover ? { backgroundImage: `url(${tree.cover})` } : undefined} />)}</div>
      </section>

      <section className="v4-global-rail-section" id="trees" data-reveal><header><div><small>PUBLIC GARDEN</small><h2>LoveTrees growing now.</h2></div><div className="v4-global-sort"><button className={sort === "popular" ? "is-active" : ""} onClick={() => setSort("popular")} type="button">Most Loved</button><button className={sort === "latest" ? "is-active" : ""} onClick={() => setSort("latest")} type="button">New Paths</button></div></header>{loading ? <div className="v4-global-empty">공개 러브트리를 불러오는 중입니다.</div> : error ? <div className="v4-global-empty" role="alert">{error}</div> : visible.length ? <div className="v4-global-tree-rail">{visible.map((tree) => <DiscoveryCard key={tree.id} tree={tree} onOpen={() => openTree(tree)} />)}</div> : <div className="v4-global-empty">조건에 맞는 공개 러브트리가 없습니다.</div>}</section>

      <section className="v4-global-curated" id="discover" data-reveal><div><small>CURATED PATHS</small><h2>Not a feed.<br />A garden of paths.</h2><p>좋아요 수만으로 줄을 세우지 않습니다. 최근에 자란 나무, 조용히 오래 이어진 나무, 특정 감정이 선명한 나무를 서로 다른 길로 발견할 수 있습니다.</p></div><div className="v4-global-paths"><article><b>01</b><h3>First Sparks</h3><p>처음 마음이 멈춘 장면에서 빠르게 세 번째 순간까지 자란 Tree.</p></article><article><b>02</b><h3>Quiet Discoveries</h3><p>큰 반응보다 조용한 재방문이 오래 이어지는 공개 기록.</p></article><article><b>03</b><h3>Long Seasons</h3><p>시간 간격이 길어도 다시 돌아와 새로운 가지를 만든 Tree.</p></article></div></section>

      <section className="v4-global-principles" id="how" data-reveal><header><small>HOW A LOVETREE GROWS</small><h2>One moment. Then another.</h2></header><div>{PRINCIPLES.map(([number,title,copy]) => <article key={number}><b>{number}</b><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

      <section className="v4-global-feelings" id="feelings" data-reveal><div className="v4-global-feeling-copy"><small>DISCOVER BY FEELING</small><h2>What kind of feeling<br />are you carrying?</h2><p>{FEELING_COPY[feeling] || `‘${feeling}’ 태그가 남은 공개 순간을 가진 러브트리입니다.`}</p><div>{feelings.map((item) => <button type="button" className={feeling === item ? "is-active" : ""} key={item} onClick={() => setFeeling(item)}>{item}</button>)}</div></div><div className="v4-global-feeling-stack">{visible.slice(0, 3).map((tree,index) => <button type="button" key={tree.id} onClick={() => openTree(tree)} style={{ zIndex: 4 - index, transform: `translate(${index * 24}px,${index * 36}px) rotate(${index * 2 - 2}deg)`, backgroundImage: tree.cover ? `linear-gradient(180deg,transparent,#052c22cc),url(${tree.cover})` : undefined }}><span>{tree.title}</span><small>{tree.publicMoments.length} moments · {firstEmotion(tree)}</small></button>)}</div></section>

      {feature ? <section className="v4-global-feature" data-reveal><div className="v4-global-feature-media" style={feature.cover ? { backgroundImage: `url(${feature.cover})` } : undefined}><span>FEATURED LOVETREE</span></div><div><small>{treeLabel(feature)}</small><h2>{feature.title}</h2><p>{feature.memo || "한 순간으로 시작해 여러 공개 순간으로 자란 러브트리입니다."}</p><dl><div><dt>Public moments</dt><dd>{feature.publicMoments.length}</dd></div><div><dt>Likes</dt><dd>{Number(feature.likeCount || 0)}</dd></div><div><dt>Feelings</dt><dd>{feature.emotions.slice(0,3).join(" · ") || "recorded"}</dd></div></dl><button type="button" onClick={() => router.push(`/trees/${encodeURIComponent(feature.id)}/story`)}>Read as Public Story →</button></div></section> : null}

      <section className="v4-global-before-after" data-reveal><div><small>WHAT CHANGES</small><h2>Before: scattered links.<br />After: a living memory path.</h2></div><div className="v4-global-transform"><article><span>BEFORE</span><p>영상 링크<br />메모 조각<br />스크린샷<br />다시 찾기 어려운 기억</p></article><i>→</i><article><span>LOVETREE</span><p>연결된 순간<br />감정의 흐름<br />공개/비공개 경계<br />다시 걸어볼 수 있는 이야기</p></article></div></section>

      <section className="v4-global-statement" data-reveal><small>YOUR MEMORY IS NOT CONTENT TO SCROLL PAST.</small><h2>Keep what moved you.<br /><em>Let it grow.</em></h2><button type="button" onClick={start}>Plant your first moment →</button><p>R: top · Space: pause reveal motion</p></section>
    </main>
  );
}
