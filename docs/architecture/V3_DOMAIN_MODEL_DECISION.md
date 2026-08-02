---
status: PROPOSED_ARCHITECTURE_DECISION
authority: Issue #16
version: 0.7
effective_date: pending independent approval
source_main_sha: 9b991409ccf017fbdd1b6c2750d1e6bb247048d2
normative_companion: docs/architecture/V3_DOMAIN_MODEL_IMPLEMENTATION_CLARIFICATIONS.md@0.4
repair_of_review_comment: 5155876362
---

# LoveTree V3 Canonical Domain Model Decision

## 1. Purpose and authority

This document defines the implementation-ready shared-core model for LoveTree V3 while preserving V1/V2 compatibility.

Authority order:

1. `docs/product/LOVETREE_PRODUCT_SPEC.md`
2. this approved architecture decision (`V3_DOMAIN_MODEL_DECISION.md`)
3. `V3_DOMAIN_MODEL_IMPLEMENTATION_CLARIFICATIONS.md` — enforcement location, sequencing detail, implementation examples only; does not override or modify this decision
4. version-specific implementation contracts
5. Issues and PR execution contracts
6. supporting analyses and prototypes

If a conflict is discovered between this decision and the clarification, implementation must stop, this decision must be amended first with a version bump, and the clarification must be aligned in the same commit. Implicit override is forbidden. A clarification section may control a narrower rule only when this decision explicitly delegates that scope by naming the section and its boundaries.

Inputs reviewed:

- `docs/product/LOVETREE_PRODUCT_SPEC.md`
- `docs/product/PRODUCT_DOCUMENT_HIERARCHY.md`
- `docs/v3/V3_HTML_TSX_INTEGRATION_ANALYSIS.md`
- PR #11 draft `V3_PRODUCT_CONTRACT.md`, `V3_SHARED_CORE_GAPS.md`, and V3 preview types at accepted Foundation head `31f784dd71c34ceea025fd1ec1c1dd2718869c35`
- current `db/schema.ts` and API contracts at main `9b991409ccf017fbdd1b6c2750d1e6bb247048d2`
- `docs/architecture/V3_DOMAIN_MODEL_IMPLEMENTATION_CLARIFICATIONS.md`, which closes implementation ambiguities found by the main-schema/API audit without modifying or overriding this decision

This decision is architecture/documentation only. It does not itself modify schema, migrations, API handlers, UI code, or deployments.

## 2. Canonical terminology

### Tree

A subject-centered collection representing the accumulated journey around a person, work, trip, study, relationship, or other subject.

### Moment

The primary product unit: a remembered occurrence in which the user's heart or attention moved. A Moment may reference a video, image, article, song, book, performance, offline event, or no external source at all. The source is evidence and context; it is not the product unit.

### Connection

A stored directed explanation of why one Moment led to another. It is not an emotion tag, not merely a parent pointer, and not an inferred visual edge without persisted meaning.

The physical legacy table may remain named `memories` during compatibility migration, but the canonical domain/API/UI term is **Moment**.

## 3. Entity relationships

```text
User 1 ── * Tree
Tree 1 ── * Moment
Tree 1 ── * Connection
Moment 1 ── * Connection (from)
Moment 1 ── * Connection (to)
Tree 1 ── * TreeMembership
Tree 1 ── 0..1 TreeCoverMoment
Tree 1 ── * DerivedTreeSource
Tree 1 ── * MilestoneEvent
MilestoneEvent 1 ── * MilestoneReceipt
```

A Tree is presented visually as a tree, but its canonical structure is a directed causal graph. A Moment may have multiple incoming and outgoing Connections. Self-links and cycles are invalid.

## 4. Tree field catalog

| Field | Type / nullability | Default | Decision |
|---|---|---|---|
| `id` | text, non-null | generated | stable identity |
| `ownerId` | text, non-null | none | ultimate owner |
| `clientKey` | text, nullable | null | idempotent create compatibility |
| `treeType` | `personal | official`, non-null | `personal` | provenance/authority class; ordinary fan Trees are personal |
| `collaborationMode` | `solo | collaborative`, non-null | `solo` | collaboration is orthogonal to official status |
| `subjectType` | `person | work | travel | study | relationship | other`, nullable during migration | null | required for new V3 writes |
| `subjectName` | text, nullable during migration | null | required for new V3 writes |
| `title` | text, non-null | none | user-facing Tree title |
| `description` | text, nullable | null | canonical Tree summary |
| `coverMomentId` | canonical API text, nullable | null | projected from the separate same-Tree cover relation defined by the companion clarification |
| `coverUrl` | text, nullable | null | uploaded/external fallback |
| `coverAlt` | text, nullable | null | accessibility text |
| `visibility` | `private | unlisted | public`, non-null | new V3 API: `private` | existing rows retain their stored value; V1/V2 omitted default remains versioned compatibility behavior |
| `status` | `draft | active | archived | deleted`, non-null | existing rows: `active`; standalone V3 create: `draft` | lifecycle and soft deletion |
| `createdAt` | timestamptz, non-null | DB now | database lifecycle only |
| `updatedAt` | timestamptz, non-null | DB now | database lifecycle only |
| `publishedAt` | timestamptz, nullable | null | first successful active-public publication; never overwritten |
| `deletedAt` | timestamptz, nullable | null | soft deletion marker |

### Tree rules

- `personal`: ordinary user-created Tree, including fan journeys and non-fan subjects.
- `official`: server/admin-assigned only; users cannot self-declare it.
- `collaborationMode = collaborative`: uses explicit membership and role checks.
- Official and collaborative are not mutually exclusive. An official Tree may also be collaborative.
- `treeType`, `collaborationMode`, and `subjectType` express separate dimensions.
- `description` is the canonical domain/API name. During compatibility, the physical `trees.memo` column may remain its sole backing storage; do not create two independently writable description columns.
- `coverMomentId` is projected from `tree_cover_moments`; the database-level same-Tree invariant and fallback behavior are defined in the companion clarification.
- `status = draft`: owner/editor only and excluded from public/community queries.
- `status = archived`: owner/editor readable, read-only by default, and excluded from public/community queries.
- `status = deleted` requires `deletedAt`; every other status requires `deletedAt IS NULL`.
- Versioned create defaults, publication transitions, and `publishedAt` behavior are normative in the companion clarification.

Collaborative Trees use the lifecycle-aware membership model and owner invariants defined in `V3_DOMAIN_MODEL_IMPLEMENTATION_CLARIFICATIONS.md`. `ownerId` remains the ultimate owner.

## 5. Moment field catalog

The first migration must not destructively rename the physical `memories` table.

| Field | Type / nullability | Default | Decision |
|---|---|---|---|
| `id` | text, non-null | generated | stable identity |
| `treeId` | text, non-null | none | owning Tree; immutable in canonical V3 updates |
| `clientKey` | text, nullable | null | retry/idempotency compatibility |
| `title` | text, non-null | generated or supplied | non-empty in V3 API |
| `recordDate` | date, nullable | null | user's remembered/recorded date |
| `sourceType` | controlled text, non-null | new V3 API: `text` | evidence/context category; URL remains optional |
| `sourceUrl` | text, nullable | null | submitted URL |
| `sourceCanonicalUrl` | text, nullable | null | normalized canonical URL |
| `sourceTitle` | text, nullable | null | external content title, distinct from Moment title |
| `sourceProvider` | text, nullable | null | YouTube, Instagram, publisher, offline, etc. |
| `sourceExternalId` | text, nullable | null | provider identifier |
| `sourceAttribution` | text, nullable | null | approved author/channel/creator display attribution |
| `thumbnailUrl` | text, nullable | null | canonical thumbnail field |
| `startSeconds` | integer, nullable | null | media interval start |
| `endSeconds` | integer, nullable | null | media interval end |
| `primaryEmotion` | text, nullable | null | representative emotion |
| `emotionTags` | string array/json array, non-null | `[]` | emotional states only |
| `memo` | text, non-null | empty | user-authored narrative |
| `visibility` | canonical API: `inherit | private | unlisted | public`, non-null | new V3 API: `inherit` | effective access cannot exceed Tree access |
| `memoVisibility` | `private | tree | public`, non-null | new V3 API: `private` | independent memo exposure control |
| `createdById` | application-user text ID, nullable during migration only; non-null after verified backfill | server-assigned from authenticated actor | authoritative Moment authorship; distinct from Tree ownership; never client-supplied |
| `sortOrder` | integer, nullable during mixed-version migration window; non-null final | migration-assigned backfill; V3 writes always explicit | deterministic ordering |
| `canvasX` | integer, nullable | null | optional layout coordinate |
| `canvasY` | integer, nullable | null | optional layout coordinate |
| `status` | `active | archived | deleted`, non-null | existing rows: `active` | lifecycle |
| `createdAt` | timestamptz, non-null | DB now | database creation time only |
| `updatedAt` | timestamptz, non-null | DB now | database update time only |
| `deletedAt` | timestamptz, nullable | null | soft deletion marker |

### Moment visibility physical compatibility

The current `memories.visibility` column and shared PostgreSQL enum contain only `private`, `unlisted`, and `public`. They must remain compatible with V1/V2.

Canonical Moment visibility is represented physically during transition by:

```text
memories.visibility       existing private|unlisted|public value
memories.visibility_mode  new explicit|inherit value
```

#### Physical default contract

The `visibility_mode` column is created with `NULL DEFAULT 'explicit'` from step 1 of the migration:

```sql
visibility_mode visibility_mode_type NULL DEFAULT 'explicit'
```

This means:
- A V1/V2 legacy insert that omits `visibility_mode` stores `explicit`, preserving the legacy plain `visibility` semantics instead of silently flipping to `inherit`.
- The column remains nullable through step 8 to allow additive migration rollback.
- `NOT NULL` is applied only at step 9 after old-server drain and null-count = 0 verification.
- The DB default exists from step 1; only the `NOT NULL` constraint is deferred to step 9.

#### Read semantics for unexpected null

During the mixed-version window, any unexpected null `visibility_mode` is interpreted as `explicit`:

```text
COALESCE(visibility_mode, 'explicit')
```

This safety contract covers: partial migration, failed backfill batches, manual legacy rows, nullable rows during rollback, and exception rows before recovery. Null must never be interpreted as `inherit`.

#### Backfill and write rules

- Existing rows are backfilled to `visibility_mode = explicit` via an idempotent batch. The backfill gate requires: null count is measured continuously; old-server inserts use the DB default `explicit` and therefore create no new nulls; null count must be 0 immediately before step 9; if any null is discovered after strict constraints are applied, constraint application is halted.
- New V3 Moments write `visibility_mode = inherit` and store `visibility = private` as the safe legacy fallback.
- V3 writers always send an explicit `visibility_mode`; V3 API contract only permits `inherit` or one of the existing visibility values, never an omitted mode.
- Effective visibility for `explicit` rows uses the stored `visibility` value unchanged. Effective visibility for `inherit` rows uses Tree visibility, then applies status/library gating and the private-first fallback if Tree visibility is stricter than the raw stored value.
- Legacy V1/V2 serializers never emit `visibility_mode = inherit` directly; they project the computed effective visibility in the existing `private|unlisted|public` enum.
- Canonical API output returns `inherit` when mode is inherit; otherwise it returns the existing visibility value.
- Effective visibility is computed in an authorization-aware SQL/query mapper:
  - inherit → Tree visibility
  - explicit → Moment visibility
  - then intersect with Tree status and visibility.
- Public/community queries must use the effective expression, not raw `memories.visibility` alone.
- A legacy V1/V2 write that changes `visibility` must atomically set `visibility_mode = explicit`.
- A V3 write selecting `inherit` must atomically set `visibility_mode = inherit` and the raw legacy fallback to `private`.
- After #20 introduces canonical V3 writes, V1/V2 serializers must return the computed effective legacy value. No V3 persistence may be enabled before that adapter exists.
- `memoVisibility` uses a separate constrained type containing `private`, `tree`, and `public`.
- Existing endpoint overexposure is not a compatibility promise. The security-hardening rule in the companion clarification applies: no row becomes more public, while documented privacy reductions may correct legacy leaks.

This avoids adding `inherit` to the shared legacy visibility enum and avoids exposing an unknown value to V1/V2.

### Moment source categories

Approved source categories for new writes describe evidence/media, not subjects:

```text
youtube, video, song, audio, image, article, book, social,
performance, event, offline, text, link, other
```

Legacy enum values such as `person` and `travel` remain readable during migration but are not offered by the new V3 writer. A text-only Moment uses `sourceType = text`; an offline memory uses `sourceType = offline`; neither requires a URL. PostgreSQL enum migration sequencing is normative in the companion clarification.

### Moment rules

- A source-less text or offline Moment is valid.
- If the user omits `title`, the server may derive a deterministic title from `sourceTitle` or the first non-empty memo line; it must not persist an empty placeholder.
- `sourceUrl` and `sourceCanonicalUrl` must pass approved URL/protocol validation.
- `startSeconds` and `endSeconds` are permitted only for time-addressable source types.
- `startSeconds >= 0`.
- `endSeconds` cannot exist without `startSeconds`.
- `endSeconds >= startSeconds`.
- `treeId` is not mutable in canonical V3 updates. Legacy V1/V2 Tree moves follow the all-or-nothing compatibility transaction defined by the companion clarification.
- `status = archived`: owner/editor readable and excluded from public/community queries.
- `status = deleted` requires `deletedAt`; active/archived status requires `deletedAt IS NULL`.
- `createdById` identity semantics: the value is the same application-user identity type used by `trees.ownerId`, `tree_memberships.userId`, and `connections.createdById`. It is assigned by the server from the authenticated actor's verified identity and active membership, never by client request payload. A V3 create request cannot supply or override `createdById`; a payload that attempts to do so is rejected as a client contract violation. Solo Tree creates assign the Tree owner's verified identity. Collaborative Tree creates assign the authenticated acting member's verified identity, verified against an active owner-or-editor membership for that Tree.
- Add a unique key or unique index on `(treeId, id)` so same-tree composite Connection, cover, and derived-source foreign keys are implementable.

### Moment mutation authority matrix

Moment authorship is recorded in `createdById` and is independent from Tree ownership. Mutation authority is deterministic from the actor's active membership:

| Actor | Read | Edit Moment they authored | Edit Moment by another member | Delete own Moment | Delete another member's Moment |
|---|---|---|---|---|---|
| Tree owner | yes | yes | yes | yes | yes |
| editor (active membership) | membership-authorized | yes | yes | yes | no |
| contributor-style membership (if later approved) | membership-authorized | yes | no | yes | no |
| viewer member | membership-authorized | no | no | no | no |
| removed former member | no automatic retained access | no | no | no | no |

Removal of a member immediately revokes that member's Tree mutation authority. The removed member's `createdById` values and historical audit references remain unchanged; their previously authored Moments stay in the Tree under owner/editor governance. Removal never rewrites `createdById` to another user.

When the Tree owner deletes or edits a Moment authored by another member, the audit event records both the acting owner membership and the preserved original `createdById`; authorship is never conflated with the mutation actor.

## 6. Connection field catalog

Add a first-class `connections` entity.

| Field | Type / nullability | Default | Decision |
|---|---|---|---|
| `id` | text, non-null | generated | stable identity |
| `treeId` | text, non-null | none | owning Tree |
| `fromMomentId` | text, non-null | none | directed source Moment |
| `toMomentId` | text, non-null | none | directed target Moment |
| `relationType` | controlled text, non-null | none | relation taxonomy, not emotion taxonomy |
| `relationLabel` | text, non-null | none | human-readable causal reason |
| `relationMemo` | text, nullable | null | fuller explanation |
| `relationEmotionBefore` | text, nullable | null | emotional state before transition |
| `relationEmotionAfter` | text, nullable | null | emotional state after transition |
| `sortOrder` | integer, non-null | assigned | deterministic outgoing-edge order |
| `isPrimaryPath` | boolean, non-null | first incoming edge: true | designated Tree-layout and V1/V2 compatibility edge |
| `createdById` | text, non-null | actor | collaborative audit/ownership |
| `status` | `active | deleted`, non-null | `active` | soft deletion |
| `createdAt` | timestamptz, non-null | DB now | lifecycle timestamp |
| `updatedAt` | timestamptz, non-null | DB now | lifecycle timestamp |
| `deletedAt` | timestamptz, nullable | null | soft deletion marker |

### Connection constraints

1. `fromMomentId != toMomentId`.
2. Both endpoints must belong to `treeId`. Implement composite foreign keys `(treeId, fromMomentId)` and `(treeId, toMomentId)` against the unique Moment key `(treeId, id)` rather than relying only on application joins.
3. The actor must be the owner or an editor of the Tree. The authoritative actor identity is resolved from the authenticated principal and an active membership; the client cannot substitute another user.
4. Use a partial unique index for one active directed edge per `(treeId, fromMomentId, toMomentId)` unless a later approved decision permits parallel edges.
5. Use a partial unique index for at most one active `isPrimaryPath = true` incoming Connection per `(treeId, toMomentId)`.
6. A root Moment has no active primary incoming Connection.
7. The first active incoming Connection for a non-root Moment defaults to `isPrimaryPath = true`; additional incoming Connections default false.
8. If the primary Connection is deleted, the service promotes the remaining active incoming Connection with the lowest `(sortOrder, createdAt, id)` in the same transaction. If none remains, the Moment becomes a root.
9. V1/V2 `parentId` projects only from the active primary Connection.
10. `parentId` projects to `null` for a moment whose primary-path repair is still quarantined as an exception (self parent, cross-tree parent, missing parent, cyclic or quarantined parent, deleted parent, or not-yet-primary-recovered exception) until the approved recovery creates an active primary Connection. The raw legacy value remains preserved in the migration exception audit record.
11. The service rejects a write that creates a cycle. The check and insertion run in one transaction with the per-Tree serialization contract defined in the companion clarification; a preflight check outside the write transaction is insufficient.
12. `custom` requires a trimmed non-empty `relationLabel`; placeholder values such as `직접 입력` are invalid persisted meanings.
13. Relation/source/discovery categories cannot be written into `primaryEmotion` or `emotionTags`.
14. `status = deleted` requires `deletedAt`; active status requires `deletedAt IS NULL`.

`relationType` remains an application-managed dictionary rather than a PostgreSQL enum so product language can evolve without destructive enum migrations.

Initial categories:

```text
comment_follow, fan_recommendation, curiosity, skill_check,
personality_check, same_work, direct_search, reaction_confirmation,
return_after_rest, custom, other, legacy_parent
```

## 7. Visibility and access-control matrix

Effective access is the intersection of Tree, Moment, memo, lifecycle, and authorship policy. A child entity never broadens its parent.

| Context | Tree | Moment | Memo |
|---|---|---|---|
| owner | all non-purged | all non-purged | all non-purged |
| editor | member-authorized | member-authorized | member-authorized |
| viewer member | membership-authorized | effective Tree/Moment access | effective memo access |
| unlisted link viewer | active unlisted/public Tree only | active `inherit`, `unlisted`, or `public` subject to Tree | `tree` or `public` |
| anonymous public | active public Tree only | active effective-public Moment only | public memo only |
| community index/card | active public Tree only | active public Moment only | public memo only; `tree` memo excluded |
| derivation | active public Tree and active public Moment only | public only | public-only fields and approved attribution |

Rules:

- Private Tree: owner and authorized members only, regardless of Moment flags.
- Unlisted Tree: possession-of-link detail access for the first compatibility release; no public indexing. Future revocable tokens require a separate decision.
- Public Tree: anonymously readable only when active and subject to child policy.
- Moment `inherit`: follows Tree visibility.
- Moment `private`: owner/editor only.
- Moment `unlisted`: available only in authorized/unlisted Tree context and excluded from public indexes.
- Moment `public`: public only when the Tree is also active and public.
- Memo `private`: owner/editor only.
- Memo `tree`: visible in full Tree detail to an already authorized Tree viewer, but excluded from community cards, search indexes, exports, and derivation payloads.
- Memo `public`: included only when the effective Tree and Moment are public.

Authorization predicates must run before community joins and aggregates. An index or social-count row is not authorization. Current endpoint behavior that omits the Tree/Moment intersection must be corrected at the compatibility cutover.

## 8. Lifecycle, account deletion, and ownership transitions

- Default deletion is soft deletion for ordinary V1/V2/V3 DELETE routes after lifecycle fields exist.
- Soft-deleting a Tree changes only the Tree lifecycle fields and immediately removes it and all children from normal reads; child statuses remain intact for recovery/audit.
- Restoring a Tree restores access to children that are individually active, subject to their own visibility. Individually archived/deleted children remain excluded according to their status.
- Soft-deleting a Moment soft-deletes all incident Connections in the same transaction and under the same per-Tree advisory lock / serialized transaction contract used for Connection mutation. Legacy `parentId` projection is updated in the same transaction.
- Restoring a Moment does not automatically restore Connections; reconnection is explicit.
- Hard purge may use FK cascade only as a separate privileged retention operation after retention/restore policy authorizes it.
- Derivation live references use nullable FKs with approved attribution snapshots so source purge does not erase lawful attribution history and does not expose newly private content. Composite source identity, derivation idempotency, and purge behavior are defined in the companion clarification.

### Account deletion state machine

Account deletion uses the following minimum state machine:

```text
active
deletion_requested
deletion_blocked
deletion_committing
tombstoned
purge_eligible
```

Names may be adjusted but the semantics are fixed.

### Account deletion — Phase 1: read-only preflight

Before modifying any Tree, the deletion workflow performs a read-only preflight:

1. enumerate all Trees where `trees.ownerId = :deletingUserId`
2. fix Tree IDs in ascending order
3. classify each Tree as personal solo, collaborative, or official
4. for every collaborative Tree, determine a successor owner
5. if any collaborative Tree has no eligible successor, block the entire deletion
6. if any official Tree exists, block until the stewardship workflow completes
7. check retention, legal, and moderation holds
8. only when all preconditions pass does the workflow enter the commit phase

If preflight fails:

```text
Tree changes: 0
membership changes: 0
ownerId changes: 0
soft-deletes: 0
credential revokes: 0
tombstones: 0
```

### Account deletion — Phase 2: single database transaction

After preflight passes, one database transaction performs:

1. acquire account-level advisory lock
2. lock all owned Trees in ascending Tree ID order
3. re-verify preflight conditions
4. execute all collaborative Tree owner transfers
5. soft-delete all personal solo Trees
6. set departing memberships to `status = removed`
7. insert all ownership and delete audit rows
8. set account state to `deletion_committing`
9. insert credential-revoke outbox event
10. commit

If any step fails, the entire transaction rolls back:

```text
personal Tree soft-deletes roll back
completed ownership transfers roll back
audit rows roll back
account state rolls back
```

Per-Tree independent commits followed by later failure are forbidden.

### External authentication revoke

External authentication revoke (Firebase etc.) cannot share the DB transaction. The outbox/retry contract is:

- Immediately after DB commit, the application account state blocks login and mutations
- An outbox worker performs credential and session revoke
- If revoke fails, the account remains inaccessible at the application layer
- Revoke is idempotent and retried
- After successful revoke, the account transitions to `tombstoned`
- Profile pseudonymization and tombstone marking occur at the `tombstoned` transition
- Hard purge is a separate retention job

### Personal solo Tree owner deletion

A personal solo Tree does not support ordinary ownership transfer; there are no other members to receive ownership. When the sole owner requests account deletion, the operation must follow one of these approved paths before allowing the account to finish deleting:

1. explicit Tree deletion by the owner (each owned personal solo Tree is soft-deleted), or
2. an approved export/retention workflow that captures content the owner elected to keep before the account deletes, or
3. an approved leave-behind / memorial retention election, in which case every owned personal solo Tree transitions to private soft-deleted retention state pending final handling.

The account deletion workflow performs option (3) automatically when options (1) and (2) were not chosen: every owned personal solo Tree transitions to `status = deleted` with `deletedAt` set, immediately excluding the Tree and its children from normal reads. The final hard-purge pass runs only after the retention window closes and after Connections, derived-source live references, milestone events/receipts, and community dependencies have been resolved or audited per the privileged retention procedure. Personal solo Trees must not enter an owner-less active state even transiently.

### Collaborative Tree ownership transfer

A collaborative Tree must not remain owned by a deleting account. Before an active owner of a collaborative Tree completes account deletion, ownership must be transferred to another active eligible member in a dedicated ownership-transfer transaction. Eligibility requires an active membership on that Tree in good standing; the default preference order among eligible candidates is editor seniority (longest active editor tenure, tie-broken by `membership.createdAt, membership.id`) unless the departing owner explicitly selected a different active eligible member.

One transaction must atomically:

1. serialize operations on the Tree under the per-Tree advisory lock;
2. verify the departing account is currently the active owner of that Tree;
3. select or confirm the new owner among active eligible members;
4. update `trees.ownerId` to the new owner;
5. update the new owner's membership role to `owner` (creating an active owner membership row if the approved membership write model requires role separation);
6. update the departing owner's membership: set `status = removed` when the departure is the account deletion path; for voluntary transfer, set `role = editor` unless policy explicitly requires `viewer`;
7. insert the audit event recording acting principal, prior owner, new owner, reason code, and timestamp.

If any active collaborative Tree fails the transfer (no eligible member, constraint violation, or audit failure), the account deletion must abort for that account. An account deletion is complete only when no active collaborative Tree still references that account as owner. An active collaborative Tree must never be left owner-less; the constraint gate preventing that is the combination of the transfer precondition plus the account-deletion abort rule. The legacy direct owner-update path that bypasses this transfer is forbidden.

### Official Tree ownership

Official Trees use server/admin-authorized workflows for any ownership change. Ordinary account deletion cannot transfer, delete, or orphan an official Tree: the deletion request is interrupted, the official Tree is placed under server-side stewardship review, and any subsequent transfer is executed by the authorized admin workflow. The verification/official identity grant and the ownership change are recorded together in the same audit stream. If the official Tree is retirable by policy, the server-side workflow performs the retirement explicitly; the user-initiated account deletion cannot itself retire it.

### Application user identity retention (tombstone)

Hard-purging the application user row is forbidden while any of the following still references it: `trees.ownerId`, `tree_memberships.userId`, `tree_memberships.invitedById`, `tree_memberships.removedById`, `memories.createdById`, `connections.createdById`, `derived_tree_sources.createdById`, `milestone_events` actor references, milestone receipts, audit events, or engagement rows (`reactions.ownerId`, `comments.ownerId`, `tree_comments.ownerId`, `tree_likes.ownerId`, `report_comments`, `reports`). Instead, account deletion performs a tombstone transition:

- authentication credentials and sessions are revoked so future sign-in and token refresh fail;
- personal profile display fields are pseudonymized per privacy policy;
- the application user row persists with a tombstone marker (for example `deletedAt` plus an account-state flag) so existing references remain resolvable to a stable tombstone identity;
- the immutable `createdById`, `ownerId`, and audit principal references remain the original user id value displayed as a tombstoned account; they must not be reassigned to another user;
- hard purge of the application user row is a separate privileged retention job, run only after every dependent reachability condition is drained or re-referenced under the approved retention procedure.

## 9. Community and derivation

Use a first-class `derived_tree_sources` relation rather than overloading Tree memo or keywords.

Fields:

```text
id
derivedTreeId
sourceTreeId nullable
sourceMomentId nullable
sourceUrlSnapshot nullable
sourceTitleSnapshot nullable
attributionSnapshot nullable
idempotencyKey      text, non-null
requestFingerprint  text, non-null
createdById
createdAt
```

#### Unique constraint

```text
UNIQUE (createdById, idempotencyKey)
```

or a partial unique equivalent with the same meaning.

The previous `(derivedTreeId, sourceTreeId, createdById)` constraint is removed because a new `derivedTreeId` is always different and therefore does not prevent retry duplicates.

#### Request behavior

A repeat request with the same `(createdById, idempotencyKey)`:

- if `requestFingerprint` matches the existing row → return the existing derived Tree and derivation row
- if `requestFingerprint` differs → return `409 IDEMPOTENCY_KEY_REUSED`
- never creates a new row

`requestFingerprint` must include at minimum the following normalized intent:

```text
sourceTreeId
sourceMomentId nullable
requested derived subject/title identity
derivation operation type
```

#### Intentional second derivation

The same user creating a second separate Tree from the same source is permitted with a new `idempotencyKey`. Idempotency blocks network retry duplicates; it does not permanently restrict the source+actor combination to one Tree. If the product later requires one Tree per source, that is a separate product uniqueness decision.

#### Other constraints and rules

- At least one live source reference or approved attribution snapshot must exist.
- `sourceMomentId` requires `sourceTreeId`; when both exist, their composite identity must reference the same physical Moment.
- `derivedTreeId` cannot equal `sourceTreeId` for the same derivation row.
- A derivation can be created only from an effectively public active source Tree and public active source Moment.
- Snapshot only attribution and source metadata approved for public display; do not snapshot private/tree-only memo or owner/member data.
- If the source later becomes private or deleted, the derived Tree remains, the live link is suppressed, and only the approved attribution snapshot remains.
- The complete physical FK and purge behavior is normative in the companion clarification.

Ownership boundaries:

- likes, comments, saves, and reports belong to the acting account;
- moderation status belongs to the target content and moderator workflow;
- saves are private user state unless explicitly shared;
- reports are never exposed through public product responses;
- public serializers omit owner IDs, memberships, private memo, moderation, and internal audit fields.

Legacy `memories.artist`, `channelId`, `channelName`, and `channelUrl` may inform source attribution only when their meaning is unambiguous; otherwise preserve them as legacy fields without speculative backfill.

## 10. Milestones

Moment and Connection counts are derived from active canonical rows. Mutable count truth is not persisted solely for milestone qualification.

Persist Tree-level idempotent milestone events and actor-level receipts as separate entities, using the exact fields and uniqueness rules in the companion clarification.

Rules:

- refresh, retries, and multiple tabs cannot create duplicate Tree-level events;
- one collaborator acknowledging or dismissing does not suppress another collaborator's receipt;
- deleting a triggering Moment does not erase a historically earned event, although current counts may fall;
- backfilled histories must not force old celebrations on first login;
- the 300th Moment is dismissible and replayable and never a payment wall;
- anonymous public viewers do not create milestone receipts.

## 11. Existing-schema collision map

| Legacy field | Collision | Decision |
|---|---|---|
| `memories.timestamp` | may mean date, DB time, or media position | preserve untouched initially; never blindly map |
| `memories.parentId` | structural pointer without causal meaning | compatibility projection only; canonical relation is Connection |
| `trees.artist` | may be subject name | use only as a conservative subject hint |
| `trees.memo` | Tree description | canonical API alias is `description`; one physical source of truth during transition |
| `memories.artist` | may be source creator or subject hint | map to attribution only when unambiguous |
| `memories.source` | title/provider ambiguity | split into explicit source fields only when unambiguous |
| `memories.thumbnail` | URL field with legacy name | canonical name becomes `thumbnailUrl` |
| `channelId/name/url` | provider attribution metadata | retain and map only with evidence |
| `groupName` | organizational grouping | not a substitute for `subjectName` |
| current `public` defaults | unsafe for new private-first flow | preserve V1/V2 versioned defaults and existing stored rows; new V3 API uses explicit private-first defaults |
| legacy Tree/Moment visibility reads | some endpoints do not intersect parent and child policy | treat as a privacy defect; correct at compatibility cutover and never broaden exposure |
| legacy mutable `treeId` | current update can move a Memory across Trees | V3 immutable; V1/V2 adapter uses the normative all-or-nothing move transaction |
| `trees.keywords` | flat keyword bag used by legacy seed/UI content | retained as a legacy V1/V2 display field; not a V3 canonical search source |
| `tree_social_counts` | legacy per-tree engagement projection rows | retained as refreshable compatibility projections; not writable by clients |

## 12. Migration and backfill strategy for Issue #19

### Mixed-version sequencing contract

The migration is a ten-step contract. Every step must complete observably before the next step starts. Application rollback remains safe at every additive step because the new columns/tables are nullable and ignorable by older code.

```text
 1. additive nullable schema
    - add createdById (null), sortOrder (null), visibility_mode (null DEFAULT 'explicit'),
      contributor-style tables, lifecycle columns, audit/exception ledgers
    - visibility_mode has DB DEFAULT 'explicit' from initial column creation
    - no destructive rename/drop; no NOT NULL on new columns; no default-rewrite on legacy cols
 2. compatibility reads deployed on both old and new app versions
    - old version keeps reading legacy shape
    - new version's compatibility mapper projects legacy rows
    - unexpected null visibility_mode is read as COALESCE(visibility_mode, 'explicit')
 3. new-server dual-write
    - new server writes new fields atomically with the legacy write
    - authorship: server assigns createdById from authenticated actor + membership
 4. old-server writes remain legal under the nullable/default contract
    - visibility_mode DB default explicit (privacy-preserving); column remains nullable
    - sortOrder left null (legacy-unassigned) for legacy insert
    - legacy writer never emits inherit; never fabricates createdById
 5. background deterministic backfill
    - createdById: solo Tree -> current tree ownerId; collaborative Tree ->
      deterministic audit-approved resolution from migration-era actor evidence
    - sortOrder: exact DFS pre-order traversal per Tree (see sortOrder migration contract)
    - memoVisibility: deterministic classifier (see below)
    - visibility_mode: idempotent batch sets all null rows to 'explicit'; null count gate applies
 6. malformed-parent exception quarantine
    - rows classified into the exception registry; legacy raw parentId preserved
    - canonical primary-path Connection omitted until remediation
 7. metrics and verification
    - null counts, backfill counts, exposure-change counts, exception counts
    - zero unknown-shape rows before cutover
 8. old server drain confirmed
    - traffic / version heartbeat confirms old writers are no longer active
 9. strict constraints applied
    - NOT NULL on createdById, sortOrder, visibility_mode (DB default already exists from step 1)
    - partial unique indexes; composite FKs; updatedAt/version optimistic write guards
10. V3 persistence enabled
    - only after the #20 compatibility mappers are in place and verified
```

Rollback policy: rollback at any step prior to step 10 removes application binaries / feature flags; step 1 additive columns stay in place and are inert to older code. Database rollback that drops the new columns or tables is not the default; any drop is a privileged retention-style operation requiring its own approval, not part of the application rollback path.

### Deterministic `memoVisibility` backfill

The classifier runs over each existing Moment's memo-bearing row and produces exactly one of `private | tree | public`. No row is reclassified more broadly than its present effective exposure under the legacy read path.

| Condition evaluated in priority order | Assigned memoVisibility |
|---|---|
| memo is empty / blank after trim | `private` |
| legacy effective read (Tree + Memory intersection) exposes the memo to anonymous public callers | `public` |
| legacy effective read exposes the memo only to the Tree owner and authorized members of that Tree | `tree` |
| otherwise (including deterministic unresolvable cases) | `private` |

The backfill records per-class counts plus prior-vs-new effective exposure deltas. Any row whose public exposure class is reduced (for example legacy endpoint overexposure that bypassed Tree-level intersection) is logged as an intentional privacy-hardening change in the migration evidence report; no row is broadened.

### `sortOrder` migration contract

#### Input graph

Each Tree uses legacy `parentId` to build a forest. The following edges are quarantined before traversal:

- self edge (`parentId = own id`)
- missing parent (parentId references a nonexistent row)
- cross-tree parent
- soft-deleted parent
- cycle-forming edge
- already quarantined edge

The remaining legacy parent relation is a forest where each Moment has at most one parent.

#### Exact traversal algorithm

```text
1. roots = valid active Moments with no valid legacy parent
2. roots sort = (createdAt ASC, id ASC)
3. each parent's children sort = (createdAt ASC, id ASC)
4. depth-first pre-order traversal
5. visit parent before all descendants
6. each sibling subtree is completed before the next sibling
7. quarantined and unreachable Moments append after the valid forest
8. appended rows sort = (createdAt ASC, id ASC)
9. assign dense integers 0..n-1 in traversal order
```

Diamond patterns or Moments with multiple incoming Connections are not used as input for legacy backfill ordering. This backfill uses only the legacy primary parent forest; additional V3 Connections are graph meaning after migration and do not alter the initial Moment sortOrder backfill.

#### Stable snapshot

The backfill must not recompute traversal per batch. The recommended approach:

- Compute the full Moment→sortOrder mapping per Tree in a migration snapshot
- Store the mapping in a staging/audit table
- Batch updates apply the stored mapping
- Retries reapply the same mapping

If new rows appear during migration:
- Old V1/V2 inserts write `sortOrder = null`
- Compatibility reads show nulls in the tail
- A deterministic incremental assignment batch handles them
- After old-server drain, full mapping and null-count are re-verified
- `NOT NULL` applies at step 9

The same input must produce the same output regardless of batching, retries, or worker count.

#### Schema and write rules

- Schema: additive nullable integer column during the mixed-version window; no unsafe physical default that would fabricate order for legacy writers.
- Legacy insert: a V1/V2 legacy insert that omits `sortOrder` must succeed and leave the field null (meaning legacy-unassigned). The compatibility read mapper deterministically orders rows by sorting non-null `sortOrder` ascending first, then ordering the null tail by `(createdAt, id)` ascending for stable output.
- Backfill: per Tree, assign deterministic sortOrder values using the exact DFS pre-order traversal above. Re-running the backfill produces identical values; batched, idempotent, retry-safe. Null-count verification runs before cutover.
- Strict constraint: `NOT NULL` applies only after old-server drain plus null-count = 0 verification, in step 9 of the migration contract.
- Concurrent V3 writes: V3 server always writes an explicit `sortOrder` computed inside a Tree-scoped serialized transaction (advisory lock). Simple `MAX(sortOrder)+1` outside the lock is not permitted. Final tiebreaker for equal values is `(sortOrder, createdAt, id)`.
- Rollback: the nullable additive column stays during application rollback and is ignored by older binaries. Strict constraint apply is a separate later migration step.

### `parentId` malformed-row exception quarantine

The following legacy row classes are quarantined in the exception registry during migration, with the raw legacy `parentId` preserved verbatim in the audit record:

- self parent (`parentId = own id`)
- cross-tree parent
- missing parent (parentId references a nonexistent row)
- cyclic or already-quarantined parent
- parent that resolves to a soft-deleted Moment
- rows pending approved recovery of a primary Connection

Read-path contract:

- the legacy `parentId` projection returns `null` for every quarantined class above;
- the V3 read model exposes the quarantine state separately (an `exceptionState`/reason code on the read-model view) so operators can audit;
- only after an approved remediation creates an active primary Connection does the projection become deterministic and the exception state resolve;
- remediation never invents a synthetic parent; it goes through owner/editor-authorized Connection create with the standard cycle/same-tree validation.

### Migration operations (step references)

1. Add fields and tables only; do not rename or drop in the first migration.
2. Existing Trees: `treeType=personal`, `collaborationMode=solo`, `status=active`. Backfill `subjectName` from non-empty `artist`, then non-empty `groupName`; otherwise leave it null and let the compatibility read mapper display `title` as a fallback without inventing stored subject identity. Backfill `subjectType=other` only when `subjectName` is set but no deterministic category is available.
3. Existing Moments: `status=active`, `visibility_mode=explicit`; preserve current stored visibility. Backfill `createdById` and `sortOrder` per the deterministic rules above. Backfill memo visibility per the deterministic classifier above and apply the parent-child security intersection; accidental endpoint overexposure is not preserved.
4. Keep the current shared visibility enum unchanged. Add only the `explicit|inherit` mode type and memo-visibility type required by this decision.
5. Extend the current PostgreSQL source-type enum additively using the deployment sequence in the companion clarification; keep legacy values readable and do not drop its current non-null constraint.
6. Do not infer `recordDate` or media intervals from ambiguous `timestamp` except strict, independently reviewed patterns; otherwise leave new fields null and preserve the legacy value.
7. Backfill `thumbnailUrl` from `thumbnail` and explicit source fields only where semantics are unambiguous.
8. For each same-tree `parentId`, first detect self-links and cycles across the full legacy parent graph. Create an active `legacy_parent` Connection with label `기존 연결` and `isPrimaryPath = true` only for same-tree, non-self, acyclic edges. Missing, cross-tree, self-referential, cycle-forming, or soft-deleted parents are migration exceptions: preserve the legacy `parentId` in the audit registry, omit the invalid Connection, project `parentId = null` on the read path, and report the affected IDs for explicit remediation.
9. Keep `parentId` readable/writable for V1/V2 during transition. New V3 writes create Connections. The compatibility adapter projects the active primary incoming Connection to `parentId`; legacy V1/V2 parent updates atomically create/update that primary Connection and must reject a self-link, cross-tree edge, or cycle.
10. Canonical V3 does not mutate Moment `treeId`. A legacy V1/V2 Tree move follows the exact serialized transaction and conflict behavior in the companion clarification.
11. Legacy V1/V2 visibility updates atomically set `visibility_mode = explicit`. V3 inherit writes atomically set mode to inherit and the raw visibility fallback to private.
12. Backfill deterministic `sortOrder` per Tree using the stable Tree-local ordering rule above; the `NOT NULL` constraint applies only at step 9 of the sequencing contract, after old-server drain and null-count verification.
13. Create lifecycle-aware owner memberships and the separate same-Tree cover relation according to the companion clarification.
14. Stage new non-null constraints only after nullable addition, backfill, exception reporting, and validation (step 9 of the sequencing contract).
15. Validate clean install and upgrade on an isolated database. Production remains untouched.

## 13. API and normalized read-model implications

- Keep existing V1/V2 endpoint paths and response shapes compatible.
- V1/V2 omitted create defaults remain versioned; V3 uses private-first draft semantics.
- V1/V2 ordinary DELETE paths switch to soft-delete storage semantics after lifecycle support exists while preserving response shape.
- Add canonical Moment and Connection contracts behind version-neutral mappers.
- Recommended routes:

```text
/api/trees/:treeId/moments
/api/trees/:treeId/connections
```

- Do not expose physical table names in V3 UI contracts.
- Server validation is authoritative for ownership, lifecycle, effective visibility, media intervals, safe URLs, relation taxonomy, same-tree constraints, primary-path rules, and cycle prevention.
- Legacy V1/V2 visibility mutations set `visibility_mode = explicit`; canonical V3 mutations write the mode and raw fallback together.
- Legacy V1/V2 Tree moves use the compatibility transaction; V3 update contracts omit mutable `treeId`.
- All V3 lenses receive one normalized payload:

```ts
{
  tree,
  moments,
  connections,
  permissions,
  derivedSources,
  milestoneState
}
```

Growth tree, timeline, diary, story, album/archive, map, nebula, community, and milestones must not maintain separate persisted arrays.

### Serialization and concurrency

- `recordDate` serializes as an ISO-8601 calendar date (`YYYY-MM-DD`) on the wire. It never carries time-of-day, timezone, or offset. Server validation rejects non-conforming payloads. UI may render localized text but the wire format stays `YYYY-MM-DD`.
- V1/V2 legacy serializers never emit `visibility_mode = inherit`; they project the computed effective visibility as one of `private|unlisted|public`. The dual representation (`mode` + plain visibility) is internal to the canonical model and the compatibility mapper; consumers of legacy endpoints remain on the legacy enum semantics throughout the transition.
- V3 mutations on existing Moments use optimistic concurrency: each update carries the row's last observed `updatedAt` value (or, where an explicit integer `version` is introduced later, the version) and the server issues a conditional write `WHERE updatedAt = :observed` or `WHERE version = :observed`. A non-matching precondition returns conflict (`409`), never a silent last-writer-wins overwrite.
- Connection create/delete and Moment delete share the per-Tree serialization contract (same transaction-scoped per-Tree advisory lock or independently reviewed equivalent) so graph edits cannot interleave with primary-path promotion or Connection incident cleanup.

### Migration audit ledger

Migration, transfer, backfill, and exception-remediation actions append to a shared audit ledger. The ledger records at minimum:

```text
auditId, actorId, actorMembershipId nullable, targetTreeId nullable,
targetMomentId nullable, action (membership_transfer | ownership_transfer |
  account_tombstone | tree_soft_delete | moment_soft_delete |
  memo_visibility_backfill | sortOrder_backfill | visibility_mode_backfill |
  parentId_quarantine | parentId_remediation | derived_tree_creation |
  derived_tree_soft_delete | hard_purge), reasonCode, priorValue, newValue,
backfillSource, backfillConfidence, createdAt
```

Any hard-purge, ownership transfer, account tombstone, parent-quarantine remediation, derived-tree idempotency decision, or memo-visibility backfill batch must insert a well-formed audit row before commit. The audit ledger is queryable for migration evidence and for owner-vs-author attribution when an owner modified another member's content.

## 14. Mandatory invariants

- `recordDate`, DB timestamps, and media seconds remain separate typed fields; `recordDate` serializes as `YYYY-MM-DD`.
- A Moment may lack an external URL, but its canonical title must be meaningful or generated deterministically.
- Emotion fields contain emotional states only.
- Connections are directed, same-tree, non-self, acyclic, ownership-validated, and concurrency-safe on creation and on deletion cleanup.
- At most one active primary incoming Connection exists per target Moment.
- Effective child visibility never exceeds Tree visibility; accidental legacy overexposure is corrected rather than preserved.
- Draft, archived, or deleted entities do not enter public/community reads.
- Public/community joins cannot reveal private memo, private Moment existence, ownership/member data, moderation data, or private derivation sources.
- Every V3 view reads the same normalized entities.
- Status and deletion timestamps remain internally consistent.
- One active ultimate owner membership exists per Tree.
- A collaborative Tree cannot remain owned by a deleting account; an active collaborative Tree cannot be left owner-less.
- A cover Moment and a derived source Moment retain database-enforced Tree identity.
- Milestone qualification is Tree-level while acknowledgement/dismissal is actor-level.
- Moment authorship (`createdById`) is server-assigned from the authenticated actor and active membership; clients cannot set or override it.
- Mutation authority on a Moment is resolved from the actor's active membership role and the Moment's preserved `createdById`; member removal revokes authority without rewriting authorship.

## 15. V1/V2 compatibility assessment

The decision is backward-compatible only if Issue #19 follows the additive migration sequence and Issue #20 installs the compatibility mappers before V3 persistence is enabled.

- Existing IDs remain unchanged.
- Existing `trees` and `memories` remain readable and writable through compatibility adapters.
- Existing endpoint paths and response shapes remain stable.
- V1/V2 omitted create defaults remain versioned rather than inheriting V3 defaults.
- Ordinary DELETE requests preserve user-visible behavior while changing storage to soft deletion.
- V3 adapters map legacy rows into the normalized model without treating fixture-only fields as production truth.
- `parentId` remains during transition and projects only the primary path; quarantined exceptions project `null`; it is no longer the canonical causal model.
- Existing raw visibility values remain valid; canonical inherit behavior is represented by a separate mode; the physical DB default is `explicit`.
- No existing row is made more public. Privacy-hardening reductions may correct current endpoint leaks and must be reported.
- Ambiguous `timestamp` values remain untouched until independently classified.
- Legacy cross-Tree Moment moves are supported only through the complete compatibility transaction or rejected atomically with a stable conflict response.
- `sortOrder` remains nullable during the mixed-version window; legacy inserts succeed without it; the compatibility read mapper orders deterministically.
- `createdById` remains nullable during migration; the compatibility read mapper returns the Tree owner as the compatibility author until backfill completes.
- Application rollback at any pre-cutover step is safe; DB column/table drop is not the default rollback path.

## 15.5. Additional closures for Issue #19 and #20

### Long-term field inventory

The following product-spec fields are classified for Issue #19 and #20. Implementers must not invent additional fields beyond this inventory.

| Field | Classification |
|---|---|
| `discoveredAt` | deferred open question |
| `relatedPeople` | deferred open question |
| `tags` | represented by existing canonical field (`emotionTags` for emotions; no general tag field in Phase 1) |
| `platformMetadata` | derived/read-model only |
| `sourceAuthor` | represented by existing canonical field (`sourceAttribution`) |
| `recommendedByUserId` | explicitly out of Phase 1 persistence |
| `adoptedRecommendationId` | explicitly out of Phase 1 persistence |
| `subjectId` | deferred open question |
| `route` | deferred open question |
| `restPeriod` | deferred open question |

### `contributor` membership

`contributor` is future-only:

- not in the current canonical membership enum (`owner|editor|viewer`)
- not implemented in Phase 1 schema or API
- the permission matrix row for contributor-style membership in §5 is a future design illustration only

### Milestone active-row count

A canonical active Moment for milestone counting is:

```text
status = active
deletedAt IS NULL
Tree status = active
Tree deletedAt IS NULL
```

Derived or imported Moments are not excluded from the count. Visibility does not exclude a Moment from owner milestone count qualification, but public milestone surfaces apply separate authorization.

## 16. Open questions and recommended decisions

### Partial or unknown remembered dates

Recommendation: Phase 1 stores nullable full dates only. Partial date precision is out of scope and requires a separate approved field before implementation.

### Multiple parallel Connections between the same two Moments

Recommendation: disallow initially. Use one Connection with relation label and memo. Revisit only with demonstrated product need.

### Automatic cycle handling

Recommendation: reject the mutation; never silently reorder or remove existing Connections. Perform cycle validation in the serialized write transaction.

### Official Tree verification

Recommendation: `treeType=official` is server/admin controlled. Verification workflow and organization ownership are separate future decisions.

### Restoring deleted Connections

Recommendation: do not auto-restore when a Moment returns. Require explicit reconnection.

### Primary path selection

Recommendation: persist `isPrimaryPath`. The first incoming edge is primary, owners/editors may explicitly change it, deletion promotes the deterministic lowest remaining edge, and V1/V2 `parentId` projects only that edge.

### Official collaborative Trees

Recommendation: model official provenance and collaboration independently through `treeType` and `collaborationMode`; do not encode them as mutually exclusive Tree types.

### Unlisted link revocation

Recommendation: retain possession-of-link semantics for the first compatibility release. A revocable token model requires a separate approved decision.

### Stage and completionDeclaredAt

These fields are not included in the current canonical model. Their semantics, interaction with lifecycle status, and milestone implications require a separate decision gate. Downstream issue #22 must resolve whether `stage` and `completionDeclaredAt` enter the canonical model before any implementation references them. Until that gate passes, no schema, API, or UI code may introduce them.

### Derived Tree idempotency

Recommendation: block duplicate derived-Tree creation from network retries using an `idempotencyKey` with a unique constraint on `(createdById, idempotencyKey)`. The derivation request must also include a `requestFingerprint` capturing the normalized intent. Retrying a derivation request with the same key and same fingerprint returns the existing derivation rather than creating a duplicate. Retrying with the same key but different fingerprint returns `409 IDEMPOTENCY_KEY_REUSED`. The previous `(derivedTreeId, sourceTreeId, createdById)` constraint is ineffective because `derivedTreeId` is always new and does not prevent retry duplicates.

### Derived Tree deletion

Recommendation: soft-deleting a derived Tree removes only the derived row and its own content; it does not alter the source attribution snapshot or the source Tree/Moment state. The `derived_tree_sources` row transitions to a suppressed state but the approved attribution snapshot persists for audit.

## 17. Out of scope for this documentation PR

- Drizzle schema edits or migrations
- API/runtime implementation
- UI refactoring
- Preview or Production deployment
- final emotion/relation copywriting beyond initial controlled dictionaries
- payment/reward implementation
- recommendation ranking implementation
- invitation delivery and organization-verification workflow
- revocable unlisted share tokens

## 18. Downstream issue mapping

- #18: use the normalized read model only; do not invent persistence fields.
- #19: implement additive schema, constraints, backfill, owner memberships, cover relation, derived-source integrity, milestone event/receipt separation, and isolated DB validation.
- #20: implement auth/API/CRUD adapters, privacy-hardening reads, soft-delete compatibility, legacy Tree-move transaction, and V1/V2 response compatibility.
- #21: implement public reads, engagement, derivation, reporting, and moderation boundaries.
- #22: implement derived counts plus persisted Tree-level milestone events and actor-level receipts.
- #23: independently review authorization, privacy, accessibility, performance, resilience, and concurrent graph writes.

## 19. Approval gate

This document and its normative companion remain proposed until an independent architecture review confirms:

- field types, nullability, and defaults preserve existing rows or intentionally document privacy-hardening changes;
- versioned V1/V2 and V3 defaults are implementable;
- official/collaborative dimensions and lifecycle-aware memberships are implementable;
- composite same-tree and ownership constraints are implementable;
- primary-path compatibility and legacy Tree moves are deterministic;
- visibility is enforceable without exposing `inherit` to legacy consumers or preserving current leaks;
- cover and derived-source identity are enforceable;
- collaborative milestone receipts are actor-specific;
- legacy malformed parent graphs have a safe exception path;
- migration and API compatibility are complete;
- no fixture-only concept is treated as production truth;
- Moment authorship (`createdById`) is server-assigned, never client-supplied, and mutation authority is deterministic from membership role;
- ownership transfer prevents orphaned active collaborative Trees and blocks account deletion when transfer fails;
- personal solo Tree owner deletion follows an approved soft-delete/retention path without orphaning;
- official Tree ownership changes are server/admin-authorized only;
- application user identity is tombstoned rather than hard-purged while references exist;
- `visibility_mode` physical default is `explicit` and legacy inserts cannot silently flip to `inherit`;
- `sortOrder` is nullable during migration, legacy inserts succeed without it, and `NOT NULL` applies only after verified drain;
- the ten-step mixed-version sequencing contract is implementable and rollback-safe;
- `memoVisibility` backfill uses a deterministic classifier with reported exposure deltas;
- quarantined `parentId` exceptions project `null` until approved remediation;
- `recordDate` serializes as `YYYY-MM-DD` and legacy serializers never emit `inherit`;
- optimistic concurrency uses conditional write on `updatedAt` or version;
- derived Tree creation is idempotent and deletion does not alter source attribution.

Required verdict:

```text
V3_DOMAIN_MODEL_APPROVED
```

Issue #16 remains open until both documents are independently approved and merged, and downstream Issues reference the merged authority.