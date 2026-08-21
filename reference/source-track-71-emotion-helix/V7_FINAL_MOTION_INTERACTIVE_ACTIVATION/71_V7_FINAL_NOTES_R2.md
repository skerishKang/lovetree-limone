# 71_V7_FINAL_NOTES_R2

## Status
- Track: `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`
- Revision: `V7_FINAL_INTERACTIVE_R2`
- Execution owner: LoveTree 디자인팀장 21기
- Existing V1~V7/R1 files are untouched; R2 is a separate corrective candidate.
- Product-owner correction applied: do not reuse the reference-video Jelly silhouette as the LoveTree object itself.

## Core correction
R2 does **not** use:
- the V6 full-screen screenshot,
- segmented V6 Jelly PNGs,
- reference-video Jelly crops,
- `data:image` assets,
- ring / donut / annulus / helix geometry.

R2 rebuilds the right-side cluster as six code-defined LoveTree-specific solid transparent lenses.

## Runtime architecture
- white editorial paper + left LoveTree/copy/CTA = DOM/CSS
- giant PATH / MOMENT / MEMORY / LOVE typography = runtime canvas typography
- six lenses = Canvas2D procedural blob paths, each with unique silhouette/size/rotation/warp parameters
- each lens samples the runtime typography canvas through a separate clipped refraction transform
- optical edge = local clear/black reflection + white specular + blue/amber/red caustic arcs
- surface keyword shares the lens transform

No reference/V6 bitmap is required for rendering.

## Six LoveTree lens families
1. FIRST — wide, shallow beginning lens
2. MOMENTS — compressed irregular memory lens
3. CONNECTION — large directional lens with stronger shear
4. REPLAY — diagonal replay lens
5. MY TREE — thick, more centered bulged lens
6. RETURN — cropped vertical boundary lens

These shapes are newly parameterized for LoveTree and are not traced from the reference silhouettes.

## Pointer interaction
Pointer interaction is local to the lens under the cursor.
- local X drives `rotateY`-like projection
- local Y drives `rotateX`-like projection
- lens projection, internal typography warp, caustic location, and label angle update together
- mouseleave eases back into the lens's independent idle phase
- global page parallax remains weaker than local lens response

Measured Chromium example on CONNECTION lens:
- before hover: approximately `rx 0.2°, ry -4.1°`
- after pointer moved into upper-right area: approximately `rx 4.6°, ry 2.0°`

Exact values vary with idle phase.

## Idle motion
Each lens has its own phase and slow orientation movement. Position is largely anchored; the primary motion is optical orientation rather than floating translation.

## Selection
- click the lens under the pointer to select
- only one selected lens at a time
- ESC clears selection
- no invented route or detailed page is opened

## Accessibility / responsive
- six keyboard-focusable hit targets
- Enter / Space selection
- ESC clear
- actual CTA button
- `prefers-reduced-motion` removes autonomous idle motion while retaining a reduced direct pointer response
- mobile 390×844 horizontal overflow measured as 0

## QA
Chromium runtime checks:
- lens count: 6
- `data:image` count: 0
- pointer hover changes CONNECTION orientation: PASS
- click selected state: PASS
- ESC restore: PASS
- route assigned: false
- mobile horizontal overflow: 0

## Evidence
- `71_V7_FINAL_INTERACTIVE_R2.html`
- `71_V7_FINAL_MOTION_EVIDENCE_R2.mp4`
- `71_V7_FINAL_INTERACTION_EVIDENCE_R2.mp4`
- `71_V7_FINAL_STATIC_SCREEN_R2.png`
- `71_V7_FINAL_NOTES_R2.md`

## Review status
`R2 CORRECTIVE CANDIDATE / PRODUCT OWNER REVIEW REQUIRED`

This note does not declare product-owner PASS.
