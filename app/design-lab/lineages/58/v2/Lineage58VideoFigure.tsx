"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  LINEAGE_58_VIDEOFIGURE_SOURCE,
  VIDEOFIGURE_LOOKS,
  VIDEOFIGURE_MOMENTS,
} from "@/lib/lineage-58-videofigure-source";
import {
  LINEAGE_58_VIDEOFIGURE_ASSET_HOLD,
  validateLineage58VideoFigureAssetRegistry,
} from "@/lib/lineage-58-videofigure-assets";
import {
  VIDEOFIGURE_ANGLES,
  angleStepFromHorizontalDelta,
  createVideoFigureTurntableState,
  normalizeVideoFigureLookIndex,
  reduceVideoFigureTurntable,
  videoFigureAngleForState,
} from "@/lib/videofigure-turntable";

type Filter = "all" | "male" | "female" | "saved";

const config = { lookCount: VIDEOFIGURE_LOOKS.length, resumePolicy: "resume-after-idle" as const };

export default function Lineage58VideoFigure() {
  const [state, dispatch] = useReducer(
    (current: ReturnType<typeof createVideoFigureTurntableState>, action: Parameters<typeof reduceVideoFigureTurntable>[1]) =>
      reduceVideoFigureTurntable(current, action, config),
    config,
    (value) => createVideoFigureTurntableState(value),
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [reducedMotion, setReducedMotion] = useState(false);
  const [assetError, setAssetError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [localFilename, setLocalFilename] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const dragRef = useRef<{ pointerId: number; startX: number; lastX: number; active: boolean } | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const assetGate = useMemo(() => validateLineage58VideoFigureAssetRegistry(), []);
  const look = VIDEOFIGURE_LOOKS[state.lookIndex];
  const moment = VIDEOFIGURE_MOMENTS[state.lookIndex];
  const angle = videoFigureAngleForState(state);
  const currentAsset = look.angleAssets[state.angleIndex];

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReducedMotion(query.matches);
      if (query.matches) dispatch({ type: "pause" });
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!state.playing || state.manuallyOwned || reducedMotion || modalOpen) return;
    const delay = state.angleIndex === VIDEOFIGURE_ANGLES.length - 1 ? 950 : 340;
    const timer = window.setTimeout(() => dispatch({ type: "auto-tick" }), delay);
    return () => window.clearTimeout(timer);
  }, [state.playing, state.manuallyOwned, state.angleIndex, state.lookIndex, reducedMotion, modalOpen]);

  useEffect(() => {
    setAssetError(false);
    const preload = look.angleAssets.slice(state.angleIndex + 1, state.angleIndex + 3);
    const images = preload.map((asset) => {
      const image = new Image();
      image.decoding = "async";
      image.src = asset.path;
      return image;
    });
    return () => { images.forEach((image) => { image.src = ""; }); };
  }, [look.id, state.angleIndex, look.angleAssets]);

  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const scheduleResume = useCallback((delay = 900) => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    if (reducedMotion) return;
    resumeTimer.current = setTimeout(() => dispatch({ type: "manual-end" }), delay);
  }, [reducedMotion]);

  const selectLook = (index: number) => {
    const normalizedIndex = normalizeVideoFigureLookIndex(index, VIDEOFIGURE_LOOKS.length);
    dispatch({ type: "select-look", index: normalizedIndex });
    setAnnouncement(`${VIDEOFIGURE_LOOKS[normalizedIndex].name} 선택, 000도`);
    scheduleResume();
  };

  const stepAngle = (delta: -1 | 1) => {
    dispatch({ type: "manual-start" });
    dispatch({ type: "step-angle", delta, manual: true });
    setAnnouncement(`${look.name} 각도 수동 변경`);
    scheduleResume(700);
  };

  const selectAngle = (index: number) => {
    dispatch({ type: "manual-start" });
    dispatch({ type: "select-angle", index, manual: true });
    setAnnouncement(`${look.name} ${VIDEOFIGURE_ANGLES[index]}도 선택`);
    scheduleResume(700);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, lastX: event.clientX, active: false };
    dispatch({ type: "manual-start" });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const total = event.clientX - drag.startX;
    if (!drag.active && Math.abs(total) < 12) return;
    if (!drag.active) {
      drag.active = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const step = angleStepFromHorizontalDelta(event.clientX - drag.lastX, 24);
    if (!step) return;
    drag.lastX = event.clientX;
    dispatch({ type: "step-angle", delta: step, manual: true });
  };

  const releasePointer = (event?: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (event && drag?.active && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    scheduleResume(700);
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (window.matchMedia("(max-width: 720px)").matches) return;
    if (Math.abs(event.deltaY) < 18) return;
    event.preventDefault();
    selectLook(state.lookIndex + (event.deltaY > 0 ? 1 : -1));
  };

  const toggleSaved = () => {
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(look.id)) next.delete(look.id); else next.add(look.id);
      return next;
    });
    setAnnouncement(`${look.name} 저장 상태 변경. Design Lab 세션에만 유지됩니다.`);
  };

  const openModal = (trigger: HTMLElement | null) => {
    triggerRef.current = trigger;
    dispatch({ type: "manual-start" });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    scheduleResume(900);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [scheduleResume]);

  useEffect(() => {
    if (!modalOpen) return;
    requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = modalRef.current?.querySelectorAll<HTMLElement>("button,input,[href],[tabindex]:not([tabindex='-1'])");
      if (!nodes?.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  const filtered = VIDEOFIGURE_LOOKS.map((item, index) => ({ item, index })).filter(({ item }) => {
    if (filter === "all") return true;
    if (filter === "saved") return saved.has(item.id);
    return item.gender === filter;
  });

  const style = {
    "--vf-accent": look.accent,
    "--vf-accent-rgb": look.accentRgb,
    "--vf-scene": look.background,
  } as CSSProperties;

  return (
    <section className={`lt58-videofigure${reducedMotion ? " is-reduced-motion" : ""}`} style={style}>
      <div className="lt58-videofigure__scene" aria-hidden="true"><i className="lt58-videofigure__ring" /><i className="lt58-videofigure__horizon" /><i className="lt58-videofigure__stars" /></div>
      <div className="lt58-videofigure__bar">
        <div className="lt58-videofigure__brand"><span>LT</span><b>LOVE TREE</b><small>VIDEO FIGURE ATELIER</small></div>
        <div className="lt58-videofigure__status"><i /> FIGURE ARCHIVE · 10 LOOKS · 80 FRAMES</div>
        <div className="lt58-videofigure__actions">
          <button type="button" aria-pressed={state.playing && !reducedMotion} onClick={() => dispatch({ type: state.playing ? "pause" : "play" })}>{state.playing && !reducedMotion ? "Ⅱ AUTO 360°" : "▶ PLAY 360°"}</button>
          <button type="button" onClick={(event) => openModal(event.currentTarget)}>IMPORT SOURCE DEMO</button>
        </div>
      </div>

      <div className="lt58-videofigure__info">
        <div className="lt58-videofigure__index"><b>{String(state.lookIndex + 1).padStart(2, "0")}</b><i /><span>{look.kind} · {look.gender.toUpperCase()}</span></div>
        <h2>{look.title}</h2>
        <strong className="lt58-videofigure__kicker">{look.kicker}</strong>
        <p>{look.description}</p>
        <div className="lt58-videofigure__meta">
          <span><small>IDENTITY</small><b>{look.identityScore}</b></span>
          <span><small>OUTFIT</small><b>{look.outfitScore}</b></span>
          <span><small>VIEWS</small><b>08</b></span>
        </div>
        <div className="lt58-videofigure__info-actions">
          <button type="button" className="is-primary" aria-pressed={saved.has(look.id)} onClick={toggleSaved}>{saved.has(look.id) ? "♥ LOOK SAVED" : "♡ SAVE LOOK"}</button>
          <button type="button" onClick={() => selectLook(state.lookIndex + 1)}>NEXT LOOK →</button>
        </div>
      </div>

      <div
        className="lt58-videofigure__figure-zone"
        role="group"
        aria-label={`${look.name} 8방향 피규어. 좌우 드래그 또는 각도 버튼으로 회전합니다.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onLostPointerCapture={() => { dragRef.current = null; scheduleResume(700); }}
        onWheel={onWheel}
      >
        <div className="lt58-videofigure__viewport">
          {!assetError ? <img key={`${look.id}-${angle}`} src={currentAsset.path} alt={`${look.name} ${angle}도 source Figure`} onError={() => setAssetError(true)} draggable={false} /> : (
            <div className="lt58-videofigure__asset-hold" role="status">
              <b>EXACT SOURCE FRAME HOLD</b>
              <span>{look.id}_{angle}.png</span>
              <small>Approximate/generated substitute is intentionally blocked.</small>
            </div>
          )}
        </div>
        <div className="lt58-videofigure__angle-controls" role="group" aria-label="Figure angle controls">
          <button type="button" onClick={(event) => { event.stopPropagation(); stepAngle(-1); }} aria-label="이전 각도">←</button>
          <div>{VIDEOFIGURE_ANGLES.map((item, index) => <button key={item} type="button" className={index === state.angleIndex ? "is-active" : ""} aria-pressed={index === state.angleIndex} onClick={(event) => { event.stopPropagation(); selectAngle(index); }} aria-label={`${item}도`}>{item}</button>)}</div>
          <button type="button" onClick={(event) => { event.stopPropagation(); stepAngle(1); }} aria-label="다음 각도">→</button>
        </div>
        <small className="lt58-videofigure__drag-hint">DRAG HORIZONTALLY · ANGLE {angle}° · {state.manuallyOwned ? "MANUAL AUTHORITY" : state.playing ? "AUTO AUTHORITY" : "PAUSED"}</small>
      </div>

      <aside className="lt58-videofigure__panel" aria-label="VideoFigure look archive">
        <div className="lt58-videofigure__panel-head"><small>VIDEO MOMENT FIGURES</small><div><strong>Favorite Looks</strong><span>{filtered.length} / 10</span></div>
          <div className="lt58-videofigure__filters" role="group" aria-label="Look filters">
            {(["all","male","female","saved"] as const).map((item) => <button key={item} type="button" aria-pressed={filter === item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>{item.toUpperCase()}</button>)}
          </div>
        </div>
        <div className="lt58-videofigure__grid">
          {filtered.map(({ item, index }) => <button type="button" key={item.id} className={`lt58-videofigure__card${index === state.lookIndex ? " is-active" : ""}`} aria-pressed={index === state.lookIndex} onClick={() => selectLook(index)} style={{ "--card-accent": item.accent, "--card-rgb": item.accentRgb } as CSSProperties}>
            <span className="lt58-videofigure__card-figure" aria-hidden="true">{item.id}</span><small>{String(index + 1).padStart(2, "0")} · {item.gender.toUpperCase()}</small><strong>{item.name}</strong><span>{item.lookLabel}</span>
          </button>)}
          {filtered.length === 0 ? <p className="lt58-videofigure__empty">저장된 source-demo Look이 없습니다.</p> : null}
        </div>
        <div className="lt58-videofigure__panel-foot"><div><strong>Choose your video look.</strong><span>SOURCE DEMO · NON-PERSISTENT</span></div><button type="button" onClick={(event) => openModal(event.currentTarget)}>IMPORT</button></div>
      </aside>

      <div className="lt58-videofigure__provenance">
        <span>SOURCE MOMENT</span><b>{moment.id}</b><span>MEDIA</span><b>{moment.sourceMediaId}</b><span>RANGE</span><b>{look.sourceDisplay}</b>
        <button type="button" disabled title="Adapter contract only — no duplicate video player in this Design Lab candidate">VIEW SOURCE MOMENT · ADAPTER CONTRACT</button>
      </div>

      <div className="lt58-videofigure__gate" data-pass={assetGate.exactGatePass ? "true" : "false"}>
        <strong>{assetGate.exactGatePass ? "80/80 EXACT ASSET PASS" : LINEAGE_58_VIDEOFIGURE_ASSET_HOLD}</strong>
        <span>registered {assetGate.registered}/80 · full fingerprints {assetGate.metadataComplete}/80</span>
      </div>

      <div className="sr-only" aria-live="polite">{announcement}</div>

      {modalOpen ? <div className="lt58-videofigure__modal" onMouseDown={(event) => { if (event.currentTarget === event.target) closeModal(); }}>
        <section ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="lt58-import-title" className="lt58-videofigure__sheet">
          <header><div><small>SOURCE DEMO / NON-PERSISTENT / SIMULATED</small><h3 id="lt58-import-title">Upload your favorite video</h3></div><button ref={closeRef} type="button" onClick={closeModal} aria-label="닫기">×</button></header>
          <div className="lt58-videofigure__demo-boundary">
            <b>이 원본의 extraction 단계는 실제 backend/media pipeline이 아닙니다.</b>
            <p>SCENE CUT · FACE LOCK · OUTFIT LOCK · 8-VIEW BUILD · “100 MOMENTS FOUND”는 source prototype의 simulation입니다. 이 Design Lab 후보는 이를 production truth로 실행하지 않습니다.</p>
          </div>
          <label className="lt58-videofigure__drop">LOCAL FILE LABEL ONLY<input type="file" accept="video/*" onChange={(event) => setLocalFilename(event.target.files?.[0]?.name ?? "")} /><span>{localFilename || "파일을 선택해도 업로드·분석·저장하지 않습니다."}</span></label>
          <div className="lt58-videofigure__fake-steps" aria-label="Source-only simulated extraction labels">{["SCENE CUT","FACE LOCK","OUTFIT LOCK","8-VIEW BUILD"].map((step) => <span key={step}>{step}<small>SIMULATED</small></span>)}</div>
          <button type="button" className="is-primary" onClick={closeModal}>RETURN TO FIGURE ARCHIVE</button>
        </section>
      </div> : null}

      <footer className="lt58-videofigure__source-note">Lineage 58 · V2 current Revision · {LINEAGE_58_VIDEOFIGURE_SOURCE.renderingTier} · rights: design fixture only</footer>
    </section>
  );
}
