# 108-Corpus Reimplementation Harness

The harness is the reusable implementation factory for the full corpus, not a five-source-only script collection.

## Responsibilities

- intake: bind master rows to evidence without guessing identity;
- authority: freeze exact Source/Codex executable metadata and hashes;
- split: mechanically decompose standalone HTML into HTML/CSS/JS/assets;
- parity: compare frozen source A to split runtime B;
- browser: capture matched viewports/states and interaction outcomes;
- evidence: bind screenshots/measurements/hashes to exact revisions;
- registry: prevent namespace collisions and duplicate implicit identities;
- composition: allow only parity-approved components downstream.

## Phase contract

The harness supports the explicit generation sequence:

```text
SETUP → CALIBRATION → ROLLOUT
```

The first calibration is SRC056. A materially different second source (candidate SRC064 or SRC058) must pass without changing the governing rules before the governing review can authorize `ROLLOUT`.

`CALIBRATION` validates only the fixed five-source batch. `ROLLOUT` validates any active `SRCxxx` capsule, but reuses the same shared authority, frozen-original, S-stage ordering, baseline, mechanical split, parity, browser-error, and split-surface TypeScript/JSX prohibition checks. A fresh Source authority tuple is required for every capsule.

The workflow runs the same fail-closed Source baseline and parity stages in both `CALIBRATION` and `ROLLOUT`; phase conditions must never silently skip those checks.

`ROLLOUT` is Source-only. It does not release Codex, FAM, Lineage, componentization, product adoption/composition, or backend/API/DB/Auth work.

## Setup slice

#569 establishes the directory/registry/template/validator layer only. No real Source or Codex runtime belongs in this setup slice.
