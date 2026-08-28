# Google Drive / Local Workspace Sync Authority

> Established: 2026-08-28
> Scope: LoveTree Limone repository workspace and Google Drive for desktop synchronization

## Purpose

This policy defines how agents must reason about the relationship between GitHub, Google Drive, and the Windows shared sync root.

The important distinction is that an authenticated Google Drive connector does **not** provide direct Windows/NTFS access, but a mutation against the exact Google Drive folder synchronized by Google Drive for desktop can propagate to the user's local filesystem. Such a mutation is therefore an **indirect local workspace mutation** and must be treated with the same care as a local file operation.

## Authority classes

```text
GITHUB_REMOTE
= durable code / branch / commit / PR / issue ledger

DESIGN_AUTHORITY_DRIVE
= source/provenance authority such as 03_디자인채택본, 코덱스, 결과물
= READ_ONLY_BY_DEFAULT

VERIFIED_REPOSITORY_SYNC_MIRROR
= Google Drive folder proven to mirror the local shared repository root
= INDIRECT_LOCAL_SYNC_SURFACE

LOCAL_SHARED_SYNC_ROOT
= G:\Ddrive\BatangD\task\workdiary\lovetree-limone
= sync/admin surface, NOT a development workspace
```

These classes must not be conflated.

## Current verified sync mapping

Current mapping verified on 2026-08-28:

```text
LOCAL_SHARED_SYNC_ROOT = G:\Ddrive\BatangD\task\workdiary\lovetree-limone
DRIVE_FOLDER_ID = 1RkUVTc0JAZTZfmRJPHGrPVBgtc3zSEtm
DRIVE_PARENT_ID = 1EagkkfuK-P5FARgFUwWvpA0d9vfWStWA
DRIVE_PARENT_TITLE = 내 컴퓨터
VERIFIED_MARKERS = .git / AGENTS.md / package.json / .gitignore / old / new / core
MAPPING_STATUS = VERIFIED_CURRENTLY
```

This is a current verified mapping, not an eternal name-based alias. Re-verify the folder ID, parent chain, and repository markers if metadata or workspace topology diverges.

## Google Drive for desktop semantics

When the local shared root is synchronized to a specific Google Drive folder:

```text
agent Google Drive mutation
→ cloud Drive state changes
→ Google Drive for desktop synchronizes
→ local G:\... mirror changes
```

The agent still has no direct NTFS access. However, once the mapping is proven, Drive-side create/move/rename/delete operations may affect the local shared root after synchronization. Report these operations as `INDIRECT_LOCAL_WORKSPACE_MUTATION`, not as remote-only changes.

## Exact-folder hard gate

Same-name `lovetree-limone` copies, snapshots, backups, exports, or historical mirrors may exist in Drive. Folder name alone is never sufficient authority.

Before mutating a synchronized repository mirror, verify as many of the following as the connector exposes:

1. exact Drive folder ID;
2. parent chain / expected workspace location;
3. repository marker files such as `package.json`, `.gitignore`, `AGENTS.md`, `new/`, `old/`, `core/`;
4. expected file metadata / current snapshot characteristics;
5. correspondence to the user's declared local sync root when available.

If the exact synchronized folder cannot be proven:

```text
SYNC_MAPPING = UNKNOWN
MUTATION = STOP
```

Do not guess based on title or recency.

## Design originals remain read-only

This policy does **not** make LoveTree design authority folders writable.

`03_디자인채택본`, `코덱스`, `결과물`, and other authoritative source/provenance locations remain read-only by default. Do not move, rename, delete, rewrite, minify, or reorganize them unless the product owner explicitly authorizes a source-authority lifecycle change.

The ability to mutate a repository sync mirror does not grant permission to mutate source authority.

## Shared root administration

The shared root is not an execution workspace. Do not run builds, tests, package installs, dev servers, Playwright, browser capture, or ordinary code implementation directly there.

When the product owner explicitly requests repository/file organization, bounded file/folder lifecycle administration may be performed against the **verified repository sync mirror**, including cloud-side Drive operations that will synchronize locally.

### Hard prohibitions

Never mutate through Drive administration:

- `.git/**` internals;
- secrets or local environment files;
- authoritative design-source folders;
- unrelated folders.

Do not move `.wt` or active worktree/agent state without a separate exact activity audit.

### Generated/local-state cleanup exception

`node_modules`, `node_modules_old`, `dist`, `.wrangler`, `temp`, `tsconfig.tsbuildinfo`, browser/runtime caches and similar generated/local state are **do-not-touch by default**, but may be moved to a reversible archive inside the verified sync mirror when **all** of the following are true:

1. the product owner explicitly requested physical repository cleanup;
2. the exact Drive↔local sync mapping is verified;
3. the target is proven Git-ignored or untracked;
4. there is no active process/worktree dependency on the target;
5. the operation is a bounded, non-destructive, reversible archive move;
6. the destination is recorded and the resulting parent ID is verified.

This exception does **not** apply to Git-tracked runtime source, `.git` internals, secrets, or design-source authority.

Current cleanup convention:

```text
old/workspace-archive/
├─ generated-local-state/
├─ reports-and-outputs/
├─ preserved-local-history/
└─ legacy-audit-bundles/
```

## Git remains mandatory

Drive synchronization is a transport / filesystem mechanism. It does not replace Git.

A Drive-side move inside the synchronized repository may appear locally as Git rename/add/delete changes. Those working-tree changes are not durable completion. They must be reconciled through the normal Git process on an appropriate branch/worktree:

```text
verify working tree
→ branch/worktree ownership
→ git status / diff
→ commit
→ push
→ PR / integration
```

Never use Google Drive operations to bypass branch isolation, review, CI, or Git history.

Git-tracked runtime-source relocation such as moving `app/`, `lib/`, `server/`, `db/`, `drizzle/`, `worker/`, or `public/` into OLD/CORE is a **code-aware migration**, not ordinary Drive cleanup. Perform it on a dedicated Git branch with dependency/config updates and CI; do not blind-move those tracked paths through Drive.

## Agent response rule

When the product owner refers to the local path `G:\Ddrive\BatangD\task\workdiary\lovetree-limone`, an agent must not stop at "I cannot access your local drive" if authenticated Google Drive access is available.

Instead:

1. recognize that the path may be a Google Drive for desktop sync mirror;
2. check whether the exact Drive-side folder can be identified;
3. determine whether the requested operation is supported by the Drive connector;
4. classify the target as source authority vs repository sync mirror;
5. only then decide whether indirect local administration is possible.

Conversely, never promise local propagation until the exact Drive↔local mapping is proven.

## Summary contract

```text
GITHUB_REMOTE = DURABLE_CODE_LEDGER
DESIGN_AUTHORITY_DRIVE = READ_ONLY_BY_DEFAULT
VERIFIED_REPOSITORY_SYNC_MIRROR = INDIRECT_LOCAL_SYNC_SURFACE
LOCAL_SHARED_ROOT = SYNC_ADMIN_SURFACE_NOT_DEVELOPMENT_WORKSPACE
DRIVE_MUTATION_REQUIRES_EXACT_FOLDER_MAPPING = YES
DRIVE_MUTATION_BYPASSES_GIT = NO
GENERATED_LOCAL_STATE_CLEANUP = EXPLICIT_BOUNDED_ARCHIVE_ONLY
TRACKED_RUNTIME_RELOCATION = CODE_AWARE_GIT_MIGRATION_ONLY
UNKNOWN_MAPPING = STOP
```
