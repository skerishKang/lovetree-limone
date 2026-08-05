# BLOCKER_NOTES.md

## UI Connectivity — Known Backend Issues (as of PR #39 head 7d53480)

### 1. sortOrder client input removed but home page still sends it (FIXED)

**File:** `app/page.tsx` line ~185
**Status:** Fixed in this branch.
The home page `plantMoment()` was sending `sortOrder: "0"` in the POST body.
The backend (PR #39 comp3 work) removes `sortOrder` from the create validation
rules, so this field would be silently ignored. The client-side `sortOrder`
has been removed from the payload to match the server-authoritative design.

### 2. Backend sortOrder concurrency (UNRESOLVED — comp3 in progress)

The backend `createMemory` / `createTreeMemory` currently uses
`SELECT MAX(sortOrder) + 1` without a unique constraint or retry loop.
Comp3 is working on adding a `UNIQUE INDEX (tree_id, sort_order)` and a
bounded retry algorithm. Until that lands, concurrent appends to the same
tree could theoretically produce duplicate sortOrder values.

**Impact on UI:** None for normal single-user flows. The UI does not send
sortOrder and relies entirely on server-assigned values.

### 3. Migration chain not finalized (UNRESOLVED — comp3 in progress)

The `0003_sort_order_backfill.sql` migration exists but is not registered
in the drizzle `_journal.json`. Comp3 is consolidating the migration chain.
**Impact on UI:** None — UI does not interact with migrations directly.

### 4. API sorting contract

The API `listTreeMemories` endpoint orders by
`sortOrder ASC, timestamp ASC, createdAt ASC, id ASC`.
The client-side `sortMoments()` in `lib/moment-model.ts` uses the same
contract. Both Timeline and Album views use `selectTimelineMoments()` /
`selectAlbumMoments()` which call `sortMoments()` internally, so the
ordering is consistent between API and selector.

### 5. No dedicated Timeline/Album API endpoints

Timeline and Album views fetch memories via the existing
`GET /api/trees/:treeId/memories` endpoint and transform them client-side
using the canonical moment model. This is sufficient for the current data
volume. If server-side pagination becomes necessary, dedicated endpoints
can be added later.

### 6. Moment detail modal edit/delete requires owner auth

The `MomentDetailModal` component calls `PUT /api/memories/:id` and
`DELETE /api/memories/:id` which require the authenticated user to be the
tree owner. Non-owner viewers see the detail modal in read-only mode
(edit/delete buttons hidden).

### 7. Database connection required for full UI testing

Screenshots were captured against a dev server without `DATABASE_URL`
configured. The tree/timeline/album pages correctly show error states
("이 러브트리를 찾을 수 없어요.") when the API is unavailable. Full
end-to-end testing with real data requires a Neon PostgreSQL connection.

### 8. Expected API contracts used by UI

- `GET /api/trees/:id` — tree metadata
- `GET /api/trees/:id/memories` — sorted memory list
- `POST /api/trees/:id/memories` — create memory (no sortOrder from client)
- `PUT /api/memories/:id` — update memory
- `DELETE /api/memories/:id` — delete memory
- Sorting: `sortOrder ASC, timestamp ASC, createdAt ASC, id ASC`
- Validation: title or memo required, timestamp YYYY-MM-DD, sortOrder server-assigned
