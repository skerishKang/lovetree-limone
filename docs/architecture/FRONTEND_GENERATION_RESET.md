# Frontend Generation Reset

> Established: 2026-08-28
> Author: Buffy (Codebuff agent)
> Authority: LOCAL IMPLEMENTER — zero-backend-mutation

---

## 1. Overview

This document establishes the **Frontend Generation Reset** architecture for LoveTree Limone.

The goal: freeze all existing LoveTree frontend as `OLD`, create a new `NEW` generation with separated Source Library and Product Version axes, and define the shared `CORE` backend boundary.

## 2. Generations

### OLD (Legacy Frontend)

- All existing frontend: `app/`, `components/`, `design-intake/`, `design-lab/`
- Product generations: V2, V3, V4/Next
- Source track implementations in `lib/` (OLD_FRONTEND_LIB zone)
- Design lineage implementations in `lib/` (OLD_FRONTEND_LIB zone)
- Historical static HTML files at root
- Legacy test suite

**Status**: PRESERVED IN PLACE. No new product design work begins here.

### NEW (Next Frontend Generation)

```
new/
├── sources/          — Authoritative source library (product-version independent)
├── versions/         — Product versions that compose sources
│   └── v1/           — LoveTree product version 1
│       ├── manifest/
│       ├── adapters/
│       ├── shell/
│       ├── routes/
│       ├── navigation/
│       └── shared/
└── standards/        — Operating standards and conventions
```

**Status**: SCAFFOLDED. Standards drafted. Ready for first source intake.

### CORE (Shared Backend Boundary)

- Location: `core/`
- Boundary documentation: `core/FRONTEND_BACKEND_BOUNDARY.md`

**Status**: DOCUMENTED. No backend files moved.

## 3. Key Architecture Principle

```
SOURCE_REVISION ≠ PRODUCT_VERSION
```

- Source Capsules have their own revision (SRC058 V1.2)
- Product Versions reference sources (NEW V1 = SRC064 + SRC057 + SRC056 + SRC060 + SRC058)
- These are **separate axes** — never conflated

## 4. lib/ Ownership Split

`lib/` is **NOT** entirely OLD. It is split into two logical zones:

- **OLD_FRONTEND_LIB**: Design/source/lineage/presentation/frontend implementation files (OLD-owned)
- **SHARED_CORE_BRIDGE_LIB**: `lib/api.ts`, `lib/auth.tsx`, `lib/auth-errors.ts`, `lib/auth-token-provider.ts`, `lib/firebase.ts` — **OPTIONAL host/shell reuse, NOT source capsule dependency**

No physical file movement. Logical documentation split only.

## 5. Key Policy

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

## 6. Migration Mode

**LOGICAL_NAMESPACE_ONLY**

Physical migration was rejected because **structural beauty is subordinate to runtime safety**.

## 7. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    REPOSITORY ROOT                        │
│                                                           │
│  ┌──────────────────────┐  ┌──────────────────────────┐  │
│  │   OLD (Legacy)       │  │   NEW (Next Gen)         │  │
│  │                      │  │                          │  │
│  │  app/ (in place)     │  │  sources/                │  │
│  │  OLD_FRONTEND_LIB    │  │  (product-version        │  │
│  │  components/         │  │   independent)           │  │
│  │  design-intake/      │  │                          │  │
│  │                      │  │  versions/v1/            │  │
│  │  Manifest only:      │  │  (composes sources)      │  │
│  │  old/README.md       │  │                          │  │
│  │  old/MANIFEST.md     │  │  standards/              │  │
│  │                      │  │  (operating rules)       │  │
│  └──────────┬───────────┘  └──────────┬───────────────┘  │
│             │                          │                   │
│             └──────────┬───────────────┘                   │
│                        │                                   │
│  SHARED_BACKEND_CONTRACT = MANDATORY                       │
│  SHARED_CORE_BRIDGE_LIB = OPTIONAL HOST/SHELL REUSE       │
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

## 8. Source Implementation Rules

### NEW_SOURCE_RULE

```
PRESERVE FIRST
CONNECT SECOND
REFACTOR LAST

AUTHORITATIVE HTML/CSS/JS
→ framework-independent plain JS
→ canonical HTTP API via plain JS adapter
→ Auth/Tree/Moment context via shell/host bridge
→ visual/interaction parity verification
→ only later optional React migration
```

### Source Capsule Structure

```
new/sources/SRC058/
├── SRC058-00-manifest.json
├── SRC058-01-raw/           (immutable)
├── SRC058-02-runtime/
├── SRC058-03-evidence/
└── SRC058-04-tests/
```

### What React/Next Conversion Is NOT

- React/Next/TSX conversion is NOT required for source implementation
- React migration is only done in a separately approved migration step
- The default is exact HTML/CSS/JS preservation
- Source capsules are framework-independent plain JS

## 9. Proving Namespace

NEW uses `/new/...` as its proving namespace.

Product route connection happens only after source parity is proven.

## 10. Existing Fidelity Work

Issues #539, #540, #541–#545: `HOLD_PENDING_NEW_FRONTEND_GENERATION`

## 11. Safety Constraints

### ZERO MUTATION

This task does NOT:

- ❌ Modify DB schema, migrations, Auth, API semantics
- ❌ Modify backend persistence, Provider config, secrets
- ❌ Delete or rewrite existing frontend code
- ❌ Move existing files physically
- ❌ Fork SHARED_CORE_BRIDGE_LIB files

## 12. Next Steps

1. **#547 architecture closure** — Integration CTO review completion
2. **Source56/57/58/60/64 intake** — First source capsules in `new/sources/`
3. **V1 composition** — Connect sources to product version via adapters
