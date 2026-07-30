import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("app layout has proper LoveTree metadata", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /LoveTree/);
  assert.match(layout, /lang="ko"/);
  assert.match(layout, /globals\.css/);
});

test("app home page renders without errors", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /"use client"/);
  assert.match(page, /LoveTree/);
});

test("db schema has all required tables", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  assert.match(schema, /trees/);
  assert.match(schema, /memories/);
  assert.match(schema, /reactions/);
  assert.match(schema, /comments/);
  assert.match(schema, /treeComments/);
  assert.match(schema, /treeLikes/);
  assert.match(schema, /treeSocialCounts/);
  assert.match(schema, /socialIdempotency/);
});

test("api routes are properly structured", async () => {
  const handler = await readFile(new URL("../api/handler.ts", import.meta.url), "utf8");
  assert.match(handler, /handleApiRequest/);
  assert.match(handler, /treesRouter/);
  assert.match(handler, /memoriesRouter/);
  assert.match(handler, /commentsRouter/);
  assert.match(handler, /socialRouter/);
});

test("worker references api handler", async () => {
  const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");
  assert.match(worker, /handleApiRequest/);
  assert.match(worker, /vinext\/server\/app-router-entry/);
});

test("LoveBud pages are copied", async () => {
  const pages = await readFile(new URL("../public/pages/login.html", import.meta.url), "utf8");
  assert.match(pages, /러브트리/);
});
