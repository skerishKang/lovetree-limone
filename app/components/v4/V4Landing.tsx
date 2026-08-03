"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const sampleMoments = [
  { label: "처음 발견한 순간", title: "한 장면이 오래 마음에 남았어요." },
  { label: "다음으로 찾아본 순간", title: "그 마음이 다른 영상으로 이어졌어요." },
  { label: "오래 간직할 문장", title: "시간이 지나도 다시 보고 싶은 기록." },
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

export default function V4Landing() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<"home" | "discovery">("home");
  const [treeName, setTreeName] = useState("주연에게 마음이 멈춘 순간들");
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [note, setNote] = useState("우연히 보게 됐는데, 하루 종일 이 장면이 생각났어요.");
  const [date, setDate] = useState("2026-07-28");
  const [toast, setToast] = useState("");

  const videoId = useMemo(() => youtubeId(url), [url]);
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function startTree(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = treeName.trim();
    if (!name) {
      setToast("러브트리 이름을 적어 주세요.");
      return;
    }
    localStorage.setItem("lovetree-v4-tree-name", name);
    setModalOpen(false);
    setView("discovery");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveDiscovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!videoId) {
      setToast("YouTube 링크를 확인해 주세요.");
      return;
    }
    const discovery = {
      treeName: treeName.trim(),
      url: url.trim(),
      videoId,
      title: "처음 마음이 멈춘 장면",
      note: note.trim() || "이 장면을 첫 순간으로 남겼어요.",
      date,
    };
    localStorage.setItem("lovetree-v4-discovery", JSON.stringify(discovery));
    setToast("첫 순간이 뿌리로 심어졌어요 ✦");
    window.setTimeout(() => router.push("/v4/trees/demo/onboarding/emotion"), 420);
  }

  return (
    <main className="v4-page">
      <div className="v4-landing-shell">
        <nav className="v4-landing-nav" aria-label="V4 주 메뉴">
          <div className="v4-brand" aria-label="LoveTree">
            <span className="v4-brand-mark" aria-hidden="true"><i /><b /></span>
            LoveTree
          </div>
          <button className="v4-nav-link" type="button" onClick={() => setToast("공개 러브트리는 V4 커뮤니티 단계에서 연결됩니다.")}>공개 트리</button>
          <button className="v4-nav-link" type="button" onClick={() => setToast("사람별 앨범은 V4 아카이브 단계에서 연결됩니다.")}>사람 앨범</button>
          <button className="v4-secondary" type="button" onClick={() => setModalOpen(true)}>첫 순간 심기</button>
        </nav>

        {view === "home" ? (
          <section className="v4-hero" aria-labelledby="v4-hero-title">
            <div className="v4-hero-copy">
              <p className="v4-eyebrow">A TREE MADE OF MOMENTS</p>
              <h1 id="v4-hero-title">
                <span>마음이 멈춘 장면을</span>
                <span className="v4-soft-line">한 장씩 남기고,</span>
                <span className="v4-rose-line">다음 순간으로 이어가요.</span>
              </h1>
              <p className="v4-hero-summary">
                좋아하게 된 시작과 그 뒤에 따라온 영상, 문장, 사람과 장소를 하나의 나무로 기록합니다.
                순간 사이의 이유가 가지가 되고, 시간이 쌓이면 나만의 사랑 연혁이 됩니다.
              </p>
              <div className="v4-hero-actions">
                <button className="v4-primary" type="button" onClick={() => setModalOpen(true)}>첫 순간 심기 →</button>
                <button className="v4-secondary" type="button" onClick={() => setToast("V4는 25개 원본 디자인을 차례로 연결하고 있습니다.")}>LoveTree 살펴보기</button>
              </div>
            </div>

            <div className="v4-hero-art" aria-label="가지에 연결된 순간 카드 미리보기">
              <svg className="v4-branch-art" viewBox="0 0 680 590" aria-hidden="true">
                <path d="M72 535 C183 448 219 342 278 271 C353 181 445 180 602 68" />
                <path className="twig" d="M218 354 C165 297 127 249 84 202" />
                <path className="twig" d="M319 228 C397 267 455 313 532 354" />
                <path className="twig" d="M424 167 C459 124 503 91 552 65" />
              </svg>
              {sampleMoments.map((moment) => (
                <article className="v4-hero-card" key={moment.label}>
                  <div className="v4-hero-card-image" />
                  <small>{moment.label.toUpperCase()}</small>
                  <strong>{moment.title}</strong>
                </article>
              ))}
              <span className="v4-flower one" aria-hidden="true" />
              <span className="v4-flower two" aria-hidden="true" />
              <span className="v4-flower three" aria-hidden="true" />
            </div>
          </section>
        ) : (
          <section className="v4-discovery" aria-labelledby="v4-discovery-title">
            <div className="v4-copy">
              <p className="v4-eyebrow">01 · 처음 발견</p>
              <h1 id="v4-discovery-title">
                <span>마음이 처음 멈춘</span>
                <span className="v4-soft-line">그 장면을</span>
                <span className="v4-rose-line">뿌리로 심어볼까요?</span>
              </h1>
              <p>
                완벽하게 설명하지 않아도 괜찮아요. 어디에서 발견했는지와 그날의 문장만 남겨도
                첫 가지가 자랄 준비를 시작합니다.
              </p>

              <form className="v4-form-paper" onSubmit={saveDiscovery}>
                <div className="v4-form-head">
                  <div>
                    <h2>처음 발견한 순간</h2>
                    <p>입력하는 동안 오른쪽 카드가 함께 바뀝니다.</p>
                  </div>
                  <span className="v4-form-icon" aria-hidden="true">✦</span>
                </div>

                <div className="v4-group">
                  <label className="v4-label" htmlFor="v4-content-url">콘텐츠 URL <small>YouTube 링크</small></label>
                  <input id="v4-content-url" className="v4-input" value={url} onChange={(event) => setUrl(event.target.value)} />
                  <p className="v4-field-status">{videoId ? "영상이 첫 순간 카드에 연결됐어요." : "링크를 넣으면 카드에 장면이 나타나요."}</p>
                </div>

                <div className="v4-group">
                  <label className="v4-label" htmlFor="v4-discovery-note">처음 어떤 마음이 들었나요? <small>{note.length} / 140</small></label>
                  <textarea id="v4-discovery-note" className="v4-textarea" maxLength={140} value={note} onChange={(event) => setNote(event.target.value)} />
                </div>

                <div className="v4-group">
                  <label className="v4-label" htmlFor="v4-discovery-date">발견한 날짜 <small>나중에 수정 가능</small></label>
                  <input id="v4-discovery-date" className="v4-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </div>

                <div className="v4-actions-row">
                  <button className="v4-primary" type="submit">이 순간 심기 →</button>
                  <button className="v4-secondary" type="button" onClick={() => setView("home")}>처음 화면</button>
                </div>
              </form>
            </div>

            <aside className="v4-preview-paper" aria-label="첫 순간 미리보기">
              <article className="v4-seed-preview-card">
                <div className="v4-preview-image" style={thumbnail ? { backgroundImage: `linear-gradient(180deg,rgba(255,248,239,.04),rgba(62,41,42,.24)),url(${thumbnail})` } : undefined} />
                <div className="v4-preview-meta">
                  <small>YOUR FIRST ROOT · {date || "날짜 미정"}</small>
                  <strong>{treeName}</strong>
                  <p>{note || "그날의 마음을 한 문장으로 남겨 주세요."}</p>
                </div>
              </article>
            </aside>
          </section>
        )}
      </div>

      {modalOpen ? (
        <div className="v4-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setModalOpen(false); }}>
          <section className="v4-seed-modal" role="dialog" aria-modal="true" aria-labelledby="v4-name-title">
            <button className="v4-close" type="button" aria-label="닫기" onClick={() => setModalOpen(false)}>×</button>
            <p className="v4-eyebrow">NAME YOUR LOVETREE</p>
            <h2 id="v4-name-title">이 마음의 나무에<br />어떤 이름을 붙일까요?</h2>
            <p>사람, 작품, 여행, 계절처럼 오래 기록하고 싶은 대상을 떠올려 주세요.</p>
            <form onSubmit={startTree}>
              <label className="v4-label" htmlFor="v4-tree-name">러브트리 이름</label>
              <input id="v4-tree-name" className="v4-input" autoFocus maxLength={60} value={treeName} onChange={(event) => setTreeName(event.target.value)} />
              <div className="v4-actions-row">
                <button className="v4-primary" type="submit">첫 장면 찾기 →</button>
                <button className="v4-secondary" type="button" onClick={() => setModalOpen(false)}>다음에</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {toast ? <div className="v4-toast" role="status" aria-live="polite">{toast}</div> : null}
    </main>
  );
}
