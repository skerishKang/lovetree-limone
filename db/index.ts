import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function getDb(databaseUrl: string) {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. Set DATABASE_URL in your environment (local: .dev.vars, production: Cloudflare Workers secrets)."
    );
  }

  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}
