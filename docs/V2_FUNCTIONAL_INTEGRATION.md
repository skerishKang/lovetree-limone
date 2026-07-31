# V2 Functional Limone Integration

## Overview

This document records the V2 functional integration work that connects the
Limone UI visual baseline (PR #4) to the shared LoveTree core (auth, API,
Neon DB, tree/memory CRUD).

## Branches and SHAs

| Item | Value |
| --- | --- |
| Starting main SHA | `fd9dfdd9492624e27f527bb61964c6df9ec10f0b` |
| PR #4 source SHA | `f6a3ba82469971f5243a13d70f022c913d348f77` |
| V2 branch | `feat/v2-functional-limone` |
| PR #4 status | Open Draft, unmerged, preserved |

## Shared Core (reused, not duplicated)

- `lib/auth.tsx` — Firebase Auth context, Google login, logout, token
- `lib/api.ts` — API client with Bearer token
- `lib/firebase.ts` — Firebase config and initialization
- `lib/auth-errors.ts` — Auth error messages and single-flight action
- `lib/tree-types.ts` — TreeRecord, MemoryRecord types, helpers
- `db/schema.ts` — Drizzle ORM Neon schema
- `server/api/` — API route handlers (trees, memories, comments, social)
- `worker/index.ts` — Cloudflare Worker entry

V1 and V2 share the same auth, API, DB schema, types, permission rules,
CRUD logic, idempotency clientKey handling, and error response contracts.

## V2 Components

All V2-specific components are in `app/components/v2/`:

| Component | Purpose |
| --- | --- |
| `V2Home.tsx` | Landing page with hero, login, community preview |
| `V2TreeCreateFlow.tsx` | Tree creation modal with real API POST |
| `V2MyTrees.tsx` | My trees list with real API GET |
| `V2TreeDetail.tsx` | Tree detail with view modes, memory CRUD |
| `V2GrowthTree.tsx` | Growth tree visualization |
| `V2DiaryView.tsx` | Diary view of memories |
| `V2StoryView.tsx` | Story view of memories |
| `V2AlbumView.tsx` | Album view of memories |
| `V2CommunityView.tsx` | Community browse with real API GET |
| `V2MomentEditor.tsx` | Moment create/edit form |

## V2 Styles

All V2-specific styles are in `app/styles/v2/`:

| File | Purpose |
| --- | --- |
| `home.css` | V2 home page, buttons, modal, toast, auth feedback |
| `tree.css` | V2 tree detail, memory list, composer |
| `diary.css` | V2 diary view |
| `story.css` | V2 story view |
| `album.css` | V2 album view |
| `community.css` | V2 community browse |

All V2 CSS classes use the `v2-` prefix to avoid conflicts with V1 styles.
V1 `globals.css`, `flow.css`, and `tree-pages.css` are unchanged.

## V2 Routes

| Route | Component |
| --- | --- |
| `/v2` | V2Home |
| `/v2/my-trees` | V2MyTrees |
| `/v2/trees/:id` | V2TreeDetail |
| `/v2/community` | V2CommunityView |

All V2 routes are client components wrapped in `AuthProvider`.

## Connected API Endpoints

| Method | Endpoint | V2 Component |
| --- | --- | --- |
| GET | `/api/trees` | V2MyTrees |
| POST | `/api/trees` | V2TreeCreateFlow |
| GET | `/api/trees/:id` | V2TreeDetail |
| PUT | `/api/trees/:id` | V2TreeDetail (visibility toggle) |
| GET | `/api/trees/:id/memories` | V2TreeDetail |
| POST | `/api/trees/:id/memories` | V2TreeDetail |
| PUT | `/api/memories/:id` | V2TreeDetail |
| DELETE | `/api/memories/:id` | V2TreeDetail |
| GET | `/api/community/trees` | V2CommunityView, V2Home |

## Removed Sample Data

- `sampleMoments` array from PR #4 — removed
- `communityTrees` hardcoded array from PR #4 — removed
- `localStorage` usage from PR #4 — removed
- All V2 components fetch real data from the shared API

## V2 Worker Configuration

- Config file: `wrangler-v2.jsonc`
- Worker name: `lovetree-limone-v2`
- `APP_ENV`: `staging`
- `API_MUTATIONS_ENABLED`: `true`
- `FIREBASE_PROJECT_ID`: `relovetree`
- `DATABASE_URL`: same Staging Neon connection

## Tests

New test file: `tests/v2-routing.test.mjs`

Covers:
1. V1 routes unchanged
2. V2 login UI uses shared Firebase auth
3. V2 tree creation
4. V2 first memory creation
5. V2 my-trees list
6. V2 tree detail
7. V2 memory edit
8. V2 memory delete
9. V2 public/private toggle
10. V2 community browse
11. V2 views share same MemoryRecord
12. Sample/localStorage removed
13. Loading/empty/error/retry states
14. V2 shared core (no duplicate auth/API)
15. V2 styles separated
16. V2 Worker config targets v2

## Comparison Principle

V1 and V2 use the same Staging Neon DB and Firebase project:
- Trees created in V1 are visible in V2
- Moments added in V2 are visible in V1

Both UIs read/write the same data through the same API.
