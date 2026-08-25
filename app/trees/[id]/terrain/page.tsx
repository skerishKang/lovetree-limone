"use client";

import { useParams } from "next/navigation";
import { TreeViewShell } from "@/app/components/TreeViewShell";
import { useTreeMoments } from "@/lib/use-tree-moments";
import LivingMemoryTerrain from "./LivingMemoryTerrain";

export default function LivingMemoryTerrainPage() {
  const params = useParams<{ id: string | string[] }>();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const {
    tree,
    moments,
    loading,
    error,
    isOwner,
    selectedMomentId,
    selectMoment,
    refresh,
  } = useTreeMoments(treeId);

  if (loading) {
    return (
      <TreeViewShell treeId={treeId} activeView="tree">
        <div className="tree-page-state" aria-busy="true">리빙 메모리 지형을 불러오고 있어요…</div>
      </TreeViewShell>
    );
  }

  if (error || !tree) {
    return (
      <TreeViewShell treeId={treeId} activeView="tree">
        <div className="tree-page-state">
          <span className="tree-page-symbol" aria-hidden="true">!</span>
          <h1>{error || "러브트리를 찾을 수 없어요."}</h1>
          <p>이 지형 lens는 기존 Tree/Moment API와 같은 접근 권한을 사용합니다.</p>
          <div className="tree-page-actions">
            <button className="button button-quiet" type="button" onClick={() => void refresh()}>다시 시도</button>
          </div>
        </div>
      </TreeViewShell>
    );
  }

  return (
    <TreeViewShell
      treeId={treeId}
      activeView="tree"
      momentId={selectedMomentId}
      isOwner={isOwner}
    >
      <LivingMemoryTerrain
        tree={tree}
        moments={moments}
        selectedMomentId={selectedMomentId}
        onSelectMoment={selectMoment}
      />
    </TreeViewShell>
  );
}
