# Lineage 55 — Moonlit Blossom Hero V1 source analysis

## Classification

`14_LoveTree_Moonlit_Blossom_Hero_V1` is a direct LoveTree sibling product/story artifact, not a generic floral reference pack.

The source itself exposes LoveTree product surfaces (`MOMENTS`, `BLOSSOM`, `INVITATION`, `ENTER MY TREE`), a staged Memory-growth journey, approved Memory Cast portraits, and a final bloom state.

- Lineage: `lt-55-moonlit-blossom-hero`
- Revision: `55-v1-moonlit-blossom-hero`
- Tracking issue: #134
- Intake branch: `feat/lineage-55-moonlit-blossom-intake`
- Current disposition: source intake complete; exact binary assets pending Git transfer

This phase is provenance/source registration only. It does **not** declare the sibling counts, invitation behavior, growth thresholds, or flower metaphor canonical V4 product policy.

## Authoritative Drive package

Root:
- `14_LoveTree_Moonlit_Blossom_Hero_V1`
- Drive folder `151yoYBj7rVaQbZuKvSbt8D5_LZC6vpqs`

Folders:
- `00_REFERENCES` — `1OzCy_TuxS1LYa4rENhzXNWC5bYQZc8Mu`
- `01_HTML` — `1D8h9AtYG5czBj6AcTrpDrsUqjCCPm6rd`
- `02_ASSETS` — `1xPxCzrOp-JaC2VWT3H-I1qMKTRFH4hcw`
- `02_ASSETS/flowers` — `1MOebKe_x8ErHZpzpaa-sElBsmDbZpUVD`
- `02_ASSETS/portraits` — `1iG9ersPJXHGZ117XVLPtVVZT1qdFkxP2`

Sibling support:
- `README.md` — Drive `1yngLqgB9HrY4NEz5KMab6__gwrg_1hYM`
- `ANALYSIS.md` — Drive `10PNF2LrfNpit4REHOVBv0jxTwOmGBZCu`

The sibling README explicitly says the still PNGs are approved visual assets and that character imagery must use the approved Memory Cast portraits rather than recognizable celebrities.

## Exact runtime source

- `01_HTML/index-v1.html`
- Drive `11VCsXcP2OlOH1pOAwFmhD4HwIU1blc6M`
- exact bytes: `22,260`
- SHA-256: `1c68271530d426237c122249ef27cb9f7ad6057d1dd245c3739740ef4836ae38`
- Git blob SHA: `7dbad6aa26f77a576da0aa13af9b884a52fd944b`

The exact UTF-8 source is preserved at:

`reference/lineage-55-moonlit-blossom-v1/source/index-v1.html`

GitHub's resulting content blob was independently re-read after upload and equals the expected Git blob SHA above, proving byte-exact text preservation.

## Exact image contract

| Asset | Group | Authoritative Drive id | Bytes | Dimensions | SHA-256 | Git blob SHA |
|---|---|---|---:|---:|---|---|
| `lovetree-memory-blossom-hero-v1.png` | flowers | `1XSakvKw04G_of1s6WWPL45Nu_YKYlDkR` | 1,150,427 | 1536×1024 RGB | `c6587ae2d37628a5c003cbd44fd96f6ed649579ad92104f2e08a101e6e59f230` | `17c791ed5a4624c3dabeb35c6affb26d76c03fca` |
| `lovetree-memory-blossom-detail-v1.png` | flowers | `17AVNADRaU41bXCjrYnwED5PStYQTRkQ7` | 1,405,653 | 1536×1024 RGB | `52a3456b89a1406f87ba3a40ffcc61ff296851f819fe44f89a06d2f98c059d0e` | `9160c4581517ba844456bef6698c4c20c0db5c3c` |
| `memory-cast-a.png` | portraits | `1EyyAfqoJlaUvx7W4-USwdbmCB5DGuEhS` | 334,419 | 1024×1536 RGB | `7bf8cc570880b5eff35c4a951f15199b3fc1eb11aec7a6126fa6b25425334f48` | `320708c979c300fd87b1cdf03c53105ec748397f` |
| `memory-cast-b.png` | portraits | `1cxMQs-sO-MK1GCI2HSWa-_1WHu7Cg8u5` | 327,151 | 1024×1536 RGB | `fd34eb40759538d6369a0dfe0bf151e2f2864357a8f234376d242250603c6cf7` | `a2959d33b0beb576ee0ca27b2181e95fbbbfac4f` |
| `memory-cast-c.png` | portraits | `1q0ZiW9Rr61junOZmUvV3wE0gk1h9QHnf` | 332,328 | 1024×1536 RGB | `9f939a071b0ddfcd9c7ebd173bf0dd3f49ba4506b691a0a1b370812671c63d85` | `ebda9a45399a30fb1260ad1c30a849c7d1b80cb5` |

Target binary paths for a later review implementation:
- `/reference/lineage-55-moonlit-blossom-v1/assets/flowers/*`
- `/reference/lineage-55-moonlit-blossom-v1/assets/portraits/*`

No approximate/generated replacement may be called source-faithful.

## Source story states

The exact runtime defines four states:

1. `01 · SEED` / `A feeling begins.`
2. `02 · FEELING` / `It starts to grow.`
3. `03 · MOMENTS` / `Memories gather.`
4. `04 · BLOOM` / `Love becomes visible.`

The body class drives the visual scale/brightness/reveal state:
- state 0: flower `scale(.18)`, reduced brightness/saturation;
- state 1: flower `scale(.48)`;
- state 2: flower `scale(.76)`, first two floating memories revealed;
- state 3: flower full scale, all three floating memories revealed, faster aura pulse.

The final bloom creates 36 petal elements from the current flower center.

## Source interactions

### Flower / progression
- clicking the main flower advances to the next state;
- `Space` advances;
- `ArrowRight` advances;
- `ArrowLeft` goes backward;
- wheel down advances and wheel up goes backward;
- wheel progression is throttled to one state change per `700ms`.

### Autoplay
- `PLAY THE BLOOM` toggles autoplay;
- active text becomes `PAUSE BLOOM`;
- state advances every `2100ms` while playing.

### Direct jumps
- header `MOMENTS` jumps to state 2;
- header `BLOSSOM` jumps to state 3;
- Memory Cast cards jump to states 1, 2, and 3.

### Product/story values shown by sibling
- `127 / 150 MOMENTS`
- `85%`
- `INVITATION`
- `ENTER MY TREE`

These are preserved as sibling-source facts, not accepted canonical business rules.

## Layout / responsive behavior

Desktop source:
- 86px sidebar;
- 68px header;
- main visual stage plus 365px right detail panel;
- right panel contains progress and three Memory Cast cards.

At ≤1050px:
- sidebar narrows to 70px;
- right panel is hidden;
- flower uses `min(68vw,520px)`.

At ≤650px:
- sidebar is hidden;
- only primary header action remains;
- main stage expands;
- flower uses `88vw` square;
- memory cards shrink/reposition;
- timeline uses 14px side insets;
- interaction hint is hidden.

The source does not implement a reduced-motion media policy. A native review/adoption must define one explicitly rather than silently preserving perpetual orbit/aura/petal motion for reduced-motion users.

## Product-specific vs reusable capability boundary

### LoveTree-specific Revision material
- Moonlit Blossom flower imagery;
- approved Memory Cast portraits;
- exact state labels and copy;
- three Memory cards and their copy;
- displayed Moment counts/progress;
- `BLOSSOM` / `MOMENTS` / `INVITATION` / `ENTER MY TREE` surface treatment.

### Candidate reusable capabilities
- staged growth-state controller;
- autoplay/pause/replay controller;
- keyboard/wheel/click progression adapter;
- memory-card staged reveal;
- focal-object bloom/particle response;
- responsive hero + detail-panel composition.

Do not hard-code the flower metaphor as the universal LoveTree renderer merely because this sibling uses it.

## Intake validation contract

Normal CI should always prove:
- exact source file exists in Git;
- exact source bytes, SHA-256 and Git blob SHA match Drive provenance;
- source retains all four states and key interactions;
- source references only the approved sibling flower/Memory Cast filenames;
- asset verifier remains hard-fail/no-skip.

Binary verification is intentionally standalone until the files are physically transferred:

```bash
node scripts/verify-lineage-55-assets.mjs
```

A complete 5/5 match is the only path to:

`LINEAGE_55_EXACT_ASSET_GATE_PASS`

## Future review acceptance

Before any source-fidelity approval or Ready/merge of a native review implementation:

1. transfer all five exact PNGs byte-for-byte to the registered paths;
2. require the exact asset verifier PASS marker;
3. implement/review the four-stage experience without changing sibling story semantics;
4. validate 1280×800 and 390×844;
5. test autoplay, pause, replay, flower click, Space, arrows, wheel throttling, direct jumps and Memory cards;
6. verify mobile composition, no horizontal/bottom clipping and no outer-page scroll trap;
7. define and test reduced-motion behavior;
8. directly compare screenshots with the authoritative source/reference material;
9. require exact-head full CI GREEN;
10. recheck current main and concurrent PR ownership immediately before any Ready/merge.

No Auth/API/DB/Firebase/Worker/Production mutation belongs in this intake.
