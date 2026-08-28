"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ViewSwitcher } from "@/app/components/ViewSwitcher";
import Lineage53VerticalNetworkOverview from "@/app/design-lab/lineages/53/53-v3-vertical-network-overview/Lineage53VerticalNetworkOverview";
import { useTreeMoments } from "@/lib/use-tree-moments";
import { adaptCanonicalMomentsToSource56 } from "./source56-canonical-adapter";

export default function TreeRelationshipsPage() {
  const params = useParams<{ id: string | string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const momentId = searchParams.get("moment");
  const {
    treeMoments,
    loading,
    error,
    isOwner,
    selectedMomentId,
    selectMoment,
  } = useTreeMoments(treeId, undefined, momentId ?? undefined);

  const presentationData = useMemo(
    () => adaptCanonicalMomentsToSource56(treeMoments),
    [treeMoments],
  );

  const syncMomentToUrl = useCallback(
    (nextMomentId: string | null) => {
      selectMoment(nextMomentId);
      const next = new URLSearchParams(searchParams.toString());
      if (nextMomentId) next.set("moment", nextMomentId);
      else next.delete("moment");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, selectMoment],
  );

  const encodedTreeId = encodeURIComponent(treeId);
  const momentSuffix = selectedMomentId ? `?moment=${encodeURIComponent(selectedMomentId)}` : "";

  return (
    <div className="tree-page" data-mvp-source="56" data-tree-id={treeId}>
      <header className="tree-page-topbar">
        <Link className="tree-page-brand" href="/v4" aria-label="LoveTree 처음 화면으로">LoveTree</Link>
        <nav className="tree-page-nav" aria-label="러브트리 메뉴">
          <Link href="/my-trees">내 러브트리</Link>
          <Link href="/v4/community">둘러보기</Link>
        </nav>
      </header>
      <div className="tree-view-switcher-bar">
        <ViewSwitcher treeId={treeId} active="relationships" momentId={selectedMomentId} isOwner={isOwner} />
      </div>

      {loading ? <div className="tree-page-state" aria-busy="true">관계망을 불러오는 중…</div> : null}
      {!loading && error ? <div className="tree-page-state" role="alert">{error}</div> : null}
      {!loading && !error && presentationData.moments.length === 0 ? (
        <div className="tree-page-state">아직 연결해 볼 Moment가 없습니다.</div>
      ) : null}
      {!loading && !error && presentationData.moments.length > 0 ? (
        <div data-testid="source56-canonical-network">
          <Lineage53VerticalNetworkOverview
            presentationData={presentationData}
            selectedMomentId={selectedMomentId}
            onSelectMoment={syncMomentToUrl}
          />
          <nav className="source56-canonical-cross-source" aria-label="이 Moment를 다른 보기로 열기">
            <Link href={`/trees/${encodedTreeId}${momentSuffix}`}>기억 카드 · 57</Link>
            <Link href={`/trees/${encodedTreeId}/board${momentSuffix}`}>보드 · 58</Link>
            <Link href={`/trees/${encodedTreeId}/explore${momentSuffix}`}>클러스터 탐색 · 60</Link>
            <Link href={`/trees/${encodedTreeId}/portal${momentSuffix}`}>포털 · 64</Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
