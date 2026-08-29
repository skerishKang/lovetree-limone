"use client";

import Link from "next/link";
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
import { source64CardPosition, source64OrbitalPhase, SOURCE64_RING_SPEEDS } from "@/lib/lineage-64/orbit";
import styles from "./lineage-64.module.css";

// TRUE AMBIENT AUTO-ORBIT: a continuous, bounded idle orbit in normal motion.
// Independent of any user inertia. Disabled under reduced motion, while the Viewer
// is open, or while a pointer drag owns the world. Manual drag/wheel add on top.
const AMBIENT_DEG_PER_MS = 0.01;

function cardTransform(m: MomentRecord, orbitalPhase = 0, compact = false): string {
  const { x, y, z, theta } = source64CardPosition(m, orbitalPhase, compact);
  const scale = m.world.scale;
  const rotateX = Math.sin(theta) * 9;
  const rotateY = Math.cos(theta) * 18;
  const rotateZ = Math.sin(theta * 0.6) * 7;
  return `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${rotateX.toFixed(1)}deg) rotateY(${rotateY.toFixed(1)}deg) rotateZ(${rotateZ.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
}

function surfaceStyle(m: MomentRecord, variant: "card" | "viewer"): CSSProperties {
  const fit = variant === "viewer" ? m.fitting.viewerFitMode : m.fitting.fitMode;
  const position = variant === "viewer" ? m.fitting.viewerObjectPosition : m.fitting.objectPosition;
  const size = fit === "cover" ? "100% 100%" : "contain";
  return {
    ...(m.mediaUrl ? {} : { backgroundImage: `linear-gradient(160deg, ${m.accent} 0%, #1a1020 60%, #06070b 100%)` }),
    backgroundSize: size,
    backgroundPosition: position,
    backgroundRepeat: "no-repeat",
  };
}

function mediaImageStyle(m: MomentRecord, variant: "card" | "viewer"): CSSProperties {
  const fit = variant === "viewer" ? m.fitting.viewerFitMode : m.fitting.fitMode;
  const position = variant === "viewer" ? m.fitting.viewerObjectPosition : m.fitting.objectPosition;
  return {
    objectFit: fit === "cover" ? "cover" : "contain",
    objectPosition: position,
  };
}

const KIND_LABEL: Record<MomentRecord["kind"], string> = {
  photo: "PHOTO",
  video: "VIDEO",
  memo: "MEMO",
  link: "LINK",
};

interface Lineage64FloatingMomentPortalProps {
  moments?: readonly MomentRecord[];
  initialMomentId?: string | null;
  onMomentChange?: (momentId: string | null) => void;
  canonicalTreeId?: string;
}

export default function Lineage64FloatingMomentPortal({
  moments = TRACK64_MOMENTS,
  initialMomentId = null,
  onMomentChange,
  canonicalTreeId,
}: Lineage64FloatingMomentPortalProps) {
  const momentCount = moments.length;
  const familyCount = useMemo(() => new Set(moments.map((moment) => moment.family)).size, [moments]);
  const [state, dispatch] = useReducer(
    reduceFloatingMoment,
    initialMomentId,
    (selectedMomentId) => ({
      selectedMomentId,
      viewerOpen: Boolean(selectedMomentId),
      focusedIndex: 0,
    }),
  );
  const [coarse, setCoarse] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [orbitalPhase, setOrbitalPhase] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [announce, setAnnounce] = useState("");

  const worldRef = useRef<HTMLDivElement | null>(null);
  const backgroundRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const listToggleRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const pendingRef = useRef(createPendingGesture());
  const draggingRef = useRef(false);
  const cameraAngleRef = useRef(0);
  const orbitalPhaseRef = useRef(0);
  const velocityRef = useRef(0);

  const threshold = coarse ? TRACK64_GESTURE.mobileTapThreshold : TRACK64_GESTURE.desktopTapThreshold;
  const active = useMemo(() => selectedMoment(moments, state), [moments, state]);
  const canonicalMomentSuffix = active && canonicalTreeId ? `?moment=${encodeURIComponent(active.id)}` : "";
  const canonicalTreePath = canonicalTreeId ? `/trees/${encodeURIComponent(canonicalTreeId)}` : null;

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
  // The shared camera remains an input layer; Source64's five ring families
  // also advance on their own phase with independent ring.speed values.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!reducedMotion && !state.viewerOpen && !draggingRef.current) {
        cameraAngleRef.current += AMBIENT_DEG_PER_MS * dt;
        cameraAngleRef.current += velocityRef.current * dt;
        velocityRef.current *= 0.96;
        if (Math.abs(velocityRef.current) < 0.0004) velocityRef.current = 0;
        orbitalPhaseRef.current += (dt / 1000) * 0.9;
        setOrbitalPhase(orbitalPhaseRef.current);
      }
      if (worldRef.current) {
        worldRef.current.style.transform = `rotateY(${cameraAngleRef.current.toFixed(3)}deg)`;
        worldRef.current.dataset.orbitalPhase = orbitalPhaseRef.current.toFixed(6);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, state.viewerOpen]);

  // Viewer focus entry / background inert / origin focus restoration + focus trap.
  // A real touch tap synthesizes a trailing click whose mousedown blurs the dialog
  // focus back to <body>; re-assert focus inside on any focusout that escapes the
  // dialog so the Viewer always contains focus (item E).
  useEffect(() => {
    if (state.viewerOpen) {
      if (backgroundRef.current) backgroundRef.current.inert = true;
      const id = requestAnimationFrame(() => closeRef.current?.focus());
      const dialog = viewerRef.current;
      const onFocusOut = (e: FocusEvent) => {
        const next = e.relatedTarget as HTMLElement | null;
        if (dialog && (!next || !dialog.contains(next))) {
          closeRef.current?.focus();
        }
      };
      dialog?.addEventListener("focusout", onFocusOut);
      return () => {
        cancelAnimationFrame(id);
        dialog?.removeEventListener("focusout", onFocusOut);
      };
    }
    if (backgroundRef.current) backgroundRef.current.inert = false;
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, [state.viewerOpen]);

  const closeViewer = useCallback(() => {
    dispatch({ type: "close-viewer" });
    onMomentChange?.(null);
    setAnnounce("뷰어를 닫았습니다.");
  }, [onMomentChange]);

  const openMoment = useCallback((momentId: string, origin: HTMLElement | null) => {
    triggerRef.current = origin;
    dispatch({ type: "open-viewer", momentId });
    onMomentChange?.(momentId);
  }, [onMomentChange]);

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
      orbitalPhaseRef.current += dx * 0.0038;
      pendingRef.current = moveGesture(p, e.clientX, e.clientY, threshold);
      if (pendingRef.current.dragActive) draggingRef.current = true;
      if (worldRef.current) {
        worldRef.current.style.transform = `rotateY(${cameraAngleRef.current.toFixed(3)}deg)`;
        worldRef.current.dataset.orbitalPhase = orbitalPhaseRef.current.toFixed(6);
      }
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
      // Manual wheel ownership: rotate the world immediately and seed bounded
      // inertia. Allowed under reduced motion because it is an explicit user
      // gesture (same policy as manual drag/swipe), not ambient auto-orbit.
      cameraAngleRef.current += e.deltaY * 0.06;
      velocityRef.current = Math.max(-0.06, Math.min(0.06, velocityRef.current + e.deltaY * 0.0006));
      orbitalPhaseRef.current += e.deltaY * 0.001;
      if (worldRef.current) {
        worldRef.current.style.transform = `rotateY(${cameraAngleRef.current.toFixed(3)}deg)`;
        worldRef.current.dataset.orbitalPhase = orbitalPhaseRef.current.toFixed(6);
      }
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
    const next = moments[(active.index + 1) % momentCount];
    openMoment(next.id, closeRef.current);
    setAnnounce(`PATH CONTINUE 데모: ${next.title}`);
  }, [active, momentCount, moments, openMoment]);

  const branchChoice = useCallback(() => {
    if (!active) return;
    const branch = moments.find((m) => m.family !== active.family) ?? moments[(active.index + 2) % momentCount];
    if (!branch) return;
    openMoment(branch.id, closeRef.current);
    setAnnounce(`BRANCH CHOICE 데모: ${branch.title}`);
  }, [active, momentCount, moments, openMoment]);

  const selectFromList = useCallback(
    (moment: MomentRecord) => {
      openMoment(moment.id, listToggleRef.current);
      setListOpen(false);
      setAnnounce(`목록에서 선택: ${moment.title}`);
    },
    [openMoment],
  );

  const openFirstMoment = useCallback(() => {
    const first = moments[0];
    if (!first) return;
    openMoment(first.id, listToggleRef.current);
    setAnnounce(`첫 순간을 열었습니다: ${first.title}`);
  }, [moments, openMoment]);

  const openContinueMoment = useCallback(() => {
    const next = active ? moments[(active.index + 1) % momentCount] : moments[0];
    if (!next) return;
    openMoment(next.id, listToggleRef.current);
    setAnnounce(`이어 보던 순간을 열었습니다: ${next.title}`);
  }, [active, momentCount, moments, openMoment]);

  const openTreeIndex = useCallback(() => {
    setListOpen(true);
    listToggleRef.current?.focus();
    setAnnounce("Moment 목록을 열었습니다.");
  }, []);

  const renderSurface = (moment: MomentRecord, variant: "card" | "viewer") => {
    if (moment.kind === "memo") {
      return (
        <div className={styles.memoBody} data-fit-mode={moment.fitting.fitMode}>
          <div className={styles.memoKicker}>MEMO · {moment.date}</div>
          <div className={styles.memoText}>{moment.title}</div>
          <div className={styles.memoFoot}>{moment.summary}</div>
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
          {moment.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.mediaImage} style={mediaImageStyle(moment, variant)} src={moment.mediaUrl} alt="" referrerPolicy="no-referrer" />
          ) : null}
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
          {moment.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.mediaImage} style={mediaImageStyle(moment, variant)} src={moment.mediaUrl} alt="" referrerPolicy="no-referrer" />
          ) : null}
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
      >
        {moment.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.mediaImage} style={mediaImageStyle(moment, variant)} src={moment.mediaUrl} alt="" referrerPolicy="no-referrer" />
        ) : null}
      </div>
    );
  };

  return (
    <div
      className={styles.stage}
      onWheel={handleWheel}
      data-source64-revision="64-v1-2-1"
      data-source64-moment-count={momentCount}
      data-source64-family-count={familyCount}
    >
      <div
        className={styles.background}
        ref={backgroundRef}
        data-background="true"
      >
        <div className={styles.sourceTopbar}>
          <Link className={styles.sourceBrand} href={canonicalTreePath ?? "/design-lab/lineages/64/v1-2-1"}>
            LOVETREE · MEMORY ORBIT
          </Link>
          <button
            type="button"
            className={styles.menuButton}
            ref={listToggleRef}
            onClick={() => setListOpen((v) => !v)}
            aria-expanded={listOpen}
            aria-controls="lineage64-moment-list"
            aria-label="MENU · 시맨틱 목록 / 키보드 인덱스"
          >
            MENU
          </button>
        </div>
        <div className={styles.welcome} data-source64-welcome="true">
          <p className={styles.welcomeKicker}>WELCOME BACK</p>
          <h2 className={styles.welcomeTitle}>다시, 그 순간으로.</h2>
          <p className={styles.welcomeSub}>기억은 아직 여기에서 이어지고 있어요.</p>
          <div className={styles.welcomeActions}>
            <button type="button" onClick={openContinueMoment}>이어 보던 순간</button>
            <button type="button" onClick={openFirstMoment}>첫 순간으로</button>
            <button type="button" onClick={openTreeIndex}>내 트리 보기</button>
          </div>
        </div>

      <div
        className={styles.world}
        ref={worldRef}
        style={{ transform: "rotateY(0deg)" }}
        data-rendering="css3d-dom"
        data-reduced-motion={reducedMotion ? "reduce" : "no-preference"}
      >
        {moments.map((moment) => {
          const isSelected = state.selectedMomentId === moment.id;
          return (
            <button
              key={moment.id}
              type="button"
              className={styles.card}
              style={{ transform: cardTransform(moment, orbitalPhase, coarse) }}
              data-moment-id={moment.id}
              data-depth-tier={moment.depthTier}
              data-family={moment.family}
              data-orbital-speed={SOURCE64_RING_SPEEDS[moment.family]}
              data-orbital-phase={source64OrbitalPhase(orbitalPhase, moment.family, moment.world.phaseOffset ?? 0).toFixed(6)}
              data-fit-mode={moment.fitting.fitMode}
              data-kind={moment.kind}
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
          {moments.map((moment) => (
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
      </div>

      {state.viewerOpen && active && (
        <div className={styles.viewerOverlay} data-source64-viewer="true">
          <div
            className={styles.mediaShell}
            ref={viewerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lineage64-viewer-title"
            onKeyDown={handleViewerKeyDown}
            data-selected-moment-id={active.id}
            data-viewer-layout="mediaShell"
          >
            <div
              className={styles.mediaVisual}
              data-source64-media-visual="true"
              data-viewer-fit-mode={active.fitting.viewerFitMode}
              data-depth-tier={active.depthTier}
            >
              {renderSurface(active, "viewer")}
              <button
                type="button"
                ref={closeRef}
                className={styles.mediaClose}
                onClick={closeViewer}
                aria-label="Moment 포털 닫기"
              >
                ✕
              </button>
            </div>

            <div className={styles.mediaInfo} data-source64-media-info="true">
              <p className={styles.mediaKicker}>
                MOMENT · {KIND_LABEL[active.kind]} · {active.family.toUpperCase()}
              </p>
              <h3 id="lineage64-viewer-title" className={styles.mediaTitle}>
                {active.title}
              </h3>
              <p className={styles.mediaMeta}>
                {active.date} · {active.depthTier} · {active.fitting.viewerFitMode}
              </p>

              <div className={styles.mediaWhy}>
                <strong>{canonicalTreePath ? "이어진 순간" : "WHY NEXT"}</strong>
                <p>
                  {canonicalTreePath
                    ? "이 순간의 canonical 기록을 이어서 확인하세요. 오빗의 위치와 깊이는 이 화면의 presentation state입니다."
                    : `${active.title} 과 이어지는 다음 기억으로의 연결 제안 (SOURCE DEMO · NON-CANONICAL). recent / important / resume 은 제품 정책 또는 파생 데모 값이며 canonical truth 가 아닙니다.`}
                </p>
              </div>

              <div className={styles.mediaActions}>
                {canonicalTreePath ? (
                  <>
                    <Link className={styles.btn} href={`${canonicalTreePath}${canonicalMomentSuffix}`}>Moment 상세</Link>
                    <Link className={styles.btn} href={`${canonicalTreePath}/board${canonicalMomentSuffix}`}>Living Board</Link>
                    <Link className={styles.btn} href={`${canonicalTreePath}/relationships${canonicalMomentSuffix}`}>관계 보기</Link>
                    <Link className={styles.btn} href={`${canonicalTreePath}/explore${canonicalMomentSuffix}`}>3D 탐색</Link>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              <p className={styles.mediaFoot}>
                {canonicalTreePath
                  ? "CANONICAL TREE DATA · orbit geometry is presentation-only · no persistence added"
                  : "SOURCE DEMO / NON-PERSISTENT / SIMULATED · canonical /v4 채택 없음 · MY TREE 및 Track59 정식 라우트는 미발명."}
              </p>
            </div>
          </div>
        </div>
      )}

      <p className={styles.announcer} aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
