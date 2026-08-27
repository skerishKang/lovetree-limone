# NEW/V1 — Source-Faithful Frontend Generation

## Identity

`NEW/V1` = the next generation of LoveTree frontend, built on exact HTML/CSS/JS source preservation.

## Created

2026-08-28

## Principle

**SOURCE SURFACE + THIN ADAPTER + EXISTING BACKEND**

NEW/V1 implements frontend from authoritative HTML/CSS/JS sources:

1. Preserve HTML DOM structure exactly
2. Extract inline CSS → `styles.css`
3. Extract inline JS → `app.js`
4. Preserve relative asset paths
5. Preserve behavior
6. Bridge to canonical backend via thin adapter

## What Does NOT Happen Here

- React/Next/TSX conversion is NOT required for source implementation
- React migration is only done in a separately approved migration step
- Backend is not modified
- Database is not modified
- Auth is not modified

## Directory Structure

```
new/v1/
├── README.md          — This file
├── VERSION.md         — Generation metadata
├── sources/           — Source-faithful implementations
│   └── .gitkeep
├── adapters/          — Backend bridge adapters
│   └── .gitkeep
├── shell/             — Shell/wrapper infrastructure
│   └── .gitkeep
└── shared/            — Shared utilities for NEW generation
    └── .gitkeep
```

## Source Implementation Structure

When a source is implemented:

```
new/v1/sources/source-58/
├── index.html
├── styles.css
├── app.js
├── source-manifest.json
└── README.md
```

## Entry Strategy

NEW/V1 uses a proving namespace: `/new/v1/...`

Product route connection happens only after source parity is proven.

## Authority

- Backend: shared with OLD generation (see `core/FRONTEND_BACKEND_BOUNDARY.md`)
- DB: existing LoveTree DB
- Auth: existing Firebase Auth
- No second canonical writer created
