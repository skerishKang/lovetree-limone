"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./lineage-60.module.css";
import {
  type BridgeView,
  type ClusterView,
  type ThemeKey,
  type Track60Moment,
} from "@/lib/lineage-60/data";

type Vec3 = [number, number, number];

interface Camera {
  yaw: number;
  pitch: number;
  distance: number;
  target: Vec3;
}

interface Projected {
  sx: number;
  sy: number;
  scale: number;
  depth: number;
}

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
  moments,
  clusters,
  bridges,
}: {
  moments: Track60Moment[];
  clusters: ClusterView[];
  bridges: BridgeView[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; active: boolean; pinch: boolean; dist?: number }>({
    x: 0,
    y: 0,
    active: false,
    pinch: false,
  });

  const [level, setLevel] = useState(0);
  const [focusCluster, setFocusCluster] = useState<ThemeKey | null>(null);
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [statusText, setStatusText] = useState("UNIVERSE · MACRO view");

  const camRef = useRef<Camera>({ yaw: 0.5, pitch: 0.35, distance: LEVEL_DISTANCE[0], target: [0, 0, 0] });
  const camTargetRef = useRef<Camera>({ yaw: 0.5, pitch: 0.35, distance: LEVEL_DISTANCE[0], target: [0, 0, 0] });
  const sizeRef = useRef({ w: 800, h: 520, dpr: 1 });

  const byId = useMemo(() => new Map(moments.map((m) => [m.id, m])), [moments]);
  const positions = useMemo(() => {
    const map = new Map<string, Vec3>();
    for (const c of clusters) {
      c.memberIds.forEach((id, i) => {
        const m = byId.get(id);
        if (m) map.set(id, momentBasePosition(m, i, c.memberIds.length, clusters));
      });
    }
    return map;
  }, [clusters, byId]);

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

  // ---- projection ----
  const project = useCallback((p: Vec3, cam: Camera): Projected | null => {
    const { w, h, dpr } = sizeRef.current;
    const cx = (w * dpr) / 2;
    const cy = (h * dpr) / 2;
    const focal = Math.min(w, h) * dpr * 1.15;

    const x = p[0] - cam.target[0];
    const y = p[1] - cam.target[1];
    const z = p[2] - cam.target[2];

    const cyaw = Math.cos(cam.yaw);
    const syaw = Math.sin(cam.yaw);
    const x1 = x * cyaw + z * syaw;
    const z1 = -x * syaw + z * cyaw;
    const y1 = y;

    const cp = Math.cos(cam.pitch);
    const sp = Math.sin(cam.pitch);
    const y2 = y1 * cp - z1 * sp;
    const z2 = y1 * sp + z1 * cp;
    const x2 = x1;

    const dz = z2 + cam.distance;
    if (dz <= 1) return null;
    return {
      sx: (x2 * focal) / dz + cx,
      sy: (-y2 * focal) / dz + cy,
      scale: focal / dz,
      depth: dz,
    };
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

      // LEVEL 0 — UNIVERSE / MACRO
      if (level === 0) {
        for (const c of clusters) {
          const p = project(c.center, cam);
          if (!p) continue;
          const r = Math.max(28, Math.min(120, c.memberIds.length * 6)) * p.scale * 0.06;
          const grad = ctx.createRadialGradient(p.sx, p.sy, r * 0.2, p.sx, p.sy, r);
          grad.addColorStop(0, c.color + "55");
          grad.addColorStop(1, c.color + "05");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = c.color;
          ctx.font = `${14 * dpr}px Georgia, serif`;
          ctx.textAlign = "center";
          ctx.fillText(c.label, p.sx, p.sy - r - 8 * dpr);
          ctx.fillStyle = "#8d857f";
          ctx.font = `${10 * dpr}px sans-serif`;
          ctx.fillText(`${c.memberIds.length} moments`, p.sx, p.sy - r + 10 * dpr);
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
          // cluster members as anchors
          for (const id of c.memberIds) {
            const p = positions.get(id);
            if (!p) continue;
            const proj = project(p, cam);
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
        for (const m of moments) if (m.id !== selectedMomentId) drawNode(m, false);
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
          // dim field
          for (const m of moments) {
            if (m.id === selected.id) continue;
            if (parent && m.id === parent.id) continue;
            if (children.some((c) => c.id === m.id)) continue;
            const p = positions.get(m.id);
            if (!p) continue;
            const proj = project(p, cam);
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

  // ---- pointer / wheel / touch ----
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, active: true, pinch: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d.active || d.pinch) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.x = e.clientX;
    d.y = e.clientY;
    const t = camTargetRef.current;
    t.yaw -= dx * 0.005;
    t.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, t.pitch + dy * 0.005));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && e.pointerId != null) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    const d = dragRef.current;
    if (d.active && !d.pinch) {
      // treat as click if minimal movement → hit test
      hitTest(e.clientX, e.clientY);
    }
    d.active = false;
    d.pinch = false;
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
      ts.dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      dragRef.current.pinch = true;
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
    touchState.current.mode = e.touches.length === 1 ? "pan" : "none";
    if (e.touches.length === 0) dragRef.current.pinch = false;
  };

  const hitTest = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const cam = camRef.current;
    let best: { id: string; d: number } | null = null;
    for (const m of moments) {
      const p = positions.get(m.id);
      if (!p) continue;
      const proj = project(p, cam);
      if (!proj) continue;
      const d = Math.hypot(proj.sx / (sizeRef.current.dpr) - px, proj.sy / (sizeRef.current.dpr) - py);
      const hitR = Math.max(14, 18 - level * 2);
      if (d < hitR && (!best || d < best.d)) best = { id: m.id, d };
    }
    if (best) {
      selectMoment(best.id);
    } else if (level === 0) {
      // cluster mass hit?
      for (const c of clusters) {
        const proj = project(c.center, cam);
        if (!proj) continue;
        const d = Math.hypot(proj.sx / sizeRef.current.dpr - px, proj.sy / sizeRef.current.dpr - py);
        if (d < 70) {
          focusOnCluster(c.key);
          return;
        }
      }
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
          onPointerCancel={onPointerUp}
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
