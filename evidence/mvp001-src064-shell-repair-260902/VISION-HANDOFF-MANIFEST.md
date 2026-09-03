# MVP001 SRC064 — Shell Repair Vision Re-Audit Handoff Manifest

PR: #595 (DRAFT) | Branch: fix/mvp001-shell-fidelity | Exact head: 048766f2136c0b4a4c053b5f70be131385a2297f
Base: origin/main a0c3a600f446daca13b9002b54d1bd2cfb49975d
Evidence folder: evidence/mvp001-src064-shell-repair-260902/ (NOT committed)
Machine proof: geometry-proof.json (per-viewport boxes, hit-test probes, overlap px², errors)

## Review boundary — read first

INITIAL / COLLAPSED intrusion on the Source surface = NOT ALLOWED.
EXPLICIT USER-OPEN temporary overlay = ALLOWED if bounded (4-second auto-collapse),
reversible (manual close verified), and the source remains otherwise intact.

Collapsed state MUST show:
- Source status line fully unobstructed
- Source hint line fully unobstructed
- Orbit surface fully unobstructed (all elementFromPoint probes = IFRAME)
- NO expanded nav panel (panel display:none when collapsed)
- Only the small 36x36 toggle floating, clear of status/hint

Open state MAY temporarily overlay Source content (user-invoked chrome).

## Screenshots (6)

1. desktop-1440x900-initial-collapsed.png
   - viewport 1440x900 | shell: collapsed (aria-expanded=false, panel absent)
   - expected: status (x26,y867) and hint (x1277,y867) fully visible; toggle at x702,y840; 0px² overlap with status/hint; all probes IFRAME
   - allowable deviation: none

2. desktop-1440x900-nav-open.png
   - viewport 1440x900 | shell: user-opened (5 chips + prev/next/toggle)
   - expected: panel x310.67,y828,775.36x48 — centered between status (left) and hint (right); on desktop the open panel overlaps NEITHER (0px²)
   - allowable deviation: none

3. mobile-430x932-initial-collapsed.png
   - viewport 430x932 | shell: collapsed
   - expected: status (x16,y907) and hint (x277,y907) fully visible; toggle lifted to y864 (bottom:32px mobile rule) → 0px² overlap; all probes IFRAME
   - allowable deviation: none

4. mobile-430x932-nav-open.png
   - viewport 430x932 | shell: user-opened
   - expected: panel x48.72,y876,290.33x44 temporarily overlays part of status/hint rows
   - allowable deviation: KNOWN and ALLOWED — user-invoked temporary overlay; measured open overlap status 1492.4px² / hint 681px²; auto-collapses after 4s idle; manual close verified (manualCloseOk=true)

5. mobile-390x844-initial-collapsed.png
   - viewport 390x844 | shell: collapsed
   - expected: status (x16,y819) and hint (x237,y819) fully visible; toggle at x177,y776 → 0px² overlap; all probes IFRAME
   - allowable deviation: none

6. mobile-390x844-nav-open.png
   - viewport 390x844 | shell: user-opened
   - expected: panel x28.72,y788,290.33x44 temporarily overlays part of status/hint rows
   - allowable deviation: KNOWN and ALLOWED — user-invoked temporary overlay; measured open overlap status 1712.4px² / hint 901px²; auto-collapses after 4s idle; manual close verified (manualCloseOk=true)

## Mechanical verification already established (do not require re-run)

- Initial collapsed on load: true on all 3 viewports; panel hit-test removed (display:none)
- All collapsed-state elementFromPoint probes (status center, hint center, former panel band points) resolve to IFRAME
- Collapsed status/hint/toggle overlap = 0px² on all 3 viewports
- Auto-collapse after 4s idle: PASS on all 3 viewports; deferred retry while pointer/focus inside nav
- Manual close: PASS; wheel/scroll reaches source surface: PASS on all 3 viewports
- 5-step navigation smoke (forward/back/chip): PASS, 0 errors
- qa/mvp001-browser-qa.mjs: 280 assertions PASS; 5/5 SRC*_MVP_RUNTIME_PARITY PASS; 0 page/console errors
- tests/mvp001-shell-fidelity.test.mjs: 9/9 PASS (non-browser vm regression)
- Source immutability: git diff vs base = 0 files in src/03_sources/SRC064 and public/mvp/01/surfaces

## Qwen visual verdict authority

QWEN_VISUAL_VERDICT = DEFERRED_TO_IMAGE_CAPABLE_REVIEWER
(This environment has no image input; PNGs are signature-verified readable only.)
