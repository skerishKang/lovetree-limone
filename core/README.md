# CORE — Shared Product / Backend Boundary

## Identity

`CORE` = the shared product and backend boundary that both OLD and NEW frontend generations consume.

## Principle

**CORE does not create new backend code.** It documents the boundary contracts that both frontend generations must respect.

## What Lives Here

| File | Purpose |
|------|---------|
| `FRONTEND_BACKEND_BOUNDARY.md` | Canonical boundary contract between frontend generations and backend |

## What Does NOT Live Here

- No backend files are moved into `core/`
- No database schema changes
- No API changes
- No Auth changes
- No provider/secret changes

## Authority

The actual backend lives at:

| Area | Path | Authority |
|------|------|-----------|
| Database schema | `db/schema.ts` | Canonical |
| Database access | `db/index.ts` | Canonical |
| Migrations | `drizzle/` | Canonical |
| Backend API | `server/api/` | Canonical |
| Cloudflare Worker | `worker/` | Canonical |
| Build config | `next.config.ts`, `wrangler.jsonc` | Canonical |

`core/` documents the boundary — it does not duplicate or replace these paths.

## Rules

1. Do not move backend files into `core/`
2. Do not create a second canonical backend writer
3. Do not fork database truth
4. Both OLD and NEW may temporarily consume the same backend
5. Backend migration (if needed) belongs in a separate issue
