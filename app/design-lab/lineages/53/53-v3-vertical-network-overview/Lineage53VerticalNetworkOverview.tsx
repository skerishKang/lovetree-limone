"use client";

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useReducer, useState } from "react";
import {
  SOURCE56_CONNECTIONS,
  SOURCE56_MOMENTS,
  deriveSource56PathFamilies,
  incomingSource56Connection,
  type Source56Moment,
  type Source56PathFamily,
  type Source56SecondaryPath,
} from "@/lib/lineage-53-source56";
import {
  canAutoAdvance,
  createTransportAuthorityState,
  reduceTransportAuthority,
} from "@/lib/design-runtime/transport";
import {
  normalizeSelectionIndex,
  selectedItem,
  stepSelectionIndex,
} from "@/lib/design-runtime/selection";

const FIRST_INDEX = SOURCE56_MOMENTS.findIndex((moment) => moment.first);
const WORLD = { width: 1700, height: 4800 } as const;
const CLUSTER_LAYOUT = [
  { x: 660, y: 610, spread: 520, angles: [-2.15, -1.3, -0.42] },
  { x: 990, y: 1305, spread: 550, angles: [-2.72, -1.88, -0.98, -0.18] },
  { x: 705, y: 2060, spread: 600, angles: [-2.35, -1.62, -0.78, 0.1] },
  { x: 1010, y: 2800, spread: 585, angles: [-2.64, -1.5, -0.46] },
  { x: 690, y: 3540, spread: 535, angles: [-2.18, -1.16, -0.15] },
  { x: 950, y: 4290, spread: 640, angles: [-2.72, -1.94, -1.1, -0.2] },
] as const;

type Hierarchy = "origin" | "entry" | "primary" | "secondary";
type Point = { x: number; y: number };
type LayoutNode = Point & {
  moment: Source56Moment;
  familyIndex: number | null;
  pathIndex: number | null;
  hierarchy: Hierarchy;
  pathLabel?: string;
};
type LayoutEdge = {
  id: string;
  from: Point;
  to: Point;
  familyIndex: number | null;
  hierarchy: "origin" | "entry" | "primary" | "secondary";
};
type Playback = {
  familyIndex: number;
  pathIndex: number;
  kind: "primary" | "secondary";
  ids: readonly string[];
  cursor: number;
};
type BranchChoice = {
  familyIndex: number;
  pathIndex: number;
  parentMomentId: string;
  branch: Source56SecondaryPath;
};

function momentIndex(id: string) {
  return SOURCE56_MOMENTS.findIndex((moment) => moment.id === id);
}

function pointOnPrimary(
  center: (typeof CLUSTER_LAYOUT)[number],
  angle: number,
  step: number,
  pathIndex: number,
): Point {
  const t = (step + 1) / 4;
  const radius = center.spread * (0.18 + 0.68 * t);
  const bend = Math.sin(t * Math.PI) * (pathIndex % 2 === 0 ? -0.1 : 0.1);
  const a = angle + bend;
  return {
    x: center.x + Math.cos(a) * radius + Math.sin(step * 1.7 + pathIndex) * 12,
    y: center.y + Math.sin(a) * radius * 0.8 + Math.cos(step * 1.3 + pathIndex) * 10,
  };
}

function makeLayout(families: readonly Source56PathFamily[]) {
  const nodes = new Map<string, LayoutNode>();
  const first = SOURCE56_MOMENTS[FIRST_INDEX];
  nodes.set(first.id, {
    moment: first,
    familyIndex: null,
    pathIndex: null,
    hierarchy: "origin",
    x: CLUSTER_LAYOUT[0].x - 42,
    y: CLUSTER_LAYOUT[0].y + 18,
  });

  families.forEach((family, familyIndex) => {
    const center = CLUSTER_LAYOUT[familyIndex];
    const entry = SOURCE56_MOMENTS[momentIndex(family.seedMomentId)];
    nodes.set(entry.id, {
      moment: entry,
      familyIndex,
      pathIndex: null,
      hierarchy: "entry",
      x: center.x,
      y: center.y,
    });

    family.primaryPaths.forEach((path, pathIndex) => {
      const angle = center.angles[pathIndex] ?? center.angles[center.angles.length - 1];
      path.momentIds.forEach((id, step) => {
        const moment = SOURCE56_MOMENTS[momentIndex(id)];
        const point = pointOnPrimary(center, angle, step, pathIndex);
        nodes.set(id, {
          moment,
          familyIndex,
          pathIndex,
          hierarchy: "primary",
          pathLabel: step === 0 ? path.label.slice(5) : undefined,
          ...point,
        });
      });

      path.secondaryBranches.forEach((branch, branchIndex) => {
        const parent = nodes.get(branch.parentMomentId);
        if (!parent) return;
        const branchAngle = angle + (pathIndex % 2 === 0 ? 0.58 : -0.62) + branchIndex * 0.18;
        branch.momentIds.forEach((id, step) => {
          const moment = SOURCE56_MOMENTS[momentIndex(id)];
          const distance = 92 + step * 78;
          nodes.set(id, {
            moment,
            familyIndex,
            pathIndex,
            hierarchy: "secondary",
            x: parent.x + Math.cos(branchAngle) * distance,
            y: parent.y + Math.sin(branchAngle) * distance * 0.78,
          });
        });
      });
    });
  });

  const familyByMoment = new Map<string, number>();
  const hierarchyByMoment = new Map<string, Hierarchy>();
  families.forEach((family, familyIndex) => family.momentIds.forEach((id) => familyByMoment.set(id, familyIndex)));
  nodes.forEach((node, id) => hierarchyByMoment.set(id, node.hierarchy));

  const edges: LayoutEdge[] = SOURCE56_CONNECTIONS.flatMap((connection) => {
    const from = nodes.get(connection.fromMomentId);
    const to = nodes.get(connection.toMomentId);
    if (!from || !to) return [];
    const familyIndex = familyByMoment.get(connection.toMomentId) ?? familyByMoment.get(connection.fromMomentId) ?? null;
    const hierarchy: LayoutEdge["hierarchy"] = connection.fromMomentId === first.id
      ? "origin"
      : hierarchyByMoment.get(connection.toMomentId) === "secondary"
        ? "secondary"
        : hierarchyByMoment.get(connection.toMomentId) === "entry"
          ? "entry"
          : "primary";
    return [{ id: connection.id, from, to, familyIndex, hierarchy }];
  });
  return { nodes: [...nodes.values()], edges };
}

function edgePath(edge: LayoutEdge) {
  const dx = edge.to.x - edge.from.x;
  const dy = edge.to.y - edge.from.y;
  const bend = Math.max(42, Math.min(180, Math.hypot(dx, dy) * 0.28));
  const side = dx >= 0 ? 1 : -1;
  return `M ${edge.from.x} ${edge.from.y} C ${edge.from.x + bend * side} ${edge.from.y + dy * 0.22}, ${edge.to.x - bend * side} ${edge.to.y - dy * 0.22}, ${edge.to.x} ${edge.to.y}`;
}

function nodeFamilyIndex(families: readonly Source56PathFamily[], momentId: string) {
  return families.findIndex((family) => family.momentIds.includes(momentId));
}

export default function Lineage53VerticalNetworkOverview() {
  const families = useMemo(() => deriveSource56PathFamilies(), []);
  const layout = useMemo(() => makeLayout(families), [families]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeFamilyIndex, setActiveFamilyIndex] = useState<number | null>(null);
  const [originReveal, setOriginReveal] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compact, setCompact] = useState(false);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [branchChoice, setBranchChoice] = useState<BranchChoice | null>(null);
  const [skipBranchParent, setSkipBranchParent] = useState<string | null>(null);
  const [transport, dispatchTransport] = useReducer(
    reduceTransportAuthority,
    undefined,
    () => createTransportAuthorityState({ initialPlaying: false }),
  );

  const selected = selectedIndex === null ? undefined : selectedItem(SOURCE56_MOMENTS, selectedIndex, "clamp");
  const selectedFamilyIndex = selected ? nodeFamilyIndex(families, selected.id) : -1;
  const activeFamily = activeFamilyIndex === null ? null : families[activeFamilyIndex];
  const incoming = selected ? incomingSource56Connection(selected.id) : undefined;

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const width = window.matchMedia("(max-width: 640px)");
    const syncMotion = () => setReducedMotion(motion.matches);
    const syncWidth = () => setCompact(width.matches);
    syncMotion();
    syncWidth();
    motion.addEventListener("change", syncMotion);
    width.addEventListener("change", syncWidth);
    return () => {
      motion.removeEventListener("change", syncMotion);
      width.removeEventListener("change", syncWidth);
    };
  }, []);

  const camera = useMemo(() => {
    if (activeFamilyIndex !== null) {
      const cluster = CLUSTER_LAYOUT[activeFamilyIndex];
      if (compact) {
        const width = 1280;
        const height = 2000;
        return `${cluster.x - width / 2} ${cluster.y - height / 2} ${width} ${height}`;
      }
      const width = cluster.spread * 2.05;
      const height = cluster.spread * 1.55;
      return `${cluster.x - width / 2} ${cluster.y - height / 2} ${width} ${height}`;
    }
    if (originReveal) return compact ? "70 190 1560 3050" : "0 180 1700 2550";
    return compact ? "0 0 1700 3600" : "0 0 1700 2100";
  }, [activeFamilyIndex, compact, originReveal]);

  const selectIndex = (index: number, familyIndex: number | null) => {
    setSelectedIndex(normalizeSelectionIndex(index, SOURCE56_MOMENTS.length, "clamp"));
    if (familyIndex !== null) setActiveFamilyIndex(familyIndex);
    dispatchTransport({ type: "pause" });
  };

  const selectMoment = (id: string, familyIndex: number | null) => {
    const index = momentIndex(id);
    if (index < 0) return;
    if (id === SOURCE56_MOMENTS[FIRST_INDEX].id) {
      setSelectedIndex(FIRST_INDEX);
      setActiveFamilyIndex(null);
      setOriginReveal(true);
      setPlayback(null);
      setBranchChoice(null);
      dispatchTransport({ type: "pause" });
      return;
    }
    selectIndex(index, familyIndex);
  };

  const resetOverview = () => {
    setSelectedIndex(null);
    setActiveFamilyIndex(null);
    setOriginReveal(false);
    setPlayback(null);
    setBranchChoice(null);
    setSkipBranchParent(null);
    dispatchTransport({ type: "pause" });
  };

  const revealOrigin = () => selectMoment(SOURCE56_MOMENTS[FIRST_INDEX].id, null);

  const focusFamily = (familyIndex: number) => {
    setActiveFamilyIndex(familyIndex);
    setOriginReveal(false);
    setSelectedIndex(null);
    setPlayback(null);
    setBranchChoice(null);
    setSkipBranchParent(null);
    dispatchTransport({ type: "pause" });
  };

  const startPath = (familyIndex: number, pathIndex: number) => {
    const path = families[familyIndex]?.primaryPaths[pathIndex];
    if (!path || path.momentIds.length === 0) return;
    setActiveFamilyIndex(familyIndex);
    setOriginReveal(false);
    setPlayback({ familyIndex, pathIndex, kind: "primary", ids: path.momentIds, cursor: 0 });
    setBranchChoice(null);
    setSkipBranchParent(null);
    setSelectedIndex(momentIndex(path.momentIds[0]));
    dispatchTransport({ type: reducedMotion ? "pause" : "play" });
  };

  const stepPlaybackManually = () => {
    if (!playback) {
      const familyIndex = activeFamilyIndex ?? 0;
      startPath(familyIndex, 0);
      return;
    }
    const currentId = playback.ids[playback.cursor];
    if (playback.kind === "primary") {
      const branch = families[playback.familyIndex].primaryPaths[playback.pathIndex].secondaryBranches.find((item) => item.parentMomentId === currentId);
      if (branch && skipBranchParent !== currentId) {
        setBranchChoice({ familyIndex: playback.familyIndex, pathIndex: playback.pathIndex, parentMomentId: currentId, branch });
        dispatchTransport({ type: "pause" });
        return;
      }
    }
    if (playback.cursor >= playback.ids.length - 1) return;
    const nextCursor = playback.cursor + 1;
    setPlayback({ ...playback, cursor: nextCursor });
    setSelectedIndex(momentIndex(playback.ids[nextCursor]));
    setSkipBranchParent(null);
  };

  useEffect(() => {
    if (!playback || reducedMotion || branchChoice || !canAutoAdvance(transport)) return;
    const timer = window.setTimeout(() => {
      const currentId = playback.ids[playback.cursor];
      if (playback.kind === "primary") {
        const branch = families[playback.familyIndex].primaryPaths[playback.pathIndex].secondaryBranches.find((item) => item.parentMomentId === currentId);
        if (branch && skipBranchParent !== currentId) {
          setBranchChoice({ familyIndex: playback.familyIndex, pathIndex: playback.pathIndex, parentMomentId: currentId, branch });
          dispatchTransport({ type: "pause" });
          return;
        }
      }
      if (playback.cursor >= playback.ids.length - 1) {
        dispatchTransport({ type: "pause" });
        return;
      }
      const nextCursor = playback.cursor + 1;
      setPlayback({ ...playback, cursor: nextCursor });
      setSelectedIndex(momentIndex(playback.ids[nextCursor]));
      setSkipBranchParent(null);
    }, 820);
    return () => window.clearTimeout(timer);
  }, [branchChoice, families, playback, reducedMotion, skipBranchParent, transport]);

  const toggleReplay = () => {
    if (reducedMotion) {
      stepPlaybackManually();
      return;
    }
    if (!playback) {
      startPath(activeFamilyIndex ?? 0, 0);
      return;
    }
    dispatchTransport({ type: transport.playing ? "pause" : "play" });
  };

  const choosePrimary = () => {
    if (!branchChoice || !playback) return;
    const parent = branchChoice.parentMomentId;
    setSkipBranchParent(parent);
    setBranchChoice(null);
    if (reducedMotion) {
      if (playback.cursor < playback.ids.length - 1) {
        const nextCursor = playback.cursor + 1;
        setPlayback({ ...playback, cursor: nextCursor });
        setSelectedIndex(momentIndex(playback.ids[nextCursor]));
        setSkipBranchParent(null);
      }
      dispatchTransport({ type: "pause" });
    } else {
      dispatchTransport({ type: "play" });
    }
  };

  const chooseSecondary = () => {
    if (!branchChoice) return;
    const ids = branchChoice.branch.momentIds;
    if (ids.length === 0) return;
    setPlayback({
      familyIndex: branchChoice.familyIndex,
      pathIndex: branchChoice.pathIndex,
      kind: "secondary",
      ids,
      cursor: 0,
    });
    setSelectedIndex(momentIndex(ids[0]));
    setBranchChoice(null);
    setSkipBranchParent(null);
    dispatchTransport({ type: reducedMotion ? "pause" : "play" });
  };

  const onNodeKeyDown = (event: ReactKeyboardEvent<SVGGElement>, node: LayoutNode) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectMoment(node.moment.id, node.familyIndex);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = selectedIndex ?? FIRST_INDEX;
    let next = current;
    if (event.key === "ArrowDown") next = stepSelectionIndex(current, 1, SOURCE56_MOMENTS.length, "wrap");
    if (event.key === "ArrowUp") next = stepSelectionIndex(current, -1, SOURCE56_MOMENTS.length, "wrap");
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = SOURCE56_MOMENTS.length - 1;
    const moment = SOURCE56_MOMENTS[next];
    const familyIndex = nodeFamilyIndex(families, moment.id);
    setSelectedIndex(next);
    setActiveFamilyIndex(familyIndex >= 0 ? familyIndex : null);
    setOriginReveal(moment.first === true);
    dispatchTransport({ type: "pause" });
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-network-moment-id="${moment.id}"]`)?.focus());
  };

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = selectedIndex ?? FIRST_INDEX;
    let next = current;
    if (event.key === "ArrowDown") next = stepSelectionIndex(current, 1, SOURCE56_MOMENTS.length, "wrap");
    if (event.key === "ArrowUp") next = stepSelectionIndex(current, -1, SOURCE56_MOMENTS.length, "wrap");
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = SOURCE56_MOMENTS.length - 1;
    const moment = SOURCE56_MOMENTS[next];
    const familyIndex = nodeFamilyIndex(families, moment.id);
    setSelectedIndex(next);
    setActiveFamilyIndex(familyIndex >= 0 ? familyIndex : null);
    setOriginReveal(moment.first === true);
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-list-moment-id="${moment.id}"]`)?.focus());
  };

  const mode = originReveal ? "FIRST · 01/02/03 REVEAL" : activeFamily ? "PATH FAMILY FOCUS" : "OVERVIEW";

  return (
    <section className="s56" data-reduced-motion={reducedMotion ? "true" : "false"} data-network-mode={mode}>
      <style>{STYLE}</style>
      <div className="s56-stage" aria-label="Source56 vertical Moment network overview">
        <div className="s56-topbar">
          <div className="s56-brand"><i /><b>LOVETREE</b><span>MY TREE · OTHER VIEWS · 관계 지도</span></div>
          <div className="s56-top-actions"><span>{mode}</span><button type="button" onClick={resetOverview}>전체조망</button><button type="button" onClick={() => setListOpen((open) => !open)} aria-expanded={listOpen}>Moment 목록</button></div>
        </div>

        <div className={`s56-hero${activeFamilyIndex !== null ? " dim" : ""}`}>
          <small>VERTICAL MOMENT NETWORK · V1.2 PATH HIERARCHY & ROUTE REVEAL</small>
          <h1>처음의 마음에서,<br />어떤 길들이 자라났는지 봅니다.</h1>
          <p>First Moment를 선택하면 01·02·03의 주요 경로가 함께 펼쳐집니다. 각 그룹에는 여러 주경로와 그 안에서 갈라지는 보조 경로가 있습니다.</p>
        </div>

        <div className="s56-legend" aria-label="Route family navigation">
          <strong>주요 경로 그룹</strong>
          <button type="button" className={originReveal ? "origin active" : "origin"} onClick={revealOrigin}>First Moment · 01/02/03</button>
          {families.map((family, familyIndex) => (
            <button
              key={family.id}
              type="button"
              aria-pressed={activeFamilyIndex === familyIndex}
              className={activeFamilyIndex === familyIndex ? "active" : ""}
              style={{ "--c": family.color } as CSSProperties}
              onClick={() => focusFamily(familyIndex)}
            ><i /><span>{family.label}</span><small>{family.primaryPaths.length} PRIMARY</small></button>
          ))}
        </div>

        <svg className="s56-world" viewBox={camera} preserveAspectRatio="xMidYMid meet" aria-label="Moment and Connection spatial network">
          <defs>
            {families.map((family) => <filter key={family.id} id={`s56-glow-${family.id}`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="10" /></filter>)}
          </defs>
          <g className="s56-edge-layer" aria-hidden="true">
            {layout.edges.map((edge) => {
              const family = edge.familyIndex === null ? null : families[edge.familyIndex];
              const familyFocused = activeFamilyIndex !== null && edge.familyIndex === activeFamilyIndex;
              const contextMuted = activeFamilyIndex !== null && edge.familyIndex !== activeFamilyIndex;
              const revealFamily = originReveal && edge.familyIndex !== null && edge.familyIndex < 3;
              const revealMajor = revealFamily && (edge.hierarchy === "origin" || edge.hierarchy === "entry" || edge.hierarchy === "primary");
              return (
                <path
                  key={edge.id}
                  d={edgePath(edge)}
                  className={`s56-edge ${edge.hierarchy}${familyFocused ? " focused" : ""}${contextMuted ? " muted" : ""}${revealMajor ? " reveal" : ""}`}
                  style={{ "--c": family?.color ?? "#9b939f" } as CSSProperties}
                />
              );
            })}
          </g>

          {families.map((family, familyIndex) => {
            const center = CLUSTER_LAYOUT[familyIndex];
            const muted = activeFamilyIndex !== null && activeFamilyIndex !== familyIndex;
            const reveal = originReveal && familyIndex < 3;
            return (
              <g key={`halo-${family.id}`} className={`s56-hub${muted ? " muted" : ""}${reveal ? " reveal" : ""}`} aria-hidden="true">
                <circle cx={center.x} cy={center.y} r={26} style={{ "--c": family.color } as CSSProperties} />
                <circle className="halo" cx={center.x} cy={center.y} r={54} style={{ "--c": family.color } as CSSProperties} />
                <text x={center.x} y={center.y - 46} textAnchor="middle">{family.label}</text>
                <text className="sub" x={center.x} y={center.y - 29} textAnchor="middle">{family.subtitle}</text>
              </g>
            );
          })}

          <g className="s56-node-layer">
            {layout.nodes.map((node) => {
              const family = node.familyIndex === null ? null : families[node.familyIndex];
              const isSelected = selected?.id === node.moment.id;
              const familyMuted = activeFamilyIndex !== null && node.familyIndex !== null && node.familyIndex !== activeFamilyIndex;
              const originContextMuted = originReveal && node.familyIndex !== null && node.familyIndex >= 3;
              const reveal = originReveal && node.familyIndex !== null && node.familyIndex < 3;
              const canTab = isSelected || (selectedIndex === null && node.hierarchy === "origin");
              return (
                <g
                  key={node.moment.id}
                  role="button"
                  tabIndex={canTab ? 0 : -1}
                  data-network-moment-id={node.moment.id}
                  data-hierarchy={node.hierarchy}
                  aria-label={node.moment.title}
                  aria-pressed={isSelected}
                  className={`s56-node ${node.hierarchy}${isSelected ? " selected" : ""}${familyMuted || originContextMuted ? " muted" : ""}${reveal ? " reveal" : ""}`}
                  style={{ "--c": family?.color ?? "#e45d8d" } as CSSProperties}
                  onClick={() => selectMoment(node.moment.id, node.familyIndex)}
                  onKeyDown={(event) => onNodeKeyDown(event, node)}
                >
                  <circle className="hit" cx={node.x} cy={node.y} r={node.hierarchy === "origin" ? 34 : 25} />
                  <circle className="ring" cx={node.x} cy={node.y} r={node.hierarchy === "origin" ? 22 : node.hierarchy === "entry" ? 17 : node.hierarchy === "primary" ? 11 : 7} />
                  <circle className="core" cx={node.x} cy={node.y} r={node.hierarchy === "origin" ? 11 : node.hierarchy === "entry" ? 8 : node.hierarchy === "primary" ? 5.7 : 3.8} />
                  {node.hierarchy === "origin" ? <text x={node.x} y={node.y + 48} textAnchor="middle">FIRST MOMENT</text> : null}
                  {node.pathLabel ? <text className="path-label" x={node.x} y={node.y - 17} textAnchor="middle">{node.pathLabel}</text> : null}
                </g>
              );
            })}
          </g>
        </svg>

        {activeFamily ? (
          <div className="s56-path-nav" aria-label={`${activeFamily.label} primary paths`}>
            <span>{activeFamily.label}</span>
            {activeFamily.primaryPaths.map((path, pathIndex) => (
              <button
                key={path.id}
                type="button"
                className={playback?.familyIndex === activeFamilyIndex && playback.pathIndex === pathIndex ? "active" : ""}
                onClick={() => startPath(activeFamilyIndex!, pathIndex)}
              >주경로 {String.fromCharCode(65 + pathIndex)} 따라가기</button>
            ))}
            <button type="button" className="play" onClick={toggleReplay}>{reducedMotion ? "수동 한 단계 →" : transport.playing ? "일시정지" : "계속 재생"}</button>
          </div>
        ) : null}

        <p className="s56-status" aria-live="polite">
          {originReveal
            ? "First Moment → 01·02·03의 복수 Primary path가 함께 reveal되었습니다."
            : activeFamily
              ? `${activeFamily.label} · ${activeFamily.primaryPaths.length}개 Primary path와 각 Secondary branch를 집중 조망합니다.`
              : "OVERVIEW · First Moment를 선택하면 주요 성장 경로가 펼쳐집니다."}
        </p>

        {selected ? (
          <aside className="s56-inspector open" aria-label="Selected Moment inspector">
            <button type="button" className="close" aria-label="Inspector 닫기" onClick={() => setSelectedIndex(null)}>×</button>
            <small>{selected.first ? "FIRST MOMENT" : selectedFamilyIndex >= 0 ? families[selectedFamilyIndex].label : "MOMENT"}</small>
            <h2>{selected.title}</h2>
            <div className="s56-chips"><span>{selected.date}</span><span>{selected.emotion}</span><span>{selected.sourceType.toUpperCase()}</span></div>
            <article><small>내 메모</small><p>{selected.note}</p></article>
            <article><small>WHY NEXT · Connection</small><p>{incoming?.whyNext ?? "First Moment에서 여러 Connection 경로가 시작됩니다."}</p></article>
            <article><small>PATH STATE</small><p>{selected.first ? "ORIGIN · 01/02/03 major-route reveal" : playback ? `${playback.kind.toUpperCase()} · ${playback.cursor + 1}/${playback.ids.length}` : activeFamily ? `${activeFamily.label} · FOCUSED` : "OVERVIEW"}</p></article>
          </aside>
        ) : null}

        {branchChoice ? (
          <div className="s56-branch-choice" role="dialog" aria-label="Branch choice">
            <small>PATH BRANCH</small>
            <h2>여기서 경로가 갈라집니다</h2>
            <p>지금까지 온 길은 유지됩니다. 주경로를 계속 갈지, 여기서 발견된 보조 경로를 따라갈지 선택하세요.</p>
            <div><button type="button" onClick={choosePrimary}>주경로 계속 →</button><button type="button" className="secondary" onClick={chooseSecondary}>Secondary branch 선택 →</button></div>
          </div>
        ) : null}

        <div className={`s56-list${listOpen ? " open" : ""}`} role="listbox" aria-label="Moment semantic selection list" aria-activedescendant={selected ? `s56-list-${selected.id}` : undefined} onKeyDown={onListKeyDown}>
          {SOURCE56_MOMENTS.map((moment, index) => {
            const familyIndex = nodeFamilyIndex(families, moment.id);
            return (
              <button
                key={moment.id}
                id={`s56-list-${moment.id}`}
                data-list-moment-id={moment.id}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                tabIndex={index === selectedIndex || (selectedIndex === null && moment.first) ? 0 : -1}
                onClick={() => selectMoment(moment.id, familyIndex >= 0 ? familyIndex : null)}
              ><span>{moment.first ? "FIRST" : familyIndex >= 0 ? String(familyIndex + 1).padStart(2, "0") : "–"}</span><strong>{moment.title}</strong><small>{moment.emotion}</small></button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const STYLE = `
.s56{width:100%;color:#292630}.s56 button{font:inherit;color:inherit;cursor:pointer}.s56-stage{position:relative;width:100%;height:100svh;min-height:640px;overflow:hidden;background:radial-gradient(860px 690px at 13% 11%,rgba(228,93,141,.08),transparent 69%),radial-gradient(880px 880px at 88% 43%,rgba(139,105,232,.065),transparent 70%),radial-gradient(820px 860px at 28% 88%,rgba(44,164,192,.05),transparent 70%),linear-gradient(180deg,#fbfaf8 0%,#f7f4f2 52%,#f1eff5 100%);isolation:isolate}.s56-stage:after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;opacity:.18;background-image:radial-gradient(#716d7910 .7px,transparent .7px);background-size:5px 5px}.s56-topbar{position:absolute;z-index:40;left:18px;right:18px;top:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;pointer-events:none}.s56-brand,.s56-top-actions{pointer-events:auto}.s56-brand{display:flex;align-items:center;gap:9px;padding:9px 12px;border:1px solid #4c445613;border-radius:999px;background:#ffffffc9;box-shadow:0 8px 28px #44374812;backdrop-filter:blur(18px)}.s56-brand i{width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,#e45d8d,#8b69e8)}.s56-brand b{font-size:11px;letter-spacing:.14em}.s56-brand span{font-size:10px;color:#37333d75}.s56-top-actions{display:flex;align-items:center;gap:7px}.s56-top-actions>span,.s56-top-actions button{height:36px;padding:0 12px;border:1px solid #574f601a;border-radius:999px;background:#ffffffc7;font-size:9px;letter-spacing:.07em;color:#37323d91;backdrop-filter:blur(16px)}.s56-top-actions>span{display:flex;align-items:center}.s56-top-actions button:hover,.s56-top-actions button:focus-visible{outline:3px solid #8b69e833;outline-offset:2px;background:#fff}.s56-hero{position:absolute;z-index:16;left:50%;top:68px;width:min(800px,calc(100vw - 52px));transform:translateX(-50%);text-align:center;pointer-events:none;transition:opacity .3s,transform .3s}.s56-hero.dim{opacity:.09;transform:translateX(-50%) translateY(-14px)}.s56-hero small{font-size:9px;letter-spacing:.23em;color:#322d393d}.s56-hero h1{margin:8px 0 0;font:650 clamp(28px,3.25vw,48px)/1.07 Inter,Pretendard,sans-serif;letter-spacing:-.055em}.s56-hero p{max-width:690px;margin:9px auto 0;font-size:12px;line-height:1.64;color:#322d3985}.s56-world{position:absolute;z-index:2;inset:0;width:100%;height:100%;transition:opacity .28s}.s56-edge{fill:none;stroke:var(--c);stroke-linecap:round;stroke-width:3;opacity:.18;transition:opacity .32s,stroke-width .32s}.s56-edge.entry{stroke-width:2;opacity:.12}.s56-edge.primary{stroke-width:4.5;opacity:.36}.s56-edge.secondary{stroke-width:2.1;stroke-dasharray:8 10;opacity:.22}.s56-edge.origin{stroke-width:2.7;opacity:.1}.s56-edge.focused{opacity:.92;stroke-width:6}.s56-edge.secondary.focused{stroke-width:3.2;opacity:.72}.s56-edge.muted{opacity:.035}.s56-edge.reveal{opacity:.92;stroke-width:6;stroke-dasharray:none;animation:s56route 1.55s ease-in-out both}.s56-hub{transition:opacity .32s}.s56-hub>circle:first-child{fill:var(--c);opacity:.13;stroke:var(--c);stroke-width:2}.s56-hub .halo{fill:none;stroke:var(--c);stroke-width:1.5;opacity:.12}.s56-hub text{font:700 18px Inter,Pretendard,sans-serif;fill:#342f3a;letter-spacing:-.03em}.s56-hub text.sub{font-size:11px;font-weight:500;letter-spacing:.09em;fill:#746d79}.s56-hub.muted{opacity:.09}.s56-hub.reveal .halo{opacity:.48;stroke-width:3;animation:s56halo 1.2s ease-out both}.s56-node{cursor:pointer;transition:opacity .3s}.s56-node .hit{fill:transparent;pointer-events:all}.s56-node .ring{fill:#fff;stroke:var(--c);stroke-width:3;opacity:.94;transition:r .22s,stroke-width .22s}.s56-node .core{fill:var(--c);filter:drop-shadow(0 5px 12px #4d3b522f);transition:r .22s}.s56-node.secondary .ring{opacity:.72;stroke-width:2}.s56-node.secondary .core{opacity:.72}.s56-node.entry .ring{stroke-width:5}.s56-node.origin .ring{stroke-width:5}.s56-node.origin .core{fill:#4a404d}.s56-node text{font:700 12px Inter,Pretendard,sans-serif;fill:#514a55;letter-spacing:.08em;pointer-events:none}.s56-node text.path-label{font-size:10px;fill:#756e79;letter-spacing:.04em}.s56-node.selected .ring{stroke-width:7}.s56-node.selected .core{r:10}.s56-node:focus-visible{outline:none}.s56-node:focus-visible .ring{stroke:#302c35;stroke-width:8;filter:drop-shadow(0 0 8px #fff)}.s56-node.muted{opacity:.1}.s56-node.reveal{opacity:1}.s56-legend{position:absolute;z-index:27;left:18px;top:114px;width:222px;padding:13px;border:1px solid #4c44561c;border-radius:20px;background:#ffffffc3;backdrop-filter:blur(18px);box-shadow:0 14px 40px #45384c0f;display:grid;gap:3px}.s56-legend>strong{padding:3px 4px 8px;font-size:9px;letter-spacing:.14em;color:#2f2b346b}.s56-legend button{display:grid;grid-template-columns:10px minmax(0,1fr) auto;align-items:center;gap:7px;min-height:34px;padding:5px 7px;border:0;border-radius:10px;background:transparent;text-align:left;font-size:9px;color:#403a457f}.s56-legend button i{width:7px;height:7px;border-radius:50%;background:var(--c,#e45d8d)}.s56-legend button small{font-size:7px;color:#6e667375}.s56-legend button.origin{grid-template-columns:1fr;margin-bottom:3px;background:linear-gradient(135deg,#e45d8d13,#8b69e814);font-weight:700;color:#493e4c}.s56-legend button:hover,.s56-legend button:focus-visible,.s56-legend button.active{outline:none;background:#fff;box-shadow:inset 0 0 0 1px var(--c,#8b69e8)}.s56-path-nav{position:absolute;z-index:32;left:50%;bottom:24px;transform:translateX(-50%);display:flex;align-items:center;gap:6px;max-width:calc(100vw - 120px);padding:7px;border:1px solid #4c445619;border-radius:16px;background:#ffffffe8;box-shadow:0 14px 38px #3f33451a;backdrop-filter:blur(18px);overflow-x:auto}.s56-path-nav>span{flex:0 0 auto;padding:0 8px;font-size:9px;font-weight:700}.s56-path-nav button{flex:0 0 auto;min-height:38px;padding:0 11px;border:1px solid #e2dde4;border-radius:11px;background:#fff;font-size:9px}.s56-path-nav button.active{box-shadow:inset 0 0 0 2px #8b69e8}.s56-path-nav button.play{background:#302c35;color:#fff;border-color:#302c35}.s56-path-nav button:focus-visible{outline:3px solid #8b69e833;outline-offset:2px}.s56-status{position:absolute;z-index:31;left:50%;bottom:76px;transform:translateX(-50%);max-width:min(660px,calc(100vw - 40px));margin:0;padding:9px 14px;border:1px solid #4c445619;border-radius:16px;background:#ffffffe3;box-shadow:0 12px 38px #3f324618;backdrop-filter:blur(18px);font-size:9px;color:#504956;text-align:center}.s56-inspector{position:absolute;z-index:36;right:70px;top:114px;bottom:24px;width:360px;padding:18px;border:1px solid #51485b1f;border-radius:24px;background:linear-gradient(150deg,#fffffff7,#f8f6f9f1);backdrop-filter:blur(24px);box-shadow:0 28px 74px #3b2e4424;overflow:auto;animation:s56panel .3s cubic-bezier(.2,.8,.2,1) both}.s56-inspector .close{position:absolute;right:14px;top:14px;width:32px;height:32px;border:1px solid #4b43541a;border-radius:50%;background:#fff}.s56-inspector>small{font-size:9px;letter-spacing:.16em;color:#2f2b346b}.s56-inspector h2{margin:8px 30px 11px 0;font-size:24px;line-height:1.18;letter-spacing:-.04em}.s56-chips{display:flex;flex-wrap:wrap;gap:6px}.s56-chips span{padding:6px 8px;border:1px solid #4b435419;border-radius:999px;background:#ffffffcc;font-size:9px;color:#2f2b349e}.s56-inspector article{margin-top:8px;padding:12px 13px;border:1px solid #4b435414;border-radius:15px;background:#ffffff99}.s56-inspector article small{font-size:8px;letter-spacing:.12em;color:#2f2b3466}.s56-inspector article p{margin:6px 0 0;font-size:11px;line-height:1.65;color:#2f2b34b8}.s56-branch-choice{position:absolute;z-index:50;left:50%;top:50%;width:min(390px,calc(100vw - 28px));transform:translate(-50%,-50%);padding:16px;border:1px solid #4a42531f;border-radius:20px;background:#fffffff7;box-shadow:0 26px 80px #3127382e;animation:s56panel .22s ease both}.s56-branch-choice>small{font-size:8px;letter-spacing:.16em;color:#8b69e8}.s56-branch-choice h2{margin:5px 0 4px;font-size:18px}.s56-branch-choice p{margin:0 0 11px;font-size:10px;line-height:1.55;color:#2f2b348c}.s56-branch-choice>div{display:grid;grid-template-columns:1fr 1fr;gap:7px}.s56-branch-choice button{min-height:44px;border:1px solid #ded7e1;border-radius:12px;background:#302c35;color:#fff;font-size:10px}.s56-branch-choice button.secondary{background:linear-gradient(135deg,#8f68e9,#d45c92);border:0}.s56-branch-choice button:focus-visible{outline:3px solid #8b69e844;outline-offset:2px}.s56-list{position:absolute;z-index:45;right:18px;top:60px;width:min(430px,calc(100vw - 36px));max-height:0;overflow:hidden;opacity:0;border-radius:18px;background:#fffffff4;box-shadow:0 18px 50px #3b30421f;transition:max-height .25s,opacity .25s}.s56-list.open{max-height:calc(100svh - 82px);overflow:auto;opacity:1;padding:8px;border:1px solid #e4dfe5}.s56-list button{width:100%;display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:42px;padding:7px 9px;border:0;border-bottom:1px solid #eee9ee;background:transparent;text-align:left}.s56-list button[aria-selected=true]{background:#8b69e813;border-radius:10px}.s56-list button:focus-visible{outline:3px solid #8b69e83b;outline-offset:-2px}.s56-list span,.s56-list small{font-size:8px;color:#8c8590}.s56-list strong{font-size:10px}@keyframes s56route{from{stroke-dasharray:22 48;stroke-dashoffset:140;opacity:.14}to{stroke-dasharray:none;stroke-dashoffset:0}}@keyframes s56halo{from{r:28;opacity:.8}to{r:54;opacity:.48}}@keyframes s56panel{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:980px){.s56-legend{width:190px}.s56-inspector{right:14px;width:340px}.s56-path-nav{max-width:calc(100vw - 36px)}}
@media(max-width:640px){.s56-stage{min-height:600px}.s56-topbar{left:8px;right:8px;top:8px}.s56-brand{padding:8px 10px}.s56-brand span{display:none}.s56-top-actions>span{display:none}.s56-top-actions button{height:34px;padding:0 9px}.s56-hero{top:54px;width:calc(100vw - 28px)}.s56-hero small{font-size:7px}.s56-hero h1{font-size:25px}.s56-hero p{max-width:350px;font-size:10px;line-height:1.45}.s56-legend{left:8px;right:8px;top:auto;bottom:8px;width:auto;padding:6px;display:flex;overflow-x:auto;border-radius:16px;scrollbar-width:none}.s56-legend>strong{display:none}.s56-legend button{flex:0 0 auto;display:flex;min-height:42px;padding:0 10px;white-space:nowrap}.s56-legend button small{display:none}.s56-legend button.origin{margin:0}.s56-path-nav{left:8px;right:8px;bottom:58px;transform:none;max-width:none;border-radius:14px}.s56-path-nav>span{display:none}.s56-status{left:8px;right:8px;bottom:111px;transform:none;max-width:none;padding:7px 10px;font-size:8px}.s56-inspector{left:6px;right:6px;top:auto;bottom:58px;width:auto;max-height:62svh;border-radius:23px 23px 17px 17px;padding:16px;padding-bottom:max(16px,env(safe-area-inset-bottom));animation:s56sheet .28s cubic-bezier(.2,.8,.2,1) both}.s56-inspector h2{font-size:21px}.s56-branch-choice{top:auto;bottom:62px;transform:translateX(-50%);animation:s56sheet .22s ease both}.s56-branch-choice>div{grid-template-columns:1fr}.s56-list{left:8px;right:8px;top:50px;width:auto}.s56-node text.path-label{font-size:12px}.s56-hub text{font-size:22px}.s56-hub text.sub{font-size:13px}@keyframes s56sheet{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}}
@media(prefers-reduced-motion:reduce){.s56 *{scroll-behavior:auto!important}.s56-hero,.s56-edge,.s56-hub,.s56-node,.s56-list{transition:none!important}.s56-edge.reveal,.s56-hub.reveal .halo,.s56-inspector,.s56-branch-choice{animation:none!important}}
`;
