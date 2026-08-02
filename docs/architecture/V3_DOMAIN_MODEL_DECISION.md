---
status: PROPOSED_ARCHITECTURE_DECISION
authority: Issue #16
version: 0.5
effective_date: pending independent approval
source_main_sha: 9b991409ccf017fbdd1b6c2750d1e6bb247048d2
normative_companion: docs/architecture/V3_DOMAIN_MODEL_IMPLEMENTATION_CLARIFICATIONS.md@0.2
---

# LoveTree V3 Canonical Domain Model Decision

## 1. Purpose and authority

This document defines the implementation-ready shared-core model for LoveTree V3 while preserving V1/V2 compatibility.

Authority order:

1. `docs/product/LOVETREE_PRODUCT_SPEC.md`
2. this approved architecture decision and its normative implementation clarification after review and merge
3. version-specific implementation contracts
4. Issues and PR execution contracts
5. supporting analyses and prototypes

Inputs reviewed:

- `docs/product/LOVETREE_PRODUCT_SPEC.md`
- `docs/product/PRODUCT_DOCUMENT_HIERARCHY.md`
- `docs/v3/V3_HTML_TSX_INTEGRATION_ANALYSIS.md`
- PR #11 draft `V3_PRODUCT_CONTRACT.md`, `V3_SHARED_CORE_GAPS.md`, and V3 preview types at `3532d689ee841eccdf92ce069cc0ac603b1e4c02`
- current `db/schema.ts` and API contracts at main `9b991409ccf017fbdd1b6c2750d1e6bb247048d2`
- `docs/architecture/V3_DOMAIN_MODEL_IMPLEMENTATION_CLARIFICATIONS.md`, which closes implementation ambiguities found by the main-schema/API audit and controls where it is more specific

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
| `sortOrder` | integer, non-null | migration-assigned | deterministic ordering |
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

Rules:

- Existing rows backfill `visibility_mode = explicit`; their stored visibility intent remains unchanged.
- New V3 Moments default to `visibility_mode = inherit` and store `visibility = private` as the safe legacy fallback.
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
- Existing endpoint overexposure is not a compatibility promise. The security-hardening rule in the companion clarification controls: no row becomes more public, while documented privacy reductions may correct legacy leaks.

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
- Add a unique key or unique index on `(treeId, id)` so same-tree composite Connection, cover, and derived-source foreign keys are implementable.

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
3. The actor must be the owner or an editor of the Tree.
4. Use a partial unique index for one active directed edge per `(treeId, fromMomentId, toMomentId)` unless a later approved decision permits parallel edges.
5. Use a partial unique index for at most one active `isPrimaryPath = true` incoming Connection per `(treeId, toMomentId)`.
6. A root Moment has no active primary incoming Connection.
7. The first active incoming Connection for a non-root Moment defaults to `isPrimaryPath = true`; additional incoming Connections default false.
8. If the primary Connection is deleted, the service promotes the remaining active incoming Connection with the lowest `(sortOrder, createdAt, id)` in the same transaction. If none remains, the Moment becomes a root.
9. V1/V2 `parentId` projects only from the active primary Connection.
10. The service rejects a write that creates a cycle. The check and insertion run in one transaction with the per-Tree serialization contract defined in the companion clarification; a preflight check outside the write transaction is insufficient.
11. `custom` requires a trimmed non-empty `relationLabel`; placeholder values such as `직접 입력` are invalid persisted meanings.
12. Relation/source/discovery categories cannot be written into `primaryEmotion` or `emotionTags`.
13. `status = deleted` requires `deletedAt`; active status requires `deletedAt IS NULL`.

`relationType` remains an application-managed dictionary rather than a PostgreSQL enum so product language can evolve without destructive enum migrations.

Initial categories:

```text
comment_follow, fan_recommendation, curiosity, skill_check,
personality_check, same_work, direct_search, reaction_confirmation,
return_after_rest, custom, other, legacy_parent
```

## 7. Visibility and access-control matrix

Effective access is the intersection of Tree, Moment, memo, and lifecycle policy. A child entity never broadens its parent.

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

## 8. Lifecycle and deletion

- Default deletion is soft deletion for ordinary V1/V2/V3 DELETE routes after lifecycle fields exist.
- Soft-deleting a Tree changes only the Tree lifecycle fields and immediately removes it and all children from normal reads; child statuses remain intact for recovery/audit.
- Restoring a Tree restores access to children that are individually active, subject to their own visibility. Individually archived/deleted children remain excluded according to their status.
- Soft-deleting a Moment soft-deletes all incident Connections in the same transaction.
- Restoring a Moment does not automatically restore Connections; reconnection is explicit.
- Hard purge may use FK cascade only as a separate privileged retention operation after retention/restore policy authorizes it.
- Derivation live references use nullable FKs with approved attribution snapshots so source purge does not erase lawful attribution history and does not expose newly private content. Composite source identity and purge behavior are defined in the companion clarification.

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
createdById
createdAt
```

Constraints and rules:

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

## 12. Migration and backfill strategy for Issue #19

1. Add fields and tables only; do not rename or drop in the first migration.
2. Existing Trees: `treeType=personal`, `collaborationMode=solo`, `status=active`. Backfill `subjectName` from non-empty `artist`, then non-empty `groupName`; otherwise leave it null and let the compatibility read mapper display `title` as a fallback without inventing stored subject identity. Backfill `subjectType=other` only when `subjectName` is set but no deterministic category is available.
3. Existing Moments: `status=active`, `visibility_mode=explicit`; preserve current stored visibility. Backfill memo visibility conservatively and then apply the parent-child security intersection; accidental endpoint overexposure is not preserved.
4. Keep the current shared visibility enum unchanged. Add only the `explicit|inherit` mode type and memo-visibility type required by this decision.
5. Extend the current PostgreSQL source-type enum additively using the deployment sequence in the companion clarification; keep legacy values readable and do not drop its current non-null constraint.
6. Do not infer `recordDate` or media intervals from ambiguous `timestamp` except strict, independently reviewed patterns; otherwise leave new fields null and preserve the legacy value.
7. Backfill `thumbnailUrl` from `thumbnail` and explicit source fields only where semantics are unambiguous.
8. For each same-tree `parentId`, first detect self-links and cycles across the full legacy parent graph. Create an active `legacy_parent` Connection with label `기존 연결` and `isPrimaryPath = true` only for same-tree, non-self, acyclic edges. Missing, cross-tree, self-referential, or cycle-forming parents are migration exceptions: preserve the legacy `parentId`, omit the invalid Connection, and report the affected IDs for explicit remediation.
9. Keep `parentId` readable/writable for V1/V2 during transition. New V3 writes create Connections. The compatibility adapter projects the active primary incoming Connection to `parentId`; legacy V1/V2 parent updates atomically create/update that primary Connection and must reject a self-link, cross-tree edge, or cycle.
10. Canonical V3 does not mutate Moment `treeId`. A legacy V1/V2 Tree move follows the exact serialized transaction and conflict behavior in the companion clarification.
11. Legacy V1/V2 visibility updates atomically set `visibility_mode = explicit`. V3 inherit writes atomically set mode to inherit and the raw visibility fallback to private.
12. Add deterministic `sortOrder` per Tree using existing creation order with stable ID tie-breaking, without changing IDs.
13. Create lifecycle-aware owner memberships and the separate same-Tree cover relation according to the companion clarification.
14. Stage new non-null constraints only after nullable addition, backfill, exception reporting, and validation.
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

## 14. Mandatory invariants

- `recordDate`, DB timestamps, and media seconds remain separate typed fields.
- A Moment may lack an external URL, but its canonical title must be meaningful or generated deterministically.
- Emotion fields contain emotional states only.
- Connections are directed, same-tree, non-self, acyclic, ownership-validated, and concurrency-safe on creation.
- At most one active primary incoming Connection exists per target Moment.
- Effective child visibility never exceeds Tree visibility; accidental legacy overexposure is corrected rather than preserved.
- Draft, archived, or deleted entities do not enter public/community reads.
- Public/community joins cannot reveal private memo, private Moment existence, ownership/member data, moderation data, or private derivation sources.
- Every V3 view reads the same normalized entities.
- Status and deletion timestamps remain internally consistent.
- One active ultimate owner membership exists per Tree.
- A cover Moment and a derived source Moment retain database-enforced Tree identity.
- Milestone qualification is Tree-level while acknowledgement/dismissal is actor-level.

## 15. V1/V2 compatibility assessment

The decision is backward-compatible only if Issue #19 follows the additive migration sequence and Issue #20 installs the compatibility mappers before V3 persistence is enabled.

- Existing IDs remain unchanged.
- Existing `trees` and `memories` remain readable and writable through compatibility adapters.
- Existing endpoint paths and response shapes remain stable.
- V1/V2 omitted create defaults remain versioned rather than inheriting V3 defaults.
- Ordinary DELETE requests preserve user-visible behavior while changing storage to soft deletion.
- V3 adapters map legacy rows into the normalized model without treating fixture-only fields as production truth.
- `parentId` remains during transition and projects only the primary path; it is no longer the canonical causal model.
- Existing raw visibility values remain valid; canonical inherit behavior is represented by a separate mode.
- No existing row is made more public. Privacy-hardening reductions may correct current endpoint leaks and must be reported.
- Ambiguous `timestamp` values remain untouched until independently classified.
- Legacy cross-Tree Moment moves are supported only through the complete compatibility transaction or rejected atomically with a stable conflict response.

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
- no fixture-only concept is treated as production truth.

Required verdict:

```text
V3_DOMAIN_MODEL_APPROVED
```

Issue #16 remains open until both documents are independently approved and merged, and downstream Issues reference the merged authority.