"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const sampleMoments = [
  { label: "처음 발견한 순간", title: "한 장면이 오래 마음에 남았어요." },
  { label: "다음으로 찾아본 순간", title: "그 마음이 다른 영상으로 이어졌어요." },
  { label: "오래 간직할 문장", title: "시간이 지나도 다시 보고 싶은 기록." },
];

export default function V4Landing() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [treeName, setTreeName] = useState("주연에게 마음이 멈춘 순간들");
  const [toast, setToast] = useState("");

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
    setModalOpen(false);
    router.push(`/v4/trees/new?name=${encodeURIComponent(name)}`);
  }

  return (
    <main className="v4-page">
      <div className="v4-landing-shell">
        <nav className="v4-landing-nav" aria-label="V4 주 메뉴">
          <div className="v4-brand" aria-label="LoveTree">
            <span className="v4-brand-mark" aria-hidden="true"><i /><b /></span>
            LoveTree
          </div>
          <button className="v4-nav-link" type="button" onClick={() => router.push("/v4/community")}>공개 트리</button>
          <button className="v4-nav-link" type="button" onClick={() => setToast("사람별 앨범은 V4 아카이브 단계에서 실제 데이터와 연결합니다.")}>사람 앨범</button>
          <button className="v4-secondary" type="button" onClick={() => setModalOpen(true)}>첫 순간 심기</button>
        </nav>

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
              <button className="v4-secondary" type="button" onClick={() => router.push("/v4/community")}>LoveTree 살펴보기</button>
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
              <input id="v4-tree-name" className="v4-input" autoFocus maxLength={120} value={treeName} onChange={(event) => setTreeName(event.target.value)} />
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
