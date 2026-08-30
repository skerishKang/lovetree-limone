# Clean `src/` Generation — Setup Status

Issue: #569
Branch: `architecture/569-src-108-reimplementation-harness`
Base at creation: `1e8853ec3fb4a4c8110af4c440aea038074a382f`

## Current phase

```text
PHASE = SETUP
ACTIVE_REIMPLEMENTATION_ROOT = src/
MASTER_ROW_IDENTITIES = MST001..MST108
MASTER_ROW_COUNT = 108
REAL_SOURCE_RUNTIME_STARTED = NO
REAL_CODEX_RUNTIME_STARTED = NO
MVP_COMPOSITION_STARTED = NO
BROAD_108_ROLLOUT = HOLD
```

## Setup artifacts

- generation / identity / implementation / parity contracts
- namespace registry
- 108 master-row identity registry
- evidence-only identity mapping registry
- five-source calibration registry
- explicit generation-state registry
- MST / Source / Codex / Family templates
- reusable component boundary
- downstream composition boundary
- root layout/identity validator
- exact-head GitHub Actions harness gate

## Next release boundary

Do not start broad corpus implementation from this setup branch. After this setup PR passes exact-head CI and review, the first real calibration change may create `src/03_sources/SRC056/` using a fresh Drive authority tuple and frozen `original/original.html`.

A materially different second replay must pass without changing the governing rules before broad 108 rollout.
