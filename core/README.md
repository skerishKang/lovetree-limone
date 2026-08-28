# CORE — Shared Product / Backend Boundary

## Identity

`CORE` = the single shared product/backend authority consumed by both OLD and NEW frontend generations.

## Current physical boundary

The canonical backend runtime is physically grouped under `core/runtime/` without changing backend semantics:

| Area | Canonical path |
|------|----------------|
| Database schema | `core/runtime/db/schema.ts` |
| Database access | `core/runtime/db/index.ts` |
| Migrations | `core/runtime/drizzle/` |
| Backend API | `core/runtime/server/api/` |
| Cloudflare Worker | `core/runtime/worker/` |

Root build/deploy configuration remains at repository root and points to these canonical CORE paths.

## Invariants

- This relocation is path-only. It does **not** create a second backend.
- No database schema or migration semantics change.
- No API endpoint, request/response contract, Auth behavior, provider, secret, or Production data changes.
- OLD and NEW continue to consume the same canonical HTTP API.
- A second DB writer, Auth system, API fork, or Worker remains forbidden.

## Boundary documents

| File | Purpose |
|------|---------|
| `FRONTEND_BACKEND_BOUNDARY.md` | Canonical frontend/backend contract |
| `runtime/` | Physical location of canonical backend runtime |

## Migration rule

Any remaining root-path consumers must be migrated to `core/runtime/**` before legacy compatibility paths are removed. CI must remain GREEN at each step.
