# 71_V6_A6_DESIGN_TOOL_SURFACE_NOTES

## Authority / status
- Latest MASTER: `설계팀장9기_71_V6_A6_REFERENCE_MATCH_DESIGN_TOOL_SURFACE_PROOF_2026-08-17.md`
- Track: `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`
- Folder: `V6_A6_REFERENCE_MATCH_DESIGN_TOOL_SURFACE_PROOF`
- V5 Pair Proof = REJECT
- V6 = DESIGN-TOOL SURFACE PROOF ONLY
- PASS is not self-declared.

## Scope lock
Implemented only a static design-tool surface authority proof.

Not started:
- full HTML
- WebGL shader integration
- 6-lens full composition
- motion
- parallax
- video-under-jelly
- click interaction
- light/dark transition
- GATE B
- GATE C

## Method change from V5
V5 attempted to move Reference trace data directly into a web-style optical renderer. V6 stops that loop.

V6 uses a static 2D compositing / mesh-warp workflow:
1. Reference crop is treated as visual authority.
2. Candidate typography is laid out separately.
3. Each lens silhouette is manually traced as a non-generic path.
4. Candidate typography is mesh-warped inside that traced surface.
5. Optical thickness is built with primary + secondary refraction, not white body fill.
6. Dark reflection is added as narrow surface/edge-attached zones.
7. Blue / amber / tiny red caustic positions are placed from the Reference distribution.
8. The clear center remains background-dominant.

## J1 — DESIGN-TOOL J1
Reference target:
- wide diagonal clear lens
- strong PATH deformation
- thin double glass edge
- local dark optical reflection
- blue / amber local power

Candidate treatment:
- wide traced diagonal surface
- center X magnification + directional bend
- smooth secondary sample near edge
- no milky body fill

## J2 — DESIGN-TOOL J2
Reference target:
- flattened transparent lens
- internal compression
- strong left/right optical power
- black reflection subordinate to clear lens

Candidate treatment:
- flattened traced surface
- continuous Y compression / local shear
- transparent center preserved
- edge-attached dark reflection instead of black mask fill

## J3 — DESIGN-TOOL J3
Reference target:
- oblique bulged lens
- stronger optical mass than a thin oval outline
- center distortion + sharp local edge effects

Candidate treatment:
- tall oblique traced surface
- center magnification / diagonal shear
- local amber / blue / tiny red optical accents
- no gray/frosted body mass

## Current submission
Required files only:
1. `71_V6_A6_DESIGN_TOOL_PAIR_PROOF.png`
2. `71_V6_A6_DESIGN_TOOL_SURFACE_NOTES.md`

No export maps are submitted before visual approval.

## Gate
Current state:
`V6 DESIGN-TOOL PAIR PROOF = SUBMITTED FOR REVIEW`

If and only if V6 is explicitly approved, the next implementation folder is:
`V7_A6_WEB_IMPLEMENTATION_FROM_APPROVED_SURFACE_MAP`
