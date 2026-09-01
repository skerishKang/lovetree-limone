# source56-relationship-overview

## Component Record

| Field | Value |
|---|---|
| component_key | `source56-relationship-overview` |
| source_id | `SRC056` |
| product_role | `RELATIONSHIP_OVERVIEW` |
| canonical_route | `/trees/{treeId}/relationships` |
| admission | `PASS` |

## Source Authority

- **Original file**: `src/03_sources/SRC056/original/original.html`
- **Bytes**: 45,761
- **SHA256**: `1828ef47acefd25f1f2b7cff0a3f58c74aa35e28bf127f41975491dcc156d909`
- **Revision**: V1.2
- **Runtime policy**: `HTML_CSS_JS_MECHANICAL_ONLY`

## Product Implementation

- `app/trees/[id]/relationships/page.tsx`
- `app/trees/[id]/relationships/relationships.module.css`

## ViewSwitcher Mapping

| kind | label | path |
|---|---|---|
| `relationships` | 관계 | `/relationships` |

## Admission Evidence

- Baseline: `src/03_sources/SRC056/baseline/accepted-baseline.json`
- Parity: `src/03_sources/SRC056/evidence/parity/accepted-parity.json`
- Authority: `src/03_sources/SRC056/authority/authority.json`
- Adoption test: `tests/five-source-mvp-source56-relationship-adoption.test.mjs`

## Notes

- SRC056 is the first calibration source (small/simple standalone HTML).
- Mechanical split parity: DOM EQUAL, geometry EQUAL, computed_style EQUAL, runtime_state EQUAL, interactions EQUAL, screenshots BYTE_IDENTICAL.
- Mobile ORIGIN_REVEAL graph/headline overlap is frozen Source baseline behavior — not repaired during mechanical split.
