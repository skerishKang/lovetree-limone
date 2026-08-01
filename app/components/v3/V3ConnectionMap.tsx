"use client";

import { useMemo, useState } from "react";
import type { V3PreviewMemory } from "./v3-types";

interface V3ConnectionMapProps {
  memories: V3PreviewMemory[];
  roots: V3PreviewMemory[];
  relationFor: (memoryId: string) => string | null;
}

const COLORS = ["#c86e79", "#8a9a75", "#a980d1", "#e2b35c", "#7a9cc4", "#69b99a"];

interface NodePos {
  memory: V3PreviewMemory;
  x: number;
  y: number;
}

function layoutNodes(roots: V3PreviewMemory[], all: V3PreviewMemory[]): NodePos[] {
  const nodes: NodePos[] = [];
  const center = { x: 420, y: 260 };
  const ring = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  let index = 0;
  const visited = new Set<string>();
  const walk = (memory: V3PreviewMemory, depth: number) => {
    if (visited.has(memory.id)) return;
    visited.add(memory.id);
    const angle = (index / Math.max(all.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = depth === 0 ? 46 : 96 + depth * 74;
    nodes.push({
      memory,
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
    index += 1;
    all
      .filter((m) => m.parentId === memory.id)
      .forEach((child) => walk(child, depth + 1));
  };
  roots.forEach((root) => walk(root, 0));
  all.forEach((memory) => {
    if (!visited.has(memory.id)) walk(memory, 1);
  });
  void ring;
  return nodes;
}

export default function V3ConnectionMap({
  memories,
  roots,
  relationFor,
}: V3ConnectionMapProps) {
  const [query, setQuery] = useState("");
  const [emotionFilter, setEmotionFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const nodes = useMemo(() => layoutNodes(roots, memories), [roots, memories]);

  const edges = useMemo(() => {
    const list: { from: string; to: string }[] = [];
    memories.forEach((memory) => {
      if (memory.parentId) {
        list.push({ from: memory.parentId, to: memory.id });
      }
    });
    return list;
  }, [memories]);

  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.memory.id, node])),
    [nodes],
  );

  const filteredNodes = nodes.filter((node) => {
    if (emotionFilter && !node.memory.emotionTags.includes(emotionFilter)) return false;
    if (
      query.trim() &&
      !`${node.memory.title} ${node.memory.memo ?? ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const visibleIds = new Set(filteredNodes.map((node) => node.memory.id));

  const selectedNode = selectedId ? nodeById.get(selectedId) : undefined;

  const availableEmotions = useMemo(
    () => [...new Set(memories.flatMap((memory) => memory.emotionTags))],
    [memories],
  );

  return (
    <div className="v3-view">
      <h2>연결 지도</h2>
      <p className="v3-view-note">
        루트에서 가지가 이어지는 연결을 그래프로 보는 보기예요. 노드를 선택하면
        관계 이유를 확인할 수 있어요.
      </p>
      <div className="v3-map-canvas" aria-label="연결 지도 캔버스">
        <svg aria-hidden="true">
          {edges.map((edge) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to) return null;
            if (!visibleIds.has(from.memory.id) || !visibleIds.has(to.memory.id)) {
              return null;
            }
            const color = COLORS[memories.indexOf(from.memory) % COLORS.length];
            return (
              <path
                key={`${edge.from}-${edge.to}`}
                d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${(from.y + to.y) / 2 - 24}, ${to.x} ${to.y}`}
                fill="none"
                stroke={color}
                strokeWidth={2}
                opacity={0.55}
              />
            );
          })}
        </svg>
        {filteredNodes.map((node) => {
          const isRoot = !node.memory.parentId;
          const color = COLORS[memories.indexOf(node.memory) % COLORS.length];
          return (
            <button
              className={`v3-map-node${isRoot ? " v3-map-node-root" : ""}${
                selectedId === node.memory.id ? " v3-node-selected" : ""
              }`}
              type="button"
              key={node.memory.id}
              style={{ left: node.x, top: node.y, borderColor: color }}
              aria-pressed={selectedId === node.memory.id}
              aria-label={`${node.memory.title} 노드 선택`}
              onClick={() => setSelectedId(node.memory.id)}
            >
              {isRoot ? "♥" : node.memory.primaryEmotion ?? "✦"}
            </button>
          );
        })}
        <div className="v3-map-controls">
          <button className="v3-btn v3-btn-icon v3-btn-ghost" type="button" aria-label="확대">
            ＋
          </button>
          <button className="v3-btn v3-btn-icon v3-btn-ghost" type="button" aria-label="축소">
            −
          </button>
          <button className="v3-btn v3-btn-quiet" type="button">
            전체 맞춤
          </button>
        </div>
        <input
          className="v3-input v3-map-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="제목·메모로 찾기"
          aria-label="연결 지도 검색"
        />
        <div className="v3-map-controls v3-map-filter" style={{ top: 64 }}>
          <div className="v3-chip-group" role="group" aria-label="감정 필터">
            <button
              className="v3-chip"
              type="button"
              aria-pressed={emotionFilter === null}
              onClick={() => setEmotionFilter(null)}
            >
              전체
            </button>
            {availableEmotions.map((emotion) => (
              <button
                className="v3-chip"
                type="button"
                key={emotion}
                aria-pressed={emotionFilter === emotion}
                onClick={() => setEmotionFilter(emotionFilter === emotion ? null : emotion)}
              >
                {emotion}
              </button>
            ))}
          </div>
        </div>
        {selectedNode && (
          <div className="v3-map-inspector" aria-label="선택한 노드 상세">
            <strong>{selectedNode.memory.title}</strong>
            <p>
              {selectedNode.memory.primaryEmotion ?? "감정 없음"} ·{" "}
              {selectedNode.memory.recordDate}
            </p>
            {relationFor(selectedNode.memory.id) && (
              <p>관계 이유: {relationFor(selectedNode.memory.id)}</p>
            )}
            {selectedNode.memory.memo && <p>{selectedNode.memory.memo}</p>}
            <button
              className="v3-btn v3-btn-quiet"
              type="button"
              onClick={() => setSelectedId(null)}
            >
              닫기
            </button>
          </div>
        )}
        <div className="v3-minimap" aria-hidden="true">
          {nodes.map((node) => (
            <i
              key={node.memory.id}
              style={{
                position: "absolute",
                left: `${(node.x / 840) * 100}%`,
                top: `${(node.y / 520) * 100}%`,
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: visibleIds.has(node.memory.id) ? COLORS[0] : "#d9cac2",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
