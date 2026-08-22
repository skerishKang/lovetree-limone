# LoveTree WSL / Windows Workspace Policy

## Status and precedence

This document is a subordinate operational guide for the repository workspace policy in `AGENTS.md`.

**Controlling authority:** `AGENTS.md` → `Workspace policy: WSL / Windows dual-track`.

If this document and `AGENTS.md` ever disagree, `AGENTS.md` wins. Issue #369 records the current staged Windows-parity program; Issue #397 tracks this documentation reconciliation.

Current rule:

```text
OS-neutral mutation / ordinary local validation = WINDOWS FIRST
Linux-specific work                           = WSL NATIVE
local browser QA not yet Windows-parity-approved = WSL READ-ONLY VERIFICATION or GitHub Actions Linux
final exact-head integration authority        = GitHub Actions Linux
```

This document no longer imposes a repository-wide WSL mandate.

## One Lane, one owning OS

Every active implementation or mutation Lane declares one primary OS at start and keeps that ownership for the life of the Lane.

- Windows Lane → dedicated worktree on native NTFS.
- WSL Lane → dedicated worktree on WSL-native ext4 under `$HOME/worktrees/**`.
- Never use the same mutation Lane/worktree from both operating systems.
- Never move the primary mutation Lane to WSL merely because one verification step still requires Linux/browser parity.

When cross-OS evidence is required, create a **separate read-only verification worktree at the exact pushed head**. Do not continue mutation from that verification worktree.

## Windows-native work

For OS-neutral Git and repository work, Windows is the default local environment.

Typical Windows-owned work includes:

- branch/worktree creation and ordinary Git merge-forward;
- source edits;
- `npm ci` / dependency installation;
- lint;
- typecheck;
- unit/contract tests that are Windows-parity-approved;
- build and `db:check` when the task is OS-neutral;
- repository inspection and evidence generation that does not require a Linux-specific runtime.

Use a dedicated per-Lane native NTFS worktree. The shared repository root is administration/sync only and is not an execution workspace.

## WSL-native work

Use WSL when the task is explicitly Linux-specific, when the Lane was declared WSL-owned at start, or when current parity evidence says the relevant local browser/runtime verification still requires WSL.

WSL worktrees must live on WSL-native storage such as:

```text
$HOME/worktrees/**
```

Do not run active repository workloads from `/mnt/c/**`, `/mnt/g/**`, or other Windows-mounted paths inside WSL. The concern is cross-filesystem WSL↔NTFS I/O, not native Windows execution itself.

Prohibited from WSL cross-mounted paths:

- `npm ci` / `npm install`;
- lint, typecheck, tests, build, `db:check`;
- development servers;
- Playwright / Chromium / browser matrices;
- bulk repository generation/scanning/copying.

## Browser QA transition rule

Issue #369 is the authority for Windows browser-QA parity.

Until a browser suite is explicitly accepted as Windows-parity-ready:

1. keep the primary mutation Lane on its declared OS;
2. push the exact candidate head;
3. use GitHub Actions Linux as the final exact-head authority;
4. if local Linux/browser evidence is specifically required, use a separate WSL-native **read-only** verification worktree at that exact head.

Do not interpret "browser QA still uses WSL" as "all implementation, Git, lint, typecheck and build must run in WSL".

## Shared root is administration only

The shared root checkout:

```text
G:\Ddrive\BatangD\task\workdiary\lovetree-limone
```

is a sync / worktree-administration surface only.

Allowed there:

- `git fetch` / `git push`;
- `git worktree add/remove/list`;
- branch/ref administration needed to create isolated Lane worktrees.

Do not edit, build, test, launch servers or run browser QA directly from the shared root.

## Mandatory Lane declaration

At task start, record:

```text
PRIMARY_OS = WINDOWS | WSL
WORKTREE = <native path>
BRANCH = <lane branch>
MUTATION_BOUNDARY = <owned files/scope>
CROSS_OS_VERIFICATION = NONE | READ_ONLY_WSL | READ_ONLY_WINDOWS | GITHUB_ACTIONS_ONLY
```

Before implementation or validation, also record the environment state appropriate to the owning OS:

```bash
node --version
npm --version
git branch --show-current
git rev-parse HEAD
git status --short
git remote -v
```

For WSL additionally confirm the filesystem/path is WSL-native. For Windows confirm the worktree is a dedicated native NTFS path and is not the shared root.

Stop rather than guess when the branch, starting SHA, worktree ownership or filesystem differs from the assignment.

## GitHub is the durable ledger

Local-only state is never completion.

Before starting work that depends on the latest baseline, fresh-query/fetch current `origin/main`. After intentional mutation, push the Lane branch and use the PR/exact-head GitHub state as the durable record.

Historical SHAs, old local worktrees and old CI reports are evidence only.

## Validation authority

Ordinary validation scripts remain:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run db:check
```

Run them from the Lane's owning **native** workspace. The exact subset depends on task scope and current OS parity evidence.

GitHub Actions Linux remains the final exact-head integration authority unless a later explicit repository policy changes that rule.

## Moving or recovering work

Do not move an active mutation Lane between Windows and WSL as a routine troubleshooting step.

If the owning environment is genuinely blocked:

1. stop mutation;
2. preserve/push or patch the intentional delta without rewriting history;
3. report the environment blocker;
4. receive a new Lane/OS decision before continuing mutation.

A separate cross-OS verification Lane may inspect the exact pushed head without taking mutation ownership.

Never force-push, reset, amend, rebase, or delete unrelated worktrees merely to change environments.

## Heavy processes

Docker, virtual machines, emulators, large parallel builds and bulk browser/capture jobs require the repository's current CTO approval rule from `AGENTS.md`.

Environment choice never grants extra authority for provider, DB/Auth, Production, release or destructive operations.

## PR #382 incident note

Issue #397 was opened after PR #382's OS-neutral current-main merge-forward was unnecessarily moved into a new WSL worktree because this file still contained the obsolete WSL-only mandate.

The correct pattern is now explicit:

```text
primary PR mutation / merge-forward / OS-neutral validation = Windows-native Lane
browser/Linux evidence, when still required                = separate read-only WSL exact-head Lane
final CI                                                     = GitHub Actions Linux exact head
```

This incident is a documentation-policy correction, not authority to delete the historical WSL worktree or mutate unrelated branches.
