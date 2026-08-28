"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ViewSwitcher } from "@/app/components/ViewSwitcher";
import SourceTrack58LivingMemoryBoard from "@/components/source-track-58/SourceTrack58LivingMemoryBoard";
import mobileSpatialStyles from "@/app/design-lab/source-tracks/58/v1-2-native/source58-mobile-spatial-p0.module.css";
import repairStyles from "@/app/design-lab/source-tracks/58/v1-2-native/source58-visual-repair.module.css";

export default function TreeLivingBoardPage() {
  const params = useParams<{ id: string | string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const momentId = searchParams.get("moment");

  const syncMomentToUrl = useCallback(
    (nextMomentId: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (nextMomentId) next.set("moment", nextMomentId);
      else next.delete("moment");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="tree-page" data-mvp-source="58" data-tree-id={treeId}>
      <header className="tree-page-topbar">
        <Link className="tree-page-brand" href="/v4" aria-label="LoveTree 처음 화면으로">
          LoveTree
        </Link>
        <nav className="tree-page-nav" aria-label="러브트리 메뉴">
          <Link href="/my-trees">내 러브트리</Link>
          <Link href="/v4/community">둘러보기</Link>
        </nav>
      </header>

      <div className="tree-view-switcher-bar">
        <ViewSwitcher treeId={treeId} active="board" momentId={momentId} />
      </div>

      <div className={`${repairStyles.repairScope} ${mobileSpatialStyles.mobileSpatialScope}`}>
        <SourceTrack58LivingMemoryBoard
          treeId={treeId}
          initialMomentId={momentId}
          onMomentChange={syncMomentToUrl}
          mode="product"
        />
      </div>
    </div>
  );
}
