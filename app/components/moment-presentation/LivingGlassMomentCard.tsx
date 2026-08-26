"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { TreeMomentView } from "@/lib/moment-model";
import {
  source57MomentDate,
  type LivingGlassPresentation,
} from "@/lib/source-track-57-living-glass";

type LivingGlassStyle = CSSProperties & {
  "--tone": string;
  "--aura": string;
  "--rx": string;
  "--ry": string;
  "--gx": string;
  "--gy": string;
  "--media-x": string;
  "--media-y": string;
  "--text-x": string;
  "--text-y": string;
};

type TouchGesture = {
  x: number;
  y: number;
  moved: boolean;
};

export function LivingGlassMomentCard({
  moment,
  presentation,
  selected,
  onSelect,
  onNavigate,
}: {
  moment: TreeMomentView;
  presentation: LivingGlassPresentation;
  selected: boolean;
  onSelect: (moment: TreeMomentView) => void;
  onNavigate: (direction: -1 | 1, from: TreeMomentView) => void;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [depth, setDepth] = useState({
    rx: "0deg",
    ry: "0deg",
    gx: "50%",
    gy: "32%",
    mediaX: "0px",
    mediaY: "0px",
    textX: "0px",
    textY: "0px",
  });
  const touchGesture = useRef<TouchGesture | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const resetDepth = () => {
    setDepth({
      rx: "0deg",
      ry: "0deg",
      gx: "50%",
      gy: "32%",
      mediaX: "0px",
      mediaY: "0px",
      textX: "0px",
      textY: "0px",
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch") return;
    touchGesture.current = { x: event.clientX, y: event.clientY, moved: false };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") {
      const start = touchGesture.current;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) {
        start.moved = true;
      }
      return;
    }
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const nx = x - 0.5;
    const ny = y - 0.5;
    setDepth({
      rx: `${(-ny * 9).toFixed(2)}deg`,
      ry: `${(nx * 11).toFixed(2)}deg`,
      gx: `${(x * 100).toFixed(1)}%`,
      gy: `${(y * 100).toFixed(1)}%`,
      mediaX: `${(nx * 8).toFixed(2)}px`,
      mediaY: `${(ny * 7).toFixed(2)}px`,
      textX: `${(-nx * 5).toFixed(2)}px`,
      textY: `${(-ny * 4).toFixed(2)}px`,
    });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch") return;
    const start = touchGesture.current;
    touchGesture.current = null;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const distance = Math.hypot(dx, dy);
    suppressClick.current = true;

    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      onNavigate(dx < 0 ? 1 : -1, moment);
    } else if (distance < 9 && !start.moved) {
      onSelect(moment);
    }
    resetDepth();
  };

  const handlePointerCancel = () => {
    touchGesture.current = null;
    suppressClick.current = false;
    resetDepth();
  };

  const handleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onSelect(moment);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(moment);
  };

  const style: LivingGlassStyle = {
    "--tone": presentation.tone,
    "--aura": presentation.aura,
    "--rx": depth.rx,
    "--ry": depth.ry,
    "--gx": depth.gx,
    "--gy": depth.gy,
    "--media-x": depth.mediaX,
    "--media-y": depth.mediaY,
    "--text-x": depth.textX,
    "--text-y": depth.textY,
  };

  return (
    <article
      className={`living-glass-card-wrap${selected ? " is-selected" : ""}`}
      style={style}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${moment.title} Moment 상세 보기`}
      data-testid={`source57-card-${moment.id}`}
      data-source57-card="true"
      data-moment-id={moment.id}
      data-selected={selected ? "true" : "false"}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={resetDepth}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="living-glass-glow-field" aria-hidden="true" />
      <div className="living-glass-selection-bloom" aria-hidden="true" />
      <div className="living-glass-edge-runner" aria-hidden="true" />
      <div className="living-glass-card">
        <div className="living-glass-media">
          <Image
            src={moment.thumbnail}
            alt=""
            fill
            sizes="(max-width: 880px) 82vw, 360px"
            className="living-glass-media-image"
            priority={moment.sortOrder === 0}
          />
          <span className="living-glass-media-badge">{presentation.mediaLabel}</span>
          {moment.sourceType.toLowerCase().includes("video") ? (
            <span className="living-glass-play" aria-label="Video Moment preview" />
          ) : null}
          <span className="living-glass-media-origin">CANONICAL MEDIA</span>
        </div>

        <div className="living-glass-card-copy">
          <p className="living-glass-card-label">MOMENT · {String(moment.sortOrder + 1).padStart(2, "0")}</p>
          <h2>{moment.title}</h2>
          <div className="living-glass-meta-row">
            <time dateTime={moment.discoveryDate || moment.timestamp}>{source57MomentDate(moment)}</time>
            <span className="living-glass-emotion">{moment.emotionTags[0] ?? "기억"}</span>
          </div>
          <p className="living-glass-note">{moment.memo}</p>
          <div className="living-glass-connection-cue">
            <span>
              <small>CONNECTION</small>
              <strong>{presentation.connectionLabel}</strong>
            </span>
            <span className="living-glass-arrow" aria-hidden="true">↗</span>
          </div>
        </div>
        <span className="living-glass-selected-mark" aria-hidden="true">SELECTED</span>
        <div className="living-glass-glare" aria-hidden="true" />
        <div className="living-glass-edge" aria-hidden="true" />
      </div>
    </article>
  );
}
