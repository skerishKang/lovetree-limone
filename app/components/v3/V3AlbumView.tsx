"use client";

import { useMemo } from "react";
import type { V3PreviewMemory } from "./v3-types";

export default function V3AlbumView({ memories }: { memories: V3PreviewMemory[] }) {
  const sorted = useMemo(
    () => [...memories].sort((a, b) => b.recordDate.localeCompare(a.recordDate)),
    [memories],
  );

  if (sorted.length === 0) {
    return (
      <div className="v3-view">
        <h2>앨범</h2>
        <div className="v3-empty">
          <span aria-hidden="true">✦</span>
          아직 앨범에 담을 순간이 없어요.
        </div>
      </div>
    );
  }

  return (
    <div className="v3-view">
      <h2>앨범</h2>
      <p className="v3-view-note">모은 순간을 미디어 카드로 둘러보는 앨범 보기예요.</p>
      <div className="v3-album-view">
        {sorted.map((memory, index) => (
          <article className="v3-album-card" key={memory.id}>
            <div className="v3-album-media">
              {memory.thumbnailUrl ? (
                <img src={memory.thumbnailUrl} alt="" />
              ) : (
                <span
                  aria-hidden="true"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    height: 120,
                    color: "#fffaf6",
                    fontSize: "1.4rem",
                  }}
                >
                  {index === 0 ? "♥" : "✦"}
                </span>
              )}
            </div>
            <div className="v3-album-body">
              <strong>{memory.title}</strong>
              <small>
                {memory.recordDate} · {memory.sourceType}
              </small>
              <small>{memory.primaryEmotion ?? "감정 없음"}</small>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
