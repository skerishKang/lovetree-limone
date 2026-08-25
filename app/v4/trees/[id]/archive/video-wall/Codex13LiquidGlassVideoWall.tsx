"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import type { AlbumMomentView } from "@/lib/moment-model";
import { useTreeMoments } from "@/lib/use-tree-moments";
import {
  CODEX13_DESKTOP_ACTIVE_VIDEO_LIMIT,
  CODEX13_MOBILE_ACTIVE_VIDEO_LIMIT,
  codex13ActiveDirectVideoSlots,
  codex13BuildWallCells,
  codex13MediaKind,
  codex13NearestCell,
  codex13PositionCells,
  codex13YouTubeEmbedUrl,
  codex13VisualMoments,
} from "@/lib/source-codex-13/liquid-glass-video-wall";
import styles from "./codex13-liquid-glass-video-wall.module.css";

function dateLabel(moment: AlbumMomentView) {
  const value = moment.discoveryDate || moment.timestamp;
  if (!value) return "DATE OPEN";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed);
}

function InspectorMedia({ moment }: { moment: AlbumMomentView }) {
  const kind = codex13MediaKind(moment.sourceType, moment.sourceUrl, moment.thumbnail);
  const youtube = codex13YouTubeEmbedUrl(moment.sourceUrl);

  if (kind === "youtube" && youtube) {
    return (
      <iframe
        className={styles.inspectorFrame}
        src={youtube}
        title={`${moment.title || "기억"} 영상`}
        allow="accelerometer; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  if (kind === "direct-video" && moment.sourceUrl) {
    return (
      <video
        className={styles.inspectorMedia}
        src={moment.sourceUrl}
        poster={moment.thumbnail || undefined}
        controls
        playsInline
        preload="metadata"
      />
    );
  }
  if (moment.thumbnail || (kind === "image" && moment.sourceUrl)) {
    return (
      <img
        className={styles.inspectorMedia}
        src={kind === "image" && moment.sourceUrl ? moment.sourceUrl : moment.thumbnail}
        alt={moment.title || "기억 미디어"}
      />
    );
  }
  return (
    <div className={styles.inspectorFallback}>
      <span>MEDIA LINK</span>
      <p>이 Moment의 원본은 벽에서 자동 재생하지 않습니다.</p>
    </div>
  );
}

export default function Codex13LiquidGlassVideoWall({ treeId }: { treeId: string }) {
  const { tree, albumMoments, loading, error, selectMoment } = useTreeMoments(treeId);
  const [mobile, setMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [phase, setPhase] = useState({ x: 0, y: 0 });
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorMomentId, setInspectorMomentId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inspectorTriggerRef = useRef<HTMLElement | null>(null);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, moved: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);

  const visualMoments = useMemo(() => codex13VisualMoments(albumMoments), [albumMoments]);
  const cells = useMemo(() => codex13BuildWallCells(visualMoments, mobile), [mobile, visualMoments]);
  const positioned = useMemo(
    () => codex13PositionCells(cells, phase.x, phase.y, mobile),
    [cells, mobile, phase.x, phase.y],
  );
  const activeVideoSlots = useMemo(
    () => new Set(codex13ActiveDirectVideoSlots(positioned, mobile, inspectorOpen)),
    [inspectorOpen, mobile, positioned],
  );
  const nearest = useMemo(() => codex13NearestCell(positioned), [positioned]);
  const inspectorMoment = useMemo(
    () => visualMoments.find((moment) => moment.id === inspectorMomentId) ?? null,
    [inspectorMomentId, visualMoments],
  );

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 760px)");
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setMobile(mobileQuery.matches);
      setReducedMotion(reducedQuery.matches);
      if (reducedQuery.matches) velocityRef.current = { x: 0, y: 0 };
    };
    sync();
    mobileQuery.addEventListener("change", sync);
    reducedQuery.addEventListener("change", sync);
    return () => {
      mobileQuery.removeEventListener("change", sync);
      reducedQuery.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || inspectorOpen || cells.length === 0) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = now - previous;
      if (elapsed >= 32) {
        previous = now;
        if (!draggingRef.current) {
          const velocity = velocityRef.current;
          velocity.x *= 0.91;
          velocity.y *= 0.91;
          if (Math.abs(velocity.x) < 0.04) velocity.x = 0;
          if (Math.abs(velocity.y) < 0.04) velocity.y = 0;
          const ambientX = velocity.x === 0 ? 0.34 : 0;
          const ambientY = velocity.y === 0 ? 0.08 : 0;
          setPhase((current) => ({
            x: current.x + velocity.x + ambientX,
            y: current.y + velocity.y + ambientY,
          }));
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [cells.length, inspectorOpen, reducedMotion]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (inspectorOpen && inspectorMoment && !dialog.open) dialog.showModal();
    if ((!inspectorOpen || !inspectorMoment) && dialog.open) dialog.close();
  }, [inspectorMoment, inspectorOpen]);

  const restoreInspectorFocus = useCallback(() => {
    window.requestAnimationFrame(() => inspectorTriggerRef.current?.focus());
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorOpen(false);
    velocityRef.current = { x: 0, y: 0 };
    restoreInspectorFocus();
  }, [restoreInspectorFocus]);

  const openInspector = useCallback((moment: AlbumMomentView, trigger: HTMLElement) => {
    inspectorTriggerRef.current = trigger;
    velocityRef.current = { x: 0, y: 0 };
    selectMoment(moment.id);
    setInspectorMomentId(moment.id);
    setInspectorOpen(true);
  }, [selectMoment]);

  const moveBy = useCallback((x: number, y: number) => {
    velocityRef.current = { x: 0, y: 0 };
    setPhase((current) => ({ x: current.x + x, y: current.y + y }));
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (inspectorOpen) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    draggingRef.current = false;
    pointerIdRef.current = event.pointerId;
    pointerRef.current = { x: event.clientX, y: event.clientY, moved: 0 };
    velocityRef.current = { x: 0, y: 0 };
  }, [inspectorOpen]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const previous = pointerRef.current;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    previous.x = event.clientX;
    previous.y = event.clientY;
    previous.moved += Math.hypot(dx, dy);

    if (!draggingRef.current && previous.moved < 5) return;
    if (!draggingRef.current) {
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    setPhase((current) => ({ x: current.x + dx, y: current.y + dy }));
    if (!reducedMotion) velocityRef.current = { x: dx * 0.72, y: dy * 0.72 };
  }, [reducedMotion]);

  const finishPointer = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const moved = pointerRef.current.moved;
    const wasDragging = draggingRef.current;
    draggingRef.current = false;
    pointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (wasDragging || moved >= 5) {
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
    if (reducedMotion) velocityRef.current = { x: 0, y: 0 };
  }, [reducedMotion]);

  const onWheel = useCallback((event: ReactWheelEvent<HTMLElement>) => {
    event.preventDefault();
    const x = -event.deltaX - (Math.abs(event.deltaX) < Math.abs(event.deltaY) ? event.deltaY * 0.42 : 0);
    const y = -event.deltaY * 0.36;
    moveBy(x, y);
  }, [moveBy]);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (inspectorOpen) return;
    const target = event.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (["input", "textarea", "select"].includes(tag)) return;
    const strideX = mobile ? 184 : 306;
    const strideY = mobile ? 150 : 214;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveBy(strideX, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveBy(-strideX, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveBy(0, strideY);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveBy(0, -strideY);
    } else if (event.key === "Home") {
      event.preventDefault();
      velocityRef.current = { x: 0, y: 0 };
      setPhase({ x: 0, y: 0 });
    } else if (event.key === "Enter" && nearest) {
      event.preventDefault();
      openInspector(nearest.moment, event.currentTarget);
    }
  }, [inspectorOpen, mobile, moveBy, nearest, openInspector]);

  if (loading) {
    return <main className={styles.state}><p>Liquid Glass Archive를 불러오는 중입니다.</p></main>;
  }
  if (error) {
    return <main className={styles.state}><h1>Liquid Glass Archive</h1><p role="alert">{error}</p><Link href="/v4/subjects">사람 앨범으로 돌아가기</Link></main>;
  }
  if (visualMoments.length === 0) {
    return (
      <main className={styles.state}>
        <h1>{tree?.title || "Liquid Glass Archive"}</h1>
        <p>공간 벽에 배치할 canonical Moment 미디어가 아직 없습니다.</p>
        <Link href="/v4/subjects">사람 앨범으로 돌아가기</Link>
      </main>
    );
  }

  const activeLimit = mobile ? CODEX13_MOBILE_ACTIVE_VIDEO_LIMIT : CODEX13_DESKTOP_ACTIVE_VIDEO_LIMIT;

  return (
    <main
      className={styles.page}
      data-codex13-native="archive-video-wall"
      data-active-video-limit={activeLimit}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <header className={styles.topbar}>
        <Link href="/v4/subjects" className={styles.back}>← PEOPLE</Link>
        <div className={styles.brand}>LoveTree <span>ARCHIVE / VIDEO WALL</span></div>
        <div className={styles.runtime}>LIVE ≤ {activeLimit} · {visualMoments.length} MOMENTS</div>
      </header>

      <section className={styles.intro} aria-labelledby="codex13-title">
        <p>CODEX 13 · LIQUID GLASS</p>
        <h1 id="codex13-title">{tree?.title || "Infinite Memory Field"}</h1>
        <span>Drag · wheel · swipe · arrows to travel · Enter to inspect</span>
      </section>

      <section
        className={styles.viewport}
        aria-label="공간형 비디오 아카이브"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onWheel={onWheel}
      >
        <div className={styles.depthHalo} aria-hidden="true" />
        <div className={styles.wall} aria-hidden="false">
          {positioned.map((cell) => {
            const kind = codex13MediaKind(cell.moment.sourceType, cell.moment.sourceUrl, cell.moment.thumbnail);
            const liveVideo = kind === "direct-video" && activeVideoSlots.has(cell.slot);
            const nearestCell = nearest?.slot === cell.slot;
            const visualStyle = {
              "--codex13-x": `${cell.x}px`,
              "--codex13-y": `${cell.y}px`,
              "--codex13-z": `${cell.z}px`,
              "--codex13-tilt-x": `${Math.max(-6, Math.min(6, -cell.y / 110))}deg`,
              "--codex13-tilt-y": `${Math.max(-8, Math.min(8, cell.x / 120))}deg`,
              "--codex13-alpha": `${Math.max(0.34, Math.min(1, 1.08 - cell.distance * 0.25))}`,
            } as CSSProperties;
            return (
              <button
                type="button"
                key={`${cell.slot}-${cell.moment.id}`}
                className={`${styles.card} ${nearestCell ? styles.nearest : ""}`}
                style={visualStyle}
                data-wall-slot={cell.slot}
                data-media-kind={kind}
                data-live-video={liveVideo ? "true" : "false"}
                tabIndex={nearestCell ? 0 : -1}
                aria-label={`${cell.moment.title || "제목 없는 기억"} 열기`}
                onClick={(event) => {
                  if (suppressClickRef.current) return;
                  openInspector(cell.moment, event.currentTarget);
                }}
              >
                <span className={styles.glassLayer} aria-hidden="true" />
                <span className={styles.mediaLayer}>
                  {liveVideo ? (
                    <video
                      src={cell.moment.sourceUrl}
                      poster={cell.moment.thumbnail || undefined}
                      muted
                      autoPlay
                      loop
                      playsInline
                      preload="metadata"
                    />
                  ) : cell.moment.thumbnail ? (
                    <img src={cell.moment.thumbnail} alt="" draggable={false} />
                  ) : kind === "image" && cell.moment.sourceUrl ? (
                    <img src={cell.moment.sourceUrl} alt="" draggable={false} />
                  ) : (
                    <span className={styles.mediaFallback} aria-hidden="true"><i /> <b>CANONICAL MEDIA</b></span>
                  )}
                </span>
                <span className={styles.cardCopy}>
                  <small>{String((cell.slot % visualMoments.length) + 1).padStart(2, "0")} · {kind.toUpperCase()}</small>
                  <strong>{cell.moment.title || "Untitled Moment"}</strong>
                  <em>{cell.moment.emotionTags[0] || dateLabel(cell.moment)}</em>
                </span>
                <span className={styles.cardEdge} aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <div className={styles.vignette} aria-hidden="true" />
      </section>

      <footer className={styles.footer}>
        <div aria-live="polite">
          <small>NEAREST MOMENT</small>
          <strong>{nearest?.moment.title || "—"}</strong>
        </div>
        <div className={styles.performanceNote}>
          <span>FIXED WALL WINDOW</span>
          <span>DIRECT VIDEO DECODERS ≤ {activeLimit}</span>
          <span>{reducedMotion ? "MOTION REDUCED" : "30 FPS PRESENTATION LOOP"}</span>
        </div>
      </footer>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="codex13-dialog-title"
        onClose={() => {
          setInspectorOpen(false);
          restoreInspectorFocus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeInspector();
        }}
      >
        {inspectorMoment ? (
          <article className={styles.inspector}>
            <button type="button" className={styles.close} onClick={closeInspector} aria-label="기억 닫기">×</button>
            <div className={styles.inspectorVisual}><InspectorMedia moment={inspectorMoment} /></div>
            <div className={styles.inspectorCopy}>
              <small>{dateLabel(inspectorMoment)} · {inspectorMoment.sourceType || "MEDIA"}</small>
              <h2 id="codex13-dialog-title">{inspectorMoment.title || "제목 없는 기억"}</h2>
              <p>{inspectorMoment.memo || "이 Moment에는 아직 메모가 없습니다."}</p>
              <div>{inspectorMoment.emotionTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              {inspectorMoment.sourceUrl ? <a href={inspectorMoment.sourceUrl} target="_blank" rel="noreferrer">원본 미디어 열기 ↗</a> : null}
            </div>
          </article>
        ) : null}
      </dialog>
    </main>
  );
}
