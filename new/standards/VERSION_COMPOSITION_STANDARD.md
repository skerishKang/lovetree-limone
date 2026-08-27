# Version Composition Standard

> Established: 2026-08-28
> Authority: Integration CTO review via PR #547

---

## Purpose

Defines how Product Versions reference and compose Source Capsules.

## Composition Model

A Product Version is a **reference map**, not a copy:

```
Product Version V1
  ├── manifest/       — declares which sources are included
  ├── adapters/       — bridges source UI to canonical backend
  ├── shell/          — host infrastructure
  ├── routes/         — product route definitions
  ├── navigation/     — navigation structure
  └── shared/         — shared V1 utilities
```

## Example Composition

```
NEW V1 Composition:
  Portal      → SRC064
  Moment      → SRC057
  Connections → SRC056
  Explore     → SRC060
  Board       → SRC058
```

Source Capsules remain at `new/sources/`. They are **referenced**, not copied.

## Adapter Ownership

- Adapters live at `new/versions/v1/adapters/`
- Adapters use canonical HTTP API directly (plain JS)
- Adapters do NOT import React/TS bridge from SHARED_CORE_BRIDGE_LIB
- Adapters bridge source UI data shapes to canonical API responses
- Source Capsules remain ignorant of Product/React/Backend

## Shell/Host Ownership

- Shell lives at `new/versions/v1/shell/`
- Shell may optionally reuse SHARED_CORE_BRIDGE_LIB
- Shell provides Auth/Tree/Moment context to source capsules
- Shell is the integration boundary between product and source

## Route Ownership

- Routes live at `new/versions/v1/routes/`
- Routes define product-level navigation to source capsules
- Route connection happens only after source parity is proven
- No product routes created during initial source intake

## Manifest Format

```json
{
  "version": "v1",
  "name": "LoveTree V1",
  "sources": {
    "portal": "SRC064",
    "moment": "SRC057",
    "connections": "SRC056",
    "explore": "SRC060",
    "board": "SRC058"
  },
  "created": "2026-08-28"
}
```

## Rules

1. Source Capsules are referenced, never duplicated into version folders
2. Adapters are plain JS — no React/TS imports from SHARED_CORE_BRIDGE_LIB
3. Shell/host is the only layer that may optionally reuse SHARED_CORE_BRIDGE_LIB
4. Product route connection is a separate step after source parity
5. One version manifest per product version
