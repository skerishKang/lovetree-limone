# SRC064 S4 Acceptance

Source: `SRC064`
Generation root: `src/`

## S0–S4 state

```text
S0_IDENTITY_VERIFIED        = PASS
S1_RAW_AUTHORITY_LOCKED     = PASS
S2_SOURCE_BASELINE_CAPTURED = PASS_LOCAL_NATIVE_WSL
S3_MECHANICAL_PORT_COMPLETE = PASS
S4_SOURCE_SPLIT_PARITY      = PASS_LOCAL_NATIVE_WSL
```

## Frozen authority

```text
DRIVE_FOLDER_ID = 1j792x7zyBJtMXm5KYdNNQJgPgatbQlN-
DRIVE_FILE_ID   = 18Q-kviMi4iP0Ns3o30jN6KBkipa1RInl
FILE            = 현재후보.html
REVISION        = V1.2.1
BYTES           = 1565313
SHA256          = 80886540bb8e3148a7336bf9999298897ac0ab921797a6534c89ea0029c6de5d
```

The Drive folder/file tuple is coherent and the frozen original is byte-identical to the intake RAW capsule. No master-row, family, lineage, or relation identity was inferred.

## Mechanical split

The split is produced by exact extraction of the single inline `<style>` and single inline `<script>`:

```text
split/index.html = 5049 B
split/styles.css = 17648 B
split/script.js  = 1542663 B
```

Round-trip reconstruction is byte-identical to `original/original.html`. No HTML restructuring, CSS redesign, JavaScript refactor, framework conversion, product data injection, or product navigation integration was performed.

## Parity evidence

Local artifact:
`/tmp/src-split-parity-evidence-pass-8de2c32/SRC064`

Capture head:
`8de2c3286184ca8fca81af6ec50f8fbd9bd26891`

Driver:
`src/08_harness/source064-driver.mjs`

The source-specific driver uses the frozen Source QA hook `window.__TRACK64__` and compares the original and mechanical split across:

- `WELCOME_IDLE`
- `MOMENT_FOCUS`
- `MOMENT_MEDIA_VIEWER`
- menu open/close interaction
- 40-card source inventory

Reviewed viewports:

- 1280×800
- 390×844
- 320×720

Results for every viewport:

```text
DOM / stable source landmarks       = EQUAL
RUNTIME_STATE                       = EQUAL
INTERACTIONS                        = EQUAL
CANONICAL SCREENSHOT PIXEL DIGEST  = EQUAL
BROWSER_ERRORS                      = 0
```

Dynamic CSS3D card transforms and SVG connection rectangles are not treated as deterministic state fields because the standalone source render loop updates them per frame. Their rendered result is covered by matched canonical screenshot pixel digests; the source-specific driver still checks card identity/class inventory and stable shell/focus/viewer landmarks.

## Boundary

No adapter, product shell, componentization, family allocation, canonical data binding, backend, DB, Auth, API, or Production mutation occurred. SRC064 remains a source calibration runtime only.

This acceptance is local native-WSL evidence. Exact-head CI and central artifact acceptance must be regenerated after the implementation commit is pushed; broad 108 rollout remains held until that gate and calibration review pass.
