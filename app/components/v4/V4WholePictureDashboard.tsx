"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "../../styles/v4/whole-picture-dashboard.css";

export const WPD_SOURCE = "lovetree-whole-picture-memory-dashboard-v1.html";
export const WPD_KEY = "lovetree-whole-picture-memory-dashboard-v1";
export const WPD_ROUTE = "/v4/labs/whole-picture-memory-dashboard";

/* ------------------------------------------------------------------ */
/* V4 demo data — the source HTML is a static prototype. All numbers   */
/* below are the source's demo values. Nothing connects to DB/API.     */
/* ------------------------------------------------------------------ */

interface WpdMoment {
  video: string;
  person: string;
  title: string;
  mood: string;
  date: string;
  pct: string;
}

interface WpdQuestion {
  view: string;
  label: string;
  answer: string;
  bullets: string[];
}

export const WPD_QUESTIONS: WpdQuestion[] = [
  {
    view: "stand",
    label: "지금 내 마음은 어디에 있나요",
    answer: "한 사람을 좋아한 시간이 지금 어느 정도 자랐는지 보여줘요.",
    bullets: [
      "영상 93개가 한 그루에 연결됨",
      "설렘과 위로가 가장 큰 감정",
      "첫 번째 계절 완성까지 7개 남음",
    ],
  },
  {
    view: "changed",
    label: "처음과 무엇이 달라졌나요",
    answer: "처음 저장한 장면과 최근에 남긴 장면 사이의 감정 변화를 살펴봐요.",
    bullets: [
      "짧은 무대 영상에서 인터뷰까지 확장",
      "설렘보다 편안함 기록이 증가",
      "세 사람의 기억이 각자 다른 가지로 성장",
    ],
  },
  {
    view: "future",
    label: "다음에는 어떤 모습이 될까요",
    answer: "지금의 속도와 감정을 바탕으로 다음 계절의 모습을 미리 보여줘요.",
    bullets: [
      "7개를 더하면 첫 시즌 완성",
      "회복 가지가 가장 먼저 꽃망울 단계 도달",
      "300개에서 완성된 나무로 보관 가능",
    ],
  },
  {
    view: "next",
    label: "지금 무엇을 하면 좋을까요",
    answer: "오늘의 마음에 맞는 가장 작은 다음 행동만 제안해요.",
    bullets: [
      "최근 영상 하나에 마음 남기기",
      "겹친 장면을 같은 감정 가지로 묶기",
      "쉬고 싶다면 삭제 대신 비공개 전환",
    ],
  },
];

export const WPD_THEMES: Record<string, string> = {
  stand: "theme-green",
  changed: "theme-blue",
  future: "theme-green",
  next: "theme-sunset",
};

export const WPD_NUMBERS: Record<string, string> = {
  stand: "01",
  changed: "02",
  future: "03",
  next: "04",
};

export const WPD_MOMENTS: WpdMoment[] = [
  {
    video: "qKkJ6YHLhak",
    person: "이주연",
    title: "처음 마음을 멈춘 무대",
    mood: "설렘",
    date: "2026.02",
    pct: "18%",
  },
  {
    video: "nOrDWTMSR0w",
    person: "필릭스",
    title: "계속 다시 보게 된 장면",
    mood: "몰입",
    date: "2026.05",
    pct: "31%",
  },
  {
    video: "a1gsq3jC0Tg",
    person: "이준혁",
    title: "편안해진 인터뷰",
    mood: "위로",
    date: "2026.08",
    pct: "42%",
  },
];

const WPD_ACTIONS = [
  { label: "영상 하나 추가", width: "91%", tag: "추천" },
  { label: "감정 가지 정리", width: "72%", tag: "좋음" },
  { label: "시즌 표지 고르기", width: "48%", tag: "나중" },
  { label: "나무 잠시 쉬기", width: "24%", tag: "선택" },
];

const WPD_FUTURE = [
  { n: "1", title: "7개 뒤, 첫 번째 계절 완성", desc: "대표 장면과 가장 큰 감정이 한 장의 시즌 표지로 정리돼요." },
  { n: "2", title: "회복 가지에서 첫 꽃망울", desc: "위로와 편안함 영상이 30개를 넘으면 특별한 빛이 열려요." },
  { n: "3", title: "300개에서 완성된 나무 보관", desc: "더 이어가거나 새 계절로 나눌 수 있어요." },
];

const WPD_STATS = [
  { label: "함께한 날짜", value: "184일", up: false },
  { label: "가장 큰 감정", value: "설렘 42%", up: true },
  { label: "이번 주 추가", value: "+ 8개", up: true },
  { label: "현재 단계", value: "꽃망울 직전", up: false },
];

interface WpdVideoState {
  id: string;
  person: string;
  title: string;
}

export default function V4WholePictureDashboard() {
  const [active, setActive] = useState("stand");
  const [switching, setSwitching] = useState(false);
  const [pageNow, setPageNow] = useState("01");
  const [pill, setPill] = useState(false);
  const [video, setVideo] = useState<WpdVideoState | null>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  const choose = useCallback(
    (view: string) => {
      if (view === active || switching) return;
      setSwitching(true);
      setPill(true);
      const t1 = setTimeout(() => {
        setActive(view);
        setPageNow(WPD_NUMBERS[view] || "01");
        const t2 = setTimeout(() => setSwitching(false), 50);
        const t3 = setTimeout(() => setPill(false), 500);
        timers.current.push(t2, t3);
      }, 310);
      timers.current.push(t1);
    },
    [active, switching],
  );

  const openVideo = useCallback((moment: WpdMoment) => {
    setVideo({ id: moment.video, person: moment.person, title: moment.title });
  }, []);

  const closeVideo = useCallback(() => setVideo(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVideo(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimers();
    };
  }, [clearTimers]);

  const handleAppPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const root = appRef.current;
    if (!root) return;
    root.style.setProperty("--mx", ((e.clientX / window.innerWidth - 0.5) * 0.5).toFixed(3));
    root.style.setProperty("--my", ((e.clientY / window.innerHeight - 0.5) * 0.5).toFixed(3));
  }, []);

  return (
    <div className="wpd-app" ref={appRef} onPointerMove={handleAppPointerMove}>
      <div className={`wpd-progress-pill${pill ? " show" : ""}`}>
        <i />기억 지도를 다시 그리는 중
      </div>

      <header className="wpd-header">
        <a className="wpd-brand" href="#" aria-label="LoveTree" onClick={(e) => e.preventDefault()}>
          <span className="wpd-mark" aria-hidden="true" />
          <span>LoveTree</span>
        </a>
        <nav className="wpd-nav" aria-label="주요 메뉴">
          <a href="#" onClick={(e) => e.preventDefault()}>둘러보기</a>
          <a href="#" onClick={(e) => e.preventDefault()}>내 트리</a>
          <a href="#" onClick={(e) => e.preventDefault()}>시즌 보관</a>
          <a href="#" onClick={(e) => e.preventDefault()}>커뮤니티</a>
          <a href="#" onClick={(e) => e.preventDefault()}>LoveTree 소개</a>
        </nav>
        <div className="wpd-header-actions">
          <a className="wpd-login" href="#" onClick={(e) => e.preventDefault()}>로그인</a>
          <button className="wpd-start" type="button">새 트리 만들기</button>
        </div>
      </header>

      <main className="wpd-main">
        <section className="wpd-intro">
          <div>
            <small>내가 좋아한 마음의 현재 위치</small>
            <h1>
              좋아한 마음을
              <br />
              한눈에 바라봐요.
            </h1>
          </div>
          <p>
            흩어져 있던 영상과 감정이
            <br />
            질문을 누를 때마다 한 장의 결과로 정리돼요.
          </p>
        </section>

        <section className="wpd-workspace" aria-label="LoveTree 전체 기억 요약">
          <div className="wpd-questions">
            {WPD_QUESTIONS.map((q) => (
              <button
                key={q.view}
                className={`wpd-question${active === q.view ? " active" : ""}`}
                type="button"
                data-view={q.view}
                aria-expanded={active === q.view}
                onClick={() => choose(q.view)}
              >
                <span className="wpd-question-head">
                  <span>{q.label}</span>
                  <i aria-hidden="true">＋</i>
                </span>
                <span className="wpd-answer">
                  <div>
                    <p>{q.answer}</p>
                    <ul>
                      {q.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </span>
              </button>
            ))}
          </div>

          <div className="wpd-visual-area">
            <p className="wpd-visual-caption">
              <b>질문 하나마다 하나의 답.</b>
              <br />
              내가 남긴 영상 안에서 바로 확인할 수 있어요.
            </p>
            <div className={`wpd-visual-shell ${WPD_THEMES[active] || "theme-green"}${switching ? " switching" : ""}`}>
              <div className="wpd-result-card">
                <article className={`wpd-card-screen${active === "stand" ? " active" : ""}`} data-screen="stand">
                  <div className="wpd-card-top">
                    <span className="wpd-card-kicker"><i />LoveTree 현재 상태</span>
                    <span className="wpd-card-date">2026.08.04</span>
                  </div>
                  <p className="wpd-overview-title">주연이의 첫 번째 계절</p>
                  <div className="wpd-score-line">
                    <strong className="wpd-score">93</strong>
                    <span className="wpd-score-label">
                      개의 영상
                      <br />
                      <b>아주 건강하게 자라는 중</b>
                    </span>
                  </div>
                  <div className="wpd-health-bar"><i /></div>
                  <div className="wpd-scale-row">
                    <span>첫 순간</span>
                    <span>시즌 완성까지 7개</span>
                  </div>
                  <div className="wpd-stats-grid">
                    {WPD_STATS.map((s) => (
                      <div className="wpd-stat" key={s.label}>
                        <span>{s.label}</span>
                        <b className={s.up ? "up" : ""}>{s.value}</b>
                      </div>
                    ))}
                  </div>
                </article>

                <article className={`wpd-card-screen${active === "changed" ? " active" : ""}`} data-screen="changed">
                  <div className="wpd-card-top">
                    <span className="wpd-card-kicker"><i />감정 변화</span>
                    <span className="wpd-card-date">첫 영상 → 오늘</span>
                  </div>
                  <h2 className="wpd-change-title">좋아한 방식이 이렇게 달라졌어요</h2>
                  {WPD_MOMENTS.map((m) => (
                    <button key={m.video} className="wpd-moment-row" type="button" onClick={() => openVideo(m)}>
                      <img src={`https://i.ytimg.com/vi/${m.video}/hqdefault.jpg`} alt={`${m.person} 영상`} />
                      <span>
                        <strong>{m.title}</strong>
                        <small>{m.mood} · {m.date}</small>
                      </span>
                      <em>{m.pct}</em>
                    </button>
                  ))}
                  <div className="wpd-delta">
                    <span>최근에는 설렘보다 편안함을 더 남겨요.</span>
                    <b>+24%</b>
                  </div>
                </article>

                <article className={`wpd-card-screen${active === "future" ? " active" : ""}`} data-screen="future">
                  <div className="wpd-card-top">
                    <span className="wpd-card-kicker"><i />다음 계절 미리보기</span>
                    <span className="wpd-card-date">예상 경로</span>
                  </div>
                  <h2 className="wpd-future-title">이 나무는 다음 모습으로 자라요</h2>
                  <p className="wpd-future-sub">현재 93개 영상과 감정 흐름을 기준으로 보았어요.</p>
                  {WPD_FUTURE.map((f) => (
                    <div className="wpd-future-item" key={f.n}>
                      <i>{f.n}</i>
                      <div>
                        <strong>{f.title}</strong>
                        <p>{f.desc}</p>
                      </div>
                    </div>
                  ))}
                  <span className="wpd-future-chip">NEXT · SEASON 01</span>
                </article>

                <article className={`wpd-card-screen${active === "next" ? " active" : ""}`} data-screen="next">
                  <div className="wpd-card-top">
                    <span className="wpd-card-kicker"><i />오늘의 다음 행동</span>
                    <span className="wpd-card-date">3분이면 충분해요</span>
                  </div>
                  <h2 className="wpd-action-title">지금은 이만큼만 해도 좋아요</h2>
                  <p className="wpd-action-sub">마음을 오래 붙잡지 않는 작은 행동을 골랐어요.</p>
                  <div className="wpd-action-chart">
                    {WPD_ACTIONS.map((a) => (
                      <div className="wpd-action-row" key={a.label}>
                        <span>{a.label}</span>
                        <span className="wpd-track"><i style={{ width: a.width }} /></span>
                        <b>{a.tag}</b>
                      </div>
                    ))}
                  </div>
                  <div className="wpd-action-buttons">
                    <button type="button">오늘의 영상 남기기</button>
                    <button type="button">조용히 둘러보기</button>
                  </div>
                </article>
              </div>
            </div>
            <span className="wpd-page-count">
              <span>{pageNow}</span> · LoveTree whole picture
            </span>
          </div>
        </section>
      </main>

      <div
        className={`wpd-video-modal${video ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="LoveTree 영상"
        onClick={(e) => e.target === e.currentTarget && closeVideo()}
      >
        {video && (
          <div className="wpd-video-box">
            <div className="wpd-video-frame">
              <iframe
                title={video.title}
                src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="wpd-video-foot">
              <div>
                <small>{video.person} · LOVETREE VIDEO MOMENT</small>
                <strong>{video.title}</strong>
              </div>
              <button className="wpd-video-close" type="button" aria-label="영상 닫기" onClick={closeVideo}>
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

