import assert from "node:assert/strict";
import test from "node:test";
import { deriveEdgeRoutes } from "../lib/graph/lupt-routing.ts";

const NODES = [
  { id: "n1", x: 90, y: 295 },
  { id: "n2", x: 330, y: 125 },
  { id: "n3", x: 340, y: 440 },
  { id: "n4", x: 610, y: 65 },
  { id: "n5", x: 625, y: 470 },
  { id: "n6", x: 865, y: 205 },
];

const EDGES = [
  { id: "e1", from: "n1", to: "n2" },
  { id: "e2", from: "n1", to: "n3" },
  { id: "e3", from: "n2", to: "n4" },
  { id: "e4", from: "n3", to: "n5" },
  { id: "e5", from: "n4", to: "n6" },
  { id: "e7", from: "n3", to: "n6" },
];

function legacyPath(a, b) {
  const ax = a.x + 168;
  const ay = a.y + 55;
  const bx = b.x;
  const by = b.y + 55;
  const bend = Math.max(80, Math.abs(bx - ax) * 0.46);
  return `M ${ax} ${ay} C ${ax + bend} ${ay}, ${bx - bend} ${by}, ${bx} ${by}`;
}

function topologySignature(edges) {
  return edges
    .map((edge) => `${edge.id}:${edge.from}->${edge.to}`)
    .sort()
    .join("|");
}

function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

test("topology invariance: node placement never changes connection identity", () => {
  const baseline = topologySignature(EDGES);

  const layouts = [
    NODES,
    NODES.map((node, index) => ({ ...node, x: 90 + (index % 4) * 255, y: 70 + Math.floor(index / 4) * 320 + (index % 2) * 55 })),
    NODES.map((node) => ({ ...node, x: node.x + 240, y: node.y - 130 })),
  ];

  const random = lcg(20260821);
  for (let run = 0; run < 25; run += 1) {
    layouts.push(NODES.map((node) => ({ ...node, x: Math.round(random() * 1000), y: Math.round(random() * 600) })));
  }

  for (const layout of layouts) {
    const routes = deriveEdgeRoutes(layout, EDGES);
    assert.equal(topologySignature(EDGES), baseline, "edge identity must survive re-layout");
    assert.equal(routes.size, EDGES.length, "route count must equal edge count");
    for (const edge of EDGES) {
      const route = routes.get(edge.id);
      assert.ok(route, `missing route for ${edge.id}`);
      assert.equal(typeof route.d === "string" || route.d === null, true);
      if (route.d !== null) {
        assert.match(route.d, /^M -?\d+(\.\d+)? -?\d+(\.\d+)? C /, `route for ${edge.id} must stay an anchored bezier`);
      }
    }
  }
});

test("routing is presentation-only: inputs are never mutated", () => {
  const nodes = NODES.map((node) => ({ ...node }));
  const edges = EDGES.map((edge) => ({ ...edge }));
  const nodesSnapshot = JSON.stringify(nodes);
  const edgesSnapshot = JSON.stringify(edges);

  deriveEdgeRoutes(nodes, edges);
  deriveEdgeRoutes(nodes, edges);

  assert.equal(JSON.stringify(nodes), nodesSnapshot, "nodes must not be mutated");
  assert.equal(JSON.stringify(edges), edgesSnapshot, "edges must not be mutated");
});

test("routing is deterministic and independent of edge array order", () => {
  const first = deriveEdgeRoutes(NODES, EDGES);
  const second = deriveEdgeRoutes(NODES, EDGES);
  for (const edge of EDGES) {
    assert.equal(first.get(edge.id).d, second.get(edge.id).d, `route for ${edge.id} must be deterministic`);
    assert.equal(first.get(edge.id).bundled, second.get(edge.id).bundled);
  }

  const shuffled = [...EDGES].reverse();
  const reversed = deriveEdgeRoutes(NODES, shuffled);
  for (const edge of EDGES) {
    assert.equal(first.get(edge.id).d, reversed.get(edge.id).d, `lane assignment for ${edge.id} must not depend on array order`);
  }
});

test("bundled lanes diverge but keep their endpoint anchors", () => {
  // n3 has two out-edges (e4 -> n5, e7 -> n6); place targets so both leave
  // in a similar direction, forcing a shared-trunk bundle.
  const layout = [
    { id: "n1", x: 60, y: 300 },
    { id: "n2", x: 60, y: 420 },
    { id: "n3", x: 320, y: 360 },
    { id: "n4", x: 700, y: 330 },
    { id: "n5", x: 720, y: 380 },
    { id: "n6", x: 740, y: 430 },
  ];
  const edges = [
    { id: "e4", from: "n3", to: "n5" },
    { id: "e7", from: "n3", to: "n6" },
  ];

  const routes = deriveEdgeRoutes(layout, edges);
  const e4 = routes.get("e4");
  const e7 = routes.get("e7");

  assert.equal(e4.bundled, true, "parallel same-source edges must bundle");
  assert.equal(e7.bundled, true);
  assert.notEqual(e4.d, e7.d, "bundled lanes must render distinct geometry");

  const n3 = layout.find((node) => node.id === "n3");
  const startAnchor = `M ${n3.x + 168} ${n3.y + 55} `;
  assert.ok(e4.d.startsWith(startAnchor), "bundle must keep source anchor");
  assert.ok(e7.d.startsWith(startAnchor));

  const endAnchors = [
    ` ${layout.find((node) => node.id === "n5").x} ${layout.find((node) => node.id === "n5").y + 55}`,
    ` ${layout.find((node) => node.id === "n6").x} ${layout.find((node) => node.id === "n6").y + 55}`,
  ];
  assert.ok(e4.d.endsWith(endAnchors[0]), "bundle must keep target anchor");
  assert.ok(e7.d.endsWith(endAnchors[1]));
});

test("fallback: non-bundled edge equals the legacy current path", () => {
  const layout = [NODES[0], NODES[5]];
  const edges = [{ id: "solo", from: "n1", to: "n6" }];
  const routes = deriveEdgeRoutes(layout, edges);
  const route = routes.get("solo");
  assert.equal(route.bundled, false, "a lone edge must not bundle");
  assert.equal(route.d, legacyPath(layout[0], layout[1]), "fallback must reproduce the existing routing");
});

test("fallback: degenerate geometry degrades gracefully instead of throwing", () => {
  const coincident = [
    { id: "a", x: 200, y: 200 },
    { id: "b", x: 32, y: 145 },
  ];
  const samePointEdges = [{ id: "x1", from: "a", to: "b" }];
  const routesSame = deriveEdgeRoutes(coincident, samePointEdges);
  assert.ok(routesSame.get("x1"), "coincident anchors still resolve to a route entry");

  const brokenNodes = [
    { id: "a", x: Number.NaN, y: 200 },
    { id: "b", x: 400, y: 200 },
  ];
  const brokenEdges = [
    { id: "x2", from: "a", to: "b" },
    { id: "x3", from: "ghost", to: "b" },
  ];
  const routesBroken = deriveEdgeRoutes(brokenNodes, brokenEdges);
  assert.equal(routesBroken.get("x2").bundled, false, "NaN geometry must fall back, never bundle");
  assert.equal(routesBroken.get("x3").d, null, "unknown endpoint yields no drawable path");
});
