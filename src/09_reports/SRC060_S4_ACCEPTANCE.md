# SRC060 S4 Acceptance

Source: `SRC060`
Generation root: `src/`

## S0–S4 state

```text
S0_IDENTITY_VERIFIED        = PASS
S1_RAW_AUTHORITY_LOCKED     = PASS
S2_SOURCE_BASELINE_CAPTURED = PASS_CENTRAL_LOCAL_CAPTURE_plus_DRIVE_QA_REVIEW
S3_MECHANICAL_PORT_COMPLETE = PASS_CENTRAL_EXACT_HEAD_CI_MATERIALIZED
S4_SOURCE_SPLIT_PARITY      = PASS_CENTRAL_EXACT_HEAD_CI_VALIDATED
```

## Frozen authority

```text
DRIVE_FOLDER_ID = 1SuDA9qtZiz6lETg9MAgpmeWd16IolUAm
DRIVE_FILE_ID   = 1Pu6hSbIfW9X70jJCtRTs0WQyWaZvy_3M
FILE            = ★_현재후보_Track60_V1.2_REAL_NAVIGATION.html
REVISION        = V1.2
BYTES           = 55260
SHA256          = c35b66fb46b57958f7f52c7506ce20e467302f4bcf43b55001428d5d525a7fdf
```

The Drive folder/file tuple is coherent and the frozen original is byte-identical to the intake RAW capsule (PR #553). Git blob bytes and a fresh rclone Drive download were hashed independently and both matched the locked authority. No master-row, family, lineage, or relation identity was inferred.

## Mechanical split

SRC060 carries one inline `<style>` and exactly two inline `<script>` blocks. The split is produced by exact extraction of all three blocks with the inter-block gap preserved and reconnected by minimum glue (`<link>` + two `<script src>`):

```text
split/index.html = 5608 B
split/styles.css = 15565 B
split/script.js  = 34115 B
```

Round-trip reconstruction is byte-identical to `original/original.html` (validator-enforced). The split candidates were materialized by the central harness (`SRC 108 Reimplementation Harness Gate` run `33402000509` at head `29a8e9b82ba8e7f5083ec248f8b75cd34a236791`) and adopted byte-identically. No HTML restructuring, CSS redesign, JavaScript refactor, framework conversion, product data injection, or product navigation integration was performed.

## Baseline evidence

The accepted baseline was captured centrally with the SRC060 driver and reviewed against the Drive QA artifact:

```text
review_method    = DIRECT_SOURCE_QA_ARTIFACT_REVIEW_PLUS_CENTRAL_LOCAL_CAPTURE
captured_head    = 50121b2219620240ae29e2690a712989311cb857
local_summary    = 0d1e49310573155e72dc7930e983cf2a6489585bfa294751b320060c4b7ce9b0
drive_qa_summary = fea230422a7939fa1ac930a4bf49435a08424fcdaa63464cad60cd06e6697a8a
```

## Exact-head parity evidence

Parity was captured by `SRC 108 Reimplementation Harness Gate` run `33404553174` at exact head `a4073bd8680d78f47acbf49174e259a9e4aa126b`:

```text
artifact = src-split-parity-a4073bd8680d78f47acbf49174e259a9e4aa126b
path     = /tmp/src-split-parity-evidence/SRC060
summary  = 51879cb7e9c482579ea9bb1d00df2ceb2d5be5a9404fd81bcb58e695ba8ac749
```

The source-specific driver uses the frozen Source QA hooks `window.__LT60__` / `window.__LT60_V12__` and compares the original and mechanical split across:

- `UNIVERSE_IDLE`
- `CLUSTER_FOCUS`
- `NODE_SELECT`
- `MOMENT_VIEWER`
- `BOOK_HANDOFF`
- `CONNECTION_HANDOFF`
- `PATH_PREVIEW`

plus hover/focus/search/bridge-toggle/reset interactions.

Reviewed viewports:

- 1440×900
- 430×932
- 390×844

Results for every viewport:

```text
DOM / geometry / computed style / runtime state = EQUAL
INTERACTIONS                                    = EQUAL
CANONICAL SCREENSHOT PIXEL DIGEST               = EQUAL
BROWSER_ERRORS                                  = 0
```

Determinism controls: `reducedMotion:'reduce'`, exact camera pinning after focus animations, 450ms CSS-transition settle + toast clear + 2 rAF before every capture, and a canonical 16×16 downsample pixel digest (the source's `backdrop-filter: blur()` compositing is ±1-channel nondeterministic by design; raw PNGs are retained as evidence).

## Source-native defect boundary

The pre-first-frame `nearestHit()` pointer TypeError is a source-native defect and is preserved unrepaired. The harness applies an identical readiness gate (`__LT60__ && __LT60_V12__ && clusterProjection(0) != null`) to both variants so the defect is neither exercised nor repaired inside parity.

## Boundary

No adapter, product shell, componentization, family allocation, canonical data binding, backend, DB, Auth, API, or Production mutation occurred as part of the SRC060 source implementation. SRC060 remains a source calibration runtime only. Next authorized stage: `MVP_COMPOSITION_CANDIDATE`.
