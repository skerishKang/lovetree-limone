# LoveTree WSL Workspace Policy

## Status

Mandatory for active LoveTree implementation, validation and browser work.

This policy exists because the same LoveTree/Node workloads that stalled or became unreliable on Windows-mounted NTFS paths completed normally from WSL-native ext4 worktrees.

## Active workspace

Use one isolated repository clone/worktree per assignment under:

```text
$HOME/worktrees/**
```

Do not use `/mnt/c/**`, `/mnt/g/**` or another Windows-mounted filesystem as an active repository workspace.

Windows drives may still hold read-only source archives, backups and final exported evidence/artifacts.

## Workloads prohibited on Windows-mounted paths

Do not run from `/mnt/c` or `/mnt/g`:

- `npm ci` / `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run db:check`
- development servers
- Playwright / Chromium / browser capture matrices
- bulk repository generation/scanning/copying

A Git worktree on NTFS prevents branch conflicts but does not remove WSL↔NTFS small-file I/O overhead.

## Mandatory preflight

Before editing, validating or launching a browser:

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

Stop and report a blocker when:

- the path is under `/mnt/c` or `/mnt/g`;
- the filesystem is not the intended Linux filesystem;
- Node does not satisfy the repository/task requirement;
- branch/HEAD differs from the authorized base;
- the worktree contains unexplained changes;
- a required remote ref cannot be resolved without guessing.

## Creating a clean workspace

Typical pattern:

```bash
mkdir -p "$HOME/worktrees"
cd "$HOME/worktrees"
git clone https://github.com/skerishKang/lovetree-limone.git lovetree-<task>
cd lovetree-<task>
git fetch origin --prune
```

Create/checkout the task branch only from the exact authorized base.

## Moving uncommitted work

Prefer Git patches rather than copying a whole Windows worktree:

```bash
# old worktree
git diff --binary > /tmp/lovetree-worktree.patch
git diff --cached --binary > /tmp/lovetree-index.patch
git ls-files --others --exclude-standard
```

Apply the patches to a clean WSL clone at the same starting commit and copy only required untracked source files.

After transfer compare:

```bash
git status --short
git diff --stat
git diff --name-status
git diff --cached --stat
git diff --cached --name-status
```

If a copy produces widespread CRLF/LF churn or hundreds of unrelated changes, discard that transfer and restart from a clean clone. Never commit contaminated line-ending churn.

## Dependencies and validation

Install dependencies only in WSL-native storage:

```bash
npm ci
```

Unless the task changes dependencies, verify `package.json` and `package-lock.json` did not change.

Current full validation sequence:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:check
```

Record exact failures/warnings where relevant rather than reporting only “green.”

## Browser jobs

Do not start a long Playwright/Chromium matrix with a detached `&` process inside a short-timeout shell. Use a foreground execution with sufficient timeout or an explicit process facility with log/process polling.

For large browser runs:

- one capture process per assignment;
- no duplicate Chromium matrices;
- clean the intended output directory before a fresh run;
- distinguish a killed/timed-out browser from an application failure;
- record viewport, route, console/page errors, failed requests and overflow results.

A local browser mechanics harness is useful evidence but is not a deployed Preview/Production acceptance result.

## Exports

Generate evidence in WSL first. Copy only the final artifact to a Windows drive when needed and verify source/copy hashes when fidelity matters.

Do not automatically delete the old Windows worktree. Keep it until the WSL copy has the correct base, intentional diff, dependencies and validation state and cleanup is explicitly authorized.

## Git/release boundary

Moving to WSL never grants extra product/release authority. A workspace migration does not by itself authorize:

- force-pushing or resetting `main`;
- merging unrelated/stale PRs;
- Production deployment;
- DB/Auth/secret mutation;
- deleting source/reference worktrees;
- broadening a task beyond its requested scope.

Use the current repository operating/release policy in `AGENTS.md` and `docs/operations/LOVETREE_RELEASE_OPERATING_POLICY.md` for those decisions.