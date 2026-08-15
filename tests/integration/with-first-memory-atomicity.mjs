// With-first-memory atomicity integration verification (real PostgreSQL 16).
//
// NOT part of the default `npm test` run (A-track does not auto-discover
// tests/integration/**). Executed explicitly by the A-track disposable
// PostgreSQL integration gate against a fresh, empty database:
//   DATABASE_URL=<fresh-empty-db> node --import tsx tests/integration/with-first-memory-atomicity.mjs
//
// Builds the schema from the committed migrations, then exercises
// POST /api/trees/with-first-memory against the real handler and a real
// Postgres transaction:
//   - ABSENT success: canonical reread, tree 1 / social 1 / memory 1
//   - statement failure: full rollback -> 0 / 0 / 0 (no residue)
//   - complete same-key replay: original persisted canonical rows (200),
//     never the request payload
//   - concurrent same-key: exactly one logical Tree + First Moment
//   - legacy tree-only partial: fail closed (409), never auto-repaired
//   - auth / validation / visibility controls
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { readFile } from "node:fs/promises";
import { createSign, generateKeyPairSync, createPublicKey } from "node:crypto";
import * as schema from "../../db/schema.ts";
import { treesRouter, deterministicId } from "../../server/api/trees.ts";

const DB_CONN =
  process.env.DATABASE_URL ||
  "postgresql://postgres:rehearsal123@localhost:5432/lovetree_wfm_atomicity";
const PROJECT_ID = "relovetree";
const RUN = Date.now().toString(36);

const pool = new Pool({ connectionString: DB_CONN });
const db = drizzle(pool, { schema });

const strip = (s) => s.replace(/--> statement-breakpoint/g, "");
const file = (p) => readFile(new URL(`../../${p}`, import.meta.url), "utf8");

// Firebase JWKS mock so requireAuthUser can verify locally-issued tokens.
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicExponent: 0x10001,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const publicJwk = createPublicKey(publicKey).export({ format: "jwk" });
const KEY_ID = "integration-key";
const AUTH_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const b64u = (i) => Buffer.from(i).toString("base64url");
function tok(uid) {
  const n = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: "RS256", kid: KEY_ID }));
  const p = b64u(
    JSON.stringify({
      aud: PROJECT_ID,
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
      sub: uid,
      iat: n - 60,
      auth_time: n - 120,
      exp: n + 3600,
    })
  );
  const d = `${h}.${p}`;
  return `${d}.${b64u(createSign("RSA-SHA256").update(d).sign(privateKey))}`;
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

function ctx({ method, path, body, uid = "user-a", noAuth = false }) {
  const u = new URL(`https://example.com${path}`);
  const headers = {};
  if (!noAuth) headers.authorization = `Bearer ${tok(uid)}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const r = new Request(u, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    request: r,
    env: { DATABASE_URL: "unused", FIREBASE_PROJECT_ID: PROJECT_ID },
    db,
    url: u,
    method,
    path,
    params: {},
  };
}
async function call(router, o) {
  try {
    const res = await router(ctx(o));
    return {
      status: res.status,
      body: res.status === 204 ? null : await res.json().catch(() => null),
    };
  } catch (err) {
    return { status: 500, body: { error: String(err?.message || err).slice(0, 200) } };
  }
}

const results = [];
function rec(l, g, e) {
  const ok = e === undefined ? true : g === e;
  results.push({ l, g, e, ok });
  console.log(`[WFM] ${l}: got=${JSON.stringify(g)} expect=${JSON.stringify(e)} ${ok ? "PASS" : "FAIL"}`);
}

async function counts(treeId) {
  const t = await pool.query("select count(*)::int n from trees where id=$1", [treeId]);
  const s = await pool.query(
    "select count(*)::int n from tree_social_counts where tree_id=$1",
    [treeId]
  );
  const m = await pool.query("select count(*)::int n from memories where tree_id=$1", [treeId]);
  return [t.rows[0].n, s.rows[0].n, m.rows[0].n];
}

async function main() {
  // 0. Fresh schema straight from the committed migrations.
  await pool.query("DROP SCHEMA public CASCADE");
  await pool.query("CREATE SCHEMA public");
  await pool.query(strip(await file("drizzle/0000_flippant_warlock.sql")));
  await pool.query(strip(await file("drizzle/0001_perpetual_deathbird.sql")));
  await pool.query(strip(await file("drizzle/0002_fixed_scarlet_spider.sql")));
  await pool.query(strip(await file("drizzle/0003_peaceful_radioactive_man.sql")));

  // 1. ABSENT success: canonical reread, exactly 1 tree / 1 social / 1 memory.
  const keyA = `it-a-${RUN}`;
  const treeA = await deterministicId("user-a", "tree", keyA);
  const r1 = await call(treesRouter, {
    method: "POST",
    path: "/api/trees/with-first-memory",
    body: { clientKey: keyA, title: "Golden", memory: { memo: "first" } },
    uid: "user-a",
  });
  rec("success status", r1.status, 201);
  rec("canonical tree id (deterministic)", r1.body?.tree?.id, treeA);
  rec("canonical clientKey persisted", r1.body?.tree?.clientKey, keyA);
  rec("canonical memory references tree", r1.body?.memory?.treeId, treeA);
  rec("first memory sortOrder", r1.body?.memory?.sortOrder, 0);
  rec("success counts 1/1/1", JSON.stringify(await counts(treeA)), JSON.stringify([1, 1, 1]));

  // 2. Complete same-key replay: original persisted rows, never the payload.
  const r2 = await call(treesRouter, {
    method: "POST",
    path: "/api/trees/with-first-memory",
    body: { clientKey: keyA, title: "Changed Title", memory: { memo: "changed memo" } },
    uid: "user-a",
  });
  rec("replay status 200", r2.status, 200);
  rec("replay returns original title", r2.body?.tree?.title, "Golden");
  rec("replay returns original memo", r2.body?.memory?.memo, "first");
  rec("replay counts unchanged 1/1/1", JSON.stringify(await counts(treeA)), JSON.stringify([1, 1, 1]));

  // 3. Statement failure -> full rollback, 0 tree / 0 social / 0 memory.
  await pool.query(
    "ALTER TABLE memories ADD CONSTRAINT wfm_fail_check CHECK (false) NOT VALID"
  );
  const keyF = `it-f-${RUN}`;
  const treeF = await deterministicId("user-a", "tree", keyF);
  const r3 = await call(treesRouter, {
    method: "POST",
    path: "/api/trees/with-first-memory",
    body: { clientKey: keyF, title: "Fail", memory: { memo: "boom" } },
    uid: "user-a",
  });
  rec("failure status 500", r3.status, 500);
  rec("failure rollback 0/0/0", JSON.stringify(await counts(treeF)), JSON.stringify([0, 0, 0]));
  await pool.query("ALTER TABLE memories DROP CONSTRAINT wfm_fail_check");

  // 4. Concurrent same-key requests -> exactly one logical Tree + Moment.
  const keyC = `it-c-${RUN}`;
  const treeC = await deterministicId("user-a", "tree", keyC);
  const concurrent = await Promise.all(
    Array.from({ length: 8 }, () =>
      call(treesRouter, {
        method: "POST",
        path: "/api/trees/with-first-memory",
        body: { clientKey: keyC, title: "Conc", memory: { memo: "c" } },
        uid: "user-a",
      })
    )
  );
  rec(
    "concurrent statuses all 200/201",
    concurrent.every((r) => r.status === 200 || r.status === 201),
    true
  );
  rec("concurrent counts 1/1/1", JSON.stringify(await counts(treeC)), JSON.stringify([1, 1, 1]));
  rec("concurrent single tree id", new Set(concurrent.map((r) => r.body?.tree?.id)).size, 1);
  rec("concurrent single memory id", new Set(concurrent.map((r) => r.body?.memory?.id)).size, 1);

  // 5. Legacy tree-only partial (old sequential-write crash residue): fail
  //    closed with 409, never auto-repair the missing first memory.
  const keyL = `it-l-${RUN}`;
  const treeL = await deterministicId("user-a", "tree", keyL);
  await pool.query(
    "insert into trees (id, owner_id, client_key, title, memo, artist, visibility, group_name, keywords, created_at, updated_at) values ($1,$2,$3,$4,'','','public',NULL,'[]',now(),now())",
    [treeL, "user-a", keyL, "Legacy"]
  );
  await pool.query(
    "insert into tree_social_counts (tree_id, like_count, view_count, updated_at) values ($1,0,0,now())",
    [treeL]
  );
  const rL = await call(treesRouter, {
    method: "POST",
    path: "/api/trees/with-first-memory",
    body: { clientKey: keyL, title: "Repair?", memory: { memo: "should not insert" } },
    uid: "user-a",
  });
  rec("legacy partial status 409", rL.status, 409);
  rec("legacy partial counts 1/1/0", JSON.stringify(await counts(treeL)), JSON.stringify([1, 1, 0]));
  rec("legacy partial memory NOT repaired", await pool.query("select count(*)::int n from memories where tree_id=$1", [treeL]).then((q) => q.rows[0].n), 0);

  // 6. Different-id tree under the same clientKey: fail closed, no residue.
  const keyD = `it-d-${RUN}`;
  const treeD = await deterministicId("user-a", "tree", keyD);
  await pool.query(
    "insert into trees (id, owner_id, client_key, title, memo, artist, visibility, group_name, keywords, created_at, updated_at) values ($1,$2,$3,$4,'','','public',NULL,'[]',now(),now())",
    [`random-id-${RUN}`, "user-a", keyD, "Other"]
  );
  const rD = await call(treesRouter, {
    method: "POST",
    path: "/api/trees/with-first-memory",
    body: { clientKey: keyD, title: "Detached", memory: { memo: "nope" } },
    uid: "user-a",
  });
  rec("different-id legacy status 409", rD.status, 409);
  rec("different-id legacy counts 0/0/0", JSON.stringify(await counts(treeD)), JSON.stringify([0, 0, 0]));

  // 7. Auth / validation / visibility controls.
  const r401 = await call(treesRouter, {
    method: "POST",
    path: "/api/trees/with-first-memory",
    body: { clientKey: `it-unauth-${RUN}`, title: "x", memory: { memo: "x" } },
    noAuth: true,
  });
  rec("unauthenticated 401", r401.status, 401);

  const r400a = await call(treesRouter, {
    method: "POST",
    path: "/api/trees/with-first-memory",
    body: { title: "x", memory: { memo: "x" } },
    uid: "user-a",
  });
  rec("missing clientKey 400", r400a.status, 400);

  const r400b = await call(treesRouter, {
    method: "POST",
    path: "/api/trees/with-first-memory",
    body: { clientKey: `it-empty-${RUN}`, memory: { memo: "   " } },
    uid: "user-a",
  });
  rec("empty memory 400", r400b.status, 400);

  const r400c = await call(treesRouter, {
    method: "POST",
    path: "/api/trees/with-first-memory",
    body: { clientKey: `it-vis-${RUN}`, visibility: "topsecret", memory: { memo: "x" } },
    uid: "user-a",
  });
  rec("invalid visibility 400", r400c.status, 400);

  const keyP = `it-p-${RUN}`;
  const rP = await call(treesRouter, {
    method: "POST",
    path: "/api/trees/with-first-memory",
    body: {
      clientKey: keyP,
      title: "Secret Tree",
      visibility: "private",
      memory: { memo: "secret" },
    },
    uid: "user-a",
  });
  rec("private create 201", rP.status, 201);
  rec("private tree visibility", rP.body?.tree?.visibility, "private");
  rec("private memory inherits tree visibility", rP.body?.memory?.visibility, "private");

  const keyS = `it-s-${RUN}`;
  const rS1 = await call(treesRouter, {
    method: "POST",
    path: "/api/trees/with-first-memory",
    body: { clientKey: keyS, title: "Mine", memory: { memo: "mine" } },
    uid: "user-a",
  });
  const rS2 = await call(treesRouter, {
    method: "POST",
    path: "/api/trees/with-first-memory",
    body: { clientKey: keyS, title: "Yours", memory: { memo: "yours" } },
    uid: "user-b",
  });
  rec(
    "same key different owner: both 201",
    JSON.stringify([rS1.status, rS2.status]),
    JSON.stringify([201, 201])
  );
  rec("same key different owner: distinct tree ids", rS1.body?.tree?.id === rS2.body?.tree?.id, false);

  await pool.end();
  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n=== WITH-FIRST-MEMORY INTEGRATION SUMMARY: ${results.length - failed.length}/${results.length} PASS ===`
  );
  process.exit(failed.length ? 1 : 0);
}
main().catch((e) => {
  console.error("WFM INTEGRATION ERROR", e);
  process.exit(2);
});
