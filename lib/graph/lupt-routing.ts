export interface RouteNode {
  id: string;
  x: number;
  y: number;
}

export interface RouteEdge {
  id: string;
  from: string;
  to: string;
}

export interface DerivedRoute {
  d: string | null;
  bundled: boolean;
}

const ANCHOR_OUT_DX = 168;
const ANCHOR_DY = 55;
const LANE_GAP = 14;
const TRUNK_ANGLE_THRESHOLD = 0.35;
const MIN_TRUNK_SPAN = 40;

interface Point {
  x: number;
  y: number;
}

function anchorOut(node: RouteNode): Point {
  return { x: node.x + ANCHOR_OUT_DX, y: node.y + ANCHOR_DY };
}

function anchorIn(node: RouteNode): Point {
  return { x: node.x, y: node.y + ANCHOR_DY };
}

function isFinitePoint(point: Point) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function legacyPath(start: Point, end: Point) {
  const bend = Math.max(80, Math.abs(end.x - start.x) * 0.46);
  return `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`;
}

function shiftedPath(start: Point, end: Point, c1: Point, c2: Point) {
  return `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
}

function angleDiff(a: number, b: number) {
  const delta = Math.abs(a - b) % (Math.PI * 2);
  return delta > Math.PI ? Math.PI * 2 - delta : delta;
}

function numericIdCompare(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true });
}

export function deriveEdgeRoutes(nodes: RouteNode[], edges: RouteEdge[]): Map<string, DerivedRoute> {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const routes = new Map<string, DerivedRoute>();

  interface Draft {
    edge: RouteEdge;
    start: Point;
    end: Point;
    c1: Point;
    c2: Point;
    angle: number;
    bundleEligible: boolean;
  }

  const drafts = new Map<string, Draft>();
  const sortedEdges = [...edges].sort((a, b) => numericIdCompare(a.id, b.id));

  for (const edge of sortedEdges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) {
      routes.set(edge.id, { d: null, bundled: false });
      continue;
    }
    const start = anchorOut(from);
    const end = anchorIn(to);
    if (!isFinitePoint(start) || !isFinitePoint(end)) {
      routes.set(edge.id, { d: null, bundled: false });
      continue;
    }
    const bend = Math.max(80, Math.abs(end.x - start.x) * 0.46);
    const c1 = { x: start.x + bend, y: start.y };
    const c2 = { x: end.x - bend, y: end.y };
    const spanX = end.x - start.x;
    const spanY = end.y - start.y;
    drafts.set(edge.id, {
      edge,
      start,
      end,
      c1,
      c2,
      angle: Math.atan2(spanY, spanX),
      bundleEligible: Math.hypot(spanX, spanY) >= MIN_TRUNK_SPAN,
    });
    routes.set(edge.id, { d: legacyPath(start, end), bundled: false });
  }

  const bySource = new Map<string, Draft[]>();
  for (const draft of drafts.values()) {
    if (!draft.bundleEligible) continue;
    const group = bySource.get(draft.edge.from) ?? [];
    group.push(draft);
    bySource.set(draft.edge.from, group);
  }

  for (const group of bySource.values()) {
    const parent = new Map<string, string>();
    const find = (id: string): string => {
      const root = parent.get(id) ?? id;
      if (root === id) return id;
      const resolved = find(root);
      parent.set(id, resolved);
      return resolved;
    };
    const union = (a: string, b: string) => {
      parent.set(find(a), find(b));
    };

    for (let i = 0; i < group.length; i += 1) {
      parent.set(group[i].edge.id, group[i].edge.id);
    }
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        if (angleDiff(group[i].angle, group[j].angle) <= TRUNK_ANGLE_THRESHOLD) {
          union(group[i].edge.id, group[j].edge.id);
        }
      }
    }

    const components = new Map<string, Draft[]>();
    for (const draft of group) {
      const root = find(draft.edge.id);
      const members = components.get(root) ?? [];
      members.push(draft);
      components.set(root, members);
    }

    for (const members of components.values()) {
      if (members.length < 2) continue;
      members.sort((a, b) => numericIdCompare(a.edge.id, b.edge.id));
      const meanAngle = Math.atan2(
        members.reduce((sum, draft) => sum + Math.sin(draft.angle), 0),
        members.reduce((sum, draft) => sum + Math.cos(draft.angle), 0),
      );
      const perpendicular = { x: -Math.sin(meanAngle), y: Math.cos(meanAngle) };
      const mid = (members.length - 1) / 2;
      members.forEach((draft, index) => {
        const offset = (index - mid) * LANE_GAP;
        const shift = (point: Point): Point => ({ x: point.x + perpendicular.x * offset, y: point.y + perpendicular.y * offset });
        const shiftedC1 = shift(draft.c1);
        const shiftedC2 = shift(draft.c2);
        if (!isFinitePoint(shiftedC1) || !isFinitePoint(shiftedC2)) return;
        routes.set(draft.edge.id, { d: shiftedPath(draft.start, draft.end, shiftedC1, shiftedC2), bundled: true });
      });
    }
  }

  return routes;
}
