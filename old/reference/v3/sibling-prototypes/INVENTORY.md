# Sibling Prototype Inventory

Byte-identical preservation of the four sibling-created LoveTree V3 archive
prototypes. These files are **reference prototypes, not runtime product
source**. The V3 React archive surface is implemented independently and must
not iframe, inline, or bundle these originals.

## Preservation facts

| File | SHA-256 | Byte size | Line count |
| --- | --- | --- | --- |
| `lovetree-liquid-orbit-video-gallery.html` | `ca96061286d47047b73dee0addf7c4dc09c86def0bae644e49be8422fee8ccbb` | 219,889 | 749 |
| `lovetree-motion-archive-v5-video-click-autoplay.html` | `c4297518897762b5b65063e6b1a6046e482a5964ae5df90fc942df055be1a178` | 41,025 | 753 |
| `lovetree-accordion-album-archive-v3-fixed.html` | `5c02aa02b9c9894a49ce62d919dbfc163a2bc9b802be19eba682be9e46752f77` | 37,054 | 98 |
| `lovetree-folding-person-archive.html` | `762d1bd3d332e22d5d2ebd113c5a2163506a6f80e5696d830408d6712fe06c64` | 88,870 | 734 |

Verification is automated: `tests/v3-motion-archive-integrity.test.mjs` hashes
the actual file bytes with SHA-256 and compares byte size and line count.

## 1. lovetree-liquid-orbit-video-gallery.html

- creator provenance: user's sibling
- transfer path: Telegram handoff
- original filename: `lovetree-liquid-orbit-video-gallery.html`
- byte size: 219,889
- line count: 749
- SHA-256: `ca96061286d47047b73dee0addf7c4dc09c86def0bae644e49be8422fee8ccbb`
- HTML title: `LoveTree · 물결치는 순간의 서가`
- external URL usage: yes (1 occurrence)
- iframe usage: yes (1)
- base64 payload usage: yes (8 `data:image/*;base64` occurrences)
- primary implementation reference: `V3AlbumStage` wave / orbit / free /
  diagonal layout arrangements
- secondary implementation reference: stage card motion and visual rhythm
- status: reference prototype, not runtime source

## 2. lovetree-motion-archive-v5-video-click-autoplay.html

- creator provenance: user's sibling
- transfer path: Telegram handoff
- original filename: `lovetree-motion-archive-v5-video-click-autoplay.html`
- byte size: 41,025
- line count: 753
- SHA-256: `c4297518897762b5b65063e6b1a6046e482a5964ae5df90fc942df055be1a178`
- HTML title: `LoveTree · Motion Archive`
- external URL usage: yes (5 occurrences)
- iframe usage: yes (1)
- base64 payload usage: no
- primary implementation reference: `V3VideoViewer` click-to-play viewer and
  `V3AlbumStage` vinyl/case layout
- secondary implementation reference: shared viewer attribution and interval
  display
- status: reference prototype, not runtime source

## 3. lovetree-accordion-album-archive-v3-fixed.html

- creator provenance: user's sibling
- transfer path: Telegram handoff
- original filename: `lovetree-accordion-album-archive-v3-fixed.html`
- byte size: 37,054
- line count: 98
- SHA-256: `5c02aa02b9c9894a49ce62d919dbfc163a2bc9b802be19eba682be9e46752f77`
- HTML title: `LoveTree · 접히는 마음의 앨범`
- external URL usage: yes (6 occurrences)
- iframe usage: yes (1)
- base64 payload usage: no
- primary implementation reference: `V3AlbumAccordion` expandable tracklist and
  `V3ShelfView` subject shelf spread
- secondary implementation reference: video + memo spread composition
- status: reference prototype, not runtime source

## 4. lovetree-folding-person-archive.html

- creator provenance: user's sibling
- transfer path: Telegram handoff
- original filename: `lovetree-folding-person-archive.html`
- byte size: 88,870
- line count: 734
- SHA-256: `762d1bd3d332e22d5d2ebd113c5a2163506a6f80e5696d830408d6712fe06c64`
- HTML title: `LoveTree · 마음의 앨범 서가`
- external URL usage: yes (1 occurrence)
- iframe usage: yes (1)
- base64 payload usage: yes (4 `data:image/*;base64` occurrences)
- primary implementation reference: `V3AlbumFolding` page-turn interaction
- secondary implementation reference: shelf burst / folding transition emotion
- status: reference prototype, not runtime source

## Scope guard

- Originals live only under `reference/v3/sibling-prototypes/`.
- They are not placed under `public/` and are not exposed as an app route.
- Runtime product code never iframes or inlines these files.
- Unsafe prototype elements (base64 payloads, `autoplay=1`, `scaleY(-1)`,
  placeholder/duplicated video IDs) are preserved here as archival evidence but
  are explicitly blocked from the production scope by architecture tests.
