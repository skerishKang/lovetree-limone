"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { AlbumMomentView } from "@/lib/moment-model";
import { useTreeMoments } from "@/lib/use-tree-moments";
import styles from "./track26-memory-film-studio.module.css";

type Aspect = "16:9" | "9:16" | "1:1" | "4:5";
type Camera = "still" | "push" | "drift" | "close";

type SceneDraft = {
  headline: string;
  note: string;
  duration: number;
  camera: Camera;
};

const CAMERA_LABEL: Record<Camera, string> = {
  still: "STILL",
  push: "SLOW PUSH",
  drift: "DRIFT",
  close: "CLOSE",
};

function initialDraft(moment: AlbumMomentView): SceneDraft {
  return {
    headline: moment.title || "제목 없는 순간",
    note: moment.memo || "",
    duration: 6,
    camera: "still",
  };
}

function FilmSession({ treeId, title, moments }: { treeId: string; title: string; moments: AlbumMomentView[] }) {
  const [order, setOrder] = useState(() => moments.map((moment) => moment.id));
  const [selectedId, setSelectedId] = useState(() => moments[0]?.id || "");
  const [drafts, setDrafts] = useState<Record<string, SceneDraft>>(() => Object.fromEntries(moments.map((moment) => [moment.id, initialDraft(moment)])));
  const [aspect, setAspect] = useState<Aspect>("16:9");
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);

  const orderedMoments = useMemo(() => order.map((id) => moments.find((moment) => moment.id === id)).filter(Boolean) as AlbumMomentView[], [moments, order]);
  const selectedIndex = Math.max(0, orderedMoments.findIndex((moment) => moment.id === selectedId));
  const selected = orderedMoments[selectedIndex] ?? orderedMoments[0];
  const selectedDraft = selected ? drafts[selected.id] : null;
  const totalSeconds = orderedMoments.reduce((sum, moment) => sum + (drafts[moment.id]?.duration ?? 6), 0);

  function selectAt(index: number) {
    if (!orderedMoments.length) return;
    const bounded = (index + orderedMoments.length) % orderedMoments.length;
    setSelectedId(orderedMoments[bounded].id);
    setPlayhead(bounded);
  }

  function moveScene(direction: -1 | 1) {
    if (!selected) return;
    const index = order.indexOf(selected.id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= order.length) return;
    const copy = [...order];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    setOrder(copy);
    setPlayhead(next);
  }

  function updateDraft(patch: Partial<SceneDraft>) {
    if (!selected) return;
    setDrafts((current) => ({ ...current, [selected.id]: { ...current[selected.id], ...patch } }));
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (["input", "textarea", "select", "button", "a"].includes(tag)) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (event.shiftKey) moveScene(-1);
      else selectAt(selectedIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (event.shiftKey) moveScene(1);
      else selectAt(selectedIndex + 1);
    } else if (event.key === " ") {
      event.preventDefault();
      setPlaying((value) => !value);
    }
  }

  if (!selected || !selectedDraft) return null;

  return (
    <main className={styles.page} onKeyDown={onKeyDown} tabIndex={0} data-track26-donor="film-session">
      <header className={styles.topbar}>
        <Link href="/v4">← LoveTree</Link>
        <div><strong>MEMORY FILM STUDIO</strong><small>TRACK26 · TOOLS DONOR PROOF</small></div>
        <span className={styles.sessionBadge}>SESSION ONLY · 저장되지 않음</span>
      </header>

      <section className={styles.hero}>
        <div><p>FILM ASSEMBLY LENS</p><h1>{title || "기억을 한 편의 필름처럼"}</h1></div>
        <p>기존 Moment를 읽어 장면 순서·프레이밍·길이를 시험합니다. 이 화면의 편집값은 브라우저 세션 상태일 뿐이며 canonical Moment를 수정하거나 저장하지 않습니다.</p>
      </section>

      <section className={styles.studio} aria-label="Track26 메모리 필름 스튜디오">
        <aside className={styles.storyboard}>
          <header><span>STORYBOARD</span><small>{orderedMoments.length} SCENES</small></header>
          <ol>
            {orderedMoments.map((moment, index) => (
              <li key={moment.id}>
                <button type="button" className={moment.id === selected.id ? styles.sceneActive : styles.sceneButton} onClick={() => { setSelectedId(moment.id); setPlayhead(index); }}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{drafts[moment.id]?.headline || moment.title || "제목 없는 순간"}</strong>
                  <small>{drafts[moment.id]?.duration ?? 6}s · {CAMERA_LABEL[drafts[moment.id]?.camera ?? "still"]}</small>
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.reorder}>
            <button type="button" onClick={() => moveScene(-1)} disabled={selectedIndex === 0}>장면 앞당기기</button>
            <button type="button" onClick={() => moveScene(1)} disabled={selectedIndex === orderedMoments.length - 1}>장면 뒤로</button>
          </div>
        </aside>

        <section className={styles.previewPane}>
          <div className={styles.previewHead}><span>PREVIEW MONITOR</span><small>{aspect} · {CAMERA_LABEL[selectedDraft.camera]}</small></div>
          <div className={`${styles.frame} ${styles[`aspect${aspect.replace(":", "x")}`]}`} data-playing={playing ? "true" : "false"}>
            <div className={styles.frameNoise} aria-hidden="true" />
            <div className={styles.sceneNumber}>SCENE {String(selectedIndex + 1).padStart(2, "0")}</div>
            <div className={styles.frameCopy}>
              <small>{selected.emotionTags.join(" · ") || selected.sourceType || "MEMORY"}</small>
              <h2>{selectedDraft.headline}</h2>
              <p>{selectedDraft.note || "이 Moment에는 아직 설명이 없습니다."}</p>
            </div>
            <div className={styles.mediaChip}>{selected.sourceType || "memory"} · canonical media reference</div>
          </div>
          <div className={styles.transport}>
            <button type="button" onClick={() => selectAt(selectedIndex - 1)} aria-label="이전 장면">←</button>
            <button type="button" className={styles.play} aria-pressed={playing} onClick={() => setPlaying((value) => !value)}>{playing ? "PAUSE" : "PLAY"}</button>
            <button type="button" onClick={() => selectAt(selectedIndex + 1)} aria-label="다음 장면">→</button>
          </div>
          <label className={styles.scrub}><span>TIMELINE · {totalSeconds}s</span><input aria-label="필름 장면 위치" type="range" min="0" max={Math.max(0, orderedMoments.length - 1)} value={playhead} onChange={(event) => { const next = Number(event.currentTarget.value); setPlayhead(next); selectAt(next); }} /></label>
        </section>

        <aside className={styles.inspector}>
          <header><span>SCENE INSPECTOR</span><small>EPHEMERAL DRAFT</small></header>
          <label>HEADLINE<input value={selectedDraft.headline} onChange={(event) => updateDraft({ headline: event.currentTarget.value })} /></label>
          <label>SCENE NOTE<textarea rows={4} value={selectedDraft.note} onChange={(event) => updateDraft({ note: event.currentTarget.value })} /></label>
          <label>DURATION · {selectedDraft.duration}s<input type="range" min="3" max="12" value={selectedDraft.duration} onChange={(event) => updateDraft({ duration: Number(event.currentTarget.value) })} /></label>
          <fieldset><legend>ASPECT</legend><div className={styles.chips}>{(["16:9", "9:16", "1:1", "4:5"] as Aspect[]).map((item) => <button type="button" key={item} aria-pressed={aspect === item} onClick={() => setAspect(item)}>{item}</button>)}</div></fieldset>
          <fieldset><legend>CAMERA</legend><div className={styles.chips}>{(["still", "push", "drift", "close"] as Camera[]).map((item) => <button type="button" key={item} aria-pressed={selectedDraft.camera === item} onClick={() => updateDraft({ camera: item })}>{CAMERA_LABEL[item]}</button>)}</div></fieldset>
          {selected.sourceUrl ? <a className={styles.mediaLink} href={selected.sourceUrl} target="_blank" rel="noreferrer">원본 미디어 열기 ↗</a> : <p className={styles.mediaMissing}>이 Moment에는 원본 media URL이 없습니다.</p>}
          <div className={styles.boundary}><strong>NO FAKE SAVE</strong><p>localStorage, POST, PUT, MediaRecorder 저장을 사용하지 않습니다. 장면 순서와 스타일은 이 proof 세션에만 존재합니다.</p></div>
          <Link className={styles.canonical} href={`/trees/${encodeURIComponent(treeId)}`}>canonical Tree에서 실제 Moment 관리 →</Link>
        </aside>
      </section>
      <footer className={styles.help}>←/→ 장면 선택 · Shift+←/→ 장면 재배열 · Space 재생 표시 · 터치 버튼 지원 · reduced-motion에서 프리뷰 모션 제거</footer>
    </main>
  );
}

export default function Track26MemoryFilmStudioDonor({ treeId }: { treeId: string }) {
  const { tree, albumMoments, loading, error } = useTreeMoments(treeId);

  if (!treeId) return <main className={styles.state}><h1>Memory Film Studio</h1><p>canonical Tree를 선택해야 film-session proof를 시작할 수 있습니다.</p><p>이 route는 demo Moment를 만들지 않습니다.</p><Link href="/v4">LoveTree에서 Tree 선택 →</Link></main>;
  if (loading) return <main className={styles.state}><p>canonical Moment를 불러오는 중입니다.</p></main>;
  if (error) return <main className={styles.state}><h1>Memory Film Studio</h1><p role="alert">{error}</p><Link href="/v4">LoveTree로 돌아가기</Link></main>;
  if (!albumMoments.length) return <main className={styles.state}><h1>{tree?.title || "Memory Film Studio"}</h1><p>편집할 canonical Moment가 없습니다. 가짜 장면은 생성하지 않습니다.</p><Link href={`/trees/${encodeURIComponent(treeId)}`}>canonical Tree 열기 →</Link></main>;

  const sessionKey = albumMoments.map((moment) => moment.id).join(":");
  return <FilmSession key={sessionKey} treeId={treeId} title={tree?.title || ""} moments={albumMoments} />;
}
