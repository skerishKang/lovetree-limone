"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ViewSwitcher } from "@/app/components/ViewSwitcher";
import Lineage64FloatingMomentPortal from "@/app/design-lab/lineages/64/v1-2-1/Lineage64FloatingMomentPortal";
import { toLineage64Moments } from "@/lib/lineage-64/product-adapter";
import { useTreeMoments } from "@/lib/use-tree-moments";

const ORBIT_LIMIT = 16;

// Source64 native surface contract rendered below: aria-modal="true" Viewer with
// Moment 상세, Living Board, 관계 보기 and 3D 탐색 links bound to canonical data.

export default function TreePortalPage() {
  const params = useParams<{ id: string | string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const momentId = searchParams.get("moment");
  const { tree, treeMoments, loading, error, isOwner } = useTreeMoments(treeId, undefined, momentId ?? undefined);
  const orbitMoments = useMemo(() => treeMoments.slice(0, ORBIT_LIMIT), [treeMoments]);
  const moments = useMemo(() => toLineage64Moments(orbitMoments), [orbitMoments]);

  const syncMomentToUrl = useCallback((nextMomentId: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (nextMomentId) next.set("moment", nextMomentId);
    else next.delete("moment");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <div className="tree-page" data-mvp-source="64" data-tree-id={treeId}>
      <header className="tree-page-topbar">
        <Link className="tree-page-brand" href="/v4" aria-label="LoveTree 처음 화면으로">LoveTree</Link>
        <nav className="tree-page-nav" aria-label="러브트리 메뉴">
          <Link href="/my-trees">내 러브트리</Link>
          <Link href="/v4/community">둘러보기</Link>
        </nav>
      </header>
      <div className="tree-view-switcher-bar">
        <ViewSwitcher treeId={treeId} active="portal" momentId={momentId} isOwner={isOwner} />
      </div>
      {loading ? <div className="tree-page-state" aria-busy="true">기억을 불러오는 중…</div> : null}
      {!loading && error ? <div className="tree-page-state" role="alert">{error}</div> : null}
      {!loading && !error ? (
        <main
          aria-label={`${tree?.title || "나의 LoveTree"} · 떠 있는 Moment 포털`}
          data-rendering="css3d-dom"
        >
          <Lineage64FloatingMomentPortal
            moments={moments}
            initialMomentId={momentId}
            canonicalTreeId={treeId}
            onMomentChange={syncMomentToUrl}
          />
          {moments.length === 0 ? (
            <p className="tree-page-state">{tree?.title || "나의 LoveTree"}에 아직 기록된 Moment가 없어요.</p>
          ) : null}
        </main>
      ) : null}
    </div>
  );
}
