import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const viewSwitcher = readFileSync("app/components/ViewSwitcher.tsx", "utf8");
const route = readFileSync("app/trees/[id]/relationships/page.tsx", "utf8");
const adapter = readFileSync("app/trees/[id]/relationships/source56-canonical-adapter.ts", "utf8");
const native = readFileSync(
  "app/design-lab/lineages/53/53-v3-vertical-network-overview/Lineage53VerticalNetworkOverview.tsx",
  "utf8",
);
const durableWrite = /\b(?:fetch|apiFetch)\s*\(|\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']|\b(?:prisma|drizzle|neon|firebase|supabase)\b/iu;

test("Source56 remains a Tree-scoped canonical relationship mode", () => {
  assert.match(viewSwitcher, /kind: "relationships", label: "관계", path: "\/relationships"/);
  assert.match(route, /data-mvp-source="56"/);
  assert.match(route, /active="relationships"/);
  assert.doesNotMatch(route, /href=["'`]\/design-lab\/lineages\/53/);
});

test("canonical route reuses the native Source56 surface through a Moment adapter", () => {
  assert.ok(route.includes("Lineage53VerticalNetworkOverview"));
  assert.ok(route.includes("presentationData={presentationData}"));
  assert.ok(route.includes("selectedMomentId={selectedMomentId}"));
  assert.ok(route.includes("onSelectMoment={syncMomentToUrl}"));
  assert.ok(route.includes("adaptCanonicalMomentsToSource56(treeMoments)"));
  assert.match(adapter, /parentId/);
  assert.match(adapter, /connectionReason/);
  assert.match(adapter, /VIEW_DERIVED/);
  assert.doesNotMatch(route, /SOURCE56_MOMENTS|SOURCE56_CONNECTIONS|deriveSource56PathFamilies/);
});

test("native Source56 keeps the faithful route, playback, branch, and reduced-motion contract", () => {
  assert.match(native, /FIRST · 01\/02\/03 REVEAL/);
  assert.match(native, /Primary path/);
  assert.match(native, /secondaryBranches/);
  assert.match(native, /choosePrimary/);
  assert.match(native, /chooseSecondary/);
  assert.match(native, /data-reduced-motion/);
  assert.match(native, /design-runtime\/transport/);
  assert.match(native, /design-runtime\/selection/);
});

test("canonical Moment URL context remains authoritative", () => {
  assert.match(route, /const momentId = searchParams\.get\("moment"\)/);
  assert.match(route, /selectMoment\(nextMomentId\)/);
  assert.match(route, /next\.set\("moment", nextMomentId\)/);
  assert.match(route, /router\.replace\(/);
  assert.ok(route.includes('ViewSwitcher treeId={treeId} active="relationships" momentId={selectedMomentId}'));
});

test("Source56 canonical wiring creates no relation persistence or backend surface", () => {
  assert.doesNotMatch(route, durableWrite);
  assert.doesNotMatch(adapter, durableWrite);
  assert.doesNotMatch(route, /relation table|edge table|path table|new DB|new API/iu);
});

test("authoritative Source56 native proof remains available as fidelity reference", () => {
  assert.match(native, /SOURCE56_CONNECTIONS/);
  assert.match(native, /deriveSource56PathFamilies/);
  assert.match(native, /FIRST · 01\/02\/03 REVEAL/);
});
