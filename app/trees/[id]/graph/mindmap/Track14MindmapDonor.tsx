"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import type { TreeMomentView } from "@/lib/moment-model";
import { useTreeMoments } from "@/lib/use-tree-moments";
import {
  track14BuildProjection,
  track14Descendants,
  track14Phase,
  track14RevealValue,
  type Track14LayoutMode,
  type Track14ProjectedNode,
} from "@/lib/source-track-14/mindmap";
import styles from "./track14-mindmap.module.css";

const LAYOUTS: Array<{ id: Track14LayoutMode; label: string; title: string; copy: string }> = [
  { id: "branch", label: "Branch", title: "A tree of moments", copy: "저장된 parentId 관계를 가지 구조로 펼칩니다." },
  { id: "orbit", label: "Orbit", title: "Orbit Path", copy: "같은 Connection을 원형 공간 배치로만 바꿉니다." },
  { id: "journey", label: "Journey", title: "Journey Path", copy: "같은 Connection을 흐르는 경로처럼 배치합니다." },
  { id: "timeline", label: "Timeline", title: "Timeline Path", copy: "같은 Connection을 세로 흐름으로 배치합니다." },
];

const PETALS = [
  [-520, -300, 8, 14, -18], [530, -260, 7, 13, 24], [-560, 270, 6, 12, 14],
  [510, 300, 8, 14, -25], [-70, -320, 5, 10, 12], [85, 315, 5, 11, -10],
] as const;

function clip(value: string, max: number) {
  const normalized = value.trim();
  if (!normalized) return "제목 없는 Moment";
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function toneFor(moment: TreeMomentView): "neutral" | "rose" | "lavender" {
  const source = moment.sourceType.toLowerCase();
  if (source === "book" || source === "song" || source === "audio") return "lavender";
  if (moment.emotionTags.length > 0 || moment.title.includes("감정")) return "rose";
  return "neutral";
}

function nodeSize(node: Track14ProjectedNode<TreeMomentView>) {
  return node.depth === 0 ? { width: 214, height: 104 } : { width: 190, height: 82 };
}

function edgePath(from: Track14ProjectedNode<TreeMomentView>, to: Track14ProjectedNode<TreeMomentView>, index: number) {
  const fromSize = nodeSize(from);
  const toSize = nodeSize(to);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const ux = dx / distance;
  const uy = dy / distance;
  const fromRadius = Math.min(Math.abs(ux) > Math.abs(uy) ? fromSize.width * 0.46 : fromSize.height * 0.46, 92);
  const toRadius = Math.min(Math.abs(ux) > Math.abs(uy) ? toSize.width * 0.46 : toSize.height * 0.46, 92);
  const sx = from.x + ux * fromRadius;
  const sy = from.y + uy * fromRadius;
  const tx = to.x - ux * toRadius;
  const ty = to.y - uy * toRadius;
  const nx = -uy;
  const ny = ux;
  const curve = (index % 2 ? 1 : -1) * Math.min(38, distance * 0.09);
  const c1x = sx + (tx - sx) * 0.34 + nx * curve;
  const c1y = sy + (ty - sy) * 0.34 + ny * curve;
  const c2x = sx + (tx - sx) * 0.68 + nx * curve;
  const c2y = sy + (ty - sy) * 0.68 + ny * curve;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${tx.toFixed(2)} ${ty.toFixed(2)}`;
}

export default function Track14MindmapDonor({ treeId }: { treeId: string }) {
  const { tree, treeMoments, loading, error, selectedMomentId, selectMoment } = useTreeMoments(treeId);
  const [layout, setLayout] = useState<Track14LayoutMode>("branch");
  const [progress, setProgress] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const animationRef = useRef<number | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; cameraX: number; cameraY: number } | null>(null);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 700px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setMobile(mobileQuery.matches);
      setReducedMotion(motionQuery.matches);
    };
    sync();
    mobileQuery.addEventListener("change", sync);
    motionQuery.addEventListener("change", sync);
    return () => {
      mobileQuery.removeEventListener("change", sync);
      motionQuery.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => () => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
  }, []);

  const projection = useMemo(() => track14BuildProjection(treeMoments, layout, mobile), [treeMoments, layout, mobile]);
  const nodeById = useMemo(() => new Map(projection.nodes.map((node) => [node.id, node])), [projection.nodes]);
  const branchIds = useMemo(() => track14Descendants(projection.edges, selectedMomentId), [projection.edges, selectedMomentId]);

  const playUnfold = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    selectMoment(null);
    setProgress(0);
    if (reducedMotion) {
      setProgress(1);
      return;
    }
    const duration = 1420;
    let startedAt: number | null = null;
    const tick = (now: number) => {
      if (startedAt === null) startedAt = now;
      const next = Math.min(1, (now - startedAt) / duration);
      setProgress(next);
      if (next < 1) animationRef.current = requestAnimationFrame(tick);
      else animationRef.current = null;
    };
    animationRef.current = requestAnimationFrame(tick);
  }, [reducedMotion, selectMoment]);

  const fit = useCallback(() => setCamera({ x: 0, y: 0, scale: 1 }), []);
  const zoomBy = useCallback((factor: number) => {
    setCamera((current) => ({ ...current, scale: Math.max(0.66, Math.min(1.75, current.scale * factor)) }));
  }, []);

  const selectLayout = useCallback((next: Track14LayoutMode) => {
    setLayout(next);
    setCamera({ x: 0, y: 0, scale: 1 });
    selectMoment(null);
    setDrawerOpen(false);
    setProgress((current) => current > 0.98 ? 1 : current);
  }, [selectMoment]);

  const onStagePointerDown = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest("[data-track14-node]")) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, cameraX: camera.x, cameraY: camera.y };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* best effort */ }
    selectMoment(null);
  }, [camera.x, camera.y, selectMoment]);

  const onStagePointerMove = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setCamera((current) => ({
      ...current,
      x: drag.cameraX + (event.clientX - drag.x) / current.scale,
      y: drag.cameraY + (event.clientY - drag.y) / current.scale,
    }));
  }, []);

  const onStagePointerEnd = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }, []);

  const onWheel = useCallback((event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.08 : 0.92);
  }, [zoomBy]);

  const onStageKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (!treeMoments.length) return;
    event.preventDefault();
    const currentIndex = selectedMomentId ? treeMoments.findIndex((moment) => moment.id === selectedMomentId) : -1;
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const fallback = direction > 0 ? 0 : treeMoments.length - 1;
    const nextIndex = currentIndex < 0 ? fallback : Math.max(0, Math.min(treeMoments.length - 1, currentIndex + direction));
    selectMoment(treeMoments[nextIndex]?.id ?? null);
  }, [treeMoments, selectedMomentId, selectMoment]);

  if (loading) return <main className={styles.state}>PATH mindmap을 불러오는 중입니다.</main>;
  if (error) return <main className={styles.state}><h1>PATH Mindmap</h1><p role="alert">{error}</p><Link href={`/trees/${encodeURIComponent(treeId)}/graph`}>Graph로 돌아가기</Link></main>;
  if (!treeMoments.length) return <main className={styles.state}><h1>{tree?.title || "PATH Mindmap"}</h1><p>펼칠 Moment가 아직 없습니다.</p><Link href={`/trees/${encodeURIComponent(treeId)}`}>Tree로 돌아가기</Link></main>;

  const layoutMeta = LAYOUTS.find((item) => item.id === layout) ?? LAYOUTS[0];
  const phase = track14Phase(progress);
  const viewBox = mobile ? "-360 -520 720 1050" : "-600 -370 1200 740";

  return (
    <main
      className={styles.app}
      data-track14-mindmap="canonical-path-donor"
      data-track14-progress={progress >= 0.999 ? "1" : progress.toFixed(3)}
      data-track14-phase={phase}
      data-track14-layout={layout}
      onKeyDown={onStageKeyDown}
    >
      <header className={styles.topbar}>
        <Link className={styles.brand} href={`/trees/${encodeURIComponent(treeId)}/graph`} aria-label="canonical Graph로 돌아가기">
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandCopy}><strong>LoveTree Template Composer</strong><small>DRAG · UNFOLD · FILL YOUR MOMENTS</small></span>
        </Link>
        <nav className={styles.tabs} aria-label="PATH 시각 배치">
          {LAYOUTS.map((item) => (
            <button type="button" key={item.id} className={layout === item.id ? styles.tabActive : undefined} onClick={() => selectLayout(item.id)} aria-pressed={layout === item.id}>{item.label}</button>
          ))}
        </nav>
        <div className={styles.toolbar} aria-label="마인드맵 조작">
          <button type="button" onClick={() => setDrawerOpen(true)} className={styles.toolButton}>템플릿</button>
          <button type="button" onClick={playUnfold} className={`${styles.toolButton} ${styles.primary}`}>다시 펼치기</button>
          <button type="button" onClick={() => zoomBy(0.89)} className={styles.iconButton} aria-label="축소">−</button>
          <button type="button" onClick={() => zoomBy(1.12)} className={styles.iconButton} aria-label="확대">＋</button>
          <button type="button" onClick={fit} className={styles.toolButton}>FIT</button>
        </div>
      </header>

      <section className={styles.stageShell} aria-label="canonical Moment Connection mindmap">
        <div className={styles.modeCaption} aria-hidden="true"><span>LOVE UNFOLDS</span><strong>{layoutMeta.title}</strong></div>
        <svg
          className={styles.map}
          viewBox={viewBox}
          role="tree"
          aria-label="저장된 Moment와 WHY NEXT Connection 마인드맵"
          onPointerDown={onStagePointerDown}
          onPointerMove={onStagePointerMove}
          onPointerUp={onStagePointerEnd}
          onPointerCancel={onStagePointerEnd}
          onWheel={onWheel}
        >
          <defs>
            <filter id="track14-shadow" x="-30%" y="-40%" width="160%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#6e5148" floodOpacity=".13" /></filter>
            <filter id="track14-label-shadow" x="-25%" y="-40%" width="150%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#6e5148" floodOpacity=".09" /></filter>
          </defs>
          <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.scale})`}>
            <g className={styles.petals} aria-hidden="true">
              {PETALS.map(([cx, cy, rx, ry, rotate], index) => <ellipse key={index} className={styles.petal} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rotate} ${cx} ${cy})`} />)}
            </g>
            {layout === "orbit" ? <><ellipse className={styles.guide} cx="0" cy="0" rx="360" ry="245" /><ellipse className={styles.guide} cx="0" cy="0" rx="455" ry="325" /></> : null}
            {layout === "journey" ? <path className={styles.journeyGuide} d="M -520 -225 C -310 80 -190 -300 55 -105 S 255 270 510 215" /> : null}
            {layout === "timeline" ? <path className={styles.guide} d="M 0 -300 C -30 -170 30 -70 0 20 S -25 180 0 310" /> : null}
            {layout === "branch" ? <path className={styles.guide} d="M -500 0 C -260 -55 -35 55 520 25" /> : null}

            {projection.nodes.filter((node) => node.depth === 0).map((root) => (
              <g key={`aura-${root.id}`} aria-hidden="true">
                <ellipse className={`${styles.rootAura} ${styles.auraOne}`} cx={root.x} cy={root.y} rx="124" ry="78" />
                <ellipse className={`${styles.rootAura} ${styles.auraTwo}`} cx={root.x} cy={root.y} rx="143" ry="91" />
              </g>
            ))}

            <g aria-hidden="true">
              {projection.edges.map((edge, index) => {
                const from = nodeById.get(edge.from);
                const to = nodeById.get(edge.to);
                if (!from || !to) return null;
                const value = track14RevealValue(progress, edge.revealAt, 0.13);
                const related = Boolean(selectedMomentId) && branchIds.has(edge.from) && branchIds.has(edge.to);
                const d = edgePath(from, to, index);
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2 + (index % 2 ? 14 : -14);
                const label = edge.label.trim();
                const labelWidth = label ? Math.max(72, Math.min(176, label.length * 6 + 22)) : 0;
                return (
                  <g key={`${edge.from}-${edge.to}`} style={{ opacity: value }}>
                    <path className={`${styles.edge}${related ? ` ${styles.edgeRelated}` : ""}`} d={d} pathLength={1} style={{ strokeDasharray: related ? "0.055 0.035" : 1, strokeDashoffset: related ? 0 : 1 - value }} />
                    {label ? (
                      <g className={styles.edgeLabel} transform={`translate(${midX} ${midY})`}>
                        <rect x={-labelWidth / 2} y="-11" width={labelWidth} height="22" rx="8" />
                        <text x="0" y="1">{clip(label, 24)}</text>
                      </g>
                    ) : null}
                  </g>
                );
              })}
            </g>

            <g>
              {projection.nodes.map((node, index) => {
                const value = track14RevealValue(progress, node.revealAt, 0.12);
                const size = nodeSize(node);
                const tone = node.depth === 0 ? "neutral" : toneFor(node.source);
                const selected = node.id === selectedMomentId;
                const subtitle = node.source.memo?.trim() || node.source.emotionTags[0] || node.source.sourceType || "Moment";
                const accent = tone === "lavender" ? "#9a87b8" : "#c86e79";
                const cardFill = tone === "lavender" ? "rgba(242,237,248,.96)" : tone === "rose" ? "rgba(253,239,241,.96)" : "rgba(255,251,246,.96)";
                return (
                  <g
                    key={node.id}
                    data-track14-node="true"
                    data-track14-node-id={node.id}
                    data-track14-depth={node.depth}
                    className={`${styles.node}${selected ? ` ${styles.selected}` : ""}`}
                    transform={`translate(${node.x} ${node.y}) scale(${(0.18 + value * 0.82).toFixed(4)} ${(0.72 + value * 0.28).toFixed(4)})`}
                    style={{ opacity: value, pointerEvents: value > 0.82 ? "auto" : "none" }}
                    role="treeitem"
                    tabIndex={value > 0.82 ? 0 : -1}
                    aria-selected={selected}
                    aria-label={`${node.depth === 0 ? "First Moment" : "Moment"}: ${node.source.title || "제목 없음"}`}
                    onClick={(event) => { event.stopPropagation(); selectMoment(node.id); }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        selectMoment(node.id);
                      }
                    }}
                  >
                    <rect className={styles.nodeShadow} x={-size.width / 2 + 4} y={-size.height / 2 + 8} width={size.width - 8} height={size.height - 4} rx={node.depth === 0 ? 25 : 18} />
                    <rect className={styles.nodeCard} style={{ fill: cardFill }} x={-size.width / 2} y={-size.height / 2} width={size.width} height={size.height} rx={node.depth === 0 ? 25 : 18} />
                    <line className={styles.nodeAccent} style={{ stroke: accent }} x1={-size.width / 2 + 18} y1={-size.height / 2 + 13} x2={-size.width / 2 + 48} y2={-size.height / 2 + 13} />
                    <circle className={styles.nodeDot} style={{ fill: accent }} cx={-size.width / 2 + 21} cy="-1" r={node.depth === 0 ? 7 : 5} />
                    {node.depth === 0 ? <path className={styles.seedLeaf} d="M -91 4 C -82 -15 -64 -20 -54 -11 C -58 3 -71 10 -88 8 M -88 8 C -76 8 -65 14 -59 25" /> : null}
                    <text className={styles.eyebrow} x={-size.width / 2 + (node.depth === 0 ? 44 : 38)} y={node.depth === 0 ? -22 : -14}>{node.depth === 0 ? "LOVE TREE" : tone === "rose" ? "EMOTION" : tone === "lavender" ? "NOTE" : `MOMENT · ${String(index + 1).padStart(2, "0")}`}</text>
                    <text className={styles.nodeTitle} x={-size.width / 2 + (node.depth === 0 ? 44 : 38)} y={node.depth === 0 ? 6 : 8}>{clip(node.source.title, node.depth === 0 ? 16 : 14)}</text>
                    <text className={styles.nodeSubtitle} x={-size.width / 2 + (node.depth === 0 ? 44 : 38)} y={node.depth === 0 ? 27 : 27}>{clip(subtitle, 20)}</text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        <div className={styles.introCopy}>
          <span>FROM SEED TO MEMORY</span>
          <h1>기억이 트리로 열립니다</h1>
          <p>첫 순간에서 시작해 감정의 인과관계가 가지와 노드로 차분히 맺힙니다.</p>
        </div>
        <div aria-hidden="true" style={{ position: "absolute", left: "50%", bottom: mobile ? 48 : 22, transform: "translateX(-50%)", zIndex: 10, padding: "9px 16px", borderRadius: 999, color: "#fffaf6", background: "rgba(67,52,47,.86)", fontSize: 10, letterSpacing: ".01em", boxShadow: "0 9px 24px rgba(65,47,41,.14)", whiteSpace: "nowrap" }}>가운데에서 폼이 좌르륵 펼쳐집니다.</div>
        <div className={styles.progressRail} aria-live="polite">
          <div><span>{phase}</span><strong>{String(Math.round(progress * 100)).padStart(2, "0")}%</strong></div>
          <i><b style={{ width: `${progress * 100}%` }} /></i>
        </div>
      </section>

      <div className={`${styles.scrim}${drawerOpen ? ` ${styles.scrimOpen}` : ""}`} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      <aside className={`${styles.drawer}${drawerOpen ? ` ${styles.drawerOpen}` : ""}`} aria-hidden={!drawerOpen} aria-label="PATH layout composer">
        <header><div><span>LAYOUT COMPOSER</span><h2>경로의 모양을 바꿔보세요</h2><p>표현만 바뀝니다. Moment · parentId · WHY NEXT는 저장하거나 수정하지 않습니다.</p></div><button type="button" onClick={() => setDrawerOpen(false)} aria-label="닫기">×</button></header>
        <div className={styles.layoutCards}>
          {LAYOUTS.map((item) => (
            <button key={item.id} type="button" onClick={() => selectLayout(item.id)} className={layout === item.id ? styles.layoutCardActive : undefined}>
              <span className={`${styles.layoutPreview} ${styles[`preview_${item.id}`]}`} aria-hidden="true"><i /><i /><i /><i /><i /></span>
              <strong>{item.title}</strong><small>{item.copy}</small>
            </button>
          ))}
        </div>
        <div className={styles.truthBox}><strong>CANONICAL PATH BOUNDARY</strong><p>이 화면은 기존 Tree/Moment API를 읽기만 하며 시각 전개·선택·배치 상태는 세션 presentation state입니다.</p></div>
      </aside>
    </main>
  );
}