import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Five-Source primary navigation is semantic and legacy routes are not primary", async () => {
  const source = await read("app/components/ViewSwitcher.tsx");

  const primary = source.slice(source.indexOf("const PRIMARY_VIEWS"), source.indexOf("const PORTAL_VIEW"));
  assert.match(primary, /kind: "tree", label: "기억"/);
  assert.match(primary, /kind: "board", label: "보드"/);
  assert.match(primary, /kind: "relationships", label: "관계"/);
  assert.match(primary, /kind: "explore", label: "탐색"/);
  assert.doesNotMatch(primary, /kind: "portal"/);
  assert.doesNotMatch(primary, /kind: "album"/);
  assert.doesNotMatch(primary, /kind: "graph"/);
  assert.doesNotMatch(primary, /kind: "replay"/);

  assert.match(source, /data-view-tier="primary"/);
  assert.match(source, /data-view-tier="return"/);
  assert.match(source, /data-view-tier="secondary"/);
  assert.match(source, /label: "한눈에"/);
  assert.match(source, /label: "타임라인"/);
  assert.match(source, /label: "공개 스토리"/);
  assert.match(source, /label: "Memory Film Studio"/);
});

test("Moment detail exposes semantic cross-view CTAs that preserve selected Moment", async () => {
  const source = await read("app/components/MomentDetailModal.tsx");

  assert.match(source, /data-semantic-moment-actions="memory"/);
  assert.match(source, /보드에서 보기/);
  assert.match(source, /왜 이어졌는지 보기/);
  assert.match(source, /기억 세계에서 탐색/);
  assert.match(source, /\/board\$\{crossViewSuffix\}/);
  assert.match(source, /\/relationships\$\{crossViewSuffix\}/);
  assert.match(source, /\/explore\$\{crossViewSuffix\}/);
  assert.match(source, /data-semantic-view-transition="push"/);
});

test("Board, Relationships and Explore expose Moment-aware cross-view actions", async () => {
  const source = await read("app/components/MomentContextActions.tsx");
  const layout = await read("app/trees/[id]/layout.tsx");

  assert.match(source, /board:/);
  assert.match(source, /relationships:/);
  assert.match(source, /explore:/);
  assert.match(source, /Moment 열기/);
  assert.match(source, /관계 보기/);
  assert.match(source, /공간에서 보기/);
  assert.match(source, /보드에서 보기/);
  assert.match(source, /관계 자세히 보기/);
  assert.match(source, /\?moment=\$\{encodeURIComponent\(momentId\)\}/);
  assert.match(source, /data-semantic-view-transition="push"/);
  assert.match(layout, /<MomentContextActions \/>/);
});

test("in-view Moment selection stays replace-history on Five-Source presentation views", async () => {
  const files = await Promise.all([
    read("app/trees/[id]/board/page.tsx"),
    read("app/trees/[id]/relationships/page.tsx"),
    read("app/trees/[id]/explore/page.tsx"),
    read("app/trees/[id]/portal/page.tsx"),
  ]);

  for (const source of files) {
    assert.match(source, /router\.replace\(/);
    assert.match(source, /next\.set\("moment", nextMomentId\)/);
  }
});
