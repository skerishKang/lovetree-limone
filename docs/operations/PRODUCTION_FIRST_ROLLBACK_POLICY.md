# LoveTree Production-First / Rollback-First Operating Policy

## Authority

This policy records the Product Owner's operating preference for LoveTree product iteration.

For ordinary **reversible** product/UI/UX/source-integration changes, the default is **Production first, observe in the real product, then keep/fix/rollback**.

This policy supersedes older wording that makes Preview, local browser QA, pre-merge CI GREEN, or exhaustive pre-Production validation a mandatory release gate for ordinary reversible product iteration.

## Core loop

```text
implement the bounded change
→ put the change in Production
→ Product Owner / operator inspects the real Production result
→ KEEP if correct
→ FIX FORWARD if the problem is small and obvious
→ ROLLBACK / REVERT if the result is wrong
→ try the corrected change again in Production
```

The purpose of tests, CI, Preview and local browser checks is to help when useful. They are **not the default reason to delay a reversible Production change**.

## Default for reversible work

For ordinary reversible work:

- Production is the primary acceptance environment.
- A separate Preview is optional, not mandatory.
- Local browser QA is optional, not mandatory before Production.
- CI may run in parallel or after the Production change; CI GREEN is not a mandatory precondition for the Product Owner to inspect a reversible Production change.
- A failed pre-Production test does not automatically prevent an explicitly owner-authorized reversible Production trial when rollback is known and available.
- Do not spend disproportionate time constructing elaborate pre-Production harnesses when the same question can be answered faster by a bounded Production change plus direct observation.
- Preserve exact rollback/revert identity before or at deployment so the prior working state can be restored quickly.

## Rollback-first discipline

Production-first does **not** mean mutation without recovery information.

For every ordinary reversible Production change, keep enough identity to answer:

```text
WHAT_CHANGED = exact commit / deployment / file scope
PREVIOUS_KNOWN_WORKING = exact commit / deployment identity
ROLLBACK_PATH = known and executable
OBSERVATION_TARGET = exact Production route / behavior
```

When the result is wrong:

1. prefer an immediate rollback/revert when the failure is broad, confusing or hard to isolate;
2. prefer a small fix-forward when the cause is obvious and the rollback cost is higher than the correction;
3. do not keep a broken Production state merely to finish a test plan;
4. after rollback, preserve the failed change as evidence rather than rewriting history.

## Tests and CI after the policy change

Tests and CI remain useful for:

- regression diagnosis;
- repeated/automated checks;
- proving a bug after it has been observed;
- preventing a known failure from returning;
- post-deploy verification;
- high-risk or difficult-to-rollback changes.

For ordinary reversible UI/product work, the preferred order is no longer:

```text
implementation → full test matrix → CI GREEN → Production
```

The preferred order is:

```text
implementation → Production → direct observation → keep/fix/rollback
```

Automated validation can follow or run concurrently where it does not delay the Production feedback loop.

## High-risk exception boundary

Production-first is **not** the default for changes whose rollback is uncertain or whose failure could create durable harm. These remain separately gated unless the Product Owner gives a specific target-level authorization with a recovery plan:

- destructive DB/schema migration;
- irreversible Production data mutation/deletion;
- Auth/Firebase identity or authorization-policy changes;
- payment/billing/money movement;
- secrets/credentials/bindings;
- security/privacy/trust-boundary changes;
- provider/account ownership changes;
- domain/Worker routing changes with uncertain recovery;
- any operation where a previous state cannot be restored quickly and reliably.

For those cases, the question is not "did tests pass?" but "is the rollback/recovery path known and is irreversible harm bounded?"

## Source / design work

Source fidelity and source-structure checks are not a reason to create a separate long-lived staging product. When a source change is reversible and bounded, the real Product/Production surface may be used for acceptance after the source/module boundary is preserved.

Testing should target **known historical failures and regressions**, not become an alternative implementation program that delays the Product Owner from seeing the actual result.

## Reporting language

Do not report:

```text
PRODUCTION_READY = NO
```

merely because Preview, local browser QA, or a broad pre-deploy test matrix has not run for an ordinary reversible change.

Instead report the actual state:

```text
PRODUCTION_CHANGED = YES/NO
PRODUCTION_OBSERVED = YES/NO
OWNER_ACCEPTED = YES/NO/PENDING
ROLLBACK_READY = YES/NO
KNOWN_PRODUCTION_DEFECT = <exact defect or NONE>
```

A Production-visible defect must be described as a defect, not hidden behind CI terminology.

## Relationship to historical policies

- Preview remains available for an explicitly requested Preview task or when Production rollback is not sufficiently bounded.
- CI remains evidence, not the Product Owner's mandatory viewing environment.
- Historical Preview-first and CI-before-Production wording is non-controlling for ordinary reversible product iteration after this policy.
- Existing Production identity, secret-protection and irreversible-data safeguards remain in force.
