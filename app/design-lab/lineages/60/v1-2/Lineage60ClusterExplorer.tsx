"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./lineage-60.module.css";
import {
  type BridgeView,
  type ClusterView,
  type ThemeKey,
  type Track60Moment,
} from "@/lib/lineage-60/data";
import {
  type Camera,
  type Projected,
  type Vec3,
  classifyGesture,
  frontmostHit,
  project as projectPoint,
} from "@/lib/lineage-60/projection";

const GOLDEN = 2.399963229728653;
const LEVEL_DISTANCE: Record<number, number> = { 0: 920, 1: 540, 2: 340, 3: 210 };
const PITCH_LIMIT = Math.PI / 2 - 0.12;

function clusterCenter(clusters: ClusterView[], key: ThemeKey): Vec3 {
  return clusters.find((c) => c.key === key)?.center ?? [0, 0, 0];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function momentBasePosition(
  moment: Track60Moment,
  indexInCluster: number,
  countInCluster: number,
  clusters: ClusterView[],
): Vec3 {
  const center = clusterCenter(clusters, moment.theme);
  const angle = indexInCluster * GOLDEN;
  const radius = 26 + (indexInCluster % 5) * 13;
  const lx = Math.cos(angle) * radius;
  const lz = Math.sin(angle) * radius * 0.62;
  const ly = (indexInCluster - (countInCluster - 1) / 2) * 11;
  return [center[0] + lx, center[1] + ly, center[2] + lz];
}

export default function Lineage60ClusterExplorer({
  moments: momentsProp,
  clusters: clustersProp,
  bridges,
}: {
  moments: Track60Moment[];
  clusters: ClusterView[];
  bridges: BridgeView[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // ---- interaction authority (Blocker 1) ----
  // Single source of truth for drag-vs-click vs pinch vs cancel discrimination.
  const activeRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const maxMoveRef = useRef(0);
  const cancelledRef = useRef(false);
  const pinchHappenedRef = useRef(false);
  const pointersRef = useRef<Set<number>>(new Set());

  // ---- QA depth-overlap fixture (Blocker 2 browser proof) ----
  const qaDepth = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("qa") === "depth-overlap";
  }, []);
  const qaPositions = useMemo<Map<string, Vec3>>(() => {
    if (!qaDepth) return new Map();
    return new Map<string, Vec3>([
      ["qa-X", [0, 0, 40]],
      ["qa-Y", [0, 0, -40]],
    ]);
  }, [qaDepth]);
  const qaMoments = useMemo<Track60Moment[]>(
    () =>
      qaDepth
        ? [
            {
              id: "qa-X",
              title: "Depth X",
              memo: "front-most at yaw π",
              sourceType: "memo",
              discoveryDate: "2025-01-01",
              emotionTags: [],
              parentId: null,
              connectionReason: "qa",
              theme: "first",
            },
            {
              id: "qa-Y",
              title: "Depth Y",
              memo: "front-most at yaw 0",
              sourceType: "memo",
              discoveryDate: "2025-01-01",
              emotionTags: [],
              parentId: null,
              connectionReason: "qa",
              theme: "trip",
            },
          ]
        : [],
    [qaDepth],
  );
  const qaClusters = useMemo<ClusterView[]>(
    () =>
      qaDepth
        ? [
            { key: "first", label: "X cluster", color: "#ff9bb3", memberIds: ["qa-X"], center: [0, 0, 40] },
            { key: "trip", label: "Y cluster", color: "#7ec8ff", memberIds: ["qa-Y"], center: [0, 0, -40] },
          ]
        : [],
    [qaDepth],
  );

  // Effective data surface: normal mode uses the native route props; the QA
  // depth-overlap fixture replaces them with two on-axis points whose projected
  // screen position is identical but whose camera depth differs.
  const moments = qaDepth ? qaMoments : momentsProp;
  const clusters = qaDepth ? qaClusters : clustersProp;

  const [level, setLevel] = useState(0);
  const [focusCluster, setFocusCluster] = useState<ThemeKey | null>(null);
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [statusText, setStatusText] = useState("UNIVERSE · MACRO view");

  const camRef = useRef<Camera>({ yaw: 0.5, pitch: 0.35, distance: LEVEL_DISTANCE[0], target: [0, 0, 0] });
  const camTargetRef = useRef<Camera>({ yaw: 0.5, pitch: 0.35, distance: LEVEL_DISTANCE[0], target: [0, 0, 0] });
  const sizeRef = useRef({ w: 800, h: 520, dpr: 1 });

  // QA depth-overlap fixture: pin an on-axis camera so the two fixture points
  // overlap at screen center; the frontmost (smaller depth) is the authority.
  useEffect(() => {
    if (!qaDepth) return;
    const c: Camera = { yaw: 0, pitch: 0, distance: 300, target: [0, 0, 0] };
    camRef.current = { ...c };
    camTargetRef.current = { ...c };
    setLevel(2);
  }, [qaDepth]);

  const byId = useMemo(() => new Map(moments.map((m) => [m.id, m])), [moments]);
  const positions = useMemo(() => {
    if (qaDepth) return qaPositions;
    const map = new Map<string, Vec3>();
    for (const c of clusters) {
      c.memberIds.forEach((id, i) => {
        const m = byId.get(id);
        if (m) map.set(id, momentBasePosition(m, i, c.memberIds.length, clusters));
      });
    }
    return map;
  }, [clusters, byId, qaDepth, qaPositions]);

  const bridgeSet = useMemo(() => new Set(bridges.map((b) => b.momentId)), [bridges]);

  const selected = selectedMomentId ? byId.get(selectedMomentId) ?? null : null;
  const selectedBridge = selectedMomentId ? bridges.find((b) => b.momentId === selectedMomentId) ?? null : null;

  // ---- camera target control ----
  const applyLevelTargets = useCallback(
    (nextLevel: number, cluster: ThemeKey | null, momentId: string | null) => {
      const t = camTargetRef.current;
      if (momentId) {
        const p = positions.get(momentId);
        if (p) t.target = [p[0], p[1], p[2]];
        t.distance = LEVEL_DISTANCE[3];
      } else if (cluster) {
        t.target = clusterCenter(clusters, cluster);
        t.distance = LEVEL_DISTANCE[1];
      } else {
        t.target = [0, 0, 0];
        t.distance = LEVEL_DISTANCE[nextLevel];
      }
    },
    [clusters, positions],
  );

  const selectMoment = useCallback(
    (id: string | null) => {
      setSelectedMomentId(id);
      setFocusCluster(null);
      if (id) {
        setLevel(3);
        applyLevelTargets(3, null, id);
        const m = byId.get(id);
        const bridge = bridges.find((b) => b.momentId === id);
        const clusterLabel = m ? clusters.find((c) => c.key === m.theme)?.label : "";
        setStatusText(
          bridge
            ? `INSPECT · Bridge Moment → ${clusters.find((c) => c.key === bridge.nextCluster)?.label}`
            : `INSPECT · ${clusterLabel ?? ""} moment`,
        );
      } else {
        setStatusText(level === 0 ? "UNIVERSE · MACRO view" : "view");
      }
    },
    [applyLevelTargets, byId, bridges, clusters, level],
  );

  const focusOnCluster = useCallback(
    (key: ThemeKey) => {
      setFocusCluster(key);
      setSelectedMomentId(null);
      setLevel(1);
      applyLevelTargets(1, key, null);
      setStatusText(`CLUSTER · ${clusters.find((c) => c.key === key)?.label}`);
    },
    [applyLevelTargets, clusters],
  );

  const resetView = useCallback(() => {
    setFocusCluster(null);
    setSelectedMomentId(null);
    setLevel(0);
    applyLevelTargets(0, null, null);
    setStatusText("UNIVERSE · MACRO view");
  }, [applyLevelTargets]);

  const setSemanticLevel = useCallback(
    (lv: number) => {
      setLevel(lv);
      if (lv === 0) {
        setFocusCluster(null);
        setSelectedMomentId(null);
        applyLevelTargets(0, null, null);
        setStatusText("UNIVERSE · MACRO view");
      } else if (lv === 1 && !focusCluster) {
        focusOnCluster(clusters[0].key);
      } else if (lv >= 2) {
        applyLevelTargets(lv, focusCluster, selectedMomentId);
        setStatusText(lv === 2 ? "MOMENT FIELD" : "INSPECT");
      }
    },
    [applyLevelTargets, clusters, focusCluster, focusOnCluster, selectedMomentId],
  );

  // ---- reduced motion ----
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // ---- resize ----
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth || 800;
      const h = Math.max(360, Math.min(wrap.clientHeight || 520, 720));
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = `${h}px`;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // ---- projection (delegates to the single-source authority in projection.ts) ----
  const project = useCallback((p: Vec3, cam: Camera): Projected | null => {
    return projectPoint(p, cam, sizeRef.current);
  }, []);

  // ---- render loop ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const draw = () => {
      const cam = camRef.current;
      const target = camTargetRef.current;
      const ease = reducedMotion ? 1 : 0.16;
      cam.yaw = lerp(cam.yaw, target.yaw, ease);
      cam.pitch = lerp(cam.pitch, target.pitch, ease);
      cam.distance = lerp(cam.distance, target.distance, ease);
      cam.target[0] = lerp(cam.target[0], target.target[0], ease);
      cam.target[1] = lerp(cam.target[1], target.target[1], ease);
      cam.target[2] = lerp(cam.target[2], target.target[2], ease);

      const { dpr } = sizeRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const clusterColor = (key: ThemeKey) => clusters.find((c) => c.key === key)?.color ?? "#ffffff";

      const drawCorridor = (from: Vec3, to: Vec3, color: string, width: number) => {
        const a = project(from, cam);
        const b = project(to, cam);
        if (!a || !b) return;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = width * dpr;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      // LEVEL 0 — UNIVERSE / MACRO (depth-sorted far -> near)
      if (level === 0) {
        const clusterItems = clusters
          .map((c) => ({ c, proj: project(c.center, cam) }))
          .filter((it): it is { c: ClusterView; proj: Projected } => it.proj !== null)
          .sort((a, b) => b.proj.depth - a.proj.depth);
        for (const { c, proj } of clusterItems) {
          const r = Math.max(28, Math.min(120, c.memberIds.length * 6)) * proj.scale * 0.06;
          const grad = ctx.createRadialGradient(proj.sx, proj.sy, r * 0.2, proj.sx, proj.sy, r);
          grad.addColorStop(0, c.color + "55");
          grad.addColorStop(1, c.color + "05");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = c.color;
          ctx.font = `${14 * dpr}px Georgia, serif`;
          ctx.textAlign = "center";
          ctx.fillText(c.label, proj.sx, proj.sy - r - 8 * dpr);
          ctx.fillStyle = "#8d857f";
          ctx.font = `${10 * dpr}px sans-serif`;
          ctx.fillText(`${c.memberIds.length} moments`, proj.sx, proj.sy - r + 10 * dpr);
        }
        for (const b of bridges) {
          const from = positions.get(b.incomingParentId);
          const to = positions.get(b.momentId);
          if (from && to) drawCorridor(from, to, "#c9b6ff", 2);
        }
      }

      // LEVEL 1 — CLUSTER
      if (level === 1 && focusCluster) {
        const c = clusters.find((cl) => cl.key === focusCluster);
        if (c) {
          const otherCenters: ThemeKey[] = clusters.map((x) => x.key).filter((k) => k !== c.key);
          // local path skeleton (within-cluster parent→child)
          for (const id of c.memberIds) {
            const m = byId.get(id);
            if (m?.parentId && byId.get(m.parentId)?.theme === c.key) {
              const from = positions.get(m.parentId);
              const to = positions.get(id);
              if (from && to) drawCorridor(from, to, c.color, 1.5);
            }
          }
          // bridge moments + outgoing corridors to next cluster
          for (const b of bridges) {
            if (b.nextCluster !== c.key && b.previousCluster !== c.key) continue;
            const bp = positions.get(b.momentId);
            if (bp) {
              const proj = project(bp, cam);
              if (proj) {
                ctx.fillStyle = "#c9b6ff";
                ctx.beginPath();
                ctx.arc(proj.sx, proj.sy, 7 * dpr * proj.scale * 0.04 + 3 * dpr, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            if (b.previousCluster === c.key) {
              const to = clusterCenter(clusters, b.nextCluster);
              const from = positions.get(b.momentId);
              if (from) drawCorridor(from, to, "#c9b6ff", 2);
            }
          }
          // cluster members as anchors (depth-sorted far -> near)
          const memberItems = c.memberIds
            .map((id) => ({ id, p: positions.get(id), proj: positions.get(id) ? project(positions.get(id)!, cam) : null }))
            .filter((it) => it.proj !== null)
            .sort((a, b) => b.proj!.depth - a.proj!.depth);
          for (const { id, p } of memberItems) {
            const proj = project(p!, cam);
            if (!proj) continue;
            const isBridge = bridgeSet.has(id);
            ctx.fillStyle = isBridge ? "#c9b6ff" : c.color;
            ctx.beginPath();
            ctx.arc(proj.sx, proj.sy, 4 * dpr * proj.scale * 0.04 + 2 * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
          void otherCenters;
        }
      }

      // LEVEL 2 — MOMENT FIELD (all actual moment nodes + key connections)
      if (level === 2) {
        for (const m of moments) {
          if (m.parentId && byId.get(m.parentId)) {
            const from = positions.get(m.parentId);
            const to = positions.get(m.id);
            if (from && to) drawCorridor(from, to, "#6f6a78", 1);
          }
        }
        const drawNode = (m: Track60Moment, highlight: boolean) => {
          const p = positions.get(m.id);
          if (!p) return;
          const proj = project(p, cam);
          if (!proj) return;
          const r = (highlight ? 9 : 5) * dpr * proj.scale * 0.04 + (highlight ? 3 : 2) * dpr;
          ctx.fillStyle = clusterColor(m.theme);
          ctx.globalAlpha = highlight ? 1 : 0.85;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          if (highlight || proj.scale > 1.1) {
            ctx.fillStyle = "#ddd4cc";
            ctx.font = `${11 * dpr}px sans-serif`;
            ctx.textAlign = "left";
            const label = m.title.length > 22 ? m.title.slice(0, 21) + "…" : m.title;
            ctx.fillText(label, proj.sx + r + 4 * dpr, proj.sy + 4 * dpr);
          }
        };
        // depth-sorted far -> near render order (occlusion authority)
        const fieldNodes = moments
          .map((m) => ({ m, proj: positions.get(m.id) ? project(positions.get(m.id)!, cam) : null }))
          .filter((it) => it.proj !== null)
          .sort((a, b) => b.proj!.depth - a.proj!.depth);
        for (const { m } of fieldNodes) {
          if (m.id === selectedMomentId) continue; // selected drawn last (on top)
          drawNode(m, false);
        }
        if (selected) drawNode(selected, true);
      }

      // LEVEL 3 — INSPECT (selected + direct relations emphasized)
      if (level === 3) {
        if (selected) {
          const parent = selected.parentId ? byId.get(selected.parentId) : null;
          const children = moments.filter((m) => m.parentId === selected.id);
          if (parent) {
            const from = positions.get(parent.id);
            const to = positions.get(selected.id);
            if (from && to) drawCorridor(from, to, "#ff91b8", 2.5);
          }
          for (const ch of children) {
            const from = positions.get(selected.id);
            const to = positions.get(ch.id);
            if (from && to) drawCorridor(from, to, "#ffd27e", 2);
          }
          // dim field (depth-sorted far -> near)
          const dimItems = moments
            .filter(
              (m) =>
                m.id !== selected.id &&
                !(parent && m.id === parent.id) &&
                !children.some((c) => c.id === m.id),
            )
            .map((m) => ({ m, proj: positions.get(m.id) ? project(positions.get(m.id)!, cam) : null }))
            .filter((it) => it.proj !== null)
            .sort((a, b) => b.proj!.depth - a.proj!.depth);
          for (const { m } of dimItems) {
            const proj = project(positions.get(m.id)!, cam);
            if (!proj) continue;
            ctx.fillStyle = clusterColor(m.theme);
            ctx.globalAlpha = 0.18;
            ctx.beginPath();
            ctx.arc(proj.sx, proj.sy, 3 * dpr, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          // selected halo
          const sp = positions.get(selected.id);
          if (sp) {
            const proj = project(sp, cam);
            if (proj) {
              ctx.strokeStyle = "#ff91b8";
              ctx.lineWidth = 2 * dpr;
              ctx.beginPath();
              ctx.arc(proj.sx, proj.sy, 16 * dpr, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          if (parent) {
            const pp = positions.get(parent.id);
            if (pp) {
              const proj = project(pp, cam);
              if (proj) {
                ctx.fillStyle = clusterColor(parent.theme);
                ctx.beginPath();
                ctx.arc(proj.sx, proj.sy, 6 * dpr, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        } else {
          // no selection: show full field faintly so the level is not empty
          for (const m of moments) {
            const p = positions.get(m.id);
            if (!p) continue;
            const proj = project(p, cam);
            if (!proj) continue;
            ctx.fillStyle = clusterColor(m.theme);
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(proj.sx, proj.sy, 4 * dpr, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [level, focusCluster, clusters, moments, positions, byId, project, reducedMotion, bridgeSet, selected, selectedMomentId, bridges]);

  // ---- interaction authority (Blocker 1) ----
  // Click/tap vs rotate-drag vs pinch vs cancel is decided at gesture end using a
  // single threshold constant (CLICK_THRESHOLD_PX) sourced from projection.ts.

  const endGestureCleanup = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && e.pointerId != null) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    pointersRef.current.delete(e.pointerId);
    activeRef.current = false;
    pinchHappenedRef.current = false;
    cancelledRef.current = false;
    pointerStartRef.current = { x: 0, y: 0 };
    maxMoveRef.current = 0;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    pointersRef.current.add(e.pointerId);
    activeRef.current = true;
    cancelledRef.current = false;
    // A second simultaneous pointer means a pinch lifecycle started.
    pinchHappenedRef.current = pointersRef.current.size >= 2;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    maxMoveRef.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current) return;
    // A pinch / multi-touch lifecycle owns the gesture: no rotate, no select.
    if (pinchHappenedRef.current || pointersRef.current.size >= 2) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    // total displacement from the down origin drives click/tap authority
    maxMoveRef.current = Math.max(
      maxMoveRef.current,
      Math.hypot(e.clientX - pointerStartRef.current.x, e.clientY - pointerStartRef.current.y),
    );
    const t = camTargetRef.current;
    t.yaw -= dx * 0.005;
    t.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, t.pitch + dy * 0.005));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Decide click/tap vs rotate vs pinch vs cancel from the gesture record.
    const kind = classifyGesture({
      maxMove: maxMoveRef.current,
      pinch: pinchHappenedRef.current,
      cancelled: cancelledRef.current,
    });
    if (kind === "click") {
      hitTest(e.clientX, e.clientY);
    }
    // rotate / pinch / cancel -> cleanup only, NO selection (Blocker 1 proofs B/C/D).
    endGestureCleanup(e);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // pointercancel (and lost capture) is cleanup-only: it must never select.
    cancelledRef.current = true;
    endGestureCleanup(e);
  };

  const onLostPointerCapture = (e: React.PointerEvent<HTMLCanvasElement>) => {
    cancelledRef.current = true;
    endGestureCleanup(e);
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const t = camTargetRef.current;
    const factor = e.deltaY > 0 ? 1.08 : 0.92;
    t.distance = Math.max(120, Math.min(1400, t.distance * factor));
  };

  const touchState = useRef<{ mode: "none" | "pan" | "pinch"; x: number; y: number; dist: number }>({
    mode: "none",
    x: 0,
    y: 0,
    dist: 0,
  });

  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const ts = touchState.current;
    if (e.touches.length === 1) {
      ts.mode = "pan";
      ts.x = e.touches[0].clientX;
      ts.y = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      ts.mode = "pinch";
      // Pinch lifecycle: mark so pointer-up of the trailing finger cannot select.
      pinchHappenedRef.current = true;
      ts.dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const ts = touchState.current;
    const t = camTargetRef.current;
    if (ts.mode === "pan" && e.touches.length === 1) {
      const dx = e.touches[0].clientX - ts.x;
      const dy = e.touches[0].clientY - ts.y;
      ts.x = e.touches[0].clientX;
      ts.y = e.touches[0].clientY;
      t.yaw -= dx * 0.005;
      t.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, t.pitch + dy * 0.005));
    } else if (ts.mode === "pinch" && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const factor = ts.dist > 0 ? ts.dist / dist : 1;
      t.distance = Math.max(120, Math.min(1400, t.distance * factor));
      ts.dist = dist;
    }
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const ts = touchState.current;
    ts.mode = e.touches.length === 1 ? "pan" : "none";
    // Pinch lifecycle must not be mis-read as a click on the trailing finger-up.
    if (e.touches.length === 0) pinchHappenedRef.current = false;
  };

  const hitTest = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const cam = camRef.current;
    const vp = sizeRef.current;
    const candidates: { item: string; proj: Projected }[] = [];
    for (const m of moments) {
      const p = positions.get(m.id);
      if (!p) continue;
      const proj = project(p, cam);
      if (!proj) continue;
      candidates.push({ item: m.id, proj });
    }
    const hitR = Math.max(14, 18 - level * 2);
    // Frontmost (nearest = smallest depth) among overlapping 2D candidates.
    const hit = frontmostHit(candidates, px, py, hitR, vp);
    if (hit) {
      selectMoment(hit);
      return;
    }
    if (level === 0) {
      // cluster mass hit (nearest within 70px) — 2D mass, kept as-is
      let bestC: ThemeKey | null = null;
      let bestD = Infinity;
      for (const c of clusters) {
        const proj = project(c.center, cam);
        if (!proj) continue;
        const d = Math.hypot(proj.sx / vp.dpr - px, proj.sy / vp.dpr - py);
        if (d < 70 && d < bestD) {
          bestD = d;
          bestC = c.key;
        }
      }
      if (bestC) focusOnCluster(bestC);
    }
  };

  const onCanvasKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const t = camTargetRef.current;
    const step = 0.12;
    switch (e.key) {
      case "ArrowLeft":
        t.yaw -= step;
        e.preventDefault();
        break;
      case "ArrowRight":
        t.yaw += step;
        e.preventDefault();
        break;
      case "ArrowUp":
        t.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, t.pitch - step));
        e.preventDefault();
        break;
      case "ArrowDown":
        t.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, t.pitch + step));
        e.preventDefault();
        break;
      case "+":
      case "=":
        t.distance = Math.max(120, t.distance * 0.9);
        e.preventDefault();
        break;
      case "-":
        t.distance = Math.min(1400, t.distance * 1.1);
        e.preventDefault();
        break;
      case "0":
        setSemanticLevel(0);
        e.preventDefault();
        break;
      case "1":
        setSemanticLevel(1);
        e.preventDefault();
        break;
      case "2":
        setSemanticLevel(2);
        e.preventDefault();
        break;
      case "3":
        setSemanticLevel(3);
        e.preventDefault();
        break;
    }
  };

  // ---- accessible list keyboard ----
  const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const root = listRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-moment-item]"));
    const idx = items.findIndex((it) => it === document.activeElement);
    if (idx === -1) return;
    const next = e.key === "ArrowDown" ? Math.min(items.length - 1, idx + 1) : Math.max(0, idx - 1);
    e.preventDefault();
    items[next]?.focus();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return moments;
    return moments.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.memo.toLowerCase().includes(q) ||
        (clusters.find((c) => c.key === m.theme)?.label.toLowerCase().includes(q) ?? false),
    );
  }, [search, moments, clusters]);

  const statusAnnounce = selected
    ? `Selected ${selected.title}. Cluster ${clusters.find((c) => c.key === selected.theme)?.label}${selectedBridge ? ", Bridge Moment connecting " + clusters.find((c) => c.key === selectedBridge.previousCluster)?.label + " to " + clusters.find((c) => c.key === selectedBridge.nextCluster)?.label : ""}.`
    : "No moment selected.";

  return (
    <div className={styles.explorer}>
      <div className={styles.panel}>
        <p className={styles.panelTitle}>Moments · semantic list</p>
        <input
          className={styles.search}
          type="search"
          placeholder="Search moments / clusters"
          aria-label="Search moments and clusters"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div ref={listRef} onKeyDown={onListKeyDown} role="listbox" aria-label="All moments by cluster">
          {clusters.map((c) => {
            const members = c.memberIds.map((id) => byId.get(id)).filter(Boolean) as Track60Moment[];
            const shown = search.trim() ? members.filter((m) => filtered.includes(m)) : members;
            if (search.trim() && shown.length === 0) return null;
            return (
              <div className={styles.clusterGroup} key={c.key} role="group" aria-label={`Cluster ${c.label}`}>
                <div className={styles.clusterHeader}>
                  <span className={styles.clusterDot} style={{ background: c.color }} />
                  {c.label}
                  <span className={styles.clusterCount}>{members.length}</span>
                </div>
                {shown.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    data-moment-item
                    role="option"
                    className={styles.momentItem}
                    aria-selected={selectedMomentId === m.id}
                    onClick={() => selectMoment(m.id)}
                  >
                    {m.title.length > 28 ? m.title.slice(0, 27) + "…" : m.title}
                    {bridgeSet.has(m.id) ? <span className={`${styles.badge} ${styles.badgeBridge}`}>BRIDGE</span> : null}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.stageWrap} ref={wrapRef}>
        <div className={styles.hud}>
          {[0, 1, 2, 3].map((lv) => (
            <button
              key={lv}
              type="button"
              className={styles.levelBtn}
              aria-pressed={level === lv}
              onClick={() => setSemanticLevel(lv)}
            >
              {["MACRO", "CLUSTER", "FIELD", "INSPECT"][lv]}
            </button>
          ))}
          <button type="button" className={styles.controlBtn} onClick={resetView}>
            RESET
          </button>
        </div>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          tabIndex={0}
          role="img"
          aria-label="3D Moment Cluster Explorer canvas. Use arrow keys to rotate, plus and minus to zoom, and number keys 0 to 3 to change the semantic zoom level."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onLostPointerCapture={onLostPointerCapture}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onKeyDown={onCanvasKeyDown}
        />
        <p className={styles.hint}>
          drag rotate · wheel / pinch zoom · click a moment to inspect · click a cluster mass at MACRO to enter it
        </p>
        <p className={styles.status}>{statusText}{reducedMotion ? " · reduced-motion" : ""}</p>
      </div>

      <div className={styles.panel}>
        <p className={styles.panelTitle}>Inspector</p>
        {selected ? (
          <Inspector
            moment={selected}
            bridge={selectedBridge}
            parent={selected.parentId ? byId.get(selected.parentId) ?? null : null}
            childrenMoments={moments.filter((m) => m.parentId === selected.id)}
            clusters={clusters}
          />
        ) : (
          <p className={styles.inspectEmpty}>
            Select a Moment from the canvas or the list. At MACRO level, clusters appear as memory masses joined by
            bridge corridors. A Bridge Moment is a real Moment that connects two clusters.
          </p>
        )}
      </div>

      <div aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {statusAnnounce}
      </div>
    </div>
  );
}

function Inspector({
  moment,
  bridge,
  parent,
  childrenMoments,
  clusters,
}: {
  moment: Track60Moment;
  bridge: BridgeView | null;
  parent: Track60Moment | null;
  childrenMoments: Track60Moment[];
  clusters: ClusterView[];
}) {
  const clusterLabel = clusters.find((c) => c.key === moment.theme)?.label ?? "";
  const labelOf = (k: ThemeKey) => clusters.find((c) => c.key === k)?.label ?? k;
  return (
    <div>
      <h2 className={styles.inspectTitle}>{moment.title}</h2>
      <p className={styles.inspectMeta}>
        {moment.sourceType.toUpperCase()} · {moment.discoveryDate} · cluster {clusterLabel}
      </p>
      <div className={styles.tagRow}>
        {moment.emotionTags.map((t) => (
          <span className={styles.tag} key={t}>
            #{t}
          </span>
        ))}
      </div>
      <p className={styles.inspectMemo}>{moment.memo}</p>

      {bridge ? (
        <div className={styles.bridgeBox}>
          <strong>Bridge Moment</strong>
          <div>
            <span>{labelOf(bridge.previousCluster)}</span>{" "}
            <span className={styles.bridgeArrow}>→</span>{" "}
            <span>{moment.title.slice(0, 24)}</span>{" "}
            <span className={styles.bridgeArrow}>→</span>{" "}
            <span>{labelOf(bridge.nextCluster)}</span>
          </div>
          <p style={{ margin: "6px 0 0" }}>
            Incoming: {parent ? parent.title.slice(0, 24) : "—"}
            <br />
            Outgoing: {bridge.outgoingChildIds.length ? `${bridge.outgoingChildIds.length} connected moment(s)` : "—"}
          </p>
        </div>
      ) : (
        <p className={styles.inspectMeta}>Not a Bridge Moment (stays inside {clusterLabel}).</p>
      )}

      <p className={styles.panelTitle} style={{ marginTop: 10 }}>
        WHY NEXT
      </p>
      <p className={styles.whyNext}>{moment.connectionReason || "이전 순간과 이어지는 관계"}</p>

      {parent ? (
        <div>
          <p className={styles.inspectMeta}>Parent (incoming): {parent.title.slice(0, 30)}</p>
          <p className={styles.whyNext}>{parent.connectionReason || "이전 순간과 이어지는 관계"}</p>
        </div>
      ) : null}

      {childrenMoments.length ? (
        <div>
          <p className={styles.inspectMeta}>Outgoing ({childrenMoments.length}):</p>
          <ul style={{ margin: "4px 0", paddingLeft: 16, fontSize: 11.5, color: "#cfc7c0" }}>
            {childrenMoments.map((c) => (
              <li key={c.id}>{c.title.slice(0, 30)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {moment.sourceUrl ? (
        <p className={styles.inspectMeta}>
          <a href={moment.sourceUrl} target="_blank" rel="noreferrer noopener" style={{ color: "#7ec8ff" }}>
            open source ↗
          </a>
        </p>
      ) : null}
    </div>
  );
}
