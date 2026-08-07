"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

interface FlowNode {
  id: string;
  kind: string;
  title: string;
  meta: string[];
  desc: string;
  color: "teal" | "blue" | "violet" | "rose" | "coral" | "lime" | "amber";
  priority: 1 | 2 | 3;
  recent?: boolean;
  media?: boolean;
  mediaSrc?: string;
  duration?: string;
  stats: [number, number, number, number];
  filters: { person: string[]; season: string[]; emotion: string[] };
}

const PALETTE: Record<string, string> = {
  teal: "#4fe0c1",
  blue: "#6fb4ff",
  violet: "#9b7cff",
  rose: "#ff6f9f",
  coral: "#ff8e72",
  lime: "#b5e96c",
  amber: "#ffc96b",
};
const RGB: Record<string, string> = {
  teal: "79,224,193",
  blue: "111,180,255",
  violet: "155,124,255",
  rose: "255,111,159",
  coral: "255,142,114",
  lime: "181,233,108",
  amber: "255,201,107",
};

const DESKTOP_NODES: Record<string, [number, number, number, number]> = {
  root: [800, 430, 242, 124],
  person: [430, 252, 190, 92],
  season: [790, 145, 196, 92],
  emotion: [1162, 240, 158, 112],
  m1: [265, 440, 194, 88],
  m2: [370, 650, 208, 88],
  m3: [636, 720, 206, 88],
  curiosity: [605, 245, 154, 92],
  wonder: [980, 150, 148, 92],
  return: [1130, 430, 150, 92],
  staying: [1010, 675, 154, 92],
  shared: [785, 625, 184, 88],
  spark: [1360, 380, 172, 82],
  bloom: [1290, 650, 170, 88],
  replay: [1450, 555, 164, 84],
};

const NODE_DATA: Record<string, FlowNode> = {
  root: { id: "root", kind: "Root core", title: "YOUR LOVETREE", meta: ["24 moments", "23 links"], desc: "The living root connecting saved moments to the reasons that led forward.", color: "teal", priority: 1, stats: [24, 23, 91, 6], filters: { person: ["current", "shared"], season: ["spring", "archive"], emotion: ["curiosity", "return", "staying"] } },
  person: { id: "person", kind: "Person memory", title: "PRIMARY SUBJECT", meta: ["saved person", "1 season"], desc: "The person whose moments and emotional route form this tree.", color: "blue", priority: 1, stats: [18, 17, 86, 4], filters: { person: ["current"], season: ["spring"], emotion: ["curiosity", "return", "staying"] } },
  season: { id: "season", kind: "Season map", title: "SPRING 2026", meta: ["Season 01", "active"], desc: "A replayable emotional route gathered across one season.", color: "violet", priority: 1, stats: [24, 23, 88, 6], filters: { person: ["current"], season: ["spring"], emotion: ["curiosity", "return", "staying"] } },
  emotion: { id: "emotion", kind: "Emotion signal", title: "STAYING", meta: ["current center", "88%"], desc: "The current emotional center of the live map.", color: "rose", priority: 1, stats: [12, 11, 88, 3], filters: { person: ["current"], season: ["spring"], emotion: ["staying"] } },
  m1: { id: "m1", kind: "Moment video · 00:18", title: "The first clip", meta: ["saved", "Curiosity"], desc: "The first saved video moment that opened the next search.", color: "teal", priority: 1, stats: [1, 2, 72, 1], media: true, duration: "00:18", filters: { person: ["current"], season: ["spring"], emotion: ["curiosity"] } },
  m2: { id: "m2", kind: "Moment video · 01:24", title: "The voice replayed", meta: ["replayed 4×", "Wonder"], desc: "A video moment whose voice sounded different the second time.", color: "blue", priority: 1, stats: [1, 3, 84, 1], media: true, duration: "01:24", filters: { person: ["current"], season: ["spring"], emotion: ["curiosity", "return"] } },
  m3: { id: "m3", kind: "Moment video · 02:11", title: "I came back", meta: ["returned", "Attachment"], desc: "The video moment where curiosity became a reason to stay.", color: "violet", priority: 1, stats: [1, 4, 91, 1], media: true, duration: "02:11", filters: { person: ["current"], season: ["spring"], emotion: ["return", "staying"] } },
  curiosity: { id: "curiosity", kind: "Emotion", title: "CURIOSITY", meta: ["72%", "rising"], desc: "The first impulse that caused another look.", color: "teal", priority: 2, stats: [4, 3, 72, 2], filters: { person: ["current"], season: ["spring"], emotion: ["curiosity"] } },
  wonder: { id: "wonder", kind: "Emotion", title: "WONDER", meta: ["84%", "active"], desc: "A widening emotional signal after replay.", color: "blue", priority: 2, stats: [5, 4, 84, 2], filters: { person: ["current"], season: ["spring"], emotion: ["curiosity", "return"] } },
  return: { id: "return", kind: "Emotion", title: "RETURN", meta: ["91%", "peak"], desc: "The repeated choice to revisit the path.", color: "coral", priority: 1, stats: [7, 6, 91, 3], filters: { person: ["current"], season: ["spring"], emotion: ["return"] } },
  staying: { id: "staying", kind: "Emotion", title: "STAYING", meta: ["88%", "stable"], desc: "The point where repeat attention became affection.", color: "rose", priority: 1, stats: [8, 7, 88, 3], filters: { person: ["current"], season: ["spring"], emotion: ["staying"] } },
  shared: { id: "shared", kind: "Shared route", title: "PATH SHARED", meta: ["3 replays", "2 branches"], desc: "A route another person can follow from the beginning.", color: "violet", priority: 2, stats: [3, 5, 79, 2], filters: { person: ["shared"], season: ["spring", "archive"], emotion: ["return", "staying"] } },
  spark: { id: "spark", kind: "Recent spark", title: "NEW MOMENT", meta: ["just now", "unlinked"], desc: "A newly saved moment waiting for its emotional reason.", color: "lime", priority: 3, recent: true, stats: [1, 0, 63, 1], filters: { person: ["current"], season: ["spring"], emotion: ["curiosity"] } },
  bloom: { id: "bloom", kind: "Bloom state", title: "OPENING", meta: ["74%", "season growth"], desc: "The season is moving toward a complete cover.", color: "rose", priority: 3, stats: [24, 23, 74, 6], filters: { person: ["current"], season: ["spring"], emotion: ["staying"] } },
  replay: { id: "replay", kind: "Replay path", title: "ACTIVE ROUTE", meta: ["00:42", "in progress"], desc: "A remembered path currently being walked again.", color: "amber", priority: 3, stats: [6, 5, 82, 2], filters: { person: ["shared"], season: ["spring", "archive"], emotion: ["return"] } },
};

const EDGE_DATA: Array<[string, string, string, string]> = [
  ["root", "person", "began with", "teal"],
  ["root", "season", "gathered into", "violet"],
  ["root", "emotion", "current feeling", "rose"],
  ["person", "m1", "first saved", "teal"],
  ["m1", "curiosity", "I watched again", "teal"],
  ["curiosity", "m2", "I searched for more", "blue"],
  ["m2", "wonder", "the voice stayed", "blue"],
  ["wonder", "m3", "I returned", "violet"],
  ["m3", "return", "came back again", "coral"],
  ["return", "staying", "return became staying", "rose"],
  ["staying", "season", "formed this season", "violet"],
  ["root", "shared", "opened a route", "violet"],
  ["shared", "replay", "being replayed", "amber"],
  ["season", "bloom", "season is opening", "rose"],
  ["emotion", "spark", "new signal", "lime"],
  ["spark", "replay", "waiting to connect", "lime"],
];

const ROUTES: string[][] = [
  ["root-person", "person-m1", "m1-curiosity", "curiosity-m2", "m2-wonder"],
  ["m2-wonder", "wonder-m3", "m3-return", "return-staying", "staying-season"],
  ["root-shared", "shared-replay", "season-bloom", "emotion-spark", "spark-replay"],
];

const DURATION = 9200;
const BOOT_END = 5900;

function edgePath(a: [number, number, number, number], b: [number, number, number, number], i: number) {
  const ax = a[0], ay = a[1], bx = b[0], by = b[1];
  const dx = bx - ax, dy = by - ay;
  const bend = Math.max(55, Math.min(180, Math.hypot(dx, dy) * 0.26));
  const side = i % 2 ? 1 : -1;
  const c1x = ax + dx * 0.34 - dy / Math.max(1, Math.hypot(dx, dy)) * bend * side;
  const c1y = ay + dy * 0.34 + dx / Math.max(1, Math.hypot(dx, dy)) * bend * side;
  const c2x = ax + dx * 0.68 - dy / Math.max(1, Math.hypot(dx, dy)) * bend * side;
  const c2y = ay + dy * 0.68 + dx / Math.max(1, Math.hypot(dx, dy)) * bend * side;
  return `M ${ax} ${ay} C ${c1x} ${c1y} ${c2x} ${c2y} ${bx} ${by}`;
}

function phaseFor(t: number): [string, string] {
  if (t < 700) return ["ROOT SEED", "SEED"];
  if (t < 1900) return ["STRUCTURE FORMING", "NODES"];
  if (t < 4100) return ["CONNECTIONS DRAWING", "LINKS"];
  if (t < BOOT_END) return ["SIGNALS FILLING", "DATA"];
  return ["MEMORY NETWORK LIVE", "LIVE"];
}

type Shape = "square" | "circle" | "heart";
type ViewMode = "auto" | "focus" | "sparse" | "dense";

export default function V4IncomingLiveFlowMap() {
  const [shape, setShape] = useState<Shape>("square");
  const [view, setView] = useState<ViewMode>("auto");
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState("root");
  const [filters, setFilters] = useState({ person: "current", season: "spring", emotion: "all" });
  const [progress, setProgress] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [attached, setAttached] = useState<Record<string, string>>({});
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [metrics, setMetrics] = useState({ density: 78.4, emotion: 83.0, heart: 91.8 });
  const [liveLabel, setLiveLabel] = useState("INITIALIZING FLOW");
  const [route, setRoute] = useState(-1);

  // Live animation loop
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    let last = 0;
    const loop = (now: number) => {
      const t = ((now - start) / 1000) * speed;
      const pct = (t % DURATION) / DURATION;
      setProgress(pct);
      const [pl, ll] = phaseFor(t % DURATION);
      setLiveLabel(ll === "LIVE" ? "MEMORY NETWORK LIVE" : pl);
      const live = Math.max(0, (t % DURATION) - BOOT_END);
      if (live > 0) {
        const r = Math.floor(live / 2500) % ROUTES.length;
        if (r !== last) {
          last = r;
          setRoute(r);
        }
        setMetrics({
          density: 78.4 + Math.sin(live / 930) * 2.7 + Math.sin(live / 311) * 0.6,
          emotion: 83 + Math.sin(live / 720 + 1) * 4.2,
          heart: 91.8 + Math.sin(live / 1160 + 2) * 2.1,
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [speed]);

  const filterVisible = (node: FlowNode) => {
    if (node.id === "root") return true;
    for (const group of ["person", "season", "emotion"] as const) {
      const value = filters[group];
      if (value === "all") continue;
      if (!(node.filters[group] || []).includes(value)) return false;
    }
    return true;
  };

  const selectedData = NODE_DATA[selected];

  const openVideo = (id: string) => {
    const d = NODE_DATA[id];
    if (!d?.media) return;
    setActiveMediaId(id);
    setVideoOpen(true);
    const src = attached[id] || d.mediaSrc || "";
    if (videoRef.current) {
      videoRef.current.src = src || "";
      if (src) videoRef.current.play().catch(() => {});
    }
  };

  const closeVideo = () => {
    setVideoOpen(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
  };

  const attachVideo = (file: File) => {
    if (!activeMediaId) return;
    const url = URL.createObjectURL(file);
    setAttached((prev) => ({ ...prev, [activeMediaId]: url }));
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.play().catch(() => {});
    }
  };

  const selectNode = (id: string) => {
    setSelected(id);
    setMobileDetailOpen(true);
  };

  const touchMap = (from: string, to: string) => from === to;

  const visibleCount = useMemo(() => {
    const match = (node: FlowNode) => {
      if (node.id === "root") return true;
      for (const group of ["person", "season", "emotion"] as const) {
        const value = filters[group];
        if (value === "all") continue;
        if (!(node.filters[group] || []).includes(value)) return false;
      }
      return true;
    };
    let v = 0;
    Object.keys(NODE_DATA).forEach((id) => {
      if (match(NODE_DATA[id])) v += 1;
    });
    return v;
  }, [filters]);

  return (
    <div className={`incoming-flowmap shape-${shape} ${view}`} data-testid="incoming-live-flow-map">
      <header className="incoming-flow-topbar">
        <div className="incoming-flow-brand">
          <span className="incoming-flow-mark" aria-hidden="true"></span>
          <span><strong>LOVETREE</strong><small>MEMORY NETWORK LIVE</small></span>
        </div>
        <div className="incoming-flow-live"><span className="incoming-flow-live-dot"></span><span>{liveLabel}</span></div>
        <div className="incoming-flow-toolbar" aria-label="Live map controls">
          <div className="incoming-flow-tool-group">
            <button className="incoming-flow-icon-btn" type="button" aria-label="Replay structure" onClick={() => { setProgress(0); setPaused(false); setRoute(-1); }}>↻ REPLAY</button>
            <button className="incoming-flow-icon-btn" type="button" aria-label="Pause animation" onClick={() => setPaused((p) => !p)}>{paused ? "▶ PLAY" : "Ⅱ PAUSE"}</button>
          </div>
          <div className="incoming-flow-tool-group">
            <span className="incoming-flow-tool-label">Shape</span>
            {(["square", "circle", "heart"] as Shape[]).map((s) => (
              <button key={s} className={`incoming-flow-seg-btn${shape === s ? " active" : ""}`} data-shape={s} type="button" onClick={() => setShape(s)}>{s === "square" ? "□" : s === "circle" ? "○" : "♥"}</button>
            ))}
          </div>
          <div className="incoming-flow-tool-group incoming-flow-modes">
            <span className="incoming-flow-tool-label">View</span>
            {(["auto", "focus", "sparse", "dense"] as ViewMode[]).map((v) => (
              <button key={v} className={`incoming-flow-seg-btn${view === v ? " active" : ""}`} type="button" onClick={() => setView(v)}>{v}</button>
            ))}
          </div>
          <div className="incoming-flow-tool-group">
            <span className="incoming-flow-tool-label">Flow</span>
            <input className="incoming-flow-speed" type="range" min={0.55} max={1.65} step={0.05} value={speed} aria-label="Motion speed" onChange={(e) => setSpeed(Number(e.target.value))} />
          </div>
        </div>
      </header>

      <aside className="incoming-flow-leftbar">
        <div className="incoming-flow-eyebrow">Live structure</div>
        <h1 className="incoming-flow-side-title">A living map<br />of saved feelings.</h1>
        <p className="incoming-flow-side-copy">Moments arrive, emotions respond, and every reason for returning keeps the tree in motion.</p>

        {(["person", "season", "emotion"] as const).map((group) => (
          <div className="incoming-flow-filter-block" key={group}>
            <div className="incoming-flow-filter-head"><span>{group === "person" ? "Person" : group === "season" ? "Season" : "Emotion"}</span></div>
            <div className="incoming-flow-chip-row" data-filter-group={group}>
              {(group === "person"
                ? [["current", "Primary person"], ["shared", "Shared people"], ["all", "All"]]
                : group === "season"
                  ? [["spring", "Spring 2026"], ["archive", "Archive"], ["all", "All seasons"]]
                  : [["all", "All"], ["curiosity", "Curiosity"], ["return", "Return"], ["staying", "Staying"]]
              ).map(([value, label]) => (
                <button
                  key={value}
                  className={`incoming-flow-chip${filters[group] === value ? " active" : ""}`}
                  data-value={value}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, [group]: value }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="incoming-flow-filter-impact"><b>{visibleCount} nodes</b> · 16 paths visible</div>
        <div className="incoming-flow-usage"><strong>Where this lives</strong><p>Tree creation · Season overview · Person memory shelf · Emotion observatory · Landing signature motion</p></div>
      </aside>

      <main className="incoming-flow-stage" id="stage" aria-label="Live LoveTree map showing moments, emotions and connections">
        <svg viewBox="0 0 1600 900" className="incoming-flow-network" role="img" aria-labelledby="incomingFlowMapTitle">
          <title id="incomingFlowMapTitle">LoveTree Live Flow Map</title>
          <defs>
            <filter id="incomingEdgeGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="incomingPacketGlow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {EDGE_DATA.map(([from, to, label, color], i) => {
            const a = DESKTOP_NODES[from];
            const b = DESKTOP_NODES[to];
            const key = `${from}-${to}`;
            const visible = (from === "root" || filterVisible(NODE_DATA[from])) && (to === "root" || filterVisible(NODE_DATA[to]));
            const active = route >= 0 ? ROUTES[route].includes(key) || touchMap(from, selected) || touchMap(to, selected) : touchMap(from, selected) || touchMap(to, selected);
            const appear = Math.max(0, Math.min(1, (progress * DURATION - 1050 - i * 245) / 620));
            return (
              <g
                key={key}
                className={`incoming-flow-edge-group${active ? " active" : ""}${!visible ? " filter-hidden" : ""}`}
                style={{ opacity: visible ? 1 : 0.05 }}
              >
                <path className="incoming-flow-edge-base" d={edgePath(a, b, i)} style={{ opacity: 0.15 + appear * 0.85 }} />
                <path className="incoming-flow-edge-glow" d={edgePath(a, b, i)} stroke={PALETTE[color]} style={{ opacity: appear * (active ? 1 : 0.7) }} />
                <path className="incoming-flow-edge-hit" d={edgePath(a, b, i)} onMouseEnter={() => setTooltip({ x: 400, y: 100, text: label })} onMouseLeave={() => setTooltip(null)} />
                <text
                  className={`incoming-flow-connection-label${appear > 0.8 ? " visible" : ""}${active ? " active" : ""}`}
                  x={400}
                  y={88}
                  textAnchor="middle"
                >
                  {label}
                </text>
              </g>
            );
          })}
          {Object.entries(DESKTOP_NODES).map(([id, pos]) => {
            const d = NODE_DATA[id];
            const appear = Math.max(0, Math.min(1, (progress * DURATION - 350 - Object.keys(DESKTOP_NODES).indexOf(id) * 330) / 420));
            const visible = id === "root" || filterVisible(d);
            const isSelected = selected === id;
            return (
              <foreignObject
                key={id}
                className={`incoming-flow-node-fo${id === "root" ? " root" : ""}${d.priority === 3 ? " low-priority" : ""}${isSelected ? " selected" : ""}${!visible ? " filtered-out" : ""}`}
                x={pos[0] - pos[2] / 2}
                y={pos[1] - pos[3] / 2}
                width={pos[2]}
                height={pos[3]}
                style={{ opacity: visible ? appear * (view === "sparse" && d.priority === 3 ? 0.12 : 1) : 0.08 }}
              >
                <div
                  className={`incoming-flow-node${id === "root" ? " root" : ""}${d.recent ? " recent" : ""}${d.media ? " media-node" : ""}`}
                  style={{ "--accent": PALETTE[d.color], "--rgb": RGB[d.color] } as CSSProperties}
                  onClick={() => selectNode(id)}
                >
                  <span className="incoming-flow-node-orbit" aria-hidden="true"></span>
                  <div className="incoming-flow-node-inner">
                    {d.media ? (
                      <>
                        <div className="incoming-flow-media-thumb">
                          <video muted loop playsInline preload="metadata" src={attached[id] || ""} />
                          <button className="incoming-flow-media-play" aria-label={`Play ${d.title}`} onClick={(e) => { e.stopPropagation(); openVideo(id); }}>▶</button>
                          <span className="incoming-flow-media-duration">{d.duration}</span>
                        </div>
                        <div className="incoming-flow-media-copy">
                          <div className="incoming-flow-node-kicker">{d.kind}</div>
                          <div className="incoming-flow-node-title">{d.title}</div>
                          <div className="incoming-flow-node-meta"><span>{d.meta[0]}</span><span>·</span><span className="incoming-flow-node-value">{d.meta[1]}</span></div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="incoming-flow-node-kicker">{d.kind}</div>
                        <div className="incoming-flow-node-title">{d.title}</div>
                        <div className="incoming-flow-node-meta"><span>{d.meta[0]}</span><span>·</span><span className="incoming-flow-node-value">{d.meta[1]}</span></div>
                      </>
                    )}
                  </div>
                </div>
              </foreignObject>
            );
          })}
        </svg>
        <div className="incoming-flow-tooltip" style={{ left: tooltip?.x ?? -200, top: tooltip?.y ?? -200 }}>{tooltip?.text ?? ""}</div>
      </main>

      <aside className={`incoming-flow-rightbar${mobileDetailOpen ? " open" : ""}`} id="rightbar">
        <button className="incoming-flow-mobile-detail-close" aria-label="Close details" onClick={() => setMobileDetailOpen(false)}>×</button>
        <div className="incoming-flow-detail-head"><span className="incoming-flow-eyebrow">Selected signal</span><span className="incoming-flow-detail-badge">{selectedData.recent ? "RECENT" : "LIVE"}</span></div>
        <h2 className="incoming-flow-detail-title">{selectedData.title}</h2>
        <div className="incoming-flow-detail-sub">{selectedData.desc}</div>
        <div className="incoming-flow-detail-grid">
          <div className="incoming-flow-detail-stat"><small>Moments</small><b>{selectedData.stats[0]}</b></div>
          <div className="incoming-flow-detail-stat"><small>Connections</small><b>{selectedData.stats[1]}</b></div>
          <div className="incoming-flow-detail-stat"><small>Signal</small><b>{selectedData.stats[2]}%</b></div>
          <div className="incoming-flow-detail-stat"><small>Branches</small><b>{selectedData.stats[3]}</b></div>
        </div>
        <div className="incoming-flow-signal-block">
          <div className="incoming-flow-signal-label"><span>Heart link strength</span><span>{Math.round(metrics.heart)}%</span></div>
          <div className="incoming-flow-signal-track"><div className="incoming-flow-signal-fill" style={{ width: `${metrics.heart}%` }} /></div>
        </div>
        <button className={`incoming-flow-detail-media-btn${selectedData.media ? " show" : ""}`} type="button" onClick={() => openVideo(selected)}>OPEN MOMENT VIDEO</button>
        <div className="incoming-flow-signal-block">
          <div className="incoming-flow-signal-label"><span>Memory density</span><span>{Math.round(metrics.density)}%</span></div>
          <div className="incoming-flow-signal-track"><div className="incoming-flow-signal-fill" style={{ width: `${metrics.density}%`, background: "linear-gradient(90deg,var(--violet),var(--rose))" }} /></div>
        </div>
        <div className="incoming-flow-recent-list">
          <div className="incoming-flow-eyebrow">Recent sparks</div>
          <div className="incoming-flow-recent-row"><i></i><div><strong>The voice I replayed</strong><span> · Wonder</span></div><time>NOW</time></div>
          <div className="incoming-flow-recent-row"><i style={{ background: "#ff6f9f" }}></i><div><strong>A path was revisited</strong><span> · Return</span></div><time>18s</time></div>
          <div className="incoming-flow-recent-row"><i style={{ background: "#9b7cff" }}></i><div><strong>Season cover updated</strong><span> · Bloom</span></div><time>42s</time></div>
        </div>
      </aside>

      <div className="incoming-flow-sample-label">SAMPLE LIVE MAP · VALUES ARE DEMONSTRATION DATA</div>

      <div className={`incoming-flow-video-modal${videoOpen ? " open" : ""}`} id="videoModal" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) closeVideo(); }}>
        <div className="incoming-flow-video-shell">
          <div className="incoming-flow-video-head">
            <div><small>Moment video</small><strong>{activeMediaId ? NODE_DATA[activeMediaId]?.title : "Saved Moment"}</strong></div>
            <button className="incoming-flow-video-close" aria-label="Close video" onClick={closeVideo}>×</button>
          </div>
          <div className="incoming-flow-video-stage">
            <span className="incoming-flow-video-badge">LOCAL MOMENT PREVIEW</span>
            <video ref={videoRef} controls playsInline preload="metadata"></video>
          </div>
          <div className="incoming-flow-video-actions">
            <label className="incoming-flow-upload-label">
              CHOOSE / REPLACE VIDEO
              <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => { const f = e.target.files?.[0]; if (f) attachVideo(f); e.target.value = ""; }} />
            </label>
            <span className="incoming-flow-video-note">Local preview only · not uploaded or saved to a server</span>
          </div>
        </div>
      </div>

      <footer className="incoming-flow-bottom">
        <div className="incoming-flow-bottom-brand">YOUR STORY IS STILL UNFOLDING</div>
        <div className="incoming-flow-timeline">
          <strong>{phaseFor(progress * DURATION)[0]}</strong>
          <div className="incoming-flow-timeline-track"><div className="incoming-flow-timeline-fill" style={{ width: `${Math.min(100, (progress * DURATION) / BOOT_END * 100)}%` }} /></div>
          <span className="incoming-flow-timeline-status">00:{(progress * DURATION / 1000) % 60 < 10 ? "0" : ""}{Math.floor((progress * DURATION / 1000) % 60)} · SYNC</span>
        </div>
        <div className="incoming-flow-metrics">
          <div className="incoming-flow-metric"><small>Memory density</small><b>{metrics.density.toFixed(1)}</b></div>
          <div className="incoming-flow-metric"><small>Emotion signal</small><b>{metrics.emotion.toFixed(1)}</b></div>
          <div className="incoming-flow-metric"><small>Heart sync</small><b>{metrics.heart.toFixed(1)}</b></div>
        </div>
      </footer>
    </div>
  );
}
