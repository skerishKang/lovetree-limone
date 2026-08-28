# LoveTree 49 · Interaction Spec V2.3

## 1. Hero state switching

The master HTML contains exactly six complete states.

### Desktop
- Prev / Next circular arrow buttons
- Left / Right keyboard arrows
- Six state indicator dots

### Mobile
- Prev / Next buttons
- Horizontal swipe gesture implemented with touch + pointer fallback
- State indicator remains visible

A state change synchronizes:
1. main cast image
2. Hero world background
3. four Moment bubble images/treatments
4. light-trail accent color
5. Moment Field world and title
6. Connection emotional reason and accent tone
7. Tree glow color and world backdrop
8. Save-section ambient tone and current-world label

## 2. Hover / pointer reveal

Within the active Hero state:

- Hover/focus a circular Moment bubble → that Moment becomes active.
- Active bubble scales slightly and its halo strengthens.
- Light trails increase glow intensity.
- Right-side Moment copy changes.
- Connection Preview updates THIS MOMENT / NEXT MOMENT images and labels.
- Pointer movement moves a soft ambient orb and subtly parallax-shifts bubbles.

This is a **LoveTree Moment reveal**, not a face-mask or portal-mask effect.

## 3. Main Hero crop rule

The main Hero person is never enclosed in an oval, arch, circular portal, or clip-path window.

Implementation:
- `border-radius: 0`
- `clip-path: none`
- only a **linear edge feather** is used to dissolve the rectangular source-photo edge into the active world.
- circular crop is reserved for the small Moment bubbles only.

## 4. Tree synchronization

The Tree SVG uses the state CSS variable `--tree`.

- Ivory states → gold/white family
- Pink states → rose/pink family
- Purple Concert states → violet/magenta family

Branches, nodes and sparkles share the active glow and use drop-shadow luminosity.

## 5. Save interaction

Submitting Save This Moment changes the right confirmation panel to:

`Moment saved → Add a connection now? → Later / Connect`

No production API or user data is called; this is local prototype state only.
