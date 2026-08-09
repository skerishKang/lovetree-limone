# Repository Collaboration Guide

## Current product authority

This repository is the active LoveTree Limone product repository.

- Product families exposed by the current architecture are **Legacy** and **Next**.
- Current product implementation authority is **V4 / Next**.
- `/v2/**` and `/v3/**` are historical comparison surfaces, not competing product programs to resume by default.
- `/design-lab/**` is an internal review/R&D surface for Design Lineages, Revisions, Scenario Variants and Experience Capabilities.
- Numbered design tracks such as 48–52 are **Design Lineages**, not new LoveTree product generations.

Do not infer a new product generation from a V1/V2/V3/V4 label inside one design lineage. Use the intake rules tracked by Design Ops issue #80.

## Runtime stack

- UI: Next.js 16 / React 19 / TypeScript / Tailwind 4
- Runtime/API: Cloudflare Worker
- Database: Neon PostgreSQL through Drizzle ORM
- Auth: Firebase Authentication (`relovetree` is the Production Firebase project)
- Production Worker: `lovetree-limone`

Primary current source areas include:

- `app/` — App Router pages and product surfaces
- `app/components/v4/` — source-faithful V4 product implementation
- `app/design-lab/` — internal design/capability review routes
- `lib/` — shared product/domain/adapters and registries
- `server/api/` — API behavior
- `db/` and `drizzle/` — PostgreSQL schema/migration authority
- `worker/` — Cloudflare Worker entry/runtime
- `scripts/` — build, deployment and operational guards
- `docs/` — product, architecture and operations authority

Do not rely on old repository descriptions that refer to D1 or removed `public/pages`, `public/js`, or `public/css` trees as current backend/product authority.

## External source preservation

Google Drive and sibling-project originals are evidence/reference sources unless a task explicitly says otherwise.

- Treat Drive originals as read-only.
- Do not move, rewrite, format, minify or delete source originals.
- Preserve exact bytes/SHA-256 when an intake contract requires source fidelity.
- Do not silently turn a sibling project into LoveTree product code. Extract only the approved Variant/Capability mechanics.
- New intake follows `Lineage → Revision → Variant/Capability` and the newest explicit product-owner/design-lead decision takes precedence while older revisions remain preserved as history.

The historical LoveBud repository is a source of product/backend intent. Do not destructively modify its mirrored/source copy when working in this repository.

## Mandatory WSL-native workspace

Run active development and verification only from the WSL Linux filesystem, normally:

```text
$HOME/worktrees/**
```

Do not run repository workloads from Windows-mounted paths such as `/mnt/c/**` or `/mnt/g/**`.

Prohibited on Windows-mounted paths:

- `npm ci` / `npm install`
- lint, typecheck, tests, build or `db:check`
- development servers
- Playwright / Chromium / browser capture matrices
- bulk generation/scanning/copying of repository working files

Windows-mounted drives may be used for read-only source archives and exported evidence/artifacts after WSL work is complete.

Before implementation or validation, record:

```bash
pwd
df -T .
node --version
npm --version
git branch --show-current
git rev-parse HEAD
git status --short
git remote -v
```

Stop rather than guess when the filesystem, branch, starting SHA or worktree state differs from the assignment.

See `docs/operations/WSL_WORKSPACE_POLICY.md` for migration/recovery details.

## Branch and change isolation

- `main` is the integration/release baseline. Do not develop directly on it.
- Use an issue-linked or purpose-specific branch/worktree.
- Re-fetch and record current `origin/main` before starting work that depends on the latest baseline.
- Do not force-push `main`, reset `main`, or rewrite unrelated branches.
- Do not mix unrelated product, ops, DB/Auth and design-intake work in one patch.
- Historical/stacked Draft PRs must not be merged merely because they are old; first prove that their content is not already absorbed or superseded.
- Keep new implementation PRs Draft until their exact head has the required automated evidence and the current task authorizes advancement.

## Validation

For ordinary code changes, use the repository's current validation scripts from a WSL-native workspace:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run db:check
```

Use narrower targeted tests during implementation when useful, but final evidence must match the scope of the change. Do not suppress failing tests to obtain green status.

The GitHub A-track workflow is an important exact-head gate, but a local/mock/browser-mechanics harness must not be described as a deployed Preview or Production acceptance result.

## Current demo release policy

LoveTree is currently in a pre-user demo/integration phase. For ordinary reversible UI/UX/product-screen changes, the preferred lightweight loop is:

```text
implementation → CI GREEN → Production demo → direct visual review → fix/redeploy
```

This replaces the older policy that required a separate Preview cycle for every ordinary UI change.

This simplification does **not** remove safety gates for irreversible or high-risk work. Treat these separately and fail closed:

- DB schema migration / destructive data change
- Production data mutation or cleanup
- Auth/Firebase policy or identity changes
- payment/billing
- secrets/bindings
- security/privacy boundary changes
- Worker target/routing changes
- any change with an uncertain rollback path

Production deployment must use the repository's guarded Production path. Never use an ad-hoc raw deploy to bypass `production:build:safe` / `production:deploy:safe` or their current successors.

The repository-side automatic `main → Production` workflow is tracked by #75; until it is merged and explicitly enabled with the required repository configuration, do not assume a push to main automatically deploys Cloudflare.

See `docs/operations/LOVETREE_RELEASE_OPERATING_POLICY.md`.

## Production safety

Protected Production identities include:

- Worker: `lovetree-limone`
- Firebase project: `relovetree`

Do not create or deploy to an accidental `lovetree-limone-production` Worker.

Never expose secret values in source, logs, PR comments or reports. Production verification may use read-only metadata/state checks required by the guard. Do not mutate Production DB/Firebase merely to make a validation gate pass.

## Files and secrets

Never commit:

- `.env*`, `.dev.vars` or local secret files
- API tokens, passwords, private keys or database URLs
- dependency directories (`node_modules`)
- generated build/test output unless explicitly part of an approved artifact contract
- local browser profiles/logs/caches

When a secret or environment variable is required, report only the variable name and whether it is present/missing; never print the value.

## Operating principle

Prefer a small, evidence-backed change over an invented completion. Preserve source/design provenance, distinguish prototype status from product adoption, and leave a clearly named blocker instead of weakening a fail-closed contract.