# Frontend — Backend Boundary Contract

> Established: 2026-08-28
> Authority: Cross-repository platform authority (LoveBud #4004, LoveTree #152)

---

## 1. Canonical Backend Authority

The following remain **single canonical authority** regardless of frontend generation:

### Authentication
- **Current**: Firebase Authentication (`relovetree` project)
- **Target**: Staged Neon Auth migration (LoveBud #4006)
- **API**: `server/api/auth.ts`

### Database
- **Engine**: Neon PostgreSQL via Drizzle ORM
- **Schema**: `db/schema.ts` — single source of truth
- **Access**: `db/index.ts`
- **Migrations**: `drizzle/` — ordered migration files
- **Authority**: LoveBud #4005 for schema convergence

### API
- **Handler**: `server/api/handler.ts`
- **Routes**: `server/api/trees.ts`, `server/api/memories.ts`, `server/api/comments.ts`, `server/api/social.ts`
- **Access control**: `server/api/access.ts`
- **Auth**: `server/api/auth.ts`
- **Validation**: `server/api/validate.ts`
- **Errors**: `server/api/errors.ts`
- **HTTP**: `server/api/http.ts`

### Runtime
- **Worker**: `worker/index.ts` (Cloudflare Worker `lovetree-limone`)
- **Cache**: `worker/cache-policy.ts`
- **Image optimization**: via `vinext/server/image-optimization`

## 2. SHARED_CORE_BRIDGE_LIB

These `lib/` files are **SHARED** between OLD and NEW generations. Neither generation exclusively owns them. They bridge frontend to canonical backend.

| File | Role |
|------|------|
| `lib/api.ts` | API client — bridges frontend to backend API |
| `lib/auth.tsx` | Auth provider — bridges frontend to Firebase Auth |
| `lib/auth-errors.ts` | Auth error handling |
| `lib/auth-token-provider.ts` | Auth token provider — bridges frontend to auth tokens |
| `lib/firebase.ts` | Firebase configuration — bridges frontend to Firebase |

**Rule**: Both OLD and NEW consume these files. Neither may fork or rewrite them without cross-repo authority.

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
- Writable via `server/api/trees.ts`

### Moment
- Core entity representing a memory/moment
- Belongs to a tree
- Writable via `server/api/memories.ts`

### Connection
- Social relationship between trees/users
- Writable via `server/api/social.ts`

### Comment
- Comments on moments/trees
- Writable via `server/api/comments.ts`

## 5. Frontend Consumption Rules

### OLD Generation (Legacy)
- Consumes backend via SHARED_CORE_BRIDGE_LIB (`lib/api.ts`, `lib/auth.tsx`)
- May use direct Firebase SDK calls via `lib/firebase.ts`
- Route structure: `app/v2/`, `app/v3/`, `app/v4/`, `app/design-lab/`

### NEW Generation (V1)
- Must consume the **same** SHARED_CORE_BRIDGE_LIB files
- Must not fork backend truth
- Must not create a second canonical DB writer
- Route structure: `/new/v1/...` (proving namespace)
- Adapter layer bridges source UI data shapes to canonical API responses

### Shared Rules
1. Both generations may read from the same backend simultaneously
2. Both generations write through the same API endpoints
3. Neither generation creates its own database tables
4. Neither generation creates its own authentication system
5. Neither generation deploys its own Worker
6. SHARED_CORE_BRIDGE_LIB files are consumed, not forked

## 6. Adapter Contract (NEW/V1)

The adapter layer in `new/v1/adapters/` serves one purpose:

```
canonical backend/API data → source UI expected data shape
source UI events → canonical product route/state/action
```

Constraints:
- Adapter must not rewrite source HTML/CSS/JS visual hierarchy
- Adapter must not fork backend truth
- Adapter must be thin — it bridges, it does not own

## 7. Boundary Violations (STOP)

The following are boundary violations that halt work:

- Creating a second database writer
- Creating a second authentication system
- Forking `db/schema.ts`
- Modifying `server/api/` semantics without cross-repo authority
- Deploying a separate Worker for NEW generation
- Exposing new secrets or provider configurations
- Mutating Production data for validation
- Forking SHARED_CORE_BRIDGE_LIB files

## 8. Migration Path

When NEW/V1 achieves source parity:

1. NEW proving routes may be promoted to product routes
2. OLD routes may be deprecated (not deleted)
3. Backend remains single canonical authority throughout
4. SHARED_CORE_BRIDGE_LIB remains shared throughout
5. Cross-repo authority (LoveBud #4004/#4005/#4006) governs any backend changes
