# Repository Collaboration Guide

## Scope

This repository is the unified LoveTree Limone project — combining the Limone UI
visual baseline with the LoveBud backend services (UX, API, database, auth).

- **UI**: Next.js 16 + React 19 + Tailwind 4 (TypeScript)
- **Backend API**: Cloudflare Workers (D1/Drizzle ORM)
- **Auth**: Firebase Authentication
- **Legacy pages**: Static HTML/CSS/JS from LoveBud served via `public/`

## Source of truth

- `db/schema.ts` — Drizzle ORM schema (adapted from LoveBud PostgreSQL migrations)
- `api/` — Worker API route handlers
- `app/` — Next.js app router pages
- `public/pages/` — LoveBud static HTML pages
- `public/js/` — LoveBud frontend JavaScript modules
- `public/css/` — LoveBud stylesheets

The original LoveBud project at `/mnt/g/Ddrive/BatangD/task/workdiary/LoveBud`
is read-only. Never modify it.

## Branches and commits

- Keep `main` as the integration baseline.
- Use issue-linked branches for features.
- Use focused commits with imperative, descriptive messages.
- Keep the import pull request in Draft status until validated.

## Files and secrets

Never commit `.env` files, `.dev.vars`, secrets, API keys, tokens, passwords,
certificates, logs, IDE caches, dependency directories, or generated build/test
output.

## Validation

After changes, run the following in order:

```bash
npm ci
npm run lint
npm test
npm run build
```

Record outcomes in `docs/INITIAL_UI_BASELINE.md`.
