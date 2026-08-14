"use client";

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  TRACK63_CONNECTIONS,
  TRACK63_MOMENTS,
  TRACK63_MOMENT_BY_ID,
  TRACK63_SEED_SETS,
} from "@/lib/lineage-63/data";
import {
  createInitialStudioState,
  reduceStudioState,
} from "@/lib/lineage-63/state";
import type {
  CardTransform3D,
  Track63Moment,
  ViewFamily,
} from "@/lib/lineage-63/types";
import {
  TRACK63_VIEW_BY_ID,
  TRACK63_VIEW_DEFINITIONS,
} from "@/lib/lineage-63/view-definitions";
import styles from "./lineage-63.module.css";

const VIEW_FAMILIES: readonly (("all" | ViewFamily))[] = [
  "all", "orbit", "wall", "stack", "cascade", "flow", "symbolic", "timeline", "cluster",
];

export default function Lineage63ViewStudio() {
  const [state, dispatch] = useReducer(reduceStudioState, undefined, createInitialStudioState);
  const [familyFilter, setFamilyFilter] = useState<"all" | ViewFamily>("all");
  const [newPresetName, setNewPresetName] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mobileTab, setMobileTab] = useState<"presets" | "stage" | "inspector">("stage");

  const stageDragRef = useRef<{ pointerId: number; startX: number; startY: number; startRotX: number; startRotY: number; active: boolean } | null>(null);
  const saveModalInputRef = useRef<HTMLInputElement | null>(null);
  const playbackTimerRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  // Prefers-reduced-motion listener
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Continuous auto-rotate playback loop
  useEffect(() => {
    if (!state.playing || reducedMotion) {
      if (playbackTimerRef.current) cancelAnimationFrame(playbackTimerRef.current);
      return;
    }

    let lastTime = performance.now();
    const frame = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      const speed = state.parameters.speed || 1.0;
      const phaseDelta = (delta * 0.05 * speed) % 1;
      dispatch({ type: "set-scrub-phase", phase: (state.scrubPhase + phaseDelta) % 1 });
      playbackTimerRef.current = requestAnimationFrame(frame);
    };

    playbackTimerRef.current = requestAnimationFrame(frame);
    return () => {
      if (playbackTimerRef.current) cancelAnimationFrame(playbackTimerRef.current);
    };
  }, [state.playing, state.scrubPhase, state.parameters.speed, reducedMotion]);

  // Active seed set & moments
  const activeSeed = useMemo(
    () => TRACK63_SEED_SETS.find((s) => s.id === state.selectedSeedId) ?? TRACK63_SEED_SETS[0],
    [state.selectedSeedId],
  );

  const activeMoments = useMemo(() => {
    let list = activeSeed.momentIds
      .map((id) => TRACK63_MOMENT_BY_ID.get(id))
      .filter((m): m is Track63Moment => Boolean(m));

    if (state.parameters.mediaFilter !== "all") {
      list = list.filter((m) => m.mediaType === state.parameters.mediaFilter);
    }
    return list;
  }, [activeSeed, state.parameters.mediaFilter]);

  const activeViewDef = useMemo(
    () => TRACK63_VIEW_BY_ID.get(state.selectedViewId) ?? TRACK63_VIEW_DEFINITIONS[0],
    [state.selectedViewId],
  );

  const selectedMoment = useMemo(
    () => (state.selectedMomentId ? TRACK63_MOMENT_BY_ID.get(state.selectedMomentId) ?? null : null),
    [state.selectedMomentId],
  );

  // Relevant connection for selected moment
  const selectedConnection = useMemo(() => {
    if (!state.selectedMomentId) return null;
    return (
      TRACK63_CONNECTIONS.find((c) => c.sourceId === state.selectedMomentId || c.targetId === state.selectedMomentId) ?? null
    );
  }, [state.selectedMomentId]);

  // Filtered view definitions by family
  const filteredViewDefs = useMemo(() => {
    if (familyFilter === "all") return TRACK63_VIEW_DEFINITIONS;
    return TRACK63_VIEW_DEFINITIONS.filter((v) => v.family === familyFilter);
  }, [familyFilter]);

  // Compute 3D card transforms
  const cardTransforms = useMemo(() => {
    return activeMoments.map((moment, index) => {
      const transform = activeViewDef.project(
        activeMoments,
        state.parameters,
        index,
        activeMoments.length,
        state.scrubPhase,
      );
      return { moment, transform };
    });
  }, [activeMoments, activeViewDef, state.parameters, state.scrubPhase]);

  // Pointer drag for manual camera rotation
  const onPointerDownStage = (event: ReactPointerEvent<HTMLDivElement>) => {
    stageDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotX: state.parameters.rotationX,
      startRotY: state.parameters.rotationY,
      active: true,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMoveStage = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = stageDragRef.current;
    if (!drag || !drag.active || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const newRotY = ((drag.startRotY + deltaX * 0.4 + 180) % 360) - 180;
    const newRotX = Math.max(-90, Math.min(90, drag.startRotX - deltaY * 0.4));
    dispatch({ type: "set-params", params: { rotationX: newRotX, rotationY: newRotY } });
  };

  const onPointerUpStage = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (stageDragRef.current?.active && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stageDragRef.current = null;
  };

  // Keyboard shortcut handler
  const onKeyDownRoot = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "z") {
      event.preventDefault();
      if (event.shiftKey) dispatch({ type: "redo" });
      else dispatch({ type: "undo" });
    } else if (event.key === " ") {
      // Space toggles play/pause unless focused on an input/textarea
      const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag !== "input" && tag !== "textarea" && tag !== "select") {
        event.preventDefault();
        dispatch({ type: "set-playing", playing: !state.playing });
      }
    } else if (event.key === "Escape") {
      dispatch({ type: "set-overlay-modal", modal: "none" });
    }
  };

  const openSaveModal = useCallback(() => {
    setNewPresetName(`${activeViewDef.label} (Custom ${state.savedPresets.length + 1})`);
    dispatch({ type: "set-overlay-modal", modal: "save-preset" });
    setTimeout(() => saveModalInputRef.current?.focus(), 50);
  }, [activeViewDef.label, state.savedPresets.length]);

  return (
    <div className={styles.page} onKeyDown={onKeyDownRoot} tabIndex={0}>
      {/* Header Topbar */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <a href="/design-lab" className={styles.backLink}>← DESIGN LAB</a>
          <div className={styles.titleArea}>
            <h1>MOMENT FIELD 3D VIEW STUDIO <span className={styles.badge}>LINEAGE 63 · V1.1 PROVING</span></h1>
          </div>
        </div>
        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => dispatch({ type: "undo" })}
            title="실행 취소 (Ctrl+Z)"
          >
            ↺ UNDO
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => dispatch({ type: "redo" })}
            title="다시 실행 (Shift+Ctrl+Z)"
          >
            ↻ REDO
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => dispatch({ type: "reset-params" })}
            title="파라미터 초기화"
          >
            RESET
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={openSaveModal}
          >
            ★ SAVE VIEW
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => dispatch({ type: "set-overlay-modal", modal: "service-handoff" })}
          >
            MY TREE
          </button>
        </div>
      </header>

      {/* Main Workspace 3-Column Layout */}
      <main className={styles.workspace}>
        {/* Left Sidebar: Seed Sets & 44 Presets */}
        <aside
          className={styles.sidebarLeft}
          style={{ display: mobileTab === "presets" || typeof window === "undefined" || window.innerWidth > 768 ? "flex" : "none" }}
          aria-label="Preset Library"
        >
          {/* Seed Sets */}
          <div>
            <h2 className={styles.sectionTitle}>
              SEED DATASET <span>({TRACK63_SEED_SETS.length})</span>
            </h2>
            <div className={styles.seedSelectGroup} role="group" aria-label="Seed datasets">
              {TRACK63_SEED_SETS.map((seed) => (
                <button
                  key={seed.id}
                  type="button"
                  className={`${styles.seedCard} ${state.selectedSeedId === seed.id ? styles.seedCardActive : ""}`}
                  onClick={() => dispatch({ type: "select-seed", seedId: seed.id })}
                >
                  <div className={styles.seedCardTitle}>{seed.label}</div>
                  <div className={styles.seedCardDesc}>{seed.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Saved Presets */}
          {state.savedPresets.length > 0 && (
            <div>
              <h2 className={styles.sectionTitle}>
                SAVED PRESETS <span>({state.savedPresets.length})</span>
              </h2>
              <div className={styles.seedSelectGroup}>
                {state.savedPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={styles.seedCard}
                    onClick={() => dispatch({ type: "restore-preset", presetId: preset.id })}
                  >
                    <div className={styles.seedCardTitle}>★ {preset.name}</div>
                    <div className={styles.seedCardDesc}>{preset.viewDefinitionId} · {new Date(preset.createdAt).toLocaleTimeString()}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* View Preset Library (44 Presets) */}
          <div>
            <h2 className={styles.sectionTitle}>
              VIEW PRESETS <span>({TRACK63_VIEW_DEFINITIONS.length})</span>
            </h2>
            <div className={styles.familyTabs} role="tablist">
              {VIEW_FAMILIES.map((fam) => (
                <button
                  key={fam}
                  type="button"
                  role="tab"
                  aria-selected={familyFilter === fam}
                  className={`${styles.familyTabBtn} ${familyFilter === fam ? styles.familyTabBtnActive : ""}`}
                  onClick={() => setFamilyFilter(fam)}
                >
                  {fam}
                </button>
              ))}
            </div>
            <div className={styles.presetGrid}>
              {filteredViewDefs.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={`${styles.presetCard} ${state.selectedViewId === view.id ? styles.presetCardActive : ""}`}
                  onClick={() => dispatch({ type: "select-view", viewId: view.id })}
                >
                  <span className={styles.presetCardName}>{view.label}</span>
                  <span className={styles.presetCardFamily}>{view.family} · {view.description}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center Stage: 3D Viewport (CSS3D DOM) */}
        <section
          className={styles.stageContainer}
          style={{ display: mobileTab === "stage" || typeof window === "undefined" || window.innerWidth > 768 ? "flex" : "none" }}
          onPointerDown={onPointerDownStage}
          onPointerMove={onPointerMoveStage}
          onPointerUp={onPointerUpStage}
          aria-label="3D Viewport"
        >
          {state.parameters.wireframeGuides && <div className={styles.wireframeGrid} />}

          <div
            className={styles.world3D}
            style={{
              transform: `translateZ(${-state.parameters.cameraDistance}px) rotateX(${state.parameters.rotationX}deg) rotateY(${state.parameters.rotationY}deg) rotateZ(${state.parameters.rotationZ}deg)`,
            }}
          >
            {cardTransforms.map(({ moment, transform }) => {
              const isSelected = state.selectedMomentId === moment.id;
              const cardStyle: CSSProperties = {
                transform: `translate3d(${transform.x.toFixed(1)}px, ${transform.y.toFixed(1)}px, ${transform.z.toFixed(1)}px) rotateX(${transform.rx.toFixed(1)}deg) rotateY(${transform.ry.toFixed(1)}deg) rotateZ(${transform.rz.toFixed(1)}deg) scale(${transform.scale.toFixed(2)})`,
                opacity: transform.opacity,
                borderColor: isSelected ? "#ff7597" : undefined,
              };

              return (
                <div
                  key={moment.id}
                  className={`${styles.momentCard3D} ${isSelected ? styles.momentCardSelected : ""} ${state.parameters.compactCards ? styles.momentCardCompact : ""}`}
                  style={cardStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "select-moment", momentId: moment.id });
                    if (moment.mediaType === "video") {
                      dispatch({ type: "set-active-media-playing", momentId: moment.id });
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${moment.title} (${moment.mediaType})`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      dispatch({ type: "select-moment", momentId: moment.id });
                    }
                  }}
                >
                  <div className={styles.cardHeader}>
                    <span className={`${styles.mediaBadge} ${styles[`badge${moment.mediaType.charAt(0).toUpperCase() + moment.mediaType.slice(1)}`]}`}>
                      {moment.mediaType}
                    </span>
                    {moment.isMainPath && state.parameters.highlightMainPath && (
                      <span className={styles.mainPathPin}>MAIN</span>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitle}>{moment.title}</div>
                    {moment.memoText && (
                      <div className={styles.cardPreviewText}>"{moment.memoText.slice(0, 36)}…"</div>
                    )}
                  </div>
                  <div className={styles.cardFooter}>
                    <span>{moment.subject}</span>
                    <span>{moment.date.slice(5)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Sidebar: 48 Inspector Controls */}
        <aside
          className={styles.sidebarRight}
          style={{ display: mobileTab === "inspector" || typeof window === "undefined" || window.innerWidth > 768 ? "flex" : "none" }}
          aria-label="Inspector Panel"
        >
          {/* Selected Moment Summary */}
          {selectedMoment && (
            <div className={styles.selectedInspectorCard}>
              <div className={styles.cardHeader}>
                <span className={`${styles.mediaBadge} ${styles[`badge${selectedMoment.mediaType.charAt(0).toUpperCase() + selectedMoment.mediaType.slice(1)}`]}`}>
                  {selectedMoment.mediaType.toUpperCase()}
                </span>
                <button
                  type="button"
                  className={styles.actionBtn}
                  style={{ padding: "2px 6px", fontSize: "10px" }}
                  onClick={() => dispatch({ type: "set-overlay-modal", modal: "media-inspect" })}
                >
                  EXPAND ↗
                </button>
              </div>
              <div className={styles.selectedMomentTitle}>{selectedMoment.title}</div>
              <div className={styles.selectedMomentMeta}>
                <span>인물: {selectedMoment.subject}</span>
                <span>일자: {selectedMoment.date}</span>
                <span>테마: {selectedMoment.theme}</span>
              </div>
              <div className={styles.selectedMomentCaption}>{selectedMoment.caption}</div>
              {selectedConnection && (
                <div className={styles.whyNextBox}>
                  <strong>WHY NEXT:</strong> {selectedConnection.whyNext}
                </div>
              )}
            </div>
          )}

          {/* Inspector Tabs (Layout, Style, Motion, Connections) */}
          <div className={styles.inspectorTabs} role="tablist">
            {(["layout", "style", "motion", "connections"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={state.inspectorTab === tab}
                className={`${styles.inspectorTabBtn} ${state.inspectorTab === tab ? styles.inspectorTabBtnActive : ""}`}
                onClick={() => dispatch({ type: "set-inspector-tab", tab })}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab 1: Layout Controls */}
          {state.inspectorTab === "layout" && (
            <div className={styles.controlGroup}>
              {/* Range: spread */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Spread (분산 반경)</span>
                  <span className={styles.controlValue}>{state.parameters.spread}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  value={state.parameters.spread}
                  onChange={(e) => dispatch({ type: "update-param", key: "spread", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Range: spacingX */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Spacing X (가로 간격)</span>
                  <span className={styles.controlValue}>{state.parameters.spacingX}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="300"
                  value={state.parameters.spacingX}
                  onChange={(e) => dispatch({ type: "update-param", key: "spacingX", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Range: spacingY */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Spacing Y (세로 간격)</span>
                  <span className={styles.controlValue}>{state.parameters.spacingY}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="300"
                  value={state.parameters.spacingY}
                  onChange={(e) => dispatch({ type: "update-param", key: "spacingY", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Range: spacingZ */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Spacing Z (깊이 간격)</span>
                  <span className={styles.controlValue}>{state.parameters.spacingZ}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="400"
                  value={state.parameters.spacingZ}
                  onChange={(e) => dispatch({ type: "update-param", key: "spacingZ", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Range: curvature */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Curvature (곡면 강도)</span>
                  <span className={styles.controlValue}>{state.parameters.curvature}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.parameters.curvature}
                  onChange={(e) => dispatch({ type: "update-param", key: "curvature", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Range: elevation */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Elevation (고도 단차)</span>
                  <span className={styles.controlValue}>{state.parameters.elevation}</span>
                </div>
                <input
                  type="range"
                  min="-300"
                  max="300"
                  value={state.parameters.elevation}
                  onChange={(e) => dispatch({ type: "update-param", key: "elevation", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Segmented: layoutAlignment */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}><span>Layout Alignment</span></div>
                <div className={styles.segmentedControl}>
                  {(["center-anchored", "ground-plane", "skyline-top"] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      className={`${styles.segmentedBtn} ${state.parameters.layoutAlignment === align ? styles.segmentedBtnActive : ""}`}
                      onClick={() => dispatch({ type: "update-param", key: "layoutAlignment", value: align })}
                    >
                      {align.split("-")[0]}
                    </button>
                  ))}
                </div>
              </div>
              {/* Select: sortOrder */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}><span>Sort Order</span></div>
                <select
                  value={state.parameters.sortOrder}
                  onChange={(e) => dispatch({ type: "update-param", key: "sortOrder", value: e.target.value })}
                  className={styles.selectInput}
                >
                  <option value="chronological">시간 순서 (Chronological)</option>
                  <option value="theme">테마별 정렬 (Theme)</option>
                  <option value="media-type">미디어 유형 (Media Type)</option>
                  <option value="connection-count">연결 강도 (Connection Count)</option>
                </select>
              </div>
              {/* Toggle: compactCards */}
              <div className={styles.toggleRow}>
                <span>Compact Cards (카드 소형화)</span>
                <input
                  type="checkbox"
                  checked={state.parameters.compactCards}
                  onChange={(e) => dispatch({ type: "update-param", key: "compactCards", value: e.target.checked })}
                  className={styles.toggleInput}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Style Controls */}
          {state.inspectorTab === "style" && (
            <div className={styles.controlGroup}>
              {/* Range: cardScale */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Card Scale</span>
                  <span className={styles.controlValue}>{state.parameters.cardScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.0"
                  step="0.05"
                  value={state.parameters.cardScale}
                  onChange={(e) => dispatch({ type: "update-param", key: "cardScale", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Range: cardDepth */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Card Depth</span>
                  <span className={styles.controlValue}>{state.parameters.cardDepth}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={state.parameters.cardDepth}
                  onChange={(e) => dispatch({ type: "update-param", key: "cardDepth", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Range: glowIntensity */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Glow Intensity</span>
                  <span className={styles.controlValue}>{state.parameters.glowIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.parameters.glowIntensity}
                  onChange={(e) => dispatch({ type: "update-param", key: "glowIntensity", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Range: blurFalloff */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Blur Falloff</span>
                  <span className={styles.controlValue}>{state.parameters.blurFalloff}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.parameters.blurFalloff}
                  onChange={(e) => dispatch({ type: "update-param", key: "blurFalloff", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Select: themePalette */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}><span>Theme Palette</span></div>
                <select
                  value={state.parameters.themePalette}
                  onChange={(e) => dispatch({ type: "update-param", key: "themePalette", value: e.target.value })}
                  className={styles.selectInput}
                >
                  <option value="midnight-violet">미드나잇 바이올렛 (Midnight)</option>
                  <option value="aurora-cyan">오로라 시안 (Aurora)</option>
                  <option value="rose-velvet">로즈 벨벳 (Rose Velvet)</option>
                  <option value="deep-space">딥 스페이스 (Deep Space)</option>
                </select>
              </div>
              {/* Select: cardAspectRatio */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}><span>Card Aspect Ratio</span></div>
                <select
                  value={state.parameters.cardAspectRatio}
                  onChange={(e) => dispatch({ type: "update-param", key: "cardAspectRatio", value: e.target.value })}
                  className={styles.selectInput}
                >
                  <option value="source">원본 비율 (Source)</option>
                  <option value="square">1:1 정사각형 (Square)</option>
                  <option value="portrait">3:4 세로형 (Portrait)</option>
                  <option value="cinema">16:9 시네마 (Cinema)</option>
                </select>
              </div>
              {/* Toggles: cardShadow, cardReflection, showBadges */}
              <div className={styles.toggleRow}>
                <span>Card Shadow (그림자 효과)</span>
                <input
                  type="checkbox"
                  checked={state.parameters.cardShadow}
                  onChange={(e) => dispatch({ type: "update-param", key: "cardShadow", value: e.target.checked })}
                  className={styles.toggleInput}
                />
              </div>
              <div className={styles.toggleRow}>
                <span>Card Reflection (바닥 반사)</span>
                <input
                  type="checkbox"
                  checked={state.parameters.cardReflection}
                  onChange={(e) => dispatch({ type: "update-param", key: "cardReflection", value: e.target.checked })}
                  className={styles.toggleInput}
                />
              </div>
              <div className={styles.toggleRow}>
                <span>Show Badges (미디어 뱃지)</span>
                <input
                  type="checkbox"
                  checked={state.parameters.showBadges}
                  onChange={(e) => dispatch({ type: "update-param", key: "showBadges", value: e.target.checked })}
                  className={styles.toggleInput}
                />
              </div>
            </div>
          )}

          {/* Tab 3: Motion Controls */}
          {state.inspectorTab === "motion" && (
            <div className={styles.controlGroup}>
              {/* Range: speed */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Playback Speed</span>
                  <span className={styles.controlValue}>{state.parameters.speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={state.parameters.speed}
                  onChange={(e) => dispatch({ type: "update-param", key: "speed", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Range: waveAmplitude */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Wave Amplitude</span>
                  <span className={styles.controlValue}>{state.parameters.waveAmplitude}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={state.parameters.waveAmplitude}
                  onChange={(e) => dispatch({ type: "update-param", key: "waveAmplitude", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Range: waveFrequency */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Wave Frequency</span>
                  <span className={styles.controlValue}>{state.parameters.waveFrequency.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={state.parameters.waveFrequency}
                  onChange={(e) => dispatch({ type: "update-param", key: "waveFrequency", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Range: orbitTilt */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Orbit Tilt</span>
                  <span className={styles.controlValue}>{state.parameters.orbitTilt}°</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={state.parameters.orbitTilt}
                  onChange={(e) => dispatch({ type: "update-param", key: "orbitTilt", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Range: arcAngle */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Arc Angle</span>
                  <span className={styles.controlValue}>{state.parameters.arcAngle}°</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="360"
                  value={state.parameters.arcAngle}
                  onChange={(e) => dispatch({ type: "update-param", key: "arcAngle", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Segmented: loopPolicy */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}><span>Loop Policy</span></div>
                <div className={styles.segmentedControl}>
                  {(["continuous-loop", "ping-pong", "single-pass"] as const).map((policy) => (
                    <button
                      key={policy}
                      type="button"
                      className={`${styles.segmentedBtn} ${state.parameters.loopPolicy === policy ? styles.segmentedBtnActive : ""}`}
                      onClick={() => dispatch({ type: "update-param", key: "loopPolicy", value: policy })}
                    >
                      {policy.split("-")[0]}
                    </button>
                  ))}
                </div>
              </div>
              {/* Toggle: autoRotate */}
              <div className={styles.toggleRow}>
                <span>Auto Rotate (자동 회전)</span>
                <input
                  type="checkbox"
                  checked={state.parameters.autoRotate}
                  onChange={(e) => {
                    dispatch({ type: "update-param", key: "autoRotate", value: e.target.checked });
                    dispatch({ type: "set-playing", playing: e.target.checked });
                  }}
                  className={styles.toggleInput}
                />
              </div>
            </div>
          )}

          {/* Tab 4: Connections Controls */}
          {state.inspectorTab === "connections" && (
            <div className={styles.controlGroup}>
              {/* Range: connectionOpacity */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}>
                  <span>Connection Opacity</span>
                  <span className={styles.controlValue}>{state.parameters.connectionOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.parameters.connectionOpacity}
                  onChange={(e) => dispatch({ type: "update-param", key: "connectionOpacity", value: Number(e.target.value) })}
                  className={styles.rangeInput}
                />
              </div>
              {/* Select: connectionStyle */}
              <div className={styles.controlRow}>
                <div className={styles.controlHeader}><span>Connection Style</span></div>
                <select
                  value={state.parameters.connectionStyle}
                  onChange={(e) => dispatch({ type: "update-param", key: "connectionStyle", value: e.target.value })}
                  className={styles.selectInput}
                >
                  <option value="curved-arc">곡선 아크 (Curved Arc)</option>
                  <option value="straight-laser">직선 레이저 (Straight Laser)</option>
                  <option value="pulse-beam">펄스 빔 (Pulse Beam)</option>
                  <option value="subtle-thread">은은한 실선 (Subtle Thread)</option>
                </select>
              </div>
              {/* Toggles: showConnections, highlightMainPath, soundIndicators */}
              <div className={styles.toggleRow}>
                <span>Show Connections (관계선 표시)</span>
                <input
                  type="checkbox"
                  checked={state.parameters.showConnections}
                  onChange={(e) => dispatch({ type: "update-param", key: "showConnections", value: e.target.checked })}
                  className={styles.toggleInput}
                />
              </div>
              <div className={styles.toggleRow}>
                <span>Highlight Main Path (주요 경로 강조)</span>
                <input
                  type="checkbox"
                  checked={state.parameters.highlightMainPath}
                  onChange={(e) => dispatch({ type: "update-param", key: "highlightMainPath", value: e.target.checked })}
                  className={styles.toggleInput}
                />
              </div>
              <div className={styles.toggleRow}>
                <span>Sound Indicators (오디오 신호)</span>
                <input
                  type="checkbox"
                  checked={state.parameters.soundIndicators}
                  onChange={(e) => dispatch({ type: "update-param", key: "soundIndicators", value: e.target.checked })}
                  className={styles.toggleInput}
                />
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* Mobile Drawer Bar (Tabs for Small Screens) */}
      <nav className={styles.mobileDrawerBar} aria-label="Mobile Drawer Navigation">
        <button
          type="button"
          className={`${styles.mobileDrawerBtn} ${mobileTab === "presets" ? styles.mobileDrawerBtnActive : ""}`}
          onClick={() => setMobileTab("presets")}
        >
          PRESETS ({TRACK63_VIEW_DEFINITIONS.length})
        </button>
        <button
          type="button"
          className={`${styles.mobileDrawerBtn} ${mobileTab === "stage" ? styles.mobileDrawerBtnActive : ""}`}
          onClick={() => setMobileTab("stage")}
        >
          3D VIEWPORT
        </button>
        <button
          type="button"
          className={`${styles.mobileDrawerBtn} ${mobileTab === "inspector" ? styles.mobileDrawerBtnActive : ""}`}
          onClick={() => setMobileTab("inspector")}
        >
          INSPECTOR (48)
        </button>
      </nav>

      {/* Bottom Transport Bar */}
      <footer className={styles.transportBar}>
        <div className={styles.transportPlayback}>
          <button
            type="button"
            className={styles.playBtn}
            onClick={() => dispatch({ type: "set-playing", playing: !state.playing })}
            aria-label={state.playing ? "일시정지" : "재생"}
          >
            {state.playing ? "⏸ PAUSE" : "▶ PLAY"}
          </button>
        </div>

        <div className={styles.scrubArea}>
          <small style={{ fontSize: "10px", color: "#a8a29e" }}>PHASE</small>
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={state.scrubPhase}
            onChange={(e) => dispatch({ type: "set-scrub-phase", phase: Number(e.target.value) })}
            className={styles.scrubSlider}
            aria-label="Presentation scrub phase"
          />
          <small style={{ fontSize: "10px", fontFamily: "monospace", color: "#ff7597" }}>
            {(state.scrubPhase * 100).toFixed(0)}%
          </small>
        </div>

        <div className={styles.historyActions}>
          <small style={{ fontSize: "10px", color: "#78716c" }}>
            {activeMoments.length} MOMENTS · 44 PRESETS
          </small>
        </div>
      </footer>

      {/* Save Preset Dialog Modal */}
      {state.overlayModal === "save-preset" && (
        <div
          className={styles.modalBackdrop}
          onClick={() => dispatch({ type: "set-overlay-modal", modal: "none" })}
        >
          <div
            className={styles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-view-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="save-view-title">Save Custom View Preset</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => dispatch({ type: "set-overlay-modal", modal: "none" })}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "12px", color: "#a8a29e", margin: 0 }}>
              현재 설정된 48개 파라미터와 3D 레이아웃 구성을 브라우저 세션에 저장합니다.
            </p>
            <input
              ref={saveModalInputRef}
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="프리셋 이름을 입력하세요"
              className={styles.textInput}
            />
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => dispatch({ type: "set-overlay-modal", modal: "none" })}
              >
                CANCEL
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => dispatch({ type: "save-preset", name: newPresetName })}
              >
                SAVE PRESET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Handoff Informational Modal */}
      {state.overlayModal === "service-handoff" && (
        <div
          className={styles.modalBackdrop}
          onClick={() => dispatch({ type: "set-overlay-modal", modal: "none" })}
        >
          <div
            className={styles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-handoff-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="service-handoff-title">Service Navigation Notice</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => dispatch({ type: "set-overlay-modal", modal: "none" })}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "12px", color: "#d6d3d1", lineHeight: 1.6, margin: 0 }}>
              <strong>Design Lab Proving Candidate Boundary:</strong><br />
              본 기능(My Tree / Story Book / Moment Builder)은 프로토타입 시각 검증용 레퍼런스 액션입니다.
              LoveTree의 프로덕션 데이터베이스 및 실제 사용자 계정 변경 없이 세션 상태 내에서만 작동합니다.
            </p>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => dispatch({ type: "set-overlay-modal", modal: "none" })}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Inspect Modal */}
      {state.overlayModal === "media-inspect" && selectedMoment && (
        <div
          className={styles.modalBackdrop}
          onClick={() => dispatch({ type: "set-overlay-modal", modal: "none" })}
        >
          <div
            className={styles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-inspect-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="media-inspect-title">{selectedMoment.title}</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => dispatch({ type: "set-overlay-modal", modal: "none" })}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "14px" }}>
              {selectedMoment.mediaType === "photo" && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#93c5fd" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>📷</div>
                  <div style={{ fontSize: "12px" }}>High-Resolution Photo Preview ({selectedMoment.aspectRatio})</div>
                </div>
              )}
              {selectedMoment.mediaType === "video" && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#f472b6" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>🎬</div>
                  <div style={{ fontSize: "12px" }}>Video Stream ({selectedMoment.videoSrc ?? "Single Active Player"})</div>
                </div>
              )}
              {selectedMoment.mediaType === "memo" && (
                <div style={{ color: "#fef3c7", fontSize: "13px", lineHeight: 1.6, fontStyle: "italic" }}>
                  "{selectedMoment.memoText}"
                </div>
              )}
              {selectedMoment.mediaType === "link" && (
                <div style={{ color: "#6ee7b7", fontSize: "12px" }}>
                  <strong>Digital Link:</strong> {selectedMoment.linkUrl}<br />
                  <small style={{ color: "#a8a29e" }}>Domain: {selectedMoment.linkDomain}</small>
                </div>
              )}
            </div>
            <p style={{ fontSize: "12px", color: "#a8a29e", margin: 0 }}>
              {selectedMoment.caption}
            </p>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => dispatch({ type: "set-overlay-modal", modal: "none" })}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
