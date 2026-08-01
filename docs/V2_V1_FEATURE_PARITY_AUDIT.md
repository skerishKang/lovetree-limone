# V1 → V2 Feature Parity Audit

This document records the user-facing feature gap analysis between the V1
baseline (`app/page.tsx`, `app/my-trees`, `app/trees/[id]`) and the Limone V2
(`app/v2/**`, `app/components/v2/**`) on `main` at
`1edb1abc42005dadb72736b380474c2ad88a9a2d`.

It is written in terms of **user features**, not code structure.

## V1 features vs V2

| User feature | V1 | V2 | Classification |
| --- | --- | --- | --- |
| Anonymous public tree detail | ✓ readable without login | ✗ showed login screen | MUST_PORT |
| Anonymous public moment list | ✓ | ✗ blocked by login gate | MUST_PORT |
| YouTube thumbnail display | ✓ `youtubeThumbnail` + `<img>` | ✗ placeholder only | MUST_PORT |
| Clickable source link (`target=_blank rel=noreferrer noopener`) | ✓ | ✗ truncated URL text | MUST_PORT |
| Edit form pre-fill / switch-between-moments | ✓ | ✗ stale state on switch | MUST_PORT |
| Parent-moment self-reference guard | ✓ server-side | ✗ not enforced in editor | MUST_PORT |
| Post-create first-moment guide | ✓ discovery screen | ✗ straight to empty tree | MUST_PORT |
| Distinguish 401/403/404/server/network errors | ✓ | ✗ generic only | MUST_PORT |
| `sourceTypeLabel` user-facing labels | ✓ | ✗ raw internal value | MUST_PORT |
| Login choice (email/Google) on create intent | ✗ Google forced | ✗ Google forced | MUST_PORT (scope fix) |
| Community browse with sorts | ✓ | ✓ | already present |
| Tree create / memory CRUD | ✓ | ✓ | already present |
| Public/private access policy | ✓ server-enforced | ✓ server-enforced | already present |
| Query-based view switching (`?view=browse`) | ✓ | n/a (routes) | DO_NOT_PORT |
| Whole-screen discovery flow | ✓ | n/a (modal editor) | DO_NOT_PORT |
| Legacy hero/layout/CSS | ✓ | n/a | DO_NOT_PORT |

## MUST_PORT

1. **Anonymous public tree detail** — public trees readable without login;
   moments, all four views, and source links visible; edit/delete/visibility
   and owner-only forms hidden. Private trees follow the API policy: the
   server returns 404 to non-owners, so no title/memo/moment leaks.
2. **Real thumbnails and source links** — reuse `youtubeThumbnail()` on
   create/edit (consistent thumbnail refresh when `sourceUrl` changes);
   display-time fallback `resolveMemoryThumbnail()` for existing records;
   clickable source links with safe scheme guard and `target=_blank` +
   `rel="noreferrer noopener"`. Applied to growth tree, memory list, diary,
   story, and album board.
3. **Moment editor synchronization** — explicit sync when `editingMemory`
   changes; cancel returns to a blank create mode; no stale state when
   switching between moments; no `clientKey` on edit; `parentId` cannot
   self-reference.
4. **Post-create first-moment onboarding** — after tree creation, offer
   "첫 순간 기록하기" (reuse `V2MomentEditor`, navigate to detail, focus the
   composer) or "나중에 할게요" (normal empty tree detail). Tree create API
   is called once; `clientKey` idempotency preserved; onboarding state is a
   query param, never persistent data.
5. **Error and session recovery messages** — distinguish 401/403/404/5xx/
   network/validation with recovery actions; never expose stack, endpoint,
   SQL, or Firebase codes.
6. **User-facing source type labels** — `sourceTypeLabel()` everywhere the
   internal value was previously shown; stored enum values unchanged.

## OPTIONAL_PORT

- Nothing beyond the MUST_PORT list was judged beneficial for MVP parity.
  V1's browse sorts are already present in the V2 community view.

## DO_NOT_PORT (with reasons)

- **Query-based screen switching** (`?view=browse`) — V2 uses dedicated
  routes (`/v2/community`) and modals; the query mechanism is V1-internal
  state, not a user feature.
- **Whole-screen discovery first-moment flow** — V2 reuses `V2MomentEditor`
  inside the tree detail; copying the V1 discovery screen would duplicate
  the editor and weaken the four-view structure.
- **V1 layout/CSS/hero** — V2 has its own `v2-` design system; copying V1
  CSS is explicitly forbidden.
- **Sample/mock data and `localStorage`** — already removed; not ported back.

## Additional parity items discovered

- **Auth entry flow correction** (in scope, not a V1 port): the V2 create
  flow forced Google login for anonymous users. It now opens the shared
  auth UI (email/Google) and resumes the pending tree creation after login,
  so email users are not forced through Google.

## Shared core

- No changes to `lib/auth`, `lib/api`, `db/schema`, `server/**`, or the
  worker. Only additive helpers (`isSafeExternalUrl`,
  `resolveMemoryThumbnail`) were added to `lib/tree-types.ts`.
