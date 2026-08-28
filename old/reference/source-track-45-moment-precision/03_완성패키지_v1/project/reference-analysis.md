# LoveTree Moment Polish Lab v1 — Reference Analysis

## Source

- Recording: `참고-녹화_2026_08_04_01_26_13_485.mp4`
- Measured duration: 17.74 seconds
- Resolution: 1904 × 1068
- Frame rate: approximately 30 fps

## What is visible

The first roughly two seconds show an X post and browser chrome. Those elements were excluded. The usable reference is a narrow portrait playground centered on a black stage.

The playground uses a warm ivory artboard, a large black hero panel, a compact command/apply bar, a centered playground label and a 3 × 4 grid. The visual system is deliberately limited to black, ivory, neutral gray and one restrained blue accent.

## Observed automatic tail sequence

| Approx. recording time | Observed state | Motion cue |
|---|---|---|
| 2.0–2.6s | Playground settles; the preceding icon-state card remains active briefly | Active card is outlined in blue; cue strip updates without moving the grid |
| 2.6–4.2s | Principle 10: stagger and soft exit | Three tags enter separately, then leave upward with blur and opacity loss |
| 4.2–5.9s | Principle 11: text wrapping | The active outline moves to the text card; only the line composition changes |
| 5.9–8.4s | Principle 12: never transition all | Left example moves unintended surrounding properties; right example limits motion to the intended handle |
| 8.4–10.2s | Final command/apply state | The command bar receives a blue outline and the top progress reaches the end |
| 10.2–17.74s | Final state remains visible | No new principle is introduced in the supplied recording |

## Reference-derived layout observations

- Portrait artboard occupies approximately 37–43% of the 1904px recording width.
- Black side margins are part of the presentation, not empty browser background.
- Hero height is approximately one quarter of the artboard.
- The cue strip is shallow and integrated into the hero top edge.
- Active cards do not scale. Selection is shown with a thin blue outline and a restrained shadow.
- The 12 cards remain spatially stable while the active state changes.
- Typography uses heavy sans serif for the hero, italic serif for the emotional emphasis and condensed/monospace details for the cards.

## Scope boundary

The recording directly demonstrates the automated behavior of principles 10–12 and the final command state. Principles 1–9 are visible as static examples, but their complete original automatic demonstrations are not contained in the uploaded recording. Their interactive implementations therefore follow the visible card concepts and the supplied LoveTree execution contract; they are not claimed to be frame-identical reproductions of unseen source motion.
