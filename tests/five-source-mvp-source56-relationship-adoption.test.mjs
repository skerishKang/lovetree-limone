import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const viewSwitcher = readFileSync("app/components/ViewSwitcher.tsx", "utf8");
const route = readFileSync("app/trees/[id]/relationships/page.tsx", "utf8");
const sourceProof = readFileSync(
  "app/design-lab/lineages/53/53-v3-vertical-network-overview/Lineage53VerticalNetworkOverview.tsx",
  "utf8",
);

 test("Source56 is a Tree-scoped relationship mode, not a Design Lab production hop", () => {
  assert.match(viewSwitcher, /kind: "relationships", label: "관계", path: "\/relationships"/);
  assert.match(route, /data-mvp-source="56"/);
  assert.match(route, /active="relationships"/);
  assert.doesNotMatch(route, /href=["'`]\/design-lab\/lineages\/53/);
});

test("relationship truth comes only from canonical Moment parentId and connectionReason", () => {
  assert.match(route, /useTreeMoments\(treeId, undefined, momentId \?\? undefined\)/);
  assert.match(route, /parentId: moment\.parentId/);
  assert.match(route, /connectionReason: moment\.connectionReason/);
  assert.match(route, /node\.connectionReason \|\| "이전 Moment에서 이어진 관계"/);
  assert.doesNotMatch(route, /SOURCE56_MOMENTS|SOURCE56_CONNECTIONS|deriveSource56PathFamilies/);
});

test("Source56 layout remains view-derived and does not create relation persistence", () => {
  assert.match(route, /layout \/ grouping = VIEW_DERIVED/);
  assert.match(route, /new DB \/ API \/ schema = none/);
  assert.doesNotMatch(route, /fetch\(|apiFetch\(|POST|PUT|DELETE|prisma|drizzle|neon|firebase|supabase/iu);
});

test("canonical Moment context is preserved through the relationship view", () => {
  assert.match(route, /const momentId = searchParams\.get\("moment"\)/);
  assert.match(route, /next\.set\("moment", nextMomentId\)/);
  assert.match(route, /router\.replace\(/);
  assert.match(route, /ViewSwitcher treeId=\{treeId\} active="relationships" momentId=\{selectedMomentId\}/);
});

test("authoritative Source56 proof remains available as fidelity reference", () => {
  assert.match(sourceProof, /SOURCE56_CONNECTIONS/);
  assert.match(sourceProof, /deriveSource56PathFamilies/);
  assert.match(sourceProof, /FIRST · 01\/02\/03 REVEAL/);
});
