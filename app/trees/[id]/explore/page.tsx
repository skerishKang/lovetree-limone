"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ViewSwitcher } from "@/app/components/ViewSwitcher";
import { useTreeMoments } from "@/lib/use-tree-moments";
import {
  CLICK_THRESHOLD_PX,
  classifyGesture,
  frontmostHit,
  project,
  sortFarToNear,
  type Camera,
  type Projected,
  type Vec3,
} from "@/lib/lineage-60/projection";
import styles from "./explore.module.css";

type ClusterKey = "roots" | "visual" | "stories" | "notes";

type ClusterSpec = {
  key: ClusterKey;
  label: string;
  color: string;
  center: Vec3;
};

type ExploreMoment = {
  id: string;
  parentId: string | null;
  connectionReason: string | null;
  title: string;
  memo: string;
  sourceType: string;
  emotionTags: string[];
  cluster: ClusterKey;
};

type ExploreEdge = {
  fromId: string;
  toId: string;
  bridge: boolean;
};

const GOLDEN = 2.399963229728653;
const CLUSTERS: ClusterSpec[] = [
  { key: "roots", label: "시작의 기억", color: "#ff9bb3", center: [-190, -80, -125] },
  { key: "visual", label: "이미지와 영상", color: "#7ec8ff", center: [205, -45, -70] },
  { key: "stories", label: "음악과 이야기", color: "#ffd27e", center: [-125, 130, 145] },
  { key: "notes", label: "기록과 링크", color: "#a6f0c6", center: [175, 105, 135] },
];

const DEFAULT_CAMERA: Camera = { yaw: 0.52, pitch: 0.3, distance: 760, target: [0, 0, 0] };

function clusterFor(sourceType: string, isRoot: boolean): ClusterKey {
  if (isRoot) return "roots";
  const normalized = sourceType.toLowerCase();
  if (["image", "photo", "video", "youtube", "travel"].some((kind) => normalized.includes(kind))) return "visual";
  if (["song", "audio", "music", "book"].some((kind) => normalized.includes(kind))) return "stories";
  return "notes";
}

function clusterSpec(key: ClusterKey) {
  return CLUSTERS.find((cluster) => cluster.key === key) ?? CLUSTERS[0];
}

export default function TreeExplorePage() {
  const params = useParams<{ id: string | string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const momentId = searchParams.get("moment");
  const {
    tree,
    treeMoments,
    loading,
    error,
    isOwner,
    selectedMomentId,
    selectMoment,
  } = useTreeMoments(treeId, undefined, momentId ?? undefined);

  const moments = useMemo<ExploreMoment[]>(() => treeMoments.map((moment) => ({
    id: moment.id,
    parentId: moment.parentId,
    connectionReason: moment.connectionReason,
    title: moment.title || "제목 없는 Moment",
    memo: moment.memo || "메모가 없습니다.",
    sourceType: moment.sourceType || "moment",
    emotionTags: moment.emotionTags,
    cluster: clusterFor(moment.sourceType, moment.isRoot),
  })), [treeMoments]);

  const byId = useMemo(() => new Map(moments.map((moment) => [moment.id, moment])), [moments]);
  const membersByCluster = useMemo(() => {
    const map = new Map<ClusterKey, ExploreMoment[]>();
    CLUSTERS.forEach((cluster) => map.set(cluster.key, []));
    moments.forEach((moment) => map.get(moment.cluster)?.push(moment));
    return map;
  }, [moments]);

  const positions = useMemo(() => {
    const map = new Map<string, Vec3>();
    CLUSTERS.forEach((cluster) => {
      const members = membersByCluster.get(cluster.key) ?? [];
      members.forEach((moment, index) => {
        const angle = index * GOLDEN;
        const radius = 30 + (index % 5) * 14;
        const vertical = (index - (members.length - 1) / 2) * 12;
        map.set(moment.id, [
          cluster.center[0] + Math.cos(angle) * radius,
          cluster.center[1] + vertical,
          cluster.center[2] + Math.sin(angle) * radius * 0.72,
        ]);
      });
    });
    return map;
  }, [membersByCluster]);

  const edges = useMemo<ExploreEdge[]>(() => moments.flatMap((moment) => {
    if (!moment.parentId) return [];
    const parent = byId.get(moment.parentId);
    if (!parent) return [];
    return [{ fromId: parent.id, toId: moment.id, bridge: parent.cluster !== moment.cluster }];
  }), [byId, moments]);

  const bridgeIds = useMemo(() => new Set(edges.filter((edge) => edge.bridge).map((edge) => edge.toId)), [edges]);
  const selected = selectedMomentId ? byId.get(selectedMomentId) ?? null : null;
  const selectedParent = selected?.parentId ? byId.get(selected.parentId) ?? null : null;
  const selectedChildren = selected ? moments.filter((moment) => moment.parentId === selected.id) : [];
  const selectedBridge = selected ? bridgeIds.has(selected.id) : false;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<Camera>({ ...DEFAULT_CAMERA, target: [...DEFAULT_CAMERA.target] as Vec3 });
  const viewportRef = useRef({ w: 800, h: 560, dpr: 1 });
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

  const syncMomentToUrl = useCallback((nextMomentId: string | null) => {
    selectMoment(nextMomentId);
    const next = new URLSearchParams(searchParams.toString());
    if (nextMomentId) next.set("moment", nextMomentId);
    else next.delete("moment");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, selectMoment]);

  const resetCamera = useCallback(() => {
    cameraRef.current = { ...DEFAULT_CAMERA, target: [...DEFAULT_CAMERA.target] as Vec3 };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = stage.clientWidth || 800;
      const h = Math.max(410, Math.min(stage.clientHeight || 560, 650));
      viewportRef.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = `${h}px`;
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

  const projectedCandidates = useCallback(() => moments.flatMap((moment) => {
    const position = positions.get(moment.id);
    if (!position) return [];
    const proj = project(position, cameraRef.current, viewportRef.current);
    return proj ? [{ item: moment, proj }] : [];
  }), [moments, positions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const draw = () => {
      const vp = viewportRef.current;
      const cam = cameraRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#08090d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const cluster of CLUSTERS) {
        const members = membersByCluster.get(cluster.key) ?? [];
        if (members.length === 0) continue;
        const projected = project(cluster.center, cam, vp);
        if (!projected) continue;
        const radius = Math.max(36, Math.min(110, 34 + members.length * 5)) * vp.dpr;
        const gradient = ctx.createRadialGradient(projected.sx, projected.sy, radius * .12, projected.sx, projected.sy, radius);
        gradient.addColorStop(0, `${cluster.color}44`);
        gradient.addColorStop(1, `${cluster.color}03`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(projected.sx, projected.sy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = cluster.color;
        ctx.font = `${12 * vp.dpr}px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.fillText(cluster.label, projected.sx, projected.sy - radius - 8 * vp.dpr);
      }

      for (const edge of edges) {
        const from = positions.get(edge.fromId);
        const to = positions.get(edge.toId);
        if (!from || !to) continue;
        const a = project(from, cam, vp);
        const b = project(to, cam, vp);
        if (!a || !b) continue;
        const active = selectedMomentId === edge.fromId || selectedMomentId === edge.toId;
        ctx.strokeStyle = edge.bridge ? "#c9b6ff" : active ? "#ff91b8" : "#5f5b66";
        ctx.globalAlpha = active || edge.bridge ? .72 : .34;
        ctx.lineWidth = (active ? 2.2 : edge.bridge ? 1.8 : 1) * vp.dpr;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      const renderItems = sortFarToNear(projectedCandidates().map((candidate) => ({
        moment: candidate.item,
        proj: candidate.proj as Projected,
      })));

      for (const { moment, proj } of renderItems) {
        if (!proj) continue;
        const cluster = clusterSpec(moment.cluster);
        const isSelected = moment.id === selectedMomentId;
        const isBridge = bridgeIds.has(moment.id);
        const radius = (isSelected ? 8 : isBridge ? 6 : 4.5) * vp.dpr + Math.min(5, proj.scale * 2.2);
        if (isSelected) {
          ctx.strokeStyle = "#ff91b8";
          ctx.lineWidth = 2 * vp.dpr;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, radius + 9 * vp.dpr, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = isBridge ? "#c9b6ff" : cluster.color;
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, radius, 0, Math.PI * 2);
        ctx.fill();
        if (isSelected) {
          ctx.fillStyle = "#f3ece7";
          ctx.font = `${11 * vp.dpr}px sans-serif`;
          ctx.textAlign = "left";
          const label = moment.title.length > 28 ? `${moment.title.slice(0, 27)}…` : moment.title;
          ctx.fillText(label, proj.sx + radius + 6 * vp.dpr, proj.sy + 4 * vp.dpr);
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [bridgeIds, edges, membersByCluster, positions, projectedCandidates, selectedMomentId]);

  const hitTest = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const hit = frontmostHit(
      projectedCandidates(),
      clientX - rect.left,
      clientY - rect.top,
      24,
      viewportRef.current,
    );
    if (hit) syncMomentToUrl(hit.id);
  }, [projectedCandidates, syncMomentToUrl]);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    canvasRef.current?.setPointerCapture(event.pointerId);
    gesture.pointers.add(event.pointerId);
    gesture.active = true;
    gesture.cancelled = false;
    gesture.pinch = gesture.pointers.size > 1;
    gesture.startX = event.clientX;
    gesture.startY = event.clientY;
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
    gesture.maxMove = 0;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (!gesture.active || gesture.pinch || gesture.pointers.size > 1) return;
    const dx = event.clientX - gesture.lastX;
    const dy = event.clientY - gesture.lastY;
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
    gesture.maxMove = Math.max(gesture.maxMove, Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY));
    cameraRef.current.yaw -= dx * .005;
    cameraRef.current.pitch = Math.max(-1.25, Math.min(1.25, cameraRef.current.pitch + dy * .005));
  };

  const cleanupPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    try { canvasRef.current?.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    gesture.pointers.delete(event.pointerId);
    if (gesture.pointers.size === 0) {
      gesture.active = false;
      gesture.pinch = false;
      gesture.maxMove = 0;
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    const kind = classifyGesture({
      maxMove: gesture.maxMove,
      pinch: gesture.pinch,
      cancelled: gesture.cancelled,
      clickThreshold: CLICK_THRESHOLD_PX,
    });
    if (kind === "click") hitTest(event.clientX, event.clientY);
    cleanupPointer(event);
  };

  const onPointerCancel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    gestureRef.current.cancelled = true;
    cleanupPointer(event);
  };

  const onWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    const factor = event.deltaY > 0 ? 1.08 : .92;
    cameraRef.current.distance = Math.max(180, Math.min(1300, cameraRef.current.distance * factor));
  };

  const onCanvasKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === "ArrowLeft") cameraRef.current.yaw -= .16;
    else if (event.key === "ArrowRight") cameraRef.current.yaw += .16;
    else if (event.key === "ArrowUp") cameraRef.current.pitch = Math.max(-1.25, cameraRef.current.pitch - .12);
    else if (event.key === "ArrowDown") cameraRef.current.pitch = Math.min(1.25, cameraRef.current.pitch + .12);
    else if (event.key === "+" || event.key === "=") cameraRef.current.distance = Math.max(180, cameraRef.current.distance * .9);
    else if (event.key === "-" || event.key === "_") cameraRef.current.distance = Math.min(1300, cameraRef.current.distance * 1.1);
    else if (event.key === "Home") resetCamera();
    else return;
    event.preventDefault();
  };

  return (
    <div className="tree-page" data-mvp-source="60" data-tree-id={treeId}>
      <header className="tree-page-topbar">
        <Link className="tree-page-brand" href="/v4" aria-label="LoveTree 처음 화면으로">LoveTree</Link>
        <nav className="tree-page-nav" aria-label="러브트리 메뉴">
          <Link href="/my-trees">내 러브트리</Link>
          <Link href="/v4/community">둘러보기</Link>
        </nav>
      </header>
      <div className="tree-view-switcher-bar">
        <ViewSwitcher treeId={treeId} active="explore" momentId={selectedMomentId} isOwner={isOwner} />
      </div>

      <main className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <small>SOURCE 60 · CANONICAL DEEP EXPLORE</small>
            <h1>3D Moment Cluster Explorer</h1>
          </div>
          <p>
            {tree?.title ? `${tree.title}의 ` : ""}실제 Moment를 3D memory field로 봅니다. Cluster와 Bridge Moment는 현재 Tree에서 계산되는 보기 속성이며 저장되지 않습니다.
          </p>
        </header>
        <div className={styles.truth} aria-label="3D 탐색 데이터 권위">
          <span>Moment / parent relation = canonical</span>
          <span>Cluster / Bridge = VIEW_DERIVED</span>
          <span>Canvas 2D software projection</span>
          <span>new DB / API / schema = none</span>
        </div>

        {loading ? <div className={styles.state} aria-busy="true">3D 기억 필드를 불러오는 중…</div> : null}
        {!loading && error ? <div className={styles.state} role="alert">{error}</div> : null}

        {!loading && !error ? (
          <div className={styles.explorer}>
            <aside className={styles.panel} aria-label="Moment cluster list">
              <p className={styles.panelTitle}>Moments · semantic list</p>
              {CLUSTERS.map((cluster) => {
                const members = membersByCluster.get(cluster.key) ?? [];
                if (members.length === 0) return null;
                return (
                  <section className={styles.cluster} key={cluster.key} aria-label={cluster.label}>
                    <div className={styles.clusterHeader}>
                      <i className={styles.dot} style={{ background: cluster.color, color: cluster.color }} />
                      <strong>{cluster.label}</strong>
                      <span>{members.length}</span>
                    </div>
                    {members.map((moment) => (
                      <button
                        key={moment.id}
                        type="button"
                        className={`${styles.item}${selectedMomentId === moment.id ? ` ${styles.itemSelected}` : ""}`}
                        aria-pressed={selectedMomentId === moment.id}
                        onClick={() => syncMomentToUrl(moment.id)}
                      >
                        {moment.title.length > 28 ? `${moment.title.slice(0, 27)}…` : moment.title}
                        {bridgeIds.has(moment.id) ? <span className={styles.bridge}>BRIDGE</span> : null}
                      </button>
                    ))}
                  </section>
                );
              })}
              {moments.length === 0 ? <div className={styles.empty}>탐색할 Moment가 없습니다.</div> : null}
            </aside>

            <section className={styles.stage} ref={stageRef} aria-label="3D Moment field">
              <div className={styles.controls}>
                <button className={styles.control} type="button" onClick={resetCamera}>RESET CAMERA</button>
                {selectedMomentId ? <button className={styles.control} type="button" onClick={() => syncMomentToUrl(null)}>CLEAR MOMENT</button> : null}
              </div>
              <canvas
                ref={canvasRef}
                className={styles.canvas}
                role="img"
                tabIndex={0}
                aria-label="3D Moment Cluster Explorer. 드래그로 회전하고 휠 또는 키보드 +, - 로 확대 축소합니다."
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onLostPointerCapture={onPointerCancel}
                onWheel={onWheel}
                onKeyDown={onCanvasKeyDown}
              />
              <p className={styles.hint}>drag rotate · wheel zoom · click Moment · keyboard arrows / + / − / Home</p>
            </section>

            <aside className={styles.panel} aria-label="Selected Moment cluster inspector">
              <p className={styles.panelTitle}>Inspector</p>
              {selected ? (
                <div className={styles.inspector}>
                  <p className={styles.meta}>{clusterSpec(selected.cluster).label}{selectedBridge ? " · BRIDGE MOMENT" : ""}</p>
                  <h2>{selected.title}</h2>
                  <p className={styles.meta}>{selected.sourceType.toUpperCase()}</p>
                  <div className={styles.tagRow}>{selected.emotionTags.map((tag) => <span className={styles.tag} key={tag}>#{tag}</span>)}</div>
                  <p className={styles.memo}>{selected.memo}</p>
                  <div className={styles.why}>
                    <strong>WHY NEXT</strong>
                    <p>{selected.connectionReason || "이전 Moment와 이어지는 이유가 아직 기록되지 않았습니다."}</p>
                  </div>
                  {selectedBridge ? (
                    <div className={styles.bridgeBox}>
                      <strong>VIEW-DERIVED BRIDGE</strong>
                      <p>{selectedParent ? clusterSpec(selectedParent.cluster).label : "시작"} → {clusterSpec(selected.cluster).label}</p>
                    </div>
                  ) : null}
                  {selectedChildren.length > 0 ? (
                    <div className={styles.bridgeBox}>
                      <strong>NEXT MOMENTS</strong>
                      <p>{selectedChildren.map((child) => child.title).join(" · ")}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className={styles.empty}>Canvas 또는 왼쪽 목록에서 Moment를 선택하세요.</div>
              )}
            </aside>
          </div>
        ) : null}
      </main>
    </div>
  );
}
