import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const surface = readFileSync(new URL("../app/components/v4/product/V4FinalTreeSurface.tsx", import.meta.url), "utf8");

function overviewRegion() {
  const start = surface.indexOf("function OverviewSurface");
  const end = surface.indexOf("function PublicStorySurface");
  assert.ok(start !== -1, "OverviewSurface must exist in V4FinalTreeSurface.tsx");
  assert.ok(end !== -1 && end > start, "OverviewSurface region must be followed by PublicStorySurface");
  return surface.slice(start, end);
}

test("Overview consumes the canonical moments supplied by the Tree surface / useTreeMoments authority", () => {
  assert.match(surface, /function OverviewSurface\(\{ tree, moments \}: \{ tree: TreeRecord; moments: MemoryRecord\[\] \}\)/);
  assert.match(surface, /const \{ tree, moments, loading, error, isOwner \} = useTreeMoments\(treeId\)/);
  assert.match(surface, /\{mode === "overview" \? <OverviewSurface tree=\{tree\} moments=\{moments\} \/> : null\}/);
  // The Overview surface itself must not fetch; the only fetch in this file belongs to Public Story.
  assert.doesNotMatch(overviewRegion(), /apiFetch|\bfetch\(/);
});

test("the tail-card sequence is derived from canonical array position, not a new recency ranking", () => {
  assert.match(surface, /const tailMoments = \[\.\.\.moments\]\.slice\(-4\)\.reverse\(\);/);
  assert.doesNotMatch(surface, /const recent = \[\.\.\.moments\]/);
  assert.match(overviewRegion(), /tailMoments\.map/);
});

test("Overview copy claims no unsupported recent/last-viewed/resume authority", () => {
  assert.doesNotMatch(overviewRegion(), /\brecent\b|lastViewedAt|last viewed|resume|recentRank|importantRank|recentMemoryId/i);
  assert.doesNotMatch(overviewRegion(), /최근|마지막으로 본/);
});

test("Overview presents truthful canonical sequence/order wording", () => {
  assert.match(overviewRegion(), /이어진 장면/);
  assert.match(overviewRegion(), /마지막 순서의 기록/);
  assert.match(overviewRegion(), /이어진 순간 하나를 다시 열어/);
  assert.match(overviewRegion(), /이어진 순간 다시 보기/);
});

test("no API/backend/localStorage persistence was introduced for this derived sequence", () => {
  assert.doesNotMatch(surface, /localStorage|sessionStorage/);
  assert.doesNotMatch(overviewRegion(), /\/api\/|\bPOST\b|\bPUT\b|\bDELETE\b/);
});
