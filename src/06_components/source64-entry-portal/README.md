# source64-entry-portal

## Component Record

| Field | Value |
|---|---|
| component_key | `source64-entry-portal` |
| source_id | `SRC064` |
| product_role | `ENTRY_PORTAL` |
| canonical_route | `/trees/{treeId}/portal` |
| admission | `PASS` |

## Source Authority

- **Original file**: `src/03_sources/SRC064/original/original.html`
- **Bytes**: 1,565,313
- **SHA256**: `80886540bb8e3148a7336bf9999298897ac0ab921797a6534c89ea0029c6de5d`
- **Revision**: V1.2.1
- **Runtime policy**: `HTML_CSS_JS_MECHANICAL_ONLY`

## Product Implementation

- `app/trees/[id]/portal/page.tsx`
- `app/trees/[id]/portal/portal.module.css`
- `app/components/v4/V4EntryResolver.tsx` (unchanged authority — lives outside Source64)
- `lib/entry-resolver.ts`

## ViewSwitcher Mapping

| kind | label | path |
|---|---|---|
| `portal` | 포털 | `/portal` |

## Admission Evidence

- Baseline: `src/03_sources/SRC064/baseline/accepted-baseline.json`
- Parity: `src/03_sources/SRC064/evidence/parity/accepted-parity.json`
- Authority: `src/03_sources/SRC064/authority/authority.json`
- Adoption test: `tests/five-source-mvp-source64-portal-adoption.test.mjs`

## Notes

- SRC064 rendering: `css3d-dom`, scenario: `entry-onboarding`.
- Mechanical split parity: DOM EQUAL, geometry EQUAL, computed_style EQUAL, runtime_state EQUAL, interactions EQUAL, screenshots BYTE_IDENTICAL.
- Baseline review: DIRECT_CENTRAL_CI_ARTIFACT_REVIEW, workflow run_id=33346967954, card_count=40.
- Portal consumes canonical Tree Moments with `ORBIT_LIMIT=16`; does not invent returning-user ranking or persistence.
- PRODUCT_FIDELITY = PASS_WITH_ACCEPTED_ADAPTATION.
