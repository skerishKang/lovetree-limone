"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useState } from "react";
import {
  createCinematicStoryPlaybackState,
  reduceCinematicStoryPlayback,
  type CinematicStoryChapter,
  type CinematicStoryPlaybackAction,
} from "@/lib/cinematic-story-playback";
import "@/app/styles/cinematic-story-playback.css";

const CHAPTERS = [
  { id: "glimpse", title: "처음 마주친 순간", momentLabel: "처음 저장한 장면", startProgress: 0 },
  { id: "breath", title: "기억의 숨", momentLabel: "표정과 목소리가 남은 순간", startProgress: 0.12 },
  { id: "detail", title: "조금 더 가까이", momentLabel: "작은 디테일을 발견한 순간", startProgress: 0.24 },
  { id: "save", title: "이 순간 저장", momentLabel: "내 기억으로 남긴 순간", startProgress: 0.38 },
  { id: "connection", title: "왜 다음으로 이어졌을까", momentLabel: "Connection을 설명한 순간", startProgress: 0.52 },
  { id: "next", title: "다음 순간", momentLabel: "새로운 Moment를 만난 순간", startProgress: 0.66 },
  { id: "field", title: "기억이 쌓이는 곳", momentLabel: "여러 Moment가 한 시야에 모인 순간", startProgress: 0.78 },
  { id: "tree", title: "나의 LoveTree", momentLabel: "시간이 한 그루의 이야기로 보이는 순간", startProgress: 0.9 },
] as const satisfies readonly CinematicStoryChapter[];

const STORY_DURATION_SECONDS = 80;

const formatTime = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

export default function CinematicPlaybackPrototypePage() {
  const reducer = useMemo(
    () => (state: ReturnType<typeof createCinematicStoryPlaybackState>, action: CinematicStoryPlaybackAction) =>
      reduceCinematicStoryPlayback(state, action, CHAPTERS),
    [],
  );
  const [state, dispatch] = useReducer(reducer, createCinematicStoryPlaybackState(CHAPTERS, STORY_DURATION_SECONDS));
  const [announcement, setAnnouncement] = useState("재생 전 상태입니다. 사용자가 언제든 재생권을 가져올 수 있습니다.");

  const activeChapter = CHAPTERS.find((chapter) => chapter.id === state.activeChapterId) ?? CHAPTERS[0];
  const activeIndex = CHAPTERS.findIndex((chapter) => chapter.id === activeChapter.id);

  useEffect(() => {
    if (state.mode !== "playing") return;
    const timer = window.setInterval(() => dispatch({ type: "advance", deltaSeconds: 0.25 }), 250);
    return () => window.clearInterval(timer);
  }, [state.mode]);

  useEffect(() => {
    if (state.mode === "ended") setAnnouncement("스토리가 끝났습니다. 다시 재생하면 처음부터 시작합니다.");
  }, [state.mode]);

  const playPause = () => {
    if (state.mode === "playing") {
      dispatch({ type: "pause" });
      setAnnouncement("스토리 안내 재생을 일시정지했습니다.");
    } else {
      dispatch({ type: "play" });
      setAnnouncement(state.mode === "ended" ? "처음부터 스토리를 다시 재생합니다." : "스토리 안내 재생을 시작합니다.");
    }
  };

  const manualTakeover = (progress = state.progress, source = "수동 탐색") => {
    dispatch({ type: "manual-takeover", progress });
    setAnnouncement(`${source}이 감지되어 자동재생을 멈추고 현재 위치를 사용자에게 넘겼습니다.`);
  };

  const seekChapter = (chapter: CinematicStoryChapter) => {
    manualTakeover(chapter.startProgress, `${chapter.title} 선택`);
  };

  return (
    <main className="lt-cinematic-playback">
      <header className="lt-cinematic-playback__header">
        <div>
          <Link href="/design-lab" className="lt-cinematic-playback__back">← Design Lab</Link>
          <p className="lt-cinematic-playback__eyebrow">CAP-13 · INTERNAL MECHANIC PROTOTYPE · ISSUE #116</p>
          <h1>스토리가 안내하되,<br />움직일 권리는 항상 사용자에게 있습니다.</h1>
          <p className="lt-cinematic-playback__lede">
            하나의 Moment 이야기를 80초 시간축으로 재생하면서 chapter·progress·time을 같은 상태에서 계산합니다.
            wheel, touch, scrub, chapter 선택 같은 수동 입력이 들어오면 자동 안내는 즉시 멈춥니다.
          </p>
        </div>
        <span className="lt-cinematic-playback__badge">OBSERVED → PROTOTYPE CANDIDATE</span>
      </header>

      <section
        className={`lt-cinematic-playback__stage is-${state.mode}`}
        aria-labelledby="cinematic-stage-title"
        onWheel={() => manualTakeover(state.progress, "Wheel 입력")}
        onTouchStart={() => manualTakeover(state.progress, "Touch 입력")}
      >
        <div className="lt-cinematic-playback__story-card">
          <span className="lt-cinematic-playback__chapter-number">{String(activeIndex + 1).padStart(2, "0")}</span>
          <div>
            <p>ACTIVE CHAPTER</p>
            <h2 id="cinematic-stage-title">{activeChapter.title}</h2>
            <strong>{activeChapter.momentLabel}</strong>
          </div>
        </div>

        <div className="lt-cinematic-playback__chapters" aria-label="스토리 chapter">
          {CHAPTERS.map((chapter, index) => (
            <button
              type="button"
              key={chapter.id}
              className={chapter.id === activeChapter.id ? "is-active" : ""}
              aria-current={chapter.id === activeChapter.id ? "step" : undefined}
              onClick={() => seekChapter(chapter)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {chapter.title}
            </button>
          ))}
        </div>

        <div className="lt-cinematic-playback__transport" aria-label="시네마틱 스토리 재생 제어">
          <div className="lt-cinematic-playback__transport-row">
            <button type="button" className="lt-cinematic-playback__play" onClick={playPause} aria-pressed={state.mode === "playing"}>
              {state.mode === "playing" ? "일시정지" : state.mode === "ended" ? "다시 재생" : "스토리 재생"}
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "restart" });
                setAnnouncement("처음부터 스토리 안내 재생을 시작했습니다.");
              }}
            >
              처음부터
            </button>
            <button type="button" onClick={() => manualTakeover(state.progress, "명시적 Take Over")}>내가 직접 볼게요</button>
            <span className={`lt-cinematic-playback__mode is-${state.takeover}`}>
              {state.takeover === "manual" ? "MANUAL CONTROL" : state.mode.toUpperCase()}
            </span>
          </div>

          <label className="lt-cinematic-playback__scrubber">
            <span className="lt-cinematic-playback__time">{formatTime(state.elapsedSeconds)}</span>
            <input
              type="range"
              min="0"
              max="1000"
              value={Math.round(state.progress * 1000)}
              aria-label="스토리 위치"
              onChange={(event) => manualTakeover(Number(event.target.value) / 1000, "Scrub")}
            />
            <span className="lt-cinematic-playback__time">{formatTime(state.durationSeconds)}</span>
          </label>

          <div className="lt-cinematic-playback__progress" aria-hidden="true">
            <i style={{ width: `${state.progress * 100}%` }} />
          </div>
        </div>
      </section>

      <section className="lt-cinematic-playback__rules" aria-label="CAP-13 핵심 규칙">
        <article>
          <span>01</span>
          <h2>One derived state</h2>
          <p>시간, 진행률, 현재 chapter는 서로 다른 타이머가 아니라 하나의 progress 상태에서 결정됩니다.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Manual input wins</h2>
          <p>사용자가 직접 탐색하는 순간 자동 안내를 멈춥니다. 다시 재생하는 선택도 사용자에게 있습니다.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Motion is optional</h2>
          <p>reduced-motion 환경에서는 장식 전환을 거의 제거하되 재생·탐색·chapter 의미는 그대로 유지합니다.</p>
        </article>
      </section>

      <div className="lt-cinematic-playback__live" aria-live="polite" aria-atomic="true">{announcement}</div>

      <footer className="lt-cinematic-playback__footer">
        <span>Prototype mechanics only · synthetic LoveTree chapters · no forced page auto-scroll / network / Auth / DB</span>
        <span>Source fingerprint: 29,743 bytes · SHA256 a5f462c4…500239dc</span>
      </footer>
    </main>
  );
}
