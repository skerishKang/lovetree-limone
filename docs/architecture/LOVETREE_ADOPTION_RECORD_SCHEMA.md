# LoveTree — Adoption Record Schema (Documentation)

```text
GOVERNANCE_CLASS = SCHEMA_DOCUMENTATION
ISSUE = #663
COMPANION = docs/architecture/LOVETREE_PRODUCT_ADOPTION_BRIDGE.md
DOCUMENTATION_ONLY = YES
EXECUTABLE_RECORD_CREATED_IN_THIS_PR = NO
```

> This file defines **the schema** a reusable-adoption record will carry for one
> parity-approved SRC/CDX input. It is documentation: it names the fields, their types, and
> the invariants a record must satisfy so that adoption stays fail-closed. **No executable
> adoption record, registry, or validator is created in this PR.** An executable record may be
> introduced only in a later, explicitly owner-released slice (§8 of the companion document).

---

## 1. Purpose

One adoption record describes the bounded, reviewable path by which a single
**parity-approved** Source/Codex unit is offered to Product consumers:

```text
frozen authority head  →  reusable adapter (versioned)  →  composition  →  consumer(s)
```

The record is the *only* place that binds a consumer to a source. Because the record carries
the source's frozen head, the adapter's contract version, and the no-source-mutation proof, a
consumer (or the deletion of one) can never silently alter the source's own acceptance state.

---

## 2. Record (minimum fields)

A record is a plain data object. Minimum required fields, grouped by concern:

### 2.1 Identity & source authority

| Field | Type | Required | Notes |
|---|---|---|---|
| `identity` | string (`"LOVETREE_ADOPTION_RECORD"`) | yes | Discriminator. |
| `schema_version` | integer | yes | Currently `1`. |
| `source_or_codex_id` | string (`"SRCxxx"` \| `"CDXxxx"`) | yes | The unit being adopted. Mirrors, never rewrites, the source identity. |

### 2.2 Frozen authority references (must be exact, committed-blob truth)

| Field | Type | Required | Notes |
|---|---|---|---|
| `authority_ref` | string (repo path) | yes | e.g. `src/03_sources/SRC064/authority` (or the Codex equivalent). The frozen originals + `sha256.txt`. |
| `accepted_parity_ref` | string (repo path) | yes | The accepted source↔split parity evidence, e.g. `src/03_sources/SRC064/evidence/parity/accepted-parity.json` (or `src/04_codex/…`). |
| `accepted_source_head` | 40-char SHA-1 | yes | The exact Git head at which the parity evidence was accepted. The reusable adapter is bound to *this* head. |

### 2.3 Reusable adapter binding

| Field | Type | Required | Notes |
|---|---|---|---|
| `adapter_id` | string | yes | Stable identifier of the reusable adapter/component (consumer-agnostic), e.g. `ADAPTER_SRC064_PRESENTATION`. |
| `adapter_contract_version` | string/semver | yes | The version the composition pins. Bumped only on a reviewed, source-preserving contract change. |
| `adapter_path` | string (repo path) | yes | Home of the reusable adapter, **outside any individual MVP** (target: `src/06_components/**`). |
| `companion_bridge_path` | string (repo path) | yes | The source-side companion bridge (target: alongside the surface / `src/06_components`). For MVP001-evidence today this is `public/mvp/01/surfaces/<id>/<id>-product-bridge.js`. |
| `projection_contract` | object | yes | The bounded projection/seam the adapter may expose: field list, `seamIdentifiers`, event types. **Must be a subset of what the frozen source already supports** — it may add no new source visual/interaction behavior. |

### 2.4 Consumers (multi-membership, non-owning)

| Field | Type | Required | Notes |
|---|---|---|---|
| `consumers[]` | array of `{ consumer_id, consumer_type, composition_path?, release_state }` | yes (may be empty) | Each entry is one Product consumer: `MVP001`, `MVP002`, `APP_V4`, or another. A consumer **references** the adapter at a pinned `adapter_contract_version`; it never owns the source. Empty is valid before `REUSABLE_ADAPTER_BOUND`. |

### 2.5 Immutability attestation (fail-closed, must be false/0)

| Field | Type | Required | Notes |
|---|---|---|---|
| `source_visual_mutation` | boolean | yes | **Must be `false`.** Adoption never mutates the frozen source visual/interaction semantics. Any `true` is an immediate rejection. |
| `source_before_after_hash_invariant` | boolean | yes | `true` only if the record's §9 gate passed (committed-blob SHA-256 of `src/03_sources/<ID>/**` or `src/04_codex/<ID>/**` unchanged). |

### 2.6 Ownership & release

| Field | Type | Required | Notes |
|---|---|---|---|
| `owner_release_ref` | string | required when `adoption_status >= REUSABLE_ADAPTER_BOUND` | The explicit Product Owner release (issue + comment/PR reference). Until it exists, the record may not leave `ADOPTION_CANDIDATE`. |
| `product_parity_ref` | string (repo path or reference) | required when `adoption_status >= PRODUCT_PARITY_PASS` | The Product-consumer parity proof (source bytes unchanged + behavior unchanged). |
| `adoption_status` | enum | yes | One of the companion document's lifecycle states (see §4). **Current slice permits only up to `ADOPTION_CANDIDATE`; it must not record `OWNER_RELEASED` or above.** |

---

## 3. Invariants (fail-closed)

A record is valid only if all hold:

1. `source_visual_mutation === false` (always).
2. `accepted_source_head` is a real Git head that `accepted_parity_ref` was captured at.
3. `adapter_path` and `companion_bridge_path` are **not** inside any single consumer's private
   namespace (they live in `src/06_components/**` or the source capsule's own companion home,
   never under `public/mvp/NN` as the canonical owner).
4. Every `consumers[]` entry pins an `adapter_contract_version`; no consumer references the
   adapter by mutable/absolute path.
5. `consumers[]` may be many; none may claim ownership of `source_or_codex_id`.
6. `source_before_after_hash_invariant === true` and the §9 gate fields are present.
7. State ordering is monotonic (§4): a record may not jump states or skip `OWNER_RELEASED`
   when it reaches `REUSABLE_ADAPTER_BOUND`.
8. Numeric identity: `MVP00N` has **no** correlation to `SRCxxx`/`CDXxxx` (per #590 §6); a
   record must not infer a consumer from a source number.

Any violation is a **hard failure**, not a warning.

---

## 4. Status values (mirror of the lifecycle)

```text
ADOPTION_CANDIDATE
OWNER_RELEASED
REUSABLE_ADAPTER_BOUND
COMPOSITION_BOUND
PRODUCT_PARITY_PASS
PRODUCT_ROUTE_RELEASED
```

(Preceded by the source's own `S4_SOURCE_PARITY_PASS`, which is asserted via
`accepted_parity_ref`, not re-stored here.) This slice may only ever record
`ADOPTION_CANDIDATE`; `OWNER_RELEASED` requires a real `owner_release_ref`.

---

## 5. What is intentionally NOT part of this record

- No live runtime state, tokens, or secret material (consistent with the MVP001 envelope
  validation that rejects secret-bearing payloads).
- No pixel/SSIM/perceptual hashes and no averaging.
- No re-statement of the source's frozen defect ledger (that stays in the source capsule's
  evidence; adoption references it, never copies it).
- No backend/Auth/DB schema. Adoption is a front-of-house, consumer-facing binding only.

---

## 6. Relationship to existing authority

- **`#565` stages** — `S4_SOURCE_PARITY_PASS` maps to `accepted_parity_ref`; the record adds
  the adoption-specific states `S5..S10` territory without re-opening the source's mechanical
  stages.
- **`#590` MVP registry** — a `consumers[]` entry that becomes a released MVP is also a
  `#590` registry entry; the two stay in lock-step (registry carries the public path, the
  adoption record carries the source→adapter binding).
- **`public/mvp/01/product-derivation-manifest.json`** — today's *evidence* of a five-source
  consumer. It is **not** an adoption record: it does not declare `owner_release_ref`,
  `adapter_contract_version`, or `source_visual_mutation`. When MVP001 transitions (Phase C),
  its adapter bindings become adoption-record entries; the derivation manifest remains the
  byte lock it already is.

---

## 7. Note on the existing MVP001 bridge

The checked-in `public/mvp/01` adapters/bridges are the **reference projections** from which
a reusable `src/06_components` adapter would be derived. That derivation is a later,
owner-released slice. This schema deliberately does **not** retroactively declare the
MVP001 files canonical, and creating a competing adapter architecture that ignores them is
out of scope (per the #663 rebaseline).
