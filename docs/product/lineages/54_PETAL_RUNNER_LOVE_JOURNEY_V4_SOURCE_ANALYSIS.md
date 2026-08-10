# Lineage 54 — Petal Runner · Love Journey V4 source analysis

## Classification

`12_LoveTree_Petal_Runner_LoveJourney_V4` is a direct LoveTree sibling product/story artifact. It is not a generic automotive reference.

- Lineage: `lt-54-petal-runner-love-journey`
- Current Revision: `54-v4-petal-runner-love-journey`
- Tracking issue: #129
- Design Lab route: `/design-lab/lineages/54/v4`
- Product boundary: internal source-fidelity review first; no automatic production adoption

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
- raw-download comparison: byte-identical to `index-v4.html`

The sibling `README-V4.md` says V3 is preserved and V4 redesigns the vehicle/travel staging rather than replacing the product story.

## Source story contract

Top narrative:

`FIRST MOMENT → DEPART → TRAVEL → ARRIVE`

1. **FIRST MOMENT** — front / parked. The first saved Moment creates the first light coordinate.
2. **FEELING GROWS** — side / departing. Saved Moments accumulate, Petal Energy rises and the first route appears.
3. **CONNECTION** — rear / travelling. Saved Moments become a luminous emotional path toward LoveTree.
4. **LOVE BLOOMS** — doors open / arrived. 184 Moments become leaves, 12 Connections become branches and the open vehicle becomes an entrance back into saved memories.

The counts `184 / 200`, `184 Moments`, `12 Connections`, and the Premium Journey thresholds are sibling source-story values. They are not canonical business rules merely because they exist in the source.

## V4 motion delta

The V4 source and README require:

- smaller vehicle and a safe floor line above the timeline;
- no bottom clipping;
- offscreen entry → acceleration → curved travel → deceleration/stop;
- `1.8s` travel sequence;
- background camera panning and brightness changes;
- speed streaks during travel;
- wider per-chapter vehicle displacement;
- final open-door vehicle fully inside the viewport;
- left/right drag through four vehicle views;
- four story buttons and four bottom timeline buttons.

The native review route implements those mechanics and adds an explicit reduced-motion policy: when `prefers-reduced-motion: reduce` is active, chapter state changes immediately and travel/camera/speed animation is disabled.

## Exact image contract

All six raw local source files were re-hashed immediately before implementation. The HTML and all five PNG SHA-256 values match Issue #129 exactly.

| Asset | Bytes | Dimensions | SHA-256 | Git blob SHA |
|---|---:|---:|---|---|
| `lovetree-arrival-garden-v3.png` | 2,458,998 | 1672×941 RGB | `731ce39ccd9bbb9fe20fa1ba98a390ca8691d16f92110502a16cbcfee161ea35` | `e8009e58ccb42617ee3ba3d59fc97da68ed7340a` |
| `petal-runner-front-v3.png` | 178,894 | 627×627 RGBA | `391b77902d26b89eeea892f7847dc1a99212456e80ff7aec918dd17f580c9826` | `eed19757463401eba0913dfd35e9c7fa14445249` |
| `petal-runner-side-v3.png` | 135,739 | 627×627 RGBA | `84014bf23b44194a00f85093d0dfac6ba6736fbe91aaff6cf70c3db130a0d0a3` | `1326fe2b6f66fd696cecd5688693f299f5c26434` |
| `petal-runner-rear-v3.png` | 168,905 | 627×627 RGBA | `2708fe6625bd87da61de3e30e8b034766f0df5ccd5fef584d405c5e05d3ca37d` | `28b5859e3b9d7e0e02228e4703b347aa85218f24` |
| `petal-runner-open-v3.png` | 261,150 | 627×627 RGBA | `96b53667e2f2fc71498238ff1403035b1c7c0f454049dadfa07da421eff7838a` | `c1a51d939275bf5706c65815fb77c12feb8c35d3` |

Target asset path:

`/public/reference/lineage-54-petal-runner-v4/assets/`

The review component uses this exact path contract and shows `ASSET TRANSFER HOLD` when any expected asset is missing.

## Binary transfer gate

The current connected GitHub API can write UTF-8 content and can create blobs from supplied text/base64 content, but it does not accept the locally materialized Drive file as a binary file parameter. The largest source image is 2.46 MB, so embedding the binary as conversational base64 is not an acceptable or robust transfer mechanism.

Direct HTTPS `git` access from this execution container is also unavailable because the container cannot resolve `github.com`. The exact background/front Git blob SHAs were queried against the target repository and returned `404`, so the files cannot be recovered by simply reconnecting an existing target-repo blob.

Therefore:

- native structural/motion implementation may proceed;
- exact source metadata and asset paths are pinned;
- no approximate image substitution is allowed;
- no source-fidelity PASS is allowed until all five exact PNG files are transferred to Git and hash-verified.

## Acceptance gate after binary transfer

Minimum browser QA:

- `1280×800`
- `390×844`

Required checks:

- four chapters and correct chapter vehicle view;
- entire vehicle visible, especially final open-door arrival;
- no horizontal or bottom clipping;
- 1.8s travel sequence;
- camera pan / brightness / speed streaks;
- memory path and node growth;
- story and timeline controls;
- drive/replay/restart behavior;
- left/right pointer drag through four views;
- pointer capture and pointer cancel recovery;
- final bloom;
- responsive service panel;
- reduced-motion behavior;
- no outer-page scroll lock or runtime errors.
