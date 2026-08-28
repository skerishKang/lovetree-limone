# Source Capsule Standard

> Established: 2026-08-28
> Authority: Integration CTO review via PR #547
> Status: NAMESPACE + MANIFEST SCHEMA CLOSURE

---

## Identity Prefix System

Identity prefixes are fixed and authoritative. They prevent number collision across identity kinds:

| Prefix | Meaning | Example |
|--------|---------|---------|
| `SRC` | Source | SRC058 |
| `TRK` | Track | TRK058 |
| `LIN` | Lineage | LIN058 |
| `CDX` | Codex | CDX058 |
| `CAP` | Capability | CAP058 |
| `MST` | 108 evaluation / master row | MST007 |
| `FAM` | normalized unique family | FAM042 |

Plain numeric directories are **forbidden**. `SRC058`, `TRK058`, `LIN058` are distinct identities.

### Numbers Never Imply Relation

An equal number across prefixes implies **no** relationship. Relationships are declared **only** through the explicit `RELATIONS[]` array in the manifest.

```
SRC058 != TRK058 != LIN058
CDX008 != LIN008
MST007 != SRC007 != FAM007
```

Do not infer `SRC` → `TRK` → `LIN` → `CDX` → `CAP` membership, or `MST`/`FAM` linkage, from a shared number.

### Compound Identity Grammar

`NUMBER` is a **string**, not necessarily an integer. Variant identities are permitted:

```
CDX012-1
CDX012-2
CDX012-3
```

In the manifest, a compound identity is decomposed:

```json
{
  "IDENTITY_TOKEN": "12-1",
  "BASE_NUMBER": 12,
  "VARIANT_TOKEN": "1"
}
```

- `IDENTITY_TOKEN` is the canonical raw token string
- `BASE_NUMBER` is the integer base component (may be absent for slug identities)
- `VARIANT_TOKEN` is the optional variant suffix (may be absent)

Never assume a single integer can fully represent an identity.

### Capability Identity

`CAP` numbers are **never** derived from Source/Track numbers. Capabilities use either:

- independent central allocation, e.g. `CAP001`, or
- a stable slug, e.g. `CAP-continuous-exhibition-rail`

Do not auto-derive a `CAP` from a `SRC`/`TRK` number.

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

Compound identities may appear in file names using the `BASE-VARIANT` token, e.g. `CDX012-1-...`.

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

## RAW Authority Hard Gate

RAW is the authoritative executable/file. Preservation of the exact original is **mandatory**, not recommended:

- `RAW_BYTES` — exact byte count of the authoritative raw file (mandatory)
- `RAW_SHA256` — exact SHA-256 of the authoritative raw file (mandatory)

When a raw file is actually replicated, the exact bytes and exact SHA-256 **must** be recorded. Hash/checksum is no longer "recommended" — it is a hard gate.

## RAW_MODE

Every manifest must declare one of two modes:

```
RAW_MODE = EXACT_COPY
```

`EXACT_COPY`: the raw file is small/suitable enough to preserve in Git as an exact copy.

```
RAW_MODE = AUTHORITY_POINTER
```

`AUTHORITY_POINTER`: large binary/media or a large inline payload makes full Git replication impractical; preserve an authority pointer instead.

Even under `AUTHORITY_POINTER`, the manifest must still record:

- Drive folder/file ID
- bytes
- SHA256
- MIME type
- authority captured timestamp

## Large Asset Policy

Never judge asset size by file extension alone. A `.html` file may embed large inline payloads:

```
data:image/...;base64
data:video/...;base64
```

Policy:

- `TEXTUAL` + `SIZE_REASONABLE` + `NO_HUGE_EMBEDDED_PAYLOAD` → `EXACT_COPY`
- `LARGE_FILE` or `LARGE_INLINE_PAYLOAD` → `AUTHORITY_POINTER` first

Never commit a large blob to Git first and delete it later.

## ASSETS Schema

`ASSETS` is **not** a plain string array. Each asset is an object:

```json
{
  "PATH": "assets/hero.png",
  "ROLE": "image-hero",
  "MIME_TYPE": "image/png",
  "BYTES": 123456,
  "SHA256": "...",
  "DRIVE_FILE_ID": "...",
  "INTAKE_MODE": "EXACT_COPY | AUTHORITY_POINTER"
}
```

## Inline Payload Metadata

Inline payloads are not recorded as simple YES/NO. Support at least:

```json
{
  "INLINE_CSS":  { "present": true,  "count": 1, "encoded_bytes": 0, "decoded_bytes": 0 },
  "INLINE_JS":   { "present": true,  "count": 2, "encoded_bytes": 0, "decoded_bytes": 0 },
  "INLINE_MEDIA":{ "present": true,  "count": 3, "encoded_bytes": 204800, "decoded_bytes": 153600 }
}
```

Fields:
- `present` — whether inline content of that kind exists
- `count` — number of inline occurrences
- `encoded_bytes` — encoded (base64) payload size
- `decoded_bytes` — decoded payload size

These fields allow judgment of large embedded payloads.

## Manifest Canonical Schema

A capsule manifest **must** follow this canonical schema:

```json
{
  "MANIFEST_SCHEMA_VERSION": "1.0",
  "CAPSULE_ID": "SRC058",
  "TYPE": "SOURCE_CAPSULE",

  "IDENTITY_TOKEN": "58",
  "BASE_NUMBER": 58,
  "VARIANT_TOKEN": null,

  "TITLE": "...",

  "IDENTITY_SCOPE": "...",
  "IDENTITY_ORIGIN": "...",
  "LEGACY_IDENTIFIERS": [],

  "AUTHORITY_SYSTEM": "...",
  "AUTHORITY_CAPTURED_AT": "...",

  "AUTHORITATIVE_FOLDER": "...",
  "AUTHORITATIVE_FILE": "...",
  "SOURCE_REVISION": "...",

  "SOURCE_BYTES": 0,
  "SOURCE_SHA256": "...",
  "RAW_BYTES": 0,
  "RAW_SHA256": "...",
  "RAW_MODE": "EXACT_COPY | AUTHORITY_POINTER",

  "DRIVE_FOLDER_ID": "...",
  "DRIVE_FILE_ID": "...",
  "ORIGINAL_LOCATION": "...",

  "MIME_TYPE": "...",
  "ENTRY_FILE": "...",

  "RAW_FILES": [],
  "ASSETS": [],
  "EXTERNAL_DEPENDENCIES": [],

  "RELATIONS": [],

  "MASTER_ROW_IDS": [],
  "NORMALIZED_FAMILY_ID": "...",

  "RIGHTS_STATUS": "...",
  "THIRD_PARTY_PROVENANCE": "...",

  "WORKFLOW_STATUS": {
    "RAW_STATUS": "...",
    "SPLIT_STATUS": "...",
    "PARITY_STATUS": "...",
    "PRODUCT_USAGE": "..."
  }
}
```

Field notes:

- `IDENTITY_SCOPE` / `IDENTITY_ORIGIN` / `LEGACY_IDENTIFIERS` — provenance of the identity (see Track Collision Policy)
- `DRIVE_FOLDER_ID` / `DRIVE_FILE_ID` — split, not a single pointer
- `SOURCE_BYTES` / `SOURCE_SHA256` and `RAW_BYTES` / `RAW_SHA256` — both recorded; RAW pair is mandatory for the authoritative file
- `RAW_FILES` / `ASSETS` — structured arrays, not plain strings
- `MASTER_ROW_IDS` — MST evaluation row references (independent allocation)
- `NORMALIZED_FAMILY_ID` — FAM reference (independent allocation)

## RELATIONS[]

Relationships are declared as an array of `{ relation, target }` objects. Targets use the supported namespaces:

```
SRC  TRK  LIN  CDX  CAP  MST  FAM
```

```json
{
  "RELATIONS": [
    { "relation": "TRACKED_BY",     "target": "TRK058" },
    { "relation": "NORMALIZES_TO",  "target": "FAM042" },
    { "relation": "EVALUATED_BY",   "target": "MST007" }
  ]
}
```

Relationships are **never** inferred from numbers — only from this array.

## Track Collision Policy

`TRK` prefixes historically collide across scopes:

- Drive Track17 ≠ historical GitHub Track17
- Drive Track18 ≠ other Track18
- historical Track68 ≠ current Source Track68

Therefore every manifest must carry:

- `IDENTITY_SCOPE`
- `IDENTITY_ORIGIN`
- `LEGACY_IDENTIFIERS`

A worker/consumer must **not** infer a TRK identity from a number alone. New canonical TRK allocations are issued **only** by the central allocator.

## WORKFLOW_STATUS

Mutable workflow state is kept out of the provenance/identity section and grouped under `WORKFLOW_STATUS`:

- `RAW_STATUS`
- `SPLIT_STATUS`
- `PARITY_STATUS`
- `PRODUCT_USAGE`

These are mutable workflow fields and must not be conflated with immutable provenance identity.

## Capsule Independence

- One Source Capsule per local worker
- Worker owns only its capsule directory
- No cross-capsule file edits
- No global index edits from capsule workers
- No standards edits from capsule workers
- No versions edits from capsule workers

## Parallel Intake Rule (Central Allocation)

Parallel intake requires a **central allocator**, never self-allocation:

```
CENTRAL_ALLOCATOR
  → CAPSULE_ID allocated first
  → exact capsule path handed to each worker

Worker W:
  new/sources/<PREALLOCATED_CAPSULE_ID>/**
  only
```

Workers are **forbidden** from:

- self-allocating identities
- modifying the global registry
- modifying standards
- modifying versions
- modifying any capsule other than their own

Global registry/index is a **central aggregation**, not a worker responsibility.

### Five-Source Calibration Preallocation

Only the following Source capsules are preallocated for the Five-Source calibration. No full 108 allocation is assumed in advance:

```
SRC056
SRC057
SRC058
SRC060
SRC064
```

The 108 evaluation corpus is defined separately as master rows `MST001`–`MST108`. `SRC001`–`SRC108` are **not** the 108-corpus model; `MST` (evaluation row identity) and `SRC` (source authority identity) are different entities.
