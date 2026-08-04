"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "../../styles/v4/first-journey.css";

const STORAGE_KEY = "lovetree-first-journey-unified";
const STEP2_KEY = "lovetree-step2-record";
const STEP3_KEY = "lovetree-step3-connection";

const EMOTIONS = ["설렘", "웃음", "위로", "놀람", "존경", "애틋함"];
const RELATIONS = [
  "댓글을 따라 찾아봤어요",
  "팬이 추천해 줬어요",
  "같은 사람의 다른 모습을 더 보고 싶었어요",
  "같은 무대와 노래를 더 찾아봤어요",
  "내가 직접 다시 검색했어요",
];

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

function loadState(): AppState {
  try {
    if (typeof window === "undefined") return defaultState();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultState();
    const parsed = JSON.parse(saved) as Partial<AppState>;
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

function youtubeId(value: string): string | null {
  const match = (value || "").match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{6,})/,
  );
  return match ? match[1] : null;
}

function thumb(id: string): string {
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}

function parseTime(value: string): number | null {
  const match = (value || "").trim().match(/^(\d{1,2}):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function stageForScreen(screen: Screen): "landing" | "step2" | "step3" | "growth" {
  if (screen === "landing" || screen === "step1") return "landing";
  if (screen.startsWith("step2")) return "step2";
  if (screen.startsWith("step3")) return "step3";
  return "growth";
}

export default function V4FirstJourney() {
  const [appState, setAppState] = useState<AppState>(defaultState);
  const [toast, setToast] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [treeNameInput, setTreeNameInput] = useState("건호에게 입덕한 3일");
  const [contentUrl, setContentUrl] = useState("");
  const [discoveryNote, setDiscoveryNote] = useState("");
  const [discoveryDate, setDiscoveryDate] = useState(today());
  const [emotion, setEmotion] = useState("설렘");
  const [customEmotion, setCustomEmotion] = useState("");
  const [memoryTime, setMemoryTime] = useState("01:30");
  const [memoryNote, setMemoryNote] = useState("");
  const [memoryDate, setMemoryDate] = useState(today());
  const [publicMemo, setPublicMemo] = useState(false);
  const [nextUrl, setNextUrl] = useState("");
  const [nextTitle, setNextTitle] = useState("");
  const [nextTime, setNextTime] = useState("00:00");
  const [relation, setRelation] = useState(RELATIONS[0]);
  const [nextNote, setNextNote] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const persist = useCallback((next: AppState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — keep session state
    }
  }, []);

  const update = useCallback(
    (updater: (prev: AppState) => AppState) => {
      setAppState((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = loadState();
      setAppState(loaded);
      setContentUrl(loaded.firstMoment.url);
      setDiscoveryNote(loaded.firstMoment.note);
      setDiscoveryDate(loaded.firstMoment.discoveryDate || today());
      setTreeNameInput(loaded.treeName);
      setEmotion(loaded.memory.emotion || "설렘");
      setCustomEmotion(loaded.memory.customEmotion || "");
      setMemoryTime(loaded.memory.time || "01:30");
      setMemoryNote(loaded.memory.note || "");
      setMemoryDate(loaded.memory.date || today());
      setPublicMemo(loaded.memory.publicMemo || false);
      const last = loaded.connections[loaded.connections.length - 1];
      if (last) {
        setNextUrl(last.next.url || "");
        setNextTitle(last.next.title || "");
        setNextTime(last.next.time || "00:00");
        setRelation(last.next.relation || RELATIONS[0]);
        setNextNote(last.next.note || "");
      }
    }, 0);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const reloaded = loadState();
        setAppState(reloaded);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const showScreen = useCallback(
    (screen: Screen) => {
      const guard: Record<string, { ok: boolean; message: string }> = {
        step2: { ok: appState.firstMoment.saved, message: "첫 순간을 먼저 심어 주세요." },
        step3: { ok: appState.memory.saved, message: "첫 마음 카드를 먼저 피워 주세요." },
        growth: {
          ok: appState.connections.length > 0,
          message: "다음 순간을 하나 연결해 주세요.",
        },
      };
      if (guard[screen] && !guard[screen].ok) {
        showToast(guard[screen].message);
        return;
      }
      update((prev) => ({ ...prev, currentScreen: screen }));
      window.scrollTo({
        top: 0,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    },
    [appState.firstMoment.saved, appState.memory.saved, appState.connections.length, showToast, update, reducedMotion],
  );

  const openModal = useCallback(() => {
    setTreeNameInput(appState.treeName || "건호에게 입덕한 3일");
    triggerRef.current = document.activeElement as HTMLElement | null;
    setModalOpen(true);
  }, [appState.treeName]);

  useEffect(() => {
    if (modalOpen) {
      requestAnimationFrame(() => nameInputRef.current?.focus());
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setModalOpen(false);
        if (e.key === "Tab") {
          const nodes = modalRef.current?.querySelectorAll<HTMLElement>(
            "button, input, [href]",
          );
          if (!nodes?.length) return;
          const first = nodes[0];
          const last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [modalOpen]);

  const currentStage = stageForScreen(appState.currentScreen);
  const stageNumber =
    appState.currentScreen === "step1"
      ? 1
      : appState.currentScreen.startsWith("step2")
        ? 2
        : appState.currentScreen.startsWith("step3")
          ? 3
          : appState.currentScreen === "growth"
            ? 4
            : 0;

  const unlocked = (n: number) =>
    n === 1 ||
    (n === 2 && appState.firstMoment.saved) ||
    (n === 3 && appState.memory.saved) ||
    (n === 4 && appState.connections.length > 0);

  const doneStage = (n: number) =>
    n < stageNumber ||
    (n === 3 && appState.currentScreen === "step3-success") ||
    (n === 4 && appState.currentScreen === "growth");

  const goToStage = (stage: string) => {
    if (stage === "step1") {
      if (!appState.treeName) {
        openModal();
        return;
      }
      showScreen("step1");
    } else if (stage === "step2") showScreen("step2");
    else if (stage === "step3") showScreen("step3");
    else if (stage === "growth") showScreen("growth");
  };

  const currentFirst = () => appState.firstMoment;
  const firstId = youtubeId(appState.firstMoment.url) || appState.firstMoment.videoId;

  /* ── step1 submit ─────────────────────────────────────── */
  const submitDiscovery = (e: React.FormEvent) => {
    e.preventDefault();
    const id = youtubeId(contentUrl);
    if (!id) {
      showToast("YouTube 링크를 확인해 주세요.");
      return;
    }
    update((prev) => {
      const firstMoment: FirstMoment = {
        url: contentUrl.trim(),
        videoId: id,
        title: "처음 마음이 멈춘 장면",
        note: discoveryNote.trim() || "우연히 보게 됐는데 하루 종일 이 장면이 생각났어.",
        discoveryDate: discoveryDate || today(),
        thumbnail: thumb(id),
        saved: true,
      };
      return {
        ...prev,
        treeName: prev.treeName || treeNameInput,
        firstMoment,
        currentScreen: "step2",
      };
    });
    showToast("첫 순간이 심어졌어요 ✦");
  };

  /* ── step2 submit ─────────────────────────────────────── */
  const submitMemory = (e: React.FormEvent) => {
    e.preventDefault();
    const seconds = parseTime(memoryTime);
    if (seconds === null) {
      showToast("영상 시간은 01:30 형식으로 적어 주세요.");
      return;
    }
    const chosenEmotion = customEmotion.trim() || emotion;
    const memory: Memory = {
      emotion: chosenEmotion,
      customEmotion: customEmotion.trim(),
      time: formatTime(seconds),
      note: memoryNote.trim() || "이 장면을 다시 보고 싶어서 첫 마음으로 남겼어요.",
      date: memoryDate || today(),
      publicMemo,
      saved: true,
    };
    localStorage.setItem(
      STEP2_KEY,
      JSON.stringify({
        id: appState.firstMoment.videoId,
        url: appState.firstMoment.url,
        title: appState.firstMoment.title,
        time: memory.time,
        emotion: chosenEmotion,
        note: memory.note,
        date: memory.date,
        publicMemo,
      }),
    );
    update((prev) => ({ ...prev, memory, currentScreen: "step2-success" }));
    showToast("첫 마음 카드가 피어났어요 ✦");
  };

  /* ── step3 submit ─────────────────────────────────────── */
  const submitConnection = (e: React.FormEvent) => {
    e.preventDefault();
    const id = youtubeId(nextUrl);
    if (!id) {
      showToast("YouTube 링크를 확인해 주세요.");
      return;
    }
    if (parseTime(nextTime) === null) {
      showToast("영상 시간은 01:30 형식으로 적어 주세요.");
      return;
    }
    const nextRecord: NextRecord = {
      id,
      url: nextUrl.trim(),
      title: nextTitle.trim() || "다음으로 찾아본 영상",
      time: nextTime.trim(),
      relation,
      note: nextNote.trim() || "첫 장면을 본 뒤 이 영상까지 찾아보게 됐어요.",
    };
    const connection: Connection = {
      first: currentFirst(),
      next: nextRecord,
      createdAt: new Date().toISOString(),
    };
    update((prev) => ({
      ...prev,
      connections: [...prev.connections, connection],
      currentScreen: "step3-success",
    }));
    localStorage.setItem(STEP3_KEY, JSON.stringify(connection));
    showToast("첫 가지가 이어졌어요 ✦");
  };

  const againConnect = () => {
    update((prev) => {
      const last = prev.connections[prev.connections.length - 1];
      if (last?.next) {
        prev.step3Origin = {
          ...last.next,
          videoId: last.next.id,
          discoveryDate: today(),
          thumbnail: thumb(last.next.id),
          saved: true,
        };
        localStorage.setItem(STEP2_KEY, JSON.stringify(last.next));
      }
      return { ...prev, currentScreen: "step3" };
    });
    showToast("방금 연결한 영상에서 다음 가지를 시작해요.");
  };

  const resetAll = () => {
    if (!window.confirm("첫 여정에 입력한 내용을 지우고 처음부터 다시 시작할까요?")) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STEP2_KEY);
    localStorage.removeItem(STEP3_KEY);
    const fresh = defaultState();
    setAppState(fresh);
    persist(fresh);
    setContentUrl("");
    setDiscoveryNote("");
    setDiscoveryDate(today());
    setEmotion("설렘");
    setCustomEmotion("");
    setMemoryTime("01:30");
    setMemoryNote("");
    setMemoryDate(today());
    setPublicMemo(false);
    setNextUrl("");
    setNextTitle("");
    setNextTime("00:00");
    setRelation(RELATIONS[0]);
    setNextNote("");
  };

  const shiftTime = (delta: number) => {
    setMemoryTime((current) => {
      const seconds = parseTime(current);
      return formatTime((seconds ?? 90) + delta);
    });
  };

  const lastConnection = appState.connections[appState.connections.length - 1];
  const nextPreviewId = youtubeId(nextUrl);

  const stageButtons: { stage: string; index: string; label: string; longLabel?: string }[] = [
    { stage: "step1", index: "01", label: "첫 순간" },
    { stage: "step2", index: "02", label: "마음 남기기" },
    { stage: "step3", index: "03", label: "다음 영상 잇기" },
    { stage: "growth", index: "04", label: "러브트리 ", longLabel: "성장" },
  ];

  return (
    <div className="v4-journey-page">
      <header className="v4-journey-bar" aria-label="LoveTree 첫 여정 메뉴">
        <button
          className="v4-journey-logo"
          type="button"
          aria-label="LoveTree 처음 화면으로"
          onClick={() => showScreen("landing")}
        >
          <span className="v4-journey-mark" aria-hidden="true">
            <i />
            <b />
          </span>
          LoveTree
        </button>
        <nav className="v4-journey-stage-nav" aria-label="첫 여정 단계">
          {stageButtons.map((button, index) => {
            const n = index + 1;
            return (
              <button
                key={button.stage}
                className={`v4-journey-stage-btn${stageNumber === n ? " is-active" : ""}${doneStage(n) ? " is-done" : ""}${unlocked(n) ? "" : " is-locked"}`}
                type="button"
                aria-disabled={!unlocked(n)}
                aria-current={stageNumber === n ? "step" : undefined}
                onClick={() => goToStage(button.stage)}
              >
                <span className="idx">{button.index}</span>
                <span className="v4-j-label-long">{button.longLabel}</span>
                <span>{button.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="v4-journey-menu">
          <button className="v4-journey-menu-action" type="button">
            둘러보기
          </button>
          <button className="v4-journey-menu-action" type="button">
            로그인
          </button>
          <button className="v4-journey-reset" type="button" onClick={resetAll}>
            처음부터 다시 시작
          </button>
        </div>
      </header>

      <main className="v4-journey-stage-wrap">
        {currentStage === "landing" && (
          <section
            className={`v4-journey-stage ${appState.currentScreen === "step1" ? "v4-journey-flow" : "v4-journey-landing"}`}
          >
            {appState.currentScreen === "step1" ? (
              <div className="v4-j-shell v4-j-shell-wide">
                <div className="v4-j-layout">
                  <div className="v4-j-copy">
                    <p className="v4-j-eyebrow">01 · 처음 발견</p>
                    <h1>
                      마음이 처음 멈춘
                      <br />
                      <em>그 순간을 심어볼까요?</em>
                    </h1>
                    <p className="v4-j-hero-desc">
                      발견한 콘텐츠의 링크를 먼저 남겨 주세요. 링크와 함께 그때의 마음을
                      기록하면 러브트리의 첫 뿌리가 됩니다.
                    </p>
                    <form
                      className="v4-j-form-paper"
                      id="discovery-form"
                      onSubmit={submitDiscovery}
                      aria-label="첫 순간 심기"
                    >
                      <div className="v4-j-form-head">
                        <div>
                          <h2>첫 뿌리가 될 순간</h2>
                          <p>그때의 링크와 마음을 함께 남겨 주세요.</p>
                        </div>
                        <span className="v4-j-form-icon">✦</span>
                      </div>
                      <div className="v4-j-field">
                        <label className="v4-j-field-label" htmlFor="content-url">
                          <span>발견한 콘텐츠 링크</span>
                          <small>YouTube</small>
                        </label>
                        <input
                          className="v4-j-input"
                          id="content-url"
                          type="url"
                          placeholder="https://youtube.com/watch?v=..."
                          value={contentUrl}
                          onChange={(e) => setContentUrl(e.target.value)}
                          required
                        />
                        <p className="v4-j-field-status" data-testid="url-status">
                          {youtubeId(contentUrl)
                            ? "콘텐츠가 미리보기에 연결됐어요."
                            : "YouTube 링크를 넣으면 제목과 썸네일을 연결할 수 있어요."}
                        </p>
                      </div>
                      <div className="v4-j-field">
                        <label className="v4-j-field-label" htmlFor="discovery-note">
                          <span>그때 어떤 마음이었나요?</span>
                          <small>선택</small>
                        </label>
                        <textarea
                          className="v4-j-textarea"
                          id="discovery-note"
                          placeholder="예: 우연히 보게 됐는데, 하루 종일 이 장면이 생각났어."
                          value={discoveryNote}
                          onChange={(e) => setDiscoveryNote(e.target.value)}
                        />
                      </div>
                      <div className="v4-j-field">
                        <label className="v4-j-field-label" htmlFor="discovery-date">
                          <span>발견한 날짜</span>
                        </label>
                        <input
                          className="v4-j-input"
                          id="discovery-date"
                          type="date"
                          value={discoveryDate}
                          onChange={(e) => setDiscoveryDate(e.target.value)}
                        />
                      </div>
                      <div className="v4-j-hero-actions v4-j-actions">
                        <button className="v4-j-btn-primary" type="submit">
                          이 순간 심기 →
                        </button>
                        <span className="v4-j-hint">나중에 다시 수정할 수 있어요.</span>
                      </div>
                    </form>
                  </div>
                  <aside className="v4-j-preview">
                    <div className="v4-j-preview-window" data-testid="preview-window">
                      <span className="v4-j-preview-name">
                        {appState.treeName || "나의 첫 러브트리"}
                      </span>
                      <div className="v4-j-preview-glow" />
                      <div className="v4-j-preview-orb">✦</div>
                      <div className="v4-j-preview-copy">
                        <small>your first seed</small>
                        <strong data-testid="preview-title">
                          {youtubeId(contentUrl)
                            ? "첫 순간이 심어질 준비가 됐어요"
                            : "링크를 넣으면 콘텐츠가 보여요"}
                        </strong>
                        <p>
                          {youtubeId(contentUrl)
                            ? "링크와 함께 그때의 마음을 기록하면 러브트리의 첫 뿌리가 됩니다."
                            : "YouTube 주소를 붙여 넣어 러브트리의 뿌리를 만들어 보세요."}
                        </p>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            ) : (
              <div className="v4-j-shell">
                <section className="v4-j-hero">
                  <div className="v4-j-copy">
                    <p className="v4-j-eyebrow">A little garden for every feeling</p>
                    <h1>
                      <span className="v4-j-hero-line-1">사랑에 빠지는</span>
                      <span className="v4-j-hero-line-2">순간을 하나의</span>
                      <span className="v4-j-hero-line-3">러브트리로</span>
                      <span className="v4-j-hero-line-4">이어 보세요</span>
                    </h1>
                    <p className="v4-j-hero-desc">
                      처음 발견한 영상, 다시 찾은 장면, 그때의 마음과 다음 순간을 한 그루의
                      나무처럼 이어 보세요.
                    </p>
                    <div className="v4-j-actions">
                      <button
                        className="v4-j-btn-primary"
                        type="button"
                        onClick={openModal}
                      >
                        ＋ 첫 순간 심기
                      </button>
                      <a className="v4-j-btn-quiet" href="#v4-j-browse">
                        러브트리 둘러보기 →
                      </a>
                    </div>
                    <p className="v4-j-hero-note">
                      <b>✦</b> 처음에는 단 하나의 순간만 있어도 충분해요.
                    </p>
                    <div className="v4-j-proof">
                      <small>러브트리는 이렇게 자라요</small>
                      <div className="v4-j-proof-line">
                        <span className="is-active">
                          <b>01</b> 발견
                        </span>
                        <i aria-hidden="true" />
                        <span>
                          <b>02</b> 기록
                        </span>
                        <i aria-hidden="true" />
                        <span>
                          <b>03</b> 연결
                        </span>
                        <i aria-hidden="true" />
                        <span>
                          <b>04</b> 성장
                        </span>
                      </div>
                    </div>
                  </div>
                  <aside className="v4-j-board" data-testid="v4-j-board">
                    <div className="v4-j-board-top">
                      <span className="v4-j-board-title">my first LoveTree</span>
                      <span className="v4-j-board-meta">first seed</span>
                    </div>
                    <div className="v4-j-canvas">
                      <svg
                        className="v4-j-branch-svg"
                        viewBox="0 0 586 476"
                        preserveAspectRatio="xMidYMid meet"
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient id="v4j-board-branch" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#c86e79" />
                            <stop offset="52%" stopColor="#d9bda4" />
                            <stop offset="100%" stopColor="#879975" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M293 410 C240 360 220 260 200 200 C180 140 160 120 130 130"
                          fill="none"
                          stroke="url(#v4j-board-branch)"
                          strokeWidth="7"
                          strokeLinecap="round"
                        />
                        <path
                          d="M293 410 C340 380 380 290 430 220"
                          fill="none"
                          stroke="url(#v4j-board-branch)"
                          strokeWidth="6"
                          strokeLinecap="round"
                        />
                        <path
                          d="M293 410 C320 380 360 320 400 280"
                          fill="none"
                          stroke="url(#v4j-board-branch)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          opacity=".6"
                        />
                      </svg>
                      <div className="v4-j-orbit" />
                      <div className="v4-j-orbit two" />
                      <article className="v4-j-card root">
                        <div className="v4-j-media">
                          <i />
                        </div>
                        <div className="v4-j-card-copy">
                          <small>my first moment</small>
                          <strong>처음 마음이 멈춘 장면</strong>
                        </div>
                      </article>
                      <article className="v4-j-card card-a">
                        <div className="v4-j-media" />
                        <div className="v4-j-card-copy">
                          <small>02 · 다음 영상</small>
                          <strong>또 다른 모습이 궁금했어요</strong>
                        </div>
                      </article>
                      <article className="v4-j-card card-b">
                        <div className="v4-j-media" />
                        <div className="v4-j-card-copy">
                          <small>03 · 이어진 마음</small>
                          <strong>좋아하게 된 경로</strong>
                        </div>
                      </article>
                      <span className="v4-j-pill left">✿ 설렘</span>
                      <span className="v4-j-pill right">❦ 연결</span>
                      <span className="v4-j-seed">✦</span>
                    </div>
                    <div className="v4-j-caption">
                      <span className="v4-j-caption-dot" style={{ background: "var(--j-rose)" }} />
                      <span>발견</span>
                      <span className="v4-j-caption-dot" style={{ background: "var(--j-sand)" }} />
                      <span>기록</span>
                      <span className="v4-j-caption-dot" style={{ background: "var(--j-sage)" }} />
                      <span>연결</span>
                    </div>
                  </aside>
                </section>
                <section className="v4-j-browse" id="v4-j-browse">
                  <div className="v4-j-mini" data-testid="v4-j-mini-step1">
                    <span>01</span>
                    <strong>첫 순간</strong>
                    <p>마음이 멈춘 정확한 장면을 심어 보세요.</p>
                  </div>
                  <div className="v4-j-mini" data-testid="v4-j-mini-step2">
                    <span>02</span>
                    <strong>감정 메모</strong>
                    <p>그때의 말과 감정을 짧게 기록해요.</p>
                  </div>
                  <div className="v4-j-mini" data-testid="v4-j-mini-step3">
                    <span>03</span>
                    <strong>다음 가지</strong>
                    <p>팬의 추천으로 이야기의 흐름을 이어가요.</p>
                  </div>
                </section>
              </div>
            )}
          </section>
        )}

        {currentStage === "step2" && (
          <section className="v4-journey-stage v4-journey-memory">
            <div className="v4-j-shell">
              <header className="v4-j-top">
                <button className="v4-j-back" type="button" onClick={() => showScreen("step1")}>
                  ← 첫 순간으로 돌아가기
                </button>
                <span className="v4-j-url-mark">LoveTree</span>
                <span className="v4-j-step-label">02 · record the feeling</span>
              </header>
              <nav className="v4-j-progress" aria-label="러브트리 시작 단계">
                <div className="v4-j-progress-item is-done">
                  <span className="dot">✓</span>
                  <span>첫 순간</span>
                </div>
                <div
                  className={`v4-j-progress-item ${appState.currentScreen === "step2-success" ? "is-done" : "is-active"}`}
                >
                  <span className="dot">
                    {appState.currentScreen === "step2-success" ? "✓" : "02"}
                  </span>
                  <span>마음 남기기</span>
                </div>
                <div className="v4-j-progress-item">
                  <span className="dot">03</span>
                  <span>첫 카드</span>
                </div>
                <div className="v4-j-progress-item">
                  <span className="dot">04</span>
                  <span>다음 가지</span>
                </div>
              </nav>

              {appState.currentScreen === "step2-success" ? (
                <section className="v4-j-success-panel" data-testid="step2-success">
                  <div className="v4-j-success-flower">✦</div>
                  <h2>
                    첫 마음 카드가
                    <br />
                    <em>조용히 피어났어요.</em>
                  </h2>
                  <p className="v4-j-hero-desc">
                    처음 발견한 장면과 그때의 마음이 한 장의 카드로 연결됐습니다. 이제
                    여기에서 다음 가지가 자라기 시작해요.
                  </p>
                  <div className="v4-j-result-card">
                    <small data-testid="result-emotion">
                      {appState.memory.emotion} · {appState.memory.time}
                    </small>
                    <strong data-testid="result-memory">{appState.memory.note}</strong>
                    <span data-testid="result-date">{appState.memory.date}</span>
                  </div>
                  <div className="v4-j-success-actions">
                    <button
                      className="v4-j-btn-quiet"
                      type="button"
                      onClick={() =>
                        update((prev) => ({ ...prev, currentScreen: "step2" }))
                      }
                    >
                      다시 다듬기
                    </button>
                    <button
                      className="v4-j-btn-primary"
                      type="button"
                      onClick={() => showScreen("step3")}
                    >
                      첫 여정 보기 →
                    </button>
                  </div>
                </section>
              ) : (
                <div className="v4-j-layout-two">
                  <div className="v4-j-copy">
                  <p className="v4-j-eyebrow">02 · 마음을 잎으로 남기는 시간</p>
                  <h1>
                    첫 가지가
                    <br />
                    살며시 돋았어요.
                    <br />
                    <em>그때의 마음도 적어볼까요?</em>
                  </h1>
                  <p className="v4-j-hero-desc">
                    콘텐츠가 러브트리의 첫 뿌리라면, 그 장면에서 느낀 마음은 첫 잎이
                    됩니다. 기억하고 싶은 시간과 한 문장을 함께 남겨 주세요.
                  </p>
                  <article className="v4-j-connected-card" aria-label="연결한 첫 콘텐츠">
                    <span className="v4-j-tape" aria-hidden="true" />
                    <div
                      className="v4-j-video-frame"
                      data-testid="video-frame"
                      style={
                        firstId
                          ? {
                              backgroundImage: `linear-gradient(180deg,rgba(255,245,233,.05),rgba(44,32,34,.28)),url(${thumb(firstId)})`,
                            }
                          : undefined
                      }
                    >
                      <span className="v4-j-video-badge">FIRST ROOT · 연결된 첫 순간</span>
                      <button className="v4-j-play-big" type="button" aria-label="미리보기 재생">
                        <span />
                      </button>
                      <span className="v4-j-video-time">{appState.memory.time || "01:30"}</span>
                    </div>
                    <div className="v4-j-card-copy">
                      <small>CONNECTED YOUTUBE MOMENT</small>
                      <strong data-testid="video-title">
                        {appState.firstMoment.title || "처음 마음이 멈춘 장면"}
                      </strong>
                      <p className="v4-j-url-mark" data-testid="video-url">
                        {appState.firstMoment.url || "https://youtube.com/watch?v=..."}
                      </p>
                    </div>
                    <div className="v4-j-scene-row">
                      <label htmlFor="card-time">기억할 장면</label>
                      <input
                        className="v4-j-time-input"
                        id="card-time"
                        value={memoryTime}
                        onChange={(e) => setMemoryTime(e.target.value)}
                        aria-label="카드에 표시할 시간"
                      />
                      <button
                        className="v4-j-mini-btn"
                        type="button"
                        onClick={() => showToast("카드 시간을 맞췄어요.")}
                      >
                        이 시간으로 맞추기
                      </button>
                    </div>
                  </article>
                </div>

                <section className="v4-j-form-paper" data-testid="step2-form">
                    <header className="v4-j-form-head">
                      <div>
                        <h2>
                          이 장면에
                          <br />
                          어떤 마음이 머물렀나요?
                        </h2>
                        <p>정답은 없어요. 그때 가장 가까웠던 말 하나면 충분합니다.</p>
                      </div>
                      <span className="v4-j-form-icon">❦</span>
                    </header>
                    <form id="memory-form" onSubmit={submitMemory} aria-label="첫 마음 남기기">
                      <div className="v4-j-field">
                        <span className="v4-j-field-label">
                          <span>그때 가장 가까웠던 감정</span>
                          <small>하나를 골라 주세요</small>
                        </span>
                        <div className="v4-j-chip-wrap" role="radiogroup" aria-label="감정 선택">
                          {EMOTIONS.map((item, i) => (
                            <button
                              key={item}
                              type="button"
                              className={`v4-j-chip${emotion === item ? " is-selected" : ""}`}
                              data-emotion={item}
                              data-tone={i === 2 || i === 4 ? "sage" : undefined}
                              role="radio"
                              aria-checked={emotion === item}
                              onClick={() => {
                                setEmotion(item);
                                setCustomEmotion("");
                              }}
                            >
                              {item}
                            </button>
                          ))}
                          <input
                            className="v4-j-chip-input"
                            id="custom-emotion"
                            placeholder="다른 마음 ＋"
                            value={customEmotion}
                            onChange={(e) => setCustomEmotion(e.target.value)}
                            aria-label="직접 입력한 감정"
                          />
                        </div>
                      </div>
                      <div className="v4-j-field">
                        <span className="v4-j-field-label">
                          <span>영상에서 기억하고 싶은 시간</span>
                          <small>분:초</small>
                        </span>
                        <div className="v4-j-time-row">
                          <input
                            className="v4-j-time-input"
                            id="time"
                            value={memoryTime}
                            onChange={(e) => setMemoryTime(e.target.value)}
                            inputMode="numeric"
                            aria-label="기억할 영상 시간"
                          />
                          <div className="v4-j-time-controls">
                            <button
                              className="v4-j-mini-btn"
                              type="button"
                              id="minus-five"
                              onClick={() => shiftTime(-5)}
                            >
                              −5초
                            </button>
                            <button
                              className="v4-j-mini-btn"
                              type="button"
                              id="plus-five"
                              onClick={() => shiftTime(5)}
                            >
                              ＋5초
                            </button>
                          </div>
                          <span className="v4-j-time-help">
                            장면의 정확한 시간을 남기면 나중에 바로 다시 열 수 있어요.
                          </span>
                        </div>
                      </div>
                      <div className="v4-j-field">
                        <span className="v4-j-field-label">
                          <span>이 장면이 특별했던 이유</span>
                          <small>최대 140자</small>
                        </span>
                        <textarea
                          className="v4-j-textarea"
                          id="memory"
                          maxLength={140}
                          placeholder="예: 우연히 보게 됐는데, 하루 종일 이 표정과 말투가 생각났어."
                          value={memoryNote}
                          onChange={(e) => setMemoryNote(e.target.value)}
                        />
                        <span className="v4-j-field-status">{memoryNote.length} / 140</span>
                      </div>
                      <div className="v4-j-field">
                        <span className="v4-j-field-label">
                          <span>이 마음을 발견한 날</span>
                          <small>나중에 바꿀 수 있어요</small>
                        </span>
                        <div className="v4-j-date-row">
                          <input
                            className="v4-j-input"
                            id="date"
                            type="date"
                            value={memoryDate}
                            onChange={(e) => setMemoryDate(e.target.value)}
                          />
                          <div className="v4-j-visibility-row">
                            <button
                              className={`v4-j-switch${publicMemo ? " is-on" : ""}`}
                              id="visibility"
                              type="button"
                              aria-pressed={publicMemo}
                              aria-label="메모 공개 여부"
                              onClick={() => setPublicMemo((v) => !v)}
                            />
                            <span className="v4-j-visibility-label">
                              {publicMemo ? "이 메모를 공개해요" : "공개할 때 이 메모는 나만 보기"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="v4-j-actions">
                        <button className="v4-j-btn-primary" type="submit">
                          첫 마음 카드 피우기 →
                        </button>
                        <span className="v4-j-hint">링크와 원문은 그대로 보존됩니다.</span>
                      </div>
                    </form>
                  </section>
                </div>
                )}
              </div>
          </section>
        )}

        {currentStage === "step3" && (
          <section className="v4-journey-stage v4-journey-connect">
            <div className="v4-j-shell">
              <header className="v4-j-top">
                <button className="v4-j-back" type="button" onClick={() => showScreen("step2")}>
                  ← 첫 마음 카드로 돌아가기
                </button>
                <span className="v4-j-url-mark">LoveTree</span>
                <span className="v4-j-step-label">03 · connect the moments</span>
              </header>
              <nav className="v4-j-progress" aria-label="러브트리 시작 단계">
                <div className="v4-j-progress-item is-done">
                  <span className="dot">✓</span>
                  <span>첫 순간</span>
                </div>
                <div className="v4-j-progress-item is-done">
                  <span className="dot">✓</span>
                  <span>마음 남기기</span>
                </div>
                <div
                  className={`v4-j-progress-item ${appState.currentScreen === "step3-success" ? "is-done" : "is-active"}`}
                >
                  <span className="dot">
                    {appState.currentScreen === "step3-success" ? "✓" : "03"}
                  </span>
                  <span>다음 영상 잇기</span>
                </div>
                <div className="v4-j-progress-item">
                  <span className="dot">04</span>
                  <span>러브트리 성장</span>
                </div>
              </nav>

              {appState.currentScreen === "step3-success" && lastConnection ? (
                <section className="v4-j-success-panel" data-testid="step3-success">
                  <div className="v4-j-success-flower">❦</div>
                  <h2>
                    첫 가지가
                    <br />
                    <em>다정하게 이어졌어요.</em>
                  </h2>
                  <p className="v4-j-hero-desc">
                    처음 만든 영상과 다음 영상 사이에 이유와 마음이 생겼습니다. 이제
                    러브트리가 단순한 영상 목록이 아니라 좋아하게 된 경로를 보여줘요.
                  </p>
                  <div className="v4-j-path-summary">
                    <div className="v4-j-path-card">
                      <small>01 · 첫 순간</small>
                      <strong>{lastConnection.first.title || "처음 마음이 멈춘 장면"}</strong>
                    </div>
                    <span className="v4-j-path-arrow">→</span>
                    <div className="v4-j-path-card">
                      <small>02 · 다음 영상</small>
                      <strong>{lastConnection.next.title}</strong>
                    </div>
                  </div>
                  <p className="v4-j-hero-note" data-testid="success-relation">
                    {lastConnection.next.relation}
                  </p>
                  <div className="v4-j-success-actions">
                    <button className="v4-j-btn-quiet" type="button" onClick={againConnect}>
                      이 영상에서 또 이어보기
                    </button>
                    <button
                      className="v4-j-btn-primary"
                      type="button"
                      onClick={() => showScreen("growth")}
                    >
                      내 러브트리 보기 →
                    </button>
                  </div>
                </section>
              ) : (
                <div className="v4-j-layout-three">
                  <div className="v4-j-copy">
                  <p className="v4-j-eyebrow">03 · 첫 연결을 만드는 시간</p>
                  <h1>
                    다음 영상으로
                    <br />
                    <em>마음이 이어졌나요?</em>
                  </h1>
                  <p className="v4-j-hero-desc">
                    첫 순간에서 다음 순간으로 이어진 이유를 남기면, 러브트리에 첫 가지가
                    자라요.
                  </p>
                  <section className="v4-j-connection-board" aria-label="첫 영상과 다음 영상의 연결 미리보기">
                    <div className="v4-j-connect-canvas">
                      <svg
                        className="v4-j-connect-branch"
                        viewBox="0 0 620 425"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient
                            id="v4j-branch-gradient"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="#c86e79" />
                            <stop offset="52%" stopColor="#d9bda4" />
                            <stop offset="100%" stopColor="#879975" />
                          </linearGradient>
                        </defs>
                        <path
                          id="v4j-branch-path"
                          className={nextPreviewId || lastConnection ? "connected" : ""}
                          d="M205 148 C290 175 325 248 418 285"
                          fill="none"
                          stroke="url(#v4j-branch-gradient)"
                          strokeWidth="7"
                          strokeLinecap="round"
                        />
                        <path
                          id="v4j-branch-leaf"
                          d="M323 222 C301 207 290 219 302 236 C315 238 322 232 323 222Z"
                          fill="#879975"
                        />
                      </svg>
                      <article className="v4-j-moment first">
                        <span className="v4-j-pill left">01</span>
                        <div
                          className="v4-j-moment-thumb"
                          style={
                            firstId
                              ? {
                                  backgroundImage: `linear-gradient(180deg,rgba(255,245,233,.05),rgba(44,32,34,.30)),url(${thumb(firstId)})`,
                                }
                              : undefined
                          }
                        />
                        <div className="v4-j-moment-copy">
                          <small>첫 마음 카드</small>
                          <strong>{appState.firstMoment.title || "처음 마음이 멈춘 장면"}</strong>
                        </div>
                      </article>
                      <article
                        className={`v4-j-moment next${nextPreviewId ? "" : " waiting"}`}
                        data-testid="next-card"
                      >
                        <span className="v4-j-pill right">02</span>
                        <div
                          className="v4-j-moment-thumb"
                          data-testid="next-thumb"
                          style={
                            nextPreviewId
                              ? {
                                  backgroundImage: `linear-gradient(180deg,rgba(255,245,233,.05),rgba(44,32,34,.30)),url(${thumb(nextPreviewId)})`,
                                }
                              : undefined
                          }
                        >
                          {!nextPreviewId && <span className="v4-j-seed">✦</span>}
                        </div>
                        <div className="v4-j-moment-copy">
                          <small>다음 영상</small>
                          <strong data-testid="next-title-preview">
                            {nextTitle.trim() || "아직 비어 있는 다음 가지"}
                          </strong>
                        </div>
                      </article>
                      <div className="v4-j-relation-bubble" data-testid="relation-bubble">
                        {relation}
                      </div>
                    </div>
                  </section>
                </div>

                <section className="v4-j-form-paper" data-testid="step3-form">
                    <header className="v4-j-form-head">
                      <div>
                        <h2>
                          어떤 영상으로
                          <br />
                          마음이 이어졌나요?
                        </h2>
                        <p>다음 영상의 링크와 이어진 이유만 남기면 충분해요.</p>
                      </div>
                      <span className="v4-j-form-icon">↝</span>
                    </header>
                    <form id="connect-form" onSubmit={submitConnection} aria-label="다음 영상 연결">
                      <div className="v4-j-field">
                        <span className="v4-j-field-label">
                          <span>다음으로 찾아본 영상</span>
                          <small>YouTube 링크</small>
                        </span>
                        <input
                          className="v4-j-input"
                          id="next-url"
                          type="url"
                          placeholder="https://youtube.com/watch?v=..."
                          value={nextUrl}
                          onChange={(e) => setNextUrl(e.target.value)}
                          required
                        />
                        <p className="v4-j-field-status" data-testid="url-status">
                          {nextPreviewId
                            ? "다음 영상이 카드에 연결됐어요."
                            : "링크를 넣으면 오른쪽 카드에 썸네일이 나타나요."}
                        </p>
                        <div className="v4-j-title-time">
                          <input
                            className="v4-j-input"
                            id="next-title"
                            placeholder="다음 영상의 제목"
                            value={nextTitle}
                            onChange={(e) => setNextTitle(e.target.value)}
                          />
                          <input
                            className="v4-j-input"
                            id="next-time"
                            value={nextTime}
                            onChange={(e) => setNextTime(e.target.value)}
                            inputMode="numeric"
                            aria-label="다음 영상의 기억할 시간"
                          />
                        </div>
                      </div>
                      <div className="v4-j-field">
                        <span className="v4-j-field-label">
                          <span>왜 이 영상으로 이어졌나요?</span>
                          <small>하나를 골라 주세요</small>
                        </span>
                        <div className="v4-j-chip-wrap" role="radiogroup" aria-label="연결 이유 선택">
                          {RELATIONS.map((item, i) => (
                            <button
                              key={item}
                              type="button"
                              className={`v4-j-chip${relation === item ? " is-selected" : ""}`}
                              data-relation={item}
                              role="radio"
                              aria-checked={relation === item}
                              onClick={() => setRelation(item)}
                            >
                              {i === 0 && "댓글을 따라갔어요"}
                              {i === 1 && "팬의 추천"}
                              {i === 2 && "다른 모습이 궁금했어요"}
                              {i === 3 && "같은 무대·노래"}
                              {i === 4 && "직접 다시 검색"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="v4-j-field">
                        <span className="v4-j-field-label">
                          <span>두 장면 사이에 있었던 마음</span>
                          <small>최대 140자</small>
                        </span>
                        <textarea
                          className="v4-j-textarea"
                          id="next-note"
                          maxLength={140}
                          placeholder="예: 댓글에서 인터뷰를 꼭 보라는 말을 보고 바로 찾아봤어. 무대와는 또 다른 말투가 좋아졌어."
                          value={nextNote}
                          onChange={(e) => setNextNote(e.target.value)}
                        />
                        <span className="v4-j-field-status">{nextNote.length} / 140</span>
                      </div>
                      <div className="v4-j-actions">
                        <button className="v4-j-btn-primary" type="submit">
                          두 순간을 가지로 잇기 →
                        </button>
                        <span className="v4-j-hint">첫 카드와 다음 카드가 그대로 연결됩니다.</span>
                      </div>
                    </form>
                  </section>
                </div>
                )}
              </div>
          </section>
        )}

        {currentStage === "growth" && (
          <section className="v4-journey-stage v4-journey-growth">
            <div className="v4-j-growth-screen">
              <div className="v4-j-growth-shell">
                <p className="v4-j-eyebrow">04 · first branch</p>
                <h1>
                  첫 가지가
                  <span>다정하게 이어졌어요.</span>
                </h1>
                <p className="v4-j-growth-intro">
                  처음 만든 영상과 다음 영상 사이에 이유와 마음이 생겼습니다. 이제 러브트리가
                  단순한 영상 목록이 아니라 좋아하게 된 경로를 보여줘요.
                </p>
                <div className="v4-j-growth-board">
                  <div className="v4-j-growth-cards">
                    <article className="v4-j-growth-card" data-testid="growth-first">
                      <div
                        className="v4-j-growth-thumb"
                        style={
                          firstId
                            ? {
                                backgroundImage: `linear-gradient(180deg,rgba(255,245,233,.05),rgba(44,32,34,.30)),url(${thumb(firstId)})`,
                              }
                            : undefined
                        }
                      >
                        {!firstId && "✿"}
                      </div>
                      <div className="v4-j-growth-copy">
                        <small>01 · 첫 순간</small>
                        <strong>
                          {(lastConnection?.first.title as string) ||
                            appState.firstMoment.title ||
                            "처음 마음이 멈춘 장면"}
                        </strong>
                        <p>
                          {(lastConnection?.first.note as string) ||
                            appState.firstMoment.note ||
                            "처음 마음이 머문 장면"}
                        </p>
                      </div>
                    </article>
                    <span className="v4-j-growth-connector" data-testid="growth-connector">
                      <i aria-hidden="true">✿</i>
                    </span>
                    <article className="v4-j-growth-card" data-testid="growth-next">
                      <div
                        className="v4-j-growth-thumb"
                        style={
                          lastConnection?.next.id
                            ? {
                                backgroundImage: `linear-gradient(180deg,rgba(255,245,233,.05),rgba(44,32,34,.30)),url(${thumb(lastConnection.next.id)})`,
                              }
                            : undefined
                        }
                      >
                        {!lastConnection?.next.id && "✿"}
                      </div>
                      <div className="v4-j-growth-copy">
                        <small>02 · 다음 영상</small>
                        <strong>{lastConnection?.next.title || "다음으로 찾아본 영상"}</strong>
                        <p>{lastConnection?.next.note || "두 장면 사이에 있었던 마음"}</p>
                      </div>
                    </article>
                  </div>
                </div>
                <div className="v4-j-growth-actions">
                  <button
                    className="v4-j-btn-quiet v4-j-again"
                    type="button"
                    onClick={againConnect}
                  >
                    이 영상에서 또 이어보기
                  </button>
                  <button
                    className="v4-j-btn-primary v4-j-home"
                    type="button"
                    onClick={() => showScreen("landing")}
                  >
                    처음 화면으로
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {modalOpen && (
        <div
          className="v4-j-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="v4j-tree-modal-title"
          ref={modalRef}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="v4-j-modal">
            <button
              className="v4-j-modal-close"
              type="button"
              aria-label="닫기"
              onClick={() => setModalOpen(false)}
            >
              ×
            </button>
            <p className="v4-j-eyebrow">plant your first moment</p>
            <h2 id="v4j-tree-modal-title">
              어떤 러브트리를
              <br />
              <em>처음 심어볼까요?</em>
            </h2>
            <p>최애, 배우, 작품, 노래, 여행처럼 마음이 자란 대상이라면 무엇이든 좋아요.</p>
            <form
              id="name-form"
              onSubmit={(e) => {
                e.preventDefault();
                const name = treeNameInput.trim();
                if (!name) return;
                update((prev) => ({ ...prev, treeName: name }));
                setModalOpen(false);
                showScreen("step1");
              }}
            >
              <label className="v4-j-field-label" htmlFor="tree-name">
                러브트리 이름
              </label>
              <input
                className="v4-j-input"
                id="tree-name"
                value={treeNameInput}
                onChange={(e) => setTreeNameInput(e.target.value)}
                ref={nameInputRef}
                required
              />
              <p className="v4-j-modal-note">
                순간을 3개 이상 남기면 공개 러브트리로 소개할 수 있어요. 공개 범위는 나중에
                바꿀 수 있습니다.
              </p>
              <button className="v4-j-btn-primary" type="submit">
                이 이름으로 시작하기 →
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="v4-j-toast" role="status" data-testid="toast">
          {toast}
        </div>
      )}
    </div>
  );
}
