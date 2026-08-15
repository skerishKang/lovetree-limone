"use client";

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  TRACK64_GESTURE,
  TRACK64_MOMENTS,
} from "@/lib/lineage-64/data";
import {
  beginGesture,
  cancelGesture,
  createPendingGesture,
  endGesture,
  moveGesture,
  recoverLostPointerCapture,
  reduceFloatingMoment,
  selectedMoment,
} from "@/lib/lineage-64/state";
import type { MomentRecord } from "@/lib/lineage-64/types";
import styles from "./lineage-64.module.css";

const MOMENT_COUNT = TRACK64_MOMENTS.length;

function cardTransform(m: MomentRecord): string {
  const rad = (m.world.angle * Math.PI) / 180;
  const x = Math.sin(rad) * m.world.radius;
  const z = Math.cos(rad) * m.world.radius;
  return `translate3d(${x.toFixed(1)}px, ${m.world.y}px, ${z.toFixed(1)}px) rotateY(${m.world.angle}deg) scale(${m.world.scale})`;
}

function surfaceStyle(m: MomentRecord, variant: "card" | "viewer"): CSSProperties {
  const fit = variant === "viewer" ? m.fitting.viewerFitMode : m.fitting.fitMode;
  const position = variant === "viewer" ? m.fitting.viewerObjectPosition : m.fitting.objectPosition;
  const size = fit === "cover" ? "100% 100%" : fit === "contain" ? "contain" : "contain";
  return {
    backgroundImage: `radial-gradient(circle at 50% 35%, ${m.accent} 0%, #1a1020 60%, #06070b 100%)`,
    backgroundSize: size,
    backgroundPosition: position,
    backgroundRepeat: "no-repeat",
  };
}

const KIND_LABEL: Record<MomentRecord["kind"], string> = {
  photo: "PHOTO",
  video: "VIDEO",
  memo: "MEMO",
  link: "LINK",
};

export default function Lineage64FloatingMomentPortal() {
  const [state, dispatch] = useReducer(
    reduceFloatingMoment,
    undefined,
    () => ({ selectedMomentId: null, viewerOpen: false, focusedIndex: 0 }),
  );
  const [coarse, setCoarse] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [announce, setAnnounce] = useState("");

  const worldRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const listToggleRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const pendingRef = useRef(createPendingGesture());
  const draggingRef = useRef(false);
  const cameraAngleRef = useRef(0);
  const velocityRef = useRef(0);

  const threshold = coarse ? TRACK64_GESTURE.mobileTapThreshold : TRACK64_GESTURE.desktopTapThreshold;
  const active = useMemo(() => selectedMoment(TRACK64_MOMENTS, state), [state]);

  useEffect(() => {
    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncCoarse = () => setCoarse(coarseQuery.matches);
    const syncMotion = () => {
      setReducedMotion(motionQuery.matches);
      if (motionQuery.matches) velocityRef.current = 0;
    };
    syncCoarse();
    syncMotion();
    coarseQuery.addEventListener("change", syncCoarse);
    motionQuery.addEventListener("change", syncMotion);
    return () => {
      coarseQuery.removeEventListener("change", syncCoarse);
      motionQuery.removeEventListener("change", syncMotion);
    };
  }, []);

  // Ambient orbit RAF — paused while reduced motion / viewer open / dragging.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!reducedMotion && !state.viewerOpen && !draggingRef.current) {
        cameraAngleRef.current += velocityRef.current * dt;
        velocityRef.current *= 0.96;
        if (Math.abs(velocityRef.current) < 0.0004) velocityRef.current = 0;
      }
      if (worldRef.current) worldRef.current.style.transform = `rotateY(${cameraAngleRef.current.toFixed(3)}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, state.viewerOpen]);

  // Viewer focus entry / background inert / origin focus restoration.
  useEffect(() => {
    if (state.viewerOpen) {
      if (worldRef.current) worldRef.current.inert = true;
      const id = requestAnimationFrame(() => closeRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    if (worldRef.current) worldRef.current.inert = false;
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, [state.viewerOpen]);

  const closeViewer = useCallback(() => {
    dispatch({ type: "close-viewer" });
    setAnnounce("뷰어를 닫았습니다.");
  }, []);

  const openMoment = useCallback((momentId: string, origin: HTMLElement | null) => {
    triggerRef.current = origin;
    dispatch({ type: "open-viewer", momentId });
  }, []);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, moment: MomentRecord) => {
      if (state.viewerOpen) return;
      pendingRef.current = beginGesture(pendingRef.current, e.pointerId, moment.id, e.clientX, e.clientY);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore capture failure
      }
    },
    [state.viewerOpen],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const p = pendingRef.current;
      if (p.pointerId !== e.pointerId) return;
      const dx = e.clientX - p.lastX;
      cameraAngleRef.current += dx * 0.25;
      velocityRef.current = Math.max(-0.06, Math.min(0.06, dx * 0.02));
      pendingRef.current = moveGesture(p, e.clientX, e.clientY, threshold);
      if (pendingRef.current.dragActive) draggingRef.current = true;
      if (worldRef.current) worldRef.current.style.transform = `rotateY(${cameraAngleRef.current.toFixed(3)}deg)`;
    },
    [threshold],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, moment: MomentRecord) => {
      const p = pendingRef.current;
      if (p.pointerId !== e.pointerId) return;
      const result = endGesture(p, threshold, state.viewerOpen);
      if (result.open && p.downCardId) {
        openMoment(p.downCardId, e.currentTarget);
        setAnnounce(`${moment.title} 뷰어를 열었습니다.`);
      }
      pendingRef.current = result.next;
      draggingRef.current = false;
    },
    [threshold, state.viewerOpen, openMoment],
  );

  // pointercancel must clear pending card-open ownership — never open.
  const handlePointerCancel = useCallback(() => {
    pendingRef.current = cancelGesture(pendingRef.current);
    draggingRef.current = false;
  }, []);

  // lostpointercapture recovery — clear pending so no stuck drag / accidental open.
  const handleLostPointerCapture = useCallback(() => {
    pendingRef.current = recoverLostPointerCapture(pendingRef.current);
    draggingRef.current = false;
  }, []);

  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      if (state.viewerOpen) return;
      velocityRef.current = Math.max(-0.06, Math.min(0.06, velocityRef.current + e.deltaY * 0.0006));
      if (worldRef.current) worldRef.current.style.transform = `rotateY(${cameraAngleRef.current.toFixed(3)}deg)`;
    },
    [state.viewerOpen],
  );

  const handleViewerKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeViewer();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = viewerRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [closeViewer],
  );

  const continuePath = useCallback(() => {
    if (!active) return;
    const next = TRACK64_MOMENTS[(active.index + 1) % MOMENT_COUNT];
    openMoment(next.id, closeRef.current);
    setAnnounce(`PATH CONTINUE 데모: ${next.title}`);
  }, [active, openMoment]);

  const branchChoice = useCallback(() => {
    if (!active) return;
    const branch = TRACK64_MOMENTS.find((m) => m.family !== active.family) ?? TRACK64_MOMENTS[(active.index + 2) % MOMENT_COUNT];
    openMoment(branch.id, closeRef.current);
    setAnnounce(`BRANCH CHOICE 데모: ${branch.title}`);
  }, [active, openMoment]);

  const selectFromList = useCallback(
    (moment: MomentRecord) => {
      openMoment(moment.id, listToggleRef.current);
      setListOpen(false);
      setAnnounce(`목록에서 선택: ${moment.title}`);
    },
    [openMoment],
  );

  const renderSurface = (moment: MomentRecord, variant: "card" | "viewer") => {
    if (moment.kind === "memo") {
      return (
        <div className={styles.memoBody} data-fit-mode={moment.fitting.fitMode}>
          {moment.summary}
        </div>
      );
    }
    if (moment.kind === "video") {
      // SOURCE BOUNDARY: poster/preview only. No HTMLVideoElement, no real playback claim.
      return (
        <div
          className={styles.mediaSurface}
          style={surfaceStyle(moment, variant)}
          data-fit-mode={moment.fitting.fitMode}
          data-viewer-fit-mode={moment.fitting.viewerFitMode}
          aria-hidden="true"
        >
          <span className={styles.playAffordance} aria-hidden="true">▶</span>
          <span className={styles.posterNote}>POSTER / PREVIEW ONLY · 실제 재생 없음</span>
        </div>
      );
    }
    if (moment.kind === "link") {
      return (
        <div
          className={styles.mediaSurface}
          style={surfaceStyle(moment, variant)}
          data-fit-mode={moment.fitting.fitMode}
          data-viewer-fit-mode={moment.fitting.viewerFitMode}
          aria-hidden="true"
        >
          <span className={styles.linkNote}>
            {moment.externalUrl ? "외부 연결 있음" : "연결된 소스 없음 (데모) · URL 발명 금지"}
          </span>
        </div>
      );
    }
    return (
      <div
        className={styles.mediaSurface}
        style={surfaceStyle(moment, variant)}
        data-fit-mode={moment.fitting.fitMode}
        data-viewer-fit-mode={moment.fitting.viewerFitMode}
        aria-hidden="true"
      />
    );
  };

  return (
    <div className={styles.stage} onWheel={handleWheel}>
      <div className={styles.welcome} aria-hidden="true">
        <p className={styles.welcomeKicker}>WELCOME BACK</p>
        <h2 className={styles.welcomeTitle}>부유모먼트 웰컴오빗</h2>
        <p className={styles.welcomeSub}>연속된 부유 3D 카드 우주에서 하나의 Moment를 선택해 경로로 재진입하세요.</p>
      </div>

      <button
        type="button"
        className={styles.semanticToggle}
        ref={listToggleRef}
        onClick={() => setListOpen((v) => !v)}
        aria-expanded={listOpen}
      >
        시맨틱 목록 / 키보드 인덱스
      </button>

      <div
        className={styles.world}
        ref={worldRef}
        style={{ transform: "rotateY(0deg)" }}
        data-rendering="css3d-dom"
        data-reduced-motion={reducedMotion ? "reduce" : "no-preference"}
      >
        {TRACK64_MOMENTS.map((moment) => {
          const isSelected = state.selectedMomentId === moment.id;
          return (
            <button
              key={moment.id}
              type="button"
              className={styles.card}
              style={{ transform: cardTransform(moment) }}
              data-moment-id={moment.id}
              data-depth-tier={moment.depthTier}
              data-family={moment.family}
              data-fit-mode={moment.fitting.fitMode}
              data-selected={isSelected ? "true" : "false"}
              aria-pressed={isSelected}
              aria-label={`${moment.title}, ${moment.date}, ${KIND_LABEL[moment.kind]}`}
              onPointerDown={(e) => handlePointerDown(e, moment)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(e, moment)}
              onPointerCancel={handlePointerCancel}
              onLostPointerCapture={handleLostPointerCapture}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!state.viewerOpen) openMoment(moment.id, e.currentTarget);
                }
              }}
            >
              {renderSurface(moment, "card")}
              <span className={styles.cardBadge}>{KIND_LABEL[moment.kind]}</span>
              <span className={styles.cardTitle}>{moment.title}</span>
              <span className={styles.cardDate}>{moment.date}</span>
            </button>
          );
        })}
      </div>

      {listOpen && (
        <div className={styles.listPanel} role="listbox" aria-label="Moment 시맨틱 목록">
          {TRACK64_MOMENTS.map((moment) => (
            <button
              key={moment.id}
              type="button"
              role="option"
              aria-selected={state.selectedMomentId === moment.id}
              className={styles.listOption}
              onClick={() => selectFromList(moment)}
            >
              {moment.title} · {KIND_LABEL[moment.kind]}
            </button>
          ))}
        </div>
      )}

      {state.viewerOpen && active && (
        <div className={styles.viewerOverlay}>
          <div
            className={styles.viewer}
            ref={viewerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lineage64-viewer-title"
            onKeyDown={handleViewerKeyDown}
          >
            <div className={styles.viewerHead}>
              <h3 id="lineage64-viewer-title" className={styles.viewerTitle}>
                {active.title}
              </h3>
              <button
                type="button"
                ref={closeRef}
                className={styles.closeBtn}
                onClick={closeViewer}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div
              className={styles.viewerMedia}
              data-selected-moment-id={active.id}
              data-viewer-fit-mode={active.fitting.viewerFitMode}
              data-depth-tier={active.depthTier}
            >
              {renderSurface(active, "viewer")}
            </div>

            <p className={styles.viewerMeta}>
              {active.date} · {KIND_LABEL[active.kind]} · {active.family} · {active.depthTier}
            </p>

            <div className={styles.viewerWhy}>
              <strong>WHY NEXT</strong>
              <p>
                {active.title} 과 이어지는 다음 기억으로의 연결 제안 (SOURCE DEMO · NON-CANONICAL). recent / important /
                resume 은 제품 정책 또는 파생 데모 값이며 canonical truth 가 아닙니다.
              </p>
            </div>

            <div className={styles.viewerActions}>
              <button type="button" className={styles.btn} onClick={continuePath}>
                PATH CONTINUE (데모)
              </button>
              <button type="button" className={styles.btn} onClick={branchChoice}>
                BRANCH CHOICE (데모)
              </button>
              {active.kind === "link" && active.externalUrl && (
                <a className={styles.btn} href={active.externalUrl} target="_blank" rel="noopener noreferrer">
                  외부 열기
                </a>
              )}
            </div>

            <p className={styles.viewerFoot}>
              SOURCE DEMO / NON-PERSISTENT / SIMULATED · canonical /v4 채택 없음 · MY TREE 및 Track59 정식 라우트는 미발명.
            </p>
          </div>
        </div>
      )}

      <p className={styles.announcer} aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
