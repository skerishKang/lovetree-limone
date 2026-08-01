"use client";

import { useMemo, useState } from "react";
import type { V3PreviewMemory } from "./v3-types";
import V3VideoViewer from "./V3VideoViewer";

interface V3AlbumStageProps {
  memories: V3PreviewMemory[];
}

export type V3AlbumStageMode = "wave" | "orbit" | "cascade";

const MODES: { id: V3AlbumStageMode; label: string }[] = [
  { id: "wave", label: "물결" },
  { id: "orbit", label: "궤도" },
  { id: "cascade", label: "사선" },
];

export default function V3AlbumStage({ memories }: V3AlbumStageProps) {
  const [mode, setMode] = useState<V3AlbumStageMode>("wave");
  const [activeIndex, setActiveIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...memories].sort((a, b) => b.recordDate.localeCompare(a.recordDate)),
    [memories],
  );

  const activeMemory = sorted[activeIndex];

  function step(delta: number) {
    setActiveIndex((prev) => (prev + delta + sorted.length) % sorted.length);
  }

  if (sorted.length === 0) {
    return (
      <div className="v3-view">
        <h2>모션 아카이브</h2>
        <div className="v3-empty">
          <span aria-hidden="true">✦</span>
          아직 담을 순간이 없어요.
        </div>
      </div>
    );
  }

  return (
    <div className="v3-view">
      <h2>모션 아카이브</h2>
      <p className="v3-view-note">
        {sorted.length}개의 순간을 물결·궤도·사선으로 둘러보는 갤러리예요. 카드를
        눌러 영상과 메모를 펼쳐 보세요.
      </p>
      <div className="v3-chip-group" role="group" aria-label="갤러리 배치 방식">
        {MODES.map((item) => (
          <button
            className="v3-chip"
            type="button"
            key={item.id}
            aria-pressed={mode === item.id}
            onClick={() => setMode(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="v3-album-stage" data-mode={mode} aria-label="모션 아카이브 갤러리">
        {sorted.map((memory, index) => {
          const offset = index - activeIndex;
          const abs = Math.abs(offset);
          const active = offset === 0;
          const style =
            mode === "orbit"
              ? {
                  transform: `rotate(${offset * 24}deg) translateX(${abs === 0 ? 0 : 150 + (abs - 1) * 40}px) rotate(${offset * -24}deg)`,
                  zIndex: 10 - abs,
                  opacity: active ? 1 : 0.55 - abs * 0.12,
                }
              : mode === "cascade"
                ? {
                    transform: `translate(${offset * 90}px, ${abs * 18}px) rotate(${offset * 4}deg)`,
                    zIndex: 10 - abs,
                    opacity: active ? 1 : 0.5 - abs * 0.1,
                  }
                : {
                    transform: `translateY(${Math.sin((offset / sorted.length) * Math.PI * 2) * 34}px) scale(${active ? 1.06 : 0.92})`,
                    zIndex: 10 - abs,
                    opacity: active ? 1 : 0.6 - abs * 0.1,
                  };
          return (
            <article
              className={`v3-album-stage-card${active ? " v3-stage-active" : ""}`}
              key={memory.id}
              style={style}
            >
              <div className="v3-album-media">
                {memory.thumbnailUrl ? (
                  <img src={memory.thumbnailUrl} alt="" />
                ) : (
                  <span
                    aria-hidden="true"
                    style={{ display: "grid", placeItems: "center", height: 110, color: "#fffaf6" }}
                  >
                    ✦
                  </span>
                )}
              </div>
              <div className="v3-album-body">
                <strong>{memory.title}</strong>
                <small>
                  {memory.recordDate} · {memory.primaryEmotion ?? "감정 없음"}
                </small>
              </div>
            </article>
          );
        })}
        <div className="v3-album-stage-controls">
          <button className="v3-btn v3-btn-icon v3-btn-ghost" type="button" aria-label="이전 순간" onClick={() => step(-1)}>
            ←
          </button>
          <span className="v3-stage-index" aria-live="polite">
            {activeIndex + 1} / {sorted.length}
          </span>
          <button className="v3-btn v3-btn-icon v3-btn-ghost" type="button" aria-label="다음 순간" onClick={() => step(1)}>
            →
          </button>
          <button className="v3-btn v3-btn-primary" type="button" onClick={() => setOpenIndex(activeIndex)}>
            이 순간 펼쳐보기
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {openIndex !== null && activeMemory && (
        <div className="v3-backdrop" role="presentation" onClick={() => setOpenIndex(null)}>
          <div
            className="v3-modal v3-video-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="v3-stage-viewer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="v3-modal-close" type="button" onClick={() => setOpenIndex(null)} aria-label="닫기">
              ×
            </button>
            <h2 id="v3-stage-viewer-title">{activeMemory.title}</h2>
            <V3VideoViewer memory={activeMemory} onClose={() => setOpenIndex(null)} label="선택한 순간" />
            <div className="v3-onboarding-actions">
              <button className="v3-btn v3-btn-quiet" type="button" onClick={() => setOpenIndex(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
