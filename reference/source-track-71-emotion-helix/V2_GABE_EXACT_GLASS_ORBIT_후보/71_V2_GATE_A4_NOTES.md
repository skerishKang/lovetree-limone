# Track 71 V2 — GATE A4 Notes

## Authority / status

- Latest MASTER: `설계팀장9기_71_V2_GATE_A3_REJECT_A4_REFERENCE_GLASS_OBJECT_RECONSTRUCTION_2026-08-17.md`
- Primary visual authority: Reference B `녹화_2026_08_15_20_58_10_135.mp4`, 18.0s frame
- Previous status: `GATE A3 = REJECT`
- Current status: `GATE A4 = SUBMITTED FOR STATIC REVIEW`
- `GATE B/C = NOT STARTED`
- V1 = HOLD / failure comparison only

## A4 scope applied

A4 unlocks A2/A3 object silhouette and scale. The left editorial block remains unchanged. The A3 background-sampling direction is retained, but the broad annular ribbon/spiral composition is removed.

### 1. Independent object reconstruction

The candidate now contains **six independent WebGL object instances**. There is no shared helix phase, no continuous path, and no object-to-object ribbon geometry.

Each object owns independent values for:

- center X/Y
- width / height
- rotation
- inner-hole ratio / offset
- smooth bulge/pinch seed
- refraction strength
- local dark-reflection anchors
- local blue/amber/red caustic anchors
- one LoveTree keyword

Candidate full-screen object widths are approximately:

| Object | Screen width | Screen height | Keyword |
|---|---:|---:|---|
| 1 | 25.0% | 17.0% | FIRST |
| 2 | 23.8% | 15.8% | MOMENTS |
| 3 | 21.5% | 14.5% | CONNECTION |
| 4 | 22.0% | 15.5% | REPLAY |
| 5 | 20.5% | 15.8% | MY TREE |
| 6 | 19.0% | 16.8% | RETURN |

The objects deliberately retain white gaps so the cluster reads as six separate lenses instead of one spring/coil.

### 2. Clear-glass alpha discipline

A3's near-opaque face alpha is removed.

- base face alpha: **0.055**
- white-background body: intentionally low presence
- inner/outer rim: stronger Fresnel-like presence
- refraction difference / black typography: local alpha increase
- local dark-reflection blobs: local alpha increase
- final alpha cap: **0.78**, not a global 0.9+ face

No broad white face fill is used.

### 3. Actual background refraction retained

The browser renders the giant typography into the background canvas texture. Each object samples that actual texture in the glass shader using screen-space UV displacement.

Optical power is non-uniform:

- central flat band: weak
- inner rim: strongest
- outer rim: medium
- local bulge: boosted

RGB channels receive slightly different offsets for local chromatic splitting.

### 4. Local optical signature

Uniform RGB outlines are not used. Each object has manual anchors for:

- black reflection/sink blobs
- blue caustic
- amber/orange caustic
- small red burn

These are local, not full-perimeter decorations.

### 5. Surface keyword binding

Each keyword is sampled inside the same glass shader and mapped by **polar surface coordinates** on its own object. The word therefore follows that object's scale/rotation and is clipped by the glass band instead of floating as a separate global label.

## Reference trace board

`71_V2_GATE_A4_OBJECT_TRACE_BOARD.png` is provided before the final comparison to make the silhouette decision explicit:

1. raw Reference B 18.0s frame
2. Reference 1–6 approximate silhouette trace
3. actual A4 browser render with candidate 1–6 bounds

The reference outlines are manual visual traces for silhouette discipline; they are not claimed as automated pixel segmentation.

## Static QA

- Browser viewport: 1920×1080
- WebGL2: active under Chromium / SwiftShader QA environment
- page errors: 0 in final capture
- 25% sanity thumbnail generated locally: six separate objects remain individually readable
- no motion or interaction code was added for Gate B/C

## Explicitly NOT implemented

- idle motion
- cursor parallax
- video-under-glass
- click viewer
- ESC return
- light/dark transition
- menu/index expansion
- auto rotation

## Review state

`GATE A4 = REVIEW REQUIRED`

No PASS is self-declared. Do not proceed to GATE B/C without explicit approval.
