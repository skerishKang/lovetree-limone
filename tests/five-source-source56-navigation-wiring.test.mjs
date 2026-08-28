import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/trees/[id]/relationships/page.tsx", "utf8");
const adapter = readFileSync("app/trees/[id]/relationships/source56-canonical-adapter.ts", "utf8");
const native = readFileSync(
  "app/design-lab/lineages/53/53-v3-vertical-network-overview/Lineage53VerticalNetworkOverview.tsx",
  "utf8",
);

test("Source56 canonical route reuses native presentation instead of a generic graph", () => {
  assert.ok(route.includes("Lineage53VerticalNetworkOverview"));
  assert.ok(route.includes('adaptCanonicalMomentsToSource56'));
  assert.ok(route.includes('data-testid="source56-canonical-network"'));
  assert.doesNotMatch(route, /<svg|NetworkNode|edgePath/);
});

test("Source56 outbound hooks preserve selected Moment context across sibling views", () => {
  assert.ok(route.includes('const momentSuffix = selectedMomentId ? `?moment=${encodeURIComponent(selectedMomentId)}` : "";'));
  assert.ok(route.includes('href={`/trees/${encodedTreeId}${momentSuffix}`}'));
  assert.ok(route.includes('href={`/trees/${encodedTreeId}/board${momentSuffix}`}'));
  assert.ok(route.includes('href={`/trees/${encodedTreeId}/explore${momentSuffix}`}'));
  assert.ok(route.includes('href={`/trees/${encodedTreeId}/portal${momentSuffix}`}'));
});

test("Source56 keeps direct, history, invalid, and selected-node URL state fail-closed", () => {
  assert.match(route, /const momentId = searchParams\.get\("moment"\)/);
  assert.match(route, /useTreeMoments\(treeId, undefined, momentId \?\? undefined\)/);
  assert.ok(route.includes('selectedMomentId={selectedMomentId}'));
  assert.ok(route.includes('onSelectMoment={syncMomentToUrl}'));
  assert.match(route, /selectMoment\(nextMomentId\)/);
  assert.match(route, /router\.replace\(/);
  assert.match(native, /externalSelectedMomentId/);
  assert.match(native, /momentIndex\(moments, externalSelectedMomentId\)/);
});

test("canonical adapter uses only canonical Moment fields and VIEW_DERIVED topology", () => {
  assert.match(adapter, /treeMoments: readonly TreeMomentView\[\]/);
  assert.match(adapter, /moment\.parentId/);
  assert.match(adapter, /moment\.connectionReason/);
  assert.match(adapter, /VIEW_DERIVED/);
  assert.doesNotMatch(adapter, /SOURCE56_MOMENTS|SOURCE56_CONNECTIONS|fetch\s*\(|apiFetch\s*\(/);
});

test("Source56 canonical wiring adds no relation persistence or backend surface", () => {
  const durable = /\b(?:fetch|apiFetch)\s*\(|\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']|\b(?:prisma|drizzle|neon|firebase|supabase)\b|relation table|edge table|path table/iu;
  assert.doesNotMatch(route, durable);
  assert.doesNotMatch(adapter, durable);
});
