# Frontend — Backend Boundary Contract

> Established: 2026-08-28
> Authority: Cross-repository platform authority (LoveBud #4004, LoveTree #152)
> Physical runtime boundary currentized: 2026-08-28

---

## 1. Canonical Backend Authority

The following remain **single canonical authority** regardless of frontend generation. The 2026-08-28 physical relocation changes paths only; it does not change backend semantics.

### Authentication
- **Current**: Firebase Authentication (`relovetree` project)
- **Target**: Staged Neon Auth migration (LoveBud #4006)
- **API**: `core/runtime/server/api/auth.ts`

### Database
- **Engine**: Neon PostgreSQL via Drizzle ORM
- **Schema**: `core/runtime/db/schema.ts` — single source of truth
- **Access**: `core/runtime/db/index.ts`
- **Migrations**: `core/runtime/drizzle/` — ordered migration files
- **Authority**: LoveBud #4005 for schema convergence

### API
- **Handler**: `core/runtime/server/api/handler.ts`
- **Routes**: `core/runtime/server/api/trees.ts`, `core/runtime/server/api/memories.ts`, `core/runtime/server/api/comments.ts`, `core/runtime/server/api/social.ts`
- **Access control**: `core/runtime/server/api/access.ts`
- **Auth**: `core/runtime/server/api/auth.ts`
- **Validation**: `core/runtime/server/api/validate.ts`
- **Errors**: `core/runtime/server/api/errors.ts`
- **HTTP**: `core/runtime/server/api/http.ts`

### Runtime
- **Worker**: `core/runtime/worker/index.ts` (Cloudflare Worker `lovetree-limone`)
- **Cache**: `core/runtime/worker/cache-policy.ts`
- **Image optimization**: via `vinext/server/image-optimization`

### SHARED_BACKEND_CONTRACT = MANDATORY

All frontend generations consume the **same** canonical HTTP API. The backend contract (endpoints, data shapes, auth flow) is mandatory and shared. No generation may fork or bypass it.

## 2. SHARED_CORE_BRIDGE_LIB (optional host/shell reuse)

These `lib/` files remain **OPTIONAL** for NEW host/shell reuse. Source capsules must NOT depend on them directly.

| File | Role |
|------|------|
| `lib/api.ts` | API client — bridges frontend to backend API |
| `lib/auth.tsx` | Auth provider — bridges frontend to Firebase Auth (React) |
| `lib/auth-errors.ts` | Auth error handling |
| `lib/auth-token-provider.ts` | Auth token provider — bridges frontend to auth tokens |
| `lib/firebase.ts` | Firebase configuration — bridges frontend to Firebase |

**Policy**:
- **SHARED_BACKEND_CONTRACT = MANDATORY**: All generations consume the same canonical HTTP API
- **SHARED_CORE_BRIDGE_LIB = OPTIONAL HOST/SHELL REUSE**: The React/TS bridge files in `lib/` may be reused by the NEW shell/host, but are NOT a source capsule dependency
- **Source capsules**: Framework-independent plain JS. Use canonical HTTP API directly via a plain JS adapter. Auth/Tree/Moment context is received through the NEW shell/host bridge.

## 3. OLD_FRONTEND_LIB

All other `lib/` files are OLD-owned frontend implementation:

- Design system (`lib/design-*`, `lib/experience-*`, `lib/design-runtime/`)
- Lineage source implementations (`lib/lineage-*`)
- Source track implementations (`lib/source-track-*`, `lib/source-codex-*`, `lib/codex14/`)
- Frontend-specific utilities (`lib/moment-model.ts`, `lib/tree-types.ts`, `lib/v4-orbit-*`, etc.)

See `old/LEGACY_FRONTEND_MANIFEST.md` §5a for the complete inventory.

## 4. Data Model (Canonical)

### Tree
- Core entity representing a user's tree
- Has subjects, moments, connections
- Writable via `core/runtime/server/api/trees.ts`

### Moment
- Core entity representing a memory/moment
- Belongs to a tree
- Writable via `core/runtime/server/api/memories.ts`

### Connection
- Social relationship between trees/users
- Writable via `core/runtime/server/api/social.ts`

### Comment
- Comments on moments/trees
- Writable via `core/runtime/server/api/comments.ts`

## 5. Frontend Consumption Rules

### OLD Generation (Legacy)
- Consumes backend via SHARED_CORE_BRIDGE_LIB (`lib/api.ts`, `lib/auth.tsx`)
- May use direct Firebase SDK calls via `lib/firebase.ts`
- Route structure: `app/v2/`, `app/v3/`, `app/v4/`, `app/design-lab/`

### NEW Generation (V1)
- **SHARED_BACKEND_CONTRACT = MANDATORY**: Must consume the same canonical HTTP API
- **SHARED_CORE_BRIDGE_LIB = OPTIONAL**: May reuse React/TS bridge files in host/shell, but source capsules do NOT depend on them
- **Source capsules**: Framework-independent plain JS adapter uses canonical HTTP API directly
- Must not fork backend truth
- Must not create a second canonical DB writer
- Route structure: `/new/...` (proving namespace)

### Shared Rules
1. Both generations may read from the same backend simultaneously
2. Both generations write through the same API endpoints
3. Neither generation creates its own database tables
4. Neither generation creates its own authentication system
5. Neither generation deploys its own Worker
6. SHARED_BACKEND_CONTRACT is mandatory for all generations
7. SHARED_CORE_BRIDGE_LIB is optional host/shell reuse — source capsules do not depend on it

## 6. Adapter Contract (NEW/V1)

The adapter layer in `new/versions/v1/adapters/` serves one purpose:

```
canonical backend/API data → source UI expected data shape
source UI events → canonical product route/state/action
```

The adapter is **plain JS**. It uses the canonical HTTP API directly. It does NOT import React/TS bridge files from `lib/`.

Constraints:
- Adapter must not rewrite source HTML/CSS/JS visual hierarchy
- Adapter must not fork backend truth
- Adapter must be thin — it bridges, it does not own
- Adapter must be framework-independent (plain JS)

## 7. Boundary Violations (STOP)

The following are boundary violations that halt work:

- Creating a second database writer
- Creating a second authentication system
- Forking `core/runtime/db/schema.ts`
- Modifying `core/runtime/server/api/` semantics without cross-repo authority
- Deploying a separate Worker for NEW generation
- Exposing new secrets or provider configurations
- Mutating Production data for validation
- Source capsule importing React/TS bridge from SHARED_CORE_BRIDGE_LIB
- Forking SHARED_CORE_BRIDGE_LIB files

## 8. Physical Runtime Relocation Rule

The canonical backend runtime is physically grouped under `core/runtime/`:

```
core/runtime/
├─ db/
├─ drizzle/
├─ server/
└─ worker/
```

This relocation is **mechanical path ownership only**. It must preserve the exact schema, migrations, API behavior, Auth behavior, Worker behavior, and Production data semantics. Root build/deploy configuration may point into `core/runtime/**`; no duplicate canonical backend may exist.

## 9. Migration Path

When NEW/V1 achieves source parity:

1. NEW proving routes may be promoted to product routes
2. OLD routes may be deprecated (not deleted)
3. Backend remains single canonical authority throughout
4. SHARED_BACKEND_CONTRACT remains mandatory throughout
5. SHARED_CORE_BRIDGE_LIB remains optional host/shell reuse
6. Cross-repo authority (LoveBud #4004/#4005/#4006) governs any backend semantic changes
