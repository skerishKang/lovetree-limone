# CLEAN-108 Automation Operating Model

Status: **Standing operating document**  
Owner lane: **CLEAN-108 / Issue #611**  
Parent program: **#589**  
Fidelity state machine: **#564**  
Initial authority main: `1de4cb00fb0ec48466b4cce56d85ab1847c72d91`

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

### Pilot

Complete SRC062 and use the accumulated regression families to refine the common analyzer/replay harness.

### Stage 1 — controlled parallelism

Release **4-6 concurrent units** only after the common harness has passed at least 3 materially different units without changing governing rules.

### Stage 2 — scaled parallelism

Release **8-12 concurrent units** only after:

- evidence schemas are stable
- CI queue behavior is predictable
- merge-forward collisions remain low
- CENTRAL review backlog is controlled
- no common-harness defect has invalidated multiple units

### Stage 3 — high parallelism

10-20+ concurrent units may be used only when measured bottlenecks show that the harness is stable and CENTRAL review capacity, not harness correctness, is the remaining constraint.

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
1. Complete SRC062 under strict current process.
2. Extract reusable state-recipe/analyzer lessons.
3. Strengthen common Auto Analyzer + S2/S3/S4 replay harness.
4. Replay against at least 3-5 materially different units/fixtures.
5. Demonstrate no governing-rule exceptions.
6. Release 4-6 independent workers.
7. Scale to 8-12 only after stable operation.
```

## 17. Related authority

- #611 — automation/concurrency standing issue
- #589 — CLEAN-108 corpus program
- #564 — Source Porting V2 / fidelity state machine
- #565 — Source Library → Adapter → MVP standing architecture

This document does not authorize Product/MVP work and does not release any specific Source/Codex unit by itself.
