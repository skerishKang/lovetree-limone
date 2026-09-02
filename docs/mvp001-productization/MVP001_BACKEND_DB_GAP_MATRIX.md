# MVP001 Backend / DB Gap Matrix

Issue: #596  
Audit base: `dd64fc145c738c2c77fd6d147162bb16a11bc17b`  
Database mutation performed by this audit: `NO`

## 1. Executive finding

LoveTree already has a substantial backend. MVP001 Productization should **reuse and harden** the existing Worker/API/Neon/Drizzle/Firebase stack rather than create a second backend.

Existing runtime flow:

```text
Cloudflare Worker
  ├─ /api/** -> core/runtime/server/api/**
  ├─ /mvp/** -> static MVP assets
  └─ application router

API
  ├─ Firebase ID-token verification
  ├─ Tree API
  ├─ Memory API
  ├─ comments/social
  └─ Neon/PostgreSQL via Drizzle
```

The main beta gaps are **product-domain gaps** and **MVP integration gaps**, not absence of a backend.

## 2. Existing authority inventory

| Capability | Existing authority | MVP001 disposition |
|---|---|---|
| PostgreSQL | Neon through `DATABASE_URL` | `REUSE_EXACT` |
| ORM/schema | Drizzle, `core/runtime/db/schema.ts` | `REUSE_EXACT` |
| migrations | `core/runtime/drizzle/**` | `REUSE_AFTER_VERIFY` |
| server auth | Firebase ID token verification | `REUSE_EXACT` |
| Tree CRUD | `/api/trees` family | `REUSE_EXACT` |
| Tree + first Memory creation | existing API | `REUSE_EXACT` |
| Memory CRUD/list/detail | `/api/memories` family | `REUSE_EXACT` |
| visibility | private / unlisted / public | `REUSE_EXACT` |
| parent connection | `memories.parentId` + `connectionReason` | `REUSE_OR_SUPERSEDE_AFTER_PRODUCT_DECISION` |
| comments/reactions/social | existing tables/routes | `REUSE_WHEN_MVP_SCOPE_NEEDS` |
| social idempotency/rate/audit | existing DB support | `REUSE_WHEN_SCOPE_NEEDS` |
| global mutation safety | `API_MUTATIONS_ENABLED` + safety gate | `REUSE_AND_ADD_MVP_RELEASE_GATING` |
| health endpoint | `/api/health` | `REUSE_EXACT` |

## 3. Current Tree / Memory fit

### Tree

Existing Tree fields already cover a first beta:

```text
id
ownerId
clientKey
title
memo
artist
visibility
groupName
keywords
createdAt
updatedAt
```

### Memory

Existing Memory fields cover most SRC057 and much of SRC058:

```text
id
treeId
clientKey
parentId
connectionReason
title
memo
artist
source
sourceUrl
sourceType
thumbnail
emotionTags
timestamp
discoveryDate
videoOffsetSeconds
sortOrder
visibility
channelId/channelName/channelUrl
createdAt/updatedAt
```

The Memory API already validates bounded strings/URLs/arrays, validates same-Tree parenting, derives/inherits visibility, assigns sort order, retries unique-sort conflicts, and supports idempotent-ish create via `clientKey`.

**Conclusion:** do not redesign Tree/Memory schema for MVP001 unless an actual adapter requirement cannot be represented safely.

## 4. Gap matrix

| Domain | Current state | Beta need | Severity | Recommendation |
|---|---|---|---|---|
| MVP semantic context | shell only stores `step` | Tree/Memory continuity across all Sources | P0 | shell/adapter work, no DB needed |
| client auth in static MVP | server verifier exists; static MVP has no Product auth orchestration | obtain/refresh Firebase token and expose signed-in state | P0 | reuse existing Firebase client configuration through Product auth adapter |
| authorization model | Tree is owner-centric; private access is owner-only | family/collaborator roles if beta is shared | P1/P0 depending beta scope | add membership only if closed beta includes collaboration |
| relationship graph | one `parentId` per Memory + reason | SRC056/SRC060 can depict multi-edge paths | P0 decision | start with derived single-parent projection unless Product requires true multi-edge |
| board layout | not in schema | SRC058 editable positions/styles/theme may need durability | P0 decision | define ephemeral vs per-user vs shared Tree presentation authority |
| media upload/storage | URL/thumbnail metadata only | user photo/video uploads if beta promises uploads | P1 | do not add storage until upload feature is in beta scope |
| user profile/preferences | Firebase identity fields, no dedicated profile table observed | name/avatar/preferences/settings | P1/P2 | postpone unless UX requires durable profile data |
| privacy lifecycle | visibility exists | deletion/export/account data handling | P0 for public beta; P1 for small closed beta | define policy and APIs before promotion |
| observability | server requestId/error logging exists | frontend bridge/API errors, funnel, performance | P0 beta gate | add privacy-bounded telemetry/structured logs |
| feature release gating | global mutation gate exists | MVP001 writes should be independently releasable | P0 | add MVP-specific capability/feature flag rather than flipping all API writes |
| offline/conflict | no MVP policy | edit collision/retry semantics | P1 | first beta may use last-server-confirmed state + explicit retry; avoid silent merge |
| API versioning | current `/api/**` unversioned | adapter contract stability | P1 | keep existing routes but version bridge/read-model contract; avoid needless API fork |
| migrations | Drizzle migrations exist | safe schema promotion/rollback | P0 when schema changes | rehearsal + schema check + backup/restore evidence before migration |
| CSP/frame policy | MVP currently same-origin iframe composition | secure bridge + media embeds | P0 | explicit same-origin/frame/media CSP review |

## 5. Auth gap

### Existing server strength

`core/runtime/server/api/auth.ts` verifies Firebase Secure Token JWTs fail-closed, including:

- RS256;
- Google signing key `kid`;
- signature;
- `aud`;
- `iss`;
- expiration/issued-at/auth-time;
- non-empty subject.

This should remain the API authentication authority.

### MVP001 missing piece

The isolated static shell does not yet have a Product auth lifecycle. Productized Alpha needs a shell-side Auth adapter that can:

```text
resolve signed-in / signed-out / loading state
obtain Firebase ID token
refresh when required
attach Authorization: Bearer <token> to API requests
clear Product context on sign-out
handle 401 without pretending Source writes succeeded
```

Bridge payloads must never carry the bearer token into Source presentation messages.

## 6. Authorization / collaboration decision

Current access control is essentially:

```text
Tree owner -> read/write private Tree and its Memories
public/unlisted -> broader read rules
non-owner -> no private collaboration role
```

There is no first-class Tree membership/role authority in the inspected schema.

### Minimal closed beta option

If the first beta is **single-owner/private Tree only**, do **not** create membership tables yet. This is the lowest-risk path to Beta Candidate.

### Collaboration beta option

If the beta promise includes family co-editing, add an explicit model rather than overloading `ownerId`:

```text
tree_members
- tree_id
- user_id
- role: owner | editor | member | viewer
- invited_by
- status
- created_at / joined_at
```

Then centralize authorization checks so every Tree/Memory write uses the same membership policy.

Do not implement this speculatively before beta scope is decided.

## 7. Relationship model decision

### Existing canonical relation

```text
child Memory.parentId -> parent Memory
child Memory.connectionReason -> WHY NEXT
```

This is a strong fit for a simple chronological/causal Tree and already powers same-Tree validation.

### Option A — use it for first beta

Recommended default:

- derive SRC056 paths from `parentId`;
- derive SRC060 clusters/bridges as presentation-only algorithms;
- mark derived path/cluster/bridge IDs as non-durable;
- do not let Source cross-links write new DB relationships.

Benefits: no migration, smaller authorization surface, faster Productized Alpha.

### Option B — first-class graph edges

Only if real user requirements need multiple simultaneous relationships per Memory:

```text
memory_relationships
- id
- tree_id
- from_memory_id
- to_memory_id
- type
- reason
- sort_order/weight optional
- created_by
- created_at/updated_at
```

If adopted, `parentId` needs an explicit coexistence/supersession contract. Do not create two competing relationship authorities.

## 8. SRC058 presentation persistence decision

SRC058 exposes presentation controls that are not canonical Memory content. The product must decide who owns them.

### Candidate model 1 — ephemeral

No DB changes. Layout/style resets after reload/device change.

Appropriate only if beta copy clearly treats the board as a transient visualization.

### Candidate model 2 — per-user presentation

Possible authority:

```text
tree_view_preferences
- tree_id
- user_id
- view_kind
- json settings
- updated_at
```

Good for theme, viewport, filter/default-pin preferences.

### Candidate model 3 — shared board layout

Possible authority:

```text
memory_presentations
- memory_id
- view_kind
- x/y
- rotation/scale/z optional
- pin_style
- card_style
- updated_at
```

Good if pinned position is part of the shared Tree artifact.

**Recommendation:** separate user preference from shared Memory placement if both are needed. Do not add UI-only columns directly to `memories` unless they truly are canonical Memory identity.

## 9. Media strategy

Current schema supports external media references well. For the first beta, the lowest-risk scope is:

```text
YouTube / external link / image URL / note
```

If file upload is required later, introduce a separate media authority rather than storing large blobs in Postgres:

```text
media_assets
- id
- owner/tree/memory linkage
- storage provider key
- media type
- mime type
- size
- checksum
- width/height/duration optional
- lifecycle/status
```

Upload security must include MIME/content validation, size limits, authorization, malicious-file handling, and deletion lifecycle.

## 10. Release gating

Current Wrangler configuration has:

```text
default/staging-style base: API_MUTATIONS_ENABLED=false
staging: API_MUTATIONS_ENABLED=true
production: API_MUTATIONS_ENABLED=true
```

MVP001 should not depend on changing this global flag to control its beta. A Productized Alpha needs a narrower capability gate, for example conceptually:

```text
MVP001_DATA_READ_ENABLED
MVP001_DATA_WRITE_ENABLED
MVP001_BETA_ALLOWLIST_ENABLED
```

Exact configuration naming/placement should be implemented in a separate bounded PR after deployment behavior is audited. The goal is to prevent MVP001 rollout from unintentionally changing unrelated API consumers.

## 11. Migration readiness

The repository already contains multiple Drizzle migrations and a reconciliation migration. Any new schema for MVP001 must therefore require:

```text
schema diff reviewed
db:check PASS
migration SQL reviewed
fresh/staging migration rehearsal
existing-data compatibility check
rollback or forward-fix plan
backup/restore authority confirmed
no direct production DDL from an unreviewed client session
```

No database mutation is required for the first read-only semantic bridge slices.

## 12. Recommended beta scope to minimize risk

Recommended first **Beta Candidate** scope:

```text
AUTH
- signed-in single owner

TREE
- open existing Tree
- create Tree if existing Product path already supports it safely

MEMORY
- list/read
- create/update via existing API after read-only adapters are stable
- parentId + connectionReason only

MEDIA
- external URL / YouTube / note first

RELATIONSHIPS
- derived from parentId

COLLABORATION
- not in first beta unless explicitly required

BOARD PRESENTATION
- choose persistence contract before writable board layout is advertised
```

This scope lets the team validate the core LoveTree promise — one Tree and its Moments flowing meaningfully through all five visual experiences — without prematurely adding membership, graph, storage, and sync subsystems.

## 13. Promotion gates

### Productized Alpha

- same Tree/Memory context across five Sources;
- read-only canonical data projections;
- source/product visual parity pass;
- deep-link/back-forward restoration;
- shell/API error states.

### Data Alpha

- authenticated Memory create/update/connect;
- server-confirmed state reconciliation;
- write failure/401/409/5xx behavior;
- no demo control pretending persistence.

### Beta Candidate

- explicit beta scope decision on collaboration, relationship edges, board persistence, uploads;
- release flags/allowlist;
- migration/rollback plan for any schema delta;
- observability;
- security/privacy/accessibility/performance review;
- exact-head CI + browser E2E + direct visual review.

### Closed Beta

- limited real users;
- production monitoring;
- tested rollback/disable path;
- support/data-deletion procedure;
- no critical P0/P1 Productized Alpha defects.
