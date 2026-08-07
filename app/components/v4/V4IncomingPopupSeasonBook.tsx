"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type BookState = "closed" | "cover" | "world" | "seed" | "tree" | "bloom";
type Theme = "archive" | "midnight" | "bloom";

interface Moment {
  id: string;
  index: number;
  title: string;
  feeling: string;
  relation: string;
  date: string;
  youtubeId: string;
  startSeconds: number;
  accent: string;
}

const STORAGE_KEY = "lovetree-popup-season-memory-book-v1";
const ACCENT_CYCLE = ["#d98191", "#7f9e83", "#72899a", "#c99a52", "#b27d95", "#8c9f73", "#7d94a4", "#d29a72", "#9a779a"];
const TITLE_BASE = [
  "The first clip I stopped for",
  "The voice I searched for again",
  "The stage I watched twice",
  "The next performance",
  "The interview that changed the feeling",
  "A quiet moment off stage",
  "The laugh I remembered",
  "The night the path became clear",
  "The Season I finally understood",
];
const FEELING_BASE = ["First spark", "Curiosity", "Revisit", "Anticipation", "Comfort", "Presence", "Warmth", "Attachment", "Reflection"];
const RELATION_BASE = [
  "I paused because the voice felt unfamiliar and impossible to ignore.",
  "I searched again to find the source of that low, steady tone.",
  "The first watch left a question, so I returned to the same stage.",
  "One performance made me wonder how the next one would feel.",
  "The words off stage changed the way I heard the performance.",
  "The quiet interval made the person behind the stage feel present.",
  "A small laugh stayed longer than the scene itself.",
  "The path between the moments finally felt like one story.",
  "Looking back, the whole Season became understandable.",
];

const ANGLES = [-72, -54, -36, -18, 0, 18, 36, 54, 72];
const LENGTHS = [168, 186, 202, 215, 226, 215, 202, 186, 168];

const CHAPTERS: Moment[][] = Array.from({ length: 3 }, (_, c) =>
  Array.from({ length: 9 }, (_, i) => ({
    id: `s03-c${c + 1}-m${i + 1}`,
    index: c * 9 + i + 1,
    title: c === 0 ? TITLE_BASE[i] : `${TITLE_BASE[i]} · Chapter ${String(c + 1).padStart(2, "0")}`,
    feeling: FEELING_BASE[(i + c * 2) % 9],
    relation: RELATION_BASE[(i + c) % 9],
    date: `2026.${String(3 + c).padStart(2, "0")}.${String(14 + i * 3).padStart(2, "0")}`,
    youtubeId: "M7lc1UVf-VE",
    startSeconds: (i * 11 + c * 7) % 95,
    accent: ACCENT_CYCLE[i],
  })),
);

function escapeHtml(s: string) {
  return String(s).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] as string));
}

interface SavedBookState {
  currentChapter?: number;
  bookTheme?: Theme;
}

function readSavedState(): SavedBookState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as SavedBookState;
    return data ?? {};
  } catch {
    return {};
  }
}

function initialChapter(): number {
  const saved = readSavedState();
  if (typeof saved.currentChapter === "number" && saved.currentChapter >= 0 && saved.currentChapter < CHAPTERS.length) {
    return saved.currentChapter;
  }
  return 0;
}

function initialTheme(): Theme {
  const saved = readSavedState();
  return saved.bookTheme === "midnight" || saved.bookTheme === "bloom" || saved.bookTheme === "archive" ? saved.bookTheme : "archive";
}

export default function V4IncomingPopupSeasonBook() {
  const [state, setState] = useState<BookState>("closed");
  const [chapter, setChapter] = useState(initialChapter);
  const [selected, setSelected] = useState<Moment | null>(null);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [toast, setToast] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoPaused, setDemoPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [modeBadge, setModeBadge] = useState("Normal mode");
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chapters = CHAPTERS;
  const moments = chapters[chapter];
  const isOpen = state !== "closed";

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setDemoRunning(false);
    setDemoPaused(false);
  };

  useEffect(() => () => clearTimers(), []);

  const notify = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      if (!demoPaused) fn();
    }, ms);
    timersRef.current.push(id);
  };

  const persist = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          seasonId: "season-03",
          currentChapter: chapter,
          selectedMomentId: selected?.id ?? null,
          bookTheme: theme,
          lastViewedAt: new Date().toISOString(),
        }),
      );
    } catch {
      /* sandboxed preview */
    }
  };

  const cue = (type: "paper" | "grow" | "bloom") => {
    if (!soundEnabled) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(type === "bloom" ? 520 : 280, now);
      osc.frequency.exponentialRampToValueAtTime(type === "bloom" ? 720 : 210, now + 0.28);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      /* audio unavailable */
    }
  };

  const setBookState = (next: BookState) => {
    setState(next);
    if (next === "cover" || next === "world" || next === "closed") cue("paper");
    if (next === "tree" || next === "bloom") cue(next === "bloom" ? "bloom" : "grow");
  };

  const openBook = ({ auto = false } = {}) => {
    if (state !== "closed") return;
    setBookState("cover");
    schedule(() => setBookState("world"), auto ? 1600 : 1350);
    schedule(() => setBookState("seed"), auto ? 3600 : 3000);
    schedule(() => setBookState("tree"), auto ? 5200 : 4300);
    schedule(() => setBookState("bloom"), auto ? 7200 : 5900);
  };

  const closeBook = ({ fast = false } = {}) => {
    setSelected(null);
    setVideoOpen(false);
    if (state === "closed") return;
    if (fast) {
      setBookState("closed");
    } else {
      setBookState("cover");
      setTimeout(() => setBookState("closed"), 980);
    }
    persist();
  };

  const runDemo = () => {
    clearTimers();
    setDemoRunning(true);
    setModeBadge("Reference demo · 12 s");
    setBookState("closed");
    schedule(() => setBookState("cover"), 900);
    schedule(() => setBookState("world"), 2100);
    schedule(() => setBookState("seed"), 4200);
    schedule(() => setBookState("tree"), 6100);
    schedule(() => setBookState("bloom"), 8200);
    schedule(() => closeBook({ fast: true }), 10300);
    schedule(() => {
      setDemoRunning(false);
      setModeBadge("Demo complete");
    }, 11550);
  };

  const togglePlay = () => {
    if (demoRunning) {
      clearTimers();
      setModeBadge("Demo paused");
      return;
    }
    runDemo();
  };

  const changeChapter = (dir: number) => {
    clearTimers();
    if (state !== "tree" && state !== "bloom") return;
    const next = chapter + dir;
    if (next < 0 || next >= chapters.length) return;
    setSelected(null);
    setBookState("seed");
    setTimeout(() => {
      setChapter(next);
      setBookState("tree");
      setTimeout(() => setBookState("bloom"), 1050);
    }, 420);
  };

  const selectMoment = (m: Moment) => {
    clearTimers();
    setSelected(m);
    persist();
  };

  const openVideo = () => {
    if (!selected) return;
    clearTimers();
    setVideoTitle(selected.title);
    setVideoOpen(true);
  };

  const closeVideo = () => setVideoOpen(false);

  const chooseTheme = (t: Theme) => {
    setTheme(t);
    setThemeMenuOpen(false);
    persist();
    notify(`${t.toUpperCase()} cover applied.`);
  };

  const doAction = (action: "save" | "share" | "course") => {
    persist();
    notify(action === "save" ? "This Season book has been saved." : action === "share" ? "A share preview has been prepared locally." : "Course opening preference has been saved.");
  };

  const chapterIndicator = `${String(chapter + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}`;

  const sceneCameraClass = useMemo(() => {
    if (state === "closed") return "";
    return " open";
  }, [state]);

  return (
    <div className={`incoming-seasonbook${isOpen ? " open" : ""}`} data-state={state} data-theme={theme} data-testid="incoming-popup-season-book">
      <div className="incoming-seasonbook-museum-blur" aria-hidden="true"><i className="frame-a"></i><i className="frame-b"></i><i className="cabinet"></i></div>
      <div className="incoming-seasonbook-ambient-light" aria-hidden="true"></div>
      <div className="incoming-seasonbook-dust" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} style={{ left: `${(i * 37) % 100}%`, top: `${20 + ((i * 53) % 70)}%`, animationDelay: `${-((i * 1.7) % 9)}s`, animationDuration: `${7 + (i % 8)}s` }} />
        ))}
      </div>

      <div className="incoming-seasonbook-top-brand"><span className="incoming-seasonbook-brand-mark">⌁</span><span>LoveTree Archive</span></div>
      <div className="incoming-seasonbook-mode-badge">{modeBadge}</div>
      <div className={`incoming-seasonbook-help${isOpen ? " fade" : ""}`}>Click the book · Space to open · R to replay</div>

      <div className="incoming-seasonbook-stage-wrap">
        <div className="incoming-seasonbook-display-plinth"></div>
        <div className={`incoming-seasonbook-scene-camera${sceneCameraClass}`}>
          <div className="incoming-seasonbook-book" role="button" tabIndex={0} aria-label={isOpen ? "Explore the open Season 03 memory book" : "Open Season 03 popup memory book"} onClick={() => { clearTimers(); if (state === "closed") openBook(); }}>
            <div className="incoming-seasonbook-half left">
              <div className="incoming-seasonbook-back-cover"></div>
              <div className="incoming-seasonbook-page-block"></div>
              <div className="incoming-seasonbook-page-surface"></div>
            </div>
            <div className="incoming-seasonbook-half right">
              <div className="incoming-seasonbook-back-cover"></div>
              <div className="incoming-seasonbook-page-block"></div>
              <div className="incoming-seasonbook-page-surface"></div>
            </div>
            <div className="incoming-seasonbook-turning-page"></div>
            <div className="incoming-seasonbook-turning-page"></div>
            <div className="incoming-seasonbook-turning-page"></div>
            <div className="incoming-seasonbook-spine"></div>

            <div className="incoming-seasonbook-front-cover">
              <div className="incoming-seasonbook-cover-face front">
                <div className="incoming-seasonbook-cover-corners"><i className="tl"></i><i className="tr"></i><i className="bl"></i><i className="br"></i></div>
                <div className="incoming-seasonbook-cover-print">
                  <div className="incoming-seasonbook-cover-kicker">LOVETREE ARCHIVE</div>
                  <svg className="incoming-seasonbook-cover-map" viewBox="0 0 220 120" aria-hidden="true">
                    <g fill="none" stroke="currentColor" strokeWidth="1.25" opacity="0.75">
                      <path d="M110 112 C108 86 107 70 110 52 C112 36 119 23 129 10" />
                      <path d="M110 70 C90 62 77 50 69 31" /><path d="M111 63 C133 58 151 44 164 26" /><path d="M108 83 C86 82 65 75 48 61" /><path d="M112 85 C137 84 161 77 181 62" />
                      <path d="M83 53 C70 46 59 42 46 43" /><path d="M139 51 C153 43 166 40 181 42" />
                    </g>
                    <g fill="#c9918f"><circle cx="69" cy="31" r="3.6" /><circle cx="164" cy="26" r="3.6" /><circle cx="48" cy="61" r="3.6" /><circle cx="181" cy="62" r="3.6" /></g>
                    <g fill="#8ca18a"><path d="M43 41q8-8 15 1q-8 7-15-1" /><path d="M176 40q8-8 15 1q-8 7-15-1" /></g>
                  </svg>
                  <div className="incoming-seasonbook-cover-title">FELIX<br />SEASON 03</div>
                  <div className="incoming-seasonbook-cover-sub">THE VOICE THAT STARTED EVERYTHING</div>
                  <div className="incoming-seasonbook-cover-count">27 MOMENTS · 3 CHAPTERS</div>
                </div>
              </div>
              <div className="incoming-seasonbook-cover-face inside"></div>
            </div>

            <div className="incoming-seasonbook-paper-world" aria-hidden="true">
              <div className="incoming-seasonbook-layer moon"><svg viewBox="0 0 180 180"><circle className="disc" cx="90" cy="90" r="76" /><ellipse className="mist" cx="62" cy="68" rx="34" ry="18" /><ellipse className="mist" cx="112" cy="112" rx="42" ry="22" /></svg></div>
              <div className="incoming-seasonbook-layer mountain-far"><svg viewBox="0 0 430 220"><path d="M0 220L0 171L46 130L81 144L128 76L166 107L220 20L270 104L311 72L350 126L390 103L430 152L430 220Z" fill="#a8a18c" stroke="#766c5e" strokeWidth="2" /></svg></div>
              <div className="incoming-seasonbook-layer mountain-left"><svg viewBox="0 0 310 235"><path d="M0 235L0 182L50 144L86 154L139 37L178 96L209 63L260 137L310 111L310 235Z" fill="#7f8f86" stroke="#66736d" strokeWidth="2" /></svg></div>
              <div className="incoming-seasonbook-layer mountain-right"><svg viewBox="0 0 320 242"><path d="M0 242L0 132L45 112L88 55L117 92L167 30L205 93L248 78L285 134L320 116L320 242Z" fill="#718696" stroke="#5f7180" strokeWidth="2" /></svg></div>
              <div className="incoming-seasonbook-layer hill-center"><svg viewBox="0 0 460 150"><path d="M0 150L0 118Q78 38 146 98Q223 16 302 95Q378 42 460 112L460 150Z" fill="#8fa087" stroke="#6f7e6a" strokeWidth="2" /></svg></div>
              <div className="incoming-seasonbook-layer forest-left"><svg viewBox="0 0 320 180"><path d="M84 180V30L59 83H75L52 121H74L56 158H112L93 121H116L93 83H110Z" fill="#435c4c" stroke="#304236" strokeWidth="1.6" /></svg></div>
              <div className="incoming-seasonbook-layer forest-right"><svg viewBox="0 0 320 180"><path d="M91 180V24L63 82H82L56 124H79L59 165H123L102 124H127L102 82H120Z" fill="#536855" stroke="#39493c" strokeWidth="1.6" /></svg></div>
              <div className="incoming-seasonbook-layer tree-left"><svg viewBox="0 0 170 185"><path d="M76 185Q66 122 82 78Q95 42 117 12" fill="none" stroke="#6c5642" strokeWidth="11" /><path d="M82 85Q52 55 18 54M87 67Q112 49 143 46M76 111Q48 95 20 103" fill="none" stroke="#6c5642" strokeWidth="7" /><g fill="#73856d"><circle cx="19" cy="51" r="28" /><circle cx="52" cy="43" r="31" /><circle cx="99" cy="33" r="32" /><circle cx="135" cy="44" r="27" /><circle cx="26" cy="102" r="24" /></g></svg></div>
              <div className="incoming-seasonbook-layer tree-right"><svg viewBox="0 0 170 185"><path d="M94 185Q105 125 89 80Q78 47 56 16" fill="none" stroke="#68523f" strokeWidth="11" /><path d="M88 89Q117 58 151 56M83 68Q56 52 27 49M95 114Q122 96 151 105" fill="none" stroke="#68523f" strokeWidth="7" /><g fill="#667c68"><circle cx="151" cy="53" r="28" /><circle cx="119" cy="44" r="31" /><circle cx="70" cy="36" r="32" /><circle cx="31" cy="47" r="27" /><circle cx="146" cy="104" r="24" /></g></svg></div>
              <div className="incoming-seasonbook-layer cloud-high"><svg viewBox="0 0 260 65"><path d="M2 52Q30 33 58 45Q76 10 112 37Q142 4 169 35Q207 19 228 43Q249 39 258 53Z" fill="#e4dcc9" stroke="#b8ab93" strokeWidth="2" /></svg></div>
              <div className="incoming-seasonbook-layer cloud-mid"><svg viewBox="0 0 300 76"><path d="M3 62Q37 38 70 51Q91 13 132 44Q166 3 198 42Q239 24 265 52Q287 47 298 63Z" fill="#ddd7c8" stroke="#a9a394" strokeWidth="2" /></svg></div>
              <div className="incoming-seasonbook-layer cloud-low"><svg viewBox="0 0 380 90"><path d="M4 73Q47 43 89 59Q116 13 166 51Q208 4 248 50Q299 28 333 61Q361 54 377 74Z" fill="#eee5d2" stroke="#bbb09c" strokeWidth="2" /></svg></div>
              <div className="incoming-seasonbook-layer path-layer"><svg viewBox="0 0 310 180"><path d="M128 180Q140 139 129 111Q117 76 156 47Q182 27 175 0H228Q214 34 185 55Q151 79 169 111Q186 142 180 180Z" fill="#cfb889" stroke="#a48861" strokeWidth="2" /><path d="M147 180Q153 139 145 108Q137 82 164 59" fill="none" stroke="#d98191" strokeWidth="3" strokeDasharray="3 10" opacity="0.7" /></svg></div>
              <div className="incoming-seasonbook-layer flowers"><svg viewBox="0 0 560 105"><g fill="#7f9e83" stroke="#556b58" strokeWidth="2"><path d="M42 105Q44 59 32 22M90 105Q88 63 102 29M456 105Q458 63 445 25M514 105Q510 64 526 34" fill="none" /></g><g fill="#d8939e"><circle cx="31" cy="22" r="12" /><circle cx="103" cy="29" r="13" /><circle cx="444" cy="25" r="13" /><circle cx="526" cy="34" r="12" /></g></svg></div>
              <div className="incoming-seasonbook-layer stones"><svg viewBox="0 0 640 100"><g fill="#9c907a" stroke="#6e6455" strokeWidth="2"><path d="M0 100L24 50L68 35L106 78L120 100Z" /><path d="M65 100L97 64L139 55L177 100Z" /><path d="M471 100L499 60L547 47L588 100Z" /><path d="M540 100L579 69L625 52L640 100Z" /></g><g fill="#b7aa92"><ellipse cx="205" cy="86" rx="35" ry="12" /><ellipse cx="427" cy="82" rx="30" ry="11" /></g></svg></div>
            </div>

            <div className="incoming-seasonbook-connection-glow"></div>
            <div className="incoming-seasonbook-seed-wrap"><div className="incoming-seasonbook-seed"></div></div>

            <div className="incoming-seasonbook-tree-paper">
              <svg className="incoming-seasonbook-root-svg" viewBox="0 0 210 135" aria-hidden="true">
                <path className="root-path" d="M106 126C85 118 68 125 45 132M104 125C126 116 145 122 174 132M105 126C95 111 85 103 69 98M106 126C116 109 131 103 149 96" />
                <path className="trunk-path" d="M106 126C102 97 106 70 103 42C101 24 106 15 109 2" />
              </svg>
              <div className="incoming-seasonbook-branch-layer">
                {moments.map((m, i) => (
                  <div
                    key={m.id}
                    className={`incoming-seasonbook-branch${selected?.id === m.id ? " is-selected" : ""}`}
                    data-id={m.id}
                    style={{ "--angle": `${ANGLES[i]}deg`, "--closed": `${ANGLES[i] * 0.18}deg`, "--length": `${LENGTHS[i]}px`, "--depth": `${(i % 3 - 1) * 7}px`, "--delay": `${(i * 0.085 + 0.05).toFixed(3)}s`, "--accent": m.accent, "--twig": `${i % 2 ? 28 : -28}deg` } as CSSProperties}
                  >
                    <div className="incoming-seasonbook-paper-branch"><span className="incoming-seasonbook-twig"></span></div>
                    <button className="incoming-seasonbook-moment-bloom" type="button" aria-label={`Open Moment ${m.index}: ${escapeHtml(m.title)}`} onClick={(e) => { e.stopPropagation(); selectMoment(m); }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="incoming-seasonbook-season-inscription">
              <strong>SEASON 03</strong>
              <span>THE VOICE THAT STARTED EVERYTHING · {moments.length} MOMENTS IN THIS CHAPTER</span>
            </div>

            <div className="incoming-seasonbook-page-print">
              <button className="incoming-seasonbook-chapter-btn" type="button" disabled={chapter === 0} onClick={(e) => { e.stopPropagation(); changeChapter(-1); }}>← Previous chapter</button>
              <span className="incoming-seasonbook-chapter-indicator">{chapterIndicator}</span>
              <button className="incoming-seasonbook-chapter-btn" type="button" disabled={chapter === chapters.length - 1} onClick={(e) => { e.stopPropagation(); changeChapter(1); }}>Next chapter →</button>
            </div>
          </div>
        </div>
      </div>

      <button className="incoming-seasonbook-cover-switch" type="button" onClick={() => setThemeMenuOpen((o) => !o)}>Change cover</button>
      <div className={`incoming-seasonbook-theme-menu${themeMenuOpen ? " open" : ""}`} role="dialog" aria-label="Choose book cover theme">
        <h3>Choose a cover</h3>
        {(["archive", "midnight", "bloom"] as Theme[]).map((t) => (
          <button key={t} className={`incoming-seasonbook-theme-option${theme === t ? " active" : ""}`} data-theme={t} type="button" onClick={() => chooseTheme(t)}>
            <span className="incoming-seasonbook-swatch" style={{ background: t === "archive" ? "linear-gradient(135deg,#5c3f28,#2e1e15)" : t === "midnight" ? "linear-gradient(135deg,#23303f,#101722)" : "linear-gradient(135deg,#d6c8ad,#9a8269)" }} />
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="incoming-seasonbook-micro-actions">
        <button type="button" onClick={() => doAction("save")}>Save this book</button>
        <button type="button" onClick={() => doAction("share")}>Share season</button>
        <button type="button" onClick={() => doAction("course")}>Use as course opening</button>
      </div>

      <div className="incoming-seasonbook-controls" aria-label="Book controls">
        <button className="incoming-seasonbook-control-btn primary" type="button" hidden={isOpen} onClick={() => { clearTimers(); openBook(); }}>Open this Season</button>
        <button className="incoming-seasonbook-control-btn" type="button" hidden={!isOpen} onClick={() => { clearTimers(); closeBook(); }}>Close book</button>
        <button className="incoming-seasonbook-control-btn icon" type="button" aria-label="Play or pause" onClick={togglePlay}>{demoRunning ? "Ⅱ" : "▶"}</button>
        <button className="incoming-seasonbook-control-btn icon" type="button" aria-label="Replay demo" onClick={runDemo}>↻</button>
        <button className="incoming-seasonbook-control-btn" type="button" aria-pressed={soundEnabled} onClick={() => { setSoundEnabled((s) => !s); notify(soundEnabled ? "Sound muted." : "Soft paper and branch cues enabled."); }}>Sound {soundEnabled ? "on" : "off"}</button>
      </div>

      <aside className={`incoming-seasonbook-moment-card${selected ? " open" : ""}`} aria-hidden={!selected}>
        <button className="incoming-seasonbook-card-close" type="button" aria-label="Close moment card" onClick={() => setSelected(null)}>×</button>
        <div className="incoming-seasonbook-moment-thumb" style={{ "--accent": selected?.accent ?? "#d98191" } as CSSProperties}><span className="incoming-seasonbook-play-symbol">▶</span></div>
        <div className="incoming-seasonbook-moment-meta">{selected ? `Moment ${String(selected.index).padStart(2, "0")} · ${selected.date}` : ""}</div>
        <h2>{selected?.title ?? ""}</h2>
        <div className="incoming-seasonbook-feeling"><i style={{ background: selected?.accent }} />{selected?.feeling ?? ""}</div>
        <div className="incoming-seasonbook-relation">{selected?.relation ?? ""}</div>
        <button className="incoming-seasonbook-play-btn" type="button" onClick={openVideo}>Play this Moment</button>
      </aside>

      <div className={`incoming-seasonbook-video-modal${videoOpen ? " open" : ""}`} role="dialog" aria-modal="true" aria-hidden={!videoOpen} aria-label="Moment video player" onClick={(e) => { if (e.target === e.currentTarget) closeVideo(); }}>
        <div className="incoming-seasonbook-video-paper">
          <div className="incoming-seasonbook-video-frame">
            {videoOpen && selected ? (
              <iframe title={escapeHtml(videoTitle)} src={`https://www.youtube.com/embed/${selected.youtubeId}?autoplay=1&playsinline=1&rel=0&start=${selected.startSeconds}`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            ) : null}
          </div>
          <div className="incoming-seasonbook-video-caption"><h3>{videoTitle}</h3><button className="incoming-seasonbook-video-close" type="button" onClick={closeVideo}>Return to the book</button></div>
        </div>
      </div>

      <div className={`incoming-seasonbook-toast${toast ? " show" : ""}`}>{toast ?? ""}</div>
    </div>
  );
}
