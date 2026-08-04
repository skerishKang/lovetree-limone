// Source: lovetree-memory-pulse-dashboard-v1.html
"use client";

import { useEffect, useRef, useState } from "react";

const PERIODS = ["7D", "30D", "SEASON", "ALL"] as const;
const SOURCES = ["YouTube", "TikTok", "Instagram", "X", "Spotify", "Web", "Vimeo"] as const;

const BARS = Array.from({ length: 42 }, (_, i) => ({
  day: i,
  value: Math.round(20 + Math.sin(i * 0.3) * 30 + Math.random() * 40),
  source: SOURCES[i % SOURCES.length],
}));

const REGIONS = [
  { name: "Seoul", x: 72, y: 38, count: 84 },
  { name: "Tokyo", x: 84, y: 40, count: 52 },
  { name: "LA", x: 18, y: 42, count: 38 },
  { name: "London", x: 48, y: 30, count: 29 },
  { name: "Bangkok", x: 76, y: 52, count: 22 },
  { name: "Sydney", x: 88, y: 72, count: 15 },
  { name: "São Paulo", x: 34, y: 68, count: 11 },
  { name: "Cairo", x: 54, y: 44, count: 8 },
];

const REACH = { walks: 1284, complete: 762, saved: 431 };
const RHYTHM = Array.from({ length: 24 }, (_, i) => Math.round(30 + Math.sin(i * 0.5) * 25 + Math.cos(i * 0.3) * 15));

export default function V4MemoryPulse() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("30D");
  const [source, setSource] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [running, setRunning] = useState(true);
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const stepRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      stepRef.current = (stepRef.current + 1) % 8;
      setStep(stepRef.current);
      setSelected(stepRef.current);
    }, 1150);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setRunning((r) => !r); }
      if (e.key === "r" || e.key === "R") { stepRef.current = 0; setStep(0); setSelected(0); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };
  const filteredBars = source ? BARS.filter((b) => b.source === source) : BARS;
  const maxBar = Math.max(...filteredBars.map((b) => b.value));
  const rhythmMax = Math.max(...RHYTHM);

  return (
    <main className="mp-stage">
      <div className="mp-shell">
        <div className="mp-artboard">
          <canvas className="mp-ambient" ref={(c) => { if (c) { const ctx = c.getContext("2d"); if (ctx) { c.width = 840; c.height = 990; const dots = Array.from({length:70},()=>({x:Math.random()*840,y:Math.random()*990,r:Math.random()*1.5+0.3,o:Math.random()*0.3+0.05,s:Math.random()*0.3+0.1})); const draw=()=>{ctx.clearRect(0,0,840,990);dots.forEach(d=>{d.y-=d.s;if(d.y<0)d.y=990;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,7);ctx.fillStyle=`rgba(167,108,255,${d.o})`;ctx.fill();});requestAnimationFrame(draw);};draw(); } } }} />
          <header className="mp-header">
            <div className="mp-brand">
              <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M14 2 C8 8 6 14 8 20 C10 18 12 16 14 14 C16 16 18 18 20 20 C22 14 20 8 14 2 Z" fill="none" stroke="#a76cff" strokeWidth="1.5"/><circle cx="14" cy="14" r="2" fill="#a76cff"/></svg>
              <div><b>LoveTree</b><small>MEMORY PULSE</small></div>
            </div>
            <div className="mp-periods">
              {PERIODS.map((p) => (
                <button key={p} className={`mp-period${period === p ? " is-active" : ""}`} onClick={() => { setPeriod(p); setRunning(false); showToast(`Period: ${p}`); }}>{p}</button>
              ))}
            </div>
          </header>

          <section className="mp-card mp-activity" aria-label="Activity">
            <small className="mp-kicker">ACTIVITY · {period}</small>
            <div className="mp-metric"><b>284</b><span className="mp-badge">+12%</span></div>
            <div className="mp-bars">
              {filteredBars.map((bar, i) => (
                <div key={i} className={`mp-bar${selected === i % 8 ? " is-active" : ""}`} style={{ height: `${(bar.value / maxBar) * 100}%` }} title={`${bar.value} · ${bar.source}`} onClick={() => { setSelected(i); setRunning(false); }} />
              ))}
            </div>
          </section>

          <section className="mp-card mp-world" aria-label="World">
            <small className="mp-kicker">WORLD · REACH</small>
            <svg viewBox="0 0 100 80" className="mp-map" aria-hidden="true">
              {REGIONS.map((r, i) => (
                <g key={r.name} className={`mp-region${selected === i ? " is-active" : ""}`} onClick={() => { setSelected(i); setRunning(false); }}>
                  <circle cx={r.x} cy={r.y} r={selected === i ? 2.5 : 1.5} fill={selected === i ? "#63f19a" : "#a76cff"} opacity="0.8" />
                  <circle cx={r.x} cy={r.y} r="4" fill="none" stroke={selected === i ? "#63f19a" : "#a76cff"} strokeWidth="0.3" opacity="0.3" />
                  {selected === i && <text x={r.x + 3} y={r.y + 1} fontSize="2.5" fill="#f4f1f7">{r.name} · {r.count}</text>}
                </g>
              ))}
            </svg>
          </section>

          <section className="mp-card mp-source" aria-label="Sources">
            <small className="mp-kicker">SOURCES</small>
            <div className="mp-chips">
              {SOURCES.map((s) => (
                <button key={s} className={`mp-chip${source === s ? " is-active" : ""}`} onClick={() => { setSource(source === s ? null : s); showToast(source === s ? "All sources" : `Filter: ${s}`); }} style={{ animationDelay: `${SOURCES.indexOf(s) * 0.15}s` }}>{s}</button>
              ))}
            </div>
          </section>

          <section className="mp-card mp-tree" aria-label="Current Tree">
            <small className="mp-kicker">CURRENT TREE</small>
            <div className="mp-tree-name">Felix · Season 03</div>
            <div className="mp-tree-count"><b>127</b><span>moments</span></div>
            <div className="mp-tree-pills">
              <span>14 branches</span><span>8 revisits</span><span>3 people</span><span>2 courses</span>
            </div>
          </section>

          <section className="mp-card mp-reach" aria-label="Reach">
            <small className="mp-kicker">REACH</small>
            <div className="mp-reach-grid">
              <div><b>{REACH.walks}</b><span>walks</span></div>
              <div><b>{REACH.complete}</b><span>complete</span></div>
              <div><b>{REACH.saved}</b><span>saved</span></div>
            </div>
          </section>

          <section className="mp-card mp-rhythm" aria-label="Rhythm">
            <small className="mp-kicker">RHYTHM · 24H</small>
            <svg viewBox="0 0 200 60" className="mp-rhythm-chart" aria-hidden="true">
              <path d={`M 0 ${60 - (RHYTHM[0] / rhythmMax) * 50} ${RHYTHM.map((v, i) => `L ${(i / 23) * 200} ${60 - (v / rhythmMax) * 50}`).join(" ")} L 200 60 L 0 60 Z`} fill="rgba(167,108,255,0.12)" />
              <path d={`M 0 ${60 - (RHYTHM[0] / rhythmMax) * 50} ${RHYTHM.map((v, i) => `L ${(i / 23) * 200} ${60 - (v / rhythmMax) * 50}`).join(" ")}`} fill="none" stroke="#a76cff" strokeWidth="1.5" />
              {selected !== null && <circle cx={(selected * 3 / 23) * 200} cy={60 - (RHYTHM[selected * 3 % 24] / rhythmMax) * 50} r="3" fill="#63f19a" />}
            </svg>
          </section>

          <div className="mp-statusbar">
            <span className={`mp-live${running ? " is-live" : ""}`} />
            <span>{running ? "LIVE" : "PAUSED"} · step {step + 1}/8</span>
            <span className="mp-spacer" />
            <span>LoveTree Memory Pulse</span>
          </div>

          {toast && <div className="mp-toast">{toast}</div>}
        </div>
      </div>
    </main>
  );
}
