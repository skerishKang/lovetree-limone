import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const viewSwitcher = readFileSync("app/components/ViewSwitcher.tsx", "utf8");
const route = readFileSync("app/trees/[id]/explore/page.tsx", "utf8");
const projection = readFileSync("lib/lineage-60/projection.ts", "utf8");
const sourceData = readFileSync("lib/lineage-60/data.ts", "utf8");

const directDurableWrite = /\b(?:fetch|apiFetch)\s*\(|\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']|\b(?:prisma|drizzle|neon|firebase|supabase)\b/iu;

test("Source60 is adopted as a Tree-scoped deep explore mode", () => {
  assert.match(viewSwitcher, /kind: "explore", label: "탐색", path: "\/explore"/);
  assert.match(route, /data-mvp-source="60"/);
  assert.match(route, /active="explore"/);
  assert.doesNotMatch(route, /\/v4\/trees\/demo\/graph|\/design-lab\/lineages\/60\/v1-2/);
});

test("canonical explorer uses actual Tree Moments and preserves moment query authority", () => {
  assert.match(route, /useTreeMoments\(treeId, undefined, momentId \?\? undefined\)/);
  assert.match(route, /const momentId = searchParams\.get\("moment"\)/);
  assert.match(route, /next\.set\("moment", nextMomentId\)/);
  assert.match(route, /router\.replace\(/);
  assert.doesNotMatch(route, /TRACK60_MOMENTS|buildTrack60Moments/);
});

test("cluster and bridge identities are view-derived only", () => {
  assert.match(route, /Cluster \/ Bridge = VIEW_DERIVED/);
  assert.match(route, /parent\.cluster !== moment\.cluster/);
  assert.match(route, /bridgeIds/);
  assert.doesNotMatch(route, directDurableWrite);
});

test("Source60 software projection and depth hit authority are reused", () => {
  assert.match(route, /project,/);
  assert.match(route, /sortFarToNear/);
  assert.match(route, /frontmostHit/);
  assert.match(route, /classifyGesture/);
  assert.match(projection, /Canvas-2D software-projected 3D projection/);
  assert.match(projection, /Frontmost \(nearest\) hit authority/);
});

test("authoritative Source60 synthetic fixture remains fidelity evidence only", () => {
  assert.match(sourceData, /TRACK60_MOMENTS/);
  assert.match(sourceData, /Cluster\s+= VIEW_DERIVED/);
  assert.doesNotMatch(route, /from "@\/lib\/lineage-60\/data"/);
});
