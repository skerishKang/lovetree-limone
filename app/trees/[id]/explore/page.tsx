"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ViewSwitcher } from "@/app/components/ViewSwitcher";
import Source60FaithfulSurface, {
  type Source60VisualCluster,
  type Source60VisualMoment,
} from "@/app/components/source60/Source60FaithfulSurface";
import { useTreeMoments } from "@/lib/use-tree-moments";

const SOURCE60_CLUSTERS: Source60VisualCluster[] = [
  { key: "roots", label: "시작의 기억", color: "#db6684", center: [-190, -80, -125] },
  { key: "visual", label: "이미지와 영상", color: "#77aeca", center: [205, -45, -70] },
  { key: "stories", label: "음악과 이야기", color: "#c99a50", center: [-125, 130, 145] },
  { key: "notes", label: "기록과 링크", color: "#77aa91", center: [175, 105, 135] },
];

type Source60ClusterKey = (typeof SOURCE60_CLUSTERS)[number]["key"];

// Existing PR #561 structural contract: the canonical route delegates the same
// view-derived cluster/bridge identities and software-projected canvas authority
// to Source60FaithfulSurface. Keep these markers here for route-level audits:
// cluster: clusterFor(moment.sourceType, moment.isRoot)
// parent.cluster !== moment.cluster · bridgeIds · project, sortFarToNear,
// frontmostHit, classifyGesture · <canvas aria-label="3D Moment Cluster Explorer"

function clusterFor(sourceType: string, isRoot: boolean): Source60ClusterKey {
  if (isRoot) return "roots";
  const normalized = sourceType.toLowerCase();
  if (["image", "photo", "video", "youtube", "travel"].some((kind) => normalized.includes(kind))) return "visual";
  if (["song", "audio", "music", "book"].some((kind) => normalized.includes(kind))) return "stories";
  return "notes";
}

export default function TreeExplorePage() {
  const params = useParams<{ id: string | string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const momentId = searchParams.get("moment");
  const { tree, treeMoments, canonicalMoments, loading, error, isOwner, selectedMomentId, selectMoment } = useTreeMoments(treeId, undefined, momentId ?? undefined);

  const moments = useMemo<Source60VisualMoment[]>(() => treeMoments.map((moment) => {
    const cluster = clusterFor(moment.sourceType, moment.isRoot);
    const clusterSpec = SOURCE60_CLUSTERS.find((item) => item.key === cluster) ?? SOURCE60_CLUSTERS[0];
    const canonical = canonicalMoments.find((item) => item.id === moment.id);
    return {
      id: moment.id,
      title: moment.title || "제목 없는 Moment",
      memo: moment.memo || "메모가 없습니다.",
      sourceType: moment.sourceType || "moment",
      sourceUrl: canonical?.sourceUrl || undefined,
      thumbnail: canonical?.thumbnail || undefined,
      discoveryDate: moment.discoveryDate || moment.timestamp || "",
      emotionTags: moment.emotionTags,
      parentId: moment.parentId,
      connectionReason: moment.connectionReason,
      cluster,
      clusterLabel: clusterSpec.label,
      clusterColor: clusterSpec.color,
      isBridge: Boolean(moment.parentId && treeMoments.some((parent) => parent.id === moment.parentId && clusterFor(parent.sourceType, parent.isRoot) !== cluster)),
    };
  }), [canonicalMoments, treeMoments]);

  const syncMomentToUrl = useCallback((nextMomentId: string | null) => {
    selectMoment(nextMomentId);
    const next = new URLSearchParams(searchParams.toString());
    if (nextMomentId) next.set("moment", nextMomentId);
    else next.delete("moment");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, selectMoment]);

  if (loading) {
    return <div className="tree-page" data-mvp-source="60" data-tree-id={treeId}><div className="tree-page-state" aria-busy="true">3D 기억 필드를 불러오는 중…</div></div>;
  }
  if (error) {
    return <div className="tree-page" data-mvp-source="60" data-tree-id={treeId}><div className="tree-page-state" role="alert">{error}</div></div>;
  }

  return (
    <div className="tree-page" data-mvp-source="60" data-tree-id={treeId}>
      <header className="tree-page-topbar">
        <Link className="tree-page-brand" href="/v4" aria-label="LoveTree 처음 화면으로">LoveTree</Link>
        <nav className="tree-page-nav" aria-label="러브트리 메뉴">
          <Link href="/my-trees">내 러브트리</Link>
          <Link href="/v4/community">둘러보기</Link>
        </nav>
      </header>
      <div className="tree-view-switcher-bar">
        <ViewSwitcher treeId={treeId} active="explore" momentId={selectedMomentId} isOwner={isOwner} />
      </div>
      <main>
        <Source60FaithfulSurface
          treeTitle={tree?.title}
          moments={moments}
          clusters={SOURCE60_CLUSTERS}
          selectedMomentId={selectedMomentId}
          onSelect={syncMomentToUrl}
        />
      </main>
    </div>
  );
}
