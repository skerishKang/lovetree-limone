# Lineage 54 — Petal Runner · Love Journey V4 intake

## Classification

`12_LoveTree_Petal_Runner_LoveJourney_V4` is a direct LoveTree sibling product/story artifact. It is not classified as a generic automotive visual reference. The source explicitly defines Petal Runner as a LoveTree memory explorer that carries saved feelings along Connection paths to the user's LoveTree.

- Lineage: `lt-54-petal-runner-love-journey`
- Current Revision: `54-v4-petal-runner-love-journey`
- Current state: incoming, source verified, exact binary asset transfer pending
- Tracking issue: #129

## Exact V4 runtime

`01_HTML/index-v4.html` and `01_HTML/index.html` were downloaded as raw files and compared byte-for-byte.

- bytes: 21,337
- SHA-256: `ea9295e8d8a9fb14d6a0df8ec16e294a13df666770e285a2bbbf69807e38ebd9`
- result: byte-identical runtime aliases

V2 and V3 remain prior-revision evidence. V4 does not discard the V3 concept; the sibling V4 README says V3 is preserved while vehicle/travel staging is redesigned.

## Source story

The source journey is:

`FIRST MOMENT → DEPART → TRAVEL → ARRIVE`

1. **FIRST MOMENT** — front / parked. The first saved Moment creates the first light coordinate.
2. **FEELING GROWS** — side / departing. Saved Moments accumulate, Petal Energy rises and the first route becomes visible.
3. **CONNECTION** — rear / travelling. Saved Moments become a luminous emotional path toward LoveTree.
4. **LOVE BLOOMS** — doors open / arrived. The journey reaches LoveTree; saved Moments become leaves and Connections become branches.

The source uses example counts `184 / 200`, `184 Moments`, and `12 Connections`. These are source-story values for review, not automatically canonical business rules.

## V4 motion delta

The sibling V4 README and runtime define:

- smaller vehicle and a safe floor line above the timeline;
- no bottom vehicle clipping;
- 1.8 second travel sequence;
- offscreen entry, acceleration, curved travel, deceleration and stop;
- camera/background panning and brightness changes while driving;
- speed streaks during travel;
- wider chapter-to-chapter vehicle displacement;
- final open-door vehicle remains fully within viewport;
- left/right pointer drag cycles through four vehicle views;
- four story buttons and four timeline buttons remain available.

## Exact required assets

The implementation must use the fingerprinted sibling assets, not approximate replacements.

| Asset | Size | Dimensions | SHA-256 |
|---|---:|---:|---|
| `lovetree-arrival-garden-v3.png` | 2,458,998 B | 1672×941 RGB | `731ce39ccd9bbb9fe20fa1ba98a390ca8691d16f92110502a16cbcfee161ea35` |
| `petal-runner-front-v3.png` | 178,894 B | 627×627 RGBA | `391b77902d26b89eeea892f7847dc1a99212456e80ff7aec918dd17f580c9826` |
| `petal-runner-side-v3.png` | 135,739 B | 627×627 RGBA | `84014bf23b44194a00f85093d0dfac6ba6736fbe91aaff6cf70c3db130a0d0a3` |
| `petal-runner-rear-v3.png` | 168,905 B | 627×627 RGBA | `2708fe6625bd87da61de3e30e8b034766f0df5ccd5fef584d405c5e05d3ca37d` |
| `petal-runner-open-v3.png` | 261,150 B | 627×627 RGBA | `96b53667e2f2fc71498238ff1403035b1c7c0f454049dadfa07da421eff7838a` |

## Implementation boundary

The first repo implementation belongs in Design Lab as a fidelity candidate. It must not silently turn the source's Premium Journey thresholds or vehicle metaphor into canonical production policy.

LoveTree-specific Revision content:

- Petal Runner visual identity;
- exact vehicle/background assets;
- four-stage story and copy;
- vehicle chapter staging;
- final LoveTree arrival/bloom.

Potential reusable capability mechanics to extract only after fidelity review:

- staged journey transport;
- path-progress storytelling;
- object-view pointer drag;
- camera-travel transition;
- arrival bloom/climax.

## Current asset-transfer hold

The exact source files are locally available from Drive and have been fingerprinted. The current GitHub connector can create UTF-8/base64 blobs from message content but does not expose a direct local-file parameter, and this runtime has no GitHub push credential/`gh` CLI. The 2.46 MB background must therefore not be approximated or silently omitted.

Until an exact binary transfer path is available, the lineage remains `incoming-source-verified-assets-pending-git-transfer`. Structural or motion code may be prepared, but no source-fidelity PASS may be claimed without all five exact images present in the repository and hash-verified.

## Acceptance gate

Minimum review viewports:

- 1280×800
- 390×844

Required checks:

- all four chapters and corresponding vehicle states;
- vehicle not clipped at V4 arrival;
- chapter/story controls and bottom timeline;
- drag cycles through four views;
- 1.8s travel and camera/speed effects;
- path/node growth;
- final bloom;
- responsive service panel;
- no horizontal/bottom overflow;
- no runtime errors;
- explicit reduced-motion behavior before product adoption.
