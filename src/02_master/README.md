# 108 Master Row Workspace

`MST001`–`MST108` are preallocated in `src/01_registry/master-108.registry.json` and materialized here as evaluation/master-row work records from `design-intake/master-design-coverage.json`.

These records are not 108 independent Source implementations. They preserve the legacy master-row identity while keeping Source, Codex, Family, Track, Lineage, and Capability namespaces distinct.

Each record must:

- preserve `legacy_master_id`, `master_filename`, and `product_job` from the authoritative ledger;
- record only explicit evidence-backed typed identity references, or remain `UNRESOLVED`;
- preserve duplicate and superseded relationships from the ledger;
- keep `family_ref` null until a separate evidence-based family allocation;
- never contain a canonical Source/Codex visual runtime.

The canonical form of `identity_refs` is one typed object per element — `{ "namespace", "id", "basis" }` (`MST080`, `MST004`). Bare-string elements are not accepted for new issuances; `MST046` (`"SRC066"`) is retained as a documented legacy exception issued in the `SRC066` S3 lane before this rule was written. Two note keys are defined here at first use: `mapping_target_materialization` records whether an `identity_refs` target capsule exists in the repository (`UNMATERIALIZED` = ledger-backed but no capsule present), and `anchor_decision` records which existing `relation` anchor governs a row's open review state so a superseded or duplicate row is never adjudicated alone.
