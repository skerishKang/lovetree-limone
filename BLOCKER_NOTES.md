# BLOCKER_NOTES.md

## UI Connectivity — Backend Sync Status (Slice 3, head e8c2d03)

### 1. Backend sortOrder concurrency (RESOLVED — synced at e8c2d03)

Comp3's backend work has landed on `feat/moment-data-spine-slice-1` and was
merged into this UI branch at `e8c2d03`. The backend now:
- Removes `sortOrder` from `MEMORY_CREATE_RULES`, `MEMORY_NESTED_CREATE_RULES`,
  and the `with-first-memory` memory rules (`d568566`)
- Uses `MAX(sortOrder) + 1` with a bounded retry loop on unique conflict
  (max 5) and returns 409 when exhausted
- Consolidates the migration chain into `0002_fixed_scarlet_spider.sql` with
  a `UNIQUE INDEX (tree_id, sort_order)` (`a11d4cc`)
- Removed `drizzle/0003_sort_order_backfill.sql`

**Impact on UI:** None. The UI already does not send `sortOrder` on create
and relies entirely on server-assigned values.

### 2. API sorting contract (verified)

The API `listTreeMemories` endpoint orders by
`sortOrder ASC, timestamp ASC, createdAt ASC, id ASC`.
The client-side `sortMoments()` in `lib/moment-model.ts` uses the same
contract. Tree/Timeline/Album views use `select*Moments()` which call
`sortMoments()` internally, so ordering is consistent between API and selector.

### 3. No dedicated Timeline/Album API endpoints

Timeline and Album views fetch memories via the existing
`GET /api/trees/:treeId/memories` endpoint and transform them client-side
using the canonical moment model. Sufficient for current data volume.

### 4. Moment create/update/delete requires owner auth

- `POST /api/trees/:id/memories` — create memory (no sortOrder from client)
- `PUT /api/memories/:id` — update memory
- `DELETE /api/memories/:id` — delete memory
Non-owner viewers see moment details read-only (edit/delete hidden).

### 5. Database connection required for full E2E save testing

The dev environment has no `DATABASE_URL` / Firebase credentials, so the
API is unreachable. The Tree/Timeline/Album pages correctly render error
states ("이 러브트리를 찾을 수 없어요.") when the API is unavailable.
E2E save-success video must be produced after a Preview DB + Preview
Worker is available.

### 6. Expected API contracts used by UI

- `GET /api/trees/:id` — tree metadata
- `GET /api/trees/:id/memories` — sorted memory list
- `POST /api/trees/:id/memories` — create memory (no sortOrder from client)
- `PUT /api/memories/:id` — update memory
- `DELETE /api/memories/:id` — delete memory
- Sorting: `sortOrder ASC, timestamp ASC, createdAt ASC, id ASC`
- Validation: title or memo required, timestamp YYYY-MM-DD,
  sortOrder server-assigned (client input rejected)
