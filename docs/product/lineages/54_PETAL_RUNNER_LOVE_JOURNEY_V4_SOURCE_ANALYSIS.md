# Lineage 54 — Petal Runner · Love Journey V4 source analysis

## Classification

`12_LoveTree_Petal_Runner_LoveJourney_V4` is a direct LoveTree sibling product/story artifact. It is not a generic automotive reference.

- Lineage: `lt-54-petal-runner-love-journey`
- Current Revision: `54-v4-petal-runner-love-journey`
- Tracking issue: #129
- Design Lab route: `/design-lab/lineages/54/v4`
- Product boundary: internal source-fidelity review first; no automatic production adoption

## Authoritative Drive location

The authoritative V4 folder was re-listed directly from Google Drive during the implementation audit. Use the object IDs from this folder, not same-name duplicate objects discovered elsewhere in Drive.

- folder: `12_LoveTree_Petal_Runner_LoveJourney_V4`
- Drive folder id: `1Gtw1cU-aFFUFINNYAm-okP2CtWcSEASf`
- `01_HTML` folder id: `13_k13PHVHsCROQ_p6IM9fc0Pw5mj7Wy_`
- `03_ASSETS` folder id: `1_-hJsE-H5oH8HTc2YAsTZn-r5DeNdwgz`
- `03_ASSETS/transparent` folder id: `1cs0mUbMmEjA7J_jWf7HsSSBps5GE2tXp`
- `README-V4.md` Drive id: `15qLtIZZ8k3DO1hwrQr7OnAOXNuzOiu-l`

## Authoritative runtime

Primary sibling source:

- `01_HTML/index-v4.html`
- Drive id: `1woLMELxsldvYdDJiBG8_XIupsj1St9CV`
- bytes: `21,337`
- SHA-256: `ea9295e8d8a9fb14d6a0df8ec16e294a13df666770e285a2bbbf69807e38ebd9`
- Git blob SHA when represented byte-for-byte: `4dd2bd69cee22cca24b87ccaf4bae23534be5523`

Runtime alias:

- `01_HTML/index.html`
- Drive id: `11VevtUfc2AaKzJn7fwgqCLNZ8p542YrL`
- bytes: `21,337`
- fresh raw-download SHA-256: `ea9295e8d8a9fb14d6a0df8ec16e294a13df666770e285a2bbbf69807e38ebd9`
- fresh Git blob SHA: `4dd2bd69cee22cca24b87ccaf4bae23534be5523`
- byte-for-byte comparison: identical to `index-v4.html`

The sibling `README-V4.md` says V3 is preserved and V4 redesigns the vehicle/travel staging rather than replacing the product story.

## Source story contract

Top narrative:

`FIRST MOMENT → DEPART → TRAVEL → ARRIVE`

1. **FIRST MOMENT** — front / parked. The first saved Moment creates the first light coordinate.
2. **FEELING GROWS** — side / departing. Saved Moments accumulate, Petal Energy rises and the first route appears.
3. **CONNECTION** — rear / travelling. Saved Moments become a luminous emotional path toward LoveTree.
4. **LOVE BLOOMS** — doors open / arrived. 184 Moments become leaves, 12 Connections become branches and the open vehicle becomes an entrance back into saved memories.

The counts `184 / 200`, `184 Moments`, `12 Connections`, and the Premium Journey thresholds are sibling source-story values. They are not canonical business rules merely because they exist in the source.

## V4 motion and interaction contract

The V4 source and README require:

- smaller vehicle and a safe floor line above the timeline;
- no bottom clipping;
- offscreen entry → acceleration → curved travel → deceleration/stop;
- `1.8s` route animation with source driving-state cleanup at approximately `1880ms`;
- vehicle swap trigger at `520ms` and source image fade/swap delay at `170ms`;
- background camera panning and brightness changes;
- speed streaks during travel;
- wider per-chapter vehicle displacement;
- final open-door vehicle fully inside the viewport;
- left/right drag through four vehicle views;
- `48px` per-view drag threshold and ±`13deg` drag tilt;
- pointer capture, pointer cancel recovery and drag-only `translateY(-3px)` lift;
- free-view index persists across chapter navigation;
- four story buttons and four bottom timeline buttons;
- toast lifetime `1900ms`;
- bloom particles removed after `2400ms`.

The native review route preserves these source mechanics and adds one explicit native-product difference required by #129: when `prefers-reduced-motion: reduce` is active, chapter state changes immediately and travel/camera/speed animation is disabled.

Review-only policy explanation stays outside the sibling composition. It must not be inserted into the source-faithful right-side content panel as extra visual chrome.

## Source viewport contract

Relevant source layout values are pinned in the native review implementation and regression tests:

- source font stack: `Inter, Arial, sans-serif`;
- header: `76px`;
- desktop main: `height: calc(100vh - 76px)` with `min-height: 700px`;
- desktop columns: `270px minmax(540px,1fr) 290px`;
- toast: `position: fixed`;
- ≤1100px service panel: `285px` wide with `height: calc(100vh - 112px)`;
- ≤760px main becomes auto-height, stage becomes `680px`, service panel becomes fixed, vehicle uses `72%` width / `14%` left / `8%` bottom, timeline uses `8px` left/right.

## Exact image contract

The five authoritative PNG objects were re-listed from the V4 folder, freshly raw-downloaded, and re-hashed during the implementation audit. All filename, bytes, SHA-256 and Git blob fingerprints match Issue #129 and `lib/lineage-54-petal-runner-source.ts` exactly.

| Asset | Authoritative Drive id | Bytes | Dimensions | SHA-256 | Git blob SHA |
|---|---|---:|---:|---|---|
| `lovetree-arrival-garden-v3.png` | `11zYOY2S8jbFi96M5WmCQFvdlc-kbllvY` | 2,458,998 | 1672×941 RGB | `731ce39ccd9bbb9fe20fa1ba98a390ca8691d16f92110502a16cbcfee161ea35` | `e8009e58ccb42617ee3ba3d59fc97da68ed7340a` |
| `petal-runner-front-v3.png` | `1nBUZJbDt4m3AhHgYSDkMFf_-ViZqSRD9` | 178,894 | 627×627 RGBA | `391b77902d26b89eeea892f7847dc1a99212456e80ff7aec918dd17f580c9826` | `eed19757463401eba0913dfd35e9c7fa14445249` |
| `petal-runner-side-v3.png` | `1m_Nkn0H06jh4eVV0caRYHJcv7fZwaC_9` | 135,739 | 627×627 RGBA | `84014bf23b44194a00f85093d0dfac6ba6736fbe91aaff6cf70c3db130a0d0a3` | `1326fe2b6f66fd696cecd5688693f299f5c26434` |
| `petal-runner-rear-v3.png` | `1u68PFIT96V86VyJyywrP3Egj4FNvSx5E` | 168,905 | 627×627 RGBA | `2708fe6625bd87da61de3e30e8b034766f0df5ccd5fef584d405c5e05d3ca37d` | `28b5859e3b9d7e0e02228e4703b347aa85218f24` |
| `petal-runner-open-v3.png` | `1C9ogxrGU4MIeo9D6RfRbUFfvlZnoI-7s` | 261,150 | 627×627 RGBA | `96b53667e2f2fc71498238ff1403035b1c7c0f454049dadfa07da421eff7838a` | `c1a51d939275bf5706c65815fb77c12feb8c35d3` |

Target asset path:

`public/old/reference/lineage-54-petal-runner-v4/assets/`

The review component uses this exact path contract and shows `ASSET TRANSFER HOLD` only when an expected asset is actually missing or has failed to decode.

## Binary transfer gate — closed

All five authoritative PNGs are now committed byte-for-byte at the registered Git paths. The fail-closed verifier confirms file presence, byte count, SHA-256, Git blob SHA, PNG IHDR dimensions and RGB/RGBA color type for every asset.

`scripts/verify-lineage-54-assets.mjs` must continue to print `LINEAGE_54_EXACT_ASSET_GATE_PASS` only for a complete 5/5 match. Approximate substitution, re-encoding, optimization or bypass remains forbidden.

The transfer gate being closed does **not** automatically approve canonical product adoption. Source-fidelity evidence and product-policy adoption remain separate decisions.

## Post-transfer actual-route browser gate

`tests/lineage-54-route-browser-qa.mjs` is a standalone fail-closed Playwright gate for the exact transferred assets and native route.

```bash
node --import tsx --test tests/lineage-54-route-browser-qa.mjs
```

It does not skip a missing asset gate. It requires the runtime `ASSET TRANSFER HOLD` to be absent when all five exact assets decode and checks:

- `1280×800` desktop;
- `390×844` mobile/touch;
- all five exact asset paths decode;
- four chapter/story and four timeline controls;
- no horizontal overflow;
- first/final vehicle bounding boxes remain inside the stage and above the timeline safe floor;
- 1.8s travel state, 520ms+170ms image choreography and speed-field activation;
- final open-door image and bloom cleanup;
- desktop drag/free-orbit behavior;
- Chromium CDP touch drag on mobile;
- mobile service panel off-canvas/open positioning;
- reduced-motion immediate chapter switching;
- page/console runtime errors;
- screenshots for first/final desktop/mobile review states under `LINEAGE54_SCREENSHOT_DIR` or `/tmp/lineage-54-browser-qa`.

Automated browser assertions and screenshots are evidence for the review, not a substitute for direct visual comparison by the CTO/user.

## Merge-readiness gate

Before Ready/merge, re-confirm on the exact PR head:

1. all five authoritative PNG files remain byte-for-byte at the registered Git paths;
2. `scripts/verify-lineage-54-assets.mjs` returns the 5/5 exact PASS marker;
3. the standalone Lineage 54 actual-route browser gate passes;
4. generated 1280×800 and 390×844 screenshots are directly inspected against the authoritative source, especially final open-door clipping, travel/camera/speed behavior and service panel;
5. exact-head full CI is GREEN;
6. current `origin/main` remains an ancestor and unresolved review threads are rechecked immediately before Ready/merge.

No Auth/API/DB/Firebase/Worker/Production mutation is part of this Design Lab lineage review.
