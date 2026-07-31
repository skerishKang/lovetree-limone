"use client";

import type { MemoryRecord } from "@/lib/tree-types";

interface V2DiaryViewProps {
  memories: MemoryRecord[];
}

export default function V2DiaryView({ memories }: V2DiaryViewProps) {
  if (memories.length === 0) {
    return (
      <div className="v2-diary-empty">
        <span style={{ fontSize: "1.5rem", color: "var(--v2-rose)" }}>▤</span>
        <p style={{ fontFamily: "var(--v2-display)", fontSize: "1.1rem", margin: "8px 0 0" }}>마음 다이어리가 비어 있어요.</p>
        <p style={{ color: "var(--v2-muted)", fontSize: ".75rem", margin: "4px 0 0" }}>순간을 추가하면 여기에 기록돼요.</p>
      </div>
    );
  }

  return (
    <div className="v2-diary-view">
      <h2>마음 다이어리</h2>
      <p>글과 테이프로 꾸미는 기록</p>
      {memories.map((memory) => (
        <article className="v2-diary-entry" key={memory.id}>
          <time>{memory.timestamp ? memory.timestamp.replace(/-/g, ". ") : "-"}</time>
          <h3>{memory.title || "제목 없는 순간"}</h3>
          <p>{memory.memo || "기록이 없습니다."}</p>
          {memory.emotionTags && memory.emotionTags.length > 0 && (
            <div className="v2-memory-tags" style={{ marginTop: "10px" }}>
              {memory.emotionTags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
