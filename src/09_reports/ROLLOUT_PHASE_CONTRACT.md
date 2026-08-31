# Issue #569 Rollout Phase Contract

This report records the governance-only phase extension and the subsequent Source mechanical-port release. It does not add a Source capsule.

## Defined phases

```text
SETUP → CALIBRATION → ROLLOUT
```

- `SETUP`: governance and registry preparation; no active Source/Codex/Family runtime.
- `CALIBRATION`: first calibration plus materially different replay in the fixed five-source batch; `broad_108_rollout_released=false`.
- `ROLLOUT`: authorized Source mechanical-port expansion beyond the fixed batch; requires `active_root=src/`, `real_source_runtime_started=true`, and `broad_108_rollout_released=true`.

## Shared Source contract

Both `CALIBRATION` and `ROLLOUT` use the same shared validator for:

- fresh authority tuple and locked authority metadata;
- frozen original byte/hash identity;
- ordered boolean stages `S0 → S1 → S2 → S3 → S4`;
- accepted baseline and accepted parity evidence;
- mechanical split integrity and zero browser errors;
- no TypeScript/TSX/JSX in split surfaces.

Only the Source membership scope differs: `CALIBRATION` is fixed-batch constrained, while `ROLLOUT` accepts any valid active `SRCxxx` capsule.

## Downstream boundary

This contract releases no Codex runtime, FAM/Lineage allocation, componentization, product adoption/composition, or backend/API/DB/Auth work. Source rollout does not imply any of those phases.

The registry is now `phase=ROLLOUT` with `broad_108_rollout_released=true`; this release enables Source mechanical-port intake only. The release does not imply Codex, Family, component, product, or backend phases.
