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
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import type { AlbumMomentView } from "@/lib/moment-model";
import { useTreeMoments } from "@/lib/use-tree-moments";
import {
  codex14AdjacentMomentId,
  codex14DateLabel,
  codex14DeckSlots,
  codex14MediaKind,
  codex14ResolveIndex,
  codex14YouTubeEmbedUrl,
} from "@/lib/codex14/rotating-memory-index";
import styles from "./rotating-memory-index.module.css";

function MomentMedia({ moment }: { moment: AlbumMomentView }) {
  const kind = codex14MediaKind(moment.sourceType, moment.sourceUrl);
  const youtube = codex14YouTubeEmbedUrl(moment.sourceUrl);

  if (kind === "video" && youtube) {
    return (
      <iframe
        className={styles.mediaFrame}
        src={youtube}
        title={`${moment.title || "기억"} 영상`}
        allow="accelerometer; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  if (kind === "video" && moment.sourceUrl) {
    return <video className={styles.nativeMedia} src={moment.sourceUrl} controls playsInline preload="metadata" />;
  }
  if (kind === "audio" && moment.sourceUrl) {
    return <audio className={styles.audioMedia} src={moment.sourceUrl} controls preload="metadata" />;
  }
  if (kind === "image" && (moment.sourceUrl || moment.thumbnail)) {
    return <img className={styles.nativeMedia} src={moment.sourceUrl || moment.thumbnail} alt={moment.title || "기억 이미지"} />;
  }
  if (moment.thumbnail) {
    return <img className={styles.nativeMedia} src={moment.thumbnail} alt="" />;
  }
  if (moment.sourceUrl) {
    return (
      <div className={styles.mediaFallback}>
        <a href={moment.sourceUrl} target="_blank" rel="noreferrer">원본 기억 열기 ↗</a>
      </div>
    );
  }
  return <div className={styles.mediaFallback}>이 Moment에는 미디어 미리보기가 없습니다.</div>;
}

function cardStyle(offset: number, rotation: number): CSSProperties {
  const distance = Math.abs(offset);
  const x = offset * 66;
  const z = -distance * 64;
  const y = distance * 5;
  const rotateY = rotation + offset * 7;
  const scale = Math.max(0.78, 1 - distance * 0.055);
  return {
    "--card-x": `${x}px`,
    "--card-y": `${y}px`,
    "--card-z": `${z}px`,
    "--card-ry": `${rotateY}deg`,
    "--card-scale": String(scale),
    "--card-opacity": String(Math.max(0.46, 1 - distance * 0.12)),
    zIndex: 100 - distance,
  } as CSSProperties;
}

export default function RotatingMemoryIndexArchive({ treeId }: { treeId: string }) {
  const { tree, albumMoments, loading, error, selectedMomentId, selectMoment } = useTreeMoments(treeId);
  const [rotation, setRotation] = useState(-14);
  const [autoRotate, setAutoRotate] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const inspectorRef = useRef<HTMLDialogElement>(null);
  const indexRef = useRef<HTMLDialogElement>(null);
  const inspectorTriggerRef = useRef<HTMLElement | null>(null);
  const indexTriggerRef = useRef<HTMLButtonElement | null>(null);
  const pointerRef = useRef<{ id: number; startX: number; lastX: number; moved: number } | null>(null);
  const suppressClickRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  const activeIndex = useMemo(
    () => codex14ResolveIndex(albumMoments, selectedMomentId),
    [albumMoments, selectedMomentId],
  );
  const activeMoment = activeIndex >= 0 ? albumMoments[activeIndex] : null;
  const slots = useMemo(
    () => codex14DeckSlots(albumMoments.length, activeIndex, 7),
    [activeIndex, albumMoments.length],
  );

  useEffect(() => {
    if (albumMoments.length > 0 && !selectedMomentId) selectMoment(albumMoments[0].id);
  }, [albumMoments, selectMoment, selectedMomentId]);

  useEffect(() => {
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const sync = () => {
      setReducedMotion(reducedQuery.matches);
      if (reducedQuery.matches || coarsePointerQuery.matches) setAutoRotate(false);
    };
    sync();
    reducedQuery.addEventListener("change", sync);
    coarsePointerQuery.addEventListener("change", sync);
    return () => {
      reducedQuery.removeEventListener("change", sync);
      coarsePointerQuery.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!autoRotate || reducedMotion || dragging || inspectorOpen || indexOpen) {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastFrameRef.current = null;
      return;
    }
    const tick = (now: number) => {
      const last = lastFrameRef.current ?? now;
      const dt = Math.min(48, now - last);
      lastFrameRef.current = now;
      setRotation((value) => value + dt * 0.0048);
      frameRef.current = window.requestAnimationFrame(tick);
    };
    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastFrameRef.current = null;
    };
  }, [autoRotate, dragging, indexOpen, inspectorOpen, reducedMotion]);

  useEffect(() => {
    const dialog = inspectorRef.current;
    if (!dialog) return;
    if (inspectorOpen && !dialog.open) dialog.showModal();
    if (!inspectorOpen && dialog.open) dialog.close();
  }, [inspectorOpen]);

  useEffect(() => {
    const dialog = indexRef.current;
    if (!dialog) return;
    if (indexOpen && !dialog.open) dialog.showModal();
    if (!indexOpen && dialog.open) dialog.close();
  }, [indexOpen]);

  const announceSelection = useCallback((index: number) => {
    const moment = albumMoments[index];
    if (!moment) return;
    setAnnouncement(`${index + 1}번째 기억, ${moment.title || "제목 없는 기억"}`);
  }, [albumMoments]);

  const move = useCallback((direction: -1 | 1) => {
    const nextId = codex14AdjacentMomentId(albumMoments, selectedMomentId, direction);
    if (!nextId) return;
    selectMoment(nextId);
    const nextIndex = albumMoments.findIndex((moment) => moment.id === nextId);
    announceSelection(nextIndex);
    setRotation((value) => value + direction * 10);
  }, [albumMoments, announceSelection, selectMoment, selectedMomentId]);

  const selectAt = useCallback((index: number) => {
    const moment = albumMoments[index];
    if (!moment) return;
    selectMoment(moment.id);
    announceSelection(index);
  }, [albumMoments, announceSelection, selectMoment]);

  const closeInspector = useCallback(() => {
    setInspectorOpen(false);
    window.requestAnimationFrame(() => inspectorTriggerRef.current?.focus());
  }, []);

  const openInspector = useCallback((trigger: HTMLElement) => {
    inspectorTriggerRef.current = trigger;
    setAutoRotate(false);
    setInspectorOpen(true);
  }, []);

  const closeIndex = useCallback(() => {
    setIndexOpen(false);
    window.requestAnimationFrame(() => indexTriggerRef.current?.focus());
  }, []);

  const onCardClick = useCallback((event: ReactMouseEvent<HTMLButtonElement>, momentIndex: number) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (momentIndex !== activeIndex) {
      selectAt(momentIndex);
      return;
    }
    openInspector(event.currentTarget);
  }, [activeIndex, openInspector, selectAt]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    const card = target.closest("[data-codex14-card='true']");
    const interactive = target.closest("a, button, input, select, textarea, [role='button']");
    if (interactive && !card) return;
    suppressClickRef.current = false;
    pointerRef.current = { id: event.pointerId, startX: event.clientX, lastX: event.clientX, moved: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.lastX;
    pointer.lastX = event.clientX;
    pointer.moved = Math.max(pointer.moved, Math.abs(event.clientX - pointer.startX));
    if (pointer.moved > 6) suppressClickRef.current = true;
    if (pointer.moved > 3) setRotation((value) => value + dx * 0.2);
  }, []);

  const finishPointer = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.startX;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
    pointerRef.current = null;
    setDragging(false);
    if (Math.abs(dx) >= 44) move(dx < 0 ? 1 : -1);
  }, [move]);

  const onWheel = useCallback((event: ReactWheelEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("a, input, select, textarea, dialog")) return;
    if (Math.abs(event.deltaY) < 6 && Math.abs(event.deltaX) < 6) return;
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    move(delta > 0 ? 1 : -1);
  }, [move]);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (inspectorOpen || indexOpen) return;
    const target = event.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    const textControl = tag === "input" || tag === "textarea" || tag === "select";
    if (textControl) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    } else if (event.key.toLowerCase() === "i") {
      event.preventDefault();
      setIndexOpen(true);
    } else if ((event.key === " " || event.code === "Space") && tag !== "button" && tag !== "a") {
      event.preventDefault();
      if (!reducedMotion) setAutoRotate((value) => !value);
    }
  }, [indexOpen, inspectorOpen, move, reducedMotion]);

  if (loading) {
    return <main className={styles.state}><p>회전 메모리 인덱스를 불러오는 중입니다.</p></main>;
  }
  if (error) {
    return <main className={styles.state}><h1>Rotating Memory Index</h1><p role="alert">{error}</p><Link href="/v4/subjects">사람 앨범으로 돌아가기</Link></main>;
  }
  if (albumMoments.length === 0 || !activeMoment) {
    return <main className={styles.state}><h1>{tree?.title || "Memory Archive"}</h1><p>아직 둘러볼 Moment가 없습니다.</p><Link href="/v4/subjects">사람 앨범으로 돌아가기</Link></main>;
  }

  return (
    <main
      className={`${styles.page} ${dragging ? styles.dragging : ""}`}
      data-codex14-native="archive"
      data-reduced-motion={reducedMotion ? "true" : "false"}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onWheel={onWheel}
      tabIndex={0}
      aria-label="회전 메모리 인덱스 아카이브"
    >
      <header className={styles.topbar}>
        <Link href="/v4/subjects" className={styles.back}>← 사람 앨범</Link>
        <div className={styles.brand}><span className={styles.mark} aria-hidden="true" />LoveTree</div>
        <div className={styles.meta}>Rotating index · {albumMoments.length} moments</div>
      </header>

      <section className={styles.stage} aria-label="공간형 기억 탐색">
        <div className={styles.scene}>
          <div className={styles.deck} data-codex14-deck>
            {slots.map(({ momentIndex, offset }) => {
              const moment = albumMoments[momentIndex];
              const selected = momentIndex === activeIndex;
              return (
                <button
                  key={`${moment.id}-${offset}`}
                  type="button"
                  className={`${styles.card} ${selected ? styles.selected : ""}`}
                  style={cardStyle(offset, rotation)}
                  data-offset={offset}
                  data-codex14-card="true"
                  aria-current={selected ? "true" : undefined}
                  aria-label={`${moment.title || "제목 없는 기억"}${selected ? " 상세 열기" : " 선택"}`}
                  onClick={(event) => onCardClick(event, momentIndex)}
                >
                  <span className={styles.cardFace}>
                    {moment.thumbnail ? (
                      <img src={moment.thumbnail} alt="" draggable={false} />
                    ) : (
                      <span className={styles.typeCard} aria-hidden="true">{String(momentIndex + 1).padStart(2, "0")}</span>
                    )}
                    <span className={styles.scrim} aria-hidden="true" />
                    <span className={styles.cardCopy}>
                      <small>LT · {String(momentIndex + 1).padStart(3, "0")}</small>
                      <strong>{moment.title || "제목 없는 기억"}</strong>
                      <span>{codex14DateLabel(moment)}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className={styles.indexRail} aria-label="현재 기억 위치">
        <span>{String(activeIndex + 1).padStart(3, "0")}</span>
        <div className={styles.railLine}><i style={{ width: `${((activeIndex + 1) / albumMoments.length) * 100}%` }} /></div>
        <span>{String(albumMoments.length).padStart(3, "0")}</span>
      </div>

      <aside className={styles.caption} aria-live="polite">
        <small>Selected moment</small>
        <h1>{activeMoment.title || tree?.title || "Memory Archive"}</h1>
        <p>{activeMoment.memo || "이 기억을 공간 속에서 다시 꺼내보세요."}</p>
      </aside>

      <div className={styles.controls}>
        <button type="button" onClick={() => move(-1)} aria-label="이전 기억">←</button>
        <button
          type="button"
          onClick={() => !reducedMotion && setAutoRotate((value) => !value)}
          aria-label={reducedMotion ? "모션 감소 설정으로 자동 회전 사용 안 함" : autoRotate ? "자동 회전 일시정지" : "자동 회전 시작"}
          aria-pressed={autoRotate}
          disabled={reducedMotion}
        >{autoRotate ? "Ⅱ" : "▶"}</button>
        <button type="button" onClick={() => move(1)} aria-label="다음 기억">→</button>
      </div>

      <button
        ref={indexTriggerRef}
        type="button"
        className={styles.indexButton}
        onClick={() => { setAutoRotate(false); setIndexOpen(true); }}
        aria-haspopup="dialog"
      >Index {albumMoments.length}</button>

      <button
        type="button"
        className={styles.inspectButton}
        onClick={(event) => openInspector(event.currentTarget)}
        aria-haspopup="dialog"
      >기억 자세히 보기</button>

      <p className={styles.hint}>Drag / swipe · wheel · ← → · I index</p>
      <p className={styles.srOnly} aria-live="polite">{announcement}</p>

      <dialog
        ref={indexRef}
        className={styles.indexDialog}
        onCancel={(event) => { event.preventDefault(); closeIndex(); }}
        onClose={() => setIndexOpen(false)}
        aria-labelledby="codex14-index-title"
      >
        <div className={styles.dialogHead}>
          <div><small>Editorial archive</small><h2 id="codex14-index-title">Moving Memory Index</h2></div>
          <button type="button" onClick={closeIndex} aria-label="인덱스 닫기">×</button>
        </div>
        <div className={styles.indexGrid}>
          {albumMoments.map((moment, index) => (
            <button
              type="button"
              key={moment.id}
              className={index === activeIndex ? styles.activeIndexItem : styles.indexItem}
              onClick={() => { selectAt(index); closeIndex(); }}
              aria-current={index === activeIndex ? "true" : undefined}
            >
              {moment.thumbnail ? <img src={moment.thumbnail} alt="" /> : <span className={styles.indexPlaceholder}>{String(index + 1).padStart(2, "0")}</span>}
              <span><small>{String(index + 1).padStart(3, "0")}</small>{moment.title || "제목 없는 기억"}</span>
            </button>
          ))}
        </div>
      </dialog>

      <dialog
        ref={inspectorRef}
        className={styles.inspector}
        onCancel={(event) => { event.preventDefault(); closeInspector(); }}
        onClose={() => setInspectorOpen(false)}
        aria-labelledby="codex14-inspector-title"
      >
        <button type="button" className={styles.dialogClose} onClick={closeInspector} aria-label="기억 상세 닫기">×</button>
        <div className={styles.inspectorMedia}><MomentMedia moment={activeMoment} /></div>
        <div className={styles.inspectorCopy}>
          <small>LoveTree · Moment {String(activeIndex + 1).padStart(3, "0")} / {String(albumMoments.length).padStart(3, "0")}</small>
          <h2 id="codex14-inspector-title">{activeMoment.title || "제목 없는 기억"}</h2>
          <p>{activeMoment.memo || "기록된 메모가 없습니다."}</p>
          <dl>
            <div><dt>Date</dt><dd>{codex14DateLabel(activeMoment)}</dd></div>
            <div><dt>Media</dt><dd>{activeMoment.sourceType || "unknown"}</dd></div>
            {activeMoment.emotionTags.length > 0 ? <div><dt>Emotion</dt><dd>{activeMoment.emotionTags.join(" · ")}</dd></div> : null}
          </dl>
        </div>
      </dialog>
    </main>
  );
}