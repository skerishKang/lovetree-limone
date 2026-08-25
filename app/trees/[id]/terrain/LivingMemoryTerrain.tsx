"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  formatTreeDate,
  memoryDiscoveryDate,
  sourceTypeLabel,
  type MemoryRecord,
  type TreeRecord,
} from "@/lib/tree-types";
import { projectCanonicalLivingTerrain } from "@/lib/source-track-17/living-memory-terrain";
import styles from "./living-memory-terrain.module.css";

interface LivingMemoryTerrainProps {
  tree: TreeRecord;
  moments: MemoryRecord[];
  selectedMomentId: string | null;
  onSelectMoment: (id: string | null) => void;
}

const TERRAIN_CONTOURS = [
  "M 45 380 C 150 295 255 315 350 252 C 455 183 570 255 680 205 C 790 155 874 192 955 116",
  "M 18 440 C 132 340 252 382 368 302 C 492 218 605 313 724 245 C 817 192 902 214 985 148",
  "M 5 505 C 145 408 262 451 394 362 C 516 281 640 371 756 307 C 844 258 918 271 995 218",
  "M 0 570 C 160 488 286 517 425 438 C 553 365 665 449 790 388 C 868 350 936 349 1000 310",
] as const;

export default function LivingMemoryTerrain({
  tree,
  moments,
  selectedMomentId,
  onSelectMoment,
}: LivingMemoryTerrainProps) {
  const terrain = useMemo(() => projectCanonicalLivingTerrain(moments), [moments]);
  const byId = useMemo(() => new Map(terrain.nodes.map((node) => [node.id, node])), [terrain.nodes]);
  const selectedNode = selectedMomentId ? byId.get(selectedMomentId) ?? null : null;
  const selected = selectedNode?.memory ?? null;
  const selectedParent = selected?.parentId ? moments.find((moment) => moment.id === selected.parentId) ?? null : null;
  const connectedCount = terrain.edges.length;

  return (
    <section className={styles.surface} aria-labelledby="living-terrain-title" data-testid="living-memory-terrain">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>LIVING MEMORY TERRAIN · CANONICAL TREE LENS</p>
          <h1 id="living-terrain-title">{tree.title}</h1>
          <p className={styles.intro}>
            저장된 Moment와 WHY NEXT 연결만 지형으로 투영합니다. 감정 점수·재방문 횟수·Season 상태를 새로 추론하지 않습니다.
          </p>
        </div>
        <div className={styles.metrics} aria-label="현재 러브트리 데이터 요약">
          <span><strong>{moments.length}</strong> Moments</span>
          <span><strong>{connectedCount}</strong> Connections</span>
          <span><strong>{terrain.maxDepth}</strong> Max depth</span>
        </div>
      </header>

      {moments.length === 0 ? (
        <div className={styles.empty} data-testid="terrain-empty-state">
          <strong>아직 지형으로 펼칠 순간이 없습니다.</strong>
          <p>첫 Moment를 저장하면 이 화면은 같은 canonical Tree 데이터를 그대로 읽습니다.</p>
          <Link href={`/trees/${encodeURIComponent(tree.id)}`}>Tree로 돌아가기</Link>
        </div>
      ) : (
        <div className={styles.workspace}>
          <div className={styles.stage} data-testid="terrain-stage">
            <svg className={styles.svg} viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="track17-terrain-fill" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="rgba(239,116,154,.22)" />
                  <stop offset=".48" stopColor="rgba(61,184,181,.12)" />
                  <stop offset="1" stopColor="rgba(153,111,214,.22)" />
                </linearGradient>
                <filter id="track17-soft-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <path className={styles.terrainFill} d="M0 620 L0 505 C145 408 262 451 394 362 C516 281 640 371 756 307 C844 258 918 271 1000 218 L1000 620 Z" />
              {TERRAIN_CONTOURS.map((path) => <path className={styles.contour} d={path} key={path} />)}
              {terrain.edges.map((edge) => {
                const from = byId.get(edge.fromId);
                const to = byId.get(edge.toId);
                if (!from || !to) return null;
                const x1 = from.x * 10;
                const y1 = from.y * 6.2;
                const x2 = to.x * 10;
                const y2 = to.y * 6.2;
                const bend = Math.max(28, Math.abs(x2 - x1) * 0.32);
                return (
                  <path
                    className={styles.connection}
                    data-from={edge.fromId}
                    data-to={edge.toId}
                    d={`M ${x1} ${y1} C ${x1 + bend} ${y1 - 28}, ${x2 - bend} ${y2 + 28}, ${x2} ${y2}`}
                    key={`${edge.fromId}-${edge.toId}`}
                  />
                );
              })}
            </svg>

            <div className={styles.nodes} aria-label={`${moments.length}개의 저장된 순간`}>
              {terrain.nodes.map((node) => {
                const active = node.id === selectedMomentId;
                return (
                  <button
                    className={`${styles.node}${active ? ` ${styles.nodeActive}` : ""}`}
                    data-testid="terrain-moment-node"
                    data-moment-id={node.id}
                    key={node.id}
                    type="button"
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    aria-pressed={active}
                    aria-label={`${node.memory.title?.trim() || `순간 ${node.index + 1}`} 선택`}
                    onClick={() => onSelectMoment(active ? null : node.id)}
                  >
                    <i aria-hidden="true" />
                    <span>{String(node.index + 1).padStart(2, "0")}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.stageLegend} aria-hidden="true">
              <span>EARLIER</span><i /><span>LATER</span>
            </div>
          </div>

          <aside className={styles.inspector} aria-live="polite" data-testid="terrain-inspector">
            {selected ? (
              <>
                <div className={styles.inspectorTop}>
                  <span>{sourceTypeLabel(selected.sourceType)}</span>
                  <time>{formatTreeDate(memoryDiscoveryDate(selected))}</time>
                </div>
                <h2>{selected.title?.trim() || "이름 없는 순간"}</h2>
                <p>{selected.memo?.trim() || "이 순간에는 아직 메모가 없습니다."}</p>
                {selected.emotionTags?.length ? (
                  <div className={styles.tags}>{selected.emotionTags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
                ) : null}
                <div className={styles.connectionTruth}>
                  <small>WHY NEXT · STORED CONNECTION</small>
                  {selected.parentId ? (
                    <>
                      <strong>{selectedParent?.title?.trim() || "연결된 이전 순간"}</strong>
                      <p>{selected.connectionReason?.trim() || "저장된 연결 이유가 없습니다."}</p>
                    </>
                  ) : <p>이 Moment에는 저장된 parent 연결이 없습니다.</p>}
                </div>
                <Link className={styles.detailLink} href={`/trees/${encodeURIComponent(tree.id)}?moment=${encodeURIComponent(selected.id)}`}>
                  canonical Moment 상세 열기
                </Link>
                <button className={styles.clearButton} type="button" onClick={() => onSelectMoment(null)}>선택 해제</button>
              </>
            ) : (
              <>
                <small className={styles.inspectorKicker}>TERRAIN LENS</small>
                <h2>Moment를 선택해 주세요.</h2>
                <p>점 하나가 저장된 Moment 하나입니다. 선은 실제 parentId 관계가 있을 때만 표시됩니다.</p>
                <div className={styles.truthList}>
                  <span>sample Moment 사용 안 함</span>
                  <span>return count 추론 안 함</span>
                  <span>Season 상태 생성 안 함</span>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {terrain.orphanConnectionCount > 0 ? (
        <p className={styles.warning} role="status">
          현재 응답에서 부모 Moment가 함께 로드되지 않은 연결 {terrain.orphanConnectionCount}개는 지형 선으로 만들지 않았습니다.
        </p>
      ) : null}
    </section>
  );
}
