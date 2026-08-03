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

## Mandatory WSL workspace policy

All development and verification must run inside the WSL Linux filesystem.

Use a workspace under:

```text
$HOME/worktrees/**
```

Do not run development workloads from Windows-mounted paths such as:

```text
/mnt/g/**
/mnt/c/**
```

The following are prohibited on `/mnt/g` and `/mnt/c`:

- `npm ci` or `npm install`
- lint, typecheck, test, build, or `db:check`
- Playwright or Chromium capture runs
- development servers
- bulk file creation, scanning, copying, or screenshot generation

Windows drives are for source archives, backups, screenshots, ZIP files, and final exported artifacts only.

Before editing or validating, record:

```bash
pwd
df -T .
node --version
git branch --show-current
git rev-parse HEAD
git status --short
```

Stop before implementation when:

- `pwd` is under `/mnt/g` or `/mnt/c`
- the filesystem is not the WSL Linux filesystem expected for the task
- the branch or HEAD differs from the authorized starting point
- the worktree contains unexplained changes

For uncommitted work, prefer a Git patch workflow over copying the entire tree. Preserve the old Windows-mounted worktree until the WSL copy is verified. If a copy operation causes widespread CRLF churn or hundreds of unrelated modified files, stop and re-transfer only the intentional Git diff.

Do not launch long Playwright or Chromium jobs with `&` inside a short-timeout shell. Use a foreground command with a sufficient timeout or a dedicated background-process facility with explicit log and process polling.

See `docs/operations/WSL_WORKSPACE_POLICY.md` for the full migration and recovery procedure.

## Branches and commits

- Keep `main` as the integration baseline.
- Use issue-linked branches for features.
- Use focused commits with imperative, descriptive messages.
- Keep the import pull request in Draft status until validated.
- Unless the user explicitly authorizes otherwise, do not mark a pull request Ready, merge, deploy, modify unrelated pull requests, or delete a previous Windows-mounted worktree.

## Files and secrets

Never commit `.env` files, `.dev.vars`, secrets, API keys, tokens, passwords,
certificates, logs, IDE caches, dependency directories, or generated build/test
output.

## Validation

After changes, run the following in order from the WSL-native workspace:

```bash
npm ci
npm run lint
npm test
npm run build
```

Record outcomes in `docs/INITIAL_UI_BASELINE.md`.
