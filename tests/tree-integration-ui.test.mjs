import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

const home = readFileSync(new URL("../app/legacy/page.tsx", import.meta.url), "utf8");
const myTrees = readFileSync(new URL("../app/my-trees/page.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../app/trees/[id]/page.tsx", import.meta.url), "utf8");
const timeline = readFileSync(new URL("../app/trees/[id]/timeline/page.tsx", import.meta.url), "utf8");
const album = readFileSync(new URL("../app/trees/[id]/album/page.tsx", import.meta.url), "utf8");
const hook = readFileSync(new URL("../lib/use-tree-moments.ts", import.meta.url), "utf8");
const composer = readFileSync(new URL("../app/components/MomentComposerModal.tsx", import.meta.url), "utf8");
const finalTreeSurface = readFileSync(new URL("../app/components/v4/product/V4FinalTreeSurface.tsx", import.meta.url), "utf8");

test("real tree routes exist and use the App Router shape", () => {
  assert.equal(existsSync(new URL("../app/my-trees/page.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../app/trees/[id]/page.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../app/trees/[id]/timeline/page.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../app/trees/[id]/album/page.tsx", import.meta.url)), true);
  assert.match(myTrees, /\/api\/trees\?limit=/);
  assert.match(hook, /\/api\/trees\/\$\{encodeURIComponent\(treeId\)\}/);
  assert.match(hook, /\/api\/trees\/\$\{encodeURIComponent\(treeId\)\}\/memories/);
  for (const page of [detail, timeline, album]) {
    assert.match(page, /useTreeMoments/);
    assert.match(page, /useMomentUrlState/);
  }
});

test("my-trees has authenticated loading, empty, error, retry, and keyboard-accessible cards", () => {
  assert.match(myTrees, /로그인 상태를 확인하고 있어요/);
  assert.match(myTrees, /아직 심은 러브트리가 없어요/);
  assert.match(myTrees, /다시 시도/);
  assert.match(myTrees, /role="alert"/);
  assert.match(myTrees, /href={`\/trees\/\$\{tree\.id\}`}/);
  assert.match(myTrees, /<Link className={`owned-tree-card/);
});

test("tree detail loads real records and exposes owner-only memory mutation controls", () => {
  assert.match(hook, /method: "POST"/);
  assert.match(hook, /method: "PUT"/);
  assert.match(hook, /method: "DELETE"/);
  assert.match(hook, /\/api\/memories\/\$\{encodeURIComponent\(id\)\}/);
  assert.match(hook, /clientKey/);
  assert.match(hook, /const isOwner = Boolean/);
  assert.match(hook, /parentId/);
  assert.match(composer, /parentId/);
  assert.match(composer, /clientKey/);
  for (const page of [detail, timeline, album]) {
    assert.match(page, /isOwner/);
    assert.match(page, /createMoment/);
    assert.match(page, /updateMoment/);
    assert.match(page, /deleteMoment/);
  }
});

test("first moment stores the selected local date and redirects to the real tree", () => {
  assert.match(home, /timestamp: momentDate/);
  assert.match(home, /value={momentDate}/);
  assert.match(home, /router\.push\(`\/trees\/\$\{currentTreeId\}\?moment=\$\{data\.id\}&highlight=\$\{data\.id\}`\)/);
});

test("browse and authenticated navigation use real tree links", () => {
  assert.match(home, /<Link className={`tree-card/);
  assert.match(home, /href={`\/trees\/\$\{tree\.id\}`}/);
  assert.match(home, /href="\/my-trees"/);
  assert.match(myTrees, /GET|\/api\/trees/);
});

test("integrated screens do not use the design mocks or localStorage", () => {
  assert.doesNotMatch(myTrees, /localStorage|SAMPLE|example/i);
  assert.doesNotMatch(detail, /localStorage|SAMPLE/);
  assert.doesNotMatch(timeline, /localStorage|SAMPLE|fixture|design mock/i);
});

test("timeline keeps the canonical real-data source and owner mutation behavior", () => {
  assert.match(timeline, /useTreeMoments\(treeId/);
  assert.match(timeline, /timelineMoments/);
  assert.match(timeline, /moments\.find\(\(m\) => m\.id === moment\.id\)/);
  assert.match(timeline, /isOwner/);
  assert.match(timeline, /createMoment/);
  assert.match(timeline, /updateMoment/);
  assert.match(timeline, /deleteMoment/);
});

test("timeline surfaces canonical WHY NEXT only for connected moments", () => {
  // connected Moment detection follows canonical parentId semantics
  assert.match(timeline, /memory\.parentId \? \(/);
  // the relation block (label + reason + fallback) lives inside the parentId gate
  assert.match(timeline, /memory\.parentId \? \([\s\S]*?이전 순간에서 이어짐[\s\S]*?\) : null/);
  // canonical connectionReason is consumed from the persisted memory record
  assert.match(timeline, /memory\.connectionReason && memory\.connectionReason\.trim\(\)/);
  assert.match(timeline, /<p className="moment-detail-parent-title">\{memory\.connectionReason\}<\/p>/);
  // root / first Moment (no parentId) is never forced into a WHY NEXT relation
  assert.equal((timeline.match(/이전 순간과 이어지는 관계/g) ?? []).length, 1);
  assert.match(timeline, /이전 순간과 이어지는 관계/);
});

test("graph inspector keeps the canonical real-data surface and surfaces WHY NEXT only for connected moments", () => {
  // Graph is a canonical real-data surface over useTreeMoments — no fixture/localStorage product truth
  assert.match(finalTreeSurface, /function GraphSurface\(\{ moments \}: \{ moments: MemoryRecord\[\] \}\)/);
  assert.match(finalTreeSurface, /useTreeMoments\(treeId\)/);
  assert.doesNotMatch(finalTreeSurface, /localStorage|SAMPLE|fixture/i);
  // V4FinalTreeSurface feeds the canonical moments collection to the graph — no new API lookup in the graph path
  assert.match(finalTreeSurface, /\(mode === "graph" \? <GraphSurface moments=\{moments\} \/> : null\)|\{mode === "graph" \? <GraphSurface moments=\{moments\} \/> : null\}/);
  // a selected connected Moment resolves its actual parent from the same canonical moments collection
  assert.match(finalTreeSurface, /chosenParent = chosen\?\.parentId \? \(moments\.find\(\(memory\) => memory\.id === chosen\.parentId\)/);
  // canonical connectionReason is consumed as the actual WHY NEXT when present
  assert.match(finalTreeSurface, /chosen\.connectionReason\?\.trim\(\) \? chosen\.connectionReason/);
  // missing stored reason keeps the truthful generic fallback (exactly once), never presented as a stored reason
  assert.equal((finalTreeSurface.match(/이전 순간과 이어지는 관계/g) ?? []).length, 1);
  // root Moment (no parentId) keeps the root vocabulary and never renders a WHY NEXT row
  assert.match(finalTreeSurface, /<dt>Parent<\/dt><dd>\{chosenParent \? memoryTitle\(chosenParent\) : chosen\.parentId \? "connected" : "root"\}<\/dd>/);
  assert.match(finalTreeSurface, /\(chosen\.parentId \? <div><dt>WHY NEXT<\/dt>|\{chosen\.parentId \? <div><dt>WHY NEXT<\/dt>/);
  // no new API/schema/persistence introduced by the graph path
  assert.doesNotMatch(finalTreeSurface, /apiFetch\(`\/api\/trees/);
});
