import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("app layout has proper LoveTree metadata", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /LoveTree/);
  assert.match(layout, /lang="ko"/);
  assert.match(layout, /globals\.css/);
  assert.match(layout, /flow\.css/);
});

test("app layout wires Firebase auth provider", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /AuthProvider/);
  assert.match(layout, /@\/lib\/auth/);
});

test("app home page renders without errors", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /"use client"/);
  assert.match(page, /LoveTree/);
});

test("app home page wires real auth flow and guards mutations", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /useAuth\(\)/);
  assert.match(page, /login\(\)/);
  assert.match(page, /logout/);
  assert.match(page, /apiFetch\(/);
  assert.match(page, /clientKey/);
  assert.match(page, /sourceType/);
  assert.match(page, /disabled=\{saving\}/);
});

test("Escape key only closes the open modal, not the whole screen", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /if \(event\.key === "Escape"\)/);
  assert.doesNotMatch(page, /setView\("home"\);\s*$/m);
  assert.match(page, /setIsStartOpen\(false\)/);
});

test("API failures surface in the UI", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /setTreeError/);
  assert.match(page, /setPlantError/);
  assert.match(page, /role="alert"/);
});

test("lib api helper sends Bearer token", async () => {
  const api = await readFile(new URL("../lib/api.ts", import.meta.url), "utf8");
  assert.match(api, /getIdToken/);
  assert.match(api, /Bearer/);
});

test("db schema uses PostgreSQL (pgTable)", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  assert.match(schema, /pgTable/);
  assert.match(schema, /drizzle-orm\/pg-core/);
  assert.match(schema, /jsonb/);
  assert.match(schema, /trees/);
  assert.match(schema, /memories/);
  assert.match(schema, /reactions/);
  assert.match(schema, /comments/);
  assert.match(schema, /treeComments/);
  assert.match(schema, /treeLikes/);
  assert.match(schema, /treeSocialCounts/);
  assert.match(schema, /socialIdempotency/);
});

test("db schema enforces foreign keys and unique constraints", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  assert.match(schema, /references\(\(\) => trees\.id/);
  assert.match(schema, /onDelete: "cascade"/);
  assert.match(schema, /reactions_memory_owner_type_uniq/);
  assert.match(schema, /tree_likes_tree_owner_uniq/);
  assert.match(schema, /trees_owner_client_key_uniq/);
  assert.match(schema, /memories_tree_client_key_uniq/);
});

test("db connection uses Neon HTTP driver", async () => {
  const dbIndex = await readFile(new URL("../db/index.ts", import.meta.url), "utf8");
  assert.match(dbIndex, /@neondatabase\/serverless/);
  assert.match(dbIndex, /drizzle-orm\/neon-http/);
  assert.match(dbIndex, /DATABASE_URL/);
});

test("api routes are properly structured", async () => {
  const handler = await readFile(new URL("../server/api/handler.ts", import.meta.url), "utf8");
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

test("no LoveBud static pages remain in public", async () => {
  await assert.rejects(
    readFile(new URL("../public/pages/login.html", import.meta.url), "utf8"),
    /ENOENT/
  );
});
