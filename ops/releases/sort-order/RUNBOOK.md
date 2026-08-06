# LoveTree sort_order Release Runbook

Operational procedure for the sort_order backward-compatible migration.
The initial release ships the **Expand** state. The **Contract** state is a
separate, manually-approved future step.

## Schema states

| State | sort_order | unique index | When |
|---|---|---|---|
| Pre-release (Production) | column absent | absent | before this release |
| **Expand** (this release) | `integer`, NULL allowed, no DEFAULT | `memories_tree_sort_order_uniq_partial` (partial, `WHERE sort_order IS NOT NULL`) | initial Production deploy |
| Contract (future) | `integer NOT NULL DEFAULT 0` | `memories_tree_sort_order_uniq` (full) | separate approved release |

## Initial release

1. **Production read-only baseline**
   - Record current `memories` row count, `trees` count, and the absence of
     `sort_order` (column + index). Record the Production Worker version ID
     (`wrangler deployments list`).
2. **Expand migration**
   - Run the file as one transaction. The file itself opens a `BEGIN` and ends
     with `COMMIT`, so a single command is safe:

     ```
     psql -v ON_ERROR_STOP=1 -f ops/releases/sort-order/production-expand.sql
     ```

   - Never execute the statements one by one under autocommit. If any statement
     fails the whole transaction rolls back (no column, no backfill, no index).
   - The file already opens its own transaction: do NOT wrap it in an outer
     transaction from the client (a nested `BEGIN` would fail).
   - With `-v ON_ERROR_STOP=1`, psql stops on the first error; the still-open
     transaction is rolled back when the session ends — that is the safety net.
   - On failure: confirm the rollback left no `sort_order` column, fix the root
     cause, and re-run the entire file. Do NOT try to manually complete a
     partially applied migration.
3. **Schema verification (only after the migration succeeds)**
   - Confirm: `sort_order` nullable, default NULL, existing rows have no NULL
     (all backfilled 0..N per tree), partial unique index present, full unique
     index absent, `client_key` unique preserved, row count unchanged.
4. **Deploy new Worker**
   - Deploy the rollback-compatible Worker (NULL-tolerant `computeNextSortOrder`
     + `isUniqueViolation` retry).
5. **E2E**
   - Create/update/delete/list memories; concurrent creates; clientKey
     idempotency; A/B permission isolation.
6. **Rollback window maintained**
   - Keep the Expand schema in place. Do not apply the Contract step.

## Production vs existing Preview/rehearsal databases

**Production (initial release):** has no `sort_order` column at all. It is the
normal target of `production-expand.sql` and of the modified
`drizzle/0002_fixed_scarlet_spider.sql` on a fresh database.

**Existing Preview / rehearsal databases:** an earlier `0002` may already have
been applied with `sort_order` as `NOT NULL DEFAULT 0` plus the **full** unique
index `memories_tree_sort_order_uniq`. In that case:

- Do NOT re-run `production-expand.sql` or the modified `0002` against them —
  `ALTER TABLE ... ADD COLUMN` fails with "column already exists" and can leave
  a mixed index state.
- Do NOT reuse such a database for this release without first converting it
  from the old contract to the Expand state:

  ```
  BEGIN;
  DROP INDEX IF EXISTS memories_tree_sort_order_uniq;
  ALTER TABLE memories ALTER COLUMN sort_order DROP NOT NULL;
  ALTER TABLE memories ALTER COLUMN sort_order DROP DEFAULT;
  CREATE UNIQUE INDEX memories_tree_sort_order_uniq_partial
    ON memories (tree_id, sort_order) WHERE sort_order IS NOT NULL;
  COMMIT;
  ```

  This transition SQL is for preview environments only — it is NOT part of the
  automatic migration chain and must never be run on Production.
- The simplest option for verification is a fresh database: run the migration
  chain (`0000` + `0001` + `0002`) from scratch.

## Worker rollback (only if needed)

1. Roll back the Worker to the previous code via Cloudflare version ID:
   `wrangler rollback <version-id> --name lovetree-limone`.
2. The DB schema stays in Expand state (nullable `sort_order`).
3. The old Worker omits `sort_order` on INSERT, so it writes `NULL` rows — this
   is allowed by the partial unique index (no 23505 on the 2nd+ memory).
4. Do NOT drop the column or any index during the rollback window.

## Re-forward (after rollback, before redeploying new code)

1. Confirm the new Worker is NULL-tolerant (`computeNextSortOrder` ignores
   `sort_order IS NULL` rows).
2. Redeploy the new Worker (or keep it deployed — it is safe with NULL rows).
3. Run `reforward-backfill.sql` to deterministically backfill NULL rows
   (continuing from each tree's max non-NULL sort_order).
4. Verify: NULL rows = 0, duplicate `(tree_id, sort_order)` = 0, all ordering
   contiguous per tree.

## Contract (separate future release)

1. Rollback window ended and approved.
2. Verify NULL rows = 0 and duplicates = 0 (the `contract.sql` gates enforce this).
3. Run `contract.sql`:
   - drop partial unique index, create full unique index
   - `SET DEFAULT 0`, `SET NOT NULL`
4. This is a separately approved, separately scheduled release. It is NOT part
   of this PR's merge or the initial Expand deployment.

## Files

| File | Purpose |
|---|---|
| `production-expand.sql` | Initial release Expand migration, wrapped in an explicit transaction (mirrors `drizzle/0002_fixed_scarlet_spider.sql`) |
| `reforward-backfill.sql` | Manual NULL-row backfill during re-forward |
| `contract.sql` | Future Contract migration (NOT run by this release) |
