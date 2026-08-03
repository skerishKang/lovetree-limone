"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/v4/bookshelf-v1.css";

export interface BookChapter {
  title: string;
  url: string;
  mood: string;
  note: string;
}

export interface Book {
  id: string;
  name: string;
  english: string;
  category: "kpop" | "actor" | "series" | "all";
  color: string;
  accent: string;
  symbol: string;
  description: string;
  tags: string[];
  chapters: BookChapter[];
}

export const BOOKSHELF_V1_SOURCE = "lovetree-people-book-shelf-v1.html";
export const BOOKSHELF_V1_KEY = "lovetree-people-book-shelf-v1";

const BASE_BOOKS: Book[] = [
  {
    id: "juyeon",
    name: "주연",
    english: "JUYEON · THE BOYZ",
    category: "kpop",
    color: "#a84f5d",
    accent: "#a84f5d",
    symbol: "✦",
    description: "무대와 표정, 말투 사이에서 계속 새로 발견한 주연의 순간들.",
    tags: ["무대", "직캠", "새로운 표정"],
    chapters: [
      { title: "Miljyu in 2025", url: "https://www.youtube.com/watch?v=MUKjhyAl_Ig&t=586s", mood: "설렘", note: "짧은 장면 안에서도 표정과 분위기가 오래 남은 순간" },
      { title: "Cute to hot in seconds", url: "https://www.youtube.com/shorts/zmOI_XujTsU", mood: "반전", note: "한 장면 안에서 분위기가 바뀌는 그 순간을 기록" },
      { title: "Ain’t Salty 직캠", url: "https://www.youtube.com/shorts/35j5aBM2Yck?si=bYeR6EdT-gwuWhzw", mood: "몰입", note: "무대의 에너지와 시선이 한꺼번에 들어온 챕터" },
      { title: "THE BLAZE · Paris", url: "https://www.youtube.com/watch?v=C9VVlr_Zik8&t=113s", mood: "자랑스러움", note: "무대 밖의 모습까지 좋아하게 된 연결점" },
      { title: "Paris Balenciaga after party", url: "https://www.youtube.com/shorts/PiimgtLtdlE", mood: "새로움", note: "다음 영상을 찾게 만든 새로운 가지" },
    ],
  },
  {
    id: "plave",
    name: "플레이브",
    english: "PLAVE",
    category: "kpop",
    color: "#4265a8",
    accent: "#4265a8",
    symbol: "✧",
    description: "노래와 장난, 멤버 사이의 작은 반응을 모아둔 플레이브의 책.",
    tags: ["노래", "멤버 케미", "쇼츠"],
    chapters: [
      { title: "킬링보이스 예준 댓글모음", url: "https://www.youtube.com/shorts/ydoa30a-0Xw", mood: "기쁨", note: "목소리와 댓글 반응이 함께 기억된 첫 장" },
      { title: "은호한테 유독 단호한 예준", url: "https://www.youtube.com/shorts/BkRV7CgvA0M", mood: "웃음", note: "멤버 사이의 관계가 다음 영상을 부른 순간" },
      { title: "바로 노래 나오는 예준은호", url: "https://www.youtube.com/shorts/PBFzNM8vx8c", mood: "설렘", note: "짧지만 반복해서 보게 되는 노래의 가지" },
      { title: "늑대 강아지라고 부르기로 했어요", url: "https://www.youtube.com/shorts/f1mEHyRRowM", mood: "귀여움", note: "한 문장이 캐릭터의 이미지로 남은 챕터" },
      { title: "여기보세요 우르르르까꿍", url: "https://www.youtube.com/shorts/x_uv2v7EfCc", mood: "장난", note: "보고 나서 또 다른 멤버 영상을 찾게 된 연결" },
    ],
  },
  {
    id: "lee-junhyuk",
    name: "이준혁",
    english: "LEE JUNHYUK",
    category: "actor",
    color: "#906b5a",
    accent: "#906b5a",
    symbol: "◌",
    description: "배우의 말투, 역할의 결, 장난스러운 순간까지 이어진 이준혁의 기록.",
    tags: ["배우", "인터뷰", "캐릭터"],
    chapters: [
      { title: "게임을 안 하는 이유는?", url: "https://www.youtube.com/watch?v=a1gsq3jC0Tg", mood: "호기심", note: "배우가 아닌 사람의 말에 귀 기울인 시작" },
      { title: "이준혁의 손 크기는?", url: "https://www.youtube.com/watch?v=17UP5Pfmduo", mood: "귀여움", note: "사소한 질문이 기억에 남은 가벼운 챕터" },
      { title: "가을엔 영화처럼", url: "https://www.youtube.com/watch?v=2SDl278ezBQ", mood: "차분함", note: "목소리와 이야기가 천천히 스며든 순간" },
      { title: "꼬시는 로봇 서강준", url: "https://www.youtube.com/watch?v=vv-adRSM9xY", mood: "웃음", note: "캐릭터와 배우를 함께 보게 된 가지" },
      { title: "쓰리피스 입은 서동재", url: "https://www.youtube.com/watch?v=-uYx6joIm0g", mood: "몰입", note: "역할의 분위기가 좋아함으로 바뀐 챕터" },
    ],
  },
  {
    id: "lee-junyoung",
    name: "이준영",
    english: "LEE JUNYOUNG",
    category: "actor",
    color: "#6f8a76",
    accent: "#5e7053",
    symbol: "☘",
    description: "강한 캐릭터와 장난스러운 얼굴 사이의 폭을 따라간 이준영의 책.",
    tags: ["연기", "캐릭터", "반전"],
    chapters: [
      { title: "학교 일진 이준영", url: "https://www.youtube.com/shorts/2EPecZDETs4", mood: "긴장", note: "연기와 캐릭터의 힘으로 시선을 잡은 시작" },
      { title: "D.P. 연기", url: "https://www.youtube.com/watch?v=D3GEii5gC0E", mood: "몰입", note: "한 장면을 더 찾아보게 만든 연기 챕터" },
      { title: "래퍼 짬바 나와버림", url: "https://www.youtube.com/shorts/ojiKDGpsujk", mood: "웃음", note: "배우 밖의 리듬감이 보인 순간" },
      { title: "연기하는 강아지", url: "https://www.youtube.com/watch?v=uQVm-r7de8w", mood: "귀여움", note: "반전의 표정이 다음 가지로 이어진 장면" },
      { title: "금성제의 차가운 순간", url: "https://www.youtube.com/shorts/LvSELb6ADpA", mood: "서늘함", note: "캐릭터의 결을 더 깊게 들여다본 챕터" },
    ],
  },
  {
    id: "nicholas",
    name: "니콜라스 갈리친",
    english: "NICHOLAS GALITZINE",
    category: "actor",
    color: "#68748c",
    accent: "#68748c",
    symbol: "✦",
    description: "작품, 인터뷰, 패션과 사람 사이에서 발견한 니콜라스의 순간들.",
    tags: ["영화", "인터뷰", "패션"],
    chapters: [
      { title: "10 Things · Can’t Live Without", url: "https://www.youtube.com/watch?v=tKF_OrRO7Uk", mood: "호기심", note: "취향을 통해 사람을 더 알고 싶어진 시작" },
      { title: "Mary & George 인터뷰", url: "https://www.youtube.com/watch?v=ABSmGe0QUUI", mood: "깊이", note: "작품과 배우의 생각을 함께 본 챕터" },
      { title: "Vogue Met Gala 준비", url: "https://www.youtube.com/watch?v=n8wjtCBglPM", mood: "설렘", note: "무대 밖의 준비 과정이 인상 깊었던 순간" },
      { title: "패션의 밤에 도착한 순간", url: "https://www.youtube.com/shorts/yUSNwqxqLhE", mood: "빛남", note: "짧은 영상이 긴 감상으로 이어진 가지" },
      { title: "Bottoms · Jeff interview", url: "https://www.youtube.com/watch?v=kreZrxW97QA", mood: "유쾌함", note: "역할의 매력과 실제 말투가 겹쳐 보인 챕터" },
    ],
  },
  {
    id: "cooper",
    name: "쿠퍼 코치",
    english: "COOPER KOCH",
    category: "series",
    color: "#a06d59",
    accent: "#a06d59",
    symbol: "◎",
    description: "작품 속 관계와 배우의 실제 인터뷰를 함께 모은 쿠퍼 코치의 책.",
    tags: ["작품", "관계", "인터뷰"],
    chapters: [
      { title: "Lyle & Erik", url: "https://www.youtube.com/watch?v=OlStajYFKyk", mood: "관계", note: "두 인물의 관계를 처음 따라간 챕터" },
      { title: "Monsters interview", url: "https://www.youtube.com/watch?v=izXxxPszHOY", mood: "집중", note: "작품 밖에서 관계를 설명하는 목소리" },
      { title: "Janet Nepales interview", url: "https://www.youtube.com/watch?v=noB2B8w8lsQ", mood: "호기심", note: "배우가 역할을 만든 과정을 들여다본 순간" },
      { title: "The Lyle and Erik story", url: "https://www.youtube.com/watch?v=LUvq_09O1As", mood: "몰입", note: "이야기의 감정선을 더 깊게 따라간 가지" },
      { title: "Swallowed · independent filmmaking", url: "https://www.youtube.com/watch?v=9HqAqjjvPW8", mood: "발견", note: "다른 작품으로 관심이 확장된 챕터" },
    ],
  },
  {
    id: "hudson",
    name: "허드슨",
    english: "HUDSON WILLIAMS",
    category: "series",
    color: "#58728e",
    accent: "#58728e",
    symbol: "◇",
    description: "Heated Rivalry와 인터뷰, 장난스러운 순간까지 이어진 허드슨의 기록.",
    tags: ["Heated Rivalry", "인터뷰", "비하인드"],
    chapters: [
      { title: "GQ BTS · Hudson & Connor", url: "https://www.youtube.com/shorts/DRK7cuaRri0", mood: "설렘", note: "두 사람의 관계를 더 보고 싶어진 시작" },
      { title: "Jimmy와 hockey stretch", url: "https://www.youtube.com/watch?v=SfLq1eE_20A", mood: "웃음", note: "작품 밖의 유머와 자연스러움이 남은 순간" },
      { title: "Heated Rivalry fight", url: "https://www.youtube.com/watch?v=SqZLCMFVKlU", mood: "긴장", note: "캐릭터의 감정이 크게 흔들린 챕터" },
      { title: "Media training 7 minutes", url: "https://www.youtube.com/watch?v=_VCN2ckG4Ak", mood: "귀여움", note: "사람 자체를 좋아하게 된 인터뷰 가지" },
      { title: "Dangerously attractive", url: "https://www.youtube.com/watch?v=7qkfWK2Y_Kg", mood: "반짝임", note: "짧은 감탄이 다음 영상으로 이어진 기록" },
    ],
  },
];

export function youtubeId(url: string): string {
  const match = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([^?&/]+)/i);
  return match ? match[1] : "";
}

export function categoryLabel(category: Book["category"]): string {
  if (category === "kpop") return "K-pop";
  if (category === "actor") return "배우";
  if (category === "series") return "작품·캐릭터";
  return "LoveTree";
}

export function coverStyle(book: Book): React.CSSProperties {
  return {
    "--cover": book.color,
    "--cover-accent": book.accent,
    "--tilt": `${(book.id.length % 5) - 2}deg`,
  } as React.CSSProperties;
}

export default function V4BookShelfV1() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "kpop" | "actor" | "series">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [customBooks, setCustomBooks] = useState<Book[]>([]);
  const [modal, setModal] = useState<"new" | "video" | null>(null);
  const [toast, setToast] = useState("");
  const [videoSrc, setVideoSrc] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoExternal, setVideoExternal] = useState("");
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newChapter, setNewChapter] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const allBooks = useMemo(() => BASE_BOOKS.concat(customBooks), [customBooks]);
  const selectedBook = useMemo(() => allBooks.find((b) => b.id === selectedId) ?? null, [allBooks, selectedId]);

  const save = (next: { id: string | null; index: number; books: Book[] }) => {
    try {
      localStorage.setItem(BOOKSHELF_V1_KEY, JSON.stringify({ selectedId: next.id, chapterIndex: next.index, customBooks: next.books }));
    } catch {
      // storage unavailable
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(BOOKSHELF_V1_KEY) || "{}");
        if (stored.selectedId) setSelectedId(stored.selectedId);
        if (Number.isInteger(stored.chapterIndex)) setChapterIndex(stored.chapterIndex);
        if (Array.isArray(stored.customBooks)) setCustomBooks(stored.customBooks);
      } catch {
        // ignore corrupt storage
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab" && modal) {
        const nodes = modalRef.current?.querySelectorAll<HTMLElement>("button, input, [href]");
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
  }, [modal]);

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allBooks.filter((book) => {
      const matchesFilter = filter === "all" || book.category === filter;
      const matchesQuery =
        !q ||
        [book.name, book.english, book.description]
          .concat(book.tags)
          .concat(book.chapters.map((c) => c.title))
          .join(" ")
          .toLowerCase()
          .indexOf(q) >= 0;
      return matchesFilter && matchesQuery;
    });
  }, [allBooks, filter, query]);

  const openBook = (id: string) => {
    setSelectedId(id);
    setChapterIndex(0);
    save({ id, index: 0, books: customBooks });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToShelf = () => {
    setSelectedId(null);
    save({ id: null, index: chapterIndex, books: customBooks });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openVideo = (book: Book, chapter: BookChapter) => {
    const id = youtubeId(chapter.url);
    setVideoTitle(`${book.name} · ${chapter.title}`);
    setVideoSrc(id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : "");
    setVideoExternal(chapter.url);
    setModal("video");
  };

  const submitNewBook = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const url = newUrl.trim();
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
        { title: newChapter.trim() || "처음 마음이 움직인 장면", url, mood: "첫 마음", note: "이 사람을 처음 책으로 만들게 된 순간" },
      ],
    };
    const next = customBooks.concat(custom);
    setCustomBooks(next);
    save({ id: selectedId, index: chapterIndex, books: next });
    setModal(null);
    setNewName("");
    setNewUrl("");
    setNewChapter("");
    showToast(`${name}의 LoveTree 책을 만들었어요.`);
  };

  const chapter = selectedBook ? selectedBook.chapters[Math.min(chapterIndex, selectedBook.chapters.length - 1)] : null;

  return (
    <div className="bsv1-app">
      <header className="bsv1-topbar">
        <a className="bsv1-brand" href="#" aria-label="LoveTree 홈" onClick={(e) => e.preventDefault()}>
          <span className="bsv1-brand-mark" aria-hidden="true">
            <i />
            <b />
          </span>
          <span>
            <strong>러브트리</strong>
            <small>LoveTree · LOVE MOMENT TREE</small>
          </span>
        </a>
        <div className="bsv1-crumbs">
          <span id="bsv1-crumb-label">{selectedBook ? `${selectedBook.name} · LoveTree 책` : "사람별 기억 책장"}</span>
        </div>
        <div className="bsv1-top-actions">
          <button className="bsv1-ghost" type="button" onClick={() => setModal("new")}>
            새 책 만들기 +
          </button>
        </div>
      </header>

      <main className="bsv1-page">
        {!selectedBook ? (
          <section className="bsv1-shelf-view" id="bsv1-shelf-view">
            <section className="bsv1-hero">
              <div className="bsv1-hero-copy">
                <p className="bsv1-eyebrow">LOVE MOMENT LIBRARY · PEOPLE</p>
                <h1>
                  좋아한 사람마다
                  <br />
                  <em>한 권의 책</em>이 있어요.
                </h1>
                <p>사람을 고르면 그 사람에게 남긴 영상들이 챕터가 되어 펼쳐져요. 책장을 넘기듯, 내가 좋아하게 된 경로를 다시 따라가 보세요.</p>
                <div className="bsv1-hero-note">
                  <strong>한 사람 · 한 나무</strong>
                  <span>책은 앨범이고, 책 안의 챕터는 LoveTree의 가지예요.</span>
                </div>
              </div>
              <div className="bsv1-shelf-stage" aria-label="사람별 LoveTree 책장 미리보기">
                <span className="bsv1-stage-label">LOVE TREE LIBRARY · SELECT A VOLUME</span>
                <span className="bsv1-stage-hint">책을 고르면 열립니다</span>
                <div className="bsv1-mini-books">
                  {BASE_BOOKS.slice(0, 4).map((book, i) => (
                    <div
                      key={book.id}
                      className="bsv1-mini-book"
                      style={{ "--book": book.color, "--tilt": `${[-4, 2, -2, 4][i]}deg` } as React.CSSProperties}
                    >
                      <i />
                      <span>{book.name}</span>
                    </div>
                  ))}
                  <div className="bsv1-mini-shelf" />
                </div>
              </div>
            </section>

            <div className="bsv1-controls">
              <div className="bsv1-search">
                <input
                  type="search"
                  placeholder="사람이나 챕터를 검색해보세요"
                  aria-label="책 검색"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="bsv1-filter-row" role="group" aria-label="책 분류">
                {(["all", "kpop", "actor", "series"] as const).map((f) => (
                  <button
                    key={f}
                    className={`bsv1-filter${filter === f ? " active" : ""}`}
                    type="button"
                    onClick={() => setFilter(f)}
                  >
                    {f === "all" ? "전체" : f === "kpop" ? "K-pop" : f === "actor" ? "배우" : "작품·캐릭터"}
                  </button>
                ))}
              </div>
              <span className="bsv1-result-count" id="bsv1-result-count">
                {filteredBooks.length}권의 LoveTree
              </span>
            </div>

            <div className="bsv1-bookshelf" id="bsv1-bookshelf" aria-live="polite">
              {filteredBooks.length ? (
                filteredBooks.map((book, index) => (
                  <article className="bsv1-book-item" key={book.id}>
                    <button
                      className="bsv1-book-button"
                      type="button"
                      aria-label={`${book.name} 책 열기`}
                      onClick={() => openBook(book.id)}
                    >
                      <div className="bsv1-book-cover" style={coverStyle(book)}>
                        <span className="bsv1-cover-number">VOLUME · {String(index + 1).padStart(2, "0")}</span>
                        <span className="bsv1-cover-symbol">
                          <span>{book.symbol}</span>
                        </span>
                        <strong className="bsv1-cover-title">{book.name}</strong>
                        <small className="bsv1-cover-subtitle">{book.english}</small>
                      </div>
                      <span className="bsv1-book-meta">
                        <strong>{book.name}</strong>
                        <span>
                          {book.chapters.length}개의 챕터 · {categoryLabel(book.category)}
                        </span>
                      </span>
                    </button>
                    <div className="bsv1-book-tags">
                      {book.tags.slice(0, 3).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <div className="bsv1-empty-state">
                  <strong>아직 이 책장에는 없어요.</strong>
                  <span>다른 검색어를 입력하거나 새 책을 만들어보세요.</span>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="bsv1-detail-view active" id="bsv1-detail-view">
            <div className="bsv1-detail-head">
              <button className="bsv1-back-button" type="button" onClick={backToShelf}>
                ← 책장으로 돌아가기
              </button>
              <span className="bsv1-result-count" id="bsv1-detail-count">
                {selectedBook.chapters.length} chapters
              </span>
            </div>
            <div className="bsv1-detail-layout">
              <aside className="bsv1-detail-book">
                <div className="bsv1-book-cover bsv1-detail-cover" style={coverStyle(selectedBook)}>
                  <span className="bsv1-cover-number">LOVE MOMENT TREE</span>
                  <span className="bsv1-cover-symbol">
                    <span>{selectedBook.symbol}</span>
                  </span>
                  <strong className="bsv1-cover-title">{selectedBook.name}</strong>
                  <small className="bsv1-cover-subtitle">{selectedBook.english}</small>
                </div>
                <span className="bsv1-detail-label">ONE PERSON · ONE LOVETREE</span>
                <h2>{selectedBook.name}</h2>
                <p>{selectedBook.chapters.length}개의 기억 챕터</p>
              </aside>
              <section className="bsv1-chapter-area">
                <p className="bsv1-eyebrow">VOLUME · {selectedBook.english}</p>
                <h2>{selectedBook.name}의 LoveTree</h2>
                <p>{selectedBook.description}</p>
                <div className="bsv1-chapter-tree" aria-label="챕터 연결 트리">
                  <button
                    className="bsv1-chapter-node root active"
                    type="button"
                    onClick={() => showToast(`${selectedBook.name}의 첫 마음에서 시작한 LoveTree예요.`)}
                  >
                    <span style={{ "--node": selectedBook.color } as React.CSSProperties}>♥</span>
                    <b>첫 마음</b>
                  </button>
                  {selectedBook.chapters.map((item, index) => (
                    <button
                      key={`${selectedBook.id}-${index}`}
                      className={`bsv1-chapter-node${index === chapterIndex ? " active" : ""}`}
                      type="button"
                      onClick={() => {
                        setChapterIndex(index);
                        save({ id: selectedBook.id, index, books: customBooks });
                      }}
                    >
                      <span
                        style={{ "--node": index % 2 ? selectedBook.accent : selectedBook.color } as React.CSSProperties}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <b>챕터 {index + 1}</b>
                    </button>
                  ))}
                </div>
                {chapter && (
                  <article className="bsv1-chapter-page">
                    <div className="bsv1-chapter-media">
                      <img
                        src={`https://img.youtube.com/vi/${youtubeId(chapter.url)}/hqdefault.jpg`}
                        alt=""
                        loading="lazy"
                      />
                    </div>
                    <div className="bsv1-chapter-copy">
                      <p className="bsv1-chapter-kicker">
                        CHAPTER {String(Math.min(chapterIndex, selectedBook.chapters.length - 1) + 1).padStart(2, "0")} ·{" "}
                        {chapter.mood}
                      </p>
                      <h3>{chapter.title}</h3>
                      <p>{chapter.note}</p>
                      <div className="bsv1-chapter-source">
                        <b>내가 남긴 결</b>
                        <span>{chapter.mood}</span>
                      </div>
                      <div className="bsv1-chapter-actions">
                        <button className="bsv1-open-video" type="button" onClick={() => openVideo(selectedBook, chapter)}>
                          이 챕터 영상 보기 ↗
                        </button>
                        <a
                          className="bsv1-chapter-secondary"
                          href={chapter.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          링크 새 창에서 열기
                        </a>
                      </div>
                    </div>
                  </article>
                )}
                <div className="bsv1-detail-foot">
                  <span id="bsv1-detail-source">bookmarks_LIKE_only_2026-07-28.html · {selectedBook.chapters.length} links</span>
                  <span>챕터를 누르면 가지가 바뀌어요</span>
                </div>
              </section>
            </div>
          </section>
        )}
      </main>

      <div className={`bsv1-toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>

      {modal === "new" && (
        <div className="bsv1-modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <section className="bsv1-modal" role="dialog" aria-modal="true" aria-labelledby="bsv1-new-book-title" ref={modalRef}>
            <button className="bsv1-modal-close" type="button" aria-label="닫기" onClick={() => setModal(null)}>
              ×
            </button>
            <p className="bsv1-eyebrow">NEW LOVE TREE VOLUME</p>
            <h2 id="bsv1-new-book-title">
              새로운 사람의
              <br />
              책을 만들어요.
            </h2>
            <p>사람 이름과 첫 영상 링크만 넣으면 책이 만들어져요. 다음 챕터는 책 안에서 계속 추가할 수 있어요.</p>
            <form className="bsv1-new-book-form" onSubmit={submitNewBook}>
              <label>
                사람 이름
                <input required placeholder="예: 새로운 LoveTree" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </label>
              <label>
                첫 영상 링크
                <input required type="url" placeholder="https://youtu.be/..." value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
              </label>
              <label>
                첫 챕터 이름
                <input placeholder="예: 처음 마음이 움직인 장면" value={newChapter} onChange={(e) => setNewChapter(e.target.value)} />
              </label>
              <div className="bsv1-modal-actions">
                <button className="bsv1-ghost" type="button" onClick={() => setModal(null)}>
                  취소
                </button>
                <button className="bsv1-open-video" type="submit">
                  책 만들기 →
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modal === "video" && (
        <div className="bsv1-modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <section className="bsv1-modal" role="dialog" aria-modal="true" aria-labelledby="bsv1-video-title" ref={modalRef}>
            <button className="bsv1-modal-close" type="button" aria-label="닫기" onClick={() => setModal(null)}>
              ×
            </button>
            <p className="bsv1-eyebrow">CHAPTER · VIDEO MOMENT</p>
            <h2 id="bsv1-video-title">{videoTitle}</h2>
            <div className="bsv1-video-frame">
              <iframe title="LoveTree 챕터 영상" src={videoSrc} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            </div>
            <p id="bsv1-video-fallback">영상이 재생되지 않으면 아래 링크로 열어보세요.</p>
            <div className="bsv1-modal-actions">
              <a className="bsv1-open-video" href={videoExternal} target="_blank" rel="noopener noreferrer">
                YouTube에서 열기 ↗
              </a>
              <button className="bsv1-ghost" type="button" onClick={() => setModal(null)}>
                닫기
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
