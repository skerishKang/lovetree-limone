# Track 72 — GATE A2 Asset Ledger

**Gate:** A2 / Heterogeneous Real Media Recomposition  
**Scope:** first desktop viewport static composition only  
**Rule:** no new image generation, no GATE B/C functionality

| Tile | Source folder | Original filename | Type | Original ratio | Rendered ratio / preservation | Grid span | Selected currentTime | Reuse |
|---|---|---|---|---|---|---|---:|---:|
| A2-01 | `결과물` | `65_입덕단서_시네마틱에디토리얼.mp4` | ACTUAL VIDEO / editorial collage | 1920×1080 · 16:9 | media 16:9 preserved with `object-fit: contain`; tile surface ≈1.82:1 | 5 col × 11 row | 69.77s | 1 |
| A2-02 | `02_디자인팀/캐릭터/캐릭터-사물` | `crystal-awake-02.png` | OBJECT / crystal | 627×627 · 1:1 | 1:1 media preserved with contain; tile ≈0.98:1 | 2 col × 8 row | — | 1 |
| A2-03 | `02_디자인팀/캐릭터/캐릭터-전신` | `01_stage-singing.png` | FULL BODY / performance | 862×1825 · 0.472:1 | native portrait preserved with contain; tile ≈0.480:1 | 2 col × 16 row | — | 1 |
| A2-04 | DOM | `Moment Note` | MEMO / typography | n/a | narrow text surface ≈0.63:1 | 1 col × 6 row | — | 1 |
| A2-05 | `02_디자인팀/캐릭터/캐릭터-러브트리` | `S10_MY_LOVETREE_1536w.jpg` | LOVETREE PRODUCT / GRAPHIC | 1536×2553 · 0.602:1 | native portrait preserved with contain; tile ≈0.594:1 | 2 col × 13 row | — | 1 |
| A2-06 | `02_디자인팀/캐릭터/캐릭터-사물` | `petal-runner-open-v3.png` | OBJECT / vehicle sculpture | 627×627 · 1:1 | 1:1 media preserved with contain; tile ≈0.98:1 | 2 col × 8 row | — | 1 |
| A2-07 | `결과물` | `67_메모리테이프_인터랙티브롤.mp4` | ACTUAL VIDEO / spatial object | 1920×1080 · 16:9 | media 16:9 preserved; tile ≈1.784:1 | 4 col × 9 row | 11.40s | 1 |
| A2-08 | `02_디자인팀/캐릭터/캐릭터-러브트리` | `04_lovetree-sculpture.png` | LOVETREE / sculpture | 1024×1536 · 2:3 | native 2:3 media preserved with contain; tile ≈0.645:1 | 2 col × 12 row | — | 1 |
| A2-09 | `결과물` | `52_글로벌모먼트오빗_3D네트워크.mp4` | ACTUAL VIDEO / network scene | 1920×1080 · 16:9 | media 16:9 preserved; tile ≈1.784:1 | 4 col × 9 row | 8.36s | 1 |
| A2-10 | `02_디자인팀/캐릭터/캐릭터-전신` | `02_dance.png` | FULL BODY / movement | 862×1825 · 0.472:1 | native portrait preserved with contain; tile ≈0.480:1 | 2 col × 16 row | — | 1 |
| A2-11 | `결과물` | `59_메모리스케치북_페이지여정.mp4` | ACTUAL VIDEO / product UI | 1920×1080 · 16:9 | media 16:9 preserved; tile ≈1.784:1 | 4 col × 9 row | 11.01s | 1 |
| A2-12 | DOM | `Connection Landmark` | CONNECTION / typography | n/a | wide text surface ≈3.34:1 | 4 col × 5 row | — | 1 |

## First viewport hard-gate count

- Actual MP4 video: **4**
- Full-body / scene character: **2**
- Object / artifact: **2**
- LoveTree product / graphic: **2**
- DOM memo / connection typography: **2**
- Face close-up tile: **0**
- Total distinct visible surfaces: **12**

## Video-frame evidence

Each video tile uses the real MP4 as its `<video src>` and records a curated `data-time`. A poster generated from that exact source/time is included only as deterministic static-Gate fallback; the HTML also seeks to the same `currentTime` and pauses. No autoplay or hover playback is implemented.
