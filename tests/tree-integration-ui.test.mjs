import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const myTrees = readFileSync(new URL("../app/my-trees/page.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../app/trees/[id]/page.tsx", import.meta.url), "utf8");

test("real tree routes exist and use the App Router shape", () => {
  assert.equal(existsSync(new URL("../app/my-trees/page.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../app/trees/[id]/page.tsx", import.meta.url)), true);
  assert.match(myTrees, /\/api\/trees\?limit=/);
  assert.match(detail, /\/api\/trees\/\$\{encodeURIComponent\(treeId\)\}/);
  assert.match(detail, /\/api\/trees\/\$\{encodeURIComponent\(treeId\)\}\/memories/);
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
  assert.match(detail, /method: editingId \? "PUT" : "POST"/);
  assert.match(detail, /clientKey/);
  assert.match(detail, /setMemories\(\(current\) => editingId/);
  assert.match(detail, /DELETE/);
  assert.match(detail, /const isOwner = Boolean/);
  assert.match(detail, /isOwner \? \(/);
  assert.match(detail, /parentId/);
});

test("first moment stores the selected local date and redirects to the real tree", () => {
  assert.match(home, /timestamp: momentDate/);
  assert.match(home, /value={momentDate}/);
  assert.match(home, /router\.push\(`\/trees\/\$\{currentTreeId\}`\)/);
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
