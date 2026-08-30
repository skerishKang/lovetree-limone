# CI Workflow Applicability Policy

## Status

This document defines how GitHub CI is interpreted when a LoveTree change uses a PR/CI review path.

It does **not** make CI GREEN a mandatory pre-Production gate for ordinary reversible UI/product iteration.

Controlling Product Owner release preference:

`docs/operations/PRODUCTION_FIRST_ROLLBACK_POLICY.md`

## Two separate questions

Do not conflate:

```text
A. Is this CI workflow applicable to this exact head?
B. May the Product Owner inspect this bounded reversible change in Production?
```

For a PR that is being accepted under CI policy, applicable workflows must still be reported truthfully. A failed/cancelled applicable workflow is not GREEN.

However, for an explicitly owner-authorized **reversible Production-first trial with a known rollback path**, CI GREEN is not a mandatory precondition for Production observation.

## CI acceptance rule when CI acceptance is being used

```text
ALL APPLICABLE EXACT-HEAD WORKFLOWS GREEN
```

This means only that a PR/head has passed the repository's CI acceptance contract. It does **not** mean "the Product Owner may not see Production until this is true."

A workflow is applicable when its checked-in trigger contract creates a run for the exact head.

A workflow intentionally out of scope under its reviewed trigger is not a missing check. A workflow that is applicable but pending, cancelled or failed is not GREEN.

## Global pull-request gates

Current global PR workflows include:

- `A-track P0 validation`
- `Design Fidelity Validation`
- `Design Source Freshness Observer`

These are evidence/automation contracts for PR review. They are not substitutes for direct Production inspection and are not the Product Owner's required pre-Production viewing environment for ordinary reversible changes.

## Dedicated track / lineage evidence workflows

Track-, lineage- and source-family workflows remain useful for regression evidence. Their applicability is determined by their checked-in trigger contracts.

Operations-only changes may still be excluded by `paths-ignore` where the workflow contract says so.

Do not broaden or narrow workflow applicability merely to make a result appear green.

## Production-first interaction

For ordinary reversible UI/product/source-integration work, the preferred owner loop is:

```text
bounded implementation
→ Production
→ direct observation
→ keep / fix forward / rollback
```

CI may:

- run concurrently;
- run after the Production change;
- be used to diagnose a Production defect;
- become a regression test after the defect is understood.

Do not delay an explicitly owner-authorized reversible Production trial solely because a broad pre-Production CI matrix has not finished.

If CI reports a real failure, record it accurately. Do not suppress, relabel or falsify it.

## High-risk boundary

The Production-first preference does not remove separate recovery/safety gates for irreversible or hard-to-rollback changes such as destructive DB/data operations, Auth policy, payments, secrets, security/privacy boundaries or uncertain provider/routing changes.

For those changes, fail closed around durable harm and rollback uncertainty.

## Exact-head review procedure

When a PR is being reviewed for CI acceptance:

1. fresh-query current `main`;
2. fresh-query PR head/base and changed files;
3. determine workflows applicable to that exact head;
4. report every applicable workflow conclusion truthfully;
5. record blocking reviews/threads when relevant;
6. distinguish `CI_ACCEPTED` from `PRODUCTION_OBSERVED`.

Use explicit fields:

```text
CI_ACCEPTED = YES/NO/NOT_USED_FOR_PREPROD_GATE
PRODUCTION_CHANGED = YES/NO
PRODUCTION_OBSERVED = YES/NO
ROLLBACK_READY = YES/NO
OWNER_ACCEPTED = YES/NO/PENDING
```

## Historical wording

Older policy that treated Draft state + all applicable exact-head workflows GREEN as a universal prerequisite before ordinary reversible Production observation is no longer the Product Owner's default operating preference.

CI remains valuable evidence. It is not the default staging barrier between the Product Owner and a reversible Production result.
