# 108 Master Row Workspace

`MST001`–`MST108` are preallocated in `src/01_registry/master-108.registry.json` and materialized here as evaluation/master-row work records from `design-intake/master-design-coverage.json`.

These records are not 108 independent Source implementations. They preserve the legacy master-row identity while keeping Source, Codex, Family, Track, Lineage, and Capability namespaces distinct.

Each record must:

- preserve `legacy_master_id`, `master_filename`, and `product_job` from the authoritative ledger;
- record only explicit evidence-backed typed identity references, or remain `UNRESOLVED`;
- preserve duplicate and superseded relationships from the ledger;
- keep `family_ref` null until a separate evidence-based family allocation;
- never contain a canonical Source/Codex visual runtime.
