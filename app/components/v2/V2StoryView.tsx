"use client";

import { useMemo } from "react";
import { isSafeExternalUrl, resolveMemoryThumbnail, sourceTypeLabel, type MemoryRecord } from "@/lib/tree-types";

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
      {sorted.map((memory) => {
        const thumbnail = resolveMemoryThumbnail(memory);
        const safeSourceUrl = isSafeExternalUrl(memory.sourceUrl);
        return (
          <article className="v2-story-card" key={memory.id}>
            <div className="v2-story-media">
              <span style={{ color: "rgba(255,253,248,.8)", fontSize: "2rem" }}>▶</span>
              {thumbnail ? (
                <img src={thumbnail} alt="" loading="lazy" onError={(e) => e.currentTarget.remove()} />
              ) : null}
            </div>
            <div className="v2-story-body">
              <div className="v2-diary-entry-top">
                <span className="v2-diary-source-type">{sourceTypeLabel(memory.sourceType)}</span>
                <time>{memory.timestamp ? memory.timestamp.replace(/-/g, ". ") : "-"}</time>
              </div>
              <h3>{memory.title || "제목 없는 순간"}</h3>
              <p>{memory.memo || "기록이 없습니다."}</p>
              {safeSourceUrl ? (
                <a
                  className="v2-memory-source"
                  href={memory.sourceUrl!}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {memory.source || "출처 열기"} ↗
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
