import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Source58 canonical Board explicitly enables product copy while Design Lab remains staging by default", async () => {
  const productRoute = await read("app/trees/[id]/board/page.tsx");
  const stagingRoute = await read("app/design-lab/source-tracks/58/v1-2-native/page.tsx");

  assert.match(productRoute, /<SourceTrack58LivingMemoryBoard[\s\S]*mode="product"/);
  assert.doesNotMatch(stagingRoute, /mode="product"/);
  assert.match(stagingRoute, /<SourceTrack58LivingMemoryBoard treeId=\{treeId\.trim\(\)\} \/>/);
});

test("Source58 shared component keeps staging authority evidence and adds a bounded product mode", async () => {
  const source = await read("components/source-track-58/SourceTrack58LivingMemoryBoard.tsx");

  assert.match(source, /mode\?: "staging" \| "product"/);
  assert.match(source, /mode = "staging"/);
  assert.match(source, /const productMode = mode === "product"/);
  assert.match(source, /data-source58-mode=\{mode\}/);

  // Design Lab/source-fidelity evidence must remain available in the shared component.
  assert.match(source, /SOURCE 58 · NATIVE STAGING/);
  assert.match(source, /MY TREE · OTHER VIEWS · MEMORY BOARD/);
  assert.match(source, /CANONICAL TRUTH/);
  assert.match(source, /Board position · theme · selection · cinema = VIEW_DERIVED/);
  assert.match(source, /새 DB \/ API \/ Auth \/ schema 없음/);
  assert.match(source, /STAGING ONLY · NOT LINEAGE 58/);

  // Canonical product copy is user-facing rather than implementation-facing.
  assert.match(source, /LOVETREE · LIVING MEMORY/);
  assert.match(source, /기억을 펼쳐보세요/);
  assert.match(source, /카드를 선택해 한 순간에 집중/);
  assert.match(source, /실로 이어진 기억의 흐름 확인/);
  assert.match(source, /테마를 바꾸거나 Cinema로 다시 보기/);
  assert.match(source, /이어진 이유가 아직 기록되지 않았습니다/);
  assert.match(source, /원본 미디어 열기 ↗/);

  // Existing QA identity hooks and interaction surfaces remain intact.
  assert.match(source, /data-source-track="58"/);
  assert.match(source, /data-testid="source58-board"/);
  assert.match(source, /data-mobile-spatial-board="true"/);
  assert.match(source, /data-source58-connection-panel/);
  assert.match(source, /data-cinema-active-id=\{moment\.id\}/);
});

test("Source58 product mode changes copy only, not canonical Moment selection/history wiring", async () => {
  const productRoute = await read("app/trees/[id]/board/page.tsx");
  const source = await read("components/source-track-58/SourceTrack58LivingMemoryBoard.tsx");

  assert.match(productRoute, /router\.replace\(/);
  assert.match(productRoute, /next\.set\("moment", nextMomentId\)/);
  assert.match(productRoute, /onMomentChange=\{syncMomentToUrl\}/);

  assert.match(source, /useTreeMoments\(treeId\)/);
  assert.match(source, /selectTreeMoment\(id\)/);
  assert.match(source, /updateMoment\(selected\.id, \{ title: draftTitle, memo: draftMemo \}\)/);
  assert.match(source, /source58BoardSlot\(index\)/);
  assert.match(source, /source58YouTubeEmbedUrl\(moment\.sourceUrl/);
});
