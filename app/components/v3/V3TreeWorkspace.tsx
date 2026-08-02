"use client";

import { useMemo, useState } from "react";
import type { V3PreviewMemory, V3PreviewTree, V3ViewMode } from "./v3-types";
import {
  v3EmotionLabel,
  v3MemoriesByTree,
  v3RootMemories,
} from "./fixtures/v3-fixtures";
import V3WorkspaceSidebar from "./V3WorkspaceSidebar";
import V3GrowthTree from "./V3GrowthTree";
import V3MomentInspector from "./V3MomentInspector";
import V3MomentComposer from "./V3MomentComposer";
import V3FullscreenDrawer from "./V3FullscreenDrawer";
import V3TimelineView from "./V3TimelineView";
import V3DiaryView from "./V3DiaryView";
import V3StoryView from "./V3StoryView";
import V3AlbumView from "./V3AlbumView";
import V3ConnectionMap from "./V3ConnectionMap";
import V3NebulaView from "./V3NebulaView";

const VIEW_MODES: { id: V3ViewMode; label: string }[] = [
  { id: "growth", label: "성장 트리" },
  { id: "timeline", label: "연혁" },
  { id: "diary", label: "다이어리" },
  { id: "story", label: "스토리" },
  { id: "album", label: "앨범" },
  { id: "map", label: "연결 지도" },
  { id: "nebula", label: "성운" },
];

interface V3TreeWorkspaceProps {
  tree: V3PreviewTree;
}

export default function V3TreeWorkspace({ tree }: V3TreeWorkspaceProps) {
  const [viewMode, setViewMode] = useState<V3ViewMode>("growth");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emotionFilter, setEmotionFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const memories = useMemo(() => v3MemoriesByTree(tree.id), [tree.id]);
  const roots = useMemo(() => v3RootMemories(tree.id), [tree.id]);

  const filteredMemories = useMemo(() => {
    return memories.filter((memory) => {
      if (emotionFilter && !memory.emotionTags.includes(emotionFilter)) return false;
      if (sourceFilter && memory.sourceType !== sourceFilter) return false;
      return true;
    });
  }, [memories, emotionFilter, sourceFilter]);

  const filteredRoots = useMemo(() => {
    return roots.filter((memory) => {
      if (emotionFilter && !memory.emotionTags.includes(emotionFilter)) return false;
      if (sourceFilter && memory.sourceType !== sourceFilter) return false;
      return true;
    });
  }, [roots, emotionFilter, sourceFilter]);

  const effectiveSelectedId =
    selectedId && filteredMemories.some((memory) => memory.id === selectedId)
      ? selectedId
      : null;

  const selectedMemory =
    effectiveSelectedId
      ? memories.find((memory) => memory.id === effectiveSelectedId) ?? null
      : null;

  const treeCounts = useMemo(() => {
    return {
      total: memories.length,
      displayed: filteredMemories.length,
      flowers: Math.max(0, memories.length - 3),
      fruits: Math.max(0, memories.length - 5),
    };
  }, [memories, filteredMemories]);

  const relationFor = (memoryId: string) => {
    const memory = memories.find((m) => m.id === memoryId);
    return memory?.relationLabel ?? null;
  };

  const childCountFor = (memoryId: string) => {
    // 숨겨진 노드는 개수에 포함하지 않는다 (필터 일관성)
    return filteredMemories.filter((m) => m.parentId === memoryId).length;
  };

  const availableEmotions = useMemo(
    () => [...new Set(memories.flatMap((memory) => memory.emotionTags))],
    [memories],
  );
  const availableSources = useMemo(
    () => [...new Set(memories.map((memory) => memory.sourceType))],
    [memories],
  );

  return (
    <div className="v3-workspace">
      <V3WorkspaceSidebar
        memories={memories}
        filteredMemories={filteredMemories}
        availableEmotions={availableEmotions}
        availableSources={availableSources}
        emotionFilter={emotionFilter}
        sourceFilter={sourceFilter}
        onEmotionFilter={setEmotionFilter}
        onSourceFilter={setSourceFilter}
        selectedId={effectiveSelectedId}
        onSelect={setSelectedId}
      />
      <div className="v3-workspace-center">
        <div className="v3-tree-toolbar">
          <div className="v3-view-tabs" role="group" aria-label="보기 모드 선택">
            {VIEW_MODES.map((mode) => (
              <button
                className="v3-chip"
                type="button"
                key={mode.id}
                aria-pressed={viewMode === mode.id}
                onClick={() => setViewMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <div className="v3-tree-tools">
            <button
              className="v3-btn v3-btn-quiet"
              type="button"
              aria-pressed={editMode}
              onClick={() => setEditMode((value) => !value)}
            >
              배치 편집
            </button>
            <button
              className="v3-btn v3-btn-icon v3-btn-ghost"
              type="button"
              aria-label="전체 화면으로 열기"
              onClick={() => setIsFullscreen(true)}
            >
              ⛶
            </button>
          </div>
        </div>

        {viewMode === "growth" && (
          <V3GrowthTree
            memories={filteredMemories}
            roots={filteredRoots}
            relationFor={relationFor}
            childCountFor={childCountFor}
            selectedId={effectiveSelectedId}
            onSelect={setSelectedId}
            editMode={editMode}
            counts={treeCounts}
          />
        )}
        {viewMode === "timeline" && <V3TimelineView memories={filteredMemories} />}
        {viewMode === "diary" && <V3DiaryView memories={filteredMemories} />}
        {viewMode === "story" && <V3StoryView memories={filteredMemories} />}
        {viewMode === "album" && <V3AlbumView memories={filteredMemories} />}
        {viewMode === "map" && (
          <V3ConnectionMap
            memories={filteredMemories}
            roots={filteredRoots}
            relationFor={relationFor}
          />
        )}
        {viewMode === "nebula" && (
          <V3NebulaView
            memories={filteredMemories}
            total={filteredMemories.length}
          />
        )}
      </div>
      <div className="v3-workspace-panel">
        {selectedMemory ? (
          <V3MomentInspector
            memory={selectedMemory}
            relationLabel={relationFor(selectedMemory.id)}
            childCount={childCountFor(selectedMemory.id)}
          />
        ) : (
          <p className="v3-workspace-empty">
            트리에서 순간을 선택하면 상세 정보를 볼 수 있어요.
          </p>
        )}
        <V3MomentComposer
          treeId={tree.id}
          onOpenComposer={() => setIsComposerOpen(true)}
        />
        <p className="v3-seed-note">
          V3 예시 데이터 · 이 화면은 프리뷰이며 실제 저장되지 않아요.
        </p>
      </div>

      {isComposerOpen && (
        <V3FullscreenDrawer
          treeId={tree.id}
          onClose={() => setIsComposerOpen(false)}
          variant="drawer"
          memories={filteredMemories}
        />
      )}
      {isFullscreen && (
        <V3FullscreenDrawer
          treeId={tree.id}
          onClose={() => setIsFullscreen(false)}
          title="전체 화면 트리"
          variant="fullscreen"
          memories={filteredMemories}
        />
      )}
    </div>
  );
}

export type { V3PreviewMemory, V3PreviewTree, V3ViewMode };
export { v3EmotionLabel };
