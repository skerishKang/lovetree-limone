# Track 67 V2.4.2 — Source Forensics (COM2 isolated worker)

> Provenance-anchored record for the Issue #231 Track 67 V2.4 lineage. Generated
> from the verified exact source and the design team's own V2.4.2 package on Drive.
> This is a DESIGN-LAB review artifact, not canonical `/v4` product adoption.

## Authority chain (Google Drive)

- Official Track 67 folder: `67_메모리테이프_인터랙티브롤` (`1mp0zz3MBZl_K6P9Guv3aBWJqvzOKsHL4`)
  - `디자인팀장16기 작업물` revision ladder:
    - `01_V2_GRAYBOX_BASE`
    - `02_V2.1_GRAYBOX_PHYSICS_CORRECTION`
    - `03_V2.2_REAL_TEXTURE_PROOF`
    - `04_V2.3_INTERACTIVE_INSPECTION`
    - `05_V2.4_PERSISTENT_WORLD_WORKS_NAVIGATION` (three same-title builds: 07:58 / 09:19 / 09:41)
    - `06_V2.4.1_WORKS_ARCHIVE_NAV_REFERENCE_FIDELITY` (`1ZpfO70MXaHhnEGI-BNq7EOEI28PGwri7`)
    - `07_V2.4.2_WORKS_COMPARE_MENU` (`12xJFNBvcVDP-zvTjssicd7QoXVyR0tp6QTNa3ulmvghcKKy9`) — **newest**

## Freshness re-check (start-of-task, 2026-08-16 ~23:5x KST)

A newer explicit revision existed beyond the originally-pinned V2.4:

| revision | executable id | bytes | mtime (UTC) | declared sha256 |
|---|---|---|---|---|
| V2.4 (assigned) | `1sLDCD2AGYiNVf15B_M72je8VP1gwUIvG` | 4,918,234 | 09:20:06 | `9d6c91c2…f0e5b46` |
| V2.4 (newer same-title) | `1cPARhRqYl6eLN-H5TXn9vz11A-PzO9IG` | 4,929,831 | 09:41:37 | — |
| V2.4.1 | `1ZRClDlbvgjmsu53FoIZnoEZ7Zk-FtHmz` | 10,497,719 | 14:07:57 | `b54486c5…98fc0e` |
| **V2.4.2** | `18krSKEJ1QLA0bGFBh1MDg5Q261fJ-r5A` | 12,265,511 | 14:29:00 | `85210be6…1f65ae6f` |

- Both V2.4.1 and V2.4.2 are distinct numbered revision packages (own `SHA256SUMS.txt`, `RUNTIME.json`, report, `evidence/`).
- V2.4.2 executable independently re-verified: **12,265,511 B / `85210be6a3368edd8e5e2d55c94721d91cd031c2cabca1c6698ffabf1e65ae6f`** — matches design team's own `V2.4.2_SHA256SUMS.txt`.
- No Track67 V2.5 observed (a `V2.5` search returned only unrelated Track12 `V4.2.5`).
- CTO's last freshness check (13:04Z) predated V2.4.1 (14:07Z) / V2.4.2 (14:29Z). Snapshot was stale.
- Per repo intake rule "newest explicit product-owner/design-lead decision takes precedence", the worker re-pinned to **V2.4.2** and proceeded.

## Rendering classification (from real code)

- `canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: true })` — **RAW_WEBGL2 / CUSTOM_WEBGL**.
- `THREE.` references: **0**. CSS3D: **1** (only a base64 `data:image/png` preview inside a WORKS entry, not a renderer).
- Written as a single self-contained HTML; no external libs.

## Engine mechanics (extracted, bounded)

Confirmed tokens/constants in source:

| symbol | value / meaning |
|---|---|
| `V24_CHUNK_RAW` | 112 — static chunk hard cap |
| `V24_CHUNK_TRIGGER` | 120 — grid distance before a cell promotes to a persistent chunk |
| `V24_GRID_CELL` | 6 — world units per grid cell |
| `ribbonHitTest(px,py)` | screen-ray vs memory ribbon; returns frontmost segment hit |
| `openInspect(hit)` | opens inspection panel for a hit memory |
| `v24StateSnapshot()` | `{pos,dir,spin,travel,rawActive,staticChunks,totalSamples,q}` |
| `travel` / `spin` | persisted camera path state |
| `raw` / `rawQ` / `hist` / `smooth` / `smoothQ` | memory tape + bounded tail buffers |
| Space / Tab | rewind / orbit |
| `WORKS_` | bottom archive bar → current LoveTree tracks |

V2.4.2 report states explicitly: *"V2.4 engine/persistence/texture/inspect/rewind logic is preserved."* Only the WORKS archive comparison set changed.

## WORKS set change (the only behavioral delta vs V2.4)

From `16_V2.4.2_WORKS_COMPARE_MENU_REPORT.md`:

- V2.4.2 menu **removes Track 61 `CONNECTION REVIEW` and Track 60 `MOMENT CLUSTER`** vs the V2.4.1 archive menu.
- V2.4.2 **adds**: Track 62 · V1.1 (`62_기억조각상_원형레일전시.html`), Track 13 MEMORY ATLAS (`04_메모리아틀라스_현재채택_진주360_v4.html`), FILE 01 LIVING VIDEO GRAPH (`01_리빙영상기억그래프_v1.html`).
- Owner-selected V2.4.2 rows: 67(current), 66, 64, 63, 62 V1.0, 62 V1.1, 13, 59, FILE01.

The implementer's assignable HOLD ledger (§11) therefore no longer equals the owner-selected set. This PR surfaces **both** the assignable ledger (HOLD-safe, no fabricated href) and the V2.4.2 owner set (read-only, only ENABLED/INTERNAL_STABLE carry real routes).

## What was implemented (this PR)

- Exact-source asset committed to `public/design-lab-assets/lineages/67/v2-4/…txt` (V2.4.2 bytes/sha256).
- `/design-lab/lineages/67/v2-4/source` — fail-closed exact-source runner (reuses 52 v3 `SourceRunnerFrame`).
- `/design-lab/lineages/67/v2-4/native` — native WebGL2 candidate with bounded mechanics.
- Pure, tested engine core in `lib/lineage-67-v24/` (chunk promotion cap, tail boundedness, q/travel continuity, rewind, frontmost hit).
- `lib/design-lineages.ts` registers Lineage 67 V2.4.2 as a candidate with route `/design-lab/lineages/67/v2-4`.

## Out of scope / HOLD

- Canonical `/v4` adoption (separate decision, HOLD).
- DB / API / Auth / Firebase / Neon / Worker — no changes.
- Production deploy — draft PR only, no Ready/Merge.
