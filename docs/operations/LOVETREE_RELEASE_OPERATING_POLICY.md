# LoveTree Release Operating Policy

## Current phase

LoveTree is currently operated as a pre-user demo/integration product. The active product direction is V4 / Next while Legacy and historical comparison routes remain preserved.

The Product Owner's current operating preference is **Production-first / rollback-first** for ordinary reversible UI/product iteration.

Controlling policy:

`docs/operations/PRODUCTION_FIRST_ROLLBACK_POLICY.md`

## Ordinary reversible UI/UX loop

For ordinary product-screen, layout, interaction, source-integration and Design Lab work, the default loop is:

```text
implementation
→ Production
→ direct Product Owner / operator review on the real Production surface
→ KEEP
   or FIX FORWARD
   or ROLLBACK / REVERT
→ repeat in Production as needed
```

A separate Preview deployment is optional, not mandatory.

A full local validation matrix or CI GREEN is also not a mandatory **pre-Production** gate for an ordinary reversible change when the Product Owner has authorized the Production-first operating mode and the previous working state can be restored.

Tests/CI may run concurrently or after the Production change and remain useful for diagnosis and regression prevention.

## Rollback identity is mandatory

Production-first does not mean unrecoverable mutation.

Before or at deployment, preserve enough information to identify:

```text
CURRENT_CHANGE = exact commit / deployment / scope
PREVIOUS_KNOWN_WORKING = exact commit / deployment
ROLLBACK_PATH = known and executable
PRODUCTION_OBSERVATION_TARGET = exact route / behavior
```

If the change is wrong:

- rollback/revert promptly when the defect is broad or unclear;
- fix forward when the defect is small and obvious;
- preserve the failed change as evidence instead of rewriting history.

## Tests and CI

For ordinary reversible product work, the preferred sequence is **not**:

```text
implementation → exhaustive tests → CI GREEN → Production
```

The preferred sequence is:

```text
implementation → Production → observe → keep/fix/rollback
```

Automated validation is evidence, not the Product Owner's mandatory viewing environment.

Do not suppress or falsify test failures. If tests are run and fail, report the failure accurately; however, a failing or not-yet-run broad test matrix is not by itself a reason to prevent an explicitly owner-authorized reversible Production trial with a known rollback path.

## High-risk exception boundary

Do not treat these as ordinary reversible UI releases unless the Product Owner gives specific target-level authorization and a credible recovery plan:

- destructive or irreversible DB migration/data mutation;
- Production data cleanup/deletion;
- Firebase/Auth identity or authorization policy;
- payment/billing/money movement;
- secrets, bindings or account configuration;
- privacy/security trust-boundary changes;
- provider/account authority changes;
- Worker/domain routing changes with uncertain recovery;
- any change with an uncertain rollback path.

These cases remain fail-closed around irreversible harm and recovery, regardless of whether a test suite is green.

## Branch and integration

GitHub remains the durable ledger of what changed and what can be restored.

For reversible product work, branch/PR/CI may be used when useful, but they are not a mandatory staging environment before the Product Owner can inspect the actual Production result.

Do not force-push or rewrite history merely to hide a failed Production attempt. Prefer an explicit revert/rollback so the failed change remains auditable.

## Production deployment

Production Worker identity is exactly:

```text
lovetree-limone
```

Never deploy to an accidental `lovetree-limone-production` target.

Existing guarded deployment scripts may still be used to preserve exact Worker identity, bindings, build provenance and rollback identity. Their role is **deployment safety and recoverability**, not enforcing an exhaustive pre-Production product test ritual.

Do not expose secret values in source, logs or reports.

## Automatic main → Production path

The repository-side automatic Production deployment path remains available through `.github/workflows/production-auto-deploy.yml`.

The operational intent after this policy change is:

```text
main/product change
→ guarded Production deployment with rollback identity
→ real Production observation
→ keep/fix/revert
```

Any workflow step that exists solely to make broad pre-Production testing a mandatory gate for ordinary reversible UI/product iteration should be treated as legacy behavior to be reconciled separately from this document. Do not describe that legacy workflow behavior as the Product Owner's desired operating policy.

Emergency pause remains explicit through repository variable `LOVETREE_PRODUCTION_AUTO_DEPLOY=false` when Production deployment itself must be stopped.

## Firebase / data safety

Production Firebase project identity is `relovetree`.

Do not create Production users or mutate Production data merely to test configuration. Disposable mutable Runtime E2E remains separate from ordinary Production visual/product review.

Production-first for UI/product iteration does not authorize irreversible data/auth mutation.

## Post-deploy review

Production is the primary acceptance surface for ordinary reversible changes.

After deployment:

```text
observe
→ KEEP if correct
→ FIX FORWARD if the defect is small and obvious
→ ROLLBACK / REVERT if the result is wrong or uncertain
```

A broken Production state should not be left in place merely to complete a test plan.

## Design Lab and source work

`/design-lab/**` and source/module work may be inspected directly in Production when the change is bounded and reversible.

Source fidelity, structural-split equivalence and known-regression tests remain valuable, but they should not turn into a separate long-running staging program that prevents direct Product Owner inspection of the actual result.

## Rollback

Every reversible Production release should preserve the previous known-working identity and a practical rollback/revert path.

Rollback is a normal operating action, not an exceptional failure of the process.

The governing preference is:

```text
PRODUCTION FIRST
OBSERVE REAL RESULT
KEEP / FIX / ROLLBACK
```
