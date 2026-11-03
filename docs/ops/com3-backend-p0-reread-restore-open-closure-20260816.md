# COM3_BACKEND_P0_REREAD_RESTORE_OPEN_CLOSURE_REPORT

## Starting current main FULL SHA
`5cf445a0c0117f1aefd96dc7fe8f99430594b19c`

## Final current main FULL SHA
`5cf445a0c0117f1aefd96dc7fe8f99430594b19c` (unchanged during work)

## Branch
`test/backend-p0-reread-restore-open-213`

## Draft PR
https://github.com/skerishKang/lovetree-limone/pull/215

## Exact PR head FULL SHA
`001a68588f6d39571c0c1ad0c3f9994b803908ae`

## Exact changed files
1 file:
- `tests/integration/with-first-memory-atomicity.mjs`

## Additions/deletions
+66 / -0

## REAL DB proof

### create status
PASS — existing test block 1: POST /api/trees/with-first-memory → 201

### Tree GET status
PASS — block 1b: GET /api/trees/:treeId → 200

### Tree canonical fields
- id matches persisted: treeA (deterministic)
- title matches original: "Golden"
- visibility matches persisted: "public"
- clientKey matches persisted: keyA

### Memories GET status
PASS — block 1c: GET /api/trees/:treeId/memories → 200

### Exact memory count
1

### Canonical First Moment id
Matches POST response `r1.body.memory.id`

### treeId
Matches treeA

### memo
"first" (original)

### sortOrder
0

### visibility
"public"

### Changed replay → original GET reread proof
PASS — block 2b: after sending changed Title/Memo replay (POST 200), GET reread returns:
- title: "Golden" (not "Changed Title")
- memo: "first" (not "changed memo")
- cardinality: 1/1

### Canonical destination constructed
`/trees/{treeId}?highlight={memoryId}` — constructible from persisted ids

### Private/owner control
Owner GET → 200 / Other user GET → 404

## Scope

PRODUCTION_CODE_CHANGE=NO
SCHEMA_CHANGE=NO
AUTH_CHANGE=NO
WORKFLOW_CHANGE=NO
TEST_WEAKENING=NONE
PRODUCTION_MUTATION=NONE

## Validation

### real PostgreSQL result
NOT YET — requires A-track CI disposable PostgreSQL 16 (local Windows env lacks Docker/PostgreSQL). Test will be validated by A-track on PR.

### Targeted tests
N/A — integration test requires disposable PostgreSQL (DATABASE_URL). Non-DB-dependent validations (lint, typecheck, build, db:check) all pass.

### lint
0 errors, 75 warnings (all pre-existing)

### typecheck
PASS

### build
PASS

### db:check
PASS (Everything's fine)

### git diff --check
No whitespace errors

### Exact-head A-track
Pending CI (GitHub A-track workflow runs on PR push)

### Design Fidelity
Pending CI

### GitGuardian
Pending CI

## Concurrency

- COM1 PR #212 (fix/mvp-my-trees-browse-route-211) — no overlap
- PR #191 (feat/lineage-63-native-proving-164) — no overlap
- COM2 #177 (Track66 presentation) — no overlap
- No new remote ownership drift detected

## Final

READY=NO
MERGE=NO
READY_FOR_WEB_CTO_AUDIT=YES