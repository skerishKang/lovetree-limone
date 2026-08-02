"use client";

import { useMemo, useState } from "react";
import type { V3PreviewMemory } from "./v3-types";
import { formatSeconds } from "./v3-archive-state";

interface V3AlbumFoldingProps {
  memories: V3PreviewMemory[];
  selectedMomentId: string | null;
  onSelectMoment: (id: string) => void;
  onOpenViewer: (id: string) => void;
}

export default function V3AlbumFolding({
  memories,
  selectedMomentId,
  onSelectMoment,
  onOpenViewer,
}: V3AlbumFoldingProps) {
  const sorted = useMemo(
    () => [...memories].sort((a, b) => b.recordDate.localeCompare(a.recordDate)),
    [memories],
  );
  const [flipKey, setFlipKey] = useState(0);

  const activeIndex = useMemo(() => {
    const index = sorted.findIndex((memory) => memory.id === selectedMomentId);
    return index === -1 ? 0 : index;
  }, [sorted, selectedMomentId]);

  if (sorted.length === 0) {
    return (
      <section className="v3-view" aria-label="펼쳐보는 앨범">
        <h2>펼쳐보는 앨범</h2>
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
    setFlipKey((prev) => prev + 1);
    onSelectMoment(sorted[next].id);
  }

  return (
    <section
      className="v3-view v3-folding-view"
      aria-label="펼쳐보는 앨범"
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
      <div className="v3-folding-heading">
        <h2>펼쳐보는 앨범</h2>
        <p className="v3-view-note">
          한 장씩 넘기며 순간을 만나는 앨범이에요. 좌우 방향키나 버튼으로 이어서
          볼 수 있어요.
        </p>
      </div>

      <div className="v3-folding-book" tabIndex={0}>
        <div className="v3-folding-page" key={flipKey} aria-live="polite">
          <div className="v3-folding-media">
            {activeMemory.thumbnailUrl ? (
              <img src={activeMemory.thumbnailUrl} alt="" />
            ) : (
              <span className="v3-folding-media-fallback" aria-hidden="true">
                ✦
              </span>
            )}
          </div>
          <div className="v3-folding-copy">
            <p className="v3-eyebrow">
              {activeMemory.recordDate}
              {activeMemory.primaryEmotion ? ` · ${activeMemory.primaryEmotion}` : ""}
              {activeMemory.startSeconds
                ? ` · ${formatSeconds(activeMemory.startSeconds)}${
                    activeMemory.endSeconds ? ` — ${formatSeconds(activeMemory.endSeconds)}` : ""
                  }`
                : ""}
            </p>
            <h3>{activeMemory.title}</h3>
            {activeMemory.memo && <p className="v3-folding-memo">{activeMemory.memo}</p>}
            {activeMemory.relationLabel && (
              <p className="v3-folding-relation">이어진 이유 · {activeMemory.relationLabel}</p>
            )}
            <div className="v3-onboarding-actions">
              <button
                className="v3-btn v3-btn-primary"
                type="button"
                onClick={() => onOpenViewer(activeMemory.id)}
              >
                영상 펼쳐보기
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
        <div className="v3-folding-controls">
          <button
            className="v3-btn v3-btn-icon v3-btn-ghost"
            type="button"
            aria-label="이전 페이지"
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
            aria-label="다음 페이지"
            onClick={() => step(1)}
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
