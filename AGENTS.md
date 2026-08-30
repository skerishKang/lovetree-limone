# Repository Collaboration Guide

## 0. Current owner authority

This repository is the active LoveTree Limone product repository.

When this file conflicts with older issue/PR wording or subordinate operations documents, use the newest explicit Product Owner decision recorded here and in the linked current policy documents.

Two owner decisions are controlling for current work:

```text
SOURCE WORK
= preserve the sibling/original executable
→ mechanically split the single-file HTML into maintainable HTML/CSS/JS/assets
→ do not redesign, reinterpret or framework-convert during the split
→ connect Product data/navigation through separate integration/adapters
→ compose verified source modules into multiple MVP versions

ORDINARY REVERSIBLE PRODUCT WORK
= Production first
→ inspect the real Production result
→ KEEP / FIX FORWARD / ROLLBACK
```

Controlling release policy:

`docs/operations/PRODUCTION_FIRST_ROLLBACK_POLICY.md`

## 1. Product / backend authority

LoveTree is not an independently canonical second backend/auth/data product.

Primary cross-repository authority remains:

- `skerishKang/LoveBud#4004` — one shared Product auth/backend/data authority;
- `skerishKang/lovetree-limone#152` — LoveTree-side guardrail;
- `skerishKang/LoveBud#4005` — DB/schema/data convergence when relevant;
- `skerishKang/LoveBud#4006` — shared Firebase → staged Neon Auth migration when relevant.

Current runtime stack:

- UI: Next.js / React / TypeScript where the Product shell currently uses them;
- Runtime/API: Cloudflare Worker;
- Database: Neon PostgreSQL through the shared Product authority;
- Auth: Firebase Authentication during the current migration stage;
- Production Worker identity: `lovetree-limone`.

Do not create a second canonical Product DB/Auth/API/provider authority merely because a source/MVP needs integration.

For Auth/DB/provider changes, classify the target before mutation:

```text
CANONICAL_PRODUCT_AUTHORITY
TRANSITIONAL_BRIDGE_NONCANONICAL
TEST_ISOLATION_ONLY
PROTOTYPE_ONLY
HISTORICAL_EVIDENCE_ONLY
UNKNOWN_STOP
```

`UNKNOWN_STOP` means zero high-risk provider/DB/Auth mutation until identity is resolved.

## 2. Source implementation semantics — current authority

### 2.1 What the owner means by source implementation

The sibling/design source is commonly one large HTML file containing HTML, inline CSS, inline JS and asset references.

The immediate implementation goal is **structural modularization, not reinterpretation**.

Default transformation:

```text
original single HTML
├─ markup
├─ <style>…</style>
├─ <script>…</script>
└─ asset references

        ↓ mechanical structural split

source module
├─ raw/original.html
├─ split/index.html
├─ split/styles.css
├─ split/script.js
├─ split/assets/**
└─ manifest / equivalence evidence
```

The `split` surface is the original source reorganized into maintainable files. It is not a new design and not a framework rewrite.

### 2.2 Allowed during structural split

Allowed by default:

- move inline CSS into external CSS without changing its meaning;
- move inline JS into external JS without changing its behavior/order;
- add the minimum `<link>` / `<script src>` glue needed to reconnect the extracted files;
- rebase relative asset paths only when required because the file location changed;
- preserve assets in a maintainable local structure;
- add tests/evidence that compare original and split behavior;
- add separate adapter/bridge code outside the source visual/interaction implementation.

### 2.3 Forbidden during structural split

Unless the Product Owner explicitly authorizes a separate redesign/refactor task, do not:

- convert source HTML/JS into React/TSX merely because the Product shell uses React;
- rewrite DOM hierarchy;
- rewrite CSS layout algorithms;
- change colors, typography, sizes, positions, spacing, effects or depth;
- add new responsive breakpoints or mobile redesign;
- replace source interaction with a different interaction model;
- generalize or abstract layout/state logic;
- optimize, beautify or refactor source code in a way that changes observable behavior;
- silently repair a source oddity;
- treat donor/visual-language/canonical reinterpretation as source implementation.

If safe splitting would change execution semantics, preserve that portion intact until an equivalent split is proven.

### 2.4 Source library and MVP composition are separate axes

The intended next-generation architecture is a source library plus independently versioned MVP compositions.

Conceptually:

```text
source library
├─ 001
├─ 002
├─ …
└─ 108

MVP compositions
├─ version-001
├─ version-002
├─ version-003
└─ experiments/**
```

The 108 result slots do not automatically mean 108 distinct Source identities. Preserve `MST`, `SRC`, `LIN`, `TRK`, `CDX`, `FAM` or other explicit identity namespaces separately in metadata.

A Source module must not become owned by one MVP. MVPs select/compose Source modules through separate shell/route/adapter code.

Preferred boundary:

```text
RAW ORIGINAL
→ STRUCTURAL SPLIT
→ STRUCTURAL EQUIVALENCE
→ MVP-SPECIFIC ADAPTER / BRIDGE
→ MVP VERSION
```

Do not merge several Source implementations into one canonical visual surface before their individual split modules exist and remain independently reusable.

## 3. External source preservation

Google Drive sibling/design originals are source authority and are read-only by default.

- Do not rewrite, format, minify, rename or delete the authority object merely to make repository work easier.
- Preserve exact file/folder identity and SHA-256 when provenance is required.
- Repository `raw/` copies are preservation/replay material; repository `split/` files are maintainable structural decompositions of that authority.
- A change to the Product/MVP adapter does not authorize mutation of the underlying Source design.

Historical OLD and current NEW implementations are evidence/regression material unless and until the Product Owner explicitly adopts part of them into the redesigned source-library/MVP architecture.

## 4. Production-first / rollback-first owner policy

For ordinary **reversible** UI/UX/product/source-integration work, Production is the Product Owner's preferred acceptance environment.

Default loop:

```text
bounded implementation
→ Production
→ direct Product Owner/operator inspection
→ KEEP
   or FIX FORWARD
   or ROLLBACK / REVERT
```

A separate Preview is optional.

Broad local QA and CI GREEN are not mandatory pre-Production gates for an explicitly owner-authorized reversible change when the previous known-working state and rollback path are available.

Tests and CI remain useful for:

- diagnosing a defect seen in Production;
- converting known historical failures into regression checks;
- repeated automation;
- post-deploy verification;
- hard-to-rollback/high-risk work.

Do not fabricate/suppress test results. If a test was run and failed, report the failure accurately. The policy change is about **release order**, not falsifying evidence.

Use these reporting fields where useful:

```text
PRODUCTION_CHANGED = YES/NO
SOURCE_SHA = <exact commit>
PRODUCTION_VERSION = <exact deployment/version>
PREVIOUS_KNOWN_WORKING = <exact identity>
PRODUCTION_OBSERVED = YES/NO
OWNER_ACCEPTED = YES/NO/PENDING
ROLLBACK_READY = YES/NO
KNOWN_DEFECT = <exact defect or NONE>
CI_ACCEPTED = YES/NO/NOT_USED_FOR_PREPROD_GATE
```

Full release contract:

`docs/operations/PRODUCTION_FIRST_ROLLBACK_POLICY.md`

`docs/operations/LOVETREE_RELEASE_OPERATING_POLICY.md`

## 5. High-risk exception boundary

Production-first is not blanket authority for operations where rollback is uncertain or durable harm is plausible.

Treat separately unless the Product Owner gives explicit target-level authorization and a recovery plan:

- destructive DB/schema migration;
- irreversible Production data deletion/mutation;
- Auth/Firebase identity or authorization policy changes;
- payment/billing/money movement;
- secrets/credentials/bindings;
- security/privacy/trust-boundary changes;
- provider/account ownership changes;
- Worker/domain routing changes with uncertain recovery;
- any change for which the previous state cannot be restored quickly and reliably.

For these, fail closed around irreversible harm and recovery uncertainty.

Never expose secret values in source, logs, PR comments or reports.

## 6. Git / workspaces / durable history

GitHub is the durable code ledger.

- Fresh-read the current remote before a decision that depends on current state.
- Do not force-push or destructively rewrite `main` history.
- Do not use `git clean`, destructive reset or history rewrite merely to recover from a failed product attempt.
- Preserve failed Production attempts as auditable commits/reverts when possible.
- Use dedicated worktrees/branches when they materially help parallelism or isolation, but do not turn branch/PR ceremony into a mandatory pre-Production staging requirement for an owner-authorized reversible change.

Both WSL and Windows may be used in OS-native worktrees. Do not run heavy repository workloads from cross-mounted paths when an OS-native worktree is available.

The shared Google Drive for desktop mirror is a synchronization/admin surface, not a substitute for Git history.

Source-authority Drive folders remain read-only by default.

## 7. Heavy processes

Docker, virtual machines, emulators, large parallel builds and bulk browser-capture/scanning jobs should not be started reflexively.

Use them only when they materially answer the current task. Existing explicit CTO/owner approval requirements for heavyweight infrastructure remain in force.

Do not build an elaborate test harness merely because it is possible when the Product Owner has asked for a direct reversible Production iteration.

## 8. CI interpretation

CI is evidence.

When a PR is intentionally evaluated under CI acceptance, report all applicable exact-head workflow conclusions truthfully. A failed/cancelled applicable workflow is not GREEN.

But distinguish:

```text
CI_ACCEPTED
!=
PRODUCTION_OWNER_ACCEPTED
```

For ordinary reversible Production-first iteration, CI may run concurrently or after deployment.

See:

`docs/operations/CI_WORKFLOW_APPLICABILITY.md`

## 9. Production deployment identity

Protected Product identities include:

- Worker: `lovetree-limone`
- Firebase project: `relovetree`

Do not accidentally deploy to a similarly named unintended Worker.

Preserve rollback identity for ordinary reversible deployments.

Do not mutate Production DB/Firebase merely to make a validation gate pass.

Automatic deployment and guard implementation details are documented in:

`docs/operations/GITHUB_PRODUCTION_AUTO_DEPLOY.md`

If existing automation still imposes broad pre-Production validation that conflicts with the current owner release order, classify that as **legacy workflow behavior to reconcile**, not as the desired owner policy.

## 10. Operating principle

Prefer the simplest operation that actually matches the Product Owner's stated goal.

For Source work:

```text
PRESERVE ORIGINAL
SPLIT STRUCTURALLY
DO NOT REINTERPRET
CONNECT OUTSIDE THE SOURCE
COMPOSE MVP VERSIONS SEPARATELY
```

For ordinary reversible product work:

```text
PRODUCTION FIRST
OBSERVE THE REAL RESULT
KEEP / FIX / ROLLBACK
```

Do not replace either simple instruction with a more elaborate process unless the task genuinely requires it.
