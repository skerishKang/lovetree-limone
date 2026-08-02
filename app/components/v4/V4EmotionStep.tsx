"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const EMOTIONS = ["설렘", "궁금함", "따뜻함", "벅참", "위로", "그리움"] as const;

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,3}):(\d{2})$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isFinite(minutes) || seconds < 0 || seconds > 59) return null;
  return minutes * 60 + seconds;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

interface DiscoveryRecord {
  treeName?: string;
  url?: string;
  videoId?: string;
  title?: string;
  note?: string;
  date?: string;
}

export default function V4EmotionStep() {
  const router = useRouter();
  const [discovery, setDiscovery] = useState<DiscoveryRecord>({
    treeName: "주연에게 마음이 멈춘 순간들",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    videoId: "dQw4w9WgXcQ",
    title: "처음 마음이 멈춘 장면",
    note: "우연히 보게 됐는데, 하루 종일 이 장면이 생각났어요.",
    date: "2026-07-28",
  });
  const [time, setTime] = useState("01:30");
  const [emotion, setEmotion] = useState<(typeof EMOTIONS)[number]>("설렘");
  const [customEmotion, setCustomEmotion] = useState("");
  const [memory, setMemory] = useState("처음엔 한 장면이었는데, 그 표정과 목소리가 계속 생각났어요.");
  const [date, setDate] = useState("2026-07-28");
  const [publicMemo, setPublicMemo] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("lovetree-v4-discovery") || "null") as DiscoveryRecord | null;
      if (saved) {
        setDiscovery((current) => ({ ...current, ...saved }));
        if (saved.date) setDate(saved.date);
      }
    } catch {
      // Fixture fallback remains visible when stored preview data is malformed.
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const thumbnail = useMemo(
    () => discovery.videoId ? `https://img.youtube.com/vi/${discovery.videoId}/hqdefault.jpg` : "",
    [discovery.videoId],
  );

  const selectedEmotion = customEmotion.trim() || emotion;

  function changeSeconds(delta: number) {
    const parsed = parseTime(time);
    setTime(formatTime((parsed ?? 0) + delta));
  }

  function saveEmotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const seconds = parseTime(time);
    if (seconds === null) {
      setToast("영상 시간은 01:30 형식으로 적어 주세요.");
      return;
    }

    const record = {
      ...discovery,
      time: formatTime(seconds),
      emotion: selectedEmotion,
      note: memory.trim() || "이 장면을 다시 보고 싶어서 첫 마음으로 남겼어요.",
      date,
      publicMemo,
    };
    localStorage.setItem("lovetree-v4-emotion", JSON.stringify(record));
    setSuccess(true);
    setToast("첫 마음 카드가 피어났어요 ✦");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="v4-page">
      <div className="v4-shell">
        <header className="v4-top">
          <button className="v4-back" type="button" onClick={() => router.push("/v4")}>← 처음 발견으로</button>
          <div className="v4-brand"><span className="v4-brand-mark" aria-hidden="true"><i /><b /></span>LoveTree</div>
          <span className="v4-step-label">STEP 02 · HEART</span>
        </header>

        <div className="v4-journey-progress" aria-label="러브트리 시작 진행률">
          <div className="v4-progress-item is-done"><i>01</i><span>처음 발견</span></div>
          <div className="v4-progress-item is-active"><i>02</i><span>마음 남기기</span></div>
          <div className="v4-progress-item"><i>03</i><span>다음 순간 연결</span></div>
          <div className="v4-progress-item"><i>04</i><span>첫 나무</span></div>
        </div>

        {!success ? (
          <section className="v4-layout" aria-labelledby="v4-emotion-title">
            <div className="v4-copy">
              <p className="v4-eyebrow">02 · 마음 남기기</p>
              <h1 id="v4-emotion-title">
                <span>그 장면에서</span>
                <span className="v4-soft-line">마음이 멈춘</span>
                <span className="v4-rose-line">정확한 순간은 언제였나요?</span>
              </h1>
              <p>
                영상의 한 지점과 그때의 감정을 함께 남겨 주세요. 나중에 다시 펼쳤을 때
                왜 이 장면이 시작이었는지 바로 떠올릴 수 있어요.
              </p>

              <article className="v4-connected-card">
                <span className="v4-tape" aria-hidden="true" />
                <div className="v4-video-frame" style={thumbnail ? { backgroundImage: `linear-gradient(180deg,rgba(255,248,239,.05),rgba(62,41,42,.26)),url(${thumbnail})` } : undefined}>
                  <button className="v4-play" type="button" aria-label="영상 미리보기" onClick={() => setToast("최종 검증 단계에서 실제 영상 재생을 확인합니다.")}>▶</button>
                  <span className="v4-video-badge">FIRST DISCOVERY</span>
                  <span className="v4-video-time">{time}</span>
                </div>
                <div className="v4-connected-meta">
                  <small>ROOT MOMENT · {date || "날짜 미정"}</small>
                  <strong>{discovery.title || "처음 마음이 멈춘 장면"}</strong>
                  <p>{discovery.url}</p>
                </div>
                <div className="v4-scene-strip">
                  <span>장면 시점</span>
                  <input className="v4-input" aria-label="영상 시점" value={time} onChange={(event) => setTime(event.target.value)} />
                  <button type="button" onClick={() => changeSeconds(-5)}>-5초</button>
                  <button type="button" onClick={() => changeSeconds(5)}>+5초</button>
                </div>
              </article>
            </div>

            <form className="v4-form-paper" onSubmit={saveEmotion}>
              <div className="v4-form-head">
                <div>
                  <h2>그때의 마음을 적어 주세요</h2>
                  <p>대표 감정 하나와 짧은 문장이 한 장의 마음 카드가 됩니다.</p>
                </div>
                <span className="v4-form-icon" aria-hidden="true">♥</span>
              </div>

              <div className="v4-group">
                <span className="v4-label">가장 가까운 감정 <small>하나를 고르거나 직접 입력</small></span>
                <div className="v4-chips" role="group" aria-label="감정 선택">
                  {EMOTIONS.map((item) => (
                    <button
                      className={`v4-chip${!customEmotion && emotion === item ? " is-selected" : ""}`}
                      type="button"
                      key={item}
                      onClick={() => { setEmotion(item); setCustomEmotion(""); }}
                    >
                      {item}
                    </button>
                  ))}
                  <input
                    className="v4-custom-emotion"
                    aria-label="직접 감정 입력"
                    placeholder="직접 적기"
                    maxLength={20}
                    value={customEmotion}
                    onChange={(event) => setCustomEmotion(event.target.value)}
                  />
                </div>
              </div>

              <div className="v4-group">
                <label className="v4-label" htmlFor="v4-memory">그 장면이 왜 남았나요? <small>{memory.length} / 140</small></label>
                <div className="v4-counter-wrap">
                  <textarea id="v4-memory" className="v4-textarea" maxLength={140} value={memory} onChange={(event) => setMemory(event.target.value)} />
                  <span className="v4-counter">{memory.length} / 140</span>
                </div>
              </div>

              <div className="v4-group">
                <label className="v4-label" htmlFor="v4-emotion-date">기록 날짜 <small>처음 발견한 날</small></label>
                <input id="v4-emotion-date" className="v4-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>

              <div className="v4-group v4-toggle-row">
                <div>
                  <span className="v4-label">이 메모를 공개할까요?</span>
                  <p className="v4-field-status">꺼두면 나만 보는 마음 기록으로 남습니다.</p>
                </div>
                <button
                  className={`v4-toggle${publicMemo ? " is-on" : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={publicMemo}
                  aria-label="메모 공개 여부"
                  onClick={() => setPublicMemo((value) => !value)}
                />
              </div>

              <div className="v4-actions-row">
                <button className="v4-primary" type="submit">이 마음 남기기 →</button>
                <span className="v4-form-hint">저장 후 다음 순간을 연결합니다.</span>
              </div>
            </form>
          </section>
        ) : (
          <section className="v4-success-card" aria-labelledby="v4-emotion-success">
            <div className="v4-success-symbol" aria-hidden="true">♥</div>
            <p className="v4-eyebrow">YOUR FIRST HEART CARD</p>
            <h2 id="v4-emotion-success">첫 마음 카드가 피어났어요.</h2>
            <p>
              <strong>{selectedEmotion} · {time}</strong><br />
              {memory || "이 장면을 다시 보고 싶어서 첫 마음으로 남겼어요."}<br />
              {date || "날짜 미정"} · {publicMemo ? "공개 메모" : "나만 보는 메모"}
            </p>
            <div className="v4-hero-actions" style={{ justifyContent: "center" }}>
              <button className="v4-secondary" type="button" onClick={() => setSuccess(false)}>수정하기</button>
              <button className="v4-primary" type="button" onClick={() => router.push("/v4/trees/demo/onboarding/connect")}>다음 순간 연결하기 →</button>
            </div>
          </section>
        )}
      </div>

      {toast ? <div className="v4-toast" role="status" aria-live="polite">{toast}</div> : null}
    </main>
  );
}
