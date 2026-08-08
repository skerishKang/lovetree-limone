import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V4 landing sends first-moment creation to the real product-spine route", async () => {
  const landing = await read("app/components/v4/V4Landing.tsx");
  assert.match(landing, /router\.push\(`\/v4\/trees\/new\?name=/);
  assert.doesNotMatch(landing, /lovetree-v4-discovery/);
  assert.doesNotMatch(landing, /lovetree-v4-tree-name/);
});

test("V4 new-tree route uses the real product-spine component and shared auth styling", async () => {
  const route = await read("app/v4/trees/new/page.tsx");
  assert.match(route, /V4ProductSpineStart/);
  assert.match(route, /email-auth\.css/);
});

test("V4 P0 creates Tree + first Memory through the existing authenticated API", async () => {
  const source = await read("app/components/v4/V4ProductSpineStart.tsx");
  assert.match(source, /useAuth/);
  assert.match(source, /apiFetch\("\/api\/trees\/with-first-memory"/);
  assert.match(source, /sourceUrl:\s*url\.trim\(\)/);
  assert.match(source, /sourceType:\s*"youtube"/);
  assert.match(source, /emotionTags:\s*\[emotion\]/);
  assert.match(source, /timestamp:\s*timestamp\.trim\(\)/);
  assert.match(source, /visibility:\s*"public"/);
});

test("V4 P0 rehydrates persisted Tree/Memory from server APIs", async () => {
  const source = await read("app/components/v4/V4ProductSpineStart.tsx");
  assert.match(source, /apiFetch\(`\/api\/trees\/\$\{encodeURIComponent\(treeId\)\}`\)/);
  assert.match(source, /apiFetch\(`\/api\/trees\/\$\{encodeURIComponent\(treeId\)\}\/memories\?limit=100`\)/);
  assert.match(source, /apiFetch\("\/api\/trees\?limit=100"\)/);
  assert.match(source, /localStorage\.setItem\(LAST_TREE_KEY, data\.tree\.id\)/);
  assert.match(source, /applyServerData\(data\.tree, data\.memory\)/);
});

test("V4 P0 does not pretend discovery date is the video timestamp", async () => {
  const source = await read("app/components/v4/V4ProductSpineStart.tsx");
  assert.match(source, /P1 persisted-date contract pending/);
  assert.doesNotMatch(source, /timestamp:\s*discoveryDate/);
});
