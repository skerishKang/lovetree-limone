"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../../styles/v4/video-tearoff-memory-pad.css";

export const VTP_SOURCE = "lovetree-video-tearoff-memory-pad-v1.html";
export const VTP_KEY = "lovetree-video-tearoff-memory-pad-v1";
export const VTP_ROUTE = "/v4/labs/video-tearoff-memory-pad";

/* ------------------------------------------------------------------ */
/* V4 demo data — static prototype from the source HTML. All numbers,  */
/* names, dates and video ids are source demo values. Nothing connects */
/* to DB/API. Interaction-state is localStorage demo persistence only. */
/* ------------------------------------------------------------------ */

export interface VtpMoment {
  id: string;
  day: string;
  date: string;
  title: string;
  note: string;
  source: string;
}

export interface VtpPerson {
  key: string;
  name: string;
  latin: string;
  accent: string;
  soft: string;
  moments: VtpMoment[];
}

export const VTP_PEOPLE: Record<string, Omit<VtpPerson, "key">> = {
  felix: {
    name: "필릭스",
    latin: "FELIX",
    accent: "#d77e91",
    soft: "#f5dde3",
    moments: [
      { id: "nOrDWTMSR0w", day: "01", date: "2026 · AUG · MEMORY 01", title: "처음 마음을 멈추게 한 무대", note: "낮게 울리는 목소리와 강한 눈빛을 처음 오래 바라본 순간.", source: "STRAY KIDS · GOD'S MENU" },
      { id: "ts_xlXdsl4M", day: "02", date: "2026 · AUG · MEMORY 02", title: "계속 다시 보게 된 장면", note: "짧게 지나가도 이상하게 다시 돌아오게 되는 움직임.", source: "FELIX · BACK DOOR" },
      { id: "IaWoxBn4kDo", day: "03", date: "2026 · AUG · MEMORY 03", title: "표정이 바뀌는 찰나", note: "무대 한가운데서 분위기가 완전히 달라진 그 몇 초.", source: "FELIX · EASY" },
      { id: "sFPKeBPdFZ8", day: "04", date: "2026 · AUG · MEMORY 04", title: "웃는 모습까지 좋아진 날", note: "무대 밖의 장난스러운 결까지 기억하고 싶어진 순간.", source: "FELIX · RELAY DANCE" },
    ],
  },
  juyeon: {
    name: "이주연",
    latin: "JUYEON",
    accent: "#c86278",
    soft: "#f3d7dc",
    moments: [
      { id: "qKkJ6YHLhak", day: "01", date: "2026 · AUG · MEMORY 01", title: "WHISPER로 시작된 마음", note: "정확한 동작과 부드러운 선을 자꾸 다시 보게 된 날.", source: "THE BOYZ · WHISPER" },
      { id: "ePAi-0qKEio", day: "02", date: "2026 · AUG · MEMORY 02", title: "한 사람의 춤에 빠진 순간", note: "무대가 아니라 한 편의 이야기처럼 남은 퍼포먼스.", source: "JUYEON · ARTIST OF THE MONTH" },
      { id: "93jg1vU4R5I", day: "03", date: "2026 · AUG · MEMORY 03", title: "여름빛 무대의 기억", note: "밝은 표정과 리듬이 오래 마음에 남았던 직캠.", source: "JUYEON · PASSION FRUIT" },
      { id: "9I7Au-q7eH8", day: "04", date: "2026 · AUG · MEMORY 04", title: "무대 밖의 다정한 결", note: "프로 아이돌의 하루를 따라가며 더 좋아지게 된 장면.", source: "JUYEON · BOYLOG" },
    ],
  },
  junhyuk: {
    name: "이준혁",
    latin: "LEE JUN HYUK",
    accent: "#799988",
    soft: "#dceae2",
    moments: [
      { id: "a1gsq3jC0Tg", day: "01", date: "2026 · AUG · MEMORY 01", title: "말투가 좋아진 인터뷰", note: "조용히 답하는 방식에서 예상 밖의 귀여움을 발견한 날.", source: "LEE JUN HYUK · INTERVIEW" },
      { id: "O3ptaX7-G8w", day: "02", date: "2026 · AUG · MEMORY 02", title: "윙크하고 사라진 순간", note: "짧아서 더 오래 기억에 남은 장난스러운 한 장면.", source: "LEE JUN HYUK · MOMENT" },
      { id: "-uYx6joIm0g", day: "03", date: "2026 · AUG · MEMORY 03", title: "서동재의 선명한 인상", note: "수트와 표정만으로 장면의 공기를 바꾸었던 기억.", source: "LEE JUN HYUK · CHARACTER" },
      { id: "kUobSk5oe_U", day: "04", date: "2026 · AUG · MEMORY 04", title: "잘생긴 빌런이라는 말", note: "무대인사에서 웃는 얼굴까지 이어서 보게 된 날.", source: "LEE JUN HYUK · STAGE GREETING" },
    ],
  },
};

export const VTP_ROWS = 14;
export const VTP_STORAGE_KEY = "lovetree-video-tearoff-memory-pad-v1";

export function vtpThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

interface VtpArchived {
  person: string;
  personName: string;
  accent: string;
  index: number;
  moment: VtpMoment;
}

interface VtpDrag {
  startX: number;
  startY: number;
}

interface VtpFlyer {
  left: number;
  top: number;
  width: number;
  height: number;
  flyX: number;
  flyY: number;
  flyR: string;
  person: Omit<VtpPerson, "key">;
  moment: VtpMoment;
}

interface VtpPlayer {
  personName: string;
  title: string;
  id: string;
}

const STRIP_OVERLAP = 0.11;

function stripClip(row: number): { top: string; bottom: string; origin: string } {
  const overlap = STRIP_OVERLAP;
  const top = Math.max(0, (row / VTP_ROWS) * 100 - overlap);
  const bottom = Math.max(0, ((VTP_ROWS - row - 1) / VTP_ROWS) * 100 - overlap);
  const origin = ((row + 0.5) / VTP_ROWS) * 100;
  return { top: `${top}%`, bottom: `${bottom}%`, origin: `${origin}%` };
}

function stripTransform(row: number, dx: number, dy: number, progress: number, side: number): string {
  const t = row / (VTP_ROWS - 1);
  const hinge = Math.pow(t, 1.52);
  const bulge = Math.sin(t * Math.PI);
  const tx = dx * hinge + side * bulge * progress * 13;
  const ty = dy * hinge - bulge * progress * 7;
  const rz = dx * 0.038 * hinge + side * bulge * progress * 1.5;
  const skew = side * bulge * progress * 1.1;
  const scale = 1 - bulge * progress * 0.025;
  return `translate3d(${tx}px, ${ty}px, ${bulge * progress * 18}px) rotateZ(${rz}deg) rotateX(${-bulge * progress * 7}deg) skewX(${skew}deg) scaleX(${scale})`;
}

function stripFilter(progress: number): string {
  const ds = Math.max(0, progress * 4);
  return `brightness(${1 - 0.045 * Math.sin(progress * Math.PI)}) drop-shadow(0 ${ds}px ${2 + progress * 5}px rgba(70,52,44,${0.04 + progress * 0.035}))`;
}

function reducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

interface VtpArchived {
  person: string;
  personName: string;
  accent: string;
  index: number;
  moment: VtpMoment;
}

interface VtpDrag {
  startX: number;
  startY: number;
}

interface VtpFlyer {
  left: number;
  top: number;
  width: number;
  height: number;
  flyX: number;
  flyY: number;
  flyR: string;
  person: Omit<VtpPerson, "key">;
  moment: VtpMoment;
}

interface VtpPlayer {
  personName: string;
  title: string;
  id: string;
}

export default function V4VideoTearoffMemoryPad() {
  const [person, setPerson] = useState("felix");
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flying, setFlying] = useState(false);
  const [mesh, setMesh] = useState<{ dx: number; dy: number; progress: number; grabRatio: number }>({
    dx: 0,
    dy: 0,
    progress: 0,
    grabRatio: 0.5,
  });
  const [broken, setBroken] = useState<boolean[]>(Array(11).fill(false));
  const [archived, setArchived] = useState<VtpArchived[]>([]);
  const [flyer, setFlyer] = useState<VtpFlyer | null>(null);
  const [player, setPlayer] = useState<VtpPlayer | null>(null);
  const [toast, setToast] = useState("");
  const [announce, setAnnounce] = useState("");
  const [mounted, setMounted] = useState(false);

  const dragRef = useRef<VtpDrag>({ startX: 0, startY: 0 });
  const meshRef = useRef(mesh);
  const flyingRef = useRef(flying);
  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoHitRef = useRef<HTMLButtonElement>(null);
  const tearCueRef = useRef<HTMLDivElement>(null);
  const progressLineRef = useRef<HTMLDivElement>(null);
  const activeWrapRef = useRef<HTMLDivElement>(null);
  const archiveRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    meshRef.current = mesh;
    flyingRef.current = flying;
  });

  const currentSet = useCallback(() => VTP_PEOPLE[person], [person]);
  const currentMoment = useCallback(() => currentSet().moments[index] ?? null, [currentSet, index]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(VTP_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && Array.isArray(parsed.archived)) {
            setArchived(parsed.archived);
          }
        }
      } catch {
        /* ignore */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VTP_STORAGE_KEY, JSON.stringify({ archived }));
    } catch {
      /* ignore */
    }
  }, [archived]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const doAnnounce = useCallback((message: string) => {
    setAnnounce("");
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnounce(message), 20);
  }, []);

  const setBreaks = useCallback((progress: number, grabRatio: number) => {
    setBroken((prev) => {
      const center = Math.round(grabRatio * (prev.length - 1));
      return prev.map((_, i) => {
        const threshold = 0.16 + Math.abs(i - center) * 0.055;
        return progress > threshold;
      });
    });
  }, []);

  const updateMesh = useCallback(
    (dx: number, dy: number, progress: number, grabRatio: number) => {
      setMesh({ dx, dy, progress, grabRatio });
      setBreaks(progress, grabRatio);
      if (tearCueRef.current) {
        tearCueRef.current.style.opacity = String(Math.max(0, 1 - progress * 3.3));
      }
      if (progressLineRef.current) {
        progressLineRef.current.style.setProperty("--tear", `${Math.min(100, progress * 112)}%`);
      }
      const avg = 0.72;
      if (videoHitRef.current) {
        videoHitRef.current.style.transform = `translate3d(${dx * avg}px, ${dy * avg}px,0) rotate(${dx * 0.027}deg)`;
      }
    },
    [setBreaks],
  );

  const resetMesh = useCallback((immediate = false) => {
    const trans = immediate ? "none" : "transform .62s cubic-bezier(.2,.86,.26,1),filter .5s";
    stripRefs.current.forEach((s) => {
      if (s) {
        s.style.transition = trans;
        s.style.transform = "";
        s.style.filter = "";
      }
    });
    if (videoHitRef.current) {
      videoHitRef.current.style.transition = immediate ? "none" : "transform .62s cubic-bezier(.2,.86,.26,1)";
      videoHitRef.current.style.transform = "";
    }
    if (tearCueRef.current) tearCueRef.current.style.opacity = "1";
    if (progressLineRef.current) progressLineRef.current.style.setProperty("--tear", "0%");
    setBroken(Array(11).fill(false));
    setMesh({ dx: 0, dy: 0, progress: 0, grabRatio: 0.5 });
    if (!immediate) {
      setTimeout(() => {
        stripRefs.current.forEach((s) => {
          if (s) s.style.transition = "";
        });
        if (videoHitRef.current) videoHitRef.current.style.transition = "";
      }, 680);
    }
  }, []);

  const commitTear = useCallback(() => {
    const moment = currentMoment();
    if (!moment || flyingRef.current) return;
    setFlying(true);
    const pers = currentSet();
    const rect = activeWrapRef.current?.getBoundingClientRect();
    const trayRect = archiveRef.current?.getBoundingClientRect();
    if (!rect || !trayRect) {
      setIndex((i) => i + 1);
      setFlying(false);
      return;
    }
    const flyX = trayRect.left - rect.left + 35;
    const flyY = trayRect.top - rect.top + Math.min(210, archived.length * 24);
    const flyR = meshRef.current.dx >= 0 ? "14deg" : "-14deg";
    setFlyer({ left: rect.left, top: rect.top, width: rect.width, height: rect.height, flyX, flyY, flyR, person: pers, moment });
    setArchived((a) => [...a, { person, personName: pers.name, accent: pers.accent, index, moment }]);
    doAnnounce(`${moment.title}을 오늘의 기억으로 보관했어요.`);
    showToast("♥ 뜯은 영상이 기억함에 보관됐어요");
    setTimeout(() => { setIndex((i) => i + 1); resetMesh(true); }, 260);
    setTimeout(() => setFlyer(null), 1250);
    setTimeout(() => setFlying(false), 1300);
  }, [archived.length, currentMoment, currentSet, doAnnounce, index, person, resetMesh, showToast]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (flyingRef.current || !currentMoment() || e.button !== 0) return;
      if ((e.target as HTMLElement).closest(".vtp-video-hit")) return;
      dragRef.current = { startX: e.clientX, startY: e.clientY };
      setDragging(true);
      activeWrapRef.current?.classList.add("dragging");
      try { activeWrapRef.current?.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      e.preventDefault();
    },
    [currentMoment],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const { startX, startY } = dragRef.current;
      const dx = e.clientX - startX;
      let dy = e.clientY - startY;
      if (dy < 0) dy *= 0.18;
      const progress = Math.min(1.15, Math.max(0, (Math.max(0, dy) + Math.abs(dx) * 0.13) / 245));
      const rect = activeWrapRef.current?.getBoundingClientRect();
      const grabRatio = rect ? Math.max(0, Math.min(1, (startX - rect.left) / rect.width)) : 0.5;
      updateMesh(dx, dy, progress, grabRatio);
      e.preventDefault();
    },
    [dragging, updateMesh],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      setDragging(false);
      activeWrapRef.current?.classList.remove("dragging");
      try { activeWrapRef.current?.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      if (meshRef.current.progress >= 0.58) commitTear();
      else resetMesh();
    },
    [commitTear, dragging, resetMesh],
  );

  const autoTear = useCallback(() => {
    const moment = currentMoment();
    if (flyingRef.current || !moment) return;
    const direction = Math.random() > 0.5 ? 1 : -1;
    const rm = reducedMotion();
    const duration = rm ? 40 : 980;
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      updateMesh(direction * 38 * ease, 176 * ease, ease * 0.78, 0.62);
      if (t < 1) requestAnimationFrame(frame);
      else setTimeout(commitTear, 120);
    };
    requestAnimationFrame(frame);
  }, [commitTear, currentMoment, updateMesh]);

  const openVideo = useCallback(() => {
    const moment = currentMoment();
    if (!moment) return;
    setPlayer({ personName: currentSet().name, title: moment.title, id: moment.id });
  }, [currentMoment, currentSet]);

  const closeVideo = useCallback(() => setPlayer(null), []);

  const restoreArchive = useCallback(
    (archIndex: number) => {
      setArchived((a) => {
        const saved = a[archIndex];
        if (!saved) return a;
        setPerson(saved.person);
        setIndex(saved.index);
        doAnnounce(`${saved.moment.title}을 다시 펼쳤어요.`);
        return a.filter((_, i) => i !== archIndex);
      });
      showToast("선택한 기억을 다시 맨 위에 올렸어요");
    },
    [doAnnounce, showToast],
  );

  const restart = useCallback(() => { setIndex(0); resetMesh(true); }, [resetMesh]);

  const selectPerson = useCallback(
    (key: string) => {
      if (flyingRef.current) return;
      setPerson(key);
      setIndex(0);
      resetMesh(true);
      doAnnounce(`${VTP_PEOPLE[key].name}의 기억 패드를 열었어요.`);
    },
    [doAnnounce, resetMesh],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && player) closeVideo(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (announceTimer.current) clearTimeout(announceTimer.current);
    };
  }, [closeVideo, player]);

  const pers = currentSet();
  const moment = currentMoment();
  const next = pers.moments[index + 1] ?? null;
  const side = mesh.grabRatio < 0.5 ? -1 : 1;

  return (
    <main className="vtp-app">
      <i className="vtp-orb vtp-a" aria-hidden="true" />
      <i className="vtp-orb vtp-b" aria-hidden="true" />
      <header className="vtp-topbar">
        <a className="vtp-brand" href="#" aria-label="LoveTree" onClick={(e) => e.preventDefault()}>
          <span className="vtp-brand-mark"><i aria-hidden="true" /></span>
          <strong>러브트리</strong>
          <small>LoveTree</small>
        </a>
        <div className="vtp-top-note"><i aria-hidden="true" /><span>뜯은 기억도 사라지지 않고 트리에 보관돼요</span></div>
      </header>

      <section className="vtp-studio">
        <aside className="vtp-intro">
          <div className="vtp-eyebrow">Daily memory ritual</div>
          <h1>오늘의 영상을<br /><em>한 장 뜯어</em> 간직해요.</h1>
          <p>달력을 넘기듯 오늘 마음에 남은 영상 한 장을 골라요. 아래쪽을 잡아 뜯으면 다음 순간이 나타나고, 뜯은 장면은 오른쪽 기억함에 그대로 남아요.</p>
          <div className="vtp-people" aria-label="사람별 러브트리 선택">
            {Object.entries(VTP_PEOPLE).map(([key, p]) => (
              <button key={key} className={`vtp-person${key === person ? " active" : ""}`} type="button" data-person={key} onClick={() => selectPerson(key)}>{p.name}</button>
            ))}
          </div>
          <div className="vtp-guide">
            <strong>이렇게 사용해 보세요</strong>
            <ol><li>영상 표지를 눌러 먼저 재생하기</li><li>종이 아래쪽을 잡고 아래로 천천히 당기기</li><li>뜯은 순간은 기억함에서 다시 열기</li></ol>
            <button className="vtp-demo-btn" type="button" onClick={autoTear}>뜯기 동작 자동으로 보기</button>
          </div>
        </aside>

        <section className="vtp-pad-zone" aria-label="LoveTree 영상 기억 패드">
          <div className="vtp-pad">
            <div className="vtp-pad-back" />
            <div className="vtp-stack-page" />
            <div className="vtp-stack-page vtp-two" />
            <div className="vtp-sheet vtp-under-page">{next ? <SheetSurface person={pers} moment={next} /> : <CompleteSheet person={pers} onRestart={restart} />}</div>
            <div className={`vtp-active-wrap${flying ? " hidden" : ""}`} ref={activeWrapRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
              {moment ? (
                <>
                  <div className="vtp-paper-mesh">
                    {Array.from({ length: VTP_ROWS }, (_, row) => {
                      const clip = stripClip(row);
                      return (
                        <div key={row} className="vtp-paper-strip" ref={(el) => { stripRefs.current[row] = el; }} style={{ clipPath: `inset(${clip.top} 0 ${clip.bottom} 0)`, transformOrigin: `50% ${clip.origin}`, transform: stripTransform(row, mesh.dx, mesh.dy, mesh.progress, side), filter: stripFilter(mesh.progress) }}>
                          <SheetSurface person={pers} moment={moment} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="vtp-fibers">
                    {broken.map((b, i) => (<i key={i} className={`vtp-fiber${b ? " broken" : ""}`} style={{ ["--flip" as string]: i % 2 ? 1 : -1 }} />))}
                  </div>
                  <div className="vtp-progress-line" ref={progressLineRef} />
                  <button className="vtp-video-hit" ref={videoHitRef} type="button" aria-label="현재 영상 재생" onClick={openVideo} />
                  <div className="vtp-tear-cue" ref={tearCueRef}><i aria-hidden="true">↓</i><span>아래쪽을 잡고 뜯기</span></div>
                </>
              ) : (
                <CompleteSheet person={pers} onRestart={restart} />
              )}
            </div>
            <div className="vtp-binding"><div className="vtp-pins"><i /><i /><i /></div></div>
          </div>
        </section>

        <aside className="vtp-side">
          <div className="vtp-side-head">
            <div><small>kept moments</small><h2>오늘 뜯어 간 기억</h2></div>
            <span className="vtp-archive-count">{archived.length}장</span>
          </div>
          <div className="vtp-archive" ref={archiveRef}>
            {archived.length === 0 ? (
              <div className="vtp-empty"><div><i>♡</i><strong>아직 뜯어 간 기억이 없어요</strong><span>마음에 남은 영상을 한 장 뜯으면<br />여기에 차곡차곡 보관돼요.</span></div></div>
            ) : (
              <div className="vtp-archive-list">
                {archived.slice().reverse().map((a, i) => (
                  <button key={`${a.person}-${a.index}-${i}`} className="vtp-archive-card" type="button" data-archive={archived.length - 1 - i} style={{ ["--accent" as string]: a.accent }} onClick={() => restoreArchive(archived.length - 1 - i)}>
                    <img src={vtpThumb(a.moment.id)} alt="" />
                    <div><small>{a.personName}</small><strong>{a.moment.title}</strong><span>{a.moment.date}</span></div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="vtp-meaning"><strong>LoveTree의 뜯기 = 삭제가 아니에요.</strong><br />오늘의 장면을 고르고, 다음 순간으로 넘어가는 작은 의식이에요.</p>
        </aside>
      </section>

      <div className={`vtp-player${player ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="영상 플레이어" onClick={(e) => e.target === e.currentTarget && closeVideo()}>
        {player && (
          <div className="vtp-player-card">
            <div className="vtp-player-frame"><iframe title={player.title} src={`https://www.youtube.com/embed/${player.id}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
            <div className="vtp-player-meta"><div><small>{player.personName} · TODAY{"'"}S MEMORY</small><strong>{player.title}</strong></div><button className="vtp-close-player" type="button" aria-label="영상 닫기" onClick={closeVideo}>×</button></div>
          </div>
        )}
      </div>

      <div className={`vtp-toast${toast ? " show" : ""}`} role="status" aria-live="polite">{toast}</div>
      <div className="vtp-sr-live" aria-live="polite">{announce}</div>

      {mounted && flyer
        ? createPortal(
            <div className="vtp-flying-page fly" style={{ left: `${flyer.left}px`, top: `${flyer.top}px`, width: `${flyer.width}px`, height: `${flyer.height}px`, ["--fly-x" as string]: `${flyer.flyX}px`, ["--fly-y" as string]: `${flyer.flyY}px`, ["--fly-r" as string]: flyer.flyR }}>
              <SheetSurface person={flyer.person} moment={flyer.moment} />
            </div>,
            document.body,
          )
        : null}
    </main>
  );
}

/* ---- sub-components ------------------------------------------------ */

function SheetSurface({ person, moment }: { person: Omit<VtpPerson, "key">; moment: VtpMoment | null }) {
  if (!moment) return <div className="vtp-complete-sheet" />;
  return (
    <article className="vtp-sheet-surface" style={{ ["--accent" as string]: person.accent, ["--soft" as string]: person.soft }}>
      <header className="vtp-paper-head">
        <div>
          <span className="vtp-kicker">{person.latin} · LOVETREE</span>
          <span className="vtp-person-name">{person.name}의 오늘 한 장</span>
        </div>
        <strong className="vtp-day-no">{moment.day}</strong>
      </header>
      <div className="vtp-memory-main">
        <div className="vtp-memory-date"><span>{moment.date}</span><i /></div>
        <div className="vtp-video-thumb">
          <img src={vtpThumb(moment.id)} alt={moment.title} draggable={false} />
          <span className="vtp-play-dot">▶</span>
          <span className="vtp-source-badge">click to play</span>
        </div>
        <div className="vtp-memory-copy"><h2>{moment.title}</h2><p>{moment.note}</p></div>
      </div>
      <footer className="vtp-paper-foot"><span>{moment.source}</span><strong>♥ KEEP THIS MOMENT</strong></footer>
    </article>
  );
}

function CompleteSheet({ person, onRestart }: { person: Omit<VtpPerson, "key">; onRestart: () => void }) {
  return (
    <div className="vtp-complete-sheet">
      <div>
        <i>❀</i>
        <h2>{person.name}의 오늘 기억을<br />모두 골랐어요.</h2>
        <p>뜯은 장면은 오른쪽 기억함에 남아 있어요.<br />내일은 또 다른 순간을 한 장 골라보세요.</p>
        <button type="button" onClick={onRestart}>처음 장부터 다시 보기</button>
      </div>
    </div>
  );
}


