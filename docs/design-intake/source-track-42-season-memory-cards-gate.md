# Source Track 42 — 시즌기억카드 캐러셀 Gate Record

Issue: #296 · Refs: #80 · pattern: #236/#287
Classification: `ENTRY_MATERIAL + SEASON_MEMORY_BROWSING + SOURCE_FIDELITY_REPRODUCTION`
Manifest: `design-intake/manifests/source-track-42-season-memory-cards.json`
Preservation: `old/reference/source-track-42-season-memory-cards/` (33 files, 20,421,344 B, byte-exact)

## Source identity

Drive 채택본 `42_시즌기억카드_캐러셀` (folder `1_adBcKGug3pSwzZFx0H3eGXWGOIPGTdZ`) — an
independent new candidate built under a 1:1 reference-video reproduction contract
(`40_문서자료/01_제작실행계약.txt`): reproduce the external reference carousel's card size,
spatial ratios, pagination, travel direction, transition speed and camera zoom while substituting
LoveTree season-memory content. Existing adopted sources were not modified by the sibling.

## Preservation

- Full folder copied byte-exact into `old/reference/source-track-42-season-memory-cards/`
  (33 files / 20,421,344 B; largest single file 7,458,409 B — inside the 50 MB total /
  10 MB per-file commit caps; nothing reduced to index-only).
- `SHA256SUMS.txt` pins all 33 files.
- Key fingerprints:
  - executable `01_시즌기억카드_캐러셀.html` — 1,860,576 B,
    SHA256 `50579074ae80ade743b2bc606ad00f6ae0f76ce9a9aaf192ee1f347b51e7c18f`
  - reference video `03_참고영상_시즌기억카드_원본.mp4` — 7,458,409 B,
    SHA256 `9e583079c1befb3867e40883aa9a250dc59159a14cda1fda5ae1c760ac25c73d`

## Gate state

```text
SOURCE_TRACK_42_INTAKE   = RECORDED
LIFECYCLE                = EXECUTABLE_AVAILABLE (source truth, dom-2d)
LINEAGE_RESERVATION      = HOLD (no repository lineage number allocated)
ADOPTION                 = HOLD (CANONICAL_V4_ADOPTION = NO)
BACKEND_SCOPE            = NONE
IMPLEMENTATION           = FORBIDDEN at this gate (Issue #296)
```

Open items before any adoption decision:

1. Rights/provenance of the external X-post reference video is not established by the sibling package.
2. Sibling QA (`04_참고자료/validation-results.json`) covers the sibling's own run only — no
   repository-side fidelity, reduced-motion, keyboard/manual-takeover or overflow gate has run.
3. Product-shell placement (capability vs lineage) is a later owner decision per Design Ops #80.

## Rules

- Drive originals are read-only reference; product code never executes sibling source HTML/JS.
- Native implementation must not start from this gate registration.
