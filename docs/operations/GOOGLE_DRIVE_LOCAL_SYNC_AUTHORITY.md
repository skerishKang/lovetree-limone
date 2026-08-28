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

Even for authorized administration, do not mutate:

- `.git/**` internals;
- secrets or local environment files;
- `node_modules/**`;
- generated caches/build outputs;
- unrelated folders;
- source-authority Drive folders.

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
UNKNOWN_MAPPING = STOP
```
