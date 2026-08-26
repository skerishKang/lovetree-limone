import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const viewSwitcher = readFileSync("app/components/ViewSwitcher.tsx", "utf8");
const boardRoute = readFileSync("app/trees/[id]/board/page.tsx", "utf8");
const entryResolver = readFileSync("app/components/v4/V4EntryResolver.tsx", "utf8");

test("Source58 is adopted as a Tree-scoped board view, not a new top-level product", () => {
  assert.match(viewSwitcher, /kind: "board", label: "보드", path: "\/board"/);
  assert.match(boardRoute, /useParams<\{ id: string \| string\[\] \}>/);
  assert.match(boardRoute, /SourceTrack58LivingMemoryBoard treeId=\{treeId\}/);
  assert.match(boardRoute, /data-mvp-source="58"/);
  assert.doesNotMatch(boardRoute, /\/design-lab\/source-tracks\/58\/v1-2-native["'`]/);
});

test("existing tree + moment navigation protocol remains the only cross-view protocol", () => {
  assert.match(viewSwitcher, /\?moment=\$\{encodeURIComponent\(momentId\)\}/);
  assert.match(boardRoute, /const momentId = searchParams\.get\("moment"\)/);
  assert.match(boardRoute, /ViewSwitcher treeId=\{treeId\} active="board" momentId=\{momentId\}/);
  assert.doesNotMatch(boardRoute, /selectedMomentStore|globalMoment|localStorage|sessionStorage|indexedDB/);
});

test("canonical entry resolver authority is preserved", () => {
  assert.match(entryResolver, /\/v4\/journey/);
  assert.match(entryResolver, /\/my-trees/);
  assert.match(entryResolver, /\/trees\//);
  assert.doesNotMatch(boardRoute, /V4EntryResolver|router\.replace\("\/v4\/journey"\)/);
});

test("Source58 adoption adds no backend or persistence authority", () => {
  assert.doesNotMatch(boardRoute, /fetch\(|apiFetch\(|prisma|drizzle|neon|supabase|firebase/iu);
  assert.doesNotMatch(boardRoute, /POST|PUT|DELETE/);
});
