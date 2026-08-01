"use client";

import { forwardRef, useState, type CSSProperties } from "react";
import type { HeroVideoData } from "./v2-hero-video-data";
import {
  DEMO_LABEL,
  heroThumbPrimary,
  heroThumbFallback,
  heroWatchUrl,
} from "./v2-hero-video-data";

interface V2HeroVideoCardProps {
  video: HeroVideoData;
  index: number;
  revealed: boolean;
  spotlightPhase: "in" | "hold" | "return" | "";
  onPlay: (video: HeroVideoData, trigger: HTMLElement) => void;
  onHoverChange: (hovered: boolean) => void;
  onFocusChange: (focused: boolean) => void;
}

const V2HeroVideoCard = forwardRef<HTMLElement, V2HeroVideoCardProps>(function V2HeroVideoCard(
  { video, index, revealed, spotlightPhase, onPlay, onHoverChange, onFocusChange },
  ref
) {
  const [src, setSrc] = useState(() => heroThumbPrimary(video.videoId));
  const [thumbFailed, setThumbFailed] = useState(false);

  const spotlightClass =
    spotlightPhase === "in" || spotlightPhase === "hold"
      ? "is-spotlight"
      : spotlightPhase === "return"
        ? "is-spotlight-return"
        : "";

  const cardStyle = {
    "--spotlight-dx": "0px",
    "--spotlight-dy": "0px",
  } as CSSProperties;

  return (
    <article
      ref={ref}
      className={`v2-showcase-card v2-showcase-card-${index} ${revealed ? "is-revealed" : ""} ${spotlightClass}`}
      style={cardStyle}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
    >
      <button
        type="button"
        className="v2-showcase-card-media"
        aria-label={`${video.artist} ${video.videoTitle} 영상 열기`}
        onClick={(e) => onPlay(video, e.currentTarget)}
      >
        {thumbFailed ? (
          <span className="v2-showcase-card-fallback" aria-hidden="true">✦</span>
        ) : (
          <img
            src={src}
            alt=""
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
            width={640}
            height={360}
            onError={() => {
              if (src.includes("maxresdefault")) setSrc(heroThumbFallback(video.videoId));
              else setThumbFailed(true);
            }}
          />
        )}
        <span className="v2-showcase-card-play" aria-hidden="true">▶</span>
        <small className="v2-showcase-card-time">{video.momentTime}</small>
        <span className="v2-showcase-card-demo">{DEMO_LABEL}</span>
      </button>
      <div className="v2-showcase-card-body">
        <span className="v2-showcase-card-relation">{video.relationLabel}</span>
        <span className="v2-showcase-card-artist">{video.artist}</span>
        <strong>{video.videoTitle}</strong>
        <small className="v2-showcase-card-channel">{video.channel}</small>
        <p className="v2-showcase-card-memory">
          {video.memoryTitle} — {video.memoryMemo}
        </p>
        <a
          className="v2-showcase-card-watch"
          href={heroWatchUrl(video.videoId)}
          target="_blank"
          rel="noreferrer noopener"
        >
          YouTube에서 보기 ↗
        </a>
      </div>
    </article>
  );
});

export default V2HeroVideoCard;
