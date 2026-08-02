"use client";

import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { V3PreviewMemory } from "./v3-types";

interface V3GrowthTreeProps {
  memories: V3PreviewMemory[];
  roots: V3PreviewMemory[];
  relationFor: (memoryId: string) => string | null;
  childCountFor: (memoryId: string) => number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  editMode: boolean;
  counts: { total: number; displayed: number; flowers: number; fruits: number };
}

const COLORS = ["#c86e79", "#8a9a75", "#a980d1", "#e2b35c", "#7a9cc4", "#69b99a"];

interface LayoutNode {
  memory: V3PreviewMemory;
  x: number;
  y: number;
}

function layoutTree(roots: V3PreviewMemory[], all: V3PreviewMemory[]): LayoutNode[] {
  const nodes: LayoutNode[] = [];
  let column = 0;
  const visited = new Set<string>();

  const walk = (memory: V3PreviewMemory, y: number) => {
    if (visited.has(memory.id)) return;
    visited.add(memory.id);
    const x = 60 + column * 195;
    nodes.push({ memory, x, y });
    column += 1;
    const children = all.filter((m) => m.parentId === memory.id);
    children.forEach((child, index) => walk(child, y + 130 + index * 60));
  };

  roots.forEach((root) => walk(root, 60));
  // include any orphan nodes (not connected to roots)
  all.forEach((memory) => {
    if (!visited.has(memory.id)) {
      walk(memory, 60 + nodes.length * 0);
    }
  });

  return nodes;
}

export default function V3GrowthTree({
  memories,
  roots,
  relationFor,
  childCountFor,
  selectedId,
  onSelect,
  editMode,
  counts,
}: V3GrowthTreeProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const dragStartPoint = useRef<{ x: number; y: number } | null>(null);
  const dragCandidateId = useRef<string | null>(null);
  const activeDragId = useRef<string | null>(null);
  const didDrag = useRef(false);

  const DRAG_THRESHOLD = 4;

  const layout = useMemo(() => layoutTree(roots, memories), [roots, memories]);

  const nodeByMemory = (memory: V3PreviewMemory) => {
    const base = layout.find((n) => n.memory.id === memory.id);
    if (!base) return { x: 60, y: 60 };
    const moved = positions[memory.id];
    return moved ?? { x: base.x, y: base.y };
  };

  const edges = useMemo(() => {
    const list: { from: string; to: string }[] = [];
    memories.forEach((memory) => {
      if (memory.parentId) {
        const parent = memories.find((m) => m.id === memory.parentId);
        if (parent) list.push({ from: memory.parentId, to: memory.id });
      }
    });
    return list;
  }, [memories]);

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const node = layout.find((n) => n.memory.id === dragCandidateId.current);
    const pos = node ? nodeByMemory(node.memory) : { x: 60, y: 60 };
    dragOffset.current = {
      dx: event.clientX - rect.left - pos.x,
      dy: event.clientY - rect.top - pos.y,
    };
    activeDragId.current = dragCandidateId.current;
    didDrag.current = true;
    canvasRef.current?.setPointerCapture?.(event.pointerId);
    setDragId(dragCandidateId.current);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>, memoryId: string) {
    if (!editMode) return;
    didDrag.current = false;
    dragStartPoint.current = { x: event.clientX, y: event.clientY };
    dragCandidateId.current = memoryId;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!editMode || !dragStartPoint.current) return;
    if (!activeDragId.current) {
      const dx = event.clientX - dragStartPoint.current.x;
      const dy = event.clientY - dragStartPoint.current.y;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      beginDrag(event);
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    const id = activeDragId.current;
    if (!rect || !id) return;
    const x = Math.max(8, Math.min(event.clientX - rect.left - dragOffset.current.dx, rect.width - 160));
    const y = Math.max(8, Math.min(event.clientY - rect.top - dragOffset.current.dy, rect.height - 90));
    setPositions((prev) => ({ ...prev, [id]: { x, y } }));
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (activeDragId.current) {
      canvasRef.current?.releasePointerCapture?.(event.pointerId);
    }
    activeDragId.current = null;
    dragStartPoint.current = null;
    setDragId(null);
  }

  function moveSelectedBy(dx: number, dy: number) {
    if (!selectedId || !editMode) return;
    setPositions((prev) => {
      const current = prev[selectedId] ?? layout.find((n) => n.memory.id === selectedId);
      if (!current) return prev;
      return {
        ...prev,
        [selectedId]: {
          x: Math.max(8, Math.min(current.x + dx, (canvasRef.current?.clientWidth ?? 800) - 160)),
          y: Math.max(8, Math.min(current.y + dy, (canvasRef.current?.clientHeight ?? 500) - 90)),
        },
      };
    });
  }

  const rootIds = new Set(roots.map((root) => root.id));

  return (
    <div>
      <div
        className="v3-growth-canvas"
        ref={canvasRef}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        aria-label="성장 트리 캔버스"
      >
        <svg aria-hidden="true">
          {edges.map((edge) => {
            const from = memories.find((m) => m.id === edge.from);
            const to = memories.find((m) => m.id === edge.to);
            if (!from || !to) return null;
            const fromPos = nodeByMemory(from);
            const toPos = nodeByMemory(to);
            const color = COLORS[memories.indexOf(from) % COLORS.length];
            return (
              <path
                key={`${edge.from}-${edge.to}`}
                d={`M ${fromPos.x + 84} ${fromPos.y + 10} C ${fromPos.x + 84} ${
                  fromPos.y + 40
                }, ${toPos.x + 84} ${toPos.y - 20}, ${toPos.x + 84} ${toPos.y - 10}`}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            );
          })}
        </svg>
        {layout.map(({ memory }) => {
          const pos = nodeByMemory(memory);
          const isRoot = rootIds.has(memory.id);
          return (
            <div
              className={`v3-growth-node${selectedId === memory.id ? " v3-node-selected" : ""}`}
              key={memory.id}
              role="button"
              tabIndex={0}
              aria-pressed={selectedId === memory.id}
              aria-label={`${memory.title} 순간${editMode ? " · 배치 편집 중" : ""}`}
              style={{ left: pos.x, top: pos.y, zIndex: dragId === memory.id ? 5 : 2 }}
              onClick={() => {
                if (didDrag.current) return;
                onSelect(memory.id);
              }}              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(memory.id);
                }
                if (editMode) {
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    moveSelectedBy(-12, 0);
                  } else if (event.key === "ArrowRight") {
                    event.preventDefault();
                    moveSelectedBy(12, 0);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    moveSelectedBy(0, -12);
                  } else if (event.key === "ArrowDown") {
                    event.preventDefault();
                    moveSelectedBy(0, 12);
                  }
                }
              }}
              onPointerDown={(event) => onPointerDown(event, memory.id)}
            >
              {memory.thumbnailUrl ? (
                <img src={memory.thumbnailUrl} alt="" draggable={false} />
              ) : (
                <div className="v3-preview-media v3-media-b" style={{ height: 72 }} aria-hidden="true">
                  <span>{isRoot ? "♥" : "✦"}</span>
                </div>
              )}
              <div className="v3-growth-node-meta">
                <span className="v3-growth-node-tag">
                  {memory.primaryEmotion ?? "감정 없음"} · {memory.recordDate}
                </span>
                <span className="v3-growth-node-title">{memory.title}</span>
                {relationFor(memory.id) && (
                  <span className="v3-growth-node-relation">
                    ↳ {relationFor(memory.id)}
                  </span>
                )}
                {childCountFor(memory.id) > 0 && (
                  <span className="v3-growth-node-relation">
                    이어진 순간 {childCountFor(memory.id)}개
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {editMode && (
          <p className="v3-map-note" style={{ position: "absolute", left: 12, top: 12 }}>
            배치 편집 중 — 카드를 드래그해 위치를 바꿀 수 있어요. (위치는 저장되지 않아요)
          </p>
        )}
      </div>
      <div className="v3-tree-legend" aria-label="트리 통계">
        <span>
          <i style={{ background: "#c86e79" }} aria-hidden="true" />
          표시된 순간 {counts.displayed} / {counts.total}개
        </span>
        <span>
          <i style={{ background: "#e5c650" }} aria-hidden="true" />
          피어난 꽃 {counts.flowers}개
        </span>
        <span>
          <i style={{ background: "#a980d1" }} aria-hidden="true" />
          맺힌 열매 {counts.fruits}개
        </span>
      </div>
    </div>
  );
}
