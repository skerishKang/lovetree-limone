# LoveTree V4 Runtime E2E — Fail-Closed Preflight

Date: 2026-08-09  
Scope: V4 authenticated mutable Runtime E2E preparation  
Status: `RUNTIME_E2E_PREFLIGHT_READY / FIREBASE_TARGET_BLOCKED`

## 1. Purpose

This document narrows the remaining non-production Runtime E2E blocker after the V4 + P2 code gate.

The mutable journey must never fall back to Production infrastructure merely because a staging/test binding is missing. Before any signup, authenticated API mutation, Tree creation, Memory creation, or cleanup mutation, all target identities must pass the repository preflight.

The preflight is intentionally local/pure: it validates non-secret identity values only and performs no Cloudflare, Firebase, or Neon request.

## 2. Current readiness

### Ready — application/code gate

The V4 + P2 release candidate is code-gate GREEN at exact head documented by its final release PR. Existing browser acceptance uses mocked APIs and does not mutate a real database.

### Ready — isolated Neon target

Approved non-production database identity:

```text
E2E_NEON_PROJECT_ID=autumn-cherry-54971674
E2E_NEON_BRANCH_ID=br-purple-violet-azsxemfv
```

Branch name: `foundation-migration-check`.

The branch is non-default/non-Production. It was verified with zero Tree and Memory rows, received only the approved additive current-schema deltas, and remained Tree/Memory `0/0` after schema preparation.

Forbidden Production Neon branch:

```text
br-holy-scene-azwi84gb
```

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

It reads identity values from environment variables and exits non-zero on any missing, Production, unapproved, or mismatched target.

Required non-secret identity variables:

```text
E2E_EXPECTED_WORKER=<isolated worker matching the preview pattern>
E2E_FIREBASE_PROJECT_ID=<dedicated non-production Firebase project>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<same Firebase project>
FIREBASE_PROJECT_ID=<same Firebase project>
E2E_NEON_PROJECT_ID=autumn-cherry-54971674
E2E_NEON_BRANCH_ID=br-purple-violet-azsxemfv
APP_ENV=e2e
API_MUTATIONS_ENABLED=true
```

Secrets such as `DATABASE_URL`, Firebase API keys, Cloudflare tokens, passwords, and ID tokens are intentionally outside the preflight result and must never be printed by this command.

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
8. any `APP_ENV` other than exact `e2e`;
9. `API_MUTATIONS_ENABLED` that is absent or not true;
10. any missing required identity.

No network call or product mutation is attempted by the preflight itself.

## 5. Why mutations require `true` here

The standard public Preview deployment deliberately forces mutations off. Mutable Runtime E2E is a separate target class: mutations may be enabled only after Worker, Firebase, Neon project, Neon branch, and environment identity all pass the denylist and exact-match checks.

Therefore a successful preflight means only:

```text
IDENTITY SET IS ELIGIBLE FOR MUTABLE E2E SETUP
```

It does not mean a Worker has been deployed, a Firebase user exists, credentials are valid, or the end-to-end journey has passed.

## 6. Remaining setup before Runtime E2E

The remaining external setup is deliberately narrow:

1. provision or identify a Firebase project that is not `relovetree`;
2. register a non-production Firebase Web App;
3. enable the approved disposable Email/Password test-account path;
4. authorize the exact isolated Worker hostname where required;
5. bind the same non-production Firebase project ID to browser and Worker;
6. bind the prepared isolated Neon branch using a non-production secret scope;
7. run this preflight before any signup or mutation;
8. only after the preflight passes, run the desktop/mobile authenticated journey and exact-ID cleanup.

## 7. Explicit prohibitions

Until the dedicated Firebase target exists:

- do not use `relovetree` for disposable E2E accounts;
- do not point mutable Preview traffic at Production Neon;
- do not enable mutations on the ordinary read-only safe Preview as a shortcut;
- do not deploy to the canonical, staging, or V2 Worker;
- do not copy Production secrets into a Preview environment;
- do not report Runtime E2E as passed from mocked browser tests or HTTP-only checks.

## 8. Gate state

Current state after this preflight work:

```text
V4_CODE_GATE=GREEN
V4_E2E_ISOLATED_NEON=READY
V4_E2E_IDENTITY_PREFLIGHT=READY
V4_E2E_FIREBASE=BLOCKED
V4_MUTABLE_RUNTIME_E2E=BLOCKED
PRODUCTION_FALLBACK=FORBIDDEN
```

This blocker is infrastructure/setup work, not a reason to weaken the product or safety contracts.
