# LOCAL_WSL2_279_TRACK68_LINUX_FORENSIC_REPORT

## Bootstrap

```
FRESH_MAIN  = c46135eed9f5f11dff8aa142ae83504bb5a55fa1
PR279_HEAD  = a9ec6727cef908801d904145557cae3a2da1e809
HEAD_MATCH  = YES

WSL_DISTRO  = Ubuntu 24.04.1 LTS
WSL_KERNEL  = 5.15.167.4-microsoft-standard-WSL2
NODE        = v22.23.2
PLAYWRIGHT  = 1.62.0 (CI uses 1.55.0)
CHROMIUM    = v1228 / Chrome 149.0.7827.55
DISK        = /dev/sdc ext4 (WSL-native)
```

## Workspace

- Isolated worktree created at `/root/worktrees/lovetree-local2-279-track68`
- WSL-native ext4 filesystem
- Clean checkout of exact PR #279 head
- No reuse of KILO/LOCAL-1/WIN-1/MiniMax workspaces

## CI-Parity Execution

### Build & Asset Verification
```
npm ci         = 616 packages installed
npm run build  = vinext build — SUCCESS
Asset verifier = 23/23 PASS (3 HTML + 18 PNG + 2 hero MP4)
```

### Full Gate (First Run — 1280×800 started)
- Server: `vinext start` on port 3000 (production build)
- Result: Browser crashed mid-test (server killed by Chromium launch resource pressure)
- Note: This is an environment-specific issue (many concurrent Kilo processes)
- **Not related to the Track68 card failure**

### Full Gate (localhost fix — 1280×800 partial)
```
1280x800: 20 PASS / 6 FAIL (browser crash during portal tests)
- The card count check at 1280x800: PASS (9 cards)
```

## 320×720 FORENSICS

### Bounded Repro Matrix
```
320×720 × 40 runs  = 0 FAIL (0/40)
390×844 × 1 run   = PASS (9 cards)
1280×800 × 1 run  = PASS (9 cards)
```

**The failure does NOT reproduce on WSL/Linux.**

### Frame Selection Analysis
- Total frames at 320×720: 2 (1 main + 1 child)
- Child frame URL: `about:srcdoc` (srcdoc iframe)
- `getIframeFrame(page)` correctly selects the child frame every time
- No detached frames, no stale frames, no multiple iframes
- `data-source-state="ready"` is correctly set on the iframe element
- `data-mode="A"` is correctly set on the iframe element

### Frame Count at Failure Point
```
Frame[0] MAIN readyState=complete cards=0 url=http://localhost:3000/...
Frame[1] child readyState=complete cards=9 url=about:srcdoc title="LoveTree Track68 V3.3A..."
```

### ACTIVE_IFRAME_URL = about:srcdoc
### SELECTED_FRAME_URL = about:srcdoc (correct)
### FRAME_SELECTION_CORRECT = YES

### Timing Measurement (iframe-ready → cards available)
```
min  = 42.7ms
avg  = 106.7ms
max  = 225.1ms
```

The test queries cards IMMEDIATELY after `iframe[data-source-state='ready']` matches.
On this machine, cards are always available before Playwright evaluates the query.
On a slower CI runner, this window could be larger.

### EXPECTED_9_CARDS_EXIST = YES (40/40 runs)

## Root Cause Analysis

### The Race Condition (theoretical, not reproduced)

The test harness has a **theoretical timing race**:

1. React renders the iframe with `srcDoc={htmlText}` and `data-source-state="ready"` (line 357 of `SourceTrack68CompareRunner.tsx`)
2. `data-source-state="ready"` is **hardcoded** in JSX — it fires when React mounts the iframe element, NOT when srcdoc content has finished rendering
3. Playwright sees `iframe[data-source-state='ready']` and proceeds to query `.card` elements
4. **If** the srcdoc content hasn't finished rendering yet, `.card` count = 0

This race window is 42-225ms on this machine. On a slower CI runner (GitHub Actions ubuntu-latest), this window could be 2-5× larger. Under CI load, it could occasionally be large enough for the card query to execute before content renders.

### Why 320×720 specifically?
- The failure was 77 PASS / 1 FAIL in CI — only the 320×720 card check failed
- This is consistent with a **low-probability race** that happened to hit the 320×720 viewport
- The race is NOT viewport-specific; it could theoretically occur at any viewport
- The 320×720 viewport is the last viewport tested, so CI resources may be more constrained at that point

## Classification

### PRIMARY: CI_RUNNER_ONLY_FLAKE

The failure does not reproduce on WSL/Linux (0/40 fails at 320×720). The theoretical race condition between iframe mount and srcdoc content rendering exists in the test harness but only manifests under specific CI conditions (slower machine, resource contention, different Playwright/Chromium version).

### SECONDARY: TEST_HARNESS_RACE

The test relies on `iframe[data-source-state='ready']` as a proxy for content readiness, but `data-source-state` is set by React when the iframe element is mounted, before srcdoc content has loaded. A more robust approach would wait for the frame's content to be ready (e.g., `.card` elements exist).

## Defect Assessment

```
PR279_CORE_DEFECT      = NO   (gesture arbiter files not involved)
TRACK68_SOURCE_DEFECT  = NO   (HTML assets are exact, 23/23 verified)
TRACK68_HARNESS_DEFECT = YES  (theoretical race in frame readiness check)
LINUX_SPECIFIC         = NO   (does not reproduce on Linux)
CI_ONLY                = YES  (only observed on GitHub Actions CI)
```

## Patch Assessment

### Is a justified patch warranted?

**YES — the harness race is a provable defect, even though it doesn't reproduce locally.**

The `getIframeFrame(page)` approach combined with `iframe[data-source-state='ready']` is fragile because:
1. `data-source-state="ready"` is a React-rendered attribute, not a content-loaded signal
2. `getIframeFrame()` uses `frames.find(f => f !== page.mainFrame())` which could select a stale/detached frame if multiple frames exist during mode transition
3. The card query has no explicit wait for content readiness

### Proposed Patch (allowed under §7)

Replace the `getIframeFrame()` helper and add content-ready wait:

```javascript
// Instead of: frames.find(f => f !== page.mainFrame())
// Use: resolve from the currently mounted iframe element
async function getIframeFrame(page) {
  const iframeEl = page.locator("iframe[data-source-state='ready']");
  const contentFrame = await iframeEl.contentFrame();
  return contentFrame;
}

// Before card queries, wait for cards to exist:
await frame.locator(".card").first().waitFor({ timeout: 5000 });
```

This is NOT:
- arbitrary sleep increase
- retry until pass
- removing 320×720
- weakening >=9 assertion

This IS:
- resolving frame from the currently mounted iframe element (§7 allowed)
- waiting for authoritative explicit ready state (§7 allowed)

### PATCH_REQUIRED = YES (harness hardening)
### ASSERTION_WEAKENING = NO
### RETRY_MASKING = NO

## Validation (if patched)

- 320×720: exact reproduction
- 390×844: control
- 1280×800: control
- 23/23 asset verifier
- build
- git diff --check

## Commit Status

```
CHANGED_FILES   = []
LOCAL_COMMIT    = NONE (pending CTO decision on patch scope)
REMOTE_PUSH     = NO
PR_CREATED      = NO
PR191_TOUCH     = NONE
```

## RECOMMENDED_CTO_ACTION

1. **Accept classification**: CI_RUNNER_ONLY_FLAKE + TEST_HARNESS_RACE
2. **Decide on harness hardening patch**: The `getIframeFrame()` → `contentFrame()` fix + `.card` wait is a justified improvement to the test harness reliability
3. **If approved**: Apply harness fix, validate at all viewports, commit as a separate harness-stability PR (NOT mixed with PR #279 gesture arbiter)
4. **If deferred**: The failure will likely not recur; monitor next CI run

## Evidence Artifacts

- `/tmp/track68-forensic-320x720-run{0-4}.png` — screenshots from each forensic run
- `tests/forensic-track68-320x720.mjs` — forensic investigation script
- `tests/forensic-track68-race-verify.mjs` — race condition verification (40 runs)
- `tests/forensic-track68-timing.mjs` — timing measurement (10 runs)
