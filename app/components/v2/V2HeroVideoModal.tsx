"use client";

import { useEffect, useRef } from "react";
import type { HeroVideoData } from "./v2-hero-video-data";
import { DEMO_LABEL, heroEmbedUrl, heroWatchUrl } from "./v2-hero-video-data";

interface V2HeroVideoModalProps {
  video: HeroVideoData | null;
  onClose: () => void;
}

export default function V2HeroVideoModal({ video, onClose }: V2HeroVideoModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!video) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>("button, [href], iframe")
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
    };
  }, [video, onClose]);

  if (!video) return null;

  return (
    <div className="v2-video-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="v2-video-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="v2-video-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          className="v2-video-modal-close"
          type="button"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
        <div className="v2-video-modal-frame">
          <iframe
            src={heroEmbedUrl(video.videoId)}
            title={`${video.artist} - ${video.videoTitle}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <p className="v2-video-modal-channel">{video.channel} · {DEMO_LABEL}</p>
        <h2 id="v2-video-modal-title">{video.artist} — {video.videoTitle}</h2>
        <p className="v2-video-modal-memory">
          {video.memoryTitle}. {video.memoryMemo}
        </p>
        <a
          className="v2-video-modal-watch"
          href={heroWatchUrl(video.videoId)}
          target="_blank"
          rel="noreferrer noopener"
        >
          YouTube에서 보기 ↗
        </a>
      </div>
    </div>
  );
}
