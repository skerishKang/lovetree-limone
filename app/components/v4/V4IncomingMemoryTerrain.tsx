"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Moment {
  id: string;
  label: string;
  layer: 0 | 1 | 2;
  x: number;
  y: number;
  revisits: number;
}

const MOMENTS: Moment[] = [
  { id: "m01", label: "첫 발견", layer: 0, x: 22, y: 34, revisits: 1 },
  { id: "m02", label: "두 번째 시청", layer: 0, x: 38, y: 22, revisits: 2 },
  { id: "m03", label: "무대 전체", layer: 0, x: 55, y: 30, revisits: 1 },
  { id: "m04", label: "인터뷰", layer: 0, x: 70, y: 20, revisits: 3 },
  { id: "m05", label: "다시 찾은 장면", layer: 1, x: 30, y: 58, revisits: 4 },
  { id: "m06", label: "팬 리액션", layer: 1, x: 48, y: 62, revisits: 2 },
  { id: "m07", label: "직캠 반복", layer: 1, x: 64, y: 55, revisits: 5 },
  { id: "m08", label: "이어본 영상", layer: 2, x: 40, y: 78, revisits: 6 },
  { id: "m09", label: "계절 대표 장면", layer: 2, x: 60, y: 80, revisits: 8 },
];

const LAYER_LABELS = ["DISCOVERY", "RETURN", "STAY"];
const LAYER_COLORS = ["#4fe0c1", "#9b7cff", "#ff6f9f"];

type StateKey = 0 | 1 | 2 | 3 | 4;
const STATE_NAMES: Record<StateKey, string> = {
  0: "QUIET FIELD",
  1: "MOMENTS GATHER",
  2: "CONNECTION RIPPLE",
  3: "RETURN PULSE",
  4: "SEASON FORMATION",
};

export default function V4IncomingMemoryTerrain() {
  const [state, setState] = useState<StateKey>(1);
  const [layers, setLayers] = useState<[boolean, boolean, boolean]>([true, true, true]);
  const [selected, setSelected] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [pathProgress, setPathProgress] = useState(0);
  const [mobilePanel, setMobilePanel] = useState<"moment" | "connection" | "return" | "season">("season");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);

  // drift when live
  useEffect(() => {
    if (!live) return;
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      setPathProgress((t * 6) % 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [live]);

  const toggleLayer = (index: 0 | 1 | 2) => {
    setLayers((prev) => {
      const next = [...prev] as [boolean, boolean, boolean];
      next[index] = !next[index];
      return next;
    });
  };

  const selectState = (s: StateKey) => {
    setState(s);
    setLive(false);
    setPathProgress(s === 4 ? 1 : s === 0 ? 0 : 0.4 + s * 0.12);
  };

  const replay = () => {
    setLive(true);
    setState(1);
    setPathProgress(0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, .incoming-terrain-moment")) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, tx: tilt.x, ty: tilt.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setTilt({
      x: dragRef.current.tx + (e.clientX - dragRef.current.sx) * 0.18,
      y: dragRef.current.ty - (e.clientY - dragRef.current.sy) * 0.18,
    });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const visibleMoments = useMemo(
    () => MOMENTS.filter((m) => layers[m.layer] && (state >= m.layer)),
    [layers, state],
  );

  const selectedMoment = MOMENTS.find((m) => m.id === selected);

  const panelCopy: Record<"moment" | "connection" | "return" | "season", { chip: string; title: string; text: string }> = {
    moment: { chip: "GATHERING", title: "Moment Field", text: "Saved moments are gathering into visible emotional areas." },
    connection: { chip: "READY", title: "Connection Trace", text: "Select a Moment to reveal why the next one followed." },
    return: { chip: "2 RETURNS", title: "Return Pulse", text: "Returned Moments rise only from recorded revisits." },
    season: { chip: "UNFORMED", title: "Season Formation", text: "The path is visible, but the Season boundary is still open." },
  };

  return (
    <div className="incoming-terrain" data-testid="incoming-memory-terrain">
      <header className="incoming-terrain-topbar">
        <div className="incoming-terrain-brand">
          <div className="incoming-terrain-brand-mark" aria-hidden="true"></div>
          <strong>LOVETREE</strong>
          <span>LIVING MEMORY TERRAIN</span>
        </div>
        <div className="incoming-terrain-header-status">
          <i className="incoming-terrain-status-dot" aria-hidden="true"></i>
          <span>TERRAIN LIVE</span>
          <span className="incoming-terrain-desktop-only">ONE TREE · ONE SEASON</span>
          <span className="incoming-terrain-status-pill">{STATE_NAMES[state]}</span>
        </div>
      </header>

      <main
        className="incoming-terrain-stage"
        ref={stageRef}
        aria-label="Interactive living memory terrain"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="incoming-terrain-canvas"
          style={{ transform: `perspective(1100px) rotateX(${20 + tilt.y}deg) rotateZ(${tilt.x * 0.5}deg)` }}
        >
          {/* terrain base */}
          <div className="incoming-terrain-base" aria-hidden="true">
            <div className="incoming-terrain-grid" />
            <div className="incoming-terrain-ridge r1" />
            <div className="incoming-terrain-ridge r2" />
            <div className="incoming-terrain-ridge r3" />
          </div>

          {/* layer markers */}
          {[0, 1, 2].map((layer) =>
            layers[layer as 0 | 1 | 2] ? (
              <div key={layer} className={`incoming-terrain-layer layer-${layer}`} data-layer={layer} aria-hidden="true">
                <span className="incoming-terrain-layer-label">{LAYER_LABELS[layer]}</span>
              </div>
            ) : null,
          )}

          {/* season boundary */}
          <div className={`incoming-terrain-season-boundary${state === 4 ? " formed" : ""}`} aria-hidden="true" />

          {/* path */}
          <svg className="incoming-terrain-path" viewBox="0 0 100 100" aria-hidden="true">
            <path
              className="incoming-terrain-path-line"
              d="M14 76 C 26 62, 34 66, 44 56 S 62 44, 72 48 S 88 34, 90 26"
              pathLength={1}
              style={{ strokeDashoffset: 1 - pathProgress }}
            />
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((t, i) => (
              <circle key={i} className="incoming-terrain-path-node" cx={14 + t * 78 - Math.sin(t * Math.PI) * 8} cy={76 - t * 50 - Math.cos(t * Math.PI) * 6} r={i % 2 ? 2.2 : 3.2} />
            ))}
          </svg>

          {/* moment nodes */}
          {visibleMoments.map((m) => {
            const isSelected = selected === m.id;
            const pulse = state === 3 && m.layer === 1;
            return (
              <button
                key={m.id}
                className={`incoming-terrain-moment${isSelected ? " selected" : ""}${pulse ? " pulsing" : ""}`}
                style={{
                  left: `${m.x}%`,
                  top: `${m.y}%`,
                  "--accent": LAYER_COLORS[m.layer],
                } as React.CSSProperties}
                type="button"
                onClick={() => setSelected(m.id)}
                aria-label={m.label}
              >
                <span className="incoming-terrain-moment-dot" />
                <span className="incoming-terrain-moment-label">{m.label}</span>
                {m.revisits > 1 ? <span className="incoming-terrain-moment-count">×{m.revisits}</span> : null}
              </button>
            );
          })}
        </div>

        <section className="incoming-terrain-hero-copy" aria-labelledby="incomingTerrainTitle">
          <div className="incoming-terrain-eyebrow">ONE TREE · ONE SEASON · SAMPLE TERRAIN</div>
          <h1 id="incomingTerrainTitle">A terrain made from the moments you kept.</h1>
          <p>Moment, Connection, and return traces remain visible without judging or scoring the feeling.</p>
        </section>

        <aside className="incoming-terrain-panel tl" data-panel="moment">
          <div className="incoming-terrain-panel-head"><span className="incoming-terrain-panel-chip">{panelCopy.moment.chip}</span></div>
          <h2>{panelCopy.moment.title}</h2>
          <p>{panelCopy.moment.text}</p>
          <div className="incoming-terrain-micro"><i className="incoming-terrain-micro-line" /><div className="incoming-terrain-micro-nodes"><i /><i /><i /><i /><i /></div></div>
        </aside>
        <aside className="incoming-terrain-panel tr" data-panel="connection">
          <div className="incoming-terrain-panel-head"><span className="incoming-terrain-panel-chip">{panelCopy.connection.chip}</span></div>
          <h2>{panelCopy.connection.title}</h2>
          <p>{selectedMoment ? `${selectedMoment.label} → 다음 순간으로 이어진 이유가 드러납니다.` : panelCopy.connection.text}</p>
          <div className="incoming-terrain-micro"><i className="incoming-terrain-micro-line" /><div className="incoming-terrain-micro-nodes"><i /><i /><i /><i /></div></div>
        </aside>
        <aside className="incoming-terrain-panel bl" data-panel="return">
          <div className="incoming-terrain-panel-head"><span className="incoming-terrain-panel-chip">2 RETURNS</span></div>
          <h2>{panelCopy.return.title}</h2>
          <p>{panelCopy.return.text}</p>
          <div className="incoming-terrain-micro"><i className="incoming-terrain-micro-line" /><div className="incoming-terrain-micro-nodes"><i /><i /><i /></div></div>
        </aside>
        <aside className="incoming-terrain-panel br" data-panel="season">
          <div className="incoming-terrain-panel-head"><span className="incoming-terrain-panel-chip">{panelCopy.season.chip}</span></div>
          <h2>{panelCopy.season.title}</h2>
          <p>{panelCopy.season.text}</p>
          <div className="incoming-terrain-micro"><i className="incoming-terrain-micro-line" /><div className="incoming-terrain-micro-nodes"><i /><i /><i /><i /><i /></div></div>
        </aside>

        <div className="incoming-terrain-legend" aria-label="Terrain layers">
          {LAYER_LABELS.map((label, i) => (
            <div className="incoming-terrain-legend-row" key={label}>
              <i style={{ background: LAYER_COLORS[i] }} />{label}
            </div>
          ))}
        </div>

        <div className="incoming-terrain-connection-card" aria-live="polite">
          {selectedMoment ? (
            <>
              <strong>{selectedMoment.label}</strong>
              <span>{LAYER_LABELS[selectedMoment.layer]} · 재방문 ×{selectedMoment.revisits}</span>
            </>
          ) : (
            <span>순간을 선택하면 연결 이유가 이곳에 나타납니다.</span>
          )}
        </div>

        <div className="incoming-terrain-layer-controls" aria-label="Terrain layer visibility">
          {LAYER_LABELS.map((label, i) => (
            <button key={label} className={`incoming-terrain-layer-toggle${layers[i as 0 | 1 | 2] ? " on" : ""}`} data-layer={i} aria-pressed={layers[i as 0 | 1 | 2]} type="button" onClick={() => toggleLayer(i as 0 | 1 | 2)}>
              {label}
            </button>
          ))}
        </div>

        <div className="incoming-terrain-sample-note">SAMPLE TERRAIN · values shown only where sample data exists · no inferred emotion score</div>

        <nav className="incoming-terrain-mobile-tabs" aria-label="Information panel">
          {(["moment", "connection", "return", "season"] as const).map((p) => (
            <button key={p} className={mobilePanel === p ? "active" : ""} type="button" onClick={() => setMobilePanel(p)}>{p.toUpperCase()}</button>
          ))}
        </nav>
        <section className="incoming-terrain-mobile-panel" aria-live="polite">
          <span className="incoming-terrain-panel-chip">{panelCopy[mobilePanel].chip}</span>
          <h2>{panelCopy[mobilePanel].title}</h2>
          <p>{panelCopy[mobilePanel].text}</p>
          <div className="incoming-terrain-mobile-meta">24 MOMENTS · 23 CONNECTIONS · SAMPLE</div>
          <button className="incoming-terrain-walk" type="button" onClick={replay}>WALK THIS PATH</button>
        </section>

        <div className="incoming-terrain-control-dock" role="toolbar" aria-label="Terrain controls">
          <button aria-pressed={!live} type="button" onClick={() => setLive((l) => !l)}>{live ? "PAUSE" : "LIVE"}</button>
          <button className="incoming-terrain-primary" type="button" onClick={replay}>REPLAY PATH</button>
          <button type="button" onClick={() => { setTilt({ x: 0, y: 0 }); setState(1); }}>RESET VIEW</button>
          <div className="incoming-terrain-state-dots" aria-label="Preview states">
            {([0, 1, 2, 3, 4] as StateKey[]).map((s) => (
              <button key={s} className={`incoming-terrain-state-dot${state === s ? " active" : ""}`} data-state={s} title={STATE_NAMES[s]} type="button" onClick={() => selectState(s)}>
                {String(s + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
          <button className="incoming-terrain-hide-mobile" type="button" onClick={() => selectState(4)}>OPEN SEASON</button>
        </div>
      </main>
    </div>
  );
}
