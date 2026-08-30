# 108 Master Row Workspace

`MST001`–`MST108` are preallocated in `src/01_registry/master-108.registry.json`.

They are evaluation/master-row identities, not 108 independent Source implementations.

A physical `src/02_master/MSTnnn/record.json` folder is materialized only when that row is actively audited/reconciled. This avoids creating 108 empty directories while preserving all 108 identities machine-readably from day one.

Each materialized record must:

- preserve `legacy_master_id` from `design-intake/master-design-coverage.json`;
- copy the exact master filename/product job from authority;
- record evidence-backed `SRC`/`CDX`/other identity refs or remain `UNRESOLVED`;
- record duplicate/superseded/family relationships without guessing;
- never contain the canonical Source/Codex visual runtime.
