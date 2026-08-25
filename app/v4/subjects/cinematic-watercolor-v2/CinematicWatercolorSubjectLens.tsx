"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import {
  V4_SUBJECT_ALBUMS,
  V4_SUBJECT_ARCHIVE_ROUTES,
  v4SubjectPosterUrl,
} from "@/app/components/v4/v4-subject-albums";
import styles from "./cinematic-watercolor-subject.module.css";

const SOURCE_PHASES = [
  {
    id: "ONE_MOMENT",
    eyebrow: "One Moment",
    title: "한 대상을, 한 장면처럼",
    copy: "현재 SUBJECT 앨범의 기록을 바꾸지 않고 첫인상만 더 천천히 엽니다.",
  },
  {
    id: "AWAKENING",
    eyebrow: "Awakening",
    title: "여백 위로 기억이 깨어나고",
    copy: "청록과 장미빛 워시가 사진의 앞뒤를 지나며 시선을 한 곳에 머물게 합니다.",
  },
  {
    id: "CONNECTION",
    eyebrow: "Connection",
    title: "장면 사이에는 흐름이 생기고",
    copy: "새 Connection 데이터를 만들지 않고, 연결감을 크로스페이드와 카메라 호흡으로만 표현합니다.",
  },
  {
    id: "SEASON",
    eyebrow: "Season",
    title: "기억의 결이 한 화면에 피어나고",
    copy: "Season 상태를 발명하지 않고 수채화 경로와 에디토리얼 구도로 축적의 감정만 전달합니다.",
  },
  {
    id: "LIVING_ARCHIVE",
    eyebrow: "Living Archive",
    title: "카드가 아니라 전면의 챕터로",
    copy: "기존 앨범의 사람·작품·여행·계절 데이터는 그대로 두고 감상 진입의 밀도만 높입니다.",
  },
  {
    id: "SEASON_COVER",
    eyebrow: "Subject Cover",
    title: "이제, 원래의 앨범으로",
    copy: "시네마틱은 입구에서 끝납니다. 검색·필터·Moment 수·Tree 수·아카이브 선택 권한은 기존 /v4/subjects가 계속 소유합니다.",
  },
] as const;

// Source V2 hero timing: 0–2.2–5.55–8.2–11.1–12.15s.
const SOURCE_PHASE_DURATIONS_MS = [2200, 3350, 2650, 2900, 1050] as const;
const LAST_PHASE_INDEX = SOURCE_PHASES.length - 1;
const SWIPE_THRESHOLD_PX = 42;

function clampPhase(index: number) {
  return Math.max(0, Math.min(LAST_PHASE_INDEX, index));
}

export default function CinematicWatercolorSubjectLens() {
  const [activePhase, setActivePhase] = useState(0);
  const [selectedSubjectId, setSelectedSubjectId] = useState(V4_SUBJECT_ALBUMS[0].id);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const pointerStartX = useRef<number | null>(null);

  const selectedSubject = useMemo(
    () => V4_SUBJECT_ALBUMS.find((subject) => subject.id === selectedSubjectId) ?? V4_SUBJECT_ALBUMS[0],
    [selectedSubjectId],
  );
  const phase = SOURCE_PHASES[activePhase];
  const archiveRoute = V4_SUBJECT_ARCHIVE_ROUTES[selectedSubject.archive];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReducedMotion(media.matches);
      setMotionReady(true);
      if (media.matches) {
        setActivePhase(LAST_PHASE_INDEX);
        setPlaying(false);
      } else {
        setPlaying(true);
      }
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!motionReady || reducedMotion || !playing || activePhase >= LAST_PHASE_INDEX) return;
    const timer = window.setTimeout(() => {
      setActivePhase((current) => {
        const next = clampPhase(current + 1);
        if (next === LAST_PHASE_INDEX) setPlaying(false);
        return next;
      });
    }, SOURCE_PHASE_DURATIONS_MS[activePhase]);
    return () => window.clearTimeout(timer);
  }, [activePhase, motionReady, playing, reducedMotion]);

  function moveTo(index: number, stopPlayback = true) {
    setActivePhase(clampPhase(index));
    if (stopPlayback) setPlaying(false);
  }

  function replay() {
    setActivePhase(reducedMotion ? LAST_PHASE_INDEX : 0);
    setPlaying(!reducedMotion);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveTo(activePhase + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveTo(activePhase - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveTo(LAST_PHASE_INDEX);
    } else if (event.key === " " && !reducedMotion) {
      event.preventDefault();
      setPlaying((current) => !current && activePhase < LAST_PHASE_INDEX);
    }
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStartX.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    const start = pointerStartX.current;
    pointerStartX.current = null;
    if (start === null) return;
    const delta = event.clientX - start;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    moveTo(activePhase + (delta < 0 ? 1 : -1));
  }

  function selectSubject(id: string) {
    setSelectedSubjectId(id);
    setActivePhase(reducedMotion ? LAST_PHASE_INDEX : 0);
    setPlaying(!reducedMotion);
  }

  return (
    <section
      className={styles.lens}
      data-cinematic-watercolor-subject-lens="true"
      data-source-phase={phase.id}
      data-phase-index={activePhase}
      data-motion={reducedMotion ? "reduced" : "full"}
      data-product-boundary="visual-presentation-donor-only"
      aria-label="Cinematic Watercolor SUBJECT lens"
    >
      <div
        className={styles.stage}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { pointerStartX.current = null; }}
        aria-describedby="cinematic-watercolor-status"
      >
        <div
          className={styles.poster}
          role="img"
          aria-label={`${selectedSubject.name} 앨범 대표 장면`}
          style={{ backgroundImage: `url(${v4SubjectPosterUrl(selectedSubject)})` }}
        />
        <div className={styles.inkVeil} aria-hidden="true" />
        <div className={styles.ribbonA} aria-hidden="true" />
        <div className={styles.ribbonB} aria-hidden="true" />
        <div className={styles.paperNoise} aria-hidden="true" />

        <header className={styles.header}>
          <Link href="/v4/subjects" className={styles.brand}>LoveTree</Link>
          <span>CINEMATIC WATERCOLOR · SUBJECT DONOR</span>
          <button type="button" onClick={replay} className={styles.replay}>Replay</button>
        </header>

        <div className={styles.copy} key={`${selectedSubject.id}-${phase.id}`}>
          <span className={styles.eyebrow}>{phase.eyebrow} · {String(activePhase + 1).padStart(2, "0")}</span>
          <h1>{phase.title}</h1>
          <p>{phase.copy}</p>
          <div className={styles.subjectMeta}>
            <strong>{selectedSubject.name}</strong>
            <span>{selectedSubject.group} · {selectedSubject.moments} MOMENTS · {selectedSubject.trees} TREES</span>
          </div>
          {activePhase === LAST_PHASE_INDEX ? (
            <div className={styles.finalActions}>
              <Link href={archiveRoute}>선택한 앨범으로 <span aria-hidden="true">→</span></Link>
              <a href="#subject-library">SUBJECT 라이브러리 보기</a>
            </div>
          ) : null}
        </div>

        <div className={styles.controls} aria-label="시네마틱 단계">
          <button
            type="button"
            className={styles.transport}
            onClick={() => setPlaying((current) => !current && activePhase < LAST_PHASE_INDEX)}
            disabled={reducedMotion || activePhase >= LAST_PHASE_INDEX}
            aria-label={playing ? "Pause cinematic" : "Play cinematic"}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <div className={styles.phaseRail}>
            {SOURCE_PHASES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === activePhase ? styles.phaseActive : styles.phaseButton}
                onClick={() => moveTo(index)}
                aria-current={index === activePhase ? "step" : undefined}
                aria-label={`${index + 1}. ${item.eyebrow}`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
          <span className={styles.hint}>← → · swipe</span>
        </div>
      </div>

      <div className={styles.subjectStrip} aria-label="현재 SUBJECT 앨범 선택">
        <div className={styles.subjectStripIntro}>
          <span>Current /v4/subjects authority</span>
          <strong>시네마틱으로 먼저 만나볼 대상</strong>
        </div>
        <div className={styles.subjectButtons}>
          {V4_SUBJECT_ALBUMS.map((subject) => (
            <button
              type="button"
              key={subject.id}
              onClick={() => selectSubject(subject.id)}
              aria-pressed={subject.id === selectedSubject.id}
              aria-label={`${subject.name} 보기`}
            >
              <span style={{ background: subject.color }} aria-hidden="true" />
              <b>{subject.name}</b>
              <small>{subject.group}</small>
            </button>
          ))}
        </div>
      </div>

      <p id="cinematic-watercolor-status" className={styles.srOnly} aria-live="polite">
        {phase.eyebrow}. {selectedSubject.name}. {playing ? "자동 진행 중" : "수동 탐색"}.
      </p>
    </section>
  );
}
