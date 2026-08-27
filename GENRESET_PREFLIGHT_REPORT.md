# Frontend Generation Reset — Preflight Report

> Date: 2026-08-28
> Agent: Buffy (Codebuff)
> Branch: architecture/new-v1-frontend-generation-reset

---

## Architecture Establishment

```
INITIAL_ARCHITECTURE_COMMIT = 3545c5580e5c6d5a02c544ba2b5a54da5f2ba9f3
CURRENT_PR_HEAD = GitHub PR #547 head is Source of Truth
BRANCH = architecture/new-v1-frontend-generation-reset
REMOTE = origin → https://github.com/skerishKang/lovetree-limone.git
REMOTE_BRANCH_PUSHED = YES
```

Do not hard-code SHA in documents. PR #547 head is the canonical reference.

## Migration Mode

```
MIGRATION_MODE = LOGICAL_NAMESPACE_ONLY
```

**Decision basis:**
- `app/` is the Next.js App Router `appDir` at repository root
- Moving `app/` to `old/app/` requires `next.config.ts` custom `appDir` config
- `worker/index.ts` imports `../server/api` via relative path
- Physical migration would risk build/runtime breakage for uncertain benefit
- **Structural beauty is subordinate to runtime safety**

## lib/ Ownership Split

```
OLD_FRONTEND_LIB =
  design/source/lineage/presentation/frontend implementation
  (lib/design-*, lib/lineage-*, lib/source-track-*, lib/experience-*,
   lib/v4-orbit-*, lib/moment-*, lib/tree-types.ts, etc.)

SHARED_CORE_BRIDGE_LIB =
  lib/api.ts
  lib/auth.tsx
  lib/auth-errors.ts
  lib/auth-token-provider.ts
  lib/firebase.ts
  OPTIONAL HOST/SHELL REUSE — NOT SOURCE CAPSULE DEPENDENCY
```

Physical file movement: NONE. Logical documentation split only.

## Key Policy

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

## Directory Ownership

```
NEW_ROOT = new/v1/        (scaffolded, ready for first source)
OLD_ROOT = (logical)      (manifest declares ownership of app/, components/, design-intake/)
CORE_ROOT = core/          (boundary documentation only)
```

## Safety Gates

```
BACKEND_MUTATION = NO
DB_MUTATION = NO
AUTH_MUTATION = NO
API_SEMANTIC_MUTATION = NO
```

## Changed Files

```
old/README.md
old/LEGACY_FRONTEND_MANIFEST.md
core/README.md
core/FRONTEND_BACKEND_BOUNDARY.md
new/v1/README.md
new/v1/VERSION.md
new/v1/sources/.gitkeep
new/v1/adapters/.gitkeep
new/v1/shell/.gitkeep
new/v1/shared/.gitkeep
docs/architecture/FRONTEND_GENERATION_RESET.md
GENRESET_PREFLIGHT_REPORT.md
```

## Existing Runtime Status

```
EXISTING_RUNTIME_STATUS = PASS (no regression)
  - Zero modified tracked files
  - All existing routes untouched
  - All backend files untouched
  - DB/Auth/API untouched
  - Build config untouched
```

## Tests

```
TESTS = NOT RUN (npm ci timeout on NTFS — too slow for 2509-file node_modules)
  Justification: zero modified tracked files = zero regression risk
  Evidence: git diff --name-only returns empty (no changes to existing files)
```

## Open Collisions

```
OPEN_COLLISIONS = NONE
```

## Source58 Status

```
SOURCE58_NEW_V1_REFERENCE_IMPLEMENTATION = HOLD
  This task only establishes the generation architecture.
  Source58 implementation is a separate task.
```

## Existing Fidelity Issues

```
Issues #539, #540, #541-#545:
  Status = HOLD_PENDING_NEW_FRONTEND_GENERATION
  Action = No continuation in this task
  Reason = Created before this architecture decision
```

## Architecture Next Steps

1. **#547 architecture closure** — Integration CTO review completion
2. **NEW operating standard** — Define NEW/V1 operating rules:
   - Source numbering scheme
   - Folder/file numbering conventions
   - RAW / runtime / adapter / evidence structure
   - Revision tracking rules
   - Cache busting strategy
3. **Source58 NEW/V1 reference implementation** — First source implementation in `new/v1/sources/source-58/`
