# Track 71 V2 — GABE Exact Glass Orbit — GATE A Notes

## Status
- V1: `HOLD / FAILURE COMPARISON ONLY / 수정 금지`
- Current candidate: `V2_GABE_EXACT_GLASS_ORBIT_후보`
- Gate: `GATE A — STATIC EXACTNESS`
- This submission intentionally stops before Gate B/C.

## Primary visual authority
- Reference: `녹화_2026_08_15_20_58_10_135.mp4`
- Representative comparison frame: approximately 18.0 seconds.

## What was matched in Gate A
1. Near-white full-screen editorial background.
2. Small top-left LoveTree wordmark in the visual weight/position corresponding to GABE.
3. Short, bold 3-line LoveTree description block at left-middle.
4. Single black circular CTA at left-bottom.
5. Oversized black editorial typography occupying the middle/right background.
6. Six separate transparent glass/jelly ring/lens objects stacked vertically on the right.
7. Separate keyword labels placed across/inside the glass objects.
8. Blue / orange chromatic edge accents and strong specular glass highlights.
9. The large typography remains visually behind and between the glass group rather than replacing it.

## Gate A implementation scope
- One static 16:9 scene only.
- WebGL2 torus/loop geometry is present for the glass silhouette and specular layer.
- CSS refractive fallback layers preserve the static composition if WebGL is unavailable.
- No idle motion.
- No parallax.
- No video-under-glass.
- No click viewer.
- No ESC behavior.
- No Light/Dark transition.
- No Index/Menu expansion.

Those items are intentionally blocked until explicit GATE A approval.

## Current differences still visible vs reference
- The reference glass objects have stronger true background refraction and more asymmetrical liquid deformation.
- Current V2 Gate A uses six inflated loop forms; exact micro-deformation and optical distortion should be tuned only after static layout approval.
- The LoveTree background words differ from the reference because content is intentionally replaced, while preserving the reference's oversized editorial hierarchy.

## Gate A review question
Does the side-by-side frame read as the same visual family before any additional interaction is implemented?
