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

The record is the **canonical ledger of the Source/Codex → reusable adapter/component
binding**. It is complementary to — not a replacement for — the standing #590
composition/MVP registry, which is the ledger of consumer/composition → input identities +
release binding (see §6). Because the record carries the source's frozen head, the adapter's
contract version, and the no-source-mutation proof, a consumer (or the deletion of one) can
never silently alter the source's own acceptance state.

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
| `companion_bridge_path` | string (repo path) | yes | The source-side companion bridge. Its canonical owner is the reusable adoption layer (`src/06_components/**`), never a frozen authority tree and never a consumer namespace. For MVP001-evidence today the concrete file is `public/mvp/01/surfaces/<id>/<id>-product-bridge.js` (evidence only — not canonical ownership). |
| `projection_contract` | object | yes | The bounded projection/seam the adapter may expose: field list, `seamIdentifiers`, event types. **Source-native capability is the default.** A bounded **Product-only augmentation** beyond source-native capability is permitted **only** with an exact Product Owner/CENTRAL authorization recorded in `owner_authorized_product_delta_ref` (§2.5); such augmentation is always implemented **outside** the frozen source authority, is explicit in the record, and must pass Product parity + visual/interaction verification. |

### 2.4 Consumers (multi-membership, non-owning)

| Field | Type | Required | Notes |
|---|---|---|---|
| `consumers[]` | array of `{ consumer_id, consumer_type, composition_path?, release_state }` | yes (may be empty) | Each entry is one Product consumer: `MVP001`, `MVP002`, `APP_V4`, or another. A consumer **references** the adapter at a pinned `adapter_contract_version`; it never owns the source. Empty is valid before `REUSABLE_ADAPTER_BOUND`. |

### 2.5 Immutability & authorized-delta attestation (fail-closed)

| Field | Type | Required | Notes |
|---|---|---|---|
| `source_visual_mutation` | boolean | yes | **Must be `false` in all cases.** Adoption never mutates the frozen source visual/interaction semantics — including when an `owner_authorized_product_delta_ref` is present. Any `true` is an immediate rejection. |
| `source_before_after_hash_invariant` | boolean | yes | `true` only if the record's §9 gate passed (committed-blob SHA-256 of `src/03_sources/<ID>/**` or `src/04_codex/<ID>/**` unchanged). |
| `owner_authorized_product_delta_ref` | `null` \| string (exact issue/comment/PR authority) | yes | **Default `null`.** When `projection_contract` goes beyond source-native capability, the exact Product Owner/CENTRAL authorization reference is mandatory (precedent on current main: the #596-authorized SRC057 Product-mode `title/memo` edit emitting `UPDATE_MEMORY_REQUEST`, with frozen authority bytes unchanged). A Product-only delta **without** this exact reference fails closed. This field authorizes a Product-layer augmentation **outside** the frozen authority only; it is not a source mutation and never weakens `source_visual_mutation=false`. |

### 2.6 Ownership & release

| Field | Type | Required | Notes |
|---|---|---|---|
| `owner_release_ref` | string | required when `adoption_status >= REUSABLE_ADAPTER_BOUND` | The explicit Product Owner release (issue + comment/PR reference). Until it exists, the record may not leave `ADOPTION_CANDIDATE`. |
| `product_parity_ref` | string (repo path or reference) | required when `adoption_status >= PRODUCT_PARITY_PASS` | The Product-consumer parity proof (source bytes unchanged + behavior unchanged). |
| `web_verification_ref` | string | required when `adoption_status >= WEB_VERIFICATION_PASS` | Web verification evidence (#565 S8). |
| `independent_verification_ref` | string | required when `adoption_status >= INDEPENDENT_VERIFICATION_PASS` | Independent (LUNA1) verification evidence (#565 S9 `LUNA1_INDEPENDENT_VERIFICATION_PASS`). |
| `promotion_ready_ref` | string | required when `adoption_status >= PROMOTION_READY` | S10 promotion-ready evidence (#565 S10). |
| `product_route_release_ref` | string | required when `adoption_status = PRODUCT_ROUTE_RELEASED` | Route/registry release reference (#590 registry entry + public route). |
| `adoption_status` | enum | yes | One of the states in §4, which preserves the standing #565 S5–S10 gates in order. **Current slice permits only up to `ADOPTION_CANDIDATE`; it must not record `OWNER_RELEASED` or above.** |

---

## 3. Invariants (fail-closed)

A record is valid only if all hold:

1. `source_visual_mutation === false` (always).
2. `accepted_source_head` is a real Git head that `accepted_parity_ref` was captured at.
3. The canonical owner of `adapter_path` and `companion_bridge_path` is the reusable adoption
   layer (`src/06_components/**`). Canonical ownership is **forbidden** in `public/mvp/NN/**`,
   `app/v4/**`, `src/03_sources/**` and `src/04_codex/**`: after CLEAN acceptance the
   frozen authority trees are immutable and no new canonical Product bridge may be placed
   inside them; a consumer's public realization may carry generated/copied/bound artifacts
   but is never the canonical owner.
4. Every `consumers[]` entry pins an `adapter_contract_version`; no consumer references the
   adapter by mutable/absolute path.
5. `consumers[]` may be many; none may claim ownership of `source_or_codex_id`.
6. `source_before_after_hash_invariant === true` and the §9 gate fields are present.
7. State ordering is monotonic (§4): a record may not jump states or skip `OWNER_RELEASED`
   when it reaches `REUSABLE_ADAPTER_BOUND`, and `PRODUCT_ROUTE_RELEASED` requires the full
   standing chain `REUSABLE_ADAPTER_BOUND` (#565 S5) → `PRODUCT_SHELL_CONNECTED` (S6) →
   `PRODUCT_PARITY_PASS` (S7) → `WEB_VERIFICATION_PASS` (S8) →
   `INDEPENDENT_VERIFICATION_PASS` (S9) → `PROMOTION_READY` (S10). No #565 gate may be
   bypassed.
8. Numeric identity: `MVP00N` has **no** correlation to `SRCxxx`/`CDXxxx` (per #590 §6); a
   record must not infer a consumer from a source number.
9. **Product-only delta is referenced or fails closed.** If `projection_contract` exceeds
   source-native capability, `owner_authorized_product_delta_ref` must be non-null and exact;
   an unreferenced Product-only delta is a hard failure. This never relaxes invariant 1
   (`source_visual_mutation === false`).
10. **Complementary #590 agreement.** When a #590 composition/MVP registry entry exists for
    the same unit, it must agree fail-closed with this record on source identity,
    authority/parity version, adapter contract version, composition identity, and release
    state. Any mismatch blocks release; neither ledger silently supersedes the other.

Any violation is a **hard failure**, not a warning.

---

## 4. Status values (mirror of the lifecycle, preserving #565 S5–S10)

```text
ADOPTION_CANDIDATE
OWNER_RELEASED
REUSABLE_ADAPTER_BOUND                 (#565 S5)
COMPOSITION_BOUND / PRODUCT_SHELL_CONNECTED  (#565 S6)
PRODUCT_PARITY_PASS                    (#565 S7)
WEB_VERIFICATION_PASS                  (#565 S8)
INDEPENDENT_VERIFICATION_PASS          (#565 S9 LUNA1)
PROMOTION_READY                        (#565 S10)
PRODUCT_ROUTE_RELEASED                 (post-S10 only)
```

(Preceded by the source's own `S4_SOURCE_PARITY_PASS`, which is asserted via
`accepted_parity_ref`, not re-stored here.) This slice may only ever record
`ADOPTION_CANDIDATE`; `OWNER_RELEASED` requires a real `owner_release_ref`, and each later
state requires the standing-gate evidence of §2.6 in order.

---

## 5. What is intentionally NOT part of this record

- No live runtime state, tokens, or secret material (consistent with the MVP001 envelope
  validation that rejects secret-bearing payloads).
- No pixel/SSIM/perceptual hashes and no averaging.
- No re-statement of the source's frozen defect ledger (that stays in the source capsule's
  evidence; adoption references it, never copies it).
- No backend/Auth/DB schema. Adoption is a front-of-house, consumer-facing binding only.
- No source-authority exception: a real Source-mutation waiver, if ever needed, is a
  separate Source-lifecycle owner decision tracked outside this record (§6).

---

## 6. Relationship to existing authority

- **`#565` stages** — `S4_SOURCE_PARITY_PASS` maps to `accepted_parity_ref`; the record
  preserves the standing S5–S10 gates as adoption states (§4) without re-opening the source's
  mechanical stages.
- **`#590` composition/MVP registry (complementary ledger).** The adoption record is the
  canonical **Source/Codex → reusable adapter/component** binding; the #590 registry is the
  **composition/consumer → INPUT_IDENTITIES → authority versions → parity states → flow /
  public route / release state** ledger. They are complementary authorities, not competing
  ones: when both exist for the same unit they MUST agree fail-closed on source identity,
  authority/parity version, adapter contract version, composition identity, and release
  state — any mismatch blocks release. Neither ledger silently supersedes the other.
- **Owner-delta concept alignment (#590 `OWNER_AUTHORIZED_SOURCE_DELTA`).** This schema keeps
  three distinct notions that must never be conflated:
  - `source_visual_mutation = false` — the frozen authority **never** changes (no exception
    inside this schema);
  - `owner_authorized_product_delta_ref` — a bounded augmentation allowed **only in the
    Product layer, outside the frozen authority**, with an exact authorization reference;
  - a real Source-authority exception — **not** authorized by this adoption schema at all; if
    ever required it needs a separate Source-lifecycle owner waiver, tracked outside this
    record.
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
