"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroVideoData } from "./v2-hero-video-data";
import { HERO_VIDEOS } from "./v2-hero-video-data";
import V2HeroVideoCard from "./V2HeroVideoCard";
import V2HeroVideoModal from "./V2HeroVideoModal";

const TIMINGS = {
  seed: 120,
  cardReveal: 480,
  lineGrow: 420,
  bloom: 900,
  initialHold: 3000,
  move: 580,
  hold: 2800,
  gap: 400,
  finalHold: 4000,
};

type PauseReason = "hover" | "focus" | "hidden" | "pageLifecycle" | "playing";
type SpotlightPhase = "in" | "hold" | "return" | "";

interface Step {
  run: () => void;
  wait: number;
}

export default function V2HeroVideoShowcase() {
  const [revealed, setRevealed] = useState<boolean[]>(() => HERO_VIDEOS.map(() => false));
  const [lines, setLines] = useState<boolean[]>([false, false, false]);
  const [seedShown, setSeedShown] = useState(false);
  const [bloom, setBloom] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(-1);
  const [spotlightPhase, setSpotlightPhase] = useState<SpotlightPhase>("");
  const [modalVideo, setModalVideo] = useState<HeroVideoData | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const pauseReasons = useRef<Record<PauseReason, boolean>>({
    hover: false,
    focus: false,
    hidden: false,
    pageLifecycle: false,
    playing: false,
  });
  const timerRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const engineRef = useRef<{ seq: Step[]; i: number; currentWait: number }>({
    seq: [],
    i: 0,
    currentWait: 0,
  });
  const reducedMotionRef = useRef(false);
  const isDesktopRef = useRef(true);

  function isPaused() {
    return Object.values(pauseReasons.current).some(Boolean);
  }

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function schedule(ms: number) {
    clearTimer();
    engineRef.current.currentWait = ms;
    timerRef.current = window.setTimeout(() => tick(), ms);
  }

  function pause(reason: PauseReason) {
    pauseReasons.current[reason] = true;
    clearTimer();
  }

  function resume(reason: PauseReason) {
    pauseReasons.current[reason] = false;
    if (isPaused()) return;
    schedule(engineRef.current.currentWait);
  }

  function revealCard(index: number) {
    setRevealed((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  }

  function growLine(index: number) {
    setLines((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  }

  function spotlightIn(index: number) {
    const card = cardRefs.current[index];
    const canvas = card?.closest(".v2-tree-canvas");
    if (card && canvas && isDesktopRef.current) {
      const canvasRect = canvas.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const dx = canvasRect.left + canvasRect.width / 2 - (cardRect.left + cardRect.width / 2);
      const dy = canvasRect.top + canvasRect.height / 2 - (cardRect.top + cardRect.height / 2);
      card.style.setProperty("--spotlight-dx", `${dx}px`);
      card.style.setProperty("--spotlight-dy", `${dy}px`);
    }
    setSpotlightIndex(index);
    setSpotlightPhase("in");
  }

  function spotlightReturn() {
    setSpotlightPhase("return");
  }

  function spotlightClear() {
    setSpotlightIndex(-1);
    setSpotlightPhase("");
  }

  function tick() {
    timerRef.current = null;
    if (isPaused() || reducedMotionRef.current) return;
    const { seq, i } = engineRef.current;
    if (i >= seq.length) {
      buildSequence();
      engineRef.current.i = 0;
      tick();
      return;
    }
    const step = seq[i];
    step.run();
    engineRef.current.i = i + 1;
    schedule(step.wait);
  }

  function buildSequence() {
    const seq: Step[] = [];
    const reset = () => {
      setSeedShown(false);
      setRevealed(HERO_VIDEOS.map(() => false));
      setLines([false, false, false]);
      setBloom(false);
      spotlightClear();
    };
    seq.push({ run: reset, wait: 80 });
    seq.push({ run: () => setSeedShown(true), wait: TIMINGS.seed });
    seq.push({ run: () => revealCard(0), wait: TIMINGS.cardReveal });
    seq.push({ run: () => growLine(0), wait: TIMINGS.lineGrow });
    seq.push({ run: () => revealCard(1), wait: TIMINGS.cardReveal });
    seq.push({ run: () => growLine(1), wait: TIMINGS.lineGrow });
    seq.push({ run: () => revealCard(2), wait: TIMINGS.cardReveal });
    seq.push({ run: () => growLine(2), wait: TIMINGS.lineGrow });
    seq.push({ run: () => revealCard(3), wait: TIMINGS.cardReveal });
    seq.push({ run: () => setBloom(true), wait: TIMINGS.bloom });
    seq.push({ run: () => {}, wait: TIMINGS.initialHold });
    if (isDesktopRef.current) {
      for (const index of [0, 1, 2, 3]) {
        seq.push({ run: () => spotlightIn(index), wait: TIMINGS.move });
        seq.push({ run: () => setSpotlightPhase("hold"), wait: TIMINGS.hold });
        seq.push({ run: () => spotlightReturn(), wait: TIMINGS.move });
        seq.push({ run: () => spotlightClear(), wait: TIMINGS.gap });
      }
    } else {
      seq.push({ run: () => {}, wait: TIMINGS.finalHold });
    }
    seq.push({ run: () => {}, wait: TIMINGS.finalHold });
    engineRef.current.seq = seq;
    engineRef.current.i = 0;
  }

  // reduced-motion + desktop media queries
  useEffect(() => {
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopQuery = window.matchMedia("(min-width: 680px)");
    const updateReduce = () => setReducedMotion(reduceQuery.matches);
    const updateDesktop = () => {
      isDesktopRef.current = desktopQuery.matches;
    };
    updateReduce();
    updateDesktop();
    reduceQuery.addEventListener?.("change", updateReduce);
    desktopQuery.addEventListener?.("change", updateDesktop);
    return () => {
      reduceQuery.removeEventListener?.("change", updateReduce);
      desktopQuery.removeEventListener?.("change", updateDesktop);
    };
  }, []);

  // reduced-motion renders a static completed showcase; otherwise start the cycle
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
    if (reducedMotion) {
      clearTimer();
      const timer = window.setTimeout(() => {
        setSeedShown(true);
        setRevealed(HERO_VIDEOS.map(() => true));
        setLines([true, true, true]);
        setBloom(true);
        spotlightClear();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    buildSequence();
    tick();
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // hidden / page-lifecycle pause
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) pause("hidden");
      else resume("hidden");
    };
    const onPageHide = () => pause("pageLifecycle");
    const onPageShow = () => resume("pageLifecycle");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openModal(video: HeroVideoData, trigger: HTMLElement) {
    triggerRef.current = trigger;
    pause("playing");
    setModalVideo(video);
  }

  function closeModal() {
    setModalVideo(null);
    resume("playing");
    const trigger = triggerRef.current;
    window.setTimeout(() => trigger?.focus(), 0);
  }

  return (
    <div className="v2-video-showcase">
      <svg
        className="v2-showcase-lines"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className={`v2-showcase-line ${lines[0] ? "is-grown" : ""}`} d="M50 22 C 38 30, 24 40, 15 50" />
        <path className={`v2-showcase-line ${lines[1] ? "is-grown" : ""}`} d="M50 22 C 62 30, 76 40, 85 50" />
        <path className={`v2-showcase-line ${lines[2] ? "is-grown" : ""}`} d="M50 22 C 50 36, 50 46, 50 54" />
      </svg>

      <div className={`v2-showcase-seed ${seedShown ? "is-revealed" : ""}`} aria-hidden="true">✦</div>

      {HERO_VIDEOS.map((video, index) => (
        <V2HeroVideoCard
          key={video.key}
          video={video}
          index={index}
          revealed={revealed[index]}
          spotlightPhase={spotlightIndex === index ? spotlightPhase : ""}
          onPlay={openModal}
          onHoverChange={(hovered) => (hovered ? pause("hover") : resume("hover"))}
          onFocusChange={(focused) => (focused ? pause("focus") : resume("focus"))}
          ref={(el) => {
            cardRefs.current[index] = el;
          }}
        />
      ))}

      <div className={`v2-showcase-bloom ${bloom ? "is-bloomed" : ""}`} aria-hidden="true">
        <span className="v2-showcase-bloom-leaf v2-bloom-a" />
        <span className="v2-showcase-bloom-leaf v2-bloom-b" />
        <span className="v2-showcase-bloom-leaf v2-bloom-c" />
        <span className="v2-showcase-bloom-glow" />
      </div>

      <V2HeroVideoModal video={modalVideo} onClose={closeModal} />
    </div>
  );
}
