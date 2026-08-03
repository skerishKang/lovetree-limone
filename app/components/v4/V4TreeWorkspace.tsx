"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

interface V4Moment {
  id: string;
  parentId: string | null;
  title: string;
  note: string;
  date: string;
  time: string;
  relation: string;
  videoId: string;
  x: number;
  y: number;
}

const ROOT = { x: 70, y: 292, width: 82, height: 82 };
const CARD = { width: 174, height: 162 };

const INITIAL_MOMENTS: V4Moment[] = [
  {
    id: "m1",
    parentId: null,
    title: "처음 마음이 멈춘 장면",
    note: "우연히 보게 됐는데 그 표정과 목소리가 하루 종일 생각났어요.",
    date: "2026-04-22",
    time: "01:30",
    relation: "처음 발견",
    videoId: "dQw4w9WgXcQ",
    x: 215,
    y: 252,
  },
  {
    id: "m2",
    parentId: "m1",
    title: "다시 찾아본 무대",
    note: "첫 장면이 궁금해서 같은 날 다른 무대까지 찾아보게 됐어요.",
    date: "2026-04-23",
    time: "00:42",
    relation: "이 장면이 궁금해서",
    videoId: "ysz5S6PUM-U",
    x: 432,
    y: 112,
  },
  {
    id: "m3",
    parentId: "m1",
    title: "오래 남은 인터뷰",
    note: "무대 밖의 말투도 알고 싶어져서 인터뷰를 찾아봤어요.",
    date: "2026-04-24",
    time: "03:18",
    relation: "같은 사람이 나와서",
    videoId: "M7lc1UVf-VE",
    x: 438,
    y: 389,
  },
  {
    id: "m4",
    parentId: "m2",
    title: "팬들이 추천한 노래",
    note: "댓글에서 계속 언급되던 곡을 듣고 마음의 결이 더 선명해졌어요.",
    date: "2026-04-27",
    time: "02:11",
    relation: "추천을 따라가다가",
    videoId: "aqz-KE-bpKQ",
    x: 666,
    y: 68,
  },
  {
    id: "m5",
    parentId: "m3",
    title: "문득 다시 생각난 밤",
    note: "며칠 뒤에도 같은 문장이 떠올라 다시 영상을 열었어요.",
    date: "2026-05-02",
    time: "04:06",
    relation: "문득 다시 생각나서",
    videoId: "ScMzIvxBSi4",
    x: 684,
    y: 430,
  },
];

const RELATIONS = [
  "이 장면이 궁금해서",
  "같은 사람이 나와서",
  "비슷한 감정이 이어져서",
  "추천을 따라가다가",
  "문득 다시 생각나서",
];

function youtubeId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0] ?? "";
    return url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    return "";
  }
}

function getSavedWorkspace() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("lovetree-v4-workspace") || "null") as { moments?: V4Moment[]; selectedId?: string } | null;
  } catch {
    return null;
  }
}

function curvePath(fromX: number, fromY: number, toX: number, toY: number) {
  const distance = Math.max(80, Math.abs(toX - fromX) * 0.46);
  return `M ${fromX} ${fromY} C ${fromX + distance} ${fromY}, ${toX - distance} ${toY}, ${toX} ${toY}`;
}

export default function V4TreeWorkspace() {
  const pageRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const saved = getSavedWorkspace();
  const [moments, setMoments] = useState<V4Moment[]>(() => {
    if (saved?.moments?.length) return saved.moments;
    return INITIAL_MOMENTS;
  });
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (saved?.selectedId && saved.moments?.some((m) => m.id === saved.selectedId)) return saved.selectedId;
    if (saved?.moments?.length) return saved.moments[0].id;
    return "m1";
  });
  const [zoom, setZoom] = useState(0.9);
  const [fullscreen, setFullscreen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState("");

  const [url, setUrl] = useState("https://www.youtube.com/watch?v=jNQXAC9IVRw");
  const [title, setTitle] = useState("새로 발견한 순간");
  const [time, setTime] = useState("00:38");
  const [date, setDate] = useState("2026-08-03");
  const [note, setNote] = useState("이 순간이 왜 이어졌는지 짧게 남겨 주세요.");
  const [relation, setRelation] = useState(RELATIONS[0]);

  useEffect(() => {
    localStorage.setItem("lovetree-v4-workspace", JSON.stringify({ moments, selectedId }));
  }, [moments, selectedId]);

  useEffect(() => {
    const onFullscreen = () => {
      const active = document.fullscreenElement === pageRef.current;
      setFullscreen(active);
      if (!active) setDrawerOpen(false);
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2100);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selected = moments.find((moment) => moment.id === selectedId) ?? moments[0];
  const orderedDiary = useMemo(
    () => [...moments].sort((a, b) => b.date.localeCompare(a.date)),
    [moments],
  );

  const branches = useMemo(() => moments.map((moment) => {
    const parent = moment.parentId ? moments.find((item) => item.id === moment.parentId) : null;
    const fromX = parent ? parent.x + CARD.width : ROOT.x + ROOT.width;
    const fromY = parent ? parent.y + CARD.height / 2 : ROOT.y + ROOT.height / 2;
    const toX = moment.x;
    const toY = moment.y + CARD.height / 2;
    return {
      id: moment.id,
      relation: moment.relation,
      path: curvePath(fromX, fromY, toX, toY),
      labelX: (fromX + toX) / 2 - 46,
      labelY: (fromY + toY) / 2 - 13,
    };
  }), [moments]);

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>, moment: V4Moment) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: moment.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: moment.x,
      originY: moment.y,
    };
    setSelectedId(moment.id);
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextX = Math.max(145, Math.min(910, drag.originX + (event.clientX - drag.startX) / zoom));
    const nextY = Math.max(18, Math.min(500, drag.originY + (event.clientY - drag.startY) / zoom));
    setMoments((current) => current.map((moment) => moment.id === drag.id ? { ...moment, x: nextX, y: nextY } : moment));
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function addMoment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const videoId = youtubeId(url);
    if (!videoId) {
      setToast("YouTube 링크를 확인해 주세요.");
      return;
    }
    if (!title.trim()) {
      setToast("순간의 제목을 적어 주세요.");
      return;
    }

    const parent = selected ?? moments.at(-1);
    const index = moments.length;
    const next: V4Moment = {
      id: `m-${Date.now()}`,
      parentId: parent?.id ?? null,
      title: title.trim(),
      note: note.trim() || "이 순간이 다음 가지로 이어졌어요.",
      date,
      time,
      relation,
      videoId,
      x: Math.min(900, (parent?.x ?? ROOT.x) + 220),
      y: Math.max(25, Math.min(500, (parent?.y ?? ROOT.y) + (index % 2 === 0 ? -105 : 120))),
    };
    setMoments((current) => [...current, next]);
    setSelectedId(next.id);
    setTitle("새로 발견한 순간");
    setNote("");
    setTime("00:00");
    setToast("새 순간이 선택한 가지 끝에 피어났어요 ✦");
    setDrawerOpen(false);
  }

  function removeSelected() {
    if (!selected) return;
    const fallbackParent = selected.parentId;
    setMoments((current) => current
      .filter((moment) => moment.id !== selected.id)
      .map((moment) => moment.parentId === selected.id ? { ...moment, parentId: fallbackParent } : moment));
    setSelectedId(fallbackParent ?? moments.find((moment) => moment.id !== selected.id)?.id ?? "");
    setToast("선택한 순간을 지우고 이어진 가지를 다시 연결했어요.");
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === pageRef.current) {
        await document.exitFullscreen();
      } else if (pageRef.current) {
        await pageRef.current.requestFullscreen();
      }
    } catch {
      setFullscreen((value) => !value);
      setToast("브라우저 전체화면을 사용할 수 없어 넓은 보기로 전환했어요.");
    }
  }

  function resetView() {
    setZoom(0.9);
    const viewport = document.querySelector<HTMLElement>(".v4-tree-viewport");
    viewport?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    setToast("나무 전체가 보이도록 맞췄어요.");
  }

  function renderComposer(prefix: string) {
    return (
      <form className="v4-composer-form" onSubmit={addMoment}>
        <div className="v4-composer-group">
          <label className="v4-composer-label" htmlFor={`${prefix}-url`}>콘텐츠 URL <small>YouTube</small></label>
          <input id={`${prefix}-url`} className="v4-composer-input" value={url} onChange={(event) => setUrl(event.target.value)} />
        </div>
        <div className="v4-composer-group">
          <span className="v4-composer-label">제목과 장면 시점 <small>MM:SS</small></span>
          <div className="v4-composer-row">
            <input id={`${prefix}-title`} aria-label="순간 제목" className="v4-composer-input" value={title} onChange={(event) => setTitle(event.target.value)} />
            <input id={`${prefix}-time`} aria-label="영상 시점" className="v4-composer-input" value={time} onChange={(event) => setTime(event.target.value)} />
          </div>
        </div>
        <div className="v4-composer-group">
          <label className="v4-composer-label" htmlFor={`${prefix}-date`}>기록 날짜 <small>발견한 날</small></label>
          <input id={`${prefix}-date`} className="v4-composer-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="v4-composer-group">
          <span className="v4-composer-label">이어진 이유 <small>선택 카드에서 뻗어 나갑니다</small></span>
          <div className="v4-relation-options">
            {RELATIONS.map((item) => (
              <button
                className={`v4-relation-option${relation === item ? " is-selected" : ""}`}
                type="button"
                key={item}
                onClick={() => setRelation(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="v4-composer-group">
          <label className="v4-composer-label" htmlFor={`${prefix}-note`}>마음 일기 <small>{note.length} / 180</small></label>
          <textarea id={`${prefix}-note`} className="v4-composer-textarea" maxLength={180} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="v4-composer-actions">
          <button className="v4-composer-submit" type="submit">이 순간 가지에 추가 →</button>
          <button className="v4-composer-delete" type="button" disabled={!selected} onClick={removeSelected}>선택 삭제</button>
        </div>
      </form>
    );
  }

  return (
    <main ref={pageRef} className={`v4-workspace-page${fullscreen ? " is-fullscreen" : ""}`}>
      <div className="v4-workspace-app">
        <header className="v4-workspace-topbar">
          <Link className="v4-workspace-brand" href="/v4">
            <span className="v4-brand-mark" aria-hidden="true"><i /><b /></span>
            LoveTree
          </Link>
          <div className="v4-workspace-title">
            <strong>주연에게 마음이 멈춘 순간들</strong>
            <small>GROWING TREE · 하나의 나무가 계속 자라고 있어요</small>
          </div>
          <div className="v4-workspace-stats" aria-label="트리 통계">
            <span className="v4-stat-pill"><b>{moments.length}</b> 순간</span>
            <span className="v4-stat-pill"><b>{Math.max(0, moments.length - 1)}</b> 가지</span>
            <button className="v4-tool-button" type="button" onClick={toggleFullscreen}>{fullscreen ? "전체화면 닫기" : "전체화면"}</button>
            <button className="v4-tool-button is-primary" type="button" onClick={() => setDrawerOpen(true)}>+ 순간 추가</button>
          </div>
        </header>

        <div className="v4-workspace-grid">
          <aside className="v4-story-column" aria-label="마음 일기">
            <div className="v4-panel-head">
              <div><h2>마음 일기</h2><p>날짜순으로 쌓인 순간을 다시 펼쳐봐요.</p></div>
              <span className="v4-panel-count">{moments.length}</span>
            </div>
            <div className="v4-diary-list">
              {orderedDiary.map((moment) => (
                <button
                  className={`v4-diary-entry${selectedId === moment.id ? " is-selected" : ""}`}
                  type="button"
                  key={moment.id}
                  onClick={() => setSelectedId(moment.id)}
                >
                  <time>{moment.date} · {moment.time}</time>
                  <strong>{moment.title}</strong>
                  <p>{moment.note}</p>
                  <small>↳ {moment.relation}</small>
                </button>
              ))}
            </div>
          </aside>

          <section className="v4-tree-panel" aria-label="성장 트리 편집">
            <div className="v4-tree-toolbar">
              <div className="v4-tree-toolbar-copy">
                <strong>성장하는 러브트리</strong>
                <small>카드를 직접 움직이면 가지도 함께 따라갑니다.</small>
              </div>
              <button className="v4-tool-button" type="button" onClick={() => setZoom((value) => Math.max(0.55, Number((value - 0.1).toFixed(2))))}>−</button>
              <span className="v4-zoom-value">{Math.round(zoom * 100)}%</span>
              <button className="v4-tool-button" type="button" onClick={() => setZoom((value) => Math.min(1.35, Number((value + 0.1).toFixed(2))))}>＋</button>
              <button className="v4-tool-button" type="button" onClick={resetView}>맞춤</button>
              {fullscreen ? <button className="v4-tool-button is-primary" type="button" onClick={() => setDrawerOpen(true)}>추가창</button> : null}
            </div>

            <div className="v4-tree-viewport">
              <div className="v4-tree-stage" style={{ transform: `scale(${zoom})` }}>
                <svg className="v4-tree-branches" viewBox="0 0 1120 680" aria-hidden="true">
                  {branches.map((branch) => (
                    <g key={branch.id}>
                      <path className="v4-tree-branch-shadow" d={branch.path} />
                      <path className="v4-tree-branch" d={branch.path} />
                    </g>
                  ))}
                </svg>

                <div className="v4-root-node" style={{ left: ROOT.x, top: ROOT.y }}>첫<br />마음</div>

                {branches.map((branch) => (
                  <span className="v4-tree-card-relation" key={`relation-${branch.id}`} style={{ left: branch.labelX, top: branch.labelY }}>{branch.relation}</span>
                ))}

                {moments.map((moment, index) => {
                  const thumbnail = moment.videoId ? `https://img.youtube.com/vi/${moment.videoId}/hqdefault.jpg` : "";
                  const cardStyle = {
                    left: moment.x,
                    top: moment.y,
                    "--card-rotate": `${index % 2 === 0 ? -1.2 : 1.1}deg`,
                  } as CSSProperties;
                  return (
                    <button
                      className={`v4-tree-card${selectedId === moment.id ? " is-selected" : ""}`}
                      style={cardStyle}
                      type="button"
                      key={moment.id}
                      onPointerDown={(event) => beginDrag(event, moment)}
                      onPointerMove={moveDrag}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onClick={() => setSelectedId(moment.id)}
                    >
                      <div
                        className="v4-tree-card-media"
                        style={{ backgroundImage: thumbnail ? `linear-gradient(180deg,rgba(255,248,239,.03),rgba(49,34,36,.23)),url(${thumbnail})` : "linear-gradient(145deg,#879975,#c86e79)" }}
                      />
                      <div className="v4-tree-card-copy">
                        <small>{moment.date} · {moment.time}</small>
                        <strong>{moment.title}</strong>
                        <p>{moment.note}</p>
                      </div>
                    </button>
                  );
                })}

                <button
                  className="v4-add-end"
                  style={{ left: Math.min(1005, (selected?.x ?? 760) + 215), top: Math.min(570, (selected?.y ?? 260) + 45) }}
                  type="button"
                  aria-label="선택한 가지 끝에 순간 추가"
                  onClick={() => setDrawerOpen(true)}
                >
                  ＋
                </button>
              </div>
            </div>
          </section>

          <aside className="v4-composer-panel" aria-label="새 순간 추가">
            <div className="v4-panel-head">
              <div><h2>새 순간 추가</h2><p>{selected ? `“${selected.title}”에서 가지가 이어집니다.` : "첫 마음에서 시작합니다."}</p></div>
              <span className="v4-panel-count">＋</span>
            </div>
            {renderComposer("v4-side")}
          </aside>
        </div>
      </div>

      {drawerOpen ? (
        <aside className="v4-fullscreen-drawer" aria-label="전체화면 순간 추가창">
          <div className="v4-fullscreen-drawer-head">
            <div><strong>가지 끝에 새 순간</strong><p style={{ margin: "4px 0 0", color: "#9b8982", fontSize: ".52rem" }}>전체화면을 벗어나지 않고 같은 폼으로 기록합니다.</p></div>
            <button className="v4-fullscreen-drawer-close" type="button" aria-label="추가창 닫기" onClick={() => setDrawerOpen(false)}>×</button>
          </div>
          {renderComposer("v4-drawer")}
        </aside>
      ) : null}

      {toast ? <div className="v4-workspace-toast" role="status" aria-live="polite">{toast}</div> : null}
    </main>
  );
}
