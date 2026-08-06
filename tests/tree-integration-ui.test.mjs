import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const myTrees = readFileSync(new URL("../app/my-trees/page.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../app/trees/[id]/page.tsx", import.meta.url), "utf8");
const timeline = readFileSync(new URL("../app/trees/[id]/timeline/page.tsx", import.meta.url), "utf8");
const album = readFileSync(new URL("../app/trees/[id]/album/page.tsx", import.meta.url), "utf8");
const hook = readFileSync(new URL("../lib/use-tree-moments.ts", import.meta.url), "utf8");
const composer = readFileSync(new URL("../app/components/MomentComposerModal.tsx", import.meta.url), "utf8");

test("real tree routes exist and use the App Router shape", () => {
  assert.equal(existsSync(new URL("../app/my-trees/page.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../app/trees/[id]/page.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../app/trees/[id]/timeline/page.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../app/trees/[id]/album/page.tsx", import.meta.url)), true);
  assert.match(myTrees, /\/api\/trees\?limit=/);
  // Tree + memories fetching lives in the shared hook every view consumes.
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
  // Mutation payloads, idempotency keys, and owner gating live in the
  // shared hook; the composer submits the parent relationship.
  assert.match(hook, /method: "POST"/);
  assert.match(hook, /method: "PUT"/);
  assert.match(hook, /method: "DELETE"/);
  assert.match(hook, /\/api\/memories\/\$\{encodeURIComponent\(id\)\}/);
  assert.match(hook, /clientKey/);
  assert.match(hook, /const isOwner = Boolean/);
  assert.match(hook, /parentId/);
  assert.match(composer, /parentId/);
  assert.match(composer, /clientKey/);
  // Every tree view wires owner-gated create/update/delete from the hook.
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
  // Home redirects to the new tree with the created moment selected and
  // highlighted in the URL.
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
});
