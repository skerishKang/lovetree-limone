"use client";

import { useMemo } from "react";
import type { V3PreviewMemory } from "./v3-types";

export default function V3DiaryView({ memories }: { memories: V3PreviewMemory[] }) {
  const sorted = useMemo(
    () => [...memories].sort((a, b) => b.recordDate.localeCompare(a.recordDate)),
    [memories],
  );

  if (sorted.length === 0) {
    return (
      <div className="v3-view">
        <h2>마음 다이어리</h2>
        <div className="v3-empty">
          <span aria-hidden="true">✦</span>
          아직 남긴 메모가 없어요.
        </div>
      </div>
    );
  }

  return (
    <div className="v3-view">
      <h2>마음 다이어리</h2>
      <p className="v3-view-note">남긴 메모가 그대로 일기처럼 쌓여요.</p>
      <div className="v3-diary-view">
        {sorted.map((memory) => (
          <article className="v3-diary-entry" key={memory.id}>
            <time dateTime={memory.recordDate}>{memory.recordDate}</time>
            <h3>{memory.title}</h3>
            {memory.memo ? <p>{memory.memo}</p> : <p>남긴 메모가 없어요.</p>}
            <small className="v3-muted">
              {memory.primaryEmotion ?? "감정 없음"} · {memory.sourceType}
            </small>
          </article>
        ))}
      </div>
    </div>
  );
}
