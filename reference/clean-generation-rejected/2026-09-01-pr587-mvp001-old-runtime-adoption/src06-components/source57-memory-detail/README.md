# source57-memory-detail

## Component Record

| Field | Value |
|---|---|
| component_key | `source57-memory-detail` |
| source_id | `SRC057` |
| product_role | `MEMORY_DETAIL` |
| canonical_route | `/trees/{treeId}` |
| admission | `PASS` |

## Source Authority

- **Original file**: `src/03_sources/SRC057/original/original.html`
- **Bytes**: 676,320
- **SHA256**: `ca30cdb430067a0649c9f3ee61c148f0b6e606220a9c05ba806ae0afffa66ace`
- **Revision**: V1.3
- **Runtime policy**: `HTML_CSS_JS_MECHANICAL_ONLY`

## Product Implementation

- `app/trees/[id]/page.tsx`
- `app/styles/mvp-source57-moment-language.css`
- `app/components/MomentDetailModal.tsx`
- `app/components/MomentComposerModal.tsx`
- `app/components/MomentThumbnail.tsx`

## ViewSwitcher Mapping

| kind | label | path |
|---|---|---|
| `tree` | 기억 | `` (root) |

## Admission Evidence

- Baseline: `src/03_sources/SRC057/baseline/accepted-baseline.json`
- Parity: `src/03_sources/SRC057/evidence/parity/accepted-parity.json`
- Authority: `src/03_sources/SRC057/authority/authority.json`
- Acceptance report: `src/03_sources/SRC057/reports/acceptance.json`
- Adoption test: `tests/five-source-mvp-source57-presentation-adoption.test.mjs`

## Notes

- SRC057 rendering: `dom-css-2.5d`, scenario: `relationship-retrospective`.
- Mechanical split parity: DOM EQUAL, geometry EQUAL_FOR_STABLE_SOURCE_LANDMARKS, computed_style EQUAL_FOR_STABLE_SOURCE_LANDMARKS, runtime_state EQUAL, interactions EQUAL, screenshots BYTE_IDENTICAL_CANONICAL_PIXEL_DIGEST.
- Adoption status: HOLD (mechanical parity only; no React/TSX conversion, product integration, FAM allocation, componentization, or adapter claimed).
- Identity collision boundary: current generation namespace `src`, historical namespace `new` (DEPRECATED_SUPERSEDED_GENERATION_CLAIM).
