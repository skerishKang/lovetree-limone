# LoveTree V4 P0 Non-Production Runtime E2E Requirements

Date: 2026-08-08  
Track: A — V4 product-spine integration  
Scope: P0 Runtime E2E only  
PR: #46 (`feat/v4-product-spine-integration-20260808`)

## 1. Status and purpose

P0 Code Gate is already GREEN. This document defines the minimum infrastructure required to run the remaining Runtime E2E without touching Production data, Production Firebase configuration, or the Production Worker.

Current conclusion: **no existing end-to-end non-production target is safe and contract-compatible enough to run the P0 Runtime E2E today.**

The repository has pieces of non-production infrastructure, but they do not form one safe exact-head runtime:

- guarded isolated Cloudflare Preview deployment exists, but intentionally forces `API_MUTATIONS_ENABLED=false` and does not carry secret metadata;
- shared/protected Workers `lovetree-limone`, `lovetree-limone-staging`, and `lovetree-limone-v2` must not be used as disposable PR E2E targets;
- the browser/API Firebase project evidenced by the current repository is `relovetree`; no separate staging/test Firebase project or Auth Emulator integration is configured;
- existing Neon child branches are isolated from the Production branch, but none currently matches the exact P0 database contract in `db/schema.ts`;
- the current A-track GitHub Actions workflow performs local Code Gate validation only and contains no non-production E2E secrets or preview deployment step.

No cloud resource is created by this document.

## 2. Current infrastructure findings

### 2.1 Cloudflare

Current `wrangler.jsonc` defines:

- canonical Worker: `lovetree-limone`;
- top-level fail-safe: `APP_ENV=staging`, `API_MUTATIONS_ENABLED=false`, `FIREBASE_PROJECT_ID=relovetree`;
- named `staging` environment: `API_MUTATIONS_ENABLED=true`, `FIREBASE_PROJECT_ID=relovetree`, `DATABASE_URL` required;
- Production environment: `lovetree-limone`, `APP_ENV=production`, mutations enabled.

The canonical isolated-preview deploy guard allows only names matching:

`lovetree-limone-<slug>-preview`

and explicitly protects:

- `lovetree-limone`
- `lovetree-limone-staging`
- `lovetree-limone-v2`

Its generated safe config forces `workers_dev=true`, `APP_ENV=staging`, `API_MUTATIONS_ENABLED=false`, and rejects secret metadata. Therefore the existing standard isolated Preview path is safe for UI/browser inspection but **cannot create a Tree or first Memory**.

### 2.2 Firebase Auth

Current client configuration is supplied only through:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

Current server token validation requires the Firebase token `aud` and `iss` to match Worker `FIREBASE_PROJECT_ID`.

Repository and prior deployment evidence identify `relovetree` as the active Firebase project. No separate test/staging Firebase project is configured in the repository, and no `connectAuthEmulator` integration exists.

Therefore P0 Runtime E2E must **not** create a disposable user until a Firebase target distinct from `relovetree` is available and verified.

### 2.3 Neon

Connected Neon project:

- project: `lovetree-limone`
- project ID: `autumn-cherry-54971674`

Read-only verification on 2026-08-08 identified:

| Branch | Branch ID | Trees / Memories | `sort_order` | `trees.keywords` | P0 exact-contract candidate |
|---|---|---:|---|---|---|
| `production` | `br-holy-scene-azwi84gb` | 7 / 4 | nullable, no default; partial unique index | `jsonb` | **NO — Production** |
| `release-rehearsal-20260806-20260806T035048Z` | `br-spring-snow-azjw3spl` | 8 / 5 | NOT NULL DEFAULT 0; full unique index | `jsonb` | NO — old contract |
| `pr39-preview-backend` | `br-fragrant-wave-az4hydys` | 8 / 5 | absent | `jsonb` | NO |
| `pr40-preview-ui` | `br-lingering-shape-azwlug2x` | 8 / 5 | absent | `jsonb` | NO |
| `foundation-migration-check` | `br-purple-violet-azsxemfv` | 0 / 0 | absent | `jsonb` | NO |

Current `db/schema.ts` requires nullable `memories.sort_order` plus the partial unique index on `(tree_id, sort_order) WHERE sort_order IS NOT NULL`.

The Production branch is the only existing branch verified to match that contract, and it is forbidden for Runtime E2E writes.

## 3. Required frontend preview target

Provide one isolated Cloudflare Worker containing the **exact PR #46 HEAD** under test.

Requirements:

- Worker name must match `lovetree-limone-<slug>-preview`;
- must not be any protected Worker listed above;
- must use `workers.dev`, not a Production route/custom domain;
- must report a non-production environment from `/api/health`;
- must run only the PR HEAD being tested;
- must never inherit Production routes, queues, triggers, service bindings, or Production secrets;
- must allow API mutations **only after** all Firebase and DB isolation guards below pass.

The existing `preview:deploy:safe` path cannot be used unchanged because it intentionally disables mutations and strips secrets. A future P0 E2E preview mode must remain fail-closed and may expose only the explicitly approved non-production bindings described here.

## 4. Required Firebase Auth target

Preferred target: a dedicated non-production Firebase project, for example a project explicitly designated `lovetree-e2e` or `lovetree-staging` by the operator.

Mandatory conditions:

- project ID must **not** equal `relovetree`;
- Email/Password Auth enabled for disposable test accounts;
- exact Cloudflare Preview hostname added to that non-production project's Authorized Domains where required;
- browser `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and Worker `FIREBASE_PROJECT_ID` must be identical;
- API key/auth domain/project ID must all belong to the same non-production Firebase Web App;
- no Production Firebase settings or users may be modified.

Alternative: Firebase Auth Emulator is acceptable only after explicit emulator support exists in both client and API verification. The current API verifier expects Google Secure Token signatures for a real Firebase project, so the emulator is **not an existing drop-in target** today.

## 5. Required API target

The API must execute in the same isolated Preview Worker as the frontend or in a separately isolated non-production Worker with an explicit non-production base URL.

Required runtime vars:

- `APP_ENV=e2e` or an equivalently explicit non-production marker;
- `API_MUTATIONS_ENABLED=true` only on this E2E target;
- `FIREBASE_PROJECT_ID=<dedicated non-production Firebase project>`;
- `DATABASE_URL=<isolated non-production Neon endpoint>` as a secret.

Before any POST, the test runner must confirm:

1. `/api/health` is reachable;
2. health reports a non-production environment;
3. Worker name/URL is not protected or Production;
4. Firebase project is not `relovetree`;
5. DB project/branch identity matches the approved isolated target.

Any failed or unresolved preflight check must block all mutations.

## 6. Required isolated DB target

Use a Neon branch/database that is independently writable and disposable without changing `br-holy-scene-azwi84gb` (`production`).

Before use, read-only schema verification must prove the target matches the exact repository contract, including at minimum:

- `trees.keywords = jsonb`;
- `memories.sort_order` exists and is nullable;
- `memories.sort_order` has no Production-incompatible default;
- partial unique `(tree_id, sort_order) WHERE sort_order IS NOT NULL` exists and is valid;
- `(tree_id, client_key)` unique index exists;
- tables/columns required by `POST /api/trees/with-first-memory` exist.

None of the existing child branches listed in section 2.3 currently satisfies all of these conditions. A future operator may prepare a dedicated E2E branch, but **this Runtime Gate does not create or migrate one**.

## 7. Environment variables

### Browser build

```text
NEXT_PUBLIC_FIREBASE_API_KEY=<non-production Web API key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<non-production auth domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<non-production Firebase project ID>
```

### Worker runtime

```text
APP_ENV=e2e
API_MUTATIONS_ENABLED=true
FIREBASE_PROJECT_ID=<same non-production Firebase project ID>
DATABASE_URL=<isolated Neon branch connection string>  # secret
```

### CI/preflight identity values

Store non-secret identifiers separately so the runner can fail closed before mutation:

```text
E2E_EXPECTED_WORKER=<isolated preview Worker name>
E2E_FIREBASE_PROJECT_ID=<non-production project ID>
E2E_NEON_PROJECT_ID=autumn-cherry-54971674
E2E_NEON_BRANCH_ID=<approved non-production branch ID>
```

## 8. Secrets policy

- Put E2E secrets in a dedicated GitHub Environment or equivalent non-production secret scope.
- Never reuse a Production `DATABASE_URL` secret.
- Never expose Firebase API keys, passwords, ID tokens, DB URLs, or Cloudflare credentials in logs/artifacts.
- Never commit `.env.*`, `.dev.vars*`, credential files, or generated Worker secret files.
- Credential files, if required during a run, must be mode `0600` and deleted only after cleanup verification.
- Redact user email, UID, password, token, API key, and DB connection string from logs.
- E2E deployment credentials must have no permission to modify protected Production Worker configuration where practical.

## 9. Test account policy

Use a fresh disposable Email/Password account in the dedicated non-production Firebase project.

Required properties:

- unique per run;
- never use a real user email;
- record exact Firebase UID in protected run state for cleanup;
- password/token retained only until cleanup completes;
- no account is created in `relovetree`;
- account deletion must be verified, not assumed.

The repository's existing disposable-user cleanup harness may be reused for cleanup semantics: retain the ID token until deletion is verified, redact credentials, and fail the run when cleanup is incomplete.

## 10. Test-data cleanup

Every run must track exact identifiers returned by the API:

- Firebase UID;
- Tree ID;
- first Memory ID;
- client/idempotency key;
- E2E run ID.

Cleanup rules:

1. delete only rows/accounts created by the current run and identified by exact IDs;
2. never delete by title, prefix, broad date range, or owner pattern;
3. DB cleanup targets only the approved isolated branch;
4. verify Tree and Memory are absent after cleanup;
5. verify Firebase account deletion;
6. cleanup failure makes the Runtime Gate fail;
7. if Production identity cannot be excluded with certainty, perform no cleanup mutation and fail closed.

## 11. Production isolation guards

All guards are mandatory before the first signup or API mutation.

### Cloudflare denylist

Reject target Worker if it equals:

- `lovetree-limone`
- `lovetree-limone-staging`
- `lovetree-limone-v2`

Require the isolated preview name pattern and a `workers.dev` hostname.

### Firebase denylist

Reject the run if:

```text
NEXT_PUBLIC_FIREBASE_PROJECT_ID == relovetree
FIREBASE_PROJECT_ID == relovetree
```

Also reject browser/API project-ID mismatch.

### Neon denylist

Reject the run if approved branch ID equals:

```text
br-holy-scene-azwi84gb
```

and require the exact expected non-production branch ID from CI/preflight configuration.

### Runtime guard

- `/api/health` must explicitly report non-production;
- API mutations must remain disabled until all identity checks pass;
- no migration is run as part of browser E2E;
- no Production route/domain/secret is permitted;
- any ambiguous target identity is a hard BLOCK, never a warning.

## 12. Exact P0 Runtime E2E flow

Run the same logical flow at both required viewports.

1. Open `/v4` on the exact-head isolated Preview.
2. Confirm V4 home and existing discovery entry are present.
3. Enter the existing discovery modal/flow.
4. Sign up with the disposable non-production Firebase Email/Password account, or sign in if the run created the account in a controlled setup step.
5. Enter Tree name and first Memory discovery fields.
6. Submit through the existing `POST /api/trees/with-first-memory` path.
7. Require a successful response containing the created Tree and first Memory identities.
8. Require navigation to server-backed `/trees/:id` for that Tree.
9. Verify the newly created Memory is rendered from server data.
10. Reload the page.
11. Verify the same Tree and Memory restore from the API/DB, not authoritative localStorage.
12. Log out.
13. Verify authenticated owner UI/data is no longer available as an authenticated session.
14. Log in again using the same disposable account.
15. Navigate to the same server-backed Tree.
16. Verify the exact same Tree ID and Memory ID/data are restored.
17. Run exact-ID DB and Firebase cleanup.
18. Verify cleanup completion.

## 13. Desktop acceptance — 1280×800

PASS requires all of the following:

- `/v4` HTTP/runtime load succeeds;
- no page error or unexpected console error;
- existing home → discovery UX is preserved;
- discovery modal is usable without clipping/blocked controls;
- Firebase signup/login completes against the non-production project;
- atomic Tree + first Memory creation succeeds once;
- URL enters `/trees/:id` using the returned server Tree ID;
- first Memory is visible;
- refresh restores server-backed data;
- logout clears the authenticated session;
- relogin restores access to the same Tree/Memory;
- no horizontal overflow that blocks the journey;
- exact-ID cleanup succeeds;
- all Production isolation guards remain true through the run.

## 14. Mobile acceptance — 390×844

Apply every desktop functional acceptance criterion plus:

- discovery modal and inputs remain within the viewport;
- primary save/login/logout controls remain reachable;
- fixed/mobile navigation does not cover required controls;
- no horizontal page overflow;
- server-backed Tree and first Memory remain readable after navigation and refresh;
- relogin/restore works without a desktop-only interaction dependency.

## 15. Minimum setup work before Runtime E2E can run

Only infrastructure required for P0 Runtime E2E should be added; no product/P1 scope is needed.

1. Identify or provision a **dedicated non-production Firebase project** distinct from `relovetree`.
2. Register a non-production Firebase Web App and authorize the exact isolated Preview domain.
3. Identify or provision an **isolated Neon branch** and make its schema exactly match current `db/schema.ts` without touching Production.
4. Provide a fail-closed E2E Preview deployment path that keeps the existing protected-Worker denylist but permits only the approved non-production `DATABASE_URL` and Firebase project, with mutations enabled only after preflight.
5. Add dedicated non-production CI/runner secrets and identity values.
6. Add/enable disposable test account creation plus verified exact-ID cleanup.
7. Execute the two viewport E2E runs.

No UI redesign, Community/Graph/Film Studio work, B-track work, schema expansion, or Production deployment belongs in this setup.

## 16. Recommended setup order

1. **Firebase isolation first** — establish a project ID that is provably not `relovetree`.
2. **DB isolation second** — establish an exact-schema Neon branch and record its branch ID.
3. **Preview/API isolation third** — bind only those two targets to an exact-head isolated Worker.
4. **Fail-closed preflight fourth** — verify Worker, Firebase project, DB branch, health environment, and protected-target denylist before mutation.
5. **Disposable account/cleanup fifth** — verify account and exact-row cleanup mechanics against non-production targets.
6. **1280×800 E2E**.
7. **390×844 E2E**.
8. **Cleanup verification and Runtime Gate report**.

## 17. Gate decision

Until the three writable targets — frontend/API, Firebase Auth, and Neon DB — are simultaneously isolated and contract-compatible, the correct state is:

`A_TRACK_RUNTIME_E2E_BLOCKED`

This does not change the already-green P0 Code Gate.