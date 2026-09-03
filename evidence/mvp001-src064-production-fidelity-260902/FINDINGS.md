# MVP001 SRC064 Production Fidelity Audit — Findings

Date: 2026-09-02
Mode: READ-ONLY. No repository file was modified. Evidence only.

## Environment
- Repo: skerishKang/lovetree-limone
- Workspace: E:\lovetree260902
- HEAD at audit start: a0c3a600f446daca13b9002b54d1bd2cfb49975d (== origin/main == expected authority)
- git status: clean
- Only commit since previous audit state (01a9b0ea): a0c3a600 "fix(ci): gate Production smoke on static asset readiness (#594)" — workflow-only, no SRC064/MVP/Worker source change.
- Browser: single Playwright Chromium session, devicePixelRatio=1 for all A/B/C.
- Original served read-only via local HTTP: http://127.0.0.1:8899/src/03_sources/SRC064/split/index.html

## Mechanical byte parity (SHA-256)
- index.html  0D24CC9DAEE9089B2BD304A6A2ADE45346A31A0732DD3E78913FFCD607ABC0D4  BYTE_IDENTICAL (5049 B)
- styles.css  9F70B882EC82398A1E6F91EBF64C3F097CF130BE4F70AD46248A23C6CF0D18DD  BYTE_IDENTICAL (17648 B)
- script.js   774936463EB2DE3545EDFEC84527D4D3B55B755ABD2216A0265676396B9324BD  BYTE_IDENTICAL (1542663 B)
- Matches split/materialization.json recorded hashes.

## A vs B computed-geometry parity (13 static UI elements, 0.1px precision)
DESKTOP 1440x900: topbar, brand, menuBtn, status, hint, center, eyebrow, h1, p, actions, btn0..btn2 — ALL IDENTICAL.
body bg rgb(4,4,7); #app radial-gradient(circle, rgb(10,10,17) 0%, rgb(5,5,9) 34%, rgb(2,2,4) 74%, rgb(0,0,0) 100%) — IDENTICAL.
40 cards both sides; card class variants (photo/video/memo/link x sm/md/lg x fitContain), border-radius 11/14/16px by size, border 1px solid rgba(255,255,255,.12), shadow rgba(0,0,0,.38) 0 24px 60px — IDENTICAL.
status text "WELCOME_IDLE · 40 MOMENTS" both sides.
MOBILE 430x932: brand/menuBtn/status/hint/center/h1/p/actions — ALL IDENTICAL (e.g. h1 47.3,400.7,335.4x32.3 fs 34px both).
MOBILE 390x844: ALL IDENTICAL (h1 42.9,358.5,304.2x32.3 both; no overflowX either side).

## A vs B interaction parity (identical inputs)
- Wheel(dy=400 @720,450): status WELCOME_IDLE -> ORBIT_INTERACT on both.
- Drag(720->870 @y450): m01 translateX A: 965.96->870.01 (d=-95.9), B: 967.86->865.18 (d=-102.7); m05 A: -505.03->-374.61 (d=+130.4), B: -504.27->-373.82 (d=+130.5). Equivalent within inertia/timing noise.
- Card click m08 (one-step direct open, v1.2 behavior): both -> status MOMENT_MEDIA_VIEWER, mediaTitle "PEARL NIGHT", kicker "MOMENT · PHOTO", meta "2026.08.22설렘PHOTO", badge PHOTO, PLAY MOMENT present.
- Media shell geometry: A and B both x130,y143,w1180,h614, radius 22px, bg rgba(7,7,11,.89); visual 787.1x612; info 390.8x612. PIXEL DIFF = 0.000% (deterministic modal).
- Media close -> focusLayer.open, focusTitle PEARL NIGHT, why text identical, RETURN TO ORBIT rect both 1267.3,24,147.7x17, status MOMENT_FOCUS.
- RETURN TO ORBIT -> status ORBIT_INTERACT, focusLayer closed, both.
- MENU open -> menuPanel.open rect both 1064.7,12.3,354.6x305.3; items both: MOMENTS40 / CONTINUE→ / FIRST MOMENT01 / MY TREE↗ / STORY BOOK↗. Close via × (panel overlays MENU button — original design).

## Pixel diff (informational; orbit rAF phase drift expected)
- desktop initial A vs B: 10.35% (>24 sum-RGB), 1.73% (>150) — localized to animated orbit cards; static UI pixel-identical regions verified numerically.
- mobile 430 initial: 3.22% / 0.41%; mobile 390 initial: 0.81% / 0%.
- media modal A vs B: 0% / 0% (exact).
- menu A vs B: 10.40% / 1.38% (cards behind translucent panel + phase).
- focus A vs B: 9.26% / 1.39% (same reason).

## B vs C (shell composition)
- C mounts iframe .mvp-surface-frame src=/mvp/01/surfaces/src064/index.html at 0,0 sized EXACTLY to viewport (1440x900 / 430x932 / 390x844). No scroll, no clip (scrollHeight==innerHeight, body overflow hidden).
- iframe inner geometry identical to A/B (h1 450,377.2,540x65.7 @desktop; 47.3,400.7 @430; 42.9,358.5 @390; 40 cards; same status text).
- Pointer pass-through: wheel, drag, card click all reach source inside C (status transitions identical to A/B).
- elementFromPoint at source content points (h1, actions, brand, menuBtn, status, hint, card area, world center) -> IFRAME, not shell. Shell steals events only within its own nav rect.

## Shell intrusion measurements
- Desktop 1440x900: nav fixed rect x322.4,y828,w795.3,h48 (z999999, glass panel). No overlap with status(x26..194) / hint(x1277..1414) / center block / brand / MENU. Overlaps bottom-center orbit band only; cards under band covered & unclickable there.
- Mobile 430x932: nav x50.8,y876,w328.4,h44. Overlaps #status (y907..918 x16..184.4) and .hint (y907..918 x277.1..414): overlap areas approx 1470px^2 and 1123px^2.
- Mobile 390x844: nav x30.8,y788,w328.4,h44. status overlap 1689.4px^2, hint overlap 1342.6px^2 (measured).
- Collapsed state (⋮ toggle): nav shrinks to 36x36 (x197..233,y884..920 @430x932); status/hint hit-test -> IFRAME (no overlap).
- Media modal @mobile C: shell y125.5..806.5 vs nav y876..920 -> overlap 0.
- NOTE: shell.html comment says "Floating Autohide" but shell.js implements manual toggle only; expanded nav is the persistent default (not a source deviation; shell is non-source chrome).

## Runtime / network
- A: only favicon.ico 404 from local test server (audit artifact, not LoveTree).
- B: only https://lovetree-limone.charliekant.workers.dev/favicon.ico 404 (root favicon not served; cosmetic, outside SRC064 surface).
- C: 0 console errors; network: /mvp/01?step=entry 307->200, shell.css 200, shell.js 200, surfaces/src064/index.html 307->200, styles.css 200, script.js 304. All healthy.
- No CSP errors, no iframe errors, no uncaught exceptions, no media failures (all 33 media are data: URIs embedded in script.js; zero external media dependencies).

## Deviations
- DEV-001 | 430x932 + 390x844 | initial/orbit idle | ORIGINAL: #status and .hint fully visible at bottom | PRODUCTION(C): expanded MVP nav panel covers parts of both (overlap 1123-1689 px^2) | SEVERITY: minor | LIKELY_LAYER: MVP_SHELL | selector: #mvp-shell-nav > .mvp-nav-panel vs iframe #status/.hint | Mitigation exists: collapse via #toggle-nav-btn restores full visibility.
- DEV-002 | 1440x900 | orbit | ORIGINAL: bottom-center strip fully interactive | PRODUCTION(C): nav band y828..876 x322..1118 covers/click-blocks cards passing beneath | SEVERITY: minor | LIKELY_LAYER: MVP_SHELL.
- DEV-003 | all | any | ORIGINAL: n/a | PRODUCTION(B/C root): /favicon.ico 404 | SEVERITY: cosmetic | LIKELY_LAYER: PRODUCTION_STATIC_SERVING (root-level, outside SRC064).
- NON-DEVIATION: A vs B pixel diffs on animated frames are orbit rAF phase drift; deterministic states (media modal) diff 0%; all static geometry/styles identical to 0.1px.

## Verdicts
- SRC064_BYTE_PARITY = PASS
- SRC064_PRODUCTION_SURFACE_VISUAL_PARITY = PASS (A vs B)
- SRC064_PRODUCTION_SURFACE_INTERACTION_PARITY = PASS (A vs B)
- SRC064_MVP_VISUAL_PARITY = PASS_WITH_DEVIATION (B vs C: nav overlaps status/hint on both mobile sizes)
- SRC064_MVP_INTERACTION_PARITY = PASS_WITH_DEVIATION (source interactions fully work through shell; nav band click-blocks bottom strip)
- SRC064_SHELL_INTRUSION = PASS_WITH_DEVIATION
- SRC064_RUNTIME_ERRORS = PASS (no blocking errors; only favicon 404)
- SRC064_FINAL_FIDELITY = PASS_WITH_DEVIATION
