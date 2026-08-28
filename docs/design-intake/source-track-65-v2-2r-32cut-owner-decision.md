# Source Track 65 V2.2R — 32-cut owner-decision overlay

Issue: #236

This document records the approved D2 owner decision without mutating the byte-exact preserved V2.2 Drive source package.

## Authority

The controlling decisions are recorded in Issue #236:

- owner review pass: comment `5378809675`;
- CUT25 exclusion / 32-cut decision: comment `5379785614`;
- successor MASTER + ledger final proposal: comment `5381044215`;
- CTO approval and GATE B authorization: comment `5381064669`.

The approved story spine remains:

`FIRST CLUE -> TRACE -> WATCH -> DISCOVERY -> ARCHIVE -> FINAL LOVETREE`

## Preservation boundary

`old/reference/source-track-65/V9_오너픽전면활용·스토리재정렬_후보/C_ASSET_USAGE_NOTE.md` is a preserved Drive-source object, not a mutable governance ledger.

It remains byte-exact and pinned by:

- Drive ID `1IpnBvtU0oO9KwGnKcIzs3mij-A8vAfXl`;
- SHA-256 `f459ed62ed55361b178303408a31c25ea80aa96138cba5bd70a238a36e00babf`;
- `old/reference/source-track-65/SHA256SUMS`;
- `design-intake/manifests/source-track-65-cinematic-editorial-v2-2.json`.

Therefore the original `C_ASSET_USAGE_NOTE.md` is intentionally left unchanged. Editing that file in place would invalidate the preserved-source fingerprint while retaining the same Drive identity.

## D2 effective configuration

Effective Track65 V2.2R working authority after the owner decision:

- `ACTIVE_CUT_COUNT = 32`
- `CUT25 = EXCLUDED_PENDING_REGENERATION`
- `CUT25_ACTIVE_COVERAGE = EXCLUDED`
- `CUT25_SLOT_NUMBER = RESERVED`
- `CUT25_RENUMBERING = FORBIDDEN`
- `CUT25_CURRENT_REFERENCE_ONLY = subject_interview_left.png / subject_interview_right.png`
- `CUT19 = ACTIVE_DIRECTION / SOURCE_ROLE_VERIFICATION_SEPARATE`
- `GATE_B = AUTHORIZED_TO_PROCEED`
- `MOTION_HTML_RELEASE = BLOCKED_UNTIL_EXPLICIT_GATE_B_PASS`

CUT25 is removed from the active "유지·품질 상승" set. The active maintain/quality-up set is:

`CUT03, CUT07, CUT08, CUT14, CUT16, CUT18, CUT21, CUT23, CUT26, CUT27`

CUT19 is tracked separately as the remaining exceptional source-role item rather than as an ordinary maintain/quality-up cut.

## CUT25 exclusion contract

Reason for exclusion:

- `GEN_SB_INTERVIEW_01` was not found as a generated source object;
- nearest Track65 interview candidates are 1024x1536;
- the only written P0 shot specification requires `SB_03_INTERVIEW_MIC` at 2560 px long edge;
- the owner accepted exclusion instead of silently lowering that quality boundary.

CUT25 may return only after all three conditions are met:

1. a new `SB_03_INTERVIEW_MIC` asset satisfies the 2560 px long-edge P0 specification;
2. Drive ID + byte size + SHA-256 are pinned;
3. the Product Owner explicitly re-approves reinsertion.

Until then, the 32-cut configuration remains authoritative and CUT25 remains a reserved excluded slot.

## Coverage accounting

Governance accounting is:

`32 ACTIVE + 1 EXCLUDED_PENDING_REGENERATION`

The historical 33-row source evidence is retained. No evidence row is deleted and the preserved V2.2 source package is not rewritten to manufacture a new source fingerprint.

## Gate sequence

1. reconcile the remaining CUT19 source-role evidence as required by the approved successor instructions;
2. prepare the 32-state story-locked GATE B storyboard;
3. obtain explicit Product Owner GATE B PASS;
4. only then release motion/executable work;
5. perform exact source/executable fingerprinting and browser QA before any native Design Lab intake.

## Repository / product boundary

This overlay does not:

- allocate repository Lineage65;
- adopt Track65 into canonical `/v4`;
- modify Drive originals;
- release backend, DB, Auth, Firebase, Neon, Worker, or Production work;
- select V16/V2.3 or V18/V2.2.5 as the authoritative executable.

`SOURCE_PINNED_OBJECTS_MUTATED = NO`
`D2_OWNER_DECISION_APPLIED_AS_GOVERNANCE_OVERLAY = YES`
`IMPLEMENTATION_RELEASE = NO_UNTIL_GATE_B_PASS`
