# Frontend Generation Reset

> Established: 2026-08-28
> Author: Buffy (Codebuff agent)
> Authority: LOCAL IMPLEMENTER — zero-backend-mutation

---

## 1. Overview

This document establishes the **Frontend Generation Reset** architecture for LoveTree Limone.

The goal: freeze all existing LoveTree frontend as `OLD`, create a new `NEW/V1` generation for source-faithful implementations, and define the shared `CORE` backend boundary.

## 2. Generations

### OLD (Legacy Frontend)

- All existing frontend: `app/`, `components/`, `design-intake/`, `design-lab/`
- Product generations: V2, V3, V4/Next
- Source track implementations in `lib/` (OLD_FRONTEND_LIB zone)
- Design lineage implementations in `lib/` (OLD_FRONTEND_LIB zone)
- Historical static HTML files at root
- Legacy test suite

**Status**: PRESERVED IN PLACE. No new product design work begins here.

### NEW (V1 Source-Faithful Generation)

- Location: `new/v1/`
- Source implementations: `new/v1/sources/`
- Adapter layer: `new/v1/adapters/`
- Shell infrastructure: `new/v1/shell/`
- Shared utilities: `new/v1/shared/`

**Status**: SCAFFOLDED. Ready for first source implementation.

### CORE (Shared Backend Boundary)

- Location: `core/`
- Boundary documentation: `core/FRONTEND_BACKEND_BOUNDARY.md`

**Status**: DOCUMENTED. No backend files moved.

### lib/ Ownership Split

`lib/` is **NOT** entirely OLD. It is split into two logical zones:

- **OLD_FRONTEND_LIB**: Design/source/lineage/presentation/frontend implementation files (OLD-owned)
- **SHARED_CORE_BRIDGE_LIB**: `lib/api.ts`, `lib/auth.tsx`, `lib/auth-errors.ts`, `lib/auth-token-provider.ts`, `lib/firebase.ts` — **OPTIONAL host/shell reuse, NOT source capsule dependency**

No physical file movement. Logical documentation split only.

### Key Policy

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

## 3. Migration Mode

**LOGICAL_NAMESPACE_ONLY**

### Why Not Physical Move

The repository uses Next.js App Router with `app/` at the repository root. Moving `app/` to `old/app/` would require:

1. Modifying `next.config.ts` to set a custom `appDir`
2. Updating all `worker/index.ts` imports (currently `vinext/server/app-router-entry`)
3. Risking broken build/runtime for uncertain benefit
4. The `lib/` directory contains both frontend and shared utilities used across the codebase

Physical migration was rejected because **structural beauty is subordinate to runtime safety**.

### What Logical Namespace Means

- `old/`, `new/`, `core/` exist as documentation and manifest directories
- The actual legacy code stays at its current paths
- `old/LEGACY_FRONTEND_MANIFEST.md` declares ownership of legacy areas
- `new/v1/` is a clean proving ground for new implementations
- `core/FRONTEND_BACKEND_BOUNDARY.md` defines the shared contract

## 4. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    REPOSITORY ROOT                        │
│                                                           │
│  ┌──────────────────────┐  ┌──────────────────────────┐  │
│  │   OLD (Legacy)       │  │   NEW/V1 (Source)        │  │
│  │                      │  │                          │  │
│  │  app/ (in place)     │  │  new/v1/sources/         │  │
│  │  OLD_FRONTEND_LIB    │  │  (framework-indep. JS)   │  │
│  │  components/         │  │  new/v1/adapters/        │  │
│  │  design-intake/      │  │  (plain JS, canonical    │  │
│  │                      │  │   HTTP API directly)     │  │
│  │  Manifest only:      │  │  new/v1/shell/           │  │
│  │  old/README.md       │  │  new/v1/shared/          │  │
│  │  old/MANIFEST.md     │  │                          │  │
│  └──────────┬───────────┘  └──────────┬───────────────┘  │
│             │                          │                   │
│             └──────────┬───────────────┘                   │
│                        │                                   │
│  SHARED_BACKEND_CONTRACT = MANDATORY                       │
│  (all generations consume same canonical HTTP API)         │
│                        │                                   │
│  SHARED_CORE_BRIDGE_LIB = OPTIONAL HOST/SHELL REUSE       │
│  (React/TS bridge — source capsules do NOT depend)         │
│                        │                                   │
│              ┌─────────▼─────────┐                         │
│              │     CORE          │                         │
│              │  (Boundary Docs)  │                         │
│              └─────────┬─────────┘                         │
│                        │                                   │
│  ┌─────────────────────▼─────────────────────────────────┐│
│  │           SHARED BACKEND (UNCHANGED)                   ││
│  │  db/schema.ts · db/index.ts · drizzle/                 ││
│  │  server/api/ · worker/                                 ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 5. Source Implementation Rules

### NEW_SOURCE_RULE

```
AUTHORITATIVE HTML/CSS/JS
→ framework-independent plain JS
→ canonical HTTP API via plain JS adapter
→ Auth/Tree/Moment context via shell/host bridge
→ visual/interaction parity verification
→ only later optional React migration
```

### Implementation Steps

1. Receive authoritative HTML source
2. Create `new/v1/sources/source-{id}/`
3. Preserve HTML DOM structure in `index.html`
4. Extract inline CSS → `styles.css`
5. Extract inline JS → `app.js`
6. Preserve relative asset paths
7. Preserve behavior
8. Create `source-manifest.json`
9. Create plain JS adapter in `new/v1/adapters/` (canonical HTTP API, no React/TS import)
10. Verify visual/interaction parity

### What React/Next Conversion Is NOT

- React/Next/TSX conversion is NOT required for source implementation
- React migration is only done in a separately approved migration step
- The default is exact HTML/CSS/JS preservation
- Source capsules are framework-independent plain JS

## 6. Proving Namespace

NEW/V1 uses `/new/v1/...` as its proving namespace.

First source example: `/new/v1/source-58`

Product route connection happens only after NEW source parity is proven.

## 7. Existing Fidelity Work

Issues #539, #540, #541–#545 (fidelity recovery) were created before this architecture decision.

Status: `HOLD_PENDING_NEW_FRONTEND_GENERATION`

- Do not continue these implementations in this task
- Do not close these issues
- Do not delete existing code
- These are preserved as historical evidence

## 8. Safety Constraints

### ZERO MUTATION

This task performs:

- ✅ New documentation files (`old/`, `new/`, `core/`, `docs/architecture/`)
- ✅ New scaffold directories (`new/v1/sources/`, etc.)
- ✅ Logical namespace declarations
- ✅ lib/ ownership split (documentation only)
- ✅ SHARED_CORE_BRIDGE_LIB policy clarification

This task does NOT:

- ❌ Modify DB schema
- ❌ Modify migrations
- ❌ Modify Auth behavior
- ❌ Modify API semantics
- ❌ Modify backend persistence
- ❌ Modify Provider configuration
- ❌ Modify secrets
- ❌ Modify Production deployment target
- ❌ Delete existing frontend code
- ❌ Rewrite existing frontend code
- ❌ Move existing files physically
- ❌ Fork SHARED_CORE_BRIDGE_LIB files

## 9. Verification

- [ ] `git diff` shows only new/modified documentation files
- [ ] No backend/schema/Auth/API mutation
- [ ] `old/` manifest exists with lib/ split
- [ ] `new/v1/` scaffold exists
- [ ] `core/` boundary docs exist with SHARED_CORE_BRIDGE_LIB policy
- [ ] `docs/architecture/FRONTEND_GENERATION_RESET.md` exists
- [ ] Existing build still works
- [ ] Existing tests still pass

## 10. Next Steps

1. **#547 architecture closure** — Integration 
CTO review completion
2. **NEW operating standard** — Define NEW/V1 operating rules:
   - Source numbering scheme
   - Folder/file numbering conventions
   - RAW / runtime / adapter / evidence structure
   - Revision tracking rules
   - Cache busting strategy
3. **Source58 NEW/V1 reference implementation** — First source implementation in `new/v1/sources/source-58/`
