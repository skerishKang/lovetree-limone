# LoveTree Clean Reimplementation Root (`src/`)

Issue: #569

This directory is the active clean implementation generation for rebuilding the full LoveTree 108-result corpus. It is intentionally separate from historical `old/`, the previous reset attempt under `new/`, and existing product/runtime history.

## Identity model

- `MST001`–`MST108`: the 108 master/evaluation rows.
- `SRCxxx`: Source provenance/design-family identity.
- `CDXxxx`: Codex provenance/design-family identity.
- `FAMxxx`: normalized family identity allocated only from evidence.
- `TRKxxx`, `LINxxx`, `CAPxxx`: separate runtime/product namespaces.

Numeric equality across namespaces never implies identity.

## Layout

```text
src/
├─ 00_governance/     clean-generation contracts
├─ 01_registry/       machine-readable namespace + corpus registries
├─ 02_master/         per-MST audit/work records (not source runtime)
├─ 03_sources/        Source authority/original/mechanical split capsules
├─ 04_codex/          Codex authority/original/mechanical split capsules
├─ 05_families/       normalized family records
├─ 06_components/     parity-approved reusable implementation components
├─ 07_compositions/   later MVP/product compositions
├─ 08_harness/        intake/split/parity/browser/evidence tooling
└─ 09_reports/        generation-level reports
```

## Non-negotiable boundaries

1. Frozen source/Codex originals are authority, not implementation output.
2. Mechanical HTML/CSS/JS/assets decomposition precedes product adaptation.
3. Bulk React/Next/TSX conversion is forbidden during source-port calibration.
4. `MST001`–`MST108` are not 108 independent Source families.
5. Existing `old/`/`new/` visual runtime is reference/recovery evidence only unless explicitly revalidated and imported.
6. No source implementation starts until the root registry/templates/harness validator pass.

## First calibration batch

The fixed selected batch remains `SRC064`, `SRC058`, `SRC057`, `SRC056`, `SRC060`. The first mechanical calibration target is `SRC056`; the remaining replay order is decided only after the first calibration result.
