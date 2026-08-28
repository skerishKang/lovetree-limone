# NEW Operating Standard

> Established: 2026-08-28
> Authority: Integration CTO review via PR #547

---

## Core Principle

```
PRESERVE FIRST
CONNECT SECOND
REFACTOR LAST
```

## Authority Rules

1. **Authoritative executable is normative** — the original HTML/CSS/JS source is the single source of truth
2. **HTML/CSS/JS exact preservation** — DOM structure, CSS, JS behavior preserved exactly
3. **React/Next/TSX conversion not required** — default is framework-independent plain JS
4. **Backend/API/Auth/DB shared and unchanged** — `SHARED_BACKEND_CONTRACT = MANDATORY`
5. **Source library and Product Version are separate axes** — `SOURCE_REVISION ≠ PRODUCT_VERSION`
6. **No early common UI refactor** — preserve first, connect second, refactor last

## Zero Mutation

```
BACKEND_MUTATION = NO
DB_MUTATION = NO
AUTH_MUTATION = NO
API_SEMANTIC_MUTATION = NO
```

## SHARED_CORE_BRIDGE_LIB Policy

```
SHARED_BACKEND_CONTRACT = MANDATORY
  All generations consume the same canonical HTTP API.

SHARED_CORE_BRIDGE_LIB = OPTIONAL HOST/SHELL REUSE
  React/TS bridge files may be reused by NEW shell/host,
  but source capsules do NOT depend on them.

SOURCE CAPSULE = FRAMEWORK-INDEPENDENT PLAIN JS
  Uses canonical HTTP API directly via plain JS adapter.
  Auth/Tree/Moment context via NEW shell/host bridge.
```

## Identity Namespace

The NEW identity namespace is fixed:

```
SRC / TRK / LIN / CDX / CAP / MST / FAM
```

- `SRC` = authoritative Source
- `TRK` = Track
- `LIN` = Lineage
- `CDX` = Codex
- `CAP` = Capability
- `MST` = 108 evaluation / master row
- `FAM` = normalized unique family

An equal number across prefixes implies **no** relation. `SRC058 != TRK058 != LIN058`, `CDX008 != LIN008`. Relationships are declared only through the explicit `RELATIONS[]` array in the capsule manifest.

The **108 evaluation corpus** is `MST001`–`MST108`. It is **not** `SRC001`–`SRC108`. `MST` (evaluation row identity) and `SRC` (source authority identity) are different entities. No full 108 Source allocation is assumed; only the Five-Source preallocation exists (`SRC056/SRC057/SRC058/SRC060/SRC064`).

## Workspace / Drive Sync Boundary

NEW work inherits the repository-wide workspace contract in `AGENTS.md` and `docs/operations/GOOGLE_DRIVE_LOCAL_SYNC_AUTHORITY.md`.

```text
GITHUB_REMOTE = DURABLE_CODE_LEDGER
DESIGN_AUTHORITY_DRIVE = READ_ONLY_BY_DEFAULT
VERIFIED_REPOSITORY_SYNC_MIRROR = INDIRECT_LOCAL_SYNC_SURFACE
LOCAL_SHARED_ROOT = G:\Ddrive\BatangD\task\workdiary\lovetree-limone
LOCAL_SHARED_ROOT_ROLE = SYNC_ADMIN_SURFACE_NOT_DEVELOPMENT_WORKSPACE
```

Rules:

- Do not treat every Google Drive folder as read-only or every Drive folder as mutable. First classify it as source authority vs verified repository sync mirror.
- An authenticated Drive connector is not direct Windows access, but a mutation against the exact Google Drive for desktop synchronized repository mirror can propagate to the local `G:` sync root. Treat it as `INDIRECT_LOCAL_WORKSPACE_MUTATION`.
- Same-name Drive copies/snapshots are not authority. Exact folder ID and repository markers must be proven before any Drive-side workspace mutation; unresolved mapping means `STOP`.
- Source authority folders (`03_디자인채택본`, `코덱스`, `결과물`, etc.) remain read-only by default.
- The shared sync root is not a build/test/implementation workspace. Development remains per-Lane worktree based.
- Drive synchronization never replaces Git branch/commit/PR/CI history. Any synchronized repository file move must be reconciled through Git before completion.

## Proving Namespace

NEW uses `/new/...` as its proving namespace.

Product route connection happens only after source parity is proven.

## Existing Fidelity Issues

Issues #539, #540, #541–#545: `HOLD_PENDING_NEW_FRONTEND_GENERATION`
