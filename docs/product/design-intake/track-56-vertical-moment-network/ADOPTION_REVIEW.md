# track-56-vertical-moment-network — Adoption Review (Issue #163)

- laneScope: PRESERVATION + REGISTRATION VERIFICATION + REVIEW DOCUMENT ONLY — no implementation
- sourceTrackId: Track56 V1.2 (세로형 모먼트관계망 전체조망)
- manifest: `design-intake/manifests/track-56-vertical-moment-network.json` (pre-existing on main — verified, not duplicated)
- classificationVerification: PASS — schema enum `EXISTING_LINEAGE_VARIANT` + productJob/summary disposition text truthfully encodes the issue-confirmed `SCENARIO_VARIANT + LINEAGE_53/CAP-14 EXTENSION EVIDENCE`; `designLineageId=lt-53-emotional-path-replay` retained; no new lineage number allocated or reserved; no manifest edit required
- repositoryLineage56Warning: repository Lineage 56 is Crystal Memory Atelier and must NEVER be routed here
- adoptionDecision: HOLD — `KEYBOARD_ACCESSIBILITY_AND_320_QA_HOLD`; Issue #201 still holds scenario assembly (`CANONICAL_ADOPTION = HOLD / SCENARIO_ASSEMBLY_PENDING`)

## Preservation evidence

- preserved path: `reference/source-track-56-vertical-moment-network/` (22 files, read-only `rclone copy` from the adopted-design Drive mirror `[[지피티 작업]]/[01_러브트리]/03_디자인채택본/56_세로형_모먼트관계망_전체조망`)
- checksum ledger: `reference/source-track-56-vertical-moment-network/SHA256SUMS` (22 entries, self-reference excluded)
- executable identity confirmed: `후보_버전1.2_세로형_모먼트관계망_전체조망.html` = 45,761 B, SHA-256 `1828ef47acefd25f1f2b7cff0a3f58c74aa35e28bf127f41975491dcc156d909`
- provenance contract result: fresh preservation digest **equals** both the manifest pin and the Issue #163 body historical pin — no divergence, no OPEN flag required (contrast: Track55/#162 carries an unresolved dual-fingerprint flag)

## Family comparison — what exists vs what Track56 adds

### Already owned by Lineage 53 Emotional Path Replay (+ CAP-14 contract)

| capability | status on main |
|---|---|
| directed Moment/Connection path replay from a selected Moment | implemented (Lineage 53 local replay) |
| alternating node/edge traversal | implemented |
| traversed memory trail | implemented |
| pause / resume / restart | implemented |
| cycle / broken-link-safe traversal | implemented |
| mobile / reduced-motion / keyboard quality contract | capability-level contract |

Note: CAP-14's reusable prototype (PR #121) is CLOSED / UNMERGED and its shared core is not on current main; do not clone Lineage 53 replay to create a second engine.

### Track56 incremental value — macro comprehension layer before replay

Source state model: `OVERVIEW → ORIGIN_REVEAL → CLUSTER_PATH_OVERVIEW → MOMENT_FOCUS → PATH_PLAYBACK`

| stage | what it adds over existing replay |
|---|---|
| First Moment / ORIGIN_REVEAL | selecting First Moment reveals the 01/02/03 major route families together, including Primary/Secondary branch skeletons while the rest of the graph stays low-opacity context |
| CLUSTER_PATH_OVERVIEW | one route family's entire hierarchy: Entry/Hub, all Primary Paths, Secondary Branches, branch points, bridge to next group, de-emphasized unrelated context |
| MOMENT_FOCUS | selecting one Moment emphasizes the WHOLE Path sequence containing it, not a 1-hop neighborhood |
| PATH_PLAYBACK | `이 경로 끝까지 따라가기`: connection light travel, arrival pulse, persistent trail, faint future preview, multi-Moment continuation, Branch pause/choose/resume in the same replay grammar |

`WHOLE_PATH_OVERVIEW_ALREADY_IMPLEMENTED = NO` on current main. This layer is a **relationship-retrospective Scenario Variant / overview renderer** that may compose with CAP-14 traversal — not a duplicate path-replay engine and not a new Experience Capability.

## PRODUCT_DECISION_REQUIRED items (separated per lane instruction)

1. whether whole-path comprehension is independent enough to warrant splitting out of the Lineage 53 family into its own Lineage — deferred until real user testing proves it;
2. native route adoption of the overview renderer itself (`/design-lab/lineages/53/53-v3-vertical-network-overview` namespace declared in the manifest, nothing implemented) — gated by Issue #201 scenario assembly;
3. Hub/cluster presentation semantics staying VIEW_DERIVED unless a later product decision explicitly promotes a semantic contract.

## Native-adoption preconditions (source gaps, unverified here)

no keyboard event handler exists in the V1.2 source HTML; no complete modal/dialog accessibility evidence; no 320×720 source QA. Native work must add keyboard-accessible Moment/path selection and replay controls, visible focus, accessible current-path state, responsive detail semantics and 320×720 QA before any adoption claim.

## Data boundary

Moment = canonical node; Connection = canonical directed WHY NEXT relation; Path family / Hub / overview grouping = VIEW_DERIVED presentation state only.

## Boundaries observed by this lane

no implementation started; no second replay engine; `scripts/design-fidelity-validation-inventory.mjs` untouched; Drive originals read-only; no lineage number reserved; no direct merge; Draft PR only.
