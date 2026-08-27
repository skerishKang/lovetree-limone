# Source Library

## Identity

`new/sources/` = authoritative source library, independent of product version.

Source Capsules here are the canonical reference for frontend implementation.

## Structure (per source)

```
new/sources/SRC058/
├── SRC058-00-manifest.json
├── SRC058-01-raw/
│   └── SRC058-01-01-original.html
├── SRC058-02-runtime/
│   ├── SRC058-02-01-index.html
│   ├── SRC058-02-02-styles.css
│   └── SRC058-02-03-app.js
├── SRC058-03-evidence/
└── SRC058-04-tests/
```

## Rules

- Source Capsules are framework-independent plain JS
- RAW ORIGINAL is immutable
- Source adapter is NOT inside Source authority
- Source does not know about Product/React/Backend
- One Source Capsule per local worker (no cross-capsule edits)

## Namespace

Source identity uses the `SRC` prefix within the fixed namespace `SRC / TRK / LIN / CDX / CAP / MST / FAM`. Equal numbers across prefixes imply **no** relation (`SRC058 != TRK058 != LIN058`). The 108 evaluation corpus is `MST001`–`MST108`, **not** `SRC001`–`SRC108`.

## Parallel Intake

Intake follows central allocation. A `CAPSULE_ID` is allocated first and the exact path handed to a worker; the worker modifies only `new/sources/<PREALLOCATED_CAPSULE_ID>/**`. Workers must not self-allocate IDs or edit the global registry, standards, versions, or other capsules.

Currently only the Five-Source set is preallocated:

```
SRC056
SRC057
SRC058
SRC060
SRC064
```

No full 108 Source allocation is assumed in advance.
