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

## Key Principle

**SOURCE_REVISION ≠ PRODUCT_VERSION**

- Source Capsules have their own revision (SRC058 V1.2)
- Product Versions reference sources (NEW V1 = SRC064 + SRC057 + SRC056 + SRC060 + SRC058)
- These are separate axes — never conflated

## Authority

- Backend/API/Auth/DB: shared with OLD (see `core/FRONTEND_BACKEND_BOUNDARY.md`)
- Source library: independent of product version
- Product version: composes sources via adapters/shell/routes
