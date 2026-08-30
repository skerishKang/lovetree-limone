# LoveTree Limone

LoveTree Limone is the active LoveTree product repository, combining the Limone visual direction with the shared LoveTree product model, Firebase authentication, Neon PostgreSQL persistence and Cloudflare Worker runtime.

## Current product structure

The repository exposes exactly two product families through the current product gateway:

- **Legacy** — preserved historical product access
- **Next** — the active product direction, currently implemented through **V4**

Historical `/v2/**` and `/v3/**` routes remain available for comparison. They are not separate active product programs.

The active V4 journey includes source-faithful onboarding, Tree/Moment workspace and lifecycle screens, graph/map/nebula/timeline views, people/archive experiences, community, milestone/growth routes and the internal Design Lab.

`/design-lab/**` is intentionally an internal R&D/review surface. It contains Design Lineage / Revision / Scenario Variant comparison and Experience Capability prototypes; an internal prototype is not automatically a product-adopted V4 screen.

## Runtime stack

- Node.js `>=22.13.0`
- Next.js 16 / React 19 / TypeScript
- Cloudflare Worker runtime
- Neon PostgreSQL + Drizzle ORM
- Firebase Authentication (`relovetree` is the Production Firebase project)
- Production Worker: `lovetree-limone`

## Repository areas

- `app/` — application routes and product surfaces
- `app/components/v4/` — V4 source-faithful implementation
- `app/design-lab/` — internal design/capability review routes
- `lib/` — shared product/domain/adapters and registries
- `server/api/` — API behavior
- `db/` and `drizzle/` — PostgreSQL schema/migration authority
- `worker/` — Cloudflare Worker runtime entry
- `scripts/` — build/deployment/operational guards
- `docs/` — product, architecture and operations documentation

Google Drive and sibling-project source files are treated as read-only evidence/reference unless a specific intake contract says otherwise. Current design intake follows **Lineage → Revision → Variant/Capability**; see issue #80 and the Design Lab registries.

## Local development

Repository work uses an OS-native Lane rather than a repository-wide WSL mandate.

- OS-neutral mutation and ordinary local validation default to a dedicated Windows-native worktree.
- Linux-specific work, or a Lane explicitly owned by WSL, uses a WSL-native worktree such as `$HOME/worktrees/**`.
- One active mutation Lane keeps one owning OS for its lifetime; cross-OS verification uses a separate read-only exact-head worktree when needed.
- Do not run WSL repository workloads from Windows-mounted `/mnt/c/**` or `/mnt/g/**` paths.
- The shared root is an administration/sync surface, not an execution workspace.
- GitHub Actions Linux remains the final exact-head integration authority unless a later explicit repository policy changes that rule.

Install and run the current validation commands from the Lane's owning native workspace as appropriate to task scope and current OS-parity evidence:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run db:check
```

See:

- `AGENTS.md`
- `docs/operations/WSL_WORKSPACE_POLICY.md`
- `docs/operations/LOVETREE_RELEASE_OPERATING_POLICY.md`

## Release model

During the current pre-user demo/integration phase, ordinary reversible UI/UX/product/source-integration work follows the Product Owner's Production-first / rollback-first loop:

```text
bounded implementation → Production → direct Product Owner/operator inspection → KEEP / FIX FORWARD / ROLLBACK
```

Preview, local QA and CI remain useful evidence, but they are not mandatory pre-Production gates for an explicitly owner-authorized ordinary reversible change when the previous known-working state and rollback path are available.

This does not relax separate fail-closed handling for destructive DB/data mutation, Auth/Firebase identity or authorization changes, payment/billing, secrets, privacy/security trust boundaries, provider/account authority, Worker/domain routing, or other changes with an uncertain rollback path.

Production deployment must use the repository's guarded Production build/deploy path. Do not bypass it with an ad-hoc raw Worker deployment.

Repository-side automatic `main → Production` deployment is active. The workflow `.github/workflows/production-auto-deploy.yml` is fail-closed, uses the guarded Production build/deploy scripts, and deploys on `main` push unless the emergency repository variable `LOVETREE_PRODUCTION_AUTO_DEPLOY=false` is set. Required Production secrets must remain present; secret values must never be printed or committed.

## Collaboration

- `main` is the integration/release baseline; develop on isolated issue/purpose branches when branch isolation materially helps the task.
- Preserve exact source bytes/SHA-256 when a source-fidelity contract requires it.
- Do not revive historical V2/V3 program work as a competing current product without a new explicit product decision.
- Keep prototype status distinct from product adoption.
- Never commit secrets, environment files, dependency directories or generated local browser/build output.
- Do not force-push/reset `main` or bypass Production safety guards.
