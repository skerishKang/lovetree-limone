"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { V3PreviewMemory, V3SubjectAlbum } from "./v3-types";

interface V3AlbumAccordionProps {
  subject: V3SubjectAlbum;
  memories: V3PreviewMemory[];
  selectedMomentId: string | null;
  onSelectMoment: (id: string) => void;
  onOpenViewer: (id: string) => void;
  onBack?: () => void;
}

export default function V3AlbumAccordion({
  subject,
  memories,
  selectedMomentId,
  onSelectMoment,
  onOpenViewer,
  onBack,
}: V3AlbumAccordionProps) {
  const sorted = useMemo(
    () => [...memories].sort((a, b) => b.recordDate.localeCompare(a.recordDate)),
    [memories],
  );

  const openIndex = sorted.findIndex((memory) => memory.id === selectedMomentId);
  const openMemory = openIndex !== -1 ? sorted[openIndex] : null;

  return (
    <div className="v3-album-accordion" aria-label={`${subject.name} 앨범 아코디언`}>
      <div className="v3-accordion-header">
        <div>
          <p className="v3-eyebrow">album accordion</p>
          <h2>{subject.name}</h2>
          {subject.groupName && <p className="v3-muted">{subject.groupName}</p>}
          <p className="v3-muted">{sorted.length}개의 순간이 이어져 있어요.</p>
        </div>
        {onBack && (
          <button className="v3-btn v3-btn-quiet" type="button" onClick={onBack}>
            ← 앨범 서가로
          </button>
        )}
        {subject.treeIds[0] && (
          <Link className="v3-btn v3-btn-quiet" href={`/v3/trees/${subject.treeIds[0]}`}>
            관련 트리로 이동
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      <div className="v3-accordion-tracklist">
        {sorted.length === 0 ? (
          <p className="v3-seed-note">이 주제에는 아직 담긴 순간이 없어요.</p>
        ) : (
          sorted.map((memory, index) => (
            <button
              className="v3-accordion-row"
              type="button"
              key={memory.id}
              aria-expanded={openIndex === index}
              aria-pressed={openIndex === index}
              onClick={() => onSelectMoment(memory.id)}
            >
              <span className="v3-accordion-row-index">
                {(index + 1).toString().padStart(2, "0")}
              </span>
              {memory.thumbnailUrl ? (
                <img className="v3-accordion-row-thumb" src={memory.thumbnailUrl} alt="" />
              ) : (
                <span
                  className="v3-accordion-row-thumb v3-accordion-row-thumb-fallback"
                  aria-hidden="true"
                >
                  ▶
                </span>
              )}
              <span className="v3-accordion-row-body">
                <strong>{memory.title}</strong>
                <small>
                  {memory.recordDate} · {memory.primaryEmotion ?? "감정 없음"}
                  {memory.relationLabel ? ` · ${memory.relationLabel}` : ""}
                </small>
              </span>
              <span className="v3-accordion-row-toggle" aria-hidden="true">
                {openIndex === index ? "−" : "+"}
              </span>
            </button>
          ))
        )}
      </div>
      {openMemory && (
        <div className="v3-accordion-spread" aria-live="polite">
          <p className="v3-eyebrow">
            {openMemory.recordDate}
            {openMemory.primaryEmotion ? ` · ${openMemory.primaryEmotion}` : ""}
          </p>
          <h3>{openMemory.title}</h3>
          {openMemory.memo && <p className="v3-muted">{openMemory.memo}</p>}
          <div className="v3-onboarding-actions">
            <button
              className="v3-btn v3-btn-primary"
              type="button"
              onClick={() => onOpenViewer(openMemory.id)}
            >
              영상 펼쳐보기
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      )}
      <p className="v3-seed-note">V3 예시 데이터 · 실제 저장은 되지 않아요.</p>
    </div>
  );
}
