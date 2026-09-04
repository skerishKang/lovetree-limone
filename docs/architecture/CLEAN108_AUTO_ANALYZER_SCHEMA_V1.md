# CLEAN-108 Auto Analyzer + State Recipe Schema v1 (Slice 1)

Standing issue: **#611** · Parent program: **#589** · Branch: `chore/611-auto-analyzer-schema-v1`

This is a deliberately additive slice. It does NOT change the capture,
split, or parity runtime. It does NOT rewire CI. It does NOT touch any
accepted Source capsule.

## Added files

- `src/08_harness/analyze-source-authority.mjs` — read-only CLI. Reads one
  authoritative HTML (+ optional manifest), emits analysis JSON to stdout
  (or `--out`). Never mutates the authority.
- `src/08_harness/auto-analyzer/analyze-html.mjs` — pure analysis core
  (`analyzeAuthorityHtml`). No I/O. No eval. Node built-ins only.
- `src/08_harness/auto-analyzer/validate-state-recipe.mjs` — narrow
  deterministic recipe validator (action fields, hook allowlist,
  global-tolerance prohibition, arbitrary-code rejection). No dependencies.
- `src/08_harness/state-recipe.schema.json` — declarative JSON Schema
  (draft 2020-12) for the recipe shape.
- `src/08_harness/fixtures/analyzer-expectations/SRC056.json|SRC060.json|SRC068.json`
  — narrow pinned expectations for SIMPLE / COMPLEX / DUAL_VARIANT.
- `tests/clean108-analyzer.test.mjs` — 24 static tests. No browser. No
  network. No Drive. Temp-dir output only.

## Analyzer contract (summary)

Output carries `s3Classification` (`AUTO_SPLIT_SUPPORTED` /
`AUTO_SPLIT_REQUIRES_PLUGIN` / `AUTO_SPLIT_HOLD`) with `s3Reasons`,
`candidateStateFamilies` (proposals only, never mandates), and
`disposition.holds` (`UNKNOWN_SOURCE_HOLD`, `UNSUPPORTED_SHAPE_HOLD`,
`UNKNOWN_RUNTIME_HOOK_HOLD`).

Rules: unknown source/shape never falls back to `window.__lt` or any
generic hook — the analyzer reports hooks found and holds when it cannot
interpret them. Large inline data URIs are flagged with a keep-inline
warning, never an extraction recommendation.

## Recipe rules (summary)

Allowed action primitives: `goto, click, fill, select, press, wheel, drag,
scrollTo, seekHook, setPhaseHook, waitForFunction, waitForRuntime,
waitForSelectorState, settle, evaluateHook`. Unknown action ⇒ invalid.
Hook names must be `__`-prefixed (optionally under `window.`) or the
declared dual selector `mediaVariant`; anything else ⇒ `UNKNOWN_HOOK`.
Tolerance lives ONLY in per-recipe `allowedTolerance`
(`geometryEpsPx ≤ 16`, `floatDecimals ≤ 6`, `canonicalHammingMax ≤ 32`,
`screenshot ∈ EXACT|HAMMING|INFO_ONLY`); any `ALL_*`/`GLOBAL_*`/global /
default tolerance key ⇒ `GLOBAL_TOLERANCE` rejection. No `code/script/
eval/shell/command/__proto__/constructor/prototype` keys anywhere.

## Deferred (explicitly NOT in this slice)

Replay-engine extraction, S2/S4 capture refactor, shared browser/server
refactor, plugin-registry migration, materializer/validator behavior
changes, CI wiring, evidence-schema migration, tolerance normalization,
driver rewrites. All HOLD until SRC062 S4 CENTRAL PASS.

## Full design context

See PR #612 docs (standing architecture) and issue #611. This file is a
slice pointer only and intentionally does not duplicate them.
