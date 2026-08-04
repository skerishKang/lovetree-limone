// Source: lovetree-memory-window-composer-v2.html
"use client";

import { useEffect, useRef, useState } from "react";

const BACKGROUNDS = [
  { id: "bg1", label: "공원 벤치", thumb: "https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg" },
  { id: "bg2", label: "카페 창가", thumb: "https://img.youtube.com/vi/ysz5S6PUM-U/hqdefault.jpg" },
  { id: "bg3", label: "도시 야경", thumb: "https://img.youtube.com/vi/MUKjhyAl_Ig/hqdefault.jpg" },
];

const MOMENTS = [
  { id: "m1", label: "처음 마음이 멈춘 장면", thumb: "https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg", person: "주연", subtitle: "00:42 · 설렘" },
  { id: "m2", label: "다시 찾아본 무대", thumb: "https://img.youtube.com/vi/ysz5S6PUM-U/hqdefault.jpg", person: "주연", subtitle: "01:15 · 벅참" },
  { id: "m3", label: "오래 남은 인터뷰", thumb: "https://img.youtube.com/vi/MUKjhyAl_Ig/hqdefault.jpg", person: "주연", subtitle: "03:28 · 그리움" },
];

const STYLES = ["CLEAN", "CINEMA", "ARCHIVE", "GLOW", "COLLAGE", "LIVE MOMENT"] as const;
const PRESETS = ["FACE SIDE", "OVER SHOULDER", "LOWER THIRD", "FULL POSTER", "FLOATING RIGHT", "FLOATING LEFT"];

export default function V4MemoryWindowComposer() {
  const [moment, setMoment] = useState(MOMENTS[0]);
  const [background, setBackground] = useState(BACKGROUNDS[0]);
  const [style, setStyle] = useState<(typeof STYLES)[number]>("CINEMA");
  const [ratioLocked, setRatioLocked] = useState(false);
  const [mirrored, setMirrored] = useState(false);
  const [preview, setPreview] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [corners, setCorners] = useState([
    { x: 0.15, y: 0.2 },
    { x: 0.85, y: 0.2 },
    { x: 0.85, y: 0.8 },
    { x: 0.15, y: 0.8 },
  ]);
  const [activeCorner, setActiveCorner] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ corner: number; startX: number; startY: number; startCorners: typeof corners } | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const applyPreset = (preset: string) => {
    const presets: Record<string, typeof corners> = {
      "FACE SIDE": [{ x: 0.05, y: 0.15 }, { x: 0.55, y: 0.15 }, { x: 0.55, y: 0.85 }, { x: 0.05, y: 0.85 }],
      "OVER SHOULDER": [{ x: 0.35, y: 0.1 }, { x: 0.95, y: 0.1 }, { x: 0.95, y: 0.9 }, { x: 0.35, y: 0.9 }],
      "LOWER THIRD": [{ x: 0.1, y: 0.55 }, { x: 0.9, y: 0.55 }, { x: 0.9, y: 0.95 }, { x: 0.1, y: 0.95 }],
      "FULL POSTER": [{ x: 0.05, y: 0.05 }, { x: 0.95, y: 0.05 }, { x: 0.95, y: 0.95 }, { x: 0.05, y: 0.95 }],
      "FLOATING RIGHT": [{ x: 0.55, y: 0.25 }, { x: 0.95, y: 0.25 }, { x: 0.95, y: 0.75 }, { x: 0.55, y: 0.75 }],
      "FLOATING LEFT": [{ x: 0.05, y: 0.25 }, { x: 0.45, y: 0.25 }, { x: 0.45, y: 0.75 }, { x: 0.05, y: 0.75 }],
    };
    setCorners(presets[preset] || presets["FACE SIDE"]);
    showToast(`프리셋: ${preset}`);
  };

  const handleCornerDown = (e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { corner: idx, startX: e.clientX, startY: e.clientY, startCorners: [...corners] };
    setActiveCorner(idx);
  };

  const handleCornerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragRef.current.startX) / rect.width;
    const dy = (e.clientY - dragRef.current.startY) / rect.height;
    const idx = dragRef.current.corner;
    setCorners((prev) => {
      const next = [...prev];
      const newX = Math.max(-0.2, Math.min(1.2, dragRef.current!.startCorners[idx].x + dx));
      const newY = Math.max(-0.2, Math.min(1.2, dragRef.current!.startCorners[idx].y + dy));
      next[idx] = { x: newX, y: newY };
      if (ratioLocked) {
        const w = dragRef.current!.startCorners[1].x - dragRef.current!.startCorners[0].x;
        const h = dragRef.current!.startCorners[2].y - dragRef.current!.startCorners[0].y;
        const ratio = w / h;
        const newH = (next[1].x - next[0].x) / ratio;
        next[2] = { x: next[1].x, y: next[0].y + newH };
        next[3] = { x: next[0].x, y: next[0].y + newH };
      }
      return next;
    });
  };

  const handleCornerUp = () => {
    dragRef.current = null;
    setActiveCorner(null);
  };

  const saveComposition = () => {
    try {
      localStorage.setItem("lovetree-memory-window-composer-v2", JSON.stringify({ moment: moment.id, background: background.id, style, corners, mirrored, at: Date.now() }));
    } catch {}
    showToast("구성 저장됨");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlaying(false);
      if (e.key === "r" || e.key === "R") applyPreset("FACE SIDE");
      if (e.key === "f" || e.key === "F") applyPreset("FULL POSTER");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cornerPoints = corners.map((c) => `${c.x * 100}% ${c.y * 100}%`).join(", ");

  return (
    <main className={`mwc-app mwc-style-${style.toLowerCase().replace(" ", "-")}`} ref={containerRef}>
      <div className="mwc-background">
        <img src={background.thumb} alt="" className="mwc-bg-img" style={{ transform: mirrored ? "scaleX(-1)" : "" }} />
        <div className="mwc-bg-scrim" />
        <div className="mwc-grain" />
      </div>

      <header className="mwc-header">
        <div className="mwc-brand">
          <span className="mwc-brand-mark" aria-hidden="true">✦</span>
          <div className="mwc-brand-copy">
            <b>LoveTree</b>
            <small>MEMORY WINDOW COMPOSER</small>
          </div>
        </div>
        <div className="mwc-header-actions">
          <button className="mwc-head-btn" onClick={() => setPreview(!preview)}>{preview ? "EDIT" : "PREVIEW"}</button>
          <button className="mwc-save-main" onClick={saveComposition}>SAVE</button>
        </div>
      </header>

      {!preview && (
        <>
          <aside className="mwc-side-panel mwc-left">
            <div className="mwc-panel-title">BACKGROUNDS</div>
            <div className="mwc-choice-list">
              {BACKGROUNDS.map((bg) => (
                <button key={bg.id} className={`mwc-choice${background.id === bg.id ? " active" : ""}`} onClick={() => setBackground(bg)}>
                  <img src={bg.thumb} alt="" />
                  <div><b>{bg.label}</b><small>{bg.id}</small></div>
                </button>
              ))}
            </div>
          </aside>

          <aside className="mwc-side-panel mwc-right">
            <div className="mwc-panel-title">MOMENTS</div>
            <div className="mwc-choice-list">
              {MOMENTS.map((m) => (
                <button key={m.id} className={`mwc-choice${moment.id === m.id ? " active" : ""}`} onClick={() => setMoment(m)}>
                  <img src={m.thumb} alt="" />
                  <div><b>{m.label}</b><small>{m.subtitle}</small></div>
                </button>
              ))}
            </div>
          </aside>
        </>
      )}

      <div className="mwc-window-source" style={{ clipPath: `polygon(${cornerPoints})` }}>
        <img src={moment.thumb} alt="" className="mwc-moment-img" style={{ transform: mirrored ? "scaleX(-1)" : "" }} />
        <div className="mwc-window-shade" />
        <div className="mwc-window-meta">
          <small>{moment.person}</small>
          <strong>{moment.label}</strong>
          <span>{moment.subtitle}</span>
          {!preview && <button className="mwc-play-btn" onClick={() => setPlaying(true)}>▶</button>}
        </div>
      </div>

      {!preview && (
        <>
          <svg className="mwc-tracking-svg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 30 }}>
            <polygon points={corners.map((c) => `${c.x * 100},${c.y * 100}`).join(" ")} fill="none" stroke="rgba(255,225,163,0.5)" strokeWidth="0.3" strokeDasharray="0.8 0.8" />
          </svg>
          {corners.map((c, i) => (
            <div
              key={i}
              className={`mwc-corner${activeCorner === i ? " active" : ""}`}
              style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
              onPointerDown={(e) => handleCornerDown(e, i)}
              onPointerMove={handleCornerMove}
              onPointerUp={handleCornerUp}
            />
          ))}

          <div className="mwc-preset-bar">
            {PRESETS.map((p) => (
              <button key={p} className="mwc-preset-btn" onClick={() => applyPreset(p)}>{p}</button>
            ))}
          </div>

          <div className="mwc-toolbar">
            <button className={`mwc-tool-btn${ratioLocked ? " active" : ""}`} onClick={() => setRatioLocked(!ratioLocked)}>16:9 LOCK</button>
            <button className="mwc-tool-btn" onClick={() => applyPreset("FACE SIDE")}>RESET</button>
            <button className="mwc-tool-btn" onClick={() => setCorners([{ x: 0.15, y: 0.2 }, { x: 0.85, y: 0.2 }, { x: 0.85, y: 0.8 }, { x: 0.15, y: 0.8 }])}>CENTER</button>
            <button className={`mwc-tool-btn${mirrored ? " active" : ""}`} onClick={() => setMirrored(!mirrored)}>MIRROR</button>
          </div>

          <div className="mwc-mode-wrap">
            <div className="mwc-mode-dock">
              {STYLES.map((s) => (
                <button key={s} className={`mwc-mode-btn${style === s ? " active" : ""}`} onClick={() => setStyle(s)}>{s}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {playing && (
        <div className="mwc-player-backdrop" onClick={() => setPlaying(false)}>
          <div className="mwc-player">
            <iframe
              src={`https://www.youtube.com/embed/${moment.thumb.match(/vi\/([^/]+)/)?.[1] || "ScMzIvxBSi4"}?autoplay=1&rel=0`}
              title={moment.label}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
            <button className="mwc-close-player" onClick={() => setPlaying(false)}>×</button>
          </div>
        </div>
      )}

      {toast && <div className="mwc-toast">{toast}</div>}
    </main>
  );
}
