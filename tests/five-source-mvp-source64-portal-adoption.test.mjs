import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const viewSwitcher = readFileSync("app/components/ViewSwitcher.tsx", "utf8");
const portal = readFileSync("app/trees/[id]/portal/page.tsx", "utf8");
const resolver = readFileSync("app/components/v4/V4EntryResolver.tsx", "utf8");
const sourceProof = readFileSync(
  "app/design-lab/lineages/64/v1-2-1/Lineage64FloatingMomentPortal.tsx",
  "utf8",
);

test("Source64 portal lives only after canonical Tree resolution", () => {
  assert.match(viewSwitcher, /kind: "portal", label: "포털", path: "\/portal"/);
  assert.match(portal, /useParams<\{ id: string \| string\[\] \}>/);
  assert.match(portal, /data-mvp-source="64"/);
  assert.match(portal, /Tree already resolved/);
  assert.doesNotMatch(portal, /V4EntryResolver|treeCount|\/v4\/journey/);
});

test("V4 entry resolver authority remains unchanged and outside Source64", () => {
  assert.match(resolver, /\/v4\/journey/);
  assert.match(resolver, /\/my-trees/);
  assert.match(resolver, /\/trees\//);
  assert.doesNotMatch(portal, /router\.replace\("\/trees\//);
});

test("portal consumes real Tree Moments and canonical moment URL state", () => {
  assert.match(portal, /useTreeMoments\(treeId, undefined, momentId \?\? undefined\)/);
  assert.match(portal, /next\.set\("moment", nextMomentId\)/);
  assert.match(portal, /router\.replace\(/);
  assert.match(portal, /Moment 상세/);
  assert.match(portal, /Living Board/);
  assert.match(portal, /관계 보기/);
  assert.match(portal, /3D 탐색/);
  assert.doesNotMatch(portal, /TRACK64_MOMENTS/);
});

test("portal does not invent returning-user ranking or persistence", () => {
  assert.match(portal, /treeMoments\.slice\(0, ORBIT_LIMIT\)/);
  assert.doesNotMatch(portal, /recent|important|lastViewed|resume/i);
  assert.doesNotMatch(portal, /fetch\(|apiFetch\(|POST|PUT|DELETE|prisma|drizzle|neon|firebase|supabase/iu);
});

test("authoritative Source64 Design Lab proof remains intact", () => {
  assert.match(sourceProof, /TRACK64_MOMENTS/);
  assert.match(sourceProof, /TRUE AMBIENT AUTO-ORBIT/);
  assert.match(sourceProof, /pointercancel/);
});
