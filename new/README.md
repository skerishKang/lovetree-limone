# NEW — Next Frontend Generation

## Identity

`NEW` = the next generation of LoveTree frontend, built on source-faithful implementation.

## Structure

```
new/
├── sources/          — Authoritative source library (product-version independent)
├── versions/         — Product versions that compose sources
│   └── v1/           — LoveTree product version 1
│       ├── manifest/
│       ├── adapters/
│       ├── shell/
│       ├── routes/
│       ├── navigation/
│       └── shared/
└── standards/        — Operating standards and conventions
```

## Identity Namespace

```
SRC / TRK / LIN / CDX / CAP / MST / FAM
```

Equal numbers across prefixes imply **no** relation (`SRC058 != TRK058 != LIN058`). The 108 evaluation corpus is `MST001`–`MST108`, **not** `SRC001`–`SRC108`. Only the Five-Source set is preallocated: `SRC056/SRC057/SRC058/SRC060/SRC064`.

## Key Principle

**SOURCE_REVISION ≠ PRODUCT_VERSION**

- Source Capsules have their own revision (SRC058 V1.2)
- Product Versions reference sources (NEW V1 = SRC064 + SRC057 + SRC056 + SRC060 + SRC058)
- These are separate axes — never conflated

## Authority

- Backend/API/Auth/DB: shared with OLD (see `core/FRONTEND_BACKEND_BOUNDARY.md`)
- Source library: independent of product version
- Product version: composes sources via adapters/shell/routes
