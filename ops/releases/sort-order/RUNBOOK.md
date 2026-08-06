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
   - Run `production-expand.sql` against Production (single transaction or the
     exact statements in order). This adds nullable `sort_order`, deterministic
     backfill per tree (`created_at ASC, id ASC`), and the partial unique index.
3. **Schema verification**
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
| `production-expand.sql` | Initial release Expand migration (mirrors `drizzle/0002_fixed_scarlet_spider.sql`) |
| `reforward-backfill.sql` | Manual NULL-row backfill during re-forward |
| `contract.sql` | Future Contract migration (NOT run by this release) |
