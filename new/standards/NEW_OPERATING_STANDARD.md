# NEW Operating Standard

> Established: 2026-08-28
> Authority: Integration CTO review via PR #547

---

## Core Principle

```
PRESERVE FIRST
CONNECT SECOND
REFACTOR LAST
```

## Authority Rules

1. **Authoritative executable is normative** — the original HTML/CSS/JS source is the single source of truth
2. **HTML/CSS/JS exact preservation** — DOM structure, CSS, JS behavior preserved exactly
3. **React/Next/TSX conversion not required** — default is framework-independent plain JS
4. **Backend/API/Auth/DB shared and unchanged** — `SHARED_BACKEND_CONTRACT = MANDATORY`
5. **Source library and Product Version are separate axes** — `SOURCE_REVISION ≠ PRODUCT_VERSION`
6. **No early common UI refactor** — preserve first, connect second, refactor last

## Zero Mutation

```
BACKEND_MUTATION = NO
DB_MUTATION = NO
AUTH_MUTATION = NO
API_SEMANTIC_MUTATION = NO
```

## SHARED_CORE_BRIDGE_LIB Policy

```
SHARED_BACKEND_CONTRACT = MANDATORY
  All generations consume the same canonical HTTP API.

SHARED_CORE_BRIDGE_LIB = OPTIONAL HOST/SHELL REUSE
  React/TS bridge files may be reused by NEW shell/host,
  but source capsules do NOT depend on them.

SOURCE CAPSULE = FRAMEWORK-INDEPENDENT PLAIN JS
  Uses canonical HTTP API directly via plain JS adapter.
  Auth/Tree/Moment context via NEW shell/host bridge.
```

## Proving Namespace

NEW uses `/new/...` as its proving namespace.

Product route connection happens only after source parity is proven.

## Existing Fidelity Issues

Issues #539, #540, #541–#545: `HOLD_PENDING_NEW_FRONTEND_GENERATION`
