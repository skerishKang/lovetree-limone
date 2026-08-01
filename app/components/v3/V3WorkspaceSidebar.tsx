"use client";

import type { V3PreviewMemory } from "./v3-types";

interface V3WorkspaceSidebarProps {
  memories: V3PreviewMemory[];
  filteredMemories: V3PreviewMemory[];
  availableEmotions: string[];
  availableSources: string[];
  emotionFilter: string | null;
  sourceFilter: string | null;
  onEmotionFilter: (value: string | null) => void;
  onSourceFilter: (value: string | null) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function V3WorkspaceSidebar({
  filteredMemories,
  availableEmotions,
  availableSources,
  emotionFilter,
  sourceFilter,
  onEmotionFilter,
  onSourceFilter,
  selectedId,
  onSelect,
}: V3WorkspaceSidebarProps) {
  return (
    <aside className="v3-workspace-panel" aria-label="트리 사이드바">
      <div>
        <h2 className="v3-workspace-heading">날짜 목록</h2>
        <p className="v3-workspace-sub">기록된 순간을 날짜순으로 확인해요.</p>
        <div className="v3-diary-list">
          {filteredMemories.map((memory) => (
            <button
              className="v3-diary-item"
              type="button"
              key={memory.id}
              aria-pressed={selectedId === memory.id}
              onClick={() => onSelect(memory.id)}
            >
              <span className="v3-diary-date">{memory.recordDate}</span>
              <strong>{memory.title}</strong>
              <small>
                {memory.primaryEmotion ?? "감정 없음"} · {memory.sourceType}
              </small>
            </button>
          ))}
        </div>
      </div>
      <div className="v3-filter-list">
        <div className="v3-filter-group">
          <span>감정 필터</span>
          <div className="v3-chip-group" role="group" aria-label="감정 필터">
            <button
              className="v3-chip"
              type="button"
              aria-pressed={emotionFilter === null}
              onClick={() => onEmotionFilter(null)}
            >
              전체
            </button>
            {availableEmotions.map((emotion) => (
              <button
                className="v3-chip"
                type="button"
                key={emotion}
                aria-pressed={emotionFilter === emotion}
                onClick={() =>
                  onEmotionFilter(emotionFilter === emotion ? null : emotion)
                }
              >
                {emotion}
              </button>
            ))}
          </div>
        </div>
        <div className="v3-filter-group">
          <span>출처 필터</span>
          <div className="v3-chip-group" role="group" aria-label="출처 필터">
            <button
              className="v3-chip"
              type="button"
              aria-pressed={sourceFilter === null}
              onClick={() => onSourceFilter(null)}
            >
              전체
            </button>
            {availableSources.map((source) => (
              <button
                className="v3-chip"
                type="button"
                key={source}
                aria-pressed={sourceFilter === source}
                onClick={() =>
                  onSourceFilter(sourceFilter === source ? null : source)
                }
              >
                {source}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <h2 className="v3-workspace-heading">마음 다이어리</h2>
        <p className="v3-workspace-sub">쓴 메모가 그대로 일기처럼 남아요.</p>
        <div className="v3-diary-list">
          {filteredMemories.map((memory) => (
            <button
              className="v3-diary-item"
              type="button"
              key={`${memory.id}-diary`}
              aria-pressed={selectedId === memory.id}
              onClick={() => onSelect(memory.id)}
            >
              <strong>{memory.title}</strong>
              <small>{memory.memo ?? "남긴 메모가 없어요."}</small>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
