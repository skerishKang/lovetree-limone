# Shared Love Platform Authority — LoveTree Mirror

Status: **NORMATIVE CROSS-REPOSITORY ARCHITECTURE GUARDRAIL**  
Primary platform authority: `skerishKang/LoveBud#4004`  
LoveTree guardrail: `skerishKang/lovetree-limone#152`  
Data/schema reconciliation: `skerishKang/LoveBud#4005`  
Auth migration: `skerishKang/LoveBud#4006`  
Shared API foundation: `skerishKang/LoveBud#4094`

## 1. Product architecture invariants

Unless the Product Owner explicitly changes the architecture:

```text
LoveBud + LoveTree
= ONE product identity authority
= ONE shared backend/API authority
= ONE canonical writable Tree/Memory/social data authority
```

Target:

```text
LoveTree frontend/runtime
        ↓ same-origin adapter / Service Binding
shared love-platform-api
        ↓
canonical shared Neon data authority
```

The existing `lovetree-limone` database is a **TRANSITIONAL_BRIDGE_NONCANONICAL** during convergence. It is not permission to create or preserve a second permanent Product backend.

## 2. Auth migration

Current Product identity provider during migration:

```text
Firebase Auth
```

Target candidate:

```text
Neon Auth
```

Migration is staged through a provider-neutral stable account mapping. No direct Firebase UID → Neon Auth user-ID replacement is allowed.

A LoveTree-only Neon Auth Product authority must not be provisioned. Any Neon Auth test/prototype remains `PROTOTYPE_ONLY` until the shared migration authority explicitly promotes it.

## 3. Mandatory resource classification

Before any Firebase, Neon, Cloudflare Worker, DB, secret, route, provider, E2E, or Auth mutation, classify the resource exactly once:

```text
CANONICAL_PRODUCT_AUTHORITY
TRANSITIONAL_BRIDGE_NONCANONICAL
TEST_ISOLATION_ONLY
PROTOTYPE_ONLY
HISTORICAL_EVIDENCE_ONLY
UNKNOWN_STOP
```

`UNKNOWN_STOP` = zero mutation.

A dedicated E2E resource is **test isolation**, not architecture:

```text
DEDICATED_E2E_FIREBASE != NEW_PRODUCT_AUTHORITY
ISOLATED_E2E_WORKER != NEW_SHARED_BACKEND
DISPOSABLE_NEON_BRANCH != NEW_CANONICAL_DB
```

## 4. Authority resolution order

Resolve conflicts in this order:

1. latest explicit Product Owner architecture decision;
2. LoveBud `#4004` + LoveTree `#152`;
3. fresh current repository/provider evidence for the exact target;
4. LoveBud `#4005` for DB/schema/data, `#4006` for auth/identity, and the current shared-API authority for backend runtime;
5. latest explicit superseding correction comment;
6. non-stale issue body;
7. historical reports, old SHAs, prototypes, snapshots.

A lower layer never silently overrides a higher layer.

## 5. Freshness rule

Counts, branch IDs, provider resources, PR heads, SHAs and database contents are observations, not architecture. Fresh-query them before use.

Important reconciliation:

```text
36 users / 45 Trees / 287 Memories
```

is historical **non-default child-lineage evidence**, not current default/deployed LoveBud DB authority. Do not use that old snapshot to infer current account/data topology.

## 6. Mandatory architecture consistency gate

Before any Auth/DB/provider/backend/E2E infrastructure mutation, report:

```text
ARCHITECTURE_CONSISTENCY_GATE

PARENT_4004_READ = YES
LOVETREE_152_READ = YES
DATA_4005_READ_IF_RELEVANT = YES/NA
AUTH_4006_READ_IF_RELEVANT = YES/NA
CURRENT_REMOTE_FRESH = YES
CURRENT_PROVIDER_IDENTITY_FRESH = YES/NA
RESOURCE_CLASS = <classification>
SECOND_CANONICAL_WRITER_CREATED = NO
SECOND_PRODUCT_AUTHORITY_CREATED = NO
TEST_RESOURCE_PROMOTED_TO_PRODUCT = NO
PRODUCT_CUTOVER_EXPLICITLY_AUTHORIZED = YES/NO
ARCHITECTURE_CONSISTENCY_GATE = PASS/STOP
```

`STOP` means zero mutation.

## 7. Worker prompt rule

Every worker prompt involving Auth, Firebase, Neon, Cloudflare, backend, shared API, DB, provider configuration, or mutable E2E must begin by requiring fresh reads of:

```text
LoveBud#4004
LoveTree#152
LoveBud#4005 if DB/schema/data is involved
LoveBud#4006 if auth/identity is involved
```

and must say:

```text
Do not infer Product authority from an E2E/prototype resource.
Classify every target resource before mutation.
```

The final worker report must contain the completed architecture consistency gate.

## 8. #67 interpretation

Issue `#67` is a mutable Runtime E2E acceptance lane. Any dedicated Firebase/Worker/Neon target used by #67 is `TEST_ISOLATION_ONLY`.

It does not change Product architecture:

```text
CURRENT_PRODUCT_AUTH_DURING_MIGRATION = SHARED_FIREBASE_AUTH
TARGET_AUTH = STAGED_NEON_AUTH_MIGRATION
TARGET_BACKEND = SHARED_LOVE_PLATFORM_API
TARGET_CANONICAL_DATA = ONE_SHARED_NEON_AUTHORITY
```

If a safe representative shared-platform non-Production topology can satisfy isolation, prefer it. If a dedicated E2E tenant is necessary, quarantine it and never promote it implicitly.

## 9. Snapshot/document hygiene

Every document must distinguish:

```text
ARCHITECTURE_DECISION
CURRENT_RUNTIME_STATE
PROTOTYPE_STATE
TEST_ISOLATION_STATE
HISTORICAL_SNAPSHOT
```

Do not call dated provider/database observations `current` without a fresh verification in the same work session. Stale snapshots must be corrected or visibly marked `HISTORICAL_SNAPSHOT / NOT CURRENT AUTHORITY`.

## 10. Cutover rule

Before any Production mutation, all of the following are **required conditions**, not claims that Production mutation is currently authorized:

```text
CURRENT_DEPLOYMENT_FRESH
CURRENT_PROVIDER_TARGET_FRESH
RUNTIME_BINDING_TARGET_MATCH
REQUIRED_CAPABILITY_PRESENT
EXPLICIT_PRODUCTION_MUTATION_AUTHORITY
```

Any ambiguity means zero mutation.

A green E2E, prototype, provider deployment, or CI result proves only its stated scope. It never implicitly authorizes Product auth cutover, canonical DB cutover, Firebase retirement, shared API Production routing, or LoveTree DB promotion.
