# LoveTree — Product-Adoption Bridge (Canonical Architecture & Governance)

```text
GOVERNANCE_CLASS = ARCHITECTURE_DOCUMENTATION
ISSUE = #663
STANDING_ARCHITECTURE = #565
MVP_REGISTRY = #590
MVP001_PRODUCTIZATION = #596
CLEAN108 = #589 (CLOSED_COMPLETED at rebaseline)
RELEASED_BY = #663 rebaseline comment 6011737916, release comment 6012630085
CURRENT_MAIN_AT_RELEASE = 78be13167f93cf05a5136d08296401d04a79693d
DOCUMENTATION_ONLY = YES
EXECUTABLE_RECORDS_CREATED = NO
```

> This document is **documentation / governance only**. It defines the canonical, owner-
> authorized boundary between parity-approved Source/Codex capsules and Product consumers,
> and it maps the existing `public/mvp/01` five-Source Productized Alpha into that model.
> It does **not** select a pilot, does **not** implement an executable adoption layer, and
> does **not** mutate `src/03_sources`, `src/04_codex`, `public/mvp/01`, `app/v4`, or any
> backend/Auth/DB/Drive authority.

## HOLD (carried forward from the #663 release)

```text
PRODUCT_ADOPTION_RELEASE = NO
PILOT_SELECTION = NO
APP_V4_MUTATION = NO
PUBLIC_MVP_RUNTIME_MUTATION = NO
SOURCE_RUNTIME_MUTATION = NO
BACKEND_AUTH_DB_AUTH_MUTATION = NO
DRIVE_MUTATION = 0
```

---

## 1. Purpose

Issue #663 asked for an explicit, owner-authorized path from a **parity-approved** `src/03_sources`
or `src/04_codex` capsule into a Product consumer (`MVP001`, `MVP002`, `app/v4`, or another
consumer) **without mutating source authority**.

CENTRAL's rebaseline (`#663 cmt 6011737916`) corrected the original premise: a real
five-Source Productized Alpha **already exists** under `public/mvp/01/`. Therefore #663 must
**not** invent a second, competing bridge. The gap is the *architecture boundary itself*:

- frozen authority still lives in `src/03_sources/**` / `src/04_codex/**`;
- the reusable adoption layer (`src/06_components/`) is README-only;
- the composition layer (`src/07_compositions/`) is README-only and guarded;
- the current Product bridge is **MVP001-owned implementation**, not yet a reusable
  Source/Codex adoption layer as #565 requires.

This document canonicalizes that boundary as governance/schema so a future, owner-released
slice can make it executable without re-inventing it.

---

## 2. Current State (as of `78be1316`)

Verified against Git blob truth at the release main. The repo today has these layers:

| Layer | Path | Status |
|---|---|---|
| A. Clean Source authority | `src/03_sources/**` | Frozen originals + mechanical `split/` + `authority/sha256.txt` + `evidence/` + `tests/`. Immutability guarded. |
| A. Clean Codex authority | `src/04_codex/**` | Same model for Codex capsules. |
| B. MVP001 presentation adapters | `public/mvp/01/src056\|057\|058\|060\|064-adapter.js` | Pure, read-only, framework-neutral projection functions (`projectMvp001ContextToSrcXXX`). |
| C. Source Product companions | `public/mvp/01/surfaces/srcXXX/<src>-product-bridge.js` | Self-contained source-side bridges that hydrate/emit via `postMessage`. Standalone-fidelity preserving. |
| D. MVP001 orchestration | `productization-contract.js`, `product-orchestrator.js`, `productized-alpha.js`, `shell.js` | Bridge protocol + context/envelope validation + frame lifecycle + shell chrome. |
| E. Public realization | `public/mvp/01/**` | Served through the Worker `/mvp/NN` static namespace adapter (`core/runtime/worker/mvp-router.ts` → `env.ASSETS`). |
| F. Reusable adoption layer | `src/06_components/` | **README-only. No real component exists.** |
| G. Composition layer | `src/07_compositions/` | **README-only. Guarded by `src/08_harness/generation-phase-guard.mjs`.** |

No Product code today imports `src/03_sources` or `src/04_codex` capsules directly; Product
consumes the *derived* surface under `public/mvp/01/surfaces/` via the checked-in
`product-derivation-manifest.json`.

### 2.1 Existing MVP001 derivation (byte-exact re-verified)

The checked-in `public/mvp/01/product-derivation-manifest.json` (schemaVersion 1) binds each
Product surface to its frozen Source split. Re-hashing the committed Git blobs at `78be1316`
confirms the lock is accurate:

- For each of `SRC064, SRC058, SRC056, SRC057, SRC060`:
  - **`styles.css` is byte-identical** between `src/03_sources/<ID>/split/styles.css` and
    `public/mvp/01/surfaces/<id>/styles.css` (same committed blob; manifest `authority.styles.css`
    === `product.styles.css`). **Five of five.**
  - **`index.html`** differs from the authority copy by exactly the declared
    `bridgeInclude` tag (`<script src="./<id>-product-bridge.js"></script>`, 1 occurrence).
  - **`script.js`** differs from the authority copy only by the declared `seamIdentifiers`:
    `SRC064 = __TRACK64_SELECT__`; `SRC058 = __LT58_SELECT__,__LT58_PRODUCT__`;
    `SRC056 = __LT56_SELECT__,__LT56_COPY__`; `SRC057 = __LT57_SELECT__,__LT57_PRODUCT__`;
    `SRC060 = __LT60_SELECT__`.
  - **Companion bridge** (`<id>-product-bridge.js`) exists exactly once per surface and its
    SHA-256 matches the manifest.
- Every manifest hash (authority + product + bridge) equals the committed Git blob SHA-256.

This lock is enforced by `tests/mvp001-isolated-static.test.mjs` (51 CSS/SHA/seam/bridge
checks) and regenerated by `qa/generate-derivation-manifest.mjs`. **These are the current
Product-implementation evidence, not canonical reusable ownership** — that ownership is
`src/06_components` / `src/07_compositions`, which remain empty.

---

## 3. Canonical Architecture

```text
SRC/CDX SPLIT (structural, parity-approved)
        ↓
IMMUTABLE CLEAN AUTHORITY   (src/03_sources/** , src/04_codex/**)
        ↓  explicit Product Owner release
REUSABLE ADOPTION LAYER     (src/06_components/** : one reusable adapter/component per
        ↓                    parity-approved unit; consumer-agnostic; versioned contract)
COMPOSITION                 (src/07_compositions/** : MVP001 / MVP002 / app-v4 / …)
        ↓                    flow, step order, navigation, shell, experiment behavior
PRODUCT CONSUMER            (public/mvp/NN/** , app/v4/** — realize + serve; never source authority)
```

### 3.1 The invariant (the thing this issue exists to protect)

> **Source/Codex is owned by no MVP. No adapter/component may become canonical because a
> single MVP adopted it. MVP-specific flow, step order, navigation, shell and experiment
> behavior belong to the composition layer. The public/app realization is a consumer and is
> never the source authority.**

A Source may participate in zero, one, or many MVPs. Consume does not mutate. Multiple MVPs
compose the same reusable adapter; each composition remains independently releasable.

---

## 4. Authority Boundary

The layer order is fixed and non-reversible:

```text
SOURCE SURFACE (frozen, parity-locked)
    ↑  data-only, bounded projection/seam contract
CANONICAL REUSABLE ADAPTER / BRIDGE   (consumer-agnostic)
    ↑  typed semantic context / navigation / URL
MVP / PRODUCT SHELL (composition)
    ↑  Auth / API / backend / DB authority
```

- **Upward ownership is one-way.** A Product/adapter/composition change **never** authorizes
  mutation of the frozen source visual/interaction semantics.
- **A Product-integration conflict is an integration defect, not a reason to redraw the
  source.** (Per #565: `SOURCE VISUAL MUTATION = FORBIDDEN BY DEFAULT`.)
- The reusable adapter sits **outside any individual MVP** so it can be shared; it is bound to
  a specific parity-approved source head (see §10 regression lock).

---

## 5. Reusable Adapter / Component Ownership

`src/06_components/**` is the **single canonical home** for a reusable, consumer-agnostic
adapter/component. Its ownership rules (from `src/06_components/README.md`, made executable
here):

1. Only a **Source/Codex unit that has passed source↔split parity** may become a reusable
   component here.
2. A component is **not** source authority. It may expose adapters and Product-facing
   contracts but must preserve the validated visual/interaction semantics of its source family
   unless an explicit owner-authorized exception exists.
3. No component may encode a **single MVP's** flow, step order, navigation or shell; those
   belong in the composition layer.
4. A component is **versioned by contract** (`adapter_contract_version`), so a composition
   pins the version it was parity-verified against.
5. No component may be created by copying an existing MVP-owned bridge into "canonical" form
   without a documented, reviewed mapping (see §7).

Today `src/06_components/` is README-only ("No real component is created in the #569 setup
slice"). That is the correct current state and must remain true until an owner-released
slice introduces the first component.

---

## 6. Composition Ownership

`src/07_compositions/**` is the canonical home for **later MVP/Product compositions**
(assembled from parity-approved components). Rules (from `src/07_compositions/README.md`):

- Composition **may** bind product data, routes, navigation and shell context.
- Composition **must not** silently edit source-family geometry / style / interaction.
- Source authority stays in `src/03_sources` / `src/04_codex`; reusable implementation stays
  in `src/06_components`.
- MVP-specific **flow, step order, navigation, shell and experiment behavior are owned here**,
  not in the source and not in the reusable component.
- No composition exists today; the directory is guarded by
  `src/08_harness/generation-phase-guard.mjs` (it fails closed until the owning stage is
  explicitly opened).

**MVP001's current orchestration files** (`public/mvp/01/productization-contract.js`,
`product-orchestrator.js`, `productized-alpha.js`, `shell.js`) are the *de-facto* composition
that already exists in Product space. §7 maps them into this model; they are **not** to be
moved in this slice.

---

## 7. Existing MVP001 Mapping

The existing `public/mvp/01` five-Source Productized Alpha is treated as **Product-
implementation evidence**. It maps to the canonical model as follows (no rewrite required,
no source-visual change):

| Canonical model role | Current MVP001 realization |
|---|---|
| Immutable clean authority | `src/03_sources/SRC064\|058\|056\|057\|060/split/**` (byte-locked) |
| Reusable presentation adapter | **evidence:** `public/mvp/01/srcXXX-adapter.js` (pure `projectMvp001ContextToSrcXXX`). Becomes the seed for a `src/06_components` adapter only in a later owner-released slice. |
| Source Product companion bridge | **evidence:** `public/mvp/01/surfaces/srcXXX/<id>-product-bridge.js` (hydrates via `SOURCE_INIT`, emits `MEMORY_SELECTED`/`TREE_SELECTED`/`NAVIGATE`). |
| Composition (flow/step/nav/shell) | **evidence:** `public/mvp/01/productization-contract.js` + `product-orchestrator.js` + `productized-alpha.js` + `shell.js` (5 steps: entry→board→relationships→memory→explore). |
| Public/app consumer | **evidence:** `public/mvp/01/index.html` served by the Worker `/mvp/01` static adapter. |
| Derivation lock | `public/mvp/01/product-derivation-manifest.json` + `tests/mvp001-isolated-static.test.mjs`. |

**Migration stance:** the reusable + composition layers are *extracted from* this evidence in
later slices; the current files are never deleted or repurposed to make extraction trivial.
The MVP001 consumer keeps working throughout (see §8).

---

## 8. Migration / Compatibility Plan (phased, no big-bang)

Explicitly forbidden: moving or copying `public/mvp/01` in this slice, or any other slice,
as a bulk operation. The plan is staged so MVP001 stays functional at every phase:

- **Phase A — Canonical ownership contract.** Adopt this document + the adoption-record schema
  (second deliverable) as governance. No code moves. MVP001 unchanged.
- **Phase B — Reusable adapter/component registry.** Introduce the first consumer-agnostic
  adapter/component in `src/06_components/` (owner-released), versioned by
  `adapter_contract_version`. The existing `public/mvp/01/srcXXX-adapter.js` is the reference
  projection, not the new owner. MVP001 still runs off its own copies.
- **Phase C — MVP001 consumer transition.** Point the MVP001 composition at the reusable
  adapter/component via a thin indirection (registry reference), with the composition's
  flow/step/shell behavior unchanged. MVP001 must pass its existing regression before and
  after.
- **Phase D — MVP001 regression / visual / interaction parity proof.** Prove the transition
  did not alter source bytes or observable Product behavior (hash lock + the #596 parity
  gates).
- **Phase E — Second consumer release.** Release a new consumer (`MVP002`, or an `app/v4`
  route/registry entry) that composes the same reusable adapter without touching the source
  or the first consumer.

Each phase is an independent, bounded, reviewable step. None of them is authorized in this
documentation slice.

---

## 9. Source/Codex Immutability Contract (no-source-byte-mutation gate)

Any **future Product-adoption PR** must prove the frozen source bytes did not move. The
contract, made executable, is:

1. **Before/after hash invariance.** For every Source/Codex identity the PR touches
   (`src/03_sources/<ID>/**` or `src/04_codex/<ID>/**`), the committed Git blob SHA-256 set
   must be identical before and after the PR. A PR that cannot show `before == after` for the
   protected source trees is fail-closed and rejected.
   - For the five MVP001 sources this is `src/03_sources/SRC064|058|056|057|060/split/**`
     (and their `authority/`, `raw/`, `evidence/`, `tests/`).
   - Hash the **committed blobs**, not CRLF-normalized working-tree bytes, so the check is
     platform-independent (the authoring device's `core.autocrlf` must not produce false
     drift).
2. **Consumer changes must not alter source acceptance lifecycle.** Deleting, renaming or
   editing a Product consumer (an adapter, a surface, an `app/v4` route, an MVP composition)
   must not change any `source_split_parity_pass`, `s4_status`, `accepted-parity.json`, or
   `authority/sha256.txt` for the contributed source. The source's own acceptance state is
   independent of who consumes it.
3. **The derivation lock stays authoritative.** `product-derivation-manifest.json`
   (schemaVersion 1) plus `tests/mvp001-isolated-static.test.mjs` remain the regression proof
   that Product surfaces derive from the frozen split with byte-identical CSS and declared-only
   index/script deltas. Introducing a reusable component or a new consumer does not relax or
   remove that lock.
4. **Fail-closed.** Missing `authority/sha256.txt`, an unrecorded seam identifier, a missing
   companion bridge, or a hash mismatch is a hard failure, not a warning.

The report fields a Product-adoption PR must carry:

```text
SOURCE_RUNTIME_CHANGED = NO
SOURCE_BEFORE_AFTER_HASH_INVARIANT = YES
SOURCE_ACCEPTANCE_LIFECYCLE_CHANGED = NO
DERIVATION_LOCK_INTACT = YES
```

---

## 10. Adoption Lifecycle

Explicit, ordered states. The current state is held at `OWNER_RELEASED = NO`; nothing here
advances it.

```text
S4_SOURCE_PARITY_PASS
        → ADOPTION_CANDIDATE
        → OWNER_RELEASED
        → REUSABLE_ADAPTER_BOUND
        → COMPOSITION_BOUND
        → PRODUCT_PARITY_PASS
        → PRODUCT_ROUTE_RELEASED
```

| State | Meaning | Gate to enter |
|---|---|---|
| `S4_SOURCE_PARITY_PASS` | The source↔split parity stage for the unit is accepted (existing #565 stage S4 / `accepted-parity.json`). | Parity evidence accepted. |
| `ADOPTION_CANDIDATE` | The unit is nominated for a reusable-adapter/component extraction. | This document + adoption-record schema present. |
| `OWNER_RELEASED` | **Product Owner** explicitly authorizes releasing this unit into the reusable layer. | Owner release reference recorded. **Held = NO today.** |
| `REUSABLE_ADAPTER_BOUND` | A `src/06_components` adapter/component, versioned by contract, is bound to the exact accepted source head. | §9 hash invariant passes. |
| `COMPOSITION_BOUND` | A `src/07_compositions` composition (MVP001/002/app-v4) binds the reusable adapter at a pinned contract version. | Composition regression + visual/interaction parity proof. |
| `PRODUCT_PARITY_PASS` | Product consumer parity (source bytes unchanged, behavior unchanged) is proven. | #596 parity gates + §9 gate. |
| `PRODUCT_ROUTE_RELEASED` | The consumer is live on its route (`/mvp/NN` or `app/v4` route). | Route/registry release; MVP registry entry updated (#590). |

Transitions are **explicit** and reference-bound; `MERGED != PRODUCT_COMPLETE` and
`CI GREEN != PRODUCT_ACCEPTED`.

---

## 11. Explicit Non-Goals (this slice)

This documentation slice does **not**:

- select or implement a Product **pilot** (no `PILOT_SELECTION`);
- mutate `app/v4`, `public/mvp/01`, `src/03_sources`, `src/04_codex`, or any backend/Auth/DB/
  Drive authority;
- create an **executable** adoption record, registry, or component;
- move, copy or delete existing MVP001 runtime files;
- invent a second bridge architecture that ignores the checked-in `public/mvp/01`
  implementation;
- make a Product consumer the source authority, or let one MVP own a Source/Codex;
- advance the lifecycle past `OWNER_RELEASED = NO`.

---

## 12. Related Authority

- `#565` — Standing MVP architecture principle (`RAW ORIGINAL → STRUCTURAL SPLIT → … →
  ADAPTER → MVP COMPOSITION`). Not superseded.
- `#590` — Standing MVP registry (`/mvp/NN` URL namespace + MVP registry contract). Not
  superseded.
- `#596` — MVP001 productization / beta readiness (S5–S10 semantic bridge, backend, beta).
  Not superseded.
- `#589` — Clean 108 mechanical program (CLOSED_COMPLETED at rebaseline); kept
  `PRODUCT_ADOPTION=NO` during CLEAN work.
- Second deliverable: `docs/architecture/LOVETREE_ADOPTION_RECORD_SCHEMA.md` — the
  documentation schema for one adoption record (fields + invariants; **no executable record
  created in this PR**).
