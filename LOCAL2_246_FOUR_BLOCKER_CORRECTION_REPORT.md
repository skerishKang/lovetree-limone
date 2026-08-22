LOCAL2_246_FOUR_BLOCKER_CORRECTION_REPORT

PR: #246
Issue: #159
Branch (worker): feat/159-track62-v11-continuous-exhibition-native-proof
Authority: LOCAL-2 Track62 Interaction Correctness Owner + Real Browser Input QA Owner + Accessibility Regression Owner

START_HEAD = dac3c693d1fa3a7aab80726600e4b49b6b6b0bf1
FINAL_HEAD = 268b148a55b726e5fecede85127f64b7cb84092a

CHANGED_FILES =
  M app/design-lab/capabilities/continuous-exhibition-rail/ContinuousExhibitionRailExperience.tsx
  M lib/track-62-v11/controller.ts
  M lib/track-62-v11/dialog.ts
  M qa/track62-v11-continuous-exhibition-qa.mjs
  M tests/track-62-v11-controller.test.mjs

OUTER_SCROLL_HANDOFF = PASS
  - wheelConsumes() added to controller; rail only preventDefaults when it can
    actually consume the delta. At MIN boundary an outward (up) wheel and at
    MAX boundary an outward (down) wheel are handed to the real page.
  - Real Chromium proof: at MIN boundary, outward up-wheel changed document
    scrollY 86 -> 0 (page scrolled up). At MAX boundary, outward down-wheel
    changed scrollY 200 -> 800 (page scrolled down). Inward wheel at MIN kept
    scrollY 86 -> 86 (rail owns, no trap). Not an event-spy PASS.

REAL_TOUCH = PASS
  - QA now drives a genuine touch pointer path via CDP Input.dispatchTouchEvent
    (real pointerType === "touch" PointerEvents), not renamed page.mouse.
  - Asserts: pointerType touch captured on the stage, fractional-phase motion,
    below-threshold touch does not open the viewer, drag-release does not open
    the viewer (no accidental open), release semantics intact.

EXACT_FOCUS_RESTORE = PASS
  - closeOverlay() now syncs overlayRef.current = "none" synchronously before
    the restore rAF, so focus returns to the EXACT trigger element (the same
    HTMLElement that opened the viewer), not merely any element / BODY.
  - Browser proof: after close-button close AND after Escape close,
    document.activeElement === exactTrigger (BUTTON). The old loose
    data-open-viewer/tagName check (which could PASS on BODY) is removed.

POINTERCANCEL_CLEANUP_ONLY = PASS
  - cancelGesture() is now cleanup-only: freezes phase (mode idle, no settle,
    no target commit), never selects, never opens, never snaps to nearest
    scene. Contract and implementation aligned (cleanup-only prioritized).
  - Pure unit test + real-browser proof: a real mouse drag into "dragging"
    followed by a real pointercancel commits no selection (scene unchanged),
    opens no viewer (dialog count 0), and preserves the interrupted phase
    (no nearest-scene snap).

FOCUSED_TESTS = PASS
  - tests/track-62-v11-controller.test.mjs updated: cancel cleanup-only
    assertion + new wheelConsumes ownership tests. 62 track62 unit tests pass.

REAL_BROWSER_QA = PASS
  - qa/track62-v11-continuous-exhibition-qa.mjs: 58 checks, 0 failures against
    a running app server (local dev server; production static-serve was broken
    in this env, so dev server used for the proof — not described as Preview/Prod).

DESKTOP = PASS
390 = PASS
320 = PASS
REDUCED_MOTION = PASS

CONSOLE_ERRORS = 0
  - 0 console errors and 0 page errors across desktop / 390 / 320 / reduced-motion.

ASSERTION_WEAKENING = NONE
  - No existing assertion was weakened. No skip / xfail / retry masking used.
  - Existing checks (E/G/F/H/J/K/L/M/N/N2/P/Q/R/S/AA/AB/Z and overflow checks)
    retained and still PASS.

MAIN_MERGE_FORWARD = NOT_YET
READY_CHANGED = NO
PR_MERGE = NO
STOP_FOR_CTO = YES

Note: This branch is NOT the final main integration lane. main merge-forward
was intentionally NOT performed. Correction commits were pushed normally
(no rebase / reset / amend / force). CTO review + separate merge-train
forward remain.
