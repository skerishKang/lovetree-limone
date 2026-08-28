import type { ApiContext } from "./handler";

type SqlStatement = { sql: string; params: unknown[] };

/**
 * Production uses drizzle's neon-http adapter, whose underlying Neon client
 * exposes transaction(). The real-PostgreSQL integration gate uses a
 * node-postgres Pool, which exposes connect(). Parent/tree relationship writes
 * must fail closed when neither transactional seam is available: a
 * check-then-write fallback would re-open the cycle race this module exists to
 * prevent.
 */
export function supportsSerializedParentMutation(db: ApiContext["db"]): boolean {
  const client = (db as unknown as { $client?: unknown }).$client;
  if (!client) return false;
  if (typeof (client as { transaction?: unknown }).transaction === "function") return true;
  return typeof (client as { connect?: unknown }).connect === "function";
}

/**
 * Runs relationship statements while holding transaction-scoped advisory
 * locks for every affected Tree. Sorted lock acquisition avoids deadlocks when
 * a Moment changes Tree. PostgreSQL READ COMMITTED takes a fresh snapshot for
 * each statement, so a waiter observes the relationship committed by the
 * previous lock holder before its guarded UPDATE runs.
 *
 * No schema/table is added: this reuses the transactional SQL-client seam
 * already used by the canonical with-first-memory write path.
 */
export async function runSerializedParentMutation(
  db: ApiContext["db"],
  treeIds: string[],
  statements: SqlStatement[]
): Promise<unknown[][]> {
  const client = (db as unknown as { $client?: unknown }).$client;
  if (!client) {
    throw new Error("parent relationship update requires a transactional SQL client");
  }

  const lockStatements: SqlStatement[] = [...new Set(treeIds)]
    .sort()
    .map((treeId) => ({
      sql: "select pg_advisory_xact_lock(hashtextextended($1::text, 509))",
      params: [treeId],
    }));
  const allStatements = [...lockStatements, ...statements];

  const neonTransaction = (client as { transaction?: unknown }).transaction;
  if (typeof neonTransaction === "function") {
    const run = neonTransaction as (
      fn: (tx: { query(sql: string, params?: unknown[]): Promise<unknown[]> }) => unknown[]
    ) => Promise<unknown[][]>;
    const results = await run((tx) =>
      allStatements.map((statement) => tx.query(statement.sql, statement.params))
    );
    return results.slice(lockStatements.length);
  }

  const connect = (client as { connect?: unknown }).connect;
  if (typeof connect === "function") {
    const pool = client as {
      connect(): Promise<{
        query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
        release(): void;
      }>;
    };
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      for (const lock of lockStatements) {
        await connection.query(lock.sql, lock.params);
      }
      const results: unknown[][] = [];
      for (const statement of statements) {
        const result = await connection.query(statement.sql, statement.params);
        results.push(result.rows);
      }
      await connection.query("COMMIT");
      return results;
    } catch (error) {
      await connection.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  }

  throw new Error(
    "parent relationship update requires a transactional SQL client (Neon HTTP or node-postgres Pool)"
  );
}
