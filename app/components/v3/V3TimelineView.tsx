"use client";

import { useMemo } from "react";
import type { V3PreviewMemory } from "./v3-types";

export default function V3TimelineView({ memories }: { memories: V3PreviewMemory[] }) {
  const byDate = useMemo(() => {
    const map = new Map<string, V3PreviewMemory[]>();
    [...memories]
      .sort((a, b) => a.recordDate.localeCompare(b.recordDate))
      .forEach((memory) => {
        const list = map.get(memory.recordDate) ?? [];
        list.push(memory);
        map.set(memory.recordDate, list);
      });
    return [...map.entries()];
  }, [memories]);

  if (memories.length === 0) {
    return (
      <div className="v3-view">
        <h2>연혁</h2>
        <div className="v3-empty">
          <span aria-hidden="true">✦</span>
          아직 기록된 순간이 없어요.
        </div>
      </div>
    );
  }

  return (
    <div className="v3-view">
      <h2>연혁</h2>
      <p className="v3-view-note">날짜가 쌓인 순간을 시간순으로 읽는 사랑 연혁이에요.</p>
      <div className="v3-timeline">
        {byDate.map(([date, items]) => (
          <article className="v3-timeline-day" key={date}>
            <time className="v3-timeline-date">{date}</time>
            <div className="v3-timeline-list">
              {items.map((memory) => (
                <div className="v3-timeline-memory" key={memory.id}>
                  <strong>{memory.title}</strong>
                  <small>
                    {memory.primaryEmotion ?? "감정 없음"}
                    {memory.relationLabel ? ` · ${memory.relationLabel}` : ""}
                    {memory.memo ? ` · ${memory.memo}` : ""}
                  </small>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
