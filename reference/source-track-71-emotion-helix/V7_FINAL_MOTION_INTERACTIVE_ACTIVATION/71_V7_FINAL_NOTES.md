# 71_V7_FINAL_NOTES

## Status

- Track: `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`
- Revision: `V7_FINAL_MOTION_INTERACTIVE_ACTIVATION`
- Execution owner: **LoveTree 디자인팀장 21기**
- MASTER filename retains the historical `디자인팀장19기` label, but the product owner's latest instruction assigns this execution to 디자인팀장 21기.
- V6 remains untouched.
- V7 is a separate final interactive candidate.
- No V8/V9 is assumed or created.
- No intermediate Pair Proof / Gate artifact was created.

## Authority inspected before implementation

The following V6 authority set was directly inspected and preserved:

1. `71_V6_FINAL_REFERENCE_COMPARISON.png`
2. `71_V6_FINAL_CANDIDATE_SCREEN.png`
3. `71_V6_FINAL.html`
4. `71_V6_FINAL_NOTES.md`

V6 static composition is treated as the visual authority. The V7 task was not a redesign.

## What changed from V6

V6 used the complete 1920×1080 candidate screen as one base64 background image.  
V7 removes that final implementation pattern.

V7 decomposes the authority into independently addressable runtime layers:

```text
ROOT / black viewport
└─ white editorial paper
   ├─ left-ui (actual DOM)
   │  ├─ LoveTree
   │  ├─ archive copy
   │  ├─ MOMENTS · CONNECTION · REPLAY · MY TREE
   │  └─ MY TREE circular CTA (actual <button>)
   ├─ giant-type (independent visual layer)
   │  └─ semantic PATH / MOMENT / MEMORY / LOVE label
   └─ jelly-cluster
      ├─ jelly-01 <button>
      ├─ jelly-02 <button>
      ├─ jelly-03 <button>
      ├─ jelly-04 <button>
      ├─ jelly-05 <button>
      └─ jelly-06 <button>
```

The final HTML does **not** use the V6 complete screenshot as a full-screen background.

## Visual preservation strategy

The V6 optical surface was already stronger than the earlier shader experiments, so V7 does not restart refraction research.

To preserve the V6 authority:

- the white/black editorial geometry is rebuilt in CSS;
- the left LoveTree / copy / CTA are actual DOM;
- giant typography is isolated as its own transparent authority layer and receives its own weaker parallax;
- each of the six visible V6 jelly surfaces is isolated into an independent masked PNG surface and embedded in the standalone HTML;
- the jelly surfaces use `mix-blend-mode: multiply` over the white editorial page so white optical interiors remain visually neutral while the black/refraction/blue/amber/red surface cues remain visible;
- the assets are source-derived from V6 authority only; no new image was generated.

The standalone HTML contains seven embedded PNG assets in total:

- 1 typography-only authority layer
- 6 independent Jelly authority surfaces

This is segmented authority reuse, not the prohibited single full-screen screenshot implementation.

## Static fidelity

`71_V7_FINAL_STATIC_COMPARE.png` is constructed as required:

```text
LEFT  = V6 FINAL STATIC AUTHORITY
RIGHT = V7 ANIMATION PAUSED
```

The paused V7 state uses the real V7 runtime layers with motion set to zero.

1920×1080 numeric support check:

- full-frame mean absolute RGB difference: **2.9542 / 255**
- left area mean absolute RGB difference: **4.8803 / 255**
- right authority/Jelly area mean absolute RGB difference: **1.3245 / 255**

These numbers are supporting QA only; the side-by-side visual comparison remains the primary authority.

## Jelly motion

Six Jelly objects have independent parameters and do not share a synchronized phase.

| Jelly | X drift | Y drift | rotation | duration | pointer depth |
|---|---:|---:|---:|---:|---:|
| 01 | ±5px | ±8px | ±1.2° | 12.8s | 0.58 |
| 02 | ±8px | ±13px | ±1.8° | 15.7s | 0.85 |
| 03 | ±6px | ±10px | ±1.4° | 10.6s | 1.00 |
| 04 | ±9px | ±12px | ±2.3° | 13.9s | 1.10 |
| 05 | ±7px | ±14px | ±2.0° | 16.0s | 1.25 |
| 06 | ±4px | ±9px | ±1.1° | 9.4s | 0.72 |

Motion character is deliberately slow and editorial. No bounce, spring, wobble or large rotation is used.

## Pointer parallax

Desktop pointer movement is normalized around the white editorial paper.

- Jelly pointer response: depth-weighted, approximately within the required subtle range.
- giant typography: weaker response, approximately ±4.2px X / ±2.8px Y maximum.
- pointer does not pull objects directly to the cursor.

## Hover / selected interaction

Each Jelly is an actual interactive `<button>`.

Hover:

- surface scale: approximately +1.6%
- slight contrast/saturation/highlight increase

Click / Enter / Space:

- one Jelly enters `aria-pressed="true"`
- selected surface scale: +3.5%
- optical contrast/saturation increases
- local selected marker activates
- only one Jelly is selected at a time

Release:

- click selected Jelly again, or
- press `ESC`

`ESC` returns the selected object to the base optical state.

## CTA

`MY TREE` is an actual DOM `<button>`.

Implemented:

- hover feedback
- focus-visible ring
- click feedback
- keyboard focus

Not implemented:

- route navigation

Reason:

`ROUTE NOT ASSIGNED` — this V7 MASTER does not grant route authority and explicitly forbids inventing product routes.

## Accessibility

Implemented:

- six Jelly objects keyboard-focusable
- Enter / Space selection
- ESC release
- `aria-pressed`
- visible focus
- actual CTA button
- semantic giant-type label
- `prefers-reduced-motion`

Reduced-motion behavior:

- idle Jelly drift stops
- Jelly rotation stops
- pointer parallax stops
- interaction/focus/click remains usable

Automated QA confirmed the reduced-motion transforms remain stable over time.

## Responsive QA

Checked:

- 1920×1080
- 1440×900
- 390×844 mobile

Results:

- horizontal overflow: 0
- six Jelly objects remain in the DOM at every viewport
- mobile keeps the LoveTree/copy/CTA readable
- the right optical cluster remains partially visible instead of disappearing
- mobile does not introduce a new unrelated visual concept

## Runtime QA

Automated browser checks confirmed:

- Jelly object count: 6
- independent idle motion changes over time
- pointer parallax changes Jelly transforms
- giant typography uses weaker parallax
- Jelly click sets selected state
- ESC clears selected state
- CTA is a real `BUTTON`
- CTA keyboard focus works
- 1920×1080 horizontal overflow: 0
- 1440×900 horizontal overflow: 0
- mobile horizontal overflow: 0
- reduced-motion state is stable
- prohibited `background:#000 url(data:image/png...)` full-screen V6 final pattern: absent

## Evidence deliverables

1. `71_V7_FINAL_INTERACTIVE.html`
2. `71_V7_FINAL_MOTION_EVIDENCE.mp4`
   - H.264
   - 1440×810
   - 12 fps
   - 12.0 seconds
   - independent idle phases followed by pointer-parallax proof
3. `71_V7_FINAL_INTERACTION_EVIDENCE.mp4`
   - H.264
   - 960×540
   - 10 fps
   - 8.0 seconds
   - hover → selected → pointer parallax → ESC release → CTA focus/click
4. `71_V7_FINAL_STATIC_COMPARE.png`
5. `71_V7_FINAL_NOTES.md`

## Scope intentionally not added

- no ring / annulus / donut
- no helix revival
- no flower / tree / heart decoration
- no new LoveTree visual concept
- no new image generation
- no new route
- no video viewer
- no GATE B/C expansion
- no V8/V9 placeholder work
- no V5/V6 overwrite
- no Production deployment
- no main merge

## Review status

**SUBMITTED AS V7 FINAL INTERACTIVE CANDIDATE.**

This file does not self-declare product-owner approval.  
The implementation scope requested by the V7 MASTER is complete and the five final evidence artifacts are present.
