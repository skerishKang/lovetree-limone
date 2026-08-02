"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { V3PreviewMemory } from "./v3-types";
import {
  buildMemoryEmbedUrl,
  formatSeconds,
  isEmbeddableVideo,
} from "./v3-archive-state";

interface V3VideoViewerProps {
  memory: V3PreviewMemory;
  onClose: () => void;
  label?: string;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

export default function V3VideoViewer({
  memory,
  onClose,
  label = "선택한 순간",
}: V3VideoViewerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const titleId = useId();
  const embeddable = isEmbeddableVideo(memory);
  const embedSrc = playing && embeddable ? buildMemoryEmbedUrl(memory) : "";

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;

    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.scrollTo(0, scrollY);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="v3-backdrop v3-viewer-backdrop" role="presentation" onClick={onClose}>
      <div
        className="v3-modal v3-video-modal v3-video-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="v3-video-dialog-header">
          <div>
            <p className="v3-eyebrow">{label}</p>
            <h2 id={titleId}>{memory.title}</h2>
            <p className="v3-video-dialog-meta">
              {memory.recordDate}
              {memory.primaryEmotion ? ` · ${memory.primaryEmotion}` : ""}
              {memory.startSeconds
                ? ` · ${formatSeconds(memory.startSeconds)}${
                    memory.endSeconds ? ` — ${formatSeconds(memory.endSeconds)}` : ""
                  }`
                : ""}
            </p>
          </div>
          <button
            className="v3-btn v3-btn-icon v3-btn-ghost"
            type="button"
            aria-label="영상 뷰어 닫기"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {playing && embeddable ? (
          <iframe
            className="v3-video-frame"
            src={embedSrc}
            title={`${memory.title} 영상`}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            className="v3-video-poster"
            type="button"
            onClick={() => {
              if (embeddable) setPlaying(true);
            }}
            aria-label={`${memory.title} 재생`}
            disabled={!embeddable}
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
            {!embeddable && (
              <span className="v3-video-unavailable">재생할 수 없는 출처예요</span>
            )}
          </button>
        )}

        <div className="v3-video-dialog-body">
          {memory.memo && <p className="v3-video-memo">{memory.memo}</p>}
          <dl className="v3-video-attribution">
            <div>
              <dt>출처</dt>
              <dd>{memory.sourceName ?? "미기록"}</dd>
            </div>
            {memory.sourceTitle && (
              <div>
                <dt>원본 제목</dt>
                <dd>{memory.sourceTitle}</dd>
              </div>
            )}
            {memory.sourceUrl && (
              <div>
                <dt>원본 링크</dt>
                <dd>
                  <a
                    href={memory.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="v3-source-link"
                  >
                    원본에서 열기
                    <span aria-hidden="true">↗</span>
                  </a>
                </dd>
              </div>
            )}
          </dl>
          <div className="v3-onboarding-actions">
            <button className="v3-btn v3-btn-quiet" type="button" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
