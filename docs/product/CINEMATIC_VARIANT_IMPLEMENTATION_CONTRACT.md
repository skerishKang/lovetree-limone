# LoveTree Cinematic Variant Implementation Contract

Date: 2026-08-09
Evidence: current LoveTree 49 and 50 design-lead execution gates in Google Drive
Architecture: #74 / #77 / PR #76

## Purpose

This contract prevents a recurring implementation failure: treating a cinematic storyboard as a set of still images and simulating film motion with CSS transforms.

Cinematic design lineages may differ visually, but implementation should preserve the approved storyboard/motion source rather than re-invent it inside the web wrapper.

## Canonical pipeline

Use this order when the source lineage has reached storyboard/visual lock:

`LOCKED STORYBOARD -> HIGH-RES SCENE MASTER -> SHOT MOTION CLIP -> EDITED CINEMATIC -> VISUAL GATE -> HTML/React WRAPPER`

Do not reverse the order by building a large HTML animation first.

## 1. Storyboard is the visual specification

Once a Lineage revision is explicitly locked:

- preserve shot subject;
- preserve composition;
- preserve camera distance;
- preserve lighting and color family;
- preserve environment;
- preserve emotional read;
- preserve shot order/rhythm unless a later product-owner decision changes it.

A later implementation pass must not silently become another design revision.

## 2. Scene Master quality gate

Restore each important storyboard frame as a high-resolution scene master before motion work.

Recommended minimum for cinematic landscape scenes: 1920×1080.

Reject:

- low-resolution source enlarged to full screen;
- identity drift between storyboard and scene master;
- changed framing presented as a fidelity port;
- blur/grain used to conceal weak source quality.

## 3. Motion means scene motion, not slideshow motion

Preferred motion sources include:

- subject micro-motion;
- eye/head movement where appropriate;
- hair/clothing response;
- body movement;
- camera push/pull;
- parallax;
- foreground pass;
- environmental depth;
- lighting/reflection/refraction change;
- actual spatial occlusion.

Do not claim a cinematic port based primarily on:

- one still image plus `scale()`;
- `translateX/Y()` only;
- opacity fades only;
- a wall of floating portrait cards;
- static cutouts with decorative particles.

## 4. Identity continuity

When a locked cinematic follows one PRIMARY or a fixed cast:

- preserve identity across shots;
- use approved reference frames/assets;
- avoid uncontrolled face regeneration;
- do not substitute a different character because a generated shot is easier;
- treat extreme close-up or low-quality frames as weak anchors.

This is especially important when multiple Moments belong to the same person: `many moments != many people`.

## 5. LoveTree semantic continuity

Visual benchmark fidelity does not replace LoveTree product meaning.

The implementation must still preserve:

`First Moment -> Save -> Connection -> Next Moment -> accumulation -> Tree/Path reveal`

Connection is emotional causality between Moments, not a social graph edge between people.

## 6. Web wrapper responsibility

After the cinematic asset passes its visual gate, the HTML/React layer should primarily own product delivery concerns:

- preload/loading state;
- video playback;
- sound policy/controls;
- skip;
- replay;
- enter/continue to LoveTree;
- responsive framing;
- reduced-motion/static fallback;
- keyboard/focus behavior;
- route/history integration;
- analytics only when separately specified.

The wrapper should not redesign locked shots.

## 7. Performance and fallback

Before a cinematic Variant can become `validated`:

- test desktop and mobile viewport behavior;
- measure asset weight and startup latency;
- provide a poster/static or simplified fallback where autoplay/video/WebGL is unavailable;
- respect reduced-motion preferences;
- avoid blocking the functional LoveTree entry path on a heavy cinematic asset.

Local/browser validation is tracked separately by #79 when execution-level testing is required.

## 8. Design Lab representation

A cinematic lineage can contain:

- rejected early HTML revisions;
- approved storyboard revisions without executable HTML;
- motion proofs;
- final cinematic assets;
- web wrapper variants.

These are **Revisions inside one Design Lineage**, not new LoveTree product versions.

Only an executable product-facing wrapper should become an implemented Scenario Variant route.

## 9. Selection

Do not automatically select the newest revision.

A prior revision may remain the baseline/fallback when later cleanup reduces rhythm, emotional impact or visual character. Design Lab must preserve that comparison history.
