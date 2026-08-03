# WSL Workspace Policy

## Status

This policy is mandatory for all LoveTree development agents, including future models and replacement workers.

It was adopted after repeated stalls on Windows-mounted worktrees where `npm ci` and ESLint spent excessive time on small-file I/O. The same branch, Node version, and source changes completed normally after moving to the WSL-native ext4 filesystem.

## Policy summary

Use WSL for both execution and project storage.

```text
Allowed active workspace:
$HOME/worktrees/**

Prohibited active workspace:
/mnt/g/**
/mnt/c/**
```

Windows-mounted drives remain available for:

- original HTML and reference assets
- read-only archives
- backups
- screenshots and evidence bundles
- ZIP exports and final artifacts

They are not active development filesystems.

## Prohibited workloads on Windows-mounted paths

Do not run any of the following from `/mnt/g` or `/mnt/c`:

- `npm ci`
- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run db:check`
- Playwright, Chromium, or browser capture scripts
- development servers
- bulk file generation, scanning, hashing, copying, or screenshot production

A separate Git worktree on the same Windows-mounted drive prevents Git branch conflicts, but it does not remove NTFS/WSL small-file I/O overhead.

## Standard workspace layout

Use one isolated WSL-native workspace per assignment.

```text
$HOME/worktrees/lovetree-<task-name>
```

Examples:

```text
/root/worktrees/lovetree-v4-p1-remediation
/root/worktrees/lovetree-v4-bookshelf-four
/root/worktrees/lovetree-v4-existing-10-capture
```

Do not use `/tmp` for long-lived implementation work. Temporary evidence or capture output may use `/tmp`, but the repository clone should remain under `$HOME/worktrees`.

## Mandatory preflight

Before any edit, validation, browser launch, or capture run, record:

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

The agent must stop and report `BLOCKED` when:

- `pwd` begins with `/mnt/g` or `/mnt/c`
- the filesystem is not WSL-native Linux storage
- Node does not match the task requirement
- the branch or HEAD differs from the authorized starting point
- the worktree has unexplained changes
- the required remote branch cannot be resolved without guessing

## Creating a new WSL workspace

Preferred method:

```bash
mkdir -p "$HOME/worktrees"
cd "$HOME/worktrees"
git clone https://github.com/skerishKang/lovetree-limone.git lovetree-<task-name>
cd lovetree-<task-name>
git fetch origin --prune
git checkout --track origin/<authorized-branch>
```

When the remote branch does not yet exist, create the local branch only from the exact authorized commit or base branch stated in the task. Do not infer or substitute a different base.

## Migrating uncommitted work

### Preferred method: Git patch transfer

The default transfer mechanism is a Git patch, not a full-directory copy.

From the old worktree:

```bash
git status --short
git rev-parse HEAD
git diff --binary > /tmp/lovetree-worktree.patch
git diff --cached --binary > /tmp/lovetree-index.patch
```

In the clean WSL clone at the same starting commit:

```bash
git apply --index /tmp/lovetree-index.patch  # only when non-empty
git apply /tmp/lovetree-worktree.patch      # only when non-empty
```

Then compare old and new states:

```bash
git status --short
git diff --stat
git diff --name-status
git diff --cached --stat
git diff --cached --name-status
```

The old and new worktrees must show the same intentional changed files and equivalent diff statistics before work resumes.

### Untracked files

List untracked files explicitly:

```bash
git ls-files --others --exclude-standard
```

Copy only the required untracked source files. Do not copy generated output or dependency directories.

### Full-tree copy restrictions

A full `rsync` may be used only when a patch cannot preserve required untracked content. Exclude at least:

```text
.git
node_modules
.next
coverage
playwright-report
test-results
logs
ZIP files
temporary screenshots
```

After any full-tree copy, check immediately for line-ending contamination:

```bash
git status --short
git diff --stat
git diff --numstat
```

If hundreds of unrelated files appear modified or CRLF/LF churn is detected:

1. stop the migration;
2. do not commit the polluted state;
3. discard the contaminated WSL clone;
4. create a new clean clone;
5. re-transfer only the intentional Git diff and required untracked files.

## Dependency installation and validation

Install dependencies only in the WSL-native workspace.

```bash
npm ci
```

After installation, verify that dependency installation did not mutate package metadata:

```bash
git diff -- package.json package-lock.json
```

Unless the assignment explicitly changes dependencies, both files must remain unchanged.

Run the assigned validation sequence from the same WSL workspace. A typical sequence is:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:check
```

Record exact pass, fail, skip, warning, and error counts. Do not report only “green.”

## Long-running Playwright and Chromium jobs

Do not start a long capture run with `&` inside a short-timeout shell command. When the shell times out, the tool may terminate the Node process and its Chromium children, producing misleading errors such as:

```text
browser has been closed
Target page, context or browser has been closed
interrupted
```

Allowed execution patterns:

1. foreground execution with a timeout long enough for the full run; or
2. a dedicated background-process tool with explicit log polling and process-state checks.

Required safeguards:

- only one capture process per assignment;
- no duplicate Chromium runs;
- explicit output directory cleanup before a fresh run;
- progress logging;
- final screenshot count and SHA-256 verification;
- no automatic restart of a large capture matrix after a partial failure.

## Evidence and exports

Generate evidence in WSL first. After validation, copy only the final artifact to the Windows drive.

Example:

```text
WSL source:
$HOME/lovetree-captures/<task>/artifact.zip

Windows export:
/mnt/g/Ddrive/BatangD/task/workdiary/LoveBud/artifact.zip
```

Verify the WSL source and Windows copy have identical SHA-256 values.

## Preservation and cleanup

Do not delete the previous Windows-mounted worktree automatically.

It remains preserved until all of the following are confirmed:

- branch identity matches;
- starting HEAD matches;
- intentional uncommitted changes were preserved;
- `npm ci` succeeds in WSL;
- the assigned validation sequence can run;
- the new commit and push, when authorized, succeed;
- the user approves cleanup.

Generated WSL worktrees may also remain until the related Draft PR or branch is no longer needed.

## Git and release controls

Workspace migration does not authorize product or release actions.

Unless the user explicitly approves them, agents must not:

- mark a Draft PR Ready for review;
- merge;
- deploy;
- alter unrelated PRs;
- change a PR base branch;
- edit protected V1/V2/V3, auth, API, database, schema, migration, Worker, or Wrangler scopes;
- delete an existing worktree;
- broaden the assigned implementation or capture scope.

## Required migration report

Use this report after moving an active task:

```text
LoveTree WSL Workspace Migration

Marker:
LOVETREE_WSL_WORKSPACE_READY
or
LOVETREE_WSL_WORKSPACE_BLOCKED

Computer/Agent:
Old path:
New path:
Branch:
Old HEAD:
New starting HEAD:
Old git status:
New git status:
Uncommitted changes preserved:
Node version:
Filesystem:
npm ci:
package.json changed:
package-lock.json changed:
Old worktree preserved:
Implementation resumed:
Git push performed:
PR changed:
Merge:
Deploy:
```

## Enforcement in future prompts

Every new LoveTree implementation, validation, capture, or remediation prompt must include:

```text
Run only from a WSL-native workspace under $HOME/worktrees/**.
Do not run npm, lint, tests, builds, Playwright, Chromium, or development servers from /mnt/g or /mnt/c.
Perform the mandatory preflight before work begins.
```

A new model or replacement agent is not exempt from this policy.
