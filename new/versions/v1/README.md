# NEW Product Version V1

## Identity

`new/versions/v1/` = LoveTree product version 1, composed from Source Capsules.

## Structure

```
new/versions/v1/
├── manifest/       — Version manifest (source references, composition rules)
├── adapters/       — Source → Product adapters (plain JS)
├── shell/          — Host/shell infrastructure
├── routes/         — Product route definitions
├── navigation/     — Navigation structure
└── shared/         — Shared utilities for V1
```

## Composition Example

```
NEW V1
  Portal     = SRC064
  Moment     = SRC057
  Connections = SRC056
  Explore    = SRC060
  Board      = SRC058
```

Source Capsules are referenced, NOT copied into V1 folder.

## Rules

- Adapters use canonical HTTP API directly (plain JS)
- Shell/host may optionally reuse SHARED_CORE_BRIDGE_LIB
- Source Capsules remain at `new/sources/` — never duplicated
- Product route connection only after source parity is proven
