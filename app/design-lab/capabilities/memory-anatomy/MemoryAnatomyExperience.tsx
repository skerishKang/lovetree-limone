"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import Link from "next/link";
import {
  MEMORY_ANATOMY_LAYER_IDS,
  SYNTHETIC_MEMORY_FIXTURE,
  adjacentLayerId,
  createMemoryAnatomyState,
  memoryAnatomyReducer,
  memoryLayerTransform,
  projectMomentToMemoryAnatomy,
  selectedMemoryLayer,
  type MemoryAnatomyLayerId,
} from "@/lib/memory-anatomy";
import styles from "./memory-anatomy.module.css";

const COLORS = ["#52d9ff", "#8d7cff", "#ff5eaa", "#ffb35e", "#fd6b7d", "#d8a4ff", "#59f0c0"] as const;

export function MemoryAnatomyExperience() {
  const layers = useMemo(() => projectMomentToMemoryAnatomy(SYNTHETIC_MEMORY_FIXTURE), []);
  const [state, dispatch] = useReducer(memoryAnatomyReducer, undefined, createMemoryAnatomyState);
  const [spatialAuthority, setSpatialAuthority] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const layerRefs = useRef<Record<MemoryAnatomyLayerId, HTMLButtonElement | null>>({
    "source-video": null,
    "moment-cut": null,
    "person-lock": null,
    "outfit-map": null,
    emotion: null,
    "my-note": null,
    connection: null,
  });
  const selected = selectedMemoryLayer(layers, state);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (state.playback !== "playing") return;
    const timer = window.setTimeout(() => dispatch({ type: "playback-tick" }), 850);
    return () => window.clearTimeout(timer);
  }, [state.playback, state.playbackStep]);

  function selectLayer(id: MemoryAnatomyLayerId) {
    dispatch({ type: "select-layer", id });
  }

  function focusAdjacent(current: MemoryAnatomyLayerId, delta: -1 | 1) {
    const next = adjacentLayerId(current, delta);
    dispatch({ type: "select-layer", id: next });
    window.requestAnimationFrame(() => layerRefs.current[next]?.focus());
  }

  function onLayerKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: MemoryAnatomyLayerId) {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      focusAdjacent(id, 1);
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      focusAdjacent(id, -1);
    }
  }

  function stopDragging(pointerId?: number) {
    const active = dragRef.current;
    if (!active || (pointerId !== undefined && active.pointerId !== pointerId)) return;
    dragRef.current = null;
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!spatialAuthority) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    dispatch({ type: "pause" });
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    dispatch({ type: "rotate-by", deltaX: event.clientX - active.x, deltaY: event.clientY - active.y });
    active.x = event.clientX;
    active.y = event.clientY;
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    stopDragging(event.pointerId);
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    if (!spatialAuthority) return;
    event.preventDefault();
    dispatch({ type: "set-explosion", value: state.explosion + event.deltaY * 0.0008 });
  }

  function togglePlayback() {
    if (state.playback === "playing") dispatch({ type: "pause" });
    else if (state.playback === "complete") dispatch({ type: "replay" });
    else dispatch({ type: "play" });
  }

  const stackStyle = {
    "--rotation-x": `${reducedMotion ? 0 : state.rotationX}deg`,
    "--rotation-y": `${reducedMotion ? 0 : state.rotationY}deg`,
  } as CSSProperties;

  return (
    <main className={styles.page} data-reduced-motion={reducedMotion ? "true" : "false"}>
      <header className={styles.topbar}>
        <div>
          <Link href="/design-lab" className={styles.back}>← DESIGN LAB</Link>
          <strong>SEMANTIC MEMORY EXPLODED VIEW</strong>
        </div>
        <span>CAPABILITY CANDIDATE · ISSUE #140</span>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>THE ANATOMY OF ONE MOMENT</p>
          <h1>One Moment.<br /><em>Seven semantic layers.</em></h1>
          <p>원본, 선택 구간, 인물, 외형/맥락, 감정, 개인 메모, 다음 Connection을 하나의 canonical Moment projection에서 분해하고 다시 조립합니다.</p>
        </div>
        <aside className={styles.fixtureNotice} aria-label="Synthetic fixture boundary">
          <b>SYNTHETIC FIXTURE · NO AI/DB SCORE</b>
          <span>이 화면의 데이터는 Design Lab용 in-memory fixture입니다. 실제 identity confidence나 route strength를 주장하지 않습니다.</span>
        </aside>
      </section>

      <section className={styles.workspace}>
        <aside className={styles.controls}>
          <div className={styles.sectionLabel}>2D ACCESSIBILITY VIEW</div>
          <div className={styles.layerList} aria-label="Memory anatomy layers">
            {layers.map((layer) => (
              <button
                key={layer.id}
                ref={(node) => { layerRefs.current[layer.id] = node; }}
                type="button"
                className={`${styles.layerChoice} ${layer.id === state.selectedLayerId ? styles.activeChoice : ""}`}
                style={{ "--layer-color": COLORS[layer.index] } as CSSProperties}
                aria-current={layer.id === state.selectedLayerId ? "step" : undefined}
                onClick={() => selectLayer(layer.id)}
                onKeyDown={(event) => onLayerKeyDown(event, layer.id)}
              >
                <i aria-hidden="true" />
                <span><small>0{layer.index + 1}</small><b>{layer.title}</b></span>
                <em>{layer.subtitle}</em>
              </button>
            ))}
          </div>

          <div className={styles.sectionLabel}>EXPLOSION</div>
          <label className={styles.sliderLabel}>
            <span>{Math.round(state.explosion * 100)}%</span>
            <input
              aria-label="Explosion amount"
              type="range"
              min="0"
              max="100"
              value={Math.round(state.explosion * 100)}
              onChange={(event) => dispatch({ type: "set-explosion", value: Number(event.target.value) / 100 })}
            />
          </label>
          <div className={styles.buttonRow}>
            <button type="button" onClick={() => dispatch({ type: "assemble" })}>ASSEMBLE</button>
            <button type="button" onClick={() => dispatch({ type: "explode" })}>EXPLODE</button>
          </div>

          <button type="button" className={styles.spatialToggle} aria-pressed={spatialAuthority} onClick={() => { setSpatialAuthority((value) => !value); stopDragging(); }}>
            {spatialAuthority ? "EXIT SPATIAL CONTROL" : "ENABLE SPATIAL CONTROL"}
          </button>
          <p className={styles.microcopy}>Wheel is consumed only while spatial control is explicitly enabled. Otherwise the outer page keeps scroll authority.</p>
        </aside>

        <section className={styles.stageShell} aria-label="Spatial memory anatomy renderer">
          <div
            className={`${styles.stage} ${spatialAuthority ? styles.stageActive : ""}`}
            data-spatial-authority={spatialAuthority ? "true" : "false"}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onLostPointerCapture={(event) => stopDragging(event.pointerId)}
            onWheel={onWheel}
            onKeyDown={(event) => {
              if (event.key === "Escape") { setSpatialAuthority(false); stopDragging(); }
            }}
          >
            <div className={styles.grid} aria-hidden="true" />
            <div className={styles.orbitRing} aria-hidden="true" />
            <div className={styles.stack} style={stackStyle} aria-hidden="true">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className={`${styles.spatialLayer} ${layer.id === state.selectedLayerId ? styles.activeLayer : ""}`}
                  style={{
                    "--layer-color": COLORS[layer.index],
                    transform: memoryLayerTransform(layer.index, state),
                  } as CSSProperties}
                  onClick={(event) => { event.stopPropagation(); selectLayer(layer.id); }}
                >
                  <span>0{layer.index + 1} · {layer.title}</span>
                  <strong>{layer.title}<small>{layer.subtitle}</small></strong>
                  <em>Z / {layer.index + 1}00</em>
                </div>
              ))}
            </div>
            <div className={styles.stageStatus} aria-live="polite">
              {spatialAuthority ? "SPATIAL CONTROL ACTIVE" : "OUTER PAGE SCROLL ACTIVE"} · {state.playback.toUpperCase()}
            </div>
          </div>
        </section>

        <aside className={styles.inspector} aria-live="polite">
          <p className={styles.eyebrow}>SELECTED LAYER · 0{selected.index + 1}</p>
          <div className={styles.layerNumber} style={{ color: COLORS[selected.index] }}>{String(selected.index + 1).padStart(2, "0")}</div>
          <h2>{selected.title}</h2>
          <strong>{selected.subtitle}</strong>
          <p>{selected.description}</p>
          <dl>
            {selected.meta.map((item, index) => <div key={`${selected.id}-${index}`}><dt>{index === 0 ? "PRIMARY" : "DETAIL"}</dt><dd>{item}</dd></div>)}
          </dl>
          <div className={styles.chips}>{selected.chips.map((chip) => <span key={chip}>{chip}</span>)}</div>

          <div className={styles.transport}>
            <button type="button" className={styles.playButton} onClick={togglePlayback}>
              {state.playback === "playing" ? "Ⅱ PAUSE STORY" : state.playback === "complete" ? "↻ REPLAY STORY" : "▶ PLAY 1→7 STORY"}
            </button>
            <button type="button" onClick={() => dispatch({ type: "replay" })}>REPLAY FROM 01</button>
            <div className={styles.progress} aria-label={`Playback step ${state.playbackStep + 1} of 7`}>
              <i style={{ width: `${((state.playbackStep + 1) / MEMORY_ANATOMY_LAYER_IDS.length) * 100}%` }} />
            </div>
            <small>Manual layer selection, drag, wheel, assemble or explode pauses active playback immediately. Completion returns the stack to assembled state.</small>
          </div>
        </aside>
      </section>
    </main>
  );
}
