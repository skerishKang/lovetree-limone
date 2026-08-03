"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface ArchiveMoment {
  id: string;
  title: string;
  note: string;
  date: string;
  time: string;
  emotion: string;
  videoId: string;
  accent: string;
}

const MOMENTS: ArchiveMoment[] = [
  { id: "a1", title: "처음 마음이 멈춘 장면", note: "우연히 본 한 장면이 하루 종일 마음에 머물렀어요.", date: "2026.04.22", time: "01:30", emotion: "설렘", videoId: "dQw4w9WgXcQ", accent: "#d87382" },
  { id: "a2", title: "다시 찾아본 무대", note: "첫 장면이 궁금해서 같은 날 다른 무대를 찾아봤어요.", date: "2026.04.23", time: "00:42", emotion: "궁금함", videoId: "ysz5S6PUM-U", accent: "#7c9472" },
  { id: "a3", title: "오래 남은 인터뷰", note: "무대 밖에서 건넨 말이 오래 따뜻하게 남았어요.", date: "2026.04.24", time: "03:18", emotion: "따뜻함", videoId: "M7lc1UVf-VE", accent: "#9072b5" },
  { id: "a4", title: "팬들이 추천한 노래", note: "댓글을 따라가다 새로운 마음의 결을 만났어요.", date: "2026.04.27", time: "02:11", emotion: "벅참", videoId: "aqz-KE-bpKQ", accent: "#c5a36e" },
  { id: "a5", title: "문득 다시 생각난 밤", note: "며칠 뒤에도 같은 장면이 떠올라 다시 열어봤어요.", date: "2026.05.02", time: "04:06", emotion: "그리움", videoId: "ScMzIvxBSi4", accent: "#b86e8c" },
  { id: "a6", title: "처음 함께 본 라이브", note: "같은 시간에 함께 본 마음은 다른 결로 남았어요.", date: "2026.05.13", time: "18:20", emotion: "벅참", videoId: "jNQXAC9IVRw", accent: "#5f8998" },
  { id: "a7", title: "오래 간직할 문장", note: "이 문장을 첫 계절의 대표 기억으로 남겼어요.", date: "2026.06.01", time: "05:31", emotion: "위로", videoId: "aqz-KE-bpKQ", accent: "#879975" },
  { id: "a8", title: "다시 시작된 가지", note: "쉬고 돌아온 뒤 가장 먼저 기록한 새로운 순간이에요.", date: "2026.06.21", time: "01:04", emotion: "반가움", videoId: "dQw4w9WgXcQ", accent: "#d37783" },
];

const ARCHIVE_LINKS = [
  ["Motion", "/v4/subjects/demo/motion"],
  ["Orbit", "/v4/subjects/demo/orbit"],
  ["Accordion", "/v4/subjects/demo/accordion"],
  ["Folding", "/v4/subjects/demo/folding"],
] as const;

function ArchiveTop({ title, subtitle, active }: { title: string; subtitle: string; active: string }) {
  return (
    <header className="v4-archive-top">
      <Link href="/v4/subjects">← 사람 앨범</Link>
      <Link className="v4-archive-brand" href="/v4">LoveTree</Link>
      <div className="v4-archive-title"><strong>{title}</strong><small>{subtitle}</small></div>
      {ARCHIVE_LINKS.map(([label, route]) => <Link className={`v4-archive-link${active === label ? " is-active" : ""}`} href={route} key={label}>{label}</Link>)}
    </header>
  );
}

function thumb(moment: ArchiveMoment) {
  return `https://img.youtube.com/vi/${moment.videoId}/hqdefault.jpg`;
}

const MOTION_MODES = [
  { id: "wave", label: "물결 리본", copy: "흐르듯 이어지는 장면" },
  { id: "orbit", label: "마음 궤도", copy: "중심 기억 주위를 도는 순간" },
  { id: "vinyl", label: "비닐 케이스", copy: "한 장씩 꺼내 보는 기록" },
  { id: "diagonal", label: "사선 흐름", copy: "시간의 방향을 따라 감상" },
] as const;
type MotionMode = (typeof MOTION_MODES)[number]["id"];

function motionTransform(mode: MotionMode, index: number, active: number, count: number) {
  const offset = index - active;
  if (mode === "orbit") {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(angle) * 330, y: Math.sin(angle) * 205, z: offset === 0 ? 130 : 0, rx: 0, ry: -Math.sin(angle) * 25, rz: angle * 8, s: offset === 0 ? 1.26 : .84 };
  }
  if (mode === "vinyl") return { x: offset * 124, y: Math.abs(offset) * 12, z: -Math.abs(offset) * 95, rx: 0, ry: offset * -12, rz: offset * 1.8, s: offset === 0 ? 1.04 : .88 };
  if (mode === "diagonal") return { x: offset * 175, y: offset * 78, z: -Math.abs(offset) * 55, rx: 0, ry: offset * -8, rz: -11, s: offset === 0 ? 1.13 : .84 };
  return { x: offset * 148, y: Math.sin((index + 1) * .9) * 125, z: -Math.abs(offset) * 45, rx: Math.sin(index) * 7, ry: offset * -8, rz: Math.cos(index) * 5, s: offset === 0 ? 1.14 : .86 };
}

export function V4MotionArchive() {
  const [mode, setMode] = useState<MotionMode>("wave");
  const [active, setActive] = useState(2);
  const [extracting, setExtracting] = useState(false);
  const [viewer, setViewer] = useState(false);
  const moment = MOMENTS[active];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setActive((value) => (value - 1 + MOMENTS.length) % MOMENTS.length);
      if (event.key === "ArrowRight") setActive((value) => (value + 1) % MOMENTS.length);
      if (event.key === "Escape") setViewer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function open(index: number) {
    setActive(index);
    if (mode === "vinyl") {
      setExtracting(true);
      window.setTimeout(() => { setExtracting(false); setViewer(true); }, 560);
    } else setViewer(true);
  }

  return (
    <main className="v4-archive-page">
      <div className="v4-archive-app">
        <ArchiveTop title="Motion Archive" subtitle="WAVE · ORBIT · VINYL · DIAGONAL" active="Motion" />
        <section className="v4-archive-intro"><div><p>FOUR WAYS TO REMEMBER</p><h1>같은 순간도<br /><em>움직임에 따라</em> 다르게 보여요.</h1><span>물결, 원형 궤도, 비닐 케이스와 사선 흐름을 오가며 영상과 메모의 관계를 감상합니다.</span></div><div className="v4-archive-guide"><b>모드 전환</b><b>카드 선택</b><b>영상 자동 진입</b><b>← → 키</b></div></section>
        <div className="v4-motion-dock">
          <div className="v4-motion-copy"><small>ARCHIVE MODE</small><strong>{MOTION_MODES.find((item) => item.id === mode)?.label}</strong><span>{MOTION_MODES.find((item) => item.id === mode)?.copy}</span></div>
          <div className="v4-motion-tabs">{MOTION_MODES.map((item, index) => <button className={`v4-motion-tab${mode === item.id ? " is-active" : ""}`} type="button" key={item.id} onClick={() => setMode(item.id)}><b>0{index + 1}</b><span>{item.label}</span><small>{item.copy}</small></button>)}</div>
        </div>
        <section className="v4-archive-shell" aria-label="모션 아카이브">
          <header className="v4-archive-head"><div><h2>{moment.title}</h2><p>{moment.date} · {moment.emotion} · {moment.time}</p></div><div className="v4-archive-count"><i />{active + 1} / {MOMENTS.length}</div></header>
          <div className="v4-motion-stage" data-mode={mode}>
            <div className="v4-motion-core"><div><strong>주연의<br />마음 궤도</strong><small>{MOMENTS.length} MOMENTS</small></div></div>
            {MOMENTS.map((item, index) => {
              const p = motionTransform(mode, index, active, MOMENTS.length);
              const style = { "--x": `${Number(p.x).toFixed(2)}px`, "--y": `${Number(p.y).toFixed(2)}px`, "--z": `${p.z}px`, "--rx": `${Number(p.rx).toFixed(2)}deg`, "--ry": `${Number(p.ry).toFixed(2)}deg`, "--rz": `${Number(p.rz).toFixed(2)}deg`, "--s": Number(p.s).toFixed(4) } as CSSProperties;
              return <button className={`v4-motion-card${index === active ? " is-active" : ""}${extracting && index === active ? " is-extracting" : ""}`} style={style} type="button" key={item.id} onClick={() => open(index)}><div className="v4-motion-card-inner"><img src={thumb(item)} alt="" /><div className="v4-motion-shade" /><span className="v4-motion-num">{String(index + 1).padStart(2, "0")}</span><div className="v4-motion-card-copy"><small>{item.emotion.toUpperCase()} · {item.time}</small><strong>{item.title}</strong></div></div></button>;
            })}
          </div>
          <footer className="v4-motion-footer"><button className="v4-round" type="button" onClick={() => setActive((active - 1 + MOMENTS.length) % MOMENTS.length)}>←</button><button className="v4-archive-button is-primary" type="button" onClick={() => open(active)}>선택 영상과 메모 열기</button><button className="v4-round" type="button" onClick={() => setActive((active + 1) % MOMENTS.length)}>→</button></footer>
        </section>
      </div>
      {viewer ? <div className="v4-liquid-detail" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setViewer(false); }}><section className="v4-liquid-dialog" role="dialog" aria-modal="true"><div className="v4-liquid-video" style={{ backgroundImage: `linear-gradient(180deg,rgba(255,255,255,.03),rgba(28,17,23,.42)),url(${thumb(moment)})` }}>▶</div><div className="v4-liquid-note"><small>{moment.date} · {moment.emotion.toUpperCase()} · {moment.time}</small><h2>{moment.title}</h2><p>{moment.note}</p><button className="v4-archive-button is-primary" type="button" onClick={() => setViewer(false)}>영상 닫기</button></div></section></div> : null}
    </main>
  );
}

const LIQUID_MODES = ["wave", "orbit", "free", "diagonal"] as const;
type LiquidMode = (typeof LIQUID_MODES)[number];

function liquidTransform(mode: LiquidMode, index: number, active: number, rotation: number) {
  const count = MOMENTS.length;
  const offset = index - active;
  if (mode === "orbit") {
    const angle = (index / count) * Math.PI * 2 + rotation;
    return { x: Math.cos(angle) * 370, y: Math.sin(angle) * 235, z: Math.sin(angle) * 150, rx: Math.sin(angle) * -9, ry: Math.cos(angle) * 24, rz: angle * 4, s: .77 + (Math.sin(angle) + 1) * .13 };
  }
  if (mode === "free") return { x: Math.sin(index * 2.31 + rotation) * 420, y: Math.cos(index * 1.71 + rotation) * 210, z: -Math.abs(offset) * 30, rx: Math.sin(index) * 8, ry: Math.cos(index) * 15, rz: Math.sin(index * 1.3) * 12, s: index === active ? 1.12 : .74 };
  if (mode === "diagonal") return { x: offset * 180 + rotation * 60, y: offset * 88, z: -Math.abs(offset) * 45, rx: 0, ry: offset * -8, rz: -13, s: index === active ? 1.08 : .77 };
  return { x: offset * 170 + rotation * 45, y: Math.sin(index * 1.25 + rotation) * 145, z: -Math.abs(offset) * 55, rx: Math.cos(index) * 8, ry: offset * -8, rz: Math.sin(index) * 7, s: index === active ? 1.08 : .76 };
}

export function V4LiquidOrbitGallery() {
  const [mode, setMode] = useState<LiquidMode>("orbit");
  const [active, setActive] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [viewer, setViewer] = useState(false);
  const drag = useRef<{ id: number; x: number; rotation: number } | null>(null);
  const moment = MOMENTS[active];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") { setActive((value) => (value - 1 + MOMENTS.length) % MOMENTS.length); setRotation((value) => value - .18); }
      if (event.key === "ArrowRight") { setActive((value) => (value + 1) % MOMENTS.length); setRotation((value) => value + .18); }
      if (event.key === "Enter") setViewer(true);
      if (event.key === "Escape") setViewer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function down(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, rotation };
    setDragging(true);
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    setRotation(drag.current.rotation + (event.clientX - drag.current.x) * .0045);
  }
  function up(event: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current?.id === event.pointerId) drag.current = null;
    setDragging(false);
  }
  function wheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 1 : -1;
    setActive((value) => (value + delta + MOMENTS.length) % MOMENTS.length);
    setRotation((value) => value + delta * .14);
  }

  return (
    <main className="v4-archive-page v4-liquid-page">
      <div className="v4-archive-app">
        <ArchiveTop title="물결치는 순간의 서가" subtitle="DRAG · WHEEL · KEYBOARD · LIQUID ORBIT" active="Orbit" />
        <section className="v4-archive-intro"><div><p>LIQUID ORBIT VIDEO GALLERY</p><h1>손끝을 따라 흐르는<br /><em>영상의 궤도</em></h1><span>드래그와 휠, 키보드로 장면의 흐름을 바꾸고 선택한 순간을 비닐 케이스에서 꺼내듯 크게 펼칩니다.</span></div><div className="v4-archive-guide"><b>드래그 회전</b><b>휠 이동</b><b>← → 키</b><b>Enter 열기</b></div></section>
        <section className="v4-archive-shell v4-liquid-shell">
          <header className="v4-archive-head"><div><h2>{moment.title}</h2><p>{mode.toUpperCase()} · {moment.date} · {moment.emotion}</p></div><div className="v4-archive-count"><i />{active + 1} / {MOMENTS.length}</div></header>
          <div className={`v4-liquid-stage${dragging ? " is-dragging" : ""}`} data-mode={mode} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}>
            <span className="v4-liquid-halo" />
            {MOMENTS.map((item, index) => {
              const p = liquidTransform(mode, index, active, rotation);
              const style = { "--x": `${Number(p.x).toFixed(2)}px`, "--y": `${Number(p.y).toFixed(2)}px`, "--z": `${p.z}px`, "--rx": `${Number(p.rx).toFixed(2)}deg`, "--ry": `${Number(p.ry).toFixed(2)}deg`, "--rz": `${Number(p.rz).toFixed(2)}deg`, "--s": Number(p.s).toFixed(4), "--accent": item.accent } as CSSProperties;
              return <button className={`v4-liquid-card${index === active ? " is-selected" : ""}`} style={style} type="button" key={item.id} onPointerDown={(event) => event.stopPropagation()} onClick={() => { if (index === active) setViewer(true); else setActive(index); }}><div className="v4-liquid-media"><img src={thumb(item)} alt="" /><span className="v4-liquid-index">{String(index + 1).padStart(2, "0")}</span></div><div className="v4-liquid-copy"><small>{item.emotion.toUpperCase()} · {item.time}</small><strong>{item.title}</strong><p>{item.note}</p></div></button>;
            })}
          </div>
        </section>
      </div>
      <div className="v4-liquid-dock"><strong>보기 방식</strong><div className="v4-liquid-tabs">{LIQUID_MODES.map((item) => <button className={`v4-liquid-tab${mode === item ? " is-active" : ""}`} type="button" key={item} onClick={() => setMode(item)}>{item}</button>)}</div></div>
      {viewer ? <div className="v4-liquid-detail" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setViewer(false); }}><section className="v4-liquid-dialog" role="dialog" aria-modal="true"><div className="v4-liquid-video" style={{ backgroundImage: `linear-gradient(180deg,rgba(255,255,255,.02),rgba(28,17,23,.44)),url(${thumb(moment)})` }}>▶</div><div className="v4-liquid-note"><small>{moment.date} · {moment.emotion.toUpperCase()} · {moment.time}</small><h2>{moment.title}</h2><p>{moment.note}</p><p>선택한 영상과 그때의 메모를 같은 화면에서 감상합니다.</p><button className="v4-archive-button is-primary" type="button" onClick={() => setViewer(false)}>케이스에 다시 넣기</button></div></section></div> : null}
    </main>
  );
}

const ALBUMS = [
  { id: "juyeon", name: "주연", count: 84, color: "#b66074", videoId: "dQw4w9WgXcQ" },
  { id: "summer", name: "여름 여행", count: 42, color: "#638d89", videoId: "ysz5S6PUM-U" },
  { id: "songs", name: "다시 찾은 노래", count: 61, color: "#8468a8", videoId: "M7lc1UVf-VE" },
  { id: "family", name: "우리 가족", count: 116, color: "#a47d55", videoId: "aqz-KE-bpKQ" },
];

export function V4AccordionArchive() {
  const [albumIndex, setAlbumIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [viewer, setViewer] = useState(false);
  const album = ALBUMS[albumIndex];
  const moment = MOMENTS[selected];

  function bookStyle(index: number) {
    const offset = index - albumIndex;
    return { "--book": ALBUMS[index].color, "--book-x": `${offset * 235}px`, "--book-z": `${-Math.abs(offset) * 100}px`, "--book-ry": `${offset * -12}deg`, "--book-s": offset === 0 ? 1 : .82 } as CSSProperties;
  }

  return (
    <main className="v4-archive-page">
      <div className="v4-archive-app">
        <ArchiveTop title="접히는 마음의 앨범" subtitle="3D SHELF · ACCORDION · SYNCHRONIZED VIEWER" active="Accordion" />
        <section className="v4-archive-intro"><div><p>ACCORDION ALBUM ARCHIVE</p><h1>책 한 권을 열면<br /><em>마음의 페이지가</em> 이어져요.</h1><span>3D 서가에서 대상을 고르고, 표지를 열어 아코디언처럼 펼쳐지는 장면 목록과 동기화된 영상 뷰어를 감상합니다.</span></div><div className="v4-archive-guide"><b>책 선택</b><b>앨범 펼치기</b><b>트랙 선택</b><b>상·하 뷰어 동기화</b></div></section>
        <section className={`v4-archive-shell v4-accordion-shell${open ? " is-open" : ""}${viewer ? " is-viewer" : ""}`} style={{ "--accent": album.color } as CSSProperties}>
          <header className="v4-archive-head"><div><h2>{open ? `${album.name}의 펼친 앨범` : "마음의 앨범 서가"}</h2><p>{album.count} moments · 선택한 책을 열어 장면을 펼칩니다.</p></div><div className="v4-archive-count"><i />{albumIndex + 1} / {ALBUMS.length}</div></header>
          <div className="v4-accordion-shelf-view">
            <p style={{ color: "var(--a-muted)", font: "400 .68rem var(--a-serif)" }}>책을 고른 뒤 표지를 눌러 앨범을 펼쳐 보세요.</p>
            <div className="v4-accordion-shelf">{ALBUMS.map((item, index) => <button className="v4-album-book" type="button" key={item.id} style={bookStyle(index)} onClick={() => { if (index === albumIndex) setOpen(true); else setAlbumIndex(index); }}><img src={thumb({ ...MOMENTS[index], videoId: item.videoId })} alt="" /><span className="v4-album-tint" /><span className="v4-album-spine">{item.name} · LoveTree</span><span className="v4-album-copy"><small>{item.count} MOMENTS</small><strong>{item.name}</strong></span></button>)}<span className="v4-accordion-floor" /></div>
            <div className="v4-accordion-controls"><button className="v4-round" type="button" onClick={() => setAlbumIndex((albumIndex - 1 + ALBUMS.length) % ALBUMS.length)}>←</button><span style={{ minWidth: 100, textAlign: "center", color: "var(--a-muted)", font: "400 .64rem var(--a-serif)" }}><b style={{ color: "var(--a-rose2)" }}>{albumIndex + 1}</b> / {ALBUMS.length}</span><button className="v4-round" type="button" onClick={() => setAlbumIndex((albumIndex + 1) % ALBUMS.length)}>→</button><button className="v4-archive-button is-primary" type="button" onClick={() => setOpen(true)}>이 앨범 열기</button></div>
          </div>
          <div className="v4-accordion-spread">
            <div className="v4-accordion">
              <section className="v4-fold-panel v4-cover-panel" style={{ "--p": 0 } as CSSProperties}><img src={thumb({ ...MOMENTS[albumIndex], videoId: album.videoId })} alt="" /><div className="v4-cover-info"><small>LOVETREE ALBUM</small><h3>{album.name}</h3><p>{album.count}개의 순간이 한 권의 접히는 앨범에 담겨 있어요.</p></div></section>
              {[0,1,2].map((panel) => <section className="v4-fold-panel" key={panel} style={{ "--p": panel + 1 } as CSSProperties}><header className="v4-panel-head"><small>CHAPTER 0{panel + 1}</small><strong>{["처음 발견", "마음이 깊어진 순간", "오래 간직할 기억"][panel]}</strong></header><div className="v4-video-list">{MOMENTS.slice(panel * 2, panel * 2 + 3).map((item) => { const index = MOMENTS.indexOf(item); return <button className={`v4-video-row${selected === index ? " is-selected" : ""}`} type="button" key={item.id} onClick={() => setSelected(index)}><span style={{ color: "#bb8b84", fontSize: ".55rem" }}>{String(index + 1).padStart(2,"0")}</span><span className="v4-row-thumb" style={{ backgroundImage: `url(${thumb(item)})` }} /><span className="v4-row-copy"><strong>{item.title}</strong><span>{item.date} · {item.time}</span></span></button>; })}</div></section>)}
              <section className="v4-fold-panel v4-summary-panel" style={{ "--p": 4, "--accent": album.color } as CSSProperties}><div className="v4-vertical-name">{album.name}</div><div style={{ marginTop: 20, padding: 15, border: "1px solid var(--a-line)", background: "rgba(255,255,255,.64)", font: "400 .58rem/1.65 var(--a-serif)" }}>{moment.note}</div><button className="v4-archive-button is-primary" style={{ width: "100%", marginTop: 14 }} type="button" onClick={() => setViewer(true)}>선택 영상 크게 보기</button><button className="v4-archive-button" style={{ width: "100%", marginTop: 7 }} type="button" onClick={() => setOpen(false)}>서가로 돌아가기</button></section>
            </div>
          </div>
          <div className="v4-accordion-viewer"><div className="v4-accordion-player" style={{ backgroundImage: `linear-gradient(180deg,rgba(255,255,255,.02),rgba(18,12,16,.45)),url(${thumb(moment)})` }}>▶</div><aside className="v4-accordion-viewer-copy"><small>{moment.date} · {moment.emotion.toUpperCase()} · {moment.time}</small><h2>{moment.title}</h2><p>{moment.note}</p><div style={{ display: "flex", gap: 7, marginTop: 18 }}><button className="v4-graph-button" type="button" onClick={() => setSelected((selected - 1 + MOMENTS.length) % MOMENTS.length)}>이전</button><button className="v4-graph-button" type="button" onClick={() => setSelected((selected + 1) % MOMENTS.length)}>다음</button><button className="v4-graph-button is-primary" type="button" onClick={() => setViewer(false)}>접힌 앨범으로</button></div></aside></div>
        </section>
      </div>
    </main>
  );
}

export function V4FoldingPersonArchive() {
  const [personIndex, setPersonIndex] = useState(0);
  const [phase, setPhase] = useState<"shelf" | "opening" | "open">("shelf");
  const [selected, setSelected] = useState(1);
  const [playing, setPlaying] = useState(false);
  const person = ALBUMS[personIndex];
  const moment = MOMENTS[selected];

  useEffect(() => () => setPlaying(false), []);

  function openBook() {
    setPhase("opening");
    window.setTimeout(() => setPhase("open"), 1050);
  }
  function closeBook() {
    setPlaying(false);
    setPhase("shelf");
  }
  function choose(index: number) {
    setPlaying(false);
    setSelected(index);
  }
  function bookStyle(index: number) {
    const offset = index - personIndex;
    return { "--person": ALBUMS[index].color, "--book-x": `${offset * 260}px`, "--book-z": `${-Math.abs(offset) * 110}px`, "--book-ry": `${offset * -13}deg`, "--book-s": offset === 0 ? 1 : .8 } as CSSProperties;
  }

  return (
    <main className="v4-archive-page">
      <div className="v4-archive-app">
        <ArchiveTop title="마음의 앨범 서가" subtitle="PERSON BOOK · PAGE BURST · VIDEO & MEMO SPREAD" active="Folding" />
        <section className="v4-archive-intro"><div><p>FOLDING PERSON ARCHIVE</p><h1>한 사람의 기록을<br /><em>책처럼 펼쳐</em> 감상해요.</h1><span>사람별 책을 고르면 표지가 폭발하듯 여러 페이지로 흩어지고, 왼쪽 영상과 오른쪽 메모가 한 권의 펼친 책으로 이어집니다.</span></div><div className="v4-archive-guide"><b>사람 서가</b><b>페이지 폭발</b><b>트랙 선택</b><b>영상 종료 처리</b></div></section>
        <section className={`v4-archive-shell v4-folding-shell is-${phase}`} style={{ "--person": person.color } as CSSProperties}>
          <header className="v4-archive-head"><div><h2>{phase === "open" ? `${person.name}의 펼친 기록` : "사람별 마음의 책"}</h2><p>{person.count} moments · 표지에서 영상과 메모의 양면 페이지로</p></div><div className="v4-archive-count"><i />{personIndex + 1} / {ALBUMS.length}</div></header>
          <div className="v4-folding-shelf-view"><p style={{ color: "var(--a-muted)", font: "400 .7rem var(--a-serif)" }}>가운데 책을 눌러 한 사람의 기록을 펼쳐 보세요.</p><div className="v4-folding-shelf">{ALBUMS.map((item,index)=><button className="v4-person-book" type="button" key={item.id} style={bookStyle(index)} onClick={()=>{if(index===personIndex)openBook();else setPersonIndex(index)}}><img src={thumb({ ...MOMENTS[index], videoId:item.videoId })} alt=""/><span className="v4-person-book-tint"/><span className="v4-person-spine">{item.name} · LoveTree</span><span className="v4-person-book-copy"><small>{item.count} MOMENTS</small><strong>{item.name}</strong></span></button>)}<span className="v4-accordion-floor"/></div><div className="v4-accordion-controls"><button className="v4-round" type="button" onClick={()=>setPersonIndex((personIndex-1+ALBUMS.length)%ALBUMS.length)}>←</button><button className="v4-archive-button is-primary" type="button" onClick={openBook}>이 사람의 책 펼치기</button><button className="v4-round" type="button" onClick={()=>setPersonIndex((personIndex+1)%ALBUMS.length)}>→</button></div></div>
          <div className="v4-burst"><div className="v4-burst-stack">{MOMENTS.slice(0,7).map((item,index)=><span className="v4-burst-page" key={item.id} style={{"--n":index} as CSSProperties}><img src={thumb(item)} alt=""/></span>)}</div></div>
          <div className="v4-folding-spread">
            <aside className="v4-track-page"><p style={{color:"var(--a-rose2)",font:"700 .46rem var(--a-latin)",letterSpacing:".13em"}}>PERSON ARCHIVE</p><h2>{person.name}</h2><p>한 사람에게 이어진 영상과 메모를 페이지 순서대로 선택합니다.</p><div className="v4-track-list">{MOMENTS.map((item,index)=><button className={`v4-track-row${selected===index?" is-selected":""}`} type="button" key={item.id} onClick={()=>choose(index)}><small>{String(index+1).padStart(2,"0")}</small><span className="v4-track-thumb" style={{backgroundImage:`url(${thumb(item)})`}}/><span><small>{item.date} · {item.time}</small><strong>{item.title}</strong></span></button>)}</div></aside>
            <section className="v4-open-book">
              <article className="v4-open-page"><div className="v4-book-video" style={{backgroundImage:`linear-gradient(180deg,rgba(255,255,255,.02),rgba(22,14,18,.45)),url(${thumb(moment)})`}}>{playing?"Ⅱ":"▶"}</div><div className="v4-folding-actions"><button className="v4-archive-button is-primary" type="button" onClick={()=>setPlaying(value=>!value)}>{playing?"영상 멈춤":"영상 재생"}</button></div><p className="v4-book-note">{moment.date} · {moment.time} · {moment.emotion}</p></article>
              <article className="v4-open-page"><p style={{color:"var(--person)",font:"700 .46rem var(--a-latin)",letterSpacing:".13em"}}>MEMORY NOTE · PAGE {String(selected+1).padStart(2,"0")}</p><h2 style={{margin:"9px 0 0",font:"400 1.75rem var(--a-serif)"}}>{moment.title}</h2><blockquote className="v4-book-quote">“{moment.note}”</blockquote><p className="v4-book-note">이 페이지를 닫으면 재생 중인 영상도 멈추고, 사람 서가의 선택 상태로 돌아갑니다.</p><div style={{display:"flex",gap:7,marginTop:22}}><button className="v4-archive-button" type="button" onClick={()=>choose((selected-1+MOMENTS.length)%MOMENTS.length)}>이전 페이지</button><button className="v4-archive-button" type="button" onClick={()=>choose((selected+1)%MOMENTS.length)}>다음 페이지</button><button className="v4-archive-button is-primary" type="button" onClick={closeBook}>책 닫기</button></div></article>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
