"use client";

import { useEffect, useRef, useState } from "react";
import type { V3PreviewMemory } from "./v3-types";

interface V3VideoViewerProps {
  memory: V3PreviewMemory;
  onClose?: () => void;
  label?: string;
}

function parseYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/,
  );
  return match ? match[1] : null;
}

function formatSeconds(seconds?: number): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export default function V3VideoViewer({
  memory,
  onClose,
  label = "영상",
}: V3VideoViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const videoId = parseYouTubeId(memory.sourceUrl ?? "");

  useEffect(() => {
    viewerRef.current?.focus();
  }, [memory.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPlaying(false);
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const embedSrc = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0${
        memory.startSeconds ? `&start=${memory.startSeconds}` : ""
      }`
    : "";

  return (
    <div
      className="v3-video-viewer"
      role="group"
      aria-label={`${label} · ${memory.title}`}
      ref={viewerRef}
      tabIndex={-1}
    >
      {playing && videoId ? (
        <iframe
          className="v3-video-frame"
          src={embedSrc}
          title={`${memory.title} 영상`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          className="v3-video-poster"
          type="button"
          onClick={() => {
            if (videoId) setPlaying(true);
          }}
          aria-label={`${memory.title} 재생`}
          disabled={!videoId}
        >
          {memory.thumbnailUrl ? (
            <img src={memory.thumbnailUrl} alt="" />
          ) : (
            <span className="v3-video-poster-fallback" aria-hidden="true">
              ▶
            </span>
          )}
          <span className="v3-video-poster-overlay" aria-hidden="true">
            ▶
          </span>
          {!videoId && <span className="v3-video-unavailable">재생할 수 없는 출처예요</span>}
        </button>
      )}
      <div className="v3-video-meta">
        <span className="v3-source-card-tag">
          {formatSeconds(memory.startSeconds)}
          {memory.endSeconds ? ` — ${formatSeconds(memory.endSeconds)}` : ""} ·{" "}
          {memory.primaryEmotion ?? "감정 없음"}
        </span>
        <strong>{memory.title}</strong>
        {memory.memo && <p>{memory.memo}</p>}
      </div>
    </div>
  );
}
