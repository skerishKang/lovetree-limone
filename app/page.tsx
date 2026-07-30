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

export default function Home() {
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [treeName, setTreeName] = useState("우리의 빛나는 순간들");
  const [savedTree, setSavedTree] = useState("");

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsStartOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function createTree(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = treeName.trim();
    if (!nextName) return;
    setSavedTree(nextName);
    setIsStartOpen(false);
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
          <button className="login-button" type="button" onClick={() => setIsStartOpen(true)}>
            로그인
          </button>
          <button className="nav-start" type="button" onClick={() => setIsStartOpen(true)}>
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
              <button className="button button-primary" type="button" onClick={() => setIsStartOpen(true)}>
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

      {isStartOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsStartOpen(false)}>
          <section
            className="start-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" onClick={() => setIsStartOpen(false)} aria-label="창 닫기">
              ×
            </button>
            <p className="eyebrow">PLANT YOUR FIRST MOMENT</p>
            <h2 id="start-title">
              어떤 러브트리를
              <br />
              <em>처음 심어볼까요?</em>
            </h2>
            <p>최애, 작품, 여행, 계절. 마음이 머문 주제라면 무엇이든 좋아요.</p>
            <form onSubmit={createTree}>
              <label htmlFor="tree-name">러브트리 이름</label>
              <input
                id="tree-name"
                value={treeName}
                onChange={(event) => setTreeName(event.target.value)}
                autoFocus
                maxLength={32}
                required
              />
              <button className="button button-primary" type="submit">
                이 이름으로 시작하기 <span aria-hidden="true">→</span>
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
