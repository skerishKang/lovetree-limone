"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import {
  applyWheel,
  beginGesture,
  cancelGesture,
  createContinuousPhaseState,
  deriveActiveScene,
  endGesture,
  moveGesture,
  overlayOpened,
  resolveContinuousPhaseConfig,
  sceneProjectionOffset,
  selectScene,
  setMotionPolicy,
  stepContinuousPhase,
  type ContinuousPhaseConfig,
  type ContinuousPhaseState,
  type ResolvedContinuousPhaseConfig,
} from "@/lib/track-62-v11/controller";
import {
  TRACK62_VIEWER_TABS,
  TRACK62_V11_SCENE_COUNT,
  TRACK62_V11_SOURCE,
  createTrack62SaveState,
  exhibitionModel,
  saveMoment,
  syntheticTrack62Moments,
  type Track62SaveState,
  type Track62ViewerTab,
} from "@/lib/track-62-v11/data";
import {
  enterDialogFocus,
  focusableElements,
  restoreDialogFocus,
  wrapFocusIndex,
} from "@/lib/track-62-v11/dialog";

const MOMENTS = syntheticTrack62Moments(TRACK62_V11_SCENE_COUNT);

const BASE_CONFIG: ContinuousPhaseConfig = {
  sceneCount: TRACK62_V11_SCENE_COUNT,
};

const SAVE_STORAGE_KEY = "track62-v11-exhibition-save";

type Track62Overlay = "none" | "viewer" | "menu" | "mytree";

function neutralSculpturePath(index: number): string {
  // Neutral DEMO_FIXTURE silhouettes (generated), deliberately NOT the
  // byte-unique source assets: SOURCE_REFERENCE_ONLY for the proof.
  const poses = [
    "M50 8 C62 8 68 20 64 30 L70 34 L58 46 L62 92 L52 92 L50 60 L48 92 L38 92 L42 46 L30 34 L36 30 C32 20 38 8 50 8 Z",
    "M50 6 C60 6 66 16 63 26 L74 40 L66 46 L58 40 L60 92 L50 92 L49 62 L47 92 L38 92 L40 44 L32 52 L26 44 L37 26 C34 16 40 6 50 6 Z",
    "M50 8 C59 8 64 17 62 26 L62 36 L76 30 L78 38 L64 48 L63 92 L53 92 L51 64 L48 92 L38 92 L40 48 L36 30 L44 32 C41 22 43 8 50 8 Z",
    "M50 6 C61 6 67 15 64 24 L61 30 L68 38 L58 40 L60 58 L72 66 L66 74 L56 66 L57 92 L47 92 L46 66 L36 74 L30 66 L42 58 L44 40 L34 38 L41 30 L38 24 C35 15 41 6 50 6 Z",
    "M48 8 C58 8 63 18 60 26 L66 34 L60 42 L57 46 L64 60 L58 90 L48 90 L47 64 L44 90 L34 90 L40 58 L44 46 L38 40 L42 32 C38 22 40 8 48 8 Z",
    "M52 6 C62 6 67 16 64 24 L70 32 L62 38 L60 44 L66 54 L62 90 L52 90 L51 62 L48 90 L38 90 L40 56 L45 44 L43 38 L34 34 L40 26 C37 16 43 6 52 6 Z",
  ];
  return poses[index % poses.length]!;
}

function LoveTreeFigure() {
  return (
    <svg viewBox="0 0 100 100" className="t62-fig__lovetree" aria-hidden="true">
      <path d="M46 92 L46 62 Q40 58 38 50 Q30 52 26 44 Q18 42 20 34 Q14 26 24 22 Q26 12 36 14 Q42 6 50 10 Q58 4 64 12 Q74 12 76 22 Q86 26 80 34 Q82 42 74 44 Q70 52 62 50 Q60 58 54 62 L54 92 Z" />
      <ellipse cx="50" cy="95" rx="30" ry="3" />
    </svg>
  );
}

function SculptureFigure({ index, poseCount }: { index: number; poseCount: number }) {
  if (index === poseCount - 1) {
    return <LoveTreeFigure />;
  }
  return (
    <svg viewBox="0 0 100 100" className="t62-fig" aria-hidden="true">
      <ellipse cx="50" cy="95" rx="26" ry="3" />
      <path d={neutralSculpturePath(index)} />
    </svg>
  );
}

export function ContinuousExhibitionRailExperience() {
  const [rail, setRail] = useState<ContinuousPhaseState>(() => createContinuousPhaseState(BASE_CONFIG));
  // Resolved config is derived render-pure from the rail's motion policy; the
  // rAF loop and event handlers read it through a ref updated in an effect.
  const motionPolicy = rail.motionPolicy;
  const resolvedConfig = useMemo(
    () => resolveContinuousPhaseConfig({ ...BASE_CONFIG, motionPolicy }),
    [motionPolicy],
  );
  const configRef = useRef<ResolvedContinuousPhaseConfig>(resolvedConfig);
  useEffect(() => {
    configRef.current = resolvedConfig;
  }, [resolvedConfig]);

  const [overlay, setOverlay] = useState<Track62Overlay>("none");
  const [viewerTab, setViewerTab] = useState<Track62ViewerTab>("VIEW");
  const [revealState, setRevealState] = useState<"poster" | "revealing" | "done-demo">("poster");

  // Hydration gate (repo pattern, see Lineage58VideoFigure): SAVE is
  // localStorage prototype state; it must not leak into the SSR render.
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [savedIds, setSavedIds] = useState<ReadonlyArray<string>>([]);
  const saveState: Track62SaveState = useMemo(() => {
    let base = createTrack62SaveState();
    if (hydrated) {
      try {
        const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { ids?: unknown };
          if (Array.isArray(parsed.ids)) {
            for (const id of parsed.ids) {
              if (typeof id === "string") base = saveMoment(base, id);
            }
          }
        }
      } catch {
        // prototype state only — corrupted local data is discarded, never fatal
      }
    }
    for (const id of savedIds) base = saveMoment(base, id);
    return base;
  }, [hydrated, savedIds]);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const suppressClickRef = useRef(false);
  const overlayRef = useRef<Track62Overlay>("none");
  useEffect(() => {
    overlayRef.current = overlay;
  }, [overlay]);

  const activeIndex = deriveActiveScene(rail);
  const activeMoment = MOMENTS[activeIndex]!;
  const model = exhibitionModel(MOMENTS, activeMoment.id);

  useEffect(() => {
    if (!hydrated || saveState.savedMomentIds.length === 0) return;
    try {
      window.localStorage.setItem(
        SAVE_STORAGE_KEY,
        JSON.stringify({ boundary: "PROTOTYPE_STATE_ONLY", ids: saveState.savedMomentIds }),
      );
    } catch {
      // storage unavailable: the proof degrades to in-memory state
    }
  }, [hydrated, saveState]);

  // ---- reduced motion: manual navigation intact, only settle speed changes ----
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      const reduced = query.matches;
      setRail((prev) =>
        setMotionPolicy(prev, BASE_CONFIG, reduced ? "reduced" : "full").state,
      );
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // ---- animation loop: frames driven here, controller stays timer-free ----
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = now - last;
      last = now;
      if (dt <= 0) return;
      // Overlay open = presentation paused, NOT transported: the controller is
      // never reset and never stepped, so fractional phase survives open/close.
      if (overlayRef.current !== "none") return;
      const config = configRef.current ?? BASE_CONFIG;
      setRail((prev) => stepContinuousPhase(prev, config, now, dt));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---- wheel: fractional target accumulation on the same phase ----
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const handleWheel = (event: WheelEvent) => {
      if (overlayRef.current !== "none") return;
      event.preventDefault();
      const factor = event.deltaMode === 1 ? 33 : 1;
      const delta = event.deltaY * factor;
      setRail((prev) =>
        applyWheel(prev, BASE_CONFIG, { delta, nowMs: performance.now() }),
      );
    };
    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, []);

  // ---- pointer lifecycle: shared fractional phase + tap-vs-drag ownership ----
  const onStagePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (overlayRef.current !== "none") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    suppressClickRef.current = false;
    setRail((prev) =>
      beginGesture(
        prev,
        BASE_CONFIG,
        {
          pointerId: event.pointerId,
          startX: event.clientX,
          nowMs: performance.now(),
          channel: event.pointerType === "touch" ? "touch" : "drag",
        },
      ),
    );
    // Pointer capture is NOT claimed on down: a short tap on a rail node or
    // sculpture button must still behave as a click. Capture is engaged only
    // once the movement threshold is crossed (see gesture transition effect).
  }, []);

  // Engage pointer capture exactly on the armed -> dragging transition.
  const prevGestureRef = useRef(rail.gesture);
  useEffect(() => {
    const prev = prevGestureRef.current;
    prevGestureRef.current = rail.gesture;
    if (rail.gesture === "dragging" && prev !== "dragging" && stageRef.current && rail.drag) {
      try {
        stageRef.current.setPointerCapture(rail.drag.pointerId);
      } catch {
        // capture unavailable in this environment — drag still works via bubbling
      }
    }
  }, [rail.gesture, rail.drag]);

  const onStagePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    setRail((prev) => {
      if (!prev.drag || prev.drag.pointerId !== event.pointerId) return prev;
      const next = moveGesture(
        prev,
        BASE_CONFIG,
        { pointerId: event.pointerId, x: event.clientX, nowMs: performance.now() },
      );
      if (next.gesture === "dragging" && prev.gesture !== "dragging") {
        suppressClickRef.current = true;
      }
      return next;
    });
  }, []);

  const onStagePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    setRail((prev) => {
      if (!prev.drag || prev.drag.pointerId !== event.pointerId) return prev;
      const { state, outcome } = endGesture(prev, BASE_CONFIG, {
        pointerId: event.pointerId,
        nowMs: performance.now(),
      });
      if (outcome === "fling") suppressClickRef.current = true;
      return state;
    });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onStagePointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    // pointercancel / lostpointercapture: cleanup only.
    // Never selects, never opens the viewer, never commits a target.
    let hadActiveDrag = false;
    setRail((prev) => {
      if (!prev.drag || prev.drag.pointerId !== event.pointerId) return prev;
      hadActiveDrag = true;
      return cancelGesture(prev, {
        pointerId: event.pointerId,
        nowMs: performance.now(),
      }).state;
    });
    if (hadActiveDrag) suppressClickRef.current = true;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onStageClickCapture = useCallback(
    (event: { stopPropagation: () => void; preventDefault: () => void }) => {
      // A release that followed a real drag must never be treated as a click:
      // stop it here so rail nodes / the active sculpture never select or open.
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        event.stopPropagation();
        event.preventDefault();
      }
    },
    [],
  );

  // ---- same-controller travel for rail nodes and keyboard ----
  const travelToScene = useCallback((scene: number) => {
    if (overlayRef.current !== "none") return;
    setRail((prev) => selectScene(prev, BASE_CONFIG, { scene, nowMs: performance.now() }));
  }, []);

  const onStageKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        travelToScene(activeIndex + 1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        travelToScene(activeIndex - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        travelToScene(0);
      } else if (event.key === "End") {
        event.preventDefault();
        travelToScene(TRACK62_V11_SCENE_COUNT - 1);
      }
    },
    [activeIndex, travelToScene],
  );

  // ---- dialog open/close: focus entry, trigger record, Escape, restore ----
  const openOverlay = useCallback((next: Track62Overlay) => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    triggerRef.current = trigger;
    setOverlay(next);
    if (next === "viewer") {
      setRevealState("poster");
    }
    // Phase preservation: opening is presentation-only — zero transport input.
    setRail((prev) => overlayOpened(prev));
  }, []);

  const closeOverlay = useCallback(() => {
    const closing = overlayRef.current;
    setOverlay("none");
    if (closing === "none") return;
    requestAnimationFrame(() => {
      const restored = restoreDialogFocus({
        trigger: triggerRef.current,
        dialogOpen: overlayRef.current !== "none",
        fallback: stageRef.current,
      });
      if (!restored) stageRef.current?.focus();
    });
  }, []);

  // Deterministic focus entry + Tab/Shift+Tab containment + Escape.
  useEffect(() => {
    if (overlay === "none") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    enterDialogFocus(dialog);

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeOverlay();
        return;
      }
      if (event.key !== "Tab") return;
      event.preventDefault();
      const focusables = focusableElements(dialog);
      if (focusables.length === 0) return;
      const index = focusables.indexOf(document.activeElement as HTMLElement);
      const nextIndex = wrapFocusIndex(focusables.length, index, event.shiftKey ? -1 : 1);
      focusables[nextIndex]!.focus();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [overlay, closeOverlay]);

  // ---- derived render data: everything from ONE phase ----
  const sceneOffsets = MOMENTS.map((_, index) => sceneProjectionOffset(rail, index));

  const dialogOpen = overlay !== "none";
  const savedCount = saveState.savedMomentIds.length;
  const activeSaved = saveState.savedMomentIds.includes(activeMoment.id);

  return (
    <div className="t62-root" data-motion-policy={rail.motionPolicy} data-phase={rail.phase.toFixed(4)}>
      <div className={dialogOpen ? "t62-page t62-page--inert" : "t62-page"} inert={dialogOpen}>
        <header className="t62-header">
          <div>
            <Link className="t62-back" href="/design-lab">← Design Lab</Link>
            <p className="t62-eyebrow">TRACK 62 · V1.1 · CONTINUOUS EXHIBITION RAIL — CAPABILITY PROOF</p>
            <h1 className="t62-title">기억조각상 원형레일전시</h1>
            <p className="t62-subtitle">
              한 장의 원형 레일 위로 순간 조각상이 연속으로 지나갑니다. 휠·드래그·탭 모두 하나의 연속 위상을 공유합니다.
            </p>
          </div>
          <div className="t62-header__controls">
            <p
              className="t62-phase-readout"
              data-phase-readout={rail.phase.toFixed(4)}
              aria-hidden="true"
            >
              phase {rail.phase.toFixed(4)} · mode {rail.mode} · scene {activeIndex + 1}/{TRACK62_V11_SCENE_COUNT}
            </p>
            <button type="button" className="t62-menu-button" onClick={() => openOverlay("menu")}>
              MENU
            </button>
          </div>
        </header>

        <section
          ref={stageRef}
          className="t62-stage"
          data-stage
          data-active-scene={activeIndex}
          data-gesture={rail.gesture}
          data-mode={rail.mode}
          tabIndex={0}
          role="region"
          aria-roledescription="continuous exhibition rail"
          aria-label={`연속 레일 전시 — ${activeMoment.railNumber}번째 순간 ${activeMoment.title}`}
          onKeyDown={onStageKeyDown}
          onPointerDown={onStagePointerDown}
          onPointerMove={onStagePointerMove}
          onPointerUp={onStagePointerUp}
          onPointerCancel={onStagePointerCancel}
          onLostPointerCapture={onStagePointerCancel}
          onClickCapture={onStageClickCapture}
        >
          <div
            className="t62-terrain t62-terrain--back"
            style={{ "--rail-phase": rail.phase } as CSSProperties}
            aria-hidden="true"
          />
          <div
            className="t62-terrain t62-terrain--front"
            style={{ "--rail-phase": rail.phase } as CSSProperties}
            aria-hidden="true"
          />

          <div className="t62-scenes" aria-hidden="false">
            {MOMENTS.map((moment, index) => {
              const offset = sceneOffsets[index]!;
              const proximity = Math.max(0, 1 - Math.abs(offset) * 0.28);
              const scale = 0.5 + proximity * 0.5;
              const isActive = index === activeIndex;
              return (
                <div
                  key={moment.id}
                  className={isActive ? "t62-scene t62-scene--active" : "t62-scene"}
                  data-scene-index={index}
                  data-offset={offset.toFixed(4)}
                  style={
                    {
                      "--scene-offset": offset,
                      "--scene-scale": scale,
                    } as CSSProperties
                  }
                >
                  {isActive ? (
                    <button
                      type="button"
                      className="t62-sculpture t62-sculpture--active t62-ambient"
                      data-sculpture-active={moment.id}
                      aria-label={`순간 ${moment.railNumber} ${moment.title} 미디어 뷰어 열기`}
                      onClick={() => {
                        if (suppressClickRef.current) return;
                        openOverlay("viewer");
                      }}
                    >
                      <SculptureFigure index={index} poseCount={MOMENTS.length} />
                    </button>
                  ) : (
                    <div className="t62-sculpture t62-ambient" data-sculpture-near={moment.id} aria-hidden="true">
                      <SculptureFigure index={index} poseCount={MOMENTS.length} />
                    </div>
                  )}
                  <p className="t62-scene-railno" aria-hidden="true">{moment.railNumber}</p>
                </div>
              );
            })}
          </div>

          <div className="t62-active-copy" data-active-copy>
            <p className="t62-active-copy__railno">{activeMoment.railNumber}</p>
            <h2 className="t62-active-copy__title" data-title={activeMoment.id}>{activeMoment.title}</h2>
            <p className="t62-active-copy__note" data-note={activeMoment.id}>{activeMoment.note}</p>
            <p className="t62-active-copy__whynext" data-whynext={activeMoment.id}>{activeMoment.whyNext}</p>
            <div className="t62-active-copy__cta">
              <button
                type="button"
                className="t62-cta"
                data-open-viewer={activeMoment.id}
                onClick={() => openOverlay("viewer")}
              >
                MEDIA VIEWER 열기
              </button>
            </div>
          </div>

          <nav className="t62-rail" aria-label="전시 레일 — 순간 선택">
            <div className="t62-rail__arc" aria-hidden="true" />
            {MOMENTS.map((moment, index) => {
              const offset = sceneOffsets[index]!;
              const lift = Math.min(14, offset * offset * 4.5);
              return (
                <button
                  key={moment.id}
                  type="button"
                  className={index === activeIndex ? "t62-rail__node t62-rail__node--active" : "t62-rail__node"}
                  data-scene-node={index}
                  data-node-moment={moment.id}
                  aria-current={index === activeIndex ? "true" : undefined}
                  aria-pressed={index === activeIndex}
                  aria-label={`${moment.railNumber} ${moment.title}으로 이동`}
                  style={{ "--node-offset": offset, "--node-lift": lift } as CSSProperties}
                  onClick={() => travelToScene(index)}
                >
                  <span className="t62-rail__node-label" aria-hidden="true">{moment.railNumber}</span>
                </button>
              );
            })}
          </nav>
        </section>

        <p className="t62-live" aria-live="polite" data-live-status>
          {activeMoment.railNumber}번째 순간: {activeMoment.title}. {activeMoment.note}
        </p>

        <footer className="t62-footer" data-footer>
          <dl className="t62-provenance">
            <div><dt>source</dt><dd>{TRACK62_V11_SOURCE.sourceLabel}</dd></div>
            <div><dt>sha256</dt><dd>{TRACK62_V11_SOURCE.sha256}</dd></div>
            <div><dt>bytes</dt><dd>{TRACK62_V11_SOURCE.bytes.toLocaleString("ko-KR")}</dd></div>
          </dl>
          <p className="t62-holds" data-boundary-holds>
            LINEAGE_62_RESERVATION=HOLD · CANONICAL_V4_ADOPTION=NO · source assets SOURCE_REFERENCE_ONLY ·
            production media PRODUCTION_MEDIA_HOLD · MY TREE native handoff HOLD (internal summary only) ·
            SAVE = prototype state only
          </p>
        </footer>
      </div>

      {overlay === "viewer" && (
        <div className="t62-overlay" data-overlay="viewer">
          <div className="t62-overlay__scrim" aria-hidden="true" onClick={closeOverlay} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="t62-viewer-title"
            className="t62-dialog t62-dialog--viewer"
            data-media-authority={activeMoment.mediaAuthority}
            data-viewer-open
            data-viewer-moment={activeMoment.id}
          >
            <header className="t62-dialog__header">
              <div>
                <p className="t62-dialog__eyebrow">MOMENT MEDIA VIEWER · DEMO PREVIEW</p>
                <h2 id="t62-viewer-title">{activeMoment.railNumber} — {activeMoment.title}</h2>
              </div>
              <button type="button" className="t62-dialog__close" data-close-viewer onClick={closeOverlay} aria-label="뷰어 닫기">✕</button>
            </header>

            <div role="tablist" aria-label="뷰어 탭" className="t62-tabs">
              {TRACK62_VIEWER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`t62-tab-${tab.id}`}
                  aria-selected={viewerTab === tab.id}
                  aria-controls={`t62-tabpanel-${tab.id}`}
                  className={viewerTab === tab.id ? "t62-tab t62-tab--active" : "t62-tab"}
                  data-tab={tab.id}
                  onClick={() => setViewerTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {viewerTab === "VIEW" && (
              <div role="tabpanel" id="t62-tabpanel-VIEW" aria-labelledby="t62-tab-VIEW" className="t62-tabpanel">
                <div className="t62-viewer-media" data-reveal-state={revealState}>
                  <SculptureFigure index={activeIndex} poseCount={MOMENTS.length} />
                  {revealState !== "poster" && (
                    <p className="t62-viewer-reveal" data-reveal>
                      {revealState === "revealing" ? "리빌 시뮬레이션 중… (demo)" : "리빌 완료 (demo preview)"}
                    </p>
                  )}
                </div>
                <div className="t62-viewer-copy">
                  <p className="t62-viewer-note">{activeMoment.note}</p>
                  <p className="t62-viewer-whynext">{activeMoment.whyNext}</p>
                  <div className="t62-viewer-actions">
                    <button
                      type="button"
                      className="t62-cta"
                      data-play-reveal
                      onClick={() => setRevealState((prev) => (prev === "poster" ? "revealing" : "done-demo"))}
                    >
                      {revealState === "poster" ? "PLAY / reveal" : "reveal 다시 보기"}
                    </button>
                    <button
                      type="button"
                      className={activeSaved ? "t62-cta t62-cta--saved" : "t62-cta"}
                      data-save-moment
                      data-save-state={activeSaved ? "saved" : "unsaved"}
                      onClick={() =>
                        setSavedIds((prev) =>
                          prev.includes(activeMoment.id) ? prev : [...prev, activeMoment.id],
                        )
                      }
                    >
                      {activeSaved ? "SAVE 완료 (prototype)" : "SAVE (prototype)"}
                    </button>
                  </div>
                  <p className="t62-viewer-media-note">
                    프로덕션 미디어 없음 — DEMO_PREVIEW 상태만 표시합니다. (PRODUCTION_MEDIA_HOLD)
                  </p>
                </div>
              </div>
            )}

            {viewerTab === "SCULPTURES" && (
              <div role="tabpanel" id="t62-tabpanel-SCULPTURES" aria-labelledby="t62-tab-SCULPTURES" className="t62-tabpanel">
                <ul className="t62-viewer-grid">
                  {MOMENTS.map((moment, index) => (
                    <li
                      key={moment.id}
                      className={moment.id === activeMoment.id ? "t62-viewer-grid__item t62-viewer-grid__item--current" : "t62-viewer-grid__item"}
                      data-grid-moment={moment.id}
                    >
                      <p className="t62-viewer-grid__railno">{moment.railNumber}</p>
                      <p className="t62-viewer-grid__title">{moment.title}</p>
                      {moment.id === activeMoment.id && <p className="t62-viewer-grid__chip">지금 레일 위</p>}
                      <p className="t62-viewer-grid__status" data-grid-status={saveState.savedMomentIds.includes(moment.id) ? "saved" : "live"}>
                        {saveState.savedMomentIds.includes(moment.id) ? "SAVED" : `${index === activeIndex ? "ACTIVE" : "live"}`}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {viewerTab === "MEMORY FILMS" && (
              <div role="tabpanel" id="t62-tabpanel-MEMORY FILMS" aria-labelledby="t62-tab-MEMORY FILMS" className="t62-tabpanel">
                <ul className="t62-viewer-films">
                  {MOMENTS.map((moment) => (
                    <li key={moment.id} className="t62-viewer-films__item" data-film-moment={moment.id} data-film-authority="MEDIA_REFERENCE_ONLY">
                      <span className="t62-viewer-films__frame" aria-hidden="true">▸</span>
                      <div>
                        <p className="t62-viewer-films__title">{moment.railNumber} · {moment.title}</p>
                        <p className="t62-viewer-films__state">film projection reference — production media HOLD</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {viewerTab === "JOURNAL" && (
              <div role="tabpanel" id="t62-tabpanel-JOURNAL" aria-labelledby="t62-tab-JOURNAL" className="t62-tabpanel">
                <ol className="t62-journal" data-journal>
                  {model.journal.map((entry) => {
                    const journalMoment = MOMENTS[entry.sceneIndex]!;
                    return (
                      <li
                        key={entry.momentId}
                        className={journalMoment.id === activeMoment.id ? "t62-journal__entry t62-journal__entry--current" : "t62-journal__entry"}
                        data-journal-entry={entry.momentId}
                      >
                        <p className="t62-journal__railno">{journalMoment.railNumber}</p>
                        <p className="t62-journal__title">{journalMoment.title}</p>
                        <p className="t62-journal__note">{journalMoment.note}</p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {overlay === "menu" && (
        <div className="t62-overlay" data-overlay="menu">
          <div className="t62-overlay__scrim" aria-hidden="true" onClick={closeOverlay} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="t62-menu-title"
            className="t62-dialog t62-dialog--menu"
            data-menu-open
          >
            <header className="t62-dialog__header">
              <h2 id="t62-menu-title">전시 메뉴</h2>
              <button type="button" className="t62-dialog__close" data-close-menu onClick={closeOverlay} aria-label="메뉴 닫기">✕</button>
            </header>
            <ul className="t62-menu-list">
              <li>
                <button type="button" className="t62-menu-item" data-menu-viewer
                  onClick={() => { setViewerTab("VIEW"); openOverlay("viewer"); }}>
                  MEDIA VIEWER — 현재 순간 {activeMoment.railNumber} {activeMoment.title}
                </button>
              </li>
              <li>
                <button type="button" className="t62-menu-item" data-menu-sculptures
                  onClick={() => { setViewerTab("SCULPTURES"); openOverlay("viewer"); }}>
                  SCULPTURES — 조각상 {TRACK62_V11_SCENE_COUNT}점
                </button>
              </li>
              <li>
                <button type="button" className="t62-menu-item" data-menu-films
                  onClick={() => { setViewerTab("MEMORY FILMS"); openOverlay("viewer"); }}>
                  MEMORY FILMS — 참고 프로젝션
                </button>
              </li>
              <li>
                <button type="button" className="t62-menu-item" data-menu-journal
                  onClick={() => { setViewerTab("JOURNAL"); openOverlay("viewer"); }}>
                  JOURNAL — 이어진 순간 기록
                </button>
              </li>
              <li>
                <button type="button" className="t62-menu-item" data-menu-mytree onClick={() => openOverlay("mytree")}>
                  MY TREE 보기 — 경로 요약 (native handoff HOLD)
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}

      {overlay === "mytree" && (
        <div className="t62-overlay" data-overlay="mytree">
          <div className="t62-overlay__scrim" aria-hidden="true" onClick={closeOverlay} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="t62-mytree-title"
            className="t62-dialog t62-dialog--mytree"
            data-mytree-open
            data-mytree-handoff="HOLD"
          >
            <header className="t62-dialog__header">
              <h2 id="t62-mytree-title">MY TREE — 전시 경로 요약</h2>
              <button type="button" className="t62-dialog__close" data-close-mytree onClick={closeOverlay} aria-label="마이 트리 요약 닫기">✕</button>
            </header>
            <p className="t62-mytree-notice" data-mytree-notice>
              이 보기는 내부 전시 경로 요약입니다. 네이티브 MY TREE 경로(/v4, /my-tree 등) 연동은 별도 승인 전까지 HOLD 상태를
              유지하며, 외부 링크나 가짜 경로를 만들지 않습니다.
            </p>
            <dl className="t62-mytree-summary">
              <div>
                <dt>이어진 순간</dt>
                <dd data-mytree-moments>{model.journal.length}개 — {model.journal.map((entry) => MOMENTS[entry.sceneIndex]!.title).join(" → ")}</dd>
              </div>
              <div>
                <dt>현재 위상</dt>
                <dd>{rail.phase.toFixed(2)} / {TRACK62_V11_SCENE_COUNT - 1}</dd>
              </div>
              <div>
                <dt>SAVE 상태</dt>
                <dd>{savedCount}개 순간 prototype 저장됨</dd>
              </div>
              <div>
                <dt>handoff</dt>
                <dd>MY_TREE_NATIVE_HANDOFF = HOLD</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
