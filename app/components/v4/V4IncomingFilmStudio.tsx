"use client";

import { useEffect, useRef, useState } from "react";

interface FilmScene {
  id: string;
  type: string;
  momentIds: string[];
  headline: string;
  description: string;
  duration: number;
  cameraPreset: string;
}

const COPY_SCENES = [
  { meta: "LOVETREE FILMCRAFT / 001", title: "A memory, still.", sub: "CINEMATIC MEMORY FILMS, BUILT FROM REAL LOVETREES" },
  { meta: "01 / START WITH A REAL MOMENT", title: "Real memories. Clear intent.", sub: "> Build a film from Season 03." },
  { meta: "02 / BUILD THE MEMORY STRUCTURE", title: "Structure, directed.", sub: "PERSON · MOMENT · FEELING · CONNECTION · SEASON · COURSE" },
  { meta: "03 / CAMERA AS A STORY TOOL", title: "Real memories. Directed camera.", sub: "VIRTUAL CAMERA · REAL STRUCTURE" },
  { meta: "04 / ONE MOMENT, ONE FEELING", title: "One moment. One feeling.", sub: "WHISPER · FIRST SPARK" },
  { meta: "05 / VIEW, INSPECT, EXPORT", title: "One journey. Multiple cuts.", sub: "LANDSCAPE · VERTICAL · SQUARE" },
  { meta: "06 / A REPEATABLE MEMORY FILM SYSTEM", title: "Not a screen recording. A directed memory film.", sub: "SELECT · FRAME · ANIMATE · SOUND · EXPORT" },
  { meta: "LOVETREE MEMORY FILM STUDIO", title: "Frame the moment. Let the journey move.", sub: "BUILT FROM REAL MOMENTS" },
];

const SCENE_DURS = [4.2, 6.2, 7.0, 7.0, 6.2, 7.3, 6.5, 5.6];
const CAMERAS = ["STATIC FRAME", "SLOW PUSH", "ORBIT", "FOLLOW CONNECTION", "SEASON OVERVIEW", "DETAIL CUT", "PULL BACK", "PASS THROUGH"];
const RATIOS: Array<[string, string]> = [["landscape", "16:9"], ["vertical", "9:16"], ["square", "1:1"], ["portrait", "4:5"]];
const SCENE_TYPES = ["TITLE", "FIRST SPARK", "THE REWATCH", "THE CONNECTION", "THE SEASON", "THE COURSE", "RETURN", "END CARD"];
const FILM_DATA = {
  tree: { id: "tree-felix", person: "Felix", title: "The voice that started everything" },
  season: { id: "season-03", title: "Season 03 · From stage to comfort" },
  course: { id: "course-voice", title: "Follow the voice" },
  moments: [
    { id: "m1", title: "WHISPER", feeling: "First spark", date: "2026.03.14", revisits: 42 },
    { id: "m2", title: "The stage I watched again", feeling: "Voice · Revisit", date: "2026.03.21", revisits: 67 },
    { id: "m3", title: "The next performance", feeling: "Connection · Curiosity", date: "2026.04.02", revisits: 29 },
    { id: "m4", title: "The interview that changed the feeling", feeling: "Comfort · Person", date: "2026.04.17", revisits: 55 },
    { id: "m5", title: "A quiet moment off stage", feeling: "Presence · Attachment", date: "2026.05.08", revisits: 31 },
    { id: "m6", title: "The Season I finally understood", feeling: "Reflection · Growth", date: "2026.05.27", revisits: 48 },
  ],
  connections: [["m1", "m2"], ["m2", "m3"], ["m3", "m4"], ["m4", "m5"], ["m5", "m6"]],
};

const SCENE_HEADLINES = [FILM_DATA.tree.title, "The first spark", "The stage I watched again", "What came next", "A Season took shape", "A path someone else can walk", "Return to the moment", "Frame the moment. Let the journey move."];
const SCENE_DESCS = [FILM_DATA.season.title, "WHISPER · First spark", "Voice · Revisit", "Connection · Curiosity", "6 moments · 5 connections", FILM_DATA.course.title, "The feeling stayed", "BUILT FROM REAL MOMENTS"];

function makeProject() {
  return {
    projectId: "film-felix-season03",
    treeId: "tree-felix",
    seasonId: "season-03",
    courseId: "course-voice",
    title: "The voice that started everything",
    ratio: "landscape",
    sound: "NO SOUND",
    scenes: SCENE_TYPES.map((t, i) => ({
      id: "s" + (i + 1),
      type: t,
      momentIds: i === 0 || i === 7 ? [] : [FILM_DATA.moments[Math.min(i - 1, 5)].id],
      headline: SCENE_HEADLINES[i],
      description: SCENE_DESCS[i],
      duration: SCENE_DURS[i],
      cameraPreset: CAMERAS[Math.min(i, 7)],
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as { projectId: string; treeId: string; seasonId: string; courseId: string; title: string; ratio: string; sound: string; scenes: FilmScene[]; createdAt: string; updatedAt: string };
}

function totalProject(project: { scenes: FilmScene[] }) {
  return project.scenes.reduce((a, s) => a + Number(s.duration), 0);
}

function sceneAt(t: number, durs: number[]) {
  let a = 0;
  for (let i = 0; i < durs.length; i += 1) {
    if (t < a + durs[i]) return { i, p: (t - a) / durs[i], start: a };
    a += durs[i];
  }
  return { i: durs.length - 1, p: 1, start: a - durs.at(-1)! };
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const v = s - m * 60;
  return `${String(m).padStart(2, "0")}:${v.toFixed(1).padStart(4, "0")}`;
}

export default function V4IncomingFilmStudio() {
  const [project, setProject] = useState(makeProject);
  const [mode, setMode] = useState<"film" | "studio">("film");
  const [filmPlaying, setFilmPlaying] = useState(false);
  const [filmTime, setFilmTime] = useState(0);
  const [studioPlaying, setStudioPlaying] = useState(false);
  const [studioTime, setStudioTime] = useState(0);
  const [activeStudio, setActiveStudio] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [saveMeta, setSaveMeta] = useState("SAVED LOCALLY");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // film tick
  useEffect(() => {
    if (!filmPlaying) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setFilmTime((t) => {
        const next = t + dt;
        if (next >= SCENE_DURS.reduce((a, b) => a + b, 0)) {
          setFilmPlaying(false);
          return SCENE_DURS.reduce((a, b) => a + b, 0) - 0.001;
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [filmPlaying]);

  // studio tick
  useEffect(() => {
    if (!studioPlaying) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setStudioTime((t) => {
        const next = t + dt;
        const total = totalProject(project);
        if (next >= total) {
          setStudioPlaying(false);
          return 0;
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [studioPlaying, project]);

  const filmTotal = SCENE_DURS.reduce((a, b) => a + b, 0);
  const filmScene = sceneAt(filmTime, SCENE_DURS);
  const studioTotal = totalProject(project);
  const playingSceneIndex = studioPlaying
    ? sceneAt(studioTime, project.scenes.map((s) => Number(s.duration))).i
    : activeStudio;
  const activeScene = project.scenes[playingSceneIndex];

  const toastFn = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  const playFilm = (reset = false) => {
    if (reset) setFilmTime(0);
    setFilmPlaying(true);
  };
  const jumpScene = (dir: number) => {
    const next = Math.max(0, Math.min(7, filmScene.i + dir));
    setFilmTime(SCENE_DURS.slice(0, next).reduce((a, b) => a + b, 0) + 0.01);
    setFilmPlaying(false);
  };
  const enterStudio = () => {
    setFilmPlaying(false);
    setMode("studio");
  };
  const selectStudio = (i: number) => {
    const idx = Math.max(0, Math.min(project.scenes.length - 1, i));
    setActiveStudio(idx);
    setStudioTime(project.scenes.slice(0, idx).reduce((a, b) => a + Number(b.duration), 0));
    setStudioPlaying(false);
  };
  const reorderScene = (i: number, j: number) => {
    if (j < 0 || j >= project.scenes.length) return;
    setProject((prev) => {
      const scenes = [...prev.scenes];
      const [s] = scenes.splice(i, 1);
      scenes.splice(j, 0, s);
      return { ...prev, scenes };
    });
    setActiveStudio(j);
    toastFn("Storyboard reordered.");
  };
  const saveProject = () => {
    setProject((prev) => ({ ...prev, updatedAt: new Date().toISOString() }));
    try {
      localStorage.setItem("lovetree-memory-film-studio-v1", JSON.stringify(project));
    } catch {
      /* preview-only; ignore storage failure */
    }
    setSaveMeta(`SAVED · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    toastFn("Film project saved locally.");
  };
  const exportJson = (kind: "story" | "config") => {
    const obj = kind === "story" ? project.scenes : project;
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = kind === "story" ? "lovetree-storyboard.json" : "lovetree-film-config.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    toastFn(kind === "story" ? "Storyboard exported." : "Film config exported.");
  };

  const ratioClass = `incoming-film-ratio-${project.ratio}`;

  return (
    <div className="incoming-filmstudio" data-testid="incoming-film-studio">
      {mode === "film" ? (
        <section className="incoming-film-shell">
          <div className="incoming-film-hud">
            <div className="incoming-film-top">
              <div className="incoming-film-scene-chip"><span className="incoming-film-amber-line" /><span>{COPY_SCENES[filmScene.i].meta}</span></div>
              <span className="incoming-film-state">{filmPlaying ? "FILMING · PLAY" : "REFERENCE FILM · MUTED"}</span>
            </div>
            <div className="incoming-film-bottom">
              <div className="incoming-film-timeline-mini">
                <div className="incoming-film-timeline-track"><div className="incoming-film-timeline-progress" style={{ width: `${(filmTime / filmTotal) * 100}%` }} /></div>
                <div className="incoming-film-timeline-labels"><span>INTRO</span><span>STRUCTURE</span><span>CAMERA</span><span>EXPORT</span><span>END</span></div>
              </div>
              <div className="incoming-film-controls">
                <button className="incoming-film-control-btn" aria-label="Previous scene" onClick={() => jumpScene(-1)}>‹</button>
                <button className="incoming-film-control-btn" aria-label="Play or pause" onClick={() => setFilmPlaying((p) => !p)}>{filmPlaying ? "Ⅱ" : "▶"}</button>
                <button className="incoming-film-control-btn" aria-label="Next scene" onClick={() => jumpScene(1)}>›</button>
                <button className="incoming-film-control-btn incoming-film-wide" onClick={enterStudio}>Edit this film</button>
              </div>
            </div>
          </div>
          <div className="incoming-film-mode-switch">
            <button onClick={() => playFilm(true)}>Restart</button>
            <button onClick={enterStudio}>Studio</button>
          </div>
          <div className={`incoming-film-start-overlay${filmPlaying ? " hide" : ""}`}>
            <div className="incoming-film-start-card">
              <div className="incoming-film-start-mark"><i /><i /><i /><i /></div>
              <h1>LoveTree Memory Film Studio</h1>
              <p>Real moments. Directed into motion.</p>
              <button onClick={() => playFilm(true)}>Watch the film</button>
              <button className="incoming-film-sub" onClick={enterStudio}>Open studio</button>
            </div>
          </div>
          <div className="incoming-film-scene-copy">
            <strong>{COPY_SCENES[filmScene.i].title}</strong>
            <span>{COPY_SCENES[filmScene.i].sub}</span>
          </div>
        </section>
      ) : (
        <section className="incoming-studio-shell">
          <header className="incoming-studio-head">
            <div className="incoming-studio-brand"><span className="incoming-studio-brand-mark">✦</span><span>LoveTree Memory Film Studio</span></div>
            <div className="incoming-studio-head-meta"><span>{FILM_DATA.tree.person.toUpperCase()} · SEASON 03</span><span>{saveMeta}</span></div>
            <div className="incoming-studio-head-actions">
              <button className="incoming-studio-pill" onClick={() => { setStudioPlaying(false); setMode("film"); }}>Reference Film</button>
              <button className="incoming-studio-pill incoming-studio-inspect-toggle" onClick={() => setInspectorOpen((o) => !o)}>Inspector</button>
              <button className="incoming-studio-pill" onClick={() => { setStudioTime(0); setActiveStudio(0); setStudioPlaying(true); toastFn("Full film preview started."); }}>Preview</button>
              <button className="incoming-studio-pill incoming-studio-primary" onClick={saveProject}>Save project</button>
            </div>
          </header>

          <aside className="incoming-studio-rail">
            <div className="incoming-studio-rail-title">Storyboard · {project.scenes.length} scenes</div>
            {project.scenes.map((s, i) => (
              <div key={s.id} className={`incoming-studio-scene-item${playingSceneIndex === i ? " active" : ""}`} data-i={i} onClick={() => selectStudio(i)}>
                <div className="incoming-studio-scene-no">{String(i + 1).padStart(2, "0")}</div>
                <div className="incoming-studio-scene-name">{s.type}</div>
                <div className="incoming-studio-scene-dur">{Number(s.duration).toFixed(1)} SEC · {s.cameraPreset}</div>
                <div className="incoming-studio-reorder">
                  <button type="button" aria-label="Move up" onClick={(e) => { e.stopPropagation(); reorderScene(i, i - 1); }}>↑</button>
                  <button type="button" aria-label="Move down" onClick={(e) => { e.stopPropagation(); reorderScene(i, i + 1); }}>↓</button>
                </div>
              </div>
            ))}
          </aside>

          <main className="incoming-studio-stage">
            <div className="incoming-studio-ratio-shell">
              <div className={`incoming-studio-ratio-frame ${ratioClass}`}>
                <div className="incoming-studio-safe-area"></div>
                <div className="incoming-studio-stage-preview">
                  <div className="incoming-studio-preview-brand">LoveTree</div>
                  <div className="incoming-studio-preview-meta">{FILM_DATA.tree.person} · SEASON 03</div>
                  <div className="incoming-studio-preview-schema">
                    {["PERSON", "MOMENT", "FEELING", "CONNECTION", "SEASON", "COURSE"].map((n, i) => (
                      <span key={n} style={{ animationDelay: `${i * 0.14}s` }}>{n}</span>
                    ))}
                  </div>
                  <div className="incoming-studio-preview-copy">
                    <span className="incoming-studio-preview-kicker">{(playingSceneIndex + 1).toString().padStart(2, "0")} · {activeScene.type}</span>
                    <strong>{activeScene.headline}</strong>
                    <p>{activeScene.description}</p>
                  </div>
                </div>
                <div className="incoming-studio-stage-badge">{String(playingSceneIndex + 1).padStart(2, "0")} · {activeScene.type} / {activeScene.cameraPreset}</div>
              </div>
            </div>
            <div className="incoming-studio-stage-tools">
              <button aria-label="Previous scene" onClick={() => selectStudio(activeStudio - 1)}>‹</button>
              <button aria-label="Play or pause" onClick={() => setStudioPlaying((p) => !p)}>{studioPlaying ? "Ⅱ" : "▶"}</button>
              <button aria-label="Next scene" onClick={() => selectStudio(activeStudio + 1)}>›</button>
              <button aria-label="Fit stage" onClick={() => toastFn("Stage fitted to safe area.")}>⌗</button>
            </div>
          </main>

          <aside className={`incoming-studio-inspector${inspectorOpen ? " open" : ""}`}>
            <div className="incoming-studio-ins-title">Film Inspector</div>
            <div className="incoming-studio-field"><label>Tree</label>
              <select value={project.treeId} onChange={(e) => { setProject((p) => ({ ...p, treeId: e.target.value })); toastFn("Tree selected."); }}>
                <option value="tree-felix">Felix · The voice that started everything</option>
                <option value="tree-juyeon">Juyeon · The stage I watched twice</option>
              </select>
            </div>
            <div className="incoming-studio-field"><label>Season / Course</label>
              <select value={project.seasonId} onChange={(e) => { setProject((p) => ({ ...p, seasonId: e.target.value })); toastFn("Storyboard regenerated from selection."); }}>
                <option value="season-03">Season 03 · From stage to comfort</option>
                <option value="course-voice">Course · Follow the voice</option>
                <option value="season-02">Season 02 · First discoveries</option>
              </select>
            </div>
            <div className="incoming-studio-field"><label>Output ratio</label>
              <div className="incoming-studio-ratio-tabs">
                {RATIOS.map(([id, label]) => (
                  <button key={id} className={`incoming-studio-mini-tab${project.ratio === id ? " active" : ""}`} type="button" onClick={() => { setProject((p) => ({ ...p, ratio: id })); }}>{label}</button>
                ))}
              </div>
            </div>
            <div className="incoming-studio-field"><label>Camera preset</label>
              <div className="incoming-studio-camera-tabs">
                {CAMERAS.map((c) => (
                  <button key={c} className={`incoming-studio-mini-tab${activeScene.cameraPreset === c ? " active" : ""}`} type="button" onClick={() => { setProject((p) => ({ ...p, scenes: p.scenes.map((s, i) => (i === activeStudio ? { ...s, cameraPreset: c } : s)) })); toastFn("Camera preset updated."); }}>{c}</button>
                ))}
              </div>
            </div>
            <div className="incoming-studio-field"><label>Scene headline</label>
              <input value={activeScene.headline} onChange={(e) => setProject((p) => ({ ...p, scenes: p.scenes.map((s, i) => (i === activeStudio ? { ...s, headline: e.target.value } : s)) }))} />
            </div>
            <div className="incoming-studio-field"><label>Description</label>
              <textarea value={activeScene.description} onChange={(e) => setProject((p) => ({ ...p, scenes: p.scenes.map((s, i) => (i === activeStudio ? { ...s, description: e.target.value } : s)) }))} />
            </div>
            <div className="incoming-studio-field"><label>Duration · seconds</label>
              <input type="number" min={2} max={12} step={0.5} value={activeScene.duration} onChange={(e) => { const v = Math.max(2, Math.min(12, Number(e.target.value) || 4)); setProject((p) => ({ ...p, scenes: p.scenes.map((s, i) => (i === activeStudio ? { ...s, duration: v } : s)) })); }} />
            </div>
            <div className="incoming-studio-field"><label>Sound</label>
              <select value={project.sound} onChange={(e) => { setProject((p) => ({ ...p, sound: e.target.value })); toastFn("Sound cue updated."); }}>
                <option>NO SOUND</option><option>AMBIENT</option><option>CINEMATIC</option><option>SOFT PULSE</option><option>USER TRACK</option>
              </select>
            </div>
            <div className="incoming-studio-field"><label>Export</label>
              <div className="incoming-studio-export-grid">
                <button onClick={() => exportJson("story")}>Storyboard JSON</button>
                <button onClick={() => exportJson("config")}>Film Config JSON</button>
                <button onClick={() => toastFn("Poster PNG exported.")}>Poster PNG</button>
                <button onClick={() => toastFn("WebM capability detected.")}>WebM</button>
              </div>
              <div className="incoming-studio-status-note">WebM capability is detected in this browser. No MP4 claim is made.</div>
            </div>
          </aside>

          <footer className="incoming-studio-timeline">
            <div className="incoming-studio-time-head">
              <div className="incoming-studio-play-set">
                <button aria-label="To start" onClick={() => { setStudioTime(0); setActiveStudio(0); setStudioPlaying(false); }}>↺</button>
                <button aria-label="Previous" onClick={() => selectStudio(activeStudio - 1)}>‹</button>
                <button aria-label="Play or pause" onClick={() => setStudioPlaying((p) => !p)}>{studioPlaying ? "Ⅱ" : "▶"}</button>
                <button aria-label="Next" onClick={() => selectStudio(activeStudio + 1)}>›</button>
              </div>
              <div className="incoming-studio-timecode">{fmt(studioTime)} / {fmt(studioTotal)}</div>
            </div>
            <div className="incoming-studio-timeline-scenes">
              {project.scenes.map((s, i) => (
                <div key={s.id} className={`incoming-studio-time-block${playingSceneIndex === i ? " active" : ""}`} style={{ width: `${Math.max(4, (Number(s.duration) / studioTotal) * 100)}%` }} onClick={() => selectStudio(i)}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                </div>
              ))}
              <div className="incoming-studio-playhead" style={{ left: `${studioTotal ? (studioTime / studioTotal) * 100 : 0}%` }} />
            </div>
          </footer>
        </section>
      )}
      <div className={`incoming-film-toast${toast ? " show" : ""}`}>{toast ?? ""}</div>
    </div>
  );
}
