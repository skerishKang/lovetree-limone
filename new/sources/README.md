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
