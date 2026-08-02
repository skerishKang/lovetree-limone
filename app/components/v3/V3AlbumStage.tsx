"use client";

import { useMemo } from "react";
import type { V3PreviewMemory } from "./v3-types";
import { ARCHIVE_LAYOUT_LABELS, type ArchiveLayout } from "./v3-archive-state";

interface V3AlbumStageProps {
  memories: V3PreviewMemory[];
  layout: ArchiveLayout;
  selectedMomentId: string | null;
  onSelectMoment: (id: string) => void;
  onOpenViewer: (id: string) => void;
}

const WINDOW = 4;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) % 100000;
  }
  return h;
}

function cardPlacement(
  layout: ArchiveLayout,
  offset: number,
  abs: number,
  index: number,
  total: number,
  id: string,
): React.CSSProperties {
  const active = offset === 0;
  if (layout === "orbit") {
    return {
      transform: `rotate(${offset * 24}deg) translateX(${abs === 0 ? 0 : 150 + (abs - 1) * 40}px) rotate(${-offset * 24}deg)`,
      zIndex: 10 - abs,
      opacity: active ? 1 : 0.55 - abs * 0.12,
    };
  }
  if (layout === "diagonal") {
    return {
      transform: `translate(${offset * 90}px, ${abs * 18}px) rotate(${offset * 4}deg)`,
      zIndex: 10 - abs,
      opacity: active ? 1 : 0.5 - abs * 0.1,
    };
  }
  if (layout === "free") {
    const h = hashId(id);
    return {
      transform: `translate(${(h % 190) - 95 + offset * 16}px, ${Math.floor(h / 190) % 120 - 60}px) scale(${active ? 1.08 : 0.9})`,
      zIndex: 10 - abs,
      opacity: active ? 1 : 0.55 - abs * 0.1,
    };
  }
  if (layout === "vinyl") {
    return {
      transform: active ? "translateY(-6px) scale(1.05)" : "scale(0.96)",
      zIndex: 10 - abs,
      opacity: active ? 1 : 0.62,
    };
  }
  const wavePhase = (index / Math.max(total, 1)) * Math.PI * 2;
  return {
    transform: `translate(${offset * 230}px, ${Math.sin(wavePhase) * 34}px) scale(${active ? 1.06 : 0.92})`,
    zIndex: 10 - abs,
    opacity: active ? 1 : 0.6 - abs * 0.1,
  };
}

export default function V3AlbumStage({
  memories,
  layout,
  selectedMomentId,
  onSelectMoment,
  onOpenViewer,
}: V3AlbumStageProps) {
  const sorted = useMemo(
    () => [...memories].sort((a, b) => b.recordDate.localeCompare(a.recordDate)),
    [memories],
  );

  const activeIndex = useMemo(() => {
    const index = sorted.findIndex((memory) => memory.id === selectedMomentId);
    return index === -1 ? 0 : index;
  }, [sorted, selectedMomentId]);

  if (sorted.length === 0) {
    return (
      <section className="v3-view" aria-label="순간 갤러리">
        <h2>순간 갤러리</h2>
        <div className="v3-empty">
          <span aria-hidden="true">✦</span>
          이 주제에는 아직 담을 순간이 없어요.
        </div>
      </section>
    );
  }

  const activeMemory = sorted[activeIndex];

  function step(delta: number) {
    const next = (activeIndex + delta + sorted.length) % sorted.length;
    onSelectMoment(sorted[next].id);
  }

  return (
    <section
      className="v3-view v3-stage-view"
      aria-label={`순간 갤러리 · ${ARCHIVE_LAYOUT_LABELS[layout]} 배치`}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          step(-1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          step(1);
        }
      }}
    >
      <div className="v3-stage-heading">
        <div>
          <h2>순간 갤러리</h2>
          <p className="v3-view-note">
            {sorted.length}개의 순간을 {ARCHIVE_LAYOUT_LABELS[layout]} 배치로 둘러보는
            갤러리예요. 카드를 눌러 영상과 메모를 펼쳐 보세요.
          </p>
        </div>
      </div>

      <div
        className={`v3-album-stage${layout === "vinyl" ? " v3-album-stage-vinyl" : ""}`}
        data-layout={layout}
        tabIndex={0}
      >
        {sorted.map((memory, index) => {
          const offset = index - activeIndex;
          const abs = Math.abs(offset);
          if (abs > WINDOW) return null;
          const active = offset === 0;
          const style = cardPlacement(layout, offset, abs, index, sorted.length, memory.id);
          return (
            <article
              className={`v3-album-stage-card${active ? " v3-stage-active" : ""}`}
              key={memory.id}
              style={style}
              aria-current={active ? "true" : undefined}
            >
              <div className="v3-album-media v3-stage-media">
                {memory.thumbnailUrl ? (
                  <img src={memory.thumbnailUrl} alt="" />
                ) : (
                  <span className="v3-stage-media-fallback" aria-hidden="true">
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
              {active && (
                <button
                  className="v3-btn v3-btn-quiet v3-stage-open"
                  type="button"
                  onClick={() => onOpenViewer(memory.id)}
                >
                  이 순간 펼쳐보기
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </article>
          );
        })}

        <div className="v3-album-stage-controls">
          <button
            className="v3-btn v3-btn-icon v3-btn-ghost"
            type="button"
            aria-label="이전 순간"
            onClick={() => step(-1)}
          >
            ←
          </button>
          <span className="v3-stage-index" aria-live="polite">
            {activeIndex + 1} / {sorted.length}
          </span>
          <button
            className="v3-btn v3-btn-icon v3-btn-ghost"
            type="button"
            aria-label="다음 순간"
            onClick={() => step(1)}
          >
            →
          </button>
          {activeMemory && (
            <button
              className="v3-btn v3-btn-primary"
              type="button"
              onClick={() => onOpenViewer(activeMemory.id)}
            >
              이 순간 펼쳐보기
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
