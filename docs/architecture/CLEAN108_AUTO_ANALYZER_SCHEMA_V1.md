# CLEAN-108 Auto Analyzer + State Recipe Schema v1 (Slice 1)

Standing issue: **#611** · Parent program: **#589** · Branch: `chore/611-auto-analyzer-schema-v1`

This is a deliberately additive slice. It does NOT change the capture,
split, or parity runtime. It does NOT rewire CI. It does NOT touch any
accepted Source capsule.

## Added files

- `src/08_harness/analyze-source-authority.mjs` — CLI. Reads one
  authoritative HTML (+ optional manifest) as READ-ONLY inputs, emits
  analysis JSON to stdout (or `--out`). Never mutates the authority.
  The `--out` destination is fail-closed guarded BEFORE any write side
  effect: rejected if it resolves to the input authority, to the manifest,
  or inside `src/03_sources/**` (accepted Source capsule tree). Rejection
  leaves authority/manifest bytes and mtimes untouched, creates no output
  file and no output parent directory.
- `src/08_harness/auto-analyzer/analyze-html.mjs` — pure analysis core
  (`analyzeAuthorityHtml`). No I/O. No eval. Node built-ins only.
- `src/08_harness/auto-analyzer/validate-state-recipe.mjs` — narrow
  deterministic recipe validator (action fields, hook allowlist,
  global-tolerance prohibition, arbitrary-code rejection). No dependencies.
- `src/08_harness/state-recipe.schema.json` — declarative JSON Schema
  (draft 2020-12) for the recipe shape.
- `src/08_harness/fixtures/analyzer-expectations/SRC056.json|SRC060.json|SRC068.json`
  — narrow pinned expectations for SIMPLE / COMPLEX / DUAL_VARIANT.
- `tests/clean108-analyzer.test.mjs` — 36 static tests. No browser. No
  network. No Drive. Temp-dir output only.

## Analyzer contract (summary)

Output carries `s3Classification` (`AUTO_SPLIT_SUPPORTED` /
`AUTO_SPLIT_REQUIRES_PLUGIN` / `AUTO_SPLIT_HOLD`) with `s3Reasons`,
`candidateStateFamilies` (proposals only, never mandates), and
`disposition.holds` (`UNKNOWN_SOURCE_HOLD`, `UNSUPPORTED_SHAPE_HOLD`,
`UNKNOWN_RUNTIME_HOOK_HOLD`, `UNBOUND_RUNTIME_HOOK_HOLD`).

Rules: unknown source/shape never falls back to `window.__lt` or any
generic hook — the analyzer reports hooks found and holds when it cannot
interpret them. Large inline data URIs are flagged with a keep-inline
warning, never an extraction recommendation.

### Discovery vs source-bound trust (CENTRAL Blocker B)

Runtime-hook **discovery** stays informational: `scripts.windowHooks`
reports every exposed window global-looking hook found in the document.

Runtime-hook **trust** is source-bound only — it requires all three of:

```text
SOURCE IDENTITY + EXPECTED HOOK + EXPLICIT REGISTRY
```

and never the mere fact that a global name looks familiar. The v1 registry
(`SOURCE_HOOK_REGISTRY` in `analyze-html.mjs`) is built only from already
verified authorities:

```text
SRC056 -> __lt
SRC060 -> __LT60__, __LT60_V12__
SRC062 -> __track62
SRC064 -> __TRACK64__
SRC068 -> DUAL_VARIANT (no generic runtime-driver trust; AUTO_SPLIT_REQUIRES_PLUGIN
         and HOLD semantics can never be overridden by any hook match)
```

Each analysis carries a machine-readable `runtimeHookBinding` object
(`sourceId`, `discovered`, `expected`, `matched`, `status`) with status
vocabulary:

```text
BOUND                 registered source + expected hook discovered
NO_EXPECTED_HOOK      registered source with no single runtime-driver
                      expectation (e.g. DUAL_VARIANT)
EXPECTED_HOOK_MISSING registered source, expected hook not discovered
UNREGISTERED_SOURCE   sourceId valid but absent from the registry
AMBIGUOUS             document exposes hooks registered to other sources
                      alongside its own
```

Any status other than `BOUND`/`NO_EXPECTED_HOOK` fails closed with
`UNBOUND_RUNTIME_HOOK_HOLD`. A rich interactive Source with no registered
driver never silently falls back to `window.__lt` or any generic global.

## Recipe rules (summary)

Allowed action primitives: `goto, click, fill, select, press, wheel, drag,
scrollTo, seekHook, setPhaseHook, waitForFunction, waitForRuntime,
waitForSelectorState, settle, evaluateHook`. Unknown action ⇒ invalid.
Hook names must be `__`-prefixed (optionally under `window.`) or the
declared dual selector `mediaVariant`; anything else ⇒ `UNKNOWN_HOOK`.
This is a SYNTAX layer only: `SYNTAX VALID` is deliberately distinct from
`SOURCE-BOUND TRUSTED`. Trust is decided exclusively by the analyzer's
`SOURCE_HOOK_REGISTRY` binding; "`__foo` is syntactically valid" never
implies "therefore it is trusted for this Source".
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
