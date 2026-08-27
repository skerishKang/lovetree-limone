import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const viewSwitcher = readFileSync("app/components/ViewSwitcher.tsx", "utf8");
const boardRoute = readFileSync("app/trees/[id]/board/page.tsx", "utf8");
const source58Board = readFileSync("components/source-track-58/SourceTrack58LivingMemoryBoard.tsx", "utf8");
const entryResolver = readFileSync("app/components/v4/V4EntryResolver.tsx", "utf8");
const entryPolicy = readFileSync("lib/entry-resolver.ts", "utf8");

test("Source58 is adopted as a Tree-scoped board view, not a new top-level product", () => {
  assert.match(viewSwitcher, /kind: "board", label: "보드", path: "\/board"/);
  assert.match(boardRoute, /useParams<\{ id: string \| string\[\] \}>/);
  assert.match(boardRoute, /data-mvp-source="58"/);
  assert.match(boardRoute, /SourceTrack58LivingMemoryBoard/);
  assert.match(boardRoute, /treeId=\{treeId\}/);
  assert.doesNotMatch(boardRoute, /href=["'`]\/design-lab\/source-tracks\/58\/v1-2-native/);
});

test("existing tree + moment navigation protocol remains the only cross-view protocol", () => {
  assert.match(viewSwitcher, /\?moment=\$\{encodeURIComponent\(momentId\)\}/);
  assert.match(boardRoute, /const momentId = searchParams\.get\("moment"\)/);
  assert.match(boardRoute, /ViewSwitcher treeId=\{treeId\} active="board" momentId=\{momentId\}/);
  assert.match(boardRoute, /initialMomentId=\{momentId\}/);
  assert.match(boardRoute, /onMomentChange=\{syncMomentToUrl\}/);
  assert.match(boardRoute, /next\.set\("moment", nextMomentId\)/);
  assert.match(boardRoute, /router\.replace\(query \? `\$\{pathname\}\?\$\{query\}` : pathname, \{ scroll: false \}\)/);
  assert.doesNotMatch(boardRoute, /selectedMomentStore|globalMoment|localStorage|sessionStorage|indexedDB/);
});

test("shared ViewSwitcher remains a left-anchored non-shrinking horizontal scroller on narrow screens", () => {
  assert.match(viewSwitcher, /overflowX:\s*"auto"/);
  assert.match(viewSwitcher, /justifyContent:\s*"flex-start"/);
  assert.match(viewSwitcher, /flex:\s*"0 0 auto"/);
  assert.match(viewSwitcher, /whiteSpace:\s*"nowrap"/);
});

test("Source58 product binding stays optional and preserves the original canonical hook contract", () => {
  assert.match(source58Board, /initialMomentId\?: string \| null/);
  assert.match(source58Board, /onMomentChange\?: \(momentId: string \| null\) => void/);
  assert.match(source58Board, /useTreeMoments\(treeId\)/);
  assert.match(source58Board, /momentById\.has\(initialMomentId\)/);
  assert.match(source58Board, /selectTreeMoment\(initialMomentId\)/);
  assert.match(source58Board, /!selectedMomentId && !initialMomentId && moments\[0\]/);
  assert.match(source58Board, /onMomentChange\?\.\(id\)/);
  assert.doesNotMatch(source58Board, /useRouter|usePathname|useSearchParams/);
});

test("canonical entry resolver authority is preserved", () => {
  assert.match(entryResolver, /resolveEntryRoute/);
  assert.match(entryPolicy, /path: "\/v4\/journey"/);
  assert.match(entryPolicy, /path: "\/my-trees"/);
  assert.match(entryPolicy, /path: `\/trees\/\$\{encodeURIComponent\(id\)\}`/);
  assert.doesNotMatch(boardRoute, /V4EntryResolver|router\.replace\("\/v4\/journey"\)/);
});

test("Source58 adoption adds no backend or persistence authority", () => {
  assert.doesNotMatch(boardRoute, /\b(?:fetch|apiFetch)\s*\(|\b(?:prisma|drizzle|neon|supabase|firebase)\b/iu);
  assert.doesNotMatch(boardRoute, /\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/iu);
});
