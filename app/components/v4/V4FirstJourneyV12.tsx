"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "lovetree-first-journey-unified";

type Screen =
  | "landing"
  | "step1"
  | "step2"
  | "step2-success"
  | "step3"
  | "step3-success"
  | "growth";

interface FirstMoment {
  url: string;
  videoId: string;
  title: string;
  note: string;
  discoveryDate: string;
  thumbnail: string;
  saved: boolean;
}

interface Memory {
  emotion: string;
  customEmotion: string;
  time: string;
  note: string;
  date: string;
  publicMemo: boolean;
  saved: boolean;
}

interface NextRecord {
  id: string;
  url: string;
  title: string;
  time: string;
  relation: string;
  note: string;
}

interface Connection {
  first: FirstMoment;
  next: NextRecord;
  createdAt: string;
}

interface AppState {
  currentScreen: Screen;
  treeName: string;
  firstMoment: FirstMoment;
  memory: Memory;
  connections: Connection[];
  step3Origin: null | FirstMoment;
  drafts: {
    step3: { url: string; title: string; time: string; relation: string; note: string };
  };
}

const today = () => new Date().toISOString().slice(0, 10);

const defaultState = (): AppState => ({
  currentScreen: "landing",
  treeName: "건호에게 입덕한 3일",
  firstMoment: {
    url: "",
    videoId: "",
    title: "처음 마음이 멈춘 장면",
    note: "",
    discoveryDate: today(),
    thumbnail: "",
    saved: false,
  },
  memory: {
    emotion: "설렘",
    customEmotion: "",
    time: "01:30",
    note: "",
    date: today(),
    publicMemo: false,
    saved: false,
  },
  connections: [],
  step3Origin: null,
  drafts: {
    step3: {
      url: "",
      title: "",
      time: "00:00",
      relation: "댓글을 따라 찾아봤어요",
      note: "",
    },
  },
});

const SAMPLE_MOMENTS = [
  { title: "처음 발견한 순간", videoId: "ScMzIvxBSi4", note: "짧은 영상 하나가 이상하게 오래 마음에 남았어요.", date: "2026-07-28", accent: "#ff7597" },
  { title: "다음으로 찾아본 영상", videoId: "ysz5S6PUM-U", note: "비슷한 무대 영상을 또 찾아보게 됐어요.", date: "2026-07-30", relation: "댓글을 따라 찾아봤어요", whyNext: "첫 영상에서 댓글을 보고 찾아봤어요", accent: "#67e8f9" },
  { title: "그 사람의 인터뷰", videoId: "dQw4w9WgXcQ", note: "인터뷰에서 다른 매력이 보였어요.", date: "2026-08-02", relation: "같은 사람의 다른 모습을 더 보고 싶었어요", whyNext: "무대 위 모습과는 다른 편안한 모습이 좋았어요", accent: "#a7f3d0" },
  { title: "팬이 추천한 무대", videoId: "bcUfIpQ6aeA", note: "추천받은 무대가 정말 좋았어요.", date: "2026-08-05", relation: "팬이 추천해 줬어요", whyNext: "댓글에서 이 무대를 꼭 보라고 해서 봤어요", accent: "#c084fc" },
];

const EMOTIONS = ["설렘", "웃음", "위로", "놀람", "존경", "애틋함"];
const RELATIONS = [
  "댓글을 따라 찾아봤어요",
  "팬이 추천해 줬어요",
  "같은 사람의 다른 모습을 더 보고 싶었어요",
  "같은 무대와 노래를 더 찾아봤어요",
  "내가 직접 다시 검색했어요",
];

export default function V4FirstJourneyV12({
  onActivate,
  storageKey = STORAGE_KEY,
}: {
  onActivate?: () => void;
  storageKey?: string;
}) {
  // V1.2는 클라이언트 마운트 후에만 활성화됩니다. SSR 및 클라이언트 첫
  // 렌더링에서는 null을 반환해 V1과 hydration 마크업이 일치하도록 보장합니다.
  const [enabled, setEnabled] = useState(false);

  // Activation gate: ?v12=1 URL 파라미터 또는 localStorage v12Mode === true.
  // 기존 V1 진행 상태(firstMoment.url)가 있으면 V1을 유지합니다.
  useEffect(() => {
    const urlV12 = new URLSearchParams(window.location.search).has("v12");
    let storageV12 = false;
    let hasV1Progress = false;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.firstMoment?.url) hasV1Progress = true;
        if (parsed.v12Mode === true) storageV12 = true;
      }
    } catch { /* ignore */ }
    if (hasV1Progress) return;
    if (urlV12 || storageV12) {
      queueMicrotask(() => {
        setEnabled(true);
        onActivate?.();
      });
    }
  }, [onActivate, storageKey]);

  // Initialize appState from localStorage synchronously
  const [appState, setAppState] = useState<AppState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        return { ...defaultState(), ...parsed };
      }
    } catch { /* ignore */ }
    return defaultState();
  });
  const [v12Step, setV12Step] = useState(0);
  const [scrollDir, setScrollDir] = useState<"forward" | "reverse" | null>(null);
  const [toast, setToast] = useState("");
  const [editWhy, setEditWhy] = useState<Record<number, string>>({});
  const [pathChoice, setPathChoice] = useState<Record<number, "MAIN" | "BRANCH">>({});
  const [complete, setComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollRef = useRef(0);
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const persist = useCallback((next: AppState) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
  }, []);

  const update = useCallback((updater: (prev: AppState) => AppState) => {
    setAppState((prev) => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  // Scroll position → step mapping
  useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollTop = el.scrollTop;
      const viewH = el.clientHeight;
      const total = el.scrollHeight;
      if (total === 0) return;

      const direction = scrollTop > lastScrollRef.current ? "forward" : "reverse";
      setScrollDir(direction);
      lastScrollRef.current = scrollTop;

      const scrollFraction = (scrollTop + viewH / 2) / total;
      const step = Math.max(0, Math.min(Math.floor(scrollFraction * 100 / 22), 4));

      setV12Step(step);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [enabled]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }, []);

  const submitFirstMoment = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    update((prev) => ({
      ...prev,
      firstMoment: {
        url: `https://youtube.com/watch?v=${SAMPLE_MOMENTS[0].videoId}`,
        videoId: SAMPLE_MOMENTS[0].videoId,
        title: SAMPLE_MOMENTS[0].title,
        note: SAMPLE_MOMENTS[0].note,
        discoveryDate: SAMPLE_MOMENTS[0].date,
        thumbnail: `https://img.youtube.com/vi/${SAMPLE_MOMENTS[0].videoId}/hqdefault.jpg`,
        saved: true,
      },
      currentScreen: "step2",
    }));
    showToast("첫 순간이 심어졌어요 ✦");
  }, [update, showToast]);

  const submitMemory = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    update((prev) => ({
      ...prev,
      memory: { ...prev.memory, saved: true },
      currentScreen: "step2-success",
    }));
    showToast("첫 마음 카드가 피어났어요 ✦");
  }, [update, showToast]);

  const addConnection = useCallback((idx: number) => {
    const m = SAMPLE_MOMENTS[idx + 1];
    if (!m?.videoId) return;
    update((prev) => ({
      ...prev,
      connections: [
        ...prev.connections,
        {
          first: prev.firstMoment,
          next: {
            id: m.videoId,
            url: `https://youtube.com/watch?v=${m.videoId}`,
            title: m.title,
            time: "00:30",
            relation: m.relation || RELATIONS[0],
            note: m.note,
          },
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setEditWhy((prev) => ({ ...prev, [idx]: prev[idx] || m.whyNext || "" }));
  }, [update]);

  const handleWhyNextChange = (idx: number, value: string) => {
    setEditWhy((prev) => ({ ...prev, [idx]: value }));
  };

  const handlePathChoice = (idx: number, choice: "MAIN" | "BRANCH") => {
    setPathChoice((prev) => ({ ...prev, [idx]: choice }));
  };

  const completeJourney = () => {
    setComplete(true);
    update((prev) => ({ ...prev, currentScreen: "growth" }));
    showToast("나의 첫 러브트리가 완성됐어요 ✦");
  };

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = defaultState();
    setAppState(fresh);
    setV12Step(0);
    setComplete(false);
    setEditWhy({});
    setPathChoice({});
    setScrollDir(null);
  }, []);

  if (!enabled) return null;

  const progressPct = Math.min(100, (v12Step / 4) * 100);

  return (
    <div className="v4-j-v12">
      <div className="v4-j-v12-progress" role="progressbar" aria-valuenow={v12Step} aria-valuemin={0} aria-valuemax={4}>
        <div className="v4-j-v12-progress-bar" style={{ width: `${progressPct}%` }} />
        <span className="v4-j-v12-step-label">
          {v12Step === 0 && "첫 순간 발견"}
          {v12Step === 1 && "마음 남기기"}
          {v12Step === 2 && "WHY NEXT"}
          {v12Step === 3 && "MAIN / BRANCH"}
          {v12Step >= 4 && "완성!"}
        </span>
      </div>

      <div className="v4-j-v12-scroll" ref={scrollRef} data-testid="v12-scroll-container">
        <section className={`v4-j-v12-section ${v12Step === 0 ? "v4-j-v12-active" : ""}`} data-step="first-moment">
          <div className="v4-j-v12-sticky">
            <div className="v4-j-v12-hero">
              <div className="v4-j-v12-miniature" data-morph={v12Step >= 0 ? "world" : "miniature"}>
                <div className="v4-j-v12-mini-card" style={{ background: SAMPLE_MOMENTS[0].accent }}>
                  <span className="v4-j-v12-mini-icon">✦</span>
                </div>
              </div>
              <div className="v4-j-v12-hero-content">
                <h1 className="v4-j-v12-title">
                  <span className="v4-j-v12-eyebrow">00 — First Moment</span>
                  <em>{SAMPLE_MOMENTS[0].title}</em>
                </h1>
                <p className="v4-j-v12-note">{SAMPLE_MOMENTS[0].note}</p>
                {!appState.firstMoment.saved && (
                  <form onSubmit={submitFirstMoment} className="v4-j-v12-form">
                    <button type="submit" className="v4-j-v12-cta" data-testid="save-first-moment">
                      이 순간을 첫 뿌리로 심기
                    </button>
                  </form>
                )}
                {appState.firstMoment.saved && (
                  <p className="v4-j-v12-done" data-testid="first-saved">✦ 첫 순간이 심어졌습니다</p>
                )}
              </div>
            </div>
            {v12Step === 0 && scrollDir !== "forward" && (
              <div className="v4-j-v12-scroll-hint">
                <span>아래로 스크롤해 계속하기</span>
                <span className="v4-j-v12-arrow" aria-hidden="true">↓</span>
              </div>
            )}
          </div>
        </section>

        <section className={`v4-j-v12-section ${v12Step === 1 ? "v4-j-v12-active" : ""}`} data-step="memory">
          <div className="v4-j-v12-sticky">
            <div className="v4-j-v12-step-content">
              <span className="v4-j-v12-eyebrow">01 — 마음 남기기</span>
              <h2>이 순간이 왜 마음에 남았나요?</h2>
              {!appState.memory.saved ? (
                <form onSubmit={submitMemory} className="v4-j-v12-form">
                  <div className="v4-j-v12-chip-group">
                    {EMOTIONS.map((e) => (
                      <label key={e} className="v4-j-v12-chip">
                        <input type="radio" name="emotion" value={e} defaultChecked={e === "설렘"} />
                        <span>{e}</span>
                      </label>
                    ))}
                  </div>
                  <textarea className="v4-j-v12-textarea" placeholder="이 장면을 보고 어떤 기분이 들었나요?" rows={3} />
                  <button type="submit" className="v4-j-v12-cta" data-testid="save-memory">마음 남기기</button>
                </form>
              ) : (
                <p className="v4-j-v12-done" data-testid="memory-saved">✦ 마음이 기록되었습니다</p>
              )}
            </div>
          </div>
        </section>

        <section className={`v4-j-v12-section ${v12Step === 2 ? "v4-j-v12-active" : ""}`} data-step="why-next">
          <div className="v4-j-v12-sticky">
            <span className="v4-j-v12-eyebrow">02 — 다음 순간 연결</span>
            <h2>다음에 본 콘텐츠는 무엇인가요?</h2>
            <div className="v4-j-v12-candidates">
              {SAMPLE_MOMENTS.slice(1).map((m, idx) => (
                <div key={idx} className="v4-j-v12-candidate" data-testid={`candidate-${idx}`}>
                  <div className="v4-j-v12-candidate-visual" style={{ background: m.accent }}>
                    <span className="v4-j-v12-candidate-icon">▶</span>
                  </div>
                  <div className="v4-j-v12-candidate-info">
                    <h3>{m.title}</h3>
                    <p className="v4-j-v12-candidate-note">{m.note}</p>
                    <div className="v4-j-v12-why-next">
                      <label>
                        <small>WHY NEXT</small>
                        <input type="text" className="v4-j-v12-why-input" placeholder="왜 이 콘텐츠를 더 찾아보게 됐나요?" value={editWhy[idx] || ""} onChange={(e) => handleWhyNextChange(idx, e.target.value)} data-testid={`why-next-${idx}`} />
                      </label>
                      <div className="v4-j-v12-relation">
                        <span className="v4-j-v12-relation-label">연결 이유</span>
                        <select className="v4-j-v12-select" defaultValue={m.relation} data-testid={`relation-${idx}`}>
                          {RELATIONS.map((r) => (<option key={r} value={r}>{r}</option>))}
                        </select>
                      </div>
                    </div>
                    <button type="button" className="v4-j-v12-connect-btn" onClick={() => addConnection(idx)} data-testid={`connect-${idx}`}>연결하기</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`v4-j-v12-section ${v12Step === 3 ? "v4-j-v12-active" : ""}`} data-step="main-branch">
          <div className="v4-j-v12-sticky">
            <span className="v4-j-v12-eyebrow">03 — 가지 선택</span>
            <h2>이 순간을 메인으로 할까요,<br />새 가지로 남길까요?</h2>
            <div className="v4-j-v12-path-group">
              {SAMPLE_MOMENTS.slice(1).map((m, idx) => (
                <div key={idx} className="v4-j-v12-path-row">
                  <div className="v4-j-v12-path-visual" style={{ background: m.accent }}><span>{idx + 1}</span></div>
                  <span className="v4-j-v12-path-title">{m.title}</span>
                  <div className="v4-j-v12-path-buttons">
                    <button type="button" className={`v4-j-v12-path-btn ${pathChoice[idx] === "MAIN" ? "v4-j-v12-path-selected" : ""}`} onClick={() => handlePathChoice(idx, "MAIN")} data-testid={`main-${idx}`}>MAIN</button>
                    <button type="button" className={`v4-j-v12-path-btn ${pathChoice[idx] === "BRANCH" ? "v4-j-v12-path-selected" : ""}`} onClick={() => handlePathChoice(idx, "BRANCH")} data-testid={`branch-${idx}`}>BRANCH</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="v4-j-v12-cta" onClick={completeJourney} disabled={!Object.keys(pathChoice).length} data-testid="complete-journey">첫 러브트리 완성하기</button>
          </div>
        </section>

        <section className={`v4-j-v12-section ${v12Step >= 4 ? "v4-j-v12-active" : ""}`} data-step="complete">
          <div className="v4-j-v12-sticky v4-j-v12-complete">
            <div className="v4-j-v12-complete-icon" aria-hidden="true">🌳</div>
            <h2 className="v4-j-v12-complete-title">YOUR FIRST TREE</h2>
            <p className="v4-j-v12-complete-sub">{appState.treeName}</p>
            <div className="v4-j-v12-tree-preview">
              <div className="v4-j-v12-tree-main">
                <span className="v4-j-v12-tree-label">MAIN</span>
                <div className="v4-j-v12-tree-card">
                  <span>{SAMPLE_MOMENTS[0].title}</span>
                  {Object.entries(pathChoice).filter(([, c]) => c === "MAIN").map(([idx]) => (
                    <span key={idx} className="v4-j-v12-tree-sub">└ {SAMPLE_MOMENTS[Number(idx) + 1].title}</span>
                  ))}
                </div>
              </div>
              {Object.entries(pathChoice).filter(([, c]) => c === "BRANCH").length > 0 && (
                <div className="v4-j-v12-tree-branch">
                  <span className="v4-j-v12-tree-label">BRANCH</span>
                  <div className="v4-j-v12-tree-card">
                    {Object.entries(pathChoice).filter(([, c]) => c === "BRANCH").map(([idx]) => (
                      <span key={idx}>└ {SAMPLE_MOMENTS[Number(idx) + 1].title}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="v4-j-v12-complete-actions">
              <button type="button" className="v4-j-v12-cta" data-testid="start-tree">{appState.treeName} 시작하기</button>
              <button type="button" className="v4-j-v12-secondary" onClick={resetAll}>처음부터 다시 시작</button>
            </div>
          </div>
        </section>
      </div>

      {toast && (<div className="v4-j-v12-toast" role="status" aria-live="polite">{toast}</div>)}
    </div>
  );
}