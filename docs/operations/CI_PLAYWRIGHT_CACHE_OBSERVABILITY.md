# Playwright Cache Observability

Parent: #439
Related: #449 / PR #450

## Purpose

Record the measurable contract for the A-track Playwright Chromium cache without changing test coverage or merge semantics.

## Cache identity

- path: `~/.cache/ms-playwright`
- key: `${{ runner.os }}-playwright-1.55.0-chromium`
- PR runs may restore a cache created on the default branch, but a pull-request merge-ref cache is not a cross-PR seed.

## Evidence rule

Do not infer a cache hit from elapsed time. The authoritative evidence is the `actions/cache@v4` job log for the exact PR head:

- hit: `Cache restored from key: ...` / primary-key hit evidence;
- miss: `Cache not found for input keys: ...` followed by browser installation and post-job cache save evidence.

The trusted-main seeder introduced by #450 is intentionally separate from Production and uses no repository checkout or provider secrets.

## Acceptance sequence

1. merge the trusted-main seeder only after exact-head PR CI is green;
2. verify a subsequent real semantic PR restores the exact cache key in A-track;
3. do not create a no-op PR solely to manufacture a cache hit;
4. only after measured restore evidence consider broader browser-workflow cache reuse.

## Safety

This document does not authorize weakening required checks, changing browser inventory, increasing test concurrency, modifying Production, or exposing credentials.
