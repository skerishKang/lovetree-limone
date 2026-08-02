"use client";

import { useEffect, useRef, useState } from "react";
import type { V3PreviewMemory } from "./v3-types";
import { V3_EMOTION_PRESETS } from "./fixtures/v3-fixtures";

interface V3FullscreenDrawerProps {
  treeId: string;
  onClose: () => void;
  title?: string;
  variant?: "drawer" | "fullscreen";
  memories?: V3PreviewMemory[];
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

export default function V3FullscreenDrawer({
  treeId,
  onClose,
  title = "새 순간 추가",
  variant = "drawer",
  memories = [],
}: V3FullscreenDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [titleValue, setTitleValue] = useState("");
  const [emotion, setEmotion] = useState<string>(V3_EMOTION_PRESETS[0].label);
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;

    drawerRef.current?.focus();
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = drawerRef.current;
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

  function submit() {
    if (!url.trim()) return;
    setSaved(true);
  }

  return (
    <div
      className="v3-fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      ref={drawerRef}
      tabIndex={-1}
    >
      <div className="v3-fullscreen-header">
        <strong>{title}</strong>
        <div className="v3-tree-tools">
          <span className="v3-preview-badge">V3 예시 데이터</span>
          <button
            className="v3-btn v3-btn-icon v3-btn-ghost"
            type="button"
            aria-label="드로어 닫기"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>
      <div className="v3-fullscreen-body">
        <div className="v3-fullscreen-canvas" aria-label="전체 화면 트리 캔버스">
          {variant === "fullscreen" && memories.length > 0 ? (
            <div className="v3-fullscreen-tree">
              {memories.map((memory, index) => {
                const angle = (index / Math.max(memories.length, 1)) * Math.PI * 2;
                const radius = 120 + (index % 3) * 60;
                const x = 50 + (Math.cos(angle) * radius) / 4 + radius / 4;
                const y = 50 + (Math.sin(angle) * radius) / 5;
                return (
                  <div
                    className="v3-growth-node v3-fullscreen-tree-node"
                    key={memory.id}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    role="listitem"
                  >
                    {memory.thumbnailUrl ? (
                      <img src={memory.thumbnailUrl} alt="" />
                    ) : (
                      <div
                        className="v3-preview-media v3-media-b"
                        style={{ height: 64 }}
                        aria-hidden="true"
                      >
                        <span>✦</span>
                      </div>
                    )}
                    <div className="v3-growth-node-meta">
                      <span className="v3-growth-node-tag">
                        {memory.primaryEmotion ?? "감정 없음"} · {memory.recordDate}
                      </span>
                      <span className="v3-growth-node-title">{memory.title}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="v3-workspace-empty" style={{ position: "relative", top: "38%" }}>
              treeId: {treeId} — 전체 화면에서는 성장 트리가 크게 표시돼요.
            </p>
          )}
        </div>
        <div className="v3-drawer">
          <h2>{title}</h2>
          {saved ? (
            <>
              <div className="v3-success-box" role="status">
                프리뷰에서 새 순간이 추가됐어요. (실제 저장은 되지 않아요)
              </div>
              <button
                className="v3-btn v3-btn-primary"
                type="button"
                onClick={() => {
                  setSaved(false);
                  setUrl("");
                  setTitleValue("");
                  setMemo("");
                }}
              >
                다시 추가하기
              </button>
            </>
          ) : (
            <form
              className="v3-composer-form"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <div className="v3-field">
                <label className="v3-label" htmlFor="v3-fs-url">
                  영상 링크
                </label>
                <input
                  className="v3-input"
                  id="v3-fs-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  required
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div className="v3-field">
                <label className="v3-label" htmlFor="v3-fs-title">
                  제목
                </label>
                <input
                  className="v3-input"
                  id="v3-fs-title"
                  value={titleValue}
                  onChange={(event) => setTitleValue(event.target.value)}
                  placeholder="이 순간의 제목"
                />
              </div>
              <div className="v3-field">
                <span className="v3-label">감정</span>
                <div className="v3-chip-group" role="group" aria-label="감정 선택">
                  {V3_EMOTION_PRESETS.map((preset) => (
                    <button
                      className="v3-chip"
                      type="button"
                      key={preset.id}
                      aria-pressed={emotion === preset.label}
                      onClick={() => setEmotion(preset.label)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="v3-field">
                <label className="v3-label" htmlFor="v3-fs-memo">
                  메모
                </label>
                <textarea
                  className="v3-textarea"
                  id="v3-fs-memo"
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder="전체 화면에서 바로 이어 쓰기"
                  maxLength={140}
                />
              </div>
              <button className="v3-btn v3-btn-primary" type="submit">
                전체 화면에서 바로 이어 쓰기
                <span aria-hidden="true">→</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
