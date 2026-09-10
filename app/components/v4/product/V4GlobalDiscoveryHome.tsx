"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { resolveMemoryThumbnail, sourceTypeLabel, type MemoryRecord, type TreeRecord } from "@/lib/tree-types";

interface DiscoveryTree extends TreeRecord {
  likeCount?: number;
  viewCount?: number;
  publicMoments: MemoryRecord[];
  cover: string;
  emotions: string[];
}

type SortMode = "popular" | "latest" | "moments";
type TrackPalette = { accent: string; pale: string };

const PALETTES: TrackPalette[] = [
  { accent: "#8d69b7", pale: "#efe8f7" },
  { accent: "#c9626e", pale: "#f7dfe2" },
  { accent: "#d88791", pale: "#fae5e4" },
  { accent: "#7b9d91", pale: "#e3eee9" },
  { accent: "#8b785c", pale: "#eee6d8" },
  { accent: "#768f65", pale: "#e7edde" },
];
const FILTER_ORDER = ["전체", "설렘", "위로", "추억", "응원", "계절"];
const TREE_POSITIONS = [
  { x: 130, y: 86 }, { x: 760, y: 78 }, { x: 86, y: 390 }, { x: 790, y: 400 },
  { x: 270, y: 545 }, { x: 625, y: 550 }, { x: 345, y: 60 }, { x: 595, y: 70 },
] as const;

function paletteFor(tree: DiscoveryTree, index: number) {
  const seed = [...tree.id].reduce((sum, char) => sum + char.charCodeAt(0), index);
  return PALETTES[seed % PALETTES.length];
}

function mediaStyle(memory: MemoryRecord | undefined): CSSProperties | undefined {
  const source = memory ? resolveMemoryThumbnail(memory) : undefined;
  return source ? { backgroundImage: `linear-gradient(180deg,rgba(48,35,38,.02),rgba(48,35,38,.22)),url(${source})` } : undefined;
}

function safeMomentTitle(memory: MemoryRecord | undefined, fallback: string) {
  return memory?.title?.trim() || fallback;
}

function Track01TreeCard({ tree, selected, palette, onSelect }: {
  tree: DiscoveryTree;
  selected: boolean;
  palette: TrackPalette;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`track01-tree-card${selected ? " is-selected" : ""}`}
      onClick={onSelect}
      data-track01-tree-card
      data-tree-id={tree.id}
      style={{ "--track-accent": palette.accent, "--track-pale": palette.pale } as CSSProperties}
      aria-pressed={selected}
    >
      <span className="track01-card-thumb" style={tree.cover ? { backgroundImage: `url(${tree.cover})` } : undefined}>
        {selected ? <i aria-hidden="true">✦</i> : null}
      </span>
      <span className="track01-card-info">
        <span className="track01-card-title-row"><strong>{tree.title}</strong><i aria-hidden="true">♡</i></span>
        <span className="track01-card-desc">{tree.memo || "공개된 순간들이 하나의 흐름으로 이어진 러브트리"}</span>
        <small>순간 {tree.publicMoments.length}개 · 공감 {Number(tree.likeCount || 0).toLocaleString()}</small>
        <span className="track01-card-tags">{(tree.emotions.length ? tree.emotions : ["기록"]).slice(0, 2).map((emotion) => <em key={emotion}>{emotion}</em>)}</span>
      </span>
    </button>
  );
}

export default function V4GlobalDiscoveryHome() {
  const router = useRouter();
  const [trees, setTrees] = useState<DiscoveryTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("전체");
  const [sort, setSort] = useState<SortMode>("popular");
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [selectedMomentIndex, setSelectedMomentIndex] = useState(0);
  const [fullTreeOpen, setFullTreeOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const previewRef = useRef<HTMLElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const serverSort = sort === "latest" ? "latest" : "popular";
        const response = await apiFetch(`/api/community/trees?view=summary&sort=${serverSort}&limit=24`);
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
        if (active) {
          setTrees(hydrated);
          setError(null);
          setSelectedTreeId((current) => current && hydrated.some((tree) => tree.id === current) ? current : hydrated[0]?.id || null);
        }
      } catch (cause) {
        if (active) {
          setTrees([]);
          setSelectedTreeId(null);
          setError(cause instanceof Error ? cause.message : "공개 러브트리를 불러오지 못했습니다.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [sort]);

  const availableFilters = useMemo(() => {
    const values = new Set(trees.flatMap((tree) => tree.emotions));
    const preferred = FILTER_ORDER.filter((item) => item === "전체" || values.has(item));
    const extras = [...values].filter((item) => !FILTER_ORDER.includes(item)).slice(0, Math.max(0, 6 - preferred.length));
    return [...preferred, ...extras];
  }, [trees]);

  const visibleTrees = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = trees.filter((tree) => {
      if (filter !== "전체" && !tree.emotions.includes(filter)) return false;
      if (!query) return true;
      return [tree.title, tree.memo, tree.artist, tree.groupName, ...tree.emotions].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
    return sort === "moments" ? [...rows].sort((a, b) => b.publicMoments.length - a.publicMoments.length) : rows;
  }, [filter, search, sort, trees]);

  const selectedTree = visibleTrees.find((tree) => tree.id === selectedTreeId) || visibleTrees[0] || trees[0] || null;
  const selectedTreeIndex = selectedTree ? Math.max(0, trees.findIndex((tree) => tree.id === selectedTree.id)) : 0;
  const selectedPalette = selectedTree ? paletteFor(selectedTree, selectedTreeIndex) : PALETTES[0];
  const selectedMoment = selectedTree?.publicMoments[selectedMomentIndex] || selectedTree?.publicMoments[0] || null;
  const firstMoment = selectedTree?.publicMoments[0];
  const secondMoment = selectedTree?.publicMoments[1] || firstMoment;
  const thirdMoment = selectedTree?.publicMoments[2] || secondMoment || firstMoment;

  const selectTree = (tree: DiscoveryTree) => {
    setSelectedTreeId(tree.id);
    setSelectedMomentIndex(0);
    if (typeof window !== "undefined" && window.innerWidth < 981) {
      window.requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (fullTreeOpen && !dialog.open) dialog.showModal();
    if (!fullTreeOpen && dialog.open) dialog.close();
  }, [fullTreeOpen]);

  const closeFullTree = () => {
    setFullTreeOpen(false);
    window.requestAnimationFrame(() => openButtonRef.current?.focus());
  };
  const openFullTree = () => {
    if (!selectedTree) return;
    setSelectedMomentIndex(0);
    setZoom(1);
    setFullTreeOpen(true);
  };

  return (
    <main className="v4-global-discovery" data-track01-native="community">
      <div className="track01-page">
        <header className="track01-top">
          <Link className="track01-brand" href="/v4"><span className="track01-mark" aria-hidden="true"><i /><b /><em /></span><span><strong>러브트리</strong><small>LOVETREE</small></span></Link>
          <nav aria-label="LoveTree 주요 메뉴"><Link href="/v4">첫 화면</Link><Link href="/v4#about">LoveTree 소개 보기</Link><Link className="is-active" href="/v4/community" aria-current="page">둘러보기</Link><Link href="/v4?start=1">내 러브트리 시작하기</Link></nav>
          <Link className="track01-profile" href="/my-trees"><span aria-hidden="true">♥</span><b>My Trees</b><i aria-hidden="true">⌄</i></Link>
        </header>

        <div className="track01-main">
          <section className="track01-discovery" aria-labelledby="track01-title">
            <div className="track01-intro"><p className="track01-kicker">공개 러브트리 둘러보기</p><h1 id="track01-title">마음이 머무는 <em>순간들을</em><br />천천히 감상해보세요</h1><p>다른 사람들이 이어간 첫 순간과 감정의 흐름을 둘러보고, 마음이 닿는 러브트리를 천천히 만나보세요.</p></div>
            <div className="track01-controls">
              <label className="track01-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.currentTarget.value)} type="search" placeholder="인물, 트리 제목, 감정으로 찾아보세요" aria-label="공개 러브트리 검색" /></label>
              <div className="track01-filters" aria-label="감정 필터">{availableFilters.map((item) => <button type="button" key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
              <select value={sort} onChange={(event) => setSort(event.currentTarget.value as SortMode)} aria-label="공개 러브트리 정렬"><option value="popular">인기순</option><option value="latest">최근 공개순</option><option value="moments">순간 많은순</option></select>
            </div>

            {loading ? <div className="track01-empty">공개 러브트리를 불러오는 중입니다.</div> : error ? <div className="track01-empty" role="alert">{error}</div> : visibleTrees.length ? (
              <div className="track01-grid">{visibleTrees.map((tree, index) => {
                const sourceIndex = trees.findIndex((item) => item.id === tree.id);
                return <Track01TreeCard key={tree.id} tree={tree} selected={selectedTree?.id === tree.id} palette={paletteFor(tree, sourceIndex >= 0 ? sourceIndex : index)} onSelect={() => selectTree(tree)} />;
              })}</div>
            ) : <div className="track01-empty">찾는 마음의 트리가 아직 없어요.<br />다른 검색어나 감정을 골라보세요.</div>}
            <div className="track01-more"><button type="button" onClick={() => { setFilter("전체"); setSearch(""); }}>더 많은 공개 러브트리 보기⌄</button></div>
          </section>

          <aside className="track01-preview-wrap" ref={previewRef}>
            {selectedTree ? (
              <article className="track01-book" data-track01-preview style={{ "--track-accent": selectedPalette.accent, "--track-pale": selectedPalette.pale } as CSSProperties}>
                <div className="track01-detail"><p>❧ 이 러브트리에 담긴 마음</p><h2>{selectedTree.title}</h2><span>{selectedTree.memo || "공개된 순간들이 하나의 흐름으로 이어진 러브트리입니다."}</span></div>
                <div className="track01-collage" aria-label="선택한 러브트리 대표 순간 미리보기">
                  <span className="track01-branch" aria-hidden="true" /><i className="track01-leaf leaf-a" aria-hidden="true" /><i className="track01-leaf leaf-b" aria-hidden="true" /><i className="track01-leaf leaf-c" aria-hidden="true" />
                  <article className="track01-paper track01-note"><small>03</small><p>{thirdMoment?.memo || selectedTree.memo || "오래 남아 다시 꺼내 보는 마음"}</p></article>
                  <button type="button" className="track01-paper track01-hero-paper" onClick={() => firstMoment && router.push(`/trees/${encodeURIComponent(selectedTree.id)}?moment=${encodeURIComponent(firstMoment.id)}`)}><small>01</small><span className="track01-paper-media" style={mediaStyle(firstMoment)}><i aria-hidden="true">▶</i></span><strong>{safeMomentTitle(firstMoment, "첫 번째 공개 순간")}</strong><em aria-hidden="true">L</em></button>
                  <button type="button" className="track01-paper track01-small-paper" onClick={() => secondMoment && router.push(`/trees/${encodeURIComponent(selectedTree.id)}?moment=${encodeURIComponent(secondMoment.id)}`)}><small>02</small><span className="track01-paper-media" style={mediaStyle(secondMoment)}><i aria-hidden="true">▶</i></span><strong>{safeMomentTitle(secondMoment, "이어진 공개 순간")}</strong></button>
                  <article className="track01-paper track01-memory"><small>04</small><b>오래 남은 마음</b><p>{thirdMoment?.connectionReason || thirdMoment?.memo || "처음의 마음이 다음 순간으로 이어졌습니다."}</p></article>
                </div>
                <div className="track01-book-footer">
                  <div>대표 순간 <strong>{selectedTree.publicMoments.length}</strong>개<small>공감 {Number(selectedTree.likeCount || 0).toLocaleString()} · 조회 {Number(selectedTree.viewCount || 0).toLocaleString()}</small></div>
                  <div><p>이어진 감정</p><span>{(selectedTree.emotions.length ? selectedTree.emotions : ["기록"]).slice(0, 5).map((emotion, index) => <i key={emotion}>{index ? <b aria-hidden="true">···</b> : null}{emotion}</i>)}</span></div>
                </div>
                <button ref={openButtonRef} type="button" className="track01-open" data-track01-open onClick={openFullTree}>전체 러브트리 펼쳐보기 ✣</button>
              </article>
            ) : <div className="track01-empty">미리 볼 공개 러브트리가 없습니다.</div>}
            <div className="track01-hint"><span><strong>왼쪽 카드를 눌러</strong> 다른 트리를 미리 볼 수 있어요.</span><span>전체 트리에서는 공개 순간의 연결 이유를 확인할 수 있습니다.</span></div>
          </aside>
        </div>
      </div>

      <dialog ref={dialogRef} className="track01-dialog" data-track01-full-tree onCancel={(event) => { event.preventDefault(); closeFullTree(); }} onClose={() => setFullTreeOpen(false)}>
        {selectedTree ? (
          <section className="track01-tree-shell" style={{ "--track-accent": selectedPalette.accent, "--track-pale": selectedPalette.pale } as CSSProperties}>
            <header className="track01-toolbar">
              <div><h2>{selectedTree.title}</h2><small>공개 순간 {selectedTree.publicMoments.length}개 · 공감 {Number(selectedTree.likeCount || 0).toLocaleString()}</small></div>
              <div className="track01-zoom" aria-label="트리 확대/축소"><button type="button" onClick={() => setZoom((value) => Math.max(.65, Number((value - .1).toFixed(2))))} aria-label="축소">−</button><button type="button" onClick={() => setZoom(1)}>맞춤</button><button type="button" onClick={() => setZoom((value) => Math.min(1.25, Number((value + .1).toFixed(2))))} aria-label="확대">＋</button></div>
              <button type="button" className="track01-close" onClick={closeFullTree} aria-label="전체 러브트리 닫기">×</button>
            </header>
            <div className="track01-tree-body">
              <div className="track01-canvas-wrap"><div className="track01-canvas" style={{ transform: `scale(${zoom})` }}>
                <svg viewBox="0 0 1000 680" aria-hidden="true">{selectedTree.publicMoments.slice(0, 8).map((moment, index) => { const position = TREE_POSITIONS[index] || TREE_POSITIONS[TREE_POSITIONS.length - 1]; return <path key={moment.id} d={`M 500 340 C ${500 + (position.x - 500) * .55} 340, ${500 + (position.x - 500) * .55} ${position.y + 70}, ${position.x + 90} ${position.y + 70}`} />; })}</svg>
                <article className="track01-root"><span aria-hidden="true">♥</span><small>PUBLIC LOVE TREE</small><strong>{selectedTree.title}</strong><b>{selectedTree.publicMoments.length} moments</b></article>
                {selectedTree.publicMoments.slice(0, 8).map((moment, index) => { const position = TREE_POSITIONS[index] || TREE_POSITIONS[TREE_POSITIONS.length - 1]; return (
                  <button type="button" key={moment.id} className={`track01-moment-node${selectedMoment?.id === moment.id ? " is-selected" : ""}`} style={{ left: `${position.x / 10}%`, top: `${position.y / 6.8}%` }} data-track01-moment-node onClick={() => setSelectedMomentIndex(index)} aria-pressed={selectedMoment?.id === moment.id}>
                    <span style={mediaStyle(moment)}><i>{String(index + 1).padStart(2, "0")}</i></span><strong>{moment.title || `공개 순간 ${index + 1}`}</strong><small>{sourceTypeLabel(moment.sourceType)}</small>
                  </button>
                ); })}
              </div></div>
              <aside className="track01-panel">
                <p>SELECTED MOMENT</p><h3>{selectedMoment?.title || "공개 순간"}</h3><small>{selectedMoment ? `${selectedMomentIndex + 1}번째 순간 · ${sourceTypeLabel(selectedMoment.sourceType)}` : ""}</small>
                <div><strong>이 순간에 남긴 마음</strong><p>{selectedMoment?.memo || "기록된 메모가 없습니다."}</p></div>
                <div><strong>이어진 이유</strong><p>{selectedMoment?.connectionReason || (selectedMomentIndex === 0 ? "이 러브트리의 첫 공개 순간입니다." : "저장된 연결 이유가 없습니다.")}</p></div>
                <div><strong>감정 태그</strong><p>{selectedMoment?.emotionTags?.join(" · ") || "기록"}</p></div>
                {selectedMoment ? <Link href={`/trees/${encodeURIComponent(selectedTree.id)}?moment=${encodeURIComponent(selectedMoment.id)}`}>canonical Moment 상세 열기 →</Link> : null}
              </aside>
            </div>
          </section>
        ) : null}
      </dialog>
    </main>
  );
}
