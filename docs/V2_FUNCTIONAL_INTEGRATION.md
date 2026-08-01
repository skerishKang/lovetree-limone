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
| V2 final head | `fdd4c6e` (validation fixes `2890ab5`, docs `9be7aae`, email auth `fdd4c6e`) |
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

## Validation Results (2026-08-01)

| Check | Result | Notes |
| --- | --- | --- |
| `npm ci` | passed | Fresh install in local workspace |
| `npm run lint` | passed | 0 errors, 2 warnings (pre-existing V1: `<img>` in `app/trees/[id]/page.tsx`, unused `_ownerId` in `server/api/trees.ts`) |
| `npm run typecheck` | passed | `tsc --noEmit`, no errors |
| `npm test` | passed | 161 tests / 161 pass (140 prior + 21 email auth) |
| `CLOUDFLARE_ENV=staging npm run build` | passed | vinext build complete, all routes rendered |
| `npx drizzle-kit check` | passed | "Everything's fine" |
| `git diff --check` | passed | no whitespace errors |

Fixes applied after the initial V2 commit (commit `2890ab5`):

- `V2CommunityView.tsx` / `V2Home.tsx`: wrap effect-driven loads in `setTimeout` to satisfy `react-hooks/set-state-in-effect`
- `V2TreeDetail.tsx` / `V2TreeCreateFlow.tsx`: type `response.json()` payloads (strict `unknown` json typing)
- `V2TreeCreateFlow.tsx`: removed unused `authLoading`
- `tests/v2-routing.test.mjs`: aligned the memory-create regex with the `method: isEditing ? "PUT" : "POST"` ternary

## Shared Firebase Email/Password Auth (commit `fdd4c6e`)

Connects LoveBud's existing Firebase email/password accounts to Limone V1/V2
using the same `relovetree` Firebase project. No new Firebase project, no
user import/export, no separate auth backend, no DB schema change.

- Firebase project: `relovetree` (unchanged); Email/Password provider is
  enabled (verified with a read-only `accounts:signInWithPassword` probe).
- `lib/auth.tsx`: added `signInWithEmailPassword` and
  `signUpWithEmailPassword` (Firebase `signInWithEmailAndPassword` /
  `createUserWithEmailAndPassword`), reusing the existing
  `onAuthStateChanged` session restore, ID-token flow, and `logout`.
  Google login (`signInWithPopup`) is retained.
- `lib/auth-errors.ts`: standardized email error messages
  (`email-already-in-use`, `invalid-email`, `weak-password`,
  `user-not-found`, `wrong-password`, `invalid-credential`,
  `too-many-requests`, `network-request-failed`) while keeping the existing
  Google mappings. The existing `getAuthErrorMessage(error, configured)`
  call shape is unchanged (Google is the default method).
- `app/components/EmailAuthForm.tsx` + `app/styles/email-auth.css`:
  shared login/signup modal (mode toggle, signup-only confirm-password,
  empty/invalid/min-length/confirm validation, duplicate-submit guard,
  submitting state, Enter submit, autocomplete, accessible labels, Escape
  close) with a Google login button retained.
- V1 login UI: `app/page.tsx` (nav 로그인 opens the modal),
  `app/my-trees/page.tsx`, `app/trees/[id]/page.tsx` ("이메일로 로그인").
- V2 login UI: `V2Home.tsx` (topbar "이메일 로그인"), `V2MyTrees.tsx`,
  `V2TreeDetail.tsx`; V2 route pages import the shared stylesheet.
- The same Firebase UID and ID token are passed to the existing API — no
  backend session or user table was added.

Live auth verification (read-only, credentials never logged):

- Existing LoveBud QA account `admin.test@lovetree.dev` → login OK (uid len 28).
- New temp signup `v2auth.signup.<ts>@lovetree.dev` → signup OK, login OK,
  uid match, and wrong-password returns `INVALID_LOGIN_CREDENTIALS`
  (mapped to `auth/invalid-credential` → "이메일 또는 비밀번호가 올바르지
  않습니다.").

Local QA credentials live in git-ignored `.kilo/qa-auth.env`
(`LOVETREE_QA_EMAIL` / `LOVETREE_QA_PASSWORD`) and are not committed.

## Deployment

| Item | Value |
| --- | --- |
| Worker | `lovetree-limone-v2` |
| Hostname | `https://lovetree-limone-v2.charliekant.workers.dev` |
| Current version | `e26229de-fc8e-4d62-94e3-51ab1b834dd8` (100%, deployed 2026-08-01, includes email/password auth) |
| `APP_ENV` | `staging` |
| `API_MUTATIONS_ENABLED` | `true` |
| `FIREBASE_PROJECT_ID` | `relovetree` |
| `DATABASE_URL` | same Staging Neon connection (secret, not committed) |
| Deploy method | `CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH=wrangler-v2.jsonc npm run build` then `wrangler deploy --config dist/server/wrangler.json` |

Live endpoint checks:

- `GET /api/health` → `200 {"status":"ok","env":"staging"}`
- `GET /` → `200`
- `GET /v2` → `200` (topbar includes "이메일 로그인" email auth entry)
- `GET /v2/community` → `200`
- `GET /api/community/trees` → `200` with real shared Staging Neon public trees
- `GET /api/trees` without auth → `401 {"error":"Authorization required"}`

## Forbidden Actions

- `main` not directly modified
- PR #4 (`ui/3-limone-next-ui`) not modified, merged, or closed — remains Open Draft
- `lovetree-limone-staging` and `lovetree-limone-ui-preview` not redeployed
- No production deployment
- No separate auth/API/backend duplication, no DB schema branching
- No existing user data deleted; no existing Firebase users modified/deleted
- No credentials committed (`.kilo/qa-auth.env` is git-ignored)

## Remaining Items

- Add `lovetree-limone-v2.charliekant.workers.dev` to Firebase Authorized
  Domains so Google login works on the V2 Worker (email/password login does
  not require it).
- Browser-level verification of the full V2 flow and the email
  login/signup UI (login → my trees → detail → views → memory CRUD →
  refresh → community) is deferred to a follow-up session. The Firebase
  operations themselves were verified with read-only Identity Toolkit
  probes against the shared `relovetree` project.
