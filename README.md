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

Active repository work must run from a WSL-native Linux workspace, normally under:

```text
$HOME/worktrees/**
```

Do not run npm/build/test/dev-server/Playwright workloads from Windows-mounted `/mnt/c/**` or `/mnt/g/**` worktrees.

Install and run the current full validation sequence with:

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

During the current pre-user demo/integration phase, ordinary reversible UI/UX work uses the lightweight loop:

```text
implementation → CI GREEN → Production demo → direct visual review → fix/redeploy
```

This does not relax separate fail-closed handling for DB/Auth/payment/security/secrets/routing or other changes with an uncertain rollback path.

Production deployment must use the repository's guarded Production build/deploy path. Do not bypass it with an ad-hoc raw Worker deployment.

Repository-side automatic `main → Production` deployment is tracked by issue #75 / Draft PR #111. Until that workflow is merged, configured and explicitly enabled, a push to `main` must not be assumed to deploy Cloudflare automatically.

## Collaboration

- `main` is the integration/release baseline; develop on isolated issue/purpose branches.
- Preserve exact source bytes/SHA-256 when a source-fidelity contract requires it.
- Do not revive historical V2/V3 program work as a competing current product without a new explicit product decision.
- Keep prototype status distinct from product adoption.
- Never commit secrets, environment files, dependency directories or generated local browser/build output.
- Do not force-push/reset `main` or bypass Production safety guards.
