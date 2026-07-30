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

export default function Home() {
  const [view, setView] = useState<"home" | "builder">("home");
  const [treeName, setTreeName] = useState("우리의 빛나는 순간들");
  const [privacy, setPrivacy] = useState<PrivacyChoice>("private");
  const [savedTree, setSavedTree] = useState("");

  useEffect(() => {
    const returnHomeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && view === "builder") setView("home");
    };
    window.addEventListener("keydown", returnHomeOnEscape);
    return () => window.removeEventListener("keydown", returnHomeOnEscape);
  }, [view]);

  function createTree(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = treeName.trim();
    if (!nextName) return;
    setSavedTree(nextName);
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
