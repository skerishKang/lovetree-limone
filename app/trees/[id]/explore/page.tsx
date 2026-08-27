"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ViewSwitcher } from "@/app/components/ViewSwitcher";
import Lineage60ClusterExplorer from "@/app/design-lab/lineages/60/v1-2/Lineage60ClusterExplorer";
import { useTreeMoments } from "@/lib/use-tree-moments";
import {
  deriveBridges,
  type ClusterView,
  type ThemeKey,
  type Track60Moment,
} from "@/lib/lineage-60/data";
import styles from "./explore.module.css";

const CLUSTER_SPECS: Array<Omit<ClusterView, "memberIds">> = [
  { key: "first", label: "시작의 기억", color: "#ff9bb3", center: [-200, -50, -130] },
  { key: "trip", label: "이미지와 영상", color: "#7ec8ff", center: [210, 40, -70] },
  { key: "comfort", label: "음악과 이야기", color: "#ffd27e", center: [-120, 130, 150] },
  { key: "growth", label: "기록과 링크", color: "#a6f0c6", center: [170, -130, 130] },
];

function canonicalSourceType(sourceType: string): Track60Moment["sourceType"] {
  const normalized = sourceType.toLowerCase();
  if (normalized.includes("song") || normalized.includes("audio") || normalized.includes("music")) return "song";
  if (normalized.includes("book")) return "book";
  if (normalized.includes("video") || normalized.includes("youtube")) return "video";
  if (normalized.includes("link")) return "link";
  if (normalized.includes("image") || normalized.includes("photo") || normalized.includes("travel")) return "photo";
  return "memo";
}

function themeFor(sourceType: Track60Moment["sourceType"], isRoot: boolean): ThemeKey {
  if (isRoot) return "first";
  if (sourceType === "photo" || sourceType === "video") return "trip";
  if (sourceType === "song" || sourceType === "book") return "comfort";
  return "growth";
}

export default function TreeExplorePage() {
  const params = useParams<{ id: string | string[] }>();
  const searchParams = useSearchParams();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const momentId = searchParams.get("moment");
  const {
    tree,
    treeMoments,
    loading,
    error,
    isOwner,
    selectedMomentId,
  } = useTreeMoments(treeId, undefined, momentId ?? undefined);

  const moments = useMemo<Track60Moment[]>(() => treeMoments.map((moment) => {
    const sourceType = canonicalSourceType(moment.sourceType || "memo");
    return {
      id: moment.id,
      title: moment.title || "제목 없는 Moment",
      memo: moment.memo || "이 순간에 남긴 기억",
      sourceType,
      sourceUrl: moment.sourceUrl || undefined,
      discoveryDate: moment.discoveryDate || moment.timestamp || moment.createdAt,
      emotionTags: moment.emotionTags,
      parentId: moment.parentId,
      connectionReason: moment.connectionReason || (moment.parentId ? "이전 Moment에서 이어진 기억" : "이 LoveTree의 시작 Moment"),
      theme: themeFor(sourceType, Boolean(moment.isRoot || !moment.parentId)),
      thumbnail: moment.thumbnail || undefined,
    };
  }), [treeMoments]);

  const clusters = useMemo<ClusterView[]>(() => CLUSTER_SPECS.map((cluster) => ({
    ...cluster,
    memberIds: moments.filter((moment) => moment.theme === cluster.key).map((moment) => moment.id),
  })).filter((cluster) => cluster.memberIds.length > 0), [moments]);

  const bridges = useMemo(() => deriveBridges(moments), [moments]);

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

      <main className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <small>기억의 공간</small>
            <h1>3D Moment Cluster Explorer</h1>
          </div>
          <p>
            {tree?.title ? `${tree.title}의 ` : ""}Moment를 기억의 무리와 연결로 펼쳐봅니다. 서로 다른 기억 사이를 잇는
            Bridge Moment를 발견하고 전체 Tree 속에서 순간들의 위치를 살펴보세요.
          </p>
        </header>

        <div className={styles.truth} aria-label="3D 탐색 안내">
          <span>드래그로 회전</span>
          <span>휠 또는 핀치로 확대</span>
          <span>Moment를 눌러 선택</span>
          <span>Bridge는 기억 무리를 잇는 순간</span>
        </div>

        {loading ? <div className={styles.state} aria-busy="true">3D 기억 필드를 불러오는 중…</div> : null}
        {!loading && error ? <div className={styles.state} role="alert">{error}</div> : null}
        {!loading && !error && moments.length === 0 ? <div className={styles.state}>탐색할 Moment가 없습니다.</div> : null}

        {!loading && !error && moments.length > 0 ? (
          <div data-testid="source60-native-product-explorer">
            <Lineage60ClusterExplorer moments={moments} clusters={clusters} bridges={bridges} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
