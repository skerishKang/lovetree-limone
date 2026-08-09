import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const discoveryPath = new URL("../app/components/v4/V4CommunityDiscovery.tsx", import.meta.url);
const dynamicRoutePath = new URL("../app/v4/community/trees/[id]/page.tsx", import.meta.url);
const demoRoutePath = new URL("../app/v4/community/trees/demo/page.tsx", import.meta.url);

async function source(url) {
  return readFile(url, "utf8");
}

test("Global Discovery reads browse-eligible trees and public Moments from live APIs", async () => {
  const text = await source(discoveryPath);

  assert.match(text, /apiFetch\("\/api\/community\/trees\?view=summary&sort=latest&limit=24"\)/);
  assert.match(text, /apiFetch\(`\/api\/community\/memories\?treeId=\$\{encodeURIComponent\(tree\.id\)\}&limit=200`\)/);
  assert.doesNotMatch(text, /const TREES\s*=/);
  assert.doesNotMatch(text, /const PUBLIC_NODES\s*=/);
  assert.doesNotMatch(text, /\/v4\/community\/trees\/demo/);
  assert.doesNotMatch(text, /dQw4w9WgXcQ|ysz5S6PUM-U|aqz-KE-bpKQ/);
});

test("public tree route is dynamic and uses only the Community Moment endpoint for nodes", async () => {
  const text = await source(discoveryPath);
  const route = await source(dynamicRoutePath);

  assert.match(route, /params:\s*Promise<\{ id: string \}>/);
  assert.match(route, /<V4PublicTree treeId=\{id\} \/>/);
  assert.match(text, /apiFetch\(`\/api\/community\/memories\?treeId=\$\{encodeURIComponent\(treeId\)\}&limit=200`\)/);
  assert.match(text, /visibleIds\.has\(memory\.parentId\)/);
  assert.match(text, /if \(!parent\) return \[\]/);
});

test("legacy demo route no longer renders fixture data", async () => {
  const text = await source(demoRoutePath);
  assert.match(text, /redirect\("\/v4\/community"\)/);
  assert.doesNotMatch(text, /V4PublicTree/);
});
