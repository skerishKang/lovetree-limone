"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  MOMENT_ORBIT_AUTOPLAY_MS,
  MOMENT_ORBIT_CANDIDATE_MOMENTS,
  MOMENT_ORBIT_CLICK_SLOP_PX,
  MOMENT_ORBIT_DRAG_PX_PER_STEP,
  MOMENT_ORBIT_SOURCE_PROVENANCE,
  canonicalSnap,
  nearestEquivalentMomentPosition,
  projectMomentOnOrbit,
  stepMomentIndex,
  type MomentOrbitAxis,
  type MomentOrbitViewport,
} from "@/lib/moment-orbit-carousel-capability";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function useOrbitViewport(): MomentOrbitViewport {
  const [viewport, setViewport] = useState<MomentOrbitViewport>("desktop");

  useEffect(() => {
    const update = () => setViewport(window.innerWidth < 760 ? "mobile" : "desktop");
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return viewport;
}

export default function MomentOrbitCarouselCandidate() {
  const reducedMotion = useReducedMotion();
  const viewport = useOrbitViewport();
  const count = MOMENT_ORBIT_CANDIDATE_MOMENTS.length;
  const [axis, setAxis] = useState<MomentOrbitAxis>("horizontal");
  const [position, setPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [autoPreference, setAutoPreference] = useState<boolean | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [interactionEpoch, setInteractionEpoch] = useState(0);

  const auto = autoPreference ?? !reducedMotion;
  const stageRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const inspectorCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const shelfRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<{
    id: number;
    startCoordinate: number;
    startPosition: number;
    latestPosition: number;
  } | null>(null);

  const selectedMoment = MOMENT_ORBIT_CANDIDATE_MOMENTS[selectedIndex];

  const manualSelect = useCallback((index: number) => {
    setSelectedIndex(index);
    setPosition((current) => nearestEquivalentMomentPosition(current, index, count));
    setSoundOn(false);
    setInteractionEpoch((value) => value + 1);
  }, [count]);

  const stepSelection = useCallback((delta: number) => {
    setSelectedIndex((currentIndex) => {
      const next = stepMomentIndex(currentIndex, delta, count);
      setPosition((currentPosition) => nearestEquivalentMomentPosition(currentPosition, next, count));
      return next;
    });
    setSoundOn(false);
    setInteractionEpoch((value) => value + 1);
  }, [count]);

  useEffect(() => {
    if (!auto || dragging) return;
    const timer = window.setTimeout(() => stepSelection(1), MOMENT_ORBIT_AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [auto, dragging, interactionEpoch, selectedIndex, stepSelection]);

  useEffect(() => {
    shelfRefs.current[selectedIndex]?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [reducedMotion, selectedIndex]);

  const closeInspector = useCallback(() => {
    setInspectorOpen(false);
    window.setTimeout(() => previousFocusRef.current?.focus(), 0);
  }, []);

  const openInspector = useCallback(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setInspectorOpen(true);
  }, []);

  useEffect(() => {
    if (!inspectorOpen || viewport !== "mobile") return;
    const panel = inspectorRef.current;
    if (!panel) return;

    window.requestAnimationFrame(() => inspectorCloseRef.current?.focus());

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeInspector();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeInspector, inspectorOpen, viewport]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        stepSelection(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        stepSelection(-1);
      } else if (event.key === "Escape" && inspectorOpen) {
        event.preventDefault();
        closeInspector();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeInspector, inspectorOpen, stepSelection]);

  function coordinate(event: ReactPointerEvent<HTMLDivElement>) {
    return axis === "horizontal" ? event.clientX : event.clientY;
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const startCoordinate = coordinate(event);
    dragRef.current = {
      id: event.pointerId,
      startCoordinate,
      startPosition: position,
      latestPosition: position,
    };
    suppressClickRef.current = false;
    setDragging(true);
    setInteractionEpoch((value) => value + 1);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const delta = coordinate(event) - drag.startCoordinate;
    const nextPosition = drag.startPosition - delta / MOMENT_ORBIT_DRAG_PX_PER_STEP;
    drag.latestPosition = nextPosition;
    if (Math.abs(delta) > MOMENT_ORBIT_CLICK_SLOP_PX) suppressClickRef.current = true;
    setPosition(nextPosition);
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const snapped = canonicalSnap(drag.latestPosition, count);
    dragRef.current = null;
    setDragging(false);
    setPosition(snapped.position);
    setSelectedIndex(snapped.index);
    setSoundOn(false);
    setInteractionEpoch((value) => value + 1);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function wheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    stepSelection(event.deltaY > 0 ? 1 : -1);
  }

  function selectCard(index: number) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    manualSelect(index);
  }

  function toggleAxis() {
    const nextAxis: MomentOrbitAxis = axis === "horizontal" ? "vertical" : "horizontal";
    setAxis(nextAxis);
    setPosition((current) => nearestEquivalentMomentPosition(current, selectedIndex, count));
    setInteractionEpoch((value) => value + 1);
  }

  const cardStyles = useMemo(() => MOMENT_ORBIT_CANDIDATE_MOMENTS.map((_, index) => {
    const projection = projectMomentOnOrbit(index, position, count, axis, viewport);
    return {
      transform: `translate(-50%, -50%) translate3d(${projection.x.toFixed(2)}px, ${projection.y.toFixed(2)}px, ${projection.z.toFixed(2)}px) rotateX(${projection.rotateX.toFixed(2)}deg) rotateY(${projection.rotateY.toFixed(2)}deg) scale(${projection.scale.toFixed(4)})`,
      opacity: projection.opacity,
      filter: `brightness(${projection.brightness.toFixed(3)}) saturate(${projection.saturation.toFixed(3)}) blur(${projection.blur.toFixed(2)}px)`,
      zIndex: 1000 + Math.round(projection.z),
      transition: reducedMotion || dragging ? "none" : undefined,
    } satisfies CSSProperties;
  }), [axis, count, dragging, position, reducedMotion, viewport]);

  return (
    <main
      className="lt-moc"
      data-axis={axis}
      data-autoplay={auto ? "on" : "off"}
      data-dragging={dragging ? "true" : "false"}
      data-reduced-motion={reducedMotion ? "reduce" : "no-preference"}
      data-selected-index={selectedIndex}
    >
      <header className="lt-moc__header">
        <div>
          <Link className="lt-moc__back" href="/design-lab">← Design Lab</Link>
          <p className="lt-moc__eyebrow">INTERNAL CAPABILITY CANDIDATE · NOT PRODUCT-ADOPTED</p>
          <h1>Moment Orbit Carousel</h1>
          <p className="lt-moc__lede">
            기존 V4 Orbit을 교체하지 않고, center snap · mixed media · shelf/inspector synchronization · interruptible autoplay만 분리 검증합니다.
          </p>
        </div>
        <div className="lt-moc__provenance" aria-label="Source provenance">
          <span>CAPABILITY / PARTIAL IMPLEMENT</span>
          <code>{MOMENT_ORBIT_SOURCE_PROVENANCE.sourceHtmlSha256.slice(0, 16)}…</code>
          <Link href={MOMENT_ORBIT_SOURCE_PROVENANCE.canonicalComparisonRoute}>현재 V4 Orbit 비교 →</Link>
        </div>
      </header>

      <section className="lt-moc__controls" aria-label="Orbit controls">
        <button type="button" onClick={toggleAxis} aria-pressed={axis === "vertical"}>
          AXIS · {axis === "horizontal" ? "HORIZONTAL" : "VERTICAL"}
        </button>
        <button
          type="button"
          onClick={() => setAutoPreference((current) => !(current ?? !reducedMotion))}
          aria-pressed={auto}
        >
          AUTO · {auto ? "ON" : "OFF"}
        </button>
        <span className="lt-moc__policy">
          {reducedMotion && autoPreference === null
            ? "Reduced motion: autoplay defaults off; manual selection remains complete."
            : `Manual input resets the autoplay clock; next advance occurs after ${MOMENT_ORBIT_AUTOPLAY_MS / 1000}s.`}
        </span>
        <button className="lt-moc__mobile-detail-button" type="button" onClick={openInspector}>
          SELECTED MOMENT · {String(selectedIndex + 1).padStart(2, "0")}
        </button>
      </section>

      <div className="lt-moc__workspace">
        <section className="lt-moc__stage-panel" aria-label="Moment orbit carousel candidate">
          <div className="lt-moc__stage-meta">
            <div>
              <small>CENTER-SNAPPING ORBIT</small>
              <strong>{selectedMoment.label}</strong>
            </div>
            <span>{String(selectedIndex + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span>
          </div>

          <div
            ref={stageRef}
            className={`lt-moc__orbit-stage${dragging ? " is-dragging" : ""}`}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
            onWheel={wheel}
            tabIndex={0}
            aria-label="Drag or swipe the Moment orbit. Wheel and arrow keys move between Moments."
          >
            <div className="lt-moc__orbit-ring" aria-hidden="true" />
            <div className="lt-moc__center-mark" aria-hidden="true" />
            {MOMENT_ORBIT_CANDIDATE_MOMENTS.map((moment, index) => (
              <button
                key={moment.id}
                className={`lt-moc__card${index === selectedIndex ? " is-selected" : ""}`}
                style={cardStyles[index]}
                type="button"
                aria-pressed={index === selectedIndex}
                aria-label={`Select ${moment.label}, ${moment.mediaType}`}
                data-media-type={moment.mediaType}
                data-moment-index={index}
                onClick={() => selectCard(index)}
              >
                <div className="lt-moc__card-media">
                  <img src={moment.poster} alt="" draggable={false} />
                  <span>{moment.mediaType === "video" ? "VIDEO" : "PHOTO"}</span>
                </div>
                <div className="lt-moc__card-copy">
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  <strong>{moment.label}</strong>
                  <em>{moment.mediaType.toUpperCase()} MOMENT</em>
                </div>
              </button>
            ))}
          </div>

          <p className="lt-moc__gesture-guide">DRAG / SWIPE · SNAP &nbsp; · &nbsp; WHEEL · STEP &nbsp; · &nbsp; ARROWS · STEP &nbsp; · &nbsp; CLICK · SELECT</p>

          <div className="lt-moc__shelf" aria-label="Direct Moment selection shelf">
            {MOMENT_ORBIT_CANDIDATE_MOMENTS.map((moment, index) => (
              <button
                ref={(node) => { shelfRefs.current[index] = node; }}
                className={index === selectedIndex ? "is-selected" : ""}
                type="button"
                key={moment.id}
                aria-pressed={index === selectedIndex}
                onClick={() => manualSelect(index)}
                data-shelf-index={index}
              >
                <img src={moment.poster} alt="" draggable={false} />
                <span>{String(index + 1).padStart(2, "0")}</span>
                <small>{moment.mediaType === "video" ? "▶" : "▧"}</small>
              </button>
            ))}
          </div>
        </section>

        <button
          className={`lt-moc__backdrop${inspectorOpen ? " is-open" : ""}`}
          type="button"
          aria-label="Close selected Moment inspector"
          tabIndex={inspectorOpen ? 0 : -1}
          onClick={closeInspector}
        />

        <aside
          ref={inspectorRef}
          className={`lt-moc__inspector${inspectorOpen ? " is-open" : ""}`}
          role={viewport === "mobile" ? "dialog" : undefined}
          aria-modal={viewport === "mobile" && inspectorOpen ? true : undefined}
          aria-label="Selected Moment inspector"
          aria-live="polite"
          data-selected-id={selectedMoment.id}
          data-media-type={selectedMoment.mediaType}
          data-audio-authority={selectedMoment.mediaType === "video" ? (soundOn ? "selected-unmuted" : "selected-muted") : "none"}
        >
          <div className="lt-moc__inspector-head">
            <div>
              <small>SELECTED MOMENT</small>
              <strong>{selectedMoment.label}</strong>
            </div>
            <button ref={inspectorCloseRef} className="lt-moc__inspector-close" type="button" onClick={closeInspector}>CLOSE</button>
          </div>

          <div className="lt-moc__inspector-media">
            {selectedMoment.mediaType === "video" ? (
              <video
                key={`${selectedMoment.id}:${soundOn ? "sound" : "muted"}`}
                poster={selectedMoment.poster}
                muted={!soundOn}
                playsInline
                preload="none"
                aria-label={`${selectedMoment.label} video media stub`}
                data-selected-video="true"
              />
            ) : (
              <img src={selectedMoment.poster} alt={`${selectedMoment.label} photo media stub`} />
            )}
            <span>{selectedMoment.mediaType.toUpperCase()} · INTERNAL MEDIA STUB</span>
          </div>

          <dl className="lt-moc__inspector-facts">
            <div><dt>Canonical Moment</dt><dd>{String(selectedIndex + 1).padStart(2, "0")}</dd></div>
            <div><dt>Media</dt><dd>{selectedMoment.mediaType.toUpperCase()}</dd></div>
            <div><dt>Axis</dt><dd>{axis.toUpperCase()}</dd></div>
            <div><dt>Autoplay</dt><dd>{auto ? `${MOMENT_ORBIT_AUTOPLAY_MS / 1000}s RESET POLICY` : "OFF"}</dd></div>
          </dl>

          <p className="lt-moc__inspector-note">
            Source demo identity, counts, emotion/date/branch values and fake save behavior are intentionally absent. Source media binaries and benchmark video are not loaded by this candidate.
          </p>

          <button
            className="lt-moc__sound"
            type="button"
            disabled={selectedMoment.mediaType !== "video"}
            aria-pressed={soundOn}
            onClick={() => setSoundOn((value) => !value)}
          >
            {selectedMoment.mediaType === "video" ? `SELECTED MEDIA SOUND · ${soundOn ? "ON" : "OFF"}` : "PHOTO · NO AUDIO"}
          </button>
        </aside>
      </div>
    </main>
  );
}
