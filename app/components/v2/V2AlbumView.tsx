"use client";

import type { MemoryRecord } from "@/lib/tree-types";

interface V2AlbumViewProps {
  memories: MemoryRecord[];
}

export default function V2AlbumView({ memories }: V2AlbumViewProps) {
  if (memories.length === 0) {
    return (
      <div className="v2-album-empty">
        <span style={{ fontSize: "1.5rem", color: "var(--v2-rose)" }}>▦</span>
        <p style={{ fontFamily: "var(--v2-display)", fontSize: "1.1rem", margin: "8px 0 0" }}>앨범이 비어 있어요.</p>
        <p style={{ color: "var(--v2-muted)", fontSize: ".75rem", margin: "4px 0 0" }}>순간을 추가하면 앨범에서 확인할 수 있어요.</p>
      </div>
    );
  }

  return (
    <div className="v2-album-view">
      <h2>앨범 보드</h2>
      <p>사진과 영상을 한눈에</p>
      <div className="v2-album-grid">
        {memories.map((memory) => (
          <div className="v2-album-item" key={memory.id}>
            <div className="v2-album-image">
              <span style={{ color: "rgba(255,253,248,.8)", fontSize: "1.5rem" }}>✦</span>
            </div>
            <p>{memory.title || "제목 없음"}</p>
            <small>{memory.timestamp ? memory.timestamp.replace(/-/g, ". ") : "-"}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
