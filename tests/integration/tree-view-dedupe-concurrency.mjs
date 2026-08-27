// Issue #510 Tree-view dedupe concurrency verification against real PostgreSQL 16.
//
// Not part of the default tests/*.test.mjs corpus. The dedicated #510 workflow
// runs this against a fresh disposable PostgreSQL service after applying the
// committed migrations.
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { readFile } from "node:fs/promises";
import { createSign, generateKeyPairSync, createPublicKey } from "node:crypto";
import * as schema from "../../db/schema.ts";
import { socialRouter, getTreeViewWindowStart } from "../../server/api/social.ts";

const DB_CONN = process.env.DATABASE_URL;
if (!DB_CONN) {
  console.error("DATABASE_URL is required for the Issue #510 PostgreSQL integration gate.");
  process.exit(2);
}

const PROJECT_ID = "relovetree";
const RUN = Date.now().toString(36);
const pool = new Pool({ connectionString: DB_CONN });
const db = drizzle(pool, { schema });
const strip = (s) => s.replace(/--> statement-breakpoint/g, "");
const file = (p) => readFile(new URL(`../../${p}`, import.meta.url), "utf8");

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicExponent: 0x10001,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const publicJwk = createPublicKey(publicKey).export({ format: "jwk" });
const KEY_ID = "issue-510-integration-key";
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
  const unsigned = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey);
  return `${unsigned}.${b64u(signature)}`;
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

function ctx({ treeId, uid = "user-a", noAuth = false }) {
  const path = `/api/trees/${treeId}/views`;
  const url = new URL(`https://example.com${path}`);
  const headers = {};
  if (!noAuth) headers.authorization = `Bearer ${token(uid)}`;
  return {
    request: new Request(url, { method: "POST", headers }),
    env: { DATABASE_URL: "unused", FIREBASE_PROJECT_ID: PROJECT_ID },
    db,
    url,
    method: "POST",
    path,
    params: {},
  };
}

async function callView(options) {
  try {
    const response = await socialRouter(ctx(options));
    return {
      status: response?.status ?? 500,
      body: response ? await response.json().catch(() => null) : null,
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: String(error?.message || error).slice(0, 300) },
    };
  }
}

const results = [];
function check(label, got, expected) {
  const ok = Object.is(got, expected);
  results.push({ label, got, expected, ok });
  console.log(
    `[TREE-VIEW-510] ${label}: got=${JSON.stringify(got)} expect=${JSON.stringify(expected)} ${ok ? "PASS" : "FAIL"}`
  );
}

async function createTree(id, ownerId = "user-a", visibility = "public") {
  await pool.query(
    `insert into trees
      (id, owner_id, client_key, title, memo, artist, visibility, group_name, keywords, created_at, updated_at)
     values ($1,$2,NULL,$3,'','','${visibility}',NULL,'[]'::jsonb,now(),now())`,
    [id, ownerId, `Tree ${id}`]
  );
}

async function durable(treeId) {
  const dedup = await pool.query(
    "select count(*)::int n from tree_view_dedup_events where tree_id=$1",
    [treeId]
  );
  const counter = await pool.query(
    "select view_count::int n from tree_social_counts where tree_id=$1",
    [treeId]
  );
  return {
    dedup: dedup.rows[0].n,
    viewCount: counter.rows[0]?.n ?? 0,
  };
}

async function main() {
  await pool.query("DROP SCHEMA public CASCADE");
  await pool.query("CREATE SCHEMA public");
  await pool.query(strip(await file("drizzle/0000_flippant_warlock.sql")));
  await pool.query(strip(await file("drizzle/0001_perpetual_deathbird.sql")));
  await pool.query(strip(await file("drizzle/0002_fixed_scarlet_spider.sql")));
  await pool.query(strip(await file("drizzle/0003_peaceful_radioactive_man.sql")));

  // CASE A — sequential duplicate: one durable claim and one count.
  const treeA = `view-a-${RUN}`;
  await createTree(treeA);
  const a1 = await callView({ treeId: treeA, uid: "user-a" });
  const a2 = await callView({ treeId: treeA, uid: "user-a" });
  check("A first status", a1.status, 201);
  check("A duplicate status", a2.status, 200);
  check("A duplicate response deduped", a2.body?.deduped, true);
  check("A durable rows", JSON.stringify(await durable(treeA)), JSON.stringify({ dedup: 1, viewCount: 1 }));

  // CASE B — true overlap: eight same-identity calls race on real Postgres.
  const treeB = `view-b-${RUN}`;
  await createTree(treeB);
  const concurrent = await Promise.all(
    Array.from({ length: 8 }, () => callView({ treeId: treeB, uid: "user-a" }))
  );
  check("B requests", concurrent.length, 8);
  check("B exactly one winner", concurrent.filter((r) => r.status === 201).length, 1);
  check("B seven deduped", concurrent.filter((r) => r.status === 200 && r.body?.deduped === true).length, 7);
  check("B no errors", concurrent.some((r) => r.status >= 400), false);
  check("B durable rows", JSON.stringify(await durable(treeB)), JSON.stringify({ dedup: 1, viewCount: 1 }));

  // CASE C — different authenticated actors are legitimate independent identities.
  const treeC = `view-c-${RUN}`;
  await createTree(treeC);
  const c = await Promise.all([
    callView({ treeId: treeC, uid: "user-a" }),
    callView({ treeId: treeC, uid: "user-b" }),
  ]);
  check("C both actors counted", c.filter((r) => r.status === 201).length, 2);
  check("C durable rows", JSON.stringify(await durable(treeC)), JSON.stringify({ dedup: 2, viewCount: 2 }));

  // CASE D — repeated retry remains idempotent after the first winner.
  const treeD = `view-d-${RUN}`;
  await createTree(treeD);
  const retries = [];
  for (let i = 0; i < 6; i += 1) {
    retries.push(await callView({ treeId: treeD, uid: "user-a" }));
  }
  check("D exactly one winner", retries.filter((r) => r.status === 201).length, 1);
  check("D remaining retries deduped", retries.filter((r) => r.status === 200 && r.body?.deduped === true).length, 5);
  check("D durable rows", JSON.stringify(await durable(treeD)), JSON.stringify({ dedup: 1, viewCount: 1 }));

  // CASE E — Tree has no soft-delete state. Hard delete cascades both durable
  // dedupe and counter rows; recreating the same id starts a clean identity.
  const treeE = `view-e-${RUN}`;
  await createTree(treeE);
  check("E initial count", (await callView({ treeId: treeE, uid: "user-a" })).status, 201);
  await pool.query("delete from trees where id=$1", [treeE]);
  check("E cascade clears durable state", JSON.stringify(await durable(treeE)), JSON.stringify({ dedup: 0, viewCount: 0 }));
  await createTree(treeE);
  check("E recreate can count", (await callView({ treeId: treeE, uid: "user-a" })).status, 201);
  check("E recreated durable rows", JSON.stringify(await durable(treeE)), JSON.stringify({ dedup: 1, viewCount: 1 }));

  // CASE F — different Trees are independent, and private readability remains
  // an ownership boundary for the mutation.
  const treeF1 = `view-f1-${RUN}`;
  const treeF2 = `view-f2-${RUN}`;
  const treePrivate = `view-private-${RUN}`;
  await createTree(treeF1);
  await createTree(treeF2);
  await createTree(treePrivate, "user-a", "private");
  check("F tree1 counted", (await callView({ treeId: treeF1, uid: "user-a" })).status, 201);
  check("F tree2 counted", (await callView({ treeId: treeF2, uid: "user-a" })).status, 201);
  check("F tree1 durable", JSON.stringify(await durable(treeF1)), JSON.stringify({ dedup: 1, viewCount: 1 }));
  check("F tree2 durable", JSON.stringify(await durable(treeF2)), JSON.stringify({ dedup: 1, viewCount: 1 }));
  check("F non-owner private view hidden", (await callView({ treeId: treePrivate, uid: "user-b" })).status, 404);
  check("F forbidden private leaves no state", JSON.stringify(await durable(treePrivate)), JSON.stringify({ dedup: 0, viewCount: 0 }));
  check("F owner private can count", (await callView({ treeId: treePrivate, uid: "user-a" })).status, 201);
  check("F owner private durable", JSON.stringify(await durable(treePrivate)), JSON.stringify({ dedup: 1, viewCount: 1 }));

  // Next eligible window: seed only the immediately previous deterministic
  // bucket, then a current-window request must win once and advance count.
  const treeNext = `view-next-${RUN}`;
  await createTree(treeNext);
  const currentBucket = getTreeViewWindowStart(new Date());
  const previousBucket = new Date(currentBucket.getTime() - 24 * 60 * 60 * 1000);
  await pool.query(
    `insert into tree_view_dedup_events
      (id, tree_id, actor_key, actor_kind, counted_window_start, source, created_at)
     values ($1,$2,$3,'user',$4,'integration_previous_window',$4)`,
    [`old-${RUN}`, treeNext, "user-a", previousBucket]
  );
  await pool.query(
    "insert into tree_social_counts (tree_id, like_count, view_count, updated_at) values ($1,0,1,now())",
    [treeNext]
  );
  check("next-window current request wins", (await callView({ treeId: treeNext, uid: "user-a" })).status, 201);
  check("next-window durable rows", JSON.stringify(await durable(treeNext)), JSON.stringify({ dedup: 2, viewCount: 2 }));
  check("next-window retry dedupes", (await callView({ treeId: treeNext, uid: "user-a" })).status, 200);
  check("next-window retry durable stable", JSON.stringify(await durable(treeNext)), JSON.stringify({ dedup: 2, viewCount: 2 }));

  // Existing boundaries: no anonymous promotion and missing Tree never writes.
  const treeAnon = `view-anon-${RUN}`;
  await createTree(treeAnon);
  check("anonymous remains disabled", (await callView({ treeId: treeAnon, noAuth: true })).status, 501);
  check("anonymous leaves no state", JSON.stringify(await durable(treeAnon)), JSON.stringify({ dedup: 0, viewCount: 0 }));
  const missing = `view-missing-${RUN}`;
  check("missing tree 404", (await callView({ treeId: missing, uid: "user-a" })).status, 404);
  check("missing tree leaves no state", JSON.stringify(await durable(missing)), JSON.stringify({ dedup: 0, viewCount: 0 }));

  const failed = results.filter((r) => !r.ok);
  console.log(`[TREE-VIEW-510] assertions=${results.length} failures=${failed.length}`);
  if (failed.length > 0) {
    console.error(JSON.stringify(failed, null, 2));
    process.exitCode = 1;
  }
}

try {
  await main();
} finally {
  globalThis.fetch = originalFetch;
  await pool.end();
}
