# source60-deep-exploration

## Component Record

| Field | Value |
|---|---|
| component_key | `source60-deep-exploration` |
| source_id | `SRC060` |
| product_role | `DEEP_EXPLORATION` |
| canonical_route | `/trees/{treeId}/explore` |
| admission | `PASS` |

## Source Authority

- **Original file**: `src/03_sources/SRC060/original/original.html`
- **Bytes**: 55,260
- **SHA256**: `c35b66fb46b57958f7f52c7506ce20e467302f4bcf43b55001428d5d525a7fdf`
- **Revision**: V1.2
- **Runtime policy**: `HTML_CSS_JS_MECHANICAL_ONLY`

## Product Implementation

- `app/trees/[id]/explore/page.tsx`
- `app/trees/[id]/explore/explore.module.css`
- `lib/lineage-60/projection.ts`

## ViewSwitcher Mapping

| kind | label | path |
|---|---|---|
| `explore` | 탐색 | `/explore` |

## Admission Evidence

- Baseline: `src/03_sources/SRC060/baseline/accepted-baseline.json`
- Parity: `src/03_sources/SRC060/evidence/parity/accepted-parity.json`
- Authority: `src/03_sources/SRC060/authority/authority.json`
- Adoption test: `tests/five-source-mvp-source60-explore-adoption.test.mjs`

## Notes

- SRC060 rendering: `canvas2d-3d-cluster-projection`, scenario: `moment-cluster-deep-exploration`.
- Mechanical split parity: DOM EQUAL, geometry EQUAL, computed_style EQUAL, runtime_state EQUAL, interactions EQUAL, screenshots BYTE_IDENTICAL_CANONICAL_PIXEL_DIGEST.
- Canvas resize defect (PR #586) fixed: dependency `[] → [loading, error]`. Post-fix render verified at all three viewports.
- PRODUCT_FIDELITY = PASS_WITH_ACCEPTED_ADAPTATION.
- SRC060 defect is CLOSED — no rework or re-audit.
