"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, WheelEvent } from "react";
import {
  CLICK_THRESHOLD_PX,
  classifyGesture,
  frontmostHit,
  project,
  sortFarToNear,
  type Camera,
  type Vec3,
} from "@/lib/lineage-60/projection";
import styles from "./Source60FaithfulSurface.module.css";

export interface Source60VisualMoment {
  id: string;
  title: string;
  memo: string;
  sourceType: string;
  sourceUrl?: string;
  thumbnail?: string;
  discoveryDate: string;
  emotionTags: string[];
  parentId: string | null;
  connectionReason: string | null;
  cluster: string;
  clusterLabel: string;
  clusterColor: string;
  isBridge: boolean;
}

export interface Source60VisualCluster {
  key: string;
  label: string;
  color: string;
  center: Vec3;
}

interface Props {
  treeTitle?: string | null;
  moments: Source60VisualMoment[];
  clusters: Source60VisualCluster[];
  selectedMomentId: string | null;
  onSelect: (id: string | null) => void;
}

type ModalKind = "viewer" | "book" | "connection" | "path";

type Hit =
  | { type: "moment"; id: string }
  | { type: "cluster"; key: string }
  | null;

const DEFAULT_CAMERA: Camera = {
  yaw: -0.18,
  pitch: 0.1,
  distance: 1460,
  target: [0, 0, 0],
};
const GOLDEN = 2.399963229728653;

function semanticLevel(zoom: number) {
  if (zoom < 0.9) return "UNIVERSE";
  if (zoom < 1.55) return "CLUSTER";
  if (zoom < 2.45) return "MOMENT FIELD";
  return "INSPECT";
}

export default function Source60FaithfulSurface({
  treeTitle,
  moments,
  clusters,
  selectedMomentId,
  onSelect,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<Camera>({ ...DEFAULT_CAMERA, target: [0, 0, 0] });
  const viewportRef = useRef({ w: 800, h: 600, dpr: 1 });
  const gestureRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    maxMove: 0,
    pinch: false,
    cancelled: false,
    pointers: new Set<number>(),
  });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [bridgeOnly, setBridgeOnly] = useState(false);
  const [zoom, setZoom] = useState(0.82);
  const [clusterKey, setClusterKey] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverPoint, setHoverPoint] = useState({ x: 0, y: 0 });
  const [modal, setModal] = useState<ModalKind | null>(null);
  const [toast, setToast] = useState("");

  const byId = useMemo(() => new Map(moments.map((moment) => [moment.id, moment])), [moments]);
  const selected = selectedMomentId ? byId.get(selectedMomentId) ?? null : null;
  const selectedParent = selected?.parentId ? byId.get(selected.parentId) ?? null : null;
  const selectedChildren = selected ? moments.filter((moment) => moment.parentId === selected.id) : [];
  const emotions = useMemo(
    () => Array.from(new Set(moments.flatMap((moment) => moment.emotionTags))),
    [moments],
  );
  const visibleMoments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return moments.filter((moment) => {
      const searchable = `${moment.title} ${moment.memo} ${moment.sourceType} ${moment.emotionTags.join(" ")}`.toLowerCase();
      return (
        (!needle || searchable.includes(needle)) &&
        (filter === "all" || moment.emotionTags.includes(filter)) &&
        (!bridgeOnly || moment.isBridge)
      );
    });
  }, [bridgeOnly, filter, moments, query]);
  const positions = useMemo(() => {
    const result = new Map<string, Vec3>();
    for (const cluster of clusters) {
      const members = moments.filter((moment) => moment.cluster === cluster.key);
      members.forEach((moment, index) => {
        const angle = index * GOLDEN;
        const radius = 28 + (index % 5) * 14;
        result.set(moment.id, [
          cluster.center[0] + Math.cos(angle) * radius,
          cluster.center[1] + (index - (members.length - 1) / 2) * 11,
          cluster.center[2] + Math.sin(angle) * radius * 0.7,
        ]);
      });
    }
    return result;
  }, [clusters, moments]);

  const announce = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }, []);

  const setZoomValue = useCallback((value: number) => {
    const next = Math.max(0.48, Math.min(3.4, value));
    setZoom(next);
    cameraRef.current.distance = 1197 / next;
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = stage.clientWidth || window.innerWidth;
      const height = stage.clientHeight || window.innerHeight;
      viewportRef.current = { w: width, h: height, dpr };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  const projectedCandidates = useCallback(
    () =>
      moments.flatMap((moment) => {
        const position = positions.get(moment.id);
        if (!position) return [];
        const projected = project(position, cameraRef.current, viewportRef.current);
        return projected ? [{ item: moment, proj: projected }] : [];
      }),
    [moments, positions],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let frame = 0;
    const draw = () => {
      const viewport = viewportRef.current;
      const camera = cameraRef.current;
      const level = semanticLevel(zoom);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);

      const drawLine = (fromPoint: Vec3, toPoint: Vec3, color: string, width: number, alpha: number) => {
        const from = project(fromPoint, camera, viewport);
        const to = project(toPoint, camera, viewport);
        if (!from || !to) return;
        context.strokeStyle = color;
        context.globalAlpha = alpha;
        context.lineWidth = width * viewport.dpr;
        context.beginPath();
        context.moveTo(from.sx, from.sy);
        context.lineTo(to.sx, to.sy);
        context.stroke();
        context.globalAlpha = 1;
      };

      if (level === "UNIVERSE" || level === "CLUSTER") {
        for (const cluster of clusters) {
          const projected = project(cluster.center, camera, viewport);
          if (!projected) continue;
          const count = moments.filter((moment) => moment.cluster === cluster.key).length;
          const radius = Math.max(30, Math.sqrt(Math.max(count, 1)) * 12 * projected.scale);
          const gradient = context.createRadialGradient(projected.sx, projected.sy, 1, projected.sx, projected.sy, radius);
          gradient.addColorStop(0, `${cluster.color}38`);
          gradient.addColorStop(1, `${cluster.color}00`);
          context.fillStyle = gradient;
          context.beginPath();
          context.arc(projected.sx, projected.sy, radius, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = "#403a40";
          context.font = `${level === "UNIVERSE" ? 12 : 11}px system-ui`;
          context.textAlign = "center";
          context.fillText(cluster.label, projected.sx, projected.sy - radius - 9 * viewport.dpr);
        }
      }

      for (const moment of moments) {
        if (!moment.parentId) continue;
        const parent = byId.get(moment.parentId);
        const from = parent && positions.get(parent.id);
        const to = positions.get(moment.id);
        if (from && to) drawLine(from, to, moment.isBridge ? "#c99a50" : "#b5aeb2", moment.isBridge ? 2 : 1, moment.isBridge ? 0.7 : 0.24);
      }

      if (level !== "UNIVERSE") {
        const rendered = sortFarToNear(
          projectedCandidates().filter(({ item }) => visibleMoments.some((candidate) => candidate.id === item.id)),
        );
        for (const { item, proj } of rendered) {
          const isSelected = item.id === selectedMomentId;
          const isHovered = item.id === hoveredId;
          const radius = (isSelected ? 7 : item.isBridge ? 5.5 : 3.5) * viewport.dpr + Math.min(5, proj.scale * 2);
          context.fillStyle = item.isBridge ? "#c99a50" : item.clusterColor;
          context.globalAlpha = isSelected || isHovered ? 1 : 0.78;
          context.beginPath();
          context.arc(proj.sx, proj.sy, radius, 0, Math.PI * 2);
          context.fill();
          context.globalAlpha = 1;
          if (isSelected) {
            context.strokeStyle = "#db6684";
            context.lineWidth = 2 * viewport.dpr;
            context.beginPath();
            context.arc(proj.sx, proj.sy, radius + 9 * viewport.dpr, 0, Math.PI * 2);
            context.stroke();
          }
          if (isSelected || (level === "INSPECT" && proj.scale > 1)) {
            context.fillStyle = "#403a40";
            context.font = `${11 * viewport.dpr}px system-ui`;
            context.textAlign = "left";
            context.fillText(item.title.slice(0, 26), proj.sx + radius + 6 * viewport.dpr, proj.sy + 4 * viewport.dpr);
          }
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [byId, clusters, hoveredId, moments, positions, projectedCandidates, selectedMomentId, visibleMoments, zoom]);

  const hitTest = useCallback(
    (clientX: number, clientY: number): Hit => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const momentHit = frontmostHit(projectedCandidates(), px, py, 25, viewportRef.current);
      if (momentHit) return { type: "moment", id: momentHit.id };
      if (semanticLevel(zoom) === "UNIVERSE") {
        for (const cluster of clusters) {
          const projected = project(cluster.center, cameraRef.current, viewportRef.current);
          if (!projected) continue;
          if (Math.hypot(projected.sx / viewportRef.current.dpr - px, projected.sy / viewportRef.current.dpr - py) < 90) {
            return { type: "cluster", key: cluster.key };
          }
        }
      }
      return null;
    },
    [clusters, projectedCandidates, zoom],
  );

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    canvasRef.current?.setPointerCapture(event.pointerId);
    gesture.pointers.add(event.pointerId);
    gesture.active = true;
    gesture.cancelled = false;
    gesture.pinch = gesture.pointers.size > 1;
    gesture.startX = event.clientX;
    gesture.startY = event.clientY;
    gesture.lastX = event.clientX;
    gesture.maxMove = 0;
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (!gesture.active || gesture.pinch || gesture.pointers.size > 1) return;
    const dx = event.clientX - gesture.lastX;
    const dy = event.clientY - gesture.lastY;
    gesture.lastX = event.clientX;
    gesture.maxMove = Math.max(gesture.maxMove, Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY));
    cameraRef.current.yaw += dx * 0.006;
    cameraRef.current.pitch = Math.max(-0.75, Math.min(0.75, cameraRef.current.pitch + dy * 0.0045));
    if (window.innerWidth > 760 && gesture.maxMove < CLICK_THRESHOLD_PX) {
      const hit = hitTest(event.clientX, event.clientY);
      setHoveredId(hit?.type === "moment" ? hit.id : null);
      setHoverPoint({ x: event.clientX + 14, y: event.clientY + 14 });
    }
  };
  const cleanupPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    try {
      canvasRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
    const gesture = gestureRef.current;
    gesture.pointers.delete(event.pointerId);
    if (gesture.pointers.size === 0) {
      gesture.active = false;
      gesture.pinch = false;
      gesture.maxMove = 0;
    }
  };
  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (classifyGesture({ maxMove: gesture.maxMove, pinch: gesture.pinch, cancelled: gesture.cancelled }) === "click") {
      const hit = hitTest(event.clientX, event.clientY);
      if (hit?.type === "moment") {
        onSelect(hit.id);
        announce("선택한 Moment로 이동했습니다");
      } else if (hit?.type === "cluster") {
        setClusterKey(hit.key);
        setZoomValue(Math.max(zoom, 1.28));
      }
    }
    cleanupPointer(event);
  };
  const onPointerCancel = (event: PointerEvent<HTMLCanvasElement>) => {
    gestureRef.current.cancelled = true;
    cleanupPointer(event);
  };
  const onWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    setZoomValue(zoom * Math.exp(-event.deltaY * 0.0011));
  };
  const reset = useCallback(() => {
    cameraRef.current = { ...DEFAULT_CAMERA, target: [0, 0, 0] };
    setZoomValue(0.82);
    setClusterKey(null);
    setBridgeOnly(false);
    onSelect(null);
    announce("전체 기억군 조망으로 돌아왔어요");
  }, [announce, onSelect, setZoomValue]);
  const onCanvasKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === "ArrowLeft") cameraRef.current.yaw -= 0.12;
    else if (event.key === "ArrowRight") cameraRef.current.yaw += 0.12;
    else if (event.key === "ArrowUp") cameraRef.current.pitch = Math.max(-0.75, cameraRef.current.pitch - 0.08);
    else if (event.key === "ArrowDown") cameraRef.current.pitch = Math.min(0.75, cameraRef.current.pitch + 0.08);
    else if (event.key === "+" || event.key === "=") setZoomValue(zoom * 1.15);
    else if (event.key === "-") setZoomValue(zoom / 1.15);
    else if (event.key.toLowerCase() === "r") {
      reset();
      return;
    } else return;
    event.preventDefault();
  };

  const searchResults = query.trim() ? visibleMoments.slice(0, 8) : [];
  const currentIndex = selected ? moments.findIndex((moment) => moment.id === selected.id) : -1;
  const previous = currentIndex > 0 ? moments[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < moments.length - 1 ? moments[currentIndex + 1] : null;
  const activeCluster = clusterKey ? clusters.find((item) => item.key === clusterKey) : null;

  return (
    <div className={styles.surface} data-source60-surface="canonical" data-tree-title={treeTitle ?? ""}>
      <div ref={stageRef} className={styles.stage}>
        <canvas ref={canvasRef} id="source60-stage" data-source60-canvas="true" role="img" tabIndex={0} aria-label="3D 모먼트 클러스터 탐색" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onLostPointerCapture={onPointerCancel} onWheel={onWheel} onKeyDown={onCanvasKeyDown} />
      </div>

      <div className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.mark} />
          <div><strong>3D 모먼트 클러스터 심층탐색</strong><span>{treeTitle ? `${treeTitle} · ` : ""}MY TREE · V1.2 REAL NAVIGATION</span></div>
        </div>
        <div className={styles.controls}>
          <div className={styles.searchbox}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Moment 검색" placeholder="Moment · 키워드 · 사람 검색" />
            <span aria-hidden="true">⌕</span>
            {searchResults.length > 0 ? <div className={styles.searchResults} role="listbox">
              {searchResults.map((moment) => <button type="button" key={moment.id} onClick={() => { onSelect(moment.id); setQuery(""); announce("검색한 Moment로 이동했습니다"); }}>
                <b>{moment.title}</b><small>{moment.discoveryDate} · {moment.emotionTags.join(" · ")} · {moment.clusterLabel}</small>
              </button>)}
            </div> : null}
          </div>
          <select aria-label="감정 필터" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">감정 전체</option>
            {emotions.map((emotion) => <option key={emotion}>{emotion}</option>)}
          </select>
          <button type="button" aria-pressed={bridgeOnly} onClick={() => { setBridgeOnly((value) => !value); announce(bridgeOnly ? "전체 Connection 문맥을 복원했습니다" : "다른 기억군으로 이어진 Moment만 강조합니다"); }}>
            {`Bridge${bridgeOnly ? " ON" : ""}`}
          </button>
          <button type="button" className={styles.iconButton} aria-label="전체 보기" onClick={reset}>⌂</button>
        </div>
      </div>

      <div className={styles.mobileHint}>드래그 회전 · 두 손가락 확대/축소 · 탭 탐색</div>
      {activeCluster ? <ClusterSummary cluster={activeCluster} moments={moments} onClose={() => setClusterKey(null)} onSelect={onSelect} /> : null}
      {hoveredId && !selected ? <div className={styles.tooltip} data-source60-tooltip="true" style={{ left: hoverPoint.x, top: hoverPoint.y }}><b>{byId.get(hoveredId)?.title}</b><small>{byId.get(hoveredId)?.discoveryDate} · {byId.get(hoveredId)?.emotionTags.join(" · ")} · {byId.get(hoveredId)?.sourceType}</small></div> : null}
      {selected ? <Inspector moment={selected} parent={selectedParent} momentChildren={selectedChildren} onClose={() => onSelect(null)} onOpen={setModal} /> : null}

      <div className={styles.legend}><span><i className={styles.momentDot} />Moment</span><span><i className={styles.bridgeDot} />Bridge Moment</span><span><i className={styles.selectedDot} />Selected</span></div>
      <div className={styles.orientation} aria-label="현재 방향"><b>ORBIT</b></div>
      <div className={styles.zoomLevel}>SEMANTIC ZOOM<strong>{semanticLevel(zoom)}</strong></div>
      <ClusterRail clusters={clusters} moments={moments} onSelect={(key) => { setClusterKey(key); setZoomValue(Math.max(zoom, 1.28)); onSelect(null); }} />
      <AccessibleMomentList moments={moments} selectedMomentId={selectedMomentId} onSelect={onSelect} />

      {modal && selected ? <ActionModal modal={modal} selected={selected} selectedParent={selectedParent} previous={previous} next={next} currentIndex={currentIndex} total={moments.length} onClose={() => setModal(null)} onSelect={onSelect} onToast={announce} /> : null}
      {toast ? <div className={styles.toast} role="status">{toast}</div> : null}
    </div>
  );
}

function ClusterSummary({ cluster, moments, onClose, onSelect }: { cluster: Source60VisualCluster; moments: Source60VisualMoment[]; onClose: () => void; onSelect: (id: string | null) => void }) {
  const bridges = moments.filter((moment) => moment.cluster === cluster.key && moment.isBridge).slice(0, 5);
  return <div className={styles.clusterSummary} data-source60-cluster-summary="true"><button type="button" className={styles.closeButton} aria-label="클러스터 닫기" onClick={onClose}>✕</button><h3>{cluster.label}</h3><p>{moments.filter((moment) => moment.cluster === cluster.key).length}개의 Moment · {bridges.length}개의 Bridge Moment · View-only cluster</p><div className={styles.bridgeList}>{bridges.map((moment, index) => <button type="button" key={moment.id} onClick={() => onSelect(moment.id)}>Bridge {index + 1}</button>)}</div></div>;
}

function ClusterRail({ clusters, moments, onSelect }: { clusters: Source60VisualCluster[]; moments: Source60VisualMoment[]; onSelect: (key: string) => void }) {
  return (
    <div className={styles.clusterRail} aria-label="클러스터 요약">
      {clusters.map((cluster) => (
        <button type="button" key={cluster.key} onClick={() => onSelect(cluster.key)}>
          <i style={{ background: cluster.color }} />
          {cluster.label}
          <small>{moments.filter((moment) => moment.cluster === cluster.key).length}</small>
        </button>
      ))}
    </div>
  );
}

function AccessibleMomentList({ moments, selectedMomentId, onSelect }: { moments: Source60VisualMoment[]; selectedMomentId: string | null; onSelect: (id: string | null) => void }) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const groups = Array.from(new Map(moments.map((moment) => [moment.cluster, moment.clusterLabel])).entries());
  const focusItem = (index: number) => {
    itemRefs.current[index]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = -1;
    if (event.key === "ArrowDown") nextIndex = Math.min(index + 1, moments.length - 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(index - 1, 0);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = moments.length - 1;
    if (nextIndex < 0) return;
    event.preventDefault();
    focusItem(nextIndex);
  };

  return (
    <div className={styles.accessibleList} role="tree" aria-label="Moment cluster tree">
      {groups.map(([clusterKey, clusterLabel]) => (
        <div role="group" aria-label={clusterLabel} key={clusterKey}>
          {moments.filter((moment) => moment.cluster === clusterKey).map((moment) => {
            const index = moments.indexOf(moment);
            return (
              <button
                ref={(element) => { itemRefs.current[index] = element; }}
                type="button"
                data-source60-moment-item="true"
                data-cluster-item="true"
                data-moment-id={moment.id}
                key={moment.id}
                role="treeitem"
                aria-selected={selectedMomentId === moment.id}
                aria-level={1}
                aria-setsize={moments.length}
                aria-posinset={index + 1}
                onKeyDown={(event) => onKeyDown(event, index)}
                onClick={() => onSelect(moment.id)}
              >
                {moment.title}
                {moment.isBridge ? <small>BRIDGE</small> : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Inspector({ moment, parent, momentChildren, onClose, onOpen }: { moment: Source60VisualMoment; parent: Source60VisualMoment | null; momentChildren: Source60VisualMoment[]; onClose: () => void; onOpen: (modal: ModalKind) => void }) {
  return <aside className={styles.panel} data-source60-inspector="true" aria-label="Moment Inspect"><button type="button" className={styles.closeButton} aria-label="닫기" onClick={onClose}>✕</button><div className={styles.eyebrow}>Moment Inspect</div><h2>{moment.title}</h2><div className={styles.meta}>{moment.discoveryDate} · {moment.sourceType} · {moment.clusterLabel}{moment.isBridge ? " · Bridge Moment" : ""}</div><div className={styles.preview} style={moment.thumbnail ? { backgroundImage: `url(${moment.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><span>Moment Memory</span></div><div className={styles.why}><b>WHY NEXT</b><span>{moment.connectionReason || "이 감정이 다음 순간의 탐색을 열었습니다."}</span></div>{moment.isBridge ? <div className={styles.bridgeBox}><strong>Bridge Moment</strong><br />이 Moment가 <b>{parent?.clusterLabel ?? "시작"}</b>과 <b>{moment.clusterLabel}</b>을 이어줬어요.</div> : null}<div className={styles.actions}><button type="button" onClick={() => onOpen("viewer")}>이 Moment 열기</button><button type="button" onClick={() => onOpen("book")}>책에서 보기</button><button type="button" onClick={() => onOpen("connection")}>연결 편집</button><button type="button" className={styles.primary} onClick={() => onOpen("path")}>이 경로 전체 보기</button></div>{momentChildren.length > 0 ? <div className={styles.childList}>다음 Moment · {momentChildren.map((child) => child.title).join(" · ")}</div> : null}</aside>;
}

function ActionModal({ modal, selected, selectedParent, previous, next, currentIndex, total, onClose, onSelect, onToast }: { modal: ModalKind; selected: Source60VisualMoment; selectedParent: Source60VisualMoment | null; previous: Source60VisualMoment | null; next: Source60VisualMoment | null; currentIndex: number; total: number; onClose: () => void; onSelect: (id: string | null) => void; onToast: (message: string) => void }) {
  const label = modal === "viewer" ? "Full Moment Viewer" : modal === "book" ? "Memory Sketchbook handoff" : modal === "connection" ? "Connection Edit handoff" : "Path Preview";
  return <div className={styles.actionModal} data-source60-modal={modal} role="dialog" aria-modal="true" aria-label={label} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={styles.actionShell}><button type="button" className={styles.actionClose} aria-label="닫기" onClick={onClose}>✕</button><div className={styles.actionKicker}>{label}</div><h2 className={styles.actionTitle}>{modal === "path" ? `${selected.clusterLabel} · 발견 경로` : selected.title}</h2><p className={styles.actionSub}>{modal === "connection" ? "60에서는 구조를 발견하고, 실제 Connection 수정은 Track 55 편집 View로 넘깁니다." : modal === "book" ? "선택한 Moment를 Memory Sketchbook의 page/spread 문맥으로 넘깁니다." : selected.memo}</p>{modal === "viewer" ? <ViewerBody selected={selected} previous={previous} next={next} onSelect={onSelect} /> : null}{modal === "book" ? <BookBody selected={selected} /> : null}{modal === "connection" ? <ConnectionBody selected={selected} parent={selectedParent} next={next} /> : null}{modal === "path" ? <PathBody selected={selected} previous={previous} next={next} currentIndex={currentIndex} total={total} onToast={onToast} /> : null}<div className={styles.handoffActions}><button type="button" className={styles.primary} onClick={onClose}>60으로 돌아가기</button></div></div></div>;
}

function ViewerBody({ selected, previous, next, onSelect }: { selected: Source60VisualMoment; previous: Source60VisualMoment | null; next: Source60VisualMoment | null; onSelect: (id: string | null) => void }) {
  return (
    <div className={styles.viewerGrid}>
      <div className={`${styles.viewerMedia} ${styles[`media_${selected.sourceType}`]}`} style={selected.thumbnail ? { backgroundImage: `linear-gradient(rgba(255,255,255,.2), rgba(255,255,255,.2)), url(${selected.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>        <div>
          <b>{selected.sourceType.toUpperCase()} MOMENT</b>
          <span>{selected.title}<br />{selected.clusterLabel} · {selected.discoveryDate}</span>
        </div>
      </div>
      <div className={styles.viewerSide}>
        <div className={styles.detailCard}><b>SOURCE · CAPTURED</b>{selected.sourceUrl ?? "canonical Moment source"}</div>
        <div className={styles.detailCard}><b>WHY NEXT</b>{selected.connectionReason ?? "이 감정이 다음 순간의 탐색을 열었습니다."}</div>
        <div className={styles.navMoments}>
          <button type="button" disabled={!previous} onClick={() => previous && onSelect(previous.id)}>← 이전 Moment<br /><b>{previous?.title ?? "없음"}</b></button>
          <button type="button" disabled={!next} onClick={() => next && onSelect(next.id)}>다음 Moment →<br /><b>{next?.title ?? "없음"}</b></button>
        </div>
      </div>
    </div>
  );
}

function BookBody({ selected }: { selected: Source60VisualMoment }) {
  return <div className={styles.handoffSpread}><section><small>← 이전 페이지</small><div className={styles.bookPhoto}>{selected.sourceType.toUpperCase()} · {selected.title}</div><small>{selected.discoveryDate}</small></section><section><small>다음 페이지 →</small><p>{selected.memo}</p><div className={styles.why}><b>WHY NEXT</b>{selected.connectionReason}</div></section></div>;
}

function ConnectionBody({ selected, parent, next }: { selected: Source60VisualMoment; parent: Source60VisualMoment | null; next: Source60VisualMoment | null }) {
  return <div className={styles.connectionFlow}><div><b>CURRENT MOMENT</b><p>{selected.title}</p></div><strong>→</strong><div><b>DESTINATION PREVIEW</b><p>{next?.title ?? "연결된 Moment"}</p><small>{parent?.clusterLabel ?? "시작"} → {selected.clusterLabel}</small></div></div>;
}

function PathBody({ selected, previous, next, currentIndex, total, onToast }: { selected: Source60VisualMoment; previous: Source60VisualMoment | null; next: Source60VisualMoment | null; currentIndex: number; total: number; onToast: (message: string) => void }) {
  const path = [previous, selected, next].filter((moment): moment is Source60VisualMoment => Boolean(moment));
  return <div className={styles.pathPreview}><div className={styles.pathStats}>{total} Moments · 현재 {currentIndex + 1}/{total} · {selected.clusterLabel}</div><div className={styles.pathRoute}>{path.map((moment) => <span className={moment.id === selected.id ? styles.currentPath : ""} key={moment.id}>{moment.title.slice(0, 14)}</span>)}</div><button type="button" className={styles.primary} onClick={() => onToast("경로 재생을 시작했습니다")}>경로 재생</button></div>;
}
