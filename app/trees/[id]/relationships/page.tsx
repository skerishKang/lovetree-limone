"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
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
  familyId: string | null;
  hierarchy: "origin" | "entry" | "primary" | "secondary";
  x: number;
  y: number;
  tone: string;
};

type NetworkEdge = {
  id: string;
  from: NetworkNode;
  to: NetworkNode;
  familyId: string | null;
};

type Family = {
  id: string;
  label: string;
  tone: string;
  entryId: string;
  memberIds: string[];
};

const TONES = ["#e45d8d", "#806ce4", "#26a2c4", "#d4942d", "#3aa37a", "#5279ca"];
const FAMILY_CENTERS = [
  { x: 1010, y: 1030 },
  { x: 700, y: 1800 },
  { x: 1035, y: 2580 },
  { x: 700, y: 3360 },
  { x: 990, y: 4140 },
  { x: 690, y: 4880 },
];

function snap(value: number) {
  return Number(value.toFixed(2));
}

function edgePath(edge: NetworkEdge) {
  const dx = edge.to.x - edge.from.x;
  const dy = edge.to.y - edge.from.y;
  const bend = Math.max(48, Math.min(180, Math.hypot(dx, dy) * .27));
  const side = dx >= 0 ? 1 : -1;
  return `M ${edge.from.x} ${edge.from.y} C ${snap(edge.from.x + bend * side)} ${snap(edge.from.y + dy * .2)}, ${snap(edge.to.x - bend * side)} ${snap(edge.to.y - dy * .2)}, ${edge.to.x} ${edge.to.y}`;
}

export default function TreeRelationshipsPage() {
  const params = useParams<{ id: string | string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const momentId = searchParams.get("moment");
  const { treeMoments, loading, error, isOwner, selectedMomentId, selectMoment } = useTreeMoments(treeId, undefined, momentId ?? undefined);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const rawById = useMemo(() => new Map(treeMoments.map((moment) => [moment.id, moment])), [treeMoments]);
  const root = useMemo(() => treeMoments.find((moment) => moment.isRoot || !moment.parentId) ?? treeMoments[0] ?? null, [treeMoments]);

  const familyIdFor = useCallback((momentIdValue: string): string | null => {
    if (!root || momentIdValue === root.id) return null;
    let current = rawById.get(momentIdValue);
    const seen = new Set<string>();
    while (current?.parentId && current.parentId !== root.id && !seen.has(current.id)) {
      seen.add(current.id);
      current = rawById.get(current.parentId);
    }
    return current?.parentId === root.id ? current.id : current?.id ?? null;
  }, [rawById, root]);

  const families = useMemo<Family[]>(() => {
    if (!root) return [];
    const entryIds = treeMoments.filter((moment) => moment.parentId === root.id).map((moment) => moment.id);
    const extras = treeMoments
      .filter((moment) => moment.id !== root.id)
      .map((moment) => familyIdFor(moment.id))
      .filter((id): id is string => Boolean(id) && !entryIds.includes(id!));
    const ids = [...entryIds, ...extras.filter((id, index) => extras.indexOf(id) === index)].slice(0, FAMILY_CENTERS.length);
    return ids.map((id, index) => {
      const entry = rawById.get(id);
      const memberIds = treeMoments.filter((moment) => familyIdFor(moment.id) === id).map((moment) => moment.id);
      return {
        id,
        label: `${String(index + 1).padStart(2, "0")} ${entry?.title || "기억의 길"}`,
        tone: TONES[index % TONES.length],
        entryId: id,
        memberIds,
      };
    });
  }, [familyIdFor, rawById, root, treeMoments]);

  const familyIndexById = useMemo(() => new Map(families.map((family, index) => [family.id, index])), [families]);

  const nodes = useMemo<NetworkNode[]>(() => {
    if (!root) return [];
    const results: NetworkNode[] = [{
      id: root.id,
      parentId: root.parentId,
      connectionReason: root.connectionReason,
      title: root.title || "First Moment",
      memo: root.memo || "이 러브트리가 시작된 기억입니다.",
      sourceType: root.sourceType || "moment",
      emotion: root.emotionTags[0] ?? "기억",
      depth: 0,
      familyId: null,
      hierarchy: "origin",
      x: 740,
      y: 560,
      tone: TONES[0],
    }];

    for (const moment of treeMoments) {
      if (moment.id === root.id) continue;
      const familyId = familyIdFor(moment.id);
      const familyIndex = familyId ? (familyIndexById.get(familyId) ?? 0) : 0;
      const center = FAMILY_CENTERS[familyIndex] ?? FAMILY_CENTERS[0];
      const family = families[familyIndex];
      const members = family?.memberIds ?? [];
      const localIndex = Math.max(0, members.indexOf(moment.id));
      const localDepth = Math.max(0, moment.depth - 1);
      const entry = moment.id === familyId;
      const angle = -2.65 + ((localIndex * 1.47 + localDepth * .52) % 2.95);
      const radius = entry ? 0 : 115 + localDepth * 105 + (localIndex % 3) * 52;
      const x = entry ? center.x : center.x + Math.cos(angle) * radius;
      const y = entry ? center.y : center.y + Math.sin(angle) * radius * .74 + localIndex * 16;
      results.push({
        id: moment.id,
        parentId: moment.parentId,
        connectionReason: moment.connectionReason,
        title: moment.title || "제목 없는 Moment",
        memo: moment.memo || "메모가 없습니다.",
        sourceType: moment.sourceType || "moment",
        emotion: moment.emotionTags[0] ?? "기억",
        depth: moment.depth,
        familyId,
        hierarchy: entry ? "entry" : localDepth <= 1 ? "primary" : "secondary",
        x: snap(x),
        y: snap(y),
        tone: TONES[familyIndex % TONES.length],
      });
    }
    return results;
  }, [families, familyIdFor, familyIndexById, root, treeMoments]);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const edges = useMemo<NetworkEdge[]>(() => nodes.flatMap((node) => {
    if (!node.parentId) return [];
    const parent = nodeById.get(node.parentId);
    if (!parent) return [];
    return [{ id: `${parent.id}->${node.id}`, from: parent, to: node, familyId: node.familyId ?? parent.familyId }];
  }), [nodeById, nodes]);

  const selected = selectedMomentId ? nodeById.get(selectedMomentId) ?? null : null;
  const selectedIncoming = selected?.parentId ? edges.find((edge) => edge.to.id === selected.id) ?? null : null;
  const outgoing = selected ? edges.filter((edge) => edge.from.id === selected.id) : [];
  const usedFamilyCount = Math.max(1, families.length);
  const worldHeight = Math.max(2300, 1020 + usedFamilyCount * 780);
  const cameraHeight = Math.min(worldHeight, Math.max(2200, 1150 + usedFamilyCount * 560));

  const syncMomentToUrl = useCallback((nextMomentId: string | null) => {
    selectMoment(nextMomentId);
    const next = new URLSearchParams(searchParams.toString());
    if (nextMomentId) next.set("moment", nextMomentId);
    else next.delete("moment");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, selectMoment]);

  const onNodeKeyDown = (event: KeyboardEvent<SVGGElement>, node: NetworkNode) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      syncMomentToUrl(node.id);
    }
  };

  return (
    <div className="tree-page" data-mvp-source="56" data-tree-id={treeId}>
      <header className="tree-page-topbar">
        <Link className="tree-page-brand" href="/v4" aria-label="LoveTree 처음 화면으로">LoveTree</Link>
        <nav className="tree-page-nav" aria-label="러브트리 메뉴"><Link href="/my-trees">내 러브트리</Link><Link href="/v4/community">둘러보기</Link></nav>
      </header>
      <div className="tree-view-switcher-bar"><ViewSwitcher treeId={treeId} active="relationships" momentId={selectedMomentId} isOwner={isOwner} /></div>

      <section className={styles.stage} aria-labelledby="relationships-title">
        <header className={styles.hero}>
          <small>VERTICAL MOMENT NETWORK · 관계 지도</small>
          <h1 id="relationships-title">처음의 마음에서,<br />어떤 길들이 자라났는지 봅니다.</h1>
          <p>First Moment에서 시작된 주요 기억의 길과 그 안에서 다시 갈라지는 작은 연결들을 한 화면에서 따라가 보세요.</p>
        </header>

        <aside className={styles.legend} aria-label="주요 경로 그룹">
          <strong>주요 경로 그룹</strong>
          <button type="button" className={!activeFamilyId ? styles.legendActive : ""} onClick={() => setActiveFamilyId(null)}>First Moment · 전체조망</button>
          {families.map((family, index) => (
            <button key={family.id} type="button" className={activeFamilyId === family.id ? styles.legendActive : ""} style={{ "--tone": family.tone } as CSSProperties} onClick={() => setActiveFamilyId((current) => current === family.id ? null : family.id)}>
              <i /><span>{family.label}</span><small>{family.memberIds.length} MOMENTS</small>
            </button>
          ))}
        </aside>

        <div className={styles.topActions}>
          <span>{activeFamilyId ? "PATH FAMILY FOCUS" : "OVERVIEW"}</span>
          <button type="button" onClick={() => setActiveFamilyId(null)}>전체조망</button>
          <button type="button" aria-expanded={listOpen} onClick={() => setListOpen((open) => !open)}>Moment 목록</button>
        </div>

        {loading ? <div className={styles.state} aria-busy="true">관계망을 불러오는 중…</div> : null}
        {!loading && error ? <div className={styles.state} role="alert">{error}</div> : null}
        {!loading && !error && nodes.length === 0 ? <div className={styles.state}>아직 연결해 볼 Moment가 없습니다.</div> : null}

        {!loading && !error && nodes.length > 0 ? (
          <svg className={styles.world} viewBox={`0 0 1700 ${cameraHeight}`} preserveAspectRatio="xMidYMid meet" aria-label="Moment 관계 공간망">
            <g aria-hidden="true">
              {edges.map((edge) => {
                const active = Boolean(selected && (edge.from.id === selected.id || edge.to.id === selected.id));
                const muted = Boolean(activeFamilyId && edge.familyId !== activeFamilyId);
                return <path key={edge.id} d={edgePath(edge)} className={`${styles.edge}${active ? ` ${styles.edgeActive}` : ""}${muted ? ` ${styles.muted}` : ""}`} style={{ "--tone": edge.to.tone } as CSSProperties} />;
              })}
            </g>

            {families.map((family, index) => {
              const center = FAMILY_CENTERS[index] ?? FAMILY_CENTERS[0];
              const muted = Boolean(activeFamilyId && activeFamilyId !== family.id);
              return (
                <g key={`hub-${family.id}`} className={`${styles.hub}${muted ? ` ${styles.muted}` : ""}`} style={{ "--tone": family.tone } as CSSProperties} aria-hidden="true">
                  <circle className={styles.hubHalo} cx={center.x} cy={center.y} r="58" />
                  <circle className={styles.hubCore} cx={center.x} cy={center.y} r="25" />
                  <text x={center.x} y={center.y - 48} textAnchor="middle">{family.label}</text>
                </g>
              );
            })}

            <g>
              {nodes.map((node) => {
                const isSelected = node.id === selectedMomentId;
                const muted = Boolean(activeFamilyId && node.familyId && node.familyId !== activeFamilyId);
                const ring = node.hierarchy === "origin" ? 22 : node.hierarchy === "entry" ? 17 : node.hierarchy === "primary" ? 10 : 7;
                return (
                  <g key={node.id} role="button" tabIndex={isSelected || (!selectedMomentId && node.hierarchy === "origin") ? 0 : -1} aria-label={node.title} aria-pressed={isSelected} data-network-moment-id={node.id} data-hierarchy={node.hierarchy} className={`${styles.node}${isSelected ? ` ${styles.nodeSelected}` : ""}${muted ? ` ${styles.muted}` : ""}`} style={{ "--tone": node.tone } as CSSProperties} onClick={() => syncMomentToUrl(node.id)} onKeyDown={(event) => onNodeKeyDown(event, node)}>
                    <circle className={styles.hit} cx={node.x} cy={node.y} r={node.hierarchy === "origin" ? 34 : 25} />
                    <circle className={styles.ring} cx={node.x} cy={node.y} r={ring} />
                    <circle className={styles.core} cx={node.x} cy={node.y} r={node.hierarchy === "origin" ? 10 : node.hierarchy === "entry" ? 7 : node.hierarchy === "primary" ? 5 : 3.5} />
                    {node.hierarchy === "origin" ? <text className={styles.nodeLabel} x={node.x} y={node.y + 48} textAnchor="middle">FIRST MOMENT</text> : null}
                  </g>
                );
              })}
            </g>
          </svg>
        ) : null}

        <p className={styles.status}>{activeFamilyId ? "선택한 주요 경로만 밝게 표시하고 있습니다." : "OVERVIEW · First Moment에서 시작된 모든 주요 경로를 펼쳐 봅니다."}</p>

        {selected ? (
          <aside className={styles.inspector} aria-label="선택한 Moment 관계 상세">
            <button className={styles.inspectorClose} type="button" onClick={() => syncMomentToUrl(null)} aria-label="관계 상세 닫기">×</button>
            <small>{selected.hierarchy === "origin" ? "FIRST MOMENT" : "SELECTED MOMENT"}</small>
            <h2>{selected.title}</h2>
            <div className={styles.inspectorMeta}>{selected.sourceType.toUpperCase()} · {selected.emotion}</div>
            <article><strong>내 메모</strong><p>{selected.memo}</p></article>
            <article><strong>이어진 이유</strong><p>{selectedIncoming?.to.connectionReason || "이 Moment에서 기억의 길이 시작됩니다."}</p></article>
            <article><strong>다음으로 이어진 순간</strong><p>{outgoing.length ? outgoing.map((edge) => edge.to.title).join(" · ") : "현재 이어진 다음 Moment가 없습니다."}</p></article>
          </aside>
        ) : null}

        {listOpen ? (
          <div className={styles.list} role="listbox" aria-label="Moment 목록">
            {nodes.map((node, index) => <button key={node.id} type="button" role="option" aria-selected={node.id === selectedMomentId} onClick={() => { syncMomentToUrl(node.id); setListOpen(false); }}><span>{String(index + 1).padStart(2, "0")}</span><strong>{node.title}</strong><small>{node.emotion}</small></button>)}
          </div>
        ) : null}
      </section>
    </div>
  );
}
