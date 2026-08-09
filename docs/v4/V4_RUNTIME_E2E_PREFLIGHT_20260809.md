# LoveTree V4 Runtime E2E — Fail-Closed Preflight

Date: 2026-08-09  
Scope: V4 authenticated mutable Runtime E2E preparation  
Status: `RUNTIME_E2E_PREFLIGHT_READY / SERVER_GUARD_READY / FIREBASE_TARGET_BLOCKED`

## 1. Purpose

This document narrows the remaining non-production Runtime E2E blocker after the V4 + P2 code gate.

The mutable journey must never fall back to Production infrastructure merely because a staging/test binding is missing. Before any signup, authenticated API mutation, Tree creation, Memory creation, or cleanup mutation, all target identities and the actual database endpoint binding must pass the repository preflight.

The preflight performs no Cloudflare, Firebase, or Neon network request. It validates configured identities and parses only the hostname from the `DATABASE_URL` secret; the URL, credentials, tokens, API keys, and passwords are never returned or printed.

The API also applies the same critical Firebase/DB deny rules again at runtime whenever `APP_ENV=e2e`, so bypassing the CLI does not automatically authorize mutations.

## 2. Current readiness

### Ready — application/code gate

The V4 + P2 release candidate is code-gate GREEN at exact head documented by its final release PR. Existing browser acceptance uses mocked APIs and does not mutate a real database.

### Ready — isolated Neon target

Approved non-production database identity:

```text
E2E_NEON_PROJECT_ID=autumn-cherry-54971674
E2E_NEON_BRANCH_ID=br-purple-violet-azsxemfv
approved endpoint=ep-red-paper-azsjzfte.c-3.ap-southeast-1.aws.neon.tech
```

Branch name: `foundation-migration-check`.

The branch is non-default/non-Production. It was verified with zero Tree and Memory rows, received only the approved additive current-schema deltas, and remained Tree/Memory `0/0` after schema preparation.

Forbidden Production database identity:

```text
Production branch=br-holy-scene-azwi84gb
Production endpoint=ep-old-sky-az0qftwa.c-3.ap-southeast-1.aws.neon.tech
```

The preflight validates both declared branch identity and the hostname parsed from the actual `DATABASE_URL`, so a Production URL cannot pass merely because `E2E_NEON_BRANCH_ID` was set to a non-production value.

### Ready — isolated Preview deployment guard

Repository deployment safety already provides:

```text
npm run preview:deploy:safe
```

Protected Workers are denied, and the target must match:

```text
^lovetree-limone-[a-z0-9][a-z0-9-]*-preview$
```

The existing standard safe Preview intentionally disables API mutations. That path remains suitable for read-only visual review, not mutable Runtime E2E.

### Blocked — dedicated Firebase target

Current repository runtime configuration uses Firebase project:

```text
relovetree
```

For Runtime E2E, `relovetree` is treated as Production and is hard-denied.

A dedicated non-production Firebase project and matching Web App configuration are still required. Until that exists, mutable Runtime E2E remains blocked by design.

## 3. Canonical preflight command

The repository exposes:

```bash
npm run v4:e2e:preflight
```

It reads configured identity values plus `DATABASE_URL` and exits non-zero on any missing, Production, unapproved, mismatched, or misbound target.

Required values:

```text
E2E_EXPECTED_WORKER=<isolated worker matching the preview pattern>
E2E_FIREBASE_PROJECT_ID=<dedicated non-production Firebase project>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<same Firebase project>
FIREBASE_PROJECT_ID=<same Firebase project>
E2E_NEON_PROJECT_ID=autumn-cherry-54971674
E2E_NEON_BRANCH_ID=br-purple-violet-azsxemfv
DATABASE_URL=<secret URL whose hostname is ep-red-paper-azsjzfte.c-3.ap-southeast-1.aws.neon.tech>
APP_ENV=e2e
API_MUTATIONS_ENABLED=true
```

The PASS output may report the database hostname because it is a non-secret target identity. It never reports the full URL, username, password, query string, Firebase API key, Cloudflare token, or ID token.

## 4. Fail-closed rules

The mutable Runtime E2E preflight rejects all of the following:

1. protected Worker names:
   - `lovetree-limone`
   - `lovetree-limone-staging`
   - `lovetree-limone-v2`
2. Worker names outside the isolated Preview naming contract;
3. `relovetree` in any expected/browser/server Firebase project identity;
4. any mismatch among expected, browser, and Worker Firebase project IDs;
5. any Neon project other than `autumn-cherry-54971674`;
6. Production Neon branch `br-holy-scene-azwi84gb`;
7. any Neon branch other than approved isolated branch `br-purple-violet-azsxemfv`;
8. missing or malformed `DATABASE_URL`;
9. Production Neon endpoint `ep-old-sky-az0qftwa.c-3.ap-southeast-1.aws.neon.tech`;
10. any database hostname other than approved isolated endpoint `ep-red-paper-azsjzfte.c-3.ap-southeast-1.aws.neon.tech`;
11. any `APP_ENV` other than exact `e2e`;
12. `API_MUTATIONS_ENABLED` that is absent or not true;
13. any missing required identity.

No network call or product mutation is attempted by the preflight itself.

## 5. Server-side defense in depth

For non-E2E environments, the existing mutation configuration behavior is preserved.

For `APP_ENV=e2e`, `API_MUTATIONS_ENABLED=true` is no longer sufficient by itself. Before the API constructs a DB context or invokes a mutation router, the server rechecks:

1. `FIREBASE_PROJECT_ID` exists;
2. `FIREBASE_PROJECT_ID != relovetree`;
3. `DATABASE_URL` parses as a Postgres URL;
4. its hostname is not the Production Neon endpoint;
5. its hostname exactly equals the approved isolated endpoint.

If any runtime binding check fails, POST/PUT/PATCH/DELETE returns the existing mutation-disabled `503` before router or DB work.

The stricter rules are scoped only to the dedicated `e2e` runtime class; current Production and shared staging behavior is not silently changed by this safety addition.

### E2E health response

Outside `APP_ENV=e2e`, `/api/health` keeps the legacy response shape.

Inside E2E it adds only non-secret runtime identity status:

```json
{
  "status": "ok",
  "env": "e2e",
  "e2e": {
    "firebaseProjectId": "<non-production project id>",
    "mutationsEnabled": true,
    "databaseBinding": "approved"
  }
}
```

No database URL, database credential, Firebase API key, token, or password is returned.

This gives the later live runner a runtime observation point before signup or mutation.

## 6. Why mutations require `true` here

The standard public Preview deployment deliberately forces mutations off. Mutable Runtime E2E is a separate target class: mutations may be enabled only after Worker, Firebase, Neon project, Neon branch, actual DB endpoint, and environment identity all pass the denylist and exact-match checks.

Therefore a successful CLI preflight plus safe E2E health response means only:

```text
IDENTITY AND RUNTIME BINDINGS ARE ELIGIBLE FOR MUTABLE E2E
```

It does not mean a Firebase user exists, credentials are valid, or the end-to-end journey has passed.

## 7. Remaining setup before Runtime E2E

The remaining external setup is deliberately narrow:

1. provision or identify a Firebase project that is not `relovetree`;
2. register a non-production Firebase Web App;
3. enable the approved disposable Email/Password test-account path;
4. authorize the exact isolated Worker hostname where required;
5. bind the same non-production Firebase project ID to browser and Worker;
6. bind `DATABASE_URL` to the prepared isolated Neon endpoint in a non-production secret scope;
7. run the CLI preflight before deployment/mutation;
8. verify `/api/health` reports `env=e2e`, the expected Firebase project, `mutationsEnabled=true`, and `databaseBinding=approved`;
9. only then run the desktop/mobile authenticated journey and exact-ID cleanup.

## 8. Explicit prohibitions

Until the dedicated Firebase target exists:

- do not use `relovetree` for disposable E2E accounts;
- do not point mutable Preview traffic at Production Neon;
- do not trust a declared branch ID without verifying the actual `DATABASE_URL` hostname;
- do not enable mutations on the ordinary read-only safe Preview as a shortcut;
- do not deploy to the canonical, staging, or V2 Worker;
- do not copy Production secrets into a Preview environment;
- do not report Runtime E2E as passed from mocked browser tests or HTTP-only checks.

## 9. Gate state

Current state after the preflight and runtime defense work:

```text
V4_CODE_GATE=GREEN
V4_E2E_ISOLATED_NEON=READY
V4_E2E_IDENTITY_AND_DB_PREFLIGHT=READY
V4_E2E_SERVER_MUTATION_GUARD=READY
V4_E2E_RUNTIME_HEALTH_IDENTITY=READY
V4_E2E_FIREBASE=BLOCKED
V4_MUTABLE_RUNTIME_E2E=BLOCKED
PRODUCTION_FALLBACK=FORBIDDEN
```

This blocker is infrastructure/setup work, not a reason to weaken the product or safety contracts.
