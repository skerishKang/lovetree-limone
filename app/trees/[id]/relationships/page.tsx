"use client";

import Link from "next/link";
import { useCallback, useMemo, type CSSProperties } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ViewSwitcher } from "@/app/components/ViewSwitcher";
import { useTreeMoments } from "@/lib/use-tree-moments";
import styles from "./relationships.module.css";

type NetworkNode = {
  id: string;
  parentId: string | null;
  connectionReason: string | null;
  title: string;
  memo: string;
  sourceType: string;
  emotion: string;
  depth: number;
  x: number;
  y: number;
  tone: string;
};

type NetworkEdge = {
  id: string;
  from: NetworkNode;
  to: NetworkNode;
  reason: string;
};

const TONES = ["#a66b8a", "#7d75b7", "#c17d83", "#b18a65", "#6f9294"];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function edgePath(edge: NetworkEdge) {
  const dx = edge.to.x - edge.from.x;
  const bend = clamp(Math.abs(dx) * 0.42 + 70, 80, 220);
  const direction = dx >= 0 ? 1 : -1;
  return `M ${edge.from.x} ${edge.from.y} C ${edge.from.x + bend * direction} ${edge.from.y + 34}, ${edge.to.x - bend * direction} ${edge.to.y - 34}, ${edge.to.x} ${edge.to.y}`;
}

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

  const nodes = useMemo<NetworkNode[]>(() => {
    return treeMoments.map((moment, index) => {
      const depth = Math.max(0, moment.depth);
      const column = clamp(depth, 0, 4);
      const lateral = ((index % 3) - 1) * 34;
      return {
        id: moment.id,
        parentId: moment.parentId,
        connectionReason: moment.connectionReason,
        title: moment.title || "제목 없는 Moment",
        memo: moment.memo || "메모가 없습니다.",
        sourceType: moment.sourceType || "moment",
        emotion: moment.emotionTags[0] ?? "기억",
        depth,
        x: clamp(120 + column * 178 + lateral, 92, 908),
        y: 105 + index * 118,
        tone: TONES[(depth + index) % TONES.length],
      };
    });
  }, [treeMoments]);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const edges = useMemo<NetworkEdge[]>(() => {
    return nodes.flatMap((node) => {
      if (!node.parentId) return [];
      const parent = nodeById.get(node.parentId);
      if (!parent) return [];
      return [{
        id: `${parent.id}->${node.id}`,
        from: parent,
        to: node,
        reason: node.connectionReason || "이전 Moment에서 이어진 관계",
      }];
    });
  }, [nodeById, nodes]);

  const selected = selectedMomentId ? nodeById.get(selectedMomentId) ?? null : null;
  const selectedIncoming = selected?.parentId
    ? edges.find((edge) => edge.to.id === selected.id) ?? null
    : null;
  const outgoing = selected ? edges.filter((edge) => edge.from.id === selected.id) : [];
  const worldHeight = Math.max(720, 210 + nodes.length * 118);

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

      <section className={styles.shell} aria-labelledby="relationships-title">
        <header className={styles.hero}>
          <small>기억의 연결</small>
          <h1 id="relationships-title">처음의 마음에서, 어떤 길들이 자라났는지 봅니다.</h1>
          <p>
            한 순간에서 다음 순간으로 이어진 이유를 따라가 보세요. 각 Moment를 선택하면 이전 기억과 다음 기억이
            어떻게 이어지는지 한눈에 살펴볼 수 있습니다.
          </p>
        </header>
        <div className={styles.truth} aria-label="관계 보기 안내">
          <span>이전 순간</span>
          <span>이어진 이유</span>
          <span>다음 순간</span>
          <span>선택한 Moment 중심으로 보기</span>
        </div>

        {loading ? <div className={styles.state} aria-busy="true">관계망을 불러오는 중…</div> : null}
        {!loading && error ? <div className={styles.state} role="alert">{error}</div> : null}
        {!loading && !error && nodes.length === 0 ? (
          <div className={styles.empty}>아직 연결해 볼 Moment가 없습니다.</div>
        ) : null}

        {!loading && !error && nodes.length > 0 ? (
          <div className={styles.viewport}>
            <div className={styles.world} style={{ height: worldHeight }} data-testid="source56-canonical-network">
              <svg className={styles.edges} viewBox={`0 0 1000 ${worldHeight}`} preserveAspectRatio="none" aria-hidden="true">
                {edges.map((edge) => {
                  const active = Boolean(selected && (edge.from.id === selected.id || edge.to.id === selected.id));
                  return <path key={edge.id} d={edgePath(edge)} className={`${styles.edge}${active ? ` ${styles.edgeActive}` : ""}`} />;
                })}
              </svg>

              {nodes.map((node, index) => {
                const isSelected = node.id === selectedMomentId;
                const muted = Boolean(selected && !isSelected && node.parentId !== selected.id && selected.parentId !== node.id);
                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`${styles.node}${isSelected ? ` ${styles.nodeSelected}` : ""}${muted ? ` ${styles.nodeMuted}` : ""}`}
                    style={{ left: `${node.x / 10}%`, top: node.y, "--tone": node.tone } as CSSProperties}
                    aria-pressed={isSelected}
                    aria-label={`${node.title} 선택`}
                    data-network-moment-id={node.id}
                    onClick={() => syncMomentToUrl(node.id)}
                  >
                    <span className={styles.nodeMeta}><span>단계 {node.depth}</span><span>{String(index + 1).padStart(2, "0")}</span></span>
                    <strong>{node.title}</strong>
                    {node.connectionReason ? <span className={styles.nodeReason}>이어진 이유 · {node.connectionReason}</span> : null}
                  </button>
                );
              })}

              {selected ? (
                <aside className={styles.inspector} aria-label="선택한 Moment 관계 상세">
                  <button className={styles.inspectorClose} type="button" onClick={() => syncMomentToUrl(null)} aria-label="관계 상세 닫기">×</button>
                  <small>선택한 순간</small>
                  <h2>{selected.title}</h2>
                  <div className={styles.inspectorMeta}>{selected.sourceType.toUpperCase()} · {selected.emotion}</div>
                  <article>
                    <strong>내 메모</strong>
                    <p>{selected.memo}</p>
                  </article>
                  <article>
                    <strong>이어진 이유</strong>
                    <p>{selectedIncoming?.reason ?? "이 Moment는 현재 Tree의 시작 지점입니다."}</p>
                  </article>
                  <article>
                    <strong>다음으로 이어진 순간</strong>
                    <p>{outgoing.length > 0 ? outgoing.map((edge) => edge.reason).join(" · ") : "현재 이어진 다음 Moment가 없습니다."}</p>
                  </article>
                </aside>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
