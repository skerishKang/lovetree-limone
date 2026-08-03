"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const RELATIONS = [
  "이 장면이 궁금해서",
  "같은 사람이 나와서",
  "비슷한 감정이 이어져서",
  "추천을 따라가다가",
  "문득 다시 생각나서",
] as const;

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

function validTime(value: string) {
  const match = value.trim().match(/^(\d{1,3}):(\d{2})$/);
  if (!match) return false;
  return Number(match[2]) >= 0 && Number(match[2]) <= 59;
}

interface EmotionRecord {
  videoId?: string;
  title?: string;
  note?: string;
  time?: string;
  emotion?: string;
  date?: string;
}

function getSavedEmotion(): EmotionRecord | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("lovetree-v4-emotion") || "null") as EmotionRecord | null;
  } catch {
    return null;
  }
}

export default function V4ConnectStep() {
  const router = useRouter();
  const savedEmotion = getSavedEmotion();
  const [first, setFirst] = useState<EmotionRecord>(() => {
    const base: EmotionRecord = {
      videoId: "dQw4w9WgXcQ",
      title: "처음 마음이 멈춘 장면",
      note: "처음엔 한 장면이었는데, 그 표정과 목소리가 계속 생각났어요.",
      time: "01:30",
      emotion: "설렘",
      date: "2026-07-28",
    };
    return savedEmotion ? { ...base, ...savedEmotion } : base;
  });
  const [nextUrl, setNextUrl] = useState("https://www.youtube.com/watch?v=ysz5S6PUM-U");
  const [nextTitle, setNextTitle] = useState("그 장면 뒤에 다시 찾아본 영상");
  const [nextTime, setNextTime] = useState("00:42");
  const [relation, setRelation] = useState<(typeof RELATIONS)[number]>(RELATIONS[0]);
  const [nextNote, setNextNote] = useState("첫 장면을 본 뒤 이 영상까지 찾아보게 됐어요.");
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const nextVideoId = useMemo(() => youtubeId(nextUrl), [nextUrl]);
  const firstThumb = first.videoId ? `https://img.youtube.com/vi/${first.videoId}/hqdefault.jpg` : "";
  const nextThumb = nextVideoId ? `https://img.youtube.com/vi/${nextVideoId}/hqdefault.jpg` : "";

  function saveConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextVideoId) {
      setToast("YouTube 링크를 확인해 주세요.");
      return;
    }
    if (!validTime(nextTime)) {
      setToast("영상 시간은 01:30 형식으로 적어 주세요.");
      return;
    }

    const next = {
      videoId: nextVideoId,
      url: nextUrl.trim(),
      title: nextTitle.trim() || "다음으로 찾아본 영상",
      time: nextTime.trim(),
      relation,
      note: nextNote.trim() || "첫 장면을 본 뒤 이 영상까지 찾아보게 됐어요.",
    };
    localStorage.setItem(
      "lovetree-v4-connection",
      JSON.stringify({ first, next, createdAt: new Date().toISOString() }),
    );
    setSuccess(true);
    setToast("첫 가지가 이어졌어요 ✦");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function continueFromNext() {
    setFirst({
      videoId: nextVideoId,
      title: nextTitle.trim() || "다음으로 찾아본 영상",
      note: nextNote.trim(),
      time: nextTime,
      emotion: first.emotion,
      date: new Date().toISOString().slice(0, 10),
    });
    setNextUrl("");
    setNextTitle("");
    setNextTime("00:00");
    setNextNote("");
    setRelation(RELATIONS[0]);
    setSuccess(false);
    setToast("방금 연결한 영상에서 다음 가지를 시작해요.");
  }

  return (
    <main className="v4-page">
      <div className="v4-shell">
        <header className="v4-top">
          <button className="v4-back" type="button" onClick={() => router.push("/v4/trees/demo/onboarding/emotion")}>← 마음 카드로</button>
          <div className="v4-brand"><span className="v4-brand-mark" aria-hidden="true"><i /><b /></span>LoveTree</div>
          <span className="v4-step-label">STEP 03 · CONNECT</span>
        </header>

        <div className="v4-journey-progress" aria-label="러브트리 시작 진행률">
          <div className="v4-progress-item is-done"><i>01</i><span>처음 발견</span></div>
          <div className="v4-progress-item is-done"><i>02</i><span>마음 남기기</span></div>
          <div className="v4-progress-item is-active"><i>03</i><span>다음 순간 연결</span></div>
          <div className="v4-progress-item"><i>04</i><span>첫 나무</span></div>
        </div>

        {!success ? (
          <section className="v4-connect-layout" aria-labelledby="v4-connect-title">
            <div className="v4-copy">
              <p className="v4-eyebrow">03 · 다음 순간 연결</p>
              <h1 id="v4-connect-title">
                <span>첫 장면은</span>
                <span className="v4-soft-line">어떤 마음을 따라</span>
                <span className="v4-rose-line">다음 순간으로 이어졌나요?</span>
              </h1>
              <p>
                두 장면 사이에 있었던 이유를 남겨 주세요. 시간순서만이 아니라 마음이 움직인 경로가
                첫 번째 가지가 됩니다.
              </p>

              <article className="v4-connection-board">
                <div className="v4-board-label"><span>FIRST BRANCH</span><span>두 순간을 함께 보며 연결해요</span></div>
                <div className="v4-connect-canvas">
                  <svg className="v4-branch-svg" viewBox="0 0 620 425" aria-hidden="true">
                    <defs>
                      <linearGradient id="v4-branch-gradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#c86e79" />
                        <stop offset="1" stopColor="#879975" />
                      </linearGradient>
                    </defs>
                    <path className={`v4-branch-path${nextVideoId ? " is-connected" : ""}`} d="M185 144 C275 135 304 250 415 284" />
                    <path d="M300 217 C284 184 273 171 253 158" fill="none" stroke="#879975" strokeWidth="3" strokeLinecap="round" opacity={nextVideoId ? 0.85 : 0.28} />
                    <path d="M325 242 C349 214 366 206 389 201" fill="none" stroke="#c86e79" strokeWidth="3" strokeLinecap="round" opacity={nextVideoId ? 0.85 : 0.28} />
                  </svg>

                  <article className="v4-moment-card is-first">
                    <span className="v4-card-number">01</span>
                    <div className="v4-thumb" style={firstThumb ? { backgroundImage: `linear-gradient(180deg,rgba(255,246,233,.05),rgba(52,38,39,.29)),url(${firstThumb})` } : undefined} />
                    <div className="v4-card-copy">
                      <small>{(first.emotion || "첫 마음").toUpperCase()} · {first.time || "01:30"}</small>
                      <strong>{first.title || "처음 마음이 멈춘 장면"}</strong>
                      <p>{first.note || "이 장면이 첫 뿌리가 됐어요."}</p>
                    </div>
                  </article>

                  <div className="v4-relation-bubble">{relation}</div>

                  <article className={`v4-moment-card is-next${nextVideoId ? "" : " is-waiting"}`}>
                    <span className="v4-card-number">02</span>
                    <div className="v4-thumb" style={nextThumb ? { backgroundImage: `linear-gradient(180deg,rgba(255,246,233,.05),rgba(52,38,39,.29)),url(${nextThumb})` } : undefined}>
                      {!nextVideoId ? <span className="v4-empty-seed" aria-hidden="true">✦</span> : null}
                    </div>
                    <div className="v4-card-copy">
                      <small>NEXT MOMENT · {nextTime || "00:00"}</small>
                      <strong>{nextTitle.trim() || "다음 순간을 기다리고 있어요"}</strong>
                      <p>{nextNote.trim() || "링크와 문장을 넣으면 이 카드가 피어납니다."}</p>
                    </div>
                  </article>
                </div>
              </article>
            </div>

            <form className="v4-form-paper" onSubmit={saveConnection}>
              <div className="v4-form-head">
                <div>
                  <h2>다음으로 찾아본 순간</h2>
                  <p>영상과 관계 이유를 입력하면 왼쪽의 첫 가지가 완성됩니다.</p>
                </div>
                <span className="v4-form-icon" aria-hidden="true">↗</span>
              </div>

              <div className="v4-group">
                <label className="v4-label" htmlFor="v4-next-url">다음 영상 URL <small>YouTube 링크</small></label>
                <input id="v4-next-url" className="v4-input" value={nextUrl} onChange={(event) => setNextUrl(event.target.value)} />
                <p className="v4-field-status" style={nextVideoId ? { color: "var(--v4-sage-deep)" } : undefined}>
                  {nextVideoId ? "다음 영상이 오른쪽 카드에 연결됐어요." : "링크를 넣으면 오른쪽 카드에 썸네일이 나타나요."}
                </p>
                <div className="v4-title-time">
                  <input className="v4-input" aria-label="다음 영상 제목" placeholder="영상 제목" value={nextTitle} onChange={(event) => setNextTitle(event.target.value)} />
                  <input className="v4-input" aria-label="다음 영상 시점" value={nextTime} onChange={(event) => setNextTime(event.target.value)} />
                </div>
              </div>

              <div className="v4-group">
                <span className="v4-label">왜 이 순간으로 이어졌나요? <small>관계 이유</small></span>
                <div className="v4-relations" role="group" aria-label="관계 이유 선택">
                  {RELATIONS.map((item) => (
                    <button
                      className={`v4-relation${relation === item ? " is-selected" : ""}`}
                      type="button"
                      key={item}
                      onClick={() => setRelation(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="v4-group">
                <label className="v4-label" htmlFor="v4-next-note">다음 순간에 남길 문장 <small>{nextNote.length} / 140</small></label>
                <div className="v4-counter-wrap">
                  <textarea id="v4-next-note" className="v4-textarea" maxLength={140} value={nextNote} onChange={(event) => setNextNote(event.target.value)} />
                  <span className="v4-counter">{nextNote.length} / 140</span>
                </div>
              </div>

              <div className="v4-actions-row">
                <button className="v4-primary" type="submit">첫 가지 연결하기 →</button>
                <span className="v4-form-hint">두 카드와 관계 문장이 함께 저장됩니다.</span>
              </div>
            </form>
          </section>
        ) : (
          <section className="v4-success-card" aria-labelledby="v4-connect-success">
            <div className="v4-success-symbol" aria-hidden="true">✦</div>
            <p className="v4-eyebrow">YOUR FIRST BRANCH</p>
            <h2 id="v4-connect-success">첫 가지가 이어졌어요.</h2>
            <p>
              <strong>{first.title || "첫 순간"}</strong><br />
              <span style={{ color: "var(--v4-sage-deep)" }}>↳ {relation}</span><br />
              <strong>{nextTitle || "다음 순간"}</strong>
            </p>
            <div className="v4-hero-actions" style={{ justifyContent: "center" }}>
              <button className="v4-secondary" type="button" onClick={continueFromNext}>이어서 한 번 더 기록</button>
              <button className="v4-primary" type="button" onClick={() => router.push("/v4/trees/demo")}>첫 나무 열기 →</button>
            </div>
          </section>
        )}
      </div>

      {toast ? <div className="v4-toast" role="status" aria-live="polite">{toast}</div> : null}
    </main>
  );
}
