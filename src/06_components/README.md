# Reusable Components

Only Source/Codex implementations that have passed source↔split parity may become reusable components here.

A component is not source authority. It may expose adapters and product-facing contracts, but it must preserve the validated visual/interaction semantics of its contributing source family unless an explicit owner-authorized exception exists.

## Registered Components (MVP001)

| component_key | source_id | product_role | canonical_route |
|---|---|---|---|
| `source64-entry-portal` | SRC064 | ENTRY_PORTAL | `/trees/{treeId}/portal` |
| `source58-living-board` | SRC058 | LIVING_BOARD | `/trees/{treeId}/board` |
| `source56-relationship-overview` | SRC056 | RELATIONSHIP_OVERVIEW | `/trees/{treeId}/relationships` |
| `source57-memory-detail` | SRC057 | MEMORY_DETAIL | `/trees/{treeId}` |
| `source60-deep-exploration` | SRC060 | DEEP_EXPLORATION | `/trees/{treeId}/explore` |

All five were admitted under `MVP001_COMPONENT_ADMISSION = PASS_ALL_5`. Each record lives in its own directory with `component.json` (machine contract) and `README.md` (human summary).
