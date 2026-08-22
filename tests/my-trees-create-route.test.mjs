import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const myTreesPage = readFileSync(new URL("../app/my-trees/page.tsx", import.meta.url), "utf8");
const v4Page = readFileSync(new URL("../app/v4/page.tsx", import.meta.url), "utf8");

test("My Trees create CTAs target the actual V4 first-moment entry", () => {
  const matches = myTreesPage.match(/href="\/v4\?start=1"/g) ?? [];
  assert.equal(matches.length, 2);
  assert.doesNotMatch(myTreesPage, /href="\/\?start=tree"/);
});

test("My Trees browse navigation targets canonical V4 community discovery", () => {
  assert.match(myTreesPage, /href="\/v4\/community">둘러보기/);
  assert.doesNotMatch(myTreesPage, /href="\/\?view=browse"/);
});

test("V4 entry still consumes start=1 and opens the first-moment action", () => {
  assert.match(v4Page, /start !== "1"/);
  assert.match(v4Page, /textContent\?\.includes\("첫 순간 심기"\)/);
});
