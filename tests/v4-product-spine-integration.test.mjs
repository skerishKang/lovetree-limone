import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V4 landing preserves the source-faithful first-discovery journey", async () => {
  const landing = await read("app/components/v4/V4Landing.tsx");
  assert.match(landing, /useState<"home" \| "discovery">\("home"\)/);
  assert.match(landing, /setView\("discovery"\)/);
  assert.match(landing, /id="v4-content-url"/);
  assert.match(landing, /id="v4-discovery-note"/);
  assert.match(landing, /id="v4-discovery-date"/);
  assert.match(landing, /YOUR FIRST ROOT/);
  assert.match(landing, /이 순간 심기 →/);
  assert.match(landing, /처음 화면/);
  assert.doesNotMatch(landing, /lovetree-v4-discovery/);
});

test("V4 discovery creates Tree + first Memory through the existing authenticated API", async () => {
  const [landing, seam] = await Promise.all([
    read("app/components/v4/V4Landing.tsx"),
    read("lib/first-tree-create-client.ts"),
  ]);
  assert.match(landing, /useAuth\(\)/);
  assert.match(landing, /<EmailAuthForm/);
  assert.match(landing, /createFirstTree\(/);
  assert.match(landing, /fetchFn:\s*apiFetch/);
  assert.match(seam, /FIRST_CREATE_ENDPOINT = "\/api\/trees\/with-first-memory"/);
  assert.match(seam, /fetchFn = options\.fetchFn \?\? apiFetch/);
  assert.doesNotMatch(landing, /apiFetch\("\/api\/trees\/with-first-memory"/, "direct canonical POST is owned by the seam");
  assert.match(landing, /sourceUrl:\s*url\.trim\(\)/);
  assert.match(landing, /sourceType:\s*"youtube"/);
  assert.match(landing, /thumbnail,/);
  assert.match(landing, /emotionTags:\s*\[\]/);
  assert.match(landing, /timestamp:\s*date/);
  assert.match(landing, /visibility:\s*"public"/);
});

test("current Memory.timestamp contract remains a validated YYYY-MM-DD date", async () => {
  const [landing, validate, treesApi, memoryContract] = await Promise.all([
    read("app/components/v4/V4Landing.tsx"),
    read("core/runtime/server/api/validate.ts"),
    read("core/runtime/server/api/trees.ts"),
    read("core/runtime/server/api/memory-contract.ts"),
  ]);

  assert.match(validate, /export function isValidTimestamp/);
  assert.match(validate, /isValidTimestamp\(trimmed\)/);
  assert.match(validate, /must be a valid YYYY-MM-DD date/);
  assert.match(validate, /date\.getFullYear\(\) === year/);
  assert.match(memoryContract, /validateTimestamp\(body\.timestamp, timestampField\)/);
  assert.match(memoryContract, /validateTimestamp\(body\.discoveryDate, discoveryField\)/);
  assert.match(treesApi, /validateMemoryDateCompatibility\(memory, "memory\."\)/);
  assert.match(landing, /timestamp:\s*date/);
  assert.doesNotMatch(landing, /timestamp:\s*videoTime/);
});

test("successful V4 creation enters the existing server-backed Tree view", async () => {
  const [landing, treePage, treeHook] = await Promise.all([
    read("app/components/v4/V4Landing.tsx"),
    read("app/trees/[id]/page.tsx"),
    read("lib/use-tree-moments.ts"),
  ]);

  assert.match(landing, /router\.push\(`\/trees\/\$\{encodeURIComponent\(treeId\)\}\?highlight=\$\{encodeURIComponent\(memoryId\)\}`\)/);
  assert.match(treePage, /useTreeMoments\(treeId/);
  assert.match(treeHook, /apiFetch\(`\/api\/trees\/\$\{encodeURIComponent\(treeId\)\}`\)/);
  assert.match(treeHook, /apiFetch\(`\/api\/trees\/\$\{encodeURIComponent\(treeId\)\}\/memories`\)/);
});

test("localStorage is only a retry/pointer aid, never authoritative first-moment content", async () => {
  const [landing, seam] = await Promise.all([
    read("app/components/v4/V4Landing.tsx"),
    read("lib/first-tree-create-client.ts"),
  ]);
  assert.match(landing, /lovetree-v4-product-spine-last-tree-id/);
  assert.match(landing, /localStorage\.setItem\(LAST_TREE_KEY, treeId\)/);
  assert.doesNotMatch(landing, /lovetree-v4-product-spine-create-client-key/, "pending-key literal is owned by the seam");
  assert.doesNotMatch(landing, /localStorage\.removeItem\(CLIENT_KEY\)/, "pending-key clear is owned by the seam");
  assert.doesNotMatch(landing, /localStorage\.setItem\([^,]+,\s*JSON\.stringify/);
  assert.match(seam, /PENDING_CLIENT_KEY = "lovetree-v4-product-spine-create-client-key"/);
  assert.match(seam, /removeItem\(PENDING_CLIENT_KEY\)/);
});

test("V4 landing loads the shared email-auth styling", async () => {
  const route = await read("app/v4/page.tsx");
  assert.match(route, /email-auth\.css/);
});
