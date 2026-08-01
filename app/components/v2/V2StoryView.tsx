"use client";

import { useMemo } from "react";
import type { MemoryRecord } from "@/lib/tree-types";

interface V2StoryViewProps {
  memories: MemoryRecord[];
}

export default function V2StoryView({ memories }: V2StoryViewProps) {
  const sorted = useMemo(() => [...memories].sort((a, b) => {
    const da = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const db = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return db - da;
  }), [memories]);

  if (sorted.length === 0) {
    return (
      <div className="v2-story-empty">
        <span style={{ fontSize: "1.5rem", color: "var(--v2-rose)" }}>◫</span>
        <p style={{ fontFamily: "var(--v2-display)", fontSize: "1.1rem", margin: "8px 0 0" }}>아직 스토리가 없어요.</p>
        <p style={{ color: "var(--v2-muted)", fontSize: ".75rem", margin: "4px 0 0" }}>순간을 추가하면 스토리가 만들어져요.</p>
      </div>
    );
  }

  return (
    <div className="v2-story-view">
      <h2>스토리</h2>
      <p>앨범처럼 한 장씩 감상</p>
      {sorted.map((memory) => (
        <article className="v2-story-card" key={memory.id}>
          <div className="v2-story-media">
            <span style={{ color: "rgba(255,253,248,.8)", fontSize: "2rem" }}>▶</span>
          </div>
          <div className="v2-story-body">
            <time>{memory.timestamp ? memory.timestamp.replace(/-/g, ". ") : "-"}</time>
            <h3>{memory.title || "제목 없는 순간"}</h3>
            <p>{memory.memo || "기록이 없습니다."}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
