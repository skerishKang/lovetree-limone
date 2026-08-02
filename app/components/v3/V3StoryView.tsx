"use client";

import { useMemo } from "react";
import type { V3PreviewMemory } from "./v3-types";

export default function V3StoryView({ memories }: { memories: V3PreviewMemory[] }) {
  const ordered = useMemo(() => {
    const result: V3PreviewMemory[] = [];
    const visited = new Set<string>();
    const walk = (memory: V3PreviewMemory) => {
      if (visited.has(memory.id)) return;
      visited.add(memory.id);
      result.push(memory);
      memories
        .filter((m) => m.parentId === memory.id)
        .forEach((child) => walk(child));
    };
    memories
      .filter((m) => !m.parentId)
      .forEach((root) => walk(root));
    memories.forEach((memory) => {
      if (!visited.has(memory.id)) walk(memory);
    });
    return result;
  }, [memories]);

  if (ordered.length === 0) {
    return (
      <div className="v3-view">
        <h2>스토리</h2>
        <div className="v3-empty">
          <span aria-hidden="true">✦</span>
          아직 만들 스토리가 없어요.
        </div>
      </div>
    );
  }

  return (
    <div className="v3-view">
      <h2>스토리</h2>
      <p className="v3-view-note">이어진 순간들을 하나의 이야기처럼 읽어요.</p>
      <div className="v3-story-view">
        {ordered.map((memory, index) => (
          <article className="v3-story-scene" key={memory.id}>
            <div className="v3-story-media">
              {memory.thumbnailUrl ? (
                <img src={memory.thumbnailUrl} alt="" />
              ) : (
                <span
                  aria-hidden="true"
                  style={{ display: "grid", placeItems: "center", height: 120, color: "#fff" }}
                >
                  {index === 0 ? "♥" : "✦"}
                </span>
              )}
            </div>
            <div className="v3-story-copy">
              <time dateTime={memory.recordDate}>{memory.recordDate}</time>
              <h3>
                {index + 1}. {memory.title}
              </h3>
              {memory.relationLabel && (
                <p>
                  <b>{memory.relationLabel}</b>로 이어진 순간.
                </p>
              )}
              {memory.memo && <p>{memory.memo}</p>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
