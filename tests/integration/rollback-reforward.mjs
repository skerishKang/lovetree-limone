// Rollback / re-forward integration verification (requires a local PostgreSQL 16
// with the Expand schema applied: sort_order nullable + partial unique index).
//
// NOT part of the default `npm test` run. Executed explicitly during the
// migration smoke step against an isolated DB:
//   DATABASE_URL=<expand-schema-db> node --import tsx tests/integration/rollback-reforward.mjs
//
// Scenario (H):
//   1. new code creates sortOrder 0,1,2
//   2. old-code style rows with sort_order = NULL (2 rows)
//   3. patched new code creates without backfill -> sortOrder 3, NULLs preserved
//   4. re-forward backfill (reforward-backfill.sql)
//   5. contiguous 0..N, NULL 0, duplicates 0, data loss 0
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema.ts";
import { treesRouter } from "../../server/api/trees.ts";
import { memoriesRouter } from "../../server/api/memories.ts";
import { createSign, generateKeyPairSync, createPublicKey } from "node:crypto";

const DB_CONN =
  process.env.DATABASE_URL ||
  "postgresql://postgres:rehearsal123@localhost:5432/lovetree_r2_integration";
const PROJECT_ID = "relovetree";

const pool = new Pool({ connectionString: DB_CONN });
const db = drizzle(pool, { schema });

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
  const p = b64u(JSON.stringify({ aud: PROJECT_ID, iss: `https://securetoken.google.com/${PROJECT_ID}`, sub: uid, iat: n - 60, auth_time: n - 120, exp: n + 3600 }));
  const d = `${h}.${p}`;
  return `${d}.${b64u(createSign("RSA-SHA256").update(d).sign(privateKey))}`;
}
const of = globalThis.fetch;
globalThis.fetch = async (i, init) => {
  if (String(i) === AUTH_URL) return new Response(JSON.stringify({ keys: [{ kty: "RSA", kid: KEY_ID, use: "sig", alg: "RS256", n: publicJwk.n, e: publicJwk.e }] }), { status: 200, headers: { "cache-control": "max-age=3600" } });
  return of(i, init);
};
function ctx({ method, path, body, uid = "user-a" }) {
  const u = new URL(`https://example.com${path}`);
  const r = new Request(u, { method, headers: { authorization: `Bearer ${tok(uid)}`, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { request: r, env: { DATABASE_URL: "unused", FIREBASE_PROJECT_ID: PROJECT_ID, API_MUTATIONS_ENABLED: "true" }, db, url: u, method, path, params: {} };
}
async function call(router, o) {
  const c = ctx(o);
  try {
    const res = await router(c);
    return { status: res.status, body: res.status === 204 ? null : await res.json().catch(() => null) };
  } catch (err) {
    return { status: 500, body: { error: String(err?.message || err).slice(0, 200) } };
  }
}

const results = [];
function rec(l, g, e) {
  const ok = e === undefined ? true : g === e;
  results.push({ l, g, e, ok });
  console.log(`[INT] ${l}: got=${JSON.stringify(g)} expect=${JSON.stringify(e)} ${ok ? "PASS" : "FAIL"}`);
}

async function main() {
  // 1. new code: tree + first (0) + 1 + 2
  const t = await call(treesRouter, { method: "POST", path: "/api/trees/with-first-memory", body: { title: "INT", memo: "i", clientKey: `int-${Date.now().toString(36)}`, memory: { title: "first", memo: "f", timestamp: "2026-01-01" } }, uid: "user-a" });
  rec("tree+first", t.status, 201);
  const treeId = t.body?.tree?.id;
  for (let i = 1; i <= 2; i++) {
    const r = await call(memoriesRouter, { method: "POST", path: `/api/trees/${treeId}/memories`, body: { title: `m${i}`, memo: `m${i}`, timestamp: `2026-01-0${i + 1}` }, uid: "user-a" });
    rec(`new create ${i}`, r.status, 201);
  }

  // 2. old-code style NULL rows
  await pool.query("insert into memories (id, tree_id, title, memo, artist, source, source_url, source_type, thumbnail, emotion_tags, timestamp, sort_order, visibility, created_at, updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now(),now())", [`int-n1-${Date.now().toString(36)}`, treeId, "n1", "", "", "", "", "youtube", "", "{}", "2026-02-01", null, "public"]);
  await pool.query("insert into memories (id, tree_id, title, memo, artist, source, source_url, source_type, thumbnail, emotion_tags, timestamp, sort_order, visibility, created_at, updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now(),now())", [`int-n2-${Date.now().toString(36)}`, treeId, "n2", "", "", "", "", "youtube", "", "{}", "2026-02-02", null, "public"]);
  const st = await pool.query("select count(*) filter(where sort_order is not null)::int nn, count(*) filter(where sort_order is null)::int nl from memories where tree_id=$1", [treeId]);
  rec("before re-forward: non-null=3 null=2", JSON.stringify([st.rows[0].nn, st.rows[0].nl]), JSON.stringify([3, 2]));

  // 3. patched new code create WITHOUT backfill -> sortOrder 3, NULLs preserved
  const r3 = await call(memoriesRouter, { method: "POST", path: `/api/trees/${treeId}/memories`, body: { title: "h", memo: "h", timestamp: "2026-03-01" }, uid: "user-a" });
  rec("patched create (no backfill)", r3.status, 201);
  rec("patched create sortOrder", r3.body?.sortOrder, 3);
  const st2 = await pool.query("select count(*) filter(where sort_order is null)::int nl from memories where tree_id=$1", [treeId]);
  rec("NULLs preserved", st2.rows[0].nl, 2);

  // 4. re-forward backfill (inline copy of old/ops/releases/sort-order/reforward-backfill.sql)
  await pool.query(`
    WITH ranked AS (
      SELECT m.id,
        COALESCE(base.max_so, -1) + ROW_NUMBER() OVER (PARTITION BY m.tree_id ORDER BY m.created_at ASC, m.id ASC) AS new_sort_order
      FROM memories m
      JOIN LATERAL (
        SELECT MAX(m2.sort_order) AS max_so FROM memories m2
        WHERE m2.tree_id = m.tree_id AND m2.sort_order IS NOT NULL
      ) base ON TRUE
      WHERE m.sort_order IS NULL
    )
    UPDATE memories m SET sort_order = ranked.new_sort_order FROM ranked WHERE m.id = ranked.id
  `);

  // 5. verify contiguous, no nulls, no dups, count unchanged (no data loss)
  const after = await pool.query("select sort_order from memories where tree_id=$1 order by sort_order", [treeId]);
  const orders = after.rows.map((r) => r.sort_order);
  const expected = Array.from({ length: orders.length }, (_, i) => i);
  rec("post-backfill contiguous", JSON.stringify(orders), JSON.stringify(expected));
  const nulls = await pool.query("select count(*)::int n from memories where tree_id=$1 and sort_order is null", [treeId]);
  rec("post-backfill NULL count", nulls.rows[0].n, 0);
  const dups = await pool.query("select count(*)::int n from (select tree_id, sort_order from memories where tree_id=$1 group by tree_id, sort_order having count(*)>1) d", [treeId]);
  rec("post-backfill dup count", dups.rows[0].n, 0);
  const cnt = await pool.query("select count(*)::int n from memories where tree_id=$1", [treeId]);
  rec("data loss 0 (count=6)", cnt.rows[0].n, 6);

  await pool.end();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== INT SUMMARY: ${results.length - failed.length}/${results.length} PASS ===`);
  process.exit(failed.length ? 1 : 0);
}
main().catch((e) => { console.error("INT ERROR", e); process.exit(2); });
