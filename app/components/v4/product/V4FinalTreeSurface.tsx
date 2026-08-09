"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useTreeMoments } from "@/lib/use-tree-moments";
import {
  formatTreeDate,
  isSafeExternalUrl,
  resolveMemoryThumbnail,
  type MemoryRecord,
  type TreeRecord,
} from "@/lib/tree-types";
import { TreeViewShell } from "@/app/components/TreeViewShell";

export type FinalSurfaceMode = "overview" | "story" | "graph" | "replay" | "studio";

const GRAPH_MODES = ["Graph", "Constellation", "Topology", "Atlas", "Observatory", "Lore"] as const;
type GraphMode = (typeof GRAPH_MODES)[number];

const RECIPES = [
  { id: "spark", title: "First Spark", camera: "Slow push", duration: 4.2, note: "첫 순간을 오래 바라보는 짧은 도입" },
  { id: "rewatch", title: "The Rewatch", camera: "Orbit", duration: 5.8, note: "다시 찾은 순간을 중심으로 주변 기억을 연결" },
  { id: "connection", title: "Follow Connection", camera: "Follow", duration: 6.4, note: "부모-자식 관계를 따라 다음 장면으로 이동" },
  { id: "season", title: "Season Overview", camera: "Pull back", duration: 7.0, note: "여러 순간을 한 장면 안에서 조망" },
] as const;

function memoryTitle(memory: MemoryRecord, index = 0) {
  return memory.title?.trim() || memory.memo?.trim() || `순간 ${index + 1}`;
}

function dateValue(memory: MemoryRecord) {
  return memory.timestamp || memory.createdAt || null;
}

function emotionCounts(memories: MemoryRecord[]) {
  const counts = new Map<string, number>();
  for (const memory of memories) {
    for (const tag of memory.emotionTags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function SurfaceState({ text }: { text: string }) {
  return <div className="v4-final-state" aria-live="polite">{text}</div>;
}

function OverviewSurface({ tree, moments }: { tree: TreeRecord; moments: MemoryRecord[] }) {
  const [question, setQuestion] = useState(0);
  const first = moments[0] ?? null;
  const last = moments.at(-1) ?? null;
  const emotions = emotionCounts(moments);
  const mediaCount = moments.filter((memory) => Boolean(memory.sourceUrl)).length;
  const connectedCount = moments.filter((memory) => Boolean(memory.parentId)).length;
  const recent = [...moments].slice(-4).reverse();
  const pulse = moments.length ? Math.round(Math.min(99, 55 + mediaCount * 4 + connectedCount * 3 + emotions.length * 2)) : 0;
  const questions = [
    {
      title: "지금 내 마음은 어디쯤 와 있을까요?",
      copy: `${moments.length}개의 순간이 쌓였고 ${connectedCount}개의 공개·소유자 허용 관계가 이어져 있어요.`,
      theme: "green",
    },
    {
      title: "처음과 지금 사이, 무엇이 달라졌나요?",
      copy: first && last ? `${formatTreeDate(dateValue(first))}의 첫 기록에서 ${formatTreeDate(dateValue(last))}의 최근 기록까지 이어졌어요.` : "두 번째 순간부터 변화의 흐름을 읽을 수 있어요.",
      theme: "blue",
    },
    {
      title: "다음에는 어떤 마음이 이어질까요?",
      copy: emotions.length ? `가장 자주 남은 감정은 ‘${emotions[0][0]}’이에요. 다음 순간은 기존 감정과 다른 결을 남겨도 좋아요.` : "감정 태그가 쌓이면 반복되는 마음의 결을 보여 드려요.",
      theme: "sunset",
    },
    {
      title: "지금 이 나무에 무엇을 해볼까요?",
      copy: mediaCount < moments.length ? "출처가 없는 순간에 영상·노래·책 링크를 덧붙여 기억의 맥락을 선명하게 만들어 보세요." : "최근 순간 하나를 다시 열어 연결 이유를 확인해 보세요.",
      theme: "pink",
    },
  ];

  return (
    <section className="v4-overview" aria-labelledby="v4-overview-title">
      <div className="v4-overview-intro">
        <div><small>WHOLE PICTURE · REAL TREE DATA</small><h1 id="v4-overview-title">좋아한 마음을<br />한눈에.</h1></div>
        <p>{tree.title}<br />지속 저장된 Tree와 Moment에서만 요약합니다.</p>
      </div>
      <div className="v4-overview-workspace">
        <div className="v4-overview-questions">
          {questions.map((item, index) => (
            <button className={`v4-overview-question${question === index ? " is-active" : ""}`} type="button" key={item.title} onClick={() => setQuestion(index)}>
              <span>{item.title}</span><i>{question === index ? "×" : "+"}</i>
              {question === index ? <p>{item.copy}</p> : null}
            </button>
          ))}
        </div>
        <div className={`v4-overview-visual theme-${questions[question].theme}`}>
          <div className="v4-overview-card">
            <div className="v4-overview-cardtop"><span>LOVETREE PULSE</span><small>{formatTreeDate(tree.updatedAt || tree.createdAt)}</small></div>
            {question === 0 ? <>
              <p className="v4-overview-label">현재 기록 밀도</p><div className="v4-overview-score"><b>{pulse}</b><span>/ 100<br />presentation metric</span></div>
              <div className="v4-overview-bar"><i style={{ width: `${pulse}%` }} /></div>
              <dl className="v4-overview-stats"><div><dt>Moments</dt><dd>{moments.length}</dd></div><div><dt>Connections</dt><dd>{connectedCount}</dd></div><div><dt>Media</dt><dd>{mediaCount}</dd></div></dl>
            </> : null}
            {question === 1 ? <><h2>최근에 달라진 장면</h2><div className="v4-overview-moments">{recent.map((memory, index) => <article key={memory.id}><span className="v4-overview-thumb" style={resolveMemoryThumbnail(memory) ? { backgroundImage: `url(${resolveMemoryThumbnail(memory)})` } : undefined} /><div><strong>{memoryTitle(memory, index)}</strong><small>{formatTreeDate(dateValue(memory))}</small></div></article>)}</div></> : null}
            {question === 2 ? <><h2>마음의 결</h2><div className="v4-overview-emotions">{(emotions.length ? emotions : [["아직 태그 없음", 0] as [string, number]]).slice(0, 5).map(([tag, count]) => <div key={tag}><span>{tag}</span><i><b style={{ width: `${moments.length ? Math.max(8, count / moments.length * 100) : 8}%` }} /></i><em>{count}</em></div>)}</div></> : null}
            {question === 3 ? <><h2>다음 행동</h2><div className="v4-overview-actions"><article><b>01</b><span>최근 순간 다시 보기</span></article><article><b>02</b><span>끊긴 순간 연결하기</span></article><article><b>03</b><span>새 감정 태그 남기기</span></article></div></> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function PublicStorySurface({ tree }: { tree: TreeRecord }) {
  const [moments, setMoments] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      if (tree.visibility !== "public") {
        if (active) { setError("공개 Tree만 Public Story로 재생할 수 있어요."); setLoading(false); }
        return;
      }
      try {
        const response = await apiFetch(`/api/community/memories?treeId=${encodeURIComponent(tree.id)}&limit=200`);
        const data = await response.json().catch(() => []);
        if (!response.ok) throw new Error("공개 순간을 불러오지 못했어요.");
        if (active) setMoments(Array.isArray(data) ? data : []);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Public Story를 열 수 없어요.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [tree.id, tree.visibility]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "ArrowRight") setChapter((value) => Math.min(Math.max(0, moments.length - 1), value + 1));
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") setChapter((value) => Math.max(0, value - 1));
      if (event.key === "Home") setChapter(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moments.length]);

  if (loading) return <SurfaceState text="공개 스토리를 준비하고 있어요…" />;
  if (error) return <SurfaceState text={error} />;
  if (!moments.length) return <SurfaceState text="공개된 순간이 아직 없어요." />;
  const active = moments[chapter];
  const image = resolveMemoryThumbnail(active);

  return (
    <section className="v4-story" aria-label="Public Story">
      <aside className="v4-story-rail"><small>PUBLIC STORY</small>{moments.map((memory, index) => <button type="button" key={memory.id} className={chapter === index ? "is-active" : ""} onClick={() => setChapter(index)}><i />{String(index + 1).padStart(2, "0")}</button>)}</aside>
      <div className="v4-story-stage">
        <div className="v4-story-heart" aria-hidden="true"><i /><i /><i /></div>
        <article className="v4-story-copy">
          <small>CHAPTER {String(chapter + 1).padStart(2, "0")} · {formatTreeDate(dateValue(active))}</small>
          <h1>{chapter === 0 ? tree.title : memoryTitle(active, chapter)}</h1>
          <p>{active.memo || "한 순간이 다음 순간의 가지가 되었습니다."}</p>
          <div className="v4-story-tags">{(active.emotionTags || []).map((tag) => <span key={tag}>#{tag}</span>)}</div>
          {isSafeExternalUrl(active.sourceUrl) ? <a href={active.sourceUrl} target="_blank" rel="noreferrer noopener">이 순간 열기 ↗</a> : null}
        </article>
        <div className="v4-story-media" style={image ? { backgroundImage: `linear-gradient(180deg,rgba(19,12,8,.05),rgba(19,12,8,.45)),url(${image})` } : undefined}>
          <span>{chapter + 1} / {moments.length}</span>
        </div>
        <svg className="v4-story-branch" viewBox="0 0 800 300" aria-hidden="true"><path d="M30 260 C180 236 212 154 336 147 C485 138 527 52 768 35" />{moments.slice(0, 8).map((_, index) => <circle key={index} cx={80 + index * 90} cy={230 - index * 24} r={chapter === index ? 10 : 5} />)}</svg>
      </div>
    </section>
  );
}

interface GraphNode {
  id: string;
  parentId: string | null;
  x: number;
  y: number;
  memory: MemoryRecord;
}

function GraphSurface({ moments }: { moments: MemoryRecord[] }) {
  const [mode, setMode] = useState<GraphMode>("Graph");
  const [zoom, setZoom] = useState(.86);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<string | null>(moments[0]?.id ?? null);
  const [emotion, setEmotion] = useState("전체");
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);
  const emotions = useMemo(() => ["전체", ...new Set(moments.flatMap((memory) => memory.emotionTags || []))], [moments]);
  const visible = useMemo(() => emotion === "전체" ? moments : moments.filter((memory) => (memory.emotionTags || []).includes(emotion)), [emotion, moments]);
  const nodes = useMemo<GraphNode[]>(() => {
    const radius = Math.max(210, Math.min(460, 180 + visible.length * 7));
    return visible.map((memory, index) => {
      const angle = (index / Math.max(1, visible.length)) * Math.PI * 2 - Math.PI / 2;
      const layer = mode === "Topology" ? 1 + (memory.emotionTags?.length || 0) * .12 : mode === "Constellation" ? .75 + (index % 4) * .12 : 1;
      const x = mode === "Graph" ? 120 + (index % 5) * 215 : 650 + Math.cos(angle) * radius * layer;
      const y = mode === "Graph" ? 120 + Math.floor(index / 5) * 205 : 430 + Math.sin(angle) * radius * .66 * layer;
      return { id: memory.id, parentId: memory.parentId || null, x, y, memory };
    });
  }, [mode, visible]);
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const chosen = moments.find((memory) => memory.id === selected) ?? null;
  const paths = nodes.flatMap((node) => {
    if (!node.parentId) return [];
    const parent = byId.get(node.parentId);
    return parent ? [`M ${parent.x + 78} ${parent.y + 46} C ${parent.x + 150} ${parent.y + 46}, ${node.x - 70} ${node.y + 46}, ${node.x} ${node.y + 46}`] : [];
  });
  function down(event: ReactPointerEvent<HTMLDivElement>) { if ((event.target as HTMLElement).closest("button,article,a")) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }; }
  function move(event: ReactPointerEvent<HTMLDivElement>) { if (!drag.current || drag.current.id !== event.pointerId) return; setOffset({ x: drag.current.ox + event.clientX - drag.current.x, y: drag.current.oy + event.clientY - drag.current.y }); }
  function up(event: ReactPointerEvent<HTMLDivElement>) { if (drag.current?.id === event.pointerId) drag.current = null; }

  return (
    <section className={`v4-graph v4-graph-${mode.toLowerCase()}`}>
      <header className="v4-graph-head"><div><small>ONE TREE GRAPH · REAL MOMENTS</small><h1>Memory topology</h1></div><div className="v4-graph-modes">{GRAPH_MODES.map((item) => <button type="button" className={mode === item ? "is-active" : ""} key={item} onClick={() => setMode(item)}>{item}</button>)}</div></header>
      <div className="v4-graph-toolbar"><div>{emotions.slice(0, 8).map((tag) => <button type="button" className={emotion === tag ? "is-active" : ""} key={tag} onClick={() => setEmotion(tag)}>{tag}</button>)}</div><div><button type="button" onClick={() => setZoom((value) => Math.max(.45, value - .1))}>−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.5, value + .1))}>＋</button><button type="button" onClick={() => { setZoom(.86); setOffset({ x: 0, y: 0 }); }}>FIT</button></div></div>
      <div className="v4-graph-layout">
        <div className="v4-graph-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={(event) => { event.preventDefault(); setZoom((value) => Math.max(.45, Math.min(1.5, value + (event.deltaY < 0 ? .06 : -.06)))); }}>
          <div className="v4-graph-world" style={{ transform: `translate(${offset.x}px,${offset.y}px) scale(${zoom})` }}>
            <svg viewBox="0 0 1320 860" aria-hidden="true">{paths.map((path, index) => <path key={`${path}-${index}`} d={path} />)}</svg>
            {nodes.map((node, index) => <article key={node.id} className={`v4-graph-node${selected === node.id ? " is-active" : ""}`} style={{ left: node.x, top: node.y }} onClick={() => setSelected(node.id)}><span className="v4-graph-node-media" style={resolveMemoryThumbnail(node.memory) ? { backgroundImage: `url(${resolveMemoryThumbnail(node.memory)})` } : undefined} /><small>{String(index + 1).padStart(2, "0")} · {(node.memory.emotionTags || ["moment"])[0]}</small><strong>{memoryTitle(node.memory, index)}</strong></article>)}
          </div>
        </div>
        <aside className="v4-graph-inspector"><small>{mode.toUpperCase()} INSPECTOR</small>{chosen ? <><h2>{memoryTitle(chosen)}</h2><p>{chosen.memo || "이 순간에 남긴 마음"}</p><dl><div><dt>Date</dt><dd>{formatTreeDate(dateValue(chosen))}</dd></div><div><dt>Parent</dt><dd>{chosen.parentId ? "connected" : "root"}</dd></div><div><dt>Tags</dt><dd>{(chosen.emotionTags || []).join(" · ") || "—"}</dd></div></dl>{isSafeExternalUrl(chosen.sourceUrl) ? <a href={chosen.sourceUrl} target="_blank" rel="noreferrer noopener">Source ↗</a> : null}</> : <p>노드를 선택해 주세요.</p>}<div className="v4-graph-telemetry"><span>VISIBLE {nodes.length}</span><span>EDGES {paths.length}</span><span>MODE {mode}</span></div></aside>
      </div>
    </section>
  );
}

function ReplaySurface({ tree, moments }: { tree: TreeRecord; moments: MemoryRecord[] }) {
  const media = useMemo(() => moments.filter((memory) => isSafeExternalUrl(memory.sourceUrl) || resolveMemoryThumbnail(memory)), [moments]);
  const [index, setIndex] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [tear, setTear] = useState(0);
  const gesture = useRef<{ id: number; x: number } | null>(null);
  const current = media[index] ?? null;
  const next = () => { setIndex((value) => media.length ? (value + 1) % media.length : 0); setTear(0); };
  const previous = () => { setIndex((value) => media.length ? (value - 1 + media.length) % media.length : 0); setTear(0); };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "Escape") setMinimized(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!current) return <SurfaceState text="리플레이할 미디어 순간이 아직 없어요." />;
  const thumb = resolveMemoryThumbnail(current);

  return (
    <section className="v4-replay">
      <header className="v4-replay-head"><div><small>VINYL REPLAY · MOMENT REVISIT</small><h1>{tree.title}</h1></div><span>{index + 1} / {media.length}</span></header>
      <div className="v4-replay-layout">
        <aside className="v4-replay-queue">{media.map((memory, itemIndex) => <button type="button" key={memory.id} className={itemIndex === index ? "is-active" : ""} onClick={() => { setIndex(itemIndex); setTear(0); }}><i style={resolveMemoryThumbnail(memory) ? { backgroundImage: `url(${resolveMemoryThumbnail(memory)})` } : undefined} /><span><strong>{memoryTitle(memory, itemIndex)}</strong><small>{formatTreeDate(dateValue(memory))}</small></span></button>)}</aside>
        <div className={`v4-replay-player${minimized ? " is-minimized" : ""}`}>
          <div className="v4-vinyl"><div className="v4-vinyl-disc" style={thumb ? { backgroundImage: `radial-gradient(circle at center,#111 0 6%,transparent 6% 14%,rgba(0,0,0,.72) 14% 100%),url(${thumb})` } : undefined}><i /></div><div className="v4-vinyl-arm" /></div>
          <article className="v4-replay-window" onPointerDown={(event) => { gesture.current = { id: event.pointerId, x: event.clientX }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (gesture.current?.id === event.pointerId) setTear(Math.max(-130, Math.min(130, event.clientX - gesture.current.x))); }} onPointerUp={(event) => { if (gesture.current?.id !== event.pointerId) return; if (tear > 90) previous(); else if (tear < -90) next(); else setTear(0); gesture.current = null; }} style={{ transform: `translateX(${tear}px) rotate(${tear / 35}deg)` }}>
            <div className="v4-replay-image" style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}><span>DRAG / TEAR TO REVISIT</span></div>
            <small>{formatTreeDate(dateValue(current))}</small><h2>{memoryTitle(current, index)}</h2><p>{current.memo || "다시 꺼내 본 순간"}</p>
            <div className="v4-replay-actions"><button type="button" onClick={previous}>←</button>{isSafeExternalUrl(current.sourceUrl) ? <a href={current.sourceUrl} target="_blank" rel="noreferrer noopener">PLAY SOURCE ↗</a> : <span>NO SOURCE</span>}<button type="button" onClick={next}>→</button></div>
          </article>
          <button className="v4-replay-minimize" type="button" onClick={() => setMinimized((value) => !value)}>{minimized ? "RESTORE PLAYER" : "MINIMIZE"}</button>
        </div>
      </div>
    </section>
  );
}

interface StudioScene {
  id: string;
  momentId: string | null;
  title: string;
  description: string;
  duration: number;
  camera: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function drawStudioFrame(canvas: HTMLCanvasElement, tree: TreeRecord, scene: StudioScene, progress = 0) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#10130f"); gradient.addColorStop(.5, "#283629"); gradient.addColorStop(1, "#bb812d");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(w * .08, h * .12, w * .84, h * .76);
  ctx.fillStyle = "#d9aa55"; ctx.font = `${Math.round(w * .018)}px sans-serif`; ctx.fillText("LOVETREE MEMORY FILM", w * .1, h * .18);
  ctx.fillStyle = "#f7f3e8"; ctx.font = `${Math.round(w * .052)}px serif`; ctx.fillText(scene.title.slice(0, 34), w * .1, h * .48);
  ctx.fillStyle = "rgba(247,243,232,.72)"; ctx.font = `${Math.round(w * .022)}px sans-serif`; ctx.fillText((scene.description || tree.title).slice(0, 64), w * .1, h * .56);
  ctx.fillStyle = "#d9aa55"; ctx.fillRect(w * .1, h * .76, w * .8 * progress, Math.max(3, h * .008));
}

function StudioSurface({ tree, moments, isOwner }: { tree: TreeRecord; moments: MemoryRecord[]; isOwner: boolean }) {
  const [tab, setTab] = useState<"storyboard" | "recipes" | "composition" | "export">("storyboard");
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState("READY");
  const [ratio, setRatio] = useState("16:9");
  const [corners, setCorners] = useState([{ x: 8, y: 10 }, { x: 92, y: 8 }, { x: 88, y: 92 }, { x: 11, y: 88 }]);
  const drag = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scenes, setScenes] = useState<StudioScene[]>(() => {
    const base = moments.slice(0, 8).map((memory, index) => ({ id: `scene-${memory.id}`, momentId: memory.id, title: memoryTitle(memory, index), description: memory.memo || tree.title, duration: 4.5 + (index % 3), camera: ["STATIC FRAME", "SLOW PUSH", "ORBIT", "FOLLOW CONNECTION"][index % 4] }));
    return base.length ? base : [{ id: "scene-empty", momentId: null, title: tree.title, description: "첫 순간을 추가하면 장면이 만들어집니다.", duration: 4.2, camera: "STATIC FRAME" }];
  });
  const scene = scenes[Math.min(active, scenes.length - 1)];

  useEffect(() => {
    if (canvasRef.current && scene) drawStudioFrame(canvasRef.current, tree, scene, .35);
  }, [scene, tree]);

  if (!isOwner) return <SurfaceState text="스튜디오는 이 러브트리의 소유자만 사용할 수 있어요." />;

  const exportJson = (kind: "storyboard" | "config") => {
    const payload = kind === "storyboard" ? scenes : { treeId: tree.id, title: tree.title, ratio, scenes, updatedAt: new Date().toISOString() };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), kind === "storyboard" ? "lovetree-storyboard.json" : "lovetree-film-config.json");
    setStatus(`${kind.toUpperCase()} EXPORTED`);
  };
  const exportPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawStudioFrame(canvas, tree, scene, 1);
    canvas.toBlob((blob) => { if (blob) { downloadBlob(blob, "lovetree-poster.png"); setStatus("POSTER PNG EXPORTED"); } }, "image/png");
  };
  const exportWebM = async () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === "undefined" || typeof canvas.captureStream !== "function") { setStatus("WEBM UNSUPPORTED IN THIS BROWSER"); return; }
    try {
      setStatus("RECORDING WEBM…");
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? { mimeType: "video/webm;codecs=vp9" } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const completed = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
      recorder.start();
      for (const item of scenes) {
        const frames = 24;
        for (let frame = 0; frame <= frames; frame += 1) {
          drawStudioFrame(canvas, tree, item, frame / frames);
          await new Promise((resolve) => window.setTimeout(resolve, 1000 / 30));
        }
      }
      recorder.stop();
      await completed;
      downloadBlob(new Blob(chunks, { type: recorder.mimeType || "video/webm" }), "lovetree-memory-film.webm");
      setStatus("WEBM EXPORTED");
    } catch {
      setStatus("WEBM EXPORT FAILED");
    }
  };
  const applyRecipe = (recipe: (typeof RECIPES)[number]) => {
    setScenes((current) => current.map((item, index) => index === active ? { ...item, camera: recipe.camera.toUpperCase(), duration: recipe.duration, description: recipe.note } : item));
    setTab("storyboard");
    setStatus(`${recipe.title.toUpperCase()} APPLIED`);
  };

  return (
    <section className="v4-studio">
      <header className="v4-studio-head"><div><small>OWNER ONLY · REAL MOMENTS</small><h1>Memory Film Studio</h1></div><div><span>{status}</span><button type="button" onClick={() => setTab("export")}>EXPORT</button></div></header>
      <nav className="v4-studio-tabs">{(["storyboard", "recipes", "composition", "export"] as const).map((item) => <button type="button" key={item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item.toUpperCase()}</button>)}</nav>
      <div className="v4-studio-body">
        <aside className="v4-studio-scenes">{scenes.map((item, index) => <button type="button" className={active === index ? "is-active" : ""} key={item.id} onClick={() => setActive(index)}><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{item.title}</strong><small>{item.camera} · {item.duration.toFixed(1)}s</small></span></button>)}</aside>
        <div className="v4-studio-main">
          {tab === "storyboard" ? <><div className="v4-studio-stage"><canvas ref={canvasRef} width={1280} height={720} /><div className="v4-studio-stagecopy"><small>SCENE {String(active + 1).padStart(2, "0")}</small><h2>{scene.title}</h2><p>{scene.description}</p></div></div><div className="v4-studio-editor"><label>Headline<input value={scene.title} onChange={(event) => setScenes((current) => current.map((item, index) => index === active ? { ...item, title: event.target.value } : item))} /></label><label>Duration<input type="number" min="1" max="30" step=".1" value={scene.duration} onChange={(event) => setScenes((current) => current.map((item, index) => index === active ? { ...item, duration: Number(event.target.value) || 1 } : item))} /></label><label>Camera<select value={scene.camera} onChange={(event) => setScenes((current) => current.map((item, index) => index === active ? { ...item, camera: event.target.value } : item))}><option>STATIC FRAME</option><option>SLOW PUSH</option><option>ORBIT</option><option>FOLLOW CONNECTION</option><option>PULL BACK</option></select></label></div></> : null}
          {tab === "recipes" ? <div className="v4-studio-recipes">{RECIPES.map((recipe) => <article key={recipe.id}><small>{recipe.camera} · {recipe.duration}s</small><h2>{recipe.title}</h2><p>{recipe.note}</p><button type="button" onClick={() => applyRecipe(recipe)}>현재 장면에 적용</button></article>)}</div> : null}
          {tab === "composition" ? <div className="v4-studio-compose"><div className="v4-studio-ratios">{["16:9", "9:16", "1:1", "4:5"].map((item) => <button type="button" className={ratio === item ? "is-active" : ""} key={item} onClick={() => setRatio(item)}>{item}</button>)}</div><div className={`v4-composition-frame ratio-${ratio.replace(":", "-")}`}><div className="v4-composition-window" style={{ clipPath: `polygon(${corners.map((point) => `${point.x}% ${point.y}%`).join(",")})`, backgroundImage: resolveMemoryThumbnail(moments[active] || moments[0]) ? `url(${resolveMemoryThumbnail(moments[active] || moments[0])})` : undefined }} />{corners.map((point, index) => <button type="button" aria-label={`corner ${index + 1}`} key={index} className="v4-composition-handle" style={{ left: `${point.x}%`, top: `${point.y}%` }} onPointerDown={(event) => { drag.current = index; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (drag.current !== index) return; const rect = event.currentTarget.parentElement?.getBoundingClientRect(); if (!rect) return; const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)); const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)); setCorners((current) => current.map((item, itemIndex) => itemIndex === index ? { x, y } : item)); }} onPointerUp={() => { drag.current = null; }} />)}</div><p>네 모서리를 직접 끌어 기억 창의 원근과 프레이밍을 조절합니다.</p></div> : null}
          {tab === "export" ? <div className="v4-studio-export"><h2>View · Inspect · Export</h2><p>원본 Film Studio의 실제 산출물을 복원했습니다. JSON뿐 아니라 Poster PNG와 Canvas MediaRecorder WebM을 실제 파일로 생성합니다.</p><div><button type="button" onClick={() => exportJson("storyboard")}>Storyboard JSON</button><button type="button" onClick={() => exportJson("config")}>Film Config JSON</button><button type="button" onClick={exportPoster}>Poster PNG</button><button type="button" onClick={() => void exportWebM()}>WebM Film</button></div></div> : null}
        </div>
      </div>
    </section>
  );
}

export default function V4FinalTreeSurface({ treeId, mode }: { treeId: string; mode: FinalSurfaceMode }) {
  const { user } = useAuth();
  const { tree, moments, loading, error, isOwner } = useTreeMoments(treeId);
  if (loading) return <TreeViewShell treeId={treeId} activeView={mode} isOwner={false}><SurfaceState text="러브트리 데이터를 불러오고 있어요…" /></TreeViewShell>;
  if (error || !tree) return <TreeViewShell treeId={treeId} activeView={mode} isOwner={false}><SurfaceState text={error || "러브트리를 찾을 수 없어요."} /></TreeViewShell>;
  return (
    <TreeViewShell treeId={treeId} activeView={mode} userLabel={user?.displayName || user?.email || undefined} isOwner={isOwner}>
      <div className="v4-final-surface-shell">
        {mode === "overview" ? <OverviewSurface tree={tree} moments={moments} /> : null}
        {mode === "story" ? <PublicStorySurface tree={tree} /> : null}
        {mode === "graph" ? <GraphSurface moments={moments} /> : null}
        {mode === "replay" ? <ReplaySurface tree={tree} moments={moments} /> : null}
        {mode === "studio" ? <StudioSurface tree={tree} moments={moments} isOwner={isOwner} /> : null}
      </div>
    </TreeViewShell>
  );
}
