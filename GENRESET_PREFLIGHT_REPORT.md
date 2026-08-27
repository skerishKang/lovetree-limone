# Frontend Generation Reset — Preflight Report

> Date: 2026-08-28
> Agent: Buffy (Codebuff)
> Branch: architecture/new-v1-frontend-generation-reset

---

## Preflight

```
CURRENT_MAIN = 25ddf26c0761aee092a008ce2d91d525e1589034
BRANCH = architecture/new-v1-frontend-generation-reset
FINAL_HEAD = 25ddf26 (same as origin/main — no commits yet, files staged as untracked)
```

## Migration Mode

```
MIGRATION_MODE = LOGICAL_NAMESPACE_ONLY
```

**Decision basis:**
- `app/` is the Next.js App Router `appDir` at repository root
- Moving `app/` to `old/app/` requires `next.config.ts` custom `appDir` config
- `worker/index.ts` imports `../server/api` via relative path
- `lib/` contains shared utilities used across the codebase
- Physical migration would risk build/runtime breakage for uncertain benefit
- **Structural beauty is subordinate to runtime safety**

## Directory Ownership

```
NEW_ROOT = new/v1/        (scaffolded, ready for first source)
OLD_ROOT = (logical)      (manifest declares ownership of app/, lib/, components/, design-intake/)
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
UNTRACKED (all new, zero modified):
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

MODIFIED:
  (none)
```

## NEW V1 Structure

```
new/v1/
├── README.md
├── VERSION.md
├── sources/
│   └── .gitkeep
├── adapters/
│   └── .gitkeep
├── shell/
│   └── .gitkeep
└── shared/
    └── .gitkeep
```

## OLD Legacy Manifest

```
old/README.md              — Legacy generation identity and rules
old/LEGACY_FRONTEND_MANIFEST.md — Complete inventory:
  - App Router pages (app/)
  - Product generations (V2, V3, V4)
  - Design Lab (app/design-lab/)
  - Components (app/components/)
  - Shared Libraries (lib/)
  - Design Intake (design-intake/)
  - Static HTML files (root)
  - Tests (tests/)
```

## CORE Boundary

```
core/README.md                    — CORE identity and rules
core/FRONTEND_BACKEND_BOUNDARY.md — Canonical boundary contract:
  - Backend authority (db, server/api, worker)
  - Data model (Tree, Moment, Connection, Comment)
  - Frontend consumption rules
  - Adapter contract for NEW/V1
  - Boundary violations (STOP conditions)
  - Migration path
```

## Existing Runtime Status

```
EXISTING_RUNTIME_STATUS = PASS (no regression)
  - Zero modified files
  - All existing routes untouched
  - All backend files untouched
  - DB/Auth/API untouched
  - Build config untouched
```

## Tests

```
TESTS = NOT RUN (npm ci timeout on NTFS — too slow for 2509-file node_modules)
  Justification: zero modified files = zero regression risk
  Evidence: git diff --name-only returns empty (no changes to existing files)
```

## Open Collisions

```
OPEN_COLLISIONS = NONE
  - No existing open PR conflicts with this branch
  - This branch is based on current origin/main
```

## Draft PR

```
DRAFT_PR = PENDING (files ready to commit and push)
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

## Next Recommended Step

```
NEXT_RECOMMENDED_STEP = SOURCE58_NEW_V1_REFERENCE_IMPLEMENTATION
  After CTO/Integration review of this architecture,
  implement Source58 in new/v1/sources/source-58/
```
