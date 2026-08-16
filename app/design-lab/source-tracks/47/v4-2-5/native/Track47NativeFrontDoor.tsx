"use client";

/**
 * Source Track 47 · Cinematic Front Door V4.2.5 — native React candidate.
 *
 * NOT CANONICAL PRODUCT. The interaction contract is the exact source's
 * (pinned 676f5220…); the state architecture is the explicit model from
 * lib/source-track-47/cinematic-model.ts:
 *
 * - PlaybackState (mode machine)       — one film-timeline authority
 * - CinematicState (act/progress/CTA)  — projection of the current time
 * - NavMenuState ({openMenu})          — ONE open-menu authority; hover only
 *   styles, never opens by focus (V4.2.5 removed :focus-within auto-open)
 * - MotionPreference (reduced/still)   — 5-keyframe still mode
 * - RouteResolution (route-map.ts)     — repo route authority, never
 *   source-local file:// paths
 *
 * Asset boundary: the exact 28,650,099 B video is REPO_PIN_NOT_APPROPRIATE,
 * so <video> points at its declared (absent) path and the element's own
 * error → poster-fallback path runs — the source-faithful missing-asset
 * behavior. Video fidelity is HOLD, never claimed as PASS.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACTS,
  DEFAULT_DURATION,
  INITIAL_NAV_MENU,
  INITIAL_PLAYBACK,
  PLAYBACK_MODES,
  actForScrollRatio,
  cinematicForTime,
  clamp,
  navEscape,
  navOutsidePointer,
  navOptionActivated,
  navTriggerPressed,
  scrubStep,
  type NavMenuId,
  type NavMenuState,
  type PlaybackMode,
  type PlaybackState,
} from "@/lib/source-track-47/cinematic-model";
import { SOURCE_TRACK_47_POSTER, SOURCE_TRACK_47_VIDEO } from "@/lib/source-track-47/provenance";
import {
  NAV_MENU_GROUPS,
  SCENE_COPY,
  resolvableHref,
  routeByKey,
} from "@/lib/source-track-47/route-map";
import styles from "./native-frontdoor.module.css";

const VIDEO_SRC = SOURCE_TRACK_47_VIDEO.videoAssetPath;
const POSTER_SRC = SOURCE_TRACK_47_POSTER.assetPath;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const EMOTIONS = ["궁금해", "설레", "계속 생각나", "놀랐어"] as const;

type RunnerState = {
  playback: PlaybackState;
  actId: number;
  actLabel: string;
  ctaReady: boolean;
  paused: boolean;
  muted: boolean;
  reduced: boolean;
  composerOpen: boolean;
  notice: string | null;
};

export default function Track47NativeFrontDoor() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sourceRef = useRef<HTMLSourceElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);
  const firstOptionRef = useRef<Record<string, HTMLAnchorElement | null>>({});
  const triggerRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const noticeTimer = useRef(0);

  const [nav, setNav] = useState<NavMenuState>(INITIAL_NAV_MENU);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [demoPlanted, setDemoPlanted] = useState(false);
  const [runner, setRunner] = useState<RunnerState>({
    playback: INITIAL_PLAYBACK,
    actId: 1,
    actLabel: ACTS[0].label,
    ctaReady: false,
    paused: true,
    muted: true,
    reduced: false,
    composerOpen: false,
    notice: null,
  });

  /* Mutable mirrors — rAF loops must not re-render every frame. */
  const playback = useRef<PlaybackState>({ ...INITIAL_PLAYBACK });
  const durationRef = useRef(DEFAULT_DURATION);
  const targetTime = useRef(0);
  const scrubTime = useRef(0);
  const stillMode = useRef(false);
  const navRef = useRef(nav);
  useEffect(() => {
    navRef.current = nav;
  }, [nav]);
  const composerOpenRef = useRef(runner.composerOpen);
  useEffect(() => {
    composerOpenRef.current = runner.composerOpen;
  }, [runner.composerOpen]);

  const setMode = useCallback((next: PlaybackMode) => {
    playback.current = { ...playback.current, mode: next };
    setRunner((prev) =>
      prev.playback.mode === playback.current.mode
        ? prev
        : { ...prev, playback: { ...playback.current } },
    );
  }, []);

  const showNotice = useCallback((message: string) => {
    window.clearTimeout(noticeTimer.current);
    setRunner((prev) => ({ ...prev, notice: message }));
    noticeTimer.current = window.setTimeout(() => {
      setRunner((prev) => ({ ...prev, notice: null }));
    }, 2800);
  }, []);

  const maxScroll = useCallback(
    () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight),
    [],
  );

  /** Source applyAct: boundary changes re-render; progress stays a CSS var. */
  const applyAct = useCallback((time: number) => {
    const cinematic = cinematicForTime(time, playback.current.mode, durationRef.current);
    stageRef.current?.style.setProperty("--stage-progress", cinematic.progress.toFixed(5));
    railRef.current?.setAttribute("aria-valuenow", String(Math.round(cinematic.progress * 100)));
    setRunner((prev) =>
      prev.actId === cinematic.actId &&
      prev.ctaReady === cinematic.ctaReady &&
      prev.playback.mode === playback.current.mode
        ? prev
        : {
            ...prev,
            actId: cinematic.actId,
            actLabel: cinematic.actLabel,
            ctaReady: cinematic.ctaReady,
            playback: { ...playback.current },
          },
    );
  }, []);

  const failVideo = useCallback(() => {
    playback.current = { ...playback.current, failure: true, userAuthority: false };
    stillMode.current = false;
    videoRef.current?.pause();
    setMode(PLAYBACK_MODES.PAUSED);
  }, [setMode]);

  const syncScrollToCurrent = useCallback(
    (extraPx = 0) => {
      const time = videoRef.current?.currentTime ?? 0;
      const y = clamp((time / durationRef.current) * maxScroll() + extraPx, 0, maxScroll());
      window.scrollTo({ top: y, behavior: "auto" });
      targetTime.current = (y / maxScroll()) * durationRef.current;
      scrubTime.current = time;
    },
    [maxScroll],
  );

  const enterUser = useCallback(
    (extraPx = 0) => {
      if (playback.current.failure || stillMode.current) return;
      if (!playback.current.userAuthority) {
        videoRef.current?.pause();
        playback.current = { ...playback.current, userAuthority: true };
        syncScrollToCurrent(extraPx);
        setMode(PLAYBACK_MODES.USER);
      }
    },
    [setMode, syncScrollToCurrent],
  );

  const autoplay = useCallback(() => {
    const video = videoRef.current;
    if (!video || stillMode.current || playback.current.failure) return;
    playback.current = { ...playback.current, userAuthority: false };
    video.muted = true;
    setRunner((prev) => ({ ...prev, muted: true }));
    video
      .play()
      .then(() => setMode(PLAYBACK_MODES.AUTO))
      .catch(() => {
        playback.current = { ...playback.current, priorMode: PLAYBACK_MODES.AUTO };
        setMode(PLAYBACK_MODES.PAUSED);
      });
  }, [setMode]);

  const replay = useCallback(() => {
    playback.current = { ...playback.current, failure: false, userAuthority: false };
    stillMode.current = false;
    setMode(PLAYBACK_MODES.REPLAY);
    window.scrollTo({ top: 0, behavior: "auto" });
    const video = videoRef.current;
    if (video) video.currentTime = 0;
    targetTime.current = 0;
    scrubTime.current = 0;
    video?.play().catch(() => setMode(PLAYBACK_MODES.PAUSED));
  }, [setMode]);

  const openComposer = useCallback(() => {
    setRunner((prev) => ({ ...prev, composerOpen: true }));
    window.setTimeout(() => {
      document.getElementById("t47MomentUrl")?.focus();
    }, 0);
  }, []);

  const closeComposer = useCallback(() => {
    setRunner((prev) => ({ ...prev, composerOpen: false }));
  }, []);

  /** Source parity: ?demoComposer=1 turns firstMoment into the demo composer. */
  const firstMomentActivate = useCallback(() => {
    if (new URLSearchParams(window.location.search).get("demoComposer") === "1") {
      openComposer();
      return;
    }
    /* Mapping proof only: canonical /v4 owns first-moment entry logic. */
    showNotice(
      "ROUTE MAPPING PROOF · firstMoment → /v4 (canonical V4 Entry · adoption review pending)",
    );
  }, [openComposer, showNotice]);

  /* ---------------- input ownership (wheel / touch / keys) ---------------- */

  useEffect(() => {
    const onScroll = () => {
      if (stillMode.current) {
        const act = actForScrollRatio(window.scrollY / maxScroll());
        const video = videoRef.current;
        if (video && Math.abs(video.currentTime - act.key) > 0.05) video.currentTime = act.key;
        applyAct(act.key);
        return;
      }
      if (!playback.current.userAuthority) return;
      targetTime.current = clamp(
        (window.scrollY / maxScroll()) * durationRef.current,
        0,
        durationRef.current - 0.001,
      );
    };
    const onWheel = (event: WheelEvent) => {
      if (!playback.current.userAuthority && !stillMode.current && !playback.current.failure) {
        event.preventDefault();
        enterUser(event.deltaY);
      }
    };
    const onTouchStart = () => {
      if (!playback.current.userAuthority && !stillMode.current && !playback.current.failure) {
        enterUser();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const seekKeys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", " "];
      if (seekKeys.includes(event.key) && !stillMode.current && !playback.current.failure) {
        if (!playback.current.userAuthority) {
          event.preventDefault();
          const up = event.key === "ArrowUp" || event.key === "PageUp";
          enterUser(up ? -window.innerHeight * 0.55 : window.innerHeight * 0.55);
        }
      }
      if (event.key === "Escape") {
        if (composerOpenRef.current) {
          closeComposer();
          return;
        }
        const activeGroup = document.activeElement?.closest("[data-nav-group]");
        const menuId = (activeGroup?.getAttribute("data-nav-group") ??
          navRef.current.openMenu ??
          null) as NavMenuId | null;
        const { state, focus } = navEscape(navRef.current, menuId);
        setNav(state);
        if (focus.kind === "trigger") {
          triggerRef.current[focus.menu]?.focus({ preventScroll: true });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [applyAct, closeComposer, enterUser, maxScroll]);

  /* ---------------- rAF loops (visual tick + scrub) ---------------- */

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const mode = playback.current.mode;
      if (
        mode === PLAYBACK_MODES.AUTO ||
        mode === PLAYBACK_MODES.REPLAY ||
        mode === PLAYBACK_MODES.COMPLETED ||
        mode === PLAYBACK_MODES.PAUSED
      ) {
        applyAct(videoRef.current?.currentTime ?? 0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [applyAct]);

  useEffect(() => {
    let raf = 0;
    const scrub = () => {
      if (playback.current.userAuthority && !stillMode.current && !playback.current.failure) {
        const step = scrubStep(scrubTime.current, targetTime.current);
        scrubTime.current = step.scrubTime;
        const video = videoRef.current;
        if (video && Math.abs(video.currentTime - scrubTime.current) > 0.008) {
          video.currentTime = clamp(scrubTime.current, 0, durationRef.current - 0.001);
        }
        applyAct(scrubTime.current);
      }
      raf = requestAnimationFrame(scrub);
    };
    raf = requestAnimationFrame(scrub);
    return () => cancelAnimationFrame(raf);
  }, [applyAct]);

  /* ---------------- reduced motion ---------------- */

  useEffect(() => {
    const query = window.matchMedia(REDUCED_QUERY);
    const setup = () => {
      const reduced = query.matches;
      setRunner((prev) => ({ ...prev, reduced }));
      stageRef.current?.classList.toggle("reducedMotion", reduced);
      if (reduced) {
        stillMode.current = true;
        playback.current = { ...playback.current, userAuthority: false };
        const video = videoRef.current;
        video?.pause();
        if (video) video.currentTime = ACTS[0].key;
        applyAct(ACTS[0].key);
        setMode(PLAYBACK_MODES.PAUSED);
      } else if (!playback.current.failure) {
        autoplay();
      }
    };
    setup();
    query.addEventListener?.("change", setup);
    return () => query.removeEventListener?.("change", setup);
  }, [applyAct, autoplay, setMode]);

  /* ---------------- video events ---------------- */

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => {
      if (Number.isFinite(video.duration)) durationRef.current = video.duration;
      targetTime.current = video.currentTime;
      scrubTime.current = video.currentTime;
      applyAct(video.currentTime);
    };
    const onEnded = () => {
      applyAct(durationRef.current - 0.001);
      setMode(PLAYBACK_MODES.COMPLETED);
    };
    const onPlay = () => setRunner((prev) => ({ ...prev, paused: false }));
    const onPause = () => setRunner((prev) => ({ ...prev, paused: true }));
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("ended", onEnded);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", failVideo);
    // With a <source> child the error event targets the source element, so
    // listen there too; NETWORK_NO_SOURCE polling covers error races where
    // the 404 resolves before this effect attaches.
    const sourceEl = sourceRef.current;
    sourceEl?.addEventListener("error", failVideo);
    const noSourceWatch = window.setInterval(() => {
      if (
        !playback.current.failure &&
        video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE
      ) {
        failVideo();
      }
    }, 250);
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", failVideo);
      sourceEl?.removeEventListener("error", failVideo);
      window.clearInterval(noSourceWatch);
    };
  }, [applyAct, failVideo, setMode]);

  /* ---------------- controls ---------------- */

  const pauseToggle = () => {
    const video = videoRef.current;
    if (!video || playback.current.failure) return;
    if (video.paused) {
      if (playback.current.userAuthority) {
        playback.current = { ...playback.current, userAuthority: false };
      }
      video
        .play()
        .then(() =>
          setMode(
            playback.current.priorMode === PLAYBACK_MODES.REPLAY
              ? PLAYBACK_MODES.REPLAY
              : PLAYBACK_MODES.AUTO,
          ),
        )
        .catch(() => setMode(PLAYBACK_MODES.PAUSED));
    } else {
      playback.current = { ...playback.current, priorMode: playback.current.mode };
      video.pause();
      setMode(PLAYBACK_MODES.PAUSED);
    }
  };

  const muteToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setRunner((prev) => ({ ...prev, muted: video.muted }));
  };

  const reducedPlay = () => {
    const video = videoRef.current;
    stillMode.current = false;
    stageRef.current?.classList.remove("reducedMotion");
    setRunner((prev) => ({ ...prev, reduced: false }));
    if (video) video.currentTime = 0;
    window.scrollTo({ top: 0 });
    video?.play().catch(() => setMode(PLAYBACK_MODES.PAUSED));
  };

  /* ---------------- progress rail ---------------- */

  const railSeek = (clientY: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const p = clamp((clientY - rect.top) / rect.height, 0, 1);
    if (stillMode.current) {
      const act = actForScrollRatio(p);
      const video = videoRef.current;
      if (video) video.currentTime = act.key;
      applyAct(act.key);
      window.scrollTo({ top: ((act.id - 1) / 4) * maxScroll(), behavior: "auto" });
      return;
    }
    enterUser();
    window.scrollTo({ top: p * maxScroll(), behavior: "auto" });
    targetTime.current = p * durationRef.current;
    scrubTime.current = targetTime.current;
    const video = videoRef.current;
    if (video) video.currentTime = targetTime.current;
    applyAct(targetTime.current);
  };

  const railDragging = useRef(false);
  const onRailPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    railDragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    railSeek(event.clientY);
  };
  const onRailPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (railDragging.current) railSeek(event.clientY);
  };
  const onRailPointerUp = () => {
    railDragging.current = false;
  };
  const onRailKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const video = videoRef.current;
    const rail = railRef.current;
    if (!video || !rail) return;
    const dir = event.key === "ArrowUp" || event.key === "ArrowRight" ? 1 : -1;
    const p = clamp(video.currentTime / durationRef.current + dir * 0.04, 0, 1);
    railSeek(rail.getBoundingClientRect().top + p * rail.clientHeight);
  };

  /* ---------------- pinned nav menus ---------------- */

  const onTriggerClick = (menu: NavMenuId) => {
    const { state, focus } = navTriggerPressed(navRef.current, menu);
    setNav(state);
    if (focus.kind === "first-option") {
      window.requestAnimationFrame(() => {
        firstOptionRef.current[focus.menu]?.focus({ preventScroll: true });
      });
    }
  };

  const onOptionActivate = () => {
    setNav(navOptionActivated(navRef.current));
  };

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-nav-group]")) {
        setNav((current) => navOutsidePointer(current));
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  /* ---------------- render ---------------- */

  const stageClasses = [
    styles.stage,
    runner.playback.failure ? styles.videoFailed : "",
    runner.ctaReady ? styles.ctaReady : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sceneActClass: Record<number, string> = {
    1: styles.act1,
    2: styles.act2,
    3: styles.act3,
    4: styles.act4,
    5: styles.act5,
  };

  return (
    <div className={`${styles.root} t47-native`} data-t47-native="">
      <div className={styles.scroller} aria-hidden="true" />

      <main
        ref={stageRef}
        className={stageClasses}
        data-act={runner.actId}
        data-mode={runner.playback.mode}
        data-failure={runner.playback.failure ? "true" : "false"}
        data-cta-ready={runner.ctaReady ? "true" : "false"}
        data-reduced={runner.reduced ? "true" : "false"}
        aria-live="polite"
      >
        <div className={styles.videoWorld} aria-hidden="true">
          <video
            ref={videoRef}
            className={styles.video}
            muted
            playsInline
            preload="auto"
            poster={POSTER_SRC}
          >
            {/* Error attaches via the effect below (refs survive fast 404s
                better than the synthetic onError on <source>). */}
            <source ref={sourceRef} src={VIDEO_SRC} type="video/mp4" />
          </video>
          <div
            className={styles.posterFallback}
            style={{ backgroundImage: `url('${POSTER_SRC}')` }}
          />
        </div>
        <div className={styles.scrim} data-act={runner.actId} />

        <nav className={styles.nav} aria-label="LoveTree front door">
          <a
            className={styles.brand}
            href="#top"
            onClick={(event) => {
              event.preventDefault();
              replay();
            }}
          >
            LOVETREE
          </a>
          <div className={styles.navLinks}>
            {NAV_MENU_GROUPS.map((group) => {
              const menuId = group.id as NavMenuId;
              const isOpen = nav.openMenu === menuId;
              return (
                <div
                  key={menuId}
                  className={`${styles.navGroup} ${isOpen ? styles.isOpen : ""}`}
                  data-nav-group={menuId}
                >
                  <button
                    ref={(element) => {
                      triggerRef.current[menuId] = element;
                    }}
                    className={styles.navLink}
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    data-nav-menu={menuId}
                    onClick={() => onTriggerClick(menuId)}
                  >
                    {group.triggerLabel}
                  </button>
                  <div className={styles.navPopover} role="menu" aria-label={group.menuAriaLabel}>
                    {group.options.map((option, index) => {
                      const firstRef =
                        index === 0
                          ? (element: HTMLAnchorElement | null) => {
                              firstOptionRef.current[menuId] = element;
                            }
                          : undefined;
                      const href = resolvableHref(option);
                      if (href) {
                        return (
                          <a
                            key={option.key}
                            ref={firstRef}
                            className={styles.navOption}
                            role="menuitem"
                            data-route-key={option.key}
                            href={href}
                            onClick={onOptionActivate}
                          >
                            <span>{option.label}</span>
                            <small>{option.small}</small>
                          </a>
                        );
                      }
                      return (
                        <a
                          key={option.key}
                          ref={firstRef}
                          className={styles.navOptionHold}
                          role="menuitem"
                          aria-disabled="true"
                          data-route-key={option.key}
                          data-route-hold="true"
                          href="#"
                          title={option.note}
                          onClick={(event) => {
                            event.preventDefault();
                            onOptionActivate();
                            showNotice(
                              `REVIEW PENDING · ${option.label} (${option.small}) — repo route unresolved`,
                            );
                          }}
                        >
                          <span>{option.label}</span>
                          <small>{option.small} · HOLD</small>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <a
              className={styles.navPlant}
              data-route-key="firstMoment"
              href="#"
              onClick={(event) => {
                event.preventDefault();
                firstMomentActivate();
              }}
            >
              첫 순간 심기
            </a>
          </div>
        </nav>

        {SCENE_COPY.map((scene) => (
          <section
            key={scene.actId}
            className={`${styles.sceneCopy} ${sceneActClass[scene.actId]} ${
              runner.actId === scene.actId ? styles.isActive : ""
            }`}
            data-copy-act={scene.actId}
          >
            <p className={styles.eyebrow}>{scene.eyebrow}</p>
            <h1 className={styles.heading}>{scene.heading}</h1>
            {scene.sub ? <p className={styles.sub}>{scene.sub}</p> : null}
            {"reasons" in scene && scene.reasons ? (
              <div className={styles.reasonList} aria-label="Why next examples">
                {scene.reasons.map((reason) => (
                  <span key={reason}>{reason}</span>
                ))}
              </div>
            ) : null}
            {"tiny" in scene && scene.tiny ? <p className={styles.tiny}>{scene.tiny}</p> : null}
            {scene.actId === 5 ? (
              <div className={styles.ctaRow}>
                <a
                  className={styles.ctaPrimary}
                  data-route-key="firstMoment"
                  data-cta="first-moment"
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    firstMomentActivate();
                  }}
                >
                  첫 순간 심기
                </a>
                <a
                  className={styles.ctaHold}
                  data-route-key="tree46"
                  data-cta="browse"
                  data-route-hold="true"
                  href="#"
                  title={routeByKey("tree46")?.note ?? ""}
                  onClick={(event) => {
                    event.preventDefault();
                    showNotice(
                      "REVIEW PENDING · 러브트리 둘러보기 (tree46) — repo route unresolved",
                    );
                  }}
                >
                  러브트리 둘러보기
                </a>
                <button className={styles.ctaTertiary} type="button" onClick={replay}>
                  다시 보기
                </button>
              </div>
            ) : null}
          </section>
        ))}

        <div className={styles.ghostWord} aria-hidden="true">
          LOVETREE
        </div>

        <div className={styles.miniControls} aria-label="cinematic controls">
          <button className={styles.miniBtn} type="button" onClick={pauseToggle}>
            {runner.paused ? "Play" : "Pause"}
          </button>
          <button
            className={styles.miniBtn}
            type="button"
            aria-pressed={runner.muted}
            onClick={muteToggle}
          >
            {runner.muted ? "Muted" : "Sound"}
          </button>
          <span className={styles.stateChip}>{runner.playback.mode}</span>
          <span className={styles.candidateChip}>T47 NATIVE CANDIDATE · NOT CANONICAL</span>
        </div>

        <div className={styles.progress} aria-label="Act progress">
          <div className={styles.progressCopy}>
            <div className={styles.progressCount}>
              {String(runner.actId).padStart(2, "0")} / 05
            </div>
            <div className={styles.progressLabel}>{runner.actLabel}</div>
          </div>
          <div
            ref={railRef}
            className={styles.progressRail}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            aria-label="Act progress rail"
            tabIndex={0}
            onPointerDown={onRailPointerDown}
            onPointerMove={onRailPointerMove}
            onPointerUp={onRailPointerUp}
            onKeyDown={onRailKeyDown}
          >
            <div className={styles.progressFill} />
            <div className={styles.progressHit} />
          </div>
        </div>

        <div className={styles.reducedCard}>
          <button className={styles.miniBtn} type="button" onClick={reducedPlay}>
            Play video
          </button>
          <span className={styles.stateChip}>5 KEYFRAME STILL MODE</span>
        </div>

        <section className={styles.fallbackMessage}>
          <p className={styles.eyebrow}>LOVETREE</p>
          <h2 className={styles.heading}>{"마음이 움직인 순간부터,\nLoveTree는 시작됩니다."}</h2>
          <a
            className={styles.ctaPrimary}
            data-route-key="firstMoment"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              firstMomentActivate();
            }}
          >
            첫 순간 심기
          </a>
        </section>
      </main>

      <div
        className={`${styles.modalShell} ${runner.composerOpen ? styles.open : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="t47ComposerTitle"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeComposer();
        }}
      >
        <section className={styles.composer}>
          <div className={styles.composerHead}>
            <div>
              <h2 id="t47ComposerTitle">어떤 순간이 마음에 남았나요?</h2>
              <p className={styles.note}>독립 HTML 데모입니다. 입력은 서버에 저장되지 않습니다.</p>
            </div>
            <button
              className={styles.closeBtn}
              type="button"
              aria-label="닫기"
              onClick={closeComposer}
            >
              ×
            </button>
          </div>
          <div className={styles.field}>
            <label htmlFor="t47MomentUrl">URL</label>
            <input id="t47MomentUrl" type="url" placeholder="https://" autoComplete="off" />
          </div>
          <div className={styles.emotions} aria-label="quick emotion">
            {EMOTIONS.map((emotion) => (
              <button
                key={emotion}
                className={`${styles.emotion} ${
                  selectedEmotion === emotion ? styles.selected : ""
                }`}
                type="button"
                aria-pressed={selectedEmotion === emotion}
                onClick={() => setSelectedEmotion((prev) => (prev === emotion ? null : emotion))}
              >
                {emotion}
              </button>
            ))}
          </div>
          <div className={styles.field}>
            <label htmlFor="t47MomentLine">한 줄</label>
            <textarea
              id="t47MomentLine"
              maxLength={140}
              placeholder="왜 이 장면이 남았는지 한 줄만 적어도 됩니다."
            />
          </div>
          <div className={styles.composerActions}>
            <span className={styles.demoStatus}>
              {demoPlanted
                ? "데모 입력만 확인했습니다 · 서버 저장 없음"
                : "저장 기능은 연결하지 않았습니다."}
            </span>
            <button
              className={styles.ctaPrimary}
              type="button"
              onClick={() => setDemoPlanted(true)}
            >
              이 순간 심기 · 데모
            </button>
          </div>
        </section>
      </div>

      <div
        className={`${styles.routeNotice} ${runner.notice ? styles.show : ""}`}
        role="status"
        aria-live="polite"
      >
        {runner.notice ?? ""}
      </div>
    </div>
  );
}
