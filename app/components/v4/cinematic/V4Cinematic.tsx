"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import Link from "next/link";
import "../../../styles/v4/cinematic/cinematic.css";
import { SCENES, MOTION_MASK_EFFECTS, assetUrl } from "./cinematic-data";

const AUTOPLAY_MS = 70000;
const PARTICLE_DUST = 38;
const PARTICLE_LEAVES = 24;

/** Deterministic pseudo-random in [0,1) used for stable shard placement. */
function shardNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface Particle {
  x: number;
  y: number;
  r: number;
  v: number;
  a: number;
  seed: number;
}
interface Leaf {
  x: number;
  y: number;
  r: number;
  v: number;
  spin: number;
  side: number;
}
interface AutoplaySession {
  sessionStartScrollY: number;
  currentScrollY: number;
  targetScrollY: number;
  totalDurationMs: number;
  accumulatedElapsedMs: number;
  lastStartedAt: number;
  running: boolean;
  paused: boolean;
}

function useReducedMotion(): [boolean, React.MutableRefObject<boolean>] {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return [reduced, reducedRef];
}

export default function V4Cinematic() {
  const [reduced, reducedRef] = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const menuOverlayRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const playBtnRef = useRef<HTMLButtonElement>(null);
  const menuOpenRef = useRef(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentIdxRef = useRef(0);

  // --- state shared with the rAF loop, held in refs to avoid re-renders ---
  const stateRef = useRef({ idx: 0, p: 0, overall: 0 });
  const sceneElsRef = useRef<HTMLElement[]>([]);
  const railBtnsRef = useRef<HTMLButtonElement[]>([]);
  const playingRef = useRef(false);
  const autoIdRef = useRef(0);
  const sessionRef = useRef<AutoplaySession | null>(null);
  const fxIdRef = useRef(0);
  const visibleRef = useRef(true);
  const rootVisibleRef = useRef(true);
  const particlesRef = useRef<Particle[]>([]);
  const leavesRef = useRef<Leaf[]>([]);

  // ------------------------------------------------------------------ utils
  const clamp = useCallback((v: number, a = 0, b = 1) =>
    Math.min(b, Math.max(a, v)), []);
  const smooth = useCallback((t: number) => {
    const v = clamp(t);
    return v * v * (3 - 2 * v);
  }, [clamp]);
  const lerp = useCallback((a: number, b: number, t: number) => a + (b - a) * t, []);

  const go = useCallback((i: number) => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    // Land at the center of the target scene so the scroll-driven crossfade
    // definitively reaches it (scene boundaries are exact multiples of 118vh).
    const n = SCENES.length - 1;
    const idx = clamp(i, 0, n);
    let ratio: number;
    if (idx <= 0) ratio = 0;
    else if (idx >= n) ratio = 1;
    else ratio = (idx + 0.5) / n;
    window.scrollTo(0, ratio * maxScroll);
    // Programmatic scrollTo does not always fire a scroll event promptly in
    // throttled/headless renderers; dispatch so the update pass runs now.
    window.dispatchEvent(new Event("scroll"));
  }, [clamp]);

  const stopAuto = useCallback(() => {
    cancelAnimationFrame(autoIdRef.current);
    autoIdRef.current = 0;
    sessionRef.current = null;
    playingRef.current = false;
    setPlaying(false);
  }, []);

  const startAuto = useCallback(() => {
    // create one explicit autoplay session
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const sessionStartScrollY = Math.min(window.scrollY, maxScroll);
    const targetScrollY = maxScroll;
    const remaining = Math.max(1, targetScrollY - sessionStartScrollY);
    const totalDurationMs = AUTOPLAY_MS * (remaining / maxScroll);
    sessionRef.current = {
      sessionStartScrollY,
      currentScrollY: sessionStartScrollY,
      targetScrollY,
      totalDurationMs,
      accumulatedElapsedMs: 0,
      lastStartedAt: performance.now(),
      running: true,
      paused: false,
    };
    playingRef.current = true;
    setPlaying(true);

    cancelAnimationFrame(autoIdRef.current);
    const step = (now: number) => {
      const session = sessionRef.current;
      if (!session) return;
      // pause (not stop) when hidden or root inactive
      if (!playingRef.current || !visibleRef.current || !rootVisibleRef.current) {
        if (session.running) {
          session.accumulatedElapsedMs += now - session.lastStartedAt;
          session.lastStartedAt = now;
          session.running = false;
          session.paused = true;
        }
        cancelAnimationFrame(autoIdRef.current);
        autoIdRef.current = 0;
        return;
      }
      session.accumulatedElapsedMs += now - session.lastStartedAt;
      session.lastStartedAt = now;
      session.running = true;
      session.paused = false;
      const progress = clamp(session.accumulatedElapsedMs / session.totalDurationMs);
      session.currentScrollY =
        session.sessionStartScrollY + (session.targetScrollY - session.sessionStartScrollY) * progress;
      window.scrollTo(0, session.currentScrollY);
      if (progress < 1) {
        autoIdRef.current = requestAnimationFrame(step);
      } else {
        // natural completion
        session.running = false;
        sessionRef.current = null;
        autoIdRef.current = 0;
        playingRef.current = false;
        setPlaying(false);
      }
    };
    autoIdRef.current = requestAnimationFrame(step);
  }, [clamp]);

  const pauseAuto = useCallback(() => {
    const session = sessionRef.current;
    if (session && session.running) {
      session.accumulatedElapsedMs += performance.now() - session.lastStartedAt;
      session.lastStartedAt = performance.now();
      session.running = false;
      session.paused = true;
    }
    cancelAnimationFrame(autoIdRef.current);
    autoIdRef.current = 0;
    // playing + aria-pressed stay true while paused
  }, []);

  const resumeAuto = useCallback(() => {
    const session = sessionRef.current;
    if (!session || !playingRef.current) return;
    // remaining = totalDuration - accumulatedElapsed
    session.lastStartedAt = performance.now();
    session.running = true;
    session.paused = false;
    cancelAnimationFrame(autoIdRef.current);
    const step = (now: number) => {
      const s = sessionRef.current;
      if (!s) return;
      if (!playingRef.current || !visibleRef.current || !rootVisibleRef.current) {
        if (s.running) {
          s.accumulatedElapsedMs += now - s.lastStartedAt;
          s.lastStartedAt = now;
          s.running = false;
          s.paused = true;
        }
        cancelAnimationFrame(autoIdRef.current);
        autoIdRef.current = 0;
        return;
      }
      s.accumulatedElapsedMs += now - s.lastStartedAt;
      s.lastStartedAt = now;
      s.running = true;
      s.paused = false;
      const progress = clamp(s.accumulatedElapsedMs / s.totalDurationMs);
      // resume from the retained current scroll position, not a jump to maxScroll
      s.currentScrollY =
        s.sessionStartScrollY + (s.targetScrollY - s.sessionStartScrollY) * progress;
      window.scrollTo(0, s.currentScrollY);
      if (progress < 1) {
        autoIdRef.current = requestAnimationFrame(step);
      } else {
        s.running = false;
        sessionRef.current = null;
        autoIdRef.current = 0;
        playingRef.current = false;
        setPlaying(false);
      }
    };
    autoIdRef.current = requestAnimationFrame(step);
  }, [clamp]);

  const togglePlay = useCallback(() => {
    if (playingRef.current) {
      stopAuto();
      return;
    }
    startAuto();
  }, [startAuto, stopAuto]);

  // ------------------------------------------------------------------ setup
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // register scene element refs
    sceneElsRef.current = Array.from(root.querySelectorAll<HTMLElement>(".cin-scene"));
    railBtnsRef.current = Array.from(railRef.current?.querySelectorAll<HTMLButtonElement>("button") || []);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    const resize = () => {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const setImageTransform = (
      el: HTMLElement | null,
      scale: number,
      x = 0,
      y = 0,
      blur = 0,
      bright = 1,
    ) => {
      if (!el) return;
      el.style.transform = `translate3d(${x}%,${y}%,0) scale(${scale})`;
      el.style.filter = `blur(${blur}px) brightness(${bright})`;
    };

    const updateInternal = (el: HTMLElement, p: number) => {
      const effect = el.dataset.effect || "";
      const bg = el.querySelector<HTMLElement>(".cin-bg");
      const mask = el.querySelector<HTMLElement>(".cin-motion-mask");
      const copy = el.querySelector<HTMLElement>(".cin-scene-copy");
      const intro = smooth(p / 0.22);
      const outro = smooth((p - 0.72) / 0.26);
      if (copy) {
        const centered = copy.classList.contains("is-center");
        copy.style.opacity = String(clamp(intro * (1 - 0.72 * outro)));
        copy.style.transform = centered
          ? `translateX(-50%) translateY(${lerp(26, -18, intro)}px)`
          : `translateY(calc(-44% + ${lerp(35, -18, intro)}px))`;
        copy.style.filter = `blur(${lerp(9, 0, intro)}px)`;
      }
      if (mask) {
        mask.style.transform = `translate3d(${Math.sin(p * 8) * 0.35}%,${Math.cos(p * 7) * 0.28}%,0) scale(${1.03 + Math.sin(p * 5) * 0.004})`;
      }
      switch (effect) {
        case "polish":
          setImageTransform(bg, lerp(1.13, 1.03, p), lerp(-1.2, 0, p), 0, lerp(12, 0, smooth(p / 0.32)), lerp(0.88, 1.06, p));
          break;
        case "seed":
          setImageTransform(bg, lerp(1.05, 1.16, p), 0, lerp(1, -1, p), 0, 1);
          break;
        case "pearzoom":
          setImageTransform(bg, lerp(1.01, 2.55, smooth(p)), 0, lerp(0, 8, p), lerp(0, 3, smooth((p - 0.72) / 0.28)), 1.03);
          break;
        case "graft":
          setImageTransform(bg, lerp(1.35, 1.03, smooth(p)), lerp(5, 0, p), 0, lerp(5, 0, smooth(p / 0.25)), 1.02);
          if (mask) {
            mask.style.opacity = String(0.35 + 0.25 * Math.sin(p * 12));
          }
          break;
        case "growth":
          setImageTransform(bg, lerp(1.12, 1.01, p), 0, lerp(2, -1, p), 0, lerp(0.93, 1.08, p));
          break;
        case "pick":
          setImageTransform(bg, lerp(1.04, 1.22, p), lerp(1, -2, p), lerp(0, -1, p), 0, 1.04);
          break;
        case "behold":
          setImageTransform(bg, lerp(1.04, 1.14, p), lerp(0, -1.8, p), 0, 0, 1);
          if (mask) {
            mask.style.opacity = String(0.22 + 0.18 * Math.sin(p * 9));
          }
          break;
        case "cut": {
          setImageTransform(bg, lerp(1.08, 1.2, p), 0, 0, 0, 1.03);
          const gl = el.querySelector<HTMLElement>(".cin-blade-glint");
          if (gl) {
            gl.style.opacity = String(Math.sin(Math.PI * clamp((p - 0.12) / 0.45)));
            gl.style.transform = `rotate(${-17 + p * 5}deg) translateX(${p * 7}%)`;
          }
          break;
        }
        case "share":
          setImageTransform(bg, lerp(1.05, 1.13, p), 0, 0, lerp(3, 0, smooth(p / 0.2)), lerp(1.12, 1, p));
          break;
        case "sky": {
          const sky = el.querySelector<HTMLElement>(".cin-blue-sky");
          if (sky) {
            sky.style.transform = `scale(${1 + p * 0.025}) translateY(${-p * 1.5}%)`;
          }
          break;
        }
        case "blueprint":
          setImageTransform(bg, lerp(1.03, 1.55, p), lerp(0, 10, p), lerp(0, 4, p), 0, 1.02);
          break;
        case "workshop":
          setImageTransform(bg, lerp(1.03, 1.33, p), lerp(0, -4, p), lerp(0, 3, p), 0, lerp(0.92, 1.1, p));
          {
            const scatter = smooth((p - 0.68) / 0.28);
            const shards = el.querySelectorAll<HTMLElement>(".cin-shard");
            shards.forEach((sh) => {
              const dx = parseFloat(sh.style.getPropertyValue("--sdx") || "0");
              const dy = parseFloat(sh.style.getPropertyValue("--sdy") || "0");
              const rot = parseFloat(sh.style.getPropertyValue("--srot") || "0");
              sh.style.opacity = String(scatter);
              sh.style.transform = `translate(${dx * scatter}px, ${dy * scatter}px) rotate(${rot * scatter}deg) scale(${1 + scatter * 0.18})`;
            });
            if (bg) bg.style.opacity = String(1 - scatter * 0.85);
          }
          break;
        case "prune":
          setImageTransform(bg, lerp(1.03, 1.16, p), lerp(0, -2, p), 0, 0, 1.05);
          if (mask) {
            mask.style.opacity = String(0.18 + 0.24 * Math.sin(p * 14));
          }
          break;
        case "questions": {
          setImageTransform(bg, lerp(1.02, 1.12, p), lerp(0, -1.5, p), lerp(1, -1, p), lerp(3, 0, smooth(p / 0.2)), 1.04);
          const items = el.querySelectorAll<HTMLElement>(".cin-question-item");
          items.forEach((item, k) => {
            const a = smooth((p - (0.28 + k * 0.13)) / 0.18);
            item.style.opacity = String(a);
            item.style.transform = `translateY(${lerp(18, 0, a)}px)`;
          });
          const paths = el.querySelectorAll<SVGPathElement>(".cin-question-lines path");
          const draw = smooth((p - 0.22) / 0.5);
          paths.forEach((path) => {
            path.style.strokeDashoffset = String(460 * (1 - draw));
          });
          break;
        }
        case "constellation": {
          setImageTransform(bg, lerp(1.08, 1.015, p), lerp(1, 0, p), 0, lerp(5, 0, smooth(p / 0.2)), 1);
          const curtain = el.querySelector<HTMLElement>(".cin-cloud-curtain");
          if (curtain) {
            curtain.style.opacity = String(1 - smooth(p / 0.3));
            curtain.style.transform = `scale(${1 + p * 0.22}) translateY(${-p * 6}%)`;
          }
          const paths = el.querySelectorAll<SVGPathElement>(".cin-constellation-svg path");
          const dots = el.querySelectorAll<SVGCircleElement>(".cin-constellation-svg circle");
          const draw = smooth((p - 0.12) / 0.62);
          paths.forEach((path) => {
            path.style.strokeDashoffset = String(1200 * (1 - draw));
          });
          dots.forEach((dot, k) => {
            dot.style.opacity = String(smooth((p - 0.2 - k * 0.022) / 0.22));
          });
          break;
        }
        case "final":
          setImageTransform(bg, lerp(1.13, 1.01, p), 0, lerp(1, -1, p), 0, lerp(0.88, 1.09, p));
          break;
        default:
          break;
      }
    };

    const update = () => {
      const ms = maxScroll();
      const overall = clamp(window.scrollY / ms);
      const sceneFloat = overall * (SCENES.length - 1);
      const idx = Math.min(SCENES.length - 1, Math.floor(sceneFloat));
      const p = idx === SCENES.length - 1 ? 1 : sceneFloat - idx;
      stateRef.current = { idx, p, overall };
      if (idx !== currentIdxRef.current) {
        currentIdxRef.current = idx;
        setCurrentIdx(idx);
      }
      const trans = smooth((p - 0.86) / 0.14);
      sceneElsRef.current.forEach((el, i) => {
        let opacity = 0;
        let ip = 0;
        let preload = false;
        if (idx === SCENES.length - 1 && i === idx) {
          opacity = 1;
          ip = 1;
        } else if (i === idx) {
          opacity = 1 - trans;
          ip = p;
        } else if (i === idx + 1) {
          opacity = trans;
          ip = 0.015;
          preload = true;
        }
        el.style.opacity = String(opacity);
        el.style.zIndex = opacity > 0 ? String(10 + i) : "0";
        el.classList.toggle("is-rendering", opacity > 0.001);
        el.classList.toggle("is-visible", i === idx && opacity > 0.45);
        el.classList.toggle("is-preload", preload);
        if (opacity > 0 && !reducedRef.current) updateInternal(el, ip);
      });
      railBtnsRef.current.forEach((b, i) => b.classList.toggle("is-active", i === idx));
      if (counterRef.current) counterRef.current.textContent = String(idx + 1).padStart(2, "0");
      if (progressRef.current) progressRef.current.style.width = `${overall * 100}%`;
    };

    // particles only active when not reduced-motion and relevant scenes are visible
    const initParticles = () => {
      particlesRef.current = Array.from({ length: PARTICLE_DUST }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: 0.5 + Math.random() * 2,
        v: 0.00015 + Math.random() * 0.0005,
        a: 0.12 + Math.random() * 0.5,
        seed: Math.random() * 6.28,
      }));
      leavesRef.current = Array.from({ length: PARTICLE_LEAVES }, () => ({
        x: Math.random(),
        y: Math.random() * -0.8,
        r: 3 + Math.random() * 7,
        v: 0.002 + Math.random() * 0.004,
        spin: Math.random() * 6.28,
        side: Math.random() - 0.5,
      }));
    };
    initParticles();

    let last = 0;
    let fxActive = false;

    // test instrumentation: deterministic counters for the fx loop
    (window as unknown as Record<string, unknown>).__cinFxTicks = 0;
    (window as unknown as Record<string, unknown>).__cinFxActive = false;

    const clearCanvasOnce = () => {
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const drawFx = (now: number) => {
      if (!fxActive) return;
      if (document.hidden || !rootVisibleRef.current || reducedRef.current) {
        stopFxLoop();
        return;
      }
      (window as unknown as Record<string, number>).__cinFxTicks += 1;
      fxIdRef.current = requestAnimationFrame(drawFx);
      if (!ctx || !canvas) return;
      const { idx } = stateRef.current;
      // particles only run for decorative scenes (1..16 non-sky/final to reduce load)
      const inDecor = idx >= 0 && idx !== 9 && idx !== 15;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!inDecor) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      ctx.save();
      // gold dust
      for (const p of particlesRef.current) {
        p.x += p.v * dt;
        p.y += p.v * 0.4 * dt;
        if (p.y > 1) { p.y = -0.05; p.x = Math.random(); }
        ctx.beginPath();
        ctx.arc(p.x * window.innerWidth, p.y * window.innerHeight, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,208,121,${p.a})`;
        ctx.fill();
      }
      // falling leaves
      for (const l of leavesRef.current) {
        l.y += l.v * dt;
        l.x += l.side * l.v * 0.6 * dt;
        l.spin += 0.02;
        if (l.y > 1.05) { l.y = -0.1; l.x = Math.random(); }
        ctx.save();
        ctx.translate(l.x * window.innerWidth, l.y * window.innerHeight);
        ctx.rotate(l.spin);
        ctx.fillStyle = "rgba(200,160,96,0.5)";
        ctx.beginPath();
        ctx.ellipse(0, 0, l.r, l.r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    };

    const startFxLoop = () => {
      if (fxActive) return; // exactly one loop
      if (document.hidden || !rootVisibleRef.current || reducedRef.current) return;
      fxActive = true;
      (window as unknown as Record<string, boolean>).__cinFxActive = true;
      fxIdRef.current = requestAnimationFrame(drawFx);
    };

    const stopFxLoop = () => {
      fxActive = false;
      (window as unknown as Record<string, boolean>).__cinFxActive = false;
      cancelAnimationFrame(fxIdRef.current);
      clearCanvasOnce();
    };

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => { ticking = false; update(); });
      }
    };

    const onWheel = () => stopAuto();
    const onTouch = () => stopAuto();
    const onVisibility = () => {
      visibleRef.current = !document.hidden;
      if (document.hidden) {
        stopFxLoop();
        pauseAuto();
      } else {
        update();
        startFxLoop();
        resumeAuto();
      }
    };

    resize();
    update();
    startFxLoop();

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        rootVisibleRef.current = visible;
        if (visible) {
          update();
          startFxLoop();
        } else {
          stopFxLoop();
        }
      },
      { threshold: 0 },
    );
    io.observe(root);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      fxActive = false;
      (window as unknown as Record<string, boolean>).__cinFxActive = false;
      cancelAnimationFrame(autoIdRef.current);
      cancelAnimationFrame(fxIdRef.current);
      clearCanvasOnce();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouch);
      document.removeEventListener("visibilitychange", onVisibility);
      playingRef.current = false;
      visibleRef.current = true;
      rootVisibleRef.current = true;
    };
  }, [clamp, lerp, smooth, stopAuto, pauseAuto, resumeAuto]);

  // reduced-motion ref is managed inside useReducedMotion
  useEffect(() => {
    rootRef.current?.setAttribute("data-cin-reduced", reduced ? "true" : "false");
  }, [reduced]);
  // --- menu focus trap + restore -------------------------------------------
  useEffect(() => {
    if (!menuOpen) return;
    const overlay = menuOverlayRef.current;
    if (!overlay) return;
    const first = overlay.querySelector<HTMLElement>("button, a, [href], [tabindex]:not([tabindex='-1'])");
    first?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = overlay.querySelectorAll<HTMLElement>(
        "button, a, [href], [tabindex]:not([tabindex='-1'])",
      );
      if (!nodes.length) return;
      const f = nodes[0];
      const l = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === f) {
        e.preventDefault();
        l.focus();
      } else if (!e.shiftKey && document.activeElement === l) {
        e.preventDefault();
        f.focus();
      }
    };
    overlay.addEventListener("keydown", onKeyDown);
    return () => {
      overlay.removeEventListener("keydown", onKeyDown);
      menuBtnRef.current?.focus();
    };
  }, [menuOpen]);

  const openMenu = useCallback(() => {
    menuOpenRef.current = true;
    setMenuOpen(true);
  }, []);
  const closeMenu = useCallback(() => {
    menuOpenRef.current = false;
    setMenuOpen(false);
  }, []);

  const handleMenuBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeMenu();
  }, [closeMenu]);

  const handleRailGo = useCallback((i: number) => {
    go(i);
  }, [go]);

  const handleTileGo = useCallback((i: number) => {
    go(i);
    closeMenu();
  }, [go, closeMenu]);

  const handlePlayClick = useCallback(() => {
    togglePlay();
  }, [togglePlay]);

  // --- keyboard -----------------------------------------------------------
  useEffect(() => {
    const isEditableTarget = (el: Element | null) => {
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === "button" || tag === "a" || tag === "input" || tag === "textarea" || tag === "select") {
        return true;
      }
      return (el as HTMLElement).isContentEditable === true;
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      // Menu is open: only Escape may act globally; don't hijack menu controls.
      if (menuOpenRef.current) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeMenu();
        }
        return;
      }
      // Space / arrows must not hijack focused interactive controls.
      if (
        (e.key === " " || e.key === "ArrowDown" || e.key === "ArrowRight" ||
          e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageDown" || e.key === "PageUp") &&
        isEditableTarget(target)
      ) {
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        go(Math.min(SCENES.length - 1, stateRef.current.idx + 1));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(Math.max(0, stateRef.current.idx - 1));
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, togglePlay, closeMenu]);

  return (
    <div
      className="cin-page"
      data-cinematic-root
      ref={rootRef}
    >
      {/* invisible scroll track creates the 16-scene scroll height */}
      <div className="cin-scroll-track" aria-hidden="true" />

      <div className="cin-experience">
        {/* header chrome */}
        <header className="cin-chrome" aria-label="시네마틱 헤더">
          <button
            type="button"
            className="cin-brand"
            onClick={() => go(0)}
            aria-label="처음 장면으로"
          >
            <span className="cin-brand-mark" aria-hidden="true" />
            <span>LoveTree</span>
          </button>
          <div className="cin-chrome-right">
            <button
              type="button"
              className="cin-sound"
              aria-label="배경 음향 (동작 없음)"
              disabled
            >
              SOUND OFF
            </button>
            <button
              type="button"
              className="cin-menu-btn"
              ref={menuBtnRef}
              onClick={openMenu}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls="cin-menu-overlay"
            >
              MENU
            </button>
          </div>
        </header>

      <nav className="cin-rail" aria-label="장면 이동">
        {SCENES.map((s, i) => (
          <button
            type="button"
            key={s.n}
            data-go={i}
            onClick={() => handleRailGo(i)}
            aria-label={`${i + 1}번 장면`}
            aria-current={i === currentIdx ? "true" : undefined}
          >
            {s.n}
          </button>
        ))}
      </nav>

      <div className="cin-progress" aria-hidden="true">
        <span className="cin-progress-fill" ref={progressRef} />
      </div>

      <div className="cin-counter" aria-hidden="true">
        <span ref={counterRef}>01</span> / {String(SCENES.length).padStart(2, "0")}
      </div>

      <main className="cin-scene-stack" id="cin-scene-stack" aria-label="LoveTree 시네마틱 여정">
        {SCENES.map((scene, i) => (
          <CinematicScene key={scene.n} index={i} active={Math.abs(i - currentIdx) <= 1} />
        ))}
      </main>

      <button
        type="button"
        className="cin-play"
        ref={playBtnRef}
        onClick={handlePlayClick}
        aria-label="자동 재생"
        aria-pressed={playing}
      >
        {playing ? "Ⅱ" : "▶"}
      </button>

      {menuOpen && (
        <div
          className="cin-menu-overlay"
          id="cin-menu-overlay"
          ref={menuOverlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="LoveTree Chapters"
          onMouseDown={handleMenuBackdrop}
        >
          <div className="cin-menu-panel">
            <div className="cin-menu-head">
              <div>
                <small>SOURCE-FAITHFUL CINEMATIC</small>
                <h2 className="cin-menu-title">LoveTree Chapters</h2>
                <p>
                  사랑의 기억이 자라는 여정. 첫 발견부터 완성된 나무까지 16개의
                  장면을 차례로 돌아봅니다.
                </p>
              </div>
              <button
                type="button"
                className="cin-menu-close"
                ref={menuCloseRef}
                onClick={closeMenu}
                aria-label="메뉴 닫기"
              >
                ×
              </button>
            </div>
            <div className="cin-menu-tiles">
              {SCENES.map((scene, i) => {
                const url = assetUrl(scene.asset);
                return (
                  <button
                    type="button"
                    className="cin-menu-tile"
                    key={scene.n}
                    onClick={() => handleTileGo(i)}
                  >
                    {url ? (
                      <img
                        className="cin-menu-tile-img"
                        src={url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    <span className="cin-menu-tile-num">{scene.n}</span>
                    <span className="cin-menu-tile-title">{scene.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* canvas particles */}
      <canvas className="cin-fx-canvas" ref={canvasRef} aria-hidden="true" />

      {/* deferred preload of next scene images */}
      <PreloadScenes />
      </div>
    </div>
  );
}

/** Decorative + semantic-free scene art, drawn from external assets. */
function CinematicScene({ index, active }: { index: number; active: boolean }) {
  const scene = SCENES[index];
  const url = active ? assetUrl(scene.asset) : null;
  const needsMask = MOTION_MASK_EFFECTS.has(scene.effect);
  const eager = index === 0;
  const isLight = scene.tone === "light";

  let extras: React.ReactNode = null;
  switch (scene.effect) {
    case "polish":
    case "pearzoom":
    case "pick":
    case "behold":
      extras = <div className="cin-pear-glow" aria-hidden="true" />;
      break;
    case "seed":
      extras = <div className="cin-sprout-aura" aria-hidden="true" />;
      break;
    case "cut":
      extras = <div className="cin-blade-glint" aria-hidden="true" />;
      break;
    case "blueprint":
      extras = (
        <svg className="cin-blueprint-lines" viewBox="0 0 1000 600" aria-hidden="true">
          <path d="M50 520H950M140 480C270 250 370 170 500 100C635 185 745 290 860 480M200 480C275 390 340 330 500 270C660 330 725 390 800 480M500 100V500" />
          <circle cx="500" cy="270" r="165" />
          <circle cx="500" cy="270" r="230" />
        </svg>
      );
      break;
    case "workshop": {
      extras = (
        <>
          <div className="cin-worker-lights" aria-hidden="true">
            {Array.from({ length: 24 }, (_, k) => (
              <i key={k} style={{ left: `${12 + ((k * 37) % 78)}%`, top: `${18 + ((k * 53) % 67)}%`, animationDelay: `${(k % 7) * 0.21}s` }} />
            ))}
          </div>
          {url ? (
            <div className="cin-shard-field" aria-hidden="true">
              {Array.from({ length: 12 }, (_, k) => {
                const x0 = (k % 4) * 25;
                const y0 = Math.floor(k / 4) * 33.34;
                const x1 = x0 + 25;
                const y1 = y0 + 33.34;
                // deterministic pseudo-random (seeded) so shards are stable
                const r1 = shardNoise(k * 3);
                const r2 = shardNoise(k * 3 + 1);
                const r3 = shardNoise(k * 3 + 2);
                const dx = ((k % 4) - 2.5) * 110 + (r1 - 0.5) * 90;
                const dy = -160 - (Math.floor(k / 4)) * 55 + (r2 - 0.5) * 90;
                const rot = (r3 - 0.5) * 70;
                return (
                  <span
                    key={k}
                    className="cin-shard"
                    data-shard={k}
                    style={{
                      backgroundImage: `url(${url})`,
                      clipPath: `polygon(${x0}% ${y0}%,${x1}% ${y0}%,${x1}% ${y1}%,${x0}% ${y1}%)`,
                      WebkitClipPath: `polygon(${x0}% ${y0}%,${x1}% ${y0}%,${x1}% ${y1}%,${x0}% ${y1}%)`,
                      ["--sdx" as string]: `${dx.toFixed(1)}px`,
                      ["--sdy" as string]: `${dy.toFixed(1)}px`,
                      ["--srot" as string]: `${rot.toFixed(1)}deg`,
                    }}
                  />
                );
              })}
            </div>
          ) : null}
        </>
      );
      break;
    }
    case "questions":
      extras = (
        <div className="cin-question-layer" aria-hidden="true">
          <div className="cin-question-title">
            다음 순간으로 가기 전에
            <br />
            마음에게 묻습니다
          </div>
          <svg className="cin-question-lines" viewBox="0 0 1200 700" preserveAspectRatio="none" aria-hidden="true">
            <path d="M250 455C360 420 430 405 500 360" />
            <path d="M590 535C635 475 680 430 735 380" />
            <path d="M930 405C890 380 850 350 810 318" />
            <circle cx="500" cy="360" r="4" />
            <circle cx="735" cy="380" r="4" />
            <circle cx="810" cy="318" r="4" />
          </svg>
          <div className="cin-question-item q1">
            왜 이 순간이 오래 남았나요?
            <small>기억의 온도</small>
          </div>
          <div className="cin-question-item q2">
            무엇이 다음 장면으로 이끌었나요?
            <small>이어진 이유</small>
          </div>
          <div className="cin-question-item q3">
            이 기억에는 어떤 마음이 피었나요?
            <small>남은 감정</small>
          </div>
        </div>
      );
      break;
    case "constellation":
      extras = (
        <>
          <div className="cin-cloud-curtain" aria-hidden="true" />
          <svg className="cin-constellation-svg" viewBox="0 0 900 560" aria-hidden="true">
            <path d="M82 390L178 325L252 356L337 245L438 278L530 162L652 218L748 118L818 260L709 344L598 310L492 420L382 365L272 458L175 422Z" />
            <path d="M178 325L337 245L530 162M252 356L438 278L598 310L709 344M337 245L382 365L492 420L709 344M530 162L652 218L598 310" />
            {[
              [82, 390], [178, 325], [252, 356], [337, 245], [438, 278],
              [530, 162], [652, 218], [748, 118], [818, 260], [709, 344],
              [598, 310], [492, 420], [382, 365], [272, 458], [175, 422],
            ].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="5" />
            ))}
          </svg>
          <div className="cin-constellation-caption">
            <h2>
              기억은 별이 되고
              <br />
              마음은 선으로 이어집니다
            </h2>
            <p>흩어진 순간이 서로를 찾아 하나의 LoveTree 지도로 드러납니다.</p>
          </div>
        </>
      );
      break;
    case "final":
      extras = (
        <>
          <div className="cin-final-logo">
            <p>MEMORIES GROW INTO A LIVING LEGACY</p>
            <h1>LoveTree</h1>
          </div>
          <Link href="/v4/journey" className="cin-final-cta">
            나의 LoveTree 시작하기
          </Link>
        </>
      );
      break;
    default:
      break;
  }

  // sky scene: no image asset, custom sky copy
  const copy =
    scene.effect === "sky" ? (
      <div className="cin-sky-copy">
        <article>
          <h3>
            기억은 날짜를 만나
            <br />
            하나의 흐름이 됩니다.
          </h3>
          <p>처음 마음이 움직인 날부터 다음 순간은 조용히 서로를 찾아갑니다.</p>
        </article>
        <article>
          <h3>
            어제의 마음이
            <br />
            오늘의 가지가 됩니다.
          </h3>
          <p>남겨 둔 문장과 감정은 시간 속에서 제자리를 찾으며 오래 이어집니다.</p>
        </article>
      </div>
    ) : scene.effect === "final" || scene.effect === "questions" || scene.effect === "constellation" ? null : (
      <div className="cin-scene-copy">
        <div className="cin-eyebrow">
          {scene.n} · {scene.eyebrow}
        </div>
        {index === 0 ? <h1>LoveTree</h1> : <h2>{scene.title}</h2>}
        <div className="cin-gold-rule" aria-hidden="true">
          <i />
        </div>
        <p>{scene.body}</p>
      </div>
    );

  return (
    <article
      className={`cin-scene${isLight ? " is-light" : ""}`}
      data-index={index}
      data-effect={scene.effect}
      style={{ "--cin-pos": scene.pos, "--cin-mpos": scene.mpos } as React.CSSProperties}
    >
      <div className="cin-media">
        {url ? (
          <>
            <img
              className="cin-bg"
              src={url}
              alt=""
              loading={eager ? "eager" : "lazy"}
              decoding="async"
            />
            {needsMask && (
              <img
                className="cin-motion-mask"
                src={url}
                alt=""
                loading={eager ? "eager" : "lazy"}
                decoding="async"
              />
            )}
          </>
        ) : (
          <div className="cin-blue-sky" aria-hidden="true">
            <i className="cin-cloud c1" />
            <i className="cin-cloud c2" />
            <i className="cin-cloud c3" />
          </div>
        )}
      </div>
      <div className="cin-shade" aria-hidden="true" />
      {extras}
      {copy}
    </article>
  );
}

/** Preloads the asset of the upcoming scene only (scene 2's image). */
function PreloadScenes() {
  useEffect(() => {
    const img = new Image();
    img.src = assetUrl(SCENES[1].asset) || "";
  }, []);
  return null;
}
