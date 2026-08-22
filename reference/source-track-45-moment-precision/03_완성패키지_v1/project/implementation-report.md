# LoveTree Moment Polish Lab v1 — Implementation Report

## Deliverable

`lovetree-moment-polish-lab-v1.html` is a standalone HTML/CSS/JavaScript candidate. It does not modify, import or iframe any existing LoveTree screen.

## Product role

The lab stores presentation settings only. It is intentionally downstream of Moment saving and implements the principle **Save first. Polish later.**

## Structure

- Black full-browser stage
- 810 × 1048 design artboard, scaled to fit desktop viewports
- Black hero with cue strip, progress line and outlined `12`
- Apply bar for `Felix · Season 03 · Shared Course`
- 3 × 4 desktop principle grid
- 2-column mobile grid; principles 10–12 expand to full width
- Compact footer reinforcing the product principle

## Twelve working principles

1. Nested Radius — toggles coherent and intentionally mismatched inner radii.
2. Emotional Focus — moves the play glyph by a subtle optical correction.
3. Thumbnail Depth — switches among no outline, tinted outline and pure white outline.
4. Soft Memory Depth — compares a rigid border with layered shadow depth.
5. Easy to Revisit — exposes the 44px interaction target around small icons.
6. Stable Time — continuously changes counts and switches between proportional and tabular figures.
7. Interruptible Motion — compares a retargetable CSS transition with a restarted keyframe animation.
8. Tactile Save — compares restrained `.96` pressure with exaggerated `.90` pressure.
9. Save States — cycles one SVG heart through outline, pressed, saved and removed states.
10. Memory Tags — uses 100ms staggered entry and staggered soft exit with upward movement and blur.
11. Balanced Titles — changes line composition without resizing the card.
12. Precise Transitions — contains the only intentionally bad `transition: all` example and contrasts it with a property-specific transition.

## Guided modes

- Default and `?demo=reference`: 10 → 11 → 12 → Apply the Polish, approximately 7.6 seconds.
- `?demo=full`: principles 1–12, approximately 22 seconds plus final apply state.
- Any trusted pointer, wheel or touch input stops the automatic guide.

## Controls

- Space: play or pause the selected demo mode
- R: restart
- Left/Right: previous or next principle
- 1–9: principles 1–9
- 0: principle 10
- Every toggle, button, hover and press example is directly operable

## Persistence

Storage key: `lovetree-moment-polish-lab-v1`

The saved payload contains `targetType`, `targetId`, enabled principle identifiers, current presentation settings and `appliedAt`. It does not rewrite Moment titles, feelings, connections or source content.

## Mobile

The mobile layout removes the black side margins, expands the ivory artboard to the viewport, preserves real card controls and uses 44px interaction targets, including extended pseudo-element targets for compact segmented controls.

## Reference use

The supplied recording was used only for analysis and comparison. No video frame or external service identity is embedded in the HTML.
