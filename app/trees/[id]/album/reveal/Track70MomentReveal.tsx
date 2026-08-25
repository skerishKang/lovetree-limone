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
} from "react";
import type { AlbumMomentView } from "@/lib/moment-model";
import {
  TRACK70_LINGER_MS,
  TRACK70_TRAIL_LIMIT,
  track70AdjacentIndex,
  track70CanonicalMedia,
  track70MomentDate,
} from "@/lib/source-track-70/moment-reveal";
import styles from "./track70-moment-reveal.module.css";

type TrailPoint = {
  id: number;
  x: number;
  y: number;
};

type RevealMaskStyle = CSSProperties & {
  WebkitMaskImage?: string;
  maskImage?: string;
};

export interface Track70MomentRevealProps {
  treeId: string;
  treeTitle: string;
  moments: AlbumMomentView[];
}

export function Track70MomentReveal({ treeId, treeTitle, moments }: Track70MomentRevealProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [pinnedReveal, setPinnedReveal] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pointId = useRef(0);
  const timers = useRef(new Map<number, number>());
  const touchStart = useRef<{ pointerId: number; x: number; y: number; pointerType: string } | null>(null);

  const selectedMoment = moments[selectedIndex] ?? null;
  const media = track70CanonicalMedia(selectedMoment);

  useEffect(() => {
    setSelectedIndex((current) => Math.min(current, Math.max(0, moments.length - 1)));
  }, [moments.length]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

  const clearTrail = useCallback(() => {
    for (const timer of timers.current.values()) window.clearTimeout(timer);
    timers.current.clear();
    setTrail([]);
  }, []);

  useEffect(() => () => {
    for (const timer of timers.current.values()) window.clearTimeout(timer);
    timers.current.clear();
  }, []);

  const addTrailPoint = useCallback((clientX: number, clientY: number, element: HTMLElement) => {
    if (!media || reducedMotion || pinnedReveal) return;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    const id = ++pointId.current;
    setTrail((current) => [...current.slice(-(TRACK70_TRAIL_LIMIT - 1)), { id, x, y }]);
    const timer = window.setTimeout(() => {
      timers.current.delete(id);
      setTrail((current) => current.filter((point) => point.id !== id));
    }, TRACK70_LINGER_MS);
    timers.current.set(id, timer);
  }, [media, pinnedReveal, reducedMotion]);

  const selectIndex = useCallback((index: number) => {
    clearTrail();
    setPinnedReveal(false);
    setSelectedIndex(index);
  }, [clearTrail]);

  const step = useCallback((delta: number) => {
    if (!moments.length) return;
    selectIndex(track70AdjacentIndex(selectedIndex, delta, moments.length));
  }, [moments.length, selectIndex, selectedIndex]);

  const toggleReveal = useCallback(() => {
    if (!media) return;
    clearTrail();
    setPinnedReveal((current) => !current);
  }, [clearTrail, media]);

  const onStageKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleReveal();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
      return;
    }
    if (event.key === "Escape") {
      clearTrail();
      setPinnedReveal(false);
    }
  };

  const onPointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") addTrailPoint(event.clientX, event.clientY, event.currentTarget);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    touchStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pointerType: event.pointerType,
    };
    if (event.pointerType !== "mouse") {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      addTrailPoint(event.clientX, event.clientY, event.currentTarget);
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") {
      addTrailPoint(event.clientX, event.clientY, event.currentTarget);
      return;
    }
    if (touchStart.current?.pointerId === event.pointerId) {
      addTrailPoint(event.clientX, event.clientY, event.currentTarget);
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || start.pointerId !== event.pointerId || start.pointerType === "mouse") return;
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (reducedMotion || distance < 14) toggleReveal();
  };

  const maskImage = useMemo(() => {
    if (pinnedReveal) return "linear-gradient(#000 0 0)";
    if (!trail.length) return "linear-gradient(transparent 0 0)";
    return trail.map((point, index) => {
      const recency = (index + 1) / trail.length;
      const radius = Math.round(42 + recency * 38);
      return `radial-gradient(circle ${radius}px at ${point.x.toFixed(2)}% ${point.y.toFixed(2)}%, #000 0 56%, rgba(0,0,0,.86) 70%, transparent 100%)`;
    }).join(", ");
  }, [pinnedReveal, trail]);

  const maskStyle: RevealMaskStyle = {
    WebkitMaskImage: maskImage,
    maskImage,
  };

  if (!selectedMoment) return null;

  const revealState = pinnedReveal ? "pinned" : trail.length ? "trail" : "rest";
  const momentDate = track70MomentDate(selectedMoment);

  return (
    <section className={styles.surface} data-testid="track70-moment-reveal" aria-labelledby="track70-reveal-title">
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>FUTURE EDITORIAL · MOMENT REVEAL</p>
          <h1 id="track70-reveal-title">{treeTitle}</h1>
          <p className={styles.deck}>첫 인상 위에 남은 감정의 잔상을 같은 Moment 프레임 안에서 천천히 드러냅니다.</p>
        </div>
        <Link className={styles.backLink} href={`/trees/${encodeURIComponent(treeId)}/album`}>Album으로 돌아가기</Link>
      </header>

      <div className={styles.editorialGrid}>
        <nav className={styles.selectorRail} aria-label="Moment 선택">
          <span className={styles.selectorLabel}>MOMENTS</span>
          <div className={styles.selectorList}>
            {moments.map((moment, index) => (
              <button
                className={`${styles.selectorButton} ${index === selectedIndex ? styles.selectorButtonActive : ""}`}
                data-testid="track70-moment-selector"
                data-moment-id={moment.id}
                key={moment.id}
                type="button"
                aria-current={index === selectedIndex ? "true" : undefined}
                onClick={() => selectIndex(index)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{moment.title || `Moment ${index + 1}`}</b>
              </button>
            ))}
          </div>
        </nav>

        <div className={styles.focusColumn}>
          <div
            className={`${styles.stage} ${!media ? styles.stageEmpty : ""}`}
            data-testid="track70-reveal-stage"
            data-reveal-state={revealState}
            data-reduced-motion={reducedMotion ? "true" : "false"}
            role="button"
            tabIndex={0}
            aria-pressed={pinnedReveal}
            aria-label={`${selectedMoment.title || "선택한 Moment"} 리빌. 포인터 이동, 터치 또는 Enter/Space로 감정 잔상을 확인합니다.`}
            onKeyDown={onStageKeyDown}
            onPointerEnter={onPointerEnter}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { touchStart.current = null; }}
          >
            {media ? (
              <>
                <div className={styles.shellLayer} data-layer="shell" aria-hidden="true">
                  <img className={styles.mediaImage} src={media} alt="" draggable={false} />
                  <div className={styles.shellVeil} />
                </div>
                <div className={styles.cleanLayer} data-layer="clean" data-testid="track70-clean-layer" style={maskStyle} aria-hidden="true">
                  <img className={styles.mediaImage} src={media} alt="" draggable={false} />
                </div>
                <span className={styles.stateLabelShell}>FIRST IMPRESSION</span>
                <span className={styles.stateLabelClean}>EMOTIONAL AFTERIMAGE</span>
              </>
            ) : (
              <div className={styles.noMedia}>
                <span>NO VISUAL MEDIA</span>
                <strong>{selectedMoment.title || "기록된 Moment"}</strong>
                <p>이 Moment에는 canonical thumbnail이 없어 이미지를 추정하거나 대체하지 않습니다.</p>
              </div>
            )}
          </div>

          <div className={styles.transport}>
            <button type="button" onClick={() => step(-1)} aria-label="이전 Moment">←</button>
            <span aria-live="polite">{selectedIndex + 1} / {moments.length}</span>
            <button type="button" onClick={() => step(1)} aria-label="다음 Moment">→</button>
          </div>

          <article className={styles.inspector} data-testid="track70-selected-moment">
            <div className={styles.inspectorMeta}>
              <span>{selectedMoment.sourceType || "moment"}</span>
              {momentDate ? <time>{momentDate}</time> : null}
            </div>
            <h2>{selectedMoment.title || `Moment ${selectedIndex + 1}`}</h2>
            {selectedMoment.memo ? <p>{selectedMoment.memo}</p> : null}
            {selectedMoment.emotionTags?.length ? (
              <div className={styles.tags}>{selectedMoment.emotionTags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
            ) : null}
            <div className={styles.inspectorActions}>
              <button type="button" onClick={toggleReveal}>{pinnedReveal ? "잔상 닫기" : "잔상 고정해서 보기"}</button>
              {selectedMoment.sourceUrl ? (
                <a data-testid="track70-source-link" href={selectedMoment.sourceUrl} target="_blank" rel="noreferrer">원본 미디어 열기 ↗</a>
              ) : null}
            </div>
          </article>

          <p className={styles.interactionNote}>
            Desktop: 포인터 이동 · Touch: 탭/드래그 · Keyboard: Enter/Space, ← →, Esc
          </p>
        </div>
      </div>
    </section>
  );
}
