"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../styles/v4/bookshelf-v2a-2.css";

export const BOOKSHELF_V2A2_SOURCE = "lovetree-people-book-shelf-v2a-2-interaction-stable.html";
export const BOOKSHELF_V2A2_KEY = "lovetree-people-book-shelf-v2a-2-interaction-stable";

export interface V2A2Chapter {
  title: string;
  url: string;
  mood: string;
  note: string;
  time: string;
}

export interface V2A2Book {
  id: string;
  name: string;
  english: string;
  color: string;
  accent: string;
  soft: string;
  bg1: string;
  bg2: string;
  symbol: string;
  description: string;
  tags: string[];
  chapters: V2A2Chapter[];
}

type Mode = "SHELF" | "FOCUSING" | "FOCUSED" | "OPENING" | "OPEN" | "FLIPPING_NEXT" | "FLIPPING_PREV" | "CLOSING" | "RETURNING";

const BASE_BOOKS: V2A2Book[] = [
  {
    id: "juyeon", name: "주연", english: "JUYEON · THE BOYZ", color: "#8f3448", accent: "#dc7f8e", soft: "#f1b8c1", bg1: "#2b1820", bg2: "#09080b", symbol: "✦",
    description: "무대와 표정, 말투 사이에서 계속 새로 발견한 주연의 순간들.", tags: ["무대", "직캠", "새로운 표정"],
    chapters: [
      { title: "Miljyu in 2025", url: "https://www.youtube.com/watch?v=MUKjhyAl_Ig&t=586s", mood: "설렘", note: "짧은 장면 안에서도 표정과 분위기가 오래 남은 순간", time: "09:46" },
      { title: "Cute to hot in seconds", url: "https://www.youtube.com/shorts/zmOI_XujTsU", mood: "반전", note: "한 장면 안에서 분위기가 바뀌는 그 순간을 기록", time: "00:08" },
      { title: "Ain’t Salty 직캠", url: "https://www.youtube.com/shorts/35j5aBM2Yck?si=bYeR6EdT-gwuWhzw", mood: "몰입", note: "무대의 에너지와 시선이 한꺼번에 들어온 챕터", time: "00:12" },
    ],
  },
  {
    id: "plave", name: "플레이브", english: "PLAVE", color: "#233b83", accent: "#8c77d8", soft: "#c7b9ff", bg1: "#121933", bg2: "#080913", symbol: "✧",
    description: "노래와 장난, 멤버 사이의 작은 반응을 모아둔 플레이브의 책.", tags: ["노래", "멤버 케미", "쇼츠"],
    chapters: [
      { title: "킬링보이스 예준 댓글모음", url: "https://www.youtube.com/shorts/ydoa30a-0Xw", mood: "기쁨", note: "목소리와 댓글 반응이 함께 기억된 첫 장", time: "00:17" },
      { title: "은호한테 유독 단호한 예준", url: "https://www.youtube.com/shorts/BkRV7CgvA0M", mood: "웃음", note: "멤버 사이의 관계가 다음 영상을 부른 순간", time: "00:11" },
      { title: "바로 노래 나오는 예준은호", url: "https://www.youtube.com/shorts/PBFzNM8vx8c", mood: "설렘", note: "짧지만 반복해서 보게 되는 노래의 가지", time: "00:15" },
    ],
  },
  {
    id: "hudson", name: "허드슨", english: "HUDSON WILLIAMS", color: "#244b78", accent: "#70a6d9", soft: "#b8dbf2", bg1: "#122a3e", bg2: "#060e18", symbol: "◇",
    description: "Heated Rivalry와 인터뷰, 장난스러운 순간까지 이어진 허드슨의 기록.", tags: ["Heated Rivalry", "인터뷰", "비하인드"],
    chapters: [
      { title: "GQ BTS · Hudson & Connor", url: "https://www.youtube.com/shorts/DRK7cuaRri0", mood: "설렘", note: "두 사람의 관계를 더 보고 싶어진 시작", time: "00:09" },
      { title: "Jimmy와 hockey stretch", url: "https://www.youtube.com/watch?v=SfLq1eE_20A", mood: "웃음", note: "작품 밖의 유머와 자연스러움이 남은 순간", time: "02:14" },
      { title: "Heated Rivalry fight", url: "https://www.youtube.com/watch?v=SqZLCMFVKlU", mood: "긴장", note: "캐릭터의 감정이 크게 흔들린 챕터", time: "01:08" },
    ],
  },
];

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function mod(v: number, n: number): number {
  return ((v % n) + n) % n;
}

function youtubeId(url: string): string {
  const m = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([^?&/]+)/i);
  return m ? m[1] : "";
}

function isShort(url: string): boolean {
  return /youtube\.com\/shorts\//i.test(url);
}

export default function V4BookShelfV2A2() {
  const [mode, setMode] = useState<Mode>("SHELF");
  const [selected, setSelected] = useState(0);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [flipProgress, setFlipProgress] = useState(0);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  const [flipActive, setFlipActive] = useState(false);
  const [coverAngle, setCoverAngle] = useState(0);
  const [coverOpen, setCoverOpen] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [dragX, setDragX] = useState(0);
  const [glossX, setGlossX] = useState(35);
  const reducedRef = useRef(false);
  const coarseRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWheelRef = useRef(0);
  const railRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<HTMLDivElement | null>(null);
  const flipRef = useRef<HTMLDivElement | null>(null);
  const pageQueueRef = useRef<"next" | "prev" | null>(null);
  const shelfPointerRef = useRef<{ id: number; startX: number; moved: boolean } | null>(null);
  const cornerPointerRef = useRef<{ id: number; direction: "next" | "prev"; startX: number; progress: number; dragging: boolean } | null>(null);
  const animRef = useRef<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mq.matches);
      reducedRef.current = mq.matches;
      const coarse = window.matchMedia("(pointer: coarse)");
      setCoarsePointer(coarse.matches || window.innerWidth <= 760);
      coarseRef.current = coarse.matches || window.innerWidth <= 760;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const book = BASE_BOOKS[selected];

  const showToast = useCallback((t: string) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }, []);

  const setModeSafe = useCallback((m: Mode) => {
    setMode(m);
    if (appRef.current) {
      appRef.current.dataset.state = m;
      appRef.current.classList.toggle("focus-mode", m !== "SHELF" && m !== "RETURNING");
      appRef.current.setAttribute("aria-busy", String(busy));
    }
  }, [busy]);

  const animate = useCallback((from: number, to: number, duration: number, step: (v: number) => void, done?: () => void) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const start = performance.now();
    const frame = (now: number) => {
      const t = duration <= 1 ? 1 : clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      const v = from + (to - from) * eased;
      step(v);
      if (t < 1) {
        animRef.current = requestAnimationFrame(frame);
      } else if (done) {
        done();
      }
    };
    animRef.current = requestAnimationFrame(frame);
  }, []);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const layoutShelf = useCallback(
    (immediate: boolean) => {
      BASE_BOOKS.forEach((b, i) => {
        const el = railRef.current?.querySelector<HTMLElement>(`[data-book-index="${i}"]`);
        if (!el) return;
        const diff = shelfOffset(i, selected, BASE_BOOKS.length);
        el.classList.remove("side-left", "side-right", "hidden-side", "is-selected");
        let x = 0, y = 0, z = 0, r = 0, s = 0.78;
        if (diff === 0) {
          x = 0; y = -24; z = 70; r = 0; s = 1.03;
          el.classList.add("is-selected");
        } else if (diff === -1) {
          x = -285; y = 12; z = -85; r = 23; s = 0.79;
          el.classList.add("side-left");
        } else if (diff === 1) {
          x = 285; y = 12; z = -85; r = -23; s = 0.79;
          el.classList.add("side-right");
        } else {
          el.classList.add("hidden-side");
          x = diff < 0 ? -510 : 510;
          y = 28; z = -190; r = diff < 0 ? 38 : -38; s = 0.62;
        }
        el.style.setProperty("--sx", `${x}px`);
        el.style.setProperty("--sy", `${y}px`);
        el.style.setProperty("--sz", `${z}px`);
        el.style.setProperty("--sr", `${r}deg`);
        el.style.setProperty("--ss", String(s));
        if (immediate) el.style.transition = "none";
      });
      if (immediate) {
        requestAnimationFrame(() => {
          BASE_BOOKS.forEach((_, i) => {
            railRef.current?.querySelector<HTMLElement>(`[data-book-index="${i}"]`)?.style.removeProperty("transition");
          });
        });
      }
    },
    [selected],
  );

  useEffect(() => {
    layoutShelf(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateInfo = useCallback(() => {
    const b = BASE_BOOKS[selected];
    if (appRef.current) {
      appRef.current.style.setProperty("--theme-bg-1", b.bg1);
      appRef.current.style.setProperty("--theme-bg-2", b.bg2);
      appRef.current.style.setProperty("--theme-accent", b.accent);
      appRef.current.style.setProperty("--theme-soft", b.soft);
    }
  }, [selected]);

  useEffect(() => {
    updateInfo();
  }, [updateInfo]);

  const rotateBy = useCallback(
    (delta: number) => {
      if (busy || mode !== "SHELF") return;
      setBusy(true);
      setSelected((prev) => mod(prev + delta, BASE_BOOKS.length));
      layoutShelf(false);
      updateInfo();
      setTimeout(() => setBusy(false), reducedMotion ? 20 : 670);
    },
    [busy, mode, layoutShelf, updateInfo, reducedMotion],
  );

  const rotateTo = useCallback(
    (index: number) => {
      if (busy || mode !== "SHELF" || index === selected) return;
      const cw = mod(index - selected, BASE_BOOKS.length);
      rotateBy(cw === 1 || cw === -2 ? 1 : -1);
    },
    [busy, mode, selected, rotateBy],
  );

  const focusBook = useCallback(() => {
    if (busy || mode !== "SHELF") return;
    setBusy(true);
    setPage(0);
    setModeSafe("FOCUSING");
    const el = railRef.current?.querySelector<HTMLElement>(`[data-book-index="${selected}"]`);
    if (el) {
      el.classList.add("is-focused");
      BASE_BOOKS.forEach((_, i) => {
        if (i !== selected) railRef.current?.querySelector<HTMLElement>(`[data-book-index="${i}"]`)?.classList.add("hidden-side");
      });
      el.style.setProperty("--sx", "-210px");
      el.style.setProperty("--sy", "-122px");
      el.style.setProperty("--sz", "310px");
      el.style.setProperty("--sr", "-6deg");
      el.style.setProperty("--ss", "1.27");
    }
    setTimeout(() => {
      setBusy(false);
      setModeSafe("FOCUSED");
    }, reducedMotion ? 25 : 720);
  }, [busy, mode, selected, setModeSafe, reducedMotion]);

  const openBook = useCallback(() => {
    if (busy || mode !== "FOCUSED") return;
    setBusy(true);
    setModeSafe("OPENING");
    setCoverOpen(false);
    const el = railRef.current?.querySelector<HTMLElement>(`[data-book-index="${selected}"]`);
    if (el) {
      el.classList.add("is-opening");
      el.style.setProperty("--sx", "-190px");
      el.style.setProperty("--sy", "-80px");
      el.style.setProperty("--sz", "340px");
      el.style.setProperty("--sr", "-1deg");
      el.style.setProperty("--ss", "0.94");
    }
    animate(0, 1, reducedMotion ? 1 : 980, (p) => {
      setCoverAngle(-170 * p);
      setCoverOpen(p > 0.05);
    }, () => {
      el?.classList.remove("is-opening");
      el?.classList.add("is-open");
      setBusy(false);
      setModeSafe("OPEN");
    });
  }, [busy, mode, selected, setModeSafe, animate, reducedMotion]);

  const closeBook = useCallback(
    (done?: () => void) => {
      if (busy || mode !== "OPEN") return;
      setBusy(true);
      setModeSafe("CLOSING");
      pageQueueRef.current = null;
      setVideoId(null);
      const el = railRef.current?.querySelector<HTMLElement>(`[data-book-index="${selected}"]`);
      animate(1, 0, reducedMotion ? 1 : 900, (p) => {
        setCoverAngle(-170 * p);
        if (p < 0.05) setCoverOpen(false);
      }, () => {
        el?.classList.remove("is-open");
        el?.classList.add("is-focused");
        el?.style.setProperty("--sx", "-210px");
        el?.style.setProperty("--sy", "-122px");
        el?.style.setProperty("--sz", "310px");
        el?.style.setProperty("--sr", "-6deg");
        el?.style.setProperty("--ss", "1.27");
        setBusy(false);
        setModeSafe("FOCUSED");
        if (done) done();
      });
    },
    [busy, mode, selected, setModeSafe, animate, reducedMotion],
  );

  const beginReturnShelf = useCallback(() => {
    if (busy || mode !== "FOCUSED") return;
    setBusy(true);
    setModeSafe("RETURNING");
    setVideoId(null);
    const el = railRef.current?.querySelector<HTMLElement>(`[data-book-index="${selected}"]`);
    if (el) el.style.setProperty("--coverAngle", "0deg");
    setCoverAngle(0);
    setCoverOpen(false);
    BASE_BOOKS.forEach((_, i) => {
      const node = railRef.current?.querySelector<HTMLElement>(`[data-book-index="${i}"]`);
      node?.classList.remove("hidden-side", "is-focused", "is-open", "is-opening");
    });
    layoutShelf(false);
    setTimeout(() => {
      setBusy(false);
      setModeSafe("SHELF");
    }, reducedMotion ? 20 : 720);
  }, [busy, mode, selected, setModeSafe, layoutShelf, reducedMotion]);

  const returnShelf = useCallback(() => {
    if (busy) return;
    if (mode === "OPEN") {
      closeBook(beginReturnShelf);
      return;
    }
    beginReturnShelf();
  }, [busy, mode, closeBook, beginReturnShelf]);

  const cleanupFlipLayers = useCallback(() => {
    const el = railRef.current?.querySelector<HTMLElement>(`[data-book-index="${selected}"]`);
    if (!el) return;
    el.querySelectorAll(".bsv2a2-spread-layer").forEach((layer) => {
      layer.classList.remove("flip-underlay", "flipping-source", "next", "prev");
    });
  }, [selected]);

  const setupFlipSheet = useCallback(
    (direction: "next" | "prev") => {
      const el = railRef.current?.querySelector<HTMLElement>(`[data-book-index="${selected}"]`);
      const flip = el?.querySelector<HTMLElement>(".bsv2a2-flip-sheet");
      if (!el || !flip) return;
      cleanupFlipLayers();
      flip.classList.add("active");
      flip.dataset.direction = direction;
      const targetIndex = clamp(page + (direction === "next" ? 1 : -1), 0, BASE_BOOKS[selected].chapters.length - 1);
      const layers = Array.from(el.querySelectorAll<HTMLElement>(".bsv2a2-spread-layer"));
      layers[page]?.classList.add("flipping-source", direction);
      layers[targetIndex]?.classList.add("flip-underlay", direction);
      const segments = coarsePointer ? 9 : 14;
      const width = flip.getBoundingClientRect().width || 228;
      const sw = width / segments;
      flip.dataset.width = String(width);
      const segs = Array.from(flip.querySelectorAll<HTMLElement>(".bsv2a2-flip-segment"));
      segs.forEach((seg, i) => {
        seg.style.left = "0px";
        seg.style.width = `${sw + 1.2}px`;
        const front = seg.querySelector<HTMLElement>(".front-content");
        const back = seg.querySelector<HTMLElement>(".back-content");
        if (front) {
          front.style.width = `${width}px`;
          front.style.transform = `translateX(${-i * sw}px)`;
        }
        if (back) {
          back.style.width = `${width}px`;
          back.style.transform = `translateX(${-i * sw}px) scaleX(-1)`;
        }
      });
    },
    [selected, page, coarsePointer, cleanupFlipLayers],
  );

  const setFlip = useCallback(
    (progress: number, direction: "next" | "prev") => {
      setFlipProgress(progress);
      setFlipDirection(direction);
      setFlipActive(true);
      const el = railRef.current?.querySelector<HTMLElement>(`[data-book-index="${selected}"]`);
      const flip = el?.querySelector<HTMLElement>(".bsv2a2-flip-sheet");
      if (!flip) return;
      const width = Number(flip.dataset.width) || flip.getBoundingClientRect().width || 228;
      const segments = coarsePointer ? 9 : 14;
      const sw = width / segments;
      const sign = direction === "next" ? -1 : 1;
      const phis: number[] = [];
      for (let i = 0; i < segments; i++) {
        const u = (i + 0.5) / segments;
        const base = sign * Math.PI * progress;
        const curl = sign * Math.sin(Math.PI * progress) * 0.52 * Math.sin(Math.PI * u);
        phis.push(base + curl);
      }
      let x = 0;
      let z = 0;
      const segs = Array.from(flip.querySelectorAll<HTMLElement>(".bsv2a2-flip-segment"));
      segs.forEach((seg, i) => {
        const phi = phis[i];
        const cx = x + (sw * 0.5) * Math.cos(phi);
        const cz = z - (sw * 0.5) * Math.sin(phi);
        const tx = cx - sw * 0.5;
        const lift = Math.sin(Math.PI * progress) * 7 * Math.sin(Math.PI * ((i + 0.5) / segments));
        seg.style.transform = `translate3d(${tx.toFixed(2)}px,${(-lift).toFixed(2)}px,${cz.toFixed(2)}px) rotateY(${((phi * 180) / Math.PI).toFixed(2)}deg)`;
        x += sw * Math.cos(phi);
        z -= sw * Math.sin(phi);
      });
    },
    [selected, coarsePointer],
  );

  const finishFlip = useCallback(
    (direction: "next" | "prev") => {
      setVideoId(null);
      setPage((prev) => clamp(prev + (direction === "next" ? 1 : -1), 0, BASE_BOOKS[selected].chapters.length - 1));
      const flip = railRef.current?.querySelector<HTMLElement>(".bsv2a2-flip-sheet");
      flip?.classList.remove("active");
      setFlipActive(false);
      setFlipProgress(0);
      cleanupFlipLayers();
      setBusy(false);
      setModeSafe("OPEN");
      const queued = pageQueueRef.current;
      pageQueueRef.current = null;
      if (queued) {
        setTimeout(() => requestPageTurn(queued), reducedMotion ? 1 : 45);
      }
    },
    [selected, cleanupFlipLayers, setModeSafe, reducedMotion],
  );

  function requestPageTurn(direction: "next" | "prev") {
    const atEnd = direction === "next" ? page >= BASE_BOOKS[selected].chapters.length - 1 : page <= 0;
    if (busy) {
      if (mode === "FLIPPING_NEXT" || mode === "FLIPPING_PREV") {
        pageQueueRef.current = direction;
        showToast(direction === "next" ? "다음 장을 이어서 넘길게요." : "이전 장을 이어서 넘길게요.");
      }
      return;
    }
    if (mode !== "OPEN") return;
    if (atEnd) {
      showToast(direction === "next" ? "마지막 페이지예요." : "첫 페이지예요.");
      return;
    }
    setBusy(true);
    setVideoId(null);
    setModeSafe(direction === "next" ? "FLIPPING_NEXT" : "FLIPPING_PREV");
    setupFlipSheet(direction);
    animate(0, 1, reducedMotion ? 1 : 820, (p) => setFlip(p, direction), () => finishFlip(direction));
  }

  const beginInteractiveFlip = useCallback(
    (direction: "next" | "prev") => {
      if (busy || mode !== "OPEN") return false;
      const atEnd = direction === "next" ? page >= BASE_BOOKS[selected].chapters.length - 1 : page <= 0;
      if (atEnd) {
        showToast(direction === "next" ? "마지막 페이지예요." : "첫 페이지예요.");
        return false;
      }
      setBusy(true);
      setVideoId(null);
      setModeSafe(direction === "next" ? "FLIPPING_NEXT" : "FLIPPING_PREV");
      setupFlipSheet(direction);
      return true;
    },
    [busy, mode, page, selected, setModeSafe, setupFlipSheet, showToast],
  );

  const handleCornerDown = (e: React.PointerEvent<HTMLButtonElement>, direction: "next" | "prev") => {
    if (mode !== "OPEN" || busy) return;
    e.preventDefault();
    e.stopPropagation();
    cornerPointerRef.current = { id: e.pointerId, direction, startX: e.clientX, progress: 0, dragging: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCornerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const p = cornerPointerRef.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.startX;
    if (!p.dragging && Math.hypot(dx, 0) >= 9) {
      if (!beginInteractiveFlip(p.direction)) {
        cornerPointerRef.current = null;
        return;
      }
      p.dragging = true;
    }
    if (p.dragging) {
      const signed = p.direction === "next" ? -dx : dx;
      p.progress = clamp(signed / (coarsePointer ? 180 : 260), 0, 1);
      setFlip(p.progress, p.direction);
    }
  };

  const handleCornerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const p = cornerPointerRef.current;
    if (!p || p.id !== e.pointerId) return;
    cornerPointerRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (!p.dragging) {
      requestPageTurn(p.direction);
      return;
    }
    const complete = p.progress >= 0.34;
    animate(p.progress, complete ? 1 : 0, reducedMotion ? 1 : complete ? 430 : 300, (v) => setFlip(v, p.direction), () => {
      if (complete) {
        finishFlip(p.direction);
      } else {
        const flip = railRef.current?.querySelector<HTMLElement>(".bsv2a2-flip-sheet");
        flip?.classList.remove("active");
        cleanupFlipLayers();
        setBusy(false);
        setModeSafe("OPEN");
      }
    });
  };

  const handleCornerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const p = cornerPointerRef.current;
    if (!p || p.id !== e.pointerId) return;
    cornerPointerRef.current = null;
    if (p.dragging) {
      animate(p.progress, 0, reducedMotion ? 1 : 260, (v) => setFlip(v, p.direction), () => {
        const flip = railRef.current?.querySelector<HTMLElement>(".bsv2a2-flip-sheet");
        flip?.classList.remove("active");
        cleanupFlipLayers();
        setBusy(false);
        setModeSafe("OPEN");
      });
    }
  };

  const playInPage = useCallback(
    (wrap: HTMLElement) => {
      if (mode !== "OPEN" || busy) return;
      const id = wrap.dataset.videoId || "";
      if (!id) return;
      setVideoId(id);
    },
    [mode, busy],
  );

  const handleShelfPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "SHELF" || (e.target as HTMLElement).closest(".bsv2a2-book-slot") || (e.target as HTMLElement).closest("button")) return;
    shelfPointerRef.current = { id: e.pointerId, startX: e.clientX, moved: false };
    if (railRef.current) railRef.current.style.transform = "translateX(0)";
  };

  const handleShelfPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = shelfPointerRef.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.startX;
    if (Math.abs(dx) >= 10) p.moved = true;
    if (p.moved) {
      e.preventDefault();
      if (railRef.current) railRef.current.style.transform = `translateX(${clamp(dx * 0.32, -62, 62)}px)`;
    }
  };

  const handleShelfPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = shelfPointerRef.current;
    if (!p || p.id !== e.pointerId) return;
    shelfPointerRef.current = null;
    if (railRef.current) railRef.current.style.transform = "";
    const dx = e.clientX - p.startX;
    if (p.moved) {
      if (Math.abs(dx) > 42) rotateBy(dx < 0 ? 1 : -1);
      return;
    }
    const slot = (e.target as HTMLElement).closest(".bsv2a2-book-slot");
    if (slot) {
      const idx = Number((slot as HTMLElement).dataset.index);
      if (idx === selected) focusBook();
      else rotateTo(idx);
    }
  };

  const handleShelfPointerCancel = () => {
    shelfPointerRef.current = null;
    if (railRef.current) railRef.current.style.transform = "";
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        if (mode === "SHELF" && !busy) rotateBy(1);
        else if (mode === "OPEN" || mode === "FLIPPING_NEXT" || mode === "FLIPPING_PREV") requestPageTurn("next");
      } else if (e.key === "ArrowLeft") {
        if (mode === "SHELF" && !busy) rotateBy(-1);
        else if (mode === "OPEN" || mode === "FLIPPING_NEXT" || mode === "FLIPPING_PREV") requestPageTurn("prev");
      } else if (e.key === "Enter") {
        if (mode === "SHELF" && !busy) focusBook();
        else if (mode === "FOCUSED" && !busy) openBook();
      } else if (e.key === "Escape") {
        if (mode === "OPEN") closeBook();
        else if (mode === "FOCUSED") returnShelf();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, busy, rotateBy, requestPageTurn, focusBook, openBook, closeBook, returnShelf]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (mode !== "SHELF") return;
    e.preventDefault();
    const now = Date.now();
    if (now - lastWheelRef.current < 520) return;
    lastWheelRef.current = now;
    rotateBy(e.deltaY > 0 || e.deltaX > 0 ? 1 : -1);
  };

  const chapter = book.chapters[Math.min(page, book.chapters.length - 1)];
  const chapterId = chapter ? youtubeId(chapter.url) : "";
  const chapterShort = chapter ? isShort(chapter.url) : false;

  return (
    <div
      className="bsv2a2-motion-app"
      ref={appRef}
      data-state={mode}
      style={
        {
          "--theme-bg-1": book.bg1,
          "--theme-bg-2": book.bg2,
          "--theme-accent": book.accent,
          "--theme-soft": book.soft,
        } as React.CSSProperties
      }
    >
      <header className="bsv2a2-topbar">
        <a className="bsv2a2-brand" href="#" aria-label="LoveTree" onClick={(e) => e.preventDefault()}>
          <span className="bsv2a2-brand-mark" aria-hidden="true">
            <i />
            <b />
          </span>
          <span>
            <strong>러브트리</strong>
            <small>LOVE MOMENT LIBRARY</small>
          </span>
        </a>
        <span className="bsv2a2-proof-label">3D PEOPLE BOOKSHELF · MOTION PROOF v2A-2</span>
        <div className="bsv2a2-state-readout">
          <span className="bsv2a2-state-dot" />
          <span id="bsv2a2-state-text">{mode}</span>
        </div>
      </header>

      <main className="bsv2a2-stage" onWheel={handleWheel} aria-label="사람별 LoveTree 3D 책장">
        <div className="bsv2a2-ambient-orb" />
        <button className="bsv2a2-hot-zone bsv2a2-hot-left" type="button" aria-label="이전 책" onClick={() => rotateBy(-1)} />
        <button className="bsv2a2-hot-zone bsv2a2-hot-right" type="button" aria-label="다음 책" onClick={() => rotateBy(1)} />
        <section className="bsv2a2-shelf-world" aria-label="책 선반">
          <div className="bsv2a2-shelf-back" />
          <div className="bsv2a2-shelf-glow" />
          <div className="bsv2a2-shelf-plank" />
          <div
            className="bsv2a2-book-rail"
            ref={railRef}
            onPointerDown={handleShelfPointerDown}
            onPointerMove={handleShelfPointerMove}
            onPointerUp={handleShelfPointerUp}
            onPointerCancel={handleShelfPointerCancel}
          >
            {BASE_BOOKS.map((b, index) => (
              <article
                key={b.id}
                className="bsv2a2-book-slot"
                data-index={index}
                data-book-index={index}
                tabIndex={0}
                role="button"
                aria-label={`${b.name} 책 선택`}
                style={{ "--cover": b.color, "--accent": b.accent, "--coverAngle": `${index === selected ? coverAngle : 0}deg` } as React.CSSProperties}
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest(".bsv2a2-thumb-wrap") || (e.target as HTMLElement).closest(".bsv2a2-page-corner")) return;
                  if (mode === "SHELF") handleShelfPointerDown(e as unknown as React.PointerEvent<HTMLDivElement>);
                  else if (mode === "FOCUSED" && index === selected) {
                    e.preventDefault();
                    cornerPointerRef.current = { id: e.pointerId, direction: "next", startX: e.clientX, progress: 0, dragging: false };
                  }
                }}
                onPointerMove={(e) => {
                  handleShelfPointerMove(e as unknown as React.PointerEvent<HTMLDivElement>);
                  const p = cornerPointerRef.current;
                  if (p && p.id === e.pointerId && !p.dragging) {
                    if (Math.hypot(e.clientX - p.startX, 0) >= 10) p.dragging = true;
                    if (p.dragging && mode === "FOCUSED") openBook();
                  }
                }}
                onPointerUp={(e) => {
                  handleShelfPointerUp(e as unknown as React.PointerEvent<HTMLDivElement>);
                  const p = cornerPointerRef.current;
                  if (p && p.id === e.pointerId) {
                    cornerPointerRef.current = null;
                    if (!p.dragging && mode === "FOCUSED") openBook();
                  }
                }}
                onPointerCancel={() => {
                  handleShelfPointerCancel();
                  if (cornerPointerRef.current) cornerPointerRef.current = null;
                }}
                onClick={() => {
                  if (mode === "SHELF") {
                    if (index === selected) focusBook();
                    else rotateTo(index);
                  } else if (mode === "FOCUSED" && index === selected) {
                    openBook();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  if (mode === "SHELF") {
                    if (index === selected) focusBook();
                    else rotateTo(index);
                  } else if (mode === "FOCUSED" && index === selected) {
                    openBook();
                  }
                }}
              >
                <div className="bsv2a2-ground-shadow" />
                <div className="bsv2a2-book-model">
                  <div className="bsv2a2-book-core">
                    <div className="bsv2a2-back-cover" />
                    <div className="bsv2a2-page-block" />
                    <div className="bsv2a2-page-edge" />
                    <div className="bsv2a2-spine" />
                    <div className="bsv2a2-front-cover-hinge">
                      <div className="bsv2a2-cover-face">
                        <div className="bsv2a2-cover-gloss" style={{ "--glossX": `${glossX}%` } as React.CSSProperties} />
                        <span className="bsv2a2-cover-number">VOLUME {String(index + 1).padStart(2, "0")} · LOVE MOMENTS</span>
                        <span className="bsv2a2-cover-emblem">
                          <span>{b.symbol}</span>
                        </span>
                        <strong className="bsv2a2-cover-title">{b.name}</strong>
                        <small className="bsv2a2-cover-subtitle">{b.english}</small>
                      </div>
                      <div className="bsv2a2-cover-inside">
                        <div className="bsv2a2-inside-label">
                          <b>{b.name}의 LoveTree</b>
                          <small>ONE PERSON · ONE LOVE TREE</small>
                        </div>
                      </div>
                    </div>
                    <div className="bsv2a2-reader">
                      <div className="bsv2a2-reader-position">
                        {String(page + 1).padStart(2, "0")} / {String(b.chapters.length).padStart(2, "0")}
                      </div>
                      <div className="bsv2a2-spread-stack">                        {b.chapters.map((ch, pageIndex) => (
                          <div
                            key={`${b.id}-${pageIndex}`}
                            className={`bsv2a2-spread-layer${pageIndex === page ? " active" : ""}`}
                            data-page={pageIndex}
                          >
                            <section className="bsv2a2-page-half bsv2a2-left-page">
                              <div className="bsv2a2-page-copy">
                                <p className="bsv2a2-page-kicker">
                                  CHAPTER {String(pageIndex + 1).padStart(2, "0")} · LOVE TREE FEELING
                                </p>
                                <h3>{ch.title}</h3>
                                <p>{ch.note}</p>
                                <div className="bsv2a2-page-detail">
                                  <span>
                                    <b>LoveTree 감정</b> · {ch.mood}
                                  </span>
                                  <span>
                                    <b>앞 순간에서 이어진 이유</b> · {pageIndex === 0 ? "첫 마음에서 시작한 챕터" : `${b.chapters[pageIndex - 1].title}에서 이어짐`}
                                  </span>
                                </div>
                              </div>
                              <span className="bsv2a2-page-num">{String(pageIndex * 2 + 1).padStart(2, "0")}</span>
                              <button className="bsv2a2-page-corner bsv2a2-corner-prev" type="button" aria-label="이전 페이지" onPointerDown={(e) => handleCornerDown(e, "prev")} onPointerMove={handleCornerMove} onPointerUp={handleCornerUp} onPointerCancel={handleCornerCancel} />
                            </section>
                            <section className="bsv2a2-page-half bsv2a2-right-page">
                              <div className="bsv2a2-media-page">
                                <div
                                  className="bsv2a2-thumb-wrap"
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`${ch.title} 영상 재생`}
                                  data-video-url={ch.url}
                                  data-video-id={youtubeId(ch.url)}
                                  data-short={isShort(ch.url) ? "1" : "0"}
                                  onClick={(e) => {
                                    if ((e.target as HTMLElement).closest(".bsv2a2-video-close")) return;
                                    e.stopPropagation();
                                    playInPage(e.currentTarget);
                                  }}
                                >
                                  <div className="bsv2a2-thumb-fallback">
                                    <div>
                                      <strong>{b.symbol}</strong>
                                      <small>
                                        {b.name} · CHAPTER {String(pageIndex + 1).padStart(2, "0")}
                                      </small>
                                    </div>
                                  </div>
                                  {youtubeId(ch.url) ? (
                                    <img src={`https://i.ytimg.com/vi/${youtubeId(ch.url)}/hqdefault.jpg`} alt={`${ch.title} 썸네일`} loading="lazy" />
                                  ) : null}
                                  <button className="bsv2a2-play-button" type="button" aria-label="페이지 안에서 영상 재생" />
                                </div>
                                <div className="bsv2a2-media-meta">
                                  <span>
                                    <b>{isShort(ch.url) ? "YOUTUBE SHORTS" : "YOUTUBE VIDEO"}</b>
                                  </span>
                                  <span>기억할 시간 {ch.time}</span>
                                </div>
                              </div>
                              <span className="bsv2a2-page-num">{String(pageIndex * 2 + 2).padStart(2, "0")}</span>
                              <button className="bsv2a2-page-corner bsv2a2-corner-next" type="button" aria-label="다음 페이지" onPointerDown={(e) => handleCornerDown(e, "next")} onPointerMove={handleCornerMove} onPointerUp={handleCornerUp} onPointerCancel={handleCornerCancel} />
                            </section>
                          </div>
                        ))}
                      </div>
                      <div className="bsv2a2-flip-sheet">
                        {Array.from({ length: coarsePointer ? 9 : 14 }).map((_, s) => (
                          <div key={s} className="bsv2a2-flip-segment" data-seg={s}>
                            <div className="bsv2a2-segment-face front">
                              <div className="bsv2a2-segment-content front-content" />
                            </div>
                            <div className="bsv2a2-segment-face back">
                              <div className="bsv2a2-segment-content back-content" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="bsv2a2-shelf-caption">
          <strong>{book.name}의 LoveTree</strong>
          <span>중앙 책을 선택하면 같은 책이 선반에서 앞으로 나옵니다.</span>
        </div>

        <div className={`bsv2a2-reader-controls${mode === "OPEN" || mode === "FLIPPING_NEXT" || mode === "FLIPPING_PREV" ? " is-active" : ""}`}>
          <button className="bsv2a2-prev-page" type="button" aria-label="이전 페이지" disabled={mode === "OPEN" && page <= 0} onClick={() => requestPageTurn("prev")}>
            ← 이전 장
          </button>
          <button className="bsv2a2-close-reader" type="button" onClick={() => closeBook()}>
            책 닫기
          </button>
          <button className="bsv2a2-next-page" type="button" aria-label="다음 페이지" disabled={mode === "OPEN" && page >= BASE_BOOKS[selected].chapters.length - 1} onClick={() => requestPageTurn("next")}>
            다음 장 →
          </button>
        </div>

        <aside className="bsv2a2-info-panel" aria-live="polite">
          <div className="bsv2a2-info-eyebrow">VOLUME {String(selected + 1).padStart(2, "0")} · LOVE MOMENTS</div>
          <h1>{book.name}의 LoveTree</h1>
          <p>{book.description}</p>
          <div className="bsv2a2-info-stats">
            <div className="bsv2a2-info-stat">
              <small>MOMENTS</small>
              <b>{book.chapters.length} moments</b>
            </div>
            <div className="bsv2a2-info-stat">
              <small>CHAPTERS</small>
              <b>{book.chapters.length} chapters</b>
            </div>
            <div className="bsv2a2-info-stat">
              <small>MAIN FEELING</small>
              <b>{book.chapters[0]?.mood ?? "설렘"}</b>
            </div>
          </div>
          <div className="bsv2a2-chapter-list">
            {book.chapters.map((c, i) => (
              <button
                key={`${book.id}-${i}`}
                type="button"
                className={i === page ? "active" : ""}
                onClick={() => {
                  if (mode === "OPEN") {
                    requestPageTurn(i > page ? "next" : "prev");
                  } else {
                    showToast("책을 열면 이 챕터로 이동할 수 있어요.");
                  }
                }}
              >
                <i>{String(i + 1).padStart(2, "0")}</i>
                <span>{c.title}</span>
              </button>
            ))}
          </div>
          <p className="bsv2a2-focus-click-hint">책을 한 번 더 누르면 열려요.</p>
          <div className="bsv2a2-panel-actions">
            <button className="bsv2a2-primary" type="button" disabled={mode !== "FOCUSED"} onClick={openBook}>
              책 열기
            </button>
            <button className="bsv2a2-secondary" type="button" onClick={returnShelf}>
              책장으로 돌아가기
            </button>
          </div>
        </aside>

        <div className="bsv2a2-control-hint">
          <span>
            <i className="bsv2a2-key">← →</i> 책 이동
          </span>
          <span>
            <i className="bsv2a2-key">DRAG</i> 선반 넘기기
          </span>
          <span>
            <i className="bsv2a2-key">WHEEL</i> 책 이동
          </span>
          <span>
            <i className="bsv2a2-key">ENTER</i> 책 선택
          </span>
        </div>
      </main>

      {mode === "OPEN" && videoId && (
        <div className="bsv2a2-video-shell">
          <div className="bsv2a2-video-fallback-player">
            <div>
              <i>▶</i>
              <strong>{chapter?.title}</strong>
              <small>YOUTUBE · PAGE PLAYER</small>
            </div>
          </div>
          <button className="bsv2a2-video-close" type="button" aria-label="영상 닫기" onClick={() => setVideoId(null)}>
            ×
          </button>
          <iframe
            title={chapter?.title ?? "LoveTree 챕터 영상"}
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&enablejsapi=1`}
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className={`bsv2a2-toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}

function shelfOffset(i: number, selected: number, length: number): number {
  let diff = i - selected;
  if (diff > 1) diff -= length;
  if (diff < -1) diff += length;
  return diff;
}
