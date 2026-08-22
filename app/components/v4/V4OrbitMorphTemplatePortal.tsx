"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./V4OrbitMorphTemplatePortal.module.css";
import {
  SOURCE_TRACK_74_LOGO_STATUS,
  SOURCE_TRACK_74_SUBJECT_IMAGES,
  SOURCE_TRACK_74_SUPPORT_COPY,
  SOURCE_TRACK_74_TRAIL_CONSTANTS,
  SOURCE_TRACK_74_TITLE,
} from "@/lib/source-track-74/provenance";
import {
  SOURCE_TRACK_74_PILL_ROUTE,
  SOURCE_TRACK_74_ROUTE_GROUPS,
  routesForGroup,
  type NormalizedRoute,
} from "@/lib/source-track-74/route-map";

const {
  TRAIL_MAX_POINTS,
  TRAIL_HEAD_R,
  TRAIL_NOISE_AMP,
  TRAIL_BLOB_PTS,
  TRAIL_FADE_SPEED,
  TRAIL_SAMPLE_DIST,
} = SOURCE_TRACK_74_TRAIL_CONSTANTS;

interface TrailPoint {
  x: number;
  y: number;
  r: number;
  alpha: number;
  seed: number;
}

interface TrailState {
  points: TrailPoint[];
  headRadius: number;
  hovering: boolean;
  x: number;
  y: number;
  lastX: number | null;
  lastY: number | null;
  time: number;
}

function createTrailState(): TrailState {
  return {
    points: [],
    headRadius: 0,
    hovering: false,
    x: 0,
    y: 0,
    lastX: null,
    lastY: null,
    time: 0,
  };
}

function drawMorphBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  seed: number,
): void {
  if (r < 2) return;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < TRAIL_BLOB_PTS; i++) {
    const angle = (Math.PI * 2 * i) / TRAIL_BLOB_PTS;
    const n1 = Math.sin(angle * 3 + t * 1.4 + seed) * 0.45;
    const n2 = Math.sin(angle * 5 - t * 0.9 + seed * 2.3) * 0.3;
    const n3 = Math.cos(angle * 2 + t * 1.8 + seed * 0.7) * 0.25;
    const noise = (n1 + n2 + n3) * TRAIL_NOISE_AMP * (r / TRAIL_HEAD_R);
    const rr = Math.max(1, r + noise);
    pts.push({ x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr });
  }
  const first = pts[0];
  const last = pts[pts.length - 1];
  ctx.beginPath();
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const next = pts[(i + 1) % pts.length];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
  }
  ctx.closePath();
  ctx.fill();
}

interface MaskLayer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  invert: boolean;
}

function resizeLayer(layer: MaskLayer, flower: HTMLElement): void {
  const r = flower.getBoundingClientRect();
  layer.canvas.width = Math.max(1, Math.round(r.width));
  layer.canvas.height = Math.max(1, Math.round(r.height));
}

function renderLayer(
  layer: MaskLayer,
  target: HTMLElement,
  points: TrailPoint[],
  time: number,
): void {
  const c = layer.canvas;
  const ctx = layer.ctx;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, c.width, c.height);
  if (!layer.invert) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.fillStyle = "#fff";
  }
  for (const p of points) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
    drawMorphBlob(ctx, p.x, p.y, p.r, time, p.seed);
  }
  ctx.restore();
  const url = `url(${c.toDataURL()})`;
  target.style.setProperty("mask-image", url);
  target.style.setProperty("-webkit-mask-image", url);
  target.style.setProperty("mask-size", "100% 100%");
  target.style.setProperty("-webkit-mask-size", "100% 100%");
  target.style.setProperty("mask-repeat", "no-repeat");
  target.style.setProperty("-webkit-mask-repeat", "no-repeat");
}

function MenuLink({ route, mobile }: { route: NormalizedRoute; mobile: boolean }) {
  if (route.classification === "HOLD_UNRESOLVED") {
    return (
      <span
        className={mobile ? styles.menuHold : styles.panelHold}
        title={route.note}
      >
        <span>{route.label}</span>
        <b aria-hidden="true">보류</b>
      </span>
    );
  }
  const className = mobile ? styles.menuLink : styles.panelLink;
  return (
    <Link href={route.repoRoute as string} className={className} title={route.note}>
      <span>{route.label}</span>
      <b aria-hidden="true">↗</b>
    </Link>
  );
}

export default function V4OrbitMorphTemplatePortal() {
  const [anim, setAnim] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const flowerRef = useRef<HTMLDivElement | null>(null);
  const frontLayerRef = useRef<HTMLDivElement | null>(null);
  const revealLayerRef = useRef<HTMLDivElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const topCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const scrimRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const trailRef = useRef<TrailState>(createTrailState());
  const navListRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const flower = flowerRef.current;
    const frontLayer = frontLayerRef.current;
    const revealLayer = revealLayerRef.current;
    const bgCanvas = bgCanvasRef.current;
    const topCanvas = topCanvasRef.current;
    const stage = flower?.parentElement;
    if (!flower || !frontLayer || !revealLayer || !bgCanvas || !topCanvas || !stage)
      return;

    const bgCtx = bgCanvas.getContext("2d");
    const topCtx = topCanvas.getContext("2d");
    if (!bgCtx || !topCtx) return;

    const bgLayer: MaskLayer = { canvas: bgCanvas, ctx: bgCtx, invert: false };
    const topLayer: MaskLayer = { canvas: topCanvas, ctx: topCtx, invert: true };
    const trail = trailRef.current;

    const resize = () => {
      resizeLayer(bgLayer, flower);
      resizeLayer(topLayer, flower);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(flower);
    window.addEventListener("resize", resize, { passive: true });

    const toFlowerSpace = (e: MouseEvent) => {
      const r = flower.getBoundingClientRect();
      trail.x = (e.clientX - r.left) * (bgLayer.canvas.width / r.width);
      trail.y = (e.clientY - r.top) * (bgLayer.canvas.height / r.height);
    };
    const onMouseEnter = (e: MouseEvent) => {
      trail.hovering = true;
      toFlowerSpace(e);
      trail.lastX = null;
      trail.lastY = null;
    };
    const onMouseMove = (e: MouseEvent) => {
      trail.hovering = true;
      toFlowerSpace(e);
    };
    const onMouseLeave = () => {
      trail.hovering = false;
      trail.lastX = null;
      trail.lastY = null;
    };
    stage.addEventListener("mouseenter", onMouseEnter);
    stage.addEventListener("mousemove", onMouseMove);
    stage.addEventListener("mouseleave", onMouseLeave);

    let raf = 0;
    const frame = () => {
      const targetR = trail.hovering ? TRAIL_HEAD_R : 0;
      trail.headRadius += (targetR - trail.headRadius) * (trail.hovering ? 0.14 : 0.04);
      if (trail.hovering && trail.headRadius > 5) {
        const lx = trail.lastX;
        const ly = trail.lastY;
        const d =
          lx === null || ly === null
            ? Infinity
            : Math.hypot(trail.x - lx, trail.y - ly);
        if (d > TRAIL_SAMPLE_DIST) {
          trail.points.push({
            x: trail.x,
            y: trail.y,
            r: trail.headRadius,
            alpha: 1,
            seed: Math.random() * 100,
          });
          if (trail.points.length > TRAIL_MAX_POINTS)
            trail.points.splice(0, trail.points.length - TRAIL_MAX_POINTS);
          trail.lastX = trail.x;
          trail.lastY = trail.y;
        }
      }
      for (const p of trail.points) {
        p.alpha *= TRAIL_FADE_SPEED;
        p.r *= 0.995;
      }
      trail.points = trail.points.filter((p) => p.alpha >= 0.01);
      trail.time += 0.016;
      renderLayer(bgLayer, frontLayer, trail.points, trail.time);
      renderLayer(topLayer, revealLayer, trail.points, trail.time);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      stage.removeEventListener("mouseenter", onMouseEnter);
      stage.removeEventListener("mousemove", onMouseMove);
      stage.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  useEffect(() => {
    if (!anim) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setAnim(false), reduced ? 280 : 6000);
    return () => window.clearTimeout(timer);
  }, [anim]);

  const closeNav = useCallback((except: number | null = null) => {
    setOpenGroup((current) => (current === except ? current : null));
  }, []);

  const mobileFocusable = useCallback((): HTMLElement[] => {
    const sheet = sheetRef.current;
    if (!sheet) return [];
    return [
      ...sheet.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    ];
  }, []);

  const openMobile = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setMenuOpen(true);
    burgerRef.current?.setAttribute("aria-label", "메뉴 닫기");
    requestAnimationFrame(() => mobileFocusable()[0]?.focus());
  }, [mobileFocusable]);

  const closeMobile = useCallback(() => {
    setMenuOpen(false);
    burgerRef.current?.setAttribute("aria-label", "메뉴 열기");
    (previousFocusRef.current ?? burgerRef.current)?.focus();
  }, []);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (sheet) {
      sheet.inert = !menuOpen;
      sheet.setAttribute("aria-hidden", String(!menuOpen));
    }
    if (scrimRef.current) scrimRef.current.tabIndex = menuOpen ? 0 : -1;
  }, [menuOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeNav();
        if (menuOpen) {
          e.preventDefault();
          closeMobile();
        }
        return;
      }
      if (e.key === "Tab" && menuOpen) {
        const f = mobileFocusable();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const onClick = (e: MouseEvent) => {
      if (
        !navListRef.current?.contains(e.target as Node) &&
        !burgerRef.current?.contains(e.target as Node)
      ) {
        closeNav();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, [closeNav, closeMobile, menuOpen, mobileFocusable]);

  const rootClasses = [
    styles.scope,
    styles.viewport,
    ...(anim ? [styles.anim] : []),
    ...(menuOpen ? [styles.menuOpen] : []),
  ].join(" ");

  return (
    <main className={rootClasses} data-logo-status={SOURCE_TRACK_74_LOGO_STATUS}>
      <section className={styles.stage} aria-label={SOURCE_TRACK_74_TITLE}>
        <svg
          className={styles.brandMark}
          viewBox="0 0 72 72"
          aria-label="열매가 달린 LoveTree 나무 심벌 후보"
          role="img"
        >
          <path
            className={styles.brandCanopy}
            d="M36 6C26 6 19 11 17 19C10 20 7 26 9 33C7 39 12 46 19 47C23 53 31 53 36 49C42 54 51 52 54 47C62 46 66 39 63 32C65 25 59 19 53 18C50 10 44 6 36 6Z"
          />
          <path className={styles.brandTrunk} d="M36 62C34 52 35 43 36 31M29 64H44" />
          <path
            className={styles.brandBranch}
            d="M36 43C29 40 25 35 22 29M36 38C43 35 48 30 51 24M36 49C42 46 46 42 48 37"
          />
          <path
            className={styles.brandLeaf}
            d="M20 28C17 25 17 22 18 20M52 24C55 21 56 18 55 16M48 37C53 37 56 35 58 32"
          />
          <circle className={styles.brandFruit} cx="23" cy="25" r="4.2" />
          <circle className={styles.brandFruit} cx="46" cy="20" r="4.2" />
          <circle className={styles.brandFruit} cx="52" cy="34" r="4.2" />
        </svg>

        <ul className={styles.primaryNav} aria-label="LoveTree template menu" ref={navListRef}>
          {SOURCE_TRACK_74_ROUTE_GROUPS.map((group, index) => (
            <li
              key={group.id}
              className={openGroup === index ? styles.open : undefined}
            >
              <button
                type="button"
                className={styles.navTrigger}
                aria-expanded={openGroup === index}
                onClick={(e) => {
                  e.stopPropagation();
                  const opening = openGroup !== index;
                  setOpenGroup(opening ? index : null);
                }}
              >
                {group.label}
              </button>
              <div className={styles.navPanel} onClick={(e) => e.stopPropagation()}>
                {routesForGroup(group.id).map((route) => (
                  <MenuLink key={route.key} route={route} mobile={false} />
                ))}
              </div>
            </li>
          ))}
        </ul>

        {SOURCE_TRACK_74_PILL_ROUTE.classification === "HOLD_UNRESOLVED" ? (
          <span className={styles.securePill} title={SOURCE_TRACK_74_PILL_ROUTE.note}>
            첫 순간 심기
          </span>
        ) : (
          <Link
            className={styles.securePill}
            href={SOURCE_TRACK_74_PILL_ROUTE.repoRoute as string}
            title={SOURCE_TRACK_74_PILL_ROUTE.note}
          >
            첫 순간 심기
          </Link>
        )}

        <h1 className={styles.orbitWord} aria-label="LoveTree">
          <span className={styles.wordMask}>
            <span className={styles.wordInner}>
              <span className={styles.wordWhite}>
                <span className={styles.wordL}>L</span>OVE
              </span>
              <span className={styles.wordPink}>TREE</span>
            </span>
          </span>
        </h1>

        <div className={styles.flower} ref={flowerRef}>
          <img
            className={styles.flowerSizer}
            src={SOURCE_TRACK_74_SUBJECT_IMAGES.front}
            alt=""
            aria-hidden="true"
          />
          <div className={styles.flowerLayer} ref={frontLayerRef}>
            <img
              src={SOURCE_TRACK_74_SUBJECT_IMAGES.front}
              alt="Pixel-art pink and violet lily"
            />
          </div>
          <div
            className={`${styles.flowerLayer} ${styles.flowerLayerTop}`.trim()}
            aria-hidden="true"
            ref={revealLayerRef}
          >
            <img src={SOURCE_TRACK_74_SUBJECT_IMAGES.top} alt="" />
          </div>
          <canvas className={styles.morphCanvas} ref={bgCanvasRef} aria-hidden="true" />
          <canvas className={styles.morphCanvas} ref={topCanvasRef} aria-hidden="true" />
        </div>

        <p className={`${styles.supportCopy} ${styles.supportLeft}`}>
          <span className={styles.supportInner}>
            {SOURCE_TRACK_74_SUPPORT_COPY.left.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        </p>
        <p className={`${styles.supportCopy} ${styles.supportRight}`}>
          <span className={styles.supportInner}>
            {SOURCE_TRACK_74_SUPPORT_COPY.right.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        </p>

        <button
          className={styles.mobileScrim}
          type="button"
          aria-label="메뉴 닫기"
          tabIndex={-1}
          ref={scrimRef}
          onClick={closeMobile}
        />
        <aside
          className={styles.mobileSheet}
          aria-label="LoveTree template menu"
          ref={sheetRef}
        >
          {SOURCE_TRACK_74_ROUTE_GROUPS.map((group) => (
            <div key={group.id} className={styles.menuGroup}>
              <h2 className={styles.menuGroupTitle}>{group.label}</h2>
              {routesForGroup(group.id).map((route) => (
                <MenuLink key={route.key} route={route} mobile={true} />
              ))}
            </div>
          ))}
        </aside>
        <button
          className={styles.mobileBurger}
          type="button"
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menuOpen}
          ref={burgerRef}
          onClick={() => (menuOpen ? closeMobile() : openMobile())}
        >
          <span />
        </button>
      </section>
    </main>
  );
}
