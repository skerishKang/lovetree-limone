// Expand migration atomicity integration verification (local PostgreSQL 16).
//
// NOT part of the default `npm test` run. Executed explicitly against an
// isolated, EMPTY database:
//   DATABASE_URL=<fresh-empty-db> node --import tsx tests/integration/expand-atomicity.mjs
//
// Phases:
//   A. Intentional failure right before index creation inside a transaction
//      -> full rollback (no sort_order column, seed data unchanged)
//   B. Normal run of old/ops/releases/sort-order/production-expand.sql
//      -> nullable column, no default, deterministic backfill, partial unique
//   C. Re-run after success -> fails cleanly, Expand state stays consistent
//      (documented failure mode; recovery is: do not re-run, the column exists)
import { Pool } from "pg";
import { readFile } from "node:fs/promises";

const DB_CONN =
  process.env.DATABASE_URL ||
  "postgresql://postgres:rehearsal123@localhost:5432/lovetree_expand_atomicity";
const pool = new Pool({ connectionString: DB_CONN });

const strip = (s) => s.replace(/--> statement-breakpoint/g, "");
const file = (p) => readFile(new URL(`../../${p}`, import.meta.url), "utf8");

const results = [];
function rec(l, g, e) {
  const ok = e === undefined ? true : g === e;
  results.push({ l, g, e, ok });
  console.log(`[ATOM] ${l}: got=${JSON.stringify(g)} expect=${JSON.stringify(e)} ${ok ? "PASS" : "FAIL"}`);
}

async function main() {
  // 0. pre-release schema (memories WITHOUT sort_order) + seed data
  await pool.query(strip(await file("drizzle/0000_flippant_warlock.sql")));
  await pool.query(strip(await file("drizzle/0001_perpetual_deathbird.sql")));
  await pool.query(
    `INSERT INTO trees (id, owner_id, client_key, title, memo, artist, visibility, group_name, keywords, created_at, updated_at)
     VALUES ('tree-a','user-a',NULL,'A','','','public',NULL,'[]',now(),now())`
  );
  await pool.query(
    `INSERT INTO memories (id, tree_id, client_key, parent_id, title, memo, artist, source, source_url, source_type, thumbnail, emotion_tags, timestamp, visibility, channel_id, channel_name, channel_url, created_at, updated_at)
     VALUES ('m1','tree-a',NULL,NULL,'1','','','','','youtube','','[]','2026-01-01','public',NULL,NULL,NULL,now(),now()),
            ('m2','tree-a',NULL,NULL,'2','','','','','youtube','','[]','2026-01-02','public',NULL,NULL,NULL,now(),now()),
            ('m3','tree-a',NULL,NULL,'3','','','','','youtube','','[]','2026-01-03','public',NULL,NULL,NULL,now(),now())`
  );

  const preCount = (await pool.query("SELECT count(*)::int n FROM memories")).rows[0].n;

  // ============ A. Failure right before index creation -> full rollback ============
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`ALTER TABLE "memories" ADD COLUMN "sort_order" integer;`);
    await client.query(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY tree_id ORDER BY created_at ASC, id ASC) - 1 AS n
        FROM memories
      )
      UPDATE memories m SET sort_order = ranked.n FROM ranked
      WHERE m.id = ranked.id AND m.sort_order IS DISTINCT FROM ranked.n
    `);
    let indexFailed = false;
    try {
      await client.query(
        `CREATE UNIQUE INDEX "memories_tree_sort_order_uniq_partial" ON "memories" USING btree ("tree_id","sort_order","no_such_column") WHERE "sort_order" IS NOT NULL`
      );
    } catch (e) {
      indexFailed = String(e.message).includes('column "no_such_column" does not exist');
    }
    await client.query("ROLLBACK");
    rec("A: index statement failed as injected", indexFailed, true);
  } finally {
    client.release();
  }
  rec("A: sort_order column absent after rollback", (await pool.query(`SELECT count(*)::int n FROM information_schema.columns WHERE table_name='memories' AND column_name='sort_order'`)).rows[0].n, 0);
  rec("A: partial index absent after rollback", (await pool.query(`SELECT count(*)::int n FROM pg_indexes WHERE indexname='memories_tree_sort_order_uniq_partial'`)).rows[0].n, 0);
  rec("A: seed rows unchanged", (await pool.query("SELECT count(*)::int n FROM memories")).rows[0].n, preCount);

  // ============ B. Normal run of the real ops file (BEGIN/COMMIT inside) ============
  await pool.query(strip(await file("old/ops/releases/sort-order/production-expand.sql")));
  rec("B: column exists, nullable", (await pool.query(`SELECT is_nullable FROM information_schema.columns WHERE table_name='memories' AND column_name='sort_order'`)).rows[0].is_nullable, "YES");
  rec("B: no default", (await pool.query(`SELECT column_default FROM information_schema.columns WHERE table_name='memories' AND column_name='sort_order'`)).rows[0].column_default, null);
  const orders = await pool.query(`SELECT sort_order FROM memories WHERE tree_id='tree-a' ORDER BY sort_order`);
  rec("B: backfill 0,1,2", JSON.stringify(orders.rows.map((r) => r.sort_order)), JSON.stringify([0, 1, 2]));
  rec("B: partial unique index present", (await pool.query(`SELECT count(*)::int n FROM pg_indexes WHERE indexname='memories_tree_sort_order_uniq_partial'`)).rows[0].n, 1);
  rec("B: full unique absent", (await pool.query(`SELECT count(*)::int n FROM pg_indexes WHERE indexname='memories_tree_sort_order_uniq'`)).rows[0].n, 0);
  rec("B: client_key unique kept", (await pool.query(`SELECT count(*)::int n FROM pg_indexes WHERE indexname='memories_tree_client_key_uniq'`)).rows[0].n, 1);
  rec("B: rows immutable", (await pool.query("SELECT count(*)::int n FROM memories")).rows[0].n, preCount);

  // ============ C. Re-run after success -> clean failure, consistent state ============
  let rerunFailed = false;
  try {
    await pool.query(strip(await file("old/ops/releases/sort-order/production-expand.sql")));
  } catch (e) {
    rerunFailed = String(e.message).includes('column "sort_order" of relation "memories" already exists');
  }
  rec("C: re-run fails with 'already exists'", rerunFailed, true);
  rec("C: Expand state consistent after re-run failure", (await pool.query(`SELECT count(*)::int n FROM information_schema.columns WHERE table_name='memories' AND column_name='sort_order'`)).rows[0].n, 1);
  rec("C: backfill intact after re-run failure", JSON.stringify((await pool.query(`SELECT sort_order FROM memories WHERE tree_id='tree-a' ORDER BY sort_order`)).rows.map((r) => r.sort_order)), JSON.stringify([0, 1, 2]));

  await pool.end();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ATOMICITY SUMMARY: ${results.length - failed.length}/${results.length} PASS ===`);
  process.exit(failed.length ? 1 : 0);
}
main().catch((e) => {
  console.error("ATOMICITY ERROR", e);
  process.exit(2);
});
