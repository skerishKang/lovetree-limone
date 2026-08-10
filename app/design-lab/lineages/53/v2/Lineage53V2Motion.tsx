"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

type NodeSpec = {
  id: string;
  x: number;
  y: number;
  color: string;
  wash: string;
  kicker: string;
  title: string;
  meta: readonly [string, string];
};

type EdgeSpec = {
  id: string;
  from: string;
  to: string;
  d: string;
  colors: readonly [string, string];
  label: string;
};

const NODES: readonly NodeSpec[] = [
  { id: "m1", x: 28, y: 40, color: "#FFD36A", wash: "rgba(255,211,106,.10)", kicker: "FIRST MOMENT", title: "처음 멈춰 본 장면", meta: ["2026.05.12", "궁금함"] },
  { id: "m2", x: 46, y: 49, color: "#38E8FF", wash: "rgba(56,232,255,.10)", kicker: "NEXT MOMENT", title: "표정이 자꾸 생각나서", meta: ["+ 18 min", "다시 검색"] },
  { id: "m3", x: 68, y: 34, color: "#8B5CFF", wash: "rgba(139,92,255,.10)", kicker: "MOMENT 03", title: "무대 밖 말투가 궁금해져", meta: ["+ 41 min", "호기심"] },
  { id: "m4", x: 81, y: 52, color: "#FF4FA3", wash: "rgba(255,79,163,.095)", kicker: "MOMENT 04", title: "웃는 순간에서 마음이 움직여", meta: ["+ 1 h", "설렘"] },
  { id: "m5", x: 58, y: 67, color: "#FFD36A", wash: "rgba(255,211,106,.095)", kicker: "MOMENT 05", title: "팬의 추천을 따라간 밤", meta: ["DAY 2", "놀람"] },
  { id: "m6", x: 35, y: 76, color: "#A56BFF", wash: "rgba(165,107,255,.10)", kicker: "MOMENT 06", title: "이제 좋아한다고 인정해", meta: ["DAY 3", "몰입"] },
  { id: "m7", x: 69, y: 81, color: "#FF5AC8", wash: "rgba(255,90,200,.10)", kicker: "TURNING POINT", title: "완전히 빠진 순간", meta: ["DAY 5", "FALL IN LOVE"] },
] as const;

const EDGES: readonly EdgeSpec[] = [
  { id: "e1", from: "m1", to: "m2", d: "M 343 286 C 390 286, 405 335, 410 348", colors: ["#38E8FF", "#418CFF"], label: "Because the expression stayed with me…" },
  { id: "e2", from: "m2", to: "m3", d: "M 520 343 C 565 300, 605 276, 626 271", colors: ["#38E8FF", "#8B5CFF"], label: "I wanted to see another side." },
  { id: "e3", from: "m3", to: "m4", d: "M 742 277 C 790 304, 805 340, 804 360", colors: ["#8B5CFF", "#FF4FA3"], label: "That small laugh changed the feeling." },
  { id: "e4", from: "m4", to: "m5", d: "M 764 403 C 720 438, 663 460, 626 466", colors: ["#FF4FA3", "#A56BFF"], label: "A fan said: watch this next." },
  { id: "e5", from: "m5", to: "m6", d: "M 517 493 C 466 523, 424 538, 397 540", colors: ["#A56BFF", "#418CFF"], label: "I kept searching on my own." },
  { id: "e6", from: "m6", to: "m7", d: "M 413 567 C 505 612, 575 596, 628 578", colors: ["#418CFF", "#FF5AC8"], label: "This was the moment I admitted it." },
] as const;

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

export default function Lineage53V2Motion() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const pausedRef = useRef(false);
  const speedRef = useRef(1);
  const [runToken, setRunToken] = useState(0);
  const [fromIndex, setFromIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [arrivalNode, setArrivalNode] = useState<number | null>(null);
  const [activeEdge, setActiveEdge] = useState<number | null>(null);
  const [edgeProgress, setEdgeProgress] = useState(0);
  const [awakeNodes, setAwakeNodes] = useState<Set<number>>(() => new Set());
  const [memoryEdges, setMemoryEdges] = useState<Set<number>>(() => new Set());
  const [timeline, setTimeline] = useState(0);
  const [livingTree, setLivingTree] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; color: string } | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const observer = new ResizeObserver(([entry]) => setViewportWidth(entry.contentRect.width));
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, []);

  function startReplay(index = 0) {
    setFromIndex(index);
    setRunning(true);
    setPaused(false);
    setActiveNode(null);
    setArrivalNode(null);
    setActiveEdge(null);
    setEdgeProgress(0);
    setAwakeNodes(new Set(Array.from({ length: index }, (_, i) => i)));
    setMemoryEdges(new Set(Array.from({ length: Math.max(0, index) }, (_, i) => i)));
    setTimeline(index / NODES.length);
    setLivingTree(false);
    setTip(null);
    setRunToken((token) => token + 1);
  }

  useEffect(() => {
    if (reducedMotion !== false || runToken !== 0) return;
    const timer = window.setTimeout(() => startReplay(0), 700);
    return () => window.clearTimeout(timer);
    // Initial autoplay intentionally mirrors the source; later runs are user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  useEffect(() => {
    if (runToken === 0) return;
    let cancelled = false;
    let raf = 0;

    const animateDuration = (duration: number, onProgress?: (progress: number) => void) =>
      new Promise<boolean>((resolve) => {
        let elapsed = 0;
        let previous = performance.now();
        const frame = (now: number) => {
          if (cancelled) return resolve(false);
          const delta = now - previous;
          previous = now;
          if (!pausedRef.current) elapsed += delta * speedRef.current;
          const progress = Math.min(1, elapsed / duration);
          onProgress?.(progress);
          if (progress >= 1) return resolve(true);
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      });

    const play = async () => {
      const totalStages = (NODES.length - fromIndex) * 2 - 1;
      let completedStages = 0;
      for (let index = fromIndex; index < NODES.length; index += 1) {
        setActiveNode(index);
        const nodeOk = await animateDuration(index === fromIndex ? 420 : 620);
        if (!nodeOk) return;
        setAwakeNodes((current) => new Set(current).add(index));
        setActiveNode(null);
        completedStages += 1;
        setTimeline(completedStages / totalStages);

        if (index >= EDGES.length) continue;
        setActiveEdge(index);
        setEdgeProgress(0);
        const edgeOk = await animateDuration(740, setEdgeProgress);
        if (!edgeOk) return;
        setMemoryEdges((current) => new Set(current).add(index));
        setActiveEdge(null);
        setTip(null);
        completedStages += 1;
        setTimeline(completedStages / totalStages);

        setArrivalNode(index + 1);
        const arrivalOk = await animateDuration(240);
        setArrivalNode(null);
        if (!arrivalOk) return;
      }

      if (!cancelled) {
        setLivingTree(true);
        setRunning(false);
        setPaused(false);
        setTimeline(1);
      }
    };

    void play();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [runToken, fromIndex]);

  useEffect(() => {
    if (activeEdge === null) return;
    const edge = EDGES[activeEdge];
    const path = pathRefs.current[edge.id];
    if (!path) return;
    const length = path.getTotalLength();
    const point = path.getPointAtLength(length * edgeProgress);
    setTip({ x: point.x, y: point.y, color: edge.colors[1] });
  }, [activeEdge, edgeProgress]);

  const cycleSpeed = () => {
    const index = SPEEDS.indexOf(speed as (typeof SPEEDS)[number]);
    setSpeed(SPEEDS[(index + 1) % SPEEDS.length]);
  };

  return (
    <div
      ref={wrapRef}
      className={`lt53-motion${livingTree ? " is-living-tree" : ""}${reducedMotion ? " is-reduced-motion" : ""}`}
      data-viewport={viewportWidth < 700 ? "compact" : "wide"}
    >
      <div className="lt53-motion__hero">
        <span>Moment → Connection → Moment</span>
        <h2>Follow the feeling<br />that moved you.</h2>
        <p>빛은 장식이 아니라 다음 순간을 찾아가게 만든 감정의 인과관계를 따라 이동합니다.</p>
      </div>

      <svg className="lt53-motion__svg" viewBox="0 0 1000 720" aria-hidden="true">
        <defs>
          <filter id="lt53-soft-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="lt53-hot-glow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="10" /></filter>
          {EDGES.map((edge) => (
            <linearGradient key={edge.id} id={`lt53-gradient-${edge.id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1000" y2="720">
              <stop offset="0%" stopColor={edge.colors[0]} /><stop offset="100%" stopColor={edge.colors[1]} />
            </linearGradient>
          ))}
        </defs>
        {EDGES.map((edge, index) => (
          <g key={edge.id}>
            <path
              ref={(node) => { pathRefs.current[edge.id] = node; }}
              d={edge.d}
              className="lt53-motion__connection-skeleton"
              stroke={`url(#lt53-gradient-${edge.id})`}
            ><title>{edge.label}</title></path>
            {memoryEdges.has(index) ? <path d={edge.d} className="lt53-motion__connection-memory" stroke={`url(#lt53-gradient-${edge.id})`} /> : null}
            {activeEdge === index ? (
              <>
                <path d={edge.d} className="lt53-motion__connection-active-outer" stroke={`url(#lt53-gradient-${edge.id})`} pathLength={100} style={{ strokeDashoffset: 100 - edgeProgress * 100 }} />
                <path d={edge.d} className="lt53-motion__connection-active-inner" stroke={`url(#lt53-gradient-${edge.id})`} pathLength={100} style={{ strokeDashoffset: 100 - edgeProgress * 100 }} />
              </>
            ) : null}
          </g>
        ))}
        {tip ? (
          <g className="lt53-motion__tip">
            <circle cx={tip.x} cy={tip.y} r="18" fill={tip.color} opacity=".18" filter="url(#lt53-hot-glow)" />
            <circle cx={tip.x} cy={tip.y} r="4.25" fill="#fff" />
          </g>
        ) : null}
      </svg>

      <div className="lt53-motion__nodes">
        {NODES.map((node, index) => {
          const style = { left: `${node.x}%`, top: `${node.y}%`, "--node-color": node.color, "--node-wash": node.wash } as CSSProperties;
          const classes = ["lt53-motion__moment", activeNode === index ? "is-active" : "", awakeNodes.has(index) ? "is-awake" : "", arrivalNode === index ? "is-arrival" : ""].filter(Boolean).join(" ");
          return (
            <button key={node.id} type="button" className={classes} style={style} onClick={() => startReplay(index)}>
              <span className="lt53-motion__core" aria-hidden="true" />
              <span className="lt53-motion__kicker">{node.kicker}</span>
              <strong>{node.title}</strong>
              <span className="lt53-motion__meta"><span>{node.meta[0]}</span><span>{node.meta[1]}</span></span>
            </button>
          );
        })}
      </div>

      <div className={`lt53-motion__message${livingTree ? " is-visible" : ""}`}>
        <strong>YOUR MOMENTS BECOME A PATH.</strong>
        <span>Replay the route that made your heart move.</span>
      </div>

      <div className="lt53-motion__timeline" aria-label="Emotional path replay progress">
        <div style={{ width: `${Math.max(0, Math.min(1, timeline)) * 100}%` }} />
        <span>Emotional path replay</span>
      </div>

      <div className="lt53-motion__controls" role="group" aria-label="Path replay controls">
        <button className="is-primary" type="button" onClick={() => startReplay(0)}>{running ? "PLAYING" : "PLAY PATH"}</button>
        <button type="button" disabled={!running} onClick={() => setPaused((value) => !value)}>{paused ? "RESUME" : "PAUSE"}</button>
        <button type="button" onClick={() => startReplay(0)}>REPLAY</button>
        <button type="button" onClick={cycleSpeed}>SPEED {speed}×</button>
      </div>

      {reducedMotion ? <button className="lt53-motion__reduced-gate" type="button" onClick={() => startReplay(0)}>모션 감소 설정 활성 · 수동으로 원본 흐름 재생</button> : null}
    </div>
  );
}
