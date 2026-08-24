# CI Workflow Applicability Policy

## Status

This document defines how pull-request CI applicability is interpreted for LoveTree exact-head acceptance.

It does not weaken the A-track gate, branch protection, product/browser coverage, or exact-head identity requirements.

## Acceptance rule

The merge acceptance rule is:

```text
ALL APPLICABLE EXACT-HEAD WORKFLOWS GREEN
```

A workflow is **applicable** when its checked-in trigger contract causes GitHub Actions to create a pull-request run for the current exact head.

A workflow that is intentionally out of scope for a pull request under its reviewed path trigger is not a missing or bypassed check. A workflow that is applicable but pending, cancelled, or failed is not GREEN and blocks acceptance under the normal merge policy.

## Global pull-request gates

The following workflows remain globally applicable to pull requests targeting `main` and are not path-scoped by Issue #439:

- `A-track P0 validation` — authoritative repository integration gate.
- `Design Fidelity Validation` — global planner/result gate; its internal planner decides whether a heavy fidelity target matrix is required.
- `Design Source Freshness Observer` — global unprivileged observer/security contract.

Production deployment is outside the Issue #439 pull-request fan-out optimization scope.

## Track / lineage evidence workflows

The following workflows are dedicated track, lineage, or source-family evidence gates:

- `Lineage52 Phase2 native spatial primitive QA`
- `Lineage60 V1.2 native browser QA evidence`
- `Living Media Sphere V3 hold browser QA evidence`
- `Track18 V2 source runner exact asset 8/8 closure QA`
- `Track47 V4.2.5 hold browser QA evidence`
- `Track68 V3.3.2 browser QA evidence`
- `Track62 V1.1 continuous exhibition rail native browser QA`
- `Track66 V1.2 native browser QA evidence`
- `Track67 V2.4.2 native browser QA evidence`

These workflows retain their normal `pull_request` trigger for `main`, but may ignore a pull request only when **every changed path** is repository operations/policy-only:

```text
AGENTS.md
docs/operations/**
```

GitHub `paths-ignore` semantics are intentionally used here: if a pull request contains any non-ignored path, the workflow remains applicable.

## Fail-closed mixed-change behavior

Examples:

- only `AGENTS.md` and/or `docs/operations/**` changed → the dedicated evidence workflows above are not applicable;
- product/source/test/config + operations docs changed → the dedicated evidence workflows remain applicable;
- a dedicated workflow file itself changed → that workflow remains applicable because `.github/workflows/**` is not ignored;
- design/source documentation outside `docs/operations/**` changed → the dedicated evidence workflows remain applicable unless a later reviewed trigger contract explicitly says otherwise.

This deliberately avoids a broad `docs/**` exclusion because design/source documentation can carry QA semantics.

## Exact-head review procedure

Before Ready or merge:

1. fresh-query current `main`;
2. fresh-query the PR head/base and changed files;
3. identify the workflows applicable to that exact head from the checked-in trigger contracts;
4. require every applicable exact-head workflow to complete successfully;
5. confirm no blocking review or unresolved review thread;
6. if `main` moved from the PR base, stop and reconcile under the repository merge-forward policy before accepting the PR.

Do not infer acceptance from a historical fixed workflow count. The previous observed count of 12 pull-request workflows was an implementation state, not the semantic definition of acceptance.

## Future optimization boundary

Issue #439 may later consider repeated bootstrap reduction or self-hosted runners, but those changes require separate evidence. This policy does not authorize:

- path-scoping the A-track;
- removing or skipping tests inside an applicable workflow;
- weakening fail-closed browser inventories;
- moving Production/provider/DB/Auth mutation into CI optimization work;
- treating a failed applicable workflow as optional.
