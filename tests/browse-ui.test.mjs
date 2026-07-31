import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("hero browse CTA is an action button, not an anchor", () => {
  assert.match(page, /onClick={openBrowse}>러브트리 둘러보기/);
  assert.doesNotMatch(page, /href="#browse">러브트리 둘러보기/);
});

test("top navigation 둘러보기 opens the browse view", () => {
  assert.match(page, /onClick={openBrowse}>둘러보기/);
  assert.doesNotMatch(page, /href="#browse">둘러보기/);
});

test("no browse CTA relies on the #browse anchor", () => {
  assert.doesNotMatch(page, /href="#browse"/);
});

test("browse view exists and reads the public community endpoint", () => {
  assert.match(page, /view === "browse"/);
  assert.match(page, /\/api\/community\/trees\?view=summary&sort=/);
});

test("browse view supports latest/popular/views sorting", () => {
  assert.match(page, /\{ value: "latest", label: "최신순" \}/);
  assert.match(page, /\{ value: "popular", label: "인기순" \}/);
  assert.match(page, /\{ value: "views", label: "조회순" \}/);
});

test("browse view renders empty, error, and retry states", () => {
  assert.match(page, /browse-empty/);
  assert.match(page, /아직 공개된 러브트리가 없어요/);
  assert.match(page, /browseError/);
  assert.match(page, /다시 시도/);
  assert.match(page, /onClick={\(\) => void loadCommunityTrees\(browseSort\)}/);
});

test("browse view can return to the home screen", () => {
  assert.match(page, /처음 화면으로/);
  assert.match(page, /setView\("home"\)/);
});

test("first moment planting flow is preserved", () => {
  assert.match(page, /async function startTree/);
  assert.match(page, /async function plantMoment/);
  assert.match(page, /첫 순간 심기/);
});
