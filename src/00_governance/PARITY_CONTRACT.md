# Source Parity Contract

A frozen source executable (A) and its mechanical split runtime (B) must be compared before any adapter/component/product work.

## Minimum viewports

- 1280×800
- 390×844
- 320×720

## Required comparisons

- DOM landmarks and element count/identity for source-defining nodes
- critical computed styles
- bounding rectangles / geometry
- z-index / stacking context
- overflow / clipping
- assets and media identity
- animation timing/state transitions
- click/hover/keyboard outcomes that exist in the source
- source-defining modal/selected/expanded/motion states
- matched screenshots from the same viewport/state

## Verdict

```text
A_B_PARITY = PASS | FAIL | BLOCKED | UNKNOWN
```

`PASS` requires evidence, not merely successful build/CI or generated screenshots.

If A and B differ because the split changed source semantics, fix the split. Do not modify the frozen original to make it match B.

Any intentional delta requires a separately owner-authorized exception record. No exception may be silently inferred from a perceived defect or aesthetic preference.
