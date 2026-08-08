import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V4 landing sends first-moment creation to the real product-spine route", async () => {
  const landing = await read("app/components/v4/V4Landing.tsx");
  assert.match(landing, /router\.push\(`\/v4\/trees\/new\?name=/);
  assert.doesNotMatch(landing, /lovetree-v4-discovery/);
  assert.doesNotMatch(landing, /localStorage\.setItem/);
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
  assert.match(source, /const timedSourceUrl = youtubeUrlAtTime\(url, videoTime\)/);
  assert.match(source, /sourceUrl:\s*timedSourceUrl/);
  assert.match(source, /sourceType:\s*"youtube"/);
  assert.match(source, /emotionTags:\s*\[emotion\]/);
  assert.match(source, /timestamp:\s*discoveryDate/);
  assert.match(source, /visibility:\s*"public"/);
});

test("current Memory.timestamp contract remains YYYY-MM-DD while video point is preserved in YouTube sourceUrl", async () => {
  const [source, validate, treesApi] = await Promise.all([
    read("app/components/v4/V4ProductSpineStart.tsx"),
    read("server/api/validate.ts"),
    read("server/api/trees.ts"),
  ]);

  assert.ok(validate.includes("export const DATE_YMD_RE = /^\\d{4}-\\d{2}-\\d{2}$/;"));
  assert.ok(validate.includes("DATE_YMD_RE.test(timestamp)"));
  assert.match(treesApi, /validateTimestamp\(memory\.timestamp, "memory\.timestamp"\)/);
  assert.match(source, /parsed\.searchParams\.set\("t", `\$\{seconds\}s`\)/);
  assert.match(source, /youtubeTimeFromUrl\(memory\.sourceUrl\)/);
  assert.doesNotMatch(source, /timestamp:\s*videoTime/);
});

test("V4 P0 rehydrates persisted Tree/Memory from server APIs", async () => {
  const source = await read("app/components/v4/V4ProductSpineStart.tsx");
  assert.match(source, /apiFetch\(`\/api\/trees\/\$\{encodeURIComponent\(treeId\)\}`\)/);
  assert.match(source, /apiFetch\(`\/api\/trees\/\$\{encodeURIComponent\(treeId\)\}\/memories\?limit=100`\)/);
  assert.match(source, /apiFetch\("\/api\/trees\?limit=100"\)/);
  assert.match(source, /localStorage\.setItem\(LAST_TREE_KEY, data\.tree\.id\)/);
  assert.match(source, /applyServerData\(data\.tree, data\.memory\)/);
  assert.match(source, /setDiscoveryDate\(dateFromServer\(memory\.timestamp \|\| memory\.createdAt\)\)/);
});

test("localStorage is only a pointer/idempotency aid, not the first-moment product payload", async () => {
  const source = await read("app/components/v4/V4ProductSpineStart.tsx");
  assert.match(source, /lovetree-v4-product-spine-last-tree-id/);
  assert.match(source, /lovetree-v4-product-spine-create-client-key/);
  assert.doesNotMatch(source, /localStorage\.setItem\([^,]+,\s*JSON\.stringify/);
});
