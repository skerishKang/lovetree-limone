# CLEAN-108 Automation Operating Model

- Status: **Standing operating document — M1 pilot ACCEPTED, Stage-1 ACTIVE (4-6 workers)**
- Owner lane: **CLEAN-108 / Issue #611**
- Parent program: **#589**
- Fidelity state machine: **#564**
- Initial authority main: `1de4cb00fb0ec48466b4cce56d85ab1847c72d91`
- M1 acceptance / Stage-1 release: **#611 comment 5546112083**

## 1. Purpose

CLEAN-108 is a mechanical preservation program, not a Product rewrite program.

The normal unit pipeline is:

```text
authoritative single HTML
  -> original/original.html
  -> split/index.html
  -> split/styles.css
  -> split/script.js
  -> split/assets/** only when mechanically necessary
  -> original-vs-split parity
```

The purpose of automation is to reduce repetitive discovery/capture/replay work while preserving the strict Source fidelity contract.

Automation must never be used to justify redesign, framework conversion, DOM normalization, Source defect repair, or Product integration.

## 2. Non-negotiable per-unit state order

Every Source/Codex unit remains strictly ordered:

```text
S0 IDENTITY_VERIFIED
-> S1 RAW_AUTHORITY_LOCKED
-> S2 SOURCE_BASELINE_CAPTURED
-> S3 MECHANICAL_PORT_COMPLETE
-> S4 SOURCE_PORT_PARITY_PASS
```

No unit may enter `S(n+1)` while `S(n)` is `FAIL`, `BLOCKED`, `UNKNOWN`, or `CENTRAL_PENDING`.

Parallelism is allowed only **between independent authorized units**, never by skipping states inside a unit.

## 3. Division of labor

### Automation should own

- byte/SHA verification after authority selection
- HTML structural inventory
- inline `<style>` / `<script>` inventory
- data URI / media inventory
- external request inventory
- DOM ID / landmark inventory
- candidate event-surface discovery
- baseline screenshot/measurement capture after a state recipe is approved
- mechanical S3 extraction
- round-trip verification
- original-vs-split replay
- DOM/geometry/computed-style collection
- console/page/request error capture
- evidence manifest generation
- machine parity classification

### Worker/model judgment should own

- interpreting Source-specific runtime behavior
- selecting source-defining states from analyzer candidates
- distinguishing click/tap from drag/swipe behavior
- deciding whether a diff is real, timing noise, environment noise, or expected authority behavior
- proposing the minimum safe split boundary

### CENTRAL should own

- authority release
- final baseline matrix acceptance
- high-risk shared-harness review
- visual parity acceptance
- merge authorization
- concurrency scale-up/scale-down decisions

## 4. Worker topology

### Unit-level workers

Assign one independent worker to one independent Source/Codex unit.

```text
Worker A -> SRCxxx -> dedicated worktree -> dedicated branch
Worker B -> SRCyyy -> dedicated worktree -> dedicated branch
Worker C -> CDXzzz -> dedicated worktree -> dedicated branch
```

Rules:

1. No two workers mutate the same unit concurrently.
2. Every unit gets its own branch/worktree.
3. A worker must not reuse another unit's uncommitted files/evidence.
4. Shared harness changes are never bundled casually into several unit PRs.
5. Draft PR remains the default until CENTRAL review.

### Subagents

Subagents are appropriate for read-only intra-unit analysis:

- HTML/CSS/JS structure inventory
- interaction inventory
- media/asset inventory
- parity-diff analysis

The parent worker remains responsible for the coherent unit state and final report.

## 5. Concurrency policy

Unlimited model availability does not imply unlimited safe concurrency.

### M1 Pilot — CLOSED / ACCEPTED

The M1 pilot is complete and CENTRAL-accepted.

```text
M1 PILOT STATUS = ACCEPTED
CENTRAL decision = #611 comment 5546112083
```

Proof families (materially different units, not merely four Source IDs):

```text
SRC056  SIMPLE          fixed surface, 2 states x 3 viewports, 6 matched pair replays
SRC060  COMPLEX         canvas/graph runtime, 7 states x 3 viewports, 21 matched pair
                        replays, deterministic accepted camera pins, canonical16 digests
SRC068  DUAL_VARIANT    explicit A/B authority, plugin boundary, zero cross-contamination
SRC047  MEDIA/VIEWER    media/viewer runtime, accepted Source-specific screenshot policy,
                        N/A states remain N/A
```

SRC062's accepted capsule exists on main and a supplementary LARGE_INLINE matched
replay proof (PR #627) has since merged; it is **not** a prerequisite for the M1
acceptance recorded here.

### Stage 1 — controlled parallelism = ACTIVE / RELEASED

CENTRAL decision: **#611 comment 5546112083**

```text
Stage 1 = ACTIVE / RELEASED
recommended concurrent independent unit workers = 4-6
```

This means **4-6 unit workers total**, not 4-6 new workers in addition to every existing
lane. Unit lanes already running (for example current S3/S4 lanes) count toward the total.

### Stage 2 — scaled parallelism = NOT RELEASED

```text
Stage 2 = NOT RELEASED
8-12 concurrent unit workers = HOLD
```

Stage 2 may be released only after observed stable operation under Stage 1, including:

- evidence schemas are stable
- CI queue behavior is predictable
- merge-forward collisions remain low
- CENTRAL review backlog is controlled
- no common-harness defect has invalidated multiple units

### Stage 3 — high parallelism

```text
10-20+ concurrent units = NOT RELEASED
```

Stage 3 may be considered only when measured bottlenecks show that the harness is stable and CENTRAL review capacity, not harness correctness, is the remaining constraint.

## 5a. Standard Stage-1 worker contract

Each Stage-1 unit worker must own exactly one unit through one isolated lane:

```text
ONE Source/Codex identity
ONE worktree
ONE branch
ONE worker

S0 -> S1 -> S2 -> S3 -> S4 strictly

Draft PR
then stop
```

CENTRAL owns:

```text
Ready transition
merge
```

A worker does not mark Ready and does not merge its own lane.

Unknown or Source-specific automation limitation => `HOLD`, never improvisation or
harness generalization-by-guess inside a unit lane.

## 5b. Shared harness isolation

```text
Unit lane != shared harness lane
```

A Source worker must not opportunistically modify shared automation while carrying a
unit lane. Shared files include, at minimum:

```text
shared analyzer
shared executor
shared capture
shared comparator
shared workflow
shared schema
```

A shared change requires a separately released, separately reviewed lane authorized by
CENTRAL. Preferred pattern for a new Source:

```text
additive per-source runner/plugin
+
separately reviewed registry/shared-gate update only when genuinely required
```

The following current files are the known high-collision surface. This does **not** mean
every new Source must modify them:

```text
src/08_harness/auto-analyzer/analyze-html.mjs
src/08_harness/state-replay/execute-state-recipe.mjs
src/08_harness/state-replay/validate-executable-state-recipe.mjs
src/08_harness/state-replay/capture-approved-state-recipe.mjs
.github/workflows/src-108-harness-gate.yml
```

Unknown Source structures must fail closed (`HOLD`), not be force-fitted into a generic
path by guessing.

## 6. Scale-down triggers

Immediately reduce concurrency if any of the following occurs:

- one shared harness defect affects multiple active units
- evidence schema changes mid-flight
- repeated branch collisions/main-drift corrections
- CI queue latency prevents timely exact-head review
- CENTRAL cannot inspect evidence before workers begin downstream states
- more than one unit requires an exception to the same governing rule
- automatic parity classifications show false-positive PASS behavior

When in doubt, contain the failure before increasing worker count.

## 7. Authority queue rules

Workers do not choose their own next unit by number.

A unit may enter the queue only when CENTRAL has established at least:

```text
EXACT_ID
KIND = SRC | CDX
authority folder/file provenance
filename
bytes
SHA256
revision/version disposition
variant/duplicate disposition
S1 release state
```

Folder existence alone is not executable authority.

Numeric adjacency such as `SRC068 -> SRC069` is never an authorization rule.

## 8. S2 operating policy

S2 is a **baseline lock**, not a screenshot-collection contest.

A simple Source may need only a small matrix. A complex Source may require many states.

The baseline must cover all source-defining behavior needed to diagnose S3 drift, including as applicable:

- initial state
- selected state
- viewer/modal
- menu/panel
- expanded state
- hover
- wheel travel
- drag travel
- swipe travel
- playback/motion
- media state
- localStorage-dependent state when source-authoritative

The analyzer may propose candidates, but a model/CENTRAL review must approve the required state set before S3.

## 9. S3 operating policy

S3 is mechanical extraction only.

Default transformation:

```text
inline <style> -> styles.css
inline <script> -> script.js
remaining markup -> index.html
```

Asset handling rule:

- preserve inline media in place when externalization is not mechanically required
- relocate assets only when file relocation requires it
- never externalize a large data URI merely to make the split look cleaner

Forbidden:

- React/Next/TS/TSX/JSX conversion
- DOM restructuring
- CSS algorithm rewrite
- responsive redesign
- copy cleanup
- interaction rewrite
- Source bug repair
- canonical Product data substitution

## 10. S4 operating policy

S4 replays the **same approved S2 recipes** against:

```text
A = authority original
B = mechanical split
```

Evidence channels should include:

- matched screenshots
- DOM landmarks
- geometry
- critical computed styles
- runtime state
- media/asset identity
- interaction outcome
- console errors
- page errors
- unexpected request failures

Do not invent a separate, easier S4 journey that was not represented in the original baseline contract.

## 11. High-confidence parity queue

Automation may classify a result as `HIGH_CONFIDENCE_PARITY_CANDIDATE` when all required channels pass.

Typical conditions:

```text
authority bytes locked
roundtrip PASS
approved recipe replay PASS
pixel exact OR documented deterministic tolerance
DOM match
geometry within epsilon
critical styles match
asset/media identity match
interaction outcome match
console errors = 0
page errors = 0
unexpected failed requests = 0
```

This classification reduces CENTRAL review depth; it does **not** replace final acceptance.

## 12. Review queue priorities

CENTRAL review order:

1. shared-harness changes
2. units with Source byte/hash drift
3. parity mismatch/error cases
4. animation/responsive/media ambiguity
5. clean high-confidence candidates

This keeps one harness defect from multiplying across many branches.

## 13. Git operating rules

- GitHub remote = Source of Truth
- fresh main before material decisions
- exact PR head CI required
- no force push
- no destructive reset
- no `git clean`
- normal merge-forward for non-overlapping main drift when required
- no hidden rebase that rewrites worker history
- branch names must include the controlling issue/unit intent

## 14. Shared harness change containment

A shared harness change can affect the entire corpus and therefore requires stronger review than a unit-local evidence change.

Before release, shared changes should prove compatibility against materially different fixture classes:

```text
SIMPLE
COMPLEX_INTERACTION
LARGE_INLINE_MEDIA
CANVAS/GRAPH where relevant
DUAL_VARIANT
```

Unknown Source structures must fail closed.

Already accepted Source capsules must not be mutated just to satisfy a new generic harness.

## 15. Metrics to track before scaling

Track at least:

- median worker time per S1-S4 unit
- manual S2 design time
- automatic state-candidate precision
- S4 false-positive / false-negative count
- CENTRAL review minutes per unit
- CI wait time
- merge-forward collision count
- shared-harness regressions affecting >1 unit
- percentage of units classified high-confidence

Scale worker count only when these metrics support it.

## 16. Current rollout sequence

```text
M1 pilot = COMPLETE / ACCEPTED (#611 comment 5546112083)

Stage 1 (ACTIVE):
  4-6 independent unit workers total
  strict authority queue
  unit-local branches/worktrees
  shared harness changes separately released
  CENTRAL final review

Stage 2:
  NOT RELEASED
  measure Stage-1 stability first
```

Specific Source lanes currently in flight (e.g. SRC069, SRC071 materialization) are
**unit lanes**, not permanent architecture dependencies.

## 17. Related authority

- #611 — automation/concurrency standing issue — remains OPEN as the standing
  automation/concurrency authority; M1 pilot closure is not issue closure
- #589 — CLEAN-108 corpus program
- #564 — Source Porting V2 / fidelity state machine
- #565 — Source Library → Adapter → MVP standing architecture

This document does not authorize Product/MVP work and does not release any specific Source/Codex unit by itself.

## 18. Issue #611 standing status

```text
#611 = standing automation/concurrency authority
AUTO_CLOSE = NO
ISSUE611_CLOSE = NO
```

M1 pilot acceptance and the Stage-1 release do **not** close #611. #611 remains standing
while the CLEAN corpus is active.
