import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
const line = readFileSync(new URL("./.dev.vars", import.meta.url), "utf8")
  .split("\n").find((l) => l.startsWith("DATABASE_URL="));
const url = line.slice("DATABASE_URL=".length).trim();
const sql = neon(url);
const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`;
console.log("TABLES:", tables.map((t) => t.table_name).join(", "));
for (const t of ["trees", "memories", "comments", "reactions", "tree_likes", "tree_view_dedup_events"]) {
  try {
    const [{ n }] = await sql`select count(*)::int as n from "public"."${sql.unsafe?sql.unsafe(t):t}"`.catch(async () => {
      const [{ n }] = await sql`select count(*)::int as n from "public".${sql.unsafe?sql.unsafe(t):t}`;
      return [{ n }];
    });
    console.log(t, "rows:", n);
  } catch (e) { console.log(t, "ERR", e.message); }
}
