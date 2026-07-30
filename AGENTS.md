# Repository Collaboration Guide

## Scope

This repository is the GitHub import workspace for the Limone UI visual
baseline. Keep this import focused on UI source, public assets, package
metadata, lockfiles, and configuration required to run the existing project.

Do not implement backend services, D1/Drizzle persistence, authentication, or
deployment as part of the visual baseline import.

## Source of truth

The original project is stored outside this repository. Treat the original
project as read-only: never modify, delete, reset, or stash it.

## Branches and commits

- Keep `main` as the integration baseline.
- Use issue-linked branches such as `ui/<ISSUE_NUMBER>-initial-limone-baseline`.
- Use focused commits with imperative, descriptive messages.
- Keep the import pull request in Draft status.

## Files and secrets

Never commit `.env` files, secrets, API keys, tokens, passwords, certificates,
logs, IDE caches, dependency directories, or generated build/test output.

## Validation

After importing the UI baseline, run `npm ci`, then the scripts defined in
`package.json` (`lint`, `test`, and `build`). Record the exact outcomes in
`docs/INITIAL_UI_BASELINE.md`. If no `typecheck` script exists, record it as
`not configured` rather than adding one.
