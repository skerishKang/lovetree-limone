"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../styles/v4/bookshelf-v2-3d.css";
import type { Book } from "./V4BookShelfV1";
import { BOOKSHELF_V2P1_KEY, categoryLabel, coverStyle, youtubeId } from "./V4BookShelfV2P1";

export const BOOKSHELF_V2D3_SOURCE = "lovetree-people-book-shelf-v2-3d.html";
export const BOOKSHELF_V2D3_KEY = "lovetree-people-book-shelf-v2-3d";

export { BOOKSHELF_V2P1_KEY };

export default function V4BookShelfV2D3() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "kpop" | "actor" | "series">("all");
  const [customBooks, setCustomBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [turnClass, setTurnClass] = useState<"turn-next" | "turn-prev" | "">("");
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [dragRotate, setDragRotate] = useState(0);
  const [dragTilt, setDragTilt] = useState(0);
  const book3dRef = useRef<HTMLDivElement | null>(null);
  const shelfDragRef = useRef<{ active: boolean; startX: number; scrollLeft: number; moved: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  const allBooks = useMemo(() => BASE_BOOKS.concat(customBooks), [customBooks]);
  const book = useMemo(() => allBooks.find((b) => b.id === selectedId) ?? null, [allBooks, selectedId]);

  const persist = useCallback(
    (next: { id: string | null; index: number; books: Book[] }) => {
      try {
        localStorage.setItem(BOOKSHELF_V2D3_KEY, JSON.stringify({ selectedId: next.id, chapterIndex: next.index, customBooks: next.books }));
      } catch {
        // storage unavailable
      }
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(BOOKSHELF_V2D3_KEY) || "{}");
        if (saved.selectedId) setSelectedId(saved.selectedId);
        if (Number.isInteger(saved.chapterIndex)) setChapterIndex(saved.chapterIndex);
        if (Array.isArray(saved.customBooks)) setCustomBooks(saved.customBooks);
      } catch {
        // ignore corrupt storage
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  const shelfList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allBooks.filter((b) => {
      const filterOk = filter === "all" || b.category === filter;
      const queryOk =
        !q ||
        [b.name, b.english, b.description].concat(b.tags).concat(b.chapters.map((c) => c.title)).join(" ").toLowerCase().indexOf(q) >= 0;
      return filterOk && queryOk;
    });
  }, [allBooks, filter, query]);

  const openReader = useCallback(
    (id: string) => {
      setSelectedId(id);
      setChapterIndex(0);
      setOpen(false);
      persist({ id, index: 0, books: customBooks });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [customBooks, persist],
  );

  const backToShelf = useCallback(() => {
    setSelectedId(null);
    setOpen(false);
    persist({ id: null, index: chapterIndex, books: customBooks });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [chapterIndex, customBooks, persist]);

  const openBook = () => {
    if (open) return;
    setOpen(true);
    showToast("책이 열렸어요. 첫 챕터의 영상이 재생됩니다.");
  };

  const closeBook = () => {
    setOpen(false);
    setTurnClass("");
    persist({ id: selectedId, index: chapterIndex, books: customBooks });
  };

  const turnPage = (direction: number, forcedIndex?: number) => {
    if (!book) return;
    if (!open) {
      openBook();
      return;
    }
    const next = typeof forcedIndex === "number" ? forcedIndex : chapterIndex + direction;
    if (next < 0 || next >= book.chapters.length) {
      showToast(next < 0 ? "첫 챕터예요." : "마지막 챕터예요.");
      return;
    }
    setChapterIndex(next);
    setTurnClass("");
    setTimeout(() => setTurnClass(direction >= 0 ? "turn-next" : "turn-prev"), 20);
    persist({ id: selectedId, index: next, books: customBooks });
    setTimeout(() => setTurnClass(""), 620);
  };

  const handleBookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = { active: true, startX: e.clientX, startY: e.clientY, moved: false };
    book3dRef.current?.classList.add("dragging");
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleBookPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag?.active) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) drag.moved = true;
    setDragRotate((open ? dx * 0.12 : dx * 0.22));
    setDragTilt(-dy * 0.05);
  };

  const handleBookPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag?.active) return;
    const dx = e.clientX - drag.startX;
    dragState.current = null;
    book3dRef.current?.classList.remove("dragging");
    setDragRotate(0);
    setDragTilt(0);
    if (!open) {
      if (Math.abs(dx) > 45 || !drag.moved) openBook();
      return;
    }
    if (Math.abs(dx) > 55) turnPage(dx < 0 ? 1 : -1);
  };

  const handleBookPointerCancel = () => {
    dragState.current = null;
    book3dRef.current?.classList.remove("dragging");
    setDragRotate(0);
    setDragTilt(0);
  };

  const handleShelfPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, input, [data-book-id]")) return;
    shelfDragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: railRef.current?.scrollLeft ?? 0,
      moved: false,
    };
    railRef.current?.classList.add("dragging");
    railRef.current?.setPointerCapture(e.pointerId);
  };

  const handleShelfPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = shelfDragRef.current;
    if (!drag?.active || !railRef.current) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 6) drag.moved = true;
    railRef.current.scrollLeft = drag.scrollLeft - dx;
  };

  const handleShelfPointerUp = () => {
    shelfDragRef.current = null;
    railRef.current?.classList.remove("dragging");
    setTimeout(() => {
      if (shelfDragRef.current) shelfDragRef.current.moved = false;
    }, 0);
  };

  const handleShelfPointerCancel = () => {
    shelfDragRef.current = null;
    railRef.current?.classList.remove("dragging");
  };

  const scrollShelf = (delta: number) => {
    railRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  const submitNewBook = (e: React.FormEvent) => {
    e.preventDefault();
    const name = (document.getElementById("bsv23-new-name") as HTMLInputElement)?.value.trim() || "";
    const url = (document.getElementById("bsv23-new-url") as HTMLInputElement)?.value.trim() || "";
    if (!name || !url) return;
    const custom: Book = {
      id: `custom-${Date.now()}`,
      name,
      english: "MY LOVE TREE",
      category: "all",
      color: "#8c6d83",
      accent: "#8c6d83",
      symbol: "♡",
      description: "새롭게 기록하기 시작한 LoveTree 책.",
      tags: ["새 책", "첫 마음"],
      chapters: [
        {
          title: (document.getElementById("bsv23-new-chapter") as HTMLInputElement)?.value.trim() || "처음 마음이 움직인 장면",
          url,
          mood: "첫 마음",
          note: "이 사람을 처음 책으로 만들게 된 순간",
        },
      ],
    };
    const next = customBooks.concat(custom);
    setCustomBooks(next);
    persist({ id: selectedId, index: chapterIndex, books: next });
    setModalOpen(false);
    (e.target as HTMLFormElement).reset();
    showToast(`${name}의 책을 만들었어요.`);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        closeBook();
        return;
      }
      if (e.key === "ArrowRight") turnPage(1);
      if (e.key === "ArrowLeft") turnPage(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, chapterIndex, book]);

  const chapter = book ? book.chapters[Math.min(chapterIndex, book.chapters.length - 1)] : null;

  return (
    <div className="bsv23-app">
      <header className="bsv23-topbar">
        <a className="bsv23-brand" href="#" aria-label="LoveTree 홈" onClick={(e) => e.preventDefault()}>
          <span className="bsv23-brand-mark" aria-hidden="true">
            <i />
            <b />
          </span>
          <span>
            <strong>러브트리</strong>
            <small>LoveTree · LOVE MOMENT TREE</small>
          </span>
        </a>
        <div className="bsv23-crumbs">
          <span>{selectedId ? `${book?.name ?? "책"} · LoveTree 책` : "사람별 기억 책장"}</span>
        </div>
        <div className="bsv23-top-actions">
          <button className="bsv23-ghost" type="button" onClick={() => setModalOpen(true)}>
            새 책 만들기 +
          </button>
        </div>
      </header>

      <main className="bsv23-page">
        <section className="bsv23-shelf-screen" style={{ display: selectedId ? "none" : "block" }}>
          <section className="bsv23-hero">
            <div className="bsv23-hero-copy">
              <p className="bsv23-eyebrow">LOVE MOMENT LIBRARY · PEOPLE</p>
              <h1>
                좋아한 사람마다
                <br />
                <em>한 권의 책</em>이 있어요.
              </h1>
              <p>책을 마우스로 끌어 고르고, 표지를 누른 채 오른쪽으로 움직여 열어보세요. 책장을 넘길 때마다 그 사람에게 남긴 다음 영상이 나타나요.</p>
              <div className="bsv23-hero-note">
                <strong>한 사람 · 한 나무</strong>
                <span>책은 앨범이고, 책 안의 장면은 LoveTree의 가지예요.</span>
              </div>
            </div>
            <div className="bsv23-hero-stage" aria-label="3D LoveTree 책장 미리보기">
              <span className="bsv23-stage-label">LOVE TREE LIBRARY · DRAG TO CHOOSE</span>
              <span className="bsv23-stage-hint">표지를 누르면 열립니다</span>
              <div className="bsv23-hero-books">
                {BASE_BOOKS.slice(0, 4).map((b, i) => (
                  <div key={b.id} className="bsv23-hero-book" style={{ "--book": b.color, "--tilt": `${[-4, 2, -2, 4][i]}deg` } as React.CSSProperties}>
                    <i />
                    <span>{b.name}</span>
                  </div>
                ))}
                <div className="bsv23-hero-shelf" />
              </div>
            </div>
          </section>

          <div className="bsv23-shelf-controls">
            <div className="bsv23-search">
              <input
                type="search"
                placeholder="사람이나 챕터 검색"
                aria-label="책 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="bsv23-filter-row" role="group" aria-label="책 분류">
              {(["all", "kpop", "actor", "series"] as const).map((f) => (
                <button
                  key={f}
                  className={`bsv23-filter${filter === f ? " active" : ""}`}
                  type="button"
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "전체" : f === "kpop" ? "K-pop" : f === "actor" ? "배우" : "작품·캐릭터"}
                </button>
              ))}
            </div>
            <span className="bsv23-count">{shelfList.length}권</span>
          </div>

          <section className="bsv23-shelf-viewport" aria-label="사람별 LoveTree 책장">
            <button className="bsv23-shelf-arrow left" type="button" aria-label="이전 책" onClick={() => scrollShelf(-430)}>
              ‹
            </button>
            <div
              className="bsv23-shelf-rail"
              ref={railRef}
              onPointerDown={handleShelfPointerDown}
              onPointerMove={handleShelfPointerMove}
              onPointerUp={handleShelfPointerUp}
              onPointerCancel={handleShelfPointerCancel}
            >
              {shelfList.length ? (
                shelfList.map((b, index) => (
                  <article className="bsv23-book-card" key={b.id}>
                    <button type="button" data-book-id={b.id} aria-label={`${b.name} 책 열기`} onClick={() => openReader(b.id)}>
                      <div className="bsv23-book-cover" style={coverStyle(b)}>
                        <span className="bsv23-cover-number">VOLUME · {String(index + 1).padStart(2, "0")}</span>
                        <span className="bsv23-cover-symbol">
                          <span>{b.symbol}</span>
                        </span>
                        <strong className="bsv23-cover-title">{b.name}</strong>
                        <small className="bsv23-cover-subtitle">{b.english}</small>
                      </div>
                      <span className="bsv23-book-card-meta">
                        <strong>{b.name}</strong>
                        <span>
                          {b.chapters.length}개 챕터 · {categoryLabel(b.category)}
                        </span>
                      </span>
                    </button>
                    <div className="bsv23-book-tags">
                      {b.tags.slice(0, 2).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <div className="bsv23-empty">
                  <strong>아직 이 책장에는 없어요.</strong>
                  <span>다른 검색어를 입력하거나 새 책을 만들어보세요.</span>
                </div>
              )}
            </div>
            <button className="bsv23-shelf-arrow right" type="button" aria-label="다음 책" onClick={() => scrollShelf(430)}>
              ›
            </button>
            <div className="bsv23-shelf-base" aria-hidden="true" />
          </section>
        </section>

        {book && chapter && (
          <section className="bsv23-reader-screen active" id="bsv23-reader-screen">
            <div className="bsv23-reader-head">
              <button className="bsv23-back-button" type="button" onClick={backToShelf}>
                ← 책장으로 돌아가기
              </button>
              <span className="bsv23-reader-label">VOLUME · {book.english}</span>
            </div>
            <div className="bsv23-reader-layout">
              <section className="bsv23-reader-stage" aria-label="3D 책 리더">
                <div className="bsv23-reader-stage-top">
                  <span>VOLUME · {String(allBooks.indexOf(book) + 1).padStart(2, "0")}</span>
                  <span>DRAG COVER · TURN PAGES</span>
                </div>
                <div className="bsv23-reader-shadow" />
                <div className="bsv23-book-floor" />
                <div className="bsv23-book-3d-wrap">
                  <div
                    className={`bsv23-book-3d${open ? " open" : ""}`}
                    id="bsv23-book-3d"
                    tabIndex={0}
                    role="button"
                    aria-label="책 표지. 누른 채 오른쪽으로 움직여 책 열기"
                    ref={book3dRef}
                    style={{ "--drag-rotate": `${dragRotate}deg`, "--drag-tilt": `${dragTilt}deg` } as React.CSSProperties}
                    onPointerDown={handleBookPointerDown}
                    onPointerMove={handleBookPointerMove}
                    onPointerUp={handleBookPointerUp}
                    onPointerCancel={handleBookPointerCancel}
                  >
                    <div className="bsv23-book-cover-face" style={{ "--cover": book.color, "--cover-accent": book.accent } as React.CSSProperties}>
                      <span className="bsv23-cover-number">LOVE MOMENT TREE</span>
                      <span className="bsv23-cover-symbol">
                        <span>{book.symbol}</span>
                      </span>
                      <strong className="bsv23-cover-title">{book.name}</strong>
                      <small className="bsv23-cover-subtitle">ONE PERSON · ONE LOVETREE</small>
                    </div>
                    <div className="bsv23-page-spine" />
                    <div className={`bsv23-book-pages${turnClass ? ` ${turnClass}` : ""}`} id="bsv23-book-pages">
                      <div className="bsv23-page-side left">
                        {chapterIndex === 0 ? (
                          <>
                            <span className="bsv23-page-label">FIRST FEELING · {book.name}</span>
                            <div className="bsv23-chapter-art">
                              <span>{book.symbol}</span>
                            </div>
                            <span className="bsv23-page-number">THE FIRST MOMENT</span>
                          </>
                        ) : (
                          <>
                            <span className="bsv23-page-label">PREVIOUS CHAPTER · {String(chapterIndex).padStart(2, "0")}</span>
                            <h3>{book.chapters[chapterIndex - 1].title}</h3>
                            <p>{book.chapters[chapterIndex - 1].note}</p>
                            <span className="bsv23-page-number">LOVE PATH · {String(chapterIndex).padStart(2, "0")}</span>
                          </>
                        )}
                      </div>
                      <div className="bsv23-page-side right">
                        <div className="bsv23-page-video">
                          <span className="bsv23-page-label">
                            CHAPTER · {String(chapterIndex + 1).padStart(2, "0")} · {chapter.mood}
                          </span>
                          <iframe
                            key={`${book.id}-${chapterIndex}`}
                            title={chapter.title}
                            src={`https://www.youtube.com/embed/${youtubeId(chapter.url)}?autoplay=1&rel=0`}
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                          />
                          <h3>{chapter.title}</h3>
                          <p>{chapter.note}</p>
                          <a className="bsv23-open-external" href={chapter.url} target="_blank" rel="noopener noreferrer">
                            YouTube에서 전체 보기 ↗
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bsv23-reader-hint">{open ? "책장 위를 좌우로 끌거나 화살표로 한 장씩 넘겨보세요" : "표지를 누른 채 오른쪽으로 움직이면 책이 열려요"}</div>
                <div className="bsv23-reader-controls">
                  <button className="bsv23-reader-control" type="button" aria-label="이전 장" onClick={() => turnPage(-1)}>
                    ‹
                  </button>
                  <span className="bsv23-page-counter">
                    {open ? `PAGE ${String(chapterIndex + 1).padStart(2, "0")} / ${String(book.chapters.length).padStart(2, "0")}` : "CLOSED"}
                  </span>
                  <button className="bsv23-reader-control" type="button" aria-label="다음 장" onClick={() => turnPage(1)}>
                    ›
                  </button>
                  <button className={`bsv23-reader-control wide${open ? " bsv23-hidden" : ""}`} type="button" onClick={openBook}>
                    OPEN BOOK
                  </button>
                  <button className={`bsv23-reader-control wide${open ? "" : " bsv23-hidden"}`} type="button" onClick={closeBook}>
                    CLOSE BOOK
                  </button>
                </div>
              </section>
              <aside className="bsv23-reader-info" aria-labelledby="bsv23-reader-title">
                <p className="bsv23-eyebrow">VOLUME · {book.english}</p>
                <h2 id="bsv23-reader-title">{book.name}의 LoveTree</h2>
                <p>{book.description}</p>
                <div className="bsv23-info-rule">
                  <strong>책 속의 트리</strong>
                  <span>각 장은 다음 영상을 찾게 만든 감정의 가지입니다.</span>
                </div>
                <div className="bsv23-chapter-heading">
                  <strong>챕터 목록</strong>
                  <span>{book.chapters.length} chapters</span>
                </div>
                <div className="bsv23-chapter-list">
                  {book.chapters.map((c, index) => (
                    <button
                      key={`${book.id}-${index}`}
                      className={`bsv23-chapter-item${index === chapterIndex ? " active" : ""}`}
                      type="button"
                      style={{ "--node": index % 2 ? book.accent : book.color } as React.CSSProperties}
                      onClick={() => {
                        if (open) {
                          turnPage(index > chapterIndex ? 1 : -1, index);
                        } else {
                          setChapterIndex(index);
                          persist({ id: selectedId, index, books: customBooks });
                          showToast(`챕터 ${String(index + 1).padStart(2, "0")}을 선택했어요. 책을 열어보세요.`);
                        }
                      }}
                    >
                      <span className="bsv23-chapter-num">{String(index + 1).padStart(2, "0")}</span>
                      <span>
                        <strong>{c.title}</strong>
                        <small>{c.mood}</small>
                      </span>
                      <span className="bsv23-chapter-arrow">›</span>
                    </button>
                  ))}
                </div>
                <div className="bsv23-reader-info-foot">
                  <strong>사용 방법</strong>
                  <br />
                  표지 위에서 마우스를 누르고 오른쪽으로 움직여 책을 열어요. 열린 뒤에는 책장 위를 좌우로 끌거나 아래 화살표로 한 장씩 넘겨요.
                </div>
              </aside>
            </div>
          </section>
        )}
      </main>

      <div className={`bsv23-toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>

      {modalOpen && (
        <div className="bsv23-modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <section className="bsv23-modal" role="dialog" aria-modal="true" aria-labelledby="bsv23-new-book-title">
            <button className="bsv23-modal-close" type="button" aria-label="닫기" onClick={() => setModalOpen(false)}>
              ×
            </button>
            <p className="bsv23-eyebrow">NEW LOVE TREE VOLUME</p>
            <h2 id="bsv23-new-book-title">
              새로운 사람의
              <br />
              책을 만들어요.
            </h2>
            <p>사람 이름과 첫 영상 링크를 넣으면 책장에 새 책이 생겨요.</p>
            <form className="bsv23-new-book-form" onSubmit={submitNewBook}>
              <label>
                사람 이름
                <input id="bsv23-new-name" required placeholder="예: 새로운 LoveTree" />
              </label>
              <label>
                첫 영상 링크
                <input id="bsv23-new-url" required type="url" placeholder="https://youtu.be/..." />
              </label>
              <label>
                첫 챕터 이름
                <input id="bsv23-new-chapter" placeholder="예: 처음 마음이 움직인 장면" />
              </label>
              <div className="bsv23-modal-actions">
                <button className="bsv23-ghost" type="button" onClick={() => setModalOpen(false)}>
                  취소
                </button>
                <button className="bsv23-open-video" type="submit">
                  책 만들기 →
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

const dragState: { current: { active: boolean; startX: number; startY: number; moved: boolean } | null } = { current: null };

const BASE_BOOKS: Book[] = [
  {
    id: "juyeon", name: "주연", english: "JUYEON · THE BOYZ", category: "kpop", color: "#a84f5d", accent: "#a84f5d", symbol: "✦",
    description: "무대와 표정, 말투 사이에서 계속 새로 발견한 주연의 순간들.", tags: ["무대", "직캠", "새로운 표정"],
    chapters: [
      { title: "Miljyu in 2025", url: "https://www.youtube.com/watch?v=MUKjhyAl_Ig&t=586s", mood: "설렘", note: "짧은 장면 안에서도 표정과 분위기가 오래 남은 순간" },
      { title: "Cute to hot in seconds", url: "https://www.youtube.com/shorts/zmOI_XujTsU", mood: "반전", note: "한 장면 안에서 분위기가 바뀌는 그 순간을 기록" },
      { title: "Ain’t Salty 직캠", url: "https://www.youtube.com/shorts/35j5aBM2Yck?si=bYeR6EdT-gwuWhzw", mood: "몰입", note: "무대의 에너지와 시선이 한꺼번에 들어온 챕터" },
      { title: "THE BLAZE · Paris", url: "https://www.youtube.com/watch?v=C9VVlr_Zik8&t=113s", mood: "자랑스러움", note: "무대 밖의 모습까지 좋아하게 된 연결점" },
      { title: "Paris Balenciaga after party", url: "https://www.youtube.com/shorts/PiimgtLtdlE", mood: "새로움", note: "다음 영상을 찾게 만든 새로운 가지" },
    ],
  },
  {
    id: "plave", name: "플레이브", english: "PLAVE", category: "kpop", color: "#4265a8", accent: "#4265a8", symbol: "✧",
    description: "노래와 장난, 멤버 사이의 작은 반응을 모아둔 플레이브의 책.", tags: ["노래", "멤버 케미", "쇼츠"],
    chapters: [
      { title: "킬링보이스 예준 댓글모음", url: "https://www.youtube.com/shorts/ydoa30a-0Xw", mood: "기쁨", note: "목소리와 댓글 반응이 함께 기억된 첫 장" },
      { title: "은호한테 유독 단호한 예준", url: "https://www.youtube.com/shorts/BkRV7CgvA0M", mood: "웃음", note: "멤버 사이의 관계가 다음 영상을 부른 순간" },
      { title: "바로 노래 나오는 예준은호", url: "https://www.youtube.com/shorts/PBFzNM8vx8c", mood: "설렘", note: "짧지만 반복해서 보게 되는 노래의 가지" },
      { title: "늑대 강아지라고 부르기로 했어요", url: "https://www.youtube.com/shorts/f1mEHyRRowM", mood: "귀여움", note: "한 문장이 캐릭터의 이미지로 남은 챕터" },
      { title: "여기보세요 우르르르까꿍", url: "https://www.youtube.com/shorts/x_uv2v7EfCc", mood: "장난", note: "보고 나서 또 다른 멤버 영상을 찾게 된 연결" },
    ],
  },
  {
    id: "lee-junhyuk", name: "이준혁", english: "LEE JUNHYUK", category: "actor", color: "#906b5a", accent: "#906b5a", symbol: "◌",
    description: "배우의 말투, 역할의 결, 장난스러운 순간까지 이어진 이준혁의 기록.", tags: ["배우", "인터뷰", "캐릭터"],
    chapters: [
      { title: "게임을 안 하는 이유는?", url: "https://www.youtube.com/watch?v=a1gsq3jC0Tg", mood: "호기심", note: "배우가 아닌 사람의 말에 귀 기울인 시작" },
      { title: "이준혁의 손 크기는?", url: "https://www.youtube.com/watch?v=17UP5Pfmduo", mood: "귀여움", note: "사소한 질문이 기억에 남은 가벼운 챕터" },
      { title: "가을엔 영화처럼", url: "https://www.youtube.com/watch?v=2SDl278ezBQ", mood: "차분함", note: "목소리와 이야기가 천천히 스며든 순간" },
      { title: "꼬시는 로봇 서강준", url: "https://www.youtube.com/watch?v=vv-adRSM9xY", mood: "웃음", note: "캐릭터와 배우를 함께 보게 된 가지" },
      { title: "쓰리피스 입은 서동재", url: "https://www.youtube.com/watch?v=-uYx6joIm0g", mood: "몰입", note: "역할의 분위기가 좋아함으로 바뀐 챕터" },
    ],
  },
  {
    id: "lee-junyoung", name: "이준영", english: "LEE JUNYOUNG", category: "actor", color: "#6f8a76", accent: "#5e7053", symbol: "☘",
    description: "강한 캐릭터와 장난스러운 얼굴 사이의 폭을 따라간 이준영의 책.", tags: ["연기", "캐릭터", "반전"],
    chapters: [
      { title: "학교 일진 이준영", url: "https://www.youtube.com/shorts/2EPecZDETs4", mood: "긴장", note: "연기와 캐릭터의 힘으로 시선을 잡은 시작" },
      { title: "D.P. 연기", url: "https://www.youtube.com/watch?v=D3GEii5gC0E", mood: "몰입", note: "한 장면을 더 찾아보게 만든 연기 챕터" },
      { title: "래퍼 짬바 나와버림", url: "https://www.youtube.com/shorts/ojiKDGpsujk", mood: "웃음", note: "배우 밖의 리듬감이 보인 순간" },
      { title: "연기하는 강아지", url: "https://www.youtube.com/watch?v=uQVm-r7de8w", mood: "귀여움", note: "반전의 표정이 다음 가지로 이어진 장면" },
      { title: "금성제의 차가운 순간", url: "https://www.youtube.com/shorts/LvSELb6ADpA", mood: "서늘함", note: "캐릭터의 결을 더 깊게 들여다본 챕터" },
    ],
  },
  {
    id: "nicholas", name: "니콜라스 갈리친", english: "NICHOLAS GALITZINE", category: "actor", color: "#68748c", accent: "#68748c", symbol: "✦",
    description: "작품, 인터뷰, 패션과 사람 사이에서 발견한 니콜라스의 순간들.", tags: ["영화", "인터뷰", "패션"],
    chapters: [
      { title: "10 Things · Can’t Live Without", url: "https://www.youtube.com/watch?v=tKF_OrRO7Uk", mood: "호기심", note: "취향을 통해 사람을 더 알고 싶어진 시작" },
      { title: "Mary & George 인터뷰", url: "https://www.youtube.com/watch?v=ABSmGe0QUUI", mood: "깊이", note: "작품과 배우의 생각을 함께 본 챕터" },
      { title: "Vogue Met Gala 준비", url: "https://www.youtube.com/watch?v=n8wjtCBglPM", mood: "설렘", note: "무대 밖의 준비 과정이 인상 깊었던 순간" },
      { title: "패션의 밤에 도착한 순간", url: "https://www.youtube.com/shorts/yUSNwqxqLhE", mood: "빛남", note: "짧은 영상이 긴 감상으로 이어진 가지" },
      { title: "Bottoms · Jeff interview", url: "https://www.youtube.com/watch?v=kreZrxW97QA", mood: "유쾌함", note: "역할의 매력과 실제 말투가 겹쳐 보인 챕터" },
    ],
  },
  {
    id: "cooper", name: "쿠퍼 코치", english: "COOPER KOCH", category: "series", color: "#a06d59", accent: "#a06d59", symbol: "◎",
    description: "작품 속 관계와 배우의 실제 인터뷰를 함께 모은 쿠퍼 코치의 책.", tags: ["작품", "관계", "인터뷰"],
    chapters: [
      { title: "Lyle & Erik", url: "https://www.youtube.com/watch?v=OlStajYFKyk", mood: "관계", note: "두 인물의 관계를 처음 따라간 챕터" },
      { title: "Monsters interview", url: "https://www.youtube.com/watch?v=izXxxPszHOY", mood: "집중", note: "작품 밖에서 관계를 설명하는 목소리" },
      { title: "Janet Nepales interview", url: "https://www.youtube.com/watch?v=noB2B8w8lsQ", mood: "호기심", note: "배우가 역할을 만든 과정을 들여다본 순간" },
      { title: "The Lyle and Erik story", url: "https://www.youtube.com/watch?v=LUvq_09O1As", mood: "몰입", note: "이야기의 감정선을 더 깊게 따라간 가지" },
      { title: "Swallowed · independent filmmaking", url: "https://www.youtube.com/watch?v=9HqAqjjvPW8", mood: "발견", note: "다른 작품으로 관심이 확장된 챕터" },
    ],
  },
  {
    id: "hudson", name: "허드슨", english: "HUDSON WILLIAMS", category: "series", color: "#58728e", accent: "#58728e", symbol: "◇",
    description: "Heated Rivalry와 인터뷰, 장난스러운 순간까지 이어진 허드슨의 기록.", tags: ["Heated Rivalry", "인터뷰", "비하인드"],
    chapters: [
      { title: "GQ BTS · Hudson & Connor", url: "https://www.youtube.com/shorts/DRK7cuaRri0", mood: "설렘", note: "두 사람의 관계를 더 보고 싶어진 시작" },
      { title: "Jimmy와 hockey stretch", url: "https://www.youtube.com/watch?v=SfLq1eE_20A", mood: "웃음", note: "작품 밖의 유머와 자연스러움이 남은 순간" },
      { title: "Heated Rivalry fight", url: "https://www.youtube.com/watch?v=SqZLCMFVKlU", mood: "긴장", note: "캐릭터의 감정이 크게 흔들린 챕터" },
      { title: "Media training 7 minutes", url: "https://www.youtube.com/watch?v=_VCN2ckG4Ak", mood: "귀여움", note: "사람 자체를 좋아하게 된 인터뷰 가지" },
      { title: "Dangerously attractive", url: "https://www.youtube.com/watch?v=7qkfWK2Y_Kg", mood: "반짝임", note: "짧은 감탄이 다음 영상으로 이어진 기록" },
    ],
  },
];
