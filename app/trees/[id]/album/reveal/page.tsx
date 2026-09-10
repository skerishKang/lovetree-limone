"use client";

import { useParams } from "next/navigation";
import { TreeViewShell } from "@/app/components/TreeViewShell";
import { useTreeMoments } from "@/lib/use-tree-moments";
import { Track70MomentReveal } from "./Track70MomentReveal";

export default function Track70MomentRevealPage() {
  const params = useParams<{ id: string | string[] }>();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const { tree, albumMoments, loading, error, refresh } = useTreeMoments(treeId);

  if (loading) {
    return (
      <TreeViewShell treeId={treeId} activeView="album">
        <div className="tree-page-state" aria-busy="true">Moment reveal을 불러오고 있어요…</div>
      </TreeViewShell>
    );
  }

  if (error || !tree) {
    return (
      <TreeViewShell treeId={treeId} activeView="album">
        <div className="tree-page-state">
          <h1>{error || "러브트리를 찾을 수 없어요."}</h1>
          <button className="button button-quiet" type="button" onClick={() => void refresh()}>다시 시도</button>
        </div>
      </TreeViewShell>
    );
  }

  if (!albumMoments.length) {
    return (
      <TreeViewShell treeId={treeId} activeView="album">
        <div className="tree-page-state">
          <h1>{tree.title}</h1>
          <p>리빌할 Moment가 아직 없습니다.</p>
        </div>
      </TreeViewShell>
    );
  }

  return (
    <TreeViewShell treeId={treeId} activeView="album">
      <Track70MomentReveal treeId={treeId} treeTitle={tree.title} moments={albumMoments} />
    </TreeViewShell>
  );
}
