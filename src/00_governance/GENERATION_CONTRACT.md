# Clean Generation Contract

Controlling issue: #569
Related authority: #80, #527, #564

## Active root

```text
ACTIVE_REIMPLEMENTATION_ROOT = src/
old/ = HISTORICAL_REFERENCE
new/ = PREVIOUS_RESET_REFERENCE_AND_TOOLING
core/ = PRODUCT_HISTORY_REFERENCE
```

No new 108-corpus visual/runtime implementation is authored under `old/` or `new/`.

## Corpus semantics

The 108-result corpus is a master evaluation inventory, not 108 unique designs. `MST001`–`MST108` preserve the 108 row identities while Source/Codex/FAM identities remain separate.

The existing authoritative corpus ledger remains `design-intake/master-design-coverage.json` until each MST row is explicitly reconciled into this generation registry.

## Implementation sequence

```text
MASTER ROW INTAKE
→ PROVENANCE IDENTITY RESOLUTION
→ RAW AUTHORITY LOCK
→ SOURCE BASELINE
→ MECHANICAL HTML/CSS/JS/ASSET SPLIT
→ SOURCE↔SPLIT PARITY
→ NORMALIZED FAMILY RESOLUTION
→ REUSABLE COMPONENT ELIGIBILITY
→ ADAPTER / PRODUCT COMPOSITION
```

No later stage may silently repair an earlier stage.

## Generation phases

The clean `src/` generation advances through explicit, fail-closed phases:

```text
SETUP
  ↓
CALIBRATION
  - first calibration Source
  - materially-different second replay
  ↓ governing review
ROLLOUT
  - broad Source mechanical-port rollout
```

`CALIBRATION` is limited to the fixed five-source calibration batch and requires `broad_108_rollout_released=false`. `ROLLOUT` requires `active_root=src/`, `real_source_runtime_started=true`, and `broad_108_rollout_released=true`; it permits active `SRCxxx` capsules outside that calibration batch while applying the same shared Source capsule integrity contract.

Both Source phases require fresh authority resolution, frozen original authority, and the ordered `S0 → S1 → S2 → S3 → S4` contract. Mechanical-only preservation remains mandatory: no redesign, React/TSX/JSX source-port conversion, DOM restructuring, or silent source-quirk repair.

`ROLLOUT` releases Source mechanical-port intake only. It does not release Codex runtime, normalized FAM allocation, Lineage allocation, componentization, product adoption, product composition, or backend/API/DB/Auth work. Those remain separate downstream phases and are never inferred automatically.

## Setup boundary

The initial #569 setup slice creates governance, registries, templates and validation only. It must not create a real Source/Codex runtime or MVP composition.
