"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { V3PreviewMemory, V3SubjectAlbum } from "./v3-types";
import { v3MemoriesByTree } from "./fixtures/v3-fixtures";
import V3VideoViewer from "./V3VideoViewer";

interface V3AlbumAccordionProps {
  album: V3SubjectAlbum;
  onBack?: () => void;
}

export default function V3AlbumAccordion({ album, onBack }: V3AlbumAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const memories = useMemo(
    () =>
      [...v3MemoriesByTree(album.treeIds[0] ?? "")].sort((a, b) =>
        b.recordDate.localeCompare(a.recordDate),
      ),
    [album.treeIds],
  );

  const openMemory = openIndex !== null ? memories[openIndex] : null;

  return (
    <div className="v3-album-accordion" aria-label={`${album.name} 앨범 아코디언`}>
      <div className="v3-accordion-header">
        <div>
          <p className="v3-eyebrow">motion archive</p>
          <h2>{album.name}</h2>
          {album.groupName && <p className="v3-muted">{album.groupName}</p>}
          <p className="v3-muted">{memories.length}개의 영상 순간이 이어져 있어요.</p>
        </div>
        {onBack && (
          <button className="v3-btn v3-btn-quiet" type="button" onClick={onBack}>
            ← 앨범 서가로
          </button>
        )}
        {album.treeIds[0] && (
          <Link className="v3-btn v3-btn-quiet" href={`/v3/trees/${album.treeIds[0]}`}>
            관련 트리로 이동
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      <div className="v3-accordion-tracklist">
        {memories.map((memory, index) => (
          <button
            className="v3-accordion-row"
            type="button"
            key={memory.id}
            aria-pressed={openIndex === index}
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <span className="v3-accordion-row-index">
              {(index + 1).toString().padStart(2, "0")}
            </span>
            {memory.thumbnailUrl ? (
              <img className="v3-accordion-row-thumb" src={memory.thumbnailUrl} alt="" />
            ) : (
              <span className="v3-accordion-row-thumb v3-accordion-row-thumb-fallback" aria-hidden="true">
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
        ))}
      </div>
      {openMemory && (
        <div className="v3-accordion-spread" aria-live="polite">
          <V3VideoViewer memory={openMemory} onClose={() => setOpenIndex(null)} label="선택한 순간" />
          <div className="v3-onboarding-actions">
            <button className="v3-btn v3-btn-quiet" type="button" onClick={() => setOpenIndex(null)}>
              접기
            </button>
          </div>
        </div>
      )}
      <p className="v3-seed-note">V3 예시 데이터 · 실제 저장은 되지 않아요.</p>
    </div>
  );
}
