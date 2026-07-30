"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

const galleryCards = [
  {
    title: "보랏빛 순간",
    description: "함께 만든 기억의 조각들",
    image: "/moment-purple.jpg",
    stat: "1,024",
    tone: "violet",
  },
  {
    title: "빛나던 무대",
    description: "우리가 빛나던 그 계절",
    image: "/moment-stage.jpg",
    stat: "2,318",
    tone: "gold",
  },
  {
    title: "우리가 사랑한 계절",
    description: "봄, 여름, 가을, 그리고 너",
    image: "/moment-spring.jpg",
    stat: "1,587",
    tone: "coral",
  },
];

type PrivacyChoice = "private" | "later" | "public";
type ViewMode = "tree" | "diary" | "story" | "album";

const viewModes: Array<{ id: ViewMode; label: string; caption: string; icon: string }> = [
  { id: "tree", label: "성장 트리", caption: "한 장에서 여러 가지로", icon: "⌘" },
  { id: "diary", label: "마음 다이어리", caption: "시간순으로 차곡차곡", icon: "▤" },
  { id: "story", label: "스토리", caption: "한 순간씩 크게 감상", icon: "◫" },
  { id: "album", label: "앨범 보드", caption: "폴라로이드를 한눈에", icon: "▦" },
];

const sampleMoments = [
  {
    id: 1,
    title: "처음 마음이 멈춘 장면",
    memo: "우연히 보게 됐는데, 하루 종일 이 장면이 생각났어.",
    relation: "첫 발견",
    emotion: "설렘",
    date: "2026.07.30",
    image: "/moment-purple.jpg",
  },
  {
    id: 2,
    title: "댓글을 따라 찾은 무대",
    memo: "팬들이 꼭 보라고 한 장면을 찾아보다 더 좋아졌어.",
    relation: "댓글 따라감",
    emotion: "벅참",
    date: "2026.08.02",
    image: "/moment-stage.jpg",
  },
  {
    id: 3,
    title: "우리의 계절이 피던 날",
    memo: "그날의 공기와 색을 오래 기억하고 싶어.",
    relation: "같은 계절",
    emotion: "추억",
    date: "2026.08.18",
    image: "/moment-spring.jpg",
  },
  {
    id: 4,
    title: "함께여서 더 빛났던 시간",
    memo: "좋아하는 마음을 나누니 기억이 더 선명해졌어.",
    relation: "팬의 추천",
    emotion: "응원",
    date: "2026.09.03",
    image: "/moment-friends.jpg",
  },
  {
    id: 5,
    title: "다시 꺼내 본 보랏빛 밤",
    memo: "시간이 지나도 그날의 환호는 마음에 남아 있어.",
    relation: "직접 검색",
    emotion: "여운",
    date: "2026.09.21",
    image: "/moment-purple.jpg",
  },
  {
    id: 6,
    title: "오래 함께 걷고 싶은 마음",
    memo: "좋아한 시간이 쌓여 이제는 한 그루의 이야기가 됐어.",
    relation: "다른 모습",
    emotion: "사랑",
    date: "2026.10.11",
    image: "/moment-stage.jpg",
  },
];

function Brand({ onHome }: { onHome: () => void }) {
  return (
    <button className="brand brand-button" type="button" onClick={onHome} aria-label="러브트리 첫 화면">
      <span className="brand-tree" aria-hidden="true">
        <i />
        <b />
        <em />
      </span>
      <span className="brand-copy">
        <strong>러브트리</strong>
        <small>LoveTree</small>
      </span>
    </button>
  );
}

const growthStages = [
  { count: 1, label: "첫 순간", copy: "마음의 씨앗" },
  { count: 2, label: "두 장면", copy: "첫 가지" },
  { count: 4, label: "작은 트리", copy: "이어진 마음" },
  { count: 6, label: "풍성한 트리", copy: "한 그루의 이야기" },
];

function MomentCard({
  moment,
  index,
  active,
  onSelect,
  className = "",
}: {
  moment: (typeof sampleMoments)[number];
  index: number;
  active: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      className={`workspace-moment-card ${active ? "active" : ""} ${className}`}
      type="button"
      onClick={onSelect}
      aria-label={`${index + 1}번째 순간, ${moment.title}`}
    >
      <span className="moment-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="workspace-card-image">
        <Image src={moment.image} alt="" fill sizes="190px" />
        <i aria-hidden="true">▶</i>
      </span>
      <span className="workspace-card-copy">
        <strong>{moment.title}</strong>
        <small>{moment.memo}</small>
        <em>{moment.date} · {moment.relation}</em>
      </span>
    </button>
  );
}

function Workspace({
  treeName,
  initialMode,
  onHome,
  onEdit,
}: {
  treeName: string;
  initialMode: ViewMode;
  onHome: () => void;
  onEdit: () => void;
}) {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [momentCount, setMomentCount] = useState(4);
  const [activeId, setActiveId] = useState(4);
  const [zoom, setZoom] = useState(90);
  const [relation, setRelation] = useState("댓글 따라감");
  const [emotion, setEmotion] = useState("설렘");
  const [memo, setMemo] = useState("");
  const [notice, setNotice] = useState("같은 순간을 네 가지 모습으로 볼 수 있어요.");

  const moments = sampleMoments.slice(0, momentCount);
  const activeMoment = moments.find((moment) => moment.id === activeId) ?? moments[moments.length - 1];
  const activeMode = viewModes.find((item) => item.id === mode) ?? viewModes[0];

  function chooseStage(count: number) {
    setMomentCount(count);
    setActiveId(Math.min(activeId, count));
    setNotice(
      count === 1
        ? "첫 순간이 러브트리의 씨앗이 되었어요."
        : count === 2
          ? "두 장면 사이에 첫 가지가 이어졌어요."
          : `${count}개의 순간이 한 그루의 이야기로 자랐어요.`,
    );
  }

  function addMoment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (momentCount >= sampleMoments.length) {
      setNotice("샘플 트리가 충분히 자랐어요. 보기 방식을 바꿔 감상해보세요.");
      return;
    }
    const nextCount = momentCount + 1;
    setMomentCount(nextCount);
    setActiveId(nextCount);
    setMemo("");
    setNotice(`새 순간이 ${relation} 가지로 이어졌어요.`);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen?.();
    }
  }

  return (
    <div className="workspace-shell">
      <header className="workspace-topbar">
        <Brand onHome={onHome} />
        <nav className="workspace-mode-tabs" aria-label="러브트리 보기 방식">
          {viewModes.map((item) => (
            <button
              className={mode === item.id ? "active" : ""}
              type="button"
              key={item.id}
              aria-pressed={mode === item.id}
              onClick={() => {
                setMode(item.id);
                setNotice(`${item.label} 보기로 바꿨어요. 기록은 그대로 유지됩니다.`);
              }}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="workspace-header-actions">
          <button type="button" onClick={onEdit}>트리 설정</button>
          <button className="workspace-profile" type="button" aria-label="프로필 메뉴">
            <span aria-hidden="true">봄</span> 나의 하루
          </button>
        </div>
      </header>

      <main className="workspace-layout">
        <aside className="workspace-rail">
          <p className="workspace-overline">MY LOVE TREE</p>
          <h1>{treeName}</h1>
          <p className="workspace-privacy">♙ 나만 보는 러브트리</p>
          <p className="workspace-intro">
            한 번 남긴 순간은 그대로 두고,
            <br />
            보고 싶은 방식만 바꿔보세요.
          </p>

          <section className="growth-selector" aria-labelledby="growth-title">
            <div>
              <span id="growth-title">트리의 성장 단계</span>
              <small>{momentCount} moments</small>
            </div>
            {growthStages.map((stage) => (
              <button
                className={momentCount === stage.count ? "active" : ""}
                type="button"
                key={stage.count}
                onClick={() => chooseStage(stage.count)}
              >
                <b>{String(stage.count).padStart(2, "0")}</b>
                <span><strong>{stage.label}</strong><small>{stage.copy}</small></span>
                <i aria-hidden="true">›</i>
              </button>
            ))}
          </section>

          <section className="mode-note">
            <span aria-hidden="true">{activeMode.icon}</span>
            <div>
              <strong>{activeMode.label}</strong>
              <p>{activeMode.caption}</p>
            </div>
          </section>
        </aside>

        <section className="workspace-stage" aria-label={`${activeMode.label} 화면`}>
          <header className="workspace-stage-head">
            <div>
              <p>WHOLE LOVETREE · 같은 기억, 다른 보기</p>
              <span>{momentCount}개의 순간이 이어져 있어요</span>
            </div>
            <div className="canvas-controls" aria-label="화면 크기 조절">
              {mode === "tree" && (
                <>
                  <button type="button" onClick={() => setZoom(Math.max(70, zoom - 10))}>−</button>
                  <span>{zoom}%</span>
                  <button type="button" onClick={() => setZoom(Math.min(110, zoom + 10))}>＋</button>
                  <button type="button" onClick={() => setZoom(90)}>맞춤</button>
                </>
              )}
              <button type="button" onClick={toggleFullscreen}>전체 화면</button>
            </div>
          </header>

          <div className={`workspace-view workspace-view-${mode}`}>
            {mode === "tree" && (
              <div className={`tree-canvas tree-count-${momentCount}`}>
                <div className="tree-canvas-scale" style={{ transform: `scale(${zoom / 100})` }}>
                  <span className="tree-ring ring-one" aria-hidden="true" />
                  <span className="tree-ring ring-two" aria-hidden="true" />
                  <span className="tree-branch branch-a" aria-hidden="true" />
                  <span className="tree-branch branch-b" aria-hidden="true" />
                  <span className="tree-branch branch-c" aria-hidden="true" />
                  <span className="tree-branch branch-d" aria-hidden="true" />

                  <article className="tree-root">
                    <span aria-hidden="true">♥</span>
                    <small>MY LOVE TREE</small>
                    <strong>{treeName}</strong>
                    <em>{momentCount} moments</em>
                  </article>

                  {moments.map((moment, index) => (
                    <MomentCard
                      moment={moment}
                      index={index}
                      active={activeMoment.id === moment.id}
                      onSelect={() => setActiveId(moment.id)}
                      className={`tree-node tree-node-${index + 1}`}
                      key={moment.id}
                    />
                  ))}
                  {momentCount < sampleMoments.length && (
                    <button
                      className="tree-add-node"
                      type="button"
                      onClick={() => {
                        const form = document.getElementById("moment-form");
                        form?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      aria-label="새 순간 추가하기"
                    >
                      ＋
                    </button>
                  )}
                </div>
              </div>
            )}

            {mode === "diary" && (
              <div className="diary-view">
                <header>
                  <p>OUR LOVE DIARY</p>
                  <h2>마음을 이어가는 순간 다이어리</h2>
                  <span>영상 아래에 그날의 감상을 적고, 다음 순간까지의 흐름을 가볍게 이어 보세요.</span>
                </header>
                <div className="diary-timeline">
                  {moments.map((moment, index) => (
                    <article className={activeMoment.id === moment.id ? "active" : ""} key={moment.id}>
                      <button type="button" onClick={() => setActiveId(moment.id)}>
                        <span className="diary-date">{moment.date}</span>
                        <span className="diary-photo"><Image src={moment.image} alt="" fill sizes="260px" /></span>
                        <span className="diary-entry">
                          <small>{String(index + 1).padStart(2, "0")} · {moment.emotion}</small>
                          <strong>{moment.title}</strong>
                          <p>{moment.memo}</p>
                          <em>다음 순간까지 · {moment.relation}</em>
                        </span>
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {mode === "story" && (
              <div className="story-view">
                <div className="story-photo">
                  <Image src={activeMoment.image} alt={activeMoment.title} fill sizes="(max-width: 900px) 90vw, 680px" />
                  <span>{String(activeMoment.id).padStart(2, "0")} / {String(momentCount).padStart(2, "0")}</span>
                  <button type="button" aria-label="영상 재생">▶</button>
                </div>
                <article>
                  <p>{activeMoment.date} · {activeMoment.emotion}</p>
                  <h2>{activeMoment.title}</h2>
                  <blockquote>{activeMoment.memo}</blockquote>
                  <span>이 순간으로 이어진 길 · {activeMoment.relation}</span>
                  <div>
                    <button
                      type="button"
                      onClick={() => setActiveId(activeMoment.id === 1 ? momentCount : activeMoment.id - 1)}
                    >
                      ← 이전 순간
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveId(activeMoment.id === momentCount ? 1 : activeMoment.id + 1)}
                    >
                      다음 순간 →
                    </button>
                  </div>
                </article>
              </div>
            )}

            {mode === "album" && (
              <div className="album-view">
                <header>
                  <p>LOVE TREE MOMENT BOARD</p>
                  <h2>{treeName}의 장면들</h2>
                </header>
                <div className="album-grid">
                  {moments.map((moment, index) => (
                    <MomentCard
                      moment={moment}
                      index={index}
                      active={activeMoment.id === moment.id}
                      onSelect={() => setActiveId(moment.id)}
                      className={`album-card album-card-${(index % 4) + 1}`}
                      key={moment.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="workspace-editor">
          <section className="editor-summary">
            <div>
              <p>지금 선택한 순간</p>
              <h2>{activeMoment.title}</h2>
            </div>
            <span>{String(activeMoment.id).padStart(2, "0")}</span>
          </section>
          <div className="editor-stats">
            <span><strong>{momentCount}</strong> 이어진 순간</span>
            <span><strong>{Math.max(0, momentCount - 2)}</strong> 피어난 꽃</span>
            <span><strong>{momentCount >= 6 ? 1 : 0}</strong> 맺힌 열매</span>
          </div>
          <article className="selected-moment-preview">
            <span><Image src={activeMoment.image} alt="" fill sizes="92px" /></span>
            <div><small>{activeMoment.emotion} · {activeMoment.date}</small><p>{activeMoment.memo}</p></div>
          </article>

          <form className="moment-form" id="moment-form" onSubmit={addMoment}>
            <div className="moment-form-heading">
              <div><small>branch {String(momentCount + 1).padStart(2, "0")}</small><h3>다음 순간 이어보기</h3></div>
              <span aria-hidden="true">❧</span>
            </div>
            <label>
              영상 또는 사진 링크
              <input type="url" placeholder="https://youtube.com/watch?v=..." />
            </label>
            <div className="moment-fields">
              <label>기억할 시각<input type="text" defaultValue="00:00" /></label>
              <label>기록 날짜<input type="text" defaultValue="2026. 07. 30." /></label>
            </div>
            <fieldset>
              <legend>왜 이 순간으로 이어졌나요?</legend>
              <div className="choice-chips">
                {["첫 발견", "댓글 따라감", "팬의 추천", "다른 모습", "직접 검색"].map((item) => (
                  <button
                    className={relation === item ? "active" : ""}
                    type="button"
                    key={item}
                    onClick={() => setRelation(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>그때 가장 가까웠던 감정</legend>
              <div className="choice-chips emotion-chips">
                {["설렘", "위로", "벅참", "여운", "추억"].map((item) => (
                  <button
                    className={emotion === item ? "active" : ""}
                    type="button"
                    key={item}
                    onClick={() => setEmotion(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              이 순간에 남기고 싶은 마음
              <textarea
                value={memo}
                maxLength={140}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="그 장면이 특별했던 이유를 짧게 남겨보세요."
              />
              <small>{memo.length} / 140</small>
            </label>
            <button className="moment-submit" type="submit">
              {momentCount === 1 ? "두 순간을 가지로 잇기" : "새 가지를 피워내기"} <span aria-hidden="true">→</span>
            </button>
          </form>
        </aside>
      </main>

      <div className="workspace-toast" role="status">
        <span aria-hidden="true">✦</span>
        {notice}
      </div>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<"home" | "builder" | "workspace">("home");
  const [treeName, setTreeName] = useState("우리의 빛나는 순간들");
  const [privacy, setPrivacy] = useState<PrivacyChoice>("private");
  const [selectedFormat, setSelectedFormat] = useState<ViewMode>("tree");
  const [savedTree, setSavedTree] = useState("");

  useEffect(() => {
    const returnHomeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && view !== "home") setView("home");
    };
    window.addEventListener("keydown", returnHomeOnEscape);
    return () => window.removeEventListener("keydown", returnHomeOnEscape);
  }, [view]);

  function createTree(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = treeName.trim();
    if (!nextName) return;
    setSavedTree(nextName);
    setView("workspace");
  }

  if (view === "workspace") {
    return (
      <Workspace
        treeName={treeName}
        initialMode={selectedFormat}
        onHome={() => setView("home")}
        onEdit={() => setView("builder")}
      />
    );
  }

  if (view === "builder") {
    return (
      <div className="builder-shell">
        <span className="builder-petal builder-petal-one" aria-hidden="true" />
        <span className="builder-petal builder-petal-two" aria-hidden="true" />
        <span className="builder-petal builder-petal-three" aria-hidden="true" />

        <header className="builder-topbar">
          <Brand onHome={() => setView("home")} />
          <nav className="builder-nav" aria-label="주요 메뉴">
            <button type="button" onClick={() => setView("home")}>첫 화면</button>
            <a href="#builder-guide">LoveTree 소개 보기</a>
            <button type="button" onClick={() => setView("home")}>둘러보기</button>
            <a className="active" href="#builder-form">내 러브트리 시작하기</a>
          </nav>
          <button className="builder-profile" type="button" aria-label="프로필 메뉴">
            <span className="profile-avatar" aria-hidden="true">봄</span>
            <span>오늘도 빛나는 하루</span>
            <span aria-hidden="true">⌄</span>
          </button>
        </header>

        <main className="builder-main">
          <section className="builder-left" aria-labelledby="builder-title">
            <div className="builder-heading">
              <p className="builder-overline"><span aria-hidden="true">✿</span> 내 러브트리 시작하기</p>
              <h1 id="builder-title">
                오래 품고 싶은 순간을,
                <br />
                하나의 <em>러브트리</em>로 시작해보세요
              </h1>
              <p>
                거창하지 않아도 괜찮아요.
                <br />
                좋아하는 장면, 노래, 감정 하나만 있어도
                <br />
                당신의 러브트리는 충분히 시작될 수 있어요.
              </p>
            </div>

            <form className="builder-form" id="builder-form" onSubmit={createTree}>
              <label className="builder-label" htmlFor="builder-tree-name">
                <span aria-hidden="true">✿</span> 러브트리 제목
              </label>
              <input
                id="builder-tree-name"
                value={treeName}
                onChange={(event) => setTreeName(event.target.value)}
                placeholder="예: 보랏빛으로 남은 순간들"
                maxLength={32}
                required
              />
              <div className="name-examples" aria-label="제목 예시">
                <span>예: 우리가 사랑한 계절</span>
                <i aria-hidden="true" />
                <span>예: 오래 곁에 남은 문장들</span>
              </div>

              <div className="privacy-block">
                <span className="builder-label"><span aria-hidden="true">✿</span> 공개 범위</span>
                <div className="privacy-options" role="radiogroup" aria-label="공개 범위 선택">
                  <button
                    className={privacy === "private" ? "selected" : ""}
                    type="button"
                    role="radio"
                    aria-checked={privacy === "private"}
                    onClick={() => setPrivacy("private")}
                  >
                    <span aria-hidden="true">♙</span>
                    <strong>비공개로 시작하기</strong>
                    <small>나만 볼 수 있어요</small>
                    {privacy === "private" && <b aria-hidden="true">✓</b>}
                  </button>
                  <button
                    className={privacy === "later" ? "selected" : ""}
                    type="button"
                    role="radio"
                    aria-checked={privacy === "later"}
                    onClick={() => setPrivacy("later")}
                  >
                    <span aria-hidden="true">❧</span>
                    <strong>나중에 공개할게요</strong>
                    <small>준비되면 열어볼게요</small>
                    {privacy === "later" && <b aria-hidden="true">✓</b>}
                  </button>
                  <button
                    className={privacy === "public" ? "selected" : ""}
                    type="button"
                    role="radio"
                    aria-checked={privacy === "public"}
                    onClick={() => setPrivacy("public")}
                  >
                    <span aria-hidden="true">◎</span>
                    <strong>공개 러브트리로 이어가기</strong>
                    <small>다른 사람과 나눌 수 있어요</small>
                    {privacy === "public" && <b aria-hidden="true">✓</b>}
                  </button>
                </div>
                <p className="privacy-hint">
                  <span aria-hidden="true">✣</span> 처음에는 비공개로 시작해도 괜찮아요. 천천히 쌓인 뒤에 공개해도 늦지 않아요.
                </p>
              </div>

              <div className="format-block">
                <div className="format-label">
                  <span className="builder-label"><span aria-hidden="true">✿</span> 처음 보여줄 방식</span>
                  <small>나중에 언제든 바꿀 수 있어요</small>
                </div>
                <div className="format-options" role="radiogroup" aria-label="러브트리 보기 방식 선택">
                  {viewModes.map((item) => (
                    <button
                      className={selectedFormat === item.id ? "selected" : ""}
                      type="button"
                      role="radio"
                      aria-checked={selectedFormat === item.id}
                      key={item.id}
                      onClick={() => setSelectedFormat(item.id)}
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      <strong>{item.label}</strong>
                      <small>{item.caption}</small>
                      {selectedFormat === item.id && <b aria-hidden="true">✓</b>}
                    </button>
                  ))}
                </div>
                <p className="format-hint">
                  첫 사진, 두 장면, 여러 장면은 선택한 보기 안에서 트리가 자라는 단계로 이어져요.
                </p>
              </div>

              <div className="builder-actions">
                <button className="builder-submit" type="submit">
                  내 러브트리 만들기 <span aria-hidden="true">✣</span>
                </button>
                <button className="builder-browse" type="button" onClick={() => setView("home")}>
                  공개 트리 먼저 둘러보기
                </button>
              </div>
              <p className="builder-form-note"><span aria-hidden="true">❧</span> 첫 순간은 다음 단계에서 천천히 남길 수 있어요.</p>
            </form>

            <div className="builder-steps" id="builder-guide" aria-label="러브트리 시작 단계">
              <article>
                <span className="step-book" aria-hidden="true">♡</span>
                <div><strong>제목을 정해요</strong><p>마음이 머문 이름으로 시작해요.</p></div>
                <b aria-hidden="true">›</b>
              </article>
              <article>
                <span className="step-photo" aria-hidden="true">▧</span>
                <div><strong>첫 순간을 남겨요</strong><p>좋아하는 장면 하나면 충분해요.</p></div>
                <b aria-hidden="true">›</b>
              </article>
              <article>
                <span className="step-branch" aria-hidden="true">⌇</span>
                <div><strong>천천히 이어가요</strong><p>감정의 흐름이 하나의 트리로 자라나요.</p></div>
                <b aria-hidden="true">›</b>
              </article>
            </div>
          </section>

          <section className="builder-right" aria-label="첫 러브트리 미리보기">
            <div className="builder-vine" aria-hidden="true">
              <i className="vine-main" />
              <i className="vine-top" />
              <i className="vine-bottom" />
              <b className="vine-leaf leaf-a" />
              <b className="vine-leaf leaf-b" />
              <b className="vine-leaf leaf-c" />
              <b className="vine-leaf leaf-d" />
            </div>

            <article className="start-note">
              <span className="builder-tag">시작</span>
              <p>이 마음의<br />시작을<br />남겨둘게.</p>
              <span aria-hidden="true">♡</span>
            </article>

            <article className="first-polaroid">
              <span className="paper-tape tape-left" aria-hidden="true" />
              <span className="paper-tape tape-right" aria-hidden="true" />
              <div className="empty-photo">
                <span aria-hidden="true">✿</span>
                <p>첫 순간을 기다리는 중</p>
              </div>
              <strong>첫 순간</strong>
            </article>

            <article className="small-note">
              <span className="builder-tag">순간</span>
              <span className="paper-clip" aria-hidden="true">∩</span>
              <p>작은 순간<br />하나로도<br />충분해. ♡</p>
            </article>

            <article className="memory-polaroid">
              <span className="paper-tape" aria-hidden="true" />
              <div className="memory-photo">
                <Image src="/moment-spring.jpg" alt="분홍빛 노을과 봄꽃이 어우러진 첫 순간" fill sizes="190px" priority />
              </div>
              <p>처음의 설렘이<br />오래 머물 수 있도록. ♡</p>
            </article>

            <article className="pressed-memory">
              <span className="builder-tag">기억</span>
              <span className="pressed-stem" aria-hidden="true">✿</span>
              <span className="paper-tape" aria-hidden="true" />
            </article>

            <span className="builder-tag feeling-tag">감정</span>
            <span className="builder-wax" aria-hidden="true">❦</span>

            <article className="growth-card">
              <div>
                <p className="builder-overline"><span aria-hidden="true">✿</span> 이렇게 자라날 수 있어요.</p>
                <strong>당신만의 감정과 기억들이<br />하나의 가지가 되어,<br />아름다운 이야기를 완성해요.</strong>
                <button type="button" onClick={() => setView("home")}>예시 트리 둘러보기 <span aria-hidden="true">→</span></button>
              </div>
              <div className="mini-tree" aria-hidden="true">
                <i />
                <span className="mini-card mini-one"><Image src="/moment-purple.jpg" alt="" fill sizes="60px" /></span>
                <span className="mini-card mini-two"><Image src="/moment-stage.jpg" alt="" fill sizes="60px" /></span>
                <span className="mini-card mini-three"><Image src="/moment-spring.jpg" alt="" fill sizes="60px" /></span>
                <span className="mini-card mini-four"><Image src="/moment-friends.jpg" alt="" fill sizes="60px" /></span>
              </div>
            </article>
          </section>
        </main>

        {savedTree && (
          <div className="toast" role="status">
            <span>✿</span> ‘{savedTree}’ 러브트리를 만들었어요. 이제 첫 순간을 남겨보세요.
            <button type="button" onClick={() => setSavedTree("")} aria-label="알림 닫기">×</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="site-shell">
      <span className="petal petal-one" aria-hidden="true" />
      <span className="petal petal-two" aria-hidden="true" />
      <span className="petal petal-three" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="러브트리 홈">
          <span className="brand-tree" aria-hidden="true">
            <i />
            <b />
            <em />
          </span>
          <span className="brand-copy">
            <strong>러브트리</strong>
            <small>LoveTree</small>
          </span>
        </a>

        <nav className="nav" aria-label="주요 메뉴">
          <a href="#trees">둘러보기</a>
          <a href="#features">내 트리</a>
          <button className="login-button" type="button" onClick={() => setView("builder")}>
            로그인
          </button>
          <button className="nav-start" type="button" onClick={() => setView("builder")}>
            시작하기
          </button>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span aria-hidden="true">✿</span> 마음이 머문 곳에서 시작되는 이야기
            </p>
            <h1 id="hero-title">
              좋아하는 순간을,
              <br />
              <em>러브트리</em>로 키워보세요
            </h1>
            <p className="hero-description">
              사랑한 장면과 노래, 기억과 감정을 차곡차곡 모아 두면,
              <br />
              서로의 결이 이어져 하나의 트리로 자라납니다.
              <br />
              러브트리는 마음속 순간들을 오래 간직하고 천천히 돌볼 수 있는
              <br />
              나만의 감정 정원입니다.
            </p>

            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={() => setView("builder")}>
                내 트리 시작하기 <span aria-hidden="true">✣</span>
              </button>
              <a className="button button-secondary" href="#trees">
                공개 트리 둘러보기 <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <div className="hero-collage" aria-label="러브트리에 담긴 추억 카드 미리보기">
            <span className="collage-glow" aria-hidden="true" />
            <span className="thread thread-one" aria-hidden="true" />
            <span className="thread thread-two" aria-hidden="true" />

            <article className="polaroid polaroid-friends">
              <span className="label label-blush">감정</span>
              <div className="photo-frame">
                <Image src="/moment-friends.jpg" alt="함께 웃고 있는 친구들의 뒷모습" fill sizes="180px" priority />
              </div>
              <p>심장이 뛰던 그 순간</p>
              <small>2024.04.20</small>
            </article>

            <article className="memo-card">
              <span className="tape" aria-hidden="true" />
              <p className="memo-kicker">오늘의 한 줄 ♡</p>
              <p className="memo-copy">
                그날의 떨림이
                <br />
                지금의 나를
                <br />
                따뜻하게
                <br />
                만들어줘서
                <br />
                고마워.
              </p>
              <span className="pressed-flower" aria-hidden="true">❀</span>
            </article>

            <article className="polaroid polaroid-purple">
              <span className="label label-gold">순간</span>
              <div className="photo-frame">
                <Image src="/moment-purple.jpg" alt="보랏빛 조명과 종이 꽃가루가 펼쳐진 공연장" fill sizes="190px" priority />
              </div>
              <p>빛이 가장 가까웠던 날</p>
              <small>2024.06.15</small>
            </article>

            <article className="note-paper">
              <span className="label label-beige">기억</span>
              <p>
                너의 노래가
                <br />
                내 하루의 위로가
                <br />
                되어줘서
                <br />
                정말 고마워.
              </p>
              <span aria-hidden="true">♬</span>
            </article>

            <article className="music-player" aria-label="기억 속 노래 플레이어">
              <div className="album-art">
                <Image src="/moment-stage.jpg" alt="" fill sizes="54px" />
              </div>
              <div>
                <strong>우리의 계절이 지나도</strong>
                <small>LoveTree 플레이리스트</small>
              </div>
              <button type="button" aria-label="일시 정지">Ⅱ</button>
              <span aria-hidden="true">♡</span>
            </article>

            <article className="polaroid polaroid-stage">
              <span className="label label-sage">호흡</span>
              <div className="photo-frame">
                <Image src="/moment-stage.jpg" alt="함께 환호하는 공연장의 사람들" fill sizes="190px" priority />
              </div>
              <p>우리가 함께한 모든 시간</p>
              <small>2024.08.03</small>
            </article>

            <span className="wax-seal" aria-hidden="true">❦</span>
            <span className="heart-pin" aria-hidden="true">♥</span>
          </div>
        </section>

        <section className="feature-band" id="features" aria-label="러브트리 특징">
          <article>
            <span className="feature-icon feature-gold" aria-hidden="true">☆</span>
            <div>
              <h2>대표 순간</h2>
              <p>좋아하는 장면과 감정을 가장 먼저 남겨요</p>
            </div>
          </article>
          <article>
            <span className="feature-icon feature-rose" aria-hidden="true">♡</span>
            <div>
              <h2>이어진 감정</h2>
              <p>순간과 순간이 감정의 흐름으로 연결돼요</p>
            </div>
          </article>
          <article>
            <span className="feature-icon feature-gold" aria-hidden="true">✣</span>
            <div>
              <h2>나만의 트리</h2>
              <p>좋아하는 기억을 하나의 러브트리로 키워가요</p>
            </div>
          </article>
        </section>

        <section className="tree-gallery" id="trees" aria-labelledby="gallery-title">
          <div className="gallery-intro">
            <p className="eyebrow">PUBLIC LOVE TREES</p>
            <h2 id="gallery-title">마음이 닿은 트리들</h2>
            <p>다른 팬들이 가꾼 따뜻한 트리를 만나보세요.</p>
            <a href="#top">천천히 둘러보기 <span aria-hidden="true">↗</span></a>
          </div>
          <div className="gallery-grid">
            {galleryCards.map((card) => (
              <article className="tree-card" key={card.title}>
                <div className="tree-card-image">
                  <Image src={card.image} alt="" fill sizes="(max-width: 700px) 90vw, 300px" />
                  <span className={`card-flower ${card.tone}`} aria-hidden="true">✦</span>
                </div>
                <div className="tree-card-copy">
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <small>♡ {card.stat} &nbsp;&nbsp; ○ {Number(card.stat.replace(",", "")) % 227 + 61}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span className="brand-tree" aria-hidden="true"><i /><b /><em /></span>
          <span className="brand-copy"><strong>러브트리</strong><small>LoveTree</small></span>
        </a>
        <p>마음이 시작된 순간을 오래 간직하는 법</p>
      </footer>

      {savedTree && (
        <div className="toast" role="status">
          <span>✿</span> ‘{savedTree}’ 트리의 첫 자리를 만들었어요.
          <button type="button" onClick={() => setSavedTree("")} aria-label="알림 닫기">×</button>
        </div>
      )}

    </div>
  );
}
