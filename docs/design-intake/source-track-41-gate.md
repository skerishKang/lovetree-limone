# Source Track 41 — 메모리포켓 (Memory Pocket) Source Gate Record

Issue: #289 · Refs: #80 #236
Classification basis: `UNKNOWN — PENDING` (no instruction/design-lead document in source folder)
Manifest: `design-intake/manifests/source-track-41-memory-pocket.json`
Provenance: `reference/source-track-41-memory-pocket/` (+ `SHA256SUMS`)

## Design authority

```text
SOURCE_FOLDER      = [[지피티 작업]]/[01_러브트리]/03_디자인채택본/41_메모리포켓
                     (Drive folder 15JiCHcDiPivnKh2uOkqbHaWsPGDxTVQ7)
CURRENT_REVISION   = UNVERSIONED_DRIVE_SNAPSHOT_2026-08-06 (files last modified 2026-08-06)
INSTRUCTION_DOC    = NOT FOUND — no 작업지시/design-lead decision in the folder
CLASSIFICATION     = PENDING per Design Ops #80 intake rules
LINEAGE41          = HOLD (no repository lineage number allocated)
ADOPTION           = HOLD (IMPLEMENTATION_RELEASE=NO; CANONICAL_V4_ADOPTION=NO)
PRODUCTION SOURCE  = DO NOT MODIFY (Drive originals read-only)
```

Observed source surface: single-file interactive HTML `LoveTree · Memory Pocket`
(Korean-language memory pocket interaction: video memory viewer with frame zoom/shrink,
next-scene capture, MEMORY RECEIPT tear-off, card shuffle) plus a screen recording,
an original reference footage clip and one auto-generated preview image.

## Preservation record (fresh hashes, observed 2026-08-21)

| File | Bytes | SHA-256 | Drive ID | Status |
|---|---|---|---|---|
| 01_메모리포켓_상호작용.html | 37,622 | `ba0a31f96f2acdcf0bfd99543189af89c6b7417c3cad998196c7ba410484645a` | `1J_d-ZZ4K8AsprhTj9sMHgRPmyqv77N7u` | PINNED |
| 02_녹화영상_메모리포켓.mp4 | 16,737,211 | `2857a497ef316f6460b7100ed8eb714bd159b2bb4d963fdd01ba933a853037e1` | `1ciVUTrLVYhYqaNwA-mUxXmlLJcu9W6Xe` | PENDING (지문만) |
| 03_참고영상_메모리포켓_원본.mp4 | 12,270,217 | `ed15fe35e68563d272cc5140f7c423bfde828035f0a2878fcd41b3fc1e95f4bc` | `1YeZlf3AqsLm9BM4Ec0YHAbriRRe71L1K` | PENDING (지문만) |
| 10_이미지/90_자동생성_대표미리보기.png | 426,887 | `848d67fdb7fc091397c952f606a5eb2975a9147dfa4ac42f39c8ea911cf3706e` | `1CerLU3DWRmBeFnou1_9WjqknSHxRcqWV` | PINNED |

All 4 files observed in the Drive folder were copied byte-exact with
`rclone copy --transfers 2`; `SHA256SUMS` pins the preserved set. Since Issue #328
the two video byte streams are removed from the repository under the no-video-bytes
guardrail (≈29MB freed); their fingerprints above (bytes + SHA-256 + Drive ID) and
the `SHA256SUMS` entries stay recorded — the bytes remain on read-only Drive originals.

## Historical pin (Drive-side history)

`docs/design/source-families/living-media-sphere/history/pre-242-numeric-identity-manifest.json`
(`track68MediaInventory.videos[44]`) records:

```text
original name = 41_메모리포켓.mp4
bytes         = 16,737,211
sha256        = 2857a497ef316f6460b7100ed8eb714bd159b2bb4d963fdd01ba933a853037e1
driveId       = 1AQlKhixP9tWrW0eZwbAxVGT8IQyXladQ
```

Comparison against the fresh preservation: bytes and SHA-256 match exactly → both the
fresh hash and the historical pin are recorded; **no OPEN mismatch flag is raised**.
The Drive object id differs (`1AQl…adQ` → `1ciVUTrLVYhYqaNwA-mUxXmlLJcu9W6Xe`) and the
file is now named `02_녹화영상_메모리포켓.mp4`: a content-identical rename/re-upload,
recorded as provenance observation only.

## Open gates

| Gate | State | Blocking condition |
|---|---|---|
| Classification basis | PENDING | instruction/design-lead decision document missing from source folder |
| Lineage number | HOLD | requires closed classification + design-lead decision (#80) |
| Adoption / V4 placement | HOLD | requires closed classification |
| Native intake | NOT STARTED | full sequence below |

Correct sequence (per #80 continuous-intake rules):

```text
instruction/design-lead classification decision
→ lineage-number review (explicit allocation only)
→ adoption decision
→ only then: source QA → exact fingerprint → repository native intake/proving
```

## Repository disposition

```text
SOURCE_TRACK_41_INTAKE      = RECORDED (preservation gate complete)
PRESERVED_EVIDENCE          = reference/source-track-41-memory-pocket/ (2 files + SHA256SUMS;
                              video bytes removed in #328, fingerprints retained)
LINEAGE41_RESERVATION       = HOLD (no repository lineage number allocated)
CANONICAL_V4_ADOPTION       = NO
BACKEND_SCOPE               = NONE (no DB/API/Auth/Firebase/Neon/Worker work implied)
IMPLEMENTATION_RELEASE      = NO
```

Registration-only lane: implementation start, inventory-file contact, lineage-number
reservation and Drive-original modification are forbidden for Issue #289.
