export const TRACK14_SOURCE_BYTES = 87256;
export const TRACK14_SOURCE_SHA256 = "c30d6e1ce861bffbeccbeaeab515a8d51fd4bf00704f7093f3b1aab505cc3d4c";
export const TRACK14_SOURCE_GIT_BLOB = "26488eb6f4a56b3611b66456c156b487674a64d3";

export type Track14LayoutMode = "branch" | "orbit" | "journey" | "timeline";

export interface Track14MomentLike {
  id: string;
  parentId: string | null;
  connectionReason: string | null;
  sortOrder: number;
}

export interface Track14ProjectedNode<T extends Track14MomentLike = Track14MomentLike> {
  id: string;
  x: number;
  y: number;
  depth: number;
  revealAt: number;
  source: T;
}

export interface Track14ProjectedEdge {
  from: string;
  to: string;
  label: string;
  depth: number;
  revealAt: number;
}

export interface Track14Projection<T extends Track14MomentLike = Track14MomentLike> {
  nodes: Track14ProjectedNode<T>[];
  edges: Track14ProjectedEdge[];
}

function sortMoments<T extends Track14MomentLike>(moments: readonly T[]): T[] {
  return [...moments].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function computeDepth<T extends Track14MomentLike>(moment: T, byId: Map<string, T>): number {
  let depth = 0;
  let parentId = moment.parentId;
  const visited = new Set<string>([moment.id]);
  while (parentId && byId.has(parentId) && !visited.has(parentId) && depth < 12) {
    visited.add(parentId);
    depth += 1;
    parentId = byId.get(parentId)?.parentId ?? null;
  }
  return depth;
}

function evenlySpaced(count: number, start: number, end: number): number[] {
  if (count <= 1) return [(start + end) / 2];
  return Array.from({ length: count }, (_, index) => start + ((end - start) * index) / (count - 1));
}

function desktopBranchYs(depth: number, count: number): number[] {
  if (depth === 0) return evenlySpaced(count, -80, 80);
  if (depth === 1 && count === 1) return [-150];
  if (depth === 2 && count === 3) return [-285, -135, 145];
  if (depth === 3 && count === 3) return [-170, 5, 205];
  if (depth === 4 && count === 1) return [90];
  return evenlySpaced(count, -270, 270);
}

function branchDesktop<T extends Track14MomentLike>(ordered: T[], depthById: Map<string, number>) {
  const position = new Map<string, { x: number; y: number }>();
  const maxDepth = Math.max(0, ...depthById.values());
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const group = ordered.filter((moment) => depthById.get(moment.id) === depth);
    const ys = desktopBranchYs(depth, group.length);
    const x = depth === 0 ? -455 : depth === 1 ? -205 : depth === 2 ? 55 : depth === 3 ? 330 : 525 + (depth - 4) * 175;
    group.forEach((moment, index) => position.set(moment.id, { x, y: ys[index] ?? 0 }));
  }
  return position;
}

function branchMobile<T extends Track14MomentLike>(ordered: T[], depthById: Map<string, number>, byId: Map<string, T>) {
  const position = new Map<string, { x: number; y: number }>();
  const maxDepth = Math.max(0, ...depthById.values());
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const group = ordered.filter((moment) => depthById.get(moment.id) === depth);
    if (depth === 0) {
      group.forEach((moment, index) => position.set(moment.id, { x: index % 2 ? 145 : 0, y: -470 + index * 150 }));
      continue;
    }
    if (depth === 1) {
      group.forEach((moment, index) => position.set(moment.id, { x: index % 2 ? 168 : -168, y: -230 + Math.floor(index / 2) * 235 }));
      continue;
    }
    const siblingGroups = new Map<string, T[]>();
    group.forEach((moment) => {
      const key = moment.parentId && byId.has(moment.parentId) ? moment.parentId : "__orphan__";
      const siblings = siblingGroups.get(key) ?? [];
      siblings.push(moment);
      siblingGroups.set(key, siblings);
    });
    siblingGroups.forEach((siblings, parentId) => {
      const parent = position.get(parentId) ?? { x: 0, y: -120 + depth * 125 };
      siblings.forEach((moment, index) => {
        position.set(moment.id, {
          x: Math.max(-250, Math.min(250, parent.x + (index % 2 ? 105 : -105))),
          y: parent.y + 118 + Math.floor(index / 2) * 98,
        });
      });
    });
  }
  return position;
}

function alternateLayout<T extends Track14MomentLike>(ordered: T[], depthById: Map<string, number>, mode: Exclude<Track14LayoutMode, "branch">, mobile: boolean) {
  const position = new Map<string, { x: number; y: number }>();
  const roots = ordered.filter((moment) => (depthById.get(moment.id) ?? 0) === 0);
  roots.forEach((moment, index) => position.set(moment.id, mobile ? { x: 0, y: -450 + index * 145 } : { x: 0, y: index * 120 }));
  const rest = ordered.filter((moment) => (depthById.get(moment.id) ?? 0) > 0);
  rest.forEach((moment, index) => {
    const depth = depthById.get(moment.id) ?? 1;
    if (mode === "orbit") {
      const angle = (index / Math.max(1, rest.length)) * Math.PI * 2 - Math.PI / 2;
      const radius = mobile ? 180 + Math.min(depth, 3) * 34 : 245 + Math.min(depth, 3) * 72;
      position.set(moment.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * (mobile ? radius * 1.5 : radius * 0.72) });
    } else if (mode === "journey") {
      if (mobile) position.set(moment.id, { x: index % 2 ? 135 : -135, y: -300 + index * 120 });
      else position.set(moment.id, { x: -460 + index * (920 / Math.max(1, rest.length - 1)), y: Math.sin(index * 1.42) * 205 });
    } else {
      if (mobile) position.set(moment.id, { x: index % 2 ? 145 : -145, y: -290 + index * 115 });
      else position.set(moment.id, { x: index % 2 ? 255 : -255, y: -250 + index * (520 / Math.max(1, rest.length - 1)) });
    }
  });
  return position;
}

export function track14BuildProjection<T extends Track14MomentLike>(
  moments: readonly T[],
  mode: Track14LayoutMode = "branch",
  mobile = false,
): Track14Projection<T> {
  const ordered = sortMoments(moments);
  const byId = new Map(ordered.map((moment) => [moment.id, moment]));
  const depthById = new Map(ordered.map((moment) => [moment.id, computeDepth(moment, byId)]));
  const positions = mode === "branch"
    ? mobile ? branchMobile(ordered, depthById, byId) : branchDesktop(ordered, depthById)
    : alternateLayout(ordered, depthById, mode, mobile);

  const depthCounters = new Map<number, number>();
  const nodes = ordered.map((moment) => {
    const depth = depthById.get(moment.id) ?? 0;
    const indexAtDepth = depthCounters.get(depth) ?? 0;
    depthCounters.set(depth, indexAtDepth + 1);
    const position = positions.get(moment.id) ?? { x: 0, y: 0 };
    const baseReveal = depth === 0 ? 0.025 : depth === 1 ? 0.22 : depth === 2 ? 0.48 : depth === 3 ? 0.7 : 0.82;
    return {
      id: moment.id,
      x: position.x,
      y: position.y,
      depth,
      revealAt: Math.min(0.94, baseReveal + indexAtDepth * 0.035),
      source: moment,
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = ordered.flatMap((moment) => {
    if (!moment.parentId || !nodeById.has(moment.parentId)) return [];
    const depth = depthById.get(moment.id) ?? 1;
    const target = nodeById.get(moment.id);
    return [{
      from: moment.parentId,
      to: moment.id,
      label: moment.connectionReason?.trim() || "이전 순간과 이어지는 관계",
      depth,
      revealAt: Math.max(0.12, (target?.revealAt ?? 0.4) - 0.085),
    } satisfies Track14ProjectedEdge];
  });

  return { nodes, edges };
}

export function track14Descendants(edges: readonly Track14ProjectedEdge[], selectedId: string | null): Set<string> {
  if (!selectedId) return new Set();
  const related = new Set<string>([selectedId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (related.has(edge.from) && !related.has(edge.to)) {
        related.add(edge.to);
        changed = true;
      }
    }
  }
  return related;
}

export function track14RevealValue(progress: number, revealAt: number, duration = 0.12): number {
  const raw = Math.max(0, Math.min(1, (progress - revealAt) / duration));
  return raw * raw * (3 - 2 * raw);
}

export function track14Phase(progress: number): "SEED" | "CONNECTIONS" | "MOMENTS" | "SETTLING" | "FORM COMPLETE" {
  if (progress < 0.14) return "SEED";
  if (progress < 0.43) return "CONNECTIONS";
  if (progress < 0.76) return "MOMENTS";
  if (progress < 0.98) return "SETTLING";
  return "FORM COMPLETE";
}
