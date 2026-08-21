"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LINEAGE_55_BRAND,
  LINEAGE_55_FLOWER_IMAGE,
  LINEAGE_55_HEADER_ACTIONS,
  LINEAGE_55_HINT,
  LINEAGE_55_MEMORY_CARDS,
  LINEAGE_55_MEMORY_FLOATS,
  LINEAGE_55_PANEL,
  LINEAGE_55_PLAY_LABELS,
  LINEAGE_55_SIDEBAR,
  LINEAGE_55_STATES,
  LINEAGE_55_TIMELINE,
  LINEAGE_55_TIMING,
} from "@/lib/lineage-55-moonlit-blossom-data";
import {
  advanceBlossomState,
  createInitialBlossomControllerState,
  jumpToBlossomState,
  planPetalBurst,
  rewindBlossomState,
  shouldBlossomWheelAdvance,
  toggleBlossomAuto,
  type PlannedPetal,
} from "@/lib/lineage-55-moonlit-blossom-controller";

interface BlossomImageProps {
  src: string;
  alt: string;
  className?: string;
}

function BlossomImage({ src, alt, className }: BlossomImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className={className}
        aria-label={`${alt} (asset not yet materialized)`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 42%, #3a2f66 0%, #241d4a 45%, #14102e 100%)",
          color: "#b8a6ff",
          fontSize: 9,
          letterSpacing: "0.14em",
          textAlign: "center",
          padding: 4,
        }}
      >
        MOONLIT BLOSSOM
      </span>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}

export default function Lineage55MoonlitBlossom() {
  const [controller, setController] = useState(
    createInitialBlossomControllerState,
  );
  const [petals, setPetals] = useState<PlannedPetal[]>([]);
  const lastWheelAtRef = useRef<number | null>(null);
  const flowerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const { state, auto } = controller;
  const current = LINEAGE_55_STATES[state];
  const controllerRef = useRef(controller);

  const applyController = useCallback(
    (next: typeof controller) => {
      controllerRef.current = next;
      setController(next);
      if (next.state !== 3) {
        setPetals([]);
        return;
      }
      const flower = flowerRef.current;
      const stage = stageRef.current;
      if (!flower || !stage) {
        setPetals([]);
        return;
      }
      const flowerBox = flower.getBoundingClientRect();
      const stageBox = stage.getBoundingClientRect();
      setPetals(
        planPetalBurst({
          centerX: flowerBox.left - stageBox.left + flowerBox.width / 2,
          centerY: flowerBox.top - stageBox.top + flowerBox.height / 2,
        }),
      );
    },
    [],
  );

  const nextState = useCallback(() => {
    applyController(advanceBlossomState(controllerRef.current));
  }, [applyController]);

  const prevState = useCallback(() => {
    applyController(rewindBlossomState(controllerRef.current));
  }, [applyController]);

  const jump = useCallback(
    (target: number) => {
      applyController(jumpToBlossomState(controllerRef.current, target));
    },
    [applyController],
  );

  const toggleAuto = useCallback(() => {
    applyController(toggleBlossomAuto(controllerRef.current));
  }, [applyController]);

  useEffect(() => {
    if (!auto) return;
    const timer = setInterval(() => {
      applyController(advanceBlossomState(controllerRef.current));
    }, LINEAGE_55_TIMING.autoIntervalMs);
    return () => clearInterval(timer);
  }, [auto, applyController]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        nextState();
      } else if (event.code === "ArrowRight") {
        nextState();
      } else if (event.code === "ArrowLeft") {
        prevState();
      }
    };
    const onWheel = (event: WheelEvent) => {
      const now = Date.now();
      if (!shouldBlossomWheelAdvance(lastWheelAtRef.current, now)) return;
      lastWheelAtRef.current = now;
      if (event.deltaY > 0) nextState();
      else prevState();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", onWheel);
    };
  }, [nextState, prevState]);

  return (
    <div
      className={`lt55 state-${state}`}
      data-lt55-state={state}
      data-lt55-auto={auto ? "on" : "off"}
    >
      <div className="lt55-stars" />
      <div className="lt55-stars2" />
      <div className="lt55-app">
        <aside className="lt55-sidebar">
          <div className="lt55-logo">{LINEAGE_55_SIDEBAR.logo}</div>
          {LINEAGE_55_SIDEBAR.navDots.map((dot) => (
            <div
              key={dot.title}
              className={`lt55-navdot${dot.active ? " active" : ""}`}
              title={dot.title}
            >
              {dot.glyph}
            </div>
          ))}
          <div className="lt55-spacer" />
          <div className="lt55-navdot" title={LINEAGE_55_SIDEBAR.settingsDot.title}>
            {LINEAGE_55_SIDEBAR.settingsDot.glyph}
          </div>
        </aside>

        <header className="lt55-header">
          <div className="lt55-brand">
            {LINEAGE_55_BRAND.name}
            <small>{LINEAGE_55_BRAND.sub}</small>
          </div>
          <div className="lt55-headerBtns">
            {LINEAGE_55_HEADER_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                className={`lt55-pill${action.kind === "primary" ? " primary" : ""}`}
                onClick={
                  action.kind === "jump" ? () => jump(action.target) : undefined
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        </header>

        <main className="lt55-main">
          <div className="lt55-stage" ref={stageRef}>
            <div className="lt55-controls">
              <div className="lt55-step" data-lt55-step-label>
                {current.step}
              </div>
              <div className="lt55-stageTitle" data-lt55-stage-title>
                {current.title}
              </div>
              <button
                type="button"
                className="lt55-play"
                onClick={toggleAuto}
                data-lt55-play
              >
                <span data-lt55-play-icon>
                  {auto ? LINEAGE_55_PLAY_LABELS.pauseIcon : LINEAGE_55_PLAY_LABELS.playIcon}
                </span>
                <span data-lt55-play-text>
                  {auto ? LINEAGE_55_PLAY_LABELS.pause : LINEAGE_55_PLAY_LABELS.play}
                </span>
              </button>
            </div>

            <div className="lt55-aura" />
            <div className="lt55-orbit" />

            <div
              className="lt55-flowerWrap"
              ref={flowerRef}
              onClick={nextState}
              role="button"
              aria-label={LINEAGE_55_FLOWER_IMAGE.alt}
              data-lt55-flower
            >
              <BlossomImage
                src={LINEAGE_55_FLOWER_IMAGE.src}
                alt={LINEAGE_55_FLOWER_IMAGE.alt}
              />
              <div className="lt55-centerGlow" />
            </div>

            {LINEAGE_55_MEMORY_FLOATS.map((float) => (
              <div
                key={float.className}
                className={`lt55-memoryFloat lt55-${float.className}`}
              >
                <BlossomImage src={float.image} alt={float.title} />
                <b>{float.title}</b>
                <p>{float.caption}</p>
              </div>
            ))}

            <div className="lt55-bloomBurst" data-lt55-burst>
              {petals.map((petal, index) => (
                <i
                  key={`${petal.dx}-${petal.dy}-${index}`}
                  className="lt55-petal"
                  style={{
                    left: `${petal.left}px`,
                    top: `${petal.top}px`,
                    "--x": `${petal.dx}px`,
                    "--y": `${petal.dy}px`,
                    animationDelay: `${petal.delayMs}ms`,
                  } as React.CSSProperties}
                />
              ))}
            </div>

            <div className="lt55-timeline" data-lt55-timeline>
              {LINEAGE_55_TIMELINE.map((item, index) => (
                <div
                  key={item}
                  className={`lt55-titem${index === state ? " active" : ""}`}
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="lt55-hint">
              {LINEAGE_55_HINT.text} <kbd>{LINEAGE_55_HINT.key}</kbd>{" "}
              {LINEAGE_55_HINT.tail}
            </div>
          </div>
        </main>

        <aside className="lt55-panel">
          <div className="lt55-eyebrow">{LINEAGE_55_PANEL.eyebrow}</div>
          <h1>
            {LINEAGE_55_PANEL.headingLines[0]}
            <br />
            <em>{LINEAGE_55_PANEL.headingLines[1]}</em>
          </h1>
          <div className="lt55-desc">{LINEAGE_55_PANEL.description}</div>
          <div className="lt55-section">
            <div className="lt55-section-title">
              {LINEAGE_55_PANEL.progressSectionTitle}
            </div>
            <div className="lt55-progressLabel" data-lt55-progress>
              <span>{LINEAGE_55_PANEL.progressLabel}</span>
              <span>{LINEAGE_55_PANEL.progressPercentLabel}</span>
            </div>
            <div className="lt55-bar">
              <i />
            </div>
          </div>
          <div className="lt55-section">
            <div className="lt55-section-title">
              {LINEAGE_55_PANEL.castSectionTitle}
            </div>
            {LINEAGE_55_MEMORY_CARDS.map((card) => (
              <div
                key={card.title}
                className="lt55-memoryCard"
                onClick={() => jump(card.jumpTo)}
                role="button"
                data-lt55-memory-card={card.title}
              >
                <BlossomImage
                  className="lt55-avatar"
                  src={card.image}
                  alt={card.title}
                />
                <div>
                  <b>{card.title}</b>
                  <p>{card.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
