# Identity Contract

Authority: #80, #527, #569

## Canonical namespaces

| Prefix | Meaning | Rule |
|---|---|---|
| `MST` | one row of the 108-result master corpus | exactly `MST001`–`MST108` for the current corpus |
| `SRC` | sibling/Drive Source provenance family | source number is immutable; gaps stay gaps |
| `CDX` | Codex provenance/design family | never renumber into Source slots |
| `FAM` | normalized design family | allocated only after evidence-based reconciliation |
| `TRK` | runtime/development Track | compatibility/runtime identity only |
| `LIN` | repository Lineage | separate product/runtime classification |
| `CAP` | capability identity | separate semantic/product classification |

## Hard rule

```text
SAME_NUMBER != SAME_ENTITY
```

Examples already known in the repository include Source56 vs Lineage56, Source57 vs Lineage57, and Source58 vs Lineage58. No script or worker may infer identity from numeric equality.

## 108 master row rule

`MSTnnn` initially preserves only the master-row identity corresponding to `design-intake/master-design-coverage.json` `master_id=n`. It does not pre-allocate a Source, Codex or Family identity.

Permitted mapping states:

- `UNRESOLVED`
- `SOURCE_RESOLVED`
- `CODEX_RESOLVED`
- `OTHER_RESOLVED`
- `DUPLICATE_FAMILY`
- `SUPERSEDED`
- `HOLD`

Any `SRC`/`CDX`/`FAM` reference must come from authority evidence, not filename parsing alone.
