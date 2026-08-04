// Source: lovetree-moment-polish-lab-v1.html
"use client";

import { useEffect, useRef, useState } from "react";

const PRINCIPLES = [
  { num: "01", title: "Nested Radius", note: "감정의 깊이에 따라 반경이 달라진다", demo: "radius" },
  { num: "02", title: "Emotional Focus", note: "한 점에 시선을 고정한다", demo: "focus" },
  { num: "03", title: "Thumbnail Depth", note: "썸네일이 공간감을 만든다", demo: "depth" },
  { num: "04", title: "Soft Memory Depth", note: "기억은 부드럽게 겹쳐진다", demo: "memory" },
  { num: "05", title: "Easy to Revisit", note: "언제든 돌아올 수 있다", demo: "revisit" },
  { num: "06", title: "Stable Time", note: "시간 표시는 흔들리지 않는다", demo: "time" },
  { num: "07", title: "Interruptible Motion", note: "모션은 중단 가능하다", demo: "motion" },
  { num: "08", title: "Tactile Save", note: "저장은 촉각적으로", demo: "save" },
  { num: "09", title: "Save States", note: "상태가 보인다", demo: "states" },
  { num: "10", title: "Memory Tags", note: "태그로 기억을 분류한다", demo: "tags" },
  { num: "11", title: "Balanced Titles", note: "제목 균형이 읽기를 돕는다", demo: "titles" },
  { num: "12", title: "Precise Transitions", note: "전환은 정확하게", demo: "transitions" },
];

export default function V4MomentPolishLab() {
  const [active, setActive] = useState(9);
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [heartState, setHeartState] = useState(0);
  const [radiusMode, setRadiusMode] = useState<"full" | "compact">("full");
  const [focusMode, setFocusMode] = useState<"geom" | "optic">("geom");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const setActiveCard = (idx: number) => {
    setActive(idx);
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === "r" || e.key === "R") { setActive(0); setPlaying(false); }
      if (e.key === "ArrowLeft") setActive((a) => Math.max(0, a - 1));
      if (e.key === "ArrowRight") setActive((a) => Math.min(11, a + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const applyPolish = () => {
    try { localStorage.setItem("lovetree-moment-polish-lab-v1", JSON.stringify({ applied: true, active, at: Date.now() })); } catch {}
    showToast("폴리시 적용됨");
  };

  const renderDemo = (demo: string) => {
    switch (demo) {
      case "radius":
        return (
          <div className="mpl-demo mpl-demo-radius">
            <div className={`mpl-radius-shells mpl-radius-${radiusMode}`}>
              {[0, 1, 2, 3].map((i) => <div key={i} className="mpl-shell" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
            <button className="mpl-toggle" onClick={() => setRadiusMode(radiusMode === "full" ? "compact" : "full")}>{radiusMode === "full" ? "12+12" : "12+8"}</button>
          </div>
        );
      case "focus":
        return (
          <div className="mpl-demo mpl-demo-focus">
            <div className={`mpl-focus-disc mpl-focus-${focusMode}`} />
            <button className="mpl-toggle" onClick={() => setFocusMode(focusMode === "geom" ? "optic" : "geom")}>{focusMode}</button>
          </div>
        );
      case "depth":
        return <div className="mpl-demo mpl-demo-depth">{[0, 1, 2].map((i) => <div key={i} className="mpl-depth-thumb" style={{ transform: `translateX(${i * 12}px) scale(${1 - i * 0.08})` }} />)}</div>;
      case "memory":
        return <div className="mpl-demo mpl-demo-memory">{[0, 1, 2].map((i) => <div key={i} className="mpl-memory-card" style={{ opacity: 1 - i * 0.2 }} />)}</div>;
      case "revisit":
        return <div className="mpl-demo mpl-demo-revisit"><button className="mpl-hit">돌아가기</button></div>;
      case "time":
        return <div className="mpl-demo mpl-demo-time"><span className="mpl-time-num">00:42</span></div>;
      case "motion":
        return <div className="mpl-demo mpl-demo-motion"><div className="mpl-motion-track" /><div className="mpl-motion-track mpl-motion-track-2" /></div>;
      case "save":
        return <div className="mpl-demo mpl-demo-save"><button className="mpl-save-btn" onClick={() => showToast("저장됨")}>♥ 저장</button></div>;
      case "states":
        return (
          <div className="mpl-demo mpl-demo-states">
            <button className="mpl-heart" data-state={heartState} onClick={() => setHeartState((h) => (h + 1) % 4)}>
              {["♡", "♥", "❤️", "✕"][heartState]}
            </button>
          </div>
        );
      case "tags":
        return <div className="mpl-demo mpl-demo-tags">{["설렘", "벅참", "그리움"].map((t) => <span key={t} className="mpl-tag">{t}</span>)}</div>;
      case "titles":
        return <div className="mpl-demo mpl-demo-titles"><div className="mpl-title-line mpl-title-balanced">균형 잡힌 제목</div></div>;
      case "transitions":
        return <div className="mpl-demo mpl-demo-transitions"><div className="mpl-transition-box" /></div>;
      default:
        return null;
    }
  };

  return (
    <main className="mpl-stage">
      <div className="mpl-shell">
        <div className="mpl-board">
          <section className="mpl-hero">
            <div className="mpl-cue-strip">
              <span className="mpl-cue-count">{String(active + 1).padStart(2, "0")}/12</span>
              <span className="mpl-cue-title">{PRINCIPLES[active].title}</span>
              <span className="mpl-cue-note">{PRINCIPLES[active].note}</span>
              <div className="mpl-cue-rail"><div className="mpl-cue-fill" style={{ width: `${((active + 1) / 12) * 100}%` }} /></div>
            </div>
            <div className="mpl-hero-content">
              <span className="mpl-eyebrow">MOMENT POLISH LAB</span>
              <h1>Moments that <em>feel alive</em>, by design</h1>
              <p>12개의 설계 원칙이 하나의 순간을 살아있게 만든다. 각 원칙을 켜고 끄며 차이를 직접 경험하라.</p>
            </div>
            <div className="mpl-ghost-num">{String(active + 1).padStart(2, "0")}</div>
          </section>

          <div className="mpl-apply-bar">
            <span>APPLY TO: Felix · Season 03 · Shared Course</span>
            <button className="mpl-apply-btn" onClick={applyPolish}>Apply polish</button>
          </div>

          <div className="mpl-playground-title">
            <span className="mpl-title-divider" />
            <small>THE PLAYGROUND · 12 LIVE PRINCIPLES</small>
            <span className="mpl-title-divider" />
          </div>

          <div className="mpl-principle-grid">
            {PRINCIPLES.map((p, i) => (
              <article
                key={p.num}
                className={`mpl-card${active === i ? " is-active" : ""}`}
                onClick={() => setActiveCard(i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveCard(i); } }}
                tabIndex={0}
                role="button"
                aria-label={`${p.num} ${p.title}`}
              >
                <div className="mpl-card-head">
                  <span className="mpl-card-num">{p.num}</span>
                  <span className="mpl-card-title">{p.title}</span>
                </div>
                <div className="mpl-card-demo">{active === i && renderDemo(p.demo)}</div>
                <p className="mpl-card-note">{p.note}</p>
              </article>
            ))}
          </div>

          <footer className="mpl-footer">
            <span>Save first. Polish later.</span>
            <span>Every detail feels intentional.</span>
          </footer>
        </div>
      </div>
      {toast && <div className="mpl-toast">{toast}</div>}
    </main>
  );
}
