# LoveTree Release Operating Policy

## Current phase

LoveTree is currently operated as a pre-user demo/integration product. The active product direction is V4 / Next while Legacy and historical comparison routes remain preserved.

The operating goal is to keep ordinary UI/product iteration fast enough for direct product-owner review without weakening irreversible infrastructure safety.

## Ordinary reversible UI/UX loop

For ordinary product-screen, layout, interaction and Design Lab work:

```text
implementation
→ automated validation / CI GREEN
→ merge/push to main
→ guarded automatic Production deployment
→ direct product-owner visual review
→ remediation
→ CI GREEN
→ Production update
```

A separate Preview deployment is not a mandatory gate for every ordinary reversible UI change during this pre-user demo phase.

This policy replaces the older Preview-First proposal as the default demo workflow.

## What remains separately gated

Do not treat these as ordinary UI releases:

- destructive or irreversible DB migration/data mutation;
- Production data cleanup;
- Firebase/Auth identity or authorization policy;
- payment/billing;
- secrets, bindings or account configuration;
- privacy/security trust-boundary changes;
- Worker target/routing/domain changes;
- changes with an uncertain rollback path;
- disposable mutable Runtime E2E that could touch Production resources.

These require their own issue/contract, explicit target identity, fail-closed checks and rollback/cleanup evidence.

## Branch and CI

- Develop on an isolated issue/purpose branch, not directly on `main`.
- Re-fetch current `origin/main` before final integration.
- Run the validation appropriate to the change. For normal code changes the repository full gate is:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run db:check
```

- Do not suppress a failing test or weaken a contract merely to obtain GREEN.
- A mechanics-only local harness is not a deployed acceptance result.

## Production deployment

Production Worker identity is exactly:

```text
lovetree-limone
```

Never deploy to an accidental `lovetree-limone-production` target.

The guarded Production path is defined by repository scripts including:

```text
production:build:safe
production:deploy:safe
```

Use the scripts/source as the exact command contract. Do not replace them with an ad-hoc raw `wrangler deploy` that bypasses source-SHA, Worker identity, binding, build-provenance, Firebase-config, DB-state or current-version checks.

## Automatic main → Production path

The repository-side automatic Production deployment path is active. `.github/workflows/production-auto-deploy.yml` runs on pushes to `main` and may also be manually dispatched for controlled verification.

The steady-state path is:

```text
merge/push to main
→ required Production configuration presence check
→ exact HEAD/origin-main verification
→ full validation
→ production:build:safe
→ current Worker version verification
→ guarded dry-run
→ guarded deploy
→ active-version verification
→ Production smoke
→ rollback identity in Actions summary
```

The workflow is fail-closed. Missing required Production configuration, source mismatch, dirty state, validation failure, DB guard failure, Worker identity/version mismatch, deployment guard failure or smoke failure must stop the release rather than bypass the guard.

Emergency pause is explicit: set repository variable `LOVETREE_PRODUCTION_AUTO_DEPLOY=false`. Normal operating state is enabled/default-on. Re-enabling must restore the variable to a non-false value such as `true`.

Required Production secret names currently include:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`

Never print, log, commit or paste secret values into issue/PR evidence.

## Firebase validation safety

Production Firebase project identity is `relovetree`.

Do not use mutating Auth endpoints as configuration probes. In particular, do not call anonymous signup or another user-creation endpoint merely to verify an API key or project binding. Static configuration checks and non-mutating verification must be preferred.

An accidental anonymous-user creation during the 2026-08-10 auto-deploy setup was manually deleted in Firebase Console. The residual Production state was cleaned up, but the incident remains a reason to keep this rule explicit.

Disposable authenticated Runtime E2E remains isolated under #67 and must not create users in Production Firebase.

## Post-deploy review

For ordinary UI/demo releases, visually review representative V4 routes after deployment. Failures become normal remediation work:

```text
observe → fix branch → CI → merge → automatic Production update
```

Do not normalize a broken security/privacy/data boundary as a visual bug. Escalate it to the appropriate high-risk contract instead.

## Runtime E2E

Authenticated mutable Runtime E2E remains separate from ordinary Production visual review. Disposable users/data must not be created in the Production Firebase project merely to validate a release. The isolated mutable E2E contract remains tracked separately (#67).

## Design Lab and capabilities

`/design-lab/**` is allowed to contain internal prototypes that are not final LoveTree UI. Capability status must stay explicit:

```text
observed → mapped/prototype-requested → prototyped → validated → adopted
```

`prototyped` does not mean product-adopted. Internal experiments may ship in the demo Design Lab when CI is green, but they should not silently replace source-faithful V4 product screens.

## Rollback

Every Production release path must preserve enough identity to roll back the Worker to the exact previous version. Do not destroy compatible DB state during the normal Worker rollback window.

If a deployment guard blocks, fix or resolve the blocker; do not mutate Production merely to make the guard green and do not bypass the guard.
