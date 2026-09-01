// Moment parent-cycle integrity verification (real PostgreSQL 16).
//
// Executed by the dedicated Issue #509 CI gate against a disposable database.
// Exercises the canonical PUT /api/memories/:id write boundary, including the
// concurrent two-writer race that a non-atomic check-then-write guard misses.
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { readFile } from "node:fs/promises";
import { createSign, generateKeyPairSync, createPublicKey } from "node:crypto";
import * as schema from "../../core/runtime/db/schema.ts";
import { memoriesRouter } from "../../core/runtime/server/api/memories.ts";
import { treesRouter } from "../../core/runtime/server/api/trees.ts";

const DB_CONN = process.env.DATABASE_URL;
if (!DB_CONN) {
  console.error("DATABASE_URL is required for the Moment parent-cycle integration gate.");
  process.exit(2);
}

const PROJECT_ID = "relovetree";
const pool = new Pool({ connectionString: DB_CONN, max: 12 });
const db = drizzle(pool, { schema });
const strip = (source) => source.replace(/--> statement-breakpoint/g, "");
const file = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicExponent: 0x10001,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const publicJwk = createPublicKey(publicKey).export({ format: "jwk" });
const KEY_ID = "moment-parent-cycle-key";
const AUTH_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const b64u = (input) => Buffer.from(input).toString("base64url");
function token(uid) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: "RS256", kid: KEY_ID }));
  const payload = b64u(
    JSON.stringify({
      aud: PROJECT_ID,
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
      sub: uid,
      iat: now - 60,
      auth_time: now - 120,
      exp: now + 3600,
    })
  );
  const data = `${header}.${payload}`;
  return `${data}.${b64u(createSign("RSA-SHA256").update(data).sign(privateKey))}`;
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (String(input) === AUTH_URL) {
    return new Response(
      JSON.stringify({
        keys: [
          {
            kty: "RSA",
            kid: KEY_ID,
            use: "sig",
            alg: "RS256",
            n: publicJwk.n,
            e: publicJwk.e,
          },
        ],
      }),
      { status: 200, headers: { "cache-control": "max-age=3600" } }
    );
  }
  return originalFetch(input, init);
};

function apiContext({ method, path, body, uid = "user-a" }) {
  const url = new URL(`https://example.com${path}`);
  const request = new Request(url, {
    method,
    headers: {
      authorization: `Bearer ${token(uid)}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    request,
    env: { DATABASE_URL: "unused", FIREBASE_PROJECT_ID: PROJECT_ID },
    db,
    url,
    method,
    path,
    params: {},
  };
}

async function call(options, router = memoriesRouter) {
  try {
    const response = await router(apiContext(options));
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json().catch(() => null),
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: String(error?.message || error).slice(0, 300) },
    };
  }
}

const results = [];
function record(label, got, expected) {
  const pass = got === expected;
  results.push({ label, got, expected, pass });
  console.log(
    `[MOMENT-PARENT] ${label}: got=${JSON.stringify(got)} expected=${JSON.stringify(expected)} ${pass ? "PASS" : "FAIL"}`
  );
}
function bodyIncludes(response, fragment) {
  return JSON.stringify(response?.body ?? {}).includes(fragment);
}
async function parentOf(id) {
  const result = await pool.query("select parent_id from memories where id=$1", [id]);
  return result.rows[0]?.parent_id ?? null;
}

async function setupSchema() {
  await pool.query("DROP SCHEMA public CASCADE");
  await pool.query("CREATE SCHEMA public");
  await pool.query(strip(await file("core/runtime/drizzle/0000_flippant_warlock.sql")));
  await pool.query(strip(await file("core/runtime/drizzle/0001_perpetual_deathbird.sql")));
  await pool.query(strip(await file("core/runtime/drizzle/0002_fixed_scarlet_spider.sql")));
  await pool.query(strip(await file("core/runtime/drizzle/0003_peaceful_radioactive_man.sql")));
}

async function seed() {
  await pool.query(
    `insert into trees
      (id, owner_id, title, memo, artist, visibility, keywords, created_at, updated_at)
     values
      ('tree-a','user-a','Tree A','','','private','[]',now(),now()),
      ('tree-b','user-a','Tree B','','','private','[]',now(),now())`
  );
  for (const [id, treeId] of [
    ["a", "tree-a"],
    ["b", "tree-a"],
    ["c", "tree-a"],
    ["d", "tree-a"],
    ["race-a", "tree-a"],
    ["race-b", "tree-a"],
    ["cross", "tree-b"],
  ]) {
    await pool.query(
      "insert into memories (id, tree_id, title, memo, visibility, emotion_tags, created_at, updated_at) values ($1,$2,$3,'','private','[]',now(),now())",
      [id, treeId, id]
    );
  }
}

async function put(id, body) {
  return call({ method: "PUT", path: `/api/memories/${id}`, body });
}

async function createNested(treeId, body) {
  return call(
    { method: "POST", path: `/api/trees/${treeId}/memories`, body },
    memoriesRouter
  );
}

async function createTreeWithFirstMemory(body) {
  return call(
    { method: "POST", path: "/api/trees/with-first-memory", body },
    treesRouter
  );
}

async function main() {
  await setupSchema();
  await seed();

  // Create contracts: valid same-tree parent succeeds; cross-tree parent is rejected before insert.
  const validCreate = await createNested("tree-a", { title: "created", parentId: "b" });
  record("valid same-tree create status", validCreate.status, 201);
  const validCreateId = validCreate.body?.id;
  record("valid same-tree create parent", validCreate.body?.parentId, "b");
  const crossTreeCreate = await createNested("tree-a", { title: "cross", parentId: "cross" });
  record("cross-tree create status", crossTreeCreate.status, 400);
  record(
    "cross-tree create error",
    bodyIncludes(crossTreeCreate, "parentId must reference a memory in the same tree"),
    true
  );
  record("cross-tree create did not write", validCreateId ? await parentOf(validCreateId) : null, "b");

  // The atomic first-memory route creates a new Tree, so an existing external parent is invalid.
  const firstMemory = await createTreeWithFirstMemory({
    clientKey: `cycle-first-${Date.now()}`,
    title: "First Tree",
    memory: { title: "First Moment" },
  });
  record("first-memory without parent succeeds", firstMemory.status, 201);
  const firstMemoryExternalParent = await createTreeWithFirstMemory({
    clientKey: `cycle-first-parent-${Date.now()}`,
    title: "Invalid First Tree",
    memory: { title: "First Moment", parentId: "b" },
  });
  record("first-memory external parent rejects", firstMemoryExternalParent.status, 400);
  record(
    "first-memory external parent error",
    bodyIncludes(firstMemoryExternalParent, "parentId must reference a memory in the same tree"),
    true
  );

  // A. Self-parent must fail without changing the row.
  const self = await put("a", { parentId: "a" });
  record("self-cycle status", self.status, 400);
  record("self-cycle error", bodyIncludes(self, "parentId must not create a cycle"), true);
  record("self-cycle persisted parent unchanged", await parentOf("a"), null);

  // B. Direct two-node cycle: A -> B is valid; B -> A must fail.
  const directFirst = await put("a", { parentId: "b" });
  record("direct setup A->B", directFirst.status, 200);
  const directCycle = await put("b", { parentId: "a" });
  record("two-node cycle status", directCycle.status, 400);
  record("two-node cycle error", bodyIncludes(directCycle, "parentId must not create a cycle"), true);
  record("two-node rejected write unchanged", await parentOf("b"), null);

  // E. Existing detach semantics remain allowed.
  const detachAfterDirect = await put("a", { parentId: null });
  record("detach after direct setup", detachAfterDirect.status, 200);
  record("detach persisted null", await parentOf("a"), null);

  // C. Transitive cycle: A -> B -> C, then C -> A must fail.
  record("transitive setup A->B", (await put("a", { parentId: "b" })).status, 200);
  record("transitive setup B->C", (await put("b", { parentId: "c" })).status, 200);
  const transitiveCycle = await put("c", { parentId: "a" });
  record("three-node cycle status", transitiveCycle.status, 400);
  record(
    "three-node cycle error",
    bodyIncludes(transitiveCycle, "parentId must not create a cycle"),
    true
  );
  record("three-node rejected write unchanged", await parentOf("c"), null);

  // D. Acyclic reparent remains valid even while another chain exists.
  const validReparent = await put("a", { parentId: "d" });
  record("valid unrelated reparent status", validReparent.status, 200);
  record("valid unrelated reparent persisted", await parentOf("a"), "d");

  // E again: explicit parent removal remains a canonical write.
  const detach = await put("a", { parentId: null });
  record("detach status", detach.status, 200);
  record("detach parent null", await parentOf("a"), null);

  // F. Preserve existing nonexistent-parent contract.
  const missing = await put("a", { parentId: "missing-parent" });
  record("missing parent status", missing.status, 400);
  record(
    "missing parent existing error",
    bodyIncludes(missing, "parentId must reference a memory in the same tree"),
    true
  );

  // G. Preserve existing cross-tree parent contract, even for same owner.
  const crossTree = await put("a", { parentId: "cross" });
  record("cross-tree parent status", crossTree.status, 400);
  record(
    "cross-tree existing error",
    bodyIncludes(crossTree, "parentId must reference a memory in the same tree"),
    true
  );

  // Existing non-relationship updates still use the canonical update path.
  const titleOnly = await put("d", { title: "D updated" });
  record("unrelated valid update status", titleOnly.status, 200);
  record("unrelated valid update title", titleOnly.body?.title, "D updated");

  // Deleted parent behavior is already schema-authoritative ON DELETE SET NULL.
  record("delete-detach setup", (await put("a", { parentId: "d" })).status, 200);
  const deletedParent = await call({ method: "DELETE", path: "/api/memories/d" });
  record("delete parent status", deletedParent.status, 200);
  record("deleted parent detaches child", await parentOf("a"), null);

  // Concurrency: both requests can pass a stale pre-check, so the Tree-scoped
  // transactional advisory lock + post-lock recursive guard must ensure only
  // one of the mutually cyclic writes commits.
  const concurrent = await Promise.all([
    put("race-a", { parentId: "race-b" }),
    put("race-b", { parentId: "race-a" }),
  ]);
  const concurrentStatuses = concurrent.map((response) => response.status).sort();
  record("concurrent mutual-parent statuses", JSON.stringify(concurrentStatuses), JSON.stringify([200, 400]));
  const raceAParent = await parentOf("race-a");
  const raceBParent = await parentOf("race-b");
  record(
    "concurrent mutual cycle absent",
    raceAParent === "race-b" && raceBParent === "race-a",
    false
  );
  record(
    "concurrent rejected response is cycle validation",
    concurrent.some(
      (response) =>
        response.status === 400 && bodyIncludes(response, "parentId must not create a cycle")
    ),
    true
  );

  const failures = results.filter((result) => !result.pass);
  console.log(`[MOMENT-PARENT] checks=${results.length} failures=${failures.length}`);
  if (failures.length) process.exitCode = 1;
}

try {
  await main();
} finally {
  globalThis.fetch = originalFetch;
  await pool.end();
}
