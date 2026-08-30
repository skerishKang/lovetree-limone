# GitHub → Cloudflare Production deployment

Issue: #75

## Operating authority

For ordinary reversible LoveTree product/UI iteration, the Product Owner's current preference is **Production-first / rollback-first**.

Controlling policy:

`docs/operations/PRODUCTION_FIRST_ROLLBACK_POLICY.md`

The deployment path should preserve exact Production identity and rollback information without turning broad pre-Production testing into the default reason to delay a reversible Production change.

## Goal

Desired ordinary reversible loop:

```text
bounded change
→ Production deployment
→ direct Product Owner / operator inspection
→ KEEP / FIX FORWARD / ROLLBACK
```

Preview and exhaustive pre-Production CI are optional aids for ordinary reversible changes, not universal gates.

## Workflow

`.github/workflows/production-auto-deploy.yml`

Current triggers include:

- push to `main`;
- manual `workflow_dispatch`.

Automatic Production deployment is controlled by repository variable:

`LOVETREE_PRODUCTION_AUTO_DEPLOY`

`false` is the explicit emergency pause state.

The Production Worker target remains:

```text
lovetree-limone
```

Verified public Worker URL:

`https://lovetree-limone.charliekant.workers.dev`

## Required repository secrets

Required secret names may include:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`

Never print, log or commit their values.

The current automatic deployment path performs no intentional Production DB migration/write and no Firebase user/data mutation merely to validate a UI release.

## Deployment-safety responsibilities

The Production deployment path should continue to protect:

- exact Worker identity;
- exact source/deployment identity;
- required Production configuration presence;
- binding/target sanity;
- previous active Worker version or equivalent rollback identity;
- post-deploy visibility of what actually reached Production.

These are deployment/recovery controls.

They must not be confused with an exhaustive product test plan.

## Production-first behavior

For ordinary reversible product/UI/source-integration changes, the desired sequence is:

1. identify the bounded change;
2. preserve the previous known-working Production identity;
3. deploy the change to the real `lovetree-limone` Production Worker;
4. inspect the exact affected Production route/behavior;
5. keep the change if correct;
6. fix forward if the defect is small and obvious;
7. rollback/revert if the result is wrong, broad or uncertain.

CI, lint, typecheck, broad browser matrices and Preview may run when useful, but are not the Product Owner's mandatory pre-Production acceptance environment for ordinary reversible changes.

If an automated workflow currently performs broad validation before deployment, that is an implementation detail/legacy control to be reconciled separately. Do not describe it as the Product Owner's desired release order after this policy change.

## Post-deploy observation

Production observation is primary for ordinary reversible changes.

Recommended reporting fields:

```text
SOURCE_SHA = <exact commit>
PRODUCTION_VERSION = <exact Worker/deployment id>
PREVIOUS_VERSION = <rollback identity>
PRODUCTION_OBSERVED = YES/NO
OWNER_ACCEPTED = YES/NO/PENDING
ROLLBACK_READY = YES/NO
KNOWN_DEFECT = <exact defect or NONE>
```

A failed post-deploy observation is not a reason to pretend success. It is a reason to fix or roll back promptly.

## High-risk exception boundary

Do not use ordinary Production-first UI iteration as blanket authority for:

- destructive or irreversible DB/data mutation;
- Auth/Firebase identity or authorization changes;
- payments/billing;
- secrets/credentials/account configuration;
- security/privacy trust-boundary changes;
- provider/account authority changes;
- domain/Worker routing changes with uncertain rollback.

Those require explicit target-level recovery/safety treatment.

## Prohibited shortcuts

Even under Production-first operation:

- do not deploy to an accidental `lovetree-limone-production` target;
- do not print secrets;
- do not mutate Production DB/Firebase merely to make a validation step pass;
- do not rewrite Git history to hide a failed Production attempt;
- do not leave a known broken Production state in place merely to finish testing.

## Emergency pause

Set:

`LOVETREE_PRODUCTION_AUTO_DEPLOY=false`

when Production deployment itself must be paused.

## Rollback

Rollback/revert is a normal first-class operating action.

Every ordinary reversible Production deployment should preserve the previous active version or exact previous source identity so the operator can restore the known-working state quickly.

The preferred mindset is:

```text
DEPLOY EARLY
OBSERVE THE REAL PRODUCT
ROLL BACK WHEN WRONG
```
