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

## Setup boundary

The initial #569 setup slice creates governance, registries, templates and validation only. It must not create a real Source/Codex runtime or MVP composition.
