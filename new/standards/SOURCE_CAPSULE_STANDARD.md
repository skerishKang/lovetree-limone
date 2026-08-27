# Source Capsule Standard

> Established: 2026-08-28
> Authority: Integration CTO review via PR #547

---

## Identity Prefix System

Source identity uses prefix to prevent number collision:

| Prefix | Meaning | Example |
|--------|---------|---------|
| `SRC` | Source | SRC058 |
| `TRK` | Track | TRK058 |
| `LIN` | Lineage | LIN058 |
| `CDX` | Codex | CDX058 |
| `CAP` | Capability | CAP058 |

Plain numeric directories are **forbidden**. `SRC058`, `TRK058`, `LIN058` are distinct identities.

## Capsule Layer Structure

```
XX000/
├── XX000-00-manifest.json    — Capsule manifest
├── XX000-01-raw/             — RAW original (immutable)
├── XX000-02-runtime/         — Runtime implementation
├── XX000-03-evidence/        — Visual/interaction evidence
└── XX000-04-tests/           — Capsule tests
```

## File Naming Convention

Files inherit parent identity:

```
SRC058-01-01-original.html       — RAW original (immutable)
SRC058-02-01-index.html          — Runtime entry
SRC058-02-02-styles.css          — Extracted CSS
SRC058-02-03-app.js              — Extracted JS
SRC058-03-01-visual-evidence.png — Evidence
SRC058-04-01-parity.test.js      — Test
```

## Revision System

```
CAPSULE_ID = SRC058
SOURCE_REVISION = V1.2          (capsule's own revision)
PORT_REVISION = YYYYMMDD-NN     (port adaptation revision)
PRODUCT_VERSION = V1            (which product version references this)
```

- `SOURCE_REVISION` tracks capsule changes
- `PORT_REVISION` tracks port/adaptation changes
- `PRODUCT_VERSION` tracks product composition
- These are **separate axes** — never conflated

## RAW Original Rules

- RAW ORIGINAL is **immutable** once created
- Never modify `XX000-01-raw/` contents
- Evidence of original source is preserved exactly
- Hash/checksum recommended for verification

## Capsule Independence

- One Source Capsule per local worker
- Worker owns only its capsule directory
- No cross-capsule file edits
- No global index edits from capsule workers
- No standards edits from capsule workers
- No versions edits from capsule workers

## Parallel Work Rule (108-Source Ready)

```
Worker A: new/sources/SRC001/** only
Worker B: new/sources/SRC002/** only
...
Worker N: new/sources/SRC108/** only
```

Full index/registry is generated centrally as a manifest.
