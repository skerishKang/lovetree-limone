"use client";

import { useMemo } from "react";
import type { MemoryRecord } from "@/lib/tree-types";

interface V2GrowthTreeProps {
  memories: MemoryRecord[];
  treeName: string;
  onSelect?: (id: string) => void;
  readOnly?: boolean;
}

export default function V2GrowthTree({ memories, treeName, onSelect }: V2GrowthTreeProps) {
  const displayMemories = useMemo(() => memories.slice(0, 8), [memories]);

  if (displayMemories.length === 0) {
    return (
      <div className="v2-diary-empty">
        <span style={{ fontSize: "1.5rem", color: "var(--v2-rose)" }}>✦</span>
        <p style={{ fontFamily: "var(--v2-display)", fontSize: "1.1rem", margin: "8px 0 0" }}>아직 심은 순간이 없어요.</p>
        <p style={{ color: "var(--v2-muted)", fontSize: ".75rem", margin: "4px 0 0" }}>첫 순간을 추가하면 성장 트리가 만들어져요.</p>
      </div>
    );
  }

  return (
    <div className="v2-tree-stage" style={{ transform: "none", marginBottom: "24px" }}>
      <div className="v2-stage-topline">
        <span><i className="v2-live-dot" /> {treeName}</span>
        <span className="v2-stage-season">{displayMemories.length}개의 순간</span>
      </div>
      <div className="v2-tree-canvas" style={{ height: "400px", position: "relative" }}>
        <div className="v2-sun-orbit v2-orbit-one" />
        <div className="v2-sun-orbit v2-orbit-two" />
        <div className="v2-trunk" />
        <div className="v2-branch v2-branch-left" />
        <div className="v2-branch v2-branch-right" />
        <div className="v2-leaf v2-leaf-one" />
        <div className="v2-leaf v2-leaf-two" />
        <div className="v2-leaf v2-leaf-three" />
        <div className="v2-stage-seed" aria-hidden="true">✦</div>
        {displayMemories.map((memory, index) => {
          const positions = [
            { left: "50%", top: "30px", transform: "translateX(-50%)" },
            { left: "30px", top: "200px", transform: "none" },
            { right: "30px", top: "240px", left: "auto", transform: "none" },
            { left: "60px", top: "100px", transform: "none" },
            { right: "60px", top: "130px", left: "auto", transform: "none" },
            { left: "20px", top: "300px", transform: "none" },
            { right: "20px", top: "330px", left: "auto", transform: "none" },
            { left: "50%", top: "170px", transform: "translateX(-50%)" },
          ];
          const pos = positions[index % positions.length];
          return (
            <div
              key={memory.id}
              className="v2-moment-card"
              style={{ ...pos, width: displayMemories.length > 4 ? "180px" : "220px", cursor: onSelect ? "pointer" : "default" }}
              onClick={() => onSelect?.(memory.id)}
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onKeyDown={(e) => { if (e.key === "Enter" && onSelect) onSelect(memory.id); }}
            >
              <div className={`v2-moment-media ${index === 0 ? "v2-media-root" : index % 2 === 0 ? "v2-media-a" : "v2-media-b"}`}>
                <small>{memory.timestamp ? memory.timestamp.slice(5, 10) : "-"}</small>
              </div>
              <div className="v2-moment-body">
                <span className="v2-moment-tag">{memory.sourceType || "기록"}</span>
                <h2>{memory.title || "제목 없는 순간"}</h2>
                <p>{memory.memo || ""}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="v2-stage-caption">
        <span className="caption-rule" />
        <p>
          {displayMemories.length}개의 순간이 연결된<br />
          <b>{treeName}</b>
        </p>
      </div>
    </div>
  );
}
