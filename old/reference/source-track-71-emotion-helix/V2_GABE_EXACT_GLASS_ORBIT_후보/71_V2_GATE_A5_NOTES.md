# Track 71 V2 — GATE A5 Notes

Status: `SUBMITTED FOR REVIEW`

Authority: latest A5 MASTER. GATE B/C not started.

## Definition reset
A5 discards the previous hollow-object interpretation. The right-side objects are now implemented as **solid transparent Jelly Lenses / Glass Blobs with no center cutout**.

## Shape proof self-check
The three proof objects use the same filled-blob shader as the full candidate.

- center cutout: 0
- solid transparent center: yes
- center background sampling/refraction: yes
- stronger optical power near the perimeter: yes
- local white highlight: yes
- local dark reflection patches: yes
- local blue / amber / red caustics: yes

Shape Proof was used as an internal prerequisite before composing the full static screen. This is not a GATE A5 PASS declaration.

## Full static candidate
Six independent filled Jelly Lens instances are placed in the right cluster. The left editorial block and giant typography direction remain from the approved static structure.

Each lens has independent center, size, rotation, shape asymmetry, refraction strength, dark reflection anchors, chromatic caustic anchors, and keyword.

The center is a refractive transparent surface, not empty space. The background texture is sampled inside the entire filled blob; refraction is weaker in the center and stronger near the optical edge/local bulges.

## Rendering method
- WebGL2 2.5D plane per lens
- filled asymmetric blob SDF mask
- actual background typography texture sampling
- RGB-offset refraction
- clear center with low visual body presence
- edge-biased optical effects
- no global white fill
- no motion, video, click, viewer, parallax, theme transition, or menu/index expansion

## Browser capture
Candidate screenshots were captured from the actual browser render at 1920×1080 using Chromium/WebGL2 with SwiftShader in the current QA environment.

## Files
1. `71_V2_GATE_A5_JELLY_SHAPE_PROOF.png`
2. `71_V2_GATE_A5_REFERENCE_COMPARISON.png`
3. `71_V2_GATE_A5.html`
4. `71_V2_GATE_A5_NOTES.md`

## Gate state
`GATE A5 = SUBMITTED FOR REVIEW`

`GATE B/C = NOT STARTED`
